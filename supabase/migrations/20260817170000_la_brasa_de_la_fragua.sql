-- La brasa de la fragua. Un agujero que se vio recién con el sistema andando.
--
-- La migración de la magia dejó las cuatro runas del mundo así: aliento en la
-- cazadora, vena en la destiladora, y brasa y quietud en Ren, que **no enseña y
-- se está muriendo**. O sea que el eje de la intensidad —el único que hace
-- daño— nacía inalcanzable: un jugador podía juntar las dos runas que reparten
-- y curan, y no había forma humana de conseguir la que quema. Eso no es
-- escasez, es una pared, y es exactamente el modo de falla de Arx Fatalis que
-- el diseño nombra por su nombre (§6, descubribilidad).
--
-- Se arregla donde corresponde, que es en la ficción y no en una regla:
-- **la herrera sabe la runa de brasa.** Es la persona del valle que vive de
-- prender lo que ya estaba seco; la runa dice literalmente eso. Que la herrera
-- de un pueblo sepa el trazo del fuego no le saca nada a Ren, y de paso ata la
-- magia al oficio más presente del valle en vez de dejarla en la ruina.
--
-- **La quietud NO se toca, y es la mitad del sentido de esta migración.** El
-- seed dice de Ren, con todas las letras, que es *"la única que sabe la runa de
-- quietud"*, y su agenda entera es morirse sin habérsela enseñado a nadie. Ése
-- es el eje escaso del valle y tiene que seguir siéndolo: el que quiera el
-- tiempo va a tener que ganarse a una vieja que decidió que no. Es el sistema
-- entero del juego en una persona.
--
-- Sólo entra donde haya una herrera VIVA que enseñe y donde no la sepa ya
-- alguien así. En un valle que ya perdió la fragua no aparece nadie que la
-- sepa: si se murió la herrera sin enseñar, el valle se quedó sin fuego, y eso
-- es el juego funcionando, no un bug que haya que parchear.
insert into knows (holder_kind, holder_id, knowledge_id, learned_from, how, learned_tick, destreza, veces)
select 'person', p.id, k.id, null, 'origen', 0, 62, 6
  from people p
  join knowledge k on k.slug = 'runa-de-brasa'
 where p.alive and p.teaches and p.trade = 'herrera'
   and not exists (
     select 1 from knows w
      join people q on q.id = w.holder_id and q.region_id = p.region_id
     where w.holder_kind = 'person' and w.knowledge_id = k.id
       and q.alive and q.teaches)
on conflict do nothing;
