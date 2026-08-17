/**
 * El autor del mundo, en su propio endpoint y en su propio cron.
 *
 * **Por qué no cuelga del tick, que es la pregunta importante de este archivo.**
 *
 * Sería una línea: "cada cuatro ticks, además, corré el autor". Y sería el
 * principio del final, porque el invariante 1 —`lib/world/tick.ts` nunca importa
 * el SDK de IA— dejaría de verse en el árbol de archivos y pasaría a vivir
 * adentro de un `if` que alguien tiene que leer para encontrar. Hoy la línea
 * entre la simulación y la IA se audita con un `grep`; mañana se auditaría
 * leyendo 4.200 líneas.
 *
 * Es la misma decisión que ya tomó `api/saludos.ts`, por el mismo motivo, y
 * conviene que las tres entradas se parezcan: `/api/tick` es el mundo,
 * `/api/saludos` y `/api/autor` son lo que lo mira.
 *
 * **Y la cadencia es parte del diseño, no del presupuesto.** El cron corre una
 * vez por día real, que son cuatro días del valle; el guardia de
 * `DIAS_ENTRE_CORRIDAS` está adentro de `autorar()` para que pegarle a mano no
 * siembre cuatro veces lo mismo. Un mundo donde algo grande pasa todos los días
 * no tiene nada grande.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { autorar } from '../lib/world/autor.js'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    // `?forzar=1` salta el guardia de cadencia. Existe para probar contra
    // `valle-pruebas` desde el navegador; el cron nunca lo manda.
    const url = new URL(req.url ?? '/', 'http://x')
    const r = await autorar({
      regionSlug: url.searchParams.get('region') ?? undefined,
      forzar: url.searchParams.get('forzar') === '1',
    })

    // La respuesta lleva de qué hecho salió cada siembra. No es adorno: es la
    // única forma de mirar el log del cron y saber si el autor está sembrando
    // sobre lo que pasó o inventando.
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      ok: true,
      region: r.region, tick: r.tick,
      deuda: r.deuda, desglose: r.desgloseDeuda, hitos: r.hitos,
      corrio: r.corrio, porQueNo: r.porQueNo,
      sembro: r.siembras.map((s) => ({
        tipo: s.tipo, que: s.que, porque: s.nota,
        salio_de: s.hechos, quedo_en: s.tabla, fila: s.filaId,
      })),
      descarto: r.descartes,
      costoUsd: Number(r.costoUsd.toFixed(6)),
      modelos: r.modelos,
    }, null, 2))
  } catch (e) {
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok: false, error: (e as Error).message }))
  }
}
