# REVİZE PAKETİ — FAZ 10: ÇOK OYUNCULU YAYIN HAZIRLIĞI
**Tarih:** 2026-08-30 · **Sürüm 2** (ilk sürüm yanlış varsayımla yazılmıştı, aşağıda düzeltme notu)
**Ölçülen sürüm:** canlı yayın (`basketlig.vercel.app`) + `origin/master`
**Yöntem:** Soğuk ziyaretçi hunisi, yükleme profili, kayıt taşınabilirliği, sunucu/çok oyunculu kod taraması

---

## OYUNUN TEMELİ — ÇOK OYUNCULU (kullanıcı tarafından doğrulandı)

Charazay **baştan beri çevrimiçi çok oyunculu** olarak tasarlanmıştır. Bu bir ekleme değil, temeldir.

| Kural | Nasıl |
|---|---|
| Maç zamanı | **Fikstür tarihinde** oynanır — oyuncu istediği anda maç yapamaz |
| Maç başlatma | Saat gelince **otomatik** oynanır |
| Oyuncu orada ise | Canlı izler ve **müdahale eder** (taktik, mola, değişiklik) |
| Oyuncu orada değilse | Maç yine oynanır, sonucu döndüğünde görür |
| Rakipler | **Gerçek oyuncular + botlar** — botlar sahipsiz takımları doldurur |
| Sunucu mimarisi | **Henüz karar verilmedi** — o aşamaya geçilmedi |

> **ÖNEMLİ — bu bir hata değildir:** Maçların şu an art arda oynanabilmesi, canlı maç motorunu test
> edebilmek için **bilerek açık bırakılmış geçici bir kolaylıktır.** Kısıtlama eksikliği olarak
> raporlanmamalı, "düzeltilmesi gereken hata" sayılmamalıdır.

*(Bu belgenin ilk sürümü bu bilgiyi bilmeden yazılmıştı ve maç kısıtlamasının yokluğunu kritik hata
olarak işaretlemişti. O madde geri çekildi.)*

---

## 0. ÖNCE: TEK OYUNCULU TARAF BİTMİŞ DURUMDA

FAZ 1–9 sonunda oyunun **tek oyunculu hali tamamlanmış** sayılır. Ölçülen:

| Ölçüm | Sonuç |
|---|---|
| Giriş ekranı görünme | 669 ms |
| Oyun açılma | 1.918 ms |
| Toplam indirilen | 261 KB (260 KB JS) |
| Öğretici | Açılışta otomatik ✔ |
| Zorluk seçimi | Kurulum ekranında ✔ |
| Kayıt dışa/içe aktarma | Çalışıyor ✔ |
| Konsol hatası | 0 |

Maç motoru, denge, dil, kayıt bütünlüğü, erişilebilirlik — hepsi ölçülüp doğrulandı.
**Bundan sonrası oyunun kalitesi değil, mimarisi.**

---

## A · TEMEL BOŞLUK — ÇOK OYUNCULU ALTYAPI HİÇ YOK

### F10-1. Depoda sunucu, veritabanı ve ağ kodu **sıfır satır**
**TEMEL** · Ölçüm: `js/*.js` + `charazay2.0.html` içinde `supabase|websocket|socket.io|fetch(api)` → **0 eşleşme**

Oyun şu an **tamamen tarayıcıda çalışan, tamamen tek oyunculu** bir uygulama. Rakipler bot, lig
yerel olarak üretiliyor, kayıt `localStorage`'da.

Çok oyunculu + fikstür tarihli bir oyunun ihtiyaç duyduğu ve **bugün hiç var olmayan** parçalar:

| # | Parça | Bugün | Neden şart |
|---|---|---|---|
| 1 | **Sunucu + veritabanı** | yok | Ligler, takımlar, fikstürler, sonuçlar ortak bir yerde tutulmalı |
| 2 | **Hesap sistemi** | yok | Oyuncu kim, hangi takım kimin |
| 3 | **Sunucu tarafı maç simülasyonu** | yok — tarayıcıda | İki oyuncu karşılaşınca sonuç **bir kez** ve **tarafsız** üretilmeli |
| 4 | **Fikstür zamanlayıcısı** | yok | Saat gelince maç **otomatik** oynanmalı — oyuncu çevrimiçi olmasa da |
| 5 | **Karma rakip havuzu** | hepsi bot | Lig gerçek oyuncular + sahipsiz takımlar için botlardan oluşacak |
| 6 | **Hile koruması** | yok | Sonuç tarayıcıda üretildiği sürece değiştirilebilir |
| 7 | **Lig yönetimi** | yerel | Gerçek oyunculardan lig kurma, boş yerleri botla doldurma, terfi/düşme |
| 8 | **Oyuncular arası transfer** | yerel | Piyasa ortak olmalı |
| 9 | **Bildirim** | yok | "Maçın 2 saat sonra — izlemek ister misin?" |
| 10 | **Canlı izleme + müdahale** | yerel | Oyuncu bağlanınca sunucudaki maça katılıp mola/değişiklik yapabilmeli |

**Bunların hiçbiri bugün yapılan işi çöpe atmıyor.** Maç motoru, denge, arayüz, dil, kayıt biçimi
aynen kullanılır. Değişen şey **simülasyonun nerede çalıştığı** ve **durumun nerede durduğu**.

**En kritik mimari karar — 3. madde:** `generateMatchEvents()` şu an tarayıcıda çalışıyor ve sonucu
yerel rastgele sayı üreticisiyle üretiyor. Çok oyunculuda bu mümkün değil:
- İki oyuncunun takımı karşılaşınca sonucu **kim** üretecek?
- Aynı motorun sunucuda (Node.js) çalışması gerekir — iyi haber: motor saf JavaScript, `js/*.js`
  tarayıcıya bağımlı olmayan kısımları **doğrudan Node'da çalıştırılabilir** (nitekim `box-band.js`
  ve `season-loop.js` bunu zaten yapıyor).
- Tarayıcı yalnızca sunucudan gelen **olay listesini oynatır** — sonucu üretmez.

Bu ayrım (üretim sunucuda, sunum tarayıcıda) doğru kurulursa hile koruması da bedavaya gelir.

---

### F10-2. Test kolaylığı bayrak arkasına alınmalı
**YÜKSEK**

Maçların art arda oynanabilmesi **bilinçli bir test kolaylığı** — ama şu an **varsayılan davranış**.
Yayına çıkarken unutulursa oyunun temel kuralı devre dışı kalır.

**Düzeltme:** Kısıtlamayı atlayan yol açık bir bayrağın arkasına alınsın:
```js
const TEST_MODU = new URLSearchParams(location.search).has('test');
// fikstür tarihi kontrolü:
if(!TEST_MODU && Date.now() < match.scheduledAt){ showNotif('Maç saati henüz gelmedi.'); return; }
```
Böylece `?test=1` ile geliştirme sürerken, normal ziyaretçi gerçek kuralı görür.

**Kabul kriteri:** `?test=1` olmadan fikstür tarihi gelmemiş maç başlatılamıyor; `tools/season-loop.js`
ve diğer araçlar bayrağı kullanarak çalışmaya devam ediyor.

---

### F10-3. `PLAN-BULUT-KAYIT.md` yalnızca **yedekleme** planlıyor — çok oyunculu için yetmez
**YÜKSEK**

Depodaki plan iyi yazılmış ve doğru teknolojiyi seçmiş (Supabase, anonim giriş, offline-first).
Ama kapsamı **"kaydımı buluta yedekle"** — yani tek oyunculu bir güvenlik ağı.

Çok oyunculuda veritabanı yedek değil, **tek gerçek kaynak** olur. Farkı:

| | Bulut yedek (plandaki) | Çok oyunculu (gereken) |
|---|---|---|
| Gerçek kaynak | localStorage | **Sunucu** |
| Tablo | `saves(user_id, payload jsonb)` | `users · teams · players · leagues · fixtures · results · transfers` |
| Yazma | 30 sn debounce | Her işlem doğrulanarak |
| Çakışma | Kullanıcıya sor | Sunucu karar verir |
| Offline | Tam oynanır | Sadece görüntülenir |

**Düzeltme:** Planı çok oyunculu şemaya genişlet. Supabase seçimi hâlâ doğru — Postgres + RLS +
Realtime + Edge Functions (fikstür zamanlayıcısı için) bu iş için yeterli ve ücretsiz katmanı
başlangıç ölçeğini karşılar.

---

## B · YÜKSEK — HER İKİ MİMARİDE DE GEREKLİ

Bunlar çok oyunculu olsun olmasın gerekli; şimdiden yapılabilir.

### F10-4. Analitik yok — hiçbir şey ölçülemiyor
**YÜKSEK** · Ölçüm: `gtag/GA/Plausible/Umami/PostHog` → hiçbiri yok

Kaç kişi oynuyor, ilk 60 saniyede kaçı bırakıyor, ertesi gün kaçı dönüyor — bilinmiyor.
Reklam ve kozmetik geliri optimizasyon işidir; ölçemezsen optimize edemezsin.

**Düzeltme:** Çerezsiz, hafif analitik (Plausible/Umami — KVKK açısından da temiz). İzlenecek olaylar:
`oyun_acildi · takim_kuruldu · ogretici_atlandi · ilk_mac_bitti · gun2_donus · magaza_acildi · reklam_izlendi`

### F10-5. Paylaşım ve arama görünürlüğü sıfır
**YÜKSEK** · Ölçüm: `og etiketi: 0` · `meta description: yok`

WhatsApp'ta ya da Twitter'da link paylaşılınca **çıplak link** görünüyor — görsel, başlık, açıklama yok.
Çok oyunculu bir oyunda davet en güçlü büyüme kanalıdır ve şu an kapalı.

**Düzeltme:** `og:title`, `og:description`, `og:image` (1200×630), `twitter:card`, `meta description`.
Ayrıca oyun içine **"Ligime davet et"** ve **"Sonucu paylaş"** butonları — çok oyunculuda bunlar
kozmetik değil, doğrudan oyuncu kazanım aracı.

### F10-6. Öğretici modalinde karışık dil
**ORTA** · İngilizce oturumda: gövde *"Welcome, Manager!"* (EN), butonlar **`Sonraki →`** ve **`Atla`** (TR).

Yeni oyuncunun gördüğü **ilk ekran**. Tek satırlık iş.

**Düzeltme:** `i18n-dict.js`'e ekle (`'Sonraki →':'Next →'`, `'Atla':'Skip'`); öğretici metinlerinin
`localizeCatalogs()` kapsamında olup olmadığını kontrol et — FAZ 8'deki emoji sorununun aynı sınıfı olabilir.

### F10-7. Service worker / PWA yok
**ORTA** · Her açılışta 261 KB ağdan iniyor; telefona "uygulama gibi" eklenemiyor.

**Düzeltme:** Önbellek-öncelikli service worker + `manifest.json`. Çok oyunculuda ayrıca değerli:
uygulama olarak eklenen oyuncuya **maç bildirimi** gönderilebilir.

---

## C · SONRAYA — PARA KAZANMA

Bunlar **A grubu bitmeden anlamsız**; hesap ve sunucu olmadan ne kozmetik satılabilir ne abonelik.

### F10-8. Reklam SDK soyutlama katmanı
Portallar kendi SDK'sını ister. Çağrıları tek katman arkasına al:
`Ads.rewarded(odul => …)` · `Ads.interstitial()`.
**Canlı maç sırasında asla reklam gösterme** — o akış oyunun kalbi.
Fikstür tarihli oyunda doğal duraklar zaten var: maç öncesi, devre arası, sezon sonu.

### F10-9. Mağaza ve kozmetik envanteri
Satılabilecek her şey sistemlerde zaten duruyor: kulüp logosu, forma, arena görseli/adı, menajer
avatarı, spiker paketi. Eksik olan **sahiplik kaydı** ve mağaza ekranı.
Ödeme entegrasyonundan önce "ödüllü reklam izleyerek aç" ile test edilebilir.

### F10-10. Destekçi (abonelik) katmanı
Türünün iki büyük oyunu da abonelikle ayakta — Hattrick ~€1,5/ay. Reklamdan öngörülebilir gelir.
Rekabete dokunmayan ayrıcalıklar: derin istatistik, sezon arşivi, reklamsız oyun, kulüp özelleştirme.

---

## ÖNCELİK SIRASI

| Sıra | Madde | Gerekçe |
|---|---|---|
| **1** | **F10-1** — çok oyunculu mimari kararı | Diğer her şey buna bağlı; özellikle *simülasyon nerede çalışacak* |
| 2 | F10-3 — bulut planını çok oyunculu şemaya genişlet | Mimarinin yazılı hali |
| 3 | F10-2 — test bayrağı | Küçük iş, yayında unutulma riskini kapatır |
| 4 | F10-4 — analitik | Mimariden bağımsız, hemen yapılabilir |
| 5 | F10-6 — öğretici dili | Tek satır |
| 6 | F10-5 — og etiketleri + davet | Yarım gün, büyüme kanalı açar |
| 7 | F10-7 — service worker / PWA | Bildirim altyapısının ön koşulu |
| 8 | F10-8, F10-9, F10-10 | Sunucu ayağa kalktıktan sonra |

---

## KAPSAM UYARISI — DÜRÜST DEĞERLENDİRME

FAZ 1–9 boyunca yapılan iş **tek oyunculu bir oyunu doğru çalıştırmakla** ilgiliydi ve bitti.

A grubu (çok oyunculu altyapı) **aynı büyüklükte ikinci bir proje.** Sunucu, veritabanı, hesap,
zamanlayıcı, sunucu tarafı simülasyon, hile koruması, lig yönetimi — bunlar birkaç günlük iş değil.

Bunu söylüyorum ki takvimi buna göre kurasın: **bugünkü hızla bir hafta sonra "oyun bitti" olmaz.**
Tek oyunculu sürüm bitti; çok oyunculu sürüm henüz başlamadı.

**İyi haber üç tane:**
1. Maç motoru **saf JavaScript** — `box-band.js` ve `season-loop.js` onu zaten Node'da çalıştırıyor.
   Sunucu tarafı simülasyona geçiş sanıldığı kadar zor değil.
2. M20 (rakip kadro kalıcılığı) tam da bu yolun altyapısıydı — rakipler artık kalıcı nesneler.
3. `serializeGameState` / `applyGameState` veri sözleşmesi hazır ve migrasyonlu.

**Ara yol önerisi:** Tek oyunculu sürümü **şimdi yayınla** (analitik + og etiketleri + öğretici dili
düzeltmesiyle — 1-2 günlük iş). Gerçek oyuncudan gerçek veri toplarken çok oyunculu altyapıyı
arkada kur. Böylece hem tutunma rakamlarını öğrenirsin, hem çok oyunculuya kör gitmezsin.
