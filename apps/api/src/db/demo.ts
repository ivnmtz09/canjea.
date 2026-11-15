import { all, count, get, run, tx } from '../lib/db.js';
import { hashPassword } from '../lib/password.js';
import { newId, nowIso } from '../lib/ids.js';
import { env } from '../config/env.js';

interface CategoryRow {
  id: string;
  slug: string;
}

const DEMO_USERS = [
  {
    username: 'sofia_reyes',
    email: 'sofia.reyes@ejemplo.com',
    displayName: 'Sofía Reyes',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
    bio: 'Desarrolladora de software y entusiasta del hardware libre. Me encanta restaurar bicis y experimentar con sintetizadores.',
    city: 'Ciudad de México',
    country: 'MX',
    ratingAvg: 4.95,
    ratingCount: 18,
  },
  {
    username: 'carlos_v',
    email: 'carlos.vega@ejemplo.com',
    displayName: 'Carlos Vega',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    bio: 'Pianista y productor musical. Cambio instrumentos, equipo de audio analógico y doy tutorías de producción.',
    city: 'Bogotá',
    country: 'CO',
    ratingAvg: 5.0,
    ratingCount: 24,
  },
  {
    username: 'luna_diaz',
    email: 'luna.diaz@ejemplo.com',
    displayName: 'Luna Díaz',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    bio: 'Diseñadora editorial y fotógrafa analógica. Apasionada de las tipografías raras y los teclados mecánicos.',
    city: 'Buenos Aires',
    country: 'AR',
    ratingAvg: 4.9,
    ratingCount: 12,
  },
  {
    username: 'andres_m',
    email: 'andres.molina@ejemplo.com',
    displayName: 'Andrés Molina',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    bio: 'Ilustrador digital y modelador 3D. Intercambio hardware creativo, pantallas de alta gama y consolas retro.',
    city: 'Santiago',
    country: 'CL',
    ratingAvg: 4.88,
    ratingCount: 9,
  },
  {
    username: 'paula_j',
    email: 'paula.jimenez@ejemplo.com',
    displayName: 'Paula Jiménez',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
    bio: 'Ciclista urbana y fotógrafa documental. Busco equipo fotográfico vintage a cambio de componentes de ruta.',
    city: 'Lima',
    country: 'PE',
    ratingAvg: 5.0,
    ratingCount: 15,
  },
  {
    username: 'miguel_r',
    email: 'miguel.ramirez@ejemplo.com',
    displayName: 'Miguel Ramírez',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80',
    bio: 'Carpintero y restaurador de mobiliario de mediados de siglo. Diseño piezas a medida y cambio por tecnología.',
    city: 'Guadalajara',
    country: 'MX',
    ratingAvg: 4.92,
    ratingCount: 14,
  },
  {
    username: 'isa_torres',
    email: 'isabel.torres@ejemplo.com',
    displayName: 'Isabel Torres',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    bio: 'Músico de sesión y coleccionista botánica. Cambio plantas exóticas, guitarras y accesorios de estudio.',
    city: 'Medellín',
    country: 'CO',
    ratingAvg: 4.96,
    ratingCount: 21,
  },
  {
    username: 'diego_w',
    email: 'diego.wolff@ejemplo.com',
    displayName: 'Diego Wolff',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
    bio: 'Ingeniero de audio y coleccionista de vinilos. Trueques justos en Montevideo de sintetizadores y pedales.',
    city: 'Montevideo',
    country: 'UY',
    ratingAvg: 4.85,
    ratingCount: 8,
  },
];

const DEMO_LISTINGS = [
  // TECNOLOGIA
  {
    user: 'sofia_reyes',
    category: 'tecnologia',
    kind: 'OFFER',
    title: 'MacBook Pro 13 M2 en excelente estado con caja original',
    description: 'Batería con 94% de vida útil, 256GB SSD y 8GB de RAM unificada. Incluye cargador MagSafe original y funda de neopreno. Busco trueque por cámara mirrorless tipo Sony A6400 o equipo de audio profesional, o acepto diferencia en dinero.',
    condition: 'LIKE_NEW',
    modality: 'BOTH',
    priceCents: 98000,
    location: 'Condesa, CDMX',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
    tags: ['apple', 'macbook', 'm2', 'computacion'],
    views: 142,
  },
  {
    user: 'carlos_v',
    category: 'tecnologia',
    kind: 'OFFER',
    title: 'iPhone 14 Pro 256GB Space Black libre de fábrica',
    description: 'Impecable sin rayones, siempre con vidrio templado y protector Nomad de cuero. Batería al 89%. Interesado en permutar por bicicleta gravel talla M o interfaz de audio Universal Audio Apollo.',
    condition: 'LIKE_NEW',
    modality: 'BOTH',
    priceCents: 75000,
    location: 'Chapinero, Bogotá',
    imageUrl: 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?auto=format&fit=crop&w=800&q=80',
    tags: ['iphone', 'apple', 'smartphone'],
    views: 198,
  },
  {
    user: 'luna_diaz',
    category: 'tecnologia',
    kind: 'OFFER',
    title: 'Teclado mecánico inalámbrico Keychron K2 RGB Hot-swap',
    description: 'Switches Gateron G Pro Brown lubricados a mano. Viene con keycaps PBT retro y cable trenzado USB-C. Compatible con Mac y Windows. Busco pedal de guitarra o trueque por libros de diseño tipográfico.',
    condition: 'GOOD',
    modality: 'BOTH',
    priceCents: 12000,
    location: 'Palermo, Buenos Aires',
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    tags: ['teclado', 'keychron', 'mecanico', 'setup'],
    views: 86,
  },
  {
    user: 'andres_m',
    category: 'tecnologia',
    kind: 'NEED',
    title: 'Busco monitor 4K 27 o 32 pulgadas con calibración de color',
    description: 'Para trabajo intensivo de ilustración y diseño gráfico. Preferencia marcas Dell Ultrasharp, LG Ergo o BenQ PD series. Ofrezco a cambio iPad 10ma gen o pago parte en dinero garantizado.',
    condition: 'GOOD',
    modality: 'BOTH',
    priceCents: 45000,
    location: 'Providencia, Santiago',
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
    tags: ['monitor', '4k', 'diseno', 'pantalla'],
    views: 64,
  },

  // BICICLETAS
  {
    user: 'paula_j',
    category: 'bicicletas',
    kind: 'OFFER',
    title: 'Bicicleta de montaña Trek Marlin 7 2022 talla M',
    description: 'Transmisión Shimano Deore 1x10, frenos hidráulicos Tektro y horquilla RockShox Judy con bloqueo. Mantenimiento completo hace dos semanas. Busco permuta por bici de gravel o equipo fotográfico analógico.',
    condition: 'GOOD',
    modality: 'BOTH',
    priceCents: 68000,
    location: 'Miraflores, Lima',
    imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
    tags: ['trek', 'mtb', 'ciclismo', 'deore'],
    views: 115,
  },
  {
    user: 'miguel_r',
    category: 'bicicletas',
    kind: 'OFFER',
    title: 'Bicicleta urbana clásica de pista cuadro cromoly artesanal',
    description: 'Armada con cuadro Columbus de tubería fina, mazas Miche Primato pista y aros Mavic Open Pro. Manubrio bullhorn Nitto forrado en cuero genuino. Cambio por herramientas de carpintería o guitarra acústica.',
    condition: 'LIKE_NEW',
    modality: 'BARTER',
    priceCents: 0,
    location: 'Zapopan, Guadalajara',
    imageUrl: 'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=800&q=80',
    tags: ['fixie', 'urbana', 'vintage', 'acero'],
    views: 94,
  },
  {
    user: 'sofia_reyes',
    category: 'bicicletas',
    kind: 'OFFER',
    title: 'Bicicleta de ruta aero aluminio con horquilla de carbono',
    description: 'Grupo Shimano 105 R7000 completo, ruedas de perfil 38mm y llantas Continental Grand Prix 5000 con muy poco rodaje. Talla 54 (para 1.72m a 1.80m). Lista para rodar en carretera.',
    condition: 'LIKE_NEW',
    modality: 'BOTH',
    priceCents: 85000,
    location: 'Roma Norte, CDMX',
    imageUrl: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=800&q=80',
    tags: ['ruta', 'shimano', 'carbono', 'entrenamiento'],
    views: 133,
  },

  // MUSICA
  {
    user: 'isa_torres',
    category: 'musica',
    kind: 'OFFER',
    title: 'Fender Stratocaster Sunburst Player Series Made in Mexico',
    description: 'Cuerpo de aliso, mástil de arce con perfil Modern C y pastillas Player Series Alnico 5. Calibrada con cuerdas DAddario 0.10. Incluye funda acolchada Fender y cable Mogami.',
    condition: 'LIKE_NEW',
    modality: 'BOTH',
    priceCents: 72000,
    location: 'El Poblado, Medellín',
    imageUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=800&q=80',
    tags: ['fender', 'guitarra', 'electrica', 'stratocaster'],
    views: 210,
  },
  {
    user: 'diego_w',
    category: 'musica',
    kind: 'OFFER',
    title: 'Sintetizador analógico polifónico Korg Minilogue XD',
    description: '4 voces, secuenciador por pasos polifónico de 16 pasos y motor multi-digital de efectos estéreo. Conservo caja original, fuente y manuales. Busco permuta por sintetizador de batería o pedal Strymon.',
    condition: 'LIKE_NEW',
    modality: 'BOTH',
    priceCents: 54000,
    location: 'Punta Carretas, Montevideo',
    imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80',
    tags: ['sintetizador', 'korg', 'analogico', 'audio'],
    views: 165,
  },
  {
    user: 'carlos_v',
    category: 'musica',
    kind: 'OFFER',
    title: 'Guitarra acústica Taylor GS Mini Mahogany con estuche semi-rígido',
    description: 'Tapa armónica de caoba sólida con un sonido cálido y proyección sorprendente para su tamaño compacto. Excelente para viaje o estudio. La cambio por teclado MIDI 88 teclas contrapesadas.',
    condition: 'GOOD',
    modality: 'BOTH',
    priceCents: 62000,
    location: 'Usaquén, Bogotá',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    tags: ['taylor', 'acustica', 'caoba', 'instrumento'],
    views: 128,
  },

  // DISENO
  {
    user: 'luna_diaz',
    category: 'diseno',
    kind: 'OFFER',
    title: 'Servicio de diseño de identidad de marca y sistema visual completo',
    description: 'Incluye investigación, logotipo, paleta cromática accesible, tipografía secundaria, manual de normas de marca y plantillas para redes sociales. Intercambio por equipo fotográfico o servicios de desarrollo web.',
    condition: 'SERVICE',
    modality: 'BOTH',
    priceCents: 90000,
    location: 'San Telmo, Buenos Aires',
    imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=800&q=80',
    tags: ['branding', 'diseno', 'identidad', 'servicio'],
    views: 176,
  },
  {
    user: 'andres_m',
    category: 'diseno',
    kind: 'OFFER',
    title: 'iPad Pro 12.9 M1 128GB con Apple Pencil 2 y Magic Keyboard',
    description: 'Pantalla Liquid Retina XDR Mini-LED ideal para ilustración y retoque fotográfico profesional. Batería con excelente rendimiento. Busco cambio por MacBook Air M2 o workstation PC.',
    condition: 'LIKE_NEW',
    modality: 'BOTH',
    priceCents: 110000,
    location: 'Las Condes, Santiago',
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80',
    tags: ['ipad', 'apple-pencil', 'ilustracion', 'dibujo'],
    views: 220,
  },
  {
    user: 'paula_j',
    category: 'diseno',
    kind: 'OFFER',
    title: 'Cámara Canon EOS R con lente RF 50mm f/1.8 STM',
    description: 'Sensor Full Frame de 30.3MP, enfoque Dual Pixel CMOS AF y grabación 4K. Menos de 8,000 disparos. Incluye 2 baterías originales y cargador dual. Abierta a permutas por ópticas de cine o trueques creativos.',
    condition: 'LIKE_NEW',
    modality: 'BOTH',
    priceCents: 115000,
    location: 'Barranco, Lima',
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
    tags: ['canon', 'fotografia', 'mirrorless', 'camara'],
    views: 184,
  },

  // HOGAR
  {
    user: 'miguel_r',
    category: 'hogar',
    kind: 'OFFER',
    title: 'Silla ergonómica Herman Miller Aeron Remastered grafito Talla B',
    description: 'Totalmente configurable: soporte lumbar PostureFit SL, brazos 3D ajustables y reclinación con bloqueo de inclinación hacia adelante. Malla Pellicle 8Z impecable. Busco cambio por bicicleta de montaña o laptop.',
    condition: 'LIKE_NEW',
    modality: 'BOTH',
    priceCents: 89000,
    location: 'Americana, Guadalajara',
    imageUrl: 'https://images.unsplash.com/photo-1580481077195-c322b270830d?auto=format&fit=crop&w=800&q=80',
    tags: ['herman-miller', 'aeron', 'ergonomia', 'oficina'],
    views: 245,
  },
  {
    user: 'isa_torres',
    category: 'hogar',
    kind: 'OFFER',
    title: 'Monstera Deliciosa gigante en maceta de greda artesanal',
    description: 'Planta de más de 1.40 metros de altura con hojas grandes y fenestraciones dobles. Raíces sanas y tutor de musgo de esfagno. Perfecta para dar vida a un salón o estudio. Acepto libros de arte o trueque botánico.',
    condition: 'GOOD',
    modality: 'BARTER',
    priceCents: 0,
    location: 'Laureles, Medellín',
    imageUrl: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80',
    tags: ['plantas', 'botanica', 'monstera', 'decoracion'],
    views: 92,
  },
  {
    user: 'diego_w',
    category: 'hogar',
    kind: 'OFFER',
    title: 'Mesa de comedor de roble macizo 1.80m diseño escandinavo',
    description: 'Madera tratada con cera de abeja natural ecológica. Patas en ángulo desmontables. Capacidad cómoda para 6 a 8 personas. Interesado en canjear por equipo de música o sillón individual moderno.',
    condition: 'LIKE_NEW',
    modality: 'BOTH',
    priceCents: 65000,
    location: 'Pocitos, Montevideo',
    imageUrl: 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?auto=format&fit=crop&w=800&q=80',
    tags: ['muebles', 'madera', 'roble', 'escandinavo'],
    views: 104,
  },

  // GAMING
  {
    user: 'luna_diaz',
    category: 'gaming',
    kind: 'OFFER',
    title: 'PlayStation 5 versión disco con 2 mandos DualSense y 3 juegos',
    description: 'Incluye soporte vertical, cables de alimentación y HDMI 2.1 de alta velocidad. Títulos incluidos: Spider-Man 2, God of War Ragnarok y Demon Souls. Cambio por iPhone reciente o cámara compacta avanzada.',
    condition: 'LIKE_NEW',
    modality: 'BOTH',
    priceCents: 52000,
    location: 'Colegiales, Buenos Aires',
    imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80',
    tags: ['ps5', 'playstation', 'sony', 'videojuegos'],
    views: 290,
  },
  {
    user: 'andres_m',
    category: 'gaming',
    kind: 'OFFER',
    title: 'Nintendo Switch OLED Blanca con estuche oficial y Zelda TOTK',
    description: 'Pantalla OLED de 7 pulgadas en perfecto estado con mica de vidrio instalada desde el primer día. Viene completa en su caja original. Busco trueque por tablet gráfica o sintetizador portátil tipo Korg Volca.',
    condition: 'LIKE_NEW',
    modality: 'BOTH',
    priceCents: 34000,
    location: 'Ñuñoa, Santiago',
    imageUrl: 'https://images.unsplash.com/photo-1612287233215-d91361b2fc8d?auto=format&fit=crop&w=800&q=80',
    tags: ['nintendo', 'switch', 'oled', 'zelda'],
    views: 185,
  },

  // MODA
  {
    user: 'sofia_reyes',
    category: 'moda',
    kind: 'OFFER',
    title: 'Chaqueta de cuero genuino estilo biker vintage talla M',
    description: 'Cuero vacuno grueso de excelente pátina natural con herrajes metálicos YKK originales. Forro interior de satén en óptimo estado. Trueque por ropa técnica de ciclismo o accesorios de cuero artesanales.',
    condition: 'GOOD',
    modality: 'BARTER',
    priceCents: 0,
    location: 'Juárez, CDMX',
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
    tags: ['cuero', 'chaqueta', 'vintage', 'moda'],
    views: 78,
  },

  // COMIDA
  {
    user: 'carlos_v',
    category: 'comida',
    kind: 'OFFER',
    title: 'Café de especialidad colombiano tostado en origen 3 variedades',
    description: 'Lote de 3 bolsas de 250g cada una: Geisha proceso lavado de Huila, Borbón Rosado de Nariño y Caturra Honey de Quindío. Tueste medio fresco. Cambio por libros de gastronomía o accesorios de barismo.',
    condition: 'NEW',
    modality: 'BOTH',
    priceCents: 18000,
    location: 'Teusaquillo, Bogotá',
    imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80',
    tags: ['cafe', 'especialidad', 'colombia', 'artesanal'],
    views: 105,
  },
];

export async function seedDemo(): Promise<void> {
  const timestamp = nowIso();
  const defaultPasswordHash = await hashPassword('Demo1234!');

  const categoryRows = await all<CategoryRow>('SELECT id, slug FROM categories');
  const catMap = new Map<string, string>(categoryRows.map((c) => [c.slug, c.id]));

  await tx(async () => {
    // 1. Crear usuarios demo
    for (const u of DEMO_USERS) {
      const existing = await get<{ id: string }>('SELECT id FROM users WHERE username = ?', u.username);
      let userId = existing?.id;
      if (!userId) {
        userId = newId('user');
        await run(
          `INSERT INTO users
            (id, email, username, display_name, password_hash, avatar_url, bio, city, country, role, status, email_verified_at, rating_avg, rating_count, token_version, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'USER', 'ACTIVE', ?, ?, ?, 1, ?, ?)`,
          userId,
          u.email,
          u.username,
          u.displayName,
          defaultPasswordHash,
          u.avatarUrl,
          u.bio,
          u.city,
          u.country,
          timestamp,
          u.ratingAvg,
          u.ratingCount,
          timestamp,
          timestamp,
        );

        await run(
          'INSERT INTO wallets (user_id, balance_cents, escrow_cents, currency, updated_at) VALUES (?, 75000, 0, ?, ?)',
          userId,
          env.CURRENCY,
          timestamp,
        );
      }
    }

    // 2. Crear listings demo
    const userRows = await all<{ id: string; username: string }>('SELECT id, username FROM users');
    const userMap = new Map<string, string>(userRows.map((u) => [u.username, u.id]));

    for (const item of DEMO_LISTINGS) {
      const userId = userMap.get(item.user);
      const categoryId = catMap.get(item.category);
      if (!userId || !categoryId) continue;

      const existingListing = await get<{ id: string }>(
        'SELECT id FROM listings WHERE user_id = ? AND title = ?',
        userId,
        item.title,
      );
      if (existingListing) continue;

      const listingId = newId('listing');
      await run(
        `INSERT INTO listings
          (id, user_id, kind, title, description, category_id, condition, modality, price_cents, currency, image_url, tags, location, status, views, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
        listingId,
        userId,
        item.kind,
        item.title,
        item.description,
        categoryId,
        item.condition,
        item.modality,
        item.priceCents,
        env.CURRENCY,
        item.imageUrl,
        JSON.stringify(item.tags),
        item.location,
        item.views,
        timestamp,
        timestamp,
      );
    }
  });

  const [usersCount, listingsCount] = await Promise.all([
    count('SELECT COUNT(*) AS n FROM users'),
    count('SELECT COUNT(*) AS n FROM listings'),
  ]);
  console.info(`  Demo seed completado: ${usersCount} usuario(s) y ${listingsCount} publicacion(es) en total.`);
}
