-- Lo que queda en el suelo, y lo que alguien te pone en la mano.
--
-- Dos agujeros del mismo tamaño, y el segundo es peor:
--
--   1. **Un objeto no podía estar en el suelo.** `objects` tenía `holder_kind`
--      y `holder_id` y nada más: una cosa estaba en la mano de alguien o no
--      existía en ninguna parte. No se podía soltar, no se podía dejar, no se
--      podía encontrar lo que otro dejó.
--
--      Y en ESTE juego eso es una pena enorme, porque los objetos arrastran el
--      nombre de quien los hizo: **un cuchillo tirado en la Casa Quemada que
--      dice "lo hizo Ilde" veinte días después de que Ilde no está es la tesis
--      del juego hecha objeto** (DISENO §4, la referencia a Frieren). Hasta hoy
--      no podía pasar.
--
--   2. **Nadie te podía dar nada.** Las únicas dos escrituras a
--      `holder_kind = 'player'` en todo el código eran `case 'trabajar'` y
--      `case 'buscar'`: o lo hiciste vos o lo juntaste vos. `dar` era sólo
--      jugador → NPC, en una dirección.
--
--      Eso rompía una promesa explícita del diseño (§10.2): *"el frasco es la
--      única forma de exceder tu capacidad, y lo fabrica otro — eso le da al
--      que destila poder real sobre el que pelea"*. No era cierto en ninguna
--      dirección: no podías recibir un frasco de Odila ni aunque te apreciara,
--      y el frasco es lo único que te cuelga una cuarta runa.
--
-- ─────────────────────────────────────────────────────────────
-- Los tres verbos
-- ─────────────────────────────────────────────────────────────
--
-- ⚠ ESTO NO ES OPCIONAL Y YA MORDIÓ TRES VECES. Si el verbo no está en el
--   CHECK, el insert de `actions` **falla en silencio**, nadie mira el error, y
--   el jugador lee "se resuelve cuando cierre el día del valle" para siempre.
--
-- `levantar` y no `tomar`: `tomar` ya existe y es tomarse un cuenco de cuajada.
-- Dos verbos con el mismo nombre en el mismo CHECK es cómo se llega a que el
-- jugador se coma el objeto que quería levantar.

alter table actions drop constraint if exists actions_verb_check;
alter table actions add constraint actions_verb_check
  check (verb in (
    'ir', 'hablar', 'trabajar', 'aprender', 'ensenar', 'pelear',
    'encargarse', 'buscar', 'dar',
    'preparar', 'lanzar',
    'tomar',
    -- Soltar y levantar: una cosa puede estar en el suelo de un lugar.
    'soltar', 'levantar',
    -- Y pedir: la otra punta de `dar`, la que faltaba.
    'pedir'
  ));

-- ─────────────────────────────────────────────────────────────
-- El suelo de un lugar, y por qué NO hay coordenadas
-- ─────────────────────────────────────────────────────────────
--
-- `holder_kind` ya aceptaba `'place'` desde el primer día y **nadie lo había
-- escrito nunca**. O sea que la tabla venía diciendo desde hace semanas que un
-- objeto puede estar en un lugar; lo que faltaba era el verbo.
--
-- La tentación era guardar un `x, z` del cliente 3D. No se hace, y el motivo no
-- es prolijidad:
--
--   · **El mundo del servidor está hecho de `places`, no de metros.** Todo lo
--     demás —quién te ve trabajar, a quién le podés hablar, dónde muerde un
--     bicho, dónde se junta la raíz— se decide por `place_id`. Una coordenada
--     sería el único dato del mundo que el resto de la simulación no puede
--     leer, y la primera vez que alguien preguntara "¿está en la fragua?"
--     habría que inventar una respuesta.
--   · **El cliente es una ventana, y hay más de una.** La web no tiene metros.
--     Un objeto que sólo se puede ubicar en 3D es un objeto que no existe para
--     la mitad de las superficies del juego.
--   · **Y no hace falta para que dos jugadores vean el mismo suelo.** El
--     cliente 3D deriva el punto exacto del `id` del objeto —un uuid, que ES
--     estado compartido— alrededor del centro del lugar. Misma semilla, mismo
--     punto, en todas las pantallas. Es exactamente lo que ya hace el valle con
--     las siete casas de Vado Bajo (`DISENO.md` §6: sorteadas con semilla por
--     lugar para que sea el mismo en la pantalla de todos).
--
-- El índice que hace falta ya existe: `objects (region_id, holder_kind,
-- holder_id)`, de la migración de objetos. Un suelo se consulta con las tres.

comment on column objects.holder_kind is
  'player | person | place. `place` es el SUELO de ese lugar: la cosa está tirada ahí y la levanta cualquiera que pase. No hay coordenadas a propósito — el mundo del servidor está hecho de places y el cliente deriva el punto del id del objeto.';

-- ─────────────────────────────────────────────────────────────
-- Quién lo dejó ahí. No es lo mismo que quién lo hizo.
-- ─────────────────────────────────────────────────────────────
--
-- `made_by` dice de quién fue la mano. Esto dice quién lo abandonó, y son dos
-- hechos distintos que juntos hacen la historia: *la hoja la forjó Ilde, la
-- dejó tirada Bruno en la Casa Quemada el día 41 y no volvió a buscarla.*
--
-- Se guarda el NOMBRE y no un id por el mismo motivo que `made_by`: el que la
-- dejó se puede morir, y la cosa tiene que seguir diciéndolo.
--
-- ⚠ Nada de esto toca `made_by`. **Soltar y levantar NO pueden escribir
--   `made_by` jamás** — una cosa que cambia de mano sigue diciendo quién la
--   hizo, y eso es exactamente lo que la vuelve interesante. Lo único en todo
--   el código que puede escribir `made_by = null` es `case 'buscar'`.

alter table objects add column if not exists left_by   text;
alter table objects add column if not exists left_tick integer;

comment on column objects.left_by is
  'Quién lo dejó en el suelo (o de quién era cuando se murió). NUNCA quién lo hizo: eso es `made_by` y no se toca al cambiar de manos.';
comment on column objects.left_tick is
  'En qué día del valle quedó tirado. Es lo que deja decir "esto lleva veinte días acá".';
