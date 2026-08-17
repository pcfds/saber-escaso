# Roadmap

Dónde estamos y hacia dónde. Las bases están en `DISENO.md`; las tareas con
dueño y archivos, en `BACKLOG.md`. Este archivo es el mapa que usa el
`orquestador` para decidir qué se toca.

Versión navegable, para mostrar:
https://claude.ai/code/artifact/72f7a2cf-ca42-4a9b-b076-2d315edfce03

> **Regla de este archivo:** nada entra en "anda" sin haberse corrido. Lo que
> se probó y falló va a "a medias" con el motivo. Si decís que algo funciona
> porque compila, este archivo deja de servir para planificar.

---

## Estado (17 de agosto de 2026, tarde)

> **Cómo leer esto.** "Anda" es lo que se corrió. "En vuelo" es lo que alguien
> está escribiendo **ahora mismo**: esos archivos están tomados y no se
> despachan. "A medias" es lo que se probó y falla. Si esta sección no
> distingue las tres cosas, el próximo agente reimplementa algo que ya existe —
> pasó una vez y costó una ronda entera.

### En vuelo ahora mismo — archivos tomados, no despachar

| Qué | Archivos tomados |
|---|---|
| Quests tomables (`encargarse`), `buscar`, `dar`, y el umbral de confianza de `aprender` | `lib/world/tick.ts`, `lib/world/actions.ts`, `supabase/migrations/20260817050000_...` |
| Que los NPCs quieran algo de la charla | `lib/world/dialogo.ts`, `supabase/migrations/20260817060000_...` |
| `jugadores` en `/mundo` + baja del cliente Three.js | `lib/web.ts`, `lib/mapa.ts` |
| Ilustraciones de la landing en SVG | `lib/landing.ts`, `lib/arte.ts` |
| Rendimiento y censo de la escena | `project.godot`, `_censo.gd`, `scripts/rendimiento.gd`, `scripts/ambiente.gd`, `scripts/detalles.gd`, `scripts/mapa.gd` |
| Que los NPCs te reconozcan al pasar | `scripts/valle.gd`, `scripts/interfaz.gd` |
| La paleta del valle | `scripts/paleta.gd` *(nuevo)* |
| El valle suena | `scripts/sonido.gd`, `escenas/prueba_sonido.tscn` *(nuevos)* |
| Auditoría de la crónica | ninguno — sólo lectura |

**Ocho ramas en paralelo, cero solapamiento de archivos.** Es la forma en que
este proyecto puede ir rápido, y depende enteramente de que esta tabla esté al
día: si se desactualiza, dos agentes se pisan y se pierde media hora. **Nadie
puede registrar autoloads** mientras `project.godot` esté tomado.

La migración `20260817050000` ya está escrita y aplicada (crea `encargos`,
`agendas.needs_object`, y suma los tres verbos al `CHECK`), pero cuando se
revisó **los verbos todavía no estaban en el `switch` de `tick.ts`**: la tarea
no había terminado. El archivo de la migración sigue sin commitear.

Sueltos en el árbol y sin commitear: `lib/tmp-estado.ts` y `lib/tmp-medir.ts`,
scripts de diagnóstico. No son código del juego y hay que borrarlos al cerrar.

### Anda — verificado corriendo

**El mundo**
- Mundo persistente que avanza solo, con o sin jugadores (a un cuarto de paso
  si no hay nadie).
- Director de IA que narra. **Ojo: el "sólo puede afirmar hechos que están en
  `events`" resultó ser falso en la práctica** — ver la auditoría más abajo. El
  invariante está escrito y la implementación no lo sostiene.
- Agendas: los NPCs persiguen cosas, avanzan y se traban solos.
- El saber se aprende, se enseña y se pierde con el que se muere.
- **La destreza sube practicando** y decide la calidad de lo que te sale de las
  manos (0 → 45 en cinco prácticas; hojas de calidad 9 a 60).
- Reputación de dos ejes: `valued` y `feared` por separado.
- Objetos que sólo existen si alguien sabe hacerlos.
- **Alguien que te aprecia (40+) puede meterse a defenderte** cuando te muerde
  una amenaza, y salvarte deja una deuda. La reputación dejó de ser un número
  en una tabla.

**El cliente y el mundo, ya pegados**
- **El combate es de ida y vuelta y vive en el servidor.** Vos pegás con
  `POST /pelear`; el bicho te pega con `POST /danio`; te levantás con
  `POST /levantarse`. Probado en producción: 100 → 91 → 76 → 61.
- **Los monstruos de la escena SON las filas de `threats`.** Posición derivada
  del hash del id, así que el mismo bicho está en el mismo punto para todos.
  Si otro lo mata, se te cae de la pantalla.
- **El inventario se ve, y dice quién lo hizo.**
- `/mundo` devuelve `player.health`, `max_health` y `caido`.
- **`primeros_pasos`**: qué hacer ahora, derivado del estado y no de un modelo,
  así que nunca te manda a hacer algo imposible. Vivo en producción.
- **Dónde estás lo sabe el mundo** (`POST /estoy`), con histéresis en el
  cliente (entrás a 30 m, salís a 44) y deduplicación por tick en el endpoint.

**Los NPCs**
- Hablarles con tus propias palabras.
- **Voz propia por persona** (`people.voice` + `people.historia`), sembrada en
  las dos regiones. Se distinguen tapando el nombre.
- **Se acuerdan de lo conversado** (tabla `talks`). Verificado contra la base:
  *"¿Te acordás de dónde te dije que venía?" → "Del norte, dijiste."*
- **Cara**: ojos, parpadeo desincronizado y ropa por oficio, todo derivado de
  hashear el nombre.

**Alrededor**
- Cliente 3D con cuerpos animados, cielo propio con estrellas y dos lunas,
  ciclo de día y noche atado al reloj del servidor, y un `.exe` que se baja.
- **El valle mide 360 m** (era 132), con correr en shift y mapa en M.
- La landing está cableada: la home de `saber-escaso.vercel.app` es la página
  del juego.
- **El proveedor de IA salió del código.** `lib/modelo.ts` es la única puerta;
  `director.ts`, `dialogo.ts` y `check.ts` no importan ningún SDK. No estamos
  atados a nadie: se usa el más barato que dé la calidad necesaria.

### A medias — probado y falla

- **El invariante 3 está roto: el director afirma cosas que no están en
  `events`.** Es lo más grave de esta lista y recién se supo el 17 de agosto,
  con la primera auditoría sistemática. Sección propia abajo.
- **El ritmo quedó descalibrado por el cambio a seis horas.** Es lo más urgente
  después de lo anterior, porque degrada el experimento que el proyecto entero
  está midiendo.
- **Los pueblos existen en la base y no existen en el código.** `peoples`,
  `threats.people_id` y `threats.nombre` están creados y hay dos pueblos
  sembrados con nombre propio en producción ("Los del Sotobosque", "Los de la
  Ceniza"), pero `grep -rn "peoples" lib/` **no devuelve nada**: el tick sigue
  spawneando `una jauría de sombra` / `un merodeador` sin dueño y sin nombre.
  El próximo bicho vuelve a ser un mob anónimo, y un `seed` de una región nueva
  no crea ningún pueblo. Mientras tanto la landing ya se lo promete al público.
- **No ves a los otros jugadores dentro del valle.** `/mundo` no devuelve
  ningún array de jugadores. Es la única tarea del tramo 01 que sigue entera.
- **El valle es mudo.** Cero `AudioStream` en todo el cliente. Es la mitad de
  por qué se lee como maqueta, y no lo compensa ningún efecto visual.
- **La vegetación no escaló con el valle.** Hay árboles —46 conos con tronco—
  pero **sólo dentro del grupo `bosque`, en un radio de 13 m**. El valle mide
  360 m: el 99% del mapa no tiene un solo árbol. No es que falten árboles, es
  que el cambio de 132 a 360 m los dejó siendo una manchita.
- **No hay paleta.** 93 literales `Color(...)` repartidos en ocho scripts, cada
  uno inventando su marrón y su verde. Es el diagnóstico exacto de
  *"parece Playmobil"*: no hay colores malos, hay colores de tachos distintos.
- **Las puertas están pintadas.** `detalles.gd` dibuja una puerta en cada casa
  y no se abre ninguna: no hay interiores. *"No hay puertas para entrar."*
- **Los NPCs no te registran al pasar.** Sólo hablan si los apretás.
  *"Si me acerco, ¿no deberían saludarme al menos?"*
- **`/pelear` no valida presencia**: con el uuid le pegás a algo que está en
  otro lugar del valle. Hoy no muerde porque el cliente sólo manda golpes a
  menos de 3,2 m, pero es una puerta abierta.
- **El cliente web muerto sigue en el repo.** `lib/mapa.ts` y la ruta `/mapa`
  siguen vivas (`DISENO.md` §17 las da de baja). Ya no bloquea nada: la landing
  está arriba.

### No existe
Cuentas (hoy es un token por persona repartido a mano, y **no hay registro de
quién tiene cuál**) · el eco · construir · mazmorras · robar · horarios de NPC ·
nacimientos · el generador de regiones · las lenguas de los pueblos · inglés y
los idiomas inventados · el panel de métricas del test.

---

## El ritmo, y lo que hay que recalibrar

**Cambió el 17 de agosto: un día del valle pasó de 1 hora real a 6.**
Cron `0 */6 * * *`, `momento_del_dia` con módulo de 21.600.000 en `lib/web.ts`,
`DIA_REAL := 21600.0` en `ciclo.gd`. El motivo era bueno — el mundo pasaba
demasiado rápido.

**El número que cuelga de esto es 4 ticks por día real** (eran 24). Toda
probabilidad por tick sigue estando bien calibrada **en tiempo de mundo** y
dispara **seis veces menos seguido en tiempo real**. Tres quedaron mal y hay
que tocarlas:

| Qué | Hoy | En tiempo de mundo | En tiempo real | Veredicto |
|---|---|---|---|---|
| Muerte | 0,8 % / tick | 2,9 por año de valle — **correcto** | una cada ~31 días | **demasiado rara** |
| Reponer una amenaza | 35 % / tick, tope 3 vivas | 2,9 días de valle | **17 horas reales** | **demasiado lenta** |
| Ventana de mordida | `tick - last_seen <= 3` | 3 días de valle | **18 horas reales** | **castiga desconectarse** |

Los tres razonamientos, porque el número solo no alcanza:

- **La muerte.** En tiempo de mundo está perfecta y no hay que tocarla por ahí.
  El problema es el experimento: el test de la Fase 0 son **siete días reales =
  28 ticks**, y la probabilidad de que se muera alguien en esos 28 ticks es
  **20 %**. Antes era 74 %. O sea que **cuatro de cada cinco corridas del test
  no van a tener una sola muerte** — y "el saber vive en gente que se muere" es
  la tesis entera. La evidencia que tenemos (murió la vieja Ren en el tick 10 y
  se llevó las dos runas del valle) hoy no se reproduciría.
- **Las amenazas.** Limpiás las tres y el valle queda sin nada que pelear
  durante casi un día de reloj. Choca de frente con la sesión de una hora que
  pide `DISENO.md` §10.3.
- **La ventana de mordida.** Ésta nació de cruzar dos cambios que se hicieron
  por separado y nadie miró juntos: la ventana era de 3 horas reales y ahora es
  de 18, y al mismo tiempo `player.health` pasó a ser real y visible. Resultado:
  te desconectás a la tarde, entrás al otro día y estás herido o caído por algo
  que pasó mientras no estabas. `DISENO.md` §9.3 tiene la regla dura —
  *nunca puede costarte tiempo de juego* — y esto la rompe.

> El comentario de `lib/world/tick.ts` sobre la muerte todavía dice *"con un
> tick por hora son ~1 muerte cada 5 días"*. Quedó viejo con el cambio de
> ritmo. Ese archivo está en vuelo; se corrige cuando se libere.

---

## Los tramos

El orden no es por dificultad: es por qué pregunta contesta cada tramo.
Saltearse uno no ahorra tiempo, lo posterga.

**00 · ¿El director es divertido?** — *sin contestar.*
Cuatro personas, siete días, dos preguntas: ¿vuelven sin que se lo pidas?
¿pueden contar una historia que nadie escribió? Todo lo demás está apostado a
que la respuesta sea que sí. **Se decidió avanzar igual, a sabiendas** — no es
un descuido, es una apuesta tomada. Falta el panel que la conteste con datos y
no con impresiones.

**01 · Que el cliente y el mundo sean la misma cosa** — *casi cerrado.*
Era la brecha que hacía que te atacaran bichos y no pudieras hacer nada. El
combate va y viene por el servidor, los monstruos que ves son las filas de
`threats`, el inventario se ve y la vida es la de la base. **Queda una sola
cosa: ver a los otros jugadores.** Sin eso no hay multijugador, hay gente
compartiendo una base de datos.

**02 · Que los NPCs sean personas** — *acá estamos.*
Tienen voz propia y se acuerdan de lo conversado; ya tienen cara. Falta que te
registren al pasar y que tengan horarios. Un personaje que no se acuerda de vos
es un botón que devuelve texto — y uno que no te mira cuando pasás es un
mueble.

**03 · Razones para volver mañana.**
Tomar agendas como quests, una mazmorra, construir, robar, el eco. La respuesta
a "qué hago hoy" no puede ser "lo de ayer pero más veces". **Y tiene que darle
algo a las tres formas de jugar** (§5 de `DISENO.md`): al que sale de aventura,
al que pelea con amigos y al que se queda construyendo.

**04 · Que el mundo se genere solo.**
El generador de regiones. Es el tramo que convierte "un valle" en "un mundo", y
Se pidió textual: *"falta todo y el motor procedural pero sin perder
nada"*. La regla que lo gobierna no es de terreno: **no se genera terreno, se
genera historia** — una región sale del generador con gente adentro, con lo que
saben y con lo que perdieron, y si sale sin nadie que sepa nada, salió mal y el
generador lo detecta solo. Va después del 03 porque generar lugares vacíos es
peor que no generar nada.

**05 · Que entre gente que no conocés.**
Cuentas, invitaciones, inglés. No antes de tener algo que valga la pena
mostrarle a un desconocido.

**06 · Steam.**
Página con wishlist y devlog, clips de historias emergentes, demo en Next Fest.
Ninguna de esas antes de que alguien que no seamos nosotros vuelva tres días
seguidos. **Kickstarter no es el primer paso** y puede que no sea ninguno: ver
`DISENO.md` §12.5.

### La franja que cruza todos los tramos: que se perciba

No es un tramo y no va después de nada. Es la respuesta al riesgo número uno de
este proyecto —**Dwarf Fortress**, simular es barato y lo caro es que el
jugador lo perciba— y hay que atenderla **en paralelo**, o cada tramo agrega
sistemas que nadie ve.

La evidencia de que ya está pasando es concreta y verificable hoy: en
producción hay una amenaza llamada **"Kerrak el que quedó", del pueblo "Los del
Sotobosque"**, con un agravio escrito en la base. En pantalla es un bicho
genérico con ojos naranjas. **El sistema ya existe y el jugador no puede
saberlo.** Poner quests, construir y lenguas encima de eso produce más de lo
mismo.

Qué entra en la franja, y el orden por cuánto rinde:

1. **Sonido.** Hoy es cero absoluto: no hay un solo `AudioStream` en el
   cliente. Es lo más barato con más efecto y es lo único que ningún arreglo
   visual compensa.
2. **La paleta.** Una decisión, un archivo, y todo lo demás derivado. Es el
   arreglo real de *"parece Playmobil"*: el problema no son los colores, es que
   son de ocho tachos distintos.
3. **Vegetación a la escala del valle.** El mapa creció 2,7× y los árboles se
   quedaron en una manchita de 13 m.
4. **Que lo que ya existe en la base se vea**: el nombre y el pueblo del bicho,
   que los NPCs te registren al pasar.

**Y hay un bloqueo que hay que sacar, porque frena la franja entera:** el piso
de zoom sigue sin decidirse (`DISENO.md` §16) y el agente `arte` tiene escrito
que no trabaja sin eso. Es la única decisión abierta que hoy tiene una rama
entera parada.

### Diferido a propósito: el segundo mundo

Viajar entre regiones está en el diseño y **no está en ningún tramo de arriba.
Es deliberado.**

> Es barato de construir y caro de sostener: te multiplica los servidores, los
> bugs y el griefing, y no te enseña nada que un solo mundo no te haya enseñado
> ya. **El universo no se diseña. Se agrega cuando un mundo solo ya le gustó a
> alguien.**

El disparador es una sola pregunta: **¿la primera región se llenó?** Hasta que
la respuesta sea que sí, no se toca.

---

## Lo que puede matar esto

### Riesgos de producto

- **Que la simulación sea invisible.** Es el riesgo número uno y tiene nombre:
  **Dwarf Fortress.** Simula todo esto desde hace veinte años sin IA, y su
  mundo es fascinante para leerlo y casi imperceptible para jugarlo. La gente
  se enamora de las historias contadas en Reddit, no vividas en pantalla.
  Simular es barato; **lo caro es que el jugador lo perciba.**
- **Que no haya nadie adentro.** Los MMO chicos no mueren por mal diseño,
  mueren por servidores vacíos. **La diferencia entre dos jugadores y diez no
  puede ser la diferencia entre divertido y muerto:** el contenido base tiene
  que aguantar de a uno o dos, y los habitantes simulados —más el eco— tienen
  que ocupar el lugar social a las 3 de la mañana.
- **Descubribilidad de la magia.** Es lo que hunde a los juegos de runas. Arx
  Fatalis es amadísimo y de nicho justamente por esto: si el jugador no sabe
  qué hacer, se va en veinte minutos. La respuesta es que los NPCs enseñen y un
  grimorio registre sólo lo aprendido. **Nunca un menú con todo.**
- **Netcode de combate por habilidad.** Con veinte personas y objetos volando
  es de las cosas genuinamente difíciles del proyecto. Es costo real, no lo
  descuentes.
- **Habilidad más apuestas altas es duro.** El que juega bien va a arrasar al
  que entra una hora. Ya se eligió ese público, así que está bien — pero
  entonces el "distenderse" depende enteramente de que existan las capas donde
  nadie te puede tocar: herrería, construcción, enseñar.
- **Creer que el early access encuentra público.** Sirve para servir a una
  audiencia que ya encontraste, no para encontrarla.
- **Ashes of Creation.** Prometer el mundo y no entregar nada jugable. El
  antídoto es el orden de arriba: cada tramo deja algo jugable esa misma noche.

### Riesgos de operación

- **Estamos construyendo encima de una pregunta abierta.** La Fase 0 nunca se
  contestó. Cada semana de features es una semana apostada. Está decidido y
  asumido; lo que no se puede es olvidarlo.
- **El costo de la IA escala con la gente.** Hoy es bajo porque somos uno. Cada
  charla es una llamada y cada crónica otra.
- **Nadie del equipo puede ver el juego, ni escucharlo.** Godot corre sin GPU
  bajo WSL: la escena que se compila no se parece a la que ve la dirección del
  proyecto. Todo juicio visual depende de una captura de quien lo esté jugando,
  y con el audio va a pasar lo mismo. **Esto es lo que hace cara la franja de
  percepción**, no la dificultad técnica: es la rama con el ciclo de
  realimentación más lento del proyecto. Consecuencia práctica: preferir
  trabajo cuyo resultado se pueda verificar sin pantalla (una paleta es datos,
  la cantidad de instancias y las llamadas de dibujo son números) y juntar los
  pedidos de captura en tandas.
- **Dos cambios buenos por separado se cruzan y rompen algo que nadie miró.**
  Ya pasó: el día del valle se estiró a seis horas (bien) y la vida del jugador
  se volvió real y visible (bien), y de las dos juntas salió que ahora te
  muerden hasta 18 horas reales después de desconectarte. Ningún agente vio las
  dos mitades. Es exactamente el trabajo del `orquestador` y hay que hacerlo
  explícito: **cuando cambia una constante de ritmo, se relee todo lo que
  cuelga de ella**, no sólo el archivo que se tocó.

---

## El costo, medido (no estimado)

Se comparó sobre el mismo estado del mundo. **La densidad era un problema de
prompt, no de modelo:** con una instrucción de priorización, Haiku pasó de usar
6 hechos de 60 a usar 14; Opus usa 15. La diferencia que queda es de estilo.

| | Opus 5 | **Haiku 4.5 (default)** |
|---|---|---|
| Por mirada | $0,0574 | **$0,0093** |
| El test de 7 días | ~$9 | **~$1,30** |
| A 1000 jugadores/mes | $5.168 | **$664** |

`DIRECTOR_MODEL` es una variable de entorno: volver a Opus es una línea.
`pnpm compare <jugador>` corre los tres lado a lado.

**Lo que falta medir:** el eco es la próxima variable grande de costo, y su
duración todavía no está decidida. Y estos números son del director solo — el
diálogo con NPCs suma llamadas por jugador y todavía no se midió aparte.
