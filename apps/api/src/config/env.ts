import 'dotenv/config';
import { z } from 'zod';

const booleanString = z.enum(['true', 'false']);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  WEB_ORIGIN: z.string().default('http://localhost:4200'),
  PUBLIC_URL: z.string().default('http://localhost:4100'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  JWT_ACCESS_SECRET: z.string().min(24).default('dev_access_secret_change_me_please_32'),
  JWT_REFRESH_SECRET: z.string().min(24).default('dev_refresh_secret_change_me_please_32'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  COOKIE_SECURE: booleanString.optional(),

  DATABASE_URL: z.string().min(1).default('postgres://canjea:canjea_dev@localhost:5432/canjea'),
  DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),
  DATABASE_SSL: booleanString.default('false'),

  CURRENCY: z.string().length(3).default('USD'),
  PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(3000).default(500),
  MIN_WITHDRAW_CENTS: z.coerce.number().int().min(0).default(500),

  ADMIN_EMAIL: z.string().email().default('ivanjmm01@gmail.com'),
  ADMIN_PASSWORD: z.string().min(8).default('322-520iM.'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('✖ Configuración inválida:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const allowedOrigins = new Set(
  parsed.data.WEB_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

// En producción el API sirve la PWA en el mismo origen; permite también ese origen.
try {
  allowedOrigins.add(new URL(parsed.data.PUBLIC_URL).origin);
} catch {
  // PUBLIC_URL puede ser una ruta relativa en despliegues detrás de proxy.
}

const isProd = parsed.data.NODE_ENV === 'production';

export const env = {
  ...parsed.data,
  isProd,
  isDev: parsed.data.NODE_ENV !== 'production',
  cookieSecure: parsed.data.COOKIE_SECURE ? parsed.data.COOKIE_SECURE === 'true' : isProd,
  databaseSsl: parsed.data.DATABASE_SSL === 'true',
  allowedOrigins: [...allowedOrigins],
};
