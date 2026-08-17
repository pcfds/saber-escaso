-- La magia. El sistema más distintivo del juego, y hasta hoy dos filas muertas
-- en `knowledge`: `runa-de-brasa` y `runa-de-quietud` se podían aprender y no
-- hacían absolutamente nada. Un saber que no habilita hacer algo es un renglón
-- en una lista (DISENO.md §10.3), y encima era el renglón que sostiene la
-- escena más citada del proyecto: en el tick 10 se murió Ren y "se llevó las
-- dos runas del valle". Se llevó dos renglones.
--
-- Lo que decide esta migración, y el porqué de cada cosa. El diseño largo está
-- en el encabezado de `lib/world/magia.ts`; acá va lo que la BASE tiene que
-- saber.
--
-- ── 1. El vocabulario son CUATRO runas, y cada una es un eje ───────────────
--
-- El modelo es Magicka, no Diablo 2: pocas piezas que se combinan, nunca una
-- lista de hechizos (§6, "vocabulario chico, combinatoria profunda"). El
-- criterio para admitir una runa es duro y está escrito para que se pueda
-- aplicar de nuevo: **una runa entra sólo si abre un eje que ninguna otra
-- abre.** Los cuatro ejes son las cuatro preguntas que tiene cualquier efecto:
--
--     brasa    — CUÁNTO      (intensidad: quema, y aviva lo que toque)
--     quietud  — CUÁNTO DURA (tiempo: frena, y deja lo que toque puesto)
--     aliento  — A CUÁNTOS   (alcance: empuja, y reparte lo que toque)
--     vena     — A QUIÉN     (cuerpo: cierra heridas, y mete adentro lo que toque)
--
-- Sacá cualquiera de las cuatro y se cae una dimensión entera del sistema, no
-- unos hechizos. Agregá una quinta que sea "brasa pero más" y no abre nada:
-- por eso no hay cinco. Las dos que faltaban —aliento y vena— entran acá.
--
-- ── 2. Las runas nuevas nacen en gente viva que enseña ─────────────────────
--
-- Y esto es la mitad del trabajo, no un detalle de siembra. Las dos que ya
-- existían las tiene Ren, que **no enseña** y se está muriendo: si las cuatro
-- runas del mundo empezaran ahí, el sistema entero sería inalcanzable y
-- estaríamos en el modo de falla de Arx Fatalis (§6, descubribilidad). Así que
-- cada runa nueva arranca en una persona viva, que enseña, y a la que le cierra
-- por lo que ya es:
--
--   · `runa-de-vena`    → la destiladora. La vena es lo que corre por dentro,
--     la savia y la sangre; es literalmente su oficio. Y de paso queda un
--     circuito lindo: la misma persona que te vende el frasco —la única forma
--     de llevar una runa de más (§10.2)— es la que te puede enseñar una.
--   · `runa-de-aliento` → la cazadora. El aire que mueve las sendas, y la
--     única del valle que entra al Sotobosque y vuelve.
--
-- Arrancan con destreza alta y `how = 'origen'`, como cualquier NPC viejo: un
-- valle donde la que sabe una runa hace cuarenta años la traza como una
-- principiante no se cree (§8.4).
--
-- ── 3. Dos verbos nuevos, y por eso hay que tocar el CHECK ─────────────────
--
-- `preparar` y `lanzar`. Los dos se resuelven en el momento y **no** esperan al
-- tick —un hechizo que tarda seis horas no es un hechizo, es lo mismo que ya
-- decidió `pelear`— pero igual dejan su fila en `actions`, con `resolved_tick`
-- ya puesto, porque es el registro de lo que hiciste. Sin tocar el CHECK ese
-- insert falla EN SILENCIO y la acción no existe nunca. Ya nos mordió una vez.
-- Pasan a ser once verbos.

-- ─────────────────────────────────────────────────────────────
-- Los verbos
-- ─────────────────────────────────────────────────────────────

alter table actions drop constraint if exists actions_verb_check;
alter table actions add constraint actions_verb_check
  check (verb in (
    'ir', 'hablar', 'trabajar', 'aprender', 'ensenar', 'pelear',
    'encargarse', 'buscar', 'dar',
    -- Los dos de la magia. `preparar` es el acto de la mañana; `lanzar` es el
    -- trazo. Ninguno de los dos se encola: la fila se escribe ya resuelta.
    'preparar', 'lanzar'
  ));

-- ─────────────────────────────────────────────────────────────
-- Las dos runas que faltaban
-- ─────────────────────────────────────────────────────────────
--
-- Las descripciones dicen **qué hace la runa sola**, que es lo que te cuenta
-- quien te la enseña, y no dicen una sola palabra de las combinaciones. Eso es
-- deliberado y es la regla que sostiene todo el sistema: *nunca un menú con
-- todo* (§6). Las mezclas se descubren trazándolas, y lo que las registra es tu
-- grimorio —tabla de más abajo—, que sólo tiene lo que TE salió a vos.

insert into knowledge (slug, name, kind, description) values
  ('runa-de-aliento', 'Runa de aliento', 'magia',
   'Dos trazos y un corte. Mueve lo que esté suelto y lo saca de donde está. Se aprende con las manos, no con la boca.'),
  ('runa-de-vena', 'Runa de vena', 'magia',
   'Cuatro trazos cerrados. Cierra lo que está abierto en un cuerpo. Sirve en lo vivo y en nada más.')
on conflict (slug) do nothing;

-- Y las dos viejas dicen ahora qué hacen solas. La de brasa decía "prende lo
-- que ya estaba seco" y la de quietud "aquieta lo que se mueve", que estaba
-- bien como color y no alcanzaba para saber qué hace cuando la trazás.
update knowledge set description =
  'Tres trazos. Prende lo que ya estaba seco, y lo que prende duele. Se aprende mirando, no leyendo.'
  where slug = 'runa-de-brasa';
update knowledge set description =
  'Cinco trazos. Aquieta lo que se mueve, un momento, y deja puesto lo que estaba pasando. Nadie sabe de dónde salió.'
  where slug = 'runa-de-quietud';

-- Cada runa nueva, en una persona viva que enseña. Una por región y sólo si en
-- esa región no la sabe nadie todavía: la migración se puede correr sobre un
-- valle que ya avanzó sin duplicar a nadie.
insert into knows (holder_kind, holder_id, knowledge_id, learned_from, how, learned_tick, destreza, veces)
select 'person', p.id, k.id, null, 'origen', 0, 55, 5
  from people p
  join knowledge k on k.slug = 'runa-de-vena'
 where p.alive and p.trade = 'destiladora'
   and not exists (
     select 1 from knows w
      join people q on q.id = w.holder_id and q.region_id = p.region_id
     where w.holder_kind = 'person' and w.knowledge_id = k.id)
on conflict do nothing;

insert into knows (holder_kind, holder_id, knowledge_id, learned_from, how, learned_tick, destreza, veces)
select 'person', p.id, k.id, null, 'origen', 0, 48, 4
  from people p
  join knowledge k on k.slug = 'runa-de-aliento'
 where p.alive and p.trade = 'cazadora'
   and not exists (
     select 1 from knows w
      join people q on q.id = w.holder_id and q.region_id = p.region_id
     where w.holder_kind = 'person' and w.knowledge_id = k.id)
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────
-- Lo que llevás encima hoy
-- ─────────────────────────────────────────────────────────────
--
-- La regla 2 de la progresión (§8.3) hecha tabla: *lo que sabés no tiene techo;
-- lo que llevás encima sí*. Y con el cuidado que el diseño pide en voz alta —
-- **se escribe como una limitación del mundo, nunca como una grilla de
-- casilleros**: esta tabla no tiene tres columnas `slot1/slot2/slot3`, tiene
-- filas, y una fila es una runa que te colgaste esta mañana.
--
-- Tres cosas que la tabla decide y conviene leer juntas:
--
--   · **Entran tres.** El número no es arbitrario ni es un balance: está
--     escrito en el diseño con esas palabras —"preparaste tres runas esta
--     mañana, y son esas tres"— y con cuatro runas en el mundo es el número
--     que obliga a resignar exactamente un eje. Con dos no hay decisión; con
--     cuatro no resignás nada y el sistema se apaga solo.
--   · **La cuarta la da el frasco, y nada más.** §10.2: el frasco es *la única
--     forma de exceder tu capacidad*, y lo fabrica otro. Es la fila con
--     `por_frasco`, y el frasco se consume al colgarla.
--   · **Se gastan al trazarlas** (la fila se borra). Eso es lo que convierte
--     "tres runas" en una decisión de verdad: podés gastar las tres en un solo
--     hechizo grande o hacer tres chicos. No es maná —no hay barra, no se
--     regenera, no se grindea— es lo que trajiste en el bolsillo.
--
-- Polimórfica como `knows`, y por el mismo motivo: el día que un NPC prepare
-- runas —y tiene que poder, los NPCs usan los mismos verbos que vos— no hace
-- falta una segunda tabla casi igual.
create table preparadas (
  id            uuid primary key default gen_random_uuid(),
  holder_kind   text not null check (holder_kind in ('person', 'player')),
  holder_id     uuid not null,
  knowledge_id  uuid not null references knowledge(id) on delete cascade,
  -- El orden en que las colgó. No es cosmético: el orden de la secuencia es la
  -- gramática, pero eso se elige al trazar. Esto es sólo para mostrarlas
  -- siempre igual y que la mano se acostumbre.
  orden         smallint not null,
  -- La cuarta, la que no te entraba. Ver arriba.
  por_frasco    boolean not null default false,
  -- Qué día del valle las colgaste. Preparar se puede una vez por día: cambiar
  -- de runas cuesta un día, que es lo que hace que elegir duela. Es "esta
  -- mañana" convertido en regla, sin inventar un temporizador.
  prepared_tick integer not null,
  -- Una runa se lleva una sola vez. No hay "tres brasas": llevás la runa, no
  -- cargas de la runa. Si se pudiera repetir, la resignación desaparece y todo
  -- el mundo sale con el mismo eje tres veces.
  unique (holder_kind, holder_id, knowledge_id)
);

create index preparadas_holder_idx on preparadas (holder_kind, holder_id);

-- ─────────────────────────────────────────────────────────────
-- Lo que queda puesto
-- ─────────────────────────────────────────────────────────────
--
-- El eje del tiempo (la runa de quietud) necesita un lugar donde vivir: un
-- efecto que dura no se puede escribir en la columna de nadie. Acá viven las
-- marcas: un lugar que arde tres días, un bicho que quedó quieto, alguien con
-- una quemadura adentro.
--
-- Es la tabla que hace que la magia deje CICATRIZ y no destello. El mundo
-- recuerda sus cicatrices (§11.1), y `por` guarda el NOMBRE del que la trazó y
-- no su id: la marca sigue diciendo quién la hizo veinte días después de que
-- ese alguien no esté, igual que `objects.made_by`. Es Frieren otra vez.
create table encantamientos (
  id            uuid primary key default gen_random_uuid(),
  region_id     uuid not null references regions(id) on delete cascade,
  -- Qué hace la marca. Sale de la secuencia, no se elige: si lo que quedó
  -- puesto tenía daño es `ardor`, si tenía cura es `vigor`, si frenaba es
  -- `quietud`. Tres, porque son las tres cosas que un efecto puede seguir
  -- haciendo mañana.
  kind          text not null check (kind in ('ardor', 'vigor', 'quietud')),
  sobre_kind    text not null check (sobre_kind in ('place', 'threat', 'person', 'player')),
  sobre_id      uuid not null,
  -- Dónde se ve. Para una marca de lugar es el lugar mismo; para una marca
  -- sobre un cuerpo es dónde estaba cuando se la llevó puesta. El cliente
  -- dibuja con esto y el director ubica la escena con esto.
  place_id      uuid references places(id) on delete cascade,
  magnitud      integer not null default 0,
  desde_tick    integer not null,
  hasta_tick    integer not null,
  por           text not null,
  -- Con qué se hizo. El grimorio de otro no lo ve, pero el que se la come sí
  -- puede saber qué le pasó: una marca es una pista de que alguien anduvo
  -- trazando algo por acá.
  runas         text[] not null default '{}',
  -- El último día que esta marca cobró. Es lo que la hace idempotente: la
  -- pueden pasar a cobrar el tick, un hechizo nuevo en el mismo lugar o el
  -- cliente al pisar, y ninguno cobra dos veces el mismo día. Sin esto, "el
  -- lugar arde" es una lotería de cuántas veces llamó cada camino.
  ultimo_cobro_tick integer,
  created_at    timestamptz not null default now()
);

create index encantamientos_vivos_idx on encantamientos (region_id, hasta_tick);
create index encantamientos_sobre_idx on encantamientos (sobre_kind, sobre_id, hasta_tick);

-- ─────────────────────────────────────────────────────────────
-- El grimorio
-- ─────────────────────────────────────────────────────────────
--
-- La respuesta al riesgo que hunde a los juegos de runas (§6). Arx Fatalis es
-- amadísimo y de nicho por esto mismo: si el jugador no sabe qué hacer, se va
-- en veinte minutos. La solución que el diseño ya tenía escrita son dos cosas,
-- y ésta es la segunda: los NPCs enseñan las runas, **y un grimorio personal
-- registra sólo lo que aprendiste**.
--
-- Lo que esta tabla NO es, que es lo que importa: no es la lista de las
-- combinaciones posibles. Nunca un menú con todo — *el menú completo convierte
-- el saber en información y mata el sistema entero*. Acá sólo entra una fila
-- cuando una mezcla te salió A VOS, con el nombre que le puso el mundo cuando
-- la viste pasar. Un jugador con cuarenta horas tiene un cuaderno lleno; el que
-- entra hoy tiene una hoja en blanco y las mismas cuatro runas.
--
-- Y es del JUGADOR, no del personaje (§6: "aprende el jugador"). El día que se
-- te muera el personaje, el cuaderno sigue siendo tuyo — de hecho lo sigue
-- siendo aunque borres la partida, porque lo aprendiste vos.
create table grimorio (
  id              uuid primary key default gen_random_uuid(),
  player_id       uuid not null references players(id) on delete cascade,
  -- La secuencia, en orden. El orden ES la mezcla: `brasa aliento` no es lo
  -- mismo que `aliento brasa`, y por eso son dos filas distintas.
  runas           text[] not null,
  -- Cómo se llamó lo que salió. Lo arma el servidor con la gramática, no una
  -- tabla de nombres: "el calor repartido", "la vena encendida".
  nombre          text not null,
  veces           integer not null default 1,
  descubierta_tick integer not null,
  ultima_vez_tick integer not null,
  unique (player_id, runas)
);

create index grimorio_player_idx on grimorio (player_id, ultima_vez_tick desc);

comment on table grimorio is
  'Lo que ESE jugador descubrió trazando. Nunca la lista de lo posible: si '
  'alguna vez se puebla con todas las combinaciones, se rompió el sistema.';
