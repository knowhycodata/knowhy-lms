import { Router, Response, NextFunction } from 'express';
import { progressService } from '../services/progress.service.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';
import { z } from 'zod';
import { BadRequestError } from '../utils/errors.js';

const router = Router();

// Validation schema
const updateProgressSchema = z.object({
  lastWatchedSecond: z.number().min(0, 'Geçersiz zaman değeri'),
  totalWatchedSeconds: z.number().min(0).optional(),
  isCompleted: z.boolean().optional(),
});

// ==================== STATİK ROUTE'LAR (ÖNCELİKLİ) ====================

// GET /api/progress/course/:courseId - Kurs ilerleme durumu (STATİK path prefix - /:lessonId'den ÖNCE olmalı!)
router.get('/course/:courseId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const progress = await progressService.getCourseProgress(req.params.courseId, req.user!.userId);
    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/progress/stats/me - Kullanıcı istatistikleri (STATİK path - /:lessonId'den ÖNCE olmalı!)
router.get('/stats/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await progressService.getUserTotalWatchTime(req.user!.userId);
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== PARAMETRİK ROUTE'LAR ====================

// GET /api/progress/:lessonId
router.get('/:lessonId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const progress = await progressService.getProgress(req.params.lessonId, req.user!.userId);
    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/progress/:lessonId (Upsert)
router.put('/:lessonId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = updateProgressSchema.safeParse(req.body);
    if (!validation.success) {
      throw new BadRequestError(validation.error.errors[0].message);
    }

    const progress = await progressService.updateProgress(
      req.params.lessonId,
      req.user!.userId,
      validation.data
    );

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
