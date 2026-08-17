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
- Los primeros planos son **un modo aparte**, no una posición libre de cámara.
- La distancia lejana no es una preferencia estética: es lo que hace legible el
  trabajo del director y lo que mantiene viable mobile alguna vez.
- El entorno tiene que encantar. **La luz hace ese trabajo, no los polígonos.**

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

### 9.4 El diálogo — lo que NO se hace

**Nada de NPCs charlatanes de libre conversación.** Se hablan una vez, se
descubre que son un chatbot, y no se les vuelve a hablar.

Lo que sí: **una o dos líneas que salen de su estado real** —lo que persiguen,
lo que recuerdan de vos, si confían— y dos o tres respuestas **que hacen algo**.
Diálogo que mueve el mundo, no que lo decora. Podés escribirle lo que quieras y
te contesta en personaje, pero **el campo de texto libre no mueve estado; las
opciones sí**, y las opciones se derivan del estado, no del modelo.

---

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

| # | Decisión | Por qué bloquea | Recomendación sobre la mesa |
|---|---|---|---|
| 1 | **Piso de zoom** | Define el presupuesto de arte de todo el proyecto: resolución de texturas, LODs, y si hacen falta rigs faciales. Cada modelo que se haga antes de esto se puede tener que rehacer. | Hasta leer silueta y ropa, no la cara. Los primeros planos se autoran aparte, como modo. |
| 2 | **Control o teclado** | Cambia el sistema de magia **desde la raíz**. Dibujar runas con un stick es horrible. No es una opción de accesibilidad que se agrega después. | Si va control, la magia son **secuencias o radiales, nunca trazos**. |
| 3 | **Dirección de arte: quién** | Ningún agente sostiene una dirección de arte: no es una tarea, es un criterio. **La coherencia es lo que se lee como "muy lindo", no la novedad.** | Una persona con gusto decide y no se suelta. la dirección del proyecto o alguien que contrate. |

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

*Dos preguntas que estuvieron años acá y ya están contestadas, para que nadie
las reabra:* **"Friere" era Frieren** (§4), no Feist ni Paulo Freire. Y **la
progresión está resuelta** en §8.3: sin techo en lo que sabés, límite natural
en lo que llevás, y mejora en lo que usás.

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
