import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodType } from 'zod';
import { AppError } from './errors.js';

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

interface ValidationShape {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      valid: {
        body: any;
        query: any;
        params: any;
      };
    }
  }
}

export function validate(shape: ValidationShape): RequestHandler {
  return (req, _res, next) => {
    try {
      req.valid = {
        body: shape.body ? shape.body.parse(req.body ?? {}) : req.body,
        query: shape.query ? shape.query.parse(req.query ?? {}) : req.query,
        params: shape.params ? shape.params.parse(req.params ?? {}) : req.params,
      };
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string> = {};
        for (const issue of error.issues) {
          const key = issue.path.join('.') || 'root';
          if (!details[key]) details[key] = issue.message;
        }
        next(AppError.unprocessable('Revisa los campos marcados.', details));
        return;
      }
      next(error);
    }
  };
}

/** Parses a pagination query with hard caps (protects the database). */
export function pageParams(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const limit = Math.min(48, Math.max(1, Number(query.limit ?? 12) || 12));
  return { page, limit, offset: (page - 1) * limit };
}
