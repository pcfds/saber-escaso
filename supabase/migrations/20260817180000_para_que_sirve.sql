-- Para qué sirve cada saber. En una frase, del lado del jugador.
--
-- El reclamo fue exacto y duele porque es cierto: *"el juego parece que todo
-- dice sabés, aprendés, pero no es saber así rápido... ¿en el juego hace algo
-- el destilado de raíz? ¿me sirve para algo? ¿qué es un destilado de raíz?"*
--
-- El problema no era que los saberes no hicieran nada —forja da una hoja que
-- pega más fuerte, destilado da un frasco que sostiene una cuarta runa— sino
-- que **el juego nunca lo dice.** "Sabés Destilado de raíz" no le dice nada a
-- nadie. `description` existe pero está escrita como sabor, no como para qué.
--
-- Entonces: una frase por saber que contesta la única pregunta que importa,
-- **qué te deja hacer que antes no podías**. Es la prueba que ya está escrita
-- en DISENO.md §8.2b para aceptar un saber nuevo; acá se vuelve un campo.

alter table knowledge add column para_que text;

update knowledge set para_que =
  'Te deja forjar una hoja templada en la fragua. Cuanto más forjás, mejor sale, y una hoja mejor pega más fuerte.'
  where slug = 'forja-simple';
update knowledge set para_que =
  'Te deja hacer un filo de agua en la fragua: la mejor arma del valle. Sale bien una de cada tres veces.'
  where slug = 'temple-de-rio';
update knowledge set para_que =
  'Te deja destilar un frasco de raíz en la aldea. Un frasco es la ÚNICA forma de colgarte una cuarta runa por un día — sin él llevás tres y punto.'
  where slug = 'destilado-de-raiz';
update knowledge set para_que =
  'Te deja hacer un mapa de sendas en el camino, y saber por dónde se sale del Sotobosque cuando cambian.'
  where slug = 'lectura-de-sendas';
update knowledge set para_que =
  'Te deja entender lo que dicen Los del Sotobosque. Sin esto sólo oís chasquidos, y a un pueblo que no entendés sólo le podés pegar.'
  where slug = 'lengua-del-soto';
update knowledge set para_que =
  'Te deja templar con ceniza de hueso. Nadie más en el valle sabe hacerlo: si te morís sin enseñarlo, se va del mundo.'
  where slug = 'temple-de-ceniza';

-- Las runas: qué hacen solas y qué hacen detrás de otra. Es la mitad de la
-- gramática, y es lo único que el jugador puede saber sin haberlo probado.
update knowledge set para_que =
  'Sola quema. Detrás de otra runa, aviva lo que venía. Es el eje del CUÁNTO.'
  where slug = 'runa-de-brasa';
update knowledge set para_que =
  'Sola frena lo que se mueve. Detrás de otra, deja puesto lo que venía por dos días. Es el eje del CUÁNTO DURA.'
  where slug = 'runa-de-quietud';
update knowledge set para_que =
  'Sola empuja y saca de lugar. Detrás de otra, reparte lo que venía a todo el lugar. Es el eje del A CUÁNTOS.'
  where slug = 'runa-de-aliento';
update knowledge set para_que =
  'Sola cierra heridas en lo vivo. Detrás de otra, mete lo que venía adentro de un cuerpo. Es el eje del A QUIÉN.'
  where slug = 'runa-de-vena';
