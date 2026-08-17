-- ═════════════════════════════════════════════════════════════════════════
-- EL AUTOR DEL MUNDO — que el valle tenga pasado, y que lo grande se gane
-- ═════════════════════════════════════════════════════════════════════════
--
-- La pregunta que abrió esta tarea fue: *"¿el director de IA le dio contexto a
-- todos, al mundo, de dónde viene todo, historia, qué hay?"*. La respuesta era
-- no. Cada una de las siete personas tenía su historia chica y los dos pueblos
-- tenían un agravio, pero **el valle no tenía pasado**: no había un antes, ni un
-- por qué la Casa Quemada está quemada, ni de dónde salieron los que hoy están.
--
-- Esto es la mitad de datos del arreglo. La otra mitad está en
-- `lib/world/autor.ts`, y la regla que gobierna a las dos es una sola:
--
--     La simulación produce las condiciones; el autor escribe el desenlace;
--     el director lo cuenta.
--
-- ── Por qué hace falta una tabla nueva y no alcanzaba con `events` ────────
--
-- Porque `events` contesta *qué pasó en el mundo* y esta tabla contesta otra
-- cosa: *qué escribió el autor, cuándo, y de qué hecho lo sacó*. Son preguntas
-- de dueños distintos. La primera la lee el director y es la ficción; la
-- segunda la leemos nosotros y es la auditoría — el equivalente, del lado del
-- autor, de lo que `chronicles.source_events` es del lado del director.
--
-- Y la auditoría acá es más dura, porque el autor **escribe estado del mundo** y
-- el director no. Un director que alucina produce una crónica mentirosa que se
-- puede tirar. Un autor que inventa deja una meta, un pueblo enojado o una
-- amenaza parada en el valle **para siempre**, y nadie va a saber de dónde
-- salió. Por eso la trazabilidad no es un log: es una restricción de la base.

-- ─────────────────────────────────────────────────────────────
-- LO QUE SEMBRÓ EL AUTOR, Y DE QUÉ HECHO SALIÓ
-- ─────────────────────────────────────────────────────────────
create table if not exists siembras (
  id          uuid primary key default gen_random_uuid(),
  region_id   uuid not null references regions(id) on delete cascade,
  -- El día del valle en que se sembró. Es `regions.tick`, no el reloj de
  -- pared: lo que importa de una siembra es en qué momento del mundo entró,
  -- porque de eso depende si el que la reciba la vive como algo de ahora o
  -- como algo que ya estaba.
  tick        integer not null,

  -- Las seis cosas que el autor puede sembrar, y ninguna más. La lista es
  -- corta a propósito: cada tipo nuevo es una forma nueva en que el autor
  -- puede escribir estado del mundo, y eso hay que decidirlo, no permitirlo.
  --
  --   pasado         — un hecho de antes del mundo. Una vez por región, y va a
  --                    `events` con `tick` NEGATIVO (ver abajo).
  --   meta           — una agenda nueva anclada en lo que pasó de verdad. Es lo
  --                    que rompe el techo de `siguienteMeta()`, que hoy sortea
  --                    entre dos por oficio y se repite.
  --   figura         — alguien escrito a mano que puede entrar al valle. Va a
  --                    `por_llegar`; el tick decide si, cuándo y quién lo vio.
  --   crecimiento    — el valle sostiene más gente o menos. Va a `regions.cupo`,
  --                    que es de donde cuelga `P_NACIMIENTO` en el tick.
  --   agravio        — un pueblo se acuerda de algo que le hicieron.
  --   acontecimiento — lo grande. Sólo cuando la cuenta del mundo cruza el
  --                    umbral, y nunca por calendario (DISENO §16).
  tipo        text not null check (tipo in
                ('pasado', 'meta', 'figura', 'crecimiento', 'agravio', 'acontecimiento')),

  -- Qué se sembró, en una línea, para leerlo en consola sin abrir tres tablas.
  que         text not null,

  -- ⚠ DE QUÉ HECHO SALIÓ. Es la columna por la que existe esta tabla.
  --
  -- `hechos` es una lista de referencias a filas que YA ESTABAN en la base
  -- antes de que el autor corriera: `events:<uuid>`, `people:<uuid>`,
  -- `peoples:<uuid>`, `places:<uuid>`, `knowledge:<uuid>`. El código valida que
  -- cada una exista en el corpus que leyó, y el `check` de abajo garantiza que
  -- ninguna siembra entre sin al menos una.
  --
  -- La regla, dicha entera: **si lo que el autor siembra no se puede rastrear a
  -- un hecho que ya estaba, está mal y hay que rehacerlo.** No es un ideal, es
  -- lo que separa "el mundo avanzó por lo que hizo la gente" de "un modelo de
  -- lenguaje inventó algo un martes".
  de_que      jsonb not null,

  -- Dónde quedó lo sembrado, para poder ir a mirarlo sin adivinar.
  tabla       text not null,
  fila_id     uuid,

  -- Qué costó. El costo de la IA se mide, no se estima (DISENO §13). Va por
  -- siembra y no por corrida porque la pregunta que se hace con este número es
  -- "¿cuánto sale un acontecimiento?", no "¿cuánto salió el martes?".
  modelo      text,
  costo_usd   numeric(12, 6),

  created_at  timestamptz not null default now(),

  constraint siembras_con_respaldo check (
    jsonb_typeof(de_que -> 'hechos') = 'array'
    and jsonb_array_length(de_que -> 'hechos') > 0
  )
);

create index if not exists siembras_region_idx on siembras (region_id, tick desc);

comment on table siembras is
  'Qué escribió el autor del mundo, cuándo, y de qué hecho de la base salió. '
  'Es la auditoría del autor: el equivalente de chronicles.source_events, pero '
  'obligatoria, porque el autor sí escribe estado del mundo.';

comment on column siembras.de_que is
  'Respaldo. { hechos: ["events:uuid", "people:uuid", ...], nota: "..." }. El '
  'check siembras_con_respaldo impide que entre una siembra sin al menos uno.';

-- ─────────────────────────────────────────────────────────────
-- EL PASADO DEL VALLE VIVE EN `events`, CON TICK NEGATIVO
-- ─────────────────────────────────────────────────────────────
--
-- Ésta es la decisión de diseño de toda la migración y conviene defenderla en
-- voz alta, porque la alternativa obvia —una tabla `lore`— rompe algo.
--
-- El invariante 3 dice: **nada se afirma si no está en `events`**. Si el pasado
-- viviera en una tabla aparte, el director tendría dos fuentes de las que
-- puede hablar, la auditoría por ids dejaría de cubrir la mitad, y en seis
-- meses nadie se acordaría de por qué una crónica que cita el incendio pasa
-- limpia sin ningún id. Con el pasado adentro de `events` el invariante se
-- cumple **por construcción y sin excepciones**: el director cita el id de la
-- pieza igual que citaría una muerte.
--
-- Y el tick negativo no es un truco: es la forma exacta del hecho. `tick` es el
-- día del valle, el mundo empezó a contar en cero, y todo esto pasó antes. Lo
-- que se guarda en el número no es una fecha —nadie sabe qué día se quemó la
-- Casa Quemada— sino el ORDEN: -1 es lo más reciente de lo viejo, -5 lo más
-- lejano. Cuánto hace, en la única unidad en la que el valle cuenta el tiempo,
-- va en `detail.hace_inviernos`.
--
-- Se verificó que ninguna consulta existente los levante sin querer, y son
-- tres:
--   · `director.ts` filtra `.gt('tick', player.last_seen_tick)` y ese número
--     nunca es negativo. No los ve.
--   · `dialogo.ts` filtra por `detail->>person` y ordena por tick descendente,
--     así que una pieza del pasado sólo entraría si nombrara a un vivo en ese
--     campo. **Por eso el autor tiene prohibido escribir `person`, `from` o
--     `to` en el `detail` de una pieza del pasado**, y usa `personas` (lista).
--   · el trigger de `ticks` mira `regions.tick`, no `events`. No los ve.
--
-- Lo que sí hay que saber: el pasado NO le llega solo al director, porque su
-- ventana arranca en el último tick que el jugador vio. Eso está bien —el
-- pasado no es una noticia— y por eso se consulta aparte, con la función de
-- acá abajo.

create or replace function pasado_del_valle(region_slug text)
returns table (
  id              uuid,
  orden           integer,
  epoca           text,
  hace_inviernos  integer,
  certeza         text,
  quien_lo_cuenta text,
  lugar           text,
  texto           text,
  detalle         jsonb
)
language sql stable as $$
  select
    e.id,
    e.tick,
    e.detail ->> 'epoca',
    (e.detail ->> 'hace_inviernos')::integer,
    -- 'sabido'  → el valle entero lo da por cierto.
    -- 'se_dice' → una versión, y hay otra que la contradice. Es el registro por
    --             defecto: no hay lado bueno, sólo intereses (DISENO §11.2).
    -- 'se_calla'→ alguien lo sabe y no lo cuenta. Sirve como ausencia.
    e.detail ->> 'certeza',
    e.detail ->> 'quien_lo_cuenta',
    pl.name,
    e.summary,
    e.detail
  from events e
  join regions r on r.id = e.region_id
  left join places pl on pl.id = e.place_id
  where r.slug = region_slug
    and e.kind = 'pasado'
    and e.tick < 0
  order by e.tick;
$$;

comment on function pasado_del_valle(text) is
  'El pasado de una región, de lo más viejo a lo más reciente. Es la superficie '
  'consultable: los NPCs lo pueden mencionar y el director se puede apoyar en '
  'él citando el id, porque cada pieza ES una fila de events.';

-- ─────────────────────────────────────────────────────────────
-- LOS PUEBLOS: DÓNDE VIVEN, Y DE QUÉ SE ACORDARON ÚLTIMO
-- ─────────────────────────────────────────────────────────────
--
-- `peoples` tenía lengua y agravio y no tenía territorio, y sin territorio el
-- agravio no se puede actualizar solo: "la aldea taló el claro donde enterraban
-- a los suyos" es una frase hasta que hay una forma de preguntar *qué pasó este
-- mes en el lugar donde entierran a los suyos*. Con `place_id`, cada
-- `amenaza_muerta` en el Sotobosque deja de ser un bicho menos y pasa a ser, del
-- otro lado, un pariente muerto — que es exactamente lo que pide `historia.md`:
-- los que no son humanos no son mobs.
alter table peoples add column if not exists place_id uuid references places(id) on delete set null;

comment on column peoples.place_id is
  'Dónde vive este pueblo. Lo usa el autor para saber qué eventos son suyos: lo '
  'que pasa en su territorio le pasa a ellos.';

-- El agravio ORIGINAL no se toca nunca. Está escrito a mano, es la razón por la
-- que ese pueblo existe, y pisarlo sería borrar autoría con una llamada a un
-- modelo. Lo que el mundo va agregando va acá al lado.
alter table peoples add column if not exists ultimo_agravio text;
alter table peoples add column if not exists ultimo_agravio_tick integer;

comment on column peoples.ultimo_agravio is
  'Lo último que el valle les hizo, escrito por el autor a partir de eventos '
  'reales en su territorio. El agravio fundacional (peoples.agravio) no se '
  'sobrescribe jamás: es autoría, no estado.';

-- Backfill del territorio de los dos pueblos que ya existen. El vínculo no es
-- una opinión: los dos agravios nombran el lugar.
update peoples pe set place_id = pl.id
from places pl
where pl.region_id = pe.region_id and pe.place_id is null
  and ((pe.slug = 'sotobosque' and pl.slug = 'bosque')
    or (pe.slug = 'ceniza'     and pl.slug = 'ruina'));

-- ─────────────────────────────────────────────────────────────
-- BACKFILL: LOS DOS PUEBLOS, EN TODA REGIÓN QUE TENGA ESTE VALLE
-- ─────────────────────────────────────────────────────────────
--
-- Los dos pueblos se insertaron a mano en producción y nunca en ningún otro
-- lado, así que `valle-pruebas` —el valle donde se rompe y se arregla— tenía la
-- tabla vacía. Eso es peor que un dato faltante: significa que **todo lo que se
-- prueba con los pueblos se prueba contra un mundo que no los tiene**, y que la
-- primera vez que el código los use de verdad va a ser en producción.
--
-- Los textos son los de producción, palabra por palabra: no son nuevos, se
-- están copiando a donde faltaban. Se aplica a cualquier región que tenga el
-- Sotobosque y la Casa Quemada, que es lo que hace a este valle este valle.
insert into peoples (region_id, slug, name, lengua, agravio, aprecio, temor, place_id)
select r.id, v.slug, v.name, v.lengua, v.agravio, -20, 0,
       (select p.id from places p where p.region_id = r.id and p.slug = v.place_slug)
from regions r
cross join (values
  ('sotobosque', 'bosque', 'Los del Sotobosque',
   'un chasquido gutural con vocales largas; los nombres propios se cantan',
   'la aldea taló el claro donde enterraban a los suyos, y nadie preguntó'),
  ('ceniza', 'ruina', 'Los de la Ceniza',
   'frases cortas y roncas; no tienen palabra para "perdón"',
   'vivían en la Casa Quemada antes de que se quemara, y creen que fue a propósito')
) as v(slug, place_slug, name, lengua, agravio)
where exists (select 1 from places p where p.region_id = r.id and p.slug = 'bosque')
  and exists (select 1 from places p where p.region_id = r.id and p.slug = 'ruina')
  and not exists (select 1 from peoples pe where pe.region_id = r.id and pe.slug = v.slug);

-- Y saben cosas que ningún humano de este valle sabe. Los dos saberes ya están
-- en el catálogo global (`lengua-del-soto`, `temple-de-ceniza`) y en producción
-- ya cuelgan del pueblo: esto es la misma fila para las regiones que la
-- perdieron. `knows.holder_kind = 'people'` es de la migración de pueblos.
insert into knows (holder_kind, holder_id, knowledge_id, how, learned_tick)
select 'people', pe.id, k.id, 'origen', 0
from peoples pe
join knowledge k on k.slug = case pe.slug
                               when 'sotobosque' then 'lengua-del-soto'
                               when 'ceniza'     then 'temple-de-ceniza'
                             end
on conflict (holder_kind, holder_id, knowledge_id) do nothing;
