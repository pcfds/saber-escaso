-- Saludos escritos por el modelo y guardados.
--
-- El primer intento fueron tres frases fijas por escalón de confianza,
-- derivadas del vínculo. Barato e instantáneo, y se notó de una: Bruno te
-- decía siempre lo mismo. Un saludo que no cambia es un cartel.
--
-- Tampoco sirve llamar al modelo cada vez que pasás al lado de alguien:
-- setecientos milisegundos de espera para algo que tiene que salir en el mismo
-- cuadro, y una llamada por cada cruce en un valle donde la gente camina todo
-- el tiempo.
--
-- Entonces: los escribe el modelo, en la voz de cada uno y a partir de lo que
-- esa persona está viviendo, y se guardan. Se regeneran cuando cambia algo que
-- importa —lo que persigue, cuánto confía en vos— no cada vez que los mirás.
-- Servir uno cuesta cero y el jugador no ve nunca el mismo dos veces seguidas.

-- Por persona y por escalón de confianza: un puñado de líneas para rotar.
-- jsonb y no una tabla aparte porque son cuatro líneas por escalón y se leen
-- SIEMPRE junto con la persona: una tabla suelta sería un join por cada NPC
-- en cada /mundo, a cambio de nada.
alter table people add column saludos jsonb not null default '{}'::jsonb;

-- De qué estado salieron. Si cambió, hay que rehacerlos: un saludo que habla
-- de una meta que la persona ya cumplió es peor que uno genérico.
alter table people add column saludos_de text;
