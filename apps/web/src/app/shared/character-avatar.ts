/**
 * Renderizador de avatar ilustrado vectorial SVG (muñequito) en cliente.
 * Genera SVG puro de 320x320 con soporte para piel, cabello, ojos, boca, ropa y accesorios.
 */

export interface CharacterAvatarOptions {
  skin?: string;
  hairStyle?: string;
  hairColor?: string;
  eyeType?: string;
  eyeColor?: string;
  expression?: string;
  accessory?: string;
  clothes?: string;
  clothesColor?: string;
  bgColor?: string;
}

export const SKIN_TONES: Record<string, { label: string; base: string; shadow: string }> = {
  light: { label: 'Clara', base: '#FDE0D0', shadow: '#ECC0A8' },
  fair: { label: 'Natural', base: '#F3C9A8', shadow: '#E2AB84' },
  medium: { label: 'Canela', base: '#D89A6E', shadow: '#C27F51' },
  tan: { label: 'Bronceada', base: '#B57447', shadow: '#9D5B30' },
  deep: { label: 'Morena', base: '#7D4427', shadow: '#623118' },
  dark: { label: 'Ébano', base: '#4E2A18', shadow: '#391B0D' },
  neon_lime: { label: 'Lima Neón', base: '#C9FF3D', shadow: '#A4DC22' },
  neon_purple: { label: 'Violeta Neón', base: '#9D80FF', shadow: '#7C5CFF' },
};

export const HAIR_STYLES: { id: string; label: string }[] = [
  { id: 'short', label: 'Corto clásico' },
  { id: 'messy', label: 'Despeinado' },
  { id: 'afro', label: 'Rizado / Afro' },
  { id: 'wavy', label: 'Ondulado / Largo' },
  { id: 'buzz', label: 'Rapado / Fade' },
  { id: 'beanie', label: 'Gorro / Beanie' },
  { id: 'bald', label: 'Sin cabello' },
];

export const HAIR_COLORS: Record<string, { label: string; value: string }> = {
  black: { label: 'Negro', value: '#19181F' },
  dark_brown: { label: 'Castaño oscuro', value: '#3B2416' },
  brown: { label: 'Castaño', value: '#5D3B23' },
  blonde: { label: 'Rubio', value: '#E8B966' },
  red: { label: 'Pelirrojo', value: '#B84524' },
  silver: { label: 'Plata', value: '#C4C8D4' },
  neon_lime: { label: 'Lima', value: '#C9FF3D' },
  neon_pink: { label: 'Rosa', value: '#FF4D8D' },
  neon_cyan: { label: 'Cian', value: '#4DE1FF' },
  neon_purple: { label: 'Violeta', value: '#7C5CFF' },
};

export const EYE_TYPES: { id: string; label: string }[] = [
  { id: 'normal', label: 'Atentos' },
  { id: 'happy', label: 'Felices' },
  { id: 'wink', label: 'Guiño' },
  { id: 'focused', label: 'Enfocados' },
  { id: 'curious', label: 'Curiosos' },
];

export const EYE_COLORS: Record<string, { label: string; value: string }> = {
  brown: { label: 'Castaño', value: '#4A3222' },
  amber: { label: 'Miel', value: '#966028' },
  green: { label: 'Verde', value: '#2D6E42' },
  blue: { label: 'Azul', value: '#2B5E8C' },
  dark: { label: 'Negro', value: '#121018' },
  lime: { label: 'Lima', value: '#C9FF3D' },
};

export const EXPRESSIONS: { id: string; label: string }[] = [
  { id: 'smile', label: 'Sonrisa' },
  { id: 'grin', label: 'Sonrisa amplia' },
  { id: 'laugh', label: 'Carcajada' },
  { id: 'cool', label: 'Despreocupado' },
  { id: 'neutral', label: 'Sereno' },
  { id: 'surprised', label: 'Sorprendido' },
];

export const CLOTHES_TYPES: { id: string; label: string }[] = [
  { id: 'tshirt', label: 'Camiseta' },
  { id: 'hoodie', label: 'Sudadera con capucha' },
  { id: 'jacket', label: 'Chaqueta urbana' },
  { id: 'turtleneck', label: 'Cuello de tortuga' },
];

export const CLOTHES_COLORS: Record<string, { label: string; value: string }> = {
  lime: { label: 'Lima CANJEA', value: '#C9FF3D' },
  violet: { label: 'Violeta', value: '#7C5CFF' },
  pink: { label: 'Rosa neón', value: '#FF4D8D' },
  ink: { label: 'Tinta profunda', value: '#16141F' },
  cyan: { label: 'Cian', value: '#4DE1FF' },
  orange: { label: 'Naranja', value: '#FF7A3D' },
  white: { label: 'Papel', value: '#F4F0E6' },
  forest: { label: 'Bosque', value: '#1E4731' },
};

export const ACCESSORIES: { id: string; label: string }[] = [
  { id: 'none', label: 'Ninguno' },
  { id: 'glasses_square', label: 'Gafas cuadradas' },
  { id: 'glasses_round', label: 'Gafas redondas' },
  { id: 'sunglasses', label: 'Gafas de sol' },
  { id: 'headphones', label: 'Audífonos DJ' },
  { id: 'earring', label: 'Arete aro' },
];

export const BG_COLORS: Record<string, { label: string; value: string }> = {
  deep_night: { label: 'Noche profunda', value: '#0B0A10' },
  dark_slate: { label: 'Pizarra oscura', value: '#12131C' },
  dark_violet: { label: 'Violeta noche', value: '#140E24' },
  dark_ruby: { label: 'Rubí oscuro', value: '#1A0C13' },
  dark_forest: { label: 'Bosque nocturno', value: '#0B1710' },
  abyss: { label: 'Abismo', value: '#050408' },
};

export function renderCharacterSvg(opts: CharacterAvatarOptions = {}): string {
  const skinKey = opts.skin && SKIN_TONES[opts.skin] ? opts.skin : 'medium';
  const skin = SKIN_TONES[skinKey]!;

  const hairColor = opts.hairColor && HAIR_COLORS[opts.hairColor] ? HAIR_COLORS[opts.hairColor]!.value : HAIR_COLORS['black']!.value;
  const hairStyle = opts.hairStyle || 'short';

  const eyeType = opts.eyeType || 'normal';
  const eyeColor = opts.eyeColor && EYE_COLORS[opts.eyeColor] ? EYE_COLORS[opts.eyeColor]!.value : (opts.eyeColor?.startsWith('#') ? opts.eyeColor : '#4A3222');

  const expression = opts.expression || 'smile';
  const accessory = opts.accessory || 'none';

  const clothes = opts.clothes || 'tshirt';
  const clothesColor = opts.clothesColor && CLOTHES_COLORS[opts.clothesColor] ? CLOTHES_COLORS[opts.clothesColor]!.value : CLOTHES_COLORS['lime']!.value;

  const bg = opts.bgColor && BG_COLORS[opts.bgColor] ? BG_COLORS[opts.bgColor]!.value : (opts.bgColor?.startsWith('#') ? opts.bgColor : BG_COLORS['deep_night']!.value);

  // 1. Torso & Clothes
  let clothesSvg = '';
  if (clothes === 'hoodie') {
    clothesSvg = `
      <!-- Hoodie -->
      <path d="M 60 320 C 60 252, 95 236, 160 236 C 225 236, 260 252, 260 320 Z" fill="${clothesColor}"/>
      <!-- Hood fold -->
      <path d="M 115 236 C 115 264, 136 280, 160 280 C 184 280, 205 264, 205 236 C 192 250, 178 256, 160 256 C 142 256, 128 250, 115 236 Z" fill="rgba(0,0,0,0.2)"/>
      <line x1="148" y1="262" x2="148" y2="295" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
      <line x1="172" y1="262" x2="172" y2="295" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
    `;
  } else if (clothes === 'jacket') {
    clothesSvg = `
      <!-- Inner shirt -->
      <path d="M 60 320 C 60 252, 95 236, 160 236 C 225 236, 260 252, 260 320 Z" fill="#F4F0E6"/>
      <!-- Jacket -->
      <path d="M 60 320 C 60 252, 95 236, 130 236 L 120 320 Z" fill="${clothesColor}"/>
      <path d="M 260 320 C 260 252, 225 236, 190 236 L 200 320 Z" fill="${clothesColor}"/>
      <path d="M 120 236 L 140 280 L 125 295 L 115 240 Z" fill="rgba(0,0,0,0.18)"/>
      <path d="M 200 236 L 180 280 L 195 295 L 205 240 Z" fill="rgba(0,0,0,0.18)"/>
      <line x1="160" y1="270" x2="160" y2="320" stroke="rgba(0,0,0,0.3)" stroke-width="2"/>
    `;
  } else if (clothes === 'turtleneck') {
    clothesSvg = `
      <!-- Turtleneck -->
      <path d="M 60 320 C 60 250, 95 234, 160 234 C 225 234, 260 250, 260 320 Z" fill="${clothesColor}"/>
      <rect x="130" y="212" width="60" height="30" rx="6" fill="${clothesColor}"/>
      <rect x="130" y="212" width="60" height="30" rx="6" fill="rgba(0,0,0,0.15)"/>
      <line x1="130" y1="222" x2="190" y2="222" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <line x1="130" y1="232" x2="190" y2="232" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
    `;
  } else {
    // tshirt default
    clothesSvg = `
      <!-- T-shirt -->
      <path d="M 60 320 C 60 254, 96 238, 160 238 C 224 238, 260 254, 260 320 Z" fill="${clothesColor}"/>
      <path d="M 132 238 C 132 260, 188 260, 188 238 Z" fill="${skin.shadow}"/>
      <path d="M 130 238 C 130 263, 190 263, 190 238 C 182 258, 138 258, 130 238 Z" fill="rgba(0,0,0,0.2)"/>
    `;
  }

  // 2. Long hair back layer
  let hairBackSvg = '';
  if (hairStyle === 'long' || hairStyle === 'wavy') {
    hairBackSvg = `
      <path d="M 88 150 C 80 200, 75 270, 95 300 C 105 310, 120 290, 115 250 C 115 200, 112 160, 112 150 Z" fill="${hairColor}"/>
      <path d="M 232 150 C 240 200, 245 270, 225 300 C 215 310, 200 290, 205 250 C 205 200, 208 160, 208 150 Z" fill="${hairColor}"/>
    `;
  } else if (hairStyle === 'afro') {
    hairBackSvg = `
      <circle cx="160" cy="145" r="76" fill="${hairColor}"/>
      <circle cx="106" cy="140" r="32" fill="${hairColor}"/>
      <circle cx="214" cy="140" r="32" fill="${hairColor}"/>
      <circle cx="120" cy="98" r="34" fill="${hairColor}"/>
      <circle cx="200" cy="98" r="34" fill="${hairColor}"/>
      <circle cx="160" cy="86" r="34" fill="${hairColor}"/>
    `;
  }

  // 3. Eyes SVG
  let eyesSvg = '';
  if (eyeType === 'happy') {
    eyesSvg = `
      <path d="M 125 154 Q 136 144 147 154" fill="none" stroke="#16141F" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M 173 154 Q 184 144 195 154" fill="none" stroke="#16141F" stroke-width="3.5" stroke-linecap="round"/>
    `;
  } else if (eyeType === 'wink') {
    eyesSvg = `
      <circle cx="136" cy="151" r="7.5" fill="#FFFFFF"/>
      <circle cx="136" cy="151" r="5" fill="${eyeColor}"/>
      <circle cx="136" cy="151" r="2.5" fill="#0C0A10"/>
      <circle cx="134" cy="149" r="1.5" fill="#FFFFFF"/>
      <path d="M 173 152 Q 184 142 195 152" fill="none" stroke="#16141F" stroke-width="3.5" stroke-linecap="round"/>
    `;
  } else if (eyeType === 'focused') {
    eyesSvg = `
      <ellipse cx="136" cy="151" rx="8" ry="6.5" fill="#FFFFFF"/>
      <ellipse cx="184" cy="151" rx="8" ry="6.5" fill="#FFFFFF"/>
      <circle cx="137" cy="151" r="4.5" fill="${eyeColor}"/>
      <circle cx="183" cy="151" r="4.5" fill="${eyeColor}"/>
      <circle cx="137" cy="151" r="2.2" fill="#0C0A10"/>
      <circle cx="183" cy="151" r="2.2" fill="#0C0A10"/>
      <circle cx="135.5" cy="149.5" r="1.3" fill="#FFFFFF"/>
      <circle cx="181.5" cy="149.5" r="1.3" fill="#FFFFFF"/>
      <line x1="127" y1="147" x2="145" y2="149" stroke="${skin.shadow}" stroke-width="2"/>
      <line x1="193" y1="147" x2="175" y2="149" stroke="${skin.shadow}" stroke-width="2"/>
    `;
  } else if (eyeType === 'curious') {
    eyesSvg = `
      <circle cx="136" cy="150" r="9.5" fill="#FFFFFF"/>
      <circle cx="184" cy="150" r="9.5" fill="#FFFFFF"/>
      <circle cx="136" cy="150" r="6" fill="${eyeColor}"/>
      <circle cx="184" cy="150" r="6" fill="${eyeColor}"/>
      <circle cx="136" cy="150" r="3" fill="#0C0A10"/>
      <circle cx="184" cy="150" r="3" fill="#0C0A10"/>
      <circle cx="133.5" cy="147.5" r="2.2" fill="#FFFFFF"/>
      <circle cx="181.5" cy="147.5" r="2.2" fill="#FFFFFF"/>
      <circle cx="138" cy="152.5" r="1.2" fill="#FFFFFF"/>
      <circle cx="186" cy="152.5" r="1.2" fill="#FFFFFF"/>
    `;
  } else {
    // normal
    eyesSvg = `
      <circle cx="136" cy="151" r="8" fill="#FFFFFF"/>
      <circle cx="184" cy="151" r="8" fill="#FFFFFF"/>
      <circle cx="136" cy="151" r="5" fill="${eyeColor}"/>
      <circle cx="184" cy="151" r="5" fill="${eyeColor}"/>
      <circle cx="136" cy="151" r="2.5" fill="#0C0A10"/>
      <circle cx="184" cy="151" r="2.5" fill="#0C0A10"/>
      <circle cx="134" cy="149" r="1.5" fill="#FFFFFF"/>
      <circle cx="182" cy="149" r="1.5" fill="#FFFFFF"/>
    `;
  }

  // 4. Expression / Mouth SVG
  let mouthSvg = '';
  if (expression === 'laugh') {
    mouthSvg = `
      <path d="M 143 183 Q 160 183 177 183 C 177 202, 143 202, 143 183 Z" fill="#6A1A24"/>
      <path d="M 146 183 Q 160 183 174 183 Q 160 189 146 183 Z" fill="#FFFFFF"/>
      <path d="M 151 198 Q 160 193 169 198 Q 160 203 151 198 Z" fill="#FF7B90"/>
    `;
  } else if (expression === 'grin') {
    mouthSvg = `
      <path d="M 144 184 Q 160 199 176 184 Q 160 181 144 184 Z" fill="#FFFFFF" stroke="#16141F" stroke-width="2"/>
      <line x1="143" y1="184" x2="177" y2="184" stroke="#16141F" stroke-width="2"/>
    `;
  } else if (expression === 'neutral') {
    mouthSvg = `
      <line x1="147" y1="188" x2="173" y2="188" stroke="#16141F" stroke-width="3" stroke-linecap="round"/>
    `;
  } else if (expression === 'surprised') {
    mouthSvg = `
      <ellipse cx="160" cy="189" rx="8" ry="11" fill="#4A181C"/>
      <ellipse cx="160" cy="186" rx="5" ry="3" fill="#FFFFFF" opacity="0.8"/>
    `;
  } else if (expression === 'cool') {
    mouthSvg = `
      <path d="M 148 188 Q 162 189 174 183" fill="none" stroke="#16141F" stroke-width="3" stroke-linecap="round"/>
    `;
  } else {
    // normal sweet smile
    mouthSvg = `
      <path d="M 145 184 Q 160 198 175 184" fill="none" stroke="#16141F" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="120" cy="166" r="8" fill="#FF4D8D" opacity="0.22"/>
      <circle cx="200" cy="166" r="8" fill="#FF4D8D" opacity="0.22"/>
    `;
  }

  // 5. Hair front / Top layer
  let hairTopSvg = '';
  if (hairStyle === 'short') {
    hairTopSvg = `
      <path d="M 100 134 C 95 90, 130 70, 165 70 C 205 70, 226 90, 222 134 C 215 110, 195 102, 160 102 C 125 102, 108 116, 100 134 Z" fill="${hairColor}"/>
      <path d="M 103 130 L 103 150 L 109 146 L 109 130 Z" fill="${hairColor}"/>
      <path d="M 217 130 L 217 150 L 211 146 L 211 130 Z" fill="${hairColor}"/>
    `;
  } else if (hairStyle === 'messy') {
    hairTopSvg = `
      <path d="M 98 136 C 92 100, 105 78, 128 68 L 138 80 L 155 62 L 168 76 L 188 64 L 198 80 L 218 72 C 228 92, 224 116, 222 136 C 210 114, 185 100, 155 104 C 128 108, 110 120, 98 136 Z" fill="${hairColor}"/>
      <path d="M 103 130 L 103 152 L 110 146 Z" fill="${hairColor}"/>
      <path d="M 217 130 L 217 152 L 210 146 Z" fill="${hairColor}"/>
    `;
  } else if (hairStyle === 'wavy' || hairStyle === 'long') {
    hairTopSvg = `
      <path d="M 96 142 C 92 88, 130 68, 165 68 C 208 68, 228 88, 224 142 C 212 110, 192 98, 160 98 C 124 98, 106 114, 96 142 Z" fill="${hairColor}"/>
      <path d="M 104 120 C 120 100, 150 104, 168 118 C 150 112, 126 114, 104 120 Z" fill="${hairColor}"/>
      <path d="M 160 102 C 182 102, 204 112, 218 126 C 208 116, 186 110, 160 102 Z" fill="${hairColor}"/>
    `;
  } else if (hairStyle === 'afro') {
    hairTopSvg = `
      <path d="M 102 126 C 114 106, 140 100, 160 100 C 180 100, 206 106, 218 126 C 202 112, 178 108, 160 108 C 142 108, 118 112, 102 126 Z" fill="${hairColor}"/>
    `;
  } else if (hairStyle === 'buzz') {
    hairTopSvg = `
      <path d="M 104 135 C 104 95, 128 82, 160 82 C 192 82, 216 95, 216 135 C 208 112, 188 102, 160 102 C 132 102, 112 112, 104 135 Z" fill="${hairColor}" opacity="0.85"/>
    `;
  } else if (hairStyle === 'beanie') {
    hairTopSvg = `
      <path d="M 94 132 C 92 78, 125 58, 160 58 C 195 58, 228 78, 226 132 Z" fill="${hairColor}"/>
      <rect x="92" y="118" width="136" height="22" rx="7" fill="${hairColor}"/>
      <rect x="92" y="118" width="136" height="22" rx="7" fill="rgba(255,255,255,0.15)"/>
      <circle cx="160" cy="52" r="14" fill="${hairColor}"/>
      <circle cx="160" cy="52" r="14" fill="rgba(255,255,255,0.2)"/>
    `;
  } else {
    hairTopSvg = '';
  }

  // 6. Accessories SVG
  let accSvg = '';
  if (accessory === 'glasses_square') {
    accSvg = `
      <rect x="116" y="138" width="38" height="26" rx="6" fill="rgba(255,255,255,0.12)" stroke="#F4F0E6" stroke-width="3"/>
      <rect x="166" y="138" width="38" height="26" rx="6" fill="rgba(255,255,255,0.12)" stroke="#F4F0E6" stroke-width="3"/>
      <line x1="154" y1="148" x2="166" y2="148" stroke="#F4F0E6" stroke-width="3"/>
      <line x1="116" y1="146" x2="102" y2="144" stroke="#F4F0E6" stroke-width="2.5"/>
      <line x1="204" y1="146" x2="218" y2="144" stroke="#F4F0E6" stroke-width="2.5"/>
      <line x1="122" y1="142" x2="132" y2="158" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
      <line x1="172" y1="142" x2="182" y2="158" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    `;
  } else if (accessory === 'glasses_round') {
    accSvg = `
      <circle cx="135" cy="151" r="17" fill="rgba(201,255,61,0.08)" stroke="#C9FF3D" stroke-width="3"/>
      <circle cx="185" cy="151" r="17" fill="rgba(201,255,61,0.08)" stroke="#C9FF3D" stroke-width="3"/>
      <path d="M 152 149 Q 160 144 168 149" fill="none" stroke="#C9FF3D" stroke-width="3"/>
      <line x1="118" y1="149" x2="102" y2="146" stroke="#C9FF3D" stroke-width="2.5"/>
      <line x1="202" y1="149" x2="218" y2="146" stroke="#C9FF3D" stroke-width="2.5"/>
      <line x1="126" y1="143" x2="136" y2="159" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
      <line x1="176" y1="143" x2="186" y2="159" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
    `;
  } else if (accessory === 'sunglasses') {
    accSvg = `
      <path d="M 115 142 L 154 142 C 154 162, 148 168, 134 168 C 120 168, 115 162, 115 142 Z" fill="#14131A" stroke="#252433" stroke-width="2.5"/>
      <path d="M 166 142 L 205 142 C 205 162, 200 168, 186 168 C 172 168, 166 162, 166 142 Z" fill="#14131A" stroke="#252433" stroke-width="2.5"/>
      <line x1="154" y1="145" x2="166" y2="145" stroke="#252433" stroke-width="3"/>
      <line x1="115" y1="144" x2="102" y2="143" stroke="#252433" stroke-width="2.5"/>
      <line x1="205" y1="144" x2="218" y2="143" stroke="#252433" stroke-width="2.5"/>
      <polygon points="120,144 140,144 126,166 118,166" fill="#C9FF3D" opacity="0.35"/>
      <polygon points="171,144 191,144 177,166 169,166" fill="#C9FF3D" opacity="0.35"/>
    `;
  } else if (accessory === 'headphones') {
    accSvg = `
      <path d="M 94 150 C 90 70, 230 70, 226 150" fill="none" stroke="#7C5CFF" stroke-width="7" stroke-linecap="round"/>
      <path d="M 115 90 C 130 82, 190 82, 205 90" fill="none" stroke="#C9FF3D" stroke-width="4" stroke-linecap="round"/>
      <rect x="88" y="136" width="16" height="36" rx="8" fill="#1A1826" stroke="#7C5CFF" stroke-width="2.5"/>
      <rect x="216" y="136" width="16" height="36" rx="8" fill="#1A1826" stroke="#7C5CFF" stroke-width="2.5"/>
      <circle cx="96" cy="154" r="4" fill="#C9FF3D"/>
      <circle cx="224" cy="154" r="4" fill="#C9FF3D"/>
    `;
  } else if (accessory === 'earring') {
    accSvg = `
      <circle cx="102" cy="168" r="5" fill="none" stroke="#C9FF3D" stroke-width="2"/>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" role="img" aria-label="Avatar de personaje">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${clothesColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${bg}" stop-opacity="1"/>
    </radialGradient>
  </defs>

  <rect width="320" height="320" rx="36" fill="url(#bgGlow)"/>
  <circle cx="160" cy="160" r="135" fill="none" stroke="rgba(244,240,230,0.08)" stroke-width="1.5"/>

  ${hairBackSvg}
  ${clothesSvg}

  <rect x="142" y="196" width="36" height="36" rx="5" fill="${skin.shadow}"/>

  <circle cx="103" cy="154" r="11" fill="${skin.base}"/>
  <circle cx="103" cy="154" r="6" fill="${skin.shadow}"/>
  <circle cx="217" cy="154" r="11" fill="${skin.base}"/>
  <circle cx="217" cy="154" r="6" fill="${skin.shadow}"/>

  <path d="M 106 142 C 106 96, 214 96, 214 142 C 214 194, 192 216, 160 216 C 128 216, 106 194, 106 142 Z" fill="${skin.base}"/>

  <path d="M 125 138 Q 136 132 147 136" fill="none" stroke="${hairColor}" stroke-width="3" stroke-linecap="round"/>
  <path d="M 173 136 Q 184 132 195 138" fill="none" stroke="${hairColor}" stroke-width="3" stroke-linecap="round"/>

  ${eyesSvg}

  <path d="M 157 165 Q 160 171 165 170" fill="none" stroke="${skin.shadow}" stroke-width="2.5" stroke-linecap="round"/>

  ${mouthSvg}

  ${hairTopSvg}

  ${accSvg}
</svg>`;
}

export function buildCharacterUrl(opts: CharacterAvatarOptions): string {
  const params = new URLSearchParams();
  if (opts.skin) params.set('skin', opts.skin);
  if (opts.hairStyle) params.set('hair', opts.hairStyle);
  if (opts.hairColor) params.set('hairColor', opts.hairColor);
  if (opts.eyeType) params.set('eyes', opts.eyeType);
  if (opts.eyeColor) params.set('eyeColor', opts.eyeColor);
  if (opts.expression) params.set('mouth', opts.expression);
  if (opts.accessory && opts.accessory !== 'none') params.set('acc', opts.accessory);
  if (opts.clothes) params.set('clothes', opts.clothes);
  if (opts.clothesColor) params.set('clothesColor', opts.clothesColor);
  if (opts.bgColor) params.set('bg', opts.bgColor);
  return `/api/media/avatar/character.svg?${params.toString()}`;
}
