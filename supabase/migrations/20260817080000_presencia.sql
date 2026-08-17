-- Quién está adentro AHORA.
--
-- Se intentó con `last_seen_tick`, y no se puede: un tick pasó a durar seis
-- horas reales, así que la ventana más chica que ese contador permite es de
-- entre 6 y 12 horas. O le dibujás el cuerpo en la aldea a alguien que se
-- desconectó anoche, o —si se ajusta para el otro lado— toda la gente que
-- estaba jugando junta se desaparece de golpe cuando el cron cierra el tick.
-- Ningún número arregla eso: el problema es la unidad.
--
-- Peor: lo único que refresca `last_seen_tick` es pedir la crónica o que se
-- resuelva una acción encolada. `/mundo` y `/estoy`, que son lo que el cliente
-- 3D llama todo el tiempo, no lo tocan. Se puede estar jugando una hora
-- seguida y figurar como ausente.
--
-- Un reloj de pared no depende del largo del tick, así que sobrevive al
-- próximo recalibrado del ritmo — que ya pasó una vez.
alter table players add column last_seen_at timestamptz;
create index on players (region_id, last_seen_at);
