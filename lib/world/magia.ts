/**
 * La magia. Cuatro runas y una gramática.
 *
 * Es el sistema más distintivo del juego y estaba diseñado desde el primer día
 * sin construirse: había dos runas en `knowledge` que se podían aprender y no
 * hacían nada. Cuando en el tick 10 se murió Ren y "se llevó las dos runas del
 * valle", lo que se llevó fueron dos renglones de una tabla.
 *
 * ── Qué es una runa ────────────────────────────────────────────────────────
 *
 * El modelo es **Magicka, no Diablo 2**. Diablo 2 tiene el vocabulario ancho y
 * la ejecución chata: cien habilidades y cada una es apretar un botón. Acá hay
 * cuatro piezas y **no hay lista de hechizos, hay gramática** (§6).
 *
 * El criterio para admitir una runa es duro, y está escrito para poder
 * aplicarlo de nuevo el día que alguien quiera agregar la quinta: **una runa
 * entra sólo si abre un eje que ninguna otra abre.** No "si hace algo lindo".
 * Los cuatro ejes son las cuatro preguntas que tiene cualquier efecto del
 * mundo, y por eso son cuatro y no cinco:
 *
 *   | runa    | pregunta    | sola                        | detrás de otra           |
 *   |---------|-------------|-----------------------------|--------------------------|
 *   | brasa   | ¿cuánto?    | quema                       | aviva lo que venía       |
 *   | quietud | ¿cuánto dura?| frena un día               | deja puesto lo que venía |
 *   | aliento | ¿a cuántos? | empuja y saca del lugar     | reparte a todo el lugar  |
 *   | vena    | ¿a quién?   | cierra heridas de un cuerpo | mete lo que venía adentro|
 *
 * Cada runa es **materia** cuando va primera y **operador** cuando va detrás.
 * De ahí sale la combinatoria, y sale grande con cuatro piezas porque **el
 * orden importa**: `brasa aliento` es fuego que se esparce (le entra a todo lo
 * que hay en el lugar); `aliento brasa` es un empujón que quema (saca a uno de
 * ahí y le deja la marca). No son variantes del mismo hechizo, son dos cosas
 * distintas hechas con las mismas dos runas.
 *
 * La cuenta: 4 solas + 12 pares ordenados + 24 tríos = **40 hechizos con cuatro
 * piezas**, y ninguno está escrito a mano en ningún lado. Se calculan. Es la
 * diferencia entre una gramática y un catálogo, y es lo que hace que agregar
 * una quinta runa algún día valga 20 hechizos nuevos en vez de uno.
 *
 * Y hay que decir la otra mitad en voz alta: **no todas las 40 valen la pena.**
 * `aliento vena` no hace casi nada que no haga `aliento`. Eso no es un bug: es
 * Frieren juntando hechizos menores, muchos inútiles, y es lo que hace que
 * descubrir uno bueno se sienta como descubrir algo en vez de como desbloquear
 * algo.
 *
 * ── Dónde está la habilidad ────────────────────────────────────────────────
 *
 * En el jugador, no en el personaje (§6). Lo que mejora con las horas es que
 * vos sabés que contra tres bichos juntos conviene `brasa aliento` y que contra
 * uno grande conviene `brasa vena`. Eso no es un número: es que te acordás.
 *
 * La destreza (§8.4) existe igual y hace lo de siempre —lo que usás, mejora—
 * pero **no sube el techo, sube el piso**: con destreza 0 te sale al 55% de lo
 * que la runa da; con 100, al 100% y ni un punto más. El veterano no pega más
 * fuerte que el hechizo: es el novato el que todavía no lo traza entero. Si la
 * destreza multiplicara para arriba, habríamos inventado la progresión vertical
 * en el único sistema que existe para no tenerla.
 *
 * ── Por qué se resuelve acá y en el momento ────────────────────────────────
 *
 * Igual que el golpe, y por el mismo motivo exacto que cuenta el encabezado de
 * `combate.ts`: una acción encolada tarda hasta seis horas y **un hechizo que
 * tarda seis horas no es un hechizo**. Se resuelve en el servidor, en el
 * momento, y deja su rastro en `events` como cualquier otra cosa que pasó — si
 * no está en `events`, no pasó.
 *
 * **Este archivo lo va a importar `tick.ts`, así que acá no entra el SDK de
 * Anthropic, ni directo ni de rebote.** El invariante 1 se rompe igual de las
 * dos formas. Los únicos imports son `../db.js` y `./combate.js`, que a su vez
 * sólo importa `../db.js`, y tienen que seguir siendo ésos.
 *
 * Y por la misma razón **no se importa `tick.ts` desde acá**: sería un ciclo.
 * Lo poco que se repite de allá —la curva de la destreza— está abajo, marcado,
 * con el porqué.
 */
import { db } from '../db.js'
import { recordar, tocarVinculo, type EventoPelea } from './combate.js'

/** Un evento del mundo. Es el mismo tipo que usa `combate.ts`; se importa en
 *  vez de declararlo de nuevo porque un segundo tipo idéntico es la forma en
 *  que dos archivos empiezan a escribir eventos distintos para lo mismo. */
export type EventoMundo = EventoPelea

const roll = (max: number) => Math.floor(Math.random() * max)
const pick = <T>(xs: T[]): T | undefined => xs[roll(xs.length)]

// ─────────────────────────────────────────────────────────────
// El efecto: lo que un hechizo le hace al mundo
// ─────────────────────────────────────────────────────────────

/**
 * Todo hechizo del juego es este objeto. No hay tipos de hechizo, no hay
 * clases, no hay una tabla de habilidades: hay ocho números y banderas que las
 * runas van moviendo en orden. Un hechizo ES el resultado de esa cuenta.
 */
export type Efecto = {
  /** Cuánto duele lo que reciba. */
  danio: number
  /** Cuánto cierra. Sobre un cuerpo vivo; sobre una amenaza, también (y ése es
   *  un error que se paga: le curás al bicho). */
  cura: number
  /** Lo saca del lugar donde está. Gente y bichos: los dos se mueven. */
  empuja: boolean
  /** Días que lo que reciba se queda quieto. */
  quieta: number
  /** Días que el efecto queda puesto, en el lugar o en el cuerpo. */
  dura: number
  /** A uno solo o a todo lo que haya en el lugar. */
  alcance: 'uno' | 'lugar'
  /** Sólo agarra cosas vivas. Contra la piedra de un lugar no hace nada, y eso
   *  es información: el que lo intenta aprende para qué sirve la vena. */
  soloVivo: boolean
  /** Lo que dura queda en el CUERPO y no en el lugar. Es lo que hace que
   *  `brasa quietud` (el lugar arde dos días) y `brasa quietud vena` (a ése le
   *  arde adentro dos días) sean dos hechizos y no uno con otro blanco. */
  enCuerpo: boolean
}

const vacio = (): Efecto => ({
  danio: 0, cura: 0, empuja: false, quieta: 0,
  dura: 0, alcance: 'uno', soloVivo: false, enCuerpo: false,
})

type Genero = 'm' | 'f'

type Runa = {
  slug: string
  /** Por qué existe. Si dos runas comparten eje, una sobra. */
  eje: 'intensidad' | 'tiempo' | 'alcance' | 'cuerpo'
  /** Cómo se la nombra cuando va primera: "el calor". */
  materia: string
  genero: Genero
  /** Cómo se la nombra cuando va detrás: "encendido" / "encendida". El género
   *  concuerda con la materia, que es la que manda en el nombre. */
  adjetivo: { m: string; f: string }
  /** Qué es el hechizo si la runa va primera. */
  base: (e: Efecto) => void
  /** Qué le hace al hechizo que ya venía si va detrás. */
  opera: (e: Efecto) => void
}

/**
 * El vocabulario entero del juego. Cuatro.
 *
 * Los números están calibrados contra lo que ya existe y no contra el aire: un
 * golpe a mano limpia es `8 + roll(8)` y una amenaza nace con 30 a 70 de vida
 * (`tick.ts`). O sea que:
 *
 *   · una brasa sola bien trazada (16) es un buen golpe, no una masacre;
 *   · `brasa vena` (26) es medio bicho de una;
 *   · `brasa aliento` (11 a todos) contra tres bichos son 33 repartidos, que es
 *     más total y menos por cabeza — la decisión de siempre y la única que
 *     importa;
 *   · y las tres runas del día en un solo trazo (`brasa vena brasa`, 39) matan
 *     casi cualquier cosa de una vez y te dejan sin magia hasta mañana.
 *
 * Eso último es el corazón del asunto: **acá no hay maná.** Las runas que
 * preparaste se gastan al trazarlas, así que la pregunta de todos los días es
 * si el problema de hoy merece las tres juntas.
 */
export const RUNAS: Record<string, Runa> = {
  'runa-de-brasa': {
    slug: 'runa-de-brasa', eje: 'intensidad',
    materia: 'el calor', genero: 'm',
    adjetivo: { m: 'encendido', f: 'encendida' },
    base: (e) => { e.danio = 16 },
    // Aviva lo que venía. Multiplica en vez de sumar, y no es un detalle: con
    // una suma fija, `brasa aliento brasa` (que reparte y después aviva) le
    // pegaba a todo el lugar más fuerte que `brasa vena brasa` a uno solo, o
    // sea que concentrar era estrictamente peor que repartir y el eje del
    // cuerpo no servía para nada. Multiplicando, el orden se respeta solo.
    opera: (e) => {
      if (e.danio === 0 && e.cura === 0) e.danio = 6
      else {
        e.danio = Math.round(e.danio * 1.5)
        if (e.cura > 0) {
          // Una cura caliente cauteriza: cierra más y duele. Es el ejemplo más
          // limpio de que acá las runas no se suman, se cruzan.
          e.cura = Math.round(e.cura * 1.4)
          e.danio = Math.max(e.danio, 5)
        }
      }
    },
  },
  'runa-de-quietud': {
    slug: 'runa-de-quietud', eje: 'tiempo',
    materia: 'la quietud', genero: 'f',
    adjetivo: { m: 'que queda', f: 'que queda' },
    base: (e) => { e.quieta = 1 },
    // Deja puesto lo que venía. Es el único eje que escribe en el futuro: todo
    // lo demás pasa y se termina.
    opera: (e) => { e.dura += 2; e.quieta += 1 },
  },
  'runa-de-aliento': {
    slug: 'runa-de-aliento', eje: 'alcance',
    materia: 'el aliento', genero: 'm',
    adjetivo: { m: 'repartido', f: 'repartida' },
    base: (e) => { e.empuja = true },
    // Reparte, y repartir cuesta: menos por cabeza. Sin ese precio, el aliento
    // sería la runa que siempre conviene poner y dejaríamos de tener cuatro
    // ejes para tener tres y un impuesto.
    opera: (e) => {
      e.alcance = 'lugar'
      e.soloVivo = false
      e.enCuerpo = false
      e.danio = Math.round(e.danio * 0.7)
      e.cura = Math.round(e.cura * 0.7)
    },
  },
  'runa-de-vena': {
    slug: 'runa-de-vena', eje: 'cuerpo',
    materia: 'la vena', genero: 'f',
    adjetivo: { m: 'metido en el cuerpo', f: 'metida en el cuerpo' },
    base: (e) => { e.cura = 16; e.soloVivo = true },
    // Lo mete adentro de uno solo: más fuerte, a uno, y sólo en lo vivo. Y lo
    // que dure queda en ese cuerpo y no en el suelo.
    opera: (e) => {
      e.alcance = 'uno'
      e.soloVivo = true
      e.enCuerpo = true
      e.danio = Math.round(e.danio * 1.6)
      e.cura = Math.round(e.cura * 1.6)
    },
  },
}

/** Cuántas entran. Está en el diseño con estas palabras: *"preparaste tres
 *  runas esta mañana y son esas tres"*. Con cuatro runas en el mundo, tres es
 *  el número que te obliga a resignar exactamente un eje — con dos no hay
 *  decisión, con cuatro no resignás nada. La cuarta sólo la da el frasco. */
export const CUANTAS_ENTRAN = 3

/** Lo que hace falta llevar para colgarse una runa de más. Lo fabrica el que
 *  destila, y es *la única forma de exceder tu capacidad* (§10.2). Que sea un
 *  objeto que hace OTRO es todo el punto: le da al destilador poder real sobre
 *  el que pelea sin que nadie farmee nada. */
export const FRASCO = 'frasco de raíz'

// ─────────────────────────────────────────────────────────────
// La gramática: de una secuencia de runas a un efecto
// ─────────────────────────────────────────────────────────────

export type Hechizo = { efecto: Efecto; nombre: string; ejes: string[] }

/**
 * La función central del sistema, y es pura: no toca la base, no tira dados, no
 * sabe quién la llamó. Una secuencia de runas entra, un hechizo sale, siempre
 * el mismo. Eso la hace testeable y la hace determinista, que es lo que el
 * invariante 1 le pide a todo lo que corre en la simulación.
 */
export function resolver(runas: string[]):
  | { ok: false; porque: string }
  | ({ ok: true } & Hechizo) {
  if (runas.length === 0) return { ok: false, porque: 'no trazó nada' }
  if (runas.length > CUANTAS_ENTRAN + 1) {
    return { ok: false, porque: 'nadie puede sostener tantos trazos a la vez' }
  }
  if (new Set(runas).size !== runas.length) {
    // No es una restricción de sistema: es que llevás la runa, no cargas de la
    // runa. Repetirla no significa nada.
    return { ok: false, porque: 'una runa se traza una vez' }
  }

  const piezas: Runa[] = []
  for (const slug of runas) {
    const r = RUNAS[slug]
    // Una runa que existe en `knowledge` y no está acá es saber que está y que
    // nadie sabe trazar. El diseño lo tiene contemplado (§12.3, la runa escrita
    // en lengua muerta) y por eso esto no es un error de programa: es una cosa
    // que puede pasar en el mundo y hay que contarla como tal.
    if (!r) return { ok: false, porque: `nadie sabe cómo se traza ${slug}` }
    piezas.push(r)
  }

  const materia = piezas[0]!
  const efecto = vacio()
  materia.base(efecto)
  for (const p of piezas.slice(1)) p.opera(efecto)

  return {
    ok: true, efecto,
    nombre: nombrar(piezas),
    ejes: piezas.map((p) => p.eje),
  }
}

/**
 * Cómo se llama lo que salió.
 *
 * Se ARMA, no se busca en una tabla. Es la misma decisión que el resto del
 * sistema: cuarenta nombres escritos a mano son un catálogo, y un catálogo se
 * puede publicar en una wiki. Esto no: "el calor repartido y que queda" se lee
 * como una descripción de lo que viste, no como el nombre de un ítem.
 */
function nombrar(piezas: Runa[]): string {
  const materia = piezas[0]!
  const resto = piezas.slice(1).map((p) => p.adjetivo[materia.genero])
  if (resto.length === 0) return materia.materia
  if (resto.length === 1) return `${materia.materia} ${resto[0]}`
  return `${materia.materia} ${resto.join(' y ')}`
}

/** Cuánto de la runa te sale. Nunca más del 100%: el techo es el hechizo, no
 *  vos. Ver el encabezado — es la diferencia entre "más respuestas" y "más
 *  daño", que es la que ordena todo el combate del juego. */
function rendimiento(destreza: number): number {
  return 0.55 + 0.45 * Math.min(100, Math.max(0, destreza)) / 100
}

/**
 * Cuánto sube la destreza esta vez.
 *
 * **Es la misma curva que `tick.ts`, copiada a propósito y no por descuido.**
 * Importarla sería un ciclo (`tick.ts` importa este archivo) y moverla a un
 * tercer módulo por una línea es peor que esta nota. Rinde decreciente para que
 * practicar no sea una barra de progreso, o sea grindeo: 0 → 45 en cinco
 * prácticas y de ahí en adelante casi no se mueve.
 */
function mejora(destreza: number): number {
  return Math.max(1, Math.round((100 - destreza) * 0.11))
}

// ─────────────────────────────────────────────────────────────
// Preparar: el acto de la mañana
// ─────────────────────────────────────────────────────────────

export type Colgada = { slug: string; nombre: string; destreza: number; por_frasco: boolean }
export type Preparado =
  | { ok: false; porque: string }
  | { ok: true; runas: Colgada[]; con_frasco: boolean; cuenta: string }

/**
 * Colgarse las runas del día.
 *
 * Las tres reglas que hacen que esto sea una limitación del mundo y no una
 * grilla de casilleros (§8.3, y ahí está escrito que la diferencia importa):
 *
 *   · **Entran tres**, y la cuarta sólo si trajiste el frasco. No trajiste el
 *     frasco, no lo tenés.
 *   · **Una vez por día del valle.** Cambiar de runas cuesta un día. Eso es lo
 *     que hace que elegir duela sin inventar un temporizador ni cobrarte tiempo
 *     de juego: el día pasa igual, juegues o no.
 *   · **Sólo lo que sabés.** El techo no está en cuántas conocés —eso no tiene
 *     techo— está en cuántas te entran hoy.
 */
export async function preparar(args: {
  regionId: string
  tick: number
  player: { id: string; name: string; place_id: string | null }
  quien?: 'player' | 'person'
  /** Los slugs, en el orden en que se las cuelga. */
  runas: string[]
  ev?: (e: EventoMundo) => void | Promise<void>
}): Promise<Preparado> {
  const { regionId, tick, player, runas } = args
  const quien = args.quien ?? 'player'

  if (runas.length === 0) return { ok: false, porque: 'no eligió ninguna runa' }
  if (new Set(runas).size !== runas.length) {
    return { ok: false, porque: 'una runa se lleva una sola vez' }
  }
  if (runas.length > CUANTAS_ENTRAN + 1) {
    return { ok: false, porque: `no le entran más de ${CUANTAS_ENTRAN + 1}, ni con frasco` }
  }

  // ¿Sabe cada una? El saber es la puerta (§8.4): sin que alguien te la haya
  // enseñado no hay nada que colgarse. Se lee de `knows`, que es el mismo
  // sistema de los oficios y no uno paralelo.
  const suyas = (await db
    .from('knows')
    .select('id, destreza, knowledge:knowledge_id (id, slug, name, kind)')
    .eq('holder_kind', quien).eq('holder_id', player.id)).data ?? []
  type Fila = { id: string; destreza: number; knowledge: { id: string; slug: string; name: string; kind: string } | null }
  const porSlug = new Map<string, Fila>()
  for (const f of suyas as unknown as Fila[]) {
    if (f.knowledge?.kind === 'magia') porSlug.set(f.knowledge.slug, f)
  }
  const elegidas: Fila[] = []
  for (const slug of runas) {
    const f = porSlug.get(slug)
    if (!f) return { ok: false, porque: `no sabe ${RUNAS[slug]?.materia ?? slug}` }
    elegidas.push(f)
  }

  // El frasco. Se consume al colgar la cuarta, no al trazarla: lo que el frasco
  // sostiene es la atadura de más, y la sostiene desde que salís de tu casa.
  //
  // Se pregunta ANTES que "¿ya preparaste hoy?" a propósito: si el orden fuera
  // el otro, al que se le ocurre colgarse una cuarta se le contesta "eso lo
  // cambiás mañana" y nunca se entera de que le faltaba un frasco. La razón más
  // específica gana, siempre — es lo mismo que hace la negativa de `aprender`
  // diciéndote en qué escalón estás en vez de un "no" pelado.
  let frasco: { id: string; made_by: string | null } | null = null
  if (runas.length > CUANTAS_ENTRAN) {
    const { data } = await db.from('objects')
      .select('id, made_by').eq('region_id', regionId)
      .eq('holder_kind', quien).eq('holder_id', player.id)
      .eq('kind', FRASCO).limit(1).maybeSingle()
    if (!data) {
      return { ok: false, porque: `sin ${FRASCO} no le entra una cuarta` }
    }
    frasco = data
  }

  // Ya preparó hoy. `prepared_tick` es el día en curso, que es el que le pasa
  // quien llama (`region.tick + 1`, igual que el golpe).
  const yaHay = (await db
    .from('preparadas').select('id, prepared_tick')
    .eq('holder_kind', quien).eq('holder_id', player.id)).data ?? []
  const ultima = Math.max(-1, ...yaHay.map((p) => p.prepared_tick))
  if (yaHay.length > 0 && ultima >= tick) {
    return { ok: false, porque: 'ya se colgó las runas de hoy; mañana se cambian' }
  }

  await db.from('preparadas')
    .delete().eq('holder_kind', quien).eq('holder_id', player.id)
  const filas = elegidas.map((f, i) => ({
    holder_kind: quien, holder_id: player.id,
    knowledge_id: f.knowledge!.id,
    orden: i + 1,
    por_frasco: i + 1 > CUANTAS_ENTRAN,
    prepared_tick: tick,
  }))
  const { error } = await db.from('preparadas').insert(filas)
  if (error) return { ok: false, porque: error.message }
  if (frasco) await db.from('objects').delete().eq('id', frasco.id)

  const colgadas: Colgada[] = elegidas.map((f, i) => ({
    slug: f.knowledge!.slug,
    nombre: f.knowledge!.name,
    destreza: f.destreza,
    por_frasco: i + 1 > CUANTAS_ENTRAN,
  }))
  const cuenta = `${player.name} salió con ${yLista(colgadas.map((c) => RUNAS[c.slug]?.materia ?? c.nombre))} encima`
    + (frasco ? `, y con el ${FRASCO}${frasco.made_by ? ` de ${frasco.made_by}` : ''} para sostener la última.` : '.')

  // Se cuenta, y se cuenta una sola vez por día porque preparar es una vez por
  // día. Es de las cosas más Frieren que puede escribir este mundo —alguien
  // eligiendo qué se lleva antes de salir— y además hace visible lo único que
  // el sistema mantiene oculto: qué está cargando cada uno.
  const evento: EventoMundo = {
    kind: 'preparacion', place_id: player.place_id,
    summary: cuenta,
    detail: {
      [quien === 'player' ? 'player' : 'npc']: player.name,
      runas: colgadas.map((c) => c.nombre),
      frasco: !!frasco,
    },
  }
  if (args.ev) await args.ev(evento)
  else await db.from('events').insert({ region_id: regionId, tick, ...evento })

  if (quien === 'player') {
    await db.from('actions').insert({
      player_id: player.id, verb: 'preparar',
      target: runas.join(' '), submitted_tick: tick,
      resolved_tick: tick, outcome: cuenta,
    })
  }

  return { ok: true, runas: colgadas, con_frasco: !!frasco, cuenta }
}

/** Qué lleva encima ahora mismo. Lo pide el cliente para dibujar la mano. */
export async function loQueLleva(
  holder: { kind: 'player' | 'person'; id: string },
): Promise<Colgada[]> {
  const filas = (await db.from('preparadas')
    .select('orden, por_frasco, knowledge:knowledge_id (slug, name)')
    .eq('holder_kind', holder.kind).eq('holder_id', holder.id)
    .order('orden')).data ?? []
  type F = { orden: number; por_frasco: boolean; knowledge: { slug: string; name: string } | null }
  const destrezas = new Map<string, number>()
  for (const k of (await db.from('knows')
    .select('destreza, knowledge:knowledge_id (slug)')
    .eq('holder_kind', holder.kind).eq('holder_id', holder.id)).data ?? []) {
    const kk = k as unknown as { destreza: number; knowledge: { slug: string } | null }
    if (kk.knowledge) destrezas.set(kk.knowledge.slug, kk.destreza)
  }
  return (filas as unknown as F[])
    .filter((f) => !!f.knowledge)
    .map((f) => ({
      slug: f.knowledge!.slug, nombre: f.knowledge!.name,
      destreza: destrezas.get(f.knowledge!.slug) ?? 0,
      por_frasco: f.por_frasco,
    }))
}

// ─────────────────────────────────────────────────────────────
// Lanzar: el trazo
// ─────────────────────────────────────────────────────────────

/**
 * A qué le apuntás. **El cauce no es una runa y eso es una decisión, no una
 * omisión**: en Magicka el elemento dice qué es el hechizo y el botón del mouse
 * dice adónde va. Si el blanco fuera una runa más, cada hechizo te costaría una
 * pieza de las tres que llevás sólo para decir "a ése", y el vocabulario chico
 * se comería a sí mismo.
 *
 * Del lado del cliente esto es el gesto: soltás el trazo sobre el bicho, sobre
 * una persona, sobre vos o sobre el suelo. Cuatro cauces gratis × 40 hechizos.
 */
export type Blanco = {
  tipo: 'amenaza' | 'persona' | 'jugador' | 'lugar'
  /** El uuid. Si no viene: la primera amenaza viva donde estás parado, vos
   *  mismo si es 'jugador', o el lugar donde estás si es 'lugar'. */
  id?: string | null
}

export type Lanzado =
  | { ok: false; porque: string }
  | {
      ok: true
      nombre: string
      runas: string[]
      /** Primera vez que a este jugador le sale esta mezcla. El cliente lo usa
       *  para el momento: una mezcla nueva se anota en el grimorio. */
      nueva: boolean
      danio: number
      cura: number
      /** Lo que cayó. Nombres, no ids: es lo que se muestra y lo que se narra. */
      muertas: string[]
      alcanzados: string[]
      /** Qué quedó puesto, si quedó algo. */
      marca: string | null
      /** La destreza de la materia después de practicarla. */
      destreza: number
      /** Lo que le queda colgado para hoy. */
      quedan: string[]
      cuenta: string
    }

export async function lanzar(args: {
  regionId: string
  tick: number
  player: { id: string; name: string; place_id: string | null }
  quien?: 'player' | 'person'
  /** Los slugs, EN ORDEN. El orden es la mezcla. */
  runas: string[]
  blanco: Blanco
  /** Sumidero de eventos, igual que en `pelear()`: el tick los junta y los
   *  inserta al final; la web no tiene ese final y escribe en el momento. */
  ev?: (e: EventoMundo) => void | Promise<void>
  /** Cruzar un escalón de confianza. Mismo contrato que `pelear()`. */
  avisarVinculo?: (
    testigo: { id: string; name: string; place_id: string | null },
    antes: number, ahora: number,
  ) => void | Promise<void>
  /** Qué hacer con los testigos cuando el que trazó fue un NPC. `recordar()` y
   *  `tocarVinculo()` escriben hacia un JUGADOR; el par NPC↔NPC lo sabe escribir
   *  `tick.ts` y no este archivo. */
  alVerNpc?: (
    testigo: { id: string; name: string; place_id: string | null },
    npc: { id: string; name: string }, que: string,
  ) => void | Promise<void>
}): Promise<Lanzado> {
  const { regionId, tick, player, blanco } = args
  const quien = args.quien ?? 'player'
  const suNombre = quien === 'player' ? 'player' : 'npc'

  const hechizo = resolver(args.runas)
  if (!hechizo.ok) return { ok: false, porque: hechizo.porque }
  const { efecto, nombre } = hechizo

  // El caído no traza. Es la misma regla que "al caído no se le pega": mientras
  // estás en el piso no pasa nada tuyo hasta que te levantes.
  if (quien === 'player') {
    const { data: estado } = await db.from('players')
      .select('health, downed_at_tick').eq('id', player.id).maybeSingle()
    if (!estado) return { ok: false, porque: 'no existe' }
    if (estado.downed_at_tick !== null || estado.health <= 0) {
      return { ok: false, porque: 'está en el piso; primero hay que levantarse' }
    }
  }

  // ¿Las lleva encima? Acá está la regla 2 del diseño mordiendo: podés saber
  // las cuatro y estar cargando dos. Saber no es llevar.
  const colgadas = await loQueLleva({ kind: quien, id: player.id })
  const lleva = new Set(colgadas.map((c) => c.slug))
  for (const slug of args.runas) {
    if (!lleva.has(slug)) {
      const r = RUNAS[slug]
      return { ok: false, porque: `hoy no trae ${r?.materia ?? slug} encima` }
    }
  }

  // Lo que ya estaba ardiendo cobra antes de que pase nada nuevo. Es
  // idempotente por día (ver `cobrarMarcas`), así que da igual cuántas veces se
  // llame ni desde dónde.
  if (player.place_id) {
    await cobrarMarcas({ regionId, tick, placeId: player.place_id, ev: args.ev })
  }

  const lugares = (await db.from('places')
    .select('id, name, slug, kind').eq('region_id', regionId)).data ?? []
  const nombreLugar = (id: string | null | undefined) =>
    lugares.find((l) => l.id === id)?.name ?? null

  const destrezaMateria = colgadas.find((c) => c.slug === args.runas[0])?.destreza ?? 0
  const r = rendimiento(destrezaMateria)
  const danio = Math.round(efecto.danio * r)
  const cura = Math.round(efecto.cura * r)
  const dura = efecto.dura > 0 ? Math.max(1, Math.round(efecto.dura * r)) : 0
  const quieta = efecto.quieta > 0 ? Math.max(1, Math.round(efecto.quieta * r)) : 0

  const muertas: string[] = []
  const alcanzados: string[] = []
  let marca: string | null = null
  let dondePaso: string | null = player.place_id ?? null
  let queHizo = ''

  /** Dónde termina lo que se empuja. Lo saca de donde está; adónde va no lo
   *  elige el que traza, y eso está bien: el aliento no es un teletransporte
   *  dirigido, es un empujón. */
  const afuera = (desde: string | null): string | null => {
    const otros = lugares.filter((l) => l.id !== desde)
    return pick(otros)?.id ?? null
  }

  /** Una marca que queda. Sale de la secuencia, nunca se elige: si lo que
   *  quedaba puesto pegaba es ardor, si curaba es vigor, si frenaba es quietud. */
  const dejarMarca = async (
    sobre_kind: 'place' | 'threat' | 'person' | 'player',
    sobre_id: string, place_id: string | null, comoSeLlama: string,
    /** Cuántos días. Por defecto los de la runa de quietud como operador; la
     *  quietud sobre un cuerpo dura lo suyo, que es otra cuenta. */
    dias = dura,
  ): Promise<string> => {
    const kind: 'ardor' | 'vigor' | 'quietud' =
      danio > 0 ? 'ardor' : cura > 0 ? 'vigor' : 'quietud'
    const magnitud = kind === 'ardor' ? Math.max(1, Math.round(danio / 2))
      : kind === 'vigor' ? Math.max(1, Math.round(cura / 2)) : 0
    await db.from('encantamientos').insert({
      region_id: regionId, kind, sobre_kind, sobre_id, place_id,
      magnitud, desde_tick: tick, hasta_tick: tick + dias,
      por: player.name, runas: args.runas,
      // Ya cobró hoy: el efecto inmediato de arriba ES el cobro de este día. Sin
      // esto, la marca pega dos veces el día que se traza.
      ultimo_cobro_tick: tick,
    })
    return `${comoSeLlama} (${dias} ${dias === 1 ? 'día' : 'días'})`
  }

  // ── El cauce ────────────────────────────────────────────────
  //
  // Cada rama hace lo mismo con distinta materia: junta a quién le toca, le
  // aplica los números, y anota qué pasó. Lo que cambia entre ramas es qué es
  // capaz de recibir cada cosa — una piedra no se cura, un bicho no se acuerda
  // de vos, una persona no tiene barra de vida.

  if (blanco.tipo === 'amenaza') {
    // Sin id y sin lugar hay que cortar ANTES de la consulta: mandarle '' a una
    // columna uuid no devuelve vacío, revienta. Misma trampa que en `pelear()`.
    if (!blanco.id && !player.place_id) {
      return { ok: false, porque: 'no hay nada a lo que apuntarle acá' }
    }
    let q = db.from('threats')
      .select('id, kind, health, max_health, place_id')
      .eq('region_id', regionId).eq('alive', true)
    q = blanco.id ? q.eq('id', blanco.id) : q.eq('place_id', player.place_id!)
    const { data: bicho } = await q.limit(1).maybeSingle()
    if (!bicho) return { ok: false, porque: 'no hay nada a lo que apuntarle acá' }

    dondePaso = bicho.place_id
    const objetivos = efecto.alcance === 'lugar'
      ? (await db.from('threats')
        .select('id, kind, health, max_health, place_id')
        .eq('region_id', regionId).eq('alive', true)
        .eq('place_id', bicho.place_id)).data ?? [bicho]
      : [bicho]

    for (const t of objetivos) {
      alcanzados.push(t.kind)
      let vida = t.health
      if (danio > 0) vida = Math.max(0, vida - danio)
      // Curar a un bicho es exactamente lo que parece: le cerrás las heridas al
      // que te está mordiendo. No hay una validación que te lo impida porque el
      // sistema no opina; apuntar mal es una forma legítima de aprender la
      // gramática.
      if (cura > 0) vida = Math.min(t.max_health, vida + cura)

      if (vida <= 0) {
        await db.from('threats').update({
          alive: false, health: 0, killed_by: player.name, killed_tick: tick,
        }).eq('id', t.id)
        muertas.push(t.kind)
        // El MISMO `kind` de evento que el golpe, a propósito: para el valle no
        // hay dos maneras de que algo se muera, y todo lo que ya lee
        // `amenaza_muerta` —el director, las agendas, el chusmerío— tiene que
        // ver esto sin enterarse de que fue magia. El `detail` lo dice.
        await emitir(args, regionId, tick, {
          kind: 'amenaza_muerta', place_id: t.place_id,
          summary: `${player.name} mató a ${t.kind} con ${nombre}.`,
          detail: { [suNombre]: player.name, threat: t.kind, weapon: null, runas: args.runas, hechizo: nombre },
        })
      } else {
        await db.from('threats').update({ health: vida }).eq('id', t.id)
        if (quieta > 0) {
          await db.from('encantamientos').insert({
            region_id: regionId, kind: 'quietud', sobre_kind: 'threat',
            sobre_id: t.id, place_id: t.place_id, magnitud: 0,
            desde_tick: tick, hasta_tick: tick + quieta,
            por: player.name, runas: args.runas, ultimo_cobro_tick: tick,
          })
        }
        if (efecto.empuja) {
          const destino = afuera(t.place_id)
          if (destino) await db.from('threats').update({ place_id: destino }).eq('id', t.id)
        }
      }
    }

    if (dura > 0) {
      marca = (efecto.enCuerpo && objetivos[0])
        ? await dejarMarca('threat', objetivos[0].id, objetivos[0].place_id, `${nombre} en ${objetivos[0].kind}`)
        : await dejarMarca('place', bicho.place_id, bicho.place_id, `${nombre} en ${nombreLugar(bicho.place_id)}`)
    }

    queHizo = muertas.length > 0
      ? `mató a ${yLista(muertas)}`
      : danio > 0 ? `le entró a ${yLista(alcanzados)}`
        : quieta > 0 ? `dejó quieto a ${yLista(alcanzados)}`
          : efecto.empuja ? `sacó de ahí a ${yLista(alcanzados)}`
            : cura > 0 ? `le cerró las heridas a ${yLista(alcanzados)}`
              : 'no le hizo nada'

  } else if (blanco.tipo === 'lugar') {
    // Contra la piedra. Es el cauce que hace que la magia le pase a un LUGAR y
    // no a una cosa, y es el único que produce cicatriz sin que haya nadie.
    if (efecto.soloVivo) {
      return { ok: false, porque: 'el trazo no agarra la piedra: eso va en un cuerpo' }
    }
    const lugarId = blanco.id ?? player.place_id
    if (!lugarId) return { ok: false, porque: 'no hay lugar al que apuntarle' }
    const lugar = lugares.find((l) => l.id === lugarId)
    if (!lugar) return { ok: false, porque: 'ese lugar no existe' }
    dondePaso = lugar.id

    // Lo que pase ahora, pasa a lo que hay adentro. Sólo a las amenazas: a la
    // gente hay que APUNTARLE. Un fuego repartido que lastima jugadores por
    // estar parados al lado abriría PvP por la puerta de atrás, y el PvP es
    // opcional por diseño — el que quiera pegarle a alguien tiene el cauce de
    // persona y va a quedar claro que lo hizo a propósito.
    if (efecto.alcance === 'lugar' && (danio > 0 || quieta > 0 || efecto.empuja)) {
      const bichos = (await db.from('threats')
        .select('id, kind, health, max_health, place_id')
        .eq('region_id', regionId).eq('alive', true).eq('place_id', lugar.id)).data ?? []
      for (const t of bichos) {
        alcanzados.push(t.kind)
        const vida = Math.max(0, t.health - danio)
        if (vida <= 0 && danio > 0) {
          await db.from('threats').update({
            alive: false, health: 0, killed_by: player.name, killed_tick: tick,
          }).eq('id', t.id)
          muertas.push(t.kind)
          await emitir(args, regionId, tick, {
            kind: 'amenaza_muerta', place_id: t.place_id,
            summary: `${player.name} mató a ${t.kind} con ${nombre}.`,
            detail: { [suNombre]: player.name, threat: t.kind, weapon: null, runas: args.runas, hechizo: nombre },
          })
        } else {
          if (danio > 0) await db.from('threats').update({ health: vida }).eq('id', t.id)
          if (quieta > 0) {
            await db.from('encantamientos').insert({
              region_id: regionId, kind: 'quietud', sobre_kind: 'threat',
              sobre_id: t.id, place_id: t.place_id, magnitud: 0,
              desde_tick: tick, hasta_tick: tick + quieta,
              por: player.name, runas: args.runas, ultimo_cobro_tick: tick,
            })
          }
          if (efecto.empuja) {
            const destino = afuera(t.place_id)
            if (destino) await db.from('threats').update({ place_id: destino }).eq('id', t.id)
          }
        }
      }
    }

    if (dura > 0) marca = await dejarMarca('place', lugar.id, lugar.id, `${nombre} en ${lugar.name}`)

    queHizo = marca
      ? `dejó ${nombre} en ${lugar.name}`
      : muertas.length > 0 ? `mató a ${yLista(muertas)} en ${lugar.name}`
        : alcanzados.length > 0 ? `le entró a ${yLista(alcanzados)} en ${lugar.name}`
          : `trazó en el aire y no agarró nada`
    // El trazo que no agarra nada no gasta runas. No es piedad: es que el
    // personaje sabe más que el jugador nuevo y no va a quemar su día del valle
    // por un clic en el pasto.
    if (!marca && muertas.length === 0 && alcanzados.length === 0) {
      return { ok: false, porque: `${nombre} no tiene de dónde agarrarse en ${lugar.name}` }
    }

  } else {
    // Sobre gente. Dos tablas distintas y dos verdades distintas: un jugador
    // tiene vida y se la podés mover; un NPC no la tiene, y lo que le pasa de
    // verdad es que se acuerda. Las dos cosas son estado del mundo.
    const esJugador = blanco.tipo === 'jugador'
    if (esJugador) {
      const id = blanco.id ?? player.id
      const { data: otro } = await db.from('players')
        .select('id, name, place_id, health, downed_at_tick')
        .eq('region_id', regionId).eq('id', id).maybeSingle()
      if (!otro) return { ok: false, porque: 'no hay ningún jugador ahí' }
      dondePaso = otro.place_id
      alcanzados.push(otro.name)

      let vida = otro.health
      if (cura > 0) vida = Math.min(100, vida + cura)
      if (danio > 0) vida = Math.max(0, vida - danio)
      const caido = vida === 0
      await db.from('players').update({
        health: vida,
        // Curar a alguien que está en el piso lo LEVANTA, y ésa es la razón por
        // la que la vena existe: es el único verbo del juego con el que alguien
        // te saca de donde te dejaron.
        ...(cura > 0 && vida > 0 ? { downed_at_tick: null } : {}),
        ...(caido ? { downed_at_tick: tick } : {}),
      }).eq('id', otro.id)

      if (efecto.empuja) {
        const destino = afuera(otro.place_id)
        if (destino) await db.from('players').update({ place_id: destino }).eq('id', otro.id)
      }
      if (dura > 0) marca = await dejarMarca('player', otro.id, otro.place_id, `${nombre} en ${otro.name}`)
      queHizo = cura > 0
        ? `le cerró las heridas a ${otro.name}${caido ? '' : ` (${vida})`}`
        : danio > 0 ? `le entró a ${otro.name}${caido ? ', y lo tumbó' : ''}`
          : efecto.empuja ? `sacó de ahí a ${otro.name}`
            : `dejó ${nombre} en ${otro.name}`

    } else {
      const id = blanco.id ?? ''
      let q = db.from('people')
        .select('id, name, place_id').eq('region_id', regionId).eq('alive', true)
      // Se acepta el nombre además del uuid: la línea de comandos y el chat
      // escriben nombres, el cliente 3D manda ids.
      q = esUuid(id) ? q.eq('id', id) : q.ilike('name', `%${id}%`)
      const { data: persona } = await q.limit(1).maybeSingle()
      if (!persona) return { ok: false, porque: 'no hay nadie ahí' }
      dondePaso = persona.place_id
      alcanzados.push(persona.name)

      if (efecto.empuja) {
        const destino = afuera(persona.place_id)
        if (destino) await db.from('people').update({ place_id: destino }).eq('id', persona.id)
      }
      if (quieta > 0 || (dura > 0 && efecto.enCuerpo)) {
        marca = await dejarMarca(
          'person', persona.id, persona.place_id, `${nombre} en ${persona.name}`,
          Math.max(dura, quieta))
      } else if (dura > 0 && persona.place_id) {
        marca = await dejarMarca('place', persona.place_id, persona.place_id, `${nombre} en ${nombreLugar(persona.place_id)}`)
      }

      // Lo que de verdad le pasa a una persona. No hay barra de vida de NPC en
      // este juego y no la vamos a inventar por la magia: lo que cambia es lo
      // que esa persona piensa de vos, que acá vale más que una barra. Curar a
      // alguien delante de todos y quemarlo delante de todos son las dos cosas
      // más caras que podés hacer socialmente, y las dos se pagan en los dos
      // ejes de siempre (§9.3): te valoran, te temen.
      if (quien === 'player') {
        if (cura > 0) {
          await recordar(persona.id, player, `${player.name} le cerró las heridas a ${persona.name} con magia`, tick)
          const movio = await tocarVinculo(persona, player, { valued: 18, feared: 4 })
          if (args.avisarVinculo) await args.avisarVinculo(persona, movio.antes, movio.ahora)
        } else if (danio > 0) {
          await recordar(persona.id, player, `${player.name} le tiró ${nombre} a ${persona.name}`, tick)
          await tocarVinculo(persona, player, { valued: -25, feared: 20 })
        } else {
          await recordar(persona.id, player, `${player.name} trazó ${nombre} sobre ${persona.name}`, tick)
          const movio = await tocarVinculo(persona, player, { valued: 4, feared: 8 })
          if (args.avisarVinculo) await args.avisarVinculo(persona, movio.antes, movio.ahora)
        }
      } else if (args.alVerNpc) {
        await args.alVerNpc(persona, player, nombre)
      }

      queHizo = cura > 0 ? `le cerró las heridas a ${persona.name}`
        : danio > 0 ? `le tiró ${nombre} a ${persona.name}`
          : efecto.empuja ? `sacó de ahí a ${persona.name}`
            : `trazó ${nombre} sobre ${persona.name}`
    }
  }

  // ── Lo que cuesta y lo que deja ─────────────────────────────

  // Las runas usadas se gastan. Acá está la decisión del día hecha código: las
  // tres juntas en un trazo grande, o tres trazos chicos.
  const usadas = (await db.from('preparadas')
    .select('id, knowledge:knowledge_id (slug)')
    .eq('holder_kind', quien).eq('holder_id', player.id)).data ?? []
  type P = { id: string; knowledge: { slug: string } | null }
  const aBorrar = (usadas as unknown as P[])
    .filter((p) => p.knowledge && args.runas.includes(p.knowledge.slug))
    .map((p) => p.id)
  if (aBorrar.length > 0) await db.from('preparadas').delete().in('id', aBorrar)

  // Practicar. La materia practica entero y las que van detrás, la mitad: la
  // mano que se hace es la del trazo que sostiene el hechizo. Sin esto, un trío
  // entrenaría tres veces más rápido que un trazo simple y la forma más rápida
  // de mejorar sería tirar la mezcla más cara todos los días — o sea grindeo,
  // que es lo que la curva con rendimientos decrecientes existe para evitar.
  let destrezaFinal = destrezaMateria
  const suyas = (await db.from('knows')
    .select('id, destreza, veces, knowledge:knowledge_id (slug)')
    .eq('holder_kind', quien).eq('holder_id', player.id)).data ?? []
  type K = { id: string; destreza: number; veces: number; knowledge: { slug: string } | null }
  for (const k of suyas as unknown as K[]) {
    if (!k.knowledge) continue
    const i = args.runas.indexOf(k.knowledge.slug)
    if (i < 0) continue
    const sube = i === 0 ? mejora(k.destreza) : Math.max(1, Math.round(mejora(k.destreza) / 2))
    const ahora = Math.min(100, k.destreza + sube)
    await db.from('knows').update({ destreza: ahora, veces: k.veces + 1 }).eq('id', k.id)
    if (i === 0) destrezaFinal = ahora
  }

  // El grimorio. Sólo del jugador y sólo lo que le salió a él.
  let nueva = false
  if (quien === 'player') nueva = await anotarEnElGrimorio(player.id, args.runas, nombre, tick)

  // El sujeto se nombra y va primero, y la consecuencia va colgada de la misma
  // oración. Es la lección cara de `combate.ts`: «..., y sigue en pie» no
  // decía quién seguía en pie, el director eligió la lectura más dramática y
  // salió una crónica que se contradecía sola. Un summary que se puede leer de
  // dos maneras es un bug de la simulación, no del narrador.
  const lugarNombre = nombreLugar(dondePaso)
  const cuenta =
    `${player.name} trazó ${nombre}${lugarNombre ? ` en ${lugarNombre}` : ''}, y ${queHizo}.`

  // Un evento por trazo, no uno por cosa alcanzada: el director recibe la
  // noticia una vez. Los muertos ya salieron con su propio `amenaza_muerta`
  // arriba, que es el mismo que produce el golpe.
  await emitir(args, regionId, tick, {
    kind: 'magia', place_id: dondePaso,
    summary: cuenta + (nueva ? ` Era la primera vez que le salía.` : ''),
    detail: {
      [suNombre]: player.name, hechizo: nombre, runas: args.runas,
      danio, cura, muertas, alcanzados, marca, nueva,
    },
  })

  // Lo ven, y ver magia no es lo mismo que ver una pelea. El que traza queda
  // marcado: **se te nota encima** (§8.6), y en un mundo donde los NPCs
  // recuerdan, eso tiene consecuencias sociales. Sube el miedo más que el
  // aprecio, que es exactamente lo que le pasa a alguien que hace algo que los
  // demás no entienden.
  if (dondePaso) {
    const testigos = (await db.from('people')
      .select('id, name, place_id').eq('region_id', regionId).eq('alive', true)
      .eq('place_id', dondePaso)).data ?? []
    for (const t of testigos) {
      if (t.id === player.id) continue
      if (alcanzados.includes(t.name)) continue   // al que le tocó ya se le anotó arriba
      if (quien === 'person') {
        if (args.alVerNpc) await args.alVerNpc(t, player, nombre)
        continue
      }
      await recordar(t.id, player, `${player.name} trazó ${nombre} acá`, tick)
      const movio = await tocarVinculo(t, player, { valued: 5, feared: 10 })
      if (args.avisarVinculo) await args.avisarVinculo(t, movio.antes, movio.ahora)
    }
  }

  if (quien === 'player') {
    await db.from('actions').insert({
      player_id: player.id, verb: 'lanzar',
      target: args.runas.join(' '), submitted_tick: tick,
      resolved_tick: tick, outcome: queHizo,
    })
  }

  return {
    ok: true, nombre, runas: args.runas, nueva, danio, cura, muertas, alcanzados,
    marca, destreza: destrezaFinal,
    quedan: colgadas.filter((c) => !args.runas.includes(c.slug)).map((c) => c.slug),
    cuenta,
  }
}

// ─────────────────────────────────────────────────────────────
// Lo que quedó puesto
// ─────────────────────────────────────────────────────────────

/**
 * ¿Está quieta?
 *
 * Lo tiene que preguntar todo el que la haga actuar: la pasada de las mordidas
 * del tick y `POST /danio`. Vive acá y no en una columna de `threats` porque la
 * quietud es una marca con fecha de vencimiento y no un estado del bicho — el
 * bicho no cambió, le pasa algo.
 */
export async function estaQuieta(sobreId: string, tick: number): Promise<boolean> {
  const { data } = await db.from('encantamientos')
    .select('id').eq('kind', 'quietud').eq('sobre_id', sobreId)
    .gte('hasta_tick', tick).limit(1).maybeSingle()
  return !!data
}

/** Las marcas vivas, para que el cliente las dibuje y el director sepa que un
 *  lugar del valle está ardiendo. */
export async function marcasDe(regionId: string, tick: number) {
  const { data } = await db.from('encantamientos')
    .select('id, kind, sobre_kind, sobre_id, place_id, magnitud, hasta_tick, por, runas')
    .eq('region_id', regionId).gte('hasta_tick', tick)
  return data ?? []
}

/**
 * Cobrar lo que quedó puesto. Un día de mundo de una marca.
 *
 * **Es idempotente por día y ésa es toda la gracia**: la pueden llamar el tick,
 * un hechizo nuevo en el mismo lugar y el cliente al pisar, y el lugar arde una
 * vez por día igual. Sin `ultimo_cobro_tick` esto sería una lotería de cuántas
 * veces llamó cada camino, que es exactamente la clase de bug que no se ve.
 *
 * Y arde para todos, incluido el que la prendió. Una marca no sabe quién sos.
 */
export async function cobrarMarcas(args: {
  regionId: string
  tick: number
  /** Sólo las de un lugar. Sin esto, todas las de la región. */
  placeId?: string | null
  ev?: (e: EventoMundo) => void | Promise<void>
}): Promise<{ cobradas: number; danio: number; cura: number }> {
  const { regionId, tick } = args
  let q = db.from('encantamientos')
    .select('id, kind, sobre_kind, sobre_id, place_id, magnitud, hasta_tick, por, ultimo_cobro_tick')
    .eq('region_id', regionId).eq('sobre_kind', 'place').gte('hasta_tick', tick)
    .in('kind', ['ardor', 'vigor'])
  if (args.placeId) q = q.eq('place_id', args.placeId)
  const marcas = (await q).data ?? []

  let cobradas = 0, danio = 0, cura = 0
  for (const m of marcas) {
    if (m.ultimo_cobro_tick !== null && m.ultimo_cobro_tick >= tick) continue
    await db.from('encantamientos').update({ ultimo_cobro_tick: tick }).eq('id', m.id)
    cobradas++
    if (!m.place_id) continue

    const { data: lugar } = await db.from('places')
      .select('name').eq('id', m.place_id).maybeSingle()

    if (m.kind === 'ardor') {
      const bichos = (await db.from('threats')
        .select('id, kind, health, place_id').eq('region_id', regionId)
        .eq('alive', true).eq('place_id', m.place_id)).data ?? []
      const cayeron: string[] = []
      for (const t of bichos) {
        const vida = Math.max(0, t.health - m.magnitud)
        danio += m.magnitud
        if (vida <= 0) {
          await db.from('threats').update({
            alive: false, health: 0, killed_by: m.por, killed_tick: tick,
          }).eq('id', t.id)
          cayeron.push(t.kind)
        } else {
          await db.from('threats').update({ health: vida }).eq('id', t.id)
        }
      }
      // El que dejó la marca sigue matando cosas después de haberse ido, y
      // puede seguir haciéndolo después de haberse muerto. Por eso `por` guarda
      // el nombre: "lo mató la marca que dejó Ren" es una frase que este juego
      // tiene que poder escribir.
      for (const k of cayeron) {
        await emitir(args, regionId, tick, {
          kind: 'amenaza_muerta', place_id: m.place_id,
          summary: `${k} cayó en ${lugar?.name ?? 'el valle'}, quemado por la marca que dejó ${m.por}.`,
          detail: { threat: k, marca: 'ardor', por: m.por, weapon: null },
        })
      }
      if (bichos.length > 0 && cayeron.length === 0) {
        await emitir(args, regionId, tick, {
          kind: 'marca', place_id: m.place_id,
          summary: `${lugar?.name ?? 'El valle'} sigue ardiendo por la marca que dejó ${m.por}.`,
          detail: { place: lugar?.name, marca: 'ardor', por: m.por, alcanzados: bichos.map((b) => b.kind) },
        })
      }
    } else {
      // Vigor: el lugar cierra heridas. Es la marca que le sirve al que no
      // pelea — dejar el vado curado tres días es una forma de defender un
      // pueblo sin pegarle a nadie.
      const jugadores = (await db.from('players')
        .select('id, name, health, downed_at_tick').eq('region_id', regionId)
        .eq('place_id', m.place_id)).data ?? []
      const curados: string[] = []
      for (const p of jugadores) {
        if (p.health >= 100 || p.downed_at_tick !== null) continue
        await db.from('players')
          .update({ health: Math.min(100, p.health + m.magnitud) }).eq('id', p.id)
        cura += m.magnitud
        curados.push(p.name)
      }
      if (curados.length > 0) {
        await emitir(args, regionId, tick, {
          kind: 'marca', place_id: m.place_id,
          summary: `${yLista(curados)} amaneció mejor en ${lugar?.name ?? 'el valle'}, por la marca que dejó ${m.por}.`,
          detail: { place: lugar?.name, marca: 'vigor', por: m.por, alcanzados: curados },
        })
      }
    }
  }
  return { cobradas, danio, cura }
}

// ─────────────────────────────────────────────────────────────
// El grimorio
// ─────────────────────────────────────────────────────────────

export type PaginaDeGrimorio = {
  runas: string[]; nombre: string; veces: number
  descubierta_tick: number; ultima_vez_tick: number
}

/**
 * Lo que ESE jugador descubrió. Devuelve, y esto es lo importante, **nada más
 * que eso**: las runas que le enseñaron y las mezclas que le salieron.
 *
 * El menú completo mata el sistema entero, porque convierte el saber en
 * información (§6). Si algún día esta función devuelve las combinaciones
 * posibles en vez de las probadas, se rompió el juego y nadie lo va a notar
 * hasta que la magia se sienta un árbol de habilidades.
 */
export async function grimorioDe(playerId: string): Promise<{
  runas: { slug: string; nombre: string; descripcion: string; destreza: number; de: string | null }[]
  lleva: Colgada[]
  paginas: PaginaDeGrimorio[]
}> {
  const filas = (await db.from('knows')
    .select('destreza, learned_from, knowledge:knowledge_id (slug, name, kind, description)')
    .eq('holder_kind', 'player').eq('holder_id', playerId)).data ?? []
  type F = {
    destreza: number; learned_from: string | null
    knowledge: { slug: string; name: string; kind: string; description: string } | null
  }
  const magia = (filas as unknown as F[]).filter((f) => f.knowledge?.kind === 'magia')

  // De quién la aprendiste. Es la mitad del valor de una runa: en este juego un
  // hechizo vale por de quién lo recibiste, y el nombre tiene que sobrevivir a
  // que esa persona no esté.
  const maestros = new Map<string, string>()
  const ids = magia.map((m) => m.learned_from).filter((x): x is string => !!x)
  if (ids.length > 0) {
    for (const p of (await db.from('people').select('id, name').in('id', ids)).data ?? []) {
      maestros.set(p.id, p.name)
    }
  }

  const paginas = (await db.from('grimorio')
    .select('runas, nombre, veces, descubierta_tick, ultima_vez_tick')
    .eq('player_id', playerId).order('descubierta_tick')).data ?? []

  return {
    runas: magia.map((m) => ({
      slug: m.knowledge!.slug, nombre: m.knowledge!.name,
      descripcion: m.knowledge!.description, destreza: m.destreza,
      de: m.learned_from ? maestros.get(m.learned_from) ?? null : null,
    })),
    lleva: await loQueLleva({ kind: 'player', id: playerId }),
    paginas: paginas as PaginaDeGrimorio[],
  }
}

/** Anota la mezcla. Devuelve si era nueva, que es el momento que el cliente
 *  tiene que hacer sonar. */
async function anotarEnElGrimorio(
  playerId: string, runas: string[], nombre: string, tick: number,
): Promise<boolean> {
  // Se leen todas y se compara en memoria: son pocas por jugador y comparar un
  // text[] por igualdad a través de PostgREST es una fuente de sorpresas que no
  // vale la pena en una tabla de veinte filas.
  const mias = (await db.from('grimorio')
    .select('id, runas, veces').eq('player_id', playerId)).data ?? []
  const igual = mias.find((p) =>
    p.runas.length === runas.length && p.runas.every((r: string, i: number) => r === runas[i]))
  if (igual) {
    await db.from('grimorio')
      .update({ veces: igual.veces + 1, ultima_vez_tick: tick }).eq('id', igual.id)
    return false
  }
  await db.from('grimorio').insert({
    player_id: playerId, runas, nombre,
    descubierta_tick: tick, ultima_vez_tick: tick, veces: 1,
  })
  return true
}

// ─────────────────────────────────────────────────────────────
// Menudencias
// ─────────────────────────────────────────────────────────────

async function emitir(
  args: { ev?: (e: EventoMundo) => void | Promise<void> },
  regionId: string, tick: number, e: EventoMundo,
) {
  if (args.ev) return void await args.ev(e)
  await db.from('events').insert({ region_id: regionId, tick, ...e })
}

const esUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

/** "a, b y c". Igual que la de `tick.ts`, y por la misma razón: una enumeración
 *  con comas donde va una "y" la lee el director como una lista y la reescribe
 *  peor. */
function yLista(xs: string[]): string {
  if (xs.length === 0) return ''
  if (xs.length === 1) return xs[0]!
  return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`
}
