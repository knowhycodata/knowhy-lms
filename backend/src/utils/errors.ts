export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Kaynak bulunamadı') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Yetkisiz erişim') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Bu işlem için yetkiniz yok') {
    super(message, 403);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Geçersiz istek') {
    super(message, 400);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Kaynak zaten mevcut') {
    super(message, 409);
  }
}
