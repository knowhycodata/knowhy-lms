# Katkıda Bulunma Rehberi

Knowhy LMS projesine katkıda bulunmak istediğiniz için teşekkür ederiz! Bu rehber, projeye nasıl katkıda bulunabileceğinizi açıklar.

## Davranış Kuralları

Bu projeye katkıda bulunan herkes, saygılı ve yapıcı bir ortam yaratmaya yardımcı olmalıdır. Lütfen:

- Yapıcı geri bildirim verin
- Farklı bakış açılarına saygı gösterin
- Topluluk için en iyisine odaklanın

## Nasıl Katkıda Bulunabilirim?

### Hata Bildirimi

1. Önce [mevcut issue'ları](../../issues) kontrol edin
2. Yeni bir issue açarken şunları belirtin:
   - Hatanın net açıklaması
   - Hatayı yeniden oluşturma adımları
   - Beklenen davranış
   - Ekran görüntüleri (varsa)
   - Ortam bilgileri (OS, tarayıcı, Node.js sürümü)

### Özellik Önerisi

1. Önce [mevcut önerileri](../../issues?q=is%3Aissue+label%3Aenhancement) kontrol edin
2. Yeni bir issue açarak önerinizi detaylı açıklayın
3. Kullanım senaryolarını ve faydalarını belirtin

### Kod Katkısı

#### Geliştirme Ortamı Kurulumu

```bash
# Repository'yi fork edin ve klonlayın
git clone https://github.com/knowhycodata/knowhy-lms.git
cd knowhy-lms

# Backend bağımlılıkları
cd backend
npm install
cp .env.example .env
npx prisma generate

# Frontend bağımlılıkları
cd ../frontend
npm install

# Docker ile veritabanını başlatın
docker-compose up -d postgres
```

#### Geliştirme Süreci

1. **Branch oluşturun**
   ```bash
   git checkout -b feature/ozellik-adi
   # veya
   git checkout -b fix/hata-aciklamasi
   ```

2. **Değişikliklerinizi yapın**
   - Kod stiline uyun (ESLint kuralları)
   - TypeScript tip güvenliğini koruyun
   - Gerekli testleri ekleyin

3. **Commit mesajları**
   ```
   feat: yeni özellik açıklaması
   fix: hata düzeltme açıklaması
   docs: dokümantasyon güncellemesi
   style: kod formatı değişiklikleri
   refactor: kod yeniden yapılandırma
   test: test ekleme/düzeltme
   chore: genel bakım işleri
   ```

4. **Pull Request açın**
   - Değişikliklerinizi açıklayın
   - İlgili issue'ları referans verin
   - Ekran görüntüleri ekleyin (UI değişiklikleri için)

## Kod Standartları

### TypeScript

```typescript
// ✅ Doğru
interface UserData {
  id: string;
  name: string;
  email: string;
}

const getUser = async (id: string): Promise<UserData> => {
  // ...
};

// ❌ Yanlış
const getUser = async (id: any): Promise<any> => {
  // ...
};
```

### React Bileşenleri

```tsx
// ✅ Fonksiyonel bileşen + TypeScript
interface Props {
  title: string;
  onClose: () => void;
}

export const Modal: React.FC<Props> = ({ title, onClose }) => {
  return (
    <div className="modal">
      <h2>{title}</h2>
      <button onClick={onClose}>Kapat</button>
    </div>
  );
};
```

### API Endpoints

- RESTful prensiplere uyun
- Tutarlı hata yanıtları döndürün
- Yetkilendirme kontrollerini unutmayın

## Proje Yapısı

```
knowhy-lms/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic
│   │   ├── middlewares/    # Auth, validation
│   │   ├── routes/         # API routes
│   │   └── utils/          # Helper functions
│   └── prisma/             # Database schema
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API calls
│   │   └── lib/            # Utilities
└── docs/                   # Documentation
```

## Test Yazımı

```typescript
// backend/src/__tests__/auth.test.ts
describe('Auth Service', () => {
  it('should hash password correctly', async () => {
    const password = 'test123';
    const hashed = await hashPassword(password);
    expect(hashed).not.toBe(password);
  });
});
```

## Soru ve Destek

- GitHub Issues üzerinden soru sorabilirsiniz
- Tartışmalar için Discussions bölümünü kullanın

## Lisans

Katkılarınız Apache 2.0 lisansı altında yayınlanacaktır.

---

Katkılarınız için teşekkür ederiz! 🎉
