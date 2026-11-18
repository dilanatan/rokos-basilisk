import { db, migrate, resetDb, run, get } from './db.js';

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const ts = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

export function seed({ reset = false } = {}) {
  if (reset) resetDb();
  else migrate();
  if (get('SELECT COUNT(*) AS c FROM users').c > 0) return false;

  db.exec('BEGIN');
  // --- Kullanıcılar ---
  const users = [
    [1, 'Zeynep Kaya', 'zeynep@cyberops.local', 'director', 'Yönetim', 'Siber Güvenlik Direktörü', null],
    [2, 'Mehmet Demir', 'mehmet@cyberops.local', 'manager', 'SOC', 'SOC Takım Lideri', 1],
    [3, 'Elif Şahin', 'elif@cyberops.local', 'manager', 'Ofansif Güvenlik', 'Ofansif Güvenlik Yöneticisi', 1],
    [4, 'Ayşe Yılmaz', 'ayse@cyberops.local', 'employee', 'SOC', 'SOC Analisti (L1)', 2],
    [5, 'Can Öztürk', 'can@cyberops.local', 'employee', 'SOC', 'SOC Analisti (L2)', 2],
    [6, 'Selin Aydın', 'selin@cyberops.local', 'employee', 'SOC', 'Olay Müdahale Uzmanı', 2],
    [7, 'Burak Arslan', 'burak@cyberops.local', 'employee', 'Ofansif Güvenlik', 'Sızma Testi Uzmanı', 3],
    [8, 'Deniz Koç', 'deniz@cyberops.local', 'employee', 'Ofansif Güvenlik', 'Zafiyet Yönetimi Uzmanı', 3],
  ];
  for (const u of users) run('INSERT INTO users (id,name,email,role,team,title,manager_id) VALUES (?,?,?,?,?,?,?)', ...u);

  // --- Görevler: [title, desc, type, category, priority, status, assignee, backup, creator, dueOffset, recurrence, createdOffset]
  const tasks = [
    ['SIEM alarm triyajı - sabah vardiyası', 'Gece biriken yüksek öncelikli SIEM alarmlarını incele, false-positive olanları kapat.', 'daily', 'SOC', 'high', 'in_progress', 4, 5, 2, 0, 'daily', -10],
    ['EDR ajan sağlık kontrolü', 'Raporlamayan EDR ajanlarını tespit et ve IT ekibine ticket aç.', 'daily', 'SOC', 'medium', 'todo', 5, 4, 2, 0, 'daily', -10],
    ['Phishing ihbar kutusunun incelenmesi', 'Kullanıcıların bildirdiği şüpheli e-postaları analiz et, IOC çıkar.', 'daily', 'SOC', 'medium', 'todo', 4, 6, 2, 0, 'daily', -8],
    ['Vardiya devir raporu', 'Açık olayları ve takip gerektiren alarmları devir notuna ekle.', 'daily', 'SOC', 'low', 'done', 6, 4, 2, 0, 'daily', -9],
    ['Fidye yazılımı şüphesi - Finans sunucusu', 'FIN-SRV-04 üzerinde toplu dosya uzantısı değişikliği alarmı. İzolasyon ve imaj alma.', 'incident', 'Olay Müdahale', 'critical', 'in_progress', 6, 5, 2, 0, 'none', -1],
    ['Brute-force saldırısı - VPN gateway', 'Tek IP bloğundan 3000+ başarısız giriş denemesi. Engelleme kuralı ve analiz.', 'incident', 'Olay Müdahale', 'high', 'review', 5, 6, 2, -1, 'none', -2],
    ['Haftalık zafiyet taraması', 'DMZ ve iç ağ segmentlerinde kimlik doğrulamalı tarama çalıştır, raporu paylaş.', 'daily', 'Zafiyet Yönetimi', 'high', 'todo', 8, 7, 3, 1, 'weekly', -6],
    ['Kritik OpenSSL zafiyeti yama takibi', 'Etkilenen 42 sunucunun yama durumunu sistem ekipleriyle takip et.', 'project', 'Zafiyet Yönetimi', 'critical', 'in_progress', 8, 7, 3, -2, 'none', -7],
    ['Mobil bankacılık uygulaması sızma testi', 'OWASP MASVS kapsamında Android & iOS testleri.', 'project', 'Sızma Testi', 'high', 'in_progress', 7, 8, 3, 5, 'none', -5],
    ['İnternet bankacılığı web pentest raporu', 'Bulguları risk skorlarıyla raporla, yönetici özeti hazırla.', 'project', 'Sızma Testi', 'high', 'review', 7, null, 3, 2, 'none', -12],
    ['Red team senaryo planlaması - Q4', 'Assumed-breach senaryosu ve kapsam dokümanı.', 'project', 'Sızma Testi', 'medium', 'todo', 7, 8, 3, 10, 'none', -3],
    ['Firewall kural seti gözden geçirme', 'Kullanılmayan ve "any-any" kuralları tespit et.', 'project', 'Ağ Güvenliği', 'medium', 'todo', 5, null, 2, -3, 'none', -15],
    ['Yedek: Gece vardiyası SIEM izleme', 'Ayşe izindeyken gece vardiyası alarm takibi yedek görevi.', 'backup', 'SOC', 'medium', 'todo', 5, 4, 2, 2, 'none', -1],
    ['Yedek: Zafiyet tarama sorumluluğu', 'Deniz eğitimdeyken haftalık tarama yedek sorumlusu.', 'backup', 'Zafiyet Yönetimi', 'medium', 'todo', 7, 8, 3, 7, 'none', -1],
    ['Yedek: Olay müdahale nöbeti (hafta sonu)', 'Hafta sonu on-call yedek nöbetçi.', 'backup', 'Olay Müdahale', 'high', 'todo', 4, 6, 2, 3, 'none', -2],
    ['ISO 27001 iç denetim kanıt toplama', 'A.8 ve A.12 kontrolleri için kanıtları denetim klasörüne yükle.', 'project', 'GRC', 'medium', 'in_progress', 6, null, 1, 6, 'none', -9],
    ['KVKK veri envanteri güncellemesi', 'Yeni sistemlerin kişisel veri işleme kayıtlarını güncelle.', 'project', 'GRC', 'low', 'todo', 4, null, 1, 14, 'none', -4],
    ['Threat intel bülteni hazırlama', 'Sektörü hedefleyen güncel kampanyalar için haftalık bülten.', 'daily', 'Tehdit İstihbaratı', 'medium', 'done', 5, 6, 2, -1, 'weekly', -8],
    ['Active Directory yetki gözden geçirme', 'Domain Admin grubundaki hesapları doğrula.', 'project', 'Kimlik Yönetimi', 'high', 'todo', 6, 5, 2, -1, 'none', -6],
    ['Bulut güvenlik duruşu taraması (CSPM)', 'Azure aboneliklerinde public storage ve açık portları raporla.', 'project', 'Bulut Güvenliği', 'high', 'done', 8, 7, 3, -4, 'none', -14],
    ['Phishing simülasyonu kampanyası', 'Tüm çalışanlara yönelik farkındalık simülasyonu ve sonuç raporu.', 'project', 'Farkındalık', 'medium', 'done', 4, 5, 2, -5, 'none', -20],
    ['WAF log analizi', 'SQLi ve XSS bloklarının trend analizi.', 'daily', 'Ağ Güvenliği', 'low', 'done', 5, null, 2, -2, 'none', -6],
    ['Pentest bulgularının yeniden testi', 'Kapatıldığı bildirilen 12 bulgunun doğrulama testi.', 'project', 'Sızma Testi', 'medium', 'done', 7, 8, 3, -3, 'none', -11],
    ['DLP politika ince ayarı', 'False-positive oranı yüksek DLP kurallarını gözden geçir.', 'project', 'Veri Güvenliği', 'medium', 'todo', 6, 4, 2, 4, 'none', -2],
  ];
  for (const t of tasks) {
    const [title, desc, type, category, priority, status, a, b, c, due, rec, created] = t;
    const createdAt = ts(created);
    const completedAt = status === 'done' ? ts(Math.min(0, due)) : null;
    run(
      `INSERT INTO tasks (title,description,type,category,priority,status,assignee_id,backup_assignee_id,created_by,due_date,recurrence,created_at,updated_at,completed_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      title, desc, type, category, priority, status, a, b, c, day(due), rec, createdAt, createdAt, completedAt,
    );
  }
  run("INSERT INTO task_comments (task_id,user_id,body,created_at) VALUES (5,6,'Sunucu ağdan izole edildi, bellek imajı alınıyor.',?)", ts(0));
  run("INSERT INTO task_comments (task_id,user_id,body,created_at) VALUES (5,2,'Finans birimine bilgi verildi, yedekler kontrol ediliyor.',?)", ts(0));
  run("INSERT INTO task_comments (task_id,user_id,body,created_at) VALUES (8,8,'42 sunucudan 29 tanesi yamalandı.',?)", ts(-1));

  // --- Etkinlikler ---
  const events = [
    ['İstanbul Siber Güvenlik Zirvesi', 'conference', 'corporate', day(12), day(13), 'İstanbul Kongre Merkezi', 'Kurumsal stand ve iki konuşma ile katılım.', 1],
    ['Kurumsal CTF Yarışması', 'ctf', 'corporate', day(5), day(5), 'Online', 'Takım bazlı Jeopardy CTF. Kurum adına 2 takım.', 3],
    ['SANS Incident Response Eğitimi', 'training', 'individual', day(20), day(25), 'Online', 'Olay müdahale ve dijital adli bilişim eğitimi.', 2],
    ['OSCP Sınavı', 'exam', 'individual', day(9), day(9), 'Online', 'Burak - OSCP sertifika sınavı.', 3],
    ['OWASP İstanbul Meetup', 'meetup', 'individual', day(3), day(3), 'Maslak', 'API güvenliği konulu topluluk buluşması.', 3],
    ['Çalışan Phishing Farkındalık Webinarı', 'webinar', 'corporate', day(-6), day(-6), 'Teams', 'Tüm şirkete yönelik farkındalık oturumu.', 2],
    ['Bulut Güvenliği Çalıştayı', 'training', 'corporate', day(-15), day(-14), 'Genel Müdürlük', 'Azure güvenlik mimarisi iç eğitimi.', 1],
  ];
  for (const e of events) run('INSERT INTO events (title,type,participation,start_date,end_date,location,description,created_by) VALUES (?,?,?,?,?,?,?,?)', ...e);
  const parts = [
    [1, 1, 'speaker', 'registered'], [1, 2, 'attendee', 'registered'], [1, 3, 'speaker', 'registered'], [1, 7, 'attendee', 'registered'],
    [2, 7, 'attendee', 'registered'], [2, 8, 'attendee', 'registered'], [2, 5, 'attendee', 'registered'], [2, 4, 'attendee', 'registered'],
    [3, 6, 'attendee', 'registered'], [4, 7, 'attendee', 'registered'], [5, 8, 'attendee', 'registered'],
    [6, 2, 'organizer', 'attended'], [6, 4, 'speaker', 'attended'], [7, 5, 'attendee', 'attended'], [7, 8, 'attendee', 'attended'], [7, 3, 'attendee', 'attended'],
  ];
  for (const p of parts) run('INSERT INTO event_participants (event_id,user_id,role,status) VALUES (?,?,?,?)', ...p);

  // --- Yetkinlikler ---
  const skills = {
    2: [['SIEM (Splunk)', 'SOC', 5], ['Olay Müdahale', 'DFIR', 4], ['Takım Yönetimi', 'Liderlik', 4]],
    3: [['Web Pentest', 'Ofansif', 5], ['Red Team', 'Ofansif', 4], ['Takım Yönetimi', 'Liderlik', 4]],
    4: [['SIEM (Splunk)', 'SOC', 3], ['Phishing Analizi', 'SOC', 4], ['Python', 'Programlama', 2]],
    5: [['SIEM (Splunk)', 'SOC', 4], ['EDR', 'SOC', 4], ['Ağ Trafik Analizi', 'Ağ Güvenliği', 3], ['Threat Intel', 'CTI', 3]],
    6: [['Olay Müdahale', 'DFIR', 4], ['Dijital Adli Bilişim', 'DFIR', 4], ['Malware Analizi', 'DFIR', 3], ['ISO 27001', 'GRC', 3]],
    7: [['Web Pentest', 'Ofansif', 4], ['Mobil Pentest', 'Ofansif', 4], ['Active Directory Saldırıları', 'Ofansif', 3], ['Python', 'Programlama', 4]],
    8: [['Zafiyet Yönetimi', 'Zafiyet', 5], ['Bulut Güvenliği (Azure)', 'Bulut', 4], ['Nessus', 'Zafiyet', 5]],
    1: [['Risk Yönetimi', 'GRC', 5], ['Güvenlik Stratejisi', 'Liderlik', 5]],
  };
  for (const [uid, list] of Object.entries(skills)) for (const [n, c, l] of list) run('INSERT INTO skills (user_id,name,category,level) VALUES (?,?,?,?)', Number(uid), n, c, l);
  const certs = [
    [1, 'CISSP', 'ISC2', day(-900), day(200)], [2, 'GCIH', 'GIAC', day(-500), day(230)], [3, 'OSCP', 'OffSec', day(-1200), null],
    [3, 'OSCE3', 'OffSec', day(-300), null], [4, 'Security+', 'CompTIA', day(-200), day(900)], [5, 'CySA+', 'CompTIA', day(-400), day(25)],
    [6, 'GCFA', 'GIAC', day(-600), day(130)], [6, 'ISO 27001 Lead Auditor', 'PECB', day(-100), day(1000)], [7, 'eWPTX', 'INE', day(-250), null],
    [8, 'AZ-500', 'Microsoft', day(-330), day(35)],
  ];
  for (const c of certs) run('INSERT INTO certifications (user_id,name,issuer,obtained_at,expires_at) VALUES (?,?,?,?,?)', ...c);

  // --- Duyurular ---
  run("INSERT INTO announcements (title,body,audience,author_id,created_at) VALUES (?,?,?,?,?)",
    'Q4 Güvenlik Hedefleri', 'Q4 için öncelik: kritik zafiyetlerin 15 gün içinde kapatılması ve MTTR < 4 saat.', 'all', 1, ts(-3));
  run("INSERT INTO announcements (title,body,audience,author_id,created_at) VALUES (?,?,?,?,?)",
    'Vardiya Planı Güncellendi', 'Gelecek hafta gece vardiyası rotasyonu güncellendi, yedek görevlerinizi kontrol edin.', 'SOC', 2, ts(-1));

  // --- Bildirimler ---
  const notes = [
    [4, 'task_assigned', 'Yeni görev atandı', 'Yedek: Olay müdahale nöbeti (hafta sonu)', '/tasks?highlight=15'],
    [6, 'task_assigned', 'Kritik olay atandı', 'Fidye yazılımı şüphesi - Finans sunucusu', '/tasks?highlight=5'],
    [2, 'task_review', 'İncelemeye gönderildi', 'Brute-force saldırısı - VPN gateway', '/tasks?highlight=6'],
    [3, 'task_review', 'İncelemeye gönderildi', 'İnternet bankacılığı web pentest raporu', '/tasks?highlight=10'],
    [5, 'cert_expiry', 'Sertifika süresi doluyor', 'CySA+ sertifikanızın süresi 25 gün içinde doluyor.', '/competencies'],
    [7, 'event', 'Etkinlik hatırlatması', 'OSCP Sınavı 9 gün sonra.', '/events'],
    [1, 'report', 'Haftalık rapor hazır', 'Siber güvenlik haftalık görev raporu oluşturuldu.', '/reports'],
  ];
  for (const n of notes) run('INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)', ...n);
  db.exec('COMMIT');
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seed({ reset: process.argv.includes('--reset') });
  console.log('Seed tamamlandı.');
}
