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

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  try {
    await new Anthropic().models.retrieve('claude-opus-5')
    ok.push('la API de Anthropic responde')
  } catch (e) {
    problems.push(`Anthropic no responde: ${(e as Error).message}`)
  }
}

for (const line of ok) console.log(`  ✓ ${line}`)
for (const line of problems) console.error(`  ✗ ${line}`)
process.exit(problems.length ? 1 : 0)
