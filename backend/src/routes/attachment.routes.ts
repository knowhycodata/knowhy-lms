import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { AttachmentService } from '../services/attachment.service.js';
import { AuthRequest } from '../types/index.js';
import { config, uploadPath } from '../config/index.js';

const router = Router();
const attachmentService = new AttachmentService();

// Upload klasörünü oluştur
const attachmentsDir = path.join(uploadPath, 'attachments');
if (!fs.existsSync(attachmentsDir)) {
  fs.mkdirSync(attachmentsDir, { recursive: true });
}

// Multer konfigürasyonu
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, attachmentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    // İzin verilen dosya tipleri
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Desteklenmeyen dosya tipi'));
    }
  },
});

// Ders eklerini getir
router.get(
  '/lesson/:lessonId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const attachments = await attachmentService.findByLesson(req.params.lessonId);
      res.json({ success: true, data: attachments });
    } catch (error) {
      next(error);
    }
  }
);

// Dosya yükle
router.post(
  '/lesson/:lessonId',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  upload.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Dosya yüklenmedi' });
      }

      const attachment = await attachmentService.create(req.params.lessonId, req.file);
      res.status(201).json({ success: true, data: attachment });
    } catch (error) {
      next(error);
    }
  }
);

// Dosya indir
router.get(
  '/:id/download',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const attachment = await attachmentService.findById(req.params.id);
      const filePath = attachmentService.getFilePath(attachment.filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'Dosya bulunamadı' });
      }

      res.download(filePath, attachment.originalName);
    } catch (error) {
      next(error);
    }
  }
);

// Dosya sil
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await attachmentService.delete(req.params.id);
      res.json({ success: true, message: 'Dosya silindi' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
