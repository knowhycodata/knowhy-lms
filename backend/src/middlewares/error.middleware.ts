import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Prisma hataları
  if (err.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({
      success: false,
      error: 'Veritabanı işlemi başarısız',
    });
    return;
  }

  // Genel hata
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Sunucu hatası',
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: `Route bulunamadı: ${req.method} ${req.originalUrl}`,
  });
};
