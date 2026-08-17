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
 *   antes     9 de 13 con voseo · 1 mezclaba los dos registros
 *   después   2 de 7  con voseo · 2 mezclan
 *
 * O sea que **la instrucción funcionó y no alcanzó**: bajó el voseo a menos de
 * la mitad, pero lo que queda ya no son crónicas escritas enteras en
 * rioplatense sino **crónicas partidas por la mitad**, que se leen como
 * escritas por dos personas. Las dos que quedan mezclan. Ése es el residuo que
 * hay que atacar, y no es el mismo problema que había antes.
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

export type Registro = {
  total: number
  conVoseo: number
  mezcladas: number
  /** Una frase real por crónica sucia. Sin esto el número no se puede
   *  discutir, y un número que no se puede discutir no sirve. */
  ejemplos: { cuando: string; marcas: string[]; frase: string }[]
}

export function medirTexto(texto: string) {
  const v = texto.match(VOSEO) ?? []
  const t = texto.match(TUTEO) ?? []
  const frase = v.length === 0 ? '' : (texto
    .split(/(?<=[.!?])\s+/)
    .find((f) => new RegExp(VOSEO.source, 'iu').test(f)) ?? '').trim()
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
