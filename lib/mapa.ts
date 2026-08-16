/**
 * Vista 3D del valle. Prototipo visual, no el juego.
 *
 * Lee el mismo estado que la web de texto (`/j/<token>/mundo`) y lo dibuja.
 * Sirve para contestar preguntas de presentación —¿la cámara cenital deja leer
 * la situación de un vistazo? ¿la escala funciona?— sin comprometerse a un
 * motor. Es descartable a propósito.
 *
 * Decisiones que sí vienen del documento de diseño:
 *  - Cámara orbital RESTRINGIDA: gira, pero la inclinación está acotada. Nunca
 *    termina al ras del piso mirando el horizonte, que es donde se cae el
 *    decorado.
 *  - Zoom con piso y techo. El piso es el presupuesto de arte: acá está puesto
 *    para leer silueta, no cara.
 *  - Lejos por defecto. Es la distancia donde se lee la situación social de un
 *    vistazo, y es lo que hace visible el trabajo del director.
 *  - La luz hace el 80% del laburo de "cozy". No hay arte: hay luz cálida,
 *    sombras largas y niebla.
 */

const LUGARES: Record<string, { x: number; z: number; color: number; alto: number; ancho: number }> = {
  aldea:   { x:   0, z:   0, color: 0x8a7a5e, alto: 2.2, ancho: 2.4 },
  fragua:  { x:  14, z:  -4, color: 0x7d5544, alto: 3.0, ancho: 2.8 },
  bosque:  { x: -13, z: -12, color: 0x2f4a35, alto: 4.5, ancho: 1.4 },
  ruina:   { x:  -6, z: -24, color: 0x4a4640, alto: 2.6, ancho: 2.6 },
  camino:  { x:   2, z:  16, color: 0x6b6252, alto: 0.5, ancho: 1.6 },
}

export function mapaHtml(token: string, playerName: string): string {
  // La anon key es pública por diseño: sólo habilita Realtime desde el
  // navegador. Los datos siguen saliendo por la API del servidor.
  const datos = JSON.stringify({
    token, playerName, lugares: LUGARES,
    sb: { url: process.env.SUPABASE_URL ?? '', anon: process.env.SUPABASE_ANON_KEY ?? '' },
  })
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>El valle — Saber Escaso</title>
<style>
  html,body{margin:0;height:100%;background:#0f1416;overflow:hidden;
    font:15px/1.55 "Iowan Old Style",Palatino,Georgia,serif;color:#dde3de}
  #cv{display:block;width:100%;height:100%}
  .hud{position:fixed;left:18px;top:16px;max-width:330px;z-index:5}
  .hud h1{font-size:19px;margin:0 0 2px;letter-spacing:-.01em}
  .hud p{margin:0;font-size:13px;color:#98a29c}
  .panel{position:fixed;left:18px;bottom:18px;background:rgba(20,24,26,.9);
    border-top:2px solid #6fb99e;padding:14px 16px;max-width:330px;z-index:5}
  .panel b{display:block;margin-bottom:4px}
  .panel small{color:#98a29c;font-size:12.5px;display:block;margin-top:6px}
  .volver{position:fixed;right:18px;top:16px;z-index:5;
    background:rgba(20,24,26,.9);border:1px solid #2c3538;color:#dde3de;
    font:inherit;font-size:13px;padding:8px 14px;cursor:pointer;text-decoration:none}
  .tip{position:fixed;right:18px;bottom:18px;z-index:5;font:11px/1.6 ui-monospace,Menlo,monospace;
    letter-spacing:.1em;text-transform:uppercase;color:#6c7671;text-align:right}
  .cargando{position:fixed;inset:0;display:grid;place-items:center;color:#98a29c;z-index:6}
  .vida{position:fixed;left:50%;transform:translateX(-50%);bottom:20px;z-index:5;
    display:flex;align-items:center;gap:10px}
  .vidawrap{width:230px;height:11px;background:rgba(20,24,26,.9);border:1px solid #2c3538}
  #vidabarra{height:100%;width:100%;background:#6fb99e;transition:width .18s,background .18s}
  #vidatxt{font:11px/1 ui-monospace,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:#98a29c;min-width:44px}
  .flash{position:fixed;inset:0;background:#ce8b84;opacity:0;pointer-events:none;z-index:4;transition:opacity .13s}
</style></head>
<body>
<canvas id="cv"></canvas>
<div class="hud"><h1 id="titulo">El valle</h1><p id="sub">cargando…</p><p id="otros" style="color:#c9a34e"></p></div>
<a class="volver" href="/j/${token}">← volver</a>
<div class="panel" id="panel" style="display:none"><b id="pnombre"></b><span id="pdesc"></span><small id="pgente"></small></div>
<div class="tip">WASD: caminar · espacio: golpear · arrastrar: girar · rueda: acercar</div>
<div class=vida><div class=vidawrap><div id=vidabarra></div></div><span id=vidatxt>100</span></div>
<div class=flash id=flash></div>
<div class=cargando id=cargando>cargando el valle…</div>

<script type="importmap">
{"imports":{"three":"https://unpkg.com/three@0.169.0/build/three.module.js",
"three/addons/":"https://unpkg.com/three@0.169.0/examples/jsm/"}}
</script>
<script id="datos" type="application/json">${datos}</script>
<script type="module">
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3'

const D = JSON.parse(document.getElementById('datos').textContent)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0f1416)
scene.fog = new THREE.Fog(0x0f1416, 45, 110)

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 400)
camera.position.set(26, 30, 34)

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('cv'), antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

// Cámara orbital RESTRINGIDA. La inclinación no baja del horizonte y el zoom
// tiene piso y techo: eso es lo que permite no modelar lo que no se ve.
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.minPolarAngle = Math.PI * 0.18
controls.maxPolarAngle = Math.PI * 0.38
controls.minDistance = 16
controls.maxDistance = 70
controls.maxTargetRadius = 34
controls.target.set(0, 0, -3)

// La luz hace el trabajo del arte que no tenemos.
scene.add(new THREE.HemisphereLight(0x9fb4c7, 0x2a2620, 0.55))
const sol = new THREE.DirectionalLight(0xffd9a8, 2.1)
sol.position.set(-26, 34, 20)
sol.castShadow = true
sol.shadow.mapSize.set(2048, 2048)
sol.shadow.camera.near = 1
sol.shadow.camera.far = 120
const s = 52
sol.shadow.camera.left = -s; sol.shadow.camera.right = s
sol.shadow.camera.top = s;  sol.shadow.camera.bottom = -s
scene.add(sol)

const suelo = new THREE.Mesh(
  new THREE.CircleGeometry(60, 64),
  new THREE.MeshStandardMaterial({ color: 0x3b4536, roughness: 1 }))
suelo.rotation.x = -Math.PI / 2
suelo.receiveShadow = true
scene.add(suelo)

// El río, que le da a Vado Bajo su nombre.
const rio = new THREE.Mesh(
  new THREE.PlaneGeometry(150, 5.5),
  new THREE.MeshStandardMaterial({ color: 0x2b4a52, roughness: 0.25, metalness: 0.35 }))
rio.rotation.x = -Math.PI / 2
rio.rotation.z = 0.16
rio.position.set(0, 0.02, 7)
scene.add(rio)

const clicables = []
const gruposLugar = {}

function construirLugar(slug, def, nombre, descripcion) {
  const g = new THREE.Group()
  g.position.set(def.x, 0, def.z)
  const mat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.85 })

  if (slug === 'bosque') {
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + Math.random()
      const r = 2 + Math.random() * 7
      const h = def.alto * (0.7 + Math.random() * 0.7)
      const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, h * 0.45, 6),
        new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1 }))
      const copa = new THREE.Mesh(new THREE.ConeGeometry(1.1 + Math.random() * 0.5, h, 7), mat)
      tronco.position.set(Math.cos(a) * r, h * 0.22, Math.sin(a) * r)
      copa.position.set(tronco.position.x, h * 0.45 + h * 0.42, tronco.position.z)
      tronco.castShadow = copa.castShadow = true
      copa.receiveShadow = true
      g.add(tronco, copa)
    }
  } else if (slug === 'camino') {
    const senda = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 30),
      new THREE.MeshStandardMaterial({ color: def.color, roughness: 1 }))
    senda.rotation.x = -Math.PI / 2
    senda.position.y = 0.03
    senda.receiveShadow = true
    g.add(senda)
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.3, 5),
        new THREE.MeshStandardMaterial({ color: 0x5b5346, roughness: 1 }))
      p.position.set(i % 2 ? 2.1 : -2.1, 0.65, -12 + i * 5)
      p.castShadow = true
      g.add(p)
    }
  } else {
    const n = slug === 'aldea' ? 7 : slug === 'ruina' ? 3 : 2
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const r = n > 3 ? 3.4 : 1.6
      const h = def.alto * (0.8 + Math.random() * 0.5)
      const casa = new THREE.Mesh(new THREE.BoxGeometry(def.ancho, h, def.ancho * 0.9), mat)
      casa.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r)
      casa.rotation.y = a
      casa.castShadow = casa.receiveShadow = true
      g.add(casa)
      if (slug !== 'ruina') {
        const techo = new THREE.Mesh(new THREE.ConeGeometry(def.ancho * 0.95, def.alto * 0.7, 4),
          new THREE.MeshStandardMaterial({ color: 0x4d3f33, roughness: 1 }))
        techo.position.set(casa.position.x, h + def.alto * 0.35, casa.position.z)
        techo.rotation.y = a + Math.PI / 4
        techo.castShadow = true
        g.add(techo)
      }
    }
    if (slug === 'fragua') {
      const fuego = new THREE.PointLight(0xff9040, 26, 22, 2)
      fuego.position.set(0, 2.2, 0)
      g.add(fuego)
      const brasa = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xff7a2a }))
      brasa.position.set(0, 1.1, 0)
      g.add(brasa)
      g.userData.brasa = brasa
      g.userData.fuego = fuego
    }
  }

  const disco = new THREE.Mesh(new THREE.CircleGeometry(slug === 'bosque' ? 10 : 6, 32),
    new THREE.MeshBasicMaterial({ color: 0x6fb99e, transparent: true, opacity: 0.05 }))
  disco.rotation.x = -Math.PI / 2
  disco.position.y = 0.05
  disco.userData = { slug, nombre, descripcion }
  g.add(disco)
  clicables.push(disco)

  gruposLugar[slug] = g
  scene.add(g)
  return g
}

function figura(color, altura) {
  const g = new THREE.Group()
  const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, altura * 0.55, 4, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7 }))
  cuerpo.position.y = altura * 0.55
  cuerpo.castShadow = true
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0xd8c3a0, roughness: 0.85 }))
  cabeza.position.y = altura * 0.95
  cabeza.castShadow = true
  g.add(cuerpo, cabeza)
  return g
}

function etiqueta(texto, escala) {
  const cv = document.createElement('canvas')
  cv.width = 512; cv.height = 128
  const c = cv.getContext('2d')
  c.font = '600 52px Georgia, serif'
  c.textAlign = 'center'
  c.fillStyle = 'rgba(15,20,22,.75)'
  const w = c.measureText(texto).width + 40
  c.fillRect(256 - w / 2, 28, w, 70)
  c.fillStyle = '#dde3de'
  c.fillText(texto, 256, 80)
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }))
  sp.scale.set(escala * 4, escala, 1)
  return sp
}

const gente = []

async function cargar() {
  const r = await fetch('/j/' + D.token + '/mundo')
  const w = await r.json()

  document.getElementById('titulo').textContent = w.region.name
  document.getElementById('sub').textContent =
    'día ' + w.region.tick + ' · ' + w.people.length + ' personas vivas'

  const porId = {}
  for (const p of w.places) {
    const def = D.lugares[p.slug]
    if (!def) continue
    porId[p.id] = { def, place: p }
    construirLugar(p.slug, def, p.name, p.description)
    const lb = etiqueta(p.name, 1.5)
    lb.position.set(def.x, def.alto + 3.6, def.z)
    scene.add(lb)
  }

  // La gente se para alrededor de su lugar. Determinista por índice: si no,
  // saltarían de posición en cada carga y el valle se sentiría inestable.
  const porLugar = {}
  for (const p of w.people) (porLugar[p.place_id] ??= []).push(p)

  for (const [placeId, lista] of Object.entries(porLugar)) {
    const info = porId[placeId]
    if (!info) continue
    lista.forEach((persona, i) => {
      const a = (i / Math.max(lista.length, 3)) * Math.PI * 2 + 0.6
      const r = 5.2
      const f = figura(0x8fa0a8, 1.7)
      f.position.set(info.def.x + Math.cos(a) * r, 0, info.def.z + Math.sin(a) * r)
      f.lookAt(info.def.x, 0, info.def.z)
      scene.add(f)
      const lb = etiqueta(persona.name, 0.85)
      lb.position.set(f.position.x, 2.5, f.position.z)
      scene.add(lb)
      gente.push({ f, lb, base: f.position.y, fase: i * 1.7 })
    })
  }

  const mi = porId[w.player.place_id]
  if (mi) {
    lugarActual = mi.place.slug
    const yo = figura(0x6fb99e, 1.85)
    yo.position.set(mi.def.x, 0, mi.def.z + 6.6)
    scene.add(yo)
    const lb = etiqueta(w.player.name, 1.05)
    lb.position.set(yo.position.x, 2.75, yo.position.z)
    scene.add(lb)
    jugador = { mesh: yo, lb }
    controls.target.copy(yo.position)
    camera.position.set(yo.position.x + 18, 22, yo.position.z + 24)
  }

  // Los lugares a los que se puede llegar caminando.
  for (const p of w.places) {
    const def = D.lugares[p.slug]
    if (def) destinos.push({ slug: p.slug, nombre: p.name, x: def.x, z: def.z })
  }

  document.getElementById('cargando').remove()
}

let lugarActual = null
let jugador = null
const destinos = []
let llegando = false

// Caminar. La cámara manda la dirección: W es "hacia donde estoy mirando",
// no "hacia el norte del mundo" — si no, girar la cámara invierte los controles
// y se siente roto.
const teclas = new Set()
const MAPA_TECLAS = {
  KeyW: 'arriba', ArrowUp: 'arriba', KeyS: 'abajo', ArrowDown: 'abajo',
  KeyA: 'izq', ArrowLeft: 'izq', KeyD: 'der', ArrowRight: 'der',
}
addEventListener('keydown', (e) => {
  const k = MAPA_TECLAS[e.code]
  if (k) { teclas.add(k); e.preventDefault() }
})
addEventListener('keyup', (e) => {
  const k = MAPA_TECLAS[e.code]
  if (k) teclas.delete(k)
})
addEventListener('blur', () => teclas.clear())

const VELOCIDAD = 11
const RADIO_LLEGADA = 5.5

function caminar(dt) {
  if (!jugador || llegando) return
  let x = 0, z = 0
  if (teclas.has('arriba')) z -= 1
  if (teclas.has('abajo')) z += 1
  if (teclas.has('izq')) x -= 1
  if (teclas.has('der')) x += 1
  if (!x && !z) return

  // Dirección relativa a la cámara, aplanada al piso.
  const adelante = new THREE.Vector3()
  camera.getWorldDirection(adelante)
  adelante.y = 0
  adelante.normalize()
  const derecha = new THREE.Vector3().crossVectors(adelante, new THREE.Vector3(0, 1, 0))

  const mov = new THREE.Vector3()
    .addScaledVector(adelante, -z)
    .addScaledVector(derecha, x)
    .normalize()
    .multiplyScalar(VELOCIDAD * dt)

  const p = jugador.mesh.position
  p.add(mov)
  const lejos = Math.hypot(p.x, p.z)
  if (lejos > 46) { p.x *= 46 / lejos; p.z *= 46 / lejos }  // el valle tiene borde

  jugador.mesh.rotation.y = Math.atan2(mov.x, mov.z)
  jugador.lb.position.set(p.x, 2.75, p.z)

  // La cámara sigue al jugador sin pelearse con el arrastre del mouse.
  controls.target.lerp(p, 0.12)

  // ¿Llegué a algún lado?
  for (const d of destinos) {
    if (d.slug === lugarActual) continue
    if (Math.hypot(p.x - d.x, p.z - d.z) < RADIO_LLEGADA) { llegar(d); break }
  }
}

async function llegar(d) {
  llegando = true
  const panel = document.getElementById('panel')
  document.getElementById('pnombre').textContent = 'Llegando a ' + d.nombre + '…'
  document.getElementById('pdesc').textContent = ''
  document.getElementById('pgente').textContent = ''
  panel.style.display = 'block'
  await fetch('/j/' + D.token + '/act', {
    method: 'POST',
    body: new URLSearchParams({ verb: 'ir', target: d.slug }),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  })
  location.reload()
}

// ── Otros jugadores, en vivo ──────────────────────────────────
// Supabase Realtime Presence: cada cliente publica su posición y recibe la de
// los demás. Sin servidor de juego, sin websockets propios. Para un puñado de
// amigos en una región alcanza de sobra — y es lo que hace que el valle se
// sienta habitado en vez de vacío.
const otros = new Map()
let canal = null
let miNombre = D.playerName

function iniciarPresencia() {
  if (!D.sb.url || !D.sb.anon) return
  const sb = createClient(D.sb.url, D.sb.anon, { realtime: { params: { eventsPerSecond: 8 } } })
  canal = sb.channel('valle', { config: { presence: { key: D.token.slice(0, 8) } } })

  canal.on('presence', { event: 'sync' }, () => {
    const estado = canal.presenceState()
    const vistos = new Set()
    for (const [clave, metas] of Object.entries(estado)) {
      if (clave === D.token.slice(0, 8)) continue
      const m = metas[metas.length - 1]
      if (!m || typeof m.x !== 'number') continue
      vistos.add(clave)
      let o = otros.get(clave)
      if (!o) {
        const f = figura(0xc9a34e, 1.85)
        const lb = etiqueta(m.nombre ?? 'alguien', 1.05)
        scene.add(f, lb)
        o = { f, lb, destino: new THREE.Vector3(m.x, 0, m.z) }
        otros.set(clave, o)
        f.position.set(m.x, 0, m.z)
      }
      o.destino.set(m.x, 0, m.z)
    }
    for (const [clave, o] of otros) {
      if (!vistos.has(clave)) { scene.remove(o.f, o.lb); otros.delete(clave) }
    }
    const n = otros.size
    document.getElementById('otros').textContent =
      n === 0 ? '' : n === 1 ? '1 persona más en el valle' : n + ' personas más en el valle'
  })

  canal.on('broadcast', { event: 'golpe' }, ({ payload }) => recibirGolpe(payload))

  canal.subscribe((estado) => {
    if (estado === 'SUBSCRIBED') publicar()
  })
}

function publicar() {
  if (!canal || !jugador) return
  canal.track({
    nombre: miNombre,
    x: Math.round(jugador.mesh.position.x * 10) / 10,
    z: Math.round(jugador.mesh.position.z * 10) / 10,
    vida,
  })
}

// ── Golpes ────────────────────────────────────────────────────
// Cada cliente aplica el daño a SU PROPIA vida cuando recibe un golpe
// dirigido a él. No es a prueba de tramposos —para eso el combate tendría
// que ser autoritativo del lado del servidor, que es otro proyecto— pero
// para jugar con amigos alcanza y no se puede romper mirando de afuera.

let vida = 100
let ultimoGolpe = 0
const ALCANCE = 4.2
const DANIO = 12
const ESPERA = 550

function pintarVida() {
  const barra = document.getElementById('vidabarra')
  const txt = document.getElementById('vidatxt')
  if (!barra) return
  barra.style.width = vida + '%'
  barra.style.background = vida > 50 ? '#6fb99e' : vida > 20 ? '#c9a34e' : '#ce8b84'
  txt.textContent = vida > 0 ? vida : 'caído'
}

function golpear() {
  if (!jugador || !canal) return
  const ahora = performance.now()
  if (ahora - ultimoGolpe < ESPERA || vida <= 0) return
  ultimoGolpe = ahora

  let objetivo = null
  let masCerca = ALCANCE
  for (const [clave, o] of otros) {
    const d = o.f.position.distanceTo(jugador.mesh.position)
    if (d < masCerca) { masCerca = d; objetivo = clave }
  }

  // El swing se ve aunque no le pegues a nadie.
  jugador.mesh.scale.set(1.18, 0.9, 1.18)
  setTimeout(() => jugador && jugador.mesh.scale.set(1, 1, 1), 130)

  if (!objetivo) return
  canal.send({
    type: 'broadcast', event: 'golpe',
    payload: { a: objetivo, de: miNombre, danio: DANIO },
  })
}

function recibirGolpe(p) {
  if (p.a !== D.token.slice(0, 8)) return
  vida = Math.max(0, vida - p.danio)
  pintarVida()
  const flash = document.getElementById('flash')
  flash.style.opacity = '0.55'
  setTimeout(() => (flash.style.opacity = '0'), 130)
  if (vida === 0) caer(p.de)
  publicar()
}

async function caer(porQuien) {
  const panel = document.getElementById('panel')
  document.getElementById('pnombre').textContent = 'Te tumbó ' + porQuien
  document.getElementById('pdesc').textContent =
    'No perdiste nada de lo que sabés — eso vive en tu cabeza. Te levantás en Vado Bajo.'
  document.getElementById('pgente').textContent = ''
  panel.style.display = 'block'
  await new Promise((r) => setTimeout(r, 2600))
  await fetch('/j/' + D.token + '/act', {
    method: 'POST',
    body: new URLSearchParams({ verb: 'ir', target: 'aldea' }),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  })
  location.reload()
}

addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); golpear() }
})
setInterval(publicar, 220)
addEventListener('beforeunload', () => canal && canal.untrack())

const ray = new THREE.Raycaster()
const puntero = new THREE.Vector2()
let arrastro = false
addEventListener('pointerdown', () => { arrastro = false })
addEventListener('pointermove', () => { arrastro = true })
addEventListener('pointerup', (e) => {
  if (arrastro) return
  puntero.x = (e.clientX / innerWidth) * 2 - 1
  puntero.y = -(e.clientY / innerHeight) * 2 + 1
  ray.setFromCamera(puntero, camera)
  const hit = ray.intersectObjects(clicables)[0]
  const panel = document.getElementById('panel')
  if (hit) {
    const u = hit.object.userData
    document.getElementById('pnombre').textContent = u.nombre
    document.getElementById('pdesc').textContent = u.descripcion
    const gente = document.getElementById('pgente')
    if (u.slug === lugarActual) {
      gente.innerHTML = 'Estás acá.'
    } else {
      gente.innerHTML = '<button id="irbtn">Ir a ' + u.nombre + '</button>'
      document.getElementById('irbtn').onclick = () => irA(u.slug, u.nombre)
    }
    panel.style.display = 'block'
  } else panel.style.display = 'none'
})


async function irA(slug, nombre) {
  const btn = document.getElementById('irbtn')
  btn.disabled = true
  btn.textContent = 'yendo a ' + nombre + '…'
  const cuerpo = new URLSearchParams({ verb: 'ir', target: slug })
  await fetch('/j/' + D.token + '/act', {
    method: 'POST', body: cuerpo,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  })
  location.reload()
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

const reloj = new THREE.Clock()
function animar() {
  requestAnimationFrame(animar)
  const dt = Math.min(reloj.getDelta(), 0.05)
  const t = reloj.getElapsedTime()
  caminar(dt)
  for (const g of gente) {
    g.f.position.y = g.base + Math.sin(t * 1.5 + g.fase) * 0.045
    g.lb.position.y = g.f.position.y + (g.base ? 2.75 : 2.5)
  }
  // Los otros jugadores se interpolan hacia su última posición conocida: sin
  // esto se teletransportan cada 220ms y se ve horrible.
  for (const o of otros.values()) {
    o.f.position.lerp(o.destino, 0.18)
    o.f.position.y = Math.sin(t * 1.5) * 0.045
    o.lb.position.set(o.f.position.x, o.f.position.y + 2.75, o.f.position.z)
  }

  const fr = gruposLugar.fragua
  if (fr && fr.userData.fuego) {
    const p = 0.82 + Math.sin(t * 7) * 0.1 + Math.sin(t * 13.3) * 0.07
    fr.userData.fuego.intensity = 26 * p
    fr.userData.brasa.scale.setScalar(0.9 + p * 0.2)
  }
  controls.update()
  renderer.render(scene, camera)
}

cargar().then(()=>{ pintarVida(); iniciarPresencia(); animar() }).catch((e) => {
  document.getElementById('cargando').textContent = 'no se pudo cargar: ' + e.message
})
</script>
</body></html>`
}
