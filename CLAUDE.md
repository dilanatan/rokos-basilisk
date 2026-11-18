# CLAUDE.md — Hackathon Projesi

> ⏱️ **Toplam süre: 3 saat.** Bu süre her kararın önünde gelir. Mükemmel değil, **çalışan ve demo edilebilir** bir ürün hedefliyoruz.

## 1. Görev
<!-- Hackathon görevi açıklandığında burayı doldur -->
- **Problem:** _TODO_
- **Beklenen çıktı:** _TODO_
- **Değerlendirme kriterleri:** _TODO (ör. işlevsellik, yaratıcılık, AI kullanımı, sunum)_
- **Teslim şekli:** _TODO (repo'ya push, demo videosu, canlı sunum vb.)_

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
- **Dil / Framework:** _TODO_
- **Kurulum:** `TODO (ör. npm install / pip install -r requirements.txt)`
- **Çalıştırma:** `TODO (ör. npm run dev / python app.py)`
- **Test:** `TODO`
- **Ortam değişkenleri:** `.env.example` dosyasına bakın.

## 5. Klasör Yapısı
<!-- Proje kuruldukça güncelle -->
```
/
├── CLAUDE.md
├── README.md
├── .env.example
└── src/
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
- _ör. 0:25 — Veritabanı yerine JSON dosyası kullanılacak (hız için)_
