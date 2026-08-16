-- Un secreto por jugador. Sin login, sin contraseñas: cada uno tiene su URL y
-- esa URL es su identidad. Para cuatro amigos alcanza y no hay que construir
-- autenticación, que sería el primer desperdicio de tiempo del proyecto.
--
-- El token es adivinable sólo por fuerza bruta sobre 32 caracteres hex.

alter table players
  add column if not exists token text unique;

update players
  set token = encode(gen_random_bytes(16), 'hex')
  where token is null;

alter table players
  alter column token set not null,
  alter column token set default encode(gen_random_bytes(16), 'hex');
