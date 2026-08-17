/**
 * Lo que te dicen al pasar. Escrito por el modelo, guardado en la base.
 *
 * Hubo un intento previo con frases fijas derivadas del vínculo: tres por
 * escalón de confianza, elegidas por el hash del nombre. Instantáneo, gratis,
 * y se notó en el primer minuto — Bruno te decía siempre exactamente lo mismo.
 * **Un saludo que no cambia es un cartel.**
 *
 * Lo contrario tampoco sirve: llamar al modelo cada vez que pasás al lado de
 * alguien son setecientos milisegundos de espera para algo que tiene que salir
 * en el mismo cuadro en que te acercás, y una llamada por cada cruce en un
 * valle donde la gente camina todo el tiempo.
 *
 * Entonces se separa **cuándo se escriben** de **cuándo se usan**. Se escriben
 * de a tandas, en la voz de cada persona y a partir de lo que está viviendo, y
 * se guardan en `people.saludos`. Servir uno cuesta una lectura que ya se hacía
 * igual. Se rehacen sólo cuando cambia algo que importa: lo que persigue, o
 * cuánta confianza te tiene.
 *
 * Eso último es lo que los hace valer la pena y no ser adorno: **el saludo te
 * cuenta en qué anda esa persona.** Si Ilde está trabada con el carbón, te lo
 * suelta al pasar, y te enterás de que hay algo que hacer sin abrir un menú ni
 * frenarte a conversar.
 *
 * No importa ningún SDK: pasa por `modelo.ts`, así que el proveedor sigue
 * saliendo de una variable de entorno.
 *
 * ── La huella tenía un agujero, y era grande ─────────────────────────────
 *
 * `saludos_de` decidía si había que rehacerlos, y sólo miraba las metas. O sea:
 * **cambiar la voz de alguien no invalidaba nada.** Sus saludos guardados —los
 * había escrito el modelo leyendo la voz vieja— quedaban buenos para siempre y
 * el cron pasaba de largo. Ya había mordido una vez (ver
 * `20260817090000_voces_de_registro.sql`, que tuvo que poner `saludos_de = null`
 * a mano) y volvió a morder ahora, en grande: el valle entero cambió de
 * registro y las dieciocho líneas guardadas de cada persona seguían en
 * rioplatense.
 *
 * Ahora la huella incluye la VOZ y la PROCEDENCIA, que es de donde sale el
 * habla. Y lleva delante una versión (`v2:`): si mañana cambia la RECETA —qué
 * entra en la huella, o cómo es el prompt de acá abajo— basta con subir ese
 * número para que se rehaga todo, sin tener que adivinar qué dato cambió.
 */
import { db } from '../db.js'
import { pedirJson } from '../modelo.js'

/** Los escalones de confianza. Son los mismos cortes que usa el resto del
 *  juego para decidir qué te dejan hacer — si se separan, el saludo empieza a
 *  prometer cosas que después no pasan. */
export type Escalon = 'teme' | 'bronca' | 'nadie' | 'ubica' | 'confia' | 'fe'

export function escalonDe(valued: number, feared: number): Escalon {
  if (feared >= 25 && feared > valued) return 'teme'
  if (valued < 0) return 'bronca'
  if (valued < 5) return 'nadie'
  if (valued < 15) return 'ubica'
  if (valued < 35) return 'confia'
  return 'fe'
}

// Las claves son identificadores internos y se quedan como están: viajan a
// `people.saludos` como llaves del jsonb y las lee `web.ts`. Lo que cambió es
// la descripción, que es lo único que ve el modelo.
const COMO_TE_TRATA: Record<Escalon, string> = {
  teme: 'te tiene miedo y no lo disimula bien',
  bronca: 'te guarda rencor por algo',
  nadie: 'no sabe bien quién eres: te conoce de vista y nada más',
  ubica: 'ya te tiene medido, pero todavía no confía',
  confia: 'empieza a confiar en ti: ya te pediría un favor',
  fe: 'te tiene fe — pero seguís siendo alguien que pasa caminando, no una visita',
}

// El prompt está en el mismo castellano llano que se le pide de vuelta, y por
// el mismo motivo que en `dialogo.ts`: un prompt escrito en voseo produce
// voseo por imitación aunque el texto pida otra cosa.
const SYSTEM = `Escribes lo que un habitante de un valle de fantasía dice o hace
cuando alguien le pasa al lado. NO es una conversación: es el segundo en que
levanta la vista.

Te doy quién es, cómo habla, de dónde es y qué está persiguiendo ahora.
Devuelves TRES variantes para cada uno de los seis grados de confianza que
puede tenerle a quien pasa. Dieciocho líneas en total, en una sola respuesta.

LO MÁS IMPORTANTE, Y ES DONDE SE FALLA: **es un cruce, no una escena.**
La persona levanta la vista y sigue con lo suyo. Ni siquiera para de trabajar.
Aunque te tenga muchísima confianza, lo que dice al pasar es chico: un gesto,
media frase, una queja del día. **Nada de declaraciones.** "Confío en ti más
que en mis propias manos" es algo que se dice una vez en la vida sentado, no
algo que se suelta cuando alguien pasa caminando — y si se dice al pasar, la
próxima vez que pase suena ridículo.

Regla dura: si la frase sólo tiene sentido dicha UNA vez, no sirve. Estas
líneas se van a oír muchas veces, así que tienen que aguantar la repetición
como aguanta un "buen día".

CÓMO TIENEN QUE SER:
- Cortísimas. Una línea. Muchas veces ni siquiera habla: "Ilde no levanta la
  vista del yunque" también es un saludo.
- Mezcla las dos formas: algunas son algo que dice (con guion de diálogo),
  otras son algo que hace. Tres frases habladas seguidas suenan a coro.
- **Que se le note en qué anda.** Si está atascado con algo, que se le escape.
  Es la mitad del valor: el que pasa se entera de que hay algo pasando sin
  detenerse a conversar.
- Las tres tienen que ser distintas entre sí, no la misma con otras palabras.
  Distinto comienzo, distinto largo, distinto registro.

EL IDIOMA DEL MUNDO, que ninguna voz cambia:
- Castellano llano y bien escrito. Aquí nadie dice "vos", ni "che", ni "mi
  amor", ni "dale". Tuteo o usted según lo que digan su voz y su procedencia.
- Tampoco se habla como en un libro viejo: nada de "vos sois", "he menester" ni
  "buen señor" de adorno. Esta gente trabaja; no declama.
- Nada de palabras de hoy ni de otro idioma: ni "vale", ni "o sea", ni "tipo",
  ni "ok", ni diminutivos de confianza moderna.
- Se dice "aquí" y "allí", nunca "acá" ni "allá".
- Concreto antes que grandilocuente. "El fuego está bajo hoy" vale más que "las
  brasas agonizan en el hogar".
- Cómo nombra los lugares y en qué mide sale de DE DÓNDE ES. El que llegó de
  fuera no nombra este valle como el que nació en él.

REGLAS QUE NO SE ROMPEN:
- Sólo puedes mencionar lo que está en los datos que te doy. Nada inventado: ni
  sucesos, ni gente, ni lugares, ni objetos.
- Nada de números, porcentajes ni nombres de sistemas.
- No prometas nada nunca. Un saludo no puede ofrecer un trato.
- No preguntes "¿en qué puedo ayudarte?". Nadie habla así.
- No uses el nombre de la otra persona más de una vez entre las tres.`

/** Los seis grados en una sola llamada.
 *
 *  Se hizo así después de que la primera versión —una llamada por grado— se
 *  pasara del tiempo de la función: seis personas por seis grados eran treinta
 *  y seis llamadas en un request. Y además es más barato: el grueso del prompt
 *  es quién es la persona, y eso se paga una vez en vez de seis.
 *
 *  Sin `minItems`/`maxItems`: la salida estructurada sólo acepta 0 o 1 ahí. La
 *  cantidad se pide en la descripción y se garantiza en código, que es donde
 *  hay que garantizarla igual. */
const lista = (que: string) => ({
  type: 'array', items: { type: 'string' },
  description: `Tres variantes para cuando ${que}.`,
})
const SCHEMA = {
  type: 'object',
  properties: {
    teme: lista('esa persona le da miedo'),
    bronca: lista('le tiene bronca a esa persona'),
    nadie: lista('no sabe quién es'),
    ubica: lista('la ubica pero no confía'),
    confia: lista('empieza a confiar'),
    fe: lista('le tiene fe y le confiaría lo suyo'),
  },
  required: ['teme', 'bronca', 'nadie', 'ubica', 'confia', 'fe'],
  additionalProperties: false,
} as const

type Persona = {
  id: string; name: string; trade: string; disposition: string
  voice: string | null; historia: string | null; procedencia: string | null
  saludos: Record<string, string[]> | null
  saludos_de: string | null
}

/** La versión de la RECETA, no de los datos. Subirla rehace los saludos de todo
 *  el mundo sin tener que tocar ninguna fila: es la salida cuando lo que cambió
 *  es el prompt de acá arriba y no la persona. */
const RECETA = 'v3'   // v3: el saludo es un cruce, no una escena

/** Hash chico y estable. La huella se guarda en `people.saludos_de` y se lee en
 *  cada barrido del cron: meterle adentro los cuatrocientos caracteres de una
 *  voz sería pagar el texto entero por persona para comparar igualdad. */
function hash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/** La huella del estado del que salieron los saludos. Si cambia, hay que
 *  rehacerlos.
 *
 *  Entran tres cosas y las tres por un motivo distinto:
 *
 *    · las METAS — un saludo que habla de algo que la persona ya cumplió es
 *      peor que uno genérico;
 *    · la VOZ y la PROCEDENCIA — son de donde sale el habla, y sin ellas
 *      cambiarle el registro a alguien no invalidaba nada. Ése era el agujero:
 *      los saludos guardados sobrevivían a su propia voz.
 *
 *  El escalón de confianza NO entra, y eso es un arreglo: el parámetro existía
 *  y siempre se llamaba con el mismo valor, porque los seis escalones se
 *  generan de una sola vez y se guardan juntos. Era ruido que aparentaba ser
 *  una dimensión. */
function huella(metas: string[], voz: string | null, procedencia: string | null): string {
  return `${RECETA}:${hash([...metas].sort().join('·') + '¦' + (voz ?? '') + '¦' + (procedencia ?? ''))}`
}

/**
 * El colador del rioplatense.
 *
 * Acá sí vale filtrar en código, y en `dialogo.ts` no, y la diferencia es lo
 * que se pierde al tirar una línea. Una respuesta de diálogo es única y en
 * vivo: descartarla deja al jugador frente a alguien que no contesta, que es
 * peor que un "vos". Un saludo es una de dieciocho, se GUARDA y se sirve
 * durante días: una sola línea con voseo se ve cientos de veces, y sobran
 * diecisiete para reemplazarla.
 *
 * Y hacía falta, medido: con el prompt ya corregido, la primera tanda devolvió
 * 126 líneas y 10 traían voseo — ocho de ellas de una sola persona. Pedirle al
 * modelo que no lo haga baja la tasa; no la lleva a cero.
 *
 * La lista son marcas inequívocas y siempre CON TILDE, que es lo único que las
 * hace inequívocas: "sabes" es tuteo y se queda, "sabés" es voseo y se va;
 * "pasa" es tuteo y se queda, "pasá" se va. Meter las variantes sin tilde
 * "por las dudas" convierte el colador en una máquina de falsos positivos —
 * se probó, y se comía "Pasa, pasa, que aquí no hay nada que te sirva".
 *
 * Y los bordes van con lookaround y `\p{L}`, no con `\b`. En JavaScript `\b`
 * es ASCII: para el motor, la "á" no es letra, así que hay borde entre "mir" y
 * "á" y `\bmirá\b` casa dentro de "mirándote". También se probó, y también se
 * comió una línea buena.
 */
const RIOPLATENSE = new RegExp(
  '(?<!\\p{L})(' + [
    'vos', 'sos', 'acá', 'allá', 'che', 'boludo', 'o sea', 'mi amor',
    // Presentes de voseo. Todos llevan tilde y ninguno existe en tuteo.
    'tenés', 'querés', 'podés', 'sabés', 'hacés', 'ponés', 'decís', 'venís', 'traés',
    'andás', 'mirás', 'contás', 'pensás', 'dejás', 'llevás', 'creés', 'debés', 'vivís',
    // Imperativos de voseo. No entran "salí", "seguí" ni "elegí": son también el
    // pretérito de primera persona ("yo salí"), y eso es castellano de todos.
    'mirá', 'contá', 'tomá', 'dejá', 'vení', 'decí', 'andá', 'pasá', 'esperá', 'traé',
    'poné', 'hacé',
    // Éstos no llevan tilde y aun así son inequívocos: el tuteo los acentúa
    // ("fíjate", "acuérdate", "quédate", "cállate", "siéntate").
    'fijate', 'acordate', 'quedate', 'callate', 'sentate',
  ].join('|') + ')(?!\\p{L})',
  'iu',
)

/**
 * Rehace los saludos de la gente cuyo estado cambió.
 *
 * `limite` existe para no gastar todo de una en un valle grande: se refrescan
 * de a poco, y mientras tanto se sigue sirviendo lo viejo, que es peor pero
 * nunca está mal.
 */
export async function refrescarSaludos(regionId: string, limite = 3): Promise<{
  revisados: number; rehechos: number; costUsd: number
}> {
  const gente = ((await db.from('people')
    .select('id, name, trade, disposition, voice, historia, procedencia, saludos, saludos_de')
    .eq('region_id', regionId).eq('alive', true)).data ?? []) as unknown as Persona[]

  let rehechos = 0
  let costUsd = 0

  for (const q of gente) {
    if (rehechos >= limite) break

    const metas = ((await db.from('agendas')
      .select('goal, state').eq('person_id', q.id)
      .in('state', ['activa', 'bloqueada'])).data ?? [])
      .map((a) => a.goal + (a.state === 'bloqueada' ? ' (y está trabado)' : ''))

    const escalones: Escalon[] = ['teme', 'bronca', 'nadie', 'ubica', 'confia', 'fe']
    const h = huella(metas, q.voice, q.procedencia)
    if (q.saludos_de === h && q.saludos && Object.keys(q.saludos).length === escalones.length) {
      continue
    }

    const ctx = [
      `Eres ${q.name}, ${q.trade}. ${q.disposition}`,
      q.voice ? `Cómo hablas: ${q.voice}` : '',
      // La procedencia va pegada a la voz y separada de la historia por la
      // misma razón que en `dialogo.ts`: una dice cómo suena, la otra qué le
      // pasó, y mezcladas el modelo narra la biografía en vez de hablar.
      q.procedencia ? `De dónde eres y cómo se te nota: ${q.procedencia}` : '',
      q.historia ? `Lo que te pasó: ${q.historia}` : '',
      metas.length
        ? `Ahora vas detrás de: ${metas.join('; ')}.`
        : 'No persigues nada en particular.',
      '',
      'Los seis grados, en orden:',
      ...escalones.map((e) => `- ${e}: alguien de quien ${COMO_TE_TRATA[e]}.`),
      // El recordatorio del idioma se repite al final, igual que el `cierre` de
      // `dialogo.ts`. Dicho una sola vez arriba del system prompt se diluye:
      // en la primera tanda, ocho de las dieciocho líneas de Tobio salieron en
      // voseo con la prohibición puesta.
      '',
      'Escribe las dieciocho en castellano llano: nada de "vos", "acá", "che" ni ' +
      'palabras de hoy, y tampoco de libro viejo. Se dice "tú" o "usted" según su voz, ' +
      'y "aquí", nunca "acá".',
    ].filter(Boolean).join('\n')

    const r = await pedirJson<Record<Escalon, string[]>>({
      system: SYSTEM, prompt: ctx, schema: SCHEMA, maxTokens: 1400,
      modelo: process.env.DIALOGO_MODEL ?? 'claude-haiku-4-5',
      respaldo: Object.fromEntries(
        escalones.map((e) => [e, [`${q.name} levanta la vista un segundo.`]]),
      ) as Record<Escalon, string[]>,
    })
    costUsd += r.costUsd

    const juego: Record<string, string[]> = {}
    let coladas = 0
    for (const e of escalones) {
      // Si devolvió de menos, se sirve igual: tres es lo ideal, una es mejor
      // que ninguna. Y lo mismo con las que caza el colador: se van y se sirve
      // con las que quedan.
      const todas = (r.datos[e] ?? [])
        .map((l) => String(l).trim()).filter((l) => l.length > 0).slice(0, 5)
      const limpias = todas.filter((l) => !RIOPLATENSE.test(l))
      coladas += todas.length - limpias.length
      juego[e] = limpias.length ? limpias : [`${q.name} levanta la vista un segundo.`]
    }
    // Se guarda la huella aunque se hayan caído líneas. Si no, el cron
    // reintentaría a esta persona en cada barrido, para siempre y pagando cada
    // vez, por algo que el modelo no va a dejar de hacer del todo. El número va
    // al log porque es la señal de que el prompt se aflojó.
    if (coladas) console.warn(`${q.name}: ${coladas} saludo(s) con voseo, descartados.`)

    await db.from('people').update({ saludos: juego, saludos_de: h }).eq('id', q.id)
    rehechos++
  }

  return { revisados: gente.length, rehechos, costUsd }
}

/**
 * Cuál le toca ahora.
 *
 * Rota con el día del valle y con el nombre del jugador: la misma persona te
 * dice cosas distintas de un día para otro, y a dos jugadores distintos les
 * dice cosas distintas el mismo día. Es determinista a propósito — dos veces
 * el mismo día tiene que ser la misma, o se siente una máquina tragamonedas.
 */
export function elegirSaludo(
  saludos: Record<string, string[]> | null,
  escalon: Escalon, tick: number, nombreJugador: string,
): string | null {
  const lineas = saludos?.[escalon]
  if (!lineas?.length) return null
  let h = tick
  for (const c of nombreJugador) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return lineas[h % lineas.length]!
}
