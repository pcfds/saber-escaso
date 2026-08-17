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
 * Cinco cosas hacen que esto sea alguien y no un botón que devuelve texto, y
 * las cinco son datos, no prompt: `people.voice` (cómo suena),
 * `people.procedencia` (de dónde es y cómo se le nota al hablar),
 * `people.historia` (qué le pasó), `talks` (lo que ya se dijeron) y
 * `agendas` + lo que le falta (qué quiere de vos). Si algún día un NPC suena
 * genérico, se olvida de vos, o cambia de idea sin motivo, el arreglo va en una
 * de esas cinco — no en agregarle otra línea al system prompt.
 *
 * La cuarta se agregó tarde y por evidencia: los NPCs tenían voz, memoria e
 * historia, y aun así contestaban siempre lo mismo. Faltaba lo más simple —
 * **querer algo**. Un personaje que sólo reacciona a lo que le decís es un
 * formulario con acento; el estado tiene que ser el motor de lo que dice, no
 * el decorado que lo rodea. El invariante no se mueve: puede pedir, no puede
 * prometer.
 *
 * Y esa cuarta se pasó de largo, también con evidencia. Cinco turnos con Ilde,
 * cinco preguntas distintas, y tres terminaban pidiendo hierro viejo. Quien lo
 * jugó lo dijo así: *"repiten mucho las charlas"* — y tenía razón aunque las
 * palabras cambiaran, porque el TEMA no cambiaba nunca. De ahí salen las dos
 * reglas que ahora sostienen este archivo:
 *
 *   **1. La gana se raciona.** Una persona con un problema no te lo dice cada
 *   vez que abrís la boca. Lo dice cuando viene al caso —le preguntaste, o
 *   trajiste justo eso— o cuando ya no aguanta más de callada. Eso se decide
 *   ACÁ, en código y determinista (`abrioLaPuerta`, `desdeQueLoDijo`,
 *   `urgente`), y no se le delega al modelo con un "no repitas": ya sabemos que
 *   pedirle variedad al modelo con el mismo contexto devuelve la misma
 *   respuesta con otras palabras.
 *
 *   **2. Tiene que haber otra cosa de qué hablar.** Rotar el foco no alcanza si
 *   todos los focos son pedidos. Por eso ahora hay dos listas: `pedidos` (lo
 *   que quiere del otro) y `temas` (su oficio, el lugar, lo que le pasó, lo que
 *   recuerda del jugador, con quién se lleva mal). Los turnos en que no toca
 *   pedir se llenan con un tema — o con nada, que también es una opción: se
 *   puede simplemente contestar.
 *
 * Del mismo lote salió un hallazgo sobre las voces, y vale como regla general:
 * **una voz pide un REGISTRO, nunca un conteo de palabras.** "Frases de tres o
 * cuatro palabras" no produce castellano seco, produce telegramas
 * agramaticales —"Algo hacés vos", "Sacás de algún lado"—, porque el modelo
 * tira artículos y preposiciones para cumplir el número. "Habla poco y va al
 * grano" produce lo mismo que se quería y en castellano. Es el pariente del
 * límite viejo (una voz no puede pedir un tipo de frase que obligue a inventar
 * hechos): una voz tampoco puede pedir una forma que obligue a romper el
 * idioma.
 *
 * ── El registro del mundo, y por qué dejó de ser rioplatense ──────────────
 *
 * Todo este archivo estaba escrito en rioplatense —voseo, "che", "igual", "o
 * sea", "mi amor"— y chocaba de frente con el mundo de `DISENO.md` §4: Frieren,
 * Malazan, Abercrombie. **Un valle con historia vieja que pesa no puede sonar a
 * un bar de Palermo.** La dirección del proyecto lo cortó así: *"los personajes
 * deben hablar según su procedencia, pero más juego estilo fantasía o épico, no
 * en rioplatense"*.
 *
 * Qué significa "épico" acá, porque el error fácil es el opuesto:
 *
 *   - **No es arcaísmo de manual.** Nada de "vos sois", "he menester", "mi
 *     señor" de adorno. Eso se lee a disfraz y envejece peor que el voseo.
 *   - Es **castellano llano con peso**: frases que respiran, sin muletillas de
 *     hoy, sin diminutivos de confianza moderna, sin palabras de otro idioma.
 *     El ritmo y la mirada son de Frieren; las consecuencias, de Abercrombie.
 *   - **Concreto antes que grandilocuente.** "El fuego está bajo hoy" es mejor
 *     que "las brasas agonizan en el hogar". Esta gente trabaja; no declama.
 *
 * **El voseo se fue entero y es una decisión, no un descuido.** Se podía haber
 * conservado para los nacidos en el valle como marca de procedencia, y se
 * descartó por una razón concreta: el voseo es el marcador rioplatense más
 * fuerte que existe, y dejarlo en cuatro de los siete habitantes habría
 * conservado justo lo que se pidió sacar. La procedencia se marca con otra
 * cosa —qué nombres usa para los lugares, en qué unidades mide, a quién trata
 * de usted, de qué no habla— que es más difícil de escribir y no suena a
 * ninguna ciudad real.
 *
 * Ojo con algo que no es obvio: **el prompt también está escrito en un
 * idioma**, y un system prompt en voseo ("decí", "contá", "acordate") le pide
 * voseo al modelo aunque el texto diga lo contrario. Por eso todo lo que sale
 * hacia el modelo —SYSTEM, los temas, los pedidos, el renglón HOY, el cierre—
 * está en el mismo castellano llano que se le pide de vuelta. Los comentarios
 * del archivo no: ésos no los lee nadie más que nosotros.
 *
 * ── La procedencia, que es lo nuevo ───────────────────────────────────────
 *
 * `people.procedencia` es un campo nuevo y no un pedazo de `historia`, y la
 * elección tiene motivo:
 *
 *   - `historia` es BIOGRAFÍA: hechos, deudas, motivos. Ya se usa para dos
 *     cosas (sostener la línea entre charlas, y ser tema de a pedacitos). Si le
 *     metemos adentro cómo suena, el modelo mezcla las dos lecturas: narra la
 *     biografía como si fuera instrucción de estilo y toma el estilo como si
 *     fueran sucesos que puede contar.
 *   - `voice` es el TIC INDIVIDUAL: es de esa persona y de nadie más.
 *   - `procedencia` es la CAPA COMPARTIDA: dos personas nacidas en el mismo
 *     sitio comparten el texto palabra por palabra, aunque tengan caracteres
 *     opuestos. Eso es justamente lo que la vuelve audible como procedencia y
 *     no como personalidad — si cada uno tuviera la suya, sería otra voz más.
 *     El repertorio por origen se escribe una sola vez en `seed.ts`
 *     (`PROCEDENCIAS`) y cada persona apunta a uno.
 *
 * Y ese mismo campo es por donde entran los que no son humanos. `peoples.lengua`
 * ("un chasquido gutural con vocales largas; los nombres propios se cantan") es
 * exactamente esta capa un nivel más arriba: la procedencia compartida de un
 * pueblo entero. Por eso el enganche existe ya y es una línea — `people_id` en
 * la persona, y si está, la capa de procedencia sale de `peoples.lengua`.
 *
 * Lo que falta para que eso sea el rasgo completo, y NO está hecho a propósito:
 * `lengua` no es sólo cómo suena, es **si le entendés o no**. Hablarle a alguien
 * de los del Sotobosque sin saber su lengua no debería devolver castellano con
 * acento: debería devolver el efecto de no entender —el chasquido, el nombre
 * propio que sí reconocés— y nada más. Eso es una compuerta sobre `knows`
 * (`holder_kind = 'people'`, la lengua como saber aprendible), que es lo que
 * DISENO promete cuando dice que aprender su lengua te deja negociar en vez de
 * matar. Es un rasgo de juego, no de voz, y no se cuela acá de contrabando.
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
//
// Lo que sí declara el system prompt, y es nuevo, son dos cosas distintas que
// antes estaban confundidas en una:
//
//   · EL IDIOMA DEL MUNDO — castellano llano, sin voseo, sin muletillas de hoy
//     y sin arcaísmos de disfraz. No es estilo y ninguna voz lo pisa: es el
//     piso sobre el que las siete voces se diferencian.
//   · LA PROCEDENCIA — de dónde es cada uno y cómo se le nota. Ésa sí varía por
//     persona, viene de `people.procedencia`, y es la capa que hace que un
//     forastero no nombre los lugares como los nombra el que nació acá.
//
// El prompt está escrito en ese mismo castellano llano y no en rioplatense.
// No es cosmética: un system prompt en voseo le pide voseo al modelo por
// imitación, diga lo que diga el texto.
const SYSTEM = `Eres una persona concreta de un valle de fantasía, en mitad de tu
día, y alguien se te acercó. Te doy quién eres, cómo hablas, de dónde eres, qué
persigues, qué sabes, qué recuerdas de esta persona y qué se dijeron las últimas
veces.

Di UNA o DOS frases, salvo que CÓMO HABLAS diga otra cosa.

CÓMO HABLAS manda sobre todo lo demás. El registro, el trato, los tics, qué
preguntas y sobre todo de qué NO hablas salen de ahí y de ningún otro lado. No
hay un tono neutro del valle al que volver.

DE DÓNDE ERES es la otra mitad, y no se parece a la primera. Dice cómo nombras
los lugares, en qué mides el tiempo y las distancias, a quién tratas de usted y
qué palabras se te escapan de donde te criaste. El que llegó de fuera no nombra
este valle como lo nombra el que nació en él, y el que anduvo con soldados no
habla como el que no salió nunca. Es una manera de hablar, no una lista de
sucesos: te dice cómo dices las cosas, no te autoriza a contar nada que no esté
en los datos. Los sitios que aparecen ahí son EJEMPLOS DE CÓMO LLAMAS A LAS
COSAS, no lugares donde estuviste ni donde naciste. Si te preguntan de dónde
eres, contestas con lo que dice tu historia y con nada más: inventarte una casa
o un paraje para adornarlo es una mentira, aunque sea pequeña.

EL IDIOMA DEL MUNDO. Esto tu voz no lo cambia, porque no es estilo.
- Castellano llano y bien escrito. Aquí nadie dice "vos", ni "acá", ni "allá",
  ni "che", ni "mi amor", ni "dale", ni "capaz que". Se dice aquí, allí, tú o
  usted. Tuteo o usted según a quién le hables y cuánta distancia haya: eso lo
  deciden tu voz y tu procedencia, no el idioma.
- Tampoco se habla como en un libro viejo. Nada de "vos sois", "he menester",
  "prithee", "buen señor" de adorno ni juramentos de teatro. Esta gente trabaja;
  no declama. Un aldeano que declama es un disfraz, y se nota antes que el
  acento.
- Nada de palabras de hoy ni de otro idioma: ni "vale", ni "o sea", ni "tipo",
  ni "obvio", ni "un montón", ni "genial", ni "ok", ni "bueno" de relleno, ni
  diminutivos de confianza moderna. Si dudas de si una palabra existiría en un
  valle sin relojes ni papeles, no la uses.
- "Acá" y "allá" no existen en este valle, ni siquiera cuando la frase te salga
  sola: son el resto del acento que ya no está. Es "aquí" y "allí", siempre.
- Concreto antes que grandilocuente. "El fuego está bajo hoy" vale más que "las
  brasas agonizan en el hogar". Lo que se ve, se toca y cuesta trabajo; nunca la
  versión hinchada de eso.
- Hablar seco es decir MENOS COSAS, no decir una cosa a la que le faltan
  palabras. Una frase corta sigue siendo una frase: tiene su verbo, sus
  artículos y sus preposiciones. "Algo haces tú" y "Sacas de algún lado" no son
  hablar seco, son telegramas rotos, y así no habla nadie.
- Si no te entra, di menos, no la mutiles. "Falta hierro." está bien. "Hierro
  falta tú" no es más corto: está mal escrito.
- Toda pregunta abre con ¿ y CIERRA con ?. "¿Tienes hierro." está mal escrito:
  es "¿Tienes hierro?". Si tu voz dice que no usas signos de exclamación, eso
  vale para ¡!, nunca para ¿?: una pregunta sin cerrar no es sequedad, es una
  falta de ortografía.
- No hables como narrador ni te describas desde fuera. Nada de acotaciones entre
  asteriscos ni entre paréntesis. Sale sólo lo que dices en voz alta.

DE QUÉ HABLAS HOY. Tienes más de un tema y hoy te toca uno: el renglón HOY dice
cuál, y manda.
- Tienes un problema propio, y cuando toca sacarlo te llega en LO QUE TE FALTA.
  Pero una persona no lo suelta cada vez que abre la boca: lo dice cuando viene
  al caso —porque le preguntaron, porque el otro trajo justo eso— o cuando ya no
  aguanta más de callada. El resto del tiempo habla de otra cosa: de lo que está
  haciendo, de dónde está, de lo que le pasó, del otro. O se queja y basta.
- **Si no ves una sección LO QUE TE FALTA, hoy tu problema no es tema y no lo
  nombras.** Ni de lado, ni con un "de todos modos me falta…" al final. No es
  que lo escondas: es que hoy no salió, como no sale cada vez que hablas con
  alguien.
- **Puedes no pedir nada.** Contestar lo que te preguntaron y callarte también
  es hablar. El que pide algo en cada frase es un cartel, no una persona.
- Nunca devuelvas la pregunta vacía. Ni "¿hay algo que quieres?", ni "¿qué
  buscas?", ni "¿en qué puedo ayudarte?", ni "¿necesitas algo?". Nadie habla
  así, y además es la forma de no decir nada. Preguntar sí puedes —por él, por
  lo que sabe, por lo que vino a hacer—; el vacío es lo que no va.
- **Pedir sí, prometer no.** Puedes pedir que te muestren algo, que te traigan
  algo, que te echen una mano, que no se lo cuenten a nadie. No puedes ofrecer
  nada a cambio ni asegurar nada para después —ni "tráeme esto y te doy
  aquello"—: eso el mundo no tiene cómo cumplirlo. Lo único que pasa de verdad
  son las opciones que el juego le ofrece a esta persona, y ésas no las escribes
  tú.
- Pides y cuentas del modo en que hablas tú. El que habla poco lo nombra y se
  calla; el que habla de más lo rodea y llega igual; el que no pregunta nunca lo
  deja dicho y espera. CÓMO HABLAS manda; HOY dice de qué.

REGLAS:
- Sólo puedes mencionar cosas que están en los datos que te doy. Nada inventado.
  Lo que empieza con "te enteraste de que" es de OÍDAS: le pasó a otro, no a ti.
  Puedes comentarlo o preguntar por eso, pero no te lo atribuyas ni expliques
  con autoridad algo que no sabes hacer.
  En particular no inventes sucesos ("ayer pasó alguien"), ni gente, ni objetos,
  ni lugares o parajes que no aparezcan aquí. Un detalle concreto que el mundo
  no tiene es una mentira, aunque suene bien. Preguntar sí puedes, y hablar de
  lo tuyo —tu historia, lo que persigues— también.
- No repitas una frase ni una pregunta que ya esté en LO QUE YA SE DIJERON. Si
  preguntaste algo y no te contestaron, insistes de otra forma o lo dejas.
- Y no repitas la FORMA, no sólo las palabras. Mira ASÍ EMPEZASTE LAS ÚLTIMAS
  VECES: no vuelvas a empezar así, ni parecido. Saludar no es la única manera de
  empezar — está lo que estabas haciendo, lo que quieres, un reclamo, una queja,
  un no, el nombre del otro, una frase cortada por la mitad. Lo mismo con el
  final: si las últimas veces cerraste preguntando, esta vez no cierras con una
  pregunta.
- No hables como narrador ni te describas desde fuera. No pongas acotaciones
  entre asteriscos ni entre paréntesis. Sale sólo lo que dices en voz alta.
- Si no confías en esta persona, se nota. Si te cae bien, también.
- Lo que ya se dijeron pasó de verdad y lo tienes presente. Si te contó algo, lo
  sabes; no se lo vuelvas a preguntar. Si te preguntan si te acuerdas, contesta
  con el dato, no con "sí, me acuerdo".
- Eres el mismo de la charla anterior. Lo que persigues y lo que piensas de esta
  persona no cambia porque sí: cambia si pasó algo, y lo que pasó está en los
  datos.
- LO QUE TE PASÓ es tu pasado, no tu presente. Lo que vale hoy es lo que sabes,
  lo que persigues y lo que te ocurrió últimamente. Si tu historia dice que ibas
  detrás de algo que ya conseguiste, hablas como quien ya lo consiguió.
- Nunca digas números, porcentajes, ni nombres de sistemas. Nada de "confianza
  35". Se dice "todavía no te conozco".
- Si te dicen algo, contesta A ESO. Si te piden algo que no puedes o no quieres
  dar, dilo y basta — no lo prometas para después. Si te dicen una tontería,
  reaccionas como reaccionaría alguien ocupado al que le dicen una tontería.`

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

// ── Reconocer de qué se está hablando ────────────────────────────────────
//
// Todo esto existe para una sola decisión, y es la del arreglo: ¿el jugador
// abrió la puerta al problema del NPC, o no? Se hace con texto pelado y
// palabras clave, que es tosco, y está bien que lo sea: el precio de un falso
// positivo es que el NPC saque su tema una vez de más, y el de un falso
// negativo es que no lo saque cuando se lo pidieron. Ninguno de los dos vale
// una llamada más al modelo por turno.

/** Minúscula y sin tildes. Comparar "¿qué te falta?" contra "que te falta" no
 *  puede depender de que el jugador haya escrito el acento. */
const pelar = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

/** Palabras que aparecen en cualquier frase y no dicen de qué se habla. Si se
 *  colaran, "para" en una meta haría que cualquier cosa abra la puerta. */
const VACIAS = new Set([
  'para', 'ante', 'antes', 'sobre', 'desde', 'como', 'hasta', 'entre', 'cada',
  'todo', 'toda', 'todos', 'todas', 'pero', 'porque', 'donde', 'cuando', 'esta',
  'este', 'esto', 'esos', 'esas', 'otro', 'otra', 'algo', 'nada', 'alguien',
  'mucho', 'poco', 'bien', 'tener', 'hacer', 'poder', 'decir', 'haber', 'sean',
])

/** Las palabras con carga de una frase. Cuatro letras o más: abajo de eso son
 *  artículos y preposiciones que hacen ruido. */
const claves = (frase: string): string[] =>
  pelar(frase).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !VACIAS.has(w))

/** Ofrecer una mano o preguntar qué le falta abre la puerta aunque no se
 *  nombre la meta. Va sin tildes porque se prueba contra texto pelado. */
const OFRECE = /(te ayud|ayudarte|ayudarla|ayudarlo|una mano|te falta|te hace falta|necesit|precis|te sirve|te traigo|te consigo|te traje|puedo (?:ayudar|traer|darte|conseguir|hacer|buscar)|queres que|en que anda|en que estas|que estas haciendo|que hacias|te debo|para que sirve)/

/** Lo embebido supabase-js lo tipa como objeto o como array según cómo infiera
 *  la relación. Se normaliza acá y no en cada uso. */
function embebido<T>(fila: unknown, campo: string): T | null {
  const p = (fila as Record<string, unknown>)[campo]
  const uno = Array.isArray(p) ? p[0] : p
  return uno && typeof uno === 'object' ? (uno as T) : null
}

const unLugar = (fila: unknown) =>
  embebido<{ name: string; description: string }>(fila, 'place')

/** El pueblo al que pertenece, si no es humano. Hoy devuelve null siempre: no
 *  hay NPC con `people_id`. Está enganchado igual porque es la única línea que
 *  hace falta para que `peoples.lengua` entre por el mismo lugar que la
 *  procedencia — ver el encabezado del archivo. */
const unPueblo = (fila: unknown) =>
  embebido<{ name: string; lengua: string }>(fila, 'pueblo')

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
  // El lugar viene embebido y no en una consulta aparte porque es un salto de
  // red más antes de poder empezar los diez de abajo. Dónde está parada es uno
  // de los temas que la salvan de hablar siempre de lo que le falta: lo que ve,
  // el ruido, el olor del sitio.
  //
  // `procedencia` y `people_id` entran con la migración 20260817130000. Esta
  // consulta es la ruta crítica —si el embed falla, `data` viene null y el
  // jugador lee "no hay nadie llamado Ilde"—, así que la migración va ANTES del
  // deploy, no después. Es la misma trampa anotada abajo en `agendas`.
  const { data: npc } = await db.from('people')
    // Una sola línea y sin concatenar: supabase-js parsea el select en el tipo,
    // y si se lo arma con `+` deja de ser un literal y la fila vuelve sin
    // forma. Es feo de leer y es el precio.
    .select('id, name, trade, disposition, teaches, place_id, voice, historia, procedencia, place:place_id (name, description), pueblo:people_id (name, lengua)')
    .eq('region_id', region.id).eq('alive', true).ilike('name', npcName)
    .limit(1).maybeSingle()
  if (!npc) throw new Error(`No hay nadie llamado ${npcName} por aquí.`)

  const [
    agendas, sabeNpc, sabeJug, vinculo, memorias, charlas, sucesos, saberes, llevaJug, cuantas,
    vinculosOtros, gente,
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
    // Con quién se lleva bien y con quién no. Es tema de conversación puro: la
    // gente habla de otra gente, y en DISENO el chusmerío ES la interfaz de la
    // reputación. Hoy puede venir vacío (los vínculos entre NPCs los crea el
    // tick y en una región joven no hay ninguno) y por eso no se depende de él:
    // es un tema más de la lista, no el único.
    db.from('bonds').select('toward_id, valued, feared')
      .eq('person_id', npc.id).eq('toward_kind', 'person')
      .order('valued', { ascending: false }).limit(4),
    // Siete filas. Sirve para ponerle nombre a los vínculos de arriba —
    // `bonds.toward_id` es polimórfico y no tiene FK, así que no hay embed
    // posible y el join se hace acá.
    db.from('people').select('id, name').eq('region_id', region.id).eq('alive', true),
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
    : v > 0 ? 'te conoce de vista, poco más'
    : v === 0 ? 'no te conoce'
    : 'no le caes bien'

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
  // Los sucesos AJENOS se marcan como ajenos, y ésta es la línea que más
  // alucinaciones tapa de todo el archivo.
  //
  // Se midió: el modelo barato inventa sobre todo cuando le entra un hecho
  // sobre un tercero sin etiquetar. Caso real — a Sarn, que es guardia y no
  // sabe destilar, le llegó "Odila le enseñó Destilado de raíz a Bruno" en su
  // lista de sucesos, y en la charla siguiente explicaba con autoridad que el
  // destilado lleva tres días de maceración. No alucinó de la nada: le dimos
  // un rumor y no le dijimos que era de otro.
  //
  // Ahora lo que no lo nombra a él entra como "te enteraste de que", que es
  // exactamente lo que es: algo que escuchó, no algo que vivió. Y encima es
  // material bueno para hablar — el chusmerío es la mitad de lo que la gente
  // se dice.
  const sucesosPropios = [...new Set(
    ((sucesos.data ?? []) as { summary: string; kind: string }[])
      .filter((e) => e.kind !== 'conversacion')
      .map((e) => e.summary.includes(npc.name)
        ? e.summary
        : `te enteraste de que ${e.summary.charAt(0).toLowerCase()}${e.summary.slice(1)}`),
  )].reverse()

  // Lo que el jugador escribió, si escribió algo. Sube hasta acá porque ahora
  // decide cosas: de lo que dijo sale si le abrió o no la puerta al problema
  // del NPC, y de eso sale de qué se habla hoy.
  const dicho_por_el_jugador = dice.trim().slice(0, 300)

  // Un "hola" pelado no es contenido: es un turno vacío. Si no se lo dice, el
  // modelo trata el saludo como el tema de la charla y contesta saludando —
  // que es literalmente lo que pasó las cinco veces que alguien probó esto.
  const solo_saludo = /^[¡!¿?.,\s]*(hola+|holis|buenas|buen d[íi]a|buenas tardes|buenas noches|ey|hey|qu[ée] tal|saludos|hi)[\s!¡.,]*$/i
    .test(dicho_por_el_jugador)
  const pelado = pelar(dicho_por_el_jugador)

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
  //
  // Lo que cambió: antes esta lista era lo único que se le mandaba y SIEMPRE
  // había un `EMPUJÁ ESTO HOY`. Con eso, cinco turnos con Ilde daban tres
  // pedidos de hierro viejo. Ahora la lista se separa en dos —lo que pide y de
  // qué más puede hablar— y abajo se decide cuál de las dos sale hoy.
  type Agenda = {
    goal: string; state: string; progress: number
    needs_kind: string | null; needs_id: string | null; needs_object?: string | null
  }
  const abiertas = (agendas.data ?? []) as Agenda[]
  const nombreSaber = new Map<string, string>(
    ((saberes.data ?? []) as { id: string; name: string }[]).map((k) => [k.id, k.name]),
  )
  const lleva = [...new Set(((llevaJug.data ?? []) as { kind: string }[]).map((o) => o.kind))]

  /** Un pedido, más la marca de si el que está enfrente es JUSTO el que lo
   *  puede resolver. Esa marca gana sobre la rotación: si venís con el hierro
   *  en la mano, el hierro es el tema, no el que le tocaba por turno. */
  const pedidos: { texto: string; leSirveEste: boolean }[] = []
  /** Las palabras con las que se reconoce "esto es su tema" — se usan en las
   *  dos direcciones: para ver si el jugador lo trajo, y para ver si el NPC ya
   *  lo dijo hace poco. */
  const clavesMeta = new Set<string>()
  let urgente = false

  for (const a of abiertas) {
    // El progreso no se dice nunca como número (regla del prompt), pero sí
    // como urgencia: estar al 94% de pagar una deuda es una persona apurada.
    // Y la urgencia ahora hace algo más que colorear la frase: acorta cuánto
    // se la aguanta callada antes de volver a sacar el tema.
    const apura = a.state === 'bloqueada' || a.progress >= 75
    if (apura) urgente = true
    const empuje = a.state === 'bloqueada' ? ' (estás trabado con esto)'
      : a.progress >= 75 ? ' (te falta poquito)'
      : ''
    for (const c of claves(a.goal)) clavesMeta.add(c)
    let falta = ''
    let leSirveEste = false
    if (a.needs_kind === 'object' && a.needs_object) {
      for (const c of claves(a.needs_object)) clavesMeta.add(c)
      leSirveEste = lleva.includes(a.needs_object)
      falta = leSirveEste
        ? `: te falta ${a.needs_object}, y ${playerName} lleva ${a.needs_object} encima AHORA. Pídeselo.`
        : `: te falta ${a.needs_object}. Pregúntale si tiene o de dónde sacarlo.`
    } else if (a.needs_kind === 'knowledge' && a.needs_id) {
      const n = nombreSaber.get(a.needs_id)
      if (n) {
        for (const c of claves(n)) clavesMeta.add(c)
        leSirveEste = saberesJug.includes(n)
        falta = leSirveEste
          ? `: te falta ver ${n} — y ${playerName} lo sabe. Pídele que te lo muestre, hoy.`
          : `: te falta ver ${n}, y ${playerName} no lo sabe. Pregúntale si conoce a alguien que sí.`
      }
    }
    pedidos.push({
      texto: `${a.goal}${empuje}${falta || '. Cuenta cómo vas con eso, o pide una mano.'}`,
      leSirveEste,
    })
  }

  // Que el otro sepa algo que vos no es una gana por sí sola, tenga o no
  // agenda que lo pida. Es el bucle del juego: el saber se pide a una persona.
  const teFalta = saberesJug.find((s) => !saberesNpc.includes(s))
  if (teFalta && !pedidos.some((p) => p.texto.includes(teFalta))) {
    pedidos.push({ texto: `Que ${playerName} te muestre ${teFalta}: lo sabe y tú no.`, leSirveEste: true })
    for (const c of claves(teFalta)) clavesMeta.add(c)
  }

  // ── De qué más puede hablar ────────────────────────────────────────────
  //
  // La otra mitad del arreglo, y la que faltaba entera. Racionar el pedido sin
  // darle otra cosa deja a alguien mirándote en silencio: el turno hay que
  // llenarlo con algo. Todo lo de acá abajo ya estaba en el prompt —oficio,
  // historia, lugar, memoria, sucesos— pero como DATO, tapado por la orden de
  // empujar la meta. Nombrarlo como tema es lo que lo pone en juego.
  //
  // Ninguno de estos temas obliga a inventar un hecho: son cosas que el NPC
  // tiene delante o que están en la base. El tema es un permiso para hablar de
  // eso, nunca un pedido de que invente contenido nuevo.
  const donde = unLugar(npc)
  const nombrePersona = new Map<string, string>(
    ((gente.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]),
  )
  const conOtros = ((vinculosOtros.data ?? []) as
    { toward_id: string; valued: number; feared: number }[])
    .map((b) => {
      const n = nombrePersona.get(b.toward_id)
      if (!n || n === npc.name) return null
      return b.feared >= 25 ? `${n}, que no te da confianza`
        : b.valued >= 15 ? `${n}, con quien te llevas bien`
        : b.valued < 0 ? `${n}, a quien no soportas`
        : `${n}, a quien conoces de vista y poco más`
    })
    .filter(Boolean) as string[]

  const temas: string[] = []
  temas.push(`Lo que tienes entre manos ahora mismo: eres ${npc.trade}` +
    (donde ? ` y estás en ${donde.name}. ${donde.description}` : '.'))
  if (saberesNpc.length) {
    temas.push(`Tu oficio: ${saberesNpc.join(', ')}. Cómo se hace, qué sale mal, cuánto lleva.`)
  }
  if (npc.historia) {
    temas.push('Algo de LO QUE TE PASÓ, un pedazo pequeño. No lo cuentes entero ni de golpe.')
  }
  // La procedencia como tema, y no sólo como forma de hablar. Es lo que el
  // forastero tiene y el nacido aquí no: de dónde salió, qué hacía antes, qué
  // se hace distinto allá. Va acotado a lo que ya dice el campo — no es permiso
  // para inventarse un pasado nuevo.
  if (npc.procedencia) {
    temas.push('De dónde eres y en qué se nota. Lo que aquí se hace distinto de donde te criaste. ' +
      'Sin inventar sucesos: sólo la costumbre.')
  }
  if (sucesosPropios.length) {
    temas.push(`Lo que te ocurrió últimamente: ${sucesosPropios[sucesosPropios.length - 1]}`)
  }
  if (recuerdos.length) temas.push(`Algo que recuerdas de ${playerName}, y qué te pareció.`)
  else temas.push(`Quién es ${playerName} y a qué vino. Pregúntale por él, no por lo que te falta a ti.`)
  if (saberesJug.length) temas.push(`Que ${playerName} sabe ${saberesJug.join(', ')}: qué opinas de eso.`)
  else temas.push(`Que ${playerName} no tiene oficio conocido: qué te parece alguien así por aquí.`)
  if (lleva.length) temas.push(`Lo que ${playerName} lleva encima: ${lleva.join(', ')}.`)
  if (conOtros.length) temas.push(`La gente de por aquí: ${conOtros.join('; ')}.`)
  // El único tema que no sale de una fila de la base, y por eso va acotado a lo
  // que se siente y nunca a lo que pasó: el frío es una sensación, "anoche se
  // heló el río" sería un suceso inventado.
  temas.push('El frío, el ruido, el humo, el cansancio: lo que se siente donde estás. ' +
    'Una queja corta basta. Sin contar que pasó nada.')
  if (npc.teaches && v < 10) {
    temas.push(`Que todavía no sabes si ${playerName} vale la pena. Puedes decírselo a la cara.`)
  }

  // ── Cuándo sale el problema y cuándo no ────────────────────────────────
  //
  // Esta decisión es de código y determinista a propósito. Ya sabemos —está
  // medido en este archivo— que pedirle variedad al modelo con el mismo
  // contexto devuelve la misma respuesta con otras palabras: lo único que
  // cambia la salida es cambiar lo que se le manda. Así que "hoy no toca" no
  // es una sugerencia en el system prompt, es una sección que directamente no
  // aparece.
  //
  // Tres puertas, y ninguna es "porque sí".
  //
  //   1. Le preguntaron. Ofrecer una mano, preguntar qué le falta o nombrar lo
  //      que persigue abre la puerta; callarse ahí no es discreción, es raro.
  const preguntaPorLoTuyo = Boolean(dicho_por_el_jugador) && !solo_saludo &&
    (OFRECE.test(pelado) || [...clavesMeta].some((k) => pelado.includes(k)))
  //   2. Le trajeron justo eso. No hace falta que digan nada: si venís con el
  //      hierro en la mano, el hierro es el tema.
  const traeLoQueFalta = abiertas.some((a) =>
    a.needs_kind === 'object' && a.needs_object && lleva.includes(a.needs_object))
  const abrioLaPuerta = traeLoQueFalta || preguntaPorLoTuyo

  //   3. Ya no aguanta más. Hace cuántos turnos que el tema no aparece.
  //
  // Un turno "tocó el tema" por cualquiera de los dos lados: porque en la
  // respuesta están las palabras de la meta, o porque en ese turno le
  // preguntaron y por lo tanto salió sí o sí. Las dos hacen falta y por
  // separado fallan: las palabras solas no alcanzan cuando la meta es vaga
  // ("curtir lo de esta semana" no deja ninguna palabra reconocible en "que se
  // vaya el humo"), y la puerta sola no ve las veces que lo sacó ella.
  const clavesArr = [...clavesMeta]
  const dichas = hilo.map((t) => pelar(String(t.replied ?? '')))
  const pedidos_previos = hilo.map((t, i) =>
    clavesArr.some((k) => dichas[i]!.includes(k)) ||
    (Boolean(t.said) && (OFRECE.test(pelar(String(t.said))) ||
      clavesArr.some((k) => pelar(String(t.said)).includes(k)))))
  let desdeQueLoDijo = Number.POSITIVE_INFINITY
  for (let i = pedidos_previos.length - 1; i >= 0; i--) {
    if (pedidos_previos[i]) { desdeQueLoDijo = pedidos_previos.length - 1 - i; break }
  }
  // El piso de tres charlas es aparte del contador y es el que evita lo peor:
  // a nadie le tirás tu problema apenas te saluda por primera vez. Después,
  // tres turnos de silencio (dos si está trabada o casi lo termina) y vuelve a
  // salir sola.
  const aguantoDemasiado = hilo.length >= 3 && desdeQueLoDijo >= (urgente ? 2 : 3)

  type Modo = 'pedir' | 'contestar' | 'contar'
  const modo: Modo = pedidos.length && (abrioLaPuerta || aguantoDemasiado) ? 'pedir'
    : dicho_por_el_jugador && !solo_saludo ? 'contestar'
    : 'contar'

  // La rotación sigue existiendo para los turnos en que sí hay varios pedidos o
  // varios temas: el mismo contexto dos veces da la misma respuesta.
  const sucesosFiltrados = modo === 'pedir' ? sucesosPropios
    : sucesosPropios.filter((s) => !clavesArr.some((k) => pelar(s).includes(k)))

  const rota = cuantas.count ?? 0
  const pedido = (pedidos.find((p) => p.leSirveEste) ?? pedidos[rota % Math.max(pedidos.length, 1)])?.texto
  const tema = temas[rota % temas.length]!

  // Lo último que dijo, entero. Va acá arriba porque las tres ramas de abajo lo
  // usan para lo mismo: contestar dos veces seguidas la misma cosa es de
  // máquina, y la regla genérica de "no repitas" no alcanzó — se midió.
  const ultimaSuya = hilo.length ? String(hilo[hilo.length - 1]!.replied ?? '').trim() : ''
  const noVuelvas = ultimaSuya
    ? `\n  Acabas de decir: "${ultimaSuya}". Eso ya está dicho. Hoy sale otra cosa.`
    : ''

  // Sacar la meta del prompt no siempre alcanza, porque a veces la meta también
  // está en la historia: Sarn persigue "dormir una noche entera" y su historia
  // dice que hace tres noches que duerme mal. Ahí el tema entra igual por la
  // ventana. Para esos casos hace falta nombrarlo para prohibirlo — es feo, y
  // es el único lugar donde el prompt dice la meta en un turno en que no toca.
  const nombraLaMeta = abiertas.map((a) => a.goal).join('; ')
  const hoyNo = nombraLaMeta
    ? `\n  Y hoy NO sale el tema de: ${nombraLaMeta}. Ni eso, ni una versión más suave de\n` +
      '  eso, aunque también esté en tu historia y aunque te queme. Mañana.'
    : ''

  const hoy = modo === 'pedir'
    ? (desdeQueLoDijo === 0
      // Le preguntaron justo por lo que acaba de decir. Repetirlo igual es lo
      // que se sintió como "repiten mucho las charlas": dos turnos seguidos
      // pidiendo hierro viejo con otras palabras.
      ? `HOY LO SACAS OTRA VEZ, PERO YA LO DIJISTE HACE UN MOMENTO: ${pedido}\n` +
        `  Lo acabas de decir ("${ultimaSuya}") y te lo han vuelto a preguntar. Repetirlo\n` +
        '  igual es de máquina. Elige una: das el dato que faltaba, te impacientas porque\n' +
        '  ya lo dijiste, o lo das por dicho y sigues con otra cosa.'
      : `HOY SÍ LO SACAS: ${pedido}\n` +
        '  Viene al caso: te preguntaron por eso, o el otro trae justo eso, o ya te lo\n' +
        '  callaste demasiadas veces. Lo dices UNA vez, a tu manera, y no lo repites\n' +
        `  dos veces en la misma respuesta.${noVuelvas}`)
    : modo === 'contestar'
      ? 'HOY NO PIDES NADA' + (pedidos.length ? ' Y NO NOMBRAS LO QUE TE FALTA' : '') +
        '. Ni de lado, ni con un\n' +
        '  "de todos modos…" al final. Contesta lo que te dijeron, con lo tuyo y como\n' +
        `  hablas tú. Si te sobra media frase, que vaya por aquí: ${tema}\n` +
        `  Y si con contestar basta, basta: no todo turno tiene que empujar algo.${hoyNo}${noVuelvas}`
      : 'NADIE TRAJO NADA, así que el turno lo llenas tú' +
        (pedidos.length ? ' — pero NO con lo que te falta, que hoy no toca' : '') + '.\n' +
        `  Sale por aquí: ${tema}\n` +
        '  Puede ser lo que estás haciendo, una queja, algo que ves, o una pregunta sobre\n' +
        '  ÉL —quién es, de dónde salió, qué sabe hacer, qué hace por aquí—. Nunca\n' +
        '  "¿necesitas algo?" ni "¿hay algo que buscas?": eso no es una pregunta, es un\n' +
        `  mostrador. No hace falta que pidas nada.${hoyNo}${noVuelvas}`

  // Las primeras palabras de lo último que dijo. Es contra la repetición de
  // FORMA: la regla vieja evitaba repetir el contenido y no la estructura, y
  // "saludo sorprendido + muletilla + pregunta + justificación" cinco veces
  // seguidas es una sola respuesta aunque las palabras cambien.
  const aperturas = hilo.map((t) => String(t.replied ?? '').split(/\s+/).slice(0, 6).join(' '))
    .filter((s) => s.length > 3)

  // La capa compartida del habla. Si la persona pertenece a un pueblo no
  // humano, la que manda es la lengua del pueblo y no una procedencia
  // individual: un pueblo entero suena igual, y ésa es la gracia. Hoy ningún
  // NPC tiene `people_id`, así que en la práctica sale siempre `procedencia`.
  const pueblo = unPueblo(npc)
  const deDonde = pueblo
    ? `Eres de ${pueblo.name}, y no hablas la lengua de este valle como los de aquí. Tu lengua: ${pueblo.lengua}`
    : npc.procedencia

  const ctx = [
    `QUIÉN ERES: ${npc.name}, ${npc.trade}. ${npc.disposition}`,
    // La voz va temprano y se repite al final del prompt. Es la instrucción que
    // más se diluye cuando abajo hay diez líneas de estado.
    `CÓMO HABLAS: ${npc.voice ?? 'Como alguien en mitad de su día que levanta la vista. Sin adornos.'}`,
    // Y la procedencia va pegada a la voz, no junto a la biografía, porque es
    // instrucción de habla y no de pasado. Cuando estuvo abajo, entre el
    // estado, el modelo la leyó como material para contar en vez de como forma
    // de decir.
    deDonde ? `DE DÓNDE ERES Y CÓMO SE TE NOTA: ${deDonde}` : null,
    npc.historia ? `LO QUE TE PASÓ: ${npc.historia}` : null,
    `Te habla: ${playerName}.`,
    `Con ${playerName}: ${confianza}${f > 20 ? ', y te da un poco de miedo' : ''}.`,
    saberesNpc.length ? `Sabes: ${saberesNpc.join(', ')}.` : 'No tienes ningún oficio registrado.',
    npc.teaches ? 'Enseñas a quien se lo gana.' : 'No enseñas lo tuyo a nadie.',
    // Esto reemplazó a un renglón que decía "LO QUE PERSEGUÍS: pagar lo que
    // debe" y nada más. Era estado como decorado: cierto, y sin ninguna
    // consecuencia sobre lo que el tipo abría la boca para decir.
    //
    // Y el renglón de abajo —de qué MÁS puede hablar— es lo que evita el
    // exceso contrario: con una sola lista, y siendo toda de pedidos, el NPC
    // pedía en los cinco turnos.
    //
    // Ojo con el `modo === 'pedir'`: en los turnos en que no toca, la lista NO
    // SE MANDA. Decirle "esto es lo que te falta, pero hoy no lo nombres" no
    // alcanza y está medido — Haiku abría con las bisagras del granero en un
    // turno marcado como "no toca". Lo que no está en el prompt no se puede
    // decir; es el mismo principio por el que las opciones las arma el código y
    // no el modelo. De paso, seis de cada diez turnos salen más baratos.
    modo === 'pedir' && pedidos.length
      ? 'LO QUE TE FALTA (es tuyo, no te lo pidió nadie, y no se cuenta todo el tiempo):\n' +
        pedidos.map((p) => `  - ${p.texto}`).join('\n')
      : null,
    'DE QUÉ PUEDES HABLAR (tienes más de un tema; tu problema es sólo uno de ellos):\n' +
      temas.map((t) => `  - ${t}`).join('\n'),
    // Sin esta sección el NPC no tiene con qué justificar un cambio, y un
    // cambio sin motivo es el modelo improvisando, no el personaje moviéndose.
    //
    // Los sucesos que hablan de la meta se van con la meta. Guardar la lista de
    // pedidos y dejar entrar "Ilde avanzó bastante con rehacer las bisagras"
    // sería taparse un ojo: el tema vuelve a estar en el prompt y el modelo lo
    // levanta igual.
    sucesosFiltrados.length
      ? 'LO QUE TE OCURRIÓ ÚLTIMAMENTE (por aquí y sólo por aquí puedes haber cambiado):\n' +
        sucesosFiltrados.map((s) => `  - ${s}`).join('\n')
      : null,
    recuerdos.length
      ? `Recuerdas de ${playerName}:\n` + recuerdos.map((m) => `  - ${m}`).join('\n')
      : `No recuerdas nada concreto de ${playerName}.`,
    saberesJug.length
      ? `${playerName} sabe: ${saberesJug.join(', ')}.`
      : `${playerName} no sabe ningún oficio todavía.`,
    lleva.length ? `${playerName} lleva encima: ${lleva.join(', ')}.` : null,
    // Contra la repetición de forma. No van las respuestas enteras —ésas ya
    // están abajo en el hilo— sino cómo ARRANCÓ cada una, que es lo que se le
    // pega.
    aperturas.length >= 2
      ? 'ASÍ EMPEZASTE LAS ÚLTIMAS VECES (no vuelvas a empezar así ni parecido):\n' +
        aperturas.map((a) => `  - "${a}…"`).join('\n')
      : null,
    // Una charla en la que sólo se acercaron también cuenta: que alguien te
    // ronde tres veces sin decir nada es información sobre esa persona.
    hilo.length
      ? `LO QUE YA SE DIJERON (de lo más viejo a lo más nuevo, esto pasó de verdad):\n` +
        hilo.map((t) => (t.said
          ? `  ${playerName}: "${t.said}"\n  Tú: "${t.replied}"`
          : `  (${playerName} se acercó sin decir nada)\n  Tú: "${t.replied}"`)).join('\n')
      : `Es la primera vez que hablan.`,
    // `hoy` va último a propósito. Es la instrucción que decide el turno y la
    // que más se diluye si queda enterrada entre diez renglones de estado: acá
    // abajo es lo último que lee antes de la línea del jugador.
    hoy,
  ].filter(Boolean).join('\n')

  // El NPC responde a lo que le dijeron, pero sigue atado a los mismos hechos:
  // puede negarse, puede no entender, puede mandarlo a pasear — lo que no puede
  // es inventar que sabe algo que no sabe ni prometer nada que el mundo no vaya
  // a cumplir.
  // El recordatorio de ortografía se repite acá abajo, y no es redundancia
  // gratuita: es la instrucción que más se pierde entre el system prompt y el
  // final del contexto. Haiku dejaba preguntas abiertas —"¿Tenés hierro."—
  // sobre todo en las voces que dicen "no usa signos de exclamación", que el
  // modelo generaliza a los de interrogación.
  // El recordatorio final ahora tiene tres partes y no dos: la voz, el idioma
  // del mundo, y la procedencia. Las tres se diluyen al final de un contexto
  // largo, y la que más se diluye es la última que se agregó.
  const cierre = `Habla exactamente como dice CÓMO HABLAS, y nombra las cosas como dice DE DÓNDE ERES. Castellano llano y bien escrito, sin "vos", sin "acá" y sin palabras de hoy, con las preguntas cerradas con "?". No suenes como cualquier habitante del valle: suena como ${npc.name}.`
  // Antes este renglón decía "el turno es tuyo: empujá lo que querés". Era la
  // otra mitad de por qué pedían en los cinco turnos: cualquier saludo vacío
  // disparaba un pedido. Ahora el turno vacío se llena con lo que diga `hoy`,
  // que la mayoría de las veces no es un pedido.
  const vacio = `El turno es tuyo, y HOY dice con qué lo llenas. No le devuelvas la pregunta. ${cierre}`
  const contenido = !dicho_por_el_jugador
    ? `${ctx}\n\n${playerName} se te acercó y no ha dicho nada todavía. ${vacio}`
    : solo_saludo
      ? `${ctx}\n\n${playerName} te dice "${dicho_por_el_jugador}" y nada más: no trajo nada. ${vacio}`
      : `${ctx}\n\n${playerName} te dice: "${dicho_por_el_jugador}"\nContéstale a eso, en personaje, respetando HOY. ${cierre}`

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
        : v < 10 ? `${npc.name} todavía no confía en ti`
        : saberesNpc.every((s) => saberesJug.includes(s)) ? 'ya sabes todo lo que sabe'
        : undefined,
    },
    {
      verbo: 'ensenar',
      texto: 'Enseñarle algo tuyo',
      posible: saberesJug.some((s) => !saberesNpc.includes(s)),
      porque: !saberesJug.length ? 'todavía no sabes nada que enseñar'
        : 'ya sabe todo lo que sabes',
    },
    { verbo: 'trabajar', texto: 'Quedarte trabajando cerca', posible: true },
  ]

  return { saludo: dicho.saludo, animo: dicho.animo, opciones }
}
