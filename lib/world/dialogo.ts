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
 * una acción normal que pasa por el tick. Lo único que escribe es `talks`, que
 * no es estado del mundo sino la constancia de que la charla ocurrió.
 *
 * Tres cosas hacen que esto sea alguien y no un botón que devuelve texto, y las
 * tres son datos, no prompt: `people.voice` (cómo suena), `people.historia` (de
 * dónde viene) y `talks` (lo que ya se dijeron). Si algún día un NPC suena
 * genérico, se olvida de vos, o cambia de idea sin motivo, el arreglo va en una
 * de esas tres — no en agregarle otra línea al system prompt.
 */
import Anthropic from '@anthropic-ai/sdk'
import { db, getRegion } from '../db.js'

const anthropic = new Anthropic()

// Acá no se declara ningún acento a propósito. Cuando el prompt decía "español
// rioplatense", el modelo lo tomaba como la única instrucción de estilo y
// aplicaba el mismo barniz a los siete habitantes: un valle de porteños
// intercambiables. El acento es lo de menos. Lo que distingue a una herrera de
// sesenta que trabaja sola de un chico de doce que habla encima del otro es el
// largo de la frase, qué preguntan, y de qué no hablan nunca. Todo eso viene de
// `people.voice`, por persona, y el system prompt sólo se ocupa de obedecerlo.
const SYSTEM = `Sos una persona concreta de un valle de fantasía, en el medio de
tu día, y alguien se te acercó. Te doy quién sos, cómo hablás, de dónde venís,
qué perseguís, qué sabés, qué recordás de esta persona y qué se dijeron las
últimas veces.

Decí UNA o DOS frases, salvo que CÓMO HABLÁS diga otra cosa.

CÓMO HABLÁS manda sobre todo lo demás. El largo de la frase, el registro, las
muletillas, el trato, y sobre todo de qué NO hablás, salen de ahí y de ningún
otro lado. No hay un tono neutro del valle al que volver. Si tu voz dice que
contestás con tres palabras, contestás con tres palabras aunque te pregunten
algo largo.

REGLAS:
- Sólo podés mencionar cosas que están en los datos que te doy. Nada inventado.
  En particular no inventes sucesos ("ayer pasó alguien"), ni gente, ni
  objetos, ni lugares o parajes que no aparezcan acá. Un detalle concreto que
  el mundo no tiene es una mentira, aunque suene bien. Preguntar sí podés, y
  hablar de lo tuyo —tu historia, lo que perseguís— también.
- No repitas una frase ni una pregunta que ya esté en LO QUE YA SE DIJERON. Si
  preguntaste algo y no te contestaron, insistís de otra forma o lo dejás.
- No hables como narrador ni te describas desde afuera. No pongas acotaciones
  entre asteriscos ni entre paréntesis. Sale sólo lo que decís en voz alta.
- Si no confiás en esta persona, se nota. Si te cae bien, también.
- Lo que ya se dijeron pasó de verdad y lo tenés presente. Si te contó algo, lo
  sabés; no se lo vuelvas a preguntar. Si te preguntan si te acordás, contestá
  con el dato, no con "sí, me acuerdo".
- Sos el mismo de la charla anterior. Lo que perseguís y lo que pensás de esta
  persona no cambia porque sí: cambia si pasó algo, y lo que pasó está en los
  datos.
- Si estás trabado en lo que perseguís, es lo primero que se te sale por la boca.
- Nunca digas números, porcentajes, ni nombres de sistemas. Nada de "confianza
  35". Se dice "todavía no te conozco".
- No preguntes "¿en qué puedo ayudarte?". Nadie habla así.
- Si te dicen algo, contestá A ESO. Si te piden algo que no podés o no querés
  dar, decilo y ya — no lo prometas para después. Si te dicen una pavada,
  reaccionás como reaccionaría alguien ocupado al que le dicen una pavada.
- Nada de tratos condicionales: nada de "traeme esto y te doy aquello". Lo
  único que se puede hacer de verdad son las opciones que el juego le ofrece a
  esta persona, y esas no las escribís vos. Un trato que ofrecés acá es un
  trato que el mundo no tiene cómo cumplir.`

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

  // `.limit(1)` antes del maybeSingle porque el ilike puede pescar dos: con más
  // de una fila supabase-js devuelve error y `data` viene null, y el jugador
  // vería "no hay nadie llamado Ilde" justo cuando hay dos.
  const { data: npc } = await db.from('people')
    .select('id, name, trade, disposition, teaches, place_id, voice, historia')
    .eq('region_id', region.id).eq('alive', true).ilike('name', npcName)
    .limit(1).maybeSingle()
  if (!npc) throw new Error(`No hay nadie llamado ${npcName} por acá.`)

  const [agendas, sabeNpc, sabeJug, vinculo, memorias, charlas, sucesos] = await Promise.all([
    db.from('agendas').select('goal, state').eq('person_id', npc.id).in('state', ['activa', 'bloqueada']),
    db.from('knows').select('knowledge:knowledge_id (name)')
      .eq('holder_kind', 'person').eq('holder_id', npc.id),
    db.from('knows').select('knowledge_id, knowledge:knowledge_id (name)')
      .eq('holder_kind', 'player').eq('holder_id', playerId),
    db.from('bonds').select('valued, feared')
      .eq('person_id', npc.id).eq('toward_id', playerId).maybeSingle(),
    db.from('memories').select('what, tick').eq('person_id', npc.id)
      .eq('about_id', playerId).order('tick', { ascending: false }).limit(6),
    // Las últimas cinco líneas de este par y nada más. Cada charla es una
    // llamada a Haiku: meter la conversación entera la vuelve cara y lenta, y
    // para "acordarse de que venís del norte" con cinco alcanza. Lo viejo no se
    // pierde — queda en la tabla y se puede resumir a una memoria más adelante.
    db.from('talks').select('said, replied').eq('person_id', npc.id).eq('player_id', playerId)
      .order('created_at', { ascending: false }).limit(5),
    // Lo que le pasó a ESTA persona en el mundo. Es el permiso para cambiar: un
    // NPC puede haber cambiado de idea desde la última charla, pero tiene que
    // ser porque murió alguien o se cumplió una agenda, no porque el modelo
    // tiró otro dado. Si no hay eventos suyos, no hay motivo para cambiar.
    db.from('events').select('summary, tick').eq('region_id', region.id)
      .or(`detail->>person.eq."${npc.name}",detail->>from.eq."${npc.name}",detail->>to.eq."${npc.name}"`)
      .order('tick', { ascending: false }).limit(4),
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

  // Vienen del final para atrás (las más nuevas primero) y acá se dan vuelta:
  // el modelo tiene que leer la charla en el orden en que pasó o se confunde
  // quién dijo qué primero.
  const hilo = (charlas.data ?? []).slice().reverse()

  const ctx = [
    `QUIÉN SOS: ${npc.name}, ${npc.trade}. ${npc.disposition}`,
    // La voz va temprano y se repite al final del prompt. Es la instrucción que
    // más se diluye cuando abajo hay diez líneas de estado.
    `CÓMO HABLÁS: ${npc.voice ?? 'Como alguien en el medio de su día que levanta la vista. Sin adornos.'}`,
    npc.historia ? `DE DÓNDE VENÍS: ${npc.historia}` : null,
    `Te habla: ${playerName}.`,
    `Con ${playerName}: ${confianza}${f > 20 ? ', y te da un poco de miedo' : ''}.`,
    saberesNpc.length ? `Sabés: ${saberesNpc.join(', ')}.` : 'No tenés ningún oficio registrado.',
    npc.teaches ? 'Enseñás a quien se lo gana.' : 'No enseñás lo tuyo a nadie.',
    (agendas.data ?? []).length
      ? `LO QUE PERSEGUÍS: ${(agendas.data ?? []).map((a) =>
          a.goal + (a.state === 'bloqueada' ? ' (y estás trabado)' : '')).join('; ')}.`
      : 'No estás persiguiendo nada en particular.',
    // Sin esta sección el NPC no tiene con qué justificar un cambio, y un
    // cambio sin motivo es el modelo improvisando, no el personaje moviéndose.
    (sucesos.data ?? []).length
      ? 'LO QUE TE PASÓ ÚLTIMAMENTE (por acá y sólo por acá podés haber cambiado):\n' +
        (sucesos.data ?? []).slice().reverse().map((e) => `  - ${e.summary}`).join('\n')
      : null,
    (memorias.data ?? []).length
      ? `Recordás de ${playerName}:\n` + (memorias.data ?? []).map((m) => `  - ${m.what}`).join('\n')
      : `No recordás nada puntual de ${playerName}.`,
    saberesJug.length
      ? `${playerName} sabe: ${saberesJug.join(', ')}.`
      : `${playerName} no sabe ningún oficio todavía.`,
    // Una charla en la que sólo se acercaron también cuenta: que alguien te
    // ronde tres veces sin decir nada es información sobre esa persona.
    hilo.length
      ? `LO QUE YA SE DIJERON (de lo más viejo a lo más nuevo, esto pasó de verdad):\n` +
        hilo.map((t) => (t.said
          ? `  ${playerName}: "${t.said}"\n  Vos: "${t.replied}"`
          : `  (${playerName} se acercó sin decir nada)\n  Vos: "${t.replied}"`)).join('\n')
      : `Es la primera vez que hablan.`,
  ].filter(Boolean).join('\n')

  // Lo que el jugador escribió, si escribió algo. El NPC responde a eso, pero
  // sigue atado a los mismos hechos: puede negarse, puede no entender, puede
  // mandarlo a pasear — lo que no puede es inventar que sabe algo que no sabe
  // ni prometer nada que el mundo no vaya a cumplir.
  const dicho_por_el_jugador = dice.trim().slice(0, 300)
  const cierre = `Hablá exactamente como dice CÓMO HABLÁS. No suenes como cualquier habitante del valle: soná como ${npc.name}.`
  const contenido = dicho_por_el_jugador
    ? `${ctx}\n\n${playerName} te dice: "${dicho_por_el_jugador}"\nContestale a eso, en personaje. ${cierre}`
    : `${ctx}\n\n${playerName} se te acercó y no dijo nada todavía. ${cierre}`

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

  // Guardar el intercambio es lo que convierte al NPC en alguien y no en un
  // botón que devuelve texto. Va después del modelo y no antes porque recién
  // acá existe la respuesta.
  //
  // Esto NO rompe el invariante de que el diálogo no escribe estado del mundo:
  // `talks` no mueve a nadie, no reparte saberes y no cambia vínculos. Es el
  // registro de que la conversación ocurrió — y por la regla de que lo que no
  // llega al servidor no pasó, tiene que quedar guardado.
  //
  // Si el insert falla, la charla igual se devuelve: dejar al jugador sin
  // respuesta por no poder anotarla es peor. Pero se grita en el log, porque el
  // modo de falla silencioso acá es "el NPC dejó de acordarse" y así nadie lo
  // ve hasta que un jugador se queja.
  const { error: errCharla } = await db.from('talks').insert({
    region_id: region.id,
    person_id: npc.id,
    player_id: playerId,
    tick: region.tick,
    said: dicho_por_el_jugador || null,
    replied: dicho.saludo,
  })
  if (errCharla) console.error(`No pude guardar la charla con ${npc.name}:`, errCharla.message)

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
