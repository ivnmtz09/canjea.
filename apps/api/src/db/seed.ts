import { closeDatabase, count, get, run, tx } from '../lib/db.js';
import { hashPassword } from '../lib/password.js';
import { newId, nowIso } from '../lib/ids.js';
import { env } from '../config/env.js';
import { seedDemo } from './demo.js';

const CATEGORIES = [
  { slug: 'tecnologia', name: 'Tecnología', icon: 'cpu', blurb: 'Hardware, gadgets y equipo de trabajo.' },
  { slug: 'hogar', name: 'Hogar', icon: 'home', blurb: 'Muebles, objetos y cosas para vivir mejor.' },
  { slug: 'bicicletas', name: 'Bicicletas', icon: 'bike', blurb: 'Rodadas, refacciones y taller.' },
  { slug: 'musica', name: 'Música', icon: 'music', blurb: 'Instrumentos, clases y grabación.' },
  { slug: 'diseno', name: 'Diseño', icon: 'pen-tool', blurb: 'Identidad, ilustración y fotografía.' },
  { slug: 'servicios', name: 'Servicios', icon: 'wrench', blurb: 'Manos, oficios y horas de trabajo.' },
  { slug: 'comida', name: 'Comida', icon: 'coffee', blurb: 'Café, pan y sabores caseros.' },
  { slug: 'libros', name: 'Libros', icon: 'book-open', blurb: 'Bibliotecas que circulan.' },
  { slug: 'gaming', name: 'Gaming', icon: 'gamepad-2', blurb: 'Consolas, juegos y accesorios.' },
  { slug: 'moda', name: 'Moda', icon: 'shirt', blurb: 'Ropa, calzado y accesorios.' },
];

/**
 * Siembra mínima de producción:
 * - El catálogo de categorías, necesario para publicar.
 * - Una única cuenta administradora, tomada de ADMIN_EMAIL / ADMIN_PASSWORD.
 *
 * No crea usuarios de prueba, publicaciones, negociaciones ni movimientos.
 * Es idempotente: puede ejecutarse en cada arranque sin duplicar datos.
 */
export async function seed(): Promise<void> {
  const timestamp = nowIso();
  const adminEmail = env.ADMIN_EMAIL.trim().toLowerCase();
  const adminUsername = 'admin';

  await tx(async () => {
    let sort = 0;
    for (const category of CATEGORIES) {
      await run(
        `INSERT INTO categories (id, slug, name, icon, blurb, sort)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, blurb = EXCLUDED.blurb, sort = EXCLUDED.sort`,
        newId('category'),
        category.slug,
        category.name,
        category.icon,
        category.blurb,
        sort++,
      );
    }

    const existing = await get<{ id: string }>('SELECT id FROM users WHERE lower(email) = ?', adminEmail);
    if (!existing) {
      const id = newId('user');
      const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
      await run(
        `INSERT INTO users
          (id, email, username, display_name, password_hash, avatar_url, bio, city, country, role, status, email_verified_at, rating_avg, rating_count, token_version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ADMIN', 'ACTIVE', ?, 5, 0, 1, ?, ?)`,
        id,
        adminEmail,
        adminUsername,
        'Administrador CANJEA',
        passwordHash,
        `/api/media/avatar/${adminUsername}.svg?n=AD`,
        'Cuenta de administración de la plataforma.',
        'Ciudad de México',
        'MX',
        timestamp,
        timestamp,
        timestamp,
      );
      await run(
        'INSERT INTO wallets (user_id, balance_cents, escrow_cents, currency, updated_at) VALUES (?, 0, 0, ?, ?)',
        id,
        env.CURRENCY,
        timestamp,
      );
      await run(
        `INSERT INTO audit_logs (id, actor_id, action, entity, entity_id, meta, ip, created_at)
         VALUES (?, ?, 'seed.bootstrap', 'system', NULL, ?, NULL, ?)`,
        newId('audit'),
        id,
        JSON.stringify({ admin: adminEmail, categories: CATEGORIES.length }),
        timestamp,
      );
    }
  });

  const [users, listings, categories] = await Promise.all([
    count('SELECT COUNT(*) AS n FROM users'),
    count('SELECT COUNT(*) AS n FROM listings'),
    count('SELECT COUNT(*) AS n FROM categories'),
  ]);
  console.info(`  Seed listo: ${users} usuario(s), ${categories} categorías, ${listings} publicaciones.`);
}

export async function maybeSeed(): Promise<void> {
  const [users, categories] = await Promise.all([
    count('SELECT COUNT(*) AS n FROM users'),
    count('SELECT COUNT(*) AS n FROM categories'),
  ]);
  if (users === 0 || categories < CATEGORIES.length) {
    console.info('  · Base incompleta, sembrando catálogo y administrador…');
    await seed();
  }
  const listingsCount = await count('SELECT COUNT(*) AS n FROM listings');
  if (listingsCount === 0) {
    console.info('  · Sembrando datos de demo...');
    await seedDemo();
  }
}

if (process.argv[1]?.includes('seed')) {
  await maybeSeed();
  await closeDatabase();
}
