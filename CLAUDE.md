# Saber Escaso — instrucciones del proyecto

Juego de fantasía con mundo persistente narrado por un director de IA.
**Diseño completo:** https://claude.ai/code/artifact/525ba855-0f6f-4bf8-a661-0f802392ae2a

## Dónde estamos, de verdad

**Las bases del juego están en `DISENO.md`. El mapa, en `ROADMAP.md`. Las
tareas con dueño, en `BACKLOG.md`.** Este archivo es sólo el estado técnico de
este repo y las trampas ya pisadas.

La Fase 0 preguntaba una cosa: **¿el director de IA es divertido?** Nunca se
contestó — el test de cuatro personas y siete días sigue pendiente. Este
archivo decía "no construir 3D, motor, cámara, combate ni arte hasta que esté
contestada", y eso ya no rige: **Se decidió avanzar igual** ("el juego lo
quiero ver hoy ya el MVP", "no frenes"). Hay cliente Godot, `.exe`, combate,
objetos, cielo y ciclo de día y noche.

Que quede claro qué se eligió: **estamos construyendo encima de una pregunta
abierta, a sabiendas.** No es un descuido y no hay que "arreglarlo" frenando
todo. Sí hay que tenerlo presente cuando algo grande se apoya en que la
respuesta sea que sí.

## Cómo se trabaja acá

**Avanzá.** Se pidió explícitamente autonomía: "avanza con todo", "si no
acepté algo, dalo como aceptado así no te frenás", "no frenes". No le devuelvas
decisiones que podés tomar con las bases en la mano. Preguntá sólo cuando dos
lecturas razonables llevan a trabajos distintos.

**Usá lo último y lo mejor que haya.** Es un pedido explícito, no una
preferencia.

**Los agentes especialistas son de desarrollo, no NPCs del juego.** Están en
`.claude/agents/`; el `orquestador` es el único que tiene el mapa completo.

## Los invariantes. No se negocian.

Son **cuatro** y la lista completa está en `DISENO.md`. Los tres del servidor:

**1. `lib/world/tick.ts` NUNCA importa el SDK de IA** (hoy `@anthropic-ai/sdk`;
el proveedor es intercambiable, el invariante no). La simulación es
determinista y sin IA. Si algún día ese archivo importa un SDK de
modelo, el experimento se rompió y no lo vamos a notar.

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

**Seis verbos:** `ir`, `hablar`, `trabajar`, `aprender`, `ensenar`, `pelear`.
Arrancó con cinco a propósito —si el bucle no funciona con cinco, no lo salva
el sexto— y `pelear` entró porque el combate ya estaba pasando del lado del
cliente, donde no lo veía nadie. Un verbo de más es mejor que una mentira.
Falta `dar`, que está diseñado y no implementado: regalar mueve el vínculo, y
es lo que cierra el bucle chico (aprendés → fabricás → regalás → te ganás a la
gente → te enseñan más).

## Estado real (verificar antes de asumir)

- **Supabase:** proyecto `saber-escaso`, ref `yctlmtewnbqyfbojwzhi`, São Paulo.
  El CLI ya está logueado — **no le pidas al usuario que entre al dashboard.**
- **Vercel:** desplegado en https://saber-escaso.vercel.app, cuenta `pcfds`.
  El CLI ya está logueado. **Cron a `/api/tick` cada seis horas**
  (`0 */6 * * *` en `vercel.json`). Un tick es un día del valle, así que ese
  número es del que cuelgan TODAS las probabilidades del tick — y cambió: era
  cada hora hasta el 17 de agosto, y el mundo pasaba demasiado rápido — este renglón
  decía 10 minutos y era falso.
- **Regiones:** producción apunta a **`valle-primero`**. `valle-pruebas` es
  donde se rompe y se arregla (`REGION_SLUG=valle-pruebas`). Verificalo antes
  de asumirlo: este renglón ya estuvo mal una vez y mandó a un agente a
  depurar un valle vacío.
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
