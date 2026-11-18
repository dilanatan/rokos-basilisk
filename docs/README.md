# SYNTRA

**Cybersecurity Intelligence & Team Orchestration**

Siber güvenlik ekipleri için görev, yedek sorumluluk, etkinlik, yetkinlik,
raporlama ve bildirim yönetimi. React arayüzü, REST API ve MCP aynı rol
kurallarını kullanır.

## Hızlı başlangıç

Node.js 24.5 veya daha yeni bir Node 24 sürümü kullanın.

```powershell
npm run install:all
npm run dev
```

Tarayıcı: http://127.0.0.1:5173. Şimdilik demo hesapları kullanılır.
Yönetici ve direktörler raporlara, çalışanlar kişisel panele yönlendirilir.
AD bağlantısı sonraki aşamadadır.

## Kontroller

```powershell
npm run check
npm run test:e2e
npm run audit:all
```

Kurulum veya bağımlılık hatasında önce `npm run install:all` çalıştırın.
`vite` ve `express` ayrı web/server paketlerinde kurulur.

## Belgeler

- [Kurulum ve geliştirme](development.md)
- [İş kuralları ve gereksinimler](requirements.md)
- [Doğrulama ve test kapsamı](validation.md)
- [Bağımlılık güvenliği ve yerel düzeltme](dependencies/picomatch-security.md)

Yardımcı Markdown belgeleri `docs/` altındadır. AI çalışma yönergeleri
`.claude/` gibi ilgili AI dizinlerinde tutulur.

- [Markdown yerleşim kuralı](documentation-policy.md)
