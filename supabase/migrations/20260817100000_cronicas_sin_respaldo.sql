-- Nombres sin respaldo: la segunda auditoría del director, guardada.
--
-- `source_events` responde "¿citó hechos que no existen?". Ese chequeo dio
-- limpio en tres crónicas mentirosas de producción, porque las mentiras no
-- usan ids: el director cita tres hechos reales y puebla la escena alrededor
-- con un testigo, un deudor o un salvador que no estuvieron ahí.
--
-- `unbacked_names` guarda la otra mirada, la que va de la crónica a los
-- hechos: gente nombrada en el texto que no aparece en ningún `summary` de la
-- ventana que el director tenía. No es un error por sí solo —sugerir a alguien
-- en condicional es legítimo— y por eso se guarda como señal, no como falla.
-- Lo que se mide es la tendencia: si el promedio por crónica baja, el director
-- mejoró; si sube después de tocar el prompt, lo empeoramos.
--
-- Por qué `text[]` y no jsonb ni un contador:
--
--   * `cardinality(unbacked_names)` ya es el contador, así que un contador
--     aparte sólo sería una copia que puede quedar desincronizada.
--   * Es una lista plana de strings sin claves; jsonb agregaría casteos en
--     cada consulta a cambio de nada.
--   * Guarda el detalle, que es lo que hace accionable la métrica: `unnest`
--     dice *a quién* está inventando, y con siete personas por valle el mismo
--     nombre repitiéndose es un patrón, no ruido.
--   * Es el mismo molde que `source_events uuid[]`, la columna hermana.
--
-- La consulta que esta columna existe para contestar:
--
--   select date_trunc('day', created_at) as dia,
--          count(*) as cronicas,
--          avg(cardinality(unbacked_names)) as promedio_sin_respaldo
--     from chronicles
--    where unbacked_names is not null
--    group by 1 order by 1;
--
-- Y nullable a propósito: `null` es "no medida" y `{}` es "medida, cero". Un
-- `default '{}'` habría convertido a toda crónica escrita por un camino que se
-- olvide de la señal en un cero falso, y un cero falso arrastra el promedio
-- para abajo justo en la dirección en la que queremos ver mejoras.
alter table chronicles add column unbacked_names text[];

comment on column chronicles.unbacked_names is
  'Gente nombrada en la crónica que no aparece en ningún hecho de la ventana. '
  'Señal, no error. null = crónica no medida; ''{}'' = medida y limpia.';

-- ── Backfill ────────────────────────────────────────────────────────────────
--
-- Las crónicas viejas se miden retroactivamente en vez de dejarlas en null: sin
-- línea de base no hay tendencia que mirar, y "bajó de tres a cero" sólo
-- significa algo si el tres existe. Se puede reconstruir porque la crónica
-- guarda su propia ventana (`from_tick`, `to_tick`) y los eventos son
-- append-only: nadie los editó desde entonces, así que la ventana de hoy es la
-- misma que vio el director aquel día.
--
-- Replica `nombrado()` de lib/world/director.ts, incluidos sus tres detalles:
-- el nombre corto (última palabra de "La vieja Ren" es "Ren"), el piso de tres
-- letras, y los bordes de palabra en vez de substring — "Ren" no matchea
-- "arrendar". También replica el `limit 60` de la ventana, para que una crónica
-- vieja se mida con exactamente los hechos que el director tuvo a la vista.
with corto as (
  select
    p.id,
    p.region_id,
    p.name,
    -- Escapado igual que en TS: los nombres de hoy no traen metacaracteres,
    -- pero uno futuro con un punto o un paréntesis no puede romper el regex.
    regexp_replace(
      (string_to_array(p.name, ' '))[cardinality(string_to_array(p.name, ' '))],
      '([.*+?^${}()|\[\]\\])', '\\\1', 'g'
    ) as pat
  from people p
),
medido as (
  select
    c.id as chronicle_id,
    coalesce(array_agg(k.name order by k.name) filter (where k.name is not null), '{}') as nombres
  from chronicles c
  join players pl on pl.id = c.player_id
  left join corto k
    on  k.region_id = pl.region_id
    and length(k.pat) >= 3
    and lower(k.name) <> lower(pl.name)
    -- nombrada en la crónica…
    and c.text ~* ('(^|[^[:alpha:]])' || k.pat || '([^[:alpha:]]|$)')
    -- …y en ningún hecho de la ventana que el director tenía.
    and not exists (
      select 1
      from (
        select e.summary
        from events e
        where e.region_id = pl.region_id
          and e.tick > c.from_tick
          and e.tick <= c.to_tick
        order by e.tick asc
        limit 60
      ) ventana
      where ventana.summary ~* ('(^|[^[:alpha:]])' || k.pat || '([^[:alpha:]]|$)')
    )
  group by c.id
)
update chronicles c
   set unbacked_names = m.nombres
  from medido m
 where m.chronicle_id = c.id;
