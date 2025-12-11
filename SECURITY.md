# Güvenlik Politikası

## Desteklenen Sürümler

| Sürüm | Destekleniyor |
| ----- | ------------- |
| 1.x   | ✅            |

## Güvenlik Açığı Bildirimi

Knowhy LMS'de bir güvenlik açığı keşfettiyseniz, lütfen sorumlu bir şekilde bildirin.

### Bildirme Süreci

1. **Herkese açık issue açmayın** - Güvenlik açıklarını GitHub Issues üzerinden bildirmeyin.

2. **E-posta ile bildirin** - Güvenlik açığını detaylı bir şekilde açıklayan bir e-posta gönderin.

3. **Bildiriminize dahil edin:**
   - Açığın detaylı açıklaması
   - Açığı yeniden oluşturma adımları
   - Potansiyel etki
   - Varsa önerilen düzeltme

### Yanıt Süreci

- 48 saat içinde bildiriminizi aldığımızı onaylayacağız
- 7 gün içinde ilk değerlendirmemizi paylaşacağız
- Düzeltme yayınlandığında sizi bilgilendireceğiz

## Güvenlik En İyi Uygulamaları

### Kurulum için

```bash
# Güçlü JWT secret'ları kullanın
JWT_SECRET="minimum-32-karakter-uzunlugunda-rastgele-string"
JWT_REFRESH_SECRET="farkli-bir-guclu-rastgele-string"

# Production'da HTTPS kullanın
# Rate limiting'i aktif tutun
# CORS'u doğru yapılandırın
```

### Geliştirme için

- Bağımlılıkları düzenli güncelleyin
- `npm audit` ile güvenlik taraması yapın
- Hassas verileri asla commit etmeyin
- Environment değişkenlerini `.env` dosyasında tutun

## Bilinen Güvenlik Özellikleri

- **JWT Authentication**: Access + Refresh token sistemi
- **Password Hashing**: bcrypt ile güvenli şifreleme
- **RBAC**: Rol bazlı erişim kontrolü
- **Input Validation**: Zod ile girdi doğrulama
- **SQL Injection Koruması**: Prisma ORM ile parametreli sorgular
- **XSS Koruması**: React'in otomatik escape mekanizması

## Teşekkür

Güvenlik açıklarını sorumlu bir şekilde bildiren herkese teşekkür ederiz.
