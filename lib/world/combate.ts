/**
 * Un golpe. La única cosa del mundo que no espera al tick.
 *
 * Todo lo demás es lento a propósito —un tick es un día y el cron corre uno
 * por hora— pero el combate no sobrevive a esa latencia: el jugador aprieta,
 * no pasa nada durante una hora, y vuelve a creer que los bichos son teatro
 * del cliente. Esa era exactamente la queja. Así que pelear se resuelve en el
 * momento, en el servidor, y deja su rastro en `events` como cualquier otra
 * cosa que pasó.
 *
 * No rompe ningún invariante: los invariantes dicen que la simulación no usa
 * IA y que el director no escribe estado, no que toda acción tenga que pasar
 * por el tick. **Este archivo lo va a importar `tick.ts`, así que acá no entra
 * el SDK de Anthropic — ni directo ni de rebote.**
 */
import { db } from '../db.js'

const roll = (max: number) => Math.floor(Math.random() * max)

/** Sólo estas dos cortan. Que un arma cambie el resultado es medio juego: el
 *  arma existe porque alguien supo hacerla, y si ese alguien se muere sin
 *  enseñarle a nadie, el valle vuelve a pelear a mano limpia para siempre. */
const ARMAS = ['hoja templada', 'filo de agua']

export type EventoPelea = {
  kind: string
  place_id: string | null
  summary: string
  detail: Record<string, unknown>
}

export type Golpe =
  | { ok: false; porque: string }
  | { ok: true; danio: number; health: number; muerta: boolean; arma: string | null }

export async function pelear(args: {
  regionId: string
  tick: number
  player: { id: string; name: string; place_id: string | null }
  /** El uuid de la amenaza. Si no viene, la primera viva donde está parado. */
  threatId?: string | null
  /** Sumidero de eventos. El tick los junta y los inserta todos juntos al
   *  final; la web no tiene ese final, así que si no viene se escribe acá. */
  ev?: (e: EventoPelea) => void
}): Promise<Golpe> {
  const { regionId, tick, player, threatId, ev } = args

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

  const armas = (await db.from('objects')
    .select('kind, quality, made_by')
    .eq('holder_kind', 'player').eq('holder_id', player.id)).data ?? []
  const arma = armas
    .filter((o) => ARMAS.includes(o.kind))
    .sort((a, b) => b.quality - a.quality)[0]

  const danio = 8 + roll(8) + Math.floor((arma?.quality ?? 0) / 6)
  const restante = Math.max(0, bicho.health - danio)

  const emitir = async (e: EventoPelea) => {
    if (ev) return ev(e)
    await db.from('events').insert({ region_id: regionId, tick, ...e })
  }

  if (restante > 0) {
    await db.from('threats').update({ health: restante }).eq('id', bicho.id)
    await emitir({
      kind: 'pelea', place_id: bicho.place_id,
      summary: arma
        ? `${player.name} le entró a ${bicho.kind} con ${arma.kind}, y sigue en pie.`
        : `${player.name} le entró a ${bicho.kind} a mano limpia, y sigue en pie.`,
      detail: { player: player.name, threat: bicho.kind, weapon: arma?.kind ?? null },
    })
    return { ok: true, danio, health: restante, muerta: false, arma: arma?.kind ?? null }
  }

  await db.from('threats')
    .update({ alive: false, health: 0, killed_by: player.name, killed_tick: tick })
    .eq('id', bicho.id)
  await emitir({
    kind: 'amenaza_muerta', place_id: bicho.place_id,
    summary: arma
      ? `${player.name} mató a ${bicho.kind} con ${arma.kind}${arma.made_by && arma.made_by !== player.name ? `, que había hecho ${arma.made_by}` : ''}.`
      : `${player.name} mató a ${bicho.kind} sin nada en las manos.`,
    detail: { player: player.name, threat: bicho.kind, weapon: arma?.kind ?? null },
  })

  // Lo ven, y no todos lo leen igual: al que te teme le sube el miedo, no el
  // aprecio. Dos ejes, no una barra. Los testigos son los del lugar donde
  // cayó el bicho, no donde está parado el jugador: pueden diferir si peleó
  // por id contra algo de otro lado.
  const testigos = (await db.from('people')
    .select('id').eq('region_id', regionId).eq('alive', true)
    .eq('place_id', bicho.place_id)).data ?? []
  for (const t of testigos) {
    await recordar(t.id, player.id, `${player.name} mató a ${bicho.kind} acá`, tick)
    await tocarVinculo(t.id, player.id, { valued: 8, feared: 5 })
  }

  return { ok: true, danio, health: 0, muerta: true, arma: arma?.kind ?? null }
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
 */
export async function recibirGolpe(args: {
  regionId: string
  tick: number
  player: { id: string; name: string; place_id: string | null }
  /** El uuid de la amenaza. Si no viene, la primera viva donde está parado. */
  threatId?: string | null
}): Promise<Herida> {
  const { regionId, tick, player, threatId } = args

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
    .select('id, kind, place_id')
    .eq('region_id', regionId).eq('alive', true)
  q = threatId ? q.eq('id', threatId) : q.eq('place_id', player.place_id!)
  const { data: bicho } = await q.limit(1).maybeSingle()
  if (!bicho) return nada

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
  const yaContado = caido ? null : (await db.from('events')
    .select('id').eq('region_id', regionId).eq('tick', tick).eq('kind', 'herida')
    .contains('detail', { player: player.name, threat: bicho.kind })
    .limit(1).maybeSingle()).data

  if (!yaContado) {
    const lugar = await nombreDeLugar(bicho.place_id)
    await db.from('events').insert({
      region_id: regionId, tick,
      kind: caido ? 'caida' : 'herida',
      place_id: bicho.place_id,
      summary: caido
        ? `${bicho.kind} tumbó a ${player.name}${lugar ? ` en ${lugar}` : ''}.`
        : `${bicho.kind} le entró a ${player.name}${lugar ? ` en ${lugar}` : ''}, y sigue en pie.`,
      detail: { player: player.name, threat: bicho.kind },
    })
  }

  // Caer delante de gente cuesta, y cuesta en el eje que corresponde. Matar un
  // bicho sube el aprecio y el miedo (arriba, en pelear); que te tumben no te
  // hace querer menos —nadie te aprecia menos por perder— pero sí te hace
  // menos temible. Y en un mundo donde lo que te protege no es una regla sino
  // que la gente no se anime, perder miedo ajeno es perder defensa de verdad.
  // Sólo en la transición: la herida la ven y se olvida, la caída se cuenta.
  if (caido) {
    const testigos = (await db.from('people')
      .select('id').eq('region_id', regionId).eq('alive', true)
      .eq('place_id', bicho.place_id)).data ?? []
    for (const t of testigos) {
      await recordar(t.id, player.id, `vi caer a ${player.name} acá, lo tumbó ${bicho.kind}`, tick)
      await tocarVinculo(t.id, player.id, { feared: -6 })
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
 *  combate inmediato deje la misma huella que el combate del tick. */
export async function recordar(
  personId: string, playerId: string, what: string, tick: number,
) {
  await db.from('memories').insert({
    person_id: personId, about_kind: 'player', about_id: playerId, what, tick,
  })
}

export async function tocarVinculo(
  personId: string, playerId: string, delta: { valued?: number; feared?: number },
) {
  const { data: actual } = await db
    .from('bonds').select('id, valued, feared')
    .eq('person_id', personId).eq('toward_id', playerId).limit(1).maybeSingle()
  const clamp = (n: number) => Math.max(-100, Math.min(100, n))
  if (actual) {
    await db.from('bonds').update({
      valued: clamp(actual.valued + (delta.valued ?? 0)),
      feared: clamp(actual.feared + (delta.feared ?? 0)),
    }).eq('id', actual.id)
  } else {
    await db.from('bonds').insert({
      person_id: personId, toward_kind: 'player', toward_id: playerId,
      valued: clamp(delta.valued ?? 0), feared: clamp(delta.feared ?? 0),
    })
  }
}
