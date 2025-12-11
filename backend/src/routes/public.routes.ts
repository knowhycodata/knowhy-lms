import { Router, Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/settings.service.js';

const router = Router();

// GET /api/public/settings - Herkese açık ayarlar (site adı, bakım modu vs.)
router.get('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allSettings = await settingsService.getAll();
    
    // Sadece public bilgileri dön
    const publicSettings = {
      siteName: allSettings.siteName,
      siteDescription: allSettings.siteDescription,
      maintenanceMode: allSettings.maintenanceMode,
      maintenanceMessage: allSettings.maintenanceMessage,
      allowRegistration: allSettings.allowRegistration,
    };

    res.json({
      success: true,
      data: publicSettings,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/public/health - Sistem sağlık kontrolü
router.get('/health', async (req: Request, res: Response) => {
  const isMaintenanceMode = await settingsService.isMaintenanceMode();
  
  res.json({
    status: isMaintenanceMode ? 'maintenance' : 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
