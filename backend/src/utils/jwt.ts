import jwt, { SignOptions, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { JwtPayload } from '../types/index.js';

// Refresh token'ları için in-memory store (-)
interface RefreshTokenData {
  userId: string;
  email: string;
  role: string;
  expiresAt: number;
  isRevoked: boolean;
}

const refreshTokens = new Map<string, RefreshTokenData>();

// Süresi dolmuş refresh token'ları temizle - her 30 dakikada bir
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of refreshTokens.entries()) {
    if (data.expiresAt < now || data.isRevoked) {
      refreshTokens.delete(token);
    }
  }
}, 30 * 60 * 1000);

/**
 * Access token oluştur (kısa ömürlü - 15 dakika)
 */
export const generateAccessToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: '15m', // 15 dakika
    issuer: 'knowhy-lms',
    audience: 'knowhy-lms-api',
  };
  return jwt.sign(payload, config.jwt.secret, options);
};

/**
 * Refresh token oluştur (uzun ömürlü - 7 gün)
 */
export const generateRefreshToken = (payload: JwtPayload): string => {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 gün

  refreshTokens.set(token, {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    expiresAt,
    isRevoked: false,
  });

  return token;
};

/**
 * Eski generateToken fonksiyonu - geriye uyumluluk için
 */
export const generateToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    issuer: 'knowhy-lms',
    audience: 'knowhy-lms-api',
  };
  return jwt.sign(payload, config.jwt.secret, options);
};

/**
 * Access token doğrula
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, config.jwt.secret, {
      issuer: 'knowhy-lms',
      audience: 'knowhy-lms-api',
    }) as JwtPayload;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new Error('Token süresi dolmuş');
    }
    if (error instanceof JsonWebTokenError) {
      throw new Error('Geçersiz token');
    }
    throw error;
  }
};

/**
 * Refresh token doğrula ve yeni access token oluştur
 */
export const refreshAccessToken = (refreshToken: string): { accessToken: string; payload: JwtPayload } | null => {
  const data = refreshTokens.get(refreshToken);

  if (!data) {
    return null;
  }

  if (data.isRevoked) {
    refreshTokens.delete(refreshToken);
    return null;
  }

  if (data.expiresAt < Date.now()) {
    refreshTokens.delete(refreshToken);
    return null;
  }

  const payload: JwtPayload = {
    userId: data.userId,
    email: data.email,
    role: data.role as 'ADMIN' | 'INSTRUCTOR' | 'STUDENT',
  };

  const accessToken = generateAccessToken(payload);

  return { accessToken, payload };
};

/**
 * Refresh token'ı iptal et (logout için)
 */
export const revokeRefreshToken = (refreshToken: string): boolean => {
  const data = refreshTokens.get(refreshToken);
  
  if (!data) {
    return false;
  }

  data.isRevoked = true;
  return true;
};

/**
 * Kullanıcının tüm refresh token'larını iptal et
 */
export const revokeAllUserTokens = (userId: string): number => {
  let count = 0;
  
  for (const [token, data] of refreshTokens.entries()) {
    if (data.userId === userId && !data.isRevoked) {
      data.isRevoked = true;
      count++;
    }
  }

  return count;
};
