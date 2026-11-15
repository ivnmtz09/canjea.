import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Ruta no encontrada: ${req.method} ${req.path}` },
  });
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (res.headersSent) return;

  if (error instanceof AppError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? undefined,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    const details: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || 'root';
      if (!details[key]) details[key] = issue.message;
    }
    res.status(422).json({ error: { code: 'UNPROCESSABLE_ENTITY', message: 'Datos inválidos.', details } });
    return;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'El cuerpo de la petición no es JSON válido.' } });
    return;
  }

  const requestId = req.headers['x-request-id'];
  console.error('[api:error]', { path: req.path, method: req.method, requestId, error });
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: env.isDev ? (error as Error)?.message ?? 'Error interno' : 'Algo se rompió de nuestro lado. Intenta de nuevo.',
    },
  });
};
