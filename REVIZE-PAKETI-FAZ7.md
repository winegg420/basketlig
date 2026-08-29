# REVİZE PAKETİ — FAZ 7: MAÇ DIŞI MODÜLLER
**Tarih:** 2026-08-29 · `REVIZE-PAKETI.md`'nin devamı
**Kapsam:** `persistence.js`, `economy.js`, `state.js`, `roster-gen.js`, `render.js`, `league.js`, `charazay2.0.html`
**Yöntem:** Kullanıcının güncel dosyaları üzerinde kod taraması + fiili çalıştırma (fikstür üretimi, kontrast ölçümü, handler doğrulaması)

> FAZ 1–6 canlı maç sunumuna odaklıydı. Bu faz **oyunun geri kalanını** kapsar.
> Buradaki 4 KRİTİK madde **oyuncu ilerlemesini kaybettiriyor** — Steam yayını için kapatılması zorunlu.

---

## 0. ÖNCE DOĞRULANANLAR (sorun YOK — tekrar aramaya gerek yok)

Bunlar fiilen test edildi, temiz çıktı:

- **Kopuk buton yok.** 96 inline handler çağrısının tamamı global olarak tanımlı. Dinamik `${fn}('${pb.key}')` (`render.js:1334`) → `selectPlaybook`/`selectDefSet`, ikisi de mevcut.
- **Fikstür üretimi doğru.** `genRoundRobinMatches` n=2,3,4,12,18,19,20 için çalıştırıldı: 20 takım → 190 maç, 190 benzersiz eşleşme, 0 çift, takım başına 19 maç, ev/deplasman 9/10, en uzun ardışık ev serisi 3.
- **SVG'lerde NaN / sıfıra bölme yok.** `svgLineChart` guard'lı, `playbookSvg` verisi statik, şut haritası koordinatları hep sayı.
- **Oyuncu nesneleri kayda TAM giriyor.** `players/youth/marketPlayers/clubTransferPlayers` referansla kaydediliyor — rol, 5 eğilim, moral, kişilik, sözleşme, sakatlık, gizli potansiyel dahil sonradan eklenen tüm alanlar sessizce saklanıyor. **Korkulan veri kaybı bu tarafta yok.**
- **Para aritmetiği güvenli.** Tüm hareketler `txn` (`economy.js:1-11`) üzerinden, `Math.round(Number(x)||0)` korumalı. NaN/negatif üretecek yol bulunamadı.
- **Stat taşması yok.** Üretim, yaşlanma, koç bonusu, antrenman — hepsi `Math.min(99,…)` / `Math.max(30…)` kelepçeli.
- **`processBankruptcy` kilitlenmiyor.** Üç kat sınırlı (`sold<2`, `players.length>8`, `break`).
- **`innerHTML +=` döngüsü yok** (0 eşleşme). Anlatım satırları `createElement` ile ekleniyor.
- **Ağ çağrısı yok** (`fetch`/`XHR` = 0). Portreler `file://` altında çalışır.
- **XSS bugün açık değil.** Tüm isim girişleri `sanitizeTeamName`'den geçiyor, yüklemede `_stripSaveMarkup` var. (Ama bkz. F7-13 — tek katman kalırsa açılır.)

---

## A · KRİTİK — VERİ KAYBI (Steam engelleyici)

### F7-1. Playoff/draft yarıda kalınca yeniden yükleme SEZONU SIFIRLIYOR
**Dosya:** `persistence.js:629` (`bootstrapAppUi` → `ensureLeagueSeasonOrStart()`) · `match-prep.js:1180-1189`, `1299`

`endLeagueSeasonIfDone()` düzenli sezon bitince `G.season.active=false` yapıp playoff başlatıyor. `ensureLeagueSeasonOrStart()` ise yalnızca şunu kontrol ediyor:
```js
if(s && s.active && !seasonAllMatchesPlayed()) return;
```
Playoff ve draft durumuna **hiç bakmıyor**.

**Senaryo:** Son lig maçını oynat → playoff başlar → sekmeyi kapat → aç → "Devam et" → `startLeagueSeason()` çalışır → `G.playoff=null`, tüm oyuncular 1 yaş alır, sözleşmeler eksilir, emeklilik kurası atılır, gençler terfi eder. **Playoff ve draft tamamen kaybolur.**

Üstüne `persistence.js:658` bayat `G.draft` ile `processDraftPicks()`'i 600 ms sonra tetikliyor → yeni sezonun üstüne eski draft işleniyor.

**Düzeltme:** `ensureLeagueSeasonOrStart()` başına iki erken çıkış:
```js
if(G.playoff && !G.playoff.champion) return;
if(G.draft && !G.draft.done) return;
```
Ayrıca `resumeFromSavedGame` bu iki durumda ilgili ekranı (playoff braketi / draft kurulu) açsın.

**Kabul kriteri:** Playoff ortasında sayfa yenilenince seri skoru ve bracket korunmalı.

---

### F7-2. localStorage dolunca IndexedDB yedeği yazılıyor ama ASLA okunmuyor
**Dosya:** `persistence.js:380-407`, `643-646` · `main.js:1316-1321`

`saveGameNow` LS'e yazamazsa (`QuotaExceededError`) yakalıyor ve yine de `idbPutString(raw)` çağırıyor — IDB güncel, LS bayat kalıyor.
Ama yüklemede `loadGameFromStorage()` **yalnız LS okur**; `_pendingResumeFromIdb` sadece LS **tamamen boşsa** doldurulur (`main.js:1317 if(!d)`).

**Sonuç:** Kota dolduktan sonraki tüm oturum IDB'ye kaydedilir, açılışta **bayat LS kaydı kazanır** → saatlerce ilerleme sessizce geri sarılır. Kullanıcıya gösterilen "IndexedDB yedek deneniyor" mesajı yanıltıcı, çünkü o yedek okunmuyor.

**Düzeltme:** Açılışta iki kaynağı da oku, `savedAt` karşılaştır, yeni olanı seç:
```js
const ls = loadGameFromStorage(), idb = await idbGetString();
d = (idb && (!ls || Date.parse(idb.savedAt||0) > Date.parse(ls.savedAt||0))) ? idb : ls;
```

---

### F7-3. "Kaydı sil" IndexedDB kopyasını silmiyor — silinen kariyer geri geliyor
**Dosya:** `persistence.js:699-705` (`clearSavedGame`)

Yalnızca `localStorage.removeItem(GAME_SAVE_KEY)` yapılıyor; IDB'deki `'save'` kaydı duruyor. Sonraki açılışta LS boş olduğu için IDB okunur, **silinmiş kariyerin takım adıyla "Devam et" bloğu belirir** ve tıklanınca yüklenir.

Steam sürümünde "verimi sil" beklentisi açısından da sorunlu.

**Düzeltme:** `clearSavedGame` içine `idbDeleteString()` ekle (`tx.objectStore(IDB_STORE_G).delete('save')`), bildirimi ondan sonra göster.

---

### F7-4. Başarısız kayıt "kaydedildi" sayılıyor, bir daha denenmiyor
**Dosya:** `persistence.js:379-399`

```js
_lastSavedFingerprint = fp;          // ← try bloğundan ÖNCE
try { localStorage.setItem(...) } catch(e) { ... }
```
Yazma hata verse bile parmak izi "yazıldı" olarak güncelleniyor. Durum değişmediği sürece sonraki otomatik kayıtlar `if(fp===_lastSavedFingerprint) return;` ile **atlanıyor** — geçici kota hatasından sonra yeniden deneme yok, ikinci uyarı yok.

Ayrıca `idbPutString(raw).catch(err=>dbg(...))` — `dbg` yalnız `window.CHARAZAY_DEBUG` açıkken yazıyor, yani **IndexedDB yazma hatası kullanıcıya hiç bildirilmiyor**.

**Düzeltme:** `_lastSavedFingerprint=fp;` satırını başarılı `setItem`'dan **sonraya** taşı; `catch` içinde `_lastSavedFingerprint=''` yap. Her iki depo da başarısızsa kalıcı uyarı bandı göster.

---

### F7-5. Taktik modalında "İlk 5 seç"e basınca tüm taktik seçimleri siliniyor
**Dosya:** `league.js:608`, `706`, `926`

`openMatchTactics` radio'ları DOM'da tutuyor. Kullanıcı tempo/odak/savunma/top-yükleme seçip **kaydetmeden** "İlk 5 düzenle"ye basarsa, `renderLineupEditor()` → `showAppModal()` `appModalBody.innerHTML`'i tamamen değiştirir. Radio'lar yok olur. `saveLineup()` `closeAppModal()` çağırır — taktik formuna dönüş yok, **seçimler kaybolur**. (`_pbPick` global olduğu için playbook hayatta kalır, gerisi gider.)

**Düzeltme:** `openLineupEditor()` başına `_captureTacticInputs()` ekle; ya da `saveLineup`/`resetLineup` sonunda `closeAppModal()` yerine `openMatchTactics(G.prepareMatchIx)` ile geri dön.

---

## B · YÜKSEK — DENGE VE İSTİSMAR

### F7-6. Yeni oyunda arena bakımı 6× fazla — üstelik yükseltince bakım DÜŞÜYOR
**Dosya:** `roster-gen.js:44` vs `roster-gen.js:4` (`ARENA_LVL`) · `main.js:1204-1232` · `economy.js:55`

`ECO_MUL = 50000/2400 = 20,833` → `ecoRound(45) = 938`.
`ARENA_LVL` içindeki `bk` değerleri ise **ham KR** (150/300/500/800/1200).
`createTeam()` `G.arena`'ya dokunmadığı için her yeni oyun `bk=938` ile başlıyor — **seviye 1 arena, seviye 4'ten (800) pahalı bakım ödüyor.** Seviye 2'ye yükseltince `bk` 938 → 300'e **düşüyor**; Arena ekranı bunu "-938 KR" gösteriyor.

Haftada ~788 KR fazla gider, `ecoInflationMul()` ile sezonla ×2,2'ye kadar büyüyor. Migrasyonlar bunu düzeltiyor ama **v5 kayıtlar migrasyona girmediği için yeni oyunlar hiç düzelmiyor.**

**Düzeltme:** `createTeam()` içine
```js
G.arena = {s:1, kap:ARENA_LVL[0].kap, bk:ARENA_LVL[0].bk, isim:'Başlangıç Arena'};
```
ve `roster-gen.js:44` varsayılanını `bk:150` yap (`ecoRound`'u kaldır).

---

### F7-7. İSTİSMAR: Tüm koçları kov + sayfayı yenile = bedava, reroll edilebilir teknik ekip
**Dosya:** `persistence.js:585-586`, `568` · `main.js:867-869` · `render.js:419-424`

`applyGameState` sonunda:
```js
if(!G.coaches.length) G.coaches = genCoaches();
```
`genCoaches()` 3 koçu **bedelsiz** üretiyor, `seviye=rand(1,5)`.

**İstismar:** Maaş yükünü düşürmek için 5 koçu da kov → sayfayı yenile → 3 koç bedava gelir. Seviyeler beğenilmezse tekrar kov + yenile ile **seviye 5 koçlar çıkana dek reroll** edilir.
Aynı desen `coachMarket` (`:586`) ve `scoutMarket` (`:568`) için de var.

**Düzeltme:** `if(!G.coaches.length)` yerine `if(d.coaches === undefined)` kullan — yalnızca alan kaydın kendisinde yoksa üret. Aynısını `coachMarket`/`scoutMarket` için.

---

### F7-8. `createTeam` kalıcı alanların çoğunu sıfırlamıyor — yeni kariyer eskisini devralıyor
**Dosya:** `main.js:1204-1232`

Sıfırlanmayanlar: **`arena`, `youthFacility`, `cup`, `cupHistory`, `clubRecords`, `managerHistory`, `managerRep`, `careerMatches/Wins/Losses`, `posTraining`, `bankruptWeeks`, `lineup`, `ticketPrice`, `pendingMatch`, `winStreak`, `_ctSeq`, `clubTransferPlayers`**

Bir kaydı yükleyip aynı oturumda yeni takım kuran oyuncu **Mega Arena, Elit Akademi, kulüp rekorları ve eski `pendingMatch` kilidiyle** başlıyor; `lineup` artık var olmayan oyuncu id'lerini gösteriyor.

**Düzeltme:** `createTeam()` başına tek bir `resetCareerState()`:
```js
Object.assign(G, structuredClone(DEFAULT_G));   // roster-gen.js:39'daki literal
```
Böylece ileride eklenecek alanlar da otomatik kapsanır.

---

### F7-9. Desteklenmeyen sürümlü LS kaydı, sağlam IndexedDB yedeğini gizliyor
**Dosya:** `main.js:1316-1327` · `persistence.js:471` (`SAVE_VERSIONS=[2,3,4,5]`)

IDB'ye yalnızca `if(!d)` — LS okunamazsa — bakılıyor. LS'te geçerli JSON ama desteklenmeyen sürüm varsa `d` doludur → IDB hiç sorgulanmaz → "Geçerli kayıt yok." denir. Kullanıcının IDB'de sağlam yedeği olduğu halde kurtarma yolu sunulmaz.

**Düzeltme:**
```js
if(!d || !SAVE_VERSIONS.includes(d.v|0) || !d.team) { /* IDB'ye düş */ }
```
"Geçerli kayıt yok" mesajına "Dışa aktarılmış .json dosyanı içe aktar" yönlendirmesi ekle.

---

### F7-10. Yedek oyuncu listesi mobilde kaydırılamıyor — İlk 5 ekranı telefonda kilitleniyor
**Dosya:** `charazay2.0.html:424-425`

```css
.lu-bench { max-height:340px; overflow-y:auto }
.lu-card  { touch-action:none }
```
15 kişilik kadroda 10 yedek × ~52px = ~520px içerik, 340px kutuda. `touch-action:none` yüzünden karta dokunup kaydırmak **sürükleme başlatıyor, kaydırmıyor**. 390×844'te 4-5 yedekten sonrasına erişilemiyor.

**Düzeltme:** `.lu-card{touch-action:pan-y}` yap, karta tutamaç ekle (`<span class="lu-grip" style="touch-action:none">⠿</span>`), `onpointerdown`'ı sadece tutamağa bağla.

---

### F7-11. Google Fonts çevrimdışıyken hiç yüklenmiyor — yerel `@font-face` yok
**Dosya:** `charazay2.0.html:8` · **STEAM ENGELLEYİCİ**

Tek font kaynağı `https://fonts.googleapis.com/css2?...`. Depodaki `css2` dosyası (a) **hiçbir yerden referans edilmiyor**, (b) içindeki `src:url(...)` hâlâ `fonts.gstatic.com`'a bakıyor, (c) `assets/` altında hiç font dosyası yok.

Çevrimdışında `'Bebas Neue', sans-serif` → jenerik sans-serif. Bebas Neue ultra-condensed; normal genişlikte yazı gelince `.score-num{font-size:54px}` genişler ve `.scoreboard` `flex-wrap` **tanımsız** olduğu için 390px'te taşar.

> **Bu bulgu canlı olarak doğrulandı:** projenin kendi `visual-check.js` aracı çevrimdışı bir ortamda çalıştırıldığında verdiği tek hata `ERR_TUNNEL_CONNECTION_FAILED` — Google Fonts.

**Düzeltme:** `.woff2` dosyalarını `assets/fonts/`'a indir, `<link>`'i kaldır, `<style>` başına yerel `@font-face` koy. Fallback yığınını genişlet: `'Bebas Neue','Arial Narrow',Impact,sans-serif`. Ayrıca `.scoreboard{flex-wrap:wrap}`.

---

### F7-12. Ana buton kontrastı 2.80:1 — WCAG AA (4.5:1) çok altında
**Dosya:** `charazay2.0.html:38, 43, 497, 510, 520, 542, 1141`

`.btn-p{background:#f97316; color:white}` → ölçülen kontrast **2.80:1**.
Aynı kombinasyon `.tab.active`, `.fbtn.active`, `.market-tab.active`, `.upbtn`, `.btn-bid:hover`, `.btn-train:hover` ve arena KAYDET butonunda — **oyunun tüm birincil butonları.**

Tutarsızlık: `.lu-slot-badge` (`:418`) zaten `color:#111` kullanıyor.

**Düzeltme:** Bu 7 kuralda `color:white` → `color:#1a1002` (kontrast ~7.4:1).
Diğer renkler ölçüldü, sorunsuz: gold 10.3, green 7.6, text2 6.7. Sınırda: `--purple #8b5cf6` = 4.07 (küçük punto metinde AA'yı geçmez).

---

### F7-13. Mobil hamburger menü ~20×24px — telefondaki tek gezinme girişi
**Dosya:** `charazay2.0.html:164`, `596`

`.menu-btn` — padding yok, min-width/height yok. 50px `.topbar` içinde ~20×24px'e düşüyor. Mobilde sidebar'ı açan **yegâne kontrol** bu.

**Düzeltme:** `.menu-btn{padding:10px 12px; min-width:44px; min-height:44px; margin-left:-10px;}`

---

## C · ORTA — SAĞLAMLIK, PERFORMANS, ERİŞİLEBİLİRLİK

### F7-14. `applyGameState` try/catch'siz — bozuk kayıt yarı uygulanmış durum bırakıyor
**Dosya:** `persistence.js:507-588`, `643-659`

80 satır boyunca doğrudan `G`'ye yazıyor; sonunda `ensureRoles`, `genLigTeams`, `genCoaches` gibi üretim çağrıları var. Biri atarsa `G` yarı yüklenmiş kalıyor, `resumeFromSavedGame` yakalamadığı için oyun **boş/kırık ekranda kilitleniyor** ve kullanıcıya ne olduğu söylenmiyor.

**Düzeltme:** Geçici nesne üzerinde kur, hatasız biterse `G`'ye ata. En azından çağrıyı `try/catch` ile sar ve "Kayıt bozuk — dışa aktar / sil" seçenekli modal göster.

---

### F7-15. Çok sekmede `storage` olayı canlı maçı bozuyor
**Dosya:** `persistence.js:707-732` · `main.js:1333-1336`

`syncUiAfterExternalSave` → `applyGameState(d)` → `G.players` **yepyeni nesnelerle** değişiyor. `mState` ise maç başında yakalanmış referansları tutuyor. İki sekme açıkken maç sırasında senkron gelirse, maç içi değişiklik/enerji/faul güncellemeleri **yetim nesnelere** yazılıyor ve maç bitiminde sessizce kayboluyor.

**Düzeltme:** Başa `if(typeof mState!=='undefined' && mState.running) return;`

---

### F7-16. Kayıt kapsamında üç küçük boşluk
**Dosya:** `persistence.js:340-377`

- `G._crisisPid` / `G._crisisDay` (`match-prep.js:427-429`) kaydedilmiyor → yeniden yükleyince aynı soyunma odası krizi hemen tekrar açılabiliyor
- `G.draft` yalnız `!done` iken kaydediliyor (`:375`) → draft özet ekranındayken çıkılırsa özet bir daha gösterilemiyor
- `G.ligTeams` **alan-alan** kopyalanan tek koleksiyon (`:341-344`, 7 alan). Şu an türetilmiş önbellek olduğu için zararsız — ama bu diziye ileride alan eklenirse **sessizce kaybolacak tek yer burası**

**Düzeltme:** `_crisisPid`/`_crisisDay`'i serialize'a ekle; `draft`'ı `done` olsa da sakla; `ligTeams`'i olduğu gibi kaydet ya da hiç kaydetme.

---

### F7-17. Migrasyon zinciri v5'te donmuş
**Dosya:** `persistence.js:409-471`, `507-511`

Yalnız iki migrasyon var, ikisi de **ekonomi**. v2→v3 için yapısal migrasyon hiç yok. `serializeGameState` hâlâ `v:5` yazıyor; oysa v5'ten sonra rol/eğilim, playbook, soyunma odası, izci ağı, draft, başkan hedefi eklendi. Boşluk `ensureRoles` + `||` varsayılanlarıyla kapatılıyor — çalışıyor ama **ileride gerçek yapı değişikliği gelince "hangi kayıt neyi içeriyor" ayırt edilemez.**

**Ek:** `ensureRoles(...)` (`:527`) seed doldurmadan (`:577-582`) **önce** çalışıyor. Seed'siz eski oyuncularda eğilimler ilk `refreshRole()` çağrısında bir kez zıplıyor.

**Düzeltme:** Sürümü `v:6`'ya çıkar, `SAVE_VERSIONS`'a 6 ekle, `migrateV5ToV6(d)` normalizasyon fonksiyonu yaz. `ensureRoles` çağrısını seed bloğundan **sonraya** taşı.

---

### F7-18. Geliştirici telemetrisi her sayfa geçişinde çalışıyor
**Dosya:** `main.js:1028-1128`, `showPage` `1169-1171`'den çağrılıyor

`charazayRunLayoutCalibration` her navigasyonda yazma (`scrollTop=0` ×3) ile okumaları (`getBoundingClientRect()` ×4, `scrollWidth`, `offsetTop`, `offsetHeight`) **karıştırıyor** → tekrarlanan zorunlu senkron layout. Ardından `charazayCollectMentorIssues` 11 DOM sorgusu daha yapıyor, sonuç `localStorage.setItem('CHARAZAY_MENTOR_SYNC', …)` ile diske yazılıyor.

Bu bir mentor-panel geliştirme aracı; **yayın derlemesinde olmamalı.**

**Düzeltme:** Fonksiyonun ilk satırına `if(!window.CHARAZAY_DEBUG) return;` (bayrak zaten `1116`'da var).

---

### F7-19. İlk 5 düzenleyicide her yerleştirmede tüm modal yeniden kuruluyor
**Dosya:** `league.js:788-833`

`lineupPlaceInSlot` / `lineupMoveToBench` her seferinde `renderLineupEditor()` → `appModalBody.innerHTML=…`: 5 yuva + 10 yedek kartı, yeni `<img>`'ler, yeni saha SVG'si. **Modal kaydırma konumu her hamlede en üste sıçrıyor** — mobilde her yerleştirmeden sonra tekrar aşağı kaydırmak gerekiyor.

**Düzeltme:** Sadece etkilenen iki kabı güncelle (`#luCourt` ve `.lu-bench`); `showAppModal` yalnız ilk açılışta.

---

### F7-20. `getBotClubProfile` her çağrıda ~300 KB JSON ayrıştırıyor
**Dosya:** `league.js:17-46`

Her çağrıda tüm kulüp önbelleğini `JSON.parse` ediyor (60 kulüp × 7 oyuncu ≈ 300-350 KB). `match-prep.js:660` (`buildSeasonPlayerPool`) bunu **19 akran takım için arka arkaya** çağırıyor → sezon sonu ödül hesabında tek karede ~6 MB JSON ayrıştırma, ana iş parçacığında.

**Düzeltme:** Modül seviyesinde bellek içi önbellek (`let _clubCache=null`), yazma tarafında `setItem`'ı debounce et.

---

### F7-21. `buildLeagueRows` sıralayıcısı geçişsiz — eşit puanda tanımsız sıra
**Dosya:** `roster-gen.js:565-585`

Puan eşitliğinde `h2h(a,b)` döndürüyor. Tek devreli ligde A>B, B>C, C>A döngüsü olağan; `Array.sort` geçişsiz karşılaştırıcıda **standart dışı sonuç** üretir — tablo "yendiği takımın altında" duran takım gösterebilir.
Ayrıca `sea.standings[isim]` yoksa satır `puan:'—'` dönüyor ve `Number('—')||0 = 0` olduğu için gerçek 0 puanlılarla karışıyor.

**Düzeltme:** H2H'yi **mini-lig** olarak hesapla (eşit puanlı grubun kendi maçları), tek sayısal anahtarla sırala. Ya da FIBA gibi h2h'yi yalnız iki takım eşitken uygula.

---

### F7-22. Modal: Esc kapatmıyor, odak yönetimi yok
**Dosya:** `league.js:1-15` · `charazay2.0.html:1210-1214`

`showAppModal` sadece `innerHTML` + `display='flex'`. Tüm kod tabanında Escape dinleyicisi **tek** yerde (`main.js:12`, sadece maç tiyatro modu). `role="dialog"`/`aria-modal` yok, odak modala taşınmıyor, focus trap yok — klavye kullanıcısı Tab ile arka plandaki butonlarda dolaşıyor.

**Düzeltme:** `showAppModal` içine `role`/`aria-modal` + Escape dinleyicisi + `.modal-sheet` odaklama (`tabindex="-1"`); `closeAppModal`'da listener kaldır. CSS: `.modal-backdrop{overscroll-behavior:contain;}`

---

### F7-23. Analiz sayfasında oyuncu seçince `<select>` odağı kaybediyor
**Dosya:** `render.js:1396`

`onchange="…;renderAnalytics();"` tüm `#analiz-body`'yi yeniden basıyor; select DOM'dan silindiği için odak `<body>`'ye düşüyor. Oysa `#analiticPlayerBody` kabı ve `renderAnalyticsPlayerBody(pid)` zaten tam bu iş için var.

**Düzeltme:**
```js
onchange="G._analiticPlayerId=this.value;document.getElementById('analiticPlayerBody').innerHTML=renderAnalyticsPlayerBody(this.value);"
```

---

### F7-24. Dokunma hedeflerinin çoğu 22-30px (eşik 44px)
**Dosya:** `charazay2.0.html:501, 546, 496, 542, 316-321, 311-313, 402, 165` · `render.js:1473`

`.fbtn` ~27px · `.btn-sm` ~26px · `.btn-bid` ~26px · `.upbtn` ~30px · `.league-slot` ~24px · `.modal-close` ~22px · bilet fiyatı butonları ~22px (5 tanesi yan yana).
Bunlar kadro filtresi, market sıralaması, sidebar lig ağacı, modal kapatma ve arena ekonomisi gibi ana etkileşimler.

**Düzeltme:** Tek mobil blok:
```css
@media(max-width:768px){
  .fbtn,.btn-sm,.btn-bid,.upbtn,.tb-icon,.league-slot,.lt-h{min-height:44px;padding-top:11px;padding-bottom:11px;}
  .modal-close{padding:10px;top:4px;right:6px;}
}
```

---

### F7-25. Odak (focus) hemen hiçbir yerde görünmüyor
**Dosya:** `charazay2.0.html:41, 531` · `render.js:134, 345, 663, 693, 985`

`:focus-visible` tüm CSS'te **tek** kuralda (`:456`). `.fg input,.fg select{outline:none}` — `.fg select:focus` için telafi yok. `role="button" tabindex="0"` verilen oyuncu kartları ve fikstür satırları yalnız `Enter`'a yanıt veriyor, `Space` yok, odak halkası yok.

**Düzeltme:** `:focus-visible{outline:2px solid var(--accent);outline-offset:2px;}` genel kuralı; `onkeydown` koşullarını `if(e.key==='Enter'||e.key===' ')` + `preventDefault()`.

---

### F7-26. `escMatch` `'` ve `>` kaçırmıyor (ikinci savunma katmanı zayıf)
**Dosya:** `league.js:492-494` · kullanılmayan yerler: `main.js:733`, `match-engine.js:2266,2282,2302,2363,2450`, `match-prep.js:1226,1257,1276,1291`, `league.js:69,81`, `render.js:145`

`escMatch` yalnız `& < "` kaçırıyor. Takım/oyuncu adları düzinelerce şablonda hiç kaçırılmadan `innerHTML`'e giriyor. **Bugün istismar edilemiyor** çünkü `sanitizeTeamName` + `_stripSaveMarkup` iki katman var ve tüm giriş noktaları kontrol edildi — atlanan yok. Ama tek katman kalırsa (yeni bir isim girişi `sanitizeTeamName`'siz eklenirse) doğrudan saklı XSS olur.

**Düzeltme:** `escMatch`'i tamamla (`.replace(/>/g,'&gt;').replace(/'/g,'&#39;')`) ve ham `${G.team.isim}` / `${p.isim}` kullanımlarını sar.

---

## D · DÜŞÜK

### F7-27. Bireysel antrenman rol/eğilimi tazelemiyor
**Dosya:** `main.js:608-616` vs `590-605`
Takım antrenmanında `refreshRole(p)` **iki kez** çağrılıyor (603 ve 604 — kopyala-yapıştır). Bireysel antrenmanda **hiç** çağrılmıyor: `sutIsabeti` 14 puan yükselip Şutör'e dönmesi gereken oyuncunun `p.rol`/`p.eg`'si eski kalıyor; maç motoru bayat eğilimlerle çalışıyor.
**Düzeltme:** `return artis;` öncesine `refreshRole(p);`; çift çağrının birini sil.

### F7-28. localStorage engelliyse lig her çağrıda yeniden rastgele üretiliyor
**Dosya:** `roster-gen.js:426-491`
Gizli sekme / kurumsal politika / kota durumunda `getTblState()` **her çağrıda** sıfırdan 26 grup × 20 takım üretiyor → lig rakiplerinin adları her render'da değişiyor, kullanıcı hiçbir hata görmüyor. Normal çalışmada bile her çağrı ~10 KB `JSON.parse`.
**Düzeltme:** Modül seviyesinde önbellek; açılışta `localStorage` probe testi + "Depolama kapalı" kalıcı uyarısı.

### F7-29. `saveMatchTactics` doğrulama yapmıyor
**Dosya:** `league.js:662-686`
Üç `querySelector` belge geneline bakıyor, modalın açık olduğu doğrulanmıyor. Tümü `null` dönerse `G.tactics` **varsayılana üzerine yazılıyor** ve "Taktik kaydedildi" bildirimi çıkıyor — kullanıcı kaydettiğini sanıyor.
**Düzeltme:** `if(!tempo&&!odak&&!def){ showNotif('Taktik formu açık değil.'); return; }`; `focusPlayerId`'yi kadroda ve sakat değil diye doğrula.

### F7-30. Lig tablosu mobilde iç içe iki eksenli kaydırıcı + eksik `alt` + grafik taban çizgisi
**Dosya:** `charazay2.0.html:342, 471` · `portraits.js:192` · `render.js:1341`
(a) `min-width:720px` tablo + `max-height` sarmalayıcı → 390px'te sıralama sütunları ekran dışında.
(b) `playerAvatarImgAttrs` `alt` üretmiyor; `league.js:68,74,81,766,776` portre/logolarında `alt` yok.
(c) `svgLineChart`: tüm değerler eşitse çizgi grafiğin **en altına yapışıyor**, üst/alt etiket aynı sayıyı gösteriyor.
**Düzeltme:** (a) mobilde SF/SA sütunlarını gizle, `min-width:520px`. (b) `alt=""` / `alt="… logosu"`. (c) `if(max===min){min=max-1;max=max+1;}`

---

## NOT EDİLENLER (bulgu sayısına girmedi)

- `fixtureFullSeasonGridHtml` (`league.js:542`) **indeks** erişimi yapıyor, diğer yerler `.find(x=>x.seasonMatchIx===ix)` kullanıyor. Şu an dizi sıralanmadığı için çalışıyor — ileride bir `sort` eklenirse yanlış maç kartı gösterir.
- `html.a11y-big{zoom:1.18}` (`charazay2.0.html:18`) — `zoom` + `position:fixed` birlikte koordinatları kaydırır; erişilebilirlik büyütmesi açıkken sürükle-bırak hayaleti yanlış yere düşebilir. **Test edilmeli.**

---

## FAZ 7 UYGULAMA SIRASI

| Öncelik | Maddeler | Neden |
|---|---|---|
| 1 | **F7-1, F7-2, F7-3, F7-4** | Veri kaybı — Steam engelleyici |
| 2 | **F7-5** | Kullanıcının kaybettiği iş |
| 3 | **F7-6, F7-7, F7-8** | Denge bozukluğu + istismar |
| 4 | **F7-11** | Steam çevrimdışı engelleyici |
| 5 | F7-9, F7-10, F7-12, F7-13 | Erişim ve mobil |
| 6 | F7-14 … F7-26 | Sağlamlık, performans, erişilebilirlik |
| 7 | F7-27 … F7-30 | Cila |

**Kabul kriterleri:**
- Playoff ortasında sayfa yenile → bracket ve seri skoru korunuyor
- Kota dolduktan sonra yeniden yükle → en güncel kayıt geliyor
- "Kaydı sil" → yeniden açılışta "Devam et" bloğu **yok**
- Yeni oyun → arena bakımı 150 KR (938 değil)
- 5 koçu kov + yenile → koçlar geri **gelmiyor**
- İnternetsiz aç → yazı tipleri düzgün, tabela taşmıyor
- 390×844'te İlk 5 ekranında 10 yedeğin hepsine erişilebiliyor
- `node tools/visual-check.js` çıkış kodu 0
