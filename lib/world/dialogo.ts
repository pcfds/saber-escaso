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
// Los umbrales viven en tick.ts, que es quien los aplica. Importarlos y no
// copiarlos: la copia que había en web.ts decía 10 cuando el real era 35, y el
// juego mandaba a hacer algo que iba a fallar.
import { UMBRAL_ENCARGO, UMBRAL_ENSENAR, despiertoA, horaDelValle } from './tick.js'
// El mismo hash chico y estable que usa la huella de los saludos. Acá es la
// clave del enfriamiento de una iniciativa que sale de un recuerdo.
import { hash } from './saludos.js'
import { pedirJson } from '../modelo.js'

/**
 * Cuánto se aguanta un NPC antes de volver a empezar algo con vos: **un día del
 * valle**, o sea un tick, o sea seis horas de reloj.
 *
 * El número no es de gusto y conviene dejar la cuenta escrita, porque la
 * pregunta correcta acá es cuántas veces por día de mundo dispara:
 *
 *   · Una sesión de las que este juego busca dura una hora. Seis horas de
 *     enfriamiento son más largas que la sesión, así que **cada NPC arranca
 *     algo con vos como mucho una vez por sesión.** Con siete habitantes eso
 *     son hasta siete arranques en una tarde: el valle te busca y ninguno te
 *     persigue.
 *   · Si te quedás todo el día, el cron corre cuatro veces, así que el techo
 *     real es cuatro por persona y por día. Sigue estando lejos del vendedor.
 *   · Y no se mide en segundos a propósito. Los 90 segundos del saludo son de
 *     reloj porque el saludo es un cruce físico —pasás, te ven, te ven de
 *     nuevo—. Que alguien te pida algo suyo no es un cruce, es un acto de su
 *     vida, y su vida se mide en días. Un enfriamiento de segundos haría que
 *     una tarde larga valiera cuarenta pedidos.
 *
 * Se cuenta contra `talks.iniciativa`, no contra un contador en memoria: el
 * servidor se reinicia en cada request de Vercel.
 */
const ESPERA_INICIATIVA_TICKS = 1

/** Y cuánto tarda en volver a salir EL MISMO motivo, por prefijo de la clave.
 *
 * Hace falta aparte del de arriba, y se descubrió midiendo. Con un solo día
 * para todo, `trabada` ganaba siempre: es el motivo con más peso y el que más
 * gente tiene abierto —siete de las nueve agendas del valle esperan una cosa—,
 * así que volvía a estar disponible cada mañana y **los otros tres no salían
 * nunca.** Un valle donde nadie comenta que llegó alguien por el Camino del
 * Norte porque todos están pidiendo una piedra de afilar no es un valle vivo,
 * es una ferretería.
 *
 * Los números, y la cuenta contra los cuatro ticks que entran en un día real:
 *
 *   · `trabada` — tres días del valle, o sea unas dieciocho horas de reloj. Te
 *     lo pidió; si vuelves esta tarde no te lo repite, y si vuelves mañana sí.
 *     Es el ritmo con el que un vecino insiste con algo.
 *   · `encargo` — dos. Una deuda se cobra más seguido que un favor se pide, y
 *     ésa es justamente la diferencia entre las dos cosas.
 *   · `noticia` y `recuerdo` — no vuelven nunca, y no por este número: la
 *     clave lleva el id del evento o el hash del recuerdo, así que la misma
 *     noticia no existe dos veces. El valor está por completitud.
 */
const ESPERA_POR_MOTIVO: Record<string, number> = {
  trabada: 3, encargo: 2, noticia: 1, recuerdo: 1,
}

/** Qué pasó en el valle que un habitante comentaría al día siguiente.
 *
 *  La lista es corta y la razón es el invariante 3, no el gusto: **una noticia
 *  sólo puede entrar acá si es plausible que esta persona la sepa sin haber
 *  estado.** Que se murió alguien, que nació alguien, que llegó alguien por el
 *  Camino del Norte o que hay un bicho suelto se sabe en el valle entero en un
 *  día; que Bruno avanzó con las bisagras, no. Por eso no están `trabajo`,
 *  `agenda_avanza`, `hallazgo` ni `confianza`: para que fueran honestas habría
 *  que preguntar quién estaba delante, y eso es una consulta por evento.
 *
 *  `conversacion` y `rumor` quedan fuera por otro motivo: son el ruido que ya
 *  inundó la ventana del director una vez, y encima el jugador estuvo ahí. */
const NOTICIABLE = [
  'muerte', 'nacimiento', 'llegada', 'perdida_de_saber',
  'amenaza', 'amenaza_muerta', 'agenda_bloqueada', 'agenda_soltada',
]

/** Las dos que pesan más que cualquier cosa que uno quiera pedir.
 *
 *  Alguien que acaba de enterarse de que se murió el último que sabía forjar no
 *  te abre la boca para pedirte carbón. Es la única jerarquía escrita a mano de
 *  todo esto y existe porque sin ella el orden lo decidía el azar de la
 *  rotación. */
const GRAVE = new Set(['muerte', 'perdida_de_saber'])

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

/** Palabras que aparecen en el pasado y en cualquier otra frase: las de
 *  preguntar y las de rellenar. No dicen de qué se está hablando.
 *
 *  Es `VACIAS` para el pasado, y hace falta aparte por un motivo que se midió:
 *  estas palabras están en la pregunta del jugador **y también en la prosa de
 *  las piezas**, que están escritas para ser contadas. "¿Qué se cuenta del
 *  incendio de la Casa Quemada?" enganchaba con «lo que pasó no lo cuenta
 *  nadie» —una pieza que se calla, sobre otra cosa, en el mismo sitio— y le
 *  ganaba a la pieza del incendio, que era la que le habían pedido. Resultado:
 *  la herrera esquivaba una pregunta que podía contestar.
 *
 *  No van en `VACIAS` porque ahí romperían lo otro: "contar" y "saber" sí
 *  distinguen una meta de otra ("aprender a contar los inviernos").
 *
 *  El segundo grupo —"vacía", "cosa", "queda", "después"— entró por el otro
 *  extremo del mismo problema y también medido: el guardia de "esto ya lo
 *  conté" daba por contada la pieza del incendio porque una respuesta suelta
 *  de la vieja Ren decía "vacío" y "después". Con seis piezas en total, casi
 *  cualquier palabra es rara; lo que hace falta no es que sea rara, es que
 *  hable de algo. */
const PREGUNTONAS = new Set([
  'cuenta', 'cuentan', 'cuentas', 'cuento', 'contar', 'cuentame', 'cuentas',
  'dice', 'dicen', 'dices', 'decir', 'dijo', 'dijeron', 'digo', 'dijiste',
  'paso', 'pasa', 'pasan', 'pasar', 'pasaron', 'pasado', 'pasaba',
  'sabe', 'sabes', 'saben', 'saber', 'sabia', 'sabias', 'sabido',
  'conoce', 'conoces', 'conocer', 'recuerda', 'recuerdas', 'recordar',
  'acuerda', 'acuerdas', 'oido', 'escuchado', 'oyeron', 'oiste',
  'historia', 'historias', 'verdad', 'cierto', 'quiero', 'queria', 'puedes',
  'podrias', 'nadie', 'gente', 'sitio', 'lugar', 'lugares', 'hace', 'tiempo',
  'antes', 'despues', 'luego', 'vengo', 'viene', 'vine', 'aqui', 'alli',
  'vacia', 'vacias', 'vacio', 'vacios', 'cosa', 'cosas', 'tiene', 'tienen',
  'tenia', 'otras', 'otros', 'misma', 'mismo', 'mismos', 'sigue', 'siguen',
  'queda', 'quedan', 'quedo', 'quedara', 'vuelve', 'volvio', 'entonces',
  'mucho', 'mucha', 'muchos', 'muchas', 'nunca', 'siempre', 'nadie', 'suyos',
])

/** Las palabras con carga de una frase. Cuatro letras o más: abajo de eso son
 *  artículos y preposiciones que hacen ruido. */
const claves = (frase: string): string[] =>
  pelar(frase).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !VACIAS.has(w))

/** Ofrecer una mano o preguntar qué le falta abre la puerta aunque no se
 *  nombre la meta. Va sin tildes porque se prueba contra texto pelado. */
const OFRECE = /(te ayud|ayudarte|ayudarla|ayudarlo|una mano|te falta|te hace falta|necesit|precis|te sirve|te traigo|te consigo|te traje|puedo (?:ayudar|traer|darte|conseguir|hacer|buscar)|queres que|en que anda|en que estas|que estas haciendo|que hacias|te debo|para que sirve)/

/**
 * Cierra las preguntas que el modelo dejó abiertas.
 *
 * El system prompt ya lo pide con todas las letras y aun así se cuela: de 60
 * respuestas medidas hoy en `valle-pruebas`, **3 traían una pregunta abierta con
 * ¿ y cerrada con punto** —"¿Tienes o sabes dónde hay."— y las tres eran de
 * Marta, cuya voz dice que no usa signos de exclamación. El modelo generaliza
 * eso a los de interrogación, que es el fallo que ya está anotado en el
 * `cierre` del prompt.
 *
 * Es el mismo criterio que el colador de rioplatense de `saludos.ts`, aplicado
 * al único caso donde se puede aplicar en el diálogo: **arreglar un carácter no
 * es descartar la respuesta.** Ahí no se podía filtrar porque tirar una línea
 * deja al jugador frente a alguien que no contesta; acá no se tira nada, se
 * cambia el punto por el signo que faltaba. Cinco por ciento de todo lo que el
 * jugador lee estaba mal escrito y el prompt no lo iba a bajar a cero.
 *
 * Lo que NO hace, y es a propósito: no toca una frase sin `¿` (una pregunta sin
 * abrir es otro error y arreglarlo pide adivinar dónde empieza), ni parte una
 * frase que ya tenga su `?`.
 */
function cerrarPreguntas(s: string): string {
  let out = ''
  let abierta = false
  for (const c of s) {
    if (c === '¿') abierta = true
    else if (c === '?') abierta = false
    else if (abierta && (c === '.' || c === '…')) { out += '?'; abierta = false; continue }
    out += c
  }
  // Y la que se quedó sin nada al final: "¿Tienes hierro" a secas.
  return abierta ? `${out}?` : out
}

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

/** Hace cuánto, en días del valle y en palabras.
 *
 * **La unidad importa más de lo que parece.** Sin esto, lo único que el prompt
 * tenía para medir el tiempo eran los `inviernos` del pasado antiguo, y el
 * modelo los usaba para todo: le preguntaron a Odila hace cuánto murió Ilde y
 * contestó *"hace cuarenta inviernos"* por una muerte de hace seis meses.
 *
 * Los inviernos son para lo que pasó antes de que el mundo empezara a contar.
 * Lo que pasó jugando se mide en días, semanas y meses — que es como habla la
 * gente de algo que vivió.
 */
function haceCuanto(dias: number): string {
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 7) return `hace ${dias} días`
  if (dias < 14) return 'hace una semana'
  if (dias < 31) return `hace ${Math.round(dias / 7)} semanas`
  if (dias < 60) return 'hace un mes'
  if (dias < 350) return `hace ${Math.round(dias / 30)} meses`
  return `hace ${Math.round(dias / 365)} años`
}

export type Dialogo = {
  saludo: string
  animo: string
  /**
   * `true` cuando **el NPC arrancó él**: te reclama un encargo, te pide lo que
   * le falta, comenta algo que pasó en el valle o retoma lo que quedó entre
   * ustedes.
   *
   * Viaja porque sin esto el cliente pinta igual una respuesta y un reclamo, y
   * entonces la iniciativa —que es todo el punto— sólo la descubre el que
   * igual iba a apretar E. El que pasa de largo no se entera de que Marta le
   * estaba cobrando algo.
   */
  arranca: boolean
  opciones: {
    verbo: string; texto: string; posible: boolean; porque?: string
    /**
     * Cuando la opción admite más de una cosa, cuáles. Hoy sólo la usa
     * `ensenar`, y tiene que venir del servidor porque **el cliente no sabe
     * qué sabe ya el NPC**: la lista es la resta entre lo tuyo y lo suyo, y
     * ese segundo conjunto no viaja.
     *
     * Con dos o más, el cliente despliega la lista y manda
     * `target="<saber> a <persona>"`. Con una o ninguna manda el nombre pelado
     * y el servidor elige como siempre, así que un cliente viejo sigue
     * andando exactamente igual.
     */
    elegir?: string[]
  }[]
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
    // `home_place_id` entra por el pasado y no por el habla: es de dónde ES esta
    // persona y no dónde está parada hoy. La diferencia importa — `place_id` lo
    // mueve el tick, y con él un aldeano que pasa por la ruina heredaría por un
    // día la versión que se cuenta ahí adentro. Ver `voces` más abajo.
    .select('id, name, trade, disposition, teaches, place_id, home_place_id, voice, historia, procedencia, jornada_desde, jornada_hasta, place:place_id (name, description), pueblo:people_id (name, lengua)')
    .eq('region_id', region.id).eq('alive', true).ilike('name', npcName)
    .limit(1).maybeSingle()
  if (!npc) throw new Error(`No hay nadie llamado ${npcName} por aquí.`)

  // ── El que no quiere hablar ────────────────────────────────────────────
  //
  // Un NPC que siempre está disponible no tiene vida propia: es un mostrador
  // con horario corrido. La rutina ya sabe quién está en pie a cada hora
  // (`jornada_desde`/`jornada_hasta`, y el guardia cruza la medianoche), y el
  // cliente ya los dibuja durmiendo dentro de la casa — lo único que faltaba es
  // que el servidor lo tuviera en cuenta cuando le tocás la puerta.
  //
  // Tres cosas hacen que esto sea contenido y no una pared:
  //
  //   · **Significa algo.** De noche no se aprende un oficio. El horario deja
  //     de ser un dato del cielo y pasa a ser algo que tenés que planear: si
  //     querés que Ilde te enseñe, vas de día. Es el sol como reloj del mundo
  //     (DISENO §7.3) haciendo trabajo de juego.
  //   · **Dura poco.** La jornada por defecto es de 6 a 22, así que son ocho
  //     horas del valle de veinticuatro — dos horas reales de las seis que dura
  //     un día. Y no todos duermen a la vez: el guardia trabaja de 18 a 6, así
  //     que el valle nunca queda entero sin nadie con quien hablar.
  //   · **No cuesta una llamada.** Es la única salida de este archivo que no
  //     pasa por el modelo, y es correcto que no pase: alguien que no te abre
  //     la puerta no necesita una voz.
  //
  // La línea rota con el día del valle para que no sea siempre la misma, y se
  // guarda en `talks` igual que cualquier otra: que fueras a buscarlo de noche
  // y no te atendiera también es algo que pasó entre ustedes.
  const hora = horaDelValle()
  if (!despiertoA(hora, npc.jornada_desde ?? 6, npc.jornada_hasta ?? 22)) {
    const dormido = [
      `${npc.name} no abre. Dentro se oye a alguien darse la vuelta.`,
      `La puerta de ${npc.name} está cerrada y no hay luz.`,
      `${npc.name} contesta desde dentro, sin abrir: — Mañana.`,
    ]
    const linea = dormido[(region.tick + npc.name.length) % dormido.length]!
    await db.from('talks').insert({
      region_id: region.id, person_id: npc.id, player_id: playerId,
      tick: region.tick, said: dice.trim().slice(0, 300) || null, replied: linea,
    })
    // Se apagan DOS opciones y no las cinco, y el corte es exactamente el que
    // aplica `tick.ts` en `case 'aprender'` y `case 'ensenar'`. **Las dos
    // mitades tienen que decir lo mismo o el cliente miente**: una opción gris
    // que el servidor sí resolvería es tan mala como una viva que rechaza.
    //
    // Enseñar y aprender se caen porque nadie enseña a martillar dormido.
    // Encargarse, dar y trabajar siguen en pie porque le golpeás la puerta, le
    // dejás la cosa, o te quedás a trabajar al lado — y porque una noche que
    // apaga el juego entero es peor que una noche que no significa nada.
    //
    // Y no se llama al modelo para armarlas: las tres que quedan no dependen de
    // nada que haya que consultar, así que esta salida no cuesta ni una lectura
    // más de las que ya se hicieron.
    const durmiendo = `${npc.name} está durmiendo`
    return {
      saludo: linea,
      animo: 'seco',
      // El que duerme no arranca nada: la puerta cerrada no es una iniciativa.
      arranca: false,
      opciones: [
        { verbo: 'aprender', texto: 'Pedirle que te enseñe', posible: false, porque: durmiendo },
        { verbo: 'ensenar', texto: 'Enseñarle algo tuyo', posible: false, porque: durmiendo },
        { verbo: 'encargarse', texto: 'Ofrecerte a darle una mano', posible: true },
        { verbo: 'dar', texto: 'Darle algo de lo que llevas', posible: true },
        { verbo: 'trabajar', texto: 'Quedarte trabajando cerca', posible: true },
      ],
    }
  }

  const [
    agendas, sabeNpc, sabeJug, vinculo, memorias, charlas, sucesos, noOlvida, saberes, llevaJug, cuantas,
    vinculosOtros, gente, pasado, pueblos, encargosMios, noticias, arranques,
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
    // ── LO QUE EL VALLE NO OLVIDA ──────────────────────────────────────
    //
    // Las muertes y los saberes perdidos, de TODA la historia del valle. Es el
    // agujero más grande que tenía este archivo y se encontró jugando la
    // secuencia entera de punta a punta.
    //
    // Le pregunté a Odila hace cuánto había muerto Ilde, la herrera del valle,
    // y contestó **"hace dos inviernos"** y **"se fue del valle"**. Ni la
    // fecha ni el hecho: Ilde murió el día 101 de un valle que va por el 292,
    // o sea hace ciento noventa y un días, y murió, no se fue.
    //
    // No estaba mintiendo: **no tenía cómo saberlo.** Los sucesos que ve un
    // NPC son los últimos CUATRO que lo nombran a ÉL, y el pasado que sembró
    // el autor vive en tick negativo. Entre esas dos cosas hay un agujero que
    // cubre toda la historia jugada del valle — y ahí adentro está justamente
    // lo único que a esta gente le importaría recordar: quién se murió y qué
    // se llevó puesto.
    //
    // Un valle donde nadie se acuerda de que murió la herrera no es un valle
    // sobre necesitar a alguien: es un valle con amnesia.
    db.from('events').select('summary, tick, kind').eq('region_id', region.id)
      .in('kind', ['muerte', 'perdida_de_saber'])
      .gte('tick', 0).order('tick', { ascending: false }).limit(6),
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
    // El pasado del valle. Son siete filas de `events` con tick negativo —el
    // mismo sitio donde vive todo lo demás que pasó— así que citarlo no rompe
    // el invariante: está en la base, no lo inventa nadie.
    //
    // Se traen las siete y se manda a lo sumo UNA. Es a propósito: el prompt de
    // una charla ya ronda los 4.500 tokens para dos frases, y el pasado entero
    // son ~1.100 más que la mayoría de los turnos no usaría. Filtrar acá cuesta
    // una consulta a una tabla chica; filtrar en el prompt cuesta plata en cada
    // charla del juego.
    db.from('events').select('id, summary, place_id, detail')
      .eq('region_id', region.id).eq('kind', 'pasado').lt('tick', 0)
      .order('tick', { ascending: true }),
    // Los pueblos, con su territorio. No es decoración: es lo que decide de qué
    // LADO está cada quien, y sin eso las dos versiones del incendio no se
    // pueden repartir. Ver `voces`.
    db.from('peoples').select('name, place_id').eq('region_id', region.id),
    // ── Lo que quedó abierto entre ustedes ─────────────────────────────
    //
    // Los encargos vivos de ESTE jugador. La consulta ya existía en este
    // archivo, pero estaba abajo del todo y después de la llamada al modelo,
    // sirviendo para una sola cosa: apagar el botón de "ofrecerte a darle una
    // mano" cuando ya te habías ofrecido. O sea que el dato de "te encargaste y
    // no volviste" estaba en la mano y no lo leía nadie para HABLAR.
    //
    // Sube acá por eso y de paso ahorra el salto de red suelto que costaba
    // estar abajo. Se filtra por jugador y estado en el servidor —nunca
    // trayendo la tabla y filtrando en JS: PostgREST corta en 1.000 filas y no
    // avisa— y el `agenda_id` embebido trae de quién es cada uno.
    db.from('encargos')
      .select('id, agenda_id, taken_tick, agenda:agenda_id (id, goal, person_id, state, needs_object)')
      .eq('player_id', playerId).eq('state', 'activo').limit(12),
    // ── Lo que acaba de pasar en el valle ──────────────────────────────
    //
    // Dos días del valle hacia atrás y nada más. La ventana es corta a
    // propósito: una noticia de hace una semana no es una noticia, es historia,
    // y para eso ya está `EL PASADO`. Con doce horas reales de ventana, quien
    // entra a jugar se encuentra con gente comentando lo de anoche.
    //
    // `NOTICIABLE` acota los tipos a lo que se sabe sin haber estado (ver la
    // constante). El `limit` es chico porque de acá sale UNA sola línea: traer
    // más es pagar filas para tirarlas.
    db.from('events').select('id, kind, summary, tick, detail')
      .eq('region_id', region.id).in('kind', NOTICIABLE)
      .gte('tick', region.tick - 1)
      .order('tick', { ascending: false }).limit(10),
    // Con qué arrancó este NPC las últimas veces. Es el enfriamiento, y vive en
    // la base y no en memoria porque en Vercel cada charla es un proceso nuevo.
    // El índice parcial de la migración es justo para esta consulta.
    db.from('talks').select('iniciativa, tick')
      .eq('person_id', npc.id).eq('player_id', playerId)
      .not('iniciativa', 'is', null)
      .order('created_at', { ascending: false }).limit(8),
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
    // `id` viene con el `select('*')` de arriba y hasta hoy no se usaba. Lo
    // necesita la iniciativa: la clave del enfriamiento es por meta, no por
    // persona, o quien tenga dos metas abiertas te aborda dos veces al día.
    id: string
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

  // ── El pasado del valle, y de qué lado lo cuenta ésta ──────────────────
  //
  // El valle tiene siete piezas de pasado escritas por el autor y sembradas en
  // `events` con tick negativo. Están en la base desde hace días y **no las
  // consultaba nadie**: ni los NPCs ni la crónica. Esto las enchufa del lado de
  // las charlas.
  //
  // El invariante no se mueve y conviene decir por qué no se mueve: el pasado
  // ESTÁ en `events`, que es exactamente donde vive todo lo demás que pasó. Un
  // NPC que lo menciona no está inventando — está citando una fila. Lo que
  // sigue prohibido es lo de siempre: agregarle un detalle que la fila no
  // tiene, y —esto es nuevo y es lo más fácil de romper— cerrar una
  // contradicción que el mundo dejó abierta.
  //
  // Tres cosas se deciden acá, en código, y ninguna se le delega al modelo:
  //
  //   1. **DE QUÉ LADO ESTÁ.** Cada pieza trae `quien_lo_cuenta`: "la aldea",
  //      "Los de la Ceniza", "nadie". Una persona sólo puede contar lo de su
  //      lado. Los pueblos que no son humanos tienen territorio
  //      (`peoples.place_id`), así que el lado sale de dos datos y de ninguna
  //      lista escrita a mano: o pertenecés al pueblo (`people.people_id`), o
  //      tenés la casa en su territorio (`home_place_id`). La vieja Ren vive
  //      dentro de la Casa Quemada, que es de Los de la Ceniza, y por eso el
  //      incendio lo cuenta como se cuenta ahí adentro; Odila vive en Vado Bajo
  //      y lo cuenta como se cuenta en el vado. **Ninguna de las dos recibe la
  //      versión de la otra**, así que no hay forma de que la resuelvan ni de
  //      que digan "pero otros dicen que…": la contradicción la descubre el
  //      jugador hablando con las dos, o no la descubre nadie.
  //
  //      Va con `home_place_id` y no con `place_id` a propósito: el tick mueve
  //      a la gente, y con el lugar de hoy un aldeano que pasa por la ruina
  //      heredaría por un día la versión de los que viven ahí.
  //
  //   2. **CUÁNDO VIENE AL CASO.** Como mucho UNA pieza por charla, y la
  //      mayoría de las charlas ninguna. Dos puertas: que el jugador pregunte
  //      por eso (palabras de la pieza en lo que escribió, pesando más las
  //      raras), o que la pieza sea del sitio donde esta persona está o vive —y
  //      ahí entra por la misma rotación que el resto de los temas, o sea una
  //      de cada diez veces. Meter las siete en cada charla habría sumado ~1.100
  //      tokens a un prompt que ya paga 4.500 por dos frases.
  //
  //   3. **QUÉ NO SE CUENTA.** `se_calla` no entra nunca como texto. Ni
  //      siquiera cuando el jugador pregunta de frente: ahí lo que entra es la
  //      orden de esquivar, y el resumen de la pieza **no se manda**. Es la
  //      lección de `director.ts` aplicada acá — lo que no está en el prompt no
  //      se puede decir— y además es la mejor parte: el silencio contesta más
  //      que cualquier frase.
  type Pieza = {
    id: string; summary: string; place_id: string | null
    detail: {
      epoca?: string; hace_inviernos?: number
      certeza?: 'sabido' | 'se_dice' | 'se_calla'
      quien_lo_cuenta?: string; lugar?: string | null
    } | null
  }
  const piezas = (pasado.data ?? []) as Pieza[]
  const territorios = new Map<string, string>()
  const nombresDePueblo: string[] = []
  for (const p of (pueblos.data ?? []) as { name: string; place_id: string | null }[]) {
    nombresDePueblo.push(p.name)
    if (p.place_id) territorios.set(p.place_id, p.name)
  }
  // El pueblo del que es, o el pueblo en cuyo territorio tiene la casa. Si no
  // hay ninguno, es de la parte humana del valle y le tocan las versiones de la
  // aldea.
  // La capa compartida del habla, que acá se usa además como pertenencia. Si la
  // persona es de un pueblo, ese pueblo es su lado.
  const pueblo = unPueblo(npc)
  const miLado = pueblo?.name
    ?? (npc.home_place_id ? territorios.get(npc.home_place_id) ?? null : null)

  const certezaDe = (p: Pieza) => p.detail?.certeza ?? 'se_dice'
  /** ¿Es de su lado? El que es de un pueblo cuenta lo de su pueblo y nada más;
   *  el que no lo es cuenta todo lo que no sea de un pueblo. "nadie" no es de
   *  nadie por definición: ésas no las cuenta ni el que las sabe. */
  const suya = (p: Pieza): boolean => {
    const quien = pelar(p.detail?.quien_lo_cuenta ?? '')
    if (!quien || quien === 'nadie') return false
    const dePueblo = nombresDePueblo.find((n) => quien.includes(pelar(n)))
    return miLado ? dePueblo !== undefined && pelar(dePueblo) === pelar(miLado) : dePueblo === undefined
  }

  const mias = piezas.filter((p) => suya(p) && certezaDe(p) !== 'se_calla')
  // Las calladas no son de nadie y por eso van aparte: no se cuentan, se
  // esquivan. Y se esquivan las pregunte quien las pregunte.
  const calladas = piezas.filter((p) => certezaDe(p) === 'se_calla')
  const enJuego = [...mias, ...calladas]

  // Las mismas palabras vacías se sacan de los dos lados. Del lado de la pieza
  // hace falta porque su texto está escrito para ser contado —"la casa quedó
  // vacía", "lo que pasó después"— y esas palabras enganchan con cualquier cosa
  // que el NPC haya dicho antes.
  const clavesDePieza = (p: Pieza) => new Set(claves(
    `${p.summary} ${p.detail?.epoca ?? ''} ${p.detail?.lugar ?? ''} ${p.detail?.quien_lo_cuenta ?? ''}`)
    .filter((w) => !PREGUNTONAS.has(w)))
  // En cuántas piezas del valle aparece cada palabra. "recodo" está en cuatro
  // de las seis y no dice de qué se habla; "prendió" está en una y sí.
  //
  // **Se cuenta sobre las SIETE piezas y no sobre las de esta persona**, y la
  // diferencia no es cosmética: La vieja Ren sólo tiene dos piezas en juego, así
  // que contando sobre las suyas *toda* palabra le salía rara —incluidas "casa"
  // y "quemada", que están en cinco de las seis— y con eso el guardia de
  // repetición de abajo la daba por contada apenas nombraba su propia casa. La
  // rareza es una propiedad del corpus, no de quién habla.
  const enCuantas = new Map<string, number>()
  for (const p of piezas) for (const w of clavesDePieza(p)) enCuantas.set(w, (enCuantas.get(w) ?? 0) + 1)

  const dichasTodas = hilo.map((t) => pelar(String(t.replied ?? '')))
  /** Si dos de las palabras EXCLUSIVAS de la pieza ya aparecieron juntas en algo
   *  que dijo, la pieza ya salió. Contar el pasado dos veces al mismo es de
   *  máquina.
   *
   *  Exclusivas quiere decir de esa pieza y de ninguna otra (`=== 1`), y no
   *  simplemente poco frecuentes. Con el umbral en dos piezas, la vieja Ren
   *  —que vive en la ruina de la que habla su pieza— se auto-silenciaba: le
   *  alcanzaba con quejarse del humo y nombrar la ceniza en dos turnos
   *  distintos para que el sistema diera por contado el incendio. Las palabras
   *  del sitio donde alguien vive no son prueba de que haya contado su
   *  historia; "prendió" y "a propósito" sí. */
  const yaSalio = (p: Pieza) => {
    const suyas = [...clavesDePieza(p)].filter((w) => enCuantas.get(w) === 1)
    return dichasTodas.some((d) => suyas.filter((w) => d.includes(w)).length >= 2)
  }

  const dichoClaves = new Set(claves(dicho_por_el_jugador).filter((w) => !PREGUNTONAS.has(w)))
  const puntaje = (p: Pieza): number => {
    let n = 0
    const ks = clavesDePieza(p)
    // **Sólo puntúan las palabras raras**, y esto se aprendió rompiéndolo. Con
    // las comunes sumando de a uno, "¿qué pasó con la Casa Quemada?" le daba a
    // una pieza callada un punto de más por "pasó" —que está en media base de
    // datos— y la persona esquivaba una pregunta que podía contestar. Una
    // palabra que aparece en tres de las cuatro piezas no dice de cuál se
    // habla; sumarla es ruido con signo.
    for (const w of dichoClaves) if (ks.has(w) && (enCuantas.get(w) ?? 9) <= 2) n += 2
    // Nombrar el sitio entero —"la casa quemada"— es preguntar por el sitio,
    // aunque ninguna palabra suelta sea rara.
    const lugar = pelar(p.detail?.lugar ?? '')
    if (lugar.length >= 4 && pelado.includes(lugar)) n += 2
    return n
  }
  // Dos puntos de umbral: una palabra rara de la pieza, o el nombre del sitio.
  // A igual puntaje gana la que se puede contar: el silencio es la respuesta
  // correcta sólo cuando le preguntaron por eso y no por lo de al lado.
  const preguntada = dicho_por_el_jugador && !solo_saludo
    ? (enJuego.map((p) => ({ p, n: puntaje(p), calla: certezaDe(p) === 'se_calla' ? 1 : 0 }))
        .filter((x) => x.n >= 2)
        .sort((a, b) => b.n - a.n || a.calla - b.calla)[0]?.p ?? null)
    : null

  // La rotación de siempre, subida acá porque ahora también la usa el pasado.
  const rota = cuantas.count ?? 0
  // Lo viejo del sitio donde está o donde vive. Es lo que puede salir sin que
  // nadie lo pida, y sólo cuando la rotación de temas lo elige.
  const deAqui = mias.filter((p) =>
    !!p.place_id && (p.place_id === npc.place_id || p.place_id === npc.home_place_id) && !yaSalio(p))
  const ambiente = deAqui.length ? deAqui[rota % deAqui.length]! : null
  const temaPasado = ambiente
    ? `Lo viejo de ${ambiente.detail?.lugar ?? 'este sitio'}: lo que se cuenta de antes. Está abajo, en EL PASADO.`
    : null

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
  // El pasado entra como un tema más y no como una sección privilegiada. Es
  // deliberado por dos motivos: uno de tono —lo viejo del sitio es exactamente
  // del mismo rango que el frío o el oficio, no una revelación— y uno de plata:
  // así sale una de cada diez charlas ociosas en vez de todas.
  if (temaPasado) temas.push(temaPasado)

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
  // Es la misma lista que usa el pasado para saber si ya la contó; se calcula
  // una vez arriba.
  const dichas = dichasTodas
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

  // ── LA INICIATIVA: que el NPC empiece él ───────────────────────────────
  //
  // Todo lo de arriba decide QUÉ contesta alguien a quien le hablaron. Esto
  // decide qué EMPIEZA alguien al que no le hablaron, y es lo que faltaba
  // entero. Quien lo jugó lo dijo así: *"ellos casi no hacen algo, que tomen
  // iniciativas"*, y tenía razón — un tipo trabado esperando exactamente lo que
  // vos sabés no abría la boca hasta el cuarto turno, porque la ración del
  // pedido (`aguantoDemasiado`) pide tres charlas de piso.
  //
  // **No hay ningún dato nuevo acá abajo.** Las cuatro fuentes ya estaban en la
  // base y ninguna se leía para arrancar una charla: `agendas` (qué le falta),
  // `encargos` (de qué te hiciste cargo y no volviste), `events` (qué acaba de
  // pasar en el valle) y `memories` (qué recuerda de vos). Lo que se agrega es
  // el orden en que pesan y el enfriamiento.
  //
  // Tres reglas la sostienen, y las tres son de código y deterministas:
  //
  //   1. **Sólo abre el que no fue interrumpido.** Si el jugador escribió algo
  //      que no es un saludo, la iniciativa no corre: contestar a lo que te
  //      dijeron gana siempre. Un NPC que te ignora para soltar lo suyo es peor
  //      que uno callado.
  //   2. **Una por persona, por jugador y por día del valle** — ver
  //      `ESPERA_INICIATIVA_TICKS`, donde está la cuenta.
  //   3. **Una noticia se comenta una vez y nunca más.** La clave lleva el id
  //      del evento, así que el enfriamiento de las noticias es infinito por
  //      construcción y no por un número.
  //
  // Y el invariante no se mueve: cada motivo cita una fila de la base y ninguno
  // promete nada. Pedir que te traigan algo, cobrar un encargo que existe y
  // comentar un hecho que está en `events` son las tres cosas que el mundo sí
  // sabe cumplir; lo que pasa de verdad lo siguen decidiendo las opciones, que
  // las arma el código.
  type Motivo = { clave: string; razon: string; peso: number }
  const motivos: Motivo[] = []

  /** Las iniciativas que ya salieron, con el día en que salieron. */
  const yaArranco = new Map<string, number>()
  for (const a of (arranques.data ?? []) as { iniciativa: string | null; tick: number }[]) {
    if (a.iniciativa && !yaArranco.has(a.iniciativa)) yaArranco.set(a.iniciativa, a.tick)
  }
  /** El día más reciente en que este NPC arrancó algo con este jugador. Es el
   *  enfriamiento general: uno por día, sea del motivo que sea. */
  const ultimoArranque = Math.max(-Infinity, ...[...yaArranco.values()])

  // ── 1. El encargo que tomaste y no cerraste ────────────────────────────
  //
  // Es la deuda más concreta que puede haber entre un jugador y un NPC, y hasta
  // hoy el NPC no la mencionaba nunca: la fila estaba viva en `encargos` y sólo
  // servía para apagar un botón. Que te lo cobre es lo que convierte encargarse
  // en un compromiso y no en un clic.
  type Enc = {
    agenda_id: string; taken_tick: number
    agenda: { id: string; goal: string; person_id: string; state: string; needs_object: string | null } | null
  }
  const mios = ((encargosMios.data ?? []) as unknown as Enc[])
    .map((e) => ({ ...e, agenda: embebido<Enc['agenda']>(e, 'agenda') }))
  const conmigo = mios.filter((e) => e.agenda?.person_id === npc.id)
  for (const e of conmigo) {
    const dias = region.tick - e.taken_tick
    const cosa = e.agenda?.needs_object
    // Si lo trae encima el turno ya lo resuelve `traeLoQueFalta` más abajo, y
    // mejor: ése no tiene enfriamiento porque no es el NPC insistiendo, es el
    // jugador apareciendo con la cosa en la mano.
    if (cosa && lleva.includes(cosa)) continue
    // El mismo día en que se encargó no se le cobra nada. Sería la versión
    // insoportable de esto: te ofreciste hace un minuto y ya te está apurando.
    if (dias < 1) continue
    motivos.push({
      clave: `encargo:${e.agenda_id}`,
      peso: 2,
      razon: `${playerName} se encargó de ${e.agenda?.goal}` +
        `${cosa ? ` —te iba a traer ${cosa}—` : ''} hace ${dias === 1 ? 'un día' : `${dias} días`}` +
        ' y no ha vuelto con nada. Se lo recuerdas tú, sin que te lo pregunte.' +
        ' No lo insultas y no lo perdonas: se lo dices como se lo dirías tú.',
    })
  }

  // ── 2. Lo que te falta, dicho al que tienes delante ────────────────────
  //
  // La iniciativa más barata y más fuerte que hay en la base, y la que el
  // jugador nombró: si estás trabado esperando algo y entra justo el que lo
  // sabe o el que te lo puede traer, hablas tú.
  //
  // El umbral de confianza parte esto en dos, y no es un detalle de tono: es lo
  // que hace audible una regla que ya existe. Por debajo de `UMBRAL_ENCARGO` el
  // mundo no te deja encargarte de lo de nadie, así que el NPC tampoco te lo
  // puede pedir — se queja delante tuyo y basta. Por arriba, te lo pide. El
  // jugador aprende dónde está el umbral sin que nadie le muestre un número.
  for (const a of abiertas) {
    if (!a.id) continue
    const trabada = a.state === 'bloqueada'
    if (a.needs_kind === 'knowledge' && a.needs_id) {
      const n = nombreSaber.get(a.needs_id)
      // Que el que tienes delante sepa justo lo que te falta ver es el bucle
      // entero del juego, y no depende de la confianza: pedir que te muestren
      // algo no es pedir un favor de los que abre `UMBRAL_ENCARGO`.
      if (n && saberesJug.includes(n)) {
        motivos.push({
          clave: `trabada:${a.id}`, peso: 3,
          razon: `Estás detrás de ${a.goal} y te falta ver ${n}. ${playerName} lo sabe hacer.` +
            ' Se lo pides tú, hoy, nada más verlo.',
        })
      }
      continue
    }
    if (a.needs_kind === 'object' && a.needs_object) {
      // Una meta que va bien no es una urgencia. Sólo arranca quien está
      // trabado de verdad o quien lleva días sin moverse — si no, cualquiera
      // con una lista de la compra te aborda al pasar.
      if (!trabada && a.progress > 40) continue
      motivos.push({
        clave: `trabada:${a.id}`, peso: trabada ? 1 : 4,
        razon: v >= UMBRAL_ENCARGO
          ? `Te falta ${a.needs_object} para ${a.goal}${trabada ? ', y estás trabado con eso' : ''}.` +
            ` De ${playerName} te fías lo bastante para pedírselo, así que se lo pides:` +
            ' que te lo traiga, o que te diga de dónde sacarlo.'
          : `Te falta ${a.needs_object} para ${a.goal}${trabada ? ', y estás trabado con eso' : ''}.` +
            ` A ${playerName} no lo conoces lo suficiente para pedirle nada, así que no se lo pides:` +
            ' te quejas de que falta y sigues con lo tuyo. Que se entere si quiere.',
      })
    }
  }

  // ── 3. Lo que acaba de pasar en el valle ───────────────────────────────
  //
  // Los eventos existían y no los comentaba nadie. Se manda UNO, el más nuevo
  // que esta persona pueda saber, y se comenta una sola vez en la vida.
  //
  // Dos filtros y los dos son del invariante 3, no de gusto: se va lo que ya
  // está en `LO QUE TE OCURRIÓ ÚLTIMAMENTE` (si la nombra a ella, no es una
  // noticia, es su vida) y se va lo que hizo el jugador delante suyo (estuvo
  // ahí; contárselo es de máquina).
  const noticia = ((noticias.data ?? []) as
    { id: string; kind: string; summary: string; tick: number; detail: Record<string, unknown> | null }[])
    .filter((e) => !e.summary.includes(npc.name))
    .filter((e) => e.detail?.player !== playerName)
    .find((e) => !yaArranco.has(`noticia:${e.id}`))
  if (noticia) {
    motivos.push({
      clave: `noticia:${noticia.id}`,
      // Una muerte o un saber que se perdió del valle pesan más que cualquier
      // cosa que uno quiera pedir. Es la única jerarquía escrita a mano acá.
      peso: GRAVE.has(noticia.kind) ? 0 : 5,
      razon: `Te enteraste hace poco: ${noticia.summary}` +
        ' Es de oídas: no estabas, no lo viste, y no sabes más que eso.' +
        ` Lo sacas tú, porque es lo que se comenta. No le agregues un nombre,` +
        ' ni un motivo, ni un detalle que no esté en esa línea.',
    })
  }

  // ── 4. Lo que quedó entre ustedes ──────────────────────────────────────
  //
  // Le regalaste algo, le enseñaste algo, te metiste a defenderlo. `memories`
  // lo tiene y hasta hoy entraba como material de fondo —"recuerdas de X"— que
  // el modelo usaba si le sobraba media frase. Acá es el motivo de abrir la
  // boca.
  //
  // Sólo lo reciente: un recuerdo de hace veinte días no se retoma, se sabe. Y
  // el hash de la clave es del TEXTO, no del id, porque lo que no se puede
  // repetir es la cosa que se dice.
  const fresco = ((memorias.data ?? []) as { what: string; tick: number }[])
    .filter((m) => region.tick - m.tick <= 2)
    .find((m) => !yaArranco.has(`recuerdo:${hash(m.what)}`))
  if (fresco) {
    motivos.push({
      clave: `recuerdo:${hash(fresco.what)}`, peso: 6,
      razon: `No has olvidado esto y hoy lo sacas tú: ${fresco.what}.` +
        ' Lo dices como lo dirías tú —agradecido, incómodo, seco, lo que seas—,' +
        ' una vez, y sin pedir nada a cambio.',
    })
  }

  // ── Cuál sale, y si sale alguna ────────────────────────────────────────
  //
  // Cuatro puertas cerradas antes de que salga nada:
  //
  //   · el jugador dijo algo de verdad → se le contesta a él;
  //   · trae justo lo que le falta → ese camino ya existe y es mejor;
  //   · este NPC ya arrancó algo hoy → mañana;
  //   · el motivo que tocaba ya salió hoy → se prueba con el siguiente.
  //
  // El desempate entre motivos del mismo peso va por `rota` y no por azar: dos
  // charlas iguales tienen que dar lo mismo, o se siente una tragamonedas.
  const puedeArrancar = (!dicho_por_el_jugador || solo_saludo) && !traeLoQueFalta
    && region.tick - ultimoArranque >= ESPERA_INICIATIVA_TICKS
  const candidatos = motivos
    .filter((m) => region.tick - (yaArranco.get(m.clave) ?? -Infinity)
      >= (ESPERA_POR_MOTIVO[m.clave.split(':')[0]!] ?? ESPERA_INICIATIVA_TICKS))
    .sort((a, b) => a.peso - b.peso)
  const mejor = candidatos.length
    ? candidatos.filter((m) => m.peso === candidatos[0]!.peso)[
        rota % candidatos.filter((m) => m.peso === candidatos[0]!.peso).length]!
    : null
  const iniciativa = puedeArrancar ? mejor : null

  type Modo = 'empezar' | 'pedir' | 'contestar' | 'contar'
  const modo: Modo = iniciativa ? 'empezar'
    : pedidos.length && (abrioLaPuerta || aguantoDemasiado) ? 'pedir'
    : dicho_por_el_jugador && !solo_saludo ? 'contestar'
    : 'contar'

  // La rotación sigue existiendo para los turnos en que sí hay varios pedidos o
  // varios temas: el mismo contexto dos veces da la misma respuesta.
  const sucesosFiltrados = modo === 'pedir' ? sucesosPropios
    // En el turno de la iniciativa se van todos, y por el mismo motivo por el
    // que se va la lista de temas: es la otra fuente de la que el modelo saca
    // una apertura alternativa. Medido con Marta, que teniendo la orden de
    // sacar lo que le falta abrió contando que Tobio había aprendido la runa —
    // un suceso suyo, verdadero, y que nadie le había pedido. La sección existe
    // para justificar que alguien CAMBIE de idea entre charlas; en el turno en
    // que arranca él no hace falta, y lo único que hace es competir.
    : modo === 'empezar' ? []
    : sucesosPropios.filter((s) => !clavesArr.some((k) => pelar(s).includes(k)))

  const pedido = (pedidos.find((p) => p.leSirveEste) ?? pedidos[rota % Math.max(pedidos.length, 1)])?.texto
  const tema = temas[rota % temas.length]!

  // ── La pieza del pasado que sale hoy, si sale alguna ───────────────────
  //
  // Preguntar por algo gana sobre la rotación: si el jugador nombró la ruina,
  // el tema es la ruina, le tocara o no. Si no preguntó nada, sólo sale cuando
  // la rotación de temas eligió justo el del pasado.
  const pieza = preguntada ?? (temaPasado && tema === temaPasado ? ambiente : null)
  const dp = pieza?.detail ?? null
  // "hace nueve inviernos, hace 9 inviernos" es lo que sale de pegar los dos
  // campos sin mirar: el autor escribe `epoca` en palabras y `hace_inviernos`
  // en número, y a veces dicen lo mismo. Si la época ya cuenta inviernos, el
  // número sobra.
  const cuando = [
    dp?.epoca,
    dp?.hace_inviernos && !pelar(dp.epoca ?? '').includes('invierno')
      ? `hace ${dp.hace_inviernos} inviernos` : null,
  ].filter(Boolean).join(', ')

  // Cómo se dice cambia con `certeza`, y ésa es la mitad del rasgo. Un rumor
  // dicho como hecho es tan falso como un hecho inventado: el mundo no afirma
  // que la casa ardió por un rescoldo, afirma que en Vado Bajo eso es lo que se
  // cuenta. Perder esa diferencia sería perder el pasado entero.
  const comoSeCuenta = {
    sabido:
      'ESTO ES SABIDO. Aquí lo da por cierto todo el mundo, tú incluido, y así lo\n' +
      '  dices: como un hecho, sin "dicen que" y sin ponerlo en duda.',
    se_dice:
      'ESTO ES LO QUE SE DICE, y no lo viste nadie que quede. Lo cuentas con esa\n' +
      '  distancia —"dicen que", "así se cuenta", "eso contaba mi madre"— y nunca\n' +
      '  como algo que sepas de primera mano.\n' +
      '  Y es la ÚNICA versión que conoces. No sabes que haya otra: no digas que\n' +
      '  algunos lo cuentan distinto, no la compares con nada y no la defiendas de\n' +
      '  nada. Para ti eso es lo que pasó, y punto.',
    se_calla: '',
  }

  const bloquePasado = !pieza ? null
    // El resumen de una pieza callada NO entra al prompt. Es la lección cara de
    // `director.ts`: todo lo que entra sale, por más que el sistema diga que
    // no. Lo único que se manda es de qué le preguntaron y la orden de
    // esquivarlo — y con eso alcanza, porque la pregunta del jugador ya está
    // arriba y el modelo sabe perfectamente qué está esquivando.
    : certezaDe(pieza) === 'se_calla'
      ? `TE HAN PREGUNTADO POR ALGO QUE AQUÍ NO SE CUENTA${cuando ? `: ${cuando}` : ''}` +
        `${dp?.lugar ? `, en ${dp.lugar}` : ''}.\n` +
        '  De eso no hablas. Ni entero, ni a medias, ni "sólo esto y ya", ni dejando\n' +
        '  entender el resto. Cambias de tema, contestas otra cosa, vuelves a lo tuyo, o\n' +
        '  dices que de eso no hablas — y no explicas por qué no hablas.\n' +
        '  Tampoco lo niegas con detalle ni aclaras qué parte te callas: negar con\n' +
        '  detalle es contarlo.\n' +
        '  Callarte es la respuesta correcta y es una respuesta entera. Esquívalo como lo\n' +
        '  esquivarías tú, con tu manera de hablar, no como lo esquivaría cualquiera.'
      : 'EL PASADO, LA PARTE QUE TE TOCA A TI (es viejo, es de antes, y es lo único\n' +
        'viejo que puedes contar):\n' +
        `  ${cuando}${dp?.lugar ? `, en ${dp.lugar}` : ''}. Lo cuentan ${dp?.quien_lo_cuenta ?? 'los de aquí'}.\n` +
        `  ${pieza.summary.replace(/\s+/g, ' ').trim()}\n` +
        `  ${comoSeCuenta[certezaDe(pieza)]}\n` +
        '  Una o dos frases tuyas, lo que venga al caso, y nada más: no lo recites\n' +
        '  entero ni lo cuentes como una historia. No le agregues ni un nombre, ni una\n' +
        '  fecha, ni un motivo que no esté ahí escrito. Si no viene a cuento, no lo saques.'

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

  const hoy = modo === 'empezar'
    // El bloque de la iniciativa REEMPLAZA al de pedir y no se suma: es una
    // razón sola, escrita, en lugar de la lista entera de lo que le falta. Sale
    // más barato que un turno de `pedir` y es más específico — y eso importa,
    // porque el turno en que alguien arranca es el que el jugador va a leer con
    // atención.
    ? 'EMPIEZAS TÚ, Y SALE ESTO Y NADA MÁS. No esperas a que te hablen, no\n' +
      '  saludas primero y no lo dejas para el final: es lo primero que dices.\n' +
      `  ${iniciativa!.razon}\n` +
      '  Es lo único de lo que hablas en este turno. Si se te ocurre otra cosa\n' +
      '  que contar, hoy no la cuentas. Una vez, a tu manera, sin adornarlo y\n' +
      '  sin prometer nada a cambio.' + noVuelvas
    : modo === 'pedir'
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
  // (`pueblo` se resuelve más arriba: el pasado lo necesita antes, porque es lo
  // que decide de qué lado se cuenta cada cosa.)
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
    // Lo que el valle no olvida. Va acá arriba, con quién es y de dónde viene,
    // porque **no es material para contar: es lo que esta persona SABE**, y la
    // diferencia se nota. Abajo, entre el estado, el modelo lo leía como una
    // lista de temas; acá lo trata como memoria.
    //
    // Y va con la fecha en días, semanas o meses. Los `inviernos` son del
    // pasado antiguo y prestárselos a una muerte de hace seis meses es
    // exactamente el error que esto viene a arreglar.
    ((noOlvida.data ?? []) as { summary: string; tick: number }[]).length
      ? 'LO QUE EL VALLE NO OLVIDA (lo sabe todo el mundo aquí, y es verdad):\n'
        + (noOlvida.data as { summary: string; tick: number }[])
          .map((e) => `  · ${haceCuanto(region.tick - e.tick)}: ${e.summary}`).join('\n')
      : null,
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
    // En el turno en que arranca él, la lista de temas NO SE MANDA, y esto se
    // aprendió midiendo: con la lista puesta, Marta —que tenía una meta trabada
    // y la orden de sacarla— abrió con «Tobio aprendió la Runa. Ya son tres los
    // que la saben», que es un tema de la lista. Es exactamente la lección que
    // ya está escrita dos renglones más abajo para los pedidos: **una lista de
    // alternativas en el prompt es una lista de alternativas, diga lo que diga
    // la instrucción de arriba.** El que empieza algo no está eligiendo tema:
    // ya lo eligió.
    modo === 'empezar' ? null
      : 'DE QUÉ PUEDES HABLAR (tienes más de un tema; tu problema es sólo uno de ellos):\n' +
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
    // Y lo que lleva encima tampoco, en el turno en que arranca él. Es la
    // tercera fuente de aperturas alternativas y la más pegajosa de las tres:
    // con la línea puesta, Marta —que tenía la orden de pedir una piedra de
    // afilar— abrió con «La raíz que llevas. ¿De dónde la sacaste», y Tobio
    // igual. Un objeto concreto en las manos del otro le gana a cualquier
    // instrucción, y se entiende: es lo más vívido del prompt.
    //
    // No se pierde nada, y esto es lo que lo hace seguro: el caso en que lo que
    // lleva SÍ importa —trae justo lo que le falta— nunca llega hasta acá,
    // porque `traeLoQueFalta` apaga la iniciativa entera y manda el turno por
    // el camino de `pedir`, donde la línea sigue puesta. En `empezar` lo que
    // lleva es, por construcción, algo que a esta persona no le sirve.
    lleva.length && modo !== 'empezar'
      ? `${playerName} lleva encima: ${lleva.join(', ')}.` : null,
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
    // El pasado va pegado a `hoy` y no arriba entre el estado, por lo mismo que
    // la procedencia va pegada a la voz: acá abajo es donde una instrucción se
    // lee, y arriba es donde se diluye. La mayoría de los turnos esta línea es
    // `null` y no cuesta nada.
    bloquePasado,
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
  // Se arregla antes de guardarlo, no sólo antes de devolverlo: lo que queda en
  // `talks` es lo que el NPC va a leer en la próxima charla como «esto ya lo
  // dijiste», y guardarlo mal le enseña a escribirlo mal.
  const loQueDijo = cerrarPreguntas(dicho.saludo)
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
    replied: loQueDijo,
    // Con qué arrancó, o null si la charla la abrió el jugador. Es el
    // enfriamiento —la próxima charla lo lee de vuelta— y de paso la única
    // instrumentación que hay de esto: `select iniciativa, count(*) from talks
    // group by 1` dice si los NPCs están empezando cosas o volvieron a ser un
    // mostrador, sin agregar una sola fila a `events`.
    iniciativa: iniciativa?.clave ?? null,
  })
  if (errCharla) console.error(`No pude guardar la charla con ${npc.name}:`, errCharla.message)

  // Las opciones no las inventa el modelo: salen del estado. Así una respuesta
  // nunca promete algo que el mundo no puede cumplir.
  const puedeEnsenarte = npc.teaches && v >= UMBRAL_ENSENAR
    && saberesNpc.some((s) => !saberesJug.includes(s))

  // ¿Se puede uno encargar de lo suyo? Es el verbo que faltaba en la caja de
  // diálogo, y sin él el jugador no tenía forma de tomar una misión desde el
  // juego: existían en el mundo y sólo se podían agarrar por API.
  const conObjeto = abiertas.find((a) =>
    a.needs_object && (a.state === 'activa' || a.state === 'bloqueada'))
  // Sale de `conmigo`, que ya se calculó arriba para la iniciativa: son los
  // encargos vivos de este jugador con esta persona. Antes esta consulta vivía
  // acá abajo, después de la llamada al modelo, y era un salto de red suelto en
  // la ruta crítica; ahora entra en la tanda de arriba y sirve para dos cosas.
  //
  // Y se compara por `agenda_id` y no por el texto de la meta: ahora que
  // `Agenda` trae el id, buscar por prosa era la versión frágil de lo mismo
  // —dos metas con el mismo texto se pisaban— y ya no hace falta.
  const yaEncargado = !!conObjeto && conmigo.some((e) => e.agenda_id === conObjeto.id)

  // Y dar: sólo si lo que llevás encima es justo lo que le falta. No ofrecer
  // "darle algo" en abstracto es a propósito — una opción que aparece siempre
  // y casi nunca sirve es ruido.
  const loQueFalta = abiertas
    .filter((a) => a.state === 'activa' || a.state === 'bloqueada')
    .map((a) => a.needs_object).filter(Boolean) as string[]
  const puedoDarle = lleva.find((o) => loQueFalta.includes(o))
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
      // Nombra QUÉ le vas a enseñar. "Enseñarle algo tuyo" no dice nada: el
      // jugador aprieta sin saber qué está por regalar, y regalar un saber es
      // la decisión más grande que hay en este juego — es lo único que hace
      // que no se pierda cuando te morís, y también lo que deja de hacerte
      // único. Una decisión así no se toma a ciegas.
      texto: (() => {
        const puede = saberesJug.filter((k) => !saberesNpc.includes(k))
        return puede.length === 1 ? `Enseñarle ${puede[0]}`
          // "sabés" era voseo en un texto que ve el jugador, y el mundo habla
          // castellano llano. Se midió en las crónicas: la instrucción del
          // prompt bajó el voseo de 7 de 11 a 1 de 9, y no tiene sentido
          // pelearlo en el modelo mientras la interfaz lo escribe a mano.
          : puede.length > 1 ? `Enseñarle ${puede[0]} (sabes ${puede.length} que no sabe)`
          : 'Enseñarle algo tuyo'
      })(),
      posible: saberesJug.some((s) => !saberesNpc.includes(s)),
      porque: !saberesJug.length ? 'todavía no sabes nada que enseñar'
        : 'ya sabe todo lo que sabes',
      // La misma resta que arriba, pero entera: el texto nombra uno para que
      // el botón diga algo, y esto le da al cliente los otros para que puedas
      // elegir. Que el servidor elija por vos cuando NO elegiste está bien
      // —prefiere el que le cierra la meta al otro, que es el mejor default—;
      // que elija habiendo elegido vos, no.
      elegir: saberesJug.filter((k) => !saberesNpc.includes(k)),
    },
    {
      verbo: 'encargarse',
      texto: conObjeto
        ? `Ofrecerte a conseguirle ${conObjeto.needs_object}`
        : 'Ofrecerte a darle una mano',
      posible: !!conObjeto && !yaEncargado && v >= UMBRAL_ENCARGO,
      porque: !conObjeto ? `${npc.name} no necesita nada que puedas traerle`
        : yaEncargado ? 'ya te encargaste de eso'
        : `${npc.name} todavía no te conoce lo suficiente`,
    },
    {
      verbo: 'dar',
      texto: puedoDarle ? `Darle ${puedoDarle}` : 'Darle algo de lo que llevas',
      posible: !!puedoDarle,
      porque: !lleva.length ? 'no llevas nada encima'
        : `nada de lo que llevas le sirve a ${npc.name}`,
    },
    { verbo: 'trabajar', texto: 'Quedarte trabajando cerca', posible: true },
  ]

  return { saludo: loQueDijo, animo: dicho.animo, opciones, arranca: iniciativa !== null }
}
