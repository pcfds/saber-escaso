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

import { bannerValle, diagramaSaber, bannerCielo } from './arte.js'

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

    /* Los colores de las ilustraciones. Van acá y no adentro del SVG para que
       cambien con el tema como cualquier otra cosa de la página. */
    /* Los cinco planos van de claro y azulado a oscuro y cálido: eso es la
       perspectiva atmosférica, y es lo que hace que el paisaje tenga fondo. */
    --cielo-alto:    #4a5f74;
    --cielo-medio:   #8a8a91;
    --cielo-bajo:    #c99a72;
    --horizonte:     #e8bc8a;
    --sol:           #ffd9a8;
    --bruma:         #cbb49c;
    --lejos1:        #7d8c9a;
    --lejos2:        #63727f;
    --lejos3:        #4a5762;
    --lejos4:        #343f48;
    --suelo:         #262f36;
    --cerca:         #141a1f;
    --luna:          #f4f1e8;
    --noche-alto:    #0d1420;
    --noche-bajo:    #17202c;
    --noche-horiz:   #232d3a;
    --noche-suelo:   #0a0f15;
    --planeta:       #8d7354;
    --planeta-banda: #c9ac7e;
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

      --cielo-alto:    #182534;
      --cielo-medio:   #3d4550;
      --cielo-bajo:    #7a5540;
      --horizonte:     #a56a3c;
      --sol:           #ffcb8f;
      --bruma:         #5a5449;
      --lejos1:        #33414f;
      --lejos2:        #283440;
      --lejos3:        #1e2831;
      --lejos4:        #161e25;
      --suelo:         #101820;
      --cerca:         #070c11;
      --luna:          #ece9df;
      --noche-alto:    #05080e;
      --noche-bajo:    #0b1119;
      --noche-horiz:   #121a24;
      --noche-suelo:   #04070a;
      --planeta:       #7d6549;
      --planeta-banda: #b39a74;
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

  .lienzo {
    display: block; width: 100%; height: auto; border-radius: 3px;
    border: 1px solid var(--linea);
  }
  .lienzo-chico { border: none; background: none; }
  .lienzo-cielo { margin-top: 1.6rem; }
  .pie {
    font-family: var(--mono); font-size: 13px; fill: var(--tenue);
    letter-spacing: 0.04em;
  }
  .pie-brasa { fill: var(--brasa); }
  .marco { margin: 2rem 0 0; }
  .epigrafe {
    font-size: 0.84rem; color: var(--tenue); margin: 0.6rem 0 0;
    font-family: var(--mono); letter-spacing: 0.03em;
  }

  footer { padding: 2.4rem 0; color: var(--tenue); font-size: 0.87rem; }
  footer a { color: var(--suave); }
</style>
</head>
<body>
<div class="hoja">

<div class="marco" style="margin-top:1.5rem">${bannerValle()}</div>

<header style="padding-top:clamp(2rem,6vh,3.5rem)">
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
  </ul>

  <div class="marco">${diagramaSaber()}
    <p class="epigrafe">Cuando se muere el último que sabe algo, ese saber se va del mundo. No hay wiki que lo devuelva.</p>
  </div>

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
    <li>Caminar el valle en 3D, con bosque, río y montañas, y con día y noche:
    <b>seis horas reales son un día del valle</b>, y el sol que ves es el mismo
    que ven todos los conectados. La fase de la luna te dice qué día va.</li>
    <li>Hablarles a los habitantes <b>escribiéndoles lo que se te cante</b>, y
    que te contesten en personaje, acordándose de lo anterior. Y que te
    reconozcan al pasar, cada uno según cuánto te conoce.</li>
    <li>Aprender un oficio de alguien que confíe en vos — y ganarte esa
    confianza primero, que no es gratis. Después enseñárselo a otro.</li>
    <li>Fabricar cosas. Sólo podés hacer lo que alguien te enseñó, y
    <b>cuanto más lo hacés, mejor te sale</b>: tu primera hoja es un fierro
    torcido.</li>
    <li>Pelear con lo que ronda el bosque, con lo que hayas forjado — y que se
    metan a defenderte los que te aprecian de verdad. Lo que te ataca
    <b>se encabrita antes de pegarte</b>, y si te apartás a tiempo no te pega.
    Y tiene nombre propio: no es «un bicho», es el Hermano Mayor, de Los de la
    Ceniza.</li>
    <li><b>Entrar a las casas.</b> Al anochecer la gente se vuelve a la suya, y
    si entrás está ahí adentro. Cada cuarto tiene el puesto del oficio del que
    vive en él — el yunque, la olla, la piedra de afilar— y es donde el oficio
    pasa.</li>
    <li><b>Trazar magia.</b> Cuatro runas y una gramática: cada una es materia
    cuando va primera y operador cuando va detrás, así que el orden cambia el
    hechizo. Te colgás tres a la mañana y la frase se va armando mientras
    elegís. El grimorio guarda sólo lo que te salió a vos.</li>
    <li>Que <b>te hablen ellos</b>: si te encargaste de algo y no volviste, te
    lo cobran; si les falta algo y confían en vos, te lo piden.</li>
    <li><b>Cruzarte con los otros jugadores</b> que estén en el valle en ese
    momento.</li>
    <li>Leer la crónica de lo que pasó mientras no estabas.</li>
  </ul>
  <div class="marco">${bannerCielo()}
    <p class="epigrafe">Dos lunas y un gigante gaseoso. El cielo no es decoración: es el reloj compartido del valle.</p>
  </div>

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
    <li><b>Tomar las metas de los NPCs como quests tuyas.</b> Existe en el
    mundo —Odila anda buscando raíz del Sotobosque hace días— pero todavía no
    se puede agarrar desde el juego.</li>
    <li>Que los NPCs caminen de un lugar a otro. Se mueven dentro del suyo y se
    vuelven a su casa de noche, pero el viaje en sí todavía no se ve.</li>
    <li>Hablar la lengua de los pueblos que te atacan.</li>
    <li>Mover, agarrar o construir cosas adentro de las casas: se entra y se
    mira, no se toca.</li>
    <li>Que los animales del valle sean animales. Hoy son decorado.</li>
    <li>Cuentas: por ahora el link de jugador se saca a mano.</li>
    <li>Inglés.</li>
  </ul>
  <p>Y una que no es una función que falta sino una decisión que todavía no
  está tomada: <b>el aspecto</b>. El valle se lee, tiene hora y tiene silueta,
  pero no tiene todavía una identidad visual de la que estemos convencidos. Es
  el reclamo más viejo del proyecto y sigue abierto.
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
  saltar · E para hablar o trabajar · clic para pegar · Q para esquivar ·
  P, R y G para la magia · botón derecho <b>arrastrando</b> para girar la cámara
  y mirar el cielo ·
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
