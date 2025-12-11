import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';
import { uploadPath } from '../config/index.js';
import { uploadLimiter } from '../middlewares/security.middleware.js';

const router = Router();

// ==================== GÜVENLİK YARDIMCI FONKSİYONLARI ====================

/**
 * Dosya adını güvenli hale getir
 * Path traversal ve özel karakter saldırılarını engeller
 */
const sanitizeFilename = (filename: string): string => {
  // Sadece alfanumerik, tire, alt çizgi ve nokta karakterlerine izin ver
  const sanitized = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.') // Birden fazla noktayı tek noktaya indir
    .replace(/^\.+/, '') // Başındaki noktaları kaldır
    .substring(0, 100); // Maksimum 100 karakter

  return sanitized || 'unnamed';
};

/**
 * Güvenli benzersiz dosya adı oluştur
 */
const generateSecureFilename = (prefix: string, originalExt: string): string => {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  const safeExt = sanitizeFilename(originalExt).toLowerCase();
  return `${prefix}-${timestamp}-${randomBytes}${safeExt}`;
};

/**
 * Magic byte doğrulaması - dosya içeriğinin gerçekten belirtilen türde olduğunu kontrol et
 */
const MAGIC_BYTES: Record<string, Buffer[]> = {
  // Video formatları
  'video/mp4': [
    Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]), // ftyp
    Buffer.from([0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70]),
    Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
  ],
  'video/webm': [Buffer.from([0x1A, 0x45, 0xDF, 0xA3])],
  'video/ogg': [Buffer.from([0x4F, 0x67, 0x67, 0x53])],
  'video/quicktime': [
    Buffer.from([0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70]),
  ],
  'video/x-msvideo': [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF
  // Resim formatları
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
  'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
  'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF...WEBP
  // Doküman formatları
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
};

const verifyMagicBytes = async (filePath: string, mimeType: string): Promise<boolean> => {
  const expectedMagicBytes = MAGIC_BYTES[mimeType];

  if (!expectedMagicBytes) {
    // Bilinmeyen MIME type için magic byte kontrolü yapma
    return true;
  }

  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(12);
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    return expectedMagicBytes.some(magic => {
      return buffer.slice(0, magic.length).equals(magic);
    });
  } catch {
    return false;
  }
};

// ==================== UPLOAD KLASÖR YAPISI ====================

// Video upload klasoru
const videosDir = path.join(uploadPath, 'videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

// ==================== MULTER KONFIGÜRASYONU ====================

// Multer konfigurasyonu - videolar icin
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videosDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const secureFilename = generateSecureFilename('video', ext);
    cb(null, secureFilename);
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB max (3-4GB videolar için)
    files: 1, // Tek dosya
    fieldSize: 5 * 1024 * 1024 * 1024, // Field size limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];

    // MIME type kontrolü
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Sadece video dosyalari yuklenebilir (mp4, webm, ogg, mov, avi)'));
      return;
    }

    // Uzantı kontrolü
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    if (!allowedExts.includes(ext)) {
      cb(new Error('Geçersiz dosya uzantısı'));
      return;
    }

    cb(null, true);
  },
});

// Video yukle - Rate limited ve magic byte doğrulamalı
router.post(
  '/video',
  uploadLimiter,
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  videoUpload.single('video'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Video dosyasi yuklenmedi' });
      }

      const filePath = req.file.path;

      // Magic byte doğrulaması
      const isValidFile = await verifyMagicBytes(filePath, req.file.mimetype);
      if (!isValidFile) {
        // Geçersiz dosyayı sil
        fs.unlinkSync(filePath);
        return res.status(400).json({
          success: false,
          error: 'Dosya içeriği belirtilen türle eşleşmiyor. Güvenlik nedeniyle reddedildi.'
        });
      }

      const videoUrl = `/uploads/videos/${req.file.filename}`;

      res.json({
        success: true,
        data: {
          filename: req.file.filename,
          originalName: sanitizeFilename(req.file.originalname),
          size: req.file.size,
          mimeType: req.file.mimetype,
          url: videoUrl,
        },
      });
    } catch (error) {
      // Hata durumunda yüklenen dosyayı temizle
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }
);

// Thumbnail yukle
const thumbnailsDir = path.join(uploadPath, 'thumbnails');
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
}

const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, thumbnailsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const secureFilename = generateSecureFilename('thumb', ext);
    cb(null, secureFilename);
  },
});

const thumbnailUpload = multer({
  storage: thumbnailStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Sadece resim dosyalari yuklenebilir (jpg, png, gif, webp)'));
      return;
    }

    // Uzantı kontrolü
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowedExts.includes(ext)) {
      cb(new Error('Geçersiz dosya uzantısı'));
      return;
    }

    cb(null, true);
  },
});

// Thumbnail yukle - Rate limited ve magic byte doğrulamalı
router.post(
  '/thumbnail',
  uploadLimiter,
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  thumbnailUpload.single('thumbnail'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Resim dosyasi yuklenmedi' });
      }

      const filePath = req.file.path;

      // Magic byte doğrulaması
      const isValidFile = await verifyMagicBytes(filePath, req.file.mimetype);
      if (!isValidFile) {
        // Geçersiz dosyayı sil
        fs.unlinkSync(filePath);
        return res.status(400).json({
          success: false,
          error: 'Dosya içeriği belirtilen türle eşleşmiyor. Güvenlik nedeniyle reddedildi.'
        });
      }

      const imageUrl = `/uploads/thumbnails/${req.file.filename}`;

      res.json({
        success: true,
        data: {
          filename: req.file.filename,
          originalName: sanitizeFilename(req.file.originalname),
          url: imageUrl,
        },
      });
    } catch (error) {
      // Hata durumunda yüklenen dosyayı temizle
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }
);

// Yuklenen dosyalari listele
router.get(
  '/videos',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const files = fs.readdirSync(videosDir);
      const videos = files.map(filename => ({
        filename,
        url: `/uploads/videos/${filename}`,
      }));
      res.json({ success: true, data: videos });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
