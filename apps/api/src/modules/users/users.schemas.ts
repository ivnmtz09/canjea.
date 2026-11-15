import { z } from 'zod';

const usernameParam = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
});

export const updateProfileSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, 'Mínimo 2 caracteres')
      .max(60, 'Máximo 60 caracteres')
      .regex(/^[\p{L}\p{M} .'’-]+$/u, 'Solo letras, espacios y . - \'')
      .optional(),
    bio: z.string().trim().max(400, 'Máximo 400 caracteres').optional(),
    city: z.string().trim().min(2, 'Indica tu ciudad').max(80).optional(),
    country: z
      .string()
      .length(2, 'Código de país de 2 letras')
      .regex(/^[A-Za-z]{2}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    phone: z
      .string()
      .trim()
      .max(20, 'Máximo 20 caracteres')
      .regex(/^[0-9+()\-\s]*$/, 'Teléfono inválido')
      .optional(),
    avatarUrl: z
      .string()
      .trim()
      .max(500)
      .refine((value) => value === '' || value.startsWith('/api/media/') || /^https?:\/\//.test(value), 'URL inválida')
      .optional(),
  })
  .strict();

export const usersQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  role: z.enum(['USER', 'MODERATOR', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const roleSchema = z.object({
  role: z.enum(['USER', 'MODERATOR', 'ADMIN'], { error: 'Rol inválido' }),
});

export const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  reason: z.string().trim().max(300).optional(),
});

export { usernameParam };
