import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { UserService } from '../services/user.service.js';
import { AuthRequest } from '../types/index.js';

const router = Router();
const userService = new UserService();

// Tum kullanicilari getir (Admin ve Instructor)
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page, limit, role, department, search, status } = req.query as {
        page?: string;
        limit?: string;
        role?: string;
        department?: string;
        search?: string;
        status?: string;
      };

      const result = await userService.findAll({
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        role: role as 'ADMIN' | 'INSTRUCTOR' | 'STUDENT' | undefined,
        department: department,
        search: search,
        status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined,
      });

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

// Kullanıcı detayı
router.get(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await userService.findById(req.params.id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
);

// Kullanıcı güncelle
router.put(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Sadece kendi profilini veya admin herkesin profilini güncelleyebilir
      if (req.user?.userId !== req.params.id && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Yetkisiz işlem' });
      }

      const user = await userService.update(req.params.id, req.body);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
);

// Kullanıcı sil (Admin only)
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await userService.delete(req.params.id);
      res.json({ success: true, message: 'Kullanıcı silindi' });
    } catch (error) {
      next(error);
    }
  }
);

// Rol değiştir (Admin only)
router.patch(
  '/:id/role',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { role } = req.body;
      const user = await userService.changeRole(req.params.id, role);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
);

// Kullanıcı onay durumu değiştir (Admin only)
router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body as { status: 'PENDING' | 'APPROVED' | 'REJECTED' };

      if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Geçersiz durum değeri' });
      }

      const user = await userService.changeStatus(req.params.id, status);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
);

// Kullanıcı kendi şifresini değiştir (mevcut şifre doğrulaması ile)
router.patch(
  '/:id/password',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, password } = req.body as { currentPassword?: string; password: string };
      const targetUserId = req.params.id;
      const isAdmin = req.user?.role === 'ADMIN';
      const isOwnAccount = req.user?.userId === targetUserId;

      // Yetki kontrolü: Admin herkesin şifresini değiştirebilir, kullanıcı sadece kendisininki
      if (!isAdmin && !isOwnAccount) {
        return res.status(403).json({ success: false, error: 'Yetkisiz işlem' });
      }

      // Kendi şifresini değiştiriyorsa mevcut şifre gerekli
      if (isOwnAccount && !isAdmin) {
        if (!currentPassword) {
          return res.status(400).json({ success: false, error: 'Mevcut şifre gerekli' });
        }

        // Mevcut şifreyi doğrula
        const isValid = await userService.verifyPassword(targetUserId, currentPassword);
        if (!isValid) {
          return res.status(400).json({ success: false, error: 'Mevcut şifre yanlış' });
        }
      }

      if (!password || password.length < 8) {
        return res.status(400).json({ success: false, error: 'Şifre en az 8 karakter olmalıdır' });
      }

      const user = await userService.update(targetUserId, { password });
      res.json({ success: true, data: user, message: 'Şifre başarıyla güncellendi' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
