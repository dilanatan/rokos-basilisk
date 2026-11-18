Sen kıdemli bir Full-Stack Yazılım Mimarı ve Siber Güvenlik Uygulama Geliştiricisisin.

Turkcell Siber Güvenlik (CS) ekibi için **CS AI Hackathon** isterlerini %100 karşılayan, **Chat-First + Split View** mimarisine sahip **"CS-AI Command Hub"** uygulamasını tek seferde, çalışır, güvenli ve modüler kod standartlarında inşa edeceğiz.

### 1. TEKNİK MİMARİ VE KATMANLI YAPI

Hem REST API hem de MCP sunucusunun aynı veriyi canlı paylaşabilmesi için **Paylaşımlı Servis & JSON Depolama (Single Source of Truth)** mimarisi kur:

- `data/store.json`: İlk açılışta `service.py` tarafından otomatik oluşturulan başlangıç verisi (Görevler, Kullanıcılar, Etkinlikler).
- `backend/service.py`: Tüm iş mantığı (Task CRUD, Birincil + Yedek atama, Bus Factor/Yedeksizlik alarm analizi, Geçmiş görev/etkinliklerden pasif yetkinlik çıkarımı, Role göre rapor üretimi, Demo veri sıfırlama). Hem `main.py` hem `mcp_server.py` sadece bu servisi çağırır.
- `backend/security.py`:
  - `ALLOWED_ROUTES` beyaz listesi (`/`, `/tasks`, `/tasks/new`, `/events`, `/reports`, `/notifications`, `/admin/users`).
  - Sunucu taraflı RBAC matrisi (`employee`, `manager`, `director`).
  - Prompt injection ve tehlikeli karakter filtreleme yardımcıları.
- `backend/intent_router.py`:
  - **1. Aşama (Kural Tabanlı):** Sık komutları regex/anahtar kelime ile sıfır gecikmeyle yakalar; `context.selected_task_id` bağlamını ("bunu Ayşe'ye ata") çözer.
  - **2. Aşama (Saka LLM Çağrısı):** `.env` içindeki `SAKA_API_KEY`, `SAKA_BASE_URL`, `SAKA_MODEL` ile `httpx.AsyncClient(timeout=6.0)` üzerinden çağrı yapar. Yanıttaki olası markdown ` ```json ` bloklarını regex ile temizleyip Pydantic şemasıyla doğrular. Hata/timeout durumunda gracefully `clarify` döner.
- `backend/main.py`: FastAPI sunucusu (`POST /chat`, `GET /state`, `POST /tasks/assign`, `POST /skills/extract`, `POST /reset`). Frontend'i statik olarak da (`/` üzerinden) sunabilsin ki tek porttan (`localhost:8000`) açılabilsin.
- `backend/mcp_server.py`: `FastMCP` kullanarak `service.py` fonksiyonlarını (`get_critical_tasks`, `assign_task_backup`, `generate_role_report`) dışarı açan MCP sunucusu.
- `frontend/index.html`: Tailwind CSS + Vanilla JS ile tek dosya, koyu temalı modern web arayüzü.
- `.env.example`, `.gitignore` (`.env` ve `__pycache__` hariç tutulmuş), `requirements.txt`, `README.md`.

### 2. HACKATHON İSTERLERİ VE İNOVATİF DETAYLAR

1. **Task & Akıllı Yedek (Backup) Yönetimi:**
   - Görev alanları: `id`, `title`, `category` (SOC, Pentest, AppSec, Network), `priority` (P1, P2, P3), `assignee` (Birincil), `backup` (Yedek), `status` (Açık, Devam Ediyor, Geciken, Tamamlandı), `sla_hours`.
   - **Proaktif Bus Factor Alarmı:** Birincil kişinin yükü >%85 ise veya yedeği yoksa/aşinalığı düşükse sistem otomatik **Kırmızı Alarm** üretir ve tek tıkla yedek önerir.
2. **Zero-Data (Pasif) Yetkinlik & Etkinlik Yönetimi:**
   - Şirkette hazır yetkinlik datası olmadığı varsayımıyla; `service.py` kullanıcıların tamamladığı görev kategorilerinden ve katıldığı etkinliklerden otomatik yetkinlik puanları hesaplar.
   - `/events` görünümünde **"Hızlı AI Profilleme"** kutusu yer alır: Yapıştırılan özgeçmiş/eğitim metninden yetkinlik etiketleri çıkarıp kullanıcı profiline ekler.
3. **Yetkilendirme (RBAC) & Demo Kontrolleri:**
   - Sol alt menüde **Demo Rol Değiştirici** (`employee`, `manager`, `director`). Yetkisiz işlemlerde backend `403`/yetki reddi döner.
   - Üst barda **`[↻ Demo Sıfırla]`** butonu (`POST /reset` ile veriyi ilk haline döndürür).
4. **Role Göre Akıllı Raporlama:**
   - `/reports` sayfasında `manager` için operasyonel gecikme ve iş yükü dengeleme raporu; `director` için stratejik SLA uyumu, ekip darboğazları ve etkinlik ROI analizi üretilir.

### 3. UI/UX TASARIM KURALLARI (`frontend/index.html`)

- **Chat-First Ana Sayfa (`/`):** Merkezde geniş sohbet alanı, üstünde 3 canlı durum şeridi (Kritik Yedeksiz Alarm, Geciken SLA, Ekip Kapasitesi) ve altında **seçili role göre dinamik değişen 4 Hızlı Öneri Butonu (Chips)**.
- **Split View (Diğer Sayfalar):** `/tasks`, `/events`, `/reports`, `/admin/users` sayfalarına geçildiğinde sol/orta alanda ilgili sayfa açılır; sağda sabit (`w-96`) sohbet paneli kalır ve üst köşesinde **`[Küçült / Genişlet]`** butonu bulunur.
- **Zengin Onay Kartları (Human-in-the-Loop):** Veri değiştiren her eylemde (`assign_task`, `create_task`, `triage_task`) chat içinde adayın güncel iş yükü barını gösteren **Onay Kartı (`[✓ Onayla ve Uygula]` / `[İptal]`)** render edilir.
- **Görsel Vurgu (Highlight):** Chat üzerinden bir görev atandığında veya eklendiğinde soldaki listede o satır 3 saniye cyan çerçeveyle parlar ve ekrana kaydırılır.
- **Hibrit Kesintisiz Çalışma:** Frontend istekleri `POST /chat` ucuna atar; sunucuya ulaşılamazsa yerleşik JS simülasyon motoru devreye girerek demoyu kesintisiz sürdürür.

### 4. AI KOD ANALİZİ (%25 PUAN) İÇİN ZORUNLU STANDARTLAR

- Tüm fonksiyonlarda Python type hints ve Google-style docstring kullan.
- Dış API çağrılarını spesifik `try-except` bloklarıyla koru ve `logging` modülü ile logla (asla sessiz `pass` kullanma).
- Girdileri Pydantic `Field(..., max_length=500)` ile sınırla ve HTML çıktılarında XSS'e karşı `textContent` / escape kullan.
- `README.md` içinde proje mimarisini, kurulum komutlarını (`uvicorn backend.main:app --reload` ve `python backend/mcp_server.py`), RBAC tablosunu ve örnek chat komutlarını net biçimde dokümante et.

### 5. MİMARİ TUTARLILIK, GÜVENLİK VE KABUL KRİTERLERİ

#### A. Kod ve mimari standartları

- Python 3.11+ ile uyumlu, modüler ve çalıştırılabilir bir uygulama üret.
- İş mantığını FastAPI route fonksiyonlarından ayır; REST API ve MCP araçları ortak servis katmanlarını kullansın.
- Tüm request/response yapılarını Pydantic modelleriyle tanımla.
- Görev, kullanıcı, etkinlik ve onay işlemleri için deterministik mock veri yönetimi sağla.
- Backend başlatıldığında frontend aynı origin üzerinden sunulsun.
- Kodda eksik fonksiyon, TODO, placeholder, pseudo-code veya tanımsız import bırakma.
- Gerekli tüm bağımlılıkları sürüm uyumluluğunu gözeterek tanımla.

#### B. AI entegrasyonu

- Saka LLM entegrasyonunu `saka_client.py` içerisinde soyutla.
- Gerçek Saka API sözleşmesi bilinmiyorsa endpoint veya response formatı uydurma; adaptörü yapılandırılabilir oluştur.
- Hibrit yönlendirme sırası: Rule Engine → Saka LLM → Clarification.
- LLM çıktısını yalnızca izinli intent ve alanları kabul eden Pydantic şemasıyla doğrula.
- LLM metinlerinden doğrudan fonksiyon çalıştırma, route seçme veya veritabanı değiştirme.
- Saka erişilemezse kullanıcıya AI fallback durumunu belirt ve kural motoruyla desteklenen işlemleri sürdür.

#### C. Transactional Human-in-the-Loop

- `assign_task`, `triage_task`, `create_task` işlemleri önce preview döndürsün.
- Preview sonucunda `requires_confirm: true`, `action_id`, işlem detayları ve aday iş yükü bilgisi yer alsın.
- Onay için `POST /actions/{id}/confirm` endpoint'i kullan.
- Onaylar tek kullanımlık, süreli ve kullanıcıya/oturuma bağlı olsun.
- Uygulama öncesinde RBAC ve kaynak yetkisi yeniden kontrol edilsin.
- Aynı işlem tekrarlanarak ikinci defa uygulanamasın.
- Başarılı ve reddedilen kritik işlemler audit log'a yazılsın.

#### D. RBAC ve güvenlik

- `employee`, `manager`, `director` rolleri için açık bir yetki matrisi oluştur.
- Demo rol değiştirici yalnızca development/demo modunda kullanılabilsin.
- Kullanıcının gönderdiği rol bilgisini tek başına yetki kanıtı kabul etme.
- Tüm REST ve MCP araçları aynı sunucu tarafı authorization kurallarına uysun.
- Prompt injection girişimlerinde LLM'e verilen kullanıcı içeriğini güvenilmeyen veri olarak işle.
- İzinli intent, route ve araç isimlerini allowlist ile doğrula.
- Mock veri kullan; gerçek çalışan, müşteri veya kurum içi hassas veriler kullanma.

#### E. Skill Intelligence

- Tamamlanan görevler ve eğitimlerden yetkinlik etiketleri çıkar.
- Yetkinlik skorlarını açıklanabilir, deterministik kurallarla hesapla.
- Skorlarla beraber kaynak görevleri, etkinlikleri ve kanıt sayısını göster.
- CV metninden çıkarılan yetkinlikleri doğrulanmış çalışan becerisi olarak sunma.
- Başlangıçta veri yoksa nötr veya düşük güven düzeyi göster.

#### F. Raporlama

- Manager raporu: geciken görevler, SLA riski, iş yükü dağılımı, yedek önerileri.
- Director raporu: SLA uyumu, kritik darboğazlar, yedek kapsama oranı ve eğitim etkisi.
- Finansal ROI yalnızca maliyet ve ölçülebilir kazanç varsa hesaplansın.
- Raporlar aynı mock veri kaynağı üzerinden üretilebilsin.

#### G. Demo ve test garantisi

- Frontend önce backend API'yi kullansın.
- Backend yoksa arayüz açıkça Simulation Mode'a geçsin.
- Saka çalışmadığında backend kural motoruyla devam etsin.
- Offline işlemler otomatik olarak backend'e aktarılmasın.
- Kritik senaryolar için pytest testleri oluştur.
- README içerisinde kurulum, çalıştırma, MCP başlatma ve örnek demo komutlarını ver.
- Backend, Saka ve frontend hata durumları için anlaşılır kullanıcı mesajları üret.

#### H. Kabul testleri

Aşağıdaki senaryolar çalışmalıdır:

- Employee direktör raporu ister → HTTP 403.
- Manager geciken görevleri sorar → Filtrelenmiş görev listesi.
- Manager görev atar → Önce onay kartı, sonra başarılı işlem.
- Kullanıcı onayı iptal eder → Veri değişmez.
- Aynı onay ikinci kez kullanılır → İşlem reddedilir.
- Yedeği olmayan P1 görevi → Kritik bus factor alarmı.
- Kullanıcı CV metni yapıştırır → Yetkinlik etiketleri ve kaynak bilgisi.
- Saka API kapalıdır → Rule Engine cevap üretir.
- Backend kapalıdır → Frontend Simulation Mode çalışır.
- MCP üzerinden görev değiştirilir → Aynı RBAC ve onay kuralları uygulanır.
- Prompt injection ile yetki yükseltme istenir → Yetki aşımı engellenir.
- Chat üzerinden yeni görev oluşturulur → Onaydan sonra listede 3 saniye highlight görülür.

#### I. Çıktı kuralları

- Önce klasör ağacını göster.
- Roadmap çıkart.
