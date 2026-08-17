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
 * Cuatro cosas hacen que esto sea alguien y no un botón que devuelve texto, y
 * las cuatro son datos, no prompt: `people.voice` (cómo suena),
 * `people.historia` (de dónde viene), `talks` (lo que ya se dijeron) y
 * `agendas` + lo que le falta (qué quiere de vos). Si algún día un NPC suena
 * genérico, se olvida de vos, o cambia de idea sin motivo, el arreglo va en una
 * de esas cuatro — no en agregarle otra línea al system prompt.
 *
 * La cuarta se agregó tarde y por evidencia: los NPCs tenían voz, memoria e
 * historia, y aun así contestaban siempre lo mismo. Faltaba lo más simple —
 * **querer algo**. Un personaje que sólo reacciona a lo que le decís es un
 * formulario con acento; el estado tiene que ser el motor de lo que dice, no
 * el decorado que lo rodea. El invariante no se mueve: puede pedir, no puede
 * prometer.
 */
import { db, getRegion } from '../db.js'
import { pedirJson } from '../modelo.js'

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

QUERÉS ALGO DE ESTA CHARLA. No estás esperando a que te pregunten.
- LO QUE QUERÉS DE ESTA CHARLA es tuyo y es de hoy. Cuando el otro no trae
  nada —te saluda y ya—, ese silencio es tu oportunidad: metés lo tuyo, pedís,
  reclamás, insistís, te quejás. El que sólo reacciona no es una persona, es un
  formulario.
- EMPUJÁ ESTO HOY dice cuál de esas cosas te sale por la boca esta vez.
  Arrancá por ahí. Las otras están para que se te crucen, no para listarlas.
- Nunca le devuelvas la pregunta. Ni "¿hay algo que querés?", ni "¿qué andás
  buscando?", ni "¿en qué puedo ayudarte?", ni "¿necesitás algo?". Nadie habla
  así, y además es la forma de no decir nada. Si no sabés qué quiere el otro,
  no importa: decí lo tuyo.
- **Pedir sí, prometer no.** Podés pedir que te muestren algo, que te traigan
  algo, que te den una mano, que no le cuenten a nadie. No podés ofrecer nada a
  cambio ni asegurar nada para después —ni "traeme esto y te doy aquello"—:
  eso el mundo no tiene cómo cumplirlo. Lo único que pasa de verdad son las
  opciones que el juego le ofrece a esta persona, y esas no las escribís vos.
- Pedís del modo en que hablás vos. El que habla poco lo nombra y se calla; el
  que habla de más lo rodea y termina pidiéndolo igual; el que no pregunta
  nunca, lo deja dicho y espera. CÓMO HABLÁS manda; lo que querés es de qué
  hablás.

REGLAS:
- Sólo podés mencionar cosas que están en los datos que te doy. Nada inventado.
  En particular no inventes sucesos ("ayer pasó alguien"), ni gente, ni
  objetos, ni lugares o parajes que no aparezcan acá. Un detalle concreto que
  el mundo no tiene es una mentira, aunque suene bien. Preguntar sí podés, y
  hablar de lo tuyo —tu historia, lo que perseguís— también.
- No repitas una frase ni una pregunta que ya esté en LO QUE YA SE DIJERON. Si
  preguntaste algo y no te contestaron, insistís de otra forma o lo dejás.
- Y no repitas la FORMA, no sólo las palabras. Mirá ASÍ ARRANCASTE LAS ÚLTIMAS
  VECES: no vuelvas a empezar así, ni parecido. Saludar no es la única manera
  de empezar — está lo que estabas haciendo, lo que querés, un reclamo, una
  queja, un no, el nombre del otro, una frase cortada por la mitad. Lo mismo
  con el final: si las últimas veces cerraste preguntando, esta vez no cerrás
  con una pregunta.
- No hables como narrador ni te describas desde afuera. No pongas acotaciones
  entre asteriscos ni entre paréntesis. Sale sólo lo que decís en voz alta.
- Si no confiás en esta persona, se nota. Si te cae bien, también.
- Lo que ya se dijeron pasó de verdad y lo tenés presente. Si te contó algo, lo
  sabés; no se lo vuelvas a preguntar. Si te preguntan si te acordás, contestá
  con el dato, no con "sí, me acuerdo".
- Sos el mismo de la charla anterior. Lo que perseguís y lo que pensás de esta
  persona no cambia porque sí: cambia si pasó algo, y lo que pasó está en los
  datos.
- DE DÓNDE VENÍS es tu pasado, no tu presente. Lo que vale hoy es lo que Sabés,
  lo que perseguís y lo que te pasó últimamente. Si tu historia dice que ibas
  atrás de algo que ya conseguiste, hablás como el que ya lo consiguió.
- Nunca digas números, porcentajes, ni nombres de sistemas. Nada de "confianza
  35". Se dice "todavía no te conozco".
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

  // `.limit(1)` antes del maybeSingle porque el ilike puede pescar dos: con más
  // de una fila supabase-js devuelve error y `data` viene null, y el jugador
  // vería "no hay nadie llamado Ilde" justo cuando hay dos.
  const { data: npc } = await db.from('people')
    .select('id, name, trade, disposition, teaches, place_id, voice, historia')
    .eq('region_id', region.id).eq('alive', true).ilike('name', npcName)
    .limit(1).maybeSingle()
  if (!npc) throw new Error(`No hay nadie llamado ${npcName} por acá.`)

  const [
    agendas, sabeNpc, sabeJug, vinculo, memorias, charlas, sucesos, saberes, llevaJug, cuantas,
  ] = await Promise.all([
    // `select('*')` y no la lista de columnas: `agendas.needs_object` entra con
    // una migración que todavía no está en producción, y pedirle a supabase-js
    // una columna que no existe devuelve error con `data` en null. O sea: el
    // NPC se quedaría sin nada que perseguir, justo lo contrario de lo que
    // este archivo existe para arreglar. Son dos o tres filas; el `*` no duele.
    db.from('agendas').select('*').eq('person_id', npc.id).in('state', ['activa', 'bloqueada']),
    db.from('knows').select('knowledge:knowledge_id (name)')
      .eq('holder_kind', 'person').eq('holder_id', npc.id),
    db.from('knows').select('knowledge_id, knowledge:knowledge_id (name)')
      .eq('holder_kind', 'player').eq('holder_id', playerId),
    db.from('bonds').select('valued, feared')
      .eq('person_id', npc.id).eq('toward_id', playerId).maybeSingle(),
    db.from('memories').select('what, tick').eq('person_id', npc.id)
      .eq('about_id', playerId).order('tick', { ascending: false }).limit(12),
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
    db.from('events').select('summary, tick, kind').eq('region_id', region.id)
      .or(`detail->>person.eq."${npc.name}",detail->>from.eq."${npc.name}",detail->>to.eq."${npc.name}"`)
      .order('tick', { ascending: false }).limit(4),
    // El catálogo entero de saberes son ocho filas. Se trae completo para poder
    // ponerle NOMBRE a lo que le falta a una agenda: "te falta el temple de
    // río" es una gana; "needs_id: 5cbe74c9" no es nada.
    db.from('knowledge').select('id, name'),
    // Lo que el jugador lleva encima. Es la mitad concreta de "el NPC quiere
    // algo de vos": si Odila necesita raíz y vos tenés raíz en la mano, eso es
    // lo primero que dice, y no hay que inventarlo.
    db.from('objects').select('kind')
      .eq('region_id', region.id).eq('holder_kind', 'player').eq('holder_id', playerId).limit(6),
    // Cuántas veces hablaron EN TOTAL, no las últimas cinco. Con esto rota cuál
    // de sus ganas empuja hoy (ver `foco`): si el contexto que recibe es
    // idéntico charla tras charla, la salida también lo es.
    db.from('talks').select('id', { count: 'exact', head: true })
      .eq('person_id', npc.id).eq('player_id', playerId),
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

  // "Prueba3D vino a hablar conmigo" cinco veces no es memoria, es ruido: paga
  // tokens y encima le enseña al modelo que la charla es sobre el hecho de que
  // hay una charla —que es justo el bucle del que hay que salir—. Se deduplica
  // por texto y quedan las cinco distintas más nuevas.
  const recuerdos = [...new Set(((memorias.data ?? []) as { what: string }[]).map((m) => m.what))]
    .slice(0, 5)

  // Y de los sucesos se van las conversaciones: "Prueba3D habló con Bruno" ya
  // está, con más detalle, en LO QUE YA SE DIJERON.
  const sucesosPropios = [...new Set(
    ((sucesos.data ?? []) as { summary: string; kind: string }[])
      .filter((e) => e.kind !== 'conversacion').map((e) => e.summary),
  )].reverse()

  // ── Lo que el NPC quiere de esta charla ────────────────────────────────
  //
  // Es el arreglo de fondo de este archivo. Un NPC al que le pasás su estado
  // como decorado contesta siempre lo mismo: sin nada propio que empujar, el
  // tic de su voz TERMINA SIENDO la respuesta entera. Bruno saludaba
  // sorprendido, tapaba el silencio con "igual/o sea" y devolvía "¿hay algo
  // que querés?" cinco veces seguidas — cinco frases distintas y una sola
  // respuesta.
  //
  // Así que las ganas se calculan acá, del estado, y se le pasan como lo que
  // son: cosas que quiere de la persona que tiene enfrente. Todas son
  // PEDIBLES y ninguna es prometible — pedir que te muestren algo, que te
  // traigan algo, que se queden a dar una mano son exactamente las cosas que
  // el mundo sabe hacer (las opciones de abajo, `aprender` / `ensenar` /
  // `trabajar`). Nada de "traeme esto y te doy aquello": eso lo sigue
  // prohibiendo el system prompt.
  type Agenda = {
    goal: string; state: string; progress: number
    needs_kind: string | null; needs_id: string | null; needs_object?: string | null
  }
  const abiertas = (agendas.data ?? []) as Agenda[]
  const nombreSaber = new Map<string, string>(
    ((saberes.data ?? []) as { id: string; name: string }[]).map((k) => [k.id, k.name]),
  )
  const lleva = [...new Set(((llevaJug.data ?? []) as { kind: string }[]).map((o) => o.kind))]
  const ganas: string[] = []

  for (const a of abiertas) {
    // El progreso no se dice nunca como número (regla del prompt), pero sí
    // como urgencia: estar al 94% de pagar una deuda es una persona apurada.
    const empuje = a.state === 'bloqueada' ? ' (estás trabado con esto)'
      : a.progress >= 75 ? ' (te falta poquito)'
      : ''
    let falta = ''
    if (a.needs_kind === 'object' && a.needs_object) {
      falta = lleva.includes(a.needs_object)
        ? `: te falta ${a.needs_object}, y ${playerName} lleva ${a.needs_object} encima AHORA. Pedíselo.`
        : `: te falta ${a.needs_object}. Preguntale si tiene o de dónde sacarlo.`
    } else if (a.needs_kind === 'knowledge' && a.needs_id) {
      const n = nombreSaber.get(a.needs_id)
      if (n) {
        falta = saberesJug.includes(n)
          ? `: te falta ver ${n} — y ${playerName} lo sabe. Pedile que te lo muestre, hoy.`
          : `: te falta ver ${n}, y ${playerName} no lo sabe. Preguntale si conoce a alguien que sí.`
      }
    }
    ganas.push(`${a.goal}${empuje}${falta || '. Contá en qué andás con eso, o pedí una mano.'}`)
  }

  // Que el otro sepa algo que vos no es una gana por sí sola, tenga o no
  // agenda que lo pida. Es el bucle del juego: el saber se pide a una persona.
  const teFalta = saberesJug.find((s) => !saberesNpc.includes(s))
  if (teFalta && !ganas.some((g) => g.includes(teFalta))) {
    ganas.push(`Que ${playerName} te muestre ${teFalta}: lo sabe y vos no.`)
  }
  // El que enseña y todavía no te ubica no quiere darte nada: quiere ver si
  // valés la pena. Eso también es querer algo de la charla.
  if (npc.teaches && v < 10 && saberesNpc.some((s) => !saberesJug.includes(s))) {
    ganas.push(`Ver si ${playerName} sirve para algo antes de mostrarle nada tuyo.`)
  }
  // Que el otro no tenga oficio conocido es una gana en sí misma, y es la que
  // salva al forastero recién llegado: sin esto, el que todavía no sabe nada ni
  // trae nada no le despierta nada a nadie, y ahí volvemos al saludo vacío.
  if (!saberesJug.length) {
    ganas.push(`Averiguar qué sabe hacer ${playerName}, si es que sabe algo: no le conocés oficio.`)
  }
  if (!recuerdos.length) {
    ganas.push(`Saber quién es ${playerName} y a qué vino: no sabés nada suyo.`)
  }
  ganas.push(`Que ${playerName} se quede y te dé una mano con lo tuyo.`)

  // Cuál empuja HOY. Rota con la cantidad de charlas por una razón medida: con
  // el mismo contexto exacto, el modelo devuelve la misma respuesta con otras
  // palabras. Cambiar qué se le manda es lo único que rompe eso de verdad; una
  // regla más de "no repitas" no alcanza.
  const foco = ganas[(cuantas.count ?? 0) % ganas.length]

  // Las primeras palabras de lo último que dijo. Es contra la repetición de
  // FORMA: la regla vieja evitaba repetir el contenido y no la estructura, y
  // "saludo sorprendido + muletilla + pregunta + justificación" cinco veces
  // seguidas es una sola respuesta aunque las palabras cambien.
  const aperturas = hilo.map((t) => String(t.replied ?? '').split(/\s+/).slice(0, 6).join(' '))
    .filter((s) => s.length > 3)

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
    // Esto reemplazó a un renglón que decía "LO QUE PERSEGUÍS: pagar lo que
    // debe" y nada más. Era estado como decorado: cierto, y sin ninguna
    // consecuencia sobre lo que el tipo abría la boca para decir.
    `LO QUE QUERÉS DE ESTA CHARLA (es tuyo, no te lo pidió nadie):\n` +
      ganas.map((g) => `  - ${g}`).join('\n'),
    `EMPUJÁ ESTO HOY: ${foco}`,
    // Sin esta sección el NPC no tiene con qué justificar un cambio, y un
    // cambio sin motivo es el modelo improvisando, no el personaje moviéndose.
    sucesosPropios.length
      ? 'LO QUE TE PASÓ ÚLTIMAMENTE (por acá y sólo por acá podés haber cambiado):\n' +
        sucesosPropios.map((s) => `  - ${s}`).join('\n')
      : null,
    recuerdos.length
      ? `Recordás de ${playerName}:\n` + recuerdos.map((m) => `  - ${m}`).join('\n')
      : `No recordás nada puntual de ${playerName}.`,
    saberesJug.length
      ? `${playerName} sabe: ${saberesJug.join(', ')}.`
      : `${playerName} no sabe ningún oficio todavía.`,
    lleva.length ? `${playerName} lleva encima: ${lleva.join(', ')}.` : null,
    // Contra la repetición de forma. No van las respuestas enteras —ésas ya
    // están abajo en el hilo— sino cómo ARRANCÓ cada una, que es lo que se le
    // pega.
    aperturas.length >= 2
      ? 'ASÍ ARRANCASTE LAS ÚLTIMAS VECES (no vuelvas a arrancar así ni parecido):\n' +
        aperturas.map((a) => `  - "${a}…"`).join('\n')
      : null,
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

  // Un "hola" pelado no es contenido: es un turno vacío. Si no se lo dice, el
  // modelo trata el saludo como el tema de la charla y contesta saludando —
  // que es literalmente lo que pasó las cinco veces que alguien probó esto.
  const solo_saludo = /^[¡!¿?.,\s]*(hola+|holis|buenas|buen d[íi]a|buenas tardes|buenas noches|ey|hey|qu[ée] tal|saludos|hi)[\s!¡.,]*$/i
    .test(dicho_por_el_jugador)

  const cierre = `Hablá exactamente como dice CÓMO HABLÁS. No suenes como cualquier habitante del valle: soná como ${npc.name}.`
  const vacio = `El turno es tuyo: empujá lo que querés, no le devuelvas la pregunta. ${cierre}`
  const contenido = !dicho_por_el_jugador
    ? `${ctx}\n\n${playerName} se te acercó y no dijo nada todavía. ${vacio}`
    : solo_saludo
      ? `${ctx}\n\n${playerName} te dice "${dicho_por_el_jugador}" y nada más: no trajo nada. ${vacio}`
      : `${ctx}\n\n${playerName} te dice: "${dicho_por_el_jugador}"\nContestale a eso, en personaje. ${cierre}`

  // Cada charla es una llamada suelta y barata: sin `esfuerzo`, porque una o
  // dos frases en personaje no mejoran por pensarlas más, y con `respaldo`,
  // porque si el modelo no devuelve nada el NPC murmura y la charla sigue.
  // Dejar al jugador plantado frente a alguien que no contesta es peor.
  const { datos: dicho, inTokens, costUsd } = await pedirJson<{ saludo: string; animo: string }>({
    modelo: process.env.DIALOGO_MODEL ?? 'claude-haiku-4-5',
    maxTokens: 600,
    schema: SCHEMA,
    system: SYSTEM,
    prompt: contenido,
    respaldo: { saludo: '…', animo: 'neutral' },
  })
  // Con `VER_PROMPT=1` sale por consola lo que se le mandó y lo que costó. No
  // es debug olvidado: cada charla es una llamada, el prompt creció de ~2100 a
  // ~2900 tokens al meterle las ganas, y la próxima vez que alguien quiera
  // agregarle una sección conviene que pueda medir antes de discutir.
  if (process.env.VER_PROMPT) {
    console.log(`\n───── ${npc.name} ─────\n${contenido}\n─────`)
    console.log(`[costo] ${inTokens} tokens de entrada · US$${costUsd.toFixed(5)}`)
  }

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
