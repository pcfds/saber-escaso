-- Dos voces que rompían el castellano.
--
-- Evidencia, cinco turnos con Ilde en producción:
--
--     "hola"                  -> Qué se te da. Algo hacés vos.
--     "¿cómo va el trabajo?"  -> Va lento. Falta hierro.
--     "¿te ayudo?"            -> Depende. Sabés algo.
--     "¿qué te falta?"        -> Hierro viejo. Sacás de algún lado.
--     "hola de nuevo"         -> Trae hierro viejo.
--
-- "Algo hacés vos" y "Sacás de algún lado" no son español rioplatense seco:
-- son telegramas agramaticales. Salieron de esta cláusula de su voz:
--
--     "Frases de tres o cuatro palabras."
--
-- **Una voz pide un REGISTRO, nunca un conteo de palabras.** El modelo cumple
-- el número tirando artículos, preposiciones y sujetos, que es lo único que
-- puede tirar. "Habla poco y va al grano" produce exactamente el efecto que se
-- buscaba —una frase corta, dura, sin saludo— y en castellano.
--
-- Es el pariente del límite que ya habíamos anotado en
-- `20260817060000_voces_que_piden.sql`: *una voz no puede pedir un tipo de
-- frase que obligue a inventar hechos.* Ahora son dos:
--
--     una voz no puede pedir una forma que obligue a inventar,
--     ni una forma que obligue a romper el idioma.
--
-- El contraejemplo bueno sigue siendo Odila ("amable como una puerta que se
-- cierra despacio, empieza por lo cordial y termina en la cuenta"): registro y
-- tema, cero aritmética. No se toca. Tampoco Bruno, Sarn, Ren ni Tobio — los
-- números que les quedan ("una muletilla por respuesta", "dos preguntas por
-- vez") acotan CUÁNTAS VECES aparece un tic, no cuántas palabras entra una
-- frase, y eso no obliga a mutilar nada.

update people set voice =
  'Habla poco y va al grano: una frase corta, bien dicha, y se calla. No saluda ni se despide, y no repite lo que ya dijo. Contesta con el oficio — si algo se puede o no se puede, cuánto lleva, y qué hace falta para que salga bien. Nunca habla de lo que siente ni de gente que no está presente. Cuando algo le importa hace una pregunta corta, una sola. No usa signos de exclamación.'
  where name = 'Ilde';

-- Marta tenía el mismo defecto en otra forma. Su voz no contaba palabras, pero
-- pedía dos cosas que son gramática y no registro —"frases sin adjetivos" y
-- "en pasado"— y salía lo mismo: *"Viste algo en el camino que viniste"*,
-- *"Traés algo para ayudarte o viniste a ver nomás"*. Prohibirle una clase de
-- palabra y fijarle un tiempo verbal la deja sin con qué armar la oración.
-- Lo que se quería de ella —pelada, sin adorno, sin explicar— es un registro y
-- se pide como registro.
update people set voice =
  'Contesta lo justo y después se calla; el silencio lo tiene que romper el otro. Frases enteras pero peladas, sin adorno, sobre lo que tiene delante: el monte, el frío, lo que vio hoy. Si le preguntan algo del Sotobosque, contesta otra cosa o no contesta. No pregunta nada de vuelta y nunca usa el nombre de quien le habla. No explica lo que hace ni por qué lo hace.'
  where name = 'Marta';

-- Los saludos al pasar (`people.saludos`) los escribió el modelo LEYENDO la voz
-- vieja, así que los de estas dos arrastran el mismo telegrama. La huella que
-- decide si hay que rehacerlos (`saludos_de`) sólo mira las metas y el escalón
-- de confianza: no mira la voz, así que sin esto el cron los daría por buenos
-- para siempre. Se los invalida a mano y la próxima tanda los rehace.
--
-- Queda anotado como deuda de `lib/world/saludos.ts`, que no es de esta tarea:
-- la huella debería incluir la voz, y entonces cambiar una voz alcanzaría.
update people set saludos_de = null where name in ('Ilde', 'Marta');
