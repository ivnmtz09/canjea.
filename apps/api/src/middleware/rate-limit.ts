import { rateLimit } from 'express-rate-limit';

const base = {
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiadas solicitudes. Baja el ritmo y vuelve a intentar en unos minutos.',
    },
  },
};

export const apiLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 300,
  skip: (req) => req.method === 'OPTIONS',
});

/** Protege login, registro, códigos y reseteo de contraseña. */
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60_000,
  limit: 40,
  skipSuccessfulRequests: true,
});

export const writeLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 60,
});
