-- El latido del mundo, con fecha y con quién lo pidió.
--
-- POR QUÉ EXISTE ESTA TABLA
--
-- `regions.tick` dice en qué día va el valle y no dice **cuándo** pasó ese día
-- ni **quién** lo hizo pasar. Con eso solo no se puede contestar la pregunta de
-- la que cuelga toda la calibración del juego —cada probabilidad del tick está
-- escrita "por tick"—:
--
--     ¿cuántos ticks corrieron en las últimas 24 horas, y cuántos los disparó
--     el cron contra una acción de un jugador?
--
-- El ROADMAP daba por hecho que el test de siete días son 28 ticks (el cron,
-- cada seis horas) y él mismo se corrigió: cada acción de jugador dispara un
-- `step()` además del cron, así que 28 era el piso y nadie midió el techo. Sin
-- medirlo no se puede tocar la tasa de muerte, que es la tesis del juego.
--
-- POR QUÉ UN TRIGGER Y NO UNA LÍNEA EN `tick.ts`
--
-- Porque `step()` se llama desde cuatro lados —el cron (`api/tick.ts`), la web
-- (`lib/web.ts`), el loop local (`lib/world/run.ts`) y `pnpm tick` a mano— y un
-- registro que dependa de que cada llamador se acuerde de anotar es un registro
-- que miente el día que alguien agrega el quinto. Acá el hecho registrado es el
-- mismo que define el tick: `regions.tick` cambió de valor. Un tick que corrió
-- y no quedó anotado es imposible por construcción, que es la misma propiedad
-- que hace confiable a `events`.
--
-- POR QUÉ UNA TABLA Y NO UNA COLUMNA
--
-- Una columna `regions.last_tick_at` contesta "cuándo fue el último" y nada
-- más: la pregunta es un **conteo por ventana de tiempo y por origen**, o sea
-- una serie. Y son cuatro filas por día real y por región: la tabla entera de
-- un test de siete días son ~30 filas. Un evento en `events` tampoco servía —
-- `events` es lo que pasó *en el mundo* y lo lee el director; un tick es
-- infraestructura y el director no tiene por qué poder narrarlo.

create table if not exists ticks (
  region_id uuid not null references regions(id) on delete cascade,
  tick      integer not null,
  -- Reloj de pared. Todo lo que se pregunta acá es "en las últimas N horas",
  -- y eso no se puede contestar con un contador de ticks.
  at        timestamptz not null default now(),
  -- 'cron'     → lo disparó el reloj (el cron de Vercel, `pnpm tick`, run.ts).
  --              O sea: todo lo que no reclamó una acción de un jugador.
  -- 'jugador'  → lo disparó tráfico de alguien jugando (`lib/web.ts`).
  -- null       → NO MEDIDO. Son los ticks anteriores a esta migración,
  --              reconstruidos del backfill de abajo. Es la misma convención
  --              que `chronicles.unbacked_names`: null no es cero.
  origin    text check (origin in ('cron', 'jugador')),
  -- Un tick por región y por número. Es lo que hace que el reclamo previo de
  -- `web.ts` sea atómico: dos lambdas que quieran el mismo tick a la vez, uno
  -- solo se lo lleva.
  primary key (region_id, tick)
);

-- Sin índices además del primary key, a propósito. La clave ya sirve para
-- "¿cuál fue el último tick de esta región?" (`order by tick desc limit 1`) y
-- el conteo por ventana recorre una tabla de decenas de filas. Índices cuando
-- se mida, no antes.

create or replace function anotar_tick() returns trigger
language plpgsql as $$
begin
  -- 'cron' es el default y no una afirmación: significa "nadie reclamó este
  -- tick como suyo". `web.ts` inserta la fila con 'jugador' ANTES de llamar a
  -- `step()`, así que cuando el tick termina y `regions.tick` cambia, este
  -- insert choca con esa fila y no la pisa.
  insert into ticks (region_id, tick, origin)
  values (new.id, new.tick, 'cron')
  on conflict (region_id, tick) do nothing;
  return null;
end $$;

drop trigger if exists regions_tick_anotado on regions;
create trigger regions_tick_anotado
  after update of tick on regions
  for each row when (new.tick is distinct from old.tick)
  execute function anotar_tick();

-- ─────────────────────────────────────────────────────────────
-- Backfill: los ticks que ya corrieron
-- ─────────────────────────────────────────────────────────────
--
-- No hay registro de cuándo corrió cada tick pasado, pero sí hay una huella
-- fiel: `events.created_at`. Un tick que produjo eventos los insertó todos
-- juntos al final de `step()`, así que el primer `created_at` de un tick es,
-- con precisión de milisegundos, cuándo corrió ese tick.
--
-- Qué NO recupera, y hay que saberlo antes de leer estos números:
--
--   · Los ticks que no produjeron ningún evento no dejan huella y no aparecen.
--     El conteo histórico es un PISO, no el total. Los nuevos sí son exactos.
--   · El origen es irrecuperable: quedan en null, que es "no medido".
--
-- `e.tick <= r.tick` no es adorno: `web.ts` escribe eventos de combate y de
-- llegada en `region.tick + 1` (el día en curso, que todavía no cerró). Sin ese
-- filtro el backfill inventaría una fila para un tick que nunca corrió, y el
-- throttle de `web.ts` la creería y se quedaría sin latir.

insert into ticks (region_id, tick, at, origin)
select e.region_id, e.tick, min(e.created_at), null
from events e
join regions r on r.id = e.region_id
where e.tick <= r.tick
group by e.region_id, e.tick
on conflict (region_id, tick) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Cómo se consulta
-- ─────────────────────────────────────────────────────────────
--
-- La pregunta se hace desde scripts y desde supabase-js, que no manda SQL
-- suelto. Se deja hecha para que la respuesta sea siempre la misma cuenta y no
-- la que cada uno se arme:
--
--     select * from ticks_por_origen(24);
--     db.rpc('ticks_por_origen', { horas: 24 })

create or replace function ticks_por_origen(horas integer default 24)
returns table (region text, origin text, ticks bigint)
language sql stable as $$
  select r.slug, coalesce(t.origin, 'sin medir'), count(*)
  from ticks t
  join regions r on r.id = t.region_id
  where t.at > now() - make_interval(hours => horas)
  group by 1, 2
  order by 1, 2;
$$;
