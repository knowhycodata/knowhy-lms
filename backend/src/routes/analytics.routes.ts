import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { AuthRequest } from '../types/index.js';

const router = Router();
const analyticsService = new AnalyticsService();

// Genel istatistikler (Admin only)
router.get(
  '/overview',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await analyticsService.getOverview();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

// Detaylı rapor (Admin only)
router.get(
  '/report',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const report = await analyticsService.getDetailedReport();
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }
);

// Eğitmen özet istatistikleri (Instructor/Admin)
router.get(
  '/instructor/summary',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await analyticsService.getInstructorSummary(req.user!.userId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

// Kurs istatistikleri (Admin/Instructor)
router.get(
  '/course/:courseId',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await analyticsService.getCourseStats(req.params.courseId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

// Departman istatistikleri (Admin only)
router.get(
  '/departments',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await analyticsService.getDepartmentStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

// Kullanıcı aktivite raporu
router.get(
  '/user/:userId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Sadece kendi raporunu veya admin herkesin raporunu görebilir
      if (req.user?.userId !== req.params.userId && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Yetkisiz işlem' });
      }

      const stats = await analyticsService.getUserActivity(req.params.userId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

// Kendi aktivite raporum
router.get(
  '/me',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await analyticsService.getUserActivity(req.user!.userId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

// Tüm öğrencilerin raporu (Admin only)
router.get(
  '/students',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const students = await analyticsService.getAllStudentsReport();
      res.json({ success: true, data: students });
    } catch (error) {
      next(error);
    }
  }
);

// En çok izlenen videolar (Admin only)
router.get(
  '/most-watched',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const lessons = await analyticsService.getMostWatchedLessons(limit);
      res.json({ success: true, data: lessons });
    } catch (error) {
      next(error);
    }
  }
);

// Aktif kullanıcılar (Admin only)
router.get(
  '/active-users',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const activeUsers = await analyticsService.getActiveUsers();
      res.json({ success: true, data: activeUsers });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
