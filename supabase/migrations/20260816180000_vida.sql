-- Vida. Coherente con la regla del diseño: la pérdida es acotada.
--
-- Caer no te mata ni te saca el saber — el saber vive en tu cabeza y no se
-- puede perder. Te levantás en la aldea y seguís. Lo que se pierde con el
-- tiempo es posición y confianza, no el personaje.

alter table players
  add column if not exists health integer not null default 100
    check (health between 0 and 100),
  add column if not exists downed_at_tick integer;
