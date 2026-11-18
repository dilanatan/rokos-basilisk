# İş kuralları ve gereksinimler

| Gereksinim | Uygulama karşılığı |
|---|---|
| Günlük ve yedek işler | Görev türü, sorumlu/yedek sorumlu, öncelik, son tarih, durum, yorum, tekrarlama, liste ve Kanban |
| Etkinlik ve iletişim | Takvim/liste, bireysel/kurumsal etkinlik, kayıt, konuşmacı/organizatör, gerçekleşen katılım, düzenleme/iptal, duyurular |
| Bireysel yetkinlik | 1–5 beceri seviyesi, yetkinlik matrisi, sertifika ekleme/düzenleme/silme ve bitiş uyarıları |
| Çalışan/yönetici/direktör | Kullanıcı ve ekip kapsamı servis katmanında; REST ve MCP ortak iş kurallarını çağırır |
| Raporlama ve bildirim | Kişi/ekip raporu, trend, filtreli CSV, toplu özet ve SSE bildirimleri |
| Veri paylaşımı | REST API, 24 MCP aracı, kişisel ve iptal edilebilir token |
| Kullanıcı eğitimi | İlk kullanım rehberi; role uygun adımlar, atlama/tamamlama ve yeniden başlatma |

## Yetki ve bütünlük

Çalışan kendi görevlerini ve yetkinliğini yönetir. Yönetici kendisi ve
doğrudan bağlı çalışanlar kapsamında çalışır. Direktör organizasyonu görür
ve rol/yönetici ilişkilerini değiştirir. Son direktör kaldırılamaz;
yönetici hiyerarşisinde döngü oluşturulamaz. Yönetici ataması boşaltılabilir.

Görev durumunu sorumlu/yedek kişi veya yetkili yönetici değiştirebilir.
Metadata değişikliği yöneticiye veya görevin oluşturucusuna açıktır.
Tekrarlayan görev tamamlandığında güncel alanlarla tek bir sonraki görev
oluşur. Açıp tekrar tamamlamak ikinci bir kopya üretmez.

Rapor, CSV ve toplu bildirim aynı ekip filtresini kullanır. Ekip adı tam
eşleşir; SQL joker karakterleri kapsamı büyütmez. CSV hücrelerindeki formül
başlangıçları kaçışlanır. Görevler sayfalanır; toplamlar liste limitinden
bağımsız hesaplanır.

Kategori boş bırakılan yetkinlik "Genel" olarak kaydedilir. Tarihler gerçek
takvim tarihleri olmalıdır; bitiş başlangıçtan önce olamaz. İptal edilmiş
veya geçmiş etkinliğe yeni kayıt yapılamaz. Tekrar kayıt katıldı bilgisini
sıfırlamaz.

İlk girişte yönetici/direktör Raporlar, çalışan Panel ekranını görür.
Rehberin tamamlanma bilgisi tarayıcıda kullanıcı bazında saklanır.
Demo giriş, AD bağlantısı kuruluncaya kadar bilinçli olarak kullanılır.
