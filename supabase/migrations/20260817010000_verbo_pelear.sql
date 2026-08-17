-- El sexto verbo.
--
-- El proyecto arrancó con cinco a propósito: si el bucle no funciona con
-- cinco, no lo salva el sexto. Pelear entra porque el combate estaba pasando
-- igual — sólo que del lado del cliente, donde no lo veía nadie más y no
-- quedaba registrado. Un verbo de más es mejor que una mentira.

alter table actions drop constraint actions_verb_check;
alter table actions add constraint actions_verb_check
  check (verb in ('ir', 'hablar', 'trabajar', 'aprender', 'ensenar', 'pelear'));
