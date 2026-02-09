<div align="center">

# Knowhy LMS

### Modern, Hafif ve Kapsamlı Öğrenme Yönetim Sistemi

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)

[Özellikler](#-özellikler) • [Kurulum](#-kurulum) • [Ekran Görüntüleri](#-ekran-görüntüleri) • [Mimari](#-mimari) • [API](#-api-referansı) • [Katkıda Bulunun](#-katkıda-bulunun)

</div>

---

## Hakkında

**Knowhy LMS**, şirket içi eğitim ihtiyaçlarını karşılamak için tasarlanmış, modern ve hafif bir Öğrenme Yönetim Sistemidir. Hibrit video sistemi sayesinde hem yerel sunucuda barındırılan hassas eğitim videolarını hem de YouTube üzerindeki içerikleri tek bir platformda yönetebilirsiniz.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   📚 Kurslar    →    📦 Modüller    →    🎬 Dersler             │
│                                                                  │
│   ┌─────────┐       ┌─────────┐       ┌─────────────────────┐   │
│   │ React   │  ←→   │ Node.js │  ←→   │    PostgreSQL       │   │
│   │ Vite    │       │ Express │       │    + Prisma ORM     │   │
│   └─────────┘       └─────────┘       └─────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Özellikler

### Kurs Yönetimi
- **Hiyerarşik Yapı**: Kurslar → Modüller → Dersler şeklinde organize içerik
- **Sürükle-Bırak Sıralama**: Modül ve ders sıralamasını kolayca değiştirin
- **Taslak/Yayın Modu**: Kursları hazır olana kadar taslak olarak tutun
- **Thumbnail Desteği**: Kurs ve ders kapak görselleri

### Hibrit Video Sistemi
```
┌────────────────────────────────────────────────────────────┐
│                    VIDEO TİPLERİ                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  📁 LOKAL VİDEO                  🎬 YOUTUBE EMBED          │
│  ─────────────                   ─────────────────         │
│  • Sunucuda barındırılır         • YouTube ID ile embed    │
│  • Range streaming               • YouTube Player API      │
│  • Hassas içerikler için         • Bant genişliği tasarrufu│
│  • Tam kontrol                   • Otomatik kalite ayarı   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### İlerleme Takibi
- **Otomatik Kayıt**: Her 15 saniyede bir izleme pozisyonu kaydedilir
- **Kaldığı Yerden Devam**: Video kaldığı yerden otomatik başlar
- **Tamamlama Durumu**: Ders ve kurs bazında tamamlama yüzdeleri
- **Toplam İzleme Süresi**: Kullanıcı bazında toplam çalışma süresi

### Kullanıcı Yönetimi
| Rol | Yetkiler |
|-----|----------|
| **Admin** | Tüm sistem yönetimi, kullanıcı onayı, raporlar |
| **Eğitmen** | Kurs oluşturma, düzenleme, öğrenci takibi |
| **Öğrenci** | Kurslara kayıt, video izleme, yorum yapma |

### Etkileşim
- **Zaman Damgalı Yorumlar**: Videonun belirli anlarına yorum yapın
- **Yanıt Sistemi**: Yorumlara yanıt verin, tartışmalar başlatın
- **Dosya Ekleri**: Derslere PDF, DOCX gibi dokümanlar ekleyin

### Analitik & Raporlar
- **Departman Bazlı Raporlar**: Hangi departman ne kadar eğitim aldı?
- **Kurs Tamamlama Oranları**: Kurs bazında başarı metrikleri
- **Kullanıcı İstatistikleri**: Bireysel ilerleme takibi
- **Excel Export**: Raporları dışa aktarın

### Güvenlik
- **JWT Tabanlı Auth**: Access + Refresh token sistemi
- **Rol Bazlı Erişim (RBAC)**: Endpoint bazında yetkilendirme
- **Şifre Hashleme**: bcrypt ile güvenli şifre saklama
- **Kullanıcı Onay Sistemi**: Admin onayı ile kayıt

---

## 🛠 Teknoloji Yığını

<table>
<tr>
<td>

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Dil**: TypeScript
- **ORM**: Prisma
- **Veritabanı**: PostgreSQL

</td>
<td>

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Kit**: shadcn/ui
- **Icons**: Lucide React

</td>
<td>

### Altyapı
- **Container**: Docker
- **Orchestration**: Docker Compose
- **Proxy**: Nginx
- **Storage**: Local Volume

</td>
</tr>
</table>

---

## 📸 Ekran Görüntüleri

Aşağıdaki ekran görüntüleri `platform/` klasöründen alınmıştır.

<table>
<tr>
<td width="50%">

**Giriş**

<img src="platform/1_login.jpg" alt="Giriş ekranı" />

</td>
<td width="50%">

**Öğrenci Paneli**

<img src="platform/2_ogrenci_ekrani.jpg" alt="Öğrenci ekranı" />

</td>
</tr>
<tr>
<td width="50%">

**Öğrenci Ders Ekranı**

<img src="platform/3_ogrenci_ders_ekrani.jpg" alt="Öğrenci ders ekranı" />

</td>
<td width="50%">

**Öğrenci Profili**

<img src="platform/4_ogrenci_profili.jpg.jpg" alt="Öğrenci profili" />

</td>
</tr>
</table>

<table>
<tr>
<td width="50%">

**Eğitmen: Kurs Ekleme (1)**

<img src="platform/5_ogretmen_kurs_ekleme_1.jpg" alt="Eğitmen kurs ekleme 1" />

</td>
<td width="50%">

**Eğitmen: Kurs Ekleme (2)**

<img src="platform/6_ogretmen_kurs_ekleme_2.jpg" alt="Eğitmen kurs ekleme 2" />

</td>
</tr>
<tr>
<td width="50%">

**Eğitmen: Öğrenci Yönetimi**

<img src="platform/7_ogretmen_ogrenci_yonetimi.jpg" alt="Eğitmen öğrenci yönetimi" />

</td>
<td width="50%">

**Admin Ana Ekran**

<img src="platform/8_admin_ekrani.jpg" alt="Admin ekranı" />

</td>
</tr>
</table>

<table>
<tr>
<td width="50%">

**Admin: Yönetim Paneli**

<img src="platform/9_admin_yonetim_paneli.jpg" alt="Admin yönetim paneli" />

</td>
<td width="50%">

**Admin: Kullanıcı Yönetimi**

<img src="platform/10_admin_kullanici_yonetimi.jpg" alt="Admin kullanıcı yönetimi" />

</td>
</tr>
<tr>
<td width="50%">

**Admin: Raporlar**

<img src="platform/11_admin_raporlar_ekrani.jpg" alt="Admin raporlar ekranı" />

</td>
<td width="50%">

**Admin: Ayarlar**

<img src="platform/12_admin_ayarlar_ekrani.jpg" alt="Admin ayarlar ekranı" />

</td>
</tr>
</table>

---

## 🚀 Kurulum

### Gereksinimler

- **Node.js** 20 veya üzeri
- **Docker** & **Docker Compose**
- **Git**

### Hızlı Başlangıç (Docker)

```bash
# 1. Projeyi klonlayın
git clone https://github.com/knowhycodata/knowhy-lms.git
cd knowhy-lms

# 2. Environment dosyasını oluşturun
cp backend/.env.example backend/.env

# 3. Docker ile başlatın
docker-compose up -d

# 4. Veritabanı migration'ları çalıştırın
docker-compose exec backend npx prisma migrate deploy

# 5. (Opsiyonel) Örnek veri yükleyin
docker-compose exec backend npx prisma db seed
```

Uygulama şu adreslerde çalışacaktır:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **PostgreSQL**: localhost:5432

### Geliştirme Ortamı

```bash
# Backend kurulumu
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run dev

# Frontend kurulumu (yeni terminal)
cd frontend
npm install
npm run dev
```

### Environment Değişkenleri

```env
# backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/knowhy_lms"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-refresh-token-secret"
PORT=3000
NODE_ENV=development
```

---

## 🏗 Mimari

### Sistem Akışı

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           KNOWHY LMS MİMARİSİ                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│     ┌─────────┐         ┌─────────┐         ┌─────────┐                │
│     │ Admin   │         │Eğitmen  │         │ Öğrenci │                │
│     └────┬────┘         └────┬────┘         └────┬────┘                │
│          │                   │                   │                      │
│          └───────────────────┼───────────────────┘                      │
│                              │                                          │
│                              ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                     FRONTEND (React + Vite)                        │ │
│  │                                                                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │ │
│  │  │  Pages   │  │Components│  │  Hooks   │  │ Services │          │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │ │
│  │                                                                    │ │
│  │  Tailwind CSS + shadcn/ui + Lucide Icons                          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                              │                                          │
│                              │ REST API (HTTP/JSON)                     │
│                              ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    BACKEND (Node.js + Express)                     │ │
│  │                                                                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │ │
│  │  │  Routes  │→ │Middleware│→ │Controller│→ │ Services │          │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │ │
│  │                                                                    │ │
│  │  JWT Auth + RBAC + Validation + Error Handling                    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                              │                                          │
│          ┌───────────────────┼───────────────────┐                      │
│          │                   │                   │                      │
│          ▼                   ▼                   ▼                      │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐               │
│  │  PostgreSQL  │   │ File System  │   │   YouTube    │               │
│  │   (Prisma)   │   │   (Videos)   │   │  (External)  │               │
│  └──────────────┘   └──────────────┘   └──────────────┘               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Veritabanı Şeması

```
User ─────────────────┬─────────────────────────────────────┐
  │                   │                                     │
  │ 1:N               │ 1:N                                 │ 1:N
  ▼                   ▼                                     ▼
Course ──────► Module ──────► Lesson ◄────── Progress ◄─────┘
  │                              │
  │ 1:N                          │ 1:N
  ▼                              ▼
Enrollment                    Comment ◄──── Comment (replies)
                                 │
                                 │ 1:N
                                 ▼
                             Attachment
```

Detaylı mimari dokümantasyonu için: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 📚 API Referansı

### Kimlik Doğrulama

| Endpoint | Metod | Açıklama |
|----------|-------|----------|
| `/api/auth/register` | POST | Yeni kullanıcı kaydı |
| `/api/auth/login` | POST | Giriş yap, token al |
| `/api/auth/refresh` | POST | Access token yenile |
| `/api/auth/logout` | POST | Çıkış yap |
| `/api/auth/me` | GET | Profil bilgisi |

### Kurslar

| Endpoint | Metod | Açıklama |
|----------|-------|----------|
| `/api/courses` | GET | Kurs listesi |
| `/api/courses/:id` | GET | Kurs detayı |
| `/api/courses` | POST | Kurs oluştur (Eğitmen) |
| `/api/courses/:id` | PUT | Kurs güncelle |
| `/api/courses/:id/enroll` | POST | Kursa kayıt ol |

### Video & İlerleme

| Endpoint | Metod | Açıklama |
|----------|-------|----------|
| `/api/videos/:lessonId/token` | POST | Video izleme token'ı |
| `/api/videos/:lessonId/stream` | GET | Video streaming |
| `/api/progress/:lessonId` | PUT | İlerleme kaydet |
| `/api/progress/stats/me` | GET | Kullanıcı istatistikleri |

### Yorumlar

| Endpoint | Metod | Açıklama |
|----------|-------|----------|
| `/api/comments/lesson/:lessonId` | GET | Ders yorumları |
| `/api/comments/lesson/:lessonId` | POST | Yorum ekle |
| `/api/comments/:id` | DELETE | Yorum sil |

---

## 📁 Proje Yapısı

```
knowhy-lms/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Veritabanı şeması
│   │   ├── migrations/        # DB migration'ları
│   │   └── seed.ts            # Örnek veri
│   ├── src/
│   │   ├── config/            # Konfigürasyon
│   │   ├── controllers/       # Route handler'ları
│   │   ├── middlewares/       # Auth, validation, error
│   │   ├── routes/            # API route tanımları
│   │   ├── services/          # Business logic
│   │   ├── utils/             # Yardımcı fonksiyonlar
│   │   └── app.ts             # Express uygulaması
│   └── uploads/               # Video/dosya storage
├── frontend/
│   ├── src/
│   │   ├── components/        # React bileşenleri
│   │   │   ├── ui/            # shadcn/ui bileşenleri
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── CommentSection.tsx
│   │   │   └── Layout.tsx
│   │   ├── pages/             # Sayfa bileşenleri
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API çağrıları
│   │   └── lib/               # Utility fonksiyonlar
│   └── public/                # Statik dosyalar
├── docs/                      # Dokümantasyon
├── docker-compose.yml         # Docker yapılandırması
├── LICENSE                    # Apache 2.0 lisansı
└── README.md                  # Bu dosya
```

---

## 🤝 Katkıda Bulunun

Katkılarınızı bekliyoruz! Lütfen [CONTRIBUTING.md](CONTRIBUTING.md) dosyasını okuyun.

### Geliştirme Adımları

1. Projeyi fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: add amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

### Commit Mesaj Formatı

```
feat: yeni özellik
fix: hata düzeltme
docs: dokümantasyon
style: kod formatı
refactor: kod yeniden yapılandırma
test: test ekleme
chore: genel bakım
```

---

## 📄 Lisans

Bu proje [Apache License 2.0](LICENSE) altında lisanslanmıştır.

```
Copyright 2024 Knowhy LMS Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0
```

---

## 🙏 Teşekkürler

Bu projede kullanılan açık kaynak kütüphanelere ve topluluklarına teşekkür ederiz:

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Express.js](https://expressjs.com/)
- [Prisma](https://www.prisma.io/)
- [PostgreSQL](https://www.postgresql.org/)

---

<div align="center">

**[⬆ Başa Dön](#knowhy-lms)**

Made with ❤️ for better learning experiences

</div>
