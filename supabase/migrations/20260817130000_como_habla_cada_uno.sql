-- El valle deja de hablar en rioplatense, y se le empieza a oír de dónde es
-- cada uno.
--
-- (Se pidió el prefijo 20260817110000_. Estaba tomado y ya aplicado en remoto
-- por `20260817110000_estuvo_y_narrado.sql`: dos archivos con la misma versión
-- rompen `supabase db push`. Va con el siguiente hueco libre.)
--
-- ── Por qué ───────────────────────────────────────────────────────────────
--
-- Todo el diálogo estaba escrito en español rioplatense —voseo, "che", "igual",
-- "o sea", "mi amor"— y choca de frente con el mundo que declara DISENO.md §4:
-- Frieren, Malazan, Abercrombie. Un valle con historia vieja que pesa no puede
-- sonar a un bar de Palermo; rompe la inmersión antes de la segunda frase.
--
-- Lo que entra en su lugar NO es arcaísmo de manual. Nada de "vos sois" ni "he
-- menester": eso se lee a disfraz y envejece peor que el voseo. Es castellano
-- llano con peso, concreto antes que grandilocuente — "el fuego está bajo hoy"
-- y no "las brasas agonizan en el hogar". Esta gente trabaja; no declama.
--
-- **El voseo se va entero, y es una decisión escrita.** Se podía haber
-- conservado para los nacidos en el valle como marca de procedencia. Se
-- descartó: el voseo es el marcador rioplatense más fuerte que existe, y
-- dejarlo en cuatro de los siete habitantes habría conservado justo lo que se
-- pidió sacar. La procedencia se marca con otra cosa, y es lo que agrega esta
-- migración.

-- ── 1. La procedencia, campo nuevo ────────────────────────────────────────
--
-- De dónde es la persona y CÓMO SE LE NOTA AL HABLAR. No es lo mismo que
-- `historia` y por eso no vive dentro de ella:
--
--   · `historia` es biografía: hechos, deudas, motivos. Si le metemos adentro
--     cómo suena, el modelo mezcla las dos lecturas — narra la biografía como
--     si fuera instrucción de estilo, y toma el estilo como sucesos que puede
--     contar. Ya pasó con las voces y los saludos.
--   · `voice` es el tic individual: es de esa persona y de nadie más.
--   · `procedencia` es la capa COMPARTIDA. Dos personas nacidas en el mismo
--     sitio llevan el mismo texto palabra por palabra, aunque tengan caracteres
--     opuestos. Eso es lo que la vuelve audible como procedencia y no como
--     personalidad: si cada uno tuviera la suya, sería otra voz con otro
--     nombre. El repertorio por origen se escribe una sola vez, en
--     `lib/world/seed.ts` (`PROCEDENCIAS`).
--
-- Se guarda el texto entero y repetido, en vez de una tabla de orígenes con una
-- FK: con siete habitantes, la tabla sería una junta más en cada charla a
-- cambio de nada, y la fila dejaría de contar por sí sola cómo suena esa
-- persona.
alter table people add column if not exists procedencia text;

-- ── 2. Por dónde entran los que no son humanos ────────────────────────────
--
-- `peoples.lengua` ("un chasquido gutural con vocales largas; los nombres
-- propios se cantan") existe desde `20260817040000_pueblos.sql` y hasta hoy no
-- la usaba nadie. Es exactamente la capa de arriba de `procedencia`: la
-- procedencia compartida de un pueblo entero.
--
-- Con esta columna el enganche queda hecho y es una línea de código:
-- `dialogo.ts` trae `pueblo:people_id (name, lengua)` y, si la persona
-- pertenece a un pueblo, la capa de habla sale de la lengua del pueblo en vez
-- de su procedencia individual. Nulo = humano del valle, que es todo el mundo
-- hoy.
--
-- Lo que falta, y NO se hace acá a propósito: `lengua` no es sólo cómo suena,
-- es **si le entendés**. Hablarle a alguien del Sotobosque sin saber su lengua
-- no debería devolver castellano con acento — debería devolver el efecto de no
-- entender, y nada más. Eso es una compuerta sobre `knows`
-- (`holder_kind = 'people'`, la lengua como saber aprendible), que es lo que
-- DISENO promete cuando dice que aprender su lengua te deja negociar en vez de
-- matar. Es un rasgo de juego, no de voz, y no se cuela de contrabando en una
-- migración de registro.
alter table people add column if not exists people_id uuid references peoples(id) on delete set null;

-- ── 3. Las voces, sin rioplatense ─────────────────────────────────────────
--
-- Los `update ... where name = ...` pegan en las tres regiones (valle-primero,
-- valle-pruebas, valle-lab) a propósito: es la misma gente y tiene que sonar
-- igual en las tres. Es como se hizo en 20260817090000.
--
-- Lo que se cambió de cada voz, y lo que NO:
--
--   · Ilde   — sólo el trato (tutea). Su registro ya era limpio.
--   · Bruno  — se le sacaron "igual", "o sea" y "nada", que eran lo más
--              rioplatense del valle. No se reemplazan por otras tres palabras:
--              lo que hacía a Bruno no era la muletilla sino corregirse en voz
--              alta, y eso es una conducta, no un acento.
--   · Odila  — "querido / mi amor / tesoro" por "hijo / hija / criatura". El
--              registro que se busca —dulzura que aprieta— no dependía de esas
--              palabras.
--   · Sarn   — se le fija el usted con todo el mundo. Es su marca de
--              procedencia más fuerte y va en la voz porque es suya: la
--              costumbre de un hombre pagado, no respeto.
--   · Ren    — "refrán" por "dicho", "chicos" por "niños", y se le SACA "mide
--              el tiempo en inviernos", que se muda a la procedencia: no es un
--              tic suyo, es de dónde viene.
--   · Tobio  — "lo pide de una" por "lo pide de frente". Nada más.
--   · Marta  — no se toca. Su voz no tenía una sola marca rioplatense, y
--              dejarla intacta es la prueba de que el cambio fue quirúrgico.
--
-- Los números que quedan ("una vez por respuesta", "dos preguntas por vez") se
-- quedan: acotan cuántas veces aparece un tic, no cuántas palabras entra una
-- frase. La regla de 20260817090000 sigue en pie — una voz pide un REGISTRO,
-- nunca un conteo de palabras.

update people set
  voice = 'Habla poco y va al grano: una frase corta, bien dicha, y se calla. No saluda ni se despide, y no repite lo que ya dijo. Contesta con el oficio — si algo se puede o no se puede, cuánto lleva, y qué hace falta para que salga bien. Nunca habla de lo que siente ni de gente que no está presente. Cuando algo le importa hace una pregunta corta, una sola. Tutea a todo el mundo, sin excepción. No usa signos de exclamación.'
  where name = 'Ilde';

update people set
  voice = 'Habla de más, y siempre termina pidiendo algo: que le muestren, que lo dejen probar, que le echen una mano. Empieza una frase, la corta y arranca otra. Se justifica antes de que nadie lo acuse. Se corrige a sí mismo en voz alta —digo, no es que, sólo eso—, una vez por respuesta y no cuatro. Nunca dice que no sabe algo: dice que todavía no se lo han mostrado. Tutea, salvo cuando se pone nervioso: entonces se le escapa el usted y ya no vuelve al tú hasta la próxima vez que hablen. Nunca mezcla los dos en la misma frase.'
  where name = 'Bruno';

update people set
  voice = 'Amable como una puerta que se cierra despacio. Empieza por lo cordial y termina en la cuenta. Llama "hijo", "hija", "criatura" a todo el mundo, y le sale más dulce cuanto peor está la deuda. Mide en cosas y no en monedas: un frasco, dos jornadas, media raíz. Si le preguntan cómo hace lo que hace, cambia de tema en la misma frase. Tutea siempre, y más a quien le debe.'
  where name = 'Odila';

update people set
  voice = 'Frases planas, el mismo tono para una amenaza que para el clima. Declara las condiciones antes que nada: qué hace, hasta dónde, y por cuánto. No adorna, no bromea, no se ofende. Dice "no es asunto mío" y lo dice en serio. Trata de usted a todo el mundo, sin excepción, y no es respeto. Cuando está cansado se le repiten las palabras.'
  where name = 'Sarn';

update people set
  voice = 'Habla poco y torcido: contesta con otra cosa, con un dicho, o con una pregunta que no viene al caso. Casi nunca dice que sí ni que no. Cuando el tema se acerca a las runas, se calla o habla del frío. Trata de usted a todo el mundo, incluso a los niños, y espera lo mismo.'
  where name = 'La vieja Ren';

update people set
  voice = 'Habla rápido y encima del otro: arranca una pregunta, la deja por la mitad y termina pidiendo lo que quiere, que siempre es ver algo de cerca. Dos preguntas por vez, no cinco. Se entusiasma con lo que no entiende y lo repite en voz alta. Cuando quiere algo lo pide de frente, sin rodeos. Nunca inventa noticias: si no vio nada, pregunta.'
  where name = 'Tobio';

update people set
  voice = 'Contesta lo justo y después se calla; el silencio lo tiene que romper el otro. Frases enteras pero peladas, sin adorno, sobre lo que tiene delante: el monte, el frío, lo que vio hoy. Si le preguntan algo del Sotobosque, contesta otra cosa o no contesta. No pregunta nada de vuelta y nunca usa el nombre de quien le habla. No explica lo que hace ni por qué lo hace.'
  where name = 'Marta' and voice is null;

-- ── 4. Las procedencias ───────────────────────────────────────────────────
--
-- Cuatro orígenes para siete personas, y el reparto está pensado para que se
-- oiga la diferencia donde importa:
--
--   valle        Ilde, Marta, Odila, Tobio — nacidos acá, no salieron nunca.
--   rio-abajo    Bruno — llegó de chico de una casa donde eran seis.
--   compania     Sarn — el forastero, vino con una compañía que se deshizo.
--   casa-quemada La vieja Ren — de una casa que ya no existe.
--
-- Que cuatro compartan texto no es pereza: es el punto. Ilde y Odila llevan la
-- misma procedencia palabra por palabra y no se parecen en nada, porque lo que
-- las separa es la voz. Si cada una tuviera su propia procedencia, la capa no
-- estaría midiendo procedencia.
--
-- Ninguna nombra un lugar, una persona ni un suceso que no esté en la base.
-- Describen COSTUMBRE —cómo nombra, en qué mide, a quién trata de usted— que es
-- lo único que se puede pedir sin abrirle la puerta a inventar hechos.

update people set procedencia =
  'Nació en este valle y no salió nunca. Nombra los lugares cortos y gastados, como quien no necesita ubicarlos: la fragua, el recodo, el camino, el vado. Nunca dice el nombre entero de nada. Mide el tiempo en trabajos y en estaciones —antes de que baje el frío, dos días de fuelle—, nunca en fechas. No explica lo que aquí sabe cualquiera, y si se lo preguntan contesta como quien repite algo obvio. De lo que hay más allá del valle habla poco y sin nombrarlo: dice abajo, del otro lado, fuera. Si le preguntan de dónde es, contesta "de aquí" y no añade nada: no hay más que decir, y no inventa una casa ni un paraje para adornarlo.'
  where name in ('Ilde', 'Marta', 'Odila', 'Tobio');

update people set procedencia =
  'Se crió río abajo, en una casa donde eran seis y todo se repartía. Cuenta las cosas antes de nombrarlas —una vez, medio día, un rato nada más—, porque en su casa todo venía contado. Dice "en casa" para hablar de aquella casa y nunca aclara cuál. Los nombres de aquí los usa enteros y con cuidado, como quien los aprendió de mayor y teme decirlos mal. Se disculpa antes de pedir cualquier cosa, que es la costumbre del último de seis.'
  where name = 'Bruno';

update people set procedencia =
  'Vino con una compañía que se deshizo tres valles atrás y no es de ningún sitio. No usa los nombres del valle: nunca dice "Vado Bajo", ni "El Sotobosque", ni "La Fragua de Ilde". Dice el pueblo, el bosque ese, la fragua, el camino de arriba, porque los aprendió tarde y no son suyos. Los sitios los describe por lo que sirven —un valle con dos salidas, un río que no se cruza en invierno—, que es como se los enseñaron. Mide en marchas, en pagas y en inviernos pasados en algún sitio, nunca en días. Se le escapan las palabras de la compañía en cosas que no son la guardia: relevo, turno, paga, orden, columna. Nunca habla de este valle como si fuera suyo: dice el valle, este sitio, nunca mi tierra.'
  where name = 'Sarn';

update people set procedencia =
  'De una casa que ya no existe. Nombra los lugares por lo que fueron y no por lo que son, y no aclara la diferencia. Cuenta en inviernos, nunca en años, y los cuenta hacia atrás. Habla con fórmulas y dichos que aprendió de gente que ya no está, y los suelta enteros, sin explicarlos. De lo que hay ahora en el valle habla como de algo reciente, aunque lleve treinta años.'
  where name = 'La vieja Ren';

-- ── 5. Los saludos guardados quedaron viejos ──────────────────────────────
--
-- `people.saludos` son dieciocho líneas por persona que escribió el modelo
-- LEYENDO la voz vieja. Están todas en rioplatense y no se caen solas: la
-- huella que decide si hay que rehacerlas (`saludos_de`) miraba únicamente las
-- metas y un escalón de confianza que siempre venía con el mismo valor. **No
-- miraba la voz.** O sea que el cron los habría dado por buenos para siempre —
-- era deuda ya anotada en `saludos.ts` y en 20260817090000, donde hubo que
-- hacer esto mismo a mano para dos personas.
--
-- El arreglo de fondo va en `lib/world/saludos.ts`: la huella ahora incluye la
-- voz y la procedencia, y lleva delante una versión de la receta (`v2:`) para
-- poder invalidar todo cuando lo que cambia es el prompt y no el dato.
--
-- Con eso alcanzaría. Este `null` va igual, para todos y sin condición, porque
-- no quiero que la regeneración dependa de que la huella vieja y la nueva
-- difieran por casualidad, ni del orden en que salgan la migración y el deploy.
-- Es barato: la próxima tanda del cron los rehace de a tres.
update people set saludos_de = null;
