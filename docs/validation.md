# Doğrulama

## Çalıştırma

```powershell
npm run check
npm run test:e2e
npm run audit:all
```

.github/workflows/checks.yml aynı kontrolleri push ve pull request
üzerinde çalıştırır. CI'da temiz npm ci kurulumları kullanılır.

## Kalıcı regresyon kapsamı

- Rapor, CSV ve bildirimde aynı ekip; joker karakter ve yetki kapsamı.
- 500'den fazla göreve sayfalama ile erişim ve doğru dashboard toplamı.
- Boş yetkinlik kategorisi, geçersiz tarih/başlık ve beklenmeyen alanlar.
- Tekrarlayan görevde tek kayıt, güncel alanların aktarımı ve transaction geri alma.
- CSV formül kaçışı, son direktör koruması ve yönetici döngüsü.
- Kullanıcı/ekip ayrımı; etkinlik iptali ve gerçekleşen katılımın korunması.
- Sertifika düzenleme/silme, token iptali ve açık SSE bağlantısının kapanması.
- 50'den fazla bildirimde doğru okunmamış sayısı ve tekrar uygulanabilir migration.
- REST ve MCP yetkileri; model hatası sonrası mükerrer işin engellenmesi.
- Artık yıl, yıl geçişi ve çok günlük etkinliklerin sınır günleri.
- Sekmeler arası token kaldırma ve hesap değişiminde eski isteğin iptali.
- Picomatch yerel düzeltmesinin kurulu olması, zararlı desenlerin reddi ve
  normal derleme globlarının çalışması.

## Tarayıcı kapsamı

Role göre açılış, rehberin tamamlanması/kalıcılığı/yeniden açılması,
kullanıcı menüsünün tıklanabilirliği, hesap kapsamı, filtreli CSV ve bildirim,
501. göreve erişim, yetkinlik ve sertifika işlemleri, çok günlük etkinlik
oluşturma/düzenleme/iptal, mobil menü, token iptali, sekmeler arası çıkış ve
ağ hatasından yeniden deneme.

## Sınırlar

Testlerin geçmesi tüm olası hataların yokluğunu kanıtlamaz. AD/SSO
entegrasyonu, çok sunuculu dağıtım ve gerçek model kalitesi bu demo kabul
kapsamının dışındadır. AI testi yerel model taklidi kullanır, API kredisi
harcamaz. Güvenlik taramasının temiz olması yerel fork bakımını ortadan
kaldırmaz; [bakım notuna](dependencies/picomatch-security.md) bakın.

## Son yerel doğrulama — 2026-11-18

Node.js 24.5.0 / Windows: 29 servis, API, takvim, istemci ve güvenlik testi;
Edge üzerinde 9 tarayıcı senaryosu başarılı. Lint ve Vite 8.3.8 üretim
derlemesi başarılı. Bu sonuçlar demo kabul kapsamını doğrular.

Kök, server ve web npm audit taramalarında 0 açık raporlandı. Ayrı geçici
klasörde npm ci kurulumu ve kurulan glob koruması da doğrulandı.
