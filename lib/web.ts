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

type Player = { id: string; name: string; place_id: string | null; last_seen_tick: number; token: string }

async function ensurePlayer(name: string): Promise<{ region: Awaited<ReturnType<typeof getRegion>>; player: Player }> {
  const region = await getRegion()
  const { data: found } = await db.from('players')
    .select('id, name, place_id, last_seen_tick, token')
    .eq('region_id', region.id).ilike('name', name).maybeSingle()
  if (found) return { region, player: found as Player }

  const { data: aldea } = await db.from('places')
    .select('id').eq('region_id', region.id).eq('slug', 'aldea').single()
  const { data: nuevo, error } = await db.from('players')
    .insert({ region_id: region.id, name, place_id: aldea?.id, last_seen_tick: region.tick })
    .select('id, name, place_id, last_seen_tick, token').single()
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
    .select('id, name, place_id, last_seen_tick, token')
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
    if (url.pathname === '/') {
      const region = await getRegion()
      const { count } = await db.from('players')
        .select('*', { count: 'exact', head: true }).eq('region_id', region.id)
      return send(page('Saber Escaso', `
        <h1>Saber Escaso</h1>
        <p class="sub">${esc(region.name)} · día ${region.tick} · ${count ?? 0} personas andan por acá</p>
        <div class="intro">
          Un valle donde el saber vive en gente que se muere. Entrás con un nombre
          y te queda <b>un link privado</b>: ese link es tu personaje. Guardalo —
          nadie más puede entrar con él, y sin él no volvés a entrar.
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
        const [places, people] = await Promise.all([
          db.from('places').select('id, slug, name, kind, description').eq('region_id', region.id),
          db.from('people').select('id, name, trade, place_id').eq('region_id', region.id).eq('alive', true),
        ])
        return json({
          region: { name: region.name, tick: region.tick },
          player: { name: player.name, place_id: player.place_id },
          places: places.data ?? [], people: people.data ?? [],
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

      if (req.method === 'POST' && parts[2] === 'hablar') {
        const found = await byToken(token)
        if (!found) return json({ error: 'no existe' })
        const f = await body(req)
        const quien = f.get('npc') ?? ''
        try {
          const d = await hablarCon(found.player.id, found.player.name, quien)
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
