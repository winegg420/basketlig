# CHARAZAY 2.0 — BÜYÜK REVİZE PAKETİ
**Tarih:** 2026-08-29 · **Hedef:** Steam yayınına hazır, profesyonel kalite
**Yöntem:** Kod taraması (`js/*.js`, 14.238 satır) + **canlı tarayıcı ölçümü** (basketlig.vercel.app, gerçek maç, 6.772 animasyon karesi, 2,5 periyot)

> Bu belge Claude Code oturumuna girdi olarak yazıldı. Her madde: **kanıt → kök neden → minimal düzeltme → kabul kriteri**.
> Fazlar sırayla uygulanmalı; FAZ 1 çözülmeden FAZ 3'ün ölçümü anlamsızdır.

---

## 0. YÖNETİCİ ÖZETİ

Canlı maç sunumunda **üç bağımsız zaman ekseni** var ve hiçbiri diğerine bağlı değil:

1. **Maç saati** — olay üretiminde `t -= rand(10,20)` ile düşer
2. **Sahne (animasyon)** — `requestAnimationFrame`, kendi sim-saniyesiyle akar
3. **Olay kuyruğu** — `setTimeout(matchStep, delay)`, sabit taban gecikmelerle ilerler

Üçü arasında **geri besleme yok**. Sonuç: saat gerçek zamanın 2–44 katı hızda akıyor, koreografi bitmeden bir sonraki olay onu kesiyor, anlatımda adı geçen oyuncu ile sahada topu tutan jeton **%87 oranında farklı**.

Kullanıcının iki şikâyeti tek tek şuraya bağlanıyor:
- **"Maç çok hızlı akıyor"** → M1, M2 (kök) · destekleyici M10, M11, M13
- **"Topla oyuncular alakasız gösteriliyor"** → M7, M8, M9 (kimlik/yön) · M5, M6 (top ışınlanması) · M3, M4 (kaybolan geri çağrı)

Ayrıca **oyun dengesinde** ölçülen iki ciddi sapma var: yarı maçta **1 top kaybı** (gerçekçi: ~14) ve sayıların **%33'ü serbest atıştan** (gerçekçi: ~%16).

---

## 1. CANLI ÖLÇÜM SONUÇLARI (kanıt)

Sayfaya ölçüm sondası enjekte edildi; gerçek bir lig maçı (dasd – Konya BK) izlendi.

### 1.1 Maç saati / gerçek zaman oranı

Anlatım satırlarının damgası ile duvar saati karşılaştırıldı (25 ölçüm):

| Metrik | Değer | Gerçekçi olması gereken |
|---|---|---|
| Medyan hız oranı | **5,1×** | 1,0–1,5× (izleme sıkıştırması) |
| En yavaş | 2,3× | — |
| **En hızlı** | **43,8×** | — |
| Tipler arası fark | **19 kat** | < 1,5 kat |

Örnek ham veri:

| Olay | Oyun sn | Gerçek sn | Oran |
|---|---|---|---|
| `Shai Davis ÜÇLÜĞÜ GÖMDÜ` | 10 | 4,37 | 2,3× |
| `Bogdan Silva buldu; Ja Brown POTAYA ASILDI` | 17 | 4,19 | 4,1× |
| `Savunma faulü — Devin Martinez çizgiye gidiyor` | 13 | 0,93 | **14,1×** |
| `Jonas Lewis bindirmede faul kazandı, 2 atış` | 16 | 0,58 | **27,4×** |
| `Faul düdüğü — Devin Martinez çizgide` | 19 | 0,43 | **43,8×** |

**Yorum:** Şutlu pozisyonlar ~2–5× akıyor, faul/taktik/serbest atış olayları ~20–44× akıyor.
Kullanıcının "bazen çok hızlı" dediği şey tam olarak bu **düzensizlik**: normal seyrederken maç aniden 19 saniye atlıyor.

### 1.2 Anlatım–görüntü kimlik uyumu

Anlatım satırındaki oyuncu adı ile o an topu tutan jetonun adı karşılaştırıldı (23 ölçüm):

| Sonuç | Adet | Oran |
|---|---|---|
| Eşleşen | 3 | **%13** |
| **Uyuşmayan** | **20** | **%87** |

Örnekler:

| Anlatım | Sahada topu tutan |
|---|---|
| `Shai Davis logodan denedi ve GİRDİ!` | **Clark** |
| `James Jones skora üç ekledi` | **Martinez** |
| `Giannis Nakamura üçlük kısa düştü!` | **Brown** |
| `Devin Martinez ıskaladı, seyirci sustu!` | **Wilson** |
| `Ja Brown serbest atışlarda 2/2` | **Wilson** |

### 1.3 Top ışınlanması

| Metrik | Değer |
|---|---|
| Ölçülen kare | 6.772 |
| **900 px/sn üstü top hareketi** | **542 kare (%8,0)** |
| En hızlı sıçrama | **7.580 px/sn** (tek karede 124 px) |
| Ölçek karşılığı | **~226 m/sn** |

Ek olarak doğrudan gözlem: top sağ pota altındayken (x≈865) **10 oyuncunun tamamı** sol yarı sahadaydı (x = 176–327).

### 1.4 Oyuncu jeton hızları

| Yüzdelik | px/sn | m/sn karşılığı |
|---|---|---|
| p50 | 218 | 6,5 |
| p90 | 451 | 13,4 |
| p99 | **491** | **14,6** |
| max | **1.948** | **58,1** |

Referans: Usain Bolt zirve hızı **12,4 m/sn**. Oyuncuların **%10'u sürekli Bolt'tan hızlı** koşuyor.

### 1.5 Denge ölçümü (devre arası box score)

| İstatistik | Ev | Deplasman | Toplam | Gerçekçi (yarı maç) |
|---|---|---|---|---|
| 2 sayı | 5/12 | 11/21 | 33 deneme | ~55 |
| 3 sayı | 7/13 | 5/15 | 28 deneme | ~35 |
| **Serbest atış** | **15/20** | **6/10** | **30 deneme** | **~22** |
| Faul | 6 | 11 | 17 | ~19 |
| Ribaund | 15 | 16 | 31 | ~44 |
| **TOP KAYBI** | **1** | **0** | **1** | **~14** |

**İki ciddi sapma:**
- **Top kaybı neredeyse yok** (20 dakikada 1). Basketbolun temel istatistiklerinden biri oyunda fiilen mevcut değil. Pres savunması, çalma taktiği, oyun kurucu kalitesi anlamsızlaşıyor.
- **Serbest atış enflasyonu:** ev sahibinin 46 sayısının **15'i (%33)** serbest atıştan. Gerçekte bu oran ~%16.

### 1.6 Diğer gözlemler

- **Varsayılan izleme hızı 1.5×** — kullanıcı hiçbir şey yapmadan maç %50 hızlandırılmış başlıyor. "Çok hızlı" hissinin bir kısmı doğrudan bu.
- Konsol hatası tespit edilmedi (temiz).
- FPS 50,2 — sahne akıcı; sorun performans değil, **zamanlama mimarisi**.

---

## FAZ 1 — ZAMAN SENKRONU (KRİTİK · önce bu)

> Kök sorun. Diğer her şeyin ölçümü buna bağlı. Tek başına uygulandığında kullanıcının şikâyetinin ~%60'ını çözer.

### M1. Maç saati ile sahne süresi arasında hiçbir bağ yok
**Dosya:** `js/main.js:276-283` + `js/match-engine.js:2290-2293`, `1705-1707` · **KRİTİK**

`generateMatchEvents` saati `t -= rand(decLo,decHi)` ile 10–20 sn düşürüyor (`match-engine.js:2292`).
`matchStep` ise gecikmeyi tamamen ayrı hesaplıyor:
```js
simMs = ev.shot ? (_animMs + 240) : max(taban, mvMs + 260);
startClockTween(ev.t, delay);   // 10-20 sn'yi delay boyunca akitir
```
Tipik şutlu pozisyonda `_animMs ≈ 4,2–5,8 sn` → `delay ≈ 3,0–4,0 gerçek sn`. **15 sn'lik pozisyon 3,5 sn'de** oynanıyor.

**Düzeltme (minimal):**
1. `runPossession` tükettiği saniyeyi olaya damgalasın: `ev.dt = rand(decLo, decHi)`
2. `matchStep` şunu kullansın:
```js
const SCALE = 0.30;                     // izleme sikistirma katsayisi (ayarlanabilir)
const dtMs  = (ev.dt || 12) * 1000 * SCALE;
const delay = Math.max(simMs, dtMs) / rate;
```
`SCALE = 0.30` → 15 sn'lik pozisyon 4,5 sn'de oynanır; oran her olay tipinde **sabit 3,3×** olur.

**Kabul kriteri:** Hız oranının olay tipine göre standart sapması **< %20**; medyan 3,0–3,5× bandında.

---

### M2. Şutsuz olaylarda sabit taban gecikme → tempo patlaması
**Dosya:** `js/main.js:276` · **KRİTİK**

```js
const simBase = ev.shot ? (_animMs+240)
              : (ev.type==='free' ? 1700
              : (quarter_start|quarter_end|tactic ? 1500 : 1300));
```
`steal` → `simMs = max(1300, 1250+260) = 1510` → 1.5× hızda **1.007 ms**. Ama o pozisyon saatten yine 10–20 sn yiyor → **~15× hızlanma**.
Ölçümde `foul` 43,8×, `tactic` 22,1×, `free` 27,4× çıkması bunun doğrudan sonucu.

**Düzeltme:** M1'deki `ev.dt` tabanını şutsuz olaylara da uygula. Sabit `1300/1500/1700` yalnızca **alt sınır** olarak kalsın, üst sınırı `ev.dt` belirlesin.

**Kabul kriteri:** Hiçbir olay tipinin medyan oranı 6×'i geçmesin.

---

### M10. Animasyon sim-saniyesi, kuyruk duvar saati — geri besleme yok
**Dosya:** `js/match-engine.js:264-292` (`_simStart`/`_simStep`) ↔ `js/main.js:283` · **YÜKSEK**

- Sahne: `dtReal = Math.min(0.05, (ts-S.last)/1000)` → **20 FPS altında sim zamanı geriye düşer**, kayıp asla telafi edilmez (`guard++<12`, kare başına en fazla 0,4 sim-sn).
- Kuyruk: `setTimeout(matchStep, delay)` — animasyonun bittiğini **hiç sormaz**.
- **Arka plan sekmede** `rAF` tamamen durur, `setTimeout` ~1 sn'de bir tetiklenmeye devam eder → sim donmuşken `mState.idx` ilerler; o süredeki **tüm basket cümleleri kaybolur**.

**Düzeltme:**
1. `_script`'e `onEnd` geri çağrısı ekle; `matchStep`'i `Math.max(timer, scriptEnd)` ile tetikle.
2. `document.hidden` iken `matchStep` zamanlayıcısını duraklat, `visibilitychange`'de devam ettir.

**Kabul kriteri:** Sekme 30 sn arka plana alınıp dönüldüğünde tek bir anlatım satırı kaybolmasın, skor sıçraması olmasın.

---

### M11. Maç ortasında hız değiştirilince o anki olay kesiliyor
**Dosya:** `js/main.js:279-283`, `293-308` (`setMatchRate`) · **ORTA**

`delay` olay **başlarken** o anki `rate` ile hesaplanıp `setTimeout`'a veriliyor; `_simStep` ise `mState.rate`'i **her karede canlı** okuyor (`match-engine.js:286`). 3× → 1× yapılınca sahne yavaşlar ama zamanlayıcı eski kısa süreyle ateşler → koreografi yarıda kesilir.

**Düzeltme:** `setMatchRate` içinde aktif `matchEventTimer`'ı iptal edip **kalan süreyi yeni rate'e göre yeniden ölçekleyerek** kur.

---

### M16. Varsayılan izleme hızı 1.5× · **YENİ (canlı gözlem)**
**Dosya:** `js/main.js` (`mState.rate` başlangıç değeri) · **ORTA**

Oyun, kullanıcı hiçbir şey seçmeden **1.5× hızda** başlıyor. FAZ 1 düzeltmelerinden sonra varsayılan **1×** olmalı; 1.5× açıkça seçilebilir bir tercih olarak kalsın.

**Ek öneri:** Hız butonlarının yanındaki "hareketin ve anlatımın hızını birlikte ölçekler" açıklaması FAZ 1 sonrası **doğru** hale gelecek — şu anda yanıltıcı.

---

### M13. Set fazının fiilî ömrü ~1,9 sn; jetonlar 14,6 m/sn koşmak zorunda
**Dosya:** `js/match-engine.js:1302-1360`; hız tanımı `100-110`, `196` · **ORTA**

`tSet = tOff + bringT`, `tFire = tSet + ~1,85`. Dizilim kurulup şut atılana kadar **1,85 sim-sn** var; bu sürede oyuncular 600–800 px yol almak zorunda.
`_tokBaseV` 130–210 px/sn, `sprintV = baseV × 1,62` → 210–340 px/sn. **Canlı ölçümde p99 = 491 px/sn (14,6 m/sn)** — model sınırının da üstünde, yani `keepNear:false` yüzünden hedefler sürekli yeniden atanıyor.

**Düzeltme (M1'den SONRA):** Pozisyona 8–12 sim-sn bütçe geldikten sonra
`tSwing` / `tKey` aralıklarını **2–3 katına** çıkar; `sprintV` çarpanını `1.62 → 1.35` indir; `_setFormation`'da hedefe 20 px'den yakın jetonu yeniden hareketlendirme (`keepNear:true`).

**Kabul kriteri:** Jeton hızı p99 **< 340 px/sn (10,1 m/sn)**; dizilim şuttan en az 1,5 sn önce oturmuş olsun.

---

## FAZ 2 — KİMLİK TUTARLILIĞI (anlatımdaki oyuncu = sahadaki jeton)

> Ölçülen uyumsuzluk **%87**. Kullanıcının "alakasız gösteriliyor" dediği şeyin doğrudan kaynağı.

### M7. Rakip ilk 5'i motor ile sahne arasında uyuşmuyor (sakat filtresi eksik)
**Dosya:** `js/main.js:136` ↔ `js/match-engine.js:1834-1836`; kullanım `1124-1127` · **YÜKSEK**

- `main.js:136`: `oppFive = prof.roster.sort(genel).slice(0,5)` — **sakatlık filtresi yok**
- `match-engine.js:1834-1836`: `oppHealthy = oppFull.filter(sakat değil)` → `oppCourt = oppPool.slice(0,5)`

Rakipte **tek bir sakat oyuncu** varsa iki liste kayıyor. Sonuç:
```js
if(sh.sid!=null) shooter = offP.find(p=>p.pl && p.pl.id===sh.sid) || null;
if(!shooter){ /* sut noktasina EN YAKIN jetonu sec */ }
```
`sid` sahada bulunamayınca **şut noktasına en yakın jeton** şutu atıyor.
Aynı kopukluk `reb` (`1013`), `steal` (`1039`), serbest atış (`963`) dallarında da var.

**Düzeltme:**
1. Kısa yol: `main.js:136`'ya aynı sakatlık filtresini ekle.
2. **Doğru yol:** motor kullandığı `oppCourt`'u dışa versin (`events[0].oppFive`), `main.js` onu kullansın. Tek doğruluk kaynağı olsun.
3. `shooter` bulunamazsa **sessizce en yakını seçme** — konsola uyarı bas ve olayı atla (hata gizlenmesin).

**Kabul kriteri:** FAZ 5'teki kimlik ölçümü **≥ %95 eşleşme** versin.

---

### M8. Bot koç olayları `off:false` damgalı → sahne ters yöne dönüyor
**Dosya:** `js/match-engine.js:1944`, `1953`, `1971` (`botCoachTick`) + `1090-1103` · **YÜKSEK**

`botCoachTick` mola / set değişimi / rotasyon olaylarını **sabit `off:false`** ile push ediyor. Bunlar yalnızca anons; pozisyon sahipliğiyle ilgisi yok. `movePlayersForEvent` bunları "Diğer" dalında işliyor:
```js
const needBall = (!b.carrier || offP.indexOf(b.carrier) < 0);
if(needBall) _ballHold(pg);          // pg = BOTUN oyun kurucusu
_setFormation(offLeft, offP, defP, null, {phase:'set'});
```
Kullanıcı hücumdayken bot değişiklik yaparsa **10 jeton ters yöne dizilir, top rakip kurucusuna uçar**, bir sonraki olayda her şey geri döner.

**Düzeltme:** `sub` / bot-koç `tactic` olaylarına `off` yazma; `movePlayersForEvent` başına sahneye dokunmama kısa devresi ekle:
```js
if(ev.type==='sub' || (ev.type==='tactic' && ev.off===undefined)){ P(); return 0; }
```

---

### M9. Ribaund sonrası topu pivot getiriyor (outlet pas yok) + `bringT` yanlış hedefe göre
**Dosya:** `js/match-engine.js:1130`, `1304` · **YÜKSEK**

```js
let pg = (b.carrier && offP.indexOf(b.carrier)>=0) ? b.carrier : offR[0];
const bringT = fastBreak ? 0.85
             : Math.max(1.05, Math.min(2.2, etaTok(pg, _pt(TRANS_OFF[0], offLeft, false)[0], 250)));
```
Savunma ribaundundan sonra top ribaundçudadır (genelde C). O zaman `pg = C`:
1. **Çıkış (outlet) pası hiç yok** — pivot topu tek başına karşı sahaya sürüyor, oyun kurucu topa dokunmuyor.
2. `bringT`, `TRANS_OFF[0]` (PG kulvarı) noktasına göre ETA hesaplıyor; oysa C'nin hedefi `TRANS_OFF[4]`. **Gitmediği bir noktaya göre** süre biçiliyor.

**Düzeltme:** `pg.role` 3 veya 4 ise `tOff + 0.15`'te `_ballPass(offR[0], …)` outlet adımı ekle ve `pg = offR[0]` yap; `etaTok`'u `TRANS_OFF[pg.role]` ile çağır.

---

### M3. `clearBallTimers()` bekleyen geri çağrıları ÇAĞIRMADAN siliyor → anlatım satırı kayboluyor
**Dosya:** `js/match-engine.js:565-568`, `1112`; `js/main.js:200-211` · **KRİTİK**

```js
function clearBallTimers(){ ... S.script=[]; S.sIdx=0; S.sT=0; S.ball.onDone=null; S.chase=null; }
```
Şutlu olaylarda anlatım cümlesi + skor boyaması **yalnız `onResult` içinde** basılıyor. Top çembere varmadan bir sonraki olay tetiklenirse `onDone = null` olur ve **o basketin cümlesi hiç yazılmaz**; skor bir sonraki olayın `paintScore()`'uyla sessizce sıçrar.

Marj çok dar: `_animMs = (tFire+0.85)*1000`, top uçuşu `tFire + 0.32…0.78` → yalnız **0,31–0,77 sim-sn** pay.

**Düzeltme:**
1. `clearBallTimers()` silmeden önce bekleyen `S.ball.onDone` ve `S.chase.fn`'i **flush** etsin (`_flushPending()` yardımcısı).
2. `main.js:276`'daki şut gecikmesine `+shotDur` payı ekle.

**Kabul kriteri:** FAZ 5'teki "yorumsuz kalan olay" sayacı **0** versin.

---

### M4. `_chase` yarış durumu: top `pass`/`shot` moduna girerse geri çağrı asla çalışmaz
**Dosya:** `js/match-engine.js:311-323` · **YÜKSEK**

```js
if(!t || (b.mode!=='loose' && b.mode!=='rim')){ if(b.mode==='held') S.chase=null; }
else { ... if(d<r || c.t>c.max){ _ballHold(t); ... c.fn(); } }
```
Mod `pass` veya `shot` ise chase ne ilerletiliyor, ne iptal ediliyor, ne de `c.max` timeout'u kontrol ediliyor (timeout `else` bloğunda). Pas tamamlanınca mod `held` olur ve chase **fn çağrılmadan** null'lanır.
→ Sayı sonrası topu sokması gereken oyuncu topu almadan çizgiye yürüyor; top potanın altında yerde kalıyor.

**Düzeltme:** Timeout kontrolünü `if(S.chase)` bloğunun **en başına** al; mod uyumsuzluğunda `c.fn()` çağırıp temizle.

---

### M12. AND-1'de serbest atış hiç canlandırılmıyor
**Dosya:** `js/match-engine.js:2085`, `2183` · **ORTA**

`and1` dalında `B.ftAtt++` / `B.ftMade++` işleniyor ve skora +1 ekleniyor, ama olay `type:'score2'` + tek `shot` nesnesi olarak gidiyor; `ev.shots` yok → serbest atış dalı (`958`) çalışmıyor.
→ Sahada 2 sayılık şut görünürken tabela 3 artıyor, spiker "AND-1 tamam!" diyor ama çizgide kimse yok.

**Düzeltme:** `and1` olayına `ftShots:[{...kind:'ft'}]` ekle; şut koreografisinin sonuna tek atışlık kısa adım bağla.

---

## FAZ 3 — TOP FİZİĞİ / IŞINLANMA

> Ölçüm: karelerin **%8'inde** top 900 px/sn üstünde; zirve **7.580 px/sn (226 m/sn)**.

### M6. `_ballHold` uzun mesafeyi 0,30 sn'lik "pas"a çeviriyor
**Dosya:** `js/match-engine.js:419-423` · **YÜKSEK**

```js
if(d>30){ _ballPass(p, Math.max(0.12, Math.min(0.30, d/700))); return; }  /* isinlanma yok */
```
Üst sınır **0,30 sn**. `d = 400 px` için hız = 1.333 px/sn ≈ **40 m/sn**. `_ballPass`'in doğal hesabı (`d/520`, 0,90 sn'ye kadar) burada devre dışı.
Bu yol `reb` (`1029`), `quarter_start` (`932`), `foul` (`1064`) ve default (`1093`) üzerinden **düzenli** tetikleniyor.

**Düzeltme:** Üst sınırı `Math.min(0.9, d/520)` yap (yani `_ballPass` varsayılanını kullan).

---

### M5. `_inboundPass` topu ışınlıyor — "görünmez düzeltme" değil, tam dip çizgi mesafesi
**Dosya:** `js/match-engine.js:828-833`, ölü koruma `1269` · **YÜKSEK**

`animateShotPossession` satır **1112**'de `clearBallTimers()` çağırıyor → `S.chase = null`.
Satır **1269**'daki `if(!S.chase){ inb.tx = spot.x; inb.ty = spot.y; }` koşulu bu yüzden **her zaman doğru** (ölü kod koruması). Sokucu topu almadan çizgiye yürüyor; `tWalk`'ta:
```js
if(S && inb && S.ball.carrier!==inb){ S.chase=null; S.ball.mode='held'; S.ball.carrier=inb; ... }
```
Yorumda "birkaç px'lik düzeltme, görünmez" yazıyor ama top potanın altından dip çizgiye **~150–250 px** tek karede zıplıyor.

**Düzeltme:** Işınlama yerine pası **ertele** (bir sonraki tick'te tekrar dene) ya da `_ballPass(inb, kısa)` ile görünür toparlama yap. `1269`'daki koruma `S.ball.carrier !== inb` ile değiştirilsin.

---

### M14. Şut saati göstergesi pozisyonla senkron değil
**Dosya:** `js/main.js:310-345` (özellikle `318`) · **DÜŞÜK-ORTA**

- Hücum ribaundunda saat **24**'e dönüyor (FIBA kuralı: **14**).
- Hücum ribaundu yalnız ~%22 ihtimalle `reb` olayı üretiyor (`match-engine.js:2196`); üretmezse `off` değişmediği için **hiç sıfırlanmıyor** → `left = 24 - (anchor-now)` negatife düşüp gösterge boşalıyor.
- `mState._lastOff`, `_startBreak`/`_setupInbound` tarafından **animasyon ortasında asenkron** değiştiriliyor (`785`, `796`). *(doğrulanmalı)*

**Düzeltme:** Sıfırlamayı `ev.off` değişimine + `posNext` bilgisine bağla; hücum ribaundunda **14** kullan.

---

## FAZ 4 — OYUN DENGESİ / GERÇEKÇİLİK (canlı ölçümden)

### M17. Top kaybı fiilen yok — devre arasında **1** · **YENİ · KRİTİK**
**Ölçüm:** 20 dakikada toplam **1 top kaybı** (gerçekçi: ~14). Buna karşılık faul 17, serbest atış 30.

**Etkisi:** Pres savunması, "top çalma" taktiği, oyun kurucu kalitesi ve `to` (turnover) çarpanı olan **tüm playbook setleri anlamsız** — FAZ B'de eklenen `to` parametresi ölçülebilir bir sonuç üretmiyor.

**Yapılacak:** `runPossession` içinde turnover olasılığını üret. Hedef bant: **maç başına takım başına 11–15**. Kaynak dağılımı: pas hatası ~%45, çalma ~%35, adım/çift top ~%20. Rakip taraf için de simetrik işlemeli (bkz. RAPOR A1).

**Kabul kriteri:** 200 maçlık bant testinde takım başına ortalama top kaybı **12 ± 3**.

---

### M18. Serbest atış enflasyonu — sayıların %33'ü çizgiden · **YENİ · YÜKSEK**
**Ölçüm:** Ev sahibi 46 sayının **15'i** serbest atıştan (%33). Gerçekçi oran ~%16.
Yarı maçta 30 serbest atış denemesi (gerçekçi: ~22).

**Kök neden adayları (doğrulanmalı):**
- Şut anında faul olasılığı yüksek
- `and1` (M12) ayrı bir serbest atış üretiyor ama sahnede görünmüyor — sayım iki kez işliyor olabilir
- Faul disiplini eğilimi (FAZ A) etkiyi tek yönlü artırıyor olabilir

**Yapılacak:** Şut faulü olasılığını ~%35 düşür; `and1` sayımını doğrula. Hedef: serbest atış sayı payı **%14–19**.

---

### M19. Ribaund az — yarı maçta 31 (gerçekçi ~44) · **ORTA**
Kaçan şut sayısı düşük olduğu için kısmen doğal, ama hücum ribaundu oranı ayrıca kontrol edilmeli (M14'te "hücum ribaundu yalnız %22 ihtimalle olay üretiyor" notuyla birlikte).

---

### M20. Rakip takımlar hâlâ "soyut" (RAPOR A1) — **AÇIK · YÜKSEK**
Rakip kadrolar her maçta `getBotClubProfile()` ile yeniden üretiliyor; kalıcı oyuncu nesnesi, istatistik, faul, sakatlık tutulmuyor.
Bu, M7'nin (kimlik uyuşmazlığı), M17'nin (rakip top kaybı) ve RAPOR B3'ün (rakip sakatlık) **ortak altyapı sorunudur**.

**Yapılacak:** Lig takımlarına kalıcı kadro nesnesi ver; maç istatistiği, bireysel faul, sakatlık ve yorgunluk iki taraf için de aynı kod yolundan geçsin. **FAZ 2 ve FAZ 4'ün kalıcı çözümü buna bağlı.**

---

## FAZ 5 — ÖLÇÜM ARAÇLARINI GÜÇLENDİR (regresyon kalkanı)

> **Bu faz FAZ 1'den hemen sonra, düzeltmelerden ÖNCE yapılmalı** — yoksa iyileşmeyi ölçemeyiz.

### M15. Mevcut araçların kör noktaları
**Dosya:** `tools/realism-check.js:131`, `266-283`; `tools/measure.js:110-135`

| Kör nokta | Sonuç |
|---|---|
| Senkron ölçümü `if(cm) syncRows.push(...)` — **yorumsuz olay sessizce atlanıyor** | M3'teki kaybolan cümle görünmez |
| **Saat/gerçek zaman oranı hiç ölçülmüyor** | M1–M2 hiçbir metrikte yok |
| `fast` eşiği **430 px/sn**, motorun sprint sınırı 340 px/sn | Sayaç **tanım gereği hiç tetiklenmez** |
| Top ışınlanması ölçülmüyor (`tp` yalnız jetonlar için) | M5–M6 yakalanmaz |
| Anlatımdaki isim ile topu tutan jeton karşılaştırılmıyor | **%87'lik uyumsuzluk hiç görünmedi** |

### Eklenecek metrikler
1. **`syncRatio`** — olay tipine göre `Δev.t / Δwallclock` dağılımı (hedef: std sapma < %20)
2. **`orphanEvents`** — anlatım satırı üretmeyen olay sayısı (hedef: 0)
3. **`ballTeleport`** — kare başına top yer değiştirmesi > 60 px (hedef: 0)
4. **`identityMatch`** — anlatımdaki soyadı ile topu tutan jetonun soyadı (hedef: ≥ %95)
5. **`tokenSpeedP99`** — jeton hızı 99. yüzdelik (hedef: < 340 px/sn)
6. **`boxScoreBand`** — top kaybı / serbest atış payı / ribaund gerçekçilik bandı

> Bu belgeyi hazırlarken kullanılan sonda kodu doğrudan `tools/` altına taşınabilir: `#liveBall` ve `#playersLayer` üzerinden `transform="translate(x,y)"` okunuyor, `#commentary` MutationObserver ile izleniyor.

---

## FAZ 6 — KALAN EKSİKLER + STEAM HAZIRLIĞI

`RAPOR-EKSIKLER.md`'de **açık** kalan maddeler:

| Kod | Konu | Not |
|---|---|---|
| **A1** | Rakip kadro kalıcılığı | → M20 ile birleşti, **öncelikli** |
| **B3** | Rakip takımlarda sakatlık yok | A1'e bağlı |
| **B4** | Sezon sonu bireysel ödülleri (lig MVP, ideal beşli, en gelişen genç) | bağımsız, kolay |
| **B5** | Zorluk seviyesi (kolay/normal/zor) | **Steam için beklenti** |
| **C2** | Manuel koçlukta ilk yarı istatistik kaybı (`regenerateMatchRemainder`) | görünür hata |
| **C3** | `startMatch` içindeki ölü `else` dalı | temizlik |
| **D1** | Mobil responsive uçtan uca test | **yapılmadı** |
| **D3** | Steam/masaüstü paketleme | `src-tauri/` var, iş bitmemiş |

### Steam'e özel ek maddeler
- **Çevrimdışı çalışma:** Sayfa Google Fonts'a bağımlı (Bebas Neue / Inter). İnternetsiz makinede yazı tipi düşer. **Fontları yerelleştir.**
- **`file://` protokolü:** Portre yükleme ve IndexedDB davranışı Tauri sarmalayıcısında test edilmeli.
- **Kayıt bütünlüğü:** `serializeGameState` alan listesi geniş görünüyor (`chemistry`, `draft`, `pendingMatch`, `playerDev` dahil). **Ancak** soyunma odası alanları (sözler/ilişkiler/moral) oyuncu nesnesinde mi tutuluyor, doğrulanmalı — eksikse **sessiz veri kaybı** olur.
- **Kota/hata yönetimi:** `js/*.js` genelinde 156 `try` bloğu var; `localStorage` kota dolması senaryosu ayrıca test edilmeli.
- **Erişilebilirlik + kontrol eşlemesi:** Steam Deck / gamepad desteği kapsam kararı gerektirir.

---

## ÇALIŞMA KURALLARI (Claude Code oturumu için)

1. **Sırayla ilerle:** FAZ 5 (ölçüm) → FAZ 1 (senkron) → FAZ 2 (kimlik) → FAZ 3 (top) → FAZ 4 (denge) → FAZ 6.
2. **Her fazdan sonra zorunlu test dizisi:**
   - `node --check` (değişen her `js/*.js`)
   - `node tools/measure.js` + `node tools/band.js` → **kanonik hash birebir korunmalı** (sunum değişikliği sonuç matematiğini değiştirmemeli). *FAZ 4 istisna: denge değişikliği hash'i bilerek değiştirir, yeni bant kaydedilir.*
   - `node tools/realism-check.js` (yeni metriklerle)
   - `node tools/visual-check.js` → **çıkış kodu 0 olmadan faz tamamlanmış sayılmaz**
   - `node tools/i18n-scan.js` (yeni kullanıcı metni eklendiyse)
3. **Modül disiplini:** Yeni mantık temaya ait `js/*.js` dosyasına girer; `charazay2.0.html` içindeki `<script src>` sırası bozulmaz.
4. **Dil:** Yeni kullanıcı metninin Türkçesi yazılır, karşılığı `js/i18n-dict.js`'e eklenir; üretilmiş metinler için `I18N_PHRASES` kalıbı yazılır.
5. **Minimal değişiklik:** Dosya silme/yeniden yazma yok, düzenleme var. Mevcut çalışan kod bozulmaz.
6. **Her faz sonunda `PROGRESS.md`'ye ekleyerek** yapılanı, kararı ve ölçüm sonucunu yaz.

---

## GENEL KABUL KRİTERLERİ (paket tamamlandı sayılması için)

| Metrik | Şu an | Hedef |
|---|---|---|
| Saat/gerçek zaman oranı — medyan | 5,1× | 3,0–3,5× |
| Saat/gerçek zaman oranı — tipler arası fark | **19 kat** | **< 1,5 kat** |
| Anlatım–jeton kimlik eşleşmesi | **%13** | **≥ %95** |
| Top ışınlanan kare oranı | **%8,0** | **0** |
| Jeton hızı p99 | 491 px/sn (14,6 m/sn) | < 340 px/sn (10,1 m/sn) |
| Anlatımsız kalan olay | ölçülmüyor | **0** |
| Top kaybı (takım/maç) | ~1 | **12 ± 3** |
| Serbest atış sayı payı | %33 | **%14–19** |
| `visual-check.js` çıkış kodu | 0 | **0 (korunmalı)** |
| Konsol hatası | 0 | **0 (korunmalı)** |
