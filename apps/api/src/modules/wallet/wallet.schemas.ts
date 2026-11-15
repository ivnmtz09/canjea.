import { z } from 'zod';
import { env } from '../../config/env.js';

export const topUpSchema = z.object({
  amountCents: z
    .number({ error: 'Indica un monto' })
    .int('Usa centavos enteros')
    .min(500, 'El mínimo es $5.00')
    .max(200_000, 'El máximo por operación es $2,000.00'),
});

export const withdrawSchema = z.object({
  amountCents: z
    .number({ error: 'Indica un monto' })
    .int('Usa centavos enteros')
    .min(env.MIN_WITHDRAW_CENTS, `El mínimo es $${(env.MIN_WITHDRAW_CENTS / 100).toFixed(2)}`)
    .max(1_000_000, 'Monto fuera de rango'),
});

export type TopUpInput = z.infer<typeof topUpSchema>;
