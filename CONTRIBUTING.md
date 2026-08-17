# Cómo se trabaja en Saber Escaso

Bienvenido. Esto son quince minutos de lectura que te ahorran una tarde.

## Antes de escribir una línea

**Leé [`DISENO.md`](DISENO.md).** Son las bases: qué es el juego y por qué. No
es documentación decorativa — es de dónde sale el criterio cuando algo no está
especificado, y hay una sección al final (*cómo se decide cuando esto no
alcanza*) que resuelve la mayoría de las discusiones.

Después, según dónde vayas a tocar:

- [`ROADMAP.md`](ROADMAP.md) — qué anda, qué está a medias y por qué.
- [`BACKLOG.md`](BACKLOG.md) — las tareas, con dueño y archivos.
- [`CLAUDE.md`](CLAUDE.md) — el estado técnico y **cada trampa ya pisada**. Esa
  última sección es la más valiosa del repo: son bugs que costaron una tarde
  cada uno y están documentados para que no los repitas.

## Los cuatro invariantes

**No se negocian, y el problema con romperlos es que no hace ruido.** Un cambio
que los viola compila igual, pasa los tests, y el juego se convierte en otra
cosa sin que nadie lo note durante semanas.

1. **`lib/world/tick.ts` nunca importa un SDK de IA.** La simulación es
   determinista. Si el tick usa IA, dejamos de poder distinguir si el mundo es
   interesante o si el modelo lo está maquillando. Toda llamada a un modelo
   pasa por `lib/modelo.ts`.
2. **`lib/world/director.ts` nunca escribe estado del mundo.** Lee eventos,
   devuelve texto.
3. **Nada se afirma si no está en `events`.** Vale para el director y para los
   NPCs: pueden negarse, dudar y mentir sobre lo que sienten; no pueden
   inventar hechos ni prometer lo que el mundo no vaya a cumplir.
4. **Lo que pasa en el cliente llega al servidor, o no pasó.** Ya lo rompimos
   entero una vez, con monstruos y combate que vivían sólo en la máquina de
   cada jugador. Se veía como un juego y no lo era.

Y una regla del mundo que es tan dura como los invariantes: **un objeto sólo
existe si alguien vivo sabe hacerlo.** Está escrita en los datos, no en un
comentario — `objects.made_by = null` significa que nadie lo hizo, y lo único
en todo el código que puede escribir ese null es el verbo `buscar` (la raíz
crece sola; el frasco lo hace quien sabe destilar). Si alguna vez un objeto
fabricado aparece sin autor, se rompió lo que sostiene el juego.

## Poner a andar el servidor

```bash
pnpm install
pnpm check          # qué falta antes de que algo explote
pnpm dev            # localhost:3210
```

Hace falta un `.env.local` con la clave del proveedor de IA y las credenciales
de Supabase. **Pedíselas a quien dirige el proyecto: no están en el repo y no
van a estarlo.**

```bash
pnpm seed           # sembrar una región nueva
pnpm tick           # avanzar un día del valle
pnpm compare Pedro  # comparar modelos para el director, con costos
```

**Ojo con la región.** `REGION_SLUG` en `.env.local` decide contra qué valle
corren los scripts. Producción es `valle-primero`; **para probar usá
`valle-pruebas`**, que es donde se rompe y se arregla:

```bash
REGION_SLUG=valle-pruebas npx tsx lib/tmp-loquesea.ts
```

## El cliente 3D

Vive en [otro repo](https://github.com/pcfds/saber-escaso-godot), es Godot 4.7,
y se compila con `./desplegar.sh` — que corre el juego headless primero y
**aborta si hay `SCRIPT ERROR`**. Un `--import` limpio no prueba nada: los
errores de orden de inicialización sólo aparecen ejecutando `_ready()`.

## Cómo se prueba acá

**Nada está listo porque compila.** La definición de terminado es:

- **Corrió.** No "debería funcionar". Escribí un script temporal en
  `lib/tmp-*.ts`, corrélo contra `valle-pruebas`, y mirá la salida.
- **Se verificó lo que importa**, no lo que era fácil de verificar. Ejemplo
  real: una corrida headless de Godot salía limpia y no probaba nada, porque
  headless no rasteriza y el shader del cielo ni se compilaba. Se descubrió
  rompiendo el shader a propósito para ver si se quejaba.
- **Se probó contra producción** si toca un endpoint. `curl` y pegar la salida.

Y si algo se aprendió en el camino, **escribilo en `CLAUDE.md`**. Lo que no
quede en un archivo, se perdió.

## Trampas de este repo

Éstas costaron tiempo real:

- **supabase-js: `data` es `T[] | null`** y un default `= []` en el
  destructuring NO se dispara. Usá `(await db...).data ?? []`.
- **`.maybeSingle()` devuelve ERROR con más de una fila**, y ahí `data` viene
  null. Si puede haber varias, `.limit(1).maybeSingle()`. Este solo bug hizo
  que el chusmerío repitiera la misma frase catorce veces por tick.
- **Un verbo nuevo necesita una migración que toque el `CHECK` de
  `actions.verb`.** Si no, el insert falla en silencio y la acción nunca
  existe.
- **El ritmo:** un tick es un día del valle y el cron corre **uno cada seis
  horas**. Antes de tocar cualquier probabilidad, calculá cuántas veces por día
  de mundo dispara. Ya nos mordió: la muerte estaba al 6% con ticks de diez
  minutos, o sea ocho muertes diarias en un valle de siete personas.
- **El ruido es el enemigo.** Lo que escribís en `events` lo lee el director y
  cuesta plata. Un estado que no cambió no es noticia.

## Migraciones

Van en `supabase/migrations/` con prefijo de fecha, y se aplican con
`npx supabase db push --include-all`. **Escribí en el SQL por qué existe la
tabla o la columna**, no qué hace: mirá las que ya están, son casi todas más
comentario que código, y ése es el estilo.

## Pull requests

- Rama aparte, PR contra `master`. **No pushees directo a master.**
- Un PR, una cosa.
- En la descripción: qué problema resolvés y **cómo lo verificaste**, con la
  salida real pegada.
- Si tocaste algo que roza un invariante, decilo explícitamente en el PR.

## El estilo del código

Comentarios en español, y **explicando por qué, no qué**. El código dice qué
hace; el comentario tiene que decir por qué está así y qué pasa si lo cambiás.
Casi todos los comentarios largos de este repo son la historia de un bug o de
una decisión de diseño. Cuando arregles algo raro, dejá escrito qué era raro.

Y si una decisión de diseño no está en `DISENO.md` y la tomaste vos, agregala
ahí en el mismo PR. **El documento se genera como página desde el repo**, así
que documento y código no se pueden separar — que es exactamente lo que pasó
una vez y costó recuperar media biblia de diseño.
