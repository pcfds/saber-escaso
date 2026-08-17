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
| Dibujar a los otros jugadores | `scripts/valle.gd` |
| Vegetación a la escala del valle | `scripts/vegetacion.gd`, `escenas/prueba_vegetacion.tscn` *(nuevos)* |
| Que el director no invente (auditoría ya entregada) | `lib/world/director.ts` |

**Entregado y esperando cableado del orquestador:** `scripts/paleta.gd` y
`scripts/sonido.gd`. Los dos existen, los dos están verificados, y **ninguno de
los dos hace nada todavía** porque no los usa nadie. Es el modo de falla propio
de trabajar con archivos nuevos para evitar conflictos: hay que cerrar el
círculo o el trabajo no existe.

> **Cuidado al commitear con ocho ramas abiertas.** El commit `36c2bf1` usó
> `git add -A` y se llevó puesto trabajo de otras dos ramas, incluida una a la
> que se le había dicho que no commiteara. No se perdió nada por suerte, no por
> diseño. **Se stagean rutas explícitas.**

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
- **Lo que el jugador hace se resuelve ya; el día del valle lo mueve el sol.**
  Son los dos relojes de §7.3, que hasta hoy estaban conflatados en una sola
  función: `step()` resolvía las acciones **y** corría un día. Ahora
  `resolverAcciones()` es una función aparte con dos llamadores —`/act` en el
  acto, y el tick como barrido de lo que quedó colgado—. Medido: **diez `/act`
  seguidos = diez resoluciones y cero días de valle**; antes del throttle eran
  diez días. Y no se resuelve dos veces: el reclamo es un
  `UPDATE ... WHERE resolved_tick IS NULL` atómico, probado con ocho
  resoluciones en paralelo sobre la misma acción — **una sola se la llevó.**
- **Salen de aventura, y algunos no vuelven.** Una salida es el día en que
  alguien se pone en camino a un lugar salvaje que su meta le exige y donde hay
  algo parado. Le pide a alguien que lo acompañe —la mitad de las veces dice que
  sí— y ir de a dos divide el riesgo por tres.

  > **La cadena que salió sola, y es la mejor del proyecto:**
  > *Ilde iba a La Casa Quemada y le pidió a Bruno que fuera también. Bruno dijo
  > que no. · Ilde le entró a un merodeador a mano limpia, pero no cayó. · Ilde
  > fue a buscar carbón y no volvió. · Con Ilde se fue Temple de río; no queda
  > nadie en el valle que lo sepa. · Bruno dejó de intentar que Ilde le muestre
  > el temple de río.*
  >
  > **Bruno dijo que no, y Bruno perdió lo único que estaba esperando.** Nadie
  > escribió eso.

  Y el detalle de diseño que cierra la tesis sobre sí misma: **el riesgo de no
  volver escala con la vida que le quedó al bicho después del golpe.** Matarlo
  cuesta cero. Así que **el que baja con una hoja templada saca más vida y saca
  riesgo en el mismo acto** — sobrevivir termina colgando de que alguien vivo
  sepa forjar.

  **El 35 % de las muertes del valle ahora tiene causa contable**, contra el
  sorteo puro de antes, que es una moneda y no una historia. Y de yapa los NPCs
  empezaron a limpiar: nueve amenazas muertas por gente del valle, donde antes
  vivían para siempre al tope de tres.

- **Los NPCs se piden cosas entre ellos, y eso preserva la escasez.** Entró
  `pedir` (= `hablar` + `dar` entre NPCs). Elige a quién pedirle por `bonds`, y
  que se lo den depende del vínculo: nunca garantizado, nunca imposible. **El
  "no" es contenido** — deja recuerdo, baja el vínculo y se cuenta una sola vez.

  > **Lo que esto cambia de verdad, y el informe lo subestimó.** En la corrida
  > de referencia, Sarn necesitaba una hoja templada y **aprendía Forja simple
  > para hacérsela él**. Ahora se la pide a Bruno: le dicen que no, lo comenta
  > por ahí, y treinta y cuatro ticks después Bruno se la hace. **Sarn sigue sin
  > saber forjar, y el objeto dice "que había hecho Bruno".** `pedir` es la
  > alternativa a `aprender` que **no** reparte el oficio: saca del sistema la
  > vía absurda de aprender una profesión entera para conseguir una cosa.

  Y el `made_by` no se toca nunca: lo que cambia de mano se transfiere con un
  `update` de `holder_*`, y lo único en todo el código que puede escribir
  `made_by: null` sigue siendo `buscar`.

- **Las agendas avanzan ejecutando verbos, no sumando un número.** Ilde ya no
  "avanza un 12 %": va a la Casa Quemada, busca, y vuelve con hierro — o vuelve
  vacía. Un verbo por persona por día, los mismos nueve del jugador y con las
  mismas funciones, extraídas para que no puedan divergir.

  > **La prueba, y es la mejor que dio este proyecto.** La meta de Sarn era
  > *"conseguir un filo que no se le melle"*. **Antes**, el contador llegó a 100
  > y el valle afirmó `Sarn consiguió un filo que no se le mella` — cuando no
  > existía una sola hoja templada en el mundo y nadie vivo sabía forjar.
  > **Ahora**: Ilde le enseña Forja simple (t9) → Sarn cruza a la fragua y hace
  > una hoja (t20) → la usa y cierra la meta (t22). Tres eventos en trece ticks,
  > cada uno respaldado por una fila real en `knows`, `objects` y `agendas`. Es
  > el bucle chico del juego corriendo solo entre NPCs.

- **El riesgo del ruido no se materializó: bajó.** Era lo que más miedo daba de
  ese cambio —siete personas caminando convirtiendo la crónica en un registro de
  tránsito— y se midió: **1,32 → 1,09 eventos por tick**, con las agendas
  cerrándose a la misma velocidad. **Eventos por agenda cerrada: 4,08 → 3,32.**
  El mundo se mueve igual y cuesta 19 % menos de crónica, y lo que queda dice
  qué pasó en vez de decir que un contador se movió. La decisión que lo logra es
  una sola: **`ir` no emite evento nunca.** Un desplazamiento no es noticia, es
  estado — y ya se ve, porque el cliente dibuja a la persona donde está.
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
- **Te saludan al pasar, con una línea escrita por el modelo y guardada**
  (`lib/world/saludos.ts`, `people.saludos`, cron cada 2 h). No es una llamada
  por NPC que pasás: se escriben una vez y se releen. Siete personas costaron un
  centavo.
- **Cara**: ojos, parpadeo desincronizado y ropa por oficio, todo derivado de
  hashear el nombre.

**Alrededor**
- Cliente 3D con cuerpos animados, cielo propio con estrellas y dos lunas,
  ciclo de día y noche atado al reloj del servidor, y un `.exe` que se baja.
- **El valle mide 360 m** (era 132), con correr en shift y mapa en M.
- **La gente se mueve.** Rondas de 3 a 5 paradas derivadas del nombre con el
  mismo hash del que salen su altura y su ropa, **~3/4 del tiempo quietas** —
  mirando hacia el centro de su lugar, que es lo que hace que un corro se lea
  como gente ocupada y no como siete figuras mirando cada una para su lado. El
  reloj es el del valle y los períodos dividen al día, así que no hay salto al
  cambiar de día ni importa que el tick llegue tarde. **Y costó menos que
  antes**: los siete cuerpos se dejaron de borrar y rehacer en cada `/mundo`.
- **El valle suena y tiene árboles en serio**, los dos cableados en la escena
  real y corriendo sin fugas.
- **Hay mallas hechas por una persona**: 80 piezas CC0 de Kenney, un solo autor
  a propósito. Las casas se **arman** con módulos —las siete de la aldea son
  combinaciones distintas, sorteadas con semilla por lugar— y la fragua tiene
  yunque, banco y pozo de fuego, donde antes había una luz naranja flotando.
  Costo medido: **+19,8 % de triángulos, +0,46 MB en el `.exe`, y menos
  instancias y menos nodos que antes** — el árbol de Kenney trae su tronco, así
  que se fueron 3.039 instancias, y la roca son 16 triángulos contra los 48 de
  la esfera que había. **Lo que subió es llamadas de dibujo, +25 %: ése es el
  número a vigilar.**
- **El suelo dejó de ser una papilla gris.** Es el arreglo concreto de *"parece
  Playmobil"* y tiene un número: los cuatro colores del terreno estaban en el
  mismo peldaño de valor, con **0,059 de amplitud** entre el más claro y el más
  oscuro. Ahora hay **0,365**. El 40 % de la pantalla pasó de 6 puntos de
  separación en gris a 36.
  > **Con una salvedad que apareció después y está sin arreglar** (ver "A
  > medias"): esa amplitud *interna* del suelo es real, porque los cuatro
  > colores viajan por el mismo camino. Lo que **no** vale todavía es la
  > relación entre el suelo y lo construido.
  > Y el verde de plástico no era el matiz, era la saturación: el tinte del
  > terreno **multiplicaba** los colores de vértice, así que el pasto salía a
  > s0,60 sin que lo dijera ninguna línea del código. Ahora sale a s0,36. De
  > paso el río bajó de s0,58 a s0,34 — ese azul competía con el jade del
  > jugador, que por decisión de paleta es el único frío saturado del juego.
- **Rendimiento medido, no estimado.** `scripts/rendimiento.gd` con tres
  niveles y F1 en vivo, el terreno de 180 a 120 pasos, el pasto en baldosas de
  34 m con distancia de dibujado, y un `--censo` que cuenta la escena. La vara
  la puso quien juega: *"no puede matarte la PC más que el Dota 2."*
- **La presencia pasa por reloj de pared** (`players.last_seen_at`, sellado en
  cada `/mundo`, ventana de 90 s). Con un tick de seis horas, `last_seen_tick`
  no puede medir presencia: era el hallazgo y está cerrado.
- **El latido del mundo está instrumentado.** Tabla `ticks` con origen
  (`cron` / `jugador`) y backfill histórico, escrita por un trigger sobre
  `regions` y no por el llamador — `step()` se invoca desde cuatro lados y un
  registro que dependa de que cada uno se acuerde miente el día que aparece el
  quinto. Se consulta con `ticks_por_origen(horas)`.
- **Ves a los otros jugadores dentro del valle.** Probado de verdad con dos
  instancias headless y dos tokens: cada una hace aparecer a la otra, en su
  punto propio y estable poll a poll, y moviendo a uno con `POST /estoy` el otro
  lo ve cambiar de lugar. Se distingue de un NPC por color, altura, resplandor
  y cartel, y **no lleva ropa de oficio**: nadie de afuera usa el uniforme de un
  oficio del valle. Caído se dibuja tumbado y respirando, nunca invisible —
  que alguien esté en el suelo es información sobre ese lugar.
- **El director ya no inventa.** Ver la auditoría más abajo. Y ahora se mide
  sola: `chronicles.unbacked_names` con backfill histórico, así que hay línea de
  base — **las 9 crónicas viejas promedian 1,00 nombre sin respaldo; las 4
  hechas con el prompt arreglado, 0,00.**
- **Los eventos dejaron de poder leerse al revés.** Salió de la misma auditoría
  y es la mitad que no era del narrador: el template genérico
  `X consiguió <goal>` se reemplazó por una **lista blanca** —cada meta trae
  escrito a mano su logro en pasado, y lo que no está en la lista no se afirma—,
  se auditaron las 21 metas vivas de las dos bases (20 afirmables, 1 silenciada
  a propósito), y se barrieron los sujetos ambiguos y las **memorias en primera
  persona**, que al copiarse por el chusmerío fabricaban testigos que no
  estuvieron. De paso apareció uno gordo: **`perdida_de_saber` no se emitía** si
  otro portador ya estaba muerto — y ése es el evento del que cuelga la tesis
  del juego. El barrido se hizo en **los dos caminos** que escriben eventos de
  pelea, el del tick y el de la web, y quedaron carácter por carácter iguales.
  Probado en vivo: un NPC que sólo lo escuchó ahora dice *"Los del Sotobosque
  tumbó a X"* y ya no *"vi caer a X"*.
- La landing está cableada: la home de `saber-escaso.vercel.app` es la página
  del juego.
- **El proveedor de IA salió del código.** `lib/modelo.ts` es la única puerta;
  `director.ts`, `dialogo.ts` y `check.ts` no importan ningún SDK. No estamos
  atados a nadie: se usa el más barato que dé la calidad necesaria.

### A medias — probado y falla

- **El valle se despuebla y no se recompone. Ahora está medido.** Baja de siete
  a cuatro en **2,5 meses reales** y se detiene en tres, que es el piso que
  tienen tanto el sorteo de muerte como las salidas. **Con V.2 y sin V.2 termina
  igual: lo único que cambia es cuánto tarda** (3,1 meses → 2,5).
  > No lo arregla ninguna de las tres tareas de §9: **lo arreglan los
  > nacimientos, que no existen.** §9.2 lo dice desde el primer día — *sin ellos
  > una región sin jugadores se despuebla monotónicamente y el saber sólo puede
  > bajar*. Era una frase de diseño y ahora es un número.
- **El invariante 3 está roto: el director afirma cosas que no están en
  `events`.** Es lo más grave de esta lista y recién se supo el 17 de agosto,
  con la primera auditoría sistemática. Sección propia abajo.
- **`actions` no tiene columna de orden.** El orden entre dos acciones
  pendientes del mismo día queda indefinido, así que un barrido del cron podría
  resolver `buscar` antes que `ir`. Hoy casi no muerde —cada `/act` resuelve la
  suya al instante y en orden— pero arreglarlo bien pide una migración.
- **Los pueblos existen en la base y no existen en el código.** `peoples`,
  `threats.people_id` y `threats.nombre` están creados y hay dos pueblos
  sembrados con nombre propio en producción ("Los del Sotobosque", "Los de la
  Ceniza"), pero `grep -rn "peoples" lib/` **no devuelve nada**: el tick sigue
  spawneando `una jauría de sombra` / `un merodeador` sin dueño y sin nombre.
  El próximo bicho vuelve a ser un mob anónimo, y un `seed` de una región nueva
  no crea ningún pueblo. Mientras tanto la landing ya se lo promete al público.
- **La escalera de valor no llega a la pantalla como dice la paleta, y la aldea
  paga el precio.** `vertex_color_is_srgb` viene en `false` en Godot 4.7, así
  que los colores que van por **color de vértice o de instancia** se consumen
  como lineales y rinden **~0,24 más claro** que el mismo color puesto en
  `albedo_color`. Medido con un control renderizado —tres quads, mismo
  `Color(0.5,0.5,0.5)`—: 0,498 por albedo contra 0,733 por vértice.

  El suelo va por vértice y los muros por albedo, así que el suelo está subido
  unos **2,5 peldaños** respecto de la escalera: `PASTO` sale 0,584 donde dice
  0,300, `ROCA` 0,832 donde dice 0,660. **Resultado: `MURO_ALDEA` (V6) queda al
  mismo valor que el suelo en vez de dos peldaños arriba — la aldea, que se
  supone que es la mancha clara del cuadro, hoy no lo es.**

  Afecta a las **cinco** fábricas con ese flag: `terreno()`, `monte()`,
  `pasto_hoja()`, `humo()` y `chispa()`. Es una línea, y cambia el terreno
  entero.

- **La paleta llegó a la pantalla, pero sólo en dos archivos de nueve.**
  `valle.gd` y `detalles.gd` están migrados; faltan `interfaz.gd`, `figura.gd`,
  `mapa.gd`, `ciclo.gd`, `monstruo.gd`, `ambiente.gd` y `rendimiento.gd`. Hasta
  que entren, media pantalla sigue sacando colores de su propio tacho.
- **La vegetación no escaló con el valle.** Hay árboles —46 conos con tronco—
  pero **sólo dentro del grupo `bosque`, en un radio de 13 m**. El valle mide
  360 m: el 99% del mapa no tiene un solo árbol. No es que falten árboles, es
  que el cambio de 132 a 360 m los dejó siendo una manchita.
- **La paleta existe y todavía no la usa nadie.** `scripts/paleta.gd` está
  escrito, con una escalera de nueve peldaños de valor, techos de saturación
  (0.35 en el mundo, 0.50 en la gente) y los 95 literales mapeados uno a uno.
  **Pero los nueve scripts siguen con sus colores a mano**: hasta que se migren,
  el valle se ve exactamente igual. La migración va de a un archivo por vez.
  > Lo que salió de escribirla, y es lo que de verdad explica *"parece
  > Playmobil"*: los cuatro colores del suelo estaban **todos en el mismo
  > peldaño de valor** —en blanco y negro el 40 % de la pantalla era una sola
  > papilla y toda la diferencia estaba en el matiz, que a 27 metros no
  > existe—, y ocho scripts ponían `roughness` a ojo, así que todo tenía el
  > mismo reflejo. El plástico no era el color: era la falta de separación de
  > valor y el brillo parejo.
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

## La auditoría del director (17 de agosto) — el invariante 3 no se sostiene

Primera auditoría sistemática de crónicas contra la base, en producción. **El
resultado invalida una línea que este archivo daba por buena hace semanas.**

**El hallazgo, en una frase: el bloque `MUNDO` del prompt funciona como una
segunda fuente de afirmaciones, y el modelo no lo distingue de `HECHOS`.**

- **Con la ventana vacía, el director vacía MUNDO en prosa.** La crónica más
  reciente de producción tiene `source_events = []` y **seis de siete
  afirmaciones sin ningún hecho detrás** — Ilde trabajando, Marta entrando al
  Sotobosque, Sarn de guardia. Es una planilla de NPCs presentada como noticias.
- **Con hechos, inventa actores alrededor de los hechos reales.** Sobre una
  caída real escribió *"alguien te trajo hasta acá"* y *"Odila estuvo por aquí
  mientras estabas tirado, probablemente haya algo que le debas"*: nadie lo
  cargó y la deuda no existe en ninguna tabla. Fusionó "Odila vive en Vado
  Bajo" (MUNDO) con "te levantaste en Vado Bajo" (HECHO).
- **Narra memorias de NPC como hechos, incluso fuera de la ventana.** Contó una
  defensa de Ilde cuyo evento no estaba en la ventana: salió del bloque de
  memorias.
- **Dos jugadores de producción recibieron la muerte de una NPC que está
  viva.** `people.alive = true` para los siete, y no hay un solo evento
  `muerte`. El origen es mitad del tick: un `goal` en infinitivo pasó por el
  template `X consiguió <goal>` y produjo un `summary` que se lee como un
  deceso. El director lo tomó al pie de la letra y le agregó "eso es un saber
  perdido", que no pasó.

**Y lo peor para poder confiar en el sistema: las tres pasaron la auditoría
automática con `inventados: []`.** El chequeo compara ids y las mentiras no
usan ids: o citan ids válidos y los sobre-leen, o no citan ninguno.

**Fugas medidas.** El vocabulario del sistema está limpio, esa parte del prompt
funciona. Pero la fuga de "qué tan cerca está alguien" se mudó de puerta: se
sacaron los porcentajes de agenda y se siguen pasando `valorado 44, temido 5`
en crudo, que el modelo convierte en *"te tiene en alta estima"*.

**Tres causas, tres dueños distintos:**

| Causa | Dónde | Estado |
|---|---|---|
| MUNDO se lee como fuente de hechos; números de vínculo en crudo; no sabe callarse con la ventana vacía | `lib/world/director.ts` | **arreglado** |
| El tick adelanta `last_seen_tick` a quien mandó una acción, así que **cuanto más jugás, menos hechos ve tu crónica** | `lib/world/tick.ts` | despachado |
| Un `goal` en infinitivo por el template `X consiguió <goal>` produce un `summary` ambiguo | `lib/world/tick.ts` | despachado |

**Lo que se arregló en el director, verificado con crónicas antes y después:**

- **Sin hechos no se llama al modelo.** La planilla dejó de ser posible por
  construcción, y una mirada con ventana vacía pasó de US$0,0032 a **cero**.
- **Salieron del prompt las dos fuentes de invención**: los números de
  `bonds` (`valorado 44` → *"te tiene en alta estima"*) y las memorias de NPC
  (de donde salía *"Ilde se metió a defenderte"*, con el evento fuera de la
  ventana). Lo que el jugador se ganó le llega por los hechos `confianza`, que
  es el canal correcto.
- **MUNDO pasó a llamarse `FICHERO (índice; nada de esto sucedió)`**, en formato
  de índice y no de prosa, con las agendas rotuladas *"anda queriendo (no es
  algo que hizo)"* y una línea `Ya no están:` para que no narre vivos a los
  muertos.
- **Los hechos entran como "hace veinticuatro días"**: la palabra *tick* ya no
  aparece en el prompt.
- **Auditoría nueva y gratis: `Cronica.sinRespaldo`.** Busca nombres de gente en
  el texto que no aparezcan en ningún `summary` de la ventana. No cuesta tokens
  y el modelo no la puede jugar. **Contra la crónica real de producción que hoy
  pasa limpia, la habría marcado con cinco nombres sin respaldo.**
- Se queda **haiku-4-5 con esfuerzo bajo**: el prompt cerró las fugas sin subir
  de modelo, que es la segunda vez que pasa en este proyecto.

Queda un residuo honesto: cerca de una de cada seis corridas todavía dice algo
tipo *"quizás sea cuestión de tiempo"* sobre la confianza de un NPC. Es lo único
del pedido que no se mató del todo.

> **Lo que esto le hace al tramo 00.** La pregunta era *"¿el director es
> divertido?"*. Hoy no se puede contestar todavía, porque **una parte de lo que
> el jugador leyó como historia emergente no pasó nunca.** Si alguien vuelve al
> otro día por una crónica inventada, el experimento midió al modelo escribiendo
> ficción, no al mundo produciéndola. Arreglar esto es precondición del test, no
> una mejora de calidad.

---

## Tercera auditoría, independiente y con cuatro jugadores: **el test se puede correr**

39 crónicas, N=3 por jugador y ventana, hasta cuatro jugadores sobre **la misma
ventana exacta**, ticks anclados y verificados al cierre. US$0,34 en total.

**El veredicto, que es la decisión que el proyecto venía esperando:**

> **Sí, el test de siete días con cuatro personas se puede correr — después de
> tapar tres huecos nombrados, que son tres y no quince.**

El motivo es medido, no optimista: **lo que hacía imposible el test con cuatro
personas era el bug del espectador, y está muerto con 21 corridas independientes
detrás** (0/21). Lo segundo era la ventana que miraba al pasado, muerta con 39
(atraso 0–5 días, contra 94–196). Y con cuatro personas en siete días el mundo
va a tener unos cincuenta hechos por ventana y ninguna ausencia de cuatro meses:
**es el régimen más fácil de los cinco que se probaron.**

### Dos de los tres huecos, cerrados y medidos

54 crónicas, N=3 por lector, cinco ventanas ancladas, hasta dos lectores sobre
la misma ventana exacta.

| | antes | después |
|---|---|---|
| `no_volvio` con el final inventado | 4/18 | **0/18** |
| Pérdida afirmada sin `perdida_de_saber` | 3/27 | **1/27** |
| — el caso exacto del informe (la magia de Tobio colgada de Ilde) | 2/6 | **0/6** |
| Nota narrada en voz alta | 7/27 | 3/27 |
| Vocabulario del sistema | 1/27 | **0/27** |
| `perdida_de_saber` con peso / abriendo | 15/15 | **15/15** |
| Costo por mirada | US$0,00869 | US$0,00952 (+9,6 %, todo prompt) |

**Y afinó el diagnóstico que yo había relayado.** Yo dije que se inventaba la
causa. No exactamente: `salir()` **pelea antes** de sortear quién no vuelve, así
que hay un `pelea` del mismo día en la ventana — *"se le enfrentó a mano
limpia"* **estaba respaldado**. Lo que se inventa es **el final**: *"no pudo con
él"*, *"se lo llevó"*. La nota niega el final y no niega el bicho, que es más
preciso y menos restrictivo.

> **El hallazgo que cambió el diseño de las notas, y vale para cualquier prompt
> de este proyecto.** Escritas en descriptivo —*"el hecho no dice de qué"*— el
> modelo las leía **como contenido y las devolvía**: *"murió, aunque el hecho no
> dice de qué"*. **Todas las notas pasaron a imperativo** (`no cuentes…`). Una
> nota que empieza con "no cuentes" no se puede copiar a la crónica.

Y un residuo que dejó medido y sin tapar, con la causa nombrada: **los ejemplos
negativos entre comillas a veces ceban en vez de suprimir** — una crónica
reprodujo textual una frase que el propio prompt ponía como prohibida. Lo vio
dos veces.

### El tercer hueco, y uno nuevo que es de regalo

1. **`no_volvio` necesita su entrada en `HUECOS`.** El código justificaba no
   dársela porque *"la otra forma de irse sí lleva el bicho adentro"* — **y es
   falso**: el bicho viaja en `detail` y el director lee `summary`. Verificado:
   el summary dice sólo *"X fue a Y a buscar Z y no volvió"*. Resultado, 2 de 3
   crónicas inventaron o insinuaron la causa. Es el mismo 4-de-6 de la muerte,
   en el tipo de evento que quedó descubierto por un argumento correcto sobre
   `detail` y equivocado sobre lo que llega al prompt.
2. **`perdida_de_saber` tiene que ser lo único que autorice decir "no queda
   nadie que lo sepa".** Hoy el modelo lo deduce de una muerte más una
   enseñanza y se equivoca: una crónica le dijo a un jugador que **se perdió un
   saber que Bruno tiene y está vivo**, en una región con cero eventos
   `perdida_de_saber`. Es la afirmación más cara del juego y la única que no se
   puede dejar inferir.
3. **La relación se lee al revés.** *"Bruno le enseñó el oficio"* cuando fue al
   revés; *"le enseñó a Ilde el Temple de río"* cuando Ilde le enseñó a él; y
   `agenda_nueva` ascendida a cumplida (*"al fin logró dormir una noche
   entera"*). Cinco crónicas, y son **los dos `summary` más ambiguos que emite
   `tick.ts`**.

### Lo que sí quedó probado

`disposition` muerto (0/39, confirmado independiente) · vocabulario del sistema
limpio por tercera vez · causa de muerte inventada de 4/6 a una insinuación en
treinta · `perdida_de_saber` abriendo la crónica **15 de 15** · el corte nuevo
descarta **cero muertes, cero enseñanzas, cero pérdidas de saber** y sólo tira
rutina · la reserva por rareza metió sola tres `nacimiento` y cuatro
`perdida_de_saber` viejos · y los **nacimientos se narran bien, 6 de 6**, sin
inventarles historia.

### Dos cosas que corrigen cómo hay que leer este archivo

**El 21 % de impecables contra el 46 % de la auditoría anterior no es un
empeoramiento**, y el auditor fue explícito: su muestra está **construida para
romper** —espectadores puros, ventanas de 223 días, cuatro jugadores sobre los
mismos hechos— y cuenta como sobre-leída cosas que la anterior dejaba pasar. Lo
que sí afirma con 39 corridas es que **la tasa de invención no está cerca de
cero.**

**Y la varianza es enorme y es la regla:** Pedro c2 es impecable y Pedro c3,
sobre exactamente los mismos 60 hechos, tiene tres invenciones.

> **La regla de método que sale de acá, y vale para todo el proyecto:**
> cualquier medición de un arreglo que no sea **N ≥ 3 por ventana y con más de
> un jugador** va a volver a decir que está arreglado cuando no lo está.

---

## Segunda auditoría del director: mejoró mucho, y todavía no alcanza

13 crónicas nuevas y 4 guardadas, en las dos regiones. **El modo de falla
dominante murió; quedan dos fugas nombradas.**

| | 1ª auditoría | 2ª |
|---|---|---|
| Planilla de NPCs con ventana vacía | 6 de 7 afirmaciones sin hecho | **muerta por construcción** |
| Crónicas con al menos una invención | **3 de 3** | **7 de 13** |
| Crónicas impecables | 0 de 3 | **6 de 13** |
| Vocabulario del sistema | limpio | limpio |
| Memorias de NPC en primera persona | sí | fuera del prompt |

**Las dos fugas que quedaban están cerradas** (ver abajo). Eran éstas:

1. **`people.disposition` no es un índice, es prosa con reglas de
   comportamiento.** Ilde: *«Enseña a quien se queda tres días sin pedir
   nada.»* — **salió tal cual en la crónica de un jugador.** O sea que el
   director está dictando **la receta literal para desbloquear una enseñanza**.
   Es la fuga de "qué tan cerca está alguien" reencarnada, y es peor que los
   `valued 44` porque ya viene redactada como consejo. Tres de las doce
   invenciones son este campo copiado.
2. **La línea `Ya no están:`**, que se agregó para que no narrara vivos a los
   muertos, produjo el error simétrico: **narró a Ilde como ida y su saber como
   perdido en una ventana donde Ilde trabaja en siete hechos.**

**Y la planilla no murió: cambió de origen.** `agenda_avanza` y
`agenda_estancada` emiten una línea por NPC por día, así que el último párrafo
vuelve a ser un repaso — *"Odila… Sarn… Marta… Tobio…"*. Todo respaldado por ids
reales, **así que ahora la auditoría no lo puede marcar.**

### `unbacked_names` es un piso, no un termómetro

**Dio 0,00 en las trece crónicas donde se encontraron doce invenciones.** Marca
bien lo suyo —cero falsos positivos— pero sólo ve **gente inventada**: se le
escapan las acciones, los motivos y las relaciones fabricadas entre gente que sí
está en los hechos, los actores anónimos (*"lo encontraron tirado y lo
trajeron"*), y `disposition` copiado.

> Un 0,00 sostenido no dice *"el director no miente"*: dice *"el director no
> está inventando gente nueva"*. **Leerlo como lo primero es exactamente el
> error que ya se cometió con `inventados: []`.**

### Dos crónicas rotas siguen guardadas en producción

Dos crónicas reales de `Prueba3D` son **itinerarios de conversaciones que no
están en la ventana** —las `conversacion` están excluidas por código—, sin un
solo hecho detrás. El bug se arregló y **no se reproduce**, pero **el texto malo
sigue en la base y ya se le mostró a alguien.**

### Lo que sí hay que celebrar

- **`perdida_de_saber` se narra con el peso que tiene: 5 de 5.** Abrió la
  crónica en las cinco corridas donde estaba disponible.
- **El `no` nunca se convierte en enemistad: 3 de 3.** Lo cuenta como umbral no
  alcanzado y deja la puerta abierta, que es lo que es.
- **Cuando el jugador está en la cadena, la cuenta como historia: 4 de 4.** El
  mejor párrafo de la muestra une tres hechos separados por 28 días:
  *"Ilde murió y con ella se fue el Temple de río; el arma con la que
  PruebaCombate limpió el valle la había forjado ella."* **Eso es una historia
  que nadie escribió.**
- Cuando la cadena es sólo entre NPCs, en cambio, la lista o la invierte (2 de 5).

> **El juicio de la segunda auditoría, y es lo primero bueno que se pudo decir
> del tramo 00:** la pregunta **ya se puede preguntar**. Todavía no se puede
> contestar, porque no se puede garantizar que lo que el jugador leyó haya
> pasado. **Está a una iteración, no a cinco.**
>
> **Esa iteración se hizo** (abajo). Falta una tercera auditoría independiente
> para saber si alcanzó: todo lo que sigue está medido por quien hizo el
> arreglo, que es mejor que nada y no es lo mismo. **Y tiene que hacerse con
> más de un jugador** — el peor bug del día sólo aparecía con dos.

### Tercera iteración: el bug del espectador, y la ventana que miraba al pasado

**El hallazgo más grave del día, y sólo aparece con más de un jugador.** Con
`Testigo` —alguien que no hizo nada— el director narraba **el día entero de otro
jugador en segunda persona**: *"Odila te encargó…"*, *"Ilde te enseñó Temple de
río"*. **2 de 2.** El prompt decía "los hechos de otros son de otros" pero
**nunca decía quiénes son los otros**. Se arregló con una línea en el fichero
que lista los nombres de los jugadores que ya salen en los hechos: **0 de 22.**

> **El test de la Fase 0 son cuatro personas y siete días.** Con este bug, los
> cuatro se habrían leído la historia de los demás como propia. Es el tipo de
> cosa que sólo se encuentra midiendo con más de un jugador, y hasta hoy todas
> las auditorías se habían hecho con uno.

**Y el corte de 60 hechos estaba peor de lo que yo había anotado.** Tomaba los
más viejos, y medido en tres ventanas:

| ventana | atraso antes | después |
|---|---|---|
| 140 días afuera | **94 días** | **1 día** |
| 195 días | 186 días | 1 día |
| 223 días | 196 días | 1 día |

Lo que eso producía, textual: en una ventana **la muerte de Ilde ni aparecía** y
las cuatro corridas le decían al jugador *"Odila todavía no confía lo suficiente
como para enseñarte"* — noticia de hace 195 días, cuando Odila **ya le había
enseñado**. El juego decía "te lo ganaste" y la crónica decía "todavía no". En
otra, tres de tres **narraban a Ilde trabajando 122 días después de muerta**.

**La solución no fue dar vuelta el orden** —eso sólo cambia de lado la pérdida—
sino repartir el presupuesto en tres reservas: el presente (últimos 20), el hilo
del que lee (15), y el resto ordenado por **rareza del tipo calculada en esa
misma ventana**. La muerte (1 de 140) le gana a la agenda cumplida (67 de 140)
**sin que el archivo sepa qué tipos de evento existen** — un `nacimiento` que
apareció mientras trabajaba entró solo, por raro. Lo que se pierde es la rutina
vieja, que es justamente la planilla que las tres auditorías venían peleando.

**La causa de muerte inventada: 4 de 6 la afirmaban → 0 de 12.** Se cerró
nombrando el hueco (`HUECOS`, por tipo de evento) y verificándolo contra el
emisor: `muerte` sale de `tick.ts` con `{person}` y nada más, y la otra forma de
irse —`no_volvio`— sí lleva el bicho adentro. Así que *"no la mató nada ni
nadie"* es cierto y verificable, no una excusa.

También cayeron el rescatista inventado (0/13), la escena inventada de
`confianza` (2/7 → 0/13) y **el voseo** (2/6 → 0/32): el prompt de sistema
estaba dictado en voseo mientras la regla pedía "tú".

**El costo subió 22 %** (US$0,0070 → US$0,0085) y está bien explicado: el corte
viejo entregaba 28–57 hechos porque los 60 más viejos venían llenos de
duplicados exactos; el nuevo entrega **60 distintos siempre**.

### Las dos fugas, cerradas — y el argumento que las cerró

**`disposition` salió del prompt del director, query incluida: 9 de 41 corridas
lo copiaban literal, ahora 0 de 59.** El argumento decisivo lo dio el propio
repo y es mejor que "sacalo": **`disposition` es el prompt de sistema del NPC.**
`dialogo.ts` y `saludos.ts` lo usan tal cual —*"Eres Odila, destiladora.
&lt;disposition&gt;"*— y **ahí está bien, porque la que habla es ella.** Pasárselo al
narrador es darle reglas de comportamiento ya redactadas en castellano, y las
dicta. Al índice no le hacía falta: para entender un hecho y saber a quién
sugerir alcanzan oficio, lugar, qué sabe y si enseña.

**La línea `Ya no están:` se eliminó sin reemplazo directo.** Lo único que se
perdía era mandar al jugador a buscar a un maestro muerto, y eso lo cierra ahora
una regla que **no nombra a nadie**: si alguien sale en un hecho y no está en el
índice, se cuenta lo que hizo y nada más — no se sugiere, no se dice dónde está,
y **que le falte la ficha no significa que se haya ido.** Ninguna cadena del
prompt afirma ya que alguien no está.

**Y el costo bajó 8 %** (US$0,0073 → US$0,0067) aunque el prompt de sistema
engordó, porque de paso colapsó los duplicados exactos: *"Tobio sigue sin
conseguir lo que necesita"* aparecía **ocho veces idénticas** en una ventana.

> **Una honestidad que vale anotar.** El agente reportó primero un "antes"
> equivocado: montó una ventana que creía terminada antes de la muerte de Ilde,
> seis corridas la narraron, y al ir a la base encontró que el corte de 60
> hechos **sí incluía** esa muerte. Era narración correcta, no la fuga. Lo dejó
> escrito él mismo señalando que **es exactamente el error que este proyecto
> viene repitiendo.**

*Nota de costo: la mirada pasó de US$0,0032 a US$0,0073. El FICHERO engordó.*

---

## Un jugador de otro valle estaba suprimiendo la tesis del juego

El bug más grave del 17 de agosto, y estuvo escondido detrás de algo que parecía
un detalle: **`knowledge` no tiene `region_id` — las filas de saber son globales
y los dos valles las comparten.** Cuatro lugares contaban portadores sin filtrar.

El que importa es `perdida_de_saber`, que es **el evento del que cuelga la tesis
entera**: *el saber se pierde con la última persona que lo tenía.* Montado el
caso y corrido por el camino real:

```
«Temple de río» — portadores además de Odila: 4 muertos + Prueba3D [valle-primero]
   ANTES: quedanVivos = 1 → NO EMITE   (lo suprime el fantasma)
   AHORA: quedanVivos = 0 → EMITE
        · Murió Odila, destiladora, en El Sotobosque.
        · Con Odila se fue Temple de río. No queda nadie en el valle que lo sepa.
```

**Con el código viejo el segundo renglón no existía: el valle perdía el saber y
la crónica no se enteraba.** El experimento entero mide si eso se siente, y
estaba apagado por un jugador de otra región.

Los otros dos del mismo grupo: una agenda quedaba **desbloqueada para siempre**
esperando a un maestro que no existe en ese mundo, y `filo de agua` seguía
"fabricable" porque alguien del otro valle lo sabía. Los tres pasaron a una sola
función, `siguenEnElValle()`, y sin queries extra.

> **Es la tercera vez que el mismo error cambia de disfraz**: contar filas que no
> corresponden. Antes fueron los muertos —dos veces—, ahora la región. La regla
> ya vale como ley de este repo: **toda consulta que cuente gente se pregunta
> primero de qué valle y si está viva.**

---

## La duplicación escondía una divergencia viva

`tick.ts` tenía una copia entera del combate. Se extrajo, y al unificar
aparecieron **tres** duplicaciones —`pelear()`, `recordar()` y
`tocarVinculo()`— y **tres diferencias reales entre las dos copias**. La que
importa:

> **El evento `confianza` sólo salía por el camino del tick.** Matar un bicho
> por `/act` te avisaba *«Marta empezó a confiar en vos: ya le pediría un
> favor»*. Matarlo desde el cliente 3D con `POST /pelear`, **no** — y matar da
> +8 de aprecio, que desde cero cruza el umbral siempre.

O sea que **el camino principal de combate del juego no te avisaba nunca que te
habías ganado a alguien.** El aviso existe justamente para que ganarse a la
gente no sea superstición. Es una brecha entre lo que el juego es y lo que
aparenta, y estaba escondida detrás de código copiado.

Las otras dos: un `.limit(1)` que faltaba en una copia —sin él `maybeSingle()`
falla con más de una fila y **el vínculo no se mueve, en silencio**— y un
`?? ''` contra una columna uuid que el otro archivo documenta como cosa que
revienta. Los `summary` sí eran idénticos.

**Cómo se resolvió, y está bien:** no se unificó el comportamiento por cuenta
propia —eso cambia lo que ve el jugador—, sino que la divergencia quedó
**nombrada en la firma** (`avisarVinculo`), a la vista, con el tick pasándolo y
la web no. Pasa de secreto a decisión.

---

## Un resultado negativo, medido y bien reportado

`pedir` **no bajó la circulación del saber.** Con 660 ticks por brazo y cuatro
valles nuevos de cada lado: enseñanzas totales **0,039 → 0,041 por tick**. Lo
que pasó adentro es lo interesante — la vía *buscada* se desplomó (9 → 2) y la
*espontánea* subió sola (17 → 25), **porque pedir hace que la gente viaje a
buscarse y el sorteo espontáneo exige estar en el mismo lugar.**

Es el mismo mecanismo que ya obligó a bajar ese sorteo de 0,35 a 0,12: **cada
vez que la gente se mueve más, el saber circula más sin que nadie toque un
número.** Van dos veces. Conviene tratarlo como una ley del sistema y no como
una sorpresa: **cualquier cosa que aumente los encuentros aumenta la
circulación, y la escasez es lo que el juego vende.**

Lo que sí cambió es la *composición*, y ahí está el valor: se fue la vía absurda
—aprender un oficio entero para conseguir un objeto— y no entró ninguna nueva.

> **Y el agente no lo vendió como victoria.** Lo escribió como lo que es, dejó
> dicho cuál es la palanca si hay que frenar el total (el 0,12, no lo suyo), y
> **no la tocó**, con el argumento correcto: mover dos números en el mismo
> cambio deja la próxima medición sin poder atribuir nada.

---

## Cuando los NPCs se movieron, el saber empezó a sobrar

Efecto lateral de V.1 que no había previsto nadie y que vale como aviso general.

La enseñanza espontánea entre NPCs sorteaba al 35 % por tick, y **exigía maestro
y alumno en el mismo lugar**. Hasta ayer casi nadie se movía, así que casi nunca
acertaba: el número era alto porque en la práctica no pasaba. En cuanto la gente
empezó a cruzar el valle, el sorteo empezó a dar — y en la primera corrida
**Forja simple pasó de una cabeza a cinco en 25 ticks.**

> **Un valle donde todos saben todo no pierde nada cuando se muere alguien.** El
> motor del juego se apaga sin que se rompa una sola línea de código.

Se bajó a 0,12. Pero la lección es más grande que el número: **una constante
calibrada contra un mundo quieto deja de valer cuando el mundo se mueve.** Cada
vez que algo empiece a pasar de verdad, hay que releer las probabilidades que
dependían de que no pasara.

---

## El mundo corría 38× más rápido de lo previsto, y nadie lo sabía

**El 17 de agosto se instrumentó el latido y el primer dato tiró abajo una
suposición que este archivo daba por buena.** Ahora hay una tabla `ticks` con
origen (`cron` / `jugador`) y backfill histórico. Verificado de forma
independiente:

> **`valle-primero` corrió sus 28 ticks en 4 horas y 21 minutos**, con **once
> pares de ticks separados por menos de un minuto.** El cron, que corre cada
> seis horas, podía explicar uno.

La causa: `POST /act` llamaba a `step()` sin ninguna condición, o sea **una
acción de jugador = un día del valle**. Con veintiocho días de valle en una
tarde, todo lo que se calibró "por día de mundo" —muerte, agendas, amenazas,
enseñanza espontánea— venía disparando a treinta y ocho veces la frecuencia
prevista.

**Y eso es exactamente la idea muerta de `DISENO.md` §17** —"tiempo más rápido
para el conectado"— que estaba viva en producción sin que nadie la hubiera
propuesto. No se coló por una decisión: se coló por una línea.

**El arreglo:** el tick ahora late **por vuelta del sol**, no por acción. La
condición es estar en un bloque de seis horas posterior al del último tick, con
la misma constante que ya usaban `momento_del_dia` y el `DIA_REAL` del cielo,
extraída a un solo lugar. Diez jugadores golpeando toda la noche producen los
mismos ticks que un valle vacío. Probado: **30 pedidos repartidos en cinco
procesos distintos → un solo tick.**

Y respeta §7.3 de forma literal: **estar conectado cambia qué pasa en el día, no
cuántos días pasan.** El reloj del mundo depende sólo del tiempo real
transcurrido; cuánto se simula adentro de cada día sigue dependiendo de si hay
alguien, que es el `pace` del tick.

> **La lección, y ya van cinco.** Este proyecto viene teniendo la conclusión
> obvia equivocada, y el patrón se repite: **lo que no se mide, se supone mal.**
> El ritmo se "recalibró" hace unas horas con cuentas hechas sobre el cron,
> cuando el cron no era el reloj real. Las cuentas estaban bien y la premisa
> estaba mal. **Antes de calibrar algo, instrumentalo.**

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

**Recalibrado el 17 de agosto.** Cómo quedó:

| Qué | Antes | Ahora | Efecto real |
|---|---|---|---|
| Ventana de mordida | `tick - last_seen <= 3`, o sea **18 h reales** | **5 minutos de reloj de pared**, o tener una acción sin resolver | desconectado: ~0. Jugando: 50 % por acción parado al lado del bicho |
| Reponer amenazas | 35 % por tick, una tirada, con `pace` | **60 % por vacante**, tope 2 nuevas por tick, sin `pace` | de cero a la primera ~6,7 h (era 17); al tope ~15 h (era 68) |
| Muerte | 0,8 % / tick | **0,8 % — sin tocar** | ver abajo |

Dos decisiones que conviene mirar con atención:

- **Se sacó `pace` del spawn de amenazas**, y es una desviación consciente de
  §7.3. `pace` existe para que la *historia* no se escape mientras nadie mira;
  una amenaza no es historia, es el estado del valle. Con `pace` el que limpiaba
  el valle y se iba se lo encontraba igual de vacío cinco días después. Lo banca
  el tope de tres: esto no puede desbordar.
- **La tirada es por vacante y no por tick**, así el valle se repone más rápido
  cuanto más vacío está — que es la forma que uno quiere. El tope de dos nuevas
  por tick está porque lo que se raciona es **ruido**, no bichos.

Los tres razonamientos, porque el número solo no alcanza:

- **La muerte: se revisó y NO se tocó.** En tiempo de mundo está bien —2,9 por
  año de valle en un pueblo de siete— y no hay número que sea sano ahí y a la
  vez probable en una ventana corta: llevar el test al 80 % pediría 5,6 % por
  tick, o sea **veinte muertes por año en un valle de siete**, y eso ya se probó
  y consume el valle en una tarde.

  > **Esta cuenta se corrigió dos veces en el mismo día, y la segunda la cierra.**
  > Primero decía que el test de siete días son 28 ticks; después que eso era
  > sólo el piso porque cada `/act` sumaba uno. **Ahora está medido y las dos
  > versiones eran malas por el mismo motivo: nadie sabía a qué velocidad corría
  > el mundo.** Corría a 38×. Desde el latido por vuelta del sol, **28 ticks en
  > siete días vuelve a ser el número correcto** — y esta vez se puede
  > comprobar, no suponer, consultando la tabla `ticks`.
  >
  > O sea que el 20 % es real. La conclusión de no tocar la probabilidad se
  > sostiene, y el arreglo sigue siendo de diseño del test.

  Lo que sí se hizo, y no mueve la tasa ni un punto: al sortear quién se muere,
  **el último que sabe algo pesa ×3**. El evento que demuestra la tesis no es
  `muerte`, es `perdida_de_saber`, y con sorteo parejo sólo el 28,6 % de las
  muertes se llevaba algo puesto; ahora es el 54,5 %. **Se duplica la cosecha
  del experimento sin agregar un solo muerto.**

  Y el arreglo de fondo es de diseño del test, no de este número: hoy, cuando
  el 20 % sale, la muerte llega **sin que el jugador haya podido hacer nada al
  respecto**. O el test corre con cron más rápido, o se siembra una muerte en
  marcha —alguien visiblemente frágil, con un aviso por única vez— para que la
  tesis sea jugable en vez de sorteada.
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

**00 · ¿El director es divertido?** — *sin contestar, y ahora sabemos que
todavía no se puede preguntar.* La auditoría del 17 de agosto mostró que parte
de lo que el jugador leyó como historia emergente no pasó nunca. Medir así no
mide el mundo, mide al modelo escribiendo ficción. **Arreglar eso es
precondición del test.**
Cuatro personas, siete días, dos preguntas: ¿vuelven sin que se lo pidas?
¿pueden contar una historia que nadie escribió? Todo lo demás está apostado a
que la respuesta sea que sí. **Se decidió avanzar igual, a sabiendas** — no es
un descuido, es una apuesta tomada. Falta el panel que la conteste con datos y
no con impresiones.

**01 · Que el cliente y el mundo sean la misma cosa** — **cerrado.**
Era la brecha que hacía que te atacaran bichos y no pudieras hacer nada. El
combate va y viene por el servidor, los monstruos que ves son las filas de
`threats`, el inventario se ve, la vida es la de la base, y **ves a los otros
jugadores**. Lo que queda —`/pelear` sin validar presencia— es higiene, no la
pregunta del tramo.

**02 · Que los NPCs sean personas** — *acá estamos.*
Tienen voz propia y se acuerdan de lo conversado; ya tienen cara. Falta que te
registren al pasar y que tengan horarios. Un personaje que no se acuerda de vos
es un botón que devuelve texto — y uno que no te mira cuando pasás es un
mueble.

**02b · Que la gente viva su propia vida** — *dirección nueva, `DISENO.md` §9.*
Los NPCs usan **los mismos verbos que el jugador**: no avanzan un porcentaje,
van, buscan, dan, pelean, salen de aventura y a veces no vuelven. Y las metas
dejan de salir de una lista fija: las siembra **el autor del mundo**, que corre
cada varios días del valle y escribe hechos nuevos en la base sin decidir que
algo ya pasó.

Va acá y no en el 03 porque es la misma pregunta que el 02 —¿esto es gente o son
botones?— y porque **la primera de sus tres tareas es barata y hace visible todo
lo que el mundo ya sabe**: las metas, los oficios y los vínculos existen hace
semanas y nunca se vieron, porque se resolvían como aritmética. El detalle y el
orden, en `BACKLOG.md`.

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

## Dos sesiones descubrieron lo mismo por separado

El 17 de agosto, con horas de diferencia y sin saber una de la otra, **dos ramas
llegaron a las mismas dos conclusiones**: que esta máquina sí tiene pantalla y
se puede ver el juego, y que **los colores del kit de Kenney llegan mal en el
archivo** —las copas en turquesa (h169 s0,80), los troncos en salmón—.

Las dos lo arreglaron, en lugares distintos y de forma complementaria: una
impuso la paleta a las **superficies sin textura** (los árboles), la otra
escribió una **aduana** para las texturadas (edificios y props). No se pisaron
de milagro.

> **El costo real no fue el trabajo duplicado, fue el tiempo perdido antes.**
> Durante días todas las tareas de arte terminaron en "pedí una captura" y
> quedaron esperando a una persona. La premisa estaba escrita en cuatro lugares
> y nadie la probó. **Una suposición que nadie chequea se propaga más rápido que
> un bug**, porque los bugs por lo menos fallan.

---

## La captura salió, y la aldea no se separa del suelo

**Primera medición sobre píxeles reales del juego, no sobre nominales de la
paleta.** La pregunta que quedó abierta toda la jornada —*¿la aldea se separa
del suelo?*— tiene respuesta: **no.**

En luminancia (0–255), con la paleta y el arreglo de sRGB ya adentro:

| zona | luma |
|---|---|
| suelo abierto | 126 |
| muro de casa | 123 |
| techo rosa | 121 |
| **sombra** | **118** |

**Todo el pueblo, el suelo y hasta la sombra viven en ocho puntos de gris.** La
escalera de la paleta pide dos peldaños y medio entre el suelo y los muros, o
sea unos 64 puntos. Y el cuadro entero vive en una banda estrecha: **p5 = 67,
p95 = 133 sobre 255.** Eso es la papilla gris, medida.

**Y hay un segundo problema, que es nuevo y es de coherencia:** los techos del
kit salen a **saturación 0,42 y 0,37**, por encima del techo de 0,35 que la
paleta fija para el mundo. Rosa y cyan saturados contra un suelo oliva apagado.
**La paleta no manda sobre las mallas de Kenney**, así que hoy hay dos
direcciones de arte en el mismo cuadro — que es exactamente la indecisión que
§6 existe para terminar.

**Un test que descarta una causa:** con `--calidad=bajo` —sin SDFGI ni niebla
volumétrica— la banda **no se abre, se cierra todavía más** (p5 85, p95 128).
Así que el aplanamiento no es (sólo) la niebla. La causa queda abierta a
propósito: hoy ya se dio una por probada sin medirla y era falsa.

---

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

**Los dos bloqueos de esta franja se sacaron el 17 de agosto** y están en
`DISENO.md` §6: el **piso de zoom** (silueta, postura y ropa, nunca la
expresión) y la **dirección de arte** (estilizado, y comprometido — el problema
nunca fue la simpleza, fue la indecisión). Las cuatro ramas de arte trabajan con
ese criterio o se rompe.

### El indicador de aceptación de la franja: *"le falta la vida, todo"*

Se dijo cuatro veces, con distintas palabras, y es el pedido más repetido que
hay. **No es una tarea y no hay que tratarlo como una:** es el indicador con el
que se sabe si la franja terminó.

Se descompone en cosas que ya están en el backlog —vegetación a escala, sonido,
que los NPCs se muevan, interiores— **y ninguna sola lo resuelve.** Ése es
justamente el punto: si se despacha "darle vida" como tarea, vuelve una demo
bonita que no lo mueve; y si se despacha una sola de las piezas y se espera que
alcance, se declara terminada una franja que sigue abierta.

**Cómo se usa:** cuando aterricen la vegetación, el sonido y los NPCs
moviéndose, se pregunta de nuevo. Si la respuesta sigue siendo "le falta la
vida", falta una pieza que todavía no está en la lista y hay que encontrarla —
no repetir las que ya están. **La franja cierra cuando esa frase deja de
aparecer, no cuando se tildan sus tareas.**

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
- ~~**Nadie del equipo puede ver el juego.**~~ **Era falso, y costó días.**
  Hay display bajo WSLg y Godot renderiza por software: se saca una captura del
  valle con `--display-driver x11 --rendering-driver vulkan ... --captura` y se
  mide. SDFGI y SSR no se juzgan ahí, **pero valor, silueta, saturación y
  composición sí** — que son exactamente las decisiones de la rama de arte.
  Durante días cada tarea visual terminó en "pedí una captura" y quedó esperando
  a una persona que nunca hizo falta. **La receta está en el `CLAUDE.md` del
  cliente.** Lo que sigue sin poder juzgarse solo es el audio.
- **Nadie del equipo puede escucharlo.** Godot corre sin GPU
  bajo WSL: la escena que se compila no se parece a la que ve la dirección del
  proyecto. Todo juicio visual depende de una captura de quien lo esté jugando,
  y con el audio va a pasar lo mismo. **Esto es lo que hace cara la franja de
  percepción**, no la dificultad técnica: es la rama con el ciclo de
  realimentación más lento del proyecto. Consecuencia práctica: preferir
  trabajo cuyo resultado se pueda verificar sin pantalla (una paleta es datos,
  la cantidad de instancias y las llamadas de dibujo son números) y juntar los
  pedidos de captura en tandas.
- **El que coordina también afirma sin medir, y es peor cuando lo hace él.**
  Pasó el 17 de agosto: la fuga de veinte objetos del sonido se atribuyó al
  cableado duplicado, **se escribió en `CLAUDE.md` como causa probada, y se le
  dijo al agente que parara**. Era falso. Con un control —quitar el duplicado y
  después revertir el arreglo del módulo— las fugas vuelven a 22 y con el
  arreglo bajan a cero: la causa era del motor, hacen falta dos cuadros entre
  parar el audio y cerrar, y `_exit_tree()` no tiene ninguno. **La aritmética
  nunca había cerrado** y nadie la miró: la escena de prueba tiene un solo
  `Sonido` y filtraba las mismas veinte.
  > Lo grave no es el bug: es que **una causa entró como hecho al archivo que
  > existe para que nadie repita una caza**, y encima frenó al que la estaba
  > cazando bien. La regla *medí antes de afirmar* aplica más fuerte, no menos,
  > cuando el que afirma es el que reparte el trabajo.
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
