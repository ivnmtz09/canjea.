export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Solicitud inválida', details?: unknown) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'No autenticado') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'No tienes permisos para esta acción') {
    return new AppError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Recurso no encontrado') {
    return new AppError(404, 'NOT_FOUND', message);
  }
  static conflict(message = 'Conflicto con el estado actual', details?: unknown) {
    return new AppError(409, 'CONFLICT', message, details);
  }
  static unprocessable(message = 'Datos inválidos', details?: unknown) {
    return new AppError(422, 'UNPROCESSABLE_ENTITY', message, details);
  }
  static tooMany(message = 'Demasiados intentos. Intenta más tarde.') {
    return new AppError(429, 'TOO_MANY_REQUESTS', message);
  }
}
