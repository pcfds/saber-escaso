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
import { step } from './world/tick.js'
import { narrate } from './world/director.js'
import { hablarCon } from './world/dialogo.js'
import { pelear, recibirGolpe, levantarse } from './world/combate.js'
import { landing } from './landing.js'

const PORT = Number(process.env.PORT ?? 3210)
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
      saberes.length ? 'Sabés ' + saberes.map(esc).join(', ') + '.' : 'Todavía no sabés ningún oficio.'
    }</p>

    ${recienCreado ? `<div class="link"><b>⚠ Este link es tu personaje. Guardalo.</b>
      Cualquiera que lo tenga entra como vos, y sin él no podés volver a entrar.</div>` : ''}

    <div class="intro">
      <b>Qué es esto.</b> Un valle donde la gente vive su vida sin vos: trabajan,
      aprenden oficios, se deben plata, se mueren. Entrás cuando querés y alguien
      te cuenta qué pasó mientras no estabas.
      <br><br>
      <b>Lo único que importa acá es el saber.</b> Cada oficio y cada runa vive en
      la cabeza de alguien. Se aprende quedándose cerca de quien lo tiene, y si esa
      persona se muere sin habérselo enseñado a nadie, <b>se pierde del valle para
      siempre</b>.
      <br><br>
      Empezá hablando con la gente. Nadie te enseña nada hasta que confíe en vos.
    </div>

    ${aviso ? `<div class="warn">${esc(aviso)}</div>` : ''}

    ${ultima.data
      ? `<div class="cronica">${esc(ultima.data.text)}</div>`
      : `<div class="cronica vacia">Llegaste recién. Tocá «¿Qué pasó?» y alguien te pone al día.</div>`}

    <div class="row">
      <form method="post" action="${base}/look">
        <button>${hayNovedades ? '¿Qué pasó?' : 'Volver a mirar'}</button>
      </form>
      <a href="${base}/mapa"><button type="button" class="ghost">Ver el valle</button></a>
    </div>
    <p class="meta">${hayNovedades
      ? `pasó ${region.tick - player.last_seen_tick === 1 ? 'un día' : `${region.tick - player.last_seen_tick} días`} desde que miraste`
      : 'nada nuevo · en el valle pasa un día por hora'}</p>

    <div class="sec">Qué hacés</div>
    <p class="sub" style="margin:-4px 0 14px">Elegís una cosa y se resuelve. El valle avanza solo, estés o no.</p>
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
        const [places, people, amenazas, objetos, saberes, vinculos] = await Promise.all([
          db.from('places').select('id, slug, name, kind, description').eq('region_id', region.id),
          db.from('people').select('id, name, trade, place_id').eq('region_id', region.id).eq('alive', true),
          // Las muertas quedan en la tabla porque el director las narra después
          // ("mató a X"), pero el cliente no tiene que plantar el cadáver otra vez.
          db.from('threats').select('id, kind, nombre, people_id, health, max_health, place_id')
            .eq('region_id', region.id).eq('alive', true),
          db.from('objects').select('kind, quality, made_by')
            .eq('holder_kind', 'player').eq('holder_id', player.id),
          db.from('knows').select('knowledge:knowledge_id (name, makes, makes_at)')
            .eq('holder_kind', 'player').eq('holder_id', player.id),
          db.from('bonds').select('person_id, valued, feared').eq('toward_id', player.id),
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
            // Un tick es un día y el cron corre uno cada SEIS horas, así que
            // la hora del valle es cuánto va corrido el bloque de seis horas
            // en curso. El módulo cae justo porque el cron dispara a las
            // 00, 06, 12 y 18 UTC y la época Unix arranca a medianoche UTC.
            //
            // Sale de acá y no del reloj de cada máquina a propósito: dos
            // personas conectadas al mismo tiempo tienen que ver el mismo
            // atardecer.
            momento_del_dia: (Date.now() % 21_600_000) / 1000,
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
          places: places.data ?? [], people: people.data ?? [],
          // Qué hacer ahora. Es la diferencia entre un mundo y una demo
          // técnica: llegás, no conocés a nadie, no sabés qué hay, y sin esto
          // el juego te deja parado en un campo. NO lo escribe un modelo —
          // sale del estado, así que nunca te manda a hacer algo imposible.
          primeros_pasos: pasos({
            places: places.data ?? [], people: people.data ?? [],
            amenazas: amenazas.data ?? [], objetos: objetos.data ?? [],
            saberes: saberes.data ?? [], vinculos: vinculos.data ?? [],
            player,
          }),
          // `nombre` no es adorno: los que no son humanos no son mobs, son
          // pueblos, y matar a alguien con nombre pesa distinto que matar a
          // "un merodeador".
          amenazas: (amenazas.data ?? []).map((a) => ({
            id: a.id, kind: a.kind, nombre: a.nombre ?? null,
            health: a.health, max_health: a.max_health,
            place_slug: slugDe(a.place_id),
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
        await step()
        return back(token)
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
        const r = await pelear({
          regionId: found.region.id, tick: found.region.tick + 1,
          player: found.player, threatId: f.get('id'),
        })
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
        return json({ ok: true, lugar: destino.name })
      }

      // Te pegaron. El cliente avisa; el mundo decide cuánto duele.
      if (req.method === 'POST' && parts[2] === 'danio') {
        const found = await byToken(token)
        if (!found) return json({ error: 'no existe' })
        const f = await body(req)
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
        const hay = found.region.tick > found.player.last_seen_tick
        if (!hay) {
          const { data: ultima } = await db.from('chronicles')
            .select('text').eq('player_id', found.player.id)
            .order('to_tick', { ascending: false }).limit(1).maybeSingle()
          return json({ text: ultima?.text ?? 'Todavía no pasó nada digno de contar.' })
        }
        const c = await narrate(found.player.name)
        return json({ text: c.text })
      }

      if (req.method === 'POST' && parts[2] === 'look') {
        const found = await byToken(token)
        if (!found) return send(page('No existe', '<h1>No existe</h1>'), 404)
        const c = await narrate(found.player.name)
        return back(token, c.inventados.length
          ? `El director citó ${c.inventados.length} hecho(s) inexistente(s). Alucinación — anotala.`
          : undefined)
      }

      if (parts[2] === 'mapa') {
        const found = await byToken(token)
        if (!found) return send(page('No existe', '<h1>No existe</h1>'), 404)
        return send(mapaHtml(token, found.player.name))
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

/** La vista 3D. Se define en mapa.ts para no ensuciar el ruteo. */
import { mapaHtml } from './mapa.js'

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
}): Paso[] {
  const out: Paso[] = []
  const slug = (id: string | null) => m.places.find((p) => p.id === id)?.slug ?? ''
  const nombre = (id: string | null) => m.places.find((p) => p.id === id)?.name ?? 'el valle'
  const recetas = m.saberes
    .map((k) => (k as { knowledge: { name: string; makes: string | null; makes_at: string | null } | null }).knowledge)
    .filter((k): k is { name: string; makes: string; makes_at: string } => !!k?.makes)
  const aprecio = (id: string) => m.vinculos.find((v) => v.person_id === id)?.valued ?? 0

  // 1. Sin saberes no hay juego: todo lo demás sale de que alguien te enseñe.
  if (recetas.length === 0) {
    // Al que mejor te conoce, que es el que más cerca está de enseñarte.
    const candidatos = [...m.people].sort((a, b) => aprecio(b.id) - aprecio(a.id))
    const quien = candidatos[0]
    if (quien) {
      const v = aprecio(quien.id)
      out.push({
        texto: v >= 10
          ? `${quien.name} ya confía en vos. Pedile que te enseñe su oficio.`
          : `Nadie te enseña nada todavía. Buscá a ${quien.name}, ${quien.trade}, y ganátelo: quedate trabajando cerca y hablale.`,
        donde: slug(quien.place_id),
      })
    }
  }

  // 2. Si ya sabés hacer algo, hacelo — practicar es lo que mejora la mano.
  for (const r of recetas.slice(0, 1)) {
    const lugar = m.places.find((p) => p.kind === r.makes_at)
    out.push({
      texto: `Sabés ${r.name}. Andá a ${lugar?.name ?? 'donde se hace'} y ponete a trabajar: te sale ${r.makes}, y cuanto más lo hacés, mejor.`,
      donde: lugar?.slug ?? '',
    })
  }

  // 3. Lo que hiciste sirve para algo, y para alguien.
  const bicho = m.amenazas[0]
  const llevo = m.objetos[0]
  if (bicho) {
    out.push({
      texto: llevo
        ? `Llevás ${llevo.kind}. ${bicho.nombre ?? bicho.kind} anda por ${nombre(bicho.place_id)}.`
        : `${bicho.nombre ?? bicho.kind} anda por ${nombre(bicho.place_id)}. Sin nada en las manos vas a pegar poco.`,
      donde: slug(bicho.place_id),
    })
  }

  // 4. Que el saber circula es el juego entero. Se dice al final y una vez.
  if (recetas.length > 0) {
    out.push({
      texto: 'Lo que sabés se lo podés enseñar a alguien. Es lo que más confianza te gana — y lo único que hace que no se pierda cuando te mueras.',
      donde: '',
    })
  }
  return out.slice(0, 3)
}
