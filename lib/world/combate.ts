/**
 * Un golpe. La única cosa del mundo que no espera al tick.
 *
 * Todo lo demás es lento a propósito —un tick es un día y el cron corre uno
 * cada seis horas— pero el combate no sobrevive a esa latencia: el jugador aprieta,
 * no pasa nada durante una hora, y vuelve a creer que los bichos son teatro
 * del cliente. Esa era exactamente la queja. Así que pelear se resuelve en el
 * momento, en el servidor, y deja su rastro en `events` como cualquier otra
 * cosa que pasó.
 *
 * No rompe ningún invariante: los invariantes dicen que la simulación no usa
 * IA y que el director no escribe estado, no que toda acción tenga que pasar
 * por el tick. **Este archivo lo importa `tick.ts`, así que acá no entra
 * el SDK de Anthropic — ni directo ni de rebote.** Por eso el único import de
 * este archivo es `../db.js` y tiene que seguir siéndolo: el invariante 1 se
 * rompe igual de rebote que de frente.
 *
 * **Y lo importa de verdad, desde el 17 de agosto.** Hasta ese día `tick.ts`
 * tenía una reimplementación entera de `pelear()` en su `case 'pelear'` —
 * mismo daño, mismas armas, los mismos `summary` copiados a mano— y el mismo
 * golpe se resolvía con dos códigos distintos según viniera por el tick o por
 * la web. No era deuda estética: un `summary` ambiguo hubo que arreglarlo dos
 * veces, y el día que alguien tocara una sola de las dos copias el mismo hecho
 * iba a producir eventos distintos. Eso es el invariante 3 erosionándose por
 * duplicación, en silencio. Ahora hay una sola función y dos llamadores.
 */
import { db } from '../db.js'

const roll = (max: number) => Math.floor(Math.random() * max)

/** Sólo estas dos cortan. Que un arma cambie el resultado es medio juego: el
 *  arma existe porque alguien supo hacerla, y si ese alguien se muere sin
 *  enseñarle a nadie, el valle vuelve a pelear a mano limpia para siempre. */
const ARMAS = ['hoja templada', 'filo de agua']

/** «al Hermano Mayor», no «a el Hermano Mayor».
 *
 * Salió al medir el summary de una pelea: los `kind` empiezan casi todos con
 * «un» o «algo», así que la contracción no hizo falta hasta que los bichos
 * tuvieron nombre propio —«el Hermano Mayor», de Los de la Ceniza—. Es una
 * arruga chiquita y es exactamente el tipo de cosa que le avisa al lector que
 * esto lo escribió una máquina. */
export const conA = (nom: string) =>
  /^el /i.test(nom) ? `al ${nom.slice(3)}` : `a ${nom}`

export type EventoPelea = {
  kind: string
  place_id: string | null
  summary: string
  detail: Record<string, unknown>
}

export type Golpe =
  | { ok: false; porque: string }
  | {
      ok: true; danio: number; health: number; muerta: boolean
      /** Con cuánta vida arrancó. El tick lo usa para saber **qué tan entera
       *  quedó la cosa**: una salida contra algo que quedó en pie al 90% no se
       *  paga igual que una contra algo que quedó hecho jirones, y eso tiene
       *  que salir del estado del bicho y no de un número plano. */
      maxHealth: number
      arma: string | null
      /** Contra qué. El tick lo necesita para el `outcome` de la acción
       *  —«mató a la jauría»— y es lo único que le hacía falta del cuerpo de
       *  esta función cuando tenía su propia copia. */
      threat: string
    }

export async function pelear(args: {
  regionId: string
  tick: number
  player: { id: string; name: string; place_id: string | null }
  /**
   * Quién es el que pega. `'player'` es el caso de siempre y el que llaman
   * `POST /pelear` y `case 'pelear'`; por eso es el default y por eso el
   * parámetro sigue llamándose `player`, que es lo que ya escriben los dos
   * llamadores viejos.
   *
   * `'person'` es un NPC, y entró con las salidas del tick: un NPC que baja a
   * un lugar donde hay algo adentro se lo cruza, y **tiene que cruzárselo con
   * las mismas reglas que vos** — el mismo daño, la misma lista de dos armas,
   * el mismo `summary`. Escribir una segunda función para eso era exactamente
   * lo que este archivo vino a terminar (ver el encabezado): dos códigos para
   * el mismo golpe se separan solos el día que alguien toca uno.
   *
   * Cambia tres cosas y ninguna más: de qué inventario sale el arma
   * (`objects.holder_kind`), con qué llave viaja el nombre en `detail` —los
   * eventos de un NPC van marcados con `npc`, que es de lo que cuelga el
   * descarte de eventos de un muerto en `tick.ts`— y qué se hace con los
   * testigos, que para un NPC no puede ser `bonds` hacia un jugador.
   */
  quien?: 'player' | 'person'
  /** El uuid de la amenaza. Si no viene, la primera viva donde está parado. */
  threatId?: string | null
  /** Sumidero de eventos. El tick los junta y los inserta todos juntos al
   *  final; la web no tiene ese final, así que si no viene se escribe acá. */
  ev?: (e: EventoPelea) => void | Promise<void>
  /**
   * Qué hacer cuando el aprecio de un testigo se movió. Se llama una vez por
   * testigo con el antes y el después, y **es la única diferencia real que
   * había entre las dos copias de esta función**, así que queda acá a la vista
   * en vez de escondida en un archivo duplicado.
   *
   * El tick pasa el suyo: cruzar `UMBRAL_ENCARGO` o `UMBRAL_ENSENAR` emite un
   * evento `confianza` («Ilde empezó a confiar en Pedro»), que existe para que
   * ganarse a alguien no sea superstición. `POST /pelear` en `web.ts` **no lo
   * pasa**, así que hoy el mismo muerto avisa por el tick y no avisa por la
   * web. No se unificó acá porque el que decide qué escribe `POST /pelear` es
   * el dueño de `web.ts`: es una línea suya, no mía.
   */
  avisarVinculo?: (
    testigo: { id: string; name: string; place_id: string | null },
    antes: number, ahora: number,
  ) => void | Promise<void>
  /**
   * Lo mismo que `avisarVinculo` pero para el otro lado del par: qué hacer con
   * cada testigo cuando el que peleó fue un NPC. Existe porque `recordar()` y
   * `tocarVinculo()` de acá abajo escriben hacia un JUGADOR
   * (`memories.about_kind = 'player'`, `bonds.toward_kind = 'player'`) y meter
   * un uuid de `people` en esas columnas ensucia el chusmerío en silencio: el
   * rumor sale igual y apunta a alguien que no existe de ese lado.
   *
   * El par NPC↔NPC lo escribe `tick.ts`, que tiene `recordarEntre` y
   * `tocarVinculoEntre` desde los verbos sociales. Acá sólo se dice quién vio
   * qué; qué se hace con eso es de allá.
   */
  alVerNpc?: (
    testigo: { id: string; name: string; place_id: string | null },
    npc: { id: string; name: string }, mato: string,
  ) => void | Promise<void>
}): Promise<Golpe> {
  const { regionId, tick, player, threatId, ev } = args
  const quien = args.quien ?? 'player'
  /** Con qué llave viaja el nombre del que peleó. Ver `quien`. */
  const suNombre = quien === 'player' ? 'player' : 'npc'

  // Sin id y sin lugar no hay a quién pegarle, y hay que cortar antes de la
  // query: mandarle '' a una columna uuid no devuelve vacío, revienta.
  if (!threatId && !player.place_id) return { ok: false, porque: 'no hay nada que pelear acá' }

  let q = db.from('threats')
    .select('id, kind, nombre, people_id, health, max_health, place_id')
    .eq('region_id', regionId).eq('alive', true)
  q = threatId ? q.eq('id', threatId) : q.eq('place_id', player.place_id!)
  // .limit(1) aunque el id sea único: sin él, dos bichos en el mismo lugar
  // hacen que maybeSingle() devuelva error y data null, y el golpe se pierde
  // justo cuando hay más de un monstruo — el único caso que importa.
  const { data: bicho } = await q.limit(1).maybeSingle()
  if (!bicho) return { ok: false, porque: 'no hay nada que pelear acá' }

  /** Cómo se lo nombra en una frase.
   *
   * `kind` no es un nombre: a veces es un párrafo entero —«un grupo de figuras
   * oscuras inmóviles entre los árboles quemados, con ramas crecidas sobre los
   * hombros»— y hasta hoy se lo metía DOS VECES en la misma oración, así que
   * el summary de una pelea eran cuarenta palabras de las cuales treinta y
   * seis eran la misma descripción repetida. Eso no sólo se lee mal: es lo que
   * el director tiene que leer, y le come la ventana de contexto con relleno.
   * Los que tienen `nombre` son personas —«el Hermano Mayor», de Los de la
   * Ceniza— y desde acá dejan de ser «un bicho».
   */
  const nom = bicho.nombre ?? bicho.kind

  const armas = (await db.from('objects')
    .select('kind, quality, made_by')
    .eq('holder_kind', quien).eq('holder_id', player.id)).data ?? []
  const arma = armas
    .filter((o) => ARMAS.includes(o.kind))
    .sort((a, b) => b.quality - a.quality)[0]

  const danio = 8 + roll(8) + Math.floor((arma?.quality ?? 0) / 6)
  const restante = Math.max(0, bicho.health - danio)

  const emitir = async (e: EventoPelea) => {
    if (ev) return void await ev(e)
    await db.from('events').insert({ region_id: regionId, tick, ...e })
  }

  if (restante > 0) {
    await db.from('threats').update({ health: restante }).eq('id', bicho.id)
    // Decía «..., y sigue en pie» y no se sabía quién sigue en pie: el que
    // pegó o el que aguantó. El director eligió —como siempre— la lectura más
    // dramática. Un summary que se puede leer de dos maneras es un bug de la
    // simulación, no del narrador: el sujeto se nombra. Esta frase estaba
    // escrita dos veces —acá y en `tick.ts`— y hubo que arreglarla dos veces.
    // Ahora está una sola vez y la leen los dos caminos.
    await emitir({
      kind: 'pelea', place_id: bicho.place_id,
      // «y no lo tumbó» en vez de «pero X no cayó»: el sujeto sigue siendo el
      // que pegó, así que la frase se entiende sin volver a nombrar al bicho.
      // Eso resuelve la ambigüedad que motivó el comentario de arriba SIN
      // pagar la descripción dos veces.
      summary: arma
        ? `${player.name} le entró ${conA(nom)} con ${arma.kind} y no lo tumbó.`
        : `${player.name} le entró ${conA(nom)} a mano limpia y no lo tumbó.`,
      detail: { [suNombre]: player.name, threat: nom, weapon: arma?.kind ?? null },
    })
    return {
      ok: true, danio, health: restante, muerta: false, maxHealth: bicho.max_health,
      arma: arma?.kind ?? null, threat: nom,
    }
  }

  await db.from('threats')
    .update({ alive: false, health: 0, killed_by: player.name, killed_tick: tick })
    .eq('id', bicho.id)
  // «..., que había hecho Ilde» se podía colgar del bicho tanto como del arma:
  // el relativo queda pegado al último sustantivo y el director leyó que Ilde
  // había hecho al monstruo. Se corta en dos oraciones y se nombra el sujeto.
  await emitir({
    kind: 'amenaza_muerta', place_id: bicho.place_id,
    summary: arma
      ? `${player.name} mató ${conA(nom)} con ${arma.kind}.${arma.made_by && arma.made_by !== player.name ? ` El arma la había hecho ${arma.made_by}.` : ''}`
      : `${player.name} mató ${conA(nom)} sin nada en las manos.`,
    detail: { [suNombre]: player.name, threat: nom, weapon: arma?.kind ?? null },
  })

  // Lo ven, y no todos lo leen igual: al que te teme le sube el miedo, no el
  // aprecio. Dos ejes, no una barra. Los testigos son los del lugar donde
  // cayó el bicho, no donde está parado el jugador: pueden diferir si peleó
  // por id contra algo de otro lado.
  const testigos = (await db.from('people')
    .select('id, name, place_id').eq('region_id', regionId).eq('alive', true)
    .eq('place_id', bicho.place_id)).data ?? []
  for (const t of testigos) {
    // El que peleó no es testigo de sí mismo. Sólo puede pasar cuando pelea un
    // NPC, que está parado en la misma lista.
    if (t.id === player.id) continue
    if (quien === 'person') {
      if (args.alVerNpc) await args.alVerNpc(t, player, nom)
      continue
    }
    await recordar(t.id, player, `${player.name} mató ${conA(nom)} acá`, tick)
    const movio = await tocarVinculo(t, player, { valued: 8, feared: 5 })
    if (args.avisarVinculo) await args.avisarVinculo(t, movio.antes, movio.ahora)
  }

  return {
    ok: true, danio, health: 0, muerta: true, maxHealth: bicho.max_health,
    arma: arma?.kind ?? null, threat: nom,
  }
}

/** El nombre del lugar, para que el summary diga dónde pasó. El director
 *  narra mucho mejor "en El Sotobosque" que "en algún lado". */
async function nombreDeLugar(placeId: string | null | undefined): Promise<string | null> {
  if (!placeId) return null
  const { data } = await db.from('places').select('name').eq('id', placeId).maybeSingle()
  return data?.name ?? null
}

export type Herida = { ok: boolean; health: number; caido: boolean; porque?: string }
export type Levantada = { ok: boolean; health: number; lugar: string }

/**
 * El golpe al revés: el bicho te pega a vos.
 *
 * Esta mitad faltaba y era la peor de las dos. Vos le pegabas a los bichos en
 * el mundo compartido y ellos te pegaban a vos en tu máquina: había una
 * `vida_jugador` en el cliente que bajaba en tiempo real y se reseteaba sola,
 * o sea que recibir daño no le pasaba al personaje, le pasaba a la pantalla.
 * Es el invariante 4 roto justo en el tramo que existe para arreglarlo — si
 * pasa en el cliente y no llega al servidor, no pasó.
 *
 * Dos cosas se leen de la base y no del que llama: la vida y el bicho. La vida
 * porque si el cliente dijera cuánta le queda volvimos al teatro; el bicho
 * porque tiene que estar vivo y en el mundo para poder morderte. Nadie recibe
 * un golpe de algo que no existe.
 *
 * **Y la muerde todo el mundo, desde el 17 de agosto.** Hasta ese día la pasada
 * 4b de `tick.ts` —«y muerden»— era una TERCERA implementación de esto, escrita
 * a mano al lado de las otras dos, y difería en cuatro cosas: pegaba
 * `6 + roll(10)` en vez de `8 + roll(8)`, decía «X lastimó a Y» en vez de «X le
 * entró a Y, pero Y no cayó», no deduplicaba, y **no le bajaba el miedo a los
 * testigos de la caída**. O sea que te mordían distinto según el golpe viniera
 * del reloj del mundo o de tu propio cliente, y caerte delante de todo el
 * pueblo no te costaba nada si el que te tumbó fue el tick. Es exactamente el
 * modo de falla que la extracción de `pelear()` vino a cerrar, sobreviviendo en
 * el único lugar donde había quedado abierto.
 */
export async function recibirGolpe(args: {
  regionId: string
  tick: number
  player: { id: string; name: string; place_id: string | null }
  /** El uuid de la amenaza. Si no viene, la primera viva donde está parado. */
  threatId?: string | null
  /** Sumidero de eventos, igual que en `pelear()`. El tick junta los suyos y
   *  los inserta todos juntos al final; la web no tiene ese final, así que si
   *  no viene se escribe acá. */
  ev?: (e: EventoPelea) => void | Promise<void>
  /**
   * ¿Ya se contó esta herida en este tick? Va de la mano de `ev`: el corte de
   * ruido de abajo mira la tabla `events`, y lo que el que llama todavía tiene
   * en un buffer sin insertar no está en la tabla. Quien buferea contesta esta
   * pregunta; quien escribe directo no la pasa y alcanza con la consulta.
   */
  yaEnEsteTick?: (kind: string, playerName: string, threatKind: string) => boolean
}): Promise<Herida> {
  const { regionId, tick, player, threatId, ev } = args

  const { data: estado } = await db.from('players')
    .select('health, downed_at_tick').eq('id', player.id).maybeSingle()
  if (!estado) return { ok: false, health: 0, caido: false, porque: 'no existe' }

  // Al caído no se le pega. No es piedad: sin esto, un cliente con un bicho
  // pegando cada medio segundo escribe una caída por golpe y el director
  // recibe cuarenta veces la misma noticia. Caer pasa una sola vez, y de ahí
  // sólo se sale levantándose.
  if (estado.downed_at_tick !== null || estado.health <= 0) {
    return { ok: false, health: estado.health, caido: true, porque: 'ya está caído' }
  }

  // Mismo cuidado que en pelear(): sin id y sin lugar hay que cortar antes de
  // la query, porque mandarle '' a una columna uuid no devuelve vacío, revienta.
  const nada = { ok: false, health: estado.health, caido: false, porque: 'no hay nada que te pegue acá' }
  if (!threatId && !player.place_id) return nada

  let q = db.from('threats')
    .select('id, kind, nombre, place_id')
    .eq('region_id', regionId).eq('alive', true)
  q = threatId ? q.eq('id', threatId) : q.eq('place_id', player.place_id!)
  const { data: bicho } = await q.limit(1).maybeSingle()
  if (!bicho) return nada

  /** Igual que en `pelear()`, y por el mismo motivo. Acá pesa más todavía:
   *  éste es el evento donde el bicho es el SUJETO de la frase, así que un
   *  `kind` de treinta palabras arranca la oración y no se entiende quién
   *  hizo qué hasta la mitad. */
  const nom = bicho.nombre ?? bicho.kind

  // El mismo daño que pega el jugador a mano limpia. Que muerda parecido a
  // como pegás vos es lo que hace que un bicho sea un problema y no un
  // adorno: seis o siete golpes y estás en el piso.
  const danio = 8 + roll(8)
  const vida = Math.max(0, estado.health - danio)
  const caido = vida === 0

  await db.from('players')
    .update({ health: vida, ...(caido ? { downed_at_tick: tick } : {}) })
    .eq('id', player.id)

  // La herida se escribe una vez por día de mundo y por bicho; la caída,
  // siempre. Un cliente en el que el bicho muerde cada dos segundos genera
  // ocho golpes en veinte segundos reales, todos dentro del mismo tick, y sin
  // este corte el director recibe ocho veces la misma línea y la crónica se
  // vuelve una planilla. Lo que cambió es la vida —y esa sí se escribe golpe a
  // golpe en `players`, que es el estado del mundo—; la noticia es que algo lo
  // agarró en el sotobosque, y esa noticia es una sola.
  const yaContado = caido ? false
    // `nom` y no `kind`: tiene que ser la MISMA clave que la del `detail` de
    // acá abajo, o la deduplicación mira una cosa y escribe otra.
    : (args.yaEnEsteTick?.('herida', player.name, nom) ?? false)
      || !!(await db.from('events')
        .select('id').eq('region_id', regionId).eq('tick', tick).eq('kind', 'herida')
        .contains('detail', { player: player.name, threat: nom })
        .limit(1).maybeSingle()).data

  if (!yaContado) {
    const lugar = await nombreDeLugar(bicho.place_id)
    const evento: EventoPelea = {
      kind: caido ? 'caida' : 'herida',
      place_id: bicho.place_id,
      // Éste es el que se leyó al revés en producción (ticks 28 y 29): «Los del
      // Sotobosque le entró a Prueba3D en El Sotobosque, y sigue en pie» —el
      // que seguía en pie era Prueba3D, que aguantó, y el director lo narró
      // como que la amenaza seguía en pie mientras en la misma crónica decía
      // que al jugador lo habían tumbado. Se contradijo solo. El sujeto se
      // nombra, con la misma fórmula que el golpe de ida.
      summary: caido
        ? `${nom} tumbó a ${player.name}${lugar ? ` en ${lugar}` : ''}.`
        : `${nom} le entró a ${player.name}${lugar ? ` en ${lugar}` : ''}, pero ${player.name} no cayó.`,
      detail: { player: player.name, threat: nom },
    }
    if (ev) await ev(evento)
    else await db.from('events').insert({ region_id: regionId, tick, ...evento })
  }

  // Caer delante de gente cuesta, y cuesta en el eje que corresponde. Matar un
  // bicho sube el aprecio y el miedo (arriba, en pelear); que te tumben no te
  // hace querer menos —nadie te aprecia menos por perder— pero sí te hace
  // menos temible. Y en un mundo donde lo que te protege no es una regla sino
  // que la gente no se anime, perder miedo ajeno es perder defensa de verdad.
  // Sólo en la transición: la herida la ven y se olvida, la caída se cuenta.
  if (caido) {
    const testigos = (await db.from('people')
      .select('id, name, place_id').eq('region_id', regionId).eq('alive', true)
      .eq('place_id', bicho.place_id)).data ?? []
    for (const t of testigos) {
      // Tercera persona y con los dos nombres: decía «vi caer a Fulano acá» y
      // esa fila la copia tal cual el chusmerío del tick a la cabeza de otro,
      // que no estaba. Después dialogo.ts se la hace decir en primera persona
      // y el testigo se multiplica solo. Ver el comentario de recordar().
      await recordar(t.id, player, `${nom} tumbó a ${player.name} acá`, tick)
      await tocarVinculo(t, player, { feared: -6 })
    }
  }

  return { ok: true, health: vida, caido }
}

/**
 * Levantarse. O sea: qué significa caer, que es la decisión y no el código.
 *
 * En el cliente te levantabas solo a los 2,4 segundos, que es lo mismo que no
 * haber caído nunca. Y la salida fácil —un temporizador más largo— está
 * prohibida por las bases: nada puede costarte tiempo de juego, se sale por
 * contenido y nunca por reloj. Si entrás y estás esperando a que se te cure
 * una barra, el juego te castigó por conectarte.
 *
 * Así que caer cuesta las dos únicas cosas que se pueden cobrar sin romper
 * nada, y ninguna de las dos es tiempo:
 *
 *   · La posición. Te levantás en la aldea, no donde caíste. Volver al bosque
 *     es caminarlo de nuevo, y como las distancias se sienten, eso es un
 *     costo real que igual se juega: mientras volvés, estás adentro del juego.
 *   · La cara. Los que te vieron caer se acuerdan y te temen un poco menos.
 *     Eso se cobra arriba, en recibirGolpe, que es cuando pasa.
 *
 * Lo que no cuesta es saber. Perder no te devuelve a cero como persona, sólo
 * como posición: te levantás lejos y con menos reputación, pero seguís
 * sabiendo forjar y seguís conociendo a la gente que conocías.
 *
 * Lo que todavía NO hace es dejarte las cosas tiradas donde caíste, que sería
 * lo más coherente con que acá nada es inviolable. Falta la otra mitad del
 * gesto: no existe manera de levantar un objeto del suelo, así que hoy dejarlo
 * tirado es destruirlo — y un objeto destruido es un saber que alguien tuvo
 * que tener y una escasez que el mundo se come sin que nadie la haya ganado.
 * El día que exista el verbo para agarrar cosas del piso, el drop entra acá y
 * son dos líneas: los objetos pasan a holder_kind 'place' en el lugar de la
 * caída, que es lo que la tabla ya sabe hacer.
 */
export async function levantarse(args: {
  regionId: string
  tick: number
  player: { id: string; name: string; place_id: string | null }
}): Promise<Levantada> {
  const { regionId, tick, player } = args

  const { data: estado } = await db.from('players')
    .select('health, downed_at_tick, place_id').eq('id', player.id).maybeSingle()
  if (!estado) return { ok: false, health: 0, lugar: '' }

  // El que está de pie no se "levanta". Sin este corte, levantarse sería una
  // cura completa y un viaje gratis a la aldea a pedido, que es teletransporte
  // con otro nombre — y el teletransporte libre vacía de sentido las distancias.
  if (estado.downed_at_tick === null && estado.health > 0) {
    const parado = estado.place_id
      ? (await db.from('places').select('slug').eq('id', estado.place_id).maybeSingle()).data
      : null
    return { ok: false, health: estado.health, lugar: parado?.slug ?? '' }
  }

  const { data: aldea } = await db.from('places')
    .select('id, slug, name').eq('region_id', regionId).eq('slug', 'aldea')
    .limit(1).maybeSingle()
  if (!aldea) return { ok: false, health: estado.health, lugar: '' }

  const dondeCayo = await nombreDeLugar(estado.place_id)

  await db.from('players')
    .update({ health: 100, downed_at_tick: null, place_id: aldea.id })
    .eq('id', player.id)

  // Caer y volver es una historia chica, y las chicas son las que hacen que un
  // valle se sienta habitado. Que diga de dónde lo trajeron le da al director
  // el gancho: alguien estuvo tirado en la ruina y amaneció en el pueblo.
  await db.from('events').insert({
    region_id: regionId, tick,
    kind: 'levantada', place_id: aldea.id,
    summary: dondeCayo && dondeCayo !== aldea.name
      ? `${player.name} se levantó en ${aldea.name}; había quedado tirado en ${dondeCayo}.`
      : `${player.name} se levantó en ${aldea.name}.`,
    detail: { player: player.name, place: aldea.name, from: dondeCayo },
  })

  // El slug y no el nombre: es con lo que el cliente ubica al personaje, el
  // mismo que viaja en POST /estoy.
  return { ok: true, health: 100, lugar: aldea.slug }
}

/** Los NPCs recuerdan lo que VIERON. Vive acá y no en tick.ts para que el
 *  combate inmediato deje la misma huella que el combate del tick.
 *
 *  **Siempre en tercera persona y con los dos nombres puestos.** No es estilo:
 *  un recuerdo VIAJA. El chusmerío del tick copia la fila tal cual a la cabeza
 *  del que la escuchó, y `dialogo.ts` se la hace decir en primera persona. Con
 *  «vi caer a Pedro acá» guardado, alguien que no estaba ahí queda de testigo
 *  de algo que no vio. En tercera persona el recuerdo sobrevive a cualquier
 *  cantidad de saltos: «Los del Sotobosque tumbó a Pedro» sigue siendo verdad
 *  lo cuente quien lo cuente. **Es la única, y hasta hoy `tick.ts` tenía otra
 *  igual con el mismo comentario al lado.** */
export async function recordar(
  personId: string, player: { id: string }, what: string, tick: number,
) {
  await db.from('memories').insert({
    person_id: personId, about_kind: 'player', about_id: player.id, what, tick,
  })
}

/**
 * Mueve el vínculo de un NPC hacia un JUGADOR. La escritura y nada más.
 *
 * **Es la única que escribe `bonds` hacia un jugador en todo el servidor**, y
 * eso también era una copia: `tick.ts` tenía la suya, idéntica salvo que le
 * faltaba el `.limit(1)` de acá — sin él, `maybeSingle()` da error cuando hay
 * más de una fila y el vínculo no se mueve en silencio, que es el mismo modo
 * de falla que ya se pagó dos veces en este proyecto.
 *
 * Devuelve el antes y el después del aprecio porque quien llama a veces tiene
 * algo que decir cuando se cruza un escalón —`tick.ts` emite ahí su evento
 * `confianza`— y esa decisión no es de este archivo: acá se escribe el estado,
 * no se narra.
 */
export async function tocarVinculo(
  person: { id: string },
  player: { id: string },
  delta: { valued?: number; feared?: number },
): Promise<{ antes: number; ahora: number }> {
  const { data: actual } = await db
    .from('bonds').select('id, valued, feared')
    .eq('person_id', person.id).eq('toward_id', player.id).limit(1).maybeSingle()
  const clamp = (n: number) => Math.max(-100, Math.min(100, n))
  const antes = actual?.valued ?? 0
  const ahora = clamp(antes + (delta.valued ?? 0))
  if (actual) {
    await db.from('bonds').update({
      valued: ahora,
      feared: clamp(actual.feared + (delta.feared ?? 0)),
    }).eq('id', actual.id)
  } else {
    await db.from('bonds').insert({
      person_id: person.id, toward_kind: 'player', toward_id: player.id,
      valued: ahora, feared: clamp(delta.feared ?? 0),
    })
  }
  return { antes, ahora }
}
