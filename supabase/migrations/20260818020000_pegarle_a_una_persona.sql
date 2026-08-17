-- ═══════════════════════════════════════════════════════════════════════════
-- PEGARLE A UNA PERSONA
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Pedido de la dirección del proyecto, textual:
--
--   «Ni pegarle hasta un NPC y que entienda qué pasa.»
--
-- Hasta hoy no se podía, y el motivo era una columna que no existía: `pelear`
-- apunta a `threats`, y **`people` no tenía vida**. Tenía `alive` y `died_tick`,
-- o sea que una persona podía morirse pero no tenía puntos que bajar. Se podía
-- matar a alguien por sorteo del tick y no se le podía pegar.
--
-- Las bases están en `DISENO.md` §9.3c y las cuatro reglas de ahí son las que
-- explican los números de acá:
--
--   1. **Casi nadie se defiende: la respuesta es huir y contarlo.** Por eso no
--      hay `ataque` ni `defensa` en esta tabla. Un valle donde cada aldeano es
--      un enemigo con barra de vida es un juego de acción.
--   2. **La pena no es una celda: es que el valle se cierre.** Por eso tampoco
--      hay tabla de crímenes: la consecuencia se escribe en `bonds.feared`,
--      `memories` y `peoples.temor`, que ya existen y ya se leen.
--   3. **Matar tiene que ser posible, difícil y nunca accidental.** De ahí sale
--      el 100 de abajo. El golpe hace entre 8 y 16 —la misma cuenta que contra
--      un bicho—, así que **hacen falta entre siete y doce golpes seguidos**, y
--      a mitad de camino el otro se va del lugar. No se llega ahí distraído.
--   4. **El que sabe algo que nadie más sabe vale distinto.** Eso ya está en el
--      código (`cuantosLoSaben`) y no necesita columna.
--
-- ── POR QUÉ 100 Y NO LO QUE TIENE UN BICHO ─────────────────────────────────
--
-- Un bicho de `threats` nace con bastante menos, y es a propósito que no sea el
-- mismo número: **una persona no es un monstruo con nombre.** El bicho existe
-- para que pelear sea un evento del día; la persona existe para que la mates
-- sólo si de verdad quisiste. Que aguante el doble no es realismo, es la regla
-- 3 escrita en un entero.
--
-- La vida NO se regenera acá, se regenera en el tick con las mismas reglas que
-- la del jugador (`DISENO.md` §10.2, la tabla de curación por dónde estás).

alter table people add column if not exists health int not null default 100;
alter table people add column if not exists max_health int not null default 100;

comment on column people.health is
  'Vida de una persona. Ver DISENO §9.3c: existe para que pegarle sea posible '
  'y para que matarla NO pueda pasar por apretar clic tres veces distraído.';

-- ── EL VERBO ───────────────────────────────────────────────────────────────
--
-- `golpear` y no `pelear`. **La distinción es el diseño entero**: `pelear` es
-- contra algo que vino a hacerte daño y sube el aprecio de los que te ven;
-- `golpear` es contra alguien del valle y lo baja. Meter los dos en el mismo
-- verbo obligaría a que la consecuencia social dependa de a quién le pegaste,
-- que es exactamente el tipo de rama que se olvida de un lado.
--
-- Y la trampa de siempre, que ya mordió una vez: **hasta que esto corra, el
-- botón del verbo falla en silencio.** El insert rebota contra el CHECK, nadie
-- mira el error, y el jugador lee «se resuelve cuando cierre el día del valle»
-- para siempre.

alter table actions drop constraint if exists actions_verb_check;
alter table actions add constraint actions_verb_check
  check (verb in (
    'ir', 'hablar', 'trabajar', 'aprender', 'ensenar', 'pelear',
    'encargarse', 'buscar', 'dar',
    'preparar', 'lanzar',
    'tomar',
    'soltar', 'levantar',
    'pedir',
    'vender', 'comprar', 'cambiar',
    -- Pegarle a alguien del valle. Ver arriba: no es `pelear`.
    'golpear'
  ));
