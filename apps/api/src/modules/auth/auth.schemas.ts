import { z } from 'zod';

export const passwordSchema = z
  .string({ error: 'La contraseña es obligatoria' })
  .min(10, 'Mínimo 10 caracteres')
  .max(128, 'Máximo 128 caracteres')
  .regex(/[A-Z]/, 'Incluye al menos una mayúscula')
  .regex(/[a-z]/, 'Incluye al menos una minúscula')
  .regex(/[0-9]/, 'Incluye al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Incluye al menos un símbolo')
  .refine((value) => !/\s/.test(value), 'No uses espacios');

export const emailSchema = z
  .email('Correo electrónico inválido')
  .max(160, 'Máximo 160 caracteres')
  .transform((value) => value.trim().toLowerCase());

export const usernameSchema = z
  .string()
  .min(3, 'Mínimo 3 caracteres')
  .max(20, 'Máximo 20 caracteres')
  .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guion bajo')
  .transform((value) => value.toLowerCase());

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  displayName: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(60, 'Máximo 60 caracteres')
    .regex(/^[\p{L}\p{M} .'’-]+$/u, 'Solo letras, espacios y . - \''),
  password: passwordSchema,
  city: z.string().min(2, 'Indica tu ciudad').max(80, 'Máximo 80 caracteres'),
  country: z
    .string()
    .length(2, 'Usa el código de 2 letras')
    .regex(/^[A-Za-z]{2}$/, 'Código de país inválido')
    .transform((value) => value.toUpperCase())
    .default('MX'),
  acceptedTerms: z.literal(true, { error: 'Debes aceptar los términos' }),
  ageConfirmed: z.literal(true, { error: 'Debes confirmar que tienes 18 años o más' }),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Escribe tu correo o usuario').max(160),
  password: z.string().min(1, 'La contraseña es obligatoria').max(128),
  remember: z.boolean().optional().default(true),
});

export const verifyEmailSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'El código tiene 6 dígitos'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, 'El código tiene 6 dígitos'),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Escribe tu contraseña actual').max(128),
  newPassword: passwordSchema,
});

export const verifyPasswordSchema = z.object({
  password: z.string().min(1, 'Escribe tu contraseña').max(128),
});

export const resendCodeSchema = z.object({
  purpose: z.enum(['EMAIL_VERIFY', 'PASSWORD_RESET']).default('EMAIL_VERIFY'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
