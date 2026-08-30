# KARAR — SUNUCU TEKNOLOJİSİ

**Tarih:** 2026-08-30 · **Durum:** karar verildi, **hayata geçirilmedi** (kod yazılmadı, hesap açılmadı)
**Öncülleri:** `PLAN-COK-OYUNCULU.md`, `PLAN-BULUT-KAYIT.md`, `PLAN-LIG-YAPISI.md`

---

## KARAR ÖZETİ

| Katman | Seçim | Neden |
|---|---|---|
| **Veritabanı + tek gerçek kaynak** | **Supabase (Postgres)** | Zaten biliyorsun; SQL tabanlı, veri modelin (9 tablo) birebir oturuyor |
| **Kimlik / hesap** | **Supabase Auth** | Misafir girişi + sonradan e-posta bağlama hazır geliyor |
| **Yetki (kim neyi görebilir/yazabilir)** | **Row Level Security** | "Sadece kendi takımını yönet" kuralı veritabanının içinde, kod hatasıyla delinemez |
| **Fikstür saatini yakalayan zamanlayıcı** | **pg_cron** (Supabase içinde) | Dakikada bir çalışır, **ücretsiz**, ayrı servis gerekmez |
| **Maç simülasyonu** | **Supabase Edge Function** (başlangıç) | Motor saf JS; sunucuda çalıştırmak için ayrı makine gerekmiyor |
| **Canlı izleme** | **Supabase Realtime** | Maç olayları tabloya yazıldıkça tarayıcıya kendiliğinden düşer |
| **Sitenin kendisi (statik dosyalar)** | **Vercel** (bugünkü hali) | Değişiklik yok |

**Tek cümlelik karar:** Supabase'i seçiyoruz. Sen zaten biliyorsun, ücretsiz katmanı geliştirme
boyunca yetiyor, ve fikstür zamanlayıcısı (pg_cron) için başka hiçbir servise para vermeyeceğiz.

---

## 1. NEDEN SUPABASE — ALTERNATİFLERLE KARŞILAŞTIRMA

| | Supabase | Firebase | Kendi sunucun (VPS + Node) |
|---|---|---|---|
| Sen biliyor musun | **Evet** | Hayır | Hayır |
| Veri modeli | SQL/Postgres — lig tabloların, fikstür, sıralama **doğal SQL işi** | NoSQL — lig sıralaması hesaplamak zahmetli | SQL |
| Aylık maliyet (başlangıç) | **0 ₺** | 0 ₺ | ~5 $ |
| Aylık maliyet (yayında) | 25 $ | Okuma/yazma başına — **öngörülemez** | 5–20 $ |
| Zamanlayıcı | pg_cron dahil | Cloud Scheduler (ayrı, ücretli) | crontab |
| Bakım yükü (güncelleme, güvenlik) | **Yok** | Yok | **Sende** — sunucu çökerse gece 3'te sen kaldıracaksın |
| Hile koruması | RLS ile veritabanı seviyesinde | Kurallar diliyle, daha kırılgan | Elle yazılır |

**Firebase neden değil:** Senin oyunun özü tablo — 18 takım, puan, averaj, sıralama, yükselme
maçları. Bunlar SQL'de tek satır sorgu, NoSQL'de elle bakılan sayaçlar. Ayrıca Firebase okuma
başına para alır; canlı maç izleyen 500 kişi faturayı tahmin edilemez yapar.

**Kendi sunucun neden değil (şimdilik):** Ayda 5 $ ucuz görünüyor ama karşılığında güvenlik
yamaları, yedekleme, izleme ve gece çöken servis senin işin oluyor. Oyunun kendisiyle
uğraşacağın zamanı yiyor. **İleride gerekirse eklenebilir** (aşağıda "B planı").

---

## 2. SENİN TASARIMIN SUPABASE'DE NEYE KARŞILIK GELİYOR

| Senin kuralın | Supabase karşılığı |
|---|---|
| "Bot takım = sahipsiz takım" | `teams.owner_user_id IS NULL` — ayrı bot tablosu yok |
| "Terk edilmiş takım (sahibi var ama girmiyor)" | `owner_user_id` dolu **+** `users.last_seen_at` 45 günden eski |
| "Fikstür saati gelince maç otomatik oynanır" | `fixtures.scheduled_at` + pg_cron her dakika bakar |
| "Oyuncu oradaysa izler ve müdahale eder" | Realtime kanalı + `match_commands` tablosu |
| "21 gün girilmezse / 1.5 ay girilmezse bot devralır" | pg_cron'un günlük "bakım" işi |
| "Ayın 1'inde yeni sezon" | pg_cron: `0 0 1 */2 *` (iki ayda bir, ayın 1'i) |
| "Yeni oyuncu ligden takım seçer" | `teams` üzerinde `owner_user_id IS NULL` filtreli liste |
| "Sezon sonu yükselme/düşme" | Tek SQL fonksiyonu — sıralamayı okur, `league_id`'leri günceller |
| Ülke başına ayrı lig | `leagues(country_code, tier)` — 30–40 ülke aynı şemada |

**Değişmeyen ne var:** Denge tabloları, arayüz, dil katmanı, kayıt biçimi. Maç motoru ise
**değişecek** — nedeni aşağıda 3.0'da, ve bu kararın en önemli maddesi orası.

---

## 3. DÜRÜST UYARILAR — ÖNCEDEN BİLMEN GEREKENLER

### 3.0 ⚠ EN BÜYÜK İŞ: MOTOR "İKİ GERÇEK TAKIM" OYNATAMIYOR

**Bunu bugün ölçtüm, tahmin değil.** İki bulgu:

**Bulgu 1 — Rakibin kadrosu yok, sadece adı var.**
`js/match-prep.js:440`:
```js
function pseudoTeamStrength(isim, tblKey){
  return 58 + (seqFromName(String(isim), tblKey||'tbl') % 4200)/100 + botManagerTitles(isim)*0.4;
}
```
Rakibin gücü **takım adının hash'inden** üretiliyor. Yani bugün maç "senin kadron ↔ bir sayı"
şeklinde oynanıyor. İki gerçek oyuncu karşılaşınca **rakibin gerçek oyuncuları, gerçek
taktikleri ve gerçek formu** hesaba girmek zorunda.

**Bulgu 2 — Motor tek bir küresel `G` durumuna bağlı.**
`generateMatchEvents(rakip, opts)` içeride `G.wins`, `G.team`, `G.tactics`, `matchLineup()`
kullanıyor — yani "o an bu tarayıcıda oturan tek oyuncu" varsayımıyla yazılmış. Sunucu aynı
anda 800 maç oynatacaksa tek bir `G` olamaz.

**Gereken dönüşüm** (sunucu kodu yazılmadan önce, tamamen yerel bir iş):
```js
// bugün:   generateMatchEvents(rakip, opts)            → G'ye bağımlı, rakip = isim
// hedef:   simulateMatch({ homeRoster, awayRoster,
//                          homeTactics, awayTactics,
//                          seed })                      → saf fonksiyon, G yok
```
Yani motorun içindeki her `G.x` okuması parametreye çevrilecek ve rakip tarafı da senin
tarafınla **aynı kodu** kullanacak. Bu, sunucudan bağımsız bir yeniden düzenleme (refactor) —
Supabase seçilmese bile yapılması gerekirdi.

**İyi haber:** Motor tarayıcıya bağımlı değil. 12 dosyanın tamamını sahte bir `window` nesnesiyle
saf Node'da yükledim, **hiçbiri hata vermedi**; `genRoster(12)` çağrısı 15 kişilik kadro üretti.
Yalnız `js/main.js` (arayüz bağlantıları) yüklenmiyor — o zaten sunucuya gitmeyecek.
`js/match-engine.js`'teki `document` kullanımlarının hepsi **çizim** fonksiyonlarında; simülasyon
mantığında değil. Yani ayrıştırma temiz bir sınırdan geçiyor.

> **Düzeltme notu:** `PLAN-COK-OYUNCULU.md` "motor zaten Node'da çalışıyor, `tools/box-band.js`
> onu Node'da koşturuyor" diyor. **Bu yanlış** — `box-band.js` Playwright ile başsız bir
> *tarayıcı* açıyor, saf Node değil. Sonuç yine de olumlu (yukarıdaki testim gösterdi) ama
> gerekçe düzeltilmeli.

### 3.1 Ücretsiz katman yayına uygun değil (geliştirmeye uygun)
Ücretsiz projeler **1 hafta kullanılmazsa duraklatılıyor.** Geliştirme sırasında sorun değil;
oyun yayına girdiği gün **Pro (25 $/ay)** gerekir. Bu, kararı değiştirmiyor — sadece takvimi.

### 3.2 Edge Function'lar Deno çalıştırır, Node değil
3.0'daki ayrıştırma yapıldıktan sonra motor Deno'da da Node'da da çalışır (saf JavaScript,
tarayıcıya bağımlı değil). Yapılacak tek ek iş dosyaları `export` haline getirmek.

Sınırlar: istek başına **2 saniye CPU**, ücretsizde 150 sn / Pro'da 400 sn toplam süre, 256 MB
bellek. Tek maç simülasyonu bunun çok altında; **maç günü 800 maçı tek çağrıda oynatmaya
kalkma** — kuyruk (Supabase Queues) ile parti parti işle.

### 3.3 En kritik tasarım noktası: canlı müdahale, maçın tek seferde simüle edilmesini engeller
Sunucu maçı kickoff'ta baştan sona tek seferde hesaplarsa, oyuncunun 3. periyotta mola alması
**imkânsız** olur — sonuç zaten yazılmıştır.

Çözüm: maçı **çeyrek çeyrek (veya 2 dakikalık bloklar halinde) simüle et.** Her blok arasında
sunucu `match_commands` tablosuna bakar, oyuncunun verdiği komutu (mola, değişiklik, taktik)
uygular, sonraki bloğu hesaplar. Blok arası bekleme, canlı izleyene gerçek zamanlı akış hissi
verir; izlemeyen için maç yine kendiliğinden biter.

**Bu, sunucu tarafını yazmadan önce netleştirilmesi gereken tek büyük karardır.** Ne kadar sık
blok = ne kadar sık müdahale, ama o kadar çok sunucu çağrısı.

### 3.4 Veritabanı boyutu — olay kayıtlarını biriktirme
Kabaca hesap: 30 ülke × 3 lig × 18 takım = ~1.600 takım, ~29.000 oyuncu (≈30 MB, sorun yok).
Ama sezon başına ~14.000 maç var; her maçın tam olay dökümünü (~10 KB) saklarsan **sezon başına
~140 MB.** Ücretsiz katmanın 500 MB'ı 3 sezonda dolar.

**Kural:** Veritabanında yalnız **skor + box score özeti** dursun. Tam olay dökümü ya hiç
saklanmasın (tohum/seed'den yeniden üretilebilir) ya da Storage'a sıkıştırılıp atılsın ve
1 sezon sonra silinsin.

### 3.5 Vercel'in ücretsiz katmanı ticari kullanıma kapalı
Oyuna reklam koyduğun an proje "ticari" olur ve Vercel **Pro (20 $/ay)** ister. Bu Supabase
kararından bağımsız, ama bütçeyi planlarken bilmen gerekiyor.

> Not: Fikstür zamanlayıcısını **Vercel Cron ile yapmıyoruz** — ücretsiz katmanda günde yalnız
> 1 kez çalışabiliyor, üstelik ±59 dakika sapmayla. pg_cron ücretsiz ve dakika hassasiyetinde.

---

## 4. B PLANI — GEREKİRSE (şimdi yapılmayacak)

Edge Function (Deno) maç motoru için sıkıntı çıkarırsa **veritabanı kararı değişmez.** Sadece
simülasyonu çalıştıran yer değişir:

- **Vercel Node fonksiyonu** — pg_cron, Supabase yerine Vercel'deki bir adrese istek atar.
  Motor Node'da **hiç değiştirilmeden** çalışır.
- **Küçük VPS (Hetzner ~5 $/ay)** — sürekli açık bir Node işçisi. Çeyrek bazlı canlı simülasyon
  için en rahat seçenek, ama bakım yükü sende.

Her iki durumda da tablolar, Auth ve Realtime aynı kalır. **Yani bugünkü karar geri dönülemez
bir bağ yaratmıyor.**

---

## 5. MALİYET TAKVİMİ

| Aşama | Supabase | Vercel | Toplam / ay |
|---|---|---|---|
| Geliştirme (bugün → yayın) | Ücretsiz | Ücretsiz (Hobby) | **0 ₺** |
| Yayın, reklamsız test | Pro 25 $ | Ücretsiz | **~25 $** |
| Reklamlı yayın | Pro 25 $ | Pro 20 $ | **~45 $** |
| 10.000+ aktif oyuncu | 25 $ + kullanım | 20 $ + kullanım | ~60–100 $ |

Ücretsiz katman sınırları (referans): 500 MB veritabanı, 50.000 aylık aktif kullanıcı,
5 GB veri trafiği, 2 aktif proje, 1 hafta işlemsizlikte duraklatma, yedek yok.

---

## 6. SIRADAKİ ADIM (henüz başlanmadı)

1. **Motoru `G`'den ayır ve iki gerçek kadro alacak hale getir** (madde 3.0) — **en büyük ve
   en öncelikli iş.** Sunucudan bağımsız, tamamen yerel. Kabul kriteri: `simulateMatch()` saf
   fonksiyon olarak Node'dan çağrılabiliyor ve aynı tohumla hep aynı sonucu veriyor.
2. **Veri modelini SQL'e dök** — `PLAN-LIG-YAPISI.md` 8. bölümdeki 9 tabloyu gerçek
   `CREATE TABLE` ifadelerine çevir. Hesap açmadan, dosya olarak. (`db/schema.sql`)
3. **Çeyrek bazlı simülasyon kararını ver** (madde 3.3) — kaç blok, blok arası kaç saniye.
4. Ancak bundan sonra Supabase projesi açılır.

**1, 2 ve 3 hiçbir hesap, hiçbir ödeme gerektirmez** — üçü de yerel dosya işi. Sunucuyu almadan
önce yapılacak iş, sunucudan sonra yapılacak işten daha fazla.

---

**Kaynaklar:** Supabase Edge Function limitleri ve fiyatlandırma sayfaları, Vercel Cron
kullanım sayfası — 30 Ağustos 2026 tarihinde kontrol edildi.
