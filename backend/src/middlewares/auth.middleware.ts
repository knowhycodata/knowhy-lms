import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
import { verifyToken } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { Role } from '@prisma/client';
import { settingsService } from '../services/settings.service.js';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token bulunamadı');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    req.user = decoded;

    // Bakım modu kontrolü - Admin hariç herkes engellenir
    const isMaintenanceMode = await settingsService.isMaintenanceMode();
    if (isMaintenanceMode && decoded.role !== 'ADMIN') {
      const message = await settingsService.get('maintenanceMessage');
      res.status(503).json({
        success: false,
        error: message || 'Sistem bakımda, lütfen daha sonra tekrar deneyin.',
        maintenanceMode: true,
      });
      return;
    }

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Geçersiz token'));
    }
  }
};

export const authorize = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Kimlik doğrulaması gerekli'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Bu işlem için yetkiniz yok'));
    }

    next();
  };
};
