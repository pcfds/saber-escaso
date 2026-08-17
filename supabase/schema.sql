-- Saber Escaso — esquema del mundo (Fase 0)
--
-- Principio rector: `events` es la verdad. La simulación escribe eventos;
-- el director sólo lee eventos. Nada que no esté acá pasó.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Región y geografía
-- ─────────────────────────────────────────────────────────────

create table regions (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  -- El reloj del mundo. Avanza 1 por tick cuando hay gente,
  -- 1 cada 4 ticks cuando la región está vacía.
  tick        integer not null default 0,
  created_at  timestamptz not null default now()
);

create table places (
  id          uuid primary key default gen_random_uuid(),
  region_id   uuid not null references regions(id) on delete cascade,
  slug        text not null,
  name        text not null,
  kind        text not null,          -- aldea | fragua | bosque | ruina | camino
  description text not null,
  unique (region_id, slug)
);

-- ─────────────────────────────────────────────────────────────
-- El saber: la economía del mundo
-- ─────────────────────────────────────────────────────────────

create table knowledge (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  kind        text not null,          -- oficio | magia | receta
  description text not null
);

-- Quién sabe qué. Vale para NPCs y para jugadores — de ahí el par
-- (holder_kind, holder_id) en vez de dos tablas casi iguales.
create table knows (
  id            uuid primary key default gen_random_uuid(),
  holder_kind   text not null check (holder_kind in ('person', 'player')),
  holder_id     uuid not null,
  knowledge_id  uuid not null references knowledge(id) on delete cascade,
  -- de quién lo aprendió (null = lo trajo puesto)
  learned_from  uuid,
  -- 'aprendido' multiplica el saber; 'absorbido' lo concentra
  how           text not null default 'aprendido'
                check (how in ('aprendido', 'absorbido', 'origen')),
  learned_tick  integer not null default 0,
  unique (holder_kind, holder_id, knowledge_id)
);

create index knows_holder_idx on knows (holder_kind, holder_id);
create index knows_knowledge_idx on knows (knowledge_id);

-- ─────────────────────────────────────────────────────────────
-- Gente
-- ─────────────────────────────────────────────────────────────

create table people (
  id          uuid primary key default gen_random_uuid(),
  region_id   uuid not null references regions(id) on delete cascade,
  place_id    uuid references places(id) on delete set null,
  name        text not null,
  trade       text not null,          -- herrera, cazador, destiladora...
  disposition text not null,          -- una línea de carácter, para el director
  alive       boolean not null default true,
  born_tick   integer not null default 0,
  died_tick   integer,
  -- Si muere sin haber enseñado, su saber se pierde de la región.
  teaches     boolean not null default true
);

create index people_region_idx on people (region_id) where alive;

create table players (
  id          uuid primary key default gen_random_uuid(),
  region_id   uuid not null references regions(id) on delete cascade,
  place_id    uuid references places(id) on delete set null,
  name        text not null,
  last_seen_tick integer not null default 0,
  unique (region_id, name)
);

-- Agendas: lo que cada NPC está persiguiendo por su cuenta.
--
-- Esto es lo que hace que el mundo "avance con sus propias historias" en vez
-- de quedarse esperando al jugador. Cada tick las agendas progresan, se
-- bloquean o se cumplen, y cada transición emite un evento. El director no
-- inventa arcos: lee los que la simulación ya generó.
create table agendas (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references people(id) on delete cascade,
  goal        text not null,          -- "levantar un techo antes del invierno"
  -- de qué depende avanzar: un saber que le falta, un lugar, otra persona
  needs_kind  text check (needs_kind in ('knowledge', 'place', 'person', null)),
  needs_id    uuid,
  progress    integer not null default 0 check (progress between 0 and 100),
  state       text not null default 'activa'
              check (state in ('activa', 'bloqueada', 'cumplida', 'abandonada')),
  started_tick integer not null default 0,
  ended_tick   integer
);

create index agendas_active_idx on agendas (person_id) where state = 'activa';

-- Vínculos: lo que reemplaza a los stats.
create table bonds (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null references people(id) on delete cascade,
  toward_kind   text not null check (toward_kind in ('person', 'player')),
  toward_id     uuid not null,
  -- valued: ¿te quieren cerca?   feared: ¿se animan a actuar contra vos?
  -- Dos ejes, no una barra. De acá salen solos los comportamientos.
  valued        integer not null default 0 check (valued between -100 and 100),
  feared        integer not null default 0 check (feared between -100 and 100),
  unique (person_id, toward_kind, toward_id)
);

-- Lo que un NPC recuerda. El chusmerío es la interfaz de la reputación:
-- el director cuenta lo que la gente dice, no abre un panel de stats.
create table memories (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references people(id) on delete cascade,
  about_kind  text not null check (about_kind in ('person', 'player')),
  about_id    uuid not null,
  what        text not null,
  -- de primera mano o me lo contaron (y quién)
  heard_from  uuid,
  tick        integer not null
);

create index memories_person_idx on memories (person_id);

-- ─────────────────────────────────────────────────────────────
-- Eventos: la única fuente de la que puede hablar el director
-- ─────────────────────────────────────────────────────────────

create table events (
  id          uuid primary key default gen_random_uuid(),
  region_id   uuid not null references regions(id) on delete cascade,
  tick        integer not null,
  kind        text not null,          -- nacimiento, muerte, enseñanza, trabajo,
                                      -- llegada, rumor, perdida_de_saber...
  place_id    uuid references places(id) on delete set null,
  -- ⚠ `detail` es la verdad canónica: el hecho estructurado y neutro al idioma
  --   ({person: "Ilde", knowledge: "Temple de río"}). El director lo renderiza
  --   al idioma del jugador. Un juego bilingüe no puede tener el hecho guardado
  --   como prosa en un idioma.
  --
  --   `summary` es prosa en español para leer los ticks en consola durante
  --   Fase 0. Es una comodidad de desarrollo, no la fuente. Hoy el director
  --   todavía lee `summary` — ese es el pendiente para bilingüe.
  detail      jsonb not null default '{}'::jsonb,
  summary     text not null,
  created_at  timestamptz not null default now()
);

create index events_region_tick_idx on events (region_id, tick);

-- Acciones que mandan los jugadores. Se resuelven en el tick siguiente.
create table actions (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references players(id) on delete cascade,
  verb        text not null check (verb in ('ir', 'hablar', 'trabajar', 'aprender', 'ensenar')),
  target      text,
  submitted_tick integer not null,
  resolved_tick  integer,
  outcome     text
);

create index actions_pending_idx on actions (player_id) where resolved_tick is null;

-- Lo que el director le escribió a cada jugador. Se guarda para no
-- repetirse y para poder auditar después qué narró y con qué evidencia.
create table chronicles (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references players(id) on delete cascade,
  from_tick     integer not null,
  to_tick       integer not null,
  text          text not null,
  -- ids de los eventos que se usaron. Si narra algo fuera de esta lista,
  -- es una alucinación y el experimento lo tiene que detectar.
  source_events uuid[] not null default '{}',
  -- La otra auditoría, la que va de la crónica a los hechos: gente nombrada en
  -- el texto que no aparece en ningún `summary` de la ventana. `source_events`
  -- no la ve —se pueden citar tres ids reales y poblar la escena alrededor con
  -- testigos que nadie puso ahí— y ése fue el modo de falla que pasó limpio.
  -- Es señal, no error: lo que se mira es `avg(cardinality(...))` bajando.
  -- Nullable a propósito: null es "no medida", '{}' es "medida y limpia".
  unbacked_names text[],
  created_at    timestamptz not null default now()
);

create index chronicles_player_idx on chronicles (player_id, to_tick desc);
