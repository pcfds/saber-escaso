/**
 * Mismo estado del mundo, tres modelos. Para elegir el director con evidencia
 * en vez de con intuición.
 *
 *   pnpm compare Pedro
 *
 * Corre en dryRun: no escribe crónicas ni mueve al jugador, así los tres ven
 * exactamente los mismos hechos.
 */
import { narrate } from './world/director.js'

const MODELOS = ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5'] as const

const name = process.argv[2]
if (!name) {
  console.error('uso: pnpm compare <nombre-jugador>')
  process.exit(1)
}

const filas: { model: string; costUsd: number; inventados: number; chars: number }[] = []

for (const model of MODELOS) {
  process.stderr.write(`\n${'─'.repeat(70)}\n${model}\n${'─'.repeat(70)}\n`)
  try {
    const c = await narrate(name, { model, effort: 'low', dryRun: true })
    console.log(`\n### ${model}\n\n${c.text}\n`)
    console.log(`   ${c.inTokens} in / ${c.outTokens} out · US$${c.costUsd.toFixed(4)} · ` +
      `${c.usados}/${c.leidos} hechos usados` +
      (c.inventados.length ? ` · ⚠ ${c.inventados.length} inventados` : ''))
    filas.push({ model, costUsd: c.costUsd, inventados: c.inventados.length, chars: c.text.length })
  } catch (e) {
    console.error(`   ✗ ${model}: ${(e as Error).message}`)
  }
}

console.log(`\n${'═'.repeat(70)}`)
console.log('modelo'.padEnd(22) + 'costo/mirada'.padEnd(16) + 'x1000/día/mes'.padEnd(18) + 'inventados')
for (const f of filas) {
  console.log(
    f.model.padEnd(22) +
    `US$${f.costUsd.toFixed(4)}`.padEnd(16) +
    `US$${(f.costUsd * 3000 * 30).toFixed(0)}`.padEnd(18) +
    String(f.inventados),
  )
}
console.log('\n(la última columna asume 1.000 jugadores × 3 miradas por día)')
