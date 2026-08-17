# Saber Escaso — las bases

Esto es lo que se decidió antes de escribir una línea de código, y es de dónde
saca criterio cualquiera que trabaje acá. **Nadie arranca una tarea sin leer
esto.** Un agente que no conoce las bases toma decisiones razonables que van
para cualquier lado, y a los tres días el juego es otro juego.

Si algo de acá se contradice con el código, es un bug del código o una decisión
que alguien tomó sin anotarla. Las dos cosas se arreglan; no se ignoran.

Si algo de acá te parece mal, discutilo. Lo que no se hace es ignorarlo en
silencio y escribir otra cosa: así es como se pierde un diseño.

---

## 0. Quién decidió qué. Leé esto antes que nada.

**Este documento mezclaba dos cosas distintas con el mismo peso, y eso hizo
perder tiempo de verdad.** Hay párrafos que son decisiones de la dirección del
proyecto y párrafos que son inferencias de quien escribió el documento, y hasta
hoy se leían igual. El resultado previsible: la dirección tuvo que venir a
corregir cosas que nunca había decidido.

El caso que lo dejó claro: acá decía *"la economía existe y no tiene plata, a
propósito"*, escrito con la misma autoridad que todo lo demás. **Nadie lo había
decidido — era una lectura de quien redactó.** La corrección fue: *"no, debe
haber economía: vender, poder tener plata de distintos tipos"*. Y no fue la
única: el sistema del saber escaso se estaba aplicando a comer, dormir y
ordeñar, cuando **es para lo que no es simple de la vida** (§8.1).

Entonces, de acá en adelante, **tres marcas y no se negocia**:

> **DECIDIDO** — lo dijo la dirección. Se cita textual cuando se puede. No se
> cambia sin que lo cambie ella.
>
> **INFERIDO** — lo dedujo quien escribe, de algo decidido. **Es una hipótesis
> de trabajo, no una regla**, y cualquiera la puede discutir con evidencia. Si
> te está bloqueando, preguntá en vez de obedecer.
>
> **MEDIDO** — sale de un número, y el número está al lado. Éstas son las más
> fuertes de las tres, porque se pueden volver a comprobar.

**La regla para el que escribe acá:** si vas a poner una regla que nadie
decidió y nadie midió, marcala **INFERIDO** o no la pongas. Una inferencia
disfrazada de decisión hace que otro la defienda, que un tercero construya
encima, y que la dirección tenga que pelear contra su propio documento.

Lo de arriba sin marca es anterior a esta convención y hay que ir marcándolo a
medida que se toca. **Ante la duda, es INFERIDO.**

---

## 1. La idea, en una frase

**Es un juego sobre necesitar a alguien.**

En casi todos los juegos tu poder es tuyo: son números que acumulás y que nadie
te puede sacar. Acá tu poder es un hecho social. Todo lo que sabés hacer te lo
enseñó alguien que eligió enseñártelo, y esa persona se puede morir. No hay
tienda, no hay recetas tiradas en un cofre, no hay wiki que te salve: **si nadie
vivo sabe forjar, en ese mundo no hay más espadas.**

El bucle no es matar, lootear, subir de nivel. Es **encontrar quién sabe,
ganarte que te lo enseñe, y después decidir si lo pasás.**

Y ahí está la tensión que lo hace funcionar: **enseñar te sube en la
consideración de todos, pero te saca lo que te hacía escaso.** No enseñar te
deja único hasta el día que te morís y te llevás algo del mundo.

> **Ojo con reducirlo.** El juego no es "sobre el saber" y nada más. Se
> aprende, sí, pero también se mejora haciendo, se construye, se pelea, se
> vive. La frase de arriba es el eje, no el inventario. Cada vez que alguien
> resume esto como "el juego del conocimiento", se pierde la mitad.

**Si tenés que entender el juego con una sola referencia, es *Frieren*.** Está
explicada en §4 y conviene leerla antes que nada: es la que está más cerca del
corazón de esto.

## 2. Qué clase de juego es. Decilo en voz alta.

**Un juego de apuestas con superficie amable.** Familia EVE Online, Ultima
Online, Albion, Rust.

Esto no es un detalle de tono, es la decisión más consecuente que se tomó. Se
consideró la salida cómoda —"lo tuyo es inviolable, lo común es disputable"— y
se descartó explícitamente: **nada es inviolable, incluido lo tuyo.** Tu
defensa no es una regla, son tus amigos y los NPCs que contrataste.

Lo que eso implica y hay que aceptar entero:

- Se juega distinto y se le vende a otra gente.
- **"Distenderse" es el tono del mundo, no la promesa de seguridad.** Podés
  pasar una hora tranquila en tu fragua; nadie te garantiza que la fragua vaya
  a estar mañana.
- El que juega bien va a arrasar al que entra una hora por semana. Eso está
  asumido, y por eso existen las capas donde nadie te puede tocar (§7.3).

**La contrapartida que lo hace tolerable:** perder no te devuelve a cero.

> Si el conocimiento vive en tu cabeza y no en tu inventario, **perder nunca te
> devuelve a cero como persona, sólo como posición.** Te quemaron el pueblo,
> perdiste la casa y los guardias — seguís sabiendo forjar y seguís conociendo
> las runas. Rearmarte es rápido porque sabés cómo.

Esa garantía es lo que separa este diseño de un survival que expulsa gente.
**No la negocies.** Cualquier mecánica que te haga perder saber al morir rompe
el juego entero.

## 3. Por qué existe

Se buscó un juego con fantasía + vista de arriba + casa/aldea + otros jugadores
reales + PvE con historia y mazmorras + algo regenerativo + PvP opcional +
entrar una hora y disfrutar. **Casi no existe redondo.** Los que se acercan o
son MMOs de grindeo, o son coop cerrado (Baldur's Gate), o prometieron el mundo
y no entregaron (Ashes of Creation).

Y lo que no hace nadie: **el conocimiento como economía del mundo.** En todos
los juegos el saber está en una wiki — es infinito, gratis e imperdible. Acá es
escaso, vive en personas concretas y se pierde.

El antídoto contra Ashes es el orden: **cada tramo tiene que dejar algo jugable
esa misma noche.**

---

## 4. El tono del mundo

### Frieren es la referencia central

*Sousou no Frieren* — la elfa maga que sobrevive a toda su compañía. **Es la
referencia más cercana al corazón de este juego**, y durante meses estuvo mal
anotada. No es una más de la lista.

Por qué encaja tanto:

- **Frieren sobrevive a todos.** Su compañía se muere y ella sigue. Es
  exactamente *"el conocimiento vive en gente que se muere"*, contado desde el
  lado del que se queda. Nuestro jugador está en esa posición cada vez que
  vuelve y falta alguien.
- **Colecciona hechizos de gente mortal, y muchos son inútiles.** Un hechizo
  para encontrar flores de campo. **Lo que los hace valiosos no es el poder: es
  de quién los recibió.** Eso es literalmente lo que tienen que hacer
  `objects.made_by` y de quién aprendiste cada saber — el objeto y la técnica
  arrastran el nombre del que ya no está. Un cuchillo que dice "lo hizo Ilde"
  veinte días después de que Ilde no está es el juego entero en una línea.
- **El tema es el tiempo y la pérdida, contados sin solemnidad.** Melancólico y
  a la vez liviano, con humor. Es un mundo con historia enorme y pérdida real
  recorrido **a paso de viaje tranquilo**.
- **El viaje es una ruta entre pueblos con distancias que se sienten**,
  encontrándose con gente y con lo que quedó de lo que hicieron hace ochenta
  años. Es la justificación narrativa de §7.2: si viajar fuera instantáneo,
  este tono no existe.

Frieren resuelve una tensión que teníamos sin nombre: **cómo puede un juego con
Malazan de fondo ser también un lugar donde te quedás en tu granja
construyendo.** La respuesta es que se puede, y Frieren es la prueba.

> **Lo que Frieren NO aporta: la ausencia de riesgo.** Esto no es un juego
> cozy. Sigue siendo un juego de apuestas con superficie amable (§2): full
> loot, nada inviolable, se puede perder. **Frieren da el tono y la relación
> con el tiempo y la memoria, no la seguridad.**
>
> No promedies las dos cosas. Conviven así: **el ritmo y la mirada son de
> Frieren; las consecuencias son de EVE.** Caminás tranquilo entre pueblos
> juntando hechizos menores de gente que se va a morir — y si te agarran mal
> parado, perdés el pueblo.

### Malazan, Abercrombie y Poniente: el fondo

Fuerzas enormes, ninguna moral clara, historia vieja que pesa, personajes con
intereses en vez de bandos. Y a la vez tiene que haber lugar para **la aventura
de camaradas tipo El Señor de los Anillos** — salir con tus amigos a un lugar
donde no estuvieron.

Parece contradictorio y no lo es, porque **operan en escalas distintas**:

- **El mundo es Malazan.** Grande, viejo, indiferente. Los dioses y los
  dragones son clima, no villanos. Pasan cosas cuya causa está fuera de cuadro
  y que nadie te va a explicar del todo.
- **La partida es la Comunidad del Anillo.** Cuatro personas cruzando un
  territorio que les queda grande, cuidándose entre ellas.
- **Y la mirada es de Frieren.** Lo que hace que un mundo así no aplaste: se
  recorre despacio, y lo que te llevás son las personas.

Malazan es exactamente la estructura que una simulación puede sostener:
**historia enorme y fuera de cuadro**, insinuada por rastros y rumores. Lo que
la simulación no puede sostener es Abercrombie puro — su fuerza es la voz
sostenida de un narrador, y ahí los modelos de lenguaje se aplanan solos. Por
eso: **Malazan como estructura, Abercrombie como criterio moral**, y la voz
sostenida sólo en lo poco que se escriba a mano.

Reglas de tono que salen de ahí:

- **La ambigüedad es gratis.** Un mundo con facciones, saber escaso y gente que
  extrae no tiene bando bueno por construcción. No hay que escribir la grisura
  moral: es la salida por defecto de la simulación.
- **La compasión es el único ancla** (eso es Malazan, y es Frieren). Si todo es
  cínico, no duele nada.
- **La historia vieja pesa.** Ruinas que arruinaron a alguien, deudas
  heredadas, oficios que ya no están. Nunca decoración medieval genérica.

### El mix, dicho por la dirección del proyecto

> *"Frieren, las aventuras de la elfa. Y tener en cuenta juegos que te dije
> como Minecraft, Stardew Valley, misiones como las de Red Dead Redemption o
> Baldur's, esos personajes, vistas, es un mix de todo."*

Es la formulación más corta de todo el diseño y conviene tenerla a mano:

| De dónde | Qué se toma |
|---|---|
| **Frieren** | El tono, el tiempo, la pérdida, el viaje entre pueblos |
| **Minecraft / Stardew Valley** | La vista, y quedarse a construir como forma legítima de jugar |
| **Red Dead Redemption** | Cómo se sienten las misiones: el mundo no te espera |
| **Baldur's Gate** | Los personajes y la cámara |

## 5. Las tres formas de jugar, y las tres valen lo mismo

Hay tres maneras de pasar una tarde acá, y **ninguna es un modo secundario**:

1. **Irte de aventura.** Cruzar distancias, llegar a un pueblo que no conocías,
   buscar a alguien que sepa algo que en tu valle se perdió.
2. **Pelear con amigos.** Mazmorras, monstruos, otra gente, disputar un lugar.
3. **Quedarte en tu granja.** Construir, forjar, destilar, enseñar, y crecer
   hasta ser el dueño del lugar.

**El granjero no es un jugador de segunda.** Esto no es una concesión, es
estructural por dos razones:

- **Es la capa donde nadie te puede tocar.** Combate por habilidad más apuestas
  altas expulsa a todo el que no pelea bien. Herrería, cocina, destilación,
  construcción y enseñanza son lo que hace que haya más de un tipo de persona
  adentro — **y esa gente le da de comer a la que pelea.** Sin ellos el juego
  se queda con veinte personas que se matan entre sí.
- **La tierra se tiene poblándola** (§10.1). El que se queda y puebla un lugar
  gana el lugar. Es la única forma legítima de "hacer mío el mundo", y es
  exactamente lo que hace el granjero.

Regla de diseño: **toda feature grande tiene que contestar qué le da a las tres.**
Si una mazmorra sólo le sirve al que pelea, falta la mitad.

---

## 6. Vista, control y presencia

### Cámara
- **Tercera persona lejana, isométrica o casi.** Stardew, Minecraft, Baldur's
  Gate. **Nunca primera persona.** Nunca ese 3D plano de asset store.
- **3D con órbita restringida. Lejos por defecto, zoom con piso y techo.**
- **El piso de zoom está decidido** (17 de agosto de 2026): la cámara se acerca
  **hasta leer silueta, postura y ropa. Nunca hasta leer una expresión.**
  > Es la decisión que fija el presupuesto de arte de todo el proyecto, así que
  > conviene decir qué implica en voz alta: **no hacen falta caras modeladas ni
  > animación facial.** Todo el presupuesto va a **silueta, valor y color**, que
  > es lo que se lee a la distancia de la cámara. Un ojo humano a 27 metros mide
  > dos píxeles: modelarlo es gastar en ruido.
  >
  > Estuvo abierta desde el principio y tenía una rama entera parada esperándola.
  > Se cerró con la recomendación que ya estaba escrita acá, aplicando la regla
  > de la casa: **lo que no se rechazó se da por aceptado.** Si en dos meses hay
  > que moverla, es una constante y unas texturas — el costo de no decidir era
  > más alto que el de decidir mal.
- Los primeros planos son **un modo aparte**, no una posición libre de cámara.
- La distancia lejana no es una preferencia estética: es lo que hace legible el
  trabajo del director y lo que mantiene viable mobile alguna vez.
- El entorno tiene que encantar. **La luz hace ese trabajo, no los polígonos.**

### Dirección de arte: estilizado, y comprometido

**Decidido el 17 de agosto de 2026.** El juego es **estilizado**, con todas las
letras. No es una concesión al rendimiento ni un paso intermedio hacia algo más
realista: es la dirección.

El motivo no es el peso. El peso ya se atacó por otro lado —tres niveles de
calidad, el terreno remuestreado, el pasto en baldosas— y no era el problema.
El motivo es éste, y hay que dejarlo escrito porque es la frase que impide que
la decisión se erosione:

> **Hoy el juego no es realista ni estilizado: es indeciso, y eso es
> exactamente lo que se lee como Playmobil.** Playmobil no se ve mal por ser
> estilizado. Se ve mal por ser **plástico de color plano bajo una luz que
> pretende ser real**. Minecraft y Stardew son mucho más simples que esto y no
> se ven baratos, porque están comprometidos con una decisión. Lo que se lee
> como barato no es la simpleza: es la indecisión.

Y encaja con la referencia central que ya está en §4: **Frieren es plano y
cálido, y no por eso se siente pobre.**

Las tres consecuencias, que son lo que usa quien trabaja:

1. **El color es una decisión de diseño, no una aproximación a lo real.** Un
   techo no es marrón porque la teja sea marrona: es el valor y el matiz que
   necesita para separarse del pasto y de la montaña a veinte metros. **Eso le
   da a la paleta autoridad sobre todo lo demás** — si un color "correcto" no
   separa, el correcto está mal.
2. **La silueta hace el trabajo pesado**, que además es lo único que se lee a la
   distancia a la que se juega. Es la misma decisión que el piso de zoom:
   silueta, postura y ropa, nunca la expresión.
3. **Es más barato de hacer y de correr.** No es una concesión: es la misma
   dirección vista desde el costo.

Esto vale para las cuatro ramas de arte —paleta, vegetación, arquitectura y
cuerpos— y **las cuatro tienen que trabajar con el mismo criterio o se rompe**.
Una rama que apunta a lo real mientras las otras tres estilizan reproduce la
indecisión que esta decisión existe para terminar.

**Y hay mallas hechas por una persona, no sólo geometría generada por código.**
Decidido el 17 de agosto, después de *"parece un juego choto"*: la geometría
primitiva por código tiene un techo y ya se había tocado — **el pasto eran conos
verdes porque eran conos verdes.** Entraron 80 mallas CC0 de Kenney.

> **Un solo autor, y es la parte que no se negocia.** Mezclar packs de artistas
> distintos se ve **peor** que las cajas, porque **la incoherencia se lee como
> error y lo simple se lee como decisión.** Es la misma regla que la paleta,
> aplicada a la geometría: lo que hace que un mundo se vea diseñado no es que
> cada pieza sea linda, es que todas salgan de la misma cabeza.

Lo que **no** cambia con esto: las piezas se **arman**, no se repiten. Las siete
casas de la aldea son combinaciones distintas de los mismos módulos, sorteadas
con semilla por lugar para que Vado Bajo sea el mismo en la pantalla de todos.
Es §10.1 —*por partes, no por vóxeles*— con piezas de verdad en vez de cubos.

Y el criterio para sumar assets nuevos, que sale de lo mismo: **del mismo autor,
CC0, y con la procedencia archivada** (`assets/PROCEDENCIA.md`, con URL y md5 de
cada zip). Un pack de otro artista no es un atajo, es empezar de nuevo.

#### La corrección del 18 de agosto: la regla del autor único es POR CATEGORÍA

La frase de arriba se escribió cuando había un solo pack y hay que corregirla,
porque tal cual está mandó a defender una casa que la dirección del proyecto ya
había rechazado dos veces: ***"parece un mundo de Disney para mujeres"***.

Lo que se descubrió al mirar el A/B en `escenas/prueba_casas.tscn` es que el
problema de esa casa **no era el color** —la aduana de `paleta.gd` ya le había
bajado los techos de luma 145 a 33— sino la geometría: **el muro del Fantasy
Town Kit tiene la ventana pintada sobre una cara plana.** No hay hueco, no hay
jamba, no hay espesor. Ninguna cantidad de paleta arregla un agujero dibujado, y
sostener el pack por coherencia de autor era sostener el defecto.

Así que **la arquitectura del valle se mudó al Medieval Village MegaKit de
Quaternius** (CC0, misma procedencia archivada) y la regla queda dicha bien:

> **Un solo autor POR CATEGORÍA, y adentro de cada categoría un solo kit.**
> Arquitectura: Quaternius. Vegetación y enseres: Kenney. Bichos: Quaternius.
> Lo que se lee como error no es que dos packs convivan en un mapa de 360
> metros: es que dos packs compitan **en la misma pieza** —una rueda de molino
> de un autor pegada a una pared del otro— o que convivan **con dos paletas**.
> Lo segundo ya está resuelto y es lo que hace que esto se banque: los dos
> autores pasan por `Paleta.domar_material()` y salen en la misma escalera de
> valores y bajo el mismo techo de saturación.

Y la regla que decide cuándo se cambia de kit, que es la que faltaba: **se
cambia cuando la geometría no puede hacer el trabajo, nunca por gusto.** Kenney
se queda con el bosque porque un pino suyo son 54 triángulos y el más barato del
otro son 1.576, y con 2.500 árboles eso es la diferencia entre un valle y una
presentación. Es aritmética en los dos casos, no preferencia.

### La ficha de identidad. Cinco reglas, y alcanzan.

**Escrita el 18 de agosto de 2026**, porque hasta acá el criterio existía pero
estaba disperso en ocho archivos y cada agente nuevo lo reconstruía a mano —o
no—. Esto es lo que hay que saber para poner un color, una malla o una luz en
este juego **sin preguntarle a nadie**. Todo lo de abajo está medido sobre
capturas del juego real; los números viven en `paleta.gd` y `ambiente.gd`.

La coordenada que faltaba la puso la dirección del proyecto comparando juegos:
**Hytale, Light No Fire y Enshrouded**, y la frase que los resume es
***"más caricaturesco pero tipo real"***. Eso **no reabre** la decisión de
"estilizado y comprometido" de más arriba: la **afina**. Lo que esos tres tienen
en común no es que sean complejos, es que son **estilizados con materia**.

> **El valle es un prado de fin de verano en un cuenco de montaña, visto desde
> arriba y de lejos, a la luz de una hora concreta que manda el servidor.**
> Formas simples y pocas. Materiales creíbles y gastados. Paleta corta, apagada
> y sucia, con todo el color guardado para el fuego. Y aire entre las cosas.

**1. LA ESCALERA DE VALOR MANDA, Y ES UNA SOLA.** Nueve peldaños, de `V0` tinta
a `V8` cal, en `paleta.gd`. Antes de elegir un matiz se elige el peldaño, y el
peldaño se elige por el TRABAJO que la cosa hace en el cuadro, no por a qué se
parece en la vida. El lienzo es el suelo (**V4–V5**); lo construido va arriba
(aldea V6); lo vegetal y las tapas van abajo (copas y techos V2). *Un pueblo se
ve porque es una mancha clara; una casa se ve porque es una caja clara con una
tapa oscura.* Si el color "correcto" no separa, el correcto está mal.

**2. NADA ES LISO. TODO ESTÁ USADO.** Es la regla nueva y es la que faltaba. Una
superficie grande sin variación por debajo de los 32 píxeles no es un material,
es vinilo — medido: el suelo del valle tenía **0,03 de desviación de luma por
bloque de 4 píxeles** y era el 45% de la pantalla. Toda superficie grande lleva
grano (`Paleta.grano()`, ruido triplanar en coordenadas de mundo, que multiplica
el albedo). Todo objeto repetido lleva variación **por instancia**, y esa
variación es un multiplicador de VALOR y nunca de matiz. Y lo que tiene historia
la muestra: la Casa Quemada se quema de verdad, la piedra tiene musgo, la madera
está gris. **Un mundo nuevo se lee como maqueta.**

**3. LA SATURACIÓN ES UN PRESUPUESTO Y SE GASTA EN EL FUEGO.** Techo duro:
**S ≤ 0,35 en cualquier superficie que se mida en metros cuadrados** y S ≤ 0,50
en los tintes de gente. Hay exactamente **tres excepciones y tienen nombre**: el
fuego (brasas, ventanas encendidas, luciérnagas, faroles), el jade —que le
pertenece al jugador y a nadie más— y la herrumbre, que es el peligro. Si
aparece una cuarta es un error, no una decisión. *Un valle apagado con seis
puntos naranjas es melancólico; un valle saturado con seis puntos naranjas es
una juguetería.*

**4. LA SILUETA Y LA LUZ HACEN EL TRABAJO; LA GEOMETRÍA NO.** A la distancia a
la que se juega (27–68 m) un ojo humano mide dos píxeles y una hoja no existe.
Lo que se lee es el contorno contra el fondo y de qué valor es cada mancha. Por
eso **menos geometría, no más**, y por eso el presupuesto entero va a silueta,
valor y color. Un detalle que no se distingue a veinte metros no existe: no se
modela, se sugiere con una mancha.

**5. HAY AIRE ENTRE LAS COSAS, Y EL AIRE TIENE HORA.** La perspectiva aérea es
cómo el ojo mide que algo está lejos, o sea que es grande, y es la mitad de la
identidad de las referencias. Lo lejano pierde contraste y se va al color del
cielo: 3% de bruma a 100 m, 27% a 250, 53% en la cordillera. **Y el color del
aire y de la luz los manda el reloj del valle, que es del servidor.** Al mediodía
el valle es apagado y verde oliva; al ocaso es una silueta contra un cielo
naranja; de noche es negro con seis ventanas encendidas. **Es el mismo lugar y
son tres cuadros distintos, y eso es a propósito** — una sesión de una hora
atraviesa medio día del valle.

#### Y las tres cosas que NO se hacen

- **No se sube el detalle para que se vea menos rústico.** Es el camino
  equivocado y ya se recorrió.
- **No se mezcla realismo con estilización en la misma pieza.** La indecisión es
  lo que se lee como Playmobil, no la simpleza.
- **No se inventa un color afuera de `paleta.gd`.** Ni en GDScript, ni en un
  `uniform` de shader, ni "sólo esta vez". Un color suelto es deuda, y el
  archivo tiene fábricas de material justamente para que nadie tenga excusa.

#### Un corolario de la regla 1 que costó dos rondas: **una textura tampoco elige su peldaño**

Cuando entra un pack CON textura, la tentación es darlo por bueno —"ya viene
domado"— y es falso. Los siete trim sheets del MegaKit se hornearon a disco con
la saturación al techo y **con el valor comprimido al mismo medio tono**:
medidos sobre los PNG del repo, `T_Plaster` da V 0,574 y **`T_RoundTiles`, que
es la TEJA, da V 0,585**. O sea que el techo entraba al valle en el peldaño de
un muro, y una casa dejaba de ser *caja clara con tapa oscura* para ser una sola
mancha del color del suelo. Medido en pantalla antes de corregirlo: techo 75
contra muro 117, cuando Kenney daba 48 contra 131.

Se arregla donde se arreglan los colores y no tocando el binario: `albedo_color`
multiplica al trim sheet, así que **un multiplicador por material lleva la
textura a su peldaño sin perderle el grano** (`Paleta.KIT_QUATERNIUS`). La regla
general que sale de ahí:

> **Una textura aporta la MATERIA. El peldaño lo sigue eligiendo `paleta.gd`.**
> Un pack texturado no está domado hasta que alguien midió su valor medio.

### Control
- La habilidad es del jugador con teclado y mouse. **No** veinte mil hechizos
  en barras tipo Diablo 2.
- El principio tiene nombre: **vocabulario chico, combinatoria profunda.**
  Diablo 2 tiene el vocabulario ancho y la ejecución chata: cien habilidades y
  cada una es apretar un botón. Magicka tiene ocho elementos y de ahí sale
  todo — **no hay lista de hechizos, hay gramática.**
- Magia por comandos y gestos; oficios por práctica real.
- **Aprende el jugador, no el personaje.** Lo que sabés hacer lo sabés para
  siempre, en cualquier personaje, aunque borres la partida.

### Descubribilidad — el riesgo que hunde a los juegos de runas
Arx Fatalis es amadísimo y de nicho justamente por esto: si el jugador no sabe
qué hacer, se va en veinte minutos. La solución ya está en el diseño: **los
NPCs enseñan**, más **un grimorio personal que registra sólo lo que
aprendiste**.

> **Nunca un menú con todo.** El menú completo convierte el saber en
> información y mata el sistema entero.

---

## 7. El mundo

### 7.1 Forma
- **Shared-shard, no MMO.** **8 a 20 personas por región.** El mundo vive 24/7;
  vos entrás y salís.
- **Online y persistente.** Cliente que se baja, mundo que corre en servidor.
  No hay modo offline en el diseño base: la persistencia y la otra gente *son*
  el juego. Un mundo privado de un solo jugador es posible después y sale casi
  gratis — es el mismo proceso.
- **El mundo vive sin vos.** Los NPCs avanzan con sus propias historias
  mientras no estás. Cuando volvés, encontrás otra cosa.

### 7.2 Topología, distancias y pueblos

**Regiones contiguas con transición en el borde. Nunca costura sin cortes.**

Esto es una decisión de arquitectura tomada a conciencia, no una limitación:

> Costura sin cortes es *server meshing*. Star Citizen lleva una década y
> cientos de millones en eso. Una pantalla o un portal al cruzar te da **el 95%
> de la sensación de universo conectado por el 5% del costo.**
>
> **No la sueltes. Cada vez que alguien te diga "estaría bueno que sea sin
> cortes", acordate de Star Citizen.**

Podés viajar a la región de otro jugador: quedarte, construir, y en el límite
hacerla tuya. **No es invasión, es que todo está conectado.**

**La distancia tiene que sentirse. Es diseño, no un detalle de implementación.**
Si viajar es instantáneo, los pueblos dejan de ser lugares y pasan a ser
pestañas de un menú. Y peor: se cae la mitad del juego, porque **la escasez del
saber depende de que ir a buscarlo cueste algo**. Un mundo con teletransporte
libre es un mundo donde ningún oficio es local.

Consecuencias prácticas:
- Cruzar un borde es un acto, con su transición y su costo.
- Que un pueblo esté lejos es información sobre ese pueblo.
- **La reputación viaja mal justamente porque las distancias son reales**
  (§9.3). Si viajar fuera gratis, el rumor viajaría gratis y no habría segunda
  oportunidad en ningún lado.

### 7.3 El tiempo
- **Normal con gente conectada, cuatro veces más lento vacío.** No se pausa: se
  ralentiza.
- Son **dos relojes distintos**: el del servidor (cuánto simulás) puede ir
  lento y es una decisión de costos; el del mundo (cuánto *pasó*) debería
  depender del tiempo real transcurrido. Así nadie gana por estar sentado ahí.
  *Ver §16: hoy el código frena el mundo, no sólo el gasto.*
- **El sol es el reloj del mundo.** Un tick es un día y el cron corre uno por
  seis horas, así que **seis horas reales son un día del valle** y una vuelta
  entera del sol.
  **La hora la manda el servidor**, no la máquina de cada uno: dos personas
  conectadas ven el mismo atardecer, y tu sesión de una hora tiene forma sola.
- **La fase de la luna dice qué día va el valle.** Ocho días por vuelta. Mirás
  para arriba y sabés cuánto hace que no entrás, sin abrir ningún menú.

### 7.4 Cómo crece el mundo

**Procedural, pero abierto por presión de población.** Puede haber zonas
oscuras y raras. Ninguna se siente vacía, salvo donde el vacío sea el punto.

Y hay que entender por qué lo procedural suele fallar, porque el diagnóstico da
la solución. No Man's Sky en su lanzamiento es el caso de manual; Minecraft es
infinito y famosamente vacío pasadas las primeras horas. **No se sienten vacíos
porque no haya nada: casi siempre hay de más.** Se sienten vacíos porque nada
de eso es específico. Lo procedural es estadísticamente variado y
semánticamente idéntico — la cueva número 40 es la número 1 con otro ruido.

> **No se genera terreno, se genera historia.**
>
> El trabajo del generador no es hacer colinas: es producir **un lugar que ya
> venga con gente adentro**, con lo que esa gente sabe, con lo que pasó ahí y
> con lo que perdieron. Un sitio no es interesante por sus rocas, es
> interesante porque ahí vive alguien que sabe algo.

Y tiene una propiedad buenísima: **es verificable por sistema.** Si una región
sale del generador sin nadie que sepa nada, salió mal y el generador lo puede
detectar solo. Eso es un test automático sobre la calidad del mundo.

**El mundo se abre donde la gente empuja, nunca por adelantado.** Nada de diez
mil regiones esperando visita: eso es el costo y el vacío al mismo tiempo. La
frontera se corre cuando hay población que la sostenga.

**La ley de densidad**

| Qué | Cómo se genera | Tamaño |
|---|---|---|
| Terreno salvaje | Procedural y barato. Puede ser grande sin culpa. | Libre |
| Lugares habitados | Sólo bajo presión de población. Vienen con gente, saber e historia. | Acotado por cuánta gente hay |
| Zonas oscuras y raras | Autoradas o semiautoradas. Densas en rareza, no dispersas. | **Chicas** |
| Desierto, páramo, mar | Vacío declarado. El vacío *es* el contenido. | Grande, a propósito |

De ahí sale la ley: **el vacío tiene que ser intencional y estar señalado.** Un
desierto que está vacío y lo anuncia es atmósfera y da miedo. Un pueblo que
está vacío es un error que se siente en el cuerpo. Lo que arruina un mundo no
es la falta de cosas — es **el vacío disfrazado de contenido**: la aldea sin
nadie, la mazmorra sin motivo, la ruina que no arruinó a nadie.

**La rareza es cara por metro cuadrado**, así que cuanto más extraña sea una
zona, más chica tiene que ser. Una región enorme y rarísima termina siendo, en
la práctica, mucho caminar.

*Nota del valle actual:* la cordillera tiene **una sola abertura, al norte**,
por donde entra El Camino del Norte. Un valle que se termina en niebla es un
nivel; cercado con una salida es un lugar. **Cuando el mundo crezca, crece por
ahí.**

---

## 8. El saber, los oficios y la progresión

Es el corazón del sistema y es lo más fácil de entender mal. Son **cuatro cosas
distintas** que todos los juegos mezclan.

### 8.1 El saber — se aprende de una persona
- **Cualquiera puede aprender cualquier cosa.** Un mago que quiere ser herrero
  se pone a martillar y aprende, completo, para siempre. **No hay clases, no
  hay puertas cerradas.**
- El saber se aprende de una persona, se enseña a una persona, y **se pierde
  con la última persona que lo tenía**.
- **Un objeto sólo existe si alguien sabe hacerlo.** No hay tienda y no hay
  drops de la nada. La receta es parte de lo que alguien sabe.
- **El conocimiento es ilimitado.** Podés juntar cincuenta runas a lo largo de
  años. Eso es coleccionar, viajar, buscar maestros, que se te muera uno antes
  de enseñarte.

#### Qué entra al saber escaso y qué no. Ésta es la corrección que faltaba.

La dirección del proyecto lo dijo así, y corrige una lectura que se estaba
aplicando de más:

> *"Pensá en juegos normales. Lo del saber es para aprender cosas y transmitir
> cosas **no simples de la vida**. A comer y a leer se aprende solo. Cosas
> mágicas, o de trabajo especiales, o pociones raras."*

Tiene razón, y el error era mío: **estaba metiendo todo adentro del sistema.**
Si cada cosa que se puede hacer necesita que alguien te la enseñe primero, el
mundo se siente cerrado con llave — llegás y no podés hacer NADA, ni lo obvio.
Eso no es escasez, es una pared. Y encima es falso: nadie necesita un maestro
para agacharse a juntar una raíz o para revolver una olla.

Entonces el mundo tiene **dos niveles**, y sólo el segundo es el juego:

**Lo corriente. Nadie lo enseña, todos lo pueden hacer.** Comer, dormir,
caminar, juntar lo que crece, cargar cosas, cocinar algo simple, ordeñar,
encender un fuego. **No lleva fila en `knows` y no se pierde nunca.** Es lo que
hace que el valle se pueda habitar el primer día, y su función es exactamente
ésa: que llegues sin nada y aun así tengas algo que hacer con las manos.

**Lo escaso. Vive en una persona y se muere con ella.** La magia, los oficios
de verdad y las cosas raras: templar un filo en agua corriente, las cuatro
runas, un destilado que no es un caldo. Esto sí lleva fila en `knows`, sí
necesita que alguien te lo enseñe, y sí desaparece del mundo con el último que
lo sabía.

**Y hay un escalón en el medio, que es el que faltaba. DECIDIDO:**

> *"Y aprendés cosas también haciéndolas: agarro un hacha y corto un árbol,
> aprendés. Armo una pared, armo muebles, etc. **Las cosas más complejas, o
> cómo hacerlas mejor, se transmite.**"*

Entonces son tres niveles y no dos, y el del medio es el que abre el mundo:

| | cómo lo conseguís | se pierde con el que se muere |
|---|---|---|
| **corriente** | ya lo sabés | nunca |
| **aprendido haciendo** | agarrás la herramienta y lo hacés | no |
| **transmitido** | alguien te lo enseña | **sí** |

**Lo aprendido haciendo** es cortar un árbol con un hacha, levantar una pared,
armar un mueble. Nadie te lo enseña: lo hacés mal la primera vez y algo queda.
**Esto sí lleva fila en `knows`** —a diferencia de lo corriente— porque es un
saber de verdad y tiene destreza; lo que no tiene es maestro.

**Y lo que se transmite son dos cosas distintas**, y la segunda es la que casi
se nos escapa:

1. **Lo que no vas a descubrir solo**: las cuatro runas, templar en agua
   corriente. Podés martillar diez años y no te sale.
2. **Cómo hacer MEJOR lo que ya sabés hacer.** Ésta es la que la dirección puso
   al final de la frase y es la más interesante: no te enseñan a cortar leña
   —eso lo aprendiste solo—, te enseñan a cortarla bien.

> **INFERIDO, y hay que probarlo antes de darlo por bueno:** que eso se
> mecanice con un **techo de destreza**. Lo que aprendés solo llega hasta cierto
> punto y se estanca; lo que te enseñan levanta el techo. Encaja con lo que ya
> existe —`knows.destreza`, `knows.veces` y los rendimientos decrecientes de
> `mejora()`— y con la tesis: **el autodidacta entra al oficio y nunca es
> bueno.** Necesitás a alguien igual, sólo que más tarde y para otra cosa.
>
> El riesgo de esta lectura es convertir la enseñanza en una mejora de
> estadística, que es justo lo que §8.2b prohíbe. Si al implementarlo lo único
> que cambia es un número, está mal hecho.

**La prueba para saber de qué lado va algo:** *¿lo sabría hacer cualquiera que
haya vivido acá un año?* → corriente. *¿Lo aprendería solo el que agarra la
herramienta y prueba?* → aprendido haciendo. *¿Hace falta que alguien te lo
muestre, y que quiera?* → transmitido.

> **Y hay algo que revisar con esto puesto: `Cuajado de leche` está del lado
> equivocado.** Entró como un saber que enseña Sarn, y ordeñar una vaca es
> justamente el ejemplo de lo corriente. Lo que sí puede ser escaso es lo que se
> HACE con la leche, si alguna vez es algo más que un cuenco. Queda anotado para
> la rama de economía; no se toca sin medir qué se lleva puesto, porque hoy es
> lo único que hace que Sarn tenga algo que enseñar.

### 8.2 Las dos formas de conseguirlo, y son opuestas

| | Aprender | Absorber |
|---|---|---|
| Velocidad | Lento | Rápido |
| Qué pide | Una relación, tiempo, permiso | Un artefacto, un pacto, un cadáver |
| Al terminar | **Dos personas saben** | **Sigue habiendo una, y sos vos** |
| Efecto | El saber se multiplica | El saber se concentra |

> **La tensión que sostiene el mundo.** Matar al único herrero de la región
> para absorberle el oficio te da la técnica **y le saca la herrería al
> pueblo**. Ganás vos, pierde el lugar. Nadie te lo prohíbe — pero los NPCs
> recuerdan, y una región sin quien enseñe se empobrece de verdad, no
> metafóricamente.

Ahí está lo regenerativo **como sistema en lugar de como tema**: cuidar el
saber común contra extraerlo, decidido por cada jugador, muchas veces, sin que
el juego opine.

**Absorber te da el conocimiento, no la reputación.** Sabés forjar, pero el
pueblo no te acepta como herrero hasta que hayas hecho el trabajo. El atajo
existe y tiene precio social.

*En la base esto ya es dato:* `knows.how` = `aprendido` / `absorbido` / `origen`.

**Matiz sobre "no hay recetas escritas":** hay dos excepciones y son a
propósito. Absorber de un artefacto o un cadáver es saber sin maestro, y **una
runa escrita en lengua muerta** es saber que está ahí y nadie puede leer
(§12.3). Lo que no existe es la receta genérica que se roba de un cofre y
funciona.

### 8.2b El saber es la puerta, no el juego

Corrección importante, y la hizo la dirección del proyecto cuando el documento
ya estaba escrito:

> *"No es sólo el saber. El saber es aprender cosas, pero después hay que
> ponerlas en práctica: construir, hacer casas, cocinar, viajar, ir a mazmorras
> y matar bosses, guerras de magia."*

El documento venía diciendo que el corazón del juego es la economía del
conocimiento, y eso es cierto **como motor**: es lo que hace que la gente
importe, que morirse cueste, que enseñar sea una decisión. Pero un motor no es
un juego. **Aprender a forjar no vale nada si después no hay nada que forjar,
para nadie, en ningún lado.**

Entonces la forma correcta de decirlo es:

> El saber es **lo que te habilita**. Lo que hacés con él es el juego.

Y de ahí sale una prueba que conviene aplicarle a cada saber nuevo antes de
agregarlo: **¿qué te deja hacer que antes no podías?** Si la respuesta es "sube
un número" o "aparece en tu ficha", el saber no está terminado. Ya pasó una vez
en este proyecto y se lo anotó con estas palabras: *"aprendés a forjar y
después no podés forjar nada"* — el saber era el corazón del juego y no hacía
nada.

La lista de lo que hay que poder hacer, que es la que ordena el trabajo:
construir y hacer casas, cocinar, viajar, entrar a mazmorras y enfrentar algo
grande al fondo, y pelear con magia. **Nada de eso sale del saber solo: el
saber es lo que te deja empezar.**

#### El motor no se muestra

La dirección del proyecto volvió sobre esto después de jugarlo, y la segunda
vez fue más precisa que la primera:

> *"El saber es la base del juego pero no puede decir en todo lado 'lo que
> sabes', 'lo que sé'. Parece un juego de 'lo que sé'. Eso es experiencia y es
> base, pero para que vaya de fondo. Tienen que haber quest. Entrás, y ¿quién
> sos? ¿Qué es el mundo? Deberías ir aprendiendo, que haya eventos, temas."*

Tiene razón y el error es de la interfaz, no del diseño. Contá las veces que la
palabra aparece en pantalla: *"LO QUE SABES HACER"*, *"Sabes Destilado de
raíz"*, *"Lo que sabes se lo puedes enseñar"*, *"No perdiste lo que sabes"*.
**La pantalla está narrando el mecanismo en vez del mundo.**

Es el mismo error que sería poner "PUNTOS DE EXPERIENCIA: 340" en el medio de
una escena. Un motor bien hecho se siente y no se nombra:

> **Regla: la interfaz nombra la COSA, no el mecanismo que la sostiene.**
> No *"sabes Destilado de raíz"* sino *"Destilado de raíz — de la raíz sale un
> frasco, y el frasco cura"*. No *"lo que sabes hacer"* sino *"tu oficio"*. El
> jugador tiene que poder jugar meses sin aprender nunca la palabra con la que
> nosotros lo llamamos por dentro.

Y las tres cosas que el reclamo pide poner **en primer plano**, en el lugar que
hoy ocupa el vocabulario del motor:

1. **Quién sos.** Hoy entrás y sos un nombre sin nada. Llegaste por El Camino
   del Norte y no sabés hacer nada — eso es un comienzo, pero hay que contarlo
   como comienzo y no como carencia.
2. **Qué es este mundo.** El valle ya TIENE pasado escrito en la base —un
   incendio con dos versiones irreconciliables, dos pueblos que no son humanos
   y un agravio concreto— y hoy sólo se llega a eso por casualidad, hablando.
3. **Algo que perseguir, que se pueda nombrar.** Los encargos existen y
   funcionan; lo que falta es que se lean como un hilo y no como un botón que
   apareció. Y que pasen cosas: eventos con nombre, que empiecen y terminen.

**Cuidado con la lectura fácil de esto.** No pide un diario de misiones con
marcadores ni una barra de experiencia: pide que lo que el jugador ve sea el
mundo, y que el motor quede abajo haciendo su trabajo. El día que la ficha diga
*"Odila te enseñó a destilar el invierno pasado"* en vez de *"sabes Destilado
de raíz — te lo enseñó Odila"*, esta sección está cumplida.

### 8.2c Lo que llevás puesto

Pedido de la dirección del proyecto, textual:

> *"El inventario debería abrir y ver lo que llevo, lo que lleva mi personaje,
> agregarle cosas: protección, armadura, vestimentas, guantes, cascos, todo.
> Atributos. Falta todo y estamos lejanos."*

Hoy no existe **nada** de eso: todo lo fabricable del mundo es un arma, un
frasco, un cuenco o un mapa, y no hay una sola cosa que se pueda llevar puesta.
Es un hueco real. Pero hay una forma de llenarlo que encaja con este juego y
varias que lo rompen, así que va escrito antes de que alguien lo construya.

**1. Una pieza de armadura existe sólo si alguien vivo sabe hacerla.** Es la
misma regla que sostiene todo lo demás y no tiene excepción: no hay cascos que
aparezcan, ni cofres con botín, ni un vendedor. Alguien tiene que saber curtir,
tejer o forjar, y **si el último que sabía se muere sin enseñar, en este valle
no se fabrica una coraza nunca más y las que quedan son las que hay.** Eso
convierte cada pieza vieja en un objeto con historia y con el nombre de su
autor puesto — que es exactamente lo que ya hace `objects.made_by`.

**2. La ropa es el canal visual que esta cámara SÍ puede mostrar.** §6 dice que
el piso de zoom lee *silueta, postura y ropa, nunca la expresión*. O sea que lo
que llevás puesto no es un número escondido en un menú: **es lo único de tu
personaje que se ve a cuarenta metros.** Una coraza cambia tu silueta y la
gente te reconoce distinto de lejos. Si una pieza no cambia la silueta, está
mal hecha.

**3. Los atributos no son un nivel.** §8.3 ya lo dice para la progresión y vale
igual acá: no hay puntos que subir. Lo que tenés sale de dos cosas que ya
existen — **la destreza que practicaste** y **lo que llevás encima** — y las dos
se ganan haciendo, no eligiendo en una pantalla.

**4. Y la prueba de §8.2b se aplica pieza por pieza: ¿qué te deja hacer que
antes no podías?** Un casco que da "+3 de defensa" está mal: sube un número.
Un casco que te deja bajar al Sotobosque de noche y volver, o aguantar el
segundo zarpazo del que hoy te mata en dos, está bien. **Si la respuesta a esa
pregunta es un número, la pieza no está terminada.**

**5. Pocas ranuras.** La tentación es cabeza, torso, manos, pies, cintura, dos
anillos y una capa. Este juego se ve de lejos y se juega en sesiones cortas:
más ranuras es más planilla y menos decisión. Empezá por lo que cambia la
silueta y lo que cambia lo que podés hacer, y agregá una sólo cuando haya algo
concreto que no entre.

Lo que hoy bloquea todo esto y hay que resolver antes: **no existe ninguna
forma de que un objeto llegue a tu mano si no lo hiciste o lo juntaste vos.**
`dar` es sólo jugador → NPC. Sin eso, una armadura hecha por otro no puede
llegarte, y la mitad de la gracia se pierde.

### 8.3 La progresión, en tres reglas

Esta parte estuvo mal explicada mucho tiempo, con vocabulario de RPG que no
hacía falta —"presupuesto de habilidad", "casilleros", "techo fijo"— y confundió
a todo el mundo, incluido a quien lo escribió. la dirección del proyecto la dijo bien y en una
frase:

> *"Yo puedo aprender de todo, iré usando lo que me sirva, en magia usaré lo
> que tengo al alcance, claramente no puedo llevar todo encima, pero sí
> aprender o mejorar stats cuando use."*

Son tres reglas, y no se contradicen entre sí:

**1. Lo que sabés no tiene techo.** Aprendés todo lo que consigas que alguien
te enseñe: cincuenta runas, tres oficios, dos lenguas. Nada te lo saca y nada
te lo limita más que encontrar quién te enseñe. Eso es coleccionar, viajar,
buscar maestros, que se te muera uno antes de tiempo. Es el contenido.

**2. Lo que llevás encima, sí.** Y no por una regla de sistema: **por lo
natural.** Usás lo que tenés a mano, lo que preparaste antes de salir, lo que
te entra. Estás atado a la fragua, entonces hoy cargás menos magia. No trajiste
el frasco, entonces no lo tenés. Preparaste tres runas esta mañana, y son esas
tres.

> **Se escribe como una limitación del mundo, nunca como un inventario de
> casilleros.** "No podés llevar todo encima" tiene que sentirse como salir de
> tu casa a la mañana, no como una grilla de ítems equipados.

**3. Lo que usás, mejora.** Es la destreza (§8.4). Practicás y te sale mejor.

### Por qué esas tres no se pelean

Es la confusión más común de este documento, así que va explícito:

- La regla 1 y la regla 2 **no son la misma cosa medida dos veces.** Saber es
  permanente y acumulativo; llevar es de hoy y es concreto. Podés saber cincuenta
  cosas y estar cargando tres.
- La regla 3 no reabre el grindeo, porque **lo que sube es la calidad de lo que
  te sale de las manos**, con rendimientos decrecientes — no un contador sin
  techo.
- Y de las tres juntas sale la consecuencia que ordena todo el combate:

> **El veterano tiene más respuestas, no más daño.**

Si la diferencia entre dos personajes fuera potencia, tendrías progresión
vertical y grindeo por la ventana. Como la diferencia es **repertorio**, tenés
identidad sin escalera. El veterano se rearma para la situación porque conoce
las opciones — sabe que contra eso conviene aquello, y lo sabe porque se lo
enseñó un tipo en un pueblo que ya no existe.

Efectos que hay que preservar:
- **La identidad sale de elegir y resignar hoy**, no de haber jugado más horas.
- **Es reversible.** Mañana salís con otra cosa. El que perdió todo se rearma
  distinto, y el mundo no se congela en las decisiones del primer mes.
- **El nuevo no queda atrás para siempre.** Le falta repertorio, no potencia, y
  el repertorio se consigue conociendo gente.

**Los dos anti-patrones, para no copiarlos sin querer:**
- **EVE**: las habilidades entrenan con tiempo real, sin grindeo — suena ideal,
  pero es **vertical acumulativo**. A los diez años el veterano es objetivamente
  superior y el nuevo nunca alcanza.
- **RuneScape**: aprendés usando, que es la idea correcta, pero lo que sube es
  un número sin techo, así que "usar" se convierte en repetir. **Es el grindeo
  naciendo de una buena intención.** La diferencia con nosotros es qué sube: acá
  sube la calidad de un objeto que otro va a usar y va a ver quién lo hizo.

### 8.4 La destreza — se gana haciéndolo

Es la regla 3, y es lo único de la progresión que ya está implementado.

- **El saber es la puerta.** Sin que alguien te enseñe, no podés forjar. Es lo
  social, lo escaso, y lo que se pierde del mundo.
- **La destreza es tuya.** Si cortás mucha leña, cortás mejor. Si forjás mucho,
  te salen mejores hojas. La practicaste vos y no te la puede enseñar nadie.

No están enfrentados: **el saber te habilita, practicar te hace bueno.** Un
personaje con mucha destreza y sin saberes no tiene qué practicar; uno recién
enseñado hace todo, mal, hasta que lo hace un montón de veces.

**La consecuencia que hace que todo cierre:** cuando le enseñás algo a alguien,
recibe el SABER, no tu destreza. Arranca de cero y tiene que practicarlo. Por
eso enseñar no te clona: el oficio sobrevive, el maestro sigue siendo el
maestro.

*Implementado:* la destreza vive en el par persona–saber, no en el jugador
(podés ser buen herrero y mal destilador). Curva medida: 0 → 45 en cinco
prácticas, con rendimientos decrecientes (+11, +10, +9, +8, +7); las hojas
salieron calidad 9, 30, 41, 48, 60. La primera es un fierro torcido, la sexta
ya sirve. Los NPCs viejos arrancan con destreza alta — un valle donde la
herrera de sesenta forja como principiante no se cree.

**Y la calidad se ve.** Alimenta el daño, sí, pero lo importante es otra cosa:
el que usa lo que hiciste ve quién lo hizo. Tu progreso es público y tiene tu
nombre. Eso es Frieren otra vez — el objeto arrastra a la persona.

### 8.5 El linaje — da acceso, historia y deuda. **Nunca poder.**

Que algunos personajes tengan más aura que otros tiene una versión que arruina
el juego y una que lo mejora.

**La que lo arruina:** aura innata como número. Si nacés con más magia, el
juego se convierte en tirar el dado hasta que salga bien, y volviste a la
potencia vertical que todo el resto del sistema existe para evitar.

**La que sirve:** el linaje no da potencia, da tres cosas horizontales.

- **Acceso.** Ciertos espíritus, NPCs o lugares responden a tu sangre. Se te
  abren puertas que a otro no.
- **Historia.** Tu linaje tiene pasado: enemigos, deudas, una casa arruinada.
  Es material listo para que el director te arme contenido personal.
- **Deuda.** La sangre que carga poder carga obligación. Alguien te quiere
  muerto por algo que hizo tu abuelo.

> **El linaje se genera del juego, no de un dado.** Tu segundo personaje
> desciende del primero. Los NPCs recuerdan el apellido. Si tu primer personaje
> fue un herrero famoso que murió en una invasión, el nuevo carga ese nombre y
> el mundo reacciona.

Eso convierte la muerte en **continuidad en vez de reinicio**, que es lo que
hace emocionalmente sostenible un juego donde se puede perder todo. Y el
jugador puede tener **uno o más personajes**: el linaje es lo que los ata.

### 8.6 El aura — un estado con costo, no una barra

"Más mágico" no se muestra como un número. Se muestra como **un estado del
personaje, visible y con precio**:

- Estás **atado** a una fuente — al fuego, a la piedra, a un muerto. No es
  "nivel 40 de magia", es un pacto.
- El pacto **te cobra algo**: no podés cargar hierro, la gente del pueblo te
  mira raro, dormís mal, cierto NPC no te habla.
- **Se te nota encima.** El muy mágico se ve de lejos que lo es, y eso tiene
  consecuencias sociales en un mundo donde los NPCs recuerdan.
- Te lo da el mundo, no la repetición: un espíritu te favorece, un maestro te
  toma de aprendiz, un artefacto te habilita. Todo **revocable y social**.

> **El costo es lo que crea la identidad.** Sin costo, todos terminan siendo
> todo, y a los seis meses no hay herreros porque conviene ser mago.

El aura visible es **la exhibición de una historia, no una barra de poder.**

---

## 9. La gente

### 9.1 El eco — tu personaje cuando te desconectás

Cuando te vas, tu personaje no desaparece: queda **el eco**. Sigue en el mundo,
habla, trabaja, enseña lo que vos sabés. **Todos ven de entrada que es un eco y
no vos** — eso no es opcional: si la gente cree que está hablando con vos y no
lo está, el sistema se pudre solo.

No es idea nueva y tiene buen linaje: los **peones de Dragon's Dogma** (2012)
son exactamente esto, y los **vendedores offline** de Ragnarok o Tibia son de
las mecánicas más queridas que tuvo el género.

Resuelve los dos problemas más grandes de este diseño:

- **La población.** El pueblo tiene herrero a las 3 de la mañana. Mismo efecto
  que los habitantes simulados, pero con personajes de gente real, y eso pesa
  distinto.
- **La liquidez del saber.** Si el conocimiento sólo se transmite en persona,
  sin ecos tenés que coincidir de horario con tu maestro para aprender algo.
  **Con ecos el saber circula aunque las agendas no se crucen.** Sin esto, la
  economía de conocimiento se traba sola.

> **La regla que lo hace seguro: el eco hace, no decide.**
>
> **Puede** enseñar lo que ya sabés, trabajar, hablar, acordarse de lo que
> pasó, llevar un mensaje, negarse.
>
> **No puede** gastar, vender, regalar, prometer, pactar, traicionar, aprender
> en tu nombre ni cambiar tu posición en el mundo. Nunca.
>
> Si un modelo de lenguaje te puede arruinar la vida mientras dormís, acabás de
> convertir desconectarte en un castigo.

- **Se puede atacar y dispersar**, y está bien: romper el eco del único herrero
  paraliza la herrería del pueblo hasta que su dueño se conecte. Es seguro para
  el jugador porque el conocimiento vive en tu cabeza, no en el eco: perdés la
  posición y el trabajo, **nunca el saber**.
- **Es testigo.** Nunca te gana mala fama mientras dormís, pero te cuenta lo
  que pasó. Y romperle el eco a alguien es un acto público que la gente
  registra.
- **No piensa cuando nadie lo mira.** Invoca un modelo sólo cuando alguien
  interactúa con él; quieto no cuesta nada. Y dura mientras alguien lo sostenga
  — le pagás a un NPC, o el pueblo lo mantiene porque le sirve. **Control de
  costos disfrazado de ficción.**

### 9.2 Los NPCs
- Cada NPC tiene **identidad, historia y voz propia**. Mantiene una línea de
  quién es y qué busca. Puede cambiar — pero por algo que pasó en el mundo, no
  porque al modelo le salió distinto esta vez.
- **Viven, mueren y nacen.** Los nacimientos no son decoración: sin ellos una
  región sin jugadores se despuebla monotónicamente y el saber sólo puede bajar.
- **Los guardias contratados son el diferencial de verdad**, más que "NPCs que
  conversan". Un guardia que tiene lealtad, que se puede sobornar, que puede
  huir si la pelea está perdida, que se acuerda de que lo dejaste sin paga tres
  semanas, y que le cuenta al resto. EVE tiene estructuras con temporizadores,
  Rust tiene torretas. **Nadie tiene guardias que te traicionan.**
- Eso convierte "me pueden atacar dormido" de **regla** en **juego**: no te
  protege una norma arbitraria, te protege lo que construiste. Y hace que lo
  que acumulás **no sean números, sean relaciones**.

### 9.3 La memoria y la reputación

Los NPCs **recuerdan**. Si hiciste algo malo, se acuerdan: te buscan, te tienen
miedo, te expulsan, te secuestran, o te ayudan.

**Dos ejes, no una barra.** Una sola no puede expresar "lo respetan y le tienen
terror".

| Te valoran | Te temen | Qué hace la gente |
|---|---|---|
| Sí | No | Te enseñan, te alojan, te avisan. El maestro querido. |
| Sí | Sí | Te obedecen y te sostienen el reclamo. El señor de la región. |
| No | Sí | Te sonríen de frente y conspiran atrás. Terminan pagándole a alguien para sacarte. |
| No | No | Te ignoran, te cierran la puerta, te expulsan sin drama. |

El precedente es el **sistema Nemesis de Shadow of Mordor**. *Nota práctica:*
Warner lo patentó. La memoria y el rencor no son patentables; **la jerarquía
con ascensos sí — no la copies tal cual.**

**Las dos reglas que lo hacen justo:**

- **Legible.** Nunca te enterás de que un pueblo te odia chocándote contra una
  puerta cerrada. Los NPCs te dicen qué escucharon y de quién. **El chusmerío
  *es* la interfaz** — y es literalmente el trabajo del director: traerte la
  consecuencia antes de que te muerda.
- **Recuperable.** Con pocas regiones, un error que cierra un lugar para
  siempre es brutal. Siempre hay vuelta: pagar la deuda, hacer un servicio, que
  alguien salga de garante. Y el camino es social, como todo lo demás.

**La reputación es local y viaja mal.** Lo que se sabe de vos allá llegó porque
alguien lo llevó — un viajero, un mercader, tu propio eco. Podés empezar de
nuevo en otra región, y el rumor te puede alcanzar meses después. Eso le da
trabajo narrativo a la topología, que hasta ahora era sólo geografía.

**El secuestro, con una regla dura:** *nunca puede costarte tiempo de juego.*
Si entrás y estás en una celda esperando, el juego te castigó por conectarte.
Estar capturado tiene que ser jugable — negociar, escaparte, o que te rescaten
tus amigos. **Se sale por contenido, nunca por temporizador.**

### 9.3b Economía, ley y costumbre — qué hay y qué no

Pedido de la dirección del proyecto, textual:

> *"Todavía no hay sistema de economía, políticas, reglas, sociales, etc. Cómo
> se deben comportar, si vas preso o no, hay cárceles, hay oficios, etc."*

Es un hueco real y hay que llenarlo. Pero la trampa acá es más peligrosa que en
otras partes, porque cada una de esas palabras arrastra un sistema entero de
otro juego: "economía" arrastra monedas y precios, "ley" arrastra guardias y
una celda, "políticas" arrastra facciones. **Si se importan esos sistemas, este
juego se convierte en un MMO genérico con un motor raro adentro.** Lo que sigue
es lo que encaja.

**1. Hay DOS economías y no se tocan. Ésa es la idea entera.**

Este documento decía que el valle no tenía plata a propósito. **Era una lectura
mía y la dirección la corrigió:**

> *"No, debe haber economía: vender, poder tener plata de distintos tipos,
> intercambios. El saber es algo más valioso pero nada que ver."*

Y tiene razón, además de que su versión es mejor. Una economía de plata no
diluye la tesis del saber escaso: **la afila**, porque pone al lado una cosa
que sí se puede comprar. Sin mercado, "el saber es lo único que importa" es una
afirmación sin nada contra qué contrastarse. Con mercado, es una experiencia:

> Podés comprar una hoja templada. **No podés comprar saber hacerla.**

Ese renglón es el juego. El día que se te muera Ilde, vas a tener plata en la
mano y no va a haber una sola hoja nueva en el valle para comprar, ni al doble,
ni al triple. **El mercado es lo que hace que la escasez se sienta**, porque un
mercado sabe decir "no hay" de una manera que un menú no.

Entonces son dos ejes que corren en paralelo y nunca se cruzan:

| | se compra | se hereda | se pierde |
|---|---|---|---|
| **las cosas** | sí | sí, cambian de mano | se rompen, se gastan |
| **el saber** | **nunca** | sólo enseñándolo, cara a cara | con el que se muere |

**La regla dura que sale de acá: no existe ninguna transacción que termine con
una fila nueva en `knows`.** Ni comprar, ni vender, ni pagar por una lección.
Se puede pagar para que alguien te haga algo; no se puede pagar para que te lo
enseñe. Si alguna vez hay un precio para aprender, este juego dejó de ser el
que es.

**Plata de distintos tipos**, que fue el pedido y no es un detalle: en el valle
hay dos pueblos que no son humanos, con lengua propia y un agravio concreto. Lo
que acepta la aldea no tiene por qué ser lo que acepta la Ceniza. Una moneda
que no sirve del otro lado del valle es geografía, es política y es una razón
para viajar — las tres cosas de una.

**Y lo que ya está construido no se tira, se suma.** La otra economía que este
valle siempre tuvo es la de **deuda y obligación**: te encargás de algo y no
volvés y te lo cobran; alguien se mete a defenderte y ahora tiene algo tuyo que
cobrar. **La gente se acuerda**, y eso sigue valiendo al lado de la plata. Un
favor y un pago no son lo mismo, y quién te pide cuál dice quién sos para esa
persona.

Lo que le falta a todo esto para existir es lo mismo que le falta a lo demás:
hoy `dar` es sólo jugador → NPC, así que **nadie te puede dar ni vender nada**.
Una economía donde sólo se puede entregar y nunca recibir es media economía, y
es lo primero que hay que cerrar.

**2. Los oficios existen y son la mitad del juego.** `people.trade` decide qué
sabe cada uno, qué persigue, a qué hora trabaja, cómo va vestido y qué hay
adentro de su casa. Lo que falta no es un sistema de oficios: es que **el valle
crezca en oficios**, que es otra cosa y está pedida —*"pueblos reales que van
creciendo con oficios"*—. El mecanismo ya está: el que llega por el Camino del
Norte trae un oficio y ninguna receta, y aprende del valle.

**3. La ley: el castigo no puede ser una celda.** §9.3 ya lo dice para la
captura y vale para todo — *"si entrás y estás en una celda esperando, el juego
te castigó por conectarte"*. Y hay algo más fuerte: **este valle ya tiene un
sistema de justicia y es la reputación de dos ejes.** `bonds` guarda `valued` y
`feared` por persona, y los umbrales deciden quién te encarga algo y quién te
enseña lo suyo.

O sea que la pena por robar no es la cárcel: es que **el que te vio deja de
enseñarte**, y como el saber vive en gente mortal, perder maestros es lo más
caro que hay en este mundo. Eso no hay que construirlo — hay que **conectarlo**:
que las cosas que hoy no tienen consecuencia social la tengan.

**4. Qué es un delito acá, y hoy ninguno es posible todavía.** La lista corta:
llevarte algo que otro dejó, matar a alguien del valle, romper un encargo que
tomaste. **Ninguna de las tres se puede hacer hoy**, y la primera está a punto
de poder hacerse — el día que un objeto pueda quedar tirado en el suelo, robar
existe. Ése es el momento de conectar la consecuencia, no antes.

**5. Y la costumbre, que es lo que hace que un lugar tenga cultura.** Los dos
pueblos que no son humanos tienen lengua propia y un agravio concreto; el valle
tiene un incendio con dos versiones irreconciliables y algo de lo que no se
habla. Eso ya es política: **es gente que no está de acuerdo sobre qué pasó.**
Lo que falta es que tomar partido cueste algo.

### 9.3c Pegarle a una persona

Pedido de la dirección del proyecto, textual:

> *"Ni pegarle hasta un NPC y que entienda qué pasa."*

Hoy no se puede: `pelear` sólo apunta a `threats`, y **`people` no tiene vida**
— tiene `alive` y `died_tick`, o sea que una persona puede morirse pero no
tiene puntos que bajar. Es un hueco real. Y es, con diferencia, **la acción más
grave que puede existir en este juego**, así que hacerlo como un combate más
sería el peor error posible.

**Por qué es distinto acá.** En cualquier otro juego matar a un NPC es perder
un vendedor y un poco de reputación. Acá el saber vive en gente mortal: **si
matás a Ilde, nadie en este valle vuelve a forjar nunca.** No es un castigo
para vos — es empobrecer el mundo, permanentemente, **para todos los que
juegan**, incluidos los que no estaban conectados. Es la única acción del juego
cuyo daño no se puede deshacer ni compensar con tiempo.

De ahí salen cuatro reglas:

**1. Casi nadie se defiende, y ésa es la respuesta.** La reacción por defecto a
un golpe no es pelear: es **huir y contarlo**. Un valle donde cada aldeano es
un enemigo con barra de vida es un juego de acción; uno donde el que golpeás
sale corriendo y a la tarde no te habla nadie es este juego. La maquinaria ya
está entera: `bonds` tiene `feared` además de `valued`, la memoria se guarda por
persona, y **el chusmerío hace que la memoria viaje** — el que no te vio se
entera igual.

**2. La pena no es una celda: es que el valle se cierre.** Ya está escrito en
§9.3b y acá es donde más se nota. El que te teme **no te enseña**, y perder
maestros es lo más caro que hay en este mundo. Y hay un matiz que ya existe y
conviene no perder: **el que te teme sí te entrega lo que tiene** — o sea que
la violencia funciona a corto plazo y te arruina a largo, que es exactamente lo
que tiene que sentirse.

**3. Matar tiene que ser posible, difícil y nunca accidental.** Un mundo donde
no podés hacer lo peor es un mundo sin apuestas. Pero **no puede pasar por
apretar clic tres veces distraído**: si el jugador no entendió lo que estaba
haciendo hasta que fue irreversible, el juego le mintió. Que cueste, que avise,
y que el aviso sea del mundo y no de un cartel — el que le pegás grita, el que
mira se mete, la persona pide que pares.

**4. Y el que sabe algo que nadie más sabe vale distinto.** El código ya cuenta
cuántos lo saben (`cuantosLoSaben`) y ya marca al último portador — el sorteo
de la muerte le da peso ×3. Golpear al último que sabe forjar tiene que sentirse
distinto que golpear a quien no sabe nada, y el mundo tiene el dato para
decirlo.

**Lo que NO se hace:** barras de vida sobre las cabezas, guardias que aparecen,
un contador de crímenes. La consecuencia es social y ya está construida; lo que
falta es conectarla.

> **ESTÁ CONSTRUIDO** (18 de agosto). `people.health` existe, el verbo es
> `golpear` —no `pelear`, ver abajo— y vive en `golpearPersona()` de
> `combate.ts`. Medido en `valle-pruebas`, no supuesto:
>
> · **Ocho golpes para matar** (vida 100, daño 8–16). No se llega ahí
>   distraído, que era la regla 3.
> · **Pide que pares al segundo golpe y se va del lugar al cuarto**, escribiendo
>   `people.place_id`: el resto del valle la ve donde se fue y el que la buscaba
>   para que le enseñara tampoco la encuentra. La regla 1 en una columna.
> · Los testigos terminan en `valued −100 / feared +100`.
> · Del lado del cliente, **el primer clic no pega**: amaga, nombra a quién y
>   dice si enseña.
>
> Y una que casi se escapa: **pedir y huir colgaban del mismo umbral**, así que
> la frase «te pidió que pares» —el único aviso que da el mundo antes de que
> esto sea irreversible— no salió ni una vez en ocho golpes. La prueba habría
> pasado igual. Se separaron los umbrales (0,75 y 0,50).
>
> No es `pelear` y la distinción es el diseño entero: `pelear` sube el aprecio
> de los que te ven, porque matar un bicho es defender al valle. Esto lo baja.

### 9.3d Estamentos, carácter y la reputación del pueblo entero

Pedido de la dirección del proyecto, textual:

> *"De los principios, un pueblo: los NPCs pueden ser buenos, malos,
> delincuentes, nobles, cleros, magos, reyes, ser justos o no. **Pueden odiarte
> en un pueblo según cómo venga tu reputación.**"*

Lo último es lo más importante de la frase y **ya está en la base sin que nadie
lo use.** La tabla `peoples` tiene `aprecio` y `temor` a escala de pueblo, con
este comentario escrito hace semanas:

> *"Los dos ejes, a escala de pueblo. Igual que con la gente, pero **el pueblo
> entero se acuerda de lo que le hiciste a cualquiera de los suyos**."*

Hoy sólo lo escribe el autor y **nadie lo lee para decidir nada**. Es dato
muerto, y es la tercera vez que pasa lo mismo en este proyecto: `holder_kind`
aceptaba `'place'` desde el primer día y nadie había escrito un objeto en el
suelo; `people.trade` decidía nueve cosas y nadie lo usaba para el sonido.
**Antes de agregar una tabla, buscá la que ya está.**

**1. La reputación tiene dos escalas y la de arriba es la que hace política.**
Lo que una persona siente por vos sale de lo suyo **más lo de los suyos**. Eso
cambia el juego entero: le pegás a uno de la Ceniza y **el pueblo entero se
entera**, aunque el que te vio se muera. Y hace que tomar partido cueste algo,
que es exactamente lo que §9.3b decía que faltaba: hay dos versiones
irreconciliables del incendio, y hoy podés escuchar las dos y quedar bien con
todos, que es lo mismo que no haber elegido.

**2. Los estamentos tienen que HACER algo o son una etiqueta.** Un noble que es
"un noble" no existe; uno que decide quién puede usar el camino, sí. Y acá hay
un caso vivo que muestra cómo se hace bien: **la vieja Ren es la maga, y su
poder es que es la única que sabe las runas y NO ENSEÑA.** Eso no necesitó un
estamento, un título ni una facción — necesitó una decisión suya con
consecuencias. Ese es el listón.

**3. Cuidado con la escala.** "Reyes" y "clero" en un valle de siete personas
es disfraz. Estas cosas entran cuando el mundo crezca, y el mundo tiene una
puerta por donde crecer —el Camino del Norte, que ya está construido y se ve
desde toda la aldea—. **Un estamento nuevo se gana cuando hay suficiente gente
para que mande sobre alguien.**

**4. Bueno y malo no es una barra.** La versión que arruina esto es un número de
alineamiento. La que funciona ya está andando: **los dos pueblos tienen un
agravio concreto y ninguno está equivocado.** Los de la Ceniza vivían en la
Casa Quemada antes del incendio; los del Sotobosque perdieron el claro que la
aldea taló para las vigas. Nadie es el malo — hay intereses que no entran
juntos. Un delincuente de este valle no es alguien con la etiqueta "malo": es
alguien que hizo algo y **el pueblo se acuerda**.

**5. Y lo que hace que valga la pena: se puede dar vuelta.** El comentario de
`agravio` en el esquema ya lo dice — *"no es sabor: se puede averiguar hablando,
y resolverlo es lo que puede darlos vuelta"*. Un pueblo que te odia y no puede
dejar de odiarte es una pared. **Lo que hay que construir no es el odio: es la
puerta de salida.**

### 9.3e Atacar cuesta, y hay lugares de los que no se vuelve

**DECIDIDO:**

> *"No debe ser gratis o fácil atacar un pueblo: hay guardias, la gente
> recuerda, defensas. **Las mazmorras deben ser lugares ultra peligrosos.**"*
>
> *"Las mazmorras deben estar por lugares especiales."*

Lo primero ya arrancó: el pueblo se defiende solo, y el que tiene el oficio
pelea primero. Pero "defenderse" es sólo el primer tercio de lo que hace caro
atacar un pueblo, y los otros dos ya existen y están sin conectar:

1. **Los guardias.** Hecho. El que tiene el oficio sale, y si no hay guardia
   sale el que vive ahí.
2. **La gente se acuerda**, y esto es lo que de verdad lo vuelve caro. `bonds`
   tiene `feared` además de `valued`, el chusmerío hace viajar la memoria, y
   `peoples.aprecio` guarda lo que un pueblo entero siente. **Atacar no tiene
   que costarte una pelea: tiene que costarte el pueblo.** El que te teme no te
   enseña, y perder maestros es lo más caro que hay acá.
3. **Las defensas** son lo único que no existe todavía, y la forma correcta en
   este juego no es un muro con puntos de vida: es que **defender sea algo que
   alguien SABE hacer** y que el pueblo pueda perder. Un valle sin nadie que
   sepa levantar una empalizada es un valle que se queda sin empalizadas.

**Las mazmorras: lugares especiales de los que se puede no volver.** Y la regla
que las hace distintas de "un lugar con bichos más fuertes" sale de la tesis:

> **Lo que las vuelve peligrosas no es el daño, es lo que te podés dejar
> adentro.** Si te matan lejos y sin testigos, hoy caer es gratis — te
> levantás en la aldea. Una mazmorra tiene que ser el lugar donde eso deja de
> ser cierto: **lo que llevabas encima se queda donde caíste**, que es
> exactamente lo que ya le pasa a un NPC cuando se muere.

Y hay una consecuencia que la vuelve el mejor contenido posible acá: **si el
que entra y no vuelve sabía forjar, el valle se queda sin forja.** Una mazmorra
no es un sitio con botín: es el lugar donde el mundo puede perder algo.

> **INFERIDO:** que "lugar especial" se resuelva con `places.kind`, que ya
> decide dónde se fabrica cada cosa y qué crece dónde. Una mazmorra sería un
> `kind` nuevo con sus reglas — no una tabla aparte.

### 9.3f Curarse, y hablar con los muertos

**DECIDIDO:**

> *"Y la gente puede regenerarse, curarse: hay médicos, pociones, magia. Mismo
> cuando decimos que algo se perdió para siempre, **quizás haya un hechizo para
> hablar con muertos**."*

La primera mitad ya tiene su sección (§10.2): lo que distingue a las formas de
curarse no es cuánta vida devuelven sino **dónde te dejan**. Un médico encaja
solo: es la tercera forma, la que te deja entero **donde está él**, y **es una
persona que puede morirse** — o sea que un valle se puede quedar sin nadie que
sepa curar, y eso es el juego funcionando.

**La segunda mitad es la mejor idea que entró a este documento, y la que más
fácil lo rompe.** Hablar con los muertos toca el único clavo que sostiene todo:
§8 dice que el saber se muere con la última persona que lo tenía. Un hechizo que
te devuelva a Ilde para que te enseñe a forjar **no agrega un hechizo: borra el
juego.**

Mi primera regla fue *"un muerto puede contarte, no puede enseñarte"*, y la
dirección la corrigió — **DECIDIDO**:

> *"Pero puedes aprender si te da algunos conceptos y viendo esa pieza con el
> muerto. **No debe ser fácil pero posible.**"*

Y es mejor, porque encaja con un escalón que este documento ya tiene y que yo
no había conectado. §8.1 dice que hay tres niveles y que **lo que aprendés solo
tiene techo**: entrás al oficio y nunca sos bueno; lo que te enseña alguien
vivo es lo que levanta ese techo.

**Un muerto es exactamente el escalón del medio.** No te pone la mano encima
—eso sigue siendo cierto y es lo que hace que un maestro vivo valga—, pero te
da los conceptos, y con la pieza delante alcanza para empezar. Aprendés mal, y
mal es infinitamente más que nada.

Y hay algo que esto habilita y es lo mejor de todo: **hace falta la pieza.** No
podés aprender a templar hablando con Ilde en el aire — necesitás una hoja que
ella haya hecho, en la mano, para mirarla mientras te la explica. Eso convierte
en oro todo lo que se construyó estas horas:

- **Los objetos arrastran el nombre de quien los hizo** (`made_by`), y ahora ese
  nombre no es sabor: es **la mitad de una lección**.
- **Las cosas quedan tiradas en el suelo** y **lo que llevaba un muerto queda
  donde se murió.** Una hoja en la ruina que dice *"la hizo Ilde, hace treinta
  días"* pasa de ser una postal a ser **la única forma que queda de recuperar
  la forja en este valle**.
- Y **sigue siendo escaso**, que es lo que salva la tesis: si nadie guardó nada
  de Ilde, o si la última hoja se rompió, o si alguien la vendió del otro lado
  del valle — **no hay lección posible**. El saber sigue muriéndose con la
  gente; lo que cambia es que ahora deja huellas, y las huellas se pueden
  perder también.

Con ese candado puesto, es el contenido más cargado que este juego puede tener:

- **Le podés preguntar a la persona lo que nunca le preguntaste.** No hay
  mecánica que compre eso.
- Cierra la única puerta que quedaba abierta y fea: hoy, cuando alguien se
  muere, lo que sabía **desaparece de la conversación** — nadie puede siquiera
  hablar de eso con conocimiento. Un muerto que puede hablar hace que la
  pérdida sea *hablable*, que es lo contrario de deshacerla.
- Y le da a la magia un para qué que no es daño, que es justo lo que a las
  cuatro runas les falta.

> **INFERIDO, y hay que pelearlo antes de construirlo:** que el muerto responda
> con lo que el mundo tiene escrito de él —sus eventos, su historia, lo que
> sabía— y **nada más**. Un fantasma que improvisa es un chatbot con sábana, y
> §9.4 ya dice qué pasa con eso.
>
> **Y que aprender así entre por la puerta del medio de §8.1**: te deja adentro
> del oficio con destreza baja y con el techo del autodidacta puesto. Sale una
> hoja torcida, y para que salga bien vas a necesitar a alguien vivo — o mucho
> tiempo. Si aprender de un muerto rinde lo mismo que aprender de un vivo,
> morirse deja de costar y volvimos al principio.

### 9.4 El diálogo — lo que NO se hace

**Nada de NPCs charlatanes de libre conversación.** Se hablan una vez, se
descubre que son un chatbot, y no se les vuelve a hablar.

Lo que sí: **una o dos líneas que salen de su estado real** —lo que persiguen,
lo que recuerdan de vos, si confían— y dos o tres respuestas **que hacen algo**.
Diálogo que mueve el mundo, no que lo decora. Podés escribirle lo que quieras y
te contesta en personaje, pero **el campo de texto libre no mueve estado; las
opciones sí**, y las opciones se derivan del estado, no del modelo.

---

### La gente vive su propia vida

Ésta es la diferencia entre un mundo y un decorado, y hoy no está.

**Los NPCs usan los mismos verbos que vos.** No una simulación aparte: los
mismos. Ilde no "avanza un 12% en juntar carbón" — Ilde **va** a la Casa
Quemada, **busca**, y **vuelve** con carbón, o vuelve con las manos vacías, o
no vuelve. Cuando el jugador y el NPC juegan con las mismas reglas, todo lo
que pasa es legible: te la cruzás en el camino y sabés a qué fue.

**Salen de aventura y entran a las mazmorras.** Una mazmorra no es contenido
que espera al jugador: es un lugar peligroso donde quedó algo, y cualquiera
puede ir. Un NPC puede armar una expedición, llevarse a alguien, y **no
volver**. Cuando eso pasa, se lleva lo que sabía — y ahí el tema del juego deja
de ser una frase y es algo que te pasó sin que estuvieras.

**Deciden.** No al azar y no por un modelo que juega el turno por ellos: eligen
entre lo que su estado permite, con lo que quieren y con lo que les falta. Un
aprendiz que le debe algo a alguien y ve una forma de saldarlo la toma. Uno que
te tiene miedo se va del lugar cuando llegás.

**De dónde salen las metas nuevas.** Hoy de una lista fija de dos por oficio, y
es el techo del sistema: se repiten. Acá entra **el autor del mundo**, y hay
que ser preciso con qué es y qué no es, porque roza el invariante 1:

> La simulación produce las condiciones; el autor escribe el desenlace; el
> director lo cuenta.

- **La simulación no usa IA y no va a usarla.** Las simulaciones no producen
  dragones: producen desigualdad, escasez y muertos.
- **El autor corre cada tanto** —cada varios días del valle, no cada tick— lee
  lo que pasó, y **escribe hechos nuevos en la base**: una meta que sale de lo
  que ese valle perdió, un pueblo que se enoja porque le talaron el claro, una
  figura que aparece porque murieron tres maestros seguidos. **No narra:
  siembra.** Después la simulación los ejecuta sola, determinista.
- Que corra cada tanto no es un ahorro, es lo que lo hace bueno: **un mundo
  donde algo grande pasa todos los días no tiene nada grande.**

Y el límite que lo mantiene honesto: el autor puede sembrar metas, pueblos y
tensiones. **No puede decidir que algo ya pasó.** Lo que pasó lo decide el tick.

## 10. Vivir ahí

### 10.1 Construir y poblar

> **Un pueblo no son edificios, son personas que saben cosas.**

En este mundo un lugar vale por si tiene herrero que enseñe, cocinera,
guardias, alguien que destile. Entonces construir no es levantar paredes: es
**armar un lugar donde un maestro acepte vivir**. La construcción es la capa
física del sistema social, no un pilar de crafteo aparte — y eso es lo que
evita que el alcance explote.

- **Por partes, no por vóxeles.** Kit modular diseñado por la dirección de
  arte: colocás edificios, alas, muros, materiales, estandartes, el trazado.
  Todo se ve siempre bien porque cada pieza está autorada. La construcción
  libre con desconocidos produce cajas feas y un mapa ilegible desde arriba;
  Minecraft lo asume como estética, un mundo curado no puede. **La expresión va
  en el trazado, los materiales y el nombre, no en la geometría.**
- **Nunca juntás cuatro mil troncos: contratás.** Cuesta relaciones y recursos,
  no tiempo de clic. Los constructores son NPCs con oficio — un maestro albañil
  levanta mejor, se lo puede tentar, se puede ir, lo pueden matar.
- La cuadrilla trabaja en tiempo de mundo, así que **tu castillo se levanta
  mientras no estás.** Volvés y el muro está.

> **La escala la da la gente, no los materiales.** Si un reino se compra con
> piedra, inventaste una cinta de correr en el sistema más grande del juego.
> Una región es un reino **porque suficiente gente —jugadores y NPCs— lo
> reconoce**: umbral social, no económico. Y un castillo enorme y vacío es
> exactamente eso, un castillo vacío.

Eso hace mecánicamente real el "hacer mío el mundo": **lo que se conquista es
el relato del lugar, no las cosas de la gente.** Quién gobierna la región, cómo
se llama, a quién le responde el pueblo, si prospera o se vacía.

**Riesgo a resolver: el acaparamiento.** El reclamo tiene que sostenerse con
habitantes y caducar si el lugar queda muerto. **La tierra se tiene poblándola.**

### 10.2 Comida, caza y frascos

Cazás, cocinás, destilás. Pero la comida es **un bono, nunca un impuesto**: sin
barra de hambre y sin castigo. Comer bien te deja mejor; no comer te deja
normal. El modelo es **Monster Hunter** (comés antes de salir, no existe el
hambre), **no Valheim**, que ya empieza a ser obligación disfrazada.

No es relleno por tres razones: son **oficios** (o sea saber escaso que alguien
enseña), son **la capa donde nadie te puede tocar**, y **el eco puede hacerlo**
porque cocinar es hacer y no decidir.

> **Para qué sirve el frasco:** es **la única forma de exceder tu capacidad** —
> llevar una quinta runa para una sola pelea. Y lo fabrica otro. Eso le da al
> que destila poder real sobre el que pelea sin que nadie farmee nada.
>
> **El límite que no se cruza: el frasco da opciones, no potencia.** Si se
> vuelven obligatorios para competir, inventaste el grindeo — y esa es la forma
> más común en que un juego sin grindeo termina teniendo uno.

#### Curarse: dónde estás, no cuánto tenés

La dirección lo pidió así: *"y sí, hay vida, y se recupera con pociones, o te
curas durmiendo, o cosas"*. Y hay una razón para que sean varias formas y no
una: **lo que las distingue no es cuánta vida te devuelven, es DÓNDE te dejan.**

Lo primero que hubo que tapar era feo y estaba medido: **la única forma de
curarse era caerse.** La vida no subía nunca sola, `levantarse()` te dejaba
entero pero en la aldea, y la runa que cierra heridas necesita a otro que la
sepa, la haya colgado ese día y esté al lado. O sea que a alguien con veinte de
vida en el Sotobosque **le convenía dejarse matar**: salía gratis y volvía
entero.

Las tres que ya existen o vienen, y el eje real es la posición:

| | te deja | cuesta |
|---|---|---|
| **caerte** | entero, **en la aldea** | la caminata de vuelta, y la cara |
| **el cuenco de cuajada** | a medias, **donde estás** | que alguien lo haya hecho |
| **dormir** | entero, **donde dormiste** | el tiempo, y tener dónde |

**Dormir es el que falta y es el que mejor encaja con lo que se acaba de
construir.** La rutina del servidor ya manda a la gente a su casa al anochecer;
se entra a las doce casas; y adentro hay una cama que hoy no es nada. Que
dormir cure es lo que convierte esa cama en un mueble y no en un adorno — y de
paso le da al valle **una razón para que alguien te preste techo**, que es
social, que es lo que este juego hace bien, y que no existe hoy de ninguna
manera.

**Y las tres reglas que no se cruzan**, que son las mismas de §10.2: es bono y
nunca impuesto, así que **no hay hambre, no hay cansancio y no hay barra que
baje sola**; no tenerlo te deja como estabas ayer; y ninguna sube el techo — 100
sigue siendo 100. El día que haga falta dormir para no empeorar, se inventó una
obligación disfrazada.

### 10.3 El resto
- **Robar** se puede, y te lo van a recordar mucho tiempo.
- **PvP opcional.**
- **Sesión de una hora que valga la pena.** Sin grindeo. Si la respuesta a "qué
  hago hoy" es "repetir lo de ayer más veces", está mal diseñado.
- **El bucle chico, el que hace que se sienta un juego:** aprendés → fabricás →
  regalás → te ganás a la gente → te enseñan más. Fue el agujero original:
  *aprendés a forjar y después no podés forjar nada.* Un saber que no habilita
  hacer algo es un renglón en una lista.

### 10.4 Quests y mazmorras

**No hace falta un sistema de quests: ya existen y se llaman agendas.** "Bruno
quiere que Ilde le muestre el temple de río." "Odila quiere cobrar tres deudas
viejas." Avanzan solas, se traban, se cumplen y abren otras. Lo único que falta
es que el jugador pueda meterse.

Tienen cuatro propiedades que ningún sistema guionado tiene: son **únicas por
mundo**, **avanzan sin vos** (la cualidad de Red Dead: el mundo no te espera),
**otro jugador puede cerrarlas mientras dormís**, y encadenan solas.

> **El rol de la IA no es inventar quests** — eso produce la papilla sin sabor
> de siempre. Es **hacerlas visibles y personales**: *"Tobio quiere ver magia
> de cerca, y vos acabás de aprender la runa de brasa."*

Y la lección del Witcher: **la situación siempre es más complicada que el
pedido.** Ayudar a Odila a cobrar significa apretar a Bruno, que te cae bien.
Eso no hay que escribirlo — sale solo de que las agendas de distinta gente se
pisan.

> **Las mazmorras acá no son pasillos con botín: son donde quedó el saber de un
> muerto.** La Casa Quemada ya lo es y no lo sabe — ahí vivía Ren, y con ella
> se fueron las dos runas.

---

## 11. Lo grande

### 11.1 Los acontecimientos — quién los hace

> **Un modelo de lenguaje no produce espectáculo. Produce textura.** Voces,
> rumores, consecuencias, detalle local. Si esperás que el director invente el
> dragón, te sale un dragón de cartón.

El reparto correcto:
- **Lo emergente lo da la simulación.** Un pueblo cae porque nadie lo defendió,
  una región se empobrece porque le absorbieron los oficios. Infinito y gratis,
  pero cotidiano: **las simulaciones no producen dragones, producen
  desigualdad.**
- **Lo grande lo autorás vos.** El dragón, la raza que llega, la peste. Caro,
  raro, y es lo que la gente recuerda.
- **El director lo hace tuyo.** No inventa el dragón: decide quién lo vio
  primero, qué dicen los NPCs, y lo ata al herrero que se murió el mes pasado.

**El puente: la simulación produce las condiciones, vos autorás el desenlace.**
El mundo lleva la cuenta de cuánto se extrajo y cuántos maestros murieron;
cuando cruza el umbral, despierta el dragón. Lo construiste vos, pero *cuándo,
dónde y por qué* lo decidió lo que hizo la gente. Esa es la diferencia entre un
evento de temporada y algo que se sintió merecido.

> **El mundo recuerda sus cicatrices.** La región que perdió sus herreros sigue
> más pobre. El valle quemado sigue quemado. Si todo vuelve a la normalidad la
> temporada que viene, nada importó nunca y tenés un parque temático.

### 11.2 El mal, quién era

No hay barra de porcentaje ni señor oscuro genérico. **Un Bayaz hay que
escribirlo** — lo que lo hace Bayaz no es ser malo: es ocupar el lugar del
mentor sabio y que la revelación te recontextualice todo lo que hiciste para
él. Eso es control autoral del tempo, y una simulación no tiene tempo.

> **Pero tu Bayaz ya está construido con las mecánicas que hay.** Una figura
> que viaja entre regiones enseñando con generosidad, que todos quieren cerca,
> que parece estar repartiendo el saber — y que en realidad viene
> **absorbiendo**, concentrando cada oficio en sí misma y dejando regiones
> huecas atrás. Los jugadores lo ayudan porque es el maestro amable. Hasta que
> alguien nota que todas las regiones por las que pasó perdieron algo.
>
> **No es una cinemática: es un patrón en los datos**, y un jugador podría
> descubrirlo solo.

Y la respuesta honesta a "el mal quién era" probablemente sea incómoda: **casi
siempre, los jugadores.** En un mundo donde absorber concentra y enseñar
reparte, el villano de la decadencia de una región suele ser alguien que sólo
estaba optimizando.

### 11.3 Revivir a los muertos

Se va a poder, **y hay que diseñarlo antes de que los jugadores lo inventen por
su cuenta.**

> **La regla: vuelve la persona, no vuelve lo que sabía.**

El cuerpo vuelve; el oficio no. Así la escasez queda intacta y a la vez existe
el momento emocional de recuperar a alguien. Y es más triste, no menos: el
juego entero dice que el saber vive en una persona, y un revivido es una
persona sin lo suyo. Si vuelve Ren con sus runas, "el saber se pierde para
siempre" pasa a ser "el saber es un inconveniente temporal" y el motor se
apaga.

*La regla dura aplica a los NPCs.* Revivir jugadores no tiene ese problema: tu
conocimiento nunca se perdió, está en tu cabeza; lo que perdiste fue posición.

**La válvula: los espíritus.** No podés traer de vuelta a Ren, pero sí
consultarla. Un espíritu recuerda fragmentos y puede enseñar **una sola cosa,
una sola vez**, y después se va del todo.

**Qué cuesta:** no oro. El precio se paga en la economía propia — **alguien
vivo entrega algo que sabe, y lo pierde. Traer a uno cuesta olvidar.** Eso
convierte cada resurrección en una decisión de comunidad, no en una compra.

> **Y acá se pone recursivo:** el oficio de hablar con los muertos es un saber
> como cualquier otro. El día que muera el último espiritista sin aprendiz, el
> valle deja de poder recuperar nada nunca más. **El saber de cómo recuperar el
> saber también se pierde.** Es la mejor presión de final de partida que puede
> tener este diseño, y sale gratis.

---

## 12. Meta

### 12.1 Los idiomas

**Español e inglés de base.** Y acá el diseño con IA regala algo que un MMO
normal paga carísimo: **la localización no es traducir cinco mil líneas, el
director escribe directamente en el idioma del jugador.** El segundo idioma
cuesta prácticamente lo mismo que el primero.

**La consecuencia que sí cuesta:** el estado del mundo tiene que ser neutro al
idioma. Los eventos guardan hechos estructurados, no prosa —
`{tipo: muerte, persona: Ilde, lugar: fragua}`, nunca "Murió Ilde en la fragua".
Los **nombres propios no se traducen**; los **oficios y saberes sí**, y
necesitan las dos formas en `knowledge`.

Y sale algo que casi nadie tiene: **el idioma deja de ser una frontera de
servidor.** Los MMO parten la población por idioma y se dividen solos. Acá dos
jugadores comparten región y cada uno recibe la crónica en su idioma, desde los
mismos hechos. Para un juego cuyo riesgo número uno es la población vacía, no
partir el público en dos es enorme.

*Decisión de tono pendiente:* **rioplatense o español neutro.** Hoy sale
rioplatense y ya dio un problema real — un valle entero de porteños. Elegirlo
después de escribir mil líneas de prompt cuesta. Ver §16.

### 12.2 Vender el personaje — **no**

Se evaluó y se descartó. El precedente sancionado existe (EVE tiene mercado
oficial de personajes y funciona), pero acá **un personaje no son stats: son
conocimiento y relaciones**, y esas dos cosas se transfieren muy distinto.

- **El conocimiento se transferiría limpio, y ahí está el problema.** Si se
  puede comprar un personaje que ya sabe todo, el saber deja de ser escaso y
  pasa a tener precio de lista. No es una objeción moral: la mecánica central
  deja de funcionar.
- **Las relaciones no se transferirían.** Viven en la cabeza de otros. El mundo
  conocería el nombre y no al que lo lleva.
- Crea un incentivo a **fabricar personajes para vender**, que es grindeo con
  otro nombre.

**Lo que sí, y ya está diseñado: se traspasa la posición, no la persona.** El
taller, el reclamo sobre el lugar, los contratos de los guardias, el nombre de
la casa. Un acto dentro del mundo que los NPCs presencian y el director narra —
y el que recibe **tiene que ganarse a esa gente de nuevo**, porque su lealtad
no venía con el edificio.

Y para la parte valiosa ya existe el mecanismo: **enseñar.** Vender el
personaje es saltearse el mejor bucle del juego. El linaje (§8.5) cubre la
versión legítima de "alguien nuevo hereda un nombre y una reputación", y la
cubre mejor.

### 12.3 Lenguas propias

Una lengua es un saber más —vive en gente, se enseña, se pierde— pero con una
propiedad que ningún otro tiene: **abre otros saberes.** Una runa escrita en
lengua muerta no se puede aprender hasta que alguien pueda leerla. Perdés al
último que la hablaba y todo lo escrito en ella queda fuera de alcance aunque
el papel siga ahí. No se destruyó nada: simplemente ya nadie sabe qué dice.

> Y cierra el principio central de forma literal: **el diccionario lo armás
> vos, de verdad, afuera del juego.** Cada palabra que descifrás la sabés para
> siempre, aunque borres la partida. **Y se puede compartir entre jugadores sin
> que ningún sistema lo impida** — amigos pasándose traducciones por mensaje es
> el tema del juego ocurriendo en la vida real.

Precedente: **Tunic**. Dos límites que hay que respetar: **vocabulario chico**
(decenas de palabras, no cientos) y **nunca obligatorio** — un puzzle de
traducción obligatorio expulsa a la mitad de la gente en la primera pared.

### 12.4 Plataforma

**PC / Steam primero. Motor que exporte a mobile.**

La razón principal **no es la vista ni los controles**, que pesan menos de lo
que parece. Es **el modelo de negocio**:

> El juego tiene costo de servidor y de LLM todos los meses, para siempre. En
> Steam eso lo pagás con 25–30 dólares de entrada más cosméticos. En mobile el
> mercado te empuja a free-to-play, y **F2P en un juego donde podés perder tus
> cosas se vuelve tóxico al instante**: cualquier cosa que vendas parece
> pay-to-win, y la presión por monetizar te pide justo el grindeo que no
> querés. **La plataforma te elige el modelo de negocio, y el modelo de negocio
> te reescribe el diseño.**

Sumale descubrimiento: Steam es el único lugar donde un indie de este género se
encuentra.

**Mobile no es imposible, y hay una prueba exacta: Albion Online** — isométrico,
sandbox, full-loot, mismo mundo en PC y en teléfono con cross-play real. Es el
precedente más cercano que existe. *El detalle que importa: Albion se diseñó
para mobile desde el día uno.* Meterlo después es carísimo.

**Cuatro decisiones que hoy son gratis y en dos años son carísimas:**
1. Motor que exporte a mobile (Unity o Godot; se eligió Godot).
2. UI escalable: nada de texto chico ni información que sólo aparece al pasar
   el mouse por encima.
3. Nada que exija más de tres o cuatro inputs simultáneos.
4. **La cámara lejana como vista por defecto.** La misma decisión que hace
   legible al director es la que deja la puerta de mobile abierta.

**Web como el juego: no.** 3D con rotación, zoom, LODs y mundo persistente en
el navegador es una pelea fea, y el export a WebGL da una primera carga
larguísima — la fricción vuelve justo donde la querías eliminar.

**Web y mobile sí, pero como compañero: no el juego, el mundo.** Entrás desde
el teléfono y ves **qué pasó**: la crónica del director, cómo está tu región,
si tus guardias cobraron, si alguien se acercó. Órdenes simples: pagar la
guardia, mandar un mensaje. Encaja porque el director produce texto y eventos,
que es lo que un browser muestra bien y un motor 3D muestra mal — y porque
**no ganás nada por mirar, te enterás**, así que extiende la sesión sin agregar
un gramo de grindeo.

### 12.5 Salir al mercado

**Steam sí. Kickstarter primero, no.**

Kickstarter no está muerto —2024 fue el mejor año desde 2015, con 83% de éxito—
pero **dejó de ser una herramienta de descubrimiento y pasó a ser una de
conversión**. Las campañas que fondean hoy son de estudios cuya audiencia ya
existía. Todavía no hay público, así que no es el primer paso.

Y hay un choque de fondo: una campaña te obliga a **prometer el universo
terminado por adelantado**, que es exactamente el modo de falla de Ashes.

**El orden que sí:**

| Paso | Para qué |
|---|---|
| Página de Steam + devlog | Juntar wishlists desde el día uno. Es gratis y puede subir hoy. |
| Clips de historias emergentes | El activo de marketing y la validación son la misma cosa: un momento donde el mundo hizo algo que nadie escribió. |
| Demo en Next Fest | El pico de wishlists para un indie desconocido. |
| Early Access | Ingresos de una build real, y el roadmap lo tira la comunidad. |
| Crowdfunding (opcional, al final) | Recién acá, como conversión de un público que ya existe. |

Ninguna de las dos primeras antes de que **alguien que no seamos nosotros vuelva tres
días seguidos.**

---

## 13. Cómo se trabaja

Reglas operativas, no de diseño. Son igual de firmes.

- **Los dos repos son públicos y no se filtra nada.** Ni claves, ni tokens, ni
  cadenas de conexión. Antes de cada push se revisa. Ya casi se nos escapa una
  contraseña de base en `supabase/.temp/pooler-url`.
- **La infraestructura no se le devuelve al usuario.** Los CLI de Supabase,
  Vercel y GitHub están logueados. Crear proyectos, correr migraciones y
  desplegar es trabajo nuestro. La única excepción legítima es un OAuth
  inicial.
- **No frenar.** Cuando la dirección del proyecto no está, se avanza: lo que no aceptó, se da por
  aceptado. Volver con trabajo hecho, no con preguntas.
- **Usar lo último y lo mejor que haya.** Vale para modelos, motor, skills,
  hooks y herramientas. Si hay algo mejor que lo que estamos usando, se busca y
  se cambia.
- **El costo de la API se mide, no se estima.** Hoy el default es
  `claude-haiku-4-5`. Ya encontramos que la densidad de una crónica era un
  problema de prompt y no de modelo: bajó 8× el costo sin perder calidad.
- **Medí antes de afirmar.** Este proyecto ya tuvo tres veces la conclusión
  obvia equivocada.
- **Lo que no queda en un archivo, se perdió.** Los agentes arrancan en blanco
  siempre. La memoria del proyecto son estos documentos y los `CLAUDE.md`.

---

## 14. Los cuatro invariantes

No se negocian. Existen porque sin ellos el proyecto se convierte en otra cosa
sin que nadie lo note.

**1. `lib/world/tick.ts` nunca importa el SDK de IA.**
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

## 15. La pregunta sin contestar

**¿El director de IA es divertido?**

Cuatro personas, siete días, dos preguntas: ¿vuelven al otro día sin que se lo
pidas? ¿pueden contar una historia del mundo que nadie escribió?

Hay evidencia parcial: en el tick 10 murió la vieja Ren y se llevó las dos
runas del valle. Nadie lo guionó. Falta saber si a otro le importa.

**Todo lo que construimos está apostado a que la respuesta sea que sí.** Vale
la pena tenerlo presente cada vez que se agrega algo grande.

Y el modo de falla que la acompaña tiene nombre: **Dwarf Fortress**. Simula
todo esto desde hace veinte años sin IA, y su mundo es fascinante para leerlo y
casi imperceptible para jugarlo. La gente se enamora de las historias contadas
en Reddit, no vividas en pantalla. **Simular es barato; lo caro es que el
jugador lo perciba.** El director no hace pasar las cosas: las cuenta, las
encuadra y las pone donde las veas.

---

## 16. Lo que falta decidir

### Las tres que bloquean. **Las contesta la dirección del proyecto.**

Ninguna la resuelve un agente por su cuenta, y las tres bloquean trabajo que ya
está empezado.

**Queda una.** Las otras dos se cerraron el 17 de agosto y están en §6: el
**piso de zoom** (silueta, postura y ropa, nunca la expresión) y la **dirección
de arte** (estilizado, y comprometido). **No las reabras.**

| # | Decisión | Por qué bloquea | Recomendación sobre la mesa |
|---|---|---|---|
| 1 | **Control o teclado** | Cambia el sistema de magia **desde la raíz**. Dibujar runas con un stick es horrible. No es una opción de accesibilidad que se agrega después. | Si va control, la magia son **secuencias o radiales, nunca trazos**. |

> **Por qué la dirección de arte sale de esta tabla.** El renglón decía:
> *"ningún agente sostiene una dirección de arte: no es una tarea, es un
> criterio"*. Ése era el problema real, y ya no está — **el criterio está
> escrito** (§6: estilizado; el color decide separación, no imita materiales; la
> silueta hace el trabajo) y **tiene instrumento y dueño**: la paleta, y el
> agente `arte`, que es el único que decide un color.
>
> Lo que queda abierto es más chico y es de gusto, no de criterio: alguien con
> ojo mirando capturas y diciendo *más de esto, menos de aquello*. Eso no
> bloquea a nadie hoy, y **por eso deja de ser un bloqueante y pasa a ser
> trabajo normal.** La coherencia sigue siendo lo que se lee como "muy lindo",
> y ahora hay dónde sostenerla.

> **Lo que enseñó cerrar la del zoom.** Estuvo abierta meses porque nadie la
> sentía urgente, y mientras tanto la rama de arte no podía arrancar: su propio
> agente tenía escrito que no trabajaba sin eso. **Una decisión abierta no
> cuesta cero: cuesta todo lo que está esperándola.** Cuando una de estas dos
> tenga una rama parada atrás, se cierra con la recomendación de la tabla.

### Lo que se decide con evidencia, no ahora

No bloquean nada hoy. Están anotadas para que no se tomen por descuido cuando
llegue el momento.

- **Rioplatense o español neutro.** Ya dio un problema real: *"habla mucho como
  argentino"*, un valle entero de porteños. Elegirlo después de mil líneas de
  prompt cuesta. La salida probable es que el tono del mundo sea uno y la
  variación esté en la voz de cada persona, no en el país.
- **Duración del eco.** Es la principal variable de costo de IA y también de
  densidad social: ecos eternos llenan el mundo de gente que no está, ecos
  cortos lo vacían de noche. La recomendación es que lo sostenga alguien —un
  NPC al que le pagás, o el pueblo si le sirve— y se mide con gente adentro.
- **Cadencia de acontecimientos.** Cada dragón es trabajo autoral para siempre,
  mientras el juego viva: es un compromiso de operación en vivo, no una feature
  que se termina. Pocos y grandes, disparados por umbrales del mundo. **Nunca
  calendario fijo: eso los convierte en rutina.**

*Cuatro preguntas que estuvieron acá mucho tiempo y ya están contestadas, para
que nadie las reabra:* **"Friere" era Frieren** (§4), no Feist ni Paulo Freire.
**La progresión está resuelta** en §8.3: sin techo en lo que sabés, límite
natural en lo que llevás, y mejora en lo que usás. **El piso de zoom está
decidido** en §6: silueta, postura y ropa; sin caras modeladas. Y **el look está
decidido** en §6: estilizado y comprometido — el problema nunca fue la simpleza,
fue la indecisión.

---

## 17. Ideas muertas — no las revivas

Cada una de estas se propuso, se discutió y se descartó. Están acá para que
nadie las vuelva a proponer como si fueran nuevas.

| Idea | Por qué murió | Última posición |
|---|---|---|
| **"Lo tuyo es inviolable"** | Se propuso para sacar la ansiedad del full-loot. la dirección del proyecto la rechazó: *"No es inviolable lo mío, tendré amigos jugando, NPCs contratados que defiendan, si pierdo pierdo."* | **Nada es inviolable.** La defensa es social, no normativa (§2). |
| **Archipiélago de islas sueltas** | la dirección del proyecto lo cortó: *"no sólo archipiélagos, es un mundo que se va haciendo procedural y va creciendo."* | Mundo contiguo que se abre por presión de población (§7.4). |
| **Tiempo 4× más rápido para el conectado** | Habría inventado el grindeo por la puerta de atrás: estar conectado valdría 4×, y los mundos populares dejarían congelados a los solitarios. Fue una mala lectura de lo que Se pidió. | Normal para todos si hay alguien, lento si no hay nadie (§7.3). |
| **Costura sin cortes entre regiones** | Server meshing. Star Citizen. | Bordes con transición (§7.2). |
| **Vender o transferir el personaje** | Rompe la escasez del saber, y las relaciones no se transfieren igual. | Se traspasa **la posición**, no la persona (§12.2). |
| **Kickstarter como primer paso** | Es conversión, no descubrimiento, y obliga a prometer el universo terminado. | Steam + wishlists primero (§12.5). |
| **El cliente web como el juego** | `lib/mapa.ts` — 600 líneas de Three.js con caminar, presencia y combate. Se estiró mensaje a mando y no convergía; el navegador no da personajes animados, ni assets, ni Steam. | **Muerto.** El cliente es Godot. `saber-escaso.vercel.app` pasa a ser landing + descarga. `lib/mapa.ts` y la ruta `/mapa` siguen vivos en el repo y hay que darlos de baja (ver backlog). |
| **Presupuesto de habilidad con casilleros** (estilo Ultima Online) | Se propuso para evitar la progresión vertical, y es jerga de RPG que no hacía falta. la dirección del proyecto: *"me pierdo acá."* El objetivo era bueno; la forma, no. | Tres reglas sin jerga: sin techo en lo que sabés, límite natural en lo que llevás, mejora en lo que usás (§8.3). |
| **NPCs de conversación libre** | Se hablan una vez, se descubre el chatbot, no se les vuelve a hablar. | Dos líneas del estado real y opciones que hacen algo (§9.4). |
| **`eve` de Vercel para el director** | Se evaluó a pedido de la dirección del proyecto. El director es una llamada sin estado, no un agente durable: no aporta y suma una dependencia. | **No se usa.** Si vuelve a proponerse, que sea con un caso nuevo. |
| **"Los 100 agentes"** | El número no significaba nada. | **Una rama por responsabilidad real**, y son **internas de desarrollo, no NPCs**. |
| **Unity** | La biblia lo recomendaba por asset store y networking. Se eligió Godot y ya hay un cliente andando. | **Godot 4.7.** Los dos exportan a mobile, así que la puerta sigue abierta. |

**Una tensión que sigue abierta y no hay que fingir que se resolvió.** la dirección del proyecto
pidió *"un MVP pero debe tener todo lo que pedimos al origen"*. La respuesta
fue: **MVP del bucle sí** (un vertical slice donde todos los sistemas estén en
su versión más flaca), **MVP de la lista de features no** — "un poco de todo"
se convierte siempre en "todos los sistemas a profundidad media", y eso son
tres años. Es literalmente el camino de Ashes. Las dos frases conviven; cada
vez que se prioriza, reaparece.

---

## 18. Cómo se decide cuando esto no alcanza

En orden:

1. **¿Rompe un invariante?** Entonces no, y se propone otra cosa.
2. **¿Está en las ideas muertas (§17)?** Entonces no se reabre sin un argumento
   nuevo.
3. **¿Tiene vida o tiene sentido?** *No hacemos por hacer.* Todo lo que se
   pone en el mundo o está vivo o significa algo. El cielo casi entra como
   decoración y se salvó porque se le encontró un para qué: el sol es el reloj.
4. **¿Hace que el saber escaso se sienta más?** Entonces sí, casi siempre.
5. **¿Le da algo a las tres formas de jugar (§5)?** Si sólo le sirve al que
   pelea, falta la mitad.
6. **¿Deja algo jugable esta misma noche?** Si no, se parte en algo que sí.
7. **¿Es grindeo disfrazado?** Si la mecánica se resuelve repitiendo, está mal.
8. Si sigue empatado, gana lo más chico.

---

## 19. Referencias

Se copian sueltas, por eje. Nunca en paquete.

### Tono y mundo
- **Frieren** — **la referencia central.** El tono, la relación con el tiempo y
  la pérdida, los hechizos menores que valen por quién te los dio, el viaje
  entre pueblos. Ver §4. Aporta la mirada, **no la ausencia de riesgo.**
- **Malazan** — la estructura: historia enorme y fuera de cuadro, dioses con
  agenda, ninguna moral clara, la compasión como único ancla.
- **The First Law / Abercrombie** — el criterio moral: no hay lado bueno, sólo
  intereses. Y Bayaz. *Su voz sostenida no la puede hacer un modelo: usalo como
  criterio, no como narrador.*
- **Game of Thrones / Poniente** — historia vieja que pesa, casas con deudas.
- **El Señor de los Anillos** — la aventura de camaradas. La escala de la
  partida, no la del mundo.

### Vista y control
- **Minecraft / Stardew Valley** — la vista, y **quedarse a construir como
  forma legítima de jugar** (§5). Pedidas por la dirección del proyecto desde el primer día.
- **Baldur's Gate 3** — los personajes y la cámara: órbita con zoom y primeros
  planos como **modo aparte**.
- **Magicka** — ocho elementos, gramática en vez de lista de hechizos.
- **Arx Fatalis** — runas dibujadas con el mouse. Aprende el jugador. Y su modo
  de falla: descubribilidad.
- **Mordhau / Mount & Blade** — vocabulario chico y mil horas de techo de
  habilidad.
- **Diablo 2** — anti-referencia: vocabulario ancho, ejecución chata.

### Sistemas
- **Ultima Online** — sin clases: sos lo que practicás. *Su presupuesto de
  habilidad se consideró y se descartó: la limitación acá es natural, no un
  sistema de puntos (§8.3).*
- **Project Gorgon** — sin clases, misma familia.
- **EVE Online** — un universo, soberanía disputable. Y el anti-patrón: vertical
  acumulativo por tiempo real.
- **RuneScape** — anti-patrón: aprender usando, sin techo, o sea grindeo.
- **Shadow of Mordor (Nemesis)** — memoria y rencor. Ojo con la patente.
- **Dragon's Dogma** — los peones: el precedente del eco.
- **Ragnarok / Tibia** — vendedores offline. La otra mitad del eco.
- **Monster Hunter** — comida como bono, sin hambre. **Valheim**: el paso de
  más.
- **Tunic** — lengua inventada traducida por la comunidad.
- **Red Dead Redemption** — el mundo no te espera.
- **The Witcher** — la situación siempre es más complicada que el pedido.
- **Sea of Thieves** — cero progresión de poder y años de retención. Y Safer
  Seas como precedente de convivencia de públicos.
- **Wakfu** — ecosistema vivo que se agota y se repuebla. Y su colapso.
- **Dwarf Fortress** — la simulación entera resuelta sin IA. Y su modo de
  falla: invisible.

### Producción y mercado
- **Rust / Atlas** — grilla de servidores presentada como mundo continuo.
- **Star Citizen** — anti-referencia: server meshing, una década.
- **Albion Online** — prueba de que este género corre en mobile con cross-play.
  Y la advertencia: se diseñó para mobile desde el día uno.
- **Valheim** — cinco personas lo hicieron. La escala de equipo que sí existe.
- **Ashes of Creation** — el ejemplo de qué NO hacer: prometer todo, entregar
  nada jugable. Empezar simple y que el roadmap crezca con los jugadores.
- **Light No Fire** (Hello Games) — **anti-referencia, no competencia.** Sigue
  en pre-producción tras más de dos años, sin fecha, con estimaciones en 2027 o
  más allá, y apunta a un mundo del tamaño de la Tierra: escala planetaria, o
  sea la lección de Ashes con otro nombre. **Lo nuestro es lo contrario:
  regiones chicas y densas donde importa la sociedad, no el tamaño.**
