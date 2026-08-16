import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import WebSocket from 'ws'

config({ path: '.env.local' })

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Falta ${name}. Copiá .env.example a .env.local y completalo.`)
  }
  return value
}

export const db = createClient(
  required('SUPABASE_URL'),
  required('SUPABASE_SERVICE_ROLE_KEY'),
  {
    auth: { persistSession: false },
    // No usamos realtime, pero el cliente lo inicializa igual y en Node 20
    // no existe WebSocket nativo. Con Node 22+ esto se puede borrar.
    realtime: { transport: WebSocket as unknown as never },
  },
)

export const REGION_SLUG = process.env.REGION_SLUG ?? 'valle-primero'

export async function getRegion() {
  const { data, error } = await db
    .from('regions')
    .select('id, slug, name, tick')
    .eq('slug', REGION_SLUG)
    .single()
  if (error || !data) {
    throw new Error(`No encuentro la región "${REGION_SLUG}". ¿Corriste pnpm seed?`)
  }
  return data
}
