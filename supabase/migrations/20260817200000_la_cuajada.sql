-- La cuajada: lo que se le saca a un animal manso, y para qué sirve.
--
-- El día que los animales dejaron de ser decorado quedó un reclamo abierto:
-- *"no tenés acciones"* con ellos. Y quedó una recomendación buena —que lo
-- primero que se le saca a un bicho no es la vida, es la leche— con un
-- argumento mejor: **de los que podés sacar algo son exactamente los que te
-- dejan acercarte, y eso es así porque alguien del pueblo los amansó.** La
-- mansedumbre ya era el dato; lo que faltaba era la persona.
--
-- ── Por qué NO hay un verbo `ordenar` ──────────────────────────────────────
--
-- Porque los animales no existen del lado del servidor. Viven en `fauna.gd`,
-- sembrados por el cliente con una semilla, y el mundo no tiene una fila por
-- vaca. Un verbo con un animal de blanco sería el servidor firmando algo que
-- no puede comprobar —el invariante 4 al revés: no que el cliente mienta, sino
-- que el mundo le crea— y encima habría que sostener una tabla de cabezas de
-- ganado para que la primera cuajada del valle fuera posible.
--
-- Lo que el servidor SÍ sabe es **dónde estás parado**, y eso es exactamente
-- lo que `case 'trabajar'` ya exige: una fila en `knows` y el lugar correcto de
-- `knowledge.makes_at`. O sea que esto no necesita verbo, ni ruta, ni caso
-- nuevo: necesita una fila en `knowledge` y alguien que la sepa. Las cuatro
-- vacas y los dos burros de la aldea son la ficción de por qué se puede hacer
-- ahí y no en la ruina.
--
-- ── Qué hace la cuajada, que es la parte difícil ───────────────────────────
--
-- La prueba de DISENO §8.2b es una sola pregunta: **¿qué te deja hacer que
-- antes no podías?** Si la respuesta es "sube un número", el saber no está
-- terminado. La del frasco de raíz es buena —es la única forma de colgarte una
-- cuarta runa por un día— y ésta tiene que ser de ese calibre o no entra.
--
-- El agujero que tapa está medido y es feo: **hoy la única manera de curarse
-- en el valle es caerse.** `players.health` baja con cada mordida y no sube
-- nunca sola; las dos únicas subidas del código son `levantarse()` —que te deja
-- en 100 pero **en la aldea**— y la runa de vena, que exige que otro la sepa,
-- la haya colgado hoy y esté al lado tuyo. O sea que a un jugador con veinte de
-- vida en el Sotobosque le CONVIENE quedarse quieto y dejar que lo maten: sale
-- gratis y vuelve entero. Un juego donde morirse es la cura barata está roto.
--
-- Entonces la cuajada no cura: **te deja seguir donde estás.**
--
--   · De pie y herido, te cierra la herida en el monte, sin volver al pueblo.
--   · **Caído, te levanta donde caíste.** Ésa es la frase entera y es lo que
--     no se podía hacer de ninguna otra manera.
--
-- Y fijate que lo que compra no es vida, es **posición**, que es justo la única
-- de las dos cosas que el diseño dice que cuesta caerse (la otra es la cara, y
-- ésa no la compra: los que te vieron caer ya te temen menos y siguen). Con
-- distancias que se sienten (§7.2), no tener que volver es un premio de verdad.
-- Levantarse con la cuajada te devuelve MENOS vida que levantarse en la aldea:
-- se paga con el cuerpo lo que se ahorra en camino.
--
-- Las tres cosas que la mantienen del lado correcto de §10.2 —comida como bono
-- y nunca como impuesto, Monster Hunter y no Valheim—:
--
--   · No hay hambre, no hay barra, no hay castigo por no tenerla. No tenerla te
--     deja como estabas ayer: te levantás en la aldea.
--   · No sube el techo. La vida máxima sigue siendo 100 y la cuajada no apila.
--   · Da opciones, no potencia. Si algún día hiciera falta para pelear de igual
--     a igual, inventamos el grindeo y hay que sacarla.
--
-- ── Quién la sabe: Sarn, y no es un sorteo ─────────────────────────────────
--
-- Sarn vino con una compañía que se deshizo tres valles atrás. Una compañía en
-- marcha camina con sus animales, y el que anduvo en una columna es el único
-- del valle que aprendió a manejar una bestia que te deja llegar: su propia
-- procedencia mide en marchas y en relevos y se le escapan las palabras del
-- oficio. La vaca mansa de Vado Bajo prueba que alguien la tiene; desde hoy hay
-- un nombre.
--
-- Y encaja tres veces más:
--
--   · **Es guardia, o sea que trabaja de 18 a 6.** Se ordeña al amanecer, que
--     es cuando a él se le termina el turno. El único saber del valle que se
--     aprende de noche, del hombre que está despierto cuando todos se
--     encierran, es información sobre él y sobre el valle.
--   · **No sabía hacer absolutamente nada**, y era uno de los dos así. Un NPC
--     sin nada que enseñar es un NPC con el que sólo se puede hablar.
--   · **Su carácter es "cumple mientras le paguen y lo dice de frente"**, y eso
--     ahora es mecánico: hay que llegarle a `UMBRAL_ENSENAR`, y a un hombre al
--     que hace un mes que no le pagan se le llega trayéndole lo que le falta.
--     Su catálogo de metas ya pide una hoja templada; el vínculo hace el resto.
--
-- **Por eso `teaches` pasa a true, y es deliberado.** Estaba en false cuando no
-- tenía nada que enseñar. Dejarlo en false ahora sería fabricar una segunda
-- pared como la de Ren, y la migración de la brasa ya dejó escrito por qué eso
-- no es escasez sino el modo de falla de Arx Fatalis: un saber que existe y al
-- que no se puede llegar. **Ren se queda como está** — una sola persona en el
-- valle puede decidir que no, y es ella.
--
-- Lo que sí queda igual de duro: **lo sabe uno solo.** Si Sarn se muere antes
-- de enseñárselo a alguien, en ese valle no vuelve a haber cuajada nunca. El
-- sorteo de la muerte pesa ×3 a los últimos que cargan algo, así que desde hoy
-- Sarn tiene más chances de irse — y eso es el juego, no un efecto secundario.

-- ─────────────────────────────────────────────────────────────
-- El verbo `tomar`
-- ─────────────────────────────────────────────────────────────
--
-- ⚠ Sin esto el insert de la acción falla EN SILENCIO y el verbo no existe. Ya
--   mordió una vez y por eso la lista se escribe entera cada vez, sin ALTER
--   parcial: la única forma de leer qué verbos hay es ver la lista completa.
--
-- `tomar` es el verbo de usar lo que llevás encima, y no había ninguno: el
-- frasco lo consume `preparar` por dentro y nadie más consume nada. Es
-- inmediato como `pelear` y `lanzar` —una cuajada que tarda seis horas en hacer
-- efecto no es una cuajada— así que ninguno de los dos caminos deja una acción
-- pendiente: `POST /tomar` no encola nada y `POST /act` la resuelve en el acto.
--
-- Y hasta que esto corra, el botón del verbo **falla en silencio**: el insert
-- rebota contra el CHECK, nadie mira el error, y el jugador lee "se resuelve
-- cuando cierre el día del valle" para siempre. Es literalmente la trampa que
-- ya mordió una vez.

alter table actions drop constraint if exists actions_verb_check;
alter table actions add constraint actions_verb_check
  check (verb in (
    'ir', 'hablar', 'trabajar', 'aprender', 'ensenar', 'pelear',
    'encargarse', 'buscar', 'dar',
    'preparar', 'lanzar',
    'tomar'
  ));

-- ─────────────────────────────────────────────────────────────
-- El saber
-- ─────────────────────────────────────────────────────────────
--
-- `kind = 'receta'`, igual que el destilado: no es un oficio con el que te
-- ganes la vida, es una cosa que sabés hacer con las manos. Y `makes_at =
-- 'aldea'` porque ahí están las vacas y los burros — es el segundo saber que se
-- practica en la aldea, y por eso `case 'trabajar'` aprendió hoy a que le digas
-- cuál de los dos.
--
-- `description` es sabor y `para_que` es la única pregunta que le importa al
-- jugador. La regla de §8.2b sobre la interfaz: se nombra LA COSA, no el
-- mecanismo. Por eso no dice "restaura 40 de vida".
insert into knowledge (slug, name, kind, description, makes, makes_at, para_que)
values (
  'cuajado-de-leche',
  'Cuajado de leche',
  'receta',
  'Ordeñar al amanecer y cuajar la leche antes de que se corte. Sale un cuenco espeso que aguanta el día. Lo sabe el que anduvo con animales de carga, no el que tuvo una vaca.',
  'cuenco de cuajada',
  'aldea',
  'Te deja hacer un cuenco de cuajada en la aldea. Un cuenco es lo único que te levanta DONDE CAÍSTE, en vez de amanecer en la aldea; y de pie te cierra la herida sin tener que volver al pueblo.'
)
on conflict (slug) do update set
  name = excluded.name, kind = excluded.kind,
  description = excluded.description,
  makes = excluded.makes, makes_at = excluded.makes_at,
  para_que = excluded.para_que;

-- ─────────────────────────────────────────────────────────────
-- Quién lo sabe, y desde cuándo enseña
-- ─────────────────────────────────────────────────────────────
--
-- Mismo cuidado que la migración de la brasa: entra sólo donde haya un guardia
-- VIVO y donde no lo sepa ya alguien de esa región. En un valle que ya perdió
-- al guardia no aparece nadie que lo sepa — la cuajada no está en ese valle, y
-- eso es el juego funcionando.
--
-- Destreza 71 y seis veces: no es un principiante. Lo hizo durante años en una
-- columna y un valle donde el que lo sabe hace un cuenco de mierda no se cree
-- (es el mismo criterio que puso a los NPCs viejos con la mano hecha).
insert into knows (holder_kind, holder_id, knowledge_id, learned_from, how, learned_tick, destreza, veces)
select 'person', p.id, k.id, null, 'origen', 0, 71, 6
  from people p
  join knowledge k on k.slug = 'cuajado-de-leche'
 where p.alive and p.trade = 'guardia'
   and not exists (
     select 1 from knows w
      join people q on q.id = w.holder_id and q.region_id = p.region_id
     where w.holder_kind = 'person' and w.knowledge_id = k.id and q.alive)
on conflict do nothing;

-- Y ahora enseña. Sólo al que le acabamos de dar el saber: un guardia de otro
-- valle que no lo sepa sigue sin tener nada que enseñar y sigue en false.
update people p set teaches = true
 where p.alive and p.trade = 'guardia' and not p.teaches
   and exists (
     select 1 from knows w
      join knowledge k on k.id = w.knowledge_id and k.slug = 'cuajado-de-leche'
     where w.holder_kind = 'person' and w.holder_id = p.id);

-- Y la biografía, porque un saber que la biografía no explica es un renglón
-- pegado. `people.historia` es lo que sostiene la línea entre una charla y la
-- siguiente: si en la base no dice de dónde le salen las manos, el que hable
-- con él va a escuchar a un guardia que cuaja leche porque sí.
--
-- Se agrega y no se reescribe: lo que ya está ahí es de otro y es bueno. El
-- `not like` es para que correr esto dos veces no le pegue la frase dos veces.
update people p
   set historia = p.historia
     || ' En la compañía le tocaban las bestias de la columna, y de ahí le quedó lo que sabe hacer con las manos: ordeña al amanecer, cuando se le termina la guardia, y cuaja la leche antes de que se corte.'
 where p.alive and p.trade = 'guardia'
   and p.historia not like '%bestias de la columna%'
   and exists (
     select 1 from knows w
      join knowledge k on k.id = w.knowledge_id and k.slug = 'cuajado-de-leche'
     where w.holder_kind = 'person' and w.holder_id = p.id);
