import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

/**
 * Genel API rate limiter
 * Tüm endpoint'ler için temel koruma
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // IP başına 100 istek
  message: {
    success: false,
    error: 'Çok fazla istek gönderdiniz. Lütfen 15 dakika sonra tekrar deneyin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth endpoint'leri için sıkı rate limiter
 * Brute-force saldırılarına karşı koruma
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // IP başına 5 giriş denemesi
  message: {
    success: false,
    error: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Başarılı istekleri sayma
});

/**
 * Kayıt endpoint'i için rate limiter
 * Spam hesap oluşturmayı engeller
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 3, // IP başına 3 kayıt
  message: {
    success: false,
    error: 'Çok fazla kayıt denemesi. Lütfen 1 saat sonra tekrar deneyin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Upload endpoint'leri için rate limiter
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 50, // IP başına 50 upload
  message: {
    success: false,
    error: 'Çok fazla dosya yüklediniz. Lütfen 1 saat sonra tekrar deneyin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * XSS temizleme middleware'i
 * Request body, query ve params'daki tehlikeli karakterleri temizler
 * URL ve password alanları hariç tutulur
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Temizlenmemesi gereken alanlar (password, URL'ler vb.)
  const excludeFields = [
    'password',
    'currentPassword',
    'newPassword',
    // URL alanları - slash karakteri bozulmamalı
    'thumbnail',
    'videoUrl',
    'avatar',
    'url',
    'imageUrl',
    'link',
    'href',
    'src',
  ];

  const sanitize = (obj: Record<string, unknown>, parentKey: string = ''): Record<string, unknown> => {
    const sanitized: Record<string, unknown> = {};
    for (const key in obj) {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;

      // Hariç tutulan alanları atla
      if (excludeFields.includes(key)) {
        sanitized[key] = obj[key];
        continue;
      }

      if (typeof obj[key] === 'string') {
        // URL olup olmadığını kontrol et
        const value = obj[key] as string;
        if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
          // URL'leri olduğu gibi bırak
          sanitized[key] = value;
        } else {
          // Temel XSS karakterlerini escape et (slash hariç - URL'leri bozmamak için)
          sanitized[key] = value
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitized[key] = sanitize(obj[key] as Record<string, unknown>, fullKey);
      } else {
        sanitized[key] = obj[key];
      }
    }
    return sanitized;
  };

  // Body'yi sanitize et
  if (req.body && typeof req.body === 'object') {
    req.body = sanitize(req.body);
  }

  // Query params'ı sanitize et
  if (req.query && typeof req.query === 'object') {
    req.query = sanitize(req.query as Record<string, unknown>) as typeof req.query;
  }

  next();
};

/**
 * Güvenlik başlıkları için ek kontroller
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Clickjacking koruması
  res.setHeader('X-Frame-Options', 'DENY');

  // MIME type sniffing koruması
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS koruması (eski tarayıcılar için)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer politikası
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  next();
};

/**
 * Request boyutu kontrolü
 */
export const requestSizeLimit = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    if (contentLength > maxSize) {
      res.status(413).json({
        success: false,
        error: 'İstek boyutu çok büyük',
      });
      return;
    }

    next();
  };
};
