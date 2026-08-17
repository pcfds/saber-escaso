/**
 * ¿En qué idioma está hablando el director?
 *
 * El mundo se narra en castellano llano —"tú", "mira", "aquí"— y esa decisión
 * está en el prompt con todas las letras. **El modelo la desobedece a veces, y
 * hasta hoy nadie lo contaba.** Se descubrió leyendo una crónica de producción
 * a ojo: *«no cayó, pero vos sí»* en el mismo párrafo que *«si tienes prisa»*.
 *
 * Lo primero que hay que descartar es lo obvio, y ya se descartó: **el emisor
 * está limpio.** 349 hechos de producción, 0 con voseo; `people.voice`,
 * `people.historia` y `places.description`, 0 de 12. No hay de dónde copiarlo:
 * el voseo lo pone el modelo solo.
 *
 * Por qué es un script y no una columna: escribirlo por crónica hay que
 * hacerlo en `director.ts`, y ese archivo lo estaba tocando otra rama. Un
 * script mide lo mismo sobre todo el histórico y además se puede correr contra
 * un cambio de prompt de ayer, que es justo lo que hizo falta acá.
 *
 *   pnpm registro
 *
 * La medición que lo justifica, con el corte puesto en cuando entró la
 * contra-instrucción al prompt:
 *
 *   antes     9 de 13 con voseo
 *   después   1 de 7
 *
 * La instrucción funcionó y no alcanzó, y lo que quedaba cambió de forma: ya
 * no eran crónicas escritas enteras en rioplatense sino crónicas partidas por
 * la mitad —«no cayó, pero vos sí» en el mismo párrafo que «si tienes prisa»—,
 * que se leen como escritas por dos personas.
 *
 * Ese residuo lo cierra el colador de `director.ts`, que usa la misma vara que
 * este script: si se midiera con una y se rechazara con otra, el número
 * dejaría de describir lo que el código hace. Medido después: 6 crónicas, el
 * colador salta 1, ninguna queda sucia.
 */
import { db } from './db.js'
import { RIOPLATENSE } from './world/saludos.js'

/**
 * Las marcas de voseo, importadas y NO reescritas.
 *
 * La primera versión de este archivo tenía su propia lista con `\b`, y estaba
 * mal por el motivo que `saludos.ts` ya dejó documentado: **en JavaScript `\b`
 * es ASCII, así que la "á" no cuenta como letra** y `\bacá\b` no encuentra
 * "acá" nunca. Medí con esa lista y conté de menos sin enterarme.
 *
 * La de `saludos.ts` está peleada de verdad —lookaround con `\p{L}`, sin
 * variantes sin tilde porque se comían frases buenas— así que la única
 * decisión correcta acá era importarla. Dos listas del mismo idioma se separan
 * el día que alguien toca una.
 */
const VOSEO = new RegExp(RIOPLATENSE.source, 'giu')

/** Y las del registro que sí queremos, para poder distinguir dos fallas
 *  distintas: una crónica entera en voseo es el modelo ignorando la
 *  instrucción; una crónica que MEZCLA es peor, porque se lee como si la
 *  hubieran escrito dos personas. */
const TUTEO = new RegExp(
  '(?<!\\p{L})(' + [
    'tú', 'tienes', 'sabes', 'quieres', 'puedes', 'haces', 'pones', 'dices',
    'vienes', 'traes', 'andas', 'miras', 'cuentas', 'piensas', 'dejas',
    'llevas', 'crees', 'debes', 'vives', 'eres', 'estás', 'aquí', 'allí',
    'contigo', 'ti', 'tuyo', 'tuya',
  ].join('|') + ')(?!\\p{L})',
  'giu',
)

/**
 * Lo que la lista de `saludos.ts` marca y acá NO cuenta.
 *
 * **Salió de una medición que se me fue en contra y por eso está escrita.** El
 * colador del director saltó en 5 de 6 crónicas, y al mirar QUÉ había cazado
 * eran "acá" y "allá" — nunca un "vos" ni un "querés". El último rechazo fue
 * *«aprender a pelear con lo que hay allá abajo»*, que es castellano llano
 * impecable y se usa igual en España. O sea que estaba pagando una generación
 * entera de más, cinco de cada seis veces, por una palabra que está bien.
 *
 * "acá" NO entra en esta lista y se sigue rechazando, porque el SYSTEM del
 * director lo prohíbe con nombre y apellido —«ni voseo ni "acá": es "tú",
 * "mira", "aquí"»— así que ahí sí desobedeció.
 *
 * Por qué la exclusión vive acá y no en `saludos.ts`: la lista de allá está
 * afinada para saludos, que son una o dos frases donde cualquier color
 * regional pesa el doble, y **la tiene otro agente ahora mismo**. Igual dejo
 * dicho que allá "allá" probablemente también sea un falso positivo.
 *
 * Es la misma trampa que ese archivo ya documentó con las variantes sin
 * tilde —"meter palabras por las dudas convierte el colador en una máquina de
 * falsos positivos"—, en otra forma: la lista no estaba mal, estaba prestada
 * de un uso a otro sin revisarla.
 */
const PERMITIDAS = new Set(['allá'])

/** Las marcas de voseo de un texto, ya descontadas las permitidas. Una sola
 *  definición para el script de medición y para el colador del director: si
 *  midiéramos con una vara y rechazáramos con otra, el número dejaría de
 *  describir lo que el código hace. */
export function marcasDeVoseo(texto: string): string[] {
  return (texto.match(VOSEO) ?? []).filter((m) => !PERMITIDAS.has(m.toLowerCase()))
}

export type Registro = {
  total: number
  conVoseo: number
  mezcladas: number
  /** Una frase real por crónica sucia. Sin esto el número no se puede
   *  discutir, y un número que no se puede discutir no sirve. */
  ejemplos: { cuando: string; marcas: string[]; frase: string }[]
}

export function medirTexto(texto: string) {
  const v = marcasDeVoseo(texto)
  const t = texto.match(TUTEO) ?? []
  const frase = v.length === 0 ? '' : (texto
    .split(/(?<=[.!?])\s+/)
    .find((f) => marcasDeVoseo(f).length > 0) ?? '').trim()
  return { voseo: v.length, tuteo: t.length, marcas: [...new Set(v.map((s) => s.toLowerCase()))], frase }
}

export async function medir(limite = 500): Promise<Registro> {
  const { data } = await db.from('chronicles')
    .select('created_at, text').order('created_at', { ascending: false }).limit(limite)
  const filas = data ?? []
  const r: Registro = { total: filas.length, conVoseo: 0, mezcladas: 0, ejemplos: [] }
  for (const c of filas) {
    const m = medirTexto(c.text)
    if (m.voseo === 0) continue
    r.conVoseo++
    if (m.tuteo > 0) r.mezcladas++
    if (r.ejemplos.length < 8) r.ejemplos.push({
      cuando: new Date(c.created_at).toISOString().slice(0, 16).replace('T', ' '),
      marcas: m.marcas, frase: m.frase.slice(0, 120),
    })
  }
  return r
}

async function main() {
  const r = await medir()
  const pct = (n: number) => r.total === 0 ? '0%' : `${Math.round(100 * n / r.total)}%`
  console.log(`${r.total} crónicas`)
  console.log(`  ${r.conVoseo} con voseo — ${pct(r.conVoseo)}`)
  console.log(`  ${r.mezcladas} mezclan los dos registros — ${pct(r.mezcladas)}`)
  if (r.ejemplos.length) console.log('')
  for (const e of r.ejemplos) console.log(`  ${e.cuando}  [${e.marcas.join(' ')}]\n    ${e.frase}`)
  process.exit(0)
}

// Sólo cuando se lo corre a mano. Importarlo para usar `medirTexto` no tiene
// que disparar una consulta ni matar el proceso del que importa.
if (process.argv[1]?.endsWith('registro.ts')) void main()
