# Markdown belge yerleşim kuralı

**.claude/, .codex/ ve benzeri ana AI dizinleri dışında kalan bütün proje
Markdown (.md) belgeleri, depo kökündeki docs/ klasörü içinde tutulmalıdır.**

- Proje README: docs/README.md.
- İş kuralları ve gereksinimler: docs/requirements.md.
- Kurulum ve geliştirme: docs/development.md.
- Test ve doğrulama: docs/validation.md.
- Bağımlılık ve güvenlik belgeleri: docs/dependencies/.
- AI talimatları ilgili .claude/, .codex/, .cursor/ veya .gemini/ dizininde kalır.
- Depo kökünde veya kaynak kod klasörlerinde yardımcı Markdown oluşturulmaz.
- Yeni belge eklendiğinde ilgili bağlantılar gerçek yeni konuma göre güncellenir.
- node_modules gibi kurulan bağımlılıkların ve Git dışında bırakılan araç
  çıktılarının dosyaları taşınmaz.

Kontrol: `npm run docs:check`. Bu kontrol `npm run check` ve CI akışına dahildir.
Yanlış konuma eklenen Markdown dosyası kontrolü başarısız yapar.
