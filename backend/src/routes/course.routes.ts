import { Router, Response, NextFunction } from 'express';
import { courseService } from '../services/course.service.js';
import { bulkCourseService } from '../services/bulk.course.service.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';
import { z } from 'zod';
import { BadRequestError } from '../utils/errors.js';

const router = Router();

// Validation schemas
const createCourseSchema = z.object({
  title: z.string().min(3, 'Başlık en az 3 karakter olmalı'),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
});

const updateCourseSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
  isPublished: z.boolean().optional(),
});

// Bulk course validation schema
const lessonSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Ders başlığı gerekli'),
  description: z.string().optional(),
  videoType: z.enum(['VIDEO_LOCAL', 'VIDEO_YOUTUBE']),
  videoUrl: z.string().min(1, 'Video URL gerekli'),
  duration: z.number().optional(),
  thumbnailUrl: z.string().optional(),
  order: z.number().optional(),
});

const moduleSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Modül başlığı gerekli'),
  description: z.string().optional(),
  order: z.number().optional(),
  lessons: z.array(lessonSchema),
});

const bulkCourseSchema = z.object({
  title: z.string().min(3, 'Başlık en az 3 karakter olmalı'),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
  isPublished: z.boolean().optional(),
  modules: z.array(moduleSchema),
});

// ==================== STATİK ROUTE'LAR (ÖNCELİKLİ) ====================

// GET /api/courses
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const isPublished = req.query.isPublished === 'true' ? true : req.query.isPublished === 'false' ? false : undefined;
    const instructorId = req.query.instructorId as string | undefined;

    const result = await courseService.findAll(
      page,
      limit,
      { isPublished, instructorId },
      req.user?.userId,
      req.user?.role
    );
    res.json({
      success: true,
      data: result.courses,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/courses
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validation = createCourseSchema.safeParse(req.body);
      if (!validation.success) {
        throw new BadRequestError(validation.error.errors[0].message);
      }

      const course = await courseService.create({
        ...validation.data,
        instructorId: req.user!.userId,
      });

      res.status(201).json({
        success: true,
        data: course,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/courses/bulk - Kurs + Modüller + Dersler tek seferde (Transaction)
router.post(
  '/bulk',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validation = bulkCourseSchema.safeParse(req.body);
      if (!validation.success) {
        const errorMessages = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new BadRequestError(errorMessages);
      }

      const course = await bulkCourseService.createCourseWithContent(
        req.user!.userId,
        validation.data
      );

      res.status(201).json({
        success: true,
        data: course,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/courses/bulk/:id - Kurs + Modüller + Dersler güncelleme (Transaction)
router.put(
  '/bulk/:id',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validation = bulkCourseSchema.safeParse(req.body);
      if (!validation.success) {
        const errorMessages = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new BadRequestError(errorMessages);
      }

      const course = await bulkCourseService.updateCourseWithContent(
        req.params.id,
        req.user!.userId,
        req.user!.role,
        validation.data
      );

      res.json({
        success: true,
        data: course,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/courses/enrolled/me - Kullanıcının kayıtlı kursları (STATİK - /:id'den ÖNCE olmalı!)
router.get('/enrolled/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const enrollments = await courseService.getEnrolledCourses(req.user!.userId);
    res.json({
      success: true,
      data: enrollments,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/courses/enrollments/:enrollmentId - Kaydı sil (STATİK path prefix - /:id'den ÖNCE olmalı!)
router.delete(
  '/enrollments/:enrollmentId',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await courseService.removeEnrollment(req.params.enrollmentId);
      res.json({
        success: true,
        message: 'Kayit silindi',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== PARAMETRİK ROUTE'LAR ====================

// GET /api/courses/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const course = await courseService.findById(
      req.params.id,
      req.user?.userId,
      req.user?.role
    );
    res.json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/courses/:id
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validation = updateCourseSchema.safeParse(req.body);
      if (!validation.success) {
        throw new BadRequestError(validation.error.errors[0].message);
      }

      const course = await courseService.update(
        req.params.id,
        validation.data,
        req.user!.userId,
        req.user!.role
      );

      res.json({
        success: true,
        data: course,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/courses/:id
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await courseService.delete(req.params.id, req.user!.userId, req.user!.role);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/courses/:id/enrollments - Kurs kayıtlarını getir
router.get(
  '/:id/enrollments',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const enrollments = await courseService.getEnrollments(req.params.id);
      res.json({
        success: true,
        data: enrollments,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/courses/:id/enroll - Kursa kayıt ol (öğrenci için) veya öğrenci ekle (instructor için)
router.post('/:id/enroll', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Eğer userId body'de varsa instructor/admin öğrenci ekliyor demektir
    const isInstructorAdding = !!req.body.userId && (req.user!.role === 'INSTRUCTOR' || req.user!.role === 'ADMIN');
    const userId = req.body.userId || req.user!.userId;
    const enrollment = await courseService.enroll(req.params.id, userId, isInstructorAdding);
    res.status(201).json({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
