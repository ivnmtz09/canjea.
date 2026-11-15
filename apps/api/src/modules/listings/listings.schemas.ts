import { z } from 'zod';

export const KINDS = ['OFFER', 'NEED'] as const;
export const MODALITIES = ['BARTER', 'CASH', 'BOTH'] as const;
export const CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'SERVICE'] as const;
export const LISTING_STATUSES = ['ACTIVE', 'PAUSED', 'MATCHED', 'ARCHIVED', 'REMOVED'] as const;

const priceCents = z
  .number({ error: 'El precio debe ser un número' })
  .int('Usa centavos enteros')
  .min(0, 'El precio no puede ser negativo')
  .max(100_000_000, 'Precio fuera de rango');

export const createListingSchema = z
  .object({
    kind: z.enum(KINDS, { error: 'Elige si ofreces o necesitas' }),
    title: z.string().trim().min(6, 'Mínimo 6 caracteres').max(90, 'Máximo 90 caracteres'),
    description: z.string().trim().min(30, 'Cuenta un poco más (mínimo 30 caracteres)').max(2000, 'Máximo 2000 caracteres'),
    categoryId: z.string().min(1, 'Elige una categoría').max(40),
    condition: z.enum(CONDITIONS, { error: 'Elige el estado del artículo' }),
    modality: z.enum(MODALITIES, { error: 'Elige la modalidad de canje' }),
    priceCents: priceCents.default(0),
    currency: z
      .string()
      .length(3, 'Código de moneda inválido')
      .regex(/^[A-Za-z]{3}$/, 'Código de moneda inválido')
      .transform((value) => value.toUpperCase())
      .default('USD'),
    location: z.string().trim().min(2, 'Indica la zona').max(80, 'Máximo 80 caracteres'),
    tags: z
      .array(z.string().trim().min(2, 'Etiqueta muy corta').max(24, 'Etiqueta muy larga'))
      .max(5, 'Máximo 5 etiquetas')
      .default([]),
    imageUrl: z
      .string()
      .trim()
      .max(500, 'URL demasiado larga')
      .refine(
        (value) => value === '' || value.startsWith('/api/media/') || /^https?:\/\//.test(value),
        'Debe ser una URL http(s) o un recurso del servidor',
      )
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.modality !== 'BARTER' && value.priceCents < 100) {
      ctx.addIssue({ code: 'custom', path: ['priceCents'], message: 'Indica un precio de al menos $1.00 para canje con dinero' });
    }
    const unique = new Set(value.tags.map((tag) => tag.toLowerCase()));
    if (unique.size !== value.tags.length) {
      ctx.addIssue({ code: 'custom', path: ['tags'], message: 'No repitas etiquetas' });
    }
  });

export const updateListingSchema = z
  .object({
    title: z.string().trim().min(6).max(90).optional(),
    description: z.string().trim().min(30).max(2000).optional(),
    categoryId: z.string().min(1).max(40).optional(),
    condition: z.enum(CONDITIONS).optional(),
    modality: z.enum(MODALITIES).optional(),
    priceCents: priceCents.optional(),
    location: z.string().trim().min(2).max(80).optional(),
    tags: z.array(z.string().trim().min(2).max(24)).max(5).optional(),
    imageUrl: z.string().trim().max(500).optional(),
  })
  .strict();

export const listingStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']).default('PAUSED'),
  reason: z.string().max(300).optional(),
});

export const listingQuerySchema = z.object({
  kind: z.enum(KINDS).optional(),
  category: z.string().max(40).optional(),
  modality: z.enum(MODALITIES).optional(),
  q: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['recent', 'popular', 'price_asc', 'price_desc']).default('recent'),
  status: z.enum(LISTING_STATUSES).optional(),
  owner: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type ListingQueryInput = z.infer<typeof listingQuerySchema>;
