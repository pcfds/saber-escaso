/**
 * La landing del juego.
 *
 * Dos cosas que se aprendieron a los golpes escribiéndola:
 *
 * 1. **La visión va adentro.** La primera versión sólo listaba lo que ya
 *    funcionaba, por honestidad, y quedó un changelog. Una landing de juego
 *    tiene que contar el juego que estás haciendo — mazmorras, construir,
 *    aventuras con amigos, un mundo que sigue sin vos — y marcar con todas las
 *    letras qué está hecho y qué no. Honesto no es callarse la ambición: es no
 *    mentir sobre en qué punto está.
 *
 * 2. **Nada de grid ingenioso.** La versión anterior usaba un `<dl>` a dos
 *    columnas que colapsó y dejó el texto cortado en una palabra por renglón.
 *    Acá: una columna, ancho máximo, y punto. En una página que casi todo el
 *    mundo va a ver una sola vez, aburrido y correcto le gana a vistoso y roto.
 */

const DESCARGA = 'https://github.com/pcfds/saber-escaso-godot/releases/tag/v0.1.0-demo'

export function landing(): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Saber Escaso</title>
<meta name="description" content="Un mundo de fantasía donde el conocimiento vive en gente que se muere.">
<meta name="color-scheme" content="light dark">
<meta property="og:title" content="Saber Escaso">
<meta property="og:description" content="Un mundo de fantasía donde el conocimiento vive en gente que se muere.">
<meta property="og:type" content="website">
<style>
  :root {
    --fondo:  #e6e9e7;
    --alto:   #f2f4f2;
    --tinta:  #14191b;
    --suave:  #4d5658;
    --tenue:  #7c8688;
    --linea:  #cdd3d1;
    --brasa:  #9d3a10;
    --serif:  "Iowan Old Style", Palatino, "Palatino Linotype", Georgia, serif;
    --mono:   ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --fondo:  #0e1315;
      --alto:   #141a1c;
      --tinta:  #dfe5e1;
      --suave:  #9aa4a1;
      --tenue:  #6e7876;
      --linea:  #232c2e;
      --brasa:  #e8834a;
    }
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    background: var(--fondo);
    color: var(--tinta);
    font-family: var(--serif);
    font-size: 17px;
    line-height: 1.65;
  }
  .hoja { max-width: 44rem; margin: 0 auto; padding: 0 1.35rem 6rem; }

  h1, h2, h3 { text-wrap: balance; margin: 0; font-weight: 600; }
  h1 { font-size: clamp(2.6rem, 9vw, 4rem); line-height: 1; letter-spacing: -0.03em; }
  h2 { font-size: clamp(1.3rem, 4vw, 1.6rem); line-height: 1.2; letter-spacing: -0.01em; }
  h3 { font-size: 1rem; }
  p { margin: 0 0 1rem; }
  p:last-child { margin-bottom: 0; }
  a { color: var(--brasa); }

  .rotulo {
    font-family: var(--mono); font-size: 0.66rem; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--tenue);
    margin: 0 0 0.9rem;
  }

  /* ── portada ───────────────────────────────────────── */
  header {
    padding: clamp(3rem, 11vh, 6rem) 0 clamp(2.5rem, 7vh, 4rem);
    border-bottom: 1px solid var(--linea);
  }
  .tesis {
    font-size: clamp(1.2rem, 3.6vw, 1.55rem);
    line-height: 1.45;
    color: var(--suave);
    margin: 1.4rem 0 0;
    max-width: 30ch;
  }
  .tesis b { color: var(--tinta); font-weight: 600; }

  .bajar { margin-top: 2.4rem; }
  .boton {
    display: inline-block;
    background: var(--brasa);
    color: #fdf5f0;
    font-family: var(--mono);
    font-size: 0.82rem; letter-spacing: 0.09em; text-transform: uppercase;
    text-decoration: none;
    padding: 0.95rem 1.7rem;
    border-radius: 2px;
  }
  .boton:hover, .boton:focus-visible { filter: brightness(1.12); }
  .bajo-boton { font-size: 0.87rem; color: var(--tenue); margin: 0.85rem 0 0; max-width: 44ch; }

  /* ── secciones ─────────────────────────────────────── */
  section { padding: clamp(2.4rem, 6vh, 3.6rem) 0; border-bottom: 1px solid var(--linea); }
  section p, section li { max-width: 60ch; }

  .lista { list-style: none; margin: 1.3rem 0 0; padding: 0; }
  .lista li { margin: 0 0 1.15rem; padding-left: 1.15rem; position: relative; }
  .lista li:last-child { margin-bottom: 0; }
  .lista li::before {
    content: ""; position: absolute; left: 0; top: 0.72em;
    width: 5px; height: 5px; background: var(--brasa); border-radius: 50%;
  }
  .lista b { font-weight: 600; }
  .lista .nota { color: var(--suave); }

  .falta li::before { background: none; border: 1px solid var(--tenue); width: 4px; height: 4px; }
  .falta li { color: var(--suave); margin-bottom: 0.7rem; }

  .aviso {
    background: var(--alto); border-left: 2px solid var(--brasa);
    padding: 1rem 1.15rem; margin: 1.4rem 0 0;
    font-size: 0.94rem; color: var(--suave);
  }

  .pasos { margin: 1.3rem 0 0; padding-left: 1.4rem; }
  .pasos li { margin-bottom: 0.7rem; }

  footer { padding: 2.4rem 0; color: var(--tenue); font-size: 0.87rem; }
  footer a { color: var(--suave); }
</style>
</head>
<body>
<div class="hoja">

<header>
  <p class="rotulo">Demo temprana · Windows · gratis</p>
  <h1>Saber Escaso</h1>
  <p class="tesis">Un mundo de fantasía donde el conocimiento vive en gente que se muere.
  <b>Si el último que sabe forjar se va sin enseñarle a nadie, no vuelve a haber una hoja nueva. Nunca.</b></p>
  <div class="bajar">
    <a class="boton" href="${DESCARGA}">Bajar la demo</a>
    <p class="bajo-boton">Windows, 37&nbsp;MB. Necesitás un link de jugador para entrar:
    lo sacás en <a href="/entrar">esta página</a> y es tuyo, nadie más puede usarlo.</p>
  </div>
</header>

<section>
  <p class="rotulo">El juego</p>
  <h2>Un valle que sigue su vida mientras no estás</h2>
  <p>Entrás una hora, no ocho. Cuando volvés al otro día, la herrera consiguió el
  carbón que buscaba, alguien le enseñó a alguien, y hay una casa donde antes no
  había. Nada de eso lo escribió un guionista: el mundo corre en un servidor y
  avanza igual con vos o sin vos. Si no hay nadie conectado va más lento, pero
  no se detiene.</p>
  <ul class="lista">
    <li><b>Aprendés de personas, no de menús.</b> Nadie nace sabiendo y no hay
    recetas tiradas en un cofre. Alguien tiene que enseñarte, y para eso tiene
    que confiar en vos. <span class="nota">Después mejorás haciéndolo: la
    primera hoja que forjás es un fierro torcido.</span></li>

    <li><b>Los NPCs se acuerdan de vos.</b> De lo que hiciste y de lo que
    hablaron. Cada uno tiene su historia, su forma de hablar y sus propias
    metas, y te valora o te teme por separado — se puede respetar a alguien y
    tenerle terror al mismo tiempo.</li>

    <li><b>Las aventuras salen de la gente.</b> Las metas que los NPCs
    persiguen solos son las quests: podés tomarlas, o dejar que se resuelvan
    sin vos y perderte lo que había del otro lado.</li>

    <li><b>Los que no son humanos tampoco son bichos.</b> Son pueblos, con
    lengua propia y con motivos. Atacan por algo que les hicimos. Si aprendés
    su lengua podés negociar en vez de matar — y saben cosas que ningún humano
    del valle sabe.</li>

    <li><b>Construís.</b> Una casa, después un pueblo, después lo que aguantes
    sostener. Podés levantarlo vos o pagarle a alguien para que lo levante.</li>

    <li><b>Con amigos, y en el mundo de otros.</b> Podés viajar a la parte del
    mundo de otro jugador, quedarte, construir ahí. Nada es inviolable, tampoco
    lo tuyo. El PvP es opcional.</li>

    <li><b>Nada de grindeo.</b> Si la respuesta a "qué hago hoy" es "lo de ayer
    pero más veces", está mal diseñado y lo cambiamos.</li>
  </ul>
</section>

<section>
  <p class="rotulo">Estado real</p>
  <h2>Qué podés hacer hoy, en esta demo</h2>
  <p>Es una demo temprana de verdad, no un demo de prensa. Esto es lo que ya
  funciona y se puede jugar:</p>
  <ul class="lista">
    <li>Caminar el valle en 3D, con día y noche: <b>una hora real es un día del
    valle</b>, y el sol que ves es el mismo que ven todos los conectados.</li>
    <li>Hablarles a los habitantes <b>escribiéndoles lo que se te cante</b>, y
    que te contesten en personaje, acordándose de lo anterior.</li>
    <li>Aprender un oficio de alguien que confíe en vos, y enseñárselo a otro.</li>
    <li>Fabricar cosas — y sólo podés fabricar lo que alguien te enseñó.</li>
    <li>Pelear con lo que ronda el bosque, con lo que hayas forjado.</li>
    <li>Leer la crónica de lo que pasó en el valle mientras no estabas.</li>
  </ul>
  <div class="aviso">
    Y ya pasó de verdad: el día 10, la vieja Ren se murió y se llevó las dos
    únicas runas que había en el valle. Nadie lo guionó. Nadie las va a poder
    aprender nunca más.
  </div>
</section>

<section>
  <p class="rotulo">Honestidad</p>
  <h2>Qué todavía no está</h2>
  <p>Todo lo de arriba está en camino, pero hoy no lo vas a encontrar en la demo:</p>
  <ul class="lista falta">
    <li>Mazmorras.</li>
    <li>Construir.</li>
    <li>Tomar las metas de los NPCs como quests tuyas.</li>
    <li>Ver a los otros jugadores caminando por el valle.</li>
    <li>Hablar la lengua de los pueblos que te atacan.</li>
    <li>Cuentas: por ahora el link de jugador se saca a mano.</li>
    <li>Inglés.</li>
  </ul>
</section>

<section>
  <p class="rotulo">Empezar</p>
  <h2>Cómo entrar</h2>
  <ol class="pasos">
    <li>Sacá tu link de jugador en <a href="/entrar">esta página</a>. Guardalo:
    ese link <em>es</em> tu personaje y nadie más puede entrar con él.</li>
    <li><a href="${DESCARGA}">Bajá la demo</a> y abrí <code>SaberEscaso.exe</code>.</li>
    <li>Pegá el link la primera vez. Después entra solo.</li>
  </ol>
  <p class="bajo-boton" style="margin-top:1.3rem">WASD para caminar · espacio para
  saltar · E para hablar · clic para pegar · botón derecho para girar la cámara ·
  rueda para acercar.</p>
  <div class="bajar"><a class="boton" href="${DESCARGA}">Bajar la demo</a></div>
</section>

<footer>
  Hecho a la vista de todos: el
  <a href="https://github.com/pcfds/saber-escaso">servidor</a> y el
  <a href="https://github.com/pcfds/saber-escaso-godot">cliente</a> son
  públicos.
</footer>

</div>
</body>
</html>`
}
