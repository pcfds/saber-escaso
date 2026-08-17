/**
 * Las ilustraciones de la landing.
 *
 * La primera versión eran montañas triangulares con relleno plano y casitas
 * rectangulares, o sea el clip-art vectorial de plantilla. El veredicto fue
 * "parece un juego choto", y era cierto: **una ilustración plana promete un
 * juego plano.**
 *
 * Lo que separa un dibujo vectorial barato de una imagen con aire no es
 * detalle, son cuatro cosas, y todas se pueden hacer con SVG:
 *
 *  1. **Perspectiva atmosférica.** Cada plano más lejano es más claro, más
 *     azul y menos contrastado. Es lo que hace que el ojo lea profundidad. Un
 *     paisaje donde el fondo tiene el mismo negro que el frente es una
 *     calcomanía.
 *  2. **Bruma ENTRE los planos, no encima.** Una banda difusa apoyada en cada
 *     cresta. Es el truco de las pinturas de paisaje y es casi gratis.
 *  3. **Crestas irregulares.** Un triángulo se lee como triángulo. Una cresta
 *     necesita quiebres desparejos, hombros y algún pico que rompa el ritmo.
 *  4. **Grano.** Una superficie de color perfectamente liso no existe en la
 *     naturaleza y el ojo lo sabe. Un poco de ruido encima y deja de ser
 *     vectorial.
 *
 * Y una regla que vale más que las cuatro: **esto es provisorio.** Una captura
 * del juego real le gana a cualquier dibujo. Está el botón F2 puesto para eso.
 * Nadie del equipo puede sacarla porque la máquina donde se desarrolla no
 * tiene placa de video.
 */

/** Ruido y desenfoques compartidos. Van una sola vez en la página. */
function filtros(): string {
  return `<defs>
  <filter id="grano" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="linear" slope="0.055"/></feComponentTransfer>
  </filter>
  <filter id="bruma" x="-20%" y="-60%" width="140%" height="260%">
    <feGaussianBlur stdDeviation="9"/>
  </filter>
  <filter id="brumita" x="-20%" y="-60%" width="140%" height="260%">
    <feGaussianBlur stdDeviation="4"/>
  </filter>
  <filter id="resplandor" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="16"/>
  </filter>
</defs>`
}

/**
 * El valle al atardecer. El banner de la portada.
 *
 * Cinco planos, cada uno más claro y más azul que el de adelante, con bruma
 * apoyada entre medio. El sol bajo y de contraluz: es lo que hace que las
 * crestas tengan filo y el valle tenga hora.
 */
export function bannerValle(): string {
  // Una cresta con quiebres desparejos. `alt` es la altura base, `aspereza`
  // cuánto se sacude, y la semilla hace que sea siempre la misma montaña.
  const cresta = (alt: number, aspereza: number, semilla: number, ancho = 1200) => {
    let s = semilla
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
    const pts: string[] = [`0 ${alt + rnd() * aspereza}`]
    let x = 0
    while (x < ancho) {
      // Pasos irregulares: paso parejo = sierra de juguete.
      x += 22 + rnd() * 64
      const pico = rnd() < 0.22 ? aspereza * 1.9 : aspereza
      pts.push(`${Math.min(x, ancho)} ${alt - rnd() * pico}`)
    }
    pts.push(`${ancho} ${alt}`)
    return `M${pts.join(' L')} L${ancho} 520 L0 520 Z`
  }

  return `<svg class="lienzo" viewBox="0 0 1200 520" role="img"
     aria-label="El valle al atardecer, con el sol bajo entre las montañas y la fragua encendida">
  ${filtros()}
  <defs>
    <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="var(--cielo-alto)"/>
      <stop offset="45%" stop-color="var(--cielo-medio)"/>
      <stop offset="78%" stop-color="var(--cielo-bajo)"/>
      <stop offset="100%" stop-color="var(--horizonte)"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%"  stop-color="var(--brasa)" stop-opacity="0.62"/>
      <stop offset="45%" stop-color="var(--brasa)" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="var(--brasa)" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="niebla" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--bruma)" stop-opacity="0"/>
      <stop offset="55%" stop-color="var(--bruma)" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="var(--bruma)" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="rio" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--brasa)" stop-opacity="0.30"/>
      <stop offset="45%" stop-color="var(--cielo-bajo)" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="var(--suelo)" stop-opacity="0.85"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="520" fill="url(#cielo)"/>

  <!-- El sol, bajo y a punto de esconderse detrás de la segunda cresta -->
  <circle cx="812" cy="300" r="290" fill="url(#halo)"/>
  <circle cx="812" cy="300" r="34" fill="var(--sol)" filter="url(#resplandor)" opacity="0.9"/>
  <circle cx="812" cy="300" r="17" fill="var(--sol)"/>

  <!-- Las lunas. Arriba, donde el cielo todavía es de noche. -->
  <g opacity="0.62">
    <circle cx="236" cy="82" r="27" fill="var(--luna)"/>
    <circle cx="249" cy="73" r="27" fill="var(--cielo-alto)"/>
  </g>
  <circle cx="392" cy="52" r="5" fill="var(--luna)" opacity="0.5"/>

  <!-- Cinco planos. Cada uno más oscuro y más contrastado que el anterior:
       eso es la perspectiva atmosférica, y es lo que da profundidad. -->
  <path d="${cresta(268, 46, 11)}" fill="var(--lejos1)"/>
  <rect y="250" width="1200" height="52" fill="url(#niebla)" filter="url(#bruma)"/>

  <path d="${cresta(316, 54, 29)}" fill="var(--lejos2)"/>
  <rect y="300" width="1200" height="46" fill="url(#niebla)" filter="url(#bruma)" opacity="0.85"/>

  <path d="${cresta(360, 40, 43)}" fill="var(--lejos3)"/>
  <rect y="346" width="1200" height="38" fill="url(#niebla)" filter="url(#brumita)" opacity="0.7"/>

  <path d="${cresta(404, 26, 61)}" fill="var(--lejos4)"/>
  <rect y="392" width="1200" height="30" fill="url(#niebla)" filter="url(#brumita)" opacity="0.5"/>

  <!-- El suelo del valle -->
  <path d="M0 434 C 200 424, 420 442, 640 430 C 880 418, 1040 438, 1200 426 L1200 520 L0 520 Z"
        fill="var(--suelo)"/>

  <!-- El río, que agarra el naranja del cielo -->
  <path d="M0 486 C 230 466, 400 498, 640 476 C 850 456, 1010 484, 1200 464 L1200 520 L0 520 Z"
        fill="url(#rio)"/>

  <!-- La aldea. Siluetas, no cajas: a esta distancia sólo se lee el contorno,
       y lo único que importa es que haya luz adentro. -->
  <g fill="var(--cerca)">
    <path d="M286 452 l0 -22 l20 -15 l20 15 l0 22 Z"/>
    <path d="M332 454 l0 -17 l15 -12 l15 12 l0 17 Z"/>
    <path d="M254 455 l0 -15 l13 -11 l13 11 l0 15 Z"/>
    <path d="M370 456 l0 -13 l11 -9 l11 9 l0 13 Z"/>
    <path d="M214 457 l0 -11 l9 -8 l9 8 l0 11 Z"/>
  </g>
  <g fill="var(--brasa)">
    <rect x="301" y="440" width="6" height="7"/>
    <rect x="341" y="445" width="5" height="6" opacity="0.8"/>
    <rect x="376" y="449" width="4" height="5" opacity="0.65"/>
  </g>

  <!-- La fragua, sola y más lejos. El único calor grande del valle. -->
  <circle cx="700" cy="440" r="42" fill="var(--brasa)" opacity="0.14" filter="url(#resplandor)"/>
  <g fill="var(--cerca)">
    <path d="M676 448 l0 -26 l24 -17 l24 17 l0 26 Z"/>
    <rect x="722" y="396" width="9" height="34"/>
  </g>
  <rect x="694" y="432" width="9" height="12" fill="var(--brasa)"/>

  <!-- Árboles. Copas irregulares, no conos. -->
  <g fill="var(--cerca)">
    <path d="M96 458 q4 -34 14 -40 q12 6 15 40 Z"/>
    <path d="M124 460 q5 -44 16 -50 q13 8 16 50 Z"/>
    <path d="M152 459 q4 -28 12 -33 q10 5 13 33 Z"/>
    <path d="M60 461 q4 -26 11 -31 q9 5 12 31 Z"/>
    <path d="M1052 458 q4 -36 15 -42 q12 7 15 42 Z"/>
    <path d="M1082 461 q5 -46 16 -52 q13 8 16 52 Z"/>
    <path d="M1116 459 q4 -30 12 -35 q10 5 13 35 Z"/>
  </g>

  <!-- Alguien caminando. La escala del valle la da esta figura de doce píxeles. -->
  <g fill="var(--cerca)">
    <circle cx="498" cy="446" r="3.4"/>
    <path d="M495 450 l6 0 l1 11 l-3 0 l-1 -6 l-1 6 l-3 0 Z"/>
  </g>

  <rect width="1200" height="520" filter="url(#grano)" opacity="0.5"/>
</svg>`
}

/** Una cadena de enseñanza que se cortó. Es el tema del juego, dibujado. */
export function diagramaSaber(): string {
  const persona = (x: number, muerta: boolean) => `
    <g opacity="${muerta ? '0.3' : '1'}" fill="${muerta ? 'var(--tenue)' : 'var(--tinta)'}">
      <circle cx="${x}" cy="52" r="8.5"/>
      <path d="M${x - 8} 64 q8 -4 16 0 l2 24 l-5 0 l-2 -13 l-1 13 l-4 0 l-1 -13 l-2 13 l-5 0 Z"/>
    </g>`
  const flecha = (x1: number, x2: number, rota: boolean) => `
    <line x1="${x1}" y1="66" x2="${x2 - (rota ? 0 : 8)}" y2="66"
          stroke="${rota ? 'var(--tenue)' : 'var(--brasa)'}" stroke-width="1.8"
          stroke-dasharray="${rota ? '3 6' : '0'}" opacity="${rota ? '0.6' : '1'}"/>
    ${rota ? '' : `<path d="M${x2 - 10} 62 L${x2 - 2} 66 L${x2 - 10} 70 Z" fill="var(--brasa)"/>`}`

  return `<svg class="lienzo lienzo-chico" viewBox="0 0 720 140" role="img"
     aria-label="Una cadena de enseñanza que se corta cuando el último que sabía se muere">
  ${flecha(80, 196, false)}
  ${flecha(272, 388, false)}
  ${flecha(464, 592, true)}
  ${persona(64, false)}
  ${persona(232, false)}
  ${persona(424, true)}
  <g stroke="var(--tenue)" stroke-width="1.8" opacity="0.45" stroke-linecap="round">
    <line x1="412" y1="40" x2="436" y2="64"/><line x1="436" y1="40" x2="412" y2="64"/>
  </g>
  <text x="64" y="116" text-anchor="middle" class="pie">le enseñó a</text>
  <text x="232" y="116" text-anchor="middle" class="pie">que le enseñó a</text>
  <text x="424" y="116" text-anchor="middle" class="pie">que se murió</text>
  <text x="626" y="70" text-anchor="middle" class="pie pie-brasa">y ahí se cortó</text>
</svg>`
}

/** El cielo del valle: dos lunas y el gigante gaseoso. */
export function bannerCielo(): string {
  const estrellas = () => {
    // Fijas y no al azar: la página tiene que verse igual cada vez que carga.
    let s = 4242
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
    const out: string[] = []
    for (let i = 0; i < 130; i++) {
      const x = rnd() * 1060
      const y = Math.pow(rnd(), 1.5) * 150
      // Magnitudes desparejas: todas iguales se leen como ruido de sensor.
      const r = Math.pow(rnd(), 3) * 1.7 + 0.28
      out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}"
        fill="var(--luna)" opacity="${(0.18 + r * 0.42).toFixed(2)}"/>`)
    }
    return out.join('')
  }
  return `<svg class="lienzo lienzo-cielo" viewBox="0 0 1060 230" role="img"
     aria-label="El cielo nocturno del valle: dos lunas y un gigante gaseoso sobre el horizonte">
  ${filtros()}
  <defs>
    <linearGradient id="noche" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="var(--noche-alto)"/>
      <stop offset="70%" stop-color="var(--noche-bajo)"/>
      <stop offset="100%" stop-color="var(--noche-horiz)"/>
    </linearGradient>
    <linearGradient id="lactea" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0%"  stop-color="var(--luna)" stop-opacity="0"/>
      <stop offset="50%" stop-color="var(--luna)" stop-opacity="0.11"/>
      <stop offset="100%" stop-color="var(--luna)" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="disco"><circle cx="866" cy="118" r="54"/></clipPath>
  </defs>

  <rect width="1060" height="230" fill="url(#noche)"/>
  <!-- La vía láctea: una banda inclinada y difusa, que le da orientación al cielo -->
  <rect x="-100" y="-40" width="1300" height="150" fill="url(#lactea)"
        transform="rotate(-11 530 115)" filter="url(#bruma)"/>
  ${estrellas()}

  <!-- El gigante gaseoso -->
  <circle cx="866" cy="118" r="70" fill="var(--planeta)" opacity="0.10" filter="url(#resplandor)"/>
  <g clip-path="url(#disco)">
    <circle cx="866" cy="118" r="54" fill="var(--planeta)"/>
    <g fill="var(--planeta-banda)" opacity="0.5">
      <ellipse cx="866" cy="86"  rx="60" ry="4.5"/>
      <ellipse cx="866" cy="102" rx="60" ry="7"/>
      <ellipse cx="866" cy="126" rx="60" ry="4"/>
      <ellipse cx="866" cy="144" rx="60" ry="6"/>
    </g>
    <!-- El terminador: sin esto es una calcomanía redonda -->
    <circle cx="902" cy="100" r="56" fill="var(--noche-bajo)" opacity="0.52"/>
  </g>

  <!-- Luna grande en fase, con su halo -->
  <circle cx="228" cy="90" r="52" fill="var(--luna)" opacity="0.07" filter="url(#resplandor)"/>
  <circle cx="228" cy="90" r="31" fill="var(--luna)" opacity="0.92"/>
  <circle cx="245" cy="82" r="31" fill="var(--noche-alto)" opacity="0.94"/>
  <!-- Luna chica -->
  <circle cx="548" cy="48" r="6.5" fill="var(--luna)" opacity="0.7"/>

  <!-- El horizonte con bruma: te recuerda que estás parado en algún lado -->
  <rect y="176" width="1060" height="34" fill="var(--bruma)" opacity="0.16" filter="url(#bruma)"/>
  <path d="M0 196 L110 184 L200 199 L310 182 L430 201 L560 186 L690 203 L820 188 L950 200 L1060 190
           L1060 230 L0 230 Z" fill="var(--noche-suelo)"/>

  <rect width="1060" height="230" filter="url(#grano)" opacity="0.45"/>
</svg>`
}
