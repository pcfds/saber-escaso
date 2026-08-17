/**
 * La plata. Las bolsas, los precios y el mostrador.
 *
 * Vive acá y no en `tick.ts` por una razón concreta: `lib/web.ts` necesita
 * exactamente lo mismo para pintar el mostrador en `/mundo`, y la primera vez
 * que el precio se calcule en dos lugares, el que ves en la vidriera y el que
 * te cobran dejan de ser el mismo número. Es el mismo reparto que ya hicieron
 * `combate.ts` y `magia.ts`, y por el mismo motivo.
 *
 * **Este archivo no importa ningún SDK de IA y no puede** (invariante 1): lo
 * importa `tick.ts`, que es la simulación determinista.
 *
 * ═════════════════════════════════════════════════════════════
 * Las dos economías, y no se cruzan nunca
 * ═════════════════════════════════════════════════════════════
 *
 *   Podés comprar una hoja templada. **No podés comprar saber hacerla.**
 *
 * `DISENO.md` §9.3b. La regla dura que sale de ahí: **ninguna transacción puede
 * terminar con una fila nueva en `knows`.** Ni comprar, ni vender, ni pagar una
 * lección. En este archivo eso es literal — no hay un solo `from('knows')` que
 * no sea un `select`, y no tiene por qué haberlo nunca.
 *
 * Y el mercado no diluye la escasez: **la afila.** El precio de algo sube
 * cuando quedan menos cabezas que sepan hacerlo, y cuando no queda ninguna el
 * mostrador dice «no hay» con la plata en la mano del otro lado. Un menú no
 * sabe decir eso.
 *
 * ═════════════════════════════════════════════════════════════
 * Y el mercado NO está detrás de ningún saber
 * ═════════════════════════════════════════════════════════════
 *
 * `DISENO.md` §8.1, al final: hay **dos niveles**, y sólo el segundo es el
 * juego. Lo corriente —comer, dormir, juntar lo que crece, encender un fuego—
 * lo sabe cualquiera y **no tiene fila en `knows`**; lo escaso vive en una
 * persona y se muere con ella. La prueba es *¿lo sabría hacer cualquiera que
 * haya vivido acá un año?*
 *
 * **Cambiar una cosa por otra es lo más corriente que hay.** Por eso `vender`,
 * `comprar` y `cambiar` no piden ni un saber ni una lección: llegás por el
 * Camino del Norte sin saber hacer nada y podés vender la raíz que juntaste el
 * primer día. Un mundo donde hasta lo obvio necesita maestro no se siente
 * escaso, se siente cerrado con llave.
 *
 * Lo que el saber decide acá es **el PRECIO, no el permiso**: cuánto pesa lo
 * que hay detrás de una cosa y cuántas cabezas quedan que sepan hacerla.
 */
import { db } from '../db.js'

/** La moneda de los humanos del valle. Las otras dos son de los pueblos que no
 *  son humanos, y **no valen de este lado**: eso es geografía, es política y es
 *  una razón para viajar. */
export const MONEDA_DEL_VALLE = 'marco'

export type Moneda = {
  slug: string; singular: string; plural: string; quien: string
  pueblo: string | null
}

export type Bolsa = Record<string, number>

export type Duenio = { kind: 'player' | 'person' | 'people'; id: string }

/** El catálogo, que es global y chico (tres filas). Se lee una vez por pedido y
 *  no se cachea en memoria a propósito: en Vercel cada invocación es un proceso
 *  distinto y un cache de módulo es un cache que casi nunca acierta y siempre
 *  miente cuando el catálogo cambia. */
export async function monedas(): Promise<Moneda[]> {
  return (await db.from('monedas')
    .select('slug, singular, plural, quien, pueblo')).data ?? []
}

/** Cómo se dice una cantidad, para que lo lea el jugador.
 *
 * Castellano llano, y el plural sale de la tabla: armarlo desde el singular es
 * cómo se llega a «3 cuenta de huesos». */
export function enPlata(cuanto: number, m: Moneda | undefined): string {
  if (!m) return `${cuanto}`
  return `${cuanto} ${cuanto === 1 ? m.singular : m.plural}`
}

// ═════════════════════════════════════════════════════════════
// La bolsa
// ═════════════════════════════════════════════════════════════

// ⚠ LO QUE `region_id` NO ARREGLA, y conviene saberlo antes de contar plata.
//
// `bolsas` cascadea al borrar una región, que es la mitad del agujero de
// `knows`. La otra mitad sigue abierta y no se puede cerrar con una foreign
// key: `holder_id` es polimórfico —jugador, persona o pueblo— así que **borrar
// un jugador o una persona deja su bolsa huérfana.** Se midió: seis filas y 385
// monedas quedaron sueltas en `valle-pruebas` después de borrar cuatro
// jugadores de prueba, y eso infla cualquier cuenta del circulante.
//
// Hoy no muerde en el juego —los jugadores no se borran nunca y los muertos los
// limpia `seMuere`, que borra la bolsa a propósito— pero el día que alguien
// cuente cuánta plata hay en el valle, tiene que filtrar por dueño vivo o va a
// contar fantasmas.

/** Lo que tiene encima, por moneda. */
export async function bolsaDe(regionId: string, d: Duenio): Promise<Bolsa> {
  const filas = (await db.from('bolsas').select('moneda, cantidad')
    .eq('region_id', regionId)
    .eq('holder_kind', d.kind).eq('holder_id', d.id)).data ?? []
  const b: Bolsa = {}
  for (const f of filas) b[f.moneda] = f.cantidad
  return b
}

/** Las bolsas de varios de una, para no pagar un round-trip por persona en la
 *  ruta que el cliente pega cada pocos segundos. */
export async function bolsasDe(
  regionId: string, kind: Duenio['kind'], ids: string[],
): Promise<Map<string, Bolsa>> {
  const m = new Map<string, Bolsa>()
  if (ids.length === 0) return m
  const filas = (await db.from('bolsas').select('holder_id, moneda, cantidad')
    .eq('region_id', regionId).eq('holder_kind', kind).in('holder_id', ids)).data ?? []
  for (const f of filas) {
    const b = m.get(f.holder_id) ?? {}
    b[f.moneda] = f.cantidad
    m.set(f.holder_id, b)
  }
  return m
}

/** **La ÚNICA función de todo el código que puede hacer que el valle tenga más
 *  plata que antes.**
 *
 * Es el espejo exacto de `objects.made_by = null`, que sólo lo escribe
 * `case 'buscar'`: si la plata apareciera en cualquier otro lado, la escasez se
 * muere y el mercado pasa a ser un menú con números.
 *
 * Y tiene una sola puerta en la ficción, que es la misma por la que entra todo
 * a este valle: **el Camino del Norte.** La llaman las dos llegadas —
 * `llegaAlguien()` del tick y la creación de un jugador en `lib/web.ts`— y
 * nadie más. Si algún día la llama un tercero, preguntale de dónde salió esa
 * plata antes de aceptarlo.
 */
export async function acunar(
  regionId: string, d: Duenio, moneda: string, cuanto: number,
): Promise<void> {
  if (cuanto <= 0) return
  await sumar(regionId, d, moneda, cuanto)
}

/** Suma (o resta, con negativo) sobre una bolsa, con compare-and-set.
 *
 * No es paranoia: dos pedidos del mismo jugador pueden solaparse —el cliente
 * pega `/mundo` cada cinco segundos mientras vos apretás comprar— y un
 * `leer, sumar, escribir` sin guarda pierde una de las dos escrituras. El CAS
 * (`.eq('cantidad', loQueLeí)`) hace que la perdedora no escriba nada y se
 * reintente. Abajo de todo está el `check (cantidad >= 0)` de la base, que es
 * lo que impide que un error de cuenta imprima dinero en silencio.
 */
async function sumar(
  regionId: string, d: Duenio, moneda: string, delta: number,
): Promise<boolean> {
  for (let intento = 0; intento < 3; intento++) {
    const { data: fila } = await db.from('bolsas').select('id, cantidad')
      .eq('region_id', regionId).eq('holder_kind', d.kind)
      .eq('holder_id', d.id).eq('moneda', moneda).limit(1).maybeSingle()

    if (!fila) {
      if (delta < 0) return false          // no tiene ni la bolsa
      const { error } = await db.from('bolsas').insert({
        region_id: regionId, holder_kind: d.kind, holder_id: d.id,
        moneda, cantidad: delta,
      })
      if (!error) return true
      continue                              // se la creó otro en el medio
    }

    if (fila.cantidad + delta < 0) return false
    const { data: hecho } = await db.from('bolsas')
      .update({ cantidad: fila.cantidad + delta })
      .eq('id', fila.id).eq('cantidad', fila.cantidad).select('id')
    if ((hecho ?? []).length > 0) return true
  }
  return false
}

/** Que la plata cambie de mano. Devuelve false si el que paga no tiene.
 *
 * **Es una transferencia y nada más**: la suma de las dos bolsas antes y
 * después es la misma. Nada se crea acá.
 *
 * No hay transacción de verdad —PostgREST no da uno— así que el orden es el que
 * falla mejor: primero se le saca al que paga y sólo si eso salió se le pone al
 * que cobra. Si el proceso se muere en el medio, el valle pierde plata, que es
 * infinitamente preferible a inventarla.
 */
export async function pagar(
  regionId: string, de: Duenio, a: Duenio, moneda: string, cuanto: number,
): Promise<boolean> {
  if (cuanto <= 0) return true
  if (!(await sumar(regionId, de, moneda, -cuanto))) return false
  await sumar(regionId, a, moneda, cuanto)
  return true
}

// ═════════════════════════════════════════════════════════════
// El precio
// ═════════════════════════════════════════════════════════════
//
// **Un precio fijo por `kind` convierte el mundo en un catálogo**, y ése es
// justo el fracaso que hay que esquivar. Acá el precio sale de tres cosas que
// ya existen en la base y que ninguna es una lista de precios:
//
//   · **qué hace falta para que eso exista** — lo que da el suelo lo junta
//     cualquiera agachándose; lo que sale de un oficio necesitó que alguien
//     supiera, y eso vale más. Sale de `knowledge.makes` y `knowledge.kind`.
//   · **la mano de quien lo hizo** — `objects.quality`, que es la destreza de
//     esa persona hecha objeto. La misma hoja de dos herreros distintos no
//     vale lo mismo, y eso es lo que vuelve la destreza capital de verdad.
//   · **cuántos quedan que sepan hacerlo** — y ésta es la que importa.
//
// La tercera es la tesis del juego escrita como número. Mientras hay tres
// herreros una hoja vale lo que vale. Cuando queda uno, vale el doble y medio.
// **Cuando no queda ninguno vale cuatro veces y no hay ninguna para comprar**,
// y eso es lo que un menú no puede decir.

/** Lo que cuesta que algo exista, por tipo de saber. No es una lista de
 *  precios: es cuánto pesa el saber que hay detrás. */
const BASE_POR_SABER: Record<string, number> = {
  oficio: 12,
  receta: 8,
  magia: 20,
}

/** Y lo que da el suelo. Bajo a propósito: agacharse lo hace cualquiera, y si
 *  juntar raíces pagara bien, el valle entero sería gente agachada. */
const BASE_DEL_SUELO = 3

/** Cuánto multiplica la escasez, por cabezas vivas que sepan hacerlo. */
function porEscasez(saben: number): number {
  if (saben <= 0) return 4.0
  if (saben === 1) return 2.5
  if (saben === 2) return 1.6
  return 1.0
}

export type Tarifa = {
  /** Cuánto pesa el saber que hay detrás. */
  base: number
  /** Cuántos vivos del valle saben hacerlo HOY. Cero = no se fabrica más. */
  saben: number
}

/** El precio de todo lo que el valle sabe hacer, en una tanda.
 *
 * Se arma de una porque tanto el tick como `/mundo` necesitan varios precios
 * en el mismo pedido y una consulta por objeto en la ruta más caliente del
 * juego es exactamente lo que ya se pagó caro una vez.
 *
 * ⚠ El filtro por `holder_id` va en el SERVIDOR y no en memoria, y no es una
 *   optimización: **`knows` es global, no tiene `region_id` ni foreign key, y
 *   PostgREST corta toda respuesta en 1.000 filas sin avisar.** Un `select()`
 *   pelado sobre esa tabla devuelve una ventana arbitraria en cuanto la base
 *   pasa ese número, y filtrar después es filtrar una muestra. Ya se midió con
 *   1.779 filas: `count` real 1.779, `select()` 1.000, sin error y sin aviso.
 */
export async function tarifas(
  people: { id: string }[], players: { id: string }[],
): Promise<Map<string, Tarifa>> {
  const t = new Map<string, Tarifa>()
  const recetas = (await db.from('knowledge')
    .select('id, kind, makes').not('makes', 'is', null)).data ?? []
  if (recetas.length === 0) return t

  const ids = [...people.map((p) => p.id), ...players.map((p) => p.id)]
  const holders = ids.length === 0 ? [] : (await db.from('knows')
    .select('knowledge_id, holder_id')
    .in('knowledge_id', recetas.map((r) => r.id))
    .in('holder_id', ids)).data ?? []

  const cabezas = new Map<string, number>()
  for (const h of holders) {
    cabezas.set(h.knowledge_id, (cabezas.get(h.knowledge_id) ?? 0) + 1)
  }
  for (const r of recetas) {
    t.set(r.makes as string, {
      base: BASE_POR_SABER[r.kind] ?? BASE_POR_SABER.oficio!,
      saben: cabezas.get(r.id) ?? 0,
    })
  }
  return t
}

/** Lo que vale esta cosa, con esta calidad, en este valle, hoy.
 *
 * Nunca menos de 1: una cosa que vale cero no es una cosa.
 */
export function precio(
  cosa: { kind: string; quality: number }, t: Map<string, Tarifa>,
): number {
  const tarifa = t.get(cosa.kind)
  const base = tarifa?.base ?? BASE_DEL_SUELO
  const escasez = tarifa ? porEscasez(tarifa.saben) : 1.0
  // 0,5 a 1,5. La calidad no puede volver gratis una cosa mal hecha ni triplicar
  // una bien hecha: lo que decide de verdad es la escasez.
  const mano = 0.5 + cosa.quality / 100
  return Math.max(1, Math.round(base * mano * escasez))
}

/** ¿Queda alguien que sepa hacer esto? Si no, el mostrador dice «no hay» y no
 *  hay precio que lo arregle. */
export function seFabricaTodavia(kind: string, t: Map<string, Tarifa>): boolean {
  const tarifa = t.get(kind)
  // Lo que no está en el catálogo lo da el suelo: eso siempre se consigue.
  return !tarifa || tarifa.saben > 0
}

// ═════════════════════════════════════════════════════════════
// El mostrador
// ═════════════════════════════════════════════════════════════

export type Mostrador = {
  id: string
  place_id: string
  person_id: string | null
  moneda: string
  abre: number
  cierra: number
}

export async function mostradores(regionId: string): Promise<Mostrador[]> {
  return (await db.from('mostradores')
    .select('id, place_id, person_id, moneda, abre, cierra')
    .eq('region_id', regionId)).data ?? []
}

/** Qué moneda te acepta esta persona.
 *
 * El que atiende un mostrador cobra en lo suyo; el resto del valle, en marcos.
 * Es lo que hace que cruzar el valle sea cambiar de plata.
 */
export function monedaDe(personId: string, ms: Mostrador[]): string {
  return ms.find((m) => m.person_id === personId)?.moneda ?? MONEDA_DEL_VALLE
}

// ═════════════════════════════════════════════════════════════
// El tipo de cambio, que es política
// ═════════════════════════════════════════════════════════════
//
// Cuánto te cuesta en marcos una moneda de un pueblo. **Sale de
// `peoples.aprecio` y de nada más**: cuanto peor los tratamos, más caro es su
// dinero, porque el
// que lo junta lo suelta con más asco. Arreglar el agravio abarata la moneda —
// o sea que la diplomacia tiene cotización, y se ve en un número que el jugador
// mira todos los días.
//
// El techo y el piso existen porque sin ellos un pueblo con aprecio +100 te
// regala su moneda y uno con -100 la vuelve inalcanzable, y las dos puntas
// rompen el juego en direcciones distintas.
export function cotizacion(aprecioDelPueblo: number): number {
  return Math.min(8, Math.max(1, Math.round(2 - aprecioDelPueblo / 20)))
}
