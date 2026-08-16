/**
 * Manda una acción. Se resuelve en el próximo tick.
 *
 *   pnpm act Pedro ir fragua
 *   pnpm act Pedro hablar Ilde
 *   pnpm act Pedro trabajar
 *   pnpm act Pedro aprender Ilde
 *   pnpm act Pedro ensenar Bruno
 *
 * Cinco verbos. Si el bucle no funciona con cinco, no lo salva el sexto.
 */
import { db, getRegion } from '../db.js'

const VERBOS = ['ir', 'hablar', 'trabajar', 'aprender', 'ensenar'] as const

async function main() {
  const [name, verb, ...rest] = process.argv.slice(2)
  const target = rest.join(' ') || null

  if (!name || !verb) {
    console.error('uso: pnpm act <nombre> <verbo> [objetivo]')
    console.error(`verbos: ${VERBOS.join(', ')}`)
    process.exit(1)
  }
  if (!VERBOS.includes(verb as (typeof VERBOS)[number])) {
    console.error(`"${verb}" no es un verbo. Son: ${VERBOS.join(', ')}`)
    process.exit(1)
  }

  const region = await getRegion()

  let { data: player } = await db
    .from('players').select('id, name, last_seen_tick')
    .eq('region_id', region.id).ilike('name', name).maybeSingle()

  if (!player) {
    const { data: aldea } = await db
      .from('places').select('id').eq('region_id', region.id).eq('slug', 'aldea').single()
    const { data: nuevo, error } = await db
      .from('players')
      .insert({
        region_id: region.id, name, place_id: aldea?.id,
        last_seen_tick: region.tick,
      })
      .select('id, name, last_seen_tick').single()
    if (error || !nuevo) throw error
    player = nuevo
    await db.from('events').insert({
      region_id: region.id, tick: region.tick, kind: 'llegada',
      place_id: aldea?.id,
      summary: `${name} llegó al valle por el Camino del Norte.`,
      detail: { player: name },
    })
    console.log(`${name} llegó al valle.`)
  }

  await db.from('actions').insert({
    player_id: player.id, verb, target, submitted_tick: region.tick,
  })

  console.log(`anotado: ${name} → ${verb}${target ? ` ${target}` : ''} (se resuelve en el próximo tick)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
