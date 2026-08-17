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

// ─────────────────────────────────────────────────────────────
// LA LÍNEA QUE SOSTIENE EL JUEGO ENTERO
// ─────────────────────────────────────────────────────────────
//
// **Un objeto sólo existe si alguien vivo sabe hacerlo.** No hay tienda, no hay
// drops, no hay receta tirada en un cofre. Cuando se muere el último que sabe
// forjar, no vuelve a haber una hoja nueva en el valle. Nunca.
//
// `buscar` no rompe esa regla, y hay que entender exactamente por qué o la
// próxima persona que toque este archivo la rompe sin darse cuenta:
//
//   · La raíz CRECE SOLA. El hierro que quedó en la Casa Quemada estaba ahí
//     antes que nadie. Nadie los fabrica, así que no hay saber que perder ni
//     saber que exigir: **la raíz la junta cualquiera.**
//   · El frasco NO crece. Sale de las manos de alguien que aprendió a destilar,
//     y el día que se muera esa persona no hay más frascos. **El destilado lo
//     hace sólo el que sabe destilar.**
//
// La línea está escrita en los datos, no en un comentario: **un objeto con
// `made_by = null` es uno que nadie hizo.** Es la ÚNICA forma en que algo entra
// al mundo sin que alguien sepa hacerlo, y sólo la produce esta tabla. Todo lo
// demás pasa por `trabajar`, que exige `knows` + el lugar correcto.
//
// Si alguna vez agregás algo acá, la pregunta es una sola: ¿esto crece, se
// cae o quedó ahí? Si la respuesta es "lo hace alguien", no va acá — va a
// `knowledge.makes`.
//
// La fragua no aparece a propósito. Es donde se HACE, no donde se junta, y que
// `buscar` devuelva nada ahí es lo que le enseña la diferencia al jugador.
const LO_QUE_DA_EL_LUGAR: Record<string, { kind: string; peso: number }[]> = {
  // Crece solo, y es lo que Odila viene persiguiendo desde el primer día.
  bosque: [
    { kind: 'raíz del Sotobosque', peso: 5 },
    { kind: 'rama de roble', peso: 3 },
    { kind: 'hongo de tronco', peso: 2 },
  ],
  // Lo que dejó el fuego. Lo que sobrevive a un incendio es el material, no el
  // objeto: de las vigas queda carbón y de las herraduras, hierro sin forma.
  ruina: [
    { kind: 'carbón', peso: 4 },
    { kind: 'hierro viejo', peso: 3 },
    { kind: 'ceniza', peso: 2 },
  ],
  // Piedra del pedregal y lo que crece al borde. Poco: es un camino.
  camino: [
    { kind: 'piedra de afilar', peso: 3 },
    { kind: 'hierba del borde', peso: 3 },
  ],
  // Casi nada, y el "casi nada" es el mensaje: en la aldea se hace y se habla.
  aldea: [
    { kind: 'caña de la orilla', peso: 2 },
    { kind: 'lino en rama', peso: 2 },
  ],
}

/** Cuántas veces de cada diez volvés con las manos vacías.
 *
 *  Sin esto `buscar` es una máquina expendedora: apretás y sale. Que a veces
 *  no salga nada es lo que hace que traer la raíz sea traer algo. */
const NO_HAY_NADA: Record<string, number> = {
  bosque: 2, ruina: 3, camino: 5, aldea: 6,
}

// ─────────────────────────────────────────────────────────────
// La confianza: cuánto hay que ganarse cada cosa
// ─────────────────────────────────────────────────────────────
//
// Estaba regalado. Con `aprender` en 10, hablar dando +2 y trabajar +4, eran
// TRES acciones y ya te enseñaban el oficio. Quien lo jugó lo dijo apenas lo
// tocó: *"me deja aprender ya pero recién me pidió algo, no tengo tanta
// confianza"*. El saber es el corazón del juego y no puede costar una tarde.
//
// Y ahí está la forma correcta, que la dijo el jugador sin querer: **primero te
// piden algo, después te enseñan.** Por eso son dos umbrales y no uno, y el de
// abajo es el que abre el camino al de arriba.
//
// Con los números de hoy (hablar +2, trabajar +4, fabricar +6, encargarse +4,
// cumplirle la agenda +25):
//
//   · Camino diseñado — 3 charlas (6) + encargarse (4) + traerle lo que
//     necesitaba (25 + calidad) = 36. Seis acciones, seis días del valle, y un
//     viaje al Sotobosque en el medio.
//   · Sin encargos — nueve jornadas trabajando delante suyo, o seis cosas
//     fabricadas donde te vea, o dieciocho charlas.
//
// Un tick es un día y el cron corre uno cada seis horas, pero además cada
// acción del jugador dispara un tick (`web.ts`), así que esto se mide en
// acciones, no en horas de reloj.
export const UMBRAL_ENCARGO = 5
export const UMBRAL_ENSENAR = 35

/** Cómo te ve alguien, dicho como se dice en el valle.
 *
 * **Nunca un número, nunca un porcentaje.** Un jugador tiene que poder saber
 * cuánto le falta sin ver una barra: la diferencia entre "te ubica, nada más"
 * y "empieza a confiar" se siente, y los dos saltos que importan además se
 * anuncian solos en `events` (ver `tocarVinculo`).
 *
 * Los cortes son los umbrales de verdad, no adornos: si movés un umbral, la
 * escalera se mueve con él y nadie tiene que acordarse de sincronizar dos
 * listas de números.
 */
export function comoTeVe(valued: number): string {
  if (valued < 0) return 'te tiene bronca'
  if (valued === 0) return 'todavía no te conoce'
  if (valued < UMBRAL_ENCARGO) return 'te ubica, nada más'
  if (valued < UMBRAL_ENSENAR - 17) return 'empieza a confiar'
  if (valued < UMBRAL_ENSENAR) return 'te tiene fe'
  return 'te confiaría lo suyo'
}

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
    .select('id, person_id, goal, needs_kind, needs_id, needs_object, progress, state')
    .eq('state', 'activa')).data ?? []

  for (const agenda of agendas) {
    const who = people.find((p) => p.id === agenda.person_id)
    if (!who) continue
    if (Math.random() > pace) continue

    // ¿Le falta una COSA?
    //
    // Ésta es la puerta por la que entra el jugador, y la razón de que corra
    // igual esté él o no: si te encargaste de traerle la raíz a Odila y no
    // volvés, Odila la consigue sola. El mundo no te espera — es la lección de
    // Red Dead y es a propósito.
    if (agenda.needs_kind === 'object' && agenda.needs_object) {
      const falta = agenda.needs_object

      // Ojo con lo que NO hay acá: no se chequea si el NPC ya tiene una en la
      // mano, y no se le crea el objeto cuando la termina solo. Las dos cosas
      // estuvieron escritas y las dos estaban mal.
      //
      // Una agenda material se cumple GASTANDO la cosa: Ilde junta carbón para
      // el invierno y lo quema, Odila quiere la raíz para destilarla. Si al
      // cumplirla le dejábamos el carbón en el inventario, la próxima vez que
      // le tocara "juntar carbón" se cumplía sola en el acto — y pasó, tres
      // ticks seguidos, en la primera corrida de esto. El valle se convertía en
      // una persona anunciando que consiguió lo mismo una y otra vez.
      //
      // Lo único que entra al mundo por esta vía es lo que trae un jugador, y
      // eso pasa por `dar`.

      // Acá está la regla otra vez, del lado de los NPCs: la raíz crece sola
      // y Odila la puede ir a juntar, pero un frasco sale de las manos de
      // alguien que sabe destilar. Si no queda nadie vivo que lo sepa hacer, la
      // agenda se traba igual que cuando falta un saber — y eso es exactamente
      // lo que tiene que pasar. Si el NPC "consiguiera" un frasco de la nada,
      // la escasez sería decorativa.
      const crece = Object.values(LO_QUE_DA_EL_LUGAR)
        .some((tabla) => tabla.some((t) => t.kind === falta))
      if (!crece) {
        const quienSabe = await quienLoSabeHacer(falta, people)
        if (!quienSabe) {
          await db.from('agendas').update({ state: 'bloqueada' }).eq('id', agenda.id)
          ev({ kind: 'agenda_bloqueada', place_id: who.place_id,
            summary: `${who.name} dejó de intentar ${agenda.goal}: ya no queda nadie que sepa hacer ${falta}.`,
            detail: { person: who.name, goal: agenda.goal, object: falta } })
          continue
        }
      }
      // Si llegó hasta acá, es alcanzable: avanza con el progreso de siempre.
    }

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
        await cumplirAgenda(agenda, who, nextTick, ev, {
          kind: 'agenda_cumplida', place_id: who.place_id,
          summary: `${who.name} consiguió lo que le faltaba para ${agenda.goal}.`,
          detail: { person: who.name, goal: agenda.goal },
        })
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

    // Cuánto se avanza en un día.
    //
    // Estaba en `8 + roll(18)`, o sea ~16 por tick: una agenda entera en SEIS
    // días del valle. Con eso el jugador no llega nunca — en la primera corrida
    // de esto Odila cerró lo suyo en el mismo tick en que Pedro se encargó, y
    // no por mala suerte: era el caso típico. Una ventana de seis días donde
    // además tenés que enterarte, ir y volver, es no tener ventana.
    //
    // Con `2 + roll(8)` (media 5,5) una agenda dura unos 18 días del valle. El
    // cron corre cuatro ticks por día real, así que son ~4 días reales si nadie
    // juega, y ~18 acciones si hay alguien adentro (cada acción dispara un
    // tick). Alcanza para escucharlo, cruzar el valle y volver, y sigue
    // dejando una agenda cerrándose cada tres o cuatro ticks entre las cinco
    // personas del valle: el mundo se mueve igual, sólo que a paso de gente y
    // no de planilla.
    const gained = 2 + roll(8)
    const progress = Math.min(100, agenda.progress + gained)

    if (progress >= 100) {
      await cumplirAgenda(agenda, who, nextTick, ev, {
        kind: 'agenda_cumplida', place_id: who.place_id,
        summary: `${who.name} se salió con la suya: ${agenda.goal}.`,
        detail: { person: who.name, goal: agenda.goal },
      })
    } else {
      await db.from('agendas').update({ progress }).eq('id', agenda.id)
      // Un buen día suelto no es noticia todos los días. Con la curva nueva
      // esto sale ~1 vez por agenda: la vez que de verdad pegó un salto.
      if (gained >= 9 && Math.random() < 0.5) {
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

  // ── 6. Los encargos que se cerraron sin vos ───────────────
  //
  // Ésta es la parte incómoda y es la que más importa: te encargaste de
  // conseguirle la raíz a Odila, no volviste en tres días, y Odila la
  // consiguió. No perdiste nada — nunca fue tuya. El valle siguió andando.
  //
  // Vale igual si la cerró otro jugador mientras dormías. No es un bug: es lo
  // que hace que las agendas sean únicas por mundo y no una copia por persona.
  //
  // Ruido: un encargo se cierra UNA vez en su vida. No hay forma de que esto
  // se repita tick a tick, así que no lleva probabilidad.
  if (players.length > 0) {
    const abiertos = (await db
      .from('encargos').select('id, agenda_id, player_id')
      .eq('state', 'activo').in('player_id', players.map((p) => p.id))).data ?? []

    for (const enc of abiertos) {
      const { data: a } = await db
        .from('agendas').select('goal, state, person_id').eq('id', enc.agenda_id)
        .limit(1).maybeSingle()
      // Sigue abierta: nada que contar. Un estado que no cambió no es noticia.
      if (!a || a.state === 'activa' || a.state === 'bloqueada') continue

      await db.from('encargos')
        .update({ state: 'perdido', closed_tick: nextTick }).eq('id', enc.id)

      const quien = people.find((p) => p.id === a.person_id)
      const jugador = players.find((p) => p.id === enc.player_id)
      if (!quien || !jugador) continue
      ev({ kind: 'encargo_perdido', place_id: quien.place_id,
        summary: a.state === 'cumplida'
          ? `${quien.name} lo resolvió sin esperar a ${jugador.name}, que se había encargado: ${a.goal}.`
          : `${quien.name} soltó lo suyo y ${jugador.name} se había encargado de eso: ${a.goal}.`,
        detail: { person: quien.name, player: jugador.name, goal: a.goal } })
    }
  }

  if (events.length > 0) await db.from('events').insert(events)
  await db.from('regions').update({ tick: nextTick }).eq('id', region.id)

  console.log(`tick ${nextTick} ${populated ? '' : '(vacío, a un cuarto de paso) '}— ${events.length} eventos`)
  for (const e of events) console.log(`  · ${e.summary}`)
}

/** Lo próximo que va a perseguir alguien de ese oficio.
 *
 * `obj` es lo que convierte una meta en algo que un jugador puede cerrar. No
 * todas lo tienen a propósito: "dormir una noche entera" no se resuelve
 * trayendo nada, y un valle donde todo se arregla con un objeto es una lista
 * de recados.
 *
 * Y mirá cuáles piden algo FABRICADO —el frasco de Odila, el filo de Sarn—:
 * ésas sólo las puede cerrar alguien que aprendió el oficio. Ahí está el bucle
 * entero en una línea de datos: aprendés → fabricás → regalás → te ganás a la
 * gente → te enseñan más.
 */
function siguienteMeta(trade: string, evitar?: string): { goal: string; obj?: string } {
  const metas: Record<string, { goal: string; obj?: string }[]> = {
    herrera: [
      { goal: 'juntar carbón para el invierno', obj: 'carbón' },
      { goal: 'rehacer las bisagras del granero', obj: 'hierro viejo' },
    ],
    aprendiz: [
      { goal: 'ganarse que lo dejen tocar el yunque' },
      { goal: 'pagar lo que debe', obj: 'frasco de raíz' },
    ],
    cazadora: [
      { goal: 'marcar una senda nueva antes de las lluvias' },
      { goal: 'curtir lo de esta semana' },
      { goal: 'conseguir una piedra que le devuelva el filo', obj: 'piedra de afilar' },
    ],
    destiladora: [
      { goal: 'conseguir raíz del Sotobosque', obj: 'raíz del Sotobosque' },
      { goal: 'cobrar tres deudas viejas', obj: 'frasco de raíz' },
    ],
    guardia: [
      { goal: 'conseguir que le paguen el mes' },
      { goal: 'dormir una noche entera' },
      { goal: 'conseguir un filo que no se le melle', obj: 'hoja templada' },
    ],
    'chico del camino': [
      { goal: 'ver de cerca a alguien que sepa magia' },
      { goal: 'juntar algo que valga para cambiar', obj: 'piedra de afilar' },
    ],
  }
  const catalogo = metas[trade] ?? [{ goal: 'pasar el invierno sin deberle nada a nadie' }]
  // Nunca la misma que acaba de terminar. Sin esto el sorteo repetía la meta y
  // el valle quedaba con «Ilde consiguió juntar carbón» / «Ilde se puso a
  // juntar carbón» tres ticks seguidos: no es un mundo que avanza, es un disco
  // rayado, y el director cobra por leerlo.
  const otras = catalogo.filter((m) => m.goal !== evitar)
  return pick(otras.length ? otras : catalogo)!
}

/** ¿Hay alguien vivo que sepa hacer esto? Devuelve su nombre, o null.
 *
 * Es la regla de la escasez hecha función, y se consulta antes de que cualquier
 * cosa fabricada entre al mundo. `people` ya viene filtrado por `alive`, así
 * que un muerto no cuenta — que es justamente el punto: cuando se va el último
 * que sabía, deja de haberlas.
 *
 * (Los jugadores también cuentan. Si el único que sabe forjar es un jugador,
 * el valle depende de que se conecte, y eso está bien.)
 */
async function quienLoSabeHacer(
  kind: string, people: { id: string; name: string }[],
): Promise<string | null> {
  const { data: receta } = await db
    .from('knowledge').select('id').eq('makes', kind).limit(1).maybeSingle()
  if (!receta) return null
  const holders = (await db
    .from('knows').select('holder_kind, holder_id')
    .eq('knowledge_id', receta.id)).data ?? []
  for (const h of holders) {
    if (h.holder_kind === 'person') {
      const p = people.find((q) => q.id === h.holder_id)
      if (p) return p.name
    }
    if (h.holder_kind === 'player') {
      const { data: pl } = await db
        .from('players').select('name').eq('id', h.holder_id).limit(1).maybeSingle()
      if (pl) return pl.name
    }
  }
  return null
}

/** Cierra una agenda, cierra los encargos que la seguían, y abre la que sigue.
 *
 * Está en un solo lugar porque son cuatro cosas que tienen que pasar juntas o
 * ninguna: si se cumple la agenda y el encargo queda abierto, el jugador se
 * queda esperando algo que ya pasó; si no se abre la siguiente, el NPC se queda
 * quieto y el valle se apaga de a una persona por vez.
 *
 * `porJugador` es quién la cerró, si la cerró alguien. Los encargos de los
 * demás quedan abiertos y los levanta la pasada 6 como `perdido`.
 */
async function cumplirAgenda(
  agenda: { id: string; goal: string },
  who: { id: string; name: string; trade: string; place_id: string | null },
  tick: number,
  ev: (e: Omit<Ev, 'region_id' | 'tick'>) => void,
  evento: Omit<Ev, 'region_id' | 'tick'>,
  porJugador?: { id: string; name: string },
) {
  await db.from('agendas')
    .update({ state: 'cumplida', progress: 100, ended_tick: tick })
    .eq('id', agenda.id)
  ev(evento)

  if (porJugador) {
    await db.from('encargos')
      .update({ state: 'cumplido', closed_tick: tick })
      .eq('agenda_id', agenda.id).eq('player_id', porJugador.id).eq('state', 'activo')
  }

  // Una agenda cumplida abre la siguiente. El mundo no se queda quieto.
  const nueva = siguienteMeta(who.trade, agenda.goal)
  await db.from('agendas').insert({
    person_id: who.id, goal: nueva.goal, started_tick: tick,
    needs_kind: nueva.obj ? 'object' : null,
    needs_object: nueva.obj ?? null,
  })
  ev({ kind: 'agenda_nueva', place_id: who.place_id,
    summary: `${who.name} se puso a ${nueva.goal}.`,
    detail: { person: who.name, goal: nueva.goal, object: nueva.obj ?? null } })
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
      // Y también en memoria. Si en el mismo tick quedaron encoladas `ir
      // bosque` y `buscar`, la segunda tiene que ver el bosque y no la aldea:
      // `player` es el objeto que traía el tick de antes de moverse, y sin esta
      // línea el jugador busca donde ya no está. Es el camino normal de una
      // sesión —te movés y hacés algo— y estaba roto en silencio.
      player.place_id = destino.id
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
      await tocarVinculo(quien, player, { valued: 2 }, ev)
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
          await tocarVinculo(t, player, { valued: 6 }, ev)
        }
        return `hizo ${receta.makes} (destreza ${ahora})`
      }

      ev({ kind: 'trabajo', place_id: player.place_id,
        summary: `${player.name} pasó el día trabajando en ${lugar?.name ?? 'el valle'}.`,
        detail: { player: player.name } })
      for (const t of testigos) {
        await recordar(t.id, player, `${player.name} trabaja sin que se lo pidan`, tick)
        await tocarVinculo(t, player, { valued: 4 }, ev)
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
        await tocarVinculo(t, player, { valued: 8, feared: 5 }, ev)
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
      const v = vinculo?.valued ?? 0
      if (v < UMBRAL_ENSENAR) {
        // La negativa DICE en qué escalón estás. Es la mitad del arreglo: subir
        // el umbral sin que se note cuánto falta convierte "ganarse a alguien"
        // en tirar el dado hasta que salga. Con esto lo intentás dos veces con
        // una semana de por medio y escuchás que la frase cambió.
        ev({ kind: 'negativa', place_id: maestro.place_id,
          summary: `${maestro.name} ${comoTeVe(v)}, pero no lo suficiente como para enseñarle lo suyo a ${player.name}.`,
          detail: { player: player.name, person: maestro.name, confianza: comoTeVe(v) } })
        return `${maestro.name} ${comoTeVe(v)}`
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
      const puede = sabe.filter((k) => !tiene.has(k.knowledge_id))
      if (puede.length === 0) return `${alumno.name} ya sabe todo lo que él sabe`

      // Si el tipo está trabado esperando justo eso, enseñale eso. Antes salía
      // al azar y podías tener la runa de brasa en la cabeza, enseñarle a Tobio
      // a leer sendas, e irte sin enterarte de que estabas a un paso de cerrar
      // lo único que ese chico quiere en la vida. *"Tobio quiere ver magia de
      // cerca, y vos acabás de aprender la runa de brasa"* — eso es la tarea.
      const { data: suya } = await db
        .from('agendas').select('id, goal, needs_id')
        .eq('person_id', alumno.id).in('state', ['activa', 'bloqueada'])
        .eq('needs_kind', 'knowledge').limit(1).maybeSingle()
      const nuevo = puede.find((k) => k.knowledge_id === suya?.needs_id) ?? pick(puede)!

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
      await tocarVinculo(alumno, player, { valued: 20 }, ev)

      // Y si eso era lo que le faltaba, la agenda se cierra ACÁ y con tu
      // nombre. La pasada 2 la cerraría igual un rato después, pero sin decir
      // que fuiste vos: el jugador haría lo más generoso del juego y leería
      // «Tobio consiguió lo que quería» como si hubiera pasado solo.
      if (suya && suya.needs_id === nuevo.knowledge_id) {
        await cumplirAgenda(suya, alumno, tick, ev, {
          kind: 'agenda_cumplida', place_id: alumno.place_id,
          summary: `${alumno.name} llevaba tiempo detrás de ${suya.goal}. Se lo enseñó ${player.name}, y ahora lo saben dos.`,
          detail: {
            person: alumno.name, player: player.name, goal: suya.goal,
            knowledge: info?.name,
          },
        }, player)
        await tocarVinculo(alumno, player, { valued: 25 }, ev)
      }
      return `le enseñó ${info?.name} a ${alumno.name}`
    }

    // ── encargarse ────────────────────────────────────────────
    //
    // El verbo que faltaba, y con él las quests. **No hay sistema de quests
    // porque ya existían y se llaman agendas**: "Odila quiere conseguir raíz
    // del Sotobosque" está en la base desde el primer día, avanza sola y nadie
    // la podía tocar. Esto es la manija, nada más.
    //
    // Lo importante de lo que NO hace: no congela la agenda, no la reserva, no
    // te la asigna. Sigue siendo de Odila y sigue corriendo. Si te encargás y
    // no volvés, Odila la resuelve igual o se traba igual. Eso es Red Dead: el
    // mundo no te espera, y que otro jugador te la cierre mientras dormís es
    // parte del diseño, no un bug.
    case 'encargarse': {
      const quien = people.find(
        (p) => norm(p.name).includes(target) && p.place_id === player.place_id)
      if (!quien) return `no hay ningún ${action.target} acá`

      const abiertas = (await db
        .from('agendas').select('id, goal, state, progress, needs_kind, needs_object')
        .eq('person_id', quien.id).in('state', ['activa', 'bloqueada'])
        .order('started_tick', { ascending: true })).data ?? []
      const agenda = abiertas[0]
      if (!agenda) return `${quien.name} no anda detrás de nada ahora mismo`

      // Nadie le pasa a otro algo que ya casi terminó. El mundo no te espera,
      // pero tampoco te deja anotarte para perder: sin esto te encargabas y en
      // el mismo tick te llegaba «lo resolvió sin esperarte», que es la peor
      // versión posible de la lección.
      if (agenda.progress >= 80) {
        return `${quien.name} ya casi lo tiene resuelto y no necesita que nadie se meta`
      }

      const { data: yaEsta } = await db
        .from('encargos').select('id, state')
        .eq('agenda_id', agenda.id).eq('player_id', player.id).limit(1).maybeSingle()
      if (yaEsta) return `ya se había encargado de eso`

      // Un favor se pide antes que un oficio. Por eso este umbral es bajo y el
      // de enseñar es alto: te piden algo primero, te enseñan después, y hacer
      // el favor es lo que te lleva del uno al otro.
      const { data: vinculo } = await db
        .from('bonds').select('valued')
        .eq('person_id', quien.id).eq('toward_id', player.id).maybeSingle()
      const v = vinculo?.valued ?? 0
      if (v < UMBRAL_ENCARGO) {
        ev({ kind: 'negativa', place_id: quien.place_id,
          summary: `${quien.name} ${comoTeVe(v)}: no le va a encargar nada suyo a ${player.name} todavía.`,
          detail: { player: player.name, person: quien.name, confianza: comoTeVe(v) } })
        return `${quien.name} ${comoTeVe(v)}`
      }

      await db.from('encargos').insert({
        agenda_id: agenda.id, player_id: player.id, taken_tick: tick,
      })
      ev({ kind: 'encargo', place_id: quien.place_id,
        summary: agenda.needs_object
          ? `${quien.name} le encargó a ${player.name} ${agenda.goal}: le hace falta ${agenda.needs_object}.`
          : `${quien.name} le encargó a ${player.name} ${agenda.goal}.`,
        detail: {
          person: quien.name, player: player.name, goal: agenda.goal,
          object: agenda.needs_object ?? null, trabada: agenda.state === 'bloqueada',
        } })
      await recordar(quien.id, player, `${player.name} se encargó de ${agenda.goal}`, tick)
      await tocarVinculo(quien, player, { valued: 4 }, ev)

      // El "dónde" sale del estado, nunca de un modelo: si te digo que la raíz
      // está en el Sotobosque es porque el Sotobosque la da. Un tutorial que
      // miente es peor que ninguno.
      const donde = agenda.needs_object ? dondeSeConsigue(agenda.needs_object, places) : null
      return `se encargó de ${agenda.goal}`
        + (agenda.needs_object ? ` — hace falta ${agenda.needs_object}` : '')
        + (donde ? `, y eso se junta en ${donde}` : '')
    }

    // ── buscar ────────────────────────────────────────────────
    //
    // *"buscar algo en el bosque, ¿existe eso?"* — no existía, y era lo único
    // que faltaba para que "conseguir raíz del Sotobosque" fuera jugable.
    //
    // **Acá no se pide saber nada, y es a propósito.** La raíz la junta
    // cualquiera; el frasco lo hace sólo el que aprendió a destilar. Ésa es la
    // línea entera del juego y está en las dos ramas de este archivo: `buscar`
    // no mira `knows` ni una vez, `trabajar` no hace nada sin `knows`. Ver el
    // comentario largo arriba de LO_QUE_DA_EL_LUGAR antes de tocar cualquiera
    // de las dos.
    case 'buscar': {
      const lugar = places.find((p) => p.id === player.place_id)
      if (!lugar) return 'no está en ningún lado'

      const tabla = LO_QUE_DA_EL_LUGAR[lugar.kind]
      if (!tabla) {
        ev({ kind: 'busqueda', place_id: lugar.id,
          summary: `${player.name} se puso a revolver ${lugar.name} y no hay nada que juntar: acá las cosas se hacen, no se encuentran.`,
          detail: { player: player.name, place: lugar.name, object: null } })
        return `en ${lugar.name} no hay nada que juntar; acá se trabaja`
      }

      // Sorteo con pesos, y el "nada" es una entrada más del sorteo. Sin esa
      // entrada `buscar` es una máquina expendedora y traer la raíz deja de
      // ser traer algo.
      const nada = NO_HAY_NADA[lugar.kind] ?? 3
      let n = roll(tabla.reduce((s, t) => s + t.peso, 0) + nada)
      let sale: string | null = null
      for (const t of tabla) {
        if (n < t.peso) { sale = t.kind; break }
        n -= t.peso
      }

      const testigos = people.filter((p) => p.place_id === player.place_id)
      if (!sale) {
        // Esto sí se emite siempre aunque no haya cambiado nada, y es la única
        // excepción a la regla del ruido: lo pidió un jugador. Un tick que
        // repite algo solo es ruido; una acción que alguien mandó a propósito
        // siempre es noticia para esa persona.
        ev({ kind: 'busqueda', place_id: lugar.id,
          summary: `${player.name} anduvo revolviendo ${lugar.name} y volvió con las manos vacías.`,
          detail: { player: player.name, place: lugar.name, object: null } })
        return `no encontró nada en ${lugar.name}`
      }

      // La calidad de una raíz es de la raíz, no de tus manos: no hay destreza
      // que valga para agacharse. Por eso tampoco sube nada al buscar.
      const q = 40 + roll(35)
      await db.from('objects').insert({
        region_id: regionId, kind: sale, quality: q,
        // ⚠ null. NADIE LO HIZO. Es la única puerta por la que entra al mundo
        //   algo sin que haya un vivo que sepa hacerlo, y sólo la abre este
        //   caso. Si alguna vez ves un `made_by` acá, alguien rompió la regla.
        made_by: null,
        made_tick: tick,
        holder_kind: 'player', holder_id: player.id,
      })
      ev({ kind: 'hallazgo', place_id: lugar.id,
        summary: `${player.name} salió de ${lugar.name} con ${sale}.`,
        detail: { player: player.name, place: lugar.name, object: sale, quality: q } })
      for (const t of testigos) {
        await recordar(t.id, player, `${player.name} anduvo juntando cosas por acá`, tick)
        await tocarVinculo(t, player, { valued: 3 }, ev)
      }
      return `encontró ${sale} en ${lugar.name}`
    }

    // ── dar ───────────────────────────────────────────────────
    //
    // El verbo que cierra el bucle chico: **aprendés → fabricás → regalás → te
    // ganás a la gente → te enseñan más.** Hasta hoy fabricabas y no había nada
    // que hacer con lo fabricado, que era el agujero original del diseño — un
    // saber que no habilita hacer algo es un renglón en una lista.
    //
    // Dos resultados, y los dos importan:
    //   · Si es lo que esa persona necesitaba, la agenda se CUMPLE y el vínculo
    //     salta. Es lo más narrable que hay en el juego.
    //   · Si no, igual mueve el aprecio. **Regalar es regalar.**
    //
    // Sólo a NPCs: pasarse cosas entre jugadores necesita las dos puntas
    // conectadas y todavía no hay dónde ponerlo.
    case 'dar': {
      // "<cosa> a <alguien>", o sólo "<alguien>" y le damos lo que necesita.
      // Nunca elegimos por el jugador cuando no hay pedido: dar por descarte lo
      // mejor que llevás encima es la clase de ayuda que te deja sin la espada.
      const bruto = action.target ?? ''
      const corte = bruto.toLowerCase().lastIndexOf(' a ')
      const queStr = corte > 0 ? bruto.slice(0, corte).trim() : null
      const quienStr = norm((corte > 0 ? bruto.slice(corte + 3) : bruto).trim())
      if (!quienStr) return 'uso: dar <cosa> a <persona>'

      const quien = people.find(
        (p) => norm(p.name).includes(quienStr) && p.place_id === player.place_id)
      if (!quien) return `no hay ningún ${quienStr} acá`

      const mios = (await db
        .from('objects').select('id, kind, quality, made_by')
        .eq('holder_kind', 'player').eq('holder_id', player.id)).data ?? []
      if (mios.length === 0) return 'no tiene nada encima para dar'

      const abiertas = (await db
        .from('agendas').select('id, goal, needs_kind, needs_object')
        .eq('person_id', quien.id).in('state', ['activa', 'bloqueada'])).data ?? []

      const candidatos = queStr
        ? mios.filter((o) => norm(o.kind).includes(norm(queStr)))
        : mios.filter((o) => abiertas.some((a) => a.needs_object === o.kind))
      if (candidatos.length === 0) {
        return queStr
          ? `no lleva ningún "${queStr}" encima`
          : `${quien.name} no anda detrás de nada que ${player.name} tenga encima`
      }
      // El mejor de los que tenga. Un regalo es un regalo, y además la calidad
      // pesa en cuánto mueve el vínculo: tu destreza se vuelve capital social.
      const regalo = candidatos.sort((a, b) => b.quality - a.quality)[0]!

      // Se va del inventario de verdad. El objeto no se destruye: sigue en el
      // mundo, en la mano de otro, y sigue diciendo quién lo hizo. Un cuchillo
      // que dice "lo hizo Ilde" veinte días después de que Ilde no está es el
      // juego entero en una línea.
      await db.from('objects')
        .update({ holder_kind: 'person', holder_id: quien.id }).eq('id', regalo.id)

      const autoria = regalo.made_by && regalo.made_by !== player.name
        ? ` Lo había hecho ${regalo.made_by}.` : ''
      const bonus = Math.floor(regalo.quality / 25)   // 0..4, la mano se nota
      const cumple = abiertas.find(
        (a) => a.needs_kind === 'object' && a.needs_object === regalo.kind)

      if (!cumple) {
        ev({ kind: 'regalo', place_id: quien.place_id,
          summary: `${player.name} le dio ${regalo.kind} a ${quien.name} sin pedirle nada a cambio.${autoria}`,
          detail: {
            player: player.name, person: quien.name, object: regalo.kind,
            quality: regalo.quality, made_by: regalo.made_by ?? null, cumple: false,
          } })
        await recordar(quien.id, player, `${player.name} me regaló ${regalo.kind}`, tick)
        await tocarVinculo(quien, player, { valued: 5 + bonus }, ev)
        return `le dio ${regalo.kind} a ${quien.name}`
      }

      const { data: encargado } = await db
        .from('encargos').select('id')
        .eq('agenda_id', cumple.id).eq('player_id', player.id).eq('state', 'activo')
        .limit(1).maybeSingle()

      // Esto no se cuenta con un texto de sistema. Alguien venía atrás de algo
      // hace días, se lo trajiste, y eso es de las mejores cosas que le van a
      // pasar al director para narrar. El hecho estructurado va en `detail`;
      // acá va la frase.
      await cumplirAgenda(cumple, quien, tick, ev, {
        kind: 'agenda_cumplida', place_id: quien.place_id,
        summary: encargado
          ? `${quien.name} venía detrás de ${cumple.goal} y no lo conseguía. ${player.name} se había encargado, y volvió con ${regalo.kind}.${autoria}`
          : `${quien.name} venía detrás de ${cumple.goal}. ${player.name} apareció con ${regalo.kind} y se lo puso en la mano sin que nadie se lo pidiera.${autoria}`,
        detail: {
          person: quien.name, player: player.name, goal: cumple.goal,
          object: regalo.kind, quality: regalo.quality,
          made_by: regalo.made_by ?? null, encargado: !!encargado,
        },
      }, player)

      await recordar(quien.id, player,
        `${player.name} me trajo ${regalo.kind} cuando lo necesitaba`, tick)
      await tocarVinculo(quien, player, { valued: 25 + bonus }, ev)
      return `le cumplió a ${quien.name}: ${cumple.goal}`
    }

    default:
      return 'verbo desconocido'
  }
}

/** En qué lugar del valle se junta esto, si es que se junta en alguno.
 *
 * Sale del estado y no de un modelo, así que no puede mandar a nadie a buscar
 * la raíz a un lugar donde no hay raíz. Devuelve null para lo fabricado: eso no
 * se junta en ningún lado, hay que encontrar a alguien que sepa hacerlo — que
 * es exactamente el juego.
 */
function dondeSeConsigue(
  kind: string, places: { name: string; kind: string }[],
): string | null {
  for (const [tipo, tabla] of Object.entries(LO_QUE_DA_EL_LUGAR)) {
    if (!tabla.some((t) => t.kind === kind)) continue
    const lugar = places.find((p) => p.kind === tipo)
    if (lugar) return lugar.name
  }
  return null
}

async function recordar(
  personId: string, player: { id: string }, what: string, tick: number,
) {
  await db.from('memories').insert({
    person_id: personId, about_kind: 'player', about_id: player.id, what, tick,
  })
}

/** Mueve el vínculo y —esto es lo nuevo— avisa cuando cruzás un escalón.
 *
 * **El camino tiene que ser visible sin un número.** Un jugador no puede ver
 * "confianza 27/35": los porcentajes de cara al jugador están prohibidos y
 * además convierten una relación en una barra de progreso. Pero tampoco puede
 * quedarse a ciegas, porque entonces subir la confianza es superstición.
 *
 * La salida son dos avisos y sólo dos, los dos que abren algo:
 *
 *   · cruzar UMBRAL_ENCARGO — a partir de acá te piden favores.
 *   · cruzar UMBRAL_ENSENAR — a partir de acá te enseñan el oficio.
 *
 * Se emite en la TRANSICIÓN y nada más. Un vínculo que subió dos puntos y no
 * cruzó nada no es noticia, y si lo fuera el director cobraría por leer que a
 * Ilde le caés un poquito mejor que ayer. Cada par (persona, jugador) puede
 * producir estos dos eventos una vez en la vida.
 *
 * El resto del camino se ve en `comoTeVe()`, que es lo que dicen los NPCs y lo
 * que sale cuando alguien se niega a enseñarte.
 */
async function tocarVinculo(
  person: { id: string; name: string; place_id: string | null },
  player: { id: string; name: string },
  delta: { valued?: number; feared?: number },
  ev?: (e: Omit<Ev, 'region_id' | 'tick'>) => void,
) {
  const { data: actual } = await db
    .from('bonds').select('id, valued, feared')
    .eq('person_id', person.id).eq('toward_id', player.id).maybeSingle()
  const clamp = (n: number) => Math.max(-100, Math.min(100, n))
  const antes = actual?.valued ?? 0
  const ahora = clamp(antes + (delta.valued ?? 0))

  if (actual) {
    await db.from('bonds').update({
      valued: ahora,
      feared: clamp(actual.feared + (delta.feared ?? 0)),
    }).eq('id', actual.id)
  } else {
    await db.from('bonds').insert({
      person_id: person.id, toward_kind: 'player', toward_id: player.id,
      valued: ahora, feared: clamp(delta.feared ?? 0),
    })
  }

  if (!ev) return
  const cruzo = (u: number) => antes < u && ahora >= u
  if (cruzo(UMBRAL_ENSENAR)) {
    ev({ kind: 'confianza', place_id: person.place_id,
      summary: `${person.name} ya le confiaría a ${player.name} lo que sabe hacer.`,
      detail: { person: person.name, player: player.name, abre: 'aprender' } })
  } else if (cruzo(UMBRAL_ENCARGO)) {
    ev({ kind: 'confianza', place_id: person.place_id,
      summary: `${person.name} empezó a confiar en ${player.name}: ya le pediría un favor.`,
      detail: { person: person.name, player: player.name, abre: 'encargarse' } })
  }
}

// Sólo cuando se ejecuta como script; importado desde la web no hace nada.
if (process.argv[1]?.endsWith('tick.ts')) {
  const veces = Number(process.argv[2] ?? 1)
  for (let i = 0; i < veces; i++) await step()
}
