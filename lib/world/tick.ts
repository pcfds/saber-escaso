/**
 * Avanza el mundo un tick. SIMULACIÓN PURA — acá no entra la IA.
 *
 * Todo lo que pasa se escribe en `events`. Si no está en `events`, no pasó, y
 * el director no lo puede contar. Esa separación es el experimento entero:
 * si algún día este archivo importa el SDK de Anthropic, se rompió.
 *
 *   pnpm tick        avanza un tick
 *   pnpm tick 7      avanza siete
 */
import { db, getRegion } from '../db.js'

type Ev = {
  region_id: string
  tick: number
  kind: string
  place_id?: string | null
  summary: string
  detail?: Record<string, unknown>
}

const roll = (max: number) => Math.floor(Math.random() * max)
const pick = <T>(xs: T[]): T | undefined => xs[roll(xs.length)]

/** Un saber que produce algo, y dónde. Vive en `knowledge`, no en una tabla
 *  de recetas: la receta no es un objeto que se pueda robar ni copiar — es
 *  parte de lo que alguien sabe, y se muere con esa persona. */
type Receta = { name: string; makes: string; makes_at: string }

/** Cuánto sube la destreza esta vez.
 *
 * Rendimientos decrecientes a propósito. Las primeras diez veces que forjás
 * mejorás muchísimo; de 80 para arriba cada punto cuesta. Sin esa curva,
 * practicar se vuelve una tarea con barra de progreso — o sea, grindeo — y lo
 * que queremos es que valga la pena las primeras veces y después sea oficio.
 */
function mejora(destreza: number): number {
  return Math.max(1, Math.round((100 - destreza) * 0.11))
}

/** La calidad de lo que sale de tus manos.
 *
 * Es donde la destreza se vuelve visible para los demás: una hoja mejor pega
 * más fuerte y el que la recibe ve quién la hizo. El azar queda —un día te
 * sale mejor que otro— pero centrado en lo que sabés hacer, no reemplazándolo.
 */
function calidad(destreza: number): number {
  return Math.max(5, Math.min(100, Math.round(destreza * 0.85 + 8 + Math.random() * 22)))
}

export async function step() {
  const region = await getRegion()
  const nextTick = region.tick + 1
  const events: Ev[] = []
  const ev = (e: Omit<Ev, 'region_id' | 'tick'>) =>
    events.push({ region_id: region.id, tick: nextTick, ...e })

  // ── Quién está dando vueltas ──────────────────────────────
  // El reloj del servidor puede ir lento; el del mundo depende del tiempo real.
  // Acá eso se traduce en: región vacía = las agendas avanzan a un cuarto.
  const players = (await db
    .from('players').select('id, name, place_id, last_seen_tick')
    .eq('region_id', region.id)).data ?? []
  const populated = players.some((p) => region.tick - p.last_seen_tick <= 3)
  const pace = populated ? 1 : 0.25

  const people = (await db
    .from('people')
    .select('id, name, trade, place_id, teaches')
    .eq('region_id', region.id).eq('alive', true)).data ?? []

  const places = (await db
    .from('places').select('id, name, slug, kind').eq('region_id', region.id)).data ?? []
  const placeName = (id: string | null | undefined) =>
    places.find((p) => p.id === id)?.name ?? 'algún lado'

  // ── 1. Resolver las acciones que mandaron los jugadores ───
  const pending = (await db
    .from('actions').select('id, player_id, verb, target')
    .is('resolved_tick', null)).data ?? []

  for (const action of pending) {
    const player = players.find((p) => p.id === action.player_id)
    if (!player) continue
    const outcome = await resolveAction(region.id, nextTick, player, action, {
      people, places, ev,
    })
    await db.from('actions').update({ resolved_tick: nextTick, outcome })
      .eq('id', action.id)
    await db.from('players').update({ last_seen_tick: nextTick }).eq('id', player.id)
  }

  // ── 2. Las agendas avanzan solas ──────────────────────────
  // Esto es lo que hace que los NPCs "avancen con sus propias historias":
  // el mundo no espera al jugador, y cuando vuelve encuentra otra cosa.
  const agendas = (await db
    .from('agendas')
    .select('id, person_id, goal, needs_kind, needs_id, progress, state')
    .eq('state', 'activa')).data ?? []

  for (const agenda of agendas) {
    const who = people.find((p) => p.id === agenda.person_id)
    if (!who) continue
    if (Math.random() > pace) continue

    // ¿Le falta un saber que nadie cerca tiene? Se traba, y eso es una historia.
    if (agenda.needs_kind === 'knowledge' && agenda.needs_id) {
      const { count } = await db
        .from('knows').select('id', { count: 'exact', head: true })
        .eq('knowledge_id', agenda.needs_id)
      const hasIt = await db
        .from('knows').select('id')
        .eq('holder_kind', 'person').eq('holder_id', who.id)
        .eq('knowledge_id', agenda.needs_id).maybeSingle()

      // Si ya consiguió lo que le faltaba, la meta está cumplida — aunque el
      // progreso no haya llegado a 100. Sin esto la gente sigue persiguiendo
      // cosas que ya tiene, y el director narra alrededor de ese absurdo.
      if (hasIt.data) {
        await db.from('agendas')
          .update({ state: 'cumplida', progress: 100, ended_tick: nextTick })
          .eq('id', agenda.id)
        ev({ kind: 'agenda_cumplida', place_id: who.place_id,
          summary: `${who.name} consiguió ${agenda.goal}.`,
          detail: { person: who.name, goal: agenda.goal } })
        const siguiente = siguienteMeta(who.trade)
        await db.from('agendas').insert({
          person_id: who.id, goal: siguiente, started_tick: nextTick,
        })
        ev({ kind: 'agenda_nueva', place_id: who.place_id,
          summary: `${who.name} se puso a ${siguiente}.`,
          detail: { person: who.name, goal: siguiente } })
        continue
      }

      {
        if (!count) {
          await db.from('agendas')
            .update({ state: 'bloqueada' }).eq('id', agenda.id)
          ev({ kind: 'agenda_bloqueada', place_id: who.place_id,
            summary: `${who.name} dejó de intentar ${agenda.goal}: ya no queda nadie que sepa lo que necesita.`,
            detail: { person: who.name, goal: agenda.goal } })
        } else if (Math.random() < 0.12) {
          // Una agenda trabada no es noticia todos los ticks. Si se emite
          // siempre, el director recibe ruido y la crónica se vuelve una
          // planilla. Que aparezca de a poco: así, cuando aparece, pesa.
          ev({ kind: 'agenda_estancada', place_id: who.place_id,
            summary: `${who.name} sigue sin conseguir lo que necesita para ${agenda.goal}.`,
            detail: { person: who.name, goal: agenda.goal } })
        }
        continue
      }
    }

    const gained = 8 + roll(18)
    const progress = Math.min(100, agenda.progress + gained)

    if (progress >= 100) {
      await db.from('agendas')
        .update({ state: 'cumplida', progress: 100, ended_tick: nextTick })
        .eq('id', agenda.id)
      ev({ kind: 'agenda_cumplida', place_id: who.place_id,
        summary: `${who.name} consiguió ${agenda.goal}.`,
        detail: { person: who.name, goal: agenda.goal } })

      // Una agenda cumplida abre la siguiente. El mundo no se queda quieto.
      const nueva = siguienteMeta(who.trade)
      await db.from('agendas').insert({
        person_id: who.id, goal: nueva, started_tick: nextTick,
      })
      ev({ kind: 'agenda_nueva', place_id: who.place_id,
        summary: `${who.name} se puso a ${nueva}.`,
        detail: { person: who.name, goal: nueva } })
    } else {
      await db.from('agendas').update({ progress }).eq('id', agenda.id)
      if (gained > 20) {
        ev({ kind: 'agenda_avanza', place_id: who.place_id,
          summary: `${who.name} avanzó bastante con ${agenda.goal}.`,
          detail: { person: who.name, goal: agenda.goal, progress } })
      }
    }
  }

  // ── 3. Enseñanza espontánea entre NPCs ────────────────────
  // El saber circula solo. Lento, pero circula.
  if (populated && Math.random() < 0.35) {
    const maestro = pick(people.filter((p) => p.teaches))
    if (maestro) {
      const alumno = pick(people.filter(
        (p) => p.id !== maestro.id && p.place_id === maestro.place_id))
      if (alumno) {
        const sabe = (await db
          .from('knows').select('knowledge_id')
          .eq('holder_kind', 'person').eq('holder_id', maestro.id)).data ?? []
        const yaSabe = (await db
          .from('knows').select('knowledge_id')
          .eq('holder_kind', 'person').eq('holder_id', alumno.id)).data ?? []
        const yaTiene = new Set(yaSabe.map((k) => k.knowledge_id))
        const candidato = pick(sabe.filter((k) => !yaTiene.has(k.knowledge_id)))
        if (candidato) {
          const { data: k } = await db
            .from('knowledge').select('name').eq('id', candidato.knowledge_id).single()
          await db.from('knows').insert({
            holder_kind: 'person', holder_id: alumno.id,
            knowledge_id: candidato.knowledge_id,
            learned_from: maestro.id, how: 'aprendido', learned_tick: nextTick,
          })
          ev({ kind: 'ensenanza', place_id: maestro.place_id,
            summary: `${maestro.name} le enseñó ${k?.name} a ${alumno.name}. Ahora lo saben dos.`,
            detail: { from: maestro.name, to: alumno.name, knowledge: k?.name } })
        }
      }
    }
  }

  // ── 4. Muerte, y lo que se lleva puesto ───────────────────
  // La parte que le da peso a todo: un maestro que se muere sin enseñar
  // borra ese saber de la región. No es lore, es estado.
  // 0.8% por tick. Con un tick por hora son ~1 muerte cada 5 días en un valle
  // de siete personas — suficiente para que duela, poco para que el valle se
  // vacíe. Estuvo en 6% y con ticks de 10 minutos el valle se consumía en una
  // tarde: nadie llega a encariñarse con alguien que se muere en media hora.
  if (Math.random() < 0.008 && people.length > 3) {
    const muerto = pick(people)
    if (muerto) {
      await db.from('people')
        .update({ alive: false, died_tick: nextTick }).eq('id', muerto.id)
      ev({ kind: 'muerte', place_id: muerto.place_id,
        summary: `Murió ${muerto.name}, ${muerto.trade}, en ${placeName(muerto.place_id)}.`,
        detail: { person: muerto.name } })

      const tenia = (await db
        .from('knows').select('knowledge_id')
        .eq('holder_kind', 'person').eq('holder_id', muerto.id)).data ?? []

      for (const k of tenia) {
        const otros = (await db
          .from('knows').select('holder_id, holder_kind')
          .eq('knowledge_id', k.knowledge_id)
          .neq('holder_id', muerto.id)).data ?? []
        if (otros.length === 0) {
          const { data: info } = await db
            .from('knowledge').select('name').eq('id', k.knowledge_id).single()
          ev({ kind: 'perdida_de_saber',
            summary: `Con ${muerto.name} se fue ${info?.name}. No queda nadie en el valle que lo sepa.`,
            detail: { person: muerto.name, knowledge: info?.name } })
        }
      }

      await db.from('agendas')
        .update({ state: 'abandonada', ended_tick: nextTick })
        .eq('person_id', muerto.id).eq('state', 'activa')

      // Las agendas corren antes que la muerte en el mismo tick, así que un
      // muerto puede haber "conseguido" algo y "puesto a" otra cosa segundos
      // antes de morirse. El director lee esos eventos y narra a un fantasma
      // laburando — pasó de verdad: «Ren sigue en la Casa Quemada persiguiendo
      // algo nuevo». Se descartan antes de escribirlos.
      const vivos = events.filter((e) =>
        !(e.kind.startsWith('agenda_') && e.detail?.person === muerto.name))
      events.length = 0
      events.push(...vivos)
    }
  }

  // ── 4b. Las amenazas ──────────────────────────────────────
  // Antes los monstruos vivían en la máquina de cada jugador: los matabas y
  // el mundo no se enteraba. Ahora viven acá, los ve todo el mundo, y matar
  // uno deja un evento que el director puede contar.
  const amenazas = (await db
    .from('threats').select('id, place_id, kind, health, max_health')
    .eq('region_id', region.id).eq('alive', true)).data ?? []

  // Aparecen donde tiene sentido que aparezcan, y de a poco. Un valle lleno de
  // bichos deja de dar miedo: se vuelve una cola de tareas.
  const salvaje = places.filter((p) => p.kind === 'bosque' || p.kind === 'ruina')
  if (amenazas.length < 3 && Math.random() < 0.35 * pace) {
    const donde = pick(salvaje)
    const que = pick(['una jauría de sombra', 'algo que baja del Sotobosque', 'un merodeador'])!
    if (donde) {
      const vida = 30 + roll(40)
      await db.from('threats').insert({
        region_id: region.id, place_id: donde.id, kind: que,
        health: vida, max_health: vida, spawned_tick: nextTick,
      })
      ev({ kind: 'amenaza', place_id: donde.id,
        summary: `Vieron ${que} rondando ${donde.name}.`,
        detail: { threat: que, place: donde.name } })
    }
  }

  // Y muerden. Estar en el lugar equivocado tiene que costar algo, o el mapa
  // es decorado.
  for (const a of amenazas) {
    const presentes = players.filter(
      (p) => p.place_id === a.place_id && region.tick - p.last_seen_tick <= 3)
    for (const p of presentes) {
      if (Math.random() > 0.5) continue

      // ¿Alguien te defiende?
      //
      // Ésta es la recompensa de haberte ganado a la gente, y por eso mide
      // aprecio y no miedo: al que temen lo dejan solo. Un valle donde nadie
      // se mete cuando te muerden es un valle donde la reputación es un
      // número en una tabla; que alguien salga a bancarte es lo que la vuelve
      // una relación.
      //
      // Defiende quien te aprecia de verdad (40+) y está donde estás. No es
      // automático: puede pasar o no, porque un rescate garantizado saca el
      // riesgo y el miedo se va con él.
      const cerca = people.filter((q) => q.place_id === a.place_id)
      const leales = []
      for (const q of cerca) {
        const { data: v } = await db.from('bonds').select('valued')
          .eq('person_id', q.id).eq('toward_id', p.id).maybeSingle()
        if ((v?.valued ?? 0) >= 40) leales.push(q)
      }
      const defensor = leales.length && Math.random() < 0.65 ? pick(leales) : undefined
      if (defensor) {
        const golpe = 9 + roll(11)
        const queda = Math.max(0, a.health - golpe)
        await db.from('threats')
          .update(queda > 0
            ? { health: queda }
            : { health: 0, alive: false, killed_by: defensor.name, killed_tick: nextTick })
          .eq('id', a.id)
        ev({ kind: queda > 0 ? 'defensa' : 'amenaza_muerta', place_id: a.place_id,
          summary: queda > 0
            ? `${defensor.name} se metió y le sacó a ${a.kind} de encima a ${p.name}.`
            : `${defensor.name} mató a ${a.kind} para sacárselo de encima a ${p.name}.`,
          detail: { person: defensor.name, player: p.name, threat: a.kind } })
        // Que te salven crea una deuda, y la deuda es contenido: el que te
        // bancó ahora tiene algo tuyo que cobrar.
        await recordar(defensor.id, p, `me metí a defender a ${p.name}`, nextTick)
        continue
      }

      const { data: estado } = await db
        .from('players').select('health').eq('id', p.id).maybeSingle()
      const vida = Math.max(0, (estado?.health ?? 100) - (6 + roll(10)))
      await db.from('players')
        .update({ health: vida, ...(vida === 0 ? { downed_at_tick: nextTick } : {}) })
        .eq('id', p.id)
      ev({ kind: vida === 0 ? 'caida' : 'herida', place_id: a.place_id,
        summary: vida === 0
          ? `${a.kind} tumbó a ${p.name} en ${placeName(a.place_id)}.`
          : `${a.kind} lastimó a ${p.name} en ${placeName(a.place_id)}.`,
        detail: { player: p.name, threat: a.kind } })
    }
  }

  // ── 5. El chusmerío mueve la reputación ───────────────────
  // La gente se cuenta lo que vio. Así viaja la fama — mal y despacio.
  const recientes = (await db
    .from('memories').select('id, person_id, about_kind, about_id, what, tick')
    .gte('tick', Math.max(0, region.tick - 2))).data ?? []
  let rumores = 0
  for (const m of recientes) {
    if (rumores >= 3) break
    if (Math.random() > 0.4) continue
    const contador = people.find((p) => p.id === m.person_id)
    const oyente = pick(people.filter(
      (p) => p.id !== m.person_id && p.place_id === contador?.place_id))
    if (!contador || !oyente) continue
    // .limit(1) no es cosmético: maybeSingle() DEVUELVE ERROR si matchea más
    // de una fila, y entonces `data` viene null y la deduplicación no dedupea
    // nada. Se vio en el tick 42 de valle-pruebas: catorce veces la misma
    // frase, y el director cobrando tokens por leer catorce veces lo mismo.
    const { data: yaSabe } = await db
      .from('memories').select('id')
      .eq('person_id', oyente.id)
      .eq('about_id', m.about_id).eq('what', m.what).limit(1).maybeSingle()
    if (yaSabe) continue
    await db.from('memories').insert({
      person_id: oyente.id, about_kind: m.about_kind, about_id: m.about_id,
      what: m.what, heard_from: contador.id, tick: nextTick,
    })
    rumores++
    ev({ kind: 'rumor', place_id: contador.place_id,
      summary: `${contador.name} le contó a ${oyente.name}: ${m.what}`,
      detail: { from: contador.name, to: oyente.name } })
  }

  if (events.length > 0) await db.from('events').insert(events)
  await db.from('regions').update({ tick: nextTick }).eq('id', region.id)

  console.log(`tick ${nextTick} ${populated ? '' : '(vacío, a un cuarto de paso) '}— ${events.length} eventos`)
  for (const e of events) console.log(`  · ${e.summary}`)
}

function siguienteMeta(trade: string): string {
  const metas: Record<string, string[]> = {
    herrera: ['juntar carbón para el invierno', 'rehacer las bisagras del granero'],
    aprendiz: ['ganarse que lo dejen tocar el yunque', 'pagar lo que debe'],
    cazadora: ['marcar una senda nueva antes de las lluvias', 'curtir lo de esta semana'],
    destiladora: ['conseguir raíz del Sotobosque', 'cobrar tres deudas viejas'],
    guardia: ['conseguir que le paguen el mes', 'dormir una noche entera'],
  }
  return pick(metas[trade] ?? ['pasar el invierno sin deberle nada a nadie'])!
}

async function resolveAction(
  regionId: string, tick: number,
  player: { id: string; name: string; place_id: string | null },
  action: { verb: string; target: string | null },
  ctx: {
    people: { id: string; name: string; trade: string; place_id: string | null; teaches: boolean }[]
    places: { id: string; name: string; slug: string; kind: string }[]
    ev: (e: Omit<Ev, 'region_id' | 'tick'>) => void
  },
): Promise<string> {
  const { people, places, ev } = ctx
  const target = action.target?.toLowerCase() ?? ''
  const norm = (s: string) => s.toLowerCase()

  switch (action.verb) {
    case 'ir': {
      const destino = places.find((p) => norm(p.slug) === target || norm(p.name).includes(target))
      if (!destino) return `no existe "${action.target}"`
      await db.from('players').update({ place_id: destino.id }).eq('id', player.id)
      ev({ kind: 'llegada', place_id: destino.id,
        summary: `${player.name} llegó a ${destino.name}.`,
        detail: { player: player.name, place: destino.name } })
      return `fue a ${destino.name}`
    }

    case 'hablar': {
      const quien = people.find((p) => norm(p.name).includes(target))
      if (!quien) return `no encontró a "${action.target}"`
      ev({ kind: 'conversacion', place_id: quien.place_id,
        summary: `${player.name} habló con ${quien.name}.`,
        detail: { player: player.name, person: quien.name } })
      await recordar(quien.id, player, `${player.name} vino a hablar conmigo`, tick)
      await tocarVinculo(quien.id, player.id, { valued: 2 })
      return `habló con ${quien.name}`
    }

    case 'trabajar': {
      const lugar = places.find((p) => p.id === player.place_id)
      const testigos = people.filter((p) => p.place_id === player.place_id)

      // Trabajar produce algo sólo si SABÉS hacer algo y estás donde se hace.
      // No hay recetas escritas en ningún lado, no hay tienda y no hay drops:
      // un objeto del valle existe porque alguien vivo supo hacerlo. Ésa es la
      // regla entera, y es la que hace que un muerto se lleve cosas del mundo.
      const saberes = (await db
        .from('knows')
        .select('id, destreza, veces, knowledge:knowledge_id (name, makes, makes_at)')
        .eq('holder_kind', 'player').eq('holder_id', player.id)).data ?? []
      const aplicables = saberes.filter((k) => {
        const c = (k as unknown as { knowledge: Receta | null }).knowledge
        return !!c?.makes && c.makes_at === lugar?.kind
      })
      const elegido = pick(aplicables)
      const receta = elegido
        ? (elegido as unknown as { knowledge: Receta }).knowledge
        : undefined

      if (receta && elegido) {
        // Practicar mejora. No es un contador que sube: es que la próxima
        // hoja te va a salir mejor, y eso lo ve todo el que la use.
        const antes: number = elegido.destreza
        const ahora = Math.min(100, antes + mejora(antes))
        await db.from('knows')
          .update({ destreza: ahora, veces: elegido.veces + 1 })
          .eq('id', elegido.id)

        const q = calidad(antes)
        await db.from('objects').insert({
          region_id: regionId, kind: receta.makes, quality: q,
          made_by: player.name, made_tick: tick,
          holder_kind: 'player', holder_id: player.id,
        })
        // Que se note cuando das un salto: es el momento en que sentís que
        // aprendiste algo, y si no se dice en ningún lado, no pasó.
        const salto = ahora - antes >= 6 && elegido.veces < 12
        ev({ kind: 'fabricacion', place_id: player.place_id,
          summary: salto
            ? `${player.name} hizo ${receta.makes} en ${lugar?.name ?? 'el valle'}, y le salió mejor que la vez anterior.`
            : `${player.name} hizo ${receta.makes} en ${lugar?.name ?? 'el valle'}.`,
          detail: { player: player.name, object: receta.makes, quality: q, destreza: ahora } })
        for (const t of testigos) {
          await recordar(t.id, player, `${player.name} sabe hacer ${receta.makes}`, tick)
          await tocarVinculo(t.id, player.id, { valued: 6 })
        }
        return `hizo ${receta.makes} (destreza ${ahora})`
      }

      ev({ kind: 'trabajo', place_id: player.place_id,
        summary: `${player.name} pasó el día trabajando en ${lugar?.name ?? 'el valle'}.`,
        detail: { player: player.name } })
      for (const t of testigos) {
        await recordar(t.id, player, `${player.name} trabaja sin que se lo pidan`, tick)
        await tocarVinculo(t.id, player.id, { valued: 4 })
      }
      return 'trabajó'
    }

    case 'pelear': {
      const { data: bicho } = await db
        .from('threats').select('id, kind, health, max_health')
        .eq('region_id', regionId).eq('place_id', player.place_id ?? '')
        .eq('alive', true).limit(1).maybeSingle()
      if (!bicho) return 'no hay nada que pelear acá'

      // Acá es donde los objetos dejan de ser una lista y pesan: con qué le
      // pegás cambia el resultado, y con qué le pegás depende de que alguien
      // haya sabido hacerlo.
      const { data: armas } = await db
        .from('objects').select('kind, quality, made_by')
        .eq('holder_kind', 'player').eq('holder_id', player.id)
      const arma = (armas ?? [])
        .filter((o) => o.kind === 'hoja templada' || o.kind === 'filo de agua')
        .sort((a, b) => b.quality - a.quality)[0]
      const danio = 8 + roll(8) + Math.floor((arma?.quality ?? 0) / 6)
      const restante = Math.max(0, bicho.health - danio)

      if (restante > 0) {
        await db.from('threats').update({ health: restante }).eq('id', bicho.id)
        ev({ kind: 'pelea', place_id: player.place_id,
          summary: arma
            ? `${player.name} le entró a ${bicho.kind} con ${arma.kind}, y sigue en pie.`
            : `${player.name} le entró a ${bicho.kind} a mano limpia, y sigue en pie.`,
          detail: { player: player.name, threat: bicho.kind, weapon: arma?.kind ?? null } })
        return `lastimó a ${bicho.kind}`
      }

      await db.from('threats')
        .update({ alive: false, health: 0, killed_by: player.name, killed_tick: tick })
        .eq('id', bicho.id)
      ev({ kind: 'amenaza_muerta', place_id: player.place_id,
        summary: arma
          ? `${player.name} mató a ${bicho.kind} con ${arma.kind}${arma.made_by && arma.made_by !== player.name ? `, que había hecho ${arma.made_by}` : ''}.`
          : `${player.name} mató a ${bicho.kind} sin nada en las manos.`,
        detail: { player: player.name, threat: bicho.kind, weapon: arma?.kind ?? null } })

      // Lo ven, y no todos lo leen igual: al que te teme le sube el miedo, no
      // el aprecio. Dos ejes, no una barra.
      for (const t of people.filter((p) => p.place_id === player.place_id)) {
        await recordar(t.id, player, `${player.name} mató a ${bicho.kind} acá`, tick)
        await tocarVinculo(t.id, player.id, { valued: 8, feared: 5 })
      }
      return `mató a ${bicho.kind}`
    }

    case 'aprender': {
      const maestro = people.find(
        (p) => norm(p.name).includes(target) && p.place_id === player.place_id)
      if (!maestro) return `no hay ningún ${action.target} acá`
      if (!maestro.teaches) {
        ev({ kind: 'negativa', place_id: maestro.place_id,
          summary: `${maestro.name} se negó a enseñarle nada a ${player.name}.`,
          detail: { player: player.name, person: maestro.name } })
        return `${maestro.name} se negó`
      }
      const { data: vinculo } = await db
        .from('bonds').select('valued')
        .eq('person_id', maestro.id).eq('toward_id', player.id).maybeSingle()
      if ((vinculo?.valued ?? 0) < 10) {
        ev({ kind: 'negativa', place_id: maestro.place_id,
          summary: `${maestro.name} todavía no confía lo suficiente en ${player.name} como para enseñarle.`,
          detail: { player: player.name, person: maestro.name } })
        return `${maestro.name} todavía no confía`
      }
      const sabe = (await db
        .from('knows').select('knowledge_id')
        .eq('holder_kind', 'person').eq('holder_id', maestro.id)).data ?? []
      const ya = (await db
        .from('knows').select('knowledge_id')
        .eq('holder_kind', 'player').eq('holder_id', player.id)).data ?? []
      const tiene = new Set(ya.map((k) => k.knowledge_id))
      const nuevo = pick(sabe.filter((k) => !tiene.has(k.knowledge_id)))
      if (!nuevo) return `${maestro.name} ya no tiene nada nuevo que enseñarle`

      const { data: info } = await db
        .from('knowledge').select('name').eq('id', nuevo.knowledge_id).single()
      await db.from('knows').insert({
        holder_kind: 'player', holder_id: player.id,
        knowledge_id: nuevo.knowledge_id, learned_from: maestro.id,
        how: 'aprendido', learned_tick: tick, destreza: 0, veces: 0,
      })
      ev({ kind: 'ensenanza', place_id: maestro.place_id,
        summary: `${maestro.name} le enseñó ${info?.name} a ${player.name}.`,
        detail: { from: maestro.name, to: player.name, knowledge: info?.name } })
      await recordar(maestro.id, player, `le enseñé ${info?.name} a ${player.name}`, tick)
      return `aprendió ${info?.name}`
    }

    case 'ensenar': {
      const alumno = people.find(
        (p) => norm(p.name).includes(target) && p.place_id === player.place_id)
      if (!alumno) return `no hay ningún ${action.target} acá`
      const sabe = (await db
        .from('knows').select('knowledge_id')
        .eq('holder_kind', 'player').eq('holder_id', player.id)).data ?? []
      if (sabe.length === 0) return 'todavía no sabe nada que enseñar'
      const ya = (await db
        .from('knows').select('knowledge_id')
        .eq('holder_kind', 'person').eq('holder_id', alumno.id)).data ?? []
      const tiene = new Set(ya.map((k) => k.knowledge_id))
      const nuevo = pick(sabe.filter((k) => !tiene.has(k.knowledge_id)))
      if (!nuevo) return `${alumno.name} ya sabe todo lo que él sabe`

      const { data: info } = await db
        .from('knowledge').select('name').eq('id', nuevo.knowledge_id).single()
      // Sin destreza: recibe el saber, no la mano. Va a tener que hacerlo un
      // montón de veces para que le salga como a vos. Por eso enseñar no te
      // clona — el oficio sobrevive y el maestro sigue siendo el maestro.
      await db.from('knows').insert({
        holder_kind: 'person', holder_id: alumno.id,
        knowledge_id: nuevo.knowledge_id, learned_from: null,
        how: 'aprendido', learned_tick: tick, destreza: 0, veces: 0,
      })
      ev({ kind: 'ensenanza', place_id: alumno.place_id,
        summary: `${player.name} le enseñó ${info?.name} a ${alumno.name}. Ahora lo saben dos.`,
        detail: { from: player.name, to: alumno.name, knowledge: info?.name } })
      await recordar(alumno.id, player, `${player.name} me enseñó ${info?.name}`, tick)
      await tocarVinculo(alumno.id, player.id, { valued: 20 })
      return `le enseñó ${info?.name} a ${alumno.name}`
    }

    default:
      return 'verbo desconocido'
  }
}

async function recordar(
  personId: string, player: { id: string }, what: string, tick: number,
) {
  await db.from('memories').insert({
    person_id: personId, about_kind: 'player', about_id: player.id, what, tick,
  })
}

async function tocarVinculo(
  personId: string, playerId: string, delta: { valued?: number; feared?: number },
) {
  const { data: actual } = await db
    .from('bonds').select('id, valued, feared')
    .eq('person_id', personId).eq('toward_id', playerId).maybeSingle()
  const clamp = (n: number) => Math.max(-100, Math.min(100, n))
  if (actual) {
    await db.from('bonds').update({
      valued: clamp(actual.valued + (delta.valued ?? 0)),
      feared: clamp(actual.feared + (delta.feared ?? 0)),
    }).eq('id', actual.id)
  } else {
    await db.from('bonds').insert({
      person_id: personId, toward_kind: 'player', toward_id: playerId,
      valued: clamp(delta.valued ?? 0), feared: clamp(delta.feared ?? 0),
    })
  }
}

// Sólo cuando se ejecuta como script; importado desde la web no hace nada.
if (process.argv[1]?.endsWith('tick.ts')) {
  const veces = Number(process.argv[2] ?? 1)
  for (let i = 0; i < veces; i++) await step()
}
