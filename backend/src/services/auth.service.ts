import { prisma } from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { 
  generateToken, 
  generateAccessToken, 
  generateRefreshToken, 
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens 
} from '../utils/jwt.js';
import { UnauthorizedError, ConflictError, NotFoundError } from '../utils/errors.js';

// Role enum - Prisma generate sonrası @prisma/client'tan import edilebilir
type Role = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: Role;
  department?: string;
  status?: UserStatus;
}

interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('Bu email adresi zaten kullanılıyor');
    }

    const hashedPassword = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
        role: input.role || 'STUDENT',
        department: input.department,
        // Eğer admin panelinden özel bir status geldiyse onu kullan, aksi halde PENDING kalsın
        status: (input.status ?? 'PENDING') as any,
      } as any,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        createdAt: true,
      },
    });

    // Kayıt sonrası otomatik giriş yok; admin onayı beklenecek
    return { user };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedError('Email veya şifre hatalı');
    }

    const userRecord: any = user;

    if (!userRecord.isActive) {
      throw new UnauthorizedError('Hesabınız devre dışı bırakılmış');
    }

    // Status kontrolü - sadece APPROVED kullanıcılar giriş yapabilir
    // Eğer status alanı yoksa veya null ise PENDING gibi davran
    const userStatus = userRecord.status || 'PENDING';

    if (userStatus === 'PENDING') {
      throw new UnauthorizedError('Hesabınız onay bekliyor. Yönetici onayladıktan sonra giriş yapabilirsiniz.');
    }

    if (userStatus === 'REJECTED') {
      throw new UnauthorizedError('Kaydınız yönetici tarafından reddedilmiştir. Detay için sistem yöneticisiyle iletişime geçin.');
    }

    // Ekstra güvenlik: Sadece APPROVED olanlar geçebilir
    if (userStatus !== 'APPROVED') {
      throw new UnauthorizedError('Hesabınız henüz onaylanmamış.');
    }

    const isPasswordValid = await comparePassword(input.password, userRecord.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Email veya şifre hatalı');
    }

    const payload = {
      userId: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
    };

    // Access token (kısa ömürlü) ve refresh token (uzun ömürlü) oluştur
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: userRecord.role,
        department: userRecord.department,
        avatar: userRecord.avatar,
        status: userRecord.status,
      },
      accessToken,
      refreshToken,
      // Geriye uyumluluk için eski token alanı
      token: accessToken,
    };
  }

  /**
   * Refresh token ile yeni access token al
   */
  async refreshToken(refreshToken: string) {
    const result = refreshAccessToken(refreshToken);

    if (!result) {
      throw new UnauthorizedError('Geçersiz veya süresi dolmuş refresh token');
    }

    // Kullanıcının hala aktif olduğunu kontrol et
    const user = await prisma.user.findUnique({
      where: { id: result.payload.userId },
    });

    if (!user) {
      throw new UnauthorizedError('Kullanıcı bulunamadı');
    }

    const userRecord: any = user;

    if (!userRecord.isActive) {
      throw new UnauthorizedError('Hesabınız devre dışı bırakılmış');
    }

    if (userRecord.status !== 'APPROVED') {
      throw new UnauthorizedError('Hesabınız onaylı değil');
    }

    return {
      accessToken: result.accessToken,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: userRecord.role,
      },
    };
  }

  /**
   * Logout - refresh token'ı iptal et
   */
  async logout(refreshToken: string) {
    revokeRefreshToken(refreshToken);
    return { message: 'Başarıyla çıkış yapıldı' };
  }

  /**
   * Tüm oturumlardan çıkış - kullanıcının tüm refresh token'larını iptal et
   */
  async logoutAll(userId: string) {
    const count = revokeAllUserTokens(userId);
    return { message: `${count} oturum sonlandırıldı` };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Kullanıcı bulunamadı');
    }

    return user;
  }
}

export const authService = new AuthService();
