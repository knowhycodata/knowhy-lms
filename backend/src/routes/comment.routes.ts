import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { CommentService } from '../services/comment.service.js';
import { AuthRequest } from '../types/index.js';

const router = Router();
const commentService = new CommentService();

// Ders yorumlarını getir
router.get(
  '/lesson/:lessonId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const comments = await commentService.findByLesson(req.params.lessonId);
      res.json({ success: true, data: comments });
    } catch (error) {
      next(error);
    }
  }
);

// Yorum oluştur
router.post(
  '/lesson/:lessonId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const comment = await commentService.create(
        req.params.lessonId,
        req.user!.userId,
        req.body
      );
      res.status(201).json({ success: true, data: comment });
    } catch (error) {
      next(error);
    }
  }
);

// Yorum güncelle
router.put(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const comment = await commentService.update(
        req.params.id,
        req.user!.userId,
        req.user!.role,
        req.body
      );
      res.json({ success: true, data: comment });
    } catch (error) {
      next(error);
    }
  }
);

// Yorum sil
router.delete(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await commentService.delete(req.params.id, req.user!.userId, req.user!.role);
      res.json({ success: true, message: 'Yorum silindi' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
