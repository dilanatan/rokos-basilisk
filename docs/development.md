# Kurulum ve geliştirme

## Gereksinimler

Node.js 24.5+ (24.x), npm ve Windows/Linux/macOS. SQLite Node ile birlikte
gelir. Veritabanı varsayılan olarak server/data/cyberops.db dosyasındadır.
SYNTRA adlandırması mevcut veriyi ve oturumları etkilemez: veritabanı dosya adı,
`cyberops_token` oturum anahtarı ve `cyberops_tour_v1_` rehber anahtarı uyumluluk
amacıyla korunur.

```powershell
npm run install:all
npm run dev
```

API 3001, Vite 5173 portundadır. Vite localhost'a bağlıdır; geliştirme
sunucusunu dış ağa açmayın. server/.env dosyası isteğe bağlıdır.
".env not found" mesajı demo kullanımını engellemez.

## Demo kimlik ve AI

- Demo girişinde kullanıcı seçilir; parola/AD doğrulaması yapılmaz.
- Çalışan / yönetici / direktör kapsamları servis katmanında uygulanır.
- Kullanıcı değiştirildiğinde eski istekler iptal edilir ve ekran durumu sıfırlanır.
- JWT oturumları ve API tokenları iptal edilebilir; iptal edilen tokenın açık
  SSE bağlantısı da kapatılır.
- Üretim modunda en az 32 karakter JWT_SECRET ve açık DEMO_MODE=true gerekir.
  Bu ayar uygulamayı gerçek kimlik doğrulaması olan üretim sistemine dönüştürmez.
- AD entegrasyonu kullanıcı kararıyla ertelenmiştir.
- ANTHROPIC_API_KEY veya ANTHROPIC_AUTH_TOKEN tanımlıysa AI modeli kullanılır.
  Anahtar yoksa veya CHAT_MODE=rules seçilirse kural tabanlı demo asistanı çalışır.
- Testler harici AI servisine çağrı yapmaz.

## Komutlar

| Komut | İşlev |
|---|---|
| npm run install:all | Kök, server ve web bağımlılıklarını kurar |
| npm run dev | API ve web geliştirme sunucularını başlatır |
| npm run build | web/dist üretim çıktısını oluşturur |
| npm start | API ile birlikte derlenmiş arayüzü 3001 portunda sunar |
| npm run lint | JavaScript/JSX statik hata kontrolleri |
| npm test | Bellek DB ile regresyon, API/MCP ve güvenlik testleri |
| npm run test:e2e | İzole API 3101 / web 5176 ile tarayıcı testleri |
| npm run check | Lint, otomatik testler ve derleme |
| npm run audit:all | Kök, server ve web bağımlılık taramaları |
| npm run seed | Mevcut demo verisini silerek yeniden oluşturur |

Tarayıcı testlerinden önce build çalıştırın. Windows'ta kurulu Edge başsız
modda kullanılır. Diğer sistemlerde `npx playwright install chromium`
gerekir. CI Chromium'u otomatik kurar. Test DB bellektedir; kişisel demo
veritabanı kullanılmaz. Playwright sonuçları test-results/ ve
playwright-report/ altında, Git dışında tutulur.

## API ve MCP

REST: /api, MCP Streamable HTTP: POST /mcp. Her ikisinde
Authorization: Bearer TOKEN kullanılır. URL tokenı yalnızca SSE için kabul edilir.

- GET /api/tasks?paged=true&limit=50&offset=0: items, total, limit, offset.
  Sayfalar 1–500 kayıt alabilir; varsayılan eski dizi biçimi korunur.
- GET /api/reports/summary?team=SOC ve /api/reports/tasks.csv?team=SOC:
  aynı tam ekip adı eşleşmesi.
- POST /api/reports/digest, JSON {"team":"SOC"}: aynı ekip kapsamına bildirim.
- GET /api/notifications/unread-count: son 50 kayıttan bağımsız okunmamış toplamı.
- POST /api/me/api-token; GET /api/me/api-tokens;
  DELETE /api/me/api-tokens/:jti: kişisel entegrasyon tokenları.
- GET /api/audit: direktöre açık son 100 işlem kaydı.
- POST /api/chat: messages ve UUID requestId zorunludur.
  Aynı kimlik/içerik yeniden gönderildiğinde önceki yanıt döner.
  Farklı içerikle aynı kimlik 409 üretir. Yazma işleminden sonra model hatası
  olursa görev yeniden oluşturulmaz; kısmi sonuç kullanıcıya bildirilir.

MCP 24 araç içerir. Görev listesi limit/offset, rapor ve toplu bildirim team
filtresini destekler. Entegrasyon sayfasındaki örnekler mevcut origin'i kullanır;
geliştirmede /api ve /mcp Vite tarafından API'ye aktarılır.

## Veriler ve belgeler

Şema değişiklikleri schema_migrations tablosuyla uygulanır. Mevcut demo
verisi başlangıçta korunur. Veri değiştiren servis işlemleri ve denetim kaydı
aynı transaction içindedir; SSE olayları commit sonrasında gönderilir.

Yardımcı iş kuralları, kurulum, test ve güvenlik Markdown belgelerini docs/
altına ekleyin. AI yönergelerini ilgili .claude/ veya .codex/ dizininde tutun.
Proje giriş belgesi de docs/README.md konumunda tutulur.
