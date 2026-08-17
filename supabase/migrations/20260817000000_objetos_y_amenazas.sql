-- Objetos y amenazas.
--
-- La regla que hace que esto no sea un inventario más: un objeto sólo existe
-- si alguien SABE hacerlo. No hay drops de la nada, no hay tienda, no hay
-- receta escrita en ningún lado. Cuando se muere el último que sabe forjar,
-- no vuelve a haber una hoja nueva en el valle. Nunca.
--
-- Por eso `knowledge.makes` vive en la tabla del saber y no en una tabla de
-- recetas aparte: la receta NO es un objeto del mundo que se pueda copiar o
-- robar. Es una propiedad de lo que alguien sabe, y muere con quien lo sabe.

alter table knowledge add column makes text;        -- qué objeto produce
alter table knowledge add column makes_at text;     -- en qué tipo de lugar

create table objects (
  id            uuid primary key default gen_random_uuid(),
  region_id     uuid not null references regions(id) on delete cascade,
  kind          text not null,                      -- "hoja templada"
  quality       integer not null default 50,        -- 0..100

  -- Quién lo hizo. Se guarda el NOMBRE y no sólo el id porque el que lo hizo
  -- se puede morir, y que un objeto siga diciendo "lo forjó Ilde" veinte días
  -- después de que Ilde no está es exactamente lo que queremos que pase.
  made_by       text,
  made_tick     integer not null,

  holder_kind   text not null check (holder_kind in ('player', 'person', 'place')),
  holder_id     uuid not null,

  created_at    timestamptz not null default now()
);
create index on objects (region_id, holder_kind, holder_id);

-- Los monstruos del cliente eran teatro: vivían en la máquina de cada uno.
-- Acá viven en el mundo, los ve todo el mundo, y matarlos deja un evento que
-- el director puede narrar.
create table threats (
  id            uuid primary key default gen_random_uuid(),
  region_id     uuid not null references regions(id) on delete cascade,
  place_id      uuid not null references places(id) on delete cascade,
  kind          text not null,
  health        integer not null,
  max_health    integer not null,
  alive         boolean not null default true,
  spawned_tick  integer not null,
  killed_by     text,
  killed_tick   integer
);
create index on threats (region_id, alive);

-- Los seis saberes que ya existen pasan a producir cosas. Las runas no
-- producen nada material todavía; eso queda para cuando haya magia.
update knowledge set makes = 'hoja templada',   makes_at = 'fragua' where slug = 'forja-simple';
update knowledge set makes = 'filo de agua',    makes_at = 'fragua' where slug = 'temple-de-rio';
update knowledge set makes = 'mapa de sendas',  makes_at = 'camino' where slug = 'lectura-de-sendas';
update knowledge set makes = 'frasco de raíz',  makes_at = 'aldea'  where slug = 'destilado-de-raiz';
