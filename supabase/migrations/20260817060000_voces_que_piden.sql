-- Dos voces que eran puro tic.
--
-- Quien lo jugó dijo: *"Bruno recién hablé, me contestó siempre lo mismo, le
-- decía hola y no decía otra cosa."* Las cinco respuestas guardadas en `talks`
-- eran técnicamente distintas y estructuralmente la misma: saludo sorprendido +
-- muletilla + "¿hay algo que querés?" + justificación.
--
-- El arreglo grande va en `dialogo.ts` (el NPC ahora quiere algo de la charla).
-- Pero había una parte que era de la voz, y es una regla general que conviene
-- anotar acá:
--
--   **Una voz tiene que decir de QUÉ habla, no sólo CÓMO.** Si todas las
--   cláusulas son manerismos —habla de más, se justifica, tapa silencios—
--   entonces cuando el personaje no tiene nada que decir, el tic verbal ES la
--   respuesta entera. La voz se come el contenido y sale el mismo párrafo
--   siempre. Compará con la de Odila, que dice "empieza por lo cordial y
--   termina en la cuenta": eso es forma Y tema, y por eso Odila nunca contesta
--   dos veces lo mismo.
--
-- Y el límite que ya nos mordió una vez: **una voz no puede pedir un tipo de
-- frase que obligue a inventar hechos.** Por eso lo que se les agrega es qué
-- PIDEN —que le muestren, que lo dejen probar, que le den una mano—, que son
-- justo las cosas que el mundo sabe hacer, y no qué CUENTAN.

update people set voice =
  'Habla de más, y siempre termina pidiendo algo: que le muestren, que lo dejen probar, que le den una mano. Empieza una frase, la corta y arranca otra. Se justifica antes de que nadie lo acuse. Tapa los silencios con "igual", "o sea", "nada" — una muletilla por respuesta, no cuatro. Nunca dice que no sabe algo: dice que todavía no se lo mostraron.'
  where name = 'Bruno';

-- Tobio tenía el mismo defecto en versión suave: "pregunta tres cosas seguidas
-- y no espera ninguna respuesta" es una máquina de párrafos intercambiables. Se
-- le baja el tic y se le dice para qué pregunta.
update people set voice =
  'Habla rápido y encima del otro: arranca una pregunta, la deja por la mitad y termina pidiendo lo que quiere, que siempre es ver algo de cerca. Dos preguntas por vez, no cinco. Se entusiasma con lo que no entiende y lo repite en voz alta. Cuando quiere algo lo pide de una, sin rodeo. Nunca inventa noticias: si no vio nada, pregunta.'
  where name = 'Tobio';
