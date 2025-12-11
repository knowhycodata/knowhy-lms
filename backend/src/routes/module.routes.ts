import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { ModuleService } from '../services/module.service.js';
import { AuthRequest } from '../types/index.js';

const router = Router();
const moduleService = new ModuleService();

// Kurs modüllerini getir
router.get(
  '/course/:courseId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const modules = await moduleService.findByCourse(req.params.courseId);
      res.json({ success: true, data: modules });
    } catch (error) {
      next(error);
    }
  }
);

// Modül detayı
router.get(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const module = await moduleService.findById(req.params.id);
      res.json({ success: true, data: module });
    } catch (error) {
      next(error);
    }
  }
);

// Modül oluştur (Admin/Instructor)
router.post(
  '/course/:courseId',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const module = await moduleService.create(req.params.courseId, req.body);
      res.status(201).json({ success: true, data: module });
    } catch (error) {
      next(error);
    }
  }
);

// Modül güncelle
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const module = await moduleService.update(req.params.id, req.body);
      res.json({ success: true, data: module });
    } catch (error) {
      next(error);
    }
  }
);

// Modül sil
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await moduleService.delete(req.params.id);
      res.json({ success: true, message: 'Modül silindi' });
    } catch (error) {
      next(error);
    }
  }
);

// Modül sıralamasını değiştir
router.patch(
  '/course/:courseId/reorder',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { moduleIds } = req.body;
      await moduleService.reorder(req.params.courseId, moduleIds);
      res.json({ success: true, message: 'Sıralama güncellendi' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
