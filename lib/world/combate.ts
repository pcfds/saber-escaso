/**
 * Un golpe. La única cosa del mundo que no espera al tick.
 *
 * Todo lo demás es lento a propósito —un tick es un día y el cron corre uno
 * por hora— pero el combate no sobrevive a esa latencia: el jugador aprieta,
 * no pasa nada durante una hora, y vuelve a creer que los bichos son teatro
 * del cliente. Esa era exactamente la queja. Así que pelear se resuelve en el
 * momento, en el servidor, y deja su rastro en `events` como cualquier otra
 * cosa que pasó.
 *
 * No rompe ningún invariante: los invariantes dicen que la simulación no usa
 * IA y que el director no escribe estado, no que toda acción tenga que pasar
 * por el tick. **Este archivo lo va a importar `tick.ts`, así que acá no entra
 * el SDK de Anthropic — ni directo ni de rebote.**
 */
import { db } from '../db.js'

const roll = (max: number) => Math.floor(Math.random() * max)

/** Sólo estas dos cortan. Que un arma cambie el resultado es medio juego: el
 *  arma existe porque alguien supo hacerla, y si ese alguien se muere sin
 *  enseñarle a nadie, el valle vuelve a pelear a mano limpia para siempre. */
const ARMAS = ['hoja templada', 'filo de agua']

export type EventoPelea = {
  kind: string
  place_id: string | null
  summary: string
  detail: Record<string, unknown>
}

export type Golpe =
  | { ok: false; porque: string }
  | { ok: true; danio: number; health: number; muerta: boolean; arma: string | null }

export async function pelear(args: {
  regionId: string
  tick: number
  player: { id: string; name: string; place_id: string | null }
  /** El uuid de la amenaza. Si no viene, la primera viva donde está parado. */
  threatId?: string | null
  /** Sumidero de eventos. El tick los junta y los inserta todos juntos al
   *  final; la web no tiene ese final, así que si no viene se escribe acá. */
  ev?: (e: EventoPelea) => void
}): Promise<Golpe> {
  const { regionId, tick, player, threatId, ev } = args

  // Sin id y sin lugar no hay a quién pegarle, y hay que cortar antes de la
  // query: mandarle '' a una columna uuid no devuelve vacío, revienta.
  if (!threatId && !player.place_id) return { ok: false, porque: 'no hay nada que pelear acá' }

  let q = db.from('threats')
    .select('id, kind, nombre, people_id, health, max_health, place_id')
    .eq('region_id', regionId).eq('alive', true)
  q = threatId ? q.eq('id', threatId) : q.eq('place_id', player.place_id!)
  // .limit(1) aunque el id sea único: sin él, dos bichos en el mismo lugar
  // hacen que maybeSingle() devuelva error y data null, y el golpe se pierde
  // justo cuando hay más de un monstruo — el único caso que importa.
  const { data: bicho } = await q.limit(1).maybeSingle()
  if (!bicho) return { ok: false, porque: 'no hay nada que pelear acá' }

  const armas = (await db.from('objects')
    .select('kind, quality, made_by')
    .eq('holder_kind', 'player').eq('holder_id', player.id)).data ?? []
  const arma = armas
    .filter((o) => ARMAS.includes(o.kind))
    .sort((a, b) => b.quality - a.quality)[0]

  const danio = 8 + roll(8) + Math.floor((arma?.quality ?? 0) / 6)
  const restante = Math.max(0, bicho.health - danio)

  const emitir = async (e: EventoPelea) => {
    if (ev) return ev(e)
    await db.from('events').insert({ region_id: regionId, tick, ...e })
  }

  if (restante > 0) {
    await db.from('threats').update({ health: restante }).eq('id', bicho.id)
    await emitir({
      kind: 'pelea', place_id: bicho.place_id,
      summary: arma
        ? `${player.name} le entró a ${bicho.kind} con ${arma.kind}, y sigue en pie.`
        : `${player.name} le entró a ${bicho.kind} a mano limpia, y sigue en pie.`,
      detail: { player: player.name, threat: bicho.kind, weapon: arma?.kind ?? null },
    })
    return { ok: true, danio, health: restante, muerta: false, arma: arma?.kind ?? null }
  }

  await db.from('threats')
    .update({ alive: false, health: 0, killed_by: player.name, killed_tick: tick })
    .eq('id', bicho.id)
  await emitir({
    kind: 'amenaza_muerta', place_id: bicho.place_id,
    summary: arma
      ? `${player.name} mató a ${bicho.kind} con ${arma.kind}${arma.made_by && arma.made_by !== player.name ? `, que había hecho ${arma.made_by}` : ''}.`
      : `${player.name} mató a ${bicho.kind} sin nada en las manos.`,
    detail: { player: player.name, threat: bicho.kind, weapon: arma?.kind ?? null },
  })

  // Lo ven, y no todos lo leen igual: al que te teme le sube el miedo, no el
  // aprecio. Dos ejes, no una barra. Los testigos son los del lugar donde
  // cayó el bicho, no donde está parado el jugador: pueden diferir si peleó
  // por id contra algo de otro lado.
  const testigos = (await db.from('people')
    .select('id').eq('region_id', regionId).eq('alive', true)
    .eq('place_id', bicho.place_id)).data ?? []
  for (const t of testigos) {
    await recordar(t.id, player.id, `${player.name} mató a ${bicho.kind} acá`, tick)
    await tocarVinculo(t.id, player.id, { valued: 8, feared: 5 })
  }

  return { ok: true, danio, health: 0, muerta: true, arma: arma?.kind ?? null }
}

/** Los NPCs recuerdan lo que VIERON. Vive acá y no en tick.ts para que el
 *  combate inmediato deje la misma huella que el combate del tick. */
export async function recordar(
  personId: string, playerId: string, what: string, tick: number,
) {
  await db.from('memories').insert({
    person_id: personId, about_kind: 'player', about_id: playerId, what, tick,
  })
}

export async function tocarVinculo(
  personId: string, playerId: string, delta: { valued?: number; feared?: number },
) {
  const { data: actual } = await db
    .from('bonds').select('id, valued, feared')
    .eq('person_id', personId).eq('toward_id', playerId).limit(1).maybeSingle()
  const clamp = (n: number) => Math.max(-100, Math.min(100, n))
  if (actual) {
    await db.from('bonds').update({
      valued: clamp(actual.valued + (delta.valued ?? 0)),
      feared: clamp(actual.feared + (delta.feared ?? 0)),
    }).eq('id', actual.id)
  } else {
    await db.from('bonds').insert({
      person_id: personId, toward_kind: 'player', toward_id: playerId,
      valued: clamp(delta.valued ?? 0), feared: clamp(delta.feared ?? 0),
    })
  }
}
