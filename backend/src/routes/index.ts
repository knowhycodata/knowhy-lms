import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import courseRoutes from './course.routes.js';
import moduleRoutes from './module.routes.js';
import lessonRoutes from './lesson.routes.js';
import progressRoutes from './progress.routes.js';
import videoRoutes from './video.routes.js';
import commentRoutes from './comment.routes.js';
import attachmentRoutes from './attachment.routes.js';
import analyticsRoutes from './analytics.routes.js';
import uploadRoutes from './upload.routes.js';
import adminRoutes from './admin.routes.js';
import publicRoutes from './public.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);
router.use('/users', userRoutes);
router.use('/courses', courseRoutes);
router.use('/modules', moduleRoutes);
router.use('/lessons', lessonRoutes);
router.use('/progress', progressRoutes);
router.use('/videos', videoRoutes);
router.use('/comments', commentRoutes);
router.use('/attachments', attachmentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);
router.use('/public', publicRoutes);

export default router;
