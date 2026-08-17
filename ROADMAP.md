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

## Estado (17 de agosto de 2026)

### Anda — verificado corriendo
- Mundo persistente que avanza solo, con o sin jugadores (a un cuarto de paso
  si no hay nadie).
- Director de IA que narra y sólo puede afirmar hechos que están en `events`.
- Agendas: los NPCs persiguen cosas, avanzan y se traban solos.
- El saber se aprende, se enseña y se pierde con el que se muere.
- **La destreza sube practicando** y decide la calidad de lo que te sale de las
  manos (0 → 45 en cinco prácticas; hojas de calidad 9 a 60).
- Reputación de dos ejes: `valued` y `feared` por separado.
- Hablarle a un NPC con tus propias palabras.
- Objetos que sólo existen si alguien sabe hacerlos.
- Amenazas y combate del lado del servidor.
- Cliente 3D con cuerpos animados, cielo propio con estrellas y dos lunas,
  ciclo de día y noche atado al reloj del servidor, y un `.exe` que se baja y
  se abre.

### A medias — probado y falla
- **El combate está partido en dos.** Existe en el servidor y existe en el
  cliente, y no son el mismo combate. Es la brecha que hace que te ataquen
  bichos y no puedas hacer nada.
- Los monstruos que ves son locales; las amenazas reales no se dibujan.
- El inventario existe en la base y no se ve en pantalla.
- Los NPCs hablan, pero todos con la misma voz y sin recordar lo conversado.
- No ves a los otros jugadores dentro del valle.
- La landing está escrita (`lib/landing.ts`) y **sin cablear a la ruta**.

### No existe
Cuentas (hoy es un token por persona repartido a mano) · el personaje es un
nombre sin cara · el eco · construir · quests que puedas tomar · mazmorras ·
robar · horarios de NPC · nacimientos · el generador de regiones · inglés y los
idiomas inventados · el panel de métricas del test.

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

**01 · Que el cliente y el mundo sean la misma cosa** — *acá estamos.*
Hoy son dos mitades que se tocan sólo en el diálogo. Mientras siga partido,
cada cosa linda que se agregue al cliente agranda la mentira.

**02 · Que los NPCs sean personas.**
Voz propia, memoria de lo conversado, una línea que se sostiene, cara, y
horarios. Un personaje que no se acuerda de vos es un botón que devuelve texto.

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
- **Nadie del equipo puede ver el juego.** Godot corre sin GPU bajo WSL: la
  escena que se compila no se parece a la que ve la dirección del proyecto. Todo juicio visual
  depende de una captura de quien lo esté jugando.

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
