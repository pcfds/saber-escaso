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
- Reputación de dos ejes: `valued` y `feared` por separado.
- Hablarle a un NPC con tus propias palabras.
- Objetos que sólo existen si alguien sabe hacerlos.
- Amenazas y combate del lado del servidor.
- Cliente 3D con cuerpos animados, cielo propio, ciclo de día y noche atado al
  reloj del servidor, y un `.exe` que se baja y se abre.

### A medias — probado y falla
- **El combate está partido en dos.** Existe en el servidor y existe en el
  cliente, y no son el mismo combate. Es la brecha que hace que te ataquen
  bichos y no puedas hacer nada.
- Los monstruos que ves son locales; las amenazas reales no se dibujan.
- El inventario existe en la base y no se ve en pantalla.
- Los NPCs hablan, pero todos con la misma voz y sin recordar lo conversado.
- No ves a los otros jugadores dentro del valle.

### No existe
Cuentas (hoy es un token por persona repartido a mano) · el personaje es un
nombre sin cara ni stats · construir · quests que puedas tomar · mazmorras ·
robar · horarios de NPC · inglés y los idiomas inventados.

---

## Los tramos

El orden no es por dificultad: es por qué pregunta contesta cada tramo.
Saltearse uno no ahorra tiempo, lo posterga.

**00 · ¿El director es divertido?** — *sin contestar.*
Cuatro personas, siete días, dos preguntas: ¿vuelven sin que se lo pidas?
¿pueden contar una historia que nadie escribió? Todo lo demás está apostado a
que la respuesta sea que sí.

**01 · Que el cliente y el mundo sean la misma cosa** — *acá estamos.*
Hoy son dos mitades que se tocan sólo en el diálogo. Mientras siga partido,
cada cosa linda que se agregue al cliente agranda la mentira.

**02 · Que los NPCs sean personas.**
Voz propia, memoria de lo conversado, una línea que se sostiene, cara, y
horarios. Un personaje que no se acuerda de vos es un botón que devuelve texto.

**03 · Razones para volver mañana.**
Tomar agendas como quests, una mazmorra, construir, robar. La respuesta a "qué
hago hoy" no puede ser "lo de ayer pero más veces".

**04 · Que entre gente que no conocés.**
Cuentas, invitaciones, inglés. No antes de tener algo que valga la pena
mostrarle a un desconocido.

**05 · Steam.**
Wishlist antes que campaña, y ninguna de las dos antes de que alguien que no
sea Pedro vuelva tres días seguidos.

---

## Lo que puede matar esto

- **Estamos construyendo encima de una pregunta abierta.** La Fase 0 nunca se
  contestó. Cada semana de features es una semana apostada.
- **El costo de la IA escala con la gente.** Hoy es bajo porque somos uno. Cada
  charla es una llamada y cada crónica otra. Con cien jugadores hay que medirlo
  antes, no después.
- **Nadie del equipo puede ver el juego.** Godot corre sin GPU bajo WSL: la
  escena que se compila no se parece a la que ve Pedro. Todo juicio visual
  depende de una captura suya.
- **Ashes of Creation.** Prometer el mundo y no entregar nada jugable. El
  antídoto es el orden de arriba: cada tramo deja algo jugable esa misma noche.
