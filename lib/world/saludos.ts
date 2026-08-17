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

const COMO_TE_TRATA: Record<Escalon, string> = {
  teme: 'te tiene miedo y no lo disimula bien',
  bronca: 'te tiene bronca por algo',
  nadie: 'no sabe bien quién sos: te ubica de vista y nada más',
  ubica: 'ya te ubica, te tiene medida pero todavía no confía',
  confia: 'empieza a confiar en vos: ya te pediría un favor',
  fe: 'te tiene fe, te confiaría lo suyo',
}

const SYSTEM = `Escribís lo que un habitante de un valle de fantasía dice o hace
cuando alguien le pasa al lado. NO es una conversación: es el segundo en que
levanta la vista.

Te doy quién es, cómo habla y qué está persiguiendo ahora. Devolvés TRES
variantes para cada uno de los seis grados de confianza que puede tenerle a
quien pasa. Dieciocho líneas en total, en una sola respuesta.

CÓMO TIENEN QUE SER:
- Cortísimas. Una línea. Muchas veces ni siquiera habla: "Ilde no levanta la
  vista del yunque" también es un saludo.
- Mezclá las dos formas: algunas son algo que dice (con guion de diálogo),
  otras son algo que hace. Cuatro frases habladas seguidas suenan a coro.
- **Que se le note en qué anda.** Si está trabado con algo, que se le escape.
  Es la mitad del valor: el que pasa se entera de que hay algo pasando sin
  frenarse a conversar.
- Las cuatro tienen que ser distintas entre sí, no la misma con otras palabras.
  Distinto arranque, distinto largo, distinto registro.

REGLAS QUE NO SE ROMPEN:
- Sólo podés mencionar lo que está en los datos que te doy. Nada inventado: ni
  sucesos, ni gente, ni lugares, ni objetos.
- Nada de números, porcentajes ni nombres de sistemas.
- No prometas nada nunca. Un saludo no puede ofrecer un trato.
- No preguntes "¿en qué puedo ayudarte?". Nadie habla así.
- No uses el nombre de la otra persona más de una vez entre las cuatro.`

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
  voice: string | null; historia: string | null
  saludos: Record<string, string[]> | null
  saludos_de: string | null
}

/** La huella del estado del que salieron los saludos. Si cambia, hay que
 *  rehacerlos: un saludo que habla de una meta ya cumplida es peor que uno
 *  genérico. */
function huella(metas: string[], escalon: Escalon): string {
  return `${escalon}|${metas.slice().sort().join('·')}`
}

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
    .select('id, name, trade, disposition, voice, historia, saludos, saludos_de')
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
    const h = huella(metas, 'nadie')
    if (q.saludos_de === h && q.saludos && Object.keys(q.saludos).length === escalones.length) {
      continue
    }

    const ctx = [
      `Sos ${q.name}, ${q.trade}. ${q.disposition}`,
      q.voice ? `Cómo hablás: ${q.voice}` : '',
      q.historia ? `De dónde venís: ${q.historia}` : '',
      metas.length
        ? `Ahora estás detrás de: ${metas.join('; ')}.`
        : 'No estás persiguiendo nada en particular.',
      '',
      'Los seis grados, en orden:',
      ...escalones.map((e) => `- ${e}: alguien de quien ${COMO_TE_TRATA[e]}.`),
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
    for (const e of escalones) {
      // Si devolvió de menos, se sirve igual: tres es lo ideal, una es mejor
      // que ninguna.
      const limpias = (r.datos[e] ?? [])
        .map((l) => String(l).trim()).filter((l) => l.length > 0).slice(0, 5)
      juego[e] = limpias.length ? limpias : [`${q.name} levanta la vista un segundo.`]
    }

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
