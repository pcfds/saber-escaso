/**
 * Avanza el mundo un tick. SIMULACIÓN PURA — acá no entra la IA.
 *
 * Todo lo que pasa se escribe en `events`. Si no está en `events`, no pasó, y
 * el director no lo puede contar. Esa separación es el experimento entero:
 * si algún día este archivo importa el SDK de Anthropic, se rompió.
 *
 * **Los tres únicos imports de este archivo son `../db.js`, `./combate.js` y
 * `./mercado.js`, y los dos importan sólo `../db.js`.** El invariante se rompe
 * igual de rebote que de frente, así que la cadena entera se mira antes de
 * agregar un import acá: tres archivos, un solo destino, y ninguno toca un SDK
 * de modelo.
 *
 *   pnpm tick        avanza un tick
 *   pnpm tick 7      avanza siete
 */
import { db, getRegion } from '../db.js'
// El golpe vive afuera —ver el encabezado de `combate.ts`, que explica por qué
// no espera al tick— y desde acá se llama a la MISMA función que llama
// `POST /pelear`. Hasta el 17 de agosto había una segunda copia entera adentro
// del `case 'pelear'` de este archivo: mismo daño, mismas armas, los mismos
// `summary` escritos a mano dos veces. `recordar` y `tocarVinculo` viven allá
// por el motivo que dice aquel encabezado — que el combate inmediato deje la
// misma huella que el del tick— y también estaban duplicadas acá.
//
// Y `recibirGolpe` por lo mismo, pero al revés: la pasada 4b —«y muerden»— era
// una TERCERA implementación del golpe del bicho, con otro daño, otro summary,
// sin dedupe y sin costo social de la caída. Hoy los tres caminos —el tick, el
// cliente y la web— llaman a las dos mismas funciones.
import {
  pelear, recibirGolpe, recordar, tocarVinculo as escribirVinculo, conA,
} from './combate.js'
// La plata, los precios y el mostrador. Está afuera por el mismo motivo que el
// golpe: `lib/web.ts` necesita el MISMO precio para pintar la vidriera en
// `/mundo`, y el día que el precio se calcule en dos lados, el que ves y el que
// te cobran dejan de ser el mismo número.
//
// ⚠ Nada de lo que hay ahí adentro escribe en `knows`, y no puede. Ninguna
//   transacción de este juego termina con una fila nueva de saber: se paga para
//   que alguien te HAGA algo, nunca para que te lo ENSEÑE (DISENO §9.3b).
import {
  MONEDA_DEL_VALLE, acunar, bolsaDe, cotizacion, enPlata, monedaDe, monedas,
  mostradores, pagar, precio, seFabricaTodavia, tarifas,
  type Mostrador,
} from './mercado.js'

type Ev = {
  region_id: string
  tick: number
  kind: string
  place_id?: string | null
  summary: string
  detail?: Record<string, unknown>
}

const roll = (max: number) => Math.floor(Math.random() * max)
const pick = <T>(xs: T[]): T | undefined => xs[roll(xs.length)]

// ─────────────────────────────────────────────────────────────
// EL RITMO. Un tick es un día del valle; el cron corre uno cada SEIS horas.
// ─────────────────────────────────────────────────────────────
//
// **Cuatro ticks por día real.** Eran veinticuatro hasta el 17 de agosto, y
// cuando cambió el cron nadie revisó las probabilidades: todas siguieron bien
// calibradas en tiempo de mundo y pasaron a disparar SEIS VECES MENOS SEGUIDO
// en tiempo real. Antes de tocar cualquier número de acá, hacé las dos
// cuentas — por día de mundo y por día real — o vuelve a pasar.
//
// Este renglón decía que **una acción de un jugador también dispara un tick**,
// y era cierto y era el bug: `POST /act` llamaba a `step()` sin condición, o
// sea una acción = un día del valle, y `valle-primero` corrió 28 ticks en
// 4 h 21 min. Ya no. El mundo late por vuelta del sol (`latir()` en `web.ts`)
// y **sólo** por eso: cuatro días por día real, los pida quien los pida.
//
// Lo que sí sigue pasando en el acto es la resolución de lo que mandó el
// jugador — `resolverAcciones()`, acá abajo. Son los dos relojes de
// `DISENO.md` §7.3 y hay que tenerlos separados en la cabeza: **lo que hiciste
// se resuelve ya; el día del valle lo mueve el sol.** Una acción resuelta
// fuera del tick no adelanta ni un día, así que las probabilidades de este
// archivo se siguen leyendo "por día de valle" y punto.
export const TICKS_POR_DIA_REAL = 4

// ─────────────────────────────────────────────────────────────
// EL RELOJ DEL VALLE — la hora que ya existía y nadie usaba de este lado
// ─────────────────────────────────────────────────────────────
//
// `DISENO.md` §7.3: **el sol es el reloj del mundo.** Un tick es un día y el
// cron corre uno cada seis horas, así que seis horas reales son una vuelta
// entera del sol. El cliente ya dibuja el cielo y las ventanas con esto
// (`momento_del_dia`, que sale de `web.ts`); el servidor no lo miraba para
// nada, y por eso el valle tenía reglas y no tenía rutina.
//
// **La cuenta, que es la que decide dónde vive la rutina y no es opinable:**
//
//     1 día del valle  = 6 horas reales
//     1 hora del valle = 15 minutos reales
//     la noche (22:00 a 06:00) = 2 horas reales
//
// De ahí sale todo lo demás. **Un tick no puede mandar a nadie a dormir**: el
// tick es la unidad y adentro del tick no hay horas, así que dormir un tick es
// dormir un día entero del valle. Y si el tick escribiera `place_id = su casa`
// cada noche, al otro día esa persona tendría que volver a caminar hasta donde
// estaba —y cada viaje le cuesta el día (`diaGastado`)—, o sea que nadie
// llegaría nunca a ninguna parte. Un valle donde todos vuelven a casa por
// escritura es un valle donde no pasa nada.
//
// Entonces la rutina se parte en dos, y la línea es limpia:
//
//   · **el tick piensa en días** y usa `people.place_id`, que quiere decir
//     *dónde lo dejó su jornada*. Todo lo que decide la simulación —quién se
//     cruza con quién, quién le enseña a quién, a quién muerde el bicho— sigue
//     saliendo de ahí y no cambió una coma;
//   · **la consulta piensa en horas** y usa `rutinaDe()`, que no toca la base:
//     con la hora del reloj de pared contesta dónde está y si duerme AHORA.
//
// Es la misma separación de §7.3 que ya está en `web.ts` entre `latir()` y
// `resolverAcciones()`, aplicada a las personas.

/** Una vuelta del sol: seis horas reales, un día del valle.
 *
 *  Es la MISMA constante que `latir()` y `momento_del_dia` en `web.ts` y que
 *  `DIA_REAL := 21600.0` en `ciclo.gd`. Vive acá porque el reloj del mundo es
 *  de la simulación; `web.ts` debería importarla de acá en vez de tener su
 *  copia. Ya cambió una vez de 1 hora a 6. */
export const DIA_REAL_MS = 21_600_000

/** Qué hora del valle es, 0 a 24 y con decimales.
 *
 *  Los bordes del bloque caen a las 00, 06, 12 y 18 UTC —la época Unix arranca
 *  a medianoche— y es exactamente cuando dispara el cron. O sea que **el tick
 *  del cron cae a medianoche del valle**: el día se cierra cuando la gente ya
 *  se acostó, que es la hora correcta para preguntar quién no volvió a su casa.
 *  (El que empuja un jugador cae en la primera visita del bloque nuevo, así que
 *  puede ser un rato más tarde. Nada del cierre del día depende de la hora
 *  exacta: depende de dónde quedó cada uno.)
 *
 *  El cero es la medianoche del valle. Si algún día el cielo del cliente dijera
 *  otra cosa —que el bloque arranca al amanecer, por ejemplo— se corrige acá y
 *  en un solo número, no repartido por el archivo. */
export function horaDelValle(ms: number = Date.now()): number {
  return ((ms % DIA_REAL_MS) / DIA_REAL_MS) * 24
}

/** Lo que la rutina necesita saber de una persona. */
export type ConRutina = {
  place_id: string | null
  home_place_id: string | null
  jornada_desde: number
  jornada_hasta: number
}

/** ¿Está en pie a esta hora?
 *
 *  `hasta` puede ser MENOR que `desde`, y eso no es un error de datos: es una
 *  jornada que cruza la medianoche, o sea el guardia (18 a 6). Sin este caso el
 *  que trabaja de noche no existe, y el guardia haciendo lo contrario que todos
 *  es la mitad de lo que hace que un pueblo tenga horarios. */
export function despiertoA(hora: number, desde: number, hasta: number): boolean {
  return desde <= hasta
    ? hora >= desde && hora < hasta
    : hora >= desde || hora < hasta
}

/** Dónde pasa la noche.
 *
 *  En su casa, salvo que la jornada lo haya dejado en un lugar salvaje: del
 *  Sotobosque y de la Casa Quemada no se vuelve al oscurecer, se acampa. Eso es
 *  lo que hace que «no volvió a dormir» sea un hecho y no una frase — y es la
 *  única forma en que alguien duerme fuera de su cama.
 *
 *  Quien esté de visita en un lugar donde sí se puede volver —la aldea, el
 *  camino, la fragua— se vuelve a su casa y no cuesta nada: son doce casas
 *  apretadas contra el recodo del río, no un continente.
 *
 *  Sin casa (`home_place_id` en null, que es una región vieja sin migrar)
 *  duerme donde está. Degrada a lo de antes y no se rompe nada. */
export function dondeDuerme(
  p: ConRutina, places: { id: string; kind: string }[],
): string | null {
  const casa = p.home_place_id ?? p.place_id
  if (!p.place_id || p.place_id === casa) return casa
  const kind = places.find((l) => l.id === p.place_id)?.kind
  return kind === 'bosque' || kind === 'ruina' ? p.place_id : casa
}

/**
 * Dónde está y qué le pasa a esta persona AHORA MISMO.
 *
 * **Se resuelve al consultar, nunca al tickear**, por el motivo largo de arriba:
 * la hora es continua entre ticks y el tick es un día entero. No lee ni escribe
 * la base — es una función de la fila que ya tenés en la mano y del reloj.
 *
 * La usan `/mundo` (para que el cliente dibuje a la gente donde de verdad está)
 * y `resolveAction()` (para que el jugador pueda hablarle a quien ve, y sólo a
 * quien ve). **Las dos tienen que usar la misma o el mundo miente**: dibujar a
 * Bruno durmiendo en la fragua y que el servidor lo tenga en la aldea es la
 * clase de diferencia que convierte al cliente en teatro.
 *
 * Lo que devuelve, y cada campo es para algo que se ve:
 *
 *   · `place_id` — dónde está. Es `people.place_id` mientras está en pie, y su
 *     casa mientras duerme.
 *   · `durmiendo` — si está durmiendo. El cliente lo mete adentro y apaga la
 *     ventana; el que lo mira de lejos ve una casa con luz o sin luz.
 *   · `durmiendo_afuera` — duerme, y no en su casa. Es el que se quedó en el
 *     monte, y es la única forma de dormir a la intemperie que hay acá.
 */
export function rutinaDe(
  p: ConRutina,
  places: { id: string; kind: string }[],
  hora: number = horaDelValle(),
): { place_id: string | null; durmiendo: boolean; durmiendo_afuera: boolean } {
  if (despiertoA(hora, p.jornada_desde, p.jornada_hasta)) {
    return { place_id: p.place_id, durmiendo: false, durmiendo_afuera: false }
  }
  const donde = dondeDuerme(p, places)
  return {
    place_id: donde,
    durmiendo: true,
    durmiendo_afuera: donde !== (p.home_place_id ?? p.place_id),
  }
}

/** El horario de un oficio, para el que entra al valle.
 *
 *  Sale de `horarios`, que es catálogo del autor —global, como `knowledge` y
 *  `por_llegar`— y se guarda RESUELTO en la fila de la persona. Los dos pasos
 *  hacen falta: el horario es un hecho del oficio (la fragua abre temprano),
 *  pero quien lo cumple es una persona, y hay personas que no lo cumplen.
 *  Guardado en la fila, el autor le puede torcer el día a una sola sin moverle
 *  la jornada a todos los herreros del mundo.
 *
 *  Un oficio que no esté en la tabla se lleva el día de cualquiera, que es el
 *  default de la columna. No es un fallo: es el horario de quien no tiene
 *  oficio. */
async function jornadaDe(trade: string): Promise<{ desde: number; hasta: number }> {
  const { data } = await db
    .from('horarios').select('desde, hasta').eq('trade', trade).limit(1).maybeSingle()
  return { desde: data?.desde ?? 6, hasta: data?.hasta ?? 22 }
}

/** Cuánto hace que lo vimos para considerarlo ADENTRO, en milisegundos.
 *
 *  Cinco minutos de reloj de pared. El cliente 3D pega a `/mundo` cada pocos
 *  segundos, así que quien está jugando entra siempre; quien cerró el juego
 *  hace media hora, nunca. Es la ventana de la que cuelga la mordida, y por
 *  eso es corta: `DISENO.md` §9.3 dice que perder **nunca puede costarte
 *  tiempo de juego**, y con la ventana vieja (3 ticks = 18 horas reales) te
 *  desconectabas a la tarde y entrabas al otro día caído. */
const PRESENTE_MS = 5 * 60_000

/** Cuánto hace que lo vimos para considerar que la región tiene gente.
 *
 *  Doce horas: dos ticks. Sólo decide el paso del mundo, así que es larga a
 *  propósito — un mundo que se frena de golpe apenas te vas es peor que uno
 *  que tarda medio día en darse cuenta. */
const RECIENTE_MS = 12 * 60 * 60_000

/** Que se muera alguien, por tick.
 *
 *  0,8% = una muerte cada 125 días del valle = 2,9 por año de mundo. **No se
 *  movió**, y el razonamiento largo está donde se usa. */
const P_MUERTE = 0.008

/** Por debajo de esto el valle deja de ser un valle.
 *
 *  Es el MISMO tres que ya guardan las dos formas de morirse —`people.length >
 *  3` en el sorteo y `slice(0, people.length - 3)` en las salidas—, escrito acá
 *  con nombre porque los nacimientos dividen por él y un número suelto en una
 *  división es una invitación a que alguien mueva uno de los tres y no los
 *  otros dos. Los dos literales no se tocaron: cambiarlos de rebote en la
 *  tarea de los nacimientos es exactamente cómo se rompe algo que anda. */
const PISO_DEL_VALLE = 3

// ─────────────────────────────────────────────────────────────
// QUE EL VALLE NO TENGA FECHA DE VENCIMIENTO
// ─────────────────────────────────────────────────────────────
//
/** Que llegue alguien, por tick, **con el valle en el piso**. De ahí baja en
 *  línea recta hasta cero cuando la población llega al cupo de la región.
 *
 *  **Es el número que decide adónde converge la población, así que va con la
 *  cuenta hecha y con la medición de la que sale.**
 *
 *  El problema, medido y no supuesto: ocho valles de laboratorio, 250 ticks
 *  cada uno, con alguien adentro para que `pace` sea 1 y sin que ese alguien
 *  juegue. De 7,00 personas a **4,00**, y de 6,00 saberes vivos a **3,63**. Las
 *  dos curvas estrictamente decrecientes, y el piso duro de tres esperando al
 *  final. Sin jugadores, lo mismo más lento: 4,63 y 3,88. Eso es §9.2 dicho con
 *  números — *"sin nacimientos una región se despuebla monotónicamente y el
 *  saber sólo puede bajar"*.
 *
 *  **La forma: logística, no plana.** Una tasa plana no tiene equilibrio —es un
 *  paseo al azar que termina en el piso o en el infinito—, así que la
 *  probabilidad baja con la población:
 *
 *      P = P_NACIMIENTO × (cupo − vivos) / (cupo − PISO_DEL_VALLE)
 *
 *  Con `cupo = 9` (el de la región, ver la migración) y el piso en 3:
 *
 *    · con 3 vivos — 3,0% por tick, uno cada 33 días del valle;
 *    · con 7 vivos — 1,0% por tick, uno cada 100 días del valle;
 *    · con 9 vivos — cero. El valle no crece sin techo, y no hace falta un
 *      tope aparte: el tope ES la fórmula.
 *
 *  **Adónde converge, que es lo único que importa.** El equilibrio está donde
 *  esto se cruza con la mortalidad. La mortalidad medida es 0,011 por tick con
 *  jugador (0,008 del sorteo, que es plano, más las salidas, que escalan con
 *  las agendas) y 0,0095 con el valle vacío. Cruzando:
 *
 *    · con jugador — 0,03 × (9−n)/6 = 0,011 → **n = 6,8**
 *    · sin nadie   — 0,03 × (9−n)/6 = 0,0095 → **n = 7,1**
 *
 *  O sea que converge a **las siete personas con las que el valle fue
 *  escrito**, jueguen o no. El cupo de 9 no es una opinión sobre cuánta gente
 *  entra en un valle: es el número que pone el equilibrio ahí.
 *
 *  **Las dos cuentas, como manda la casa.**
 *
 *    · en tiempo de MUNDO — con el valle lleno, una llegada cada 100 días del
 *      valle: 3,65 por año, contra las 3,65 muertes por año que ya se medían.
 *      Es la misma frecuencia que la muerte, y tiene que serlo. Con el valle en
 *      cuatro, una cada 36 días.
 *    · en tiempo REAL, sólo cron — cuatro ticks por día: con el valle lleno,
 *      **una llegada cada 25 días reales**; con el valle en cuatro, una cada 9.
 *      Un valle que se vació se recompone en unos dos meses reales, que es más
 *      o menos lo que tardó en vaciarse.
 *
 *  **Y no lo frena `pace`, a propósito.** `pace` existe para que la HISTORIA no
 *  se escape mientras nadie mira. La población no es historia, es el estado del
 *  valle — la misma desviación consciente de §7.3 que ya se tomó con las
 *  amenazas, y por un motivo más fuerte: **la muerte tampoco está frenada por
 *  `pace`.** Si los nacimientos lo estuvieran, un valle sin jugadores seguiría
 *  despoblándose cuatro veces más rápido de lo que se recompone, que es
 *  exactamente el agujero que esto viene a tapar. */
const P_NACIMIENTO = 0.03

// ─────────────────────────────────────────────────────────────
// EL DÍA DE UN NPC
// ─────────────────────────────────────────────────────────────
//
/** Cuántos días de cada cinco le dedica alguien a lo que persigue.
 *
 * Un tick es un día y un NPC hace **como mucho un verbo por día**, igual que
 * el jugador. Pero no todos los días son para lo suyo: Ilde tiene una fragua
 * que atender antes de bajar a la Casa Quemada a buscar carbón. Este número
 * es esa diferencia, y no es decoración — es lo único que sostiene el ritmo
 * que ya estaba calibrado.
 *
 * **La cuenta, que es de dónde sale el 0,2 y no de la nada.** Antes una
 * agenda subía `2 + roll(8)` por tick (media 5,5) y tardaba ~18 ticks; medido
 * sobre 40 ticks con siete personas daban 13 agendas cerradas, o sea **una
 * cada 21,5 ticks por persona**. Ahora una agenda material se cierra en pasos
 * reales:
 *
 *   · juntar algo que crece — 1 viaje + ~2,4 búsquedas (en el Sotobosque la
 *     raíz sale 5 de 12 veces) = **3,4 días de trabajo**;
 *   · una meta sin objeto — 4 jornadas de `trabajar` (25 de progreso cada una);
 *   · un saber que tiene alguien cerca — 1 viaje + 1 `aprender` = 2 días.
 *
 * Con 0,2 esos 3,4 días caen cada 17 ticks, las metas sin objeto cada 20, y
 * el promedio queda donde estaba. Las dos cuentas, que es lo que faltó la
 * última vez que se movió un número acá:
 *
 *   · en tiempo de MUNDO — una agenda dura entre 10 y 20 días del valle, y
 *     cada persona actúa un día de cada cinco;
 *   · en tiempo REAL — el cron corre cuatro ticks por día, así que una agenda
 *     tarda entre dos días y medio y cinco días reales si no juega nadie. Con
 *     alguien adentro es más rápido porque cada acción suya es un tick más:
 *     unas 17 acciones. Es exactamente la ventana que tenía antes, y era la
 *     ventana que hacía falta para enterarte, cruzar el valle y volver.
 *
 * Y encima `pace` sigue multiplicando: con la región vacía es 0,05 por tick,
 * o sea un día de trabajo cada veinte días del valle (§7.3, cuatro veces más
 * lento vacío).
 */
const P_JORNADA = 0.2

/** Cuánto suma un día de trabajo en una meta que no pide nada material.
 *  Cuatro jornadas y está: "curtir lo de esta semana" no necesita más. */
const DIA_DE_TRABAJO = 25

/** Cuánto suma un día que se fue en la meta sin cerrarla: el viaje, la
 *  búsqueda que salió vacía, el día en que no se pudo hacer nada. */
const DIA_GASTADO = 8

/** Techo del progreso de una meta material o de saber.
 *
 *  **Nunca llega a 100 sumando, y eso es el cambio entero.** Una meta que
 *  pide carbón se cierra cuando hay carbón, no cuando un contador se llena;
 *  si se llenara solo volveríamos a «Sarn consiguió un filo que no se le
 *  mella» sin que nadie haya forjado nunca una hoja. Acá `progress` mide
 *  cuántos días lleva detrás de eso, nada más.
 *
 *  El 75 tiene además una consecuencia buena y buscada: `encargarse` no deja
 *  tomar agendas con progreso 80 o más, así que una meta material **siempre**
 *  se le puede encargar a un jugador. Es correcto — hasta que la cosa está en
 *  la mano nunca es tarde para traerla. */
const TECHO_MATERIAL = 75

/** Que alguien suelte la meta, por día TRABADO.
 *
 *  Existe porque ahora una meta puede fracasar de verdad. Tobio quiere ver
 *  magia de cerca y la única que sabe una runa es Ren, que no enseña: antes el
 *  contador se la daba igual y el valle anunciaba que la había visto, ahora no
 *  se la da nadie. Sin una salida, el valle se llena de gente esperando algo
 *  que no va a pasar.
 *
 *  **Cuenta sólo el día trabado, no el día que salió mal.** Buscar y no
 *  encontrar es progreso —mañana puede salir— y no acerca a nadie a rendirse;
 *  querer algo que nadie te va a dar, sí. Por eso Odila puede revolver el
 *  Sotobosque veinte días seguidos sin soltar nada.
 *
 *  Las dos cuentas. Un día trabado cae con `P_JORNADA`, o sea uno de cada
 *  cinco ticks: 8% sobre eso son ~62 ticks hasta que suelta, unos dos meses
 *  del valle y quince días reales de cron. Es mucho a propósito — rendirse
 *  rápido es peor que insistir, y una meta que se suelta en tres días no era
 *  una meta. */
const P_SUELTA = 0.08

/** Que un NPC se vuelva sin meterse cuando hay una amenaza donde iba a buscar.
 *
 *  Es medio y medio, y no es un bloqueo, a propósito. Con un bicho parado en
 *  el Sotobosque y nadie conectado para matarlo, un bloqueo duro trabaría
 *  todas las agendas de juntar del valle hasta que alguien entre a jugar. La
 *  mitad de las veces baja igual —hay que comer— y la otra mitad se vuelve.
 *  El efecto es que un lugar con algo adentro rinde la mitad, y que matar al
 *  bicho le destraba la semana a alguien. */
const P_SE_VUELVE = 0.5

/** Que aparezca una amenaza, por LUGAR VACANTE y por tick. Tope: tres vivas. */
const P_AMENAZA = 0.6

// ─────────────────────────────────────────────────────────────
// SALEN DE AVENTURA Y NO VUELVEN — los tres números de los que cuelga
// ─────────────────────────────────────────────────────────────
//
// El porqué está largo en `salir()`. Acá, las cuentas.
//
/** Que una salida se cobre al que la armó, cuando lo que hay adentro quedó
 *  ENTERO. Es el techo: lo que se tira de verdad es esto multiplicado por
 *  cuánta vida le quedó al bicho después del golpe, y dividido si fueron dos.
 *
 *  **Es el número más delicado del archivo y por eso va con la cuenta hecha.**
 *  Un valle de siete personas sin nacimientos no aguanta una segunda causa de
 *  muerte del tamaño de la primera: `P_MUERTE` ya se lleva 2,9 por año de
 *  mundo, o sea el pueblo entero en dos años y medio. Esto tiene que ser un
 *  agregado chico y con nombre, no una segunda guadaña.
 *
 *  Las cuentas están MEDIDAS y no estimadas: dos brazos de ocho valles recién
 *  sembrados, 250 ticks cada uno (2.000 por brazo), con alguien adentro para
 *  que `pace` sea 1 y sin que ese alguien juegue.
 *
 *    · **salidas** — 67 en 2.000 ticks, **0,034 por tick**. Una salida es el
 *      día en que alguien se pone en camino a un lugar salvaje donde hay algo
 *      parado, y eso pasa una vez por meta y no una vez por día: el que ya está
 *      allá acampa y busca, y ése es el camino viejo, que no se tocó. Son doce
 *      por año de valle —una por mes de mundo— y una cada siete días y medio
 *      reales.
 *    · **lo que cuestan** — 7 de esas 67 no volvieron, **10,4% por salida**
 *      (esperado 7,6% con este número: 0,10 por el 76% de vida que le queda en
 *      promedio a la cosa después del golpe; con siete casos, la diferencia
 *      cabe entera en el ruido).
 *    · **por año de MUNDO** — 1,3 personas, contra las 2,9 que ya se llevaba el
 *      sorteo. Medido: el valle pasa de 2,92 muertes por año (16 en 2.000
 *      ticks, clavado en `P_MUERTE`) a **3,65** (20 en 2.000), o sea +25%. A
 *      cambio, **35% de las muertes del valle dejaron de ser una moneda y
 *      pasaron a tener un porqué que se puede contar.** Ése es el canje entero
 *      de esta tarea, y si algún día se decide que fue caro se baja este número
 *      y no se toca nada más.
 *    · **por mes REAL** — cuatro ticks por día, 120 ticks al mes: 4,0 salidas y
 *      **0,42 personas por mes**, contra las 0,96 que se lleva el azar.
 *    · **hasta dónde se vacía** — a ningún lado nuevo: las salidas respetan el
 *      mismo piso que la pasada 4 (no se llevan a nadie con tres vivos), así
 *      que el valle baja hasta tres y ahí se queda, con esto y sin esto. Lo que
 *      cambia es cuánto tarda en llegar: de siete a cuatro son 1,03 años de
 *      valle (3,1 meses reales) contra 0,82 (2,5 meses). Medido a los 250
 *      ticks: 40 de 56 personas vivas en el brazo viejo, 36 de 56 en el nuevo.
 *      Que el valle se encoja igual sin jugadores no lo arregla esto: lo
 *      arreglan los nacimientos, que no existen (§9.2).
 *
 *  Y hay una cuenta más que no aparece en ninguna tabla y es la mejor de todas:
 *  **este número baja solo cuando alguien juega.** Una salida sólo es peligrosa
 *  si en el destino quedó algo parado, así que el jugador que limpia el
 *  Sotobosque le baja la mortalidad al valle sin que nadie se lo pida — y los
 *  propios NPCs empezaron a hacerlo, despacio: nueve amenazas muertas a manos
 *  de gente del valle en los mismos 2.000 ticks, donde antes eran cero y los
 *  bichos vivían para siempre. Lo medido de arriba es el techo.
 *
 *  Lo que NO se hizo, y es a propósito: subirlo para que se vea en una corrida
 *  corta. Es el mismo callejón que ya está escrito en la pasada 4 — no hay
 *  número que sea sano en tiempo de mundo y a la vez probable en veintiocho
 *  días de mundo. Lo que se ve seguido no es la muerte, es la salida: la pelea,
 *  el que dijo que no, y el bicho que a veces cae. */
const P_NO_VUELVE = 0.10

/** Entre cuánto se divide el riesgo cuando van de a dos.
 *
 *  «La gente entra de a dos o no entra» es la descripción del Sotobosque en el
 *  `seed`, y esto es esa frase hecha número. Cada uno de los dos corre un
 *  tercio del riesgo que corría el que iba solo, así que el par pierde a
 *  alguien 2/3 de las veces que lo perdería el que va solo: **acompañarse
 *  conviene, y de paso reparte a quién le toca.** Que el que no vuelva pueda
 *  ser el que fue de favor es la mitad de la historia. */
const RIESGO_DE_A_DOS = 3

/** Que te acompañen a un lugar donde hay algo, cuando el que te lo pide no te
 *  registra. Es la base de la misma cuenta que `P_TE_LO_DA` —sube con el
 *  vínculo, `+ valued/80`— recortada entre 5% y 70%.
 *
 *  Es menos de la mitad que `P_TE_LO_DA` y el tope es más bajo, porque lo que
 *  se pide es otra cosa: darle un frasco al vecino cuesta una tarde, meterse
 *  en la Casa Quemada con él puede costar todo. Con `TOPE_DE_TRATO` en 20, el
 *  trato de todos los días te lleva de 15% a 40%; el que te debe haberle
 *  enseñado lo suyo (+20) llega a 65%. **A un desconocido casi nadie lo
 *  acompaña, y ésa es la idea.** */
const P_TE_ACOMPANA = 0.15

// ─────────────────────────────────────────────────────────────
// PEDIRLE ALGO A ALGUIEN — los dos números de los que cuelga
// ─────────────────────────────────────────────────────────────
//
/** Hasta dónde sube el aprecio entre dos NPCs por el solo hecho de tratarse.
 *
 *  Vivir en el mismo cuarto te lleva de "no te conozco" a "te conozco", y ahí
 *  se termina. Lo que sigue hay que hacérselo ganar: darle algo, enseñarle,
 *  aparecer con lo que necesitaba. Es la misma escalera que del lado del
 *  jugador (`UMBRAL_ENCARGO` → `UMBRAL_ENSENAR`) y existe por el mismo motivo —
 *  sin tope, en trescientos ticks Ilde y Bruno se quieren con 100 sin que haya
 *  pasado nada entre ellos, y entonces pedir deja de costar. */
const TOPE_DE_TRATO = 20

/** Que te den lo que pediste cuando el que te lo puede dar ni te registra.
 *
 *  Es la base de una cuenta que sube con el vínculo: `P_TE_LO_DA + valued/80`,
 *  recortada entre 10% y 90%. Con `TOPE_DE_TRATO` en 20, el trato de todos los
 *  días te lleva de 30% a 55%; de ahí para arriba hay que haberle hecho algo a
 *  esa persona.
 *
 *  **Nunca llega a 1 y nunca llega a 0, y las dos puntas importan.** Un
 *  intercambio garantizado convierte a los otros seis en una tienda con caras;
 *  un "no" garantizado convierte el valle en siete personas que no se hablan.
 *  Un "no" es contenido: queda en `memories`, el vínculo baja, y el que lo
 *  recibió puede volver mañana.
 *
 *  Las dos cuentas, y son medidas y no estimadas. Pedir sólo se llega a pedir
 *  cuando a alguien le falta algo FABRICADO que no sabe hacer —una o dos
 *  personas del valle a la vez— y cada una actúa un día de cada cinco
 *  (`P_JORNADA`). Sobre 660 ticks de cuatro valles: **18 pedidos contestados,
 *  11 con un sí y 7 con un no.**
 *
 *    · en tiempo de MUNDO — un pedido contestado cada 37 días del valle, una
 *      entrega cada 60. Es raro y tiene que serlo: si un NPC recibiera un
 *      regalo por semana, recibir dejaría de significar algo.
 *    · en tiempo REAL, sólo cron — cuatro ticks por día: una entrega cada
 *      quince días reales con el valle vacío, y bastante más seguido con
 *      alguien jugando, porque el mundo late igual pero las metas se cierran
 *      más rápido.
 *
 *  El 61% de síes es más alto que el 30% de arranque, y ahí se ve la forma que
 *  se buscaba: el primer pedido a un desconocido casi siempre sale mal, y el
 *  vínculo que dejan las charlas es lo que lo da vuelta. Insistir sirve. */
const P_TE_LO_DA = 0.30

/** Cuánto más probable es que se vaya el último que sabe algo.
 *
 *  No cambia CUÁNTAS muertes hay, sólo cuál. Ver `elQueSeVa`. */
const PESO_DEL_ULTIMO = 3

/** Un saber que produce algo, y dónde. Vive en `knowledge`, no en una tabla
 *  de recetas: la receta no es un objeto que se pueda robar ni copiar — es
 *  parte de lo que alguien sabe, y se muere con esa persona. */
type Receta = { name: string; makes: string; makes_at: string }

// ─────────────────────────────────────────────────────────────
// LA LÍNEA QUE SOSTIENE EL JUEGO ENTERO
// ─────────────────────────────────────────────────────────────
//
// **Un objeto sólo existe si alguien vivo sabe hacerlo.** No hay tienda, no hay
// drops, no hay receta tirada en un cofre. Cuando se muere el último que sabe
// forjar, no vuelve a haber una hoja nueva en el valle. Nunca.
//
// `buscar` no rompe esa regla, y hay que entender exactamente por qué o la
// próxima persona que toque este archivo la rompe sin darse cuenta:
//
//   · La raíz CRECE SOLA. El hierro que quedó en la Casa Quemada estaba ahí
//     antes que nadie. Nadie los fabrica, así que no hay saber que perder ni
//     saber que exigir: **la raíz la junta cualquiera.**
//   · El frasco NO crece. Sale de las manos de alguien que aprendió a destilar,
//     y el día que se muera esa persona no hay más frascos. **El destilado lo
//     hace sólo el que sabe destilar.**
//
// La línea está escrita en los datos, no en un comentario: **un objeto con
// `made_by = null` es uno que nadie hizo.** Es la ÚNICA forma en que algo entra
// al mundo sin que alguien sepa hacerlo, y sólo la produce esta tabla. Todo lo
// demás pasa por `trabajar`, que exige `knows` + el lugar correcto.
//
// Si alguna vez agregás algo acá, la pregunta es una sola: ¿esto crece, se
// cae o quedó ahí? Si la respuesta es "lo hace alguien", no va acá — va a
// `knowledge.makes`.
//
// La fragua no aparece a propósito. Es donde se HACE, no donde se junta, y que
// `buscar` devuelva nada ahí es lo que le enseña la diferencia al jugador.
const LO_QUE_DA_EL_LUGAR: Record<string, { kind: string; peso: number }[]> = {
  // Crece solo, y es lo que Odila viene persiguiendo desde el primer día.
  bosque: [
    { kind: 'raíz del Sotobosque', peso: 5 },
    { kind: 'rama de roble', peso: 3 },
    { kind: 'hongo de tronco', peso: 2 },
  ],
  // Lo que dejó el fuego. Lo que sobrevive a un incendio es el material, no el
  // objeto: de las vigas queda carbón y de las herraduras, hierro sin forma.
  ruina: [
    { kind: 'carbón', peso: 4 },
    { kind: 'hierro viejo', peso: 3 },
    { kind: 'ceniza', peso: 2 },
  ],
  // Piedra del pedregal y lo que crece al borde. Poco: es un camino.
  camino: [
    { kind: 'piedra de afilar', peso: 3 },
    { kind: 'hierba del borde', peso: 3 },
  ],
  // Casi nada, y el "casi nada" es el mensaje: en la aldea se hace y se habla.
  aldea: [
    { kind: 'caña de la orilla', peso: 2 },
    { kind: 'lino en rama', peso: 2 },
  ],
}

/** Cuántas veces de cada diez volvés con las manos vacías.
 *
 *  Sin esto `buscar` es una máquina expendedora: apretás y sale. Que a veces
 *  no salga nada es lo que hace que traer la raíz sea traer algo. */
const NO_HAY_NADA: Record<string, number> = {
  bosque: 2, ruina: 3, camino: 5, aldea: 6,
}

/** En qué TIPO de lugar se junta esto, si es que se junta en alguno.
 *  `null` es "no se junta, alguien lo hace". */
function tipoQueDa(kind: string): string | null {
  for (const [tipo, tabla] of Object.entries(LO_QUE_DA_EL_LUGAR)) {
    if (tabla.some((t) => t.kind === kind)) return tipo
  }
  return null
}

/** Lo que sale de revolver un lugar, o `null` si no salió nada.
 *
 * **La usan el jugador y los NPCs, y por eso está acá afuera.** Que Ilde
 * vuelva vacía de la Casa Quemada tiene que salir del mismo sorteo con los
 * mismos pesos que cuando vuelve vacío el jugador, o no están jugando al
 * mismo juego. El "nada" es una entrada más del sorteo, no un chequeo aparte.
 */
function loQueSale(kindDeLugar: string): string | null {
  const tabla = LO_QUE_DA_EL_LUGAR[kindDeLugar]
  if (!tabla) return null
  let n = roll(tabla.reduce((s, t) => s + t.peso, 0) + (NO_HAY_NADA[kindDeLugar] ?? 3))
  for (const t of tabla) {
    if (n < t.peso) return t.kind
    n -= t.peso
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// La confianza: cuánto hay que ganarse cada cosa
// ─────────────────────────────────────────────────────────────
//
// Estaba regalado. Con `aprender` en 10, hablar dando +2 y trabajar +4, eran
// TRES acciones y ya te enseñaban el oficio. Quien lo jugó lo dijo apenas lo
// tocó: *"me deja aprender ya pero recién me pidió algo, no tengo tanta
// confianza"*. El saber es el corazón del juego y no puede costar una tarde.
//
// Y ahí está la forma correcta, que la dijo el jugador sin querer: **primero te
// piden algo, después te enseñan.** Por eso son dos umbrales y no uno, y el de
// abajo es el que abre el camino al de arriba.
//
// Con los números de hoy (hablar +2, trabajar +4, fabricar +6, encargarse +4,
// cumplirle la agenda +25):
//
//   · Camino diseñado — 3 charlas (6) + encargarse (4) + traerle lo que
//     necesitaba (25 + calidad) = 36. Seis acciones, seis días del valle, y un
//     viaje al Sotobosque en el medio.
//   · Sin encargos — nueve jornadas trabajando delante suyo, o seis cosas
//     fabricadas donde te vea, o dieciocho charlas.
//
// Un tick es un día y el cron corre uno cada seis horas, pero además cada
// acción del jugador dispara un tick (`web.ts`), así que esto se mide en
// acciones, no en horas de reloj.
export const UMBRAL_ENCARGO = 5
export const UMBRAL_ENSENAR = 35

/** A partir de acá te tienen miedo, y el miedo hace cosas.
 *
 * El vínculo es de **dos ejes y no una barra** (DISENO §9.3) justamente para
 * poder expresar "no te valoran y te temen": *te sonríen de frente y conspiran
 * atrás*. Este número es dónde empieza ese cuadrante.
 *
 * Hoy lo miran dos cosas: la ficha del jugador —`vos.gente[].teme`, que es cómo
 * el juego te dice que alguien te tiene miedo sin mostrarte un número— y
 * `case 'pedir'`, donde alguien que te teme te entrega lo que tiene en la mano
 * aunque no te aprecie. Estaba escrito como un 25 pelado en `web.ts`; un umbral
 * que abre comportamiento vive donde viven los otros dos o se despega el día
 * que alguien mueva uno.
 */
export const UMBRAL_MIEDO = 25

/** Cómo te ve alguien, dicho como se dice en el valle.
 *
 * **Nunca un número, nunca un porcentaje.** Un jugador tiene que poder saber
 * cuánto le falta sin ver una barra: la diferencia entre "te ubica, nada más"
 * y "empieza a confiar" se siente, y los dos saltos que importan además se
 * anuncian solos en `events` (ver `tocarVinculo`).
 *
 * Los cortes son los umbrales de verdad, no adornos: si movés un umbral, la
 * escalera se mueve con él y nadie tiene que acordarse de sincronizar dos
 * listas de números.
 */
export function comoTeVe(valued: number): string {
  if (valued < 0) return 'te tiene bronca'
  if (valued === 0) return 'todavía no te conoce'
  if (valued < UMBRAL_ENCARGO) return 'te ubica, nada más'
  if (valued < UMBRAL_ENSENAR - 17) return 'empieza a confiar'
  if (valued < UMBRAL_ENSENAR) return 'te tiene fe'
  return 'te confiaría lo suyo'
}

/** Cuánto sube la destreza esta vez.
 *
 * Rendimientos decrecientes a propósito. Las primeras diez veces que forjás
 * mejorás muchísimo; de 80 para arriba cada punto cuesta. Sin esa curva,
 * practicar se vuelve una tarea con barra de progreso — o sea, grindeo — y lo
 * que queremos es que valga la pena las primeras veces y después sea oficio.
 */
function mejora(destreza: number): number {
  return Math.max(1, Math.round((100 - destreza) * 0.11))
}

/** La calidad de lo que sale de tus manos.
 *
 * Es donde la destreza se vuelve visible para los demás: una hoja mejor pega
 * más fuerte y el que la recibe ve quién la hizo. El azar queda —un día te
 * sale mejor que otro— pero centrado en lo que sabés hacer, no reemplazándolo.
 */
function calidad(destreza: number): number {
  return Math.max(5, Math.min(100, Math.round(destreza * 0.85 + 8 + Math.random() * 22)))
}

// ─────────────────────────────────────────────────────────────
// LO QUE MANDÓ EL JUGADOR — se resuelve YA, no cuando cierre el día
// ─────────────────────────────────────────────────────────────
//
// `step()` hacía dos cosas pegadas: resolver las acciones de los jugadores y
// correr un día del mundo. Cuando el tick pasó a latir por vuelta del sol,
// frenó las dos, y la primera no tenía por qué frenarse: una acción tardaba
// **hasta seis horas reales** en pasar. Eso mata el bucle chico de `DISENO.md`
// §10.3 —aprendés → fabricás → regalás → te ganás a la gente → te enseñan
// más— porque `aprender`, `ensenar`, `trabajar`, `buscar`, `dar` y
// `encargarse` pasan todos por `/act`.
//
// El precedente está escrito en el encabezado de `world/combate.ts` y es el
// mismo razonamiento: el jugador aprieta, no pasa nada durante horas, y vuelve
// a creer que el mundo es teatro del cliente. El golpe se sacó del tick por
// eso; esto es lo mismo para los otros ocho verbos.
//
// **Y no toca el reloj del mundo.** Resolver una acción no incrementa
// `regions.tick` ni corre agendas, muerte ni rumores. Eso lo sigue moviendo el
// sol. Son los dos relojes de §7.3, y estaban conflatados en una función.
//
// QUE NO SE RESUELVA DOS VECES
//
// La misma acción la puede agarrar el pedido del jugador y el barrido del
// cron. El seguro es el **reclamo atómico**, y va ANTES de resolver, igual que
// el `upsert` en `ticks` que hace `latir()`: se escribe `resolved_tick` con un
// `UPDATE ... WHERE resolved_tick IS NULL`, que en Postgres es una sola
// operación, y si no devuelve fila es que se la llevó otro y acá no se hace
// nada. Reclamar después de resolver sería una carrera con premio: dos
// procesos leen `null`, los dos forjan la hoja, y aparecen dos hojas.
//
// El orden reclamar→resolver elige perder una acción antes que duplicarla: si
// el proceso se muere en el medio, la acción queda sellada sin efecto y sin
// evento. Es lo mismo que eligió `latir()` y por el mismo motivo — un día de
// más es peor que un día de menos, un objeto de más es peor que uno de menos.

/** Lo que el bloque de acciones necesita del mundo. El tick ya lo tiene leído
 *  cuando llega acá y se lo pasa; la web no, y lo lee sola. */
type MundoDeAccion = {
  players: { id: string; name: string; place_id: string | null }[]
  // Los tres campos de la rutina viajan con la persona porque el jugador tiene
  // que poder hablarle a quien VE, y a esta hora quien ve puede no estar donde
  // dice `place_id`: ver `rutinaDe()`.
  people: {
    id: string; name: string; trade: string; place_id: string | null; teaches: boolean
    home_place_id: string | null; jornada_desde: number; jornada_hasta: number
  }[]
  places: { id: string; name: string; slug: string; kind: string }[]
}

async function leerMundoDeAccion(regionId: string): Promise<MundoDeAccion> {
  return {
    players: (await db.from('players')
      .select('id, name, place_id').eq('region_id', regionId)).data ?? [],
    people: (await db.from('people')
      .select('id, name, trade, place_id, teaches, home_place_id, jornada_desde, jornada_hasta')
      .eq('region_id', regionId).eq('alive', true)).data ?? [],
    places: (await db.from('places')
      .select('id, name, slug, kind').eq('region_id', regionId)).data ?? [],
  }
}

export type Resuelta = { verb: string; target: string | null; outcome: string }

/**
 * Resuelve las acciones encoladas que todavía no resolvió nadie.
 *
 * Dos llamadores y una sola implementación:
 *
 *   · `POST /act` en `web.ts`, con `soloJugador`, apenas encola la acción. Es
 *     el camino normal y el que hace que apretar un botón tenga efecto ahora.
 *   · `step()`, sin filtro, como bloque 1 del tick. Sigue existiendo porque el
 *     cron tiene que cerrar lo que nadie resolvió: una lambda que se murió a
 *     mitad, un cliente que perdió la respuesta, una acción de un jugador que
 *     se fue. Si la web resolvió todo, este barrido no encuentra nada y no
 *     escribe nada.
 *
 * `tick` es con qué tick se sellan `resolved_tick` y los eventos, y **no es el
 * de `regions` sino el siguiente**. La razón está en `POST /pelear` y es la
 * misma: el director narra con `.gt('tick', last_seen)` y después deja
 * `last_seen = region.tick`, así que un evento escrito con el tick actual —el
 * último día ya CERRADO— cae en un agujero de la ventana y el jugador nunca se
 * entera de lo que hizo. Una acción que pasa ahora pasa durante el día en
 * curso, que es el que va a cerrar el próximo tick. Cuando llama el tick,
 * `nextTick` es exactamente ese mismo número, así que las dos puertas sellan
 * igual y no hay dos convenciones dando vueltas.
 */
export async function resolverAcciones(args: {
  region: { id: string }
  tick: number
  /** Sólo lo de este jugador. Lo usa la web: el pedido resuelve lo que mandó
   *  el que golpeó la puerta, no lo de los demás. */
  soloJugador?: string
  /** El mundo ya leído, si el que llama lo tenía (el tick lo tiene). */
  mundo?: MundoDeAccion
  /** Sumidero de eventos. El tick los junta con los suyos y los inserta todos
   *  al final; la web no tiene ese final, así que si no viene se escriben acá
   *  mismo. Mismo patrón que `combate.ts`. */
  ev?: (e: Omit<Ev, 'region_id' | 'tick'>) => void
}): Promise<Resuelta[]> {
  const { region, tick, soloJugador } = args
  const mundo = args.mundo ?? await leerMundoDeAccion(region.id)

  const propios: Ev[] = []
  const ev = args.ev
    ?? ((e: Omit<Ev, 'region_id' | 'tick'>) =>
      void propios.push({ region_id: region.id, tick, ...e }))

  // El filtro por jugadores es de esta región y hace falta: `actions` no tiene
  // `region_id` y hay más de una región en la misma base. Sin el filtro, el
  // tick de un valle lee las acciones pendientes del otro, no encuentra al
  // jugador y las saltea — no las rompe, pero las cuenta como "hay alguien
  // actuando ahora" en el valle equivocado.
  const ids = soloJugador ? [soloJugador] : mundo.players.map((p) => p.id)
  if (ids.length === 0) return []

  // Por día primero. Adentro del mismo día el orden queda indefinido y no hay
  // columna para arreglarlo (`actions` no tiene `created_at`); en el camino
  // normal no importa, porque la web resuelve de a una apenas la encola.
  const pendientes = (await db
    .from('actions').select('id, player_id, verb, target')
    .is('resolved_tick', null).in('player_id', ids)
    .order('submitted_tick', { ascending: true })).data ?? []

  const resueltas: Resuelta[] = []
  // Ver el comentario en `resolveAction`: sólo lo usa el camino del tick, donde
  // los eventos se insertan al final y el chequeo contra la base no ve lo que
  // se acaba de decidir en esta misma vuelta.
  const yaHablaron = new Set<string>()
  for (const action of pendientes) {
    const player = mundo.players.find((p) => p.id === action.player_id)
    if (!player) continue

    // EL RECLAMO. Ver el comentario largo de arriba: va antes de resolver.
    const { data: mia } = await db.from('actions')
      .update({ resolved_tick: tick })
      .eq('id', action.id).is('resolved_tick', null)
      .select('id')
    if (!mia?.length) continue

    const outcome = await resolveAction(region.id, tick, player, action, {
      // `players` viaja porque los precios lo necesitan: cuántos saben hacer
      // una cosa en este valle cuenta a los jugadores igual que a los NPCs, y
      // si el único herrero que queda es un jugador, la hoja no vale como si no
      // quedara ninguno. Ya estaba leído — no hay consulta nueva.
      people: mundo.people, players: mundo.players, places: mundo.places,
      ev, yaHablaron,
    })
    await db.from('actions').update({ outcome }).eq('id', action.id)
    // `last_action_tick`, NO `last_seen_tick`. Actuar no es que te hayan
    // contado lo que pasó: si esto adelantara el cursor del director, el
    // jugador que más juega se quedaría sin hechos que narrar justo por jugar.
    await db.from('players').update({ last_action_tick: tick }).eq('id', player.id)
    resueltas.push({ verb: action.verb, target: action.target, outcome })
  }

  if (propios.length > 0) await db.from('events').insert(propios)
  return resueltas
}

export async function step() {
  const region = await getRegion()
  const nextTick = region.tick + 1
  // Cuánta gente sostiene este valle. Va aparte y no en `getRegion()` porque
  // ese `select` vive en `db.ts` y lo comparten seis archivos; acá es una
  // lectura por tick contra la clave primaria. El `?? 9` es el mismo default
  // que puso la migración: si la columna todavía no está, el valle se comporta
  // como el que sembró el generador y no como uno sin techo.
  const { data: cfg } = await db
    .from('regions').select('cupo').eq('id', region.id).limit(1).maybeSingle()
  const cupo: number = cfg?.cupo ?? 9
  const events: Ev[] = []
  // El `void` no es cosmético: sin él esto devuelve el `length` del array y no
  // encaja en el sumidero que esperan `pelear()` y `recibirGolpe()`, que es el
  // mismo patrón que ya usa `resolverAcciones()`.
  const ev = (e: Omit<Ev, 'region_id' | 'tick'>) =>
    void events.push({ region_id: region.id, tick: nextTick, ...e })

  // ── Quién está dando vueltas ──────────────────────────────
  //
  // Acá vivían tres preguntas distintas contestadas con la misma columna, y
  // por eso la crónica de quien más jugaba salía vacía. Son tres y hay que
  // tenerlas separadas:
  //
  //   1. **¿Hasta dónde le narré?** → `last_seen_tick`. **Este archivo no lo
  //      toca nunca.** Es del director y sólo avanza cuando de verdad escribió
  //      una crónica. Cuando el tick lo adelantaba al resolver una acción,
  //      cada cosa que mandabas te borraba tu propia ventana de hechos, y la
  //      ventana vacía es lo que hace que el director narre el contexto como
  //      si fueran noticias.
  //   2. **¿Cuándo actuó por última vez?** → `last_action_tick`, que sí es de
  //      este archivo. Se mide en ticks porque es tiempo de mundo.
  //   3. **¿Está adentro AHORA?** → `last_seen_at`, reloj de pared. No se
  //      puede contestar con ticks: un tick dura seis horas reales, así que la
  //      ventana más chica que un contador de ticks permite es de entre 6 y 12
  //      horas. Y ya cambió una vez de 1 h a 6 h; un reloj de pared sobrevive
  //      al próximo recalibrado.
  const players = (await db
    .from('players').select('id, name, place_id, last_action_tick, last_seen_at')
    .eq('region_id', region.id)).data ?? []

  // Una acción sin resolver quería decir "está con la mano en el teclado ahora
  // mismo" porque `web.ts` encolaba y llamaba a `step()` en el acto. **Dejó de
  // querer decir eso**: desde que `/act` resuelve en el momento, lo que queda
  // pendiente es lo que NADIE pudo resolver — un colgado, no un presente. La
  // señal buena pasó a ser `last_seen_at`, reloj de pared, que `/act` ahora
  // estampa igual que `/mundo`; así la ventana de mordida sigue midiendo cinco
  // minutos de verdad y no las seis horas que dura un tick.
  //
  // La cláusula vieja se deja porque no ensancha nada: un pendiente no puede
  // ser más viejo que el último tick, que es el que barre lo que quedó. Pero
  // ya no es la que contesta la pregunta.
  //
  // Se sigue leyendo acá arriba, y filtrado por los jugadores de ESTA región,
  // porque `actions` no tiene `region_id`: sin el filtro, el tick de un valle
  // contaba como presentes a los pendientes del otro.
  const idsDeAca = players.map((p) => p.id)
  const pending = idsDeAca.length === 0 ? [] : (await db
    .from('actions').select('id, player_id')
    .is('resolved_tick', null).in('player_id', idsDeAca)).data ?? []
  const actuandoAhora = new Set(pending.map((a) => a.player_id))

  const ahora = Date.now()
  const desdeQueLoVimos = (p: { last_seen_at: string | null }) =>
    p.last_seen_at ? ahora - new Date(p.last_seen_at).getTime() : Infinity

  /** Está adentro, en serio, en este momento. Es la condición dura: lo que
   *  cuelga de acá puede lastimarte, así que no puede dispararse mientras
   *  dormís (DISENO §9.3: perder nunca puede costarte tiempo de juego). */
  const adentroAhora = (p: { id: string; last_seen_at: string | null }) =>
    actuandoAhora.has(p.id) || desdeQueLoVimos(p) < PRESENTE_MS

  // Y ésta es la blanda: decide el paso del mundo, nada más. Que peque de
  // generosa no le cuesta nada a nadie — a lo sumo las agendas avanzan a paso
  // normal un rato después de que se fue el último.
  const populated = players.some((p) =>
    adentroAhora(p)
    || desdeQueLoVimos(p) < RECIENTE_MS
    || region.tick - p.last_action_tick <= 3)
  const pace = populated ? 1 : 0.25

  // `home_place_id`, la jornada y `durmio_fuera_desde` viajan con la persona
  // desde acá: los usa el cierre del día (pasada 6b) y los necesita
  // `resolveAction` para ubicar a la gente a la hora que sea. Son tres columnas
  // más en un `select` que ya se hacía, no una consulta nueva.
  const people = (await db
    .from('people')
    // Una sola cadena, sin concatenar: supabase-js le saca los tipos al
    // literal, y partido en dos el `select` deja de tener tipo y todo lo que
    // cuelga de `people` pasa a ser `GenericStringError`.
    .select('id, name, trade, place_id, teaches, home_place_id, jornada_desde, jornada_hasta, durmio_fuera_desde')
    .eq('region_id', region.id).eq('alive', true)).data ?? []

  const places = (await db
    .from('places').select('id, name, slug, kind, ultimo_dia_abierto')
    .eq('region_id', region.id)).data ?? []
  const placeName = (id: string | null | undefined) =>
    places.find((p) => p.id === id)?.name ?? 'algún lado'

  // ── 1. Resolver lo que quedó sin resolver ─────────────────
  //
  // Antes acá se resolvía TODO lo que mandaban los jugadores, y era la mitad
  // que no debía frenarse cuando el tick pasó a latir cada seis horas. Ahora
  // `POST /act` llama a `resolverAcciones()` en el acto y esto es el barrido:
  // cierra lo que nadie cerró. En una corrida normal no encuentra nada.
  //
  // Sigue siendo el bloque 1 y sigue corriendo ANTES que las agendas, la
  // enseñanza y la muerte, con el mismo `nextTick` y el mismo sumidero de
  // eventos: para el orden del tick no cambió nada.
  // Se le pasa el MISMO array de `players`, no una copia: lo que mueve una
  // acción —el `place_id` de `case 'ir'`— tiene que estar adentro cuando más
  // abajo se decide a quién muerde el bicho del lugar.
  const resueltas = await resolverAcciones({
    region, tick: nextTick, mundo: { players, people, places }, ev,
  })

  // ── 2. Las agendas avanzan EJECUTANDO VERBOS ──────────────
  //
  // Acá vivía `progress += 2 + roll(8)`. Ilde "avanzaba un 12 % en juntar
  // carbón" y el jugador no veía nada de eso: las metas, los oficios, los
  // saberes y los vínculos existían hace semanas y se resolvían como
  // aritmética adentro de una fila. Peor que invisible, mentiroso: en la
  // corrida de referencia el contador de Sarn llegó a 100 y el valle anunció
  // que **«Sarn consiguió un filo que no se le mella»** sin que nadie vivo
  // supiera forjar una hoja ni hubiera una sola hoja en el mundo.
  //
  // Ahora Ilde **va** a la Casa Quemada, **busca**, y vuelve con carbón o
  // vuelve con las manos vacías. Los verbos son los MISMOS que los del
  // jugador, no una simulación aparte: `loQueSale()` es literalmente la
  // función que usa `case 'buscar'` con los mismos pesos, fabricar exige
  // `knows` + el lugar correcto igual que `case 'trabajar'`, y lo que junta
  // entra al mundo con `made_by` en null igual que lo que junta el jugador.
  // Por eso cruzártela en el camino te dice a qué fue.
  //
  // **CÓMO DECIDEN. No al azar y no con un modelo jugando el turno.** De lo
  // que les falta sale un paso y uno solo, siempre el más corto que su estado
  // permite. Es una función de dónde están, qué saben, qué llevan encima y
  // quién sigue vivo:
  //
  //   le falta una cosa  → la tiene en la mano   → la gasta y cierra
  //                      → crece en algún lado   → va ahí, y busca
  //                      → la hace un saber suyo → va al taller, y la hace
  //                      → la tiene o la sabe hacer otro → **va y se la pide**
  //                      → la hace alguien que enseña → va con él, y aprende
  //                      → no la sabe hacer nadie vivo → la meta se traba
  //   le falta un saber  → ya lo sabe            → cierra
  //                      → lo tiene alguien que enseña → va, y aprende
  //                      → no queda nadie        → la meta se traba
  //   no le falta nada   → trabaja en lo suyo, donde esté
  //
  // **El renglón de pedir va antes del de aprender y ése es el orden que
  // importa.** Aprender un oficio entero para conseguir una sola cosa es lo que
  // hacía el valle hasta ayer: en la corrida de referencia Sarn aprendió a
  // forjar para tener una hoja y Bruno aprendió a destilar para pagarle un
  // frasco a Odila, y de paso Forja simple pasó de dos cabezas a cinco. Ahora
  // Sarn le pide la hoja a la fragua y sigue sin saber forjar, que es el juego.
  // La cuenta completa —qué se movió y qué no— está en `irAPedir`.
  //
  // Lo único que sortea el azar es qué sale de revolver un lugar y qué día le
  // toca dedicarle. La elección, nunca.
  //
  // **QUÉ MERECE UN EVENTO Y QUÉ NO. Es el riesgo entero de este cambio.**
  // Siete personas ejecutando verbos pueden convertir la crónica en un
  // registro de tránsito, y la crónica es lo único que este proyecto mide. La
  // regla de siempre —un estado que no cambió no es noticia— verbo por verbo:
  //
  //   · `ir` — **NUNCA emite, ni una vez.** Un desplazamiento no es noticia:
  //     es estado, y el estado ya se ve solo, porque `people.place_id` cambia
  //     y el cliente la dibuja ahí. Te cruzás a Ilde en el camino porque Ilde
  //     ESTÁ en el camino, no porque alguien te lo contó. El viaje se cuenta
  //     por su resultado —«volvió de la Casa Quemada con carbón»—, que es la
  //     frase que pide el diseño y la única que agrega algo. Siete personas
  //     caminando cuestan cero eventos.
  //   · `buscar` y trae lo que buscaba — siempre. Es el pago del viaje.
  //   · `buscar` y levanta otra cosa — nunca. El objeto entra al mundo y se
  //     guarda, pero juntar una rama de paso no es noticia.
  //   · `buscar` y vuelve vacía — dos de cada cinco. Volver con las manos
  //     vacías importa y el diseño lo pide, pero tres ticks seguidos de
  //     «volvió vacía» es el disco rayado que este archivo ya arregló una vez.
  //   · volverse porque hay algo rondando — la mitad. Ése sí pesa: dice por
  //     qué no pudo, y le da al jugador algo que hacer al respecto.
  //   · `trabajar` y produce — siempre. Un objeto nuevo, en un mundo donde un
  //     objeto sólo existe si alguien vivo sabe hacerlo, es lo más caro que hay.
  //   · `trabajar` sin producir — nunca. Es el día de laburo de cualquiera.
  //   · `aprender` — siempre. Es la tesis del juego moviéndose de una cabeza
  //     a otra, y encima dice cuántos lo saben ahora.
  //   · cerrar, trabar o soltar una meta — siempre. Son transiciones.
  //   · `hablar` entre NPCs — **nunca, ni una vez.** Es la misma decisión que
  //     `ir` y por el mismo motivo: dos vecinos saludándose no es noticia, es
  //     el fondo. Lo que deja es el vínculo, y el vínculo se ve por donde tiene
  //     que verse — en a quién le pide las cosas la gente.
  //   · `pedir` y se lo dan — siempre, y en UN solo evento que cuenta el
  //     pedido, la entrega y el cierre de la meta juntos, igual que hace
  //     `case 'dar'` del lado del jugador. Tres eventos para el mismo hecho
  //     serían tres renglones y el director los narraría como tres cosas.
  //   · `pedir` y le dicen que no — **sólo la primera vez con esa persona por
  //     esa cosa.** Un desaire es una transición; el mismo desaire repetido
  //     cada vez que vuelve a pedir es el disco rayado. La deduplicación vive
  //     en `memories` (ver `recordarEntre`) y de ahí sale el permiso de emitir.
  //
  // Medido sobre **660 ticks por brazo** —cuatro valles recién sembrados de
  // cada lado, las mismas siete personas— con el código de antes y el de
  // después de los verbos sociales:
  //
  //   · eventos por tick: **1,02 y 1,02** (674 contra 672). Tres clases nuevas
  //     de evento y el volumen no se movió, porque un pedido que sale bien
  //     reemplaza una secuencia de tres —enseñanza, fabricación, cierre— por
  //     uno solo, y el que sale mal se cuenta una vez en la vida.
  //   · agendas cerradas por tick: **0,311 y 0,312** (205 contra 206). El valle
  //     no se frenó por ponerse a pedir en vez de aprender.
  //
  // (La primera versión de esto sí frenaba, y bastante: mandaba al que pedía a
  // esperar en el taller y dejaba NPCs estacionados de por vida. Está contado
  // donde se arregló, en `irAPedir`.)
  const agendas = (await db
    .from('agendas')
    .select('id, person_id, goal, needs_kind, needs_id, needs_object, progress, state')
    .eq('state', 'activa')
    // Mismo tope mudo de 1.000 filas que en `saberesDe`, acá con menos riesgo
    // —sólo cuenta lo activo— pero por el mismo motivo: sin filtro esto lee
    // las agendas de todos los valles y el recorte no avisa.
    .in('person_id', people.map((p) => p.id))).data ?? []

  // Todo lo que hace falta para decidir, leído de una vez: son cuatro
  // consultas por tick en vez de cuatro por agenda y por tick.
  const recetas = (await db
    .from('knowledge').select('id, name, makes, makes_at')
    .not('makes', 'is', null)).data ?? []
  // El `.in()` no es una optimización: **PostgREST corta toda respuesta en
  // 1.000 filas y no lo dice.** Sin él esto lee el `knows` de TODOS los valles
  // y, pasadas las mil filas, empieza a devolver un recorte silencioso — la
  // gente de este valle deja de saber lo que sabe, en orden arbitrario. Se
  // midió: 1.779 filas reales, 1.000 devueltas, cero aviso. Es el mismo modo
  // de falla que el `grep` sobre un binario, y por eso está escrito acá.
  const saberesDe = (await db
    .from('knows').select('id, holder_id, knowledge_id, destreza, veces')
    .eq('holder_kind', 'person')
    .in('holder_id', people.map((p) => p.id))).data ?? []
  const enMano = (await db
    .from('objects').select('id, kind, quality, made_by, holder_id')
    .eq('region_id', region.id).eq('holder_kind', 'person')).data ?? []
  // Se lee acá arriba, y no en la pasada 4b donde se usaba, porque los NPCs la
  // consultan para decidir si bajan al Sotobosque o se vuelven. Es la MISMA
  // lista que muerde más abajo: las que nacen en este tick no muerden en este
  // tick, exactamente igual que antes.
  const amenazas = (await db
    .from('threats').select('id, place_id, kind, nombre, health, max_health')
    .eq('region_id', region.id).eq('alive', true)).data ?? []

  const lugarPorId = (id: string | null | undefined) => places.find((p) => p.id === id)
  const lugarPorKind = (kind: string) => places.find((p) => p.kind === kind)
  const sabeQue = (personId: string, knowledgeId: string) =>
    saberesDe.find((k) => k.holder_id === personId && k.knowledge_id === knowledgeId)

  /** Dónde practica lo suyo, para volver cuando termina el mandado.
   *
   *  Sale de los datos y no de una tabla de oficios escrita a mano: es el
   *  `makes_at` de algo que esa persona sabe hacer. Ilde sabe forjar, así que
   *  su lugar es la fragua; Odila destila, así que es la aldea. **Quien no
   *  sabe hacer nada no tiene taller y se queda donde está** — no lo
   *  arrastramos a ninguna parte, porque el valle no tiene mapa y "volver a
   *  casa" sin un `people.home_place_id` sería inventarle una casa. */
  const tallerDe = (personId: string) => {
    for (const k of saberesDe.filter((s) => s.holder_id === personId)) {
      const r = recetas.find((x) => x.id === k.knowledge_id)
      const l = r?.makes_at ? lugarPorKind(r.makes_at) : undefined
      if (l) return l
    }
    return undefined
  }

  const mover = async (
    quien: { id: string; place_id: string | null }, a: { id: string },
  ) => {
    await db.from('people').update({ place_id: a.id }).eq('id', quien.id)
    quien.place_id = a.id
  }

  /** `hablar` entre dos NPCs. **No emite evento, nunca.**
   *
   *  Es la decisión de ruido de esta pasada y es la misma que tomó `ir`: dos
   *  vecinos que se cruzan en la fragua y se hablan no es una noticia, es lo
   *  que hace la gente. Si esto emitiera, siete personas en cinco lugares
   *  llenarían la crónica de saludos y el director cobraría por leerlos.
   *
   *  Lo que sí deja es estado, y el estado es el que importa: sube el aprecio
   *  de los dos lados hasta `TOPE_DE_TRATO`, que es lo que después decide si te
   *  dan lo que les pedís. Así la red de `bonds` —que existe desde el primer
   *  día y hasta hoy estaba vacía entre NPCs— se llena sola, despacio, y
   *  `dialogo.ts` empieza a tener de qué hablar cuando alguien le pregunta a
   *  Odila qué opina de Bruno. */
  const hablarse = async (
    a: { id: string }, b: { id: string },
  ) => {
    await tocarVinculoEntre(a.id, b.id, 2, TOPE_DE_TRATO)
    await tocarVinculoEntre(b.id, a.id, 2, TOPE_DE_TRATO)
  }

  /** Ir a que le enseñen, que es el verbo `aprender` del lado del NPC.
   *
   *  El permiso entre NPCs es `teaches`, el mismo que usa la enseñanza
   *  espontánea de la pasada 3 — **no** `UMBRAL_ENSENAR`, que mide la
   *  confianza de un NPC hacia un JUGADOR y entre NPCs no está poblada. Que
   *  el gate sea el mismo es lo que hace que "Ren no enseña" signifique lo
   *  mismo mire quien mire.
   *
   *  Devuelve qué hizo hoy: aprendió, viajó hacia el maestro, o no hay nadie
   *  dispuesto — y ese último caso es una historia y una puerta, porque el
   *  jugador sí puede enseñar. */
  const irAAprender = async (
    quien: { id: string; name: string; place_id: string | null },
    knowledgeId: string,
  ): Promise<'aprendio' | 'viaja' | 'nadie'> => {
    const maestros = people.filter((p) => p.id !== quien.id && p.teaches
      && saberesDe.some((k) => k.holder_id === p.id && k.knowledge_id === knowledgeId))
    if (maestros.length === 0) return 'nadie'

    const aca = maestros.find((m) => m.place_id === quien.place_id)
    if (!aca) {
      const donde = lugarPorId(maestros[0]!.place_id)
      if (!donde) return 'nadie'
      await mover(quien, donde)
      return 'viaja'
    }

    // Sin destreza, igual que cuando enseña un jugador: recibe el saber, no la
    // mano. Va a tener que hacerlo un montón de veces para que le salga.
    const { data: fila } = await db.from('knows').insert({
      holder_kind: 'person', holder_id: quien.id, knowledge_id: knowledgeId,
      learned_from: aca.id, how: 'aprendido', learned_tick: nextTick,
      destreza: 0, veces: 0,
    }).select('id').single()
    if (fila) {
      saberesDe.push({
        id: fila.id, holder_id: quien.id, knowledge_id: knowledgeId,
        destreza: 0, veces: 0,
      })
    }
    const { data: k } = await db
      .from('knowledge').select('name').eq('id', knowledgeId).single()
    // Al que te enseña lo suyo se lo recuerda. Es el vínculo NPC↔NPC más
    // fuerte que produce el valle, y encima es el que hace falta: mañana, si
    // Sarn necesita algo de la fragua, se lo va a pedir a Ilde antes que a
    // nadie, y se lo van a dar. La deuda del que aprendió es el motor del
    // bucle chico corriendo entre NPCs.
    await tocarVinculoEntre(quien.id, aca.id, 20)
    const cuantos = await cuantosLoSaben(knowledgeId, region.id, people)
    ev({ kind: 'ensenanza', place_id: aca.place_id,
      summary: `${quien.name} aprendió ${k?.name}. Se lo enseñó ${aca.name}.`
        + (cuantos > 1 ? ` Ahora lo saben ${enLetras(cuantos)}.` : ''),
      detail: {
        npc: quien.name, from: aca.name, to: quien.name,
        knowledge: k?.name, lo_saben: cuantos,
      } })
    return 'aprendio'
  }

  const yaActuo = new Set<string>()

  type Persona = (typeof people)[number]

  /**
   * LA SALIDA. Alguien se pone en camino a un lugar donde hay algo adentro, y
   * puede no volver.
   *
   * **Por qué existe, y por qué no es una muerte más.** Hasta hoy el saber se
   * perdía de una sola manera: el sorteo del 0,8% de la pasada 4. Funciona y
   * la tesis se cumple —«en el tick 10 murió la vieja Ren y se llevó las dos
   * runas del valle»— pero es una moneda, no una historia: nadie puede contar
   * POR QUÉ pasó. Esto es la misma pérdida con una causa que se puede contar:
   * *fue a la Casa Quemada a buscar hierro y no volvió.* Es lo que mide el
   * tramo 00 — si el jugador puede contar una historia que nadie escribió.
   *
   * **QUIÉN SALE, Y NO LO DECIDE UN DADO.** Sale del estado y de nada más: el
   * que tiene una meta abierta que pide algo que **sólo hay en un lugar
   * salvaje**, y que hoy tiene que ponerse en camino porque no está allá. Si en
   * ese lugar hay algo parado, el viaje deja de ser un viaje. No hay lista de
   * aventureros, no hay tirada para ver a quién le agarran ganas: el Sotobosque
   * es peligroso y la raíz está en el Sotobosque, y eso alcanza. El azar
   * aparece recién en el resultado, que es donde tiene que estar.
   *
   * **Y pasa UNA vez por meta, no una por día.** El que ya está allá acampando
   * sigue por el camino viejo —`P_SE_VUELVE` y `buscar`, sin tocar una coma—,
   * así que esto no es un peaje diario: es el día que se pone en camino. De ahí
   * salen las 28 salidas por año de mundo de la cuenta de `P_NO_VUELVE`, y de
   * ahí sale que un lugar con algo adentro no se vuelva una picadora.
   *
   * **CON QUIÉN, y el "no" también es contenido.** Le pide a alguien que está
   * donde él está —por eso la invitación es acá, en el día de partida, y no
   * allá, donde no hay nadie— y elige **al que mejor lo mire**: el `valued` del
   * otro HACIA él, igual que `irAPedir`. La respuesta sí es un sorteo y sube
   * con el vínculo (`P_TE_ACOMPANA`), porque un sí garantizado convierte a los
   * otros seis en escoltas. El "no" se acuerda y se cuenta **una sola vez** con
   * esa persona y ese lugar, con la misma deduplicación por `memories` que usa
   * el pedido: un desaire es una transición, el mismo desaire repetido es el
   * disco rayado.
   *
   * **QUÉ MERECE EVENTO.** Salir no es noticia — es la misma decisión que `ir`
   * y por el mismo motivo: un desplazamiento es estado, y el estado se ve solo
   * porque `people.place_id` cambia. Lo que sí es noticia:
   *
   *   · el golpe — lo emite `pelear()`, la MISMA función que el jugador, así
   *     que un NPC que le entra a la jauría se cuenta con la misma frase que
   *     vos. Y si la mata, `amenaza_muerta`: alguien del valle limpió un lugar,
   *     que es de lo mejor que puede pasar sin que estés.
   *   · el "no" — una vez por par y por lugar.
   *   · **no volver — siempre**, y es de las cosas más importantes que puede
   *     contar este juego. Va con `perdida_de_saber` detrás cuando corresponde,
   *     por el mismo camino que la muerte por azar (`seMuere`), no por uno
   *     nuevo.
   *
   * **Lo que costó, medido.** Dos brazos de ocho valles × 250 ticks:
   *
   *   · eventos por tick: **0,897 → 0,861**. Bajó, y no por magia: el brazo
   *     nuevo perdió cuatro personas más y un valle más chico produce menos
   *     agendas, que son el 73% de todos los eventos. Lo que ESTO agrega,
   *     contado aparte, son 94 eventos en 2.000 ticks —58 peleas, 9 amenazas
   *     muertas, 7 que no volvieron, 11 negativas de compañía y 9 amenazas
   *     nuevas que nacieron para reemplazar a las que mataron los NPCs— o sea
   *     **0,047 por tick, +5,2%**. Uno cada tres semanas de valle.
   *   · el reparto de esos 94 es la mitad del argumento: 74 son peleas y
   *     bichos, que es la clase de evento que el director narra mejor y que
   *     hasta hoy sólo existía si había un jugador conectado. Un valle sin
   *     nadie adentro pasó de no tener una sola pelea a tener una cada dos
   *     semanas de mundo.
   *   · compañía: **la mitad de las salidas llevó a alguien** (11 negativas y
   *     3 de las 7 muertes con un compañero al lado), así que ni es un adorno
   *     que no dispara ni es automático.
   *
   * **EL PRECIO, Y DE DÓNDE SALE.** No es un número plano: es `P_NO_VUELVE`
   * multiplicado por cuánta vida le quedó a la cosa después del golpe. Matarla
   * cuesta cero, dejarla entera cuesta todo, y en el medio hay una pendiente.
   * Eso hace que **el arma valga**: el que baja con una hoja templada le saca
   * más vida, y le saca riesgo por el mismo acto. El arma existe porque alguien
   * supo hacerla, así que sobrevivir a la Casa Quemada termina colgando de que
   * alguien vivo sepa forjar — que es el juego entero, cerrado por otro lado.
   */
  const salir = async (
    who: Persona,
    agenda: { id: string; goal: string },
    falta: string,
    donde: { id: string; name: string },
    bicho: { id: string; kind: string; nombre: string | null },
  ): Promise<'volvio' | 'no_volvio'> => {
    // ── 1. ¿Con quién? ────────────────────────────────────
    let companero: Persona | undefined
    const posibles = people.filter((p) =>
      p.id !== who.id && p.place_id === who.place_id && !yaActuo.has(p.id))
    if (posibles.length > 0) {
      const vinculos = (await db.from('bonds').select('person_id, valued')
        .eq('toward_kind', 'person').eq('toward_id', who.id)
        .in('person_id', posibles.map((p) => p.id))).data ?? []
      const aprecio = (id: string) => vinculos.find((v) => v.person_id === id)?.valued ?? 0
      const b = [...posibles].sort((x, y) => aprecio(y.id) - aprecio(x.id))[0]!
      const v = aprecio(b.id)
      if (Math.random() < Math.max(0.05, Math.min(0.70, P_TE_ACOMPANA + v / 80))) {
        companero = b
        // Le costó el día, igual que al que hace un favor en `irAPedir`. Un
        // acompañante que no paga nada no está acompañando, está de paseo.
        yaActuo.add(b.id)
        await tocarVinculoEntre(who.id, b.id, 12)
      } else {
        const primeraVez = await recordarEntre(who.id, b.id,
          `${b.name} no quiso ir con ${who.name} a ${donde.name}`, nextTick)
        await tocarVinculoEntre(who.id, b.id, -3)
        if (primeraVez) {
          // Escrita sin pronombres a propósito: «que lo acompañara» le pone
          // masculino a Ilde. Es la misma regla que ya estaba en las frases de
          // `irAPedir` y en las tres del cierre material.
          ev({ kind: 'negativa', place_id: who.place_id,
            summary: `${who.name} iba a ${donde.name} y le pidió a ${b.name} que fuera también.`
              + ` ${b.name} dijo que no.`,
            detail: {
              npc: who.name, person: who.name, a_quien: b.name,
              place: donde.name, goal: agenda.goal,
            } })
        }
      }
    }

    // ── 2. Van. Sin evento, igual que `ir`. ───────────────
    await mover(who, donde)
    if (companero) await mover(companero, donde)

    // ── 3. Se lo cruzan ───────────────────────────────────
    //
    // La MISMA función que el jugador. No hay una segunda copia del golpe en
    // este archivo y no va a volver a haberla: ver el encabezado de
    // `combate.ts`, que cuenta lo que costó la primera vez.
    const golpe = await pelear({
      regionId: region.id, tick: nextTick, player: who, quien: 'person',
      threatId: bicho.id, ev,
      // `amenazas` es la foto del arranque del día, así que el bicho puede
      // haber caído hace tres líneas a manos de otro. `pelear()` relee con
      // `alive = true` y contesta que no hay nada; entonces esto fue un viaje.
      alVerNpc: async (t, npc, mato) => {
        await recordarEntre(t.id, npc.id, `${npc.name} mató a ${mato} en ${donde.name}`, nextTick)
        await tocarVinculoEntre(t.id, npc.id, 8)
      },
    })
    if (!golpe.ok) return 'volvio'

    // ── 4. El precio ──────────────────────────────────────
    const entera = golpe.maxHealth > 0 ? golpe.health / golpe.maxHealth : 0
    const riesgo = P_NO_VUELVE * entera / (companero ? RIESGO_DE_A_DOS : 1)
    const fueron = companero ? [who, companero] : [who]
    // **El mismo piso que el sorteo de la muerte, y con el mismo número.** La
    // pasada 4 no se lleva a nadie con tres personas vivas (`people.length >
    // 3`), y sin esto habría dos reglas distintas para lo mismo: el azar
    // respetando un mínimo y las salidas vaciando el valle por abajo. Un valle
    // de dos no es un valle — el que queda no tiene a quién pedirle ni de quién
    // aprender, y todo lo demás de este archivo deja de correr.
    //
    // Se recorta ANTES de escribir las frases y no adentro del bucle, porque
    // la frase de uno dice si el otro volvió: recortar después haría que el
    // primero anunciara una muerte que el piso acaba de impedir.
    const seVan = fueron
      .filter(() => Math.random() < riesgo)
      .slice(0, Math.max(0, people.length - 3))
    if (seVan.length === 0) return 'volvio'

    for (const m of seVan) {
      const otro = fueron.find((p) => p.id !== m.id)
      const otroVuelve = !!otro && !seVan.includes(otro)
      // No cita la meta, cita la COSA. Es deliberado: `agenda.goal` es texto
      // libre que escribe otro archivo, y el `seed` todavía tiene una meta que
      // es una postura y no un objetivo («morirse sin haberle enseñado...»).
      // Un evento de muerte con esa frase adentro es exactamente la clase de
      // línea que ya mató a una NPC viva una vez. La meta va en `detail`, que
      // es dato y no prosa.
      await seMuere({
        tick: nextTick, muerto: m, donde: donde.id, people, players, ev,
        evento: {
          kind: 'no_volvio', place_id: donde.id,
          summary: `${m.name} fue a ${donde.name} a buscar ${falta} y no volvió.`
            + (otro
              ? (otroVuelve ? ` ${otro.name} volvió sin ${m.name}.` : ` ${otro.name} tampoco.`)
              : ''),
          detail: {
            npc: m.name, person: m.name, place: donde.name, object: falta,
            threat: bicho.nombre ?? bicho.kind, con: otro?.name ?? null,
            goal: m.id === who.id ? agenda.goal : null,
          },
        },
      })
      // El que volvió es el que lo cuenta, y por eso el valle se entera: la
      // pasada 5 agarra este recuerdo y lo reparte. Sin esto, alguien
      // desaparece del valle y nadie lo menciona nunca más.
      if (otro && otroVuelve) {
        await recordarEntre(otro.id, m.id, `${m.name} no volvió de ${donde.name}`, nextTick)
      }
    }
    return seVan.some((m) => m.id === who.id) ? 'no_volvio' : 'volvio'
  }

  /** Ir a pedírselo al que puede dártelo. Es `hablar` + `dar` entre NPCs, y es
   *  el verbo que faltaba.
   *
   *  **El agujero que tapa.** Hasta hoy, un NPC que necesitaba algo fabricado y
   *  no lo sabía hacer tenía dos salidas y las dos eran malas: si nadie
   *  enseñaba, la meta se trababa; y si alguien enseñaba, **se ponía a aprender
   *  el oficio entero para conseguir una sola cosa.** Lo segundo se veía peor
   *  que lo primero y está medido: en sesenta ticks de una corrida limpia,
   *  Forja simple pasó de dos cabezas a cinco y Destilado de raíz de una a
   *  cinco, porque Sarn aprendió a forjar para tener una hoja y Bruno aprendió
   *  a destilar para pagarle un frasco a Odila. Un valle donde todos saben todo
   *  no pierde nada cuando se muere alguien, y ahí se apaga el motor del juego.
   *
   *  Lo natural era lo otro: **pedírselo al que sabe.** Por eso esto va ANTES
   *  de `irAAprender` y no después — aprender el oficio es el último recurso,
   *  no el primero.
   *
   *  **Y ojo con lo que eso hizo y con lo que no, porque lo medido no es lo que
   *  uno esperaba.** Sobre 660 ticks por brazo, con las mismas siete personas y
   *  cuatro valles recién sembrados de cada lado:
   *
   *    · la enseñanza BUSCADA se desplomó, que era la intención — 9 → 2;
   *    · la ESPONTÁNEA subió sola, 17 → 25, porque pedir hace que la gente
   *      viaje a buscarse y ese sorteo exige estar en el mismo lugar. Es
   *      exactamente el mecanismo que descubrió la pasada 2 cuando tuvo que
   *      bajar la espontánea de 0,35 a 0,12;
   *    · **el total quedó igual: 26 enseñanzas contra 27, o sea 0,039 y 0,041
   *      por tick.** La escasez no se movió, ni para bien ni para mal.
   *
   *  O sea: esto no frena la circulación del saber, la CAMBIA DE FORMA. Saca la
   *  vía absurda —aprender un oficio entero para conseguir una cosa— y no
   *  agrega ninguna. Si algún día hay que frenar el total, la palanca es el
   *  0,12 de la pasada 3 y no ésta; no se tocó acá a propósito, porque mover
   *  dos números en el mismo cambio deja la próxima medición sin poder atribuir
   *  nada.
   *
   *  **A quién le pide, y no lo decide un dado.** Se arma la lista de los que
   *  se lo pueden dar —el que ya lo tiene en la mano y el que lo sabe hacer— y
   *  de ésos elige **al que mejor lo mire**: el `valued` del otro HACIA ÉL, no
   *  al revés. Es la única elección que hay acá y sale entera del estado.
   *
   *  Lo único que sortea el azar es la respuesta, y eso sí tiene que ser un
   *  sorteo: un "sí" garantizado convierte a los otros seis en una tienda con
   *  caras. La cuenta está en `P_TE_LO_DA` y sube con el vínculo, así que
   *  insistir sirve — cada pedido, salga o no, es una charla y acerca.
   *
   *  Devuelve qué hizo hoy: recibió, viajó hacia quien se lo puede dar, se
   *  comió un "no", o no hay nadie vivo a quien pedírselo.
   */
  const irAPedir = async (
    quien: { id: string; name: string; trade: string; place_id: string | null },
    agenda: { id: string; goal: string },
    falta: string,
    receta: { id: string; makes_at: string | null },
  ): Promise<'recibio' | 'viaja' | 'negativa' | 'nadie'> => {
    type EnMano = {
      id: string; kind: string; quality: number
      made_by: string | null; holder_id: string
    }
    type Candidato = {
      b: { id: string; name: string; place_id: string | null }
      tiene?: EnMano
      donde: { id: string; name: string }
    }
    const cands: Candidato[] = []

    // (i) El que ya lo tiene en la mano: el favor barato, y el que deja el
    //     rastro bueno — un objeto que cambia de manos **no cambia de autor**.
    //     La hoja que hizo Ilde sigue diciendo Ilde aunque la lleve Sarn, y va
    //     a seguir diciéndolo el día que Ilde no esté.
    //
    //     Acá sí vale la regla de "nadie regala lo que él mismo está
    //     buscando": si Odila necesita un frasco, el frasco que tiene en la
    //     mano es suyo y no lo suelta.
    for (const o of enMano) {
      if (o.kind !== falta || o.holder_id === quien.id) continue
      const b = people.find((p) => p.id === o.holder_id)
      if (!b) continue
      if (agendas.some((a) => a.person_id === b.id
        && a.needs_kind === 'object' && a.needs_object === falta)) continue
      const donde = lugarPorId(b.place_id)
      if (donde) cands.push({ b, tiene: o, donde })
    }

    // (ii) El que lo sabe hacer, esté donde esté. **Se lo va a buscar a él, no
    //      al taller**, y eso salió de una corrida y no de la cabeza: la
    //      primera versión mandaba al que pedía a plantarse en el taller y
    //      esperar. Ilde se pasó cincuenta ticks revolviendo la Casa Quemada
    //      —su propia meta pedía hierro viejo y el lugar tenía un bicho— y Sarn
    //      quedó **parado en la fragua vacía hasta el final de la corrida**,
    //      con el progreso clavado en el techo y sin producir un solo evento.
    //      Un NPC estacionado es peor que uno trabado: el trabado al menos se
    //      rinde. Se va a buscar a la persona, que es lo que hace cualquiera.
    //
    //      Acá NO vale lo de "nadie regala lo que busca", a propósito: el que
    //      sabe destilar puede destilar dos. Sin esa diferencia, Bruno no le
    //      puede pagar a Odila el frasco que le debe justamente porque Odila
    //      anda detrás de frascos, que es al revés de lo que dice la ficción.
    //
    //      Y ojo con esto, que es lo que sostiene la regla: **el saber y el
    //      lugar siguen valiendo los dos.** El favor no se fabrica en el aire —
    //      si el que sabe no está en su taller, vuelve a él (más abajo) y lo
    //      hace ahí. `makes_at` no se saltea nunca, igual que no se lo saltea
    //      el jugador en `case 'trabajar'`.
    const taller = receta.makes_at ? lugarPorKind(receta.makes_at) : undefined
    if (taller) {
      for (const b of people) {
        if (b.id === quien.id) continue
        if (cands.some((c) => c.b.id === b.id)) continue
        if (!saberesDe.some((k) => k.holder_id === b.id && k.knowledge_id === receta.id)) continue
        const donde = lugarPorId(b.place_id)
        if (donde) cands.push({ b, donde })
      }
    }
    // Nadie vivo de acá a quien pedirle: ni quien lo tenga ni quien lo sepa
    // hacer. Cae al camino viejo —aprender el oficio— que después de este
    // cambio queda para el único caso donde tiene sentido: que lo sepa hacer
    // sólo un jugador, y entonces el valle depende de que se conecte.
    if (cands.length === 0) return 'nadie'

    const vinculos = (await db.from('bonds').select('person_id, valued')
      .eq('toward_kind', 'person').eq('toward_id', quien.id)
      .in('person_id', cands.map((c) => c.b.id))).data ?? []
    const aprecio = (id: string) => vinculos.find((v) => v.person_id === id)?.valued ?? 0
    // Al que mejor lo mire; a igualdad, al que ya lo tiene hecho.
    const puntaje = (c: Candidato) => aprecio(c.b.id) * 10 + (c.tiene ? 1 : 0)
    cands.sort((x, y) => puntaje(y) - puntaje(x))
    const elegido = cands[0]!
    const b = elegido.b

    // `ir`. Sin evento, igual que en todo el resto de esta pasada.
    if (quien.place_id !== elegido.donde.id) {
      await mover(quien, elegido.donde)
      return 'viaja'
    }

    // `hablar`. Pedir es hablar, y hablar acerca a dos personas aunque la
    // respuesta sea que no. Sin evento.
    await hablarse(quien, b)

    const v = aprecio(b.id)
    if (Math.random() >= Math.max(0.10, Math.min(0.90, P_TE_LO_DA + v / 80))) {
      // El "no" es contenido y se acuerda. **Pero se cuenta una sola vez**: el
      // recuerdo está deduplicado, y el evento sale sólo cuando el recuerdo es
      // nuevo. Un desaire es una transición; repetirlo cada vez que vuelve a
      // pedir es el disco rayado que este archivo ya arregló una vez.
      const primeraVez = await recordarEntre(quien.id, b.id,
        `${b.name} no le dio ${falta} a ${quien.name}`, nextTick)
      await tocarVinculoEntre(quien.id, b.id, -3)
      if (primeraVez) {
        ev({ kind: 'negativa', place_id: quien.place_id,
          summary: `${quien.name} le pidió ${falta} a ${b.name}, y ${b.name} le dijo que no.`,
          detail: {
            npc: quien.name, person: quien.name, a_quien: b.name,
            object: falta, goal: agenda.goal,
          } })
      }
      return 'negativa'
    }

    let cosa = elegido.tiene
    if (cosa) {
      // Cambia de mano, no de autor. ⚠ `made_by` NO SE TOCA ACÁ NI NUNCA: lo
      // único en todo el código que puede escribir un `made_by` en null es
      // `case 'buscar'`, y lo único que puede escribir un nombre es quien
      // fabricó la cosa con sus manos.
      await db.from('objects')
        .update({ holder_kind: 'person', holder_id: quien.id }).eq('id', cosa.id)
      cosa.holder_id = quien.id
    } else {
      // Se lo hace, con sus manos y su destreza — el mismo `trabajar` de 3a y
      // el de `case 'trabajar'`, con la misma mejora y la misma calidad. Y sale
      // con SU nombre puesto, que es lo que va a quedar dando vueltas por el
      // valle cuando esa persona no esté.
      const suyo = saberesDe.find(
        (k) => k.holder_id === b.id && k.knowledge_id === receta.id)
      if (!suyo || !taller) return 'nadie'
      // **El lugar no se saltea.** Dijo que sí, así que vuelve a su taller y lo
      // hace ahí: una hoja se forja en la fragua y en ningún otro lado, la pida
      // quien la pida. Que el favor le mueva el cuerpo al que lo hace es
      // correcto —le costó el día, y por eso también `yaActuo`— y de paso
      // arregla algo que se veía feo: la herrera que salió a buscar hierro y no
      // volvía nunca a su fragua ahora tiene un motivo para volver.
      if (b.place_id !== taller.id) await mover(b, taller)
      const antes: number = suyo.destreza
      const ahora = Math.min(100, antes + mejora(antes))
      await db.from('knows')
        .update({ destreza: ahora, veces: suyo.veces + 1 }).eq('id', suyo.id)
      suyo.destreza = ahora
      suyo.veces += 1

      const q = calidad(antes)
      const { data: nuevo } = await db.from('objects').insert({
        region_id: region.id, kind: falta, quality: q,
        made_by: b.name, made_tick: nextTick,
        holder_kind: 'person', holder_id: quien.id,
      }).select('id').single()
      if (!nuevo) return 'nadie'
      cosa = { id: nuevo.id, kind: falta, quality: q, made_by: b.name, holder_id: quien.id }
      enMano.push(cosa)
      // Le costó el día. Un favor que no le cuesta nada a nadie no es un favor,
      // y además esto es lo que mantiene la regla de un verbo por persona y por
      // día: hoy la fragua trabajó para otro.
      yaActuo.add(b.id)
    }

    const bonus = Math.floor(cosa.quality / 25)
    await recordarEntre(quien.id, b.id,
      `${b.name} le dio ${falta} a ${quien.name} cuando lo necesitaba`, nextTick)
    await tocarVinculoEntre(quien.id, b.id, 15 + bonus)

    // **Un solo evento para todo esto, y es a propósito.** El pedido, la
    // entrega y el cierre de la meta son un hecho solo contado como pasó, igual
    // que hace `case 'dar'` del lado del jugador. Tres eventos separados serían
    // tres renglones para la misma cosa y el director los narraría como tres.
    //
    // La frase cita la meta como DESEO —«venía detrás de»— y eso siempre es
    // verdad, así que no pasa por la lista blanca ni la necesita.
    // Escrita para no tener que concordar con nada, como las tres frases de la
    // rama de arriba y por el mismo motivo: `falta` sale de una tabla y en
    // castellano «la había hecho» le pone femenino al frasco y «lo había hecho»
    // le pone masculino a la hoja.
    const autoria = cosa.made_by && cosa.made_by !== b.name
      ? ` Lleva la mano de ${cosa.made_by}, no la de ${b.name}.` : ''
    await cumplirAgenda(agenda, quien, nextTick, ev, {
      kind: 'agenda_cumplida', place_id: quien.place_id,
      summary: elegido.tiene
        ? `${quien.name} le pidió ${falta} a ${b.name} y salió de ahí con eso`
          + ` en la mano. Era lo que le faltaba para ${agenda.goal}.${autoria}`
        : `${quien.name} venía detrás de ${agenda.goal} y no lo sacaba solo.`
          + ` Se lo pidió a ${b.name}, que le hizo ${falta} en ${taller?.name ?? 'el valle'}.`,
      detail: {
        npc: quien.name, person: quien.name, goal: agenda.goal, object: falta,
        de_quien: b.name, quality: cosa.quality, made_by: cosa.made_by ?? null,
        como: elegido.tiene ? 'se_lo_dieron' : 'se_lo_hicieron',
      },
    })
    return 'recibio'
  }

  for (const agenda of agendas) {
    const who = people.find((p) => p.id === agenda.person_id)
    if (!who) continue
    // **Un verbo por persona y por día**, igual que el jugador. Si alguien
    // tiene dos metas abiertas, hoy le dedica el día a una sola.
    if (yaActuo.has(who.id)) continue
    if (Math.random() > pace * P_JORNADA) continue
    yaActuo.add(who.id)

    /** El día que se fue sin cerrar nada: el viaje, la búsqueda vacía, el día
     *  en que no se pudo hacer nada.
     *
     *  `trabado` distingue las dos clases de día perdido, y la distinción
     *  importa: buscar y no encontrar es progreso (mañana puede salir), pero
     *  querer algo que nadie te va a dar no lo es. Sólo los días trabados
     *  cuentan para soltar la meta, así que Odila revolviendo el Sotobosque
     *  nunca se rinde y Tobio, que quiere ver una runa y la única que sabe una
     *  no enseña, en algún momento sí. */
    const diaGastado = async (trabado = false) => {
      if (trabado && Math.random() < P_SUELTA) {
        await db.from('agendas')
          .update({ state: 'abandonada', ended_tick: nextTick }).eq('id', agenda.id)
        // Cita la meta como deseo —«dejó de perseguir X»—, y que alguien
        // quisiera algo siempre es verdad. No afirma que X haya pasado, así
        // que no pasa por la lista blanca ni la necesita.
        ev({ kind: 'agenda_soltada', place_id: who.place_id,
          summary: `${who.name} dejó de perseguir ${agenda.goal}.`,
          detail: { npc: who.name, person: who.name, goal: agenda.goal } })
        await abrirSiguienteMeta(who, agenda.goal, nextTick, ev)
        return
      }
      const p = Math.min(TECHO_MATERIAL, agenda.progress + DIA_GASTADO)
      if (p !== agenda.progress) {
        await db.from('agendas').update({ progress: p }).eq('id', agenda.id)
      }
      // Una meta trabada no es noticia todos los ticks. Si se emitiera
      // siempre, el director recibiría ruido y la crónica sería una planilla.
      // Que aparezca de a poco: así, cuando aparece, pesa.
      if (trabado && Math.random() < 0.12) {
        ev({ kind: 'agenda_estancada', place_id: who.place_id,
          summary: `${who.name} sigue sin conseguir lo que necesita para ${agenda.goal}.`,
          detail: { npc: who.name, person: who.name, goal: agenda.goal } })
      }
    }

    // ── Le falta una COSA ─────────────────────────────────
    //
    // Ésta es la puerta por la que entra el jugador, y la razón de que corra
    // igual esté él o no: si te encargaste de traerle la raíz a Odila y no
    // volvés, Odila se la va a buscar sola. El mundo no te espera — es la
    // lección de Red Dead y es a propósito.
    if (agenda.needs_kind === 'object' && agenda.needs_object) {
      const falta: string = agenda.needs_object

      // 1. ¿Ya la tiene encima? La gasta y cierra.
      //
      //    Una meta material se cumple GASTANDO la cosa: Ilde junta carbón
      //    para el invierno y lo quema, Odila quiere la raíz para destilarla.
      //    Por eso el objeto se borra de verdad. Si se lo dejáramos en la
      //    mano, la próxima vez que le tocara "juntar carbón" la meta se
      //    cumpliría sola en el acto — y pasó, tres ticks seguidos, y el valle
      //    era una persona anunciando lo mismo una y otra vez.
      const tiene = enMano.find((o) => o.holder_id === who.id && o.kind === falta)
      if (tiene) {
        await db.from('objects').delete().eq('id', tiene.id)
        enMano.splice(enMano.indexOf(tiene), 1)
        // No usa la lista blanca, y es a propósito: no afirma la meta, cuenta
        // el ACTO —que sí pasó— y cita la meta como lo que venía persiguiendo.
        // Es lo que evita que salga «Odila recuperó los frascos que le debían»
        // cuando en realidad se destiló uno ella misma y nadie le pagó nada.
        // Tres procedencias y tres frases, porque la diferencia es el juego:
        // lo que juntó del suelo, lo que hizo con sus manos, y lo que le hizo
        // otro — que es lo único que puede quedar diciendo el nombre de un
        // muerto. `made_by = null` es "nadie lo hizo", nunca "no se sabe".
        //
        // Y las tres son neutras de género a propósito: «que tenía guardado»
        // le pone masculino a la raíz. En castellano el summary no puede
        // concordar con un `kind` que sale de una tabla, así que la frase se
        // escribe para no tener que concordar con nada.
        const deDonde = tiene.made_by === null ? 'de lo que tenía juntado'
          : tiene.made_by === who.name ? 'que había hecho'
            : `que había hecho ${tiene.made_by}`
        await cumplirAgenda(agenda, who, nextTick, ev, {
          kind: 'agenda_cumplida', place_id: who.place_id,
          summary: `${who.name} usó ${falta} ${deDonde}`
            + ` y cerró lo que venía persiguiendo: ${agenda.goal}.`,
          detail: {
            npc: who.name, person: who.name, goal: agenda.goal, object: falta,
            made_by: tiene.made_by ?? null, como: 'lo tenía',
          },
        })
        continue
      }

      // 2. ¿Crece en algún lado? Va, y busca. La raíz la junta cualquiera y no
      //    hace falta saber nada — la misma regla que en `case 'buscar'`.
      const tipo = tipoQueDa(falta)
      if (tipo) {
        const donde = lugarPorKind(tipo)
        if (!donde) { await diaGastado(true); continue }

        // Ponerse en camino. **Si en el destino hay algo parado, esto no es un
        // viaje: es una salida**, y puede terminar con alguien que no vuelve.
        // Todo lo que decide eso está en `salir()`; acá sólo está la puerta.
        //
        // Un bicho sólo nace en `bosque` o `ruina` (ver la pasada 4b), así que
        // encontrar uno en el destino ya quiere decir que el destino es un
        // lugar salvaje: no hace falta preguntarlo dos veces.
        if (who.place_id !== donde.id) {
          const bicho = amenazas.find((a) => a.place_id === donde.id)
          if (bicho) {
            if (await salir(who, agenda, falta, donde, bicho) === 'no_volvio') continue
            await diaGastado()
            continue
          }
          // `ir`. Sin evento, y ésa es la decisión de ruido más importante de
          // todo el archivo: ver la nota de arriba.
          await mover(who, donde)
          await diaGastado()
          continue
        }

        // Estar en el lugar equivocado tiene que costar algo también del lado
        // de los NPCs, o el mapa es decorado. No es un bloqueo duro a
        // propósito: con un bicho parado en el Sotobosque y nadie conectado
        // para matarlo, trabaría todas las agendas de juntar del valle.
        const bicho = amenazas.find((a) => a.place_id === donde.id)
        if (bicho && Math.random() < P_SE_VUELVE) {
          if (Math.random() < 0.5) {
            ev({ kind: 'retirada', place_id: donde.id,
              // Decía «llegó hasta X, vio ... y se volvió», y **no llegó ese
              // día**: a esta rama sólo se entra estando ya en el lugar, así
              // que la llegada fue ayer o la semana pasada. Es una afirmación
              // chica y falsa, de las que el director agarra y amuebla —y
              // ahora se ve más, porque el día que sí se llega puede salir un
              // `pelea` al lado y quedaban los dos contando la misma llegada.
              summary: `${who.name} estuvo en ${donde.name}, vio ${bicho.nombre ?? bicho.kind} y no se metió.`,
              detail: {
                npc: who.name, person: who.name, place: donde.name,
                threat: bicho.nombre ?? bicho.kind, goal: agenda.goal,
              } })
          }
          await diaGastado()
          continue
        }

        // `buscar`, con el mismo sorteo y los mismos pesos que el jugador.
        const sale = loQueSale(donde.kind)

        if (sale === falta) {
          // Volvió con lo suyo. Y vuelve de verdad: el mandado es de ida y
          // vuelta, y si nadie volviera el valle se vaciaría de a una persona
          // por vez hasta que no quede nadie en ninguna fragua.
          const casa = tallerDe(who.id)
          const volvio = !!casa && casa.id !== donde.id
          if (casa && volvio) await mover(who, casa)
          // Cuando la meta ya nombra la cosa —«traer raíz del Sotobosque»— la
          // coletilla decía «con raíz del Sotobosque, que era lo que le
          // faltaba para traer raíz del Sotobosque». Si la frase ya se
          // entiende sola, se corta.
          const porQue = agenda.goal.includes(falta)
            ? '' : `, que era lo que le faltaba para ${agenda.goal}`
          await cumplirAgenda(agenda, who, nextTick, ev, {
            kind: 'agenda_cumplida', place_id: who.place_id,
            summary: volvio
              ? `${who.name} volvió de ${donde.name} con ${falta}${porQue}.`
              : `${who.name} salió de ${donde.name} con ${falta}${porQue}.`,
            detail: {
              npc: who.name, person: who.name, goal: agenda.goal,
              object: falta, place: donde.name, como: 'lo juntó',
            },
          })
          continue
        }

        if (sale) {
          // Levantó otra cosa de paso. Entra al mundo igual que cuando la
          // levanta el jugador —⚠ `made_by` en null, NADIE LO HIZO— y se la
          // guarda. No es noticia, y algún día le va a servir: el hierro que
          // junta hoy buscando carbón es con lo que rehace las bisagras en
          // dos semanas, y eso se cuenta solo cuando pasa.
          const q = 40 + roll(35)
          const { data: nuevo } = await db.from('objects').insert({
            region_id: region.id, kind: sale, quality: q,
            made_by: null, made_tick: nextTick,
            holder_kind: 'person', holder_id: who.id,
          }).select('id').single()
          if (nuevo) {
            enMano.push({
              id: nuevo.id, kind: sale, quality: q, made_by: null, holder_id: who.id,
            })
          }
          await diaGastado()
          continue
        }

        // Volvió con las manos vacías.
        if (Math.random() < 0.4) {
          ev({ kind: 'busqueda', place_id: donde.id,
            summary: `${who.name} anduvo revolviendo ${donde.name} y volvió con las manos vacías.`,
            detail: {
              npc: who.name, person: who.name, place: donde.name,
              object: null, goal: agenda.goal,
            } })
        }
        await diaGastado()
        continue
      }

      // 3. No crece: lo hace alguien. Acá está la regla de la escasez del lado
      //    de los NPCs — el frasco sale de las manos de quien sabe destilar, y
      //    si no queda nadie vivo que lo sepa hacer, la meta se traba. Si el
      //    NPC "consiguiera" un frasco de la nada la escasez sería decorativa,
      //    que es exactamente lo que hacía el contador.
      const receta = recetas.find((r) => r.makes === falta)
      const quienSabe = receta ? await quienLoSabeHacer(falta, people, players) : null
      if (!quienSabe || !receta) {
        await db.from('agendas').update({ state: 'bloqueada' }).eq('id', agenda.id)
        ev({ kind: 'agenda_bloqueada', place_id: who.place_id,
          summary: `${who.name} dejó de intentar ${agenda.goal}: ya no queda nadie que sepa hacer ${falta}.`,
          detail: {
            npc: who.name, person: who.name, goal: agenda.goal, object: falta,
          } })
        continue
      }

      // 3a. ¿Lo sabe hacer? Va al taller y lo hace: `trabajar`, con las mismas
      //     dos condiciones que el jugador — el saber y el lugar.
      const suyo = sabeQue(who.id, receta.id)
      if (suyo) {
        const taller = receta.makes_at ? lugarPorKind(receta.makes_at) : undefined
        if (!taller) { await diaGastado(true); continue }
        if (who.place_id !== taller.id) {
          await mover(who, taller)
          await diaGastado()
          continue
        }

        // Practicar mejora, igual que al jugador: la próxima le va a salir
        // mejor, y eso lo ve todo el que la use.
        const antes: number = suyo.destreza
        const ahora = Math.min(100, antes + mejora(antes))
        await db.from('knows')
          .update({ destreza: ahora, veces: suyo.veces + 1 }).eq('id', suyo.id)
        suyo.destreza = ahora
        suyo.veces += 1

        const q = calidad(antes)
        const { data: hecho } = await db.from('objects').insert({
          region_id: region.id, kind: falta, quality: q,
          made_by: who.name, made_tick: nextTick,
          holder_kind: 'person', holder_id: who.id,
        }).select('id').single()
        if (hecho) {
          enMano.push({
            id: hecho.id, kind: falta, quality: q, made_by: who.name, holder_id: who.id,
          })
        }
        ev({ kind: 'fabricacion', place_id: taller.id,
          summary: `${who.name} hizo ${falta} en ${taller.name}.`,
          detail: {
            npc: who.name, person: who.name, object: falta,
            quality: q, destreza: ahora,
          } })
        // La meta se cierra mañana, gastándolo. Que la cosa exista un día
        // entero antes de quemarse no es un detalle de implementación: hay
        // algo nuevo en el mundo y alguien lo puede ver.
        await diaGastado()
        continue
      }

      // 3a-bis. No lo sabe hacer: **se lo pide al que sabe.**
      //
      //   Va antes de 3b y ése es el cambio entero. Aprender el oficio para
      //   conseguir UNA cosa es lo que hacía el valle hasta hoy y es lo que
      //   apaga el juego: Sarn aprendiendo a forjar para tener una hoja deja al
      //   valle con cinco herreros y sin nada que perder cuando se muera Ilde.
      //   Pedírselo a Ilde deja el saber donde estaba y crea una deuda.
      const pedido = await irAPedir(who, agenda, falta, receta)
      if (pedido === 'recibio') continue
      if (pedido === 'viaja') { await diaGastado(); continue }
      // Un "no" es un día trabado, con el mismo criterio que ya estaba escrito
      // acá: buscar y no encontrar es progreso, querer algo que alguien te está
      // negando no lo es. Es lo que le da salida a un pedido que nunca va a
      // salir, y la salida es `P_SUELTA`, no un caso especial.
      if (pedido === 'negativa') { await diaGastado(true); continue }

      // 3b. Nadie a quien pedírselo. ¿Hay alguien vivo que enseñe? Va y
      //     aprende — es el bucle chico del juego corriendo solo entre NPCs, y
      //     ahora es el ÚLTIMO recurso y no el primero.
      const fue = await irAAprender(who, receta.id)
      await diaGastado(fue === 'nadie')
      continue
    }

    // ── Le falta un SABER ─────────────────────────────────
    if (agenda.needs_kind === 'knowledge' && agenda.needs_id) {
      // Si ya consiguió lo que le faltaba, la meta está cumplida — aunque el
      // progreso no haya llegado a ningún lado. Sin esto la gente sigue
      // persiguiendo cosas que ya tiene y el director narra ese absurdo.
      if (sabeQue(who.id, agenda.needs_id)) {
        const logro = comoSeCuenta(agenda.goal)
        await cumplirAgenda(agenda, who, nextTick, ev, {
          kind: 'agenda_cumplida', place_id: who.place_id,
          summary: logro
            ? `${who.name} ${logro}: ya sabe lo que le faltaba.`
            : `${who.name} aprendió lo que le faltaba y dio por cerrado lo suyo.`,
          detail: { npc: who.name, person: who.name, goal: agenda.goal },
        })
        continue
      }

      // ¿Queda alguien VIVO Y DE ACÁ que lo sepa? Antes se contaba `knows`
      // entero, y las filas de un muerto no se borran nunca: una meta podía
      // quedar esperando para siempre a un maestro enterrado, en silencio.
      // Después se arregló lo del muerto pero no lo del valle: `holder_kind ===
      // 'player'` pasaba a CUALQUIER jugador de la base, y un jugador de
      // `valle-primero` dejaba esta agenda desbloqueada para siempre esperando
      // a alguien que en este mundo no existe — el mismo silencio, otra puerta.
      // Ahora es `siguenEnElValle`, el mismo predicado que usa
      // `perdida_de_saber`.
      const portadores = (await db
        .from('knows').select('holder_kind, holder_id')
        .eq('knowledge_id', agenda.needs_id)).data ?? []
      const siguenAcá = siguenEnElValle(portadores, people, players)
      if (siguenAcá.length === 0) {
        await db.from('agendas').update({ state: 'bloqueada' }).eq('id', agenda.id)
        ev({ kind: 'agenda_bloqueada', place_id: who.place_id,
          summary: `${who.name} dejó de intentar ${agenda.goal}: ya no queda nadie que sepa lo que necesita.`,
          detail: { npc: who.name, person: who.name, goal: agenda.goal } })
        continue
      }

      const fue = await irAAprender(who, agenda.needs_id)
      if (fue === 'aprendio') {
        // Se cierra ACÁ, en el mismo día. Cita la meta como lo que venía
        // persiguiendo y cuenta lo que de verdad pasó; el nombre de quien
        // enseñó ya está en el evento `ensenanza` que acaba de salir.
        await cumplirAgenda(agenda, who, nextTick, ev, {
          kind: 'agenda_cumplida', place_id: who.place_id,
          summary: `${who.name} llevaba tiempo detrás de ${agenda.goal}, y hoy se lo enseñaron.`,
          detail: {
            npc: who.name, person: who.name, goal: agenda.goal,
            como: 'se lo enseñaron',
          },
        })
        continue
      }
      // Viaja hacia el maestro, o no hay nadie dispuesto. Lo segundo es una
      // historia —el que lo sabe se lo guarda— y una puerta: el jugador sí
      // puede enseñárselo, y `case 'ensenar'` ya le cierra la meta con su
      // nombre puesto.
      await diaGastado(fue === 'nadie')
      continue
    }

    // ── No le falta nada: trabaja en lo suyo ──────────────
    //
    // `trabajar` sin producto no emite evento: es el día de laburo de
    // cualquiera y repetido cuatro veces es una planilla. Lo que se cuenta es
    // el cruce de la mitad —una vez por meta, en la transición— y el cierre.
    const hecho = Math.min(100, agenda.progress + DIA_DE_TRABAJO)
    if (hecho >= 100) {
      // Acá, y sólo acá, la simulación no tiene un acto concreto que contar:
      // lo único que sabe es que las jornadas alcanzaron. Por eso ésta es la
      // rama que **sí** pasa por la lista blanca — la frase que dice QUÉ pasó
      // tiene que estar escrita para esa meta o no se dice. Es la red que
      // evitó que un template genérico matara a una NPC viva.
      const logro = comoSeCuenta(agenda.goal)
      await cumplirAgenda(agenda, who, nextTick, ev, {
        kind: 'agenda_cumplida', place_id: who.place_id,
        summary: logro
          ? `${who.name} ${logro}.`
          : `${who.name} dio por cerrado lo que venía persiguiendo.`,
        detail: { npc: who.name, person: who.name, goal: agenda.goal },
      })
      continue
    }
    await db.from('agendas').update({ progress: hecho }).eq('id', agenda.id)
    // Una vez por meta, en la transición, y por construcción no se puede
    // repetir: cuatro jornadas de 25 cruzan la mitad exactamente una vez.
    if (agenda.progress < 50 && hecho >= 50) {
      ev({ kind: 'agenda_avanza', place_id: who.place_id,
        summary: comoSeCuenta(agenda.goal)
          ? `${who.name} avanzó bastante con ${agenda.goal}.`
          : `${who.name} avanzó bastante con lo suyo.`,
        detail: {
          npc: who.name, person: who.name, goal: agenda.goal, progress: hecho,
        } })
    }
  }

  // ── 2b. Se hablan, y eso no es noticia ────────────────────
  //
  // Un par por día, de los que están en el mismo lugar, y **cero eventos**. Es
  // `hablar` entre NPCs y la decisión de ruido es la misma que la de `ir`: un
  // saludo entre vecinos no es una noticia, es el fondo. Lo que deja es estado
  // —el aprecio sube de a dos hasta `TOPE_DE_TRATO`— y el estado se ve por
  // donde tiene que verse: en a quién le pide las cosas la gente, y en lo que
  // los NPCs dicen de otros NPCs cuando el jugador les pregunta.
  //
  // Va detrás de `pace` como las agendas y la enseñanza, porque esto sí es
  // historia: con la región vacía el valle también teje más despacio.
  //
  // Las dos cuentas: un par por tick son ~365 acercamientos por año de mundo
  // repartidos entre los pares que de verdad comparten lugar (dos o tres), y
  // como el tope corta en 20, cada par llega ahí en unos diez encuentros y
  // después esto no hace nada. En tiempo real, cuatro por día.
  if (Math.random() < pace) {
    const grupo = pick(places
      .map((l) => people.filter((p) => p.place_id === l.id))
      .filter((xs) => xs.length >= 2))
    if (grupo) {
      const uno = pick(grupo)!
      const otro = pick(grupo.filter((p) => p.id !== uno.id))
      if (otro) await hablarse(uno, otro)
    }
  }

  // ── 3. Enseñanza espontánea entre NPCs ────────────────────
  //
  // El saber circula solo. Lento, pero circula.
  //
  // **Bajó de 0,35 a 0,12 y no es un ajuste cosmético: era la enseñanza
  // espontánea o la escasez.** Este sorteo elige un maestro y un alumno que
  // estén EN EL MISMO LUGAR, y hasta ayer casi nadie se movía: los pares
  // posibles eran Ilde+Bruno en la fragua y Odila+Sarn en la aldea, así que la
  // mayoría de los tiros no encontraba a nadie y salían dos enseñanzas cada
  // cuarenta ticks. Con la pasada 2 ejecutando verbos la gente cruza el valle
  // todo el tiempo, el sorteo empezó a acertar y en la primera corrida
  // **Forja simple pasó de una cabeza a cinco en veinticinco ticks**. Un valle
  // donde todos saben todo no tiene nada que perder cuando se muere alguien, y
  // eso es el juego entero.
  //
  // Lo otro que cambió es que esto ya no es lo único que mueve el saber: un
  // NPC que necesita un oficio ahora **va a buscarlo** (`irAAprender`). Esa
  // enseñanza es mejor que ésta en todo sentido — tiene motivo, cierra una
  // meta y se puede contar. Así que la espontánea pasa a ser lo que dice el
  // nombre: el saber que se pega por estar al lado, de vez en cuando.
  //
  // Las dos cuentas: 12% por tick son ~44 tiros por año de mundo, y sólo
  // aciertan los que caen sobre un par con algo nuevo que pasarse. Medido,
  // deja el total de enseñanzas (espontáneas + buscadas) en ~0,11 por tick.
  //
  // ── El `populated` que había acá era un CERO, no un freno ────────────────
  //
  // **El 0,12 no se movió y no se va a mover.** Lo que se movió es la puerta,
  // y era una puerta binaria en un archivo donde todo lo demás es `pace`:
  // las agendas corren a `pace * P_JORNADA`, el chusmerío a `pace`, las
  // amenazas a paso entero. Sólo la enseñanza estaba en `populated &&`, o sea
  // **apagada del todo** cuando no hay nadie mirando. Y la muerte, que es lo
  // que hay del otro lado de la balanza, nunca estuvo frenada por nada.
  //
  // Eso convertía a §7.3 —«cuatro veces más lento con la región vacía»— en
  // «infinitamente más lento», y es la causa mecánica de la frase de §9.2 que
  // motivó esta tarea: *una región sin jugadores... el saber sólo puede bajar*.
  // No podía hacer otra cosa: el saber se moría a tasa completa y lo único que
  // lo copia estaba en cero.
  //
  // Está medido y por eso se toca. Ocho valles × 600 ticks sin nadie adentro,
  // con los nacimientos ya puestos: **0,0037 enseñanzas por tick**, y las 18
  // que hubo eran TODAS buscadas —la espontánea aportó cero, como corresponde a
  // un `false &&`—. Con jugador, en la misma versión, 0,0202.
  //
  // El cambio es exactamente equivalente en un valle con gente adentro: ahí
  // `populated` es true y `pace` es 1, así que `pace * 0,12` es 0,12, el mismo
  // número y el mismo sorteo. **Sólo cambia lo que pasa cuando no mira nadie**,
  // que es de 0 a 0,03 por tick — los cuatro veces más lento que pide §7.3, ni
  // uno más.
  if (Math.random() < pace * 0.12) {
    const maestro = pick(people.filter((p) => p.teaches))
    if (maestro) {
      const alumno = pick(people.filter(
        (p) => p.id !== maestro.id && p.place_id === maestro.place_id))
      if (alumno) {
        const sabe = (await db
          .from('knows').select('knowledge_id')
          .eq('holder_kind', 'person').eq('holder_id', maestro.id)).data ?? []
        const yaSabe = (await db
          .from('knows').select('knowledge_id')
          .eq('holder_kind', 'person').eq('holder_id', alumno.id)).data ?? []
        const yaTiene = new Set(yaSabe.map((k) => k.knowledge_id))
        const candidato = pick(sabe.filter((k) => !yaTiene.has(k.knowledge_id)))
        if (candidato) {
          const { data: k } = await db
            .from('knowledge').select('name').eq('id', candidato.knowledge_id).single()
          await db.from('knows').insert({
            holder_kind: 'person', holder_id: alumno.id,
            knowledge_id: candidato.knowledge_id,
            learned_from: maestro.id, how: 'aprendido', learned_tick: nextTick,
          })
          // Igual que en la enseñanza buscada: al que te enseñó lo suyo se lo
          // recuerda, y eso es lo que después hace que te den lo que le pedís.
          await tocarVinculoEntre(alumno.id, maestro.id, 20)
          const cuantos = await cuantosLoSaben(candidato.knowledge_id, region.id, people)
          ev({ kind: 'ensenanza', place_id: maestro.place_id,
            summary: `${alumno.name} aprendió ${k?.name}. Se lo enseñó ${maestro.name}.`
              + (cuantos > 1 ? ` Ahora lo saben ${enLetras(cuantos)}.` : ''),
            detail: {
              from: maestro.name, to: alumno.name, knowledge: k?.name,
              lo_saben: cuantos,
            } })
        }
      }
    }
  }

  // ── 4. Muerte, y lo que se lleva puesto ───────────────────
  //
  // La parte que le da peso a todo: un maestro que se muere sin enseñar borra
  // ese saber de la región. No es lore, es estado.
  //
  // **El número no se movió y hay que entender por qué.** 0,8% por tick es una
  // muerte cada 125 días del valle, o sea 2,9 por año de mundo en un valle de
  // siete personas. Eso es demografía sana y es lo único que importa: en
  // tiempo de mundo está bien. (El comentario que había acá decía "con un tick
  // por hora son ~1 muerte cada 5 días" y quedó viejo con el cambio de ritmo.)
  //
  // En tiempo real, con cuatro ticks por día, es una muerte cada ~31 días si
  // no juega nadie — y bastante más seguido si sí, porque cada acción de un
  // jugador es un tick más.
  //
  // Lo que NO arregla mover este número: el test de la Fase 0 son siete días
  // reales = 28 ticks de cron, y P(alguien se muera) = 1 − 0,992²⁸ = 20%.
  // Para llevarlo al 80% haría falta 5,6% por tick, o sea una muerte cada 18
  // días del valle: veinte por año en un pueblo de siete. Eso ya se probó (al
  // 6% con ticks de diez minutos eran ocho muertes diarias) y consume el
  // valle. **No hay número que sea sano en tiempo de mundo y a la vez
  // probable en 28 días de mundo: la ventana del test es corta, no la
  // probabilidad chica.** El arreglo va en el diseño del test, no acá.
  //
  // Lo que sí se puede hacer sin tocar la tasa: elegir mejor QUIÉN se muere.
  // Ver `elQueSeVa`.
  if (Math.random() < P_MUERTE && people.length > 3) {
    const muerto = await elQueSeVa(people, players)
    if (muerto) {
      // Todo lo que significa morirse —bajar la bandera, contar lo que se
      // llevó puesto, cerrarle las metas— vive en `seMuere` y lo comparten las
      // dos formas de irse que tiene este valle: ésta, el sorteo, y la salida
      // que no vuelve. Es el mismo hecho contado con otra frase, y **la frase
      // es lo único que cambia**: si `perdida_de_saber` se escribiera dos
      // veces, el evento del que cuelga la tesis del juego tendría dos dueños.
      await seMuere({
        tick: nextTick, muerto, donde: muerto.place_id, people, players, ev,
        evento: {
          kind: 'muerte', place_id: muerto.place_id,
          summary: `Murió ${muerto.name}, ${muerto.trade}, en ${placeName(muerto.place_id)}.`,
          detail: { person: muerto.name },
        },
      })

      // Las agendas corren antes que la muerte en el mismo tick, así que un
      // muerto puede haber "conseguido" algo y "puesto a" otra cosa segundos
      // antes de morirse. El director lee esos eventos y narra a un fantasma
      // laburando — pasó de verdad: «Ren sigue en la Casa Quemada persiguiendo
      // algo nuevo». Se descartan antes de escribirlos.
      //
      // Y ahora la pasada 2 no sólo mueve contadores: el muerto pudo haber
      // bajado a la Casa Quemada, forjado algo o aprendido una runa en este
      // mismo tick. Todo lo que hace un NPC por su cuenta va marcado con
      // `detail.npc`, así que se cae junto con lo demás. **No filtra por
      // nombre suelto a propósito**: un evento de un JUGADOR que lo nombra
      // —«Pedro le dio la raíz a Ren»— pasó de verdad y tiene que quedar.
      const vivos = events.filter((e) =>
        !(e.kind.startsWith('agenda_') && e.detail?.person === muerto.name)
        && e.detail?.npc !== muerto.name)
      events.length = 0
      events.push(...vivos)
    }
  }

  // ── 4b. Las amenazas ──────────────────────────────────────
  // Antes los monstruos vivían en la máquina de cada jugador: los matabas y
  // el mundo no se enteraba. Ahora viven acá, los ve todo el mundo, y matar
  // uno deja un evento que el director puede contar.
  //
  // `amenazas` se lee arriba, en la pasada 2: los NPCs la consultan para
  // decidir si se meten en el Sotobosque o se vuelven. La lista es la misma y
  // el momento en que se lee también, así que las que nacen abajo siguen sin
  // morder en el mismo tick en que nacen, igual que siempre.

  // Aparecen donde tiene sentido que aparezcan, y de a poco. Un valle lleno de
  // bichos deja de dar miedo: se vuelve una cola de tareas — por eso el tope
  // de tres, que es lo que sostiene esa regla y no se toca.
  //
  // Lo que cambió es la VELOCIDAD DE REPOSICIÓN, y son dos cosas:
  //
  //   · **Se tira una vez por lugar vacante, no una vez por tick.** Así el
  //     valle se repone más rápido cuanto más vacío está, que es la forma que
  //     uno quiere: limpiaste las tres y el valle vuelve a tener dientes;
  //     quedan dos y no pasa casi nada. Con 60% por vacante, salir de cero es
  //     93,6% en UN tick (1 − 0,4³) contra 35% antes.
  //   · **Ya no lo frena `pace`.** `pace` existe para que la HISTORIA no se
  //     escape mientras nadie mira: agendas, enseñanza, chusmerío. Una amenaza
  //     no es historia, es el estado del valle, y un valle que cría bichos
  //     mientras no hay nadie es exactamente lo que querés encontrar cuando
  //     volvés. Con `pace` puesto, el que limpiaba el valle y se iba se lo
  //     encontraba igual de vacío al otro día: 0,35 × 0,25 = 8,75% por tick,
  //     cuatro ticks por día, o sea cinco días reales para volver al tope.
  //     Es una desviación consciente de §7.3 ("cuatro veces más lento vacío"),
  //     y se la banca el tope de tres: esto no puede desbordar.
  //
  // Las cuentas, que es lo que faltó la última vez:
  //   · en tiempo de MUNDO — con dos vivas, una nueva cada 1,7 días del valle.
  //   · en tiempo REAL, sólo cron — 4 ticks/día: de cero a tres en ~2,5 ticks,
  //     unas 15 horas; la primera aparece en ~6 horas. Antes eran 17 horas
  //     sólo para la primera y cinco días para el tope.
  //   · en tiempo REAL, con alguien jugando — cada acción es un tick, así que
  //     el valle vuelve al tope en tres o cuatro acciones.
  //
  // Tope de dos nuevas por tick: es ruido lo que estamos racionando, no
  // bichos. Tres «Hay algo rondando X» en la misma crónica es una planilla.
  const salvaje = places.filter((p) => p.kind === 'bosque' || p.kind === 'ruina')
  let nacidas = 0
  for (let vacante = 3 - amenazas.length; vacante > 0 && nacidas < 2; vacante--) {
    if (Math.random() >= P_AMENAZA) continue
    const donde = pick(salvaje)
    const que = pick(['una jauría de sombra', 'algo que baja del Sotobosque', 'un merodeador'])!
    if (!donde) break
    const vida = 30 + roll(40)
    await db.from('threats').insert({
      region_id: region.id, place_id: donde.id, kind: que,
      health: vida, max_health: vida, spawned_tick: nextTick,
    })
    nacidas++
    // Decía «Vieron X rondando Y» y no vio nadie: no hay testigo en ninguna
    // tabla. El director agarra ese "vieron" y te inventa quién lo vio.
    ev({ kind: 'amenaza', place_id: donde.id,
      summary: `Hay ${que} rondando ${donde.name}.`,
      detail: { threat: que, place: donde.name } })
  }

  // Y muerden. Estar en el lugar equivocado tiene que costar algo, o el mapa
  // es decorado.
  //
  // **Muerden sólo al que está adentro AHORA.** La ventana era `tick -
  // last_seen <= 3`, que con el tick de seis horas son DIECIOCHO HORAS REALES:
  // te desconectabas a la tarde y entrabas al otro día herido o caído por algo
  // que pasó mientras dormías. Con `players.health` real y visible en el
  // cliente eso es exactamente lo que `DISENO.md` §9.3 prohíbe — perder nunca
  // puede costarte tiempo de juego — y §2, perder no te devuelve a cero.
  //
  // No se tocó el 50% por tick: en tiempo de mundo está bien (medio día de
  // valle parado al lado de un bicho y te muerde una vez). Lo que cambió es
  // cuándo cuenta ese tick. En tiempo real: un tick de cron cae dentro de tu
  // ventana de cinco minutos el 1,4% de las veces (5/360), así que en la
  // práctica **te muerde el mundo mientras jugás y nadie más** — y jugando te
  // muerde seguido, porque cada acción tuya es un tick.
  //
  // El daño sí se movió, y es la única cosa que se movió acá: era `6 + roll(10)`
  // —6 a 15, 10,5 de media— y pasó a ser el de `recibirGolpe()`, `8 + roll(8)`
  // —8 a 15, 11,5 de media—. Es +1 punto por mordida, +9,5%: de 100 de vida,
  // caer pasa de 9,5 mordidas a 8,7. No es un número nuevo, es el que ya
  // recibías del otro camino; lo que se eligió no fue subir el daño sino tener
  // uno solo, y el que sobrevive es el que está calibrado contra lo que pega el
  // jugador a mano limpia (`pelear()` sin arma: también `8 + roll(8)`).
  //
  // Cuántas veces dispara, que es lo que hay que saber antes de mover un
  // número. Por (bicho, jugador presente) es 0,5 por tick, con tope de tres
  // bichos:
  //
  //   · **por día de MUNDO** — parado al lado de un bicho, media mordida por
  //     día; parado en el Sotobosque con las tres, 1,5. Medido: diez ticks
  //     seguidos con un jugador quieto ahí dieron **14 mordidas, 1,40 por
  //     tick** (baja de 1,5 porque el día que cae no lo vuelven a morder).
  //   · **por día REAL** — el mundo late cuatro veces al día y **sólo por vuelta
  //     del sol**: desde que `POST /act` dejó de llamar a `step()`, una acción
  //     tuya ya no es un tick. Un tick de cron cae dentro de tu ventana de
  //     presencia de cinco minutos el 1,4% de las veces (5/360), así que son
  //     4 × 0,014 × 1,5 = **0,08 mordidas por día real**. O sea que por este
  //     camino no te muerde casi nunca: **el que te muerde mientras jugás es
  //     `POST /danio` desde el cliente**, que llama a la misma función.
  //
  // Y eso es justamente lo que hace que unificar importe más que el +1 de daño:
  // el camino que casi nunca corre era el que tenía las reglas distintas, así
  // que la diferencia sólo se iba a ver en la crónica de alguien, una vez, sin
  // que nadie supiera por qué esa mordida se contó de otra manera.
  for (const a of amenazas) {
    const presentes = players.filter(
      (p) => p.place_id === a.place_id && adentroAhora(p))
    for (const p of presentes) {
      if (Math.random() > 0.5) continue

      // ¿Alguien te defiende?
      //
      // Ésta es la recompensa de haberte ganado a la gente, y por eso mide
      // aprecio y no miedo: al que temen lo dejan solo. Un valle donde nadie
      // se mete cuando te muerden es un valle donde la reputación es un
      // número en una tabla; que alguien salga a bancarte es lo que la vuelve
      // una relación.
      //
      // Defiende quien te aprecia de verdad (40+) y está donde estás. No es
      // automático: puede pasar o no, porque un rescate garantizado saca el
      // riesgo y el miedo se va con él.
      const cerca = people.filter((q) => q.place_id === a.place_id)
      const leales = []
      for (const q of cerca) {
        const { data: v } = await db.from('bonds').select('valued')
          .eq('person_id', q.id).eq('toward_id', p.id).maybeSingle()
        if ((v?.valued ?? 0) >= 40) leales.push(q)
      }
      const defensor = leales.length && Math.random() < 0.65 ? pick(leales) : undefined
      if (defensor) {
        const golpe = 9 + roll(11)
        const queda = Math.max(0, a.health - golpe)
        await db.from('threats')
          .update(queda > 0
            ? { health: queda }
            : { health: 0, alive: false, killed_by: defensor.name, killed_tick: nextTick })
          .eq('id', a.id)
        ev({ kind: queda > 0 ? 'defensa' : 'amenaza_muerta', place_id: a.place_id,
          summary: queda > 0
            ? `${defensor.name} se metió y le sacó ${conA(a.nombre ?? a.kind)} de encima a ${p.name}.`
            : `${defensor.name} mató ${conA(a.nombre ?? a.kind)} para sacárselo de encima a ${p.name}.`,
          detail: { person: defensor.name, player: p.name, threat: a.nombre ?? a.kind } })
        // Que te salven crea una deuda, y la deuda es contenido: el que te
        // bancó ahora tiene algo tuyo que cobrar.
        await recordar(defensor.id, p, `${defensor.name} se metió a defender a ${p.name}`, nextTick)
        continue
      }

      // La mordida es UNA sola función y está en `combate.ts`, igual que el
      // golpe de ida. Acá había una tercera copia escrita a mano —ver el
      // encabezado de `recibirGolpe()`— y pegaba distinto, narraba distinto, no
      // deduplicaba y no le bajaba el miedo a nadie: te mordía distinto el tick
      // que tu propio cliente. Lo único que queda de este lado es la decisión
      // de A QUIÉN se le tira el dado, que sí es del tick.
      //
      // Y de yapa arregla dos cosas que la copia hacía mal por su cuenta:
      // `amenazas` se leyó en la pasada 2, así que un bicho que acaba de matar
      // un defensor unas líneas más arriba seguía mordiendo con datos viejos, y
      // un jugador ya caído volvía a "caer" —`downed_at_tick` reescrito y un
      // segundo evento `caida` en el mismo tick—. `recibirGolpe()` relee el
      // bicho con `alive = true` y al caído no le pega.
      await recibirGolpe({
        regionId: region.id, tick: nextTick, player: p, threatId: a.id, ev,
        // El tick buferea sus eventos hasta el final, así que el corte de ruido
        // de `recibirGolpe()` no los ve en la tabla: se los mostramos.
        yaEnEsteTick: (kind, jugador, bicho) => events.some((e) =>
          e.kind === kind && e.detail?.player === jugador
          && e.detail?.threat === bicho),
      })
    }
  }

  // ── 4c. El pueblo se defiende solo ────────────────────────
  //
  // **Hasta hoy nadie defendía nada.** La única defensa que existía saltaba
  // cuando un bicho mordía a UN JUGADOR, y defendía al jugador — o sea que una
  // cosa podía quedarse parada en el medio de Vado Bajo para siempre y la
  // gente que vive ahí seguía con lo suyo. Y Sarn es **guardia**: tenía el
  // oficio escrito en la fila y no guardaba nada.
  //
  // Lo pidió la dirección con dos frases: *"las ciudades pueden invadirse"* y
  // *"habrá seguridad"*. Y la mitad ya pasaba sola: en producción hay tres
  // amenazas paradas en La Casa Quemada y en el valle viejo una bajó hasta el
  // vado. **Bajan; lo que faltaba era que alguien hiciera algo.**
  //
  // Quién pelea, en este orden y por un motivo:
  //
  //   1. **El que tiene el oficio.** Un guardia que ve algo en su pueblo y no
  //      se mueve no es un guardia, es un vecino con título.
  //   2. Si no hay, **el que vive ahí** — porque es su casa.
  //
  // Y **no pelea el que está de paso**: si te cruzás una jauría en el
  // Sotobosque yendo a buscar raíz, eso ya lo resuelve la pasada 2 y con otras
  // reglas. Acá se defiende lo propio.
  //
  // Usa `pelear()`, la MISMA función del jugador. Ver el encabezado de
  // `combate.ts`: hubo dos copias del golpe una vez y costó caro.
  for (const a of amenazas) {
    if (!a.place_id) continue
    // Los que tienen la casa ahí. `home_place_id` y no `place_id`: el que pasa
    // caminando no defiende un pueblo que no es suyo.
    const suyos = people.filter((p) =>
      p.home_place_id === a.place_id && p.place_id === a.place_id)
    if (suyos.length === 0) continue

    const guardias = suyos.filter((p) => /guard|solda|centinel/i.test(p.trade ?? ''))
    const quien = guardias[0] ?? suyos[0]!
    // No todos los días. Un pueblo que mata todo lo que aparece el mismo día
    // en que aparece es un pueblo sin amenazas — y la mitad de por qué un
    // bicho da miedo es que sigue ahí mañana.
    if (Math.random() > (guardias.length ? 0.55 : 0.30)) continue

    const golpe = await pelear({
      regionId: region.id, tick: nextTick, quien: 'person',
      player: { id: quien.id, name: quien.name, place_id: quien.place_id },
      threatId: a.id, ev,
      alVerNpc: async (t, npc, mato) => {
        await recordarEntre(t.id, npc.id, `${npc.name} mató a ${mato} en el pueblo`, nextTick)
        await tocarVinculoEntre(t.id, npc.id, 10)
      },
    })
    // El bicho contesta. Si no, defender sale gratis y deja de ser una
    // decisión del mundo para ser un trámite.
    if (golpe.ok && !golpe.muerta) a.health = golpe.health
  }

  // ── 5. El chusmerío mueve la reputación ───────────────────
  // La gente se cuenta lo que vio. Así viaja la fama — mal y despacio.
  const recientes = (await db
    .from('memories').select('id, person_id, about_kind, about_id, what, tick')
    .gte('tick', Math.max(0, region.tick - 2))).data ?? []
  let rumores = 0
  for (const m of recientes) {
    if (rumores >= 3) break
    if (Math.random() > 0.4) continue
    const contador = people.find((p) => p.id === m.person_id)
    // No se le cuenta a alguien lo que hizo alguien, si ese alguien es él.
    // «Sarn le contó a Bruno: Bruno no le dio hoja templada a Sarn» salió en la
    // primera corrida con recuerdos entre NPCs y es una frase absurda, pero el
    // agujero es viejo y también valía para los jugadores: «Ilde le contó a
    // Pedro: Pedro mató a la jauría». Un rumor es lo que se dice de un tercero.
    const oyente = pick(people.filter(
      (p) => p.id !== m.person_id && p.id !== m.about_id
        && p.place_id === contador?.place_id))
    if (!contador || !oyente) continue
    // .limit(1) no es cosmético: maybeSingle() DEVUELVE ERROR si matchea más
    // de una fila, y entonces `data` viene null y la deduplicación no dedupea
    // nada. Se vio en el tick 42 de valle-pruebas: catorce veces la misma
    // frase, y el director cobrando tokens por leer catorce veces lo mismo.
    const { data: yaSabe } = await db
      .from('memories').select('id')
      .eq('person_id', oyente.id)
      .eq('about_id', m.about_id).eq('what', m.what).limit(1).maybeSingle()
    if (yaSabe) continue
    await db.from('memories').insert({
      person_id: oyente.id, about_kind: m.about_kind, about_id: m.about_id,
      what: m.what, heard_from: contador.id, tick: nextTick,
    })
    rumores++
    ev({ kind: 'rumor', place_id: contador.place_id,
      summary: `${contador.name} le contó a ${oyente.name}: ${m.what}`,
      detail: { from: contador.name, to: oyente.name } })
  }

  // ── 6. Los encargos que se cerraron sin vos ───────────────
  //
  // Ésta es la parte incómoda y es la que más importa: te encargaste de
  // conseguirle la raíz a Odila, no volviste en tres días, y Odila la
  // consiguió. No perdiste nada — nunca fue tuya. El valle siguió andando.
  //
  // Vale igual si la cerró otro jugador mientras dormías. No es un bug: es lo
  // que hace que las agendas sean únicas por mundo y no una copia por persona.
  //
  // Ruido: un encargo se cierra UNA vez en su vida. No hay forma de que esto
  // se repita tick a tick, así que no lleva probabilidad.
  if (players.length > 0) {
    const abiertos = (await db
      .from('encargos').select('id, agenda_id, player_id')
      .eq('state', 'activo').in('player_id', players.map((p) => p.id))).data ?? []

    for (const enc of abiertos) {
      const { data: a } = await db
        .from('agendas').select('goal, state, person_id').eq('id', enc.agenda_id)
        .limit(1).maybeSingle()
      // Sigue abierta: nada que contar. Un estado que no cambió no es noticia.
      if (!a || a.state === 'activa' || a.state === 'bloqueada') continue

      await db.from('encargos')
        .update({ state: 'perdido', closed_tick: nextTick }).eq('id', enc.id)

      const quien = people.find((p) => p.id === a.person_id)
      const jugador = players.find((p) => p.id === enc.player_id)
      if (!quien || !jugador) continue
      // La rama de "cumplida" afirma la meta, así que pasa por la lista
      // blanca igual que las demás. La de "soltó lo suyo" la cita como deseo
      // —«se había encargado de eso: <meta>»— y eso siempre es verdad.
      const logro = comoSeCuenta(a.goal)
      ev({ kind: 'encargo_perdido', place_id: quien.place_id,
        summary: a.state === 'cumplida'
          ? (logro
            ? `${quien.name} ${logro} sin esperar a ${jugador.name}, que se había encargado.`
            : `${quien.name} lo resolvió solo, sin esperar a ${jugador.name}, que se había encargado.`)
          : `${quien.name} soltó lo suyo y ${jugador.name} se había encargado de eso: ${a.goal}.`,
        detail: { person: quien.name, player: jugador.name, goal: a.goal } })
    }
  }

  // ── 6b. El cierre del día — quién no volvió, y qué no abrió ───────────────
  //
  // **El tick del cron cae a medianoche del valle.** No es casualidad: late por
  // vuelta del sol y los bordes del bloque son las 00, 06, 12 y 18 UTC (ver
  // `horaDelValle()` y `latir()` en `web.ts`). Así que este es, casi siempre, el
  // momento en que el valle se acuesta, y es la hora en que preguntar quién
  // volvió a su casa quiere decir algo. El que empuja un jugador puede caer un
  // rato más tarde y no cambia nada: lo que se mira no es la hora, es dónde
  // quedó cada uno al terminar el día.
  //
  // **Acá NO se emite la rutina.** Es la trampa entera de esta pasada y hay que
  // decirla fuerte: si cada persona emitiera «se fue a dormir» y «se levantó»,
  // catorce eventos diarios de gente durmiendo convertirían la crónica en una
  // planilla y el director cobraría por leerla. La regla de siempre, aplicada
  // al caso: **un estado que cambió como todos los días no es noticia.** Que
  // Ilde duerma en su cama es el fondo, no el hecho.
  //
  // Lo que se cuenta es la AUSENCIA de rutina, y son dos cosas, las dos por
  // TRANSICIÓN y las dos con su estado en la base para no repetirse:
  //
  //   · **no volvió a dormir** — la jornada lo dejó en el monte o en la ruina y
  //     ahí se quedó. Se cuenta la primera noche y ninguna más: las que siguen
  //     son el estado, y el estado se ve solo (`people.durmio_fuera_desde`).
  //     Medido en `valle-pruebas`: Odila lleva catorce noches en el Sotobosque
  //     y el valle lo dijo **una vez**, el día que se quedó.
  //   · **el taller no abrió** — nadie que trabaje ahí pisó el lugar en todo el
  //     día. Una vez, el día que se apaga; una fragua que lleva un mes apagada
  //     no es noticia todos los días (`places.ultimo_dia_abierto`).
  //
  // Y no se cuenta la vuelta —ni la del que volvió del monte ni la del taller
  // que volvió a abrir— por lo mismo: **la rutina que se restablece es rutina.**
  //
  // Nada de esto pasa por `pace`. No es historia que se escape mientras nadie
  // mira: es el estado del valle, igual que las amenazas y las llegadas, y
  // además no tiene probabilidad que frenar — o volvió o no volvió.
  //
  // **Las dos cuentas, medidas y no estimadas.** Ocho valles recién sembrados,
  // 200 ticks cada uno, con alguien adentro para que `pace` sea 1 y sin que ese
  // alguien juegue. Cuatro con las dos noticias sueltas y cuatro con la fusión
  // de más abajo:
  //
  //   · sueltas — 98 en 800 ticks, **0,1225 por tick** (66 `noche_afuera` y 32
  //     `sin_abrir`), y salían casi siempre pegadas, que es lo que hizo falta
  //     medir para darse cuenta de que eran una sola;
  //   · fusionadas — 64 en 800 ticks, **0,080 por tick**: 60 `noche_afuera` (22
  //     de ellos con el taller cerrado adentro) y 4 `sin_abrir` sueltos. Un 35%
  //     menos de renglones para exactamente los mismos hechos.
  //
  //   · en tiempo de MUNDO — una noticia de rutina cada **12 días del valle**,
  //     y es el **7,1%** de todo lo que emite el valle (1,13 eventos por tick).
  //     Está muy por debajo del techo de dos o tres por día que pedía la tarea,
  //     y tiene que estarlo: lo que se ve todo el tiempo es la rutina, que no
  //     cuesta un solo evento; lo que se cuenta es cuando se rompe.
  //   · en tiempo REAL, sólo cron — cuatro ticks por día: **una cada tres días
  //     reales**. Con alguien jugando es lo mismo: el mundo late por vuelta del
  //     sol y no por acción.
  //
  // (Los ocho valles quedaron en la base como `rutina-1` … `rutina-8`, los
  // cuatro primeros con las noticias sueltas y los cuatro últimos con la
  // fusión, por si alguien quiere volver a contar.)

  // ── Los talleres. Se miran PRIMERO, y no se emiten todavía ────────────────
  //
  // **Un taller es un lugar donde se hace un oficio, y no todos los `makes_at`
  // lo son.** La aldea y el camino quedan afuera a propósito: ahí vive y pasa
  // gente todo el tiempo, así que «hoy no abrió Vado Bajo» sería falso y «hoy
  // no abrió El Camino del Norte» no querría decir nada. Lo que abre y cierra
  // es la fragua — y cualquier taller que el generador ponga mañana.
  const NO_SON_TALLER = new Set(['aldea', 'camino'])
  // Quién trabaja en cada taller: los vivos de acá que saben una receta que se
  // hace ahí. Sale de lo que ya está leído; no cuesta una consulta.
  const trabajanEn = new Map<string, typeof people>()
  for (const k of saberesDe) {
    const r = recetas.find((x) => x.id === k.knowledge_id)
    const l = r?.makes_at ? lugarPorKind(r.makes_at) : undefined
    if (!l || NO_SON_TALLER.has(l.kind)) continue
    const quien = people.find((q) => q.id === k.holder_id)
    if (!quien) continue                       // muerto, o de otro valle
    const xs = trabajanEn.get(l.id) ?? []
    if (!xs.some((q) => q.id === quien.id)) xs.push(quien)
    trabajanEn.set(l.id, xs)
  }
  // El día que se muere alguien la crónica ya tiene su noticia, y la fragua
  // apagada es la misma noticia contada dos veces: la herrera se murió, la
  // fragua no abre. Se calla acá y se cuenta sola cuando el valle siga.
  const huboMuerte = events.some((e) => e.kind === 'muerte' || e.kind === 'no_volvio')
  const cerroHoy: { lugar: { id: string; name: string }; trabajan: typeof people }[] = []
  for (const [placeId, trabajan] of trabajanEn) {
    const lugar = lugarPorId(placeId)
    if (!lugar) continue
    if (trabajan.some((q) => q.place_id === placeId)) {
      if (lugar.ultimo_dia_abierto !== nextTick) {
        await db.from('places').update({ ultimo_dia_abierto: nextTick }).eq('id', placeId)
        lugar.ultimo_dia_abierto = nextTick
      }
      continue
    }
    // Sólo la transición: abrió ayer y hoy no. Si ya estaba cerrado —o si no lo
    // vimos abrir nunca, que es `null`— no pasó nada nuevo.
    if (lugar.ultimo_dia_abierto !== nextTick - 1 || huboMuerte) continue
    cerroHoy.push({ lugar, trabajan })
  }

  // ── Los que no volvieron ──────────────────────────────────────────────────
  //
  // `dondeDuerme` es la misma función que usa el cliente por `rutinaDe()`, así
  // que el que aparece durmiendo en el Sotobosque en la pantalla es exactamente
  // el que sale nombrado acá.
  //
  // **Y acá se juntan las dos noticias cuando son una sola.** Ilde vive en la
  // fragua: el día que se va a la Casa Quemada a buscar hierro, «no volvió a
  // dormir» y «la fragua no abrió» son el mismo hecho contado dos veces, y
  // medido eran el doble de eventos y la mitad de historia — la primera corrida
  // los emitía por separado y salían siempre pegados. Un hecho, un renglón,
  // igual que el pedido que sale bien en `irAPedir`.
  for (const p of people) {
    const donde = dondeDuerme(p, places)
    const enCasa = donde === (p.home_place_id ?? p.place_id)
    if (enCasa) {
      // Volvió. No es noticia (es lo que hace todo el mundo todas las noches),
      // pero hay que apagar el estado o la próxima salida no se cuenta.
      if (p.durmio_fuera_desde != null) {
        await db.from('people').update({ durmio_fuera_desde: null }).eq('id', p.id)
        p.durmio_fuera_desde = null
      }
      continue
    }
    if (p.durmio_fuera_desde != null) continue   // ya se contó la primera noche
    await db.from('people').update({ durmio_fuera_desde: nextTick }).eq('id', p.id)
    p.durmio_fuera_desde = nextTick
    const i = cerroHoy.findIndex((c) => c.trabajan.some((q) => q.id === p.id))
    const cerrado = i >= 0 ? cerroHoy.splice(i, 1)[0]! : null
    // Escritas para no tener que concordar con nada y para no afirmar de más:
    // «se quedó» es el estado de ahora mismo, no una predicción sobre la noche
    // que recién empieza. Es la misma cautela que arregló el «llegó hasta X» de
    // la retirada.
    ev({ kind: 'noche_afuera', place_id: donde,
      summary: `Cayó la noche y ${p.name} no volvió a su casa: se quedó en ${placeName(donde)}.`
        + (cerrado ? ` Hoy no abrió ${cerrado.lugar.name}.` : ''),
      detail: {
        npc: p.name, person: p.name, place: placeName(donde),
        sin_abrir: cerrado?.lugar.name ?? null,
      } })
  }

  // Y los talleres que no abrieron sin que nadie se quedara afuera: la herrera
  // que se pasó el día en la aldea, o el que dejó el oficio y no volvió al
  // yunque. Es la misma noticia, sin la mitad que explica por qué.
  for (const { lugar, trabajan } of cerroHoy) {
    ev({ kind: 'sin_abrir', place_id: lugar.id,
      summary: `Hoy no abrió ${lugar.name}.`,
      detail: { place: lugar.name, trabajan: trabajan.map((q) => q.name) } })
  }

  // ── 7. Llega alguien, y el valle deja de tener fecha de vencimiento ───────
  //
  // Es la contracara de la pasada 4 y la razón por la que este archivo dejó de
  // ser una cuesta abajo. El porqué largo está en `llegaAlguien()` y la cuenta
  // en `P_NACIMIENTO`; acá está la puerta, que es una fórmula y no un dado:
  //
  //   P = P_NACIMIENTO × (cupo − vivos) / (cupo − piso)
  //
  // Con el valle lleno da cero y con el valle en el piso da el triple que en
  // equilibrio, así que un valle vacío se recompone y uno próspero no crece.
  //
  // **Va último y eso es una decisión.** Nada de lo que pasó hoy puede
  // reaccionar a alguien que entró al valle al final del día: no se lo cruza el
  // chusmerío de la pasada 5, no lo muerde el bicho de la 4b, no lo elige el
  // sorteo de la 4 y no entra en el `people` de este tick. El valle se entera
  // mañana, y se entera por donde tiene que enterarse — el recuerdo que deja el
  // que lo vio llegar lo levanta el chusmerío en el próximo tick.
  //
  // **Ruido: un evento, siempre, y nada alrededor.** Una llegada es lo
  // contrario de una muerte y el valle entero se entera, así que no lleva
  // probabilidad. Lo que sí se calló es lo que la rodea: `abrirSiguienteMeta()`
  // emite `agenda_nueva` y acá eso serían dos renglones para el mismo hecho, así
  // que la meta se abre con el sumidero tapado y lo que hay que contar viaja
  // adentro del evento de la llegada. Medido: **+0,010 eventos por tick**, que
  // es exactamente una llegada cada 100 ticks y ni un evento más.
  //
  // El piso del `if` es cosmético —la fórmula ya da negativo— pero evita tirar
  // el dado 250 veces por año para nada.
  if (people.length < cupo) {
    const hueco = (cupo - people.length) / Math.max(1, cupo - PISO_DEL_VALLE)
    if (Math.random() < P_NACIMIENTO * hueco) {
      await llegaAlguien({
        regionId: region.id, tick: nextTick, people, players, places, ev,
      })
    }
  }

  if (events.length > 0) await db.from('events').insert(events)
  await db.from('regions').update({ tick: nextTick }).eq('id', region.id)

  console.log(`tick ${nextTick} ${populated ? '' : '(vacío, a un cuarto de paso) '}— ${events.length} eventos`
    + (resueltas.length > 0 ? ` (${resueltas.length} acciones que habían quedado colgadas)` : ''))
  for (const e of events) console.log(`  · ${e.summary}`)
}

// ─────────────────────────────────────────────────────────────
// LAS METAS, Y POR QUÉ CADA UNA LLEVA DOS TEXTOS
// ─────────────────────────────────────────────────────────────
//
// Una meta se escribe en infinitivo porque casi siempre se cuenta como un
// deseo: «Ilde se puso a juntar carbón», «Ilde sigue sin conseguir lo que
// necesita para juntar carbón». Eso siempre es verdad — que alguien quiera
// algo es un hecho sobre esa persona.
//
// El problema aparece cuando el mismo infinitivo entra en un template que lo
// AFIRMA. `X consiguió <goal>` con la meta *"morirse sin haberle enseñado la
// runa de quietud a nadie"* produjo esto, y está en la base:
//
//     La vieja Ren consiguió morirse sin haberle enseñado la runa de quietud
//     a nadie.
//
// Dos jugadores de producción recibieron la muerte de una NPC que está viva
// (`people.alive = true`, cero eventos `muerte` en la región), y el director
// encima le agregó "eso es un saber perdido", que tampoco pasó. **No fue una
// alucinación del narrador: la simulación escribió esa frase.**
//
// Se arregla con las dos cosas a la vez, y hace falta que sean las dos:
//
//   1. **Las metas se redactan para que ningún template pueda mentir.** Reglas
//      duras para el que agregue una:
//        · nombra algo que conseguir o terminar — nunca un estado del cuerpo
//          ni de la vida de esa persona (morirse, enfermarse, irse del valle);
//        · sin negaciones ("sin haber...", "que no...");
//        · no nombra a otra persona haciendo algo, porque entonces el evento
//          afirma también sobre esa otra.
//   2. **Nada afirma una meta si no está acá con su `logro`.** Es la red, y es
//      la que aguanta de verdad: las metas del `seed` las escribe otro archivo
//      y una región nueva puede traer mañana otra "morirse...". `COMO_SE_CUENTA`
//      es una lista blanca: si una meta no figura, la simulación **no dice que
//      pasó** — dice que la persona la dio por cerrada, y listo. Que la
//      crónica pierda una frase es infinitamente más barato que una muerte
//      inventada.
type Meta = { goal: string; obj?: string; saber?: string; logro: string }

/** El catálogo por oficio: lo próximo que va a perseguir alguien.
 *
 * `obj` es lo que convierte una meta en algo que un jugador puede cerrar. No
 * todas lo tienen a propósito: "dormir una noche entera" no se resuelve
 * trayendo nada, y un valle donde todo se arregla con un objeto es una lista
 * de recados.
 *
 * Y mirá cuáles piden algo FABRICADO —el frasco de Odila, el filo de Sarn—:
 * ésas sólo las puede cerrar alguien que aprendió el oficio. Ahí está el bucle
 * entero en una línea de datos: aprendés → fabricás → regalás → te ganás a la
 * gente → te enseñan más.
 *
 * `logro` es cómo se cuenta cuando se cumplió. Está escrito a mano una por una
 * y no sale de pegarle un verbo al infinitivo, porque pegarle un verbo al
 * infinitivo es justo lo que rompió.
 */
/** El telar, en dos géneros. Los oficios de `METAS` son claves literales y las
 *  metas están escritas a mano, así que «hilandero» e «hilandera» son dos
 *  claves; el catálogo es uno solo y se comparte, que es lo contrario de
 *  copiarlo dos veces y que se desincronicen.
 *
 *  Y hay un detalle que no es casual: éstas son las dos primeras metas del
 *  archivo que piden algo de la ALDEA. `lino en rama` y `caña de la orilla`
 *  estaban en `LO_QUE_DA_EL_LUGAR` desde el primer día y no las quería nadie,
 *  así que revolver la aldea no servía para nada. Ahora sirve. */
const HILADO: Meta[] = [
  { goal: 'terminar la pieza que tiene en el telar',
    logro: 'terminó la pieza que tenía en el telar' },
  { goal: 'juntar lino para la pieza nueva', obj: 'lino en rama',
    logro: 'juntó el lino para la pieza nueva' },
  { goal: 'conseguir caña de la orilla para el bastidor', obj: 'caña de la orilla',
    logro: 'consiguió la caña que le faltaba para el bastidor' },
]

/** El que trabaja para otros y no tiene oficio propio. Es el catálogo del que
 *  llega al valle con las manos y nada más, y por eso ninguna de las tres pide
 *  saber hacer nada: se cierran juntando, que es lo que puede hacer cualquiera
 *  (ver el comentario largo arriba de `LO_QUE_DA_EL_LUGAR`). */
const JORNAL: Meta[] = [
  { goal: 'ganarse el jornal de la semana',
    logro: 'se ganó el jornal de la semana' },
  { goal: 'juntar leña antes de que baje el frío', obj: 'rama de roble',
    logro: 'juntó la leña antes de que bajara el frío' },
  { goal: 'conseguir una piedra que le devuelva el filo al hacha', obj: 'piedra de afilar',
    logro: 'consiguió la piedra que le devuelve el filo al hacha' },
]

const METAS: Record<string, Meta[]> = {
  herrera: [
    { goal: 'juntar carbón para el invierno', obj: 'carbón',
      logro: 'juntó el carbón que le faltaba para el invierno' },
    { goal: 'rehacer las bisagras del granero', obj: 'hierro viejo',
      logro: 'rehízo las bisagras del granero' },
  ],
  aprendiz: [
    { goal: 'ganarse que lo dejen tocar el yunque',
      logro: 'se ganó que lo dejen tocar el yunque' },
    { goal: 'pagar lo que debe', obj: 'frasco de raíz',
      logro: 'saldó lo que debía' },
  ],
  cazadora: [
    { goal: 'marcar una senda nueva antes de las lluvias',
      logro: 'dejó marcada la senda nueva antes de las lluvias' },
    { goal: 'curtir lo de esta semana',
      logro: 'terminó de curtir lo de esta semana' },
    { goal: 'conseguir una piedra que le devuelva el filo', obj: 'piedra de afilar',
      logro: 'consiguió la piedra que le devuelve el filo' },
  ],
  destiladora: [
    // Decía «conseguir raíz del Sotobosque» y el template escupía «Odila
    // consiguió conseguir raíz del Sotobosque». Está en la base, tick 65.
    { goal: 'traer raíz del Sotobosque', obj: 'raíz del Sotobosque',
      logro: 'consiguió la raíz del Sotobosque que andaba buscando' },
    // Era «cobrar tres deudas viejas» y pedía un frasco: el encargo salía
    // «Odila le encargó a Pedro cobrar tres deudas viejas: le hace falta
    // frasco de raíz», que no se entiende. Ahora la deuda ES el frasco.
    { goal: 'recuperar los tres frascos que le deben', obj: 'frasco de raíz',
      logro: 'recuperó los frascos que le debían' },
  ],
  guardia: [
    { goal: 'conseguir que le paguen el mes',
      logro: 'consiguió que le pagaran el mes' },
    { goal: 'dormir una noche entera',
      logro: 'durmió una noche entera de un tirón' },
    { goal: 'conseguir un filo que no se le melle', obj: 'hoja templada',
      logro: 'consiguió un filo que no se le mella' },
  ],
  'chico del camino': [
    // `saber` es nuevo y viene con la pasada 2. Hasta que las agendas no
    // ejecutaron verbos no había forma de perseguir un saber —el contador
    // cerraba la meta igual—, así que el catálogo no lo podía expresar y ésta
    // se cumplía **trabajando**: el valle anunciaba «Tobio vio de cerca a
    // alguien que sabe magia» sin que nadie le hubiera mostrado una runa.
    // Es el mismo agujero que la lista blanca tapa del lado de la frase,
    // ahora tapado del lado del hecho. El slug es el del `seed`; si no
    // existiera, la meta vuelve a ser una de trabajar y no se rompe nada.
    { goal: 'ver de cerca a alguien que sepa magia', saber: 'runa-de-brasa',
      logro: 'vio de cerca a alguien que sabe magia' },
    { goal: 'juntar algo que valga para cambiar', obj: 'piedra de afilar',
      logro: 'juntó algo que le sirve para cambiar' },
  ],
  // Los tres oficios de la gente que llega (`por_llegar`). Entran acá y no en
  // otro lado porque `COMO_SE_CUENTA` se arma con `Object.values(METAS)`: una
  // meta que no pasa por esta tabla no tiene `logro`, y sin `logro` la
  // simulación no afirma que se cumplió. Ésa es la lista blanca, y es la que
  // evitó que un template genérico matara a una NPC viva.
  hilandera: HILADO,
  hilandero: HILADO,
  jornalera: JORNAL,
}

const META_POR_DEFECTO: Meta = {
  goal: 'pasar el invierno sin deberle nada a nadie',
  logro: 'pasó el invierno sin deberle nada a nadie',
}

/** Lo primero que persigue el que llega al valle, y no está en `METAS` porque
 *  no depende de su oficio: depende del valle.
 *
 *  `needs_id` no se puede escribir acá —lo elige `llegaAlguien()` mirando qué
 *  saber tiene menos cabezas vivas hoy—, así que esta constante lleva sólo el
 *  texto. El `logro` entra igual a `COMO_SE_CUENTA` y por eso la simulación
 *  puede afirmar que se cumplió.
 *
 *  Cumple las tres reglas de redacción: nombra algo que conseguir, no lleva
 *  negaciones, y dice «alguien» en vez del nombre de una persona — que es lo
 *  que evita que el cierre afirme también sobre el que enseñó, cuando puede
 *  haber sido un jugador. */
const META_DEL_QUE_LLEGA: Meta = {
  goal: 'que alguien le enseñe un oficio',
  logro: 'consiguió que alguien le enseñara un oficio',
}

/** Cómo se cuenta que una meta se cumplió. Lista blanca: lo que no está acá,
 *  no se afirma.
 *
 * Incluye las metas que siembra `seed.ts` —ese archivo tiene otro dueño y las
 * suyas son buenas— **menos una a propósito**: *"morirse sin haberle enseñado
 * la runa de quietud a nadie"* no está y no va a estar. No es una meta, es una
 * postura: la simulación no la puede cumplir, no hay contador que la vuelva
 * verdadera, y cualquier frase que la afirme mata a una NPC viva. Mientras
 * siga en el `seed`, cerrarla no dice nada. (Recomendación al dueño de
 * `seed.ts`: sacarla y darle a Ren una meta de verdad — la deja igual de
 * trágica y encima jugable, «que alguien aprenda la runa de quietud antes de
 * que sea tarde».)
 */
const COMO_SE_CUENTA: Record<string, string> = {
  ...Object.fromEntries(
    [...Object.values(METAS).flat(), META_POR_DEFECTO, META_DEL_QUE_LLEGA]
      .map((m) => [m.goal, m.logro])),
  // Las del seed.
  'rehacer el yunque partido antes de que baje el frío':
    'rehízo el yunque partido antes de que bajara el frío',
  // Ojo con ésta: la meta nombra a Ilde, pero el cierre se dispara con que
  // Bruno SEPA el temple de río, y se lo puede haber enseñado un jugador. Si
  // el `logro` dijera "se lo mostró Ilde", la simulación estaría inventando
  // quién enseñó. Se cuenta lo que sí es verdad: que ya lo sabe.
  'que Ilde le muestre el temple de río':
    'aprendió por fin el temple de río',
  'encontrar el claro que vio una vez y no volvió a encontrar':
    'volvió a dar con el claro que había visto una sola vez',
  'cobrarle a Bruno lo del invierno pasado':
    'le cobró a Bruno lo del invierno pasado',
  'que alguien le pague la guardia de este mes':
    'consiguió que le pagaran la guardia del mes',
  'ver de cerca a alguien que sepa magia':
    'vio de cerca a alguien que sabe magia',
  // Dos redacciones viejas que siguen vivas en `agendas` de las dos regiones.
  // Sin esto, las que están a mitad de camino se cierran con la frase vaga.
  // Se pueden borrar cuando no quede ninguna activa con estos textos.
  'conseguir raíz del Sotobosque':
    'consiguió la raíz del Sotobosque que andaba buscando',
  'cobrar tres deudas viejas':
    'cobró las tres deudas viejas',
  'conseguir un yunque nuevo':
    'consiguió el yunque nuevo',
}

/** La frase de "esto se cumplió", o null si la meta no es afirmable.
 *
 * `null` no es un caso raro que se pueda ignorar: es la respuesta correcta
 * para toda meta que este archivo no escribió. Quien la reciba tiene que
 * contar el cierre **sin repetir la meta**. */
export function comoSeCuenta(goal: string): string | null {
  return COMO_SE_CUENTA[goal] ?? null
}

/** Lo próximo que va a perseguir alguien de ese oficio. */
function siguienteMeta(trade: string, evitar?: string): Meta {
  const catalogo = METAS[trade] ?? [META_POR_DEFECTO]
  // Nunca la misma que acaba de terminar. Sin esto el sorteo repetía la meta y
  // el valle quedaba con «Ilde consiguió juntar carbón» / «Ilde se puso a
  // juntar carbón» tres ticks seguidos: no es un mundo que avanza, es un disco
  // rayado, y el director cobra por leerlo.
  const otras = catalogo.filter((m) => m.goal !== evitar)
  return pick(otras.length ? otras : catalogo)!
}

/** A quién le toca, cuando le toca a alguien.
 *
 * **No cambia la tasa de muerte ni un punto** —eso lo decide `P_MUERTE` y ya
 * se tiró el dado antes de llamar acá—; cambia sólo QUIÉN, y pesa más al que
 * es el último que sabe algo.
 *
 * El porqué: la tesis del juego es *el saber vive en gente que se muere*, y el
 * evento que la demuestra no es `muerte`, es `perdida_de_saber`. Con sorteo
 * uniforme en un valle de siete donde dos son los últimos de lo suyo, sólo el
 * 29% de las muertes se lleva algo puesto; con peso 3 son el 55%. **Se duplica
 * la cosecha del experimento sin agregar un solo muerto**, que es la única
 * palanca honesta que hay acá: la ventana del test (28 días de valle) es
 * demasiado corta para que una tasa demográficamente sana dispare, así que lo
 * que queda es hacer que cuando dispare, importe.
 *
 * Y narrativamente es lo correcto además de lo conveniente: el valle no pierde
 * a cualquiera, pierde lo que sólo una persona cargaba.
 *
 * Se consulta `knows` entero, sin filtro: es una tabla chica y esto corre en
 * el 0,8% de los ticks, sólo cuando ya se sabe que alguien se muere.
 */
async function elQueSeVa(
  people: { id: string; name: string; trade: string; place_id: string | null }[],
  players: { id: string }[],
) {
  // Filtrado en el servidor por el tope mudo de 1.000 filas de PostgREST (está
  // explicado entero arriba, en `saberesDe`). Acá el recorte sería peor que en
  // ningún otro lado: si se pierden las filas del último que sabe algo, deja
  // de contar como el último, pierde el peso ×3 y el sorteo se lleva a otro.
  // O sea que la escasez se apagaría sola, en silencio, al crecer la tabla.
  const todos = (await db
    .from('knows').select('holder_kind, holder_id, knowledge_id')
    .in('holder_id', [...people.map((p) => p.id), ...players.map((p) => p.id)])).data ?? []
  // Un saber sigue en el valle si lo tiene alguien vivo DE ACÁ o un jugador DE
  // ACÁ. Éste era el cuarto lugar del archivo que contaba gente de otro valle:
  // decía `holder_kind !== 'player' && !vivo.has(...)`, o sea que un jugador de
  // `valle-primero` contaba como portador en `valle-pruebas` e impedía que un
  // NPC de acá fuera "el último" — perdía el peso ×3 y el sorteo se llevaba a
  // cualquiera en vez de al que cargaba algo solo. No se medía todavía, porque
  // ningún jugador de la otra región sabe nada que acá sepa uno solo, pero es
  // el mismo error que ya suprimió un `perdida_de_saber` de verdad. Los otros
  // tres ya los había resuelto `siguenEnElValle`; éste faltaba.
  const portadores = new Map<string, string[]>()
  for (const k of siguenEnElValle(todos, people, players)) {
    const xs = portadores.get(k.knowledge_id) ?? []
    xs.push(k.holder_id)
    portadores.set(k.knowledge_id, xs)
  }
  const esElUltimo = (id: string) =>
    [...portadores.values()].some((xs) => xs.length === 1 && xs[0] === id)

  const bolillero: typeof people = []
  for (const p of people) {
    const veces = esElUltimo(p.id) ? PESO_DEL_ULTIMO : 1
    for (let i = 0; i < veces; i++) bolillero.push(p)
  }
  return pick(bolillero)
}

/**
 * Se muere alguien, y el valle pierde lo que sólo esa persona cargaba.
 *
 * **Es el único lugar donde se muere gente**, y eso es el punto: hay dos formas
 * de irse de este valle —el sorteo de la pasada 4 y una salida que no vuelve— y
 * las dos tienen que dejar exactamente el mismo rastro. Lo único que cambia
 * entre las dos es la frase, que la trae quien llama en `evento`.
 *
 * Lo que hace, y son cuatro cosas que van juntas o no van:
 *
 *   1. baja la bandera (`alive = false`, `died_tick`) **y saca a la persona de
 *      la lista viva del tick**, que es lo que hace que en lo que queda del día
 *      no defienda a nadie, no chusmee, no le enseñe a nadie y no la vuelva a
 *      elegir el sorteo de la muerte;
 *   2. cuenta la muerte;
 *   3. **`perdida_de_saber` por cada cosa que se llevó puesta**, que es el
 *      evento del que cuelga la tesis del juego y por eso no puede estar
 *      escrito dos veces. Se apoya en `siguenEnElValle`, y ahí hay dos silencios
 *      ya pagados: las filas de `knows` de un muerto no se borran nunca, así
 *      que "queda otro que lo sabe" era falso apenas alguien más se hubiera
 *      muerto con ese saber encima; y `holder_kind === 'player'` daba por vivo
 *      a cualquier jugador de la base, así que **un portador fantasma de otro
 *      valle suprimía el evento entero**;
 *   4. le cierra las metas abiertas. No abre la siguiente, obviamente, y no
 *      emite `agenda_soltada`: nadie soltó nada.
 *
 * El `excluir` de `siguenEnElValle` no hace falta acá porque el muerto ya salió
 * de `people` en el paso 1 — antes hacía falta porque `people` se leía al
 * principio del tick y el muerto seguía adentro.
 */
async function seMuere(args: {
  tick: number
  muerto: { id: string; name: string }
  /** Dónde se murió. Es lo que decide adónde cae lo que llevaba encima: ver el
   *  paso 5. Sin esto, las cosas de un muerto se quedan colgadas de una fila
   *  con `alive = false` y no las puede levantar nadie nunca. */
  donde: string | null
  /** La lista viva del tick. **Se modifica**: ver el paso 1. */
  people: { id: string }[]
  players: { id: string }[]
  ev: (e: Omit<Ev, 'region_id' | 'tick'>) => void
  /** Cómo se cuenta esta muerte. Es lo único que difiere entre las dos formas
   *  de irse, y por eso lo trae quien llama en vez de decidirse acá. */
  evento: Omit<Ev, 'region_id' | 'tick'>
}) {
  const { tick, muerto, people, players, ev } = args

  await db.from('people')
    .update({ alive: false, died_tick: tick }).eq('id', muerto.id)
  const i = people.findIndex((p) => p.id === muerto.id)
  if (i >= 0) people.splice(i, 1)

  ev(args.evento)

  const tenia = (await db
    .from('knows').select('knowledge_id')
    .eq('holder_kind', 'person').eq('holder_id', muerto.id)).data ?? []

  for (const k of tenia) {
    const otros = (await db
      .from('knows').select('holder_id, holder_kind')
      .eq('knowledge_id', k.knowledge_id)
      .neq('holder_id', muerto.id)).data ?? []
    if (siguenEnElValle(otros, people, players).length > 0) continue
    const { data: info } = await db
      .from('knowledge').select('name').eq('id', k.knowledge_id).single()
    ev({ kind: 'perdida_de_saber',
      summary: `Con ${muerto.name} se fue ${info?.name}. No queda nadie en el valle que lo sepa.`,
      detail: { person: muerto.name, knowledge: info?.name } })
  }

  await db.from('agendas')
    .update({ state: 'abandonada', ended_tick: tick })
    .eq('person_id', muerto.id).eq('state', 'activa')

  // 5. **Lo que llevaba encima queda donde se murió.**
  //
  //    Hasta hoy no había adónde: `objects` sólo sabía de manos, así que las
  //    cosas de un muerto quedaban colgadas de una fila con `alive = false`,
  //    invisibles y sin poder cambiar de dueño nunca más. Ahora hay suelo.
  //
  //    Y es el caso que le da sentido a todo esto: **la hoja que forjó Ilde,
  //    tirada en la Casa Quemada, sigue diciendo Ilde el día que Ilde no está.**
  //    Eso es la tesis del juego convertida en un objeto que se puede levantar,
  //    y `DISENO.md` §10.4 ya lo tenía escrito sin saberlo: *"las mazmorras acá
  //    son donde quedó el saber de un muerto"*. El saber se pierde; las cosas,
  //    no — y son lo único que queda.
  //
  //    ⚠ `made_by` no se toca. `left_by` lleva el nombre del muerto, que es
  //      otro hecho: de quién eran cuando se murió.
  //
  //    Sin evento propio. La muerte ya se contó arriba y `perdida_de_saber`
  //    también; un tercer renglón por cada cosa que llevaba en los bolsillos
  //    sería el director cobrando por leer un inventario.
  if (args.donde) {
    await db.from('objects').update({
      holder_kind: 'place', holder_id: args.donde,
      left_by: muerto.name, left_tick: tick,
    }).eq('holder_kind', 'person').eq('holder_id', muerto.id)
  }

  // 6. **Y si atendía un mostrador, el mostrador queda cerrado.**
  //
  //    Con él se va del valle la moneda que ese puesto aceptaba: si la única
  //    que cambiaba resina era Marta, cuando se muere Marta el Sotobosque
  //    vuelve a estar del otro lado de una moneda que nadie tiene. **Eso no es
  //    un bug, es la tesis del juego aplicada a la plata** — la misma que dice
  //    que cuando se va la última herrera no hay una hoja nueva ni al triple.
  //
  //    No se reasigna a otro del valle a propósito. Lo reabre el que llegue por
  //    el Camino del Norte, que es por donde entra todo lo que entra acá.
  //
  //    Sin evento: la muerte ya se contó y `perdida_de_saber` también. La
  //    noticia de que el puesto está cerrado la da el puesto cerrado.
  await db.from('mostradores')
    .update({ person_id: null }).eq('person_id', muerto.id)

  //    Y la plata que llevaba encima **desaparece del valle con ella.** Es la
  //    contracara de que sólo entre por el norte, y la que hace que el
  //    circulante no crezca solo hasta volverse decorado: se muere gente, se
  //    va plata. Las cosas quedan tiradas y se pueden levantar; las monedas
  //    que tenía en el bolsillo, no — nadie le revisa los bolsillos a un
  //    muerto en este juego, y el día que alguien quiera hacerlo, va a ser un
  //    verbo con su propio costo social y no una línea acá.
  await db.from('bolsas')
    .delete().eq('holder_kind', 'person').eq('holder_id', muerto.id)
}

/**
 * Llega alguien al valle, y por primera vez el valle puede subir.
 *
 * **Es el único lugar donde entra gente**, igual que `seMuere` es el único
 * donde sale, y por el mismo motivo: el día que haya dos, van a divergir.
 *
 * ── Por qué llega gente y no nacen bebés ──────────────────────────────────
 *
 * `DISENO.md` §9.2 dice *"viven, mueren y nacen"* y la función que le pide a
 * los nacimientos es una sola: que una región sin jugadores deje de
 * despoblarse. **Un bebé no puede darla a esta escala de tiempo.** Un tick es
 * un día; el chico de doce de §"la gente vive su propia vida" está a 4.380
 * ticks de nacer, o sea **tres años reales de una fila inerte**, y en el medio
 * el director narraría a un recién nacido volviendo del Sotobosque con carbón.
 * El juego además no tiene edad: nadie envejece, los siete del `seed` tienen
 * `born_tick = 0` y Ren lleva la cuenta de sus inviernos en la biografía y no
 * en una columna.
 *
 * Lo que sí puede dar esa función ya estaba escrito en la geografía. §7.4: la
 * cordillera tiene **una sola abertura, al norte**, por donde entra El Camino
 * del Norte, y *"cuando el mundo crezca, crece por ahí"*. Y en esa abertura ya
 * vive alguien cuyo oficio entero es saber quién entró y quién salió. Así que
 * el valle se recompone por su única puerta, con gente que puede trabajar hoy,
 * y quien estaba ahí ese día lo vio.
 *
 * Que esto no es la versión barata de los nacimientos se ve en lo que NO
 * habilita: no hay linaje, no hay padres, no hay apellido que el mundo
 * recuerde. Eso es §8.5 y es una tarea aparte, escrita al final de este
 * comentario.
 *
 * ── Quién es, y por qué no lo arma este archivo ───────────────────────────
 *
 * §9.2: un NPC es identidad, historia y voz propia. El valle tiene siete
 * personas escritas a mano que se distinguen tapando el nombre, y ésa es la
 * vara: un habitante armado con plantillas en tiempo de tick es un maniquí con
 * nombre. Y este archivo **no puede llamar a un modelo**, ni de rebote, así que
 * tampoco puede escribir una voz.
 *
 * Entonces la voz no se escribe acá: **ya está escrita**, en `por_llegar`, por
 * el autor y antes de tiempo. Es literalmente lo que describe `DISENO.md` en
 * "La gente vive su propia vida": *"el autor corre cada tanto, lee lo que pasó,
 * y escribe hechos nuevos en la base... No narra: siembra. Después la
 * simulación los ejecuta sola, determinista."* El precedente vivo es
 * `saludos.ts`, que corre por su propio cron y guarda texto de modelo en
 * `people.saludos` para que el tick y la web lo sirvan sin llamar a nadie.
 *
 * El reparto es el mismo que separa al tick del director y no se cruza:
 *
 *   · **el autor decide QUIÉN** — nombre, oficio, carácter, voz, procedencia y
 *     la mitad de la historia que es de antes del valle;
 *   · **la simulación decide TODO LO DEMÁS** — si llega alguien, cuándo, por
 *     dónde, quién estaba ahí para verlo, qué se encontró al llegar, y qué
 *     empieza a perseguir. Nada de eso sale de un dado suelto: sale del hueco
 *     que dejó la muerte, de la geografía y de lo que el valle ya perdió.
 *
 * Cuando se acaba el catálogo, no llega nadie más y queda dicho en el log. Es
 * la señal de que le toca al autor, no un fallo silencioso.
 *
 * ── Qué sabe, y acá está la tensión central del juego ─────────────────────
 *
 * **Nada. `knows` se queda vacío.** Es la respuesta a §8 y hay que decir las
 * dos mitades, porque las dos son trampas:
 *
 *   · Si llegara sabiendo un oficio, la muerte de Ilde dejaría de costar algo:
 *     el valle repondría el temple de río esperando sentado, y la escasez —lo
 *     único que este juego vende— sería decorativa. §8.1 es explícito: el saber
 *     *"se pierde con la última persona que lo tenía"*. Si se recupera solo, no
 *     se perdió.
 *   · Si llegara sin nada y eso fuera todo, el valle se llenaría de gente
 *     inútil y el saber igual sólo bajaría.
 *
 * La salida no está en lo que trae, está en **lo que habilita**. §8.2: aprender
 * es la única operación del juego donde *"al terminar, dos personas saben"* — es
 * lo único que multiplica el saber en vez de moverlo. Y esa maquinaria ya está
 * entera: la enseñanza espontánea de la pasada 3 y la buscada de `irAAprender`.
 * Lo que le faltaba no era una regla: **le faltaba a quién enseñarle.** El
 * sorteo espontáneo elige un maestro y un alumno y busca algo que el alumno no
 * tenga; en un valle de cuatro donde los cuatro ya saben lo mismo, no encuentra
 * nada y no pasa nada. Una cabeza vacía vuelve a encender esa máquina, y ahí
 * está la pista de las bases hecha sistema: *cualquiera puede aprender
 * cualquier cosa*, y un chico de doce puede terminar siendo el herrero.
 *
 * Lo medible, que es lo único que vale: los nacimientos no suben el número de
 * saberes distintos del valle —eso sigue sin poder subir, y está bien que
 * siga— pero suben los **portadores por saber**, que es lo que decide si el
 * próximo muerto se lleva algo puesto. La curva deja de bajar porque la
 * redundancia le gana a la mortalidad.
 *
 * **Y `trade` no es `knows`.** El oficio es un papel social; el saber es la
 * receta. El precedente son dos de los mejores personajes del `seed`: Sarn es
 * guardia y no sabe hacer absolutamente nada, Tobio es el chico del camino y
 * tampoco. Nadie los llamaría maniquíes, y ninguno de los dos puede fabricar un
 * clavo.
 *
 * ── El valle tiene que valer la pena, y eso también sale del estado ───────
 *
 * La probabilidad de la puerta dice si hay LUGAR. Acá, en la segunda etapa, se
 * pregunta si hay MOTIVO, y la respuesta es **cuánto de lo que este valle supo
 * sigue en pie**:
 *
 *      atractivo = saberes vivos / saberes que el valle llegó a tener
 *
 * Un valle que conserva lo suyo atrae a todo el que quepa. Uno que perdió la
 * mitad atrae a la mitad, y su equilibrio baja con él. Eso hace dos cosas que
 * ninguna constante haría: **la espiral de la muerte sigue existiendo** —un
 * jugador que se lleva puestos a todos los maestros no sólo roba el saber, deja
 * un valle al que ya no viene nadie, y eso es §8.2 con consecuencia
 * demográfica— y **el valle nunca resucita lo que perdió**: la gente que llega
 * repone cabezas, jamás recetas.
 *
 * Se calcula acá adentro y no en la puerta porque cuesta dos consultas y la
 * puerta se cruza el 1% de los ticks. Multiplicar dos probabilidades en dos
 * etapas es lo mismo que multiplicarlas en una, y cuesta cien veces menos.
 *
 * ── Lo que quedó afuera, dicho para que no lo reinvente nadie ─────────────
 *
 *   · **El linaje (§8.5).** Un recién llegado no tiene padres en el valle y no
 *     carga ningún apellido. Los nacimientos de verdad —dos personas del valle,
 *     un hijo que hereda acceso, historia y deuda— son otra tarea y necesitan
 *     una columna de edad y una de padres.
 *   · **Que traiga un saber que el valle NUNCA tuvo.** Es legítimo y no rompe
 *     nada —§8 sólo prohíbe recuperar lo perdido, no importar lo ajeno— y sería
 *     la única forma de que el repertorio de una región crezca. No entró acá a
 *     propósito: mover la escasez y arreglar la demografía en la misma pasada
 *     deja la próxima medición sin poder atribuir nada.
 *   · **Escribirle la voz con un modelo.** Hoy la voz la escribe el autor a
 *     mano y viene en la fila. El día que el catálogo se agote, el que lo
 *     rellene tiene que correr por su propio cron y guardar, como
 *     `saludos.ts` — nunca desde acá.
 */
async function llegaAlguien(args: {
  regionId: string
  tick: number
  /** La lista viva del tick. **No se modifica**: quien llega hoy no hace nada
   *  hoy. Ver por qué esto va último en el bloque 7 de `step()`. */
  people: { id: string; name: string; place_id: string | null; teaches: boolean }[]
  players: { id: string }[]
  places: { id: string; name: string; kind: string }[]
  ev: (e: Omit<Ev, 'region_id' | 'tick'>) => void
}): Promise<boolean> {
  const { regionId, tick, people, players, places, ev } = args

  // ── 1. ¿El valle tiene con qué? ───────────────────────────
  //
  // Toda la gente que pasó por acá, viva y muerta. Los muertos son el dato:
  // las filas de `knows` de un muerto no se borran nunca, y en las tres
  // decisiones anteriores de este archivo eso era una molestia que había que
  // filtrar. Acá es justo lo que hace falta — son las únicas que saben qué
  // llegó a saber este valle.
  const todaLaGente = (await db
    .from('people').select('id, name').eq('region_id', regionId)).data ?? []

  // **El filtro por `holder_id` va en el SERVIDOR y no acá, y eso no es una
  // optimización: es lo único que hace que la respuesta sea correcta.**
  //
  // `knows` es global —no tiene `region_id`— y encima es polimórfica, así que
  // no tiene foreign key: **borrar una región no borra sus filas de saber.**
  // Quedan huérfanas para siempre. Y PostgREST corta toda respuesta en **1.000
  // filas sin avisar**, así que un `select()` sin filtro sobre esta tabla
  // devuelve una ventana arbitraria en cuanto la base pasa ese número, y
  // filtrar en memoria después es filtrar una muestra.
  //
  // Se vio y se midió el 17 de agosto, con la tabla en 1.779 filas: `count` real
  // 1.779, `select()` 1.000. **No hay error, no hay aviso, y la lectura queda
  // muda exactamente igual que un `grep` sobre un archivo binario.** Un valle
  // entero se leía sin un solo portador y el atractivo daba cero.
  //
  // ⚠ Hay al menos cuatro lecturas de `knows` sin filtro más viejas que ésta en
  // este archivo —`saberesDe` en la pasada 2, `elQueSeVa`, `cuantosLoSaben` y
  // `quienLoSabeHacer`— y tienen el mismo agujero. No se tocaron en esta tarea
  // porque cambiarlas mueve el comportamiento de las agendas y no había con qué
  // volver a medirlas; está anotado como lo que es.
  const ids = [...todaLaGente.map((p) => p.id), ...players.map((p) => p.id)]
  const knows = ids.length === 0 ? [] : (await db
    .from('knows').select('holder_kind, holder_id, knowledge_id')
    .in('holder_id', ids)).data ?? []

  // La rama `people` de `holder_kind` —la lengua de un pueblo, de la migración
  // de pueblos— no cuenta de ningún lado: no es saber humano de este valle, ni
  // lo fue nunca. Un `people_id` no puede colisionar con un `person_id`, así
  // que el `.in()` de arriba ya la deja afuera; el filtro explícito se queda
  // igual, porque es la clase de suposición que envejece mal.
  const deAca = new Set(todaLaGente.map((p) => p.id))
  const deEllos = new Set(players.map((p) => p.id))
  const hubo = new Set(knows
    .filter((k) => k.holder_kind === 'person' ? deAca.has(k.holder_id)
      : k.holder_kind === 'player' ? deEllos.has(k.holder_id) : false)
    .map((k) => k.knowledge_id))
  // Lo que sigue en pie sale del predicado de siempre, que es el que filtra por
  // región Y por vivo. No hay una cuarta forma de contar portadores.
  const enPie = new Set(siguenEnElValle(knows, people, players).map((k) => k.knowledge_id))

  //
  // **Entre la mitad y el todo, y el piso de la mitad no es cosmético.** La
  // primera versión usaba la razón pelada y se midió: el valle se estabilizaba
  // en 6,25 y seguía bajando despacio, porque la realimentación se muerde la
  // cola —menos saber, menos gente, menos cabezas para copiarlo, menos saber—
  // y arrastraba el equilibrio hacia abajo con ella. Medido, 8 valles × 600
  // ticks: 7,38 en el tick 100 y 6,25 en el 600, sin plano a la vista.
  //
  // Y además decía algo falso: que a un valle sin herrero no se mudaría nadie.
  // A un valle se viene por la tierra, por el trabajo y porque hay dónde
  // dormir, no sólo por quién enseña. Lo que el saber cambia es cuánta gente
  // sostiene, no si sostiene gente.
  //
  // Con el piso en la mitad, la consecuencia sigue entera y deja de ser una
  // espiral: un valle que perdió TODO su saber vale la mitad y su equilibrio
  // baja de siete a menos de seis, para siempre. El que se lleva puestos a los
  // maestros no roba nada más: deja un lugar más chico.
  const atractivo = hubo.size === 0 ? 1 : 0.5 + 0.5 * (enPie.size / hubo.size)
  if (Math.random() >= atractivo) return false

  // ── 2. ¿Queda alguien por llegar? ─────────────────────────
  //
  // El catálogo es global y el descarte es por región y por NOMBRE, no por una
  // columna de "usado": lo que no puede pasar es que el valle reciba a alguien
  // que ya vivió acá. Y muy en particular que reciba a un muerto — «llegó Ilde
  // por el camino» sería la peor frase que este juego pueda producir, y sale
  // gratis evitarla contando también a los muertos.
  const catalogo = (await db.from('por_llegar')
    .select('name, trade, llega, disposition, voice, procedencia, historia, teaches')).data ?? []
  const usados = new Set(todaLaGente.map((p) => p.name))
  const quien = pick(catalogo.filter((a) => !usados.has(a.name)))
  if (!quien) {
    // No es un fallo silencioso: es el pedido de trabajo al autor. Cae en el
    // log del cron, que es donde se mira.
    console.warn('por_llegar: el catálogo se agotó para esta región.'
      + ' El valle deja de recomponerse hasta que alguien escriba gente nueva.')
    return false
  }

  // ── 3. Por dónde entra ────────────────────────────────────
  //
  // §7.4: una sola abertura, al norte. Si una región no tuviera camino, entra
  // por donde vive la gente; y si no tuviera ni eso, no entra.
  const donde = places.find((p) => p.kind === 'camino')
    ?? places.find((p) => p.kind === 'aldea') ?? places[0]
  if (!donde) return false

  // ── 4. Con qué se encontró ────────────────────────────────
  //
  // Lo que el valle ya había perdido cuando llegó. Es la mitad de la biografía
  // que este archivo sí puede escribir, porque no la inventa: sale de restar
  // dos conjuntos que ya están calculados, y cada nombre de esa lista tiene
  // detrás un `perdida_de_saber` en `events`. Es la tesis del juego escrita en
  // la ficha de alguien que ni siquiera estaba.
  const perdidos = [...hubo].filter((id) => !enPie.has(id))
  const nombresPerdidos = perdidos.length === 0 ? [] : ((await db
    .from('knowledge').select('name').in('id', perdidos)).data ?? []).map((k) => k.name)

  // ── 4b. Dónde va a dormir, y a qué hora se levanta ────────
  //
  // Entra por el camino y se queda: la casa es la aldea, que es donde están las
  // doce casas. No se le inventa una casa propia —eso lo decide el autor el día
  // que alguien construya— pero tampoco se la deja sin ninguna, porque quien no
  // tiene casa duerme parado donde lo dejó el día y eso es justo lo que esta
  // tarea vino a sacar. Si el valle no tuviera aldea, duerme donde llegó.
  //
  // El horario sale de `horarios` por su oficio, y se guarda resuelto en la
  // fila: ver `jornadaDe()`. Un guardia que llega hoy hace la noche desde la
  // primera noche, sin que nadie lo cablee.
  const casa = places.find((p) => p.kind === 'aldea') ?? donde
  const jornada = await jornadaDe(quien.trade)

  // ── 5. La fila ────────────────────────────────────────────
  const historia = quien.historia
    + ` Llegó al valle por ${donde.name} sin conocer a nadie.`
    + (nombresPerdidos.length > 0
      ? ` Cuando llegó, el valle ya había perdido ${yLista(nombresPerdidos)}.`
      : '')
  const { data: nuevo } = await db.from('people').insert({
    region_id: regionId, place_id: donde.id,
    home_place_id: casa.id,
    jornada_desde: jornada.desde, jornada_hasta: jornada.hasta,
    name: quien.name, trade: quien.trade, disposition: quien.disposition,
    voice: quien.voice, procedencia: quien.procedencia, historia,
    teaches: quien.teaches,
    // La única marca de que ésta no es una de las del generador. `saludos_de`
    // queda en null, así que el cron de `saludos.ts` le escribe las dieciocho
    // líneas al pasar, sin que nadie tenga que acordarse.
    born_tick: tick,
  }).select('id, name, trade, place_id').single()
  if (!nuevo) return false

  // ── 5b. Y la plata que trae ───────────────────────────────
  //
  // **Éste es el único lugar del tick donde el valle tiene más plata que
  // antes**, y es el espejo exacto de `objects.made_by = null`, que sólo lo
  // escribe `case 'buscar'`. Si la plata apareciera en cualquier otro lado, la
  // escasez se muere y el mercado pasa a ser un menú con números.
  //
  // Y tiene una sola puerta en la ficción, que es la misma por la que entra
  // todo a este valle: **el Camino del Norte.** El marco de compañía no se
  // acuña acá — lo trajeron los que vinieron de afuera, y cada uno trae lo que
  // le quedaba. Un valle al que no llega nadie se queda sin circulante, y eso
  // es exactamente lo que le pasa a un valle al que no llega nadie.
  await acunar(regionId, { kind: 'person', id: nuevo.id }, MONEDA_DEL_VALLE,
    18 + roll(25))

  // ── 5c. Y si hay un mostrador cerrado, lo abre ────────────
  //
  // Un mostrador queda cerrado cuando se muere el que atendía, y con él se va
  // del valle la moneda que aceptaba. **No se reasigna solo entre los que ya
  // están** —eso sería un grifo contra la escasez— pero el que llega de afuera
  // sin nada que hacer sí se para atrás de un puesto que nadie atiende. Es el
  // mismo mecanismo regenerativo que `por_llegar`: el valle no se recompone
  // solo, se recompone porque llega gente.
  const cerrado = ((await db.from('mostradores')
    .select('id, place_id').eq('region_id', regionId).is('person_id', null)).data ?? [])[0]
  if (cerrado) {
    await db.from('mostradores')
      .update({ person_id: nuevo.id }).eq('id', cerrado.id)
    const donde2 = places.find((p) => p.id === cerrado.place_id)
    ev({ kind: 'mostrador_abierto', place_id: cerrado.place_id,
      summary: `${nuevo.name} se puso atrás del mostrador de ${donde2?.name ?? 'el valle'}, que estaba cerrado desde que no queda quien lo atendiera.`,
      detail: { person: nuevo.name, place: donde2?.name ?? null } })
  }

  // ── 6. Quién lo vio llegar ────────────────────────────────
  //
  // Sale del estado: quien estuviera en esa punta del valle ese día, y nadie
  // más. El recuerdo es lo que hace que el valle se entere — el chusmerío de la
  // pasada 5 lo levanta en el próximo tick y lo reparte, que es exactamente
  // cómo se entera un pueblo de que llegó alguien. Y le deja al recién llegado
  // el único vínculo que tiene: los mismos dos puntos que deja un saludo.
  const testigo = pick(people.filter((p) => p.place_id === donde.id))
  if (testigo) {
    await recordarEntre(testigo.id, nuevo.id,
      `${nuevo.name} llegó al valle por ${donde.name} y se quedó`, tick)
    await tocarVinculoEntre(testigo.id, nuevo.id, 2, TOPE_DE_TRATO)
    await tocarVinculoEntre(nuevo.id, testigo.id, 2, TOPE_DE_TRATO)
  }

  // ── 7. Lo primero que persigue: que le enseñen ────────────
  //
  // **Ésta es la mitad que hace que el saber deje de bajar, y sin ella la otra
  // mitad no alcanza.** Está medido y la primera versión de esta tarea lo tenía
  // mal: con la llegada sola, ocho valles × 600 ticks recomponían la población
  // hasta siete y el saber seguía cayendo igual — 3,00 saberes vivos con
  // jugador, 2,38 sin nadie, contra 3,50 y 2,63 del brazo viejo. **La población
  // se arreglaba y la escasez no.**
  //
  // El porqué salió del desglose de eventos y es concreto: la enseñanza casi no
  // se movió (0,0108 → 0,0144 por tick con jugador; 0,0015 → 0,0017 sin nadie)
  // aunque de golpe hubiera cuatro o cinco cabezas vacías dando vueltas. Las dos
  // vías de enseñar tienen cada una su freno y ninguno lo destraba la población:
  //
  //   · la ESPONTÁNEA es un sorteo que exige maestro y alumno en el mismo lugar
  //     el mismo día. Más gente sube un poco los encuentros y nada más;
  //   · la BUSCADA —`irAAprender`, que es la buena, la que tiene motivo y cierra
  //     una meta— **sólo arranca si a alguien le falta un saber para su meta**.
  //     Y las metas de los oficios nuevos piden cosas, no saberes. Así que los
  //     recién llegados eran cabezas vacías que nadie iba a llenar: gente
  //     inútil, que es exactamente la mitad de la trampa de §8 que había que
  //     esquivar.
  //
  // Entonces la primera meta del que llega **no sale del catálogo de su
  // oficio**: sale del estado del valle, y es aprender **lo que está a una
  // muerte de perderse** — el saber vivo que menos cabezas tiene hoy. No hay
  // dado en esa elección; el dado sólo desempata.
  //
  // Es la pista de las bases hecha sistema: *cualquiera puede aprender
  // cualquier cosa*, y el sistema para que un chico de doce termine siendo el
  // herrero ya estaba entero — lo que faltaba era alguien a quien le hiciera
  // falta usarlo. Y es §8.2 sin adornos: aprender es la única operación del
  // juego donde **al terminar, dos personas saben**.
  //
  // Que sea el MÁS RARO y no uno al azar es lo que la vuelve regenerativa en
  // vez de decorativa: cada llegada le suma una cabeza justo al saber que está
  // por caerse, en vez de repartir al voleo sobre los que ya están a salvo. Y
  // no diluye la escasez, porque suma de a uno y sólo donde hace falta: sobre
  // 600 ticks son unas cinco cabezas nuevas contra unas cuarenta muertes.
  //
  // Si el saber más raro lo tiene alguien que no enseña —Ren y sus dos runas—,
  // la meta se traba y termina saliendo por `P_SUELTA`, y eso está bien: es la
  // historia de siempre contada desde el otro lado, y le abre la puerta al
  // jugador, que sí puede enseñar.
  //
  // Cuando la cierra, `cumplirAgenda` le abre la que sigue del catálogo de su
  // oficio y esta persona pasa a ser una más del valle.
  // **Y el más frágil DE LOS QUE ALGUIEN ENSEÑA.** El «de los que alguien
  // enseña» tampoco es cosmético y también salió de una corrida, no de la
  // cabeza: la primera versión apuntaba al más raro a secas, y el más raro es
  // casi siempre una de las dos runas de Ren, que tiene `teaches = false`. O
  // sea que el recién llegado se pasaba semanas detrás de algo que nadie le iba
  // a enseñar y la meta terminaba en `abandonada` por `P_SUELTA`. Medido sobre
  // ocho valles × 600 ticks: **las seis metas de aprendizaje que se ven en las
  // filas terminaron todas abandonadas** —progresos 0, 16, 32, 75, 75, 75— y de
  // yapa inflaban el ruido (`agenda_estancada` 0,0029 → 0,0217 por tick).
  //
  // El que llega pregunta y aprende lo que hay para aprender; no se obsesiona
  // con el secreto que la vieja no suelta. Y las runas siguen exactamente igual
  // de inalcanzables para los NPCs, que es lo que las hace valer: **la única
  // puerta que tienen sigue siendo un jugador**, porque `case 'ensenar'` no
  // pregunta por `teaches`.
  //
  // Un saber que sólo tiene un jugador tampoco cuenta como alcanzable, y es
  // correcto: `irAAprender` mira `people` y nada más, así que un NPC no puede
  // ir a buscar a alguien que está desconectado.
  const cabezas = new Map<string, number>()
  const seEnsena = new Set<string>()
  for (const k of siguenEnElValle(knows, people, players)) {
    cabezas.set(k.knowledge_id, (cabezas.get(k.knowledge_id) ?? 0) + 1)
    if (k.holder_kind === 'person'
      && people.find((p) => p.id === k.holder_id)?.teaches) {
      seEnsena.add(k.knowledge_id)
    }
  }
  const alcanzables = [...cabezas].filter(([id]) => seEnsena.has(id))
  const menos = alcanzables.length === 0 ? 0 : Math.min(...alcanzables.map(([, n]) => n))
  const masFragil = pick(alcanzables.filter(([, n]) => n === menos).map(([id]) => id))

  // El sumidero va tapado en las dos ramas: `agenda_nueva` acá sería un segundo
  // renglón para el mismo hecho y el director lo narraría como dos cosas. Lo que
  // hay que contar viaja adentro del evento de abajo.
  let meta: string | null = null
  if (masFragil) {
    meta = META_DEL_QUE_LLEGA.goal
    await db.from('agendas').insert({
      person_id: nuevo.id, goal: meta, started_tick: tick,
      needs_kind: 'knowledge', needs_id: masFragil, needs_object: null,
    })
  } else {
    // Un valle donde ya no queda ningún saber vivo. No hay nada que aprender,
    // así que se pone con lo suyo. (Si el `trade` del catálogo no estuviera en
    // `METAS`, esta persona perseguiría la meta por defecto para siempre; por
    // eso la columna lleva el aviso en la migración.)
    const tapado: Omit<Ev, 'region_id' | 'tick'>[] = []
    await abrirSiguienteMeta(nuevo, '', tick, (e) => void tapado.push(e))
    meta = (tapado[0]?.detail?.goal as string | undefined) ?? null
  }

  // ── 8. Y eso sí es noticia ────────────────────────────────
  //
  // Siempre, sin probabilidad: es lo contrario de una muerte y el valle entero
  // se entera. Un evento y uno solo.
  //
  // Las tres frases están escritas para no tener que concordar con nada, igual
  // que las del cierre material y por el mismo motivo: el género de quien llega
  // sale de una tabla. Por eso `llega` es «una muchacha» y no un booleano, y
  // por eso el testigo «estaba ahí» en vez de «lo vio».
  //
  // Y la última frase no es color: es el estado real de `knows` en este
  // instante, es lo más importante que hay que saber de esta persona, y es la
  // que le dice al jugador y al valle que acá hay alguien a quien enseñarle.
  //
  // El `kind` dice lo que pasó y no lo que la tarea se llamaba. Esto es lo que
  // `DISENO.md` §9.2 pide bajo la palabra "nacimiento" —la región deja de
  // despoblarse— pero nadie nació, y `events.kind` de este proyecto no puede
  // decir una cosa mientras el `summary` dice otra: tres veces este mes una
  // diferencia así terminó en una crónica mentirosa. El comentario de
  // `events.kind` en el esquema todavía nombra `nacimiento` como ejemplo; es un
  // ejemplo, no un contrato.
  ev({ kind: 'llegada_al_valle', place_id: donde.id,
    summary: `Llegó ${quien.llega} por ${donde.name} y se quedó: ${nuevo.name}, ${nuevo.trade}.`
      + (testigo ? ` ${testigo.name} estaba ahí cuando llegó.` : '')
      // «aquí» y no «acá», y es un carácter que borra un párrafo del prompt:
      // éste era **el único "acá" de todo el flujo de hechos**, el director lo
      // copiaba, y se le metía voseo en 4 crónicas de 27 hasta que hubo que
      // agregarle una contra-instrucción para que no lo hiciera. El emisor
      // habla el idioma del lector y la contra-instrucción sobra.
      + ' No sabe hacer nada de lo que se hace aquí.',
    detail: {
      person: nuevo.name, place: donde.name, trade: nuevo.trade,
      visto_por: testigo?.name ?? null, goal: meta, saberes: 0,
    } })
  return true
}

/** «A», «A y B», «A, B y C». Existe porque la biografía del que llega enumera
 *  lo que el valle ya había perdido, y una lista pegada con comas se lee como
 *  una planilla. */
function yLista(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? ''
  return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`
}

/**
 * Los portadores de un saber que **están en ESTE valle hoy**: gente viva de
 * acá, y jugadores de acá.
 *
 * Existe porque `knows` no tiene `region_id` —las filas de saber son globales—
 * y en la misma base hay dos regiones. Contar `holder_kind === 'player'` sin
 * mirar de qué valle es ese jugador mete gente de otro mundo en las tres
 * decisiones que cuelgan de esta pregunta, y las tres son de las que importan:
 *
 *   · si una agenda se traba por falta de maestro (un jugador del otro valle la
 *     deja esperando para siempre a alguien que acá no existe),
 *   · si se emite `perdida_de_saber` (un portador fantasma **suprime el evento
 *     del que cuelga la tesis del juego**: el saber se pierde con la última
 *     persona que lo tenía),
 *   · si queda alguien que sepa fabricar algo.
 *
 * Era el mismo predicado escrito tres veces con tres formas distintas de estar
 * mal, que es exactamente cómo se erosionan los invariantes por duplicación.
 * Ahora es uno solo y lo leen los tres.
 *
 * `people` ya viene filtrado por `region_id` y `alive`; `players`, por
 * `region_id`. Los dos están en scope en `step()`, así que esto no cuesta una
 * sola consulta más.
 *
 * `excluir` es para el caso de la muerte: `people` se leyó antes de matarlo,
 * así que el muerto todavía figura en esa lista.
 */
export function siguenEnElValle<T extends { holder_kind: string; holder_id: string }>(
  holders: T[],
  people: { id: string }[],
  players: { id: string }[],
  excluir?: string,
): T[] {
  return holders.filter((h) => h.holder_id !== excluir && (
    h.holder_kind === 'player'
      ? players.some((q) => q.id === h.holder_id)
      : people.some((q) => q.id === h.holder_id)))
}

const EN_LETRAS = ['nadie', 'uno', 'dos', 'tres', 'cuatro', 'cinco',
  'seis', 'siete', 'ocho', 'nueve', 'diez']
const enLetras = (n: number) => EN_LETRAS[n] ?? String(n)

/** Cuántos lo saben en el valle HOY: vivos y jugadores.
 *
 * Existe porque los dos eventos de enseñanza terminaban en «Ahora lo saben
 * dos», y eso era mentira siempre que ya lo supiera un tercero. Es chiquito,
 * pero es exactamente el modo de falla que estamos cazando: el director lee
 * "dos" y escribe *"sólo dos personas en el valle lo saben"*, que es una
 * afirmación fuerte sobre la escasez y no la respalda nada. Y contarlo bien
 * además le da la frase buena: cuando pasa de uno a dos, ese saber dejó de
 * estar a una muerte de perderse.
 *
 * **Y "en el valle" quiere decir EN ESTE VALLE.** Los NPCs ya venían filtrados
 * —`people` llega con `region_id` y `alive`— pero los jugadores se contaban
 * sueltos, con un `holder_kind === 'player'` sin filtro, y hay más de una
 * región en la misma base: un jugador de `valle-primero` inflaba el «Ahora lo
 * saben N» de `valle-pruebas` y viceversa. Es el mismo bug que ya apareció en
 * `perdida_de_saber` y en `agenda_bloqueada` contando muertos, y se arregla
 * igual: contando sólo a los que están acá. La frase es una afirmación fuerte
 * sobre la escasez del valle y no la puede respaldar gente de otro valle. */
async function cuantosLoSaben(
  knowledgeId: string, regionId: string, people: { id: string }[],
): Promise<number> {
  const holders = (await db
    .from('knows').select('holder_kind, holder_id')
    .eq('knowledge_id', knowledgeId)).data ?? []
  const ids = holders.filter((h) => h.holder_kind === 'player').map((h) => h.holder_id)
  // Sin jugadores que lo sepan no hay consulta que hacer, y `.in()` con una
  // lista vacía es una consulta que no sirve para nada.
  const deAca = ids.length === 0 ? [] : (await db
    .from('players').select('id')
    .eq('region_id', regionId).in('id', ids)).data ?? []
  return holders.filter((h) => h.holder_kind === 'player'
    ? deAca.some((p) => p.id === h.holder_id)
    : people.some((p) => p.id === h.holder_id)).length
}

/** ¿Hay alguien vivo que sepa hacer esto? Devuelve su nombre, o null.
 *
 * Es la regla de la escasez hecha función, y se consulta antes de que cualquier
 * cosa fabricada entre al mundo. `people` ya viene filtrado por `alive`, así
 * que un muerto no cuenta — que es justamente el punto: cuando se va el último
 * que sabía, deja de haberlas.
 *
 * (Los jugadores también cuentan. Si el único que sabe forjar es un jugador,
 * el valle depende de que se conecte, y eso está bien.)
 *
 * **Y "alguien" quiere decir alguien DE ACÁ.** El jugador se buscaba por id
 * contra `players` entera, sin mirar la región: un jugador de `valle-primero`
 * que supiera destilar mantenía viva la escasez de `valle-pruebas` —la agenda
 * no se trababa y el NPC seguía esperando un frasco que en este mundo no puede
 * salir de ningún lado. `players` ya viene filtrado por `region_id`, así que
 * pasarlo además ahorra la consulta que había acá adentro.
 */
async function quienLoSabeHacer(
  kind: string,
  people: { id: string; name: string }[],
  players: { id: string; name: string }[],
): Promise<string | null> {
  const { data: receta } = await db
    .from('knowledge').select('id').eq('makes', kind).limit(1).maybeSingle()
  if (!receta) return null
  const holders = (await db
    .from('knows').select('holder_kind, holder_id')
    .eq('knowledge_id', receta.id)).data ?? []
  for (const h of siguenEnElValle(holders, people, players)) {
    const quien = h.holder_kind === 'player'
      ? players.find((q) => q.id === h.holder_id)
      : people.find((q) => q.id === h.holder_id)
    if (quien) return quien.name
  }
  return null
}

/** Cierra una agenda, cierra los encargos que la seguían, y abre la que sigue.
 *
 * Está en un solo lugar porque son cuatro cosas que tienen que pasar juntas o
 * ninguna: si se cumple la agenda y el encargo queda abierto, el jugador se
 * queda esperando algo que ya pasó; si no se abre la siguiente, el NPC se queda
 * quieto y el valle se apaga de a una persona por vez.
 *
 * `porJugador` es quién la cerró, si la cerró alguien. Los encargos de los
 * demás quedan abiertos y los levanta la pasada 6 como `perdido`.
 */
async function cumplirAgenda(
  agenda: { id: string; goal: string },
  who: { id: string; name: string; trade: string; place_id: string | null },
  tick: number,
  ev: (e: Omit<Ev, 'region_id' | 'tick'>) => void,
  evento: Omit<Ev, 'region_id' | 'tick'>,
  porJugador?: { id: string; name: string },
) {
  await db.from('agendas')
    .update({ state: 'cumplida', progress: 100, ended_tick: tick })
    .eq('id', agenda.id)
  ev(evento)

  if (porJugador) {
    await db.from('encargos')
      .update({ state: 'cumplido', closed_tick: tick })
      .eq('agenda_id', agenda.id).eq('player_id', porJugador.id).eq('state', 'activo')
  }

  await abrirSiguienteMeta(who, agenda.goal, tick, ev)
}

/** Abre la meta que sigue. El mundo no se queda quieto.
 *
 * Está separado de `cumplirAgenda` porque hay dos finales distintos y los dos
 * tienen que dejar a la persona con algo entre manos: la que se cumplió, y la
 * que se soltó después de insistir sin llegar a nada. Si el segundo caso no
 * abriera la siguiente, el valle se apagaría de a una persona por vez —
 * justamente ahora, que una meta puede fracasar de verdad.
 */
async function abrirSiguienteMeta(
  who: { id: string; name: string; trade: string; place_id: string | null },
  evitar: string,
  tick: number,
  ev: (e: Omit<Ev, 'region_id' | 'tick'>) => void,
) {
  const nueva = siguienteMeta(who.trade, evitar)
  // Una meta puede pedir un SABER y no una cosa. Se guarda el id acá y no el
  // slug porque `agendas.needs_id` es un uuid; si el saber no existe en esta
  // región, la meta queda como una de trabajar y no se rompe nada.
  let needsId: string | null = null
  if (nueva.saber) {
    const { data: k } = await db
      .from('knowledge').select('id').eq('slug', nueva.saber).limit(1).maybeSingle()
    needsId = k?.id ?? null
  }
  await db.from('agendas').insert({
    person_id: who.id, goal: nueva.goal, started_tick: tick,
    needs_kind: nueva.obj ? 'object' : (needsId ? 'knowledge' : null),
    needs_object: nueva.obj ?? null,
    needs_id: needsId,
  })
  ev({ kind: 'agenda_nueva', place_id: who.place_id,
    // «se propuso», no «se puso a». Éste es un evento de deseo —recién
    // empieza— y «se puso a» se lee como cumplido: el director sacó de acá
    // *«Sarn al fin logró dormir una noche entera»* cuando el hecho decía que
    // se PUSO a dormir. Mismo bug que «y sigue en pie»: si un summary se puede
    // leer de dos maneras, el modelo elige la más dramática, y eso es un
    // defecto del emisor y no del narrador.
    summary: `${who.name} se propuso ${nueva.goal}.`,
    detail: {
      person: who.name, goal: nueva.goal, object: nueva.obj ?? null,
      saber: nueva.saber ?? null,
    } })
}

// ─────────────────────────────────────────────────────────────
// TOMAR — usar lo que llevás encima
// ─────────────────────────────────────────────────────────────
//
// Es el primer verbo que consume una cosa a pedido del jugador. El frasco de
// raíz lo consume `preparar()` por dentro, sin que nadie lo pida; hasta hoy no
// había manera de sacar algo del inventario que no fuera dárselo a otro.
//
// **Por qué existe la cuajada, en una frase:** hoy la única forma de curarse en
// el valle es caerse. `players.health` baja con cada mordida y no sube nunca
// sola — las dos subidas del código son `levantarse()`, que te deja entero pero
// en la aldea, y la runa de vena, que necesita a otro que la sepa, la haya
// colgado hoy y esté al lado. A un jugador con veinte de vida en el Sotobosque
// le conviene quedarse quieto y dejar que lo maten: sale gratis y vuelve
// entero. Un juego donde morirse es la cura barata está roto.
//
// Y lo que la cuajada compra NO es vida, es **posición**, que es una de las dos
// únicas cosas que el diseño dice que cuesta caerse (§ del `levantarse()` de
// `combate.ts`). La otra es la cara, y ésa no se compra: los que te vieron caer
// ya te temen menos y van a seguir. Con distancias que se sienten, no tener que
// volver es un premio de verdad — y por eso levantarse con un cuenco te devuelve
// MENOS vida que levantarse en la aldea. Se paga con el cuerpo lo que se ahorra
// en camino.
//
// Lo que NO es, y hay que mirarlo cada vez que alguien quiera tocar esto:
// **comida como bono y nunca como impuesto** (DISENO §10.2, Monster Hunter y no
// Valheim). No hay hambre, no hay barra y no tenerla te deja exactamente como
// estabas ayer. No sube el techo: la vida máxima sigue siendo 100 y esto no
// apila. El día que haga falta para pelear de igual a igual, inventamos el
// grindeo y hay que sacarla.

/** Lo único que hoy se puede tomar. Es una constante y no una columna
 *  `knowledge.consumible` a propósito: **una tabla de consumibles es una tabla
 *  de recetas con otro nombre**, y lo que se puede hacer vive en lo que alguien
 *  sabe y se muere con esa persona. Cuando haya un segundo, esto es una lista
 *  de dos, no un sistema. */
export const CUAJADA = 'cuenco de cuajada'

/** Cuánto repone un cuenco, y por qué depende de la calidad.
 *
 *  La destreza del que lo hizo es lo único que mueve este número, igual que una
 *  hoja mejor pega más fuerte: la mano de otro se vuelve tu ventaja, y el que
 *  la recibe ve de quién era. Un cuenco de la primera vez (calidad ~15) te
 *  levanta con treinta; uno de alguien con la mano hecha (calidad ~90), con
 *  cincuenta y cinco. */
function repone(quality: number): number {
  return 25 + Math.floor(quality / 3)
}

export type Tomada =
  | { ok: false; porque: string }
  | {
    ok: true; health: number; caido: false
    /** El slug de donde quedó parado. El cliente ubica por slug, igual que en
     *  `levantarse()` — y acá es la mitad de la noticia: es el mismo lugar. */
    lugar: string
    objeto: string; hecho_por: string | null
    /** Lo que se le muestra al jugador. */
    cuenta: string
  }

/**
 * Tomarse algo de lo que llevás encima.
 *
 * Inmediato, como `pelear()` y `lanzar()`: una cuajada que tarda seis horas en
 * hacer efecto no es una cuajada. Por eso hay una ruta propia (`POST /tomar`)
 * además del `case`, y por eso ninguno de los dos caminos deja una acción
 * pendiente: el `case` la resuelve en el acto y la ruta no encola nada. Es el
 * mismo reparto que `pelear()` — el camino que de verdad se usa es el cliente,
 * que no tiene un cierre de día donde volcar nada.
 *
 * Las dos ramas son la misma idea y por eso es un solo verbo: **te deja seguir
 * donde estás.** De pie te cierra la herida sin volver al pueblo; caído te pone
 * en pie ahí mismo, que es lo que no se podía hacer de ninguna otra manera.
 *
 * No se consume si no hace falta. Un jugador entero que aprieta el botón por
 * curiosidad no puede perder lo que otro tardó en hacerle.
 */
export async function tomar(args: {
  regionId: string
  tick: number
  player: { id: string; name: string; place_id: string | null }
  /** Qué quiere tomarse. Hoy hay una sola cosa tomable, así que sirve para
   *  rechazar un pedido equivocado y no para elegir. */
  que?: string | null
  /** Sumidero de eventos, igual que en `pelear()`: el tick junta los suyos y
   *  los inserta al final; la web no tiene ese final y escribe acá. */
  ev?: (e: Omit<Ev, 'region_id' | 'tick'>) => void | Promise<void>
}): Promise<Tomada> {
  const { regionId, tick, player } = args

  const pedido = args.que?.trim().toLowerCase()
  if (pedido && !CUAJADA.includes(pedido) && !pedido.includes('cuajada')) {
    return { ok: false, porque: `no hay forma de tomarse "${args.que}"` }
  }

  const { data: estado } = await db.from('players')
    .select('health, downed_at_tick, place_id').eq('id', player.id).maybeSingle()
  if (!estado) return { ok: false, porque: 'no existe' }

  const caido = estado.downed_at_tick !== null || estado.health <= 0

  // El mejor de los que lleve, igual que el regalo de `case 'dar'`: si estás en
  // el piso no es momento de administrar el inventario.
  const cuencos = (await db.from('objects')
    .select('id, quality, made_by').eq('region_id', regionId)
    .eq('holder_kind', 'player').eq('holder_id', player.id)
    .eq('kind', CUAJADA)).data ?? []
  const cuenco = cuencos.sort((a, b) => b.quality - a.quality)[0]
  if (!cuenco) return { ok: false, porque: `no lleva ningún ${CUAJADA} encima` }

  if (!caido && estado.health >= 100) {
    return { ok: false, porque: 'está entero; no le hace falta' }
  }

  const gana = repone(cuenco.quality)
  // Caído: te levanta con lo que el cuenco te da y nada más. De pie: se suma a
  // lo que te quedaba. La diferencia es lo que hace que caerse siga costando.
  const vida = caido ? Math.min(100, gana) : Math.min(100, estado.health + gana)

  await db.from('players')
    .update({ health: vida, ...(caido ? { downed_at_tick: null } : {}) })
    .eq('id', player.id)
  await db.from('objects').delete().eq('id', cuenco.id)

  const { data: lugar } = estado.place_id
    ? await db.from('places').select('slug, name').eq('id', estado.place_id).maybeSingle()
    : { data: null }
  const donde = lugar?.name ?? 'el valle'
  // De quién era la mano. Es la mitad de por qué esto existe: el cuenco sigue
  // diciendo quién lo hizo, y el que lo hizo se puede haber muerto.
  const autoria = cuenco.made_by && cuenco.made_by !== player.name
    ? ` Lo había hecho ${cuenco.made_by}.` : ''

  const evento: Omit<Ev, 'region_id' | 'tick'> = caido
    ? {
      // El MISMO `kind` que `levantarse()`, y a propósito: para el mundo el
      // hecho es que se puso en pie. Lo que cambia es dónde, que es todo.
      kind: 'levantada', place_id: estado.place_id ?? null,
      summary: `${player.name} estaba en el suelo en ${donde} y se puso en pie sin que nadie lo llevara al pueblo:`
        + ` se tomó un ${CUAJADA}.${autoria}`,
      detail: {
        player: player.name, place: donde, object: CUAJADA,
        quality: cuenco.quality, made_by: cuenco.made_by ?? null, en_el_lugar: true,
      },
    }
    : {
      kind: 'cura', place_id: estado.place_id ?? null,
      summary: `${player.name} se cerró la herida en ${donde} con un ${CUAJADA}.${autoria}`,
      detail: {
        player: player.name, place: donde, object: CUAJADA,
        quality: cuenco.quality, made_by: cuenco.made_by ?? null, en_el_lugar: false,
      },
    }
  if (args.ev) await args.ev(evento)
  else await db.from('events').insert({ region_id: regionId, tick, ...evento })

  // El «de Sarn» sólo cuando la mano fue de otro, igual que en el evento: «se
  // puso en pie con un cuenco de cuajada de Eco» dicho a Eco es una firma en su
  // propia carta. Cuando es de otro, en cambio, es la mitad de la noticia.
  const cuenta = caido
    ? `se puso en pie en ${donde} con un ${CUAJADA}${autoria ? ` de ${cuenco.made_by}` : ''}`
    : `se tomó un ${CUAJADA}${autoria ? ` de ${cuenco.made_by}` : ''} en ${donde}`
  return {
    ok: true, health: vida, caido: false,
    lugar: lugar?.slug ?? '',
    objeto: CUAJADA, hecho_por: cuenco.made_by ?? null,
    cuenta,
  }
}

async function resolveAction(
  regionId: string, tick: number,
  player: { id: string; name: string; place_id: string | null },
  action: { verb: string; target: string | null },
  ctx: {
    people: (MundoDeAccion['people'][number])[]
    /** Los de carne y hueso de esta región. Lo usan los precios: un saber que
     *  sólo tiene un jugador sigue siendo un saber vivo del valle. */
    players: { id: string; name: string }[]
    places: { id: string; name: string; slug: string; kind: string }[]
    ev: (e: Omit<Ev, 'region_id' | 'tick'>) => void
    /** Los pares que ya hablaron en esta tanda. Hace falta además del chequeo
     *  contra `events` del `case 'hablar'`, y sólo por el camino del tick: ahí
     *  `ev` acumula y los eventos se insertan todos al final, así que la
     *  segunda charla del mismo día no vería a la primera en la base. Por el
     *  camino de la web —una acción por pedido— el que trabaja es el chequeo
     *  contra `events` y este conjunto está siempre vacío. */
    yaHablaron?: Set<string>
  },
): Promise<string> {
  const { people, players, places, ev } = ctx
  const target = action.target?.toLowerCase() ?? ''
  const norm = (s: string) => s.toLowerCase()

  // **Dónde está cada uno AHORA**, que a esta hora puede no ser `place_id`.
  //
  // Resolver una acción es tiempo de consulta, no tiempo de tick: pasa cuando
  // el jugador aprieta el botón, y a esa hora la mitad del valle puede estar
  // durmiendo en su casa. El cliente dibuja a la gente con `rutinaDe()`, así
  // que si acá se comparara `place_id` pelado el mundo diría dos cosas
  // distintas — ves a Bruno durmiendo en la fragua y el servidor te contesta
  // que no hay ningún Bruno acá. Es el invariante 4 al revés: lo que se ve en
  // el cliente tiene que ser lo que el servidor cree.
  //
  // Se le puede hablar, encargar y DAR a alguien que duerme: le golpeás la
  // puerta y se levanta, o le dejás la cosa. La rutina tiene que agregar mundo,
  // no puertas cerradas.
  //
  // **Enseñar y aprender sí se caen por la hora, y eso cambió hoy.** Este
  // renglón decía que ningún verbo se caía, y el motivo era bueno: una rutina
  // que sólo quita cosas es una lista de horarios cerrados. Lo que faltaba era
  // el otro lado — *"que a veces no quieran hablar, y que eso signifique algo.
  // Un NPC que siempre está disponible no tiene vida propia"*.
  //
  // De todos los verbos, los dos del oficio son los únicos donde negarse a esa
  // hora no es una puerta cerrada sino la verdad: **nadie enseña a martillar
  // dormido, y nadie aprende de alguien que está dormido.** Los otros tres
  // siguen entrando, así que la noche no vacía el juego: le podés dejar la raíz
  // a Odila, encargarte de lo suyo y golpearle la puerta y que te gruña.
  //
  // Y es lo que hace que el sol sea el reloj del mundo (DISENO §7.3) en vez de
  // un efecto de luz: si querés que Ilde te enseñe, vas de día. Con seis horas
  // reales por vuelta del sol y una jornada de 6 a 22, la ventana cerrada son
  // dos horas de reloj de cada seis, y el guardia trabaja al revés — el valle
  // nunca queda entero sin nadie a quien pedirle nada.
  //
  // `dialogo.ts` apaga exactamente estas dos opciones cuando la persona duerme.
  // Las dos mitades tienen que decir lo mismo o el cliente miente: una opción
  // gris que el servidor sí resolvería es tan mala como una opción viva que el
  // servidor rechaza.
  const aca = (p: ConRutina) => rutinaDe(p, places).place_id === player.place_id
  const duerme = (p: ConRutina) => rutinaDe(p, places).durmiendo

  switch (action.verb) {
    case 'ir': {
      const destino = places.find((p) => norm(p.slug) === target || norm(p.name).includes(target))
      if (!destino) return `no existe "${action.target}"`
      await db.from('players').update({ place_id: destino.id }).eq('id', player.id)
      // Y también en memoria. Si en el mismo tick quedaron encoladas `ir
      // bosque` y `buscar`, la segunda tiene que ver el bosque y no la aldea:
      // `player` es el objeto que traía el tick de antes de moverse, y sin esta
      // línea el jugador busca donde ya no está. Es el camino normal de una
      // sesión —te movés y hacés algo— y estaba roto en silencio.
      player.place_id = destino.id
      ev({ kind: 'llegada', place_id: destino.id,
        summary: `${player.name} llegó a ${destino.name}.`,
        detail: { player: player.name, place: destino.name } })
      return `fue a ${destino.name}`
    }

    case 'hablar': {
      const quien = people.find((p) => norm(p.name).includes(target))
      if (!quien) return `no encontró a "${action.target}"`

      // ── Hablar cuenta UNA VEZ POR DÍA DEL VALLE ────────────────────────
      //
      // Un tick es un día, así que el hecho es «hoy Pedro y Ilde hablaron», no
      // «Pedro apretó E». Se midió en producción y el número es feo: **130
      // eventos `conversacion` en diez ticks para 25 hechos reales — 5,2
      // eventos por cada cosa que pasó.** Es el tipo más numeroso del valle por
      // lejos, y era la misma charla contada cinco veces.
      //
      // Con la iniciativa esto pasa de ser feo a ser urgente: si los NPCs
      // arrancan cosas, se les habla más, y el multiplicador crece con el
      // rasgo. Un rasgo que se paga en ruido no se entrega así.
      //
      // Y arregla algo peor que el ruido, que apareció mirando esta línea:
      // `tocarVinculo` sumaba **+2 de aprecio por cada vez que apretabas el
      // botón**, sin tope. Dieciocho charlas seguidas en el mismo día son +36,
      // o sea cruzar `UMBRAL_ENSENAR` (35) de una sentada. El bucle central del
      // juego —ganarte que alguien te enseñe— se saltaba tecleando. Ahora el
      // aprecio sube una vez por día, que es lo que dice el diseño: la
      // confianza se gana con el tiempo y con hechos, no con repeticiones.
      //
      // El chequeo va contra `events` y no contra un contador en memoria porque
      // el camino de verdad es el de la web, que resuelve **una acción por
      // pedido** (`soloJugador`): en producción no hay ninguna tanda dentro de
      // la cual acumular nada. Es una lectura por `hablar` contra
      // `events_region_tick_idx`, y ahorra cuatro escrituras de cada cinco.
      const par = `${player.id}·${quien.id}`
      if (ctx.yaHablaron?.has(par)) return `siguió hablando con ${quien.name}`
      const { data: yaHoy } = await db.from('events').select('id')
        .eq('region_id', regionId).eq('tick', tick).eq('kind', 'conversacion')
        .eq('detail->>player', player.name).eq('detail->>person', quien.name)
        .limit(1).maybeSingle()
      if (yaHoy) return `siguió hablando con ${quien.name}`
      ctx.yaHablaron?.add(par)

      ev({ kind: 'conversacion', place_id: quien.place_id,
        summary: `${player.name} habló con ${quien.name}.`,
        detail: { player: player.name, person: quien.name } })
      await recordar(quien.id, player, `${player.name} anduvo hablando con ${quien.name}`, tick)
      await tocarVinculo(quien, player, { valued: 2 }, ev)
      return `habló con ${quien.name}`
    }

    case 'trabajar': {
      const lugar = places.find((p) => p.id === player.place_id)
      const testigos = people.filter(aca)

      // Trabajar produce algo sólo si SABÉS hacer algo y estás donde se hace.
      // No hay recetas escritas en ningún lado, no hay tienda y no hay drops:
      // un objeto del valle existe porque alguien vivo supo hacerlo. Ésa es la
      // regla entera, y es la que hace que un muerto se lleve cosas del mundo.
      const saberes = (await db
        .from('knows')
        .select('id, destreza, veces, knowledge:knowledge_id (name, makes, makes_at)')
        .eq('holder_kind', 'player').eq('holder_id', player.id)).data ?? []
      const aplicables = saberes.filter((k) => {
        const c = (k as unknown as { knowledge: Receta | null }).knowledge
        return !!c?.makes && c.makes_at === lugar?.kind
      })

      // **Y si el jugador dijo qué, manda el jugador.** Hasta hoy este caso
      // ignoraba `target` y sorteaba entre lo aplicable, que con un solo saber
      // por lugar no se notaba. Con dos ya se nota: en la fragua salían la hoja
      // y el filo a cara o cruz, y desde hoy la aldea tiene el frasco y el
      // cuenco. Que el servidor tire un dado por vos cuando dijiste cuál
      // querías es peor que no dejarte elegir — es la misma regla que ya
      // aplican `ensenar` y `dar`, escrita con las mismas palabras.
      //
      // Se busca por el nombre del saber Y por el de la cosa, porque el jugador
      // piensa en la cosa: pide «cuajada», no «Cuajado de leche». Y si dijo algo
      // que no sabe hacer acá se lo decimos, en vez de dejarlo caer en la rama
      // de abajo y contarle que pasó el día trabajando: un botón que hace otra
      // cosa sin avisar es peor que un botón que no anda.
      const queStr = action.target?.trim().toLowerCase()
      const pedidas = queStr
        ? aplicables.filter((k) => {
          const c = (k as unknown as { knowledge: Receta }).knowledge
          return c.name.toLowerCase().includes(queStr)
            || c.makes.toLowerCase().includes(queStr)
        })
        : aplicables
      if (queStr && pedidas.length === 0) {
        return aplicables.length > 0
          ? `no sabe hacer "${action.target}" en ${lugar?.name ?? 'el valle'}`
          : `no sabe hacer nada en ${lugar?.name ?? 'el valle'}`
      }
      const elegido = pick(pedidas)
      const receta = elegido
        ? (elegido as unknown as { knowledge: Receta }).knowledge
        : undefined

      if (receta && elegido) {
        // Practicar mejora. No es un contador que sube: es que la próxima
        // hoja te va a salir mejor, y eso lo ve todo el que la use.
        const antes: number = elegido.destreza
        const ahora = Math.min(100, antes + mejora(antes))
        await db.from('knows')
          .update({ destreza: ahora, veces: elegido.veces + 1 })
          .eq('id', elegido.id)

        const q = calidad(antes)
        await db.from('objects').insert({
          region_id: regionId, kind: receta.makes, quality: q,
          made_by: player.name, made_tick: tick,
          holder_kind: 'player', holder_id: player.id,
        })
        // Que se note cuando das un salto: es el momento en que sentís que
        // aprendiste algo, y si no se dice en ningún lado, no pasó.
        const salto = ahora - antes >= 6 && elegido.veces < 12
        ev({ kind: 'fabricacion', place_id: player.place_id,
          summary: salto
            ? `${player.name} hizo ${receta.makes} en ${lugar?.name ?? 'el valle'}, y le salió mejor que la vez anterior.`
            : `${player.name} hizo ${receta.makes} en ${lugar?.name ?? 'el valle'}.`,
          detail: { player: player.name, object: receta.makes, quality: q, destreza: ahora } })
        for (const t of testigos) {
          await recordar(t.id, player, `${player.name} sabe hacer ${receta.makes}`, tick)
          await tocarVinculo(t, player, { valued: 6 }, ev)
        }
        return `hizo ${receta.makes} (destreza ${ahora})`
      }

      ev({ kind: 'trabajo', place_id: player.place_id,
        summary: `${player.name} pasó el día trabajando en ${lugar?.name ?? 'el valle'}.`,
        detail: { player: player.name } })
      for (const t of testigos) {
        await recordar(t.id, player, `${player.name} trabaja sin que se lo pidan`, tick)
        await tocarVinculo(t, player, { valued: 4 }, ev)
      }
      return 'trabajó'
    }

    // El golpe NO se resuelve acá. Lo resuelve `pelear()` en `combate.ts`, que
    // es exactamente la misma función que llama `POST /pelear`, y por eso el
    // mismo golpe produce el mismo evento venga por donde venga.
    //
    // **Esto era una copia entera de esa función** —el mismo daño, la misma
    // lista de dos armas, los mismos `summary` tipeados dos veces— y el
    // encabezado de `combate.ts` cuenta lo que costaba: un `summary` ambiguo
    // hubo que arreglarlo dos veces, y las dos copias se mantenían idénticas a
    // mano. La primera que alguien tocara sola convertía el mismo hecho en dos
    // hechos distintos según el camino, que es el invariante 3 pudriéndose sin
    // que se note.
    //
    // El `ev` es el mismo sumidero del tick: los eventos del golpe se juntan
    // con los del día y se insertan todos al final. Sin `ev`, `pelear()`
    // inserta sola — que es lo que hace la web, que no tiene un final de tick.
    case 'pelear': {
      const golpe = await pelear({
        regionId, tick, player, ev,
        // Lo ven, y no todos lo leen igual: matar algo sube el aprecio y el
        // miedo a la vez. Eso pasa adentro de `pelear()`. Lo que se decide
        // ACÁ es el aviso: cruzar un escalón de confianza abre un verbo del
        // jugador y sin decirlo, ganarse a alguien sería superstición.
        avisarVinculo: (t, antes, ahora) => avisarConfianza(t, player, antes, ahora, ev),
      })
      if (!golpe.ok) return golpe.porque
      return golpe.muerta ? `mató a ${golpe.threat}` : `lastimó a ${golpe.threat}`
    }

    case 'aprender': {
      // El `target` puede venir como «<saber> de <alguien>» —el jugador eligió
      // cuál quiere— o pelado, y ahí elige el servidor. Es la mitad que
      // faltaba: `ensenar` deja elegir desde el primer día y `aprender` no,
      // así que con un maestro que sabe dos cosas pedirle la que te importa era
      // tirar el dado. Con la cuajada eso deja de ser teórico —Sarn puede haber
      // aprendido a destilar de alguien— y volvés al valle tres días seguidos a
      // ver si esta vez sale la que fuiste a buscar.
      //
      // Se parte por el ÚLTIMO " de ", igual que `ensenar` y `dar` parten por
      // el último " a ", y acá el motivo es literal: **el nombre del saber
      // tiene un " de " adentro** («Cuajado de leche», «Destilado de raíz») y el
      // de una persona no.
      const crudo = action.target ?? ''
      const cortar = crudo.toLowerCase().lastIndexOf(' de ')
      const queQuiere = cortar > 0 ? crudo.slice(0, cortar).trim().toLowerCase() : null
      const aQuien = norm((cortar > 0 ? crudo.slice(cortar + 4) : crudo).trim())
      const maestro = people.find(
        (p) => norm(p.name).includes(aQuien) && aca(p))
      if (!maestro) return `no hay ningún ${action.target} acá`
      // Dormido no enseña nadie. No emite evento: que hayas golpeado la puerta
      // a deshora no es un hecho del valle, y un `negativa` por cada intento
      // nocturno sería una planilla con la firma del rechazo.
      if (duerme(maestro)) return `${maestro.name} está durmiendo`
      if (!maestro.teaches) {
        ev({ kind: 'negativa', place_id: maestro.place_id,
          summary: `${maestro.name} se negó a enseñarle nada a ${player.name}.`,
          detail: { player: player.name, person: maestro.name } })
        return `${maestro.name} se negó`
      }
      const { data: vinculo } = await db
        .from('bonds').select('valued')
        .eq('person_id', maestro.id).eq('toward_id', player.id).maybeSingle()
      const v = vinculo?.valued ?? 0
      if (v < UMBRAL_ENSENAR) {
        // La negativa DICE en qué escalón estás. Es la mitad del arreglo: subir
        // el umbral sin que se note cuánto falta convierte "ganarse a alguien"
        // en tirar el dado hasta que salga. Con esto lo intentás dos veces con
        // una semana de por medio y escuchás que la frase cambió.
        ev({ kind: 'negativa', place_id: maestro.place_id,
          summary: `${maestro.name} ${comoTeVe(v)}, pero no lo suficiente como para enseñarle lo suyo a ${player.name}.`,
          detail: { player: player.name, person: maestro.name, confianza: comoTeVe(v) } })
        return `${maestro.name} ${comoTeVe(v)}`
      }
      const sabe = (await db
        .from('knows').select('knowledge_id')
        .eq('holder_kind', 'person').eq('holder_id', maestro.id)).data ?? []
      const ya = (await db
        .from('knows').select('knowledge_id')
        .eq('holder_kind', 'player').eq('holder_id', player.id)).data ?? []
      const tiene = new Set(ya.map((k) => k.knowledge_id))
      const puede = sabe.filter((k) => !tiene.has(k.knowledge_id))
      if (puede.length === 0) return `${maestro.name} ya no tiene nada nuevo que enseñarle`

      // Si el jugador dijo cuál, manda el jugador. Si dijo una que el maestro
      // no sabe —o que ya sabe él—, se lo decimos con esas palabras en vez de
      // darle otra cosa: enseñarle algo distinto de lo que fue a pedir es
      // exactamente el modo en que un sistema deja de sentirse como una
      // conversación y pasa a sentirse como una máquina.
      let elegido: (typeof puede)[number] | undefined
      if (queQuiere) {
        const nombres = (await db
          .from('knowledge').select('id, name')
          .in('id', puede.map((k) => k.knowledge_id))).data ?? []
        const m = nombres.find((c) => c.name.toLowerCase().includes(queQuiere))
        if (!m) return `${maestro.name} no sabe eso, o él ya lo sabe`
        elegido = puede.find((k) => k.knowledge_id === m.id)
      }
      const nuevo = elegido ?? pick(puede)!

      const { data: info } = await db
        .from('knowledge').select('name').eq('id', nuevo.knowledge_id).single()
      await db.from('knows').insert({
        holder_kind: 'player', holder_id: player.id,
        knowledge_id: nuevo.knowledge_id, learned_from: maestro.id,
        how: 'aprendido', learned_tick: tick, destreza: 0, veces: 0,
      })
      ev({ kind: 'ensenanza', place_id: maestro.place_id,
        summary: `${player.name} aprendió ${info?.name}. Se lo enseñó ${maestro.name}.`,
        detail: { from: maestro.name, to: player.name, knowledge: info?.name } })
      await recordar(maestro.id, player, `${player.name} aprendió ${info?.name} de ${maestro.name}`, tick)
      return `aprendió ${info?.name}`
    }

    case 'ensenar': {
      // El `target` puede venir como «<saber> a <alguien>» —el jugador eligió
      // cuál le deja— o pelado, y ahí elige el servidor como siempre. Se parte
      // por el ÚLTIMO " a ", igual que `dar`, porque el nombre de un saber
      // puede tener uno adentro ("Temple a la piedra") y el de una persona no.
      const bruto = action.target ?? ''
      const corte = bruto.toLowerCase().lastIndexOf(' a ')
      const queStr = corte > 0 ? bruto.slice(0, corte).trim().toLowerCase() : null
      const quienStr = norm((corte > 0 ? bruto.slice(corte + 3) : bruto).trim())
      const alumno = people.find(
        (p) => norm(p.name).includes(quienStr) && aca(p))
      if (!alumno) return `no hay ningún ${action.target} acá`
      // La otra mitad de la regla de arriba: tampoco se le enseña a alguien que
      // duerme. Sin evento, por lo mismo.
      if (duerme(alumno)) return `${alumno.name} está durmiendo`
      const sabe = (await db
        .from('knows').select('knowledge_id')
        .eq('holder_kind', 'player').eq('holder_id', player.id)).data ?? []
      if (sabe.length === 0) return 'todavía no sabe nada que enseñar'
      const ya = (await db
        .from('knows').select('knowledge_id')
        .eq('holder_kind', 'person').eq('holder_id', alumno.id)).data ?? []
      const tiene = new Set(ya.map((k) => k.knowledge_id))
      const puede = sabe.filter((k) => !tiene.has(k.knowledge_id))
      if (puede.length === 0) return `${alumno.name} ya sabe todo lo que él sabe`

      // Si el tipo está trabado esperando justo eso, enseñale eso. Antes salía
      // al azar y podías tener la runa de brasa en la cabeza, enseñarle a Tobio
      // a leer sendas, e irte sin enterarte de que estabas a un paso de cerrar
      // lo único que ese chico quiere en la vida. *"Tobio quiere ver magia de
      // cerca, y vos acabás de aprender la runa de brasa"* — eso es la tarea.
      const { data: suya } = await db
        .from('agendas').select('id, goal, needs_id')
        .eq('person_id', alumno.id).in('state', ['activa', 'bloqueada'])
        .eq('needs_kind', 'knowledge').limit(1).maybeSingle()
      // Pero si el jugador eligió, manda el jugador: la preferencia por la
      // agenda trabada es un buen default, no una corrección. Que el servidor
      // te pise la elección es peor que no dejarte elegir.
      let elegido: (typeof puede)[number] | undefined
      if (queStr) {
        const nombres = (await db
          .from('knowledge').select('id, name')
          .in('id', puede.map((k) => k.knowledge_id))).data ?? []
        const m = nombres.find((c) => c.name.toLowerCase().includes(queStr))
        if (!m) return `${alumno.name} ya sabe eso, o él no lo sabe`
        elegido = puede.find((k) => k.knowledge_id === m.id)
      }
      const nuevo = elegido
        ?? puede.find((k) => k.knowledge_id === suya?.needs_id) ?? pick(puede)!

      const { data: info } = await db
        .from('knowledge').select('name').eq('id', nuevo.knowledge_id).single()
      // Sin destreza: recibe el saber, no la mano. Va a tener que hacerlo un
      // montón de veces para que le salga como a vos. Por eso enseñar no te
      // clona — el oficio sobrevive y el maestro sigue siendo el maestro.
      await db.from('knows').insert({
        holder_kind: 'person', holder_id: alumno.id,
        knowledge_id: nuevo.knowledge_id, learned_from: null,
        how: 'aprendido', learned_tick: tick, destreza: 0, veces: 0,
      })
      const cuantos = await cuantosLoSaben(nuevo.knowledge_id, regionId, people)
      ev({ kind: 'ensenanza', place_id: alumno.place_id,
        summary: `${alumno.name} aprendió ${info?.name}. Se lo enseñó ${player.name}.`
          + (cuantos > 1 ? ` Ahora lo saben ${enLetras(cuantos)}.` : ''),
        detail: {
          from: player.name, to: alumno.name, knowledge: info?.name,
          lo_saben: cuantos,
        } })
      await recordar(alumno.id, player,
        `${alumno.name} aprendió ${info?.name} de ${player.name}`, tick)
      await tocarVinculo(alumno, player, { valued: 20 }, ev)

      // Y si eso era lo que le faltaba, la agenda se cierra ACÁ y con tu
      // nombre. La pasada 2 la cerraría igual un rato después, pero sin decir
      // que fuiste vos: el jugador haría lo más generoso del juego y leería
      // «Tobio consiguió lo que quería» como si hubiera pasado solo.
      if (suya && suya.needs_id === nuevo.knowledge_id) {
        await cumplirAgenda(suya, alumno, tick, ev, {
          kind: 'agenda_cumplida', place_id: alumno.place_id,
          // «llevaba tiempo detrás de X» cita la meta como deseo y eso siempre
          // es cierto; lo que hacía falta arreglar era el «ahora lo saben dos»
          // de antes, que era una cuenta inventada.
          summary: `${alumno.name} llevaba tiempo detrás de ${suya.goal}, y se lo enseñó ${player.name}.`
            + (cuantos > 1 ? ` Ahora lo saben ${enLetras(cuantos)}.` : ''),
          detail: {
            person: alumno.name, player: player.name, goal: suya.goal,
            knowledge: info?.name, lo_saben: cuantos,
          },
        }, player)
        await tocarVinculo(alumno, player, { valued: 25 }, ev)
      }
      return `le enseñó ${info?.name} a ${alumno.name}`
    }

    // ── encargarse ────────────────────────────────────────────
    //
    // El verbo que faltaba, y con él las quests. **No hay sistema de quests
    // porque ya existían y se llaman agendas**: "Odila quiere conseguir raíz
    // del Sotobosque" está en la base desde el primer día, avanza sola y nadie
    // la podía tocar. Esto es la manija, nada más.
    //
    // Lo importante de lo que NO hace: no congela la agenda, no la reserva, no
    // te la asigna. Sigue siendo de Odila y sigue corriendo. Si te encargás y
    // no volvés, Odila la resuelve igual o se traba igual. Eso es Red Dead: el
    // mundo no te espera, y que otro jugador te la cierre mientras dormís es
    // parte del diseño, no un bug.
    case 'encargarse': {
      const quien = people.find(
        (p) => norm(p.name).includes(target) && aca(p))
      if (!quien) return `no hay ningún ${action.target} acá`

      const abiertas = (await db
        .from('agendas').select('id, goal, state, progress, needs_kind, needs_object')
        .eq('person_id', quien.id).in('state', ['activa', 'bloqueada'])
        .order('started_tick', { ascending: true })).data ?? []
      const agenda = abiertas[0]
      if (!agenda) return `${quien.name} no anda detrás de nada ahora mismo`

      // Nadie le pasa a otro algo que ya casi terminó. El mundo no te espera,
      // pero tampoco te deja anotarte para perder: sin esto te encargabas y en
      // el mismo tick te llegaba «lo resolvió sin esperarte», que es la peor
      // versión posible de la lección.
      if (agenda.progress >= 80) {
        return `${quien.name} ya casi lo tiene resuelto y no necesita que nadie se meta`
      }

      const { data: yaEsta } = await db
        .from('encargos').select('id, state')
        .eq('agenda_id', agenda.id).eq('player_id', player.id).limit(1).maybeSingle()
      if (yaEsta) return `ya se había encargado de eso`

      // Un favor se pide antes que un oficio. Por eso este umbral es bajo y el
      // de enseñar es alto: te piden algo primero, te enseñan después, y hacer
      // el favor es lo que te lleva del uno al otro.
      const { data: vinculo } = await db
        .from('bonds').select('valued')
        .eq('person_id', quien.id).eq('toward_id', player.id).maybeSingle()
      const v = vinculo?.valued ?? 0
      if (v < UMBRAL_ENCARGO) {
        ev({ kind: 'negativa', place_id: quien.place_id,
          summary: `${quien.name} ${comoTeVe(v)}: no le va a encargar nada suyo a ${player.name} todavía.`,
          detail: { player: player.name, person: quien.name, confianza: comoTeVe(v) } })
        return `${quien.name} ${comoTeVe(v)}`
      }

      await db.from('encargos').insert({
        agenda_id: agenda.id, player_id: player.id, taken_tick: tick,
      })
      ev({ kind: 'encargo', place_id: quien.place_id,
        summary: agenda.needs_object
          ? `${quien.name} le encargó a ${player.name} ${agenda.goal}: le hace falta ${agenda.needs_object}.`
          : `${quien.name} le encargó a ${player.name} ${agenda.goal}.`,
        detail: {
          person: quien.name, player: player.name, goal: agenda.goal,
          object: agenda.needs_object ?? null, trabada: agenda.state === 'bloqueada',
        } })
      await recordar(quien.id, player, `${player.name} se encargó de ${agenda.goal}`, tick)
      await tocarVinculo(quien, player, { valued: 4 }, ev)

      // El "dónde" sale del estado, nunca de un modelo: si te digo que la raíz
      // está en el Sotobosque es porque el Sotobosque la da. Un tutorial que
      // miente es peor que ninguno.
      const donde = agenda.needs_object ? dondeSeConsigue(agenda.needs_object, places) : null
      return `se encargó de ${agenda.goal}`
        + (agenda.needs_object ? ` — hace falta ${agenda.needs_object}` : '')
        + (donde ? `, y eso se junta en ${donde}` : '')
    }

    // ── buscar ────────────────────────────────────────────────
    //
    // *"buscar algo en el bosque, ¿existe eso?"* — no existía, y era lo único
    // que faltaba para que "conseguir raíz del Sotobosque" fuera jugable.
    //
    // **Acá no se pide saber nada, y es a propósito.** La raíz la junta
    // cualquiera; el frasco lo hace sólo el que aprendió a destilar. Ésa es la
    // línea entera del juego y está en las dos ramas de este archivo: `buscar`
    // no mira `knows` ni una vez, `trabajar` no hace nada sin `knows`. Ver el
    // comentario largo arriba de LO_QUE_DA_EL_LUGAR antes de tocar cualquiera
    // de las dos.
    case 'buscar': {
      const lugar = places.find((p) => p.id === player.place_id)
      if (!lugar) return 'no está en ningún lado'

      if (!LO_QUE_DA_EL_LUGAR[lugar.kind]) {
        ev({ kind: 'busqueda', place_id: lugar.id,
          summary: `${player.name} se puso a revolver ${lugar.name} y no hay nada que juntar: acá las cosas se hacen, no se encuentran.`,
          detail: { player: player.name, place: lugar.name, object: null } })
        return `en ${lugar.name} no hay nada que juntar; acá se trabaja`
      }

      // Sorteo con pesos, y el "nada" es una entrada más del sorteo. Sin esa
      // entrada `buscar` es una máquina expendedora y traer la raíz deja de
      // ser traer algo.
      //
      // Es la misma función que usan los NPCs en la pasada 2, y tiene que
      // seguir siéndolo: si el valle le tirara dados distintos a Ilde que a
      // vos, dejarían de estar jugando al mismo juego.
      const sale = loQueSale(lugar.kind)

      const testigos = people.filter(aca)
      if (!sale) {
        // Esto sí se emite siempre aunque no haya cambiado nada, y es la única
        // excepción a la regla del ruido: lo pidió un jugador. Un tick que
        // repite algo solo es ruido; una acción que alguien mandó a propósito
        // siempre es noticia para esa persona.
        ev({ kind: 'busqueda', place_id: lugar.id,
          summary: `${player.name} anduvo revolviendo ${lugar.name} y volvió con las manos vacías.`,
          detail: { player: player.name, place: lugar.name, object: null } })
        return `no encontró nada en ${lugar.name}`
      }

      // La calidad de una raíz es de la raíz, no de tus manos: no hay destreza
      // que valga para agacharse. Por eso tampoco sube nada al buscar.
      const q = 40 + roll(35)
      await db.from('objects').insert({
        region_id: regionId, kind: sale, quality: q,
        // ⚠ null. NADIE LO HIZO. Es la única puerta por la que entra al mundo
        //   algo sin que haya un vivo que sepa hacerlo, y sólo la abre este
        //   caso. Si alguna vez ves un `made_by` acá, alguien rompió la regla.
        made_by: null,
        made_tick: tick,
        holder_kind: 'player', holder_id: player.id,
      })
      ev({ kind: 'hallazgo', place_id: lugar.id,
        summary: `${player.name} salió de ${lugar.name} con ${sale}.`,
        detail: { player: player.name, place: lugar.name, object: sale, quality: q } })
      for (const t of testigos) {
        await recordar(t.id, player, `${player.name} anduvo juntando cosas por acá`, tick)
        await tocarVinculo(t, player, { valued: 3 }, ev)
      }
      return `encontró ${sale} en ${lugar.name}`
    }

    // ── dar ───────────────────────────────────────────────────
    //
    // El verbo que cierra el bucle chico: **aprendés → fabricás → regalás → te
    // ganás a la gente → te enseñan más.** Hasta hoy fabricabas y no había nada
    // que hacer con lo fabricado, que era el agujero original del diseño — un
    // saber que no habilita hacer algo es un renglón en una lista.
    //
    // Dos resultados, y los dos importan:
    //   · Si es lo que esa persona necesitaba, la agenda se CUMPLE y el vínculo
    //     salta. Es lo más narrable que hay en el juego.
    //   · Si no, igual mueve el aprecio. **Regalar es regalar.**
    //
    // Sólo a NPCs: pasarse cosas entre jugadores necesita las dos puntas
    // conectadas y todavía no hay dónde ponerlo.
    case 'dar': {
      // "<cosa> a <alguien>", o sólo "<alguien>" y le damos lo que necesita.
      // Nunca elegimos por el jugador cuando no hay pedido: dar por descarte lo
      // mejor que llevás encima es la clase de ayuda que te deja sin la espada.
      const bruto = action.target ?? ''
      const corte = bruto.toLowerCase().lastIndexOf(' a ')
      const queStr = corte > 0 ? bruto.slice(0, corte).trim() : null
      const quienStr = norm((corte > 0 ? bruto.slice(corte + 3) : bruto).trim())
      if (!quienStr) return 'uso: dar <cosa> a <persona>'

      const quien = people.find(
        (p) => norm(p.name).includes(quienStr) && aca(p))
      if (!quien) return `no hay ningún ${quienStr} acá`

      const mios = (await db
        .from('objects').select('id, kind, quality, made_by')
        .eq('holder_kind', 'player').eq('holder_id', player.id)).data ?? []
      if (mios.length === 0) return 'no tiene nada encima para dar'

      const abiertas = (await db
        .from('agendas').select('id, goal, needs_kind, needs_object')
        .eq('person_id', quien.id).in('state', ['activa', 'bloqueada'])).data ?? []

      const candidatos = queStr
        ? mios.filter((o) => norm(o.kind).includes(norm(queStr)))
        : mios.filter((o) => abiertas.some((a) => a.needs_object === o.kind))
      if (candidatos.length === 0) {
        return queStr
          ? `no lleva ningún "${queStr}" encima`
          : `${quien.name} no anda detrás de nada que ${player.name} tenga encima`
      }
      // El mejor de los que tenga. Un regalo es un regalo, y además la calidad
      // pesa en cuánto mueve el vínculo: tu destreza se vuelve capital social.
      const regalo = candidatos.sort((a, b) => b.quality - a.quality)[0]!

      // Se va del inventario de verdad. El objeto no se destruye: sigue en el
      // mundo, en la mano de otro, y sigue diciendo quién lo hizo. Un cuchillo
      // que dice "lo hizo Ilde" veinte días después de que Ilde no está es el
      // juego entero en una línea.
      await db.from('objects')
        .update({ holder_kind: 'person', holder_id: quien.id }).eq('id', regalo.id)

      const autoria = regalo.made_by && regalo.made_by !== player.name
        ? ` Lo había hecho ${regalo.made_by}.` : ''
      const bonus = Math.floor(regalo.quality / 25)   // 0..4, la mano se nota
      const cumple = abiertas.find(
        (a) => a.needs_kind === 'object' && a.needs_object === regalo.kind)

      if (!cumple) {
        ev({ kind: 'regalo', place_id: quien.place_id,
          summary: `${player.name} le dio ${regalo.kind} a ${quien.name} sin pedirle nada a cambio.${autoria}`,
          detail: {
            player: player.name, person: quien.name, object: regalo.kind,
            quality: regalo.quality, made_by: regalo.made_by ?? null, cumple: false,
          } })
        await recordar(quien.id, player, `${player.name} le regaló ${regalo.kind} a ${quien.name}`, tick)
        await tocarVinculo(quien, player, { valued: 5 + bonus }, ev)
        return `le dio ${regalo.kind} a ${quien.name}`
      }

      const { data: encargado } = await db
        .from('encargos').select('id')
        .eq('agenda_id', cumple.id).eq('player_id', player.id).eq('state', 'activo')
        .limit(1).maybeSingle()

      // Esto no se cuenta con un texto de sistema. Alguien venía atrás de algo
      // hace días, se lo trajiste, y eso es de las mejores cosas que le van a
      // pasar al director para narrar. El hecho estructurado va en `detail`;
      // acá va la frase.
      await cumplirAgenda(cumple, quien, tick, ev, {
        kind: 'agenda_cumplida', place_id: quien.place_id,
        summary: encargado
          ? `${quien.name} venía detrás de ${cumple.goal} y no lo conseguía. ${player.name} se había encargado, y volvió con ${regalo.kind}.${autoria}`
          : `${quien.name} venía detrás de ${cumple.goal}. ${player.name} apareció con ${regalo.kind} y se lo puso en la mano sin que nadie se lo pidiera.${autoria}`,
        detail: {
          person: quien.name, player: player.name, goal: cumple.goal,
          object: regalo.kind, quality: regalo.quality,
          made_by: regalo.made_by ?? null, encargado: !!encargado,
        },
      }, player)

      await recordar(quien.id, player,
        `${player.name} le trajo ${regalo.kind} a ${quien.name} cuando lo necesitaba`, tick)
      await tocarVinculo(quien, player, { valued: 25 + bonus }, ev)
      return `le cumplió a ${quien.name}: ${cumple.goal}`
    }

    // ── soltar ────────────────────────────────────────────────
    //
    // Una cosa puede estar en el suelo de un lugar, y hasta hoy no podía: la
    // tabla aceptaba `holder_kind = 'place'` desde el primer día y **nadie lo
    // había escrito nunca**. O sea que un objeto estaba en la mano de alguien o
    // no existía en ninguna parte.
    //
    // **No emite evento, y es a propósito.** Todo lo que entra a `events` lo
    // lee el director y cuesta plata; que alguien se sacara algo de encima no
    // es noticia para nadie más que para él. La noticia es la otra punta —que
    // otro lo encuentre— y esa sí se cuenta (ver `case 'levantar'`). Lo que
    // pasa igual es el ESTADO: la cosa queda en la base, en el suelo de ese
    // lugar, y la ve todo el mundo. Un objeto tirado que sólo viviera en el
    // cliente sería dos jugadores mirando dos suelos distintos.
    //
    // ⚠ `made_by` NO SE TOCA. Una cosa que cambia de mano sigue diciendo quién
    //   la hizo, y eso es exactamente lo que la vuelve interesante: la hoja que
    //   forjó Ilde sigue diciendo Ilde tirada en la Casa Quemada el día que
    //   Ilde no esté. Lo único que se escribe acá es `left_by`, que es otro
    //   hecho — quién la abandonó, no quién la hizo.
    case 'soltar': {
      const lugar = places.find((p) => p.id === player.place_id)
      if (!lugar) return 'no está en ningún lado'

      const mios = (await db
        .from('objects').select('id, kind, quality, made_by')
        .eq('holder_kind', 'player').eq('holder_id', player.id)).data ?? []
      if (mios.length === 0) return 'no lleva nada encima'

      const queStr = action.target?.trim().toLowerCase()
      const cands = queStr ? mios.filter((o) => norm(o.kind).includes(queStr)) : mios
      if (cands.length === 0) return `no lleva ningún "${action.target}" encima`

      // **El PEOR de los que tenga**, al revés que `dar`. Es la misma regla
      // leída del otro lado: allá se explica que dar por descarte lo mejor que
      // llevás encima es la clase de ayuda que te deja sin la espada, y acá
      // vale igual — soltar por descarte lo mejor te deja sin la espada sin que
      // nadie salga ganando. El cliente igual manda siempre cuál.
      const cosa = cands.sort((a, b) => a.quality - b.quality)[0]!

      await db.from('objects').update({
        holder_kind: 'place', holder_id: lugar.id,
        left_by: player.name, left_tick: tick,
      }).eq('id', cosa.id)

      return `dejó ${cosa.kind} en ${lugar.name}`
    }

    // ── levantar ──────────────────────────────────────────────
    //
    // La otra punta, y la que sí es noticia. `levantar` y no `tomar` porque
    // `tomar` ya existe y es tomarse un cuenco de cuajada: dos verbos con el
    // mismo nombre es cómo se llega a que el jugador se coma lo que quería
    // levantar.
    //
    // **Acá no se pide saber nada**, igual que `buscar`: agacharse lo hace
    // cualquiera. La diferencia con `buscar` es de dónde sale la cosa —`buscar`
    // la saca del lugar y es la ÚNICA puerta por la que entra al mundo algo sin
    // autor; `levantar` no crea nada, sólo cambia de mano algo que ya existía.
    //
    // El evento sale **sólo cuando la dejó otro**. Levantar lo que vos mismo
    // dejaste hace dos minutos no le pasó a nadie, y contarlo sería una fábrica
    // de ruido con la firma del jugador: soltar-levantar-soltar es un botón que
    // el director cobraría por leer. Cuando la dejó otro —o cuando se le cayó a
    // un muerto— es exactamente la historia que este juego quiere contar.
    case 'levantar': {
      const lugar = places.find((p) => p.id === player.place_id)
      if (!lugar) return 'no está en ningún lado'

      const suelo = (await db
        .from('objects').select('id, kind, quality, made_by, left_by, left_tick')
        .eq('region_id', regionId)
        .eq('holder_kind', 'place').eq('holder_id', lugar.id)).data ?? []
      if (suelo.length === 0) return `no hay nada tirado en ${lugar.name}`

      const queStr = action.target?.trim().toLowerCase()
      const cands = queStr ? suelo.filter((o) => norm(o.kind).includes(queStr)) : suelo
      if (cands.length === 0) return `no hay ningún "${action.target}" tirado en ${lugar.name}`

      // El mejor de los que haya, igual que `dar` y que `tomar`.
      const cosa = cands.sort((a, b) => b.quality - a.quality)[0]!
      const quienLaDejo = cosa.left_by

      // ── ¿Esto estaba tirado, o estaba EN VENTA? ────────────
      //
      // **El primer delito del valle**, y §9.3b decía exactamente cuándo
      // conectarlo: *"el día que un objeto pueda quedar tirado en el suelo,
      // robar existe. Ése es el momento de conectar la consecuencia, no
      // antes."* Ese día fue el que entró el suelo; hoy hay mostrador, así que
      // lo que está en el suelo de un lugar con mostrador y lo dejó el que
      // atiende **es mercadería, y llevársela sin pagar es robar.**
      //
      // Nadie te lo impide físicamente, y es a propósito: §9.3 ya dice que el
      // castigo no puede ser una celda. La pena es que el que te vio deja de
      // enseñarte — y como el saber vive en gente mortal, **perder maestros es
      // lo más caro que hay en este mundo.**
      //
      // Y hay dos robos distintos, que es lo que lo hace un sistema y no un
      // castigo: **con el mostrador abierto y el tendero delante, te vio.** A
      // la noche, con el puesto cerrado, no te vio nadie — el hecho queda
      // igual en `events` (si no está en `events`, no pasó) pero sin nombre en
      // la memoria de nadie y sin un punto de vínculo movido. El valle
      // amanece con algo de menos y sin saber quién fue.
      const puestos = await mostradores(regionId)
      const puesto = puestos.find((m) => m.place_id === lugar.id)
      const tendero = puesto?.person_id
        ? people.find((p) => p.id === puesto.person_id) : undefined
      const esMercaderia = !!tendero && quienLaDejo === tendero.name
      const teVieron = esMercaderia && !!puesto
        && despiertoA(horaDelValle(), puesto.abre, puesto.cierra)
        && !!tendero && aca(tendero) && !duerme(tendero)

      // ⚠ `made_by` intacto. `left_by` y `left_tick` se limpian porque
      //   describen el estar tirado: dejarlos puestos haría que la bolsa dijera
      //   "la dejó Bruno" de algo que tenés en la mano.
      await db.from('objects').update({
        holder_kind: 'player', holder_id: player.id,
        left_by: null, left_tick: null,
      }).eq('id', cosa.id)

      if (esMercaderia && tendero) {
        ev({ kind: 'robo', place_id: lugar.id,
          summary: teVieron
            ? `${player.name} se llevó ${cosa.kind} del mostrador de ${tendero.name} sin pagar, delante de ${tendero.name}.`
            : `Del mostrador de ${tendero.name} en ${lugar.name} faltó ${cosa.kind}, y nadie vio quién se la llevó.`,
          detail: {
            player: teVieron ? player.name : null, person: tendero.name,
            place: lugar.name, object: cosa.kind, quality: cosa.quality,
            made_by: cosa.made_by ?? null, visto: teVieron,
          } })
        if (teVieron) {
          await recordar(tendero.id, player,
            `${player.name} se llevó ${cosa.kind} del mostrador de ${tendero.name} sin pagar`, tick)
          // El precio del robo es social y es caro: el aprecio se cae por
          // abajo de todos los umbrales que abren verbos, y el miedo sube. No
          // es una multa — es que dejaron de enseñarte.
          await tocarVinculo(tendero, player, { valued: -30, feared: 12 }, ev)
          // Y lo ve el que esté delante. El chusmerío de la pasada 5 lo
          // reparte solo: un pueblo se entera de esto.
          for (const t of people.filter((p) => aca(p) && p.id !== tendero.id)) {
            await recordar(t.id, player,
              `${player.name} le robó del mostrador a ${tendero.name}`, tick)
            await tocarVinculo(t, player, { valued: -10, feared: 6 }, ev)
          }
        }
        return teVieron
          ? `se llevó ${cosa.kind} sin pagar, y ${tendero.name} lo vio`
          : `se llevó ${cosa.kind} del mostrador y no lo vio nadie`
      }

      if (!quienLaDejo || quienLaDejo === player.name) {
        return `levantó ${cosa.kind} en ${lugar.name}`
      }

      // El MISMO `kind` que `buscar`, y a propósito: para el mundo el hecho es
      // que salió de ahí con algo. Lo que cambia es de dónde salió, y eso va en
      // `detail`, que es la verdad canónica.
      // La autoría sólo cuando AGREGA algo. Si el que la hizo es el mismo que
      // la dejó tirada, la frase ya lo dijo, y «que había dejado ahí Prueba3D.
      // La había hecho Prueba3D» es el mismo nombre dos veces en un renglón que
      // el director paga por leer. Cuando son distintos es la mitad de la
      // noticia: la hoja la forjó Ilde y la abandonó Bruno.
      const autoria = cosa.made_by
        && cosa.made_by !== player.name && cosa.made_by !== quienLaDejo
        ? ` La había hecho ${cosa.made_by}.` : ''
      const dias = cosa.left_tick != null ? tick - cosa.left_tick : null
      ev({ kind: 'hallazgo', place_id: lugar.id,
        summary: `${player.name} levantó del suelo de ${lugar.name} ${cosa.kind}`
          + ` que había dejado ahí ${quienLaDejo}`
          + (dias != null && dias >= 2 ? `, hace ${dias} días` : '')
          + `.${autoria}`,
        detail: {
          player: player.name, place: lugar.name, object: cosa.kind,
          quality: cosa.quality, made_by: cosa.made_by ?? null,
          dejado_por: quienLaDejo, dias,
        } })
      return `levantó ${cosa.kind} en ${lugar.name}`
        + (cosa.made_by ? ` — la hizo ${cosa.made_by}` : '')
    }

    // ── pedir ─────────────────────────────────────────────────
    //
    // **El agujero más grande que le quedaba a la economía: nadie te podía dar
    // nada.** Las únicas dos escrituras a `holder_kind = 'player'` en todo el
    // código eran `case 'trabajar'` y `case 'buscar'` — o lo hiciste vos o lo
    // juntaste vos. `dar` iba en una sola dirección.
    //
    // Y eso rompía una promesa explícita de `DISENO.md` §10.2: *"el frasco es
    // la única forma de exceder tu capacidad, y lo fabrica otro — eso le da al
    // que destila poder real sobre el que pelea sin que nadie farmee nada"*. No
    // era cierto en ninguna dirección: el frasco de raíz es lo único que te
    // cuelga una cuarta runa y no había forma de conseguir uno si no sabías
    // destilar.
    //
    // ── Por qué es un verbo y no un botón colgado de los encargos ─────
    //
    // Se consideró colgarlo de `encargarse`, que ya existe, y está mal: un
    // encargo es *vos te hacés cargo de lo que persigue el otro*, o sea la
    // dirección contraria. Meter "y de paso dame algo" ahí adentro convertiría
    // el verbo más generoso del juego en una máquina expendedora con dos pasos.
    //
    // ── Lo que cuesta, que es la parte que importa ────────────────────
    //
    // **El favor se gasta.** Pedir baja el aprecio, y el que baja es el mismo
    // número que abre los verbos: pedís, te lo dan, y volvés a estar donde
    // estabas antes de ganártelo. No es que te quiera menos — es que el favor
    // que te tenía guardado ya te lo dio. Sin eso esto sería un botón de "dame"
    // y la escasez del valle se compraría tecleando.
    //
    // Y tiene **dos escalones, no uno**, porque son dos favores de tamaños muy
    // distintos:
    //
    //   · `UMBRAL_ENCARGO` — darte algo que YA TIENE en la mano. Es el favor
    //     barato, el mismo que se piden entre ellos en la pasada 2.
    //   · `UMBRAL_ENSENAR` — que te lo HAGA con sus manos. Le cuesta el día y
    //     la mano, que es exactamente lo que cuesta enseñar, y por eso está en
    //     el mismo escalón. Ahí aparece la simetría que hace bueno al sistema:
    //     cuando alguien te tiene esa confianza podés pedirle **el oficio o la
    //     cosa**, y son dos caminos distintos con el mismo precio social. El que
    //     quiere el frasco lo pide; el que quiere no depender de nadie aprende
    //     a destilar.
    //
    // **Y el miedo también sirve, que es para lo que están los dos ejes.**
    // DISENO §9.3: *"no te valoran, te temen → te sonríen de frente y conspiran
    // atrás"*. Alguien que te teme te entrega lo que tiene en la mano aunque no
    // te aprecie — pero no se pone a trabajar el día entero para vos, y le
    // cuesta más aprecio del que ya te tenía. Eso queda escrito en su memoria
    // con esas palabras, y la memoria viaja: el valle se entera.
    //
    // ⚠ La regla de la escasez, intacta en las dos ramas. Lo que te dan de la
    //   mano **no cambia de autor**; lo que te hacen sale con el nombre de quien
    //   lo hizo, porque lo hizo. Nada aparece de la nada y nada sale con
    //   `made_by` en null: eso lo escribe `case 'buscar'` y nadie más.
    //
    // ── Dónde entra la plata, cuando entre ────────────────────────────
    //
    // Va a haber moneda (`DISENO.md` §9.3b), y este caso es el molde: **son dos
    // economías en paralelo que nunca se cruzan.** Un `comprar` es este mismo
    // verbo con otra moneda — se paga para que alguien te HAGA algo, jamás para
    // que te lo ENSEÑE.
    //
    // La costura está lista y hay tres cosas escritas para que se note:
    //
    //   1. **Este caso no escribe una sola fila nueva en `knows`, y no puede.**
    //      Lo único que toca de `knows` es el `destreza`/`veces` de una fila que
    //      ya era del NPC: practicó él, con sus manos. Ésa es literalmente la
    //      regla dura del mercado —ninguna transacción termina en un `knows`
    //      nuevo— y ya vale acá. Si alguien agrega un `insert` a `knows` en este
    //      case, rompió el juego.
    //   2. **El costo ya está separado del efecto.** Lo que cambia de mano es un
    //      `update` de `objects`; lo que se paga es otra línea (hoy `valued`).
    //      Poner un precio es cambiar esa segunda línea, no reescribir el verbo.
    //      Y el favor no se reemplaza por la plata: *un favor y un pago no son
    //      lo mismo, y quién te pide cuál dice quién sos para esa persona*.
    //   3. **Ya hay dónde poner el mostrador.** `holder_kind = 'place'` es el
    //      suelo de un lugar, y el stock de un puesto es exactamente eso: cosas
    //      que están en un sitio y no en la mano de nadie.
    //
    // Lo que NO está y hace falta: la moneda misma (tabla de bolsas, con TIPO —
    // lo que acepta la aldea no tiene por qué valer del otro lado del valle), un
    // precio, y los verbos `comprar`/`vender`. Eso es una pasada propia.
    case 'pedir': {
      // "<cosa> a <alguien>", o sólo "<alguien>". Se parte por el ÚLTIMO " a "
      // igual que `dar` y `ensenar`, y por lo mismo: el nombre de una cosa
      // puede tener uno adentro y el de una persona no.
      const bruto = action.target ?? ''
      const corte = bruto.toLowerCase().lastIndexOf(' a ')
      const queStr = corte > 0 ? bruto.slice(0, corte).trim() : null
      const quienStr = norm((corte > 0 ? bruto.slice(corte + 3) : bruto).trim())
      if (!quienStr) return 'uso: pedir <cosa> a <persona>'

      const quien = people.find((p) => norm(p.name).includes(quienStr) && aca(p))
      if (!quien) return `no hay ningún ${quienStr} acá`

      const { data: vinculo } = await db
        .from('bonds').select('valued, feared')
        .eq('person_id', quien.id).eq('toward_id', player.id).limit(1).maybeSingle()
      const v = vinculo?.valued ?? 0
      const miedo = vinculo?.feared ?? 0

      // Nadie regala lo que él mismo anda buscando. Es la misma regla que la
      // pasada 2 aplica entre NPCs, y sin ella Odila te entrega el frasco que
      // necesita para pagar su propia deuda.
      const suyas = (await db
        .from('agendas').select('needs_kind, needs_object')
        .eq('person_id', quien.id).in('state', ['activa', 'bloqueada'])).data ?? []
      const loNecesita = (kind: string) => suyas.some(
        (a) => a.needs_kind === 'object' && a.needs_object === kind)

      const enSuMano = (await db
        .from('objects').select('id, kind, quality, made_by')
        .eq('region_id', regionId)
        .eq('holder_kind', 'person').eq('holder_id', quien.id)).data ?? []
      const puedeDar = enSuMano
        .filter((o) => !loNecesita(o.kind))
        .filter((o) => !queStr || norm(o.kind).includes(norm(queStr)))
      // El mejor que tenga: un favor es un favor. Y de paso la calidad pesa en
      // lo que cuesta pedirlo, más abajo.
      const deLaMano = puedeDar.sort((a, b) => b.quality - a.quality)[0]

      if (deLaMano) {
        const bonus = Math.floor(deLaMano.quality / 25)   // 0..4
        const porMiedo = v < UMBRAL_ENCARGO && miedo >= UMBRAL_MIEDO
        if (v < UMBRAL_ENCARGO && !porMiedo) {
          // Sin evento. La negativa de `aprender` sí lo emite porque ahí el
          // "no" es raro —vas a pedir el oficio cuando creés que estás listo—
          // y acá sería el caso común de todos los que llegan: una planilla con
          // la firma del rechazo, y la lee el director y se paga.
          return `${quien.name} ${comoTeVe(v)}: no le va a dar nada suyo a ${player.name} todavía`
        }

        // ⚠ Cambia de mano, no de autor.
        await db.from('objects').update({
          holder_kind: 'player', holder_id: player.id,
          left_by: null, left_tick: null,
        }).eq('id', deLaMano.id)

        const autoria = deLaMano.made_by && deLaMano.made_by !== quien.name
          ? ` La había hecho ${deLaMano.made_by}.` : ''
        ev({ kind: 'entrega', place_id: quien.place_id,
          summary: porMiedo
            ? `${player.name} le pidió ${deLaMano.kind} a ${quien.name}, y ${quien.name} se lo dio sin discutir.${autoria}`
            : `${quien.name} le dio ${deLaMano.kind} a ${player.name} porque se lo pidió.${autoria}`,
          detail: {
            person: quien.name, player: player.name, object: deLaMano.kind,
            quality: deLaMano.quality, made_by: deLaMano.made_by ?? null,
            hecho_ahora: false, por_miedo: porMiedo,
          } })
        await recordar(quien.id, player, porMiedo
          ? `${player.name} le sacó ${deLaMano.kind} a ${quien.name} sin que pudiera negarse`
          : `${player.name} le pidió ${deLaMano.kind} a ${quien.name} y se lo llevó`, tick)
        // El favor se gasta. Con miedo se gasta más y encima no compra nada:
        // el que te teme te da la cosa y te quiere peor que antes.
        await tocarVinculo(quien, player,
          porMiedo ? { valued: -6 - bonus } : { valued: -(4 + bonus) }, ev)
        // «sin discutir» es lo único que el jugador ve de la rama del miedo, y
        // alcanza: nadie le agradece a alguien que le tiene terror.
        return porMiedo
          ? `${quien.name} le dio ${deLaMano.kind} sin discutir`
          : `${quien.name} le dio ${deLaMano.kind}`
      }

      // ── Que te lo haga ─────────────────────────────────────
      //
      // El favor caro. Requiere las tres cosas que exige fabricar cualquier
      // cosa en este juego, y ninguna se saltea: que lo SEPA, que esté en el
      // LUGAR donde eso se hace, y que esté DESPIERTO. **`makes_at` no se
      // saltea nunca** — una hoja se forja en la fragua y en ningún otro lado,
      // la pida quien la pida, igual que en `case 'trabajar'`.
      const lugar = places.find((p) => p.id === player.place_id)
      const saberes = (await db
        .from('knows')
        .select('id, destreza, veces, knowledge:knowledge_id (name, makes, makes_at)')
        .eq('holder_kind', 'person').eq('holder_id', quien.id)).data ?? []
      const recetas = saberes.filter((k) => {
        const c = (k as unknown as { knowledge: Receta | null }).knowledge
        if (!c?.makes) return false
        // ⚠ Acá NO vale «nadie regala lo que anda buscando», y es la misma
        //   excepción que ya hace la pasada 2 entre NPCs: **el que sabe
        //   destilar puede destilar dos.** Sin esto, Odila —que casi siempre
        //   tiene una meta abierta con frascos— sería justamente la única
        //   persona del valle a la que no se le puede pedir un frasco, que es
        //   al revés de lo que dice la ficción. La regla sí vale para lo que
        //   tiene en la mano, arriba: eso es uno solo y es suyo.
        if (!queStr) return true
        return c.makes.toLowerCase().includes(queStr.toLowerCase())
          || c.name.toLowerCase().includes(queStr.toLowerCase())
      })
      if (recetas.length === 0) {
        return queStr
          ? `${quien.name} no tiene ningún "${queStr}" ni sabe hacerlo`
          : `${quien.name} no tiene nada que darle`
      }
      // El que se puede hacer ACÁ. Si sabe hacerlo pero estamos en otro lado,
      // se lo decimos con el nombre del lugar: un "no" que no dice por qué es
      // lo mismo que un botón roto.
      const aquí = recetas.filter((k) => {
        const c = (k as unknown as { knowledge: Receta }).knowledge
        return c.makes_at === lugar?.kind
      })
      if (aquí.length === 0) {
        const c = (recetas[0] as unknown as { knowledge: Receta }).knowledge
        const donde = places.find((p) => p.kind === c.makes_at)
        return `${quien.name} sabe hacer ${c.makes}, pero eso se hace en ${donde?.name ?? c.makes_at}`
      }
      if (duerme(quien)) return `${quien.name} está durmiendo`
      if (v < UMBRAL_ENSENAR) {
        // Acá sí se dice en qué escalón está, por el mismo motivo que en
        // `aprender`: es el mismo escalón, y saber que falta es lo que hace que
        // ganárselo no sea superstición. Sin evento igual.
        return `${quien.name} ${comoTeVe(v)}, pero no lo suficiente como para ponerse a trabajar para ${player.name}`
      }

      const elegido = aquí[0]!
      const receta = (elegido as unknown as { knowledge: Receta }).knowledge

      // Le costó el día y le queda la mano: practicó, así que mejora. Es la
      // misma curva de siempre y la misma calidad — la destreza es de quien la
      // practicó y no se presta.
      const antes: number = elegido.destreza
      const ahora = Math.min(100, antes + mejora(antes))
      await db.from('knows')
        .update({ destreza: ahora, veces: elegido.veces + 1 }).eq('id', elegido.id)

      const q = calidad(antes)
      // ⚠ `made_by` con SU nombre, porque lo hizo con sus manos. Nunca null:
      //   lo único que escribe un null es `case 'buscar'`.
      await db.from('objects').insert({
        region_id: regionId, kind: receta.makes, quality: q,
        made_by: quien.name, made_tick: tick,
        holder_kind: 'player', holder_id: player.id,
      })

      ev({ kind: 'entrega', place_id: quien.place_id,
        summary: `${player.name} le pidió ${receta.makes} a ${quien.name}, y ${quien.name} se puso a hacerlo`
          + ` en ${lugar?.name ?? 'el valle'} para dárselo.`,
        detail: {
          person: quien.name, player: player.name, object: receta.makes,
          quality: q, made_by: quien.name, hecho_ahora: true, por_miedo: false,
        } })
      await recordar(quien.id, player,
        `${quien.name} le hizo ${receta.makes} a ${player.name} porque se lo pidió`, tick)
      const bonusHecho = Math.floor(q / 25)
      await tocarVinculo(quien, player, { valued: -(10 + bonusHecho) }, ev)
      return `${quien.name} le hizo ${receta.makes}`
    }

    // ══════════════════════════════════════════════════════════
    // LA PLATA — vender, comprar y cambiar
    // ══════════════════════════════════════════════════════════
    //
    // Son DOS economías que corren en paralelo y **nunca se cruzan**
    // (`DISENO.md` §9.3b). Podés comprar una hoja templada; **no podés comprar
    // saber hacerla.** Y el mercado no diluye la tesis del saber escaso: la
    // afila, porque el día que se muera Ilde vas a tener la plata en la mano y
    // no va a haber una sola hoja nueva en el valle, ni al doble ni al triple.
    // **Un mercado sabe decir «no hay» de una manera que un menú no.**
    //
    // ⚠ LA REGLA DURA, y es la que no se rompe: **ninguna de estas tres ramas
    //   escribe una sola fila nueva en `knows`, y no puede.** Ni comprar, ni
    //   vender, ni pagar una lección. Se paga para que alguien te HAGA algo; no
    //   se paga para que te lo ENSEÑE. Si alguna vez hay un precio para
    //   aprender, este juego dejó de ser el que es.
    //
    // ⚠ Y la otra: **ninguna toca `made_by` jamás.** Una cosa que cambia de
    //   mano sigue diciendo quién la hizo, y eso es exactamente lo que la
    //   vuelve interesante. Lo único en todo el código que escribe un
    //   `made_by = null` es `case 'buscar'`.
    //
    // ── Un favor y un pago no son lo mismo ────────────────────
    //
    // Es la mitad de esta tarea que no es plata, y está en el aprecio:
    //
    //   · `dar` lo que alguien necesitaba mueve el vínculo **+25**. Es un
    //     regalo y te lo van a devolver enseñándote algo.
    //   · `vender` lo mismo mueve **+3**. Cobraste. Está bien cobrar, y el
    //     valle no te debe nada.
    //
    // O sea que el jugador elige, cada vez, entre la plata y la gente — y como
    // el saber sólo se consigue de la gente, la elección tiene precio real.
    // *Quién te pide cuál dice quién sos para esa persona.*

    // ── vender ────────────────────────────────────────────────
    //
    // La primera forma de que un jugador tenga plata sin que aparezca de la
    // nada: **la que cobrás sale de una bolsa que ya la tenía.**
    //
    // Y no te compra cualquiera. Dos, y las dos salen del estado:
    //   · **el que lo necesita** — tiene una agenda abierta pidiendo eso.
    //     Paga bien (un tercio más) porque lo venía buscando.
    //   · **el que atiende un mostrador acá** — compra cualquier cosa para
    //     revenderla, y por eso paga menos (dos tercios). Es el que hace que
    //     siempre haya a quién venderle.
    // El resto del valle no te compra nada, y eso está bien: un mundo donde
    // todos compran todo es un menú con caras.
    case 'vender': {
      const bruto = action.target ?? ''
      const corte = bruto.toLowerCase().lastIndexOf(' a ')
      const queStr = corte > 0 ? bruto.slice(0, corte).trim() : bruto.trim()
      const quienStr = corte > 0 ? norm(bruto.slice(corte + 3).trim()) : ''

      const lugar = places.find((p) => p.id === player.place_id)
      const ms = await mostradores(regionId)
      const aqui = ms.find((m) => m.place_id === player.place_id)

      // Sin nombre, le vendés al que atiende acá. Es lo que hace que el verbo
      // se pueda usar con un botón del mostrador y no escribiendo una frase.
      const quien = quienStr
        ? people.find((p) => norm(p.name).includes(quienStr) && aca(p))
        : people.find((p) => p.id === aqui?.person_id && aca(p))
      if (!quien) {
        return quienStr
          ? `no hay ningún ${quienStr} acá`
          : `no hay ningún mostrador abierto en ${lugar?.name ?? 'el valle'}`
      }
      if (duerme(quien)) return `${quien.name} está durmiendo`

      const mios = (await db
        .from('objects').select('id, kind, quality, made_by')
        .eq('holder_kind', 'player').eq('holder_id', player.id)).data ?? []
      const cands = queStr
        ? mios.filter((o) => norm(o.kind).includes(norm(queStr)))
        : mios
      if (cands.length === 0) {
        return queStr ? `no lleva ningún "${queStr}" encima` : 'no lleva nada encima para vender'
      }

      // Lo que esa persona anda buscando. Es lo mismo que mira `dar`, y por eso
      // el jugador puede elegir: regalárselo y ganarse a alguien, o cobrárselo.
      const abiertas = (await db
        .from('agendas').select('id, goal, needs_kind, needs_object')
        .eq('person_id', quien.id).in('state', ['activa', 'bloqueada'])).data ?? []
      const leHaceFalta = (kind: string) => abiertas.find(
        (a) => a.needs_kind === 'object' && a.needs_object === kind)

      const suMostrador = ms.find((m) => m.person_id === quien.id
        && m.place_id === player.place_id)
      const atiende = !!suMostrador
        && despiertoA(horaDelValle(), suMostrador.abre, suMostrador.cierra)

      // El mejor de los que le sirvan, y primero lo que necesita: si lleva dos
      // cosas y una le cierra una meta, es ésa la que paga bien.
      const vendibles = cands
        .filter((o) => atiende || !!leHaceFalta(o.kind))
        .sort((a, b) => (leHaceFalta(b.kind) ? 1 : 0) - (leHaceFalta(a.kind) ? 1 : 0)
          || b.quality - a.quality)
      const cosa = vendibles[0]
      if (!cosa) {
        return `${quien.name} no compra nada de lo que ${player.name} lleva encima`
      }

      const t = await tarifas(people, players)
      const cumple = leHaceFalta(cosa.kind)
      const lista = precio(cosa, t)
      // El que lo necesita paga más; el que revende, menos. La diferencia entre
      // los dos números ES el margen del mostrador, y es de dónde vive el que
      // atiende.
      const pactado = Math.max(1, Math.round(lista * (cumple ? 1.3 : 0.6)))

      const moneda = monedaDe(quien.id, ms)
      const cat = await monedas()
      const m = cat.find((x) => x.slug === moneda)

      const suya = await bolsaDe(regionId, { kind: 'person', id: quien.id })
      if ((suya[moneda] ?? 0) < pactado) {
        // Un mercado que dice «no tengo con qué» es un mercado. Sin evento: es
        // una negativa, y las negativas no son noticia para el valle.
        return `${quien.name} no tiene con qué pagarte ${cosa.kind}`
          + ` — te pagaría ${enPlata(pactado, m)} y no le quedan`
      }
      if (!(await pagar(regionId,
        { kind: 'person', id: quien.id }, { kind: 'player', id: player.id },
        moneda, pactado))) {
        return `${quien.name} no llegó a pagarte; probá de nuevo`
      }

      // ⚠ Cambia de mano, no de autor. Y si el que compra atiende un mostrador
      //   acá, la cosa va DERECHO AL MOSTRADOR —o sea al suelo del lugar, con
      //   su nombre en `left_by`— porque es lo que acaba de pasar: la compró
      //   para revenderla. Se ve en el acto y la puede comprar otro jugador.
      await db.from('objects').update(atiende
        ? {
          holder_kind: 'place', holder_id: player.place_id,
          left_by: quien.name, left_tick: tick,
        }
        : { holder_kind: 'person', holder_id: quien.id, left_by: null, left_tick: null },
      ).eq('id', cosa.id)

      const autoria = cosa.made_by && cosa.made_by !== player.name
        ? ` La había hecho ${cosa.made_by}.` : ''
      ev({ kind: 'venta', place_id: quien.place_id,
        summary: cumple
          ? `${player.name} le vendió ${cosa.kind} a ${quien.name}, que lo venía buscando, por ${enPlata(pactado, m)}.${autoria}`
          : `${player.name} le vendió ${cosa.kind} a ${quien.name} por ${enPlata(pactado, m)}.${autoria}`,
        detail: {
          player: player.name, person: quien.name, object: cosa.kind,
          quality: cosa.quality, made_by: cosa.made_by ?? null,
          precio: pactado, moneda, necesitaba: !!cumple,
        } })
      await recordar(quien.id, player,
        `${player.name} le vendió ${cosa.kind} a ${quien.name}`, tick)

      if (cumple) {
        // Le cerró la meta igual — pero cobrando. **Ésta es la línea que hace
        // que el mercado no reemplace el favor**: `dar` mueve +25 y esto mueve
        // +3. Le solucionaste el problema y te pagó; están a mano.
        await cumplirAgenda(cumple, quien, tick, ev, {
          kind: 'agenda_cumplida', place_id: quien.place_id,
          summary: `${quien.name} venía detrás de ${cumple.goal}. ${player.name} apareció con ${cosa.kind} y se lo vendió.`,
          detail: {
            person: quien.name, player: player.name, goal: cumple.goal,
            object: cosa.kind, quality: cosa.quality,
            made_by: cosa.made_by ?? null, pagado: pactado, moneda,
          },
        }, player)
        await tocarVinculo(quien, player, { valued: 3 }, ev)
      } else {
        await tocarVinculo(quien, player, { valued: 2 }, ev)
      }
      return `le vendió ${cosa.kind} a ${quien.name} por ${enPlata(pactado, m)}`
    }

    // ── comprar ───────────────────────────────────────────────
    //
    // Es `case 'pedir'` con otra moneda, y la costura ya estaba puesta ahí: el
    // costo estaba separado del efecto —lo que cambia de mano es un `update` de
    // `objects`, lo que se paga es otra línea— así que poner precio fue cambiar
    // esa segunda línea, no reescribir el verbo.
    //
    // **Dos ramas, y la separación es el diseño:**
    //
    //   · **del mostrador** — lo que hay en la vidriera. No hace falta que te
    //     quieran: un mostrador le vende a cualquiera que no le caiga mal.
    //   · **que te lo haga** — le pagás el día y la mano. Sale con el nombre de
    //     quien lo hizo puesto, porque lo hizo.
    //
    // Lo que NO se compra: lo que alguien lleva en la mano. Eso es suyo y para
    // eso está `pedir`, que cuesta aprecio en vez de plata. **La mano se pide,
    // el mostrador se compra**, y esa frase es el sistema entero.
    //
    // Y acá aparece el «no hay» del mercado, que es el punto de todo esto: si
    // no queda nadie vivo que sepa hacer una cosa, no hay rama que la produzca
    // y el precio de la última sube. La plata no compra un oficio muerto.
    case 'comprar': {
      const bruto = action.target ?? ''
      const corte = bruto.toLowerCase().lastIndexOf(' a ')
      const queStr = (corte > 0 ? bruto.slice(0, corte) : bruto).trim()
      const quienStr = corte > 0 ? norm(bruto.slice(corte + 3).trim()) : ''

      const lugar = places.find((p) => p.id === player.place_id)
      const ms = await mostradores(regionId)
      const cat = await monedas()
      const t = await tarifas(people, players)
      const mia = await bolsaDe(regionId, { kind: 'player', id: player.id })

      const aqui = ms.find((m) => m.place_id === player.place_id)
      const tendero = aqui?.person_id
        ? people.find((p) => p.id === aqui.person_id) : undefined
      const abierto = !!aqui && !!tendero
        && despiertoA(horaDelValle(), aqui.abre, aqui.cierra)

      // ── Rama 1: la vidriera ────────────────────────────────
      //
      // El stock del mostrador **es el suelo del lugar**, y lo que lo separa de
      // la basura tirada es `left_by`: lo que dejó ahí el que atiende está en
      // venta, lo que dejó cualquier otro está en el piso y se levanta gratis.
      // Una columna que ya existía, usada para lo que significa.
      if (abierto && tendero && (!quienStr || norm(tendero.name).includes(quienStr))) {
        const stock = (await db
          .from('objects').select('id, kind, quality, made_by')
          .eq('region_id', regionId)
          .eq('holder_kind', 'place').eq('holder_id', player.place_id)
          .eq('left_by', tendero.name)).data ?? []
        const cands = queStr
          ? stock.filter((o) => norm(o.kind).includes(norm(queStr)))
          : stock
        if (cands.length > 0) {
          // El mejor que haya, igual que `dar`, `levantar` y `tomar`.
          const cosa = cands.sort((a, b) => b.quality - a.quality)[0]!
          const moneda = aqui.moneda
          const m = cat.find((x) => x.slug === moneda)
          const cuesta = precio(cosa, t)
          if ((mia[moneda] ?? 0) < cuesta) {
            return `${cosa.kind} cuesta ${enPlata(cuesta, m)}, y a ${player.name} no le alcanza`
          }
          if (!(await pagar(regionId,
            { kind: 'player', id: player.id }, { kind: 'person', id: tendero.id },
            moneda, cuesta))) {
            return 'no te alcanzó la plata'
          }
          // ⚠ `made_by` intacto. `left_by`/`left_tick` se limpian porque
          //   describen el estar en el mostrador, no el objeto.
          await db.from('objects').update({
            holder_kind: 'player', holder_id: player.id,
            left_by: null, left_tick: null,
          }).eq('id', cosa.id)

          const autoria = cosa.made_by && cosa.made_by !== tendero.name
            ? ` La había hecho ${cosa.made_by}.` : ''
          ev({ kind: 'compra', place_id: player.place_id,
            summary: `${player.name} le compró ${cosa.kind} a ${tendero.name} por ${enPlata(cuesta, m)}.${autoria}`,
            detail: {
              player: player.name, person: tendero.name, object: cosa.kind,
              quality: cosa.quality, made_by: cosa.made_by ?? null,
              precio: cuesta, moneda, hecho_ahora: false,
            } })
          await recordar(tendero.id, player,
            `${player.name} le compró ${cosa.kind} a ${tendero.name}`, tick)
          await tocarVinculo(tendero, player, { valued: 2 }, ev)
          return `compró ${cosa.kind} por ${enPlata(cuesta, m)}`
            + (cosa.made_by ? ` — la hizo ${cosa.made_by}` : '')
        }
      }

      // ── Rama 2: que te lo haga ─────────────────────────────
      //
      // Las tres cosas que exige fabricar cualquier cosa en este juego, y
      // ninguna se saltea: que lo SEPA, que esté en el LUGAR donde eso se hace,
      // y que esté DESPIERTO. **`makes_at` no se saltea nunca**, la pague quien
      // la pague — una hoja se forja en la fragua y en ningún otro lado.
      if (!queStr) {
        return abierto
          ? `no hay nada en el mostrador de ${tendero?.name}`
          : `no hay ningún mostrador abierto en ${lugar?.name ?? 'el valle'}`
      }

      const posibles = quienStr
        ? people.filter((p) => norm(p.name).includes(quienStr) && aca(p))
        : people.filter(aca)
      if (posibles.length === 0) {
        return quienStr ? `no hay ningún ${quienStr} acá` : 'no hay nadie acá'
      }

      for (const quien of posibles) {
        const saberes = (await db
          .from('knows')
          .select('id, destreza, veces, knowledge:knowledge_id (name, makes, makes_at)')
          .eq('holder_kind', 'person').eq('holder_id', quien.id)).data ?? []
        const receta = saberes.find((k) => {
          const c = (k as unknown as { knowledge: Receta | null }).knowledge
          if (!c?.makes || c.makes_at !== lugar?.kind) return false
          return c.makes.toLowerCase().includes(queStr.toLowerCase())
            || c.name.toLowerCase().includes(queStr.toLowerCase())
        })
        if (!receta) continue
        const c = (receta as unknown as { knowledge: Receta }).knowledge
        if (duerme(quien)) return `${quien.name} está durmiendo`

        const { data: vinculo } = await db
          .from('bonds').select('valued')
          .eq('person_id', quien.id).eq('toward_id', player.id).limit(1).maybeSingle()
        const v = vinculo?.valued ?? 0
        // El umbral de la plata es MUCHO más bajo que el del favor: un
        // mostrador le vende a cualquiera que no le caiga mal, y ése es
        // justamente el punto de que haya plata. Lo que no se compra es que
        // alguien que te desprecia se ponga a trabajar para vos.
        if (v <= -20) {
          return `${quien.name} ${comoTeVe(v)}: no va a trabajar para ${player.name} por ninguna plata`
        }

        const moneda = monedaDe(quien.id, ms)
        const m = cat.find((x) => x.slug === moneda)
        // El doble de lo que valdría hecho: le estás pagando el día entero y la
        // mano. Es caro a propósito — que te lo hagan tiene que costar más que
        // encontrarlo hecho, o nadie miraría nunca un mostrador.
        const cuesta = Math.max(1,
          Math.round(precio({ kind: c.makes, quality: 60 }, t) * 2))
        if ((mia[moneda] ?? 0) < cuesta) {
          return `${quien.name} te hace ${c.makes} por ${enPlata(cuesta, m)}, y a ${player.name} no le alcanza`
        }
        if (!(await pagar(regionId,
          { kind: 'player', id: player.id }, { kind: 'person', id: quien.id },
          moneda, cuesta))) {
          return 'no te alcanzó la plata'
        }

        // Le costó el día y le queda la mano: practicó, así que mejora. Es la
        // misma curva de siempre — la destreza es de quien la practicó y no se
        // presta, y **no hay plata que la compre**.
        const antes: number = receta.destreza
        const ahora = Math.min(100, antes + mejora(antes))
        await db.from('knows')
          .update({ destreza: ahora, veces: receta.veces + 1 }).eq('id', receta.id)

        const q = calidad(antes)
        // ⚠ `made_by` con SU nombre, porque lo hizo con sus manos. Nunca null:
        //   lo único que escribe un null es `case 'buscar'`.
        await db.from('objects').insert({
          region_id: regionId, kind: c.makes, quality: q,
          made_by: quien.name, made_tick: tick,
          holder_kind: 'player', holder_id: player.id,
        })
        ev({ kind: 'compra', place_id: quien.place_id,
          summary: `${player.name} le pagó ${enPlata(cuesta, m)} a ${quien.name} para que le hiciera ${c.makes},`
            + ` y ${quien.name} se puso a hacerlo en ${lugar?.name ?? 'el valle'}.`,
          detail: {
            player: player.name, person: quien.name, object: c.makes,
            quality: q, made_by: quien.name, precio: cuesta, moneda,
            hecho_ahora: true,
          } })
        await recordar(quien.id, player,
          `${player.name} le pagó a ${quien.name} para que le hiciera ${c.makes}`, tick)
        // Dos, y no los diez que se lleva `pedir` en negativo: **un pago no
        // gasta el favor.** Le pagaste; están a mano y un poco mejor que antes.
        await tocarVinculo(quien, player, { valued: 2 }, ev)
        return `${quien.name} le hizo ${c.makes} por ${enPlata(cuesta, m)}`
      }

      // **El «no hay» del mercado**, y es la razón por la que este verbo existe.
      // Si nadie vivo sabe hacerlo, no hay precio que lo arregle: el mercado
      // sabe decir que no hay de una manera que un menú no.
      if (!seFabricaTodavia(queStr, t)) {
        return `nadie en el valle sabe hacer ${queStr}. No hay, y no lo va a haber`
      }
      return `acá no hay quien te haga "${queStr}"`
    }

    // ── cambiar ───────────────────────────────────────────────
    //
    // **Plata de distintos tipos**, que fue el pedido y no es un adorno. El
    // valle tiene dos pueblos que no son humanos, con lengua propia y un
    // agravio concreto, y lo que acepta la aldea no vale del otro lado. **Una
    // moneda que no sirve del otro lado del valle es geografía, es política y
    // es una razón para viajar — las tres cosas de una.**
    //
    // Y el tipo de cambio ES la política: sale de `peoples.aprecio`. Cuanto
    // peor tratamos a un pueblo, más caro es su dinero, porque el que lo junta
    // lo suelta con más asco. Arreglar el agravio abarata la moneda. Es la
    // diplomacia con cotización, en un número que se mira todos los días.
    //
    // Va en una sola dirección —marcos a lo suyo— a propósito: **la plata del
    // monte se gasta en el monte.** Para volver a tener marcos se vende algo de
    // este lado, que es exactamente el viaje que queremos que exista.
    //
    // **Sin evento, y es la misma regla que `soltar`.** Dos bolsas cambiaron de
    // número; no le pasó nada a nadie más. Todo lo que entra a `events` lo lee
    // el director y se paga. La noticia es lo que hagas con esa plata.
    case 'cambiar': {
      const bruto = action.target ?? ''
      const corte = bruto.toLowerCase().lastIndexOf(' a ')
      const cuantoStr = (corte > 0 ? bruto.slice(0, corte) : bruto).trim()
      const quienStr = corte > 0 ? norm(bruto.slice(corte + 3).trim()) : ''
      const cuanto = Math.floor(Number(cuantoStr.replace(/[^0-9]/g, '')))
      if (!Number.isFinite(cuanto) || cuanto <= 0) {
        return 'uso: cambiar <cuántos marcos> a <persona>'
      }

      const ms = await mostradores(regionId)
      const cat = await monedas()
      // El que atiende un mostrador de moneda ajena, acá y ahora. Sin nombre,
      // el de este lugar: en el valle no hay dos.
      const posibles = ms.filter((m) => m.moneda !== MONEDA_DEL_VALLE && m.person_id)
      let quien: (typeof people)[number] | undefined
      let mostrador: Mostrador | undefined
      for (const m of posibles) {
        const p = people.find((q) => q.id === m.person_id)
        if (!p || !aca(p)) continue
        if (quienStr && !norm(p.name).includes(quienStr)) continue
        quien = p; mostrador = m; break
      }
      if (!quien || !mostrador) {
        return 'acá no hay quien te cambie plata'
      }
      if (duerme(quien)) return `${quien.name} está durmiendo`
      if (!despiertoA(horaDelValle(), mostrador.abre, mostrador.cierra)) {
        return `el mostrador de ${quien.name} está cerrado a esta hora`
      }

      const { data: vinculo } = await db
        .from('bonds').select('valued')
        .eq('person_id', quien.id).eq('toward_id', player.id).limit(1).maybeSingle()
      const v = vinculo?.valued ?? 0
      if (v < UMBRAL_ENCARGO) {
        return `${quien.name} ${comoTeVe(v)}: no le va a cambiar plata a ${player.name} todavía`
      }

      const m = cat.find((x) => x.slug === mostrador.moneda)
      const { data: pueblo } = await db
        .from('peoples').select('name, aprecio')
        .eq('region_id', regionId).eq('slug', m?.pueblo ?? '').limit(1).maybeSingle()
      const tipo = cotizacion(pueblo?.aprecio ?? 0)
      const salen = Math.floor(cuanto / tipo)
      if (salen <= 0) {
        return `a ${tipo} marcos cada una, con ${cuanto} no sale ninguna`
      }
      const gasto = salen * tipo

      const suya = await bolsaDe(regionId, { kind: 'person', id: quien.id })
      if ((suya[mostrador.moneda] ?? 0) < salen) {
        return `${quien.name} no tiene esa cantidad: le quedan ${enPlata(suya[mostrador.moneda] ?? 0, m)}`
      }
      const marco = cat.find((x) => x.slug === MONEDA_DEL_VALLE)
      if (!(await pagar(regionId,
        { kind: 'player', id: player.id }, { kind: 'person', id: quien.id },
        MONEDA_DEL_VALLE, gasto))) {
        return `a ${player.name} no le alcanzan ${enPlata(gasto, marco)}`
      }
      await pagar(regionId,
        { kind: 'person', id: quien.id }, { kind: 'player', id: player.id },
        mostrador.moneda, salen)

      return `cambió ${enPlata(gasto, marco)} por ${enPlata(salen, m)}`
        + (pueblo ? ` — lo que acepta ${pueblo.name}` : '')
    }

    // ── tomar ─────────────────────────────────────────────────
    //
    // No se resuelve acá: lo resuelve `tomar()`, que es la misma función que
    // llama `POST /tomar`. Es el mismo reparto que `case 'pelear'` y por el
    // mismo motivo — dos copias del mismo hecho se separan la primera vez que
    // alguien toca una, y ahí el invariante 3 se pudre sin que se note.
    case 'tomar': {
      const r = await tomar({
        regionId, tick, player, que: action.target, ev,
      })
      return r.ok ? r.cuenta : r.porque
    }

    default:
      return 'verbo desconocido'
  }
}

/** En qué lugar del valle se junta esto, si es que se junta en alguno.
 *
 * Sale del estado y no de un modelo, así que no puede mandar a nadie a buscar
 * la raíz a un lugar donde no hay raíz. Devuelve null para lo fabricado: eso no
 * se junta en ningún lado, hay que encontrar a alguien que sepa hacerlo — que
 * es exactamente el juego.
 */
function dondeSeConsigue(
  kind: string, places: { name: string; kind: string }[],
): string | null {
  const tipo = tipoQueDa(kind)
  if (!tipo) return null
  return places.find((p) => p.kind === tipo)?.name ?? null
}

// `recordar()` —un recuerdo de un NPC sobre un JUGADOR— vive en `combate.ts` y
// se importa arriba. **Siempre en tercera persona y con los dos nombres
// puestos**, y no es estilo: un recuerdo VIAJA. La pasada 5 lo copia tal cual a
// la cabeza del que lo escuchó y lo publica como `${contador} le contó a
// ${oyente}: ${what}`. Con «me metí a defender a Pedro» en primera persona, el
// salto producía dos mentiras encadenadas — «Sarn le contó a Marta: me metí a
// defender a Pedro» dice que Sarn defendió a Pedro, y peor, la fila copiada
// queda en la memoria de Sarn, así que `dialogo.ts` le hace decir a Sarn que él
// lo defendió. Nadie lo defendió. Fue Ilde.
//
// En tercera persona el recuerdo sobrevive a cualquier cantidad de saltos:
// «Ilde se metió a defender a Pedro» sigue siendo verdad lo cuente quien lo
// cuente, que es justo lo que hace falta cuando el chusmerío es la interfaz
// (DISENO §9.3). El comentario completo está en `combate.ts`, donde está la
// función: hasta hoy la explicación también estaba escrita dos veces.

/** Lo mismo, pero de un NPC sobre otro NPC — y **una sola vez**.
 *
 * Devuelve si el recuerdo es NUEVO, y quien llama usa eso para decidir si
 * además hay evento. No es un detalle: la pasada 5 agarra cada recuerdo fresco
 * y lo republica como `rumor`, así que un recuerdo que se reescribe todos los
 * ticks —«Ilde no le dio hoja templada a Sarn», otra vez, y otra— es una
 * fábrica de ruido con la firma del chusmerío. Escrito una vez, el valle lo
 * comenta una vez y después es historia vieja: exactamente lo que uno quiere de
 * un desaire.
 *
 * La deduplicación es por (quién se acuerda, de quién, qué), igual que la de la
 * pasada 5, y `.limit(1)` por la misma razón que allá: `maybeSingle()` da error
 * con más de una fila y entonces `data` viene null y no dedupea nada.
 */
async function recordarEntre(
  personId: string, aboutId: string, what: string, tick: number,
): Promise<boolean> {
  const { data: ya } = await db.from('memories').select('id')
    .eq('person_id', personId).eq('about_id', aboutId).eq('what', what)
    .limit(1).maybeSingle()
  if (ya) return false
  await db.from('memories').insert({
    person_id: personId, about_kind: 'person', about_id: aboutId, what, tick,
  })
  return true
}

/** El vínculo de un NPC hacia OTRO NPC. **Nunca emite un evento.**
 *
 * `tocarVinculo` es su hermano y mide otra cosa: cómo ve un NPC a un JUGADOR, y
 * por eso avisa cuando cruza `UMBRAL_ENCARGO` o `UMBRAL_ENSENAR` — esos dos
 * umbrales abren verbos del jugador y sin el aviso ganarse a alguien sería
 * superstición. Entre dos NPCs no abren nada y no hay a quién avisarle: que a
 * Bruno le caiga mejor Odila que ayer no es noticia ni con transición.
 *
 * La tabla ya lo soportaba (`bonds.toward_kind in ('person','player')`) y
 * `dialogo.ts` ya lo lee para que la gente hable de otra gente; lo que faltaba
 * era que alguien lo escribiera. Hasta hoy la mitad NPC↔NPC de `bonds` estaba
 * vacía en las dos regiones.
 *
 * `tope` es para el trato de todos los días: convivir sube el aprecio hasta
 * cierto punto y después hay que hacer algo. Es la misma forma que
 * `UMBRAL_ENCARGO` → `UMBRAL_ENSENAR` del lado del jugador — primero te ubican,
 * después te ganás lo demás — y es lo que evita que en trescientos ticks todos
 * se quieran con todos por el solo hecho de compartir un cuarto.
 */
async function tocarVinculoEntre(
  personId: string, towardId: string, valued: number, tope?: number,
) {
  const { data: actual } = await db.from('bonds').select('id, valued')
    .eq('person_id', personId).eq('toward_kind', 'person').eq('toward_id', towardId)
    .limit(1).maybeSingle()
  const antes = actual?.valued ?? 0
  if (tope !== undefined && antes >= tope) return
  const ahora = Math.max(-100, Math.min(100, antes + valued))
  if (ahora === antes) return
  if (actual) {
    await db.from('bonds').update({ valued: ahora }).eq('id', actual.id)
  } else {
    await db.from('bonds').insert({
      person_id: personId, toward_kind: 'person', toward_id: towardId,
      valued: ahora, feared: 0,
    })
  }
}

/** Mueve el vínculo y —esto es lo nuevo— avisa cuando cruzás un escalón.
 *
 * **El camino tiene que ser visible sin un número.** Un jugador no puede ver
 * "confianza 27/35": los porcentajes de cara al jugador están prohibidos y
 * además convierten una relación en una barra de progreso. Pero tampoco puede
 * quedarse a ciegas, porque entonces subir la confianza es superstición.
 *
 * La salida son dos avisos y sólo dos, los dos que abren algo:
 *
 *   · cruzar UMBRAL_ENCARGO — a partir de acá te piden favores.
 *   · cruzar UMBRAL_ENSENAR — a partir de acá te enseñan el oficio.
 *
 * Se emite en la TRANSICIÓN y nada más. Un vínculo que subió dos puntos y no
 * cruzó nada no es noticia, y si lo fuera el director cobraría por leer que a
 * Ilde le caés un poquito mejor que ayer. Cada par (persona, jugador) puede
 * producir estos dos eventos una vez en la vida.
 *
 * El resto del camino se ve en `comoTeVe()`, que es lo que dicen los NPCs y lo
 * que sale cuando alguien se niega a enseñarte.
 */
async function tocarVinculo(
  person: { id: string; name: string; place_id: string | null },
  player: { id: string; name: string },
  delta: { valued?: number; feared?: number },
  ev?: (e: Omit<Ev, 'region_id' | 'tick'>) => void,
) {
  // La escritura es la de `combate.ts` y no una copia: es la única que toca
  // `bonds` hacia un jugador, la use el golpe o la use el tick. Acá queda sólo
  // lo que este archivo agrega, que es el aviso.
  const { antes, ahora } = await escribirVinculo(person, player, delta)
  avisarConfianza(person, player, antes, ahora, ev)
}

/** El aviso, separado de la escritura porque tiene dos llamadores: el
 *  `tocarVinculo` de acá arriba y el golpe, que escribe el vínculo adentro de
 *  `pelear()` y avisa desde el `case 'pelear'`. Escrito una vez, con los
 *  umbrales donde viven, que es este archivo. */
function avisarConfianza(
  person: { id: string; name: string; place_id: string | null },
  player: { id: string; name: string },
  antes: number, ahora: number,
  ev?: (e: Omit<Ev, 'region_id' | 'tick'>) => void,
) {
  if (!ev) return
  const cruzo = (u: number) => antes < u && ahora >= u
  if (cruzo(UMBRAL_ENSENAR)) {
    ev({ kind: 'confianza', place_id: person.place_id,
      summary: `${person.name} ya le confiaría a ${player.name} lo que sabe hacer.`,
      detail: { person: person.name, player: player.name, abre: 'aprender' } })
  } else if (cruzo(UMBRAL_ENCARGO)) {
    ev({ kind: 'confianza', place_id: person.place_id,
      summary: `${person.name} empezó a confiar en ${player.name}: ya le pediría un favor.`,
      detail: { person: person.name, player: player.name, abre: 'encargarse' } })
  }
}

// Sólo cuando se ejecuta como script; importado desde la web no hace nada.
if (process.argv[1]?.endsWith('tick.ts')) {
  const veces = Number(process.argv[2] ?? 1)
  for (let i = 0; i < veces; i++) await step()
}
