# CLAUDE.md — Hackathon Projesi

> ⏱️ **Toplam süre: 3 saat.** Bu süre her kararın önünde gelir. Mükemmel değil, **çalışan ve demo edilebilir** bir ürün hedefliyoruz.

## 1. Görev
<!-- Hackathon görevi açıklandığında burayı doldur -->
- **Problem:** Siber güvenlik ekipleri için görev yönetim aracı. Minimum özellikler: (1) günlük ve yedek işlerin görev olarak atanması/takibi, (2) bireysel/kurumsal etkinlik ve bireysel yetkinlik yönetimi, (3) çalışan/yönetici/direktör yetkilendirmesi, (4) toplu raporlama ve bildirim, (5) API veya MCP ile veri paylaşımı.
- **Ekstra hedef:** Chatbot + MCP ile önyüz yönlendirme (asistan veriyi MCP tool'larıyla çeker, `ui_navigate` ile ekranı açar).
- **Beklenen çıktı:** Tüm özellikleri gösteren, demo edilebilir uygulama + mimari/tech stack dokümanı (README.md).
- **Değerlendirme kriterleri:** _TODO (jüri kriterleri netleşince doldur)_
- **Teslim şekli:** _TODO_

## 2. Zaman Planı
| Süre | Aşama | Çıktı |
|---|---|---|
| 0:00 – 0:20 | Analiz ve plan | Kapsam netleşti, MVP özellik listesi yazıldı |
| 0:20 – 0:40 | İskelet | Proje kuruldu, "hello world" çalışıyor, ilk commit atıldı |
| 0:40 – 2:00 | MVP geliştirme | Ana akış uçtan uca çalışıyor |
| 2:00 – 2:30 | İyileştirme | Hatalar giderildi, UI toparlandı, olası ek özellikler eklendi |
| 2:30 – 2:50 | Dondurma | **Yeni özellik eklenmez.** README, demo verisi, son testler yapılır |
| 2:50 – 3:00 | Teslim | Son push, demo provası |

**Kural:** Bir iş planlanan süreyi 15 dakikadan fazla aşarsa dur, kapsamı daralt ya da daha basit bir yol seç.

## 3. Çalışma Prensipleri (Claude için)
- **Önce MVP:** En kısa yoldan uçtan uca çalışan akışı kur, sonra geliştir. Eksik parçalar için mock veya hardcode kullanılabilir.
- **Az soru, çok iş:** Makul bir varsayılan varsa onu seç, varsayımı tek satırla belirt ve devam et. Sadece gerçekten bloklayan konularda soru sor.
- **Bildik teknolojiler:** Yeni framework öğrenmeye zaman yok. Ekibin bildiği ve hızlı kurulan araçları tercih et.
- **Sık commit:** Çalışan her adımdan sonra küçük bir commit at. Böylece geri dönüş her zaman mümkün olur.
- **Over-engineering yok:** Soyutlama, genel çözüm ya da "ileride lazım olur" kodu yazılmaz. Test sadece kritik mantık için yazılır.
- **Her değişiklikten sonra çalıştır:** Kodun gerçekten çalıştığını doğrula. "Çalışmalı" demek yeterli değildir.
- **Secret yönetimi:** API anahtarları `.env` dosyasına konur, `.env` `.gitignore`'a eklenir. Hiçbir secret repoya commit edilmez.

## 4. Teknik Bilgiler
<!-- Repo klonlandıktan sonra doldur -->
- **Dil / Framework:** JavaScript (ESM). Backend: Node 24 + Express 5 + `node:sqlite`. Önyüz: React 19 + Vite 8 + Tailwind 4. AI: `@anthropic-ai/sdk` (claude-opus-5-5) + `@modelcontextprotocol/sdk`.
- **Kurulum:** `npm run install:all`
- **Çalıştırma:** `npm run dev` (API :3001, web :5173). Prod: `npm run build && npm start` (tek port :3001)
- **Demo verisini sıfırla:** `npm run seed`
- **Test:** Otomatik test yok; manuel uçtan uca kontrol (login → chatbot komutu → yönlendirme). Build kontrolü: `npm run build`
- **Ortam değişkenleri:** `server/.env.example`. `ANTHROPIC_API_KEY` yoksa chatbot kural tabanlı modda çalışır.
- **Mimari kural:** Tüm iş kuralları ve RBAC `server/src/services.js` içinde. REST (`index.js`) ve MCP (`mcp.js`) sadece bu fonksiyonları çağırır. Yeni özellik = servis fonksiyonu + REST route + MCP tool (+ gerekirse chat.js kural motoru niyeti).
- **Önyüz yönlendirme:** Sayfalar filtreleri URL query'den okur (`?status=open&priority=critical&highlight=5`). `ui_navigate` tool'u bu URL'yi üretir.

## 5. Klasör Yapısı
<!-- Proje kuruldukça güncelle -->
```
/
├── CLAUDE.md, README.md, package.json (root script'ler)
├── server/
│   ├── .env.example
│   └── src/  index.js · services.js · mcp.js · chat.js · notify.js · auth.js · db.js · seed.js
└── web/
    └── src/  App.jsx · api.js · auth.jsx · components/ (ui, ChatWidget) · pages/
```

## 6. Git Akışı
- Hız için doğrudan `main` dalında çalışılır. Birden fazla kişi aynı anda kod yazıyorsa her biri kısa ömürlü bir feature branch açar ve sık merge eder.
- Commit mesajları kısa ve açıklayıcı olmalı: `feat: login akışı`, `fix: boş girdi hatası`.
- Push etmeden önce kodun çalıştığını kontrol et.

## 7. Demo Kontrol Listesi (2:30'da başla)
- [ ] Ana akış baştan sona hatasız çalışıyor
- [ ] Demo verisi hazır, sunumda canlı veri girmeye gerek yok
- [ ] README'de problem, çözüm, kurulum ve çalıştırma adımları var
- [ ] AI'ın nasıl kullanıldığı README'de anlatılıyor (jüri için önemli olabilir)
- [ ] Son commit push edildi
- [ ] Canlı demo başarısız olursa diye ekran görüntüsü veya video yedeği hazır

## 8. Kararlar ve Notlar
<!-- Önemli kararları buraya kısa notlarla ekle. Context sıfırlansa bile Claude buradan devam edebilir. -->
- Tek dil (JS) ve Node'a gömülü SQLite seçildi: native derleme/kurulum riski yok.
- Kimlik doğrulama demo amaçlı şifresiz (kullanıcı seç → JWT). Sağ üstten rol değiştirerek RBAC gösterilir.
- MCP server stateless Streamable HTTP (`POST /mcp`), Bearer token ile kullanıcı kapsamında çalışır. Chatbot da MCP istemcisi olarak aynı endpoint'i kullanır.
- Chatbot: Claude (`claude-opus-5-5`, effort low, `fallbacks: "default"`). Anahtar yoksa/hata olursa kural tabanlı Türkçe niyet motoru devreye girer (demo güvencesi).
- Canlı güncellemeler SSE ile: `notification` (zil + toast) ve `change` (sayfalar otomatik yenilenir).
- Windows'ta bash heredoc içinde Türkçe kesme işareti sorun çıkarabiliyor; dosyaları Write aracıyla yaz.
