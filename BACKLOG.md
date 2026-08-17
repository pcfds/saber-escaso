# Backlog

Ordenado por el roadmap, no por dificultad. Cada tarea tiene **dueño** y
**archivos**: si dos tareas se pisan los archivos, no se despachan juntas.

Las bases están en `DISENO.md`. Nadie arranca sin leerlas.

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
Ilde no está es el juego entero en una línea.

### 01.4 · Ver a los otros jugadores `jugabilidad` + `esquema`
`lib/web.ts` (dónde está cada uno) y `scripts/valle.gd`
Sin esto no hay multijugador, hay gente compartiendo una base de datos.

---

## Tramo 02 — que los NPCs sean personas

### 02.1 · Voz propia por persona `npc-voz`
`supabase/migrations/`, `lib/world/dialogo.ts`, `lib/world/seed.ts`
`people.voice`: cómo habla cada uno. Hoy el prompt dice "rioplatense" y sale un
valle entero de porteños. Una herrera de sesenta que trabaja sola no habla como
un aprendiz de diecisiete que debe plata.

### 02.2 · Memoria de lo conversado `npc-voz`
`supabase/migrations/`, `lib/world/dialogo.ts`
`memories` guarda lo que la gente VIO, no lo que se DIJERON. Si le contaste a
Ilde que venís del norte y a la charla siguiente no lo sabe, no es un personaje:
es un botón que devuelve texto.

### 02.3 · Cara `escena`
`scripts/figura.gd`
Ojos, y ropa que distinga un oficio de otro. Los monstruos tienen ojos y la
gente no: los bichos se leen como seres y los NPCs como maniquíes.

### 02.4 · Horarios `simulacion`
`lib/world/tick.ts`
Dormir, abrir, cerrar, estar donde corresponde según la hora. El cliente ya
sabe qué hora es en el valle; el servidor todavía no la usa para nada.

---

## Tramo 03 — razones para volver mañana

- **03.1 Tomar la agenda de un NPC como quest tuya** `simulacion` — ya existen,
  falta poder agarrarlas.
- **03.2 Una mazmorra** con algo adentro que no se consiga afuera.
- **03.3 Construir** `esquema` + `simulacion` — primero una casa.
- **03.4 Robar** `simulacion` — y que te lo recuerden mucho tiempo.

## Tramo 04 — que entre gente que no conocés

- **04.1 Cuentas de verdad** — hoy reparto un token por persona a mano. Aguanta
  diez amigos y se rompe en el once.
- **04.2 Invitaciones**, para que crezca de a poco.
- **04.3 Inglés** — el mundo se guarda en datos, así que se puede.

## Tramo 05 — Steam

Página con wishlist. No antes de que alguien que no sea Pedro vuelva tres días
seguidos.

---

## Deuda que muerde

- **`events.summary` es prosa en español.** `detail` debería ser la verdad y el
  director renderizar al idioma. Bloquea el bilingüe.
- **La auditoría es a nivel de id, no de afirmación.** El director puede citar
  ids válidos y sobre-leerlos.
- **No puedo ver lo que hago en Godot.** Sin GPU bajo WSL, todo juicio visual
  depende de una captura de Pedro.
- **El costo de la IA escala con jugadores.** Hoy es bajo porque somos uno.
