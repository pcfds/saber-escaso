/**
 * Web local para probar. Un archivo, sin framework, sin login.
 *
 *   pnpm web        →  http://localhost:3210
 *
 * No es la UI del juego: es la superficie mínima para que cuatro personas
 * puedan usar el director sin abrir una terminal. Cuando esto se despliegue
 * va a ser Next.js; por ahora alcanza y se levanta en dos segundos.
 */
import { createServer } from 'node:http'
import { db, getRegion } from './db.js'
import { step } from './world/tick.js'
import { narrate } from './world/director.js'

const PORT = Number(process.env.PORT ?? 3210)
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

const page = (title: string, body: string) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { --bg:#14181a; --card:#1c2224; --ink:#dde3de; --soft:#98a29c; --line:#2c3538; --accent:#6fb99e; }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 "Iowan Old Style",Palatino,Georgia,serif;padding:32px 20px 80px}
  .wrap{max-width:720px;margin:0 auto}
  h1{font-size:26px;margin:0 0 4px;letter-spacing:-.01em}
  .sub{color:var(--soft);font-size:14px;margin:0 0 28px}
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
  .intro{background:var(--card);border-left:3px solid var(--line);padding:16px 20px;margin:0 0 26px;
         font-size:14.5px;color:var(--soft)}
  .intro b{color:var(--ink);font-weight:600}
  a{color:var(--accent)}
</style></head><body><div class="wrap">${body}</div></body></html>`

async function ensurePlayer(name: string) {
  const region = await getRegion()
  const { data: found } = await db.from('players')
    .select('id, name, place_id, last_seen_tick')
    .eq('region_id', region.id).ilike('name', name).maybeSingle()
  if (found) return { region, player: found }

  const { data: aldea } = await db.from('places')
    .select('id').eq('region_id', region.id).eq('slug', 'aldea').single()
  const { data: nuevo, error } = await db.from('players')
    .insert({ region_id: region.id, name, place_id: aldea?.id, last_seen_tick: region.tick })
    .select('id, name, place_id, last_seen_tick').single()
  if (error || !nuevo) throw error
  await db.from('events').insert({
    region_id: region.id, tick: region.tick, kind: 'llegada', place_id: aldea?.id,
    summary: `${name} llegó al valle por el Camino del Norte.`, detail: { player: name },
  })
  return { region, player: nuevo }
}

async function renderPlayer(name: string, aviso?: string) {
  const { region, player } = await ensurePlayer(name)

  const [places, people, sabe, ultima] = await Promise.all([
    db.from('places').select('id, slug, name').eq('region_id', region.id),
    db.from('people').select('id, name, trade, place_id')
      .eq('region_id', region.id).eq('alive', true),
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

  const opts = (xs: { v: string; t: string }[]) =>
    xs.map((x) => `<option value="${esc(x.v)}">${esc(x.t)}</option>`).join('')

  const accion = (verb: string, label: string, select?: string) => `
    <div class="row"><form method="post" action="/p/${encodeURIComponent(name)}/act">
      <input type="hidden" name="verb" value="${verb}">
      ${select ?? ''}
      <button class="ghost">${esc(label)}</button>
    </form></div>`

  return page(`${name} — Saber Escaso`, `
    <h1>${esc(name)}</h1>
    <p class="sub">Estás en ${esc(lugar?.name ?? 'algún lado')}. ${
      saberes.length
        ? 'Sabés ' + saberes.map(esc).join(', ') + '.'
        : 'Todavía no sabés ningún oficio.'
    }</p>

    <div class="intro">
      <b>Qué es esto.</b> Un valle donde la gente vive su vida sin vos: trabajan,
      aprenden oficios, se deben plata, se mueren. Vos entrás cuando querés y
      alguien te cuenta qué pasó mientras no estabas.
      <br><br>
      <b>Lo único que importa acá es el saber.</b> Cada oficio y cada runa vive
      en la cabeza de alguien. Se aprende quedándose cerca de quien lo tiene, y
      si esa persona se muere sin habérselo enseñado a nadie, <b>se pierde del
      valle para siempre</b>. Ya pasó con las dos runas de magia.
      <br><br>
      Empezá hablando con la gente. Nadie te va a enseñar nada hasta que confíe
      en vos.
    </div>

    ${aviso ? `<div class="warn">${esc(aviso)}</div>` : ''}

    ${ultima.data
      ? `<div class="cronica">${esc(ultima.data.text)}</div>`
      : `<div class="cronica vacia">Llegaste recién. Tocá «¿Qué pasó?» y alguien te pone al día.</div>`}

    <div class="row">
      <form method="post" action="/p/${encodeURIComponent(name)}/look">
        <button>${hayNovedades ? '¿Qué pasó?' : 'Volver a mirar'}</button>
      </form>
    </div>
    <p class="meta">${hayNovedades
      ? `pasó ${region.tick - player.last_seen_tick === 1 ? 'un día' : `${region.tick - player.last_seen_tick} días`} desde que miraste`
      : 'nada nuevo desde que miraste · en el valle pasa un día por hora'}</p>

    <div class="sec">Qué hacés</div>
    <p class="sub" style="margin:-4px 0 14px">
      Elegís una cosa y se resuelve. El valle avanza solo, estés o no.
    </p>
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
  const back = (name: string, aviso?: string) => {
    res.writeHead(303, { location: `/p/${encodeURIComponent(name)}${aviso ? `?aviso=${encodeURIComponent(aviso)}` : ''}` })
    res.end()
  }

  try {
    if (url.pathname === '/') {
      const region = await getRegion()
      const { data: players } = await db.from('players')
        .select('name').eq('region_id', region.id).order('name')
      return send(page('Saber Escaso', `
        <h1>Saber Escaso</h1>
        <p class="sub">${esc(region.name)} · momento ${region.tick}</p>
        <form method="get" action="/entrar"><div class="row">
          <input name="name" placeholder="tu nombre" required autofocus>
          <button>Entrar al valle</button>
        </div></form>
        <div class="sec">Ya andan por acá</div>
        ${(players ?? []).length
          ? (players ?? []).map((p) => `<p class="sub" style="margin:0 0 6px"><a href="/p/${encodeURIComponent(p.name)}">${esc(p.name)}</a></p>`).join('')
          : '<p class="sub">Nadie todavía.</p>'}
      `))
    }

    if (url.pathname === '/entrar') {
      const name = (url.searchParams.get('name') ?? '').trim()
      if (!name) return back('')
      await ensurePlayer(name)
      return back(name)
    }

    if (parts[0] === 'p' && parts[1]) {
      const name = decodeURIComponent(parts[1])

      if (req.method === 'POST' && parts[2] === 'act') {
        const f = await body(req)
        const { region, player } = await ensurePlayer(name)
        await db.from('actions').insert({
          player_id: player.id, verb: f.get('verb'),
          target: f.get('target'), submitted_tick: region.tick,
        })
        await step()
        return back(name)
      }

      if (req.method === 'POST' && parts[2] === 'tick') {
        await step()
        return back(name)
      }

      if (req.method === 'POST' && parts[2] === 'look') {
        const c = await narrate(name)
        return back(name, c.inventados.length
          ? `El director citó ${c.inventados.length} hecho(s) inexistente(s). Alucinación — anotala.`
          : undefined)
      }

      return send(await renderPlayer(name, url.searchParams.get('aviso') ?? undefined))
    }

    send(page('No está', '<h1>No está</h1><p class="sub"><a href="/">Volver</a></p>'), 404)
  } catch (e) {
    send(page('Se rompió', `<h1>Se rompió</h1><div class="warn">${esc((e as Error).message)}</div><p class="sub"><a href="/">Volver</a></p>`), 500)
  }
}

export default handler

// Local: `pnpm web`. En Vercel el handler se importa desde api/index.ts.
if (process.argv[1]?.endsWith('web.ts')) {
  createServer(handler).listen(PORT, () => {
    console.log(`Saber Escaso andando en http://localhost:${PORT}`)
  })
}
