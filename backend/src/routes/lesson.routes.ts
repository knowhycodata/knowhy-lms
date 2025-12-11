import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { LessonService } from '../services/lesson.service.js';
import { AuthRequest } from '../types/index.js';
import { z } from 'zod';
import { BadRequestError } from '../utils/errors.js';

const router = Router();
const lessonService = new LessonService();

const lessonSchema = z.object({
  title: z.string().min(1, 'Ders başlığı boş olamaz'),
  description: z.string().optional(),
  videoType: z.enum(['VIDEO_LOCAL', 'VIDEO_YOUTUBE']).optional(),
  videoUrl: z.string().optional(),
  duration: z.number().optional(),
  thumbnailUrl: z.string().optional(),
});

// Modül derslerini getir
router.get(
  '/module/:moduleId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const lessons = await lessonService.findByModule(req.params.moduleId);
      res.json({ success: true, data: lessons });
    } catch (error) {
      next(error);
    }
  }
);

// Ders detayı (modul ve kurs bilgileriyle)
router.get(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const lesson = await lessonService.findByIdWithDetails(
        req.params.id,
        req.user?.userId,
        req.user?.role
      );
      res.json({ success: true, data: lesson });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/lessons/:id/nav - Önceki/sonraki ders navigasyonu
router.get('/:id/nav', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const navigation = await lessonService.getNavigation(req.params.id, req.user!.userId);
    res.json({
      success: true,
      data: navigation,
    });
  } catch (error) {
    next(error);
  }
});

// Ders oluştur (Admin/Instructor)
router.post(
  '/module/:moduleId',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validation = lessonSchema.safeParse(req.body);
      if (!validation.success) {
        throw new BadRequestError(validation.error.errors[0].message);
      }

      const lesson = await lessonService.create(req.params.moduleId, req.body);
      res.status(201).json({ success: true, data: lesson });
    } catch (error) {
      next(error);
    }
  }
);

// Ders güncelle
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Partial validation for update
      const validation = lessonSchema.partial().safeParse(req.body);
      if (!validation.success) {
        throw new BadRequestError(validation.error.errors[0].message);
      }

      // Check if title is being updated and trying to set it to empty
      if (req.body.title !== undefined && req.body.title.trim() === '') {
        throw new BadRequestError('Ders başlığı boş olamaz');
      }

      const lesson = await lessonService.update(req.params.id, req.body);
      res.json({ success: true, data: lesson });
    } catch (error) {
      next(error);
    }
  }
);

// Ders sil
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await lessonService.delete(req.params.id);
      res.json({ success: true, message: 'Ders silindi' });
    } catch (error) {
      next(error);
    }
  }
);

// Ders sıralamasını değiştir
router.patch(
  '/module/:moduleId/reorder',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { lessonIds } = req.body;
      await lessonService.reorder(req.params.moduleId, lessonIds);
      res.json({ success: true, message: 'Sıralama güncellendi' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
