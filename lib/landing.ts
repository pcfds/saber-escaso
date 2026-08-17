/**
 * La landing pública. Es lo primero que ve alguien que no sabe nada del juego.
 *
 * Reglas que se siguieron acá, y que conviene no romper al editarla:
 *  - **Todo lo que dice sale de DISENO.md y de ROADMAP.md.** Nada de features
 *    que no existan: la sección "Lo que es hoy" copia el estado real, incluida
 *    la parte fea. Un juego indie que miente en la landing se quema con su
 *    primera oleada de jugadores.
 *  - **Un archivo, cero dependencias.** CSS embebido, sin CDN, sin fuentes
 *    externas, sin JS. Se sirve igual desde Vercel que desde un `file://`.
 *  - **Paleta del valle:** frío al atardecer, y la brasa de la fragua como
 *    único acento cálido. Todos los colores se definen en `:root` y el modo
 *    oscuro sólo los reemplaza; ninguno vive únicamente adentro del
 *    `@media`, que es como se termina con texto de un tema sobre el fondo del
 *    otro.
 *  - **El botón de descarga entra en el primer scroll.** Si algún día el hero
 *    crece, lo que se recorta es el texto, no el botón.
 */

const DESCARGA = 'https://github.com/pcfds/saber-escaso-godot/releases/tag/v0.1.0-demo'
const REPO_SERVIDOR = 'https://github.com/pcfds/saber-escaso'
const REPO_CLIENTE = 'https://github.com/pcfds/saber-escaso-godot'

export function landing(): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Saber Escaso</title>
<meta name="description" content="Un mundo de fantasía donde el conocimiento vive en gente que se muere. Demo temprana para Windows.">
<meta name="color-scheme" content="light dark">
<meta property="og:title" content="Saber Escaso">
<meta property="og:description" content="Un mundo de fantasía donde el conocimiento vive en gente que se muere.">
<meta property="og:type" content="website">
<style>
  :root{
    --fondo:#e4e8e7;
    --fondo-hero:#d7dcdc;
    --cielo:#c3ccce;
    --panel:#eef1f0;
    --linea:#c2c9c7;
    --linea-suave:#d3d9d7;
    --texto:#161d20;
    --tenue:#525d60;
    --brasa:#9d3a10;
    --brasa-viva:#c2521c;
    --brasa-boton:#a33d11;
    --brasa-tinta:#fdf4ee;
    --resplandor:rgba(157,58,16,.16);
    --serif:"Iowan Old Style",Palatino,"Palatino Linotype",Georgia,serif;
    --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  }
  @media (prefers-color-scheme: dark){
    :root{
      --fondo:#0e1417;
      --fondo-hero:#0a1013;
      --cielo:#141d22;
      --panel:#131a1d;
      --linea:#25302f;
      --linea-suave:#1b2326;
      --texto:#dbe2de;
      --tenue:#939d9a;
      --brasa:#e8834a;
      --brasa-viva:#f0955f;
      --brasa-boton:#dd6c2e;
      --brasa-tinta:#120e0b;
      --resplandor:rgba(232,131,74,.14);
    }
  }

  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{
    margin:0;
    background-color:var(--fondo);
    color:var(--texto);
    font:17px/1.6 var(--serif);
    overflow-x:hidden;
  }
  a{color:var(--brasa);text-underline-offset:3px;text-decoration-thickness:1px}
  a:hover{color:var(--brasa-viva)}
  strong{font-weight:600}

  .col{width:100%;max-width:44rem;margin:0 auto;padding:0 clamp(20px,5vw,32px)}

  /* ---- hero: el valle al atardecer, la brasa abajo a la izquierda ---- */
  .hero{
    background-color:var(--fondo-hero);
    background-image:
      radial-gradient(60rem 22rem at 8% 118%, var(--resplandor), transparent 70%),
      linear-gradient(to bottom, var(--cielo) 0%, var(--fondo-hero) 62%);
    border-bottom:1px solid var(--linea);
    padding:clamp(40px,9vh,80px) 0 clamp(32px,6vh,56px);
  }
  .marca{
    font:12px/1 var(--mono);
    letter-spacing:.18em;
    text-transform:uppercase;
    color:var(--tenue);
    margin:0 0 clamp(20px,5vh,36px);
  }
  h1{
    font-size:clamp(38px,10vw,68px);
    line-height:1.02;
    letter-spacing:-.02em;
    font-weight:600;
    margin:0 0 18px;
  }
  .gancho{
    font-size:clamp(20px,4.4vw,26px);
    line-height:1.35;
    margin:0 0 16px;
    max-width:26ch;
  }
  .hero p.bajada{
    color:var(--tenue);
    margin:0 0 clamp(26px,5vh,34px);
    max-width:54ch;
  }

  .descarga{
    display:flex;
    flex-wrap:wrap;
    align-items:center;
    gap:14px 20px;
  }
  .boton{
    display:inline-block;
    background:var(--brasa-boton);
    color:var(--brasa-tinta);
    font:600 18px/1 var(--serif);
    letter-spacing:.01em;
    padding:16px 26px;
    border:1px solid var(--brasa-boton);
    border-radius:2px;
    text-decoration:none;
    box-shadow:0 0 0 0 var(--resplandor);
    transition:box-shadow .15s ease, transform .15s ease;
  }
  .boton:hover{
    color:var(--brasa-tinta);
    box-shadow:0 0 28px 2px var(--resplandor);
    transform:translateY(-1px);
  }
  .boton:focus-visible{outline:2px solid var(--texto);outline-offset:3px}
  .ficha{
    font:12px/1.7 var(--mono);
    letter-spacing:.08em;
    text-transform:uppercase;
    color:var(--tenue);
  }
  .aviso{
    margin:18px 0 0;
    font-size:15px;
    color:var(--tenue);
    max-width:52ch;
    border-left:2px solid var(--linea);
    padding-left:14px;
  }

  /* ---- secciones ---- */
  section{padding:clamp(38px,7vh,64px) 0;border-bottom:1px solid var(--linea-suave)}
  h2{
    font:12px/1 var(--mono);
    letter-spacing:.18em;
    text-transform:uppercase;
    color:var(--tenue);
    font-weight:400;
    margin:0 0 22px;
  }
  h2::after{
    content:"";
    display:block;
    width:34px;
    height:2px;
    background:var(--brasa);
    margin-top:10px;
  }
  section > .col > p{max-width:56ch}
  p{margin:0 0 16px}
  p:last-child{margin-bottom:0}

  dl{margin:0;display:grid;grid-template-columns:1fr;gap:0}
  dt{
    font-size:19px;
    font-weight:600;
    line-height:1.3;
    margin:0;
    padding-top:18px;
    border-top:1px solid var(--linea-suave);
  }
  dl > dt:first-of-type{border-top:0;padding-top:0}
  dd{margin:6px 0 18px;color:var(--tenue);max-width:56ch}
  dl > dd:last-of-type{margin-bottom:0}
  @media (min-width:44rem){
    dl{grid-template-columns:15rem 1fr}
    dt{padding-right:24px}
    dd{margin:0;padding-top:18px;border-top:1px solid var(--linea-suave)}
    dl > dd:first-of-type{border-top:0;padding-top:0}
  }

  ul.roto{list-style:none;margin:0 0 20px;padding:0;max-width:58ch}
  ul.roto li{
    position:relative;
    padding:0 0 0 20px;
    margin:0 0 10px;
    color:var(--tenue);
  }
  ul.roto li::before{
    content:"";
    position:absolute;
    left:0;
    top:.72em;
    width:9px;
    height:1px;
    background:var(--brasa);
  }
  ul.roto li strong{color:var(--texto)}

  .noexiste{
    background:var(--panel);
    border-left:2px solid var(--linea);
    padding:16px 18px;
    color:var(--tenue);
    font-size:16px;
    max-width:58ch;
  }
  .noexiste b{color:var(--texto);font-weight:600}

  ol.tramos{list-style:none;margin:0;padding:0;counter-reset:tramo}
  ol.tramos li{
    counter-increment:tramo;
    display:grid;
    grid-template-columns:2.6rem 1fr;
    gap:0 14px;
    padding:14px 0;
    border-top:1px solid var(--linea-suave);
    max-width:58ch;
  }
  ol.tramos li:first-child{border-top:0;padding-top:0}
  ol.tramos li::before{
    content:counter(tramo,decimal-leading-zero);
    font:13px/1.7 var(--mono);
    color:var(--brasa);
    letter-spacing:.06em;
  }
  ol.tramos b{font-weight:600;display:block}
  ol.tramos span{color:var(--tenue);display:block;margin-top:2px}

  ol.pasos{margin:0;padding-left:1.3em;max-width:56ch}
  ol.pasos li{margin:0 0 14px;padding-left:6px}
  ol.pasos li:last-child{margin-bottom:0}
  ol.pasos span{color:var(--tenue);display:block;font-size:16px}

  .cierre{display:flex;flex-wrap:wrap;align-items:center;gap:14px 20px;margin-top:26px}

  footer{padding:clamp(32px,6vh,52px) 0 clamp(44px,8vh,72px);color:var(--tenue);font-size:15px}
  footer p{max-width:56ch}
  footer .repos{font:12px/2 var(--mono);letter-spacing:.06em;text-transform:uppercase}
  footer .repos a{display:inline-block;margin-right:22px}
</style>
</head>
<body>

<header class="hero">
  <div class="col">
    <p class="marca">Demo temprana · Windows</p>
    <h1>Saber Escaso</h1>
    <p class="gancho">Un mundo de fantasía donde el conocimiento vive en gente que se muere.</p>
    <p class="bajada">Si el último que sabe forjar se va sin enseñarle a nadie, no vuelve a haber
      una hoja nueva. Nunca. Todo lo demás —el combate, los oficios, la gente— existe para que eso
      se sienta.</p>
    <div class="descarga">
      <a class="boton" href="${DESCARGA}">Descargar la demo</a>
      <span class="ficha">Windows · 37 MB · v0.1.0</span>
    </div>
    <p class="aviso">Todavía no hay cuentas. Para entrar hace falta un link de jugador, y por
      ahora se pide: cada uno se reparte a mano.</p>
  </div>
</header>

<main>

<section>
  <div class="col">
    <h2>Lo que ya anda</h2>
    <dl>
      <dt>El mundo avanza aunque no estés</dt>
      <dd>Los NPCs siguen con lo suyo mientras no jugás. Sin nadie conectado el valle no se
        pausa: va a un cuarto de velocidad. Cuando volvés, encontrás otra cosa.</dd>

      <dt>La gente te recuerda</dt>
      <dd>Cada NPC tiene sus propias metas: las persigue, avanza y se traba solo. Lo que hiciste
        queda anotado y lo tiene en cuenta la próxima vez.</dd>

      <dt>El saber se aprende de una persona</dt>
      <dd>Y se pierde con la última que lo tenía. En una corrida de prueba se murió la vieja Ren
        y se llevó las dos runas del valle. Nadie lo guionó.</dd>

      <dt>Un objeto sólo existe si alguien sabe hacerlo</dt>
      <dd>No hay tienda ni cosas que caen de la nada. La receta es parte de lo que alguien sabe,
        y se muere con esa persona.</dd>

      <dt>Reputación de dos ejes</dt>
      <dd>Te valoran y te temen por separado. Una sola barra no puede expresar “lo respetan y le
        tienen terror”.</dd>

      <dt>Una hora real es un día del valle</dt>
      <dd>El mundo corre contra el reloj del servidor, así que el sol es el mismo para todos los
        que están conectados.</dd>
    </dl>
  </div>
</section>

<section>
  <div class="col">
    <h2>Lo que es hoy</h2>
    <p>Es una demo temprana y se nota. Esto está roto o a medias, y va acá para que no lo
      descubras adentro:</p>
    <ul class="roto">
      <li><strong>El combate está partido en dos.</strong> Existe en el servidor y existe en el
        cliente, y no son el mismo combate.</li>
      <li><strong>Los monstruos que ves son locales.</strong> Las amenazas reales del mundo
        todavía no se dibujan.</li>
      <li><strong>El inventario existe en la base y no se ve en pantalla.</strong></li>
      <li><strong>Los NPCs hablan con una sola voz</strong> y no recuerdan lo conversado.</li>
      <li><strong>No ves a los otros jugadores</strong> dentro del valle.</li>
    </ul>
    <p class="noexiste"><b>No existe todavía:</b> cuentas · un personaje con cara y stats ·
      construir · quests que puedas tomar · mazmorras · robar · horarios de NPC · inglés.</p>
  </div>
</section>

<section>
  <div class="col">
    <h2>Hacia dónde va — nada de esto está hecho</h2>
    <p>Es el orden en el que se va a intentar, no una promesa de fecha. Cada tramo tiene que
      dejar algo jugable la misma noche.</p>
    <ol class="tramos">
      <li><b>Que el cliente y el mundo sean la misma cosa</b>
        <span>Hoy son dos mitades que se tocan sólo en el diálogo. Acá estamos.</span></li>
      <li><b>Que los NPCs sean personas</b>
        <span>Voz propia, memoria de lo conversado, cara y horarios.</span></li>
      <li><b>Razones para volver mañana</b>
        <span>Tomar agendas como quests, una mazmorra, construir, robar.</span></li>
      <li><b>Que entre gente que no conocés</b>
        <span>Cuentas, invitaciones, inglés.</span></li>
      <li><b>Steam</b>
        <span>Wishlist antes que campaña, y ninguna de las dos antes de que alguien vuelva tres
          días seguidos.</span></li>
    </ol>
  </div>
</section>

<section>
  <div class="col">
    <h2>Cómo entrar</h2>
    <ol class="pasos">
      <li>Bajá la demo.
        <span>Windows, 37 MB. Es un ejecutable que se abre con doble clic.</span></li>
      <li>Pedí un link de jugador.
        <span>No hay registro ni contraseña: cada persona entra con un link privado que se
          reparte a mano.</span></li>
      <li>Entrás al valle en el día que va.
        <span>El mundo viene corriendo de antes. No arranca con vos.</span></li>
    </ol>
    <div class="cierre">
      <a class="boton" href="${DESCARGA}">Descargar la demo</a>
      <span class="ficha">Windows · 37 MB · v0.1.0</span>
    </div>
  </div>
</section>

</main>

<footer>
  <div class="col">
    <p>Los dos repos son públicos: adentro está el mundo, el director de IA y el cliente, con la
      deuda anotada donde la dejamos.</p>
    <p class="repos">
      <a href="${REPO_SERVIDOR}">Servidor</a>
      <a href="${REPO_CLIENTE}">Cliente</a>
    </p>
  </div>
</footer>

</body>
</html>
`
}
