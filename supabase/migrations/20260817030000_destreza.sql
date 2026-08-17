-- La destreza: lo que ganás haciendo, no lo que te enseñan.
--
-- Son dos cosas distintas y confundirlas rompe el juego:
--
--   · El SABER se aprende de una persona. Es la puerta, es escaso, y se pierde
--     del mundo cuando muere el último que lo tenía.
--   · La DESTREZA se gana practicando. Es tuya, no te la puede enseñar nadie,
--     y no se pierde del mundo cuando te morís — nunca estuvo en el mundo,
--     estuvo en vos.
--
-- Por eso vive en `knows` (el par persona-saber) y no en el jugador: sos buen
-- herrero y mal destilador al mismo tiempo, como en la vida.
--
-- Y por eso enseñar no clona: el alumno recibe el saber con destreza 0 y tiene
-- que hacerlo un montón de veces. El oficio sobrevive, el maestro sigue siendo
-- el maestro.
--
-- Lo que sube no es un contador sin techo: sube la CALIDAD de lo que hacés, y
-- la calidad ya le importa a todo el mundo (una hoja mejor pega más fuerte, y
-- el que la recibe ve quién la hizo). Eso es la diferencia con grindear.

alter table knows add column destreza integer not null default 0;  -- 0..100
alter table knows add column veces integer not null default 0;     -- cuántas lo practicó

-- Los NPCs que ya existen no arrancan en cero: llevan años haciendo lo suyo.
-- Un valle donde la herrera vieja forja como una principiante no se cree.
update knows set destreza = 45 + floor(random() * 35)::int, veces = 30 + floor(random() * 60)::int
where holder_kind = 'person' and how in ('origen', 'absorbido');
update knows set destreza = 20 + floor(random() * 25)::int, veces = 8 + floor(random() * 20)::int
where holder_kind = 'person' and how = 'aprendido';
