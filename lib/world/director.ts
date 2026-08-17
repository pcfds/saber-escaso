/**
 * El director. Lee el mundo, escribe la crónica. NO TOCA EL ESTADO.
 *
 *   pnpm look Pedro
 *
 * Dos reglas que hacen válido el experimento:
 *
 *  1. Sólo puede narrar hechos que están en los eventos que se le pasan. Cada
 *     afirmación tiene que apuntar a un id. Lo que narre fuera de esa lista es
 *     una alucinación y el script la detecta y la reporta.
 *
 *  2. Recibe el estado completo del mundo, no sólo el delta. Las agendas de los
 *     NPCs avanzaron mientras el jugador no estaba, y el director tiene que
 *     adaptarse a dónde quedaron las cosas — su trabajo no es hacer que pasen
 *     cosas, es traerlas al campo de visión del jugador.
 */
import { db, getRegion } from '../db.js'
import { pedirJson } from '../modelo.js'

const SYSTEM = `Sos el director de un mundo de fantasía persistente. Un jugador
vuelve después de un rato y tenés que contarle qué pasó mientras no estaba.

REGLA ABSOLUTA: sólo podés afirmar hechos que aparezcan en el bloque HECHOS.
No inventes personas, lugares, saberes, muertes ni conversaciones. Si los hechos
son pocos, la crónica es corta — eso está bien. Un mundo tranquilo se cuenta
tranquilo. Preferís decir poco y cierto antes que mucho y adornado.

Podés y debés: elegir qué contar primero, conectar hechos entre sí, darle voz a
lo que la gente dice, y señalar lo que le conviene mirar al jugador. Eso es
interpretación, no invención.

El bloque MUNDO es contexto para que entiendas dónde quedaron las cosas —
quién sigue vivo, qué está persiguiendo cada uno, quién sabe qué. Usalo para
elegir el foco y para que la crónica encaje con el estado actual, pero no
narres como sucedido nada que esté sólo ahí y no en HECHOS.

NUNCA uses el vocabulario del sistema. El jugador no sabe que existen los ticks,
los porcentajes, las agendas ni los estados internos. Palabras prohibidas: tick,
progreso, porcentaje, estado, agenda, evento. Se dice "hace unos días", no
"hace tres ticks".

Y no le digas al jugador qué tan cerca está alguien de conseguir algo. Eso no
lo puede saber salvo que alguien se lo cuente. Podés decir que Marta anda
marcando sendas; no que le falta poco.

No enumeres a toda la gente del valle uno por uno — eso es una planilla con
prosa. Pero tampoco te quedes corto: si hay muchos hechos, elegí los cinco o
seis que más le cambian algo al jugador y contalos con detalle. Un valle donde
pasaron quince cosas y le contás tres se siente vacío sin serlo.

Priorizá, en este orden: muertes y saberes perdidos; lo que le pasó al jugador
o a su nombre; enseñanzas y oficios nuevos; conflictos entre personas; el resto.

Escribí en español rioplatense, en segunda persona, dos o tres párrafos cortos.
Nada de encabezados ni listas. Empezá por lo que más le importa al jugador.
Si alguien murió llevándose un saber, eso va primero. Cerrá señalando algo
concreto que le convenga mirar.`

const SCHEMA = {
  type: 'object',
  properties: {
    text: {
      type: 'string',
      description: 'La crónica para el jugador. Dos o tres párrafos cortos.',
    },
    used_event_ids: {
      type: 'array',
      items: { type: 'string' },
      description: 'Ids de HECHOS que respaldan lo que narraste. Sólo ids de la lista dada.',
    },
    nothing_happened: {
      type: 'boolean',
      description: 'true si no hubo ningún hecho digno de contar.',
    },
  },
  required: ['text', 'used_event_ids', 'nothing_happened'],
  additionalProperties: false,
} as const

export type Cronica = {
  text: string; leidos: number; usados: number; inventados: string[]
  model: string; inTokens: number; outTokens: number; costUsd: number
}

export type Opciones = {
  model?: string
  effort?: 'low' | 'medium' | 'high'
  /** No escribe la crónica ni mueve al jugador. Para comparar modelos. */
  dryRun?: boolean
}

export async function narrate(playerName: string, opts: Opciones = {}): Promise<Cronica> {
  const model = opts.model ?? process.env.DIRECTOR_MODEL ?? 'claude-opus-5'
  const effort = opts.effort ?? (process.env.DIRECTOR_EFFORT as 'low' | undefined) ?? 'low'
  const region = await getRegion()

  const { data: player } = await db
    .from('players').select('id, name, place_id, last_seen_tick')
    .eq('region_id', region.id).ilike('name', playerName).maybeSingle()
  if (!player) throw new Error(`No hay ningún jugador llamado "${playerName}".`)

  // ── HECHOS: lo único que puede narrar ─────────────────────
  const events = (await db
    .from('events')
    .select('id, tick, kind, summary, place_id')
    .eq('region_id', region.id)
    .gt('tick', player.last_seen_tick)
    .order('tick', { ascending: true })
    .limit(60)).data ?? []

  // ── MUNDO: dónde quedaron las cosas ───────────────────────
  const [places, people, agendas, sabe, vinculos, memorias] = await Promise.all([
    db.from('places').select('id, name, kind').eq('region_id', region.id),
    db.from('people').select('id, name, trade, place_id, disposition, teaches')
      .eq('region_id', region.id).eq('alive', true),
    db.from('agendas').select('person_id, goal, state, progress')
      .in('state', ['activa', 'bloqueada']),
    db.from('knows').select('holder_kind, holder_id, knowledge:knowledge_id (name)'),
    db.from('bonds').select('person_id, valued, feared').eq('toward_id', player.id),
    db.from('memories').select('person_id, what, tick').eq('about_id', player.id)
      .order('tick', { ascending: false }).limit(15),
  ])

  const placeName = (id: string | null | undefined) =>
    places.data?.find((p) => p.id === id)?.name ?? '—'
  const knowsOf = (kind: string, id: string) =>
    (sabe.data ?? [])
      .filter((k) => k.holder_kind === kind && k.holder_id === id)
      .map((k) => (k.knowledge as unknown as { name: string } | null)?.name)
      .filter(Boolean)

  const mundo = [
    `Región: ${region.name}. Tick actual: ${region.tick}. El jugador estuvo por última vez en el tick ${player.last_seen_tick}.`,
    `Jugador: ${player.name}, en ${placeName(player.place_id)}. Sabe: ${knowsOf('player', player.id).join(', ') || 'nada todavía'}.`,
    '',
    'Gente viva:',
    ...(people.data ?? []).map((p) => {
      const suyas = (agendas.data ?? []).filter((a) => a.person_id === p.id)
      const v = (vinculos.data ?? []).find((b) => b.person_id === p.id)
      return [
        `- ${p.name} (${p.trade}) en ${placeName(p.place_id)}. ${p.disposition}`,
        `  sabe: ${knowsOf('person', p.id).join(', ') || 'nada registrado'}`,
        // Sin porcentajes a propósito: si se los pasamos, el director se los
        // cuenta al jugador, y el jugador no tiene forma de saberlos. Lo único
        // que agrega valor es si la meta está trabada, porque eso sí se nota.
        suyas.length ? `  persigue: ${suyas.map((a) => a.goal + (a.state === 'bloqueada' ? ' (trabada)' : '')).join(' | ')}` : '',
        v ? `  hacia el jugador: valorado ${v.valued}, temido ${v.feared}` : '',
        p.teaches ? '' : '  no enseña',
      ].filter(Boolean).join('\n')
    }),
    '',
    'Lo que la gente recuerda del jugador:',
    ...((memorias.data ?? []).map((m) => {
      const quien = people.data?.find((p) => p.id === m.person_id)?.name ?? 'alguien'
      return `- ${quien}: "${m.what}" (tick ${m.tick})`
    })),
  ].join('\n')

  const hechos = events.length
    ? events.map((e) => `[${e.id}] tick ${e.tick} · ${e.kind} · ${placeName(e.place_id)} — ${e.summary}`).join('\n')
    : '(ninguno)'

  // Sin `respaldo` a propósito: una crónica que no salió es un fallo y tiene
  // que reventar acá. Inventarle un texto vacío al jugador sería peor, y
  // taparía justo el modo de falla que el experimento busca medir.
  const { datos: chronicle, inTokens, outTokens, costUsd } = await pedirJson<{
    text: string; used_event_ids: string[]; nothing_happened: boolean
  }>({
    modelo: model,
    esfuerzo: effort,
    maxTokens: 4000,
    schema: SCHEMA,
    system: SYSTEM,
    prompt: `MUNDO\n${mundo}\n\nHECHOS (los únicos que podés afirmar)\n${hechos}`,
  })

  // ── Auditoría: ¿narró algo que no pasó? ───────────────────
  const validos = new Set(events.map((e) => e.id))
  const inventados = chronicle.used_event_ids.filter((id) => !validos.has(id))

  if (!opts.dryRun) {
    await db.from('chronicles').insert({
      player_id: player.id,
      from_tick: player.last_seen_tick,
      to_tick: region.tick,
      text: chronicle.text,
      source_events: chronicle.used_event_ids.filter((id) => validos.has(id)),
    })
    await db.from('players').update({ last_seen_tick: region.tick }).eq('id', player.id)
  }

  return {
    text: chronicle.text.trim(),
    leidos: events.length,
    usados: chronicle.used_event_ids.length,
    inventados,
    model, inTokens, outTokens, costUsd,
  }
}

if (process.argv[1]?.endsWith('director.ts')) {
  const name = process.argv[2]
  if (!name) {
    console.error('uso: pnpm look <nombre-jugador>')
    process.exit(1)
  }
  const c = await narrate(name)
  console.log('\n' + c.text + '\n')
  if (c.inventados.length) {
    console.error(`⚠ El director citó ${c.inventados.length} evento(s) inexistente(s): ${c.inventados.join(', ')}`)
    console.error('  Eso es una alucinación — el modo de falla que el experimento busca.')
  }
  console.log(`— ${c.leidos} hechos leídos, ${c.usados} usados.`)
}
