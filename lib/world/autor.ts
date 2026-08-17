/**
 * EL AUTOR DEL MUNDO
 * ══════════════════
 *
 * La pregunta que abrió esta rama la hizo la dirección del proyecto y era
 * exacta: *"¿el director de IA le dio contexto a todos, al mundo, de dónde
 * viene todo, historia, qué hay?"*. No. **El valle no tenía pasado.** Siete
 * personas con su historia chica, dos pueblos con un agravio, y ningún antes:
 * ni por qué la Casa Quemada está quemada, ni de dónde salió la gente que hoy
 * está, ni qué se perdió acá antes de que empezáramos a contar.
 *
 * Este archivo es lo que lo escribe. Y la regla que lo gobierna —la que lo
 * separa de romper el invariante 1— es una sola línea de `DISENO.md` §9:
 *
 *     La simulación produce las condiciones; el autor escribe el desenlace;
 *     el director lo cuenta.
 *
 * ── Las cuatro reglas, y ninguna es negociable ────────────────────────────
 *
 * **1. La simulación no usa IA y no va a usarla.** `tick.ts` no importa un SDK
 * de modelo y este archivo no lo va a cambiar. Las simulaciones no producen
 * dragones: producen desigualdad, escasez y muertos. Eso ya funciona y es
 * gratis. Lo que no puede producir una simulación es *tempo* — que algo grande
 * pase cuando se lo ganaron y no cuando salió el dado.
 *
 * **2. El autor corre cada tanto, no cada tick.** Cada varios días del valle.
 * No es un ahorro de plata: **un mundo donde algo grande pasa todos los días no
 * tiene nada grande.** Un dragón por semana es una barra de progreso con
 * escamas.
 *
 * **3. El autor siembra; no narra.** No escribe crónicas. Escribe hechos nuevos
 * en la base —una meta, un pueblo enojado, alguien que puede llegar, una cosa
 * parada en la Casa Quemada— y después **la simulación los ejecuta sola,
 * determinista**. Lo que se ve en pantalla lo sigue produciendo el tick.
 *
 * **4. El autor puede sembrar; no puede decidir que algo ya pasó.** Lo que pasó
 * lo decide el tick. Esta regla es la que más fácil se cruza sin darse cuenta,
 * así que está clavada en la estructura del archivo: **cada cosa que el autor
 * escribe es una CONDICIÓN, nunca un evento del presente.** Una meta es un
 * deseo, no un logro. Una amenaza es algo que está parado ahí, no una batalla.
 * Un candidato de `por_llegar` es alguien que podría venir, y quién lo vio
 * llegar lo decide el tick.
 *
 * > La única excepción, y es la que hay que mirar con lupa: **el pasado**. Ahí
 * > sí el autor afirma que algo sucedió. Se banca porque sucedió **antes de que
 * > el mundo empezara a contar** —va a `events` con `tick` negativo— y por lo
 * > tanto no puede pisar nada que el tick vaya a resolver. El tick sólo escribe
 * > en `tick >= 1`. Los dos escriben en la misma tabla y no se tocan nunca.
 *
 * ── Por qué está en su propio archivo y su propio cron ────────────────────
 *
 * Podría colgar del tick: "cada 4 ticks, además, corré el autor". Sería una
 * línea. Y sería el principio del final, porque la línea entre la simulación y
 * la IA dejaría de verse en el árbol de archivos y pasaría a vivir adentro de
 * un `if`. El mismo motivo por el que `saludos.ts` tiene su propio endpoint.
 *
 * **Lo que se puede auditar con un `grep` sobrevive; lo que hay que leer para
 * entender, no.**
 *
 * ── El reparto adentro de este archivo: la cuenta la hace el código ───────
 *
 * Un modelo de lenguaje no produce espectáculo, produce textura (§11.1). Así
 * que acá adentro hay otra división y es igual de firme:
 *
 *   · **El código decide QUÉ CORRESPONDE.** Cuánto debe el valle, si cruzó el
 *     umbral, si el cupo sube o baja, quién está vivo, qué saber sigue en pie,
 *     qué objeto puede existir. Todo eso es aritmética sobre la base y no se le
 *     pregunta a nadie.
 *   · **El modelo escribe QUÉ ES.** El texto de la meta, quién es la figura que
 *     llega, cómo se llama lo que se despertó. Textura, que es lo que sabe
 *     hacer.
 *   · **Y todo lo que el modelo devuelve tiene que citar un hecho que ya estaba
 *     en la base.** Si no lo cita, o cita uno que no existe, se descarta. No es
 *     una advertencia en el log: la siembra no entra. Encima la tabla
 *     `siembras` lo exige con un `check`, así que una siembra sin respaldo es
 *     imposible de escribir aunque alguien se olvide de validar acá.
 */
import { db, REGION_SLUG } from '../db.js'
import { pedirJson } from '../modelo.js'

// ═════════════════════════════════════════════════════════════════════════
// LOS NÚMEROS, CON LA CUENTA HECHA
// ═════════════════════════════════════════════════════════════════════════
//
// Un tick es un día del valle y el cron corre uno cada seis horas: **seis horas
// reales son un día del valle, y un día real son cuatro**. Todo lo de acá abajo
// está escrito en días del valle y traducido a días reales, que es la única
// forma de saber si un número es sano.

/** Cada cuántos días del valle corre el autor de verdad.
 *
 *  Cuatro días del valle = **un día real**, que es donde va el cron. No es una
 *  elección de costo: es §9 —*"cada varios días del valle, no cada tick"*— y es
 *  lo que hace que el autor lea un período con algo adentro. Con un día del
 *  valle por corrida leería 0,01 muertes y 0,02 enseñanzas, o sea nada, y
 *  terminaría inventando para tener algo que decir.
 *
 *  El guardia existe además del cron porque el endpoint se puede pegar a mano.
 *  Sin esto, diez `curl` seguidos son diez corridas y diez metas nuevas. */
const DIAS_ENTRE_CORRIDAS = 4

/** Cada cuántos días del valle se puede mover el tamaño del valle.
 *
 *  Sesenta días del valle son **quince días reales**. Es mucho más lento que el
 *  resto del autor y tiene que serlo: el cupo decide adónde converge la
 *  población (ver `P_NACIMIENTO` en `tick.ts`) y se mide sobre una ventana
 *  larga. Si se moviera en cada corrida, las ventanas se solaparían y el mismo
 *  invierno malo bajaría el cupo quince veces.
 *
 *  En un año de valle son seis oportunidades de moverse un punto. Un valle que
 *  se vacía tarda medio año de mundo en achicarse de verdad, y eso está bien:
 *  **un pueblo no se muere en una semana, se apaga.** */
const DIAS_ENTRE_CRECIMIENTOS = 60

/** La ventana con la que se mide si al valle le va bien o mal. La misma que la
 *  cadencia de arriba, para que no se solapen: cada corrida de crecimiento mira
 *  exactamente los días que pasaron desde la anterior. */
const VENTANA_DE_CRECIMIENTO = DIAS_ENTRE_CRECIMIENTOS

/** Hasta dónde puede crecer o encogerse un valle. El `seed` escribe 9 (§ la
 *  migración de los que llegan) y el equilibrio queda dos por debajo, o sea las
 *  siete personas con las que el valle fue escrito.
 *
 *  El piso de 5 no es una opinión: por debajo de eso el equilibrio queda en tres
 *  y tres es `PISO_DEL_VALLE`, donde el tick deja de dejar morir gente. Un valle
 *  clavado en su piso duro no es un valle chico, es un valle roto.
 *  El techo de 12 es donde el director empieza a no poder contar a todos. */
const CUPO_MIN = 5
const CUPO_MAX = 12

/** Cuánto le debe el valle, por hecho. Es "la cuenta" de §11.1 —*el mundo lleva
 *  la cuenta de cuánto se extrajo y cuántos maestros murieron*— y no baja
 *  nunca: **el mundo recuerda sus cicatrices.**
 *
 *  Los pesos no son estéticos, son la tesis del juego ordenada:
 *
 *   · una muerte es una muerte (1);
 *   · la de alguien que enseñaba vale el triple, porque con ella no se fue una
 *     persona sino la posibilidad de que otro aprendiera (1 + 2);
 *   · **un saber perdido es lo más caro que le puede pasar a este mundo** (3).
 *     Es literalmente el tema: si nadie vivo sabe forjar, en ese mundo no hay
 *     más espadas;
 *   · un saber absorbido cuesta casi lo mismo (2) aunque no se haya perdido:
 *     `knows.how = 'absorbido'` es alguien que se llevó lo de otro en vez de
 *     aprenderlo, y ésa es la huella del Bayaz mecánico (§11.2). Hoy sólo lo
 *     pueden hacer los jugadores, así que este renglón es, casi entero, la
 *     factura de lo que hicieron ellos;
 *   · y cada amenaza muerta en el territorio de un pueblo (1). Del lado nuestro
 *     es un bicho menos y una senda despejada. Del lado de ellos es un pariente,
 *     y ellos también llevan la cuenta. Eso es §11.2 sin escribir una línea de
 *     ficción: **el villano de la decadencia de una región suele ser alguien que
 *     sólo estaba optimizando.** */
const PESO = {
  muerte: 1,
  muerteDeQuienEnsenaba: 2,
  saberPerdido: 3,
  saberAbsorbido: 2,
  suyoMuertoEnSuTerritorio: 1,
} as const

/** Cuánta deuda hace falta para que despierte algo grande.
 *
 *  **La cuenta, que es lo que pidió la dirección: cada cuántos días del valle
 *  debería dispararse.**
 *
 *  Medido sobre `valle-pruebas`, 223 días del valle con gente jugando adentro:
 *  3 muertes (una de ellas la herrera, que enseñaba), 3 saberes perdidos, 0
 *  absorbidos y 7 amenazas muertas en el Sotobosque y la Casa Quemada, que son
 *  los dos territorios. Con los pesos de arriba son **21 puntos en 223 días =
 *  0,094 por día**… salvo que ahí adentro hay un arranque desgraciado (Ren se
 *  murió en el día 10 llevándose dos runas de una), así que la tasa honesta es
 *  más baja. Las dos cotas:
 *
 *    · **valle jugado** — 0,066 puntos por día del valle (las tasas medidas de
 *      `tick.ts`: 0,010 muertes, 0,0055 saberes perdidos, más las amenazas que
 *      caen cuando hay alguien matándolas). Con umbral 14:
 *      **un acontecimiento cada 212 días del valle = 53 días reales.**
 *    · **valle solo** — 0,035 por día (nadie mata bichos, sólo la mortalidad
 *      del tick): **400 días del valle = 100 días reales.**
 *
 *  O sea **uno cada dos o tres meses reales**, y menos si el valle está
 *  tranquilo. Eso es "pocos y grandes", que es lo que pide §16 —*nunca
 *  calendario fijo: eso los convierte en rutina*—.
 *
 *  Y lo mejor de la cuenta es el caso borde: **un valle donde nadie se muere,
 *  nadie absorbe y nadie entra a matar nada no despierta nunca nada.** El
 *  dragón no es contenido de temporada: es la factura. */
const UMBRAL_DEUDA = 14

/** Cuánta vida puede tener lo que despierta. El tick le pone `30 + roll(40)` a
 *  un bicho cualquiera (30 a 69) y el jugador pega 8-15 a mano limpia. 120 son
 *  unos diez golpes: se siente distinto sin ser una pared, y como ocupa uno de
 *  los tres lugares de amenaza del valle, tampoco puede desbordar nada. */
const VIDA_ACONTECIMIENTO = { min: 70, max: 120 }

/** Cuántas metas puede sembrar una corrida. Tres es el techo y casi nunca se
 *  llega: sin hechos no hay metas. Un valle donde el autor abre cinco frentes
 *  por día real deja de tener gente y pasa a tener una lista de tareas. */
const TOPE_DE_METAS = 3

/** Hasta cuántos días del valle para atrás mira una corrida, como mínimo.
 *
 *  El período natural es "desde la última siembra", o sea `DIAS_ENTRE_CORRIDAS`.
 *  El problema es que cuatro días del valle son 0,04 muertes y 0,06 enseñanzas:
 *  la mayoría de las corridas leerían tres eventos de trabajo y no habría nada
 *  de dónde sacar una meta. Doce días —tres días reales— es la ventana más
 *  corta donde suele haber pasado algo.
 *
 *  Las ventanas se solapan a propósito (se corre cada 4 días y se miran 12), y
 *  eso es seguro por dos guardias: una meta idéntica a otra abierta no entra, y
 *  a la misma persona no se le siembra dos veces en `DIAS_ENTRE_METAS`. Un
 *  mismo muerto puede dejar dos metas en dos personas distintas, y eso no es un
 *  bug: es lo que hace una muerte en un pueblo de siete. */
const VENTANA_MINIMA = 12

/** Cada cuántos días del valle puede el autor volver a sembrarle una meta a la
 *  misma persona. Treinta días del valle son ocho días reales.
 *
 *  Sin esto, con ventanas que se solapan, la muerte de la herrera le abriría una
 *  meta nueva al aprendiz cada corrida hasta que el hecho salga de la ventana:
 *  tres metas por el mismo muerto en la misma semana. El catálogo del tick ya
 *  le da algo que hacer todos los días; lo del autor tiene que ser la excepción,
 *  no la fuente. */
const DIAS_ENTRE_METAS = 30

/** Cuántos hechos del período entran al prompt. Es la misma decisión que el
 *  `TOPE_LECTURA` del director: se leen ordenados de lo último para atrás, así
 *  que lo que se pierde es lo viejo. */
const TOPE_DE_HECHOS = 60

/** Lo que NO es un hecho del que valga la pena sacar una meta.
 *
 *  `conversacion` y `rumor` son el fondo del valle —137 rumores contra 3
 *  muertes en `valle-pruebas`— y si entran, se comen la ventana por peso y no
 *  por importancia. `agenda_avanza` es un progreso, no un suceso. `llegada` y
 *  `herida` son de un jugador caminando y peleando: ya los vivió él. */
const RUIDO = new Set(['conversacion', 'rumor', 'agenda_avanza', 'llegada', 'herida', 'levantada'])

/** Los oficios que el tick sabe llevar.
 *
 *  ⚠ **Esto está acoplado a `METAS` en `tick.ts` y no hay forma de evitarlo.**
 *  La migración de `por_llegar` ya lo dice en el comentario de la columna:
 *  *"tiene que ser una clave de METAS en tick.ts, o esta persona persigue para
 *  siempre la misma meta por defecto y el valle queda con un disco rayado"*.
 *  Las claves llevan género porque las metas están escritas a mano.
 *
 *  No se importa `METAS` desde acá y es a propósito: `tick.ts` son 4.200 líneas
 *  y este archivo importa el SDK del modelo por `modelo.ts`. Que el módulo de la
 *  simulación no aparezca en el árbol de imports del autor mantiene la línea
 *  visible desde los dos lados.
 *
 *  Si alguien agrega un oficio a `METAS`, agregarlo acá. Si se olvida, lo peor
 *  que pasa es que el autor no lo use nunca — que es el modo de fallar correcto. */
const OFICIOS_QUE_EL_TICK_SABE_LLEVAR = [
  'herrera', 'aprendiz', 'cazadora', 'destiladora', 'guardia',
  'chico del camino', 'hilandera', 'hilandero', 'jornalera',
]

// ═════════════════════════════════════════════════════════════════════════
// TIPOS
// ═════════════════════════════════════════════════════════════════════════

type Ref = string   // "events:<uuid>" | "people:<uuid>" | "peoples:<uuid>" | ...

/** Limpia una referencia como la devuelve el modelo.
 *
 *  En el corpus las referencias van entre corchetes —`[events:abc]`, que es lo
 *  que las hace fáciles de leer y de copiar— y el modelo devuelve los corchetes
 *  puestos. La primera corrida perdió un agravio entero por eso. Se normaliza
 *  acá y no se le pide al prompt que no lo haga, porque **pelearse con el
 *  formato de salida de un modelo es una pelea que se pierde siempre: lo que se
 *  puede normalizar no se pide.** */
function limpiarRef(h: string): Ref {
  return h.trim().replace(/^\[+/, '').replace(/\]+$/, '').replace(/[.,;]+$/, '')
}

export type Siembra = {
  tipo: 'pasado' | 'meta' | 'figura' | 'crecimiento' | 'agravio' | 'acontecimiento'
  /** Una línea, para leerla en consola sin abrir tres tablas. */
  que: string
  /** De qué hecho salió. Sin esto no se escribe: lo exige el `check` de la tabla. */
  hechos: Ref[]
  /** Por qué ese hecho lleva a esto. Es lo que se lee cuando algo salió raro. */
  nota: string
  tabla: string
  filaId?: string
}

type Persona = {
  id: string; name: string; trade: string; alive: boolean; teaches: boolean
  place_id: string | null; born_tick: number; died_tick: number | null
  disposition: string | null; historia: string | null; procedencia: string | null
}

type Pueblo = {
  id: string; slug: string; name: string; lengua: string; agravio: string
  aprecio: number; temor: number; place_id: string | null
  ultimo_agravio: string | null; ultimo_agravio_tick: number | null
}

type Lugar = { id: string; slug: string; name: string; kind: string; description: string }

type Saber = {
  id: string; slug: string; name: string; kind: string; description: string
  makes: string | null; makes_at: string | null
}

type Hecho = { id: string; tick: number; kind: string; summary: string }

type Corpus = {
  region: { id: string; slug: string; name: string; tick: number; cupo: number }
  lugares: Lugar[]
  pueblos: Pueblo[]
  gente: Persona[]
  saberes: Saber[]
  /** Qué saberes siguen teniendo cabeza viva en este valle. */
  vivos: Set<string>
  /** Qué saberes tuvo alguna vez y ya no. */
  perdidos: Set<string>
  /** Metas abiertas hoy, por persona. */
  metasAbiertas: Map<string, string[]>
  /** Los tipos de objeto que este mundo puede producir. */
  cosas: string[]
  /** Nombres ya usados en `por_llegar`, para no escribir dos veces al mismo. */
  yaEscritos: Set<string>
  /** Los jugadores de esta región. Se usan sólo para PROHIBIR su nombre en el
   *  texto de una meta: un jugador puede no volver nunca, y una meta que lo
   *  nombre queda esperando a alguien que no existe. */
  jugadores: string[]
  /** Todas las referencias válidas. Lo que el modelo cite y no esté acá, no entra. */
  refs: Set<Ref>
}

export type Informe = {
  region: string
  tick: number
  deuda: number
  desgloseDeuda: Record<string, number>
  hitos: number
  corrio: boolean
  porQueNo?: string
  siembras: Siembra[]
  /** Lo que el modelo propuso y no entró, con el motivo. Es la mitad visible
   *  de la garantía: un autor que descarta en silencio no es auditable. */
  descartes: string[]
  costoUsd: number
  modelos: string[]
}

// ═════════════════════════════════════════════════════════════════════════
// LEER EL VALLE
// ═════════════════════════════════════════════════════════════════════════

async function leerElValle(slug: string): Promise<Corpus> {
  const { data: region } = await db
    .from('regions').select('id, slug, name, tick, cupo').eq('slug', slug).single()
  if (!region) throw new Error(`No encuentro la región "${slug}".`)

  const [lugares, pueblos, gente, saberes, knows, agendas, objetos, porLlegar, jugadores] = await Promise.all([
    db.from('places').select('id, slug, name, kind, description').eq('region_id', region.id),
    db.from('peoples')
      .select('id, slug, name, lengua, agravio, aprecio, temor, place_id, ultimo_agravio, ultimo_agravio_tick')
      .eq('region_id', region.id),
    db.from('people')
      .select('id, name, trade, alive, teaches, place_id, born_tick, died_tick, disposition, historia, procedencia')
      .eq('region_id', region.id),
    db.from('knowledge').select('id, slug, name, kind, description, makes, makes_at'),
    db.from('knows').select('holder_kind, holder_id, knowledge_id, how'),
    db.from('agendas').select('person_id, goal').eq('state', 'activa'),
    db.from('objects').select('kind').eq('region_id', region.id),
    db.from('por_llegar').select('name'),
    db.from('players').select('name').eq('region_id', region.id),
  ])

  const gs = (gente.data ?? []) as Persona[]
  const idsDeAca = new Set(gs.map((p) => p.id))
  const vivosDeAca = new Set(gs.filter((p) => p.alive).map((p) => p.id))
  const idsDePueblos = new Set((pueblos.data ?? []).map((p) => p.id))

  // Qué saber tuvo este valle alguna vez, y cuál sigue teniendo una cabeza
  // viva. Es el mismo predicado que usa el tick para `perdida_de_saber`: los
  // muertos cuentan para "lo tuvo" y no para "lo tiene". `knows` es global y
  // polimórfico, así que hay que filtrar por región a mano — la rama `people`
  // (la lengua de un pueblo) no cuenta como saber humano de este valle.
  const hubo = new Set<string>()
  const vivos = new Set<string>()
  for (const k of knows.data ?? []) {
    if (k.holder_kind === 'person' && idsDeAca.has(k.holder_id)) {
      hubo.add(k.knowledge_id)
      if (vivosDeAca.has(k.holder_id)) vivos.add(k.knowledge_id)
    }
  }
  const perdidos = new Set([...hubo].filter((id) => !vivos.has(id)))

  const metasAbiertas = new Map<string, string[]>()
  for (const a of agendas.data ?? []) {
    if (!idsDeAca.has(a.person_id)) continue
    metasAbiertas.set(a.person_id, [...(metasAbiertas.get(a.person_id) ?? []), a.goal])
  }

  // Qué cosas puede haber en este mundo, sacado de la base y no de una lista
  // mía: lo que alguien sabe fabricar (`knowledge.makes`) más lo que ya existió
  // alguna vez en la región (o sea, lo que algún lugar da). Es la forma
  // data-driven de que el autor no pida una meta imposible — «traerle una
  // corona de hierro a Sarn» tendría a Sarn buscándola hasta que se muera.
  const cosas = [...new Set([
    ...(saberes.data ?? []).map((s) => s.makes).filter((x): x is string => !!x),
    ...(objetos.data ?? []).map((o) => o.kind),
  ])].sort()

  const refs = new Set<Ref>([
    ...(lugares.data ?? []).map((l) => `places:${l.id}`),
    ...(pueblos.data ?? []).map((p) => `peoples:${p.id}`),
    ...gs.map((p) => `people:${p.id}`),
    ...(saberes.data ?? []).map((s) => `knowledge:${s.id}`),
  ])
  // Los saberes de los pueblos: el único `knows` que el autor puede citar como
  // hecho, porque es lo que hace que un pueblo no sea un mob (`historia.md`).
  for (const k of knows.data ?? []) {
    if (k.holder_kind === 'people' && idsDePueblos.has(k.holder_id)) {
      refs.add(`knows:${k.holder_id}:${k.knowledge_id}`)
    }
  }

  return {
    region,
    lugares: (lugares.data ?? []) as Lugar[],
    pueblos: (pueblos.data ?? []) as Pueblo[],
    gente: gs,
    saberes: (saberes.data ?? []) as Saber[],
    vivos, perdidos, metasAbiertas, cosas,
    yaEscritos: new Set((porLlegar.data ?? []).map((p) => p.name)),
    jugadores: (jugadores.data ?? []).map((p) => p.name),
    refs,
  }
}

/** Los hechos del período, con su id. Cada uno es una referencia citable.
 *
 *  Se leen de lo último para atrás y se devuelven en orden cronológico, que es
 *  como se lee una historia. Los del ruido no entran (ver `RUIDO`). */
async function leerLoQuePaso(c: Corpus, desde: number): Promise<Hecho[]> {
  const { data } = await db.from('events')
    .select('id, tick, kind, summary')
    .eq('region_id', c.region.id)
    .gt('tick', desde)
    .order('tick', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(TOPE_DE_HECHOS * 3)
  const hechos = (data ?? []).filter((e) => !RUIDO.has(e.kind)).slice(0, TOPE_DE_HECHOS)
  hechos.reverse()
  for (const h of hechos) c.refs.add(`events:${h.id}`)
  return hechos as Hecho[]
}

// ═════════════════════════════════════════════════════════════════════════
// LA CUENTA DEL MUNDO — esto no lo decide ningún modelo
// ═════════════════════════════════════════════════════════════════════════

type Deuda = { total: number; desglose: Record<string, number>; hechos: Ref[] }

/**
 * Cuánto le debe el valle. No baja nunca y se recorre entera cada vez, desde el
 * día uno: **el mundo recuerda sus cicatrices** (§11.1). Un contador guardado
 * en una columna se desincroniza el día que alguien borra un evento; una cuenta
 * que se rehace no puede mentir.
 *
 * Son cuatro consultas chicas y filtradas por `kind`, no la tabla entera.
 */
async function contarLaDeuda(c: Corpus): Promise<Deuda> {
  const territorios = new Set(c.pueblos.map((p) => p.place_id).filter((x): x is string => !!x))
  const { data: evs } = await db.from('events')
    .select('id, kind, place_id, detail')
    .eq('region_id', c.region.id)
    .in('kind', ['muerte', 'perdida_de_saber', 'amenaza_muerta'])
    .gte('tick', 0)

  const ensenaban = new Set(c.gente.filter((p) => p.teaches).map((p) => p.name))
  const desglose: Record<string, number> = {
    muertes: 0, 'muertes de quien enseñaba': 0, 'saberes perdidos': 0,
    'saberes absorbidos': 0, 'suyos muertos en su territorio': 0,
  }
  const hechos: Ref[] = []
  let total = 0

  for (const e of evs ?? []) {
    const d = (e.detail ?? {}) as Record<string, unknown>
    if (e.kind === 'muerte') {
      total += PESO.muerte
      desglose['muertes']! += 1
      hechos.push(`events:${e.id}`)
      if (typeof d['person'] === 'string' && ensenaban.has(d['person'])) {
        total += PESO.muerteDeQuienEnsenaba
        desglose['muertes de quien enseñaba']! += 1
      }
    } else if (e.kind === 'perdida_de_saber') {
      total += PESO.saberPerdido
      desglose['saberes perdidos']! += 1
      hechos.push(`events:${e.id}`)
    } else if (e.kind === 'amenaza_muerta' && e.place_id && territorios.has(e.place_id)) {
      total += PESO.suyoMuertoEnSuTerritorio
      desglose['suyos muertos en su territorio']! += 1
      hechos.push(`events:${e.id}`)
    }
  }

  // Lo absorbido no deja evento: es un estado de `knows`. Es la huella del
  // Bayaz mecánico y por eso se cuenta aparte y con nombre.
  const idsDeAca = new Set(c.gente.map((p) => p.id))
  const { data: absorbidos } = await db.from('knows')
    .select('holder_kind, holder_id, knowledge_id').eq('how', 'absorbido')
  for (const k of absorbidos ?? []) {
    if (k.holder_kind !== 'person' || !idsDeAca.has(k.holder_id)) continue
    total += PESO.saberAbsorbido
    desglose['saberes absorbidos']! += 1
    hechos.push(`knows:${k.holder_id}:${k.knowledge_id}`)
  }

  return { total, desglose, hechos }
}

// ═════════════════════════════════════════════════════════════════════════
// 1. EL PASADO DEL VALLE — se siembra una vez y queda para siempre
// ═════════════════════════════════════════════════════════════════════════

const ESQUEMA_PASADO = {
  type: 'object',
  properties: {
    piezas: {
      // ⚠ Nada de `minItems`/`maxItems`. El esquema de salida de Anthropic no
      // acepta `maxItems` y sólo acepta `minItems` 0 o 1: cualquier otra cosa
      // devuelve un 400 y la corrida entera se cae. Cuántas piezas se piden va
      // en el prompt —que además es donde se puede explicar por qué son entre
      // cuatro y siete— y el techo lo aplica el código al recortar.
      type: 'array',
      items: {
        type: 'object',
        properties: {
          epoca: { type: 'string' },
          hace_inviernos: { type: 'integer' },
          certeza: { type: 'string', enum: ['sabido', 'se_dice', 'se_calla'] },
          quien_lo_cuenta: { type: 'string' },
          lugar_slug: { type: 'string' },
          personas_del_pasado: { type: 'array', items: { type: 'string' } },
          texto: { type: 'string' },
          hechos: { type: 'array', items: { type: 'string' } },
          por_que: { type: 'string' },
        },
        required: ['epoca', 'hace_inviernos', 'certeza', 'quien_lo_cuenta',
          'lugar_slug', 'personas_del_pasado', 'texto', 'hechos', 'por_que'],
        additionalProperties: false,
      },
    },
  },
  required: ['piezas'],
  additionalProperties: false,
} as const

type PiezaDelPasado = {
  epoca: string; hace_inviernos: number
  certeza: 'sabido' | 'se_dice' | 'se_calla'
  quien_lo_cuenta: string; lugar_slug: string
  personas_del_pasado: string[]; texto: string; hechos: string[]; por_que: string
}

const VOZ_DEL_MUNDO = `
Escribís el pasado de un valle para un juego con mundo persistente. No sos un
narrador: sos el que decide qué había antes. Lo que escribas pasa a ser hecho
del mundo y ya no se puede cambiar.

EL TONO. Son tres cosas juntas y ninguna sola alcanza:
· Frieren. Un mundo con historia enorme y pérdida real, recorrido a paso de
  viaje tranquilo. Melancólico y liviano a la vez. Nada de solemnidad, nada de
  épica anunciada. Lo que quedó de lo que alguien hizo hace ochenta años.
· Malazan. La historia es enorme y está fuera de cuadro. Pasan cosas cuya causa
  nadie te va a explicar del todo. Los dioses y los dragones son clima, no
  villanos.
· Abercrombie. No hay lado bueno, sólo intereses — y el que te dice que hay un
  lado bueno es el que te está usando. La compasión es el único ancla: si todo
  es cínico, no duele nada.

LAS REGLAS DURAS:
1. No contradigas NADA de lo que te doy. Cada pieza tiene que EXPLICAR algo que
   ya está en la lista, nunca reemplazarlo. Si dos cosas de la lista se
   contradicen entre sí, eso no es un error: es material, y la pieza buena es la
   que muestra por qué las dos se siguen diciendo.
2. Nunca resuelvas del todo. Un pasado cerrado es una nota al pie; uno con dos
   versiones que no se pueden reconciliar es un lugar.
3. Nada de decoración medieval genérica. Una ruina tiene que haber arruinado a
   alguien. Un oficio que ya no está tiene que faltarle a alguien hoy.
4. Nunca hables de gente que está viva hoy en el valle como si el pasado los
   incluyera, salvo que la lista diga que estaban. A los vivos se los puede
   rozar —"la que vive ahí adentro no lo cuenta"— nunca inventarles hechos.
5. Castellano llano y actual, de España neutro: "aquí", nunca "acá"; "tú" o
   "usted", nunca "vos". Sin exclamaciones. Sin arcaísmos de utilería.
6. Cada pieza cita al menos un hecho de la lista con su referencia exacta. Una
   pieza que no puedas anclar, no la escribas.
7. El pasado es de ANTES de que el mundo empezara a contar. Lo que pasó mientras
   el mundo corría —una muerte de hace tres meses, alguien que llegó el año
   pasado— ya está registrado y lo cuenta otro. Podés usarlo como consecuencia
   ("y por eso hoy falta X"), nunca como la pieza en sí.
8. El campo "epoca" y el campo "hace_inviernos" tienen que decir lo mismo.
   "hace un año" con 9 inviernos es un error que queda escrito para siempre.
`.trim()

async function sembrarElPasado(c: Corpus): Promise<{ siembras: Siembra[]; costo: number; modelo: string } | null> {
  const { count } = await db.from('events')
    .select('id', { count: 'exact', head: true })
    .eq('region_id', c.region.id).eq('kind', 'pasado')
  if (count && count > 0) return null

  const quienSabeQue = new Map<string, string[]>()
  const { data: knows } = await db.from('knows').select('holder_kind, holder_id, knowledge_id')
  const nombreDeSaber = new Map(c.saberes.map((s) => [s.id, s.name]))
  for (const k of knows ?? []) {
    const n = nombreDeSaber.get(k.knowledge_id)
    if (n) quienSabeQue.set(k.holder_id, [...(quienSabeQue.get(k.holder_id) ?? []), n])
  }

  // El corpus va con las referencias PEGADAS a cada línea. Es lo que hace que
  // citar sea barato para el modelo y verificable para el código: no le pedimos
  // que recuerde un uuid, se lo damos al lado de lo que describe.
  const prompt = [
    `EL VALLE: ${c.region.name}. Va por el día ${c.region.tick} desde que se empezó a contar.`,
    '',
    'LOS LUGARES. Estas descripciones son verdad y no se tocan:',
    ...c.lugares.map((l) => `  [places:${l.id}] ${l.name} (${l.kind}) — ${l.description}`),
    '',
    'LA GENTE QUE HAY HOY. Su historia es verdad y no se toca:',
    ...c.gente.filter((p) => p.alive).map((p) =>
      `  [people:${p.id}] ${p.name}, ${p.trade}. ${p.disposition ?? ''}\n`
      + `      procedencia: ${p.procedencia ?? '—'}\n`
      + `      historia: ${p.historia ?? '—'}\n`
      + `      sabe: ${(quienSabeQue.get(p.id) ?? ['nada de lo que se hace aquí']).join(', ')}`),
    '',
    ...(c.gente.some((p) => !p.alive) ? [
      'LOS QUE YA NO ESTÁN. Se murieron mientras el mundo corría; el pasado no los inventó:',
      ...c.gente.filter((p) => !p.alive).map((p) =>
        `  [people:${p.id}] ${p.name}, ${p.trade}, se murió el día ${p.died_tick}.`),
      '',
    ] : []),
    'LOS QUE NO SON HUMANOS. Tienen lengua propia, saberes que ningún humano tiene, y un agravio concreto:',
    ...c.pueblos.map((p) =>
      `  [peoples:${p.id}] ${p.name}. Viven en ${c.lugares.find((l) => l.id === p.place_id)?.name ?? 'el valle'}.\n`
      + `      lengua: ${p.lengua}\n`
      + `      agravio: ${p.agravio}\n`
      + `      saben: ${(quienSabeQue.get(p.id) ?? []).join(', ') || '—'}`),
    '',
    'LO QUE SE SABE HACER EN ESTE MUNDO:',
    ...c.saberes.map((s) => `  [knowledge:${s.id}] ${s.name} (${s.kind}) — ${s.description}`
      + (c.perdidos.has(s.id) ? '  ⚠ este valle lo tuvo y lo perdió.' : '')),
    '',
    'QUÉ ESCRIBIR:',
    'Entre cuatro y siete piezas del pasado de este valle, de la más vieja a la más reciente.',
    'Cada pieza es un párrafo de tres a seis frases que alguien de aquí podría contar.',
    '',
    'Tienen que contestar, entre todas y sin cerrarlo del todo:',
    '  · qué había en este valle antes de la aldea que hay ahora, y quién estaba primero;',
    '  · por qué la Casa Quemada está quemada, con las dos versiones que se siguen diciendo;',
    '  · de dónde salieron los dos pueblos que no son humanos y qué les debemos;',
    '  · qué oficio o qué saber tuvo este valle y ya no tiene, y a quién le falta hoy;',
    '  · por qué el camino del norte es la única salida y qué entró por ahí una vez.',
    '',
    '`certeza` es lo más importante de cada pieza y decide cómo se escribe:',
    '  · "sabido"   — el valle entero lo da por cierto. Escribilo como un hecho.',
    '  · "se_dice"  — es UNA versión y hay otra. Escribilo como lo que se dice, y nombrá',
    '                 en la misma pieza a quién le conviene que se diga así.',
    '  · "se_calla" — alguien lo sabe y no lo cuenta. Escribí lo que se ve desde afuera',
    '                 y el hueco, nunca lo que la persona piensa.',
    '',
    '`quien_lo_cuenta` es quién sostiene esa versión: "la aldea", "Los de la Ceniza",',
    '"los que vienen del norte", "nadie". Con nombre propio sólo si esa persona está',
    'en la lista de arriba.',
    '',
    '`hace_inviernos` es hace cuánto, en inviernos. Aquí nadie cuenta en años.',
    '`lugar_slug` es uno de: ' + c.lugares.map((l) => l.slug).join(', ') + ' — o "" si no es de un lugar.',
    '`personas_del_pasado` son los nombres propios de gente que YA NO EXISTE que hayas',
    'nombrado en el texto. Máximo dos por pieza y no repitas nombres de la gente de hoy.',
    '`hechos` son las referencias entre corchetes de arriba que esa pieza explica.',
    '`por_que` es una línea tuya, fuera de ficción: qué de la lista te llevó a escribir esto.',
  ].join('\n')

  const modelo = process.env.AUTOR_MODELO_PASADO ?? 'claude-sonnet-5'
  const r = await pedirJson<{ piezas: PiezaDelPasado[] }>({
    system: VOZ_DEL_MUNDO,
    prompt,
    schema: ESQUEMA_PASADO as unknown as Record<string, unknown>,
    // **Los dos números están apretados entre dos paredes y por eso van con la
    // cuenta.** Con 8.000 la respuesta salía cortada a la mitad de la primera
    // pieza, porque el esfuerzo se gasta pensando antes de escribir y un JSON
    // truncado es la corrida entera perdida. Con 24.000 el SDK se planta:
    // *"streaming is required for operations that may take longer than 10
    // minutes"*, y `modelo.ts` no transmite (ni tiene por qué: es la puerta de
    // todos los usos, no la de éste). 12.000 con esfuerzo medio entra en las
    // dos: alcanza para siete piezas de seis frases y no llega al techo del
    // SDK.
    maxTokens: 12000,
    modelo,
    // El pasado se escribe una vez por región y queda para siempre. Es el único
    // lugar del proyecto donde pagar de más está bien.
    esfuerzo: 'medium',
  })

  const slugs = new Set(c.lugares.map((l) => l.slug))
  const vivos = new Set(c.gente.filter((p) => p.alive).map((p) => p.name))
  const buenas = r.datos.piezas.filter((p) => {
    p.hechos = p.hechos.map(limpiarRef).filter((h) => c.refs.has(h))
    const anclada = p.hechos.length > 0
    const largo = p.texto.trim().length >= 100 && p.texto.trim().length <= 1200
    // Un nombre de alguien vivo hoy en `personas_del_pasado` sería el autor
    // matando a un vivo por la puerta de atrás. No se corrige: se descarta.
    const noPisaVivos = !p.personas_del_pasado.some((n) => vivos.has(n))
    return anclada && largo && noPisaVivos
  }).slice(0, 7)   // el techo lo aplica el código: el esquema no lo puede pedir
  if (buenas.length === 0) return null

  const n = buenas.length
  const siembras: Siembra[] = []
  for (let i = 0; i < n; i++) {
    const p = buenas[i]!
    const lugar = c.lugares.find((l) => l.slug === p.lugar_slug && slugs.has(p.lugar_slug))
    const { data: fila } = await db.from('events').insert({
      region_id: c.region.id,
      // ⚠ NEGATIVO, y por orden y no por fecha. -n es lo más viejo, -1 lo más
      // reciente de lo viejo. Ver la migración: el tick sólo escribe en >= 1,
      // así que los dos comparten tabla y no se pisan nunca.
      tick: -(n - i),
      kind: 'pasado',
      place_id: lugar?.id ?? null,
      summary: p.texto.trim(),
      // ⚠ NUNCA `person`, `from` ni `to`: `dialogo.ts` filtra por esas tres
      // claves para traerle a un NPC lo que le pasó, y una pieza del pasado
      // entraría ahí como si le hubiera pasado ayer. `personas` es lista y no
      // la mira nadie por accidente.
      detail: {
        epoca: p.epoca,
        hace_inviernos: p.hace_inviernos,
        certeza: p.certeza,
        quien_lo_cuenta: p.quien_lo_cuenta,
        personas: p.personas_del_pasado,
        lugar: lugar?.name ?? null,
      },
    }).select('id').single()

    siembras.push({
      tipo: 'pasado',
      que: `[${p.certeza}] ${p.epoca} — ${p.texto.trim().slice(0, 90)}…`,
      hechos: p.hechos,
      nota: p.por_que,
      tabla: 'events',
      filaId: fila?.id,
    })
  }
  return { siembras, costo: r.costUsd, modelo: r.modelo }
}

// ═════════════════════════════════════════════════════════════════════════
// 2. LA CORRIDA — metas, figuras, agravios y lo grande
// ═════════════════════════════════════════════════════════════════════════

const ESQUEMA_CORRIDA = {
  type: 'object',
  properties: {
    metas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          de_quien: { type: 'string' },
          goal: { type: 'string' },
          necesita: { type: 'string', enum: ['objeto', 'saber', 'nada'] },
          que: { type: 'string' },
          hechos: { type: 'array', items: { type: 'string' } },
          por_que: { type: 'string' },
        },
        required: ['de_quien', 'goal', 'necesita', 'que', 'hechos', 'por_que'],
        additionalProperties: false,
      },
    },
    figura: {
      type: 'object',
      properties: {
        hay: { type: 'boolean' },
        name: { type: 'string' }, trade: { type: 'string' }, llega: { type: 'string' },
        teaches: { type: 'boolean' },
        disposition: { type: 'string' }, voice: { type: 'string' },
        procedencia: { type: 'string' }, historia: { type: 'string' },
        hechos: { type: 'array', items: { type: 'string' } },
        por_que: { type: 'string' },
      },
      required: ['hay', 'name', 'trade', 'llega', 'teaches', 'disposition',
        'voice', 'procedencia', 'historia', 'hechos', 'por_que'],
      additionalProperties: false,
    },
    agravio: {
      type: 'object',
      properties: {
        hay: { type: 'boolean' },
        pueblo_slug: { type: 'string' },
        agravio: { type: 'string' },
        cuanto: { type: 'integer' },
        hechos: { type: 'array', items: { type: 'string' } },
        por_que: { type: 'string' },
      },
      required: ['hay', 'pueblo_slug', 'agravio', 'cuanto', 'hechos', 'por_que'],
      additionalProperties: false,
    },
    acontecimiento: {
      type: 'object',
      properties: {
        pueblo_slug: { type: 'string' },
        lugar_slug: { type: 'string' },
        nombre: { type: 'string' },
        que_se_ve: { type: 'string' },
        vida: { type: 'integer' },
        hechos: { type: 'array', items: { type: 'string' } },
        por_que: { type: 'string' },
      },
      required: ['pueblo_slug', 'lugar_slug', 'nombre', 'que_se_ve', 'vida', 'hechos', 'por_que'],
      additionalProperties: false,
    },
  },
  required: ['metas', 'figura', 'agravio', 'acontecimiento'],
  additionalProperties: false,
} as const

type Corrida = {
  metas: { de_quien: string; goal: string; necesita: 'objeto' | 'saber' | 'nada'
    que: string; hechos: string[]; por_que: string }[]
  figura: { hay: boolean; name: string; trade: string; llega: string; teaches: boolean
    disposition: string; voice: string; procedencia: string; historia: string
    hechos: string[]; por_que: string }
  agravio: { hay: boolean; pueblo_slug: string; agravio: string; cuanto: number
    hechos: string[]; por_que: string }
  acontecimiento: { pueblo_slug: string; lugar_slug: string; nombre: string
    que_se_ve: string; vida: number; hechos: string[]; por_que: string }
}

/**
 * Cómo se escribe una meta para que el tick la sepa cerrar.
 *
 * Esto no es estilo: son las cinco frases con las que `tick.ts` envuelve el
 * texto de una meta, y una meta que no encaje en las cinco produce una crónica
 * agramatical o —peor— una afirmación falsa. Se las damos al modelo tal cual,
 * que es la única forma honesta de pedir que respete una gramática ajena.
 */
const LAS_CINCO_FRASES = [
  '  «Ilde se puso a ___.»',
  '  «Ilde venía detrás de ___ y no lo sacaba sola.»',
  '  «Ilde dejó de perseguir ___.»',
  '  «Ilde avanzó bastante con ___.»',
  '  «Ilde usó carbón de lo que tenía juntado y cerró lo que venía persiguiendo: ___.»',
].join('\n')

const VOZ_DEL_AUTOR = `
Sos el autor de un mundo persistente que corre solo. No narrás nada: sembrás.
Lo que escribís entra a la base de datos y después una simulación determinista
lo ejecuta sin vos.

LA REGLA QUE NO SE CRUZA: podés sembrar lo que alguien QUIERE, lo que un pueblo
RECUERDA y lo que está PARADO en un lugar. No podés decidir que algo ya pasó.
Lo que pasó lo decide la simulación. Si te encontrás escribiendo que alguien
consiguió, encontró, mató o aprendió algo, parás: eso no te toca.

EL TONO: Frieren para el ritmo y la mirada —viaje tranquilo, melancolía sin
solemnidad—, Abercrombie para las consecuencias —no hay lado bueno, sólo
intereses—. La compasión es el único ancla.

EL IDIOMA: castellano llano y actual. "aquí", nunca "acá". "tú" o "usted",
nunca "vos". Sin exclamaciones.

Y LO MÁS IMPORTANTE: cada cosa que siembres tiene que salir de un hecho de la
lista que te doy, citado por su referencia exacta. No hay excepciones y no hay
premio por llenar todos los campos. Si el período no da para una meta, devolvé
cero metas. Un mundo donde pasa algo grande todos los días no tiene nada
grande.
`.trim()

async function sembrarLaCorrida(
  c: Corpus, hechos: Hecho[], deuda: Deuda, despierta: boolean,
): Promise<{ siembras: Siembra[]; descartes: string[]; costo: number; modelo: string } | null> {
  if (hechos.length === 0) return null

  const vivos = c.gente.filter((p) => p.alive)
  const saberVivo = c.saberes.filter((s) => c.vivos.has(s.id))
  const saberPerdido = c.saberes.filter((s) => c.perdidos.has(s.id))

  const prompt = [
    `EL VALLE: ${c.region.name}, día ${c.region.tick}. Viven ${vivos.length} personas.`,
    '',
    'LO QUE PASÓ DESDE LA ÚLTIMA VEZ QUE MIRASTE. Esto es la única materia prima:',
    ...hechos.map((h) => `  [events:${h.id}] día ${h.tick} · ${h.kind} · ${h.summary}`),
    '',
    'QUIÉN VIVE AQUÍ HOY:',
    ...vivos.map((p) => `  [people:${p.id}] ${p.name}, ${p.trade}.`
      + ` ${p.teaches ? 'Enseña.' : 'No enseña.'}`
      + ` Persigue: ${(c.metasAbiertas.get(p.id) ?? ['nada']).join(' / ')}`),
    '',
    ...(c.gente.some((p) => !p.alive) ? [
      'QUIÉN SE MURIÓ AQUÍ:',
      ...c.gente.filter((p) => !p.alive).map((p) =>
        `  [people:${p.id}] ${p.name}, ${p.trade}, el día ${p.died_tick}.`),
      '',
    ] : []),
    'LOS QUE NO SON HUMANOS:',
    ...c.pueblos.map((p) => `  [peoples:${p.id}] slug "${p.slug}" · ${p.name},`
      + ` en ${c.lugares.find((l) => l.id === p.place_id)?.name ?? 'el valle'}.`
      + ` Aprecio ${p.aprecio}, temor ${p.temor}.\n`
      + `      agravio de siempre: ${p.agravio}\n`
      + `      lo último que les hicieron: ${p.ultimo_agravio ?? '—'}`),
    '',
    // Con el slug PEGADO al nombre, y no en otra lista. La primera corrida que
    // devolvió metas puso el uuid donde iba el slug, y las tres se cayeron: si
    // el dato que hay que copiar no está al lado del que se lee, se copia el
    // que está al lado.
    'SABERES QUE SIGUEN VIVOS AQUÍ (los únicos que una meta puede pedir aprender):',
    ...(saberVivo.length ? saberVivo.map((s) => `  · ${s.name} — slug "${s.slug}" [knowledge:${s.id}]`)
      : ['  · ninguno']),
    'SABERES QUE ESTE VALLE PERDIÓ (no se pueden aprender aquí; sirven como MOTIVO):',
    ...(saberPerdido.length ? saberPerdido.map((s) => `  · ${s.name} [knowledge:${s.id}]`)
      : ['  · ninguno']),
    `COSAS QUE PUEDEN EXISTIR EN ESTE MUNDO: ${c.cosas.join(', ') || 'ninguna'}`,
    '',
    `LA CUENTA DEL MUNDO: ${deuda.total} puntos de deuda.`
    + ` ${Object.entries(deuda.desglose).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(', ') || 'nada todavía'}.`,
    '',
    '────────────────────────────────────────────────',
    'QUÉ SEMBRAR',
    '────────────────────────────────────────────────',
    '',
    `METAS (hasta ${TOPE_DE_METAS}). Es lo más importante de esta hoja: el mundo se mueve`,
    'porque la gente persigue cosas, y hoy persigue dos por oficio, siempre las mismas.',
    'Si en esta hoja hay un muerto, un saber que se perdió, un pueblo enojado o alguien',
    'que quedó a mitad de algo, hay por lo menos una meta que escribir. Escribila.',
    'Si de verdad no pasó nada, cero metas es una respuesta correcta — pero mirá dos',
    'veces antes de devolver cero.',
    'Podés dársela a cualquiera que tenga menos de dos cosas entre manos en la lista de',
    'abajo. Preferí a quien el hecho le toca de cerca: el que se quedó sin maestro, el',
    'que vivía de lo que ya no se hace, el que duerme al lado del lugar donde pasó.',
    'Una meta es lo próximo que alguien de aquí va a perseguir. Tiene que salir de un',
    'hecho concreto y citarlo: de la lista de arriba, o de algo que sigue pesando —',
    'alguien que se murió [people:...], un saber que este valle perdió [knowledge:...],',
    'un pueblo con un agravio [peoples:...]. Una pérdida de hace cinco meses sigue',
    'siendo un motivo si hoy le falta a alguien.',
    'Nada de metas genéricas de oficio: de ésas ya hay dos por oficio y se repiten, y',
    'son exactamente el problema que viniste a resolver. La meta buena es la que nadie',
    'podría haber escrito antes de que pasara lo que pasó.',
    '',
    'Cómo se escribe el campo `goal`. La simulación lo mete DENTRO de estas frases,',
    'así que tiene que encajar en las cinco:',
    LAS_CINCO_FRASES,
    'Entonces: infinitivo, en minúscula, sin punto final, entre 12 y 90 caracteres,',
    'sin nombres propios de personas (la simulación no sabe si esa persona sigue viva',
    'cuando la meta se cierre) y sin negaciones ("no ..." no se puede cumplir).',
    'Y sin tiempo relativo: nada de "estos días", "ahora", "esta semana". Una meta',
    'puede tardar dos meses del valle en cerrarse, y "estos días" va a seguir diciendo',
    '"estos días" cuando ya no lo sean.',
    '',
    '`necesita` decide cómo se cierra, y es lo que la hace jugable:',
    `  · "objeto" — \`que\` es una de las cosas que pueden existir. La cierra quien la traiga,`,
    '    y por eso un jugador puede meterse. Es la mejor.',
    `  · "saber"  — \`que\` es el slug de un saber que SIGA VIVO aquí. Si nadie lo sabe,`,
    '    la meta nace trabada y no sirve.',
    '  · "nada"   — se cierra a fuerza de días de trabajo. Usala poco.',
    '',
    'FIGURA. Alguien que todavía no está aquí y que podría llegar por el camino del',
    'norte. Ponés `hay: true` sólo si de la lista de hechos sale un MOTIVO para que',
    'alguien venga a este valle en particular: se murió el que hacía algo, el valle',
    'quedó sin un oficio, se corrió la voz de algo. Si no hay motivo, `hay: false`.',
    '',
    '⚠ Quien llega NO SABE HACER NADA de lo que se hace aquí, y eso no es negociable:',
    'si el que llega trajera el oficio puesto, la muerte de una herrera dejaría de',
    'costar algo. Trae un oficio como PAPEL SOCIAL y una cabeza vacía. Que aprenda',
    'es trabajo de la gente de aquí.',
    `\`trade\` tiene que ser uno de: ${OFICIOS_QUE_EL_TICK_SABE_LLEVAR.join(', ')}.`,
    '⚠ Esas claves llevan género porque las metas de cada oficio están escritas a mano.',
    'Si elegís "herrera", el nombre y `llega` tienen que ser de mujer; si elegís',
    '"hilandero", de hombre. No hay clave para las dos formas de todos los oficios: si',
    'la que necesitás no está en la lista, elegí otra persona, no otra clave.',
    '`llega` es "un hombre", "una muchacha", "un chico": la simulación lo usa para',
    'poder escribir la frase sin saber de quién habla.',
    '`voice` es REGISTRO, nunca un conteo de palabras ni una prohibición gramatical:',
    '"habla poco y va al grano" sí, "frases de cuatro palabras" no. Y no puede pedir',
    'una forma que obligue a inventar hechos ("empieza contando una noticia" no).',
    '`procedencia` es COSTUMBRE compartida: cómo nombra los sitios, en qué mide, a',
    'quién trata de usted. Separado de `historia`, que es biografía.',
    'Ninguna de las dos puede nombrar un lugar, una persona ni un suceso de este',
    'valle: viene de fuera y no lo conoce.',
    '',
    'AGRAVIO. `hay: true` sólo si en la lista de hechos pasó algo EN EL TERRITORIO de',
    'un pueblo o contra los suyos. `cuanto` es cuánto baja su aprecio, entre 1 y 15.',
    '`agravio` es una frase de lo que les hicieron, desde su lado, sin justificarlo',
    'y sin condenarlo: ellos no piensan que fue un malentendido y nosotros no',
    'pensamos que fue una masacre.',
    '',
    despierta
      ? [
        'ACONTECIMIENTO. La cuenta del mundo cruzó el umbral, así que ESTA VEZ SÍ',
        'despierta algo, y lo despertó lo que hizo la gente. No es un monstruo que',
        'aparece: es la consecuencia con cuerpo.',
        '',
        'Escribí qué es lo que está parado ahora en un lugar del valle. Reglas:',
        '  · tiene que pertenecer a uno de los pueblos y salir de su agravio;',
        '  · `que_se_ve` es lo que ve alguien que llega, y la simulación lo mete en',
        '    la frase «fulano estuvo en el Sotobosque, vio ___ y no se metió». Así que',
        '    es un sintagma nominal en minúscula, sin punto: "una fila de gente del',
        '    Sotobosque con las manos vacías";',
        '  · TIENE QUE PODERSE ENFRENTAR. La simulación deja que la gente del valle se',
        '    vuelva sin meterse, o que pelee y muera. Así que es gente, una bestia o una',
        '    presencia: algo con lo que uno se topa. Un paisaje no sirve — "tierra negra',
        '    que respira calor" no se puede pelear ni se puede negociar;',
        '  · `nombre` es cómo lo llaman ellos, en su lengua o traducido;',
        `  · \`vida\` entre ${VIDA_ACONTECIMIENTO.min} y ${VIDA_ACONTECIMIENTO.max};`,
        '  · NO cuentes qué hizo ni qué va a hacer. Está ahí. Lo que pase lo decide',
        '    la simulación y la gente.',
      ].join('\n')
      : 'ACONTECIMIENTO. La cuenta del mundo NO cruzó el umbral. Dejá `nombre` en ""'
        + ' y `hechos` vacío: esta vez no despierta nada, y eso es lo correcto.',
    '',
    'En todos los casos `hechos` son referencias exactas de esta hoja y `por_que` es',
    'una línea tuya, fuera de ficción, diciendo qué hecho te llevó a esto.',
  ].join('\n')

  const modelo = process.env.AUTOR_MODELO ?? 'claude-haiku-4-5'
  const r = await pedirJson<Corrida>({
    system: VOZ_DEL_AUTOR,
    prompt,
    schema: ESQUEMA_CORRIDA as unknown as Record<string, unknown>,
    maxTokens: 8000,
    modelo,
    esfuerzo: 'medium',
  })

  const siembras: Siembra[] = []
  /** Las referencias que el modelo citó y que de verdad existen. */
  const ancla = (hs: string[]) => hs.map(limpiarRef).filter((h) => c.refs.has(h))

  /** Lo que el modelo propuso y no entró, con el motivo.
   *
   *  No es un detalle de depuración: **es la mitad visible de la garantía.**
   *  "Si lo que siembra no se puede rastrear a un hecho que ya estaba en la
   *  base, está mal" sólo se puede sostener si se ve QUÉ se tiró y POR QUÉ. Un
   *  autor que descarta en silencio y siembra tres cosas parece perfecto; uno
   *  que dice "tiré cuatro, éstas son y por esto" es auditable. */
  const descartes: string[] = []
  const tirar = (que: string, porque: string) => { descartes.push(`${que} — ${porque}`) }

  // ── Las metas ───────────────────────────────────────────────
  //
  // A quién le sembró el autor una meta hace poco. Sale de `siembras` unida a
  // `agendas` por `fila_id`, que es justamente para lo que existe esa columna.
  const { data: recientes } = await db.from('siembras')
    .select('fila_id').eq('region_id', c.region.id).eq('tipo', 'meta')
    .gt('tick', c.region.tick - DIAS_ENTRE_METAS)
  const idsRecientes = (recientes ?? []).map((x) => x.fila_id).filter((x): x is string => !!x)
  const conMetaReciente = new Set<string>()
  if (idsRecientes.length > 0) {
    const { data: ag } = await db.from('agendas').select('person_id').in('id', idsRecientes)
    for (const a of ag ?? []) conMetaReciente.add(a.person_id)
  }

  const yaHay = new Set([...c.metasAbiertas.values()].flat())
  for (const m of r.datos.metas.slice(0, TOPE_DE_METAS)) {
    const rotulo = `meta «${m.goal}» para ${m.de_quien}`
    const hs = ancla(m.hechos)
    if (hs.length === 0) {
      tirar(rotulo, `no cita ningún hecho que exista (dijo: ${m.hechos.join(', ') || 'nada'})`)
      continue
    }
    const quien = vivos.find((p) => p.name === m.de_quien)
    if (!quien) { tirar(rotulo, 'esa persona no está viva en este valle'); continue }
    // Un verbo por persona y por día: alguien con dos metas abiertas ya se
    // reparte el día. Con tres, la tercera no arranca nunca.
    if ((c.metasAbiertas.get(quien.id) ?? []).length >= 2) {
      tirar(rotulo, 'ya tiene dos metas abiertas y sólo hace un verbo por día')
      continue
    }
    if (conMetaReciente.has(quien.id)) {
      tirar(rotulo, `el autor ya le sembró una en los últimos ${DIAS_ENTRE_METAS} días del valle`)
      continue
    }

    const goal = m.goal.trim().replace(/\.$/, '')
    if (!encaja(goal, [...vivos.map((p) => p.name), ...c.jugadores])) {
      tirar(rotulo, 'no encaja en las cinco frases con las que el tick la va a envolver')
      continue
    }
    if (yaHay.has(goal)) { tirar(rotulo, 'esa meta ya está abierta'); continue }

    let needs_kind: string | null = null
    let needs_object: string | null = null
    let needs_id: string | null = null
    if (m.necesita === 'objeto') {
      if (!c.cosas.includes(m.que)) {
        tirar(rotulo, `«${m.que}» no es una cosa que pueda existir en este mundo`)
        continue
      }
      needs_kind = 'object'; needs_object = m.que
    } else if (m.necesita === 'saber') {
      // Slug o uuid: el modelo tiene los dos delante y va a usar el que le
      // quede más a mano. Aceptar los dos cuesta una línea; rechazar el uuid
      // costó tres metas buenas en una corrida.
      const clave = limpiarRef(m.que).replace(/^knowledge:/, '')
      const s = c.saberes.find((k) => (k.slug === clave || k.id === clave) && c.vivos.has(k.id))
      if (!s) { tirar(rotulo, `«${m.que}» no es un saber que siga vivo aquí`); continue }
      needs_kind = 'knowledge'; needs_id = s.id
    }

    const { data: fila } = await db.from('agendas').insert({
      person_id: quien.id, goal, started_tick: c.region.tick,
      needs_kind, needs_object, needs_id,
    }).select('id').single()
    yaHay.add(goal)
    siembras.push({
      tipo: 'meta', que: `${quien.name}: ${goal}`
        + (needs_object ? ` (necesita ${needs_object})` : needs_id ? ` (necesita aprender algo)` : ''),
      hechos: hs, nota: m.por_que, tabla: 'agendas', filaId: fila?.id,
    })
  }

  // ── La figura ───────────────────────────────────────────────
  //
  // Va a `por_llegar` y no a `people`, y ésa es la línea entera: el autor
  // decide QUIÉN ES, la simulación decide SI, CUÁNDO, POR DÓNDE y QUIÉN LO VIO
  // LLEGAR. Escribirla directo en `people` sería el autor decidiendo que algo
  // ya pasó.
  const f = r.datos.figura
  if (f.hay) {
    const rotulo = `figura ${f.name} (${f.trade})`
    const hs = ancla(f.hechos)
    const slug = f.name.trim().toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')
    const problema =
      hs.length === 0 ? `no cita ningún hecho que exista (dijo: ${f.hechos.join(', ') || 'nada'})`
        : !OFICIOS_QUE_EL_TICK_SABE_LLEVAR.includes(f.trade)
          ? `«${f.trade}» no es un oficio que el tick sepa llevar`
          : slug.length < 3 ? 'el nombre no da para un slug'
            : c.yaEscritos.has(f.name.trim()) ? 'ya hay alguien con ese nombre esperando entrar'
              // Un nombre que ya vivió aquí, aunque esté muerto, no vuelve
              // nunca: «llegó Ilde por el camino» es la peor frase que este
              // juego puede producir. El tick ya lo filtra; acá se filtra antes
              // para no dejar una fila muerta en el catálogo.
              : c.gente.some((p) => p.name === f.name.trim()) ? 'ese nombre ya vivió en este valle'
                : null
    if (problema) tirar(rotulo, problema)
    else {
      const { data: fila } = await db.from('por_llegar').insert({
        slug, name: f.name.trim(), trade: f.trade, llega: f.llega.trim(),
        teaches: f.teaches, disposition: f.disposition.trim(),
        voice: f.voice.trim(), procedencia: f.procedencia.trim(),
        historia: f.historia.trim(),
      }).select('id').single()
      if (fila) {
        siembras.push({
          tipo: 'figura', que: `${f.name.trim()}, ${f.trade} — puede llegar por el camino del norte`,
          hechos: hs, nota: f.por_que, tabla: 'por_llegar', filaId: fila.id,
        })
      }
    }
  }

  // ── El agravio ──────────────────────────────────────────────
  const a = r.datos.agravio
  if (a.hay) {
    const rotulo = `agravio de «${a.pueblo_slug}»`
    const hs = ancla(a.hechos)
    const pueblo = c.pueblos.find((p) => p.slug === a.pueblo_slug)
    if (hs.length === 0) {
      tirar(rotulo, `no cita ningún hecho que exista (dijo: ${a.hechos.join(', ') || 'nada'})`)
    } else if (!pueblo) {
      tirar(rotulo, 'ese pueblo no existe en esta región')
    } else if (a.agravio.trim().length <= 15) {
      tirar(rotulo, 'el agravio es demasiado corto para decir algo')
    } else {
      const cuanto = Math.max(1, Math.min(15, a.cuanto))
      await db.from('peoples').update({
        // El agravio fundacional NO se toca: es autoría escrita a mano y
        // pisarla con una llamada a un modelo sería borrar el motivo por el que
        // ese pueblo existe. Lo nuevo va al lado.
        ultimo_agravio: a.agravio.trim(),
        ultimo_agravio_tick: c.region.tick,
        aprecio: Math.max(-100, pueblo.aprecio - cuanto),
      }).eq('id', pueblo.id)
      siembras.push({
        tipo: 'agravio',
        que: `${pueblo.name} (aprecio ${pueblo.aprecio} → ${Math.max(-100, pueblo.aprecio - cuanto)}): ${a.agravio.trim()}`,
        hechos: hs, nota: a.por_que, tabla: 'peoples', filaId: pueblo.id,
      })
    }
  }

  // ── Lo grande ───────────────────────────────────────────────
  //
  // Sólo si el CÓDIGO dijo que despierta. El modelo escribe qué es; nunca
  // decide si toca. Y no emite ningún evento: lo que hay es una cosa parada en
  // un lugar. El valle se entera viviendo — el primero que vaya al Sotobosque
  // va a producir el `retirada` o la `pelea`, y ése sí es un hecho del tick.
  if (despierta) {
    const g = r.datos.acontecimiento
    const rotulo = `acontecimiento «${g.nombre}»`
    // Lo grande se banca con la deuda entera del valle además de con lo que
    // pasó esta semana: es la única siembra cuyo respaldo es acumulado, porque
    // la razón por la que despierta también lo es.
    const hs = [...ancla(g.hechos), ...deuda.hechos.slice(0, 8)]
    const pueblo = c.pueblos.find((p) => p.slug === g.pueblo_slug)
    const lugar = c.lugares.find((l) => l.slug === g.lugar_slug)
      ?? c.lugares.find((l) => l.id === pueblo?.place_id)
    if (hs.length === 0) {
      tirar(rotulo, 'no cita ningún hecho que exista y la deuda no dejó rastro')
    } else if (!pueblo) {
      tirar(rotulo, `«${g.pueblo_slug}» no es un pueblo de esta región`)
    } else if (!lugar) {
      tirar(rotulo, `«${g.lugar_slug}» no es un lugar de esta región`)
    } else if (g.que_se_ve.trim().length <= 5) {
      tirar(rotulo, 'no dijo qué se ve')
    } else {
      const vida = Math.max(VIDA_ACONTECIMIENTO.min, Math.min(VIDA_ACONTECIMIENTO.max, g.vida))
      const { data: fila } = await db.from('threats').insert({
        region_id: c.region.id, place_id: lugar.id,
        kind: g.que_se_ve.trim().replace(/\.$/, ''),
        nombre: g.nombre.trim() || null,
        people_id: pueblo.id,
        health: vida, max_health: vida, spawned_tick: c.region.tick,
      }).select('id').single()
      siembras.push({
        tipo: 'acontecimiento',
        que: `${pueblo.name} · «${g.nombre.trim()}» — ${g.que_se_ve.trim()} en ${lugar.name} (vida ${vida})`,
        hechos: hs,
        nota: g.por_que, tabla: 'threats', filaId: fila?.id,
      })
    }
  }

  return { siembras, descartes, costo: r.costUsd, modelo: r.modelo }
}

/** ¿Este texto de meta encaja en las cinco frases del tick?
 *
 *  No es cosmética. Una meta con mayúscula inicial produce «Ilde se puso a
 *  Rehacer el yunque»; una con punto final, «…se puso a rehacerlo..»; una que
 *  nombre a alguien produce el bug que ya está documentado en `tick.ts` («Odila
 *  le encargó a Pedro cobrar tres deudas viejas: le hace falta frasco de raíz»,
 *  que no se entiende). Y una con negación no se puede cumplir nunca. */
function encaja(goal: string, nombres: string[]): boolean {
  if (goal.length < 12 || goal.length > 90) return false
  if (!/^[a-záéíóúñü]/.test(goal)) return false
  if (/[.!?¡¿]/.test(goal)) return false
  if (/\bno\b|\bnunca\b|\bsin que\b/.test(goal)) return false
  // Una meta vive semanas. "estos días" envejece mal y el director lo lee como
  // si fuera de hoy cada vez que lo encuentra.
  if (/\bestos días\b|\bahora\b|\besta semana\b|\bhoy\b|\búltimamente\b/.test(goal)) return false
  // Ni NPCs ni jugadores. Un jugador se puede ir para siempre, y una meta que
  // lleva su nombre queda esperando a alguien que no vuelve.
  if (nombres.some((n) => n.length >= 3 && goal.includes(n))) return false
  return true
}

// ═════════════════════════════════════════════════════════════════════════
// 3. EL VALLE CRECE O SE ENCOGE — esto es aritmética, no ficción
// ═════════════════════════════════════════════════════════════════════════

/**
 * Un pueblo no son edificios, son personas que saben cosas (§10.1).
 *
 * Entonces crecer no es levantar una casa: es que el valle **sostenga más
 * gente**, y de ahí que lo que se mueva sea `regions.cupo`, que es el número del
 * que cuelga toda la llegada de gente en el tick:
 *
 *     P(llega alguien) = P_NACIMIENTO × (cupo − vivos) / (cupo − 3)
 *
 * Subir el cupo un punto mueve el equilibrio de la población un punto para
 * arriba, para siempre, y el tick lo ejecuta solo desde el próximo día. Bajarlo
 * no mata a nadie —el autor no puede decidir que alguien se murió— sino que
 * **deja de reponer**: la mortalidad del tick hace el resto, despacio, que es
 * como se apaga un pueblo de verdad.
 *
 * Y el oficio nuevo llega por el mismo lado, con la única regla que hace que
 * esto no rompa la escasez: **el que llega trae una cabeza vacía.** El tick le
 * pone como primera meta aprender el saber que hoy tiene menos cabezas vivas.
 * Así que un valle que crece gana un oficio si —y sólo si— alguien de aquí se
 * lo enseña. El valle no crece por decreto: crece porque enseñó.
 *
 * Qué se mide, sobre los últimos `VENTANA_DE_CRECIMIENTO` días del valle:
 *
 *   · **le va bien** — hubo al menos dos enseñanzas, ningún saber se perdió y no
 *     se murió nadie. Es un valle donde se transmitió más de lo que se fue.
 *   · **le va mal** — se perdió un saber, o se murieron dos o más.
 *
 * Nunca las dos, nunca más de un punto por vez, y como mucho cada quince días
 * reales. El cupo se mueve como se mueve un pueblo: poco y tarde.
 */
async function crecerOEncoger(c: Corpus): Promise<Siembra | null> {
  const { data: ultima } = await db.from('siembras')
    .select('tick').eq('region_id', c.region.id).eq('tipo', 'crecimiento')
    .order('tick', { ascending: false }).limit(1).maybeSingle()
  const desdeCuando = ultima?.tick ?? null
  if (desdeCuando !== null && c.region.tick - desdeCuando < DIAS_ENTRE_CRECIMIENTOS) return null

  const desde = c.region.tick - VENTANA_DE_CRECIMIENTO
  const { data: evs } = await db.from('events')
    .select('id, kind')
    .eq('region_id', c.region.id)
    .in('kind', ['ensenanza', 'muerte', 'perdida_de_saber'])
    .gt('tick', desde)

  const n = (k: string) => (evs ?? []).filter((e) => e.kind === k)
  const ensenanzas = n('ensenanza')
  const muertes = n('muerte')
  const perdidas = n('perdida_de_saber')

  const bien = ensenanzas.length >= 2 && perdidas.length === 0 && muertes.length === 0
  const mal = perdidas.length >= 1 || muertes.length >= 2
  if (bien === mal) return null   // ni una cosa ni la otra, o las dos: no se mueve

  const antes = c.region.cupo
  const cupo = Math.max(CUPO_MIN, Math.min(CUPO_MAX, antes + (bien ? 1 : -1)))
  if (cupo === antes) return null

  // Los hechos son los eventos que movieron la aguja. Si no hubo ninguno —un
  // valle donde le fue bien pero sin enseñanzas registradas— no se siembra: la
  // tabla lo exige y está bien que lo exija.
  const hechos = [...ensenanzas, ...muertes, ...perdidas].map((e) => `events:${e.id}`)
  if (hechos.length === 0) return null

  await db.from('regions').update({ cupo }).eq('id', c.region.id)
  c.region.cupo = cupo
  return {
    tipo: 'crecimiento',
    que: bien
      ? `El valle sostiene más gente: cupo ${antes} → ${cupo}.`
      : `El valle sostiene menos gente: cupo ${antes} → ${cupo}.`,
    hechos,
    nota: `En los últimos ${VENTANA_DE_CRECIMIENTO} días del valle:`
      + ` ${ensenanzas.length} enseñanzas, ${muertes.length} muertes,`
      + ` ${perdidas.length} saberes perdidos.`,
    tabla: 'regions',
    filaId: c.region.id,
  }
}

// ═════════════════════════════════════════════════════════════════════════
// LA CORRIDA ENTERA
// ═════════════════════════════════════════════════════════════════════════

export async function autorar(opts: {
  regionSlug?: string
  /** Corré aunque no hayan pasado los días. Para probar, no para el cron. */
  forzar?: boolean
} = {}): Promise<Informe> {
  const slug = opts.regionSlug ?? REGION_SLUG
  const c = await leerElValle(slug)
  const deuda = await contarLaDeuda(c)

  // Cuántas veces ya despertó algo en este valle. Sale de `siembras` y no de una
  // columna: el hito ES la siembra, así que contarla es imposible de
  // desincronizar. Despierta cuando la deuda cruza el siguiente múltiplo.
  const { count: hitos } = await db.from('siembras')
    .select('id', { count: 'exact', head: true })
    .eq('region_id', c.region.id).eq('tipo', 'acontecimiento')
  const yaDespertaron = hitos ?? 0
  const despierta = Math.floor(deuda.total / UMBRAL_DEUDA) > yaDespertaron

  const informe: Informe = {
    region: c.region.slug, tick: c.region.tick,
    deuda: deuda.total, desgloseDeuda: deuda.desglose, hitos: yaDespertaron,
    corrio: true, siembras: [], descartes: [], costoUsd: 0, modelos: [],
  }

  const anotar = async (s: Siembra, modelo: string, costo: number) => {
    await db.from('siembras').insert({
      region_id: c.region.id, tick: c.region.tick, tipo: s.tipo, que: s.que,
      de_que: { hechos: s.hechos, nota: s.nota },
      tabla: s.tabla, fila_id: s.filaId ?? null,
      modelo, costo_usd: costo,
    })
    informe.siembras.push(s)
  }

  // ── 1. El pasado, una sola vez en la vida de la región ──────
  //
  // Va primero y fuera del guardia de cadencia: un valle sin pasado tiene que
  // conseguir uno la primera vez que el autor lo mira, no dentro de cuatro días.
  const pasado = await sembrarElPasado(c)
  if (pasado) {
    informe.costoUsd += pasado.costo
    informe.modelos.push(pasado.modelo)
    const porPieza = pasado.costo / Math.max(1, pasado.siembras.length)
    for (const s of pasado.siembras) await anotar(s, pasado.modelo, porPieza)
  }

  // ── 2. El guardia de cadencia ───────────────────────────────
  const { data: ultima } = await db.from('siembras')
    .select('tick').eq('region_id', c.region.id).neq('tipo', 'pasado')
    .order('tick', { ascending: false }).limit(1).maybeSingle()
  const desde = ultima?.tick ?? -1
  if (!opts.forzar && desde >= 0 && c.region.tick - desde < DIAS_ENTRE_CORRIDAS) {
    informe.corrio = false
    informe.porQueNo = `La última siembra fue el día ${desde} y hoy es el ${c.region.tick}.`
      + ` Faltan ${DIAS_ENTRE_CORRIDAS - (c.region.tick - desde)} días del valle.`
    return informe
  }

  // ── 3. Lo que sigue ─────────────────────────────────────────
  // La ventana es la más ancha de las dos: desde la última siembra, o los
  // últimos `VENTANA_MINIMA` días. Ver el comentario de esa constante.
  const hechos = await leerLoQuePaso(c, Math.min(desde, c.region.tick - VENTANA_MINIMA))
  const corrida = await sembrarLaCorrida(c, hechos, deuda, despierta)
  if (corrida) {
    informe.costoUsd += corrida.costo
    informe.modelos.push(corrida.modelo)
    informe.descartes.push(...corrida.descartes)
    const porSiembra = corrida.costo / Math.max(1, corrida.siembras.length)
    for (const s of corrida.siembras) await anotar(s, corrida.modelo, porSiembra)
  }

  // ── 4. El tamaño del valle. Sin modelo: es una cuenta ───────
  const crecio = await crecerOEncoger(c)
  if (crecio) await anotar(crecio, 'ninguno', 0)

  return informe
}

/** El pasado de una región, para que lo pueda consultar cualquiera.
 *
 *  Es la mitad "consultable" del pedido: los NPCs lo pueden mencionar y el
 *  director se puede apoyar en él **citando el id**, porque cada pieza es una
 *  fila de `events` como cualquier otra. Lo mismo está expuesto en SQL como
 *  `pasado_del_valle(slug)` para el que no pase por este módulo — y ése es el
 *  camino que conviene usar desde `dialogo.ts` y `director.ts`, que no tienen
 *  por qué importar el archivo que habla con el modelo. */
export async function pasadoDelValle(regionId: string) {
  const { data } = await db.from('events')
    .select('id, tick, summary, place_id, detail')
    .eq('region_id', regionId).eq('kind', 'pasado').lt('tick', 0)
    .order('tick', { ascending: true })
  return data ?? []
}

// ═════════════════════════════════════════════════════════════════════════
// A MANO
// ═════════════════════════════════════════════════════════════════════════

if (process.argv[1]?.endsWith('autor.ts')) {
  const forzar = process.argv.includes('--forzar')
  const slug = process.argv.find((a) => a.startsWith('--region='))?.slice(9)
  const r = await autorar({ regionSlug: slug, forzar })

  console.log(`\n── El autor pasó por ${r.region}, día ${r.tick} del valle ──\n`)
  console.log(`Deuda del mundo: ${r.deuda} puntos`
    + ` (umbral ${UMBRAL_DEUDA}, ya despertaron ${r.hitos}).`)
  for (const [k, v] of Object.entries(r.desgloseDeuda)) {
    if (v > 0) console.log(`   ${String(v).padStart(3)} × ${k}`)
  }
  console.log()

  if (!r.corrio) {
    console.log(`No sembró nada nuevo. ${r.porQueNo}`)
  } else if (r.siembras.length === 0) {
    console.log('No sembró nada. El período no dio material, y eso es una respuesta correcta.')
  } else {
    for (const s of r.siembras) {
      console.log(`▸ ${s.tipo.toUpperCase()}  ${s.que}`)
      console.log(`    porque: ${s.nota}`)
      console.log(`    salió de: ${s.hechos.join(', ')}`)
      console.log(`    quedó en: ${s.tabla}${s.filaId ? ` · ${s.filaId}` : ''}`)
      console.log()
    }
  }
  if (r.descartes.length > 0) {
    console.log('Descartado, y por qué:')
    for (const d of r.descartes) console.log(`  ✗ ${d}`)
    console.log()
  }
  console.log(`— ${r.siembras.length} siembras, ${r.descartes.length} descartes,`
    + ` ${r.modelos.join(' + ') || 'sin modelo'}, USD ${r.costoUsd.toFixed(6)}`)
}
