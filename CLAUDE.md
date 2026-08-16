# Saber Escaso — instrucciones del proyecto

Juego de fantasía con mundo persistente narrado por un director de IA.
**Diseño completo:** https://claude.ai/code/artifact/525ba855-0f6f-4bf8-a661-0f802392ae2a

## Estamos en Fase 0. Sólo importa una pregunta.

> ¿El director de IA es divertido?

Todo lo que no ayude a contestarla es distracción. **No construir 3D, motor,
cámara, combate ni arte hasta que esté contestada.** El test es cuatro
personas, siete días, y dos preguntas: ¿vuelven al otro día sin que se lo
pidas? ¿pueden contar una historia del mundo que nadie escribió?

Ya hay evidencia parcial: en el tick 10 murió la vieja Ren y se llevó las dos
runas del valle. Nadie lo guionó. Falta saber si a otro le importa.

## Los tres invariantes. No se negocian.

**1. `lib/world/tick.ts` NUNCA importa el SDK de Anthropic.** La simulación es
determinista y sin IA. Si algún día ese archivo importa `@anthropic-ai/sdk`, el
experimento se rompió y no lo vamos a notar.

**2. `lib/world/director.ts` NUNCA escribe estado del mundo.** Lee eventos,
devuelve texto, guarda la crónica. No mueve gente, no mata NPCs, no reparte
saberes. Si el director puede cambiar el mundo, ya no estamos midiendo si sabe
narrarlo.

**3. El director sólo puede afirmar hechos que están en `events`.** Devuelve los
ids que usó y el script los audita. Si narra algo que no está, es alucinación y
hay que anotarla — es el modo de falla que el experimento busca.

Estos tres existen porque sin ellos estaríamos midiendo "¿es divertido chatear
con un LLM?" (sí, veinte minutos) en vez de "¿un mundo simulado y bien narrado
hace que la gente vuelva?".

## Cómo está armado

```
supabase/schema.sql       el mundo: lugares, gente, saberes, agendas, vínculos, eventos
supabase/migrations/      lo mismo, versionado (supabase db push)
lib/db.ts                 cliente; incluye el parche de WebSocket para Node 20
lib/check.ts              pnpm check — qué falta antes de que algo explote
lib/world/seed.ts         genera una región con gente que sabe y persigue cosas
lib/world/tick.ts         simulación pura. step() es la unidad
lib/world/run.ts          tickea solo cada N segundos (local)
lib/world/director.ts     narrate(nombre) → crónica auditada
lib/world/actions.ts      las cinco acciones
lib/web.ts                servidor: handler exportado, sirve local y en Vercel
api/index.ts, api/tick.ts entradas de Vercel
```

**Cinco verbos y nada más:** `ir`, `hablar`, `trabajar`, `aprender`, `ensenar`.
Si el bucle no funciona con cinco, no lo salva el sexto.

## Estado real (verificar antes de asumir)

- **Supabase:** proyecto `saber-escaso`, ref `yctlmtewnbqyfbojwzhi`, São Paulo.
  El CLI ya está logueado — **no le pidas al usuario que entre al dashboard.**
- **Vercel:** desplegado en https://saber-escaso.vercel.app, cuenta `pcfds`.
  El CLI ya está logueado. Cron a `/api/tick` cada 10 minutos.
- **Regiones:** `valle-pruebas` es donde se rompe y se arregla. Para el test de
  siete días hay que sembrar `valle-primero` limpio (`REGION_SLUG=valle-primero
  pnpm seed`). Hoy producción apunta a `valle-pruebas`.
- **Node 20 sin WebSocket nativo.** `lib/db.ts` le pasa `ws` como transporte a
  supabase-js. Con Node 22 esa línea se borra.

## Deuda conocida

- **`events.summary` es prosa en español.** `detail` (jsonb) debería ser la
  verdad canónica y el director renderizar al idioma del jugador. Hoy el
  director lee `summary`. Bloquea el bilingüe; no bloquea la Fase 0.
- **Un muerto puede tomar una agenda nueva** en el mismo tick en que muere.
  Se ve feo en la crónica.
- **La auditoría es a nivel de id, no de afirmación.** El director puede citar
  ids válidos y sobre-leerlos. Pasó una vez que sospeché eso y al chequear
  contra la base resultó que había narrado bien — pero el agujero existe.

## Cómo trabajar acá

**No le devuelvas tareas de infraestructura al usuario.** Los CLI de Supabase,
Vercel y GitHub están logueados. Crear proyectos, correr migraciones y
desplegar es tuyo. La única excepción legítima es un OAuth inicial.

**Medí antes de afirmar.** Este proyecto ya tuvo dos casos donde la conclusión
obvia era falsa: creí que el director había alucinado (no) y creí que faltaba
autenticar el MCP de Supabase (el CLI ya estaba logueado). Consultá la base o
corré el comando antes de escribir la conclusión.

**El hook de typecheck corre solo** al tocar `lib/*.ts` (`.claude/settings.json`).
Si falla, arreglalo antes de seguir — no lo desactives.
