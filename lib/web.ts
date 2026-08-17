/**
 * La web. Un archivo, sin framework, sin login.
 *
 *   pnpm web        →  http://localhost:3210
 *
 * Identidad por URL secreta: cada jugador tiene un token de 32 hex y esa URL
 * es su identidad. Nadie puede entrar como otro sin tener su link. Para cuatro
 * amigos alcanza; construir login sería el primer desperdicio del proyecto.
 */
import { createServer } from 'node:http'
import { db, getRegion } from './db.js'
import { step, resolverAcciones } from './world/tick.js'
import { narrate, type Cronica } from './world/director.js'
import { hablarCon } from './world/dialogo.js'
import { pelear, recibirGolpe, levantarse } from './world/combate.js'
import { escalonDe, elegirSaludo } from './world/saludos.js'
import { preparar, lanzar, grimorioDe, marcasDe, estaQuieta, loQueLleva, RUNAS } from './world/magia.js'
// Los umbrales y cómo se dicen en palabras viven en tick.ts, que es quien los
// aplica. Importarlos y no copiarlos no es prolijidad: la copia que había acá
// decía "ya confía en vos, pedile que te enseñe" con 10 de aprecio, cuando el
// umbral real había pasado a 35. O sea, el juego mandaba a hacer algo que iba
// a fallar. Un tutorial que miente es peor que ninguno.
import { UMBRAL_ENCARGO, UMBRAL_ENSENAR, comoTeVe, rutinaDe } from './world/tick.js'
import { landing } from './landing.js'

const PORT = Number(process.env.PORT ?? 3210)

/**
 * Una vuelta del sol: seis horas reales, un día del valle.
 *
 * Es **una** constante para dos cosas que no pueden separarse: la hora que ve
 * el cliente (`momento_del_dia`) y cuándo se cierra el día (`latir()`). Si el
 * sol da una vuelta cada seis horas y el contador de días avanza a otro ritmo,
 * el valle tiene cuatro amaneceres por día o cuatro días por amanecer, y la
 * fase de la luna —que según `DISENO.md` §7.3 es cómo sabés qué día va el
 * valle sin abrir un menú— deja de querer decir nada. El cliente tiene su
 * copia (`DIA_REAL := 21600.0` en `ciclo.gd`); ésta es la del servidor, y ya
 * cambió una vez de 1 hora a 6.
 */
const DIA_REAL_MS = 21_600_000

/** En qué vuelta del sol cae un instante. Cuenta desde la época Unix, que
 *  empieza a medianoche UTC, así que los bordes caen a las 00, 06, 12 y 18
 *  UTC — exactamente donde dispara el cron de `vercel.json`. */
const bloqueDelSol = (ms: number) => Math.floor(ms / DIA_REAL_MS)

/** Bloques ya cubiertos, por región, en este proceso.
 *
 *  Es memoria de proceso y por eso sólo sirve para **no** latir: en Vercel hay
 *  varias lambdas y ninguna ve la de al lado, así que un caché que habilitara
 *  ticks sería un desastre. Que suprima de más no cuesta nada (el cron sigue
 *  ahí) y evita una consulta por golpe de espada. */
const bloqueCubierto = new Map<string, number>()

/**
 * El latido del mundo cuando lo empuja alguien jugando.
 *
 * EL PROBLEMA
 *
 * Había un solo `await step()` en todo este archivo y estaba en `POST /act`.
 * El cliente 3D pelea y camina; casi no usa `/act`. Una sesión entera podía no
 * generar un solo tick, y el que limpiaba las tres amenazas del valle se
 * quedaba sin nada que pelear aunque la probabilidad de reposición se hubiera
 * subido a 60 % por vacante. La recalibración del ritmo era invisible justo
 * para el que juega.
 *
 * POR QUÉ NO ES UN `step()` POR ACCIÓN
 *
 * Porque eso es la idea muerta de `DISENO.md` §17 —*"tiempo 4× más rápido para
 * el conectado"*— entrando por la puerta de atrás: si cada golpe corre un día
 * del valle, jugar más **es** más tiempo de mundo, y el que se sienta a
 * machacar envejece el valle de los demás. No es hipotético: medido el 17 de
 * agosto, `valle-primero` corrió sus **28 ticks en 4 h 21 min**, con pares de
 * ticks a menos de un minuto uno del otro. Veintiocho días de valle en una
 * tarde de desarrollo, y el cron sólo podía explicar uno.
 *
 * LO QUE HACE, ENTONCES
 *
 * El mundo avanza **un día por vuelta del sol y nada más**, lo pida quien lo
 * pida. La condición no es "pasaron seis horas desde el último tick" sino
 * "estamos en un bloque de sol posterior al del último tick": así el tick que
 * dispara un jugador cae en el mismo instante en que habría caído el del cron,
 * el contador de días no se despega del cielo, y cron y jugador no pueden
 * sumar dos ticks en el mismo día.
 *
 * CONTRA §7.3, QUE PIDE DOS RELOJES
 *
 * Son exactamente los dos: el del mundo pasa a depender **sólo del tiempo real
 * transcurrido** (esta función), y cuánto se simula adentro de cada tick sigue
 * dependiendo de si hay alguien (el `pace` de `tick.ts`, que baja las agendas a
 * un cuarto en un valle vacío). Estar conectado cambia **qué** pasa en el día,
 * no **cuántos** días pasan. Nadie gana por estar sentado ahí, que es la frase
 * textual de §7.3.
 *
 * Y lo que sí queda sin resolver, dicho para que no se lo tome por resuelto:
 * el valle sigue tardando hasta seis horas en reponer una amenaza. Eso no lo
 * arregla latir más seguido —lo arregla que la reposición mire el reloj de
 * pared en vez del contador de ticks—, y eso vive en `tick.ts`.
 */
async function latir(region: { id: string; tick: number }): Promise<boolean> {
  const bloque = bloqueDelSol(Date.now())
  if (bloqueCubierto.get(region.id) === bloque) return false

  const { data: ultimo } = await db.from('ticks')
    .select('at').eq('region_id', region.id)
    .order('tick', { ascending: false }).limit(1).maybeSingle()
  if (ultimo && bloqueDelSol(new Date(ultimo.at).getTime()) >= bloque) {
    bloqueCubierto.set(region.id, bloque)
    return false
  }

  // El reclamo va ANTES de correr el tick y es lo que lo vuelve atómico: la
  // clave primaria de `ticks` es (region_id, tick), así que de dos lambdas que
  // quieran el mismo día una sola se lo lleva y la otra se entera acá, no
  // después de haber corrido un tick de más. Y de paso deja anotado el origen
  // sin una segunda escritura: el trigger de la base anota 'cron' para todo lo
  // que nadie reclamó, y esta fila ya está.
  const { data: mio } = await db.from('ticks')
    .upsert({ region_id: region.id, tick: region.tick + 1, origin: 'jugador' },
      { onConflict: 'region_id,tick', ignoreDuplicates: true })
    .select('tick')
  bloqueCubierto.set(region.id, bloque)
  if (!mio?.length) return false

  // Se espera, no se dispara y se olvida: en serverless lo que queda corriendo
  // después de la respuesta se muere a mitad de camino, y un `step()` cortado
  // deja acciones resueltas sin los eventos que las cuentan. Cuesta un tirón de
  // un par de segundos una vez cada seis horas.
  await step()
  return true
}

/**
 * El aviso de que te ganaste a alguien, por el camino de la web.
 *
 * Es el gemelo del `avisarConfianza()` de `tick.ts` y **tiene que decir
 * exactamente lo mismo**: el mismo `kind`, el mismo texto, el mismo `detail` y
 * los mismos dos umbrales. La gracia de que `pelear()` sea una sola función es
 * que el mismo muerto produzca el mismo hecho venga por donde venga, y hasta
 * hoy no lo hacía — matar un bicho por `POST /act` avisaba «Marta empezó a
 * confiar en Fulano» y matarlo desde el cliente 3D, que es el camino principal
 * del juego, no avisaba nada. Con +8 de aprecio por muerto, desde cero se cruza
 * `UMBRAL_ENCARGO` siempre, así que el aviso que faltaba no era un caso raro:
 * era el primero que le pasa a cualquiera que pelee.
 *
 * Y no es un capricho de simetría: `DISENO.md` §9.3 pide que la reputación sea
 * **legible**. Si te ganaste a alguien y el juego no te lo dice, subir la
 * confianza es superstición — el mismo motivo por el que nunca te enterás de
 * que un pueblo te odia chocándote contra una puerta cerrada.
 *
 * La única diferencia con el del tick es dónde cae el evento, y es la misma que
 * `combate.ts` ya resuelve para los suyos con su `emitir()`: el tick junta todo
 * en un sumidero `ev` y lo inserta al cerrar el día; acá no hay ese final, así
 * que se escribe en el momento. El `tick` que se le pasa es `region.tick + 1`
 * por lo mismo que el resto de este archivo — ver el comentario de
 * `POST /pelear`.
 *
 * Se emite en la TRANSICIÓN y nada más: cruzar el escalón, no cada vez que sube
 * el aprecio. Los umbrales se importan de `tick.ts` y no se copian, por lo que
 * dice el comentario del import.
 */
async function avisarConfianza(
  regionId: string, tick: number,
  person: { name: string; place_id: string | null },
  player: { name: string },
  antes: number, ahora: number,
) {
  const cruzo = (u: number) => antes < u && ahora >= u
  const e = cruzo(UMBRAL_ENSENAR)
    ? {
        summary: `${person.name} ya le confiaría a ${player.name} lo que sabe hacer.`,
        detail: { person: person.name, player: player.name, abre: 'aprender' },
      }
    : cruzo(UMBRAL_ENCARGO)
      ? {
          summary: `${person.name} empezó a confiar en ${player.name}: ya le pediría un favor.`,
          detail: { person: person.name, player: player.name, abre: 'encargarse' },
        }
      : null
  if (!e) return
  await db.from('events').insert({
    region_id: regionId, tick, kind: 'confianza', place_id: person.place_id, ...e,
  })
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

const CSS = `
  :root { --bg:#14181a; --card:#1c2224; --ink:#dde3de; --soft:#98a29c; --line:#2c3538; --accent:#6fb99e; }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 "Iowan Old Style",Palatino,Georgia,serif;padding:32px 20px 80px}
  .wrap{max-width:720px;margin:0 auto}
  h1{font-size:26px;margin:0 0 4px;letter-spacing:-.01em}
  .sub{color:var(--soft);font-size:14px;margin:0 0 24px}
  .cronica{background:var(--card);border-top:2px solid var(--accent);padding:22px 24px;margin:0 0 24px;white-space:pre-wrap}
  .cronica.vacia{color:var(--soft);border-top-color:var(--line)}
  .meta{font:11px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--soft);margin:0 0 24px}
  .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px}
  form{display:contents}
  button{font:inherit;font-size:14px;background:var(--accent);color:#0f1416;border:0;padding:9px 16px;cursor:pointer}
  button.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
  button:hover{opacity:.88}
  select,input{font:inherit;font-size:14px;background:var(--bg);color:var(--ink);border:1px solid var(--line);padding:8px 10px}
  .sec{font:11px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--soft);
       border-bottom:1px solid var(--line);padding-bottom:8px;margin:32px 0 14px}
  .warn{background:#2e1f1e;border-left:3px solid #ce8b84;padding:12px 16px;margin:0 0 20px;font-size:14px}
  .intro{background:var(--card);border-left:3px solid var(--line);padding:16px 20px;margin:0 0 26px;font-size:14.5px;color:var(--soft)}
  .intro b{color:var(--ink);font-weight:600}
  .link{background:var(--card);border:1px dashed var(--line);padding:14px 16px;margin:0 0 24px;font:12px/1.6 ui-monospace,Menlo,monospace;word-break:break-all;color:var(--soft)}
  .link b{color:var(--accent);display:block;font-family:inherit;margin-bottom:6px}
  a{color:var(--accent)}
`

const page = (title: string, body: string) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${CSS}</style></head>
<body><div class="wrap">${body}</div></body></html>`

type Player = {
  id: string; name: string; place_id: string | null
  last_seen_tick: number; token: string
  health: number; downed_at_tick: number | null
}

async function ensurePlayer(name: string): Promise<{ region: Awaited<ReturnType<typeof getRegion>>; player: Player }> {
  const region = await getRegion()
  const { data: found } = await db.from('players')
    .select('id, name, place_id, last_seen_tick, token, health, downed_at_tick')
    .eq('region_id', region.id).ilike('name', name).maybeSingle()
  if (found) return { region, player: found as Player }

  const { data: aldea } = await db.from('places')
    .select('id').eq('region_id', region.id).eq('slug', 'aldea').single()
  const { data: nuevo, error } = await db.from('players')
    .insert({ region_id: region.id, name, place_id: aldea?.id, last_seen_tick: region.tick })
    .select('id, name, place_id, last_seen_tick, token, health, downed_at_tick').single()
  if (error || !nuevo) throw error
  await db.from('events').insert({
    region_id: region.id, tick: region.tick, kind: 'llegada', place_id: aldea?.id,
    summary: `${name} llegó al valle por el Camino del Norte.`, detail: { player: name },
  })
  return { region, player: nuevo as Player }
}

async function byToken(token: string) {
  const region = await getRegion()
  const { data } = await db.from('players')
    .select('id, name, place_id, last_seen_tick, token, health, downed_at_tick')
    .eq('region_id', region.id).eq('token', token).maybeSingle()
  return data ? { region, player: data as Player } : null
}

/**
 * Deja registrada en la base la segunda auditoría del director —la gente que
 * nombró sin ningún hecho que la ponga en escena— sobre la crónica que
 * `narrate()` acaba de insertar.
 *
 * Se hace desde acá y no desde el `insert` del director porque ese archivo no
 * se toca en esta tanda. La versión que corresponde es una línea más en el
 * insert (`unbacked_names: sinRespaldo`); cuando entre, esta función sobra y
 * hay que borrarla.
 *
 * Se apoya en un invariante que dejó cierto la migración
 * `20260817100000_cronicas_sin_respaldo`: todas las crónicas viejas quedaron
 * medidas por el backfill, así que la única fila con `unbacked_names` en null
 * es la que se acaba de escribir. Si no hay ninguna —porque el director cortó
 * por ventana vacía y no escribió— no toca nada, y la crónica queda en null,
 * que es lo que null significa: no medida.
 */
async function anotarSinRespaldo(playerId: string, c: Cronica) {
  if (!c.leidos) return
  const { data: fila } = await db.from('chronicles')
    .select('id').eq('player_id', playerId).is('unbacked_names', null)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (fila) {
    await db.from('chronicles').update({ unbacked_names: c.sinRespaldo }).eq('id', fila.id)
  }
}

async function renderPlayer(token: string, aviso?: string, recienCreado = false) {
  const found = await byToken(token)
  if (!found) return null
  const { region, player } = found

  const [places, people, sabe, ultima] = await Promise.all([
    db.from('places').select('id, slug, name').eq('region_id', region.id),
    db.from('people').select('id, name, trade, place_id').eq('region_id', region.id).eq('alive', true),
    db.from('knows').select('knowledge:knowledge_id (name)')
      .eq('holder_kind', 'player').eq('holder_id', player.id),
    db.from('chronicles').select('text, to_tick').eq('player_id', player.id)
      .order('to_tick', { ascending: false }).limit(1).maybeSingle(),
  ])

  const lugar = places.data?.find((p) => p.id === player.place_id)
  const aqui = (people.data ?? []).filter((p) => p.place_id === player.place_id)
  const saberes = (sabe.data ?? [])
    .map((k) => (k.knowledge as unknown as { name: string } | null)?.name)
    .filter((n): n is string => Boolean(n))
  const hayNovedades = region.tick > player.last_seen_tick
  const base = `/j/${player.token}`

  const opts = (xs: { v: string; t: string }[]) =>
    xs.map((x) => `<option value="${esc(x.v)}">${esc(x.t)}</option>`).join('')
  const accion = (verb: string, label: string, select?: string) => `
    <div class="row"><form method="post" action="${base}/act">
      <input type="hidden" name="verb" value="${verb}">${select ?? ''}
      <button class="ghost">${esc(label)}</button>
    </form></div>`

  return page(`${player.name} — Saber Escaso`, `
    <h1>${esc(player.name)}</h1>
    <p class="sub">Estás en ${esc(lugar?.name ?? 'algún lado')}. ${
      saberes.length ? 'Sabes ' + saberes.map(esc).join(', ') + '.' : 'Todavía no sabes ningún oficio.'
    }</p>

    ${recienCreado ? `<div class="link"><b>⚠ Este link es tu personaje. Guardalo.</b>
      Cualquiera que lo tenga entra como tú, y sin él no puedes volver a entrar.</div>` : ''}

    <div class="intro">
      <b>Qué es esto.</b> Un valle donde la gente vive su vida sin ti: trabajan,
      aprenden oficios, se deben plata, se mueren. Entras cuando quieres y alguien
      te cuenta qué pasó mientras no estabas.
      <br><br>
      <b>Lo único que importa acá es el saber.</b> Cada oficio y cada runa vive en
      la cabeza de alguien. Se aprende quedándose cerca de quien lo tiene, y si esa
      persona se muere sin habérselo enseñado a nadie, <b>se pierde del valle para
      siempre</b>.
      <br><br>
      Empieza hablando con la gente. Nadie te enseña nada hasta que confíe en ti.
    </div>

    ${aviso ? `<div class="warn">${esc(aviso)}</div>` : ''}

    ${ultima.data
      ? `<div class="cronica">${esc(ultima.data.text)}</div>`
      : `<div class="cronica vacia">Llegaste recién. Tocá «¿Qué pasó?» y alguien te pone al día.</div>`}

    <div class="row">
      <form method="post" action="${base}/look">
        <button>${hayNovedades ? '¿Qué pasó?' : 'Volver a mirar'}</button>
      </form>
      <!-- Iba a /mapa, que era el valle en el navegador y ya no existe. El
           valle se ve bajando el juego, y de eso habla la portada: mando ahí
           en vez de repetir acá el link de la descarga, que se mueve con cada
           release. -->
      <a href="/"><button type="button" class="ghost">Bajar el juego</button></a>
    </div>
    <p class="meta">${hayNovedades
      ? `pasó ${region.tick - player.last_seen_tick === 1 ? 'un día' : `${region.tick - player.last_seen_tick} días`} desde que miraste`
      : 'nada nuevo · en el valle pasa un día cada seis horas'}</p>

    <div class="sec">Qué hacés</div>
    <p class="sub" style="margin:-4px 0 14px">Elegís una cosa y se resuelve cuando cierra el día del valle. Avanza solo, estés o no.</p>
    ${accion('ir', 'Ir', `<select name="target">${opts(
      (places.data ?? []).filter((p) => p.id !== player.place_id).map((p) => ({ v: p.slug, t: p.name })))}</select>`)}
    ${accion('trabajar', 'Trabajar acá')}
    ${aqui.length ? accion('hablar', 'Hablar con', `<select name="target">${opts(
      aqui.map((p) => ({ v: p.name, t: `${p.name} (${p.trade})` })))}</select>`) : ''}
    ${aqui.length ? accion('aprender', 'Aprender de', `<select name="target">${opts(
      aqui.map((p) => ({ v: p.name, t: p.name })))}</select>`) : ''}
    ${aqui.length && saberes.length ? accion('ensenar', 'Enseñarle a', `<select name="target">${opts(
      aqui.map((p) => ({ v: p.name, t: p.name })))}</select>`) : ''}
    ${aqui.length === 0 ? '<p class="sub">No hay nadie acá.</p>' : ''}

    <div class="sec">Quién está acá</div>
    ${aqui.length
      ? aqui.map((p) => `<p class="sub" style="margin:0 0 6px">${esc(p.name)} — ${esc(p.trade)}</p>`).join('')
      : '<p class="sub">Nadie.</p>'}
  `)
}

const body = (req: import('node:http').IncomingMessage) =>
  new Promise<URLSearchParams>((resolve) => {
    let raw = ''
    req.on('data', (c) => { raw += c; if (raw.length > 1e5) req.destroy() })
    req.on('end', () => resolve(new URLSearchParams(raw)))
  })

export async function handler(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
) {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const parts = url.pathname.split('/').filter(Boolean)
  const send = (html: string, code = 200) => {
    res.writeHead(code, { 'content-type': 'text/html; charset=utf-8' }); res.end(html)
  }
  const json = (data: unknown) => {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(data))
  }
  const back = (token: string, aviso?: string, extra = '') => {
    res.writeHead(303, {
      location: `/j/${token}${extra}${aviso ? `?aviso=${encodeURIComponent(aviso)}` : ''}`,
    })
    res.end()
  }

  try {
    // La home es la landing del juego (lib/landing.ts). El formulario para
    // sacar un personaje vive ahora en /entrar, que es adonde apunta la
    // landing: al que llega de afuera hay que contarle qué es esto antes de
    // pedirle un nombre.
    if (url.pathname === '/') {
      return send(landing())
    }

    if (url.pathname === '/entrar' && !url.searchParams.get('name')) {
      const region = await getRegion()
      const { count } = await db.from('players')
        .select('*', { count: 'exact', head: true }).eq('region_id', region.id)
      return send(page('Entrar al valle', `
        <h1>Entrar al valle</h1>
        <p class="sub">${esc(region.name)} · día ${region.tick} · ${count ?? 0} personas andan por acá</p>
        <div class="intro">
          Elegí un nombre y te queda <b>un link privado</b>: ese link es tu
          personaje. Guardalo — nadie más puede entrar con él, y sin él no
          volvés a entrar. Va a servirte también para el juego que se baja.
        </div>
        <form method="get" action="/entrar"><div class="row">
          <input name="name" placeholder="tu nombre" required autofocus maxlength="24">
          <button>Entrar al valle</button>
        </div></form>
      `))
    }

    if (url.pathname === '/entrar') {
      const name = (url.searchParams.get('name') ?? '').trim().slice(0, 24)
      if (!name) { res.writeHead(303, { location: '/' }); return res.end() }
      const { player } = await ensurePlayer(name)
      return back(player.token, undefined, '?nuevo=1')
    }

    // Compatibilidad: los links viejos por nombre ya no sirven — eran públicos.
    if (parts[0] === 'p') {
      return send(page('Ese link ya no vale', `
        <h1>Ese link ya no vale</h1>
        <p class="sub">Ahora cada jugador tiene un link privado propio, para que nadie
        pueda entrar como otro. <a href="/">Entrá con tu nombre</a> y te damos el tuyo.</p>
      `), 410)
    }

    if (parts[0] === 'j' && parts[1]) {
      const token = parts[1]

      if (parts[2] === 'mundo') {
        const found = await byToken(token)
        if (!found) return send(page('No existe', '<h1>No existe</h1>'), 404)
        const { region, player } = found
        // Estoy adentro. Se manda sin esperar la respuesta: es un update de una
        // fila y no tiene por qué demorarle el mundo a nadie.
        void db.from('players')
          .update({ last_seen_at: new Date().toISOString() }).eq('id', player.id)
          .then(() => undefined)

        const [places, people, amenazas, objetos, saberes, vinculos, otros] = await Promise.all([
          db.from('places').select('id, slug, name, kind, description').eq('region_id', region.id),
          db.from('people').select('id, name, trade, place_id, teaches, saludos, home_place_id, jornada_desde, jornada_hasta').eq('region_id', region.id).eq('alive', true),
          // Las muertas quedan en la tabla porque el director las narra después
          // ("mató a X"), pero el cliente no tiene que plantar el cadáver otra vez.
          db.from('threats').select('id, kind, nombre, people_id, health, max_health, place_id')
            .eq('region_id', region.id).eq('alive', true),
          db.from('objects').select('kind, quality, made_by')
            .eq('holder_kind', 'player').eq('holder_id', player.id),
          db.from('knows')
            .select('destreza, veces, learned_from, knowledge:knowledge_id (name, kind, makes, makes_at, para_que)')
            .eq('holder_kind', 'player').eq('holder_id', player.id),
          db.from('bonds').select('person_id, valued, feared').eq('toward_id', player.id),
          // Los otros jugadores. Sin esto no hay multijugador: hay gente
          // compartiendo una base de datos. Va en la misma tanda que el resto
          // porque el cliente pide `/mundo` cada pocos segundos y un
          // round-trip suelto se paga en cada uno de esos pedidos.
          db.from('players').select('id, name, place_id, health, last_seen_at')
            .eq('region_id', region.id).neq('id', player.id),
        ])

        // El cliente ubica todo por slug — los uuid de la base no le dicen nada
        // y el nombre cambia si algún día traducimos el valle. Se resuelve acá
        // y no con un embed de PostgREST para no pagar un join por amenaza:
        // los places ya vinieron en la misma tanda.
        const slugDe = (id: string | null) => places.data?.find((p) => p.id === id)?.slug ?? ''

        return json({
          region: {
            name: region.name, tick: region.tick,
            // La hora del valle, en segundos dentro del día del valle.
            //
            // Un tick es un día y el mundo late una vez por vuelta del sol,
            // así que la hora del valle es cuánto va corrido el bloque en
            // curso. El módulo cae justo porque los bordes son las 00, 06, 12
            // y 18 UTC y la época Unix arranca a medianoche UTC.
            //
            // Es la MISMA constante que usa `latir()`: el cielo y el contador
            // de días no pueden ir cada uno por su lado.
            //
            // Sale de acá y no del reloj de cada máquina a propósito: dos
            // personas conectadas al mismo tiempo tienen que ver el mismo
            // atardecer.
            momento_del_dia: (Date.now() % DIA_REAL_MS) / 1000,
          },
          // La vida viaja. Antes el cliente llevaba su propia `vida_jugador`
          // local que bajaba en tiempo real y se reseteaba sola: vos les
          // pegabas en el mundo compartido y ellos te pegaban en tu máquina.
          // Era el invariante 4 roto justo en el tramo que existe para
          // arreglarlo.
          player: {
            name: player.name, place_id: player.place_id,
            health: player.health ?? 100, max_health: 100,
            caido: (player.health ?? 100) <= 0,
          },
          places: places.data ?? [],
          // Cada persona viene con cómo te trata. Es lo que contesta el
          // reclamo de que ya saben que estás y no dicen nada: al pasar cerca
          // levantan la vista y sueltan una línea.
          //
          // NO pasa por el modelo, a propósito. Tiene que aparecer en el mismo
          // cuadro en que te acercás; una llamada de 700 ms llegaría cuando ya
          // te fuiste, y saldría plata cada vez que alguien camina por la
          // aldea. Sale del vínculo, que es lo que de verdad determina cómo te
          // miran.
          // `rutinaDe` va AL FINAL y pisa `place_id` a propósito: la columna
          // dice dónde lo dejó su jornada, y lo que el jugador tiene que ver es
          // dónde está AHORA — que de noche es su casa. La simulación piensa en
          // días; esta consulta piensa en horas.
          people: (people.data ?? []).map((q) => ({
            ...q, saludos: undefined,
            ...actitud(q, vinculos.data ?? [], (saberes.data ?? []).length, region.tick, player.name),
            ...rutinaDe(q, places.data ?? []),
          })),
          // Qué hacer ahora. Es la diferencia entre un mundo y una demo
          // técnica: llegás, no conocés a nadie, no sabés qué hay, y sin esto
          // el juego te deja parado en un campo. NO lo escribe un modelo —
          // sale del estado, así que nunca te manda a hacer algo imposible.
          // Quién sos. Es lo que faltaba para el reclamo de "no hay stats":
          // los stats de este juego SÍ existen, pero son lo que sabés y cuánta
          // mano tenés en cada cosa — y eso vivía sólo en la base. Un sistema
          // que el jugador no puede ver es un sistema que no existe.
          vos: {
            nombre: player.name,
            saberes: (saberes.data ?? []).map((k) => {
              const c = (k as unknown as {
                knowledge: { name: string; kind: string; para_que: string | null } | null
              }).knowledge
              const d = (k as unknown as { destreza: number; veces: number; learned_from: string | null })
              return {
                nombre: c?.name ?? '?', tipo: c?.kind ?? '',
                // Para qué sirve. Es lo que faltaba: "sabés Destilado de raíz"
                // no le dice nada a nadie si no se dice qué te deja hacer.
                paraQue: c?.para_que ?? '',
                mano: mano(d.destreza), veces: d.veces,
                maestro: (people.data ?? []).find((q) => q.id === d.learned_from)?.name ?? null,
              }
            }),
            // Cómo te ve cada uno, en palabras. Nunca en números: un
            // porcentaje de confianza rompe la ilusión de que son personas.
            gente: (people.data ?? []).map((q) => ({
              nombre: q.name, trade: q.trade,
              comoTeVe: comoTeVe(vinculos.data?.find((v) => v.person_id === q.id)?.valued ?? 0),
              teme: (vinculos.data?.find((v) => v.person_id === q.id)?.feared ?? 0) >= 25,
            })),
          },
          // Las cicatrices que dejó la magia. Duran días, las ve todo el
          // mundo, y llevan el nombre del que las dejó: hay que poder pasar
          // por un claro que sigue ardiendo y saber quién lo prendió, aunque
          // esa persona ya no esté.
          marcas: await marcasDe(region.id, region.tick + 1),
          primeros_pasos: pasos({
            places: places.data ?? [],
          // Cada persona viene con cómo te trata. Es lo que contesta el
          // reclamo de que ya saben que estás y no dicen nada: al pasar cerca
          // levantan la vista y sueltan una línea.
          //
          // NO pasa por el modelo, a propósito. Tiene que aparecer en el mismo
          // cuadro en que te acercás; una llamada de 700 ms llegaría cuando ya
          // te fuiste, y saldría plata cada vez que alguien camina por la
          // aldea. Sale del vínculo, que es lo que de verdad determina cómo te
          // miran.
          // `rutinaDe` va AL FINAL y pisa `place_id` a propósito: la columna
          // dice dónde lo dejó su jornada, y lo que el jugador tiene que ver es
          // dónde está AHORA — que de noche es su casa. La simulación piensa en
          // días; esta consulta piensa en horas.
          people: (people.data ?? []).map((q) => ({
            ...q, saludos: undefined,
            ...actitud(q, vinculos.data ?? [], (saberes.data ?? []).length, region.tick, player.name),
            ...rutinaDe(q, places.data ?? []),
          })),
            amenazas: amenazas.data ?? [], objetos: objetos.data ?? [],
            saberes: saberes.data ?? [], vinculos: vinculos.data ?? [],
            player,
            // Lo que lleva colgado hoy. Es una consulta más en la ruta que el
            // cliente pega cada pocos segundos, y se banca porque es la MISMA
            // que ya hace `/grimorio`: dos filas por `holder_id`, sin join
            // pesado. Si algún día pesa, se cachea con el tick.
            colgadas: await loQueLleva({ kind: 'player', id: player.id }),
          }),
          // `nombre` no es adorno: los que no son humanos no son mobs, son
          // pueblos, y matar a alguien con nombre pesa distinto que matar a
          // "un merodeador".
          amenazas: (amenazas.data ?? []).map((a) => ({
            id: a.id, kind: a.kind, nombre: a.nombre ?? null,
            health: a.health, max_health: a.max_health,
            place_slug: slugDe(a.place_id),
          })),
          // Los otros, los de carne y hueso.
          //
          // La ventana es de un tick y eso no es "hace poco" en el sentido que
          // uno querría: un tick son seis horas reales, y `last_seen_tick` se
          // estampa con el tick del momento de la visita, así que `<= 1`
          // agarra a quien pasó entre hace 6 y hace 12 horas. Es mucho para
          // "está acá ahora", y se elige igual porque abajo de eso es peor:
          // con `<= 0` toda la gente que estaba jugando junta desaparece de
          // golpe cuando el cron cierra el tick, en la mitad de la sesión. La
          // presencia no se puede medir con un contador que avanza cada seis
          // horas; la arregla un `last_seen_at` de verdad (ver el informe).
          //
          // Lo que sí hace bien es sacar del valle al que no entra hace dos
          // días: ése no es presencia, es una fila en una tabla.
          // Noventa segundos: unos tres pings del cliente. Con el reloj de
          // pared la presencia deja de depender del largo del tick, que ya se
          // recalibró una vez y se va a volver a recalibrar.
          jugadores: (otros.data ?? [])
            .filter((p) => p.last_seen_at != null
              && Date.now() - new Date(p.last_seen_at).getTime() < 90_000)
            .map((p) => ({
              name: p.name,
              place_slug: slugDe(p.place_id),
              health: p.health ?? 100,
              caido: (p.health ?? 100) <= 0,
            })),
          // `made_by` es el nombre y no el id a propósito: el que lo forjó se
          // muere y el objeto tiene que seguir diciendo quién fue.
          objetos: objetos.data ?? [],
        })
      }

      if (req.method === 'POST' && parts[2] === 'act') {
        const f = await body(req)
        const found = await byToken(token)
        if (!found) return send(page('No existe', '<h1>No existe</h1>'), 404)
        await db.from('actions').insert({
          player_id: found.player.id, verb: f.get('verb'),
          target: f.get('target'), submitted_tick: found.region.tick,
        })
        // Acá había un `step()` sin condición, y era el agujero: una acción,
        // un día del valle. Apretar «Trabajar acá» seis veces envejecía el
        // valle seis días. El arreglo fue encolar y esperar al tick, y frenó
        // de más: la acción pasaba a tardar **hasta seis horas reales**, que
        // es lo que le pasaba al combate antes de sacarlo del tick (ver el
        // encabezado de `world/combate.ts`).
        //
        // Son dos cosas distintas y ahora se llaman por separado, que es lo
        // que pide `DISENO.md` §7.3:
        //
        //   · `resolverAcciones()` — SIEMPRE. Lo que el jugador hizo, pasa ya.
        //     No incrementa `regions.tick` ni corre agendas ni muerte.
        //   · `latir()` — sólo si cambió la vuelta del sol. El día del valle
        //     lo mueve el sol y nada más.
        //
        // El orden importa y es el mismo de `/pelear`: primero pasa la cosa,
        // después cierra el día en el que pasó. Al revés, el evento caería en
        // un día ya cerrado y el jugador no se enteraría de lo que hizo.
        //
        // `last_seen_at` se estampa porque este pedido ES la prueba de que
        // está adentro. Antes lo contestaba la acción sin resolver, y desde
        // que se resuelven en el acto ya no queda ninguna: sin esta línea, el
        // que juega por la web desaparecería de la presencia del tick.
        await db.from('players')
          .update({ last_seen_at: new Date().toISOString() }).eq('id', found.player.id)
        const resueltas = await resolverAcciones({
          region: found.region,
          // El último día CERRADO es `region.tick`; esto pasa durante el día
          // en curso, que cierra el próximo. Igual que `/pelear`, y por lo
          // mismo: con el tick actual el evento cae en un agujero de la
          // ventana del director y nunca se cuenta.
          tick: found.region.tick + 1,
          soloJugador: found.player.id,
        })
        await latir(found.region)
        // Un botón que no dice nada parece roto, y ahora sí hay algo que
        // decir: lo que pasó. Si el reclamo se lo llevó un tick que corría al
        // mismo tiempo, no hay outcome acá y el aviso lo dice sin mentir.
        // SÓLO el resultado de lo que acabás de hacer, no de todo lo que
        // tuvieras encolado. Al concatenar salía en pantalla "habló con Sarn;
        // habló con Sarn; habló con Sarn; le enseñó Temple de río a Sarn":
        // tres charlas viejas sin resolver y la acción real al final, todo
        // pegado. El jugador aprieta un botón y espera saber qué pasó con ESE
        // botón.
        const mio = resueltas[resueltas.length - 1]
        return back(token, mio
          ? mio.outcome
          : 'Lo mandaste. Se resuelve cuando cierre el día del valle.')
      }

      // El golpe no se encola: se resuelve acá y devuelve el resultado. Ver
      // el porqué en world/combate.ts — resumido, una acción encolada tarda
      // hasta una hora en resolverse y el combate es lo único que no aguanta
      // eso. El evento queda escrito igual, así que el director lo puede
      // narrar: si no está en `events`, no pasó.
      if (req.method === 'POST' && parts[2] === 'pelear') {
        const found = await byToken(token)
        if (!found) return json({ error: 'no existe' })
        const f = await body(req)
        // `region.tick` es el último día CERRADO. Un golpe que pasa ahora pasa
        // durante el día en curso, que es el que va a cerrar el próximo tick.
        // No es un detalle: el director narra con `.gt('tick', last_seen)` y
        // después deja `last_seen = region.tick`, así que un evento escrito con
        // el tick actual cae en un agujero y el que mató al bicho nunca se
        // entera de que lo mató. Con +1 entra en la ventana siguiente, igual
        // que cualquier otra cosa que pase ese día.
        const tick = found.region.tick + 1
        const r = await pelear({
          regionId: found.region.id, tick,
          player: found.player, threatId: f.get('id'),
          // El aviso de que te ganaste a alguien. Lo pasa el tick desde su
          // `case 'pelear'` y hasta hoy no lo pasaba nadie acá, así que el
          // camino que más se usa —el cliente 3D— era el único que no te
          // avisaba nunca. Mismo texto y mismos umbrales que el del tick; la
          // única diferencia es que se escribe en el momento porque acá no hay
          // un cierre de día donde volcar un sumidero.
          avisarVinculo: (t, antes, ahora) =>
            avisarConfianza(found.region.id, tick, t, found.player, antes, ahora),
        })
        // Y acá el mundo late, si le toca. Va DESPUÉS del golpe a propósito:
        // el golpe se escribe con `region.tick + 1` y el tick cierra ese
        // mismo día, así que primero pasa la cosa y después cierra el día en
        // el que pasó. Al revés, el evento caería en un día ya cerrado y el
        // que mató al bicho no se enteraría de que lo mató.
        await latir(found.region)
        return json(r)
      }

      // Dónde está parado.
      //
      // En el 3D caminás libre por una escena que contiene todos los lugares,
      // así que el servidor no se enteraba nunca: para el mundo seguías donde
      // habías entrado. Eso rompía casi todo lo que depende de estar presente
      // —aprender y enseñar exigen que el otro esté en tu lugar, los bichos
      // muerden a quien está ahí, los testigos de lo que hacés son los que
      // están ahí— y era la mitad de la sensación de que el cliente y el
      // mundo son dos cosas distintas.
      //
      // El cliente reporta y el servidor le cree. Es cooperativo, no
      // competitivo: no vale la pena pagar la complejidad de validar posición
      // hasta que haya alguien con motivos para mentir.
      if (req.method === 'POST' && parts[2] === 'estoy') {
        const found = await byToken(token)
        if (!found) return json({ error: 'no existe' })
        const f = await body(req)
        const slug = f.get('lugar') ?? ''
        const { data: destino } = await db.from('places').select('id, name')
          .eq('region_id', found.region.id).eq('slug', slug).maybeSingle()
        if (!destino) return json({ ok: false, porque: `no existe "${slug}"` })
        if (destino.id === found.player.place_id) return json({ ok: true, lugar: destino.name })
        await db.from('players').update({ place_id: destino.id }).eq('id', found.player.id)

        // Segunda defensa contra la inundación. El cliente ya tiene histéresis,
        // pero el que escribe en `events` es este endpoint y no puede confiar
        // en que todos los clientes se porten bien: alcanza con uno parado en
        // un borde para llenar la crónica de caminatas. Y la crónica es lo
        // único que este proyecto está midiendo.
        const { data: yaLlego } = await db.from('events').select('id')
          .eq('region_id', found.region.id).eq('kind', 'llegada')
          .eq('place_id', destino.id)
          .gte('tick', found.region.tick)
          .contains('detail', { player: found.player.name })
          .limit(1).maybeSingle()
        if (yaLlego) return json({ ok: true, lugar: destino.name })

        // Llegar a un lugar es un hecho del mundo: alguien te puede haber
        // visto. Va a `events` como cualquier otra cosa.
        await db.from('events').insert({
          region_id: found.region.id, tick: found.region.tick + 1, kind: 'llegada',
          place_id: destino.id,
          summary: `${found.player.name} llegó a ${destino.name}.`,
          detail: { player: found.player.name, place: destino.name },
        })
        // Caminar de un lugar a otro también empuja el mundo. Está acá y no en
        // el `/mundo` que el cliente pide cada pocos segundos porque esto pasa
        // cuando el jugador decide algo, no cuando el cliente respira: el
        // latido es barato pero no gratis, y `/estoy` llega unas pocas veces
        // por sesión. Con `/pelear` alcanza para que una sesión de 3D no pueda
        // pasar sin cerrar el día que le toque.
        await latir(found.region)
        return json({ ok: true, lugar: destino.name })
      }

      // Te pegaron. El cliente avisa; el mundo decide cuánto duele.
      if (req.method === 'POST' && parts[2] === 'danio') {
        const found = await byToken(token)
        if (!found) return json({ error: 'no existe' })
        const f = await body(req)
        // Si está quieta por una runa, no muerde. Sin esto la marca se escribe
        // y el bicho te pega igual: la runa de quietud sería decorativa.
        const de = f.get('de')
        if (de && await estaQuieta(de, found.region.tick + 1)) {
          return json({ ok: false, health: found.player.health, caido: false,
            porque: 'está quieta' })
        }
        return json(await recibirGolpe({
          regionId: found.region.id, tick: found.region.tick + 1,
          player: found.player, threatId: f.get('de'),
        }))
      }

      // Levantarse. No cuesta tiempo ni saber: cuesta la posición y la cara.
      if (req.method === 'POST' && parts[2] === 'levantarse') {
        const found = await byToken(token)
        if (!found) return json({ error: 'no existe' })
        return json(await levantarse({
          regionId: found.region.id, tick: found.region.tick + 1,
          player: found.player,
        }))
      }

      // Colgarse las runas del día. Entran tres, y una cuarta sólo con un
      // frasco de raíz encima — que es, por fin, para qué sirve un frasco.
      if (req.method === 'POST' && parts[2] === 'preparar') {
        const found = await byToken(token)
        if (!found) return json({ error: 'no existe' })
        const f = await body(req)
        return json(await preparar({
          regionId: found.region.id, tick: found.region.tick + 1, player: found.player,
          runas: (f.get('runas') ?? '').split(/[\s,]+/).filter(Boolean),
        }))
      }

      // Trazar. Inmediato, como pelear: un hechizo que tarda seis horas no es
      // un hechizo.
      if (req.method === 'POST' && parts[2] === 'lanzar') {
        const found = await byToken(token)
        if (!found) return json({ error: 'no existe' })
        const f = await body(req)
        return json(await lanzar({
          regionId: found.region.id, tick: found.region.tick + 1, player: found.player,
          runas: (f.get('runas') ?? '').split(/[\s,]+/).filter(Boolean),
          blanco: {
            tipo: (f.get('blanco') ?? 'amenaza') as 'amenaza' | 'persona' | 'jugador' | 'lugar',
            id: f.get('id') ?? undefined,
          },
        }))
      }

      // El grimorio: SÓLO lo que te salió a vos. Nunca lo posible — una lista
      // de lo que falta convierte el saber en información, que es justo lo que
      // este sistema evita.
      if (req.method === 'GET' && parts[2] === 'grimorio') {
        const found = await byToken(token)
        if (!found) return json({ error: 'no existe' })
        return json(await grimorioDe(found.player.id))
      }

      if (req.method === 'POST' && parts[2] === 'hablar') {
        const found = await byToken(token)
        if (!found) return json({ error: 'no existe' })
        const f = await body(req)
        const quien = f.get('npc') ?? ''
        try {
          const d = await hablarCon(found.player.id, found.player.name, quien, f.get('dice') ?? '')
          // Hablar también cuenta como acto en el mundo: el NPC te registra.
          await db.from('actions').insert({
            player_id: found.player.id, verb: 'hablar',
            target: quien, submitted_tick: found.region.tick,
          })
          return json(d)
        } catch (e) {
          return json({ error: (e as Error).message })
        }
      }

      // Igual que /look pero devuelve JSON: lo usa el 3D para mostrar la
      // crónica sin sacarte del valle.
      if (req.method === 'POST' && parts[2] === 'cronica') {
        const found = await byToken(token)
        if (!found) return json({ text: 'No existe ese jugador.' })
        // Este corte parece redundante ahora que `narrate()` también se calla
        // con la ventana vacía, y no lo es: los dos predicados son distintos.
        // Acá se pregunta por el tick de la región; el director pregunta por
        // eventos con `tick > last_seen_tick`, y las acciones del cliente
        // escriben eventos en `region.tick + 1` (ver `llegada` más arriba, y
        // los golpes y las caídas). O sea que hay estados —medidos hoy en
        // valle-primero: dos jugadores con `hay=false` y ocho eventos en la
        // ventana— donde el director sí narraría.
        //
        // Y esta ruta la pega el cliente de Godot **solo, al entrar al valle**
        // (`valle.gd`, `pedir_cronica()`). Sin el corte, cualquiera que jugó y
        // volvió a entrar dispararía una llamada al modelo por entrada, y
        // como `to_tick` quedaría por detrás de esos eventos, volvería a
        // narrar los mismos en la siguiente. Se queda.
        const hay = found.region.tick > found.player.last_seen_tick
        if (!hay) {
          const { data: ultima } = await db.from('chronicles')
            .select('text').eq('player_id', found.player.id)
            .order('to_tick', { ascending: false }).limit(1).maybeSingle()
          return json({ text: ultima?.text ?? 'Todavía no pasó nada digno de contar.' })
        }
        const c = await narrate(found.player.name)
        await anotarSinRespaldo(found.player.id, c)
        return json({ text: c.text })
      }

      if (req.method === 'POST' && parts[2] === 'look') {
        const found = await byToken(token)
        if (!found) return send(page('No existe', '<h1>No existe</h1>'), 404)
        const c = await narrate(found.player.name)
        await anotarSinRespaldo(found.player.id, c)

        const avisos: string[] = []
        // Ventana vacía: el director no llamó al modelo y no escribió crónica,
        // así que la página va a seguir mostrando la anterior. Sin esto el
        // botón parece roto — apretás «¿Qué pasó?» y no cambia nada. El texto
        // que trae la respuesta es la explicación, y va arriba de todo.
        if (!c.leidos) avisos.push(c.text)
        if (c.inventados.length) {
          avisos.push(`El director citó ${c.inventados.length} hecho(s) inexistente(s). Alucinación — anotala.`)
        }
        // La otra auditoría. No es un error por sí sola —sugerir a alguien en
        // condicional es legítimo— pero es el agujero que el chequeo de ids no
        // ve, así que se mira acá y queda guardada en `chronicles`.
        if (c.sinRespaldo.length) {
          avisos.push(`Nombró a ${c.sinRespaldo.join(', ')} sin ningún hecho que los ponga en escena.`)
        }
        return back(token, avisos.join(' · ') || undefined)
      }

      // El valle en el navegador ya no existe. Era un cliente Three.js de 600
      // líneas que se descartó cuando el cliente pasó a ser Godot
      // (`DISENO.md` §17). Servía un juego que ya no es el juego, y el que
      // entraba por acá se llevaba esa idea. 410 y no 404: no es que la
      // dirección esté mal escrita, es que eso se dio de baja a propósito.
      if (parts[2] === 'mapa') {
        return send(page('El valle ya no se juega en el navegador', `
          <h1>El valle ya no se juega en el navegador</h1>
          <p class="sub">Esta vista era una prueba y quedó vieja. El juego ahora se
          baja: es un programa que corre en tu máquina y se conecta a este mismo
          valle, con tu mismo link.</p>
          <p class="sub"><a href="/">Baja la demo desde la portada</a> — y si quieres
          ver qué pasó sin abrir el juego, <a href="/j/${esc(token)}">volvé a tu página</a>.</p>
        `), 410)
      }

      const html = await renderPlayer(
        token,
        url.searchParams.get('aviso') ?? undefined,
        url.searchParams.get('nuevo') === '1',
      )
      if (!html) return send(page('No existe', `
        <h1>Ese link no existe</h1>
        <p class="sub">Puede que lo hayas copiado mal. <a href="/">Volver</a></p>`), 404)
      return send(html)
    }

    send(page('No está', '<h1>No está</h1><p class="sub"><a href="/">Volver</a></p>'), 404)
  } catch (e) {
    send(page('Se rompió', `<h1>Se rompió</h1><div class="warn">${esc((e as Error).message)}</div><p class="sub"><a href="/">Volver</a></p>`), 500)
  }
}

export default handler

if (process.argv[1]?.endsWith('web.ts')) {
  createServer(handler).listen(PORT, () => {
    console.log(`Saber Escaso andando en http://localhost:${PORT}`)
  })
}

/** Qué hacer ahora, sacado del estado del mundo.
 *
 * Es lo que faltaba para que el juego tenga primer minuto. Llegás a un valle,
 * no conocés a nadie, no sabés qué hay, y hasta acá te dejaba parado en un
 * campo — que es exactamente la queja: *"¿qué es lo primero que hago cuando
 * llego?"*.
 *
 * **No lo escribe un modelo.** Sale del estado, así que nunca te manda a hacer
 * algo imposible: no te dice "pedile que te enseñe" a alguien que no enseña,
 * ni "forjá" si no sabés forjar. Un tutorial que miente es peor que ninguno.
 *
 * Y no es una lista de tareas: es lo que un vecino te diría si le preguntaras
 * por dónde empezar. Se ordena solo — lo primero es siempre lo que desbloquea
 * lo demás.
 */
type Paso = { texto: string; donde: string }
function pasos(m: {
  places: { id: string; slug: string; name: string; kind: string }[]
  people: { id: string; name: string; trade: string; place_id: string | null }[]
  amenazas: { kind: string; nombre: string | null; place_id: string | null }[]
  objetos: { kind: string }[]
  saberes: unknown[]
  vinculos: { person_id: string; valued: number; feared: number }[]
  player: { name: string; place_id: string | null }
  /** Lo que lleva colgado HOY. Ver el bloque 1b. */
  colgadas: { nombre: string; slug: string }[]
}): Paso[] {
  const out: Paso[] = []
  const slug = (id: string | null) => m.places.find((p) => p.id === id)?.slug ?? ''
  const nombre = (id: string | null) => m.places.find((p) => p.id === id)?.name ?? 'el valle'
  const recetas = m.saberes
    .map((k) => (k as { knowledge: { name: string; makes: string | null; makes_at: string | null } | null }).knowledge)
    .filter((k): k is { name: string; makes: string; makes_at: string } => !!k?.makes)
  const aprecio = (id: string) => m.vinculos.find((v) => v.person_id === id)?.valued ?? 0
  // Todos los saberes por nombre, no sólo los que fabrican algo: `recetas` de
  // acá arriba filtra por `makes`, y una runa no fabrica nada — así que las
  // runas no aparecían en ninguna parte de esta función.
  const recetasYSaberes = m.saberes
    .map((k) => (k as { knowledge: { name: string } | null }).knowledge?.name)
    .filter((n): n is string => !!n)
  /** «el calor, la quietud y el aliento». Con coma no se lee como una lista de
   *  cosas que llevás encima, se lee como una enumeración de inventario. */
  const yLista = (xs: string[]) => xs.length <= 1 ? (xs[0] ?? '')
    : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`

  // 1. Sin saberes no hay juego: todo lo demás sale de que alguien te enseñe.
  if (recetas.length === 0) {
    // Al que mejor te conoce, que es el que más cerca está de enseñarte.
    const candidatos = [...m.people].sort((a, b) => aprecio(b.id) - aprecio(a.id))
    const quien = candidatos[0]
    if (quien) {
      const v = aprecio(quien.id)
      // Tres escalones, y cada uno manda a hacer lo que de verdad se puede
      // hacer con ese aprecio. El orden correcto lo dijo quien lo jugaba sin
      // querer: primero te piden algo, después te enseñan.
      out.push({
        texto: v >= UMBRAL_ENSENAR
          ? `${quien.name} ${comoTeVe(v)}. Pídele que te enseñe su oficio.`
          : v >= UMBRAL_ENCARGO
          ? `${quien.name} ${comoTeVe(v)}: encárgate de algo que necesite y será otra cosa.`
          : `Nadie te enseña nada todavía. Busca a ${quien.name}, ${quien.trade}, y gánatelo: háblale y quédate trabajando cerca.`,
        donde: slug(quien.place_id),
      })
    }
  }

  // 1b. Las runas, que es el sistema más grande del juego y el que nadie
  // entiende.
  //
  // No es una suposición: quien lo jugó dijo textual **"no entiendo cómo hacen
  // las runas para usarse"**, teniendo las cuatro en la cabeza. Y el motivo es
  // que el sistema son DOS pasos y la pantalla sólo anunciaba el primero: hay
  // un renglón que dice "P — colgarte las runas de hoy" y después, nada. Te
  // colgás tres, se cierra el panel, y volvés a un valle idéntico sin que nada
  // te diga que ahora se mantiene R y se suelta sobre algo.
  //
  // Así que acá va el eslabón que faltaba, y va en dos formas distintas según
  // en cuál de los dos pasos estés parado. Sale del estado como todo lo demás:
  // si no sabés ninguna runa no aparece nunca, y si ya te colgaste las de hoy
  // deja de decirte que te las cuelgues.
  const runas = recetasYSaberes.filter((n) => /^runa de /i.test(n))
  if (runas.length > 0) {
    out.push(m.colgadas.length === 0
      ? {
        // El "cada mañana" no es adorno: explica por qué el panel de ayer no
        // sirve hoy, que es la parte del ritual que no se deduce sola.
        texto: `Sabes trazar. Cada mañana eliges tres runas para llevar encima: pulsa P.`,
        donde: '',
      }
      : {
        // Se nombra lo que lleva HOY, no "tus runas": el jugador tiene que
        // reconocer en la frase lo que acaba de elegir.
        // Se nombra por la MATERIA —«el calor», «la quietud»— y no por el
        // nombre de catálogo. "Llevas Runa de vena y Runa de aliento encima"
        // repite "Runa de" dos veces y suena a inventario; "llevas la vena y
        // el aliento encima" suena a que tenés algo puesto en el cuerpo, que
        // es literalmente lo que el ritual dice que pasa. El dato ya existía:
        // `RUNAS[slug].materia` es lo que usa el propio `preparar()` para
        // contar que saliste con eso encima.
        texto: `Llevas ${yLista(m.colgadas.map((c) => RUNAS[c.slug]?.materia ?? c.nombre))} encima.`
          + ' Mantén pulsada R, elige el trazo y suelta sobre lo que quieras alcanzar.',
        donde: '',
      })
  }

  // 2. Si ya sabés hacer algo, hacelo — practicar es lo que mejora la mano.
  for (const r of recetas.slice(0, 1)) {
    const lugar = m.places.find((p) => p.kind === r.makes_at)
    out.push({
      texto: `Sabes ${r.name}. Ve a ${lugar?.name ?? 'donde se hace'} y ponte a trabajar: te sale ${r.makes}, y cuanto más lo haces, mejor.`,
      donde: lugar?.slug ?? '',
    })
  }

  // 3. Lo que hiciste sirve para algo, y para alguien.
  const bicho = m.amenazas[0]
  const llevo = m.objetos[0]
  if (bicho) {
    out.push({
      texto: llevo
        ? `Llevas ${llevo.kind}. ${bicho.nombre ?? bicho.kind} anda por ${nombre(bicho.place_id)}.`
        : `${bicho.nombre ?? bicho.kind} anda por ${nombre(bicho.place_id)}. Sin nada en las manos vas a pegar poco.`,
      donde: slug(bicho.place_id),
    })
  }

  // 4. Que el saber circula es el juego entero. Se dice al final y una vez.
  if (recetas.length > 0) {
    out.push({
      texto: 'Lo que sabes se lo puedes enseñar a alguien. Es lo que más confianza te gana — y lo único que hace que no se pierda cuando te mueras.',
      donde: '',
    })
  }
  return out.slice(0, 3)
}

/** Cómo te trata alguien cuando pasás al lado.
 *
 * Una línea corta, derivada del vínculo. No es diálogo: es que el mundo
 * reconozca que estás. Quien lo jugó lo pidió así: *"si me acerco, ¿no
 * deberían saludarme al menos? después poner hablar o no, pero ya saben que
 * estoy"*.
 *
 * Nada de esto pasa por el modelo. Tiene que salir en el mismo cuadro en que
 * te acercás, y además hay gente caminando todo el tiempo: una llamada por
 * cruce sería lenta y cara para algo que el estado ya contesta solo.
 *
 * Las variantes existen para que no sea un cartel: la misma persona con el
 * mismo vínculo tiene tres formas de mirarte, y cuál te toca depende de tu
 * nombre y del suyo. Es determinista —el mismo par siempre da lo mismo— pero
 * distinto entre personas, que es lo que hace que el valle no suene a coro.
 */
function actitud(
  q: { id: string; name: string; trade: string; teaches: boolean
       saludos?: Record<string, string[]> | null },
  vinculos: { person_id: string; valued: number; feared: number }[],
  saberesDelJugador: number,
  tick: number,
  nombreJugador: string,
): { saludo: string; animo: string; ensena: boolean } {
  const v = vinculos.find((b) => b.person_id === q.id)
  const aprecio = v?.valued ?? 0
  const miedo = v?.feared ?? 0

  // Lo que escribió el modelo, si ya existe. Rota con el día y con quién sos,
  // así que la misma persona te dice cosas distintas de un día para otro.
  const escalon = escalonDe(aprecio, miedo)
  const escrito = elegirSaludo(q.saludos ?? null, escalon, tick, nombreJugador)
  if (escrito) {
    return {
      saludo: escrito,
      animo: escalon === 'teme' ? 'hostil'
        : escalon === 'bronca' ? 'seco'
        : escalon === 'fe' ? 'calido' : 'neutral',
      ensena: q.teaches && aprecio >= 35,
    }
  }
  // Todavía no se generaron: las frases fijas son el piso, no el objetivo.

  // Un hash chico y estable del nombre: la misma persona te mira siempre igual.
  let h = 0
  for (const c of q.name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const de = (xs: string[]) => xs[h % xs.length]!

  if (miedo >= 25 && miedo > aprecio) {
    return {
      saludo: de([
        `${q.name} te ve y baja la vista.`,
        `${q.name} se queda muy quieta cuando pasás.`,
        `${q.name} corta lo que estaba haciendo hasta que te alejás.`,
      ]),
      animo: 'hostil', ensena: false,
    }
  }
  if (aprecio < 0) {
    return {
      saludo: de([
        `${q.name} te ve y sigue en lo suyo.`,
        `${q.name} hace como que no te vio.`,
        `${q.name} te mira de costado y no dice nada.`,
      ]),
      animo: 'seco', ensena: false,
    }
  }
  if (aprecio >= 40) {
    return {
      saludo: de([
        `${q.name} levanta la mano apenas te ve.`,
        `—Ah, eres tú. Justo pensaba en algo.`,
        `${q.name} te hace lugar al lado.`,
      ]),
      animo: 'calido', ensena: q.teaches,
    }
  }
  if (aprecio >= 12) {
    return {
      saludo: de([
        `${q.name} levanta la vista y te saluda con la cabeza.`,
        `—Volviste.`,
        `${q.name} te ubica y sigue con lo suyo, más tranquila.`,
      ]),
      animo: 'neutral', ensena: q.teaches,
    }
  }
  return {
    saludo: de([
      `${q.name} te mira sin saber bien quién eres.`,
      `${q.name} levanta la vista un segundo.`,
      saberesDelJugador === 0
        ? `${q.name} te mira las manos antes que la cara.`
        : `${q.name} te mira y vuelve a lo suyo.`,
    ]),
    animo: 'neutral', ensena: false,
  }
}

/** Cuánta mano tenés en algo, en palabras.
 *
 * En números no: el diseño prohíbe mostrarle porcentajes al jugador, y con
 * razón — "forja simple 47%" convierte un oficio en una barra de progreso, que
 * es justo lo que este juego no quiere ser. Los cortes siguen la curva real de
 * `mejora()` en tick.ts, donde las primeras veces suben mucho y de 80 para
 * arriba cada punto cuesta.
 */
function mano(destreza: number): string {
  if (destreza < 12) return 'recién empiezas'
  if (destreza < 30) return 'te sale, con esfuerzo'
  if (destreza < 55) return 'le tienes la mano'
  if (destreza < 78) return 'te sale bien'
  return 'eres de los que saben'
}
