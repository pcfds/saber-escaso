# Backlog

Ordenado por el roadmap, no por dificultad. Cada tarea tiene **dueño** y
**archivos**: si dos tareas se pisan los archivos, no se despachan juntas.

Las bases están en `DISENO.md`. Nadie arranca sin leerlas.

---

## Tramo 00 — contestar la pregunta

### 00.1 · Panel de métricas del test `esquema`
`lib/web.ts`
Quién entró, cuántas veces volvió cada uno, qué crónicas se generaron y cuánto
costaron. **Sin esto, al séptimo día hay impresiones en vez de datos**, y la
pregunta "¿vuelven solos?" se contesta con números o no se contesta. Es chico y
lleva pendiente desde que se propuso.

---

## Tramo 01 — que el cliente y el mundo sean la misma cosa

La brecha que hace que te ataquen bichos y no puedas hacer nada: los del
servidor te muerden, los de la pantalla son otros. Mientras siga partido, cada
cosa linda que agregue al cliente agranda la mentira.

### 01.1 · El servidor muestra las amenazas y el inventario `esquema`
`lib/web.ts`
Agregar a `/j/:token/mundo`:
```
amenazas: [{ id, kind, health, max_health, place_slug }]
objetos:  [{ kind, quality, made_by }]
```
Y `POST /j/:token/pelear` que encola la acción `pelear` y devuelve
`{ ok: true }`. Sin migración: las tablas ya existen.

### 01.2 · Los monstruos de la escena SON las amenazas de la base `jugabilidad`
`scripts/valle.gd`, `scripts/monstruo.gd`, `scripts/api.gd`
Dejar de crear monstruos locales en `_poblar_sotobosque()`. Crear uno por cada
amenaza que devuelve el servidor, en el lugar que corresponde, con la vida que
dice la base. Al golpear, `api.pelear()`; al llegar la respuesta, refrescar.

### 01.3 · Inventario en pantalla `jugabilidad`
`scripts/interfaz.gd`
Lista con lo que tenés y **quién lo hizo**. El nombre del que lo forjó es la
mitad del punto: un objeto que dice "lo hizo Ilde" veinte días después de que
Ilde no está es el juego entero en una línea. Es Frieren hecho interfaz.

### 01.4 · Ver a los otros jugadores `jugabilidad` + `esquema`
`lib/web.ts` (dónde está cada uno) y `scripts/valle.gd`
Sin esto no hay multijugador, hay gente compartiendo una base de datos.

### 01.5 · La landing en la home `esquema`
`lib/web.ts`
`lib/landing.ts` ya está escrita y no está cableada: la home de
`saber-escaso.vercel.app` tiene que ser la página del juego y llevar al
descargable de la demo. Pedido explícito: *"tipico de juego 3 A o indie, y
llevar al descargable de la demo"*.

### 01.6 · Dar de baja el cliente web `esquema`
`lib/web.ts`, `lib/mapa.ts`
El cliente Three.js está muerto (`DISENO.md` §17) y sigue en el repo: 600
líneas y una ruta `/mapa` viva que muestra un juego que ya no es el juego.
Borrar `lib/mapa.ts` y devolver 410 en `/mapa`, como se hizo con `/p/*`. **No
se hace hasta que 01.5 esté arriba**, para no dejar la home sin nada.

---

## Tramo 02 — que los NPCs sean personas

### 02.1 · Voz propia por persona `npc-voz`
`supabase/migrations/`, `lib/world/dialogo.ts`, `lib/world/seed.ts`
`people.voice`: cómo habla cada uno. Hoy el prompt dice "rioplatense" y sale un
valle entero de porteños. Una herrera de sesenta que trabaja sola no habla como
un aprendiz de diecisiete que debe plata. **La variación va en la persona, no
en el país** — ver la decisión pendiente de tono en `DISENO.md` §16.

### 02.2 · Memoria de lo conversado `npc-voz`
`supabase/migrations/`, `lib/world/dialogo.ts`
`memories` guarda lo que la gente VIO, no lo que se DIJERON. Si le contaste a
Ilde que venís del norte y a la charla siguiente no lo sabe, no es un personaje:
es un botón que devuelve texto.

### 02.3 · Cara `escena`
`scripts/figura.gd`
Ojos, y ropa que distinga un oficio de otro. Los monstruos tienen ojos y la
gente no: los bichos se leen como seres y los NPCs como maniquíes.

### 02.4 · Que te saluden `npc-voz` + `jugabilidad`
`lib/world/dialogo.ts`, `scripts/valle.gd`
Hoy el NPC sólo habla si lo apretás. Que te reconozcan al pasar y digan una
línea corta salida de su estado —te vieron, te deben, te tienen miedo— cambia
por completo si el valle está habitado o decorado. **Una línea, no una
conversación** (§9.4).

### 02.5 · Horarios `simulacion`
`lib/world/tick.ts`
Dormir, abrir, cerrar, estar donde corresponde según la hora. El cliente ya
sabe qué hora es en el valle; el servidor todavía no la usa para nada.

### 02.6 · Nacimientos `simulacion`
`lib/world/tick.ts`, `supabase/migrations/`
La gente muere y nadie nace. Una región sin jugadores se despuebla
monotónicamente y el saber sólo puede bajar: el mundo no se recompone, se
agota. Pedido desde el primer día: *"npcs con AI, viven, mueren, nacen"*.
Ojo con el ritmo — un tick es un día.

---

## Tramo 03 — razones para volver mañana

Cada una tiene que contestar qué le da a las tres formas de jugar
(`DISENO.md` §5).

### 03.1 · Tomar la agenda de un NPC como quest tuya `simulacion`
Ya existen y avanzan solas; falta poder agarrarlas. **El rol de la IA no es
inventarlas, es hacerlas visibles y personales**: *"Tobio quiere ver magia de
cerca, y vos acabás de aprender la runa de brasa"*. Y la lección del Witcher:
la situación siempre es más complicada que el pedido — ayudar a Odila a cobrar
significa apretar a Bruno, que te cae bien. Eso no se escribe: sale de que las
agendas se pisan.

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

### 03.5 · El verbo `dar` `simulacion` + `esquema`
`lib/world/actions.ts`, `supabase/migrations/`
Regalar algo mueve el vínculo con quien lo recibe. Es lo que cierra el bucle
chico: **aprendés → fabricás → regalás → te ganás a la gente → te enseñan
más.** Hoy fabricás y no hay nada que hacer con lo fabricado.

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
Pedro vuelva tres días seguidos.

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
  depende de una captura de Pedro.
- **El costo de la IA escala con jugadores.** Hoy es bajo porque somos uno.
- **Faltan agentes de ramas que Pedro pidió**: arte / dirección de arte,
  sonido, historia. Hoy hay siete y ninguno cubre esas tres.
