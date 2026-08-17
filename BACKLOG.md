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
| **P.2d** · la aldea no se separa del suelo: rango de valor y el kit fuera de la paleta | `arte` | `scripts/paleta.gd`, `scripts/ambiente.gd` |
| **02.6** · nacimientos: que el saber deje de ser una función decreciente | `simulacion` | `lib/world/tick.ts`, migración `20260817140000_` |
| **P.2d** · cablear la aduana en el kit + rehacer la medición contra la escena de ahora | `arte` | `scripts/kit.gd`, `scripts/paleta.gd` |

Todo lo demás está libre. Antes de despachar, actualizá esta tabla: si se
desactualiza, dos agentes se pisan y se pierde media hora.

> **Los agentes se caen, y hay que saber leer en qué estado dejaron el árbol.**
> Pasó dos veces el 17 de agosto y **los dos casos son distintos**:
> - Uno murió **antes de escribir una línea** (error de API en el primer turno).
>   El `git diff` mostraba 378 líneas y parecía trabajo a medias: eran las
>   iteraciones anteriores, sin commitear. **No revertir sin mirar qué es cada
>   cosa.**
> - Otro se colgó **en la fase de medición**, con el código y la migración ya
>   aplicados. Ése **se reanuda con un mensaje**, no se redespacha: tiene todo
>   el contexto y sólo le falta cerrar.
>
> **El chequeo mínimo antes de decidir:** `npx tsc --noEmit`, `file` sobre los
> archivos que tocó, si la migración quedó aplicada, y qué dice el `git diff`
> comparado con lo que ya estaba verificado.

> **La regla que más se rompió, y ya van cinco veces.** Empezó con el commit
> `36c2bf1`, que se llevó puesto `scripts/paleta.gd` —trabajo de otro agente, al
> que se le había dicho explícitamente que no commiteara—. Después `1e036bf` con
> un `web.ts` en curso, y `16cb5e1` y `f482426` con un `valle.gd` **a medio
> escribir**, mientras su agente todavía trabajaba.
>
> **Y ahí dejó de ser suerte.** Commitear el archivo de otro mientras lo está
> editando no es sólo desprolijo: congela un estado intermedio que nadie probó,
> y el historial deja de servir para volver atrás. **Quien commitee stagea rutas
> explícitas. Nunca `git add -A` ni `git add .` con ramas en vuelo.**

> **El cableado es donde se rompen los módulos nuevos.** Escribirlos en archivos
> nuevos evita que dos ramas se pisen, y el precio es que el enganche en
> `valle.gd` queda pendiente. Pasó dos veces el mismo día: **`Sonido` quedó
> instanciado dos veces** desde dos ramas que no se veían —dos lechos sonando
> juntos, y uno en una variable local— y **la vegetación quedó cableada mientras
> seguía llamándose `_armar_bosque()`**, con dos bosques encimados en el
> Sotobosque. Las dos reglas están en el `CLAUDE.md` del cliente: **`grep` del
> `class_name` antes de cablear**, y **la instancia va en un miembro, nunca en
> una local**.
>
> Ojo con lo que se concluyó de ahí: **el duplicado NO era la causa de la fuga
> de veinte objetos.** Eso se afirmó sin medir y era falso — la causa estaba en
> el módulo y es del motor. Ver "Lo que puede matar esto" en `ROADMAP.md`.

---

## Dos crónicas rotas siguen guardadas en producción — sin dueño
`chronicles`, región `valle-primero`, jugador `Prueba3D`

Son **itinerarios de conversaciones que no están en la ventana** —las
`conversacion` están excluidas por código—, sin un solo hecho detrás. El bug se
arregló y **se comprobó que no se reproduce**, pero **el texto malo sigue en la
base y ya se le mostró a alguien.**

Hay que decidir qué se hace: borrarlas, marcarlas, o dejarlas como registro de
lo que se llegó a mostrar. **No es obvio y por eso está acá y no hecho** —
`chronicles` es historia del jugador, y este proyecto tiene por regla no
reescribir lo que pasó. Pero lo que pasó es que se mostró una crónica falsa, y
eso también es un dato.

Y de paso: **su `unbacked_names` quedó en `null`** porque el parche que lo
estampa no llegó a correr sobre ellas. La señal no existe justo para las dos
que la habrían disparado.

---

## El tercer hueco: la relación se lee al revés `simulacion`
`lib/world/tick.ts` — **bloqueado**, lo tiene 02.6.
**Es lo único que falta para poder correr el test de siete días.**

Con las redacciones que propuso el director, que son concretas:

- **`ensenanza`** — poner al que aprende de sujeto y al maestro en cláusula
  aparte: **«Bruno aprendió Temple de río. Se lo enseñó Ilde.»** Hoy sale al
  revés en la crónica *en una ventana que contiene el hecho correcto*.
- **`agenda_nueva`** — `«se propuso»` o `«empezó a buscar»` en vez de
  `«se puso a»`, que se lee como cumplida: *"Sarn durmió una noche entera"*
  cuando el hecho dice que se puso a dormir.
- **Y uno nuevo, barato, que encontró de paso:** `nacimiento.summary` termina
  con *«No sabe hacer nada de lo que se hace **acá**.»* **Es el único "acá" del
  flujo de hechos, y el director lo copia** — le metió voseo en 4 de 27 hasta
  que agregó una contra-instrucción. Cambiando ese "acá" por "aquí" en
  `tick.ts`, **la contra-instrucción del prompt se borra y se recuperan
  tokens.** Un carácter en el emisor contra un párrafo en el lector.

**Es uno de los tres que bloquean el test de siete días**, y es el único que no
es del director. Los `summary` de `ensenanza` y de `agenda_nueva` son **los dos
más ambiguos que emite este archivo**, y el modelo lee la relación invertida.
Casos medidos en la tercera auditoría:

- *"Bruno le enseñó el oficio"* — fue Odila la que le enseñó **a** Bruno.
- *"pasó por La Fragua y le enseñó a Ilde el Temple de río"* — fue Ilde la que
  le enseñó **a él**.
- *"Sarn al fin logró dormir una noche entera"* — es un `agenda_nueva`, o sea
  que **se puso a** dormir, no que lo consiguió.

Cinco crónicas, dos formas del mismo error. Es la misma familia que los sujetos
ambiguos que ya se barrieron una vez (*"y sigue en pie"*): **si un `summary` se
puede leer de dos maneras, el director elige la más dramática**, y un evento
ambiguo es un bug de la simulación, no del narrador.

---

## Los `agenda_*` son el 45 % de todos los eventos `simulacion`
`lib/world/tick.ts` — **bloqueado**, lo tiene 02.6.

Medido: **243 de 546 eventos en `valle-pruebas`**, y en una ventana de 60 hechos
eran **58**. El emisor escribe un `agenda_avanza` / `agenda_estancada` **por NPC
por día**, y *"Tobio sigue sin conseguir lo que necesita"* llegó a aparecer
**ocho veces idénticas** en la misma ventana.

El director ya deduplica al leer y priorizó los avances al final, **pero eso es
un parche del lector**: el arreglo es emitir sólo en la transición. Es la regla
que este archivo tiene escrita desde el principio — **un estado que no cambió no
es noticia** — aplicada al evento que más se emite.

Y tiene consecuencia directa sobre lo que el proyecto mide: con la ventana
llena de agenda pura, **no hay priorización posible porque no queda otra cosa
que contar.**

---

## `rendimiento.gd` pisa a `ambiente.gd` `escena` o `arte`
`scripts/rendimiento.gd`, `scripts/ambiente.gd`

Medido con sonda sobre el `Environment` vivo: **`_aplicar_entorno()` reescribe
seis propiedades de `ambiente.gd` en los tres niveles de calidad.** Lo peor:
**`adjustment_enabled` llega a la pantalla en `false`, o sea que todo el bloque
de corrección de color de `ambiente.gd` es código muerto** — se movió la
saturación entre 0,85 y 1,38 y las cuatro capturas salieron idénticas en trece
zonas. También llegan pisadas `tonemap_exposure` (0,95 y no 1,02), `ssao`, `ssr`
y `volumetric_fog_enabled`; y `ciclo.gd` pisa `ambient_light_energy` cada cuadro.

**Cualquiera que toque el look en `ambiente.gd` está escribiendo en un archivo
que otro sobreescribe.** O se saca esa línea, o `ambiente.gd` deja de pretender
que define el grade. Y ya costó un experimento: un test de niebla dio falso nulo
por esto y hubo que rehacerlo.

---

## El suelo del pueblo está en V5, no en V4 `arte`
`scripts/valle.gd`, `_color_terreno()` (~línea 346)

La interpolación **satura en pasto seco desde y = 2**, y el pueblo está arriba de
esa altura. O sea que el lienzo contra el que se mide la aldea no es el V4 que
supone la composición de la paleta: **es V5, y ahí un muro V6 empata.** No hay
color de la escalera que lo salve —V7 es la piel y V8 no lo pisa nada del
mundo—, así que **el peldaño que falta es del terreno, no del muro.**

---

## `actions` no tiene columna de orden `esquema`
`supabase/migrations/`, y después `lib/world/tick.ts`

Salió de separar resolver de avanzar. **El orden entre dos acciones pendientes
del mismo día queda indefinido**: un barrido del cron podría resolver `buscar`
antes que `ir`, o sea buscar en el lugar equivocado. Hoy casi no muerde porque
cada `/act` resuelve la suya al instante, y mientras tanto se ordena por
`submitted_tick`, que es lo único que hay. **Arreglarlo bien es un `created_at`
y una migración.**

---

## Una cláusula que quedó con el sentido invertido `simulacion`
`lib/world/tick.ts`

*"Tener una acción sin resolver"* contaba como estar adentro. Antes significaba
"mano en el teclado"; **ahora significa "nadie pudo resolverla"**, porque el
camino normal las resuelve al instante. Se dejó y está anotada en el código —
hoy un pendiente no puede ser más viejo que el último tick, que es el que barre.
**Pero el día que se espacie el barrido, esa cláusula se convierte en una forma
de que te muerdan estando desconectado**, que es justo la regla dura de §9.3.

---

## Mover el stamp de `sinRespaldo` a `director.ts` `director`

`lib/world/director.ts` — chico, y cierra bien algo que hoy está pegado con
cinta. La medición ya funciona: `chronicles.unbacked_names text[]` existe,
está backfilleada y hay línea de base (las 9 crónicas históricas promedian
**1,00 nombre sin respaldo**; las 4 generadas con el prompt arreglado, **0,00**).

Pero el stamp vive en `lib/web.ts` (`anotarSinRespaldo`), porque cuando se hizo
`director.ts` estaba tomado. **Se apoya en que la única fila con
`unbacked_names` null sea la que `narrate()` acaba de insertar** — es cierto
hoy y es frágil. Lo correcto es una línea en el insert de `director.ts`
(`unbacked_names: sinRespaldo`), que además cubre `pnpm look`. Cuando entre,
borrar `anotarSinRespaldo` de `web.ts`.

---

## La meta de la vieja Ren, en `seed.ts` `npc-voz` o `simulacion`
`lib/world/seed.ts` — **bloqueado**, lo tiene otro agente.

*"Morirse sin haberle enseñado la runa de quietud a nadie"* **no es una meta: es
una postura.** La simulación no la puede cumplir y ningún template la puede
afirmar sin matar a una NPC que está viva — que es exactamente lo que pasó, y
dos jugadores lo leyeron. Ahora la lista blanca de `tick.ts` la silencia, así
que cerrarla ya no miente, pero tampoco dice nada.

Propuesta que la deja igual de trágica y encima jugable: **«que alguien aprenda
la runa de quietud antes de que sea tarde»**. La regla para escribir metas
nuevas quedó anotada arriba de `METAS` en `tick.ts`.

---

## `tick.ts` tiene una copia entera de `combate.ts` `simulacion`
`lib/world/tick.ts`, `lib/world/combate.ts`

**Verificado:** el único importador de `combate.ts` es `lib/web.ts`. El
`case 'pelear'` de `tick.ts` (~línea 1190) es una **reimplementación
duplicada** — mismo daño, mismas armas, mismos `summary`, copiados.

No es deuda estética: **es la razón de que el bug de los sujetos ambiguos haya
que arreglarlo dos veces.** Hoy las dos copias están sincronizadas carácter por
carácter, y el día que alguien toque una sola, el mismo golpe produce eventos
distintos según venga por el tick o por la web. Eso es el invariante 3
erosionándose por duplicación.

El arreglo es que `tick.ts` importe `pelear()` pasándole su `ev`, que para eso
existe el sumidero de eventos.

**Ese momento llegó.** V.1 se paró justo en el borde —los NPCs se vuelven cuando
hay un bicho rondando, que es la mitad no violenta— y dejó dicho lo correcto:
hacerlos pelear obliga a extraer `combate.ts` de verdad en vez de hacer crecer
la copia. **Va antes de V.2**, que es exactamente la tarea que necesita que un
NPC salga y no vuelva.

---

## El «acá» de las memorias viaja mal `npc-voz` + `simulacion`
`lib/world/tick.ts`, `lib/world/combate.ts`, `lib/world/dialogo.ts`

Mismo mecanismo que la primera persona, que ya se arregló: una memoria se
**copia a la cabeza de otro** cuando corre el chusmerío, y el deíctico se rompe.
`"Los del Sotobosque tumbó a X acá"` en boca de alguien que lo escuchó en otro
pueblo apunta al lugar donde se cuenta, no donde pasó.

El arreglo es poner el nombre del lugar en vez de «acá» — `nombreDeLugar()` ya
está a mano en los dos archivos. **Hay que hacerlo en los tres a la vez y con
el dueño de `dialogo.ts`**, que es quien las convierte en frases.

---

## La reposición de amenazas mira el contador, no el reloj `simulacion`
`lib/world/tick.ts` — **bloqueado**, lo tiene V.1.

Quedó abierto del arreglo del latido: **el valle sigue tardando hasta seis horas
reales en reponer una amenaza**, porque la tirada es por tick y ahora hay cuatro
ticks por día real. Subir la probabilidad no lo arregla —ya se subió de 35 % a
60 % por vacante— y latir más seguido tampoco, porque eso desharía el arreglo
del ritmo. **Lo arregla que la reposición mire el reloj de pared**, igual que
hicieron la presencia y la mordida.

Es la misma lección tres veces seguidas: **lo que tiene que pasar en tiempo real
no se puede medir en ticks**, porque el tick ya cambió de duración una vez y va
a volver a cambiar.

---

## El cron pega a una sola región
`vercel.json` / `api/tick.ts`. El cron usa el `REGION_SLUG` del deploy, que es
`valle-primero`. **Cualquier otra región depende del tráfico de jugadores como
único reloj.** Hoy no molesta porque sólo hay dos y una es de pruebas, pero el
tramo 04 es el generador de regiones: cuando existan cinco, cuatro no tienen
reloj. Anotarlo antes de que sea una sorpresa.

---

## Duplicados de agenda — el valle narra dos veces lo mismo

Hay agendas activas duplicadas para la misma persona con la misma meta (Tobio
×2 *"ver de cerca a alguien que sepa magia"*, Ilde ×2 *"rehacer las bisagras"*).
Es ruido que llega al director, y sale de los datos, no del código. Chico, y sin
dueño claro todavía.

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

### 01.4 · Ver a los otros jugadores — **mitad servidor hecha**
La mitad de `lib/web.ts` está **en producción y verificada**: `/mundo` devuelve
`jugadores: [{ name, place_slug, health, caido }]`, sin incluirte, filtrado por
presencia de 90 segundos de reloj de pared contra `players.last_seen_at` — que
el propio `/mundo` sella en cada pedido, así que la presencia se sostiene sola.
La mitad de cliente está despachada (ver arriba).

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

### P.1 · El valle suena — **entregado, falta cablear**
`scripts/sonido.gd` y `escenas/prueba_sonido.tscn` existen y están verificados
en headless. Todo sintetizado al arrancar: **cero bytes en disco y cero en la
descarga**, 101 ms de CPU una vez, once buses creados en tiempo de ejecución
(no hizo falta tocar `project.godot`). Nueve voces, cada una con un para qué:
el río como ancla fija, el yunque diciendo dónde queda la fragua, el fuego que
nunca baja de 0.43 porque es *"el único techo que no se apaga"*.

**Falta el cableado**, que es del orquestador: seis líneas al final de
`_ready()` en `valle.gd` —al final a propósito, para que un error ahí no deje
al juego sin HUD— y un getter `fraccion()` de una línea en `ciclo.gd`. Hoy
`sonido.gd` lee `_fraccion` por nombre con `has_method()` de por medio:
funciona y está verificado contra el `Ciclo` real, pero es frágil si alguien
renombra la variable.

**Lo que hay que escuchar** (nadie del equipo pudo, el driver bajo WSL es
Dummy). Correr `godot escenas/prueba_sonido.tscn` con parlantes y juzgar tres
cosas: si el viento se nota como bucle, si el yunque pasa por golpe metálico o
suena a campana, y si el Sotobosque incomoda. **La tercera es la única que no
se puede aproximar con números.**

### P.1b · Comprar o grabar el golpe del yunque `sonido`
El único sonido que la síntesis no alcanza, y viene con presupuesto: **un solo
sample**, unos cinco dólares en cualquier librería o veinte minutos con un
teléfono y un martillo. El tono y el volumen ya se aleatorizan por golpe, así
que con uno alcanza. Los pasos son el otro caso donde el oído detecta la
falsedad al instante —los escuchás veinte veces por segundo— y necesitan
grabación por superficie: pasto, tierra y piedra.

### P.2b · Migrar los scripts a la paleta `arte` — uno por vez

> **Error mío, anotado para no repetirlo.** Cuando volvió la paleta entregó una
> tabla mapeando los 95 literales a su constante, y **acá guardé sólo los dos
> bugs**. La tabla se perdió con el informe, y la migración de `valle.gd` tuvo
> que reconstruirla desde cero. Es exactamente la regla que este proyecto
> repite —*lo que no queda en un archivo, se perdió*— rota por el que la escribe.
> **Lo que un agente entrega y el siguiente necesita, se copia acá, no se
> resume.**

**`valle.gd` y `detalles.gd` están migrados.** **Quedan siete**, de a uno por
tarea: `interfaz.gd` (16 literales) · `figura.gd` (13) · `mapa.gd` (13) ·
`ciclo.gd` (6) · `monstruo.gd` (4) · `ambiente.gd` (3) · `rendimiento.gd` (2).

Dos cosas que dejó `detalles.gd` y son de otro dueño o de otro momento:
- **`ventanas_y_puerta()` es código muerto** desde que las casas son del kit de
  Kenney. Quedó migrada y compartiendo `_luz_de_ventana()` para que no haya dos
  recetas de ventana esperando a que alguien copie la equivocada. **Borrarla es
  un cambio aparte.**
- **La rampa de las luciérnagas estaba mal armada** y se arregló de paso:
  `set_color(1, ...)` corría después de dos `add_point()`, así que el índice 1
  ya no era el final. Cada luciérnaga era invisible su primer tercio de vida y
  después terminaba en **blanco puro opaco** —un color que no existe en la
  paleta— y desaparecía de golpe. Es el tipo de bug que sólo aparece midiendo:
  el código se leía bien.

**Lo que dejó pedido la vegetación y hay que hacer en un solo cambio** — mover
estas tres a `paleta.gd` **y borrar los deltas de `vegetacion.gd` a la vez**, o
quedan tres constantes que no usa nadie, que es el problema que esto viene a
arreglar. Los valores ya están calculados y son idénticos a lo que hoy produce
derivando de `Paleta.COPA`, así que la migración no cambia un píxel:

```gdscript
const COPA_HUMEDA := Color(0.134, 0.175, 0.119)   ## h104 s0.32 v0.175
const COPA_SECA   := Color(0.229, 0.262, 0.183)   ## h 85 s0.30 v0.262
const ARBUSTO     := Color(0.124, 0.155, 0.108)   ## h100 s0.30 v0.155
```

Y una discrepancia de comentario en `paleta.gd`: el docstring de `madera()`
lista "losas" en su familia, pero `LOSA_CAMINO` es piedra y va por
`Paleta.piedra()`.

### Los dos bugs que arrastraba la migración — **arreglados en `valle.gd`**
`scripts/valle.gd`, `detalles.gd`, `interfaz.gd`, `figura.gd`, `mapa.gd`,
`ciclo.gd`, `monstruo.gd`, `ambiente.gd`, `rendimiento.gd`. **De a un archivo
por tarea**, o nadie puede revisar el cambio.

`scripts/paleta.gd` ya existe con los 95 literales mapeados uno a uno. Y la
migración arrastra **dos bugs encontrados y verificados** que no son de color:

- **`valle.gd:202` está anulando la escalera de valor del terreno.**
  `mat.albedo_color = Color(0.42, 0.46, 0.30)` con
  `vertex_color_use_as_albedo = true` **multiplica** los colores de vértice que
  calcula `_color_terreno()`. El pasto efectivo termina en v0.33 y saturación
  0.60 — oscuro y verde, no lo que dice el código. El tinte tiene que ir casi
  blanco.
- **`detalles.gd` calcula un color por mata de pasto y lo tira.** El
  `MultiMesh` pone `use_colors = true` y computa el tinte por instancia, pero
  el material de `pasto()` **no** tiene `vertex_color_use_as_albedo`, así que
  el shader lo ignora y las 26.000 matas salen del mismo color. Es exactamente
  el estampado que ese código existe para evitar. Los materiales de ventana y
  luciérnaga sí tienen el flag; el del pasto se olvidó.

### P.2 · La paleta del valle `arte` — **hecha**, ver P.2b
`scripts/paleta.gd` (nuevo). **No** tocar los otros scripts en la misma tarea.
93 literales `Color(...)` repartidos en ocho scripts, cada uno con su marrón.
Ése es el diagnóstico exacto de *"parece Playmobil"*: no hay colores malos, hay
colores de ocho tachos distintos. Primero el archivo con la paleta y los
materiales base; la migración de cada script viene después y de a uno.
**No está bloqueado por el piso de zoom**: una paleta se decide por valor y
saturación a la distancia de la cámara, que es justamente lo que ya está
resuelto.

### P.3 · Vegetación — **entregada, falta cablear** (lo hace el orquestador)

`scripts/vegetacion.gd` y `escenas/prueba_vegetacion.tscn` existen y están
verificados: headless limpio, cero `randf()` y cero `String.hash()` (todo sale
de un hash entero propio con semilla fija, porque el bosque tiene que ser el
mismo en la pantalla de todos). 4.945 plantas, 7.900 instancias, 274 MultiMesh
en 104 baldosas de 34 m, 40–64 llamadas de dibujo en cámara, sin colisión.

**El cableado, en `valle.gd`** — dos cosas, y la segunda es fácil de olvidar:

```gdscript
	# en _ready(), después del bucle de _armar_lugar y antes de Detalles.pasto
	var vegetacion := Vegetacion.new()
	add_child(vegetacion)
	vegetacion.poblar(altura_en, LUGARES)
```

Y **borrar `_armar_bosque()` y su llamada** dentro de `_armar_lugar`, dejando
el `return`. Si no, el Sotobosque queda con dos bosques encima.

**Lo que hay que juzgar en una captura** (la escena de prueba ya viene
encuadrada desde la aldea hacia el Sotobosque a contraluz): si el Sotobosque es
**una** masa oscura con contorno neto o un montón de conos separados; si la tala
se lee como mordisco y no como bache; y si el faldeo cierra el horizonte sin
tapar la abertura norte.

**Pedido a la paleta** (entra en P.2b): que `COPA_HUMEDA`, `COPA_SECA` y el
verde de arbusto vivan en `paleta.gd`. Hoy se derivan de `Paleta.COPA` con
deltas fijos para no inventar, pero el lugar donde eso se decide es la paleta.

> **La palanca de rendimiento, anotada por si el contador duele:** las copas
> proyectan sombra en alto y medio, y ésa es la primera que hay que bajar. Y
> una decisión suya que conviene respetar: **el bosque no se ralea en los
> niveles bajos, se acorta** (190/155/120 m de alcance). El pasto es adorno; el
> bosque es estructura, y diezmarlo cambiaría la composición del mundo según la
> máquina de cada uno.

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

### P.6 · Que los NPCs se muevan en su lugar `jugabilidad`
`scripts/valle.gd` — **en cuanto lo suelte R2, ésta va primero.**

**Es el pedido más repetido después de "le falta la vida", y no depende de
nada.** Hoy los NPCs están clavados en un punto. Que caminen dentro de su lugar
—que Ilde se mueva por la fragua, que Tobio dé vueltas por el camino— es barato,
es visible al instante, y **no espera al servidor**.

Es la mitad de cliente de V.1. La otra mitad —que el servidor los mueva de
lugar de verdad, ejecutando verbos— es más grande y va aparte. Las dos son
independientes: ésta se puede hacer hoy y sigue sirviendo cuando la otra llegue.

**El límite que la mantiene honesta:** esto es animación de presencia, no
estado. El NPC sigue estando *en la fragua* para el mundo; lo único que cambia
es que no está congelado. **No inventes desplazamientos entre lugares en el
cliente** — eso es estado, y el estado lo manda el servidor (invariante 4).

---

## El criterio de arte, y va en todo prompt de las cuatro ramas

**Decidido el 17 de agosto, en `DISENO.md` §6.** El juego es **estilizado, y
comprometido con serlo**. La frase que hace que la decisión se entienda y no se
erosione:

> Hoy el juego no es realista ni estilizado: **es indeciso, y eso es lo que se
> lee como Playmobil.** Playmobil no se ve mal por ser estilizado: se ve mal por
> ser plástico de color plano bajo una luz que pretende ser real. Minecraft y
> Stardew son mucho más simples que esto y no se ven baratos, porque están
> comprometidos con una decisión.

Lo que usa quien trabaja:
1. **El color decide separación, no imita materiales.** Un techo no es marrón
   porque la teja sea marrona: es el valor que necesita para separarse del pasto
   a veinte metros. Si el color "correcto" no separa, el correcto está mal.
2. **La silueta hace el trabajo pesado.** Es lo único que se lee a la distancia
   a la que se juega, y es la misma decisión que el piso de zoom.
3. **Menos geometría, no más.** Subir detalle para que se vea menos rústico es
   el camino equivocado: la respuesta es comprometerse más con lo simple.

**Las cuatro ramas —`arte`, `naturaleza`, `arquitectura`, `personajes`— usan el
mismo criterio o se rompe.** Una que apunta a lo real mientras las otras tres
estilizan reproduce la indecisión que esto existe para terminar.

---

## Los bloqueos que se sacaron

Los dos el 17 de agosto, los dos en `DISENO.md` §6.

- **El piso de zoom.** La cámara se acerca hasta leer **silueta, postura y
  ropa**, nunca una expresión. **No hacen falta caras modeladas ni animación
  facial.** Los primeros planos son un modo aparte, no una posición de cámara.
- **La dirección de arte.** Estilizado y comprometido (arriba). Salió también de
  "lo que falta decidir" de `DISENO.md`: el renglón decía que *ningún agente
  sostiene una dirección de arte porque es un criterio y no una tarea*, y ese
  problema ya no existe — el criterio está escrito y tiene instrumento
  (`paleta.gd`) y dueño (`arte`, el único que decide un color).

**La rama de arte está desbloqueada, y las dos decisiones viajan juntas en todo
prompt de las cuatro ramas.**

---

## La gente vive su propia vida — `DISENO.md` §9

Dirección nueva del 17 de agosto, y es grande. **Son tres tareas de tamaños muy
distintos y el orden importa más que de costumbre**, porque las dos últimas
hechas antes de la primera no se notan.

> **El límite, y va en el prompt de quien toque cualquiera de las tres:** la
> simulación no usa IA (invariante 1). El autor **puede sembrar** metas,
> pueblos y tensiones; **no puede decidir que algo ya pasó** — eso lo decide el
> tick, determinista. Si alguien propone que el modelo resuelva un turno, es
> que no.

### V.2b · Que se vea que salieron `jugabilidad` o `esquema`
`scripts/valle.gd` y/o `lib/web.ts`
Hoy **el jugador no se entera de que alguien salió hasta que no vuelve.** Un
evento de partida rompería el presupuesto de ruido —salir no es noticia, igual
que `ir`— pero **el cliente lo puede mostrar como estado**: dos NPCs caminando
juntos hacia el bosque. Es la diferencia entre enterarte de una pérdida y
haberla visto venir.

### V.1d · `dar` con iniciativa del que tiene `esquema` + `simulacion`
`supabase/migrations/`, después `lib/world/tick.ts`
La segunda mitad limpia de V.1b, y **paró ahí porque necesita una migración**.
Hoy el que necesita va y pide; falta que el que tiene **ofrezca**. Es donde vive
*"Bruno le debe un frasco a Odila y se lo paga"*, y para eso **la meta tiene que
saber a quién se le paga** — `agendas` no tiene esa columna.

### V.1e · Un rumor no se le cuenta al protagonista `simulacion`
`lib/world/tick.ts` — una línea, en la pasada del chusmerío.
Salió *"Sarn le contó a Bruno: Bruno no le dio hoja templada a Sarn"*. El
agujero es viejo y también vale para jugadores: *"Ilde le contó a Pedro: Pedro
mató a la jauría"*.

### V.1f · `cuantosLoSaben()` no filtra por región `simulacion`
`lib/world/tick.ts` — cuenta `holder_kind === 'player'` sin filtrar, así que un
jugador de otro valle infla el *"Ahora lo saben N"*. Se ve en cualquier base con
más de una región, o sea en ésta.

### V.1b · Los verbos sociales entre NPCs — **hecha la primera mitad** `simulacion`
`lib/world/tick.ts`
**Es la segunda mitad limpia de V.1 y es coherente sola.** Hoy un NPC que
necesita algo fabricado y no puede aprender a hacerlo **se traba**, cuando lo
natural sería pedírselo al que sabe y que se lo dé. Falta `dar`, `hablar` y
`ensenar` de NPC a NPC.

Es lo que convierte el valle de siete personas trabajando en paralelo en siete
personas que se necesitan — que es el título del juego.

### V.1c · `people.home_place_id` `esquema`
`supabase/migrations/`, y después `lib/world/tick.ts`
Hace falta y quedó sin hacer. "Volver a casa" se deriva hoy de
`knowledge.makes_at` porque no hay dónde más. Consecuencia visible y medida:
**quien no sabe hacer nada no vuelve a ningún lado, y Sarn terminó viviendo en
la fragua** después de aprender a forjar. Es coherente, pero no es lo que uno
pondría a mano.

### V.1 · Las agendas avanzan ejecutando verbos — **hecha.** `simulacion`
`lib/world/tick.ts`
**Ésta primero, y paga casi todo.** Hoy Ilde "avanza un 12 % en juntar carbón":
un número que sube. Tiene que **ir** a la Casa Quemada, **buscar**, y volver con
carbón, con las manos vacías, o no volver.

Los nueve verbos ya existen y los NPCs ya tienen lugar, saberes, vínculos y
metas. **Es sobre todo reescribir el avance de agendas para que pase por los
verbos que ya están**, no construir un sistema nuevo. Y cuando el NPC y el
jugador juegan con las mismas reglas, todo lo que pasa se vuelve legible: te
cruzás a Ilde en el camino y sabés a qué fue.

Por qué va primera, y es el argumento que ordena las tres: **hace visible lo
que el mundo ya sabe.** Las metas, los oficios y los vínculos existen hace
semanas y el jugador nunca los vio porque se resolvían como aritmética. Ejecutar
verbos los convierte en cosas que pasan en un lugar, a una hora, delante tuyo —
y de paso en `events`, que es lo único que el director puede contar.

**Cuidado con el ruido:** un NPC que ejecuta verbos puede emitir muchos más
eventos que uno que suma un porcentaje. Un valle de siete personas caminando
puede convertir la crónica en un registro de tránsito. La regla de siempre: un
estado que no cambió no es noticia.

### V.2 · Salen de aventura y no vuelven `simulacion`
`lib/world/tick.ts` — **después de V.1**, porque necesita que ya sepan `ir` y
`pelear` por su cuenta.
Un NPC arma una expedición, se lleva a alguien, y puede no volver. **Cuando eso
pasa se lleva lo que sabía**, y ahí el tema del juego deja de ser una frase y es
algo que te pasó sin que estuvieras. Es la misma pérdida que hoy sólo produce la
muerte por azar, pero **con una causa que se puede contar**: fue al Sotobosque a
buscar algo y no volvió.

Se apoya en 03.2 (una mazmorra) y la mejora: una mazmorra deja de ser contenido
esperando al jugador y pasa a ser un lugar peligroso donde cualquiera puede ir.
Se puede hacer una versión flaca antes, con los lugares salvajes que ya existen.

### V.3 · El autor del mundo `historia`
`lib/world/autor.ts` (nuevo), `api/autor.ts` (nuevo), `vercel.json`
**Lo caro, y va último.** Hoy las metas salen de una lista fija de dos por
oficio y ése es el techo del sistema: se repiten. El autor corre **cada varios
días del valle, no cada tick**, lee lo que pasó, y **escribe hechos nuevos en la
base**: una meta que sale de lo que ese valle perdió, un pueblo que se enoja
porque le talaron el claro, una figura que aparece porque murieron tres maestros
seguidos. **No narra: siembra.** Después la simulación los ejecuta sola.

Que corra cada tanto no es un ahorro, **es lo que lo hace bueno**: un mundo donde
algo grande pasa todos los días no tiene nada grande.

**Va último por una razón concreta, no por ser el más difícil:** el autor
sembrando metas sobre un sistema que todavía avanza con `progress += 12` produce
metas mejor escritas que siguen siendo invisibles. **V.1 es lo que hace que
valga la pena escribirlas.**

Técnicamente **no toca `tick.ts`** —archivo nuevo más una entrada de cron— así
que se puede paralelizar con V.2 cuando llegue el momento.

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
- **La auditoría automática no sirve para detectar lo que falla.** Ya no es una
  sospecha: las tres crónicas mentirosas que se auditaron a mano el 17 de
  agosto pasaron con `inventados: []`. El chequeo compara ids, y las mentiras
  no usan ids — o citan uno válido y lo sobre-leen, o no citan ninguno y sacan
  la afirmación del bloque MUNDO. **Mientras el chequeo dé limpio sobre
  crónicas falsas, es peor que no tenerlo**, porque da confianza. Hace falta
  auditar afirmaciones, no ids.
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
