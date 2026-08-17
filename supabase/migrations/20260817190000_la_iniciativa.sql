-- La iniciativa: que el NPC empiece él.
--
-- Hasta hoy toda la conversación era reactiva. El jugador abría la caja, el NPC
-- contestaba, y si no le preguntabas nada te hablaba del frío. Un tipo trabado
-- esperando exactamente lo que llevás encima no te decía nada hasta el cuarto
-- turno, porque la ración del pedido (`dialogo.ts`) pide tres charlas de piso
-- antes de dejar salir el tema. Quien lo jugó lo dijo así: *"ellos casi no
-- hacen algo, que tomen iniciativas"*.
--
-- Lo que falta para arreglarlo NO es un dato nuevo del mundo: las agendas ya
-- dicen qué le falta a cada uno, `encargos` ya dice de qué se hizo cargo el
-- jugador y no volvió, `memories` ya dice qué recuerda de vos y `events` ya
-- tiene lo que acaba de pasar en el valle. Todo eso está y nadie lo lee para
-- ABRIR una charla.
--
-- Lo único que falta es la memoria del enfriamiento, y es esta columna.
--
-- ── Por qué una columna en `talks` y no una tabla nueva ───────────────────
--
-- Porque una iniciativa no es una entidad: es una propiedad de la charla en la
-- que ocurrió. Guardada acá se lee gratis —la consulta del hilo ya trae estas
-- filas— y se audita sola: `select iniciativa, count(*) from talks group by 1`
-- dice de qué empiezan a hablar los NPCs sin instrumentar nada.
--
-- ── El formato de la clave, que es lo que hace el enfriamiento ────────────
--
--   null                  la charla la abrió el jugador; el NPC no empezó nada
--   'encargo:<uuid>'      te cobró un encargo que tomaste y no cerraste
--   'trabada:<uuid>'      te pidió (o se quejó de) lo que le falta para su meta
--   'noticia:<uuid>'      te comentó algo que pasó en el valle. El uuid es el
--                         del evento, y por eso una noticia se comenta UNA vez
--                         y nunca más: la clave no vuelve a repetirse jamás.
--   'recuerdo:<hash>'     retomó algo que quedó abierto entre ustedes
--
-- La regla que sale de esto y que vive en `dialogo.ts`: **una iniciativa por
-- persona, por jugador y por día del valle.** Un tick es un día y el cron corre
-- uno cada seis horas, así que en una sesión de una hora cada NPC arranca algo
-- como mucho una vez. Siete habitantes son hasta siete arranques por sesión: el
-- valle te busca, y ninguno es un vendedor.
--
-- ⚠ Esta migración va ANTES del deploy, no después. `dialogo.ts` escribe la
-- columna en cada charla, y un insert con una columna que no existe falla — y
-- el modo de falla de `talks` es silencioso: el NPC deja de acordarse de vos.

alter table talks add column if not exists iniciativa text;

comment on column talks.iniciativa is
  'Con qué arrancó el NPC esta charla, o null si la abrió el jugador. Clave con prefijo (encargo:/trabada:/noticia:/recuerdo:) que además es el enfriamiento: la misma no vuelve a salir el mismo día del valle, y las de noticia no vuelven a salir nunca.';

-- El barrido del enfriamiento pide las últimas iniciativas de un par, y sin
-- esto se lee el hilo entero de la pareja para descartar las que son null.
-- Parcial porque la inmensa mayoría de las filas son null: en producción hay
-- 130 conversaciones en diez ticks y ninguna arrancó el NPC.
create index if not exists talks_iniciativa_idx
  on talks (person_id, player_id, created_at desc)
  where iniciativa is not null;

-- Los saludos guardados se rehacen solos: `saludos.ts` sube la RECETA a v4 y la
-- huella deja de coincidir. Esta línea no hace falta y está a propósito — el
-- agujero de la huella ya mordió dos veces (ver el comentario de `saludos.ts`)
-- y la salida buena es la versión de la receta, no un update a mano.
