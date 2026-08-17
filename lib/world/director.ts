/**
 * El director. Lee el mundo, escribe la crónica. NO TOCA EL ESTADO.
 *
 *   pnpm look Pedro
 *
 * Dos reglas que hacen válido el experimento:
 *
 *  1. Sólo puede narrar hechos que están en los eventos que se le pasan. Cada
 *     afirmación tiene que apuntar a un id. Lo que narre fuera de esa lista es
 *     una alucinación y el script la detecta y la reporta.
 *
 *  2. Recibe el estado completo del mundo, no sólo el delta. Las agendas de los
 *     NPCs avanzaron mientras el jugador no estaba, y el director tiene que
 *     adaptarse a dónde quedaron las cosas — su trabajo no es hacer que pasen
 *     cosas, es traerlas al campo de visión del jugador.
 *
 * Lo que aprendimos rompiéndolo, y por qué el archivo está armado así:
 *
 *  - **El contexto se narra.** Todo lo que entra al prompt sale en la crónica
 *    como si hubiera pasado, por más que el sistema diga que no. La primera
 *    auditoría contra la base encontró crónicas enteras hechas de contexto:
 *    con la ventana vacía el director recitaba la lista de NPCs, y con hechos
 *    inventaba testigos y deudas alrededor de ellos. La defensa no es pedirle
 *    mejor que no lo haga: es **no mandarle lo que no queremos leer**.
 *
 *  - **Sin hechos no se llama al modelo.** No hay prompt que arregle una
 *    crónica sobre nada. Se corta antes y sale gratis.
 */
import { db, getRegion } from '../db.js'
import { pedirJson } from '../modelo.js'

/**
 * Lo que se le contesta al jugador cuando la ventana viene vacía. Es texto
 * fijo a propósito: no hay nada que narrar, y pedirle al modelo que narre nada
 * es exactamente cómo aparecieron las crónicas-planilla.
 */
const NADA_QUE_CONTAR =
  'El valle siguió en lo suyo. No pasó nada que valga la pena contarte todavía.'

const SYSTEM = `Sos el director de un mundo de fantasía persistente. Un jugador
vuelve después de un rato y tienes que contarle qué pasó mientras no estaba.

LA REGLA QUE NO SE ROMPE
Sólo existe lo que está en el bloque HECHOS. Cada cosa que afirmes —que alguien
hizo algo, que estuvo en un lugar, que vio, dijo, sintió, ayudó o le debe algo a
otro— tiene que salir de un hecho de esa lista. Lo demás no pasó.

Nombrar a alguien ya es afirmar que estuvo ahí. Si una persona no aparece en
ningún hecho, no la metas en la escena: ni de testigo, ni de la que ayudó, ni de
la que se enteró. Ése es el error más caro y el más fácil de cometer.

Y los hechos de otros son de otros. En el valle hay más jugadores: si un hecho
dice que alguien le enseñó a Pedro, o que empezó a confiar en Pedro, eso le pasó
a Pedro. No se lo pases al que está leyendo. El jugador que lee es el que se
nombra en el fichero como "Jugador".

CUANDO EL HECHO NO DICE QUIÉN, NO LO ELIJAS VOS
Que alguien viva en un lugar no quiere decir que estuvo ahí cuando pasó el
hecho. Dos hechos en el mismo lugar no son dos personas juntas. Si un hecho no
nombra a quien hizo algo, cuéntalo sin nombre —"alguien", "no sabes quién"— o no
lo cuentes. Nunca elijas un candidato del fichero para llenar el hueco.

Éste es el error, escrito para que lo reconozcas: un hecho dice que el jugador
se levantó en Vado Bajo, y el fichero dice que Odila vive en Vado Bajo. De ahí
NO sale que Odila lo levantó, ni que lo vio, ni que le debe un favor. Sale que
se levantó en Vado Bajo y nada más.

Y si una parte de un hecho es ambigua —no se entiende de quién habla—, esa parte
no se cuenta. "Le entró a Fulano y sigue en pie" no dice quién sigue en pie: no
lo resuelvas, sáltalo.

LO QUE SÍ ES TU TRABAJO
Elegir qué contar primero, conectar dos hechos entre sí, darle voz a lo que la
gente dice, y sugerirle al jugador a dónde ir. La sugerencia va en condicional y
se nota que es tuya: "si quieres aprender a destilar, Odila sabe" es una
sugerencia; "Odila te espera" es un hecho inventado.

LOS MOTIVOS TAMPOCO SE INVENTAN
Por qué alguien hizo algo, qué sintió, qué pensó antes, qué le debe a quién y
qué todavía no haría: nada de eso pasó salvo que un hecho lo diga. Una deuda
inventada es tan grave como una muerte inventada y se nota mucho menos. Y una
negación también es una afirmación: "nadie más sabe eso", "todavía no está lista
para enseñarte" y "eso no estaba al alcance de nadie" son hechos, y los tienes
que poder señalar en la lista o no van.

EL BLOQUE FICHERO NO SE NARRA
Es un índice: quién es quién, qué oficio tiene, dónde vive, qué sabe, qué anda
queriendo. Está para que entiendas los hechos y para que sepas a quién sugerir.
Nada de ahí sucedió. Lo que alguien quiere no es algo que hizo. Si tu crónica se
puede leer como un repaso de la gente del valle, la escribiste desde el fichero
y está mal: tiene que leerse como lo que le pasó al mundo estos días.

LOS HECHOS VIENEN MAL ESCRITOS Y ES ASÍ
Los redacta la máquina, en seco y a veces torcidos. No los copies literal:
cuéntalos con tus palabras. Si un hecho es ambiguo sobre quién le hizo qué a
quién, quédate con la lectura más pequeña o no lo cuentes. Si algo suena a que
alguien murió y no es un hecho de muerte, no murió nadie.

NUNCA uses el vocabulario del sistema. El jugador no sabe que existen los ticks,
los porcentajes, las agendas ni los estados internos. Palabras prohibidas: tick,
progreso, porcentaje, estado, agenda, evento. Se dice "hace unos días", no
"hace tres ticks".

Y no le digas al jugador qué tan cerca está alguien de conseguir algo, ni cuánto
lo quiere o lo teme. Eso no lo puede saber salvo que alguien se lo cuente o que
esté en un hecho. Podés decir que Marta anda marcando sendas; no que le falta
poco. Podés contar que Ilde salió a defenderlo si hay un hecho que lo diga; no
que Ilde lo tiene en alta estima. Tampoco "ya casi", "le falta poco" ni "está
cerca" para que alguien enseñe o confíe: o hay un hecho que lo dice, o no se
dice.

No enumeres a la gente del valle uno por uno — eso es una planilla con prosa.
Pero tampoco te quedes corto: si hay muchos hechos, elige los cinco o seis que
más le cambian algo al jugador y cuéntalos con detalle. Un valle donde pasaron
quince cosas y le cuentas tres se siente vacío sin serlo. Cuando varios hechos
son el mismo hecho repetido —la misma charla, el mismo avance—, cuéntalo una vez
sola pero citá todos los que resumiste. Y una cadena de cosas que le pasaron a
una misma persona vale más que cinco hechos sueltos: no te comas un arco entero.

Prioriza, en este orden: muertes y saberes perdidos; lo que le pasó al jugador
o a su nombre; enseñanzas y oficios nuevos; conflictos entre personas; el resto.

Escribe en segunda persona, tuteando, de uno a tres párrafos cortos.

EL IDIOMA DEL MUNDO. Castellano llano con peso. Ni voseo ni "acá": es "tú",
"mira", "aquí". Nada de arcaísmo de disfraz —ni "vos sois", ni "he menester",
ni juramentos de teatro— y nada de palabras de hoy. Concreto antes que
grandilocuente: "el fuego está bajo" vale más que "las brasas agonizan en el
hogar". La crónica es la voz del mundo y tiene que sonar como la gente que
aparece en ella.
Empieza por lo que más le importa al jugador. Si alguien murió llevándose un
saber, eso va primero. Si de los hechos sale algo concreto que le convenga
mirar, cierra con eso; si no sale, termina y ya. Rellenar es peor que ser breve.`

const SCHEMA = {
  type: 'object',
  properties: {
    text: {
      type: 'string',
      description: 'La crónica para el jugador. De uno a tres párrafos cortos.',
    },
    used_event_ids: {
      type: 'array',
      items: { type: 'string' },
      description: 'Etiquetas de HECHOS que respaldan lo que narraste (h1, h2, …). Sólo de la lista dada.',
    },
  },
  required: ['text', 'used_event_ids'],
  additionalProperties: false,
} as const

export type Cronica = {
  text: string; leidos: number; usados: number; inventados: string[]
  /**
   * Gente nombrada en la crónica que no aparece en ningún hecho de la ventana.
   * No es lo mismo que `inventados` —que son ids que no existen— y es el
   * agujero que ese chequeo no ve: el director puede citar ids válidos y
   * poblar la escena con testigos que nadie puso ahí. Es una señal, no un
   * error: sugerir a alguien en condicional es legítimo. Un número que sube
   * crónica tras crónica, no.
   */
  sinRespaldo: string[]
  model: string; inTokens: number; outTokens: number; costUsd: number
}

export type Opciones = {
  model?: string
  effort?: 'low' | 'medium' | 'high'
  /** No escribe la crónica ni mueve al jugador. Para comparar modelos. */
  dryRun?: boolean
}

/** Cuánto hace, en días del valle, sin decir la palabra prohibida. */
function hace(dias: number): string {
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  return `hace ${dias} días`
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Nombre suelto, con bordes de palabra: "Ren" sí, "arrendar" no. */
function nombrado(nombre: string, texto: string): boolean {
  const corto = nombre.includes(' ') ? nombre.split(' ').pop()! : nombre
  if (corto.length < 3) return false
  return new RegExp(`(^|[^\\p{L}])${escapar(corto)}([^\\p{L}]|$)`, 'iu').test(texto)
}

export async function narrate(playerName: string, opts: Opciones = {}): Promise<Cronica> {
  const model = opts.model ?? process.env.DIRECTOR_MODEL ?? 'claude-opus-5'
  const effort = opts.effort ?? (process.env.DIRECTOR_EFFORT as 'low' | undefined) ?? 'low'
  const region = await getRegion()

  const { data: player } = await db
    .from('players').select('id, name, place_id, last_seen_tick')
    .eq('region_id', region.id).ilike('name', playerName).maybeSingle()
  if (!player) throw new Error(`No hay ningún jugador llamado "${playerName}".`)

  // ── HECHOS: lo único que puede narrar ─────────────────────
  let events = (await db
    .from('events')
    .select('id, tick, kind, summary, place_id, detail')
    .eq('region_id', region.id)
    .gt('tick', player.last_seen_tick)
    // Las conversaciones NO entran. Se midió: 111 en cinco días contra 4
    // agendas cumplidas y 1 enseñanza. Como el corte son los 60 más viejos,
    // la ventana del director se llenaba de "fulano habló con mengano" y lo
    // que de verdad pasó quedaba afuera por peso, no por importancia.
    //
    // Y además es lo MENOS narrable que hay: el jugador estuvo ahí, leyó lo
    // que le dijeron, y ya lo sabe. Lo que sale de una charla —que te
    // enseñaron, que te encargaron algo, que te ganaste a alguien— tiene su
    // propio tipo de evento y ése sí entra.
    .neq('kind', 'conversacion')
    .order('tick', { ascending: true })
    .limit(60)).data ?? []

  // ── Sin hechos no hay crónica, y no se llama al modelo ────
  //
  // Es el corte más barato del archivo y el que cierra la fuga más grande.
  // Con la ventana vacía el director no se callaba: vaciaba el fichero de NPCs
  // en prosa y la auditoría daba limpio porque no citaba ningún id. No hay
  // prompt que arregle eso — lo que hay es no preguntar.
  //
  // Tampoco se escribe crónica ni se mueve `last_seen_tick`: una crónica sin
  // hechos no es una crónica, y adelantar la marca sin nada que contar sólo
  // sirve para achicarle la ventana al jugador la próxima vez.
  if (!events.length) {
    return {
      text: NADA_QUE_CONTAR,
      leidos: 0, usados: 0, inventados: [], sinRespaldo: [],
      model: '(ninguno)', inTokens: 0, outTokens: 0, costUsd: 0,
    }
  }

  // Caminar no es noticia.
  //
  // El cliente 3D reporta en qué lugar estás parado, y cada cambio deja un
  // evento `llegada`. En una sesión de veinte minutos eso son decenas: en la
  // última crónica el director leyó 60 hechos y usó 2, y el párrafo de arriba
  // era un itinerario. Ahogan a todo lo demás por peso, no por importancia.
  //
  // Se colapsan a uno solo, y se lo dice en una línea en vez de enumerarlo.
  // El movimiento propio del jugador es contexto, no suceso — él ya sabe por
  // dónde caminó.
  {
    const de = (e: { detail?: unknown }) => (e.detail ?? {}) as { player?: string; place?: string }
    const propias = events.filter((e) => e.kind === 'llegada' && de(e).player === player.name)
    if (propias.length > 2) {
      const lugares = [...new Set(propias.map((e) => de(e).place).filter(Boolean))]
      const primera = propias[0]!
      events = events.filter((e) => !propias.includes(e) || e === primera)
      primera.summary = `${player.name} anduvo por ${lugares.join(', ')}.`
    }
  }

  // ── FICHERO: el índice, no la novela ──────────────────────
  //
  // Todo lo que entra acá el modelo lo lee como narrable, así que la pregunta
  // en cada campo es "¿el jugador puede saber esto?". Lo que no pasa el filtro
  // no se consulta siquiera: los vínculos (valorado/temido) y las memorias de
  // los NPCs salieron de acá porque son las dos cosas que más se narraron como
  // hechos. `valued 44` volvía como "te tiene en alta estima", y una memoria
  // de hace treinta días —redactada en primera persona, lista para copiar—
  // volvía como algo que acababa de pasar. Lo que el jugador se ganó con la
  // gente ya le llega por los hechos `confianza`, que es el canal correcto.
  const [places, people, agendas, sabe] = await Promise.all([
    db.from('places').select('id, name, kind').eq('region_id', region.id),
    db.from('people').select('id, name, trade, place_id, disposition, teaches, alive')
      .eq('region_id', region.id),
    db.from('agendas').select('person_id, goal, state')
      .in('state', ['activa', 'bloqueada']),
    db.from('knows').select('holder_kind, holder_id, knowledge:knowledge_id (name)'),
  ])

  const placeName = (id: string | null | undefined) =>
    places.data?.find((p) => p.id === id)?.name ?? '—'
  const knowsOf = (kind: string, id: string) =>
    (sabe.data ?? [])
      .filter((k) => k.holder_kind === kind && k.holder_id === id)
      .map((k) => (k.knowledge as unknown as { name: string } | null)?.name)
      .filter(Boolean)

  const vivos = (people.data ?? []).filter((p) => p.alive)
  const muertos = (people.data ?? []).filter((p) => !p.alive)

  const mundo = [
    `Región: ${region.name}. El jugador estuvo por última vez ${hace(region.tick - player.last_seen_tick)}.`,
    `Jugador: ${player.name}, en ${placeName(player.place_id)}. Sabe: ${knowsOf('player', player.id).join(', ') || 'nada todavía'}.`,
    '',
    'Gente (índice, no novedades):',
    ...vivos.map((p) => {
      const suyas = (agendas.data ?? []).filter((a) => a.person_id === p.id)
      return [
        `- ${p.name} · ${p.trade} · vive en ${placeName(p.place_id)} · ${p.disposition}`,
        `  sabe: ${knowsOf('person', p.id).join(', ') || 'nada registrado'}`,
        // Sin porcentajes a propósito: si se los pasamos, el director se los
        // cuenta al jugador, y el jugador no tiene forma de saberlos. Lo único
        // que agrega valor es si la meta está trabada, porque eso sí se nota.
        suyas.length
          ? `  anda queriendo (no es algo que hizo): ${suyas.map((a) => a.goal + (a.state === 'bloqueada' ? ' — trabada' : '')).join(' | ')}`
          : '',
        p.teaches ? '' : '  no enseña',
      ].filter(Boolean).join('\n')
    }),
    // Los muertos van sólo para que no los nombres como vivos. Su muerte ya se
    // contó el día que pasó; volver a contarla es novedad falsa.
    muertos.length
      ? `\nYa no están (no son novedad, no los cuentes como vivos): ${muertos.map((p) => p.name).join(', ')}.`
      : '',
  ].filter((l) => l !== '').join('\n')

  // Etiquetas cortas en vez de uuids: sesenta uuids son ~600 tokens de puro
  // ruido que el modelo además transcribe mal. `h3` lo cita bien y sale gratis.
  const etiqueta = new Map(events.map((e, i) => [`h${i + 1}`, e.id]))
  const hechos = events
    .map((e, i) => `[h${i + 1}] ${hace(region.tick - e.tick)} · ${e.kind} · ${placeName(e.place_id)} — ${e.summary}`)
    .join('\n')

  // Sin `respaldo` a propósito: una crónica que no salió es un fallo y tiene
  // que reventar acá. Inventarle un texto vacío al jugador sería peor, y
  // taparía justo el modo de falla que el experimento busca medir.
  const { datos: chronicle, inTokens, outTokens, costUsd } = await pedirJson<{
    text: string; used_event_ids: string[]
  }>({
    modelo: model,
    esfuerzo: effort,
    maxTokens: 4000,
    schema: SCHEMA,
    system: SYSTEM,
    prompt: `FICHERO (índice; nada de esto sucedió)\n${mundo}\n\nHECHOS (lo único que pasó y lo único que puedes afirmar)\n${hechos}`,
  })

  // ── Auditoría 1: ¿citó hechos que no existen? ─────────────
  const usados = chronicle.used_event_ids.map((s) => s.trim())
  const inventados = usados.filter((id) => !etiqueta.has(id))
  const reales = usados.map((id) => etiqueta.get(id)).filter((id): id is string => !!id)

  // ── Auditoría 2: ¿pobló la escena con gente que no estuvo? ─
  //
  // El chequeo de ids no ve el modo de falla que más apareció: citar tres ids
  // válidos y meter alrededor a un testigo, un deudor o un salvador que no
  // están en ningún hecho. Acá se busca al revés — de la crónica a los hechos.
  // Nombrar a alguien que no aparece en la ventana no siempre es mentira (una
  // sugerencia en condicional es legítima), por eso sale como señal y no como
  // error. Pero es el número que hay que mirar cuando se toca el prompt.
  const enHechos = events.map((e) => e.summary).join('\n')
  const sinRespaldo = (people.data ?? [])
    .map((p) => p.name)
    .filter((n) => n.toLowerCase() !== player.name.toLowerCase())
    .filter((n) => nombrado(n, chronicle.text) && !nombrado(n, enHechos))

  if (!opts.dryRun) {
    await db.from('chronicles').insert({
      player_id: player.id,
      from_tick: player.last_seen_tick,
      to_tick: region.tick,
      text: chronicle.text,
      source_events: reales,
    })
    await db.from('players').update({ last_seen_tick: region.tick }).eq('id', player.id)
  }

  return {
    text: chronicle.text.trim(),
    leidos: events.length,
    usados: usados.length,
    inventados,
    sinRespaldo,
    model, inTokens, outTokens, costUsd,
  }
}

if (process.argv[1]?.endsWith('director.ts')) {
  const name = process.argv[2]
  if (!name) {
    console.error('uso: pnpm look <nombre-jugador>')
    process.exit(1)
  }
  const c = await narrate(name)
  console.log('\n' + c.text + '\n')
  if (c.inventados.length) {
    console.error(`⚠ El director citó ${c.inventados.length} hecho(s) inexistente(s): ${c.inventados.join(', ')}`)
    console.error('  Eso es una alucinación — el modo de falla que el experimento busca.')
  }
  if (c.sinRespaldo.length) {
    console.error(`⚠ Nombró a ${c.sinRespaldo.join(', ')} sin ningún hecho que los ponga en escena.`)
    console.error('  Puede ser una sugerencia legítima; si no lo es, es un testigo inventado.')
  }
  console.log(`— ${c.leidos} hechos leídos, ${c.usados} usados.`)
}
