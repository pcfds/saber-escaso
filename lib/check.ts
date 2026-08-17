/**
 * Chequeo previo. Dice exactamente qué falta antes de que nada explote.
 *
 *   pnpm check
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const problems: string[] = []
const ok: string[] = []

for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY']) {
  if (process.env[name]) ok.push(`${name} presente`)
  else problems.push(`Falta ${name} en .env.local`)
}

if (problems.length === 0) {
  const { db, REGION_SLUG } = await import('./db.js')

  const tablas = ['regions', 'places', 'knowledge', 'people', 'agendas', 'events']
  for (const t of tablas) {
    const { error } = await db.from(t).select('*', { count: 'exact', head: true })
    if (error) problems.push(`Tabla "${t}" no responde: ${error.message} — ¿corriste supabase/schema.sql?`)
    else ok.push(`tabla ${t} ok`)
  }

  const { data: region } = await db
    .from('regions').select('slug, tick').eq('slug', REGION_SLUG).maybeSingle()
  if (region) ok.push(`región "${region.slug}" en el tick ${region.tick}`)
  else problems.push(`No existe la región "${REGION_SLUG}" — corré pnpm seed`)

  // El chequeo pasa por `modelo.ts` y no por el SDK: el proveedor es
  // intercambiable y este archivo no tiene por qué saber cuál está puesto.
  // Se pide algo mínimo — si contesta, la credencial sirve.
  try {
    const { pedirJson, proveedorActual } = await import('./modelo.js')
    await pedirJson<{ ok: boolean }>({
      system: 'Contestá el JSON pedido y nada más.',
      prompt: 'Devolvé {"ok": true}.',
      schema: {
        type: 'object', properties: { ok: { type: 'boolean' } },
        required: ['ok'], additionalProperties: false,
      },
      maxTokens: 32,
      modelo: process.env.DIRECTOR_MODEL ?? 'claude-haiku-4-5',
    })
    ok.push(`la IA responde (${proveedorActual()})`)
  } catch (e) {
    problems.push(`la IA no responde: ${(e as Error).message}`)
  }
}

for (const line of ok) console.log(`  ✓ ${line}`)
for (const line of problems) console.error(`  ✗ ${line}`)
process.exit(problems.length ? 1 : 0)
