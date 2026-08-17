-- ─────────────────────────────────────────────────────────────────────────
-- LOS QUE LLEGAN — que el valle deje de tener fecha de vencimiento
-- ─────────────────────────────────────────────────────────────────────────
--
-- `DISENO.md` §9.2 lo dice desde el primer día y desde el 17 de agosto está
-- medido: *"Viven, mueren y nacen. Los nacimientos no son decoración: sin ellos
-- una región sin jugadores se despuebla monotónicamente y el saber sólo puede
-- bajar."* Medido en ocho valles de laboratorio, 250 ticks cada uno: de siete
-- personas a cuatro, y de seis saberes vivos a 3,63. **Estrictamente
-- decreciente las dos curvas.**
--
-- Esto es la mitad de datos del arreglo. La otra mitad está en `tick.ts`.
--
-- ── Por qué llega gente y no nacen bebés ─────────────────────────────────
--
-- Un tick es un día del valle. Un chico que nace hoy no sirve para nada hasta
-- dentro de doce años, o sea **4.380 ticks — tres años reales** de una fila
-- inerte, y en el medio el director tendría que narrar a un recién nacido
-- volviendo del Sotobosque con carbón. La función que pide §9.2 es que la
-- población se recomponga, y a esta escala de tiempo eso no lo puede dar una
-- cuna.
--
-- Lo da la geografía, que ya estaba escrita: §7.4 dice que la cordillera tiene
-- **una sola abertura, al norte**, por donde entra El Camino del Norte, y que
-- *"cuando el mundo crezca, crece por ahí"*. Y ya vive alguien ahí cuyo oficio
-- entero es ver quién entra y quién sale. Así que el valle se recompone por su
-- única puerta, y el que entra es alguien que puede trabajar hoy.
--
-- ── Por qué la gente que llega está escrita a mano y no generada ─────────
--
-- §9.2: un NPC es identidad, historia y voz propia. El valle tiene siete
-- personas escritas a mano que se distinguen tapando el nombre, y ésa es la
-- vara. Un habitante armado con plantillas en tiempo de tick es un maniquí.
--
-- Y hay un invariante de por medio: **`tick.ts` no puede llamar a un modelo.**
-- Así que la voz no la puede escribir el tick. La escribe el autor, antes, y
-- la guarda acá — que es exactamente lo que `DISENO.md` describe en "La gente
-- vive su propia vida": *"el autor corre cada tanto, lee lo que pasó, y escribe
-- hechos nuevos en la base... No narra: siembra. Después la simulación los
-- ejecuta sola, determinista."*
--
-- La simulación decide **si**, **cuándo**, **dónde**, **quién lo vio llegar** y
-- **qué se encontró al llegar**. El autor decide **quién es**. Esa línea es la
-- misma que separa al tick del director, y no se cruza.
--
-- Estas seis salieron escritas con las mismas reglas que las siete del `seed`:
--
--   · `voice` es REGISTRO, nunca un conteo de palabras ni una prohibición
--     gramatical: "habla poco y va al grano" sí, "frases de cuatro palabras"
--     no, porque para cumplir el número el modelo tira artículos y salen
--     telegramas agramaticales. Y ninguna pide una forma que obligue a inventar
--     hechos.
--   · `procedencia` es COSTUMBRE compartida —cómo nombra los sitios, en qué
--     mide, a quién trata de usted—, separada de `historia`, que es biografía.
--     Mezcladas, el modelo narra la biografía como estilo.
--   · Ninguna nombra un lugar, una persona ni un suceso del valle: son de
--     afuera y no lo conocen. Lo único del valle que las toca lo escribe el
--     tick al final de `historia`, y sale de `events`.
--   · Nada de voseo. El valle entero cambió de registro el 17 de agosto y esto
--     nace ya con el registro nuevo: castellano llano, "aquí" y no "acá".
--
-- ── Ninguna llega sabiendo nada, y ése es el punto ───────────────────────
--
-- `knows` se queda vacío. Es lo que exige §8: si el que llega trajera un
-- oficio, la muerte de Ilde dejaría de costar algo y la escasez sería
-- decorativa. Lo que trae es una CABEZA VACÍA, que es lo único que le faltaba
-- al valle: la enseñanza —espontánea y buscada— ya existe y es lo único que
-- multiplica el saber (§8.2, *"al terminar, dos personas saben"*), pero se
-- apaga sola cuando no queda nadie a quien enseñarle. Un valle de cuatro donde
-- los cuatro ya saben lo mismo no puede copiar nada.
--
-- Por eso `trade` no es `knows`: **el oficio es un papel social, el saber es la
-- receta.** El precedente está en el `seed` y son dos de sus mejores personajes
-- — Sarn es guardia y no sabe hacer absolutamente nada; Tobio es el chico del
-- camino y tampoco. Nadie los llamaría maniquíes.

-- ── El cupo de un valle ───────────────────────────────────────────────────
--
-- Cuánta gente sostiene esta región. No es una opinión sobre cuánta gente entra
-- en un valle: es el número que pone el equilibrio donde el valle fue escrito.
-- Con el `seed` de siete personas y la mortalidad medida (~0,011 por tick entre
-- el sorteo y las salidas), un cupo de 9 deja la población oscilando alrededor
-- de 7. La cuenta entera está en `tick.ts`, en `P_NACIMIENTO`.
--
-- Se guarda por región y no como constante porque el día que el generador haga
-- un valle más grande, este renglón es donde lo dice.
alter table regions add column if not exists cupo integer not null default 9;

comment on column regions.cupo is
  'Cuánta gente sostiene esta región. Techo de los nacimientos: el equilibrio '
  'queda dos por debajo. Ver P_NACIMIENTO en lib/world/tick.ts.';

-- Backfill: la gente con la que la región fue sembrada (`born_tick = 0`) más
-- dos. El `greatest` es para que una región vacía no quede con un cupo por
-- debajo del piso de tres que respetan el sorteo de muerte y las salidas.
update regions r set cupo = greatest(5, 2 + (
  select count(*) from people p where p.region_id = r.id and p.born_tick = 0
));

-- ── La gente que todavía no llegó ─────────────────────────────────────────
--
-- Global, sin `region_id`, igual que `knowledge`: es un catálogo del autor, no
-- estado de un mundo. Qué región se llevó a quién se sabe mirando `people`, y
-- por eso no hay columna de "usado": el tick descarta a los que ya tienen una
-- fila con ese nombre en esa región, vivos o muertos. Un nombre no se recicla
-- nunca — que vuelva a llegar alguien que se murió acá es la peor frase que
-- podría producir este juego.
create table if not exists por_llegar (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  -- Tiene que ser una clave de `METAS` en `tick.ts`, o esta persona persigue
  -- para siempre la misma meta por defecto y el valle queda con un disco
  -- rayado. Las claves llevan género porque las metas están escritas a mano.
  trade       text not null,
  -- Cómo se cuenta que llegó, sin que el summary tenga que concordar con nada:
  -- "un hombre", "una muchacha". En castellano no hay forma de escribir una
  -- frase neutra sobre alguien cuyo género sale de una tabla, así que sale de
  -- la tabla.
  llega       text not null,
  disposition text not null,
  voice       text not null,
  procedencia text not null,
  historia    text not null,
  teaches     boolean not null default false
);

comment on table por_llegar is
  'Catálogo del autor: gente escrita a mano que puede entrar a un valle cuando '
  'haya lugar. El tick elige, nunca inventa. Ninguna llega sabiendo nada.';

insert into por_llegar (slug, name, trade, llega, teaches, disposition, voice, procedencia, historia) values

('nera', 'Nera', 'jornalera', 'una mujer', false,
 'Trabaja para quien pague y se va antes de la cena. Acepta cualquier tarea y discute el precio de todas.',
 'Empieza por lo que no va a hacer y termina aceptando, en la misma respuesta. Repite la última palabra de quien le habla antes de contestar, como quien la sopesa. Habla del trabajo con detalle y de sí misma con dos palabras. No usa el nombre de nadie: dice "tú", "el de la fragua", "la del río". Cuando algo le parece mal lo dice una vez y después lo hace igual. Tutea a todo el mundo y no cambia de trato con nadie.',
 'Se crió mudándose: tres inviernos en un sitio, dos en otro, donde hubiera trabajo. No tiene nombres propios para los lugares y usa el oficio en su lugar: donde el hierro, donde el agua, donde pagan. Mide en jornales y en pagas, nunca en días ni en estaciones. Si le preguntan de dónde es, contesta con el último sitio donde trabajó y no con ninguna casa. Aprendió a preguntar el precio antes que el nombre y se le nota en el orden en que dice las cosas.',
 'Trabajó ocho inviernos por jornal y no juntó nada, porque cada sitio le costó lo que había ganado en el anterior. Iba con alguien y dejó de ir; de eso no habla, y si se lo rozan cambia de tema con una pregunta sobre el trabajo. No sabe hacer nada que no sea con la espalda, y lo dice de frente antes de que se lo pregunten.'),

('amaro', 'Amaro', 'guardia', 'un hombre', false,
 'Se pega a quien lo trate bien y se queda más de lo que le conviene. Le tiene miedo a la noche y no lo esconde.',
 'Cuenta todo dos veces: primero lo que pasó y después lo que sintió, y la segunda vez es más larga. Toca madera y lo dice en voz alta. Pregunta si hizo bien apenas termina de hacer algo. Nunca contradice a nadie en el momento: se calla y lo saca tres frases después. Trata de usted a los mayores y tutea a los demás, y se equivoca a menudo con quién es cuál.',
 'Viene de un sitio donde la gente no salía después de que oscurecía, y lo cuenta como si fuera lo normal en todas partes. Cuenta el tiempo en noches y no en días: dos noches, la noche pasada, la que viene. Los lugares los nombra por lo que hay que cruzar para llegar, el otro lado del agua, pasado el monte, y no por su nombre. No dice el nombre de nada que le dé miedo: lo señala o le dice "eso".',
 'Se contrató de guardia en tres sitios y en los tres se quedó más tiempo del que le pagaban, porque le costaba irse. En el último dejó pasar a alguien que no debía y no lo va a contar, aunque lo tiene en la punta de la lengua todo el rato. No sabe hacer nada con las manos y lo compensa haciendo turnos que nadie le pidió.'),

('sela', 'Sela', 'cazadora', 'una mujer', true,
 'Explica lo que hace mientras lo hace, le hayan preguntado o no. Enseña a cualquiera que se quede quieto un rato.',
 'Explica lo que está haciendo mientras lo hace, sin que nadie se lo pida, y se interrumpe para señalar algo. Compara todo con otra cosa: esto es como aquello, esto se agarra como se agarra lo otro. Corrige a quien tiene delante con suavidad y sin pedir permiso. Pregunta el nombre de las cosas de aquí y lo repite en voz alta para no olvidarlo. Tutea desde la primera frase.',
 'Se crió en un sitio alto y frío donde el monte se acababa pronto, y todo lo que ve aquí le parece grande y lo dice. Nombra los lugares por lo que crece en ellos, donde el roble, donde el junco, porque así se los enseñaron. Mide las distancias en lo que tarda en andarlas y las cuenta en voz alta antes de salir. Trata de usted a quien tenga un oficio y tutea al resto, y no le parece que eso sea una distinción.',
 'Aprendió a cazar de una mujer que no le enseñó nada más y que se murió sin decirle por qué la había elegido a ella. Desde entonces le enseña a cualquiera lo poco que sabe, y lo hace deprisa, como quien reparte algo antes de que se le caiga. Vino siguiendo un monte que le dijeron que era grande. No conoce estas sendas y lo dice cada vez que entra.'),

('vidal', 'Vidal', 'hilandero', 'un hombre', true,
 'Un hombre en el telar, y le hace gracia que a la gente le extrañe. Trabaja despacio y no acepta que le metan prisa.',
 'Habla despacio y deja el final de las frases colgando, y espera a que el otro lo complete. Se ríe de sí mismo antes que nadie. Contesta a las preguntas difíciles con un dicho, y si le insisten, con el mismo dicho. Nunca dice que algo está terminado: dice que le falta poco. Trata de usted a todo el mundo la primera vez y tutea a partir de la segunda.',
 'Es de una casa donde se hilaba y todos hablaban a la vez, así que aprendió a decir lo suyo entre medio y sin levantar la voz. Cuenta las cosas por pares y por docenas, que es como se contaba allí, incluso lo que no se cuenta así. Nombra los lugares por quién vive en ellos y no por su nombre. Mide el tiempo en lo que se tarda en hacer algo con las manos.',
 'Hiló para una casa grande hasta que la casa dejó de pagar, y se fue con el telar a cuestas y sin discutir. Tiene una pieza empezada desde entonces y no la termina; dice que le falta poco desde hace tres inviernos. Vino porque le contaron que aquí crece lino en la orilla y que nadie lo estaba levantando.'),

('quila', 'Quila', 'hilandera', 'una muchacha', false,
 'Muy joven y con prisa. Quiere que le encarguen algo y todavía no le encargaron nada.',
 'Ofrece antes de que le pidan y se adelanta a contestar preguntas que nadie hizo. Habla en futuro casi siempre: lo que va a hacer, lo que va a traer, lo que va a aprender. Se queda callada de golpe cuando se da cuenta de que habló de más. No pregunta nada por miedo a que la vean sin saber. Tutea, y con quien la intimida se le va la voz hacia arriba al final de las frases.',
 'Se crió en una casa apretada donde había que pedir turno para hablar, y todavía habla como si se lo fueran a quitar. Nombra los lugares con el nombre entero y completo, aprendido de oído y a veces mal dicho. Mide en manos y en pasos, porque es lo que lleva encima. Trata de usted a cualquiera que le lleve años, sin excepción, y le sale sin pensarlo.',
 'Salió de su casa antes de que la casaran con alguien a quien había visto dos veces, y no le dijo a nadie que se iba. Hila lo justo para que se le note que aprendió mirando y no haciendo. Llegó con una madeja y con nada más, y la lleva encima aunque no le sirva de nada.'),

('anse', 'Anse', 'aprendiz', 'un chico', false,
 'Mira trabajar y no pregunta. Se le nota que está aprendiendo algo y no dice qué.',
 'Contesta con una palabra y con la cabeza, y hay que sacarle lo demás. Cuando por fin habla de un oficio se le suelta la lengua y no para hasta que se da cuenta. Dice "no sé" sin que le cueste nada, y es de las pocas cosas que dice enteras. Nunca pide: se queda cerca hasta que se lo ofrecen. Trata de usted a quien trabaja con las manos y tutea al resto.',
 'Es de un sitio donde a los chicos no se les hablaba hasta que servían para algo, y todavía espera a que le den permiso. Nombra los lugares señalándolos y sólo dice el nombre si no le queda otra. No mide el tiempo: dice antes y después, y hay que averiguar de qué. Repite las palabras nuevas por lo bajo cuando cree que no lo escuchan.',
 'Estuvo en dos talleres y en los dos lo echaron por mirar demasiado y trabajar poco, que es la misma cosa vista desde los dos lados. Aprende con los ojos, y le sale mal la primera vez y bien la cuarta. Vino andando y no dice desde dónde. No sabe hacer nada todavía y es la única cosa suya de la que habla sin que le pregunten.')

on conflict (slug) do nothing;
