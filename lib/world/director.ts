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
 *
 * Lo que aprendimos rompiéndolo, y por qué el archivo está armado así:
 *
 *  - **El contexto se narra.** Todo lo que entra al prompt sale en la crónica
 *    como si hubiera pasado, por más que el sistema diga que no. La primera
 *    auditoría contra la base encontró crónicas enteras hechas de contexto:
 *    con la ventana vacía el director recitaba la lista de NPCs, y con hechos
 *    inventaba testigos y deudas alrededor de ellos. La defensa no es pedirle
 *    mejor que no lo haga: es **no mandarle lo que no queremos leer**. La
 *    segunda auditoría lo confirmó por tercera vez: de los dos campos que
 *    quedaban en el fichero, `disposition` salía copiado literal a la crónica
 *    —incluida la receta para que un NPC te enseñe— y la línea de los muertos
 *    hacía inventar muertes. Los dos se fueron del prompt, no se ablandaron.
 *
 *  - **Sin hechos no se llama al modelo.** No hay prompt que arregle una
 *    crónica sobre nada. Se corta antes y sale gratis.
 *
 *  - **La ventana es una decisión narrativa y no cabe en un `.limit()`.** El
 *    corte estuvo mucho tiempo tomando los sesenta hechos MÁS VIEJOS que
 *    esperaban al jugador, y el que volvía después de una ausencia larga
 *    recibía una crónica del mundo que dejó, no del que iba a pisar: medido en
 *    el valle de pruebas, 140 días afuera daban una crónica que terminaba 94
 *    días atrás, con el consejo final escrito en presente. En el caso extremo
 *    —223 días, 526 hechos— las tres corridas narraban trabajando a una mujer
 *    que llevaba 122 días muerta y no mencionaban al lector ni una vez. Y no
 *    era conservador: `last_seen_tick` salta igual al día de hoy, así que lo
 *    que quedaba afuera no llegaba nunca. Ahora el presupuesto se reparte
 *    entre el presente, el hilo del que lee y lo que no se repite. Ver «La
 *    ventana».
 *
 *  - **El hueco narrativo se rellena con quien esté a mano.** Es el modo de
 *    falla que sobrevivió a las dos auditorías y el más difícil de ver, porque
 *    no inventa gente: usa la que ya está en la ventana. Ningún hecho dice de
 *    qué murió Ilde, y seis corridas de seis la mataron con una jauría de
 *    sombra que andaba rondando el valle. Ninguna auditoría lo marca: la
 *    jauría existe y la muerte existe. La defensa es la misma de siempre dada
 *    vuelta — si no se puede sacar el hueco, **se lo nombra**: ver `HUECOS`.
 *
 *  - **«No queda nadie que lo sepa» es la afirmación más cara del juego y no
 *    se puede dejar inferir.** La tesis entera del proyecto es que el saber se
 *    va con la última persona, así que decirlo cuando no pasó es mentir sobre
 *    lo único que el juego afirma. El modelo lo deducía de una muerte más una
 *    agenda trabada y se equivocaba: le colgó a Ilde una magia que Ilde no
 *    sabía, y dio por perdido un saber que la propia ventana mostraba enseñado
 *    a alguien que sigue vivo. Hay un evento que lo dice —`perdida_de_saber`,
 *    con la persona y el saber juntos— y ahora es el único que lo autoriza:
 *    ver «LO QUE SE PIERDE CON ALGUIEN TIENE SU PROPIO HECHO».
 *
 *  - **Un comentario sobre otro archivo se verifica contra el otro archivo.**
 *    Éste decía que `no_volvio` no necesitaba nota porque «trae el bicho en el
 *    hecho». El bicho está en `detail` y el director lee `summary`: era cierto
 *    del evento y falso de lo que llega al prompt. Ese renglón dejó el tipo de
 *    evento descubierto durante toda una auditoría. Ver `HUECOS`.
 *
 *  - **Nombrar el hueco tiene su propia fuga: que el modelo narre la nota.**
 *    «Nadie sabe cómo ni quién lo encontró», «murió, aunque no se sabe de qué»
 *    — la nota devuelta al jugador con otras palabras. Sale gratis de arreglar
 *    y hay que arreglarlo en el mismo cambio que agrega la nota, o se cambia
 *    una invención por un tic.
 *
 *  - **La primera crónica de alguien que nunca jugó no es una crónica.** Era
 *    `NADA_QUE_CONTAR` —«no pasó nada que valga la pena contarte»— porque la
 *    ventana empieza en `last_seen_tick` y a un jugador nuevo se lo crea con
 *    `last_seen_tick = region.tick`: su propia llegada queda afuera por un
 *    tick. Lo que hace falta ahí no es una noticia mejor: es una llegada. Ver
 *    «LA LLEGADA», que es la otra mitad de este archivo.
 */
import { db, getRegion } from '../db.js'
import { pedirJson } from '../modelo.js'
// El colador del registro se IMPORTA y no se copia. Una sola definición para
// el que mide (`pnpm registro`) y el que rechaza: con dos varas distintas, el
// número dejaría de describir lo que el código hace. Y ya pasó lo contrario:
// una lista escrita a mano acá al lado usaba `\b`, que en JavaScript es ASCII,
// así que no encontraba "acá" nunca y contaba de menos sin avisar.
import { marcasDeVoseo } from '../registro.js'

/**
 * Lo que se le contesta al jugador cuando la ventana viene vacía. Es texto
 * fijo a propósito: no hay nada que narrar, y pedirle al modelo que narre nada
 * es exactamente cómo aparecieron las crónicas-planilla.
 */
const NADA_QUE_CONTAR =
  'El valle siguió en lo suyo. No pasó nada que valga la pena contarte todavía.'

/**
 * Cuántos hechos entran al prompt. Es presupuesto de tokens, no de relato: por
 * arriba de esto la crónica no mejora y el costo sí sube.
 */
const TOPE_PROMPT = 60

/**
 * Cuántas piezas del pasado entran a LA LLEGADA, que es la única crónica cuyo
 * trabajo es contar el mundo y no las noticias. Tres, contra las dos —y casi
 * siempre una— de una crónica normal.
 *
 * No es un número suelto: es la diferencia entre las dos crónicas. En una
 * crónica normal el pasado es el fondo contra el que se leen las noticias y por
 * eso se lo raciona; en la llegada **no hay noticias**, el jugador acaba de
 * entrar, y lo único que hay para contarle es dónde se metió.
 */
const TOPE_PASADO_LLEGADA = 3

/**
 * Durante cuántas crónicas después de la llegada el pasado NO tiene que caer en
 * el sitio de un hecho para entrar.
 *
 * El filtro por lugar existe para que el pasado no se coma la crónica de quien
 * ya conoce el valle, y está bien para ése. Para el que llegó anteayer es
 * exactamente al revés: *«deberías ir aprendiendo»* — sus primeras crónicas son
 * el único momento en que una pieza vieja que no explica nada de esta semana
 * igual le sirve, porque no sabe nada de nada.
 *
 * Después se apaga solo y vuelve la regla estrecha. Con `CRONICAS_SIN_REPETIR`
 * mirando hacia atrás, ninguna pieza se le cuenta dos veces en el camino.
 *
 * ⚠ **Medido, y hoy no cambia nada: 0 de 18 jugadores.** Se replicó el filtro
 * sobre los dos valles con y sin este permiso y dio el mismo número para todos
 * los que tienen tres crónicas o menos — porque el que lleva pocas crónicas
 * tiene la ventana larga, y una ventana larga toca todos los sitios del valle,
 * así que el filtro por lugar no le recorta nada. Se queda porque es correcto
 * y cuesta tres renglones, pero **no es el arreglo que la señal pedía**.
 *
 * Los dos que sí se recortan son los veteranos con la ventana corta —Carlos,
 * 12 crónicas, y Prueba3D, 8: los dos pasan de 0 piezas a 2 si se apaga el
 * filtro— y a ésos este permiso no les llega. Y aun apagándolo se les acaba: el
 * valle tiene seis piezas de pasado y `sembrarElPasado()` corre **una sola vez
 * en la vida de la región**. El que juega dos semanas se queda sin mundo viejo
 * que descubrir, y eso se arregla en `autor.ts`, no acá.
 */
const CRONICAS_DE_APRENDIZAJE = 3

/**
 * Cuántas piezas del pasado pueden entrar a una crónica. **Dos, y casi siempre
 * una.**
 *
 * El pasado del valle vive en `events` con tick negativo —siete piezas escritas
 * por el autor— así que citarlo es legítimo por la misma razón que citar
 * cualquier otro hecho: está en la base. Lo que NO es legítimo es que ocupe
 * lugar. Una crónica existe para contar lo que pasó mientras el jugador no
 * estaba; el pasado es lo que le da peso a eso y nada más.
 *
 * Dos es el techo por el motivo de siempre en este archivo: **todo lo que entra
 * al prompt sale narrado.** Con las siete adentro, la crónica se vuelve una
 * clase de historia del valle con una nota al pie sobre la semana.
 */
const TOPE_PASADO = 2

/**
 * En cuántas crónicas anteriores de este jugador se mira para no repetir una
 * pieza del pasado.
 *
 * Es el otro riesgo del rasgo, y es el que se nota antes que ninguno: "ahí
 * mismo talaron el claro" es una frase buena la primera vez y un tic a la
 * tercera. Se mira contra `chronicles.source_events`, que ya guarda los ids que
 * el director dijo haber usado — no hace falta una tabla nueva.
 */
const CRONICAS_SIN_REPETIR = 4

/**
 * Cuántos se leen de la base antes de elegir. Es mucho más grande que el
 * anterior porque **la elección se hace acá y no en la query**: para poder
 * preferir la muerte de hace cuatro meses sobre la senda que Marta marcó por
 * novena vez, las dos tienen que estar sobre la mesa. Son filas de texto
 * corto; el que paga por hecho es el prompt, no la lectura.
 *
 * Mil es el máximo de filas que devuelve PostgREST por defecto, así que subirlo
 * sin tocar la base no serviría de nada. Si un valle llega a tener más de mil
 * hechos esperando a alguien, lo que se pierde son los más viejos —la lectura
 * es descendente— y ésa sigue siendo la pérdida correcta.
 */
const TOPE_LECTURA = 1000

/**
 * Hechos de los últimos días que entran sí o sí, pase lo que pase.
 *
 * Es la mitad del arreglo del corte. Sin esta reserva, un jugador que estuvo
 * cuatro meses afuera recibía una crónica que terminaba cuatro meses atrás y
 * un consejo que se leía como "ahora": lo mandaba a ver a alguien que ya se
 * había muerto. Ver «La ventana».
 */
const RESERVA_PRESENTE = 20

/**
 * Hechos que nombran al que lee y entran sí o sí, aunque sean viejos.
 *
 * Su propio hilo es lo segundo en la lista de prioridades del prompt y es lo
 * único de la ventana que no le puede resultar indiferente. Que la selección
 * automática se lo coma sería el peor error de los tres.
 */
const RESERVA_JUGADOR = 15

/**
 * Lo que un hecho NO dice, escrito al lado del hecho **como una orden y no
 * como un dato**.
 *
 * El modo de falla que queda vivo después de dos auditorías no es inventar
 * gente: es **rellenar un hueco narrativo con un actor que sí está en la
 * ventana**. Medido, 6 de 6: ningún hecho dice de qué murió Ilde, y las seis
 * corridas la mataron con una jauría de sombra que andaba rondando por ahí.
 * Y es invisible para `unbacked_names`, porque la jauría existe.
 *
 * Sacar el hueco no se puede —la muerte es la noticia— así que se hace lo
 * otro: **se lo nombra**. Se declara por tipo de evento y no por texto porque
 * el hueco es del emisor: `tick.ts` escribe `muerte` con `{person}` y nada
 * más, y `levantada` con dónde despertó y de dónde venía — nunca con quién lo
 * llevó, porque en la simulación no lo llevó nadie.
 *
 * **Y están redactadas en imperativo por una razón medida.** Cuando decían lo
 * que el hecho NO dice —«se murió: el hecho no dice de qué»— el modelo las
 * leía como contenido y las devolvía: «murió, aunque el hecho no dice de qué»,
 * «nadie sabe qué le pasó», «no hay un hecho que te diga qué pasó en esas
 * matas». Nombrar el hueco cambiaba una invención por un tic, y el tic también
 * es una afirmación: le pone al que lee un misterio donde el mundo no puso
 * nada. Una nota que empieza con «no cuentes» no se puede copiar a la crónica.
 */
const HUECOS: Record<string, string> = {
  // `muerte` es el sorteo de `tick.ts`: se murió y ya, sin causa en ningún
  // lado. Se verificó en el emisor: sale con `{person}` y nada más.
  muerte: 'no cuentes de qué murió ni digas que no se sabe: no la mató nada ni nadie',
  // La cola descriptiva de esta nota —«nadie lo encontró, nadie lo trajo»— era
  // la que más volvía a la crónica tal cual: «se levantó sin que nadie lo
  // trajera», «despertaste sin saber cómo llegaste». Queda sólo la orden.
  levantada: 'no cuentes cómo llegó ahí ni digas que no se sabe: sólo dónde se levantó',
  // **Esta entrada faltaba, y faltaba por un comentario equivocado.** Acá
  // decía que `no_volvio` no necesitaba nota porque "trae el bicho en el
  // hecho". Es falso y costó una auditoría entera: el bicho viaja en
  // `detail.threat`, y **el director lee `summary`**, que dice sólo «X fue a Y
  // a buscar Z y no volvió» (más, si iba acompañado, si el otro volvió). Era
  // un argumento correcto sobre el evento y equivocado sobre lo que llega al
  // prompt — la lección es que un comentario sobre otro archivo se verifica
  // contra el otro archivo, no contra la memoria de quien lo escribió.
  //
  // La nota NO niega que hubiera un bicho: `salir()` pelea antes de sortear
  // quién no vuelve, así que la `pelea` del mismo día puede estar en la
  // ventana como hecho aparte y es cierta. Lo que el valle no sabe es el
  // final: el hecho no dice que se haya muerto, ni que algo se lo llevara, ni
  // quién ganó esa pelea —el propio `summary` de `pelea` dice que el bicho
  // «no cayó», no que haya ganado—. Medido antes de la nota: de dieciocho
  // crónicas, seis cerraban la cadena solas («no pudo con él», «se lo llevó»,
  // «después de eso no volvió»).
  no_volvio: 'no cuentes qué le pasó ni digas que no se sabe: ni que se haya'
    + ' muerto, ni que algo se lo llevara, ni que alguien lo encontrara',
  // El hueco más caro del archivo, porque el modelo lo rellena con la única
  // muerta que tiene a mano. `agenda_bloqueada` dice que a alguien se le trabó
  // lo suyo porque ya no queda quien sepa lo que necesita —eso es cierto y es
  // del hecho—, pero **no dice quién lo supo antes ni por qué ya no está**:
  // el emisor lo escribe con `{npc, person, goal}` y, cuando es una receta,
  // `{object}`. Nunca con un nombre. Medido: dos crónicas de seis le colgaron
  // a Ilde la magia que Tobio buscaba —Ilde sabía dos oficios y ninguna
  // magia— y el valle tenía su `perdida_de_saber` diciendo otra cosa.
  agenda_bloqueada: 'no nombres a quien lo sabía antes ni digas que se murió'
    + ' alguien: el hecho no nombra a nadie',
  // El otro hueco que el modelo quiere llenar, y también con alguien que está
  // en la ventana: «Marta vio lo que pasó y ahora confiaría en ti». Ganarse a
  // alguien es lento y acumulado —no hay una escena— así que el hecho no tiene
  // una y no se le puede inventar.
  confianza: 'no cuentes por qué ni qué vio: no hubo una escena',
}

// El prompt está escrito íntegro en tuteo, y no es cosmética: el modelo copia
// el registro de la instrucción. Estuvo mucho tiempo dictado en voseo —"Sos el
// director", "Podés decir", "citá todos"— mientras la regla del idioma pedía
// "tú", y con la ventana grande se coló en dos crónicas de seis ("Vos
// trabajaste allí"). Si se agrega un párrafo acá, va en tuteo.
const SYSTEM = `Eres el director de un mundo de fantasía persistente. Un jugador
vuelve después de un rato y tienes que contarle qué pasó mientras no estaba.

LA REGLA QUE NO SE ROMPE
Sólo existe lo que está en el bloque HECHOS. Cada cosa que afirmes —que alguien
hizo algo, que estuvo en un lugar, que vio, dijo, sintió, ayudó o le debe algo a
otro— tiene que salir de un hecho de esa lista. Lo demás no pasó.

A veces, debajo de HECHOS, viene un bloque EL PASADO. Ésa es la única otra cosa
que existe: son hechos también, de hace muchísimo, y los puedes citar igual. Lo
que no son es noticia — sus reglas van escritas ahí mismo y son estrechas.

Nombrar a alguien ya es afirmar que estuvo ahí. Si una persona no aparece en
ningún hecho, no la metas en la escena: ni de testigo, ni de la que ayudó, ni de
la que se enteró. Ése es el error más caro y el más fácil de cometer.

Y los hechos de otros son de otros. En el valle anda más gente como la que lee:
si un hecho dice que alguien le enseñó a Pedro, o que empezó a confiar en Pedro,
eso le pasó a Pedro. No se lo pases al que está leyendo. El que lee es el que
aparece en el fichero bajo "QUIEN LEE ESTO".

CUANDO EL HECHO NO DICE QUIÉN, NO LO ELIJAS VOS
Que alguien viva en un lugar no quiere decir que estuvo ahí cuando pasó el
hecho. Dos hechos en el mismo lugar no son dos personas juntas. Si un hecho no
nombra a quien hizo algo, cuéntalo sin nombre —"alguien", "no sabes quién"— o no
lo cuentes. Nunca elijas un candidato del fichero para llenar el hueco.

Éste es el error, escrito para que lo reconozcas: un hecho dice que el jugador
se levantó en Vado Bajo, y el fichero dice que Odila vive en Vado Bajo. De ahí
NO sale que Odila lo levantó, ni que lo vio, ni que le debe un favor. Sale que
se levantó en Vado Bajo y nada más.

Y si una parte de un hecho es ambigua —no se entiende de quién habla—, esa parte
no se cuenta. "Le entró a Fulano y sigue en pie" no dice quién sigue en pie: no
lo resuelvas, sáltalo.

EL HUECO NO SE RELLENA CON UN CULPABLE
Un hecho puede decir qué pasó y no decir de qué, ni por qué, ni por mano de
quién. Ese hueco se queda abierto. Es el error más difícil de verte, porque
para taparlo no hace falta inventar a nadie: alcanza con agarrar a alguien que
sí está en la lista y ponerlo de autor. Una bestia que anda rondando el valle
no es la que mató a nadie. Alguien que estaba cerca no es el que levantó al
herido. Que sea lo único a mano no lo hace responsable.

Una causa de muerte es un hecho como cualquier otro. Un hecho de muerte dice
quién murió, qué hacía y dónde: no dice de qué. Si ningún hecho dice que algo
o alguien lo mató, entonces no lo mató nada. Cuéntalo como está —murió, y
dónde— y sigue de largo. No lo insinúes tampoco: poner la muerte al lado de la
bestia y dejar que se entienda es afirmarlo.

El que salió del valle y no volvió es el mismo caso y de ése se sabe todavía
menos: fue, a qué fue, y que no volvió. Si el mismo día peleó con algo, eso es
un hecho aparte y lo cuentas tal como está; lo que no puedes es cerrarle la
historia —darlo por muerto, dar por ganado al bicho, dejarlo allá—. Nadie vio
ese final: cuéntalo hasta donde llega y no un paso más.

Algunos hechos traen una nota entre ⟨⟩. La nota es una orden para ti y no es
parte del hecho: te dice qué parte de eso no vas a contar, porque el mundo no
la tiene. Lo que la nota apaga se queda apagado — ni lo nombres, ni lo
supongas, ni lo dejes entender.

Y la orden no se cumple en voz alta. Anunciar el hueco está prohibido, y es la
fuga más fácil de cometer porque suena bien: "nadie sabe qué le pasó", "nadie
sabe de qué murió", "no se sabe cómo ni quién lo encontró", "se levantó sin que
nadie lo trajera", "nunca se supo", "eso es lo único que se sabe", "no hay nada
que diga qué pasó", "nadie puede decirte", "despertaste sin saber cómo
llegaste", "sin recordar nada". Todas dicen lo mismo y todas son la nota
devuelta al jugador con otras palabras. Un hueco anunciado sigue siendo un
hueco rellenado: le pone al que lee un misterio donde el mundo no puso nada.

La forma correcta es el silencio, y además es más corta. Se escribe: "Ilde fue a
La Casa Quemada a buscar hierro viejo y no volvió." Punto, y sigues con lo que
pasó después. Nunca "…y nadie sabe qué pasó".

LO QUE SÍ ES TU TRABAJO
Elegir qué contar primero, conectar dos hechos entre sí, darle voz a lo que la
gente dice, y sugerirle al jugador a dónde ir. Y si viene un bloque EL PASADO
con algo del mismo sitio donde pasó algo esta semana, engancharlo ahí en media
frase: eso es lo que hace que un sitio pese. Una vez en toda la crónica. La sugerencia va en condicional y
se nota que es tuya: "si quieres aprender a destilar, Odila sabe" es una
sugerencia; "Odila te espera" es un hecho inventado.

LOS MOTIVOS TAMPOCO SE INVENTAN
Por qué alguien hizo algo, qué sintió, qué pensó antes, qué le debe a quién y
qué todavía no haría: nada de eso pasó salvo que un hecho lo diga. Una deuda
inventada es tan grave como una muerte inventada y se nota mucho menos. Y una
negación también es una afirmación: "nadie más sabe eso", "todavía no está lista
para enseñarte" y "eso no estaba al alcance de nadie" son hechos, y los tienes
que poder señalar en la lista o no van.

LO QUE SE PIERDE CON ALGUIEN TIENE SU PROPIO HECHO
"No queda nadie que lo sepa", "con ella se fue el oficio", "era la única que
sabía eso", "ya no hay quién lo enseñe". Es lo más grave que se puede decir de
este valle y es lo único que no se deduce nunca: no sale de una muerte, ni de
que alguien no haya vuelto, ni de que a otro se le haya trabado lo que
necesitaba. Hay un hecho que lo dice, y dice las dos cosas juntas —de quién y
qué saber—: ése es el único que te autoriza. Si no está en la lista, alguien
murió o no volvió y nada más. Tampoco lo insinúes de costado: "se llevó consigo
lo que sabía", "con ella se cerró la fragua", "el valle perdió gente que sabía"
son la misma afirmación dicha en voz baja.

Cuando el hecho está, no lo estires: nombra ese saber y esa persona, no "todo
lo demás que sabía" ni su oficio entero. Y mira la lista antes de dar algo por
perdido: si un hecho dice que esa misma persona le enseñó eso a alguien, ese
alguien lo sabe y no se perdió nada.

Aparte están los hechos que cuentan que a alguien se le trabó lo suyo porque ya
no queda quien sepa lo que necesitaba. Eso es cierto y es todo lo que dicen: no
dicen quién lo sabía antes, ni que esa persona se haya muerto, ni que sea la
muerta que tienes más a mano. Cuéntalo sin ponerle nombre a nadie.

EL BLOQUE FICHERO NO SE NARRA
Es un índice: quién es quién, qué oficio tiene, dónde vive, qué sabe, qué anda
queriendo. Está para que entiendas los hechos y para que sepas a quién sugerir.
Nada de ahí sucedió. Lo que alguien quiere no es algo que hizo. Si tu crónica se
puede leer como un repaso de la gente del valle, la escribiste desde el fichero
y está mal: tiene que leerse como lo que le pasó al mundo estos días.

El índice es además la lista completa de a quién puedes mandar. Si alguien sale
en un hecho y no está en el índice, cuenta lo que hizo en ese hecho y nada más:
no lo sugieras, no digas dónde está ahora y no expliques por qué no está en la
lista. Que le falte la ficha no es noticia y no significa que se haya ido, ni
que haya muerto, ni que se haya perdido nada con él: no lo puedes saber.

LOS HECHOS VIENEN MAL ESCRITOS Y ES ASÍ
Los redacta la máquina, en seco y a veces torcidos. No los copies literal:
cuéntalos con tus palabras. Si un hecho es ambiguo sobre quién le hizo qué a
quién, quédate con la lectura más pequeña o no lo cuentes. Si algo suena a que
alguien murió y no es un hecho de muerte, no murió nadie. Y las etiquetas [h1],
[h2]… se citan en la lista de ids, nunca dentro del texto.

NUNCA uses el vocabulario del sistema. El jugador no sabe que existen los ticks,
los porcentajes, las agendas ni los estados internos. Palabras prohibidas: tick,
progreso, porcentaje, estado, agenda, evento. Se dice "hace unos días", no
"hace tres ticks". Tampoco "jugador": los demás del valle son gente.

Y no le digas al jugador qué tan cerca está alguien de conseguir algo, ni cuánto
lo quiere o lo teme. Eso no lo puede saber salvo que alguien se lo cuente o que
esté en un hecho. Puedes decir que Marta anda marcando sendas; no que le falta
poco. Puedes contar que Ilde salió a defenderlo si hay un hecho que lo diga; no
que Ilde lo tiene en alta estima. Tampoco "ya casi", "le falta poco" ni "está
cerca" para que alguien enseñe o confíe: o hay un hecho que lo dice, o no se
dice.

No enumeres a la gente del valle uno por uno — eso es una planilla con prosa. Lo
que más planilla hace son los avances de cada uno con lo suyo —que juntó carbón,
que avanzó, que se le trabó—: llega un renglón por persona por día y son ciertos,
pero contarlos uno por uno es la planilla otra vez, sólo que respaldada. De todo
ese montón elige uno, el que le cambie algo al que lee, y saltea el resto.
Pero tampoco te quedes corto: si hay muchos hechos, elige los cinco o seis que
más le cambian algo al jugador y cuéntalos con detalle. Un valle donde pasaron
quince cosas y le cuentas tres se siente vacío sin serlo. Cuando varios hechos
son el mismo hecho repetido —la misma charla, el mismo avance—, cuéntalo una vez
sola pero cita todos los que resumiste. Y una cadena de cosas que le pasaron a
una misma persona vale más que cinco hechos sueltos: no te comas un arco entero.

Prioriza, en este orden: muertes y saberes perdidos; lo que le pasó al que lee
o a su nombre; enseñanzas y oficios nuevos; conflictos entre personas; el resto;
y último de todo, siempre, la gente adelantando sus propios asuntos.

EL TIEMPO NO SE APLANA
Cada hecho viene con cuánto hace que pasó y esa parte es tan cierta como el
resto. Si estuvo mucho afuera, los hechos van a ir de hace meses a anteayer:
lo viejo se cuenta como lo que ya pasó y quedó, lo de estos días como lo que
está pasando. Aplanar los dos en el mismo presente es mentirle sobre en qué
mundo se está despertando, y es el error que más caro le sale — sale de acá
que lo mandes a buscar a alguien que se murió hace cuatro meses.

Lo que le sugieras al final es sobre hoy, no sobre el valle que dejó. Y si
estuvo mucho tiempo afuera, no termines la crónica en el pasado: lo último que
lea tiene que ser cómo están las cosas ahora.

Escribe en segunda persona, tuteando, de uno a tres párrafos cortos.

EL IDIOMA DEL MUNDO. Castellano llano con peso. Ni voseo ni "acá": es "tú",
"mira", "aquí". El error que más se te escapa no es escribir la crónica entera
en voseo: es escribirla bien y meter un "vos" o un "querés" suelto en la mitad,
y entonces se lee como escrita por dos personas. Antes de terminar, releela
buscando ese único deslizamiento. Nada de arcaísmo de disfraz —ni "vos sois", ni "he menester",
ni juramentos de teatro— y nada de palabras de hoy. Concreto antes que
grandilocuente: "el fuego está bajo" vale más que "las brasas agonizan en el
hogar". La crónica es la voz del mundo y tiene que sonar como la gente que
aparece en ella.
Empieza por lo que más le importa al jugador. Si alguien murió llevándose un
saber, eso va primero. Si de los hechos sale algo concreto que le convenga
mirar, cierra con eso; si no sale, termina y ya. Rellenar es peor que ser breve.`

const SCHEMA = {
  type: 'object',
  properties: {
    text: {
      type: 'string',
      description: 'La crónica para el jugador. De uno a tres párrafos cortos.',
    },
    used_event_ids: {
      type: 'array',
      items: { type: 'string' },
      description: 'Etiquetas de HECHOS que respaldan lo que narraste (h1, h2, …). Sólo de la lista dada.',
    },
  },
  required: ['text', 'used_event_ids'],
  additionalProperties: false,
} as const

export type Cronica = {
  text: string; leidos: number; usados: number; inventados: string[]
  /**
   * Gente nombrada en la crónica que no aparece en ningún hecho de la ventana.
   * No es lo mismo que `inventados` —que son ids que no existen— y es el
   * agujero que ese chequeo no ve: el director puede citar ids válidos y
   * poblar la escena con testigos que nadie puso ahí. Es una señal, no un
   * error: sugerir a alguien en condicional es legítimo. Un número que sube
   * crónica tras crónica, no.
   */
  sinRespaldo: string[]
  /** Si hubo que rehacerla porque salió con voseo. Es la señal de cuánto se
   *  le escapa el registro al modelo, y sube el costo de esa crónica al
   *  doble: cuando este número crezca, el que hay que tocar es el SYSTEM. */
  rehechaPorRegistro: boolean
  /**
   * Cuántos días del valle atrás quedó el hecho más nuevo que entró al prompt.
   * Es la medida de si la crónica aterriza en el presente: con el corte viejo
   * —los sesenta más viejos— un jugador que volvía después de 140 días recibía
   * una crónica con 94 días de atraso, y las sugerencias del final se leen
   * siempre como "ahora". Si este número crece con la ausencia, la ventana se
   * volvió a romper.
   */
  atrasoDias: number
  /**
   * Cuántas piezas del pasado se le ofrecieron al director y cuántas usó.
   *
   * Están separadas de `leidos`/`usados` a propósito: son la única señal que
   * dice si el rasgo está haciendo algo o está pagando tokens al vacío. Y la
   * que hay que mirar es la segunda dividida por la primera — si `enPrompt`
   * sube y `usadas` se queda en cero, el pasado no viene al caso y hay que
   * apretar el filtro de lugares, no aflojar el prompt.
   */
  pasadoEnPrompt: number
  pasadoUsado: number
  model: string; inTokens: number; outTokens: number; costUsd: number
}

export type Opciones = {
  model?: string
  effort?: 'low' | 'medium' | 'high'
  /** No escribe la crónica ni mueve al jugador. Para comparar modelos. */
  dryRun?: boolean
}

/** Cuánto hace, en días del valle, sin decir la palabra prohibida. */
function hace(dias: number): string {
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  return `hace ${dias} días`
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Nombre suelto, con bordes de palabra: "Ren" sí, "arrendar" no. */
function nombrado(nombre: string, texto: string): boolean {
  const corto = nombre.includes(' ') ? nombre.split(' ').pop()! : nombre
  if (corto.length < 3) return false
  return new RegExp(`(^|[^\\p{L}])${escapar(corto)}([^\\p{L}]|$)`, 'iu').test(texto)
}

// ═══════════════════════════════════════════════════════════════════════════
// LA LLEGADA
// ═══════════════════════════════════════════════════════════════════════════
//
// La primera crónica de alguien que nunca jugó. Hasta hoy era `NADA_QUE_CONTAR`
// —«el valle siguió en lo suyo, no pasó nada que valga la pena contarte»— y no
// por un descuido, sino porque **la ventana del director empieza en
// `last_seen_tick` y a un jugador nuevo se lo crea con `last_seen_tick =
// region.tick`**: su propia llegada queda del lado de afuera por un tick. El
// que entraba por primera vez leía que no había pasado nada, o —peor— una
// crónica de cosas que le pasaron a otros.
//
// La referencia la puso la dirección del proyecto y es exacta: **la carta del
// abuelo de Stardew Valley, la nave rota de No Man's Sky.** Los dos hacen lo
// mismo y no cuesta un motor: el mundo te dice qué es mostrándotelo, con UNA
// tarea chiquita adelante. Ninguno te sienta a leer, y ninguno te pone un signo
// de admiración flotando sobre una cabeza.
//
// Y las tres piezas ya estaban pagas en la base, sin usar:
//
//   · **La carta del abuelo** es un objeto tirado en el suelo. `objects`
//     arrastra `made_by` desde el primer día y desde ayer acepta
//     `holder_kind = 'place'`: una hoja templada en Vado Bajo que dice «la hizo
//     Ilde» cuando Ilde tiene su `muerte` en `events` es la carta, y no se la
//     escribió nadie — la dejó ahí la simulación.
//   · **La nave rota** es el Camino del Norte. Por ahí entró, y el `llegada`
//     que `web.ts` escribe al crearlo lo dice con todas las letras.
//   · **El mundo que ya estaba** es el pasado del autor: `events` con tick
//     negativo, con las dos versiones del incendio.
//
// Los invariantes no se mueven ni un milímetro y conviene decir cuáles, porque
// ésta es la crónica que más tentación tiene de romperlos:
//
//   · **No escribe estado del mundo.** Lee `objects`, `people` y `events`;
//     escribe la crónica y mueve el cursor del jugador, que es lo mismo que ya
//     hacía `narrate()`. No suelta objetos, no crea encargos, no marca nada.
//   · **No afirma nada que no esté en la base.** El pasado son filas de
//     `events`. La cosa que tiene delante sale de `objects` y de un `muerte`
//     de `events`, y se cita como cualquier otro hecho.
//   · **No promete nada.** Es el invariante 3 visto desde el otro lado: nadie
//     le debe nada al que acaba de llegar, y el mundo no le va a pagar por ir
//     a mirar una hoja tirada.

/**
 * Dónde crece cada cosa, por TIPO de lugar.
 *
 * ⚠ **Es una copia parcial de `LO_QUE_DA_EL_LUGAR` de `tick.ts` y puede
 * desincronizarse.** Se copió y no se importó porque importar `tick.ts` desde
 * acá obligaría a exportar de un archivo que esta rama no toca, y porque lo
 * único que se pierde si esta lista envejece es una frase de la llegada: si un
 * `kind` no está acá, la rama se cae al escalón siguiente y no miente. Nunca se
 * usa para decidir qué sale de buscar — eso lo sigue sorteando el tick.
 */
/** Cuántos días tiene que llevar tirada una cosa para que valga como hallazgo.
 *  Menos que esto es basura reciente, casi siempre de otro jugador que pasó por
 *  ahí. No se le aplica a lo que hizo alguien que ya se murió: eso vale desde
 *  el primer día. */
const DIAS_TIRADO = 3

/** «hay hoja templada» no se dice. Bastaba con esto y faltaba. */
const FEMENINAS = new Set(['raíz', 'piedra', 'rama', 'hierba', 'caña', 'hoja', 'ceniza'])
function esFemenina(kind: string): boolean {
  const primera = kind.split(' ')[0]!.toLowerCase()
  return FEMENINAS.has(primera) || primera.endsWith('a')
}
function unA(kind: string): string {
  return (esFemenina(kind) ? 'una ' : 'un ') + kind
}
/** El pronombre que le corresponde: «la hizo Ilde», no «lo hizo Ilde». */
function loLa(kind: string): string {
  return esFemenina(kind) ? 'la' : 'lo'
}

const DONDE_CRECE: Record<string, string> = {
  'raíz del Sotobosque': 'bosque', 'rama de roble': 'bosque', 'hongo de tronco': 'bosque',
  'carbón': 'ruina', 'hierro viejo': 'ruina', 'ceniza': 'ruina',
  'piedra de afilar': 'camino', 'hierba del borde': 'camino',
  'caña de la orilla': 'aldea', 'lino en rama': 'aldea',
}

/**
 * La única cosa que el recién llegado tiene delante, y los hechos que la
 * respaldan. Los hechos van al bloque HECHOS con su etiqueta —no embebidos en
 * el texto— para que el director los pueda citar como cualquier otro y queden
 * guardados en `chronicles.source_events`.
 */
type Cosa = { texto: string; hechos: { id: string; kind: string; tick: number; summary: string }[] }

/**
 * Elige UNA cosa que el que acaba de llegar puede ir a hacer ahora mismo.
 *
 * **Una, y sale del estado del mundo.** Es la mitad del encargo: si fuera un
 * guión escrito a mano, el segundo jugador leería lo mismo que el primero y el
 * valle dejaría de ser un valle. Y si fueran tres, sería una lista de tareas —
 * que es exactamente lo que §8.2b prohíbe.
 *
 * **Y tiene que ser algo que pueda hacer YA, con las manos y sin permiso de
 * nadie.** Ésta es la corrección de §8.1 y le cambia el piso a la escalera: hay
 * dos niveles y el saber escaso es sólo el de arriba. Lo corriente —andar,
 * juntar lo que crece, levantar lo que hay tirado— **no lo enseña nadie y lo
 * puede todo el mundo**, y no tiene fila en `knows`. Lo escaso —la magia, los
 * oficios de verdad— vive en una persona y se muere con ella.
 *
 * Por eso **el último escalón ya no es «alguien que enseña»**, y no fue un
 * cambio de gusto: terminar la primera crónica mandándolo a buscar un maestro
 * es *"no sabes hacer nada, busca a alguien que te enseñe"*, o sea **una
 * carencia disfrazada de comienzo**. Stardew no te dice que no sabes cultivar:
 * te da el azadón. La escasez llega después, cuando quieras lo que no se junta
 * del suelo.
 *
 * La escalera, ordenada por cuánto mundo cuenta cada escalón:
 *
 *  1. **Una cosa tirada que hizo alguien que ya no está.** Es el escalón que
 *     vale por dos, porque **enseña las dos mitades del juego en un solo
 *     objeto**: la puede levantar el primer minuto —eso es lo corriente— y no
 *     va a poder hacer otra igual nunca —eso es lo escaso—. Y no la escribió
 *     nadie: la dejó ahí la simulación. Trae además los hechos que la
 *     respaldan, la muerte y el saber que se fue con esa persona.
 *  2. **Una cosa tirada, cualquiera.** Sigue teniendo autor y sigue teniendo a
 *     quien la dejó ahí, que son dos personas distintas.
 *  3. **Algo que crece en un sitio y lo junta cualquiera.** El escalón que
 *     nunca falla, porque todo lugar da algo. Si además hay alguien a quien le
 *     falta justo eso, se lo dice — pero lo que puede hacer no depende de esa
 *     persona.
 */
export function unaCosaQueHacer(
  suelo: { id: string; kind: string; made_by: string | null; left_by: string | null
    left_tick: number | null; holder_id: string | null }[],
  // `muerte` y `perdida_de_saber`, los dos juntos y en la misma lista. El
  // segundo es la tesis del juego dicha por el mundo —«con Ilde se fue el
  // Temple de río, no queda nadie que lo sepa»— y es **la afirmación más cara
  // del juego**: el prompt normal la prohíbe salvo que el hecho esté, así que
  // acá se la trae. Sin ella el modelo la deduce igual y se equivoca: en la
  // primera corrida escribió «un saber que se murió con ella» sin ningún hecho
  // que lo dijera.
  muertes: { id: string; kind: string; tick: number; detail: unknown; summary: string }[],
  gente: { id: string; name: string; trade: string; place_id: string | null
    alive: boolean }[],
  agendas: { person_id: string; goal: string; needs_object: string | null }[],
  lugares: { id: string; name: string; kind: string }[],
  tick: number,
): Cosa | null {
  const lugar = (id: string | null | undefined) => lugares.find((l) => l.id === id)
  const de = (m: { detail: unknown }) => (m.detail as { person?: string } | null) ?? {}
  const muerteDe = (nombre: string) =>
    muertes.filter((m) => de(m).person === nombre)

  // 1 y 2 — el suelo. Se prefiere lo que lleva más tiempo tirado: una cosa que
  // quedó ahí ayer es basura, y una que lleva un mes es una historia.
  //
  // Y por eso mismo hay un piso de días para todo lo que no tenga un muerto
  // detrás. Medido contra producción: el único objeto en el suelo del valle
  // real era «un lino en rama que dejó Prueba3D hoy», o sea otro jugador
  // soltando algo dos metros más allá, y la intro terminaba en eso. Un mes
  // tirado es una historia; hoy es basura y encima con el nombre de un
  // desconocido puesto. El escalón de lo que crece es mejor que eso.
  const tirado = [...suelo].sort((a, b) => (a.left_tick ?? 0) - (b.left_tick ?? 0))
  const conMuerto = tirado.find((o) => o.made_by && muerteDe(o.made_by).length > 0)
  const viejo = tirado.filter((o) => o.left_tick == null || tick - o.left_tick >= DIAS_TIRADO)
  const elegido = conMuerto ?? viejo.find((o) => o.made_by) ?? viejo[0]
  if (elegido) {
    const donde = lugar(elegido.holder_id)?.name ?? 'el valle'
    const dias = elegido.left_tick == null ? null : Math.max(0, tick - elegido.left_tick)
    const partes = [`En ${donde} hay ${unA(elegido.kind)} en el suelo`]
    if (dias !== null) partes.push(dias === 0 ? 'desde hoy' : `desde hace ${dias} días`)
    partes.push('.')
    let texto = partes.join(' ').replace(' .', '.')
    const hechos: { id: string; kind: string; tick: number; summary: string }[] = []
    if (elegido.made_by) {
      texto += ` ${loLa(elegido.kind) === 'la' ? 'La' : 'Lo'} hizo ${elegido.made_by}.`
      // Que el que lo hizo esté muerto NO se afirma de `people.alive`: se cita
      // el hecho `muerte`, que es lo que autoriza a decirlo. Si el hecho no
      // está, el autor simplemente no se menciona como muerto y la frase sigue
      // siendo verdad.
      for (const m of muerteDe(elegido.made_by)) {
        hechos.push({ id: m.id, kind: m.kind, tick: m.tick, summary: m.summary })
      }
    }
    if (elegido.left_by && elegido.left_by !== elegido.made_by) {
      texto += ` ${loLa(elegido.kind) === 'la' ? 'La' : 'Lo'} dejó ahí ${elegido.left_by}.`
    }
    return { texto, hechos }
  }

  // 3 — lo que crece en un sitio y lo junta cualquiera. **Es el escalón que
  // nunca falla**: todo lugar del valle da algo, así que siempre hay una cosa
  // que el que llegó puede ir a hacer hoy sin pedirle permiso a nadie.
  //
  // Si además hay alguien a quien le falta justo eso, se lo dice — pero en ese
  // orden y no al revés: lo que puede hacer no depende de esa persona, y el
  // día que esa persona se muera lo va a seguir pudiendo hacer igual.
  //
  // El escalón que había acá antes —«fulano enseña, ve a verlo»— se sacó a
  // propósito. Ver la nota de arriba: mandar al recién llegado a buscar un
  // maestro es contarle el juego por el lado de lo que no puede.
  const conNecesidad = agendas.find((a) => {
    if (!a.needs_object || !DONDE_CRECE[a.needs_object]) return false
    return gente.some((p) => p.id === a.person_id && p.alive)
  })
  if (conNecesidad?.needs_object) {
    const quien = gente.find((p) => p.id === conNecesidad.person_id)!
    const donde = lugares.find((l) => l.kind === DONDE_CRECE[conNecesidad.needs_object!])!
    return {
      texto: `En ${donde.name} crece ${unA(conNecesidad.needs_object)},`
        + ` y ${loLa(conNecesidad.needs_object)} junta cualquiera: no hace falta saber nada`
        + ` para agacharse a recoger${loLa(conNecesidad.needs_object)}.`
        + ` A ${quien.name}, ${quien.trade} de ${lugar(quien.place_id)?.name ?? 'el valle'},`
        + ` le falta justo eso.`,
      hechos: [],
    }
  }
  const cualquiera = lugares.find((l) => Object.values(DONDE_CRECE).includes(l.kind))
  if (cualquiera) {
    const que = Object.keys(DONDE_CRECE).find((k) => DONDE_CRECE[k] === cualquiera.kind)!
    return {
      texto: `En ${cualquiera.name} crece ${unA(que)}, y ${loLa(que)} junta cualquiera:`
        + ` no hace falta saber nada para agacharse a recoger${loLa(que)}.`,
      hechos: [],
    }
  }
  return null
}

const SYSTEM_LLEGADA = `Eres la voz de un valle de fantasía. Alguien acaba de
entrar en él por primera vez, y le estás contando dónde se ha metido.

QUÉ ES ESTO Y QUÉ NO
No es un resumen de noticias: todavía no le ha pasado nada. Es lo primero que
lee de este mundo, y tiene que dejarle tres cosas y ninguna más:

1. Quién es y cómo llegó. Entró por el Camino del Norte, que es por donde se
   entra a este valle. Aquí ya había gente y él acaba de bajar: eso es todo lo
   que hay que decir de él.
2. Dónde está. Un valle que estaba aquí antes que él, con gente que ya se
   conoce entre sí y con cosas viejas sin arreglar.
3. UNA cosa que puede ir a hacer ahora mismo. Una. No tres, no una lista, no
   "también podrías". Es lo último que lee y es con lo que cierras.

LO QUE PUEDE HACER Y LO QUE NO. NO LO CUENTES POR EL LADO DE LO QUE NO.
Andar, mirar, agacharse a recoger lo que crece, levantar lo que hay tirado,
entrar donde se pueda entrar: todo eso lo puede hacer desde hoy y no se lo
enseña nadie. Los oficios son otra cosa —forjar, destilar, las runas— y ésos
viven en una persona y se mueren con ella.

Así que **nunca** escribas que no sabe hacer nada, ni que le falta todo, ni que
está desarmado, ni que necesita que alguien le enseñe antes de poder empezar.
Es falso y además es la peor manera de abrir. Y **no cierres mandándolo a
buscar un maestro**: la cosa con la que terminas es algo que puede hacer con
las manos hoy mismo.

Y esa lista de lo que puede hacer es PARA TI, no para él: no se la enumeres.
"Andar donde quieras, juntar lo que crece, levantar lo que hay tirado" devuelto
tal cual es un tutorial con otra letra. Se muestra con una sola cosa concreta —
la que viene abajo— y con ninguna más.

Lo que sí es bueno que vea, y en el mismo movimiento, es que hay algo que no va
a poder hacer solo. Una cosa bien hecha tirada en el suelo, con el nombre de
quien la hizo, y esa persona muerta: eso le enseña las dos mitades del valle sin
una sola explicación. La puede levantar hoy; otra igual no la va a poder hacer
nunca.

LA REGLA QUE NO SE ROMPE
Sólo existe lo que está en los bloques de abajo. No añadas gente, ni sucesos, ni
sitios, ni motivos. Si una persona no aparece en ningún bloque, no la nombres.
Si algo no está escrito ahí, no pasó y no está.

Y no le prometas nada. Nadie le debe nada al que acaba de llegar: ni pago, ni
recompensa, ni que alguien lo espere, ni que le vayan a enseñar si hace tal
cosa. Puedes decir que alguien sabe algo; no puedes decir que se lo va a
enseñar. Tampoco le anuncies lo que va a pasar: eso no lo sabe nadie.

EL BLOQUE DE LA GENTE NO SE NARRA
Es un índice: quién vive aquí, de qué, dónde. Está para que sepas de quién
hablas. No lo recites, no lo enumeres y no lo repartas en un párrafo.

La regla, que es un número para que no haya discusión: **en toda la crónica
puedes nombrar como mucho a dos personas del valle**, y tienen que ser las que
hagan falta para lo que estás contando. "Corvín y Anse trabajan en lo suyo,
Odila destila raíces" es el índice recitado y está mal aunque sea cierto.

LO VIEJO ES EL FONDO, NO LA CLASE DE HISTORIA
El bloque de lo viejo es de hace muchísimo. Elige una pieza, dos como mucho, y
cuéntalas en media frase cada una, metidas donde vengan a cuento. Lo marcado
SE DICE no lo afirmas tú: se lo atribuyes a quien lo cuenta —"cuentan en el
vado que…"— y ahí se queda. Puede haber dos versiones de lo mismo y el valle no
lo tiene resuelto: tú tampoco lo resuelves, no te pones de ningún lado y no
avisas de que hay otra versión. El número de inviernos es el que está escrito:
ni lo redondees ni lo cambies.

LA COSA QUE TIENE DELANTE
Viene escrita abajo y es verdad: está en el mundo ahora mismo. Cuéntala como lo
que es —una cosa tirada, alguien a quien le falta algo— y déjalo ahí. No le
digas que vaya, no le digas para qué le va a servir, no le inventes un dueño ni
un motivo por el que quedó así, y no le pongas un misterio encima: si el bloque
no dice por qué está ahí, es que no hay por qué.

Los sitios son los que están escritos, uno por uno. Si alguien vive en un sitio
y la cosa está en otro, son dos sitios distintos y no los juntas: "Odila, que
destila allí" cuando Odila vive en el vado y la raíz crece en el bosque es un
sitio cambiado, y un sitio cambiado manda al que lee al lugar equivocado.

Y con eso terminas. La última frase es la cosa, no una orden: se acaba en
"…y sigue ahí", no en "ve a mirarla" ni en "mira al suelo". Nada de decirle qué
hacer con las manos.

LO QUE SE PIERDE CON ALGUIEN TIENE SU PROPIO HECHO
"No queda nadie que lo sepa", "con ella se fue el oficio", "era la única que
sabía eso". Es lo más grave que se puede decir de este valle y es lo único que
no se deduce nunca: no sale de que alguien se haya muerto. Hay un hecho que lo
dice, y dice las dos cosas juntas —de quién y qué saber—: ése es el único que
te autoriza, y si está, cuéntalo, porque es lo que hay que entender de este
sitio. Si no está, alguien murió y nada más. Tampoco de costado: "se llevó
consigo lo que sabía", "con ella se cerró la fragua" son la misma afirmación
dicha en voz baja. Y un hecho de muerte dice quién murió y dónde: nunca de qué,
así que de qué murió no se cuenta ni se insinúa.

CÓMO NO SE ESCRIBE
Nunca uses las palabras del sistema ni las de otro juego: misión, tarea,
objetivo, encargo, recompensa, nivel, punto, progreso, estado, tick, evento,
jugador. Y nada de "tu primera tarea es", "tu objetivo", "para empezar",
"lo primero que deberías hacer". Esto se cuenta, no se asigna.

EL IDIOMA DEL MUNDO
Castellano llano con peso. Ni voseo ni "acá": es "tú", "mira", "aquí". El error
que más se escapa no es escribirlo entero en voseo: es escribirlo bien y meter
un "vos" o un "querés" suelto en la mitad. Nada de arcaísmo de disfraz y nada de
palabras de hoy. Concreto antes que grandilocuente: "el fuego está bajo" vale
más que "las brasas agonizan en el hogar".

Segunda persona, tuteando. **Dos o tres párrafos cortos, nunca uno solo**: un
bloque de doce renglones no se lee, y esto es lo primero que lee del mundo. El
primero es dónde está. El último termina en la cosa que tiene delante, y es el
más corto de todos. Rellenar es peor que ser breve.`

/**
 * La primera crónica de un jugador que nunca jugó.
 *
 * Se llama en vez de `narrate()` cuando el jugador no tiene ni una crónica.
 * Devuelve el mismo `Cronica` —mismas auditorías, mismo colador de registro,
 * mismo costo medido— para que todo lo que ya mide crónicas siga midiendo.
 */
async function laLlegada(
  region: { id: string; name: string; tick: number },
  player: { id: string; name: string; place_id: string | null; last_seen_tick: number },
  opts: { model: string; effort: 'low' | 'medium' | 'high'; dryRun: boolean },
): Promise<Cronica> {
  // **La llegada no usa `DIRECTOR_MODEL` y es a propósito.** Es UNA llamada en
  // la vida de un jugador y es el único texto del juego que todos leen y que
  // nadie puede saltear; lo demás de este archivo corre cientos de veces y por
  // eso se abarata. Medido sobre el mismo prompt y el mismo valle:
  //
  //     haiku-4-5   USD 0,0052 — «hace poco murió Ilde» (fueron 191 días), y
  //                              devuelve la lista de lo que puede hacer como
  //                              si fuera un tutorial
  //     sonnet-5    USD 0,0209 — bien; sigue enumerando un poco
  //     opus-5      USD 0,0328 — usa el pasado atribuido a quien lo cuenta,
  //                              respeta el número, no enumera nada
  //
  // Tres centavos una vez por jugador contra el primer párrafo que lee del
  // mundo. `LLEGADA_MODEL` está para poder medir de nuevo, no para ahorrar.
  const modelo = process.env.LLEGADA_MODEL ?? 'claude-opus-5'
  const [places, people, agendas, sabe, viejo, suelo, entrada, muertes] = await Promise.all([
    db.from('places').select('id, name, kind').eq('region_id', region.id),
    db.from('people').select('id, name, trade, place_id, teaches, alive')
      .eq('region_id', region.id),
    db.from('agendas').select('person_id, goal, state, needs_object')
      .in('state', ['activa', 'bloqueada']),
    db.from('knows').select('holder_kind, holder_id, knowledge:knowledge_id (name)'),
    db.from('events').select('id, summary, place_id, detail')
      .eq('region_id', region.id).eq('kind', 'pasado').lt('tick', 0)
      .order('tick', { ascending: true }),
    // El suelo del valle. `holder_kind = 'place'` es lo que está tirado y lo
    // levanta cualquiera que pase.
    db.from('objects').select('id, kind, made_by, left_by, left_tick, holder_id')
      .eq('region_id', region.id).eq('holder_kind', 'place'),
    // Su propia llegada, que es el hecho que respalda «entraste por el norte».
    // Queda fuera de la ventana de `narrate()` por un tick —el jugador se crea
    // con `last_seen_tick = region.tick`— y es justamente por eso que la
    // primera crónica no tenía nada que contar.
    db.from('events').select('id, tick, summary, place_id')
      .eq('region_id', region.id).eq('kind', 'llegada')
      .eq('detail->>player', player.name)
      .order('tick', { ascending: true }).limit(1).maybeSingle(),
    db.from('events').select('id, kind, tick, summary, detail')
      .eq('region_id', region.id).in('kind', ['muerte', 'perdida_de_saber']),
  ])

  const lugares = (places.data ?? []) as { id: string; name: string; kind: string }[]
  const placeName = (id: string | null | undefined) =>
    lugares.find((p) => p.id === id)?.name ?? '—'
  const knowsOf = (kind: string, id: string) =>
    (sabe.data ?? [])
      .filter((k) => k.holder_kind === kind && k.holder_id === id)
      .map((k) => (k.knowledge as unknown as { name: string } | null)?.name)
      .filter(Boolean) as string[]
  const vivos = (people.data ?? []).filter((p) => p.alive)

  // ── Lo viejo ──────────────────────────────────────────────
  //
  // Mismos dos filtros duros que la crónica normal y por los mismos motivos:
  // nada de `se_calla` —lo que en el valle nadie cuenta, el narrador tampoco, y
  // es la única pieza cuyo valor es la ausencia— y una por lugar, que es lo que
  // impide sin saber nada del contenido que las DOS versiones del incendio
  // entren juntas. Lo que NO se filtra acá es por lugar de la ventana: no hay
  // ventana, el jugador acaba de entrar, y lo viejo es todo lo que hay.
  type Pieza = {
    id: string; summary: string; place_id: string | null
    detail: { epoca?: string; hace_inviernos?: number; certeza?: string; quien_lo_cuenta?: string } | null
  }
  const pasado: Pieza[] = []
  {
    const usados = new Set<string>()
    for (const p of (viejo.data ?? []) as Pieza[]) {
      if (pasado.length >= TOPE_PASADO_LLEGADA) break
      if (p.detail?.certeza === 'se_calla') continue
      if (p.place_id && usados.has(p.place_id)) continue
      if (p.place_id) usados.add(p.place_id)
      pasado.push(p)
    }
  }

  const cosa = unaCosaQueHacer(
    (suelo.data ?? []) as never,
    (muertes.data ?? []) as never,
    (people.data ?? []) as never,
    (agendas.data ?? []) as never,
    lugares,
    region.tick,
  )

  // El mapa de etiquetas es el mismo mecanismo que en `narrate()`: el director
  // cita `p1`, `h1`… y acá se traduce a los uuids que van a `source_events`.
  const etiqueta = new Map<string, string>()
  pasado.forEach((p, i) => etiqueta.set(`p${i + 1}`, p.id))
  const hechos: string[] = []
  const anotarHecho = (id: string, kind: string, summary: string, cuando: string) => {
    const et = `h${hechos.length + 1}`
    etiqueta.set(et, id)
    // Las notas ⟨⟩ son las mismas de la crónica normal y por el mismo motivo:
    // el hecho `muerte` dice quién murió y dónde, nunca de qué, y ese hueco es
    // el que el modelo rellena con lo primero que tenga a mano.
    const hueco = HUECOS[kind] ? ` ⟨${HUECOS[kind]}⟩` : ''
    hechos.push(`[${et}] ${cuando} · ${summary}${hueco}`)
  }
  if (entrada.data) anotarHecho(entrada.data.id, 'llegada', entrada.data.summary, 'hoy')
  // Sin el «hace tanto», el modelo lo pone él: la primera corrida escribió
  // «hace poco murió Ilde» sobre una muerte de hace ciento noventa días.
  for (const h of cosa?.hechos ?? []) {
    anotarHecho(h.id, h.kind, h.summary, hace(region.tick - h.tick))
  }

  const bloqueViejo = pasado.length === 0 ? '' : '\n\nLO VIEJO DE ESTE VALLE (de hace muchísimo; es el fondo)\n'
    + 'Elige UNA, dos como mucho. No las metas todas: tres piezas de hace un\n'
    + 'siglo seguidas son una clase de historia y no una llegada.\n'
    + pasado.map((p, i) => {
      const d = p.detail ?? {}
      const cuando = [
        d.epoca,
        d.hace_inviernos && !(d.epoca ?? '').toLowerCase().includes('invierno')
          ? `hace ${d.hace_inviernos} inviernos` : null,
      ].filter(Boolean).join(', ')
      const como = d.certeza === 'sabido'
        ? 'SABIDO'
        : `SE DICE, lo cuentan ${d.quien_lo_cuenta ?? 'algunos'}`
      return `[p${i + 1}] ${cuando} · ${placeName(p.place_id)} · ${como} — ${p.summary}`
    }).join('\n')

  const sabeYa = knowsOf('player', player.id)
  const prompt = [
    'QUIÉN ES',
    `${player.name}. Acaba de entrar al valle de ${region.name} por El Camino del Norte,`
    + ` que es por donde se entra. Ahora mismo está en ${placeName(player.place_id)}.`
    // **Esta línea decía «no sabe hacer nada de lo de aquí» y era el error
    // entero de la intro**: una carencia disfrazada de comienzo. Lo corriente
    // —andar, juntar lo que crece, levantar lo que hay tirado— no lo enseña
    // nadie y lo puede desde hoy; lo que le falta es un oficio, que es otra
    // cosa y llega después.
    + ' Andar el valle, juntar lo que crece y levantar lo que hay tirado lo puede'
    + ' hacer desde hoy: eso no lo enseña nadie y no le hace falta permiso de'
    + ' nadie.'
    + (sabeYa.length
      ? ` De oficio sabe: ${sabeYa.join(', ')}.`
      : ' Lo que no tiene todavía es un oficio de los de aquí.'),
    hechos.length ? '\nHECHOS (lo suyo, y lo puedes citar)\n' + hechos.join('\n') : '',
    bloqueViejo,
    '',
    'QUIÉN VIVE AQUÍ (índice; no lo recites, nada de esto sucedió)',
    ...vivos.map((p) => {
      const suyas = (agendas.data ?? []).filter((a) => a.person_id === p.id)
      return [
        `- ${p.name} · ${p.trade} · vive en ${placeName(p.place_id)}`,
        `  sabe: ${knowsOf('person', p.id).join(', ') || 'nada registrado'}`,
        suyas.length
          ? `  anda queriendo (no es algo que hizo): ${suyas.map((a) => a.goal).join(' | ')}`
          : '',
      ].filter(Boolean).join('\n')
    }),
    cosa
      ? '\nLA COSA QUE TIENE DELANTE (una sola, es verdad, y con esto cierras)\n' + cosa.texto
      : '',
    '\nEscribe lo que lee al entrar.',
  ].filter((l) => l !== '').join('\n')

  if (process.env.VER_PROMPT) console.log(`\n───── prompt (llegada) ─────\n${prompt}\n─────`)

  const pedir = (extra: string) => pedirJson<{
    text: string; used_event_ids: string[]
  }>({
    modelo, esfuerzo: opts.effort, maxTokens: 4000,
    schema: SCHEMA, system: SYSTEM_LLEGADA, prompt: prompt + extra,
  })

  let { datos: intro, inTokens, outTokens, costUsd } = await pedir('')

  // El mismo colador que la crónica normal, con la misma vara importada. Una
  // llegada con voseo es la peor de todas: es literalmente lo primero que el
  // jugador lee del mundo.
  const marcas = marcasDeVoseo(intro.text)
  let rehecha = false
  if (marcas.length > 0) {
    const cuales = [...new Set(marcas.map((s) => s.toLowerCase()))].join('", "')
    console.log(`[director] llegada con registro roto ("${cuales}") — rehaciendo una vez`)
    const otra = await pedir(
      `\n\nRECHAZADA. La versión anterior tenía voseo: "${cuales}". `
      + 'El mundo habla castellano llano: "tú", "mira", "aquí". '
      + 'Escríbela de nuevo entera, sin esas palabras y sin ninguna otra forma '
      + 'de voseo, y sin cambiar nada de lo que dice.',
    )
    inTokens += otra.inTokens; outTokens += otra.outTokens; costUsd += otra.costUsd
    intro = otra.datos
    rehecha = true
  }

  const usados = intro.used_event_ids.map((s) => s.trim())
  const inventados = usados.filter((id) => !etiqueta.has(id))
  const reales = usados.map((id) => etiqueta.get(id)).filter((id): id is string => !!id)

  // El respaldo de los nombres incluye la cosa que tiene delante: si nombra a
  // Ilde porque la hoja del suelo la hizo Ilde, eso está en `objects` y no es
  // un testigo inventado.
  // El índice NO cuenta como respaldo, y es una decisión: si contara, esta
  // señal daría cero siempre y dejaría de medir lo único que hay que vigilar
  // acá — que la llegada se convierta en un repaso de quién vive en el valle.
  // Nombrar a alguien del índice no es mentira; nombrar a cuatro es la
  // planilla, y esto es lo que lo cuenta.
  const enHechos = [
    ...hechos, ...pasado.map((p) => p.summary), cosa?.texto ?? '',
  ].join('\n')
  const sinRespaldo = (people.data ?? [])
    .map((p) => p.name)
    .filter((n) => n.toLowerCase() !== player.name.toLowerCase())
    .filter((n) => nombrado(n, intro.text) && !nombrado(n, enHechos))

  // **La llegada NO mueve `last_seen_tick`, y ésa es la diferencia con una
  // crónica.** Una crónica consume la ventana de noticias porque ES la
  // noticia; la llegada no cuenta ninguna, así que no tiene nada que consumir.
  //
  // Importa para el que ya andaba dando vueltas sin que nadie le hubiera
  // contado nada —hoy hay tres así en producción, uno con once días de valle
  // esperándolo—: lee su llegada y en la siguiente lee sus once días, en vez de
  // perderlos. Y no se repite, porque lo que corta es la crónica escrita y no
  // el cursor: a la segunda vez ya hay una fila en `chronicles`.
  if (!opts.dryRun) {
    await db.from('chronicles').insert({
      player_id: player.id, from_tick: player.last_seen_tick, to_tick: region.tick,
      text: intro.text, source_events: reales,
    })
  }

  return {
    text: intro.text.trim(),
    // `leidos` cuenta lo que se le ofreció: su llegada más lo viejo. **Nunca
    // cero**, y no es cosmética: `web.ts` usa `!c.leidos` para saber que el
    // director se calló y no escribió nada, y muestra el texto como aviso en
    // vez de como crónica. Un valle sin pasado y sin el evento de llegada daría
    // cero con la crónica ya escrita.
    leidos: Math.max(1, hechos.length + pasado.length),
    usados: usados.length,
    inventados, sinRespaldo, rehechaPorRegistro: rehecha, atrasoDias: 0,
    pasadoEnPrompt: pasado.length,
    pasadoUsado: usados.filter((id) => /^p\d+$/.test(id) && etiqueta.has(id)).length,
    model: modelo, inTokens, outTokens, costUsd,
  }
}

export async function narrate(playerName: string, opts: Opciones = {}): Promise<Cronica> {
  const model = opts.model ?? process.env.DIRECTOR_MODEL ?? 'claude-opus-5'
  const effort = opts.effort ?? (process.env.DIRECTOR_EFFORT as 'low' | undefined) ?? 'low'
  const region = await getRegion()

  const { data: player } = await db
    .from('players').select('id, name, place_id, last_seen_tick')
    .eq('region_id', region.id).ilike('name', playerName).maybeSingle()
  if (!player) throw new Error(`No hay ningún jugador llamado "${playerName}".`)

  // ── ¿Es la primera vez? ───────────────────────────────────
  //
  // Se pregunta por crónicas y no por `last_seen_tick`, que para un jugador
  // recién creado vale `region.tick` y no distingue nada. La cuenta es una fila
  // con `head: true`: no trae datos, sólo el número.
  const { count: yaLeContaron } = await db.from('chronicles')
    .select('id', { count: 'exact', head: true }).eq('player_id', player.id)
  if (!yaLeContaron) {
    return await laLlegada(region, player, { model, effort, dryRun: !!opts.dryRun })
  }

  // ── HECHOS: lo único que puede narrar ─────────────────────
  //
  // Se leen muchos más de los que entran al prompt, y a propósito: **elegir
  // qué contar es una decisión narrativa y no se puede tomar en el `.limit()`
  // de una query ordenada por fecha.** Ver «La ventana» más abajo.
  //
  // El orden de lectura es descendente —lo último primero— porque si a alguien
  // lo esperan más hechos que este tope, lo que hay que perder es lo de hace
  // seis meses y no lo de esta semana. Se desempata por `created_at` para que
  // dentro de un mismo día los hechos queden en el orden en que pasaron: la
  // caída antes de la levantada, la pelea antes de la muerte del bicho.
  let events = ((await db
    .from('events')
    .select('id, tick, kind, summary, place_id, detail')
    .eq('region_id', region.id)
    .gt('tick', player.last_seen_tick)
    // Las conversaciones NO entran. Se midió: 111 en cinco días contra 4
    // agendas cumplidas y 1 enseñanza. Con el corte viejo —los 60 más
    // viejos— la ventana del director se llenaba de "fulano habló con
    // mengano" y lo que de verdad pasó quedaba afuera por peso, no por
    // importancia.
    //
    // Y además es lo MENOS narrable que hay: el jugador estuvo ahí, leyó lo
    // que le dijeron, y ya lo sabe. Lo que sale de una charla —que te
    // enseñaron, que te encargaron algo, que te ganaste a alguien— tiene su
    // propio tipo de evento y ése sí entra.
    .neq('kind', 'conversacion')
    .order('tick', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(TOPE_LECTURA)).data ?? []).reverse()

  // ── Sin hechos no hay crónica, y no se llama al modelo ────
  //
  // Es el corte más barato del archivo y el que cierra la fuga más grande.
  // Con la ventana vacía el director no se callaba: vaciaba el fichero de NPCs
  // en prosa y la auditoría daba limpio porque no citaba ningún id. No hay
  // prompt que arregle eso — lo que hay es no preguntar.
  //
  // Tampoco se escribe crónica ni se mueve `last_seen_tick`: una crónica sin
  // hechos no es una crónica, y adelantar la marca sin nada que contar sólo
  // sirve para achicarle la ventana al jugador la próxima vez.
  if (!events.length) {
    return {
      text: NADA_QUE_CONTAR,
      leidos: 0, usados: 0, inventados: [], sinRespaldo: [], atrasoDias: 0,
      // Es una constante escrita a mano en castellano llano: no pasó por el
      // modelo, así que no hay registro que colar.
      rehechaPorRegistro: false,
      // Sin hechos no hay crónica, y el pasado no cambia eso: siete piezas de
      // hace ciento ochenta inviernos no son "algo que pasó mientras no
      // estabas". Si esto alguna vez alcanzara para llamar al modelo, habríamos
      // vuelto a la crónica hecha de contexto que costó dos auditorías.
      pasadoEnPrompt: 0, pasadoUsado: 0,
      model: '(ninguno)', inTokens: 0, outTokens: 0, costUsd: 0,
    }
  }

  // Caminar no es noticia.
  //
  // El cliente 3D reporta en qué lugar estás parado, y cada cambio deja un
  // evento `llegada`. En una sesión de veinte minutos eso son decenas: en la
  // última crónica el director leyó 60 hechos y usó 2, y el párrafo de arriba
  // era un itinerario. Ahogan a todo lo demás por peso, no por importancia.
  //
  // Se colapsan a uno solo, y se lo dice en una línea en vez de enumerarlo.
  // El movimiento propio del jugador es contexto, no suceso — él ya sabe por
  // dónde caminó.
  {
    const de = (e: { detail?: unknown }) => (e.detail ?? {}) as { player?: string; place?: string }
    const propias = events.filter((e) => e.kind === 'llegada' && de(e).player === player.name)
    if (propias.length > 2) {
      const lugares = [...new Set(propias.map((e) => de(e).place).filter(Boolean))]
      const primera = propias[0]!
      events = events.filter((e) => !propias.includes(e) || e === primera)
      primera.summary = `${player.name} anduvo por ${lugares.join(', ')}.`
    }
  }

  // El mismo renglón repetido no son dos noticias.
  //
  // `agenda_avanza` y `agenda_estancada` salen una vez por persona por día y
  // el texto es idéntico: "Tobio sigue sin conseguir lo que necesita…" ocho
  // veces en la misma ventana, "Ilde avanzó bastante con juntar carbón" cinco.
  // Es la planilla de NPCs otra vez, y esta vez con ids reales detrás, así que
  // ninguna auditoría la marca — pero el último párrafo vuelve a ser un
  // repaso de quién anda en qué. En una ventana llegaron a ser 58 de 60
  // hechos: no hay instrucción de priorizar que sirva cuando no queda otra
  // cosa que contar.
  //
  // Se colapsan los duplicados EXACTOS de esos tipos y se conserva el más
  // reciente, que es el que dice cómo quedaron las cosas. Sólo se descartan
  // repeticiones literales, así que no se pierde ningún hecho: el que queda
  // afirma lo mismo. Es el mismo corte que el de `llegada`, y libera el
  // párrafo para lo que sí pasó.
  //
  // `amenaza` entró a la lista por el mismo argumento y no es un evento: es un
  // estado. "Hay una jauría de sombra rondando El Sotobosque" se reemite
  // mientras el bicho siga ahí, y tres renglones idénticos no son tres bichos
  // — son uno, y contarlo tres veces le da un peso en la ventana que no tiene.
  //
  // Y se agregó un segundo colapso, del mismo día y para cualquier tipo:
  // "PruebaCombate le entró a Los del Sotobosque, pero no cayó" **diez veces
  // idénticas en el tick 128**, que es una pelea larga y no diez peleas. Diez
  // renglones iguales no le cuentan al que lee nada que no le cuente uno.
  {
    const repetibles = new Set(['agenda_avanza', 'agenda_estancada', 'amenaza'])
    const ultima = new Map<string, string>()
    for (const e of events) if (repetibles.has(e.kind)) ultima.set(e.summary, e.id)
    events = events.filter((e) => !repetibles.has(e.kind) || ultima.get(e.summary) === e.id)

    const vistos = new Set<string>()
    events = events.filter((e) => {
      const clave = `${e.tick}\x00${e.summary}`
      if (vistos.has(clave)) return false
      vistos.add(clave)
      return true
    })
  }

  // ── La ventana: qué se cuenta cuando pasó más de lo que entra ──
  //
  // **Éste era el agujero estructural que quedaba.** El corte viejo pedía los
  // hechos ordenados por fecha y se quedaba con los primeros sesenta, o sea
  // **con los más viejos**. Medido en el valle de pruebas, con un jugador que
  // volvía después de 140 días y 140 hechos esperándolo: la ventana llegaba
  // hasta el día 129 de 223 y **la crónica terminaba 94 días en el pasado**,
  // con sugerencias que se leen como "ahora". De ahí salía mandarlo a ver a
  // alguien que ya estaba muerto; la regla de prompt que se agregó antes tapaba
  // el síntoma y dejaba viva la causa.
  //
  // Y no era un corte conservador: `last_seen_tick` salta igual al día de hoy
  // al terminar, así que los ochenta hechos que quedaban afuera **no llegaban
  // nunca**. Se perdían los más recientes en vez de los menos importantes.
  //
  // La tensión es real y es la razón por la que no alcanzaba con dar vuelta el
  // orden: si sólo le contás lo último, se pierde la muerte que ordenó todo lo
  // demás; si sólo le contás lo primero, se pierde el mundo en el que se está
  // despertando. **Así que el presupuesto se reparte en tres reservas y recién
  // después se vuelve a ordenar por fecha**, para que el relato siga siendo un
  // relato:
  //
  //  1. **El presente.** Los últimos `RESERVA_PRESENTE` hechos, sin discutir.
  //     Es lo que garantiza que la crónica aterrice hoy y que el consejo del
  //     final sea sobre el valle que va a pisar.
  //  2. **Lo del que lee.** Su propio hilo, del más nuevo al más viejo. Es lo
  //     único de la ventana que no le puede dar igual, y la cadena larga —"el
  //     arma que usaste la había templado ella"— sale de acá.
  //  3. **Lo que no se repite.** El resto del presupuesto, ordenado por qué tan
  //     raro es el tipo de hecho en esta ventana y, a igual rareza, por lo más
  //     nuevo. La rareza se cuenta acá y no se declara en una lista: así la
  //     muerte (1 de 140) y la enseñanza (1 de 140) le ganan siempre a la
  //     agenda cumplida (67 de 140) **sin que este archivo tenga que saber qué
  //     tipos de evento existen** — el día que `tick.ts` emita nacimientos, un
  //     nacimiento entra por raro y nadie tiene que acordarse de agregarlo.
  //
  // Lo que se pierde con esto es la rutina vieja: las nueve veces que Marta
  // marcó la senda entre el día 84 y el 214. Es exactamente lo que nadie
  // extraña, y es la planilla que las dos auditorías anteriores vinieron
  // peleando.
  if (events.length > TOPE_PROMPT) {
    const orden = new Map(events.map((e, i) => [e.id, i]))
    const frecuencia = new Map<string, number>()
    for (const e of events) frecuencia.set(e.kind, (frecuencia.get(e.kind) ?? 0) + 1)

    const elegidos = new Set<string>()
    const tomar = (lista: typeof events, cupo: number) => {
      for (const e of lista) {
        if (cupo <= 0 || elegidos.size >= TOPE_PROMPT) break
        if (elegidos.has(e.id)) continue
        elegidos.add(e.id)
        cupo--
      }
    }
    const nuevosPrimero = [...events].reverse()

    tomar(nuevosPrimero, RESERVA_PRESENTE)
    tomar(
      nuevosPrimero.filter(
        (e) =>
          (e.detail as { player?: string } | null)?.player === player.name ||
          nombrado(player.name, e.summary),
      ),
      RESERVA_JUGADOR,
    )
    tomar(
      [...events].sort(
        (a, b) =>
          (frecuencia.get(a.kind) ?? 0) - (frecuencia.get(b.kind) ?? 0) ||
          b.tick - a.tick ||
          orden.get(b.id)! - orden.get(a.id)!,
      ),
      TOPE_PROMPT,
    )

    events = events.filter((e) => elegidos.has(e.id))
  }

  // ── FICHERO: el índice, no la novela ──────────────────────
  //
  // Todo lo que entra acá el modelo lo lee como narrable, así que la pregunta
  // en cada campo es "¿el jugador puede saber esto?". Lo que no pasa el filtro
  // no se consulta siquiera: los vínculos (valorado/temido) y las memorias de
  // los NPCs salieron de acá porque son las dos cosas que más se narraron como
  // hechos. `valued 44` volvía como "te tiene en alta estima", y una memoria
  // de hace treinta días —redactada en primera persona, lista para copiar—
  // volvía como algo que acababa de pasar. Lo que el jugador se ganó con la
  // gente ya le llega por los hechos `confianza`, que es el canal correcto.
  //
  // `disposition` salió por lo mismo, en la segunda auditoría. No es un dato:
  // es el prompt de sistema del NPC —`dialogo.ts` y `saludos.ts` lo usan tal
  // cual, "Eres Odila, destiladora. <disposition>"— y ahí está bien, porque el
  // que habla es ella. Pasárselo al narrador es darle reglas de comportamiento
  // ya redactadas en castellano, y las dicta: "Enseña a quien se queda tres
  // días sin pedir nada" salió literal a la crónica de un jugador, o sea la
  // receta para desbloquear una enseñanza. "Cobra por adelantado" y "sabe
  // quién entró y quién salió" también. Es la misma fuga que los números de
  // `bonds` —qué tan cerca está alguien de algo— pero peor, porque ya viene
  // escrita como consejo. Al índice no le hace falta: para entender un hecho y
  // para saber a quién sugerir alcanzan el oficio, el lugar, qué sabe y si
  // enseña.
  const [places, people, agendas, sabe, otros, viejo, previas] = await Promise.all([
    db.from('places').select('id, name, kind').eq('region_id', region.id),
    db.from('people').select('id, name, trade, place_id, teaches, alive')
      .eq('region_id', region.id),
    db.from('agendas').select('person_id, goal, state')
      .in('state', ['activa', 'bloqueada']),
    db.from('knows').select('holder_kind, holder_id, knowledge:knowledge_id (name)'),
    // Sólo los nombres, y ni siquiera todos: los que salen en los hechos. Ver
    // «Los otros como el que lee» abajo.
    db.from('players').select('name').eq('region_id', region.id),
    // El pasado del valle. Son filas de `events` como cualquier otra —de ahí el
    // tick negativo— y por eso el director las puede citar sin romper la regla
    // que no se rompe. Van aparte de `events` y no mezcladas con la ventana por
    // dos motivos concretos: un tick negativo le rompería la cuenta a
    // `atrasoDias`, y sobre todo porque el pasado no compite por el presupuesto
    // de la ventana. No es una noticia más: es el fondo contra el que se leen
    // las noticias.
    db.from('events').select('id, summary, place_id, detail')
      .eq('region_id', region.id).eq('kind', 'pasado').lt('tick', 0)
      .order('tick', { ascending: true }),
    // Qué ya se le contó a este jugador. `source_events` guarda los ids que el
    // director citó, así que una pieza del pasado usada hace dos crónicas se
    // reconoce sin agregar ninguna tabla.
    db.from('chronicles').select('source_events')
      .eq('player_id', player.id).order('created_at', { ascending: false })
      .limit(CRONICAS_SIN_REPETIR),
  ])

  const placeName = (id: string | null | undefined) =>
    places.data?.find((p) => p.id === id)?.name ?? '—'
  const knowsOf = (kind: string, id: string) =>
    (sabe.data ?? [])
      .filter((k) => k.holder_kind === kind && k.holder_id === id)
      .map((k) => (k.knowledge as unknown as { name: string } | null)?.name)
      .filter(Boolean)

  // Los muertos no entran, ni siquiera como advertencia.
  //
  // Hubo una línea `Ya no están: …` para que no los narrara como vivos, y
  // produjo el error simétrico y peor: en una ventana que termina el día antes
  // de que Ilde muriera —siete hechos con Ilde trabajando— las seis corridas
  // abrieron con su muerte y con el saber perdido, y cuatro le inventaron la
  // causa. Ninguno de esos dos hechos estaba en la ventana. Era la única
  // fuente y el modelo la usó como titular, que es lo que hace con todo lo que
  // le entra.
  //
  // No hace falta: si murió dentro de la ventana hay un hecho `muerte` que lo
  // dice y la prioridad ya lo pone primero; si murió antes, el jugador ya se
  // enteró y no es novedad. Lo único que se perdía al sacarlos era mandarlo a
  // buscar a un maestro muerto, y eso lo cierra la regla de sugerir sólo a
  // quien esté en el índice — sin nombrar a nadie. Que el modelo no nombra a
  // quien no está en los hechos está medido: `unbacked_names` dio 0,00 en
  // trece crónicas.
  const vivos = (people.data ?? []).filter((p) => p.alive)

  // Los otros como el que lee.
  //
  // El prompt siempre dijo "los hechos de otros son de otros", pero no decía
  // quiénes son los otros: el director veía "Ilde se metió y le sacó una
  // jauría de encima a Herrero" y no tenía cómo saber que Herrero es un
  // jugador y no un vecino sin ficha. Con la ventana vieja casi no importaba
  // —los hechos de otros jugadores son raros y quedaban afuera por viejos—;
  // con la ventana nueva, que busca justamente lo poco frecuente, entraron. Y
  // apareció el error: «Ilde se metió a defenderte como lo había hecho antes
  // con Herrero», o sea el favor de otro puesto a nombre del que lee.
  //
  // Van sólo los nombres —ni dónde están, ni qué saben, ni qué hicieron: eso
  // es ficha y la ficha se narra— y sólo los que ya salen en algún hecho, así
  // que no le presenta a nadie nuevo. Es la única línea del fichero cuyo
  // trabajo es que el modelo NO cuente algo.
  // ── EL PASADO: contexto, nunca noticia ────────────────────
  //
  // El valle tiene pasado escrito —siete piezas del autor, en `events` con tick
  // negativo— y hasta ahora la crónica no lo miraba. Que lo mire cambia una
  // cosa concreta: si el jugador entró al Sotobosque, la crónica puede decir
  // que ahí talaron el claro, y eso convierte un lugar en un sitio con deuda.
  //
  // Los cuatro filtros de abajo existen todos para lo mismo — que el pasado no
  // se coma la crónica — y cada uno tapa un modo de falla distinto:
  //
  //  1. **Sólo lo que toca un lugar de la ventana.** El pasado que no explica
  //     nada de lo que pasó estos días es una clase de historia. Si el jugador
  //     no pisó el Sotobosque y no pasó nada allí, el claro talado no viene a
  //     cuento y no entra.
  //  2. **Una pieza por lugar, como mucho dos en total.** Y la primera regla es
  //     además la que impide, sin tener que saber nada del contenido, que las
  //     DOS versiones del incendio entren juntas: comparten lugar, así que
  //     entra una sola. El director no está para resolver una contradicción que
  //     el mundo dejó abierta, y la forma más segura de que no la resuelva es
  //     que no la vea entera.
  //  3. **Nada de `se_calla`.** Lo que en el valle nadie cuenta, el narrador
  //     tampoco. Es la única pieza cuyo valor es la ausencia, y una crónica que
  //     la cuenta la destruye para siempre.
  //  4. **Nada que ya se le haya contado hace poco.** Ver `CRONICAS_SIN_REPETIR`.
  type Pieza = {
    id: string; summary: string; place_id: string | null
    detail: { epoca?: string; hace_inviernos?: number; certeza?: string; quien_lo_cuenta?: string } | null
  }
  const yaContadas = new Set<string>()
  for (const c of (previas.data ?? []) as { source_events: string[] | null }[]) {
    for (const id of c.source_events ?? []) yaContadas.add(id)
  }
  const lugaresDeLaVentana = new Set(
    [...events.map((e) => e.place_id), player.place_id].filter(Boolean) as string[],
  )
  // Los primeros días del que llegó: el filtro por lugar no corre.
  //
  // *«Deberías ir aprendiendo»*. El filtro por lugar existe para que el pasado
  // no se coma la crónica de quien ya conoce el valle, y para ése está bien.
  // Para el que llegó anteayer es al revés: es el único momento en que una
  // pieza vieja que no explica nada de esta semana igual le sirve, porque no
  // sabe nada de nada. Se apaga solo a las `CRONICAS_DE_APRENDIZAJE`, y el
  // tope de dos por crónica y el «no repetir» de `CRONICAS_SIN_REPETIR` siguen
  // corriendo — así que aprende el valle de a dos piezas y sin repetirse.
  const aprendiendo = yaLeContaron <= CRONICAS_DE_APRENDIZAJE
  const pasado: Pieza[] = []
  {
    const lugaresUsados = new Set<string>()
    for (const p of (viejo.data ?? []) as Pieza[]) {
      if (pasado.length >= TOPE_PASADO) break
      if (!p.place_id) continue
      if (!aprendiendo && !lugaresDeLaVentana.has(p.place_id)) continue
      if (p.detail?.certeza === 'se_calla') continue
      if (yaContadas.has(p.id)) continue
      if (lugaresUsados.has(p.place_id)) continue
      lugaresUsados.add(p.place_id)
      pasado.push(p)
    }
  }

  // El pasado cuenta como respaldo para los nombres, y tiene que contar: si una
  // pieza nombra a Ilde y el director la nombra por eso, no es un testigo
  // inventado — está en un hecho de la base, que es justamente lo que
  // `sinRespaldo` mide.
  const enHechos = [...events.map((e) => e.summary), ...pasado.map((p) => p.summary)].join('\n')
  const jugadores = (otros.data ?? [])
    .map((p) => p.name)
    .filter((n) => n.toLowerCase() !== player.name.toLowerCase() && nombrado(n, enHechos))

  const mundo = [
    `Región: ${region.name}. Quien lee estuvo por última vez ${hace(region.tick - player.last_seen_tick)}.`,
    `QUIEN LEE ESTO: ${player.name}, en ${placeName(player.place_id)}. Sabe: ${knowsOf('player', player.id).join(', ') || 'nada todavía'}.`,
    '',
    'Gente que anda por el valle (índice de a quién puedes sugerir; nada de esto sucedió):',
    ...vivos.map((p) => {
      const suyas = (agendas.data ?? []).filter((a) => a.person_id === p.id)
      return [
        `- ${p.name} · ${p.trade} · vive en ${placeName(p.place_id)}`,
        `  sabe: ${knowsOf('person', p.id).join(', ') || 'nada registrado'}`,
        // Sin porcentajes a propósito: si se los pasamos, el director se los
        // cuenta al jugador, y el jugador no tiene forma de saberlos. Lo único
        // que agrega valor es si la meta está trabada, porque eso sí se nota.
        suyas.length
          ? `  anda queriendo (no es algo que hizo): ${suyas.map((a) => a.goal + (a.state === 'bloqueada' ? ' — trabada' : '')).join(' | ')}`
          : '',
        p.teaches ? '' : '  no enseña',
      ].filter(Boolean).join('\n')
    }),
    jugadores.length
      ? `\nOtros como el que lee, que andan por el valle: ${jugadores.join(', ')}. Lo que hicieron ellos es de ellos: si un hecho los nombra, el que lo hizo fue ese y no ${player.name}, y lo que alguien hizo por ellos no lo hizo por ${player.name}.`
      : '',
  ].filter((l) => l !== '').join('\n')

  // Etiquetas cortas en vez de uuids: sesenta uuids son ~600 tokens de puro
  // ruido que el modelo además transcribe mal. `h3` lo cita bien y sale gratis.
  const etiqueta = new Map(events.map((e, i) => [`h${i + 1}`, e.id]))
  const hechos = events
    .map((e, i) => {
      const hueco = HUECOS[e.kind] ? ` ⟨${HUECOS[e.kind]}⟩` : ''
      return `[h${i + 1}] ${hace(region.tick - e.tick)} · ${e.kind} · ${placeName(e.place_id)} — ${e.summary}${hueco}`
    })
    .join('\n')

  // Las piezas del pasado se etiquetan `p1`, `p2` y van al MISMO mapa que los
  // hechos. No es cosmética: significa que el director las cita igual que a
  // todo lo demás, que `inventados` las audita igual, y que quedan guardadas en
  // `chronicles.source_events` — que es de donde sale, la próxima vez, saber
  // que ya se las contó.
  pasado.forEach((p, i) => etiqueta.set(`p${i + 1}`, p.id))

  // Las reglas del pasado van acá, pegadas al pasado, y no en el SYSTEM. El
  // SYSTEM se paga en todas las crónicas y esto sólo hace falta cuando hay algo
  // viejo que venga a cuento; la mayoría de las veces este bloque entero es
  // cadena vacía.
  //
  // Dos cosas de la redacción se aprendieron midiendo, y las dos son del mismo
  // tipo — el modelo hace lo que el bloque PARECE pedirle, no lo que dice:
  //
  //  · **Las reglas van ANTES de las piezas y con un ejemplo escrito.** La
  //    primera versión ponía las piezas arriba y debajo cinco renglones de
  //    prohibiciones, y en tres crónicas de tres el director no usó ninguna:
  //    leyó la lista de restricciones y decidió que lo seguro era saltearlo. El
  //    ejemplo de media frase es lo que muestra que hay una forma correcta de
  //    usarlo y no sólo formas incorrectas.
  //  · **La certeza va en la etiqueta y NO en una nota ⟨⟩.** Las ⟨⟩ están
  //    definidas en el SYSTEM como "qué parte no vas a contar", así que
  //    colgarle una a una pieza la marcaba como material a esquivar. SABIDO y
  //    SE DICE van en el renglón, como el tipo de evento.
  const bloquePasado = pasado.length === 0 ? '' : '\n\n'
    + 'EL PASADO DE ESTE VALLE (de hace muchísimo; no es noticia, es el fondo)\n'
    + pasado.map((p, i) => {
      const d = p.detail ?? {}
      // Si la época ya cuenta en inviernos, el número repite. Ver el mismo
      // recorte en `dialogo.ts`.
      const cuando = [
        d.epoca,
        d.hace_inviernos && !(d.epoca ?? '').toLowerCase().includes('invierno')
          ? `hace ${d.hace_inviernos} inviernos` : null,
      ].filter(Boolean).join(', ')
      const como = d.certeza === 'sabido'
        ? 'SABIDO'
        : `SE DICE, lo cuentan ${d.quien_lo_cuenta ?? 'algunos'}`
      return `[p${i + 1}] ${cuando} · ${placeName(p.place_id)} · ${como} — ${p.summary}`
    }).join('\n')
    // El renglón que decide, y va al final del prompt entero. Antes decía
    // "puedes citarlo" y el resultado fue cero usos en cinco crónicas seguidas,
    // con ventanas de 55 y de 17 hechos: no era falta de sitio, era que un
    // permiso rodeado de prohibiciones se lee como una prohibición más. Escrito
    // como orden —elegí una y metela— y con la salida explícita para cuando no
    // encaja, hace lo que tiene que hacer.
    // Y la variante de los primeros días: al que acaba de llegar hay que
    // contarle el sitio aunque no haya pasado nada allí esta semana, porque no
    // lo conoce. La orden es la misma —una, media frase, metida donde vaya— y
    // lo único que cambia es que no exige que caiga en el sitio de un hecho.
    + (aprendiendo
      ? '\nQuien lee acaba de llegar al valle y no conoce nada de esto. Elige UNA de\n'
        + 'esas piezas y métela en media frase, una sola vez en toda la crónica, allí\n'
        + 'donde nombres su sitio. Así: "el Sotobosque, el mismo claro que la aldea\n'
        + 'taló para las vigas, …". No hace falta que haya pasado nada allí estos\n'
        + 'días: es lo que le enseña dónde está.\n'
      : '\nElige UNA de esas piezas que caiga en el MISMO SITIO que algún hecho de\n'
        + 'HECHOS y métela ahí, en media frase, una sola vez en toda la crónica. Así:\n'
        + '"volviste al Sotobosque, el mismo claro que la aldea taló para las vigas,\n'
        + 'y…". Si ninguna cae en el sitio de ningún hecho, déjalas y no pasa nada.\n')
    + 'No abre la crónica, no va sola, no va en párrafo propio, no le quita el\n'
    + 'lugar a nada de esta semana y no es la causa de nada de hoy.\n'
    // Salió en una de tres: la pieza decía noventa inviernos y la crónica
    // escribió cien. Es chico y es una invención igual — y de las peores de
    // corregir después, porque suena bien y nadie la audita. "Hace
    // generaciones" es la salida correcta cuando el número no se quiere usar.
    + 'El número de inviernos es el que está escrito: no lo redondees ni lo\n'
    + 'cambies. Si no lo quieres decir, di "hace generaciones" y ya.\n'
    + 'Lo marcado SE DICE no lo afirmas tú: se lo atribuyes a quien lo cuenta\n'
    + '—"cuentan en el vado que…"— y hasta ahí. Hay quien lo cuenta de otra manera\n'
    + 'y esa otra versión no está aquí: no la insinúes, no digas que hay más de\n'
    + 'una y no te pongas de ningún lado. El valle no lo tiene resuelto y tú\n'
    + 'tampoco lo resuelves.\n'
    + 'Si la usas, cita su etiqueta como cualquier otro hecho.'

  const prompt = `FICHERO (índice; nada de esto sucedió)\n${mundo}\n\n`
    + `HECHOS (lo único que pasó y lo único que puedes afirmar)\n${hechos}${bloquePasado}`

  // Con `VER_PROMPT=1` sale por consola lo que se le mandó. Es el mismo botón
  // que tiene `dialogo.ts` y entró por la misma necesidad: cuando el pasado no
  // aparecía en tres crónicas seguidas no había forma de saber si el bloque no
  // se estaba armando o si el modelo lo estaba salteando. Eran las dos cosas.
  if (process.env.VER_PROMPT) console.log(`\n───── prompt ─────\n${prompt}\n─────`)

  // Sin `respaldo` a propósito: una crónica que no salió es un fallo y tiene
  // que reventar acá. Inventarle un texto vacío al jugador sería peor, y
  // taparía justo el modo de falla que el experimento busca medir.
  const pedir = (extra: string) => pedirJson<{
    text: string; used_event_ids: string[]
  }>({
    modelo: model,
    esfuerzo: effort,
    maxTokens: 4000,
    schema: SCHEMA,
    system: SYSTEM,
    prompt: prompt + extra,
  })

  let { datos: chronicle, inTokens, outTokens, costUsd } = await pedir('')

  // ── El colador del registro ───────────────────────────────
  //
  // El mundo se narra en castellano llano y eso está en el SYSTEM con todas
  // las letras. El modelo lo desobedece igual, y **medirlo fue lo que lo
  // convirtió en un problema tratable**: `pnpm registro` cuenta el voseo sobre
  // todo el histórico, y con el corte en el día que entró la instrucción da
  //
  //     antes    9 de 13 crónicas
  //     después  1 de 7
  //
  // O sea que la instrucción funcionó y no alcanzó, y **lo que quedó cambió de
  // forma**: ya no son crónicas escritas enteras en rioplatense, son crónicas
  // partidas por la mitad — «no cayó, pero vos sí» en el mismo párrafo que «si
  // tienes prisa»—, que se leen como escritas por dos personas.
  //
  // Antes de escribir esto se descartó lo obvio, midiendo: **el emisor está
  // limpio.** 349 hechos de producción con 0 voseos, y `people.voice`,
  // `people.historia` y `places.description` con 0 de 12. No hay de dónde
  // copiarlo; lo pone el modelo solo.
  //
  // Por qué un reintento y no un reemplazo de texto: cambiar "vos" por "tú" a
  // mano deja la frase mal conjugada («tú podés») y encima taparía la señal.
  // Y por qué UNO solo: si a la segunda no salió, el problema no es el azar, y
  // dejar al jugador esperando llamadas encadenadas es peor que una arruga.
  // El precedente es de la casa — `saludos.ts` rechaza y rehace saludos con
  // esta misma lista, que se importa y no se copia.
  //
  // Y una advertencia que costó plata averiguar: **la primera versión saltaba
  // en 5 de 6 crónicas y casi siempre por nada.** Lo que cazaba era "allá",
  // que es castellano llano impecable —«lo que hay allá abajo» se dice igual
  // en España—, así que se pagaba una generación entera de más cinco de cada
  // seis veces. Con "allá" fuera de la lista (ver `PERMITIDAS` en
  // `registro.ts`) el colador salta 1 de 6, ninguna queda sucia, y la crónica
  // bajó de USD 0,0213 a 0,0135. **Un colador demasiado ancho no es prudencia:
  // es un impuesto.**
  const marcas = marcasDeVoseo(chronicle.text)
  let rehecha = false
  if (marcas.length > 0) {
    const cuales = [...new Set(marcas.map((s) => s.toLowerCase()))].join('", "')
    console.log(`[director] registro roto ("${cuales}") — rehaciendo una vez`)
    const otra = await pedir(
      `\n\nRECHAZADA. La versión anterior tenía voseo: "${cuales}". `
      + 'El mundo habla castellano llano: "tú", "mira", "aquí". '
      + 'Escríbela de nuevo entera, sin esas palabras y sin ninguna otra forma '
      + 'de voseo, y sin cambiar ningún hecho.',
    )
    // Se queda la nueva aunque tampoco salga limpia: es la que al menos lo
    // intentó dos veces, y el número de las que fallan dos veces es
    // justamente lo que hay que mirar cuando se toque el SYSTEM.
    inTokens += otra.inTokens
    outTokens += otra.outTokens
    costUsd += otra.costUsd
    chronicle = otra.datos
    rehecha = true
    const quedan = marcasDeVoseo(chronicle.text)
    if (quedan.length > 0) console.log(`[director] siguió con voseo: ${quedan.join(' ')}`)
  }

  // ── Auditoría 1: ¿citó hechos que no existen? ─────────────
  const usados = chronicle.used_event_ids.map((s) => s.trim())
  const inventados = usados.filter((id) => !etiqueta.has(id))
  const reales = usados.map((id) => etiqueta.get(id)).filter((id): id is string => !!id)

  // ── Auditoría 2: ¿pobló la escena con gente que no estuvo? ─
  //
  // El chequeo de ids no ve el modo de falla que más apareció: citar tres ids
  // válidos y meter alrededor a un testigo, un deudor o un salvador que no
  // están en ningún hecho. Acá se busca al revés — de la crónica a los hechos.
  // Nombrar a alguien que no aparece en la ventana no siempre es mentira (una
  // sugerencia en condicional es legítima), por eso sale como señal y no como
  // error. Pero es el número que hay que mirar cuando se toca el prompt.
  const sinRespaldo = (people.data ?? [])
    .map((p) => p.name)
    .filter((n) => n.toLowerCase() !== player.name.toLowerCase())
    .filter((n) => nombrado(n, chronicle.text) && !nombrado(n, enHechos))

  if (!opts.dryRun) {
    await db.from('chronicles').insert({
      player_id: player.id,
      from_tick: player.last_seen_tick,
      to_tick: region.tick,
      text: chronicle.text,
      source_events: reales,
    })
    // El cursor salta al día de hoy, no al último hecho narrado, y eso no
    // cambió con la ventana nueva. Es a propósito: dejarlo en el último hecho
    // le daría al que volvió después de meses una crónica atrasada varios días
    // seguidos, que es justo lo que se acaba de arreglar. Lo que la selección
    // no eligió no vuelve — la diferencia es que ahora lo que se pierde son
    // los renglones que se repiten y no lo de esta semana.
    await db.from('players').update({ last_seen_tick: region.tick }).eq('id', player.id)
  }

  return {
    text: chronicle.text.trim(),
    leidos: events.length,
    usados: usados.length,
    inventados,
    sinRespaldo,
    rehechaPorRegistro: rehecha,
    atrasoDias: region.tick - events[events.length - 1]!.tick,
    pasadoEnPrompt: pasado.length,
    pasadoUsado: usados.filter((id) => /^p\d+$/.test(id) && etiqueta.has(id)).length,
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
    console.error(`⚠ El director citó ${c.inventados.length} hecho(s) inexistente(s): ${c.inventados.join(', ')}`)
    console.error('  Eso es una alucinación — el modo de falla que el experimento busca.')
  }
  if (c.sinRespaldo.length) {
    console.error(`⚠ Nombró a ${c.sinRespaldo.join(', ')} sin ningún hecho que los ponga en escena.`)
    console.error('  Puede ser una sugerencia legítima; si no lo es, es un testigo inventado.')
  }
  console.log(`— ${c.leidos} hechos leídos, ${c.usados} usados. Llega hasta ${hace(c.atrasoDias)}.`
    + (c.pasadoEnPrompt
      ? ` Del pasado: ${c.pasadoEnPrompt} ofrecida(s), ${c.pasadoUsado} usada(s).`
      : ''))
}
