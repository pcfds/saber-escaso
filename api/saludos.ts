/**
 * Rehace los saludos de la gente cuyo estado cambió.
 *
 * Va en su propio cron y no adentro del tick a propósito: **la simulación no
 * toca IA** (invariante 1), y aunque esto corre después y no decide nada del
 * mundo, colgarlo del mismo endpoint borronearía esa línea para el que lo lea
 * dentro de seis meses.
 *
 * Corre seguido y hace poco por vez: los saludos viejos siguen sirviendo
 * mientras tanto, así que no hay apuro y sí conviene no gastar de golpe.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { getRegion } from '../lib/db.js'
import { refrescarSaludos } from '../lib/world/saludos.js'

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  try {
    const region = await getRegion()
    const r = await refrescarSaludos(region.id)
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, ...r }))
  } catch (e) {
    res.writeHead(500, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: (e as Error).message }))
  }
}
