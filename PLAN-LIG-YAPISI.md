# PLAN — LİG YAPISI VE OYUNCU YERLEŞTİRME
**Tarih:** 2026-08-30 · **Durum:** kullanıcı kararlarıyla netleşti · **Kod değişikliği yapılmadı**
**Kapsam:** Çok oyunculu lig mimarisinin veri modeli ve kuralları. Sunucu teknolojisi seçimi bu belgenin dışında.

> Bu belge `CLAUDE.md`'deki "Proje temeli — ÇOK OYUNCULU" bölümünün ayrıntısıdır.
> Sunucu tarafı yazılırken şema ve kurallar buradan alınır.

---

## 1. TEMEL YAPI

| Kural | Karar |
|---|---|
| Her ülkenin kendi ligi | **Evet** — oyuncu kendi ülkesinin liginde oynar |
| **Lig büyüklüğü** | **18 takım** (her lig için) |
| **Sezon uzunluğu** | **2 ay** — tek ayın 1'inde başlar (1 Ocak, 1 Mart, 1 Mayıs…) |
| Lig maçı sayısı | **17** (tek devre) |
| Açılışta ülke sayısı | **30–40** |
| Boş yerler | **Bot takımlar** doldurur |
| Ülke liginde çoğunlukla bota karşı oynamak | **Kabul edilir ve beklenir** — normal akış budur |
| Ülkeler arası oyun | Ayrı **uluslararası etkinlikler** katmanında |
| Sezon takvimi | **Tüm ülkelerde ortak** |
| **Playoff** | **YOK** — şampiyon lig birincisidir |

**Gerçekçilik dayanağı:** Türkiye BSL 16 takım, İspanya ACB 18, İtalya LBA 16, EuroLeague 18.
18 takım gerçek lig büyüklüğü bandındadır.

**Neden 2 ay:** Gerçek ligler 16-18 takımla 30+ maçı 8 aya yayar. Aylık sezonda 18 takım
sığmıyordu (17 lig maçı, ayda sadece 12 maç yuvası var). 2 aylık sezon hem gerçek lig
büyüklüğünü hem de kupa/uluslararası/milli takım takvimini kurtarıyor.

---

## 2. MAÇ TAKVİMİ

### Haftalık ritim

| Gün | Ne olur |
|---|---|
| Pazartesi | dinlenme |
| **Salı** | **Lig maçı** |
| Çarşamba | dinlenme |
| **Perşembe** | **Kupa / uluslararası / hazırlık / milli takım** |
| Cuma | dinlenme |
| **Cumartesi** | **Lig maçı** |
| Pazar | dinlenme |

Haftada **3 maç**, her maç arası en az 1 tam gün. Enerji ve sakatlık sistemi inandırıcı çalışır.
Bazı haftalarda Perşembe de lig maçı olur (17 maçı 7 haftaya sığdırmak için).

### Sezon takvimi (2 ay ≈ 59–62 gün)

```
Gün  1 – 49    17 lig maçı (haftada 2-3) + Perşembe kupa/uluslararası maçları
Gün 50 – 54    Yükselme ve düşme maçları
Gün 55 – 58    Bot düzeltmesi + draft + sezon geçişi
Gün 59 – 62    Pay (ayların uzunluğuna göre değişir)
Gün  1         Yeni sezon
```

**Fikstür üreticisi ay uzunluklarını okuyup boşluğu dağıtır** — uzun aylarda maç araları açılır,
kısa aylarda sıkışır. Sezon her zaman tek ayın 1'inde başlar, kural hiç bozulmaz.

---

## 3. YENİ OYUNCU YERLEŞTİRME

### Kural

> Yeni oyuncu, **boş bot takımı olan en üst ligdeki** bir bot takımı devralır.

- Yeni takım **eklenmez** — lig her zaman 18 takım kalır, fikstür hiç bozulmaz
- Devralınan kadro **olduğu gibi kalır** — oyuncu reytingleri, kadro, sözleşmeler değişmez
- Şans eseri biraz güçlü ya da biraz zayıf takım devralmak **kabul edilir**
- Devralınabilir bot takımlar bittiğinde **altına yeni lig açılır** (18 takım, hepsi bot)
- Yeni lig açılınca **kimse yerinden oynatılmaz**

### Takım seçimi

> Oyuncuya o ligdeki **devralınabilir takımlar gösterilir**, birkaç bilgisiyle (kulüp adı, şehir,
> kadro ortalaması, arena) — **oyuncu istediğini seçer.**

Rastgele atama yok. "Benim kulübüm" duygusu ilk dakikada kurulur ve şans payı oyuncunun kendi
kararı hâline gelir.

### Bot takım üretim bandı

| Ölçü | Değer |
|---|---|
| Takım ortalama OVR bandı | **68 – 74** |
| En güçlü / en zayıf bot farkı | **≤ 6 OVR** |
| Kadro mevcudu | 15 oyuncu |
| Mevki dağılımı | Her mevkiden en az 2 oyuncu |
| Başlangıç kasası | Tüm bot takımlarda **eşit** |
| Arena | Tüm bot takımlarda **seviye 1** |

---

## 4. BOT TAKIMLAR GELİŞİR (karara bağlandı)

Bot takımlar **sabit kalmaz** — inandırıcılık için ve botlarla oynayan oyuncu sıkılmasın diye
her sezon gelişir. Ama aktif oyuncudan **yavaş**.

| | Sezonluk gelişim |
|---|---|
| Aktif insan takımı | **+1,27 OVR** (FAZ 9'da ölçüldü) |
| **Bot takım** | **+0,6 – 0,8 OVR** (yaklaşık yarısı) |

**Bot her sezon ne yapar:**

| İş | Nasıl |
|---|---|
| Yaşlanma | İnsan takımlarıyla **aynı** kurallar |
| Antrenman | Basitleştirilmiş — sabit oran, kullanıcı seçimi yok |
| Altyapıdan terfi | Otomatik, en iyi genci kadroya alır |
| Transfer | Mevcut bot transfer mantığı (FAZ C) kullanılır |
| Arena / ekonomi | Basit, kendi seviyesinde kalır |

**Neden yarı hız:** Bot yine de aktif oyuncudan yavaş geliştiği için zamanla alt liglere süzülür.
Doğal düzen korunur, ama lig ölü görünmez.

---

## 5. TERFİ / DÜŞME

### Sezon sonu sıralaması (18 takımlı ligde)

| Sıra | Ne olur |
|---|---|
| **1.** | 🏆 **Şampiyon** — doğrudan üst lige çıkar |
| **2 – 5.** | **Yükselme maçları** (tek maç eleme) — kazanan çıkar |
| 6 – 14. | Ligde kalır |
| **15 – 17.** | **Düşme maçları** — kaybeden düşer |
| **18.** | Doğrudan düşer |

**Yükselme maçı: 2-5. sıra** (4 takım, tek maç eleme — 2v5 ve 3v4, kazananlar final, final galibi çıkar). Karara bağlandı.

### Hareket sınırları

| | Kural |
|---|---|
| **İnsan takımı — düşme** | En fazla **1 lig** |
| **İnsan takımı — çıkma** | **Sınırsız** — üstteki ligler botla doluysa 5 lig birden çıkabilir |
| **Sistem botu — düşme** | **Sınırsız** — insanlara yer açmak için birden fazla lig düşer |
| **Terk edilmiş takım — düşme** | **En fazla 1 lig** — sahibi dönebilir, korunur (6. bölüm) |
| Bot takımı — çıkma | Sadece o yeri alacak insan takımı yoksa, 1 lig |

### Bot düzeltmesi (asıl mekanizma)

Yükselme/düşme maçları bittikten sonra, üstteki ligde **kalan botlara** bakılır:

> Üstteki ligde hâlâ **sistem botu** varsa, o botlar aşağı itilir ve yerlerine bu ligin
> **sıradaki en iyi insan takımları** maç oynamadan alınır. Zincirleme çalışır.
>
> **Terk edilmiş takımlar bu itmeden muaftır** — sahipleri geri dönebilir.

**Yol gösterici ilke:** *Gerçek oyuncular üst liglerde olmalı.*

Oyun gençken bu katman baskın olur (her yer bot, insanlar hızla fırlar). Ligler insanlarla
dolunca kendiliğinden devre dışı kalır ve sadece maçlı terfi/düşme işler.

---

## 6. TERK EDİLEN TAKIM — BOT KONTROLÜ (karara bağlandı)

**Temel ilke:** Takım el değiştirmez. Sahibi aynı kalır, **kontrolü bot devralır**, takım
**normal bot seviyesine kadar** geriler ve orada durur. Daha aşağı inmez.

### Tetikleyici

| Kural | Değer |
|---|---|
| Girilmezse bot kontrolü devralır | **1,5 ay (45 gün)** |
| Takım sahipliği | **Değişmez** — hesap sahibinin adına kalır |
| Devralma havuzuna girer mi | **Hayır, asla** — başka oyuncuya verilmez |
| Ne kadar kalır | **Süresiz** — sahibi dönüp takımı ayağa kaldırana kadar |

### Gerileme — yavaş ve sınırlı

Terk edilmiş takım geriler ama **hızlı değil.** Bir-üç ay sonra dönen oyuncu kendini son ligde
bulmamalı; gücünün bir kısmını kaybetmeli, ama takımı hâlâ tanıyabilmeli.

| Ölçü | Değer |
|---|---|
| **Kadro gücü kaybı** | **Sezon başına −3 OVR** |
| **Düşme sınırı** | **Sezon başına en fazla 1 lig** (aktif insan takımıyla aynı) |
| Kaybın dibi | **Normal bot bandı (68–74)** — oraya inince durur |
| Oyuncu satışı | Kademeli — her sezon en pahalı 1-2 oyuncu |

**Pratikte ne demek:**

| Uzak kalma | Sezon | Güç kaybı | Lig düşüşü |
|---|---|---|---|
| 2 ay | 1 | −3 OVR | 1 lig |
| 4 ay | 2 | −6 OVR | 2 lig |
| 6 ay | 3 | −9 OVR | 3 lig |
| 1 yıl+ | 6+ | bot bandına iner, durur | dengelendiği ligde kalır |

Üç ay sonra dönen oyuncu 1-2 lig aşağıda, birkaç oyuncusu satılmış bir takım bulur.
Canı sıkılır ama toparlayabilir — istenen tam olarak bu.

### ⚠ İKİ BOT KATEGORİSİ AYRIDIR

Bu ayrım kodlarken karıştırılmamalı:

| | **Sistem botu** | **Terk edilmiş takım** |
|---|---|---|
| Sahibi | Yok (`owner_user_id = NULL`) | **Var**, hesap duruyor |
| Devralma havuzunda | **Evet** | **Hayır, asla** |
| Düşme sınırı | **Sınırsız** — insanlara yer açar | **Sezonda 1 lig** — insan gibi |
| Bot düzeltmesinden etkilenir mi | **Evet**, aşağı itilir | **Hayır**, korunur |
| Gelişim | +0,6–0,8 OVR/sezon | −3 OVR/sezon (bot bandına kadar), sonra +0,6–0,8 |

**Kritik:** "Bot düzeltmesi" (5. bölüm) yalnız **sistem botlarını** aşağı iter.
Terk edilmiş takımlar insan takımı gibi korunur — çünkü sahibi geri dönebilir.

### Neden bu model iyi

| | |
|---|---|
| Ölü hesap birikmesi | Sorun değil — bot olarak ligi doldurmaya devam ederler, zaten bota ihtiyaç var |
| Terk etmenin bedeli | Var ama orantılı — ne kadar ilerlediysen o kadar kaybedersin |
| Geri dönme motivasyonu | Takım hâlâ orada; sıfırdan başlamak gerekmiyor |
| Lig sağlığı | Terk edilmiş takım normal bot gibi davrandığı için lig ölü görünmez |

---

## 7. VERİ MODELİ TASLAĞI

Sunucu tarafı yazılırken gereken minimum tablolar:

```
countries      id · ad · kod · aktif
leagues        id · country_id · seviye · grup · sezon
teams          id · league_id · ad · sehir · renk · logo
                 · owner_user_id (NULL ise BOT)
                 · kasa · arena_seviye
players        id · team_id · isim · poz · yas · ulke · statlar… · sozlesme
users          id · eposta · ulke · kayit_tarihi · son_giris
fixtures       id · league_id · sezon · tur · ev_team_id · dep_team_id
                 · oynanma_zamani · durum
results        fixture_id · ev_skor · dep_skor · olaylar(jsonb) · box(jsonb)
standings      league_id · sezon · team_id · o · g · m · sf · sa · puan
transfers      id · player_id · from_team · to_team · bedel · tarih
```

**Kritik alan:** `teams.owner_user_id`. `NULL` ise takım bottur ve devralınabilir.
Devralma = bu alana kullanıcı kimliğini yazmak. Kadroya dokunulmaz.

**Kritik kural:** Maç sonucu **sunucuda** üretilir (`results.olaylar`), tarayıcı yalnız oynatır.
**36. oturum notu (ölçüldü):** `box-band.js` ve `season-loop.js` Playwright ile başsız bir
*tarayıcı* açar — saf Node değildir; bu gerekçe yanlıştı. Ayrıştırma 36. oturumda yapıldı:
motor artık bağlam nesnesi okur (`buildMatchCtx`), rakip gücü gerçek kadrodan hesaplanır ve
`tools/sim-node.js` motoru **tarayıcısız** çalıştırır (`simulateMatch({...seed})`, deterministik).
Veri modelinin gerçek `CREATE TABLE` hâli: `db/schema.sql`.

---

## 8. SIRADAKİ ADIMLAR

| # | İş | Ön koşul |
|---|---|---|
| 1 | Sunucu teknolojisi seçimi | — |
| 2 | Veri modeli kesinleştirme | 1 |
| 3 | Maç motorunu Node tarafına taşıma | 1 |
| 4 | Fikstür zamanlayıcısı (ay uzunluğuna duyarlı) | 1, 3 |
| 5 | Uluslararası etkinlik tasarımı | Kullanıcı planı |

**Lig yapısına dair tüm kararlar verilmiştir.** Kalan tek engel sunucu teknolojisi seçimi.
Uluslararası etkinlikler ayrı bir tasarım turu gerektirir ve lig yapısını etkilemez.

---

## 9. KARAR GEÇMİŞİ

Bu belgedeki kararlar 2026-08-30 tarihli oturumda tek tek konuşularak alındı:

| Karar | Sonuç |
|---|---|
| Ülke ligi mi, uluslararası havuz mu | **Her ülkenin kendi ligi** |
| Lig büyüklüğü | 20 → 10 → 12 tartışıldı → **18** (gerçek lig bandı) |
| Sezon uzunluğu | 1 ay denendi, takvim sığmadı → **2 ay** |
| Playoff | best-of-7 vardı → **kaldırıldı**, lig birincisi şampiyon |
| Terfi/düşme | sabit 2/2 → **yükselme/düşme maçları + bot düzeltmesi** |
| Bot gelişimi | sabit kalsın denildi → **yarı hızda gelişsin** (inandırıcılık) |
| Takım devralma | rastgele mi → **oyuncu seçer** |
| Yükselme maçı | **2-5. sıra**, tek maç eleme |
| Terk edilen takım | **kontrolü bot alır, sahiplik kalır, YAVAŞ geriler (−3 OVR ve 1 lig/sezon), bot bandında durur** |
| İnsan takımı düşme | **en fazla 1 lig** · bot sınırsız düşer, insan sınırsız çıkar |
