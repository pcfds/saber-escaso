/**
 * Genera la región inicial.
 *
 * La regla del generador: no se genera terreno, se genera historia. Cada lugar
 * sale con gente adentro, cada persona con un saber y una agenda propia. Si una
 * región saliera sin nadie que sepa nada, salió mal — y eso se puede testear.
 */
import { db, REGION_SLUG } from '../db.js'

const PLACES = [
  { slug: 'aldea', name: 'Vado Bajo', kind: 'aldea',
    description: 'Doce casas apretadas contra el recodo del río. Huele a humo y a lino mojado.' },
  { slug: 'fragua', name: 'La Fragua de Ilde', kind: 'fragua',
    description: 'El único techo de la región que nunca se apaga del todo.' },
  { slug: 'bosque', name: 'El Sotobosque', kind: 'bosque',
    description: 'Robles viejos, sendas que cambian. La gente entra de a dos o no entra.' },
  { slug: 'ruina', name: 'La Casa Quemada', kind: 'ruina',
    description: 'Se incendió antes de que nadie vivo estuviera acá. Nadie la reconstruye.' },
  { slug: 'camino', name: 'El Camino del Norte', kind: 'camino',
    description: 'Por acá llegan los que llegan. No llega mucha gente.' },
  // EL SEGUNDO PUEBLO. Ver `20260818030000_sauce_quebrado.sql`, que lo mete en
  // los valles que ya existían; esto es para los que nazcan de cero.
  //
  // ⚠ `kind` es 'sauce' y NO 'aldea', y no es cosmético: `makes_at` se compara
  //   contra `places.kind` (`lugarPorKind` en `tick.ts`), así que con kind
  //   'aldea' el emplasto sería imposible de fabricar en todo el valle, sin un
  //   error en ninguna parte. Es el primer lugar donde slug y kind no coinciden.
  { slug: 'sauce', name: 'Sauce Quebrado', kind: 'sauce',
    description: 'Cinco casas río arriba, entre sauces partidos por el hielo. Se hierve corteza todo el año y el olor no se va.' },
]

const KNOWLEDGE = [
  { slug: 'forja-simple', name: 'Forja simple', kind: 'oficio',
    description: 'Herrar, remachar, enderezar. La base de todo lo que se rompe.' },
  { slug: 'temple-de-rio', name: 'Temple de río', kind: 'oficio',
    description: 'Templar el filo en agua corriente. Sale bien una de cada tres veces, y esa una dura años.' },
  { slug: 'lectura-de-sendas', name: 'Lectura de sendas', kind: 'oficio',
    description: 'Saber por dónde se sale del Sotobosque cuando las sendas cambian.' },
  { slug: 'destilado-de-raiz', name: 'Destilado de raíz', kind: 'receta',
    description: 'Un frasco que sostiene una atadura de más por una noche.' },
  // Lo que se le saca a un animal manso sin matarlo. La vaca que te deja
  // acercarte es la prueba de que alguien la tiene; desde acá hay un nombre.
  // `makes`, `makes_at` y `para_que` los pone la migración, igual que para los
  // cuatro de arriba: acá va lo que la región necesita para existir.
  { slug: 'cuajado-de-leche', name: 'Cuajado de leche', kind: 'receta',
    description: 'Ordeñar al amanecer y cuajar la leche antes de que se corte. Sale un cuenco espeso que aguanta el día. Lo sabe el que anduvo con animales de carga, no el que tuvo una vaca.' },
  { slug: 'runa-de-brasa', name: 'Runa de brasa', kind: 'magia',
    description: 'Tres trazos. Prende lo que ya estaba seco. Se aprende mirando, no leyendo.' },
  { slug: 'runa-de-quietud', name: 'Runa de quietud', kind: 'magia',
    description: 'Cinco trazos. Aquieta lo que se mueve, un momento. Nadie sabe de dónde salió.' },
  // Lo único que hay en Sauce Quebrado y no en Vado Bajo, o sea la razón por la
  // que caminarías noventa y siete metros. `makes` y `makes_at` los pone la
  // migración, igual que para los cinco de arriba.
  { slug: 'emplasto-de-sauce', name: 'Emplasto de sauce', kind: 'receta',
    description: 'Hervir corteza de sauce hasta que suelta el amargo, y atarla en un paño mientras está caliente. Se hace en Sauce Quebrado porque es donde están los sauces; con corteza traída de otro lado sale flojo y nadie sabe bien por qué.' },
]

// ── De dónde es cada uno, y cómo se le nota al hablar ──────────────────────
//
// Ésta es la capa COMPARTIDA del habla, y por eso vive acá arriba y no dentro
// de cada persona: dos que se criaron en el mismo sitio comparten el texto
// palabra por palabra, aunque tengan caracteres opuestos. Eso es exactamente lo
// que la vuelve audible como procedencia y no como personalidad — si cada uno
// tuviera la suya propia, sería otra `voice` con otro nombre.
//
// Se guarda en `people.procedencia`, que es campo nuevo y no un pedazo de
// `historia`. El motivo está largo en el encabezado de `dialogo.ts`; en corto:
// `historia` es biografía (hechos, deudas, motivos) y mezclarle adentro cómo
// suena hace que el modelo narre la biografía como estilo y tome el estilo como
// sucesos que puede contar.
//
// Y ninguna de estas líneas nombra un lugar, una persona o un suceso que no
// esté en la base. Describen COSTUMBRE —cómo nombra, en qué mide, a quién trata
// de usted— que es lo único que se puede pedir sin abrir la puerta a inventar.
//
// El voseo no está en ninguna, y es una decisión escrita: se podía haber dejado
// para los nacidos en el valle como marca local, y se descartó porque el voseo
// es el marcador rioplatense más fuerte que hay y dejarlo en cuatro de siete
// habría conservado justo lo que se pidió sacar.
type Origen = 'valle' | 'rio-abajo' | 'compania' | 'casa-quemada' | 'sauce'

const PROCEDENCIAS: Record<Origen, string> = {
  valle:
    'Nació en este valle y no salió nunca. Nombra los lugares cortos y gastados, como quien no necesita ubicarlos: la fragua, el recodo, el camino, el vado. Nunca dice el nombre entero de nada. Mide el tiempo en trabajos y en estaciones —antes de que baje el frío, dos días de fuelle—, nunca en fechas. No explica lo que aquí sabe cualquiera, y si se lo preguntan contesta como quien repite algo obvio. De lo que hay más allá del valle habla poco y sin nombrarlo: dice abajo, del otro lado, fuera. Si le preguntan de dónde es, contesta "de aquí" y no añade nada: no hay más que decir, y no inventa una casa ni un paraje para adornarlo.',
  'rio-abajo':
    'Se crió río abajo, en una casa donde eran seis y todo se repartía. Cuenta las cosas antes de nombrarlas —una vez, medio día, un rato nada más—, porque en su casa todo venía contado. Dice "en casa" para hablar de aquella casa y nunca aclara cuál. Los nombres de aquí los usa enteros y con cuidado, como quien los aprendió de mayor y teme decirlos mal. Se disculpa antes de pedir cualquier cosa, que es la costumbre del último de seis.',
  compania:
    'Vino con una compañía que se deshizo tres valles atrás y no es de ningún sitio. No usa los nombres del valle: nunca dice "Vado Bajo", ni "El Sotobosque", ni "La Fragua de Ilde". Dice el pueblo, el bosque ese, la fragua, el camino de arriba, porque los aprendió tarde y no son suyos. Los sitios los describe por lo que sirven —un valle con dos salidas, un río que no se cruza en invierno—, que es como se los enseñaron. Mide en marchas, en pagas y en inviernos pasados en algún sitio, nunca en días. Se le escapan las palabras de la compañía en cosas que no son la guardia: relevo, turno, paga, orden, columna. Nunca habla de este valle como si fuera suyo: dice el valle, este sitio, nunca mi tierra.',
  sauce:
    'Se crió en Sauce Quebrado, río arriba, donde son cinco casas y se conocen todos. Nombra a la gente por el oficio y no por el nombre —el herrero, la que cura, el del vado—, que es como se nombra donde nadie hace falta distinguirlo de otro. Mide las distancias en cruces del río y en cuánto tarda el agua en bajar, nunca en leguas. Habla de Vado Bajo como de un sitio grande y algo ajeno: dice abajo, el pueblo grande, allá. Menciona los sauces y la corteza sin explicarlos, como quien habla de algo que hay en todas partes. Y no da nada por sabido de quien viene de afuera: pregunta de dónde es antes de contestar.',
  'casa-quemada':
    'Es de una casa que ya no existe. Nombra los lugares por lo que fueron y no por lo que son, y no aclara la diferencia. Cuenta en inviernos, nunca en años, y los cuenta hacia atrás. Habla con fórmulas y dichos que aprendió de gente que ya no está, y los suelta enteros, sin explicarlos. De lo que hay ahora en el valle habla como de algo reciente, aunque lleve treinta años.',
}

// `disposition` es el carácter en una línea, para el director. `voice`,
// `procedencia` e `historia` son otra cosa y por eso están aparte:
//
//   voice    — cómo suena ESTA persona y ninguna otra. Registro, tics y, lo que
//              más rinde, de qué NO habla nunca. Sin esto el modelo aplica un
//              barniz parejo a todo el valle y salen siete iguales.
//
//              **Registro, nunca un conteo de palabras.** Es una regla dura y
//              salió midiendo: la voz de Ilde decía "frases de tres o cuatro
//              palabras" y producía telegramas agramaticales —"Algo hacés
//              vos", "Sacás de algún lado"—, porque para cumplir el número el
//              modelo tira artículos y preposiciones. "Habla poco y va al
//              grano" da el mismo efecto y en castellano. Lo mismo vale para
//              prohibir una clase de palabra ("sin adjetivos") o fijar un
//              tiempo verbal ("en pasado"): eso es gramática, no voz.
//              Junto con el límite viejo —una voz no puede pedir un tipo de
//              frase que obligue a inventar hechos— quedan dos: no pidas una
//              forma que obligue a inventar, ni una que obligue a romper el
//              idioma.
//   procedencia — de dónde es y cómo se le nota. Sale de `PROCEDENCIAS`, se
//              comparte con los del mismo origen, y es lo que hace que un
//              forastero no nombre los lugares como el que nació aquí.
//   historia — qué le pasó. Es lo que sostiene la línea entre una charla y la
//              siguiente: si el NPC cambia de idea, tiene que ser porque pasó
//              algo en `events`, no porque el modelo tiró otro dado esta vez.
//
// Las voces se escriben una por una, nunca por oficio. Dos herreras del mismo
// valle tienen que sonar distinto igual. Las procedencias, al revés: se
// escriben por origen y se repiten a propósito.
//
// ── `place` y `home` son dos cosas distintas ───────────────────────────────
//
// `place` es dónde arranca —dónde la agarra el primer día— y `home` es **dónde
// duerme**. Se separan porque casi nadie duerme donde trabaja: Marta se pasa la
// vida en el Sotobosque y vive en la aldea, como cualquiera que entra al monte
// y vuelve. Los dos que sí coinciden lo hacen porque su historia lo dice —Ilde
// se quedó con la fragua el día que se murió el padre, Bruno llegó a esa fragua
// a los quince— y Ren es la única que duerme en un lugar salvaje, que es la
// mitad de lo que la hace Ren.
//
// El que no tenga `home` duerme parado donde lo dejó el día. El chequeo del
// final lo revienta acá, que es donde se ve: una región sin casas salió mal,
// igual que una región sin nadie que sepa nada.
//
// El HORARIO no está acá y es a propósito: sale de la tabla `horarios` por
// oficio (ver la migración de la rutina) y se guarda resuelto en cada fila. Es
// un hecho del oficio, no de la persona — la fragua abre temprano la atienda
// quien la atienda — y el autor lo puede torcer después para uno solo.
const PEOPLE = [
  { name: 'Ilde', trade: 'herrera', place: 'fragua', home: 'fragua', teaches: true,
    disposition: 'Habla poco y trabaja de espaldas a la puerta. Enseña a quien se queda tres días sin pedir nada.',
    voice: 'Habla poco y va al grano: una frase corta, bien dicha, y se calla. No saluda ni se despide, y no repite lo que ya dijo. Contesta con el oficio — si algo se puede o no se puede, cuánto lleva, y qué hace falta para que salga bien. Nunca habla de lo que siente ni de gente que no está presente. Cuando algo le importa hace una pregunta corta, una sola. Tutea a todo el mundo, sin excepción. No usa signos de exclamación.',
    procedencia: 'valle',
    historia: 'Aprendió de su padre, que le pegaba, y se quedó con la fragua el día que él se murió. Tuvo un aprendiz antes de Bruno; se fue un invierno y no lo nombra. El yunque se le partió y lo tiene atado con fleje: todo lo que forja mientras tanto le sale peor de lo que ella sabe hacerlo, y eso la tiene de mal humor hace meses.',
    knows: ['forja-simple', 'temple-de-rio'],
    agenda: { goal: 'rehacer el yunque partido antes de que baje el frío', needs: 'forja-simple' } },
  { name: 'Bruno', trade: 'aprendiz', place: 'fragua', home: 'fragua', teaches: false,
    disposition: 'Ansioso. Quiere el temple de río y todavía no se ganó el derecho a mirarlo.',
    // Sus tres muletillas eran "igual", "o sea" y "nada", y eran lo más
    // rioplatense que había en todo el valle. No se reemplazan por otras tres
    // palabras: lo que hacía a Bruno no era la muletilla sino corregirse en voz
    // alta, y eso es una conducta y no un acento. El número ("una por
    // respuesta") se queda: acota cuántas veces aparece un tic, no cuántas
    // palabras entra una frase, que es lo que rompía el idioma.
    voice: 'Habla de más, y siempre termina pidiendo algo: que le muestren, que lo dejen probar, que le echen una mano. Empieza una frase, la corta y arranca otra. Se justifica antes de que nadie lo acuse. Se corrige a sí mismo en voz alta —digo, no es que, sólo eso—, una vez por respuesta y no cuatro. Nunca dice que no sabe algo: dice que todavía no se lo han mostrado. Tutea, salvo cuando se pone nervioso: entonces se le escapa el usted y ya no vuelve al tú hasta la próxima vez que hablen. Nunca mezcla los dos en la misma frase.',
    procedencia: 'rio-abajo',
    historia: 'Llegó a la fragua a los quince porque en su casa eran seis y no entraban. Le debe a Odila un frasco del invierno pasado y hace lo imposible por no cruzarla en la aldea. Está convencido de que si ve el temple de río una sola vez le sale, y ese es exactamente su problema.',
    knows: ['forja-simple'],
    agenda: { goal: 'que Ilde le muestre el temple de río', needs: 'temple-de-rio' } },
  { name: 'Marta', trade: 'cazadora', place: 'bosque', home: 'aldea', teaches: true,
    disposition: 'Entra al Sotobosque sola y vuelve. Le molesta que se lo pregunten.',
    // "Frases sin adjetivos, en pasado" era el defecto de Ilde en otra forma:
    // prohibir una clase de palabra y fijar un tiempo verbal es gramática, no
    // registro, y salían frases rotas ("Viste algo en el camino que viniste").
    voice: 'Contesta lo justo y después se calla; el silencio lo tiene que romper el otro. Frases enteras pero peladas, sin adorno, sobre lo que tiene delante: el monte, el frío, lo que vio hoy. Si le preguntan algo del Sotobosque, contesta otra cosa o no contesta. No pregunta nada de vuelta y nunca usa el nombre de quien le habla. No explica lo que hace ni por qué lo hace.',
    // Es del valle igual que Ilde, y comparten el texto de procedencia entero.
    // Que suenen distintas es trabajo de la voz — que es justamente la prueba
    // de que las dos capas hacen cosas distintas.
    procedencia: 'valle',
    historia: 'Entró al Sotobosque con su hermano hace nueve años y volvió sola. Esa parte no la cuenta. Vio una vez un claro con luz que no venía de arriba y no lo volvió a encontrar; desde entonces entra igual, cada semana, y vuelve. Lee las sendas mejor que nadie del valle y eso la mantiene viva y sola.',
    knows: ['lectura-de-sendas'],
    agenda: { goal: 'encontrar el claro que vio una vez y no volvió a encontrar', needs: null } },
  { name: 'Odila', trade: 'destiladora', place: 'aldea', home: 'aldea', teaches: true,
    disposition: 'Cobra por adelantado y se acuerda de quién no le pagó. Todos le deben algo.',
    // "Querido, mi amor, tesoro" era la otra herencia rioplatense. El registro
    // que se buscaba —dulzura que aprieta— no dependía de esas palabras: "hija"
    // y "criatura" en boca de una mujer mayor que te está cobrando hacen lo
    // mismo y no suenan a ninguna ciudad.
    voice: 'Amable como una puerta que se cierra despacio. Empieza por lo cordial y termina en la cuenta. Llama "hijo", "hija", "criatura" a todo el mundo, y le sale más dulce cuanto peor está la deuda. Mide en cosas y no en monedas: un frasco, dos jornadas, media raíz. Si le preguntan cómo hace lo que hace, cambia de tema en la misma frase. Tutea siempre, y más a quien le debe.',
    procedencia: 'valle',
    historia: 'Aprendió a destilar de una mujer que pasó por el valle un verano y se fue sin dejar el nombre. Vive de que todos le deban algo chico: es más seguro que cobrar de una vez. Bruno le debe desde el invierno pasado y lo va a mencionar cada vez que pueda, sonriendo.',
    knows: ['destilado-de-raiz'],
    agenda: { goal: 'cobrarle a Bruno lo del invierno pasado', needs: null } },
  // `teaches: true` desde el día que tuvo algo que enseñar, y no antes: estaba
  // en false porque no sabía hacer nada. Dejarlo en false ahora sería fabricar
  // una segunda pared como la de Ren, y **una sola persona del valle puede
  // decidir que no.** Es ella, y es la mitad de lo que la hace Ren.
  { name: 'Sarn', trade: 'guardia', place: 'aldea', home: 'aldea', teaches: true,
    disposition: 'Contratado, no leal. Cumple mientras le paguen y lo dice de frente.',
    // El usted de Sarn es su marca de procedencia más fuerte y por eso está en
    // la voz y no en el texto compartido: es la costumbre de un hombre pagado,
    // no respeto. Ren también trata de usted y no se parecen en nada — el de
    // ella viene con dichos, el de él con condiciones.
    voice: 'Frases planas, el mismo tono para una amenaza que para el clima. Declara las condiciones antes que nada: qué hace, hasta dónde, y por cuánto. No adorna, no bromea, no se ofende. Dice "no es asunto mío" y lo dice en serio. Trata de usted a todo el mundo, sin excepción, y no es respeto. Cuando está cansado se le repiten las palabras.',
    procedencia: 'compania',
    historia: 'Vino con una compañía que se disolvió tres valles atrás y se quedó acá porque acá todavía le pagaban. No es de ningún lado y no finge que sí. Este mes no le pagaron y hace tres noches que duerme mal; lo dice como un dato, igual que diría que llovió. En la compañía le tocaban las bestias de la columna, y de ahí le quedó lo que sabe hacer con las manos: ordeña al amanecer, cuando se le termina la guardia, y cuaja la leche antes de que se corte.',
    knows: ['cuajado-de-leche'],
    agenda: { goal: 'que alguien le pague la guardia de este mes', needs: null } },
  { name: 'La vieja Ren', trade: 'nadie sabe', place: 'ruina', home: 'ruina', teaches: false,
    disposition: 'Vive en la Casa Quemada y no explica por qué. Es la única que sabe la runa de quietud.',
    // "Mide el tiempo en inviernos" salió de su voz y se fue a la procedencia:
    // no es un tic suyo, es de dónde viene. Es el ejemplo más limpio de para
    // qué sirve haber partido el campo en dos.
    voice: 'Habla poco y torcido: contesta con otra cosa, con un dicho, o con una pregunta que no viene al caso. Casi nunca dice que sí ni que no. Cuando el tema se acerca a las runas, se calla o habla del frío. Trata de usted a todo el mundo, incluso a los niños, y espera lo mismo.',
    procedencia: 'casa-quemada',
    historia: 'Vivía en la Casa Quemada antes del incendio y se quedó adentro después. Le enseñó una runa a alguien, una vez, y lo que pasó después es la razón por la que no piensa volver a hacerlo. Lleva la cuenta de los inviernos que le quedan y no le sobran.',
    knows: ['runa-de-quietud', 'runa-de-brasa'],
    agenda: { goal: 'morirse sin haberle enseñado la runa de quietud a nadie', needs: null } },
  { name: 'Tobio', trade: 'chico del camino', place: 'camino', home: 'camino', teaches: false,
    disposition: 'Sabe quién entró y quién salió de la región. Lo cuenta gratis, que es peor.',
    // Una voz no puede pedir un tipo de frase que obligue a inventar hechos:
    // la primera versión de ésta decía "arranca con ayer o el otro día" y el
    // modelo se fabricaba noticias que no estaban en la base para cumplirla.
    voice: 'Habla rápido y encima del otro: arranca una pregunta, la deja por la mitad y termina pidiendo lo que quiere, que siempre es ver algo de cerca. Dos preguntas por vez, no cinco. Se entusiasma con lo que no entiende y lo repite en voz alta. Cuando quiere algo lo pide de frente, sin rodeos. Nunca inventa noticias: si no vio nada, pregunta.',
    procedencia: 'valle',
    historia: 'Tiene doce o trece, nadie llevó la cuenta, y vive en el Camino del Norte porque ahí pasa lo único que pasa. Vio a alguien trazar una runa una vez, de lejos, y no se lo pudo sacar más de la cabeza. Reparte gratis todo lo que sabe y todavía no se dio cuenta de que eso le va a costar caro.',
    knows: [],
    agenda: { goal: 'ver de cerca a alguien que sepa magia', needs: 'runa-de-brasa' } },

  // ── SAUCE QUEBRADO ────────────────────────────────────────────────────────
  //
  // Tres, no once. Un pueblo se lee por la gente que tiene adentro y no por la
  // cantidad de techos; el cliente le pone cinco casas y **las dos que sobran
  // quedan cerradas**, que es lo que este juego quiere decir: acá vivía más
  // gente.
  //
  // Las dos agendas piden un OBJETO y no un saber, y las dos se resuelven
  // abajo: el frasco lo hace Odila en la aldea y la hoja la hace Ilde en la
  // fragua. Es a propósito y es la mitad de por qué existe el pueblo — **el
  // primer objetivo del juego que no se resuelve donde te lo dan.**
  { name: 'Nevia', trade: 'curandera', place: 'sauce', home: 'sauce', teaches: true,
    disposition: 'Cura a cualquiera que llegue caminando y no pregunta de qué se cayó. Enseña, pero tarde: primero quiere ver si volvés.',
    voice: 'Da instrucciones en vez de opiniones: qué hacer, en qué orden y cuánto esperar. Pregunta por el cuerpo antes que por el nombre — dónde duele, desde cuándo, si podés apoyarlo. No consuela y no se alarma; lo peor y lo mejor los dice con el mismo tono. Cuando alguien exagera, lo corta con un dato. Trata de usted a los que no conoce y pasa al tú cuando ya te curó una vez.',
    procedencia: 'sauce',
    historia: 'Hierve corteza desde que tiene memoria porque su madre hervía corteza. Tuvo el frasco de Odila una sola vez y le rindió el doble; desde entonces guarda el emplasto en paños, que se secan, y lo dice cada vez que alguien se lo pregunta. No sale de Sauce Quebrado ni para ir a buscarlo.',
    knows: ['emplasto-de-sauce'],
    agenda: { goal: 'guardar el emplasto en algo que no lo seque', needs: null,
      objeto: 'frasco de raíz' } },
  { name: 'Tolmo', trade: 'vadeador', place: 'sauce', home: 'sauce', teaches: false,
    disposition: 'Conoce el paso del río con el agua alta y cobra por cruzar a los que no. Se guarda las dos cosas que sabe del vado y no piensa enseñarlas.',
    voice: 'Habla del tiempo y del agua todo el rato, y es literal: para él el agua alta o baja explica casi todo. Cuenta las cosas por el orden en que pasaron, con los días contados, y se pierde en detalles del camino. Nunca dice que algo es peligroso; dice cuánto cuesta. Tutea a todo el mundo y llama a la gente por el oficio antes que por el nombre.',
    procedencia: 'sauce',
    historia: 'Cruza gente desde antes de que el puente de tablas se pudriera, y desde que se pudrió cobra el doble. Le tiene bronca al camino del norte porque el que llega por ahí no le paga a nadie. Sabe que Nevia lo curó dos veces y no le cobra a ella.',
    knows: [],
    agenda: { goal: 'rehacer el paso de tablas antes de que suba el agua', needs: null,
      objeto: 'hoja templada' } },
  { name: 'Beruta', trade: 'tejedor', place: 'sauce', home: 'sauce', teaches: true,
    disposition: 'Teje de espaldas a la puerta y contesta sin levantar la vista. Enseña a quien se sienta al lado y se calla.',
    voice: 'Frases largas y tranquilas, con el hilo de la conversación bien agarrado: retoma lo que le dijeron hace tres frases. Habla de las cosas por cómo están hechas —qué aguanta, qué se deshilacha, cuánto lleva— y de la gente casi nunca. Nunca interrumpe y no sube el tono. Trata de usted a todo el mundo, siempre, y no cambia ni con los que conoce hace años.',
    procedencia: 'sauce',
    historia: 'Se quedó en Sauce Quebrado cuando el resto de su casa se fue río abajo, y teje para los cinco techos que quedan. Guarda el telar de su hermana sin usarlo. Cuando le sobra paño se lo lleva a Nevia, que lo corta para los emplastos.',
    knows: [],
    agenda: { goal: 'que alguien se siente al lado y aprenda a tejer', needs: null } },
]

async function main() {
  const { data: existing } = await db.from('regions').select('id').eq('slug', REGION_SLUG).maybeSingle()
  if (existing) {
    console.error(`La región "${REGION_SLUG}" ya existe. Borrala antes de re-sembrar.`)
    process.exit(1)
  }

  const { data: region, error: regionError } = await db
    .from('regions')
    .insert({ slug: REGION_SLUG, name: 'El Valle Primero', tick: 0 })
    .select('id')
    .single()
  if (regionError || !region) throw regionError

  const { data: places, error: placesError } = await db
    .from('places')
    .insert(PLACES.map((p) => ({ ...p, region_id: region.id })))
    .select('id, slug')
  if (placesError || !places) throw placesError
  const placeBySlug = new Map(places.map((p) => [p.slug, p.id]))

  const { data: knowledge, error: knowledgeError } = await db
    .from('knowledge')
    .upsert(KNOWLEDGE, { onConflict: 'slug' })
    .select('id, slug')
  if (knowledgeError || !knowledge) throw knowledgeError
  const knowledgeBySlug = new Map(knowledge.map((k) => [k.slug, k.id]))

  // El horario de cada oficio. Una consulta para las siete personas: la tabla
  // es catálogo del autor y es global, como `knowledge`. Lo que no figure se
  // lleva el default de la columna, que es el día de cualquiera (6 a 22).
  const horarios = new Map(((await db
    .from('horarios').select('trade, desde, hasta')).data ?? [])
    .map((h) => [h.trade as string, h]))

  for (const spec of PEOPLE) {
    // Un slug de origen mal escrito dejaría a esa persona sin procedencia y
    // hablando como nadie. Se revienta acá, que es donde se ve.
    const procedencia = PROCEDENCIAS[spec.procedencia as Origen]
    if (!procedencia) throw new Error(`${spec.name} apunta a un origen que no existe: ${spec.procedencia}`)

    const casa = placeBySlug.get(spec.home)
    if (!casa) throw new Error(`${spec.name} duerme en un lugar que no existe: ${spec.home}`)
    const jornada = horarios.get(spec.trade)

    const { data: person, error } = await db
      .from('people')
      .insert({
        region_id: region.id,
        place_id: placeBySlug.get(spec.place),
        // Dónde duerme, y a qué hora está en pie. Ver el comentario largo de
        // arriba: `place` es dónde trabaja y `home` es dónde vuelve.
        home_place_id: casa,
        jornada_desde: jornada?.desde ?? 6,
        jornada_hasta: jornada?.hasta ?? 22,
        name: spec.name,
        trade: spec.trade,
        disposition: spec.disposition,
        voice: spec.voice,
        // El slug se resuelve acá y lo que se guarda es el texto entero. En la
        // base queda repetido para los del mismo origen, y está bien que quede:
        // el que lee la fila tiene que poder saber cómo suena esa persona sin
        // ir a buscar una tabla de orígenes que, con siete habitantes, sería
        // una junta más por cada charla a cambio de nada.
        procedencia,
        historia: spec.historia,
        teaches: spec.teaches,
      })
      .select('id')
      .single()
    if (error || !person) throw error

    if (spec.knows.length > 0) {
      await db.from('knows').insert(
        spec.knows.map((slug) => ({
          holder_kind: 'person',
          holder_id: person.id,
          knowledge_id: knowledgeBySlug.get(slug),
          how: 'origen',
          learned_tick: 0,
        })),
      )
    }

    await db.from('agendas').insert({
      person_id: person.id,
      goal: spec.agenda.goal,
      // Una agenda pide un saber o pide una COSA, nunca las dos. `objeto` es la
      // rama nueva y es la que de verdad usa el jugador: `needs_object` guarda
      // el kind y `case 'dar'` lo compara contra lo que le ponés en la mano.
      // Hasta hoy la siembra sólo sabía de saberes y las agendas de objeto se
      // parcheaban después con un `update` en una migración.
      needs_kind: 'objeto' in spec.agenda && spec.agenda.objeto ? 'object'
        : spec.agenda.needs ? 'knowledge' : null,
      needs_id: spec.agenda.needs ? knowledgeBySlug.get(spec.agenda.needs) : null,
      needs_object: 'objeto' in spec.agenda ? spec.agenda.objeto : null,
      started_tick: 0,
    })
  }

  // ── La plata ──────────────────────────────────────────────────────────
  //
  // Tres mostradores y tres monedas, y las tres son geografía: **lo que acepta
  // la aldea no vale del otro lado del valle** (`DISENO.md` §9.3b). Cruzar el
  // valle es cambiar de plata, y eso es una razón para viajar.
  //
  // Ninguno se inventa: los tres salen de quién es cada uno.
  //
  //   · **Odila, en la aldea, con marcos.** «Cobra por adelantado y se acuerda
  //     de quién no le pagó»; «mide en cosas y no en monedas». El mostrador de
  //     la aldea era suyo desde antes de que existiera la palabra.
  //   · **Ren, en la ruina, con cuentas de hueso.** Los de la Ceniza vivían en
  //     la Casa Quemada antes de que se quemara. La que se quedó adentro es la
  //     única que tiene lo que ellos aceptan, y no explica por qué.
  //   · **Marta, en el bosque, con resina.** Es la única que entra al
  //     Sotobosque sola y vuelve.
  //
  // Si el que atiende se muere, el mostrador queda cerrado y su moneda deja de
  // circular en el valle. Es la tesis del juego aplicada a la plata.
  const MOSTRADORES = [
    { lugar: 'aldea', quien: 'Odila', moneda: 'marco', abre: 8, cierra: 20 },
    { lugar: 'ruina', quien: 'La vieja Ren', moneda: 'hueso', abre: 9, cierra: 17 },
    { lugar: 'bosque', quien: 'Marta', moneda: 'resina', abre: 7, cierra: 19 },
  ]
  const gente = new Map(((await db.from('people')
    .select('id, name').eq('region_id', region.id)).data ?? [])
    .map((p) => [p.name as string, p.id as string]))

  for (const m of MOSTRADORES) {
    const quien = gente.get(m.quien)
    const donde = placeBySlug.get(m.lugar)
    if (!quien || !donde) continue
    await db.from('mostradores').insert({
      region_id: region.id, place_id: donde, person_id: quien,
      moneda: m.moneda, abre: m.abre, cierra: m.cierra,
    })
    // El que atiende tiene con qué comprarte lo que le lleves. **Es la única
    // forma de que el jugador gane plata desde el primer día sin que nada
    // aparezca de la nada**: la que cobrás sale de una bolsa que ya la tenía.
    await db.from('bolsas').insert({
      region_id: region.id, holder_kind: 'person', holder_id: quien,
      moneda: 'marco', cantidad: 60,
    })
    if (m.moneda !== 'marco') {
      await db.from('bolsas').insert({
        region_id: region.id, holder_kind: 'person', holder_id: quien,
        moneda: m.moneda, cantidad: 40,
      })
    }
  }
  // Y el resto del valle, con lo puesto. Nadie arranca rico: con una hoja
  // templada rondando los veinte marcos, doce marcos no compran nada entero.
  const conMostrador = new Set(MOSTRADORES.map((m) => gente.get(m.quien)))
  await db.from('bolsas').insert([...gente.values()]
    .filter((id) => !conMostrador.has(id))
    .map((id) => ({
      region_id: region.id, holder_kind: 'person', holder_id: id,
      moneda: 'marco', cantidad: 12,
    })))

  await db.from('events').insert({
    region_id: region.id,
    tick: 0,
    kind: 'fundacion',
    summary: 'El valle existe. Doce casas, una fragua encendida y una casa que nadie reconstruye.',
  })

  // Chequeo del generador: una región sin nadie que sepa nada salió mal.
  const { count } = await db
    .from('knows')
    .select('id', { count: 'exact', head: true })
    .eq('holder_kind', 'person')
  if (!count) throw new Error('La región salió sin ningún saber. El generador está roto.')

  // El otro chequeo del generador, y es el mismo criterio: una región donde
  // alguien no tiene dónde dormir no es un lugar habitado, es un decorado con
  // gente parada. Se revienta acá y no en el tick, porque en el tick se ve como
  // una persona que nunca vuelve a ninguna parte y nadie sabe por qué.
  const { count: sinCasa } = await db
    .from('people')
    .select('id', { count: 'exact', head: true })
    .eq('region_id', region.id).is('home_place_id', null)
  if (sinCasa) throw new Error(`${sinCasa} personas salieron sin casa. El generador está roto.`)

  console.log(`Sembrado: ${PEOPLE.length} personas, ${PLACES.length} lugares, ${count} saberes repartidos.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
