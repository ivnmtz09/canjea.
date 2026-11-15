import { z } from 'zod';

export const createDealSchema = z
  .object({
    listingId: z.string().min(4, 'Publicación inválida').max(40),
    message: z.string().trim().min(10, 'Escribe al menos 10 caracteres').max(1000, 'Máximo 1000 caracteres'),
    offerListingId: z.string().min(4).max(40).optional().nullable(),
    cashCents: z.number({ error: 'Monto inválido' }).int('Usa centavos enteros').min(0).max(10_000_000).default(0),
  })
  .superRefine((value, ctx) => {
    if (value.cashCents === 0 && !value.offerListingId && value.message.length < 20) {
      ctx.addIssue({
        code: 'custom',
        path: ['message'],
        message: 'Describe tu oferta o adjunta una publicación (mínimo 20 caracteres)',
      });
    }
  });

export const respondDealSchema = z.object({
  action: z.enum(['accept', 'reject'], { error: 'Acción inválida' }),
});

export const cancelDealSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const reviewSchema = z.object({
  rating: z.number({ error: 'Elige una calificación' }).int().min(1, 'Mínimo 1 estrella').max(5, 'Máximo 5 estrellas'),
  comment: z.string().trim().max(600, 'Máximo 600 caracteres').default(''),
});

export const dealsQuerySchema = z.object({
  role: z.enum(['all', 'incoming', 'outgoing']).default('all'),
  status: z.enum(['all', 'PROPOSED', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'CANCELLED']).default('all'),
});

export const createMessageSchema = z.object({
  content: z.string().trim().min(1, 'El mensaje no puede estar vacío').max(1000, 'Máximo 1000 caracteres'),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
