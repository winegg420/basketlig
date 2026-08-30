# CLAUDE CODE — SIRADAKİ İŞ (FAZ 11 + FAZ 12 + SUNUCU HAZIRLIĞI)

> Bu belge tek bir görev listesidir. **`DEVAM-ET.md` protokolü geçerlidir.**
> Sırayı bozma; her bölüm bittiğinde commit at ve `KALDIGIM-YER.md` ile `PROGRESS.md`'yi güncelle.

## DURUM

Son commit `c2c46b3` (FAZ 10 B grubu). Uygulanmamış talep belgeleri:

| Belge | Durum |
|---|---|
| `REVIZE-PAKETI-FAZ13.md` | **yeni** — canlı yayında ölçüldü, hiç uygulanmadı |
| `REVIZE-PAKETI-FAZ11.md` | **hiç uygulanmadı** — `SET_5OUT` kodda yok |
| `REVIZE-PAKETI-FAZ12.md` | **hiç uygulanmadı** — alt sekme çubuğu kodda yok |
| `PLAN-LIG-YAPISI.md` | tasarım kararları verildi, **kod yok** |
| `KARAR-SUNUCU.md` | sunucu kararı verildi (Supabase), **kod yok** |

Eksik araçlar: `tools/anlatim-check.js`, `tools/spacing-check.js` ve `tools/mobile-check.js`
**yok** — üçü de yazılacak.

---

## SIRA — BU SIRAYI DEĞİŞTİRME

```
BÖLÜM 0  FAZ 13 — canlı maç anlatımı + kilitlenme  ⟵ ÖNCE BU (REVIZE-PAKETI-FAZ13.md)
BÖLÜM 1  FAZ 11 — canlı maç saha dizilimi      (kullanıcının 1 numaralı şikâyeti)
BÖLÜM 2  FAZ 12 — mobil arayüz                 (kullanıcının 2 numaralı şikâyeti)
BÖLÜM 3  Maç motorunu G'den ayır               (çok oyunculunun ön koşulu)
BÖLÜM 4  db/schema.sql — lig veri modeli       (yalnız dosya, hesap açma yok)
BÖLÜM 5  Belge güncellemeleri
```

---

# BÖLÜM 0 — FAZ 13 (ÖNCE BU)

**Tam belge: `REVIZE-PAKETI-FAZ13.md`. Oku ve uygula.** 18 madde, canlı yayında ölçüldü.

**Neden FAZ 11'den önce:**
1. **FAZ 11'in metre ölçeği yanlış** (`33,57` yerine `29,54 px/m` olmalı — FAZ 13 madde 0).
   Bu düzeltilmeden `spacing-check.js` yazılırsa tüm metre hedefleri hatalı çıkar.
2. **F13-14: sekme arka plana alınınca maç kalıcı donuyor.** Kullanıcının ekranında şu anda
   102 dakikadır donmuş bir maç var (`running=false`, `idx=16/198`, `visibilitychange`
   dinleyicisi yok). Çok oyunculuda maç sonucu hiç üretilmez — en kritik madde budur.
3. FAZ 13, FAZ 11'in F11-1 ve F11-4 maddelerini **güncel ölçümle doğruladı**, ama F11-2'yi
   (aralık dar) **kısmen çürüttü** — ölçülen aralık 4,8–5,6 m, yani iyi. Asıl sorun takımın
   potaya hiç yaklaşmaması. FAZ 11 uygulanırken önceliği buna göre ver.
4. FAZ 13 ayrıca **üç yanlış alarmı** eledi (şut mesafeleri, serbest atış faul metni, saha
   geometrisi — hepsi doğru). Bunlar aranmasın.

FAZ 13'ün öncelik sırası kendi belgesindedir; oradaki sırayı uygula.

**Neden bu sıra:** Bölüm 3 maç motorunun giriş sözleşmesini değiştiriyor, Bölüm 1 ise aynı
motorun dizilim kodunu düzeltiyor. Önce dizilim düzelmezse, refactor sırasında bozuk davranış
yeni yapıya taşınır. **Bölüm 1 bitip ölçülmeden Bölüm 3'e geçme.**

---

# BÖLÜM 1 — FAZ 11: CANLI MAÇ SAHA DİZİLİMİ

**Tam belge: `REVIZE-PAKETI-FAZ11.md`. Oku ve uygula.** Özet ve uygulama sırası:

## Sorun (canlı sitede ölçüldü)

| Metrik | Ölçülen | Olması gereken |
|---|---|---|
| Hücum oyuncuları arası ortalama mesafe | **2,64 m** | ≥ 4,57 m (15 feet kuralı) |
| Boyada oyuncu sayısı | **0,00** | 1–2 |
| Savunmacının adamına uzaklığı | **5,03 m** (p90 7,19 m) | 1–3 m |
| Oyuncuların saha ortasında kalma oranı | **%80,8** | set hücumda ~%0 |

On oyuncunun tamamı maç boyunca orta sahada iki simetrik sütun hâlinde duruyor, iki potanın da
altı boş. Skor işliyor ama **görüntü hiçbir zaman yarı saha hücumuna geçmiyor.**

## Kök neden

**Doğru dizilimler kodda zaten var** (`js/match-engine.js:628` `SET_SPREAD`, `SET_HORNS`) ama
**hiç uygulanmıyor.** Ölçülen konumlar `TRANS_OFF` bandının içinde — oyuncular geçiş (transition)
dizilimine takılıp `phase:'set'` aşamasına hiç geçmiyor.

`_setFormation(offLeft, offPlayers, defPlayers, shot, {phase})` içinde `phase==='trans'` dalı
çalışıp `return` ediyor, `set` dalı hiç çalışmıyor. Bak:
1. `movePlayersForEvent` — her olayda `phase` nasıl seçiliyor, sürekli `'trans'` mi geçiliyor?
2. `tOff` / `bringT` / `tSet` — `match-engine.js:1302-1310` civarı, `tSet = tOff + bringT`
3. `_simStep` içindeki faz makinesi — geçişten sete terfi eden koşul
4. **Regresyon şüphesi:** FAZ 1'de `ev.dt` tabanlı zamanlama değişti; set fazına geçiş eski
   zamanlamaya bağlı kalmış olabilir. `git log -S "tSet"` ile bak.

## Uygulama sırası (FAZ 11 belgesi bölüm 4)

**1) F11-7 — önce `tools/spacing-check.js` yaz.** Ölçemeden düzeltme yapma.
Sonda: `#playersLayer` çocuklarının `transform="translate(x,y)"` değerleri + `#liveBall`.
Playwright'ta arka plan kısıtlaması için `--disable-background-timer-throttling` kullan.
Rapor edeceği metrikler ve hedefleri:

| Metrik | Hedef |
|---|---|
| Set hücumunda ortalama ikili mesafe | ≥ 4,5 m |
| Set hücumunda en yakın ikili mesafe | ≥ 3,5 m |
| Hücumun kapladığı alan / yarı saha | ≥ %30 |
| Orta üçte bir bandındaki oyuncu oranı (set fazında) | < %20 |
| Boyada en az 1 hücumcu olan kare oranı | ≥ %60 |
| Topu tutana en yakın savunmacı | < 1,8 m |
| Adamından > 5 m uzaktaki savunmacı oranı | %0 |

**2) F11-1 — set dizilimine geçişi onar.** Kök neden; çoğu metriği tek başına düzeltir.
Kabul: set hücumunda hücum oyuncularının x ortalaması saldırılan potanın yarısında
(sol potaya hücumda x < 340, sağ potaya hücumda x > 600); orta üçte birdeki oran < %20.

**3) F11-6 — `startMatch()` sessiz kilitlenmesi.** Bağımsız kritik hata, kısa iş.
Kayıtta bulunan durum: buton `⏳ Maç Devam Ediyor`, tabela `BEKLEMEDE`, `mState` boş,
`G.pendingMatch.sig === 'lig|109'` kilitli duruyor, `startMatch()` çağrılınca **hata yok,
bildirim yok, hiçbir şey olmuyor.** Oyun kalıcı sıkışıyor.
Düzeltme: açılışta `pendingMatch` var ama `mState` boşsa buton `▶ Maçı sonuçlandır` olsun ve
kilitli sonucu uygulasın. `startMatch()` **hiçbir dalda sessizce dönmesin** — her erken çıkış
bir `showNotif` bassın.

**4) F11-2 — dizilim koordinatlarını genişlet.** Saha `viewBox 0 0 940 500`, sol pota
`[102.6, 250]`, 3 sayı yayı yarıçapı `196`. Sol potaya hücum eden takım için
(index = rol: 0 PG … 4 C):

```js
/* 5-OUT — herkes yay dışında, boya boş (modern dizilim) */
const SET_5OUT = [
  [315,250],   /* 0 PG — yay tepesi */
  [248,110],   /* 1 SG — sol kanat  */
  [248,390],   /* 2 SF — sağ kanat  */
  [112, 45],   /* 3 PF — sol köşe   */
  [112,455],   /* 4 C  — sağ köşe   */
];
/* 4-OUT 1-IN — dört dışarıda, bir büyük düşük postta */
const SET_4OUT1IN = [
  [315,250],   /* 0 PG — yay tepesi */
  [248,110],   /* 1 SG — sol kanat  */
  [248,390],   /* 2 SF — sağ kanat  */
  [112, 45],   /* 3 PF — sol köşe   */
  [150,195],   /* 4 C  — düşük post (boyada) */
];
```
Bu koordinatlarda en yakın ikili mesafe **155 px = 4,6 m** — kural sağlanıyor.
Mevcut `SET_SPREAD`'de en yakın ikili ~88 px = 2,6 m; **onu da genişlet.**

**5) F11-4 — savunma mesafe bantları.** `_defGap()` çıktısını şu bantlara sabitle:

| Durum | Adamına mesafesi | Nerede durur |
|---|---|---|
| Topu tutan adam | **1,0–1,5 m** (34–50 px) | Adam ile pota arasında |
| Bir pas ötesi | 2,0–3,0 m (67–100 px) | Pas çizgisini kesecek şekilde |
| Yardım tarafı | 3,0–4,5 m | **Boyaya kayar**, adamını bırakır |

**6) F11-3 — boyada oyuncu.** `SET_4OUT1IN` / `SET_POST` kullanılınca pivot boyaya girmeli.
Hücum ribaundunda 2 oyuncu boyaya yaklaşmalı. Kabul: set karelerinin ≥ %60'ında boyada
en az 1 hücum oyuncusu.

**7) F11-5 — aynalama.** İki takımın birbirini aynalaması basketbolda görülmez. Savunma dizilimi
**hücum dizilimine göre** kurulmalı (her savunmacı adamı ile pota arasında), bağımsız bir
şablona göre değil. Muhtemelen 1 ve 5 çözülünce kendiliğinden düzelir.

## Bölüm 1 regresyon kapısı

Her adımdan sonra `node tools/spacing-check.js` çalıştır. Bölüm sonunda:

```
node tools/spacing-check.js      → tüm hedefler tutmalı
node tools/live-metrics.js --ms=360000   → orphan 0 · kimlik %100 · ışınlanma 0 kare
node tools/box-band.js --n=200   → 11/11
node tools/band.js               → ec630b3a512bb3b2  ← DEĞİŞMEMELİ
```

> **Kritik:** FAZ 11 **yalnız sunum** düzeltmesidir. `band.js` hash'i **aynı kalmalıdır**.
> Hash değiştiyse maç matematiğine dokunmuşsun demektir — geri al.

---

# BÖLÜM 2 — FAZ 12: MOBİL ARAYÜZ

**Tam belge: `REVIZE-PAKETI-FAZ12.md`. Oku ve uygula.**

Kullanıcının cümlesi: *"application kısmının telefondaki mobilde kafa karıştırıcı olmaması
lazım. Az tıkla her şey yapılabiliyor olması lazım ki oyunu sevsin."*

## Ölçülen durum (390×844)

| İş | Bugün | Hedef |
|---|---|---|
| Lig tablosunu gör | 2 dokunuş | **1** |
| Sıradaki maçı gör | 2 | **1** |
| Maçı izle | 3 | **2** |
| İlk 5'i düzenle · taktik değiştir · antrenman | 4 | **2** |
| Oyuncu satın al | 5 | **3** |

Maç sayfasında **tabela ekranın %45'ini**, canlı saha yalnız **%24'ünü** kaplıyor;
`Maçı Başlat` butonu **y ≈ 2093 px** — 2,5 ekran aşağıda. Oyunun en önemli eylemi en derinde.

## Uygulama sırası

**1) F12-1 — alt sekme çubuğu (KRİTİK).** Tek maddede tüm gezinme 2 → 1 dokunuş.
Kenar menü masaüstünde kalsın; `@media(max-width:768px)` altında ekranın altına sabit 5'li çubuk:

```
┌─────┬─────┬─────┬─────┬─────┐
│ 🏠  │ 👥  │ 🏀  │ 🏆  │ 💰  │
│ Ana │Kadro│ Maç │ Lig │Market│
└─────┴─────┴─────┴─────┴─────┘
```
- Yükseklik **56 px** + `env(safe-area-inset-bottom)` (iPhone çentiği)
- Aktif sekme turuncu, diğerleri gri
- `position:fixed; bottom:0` + içerik kabına `padding-bottom:56px`
- Kalan sayfalar (Altyapı, Antrenman, Arena, Bilanço, Analiz, Takım) hamburgerde kalsın

**2) F12-2 — mobil maç sayfasını yeniden sırala (KRİTİK).** Yeni sıra, 390 px genişlikte:

| # | Bölüm | Hedef yükseklik |
|---|---|---|
| 1 | Kompakt tabela — tek satır `Ev **0** — **0** Deplasman`, altında `1P 10:00` | 80 px |
| 2 | **Canlı saha** — tam genişlik, kenar boşluğu yok | ~260 px |
| 3 | Eylem şeridi — `▶ İzle` · `⏸ Mola` · `🎧 Manuel` · `⚙ Taktik` | 56 px |
| 4 | Anlatım akışı (son 3 satır, genişletilebilir) | ~120 px |
| 5 | Maç içi istatistik (katlanmış) | 44 px kapalı |
| 6 | Şut haritası filtreleri (katlanmış) | 44 px kapalı |

Ayrıca: dikey tabelayı mobilde yatay yap (`flex-direction:row`); `"O = isabetli şut…"` açıklamasını
**ⓘ** simgesine al; sahanın altın çerçevesini mobilde inceltip 40 px → 8 px yap; şut haritasının
6 radyo düğmesini tek `<select>`e ya da katlanır bölüme çevir.

**3) F12-3 — birincil eylem mobilde sticky.** Alt çubuğun hemen üstünde sabit dursun:
Maçlar → `▶ Maçı İzle` · Kadro → `✓ İlk 5'i Kaydet` · Market → `Teklif Ver` ·
Antrenman → `Antrenmanı Uygula`.

**4) F12-4 — bilgi yoğunluğu.** Analiz sayfasında `GALİBİYET`/`SAYI ORT.`/`AVERAJ` kartları
üçü birlikte 420 px — üç sayı için ekranın yarısı. Aynı desen Arena, Bilanço, Antrenman'da da var.

```css
@media(max-width:768px){
  .stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
  .stat-row .stat{padding:10px 6px;text-align:center;}   /* ~72 px toplam */
  .stat-row .stat .label{font-size:10px;opacity:.7}
  .stat-row .stat .value{font-size:20px;font-weight:800}
}
```

**5) F12-6 — market.** Bugün 108 etkileşimli öğe var. Mobilde varsayılan görünüm **Liste**;
kart başına tek eylem `Teklif Ver`; üstte sabit filtre şeridi `Mevki · Bütçeme uygun · OVR`;
sonsuz kaydırma yerine 10'ar oyuncu + "Daha fazla".

**6) F12-5, F12-7, F12-8 — cila.** Boş durum ekranları (veri yokken sayfayı alt çubukta gösterme
ya da tek satır + eyleme buton); üst bar başlığı mobilde kısa (`ANALİZ`) veya
`white-space:nowrap; font-size:clamp(14px,4vw,20px)`; `tb-icon` (38×44), `market-tab` (171×39),
`fbtn` (39×44) dahil 7 seçiciye `min-height:44px`.

## Ana Panel — tasarım ilkesi

Telefonda oyuncu **ayaküstü, tek elle, 30 saniyeliğine** giriyor. İlk ekranda kaydırmasız
üç soru cevaplanmalı:

1. **Sıradaki maçım ne zaman?** (bugün var — iyi)
2. **Bir şey yapmam gerekiyor mu?** (sakat oyuncu, düşük moral, gelen teklif, ayarlanmamış taktik)
   → **bugün cevabı hiçbir yerde yok.** Alt çubuktaki Kadro ve Maç sekmelerine
   **"yapılacaklar" rozeti** (kırmızı sayı) koy.
3. **Ligde neredeyim?**

## Bölüm 2 kabul kapısı — `tools/mobile-check.js` yaz

390×844 viewport'ta çalışsın ve şunları ölçsün:

| Ölçüm | Hedef |
|---|---|
| Ana Panel · Kadro · Maç · Lig · Market'e ulaşma | **1 dokunuş** |
| Maçı izleme | **2 dokunuş** |
| İlk 5 düzenleme · taktik değiştirme | **2 dokunuş** |
| Oyuncu satın alma | **3 dokunuş** |
| Maç sayfasında birincil eylemin derinliği | **< 0,5 ekran** |
| Maç sayfasında sahanın ekran payı | **> %30** |
| Tek sayı gösteren kartın yüksekliği | **< 100 px** |
| Yatay taşma (10 sayfa) | **0 px** (bugün sağlanıyor — korunmalı) |
| 44 px altı dokunma hedefi | **0** |
| Market ilk ekranındaki etkileşimli öğe | **≤ 25** |

Ayrıca `node tools/visual-check.js` ve `node tools/faz7-check.js` geçmeye devam etmeli.

---

# BÖLÜM 3 — MAÇ MOTORUNU `G`'DEN AYIR

**Gerekçe: `KARAR-SUNUCU.md` madde 3.0. Sunucu kodu yazılmadan önce yapılacak, tamamen yerel iş.**

## İki engel (ölçüldü, tahmin değil)

**Engel 1 — rakibin kadrosu yok, sadece adı var.** `js/match-prep.js:440`:
```js
function pseudoTeamStrength(isim, tblKey){
  return 58 + (seqFromName(String(isim), tblKey||'tbl') % 4200)/100 + botManagerTitles(isim)*0.4;
}
```
Rakibin gücü **takım adının hash'inden** üretiliyor. Bugün maç "senin kadron ↔ bir sayı".
İki gerçek oyuncu karşılaşınca rakibin **gerçek oyuncuları, taktikleri ve formu** hesaba girmeli.

**Engel 2 — motor tek küresel `G` durumuna bağlı.** `generateMatchEvents(rakip, opts)` içeride
`G.wins`, `G.team`, `G.tactics`, `matchLineup()` kullanıyor — "şu an bu tarayıcıda oturan tek
oyuncu" varsayımı. Sunucu aynı anda 800 maç oynatırken tek `G` olamaz.

## Hedef sözleşme

```js
// bugün:  generateMatchEvents(rakip, opts)      → G'ye bağımlı, rakip = isim
// hedef:  simulateMatch({ homeRoster, awayRoster,
//                         homeTactics, awayTactics,
//                         seed })                → saf fonksiyon, G yok
```

## Bilinen iyi haber (ölçüldü)

12 js dosyasının tamamı sahte bir `window` nesnesiyle **saf Node'da hatasız yüklendi**;
`genRoster(12)` 15 kişilik kadro üretti. Yalnız `js/main.js` (arayüz bağlantıları) yüklenmiyor —
o zaten sunucuya gitmeyecek. `js/match-engine.js`'teki 27 `document` kullanımının **hepsi çizim
fonksiyonlarında**, simülasyon mantığında değil. Ayrıştırma temiz bir sınırdan geçiyor.

> **Düzeltme notu:** `PLAN-COK-OYUNCULU.md` ve `PLAN-LIG-YAPISI.md` bölüm 7 "motor zaten Node'da
> çalışıyor, `box-band.js` bunu yapıyor" diyor. **Bu yanlış** — `box-band.js` Playwright ile
> başsız bir *tarayıcı* açıyor, saf Node değil. Sonuç yine olumlu ama gerekçe düzeltilmeli.

## Yapılacaklar

1. `js/match-engine.js` içinde **simülasyon** ile **çizim** kodunu ayır. Çizim `document`
   kullanabilir; simülasyon **hiçbir DOM API'sine dokunmasın.**
2. Simülasyondaki her `G.x` okumasını parametreye çevir.
3. `pseudoTeamStrength` yolunu koru ama **ikinci bir yol aç:** rakip gerçek kadroysa
   gücü kadrodan hesapla (`computeRosterOfrDef` zaten var, iki tarafa da uygula).
4. `seed` parametresi ekle — aynı tohum aynı maçı üretsin (deterministik).
5. **Yeni araç `tools/sim-node.js`:** motoru Playwright'sız, saf Node'da çağırıp maç oynatsın.
   Kabul: `node tools/sim-node.js --n=50` tarayıcı açmadan 50 maç oynatıyor.

## Bölüm 3 kabul kapısı

- `node tools/sim-node.js --n=50` → tarayıcısız çalışıyor, konsol hatası 0
- Aynı `seed` ile iki çalıştırma **birebir aynı** skoru ve olay listesini veriyor
- `node tools/box-band.js --n=200` → **11/11** (denge bantları korunuyor)
- `node tools/spacing-check.js` → Bölüm 1'de tutan hedefler hâlâ tutuyor
- `node tools/visual-check.js` → çıkış kodu 0

> `band.js` hash'inin bu bölümde **değişmesi beklenir** (motor sözleşmesi değişti). Değişirse
> `box-band` bantlarını kontrol et ve yeni hash'i `KALDIGIM-YER.md`'ye referans olarak yaz.

---

# BÖLÜM 4 — `db/schema.sql` (yalnız dosya — hesap açma, ödeme yok)

Sunucu kararı **Supabase** (`KARAR-SUNUCU.md`). Bu bölümde **hiçbir hesap açılmayacak, hiçbir
bağlantı kurulmayacak** — yalnız `db/schema.sql` dosyası yazılacak.

`PLAN-LIG-YAPISI.md` bölüm 7'deki taslağı gerçek `CREATE TABLE` ifadelerine çevir:

```
countries   id · ad · kod · aktif
leagues     id · country_id · seviye · grup · sezon
teams       id · league_id · ad · sehir · renk · logo · owner_user_id (NULL ise BOT)
            · kasa · arena_seviye
players     id · team_id · isim · poz · yas · ulke · statlar… · sozlesme
users       id · eposta · ulke · kayit_tarihi · son_giris
fixtures    id · league_id · sezon · tur · ev_team_id · dep_team_id · oynanma_zamani · durum
results     fixture_id · ev_skor · dep_skor · olaylar(jsonb) · box(jsonb)
standings   league_id · sezon · team_id · o · g · m · sf · sa · puan
transfers   id · player_id · from_team · to_team · bedel · tarih
```

Şemaya **`PLAN-LIG-YAPISI.md`'deki lig kurallarını** yansıt:

- `teams.owner_user_id` **NULL ise bot** — ayrı bot tablosu yok. Devralma = bu alana kullanıcı
  kimliğini yazmak; **kadroya dokunulmaz.**
- **İki bot kategorisi ayrıdır** ve şemadan ayırt edilebilmeli:
  **sistem botu** (`owner_user_id IS NULL`, devralma havuzunda, sınırsız lig düşebilir) ile
  **terk edilmiş takım** (`owner_user_id` dolu + `users.son_giris` eski; asla devralma havuzuna
  girmez, sezonda en fazla 1 lig düşer, bot düzeltmesinden korunur).
  Bunun için `teams`'e `bot_controlled boolean` ve `abandoned_since timestamptz` alanları ekle.
- Lig: **18 takım**, 17 maç, tek devreli. Sezon **2 ay**, ayın 1'inde başlar.
- **Play-off yok.** 1. doğrudan çıkar; **2–5** yükselme maçı oynar; son sıra doğrudan düşer;
  **15–17** düşme maçı oynar. `fixtures.tur` bunları ayırt edebilmeli (`lig` / `yukselme` / `dusme`).
- `results.olaylar` **jsonb** ama **büyüyor**: sezon başına ~14.000 maç × ~10 KB ≈ 140 MB.
  Şemaya bir yorum satırı koy: tam olay dökümü tohumdan yeniden üretilebilir; kalıcı saklanacak
  şey **skor + box özetidir.**
- Her tabloya **Row Level Security politikası taslağı** yaz (yorum olarak yeter):
  kullanıcı yalnız `owner_user_id = auth.uid()` olan takımı yazabilir; okuma herkese açık.

**Kabul:** `db/schema.sql` dosyası var, sözdizimi geçerli, yukarıdaki her kural şemada ya alan
ya kısıt ya da yorum olarak karşılanmış. **Kod tabanında hiçbir yerde Supabase bağlantısı
kurulmuyor** — bu bölüm yalnız dosya üretir.

---

# BÖLÜM 5 — BELGE GÜNCELLEMELERİ

1. **`CLAUDE.md` satır 20** — "Sunucu/veritabanı yoktur" ifadesini düzelt. Yerine:
   *Charazay baştan beri çevrimiçi çok oyunculu olarak tasarlandı; maçlar fikstür tarihinde
   otomatik oynanır. Maçların bugün art arda oynanabilmesi bilinçli bir test kolaylığıdır,
   hata değildir. Sunucu kararı Supabase; kod henüz yazılmadı.*
   Ayrıca lig yapısının özetini ekle (18 takım, 2 aylık sezon, play-off yok, ülke başına lig).
2. **`PLAN-COK-OYUNCULU.md` ve `PLAN-LIG-YAPISI.md` bölüm 7** — "motor zaten Node'da çalışıyor"
   gerekçesini Bölüm 3'teki ölçülmüş gerçekle değiştir.
3. **`KALDIGIM-YER.md` ve `PROGRESS.md`** — her bölümden sonra güncelle; yeni araçları
   (`spacing-check.js`, `mobile-check.js`, `sim-node.js`) doğrulama komutları tablosuna ekle.

---

# GENEL KURALLAR

- **Mevcut kodu silme veya bozma.** Minimal değişiklik yap, düzenlemeyi yeniden yazmaya tercih et.
- Her bölüm sonunda **commit at** ve `KALDIGIM-YER.md`'yi güncelle.
- Bir hatayı düzelttikten sonra **aynı hatayı diğer dosyalarda da ara.**
- "Uyguladım" demeden önce **ölç.** Her bölümün kabul kapısı yukarıda yazılı.
- Emin olmadığın bir şey varsa tahmin etme — dur ve sor.
- Script sürümünü (`?v=`) js dosyaları değiştiğinde artır. Şu an `v=41`.

## Bölüm sonu tam regresyon (hepsi geçmeli)

```
node tools/anlatim-check.js            (YENİ — Bölüm 0)
node tools/spacing-check.js            (YENİ — Bölüm 1, 29.54 px/m ile)
node tools/mobile-check.js             (YENİ — Bölüm 2)
node tools/sim-node.js --n=50          (YENİ — Bölüm 3)
node tools/season-loop.js --n=3 --runs=3
node tools/faz6-check.js
node tools/faz7-check.js
node tools/faz8-check.js
node tools/faz10-check.js
node tools/m20-check.js
node tools/sunum-check.js --ms=300000
node tools/visual-check.js
node tools/live-metrics.js --ms=360000
node tools/box-band.js --n=200
node tools/band.js
node tools/i18n-scan.js
```
