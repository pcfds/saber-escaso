# Saber Escaso — las bases

Esto es lo que se decidió antes de escribir una línea de código, y es de dónde
saca criterio cualquiera que trabaje acá. **Nadie arranca una tarea sin leer
esto.** Un agente que no conoce las bases toma decisiones razonables que van
para cualquier lado, y a los tres días el juego es otro juego.

Si algo de acá se contradice con el código, es un bug del código o una decisión
que alguien tomó sin anotarla. Las dos cosas se arreglan; no se ignoran.

---

## 1. La idea, en una frase

**Un mundo de fantasía donde el conocimiento vive en gente que se muere.**

Si el último que sabe forjar se va sin enseñarle a nadie, no vuelve a haber una
hoja nueva. Nunca. Todo lo demás —el combate, las casas, los oficios, los
NPCs— existe para que esa frase se sienta.

## 2. Por qué existe

Se buscó un juego con fantasía + vista de arriba + casa/aldea + otros jugadores
reales + PvE con historia y mazmorras + algo regenerativo + PvP opcional +
entrar una hora y disfrutar. **Casi no existe redondo.** Los que se acercan o
son MMOs de grindeo, o son coop cerrado (Baldur's Gate), o prometieron el mundo
y no entregaron (Ashes of Creation).

El antídoto contra ese último es el orden: **cada tramo tiene que dejar algo
jugable esa misma noche.**

## 3. Lo que el juego es

### Vista y control
- **Tercera persona lejana, isométrica o casi.** Stardew, Minecraft, Baldur's
  Gate. **Nunca primera persona.** Nunca ese 3D plano de asset store.
- La cámara se mueve, se acerca para ver detalles, se aleja para jugar.
- La habilidad es del jugador con teclado y mouse. **No** veinte mil hechizos
  en barras tipo Diablo 2: pocas cosas, bien hechas, con timing.
- El entorno tiene que encantar. La luz hace ese trabajo, no los polígonos.

### El mundo
- **Online y persistente.** No es un MMO, pero es multijugador: la gente se
  conecta al mismo mundo.
- **El mundo vive sin vos.** Los NPCs avanzan con sus propias historias
  mientras no estás. Cuando volvés, encontrás otra cosa.
- **Sin jugadores conectados, todo va a un cuarto de velocidad.** No se pausa:
  se ralentiza. Con gente adentro, va normal.
- **Procedural y creciente.** Puede haber zonas oscuras y raras. Ninguna se
  siente vacía, salvo un desierto que tenga que serlo.
- Podés viajar al mundo de otro jugador: quedarte, construir, y en el límite
  hacerlo tuyo. **No es invasión, es que todo está conectado.**
- **Nada es inviolable, incluido lo tuyo.** Tendrás amigos jugando y NPCs
  contratados que defiendan. Si perdés, perdés, y no vas a poder hacer mucho.

### Los oficios y el saber
- **Cualquiera puede aprender cualquier cosa.** Un mago que quiere ser herrero
  se pone a hacer y aprende, o absorbe el conocimiento de alguien.
- El linaje, la sangre y los stats dan **afinidad o aura**, no exclusividad.
  Uno tendrá más aura que otro; ninguno tiene una puerta cerrada.
- El saber se aprende de una persona, se enseña a una persona, y **se pierde
  con la última persona que lo tenía**.
- **Un objeto sólo existe si alguien sabe hacerlo.** No hay tienda, no hay
  drops de la nada, no hay recetas escritas que se puedan robar. La receta es
  parte de lo que alguien sabe y se muere con esa persona.

### La gente
- Los NPCs **recuerdan**. Si hiciste algo malo, se acuerdan: te buscan, te
  tienen miedo, te expulsan, te secuestran, o te ayudan. Depende.
- Reputación de **dos ejes**: te valoran y te temen por separado. Una sola
  barra no puede expresar "lo respetan y le tienen terror".
- Cada NPC tiene **identidad, historia y voz propia**. Mantiene una línea de
  quién es y qué busca. Puede cambiar — pero por algo que pasó en el mundo, no
  porque al modelo le salió distinto esta vez.

### Vivir ahí
- **Construir**, o contratar gente que construya: de una casa a un pueblo, a un
  castillo, a un reino.
- Comida y agua son **secundarias**. Ayudan, no es un survival.
- **Robar** se puede, y te lo van a recordar mucho tiempo.
- **PvP opcional.**
- **Sesión de una hora que valga la pena.** Sin grindeo. Si la respuesta a "qué
  hago hoy" es "repetir lo de ayer más veces", está mal diseñado.

### Lo grande
- Puede haber dragones, razas nuevas, momentos globales buenos y malos.
- El mal no es una barra de porcentaje ni un señor oscuro genérico: es **más
  tipo Bayaz** — alguien con nombre, con intereses, que estuvo ahí todo el
  tiempo.
- **Lenguajes propios**, con diccionario y significados. Cosas que hay que
  aprender o conseguir traducidas.

### Meta
- **Español e inglés de base.** Por eso el mundo se guarda en datos (`detail`
  jsonb) y la prosa es derivada: un idioma nuevo no debería ser una migración.
- Se va a poder **vender o transferir el personaje**.
- Sale en **Steam**, tipo Kickstarter. Página con wishlist antes que campaña, y
  ninguna de las dos antes de que alguien que no sea Pedro vuelva tres días
  seguidos.

---

## 4. Los cuatro invariantes

No se negocian. Existen porque sin ellos el proyecto se convierte en otra cosa
sin que nadie lo note.

**1. `lib/world/tick.ts` nunca importa el SDK de Anthropic.**
La simulación es determinista. Si el tick usa IA, dejamos de poder distinguir
si el mundo es interesante o si el LLM lo está maquillando.

**2. `lib/world/director.ts` nunca escribe estado del mundo.**
Lee eventos, devuelve texto. Si el director puede cambiar el mundo, ya no
estamos midiendo si sabe narrarlo.

**3. Nada se afirma si no está en `events`.**
El director devuelve los ids que usó y el script los audita. Vale para los
NPCs también: pueden negarse, dudar, mentir sobre lo que sienten — no pueden
inventar que saben algo, ni prometer lo que el mundo no vaya a cumplir.

**4. Lo que pasa en el cliente llega al servidor, o no pasó.**
Ya lo rompimos entero una vez: monstruos, combate y vida que vivían sólo en la
máquina de cada jugador. Se veía como un juego y no lo era. Toda mecánica nueva
escribe en la base o es una demo.

---

## 5. La pregunta sin contestar

**¿El director de IA es divertido?**

Cuatro personas, siete días, dos preguntas: ¿vuelven al otro día sin que se lo
pidas? ¿pueden contar una historia del mundo que nadie escribió?

Hay evidencia parcial: en el tick 10 murió la vieja Ren y se llevó las dos
runas del valle. Nadie lo guionó. Falta saber si a otro le importa.

**Todo lo que construimos está apostado a que la respuesta sea que sí.** Vale
la pena tenerlo presente cada vez que se agrega algo grande.

---

## 6. Cómo se decide cuando esto no alcanza

En orden:

1. **¿Rompe un invariante?** Entonces no, y se propone otra cosa.
2. **¿Hace que el saber escaso se sienta más?** Entonces sí, casi siempre.
3. **¿Deja algo jugable esta misma noche?** Si no, se parte en algo que sí.
4. **¿Es grindeo disfrazado?** Si la mecánica se resuelve repitiendo, está mal.
5. Si sigue empatado, gana lo más chico.
