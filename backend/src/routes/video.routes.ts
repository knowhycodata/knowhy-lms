import { Router, Request, Response, NextFunction } from 'express';
import { streamVideo, getVideoThumbnail, streamVideoWithToken } from '../controllers/video.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

/**
 * Video Streaming Güvenlik Stratejisi:
 * 
 * 1. Token-based streaming: Video URL'ine kısa ömürlü token eklenir
 * 2. Enrollment kontrolü: Sadece kursa kayıtlı kullanıcılar izleyebilir
 * 3. Rate limiting: Aşırı istek engellenir
 */

// GET /api/videos/:lessonId/stream - Token ile güvenli video streaming
// Token query param olarak gönderilir: ?token=xxx
router.get('/:lessonId/stream', streamVideoWithToken);

// GET /api/videos/:lessonId/thumbnail - Thumbnail'ler için authentication
router.get('/:lessonId/thumbnail', authenticate, getVideoThumbnail);

// POST /api/videos/:lessonId/token - Video izleme için geçici token al
router.post(
  '/:lessonId/token',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { generateVideoToken } = await import('../controllers/video.controller.js');
      const token = await generateVideoToken(req.params.lessonId, req.user!.userId);
      res.json({
        success: true,
        data: { token, expiresIn: 3600 }, // 1 saat
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;  
