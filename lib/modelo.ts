/**
 * La única puerta al modelo de lenguaje.
 *
 * Existe por una razón de plata, no de estilo. La dirección del proyecto lo
 * dijo así: "no estamos atados a Anthropic, buscaremos las más económicas y
 * mejores". El costo de la IA escala con la cantidad de jugadores y es uno de
 * los riesgos anotados en `ROADMAP.md`, así que mover el director a lo más
 * barato que dé la calidad necesaria tiene que ser cambiar `PROVEEDOR_IA` y
 * nada más — no reescribir los dos archivos que hablan con el modelo.
 *
 * Tres cosas viven acá y en ningún otro lado:
 *
 *  1. **El SDK.** Nadie más lo importa. Eso mantiene honesto al invariante 1
 *     (`lib/world/tick.ts` nunca importa un SDK de IA): hoy hay un solo
 *     archivo que auditar con un grep en vez de uno por cada lugar que narre.
 *     *Pendiente conocido:* `lib/check.ts` todavía importa el SDK para
 *     verificar la credencial. No narra nada, pero conviene que también pase
 *     por acá cuando se lo pueda tocar.
 *
 *  2. **Las rarezas del proveedor.** Haiku 4.5 rechaza `effort` con un 400.
 *     Eso es un detalle de Anthropic, no del director: el que pide una
 *     crónica pide un esfuerzo y no tiene por qué saber qué modelos lo
 *     aceptan. Cada rareza nueva se enterra en la función de su proveedor.
 *
 *  3. **La tabla de precios y la cuenta del costo.** Es el número con el que
 *     se toman decisiones de plata. Si se calcula en dos lugares, algún día
 *     dan distinto y nadie sabe cuál creer.
 *
 * Lo que este archivo NO decide es **qué modelo usar**. El nombre llega por
 * parámetro. Cada caso de uso tiene su variable y su default (`DIRECTOR_MODEL`,
 * `DIALOGO_MODEL`) porque la decisión es suya: el director puede querer Opus
 * para una crónica larga mientras cada charla de NPC corre en Haiku.
 */
import Anthropic from '@anthropic-ai/sdk'

/**
 * Precio por millón de tokens (entrada / salida), por proveedor y modelo.
 * Vive acá y no en el director porque el costo de una charla cuenta igual que
 * el de una crónica: es el mismo presupuesto.
 */
const PRECIOS: Record<string, Record<string, [number, number]>> = {
  anthropic: {
    'claude-opus-5': [5, 25],
    'claude-sonnet-5': [3, 15],
    'claude-haiku-4-5': [1, 5],
  },
  // Los que hablan el protocolo de OpenAI. Es una sola fila por modelo y no
  // un proveedor por empresa, porque desde el código son el mismo: cambia la
  // URL base y la clave. Los precios están al 17 de agosto de 2026 y **hay
  // que volver a mirarlos antes de decidir con ellos**: en este segmento
  // cambian seguido y para abajo.
  compatible: {
    'deepseek-chat': [0.27, 1.10],
    'deepseek-reasoner': [0.55, 2.19],
    'qwen-plus': [0.40, 1.20],
    'qwen-turbo': [0.05, 0.20],
    'llama-3.3-70b-versatile': [0.59, 0.79],
  },
}

/**
 * Si el modelo no está en la tabla se cobra como el más caro que conocemos.
 * Subestimar sale más caro que sobreestimar: una tabla desactualizada tiene
 * que aparecer como un número feo, no esconderse en un costo de cero.
 */
const PRECIO_DESCONOCIDO: [number, number] = [5, 25]

export type Esfuerzo = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export type PedidoJson<T> = {
  system: string
  prompt: string
  /** El esquema JSON de la respuesta. El modelo se ata a esto, no a un ruego en el prompt. */
  schema: Record<string, unknown>
  maxTokens: number
  /** Nombre exacto del modelo. Este archivo lo recibe; no lo elige. */
  modelo: string
  esfuerzo?: Esfuerzo
  /**
   * Qué devolver si el modelo no contesta texto. Sin respaldo, eso es un
   * error y revienta. Con respaldo, se sigue: un NPC que murmura "…" es peor
   * que uno que contesta, pero mucho mejor que un jugador sin respuesta. Una
   * crónica vacía, en cambio, es un fallo y tiene que gritar.
   */
  respaldo?: T
}

export type RespuestaJson<T> = {
  datos: T
  modelo: string
  inTokens: number
  outTokens: number
  costUsd: number
}

/**
 * Lo único que un proveedor tiene que saber devolver: el texto crudo (o null
 * si no dijo nada) y qué gastó. Todo lo demás —parsear, auditar, cobrar— pasa
 * abajo, igual para todos.
 */
type Cruda = { texto: string | null; inTokens: number; outTokens: number }

// El cliente se arma la primera vez que se lo usa, no al importar el módulo:
// el día que el director corra con otro proveedor, arrancar el servidor no
// tiene por qué exigir una ANTHROPIC_API_KEY que ya no hace falta.
let anthropic: Anthropic | null = null

/**
 * Cualquier proveedor que hable el protocolo de OpenAI.
 *
 * Existe por un pedido concreto de la dirección del proyecto, y la distinción
 * que hizo importa: **Claude se queda para DESARROLLAR —los agentes, este
 * repo, todo esto— y lo que corre en vivo para los NPCs tiene que ser lo más
 * barato que aguante.** El costo de la IA escala con la cantidad de jugadores
 * y es el riesgo de plata número uno del proyecto: una charla cuesta lo mismo
 * la juegue quien la juegue, así que mil jugadores son mil veces el número.
 *
 * Un solo proveedor cubre a casi todos los candidatos —DeepSeek, Qwen, Groq,
 * OpenRouter, together— porque todos exponen el mismo endpoint. Lo que cambia
 * entre ellos son dos variables de entorno:
 *
 *     PROVEEDOR_IA=compatible
 *     IA_BASE_URL=https://api.deepseek.com/v1
 *     IA_API_KEY=...
 *     DIALOGO_MODEL=deepseek-chat
 *
 * **La diferencia que hay que mirar al medir no es el precio: es el esquema.**
 * Anthropic garantiza la forma de la respuesta con `json_schema`; acá se pide
 * `response_format: json_object`, que garantiza que sea JSON válido pero **no
 * que tenga los campos que pediste**. Por eso el esquema se le manda además
 * escrito en el prompt, y por eso el que compare tiene que contar cuántas
 * respuestas vinieron incompletas — no sólo cuánto salieron.
 */
async function llamarCompatible(p: PedidoJson<unknown>): Promise<Cruda> {
  const base = process.env.IA_BASE_URL
  const clave = process.env.IA_API_KEY
  if (!base || !clave) {
    throw new Error(
      'PROVEEDOR_IA="compatible" necesita IA_BASE_URL y IA_API_KEY en .env.local.',
    )
  }
  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${clave}` },
    body: JSON.stringify({
      model: p.modelo,
      max_tokens: p.maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        // El esquema va en el sistema y no en un parámetro: es lo único que
        // tiene este protocolo para pedir una forma. Si el modelo la ignora,
        // el parseo de abajo lo va a ver y el respaldo lo va a cubrir — que es
        // exactamente el dato que hay que medir antes de mover producción.
        { role: 'system', content: `${p.system}\n\nRespondes SÓLO un objeto JSON que cumpla este esquema, sin texto alrededor:\n${JSON.stringify(p.schema)}` },
        { role: 'user', content: p.prompt },
      ],
    }),
  })
  if (!res.ok) throw new Error(`${p.modelo} contestó ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const d = await res.json() as {
    choices?: { message?: { content?: string } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  return {
    texto: d.choices?.[0]?.message?.content ?? null,
    inTokens: d.usage?.prompt_tokens ?? 0,
    outTokens: d.usage?.completion_tokens ?? 0,
  }
}

async function llamarAnthropic(p: PedidoJson<unknown>): Promise<Cruda> {
  anthropic ??= new Anthropic()

  const res = await anthropic.messages.create({
    model: p.modelo,
    max_tokens: p.maxTokens,
    output_config: {
      // Haiku 4.5 no acepta `effort` — mandárselo devuelve 400. Ya nos mordió
      // una vez; se queda enterrado acá adentro para que no vuelva a
      // desparramarse por los que llaman.
      ...(p.esfuerzo && !p.modelo.startsWith('claude-haiku') ? { effort: p.esfuerzo } : {}),
      format: { type: 'json_schema', schema: p.schema },
    },
    system: p.system,
    messages: [{ role: 'user', content: p.prompt }],
  })

  const bloque = res.content.find((b) => b.type === 'text')
  return {
    texto: bloque && bloque.type === 'text' ? bloque.text : null,
    inTokens: res.usage.input_tokens,
    outTokens: res.usage.output_tokens,
  }
}

/**
 * Pedirle al modelo un JSON que cumpla un esquema. Los dos usos que existen
 * hoy —la crónica del director y la línea de un NPC— son este pedido con otro
 * prompt.
 */
/** Qué proveedor está puesto. Lo usa `check.ts` para decir cuál respondió: si
 *  algún día hay dos, saber cuál contestó es la mitad del diagnóstico. */
export function proveedorActual(): string {
  return process.env.PROVEEDOR_IA ?? 'anthropic'
}


export async function pedirJson<T>(p: PedidoJson<T>): Promise<RespuestaJson<T>> {
  const proveedor = process.env.PROVEEDOR_IA ?? 'anthropic'

  let cruda: Cruda
  switch (proveedor) {
    case 'anthropic':
      cruda = await llamarAnthropic(p)
      break

    // ── El punto de extensión ───────────────────────────────────────────
    // Sumar el segundo proveedor es una función `llamarX(p): Promise<Cruda>`
    // y un `case` acá. Nada más: la función se come todas las rarezas de su
    // proveedor (qué parámetros acepta, cómo se le pasa el esquema, dónde
    // vienen los tokens) y devuelve siempre lo mismo. Su fila de precios va
    // en PRECIOS bajo su nombre y el costo se sigue calculando abajo, una
    // sola vez, para todos.
    //
    case 'compatible':
      cruda = await llamarCompatible(p)
      break

    default:
      throw new Error(
        `PROVEEDOR_IA="${proveedor}" no existe. Hoy están "anthropic" y `
        + '"compatible" (cualquiera que hable el protocolo de OpenAI: DeepSeek, '
        + 'Qwen, Groq, OpenRouter — se elige con IA_BASE_URL e IA_API_KEY).',
      )
  }

  if (cruda.texto === null && p.respaldo === undefined) {
    throw new Error(`El modelo ${p.modelo} no devolvió texto.`)
  }
  const datos = cruda.texto === null ? (p.respaldo as T) : (JSON.parse(cruda.texto) as T)

  const [porEntrada, porSalida] = PRECIOS[proveedor]?.[p.modelo] ?? PRECIO_DESCONOCIDO
  const costUsd = (cruda.inTokens * porEntrada + cruda.outTokens * porSalida) / 1_000_000

  return {
    datos,
    modelo: p.modelo,
    inTokens: cruda.inTokens,
    outTokens: cruda.outTokens,
    costUsd,
  }
}
