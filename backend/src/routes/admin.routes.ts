import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { settingsService } from '../services/settings.service.js';
import { z } from 'zod';
import { BadRequestError } from '../utils/errors.js';

const router = Router();

// Tüm admin routes için authentication ve authorization gerekli
router.use(authenticate);
router.use(authorize('ADMIN'));

// Sistem ayarları şeması
const settingsSchema = z.object({
  siteName: z.string().min(1, 'Site adı gerekli'),
  siteDescription: z.string(),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string(),
  maxFileSize: z.number().min(1).max(1000),
  maxVideoSize: z.number().min(1).max(2000),
  allowedVideoTypes: z.array(z.string()),
  allowedDocTypes: z.array(z.string()),
  passwordMinLength: z.number().min(4).max(32),
  sessionTimeout: z.number().min(1).max(168),
  allowRegistration: z.boolean(),
});

// GET /api/admin/settings - Tüm ayarları getir
router.get('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await settingsService.getAll();
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/settings - Ayarları güncelle
router.put('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = settingsSchema.safeParse(req.body);
    if (!validation.success) {
      throw new BadRequestError('Geçersiz ayarlar: ' + validation.error.errors[0].message);
    }

    await settingsService.setMany(validation.data);

    res.json({
      success: true,
      message: 'Ayarlar başarıyla güncellendi',
      data: validation.data,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
