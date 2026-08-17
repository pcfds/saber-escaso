-- Que las agendas de los NPCs se puedan agarrar, y que el bucle chico cierre.
--
-- El contenido ya estaba en la base y nadie lo podía tocar: "Odila quiere
-- conseguir raíz del Sotobosque" existe hace semanas, avanza sola, y el que
-- juega preguntó *"las misiones que me mandan, ¿existe? buscar algo en el
-- bosque, ¿existe eso?"*. No existía. Esa era la brecha entera: no faltaban
-- quests, faltaba la manija.
--
-- Entran tres verbos y una tabla:
--
--   encargarse — te hacés cargo de lo que alguien persigue
--   buscar     — trabajás un lugar y sale lo que ese lugar da
--   dar        — le ponés algo en la mano a alguien, y se te va
--
-- Y con eso cierra: aprendés → fabricás → regalás → te ganás a la gente →
-- te enseñan más.

-- ─────────────────────────────────────────────────────────────
-- Los tres verbos nuevos
-- ─────────────────────────────────────────────────────────────
--
-- ⚠ Esto NO es opcional y ya nos mordió una vez: si el verbo no está en el
--   CHECK, el insert falla y la acción nunca existe. Sin ruido, sin error
--   visible del lado del jugador — el mundo simplemente no se entera.

alter table actions drop constraint if exists actions_verb_check;
alter table actions add constraint actions_verb_check
  check (verb in (
    'ir', 'hablar', 'trabajar', 'aprender', 'ensenar', 'pelear',
    'encargarse', 'buscar', 'dar'
  ));

-- ─────────────────────────────────────────────────────────────
-- Las agendas pueden necesitar una cosa, no sólo un saber
-- ─────────────────────────────────────────────────────────────
--
-- Hasta acá una agenda sólo se podía trabar por un saber que no tenía nadie.
-- Pero la mitad de lo que persigue la gente del valle es material: carbón para
-- el invierno, hierro para las bisagras, la raíz del Sotobosque. Eso es
-- exactamente lo que un jugador puede traer, y por eso es la parte que faltaba.
--
-- `needs_object` guarda el KIND del objeto, no un id: el jugador cumple con
-- cualquier raíz, no con una raíz en particular. Y guarda texto y no una
-- referencia a una tabla de recetas porque esa tabla no existe a propósito —
-- lo que se puede fabricar vive en `knowledge.makes`, o sea en lo que alguien
-- sabe, y se muere con esa persona.

alter table agendas drop constraint if exists agendas_needs_kind_check;
alter table agendas add constraint agendas_needs_kind_check
  check (needs_kind is null or needs_kind in ('knowledge', 'place', 'person', 'object'));

alter table agendas add column if not exists needs_object text;

comment on column agendas.needs_object is
  'El kind del objeto que le falta (no un id: sirve cualquiera de ese tipo). Es la puerta por la que el jugador entra a la agenda de un NPC.';

-- Lo que ya está corriendo en las dos regiones. Va por `goal` porque las metas
-- las escribe `siguienteMeta()` en tick.ts y son un catálogo cerrado.
--
-- Sólo se toca lo que está abierto: una agenda cumplida es historia y no se
-- reescribe.
update agendas set needs_kind = 'object', needs_object = 'raíz del Sotobosque'
  where state in ('activa', 'bloqueada') and goal ilike '%raíz del Sotobosque%';
update agendas set needs_kind = 'object', needs_object = 'carbón'
  where state in ('activa', 'bloqueada') and goal ilike '%carbón%';
update agendas set needs_kind = 'object', needs_object = 'hierro viejo'
  where state in ('activa', 'bloqueada') and goal ilike '%bisagras%';
update agendas set needs_kind = 'object', needs_object = 'frasco de raíz'
  where state in ('activa', 'bloqueada')
    and (goal ilike '%pagar lo que debe%' or goal ilike '%deudas viejas%'
      or goal ilike '%cobrarle a Bruno%');

-- El yunque partido de Ilde pedía un SABER que Ilde ya tiene, así que se
-- cumplía sola en el primer tick y no era una historia de nadie. Un yunque roto
-- necesita hierro, no que le expliquen cómo se hace.
update agendas set needs_kind = 'object', needs_object = 'hierro viejo', needs_id = null
  where state in ('activa', 'bloqueada') and goal ilike '%yunque%';

-- ─────────────────────────────────────────────────────────────
-- Encargos: quién se hizo cargo de qué
-- ─────────────────────────────────────────────────────────────
--
-- Es una TABLA y no una columna `taken_by` en `agendas`, y la razón es de
-- diseño, no de normalización:
--
--   · La agenda es del NPC. `state` y `progress` son lo que Odila persigue y
--     cómo le va, y eso tiene que seguir corriendo exactamente igual la haya
--     agarrado alguien o no. El mundo no te espera (Red Dead). Una columna en
--     `agendas` mezcla "lo que persigue Odila" con "quién más se metió", y la
--     primera vez que alguien lea ese campo va a creer que la agenda es del
--     jugador.
--   · Se pueden encargar VARIOS. Dos jugadores atrás de la misma raíz, y el
--     que llega primero la cierra — incluso mientras el otro duerme. Eso es
--     una relación N a N y una columna no la representa.
--   · Y el encargo tiene su propio final, distinto del de la agenda:
--     `cumplido` (lo cerraste vos) o `perdido` (se cerró sin vos). Esa
--     diferencia es la que hace que se sienta que el valle siguió andando, y
--     no cabe en un uuid.

create table encargos (
  id          uuid primary key default gen_random_uuid(),
  agenda_id   uuid not null references agendas(id) on delete cascade,
  player_id   uuid not null references players(id) on delete cascade,
  taken_tick  integer not null,
  -- perdido = la agenda se cerró y no fuiste vos. No es un castigo, es la
  -- lección: el valle no te esperó.
  state       text not null default 'activo'
              check (state in ('activo', 'cumplido', 'perdido')),
  closed_tick integer,
  unique (agenda_id, player_id)
);

create index encargos_abiertos_idx on encargos (player_id) where state = 'activo';

comment on table encargos is
  'Un jugador se hizo cargo de lo que persigue un NPC. La agenda sigue avanzando sola: esto registra quién se metió, no de quién es la agenda.';
