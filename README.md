# Saber Escaso — Fase 0

Prototipo mínimo para contestar **una sola pregunta**:

> ¿El director de IA es divertido?

Sin 3D, sin motor, sin arte. Una región, unos NPCs que saben cosas, un tick que
avanza el mundo, y un director que cuenta lo que pasó.

Documento de diseño completo: https://claude.ai/code/artifact/525ba855-0f6f-4bf8-a661-0f802392ae2a

## La regla que hace válido el experimento

**El director sólo puede narrar hechos que están en la tabla `events`.**

Ni uno que no haya pasado. Es tentador soltarlo a improvisar y sería un error
fatal: estaríamos midiendo "¿es divertido chatear con un LLM?" (sí, veinte
minutos) en vez de "¿un mundo simulado y bien narrado hace que la gente vuelva?",
que es la pregunta que nadie contestó.

La simulación (`tick.ts`) no usa IA. El director (`director.ts`) no toca el
estado del mundo. Esa separación es el experimento.

## Las dos preguntas del test

Cuatro personas, siete días:

1. ¿Vuelven al otro día **sin que se lo pidas**?
2. A la semana, ¿cada uno puede contar una historia del mundo que vos no escribiste?

La segunda es la de verdad.

## Puesta en marcha

1. Crear un proyecto en Supabase.
2. Pegar `supabase/schema.sql` entero en el **SQL Editor** del proyecto y correrlo.
3. `cp .env.example .env.local` y completar las tres variables
   (`SUPABASE_SERVICE_ROLE_KEY` está en Project Settings → API → service_role).

```bash
pnpm install
pnpm check          # dice exactamente qué falta antes de que algo explote
pnpm seed           # crea El Valle Primero
pnpm world 60       # el mundo empieza a vivir: un tick por minuto
```

En otra terminal:

```bash
pnpm act Pedro ir fragua
pnpm act Pedro trabajar
pnpm act Pedro hablar Ilde
pnpm look Pedro           # el director te cuenta qué pasó mientras tanto
```

`pnpm tick` avanza un tick a mano; `pnpm world` lo hace solo hasta que le des
Ctrl-C. Dejalo prendido y volvé al rato: el valle va a ser otro.

**`tick` y `look` son comandos separados a propósito**: uno simula, el otro
narra. Si alguna vez hace falta fusionarlos, el experimento se rompió.

## Estructura

```
supabase/schema.sql     el mundo: lugares, gente, saberes, agendas, vínculos, eventos
lib/check.ts            chequeo previo de entorno y base
lib/world/seed.ts       genera una región con gente que sabe cosas y persigue cosas
lib/world/tick.ts       avanza el mundo — simulación pura, cero IA
lib/world/run.ts        tickea solo cada N segundos
lib/world/director.ts   lee eventos, escribe la crónica — IA, cero escritura de estado
lib/world/actions.ts    las cinco acciones de un jugador
```

## Qué mirar mientras corre

- **Agendas.** Cada NPC persigue algo y avanza sin vos. Ilde rehace el yunque,
  Bruno quiere el temple de río y no se lo ganó, la vieja Ren se quiere morir
  sin enseñarle la runa de quietud a nadie. Cuando una agenda se cumple se abre
  otra: el mundo no se queda esperándote.
- **Pérdida de saber.** Si Ren se muere y nadie le aprendió la runa de quietud,
  la región la pierde para siempre. Eso es estado, no ambientación — y es el
  tipo de hecho que debería doler cuando el director te lo cuenta.
- **La auditoría del director.** Al final de cada `pnpm look` dice cuántos
  hechos leyó y cuántos usó. Si alguna vez cita un evento que no existe, avisa
  con un ⚠. Anotá esas: son el modo de falla que hay que medir.
- **Región vacía.** Sin jugadores conectados las agendas avanzan a un cuarto de
  paso. Se ve en la salida del tick.

## Las cinco acciones

`ir`, `hablar`, `trabajar`, `aprender`, `enseñar`. Nada más. Si el bucle no
funciona con cinco verbos, no lo va a salvar el sexto.
