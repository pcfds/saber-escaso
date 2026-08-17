# Backlog

Ordenado por el roadmap, no por dificultad. Cada tarea tiene **dueño** y
**archivos**: si dos tareas se pisan los archivos, no se despachan juntas.

Las bases están en `DISENO.md`. Nadie arranca sin leerlas. El estado
verificado, en `ROADMAP.md`.

> **Este archivo es sólo lo que falta.** Lo terminado se saca de acá y aparece
> en "Anda" del roadmap. Si una tarea sigue escrita después de estar hecha, el
> próximo agente la vuelve a hacer: ya pasó y costó una ronda.

---

## En vuelo ahora mismo. No despachar nada que toque estos archivos.

| Qué | Dueño | Archivos tomados |
|---|---|---|
| `encargarse`, `buscar`, `dar`, y subir el umbral de confianza de `aprender` | `simulacion` | `lib/world/tick.ts`, `lib/world/actions.ts`, `supabase/migrations/20260817050000_...` |
| Que los NPCs quieran algo de la charla | `npc-voz` | `lib/world/dialogo.ts`, `supabase/migrations/20260817060000_voces_que_piden.sql` |
| **R1** · `jugadores` en `/mundo` + baja del cliente Three.js | `esquema` | `lib/web.ts`, `lib/mapa.ts` |
| Ilustraciones de la landing en SVG | — | `lib/landing.ts`, `lib/arte.ts` |
| Rendimiento y censo de la escena | — | `project.godot`, `_censo.gd`, `scripts/rendimiento.gd`, `scripts/ambiente.gd`, `scripts/detalles.gd`, `scripts/mapa.gd` |
| Que los NPCs te reconozcan al pasar | — | `scripts/valle.gd`, `scripts/interfaz.gd` |
| **P.2** · La paleta del valle | `arte` | `scripts/paleta.gd` (nuevo) |
| **P.1** · El valle suena | `sonido` | `scripts/sonido.gd`, `escenas/prueba_sonido.tscn` (nuevos) |
| Auditoría de la crónica | `director-critic` | ninguno (sólo lectura) |

**Nadie puede registrar autoloads**: `project.godot` está tomado. Las dos
tareas de cliente despachadas entregan módulo suelto y **el cableado en
`valle.gd` lo hace el orquestador** cuando ese archivo se libere.

La primera cubre lo que antes eran **03.1** (tomar agendas como quest) y
**03.5** (el verbo `dar`): salieron de la lista de abajo y todavía no están
terminadas — los tres verbos están en el `CHECK` de la migración pero no en el
`switch` de `tick.ts`.

---

## Lo primero: recalibrar el ritmo `simulacion`

`lib/world/tick.ts` — **bloqueado hasta que se libere** (ver arriba).

El día del valle pasó de 1 hora real a 6. Las probabilidades siguen bien en
tiempo de mundo y dispararon 6× menos seguido en tiempo real. La tabla con las
tres cuentas está en `ROADMAP.md`. Lo que hay que tocar:

- **La ventana de mordida** (`region.tick - p.last_seen_tick <= 3`) pasó de 3 a
  18 horas reales. Ahora que `player.health` es real y visible, entrás al otro
  día herido o caído por algo que pasó mientras dormías. Rompe la regla dura de
  `DISENO.md` §9.3: *nunca puede costarte tiempo de juego.* Bajarla a 1.
- **Reponer amenazas** (35 % por tick, tope 3) tarda 17 horas reales. Limpiás
  el valle y no hay nada que pelear por casi un día. Choca con la sesión de una
  hora (§10.3).
- **La muerte** (0,8 % por tick) está bien en tiempo de mundo —2,9 por año de
  valle— y por eso es la más delicada. El problema es que el test de la Fase 0
  son 28 ticks y la chance de que se muera alguien es del 20 %: **cuatro de
  cada cinco corridas del test no ven morir a nadie**, y ésa es la tesis del
  juego. No se arregla subiendo el número a lo bruto —el valle se consume— sino
  decidiendo qué se está midiendo. Va con una propuesta y una corrida, no con
  un número puesto de prepo.

---

## Tramo 00 — contestar la pregunta

### 00.1 · Panel de métricas del test `esquema`
`lib/web.ts`
Quién entró, cuántas veces volvió cada uno, qué crónicas se generaron y cuánto
costaron. **Sin esto, al séptimo día hay impresiones en vez de datos**, y la
pregunta "¿vuelven solos?" se contesta con números o no se contesta. Es chico y
lleva pendiente desde que se propuso.

### 00.2 · Registro de tokens `esquema`
`lib/web.ts`
Los tokens **son** el sistema de cuentas y no hay ningún archivo que diga quién
tiene cuál. Hay cinco jugadores en `valle-primero` y el reparto vive en la
cabeza de quien lo hizo. Para un test de cuatro personas y siete días, perder
el mapeo es perder el test.

---

## Tramo 01 — que el cliente y el mundo sean la misma cosa

Queda una sola tarea. El resto está en "Anda".

### 01.4 · Ver a los otros jugadores `jugabilidad` + `esquema`
`lib/web.ts` (dónde está cada uno) y `scripts/valle.gd`
Sin esto no hay multijugador, hay gente compartiendo una base de datos.
Contrato: `/mundo` suma
`jugadores: [{ name, place_slug, health, caido }]` sin incluirte a vos.

### 01.6 · Dar de baja el cliente web `esquema`
`lib/web.ts`, `lib/mapa.ts`
El cliente Three.js está muerto (`DISENO.md` §17) y sigue en el repo: 600
líneas y una ruta `/mapa` viva que muestra un juego que ya no es el juego.
Borrar `lib/mapa.ts` y devolver 410 en `/mapa`, como se hizo con `/p/*`. Ya no
está bloqueado: la landing está arriba.

### 01.7 · `/pelear` no valida presencia `esquema`
`lib/world/combate.ts`
Con el uuid le pegás a una amenaza que está en otro lugar del valle. Hoy no
muerde porque el cliente sólo manda golpes a menos de 3,2 m, pero es
cooperativo por omisión y no por decisión. Chico.

---

## Tramo 02 — que los NPCs sean personas

Voz propia, memoria de lo conversado y cara ya están. Falta esto.

### 02.4 · Que te saluden `npc-voz` + `jugabilidad`
`lib/world/dialogo.ts`, `scripts/valle.gd`
Pedido textual de quien lo está jugando: *"si me acerco, ¿no deberían saludarme
al menos? después poner hablar o no, pero ya saben que estoy"*. Que te
reconozcan al pasar y digan una línea corta salida de su estado —te vieron, te
deben, te tienen miedo— cambia por completo si el valle está habitado o
decorado. **Una línea, no una conversación** (§9.4). Y **no puede ser una
llamada al modelo por cada NPC que pasás**: el saludo sale del estado, con
plantilla; el modelo entra recién si te parás a hablar.
Ya no está bloqueado: `valle.gd` se liberó en `7c495e8`.

### 02.5 · Horarios `simulacion`
`lib/world/tick.ts`
Dormir, abrir, cerrar, estar donde corresponde según la hora. El cliente ya
sabe qué hora es en el valle; el servidor todavía no la usa para nada.

### 02.6 · Nacimientos `simulacion`
`lib/world/tick.ts`, `supabase/migrations/`
La gente muere y nadie nace. Una región sin jugadores se despuebla
monotónicamente y el saber sólo puede bajar: el mundo no se recompone, se
agota. Pedido desde el primer día: *"npcs con AI, viven, mueren, nacen"*.
Ojo con el ritmo — un tick es un día y ahora un día son seis horas reales.

---

## La franja de percepción — cruza todos los tramos

No va después de nada: va **en paralelo**. Es la respuesta al riesgo número uno
(Dwarf Fortress). Ver `ROADMAP.md`.

### P.1 · El valle suena `sonido`
`scripts/sonido.gd` (nuevo) y el registro en `scripts/valle.gd`.
Hoy no hay un solo `AudioStream` en el cliente: cero, verificado. El orden que
rinde está en el agente: ambiente que cambia con el lugar y la hora, después
pasos, después el golpe. **Sin assets todavía** — decí honestamente hasta dónde
llega la síntesis y dónde hace falta grabar o comprar. Nadie del equipo puede
escuchar el resultado: pedí que alguien lo escuche.

### P.2 · La paleta del valle `arte`
`scripts/paleta.gd` (nuevo). **No** tocar los otros scripts en la misma tarea.
93 literales `Color(...)` repartidos en ocho scripts, cada uno con su marrón.
Ése es el diagnóstico exacto de *"parece Playmobil"*: no hay colores malos, hay
colores de ocho tachos distintos. Primero el archivo con la paleta y los
materiales base; la migración de cada script viene después y de a uno.
**No está bloqueado por el piso de zoom**: una paleta se decide por valor y
saturación a la distancia de la cámara, que es justamente lo que ya está
resuelto.

### P.3 · Vegetación a la escala del valle `naturaleza`
`scripts/vegetacion.gd` (nuevo).
Ojo con el diagnóstico, que en el agente está escrito de más: **sí hay
árboles** — `_armar_bosque()` planta 46 conos con tronco. El problema es otro y
es peor: están **sólo dentro del grupo `bosque`, en un radio de 13 m**, y el
valle pasó de 132 a 360 m. El 99 % del mapa no tiene nada. No es agregar
árboles, es que la vegetación nunca escaló con el mapa. MultiMesh, variación
determinista por posición, agrupamiento junto al agua, y los colores los pide
`paleta.gd` (P.2).

### P.4 · Que el bicho diga de qué pueblo es `personajes`
`scripts/figura.gd`, `scripts/monstruo.gd`
En producción hay una amenaza llamada **"Kerrak el que quedó"**, del pueblo
**"Los del Sotobosque"**, y en pantalla es un bicho genérico. El dato ya viaja
en `/mundo` (`nombre`, `kind`): sólo falta que se lea. Es la franja de
percepción en su forma más barata — cero trabajo de servidor, el sistema ya
existe. Es la mitad de cliente de **03.9**, y se puede hacer antes: los tres
bichos con nombre ya están en la base.

### P.5 · Interiores `arquitectura`
*"No hay puertas para entrar."* Hoy `detalles.gd` dibuja una puerta en cada
casa y no se abre ninguna. **Es la más cara de la franja y la última**: pide
kit modular, interiores, y una decisión de cámara adentro. No antes de P.1–P.4.

---

## El bloqueo que se sacó

**El piso de zoom quedó decidido el 17 de agosto** y está en `DISENO.md` §6:
la cámara se acerca hasta leer **silueta, postura y ropa**, nunca una
expresión. **No hacen falta caras modeladas ni animación facial**; el
presupuesto de arte va a silueta, valor y color. Los primeros planos son un
modo aparte, no una posición de cámara.

**La rama de arte está desbloqueada.** Todo prompt de `arte`, `naturaleza`,
`arquitectura` y `personajes` lleva esta decisión adentro: es lo que define si
lo que hacen se lee o se desperdicia.

---

## Tramo 03 — razones para volver mañana

Cada una tiene que contestar qué le da a las tres formas de jugar
(`DISENO.md` §5).

> **03.1 (tomar agendas como quest) y 03.5 (el verbo `dar`) están en vuelo.**
> Ver la tabla de arriba. No se despachan.

### 03.1b · Que el encargo se vea `jugabilidad`
`scripts/interfaz.gd`
Cuando 03.1 aterrice, el jugador tiene que poder ver de qué se hizo cargo y
cómo va. Un encargo que sólo existe en la tabla `encargos` es una quest que el
jugador no sabe que tomó. **No se despacha hasta que el verbo esté andando** —
y el contrato lo escribe el orquestador con los campos que termine teniendo
`/mundo`.

### 03.2 · Una mazmorra `simulacion` + `escena`
**No es un pasillo con botín: es donde quedó el saber de un muerto.** La Casa
Quemada ya lo es y no lo sabe — ahí vivía Ren y con ella se fueron dos runas.
Bajás a recuperar una técnica perdida, no a farmear. Eso le da a la mazmorra
una razón que sale del juego y no de una convención de género, y la ata a
§11.3 (los espíritus: una técnica, una vez).

### 03.3 · Construir `esquema` + `simulacion`
**Un pueblo no son edificios, son personas que saben cosas.** Construir no es
levantar paredes: es armar un lugar donde un maestro acepte vivir. Lo primero
no es "una casa" — es el par: un edificio **y** que eso haga que alguien con
oficio acepte quedarse.
Las tres reglas que no se negocian: **por partes, no por vóxeles** (kit
modular autorado); **nunca juntás cuatro mil troncos, contratás** (NPCs
albañiles con oficio, y la obra avanza mientras no estás); **la escala la da la
gente, no los materiales**. Y el reclamo caduca si el lugar queda muerto: **la
tierra se tiene poblándola.**

### 03.4 · El eco `simulacion` + `npc-voz`
`lib/world/tick.ts`, `lib/world/dialogo.ts`, `supabase/migrations/`
Tu personaje cuando te desconectás (`DISENO.md` §9.1). Es la respuesta al mundo
vacío y a la liquidez del saber: sin ecos hay que coincidir de horario con tu
maestro para aprender algo.
**La regla es el contrato de la tarea: el eco hace, no decide.** Puede enseñar,
trabajar, hablar, recordar, llevar un mensaje, negarse. No puede gastar,
vender, regalar, prometer, pactar, traicionar, aprender en tu nombre ni mover
tu posición. Se ve de entrada que es un eco. Invoca el modelo **sólo** cuando
alguien interactúa.

### 03.9 · Los pueblos, en el código `historia` + `simulacion`
`lib/world/tick.ts` (bloqueado), `lib/world/seed.ts`
**Es la brecha más grande que hay entre lo que el juego promete y lo que hace.**
Las tablas existen (`peoples` con `lengua` y `agravio`, `threats.people_id`,
`threats.nombre`), hay dos pueblos sembrados a mano en producción, y
`grep -rn "peoples" lib/` **no devuelve nada**. El tick sigue spawneando
`una jauría de sombra` sin dueño y sin nombre, y un `seed` de una región nueva
no crea ningún pueblo: las tres filas que hay se van a diluir solas. Mientras
tanto la landing ya le promete al público que se les puede hablar y negociar.
Empieza por lo barato: que el spawn elija un pueblo de la región y le ponga
nombre. La lengua viene después.

### 03.6 · Robar `simulacion`
Y que te lo recuerden mucho tiempo.

### 03.7 · Lugares para frenar `escena`
`scripts/valle.gd`
*"No hay lugares para frenar."* El valle es tránsito: no hay dónde sentarse,
mirar, esperar a alguien. Un banco junto al río, un fuego, un mirador. Barato,
y es la mitad del tono de Frieren.

### 03.8 · Charlar entre jugadores `jugabilidad` + `esquema`
Quedarse hablando con otro jugador dentro del valle. Pedido explícito y no está
en ningún lado. Depende de 01.4.

---

## Tramo 04 — que el mundo se genere solo

- **04.1 El generador de regiones** `simulacion` + `esquema` — **no se genera
  terreno, se genera historia.** Una región nueva sale con gente adentro, con
  lo que saben, con lo que pasó ahí y con lo que perdieron.
- **04.2 El test del generador** `simulacion` — si una región sale sin nadie
  que sepa nada, salió mal. Es verificable por sistema y tiene que fallar el
  build, no quedar en un comentario.
- **04.3 Abrir por presión de población** `simulacion` — el mundo se abre donde
  la gente empuja, nunca por adelantado. La cordillera del valle ya tiene la
  abertura al norte por donde va a crecer.
- **04.4 La ley de densidad** `escena` — vacío declarado grande a propósito,
  zonas raras chicas. Ver la tabla en `DISENO.md` §7.4.

## Tramo 05 — que entre gente que no conocés

- **05.1 Cuentas de verdad** — hoy reparto un token por persona a mano. Aguanta
  diez amigos y se rompe en el once.
- **05.2 Invitaciones**, para que crezca de a poco.
- **05.3 Inglés** — el mundo se guarda en datos, así que se puede. Bloqueado por
  la deuda de `events.summary`.

## Tramo 06 — Steam

Página con wishlist y devlog. Clips de historias emergentes: el activo de
marketing y la validación son la misma cosa. No antes de que alguien que no sea
la dirección del proyecto vuelva tres días seguidos.

---

## Cosas chicas que faltan y no tienen tramo

- **Saltar** existe en Godot y en ningún documento. Anotarlo o sacarlo.
- **NPCs enemigos**, distintos de los monstruos: gente que te quiere mal.
  Depende de 02.x, porque un enemigo sin memoria es un monstruo con nombre.
- **"Épicas"** — set pieces grandes. No antes del tramo 04: sin generador y sin
  umbrales del mundo, un acontecimiento grande es un evento de temporada
  (`DISENO.md` §11.1).

---

## Deuda que muerde

- **`events.summary` es prosa en español.** `detail` debería ser la verdad y el
  director renderizar al idioma. Bloquea el bilingüe.
- **La auditoría es a nivel de id, no de afirmación.** El director puede citar
  ids válidos y sobre-leerlos.
- **Un muerto puede tomar una agenda nueva** en el mismo tick en que muere.
- **No puedo ver lo que hago en Godot.** Sin GPU bajo WSL, todo juicio visual
  depende de una captura de quien lo esté jugando.
- **El costo de la IA escala con jugadores.** Hoy es bajo porque somos uno. Y
  02.4 lo empeora si se hace mal: un saludo por NPC que pasás es una llamada
  por NPC que pasás.
- **`lib/tmp-estado.ts` y `lib/tmp-medir.ts` quedaron sueltos.** Scripts de
  diagnóstico. El agente `economia` los pide en `lib/tmp-*.ts` y que se borren
  al terminar; no se borraron. Hay que barrerlos antes de commitear.
- **Nadie puede ver ni escuchar el resultado.** Sin GPU bajo WSL, todo juicio
  visual —y ahora también el de audio— depende de quien lo esté jugando. Es la
  rama con el ciclo de realimentación más lento del proyecto.
- **El comentario de la muerte en `tick.ts` quedó viejo.** Dice *"con un tick
  por hora son ~1 muerte cada 5 días"* y el tick ya no es por hora. Se corrige
  cuando el archivo se libere.
