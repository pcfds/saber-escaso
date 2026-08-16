/**
 * Hablar con un NPC.
 *
 * NO es un chatbot. Un NPC de conversación libre se descubre en dos frases y
 * después nadie le vuelve a hablar. Acá el NPC dice una o dos líneas que salen
 * de su estado real —lo que persigue, lo que recuerda de vos, si confía— y te
 * ofrece respuestas que hacen algo en el mundo.
 *
 * Igual que el director: sólo puede afirmar lo que está en la base. Y tampoco
 * escribe estado: el diálogo devuelve texto y opciones; ejecutar la opción es
 * una acción normal que pasa por el tick.
 */
import Anthropic from '@anthropic-ai/sdk'
import { db, getRegion } from '../db.js'

const anthropic = new Anthropic()

const SYSTEM = `Sos un habitante de un valle de fantasía hablándole a alguien
que se te acercó. Te doy quién sos, qué estás persiguiendo, qué sabés y qué
recordás de esta persona.

Decí UNA o DOS frases. Cortas. En español rioplatense. Como habla alguien que
está en el medio de su día y levanta la vista, no como un personaje que espera
a que le hablen.

REGLAS:
- Sólo podés mencionar cosas que están en los datos que te doy. Nada inventado.
- Si no confiás en esta persona, se nota. Si te cae bien, también.
- Si recordás algo puntual de ella, mencionalo — eso es lo que la hace sentir
  vista.
- Si estás trabado en lo que perseguís, es lo primero que se te sale por la boca.
- Nunca digas números, porcentajes, ni nombres de sistemas. Nada de "confianza
  35". Se dice "todavía no te conozco".
- No preguntes "¿en qué puedo ayudarte?". Nadie habla así.
- Si te dicen algo, contestá A ESO. Si te piden algo que no podés o no querés
  dar, decilo y ya — no lo prometas para después. Si te dicen una pavada,
  reaccionás como reaccionaría alguien ocupado al que le dicen una pavada.`

const SCHEMA = {
  type: 'object',
  properties: {
    saludo: { type: 'string', description: 'Una o dos frases que dice el NPC.' },
    animo: {
      type: 'string',
      enum: ['calido', 'neutral', 'seco', 'hostil'],
      description: 'Cómo suena, para pintarlo en pantalla.',
    },
  },
  required: ['saludo', 'animo'],
  additionalProperties: false,
} as const

export type Dialogo = {
  saludo: string
  animo: string
  opciones: { verbo: string; texto: string; posible: boolean; porque?: string }[]
}

export async function hablarCon(
  playerId: string, playerName: string, npcName: string, dice = '',
): Promise<Dialogo> {
  const region = await getRegion()

  const { data: npc } = await db.from('people')
    .select('id, name, trade, disposition, teaches, place_id')
    .eq('region_id', region.id).eq('alive', true).ilike('name', npcName).maybeSingle()
  if (!npc) throw new Error(`No hay nadie llamado ${npcName} por acá.`)

  const [agendas, sabeNpc, sabeJug, vinculo, memorias] = await Promise.all([
    db.from('agendas').select('goal, state').eq('person_id', npc.id).in('state', ['activa', 'bloqueada']),
    db.from('knows').select('knowledge:knowledge_id (name)')
      .eq('holder_kind', 'person').eq('holder_id', npc.id),
    db.from('knows').select('knowledge_id, knowledge:knowledge_id (name)')
      .eq('holder_kind', 'player').eq('holder_id', playerId),
    db.from('bonds').select('valued, feared')
      .eq('person_id', npc.id).eq('toward_id', playerId).maybeSingle(),
    db.from('memories').select('what, tick').eq('person_id', npc.id)
      .eq('about_id', playerId).order('tick', { ascending: false }).limit(6),
  ])

  const nombres = (r: { data: unknown[] | null }) =>
    (r.data ?? []).map((k) => ((k as { knowledge: { name: string } | null }).knowledge)?.name)
      .filter(Boolean) as string[]

  const saberesNpc = nombres(sabeNpc)
  const saberesJug = nombres(sabeJug)
  const v = vinculo.data?.valued ?? 0
  const f = vinculo.data?.feared ?? 0

  const confianza = v >= 40 ? 'te tiene mucha confianza'
    : v >= 10 ? 'te tiene algo de confianza'
    : v > 0 ? 'te ubica, poco más'
    : v === 0 ? 'no te conoce'
    : 'no le caés bien'

  const ctx = [
    `Sos ${npc.name}, ${npc.trade}. ${npc.disposition}`,
    `Te habla: ${playerName}.`,
    `Con ${playerName}: ${confianza}${f > 20 ? ', y te da un poco de miedo' : ''}.`,
    saberesNpc.length ? `Sabés: ${saberesNpc.join(', ')}.` : 'No tenés ningún oficio registrado.',
    npc.teaches ? 'Enseñás a quien se lo gana.' : 'No enseñás lo tuyo a nadie.',
    (agendas.data ?? []).length
      ? `Estás persiguiendo: ${(agendas.data ?? []).map((a) =>
          a.goal + (a.state === 'bloqueada' ? ' (y estás trabado)' : '')).join('; ')}.`
      : 'No estás persiguiendo nada en particular.',
    (memorias.data ?? []).length
      ? `Recordás de ${playerName}:\n` + (memorias.data ?? []).map((m) => `  - ${m.what}`).join('\n')
      : `No recordás nada puntual de ${playerName}.`,
    saberesJug.length
      ? `${playerName} sabe: ${saberesJug.join(', ')}.`
      : `${playerName} no sabe ningún oficio todavía.`,
  ].join('\n')

  // Lo que el jugador escribió, si escribió algo. El NPC responde a eso, pero
  // sigue atado a los mismos hechos: puede negarse, puede no entender, puede
  // mandarlo a pasear — lo que no puede es inventar que sabe algo que no sabe
  // ni prometer nada que el mundo no vaya a cumplir.
  const dicho_por_el_jugador = dice.trim().slice(0, 300)
  const contenido = dicho_por_el_jugador
    ? `${ctx}\n\n${playerName} te dice: "${dicho_por_el_jugador}"\nContestale a eso, en personaje.`
    : ctx

  const res = await anthropic.messages.create({
    model: process.env.DIALOGO_MODEL ?? 'claude-haiku-4-5',
    max_tokens: 600,
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content: contenido }],
  })

  const raw = res.content.find((b) => b.type === 'text')
  const dicho = raw && raw.type === 'text'
    ? (JSON.parse(raw.text) as { saludo: string; animo: string })
    : { saludo: '…', animo: 'neutral' }

  // Las opciones no las inventa el modelo: salen del estado. Así una respuesta
  // nunca promete algo que el mundo no puede cumplir.
  const puedeEnsenarte = npc.teaches && v >= 10 && saberesNpc.some((s) => !saberesJug.includes(s))
  const opciones: Dialogo['opciones'] = [
    {
      verbo: 'aprender',
      texto: `Pedirle que te enseñe`,
      posible: puedeEnsenarte,
      porque: !npc.teaches ? `${npc.name} no le enseña lo suyo a nadie`
        : v < 10 ? `${npc.name} todavía no confía en vos`
        : saberesNpc.every((s) => saberesJug.includes(s)) ? 'ya sabés todo lo que sabe'
        : undefined,
    },
    {
      verbo: 'ensenar',
      texto: 'Enseñarle algo tuyo',
      posible: saberesJug.some((s) => !saberesNpc.includes(s)),
      porque: !saberesJug.length ? 'todavía no sabés nada que enseñar'
        : 'ya sabe todo lo que sabés',
    },
    { verbo: 'trabajar', texto: 'Quedarte trabajando cerca', posible: true },
  ]

  return { saludo: dicho.saludo, animo: dicho.animo, opciones }
}
