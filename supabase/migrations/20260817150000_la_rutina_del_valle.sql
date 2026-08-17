-- ─────────────────────────────────────────────────────────────────────────
-- LA RUTINA DEL VALLE — casa, horario y noche
-- ─────────────────────────────────────────────────────────────────────────
--
-- El reclamo era *"no hay nada de mundo"*, *"que se vayan realmente a su casa,
-- entrar, dormir"*. El valle tenía reglas y no tenía rutina, y una rutina es lo
-- que hace que un lugar se sienta habitado.
--
-- Y la pieza que faltaba ya estaba construida: **el mundo sabe qué hora es.**
-- `DISENO.md` §7.3 — *el sol es el reloj del mundo* — y `web.ts` ya le manda al
-- cliente `momento_del_dia`, que el cielo usa para el sol y las ventanas. El
-- servidor no la miraba para nada.
--
-- ── LA CUENTA, QUE ES LO QUE DECIDE DÓNDE VIVE ESTO ──────────────────────
--
-- Un tick es un día del valle y el cron corre uno cada seis horas reales. O
-- sea:
--
--     1 día del valle  = 6 horas reales = 21.600.000 ms
--     1 hora del valle = 15 minutos reales
--     la noche (22:00–06:00, ocho horas del valle) = 2 horas reales
--
-- De ahí sale la decisión de diseño entera, y es una sola: **la rutina NO se
-- puede resolver en el tick.** Si el tick "manda a dormir" a alguien, esa
-- persona duerme un día entero del valle, no ocho horas — el tick es la unidad
-- y adentro del tick no hay horas. Peor todavía: si el tick le escribiera
-- `place_id = su casa` cada noche, al otro día tendría que volver a caminar
-- hasta donde estaba, y como cada viaje le cuesta el día (`diaGastado`), nadie
-- llegaría nunca a ninguna parte. Un valle donde todos vuelven a casa todas las
-- noches por escritura es un valle donde nadie hace nada.
--
-- Entonces se parte en dos, y esta tabla guarda sólo la mitad que es estado:
--
--   · **Lo que se guarda** — dónde duerme cada uno y en qué horas está en pie.
--     Son hechos de la persona, cambian poco y no dependen de la hora.
--   · **Lo que se calcula al consultar** — dónde está y si duerme AHORA. Sale
--     de `rutinaDe()` en `tick.ts`, con la hora del reloj de pared, y no toca
--     la base. Es continuo entre ticks, que es exactamente lo que la hora es.
--
-- `people.place_id` pasa a querer decir, sin ambigüedad, **dónde lo dejó su
-- jornada** — no dónde está a las tres de la mañana. Esa segunda pregunta la
-- contesta la rutina.
--
-- ── QUÉ SE EMITE, QUE ES LA TRAMPA DE ESTA TAREA ─────────────────────────
--
-- Nada de "se fue a dormir" y "se levantó". Catorce eventos diarios de gente
-- durmiendo convierten la crónica en una planilla, y la regla de la casa ya lo
-- dice: **un estado que cambió como todos los días no es noticia.** Lo que sí
-- es noticia es la AUSENCIA de rutina, y son dos, las dos por transición:
-- alguien que no volvió a dormir a su casa (`noche_afuera`) y un taller que no
-- abrió (`sin_abrir`). Medido sobre 800 días de valle: **0,080 eventos por día
-- entre las dos**, uno cada doce días del valle, el 7,1% de lo que emite el
-- valle. La cuenta completa está en `tick.ts`, en la pasada 6b.

-- ── El horario de cada oficio ─────────────────────────────────────────────
--
-- Global y sin `region_id`, igual que `knowledge` y `por_llegar`: un oficio se
-- trabaja a la misma hora en todos los valles. **Es catálogo del autor, no
-- estado de un mundo.**
--
-- Por qué una tabla por oficio y además dos columnas en `people`: el horario es
-- un hecho del OFICIO —la fragua abre temprano, la guardia es de noche— pero
-- quien lo cumple es una PERSONA, y hay personas que no lo cumplen (la vieja
-- Ren no tiene oficio y se acuesta a las dos). Así que la tabla decide el
-- horario **cuando alguien entra al valle**, y a partir de ahí vive en la fila
-- de esa persona, donde el autor lo puede torcer para uno solo sin moverle el
-- día a todos los herreros del mundo. Es el mismo reparto que ya usa
-- `procedencia`: el texto se comparte por origen y se guarda resuelto en cada
-- fila.
--
-- Las horas son horas del valle, 0 a 23, y `hasta` puede ser MENOR que `desde`:
-- eso es una jornada que cruza la medianoche, y es exactamente lo que hace el
-- guardia. Ver `despiertoA()` en `tick.ts`.
create table if not exists horarios (
  trade  text primary key,
  desde  smallint not null check (desde between 0 and 23),
  hasta  smallint not null check (hasta between 0 and 23),
  -- Una línea de por qué ese horario y no otro. No la lee el código: la lee el
  -- que venga a agregar un oficio y tenga que decidir a qué hora trabaja.
  porque text not null
);

comment on table horarios is
  'A qué hora está en pie cada oficio. Catálogo del autor: decide el horario de '
  'quien entra al valle, y desde ahí vive en people.jornada_desde/hasta.';

insert into horarios (trade, desde, hasta, porque) values
  ('herrera',          5, 20, 'La fragua se enciende antes que salga el sol y se apaga al caer.'),
  ('herrero',          5, 20, 'Igual que la herrera: el fuego manda y el fuego madruga.'),
  ('aprendiz',         5, 20, 'El mismo horario que el fuego, más el rato que le hagan quedarse.'),
  ('guardia',         18,  6, 'Al revés que todos: entra cuando oscurece y sale cuando amanece.'),
  ('cazadora',         4, 18, 'Sale de noche para estar en el monte cuando aclara, y vuelve con luz.'),
  ('cazador',          4, 18, 'Sale de noche para estar en el monte cuando aclara, y vuelve con luz.'),
  ('destiladora',      7, 23, 'El alambique no se deja solo: empieza tarde y termina más tarde.'),
  ('destilador',       7, 23, 'El alambique no se deja solo: empieza tarde y termina más tarde.'),
  ('hilandera',        7, 21, 'Se hila con luz y se sigue con vela mientras la vista aguante.'),
  ('hilandero',        7, 21, 'Se hila con luz y se sigue con vela mientras la vista aguante.'),
  ('jornalera',        5, 19, 'El jornal se paga por día entero y empieza cuando empieza el que paga.'),
  ('jornalero',        5, 19, 'El jornal se paga por día entero y empieza cuando empieza el que paga.'),
  ('chico del camino', 6, 21, 'Está despierto mientras pase gente, y por el camino pasa poca.'),
  -- Ren. El oficio dice "nadie sabe" y el horario también: no le rinde cuentas
  -- a ningún trabajo, así que se acuesta a las dos y se levanta a las diez. Es
  -- la única del valle a la que el jugador se va a cruzar despierta de noche
  -- sin que sea la guardia, y eso es información sobre ella.
  ('nadie sabe',      10,  2, 'No trabaja para nadie y no le debe la hora a nadie.')
on conflict (trade) do nothing;

-- ── Dónde duerme cada uno, y a qué hora está en pie ───────────────────────
--
-- `home_place_id` es la casa. Faltaba con nombre y todo: `tick.ts` ya decía en
-- un comentario que *«volver a casa» sin un `people.home_place_id` sería
-- inventarle una casa*, y por eso el que terminaba un mandado volvía a su
-- taller y no a ninguna cama.
alter table people add column if not exists home_place_id uuid references places(id) on delete set null;

comment on column people.home_place_id is
  'Dónde duerme. No es donde trabaja: la cazadora vive en la aldea y se pasa el '
  'día en el Sotobosque. Ver rutinaDe() en lib/world/tick.ts.';

alter table people add column if not exists jornada_desde smallint not null default 6
  check (jornada_desde between 0 and 23);
alter table people add column if not exists jornada_hasta smallint not null default 22
  check (jornada_hasta between 0 and 23);

comment on column people.jornada_desde is
  'Hora del valle (0-23) a la que se levanta. Si `hasta` es menor, la jornada '
  'cruza la medianoche: eso es el guardia. El default 6-22 es el día de '
  'cualquiera y sólo se usa para un oficio que no esté en `horarios`.';

-- Desde qué día del valle no vuelve a dormir a su casa. `null` es lo normal:
-- durmió en su cama anoche.
--
-- **Existe para no repetirse.** Sin esto, la persona que se queda cinco noches
-- revolviendo la Casa Quemada produce cinco veces la misma noticia, y a la
-- tercera el director la narra como si fuera nueva. Con esto la primera noche
-- es una transición y las otras cuatro son el estado de siempre. De paso deja
-- una cuenta que sirve para hablar: hace tres noches que no aparece.
alter table people add column if not exists durmio_fuera_desde integer;

-- El último día del valle en que este lugar abrió: alguien que trabaja ahí
-- estuvo ahí. Mismo motivo que la columna de arriba — la fragua que lleva un
-- mes apagada no es noticia todos los días, lo fue el día que no abrió.
alter table places add column if not exists ultimo_dia_abierto integer;

-- ── Backfill: el valle que ya existe ──────────────────────────────────────
--
-- El horario sale de la tabla de arriba, que es la única fuente. Lo que no
-- figure en `horarios` se queda con el default de la columna.
update people p
   set jornada_desde = h.desde, jornada_hasta = h.hasta
  from horarios h
 where h.trade = p.trade;

-- La casa: donde está hoy, si es un lugar donde se puede vivir.
update people p
   set home_place_id = l.id
  from places l
 where p.home_place_id is null
   and l.id = p.place_id
   and l.kind in ('aldea', 'fragua', 'camino');

-- Y al que la jornada dejó en el monte o en la ruina no lo vamos a hacer vivir
-- ahí: vive en la aldea, que es donde están las doce casas.
update people p
   set home_place_id = (select l.id from places l
                         where l.region_id = p.region_id and l.kind = 'aldea' limit 1)
 where p.home_place_id is null;

-- La excepción, y es una sola, y está escrita en su biografía por el autor:
-- *"Vivía en la Casa Quemada antes del incendio y se quedó adentro después."*
-- Ren es la única persona de este mundo que duerme en un lugar salvaje, y que
-- lo haga es la mitad de lo que la hace Ren. Se la nombra por nombre porque es
-- un personaje escrito a mano, no una regla: si mañana alguien más se muda a
-- una ruina, lo va a decidir el autor en su fila, no esta consulta.
update people p
   set home_place_id = (select l.id from places l
                         where l.region_id = p.region_id and l.kind = 'ruina' limit 1)
 where p.name = 'La vieja Ren'
   and exists (select 1 from places l where l.region_id = p.region_id and l.kind = 'ruina');

-- Y a los que hoy están lejos de su casa se les marca la noche de arranque con
-- el día en curso. Sin esto, el primer tick después de esta migración escupe
-- una tanda de «no volvió a dormir» de gente que hace semanas que anda por ahí:
-- la transición ya pasó, y lo que se emite es el estado, que es justo lo que
-- esto no quiere hacer.
update people p
   set durmio_fuera_desde = r.tick
  from places l, regions r
 where p.durmio_fuera_desde is null
   and p.alive
   and l.id = p.place_id
   and r.id = p.region_id
   and l.kind in ('bosque', 'ruina')
   and l.id is distinct from p.home_place_id;

-- `places.ultimo_dia_abierto` queda en null a propósito: null es "nunca lo
-- vimos abrir", y con eso el primer `sin_abrir` va a necesitar un día de
-- apertura de verdad antes de poder contar que no abrió. Una fragua que ya
-- estaba apagada no genera una noticia por haber corrido una migración.
