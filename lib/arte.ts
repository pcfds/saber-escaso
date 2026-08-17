/**
 * Las ilustraciones de la landing, dibujadas en SVG.
 *
 * Por qué SVG y no capturas del juego: nadie del equipo puede ver el juego
 * corriendo —Godot corre por software y sin GPU en la máquina donde se
 * desarrolla— así que no hay capturas hasta que las saque quien lo juega.
 * Poner una imagen de relleno en una landing es peor que no poner ninguna.
 *
 * Y hay una razón que sobrevive a las capturas: **estas ilustraciones dicen
 * cosas que una captura no dice.** La del cielo muestra las dos lunas y el
 * planeta juntos, que en el juego sólo se ven de noche. La del saber muestra
 * una cadena de enseñanza rota, que es el tema del juego y no se puede
 * fotografiar.
 *
 * Todo inline, sin un solo archivo externo: la landing tiene que funcionar sin
 * pedirle nada a nadie. Y todo con los colores de la paleta, tomados de
 * variables CSS, así que se adaptan al tema claro y oscuro solos.
 */

/** El valle al atardecer, visto desde afuera. El banner de la portada. */
export function bannerValle(): string {
  return `<svg class="lienzo" viewBox="0 0 1200 460" role="img"
     aria-label="El valle al atardecer: montañas, el río, la aldea y la fragua encendida">
  <defs>
    <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--cielo-alto)"/>
      <stop offset="62%" stop-color="var(--cielo-bajo)"/>
      <stop offset="100%" stop-color="var(--horizonte)"/>
    </linearGradient>
    <radialGradient id="sol" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="var(--brasa)" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="var(--brasa)" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="agua" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--brasa)" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="var(--sombra3)" stop-opacity="0.9"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="460" fill="url(#cielo)"/>
  <circle cx="880" cy="300" r="230" fill="url(#sol)"/>
  <circle cx="880" cy="300" r="26" fill="var(--brasa)" opacity="0.9"/>

  <!-- Las dos lunas, que es lo que dice "esto no es la Tierra" -->
  <circle cx="245" cy="92" r="30" fill="var(--luna)" opacity="0.55"/>
  <circle cx="257" cy="84" r="30" fill="var(--cielo-alto)" opacity="0.9"/>
  <circle cx="420" cy="58" r="7" fill="var(--luna)" opacity="0.4"/>

  <!-- Cordillera lejana. La abertura al norte, a la izquierda. -->
  <path d="M0 300 L60 268 L120 292 L150 250 L215 300 L270 262 L340 306 L400 268
           L470 300 L520 246 L600 302 L660 272 L730 308 L800 258 L880 306
           L950 270 L1030 300 L1100 262 L1160 296 L1200 274 L1200 460 L0 460 Z"
        fill="var(--sombra1)" opacity="0.65"/>
  <path d="M0 348 L90 322 L170 352 L250 314 L330 356 L420 326 L510 358
           L610 320 L700 356 L800 328 L900 358 L1000 330 L1100 356 L1200 334
           L1200 460 L0 460 Z"
        fill="var(--sombra2)" opacity="0.85"/>

  <!-- El río -->
  <path d="M0 428 C 220 404, 380 442, 620 414 C 820 392, 1000 424, 1200 402
           L1200 460 L0 460 Z" fill="url(#agua)"/>

  <!-- La aldea: cajas y techos, que es literalmente lo que hay en el juego -->
  <g fill="var(--sombra3)">
    <rect x="300" y="372" width="34" height="30"/><path d="M294 372 L317 352 L340 372 Z"/>
    <rect x="348" y="378" width="26" height="24"/><path d="M343 378 L361 361 L379 378 Z"/>
    <rect x="264" y="380" width="24" height="22"/><path d="M259 380 L276 364 L293 380 Z"/>
    <rect x="386" y="382" width="20" height="20"/><path d="M382 382 L396 368 L410 382 Z"/>
  </g>
  <rect x="309" y="384" width="7" height="8" fill="var(--brasa)" opacity="0.95"/>
  <rect x="357" y="388" width="6" height="7" fill="var(--brasa)" opacity="0.8"/>

  <!-- La fragua, más lejos y encendida. Es el único calor del valle. -->
  <g fill="var(--sombra3)">
    <rect x="742" y="366" width="44" height="36"/><path d="M735 366 L764 342 L793 366 Z"/>
    <rect x="788" y="332" width="12" height="42"/>
  </g>
  <rect x="756" y="380" width="12" height="14" fill="var(--brasa)"/>
  <circle cx="764" cy="386" r="24" fill="var(--brasa)" opacity="0.20"/>

  <!-- Árboles del Sotobosque -->
  <g fill="var(--sombra3)" opacity="0.92">
    <path d="M96 402 L112 356 L128 402 Z"/><path d="M124 404 L142 348 L160 404 Z"/>
    <path d="M154 402 L168 364 L182 402 Z"/><path d="M56 404 L72 366 L88 404 Z"/>
    <path d="M1044 402 L1060 358 L1076 402 Z"/><path d="M1072 404 L1090 352 L1108 404 Z"/>
  </g>

  <!-- Una figura, chiquita. La escala la da ella. -->
  <g fill="var(--sombra3)">
    <circle cx="520" cy="392" r="4"/><rect x="517" y="396" width="6" height="12"/>
  </g>
</svg>`
}

/** Una cadena de enseñanza que se cortó. Es el tema del juego, dibujado. */
export function diagramaSaber(): string {
  const persona = (x: number, y: number, muerta: boolean) => `
    <g opacity="${muerta ? '0.28' : '1'}">
      <circle cx="${x}" cy="${y - 15}" r="9" fill="${muerta ? 'var(--tenue)' : 'var(--tinta)'}"/>
      <rect x="${x - 7}" y="${y - 4}" width="14" height="24" rx="2"
            fill="${muerta ? 'var(--tenue)' : 'var(--tinta)'}"/>
    </g>`
  const flecha = (x1: number, x2: number, y: number, rota: boolean) => `
    <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"
          stroke="${rota ? 'var(--tenue)' : 'var(--brasa)'}" stroke-width="2"
          stroke-dasharray="${rota ? '4 5' : '0'}"/>
    ${rota ? '' : `<path d="M${x2 - 7} ${y - 4} L${x2} ${y} L${x2 - 7} ${y + 4}"
          fill="none" stroke="var(--brasa)" stroke-width="2"/>`}`

  return `<svg class="lienzo lienzo-chico" viewBox="0 0 720 150" role="img"
     aria-label="Una cadena de enseñanza: alguien enseña a otro, y el tercero muere sin haber enseñado">
  ${flecha(78, 190, 66, false)}
  ${flecha(268, 380, 66, false)}
  ${flecha(458, 570, 66, true)}
  ${persona(60, 70, false)}
  ${persona(230, 70, false)}
  ${persona(420, 70, true)}
  <g stroke="var(--tenue)" stroke-width="2" opacity="0.5">
    <line x1="406" y1="34" x2="434" y2="62"/><line x1="434" y1="34" x2="406" y2="62"/>
  </g>
  <text x="60" y="122" text-anchor="middle" class="pie">le enseñó a</text>
  <text x="230" y="122" text-anchor="middle" class="pie">que le enseñó a</text>
  <text x="420" y="122" text-anchor="middle" class="pie">que se murió</text>
  <text x="600" y="72" text-anchor="middle" class="pie pie-brasa">y ahí se cortó</text>
</svg>`
}

/** El cielo del valle: dos lunas y el gigante gaseoso. */
export function bannerCielo(): string {
  const estrellas = () => {
    // Fijas y no al azar: la página tiene que verse igual cada vez que carga.
    const puntos = [
      [42, 30, 1.4], [118, 62, 0.9], [196, 24, 1.1], [258, 78, 0.7], [312, 40, 1.6],
      [388, 66, 0.8], [452, 22, 1.2], [518, 58, 0.9], [576, 34, 1.5], [640, 72, 0.7],
      [702, 28, 1.0], [768, 60, 1.3], [828, 36, 0.8], [892, 70, 1.1], [950, 26, 1.4],
      [86, 96, 0.8], [242, 110, 1.0], [408, 100, 0.7], [606, 106, 1.2], [860, 98, 0.9],
      [150, 46, 0.6], [340, 88, 0.6], [500, 96, 0.6], [720, 92, 0.6], [1010, 54, 1.0],
    ]
    return puntos.map(([x, y, r]) =>
      `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--luna)" opacity="${0.35 + r! * 0.35}"/>`).join('')
  }
  return `<svg class="lienzo lienzo-cielo" viewBox="0 0 1060 200" role="img"
     aria-label="El cielo nocturno del valle: dos lunas y un gigante gaseoso">
  <defs>
    <linearGradient id="noche" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--noche-alto)"/>
      <stop offset="100%" stop-color="var(--noche-bajo)"/>
    </linearGradient>
    <clipPath id="disco"><circle cx="880" cy="112" r="52"/></clipPath>
  </defs>
  <rect width="1060" height="200" fill="url(#noche)"/>
  ${estrellas()}

  <!-- El gigante gaseoso, con bandas -->
  <g clip-path="url(#disco)">
    <circle cx="880" cy="112" r="52" fill="var(--planeta)"/>
    <g fill="var(--planeta-banda)" opacity="0.55">
      <rect x="828" y="80" width="104" height="7"/>
      <rect x="828" y="98" width="104" height="11"/>
      <rect x="828" y="122" width="104" height="6"/>
      <rect x="828" y="138" width="104" height="9"/>
    </g>
    <circle cx="912" cy="96" r="52" fill="var(--noche-bajo)" opacity="0.45"/>
  </g>

  <!-- Luna grande en fase -->
  <circle cx="230" cy="86" r="34" fill="var(--luna)" opacity="0.9"/>
  <circle cx="248" cy="78" r="34" fill="var(--noche-alto)" opacity="0.92"/>
  <!-- Luna chica -->
  <circle cx="560" cy="52" r="8" fill="var(--luna)" opacity="0.75"/>

  <!-- El horizonte, para que se lea que estás parado en algún lado -->
  <path d="M0 176 L120 164 L240 180 L360 162 L500 182 L640 166 L780 184
           L900 168 L1060 180 L1060 200 L0 200 Z" fill="var(--sombra3)"/>
</svg>`
}
