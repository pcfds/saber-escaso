# Saber Escaso — servidor

Un mundo de fantasía donde el conocimiento vive en gente que se muere. Si el
último que sabe forjar se va sin enseñarle a nadie, no vuelve a haber una hoja
nueva. Nunca.

**Jugarlo:** https://saber-escaso.vercel.app ·
**Cliente 3D:** [pcfds/saber-escaso-godot](https://github.com/pcfds/saber-escaso-godot)

Este repo es **el mundo**: la simulación, los NPCs, sus memorias, el director de
IA que narra lo que pasó, y el sitio. No dibuja nada — de eso se encarga el
cliente, que es reemplazable. Ya lo probamos: el primer cliente era web con
Three.js, se tiró entero, y el valle siguió con la misma gente y las mismas
memorias.

## Qué hace

Un tick es un día del valle y el cron corre uno por hora, así que el mundo
avanza tengas la sesión abierta o no. En cada tick la gente persigue sus metas,
se enseña oficios, se muere, y se cuenta lo que vio. El director lee lo que
pasó y te lo narra cuando volvés.

```
supabase/schema.sql       el mundo: lugares, gente, saberes, agendas, vínculos, eventos
lib/world/tick.ts         simulación pura. step() es la unidad
lib/world/director.ts     narrate(nombre) → crónica auditada
lib/world/dialogo.ts      hablarle a un NPC; cada uno con su voz y su memoria
lib/world/combate.ts      un golpe. lo único que no espera al tick
lib/web.ts                el servidor: landing, API del cliente 3D, crónica
```

## Los invariantes

No se negocian. Existen porque sin ellos el proyecto se convierte en otra cosa
sin que nadie lo note.

1. **`tick.ts` nunca importa el SDK de IA.** La simulación es
   determinista. Si el tick usa IA, dejamos de poder distinguir si el mundo es
   interesante o si el modelo lo está maquillando.
2. **`director.ts` nunca escribe estado del mundo.** Lee eventos, devuelve
   texto. Si el director puede cambiar el mundo, ya no medimos si sabe narrarlo.
3. **Nada se afirma si no está en `events`.** El director devuelve los ids que
   usó y el script los audita. Vale para los NPCs: pueden negarse, dudar y
   mentir sobre lo que sienten, no inventar hechos ni prometer lo que el mundo
   no vaya a cumplir.
4. **Lo que pasa en el cliente llega al servidor, o no pasó.** Ya lo rompimos
   entero una vez, con monstruos y combate que vivían sólo en la máquina de
   cada jugador.

## Los documentos

- **[`DISENO.md`](DISENO.md)** — las bases. Qué es el juego y por qué. Nadie
  arranca una tarea sin leerlo.
- **[`ROADMAP.md`](ROADMAP.md)** — qué anda, qué está a medias y hacia dónde va.
- **[`BACKLOG.md`](BACKLOG.md)** — las tareas, con dueño y archivos.
- **[`CLAUDE.md`](CLAUDE.md)** — estado técnico y cada trampa ya pisada.

## Correrlo

```bash
pnpm install
pnpm check          # qué falta antes de que algo explote
pnpm seed           # sembrar una región
pnpm tick           # avanzar un día
pnpm dev            # el servidor, en localhost:3210
```

Hace falta `ANTHROPIC_API_KEY` y las credenciales de Supabase en `.env.local`.
El director corre con `claude-haiku-4-5` por default (`DIRECTOR_MODEL` para
cambiarlo): son unos 0,009 dólares por crónica, contra 0,057 con Opus, y la
densidad de hechos es casi la misma — resultó ser un problema de prompt y no de
modelo.
