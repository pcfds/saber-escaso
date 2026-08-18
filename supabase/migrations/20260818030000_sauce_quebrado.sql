-- ═══════════════════════════════════════════════════════════════════════════
-- SAUCE QUEBRADO — el segundo pueblo
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Pedido de la dirección: *"seguí con las misiones y el segundo pueblo"*.
--
-- Hasta hoy el valle tenía cinco lugares y **un solo sitio donde vive gente**:
-- Vado Bajo, más la fragua con dos, el bosque donde nadie duerme, una ruina y
-- un camino. Todo lo que este juego es —que el saber viva en gente mortal, que
-- haya que ganarse a alguien, que algo se pierda cuando alguien se muere— pasa
-- adentro de un radio de veinte metros. No es un valle: es un patio.
--
-- ── POR QUÉ ESTE PUEBLO Y NO UNO CUALQUIERA ────────────────────────────────
--
-- Un segundo pueblo que es el primero otra vez no agrega nada: son once casas
-- más y once nombres más para el mismo bucle. **Un lugar nuevo tiene que
-- contestar por qué caminarías cien metros para ir.**
--
-- Sauce Quebrado contesta con lo único que en este juego vale el viaje: **tiene
-- un saber que Vado Bajo no tiene, y ese saber cierra heridas.** Hasta hoy la
-- única forma de curarse era dormir o el cuenco de cuajada; el emplasto es la
-- primera cosa del valle que existe para que otro te cure a vos.
--
-- Y va en las dos direcciones, que es lo que lo vuelve un vínculo y no una
-- tienda: Nevia hierve la corteza y **le falta el frasco**, que sólo sabe hacer
-- Odila, en Vado Bajo. O sea que el pueblo nuevo depende del viejo desde el
-- primer día. Ese encargo es el primer objetivo del juego que **no se resuelve
-- en el lugar donde te lo dan** — hay que cruzar el valle con algo en la mano.
--
-- ── EL NOMBRE ──────────────────────────────────────────────────────────────
--
-- Se llamó «Vado Alto» durante media hora y se cambió al mirar el terreno:
-- `altura_en()` es una cúpula, no un cuenco —el centro está alto y el borde
-- bajo—, así que un pueblo lejos del centro está **más abajo** que Vado Bajo,
-- por 1,8 m. Nadie lo iba a medir nunca; el punto es que el nombre no puede ser
-- una afirmación falsa sobre el mundo, porque el director LEE los nombres y
-- narra sobre ellos.
--
-- «Sauce Quebrado» dice lo que hay: los sauces de la orilla, que son de donde
-- sale la corteza del emplasto. El nombre explica por qué la curandera está ahí
-- y no en otro lado.

-- ── EL LUGAR ───────────────────────────────────────────────────────────────
--
-- `kind = 'aldea'` igual que Vado Bajo, y eso no es pereza: `makes_at` y la
-- familia de muro del cliente cuelgan del kind, así que un kind nuevo sería
-- pedirle a las dos puntas que sepan de un tipo de lugar que no cambia nada.
-- Lo que lo distingue son la gente y lo que se sabe ahí, que es como se
-- distinguen los lugares en este juego.

insert into places (region_id, slug, name, kind, description)
select r.id, 'sauce', 'Sauce Quebrado', 'aldea',
  'Cinco casas río arriba, entre sauces partidos por el hielo. Se hierve corteza todo el año y el olor no se va.'
  from regions r
 where not exists (
   select 1 from places p where p.region_id = r.id and p.slug = 'sauce');

-- ── EL SABER QUE SÓLO ESTÁ ALLÁ ────────────────────────────────────────────
--
-- `kind = 'receta'`, como el destilado y la cuajada: no es un oficio con el que
-- te ganes la vida, es algo que sabés hacer con las manos.
--
-- `makes_at = 'sauce'` y ahí está la mitad del punto: **es el primer saber del
-- juego que no se puede practicar en Vado Bajo.** Aunque te lo enseñen, para
-- hacerlo tenés que estar allá, donde están los sauces. Un saber atado a un
-- lugar es la forma más barata que tiene este mundo de hacer que un lugar
-- importe.
--
-- `para_que` nombra LA COSA y no el mecanismo (§8.2b): no dice «restaura 40 de
-- vida». Dice qué te deja hacer que antes no podías, que es la prueba que
-- `DISENO.md` le exige a cada saber nuevo.
insert into knowledge (slug, name, kind, description, makes, makes_at, para_que)
values (
  'emplasto-de-sauce',
  'Emplasto de sauce',
  'receta',
  'Hervir corteza de sauce hasta que suelta el amargo, y atarla en un paño mientras está caliente. Se hace en Sauce Quebrado porque es donde están los sauces; con corteza traída de otro lado sale flojo y nadie sabe bien por qué.',
  'emplasto de corteza',
  'sauce',
  'Te deja hacer un emplasto en Sauce Quebrado. Es lo único del valle que cierra una herida sin dormir y que además le podés dar a otro: hasta ahora, el que se caía se curaba solo o no se curaba.'
)
on conflict (slug) do update set
  name = excluded.name, kind = excluded.kind,
  description = excluded.description,
  makes = excluded.makes, makes_at = excluded.makes_at,
  para_que = excluded.para_que;

-- ── LOS TRES QUE VIVEN AHÍ ─────────────────────────────────────────────────
--
-- Tres y no once. Un pueblo se lee por la gente que tiene adentro, no por la
-- cantidad de techos, y once nombres nuevos escritos de apuro valen menos que
-- tres escritos como los siete que ya están. El cliente le pone cinco casas:
-- **las que sobran quedan cerradas, y eso dice lo que el juego quiere decir** —
-- acá vivía más gente.
--
-- `procedencia` es la capa compartida del habla y las tres comparten una nueva,
-- `sauce`, por el mismo motivo por el que Ilde y Marta comparten `valle`: dos
-- que se criaron en el mismo sitio suenan igual aunque tengan caracteres
-- opuestos, y eso es lo que la vuelve audible como procedencia y no como
-- personalidad.
--
-- Los nombres se eligieron contra los que ya existen en la base —Anse, Bruno,
-- Corvín, Ilde, la vieja Ren, Marta, Nera, Odila, Sarn, Sela, Tobio—: el
-- tejedor se iba a llamar Anse y ya hay uno. El `where not exists` de abajo lo
-- habría saltado en silencio y **el pueblo habría nacido con dos habitantes en
-- vez de tres**, sin un error en ninguna parte.
--
-- Ninguna `historia` nombra un suceso, una persona o un lugar que no esté en la
-- base. Es la regla que ya se pagó una vez: el autor puso a un muerto en una
-- pieza fechada antes de que naciera, y el arreglo fue no darle nunca al modelo
-- material que no pueda verificar.

insert into people (
  region_id, place_id, name, trade, disposition, teaches,
  voice, procedencia, historia, home_place_id, jornada_desde, jornada_hasta)
select
  r.id, pl.id, v.name, v.trade, v.disposition, v.teaches,
  v.voice,
  -- ⚠ Acá va el TEXTO de la procedencia, no la clave. `seed.ts` guarda la
  -- clave en su tabla y la expande al insertar (`PROCEDENCIAS[spec.procedencia]`);
  -- una migración no pasa por ahí. Guardar 'sauce' pelado dejaría a los tres
  -- con una procedencia de seis letras, que para el modelo es exactamente
  -- nada — y no fallaría: hablarían igual, un poco más planos, y nadie se
  -- enteraría nunca. La misma clave queda escrita en `seed.ts` para los valles
  -- que nazcan de cero.
  'Se crió en Sauce Quebrado, río arriba, donde son cinco casas y se conocen todos. Nombra a la gente por el oficio y no por el nombre —el herrero, la que cura, el del vado—, que es como se nombra donde nadie hace falta distinguirlo de otro. Mide las distancias en cruces del río y en cuánto tarda el agua en bajar, nunca en leguas. Habla de Vado Bajo como de un sitio grande y algo ajeno: dice abajo, el pueblo grande, allá. Menciona los sauces y la corteza sin explicarlos, como quien habla de algo que hay en todas partes. Y no da nada por sabido de quien viene de afuera: pregunta de dónde es antes de contestar.',
  v.historia, pl.id, v.desde, v.hasta
from regions r
join places pl on pl.region_id = r.id and pl.slug = 'sauce'
cross join (values
  (
    'Nevia', 'curandera',
    'Cura a cualquiera que llegue caminando y no pregunta de qué se cayó. Enseña, pero tarde: primero quiere ver si volvés.',
    true,
    'Da instrucciones en vez de opiniones: qué hacer, en qué orden y cuánto esperar. Pregunta por el cuerpo antes que por el nombre — dónde duele, desde cuándo, si podés apoyarlo. No consuela y no se alarma; lo peor y lo mejor los dice con el mismo tono. Cuando alguien exagera, lo corta con un dato. Trata de usted a los que no conoce y pasa al tú cuando ya te curó una vez.',
    'Hierve corteza desde que tiene memoria porque su madre hervía corteza. Tuvo el frasco de Odila una sola vez y le rindió el doble; desde entonces guarda el emplasto en paños, que se secan, y lo dice cada vez que alguien se lo pregunta. No sale de Sauce Quebrado ni para ir a buscarlo.',
    6, 21
  ),
  (
    'Tolmo', 'vadeador',
    'Conoce el paso del río con el agua alta y cobra por cruzar a los que no. Se guarda las dos cosas que sabe del vado y no piensa enseñarlas.',
    false,
    'Habla del tiempo y del agua todo el rato, y es literal: para él el agua alta o baja explica casi todo. Cuenta las cosas por el orden en que pasaron, con los días contados, y se pierde en detalles del camino. Nunca dice que algo es peligroso; dice cuánto cuesta. Tutea a todo el mundo y llama a la gente por el oficio antes que por el nombre.',
    'Cruza gente desde antes de que el puente de tablas se pudriera, y desde que se pudrió cobra el doble. Le tiene bronca al camino del norte porque el que llega por ahí no le paga a nadie. Sabe que Nevia lo curó dos veces y no le cobra a ella.',
    5, 20
  ),
  (
    'Beruta', 'tejedor',
    'Teje de espaldas a la puerta y contesta sin levantar la vista. Enseña a quien se sienta al lado y se calla.',
    true,
    'Frases largas y tranquilas, con el hilo de la conversación bien agarrado: retoma lo que le dijeron hace tres frases. Habla de las cosas por cómo están hechas —qué aguanta, qué se deshilacha, cuánto lleva— y de la gente casi nunca. Nunca interrumpe y no sube el tono. Trata de usted a todo el mundo, siempre, y no cambia ni con los que conoce hace años.',
    'Se quedó en Sauce Quebrado cuando el resto de su casa se fue río abajo, y teje para los cinco techos que quedan. Guarda el telar de su hermana sin usarlo. Cuando le sobra paño se lo lleva a Nevia, que lo corta para los emplastos.',
    6, 22
  )
) as v(name, trade, disposition, teaches, voice, historia, desde, hasta)
where not exists (
  select 1 from people q where q.region_id = r.id and q.name = v.name);

-- Nevia es la única que lo sabe, en todo el valle. Ése es el punto entero: si
-- se muere sin enseñarle a nadie, no hay más emplastos y no los va a haber
-- nunca. Destreza alta y muchas veces — lo hace desde que tiene memoria.
insert into knows (holder_kind, holder_id, knowledge_id, learned_from, how, learned_tick, destreza, veces)
select 'person', p.id, k.id, null, 'origen', 0, 84, 11
  from people p
  join knowledge k on k.slug = 'emplasto-de-sauce'
 where p.alive and p.name = 'Nevia'
   and not exists (
     select 1 from knows w
      where w.holder_kind = 'person' and w.holder_id = p.id
        and w.knowledge_id = k.id)
on conflict do nothing;

-- ── EL ENCARGO QUE CRUZA EL VALLE ──────────────────────────────────────────
--
-- Lo que hace que el pueblo nuevo no sea un decorado. `needs_object` es un
-- frasco de raíz, que se hace en la aldea con `destilado-de-raiz` — o sea que
-- **el objetivo se te da en un pueblo y se resuelve en el otro.** Es el primer
-- encargo del juego que obliga a caminar, y ahora se puede ver: `/mundo` manda
-- los encargos y el panel de objetivos los dibuja.
insert into agendas (person_id, goal, needs_kind, needs_object, started_tick)
select p.id, 'guardar el emplasto en algo que no lo seque', 'object', 'frasco de raíz', 0
  from people p
 where p.alive and p.name = 'Nevia'
   and not exists (select 1 from agendas a where a.person_id = p.id);

insert into agendas (person_id, goal, needs_kind, needs_object, started_tick)
select p.id, 'rehacer el paso de tablas antes de que suba el agua', 'object', 'hoja templada', 0
  from people p
 where p.alive and p.name = 'Tolmo'
   and not exists (select 1 from agendas a where a.person_id = p.id);
