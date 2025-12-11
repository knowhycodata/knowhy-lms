import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { uploadPath, config } from '../config/index.js';
import { NotFoundError, BadRequestError, UnauthorizedError, ForbiddenError } from '../utils/errors.js';

// Video token'ları için in-memory cache (production'da Redis kullanılmalı)
interface VideoToken {
  lessonId: string;
  userId: string;
  expiresAt: number;
}

const videoTokens = new Map<string, VideoToken>();

// Token temizleme - her 5 dakikada bir süresi dolmuş token'ları temizle
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of videoTokens.entries()) {
    if (data.expiresAt < now) {
      videoTokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

/**
 * Video izleme için geçici token oluştur
 * Token 1 saat geçerli
 */
export const generateVideoToken = async (lessonId: string, userId: string): Promise<string> => {
  // Ders var mı kontrol et
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!lesson) {
    throw new NotFoundError('Ders bulunamadı');
  }

  // Kullanıcı kursa kayıtlı mı kontrol et
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: lesson.module.course.id,
      },
    },
  });

  // Kullanıcı bilgilerini al
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  // Admin ve Instructor her zaman izleyebilir, öğrenci kayıtlı olmalı
  if (!enrollment && user?.role === 'STUDENT') {
    throw new ForbiddenError('Bu dersi izlemek için kursa kayıtlı olmalısınız');
  }

  // Token oluştur
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 saat

  videoTokens.set(token, {
    lessonId,
    userId,
    expiresAt,
  });

  return token;
};

/**
 * Token'ı doğrula
 */
const verifyVideoToken = (token: string, lessonId: string): VideoToken | null => {
  const data = videoTokens.get(token);
  
  if (!data) {
    return null;
  }

  if (data.expiresAt < Date.now()) {
    videoTokens.delete(token);
    return null;
  }

  if (data.lessonId !== lessonId) {
    return null;
  }

  return data;
};

/**
 * Video Streaming Controller
 * Range header'larını işleyerek videoyu parça parça gönderir
 * Bu sayede büyük videolar için bant genişliği optimize edilir
 */
export const streamVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lessonId } = req.params;

    // Dersi bul
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundError('Ders bulunamadı');
    }

    // Sadece lokal videolar için streaming
    if (lesson.videoType !== 'VIDEO_LOCAL') {
      throw new BadRequestError('Bu ders için video streaming desteklenmiyor');
    }

    // lesson.videoUrl /uploads/videos/video-xxx.mp4 formatinda olabilir
    // veya sadece video-xxx.mp4 formatinda olabilir
    let videoPath: string;
    if (lesson.videoUrl.startsWith('/uploads/videos/')) {
      // /uploads/videos/video-xxx.mp4 -> video-xxx.mp4
      const filename = lesson.videoUrl.replace('/uploads/videos/', '');
      videoPath = path.join(uploadPath, 'videos', filename);
    } else {
      // Direkt filename
      videoPath = path.join(uploadPath, 'videos', lesson.videoUrl);
    }

    // Dosya var mı kontrol et
    if (!fs.existsSync(videoPath)) {
      throw new NotFoundError('Video dosyası bulunamadı');
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Video MIME type belirleme
    const ext = path.extname(videoPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
    };
    const contentType = mimeTypes[ext] || 'video/mp4';

    if (range) {
      // Range header varsa, parça parça gönder
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Geçerli range kontrolü
      if (start >= fileSize || end >= fileSize) {
        res.status(416).json({
          success: false,
          error: 'Requested range not satisfiable',
        });
        return;
      }

      const chunkSize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      });

      file.pipe(res);
    } else {
      // Range header yoksa, tüm dosyayı gönder
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      });

      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Video thumbnail/preview endpoint
 */
export const getVideoThumbnail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lessonId } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundError('Ders bulunamadı');
    }

    if (!lesson.thumbnailUrl) {
      // Default thumbnail gönder
      res.status(204).send();
      return;
    }

    const thumbnailPath = path.join(uploadPath, 'thumbnails', lesson.thumbnailUrl);

    if (!fs.existsSync(thumbnailPath)) {
      res.status(204).send();
      return;
    }

    res.sendFile(thumbnailPath);
  } catch (error) {
    next(error);
  }
};

/**
 * Token ile güvenli video streaming
 * Query param olarak token alır ve doğrular
 */
export const streamVideoWithToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lessonId } = req.params;
    const { token } = req.query;

    // Token kontrolü
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedError('Video izleme token\'ı gerekli');
    }

    // Token doğrula
    const tokenData = verifyVideoToken(token, lessonId);
    if (!tokenData) {
      throw new UnauthorizedError('Geçersiz veya süresi dolmuş token');
    }

    // Dersi bul
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundError('Ders bulunamadı');
    }

    // Sadece lokal videolar için streaming
    if (lesson.videoType !== 'VIDEO_LOCAL') {
      throw new BadRequestError('Bu ders için video streaming desteklenmiyor');
    }

    // Video path'ini belirle
    let videoPath: string;
    if (lesson.videoUrl.startsWith('/uploads/videos/')) {
      const filename = lesson.videoUrl.replace('/uploads/videos/', '');
      videoPath = path.join(uploadPath, 'videos', filename);
    } else {
      videoPath = path.join(uploadPath, 'videos', lesson.videoUrl);
    }

    // Path traversal saldırısı kontrolü
    const resolvedPath = path.resolve(videoPath);
    const videosDir = path.resolve(uploadPath, 'videos');
    if (!resolvedPath.startsWith(videosDir)) {
      throw new ForbiddenError('Geçersiz dosya yolu');
    }

    // Dosya var mı kontrol et
    if (!fs.existsSync(videoPath)) {
      throw new NotFoundError('Video dosyası bulunamadı');
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Video MIME type belirleme
    const ext = path.extname(videoPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
    };
    const contentType = mimeTypes[ext] || 'video/mp4';

    if (range) {
      // Range header varsa, parça parça gönder
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Geçerli range kontrolü
      if (start >= fileSize || end >= fileSize || start < 0 || end < 0 || start > end) {
        res.status(416).json({
          success: false,
          error: 'Requested range not satisfiable',
        });
        return;
      }

      const chunkSize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });

      file.pipe(res);
    } else {
      // Range header yoksa, tüm dosyayı gönder
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });

      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
};
