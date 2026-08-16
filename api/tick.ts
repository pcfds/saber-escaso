// El latido del mundo. Lo llama el cron de Vercel; también se puede pegar
// a mano para forzar un tick.
import { step } from '../lib/world/tick.js'

export default async function handler(
  _req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
) {
  await step()
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
  res.end('tick\n')
}
