import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';
import { z } from 'zod';
import { BadRequestError } from '../utils/errors.js';
import { authLimiter, registerLimiter } from '../middlewares/security.middleware.js';

const router = Router();

// Güçlü şifre politikası regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Validation schemas
const registerSchema = z.object({
  email: z.string()
    .email('Geçerli bir email adresi giriniz')
    .max(255, 'Email adresi çok uzun'),
  password: z.string()
    .min(8, 'Şifre en az 8 karakter olmalı')
    .max(128, 'Şifre çok uzun')
    .regex(passwordRegex, 'Şifre en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir'),
  name: z.string()
    .min(2, 'İsim en az 2 karakter olmalı')
    .max(100, 'İsim çok uzun')
    .regex(/^[a-zA-ZğüşöçıİĞÜŞÖÇ\s]+$/, 'İsim sadece harf içerebilir'),
  department: z.string().max(100).optional(),
  // Admin paneli üzerinden kullanıcı oluştururken kullanılabilir
  role: z.enum(['ADMIN', 'INSTRUCTOR', 'STUDENT']).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

const loginSchema = z.object({
  email: z.string()
    .email('Geçerli bir email adresi giriniz')
    .max(255),
  password: z.string()
    .min(1, 'Şifre gerekli')
    .max(128),
});

// POST /api/auth/register - Rate limited
router.post('/register', registerLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      throw new BadRequestError(validation.error.errors[0].message);
    }

    const result = await authService.register(validation.data);
    res.status(201).json({
      success: true,
      data: result,
      message: 'Kayıt işleminiz alındı. Hesabınız yönetici onayından sonra aktif olacaktır.',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login - Rate limited (brute-force koruması)
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      throw new BadRequestError(validation.error.errors[0].message);
    }

    const result = await authService.login(validation.data);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new BadRequestError('Kullanıcı bilgisi bulunamadı');
    }

    const user = await authService.getProfile(req.user.userId);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh - Refresh token ile yeni access token al
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new BadRequestError('Refresh token gerekli');
    }

    const result = await authService.refreshToken(refreshToken);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout - Çıkış yap (refresh token'ı iptal et)
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.json({
      success: true,
      message: 'Başarıyla çıkış yapıldı',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout-all - Tüm oturumlardan çıkış yap
router.post('/logout-all', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new BadRequestError('Kullanıcı bilgisi bulunamadı');
    }

    const result = await authService.logoutAll(req.user.userId);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
