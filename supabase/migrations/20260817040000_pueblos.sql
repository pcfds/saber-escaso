-- Los que no son humanos no son mobs: son pueblos.
--
-- Un bicho que aparece porque sí y te pega porque sí es una barra de vida con
-- patas. Uno que vino porque le quemaron el nido, que habla una lengua que
-- podrías aprender, y que puede terminar aliado tuyo según lo que pase en el
-- mundo, es un personaje.
--
-- Esto también hace que matar tenga costo real y no sólo moral: cada pueblo
-- sabe cosas que ningún humano sabe. Si los matás a todos, ese saber se fue —
-- igual que cuando se muere el último herrero, pero además nunca vas a poder
-- aprenderlo.

create table peoples (
  id           uuid primary key default gen_random_uuid(),
  region_id    uuid not null references regions(id) on delete cascade,
  slug         text not null,
  name         text not null,
  lengua       text not null,              -- cómo suena su lengua
  -- Por qué están enojados. No es sabor: se puede averiguar hablando, y
  -- resolverlo es lo que puede darlos vuelta.
  agravio      text not null,
  -- Los dos ejes, a escala de pueblo. Igual que con la gente, pero el pueblo
  -- entero se acuerda de lo que le hiciste a cualquiera de los suyos.
  aprecio      integer not null default -20,
  temor        integer not null default 0,
  unique (region_id, slug)
);

-- Las amenazas dejan de ser anónimas: cada una pertenece a alguien.
alter table threats add column people_id uuid references peoples(id) on delete set null;
alter table threats add column nombre text;   -- sí, tienen nombre

-- Y saben cosas. `knows.holder_kind` ya es polimórfico, así que un pueblo
-- puede tener saberes sin tocar esa tabla.
alter table knows drop constraint if exists knows_holder_kind_check;
alter table knows add constraint knows_holder_kind_check
  check (holder_kind in ('person', 'player', 'people'));
