import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
import { settingsService } from '../services/settings.service.js';

/**
 * Bakım modu middleware'i
 * Bakım modunda sadece ADMIN kullanıcılar geçebilir
 */
export const maintenanceCheck = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isMaintenanceMode = await settingsService.isMaintenanceMode();
    
    if (!isMaintenanceMode) {
      return next();
    }

    // Admin kullanıcılar bakım modunda da geçebilir
    if (req.user?.role === 'ADMIN') {
      return next();
    }

    // Public endpoint'ler her zaman erişilebilir
    const publicPaths = ['/api/public', '/api/auth/login', '/health'];
    if (publicPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const maintenanceMessage = await settingsService.get('maintenanceMessage');
    
    res.status(503).json({
      success: false,
      error: maintenanceMessage || 'Sistem bakımda, lütfen daha sonra tekrar deneyin.',
      maintenanceMode: true,
    });
  } catch (error) {
    // Hata durumunda sistemi açık tut
    next();
  }
};
