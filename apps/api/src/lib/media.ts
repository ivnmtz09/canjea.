/**
 * Generador de arte generativo (SVG) determinista.
 * Evita depender de imágenes externas: cada publicación tiene un póster único,
 * cacheable y con el lenguaje visual de CANJEA.
 */

const PALETTES = [
  { bg: '#0B0A10', a: '#C9FF3D', b: '#7C5CFF', text: '#F3EFE6' },
  { bg: '#100A0D', a: '#FF4D8D', b: '#FF7A3D', text: '#F3EFE6' },
  { bg: '#0A0C10', a: '#4DE1FF', b: '#C9FF3D', text: '#F3EFE6' },
  { bg: '#0D0A0B', a: '#FF7A3D', b: '#C9FF3D', text: '#F3EFE6' },
  { bg: '#0A090E', a: '#7C5CFF', b: '#FF4D8D', text: '#F3EFE6' },
  { bg: '#0C0B08', a: '#F3EFE6', b: '#C9FF3D', text: '#F3EFE6' },
] as const;

export function hashSeed(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function artSvg(rawSeed: string, width = 1200, height = 900): string {
  const seed = hashSeed(rawSeed);
  const rand = rng(seed);
  const palette = PALETTES[seed % PALETTES.length]!;
  const style = seed % 5;
  const id = seed.toString(36);
  const shapes: string[] = [];

  if (style === 0) {
    // Órbitas
    for (let i = 0; i < 5; i++) {
      const cx = 240 + rand() * 760;
      const cy = 180 + rand() * 560;
      const r = 80 + rand() * 220;
      shapes.push(
        `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" fill="none" stroke="${i % 2 ? palette.a : palette.b}" stroke-width="${(1 + rand() * 2.5).toFixed(1)}" opacity="${(0.25 + rand() * 0.6).toFixed(2)}"/>`,
      );
    }
    shapes.push(
      `<circle cx="${(640 + rand() * 160).toFixed(0)}" cy="${(420 + rand() * 120).toFixed(0)}" r="${(150 + rand() * 90).toFixed(0)}" fill="${palette.a}" opacity="0.16"/>`,
    );
  } else if (style === 1) {
    // Retícula + barra
    const step = 54;
    for (let x = step; x < width; x += step) {
      for (let y = step; y < height; y += step) {
        const d = Math.hypot(x - width * 0.7, y - height * 0.35);
        const r = Math.max(0.7, 4.4 - d / 160);
        shapes.push(`<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${palette.text}" opacity="0.35"/>`);
      }
    }
    const angle = -18 - rand() * 14;
    shapes.push(
      `<rect x="${width * 0.42}" y="-140" width="${90 + rand() * 90}" height="${height + 280}" fill="${palette.a}" opacity="0.85" transform="rotate(${angle.toFixed(1)} ${width * 0.5} ${height * 0.5})"/>`,
    );
    shapes.push(
      `<rect x="${width * 0.18}" y="-140" width="12" height="${height + 280}" fill="${palette.b}" opacity="0.7" transform="rotate(${angle.toFixed(1)} ${width * 0.5} ${height * 0.5})"/>`,
    );
  } else if (style === 2) {
    // Arcos
    for (let i = 0; i < 6; i++) {
      const w = 200 + i * 130;
      const h = 300 + rand() * 240;
      const x = 90 + rand() * 520;
      const y = height - h + 60;
      shapes.push(
        `<path d="M${x} ${y + h} L${x} ${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} L${x + w} ${y + h} Z" fill="none" stroke="${i % 2 ? palette.b : palette.a}" stroke-width="${i === 5 ? 3 : 1.5}" opacity="${(0.2 + i * 0.1).toFixed(2)}"/>`,
      );
    }
    shapes.push(
      `<rect x="${width * 0.68}" y="${height * 0.18}" width="${width * 0.22}" height="${width * 0.22}" fill="${palette.a}" opacity="0.9" transform="rotate(${(rand() * 30 - 15).toFixed(1)} ${width * 0.79} ${height * 0.29})"/>`,
    );
  } else if (style === 3) {
    // Malla / blobs
    const blobs = [
      { cx: 240 + rand() * 200, cy: 220 + rand() * 160, r: 260 + rand() * 160, c: palette.a, o: 0.3 },
      { cx: 780 + rand() * 220, cy: 300 + rand() * 200, r: 220 + rand() * 200, c: palette.b, o: 0.32 },
      { cx: 520 + rand() * 260, cy: 700 + rand() * 100, r: 240 + rand() * 160, c: '#FFFFFF', o: 0.08 },
    ];
    for (const b of blobs) {
      shapes.push(`<circle cx="${b.cx.toFixed(0)}" cy="${b.cy.toFixed(0)}" r="${b.r.toFixed(0)}" fill="url(#g${id})" opacity="${b.o}"/>`);
    }
    shapes.push(
      `<rect x="${width * 0.1}" y="${height * 0.62}" width="${width * 0.8}" height="1.5" fill="${palette.text}" opacity="0.4"/>`,
      `<rect x="${width * 0.1}" y="${height * 0.66}" width="${width * 0.5}" height="1.5" fill="${palette.text}" opacity="0.2"/>`,
    );
  } else {
    // Rayas + tipografía
    const step = 34 + rand() * 26;
    for (let x = -height; x < width + height; x += step) {
      shapes.push(
        `<rect x="${x.toFixed(0)}" y="-200" width="${(step / 3).toFixed(1)}" height="${height + 400}" fill="${rand() > 0.5 ? palette.a : palette.b}" opacity="${(rand() * 0.35).toFixed(2)}" transform="rotate(24 ${width / 2} ${height / 2})"/>`,
      );
    }
    shapes.push(
      `<circle cx="${width * 0.72}" cy="${height * 0.42}" r="${(180 + rand() * 90).toFixed(0)}" fill="none" stroke="${palette.text}" stroke-width="2" opacity="0.5"/>`,
    );
  }

  const label = ['OBJETO', 'SERVICIO', 'HABILIDAD', 'INTERCAMBIO', 'NECESIDAD'][seed % 5];
  const index = String((seed % 89) + 10).padStart(2, '0');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1200 900" role="img" aria-label="Póster abstracto generado">
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette.bg}"/>
      <stop offset="1" stop-color="#050407"/>
    </linearGradient>
    <radialGradient id="g${id}" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${palette.a}" stop-opacity="0.9"/>
      <stop offset="1" stop-color="${palette.b}" stop-opacity="0"/>
    </radialGradient>
    <filter id="grain${id}">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.06"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="1200" height="900" fill="url(#bg${id})"/>
  <g>${shapes.join('\n')}</g>
  <rect width="1200" height="900" filter="url(#grain${id})" opacity="0.55"/>
  <g font-family="ui-monospace, 'SFMono-Regular', Menlo, monospace" fill="${palette.text}" opacity="0.82">
    <text x="52" y="70" font-size="17" letter-spacing="6">CANJEA / ${label}</text>
    <text x="1148" y="70" font-size="17" letter-spacing="2" text-anchor="end">${index}</text>
    <line x1="52" y1="828" x2="1148" y2="828" stroke="${palette.text}" stroke-opacity="0.35"/>
    <text x="52" y="862" font-size="15" letter-spacing="4">MERCADO ABIERTO DE INTERCAMBIO</text>
    <text x="1148" y="862" font-size="15" letter-spacing="2" text-anchor="end">EST. 2026</text>
  </g>
</svg>`;
}

export function avatarSvg(rawSeed: string, initials: string): string {
  const seed = hashSeed(rawSeed);
  const rand = rng(seed);
  const palette = PALETTES[seed % PALETTES.length]!;
  const safeInitials = initials.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').slice(0, 2).toUpperCase() || 'C';
  const rotation = (rand() * 40 - 20).toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" role="img" aria-label="Avatar de ${safeInitials}">
  <defs>
    <linearGradient id="a${seed}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette.bg}"/>
      <stop offset="1" stop-color="${palette.b}"/>
    </linearGradient>
  </defs>
  <rect width="320" height="320" fill="url(#a${seed})"/>
  <circle cx="160" cy="160" r="126" fill="none" stroke="${palette.a}" stroke-width="1.5" opacity="0.55"/>
  <circle cx="${(80 + rand() * 60).toFixed(0)}" cy="${(90 + rand() * 40).toFixed(0)}" r="${(60 + rand() * 40).toFixed(0)}" fill="${palette.a}" opacity="0.22"/>
  <text x="160" y="190" text-anchor="middle" font-family="'Space Grotesk', Inter, system-ui, sans-serif" font-size="104" font-weight="700" letter-spacing="-4" fill="${palette.text}" transform="rotate(${rotation} 160 160)">${safeInitials}</text>
</svg>`;
}

/**
 * Genera un avatar SVG 100% personalizado con colores y forma elegidos por el usuario.
 * Usado por el endpoint GET /api/media/avatar/custom.svg?bg=...&accent=...&shape=...&n=...
 */
export function customAvatarSvg(bg: string, accent: string, shape: string, letters: string): string {
  const safeLetters = letters.replace(/[^A-Za-z\u00C0-\u024F]/g, '').slice(0, 2).toUpperCase() || 'C';
  const fontSize = safeLetters.length === 1 ? 128 : 96;
  const textY = Math.round(160 + fontSize * 0.38);

  let deco = '';
  if (shape === 'circle') {
    deco = `<circle cx="160" cy="160" r="130" fill="${accent}" opacity="0.14"/>
  <circle cx="160" cy="160" r="130" fill="none" stroke="${accent}" stroke-width="2" opacity="0.5"/>
  <circle cx="90" cy="85" r="52" fill="${accent}" opacity="0.09"/>`;
  } else if (shape === 'diamond') {
    deco = `<polygon points="160,30 290,160 160,290 30,160" fill="${accent}" opacity="0.11"/>
  <polygon points="160,30 290,160 160,290 30,160" fill="none" stroke="${accent}" stroke-width="2" opacity="0.4"/>`;
  } else if (shape === 'triangle') {
    deco = `<polygon points="160,20 300,290 20,290" fill="${accent}" opacity="0.11"/>
  <polygon points="160,20 300,290 20,290" fill="none" stroke="${accent}" stroke-width="2" opacity="0.4"/>`;
  } else if (shape === 'hexagon') {
    deco = `<polygon points="160,20 285,90 285,230 160,300 35,230 35,90" fill="${accent}" opacity="0.11"/>
  <polygon points="160,20 285,90 285,230 160,300 35,230 35,90" fill="none" stroke="${accent}" stroke-width="2" opacity="0.45"/>`;
  } else if (shape === 'star') {
    deco = `<polygon points="160,25 190,120 290,125 215,185 240,280 160,225 80,280 105,185 30,125 130,120" fill="${accent}" opacity="0.12"/>
  <polygon points="160,25 190,120 290,125 215,185 240,280 160,225 80,280 105,185 30,125 130,120" fill="none" stroke="${accent}" stroke-width="2" opacity="0.4"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" role="img" aria-label="Avatar personalizado de ${safeLetters}">
  <rect width="320" height="320" fill="${bg}"/>
  ${deco}
  <text x="160" y="${textY}" text-anchor="middle"
    font-family="'Space Grotesk', Inter, system-ui, sans-serif"
    font-size="${fontSize}" font-weight="700" letter-spacing="-3"
    fill="${accent}">${safeLetters}</text>
</svg>`;
}
