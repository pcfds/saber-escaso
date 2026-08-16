/**
 * El mundo corriendo solo. Esto es lo que hace que "viva online".
 *
 *   pnpm world          un tick cada 5 minutos
 *   pnpm world 30       un tick cada 30 segundos (para probar)
 *
 * Dejalo prendido y cuando vuelvas el valle es otro. Cuando esto se vaya a un
 * servidor va a ser un cron, no un proceso — pero para Fase 0 alcanza y sobra.
 */
import { spawn } from 'node:child_process'

const segundos = Number(process.argv[2] ?? 300)
if (!Number.isFinite(segundos) || segundos < 5) {
  console.error('uso: pnpm world [segundos-entre-ticks]  (mínimo 5)')
  process.exit(1)
}

let corriendo = true
process.on('SIGINT', () => {
  console.log('\nparando después de este tick…')
  corriendo = false
})

const tick = () =>
  new Promise<void>((resolve) => {
    const child = spawn('pnpm', ['tick'], { stdio: 'inherit' })
    child.on('close', () => resolve())
  })

console.log(`mundo corriendo: un tick cada ${segundos}s. Ctrl-C para parar.`)
while (corriendo) {
  await tick()
  if (!corriendo) break
  await new Promise((r) => setTimeout(r, segundos * 1000))
}
console.log('mundo detenido.')
