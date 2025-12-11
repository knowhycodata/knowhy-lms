import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import path from 'path';
import { config, uploadPath } from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import {
  generalLimiter,
  sanitizeInput,
  securityHeaders,
  requestSizeLimit
} from './middlewares/security.middleware.js';

const app = express();

// Trust proxy (reverse proxy arkasında çalışıyorsa)
app.set('trust proxy', 1);

// ==================== GÜVENLİK MIDDLEWARE'LERİ ====================

// Helmet - HTTP güvenlik başlıkları
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      mediaSrc: ["'self'", 'blob:', 'https://www.youtube.com', 'https://youtube.com'],
      frameSrc: ["'self'", 'https://www.youtube.com', 'https://youtube.com'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Video streaming için gerekli
}));

// Ek güvenlik başlıkları
app.use(securityHeaders);

// HPP - HTTP Parameter Pollution koruması
app.use(hpp());

// Rate limiting - Genel API koruması (upload hariç)
app.use('/api', (req, res, next) => {
  // Upload, Video Stream ve Progress endpoint'leri için rate limit atla
  // Video streaming çok fazla range request yapar, progress ise sık update edilir
  if (
    req.path.startsWith('/upload') ||
    req.path.match(/\/videos\/.*\/stream/) ||
    req.path.startsWith('/progress')
  ) {
    return next();
  }
  return generalLimiter(req, res, next);
});

// CORS yapılandırması - Güvenli
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Origin yoksa (same-origin istekleri) veya izin verilen listede ise kabul et
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS politikası tarafından engellendi'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  maxAge: 86400, // 24 saat preflight cache
}));

// Request boyutu limiti - Upload endpoint'leri hariç
app.use((req, res, next) => {
  // Upload endpoint'leri için büyük boyut limiti (5GB)
  if (req.path.startsWith('/api/upload')) {
    return requestSizeLimit(5 * 1024 * 1024 * 1024)(req, res, next);
  }
  // Diğer endpoint'ler için 10MB
  return requestSizeLimit(10 * 1024 * 1024)(req, res, next);
});

// Body parsers - Upload için büyük limit
app.use('/api/upload', express.json({ limit: '5gb' }));
app.use('/api/upload', express.urlencoded({ extended: true, limit: '5gb' }));

// Diğer endpoint'ler için standart limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// XSS/Input sanitization
app.use(sanitizeInput);

// Static files - yuklenen videolar ve resimler icin
// Cross-Origin-Resource-Policy header'ı ekliyoruz ki farklı origin'lerden erişilebilsin
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(uploadPath));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Knowhy LMS Backend running on http://localhost:${PORT}`);
  console.log(`📚 Environment: ${config.nodeEnv}`);
});

export default app;
