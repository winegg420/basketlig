# KALDIĞIM YER
Son güncelleme: 2026-09-02 · **FAZ 34 (özel yetenekler + gecelik form) bitti; TÜM denetim
araçları baştan koşuldu. Çalışma ağacı temiz, her madde ayrı commit + push edildi.**

## Tam denetim taraması — 2026-09-02

**GEÇEN (31 araç):** `sim-node` (n=1000/seed 42 → 88,5-80,2 · olay 248 · determinizm ·
G değişmedi) · `yetenek-check` 30/30 · `ekonomi-check` 36/36 · `lig-check` ·
`anlatim-check` 31/31 · `schema-check` 21/21 · `faz6/7/8/10/11-check` (faz11 **15/15**) ·
`milliyet-check` · `isim-check` · `portre-check` · `turkek-check` · `bicim-check` ·
`sut-check` · `analiz-check` · `arena-check` · `geometri-check` · `m20-check` ·
`realism-check` · `mobile-check` · `live-metrics` · `band` (hash **3225bf641b79dea7**) ·
`box-band` · `measure` (taban tazelendi: **5e860aa6804fa4a0**) · `surum-check` (sürüm 67) ·
`i18n-scan` (A/B/C/D = 0) · `visual-check` (masaüstü+mobil, 0 konsol hatası) ·
`sunum-check`.

**Bu taramada DÜZELTİLENLER (hepsi commit + push edildi):**
1. `faz11-check` **F11-1** — kapı tek anlık örnek alıp 60 px eşiğine vuruyordu; normal
   akışta bu büyüklük 12-500 px arasında salınır, yani kapı kusuru kendisi üretiyordu.
   Ölçüldü: `_simCatchUp` zaten çalışıyor (dönüş medyanı **2 px**, normal akış tabanı
   124-128 px). Kapı üç ayaklı ve kendini kalibre eder hâle getirildi → 15/15.
2. `faz8-check` **A4** — FAZ 25/33'te KALDIRILAN v7 göçünü sınıyordu (`SAVE_VERSIONS=[10]`),
   zorunlu olarak düşüyordu; üstelik `serializeGameState` `players`'ı referansla döndürdüğü
   için test canlı kadroyu bozuyordu. Yürürlükteki kayıt politikasına taşındı (derin kopya).
3. **Savunma toparlanması sprint** — FAZ 34 `hiz` bandını 55-92'den 20-99'a açınca yavaş
   savunmacı geride kalıyordu. Ölçüldü (300 sn pencere): markaj **1,94 → 1,85 m**.
4. **Potansiyel sapmayla birlikte kayar** — zayıf sapma `genel`'i düşürüp potansiyeli
   yerinde bırakınca gelişim boşluğu büyüyor, kadro kendiliğinden güçleniyordu.
   season-loop K2: 2,24× → **2,12×**.
5. `spacing-check` varsayılan penceresi 90 → 240 sn (90 sn'de aynı kod 1,77-2,00 m veriyor,
   düşen kapı sayısı 2 ile 4 arasında oynuyordu).
6. `band` ve `measure` referans hash'leri FAZ 34 sonrası değerlerle tazelendi (bilinçli
   kayma: özel yetenek sistemi statları, dolayısıyla maç sonuçlarını değiştirdi).

## AÇIK KALAN — hepsi ÖLÇÜLDÜ, hiçbiri FAZ 34 gerilemesi DEĞİL

Üçü de FAZ 34 ÖNCESİNDE de düşüyordu; kanıt için ayrı worktree'de (commit `796d6f4`)
aynı pencerelerle ölçüldü.

| Araç | Düşen kapı | Şimdi | FAZ 33 (aynı ölçüm) |
|---|---|---|---|
| `spacing-check` | topu tutana en yakın savunmacı | 1,82-1,83 m (hedef <1,8) | **1,94 m** |
| `spacing-check` | ball-you-man | %81,7-83,8 (hedef ≥85) | **%83,0** |
| `spacing-check` | orta üçte birdeki hücumcu | %22,7 (hedef <20) | **%21,7** |
| `hareket-check` | kademe: YÜRÜ payı | %47-48 (hedef 20-45) | **%45,0** (sınırda) |
| `season-loop` | K2 pasif kulüp kasası | 2,12× (hedef ≤2×) | **2,23×** |

**Neden kapatılmadı:**
- `spacing-check` markaj açığının kaynağı TAKİP GECİKMESİDİR: hedef mesafe 27 px (0,91 m)
  ama ölçülen 1,85 m. İki müdahale denendi ve ölçülerek GERİ ALINDI (kodda yorumla
  belgeli): (a) on-ball sprint eşiğini 1,5×'ten 0,8×'e daraltmak → savunmacı varış
  freniyle hedefi aşıp salınıyor, markaj 1,92 → 2,00 m; (b) hedef aralığı 27 → 21 px →
  savunmacı adam-pota doğrultusuna oturamıyor, ball-you-man %85,8 → %78,7. Doğru çözüm
  takip gecikmesini azaltmaktır (ölü bölge / hedef tazeleme sıklığı), bu FAZ 11/16'da
  ayarlanmış sahne geometrisini yeniden düzenlemeyi gerektirir — ayrı bir iş.
- `season-loop` K2, FAZ 25 USD'de "1,49×" olarak kaydedilmişti ama o yalnız **3 koşuluk**
  bir medyandı; 9 koşuda yayılım **1,05×-4,99×**. Gerçek taban 2,23×. Ekonomi kaldıracı
  denendi (`ISLETME_MAC_BASI` 4.820 → 5.330): K2 düşüyor ama `ekonomi-check` bot iflas
  oranı %21 → %33'e çıkıyor (hedef %10-25). İki kapı ters yönde çekiyor; doğru çözüm
  9 koşuluk medyanlarla yeniden dengeleme — ayrı bir iş.

## SONRAKİ OTURUMDA İLK YAPILACAK
1. `git pull` — her şey `master`'a push edildi, çalışma ağacı temizdi.
2. Yukarıdaki üç açık kalemden biriyle başlanacaksa: önce ölçüm penceresini/koşu sayısını
   büyüt, SONRA müdahale et. Bu oturumda üç kez aynı tuzağa düşüldü (F11-1, sunum-check,
   K2): salınan bir büyüklüğü küçük örneklemle yargılayan kapı, kusuru kendisi üretiyor.
3. Bekleyen büyük iş hâlâ **çok oyunculu sunucu kodu** (`db/schema.sql` ve
   `PLAN-COK-OYUNCULU.md` hazır, Supabase kodu hiç yazılmadı).

---

# ÖNCEKİ KAYITLAR

## FAZ 25 sonrası durum (2026-09-01)

**Geçen:** `visual-check` (masaüstü + mobil, 0 konsol hatası) · `band.js` hash
**99bb9ceb67917bd0** (referansla birebir) · `sim-node` (determinizm) · `anlatim-check` 23/23 ·
`turkek-check` 32/32 · `schema-check` 17/17 · `isim-check` · `surum-check` (sürüm **57**,
içerik hash kaydı `--yaz` ile tazelendi).

**Bilerek kırmızı bırakılan kapılar (kapsam kararı, gerileme değil):**

| Kapı | Ölçülen | Hedef | Not |
|---|---|---|---|
| `sunum` F25-2 donma | 9 donma · en uzun 1,50 sn | 0 | Salınım eşiği 340 ms; 280 ms'de 1'e iniyor ama `spacing` churn'ü artıyor |
| `sunum` F25-5 şema yörüngesi | ÖRNEK YOK (yalnız 1 şema yeterli kare topladı) | 2+ şema | Ölçüm aracının örneklemi yetersiz — motor kusuru değil |
| `spacing` markaj mesafesi | 2,06 m | < 1,8 m | Taban 1,98 m; canlı salınımın doğrudan bedeli |
| `spacing` ball-you-man | %77,1 | ≥ %85 | Taban %82,9 |
| `spacing` orta üçte bir (süzülmemiş) | %23,4 | < %20 | Geçiş kareleri dahil; oturmuş sette %13,9 (geçiyor) |
| `hareket` YÜRÜ payı | %48,6 | %20-45 | Taban %47,5 |
| `milliyet` I bölümü | 4 koşudan 1'i kararsız | — | FAZ 25 öncesinde de vardı (`ensureUniquePlayerNames` yeniden çekilişi) |

**Sıradaki büyük iş — çok oyunculu sunucu (Supabase).** `db/schema.sql` ve
`PLAN-COK-OYUNCULU.md` hazır, **kod yazılmadı**; kod tabanında hiçbir bağlantı yok
(`schema-check` [5] bunu sınıyor). Bugünkü tek kişilik akış bilinçli bir test kolaylığıdır
(`?test=1` / `matchTimeGateOk`).

---

## 39. oturum — FAZ 15 (saha hareketi kalibrasyonu)

Yeni araç **`tools/hareket-check.js`** (jeton hızı + kabuk alanı + bant dağılımı).
**Araç, brifin teşhisini düzeltti:** sahne maç saatini ~2× sıkıştırıyor (1 sahne sn ≈ 2,0 maç
sn), dolayısıyla oyun maç saatinde zaten gerçekçi hızdaydı (1,45 vs gerçek 1,54-1,60).
Brifin mutlak yavaşlatması uygulanmadı — uygulandığında FAZ 11 kapıları düşüyor. Uygulanan:
**hareket kademeleri** (`_V_TIER`/`_URG`/`_setUrg`, yeni YÜRÜ kademesi) + **yerinde kalma**
(`_hedefAta`) + savunma düzeltmeleri. Sonuç: dört açıklık ölçüsünün dördü de gerçek değere
yaklaştı (hücum kabuk 57,6 → 55,2 · gerçek 53,5 | savunma 29,5 → 32,6 · gerçek 32,3),
hız dağılımının çift tepeliliği azaldı (jog %6 → %10, sprint %22 → %16).
`spacing-check` eşiği 4,5 → **5,8 m** (F15-4). Script sürümü **?v=51**.

---

## 38. oturum özeti (ayrıntı: PROGRESS.md)

**FAZ 14-G (saha):** 3 sayı yayı potaya değil DİP ÇİZGİYE merkezli çiziliyordu (SVG, kirişten
küçük yarıçapı sessizce büyütür) — aynı çizgi üzerinde potaya uzaklık 5,26-7,63 m arasında
değişiyordu. Köşe düzlükleri eklendi, ölçüler FIBA'ya çekildi, yatay/dikey ölçek eşitlendi
(saha yüksekliği 440 → 443,14 px), potanın önündeki sahte turuncu daire silindi.
Serbest atış artık **on oyuncu yerleştikten sonra** atılıyor (2,8/10 → **9,3/10**).
Yeni araç **`tools/geometri-check.js`** — nitelik okumaz, `getPointAtLength` ile ÇİZİLEN
eğriyi ölçer; 19/19.

> **Ad çakışması:** "FAZ 14" iki işe verildi. `f77bac1` = **FAZ 14-D** (canlı anlatım dil
> revizyonu), `6039816` = **FAZ 14-G** (saha geometrisi, `REVIZE-PAKETI-FAZ14.md`).
> F14-1…F14-7 madde kodları geometri paketine aittir.

**Bölüm B:** EN canlı anlatım %37,5 Türkçeden **%0**'a (87 sözlük girişi + 11 katalog kaydı +
33 kalıp; `i18n-scan`'e canlı anlatım kapısı). M9 ve `live-metrics` "gerilemeleri" kodda
değil **ölçü araçlarında** çıktı ve ikisi de düzeltildi (motorun kendi damgası: çıkış pası
125/125 guard'a). `spacing-check`'e süzülmemiş rapor bloğu eklendi. `season-loop` K2
kararsızlığının altından gerçek bir kusur çıktı: **canlı sahne katmanı maçın rastgele akışını
tüketiyordu** — sahneye kendi PRNG'si verildi (41 çağrı).

### Referans değerler
- `band.js` hash: **`fb393bdab878e699`** (FAZ 14 ve Bölüm B boyunca **değişmedi**)
- script sürümü: **?v=50** · `sw.js` SCRIPT_V=50
- `live-metrics --ms=360000`: medyan 2,07× · yayılım 1,14× (ölçü POZİSYON başına yeniden
  tanımlandı; eski değerlerle karşılaştırılamaz)
- `season-loop --n=3 --runs=3`: K2 medyan 1,54× (koşular 2,88 · 1,43 · 1,54)
- `spacing-check` süzülmemiş blok: ikili 7,67 m · boyada %63,5 · potaya 6,82 m

### Açık kalan (bu brifin kapsamı dışında)
Denetimin 5. maddesi: markaj ve boyada oyuncu oranını GEÇİŞ karelerinde de hedefe çekmek.
Bugün geçiş kareleri bilgi olarak raporlanıyor (markaj 2,63 m · boyada %74,7).

---

## 37. oturum — **PROMPT-CLAUDE-CODE.md'nin altı bölümü + kullanıcı bildirimleri (canlı maç görünümü)**

Talep belgeleri: `REVIZE-PAKETI.md` (FAZ 1-6) · `REVIZE-PAKETI-FAZ7.md` (maç dışı) ·
`REVIZE-PAKETI-FAZ8.md` (oynanış testi) · `REVIZE-PAKETI-FAZ9.md` (uzun vadeli döngü) ·
`REVIZE-PAKETI-FAZ10.md` (yayın hazırlığı) · `REVIZE-PAKETI-FAZ11.md` (canlı maç dizilimi) —
**altısı da uygulandı ve ölçülerek doğrulandı**; FAZ 10'un yalnız A grubu (çok oyunculu
sunucu altyapısı) **bilinçli olarak** plana bırakıldı.
Protokol: `DEVAM-ET.md` · Oturum günlüğü: `PROGRESS.md` (32-35. oturum)

## Durum: TEMİZ

**FAZ 1-9'un tamamı bitti.** M9, M12, M14, M20 kapatıldı; a11y sürükleme hatası düzeltildi;
B5 zorluk seviyesi eklendi; uzun vadeli sezon döngüsü dengelendi.
**FAZ 10'un B grubu bitti** (34. oturum): fikstür saati kapısı + `?test=1` bayrağı, analitik
katmanı (varsayılan kapalı), og/twitter etiketleri + og:image, davet & sonuç paylaşımı,
öğreticinin 7 adımının tamamı EN, service worker + manifest (PWA).
**FAZ 11 bitti** (35. oturum): canlı maç saha dizilimi. Kök neden belgede yazandan farklı
çıktı — sahne saati (rAF) ile olay saati (setTimeout) ayrışması; arka plan sekmesinde sahne
anlatımın 13 kat gerisine düşüp geçiş dizilimine takılıyordu. `_simCatchUp` + yeniden çizilen
`SET_*` dizilimleri + "fill" fazı + koreografi düzeltmeleri + `startMatch` sessiz kilitlenmesi.
Her madde **ölçülerek** doğrulandı — "uyguladım" beyanına dayanan açık iş yok.

## ÇOK OYUNCULU — oyunun temeli, henüz başlanmadı

Charazay baştan beri **çevrimiçi çok oyunculu** hedefliyor: maç **fikstür tarihinde** ve
**otomatik** oynanır; oyuncu oradaysa canlı izleyip müdahale eder, değilse sonucu döndüğünde
görür; rakipler gerçek oyuncular + sahipsiz takımları dolduran botlardır.
**Maçların bugün art arda oynanabilmesi bir hata değil, bilinçli test kolaylığıdır** —
34. oturumda `?test=1` bayrağının arkasına alındı (`TEST_MODU`, `matchTimeGateOk` · `state.js`).
Sunucu mimarisi kararı **Supabase**; şema ve yol haritası **`PLAN-COK-OYUNCULU.md`**'de.
Sunucu/veritabanı/hesap/zamanlayıcı **kodu yazılmadı** — tek oyunculu tarafla aynı büyüklükte
ayrı bir fazdır.

## Doğrulama komutları (hepsi geçiyor)

| Komut | Ne sınar | Sonuç |
|---|---|---|
| `node tools/season-loop.js --n=3 --runs=3` | çok sezonlu döngü (kadro OVR, kasa, yaşlanma, kadro sınırı, playoff) | ✓ **6/6** |
| `node tools/faz6-check.js` | FAZ 6 (ödüller, zorluk, koçluk istatistiği, kayıt bütünlüğü, mobil uçtan uca, masaüstü paketi, Tauri ön koşulları) | ✓ **7/7** |
| `node tools/faz8-check.js` | FAZ 8 kabul kriterleri (piyasa, şehir, v7, kutuplaşma, sürüm, mobil) | ✓ **6/6** |
| `node tools/faz7-check.js` | FAZ 7 kabul kriterleri + a11y zoom hayaleti | ✓ **8/8** |
| `node tools/m20-check.js` | rakip kadro kalıcılığı | ✓ **6/6** |
| `node tools/faz10-check.js` | FAZ 10 (fikstür saati kapısı, analitik, og etiketleri, PWA, öğretici dili, paylaşım) | ✓ **27/27** |
| `node tools/spacing-check.js` | saha dizilimi (aralık, yayılım, boya, markaj, ball-you-man) — tohumlu | ✓ **9/9** |
| `node tools/spacing-check.js --bg` | arka plan sekmesinde dizilim (F11-1 gerileme testi) | ✓ geçti |
| `node tools/faz11-check.js` | FAZ 11 (dizilim geometrisi, yetişme, kesme noktası, `startMatch` kilidi) | ✓ **13/13** |
| `node tools/mobile-check.js` | FAZ 12 mobil (dokunma sayısı, maç sayfası düzeni, yoğunluk, 44 px) | ✓ **18/18** |
| `node tools/sim-node.js --n=50` | **tarayıcısız** maç simülasyonu + determinizm (sunucu ön koşulu) | ✓ 50/50 |
| `node tools/schema-check.js` | `db/schema.sql` sözdizimi + lig kuralları + RLS + bağlantı yok | ✓ **17/17** |
| `node tools/anlatim-check.js` | **canlı maç anlatımı** (ribaund, seri, faul, çalma, çeşitlilik, saha değişimi) — tarayıcısız | ✓ **13/13** |
| `node tools/anlatim-check.js --freeze` | sekme donması/kurtarma · maç içi panel · açılışta tek düdük · parkede O/X izi yok | ✓ **23/23** |
| `node tools/sunum-check.js --ms=300000` | M9 outlet · M12 and-1 · M14 şut saati | ✓ **3/3** |
| `node tools/visual-check.js` | masaüstü + mobil akış, konsol | ✓ çıkış kodu **0** |
| `node tools/live-metrics.js --ms=360000` | senkron · kimlik · ışınlanma | ✓ orphan 0 · kimlik %100 · 0 kare |
| `node tools/box-band.js --n=200` | denge bantları | ✓ **11/11** |
| `node tools/band.js` | **sonuç değişmezliği** (hash) | **`fb393bdab878e699`** (FAZ 13'te değişti) |
| `node tools/i18n-scan.js` | EN modunda çeviri + **tarama kapsamı** | ✓ kalan Türkçe yalnız özel isim |

> **Hash referansı:** SUNUM değişikliğinden sonra `band.js` **aynı** hash'i vermelidir.
> Mekanik değişiklikte (denge, piyasa, rakip mekaniği) hash'in değişmesi beklenir — o zaman
> `box-band` bantları kontrol edilip yeni hash referans olarak yazılır.
> `live-metrics` yayılımını yargılamadan önce **≥ 200 sn** ile çalıştır (kısa pencerede gürültülü).

## Bu oturumda kapatılanlar

- **31. oturum regresyonu:** `pendingPaint` `clearBallTimers()`'tan önce kuruluyordu → orphan 0
  **ve** kimlik %100 birlikte tutuyor (`stepGuarded()`).
- **FAZ 3:** top ışınlanması 0 kare (şut anı, serbest atışlar arası, çeyrek sonu).
- **FAZ 7 (F7-1…F7-30):** tamamı + 8 kabul kriteri.
- **a11y-big zoom 1.18:** sürükleme hayaleti 147 px kayıyordu → `_uiZoom()`.
- **M9** outlet pası · **M12** and-1 ek atışı · **M14** şut saati 14 · **M20** rakip kadro kalıcılığı.
- **FAZ 8 (F8-1…F8-14):** tamamı + 8 kabul kriteri.
- **FAZ 6:** B5 zorluk seviyesi (kolay/normal/zor) + B4 "en gelişen" ödülü; A1/B3/C2/C3/D1/D3
  ve Steam ek maddelerinin zaten kapandığı **ölçülerek** doğrulandı (`faz6-check`).
- **FAZ 9:** sezonluk doğal gelişim (kadro artık büyüyor: +1,27 OVR), ekonomi dengesi
  (kasa 5,8× → 1,58×), kadro üst sınırı 18, playoff/yaşlanma doğrulaması, "Transfer Bedeli".
- **Motor çökmesi:** sağlıklı oyuncu 5'ten azken `matchLineup` null slot döndürüp maçı
  çökertiyordu — `season-loop` buldu, düzeltildi.
- **Üçüncü araç kusuru:** `box-band.js` tohumsuzdu (aynı kodla ribaund 29,9 / 30,9).
- **İki araç kusuru:** `band.js` tohumu hiç kurmuyordu; `i18n-scan.js` salt ASCII harfli Türkçe
  metinleri göremiyordu. İkisi de düzeltildi — düzeltilince yeni gerçek eksikler ortaya çıktı.

## Yarım kalan

**`season-loop` K2 (pasif takım kasası) düşüyor** — `--n=3 --runs=3` ortalaması 2,06× (eşik 2,0;
tohumlara göre 1,56×-2,62×). `git worktree` ile ölçüldü: **36. oturum öncesi commit'lerde de
düşüyor** (`8288405`, hatta FAZ 9'un bittiği `7e8f5c0`). FAZ 9'da "6/6" diye kaydedilen ölçüm
bugün aynı commit'te tekrar üretilemiyor → aracın ekonomi ölçümünde tohumla sabitlenmeyen bir
girdi var (muhtemelen takvim/tarih). **Önce aracın determinizmi doğrulanmalı, sonra denge.**
Bu depoda dördüncü kez bir ölçüm aracının kendisi şüpheli.

**~~`sunum-check` M9~~ — FAZ 13 ile KAPANDI.** F13-1 her kaçan şutun ribaundunu olay hâline
getirdiği için araç artık 3 değil **20 vaka** ölçüyor: **%80 (hedef ≥ %80) ✓**. Örneklem
sorunu kendiliğinden çözüldü.

**`live-metrics` syncRatio YAYILIMI — FAZ 13'ün getirdiği bir gerileme DEĞİL, ölçüldü.**
Aynı pencerede (`--ms=540000`) `git worktree` ile karşılaştırıldı:

| | FAZ 13 öncesi (`cf36a74`) | sonrası (`7ca037a`) |
|---|---|---|
| syncRatio medyan | 2,78× ✓ | **3,86× ✓** (hedef 2-5×) |
| tipler arası yayılım | **2,47× ✗** | **3,11× ✗** (hedef < 1,9×) |

Yani yayılım hedefi **iki kodda da** tutmuyor. Yayılımı `free` tipi çekiyor (8 örnek) ve
sebebi ölçü tanımında: bir pozisyonun bütün olayları AYNI `t` değerini taşır, dolayısıyla
maç saati hareketini pozisyonun İLK olayı soğurur. F13-1 ile araya ribaund olayları girince
bu hareket başka bir tipe kaydı. **Yapılacak iş motorda değil araçta:** oran olay başına
değil POZİSYON başına hesaplanmalı. Medyan, orphan, kimlik ve top ışınlanması güvenceleri
her iki kodda da tutuyor.

## Sıradaki adım (öncelik sırasıyla)

Talep belgelerinde **açık madde kalmadı**. Sıradakiler kapsam kararı gerektirir:

0. **ÇOK OYUNCULU (FAZ 10 · F10-1)** — en büyük iş. `PLAN-COK-OYUNCULU.md` 6. bölümündeki
   9 adımdan **ikisi 36. oturumda bitti**: şema (`db/schema.sql`) ve motoru Node'da koşturan
   ayrıştırma (`simulateMatch` + `tools/sim-node.js`). Kalan sıra: Supabase projesi + anonim
   giriş → fikstür zamanlayıcısı → istemcinin sunucudan gelen olayları oynatması → realtime +
   çeyrek arası müdahale → ortak transfer piyasası → lig yönetimi → bildirim.
   **Sunucu kodu hâlâ yazılmadı; hiçbir hesap açılmadı.**
   *Ara yol önerisi (belgeden):* tek oyunculu sürüm şimdi yayınlanıp gerçek tutunma verisi
   toplanırken altyapı arkada kurulabilir — analitik ve og etiketleri bu yüzden önden yapıldı.
0b. **Analitik hesabı açılması** — `ANALYTICS_SRC` + `ANALYTICS_SITE` (`js/state.js`) doldurulunca
   ölçüm başlar; katman hazır, hesap kullanıcıya ait (Umami/Plausible önerildi).
1. **Gerçek Tauri derlemesi** — `npm run desktop:build` bu makinede **çalıştırılamadı**:
   Rust ve MSVC Build Tools kurulu değil (2026-08-30'da denendi, kullanıcı kurulumu erteledi).
   Ayrıntı ve kurulum adımları aşağıdaki **"Masaüstü derlemesi"** bölümünde.
2. **Gerçek cihazda dokunma testi** — Playwright emülasyonu geçiyor; fiziksel telefon denenmedi.
3. **B6** — akademi maçları, pozisyon antrenmanı derinliği (`RAPOR-EKSIKLER.md`, kapsam kararı).
   FAZ 9 notu: paraya **anlamlı hedefler** (arena basamakları, akademi seviyeleri, izci ağı,
   kulüp transferinde gerçek yıldızlar) hâlâ genişletilebilir — kasa artık şişmiyor ama
   harcama kanalları da zengin değil.
4. **Steam Deck / gamepad** desteği — kapsam kararı bekliyor (FAZ 6 belgesinde açık bırakılmış).
5. FAZ 8 notu: 7 dokunma hedefi 38-39 px (eşik 40) — sınırda, istenirse kapatılır.

## Masaüstü derlemesi (Tauri) — durum ve kurulum

**Proje tarafı hazır, eksik olan yalnız araç zinciri.** `faz6-check` F6/F7 bunu sınıyor:

| Bileşen | Durum |
|---|---|
| `dist-desktop` (13 js modülü, 4 yerel font, dış src/href yok) | ✓ hazır |
| `src-tauri`: Cargo.toml · build.rs · main.rs · tauri.conf.json · ikonlar | ✓ hazır |
| `frontendDist` yolu · bundle hedefleri (msi, nsis) · identifier | ✓ doğrulandı |
| WebView2 · Node · npm · Tauri CLI 2.11.4 | ✓ kurulu |
| **Rust (rustup/rustc/cargo)** | ✗ **kurulu değil** |
| **MSVC Build Tools + Windows SDK** | ✗ **kurulu değil** |

Kurulum (yaklaşık 4-6 GB indirme, 20-40 dk):

```
winget install Rustlang.Rustup          # yönetici GEREKMEZ (~300 MB)
winget install Microsoft.VisualStudio.2022.BuildTools ^
  --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

> İkinci komut **UAC/yönetici onayı** ister — bu yüzden otomatik çalıştırılamıyor, terminale
> `!` ön ekiyle sen başlatmalısın. Kurulumdan sonra yeni bir terminal aç (PATH tazelensin).

Sonra:

```
node tools/faz6-check.js     # F7 satırında "araç zinciri: rustc var · cargo var" görünmeli
npm run desktop:build        # dist hazırlığı + Rust derlemesi + msi/nsis paketleme
```

Çıktı: `src-tauri/target/release/bundle/{msi,nsis}/`. İlk derleme uzun sürer (Rust bağımlılıkları
sıfırdan derlenir); sonrakiler önbellekten hızlanır.

## Dikkat

- **Ölçmediğin düzeltme çalışmıyor olabilir.** Bu oturumda üç kez tekrarlandı: 31. oturumun
  teşhisi, FAZ 7 "uyguladım" beyanım ve M9'un ilk hâli — üçü de test karşısında düzeltildi.
  Yeni bir madde eklerken ilgili `*-check.js` aracına denetim ekle.
- **Çevrilecek cümleyi `<strong>` ile bölme.** Vurgu etiketi metin düğümlerini ayırır ve
  `I18N_PHRASES` kalıbı eşleşmez (FAZ 8'de üç haber şablonu bu yüzden yeniden yazıldı).
- **`i18n-scan.js` sözcük listesine İngilizce'de aynı yazılan kelimeleri EKLEME** (arena,
  transfer, moral, tempo) — çevrilmiş metinler yanlış pozitif olur.
- **Kayıt sürümü v8.** `SAVE_VERSIONS=[2,3,4,5,6,7,8]`; `migrateV5ToV6` + `migrateV6ToV7` (boy/isim) + `migrateV7ToV8` (zorluk).
- **Yeni kariyerin tek sıfırlama kaynağı `DEFAULT_G`** (`roster-gen.js`); yeni kalıcı alanı
  literale ekle, `createTeam` içine satır yazma.
- **Piyasa kalitesi kadroya bağlı** (`marketQualityBand`): tavan = kadro en iyisi + 6, kesin
  sınırdır. Kadro geliştikçe piyasa da gelişir (ölçekli zorluk).
- **Bot kulüp kadrosu durum taşıyor** (`p.sezon`, `p.enerji`, `injReturnDay`). Yeni alan
  eklerken `botClubEnsureDepth` içindeki geriye dönük doldurmaya da ekle. `BOT_ROSTER_DIST`
  başındaki İLK 7 SIRA tarihseldir — id/seed'ler ona bağlı, değiştirme.
- **`cpuMatchScore()` tek kaynaktır** — bot-bot skor formülünü test de oradan çağırır.
- **Script sürüm etiketi** her yayın öncesi artırılmalı — şu an **`?v=43`**; `faz8-check` A7 sınıyor.
- **Mobil alt sekme çubuğu (F12-1)** `#mobileTabs`; yeni sayfa eklerken günlük kullanımdaysa
  çubuğa, değilse hamburgerde bırak. `showPage` çubuğu, katlamaları, sabit eylemi ve rozetleri
  kendisi tazeler — yeni sayfa eklerken ek bağlantı gerekmez.
- **Mobilde ekranın altındaki 56 px çubuk vardır:** sabit konumlu yeni bir öğe koyarken
  `bottom` değerini `calc(70px + env(safe-area-inset-bottom))` üzerinden ver, yoksa çubuğun
  düğmelerini kapatırsın (bildirim kutusu bu yüzden `pointer-events:none` yapıldı).
  Aynı sürüm `sw.js` içindeki `SCRIPT_V`'de de geçer — ikisi ayrışırsa `faz10-check` A4 düşer.
- **Service worker yalnız yayın sunucusunda kaydedilir** (`isProdHost()`); yerelde/testte kapalı,
  yoksa önbellek eski JS'i servis edip ölçümleri yanıltır. `?nosw=1` ile de kapatılabilir.
- **Yeni maç başlatma yolu eklersen** `matchTimeGateOk()` kapısından geçir (F10-2).
- **Bir hata raporunun ÖLÇÜM KOŞULU raporun kendisi kadar önemlidir (35. oturum):** FAZ 11
  belgesinin tablosu arka plandaki sekmede ölçülmüştü; ön planda oyun o kadar bozuk değildi.
  Koşulu yeniden üretmeden teşhis yapılırsa yanlış yerde hata aranır (belge "set dizilimi hiç
  uygulanmıyor" diyordu; gerçek sebep rAF kısıtlaması yüzünden sahne saatinin donmasıydı).
- **`_simCatchUp` yalnız kare kaybında çalışır** — ön planda 120 sim saniyede 0 kez tetiklenir.
  `mState._sim.cuCount` teşhis sayacıdır; ön planda 0 beklenir.
- **`season-loop --n=1` çalıştırma:** tek sezonda sezon geçişi olmadığı için K4 (yaşlanma) düşer;
  yargı için `--n=3` gerekir.
- **Fontlar yerel** (`assets/fonts/`) — yeni Google Fonts `<link>` eklenmemeli.
- **`S._dbgOutlet`** yalnız `sunum-check` için bırakılmış teşhis damgasıdır, silme.
- **`js/league.js` CRLF**, `charazay2.0.html` KARIŞIK (CRLF+LF), diğer modüller LF. Toplu
  düzenlemede satır sonunu otomatik tespit et.
- Bellek önbellekleri: `CLUB_CACHE_KEY` → `invalidateClubCacheMem()`,
  `TBL_STORAGE_KEY` → `invalidateTblStateMem()`.
