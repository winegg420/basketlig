# PROGRESS — Charazay 2.0 (Basket Menajerlik)

Tek dosyalık basketbol menajerlik oyunu (`charazay2.0.html`). Steam yayınına hazırlık.

## 2026-07-28 (27. oturum) — CANLI MAÇ SUNUMU BAŞTAN YAZILDI (v3): gerçek basketbol akışı + tam anlatım senkronu

**Kullanıcı şikâyeti:** "Canlı maç gerçek basketbol gibi değil; top saçma hareketler ediyor,
oyuncular saçma hareketler ediyor, top kenardan sokulurken oyuncu dip çizginin dışına çıkmıyor,
görüntü ile mesaj senkron değil." → Sunum katmanı (js/match-engine.js'in canlı bölümü ~1000 satır)
**baştan yazıldı**; main.js oynatım döngüsü ve saha SVG geometrisi buna göre yenilendi.

### Teşhis (ölçümle, tahminle değil)
Yeni `tools/realism-check.js` (Playwright + sistem Chrome, tohumlu maç) yazıldı: her karede
saha-dışı ihlali, ışınlanma, insanüstü hız, üst üste binme, topun sahipsiz kalması, anlatım-görüntü
gecikmesi ölçülür; `--fire` şut anının, `--inb` kenardan sokma anının ekran görüntüsünü alır;
`--full` tam maçı uçtan uca koşturur. İlk tarama kök nedenleri gösterdi:
1. **Dizilim kadro sırasına bağlıydı** (rol değil) — rakip 5'i "genel"e göre sıralı geldiğinden
   pivot köşede üçlük bekliyor, guard boyada duruyordu.
2. **Geçiş geç başlıyordu:** ribaund/çalma/sayı sonrası herkes 1-2 sn eski yarı sahada donuyor,
   sonra topluca koşuya kalkıyordu → 10 jeton orta sahada tek yumak.
3. **Çizgi dışı alan YOKTU:** iç viewBox saha çizgileriyle bitiyordu; "sokucu" çizginin üstünde
   duruyordu. Yan çizgi payı 30px (≈0.9m) idi.
4. **Anlatım yalnız saha şutlarında senkrondu**; faul/çalma/ribaund cümleleri olay başında,
   serbest atış metni ise **atış yapılmadan sonucu söyleyerek** basılıyordu ("2/2 — hepsi içeride").
5. Serbest top rastgele yöne kayıp çizgi dışına çıkabiliyor, ribaundu "alan" oyuncuya top
   zamanlayıcıyla ışınlanıyordu.

### Yapılanlar
- **Saha geometrisi (charazay2.0.html):** iç viewBox `0 0 940 500` → `-26.3 -14 992.6 528`.
  En-boy oranı birebir korundu (992.6/528 = 940/500), tüm koordinatlar geçerli kaldı; saha
  çizgilerinin dışında **gerçek bir out-of-bounds alanı** oluştu (dip 82.7px, yan 44px). Parke
  zemini bu alana genişletildi.
- **Rol tabanlı dizilim:** `_assignRoles` jetonları PG/SG/SF/PF/C rolüne çapalar (değişiklikte
  yeniden hesaplanır). 4 set şablonu (`SET_SPREAD` 4-out-1-in, `SET_HORNS`, `SET_POST`,
  `SET_MOTION`) + güçlü taraf için y-aynalama; pozisyon başına rastgele seçilir.
- **Üç fazlı pozisyon:** (a) kenardan sokma → (b) GEÇİŞ (hücum üç kulvar, kanatlar önce
  `_wp` ara noktasıyla KENARA açılıp sonra öne koşar; savunma ortadan potaya döner) →
  (c) SET (perde/roll, tek kesme, kilit pas, şut). Pozisyon el değiştirir değiştirmez
  `_startBreak` ile geçiş **o karede** başlar (ribaund/çalma/sayı anında).
- **Kenardan sokma gerçek kurala göre:** sokucu topu potanın altından alır (`_chase`),
  **dip/yan çizginin tamamen dışına** çıkar (tek OOB izni onda; ölçüm: çizgi dışı **27px**),
  içeri pası atar ve sahaya döner. Kalıntı izinler `_clearOob` ile temizlenir.
- **Top fizik motoru:** dribbling (yere sekerek, ölü topta sekmez), göğüs/yerden pas, mesafeye
  bağlı parabolik şut + el yüksekliğinden çıkış, fileden düşüş, **çemberden gerçekçi karambol**
  (~2-3m), sürtünmeli serbest top + yuvarlanma dönüşü, çizgi dışına **asla** çıkmama.
  Serbest topun peşine gerçekten koşulur ve **yetişilince** alınır (ışınlanma yok).
- **Savunma:** top-sen-adam ilkesi (top tutanı 27px'te kapatır, topsuz adamın savunmacısı
  `_defGap` ile ≤56px sarkar), deadzone'lu canlı takip, 2-3 bölge genişletildi, contest→closeout.
- **Anlatım-görüntü senkronu:** `movePlayersForEvent(ev,paint)` cümleyi sahnedeki doğru kareye
  bağlar — çalma topun kapıldığı an, ribaund topun alındığı an, faul düdükte, şut top çembere
  varınca. **Serbest atış metni ikiye ayrıldı** (`ftPre` düdükte, `ftRes` son atış çemberden
  geçince) — sonuç artık önceden söylenmiyor. `text` alanı birebir korundu (kayıt uyumu).
- **İzleme hızı (yeni):** 1× / 1.5× / 2× / 3× butonları; `mState.rate` hem rAF adımını hem
  olaylar arası gecikmeyi ölçekler (varsayılan 1.5×). **Akan maç saati** (eskiden 10-20 sn'lik
  sıçramalar) + **şut saati** göstergesi eklendi.
- **Okunabilirlik:** top sahibinin altında sarı halka, isabette çember efekti, şut/ribaundda
  sıçrama "pop", isim etiketleri ev=alt / deplasman=üst (üst üste binmiyor), dar ekranda
  isimler gizlenir (sadece forma numarası).

### Ölçüm (önce → sonra; seed 987654321)
| Metrik | Önce | Sonra |
|---|---|---|
| oyuncu saha çizgisi dışında | (ölçülmüyordu) | **0 kare** |
| top saha dışında | 94 kare (maks 22px) | **0 kare** |
| ışınlanma (>30px/kare) | 0-2 | **0** |
| top taşıyıcıdan kopuk | 0 | **0** |
| sahipsiz serbest top | 92 kare | **≈30 kare** (sayı sonrası top fileden düşerken) |
| sokucunun çizgi dışına adımı | **0px (çizgi üstünde)** | **27px (tamamen dışarıda)** |
| anlatım senkronu | yalnız şutlarda | **tüm olaylarda** (çalma +90ms, ribaund +151ms, faul +0ms) |
| tam maç süresi | ~11-22 dk | **~8.5 dk (1.5×)**, 3×'te ~4.5 dk |

### KIRMIZI ÇİZGİ: sonuç matematiği DEĞİŞMEDİ (kanıtlı)
- `tools/measure.js` kanonik tohum imzası **db4799f04a613d8e** — değişiklik öncesiyle birebir aynı.
- `tools/band.js` 200 maç skor dizisi hash'i **bf5cfc9887738c63** — HEAD (değişiklik öncesi) ile
  ayrı bir git worktree'de çalıştırılıp **birebir aynı** çıktı.
- Tüm dokunuşlar sunum katmanında; serbest atış metni bölünürken `text` alanı harfi harfine korundu.

### Test
- `node --check` (match-engine, main) temiz.
- `node tools/visual-check.js` → masaüstü + mobil, **0 konsol hatası**, çıkış kodu 0.
- `node tools/realism-check.js --full` → tam maç (193 olay) uçtan uca, **0 konsol hatası**.
- Mola + manuel koçluk + canlı oyuncu değişikliği + hız değiştirme akışı ayrı test edildi (0 hata).

### Kullanıcının test etmesi gerekenler
Bir maç izle: (1) sayı sonrası rakip oyuncu topu alıp **dip çizginin dışına çıkmalı**, pası oradan
atmalı; (2) geçişte iki takım orta sahada yumak olmamalı — kanatlar kenardan koşmalı, savunma
ortadan potaya dönmeli; (3) set kurulunca köşe/kanat/post dolu olmalı; (4) spikerin cümlesi sahada
o an olan şeyi anlatmalı (serbest atış sonucu **atış yapılmadan** söylenmemeli); (5) hız butonları
(1×–3×) hareketle anlatımı birlikte hızlandırmalı.

## 2026-07-21 (25. oturum) — Canlı ölçüm hedefli "skrum" düzeltmesi: tüm ön saha spacing + şema dağılımı + play.move + anlatım derinliği (İŞ 1-5)

Kullanıcı canlı ölçümle 4 kusur saptadı (10 jeton 235 kez, 185 olay): (A) spacing çökmüş
(yatay yayılım ~164px, en yakın komşu ~26px, 8-10 jeton iç içe, köşeler kullanılmıyor);
(B) şemalar gerçek dışı (iso %47); (C) play.move hiç dolmuyor (metin "step-back" diyor, alan boş);
(D) anlatım tekrarı %51. Hedefler: xSpread≥280, avgNN≥55, overlaps≤2, iso≤%15, spotup≥%20,
moveFilled>0, patternReuse≤0.30. **Her iş sonrası gerçek Chrome'da ölçüm scriptiyle doğrulandı.**

### İŞ 1 — Spacing tüm ön sahaya yayıldı
- `OFF_BASE_L` tüm ön sahaya dağıtıldı: `[[394,250],[58,50],[58,450],[242,128],[112,298]]` — PG yay
  tepesi (deep top/safety), iki DİP KÖŞE (x58, y50/450), yüksek forvet/slot, düşük post. x58-394.
- Off-ball savunma "sag"ı gerçekçileştirildi (40→**84px** yardım pozisyonu), çarpışma yarıçapı
  25→**42** + itme gücü 1.3→3.0 → jetonlar üst üste binmez.
- Topsuz hücumcular TAM SPRINT'le geniş çapalara açılır; set oyununda köşe guard'ları çapada
  DURUR, kesici tercihen BÜYÜK (C/PF) — köşeler boşalmaz, spread sabit yüksek. closeout gevşetildi
  (üst üste binme yok). **Ölçüm 6/6: xSpread 292-359, avgNN 57-63, overlaps 0.**

### İŞ 2 — Şema dağılımı gerçekçileşti (SUNUM etiketi, sonuç DEĞİŞMEZ)
- `runPossession`'da scheme ayrı `pr` üretecinden ağırlıklı seçilir: iso yalnız top yükleme/yıldız
  veya süre azken; çoğunluk spot-up + pnr + kesme + post. **Ölçüm: iso %7-13 (≤15), spotup %30-38
  (≥20).**

### İŞ 3 — play.move dolduruldu ve animasyona bağlandı
- **Kök bug:** `move` yalnız `play.move`'a yazılıyordu, `shot.move`'a KOPYALANMIYORDU → animasyon
  (`sh.move`) hiç okumuyordu, moveFilled=0. `shot`'a `move` eklendi. Ayrıca asistsiz dalda scheme=
  postup is3 şutlara düşüp move=drive üretiyordu ("3'lükte dibe indi") — is3'te postup engellendi,
  move'da is3 önceliklendirildi. **Ölçüm: moveFilled ~80/120, metinMoveVarAlanBoş=0.**

### İŞ 4 — Anlatım derinleşti
- `SPIKER_LINES` havuzları ~2 katına çıkarıldı + move/şema kelimeleri (step-back/çalım/spin/
  pick-and-roll/"dibe indi") core'lardan TEMİZLENDİ (bu dil yalnız play.move/scheme dolunca
  MOVE_BY/ASSIST_PHRASES'ten gelir → söz-görüntü tutarlı). Ortak nötr ek kalıplar eklendi.
- Asist ibaresi çeşitlendi (ASSIST_PHRASES, şema uyumlu: "servisinde/kes-geç pasıyla/boşta
  bıraktı…" — eski monoton "X buldu; Y…" bitti). Anti-tekrar hafızası son ~8 kalıba genişledi.
  steal/tactic/reb/FT metinleri de anti-tekrarlı havuza taşındı. **Ölçüm: patternReuse 0.23-0.29
  (≤0.30).**

### İŞ 5 — Topsuz hareket + savunma (cila)
- Set oyununda zayıf taraf kesmesi (büyük kesici, geri köşeye açılır), pnr perdeci roll, köşe
  spot-up çapaları; contest→closeout (gevşetildi), kaçan şutta box-out (mevcut). 7/7 anim senaryosu.

### Test (hepsi geçti)
- **Gerçek Chrome ölçüm scripti 6/6 GEÇTİ** (kullanıcının verdiği hedeflerle): xSpread≥280 ✓,
  avgNN≥55 ✓, overlaps≤2 ✓, iso≤%15 ✓, spotup≥%20 ✓, moveFilled>0 ✓, metinMoveVarAlanBoş=0 ✓,
  patternReuse≤0.30 ✓, 0 konsol hatası.
- **Kırmızı çizgi:** VM band harness 200 maç skor bandı korundu (92.9/86.9, 0 istisna,
  24.278/24.278 geçerli play, **zone tutarsız 0** — "İYİ OLAN KORU" sağlandı, bitişik tekrar 0).
- Animasyon harness 7/7 hatasız. `node --check` temiz. `node tools/visual-check.js` masaüstü+mobil
  0 konsol hatası exit 0. Ekran görüntüsü: oyuncular sahaya yayılıyor, "skrum" gitti. Cache-bust v26→v27.

## 2026-07-21 (24. oturum) — Canlı maçı GERÇEKTEN İZLEYEREK saha akışı düzeltmesi (spacing + fast-break + sakin oyun kurma)

Kullanıcı (haklı) şikâyeti: "kenardan sokup sakince oyun kurmak yok, sürekli orta sahadaki
oyuncuya pas, sürekli hızlı hücum gibi, anlatım maçla senkron değil." 23. oturumda harness/konsol
doğruladım ama maçı gerçek tarayıcıda İZLEMEDİM — kök neden görülmeden düzeltilemezdi.

### Teşhis: gerçek Chrome'da canlı maç enstrümantasyonu + ekran görüntüsü analizi
- Playwright gözlem harness'leri (scratchpad) sim'i sardı: pozisyon dalları, top izi, fast-break
  oranı, ve **anlatım-top senkronu** ölçüldü + saha ekran görüntüleri alınıp gözle incelendi.
- **Bulgu 1 (asıl sorun):** `OFF_BASE_L` formasyonu potaya çok sıkışıktı (x160-312/y114-386, ~150px
  bant) → 10 oyuncu (5 hücum + 5 savunma markajı) sol çeyrekte ÜST ÜSTE yığılıyordu; sağ 2/3 boş.
  Ekran görüntüsünde "basketbol değil, ragbi skrumu" görüntüsü. Bu "sürekli tek yere pas" hissinin kaynağı.
- **Bulgu 2:** Fast break oranı yüksekti (çalma 0.55 / ribaund 0.25) → "sürekli hızlı hücum".
- **Bulgu 3 (yanlış hipotez düzeltildi):** Anlatım senkronu MEKANİK OLARAK DOĞRU — 15/15 örnekte
  şut anlatımı düştüğünde top tam çemberde (mode='rim'). Algılanan desenkron aslında spacing/blok
  kaosundan kaynaklanıyordu.

### Düzeltmeler (js/match-engine.js)
- **Gerçek yarı saha açılımı:** `OFF_BASE_L` simetrik spread'e çekildi `[[320,250],[236,96],[236,404],
  [150,178],[150,322]]` (PG top, kanatlar geniş y96/404, iki büyük boyada dikey ayrık) → min oyuncu
  aralığı ~119px, dikey açılım y96-404. Ekran görüntüsü doğrulaması: oyuncular artık frontcourt'a
  yayılıyor, eski tek-blok gitti.
- **Sakin bring-up görünür:** topsuz hücumcular spacing'e HIZLA açılır (baseV×1.25 → sprintV×0.85),
  savunma da geçişte yetişir (baseV×1.4 / pres sprintV×0.9) → tüm saha geçişinde blok halinde
  kümelenmek yerine erken yayılır; top izinde artık net bring-up + paslaşma + şut ritmi var
  (log: 749→671→630→519→357→158 karşı potaya taşınıp paslaşma → şut).
- **Fast break seyrekleşti:** çalma sonrası 0.55→0.32, ribaund sonrası 0.25→0.12 (hızlı tempo/odak
  çarpanı 1.6→1.7, tavan 0.9→0.75). Çoğu pozisyon artık sakin yarı saha hücumu.

### Test
- Gerçek Chrome ekran görüntüsü analizi (öncesi/sonrası): blok→yayılmış set ✔, sakin bring-up ✔.
- VM band harness 200 maç: 92.1/85.8 (fast break azaldığı için deplasman hafif düştü, bant ~85-95
  sağlam, ev avantajı +6.3), 0 istisna, play 24.251/24.251, 0 zone/tekrar ihlali.
- Animasyon harness 7/7 hatasız. `node tools/visual-check.js` masaüstü+mobil 0 konsol hatası exit 0.
- Cache-bust v25→v26.

### Açık (dürüst not)
Zaman-sıkıştırmalı 2D sim'de (10 dk çeyrek ~35sn'de oynanır, pozisyon ~3sn) NBA seviyesi mükemmel
spacing + uzun yerleşik set daha büyük bir iş; bu oturum blok-kaosunu belirgin biçimde düzeltti ama
kimi bring-up karelerinde hâlâ geçici yakınlaşma olabilir. İleride: pozisyon-içi daha çok pas,
rol tabanlı topsuz döngü derinleştirilebilir.

## 2026-07-21 (23. oturum) — Canlı maç gerçekçilik revizyonu TAMAM (Faz 0-6): tek "play" tanımlayıcısı + bağlam + anti-tekrar anlatım + animasyon senkronu (perde/step-back/closeout/box-out) + pas sesi

Kullanıcı prompt'u (canlı maç gerçekçilik revizyonu): anlatım tekrara düşüyor, bağlamdan
(skor farkı/seri/oyuncu formu) habersiz, sahada olan bitenle her zaman örtüşmüyor. 22. oturum
animasyon/kimlik/ETA/savunma tarafını büyük ölçüde bitirmişti; bu oturum **anlatım katmanına**
odaklandı (promptun kendi öncelik sırası: Faz 0-2 olmazsa olmaz, sonra bağlam). SUNUM
KATMANIDIR — maç sonucu matematiğine dokunulmadı.

### Mimari fikir: tek `ev.play` tanımlayıcısı (Faz 1) — `js/match-engine.js` `runPossession`
- Her şutlu olaya, sonuç belirlendikten SONRA yapısal bir senaryo eklendi:
  `play={scheme,zone,is3,shooterId,passerId,move,contest,result}`. Aynı alanlar `ev.shot`'a da
  kopyalandı (scheme/zone/contest) — animasyon ileride bunu okuyabilsin.
- **`zone` GERÇEK şut noktasından** türetiliyor (`classifyZone`: çember uzaklığı+açı → 3'lük
  köşe/kanat/tepe, 2'lik pota dibi/boya/orta mesafe). `cls` (yakın/orta/uzak) artık bundan çıkıyor
  → metin, iz ve şut noktası aynı yeri gösterir.
- `scheme` mevcut bayraklarla tutarlı: putback→`putback`, fb→`transition`, asist→`spotup`(3)/`pnr`(2),
  asistsiz→ pivot/forvet dibi `postup`, diğer `iso`. `move` yalnız asistsiz isabetlerde ve bölgeyle
  uyumlu (üçlük/orta→step-back/crossover/hesitation; dibe→drive; postup→spin). `contest`=open/contested/heavy.

### Deterministik sunum üreteci — sonuç matematiğini KORUMAK için (kritik)
- Anlatım/senaryo/bağlam rastgeleliği artık AYRI bir deterministik üreteçten (`pr`, mulberry32,
  maça özgü seed) besleniyor; **global `Math.random` yalnız sonuç randomunu taşıyor.** Böylece
  bağlam/hamle/anti-tekrar seçimleri maç sonucunu kaydıramaz.
- Eski kod anlatım seçimini global akışta yapıyordu; bu bir kerelik bant kaymasına yol açar ama
  proje pratiği (22. oturum) skor BANDI korunmasını esas alır. Ölçüm: BASE 91.8/86.5 → YENİ
  93.4/87.4 ev/dep ort (200 maç; fark kadro rastgeleliği içinde, ev avantajı +6 ve ~85-95 bandı
  sabit), uzatma %2.5-3.5, 0 istisna.

### Anlatım kompozisyonu + anti-tekrar (Faz 2)
- `spikerLinePR` + `pickLine`: havuzdan art arda AYNI kalıbı seçmez (memo, kalıp başına). Ölçüm:
  24.339 şut olayında **0 bitişik tekrar**.
- Hamle ibaresi (`MOVE_BY`) artık gerçekten yapılan hamleye göre keyed; ~%42 serpiştirilir, bölgeyle
  uyumlu. Pasör metni sahnedeki asistçiyle (sh.pid) aynı (mevcut mantık korundu).
- Bölge-metin tutarlılığı: 3'lükte turnike/smaç/dibe dili YASAK (24.339 olayda 0 ihlal).

### Bağlam katmanı (Faz 3)
- `narr` durumu: cevapsız sayı serisi (`run`/`runOff`), oyuncu sıcaklığı (`heat`, art arda isabet),
  throttle sayacı (`ctxCd`). İsabetli şutta seçili ve seyrek önek: "🔥 N-0'lık seri!",
  "Fark açıldı — N sayı", "X kızıştı — üst üste N. isabet!", "Kritik anlar, başa baş!".
- Throttle (önek arası ≥ rand(3,6) olay) sayesinde blowout'ta her sayıya etiket yapışmıyor. Ölçüm:
  200 maçta 1202 önek (≈ maç başına 6, spam değil).

### Animasyon `play`'e bağlandı (Faz 4-5) — `animateShotPossession` + `_ballStep`
- **scheme → koreografi:** `pnr`/`handoff` için PERDE — perdeci topu kurana gelir (~carryT×0.55),
  kısa sabit perde kurar, sonra pota/boşluğa açılır (roll, sprint). Transition/iso/putback/set/spotup
  dalları korundu; postup şutörü zaten boya/dibe noktasına gidiyor.
- **move → şutör mikro-hareketi:** `stepback` (önce pota yönüne bir tık girer, sonra GERİ adımla
  gerçek şut noktasına açılır), `spin` (yanal salınım→nokta), `drive` (sprint dibe iniş). fire
  beat'ine göreli eklenir (`_fireAt-0.55/-0.16`), süreyi uzatmaz.
- **contest → closeout:** contested/heavy şutlarda en yakın savunmacı şutörün önünü keser
  (`_mark`/`_zone` temizlenir ki `_simStep` son-an hedefini ezmesin; heavy gap 16, contested 24).
- **Faz 5 topsuz + box-out:** set oyununda perdeci/kesme/spacer ile üç topsuz oyuncu hareketli
  ("5 kişi çalışıyor"); kaçan şutta karşı taraftan bir oyuncu da ribaunda yüklenir (box-out/çekişme,
  cam boş kalmaz). Savunma `_simStep` canlı takibi (22. oturum) korundu.

### Ses & zamanlama (Faz 6)
- Yeni hafif `sfx('pass')` (kısık, ~35ms "vuuş" — persistence.js): asist pası (set oyunu son pas +
  fast break outlet) görsel pasla senkron çalar. Dribbling sesi bilinçli eklenmedi (21. oturum
  yorgunluk gerekçesi geçerli). Mevcut çember/file/ribaund/düdük/korna kancaları korundu.
- Koreografi süresi (`ret`) `matchStep` gecikmesini belirlemeye devam ediyor; yeni adımlar hep fire
  öncesine eklendiği için süreyi UZATMAZ (putback 1500 / fast break 2400 / set 3050 ms sabit).

### Test (hepsi geçti)
- `node --check` match-engine/persistence/main ✔. İzole VM band harness (200 maç, tüm 10 modül tek
  lexical env'de): skor bandı korundu (92.8/87.7), 0 istisna, **her şut olayında geçerli play
  (24.327/24.327, 0 eksik)**, 0 zone tutarsızlığı, 0 bitişik tekrar. Anlatım dökümü gözle temiz.
- **Animasyon harness'i** (sahte sim, 7 senaryo × 210 kare): pnr/spotup/stepback/spin/transition/
  drive+block/putback — **7/7 hatasız**, tüm adım fn'leri yürüdü, koordinatlar sonlu, ETA süreleri
  korundu (perde 9 adım, step-back/spin 10 adım vb.).
- `node tools/visual-check.js` masaüstü+mobil **0 konsol hatası, çıkış kodu 0** ✔ (canlı maç izleme
  dahil, yeni koreografi gerçek Chrome'da hatasız).
- Cache-bust v24→v25 (10 script etiketi).

### İkincil (açık bırakıldı)
- `steal`/`tactic`/`free` anlatımları anti-tekrar/bağlam sistemine taşınmadı (havuzları dar ama ana
  şikâyet şut anlatımıydı); crossover/hesitation top-taşıyıcı hamlesi salt kozmetik (hedef değişmez).

## 2026-07-13 (22. oturum) — Canlı maç GERÇEK BASKETBOL revizyonu: hava atışı, ETA senkronu, canlı savunma takibi, anlatım-saha kimlik eşlemesi

Kullanıcı şikâyeti: "oyuncular çok hızlı hareket ediyor, gerçekçi olmayan görüntüler, saçma
hücumlar, hava atışı bile yanlış; adam adama/bölge savunmasına kadar her şey doğru görünmeli."

### 1) Gerçek hava atışı (yalnız maç başı — FIBA kuralı) — `movePlayersForEvent('start')`
- Pivotlar orta yuvarlağın iki yanında (451/489,250) karşı karşıya; diğer 8 oyuncu çember
  DIŞINDA dizilir (takım başına 1 emniyet guardı geride). Top hakemde (yeni `idle` bekleyişi),
  1.05sn'de düdük + havaya atış (`_ballLoose(0,0,205)`), tepe noktasında çelme pası.
- Çelmeyi İLK POZİSYONU GERÇEKTEN KAZANAN takımın oyun kurucusu alır: `_peekNextOff()` olay
  listesinden ilk `off` damgasını okur — görsel ile simülasyon asla çelişmez.
- **Çeyrek başları (2-4 + uzatmalar) artık hava atışı DEĞİL** (FIBA münavebe): top orta çizgi
  hizasından KENARDAN sokulur (`_inboundSetup` yeniden kullanıldı). Eski "her çeyrek ortaya
  toplan + top havada" görüntüsü yalnız çeyrek/maç SONU toplanışında kaldı.

### 2) "Işınlanma"nın kökü: sabit koreografi süreleri → ETA senkronu — `animateShotPossession`
- Eskiden set oyunu sabit 2.3sn'de şutu patlatıyordu; oyuncular gerçekçi koşu hızlarıyla
  (130-315 px/sn) yetişemiyor, top "köprü" adımıyla şut noktasına sıçrıyordu → ışınlanma hissi.
- Artık her adım GERÇEK varış süresine bağlı: `etaTok(p,x,y)=mesafe/hız`. Oyun kurucu topu
  kendi hızında öne taşır (carryT 0.95-2.3sn), paslar alıcı yerine ulaşınca döner, şut ancak
  şutör noktaya varınca çıkar (üst sınır carryT+3.0sn; köprü güvenlik ağı duruyor).
- Süreler `matchStep` gecikmesine yansır (fonksiyon dönüşü) → hızlı hücum ~2-2.6sn, set oyunu
  ~3-5sn; `movePlayersForEvent` de artık koreografi süresini (ms) döndürür, şutsuz olaylarda
  `delay=max(taban, mvMs+240)` — hava atışı/çeyrek sokması/FT dizisi asla yarıda kesilmez.
- Set oyununa TOPSUZ KESME (cut) eklendi: bir hücumcu boyaya dalar, köşeye açılır.

### 3) Savunma artık CANLI — `_simStep` içinde kare-bazlı takip
- **Adam adama/pres:** `_setFormation` markajı (`p._mark`,`p._gap`) jetona yazar; `_simStep`
  her karede savunmacıyı adamının GÜNCEL konumu ile çember arasında tutar → kesme yapan
  hücumcuyu gerçekten izler (gözlem testi: 559/580 örnek ≤150px).
- **2-3 bölge:** bölge merkezi (`p._zone`) yazılır; blok her karede topa doğru SINIRLI kayar
  (maks 46px — ders kitabı bölge kayışı; gözlem: 397/397 hedef formüle uygun). Şutörün
  bölgesindeki savunmacı closeout'a çıkar.
- **Rakip bot artık salt adam adama değil:** maç başına savunma kimliği (%75 adam, %25 2-3
  bölge — `S.botDef`); ölü toplarda (`foul`/FT) takip kapanır (`S.defTrack=false`).

### 4) Anlatım-saha kimlik eşlemesi — spikerin andığı oyuncu sahada da onu yapar
- `generateMatchEvents` şut olaylarına `sid` (şutör id) + `pid` (asistçi id), 4 serbest atış
  olayına `sid` yazar. `_setFormation` şutörü artık "noktaya en yakın" değil, ANLATIMDAKİ
  oyuncunun jetonu olarak seçer; son pası `pid` jetonu atar (hızlı hücumda outlet de ondan
  geçer); FT'de çizgiye anlatımdaki şutör gelir (uzaktaysa atışlar ETA kadar ötelenir).
- FT gerçek ritmi: atışlar ~0.95sn arayla; 3 atışlık faulün 3. atışı da artık canlandırılıyor
  (eski `slice(0,2)` kesiyordu); ara kaçışlarda top saçılmaz, yalnız SON kaçışta ribaunda düşer.

### 5) Saçma hücumların düzeltilmesi — pozisyon-gerçekçi şut dağılımı
- Üçlük denemesi uzuna (C %85 / PF %55 ihtimalle) düştüyse dış oyuncuya (PG/SG/SF) devredilir —
  takım üçlük ORANI değişmez, KİMİN attığı gerçekçileşir (pivotun logo üçlüğü bitti; kullanıcı
  üçlüklerinde C payı ölçümde %2.8'e indi). Odak oyuncusu (top yükleme) muaf.
- `randShotXY` pozisyon duyarlı: C 2'likleri pota dibi (14-92px), PF boya/kısa (15-124px).
- Boşta mikro salınım 4.5→3.5px (daha sakin duruş).

### Test (hepsi geçti)
- `node --check` (match-engine/main) ✔. İzole VM harness 3×120 maç: skor bandı korunuyor
  (BASE 94.7-96.9 / YENİ 94.3-95.6 ev ort.; fark kadro rastgeleliği içinde), uzatma ~%2.5,
  her şutta `sid` ✔, `free`'de `sid` ✔ (isim-metin uyuşmazlığı yalnız %S içermeyen eski blok
  kalıplarında — hata değil).
- Özel canlı gözlem harness'i (Playwright, gerçek Chrome): hava atışı dizilişi ✔, çelme doğru
  takıma ✔ (3 koşuda 3/3), top sürekliliği 25sn'de 0 ışınlanma ✔, adam adama takip ✔, bölge
  hedef formülü %100 / yerleşik konum %92 ✔, 0 konsol hatası.
- `node tools/visual-check.js` masaüstü+mobil ✔ (0 konsol hatası, 15 adım akış, exit 0).
- Cache-bust v23→v24 (10 script etiketi).

## 2026-07-11 (21. oturum) — Ses & anlatım senkronu: cem havuzu basketbol diline çekildi + bounce sesi bağlandı

### Bulgu 1 — "Esprili Cem" havuzu (js/match-engine.js)
- Maçların ~%25'i (4 spikerden biri) basketbol-dışı esprilerle anlatılıyordu (afiyet olsun/GPS/
  kargo/çaycı/hırsız/kahve/bilet/diyet...). Kullanıcı talebi: anlatım SADECE basketbol dilinde.
- `cem` havuzunda **12 satır yeniden yazıldı** (33 satırın tümü tek tek tarandı): score2'de 2,
  score3'te 3, miss2'de 1, miss3'te 3, block'ta 2, steal'da 2, tactic'te 1. Esprili ton korundu,
  espri kaynağı sahaya taşındı (pota/çember/file/yay/turnike/boyalı alan/tribün/yedek kulübesi).
- Kategori sayıları aynen korundu (6/6/5/4/4/4/4). `_NEAR_WORDS`/`_MID_WORDS` dengesi korundu
  (score2: 3 yakın + 3 nötr, aynı önceki gibi). Diğer 3 havuz (cosku/bilge/reha) tarandı — temiz,
  dokunulmadı.
- **Test:** izole VM harness — 33 satırın hepsi üretildi (placeholder %S/%SC/%B/%C sıfır artık),
  4 havuzda yasaklı-kelime regex'i 0 eşleşme, NEAR/MID filtresi 4 spikerde 300'er örneklemede
  tutarlı (yakın şutta orta-mesafe kalıbı ve tersi hiç çıkmadı).

### Bulgu 2 — sfx('bounce') hiç bağlanmamıştı
- Ses motorundaki hazır sekme sesi (persistence.js:107) repo genelinde 0 çağrıya sahipti; oysa
  `_ballStep` 'loose' modu gerçek zıplama fiziği çiziyordu (top çalma/kaçan şut/blok/ribaund).
- **2a (yapıldı):** 'loose' zemin temasında `sfx('bounce')` — eşik, sönümden **ÖNCEKİ** çarpma
  hızına göre (`impact>30`): fiziksel olarak ses şiddetini zemine geliş hızı belirler. Sonuç:
  ilk sekme (55-110) hep sesli, ikinci (~29-57) çoğu zaman sesli, üçüncü+/mikro-sekme sessiz —
  doğal "tok… tok…" sönümü. Tüm `_ballLoose` kaynakları eşik üstünde başlıyor (steal 55,
  kaçan FT 95, blok 90, ribaund saçılması 110).
- **2b (BİLİNÇLİ YAPILMADI — Seçenek A):** dribbling ('held' mod) sekme sesi eklenmedi.
  Gerekçe: animasyon her ~0.35-0.5sn'de görsel sekme üretiyor → maç başına yüzlerce tetikleme;
  osilatör tabanlı sentetik "tok" gerçek yayındaki gibi ortam miksinde eritilemiyor (ducking/
  ambiyans katmanı yok) → hızla yorucu olur. Risk asimetrik: sonradan eklemek kolay, yayınlanmış
  rahatsız edici sesi geri almak kötü. İleride istenirse Seçenek B tarifi görev brifinde mevcut.
- **Test (canlı, Playwright):** 75sn canlı maçta 5 kayıp-top sekmesi gözlendi — 5/5 ses çağrısı
  görsel zemin-temas karesiyle aynı anda (<2ms, `_ballStep` ve `sfx` ayrı ayrı enstrümante
  edilerek eşleştirildi); ses hep mode='loose', h=0 anında. Ses kapalıyken (`G.settings.sound=
  false`) 15sn maç: 0 hata. Not: mikro-sekme susturması bu koşuda canlıda örneklenmedi (loose
  top hızla tutuluyor), eşik mantığı analitik olarak doğrulandı.
- `node --check` ✔, `tools/visual-check.js` masaüstü+mobil 0 konsol hatası ✔. Cache-bust v22→v23.

### Test edilmesi gerekenler (kullanıcı, tarayıcıda — sesli!)
1. Maç izle: top çalma / kaçan şut sonrası top yere sekerken "tok" sesini duy (görselle aynı an).
2. "Esprili Cem"li bir maçta (4 maçta ~1) anlatımda yemek/kargo/GPS/çaycı türü espri KALMAMALI.
3. Ayarlardan sesi kapat → sekme sesi de sussun, konsol hatası olmasın.

## 2026-07-11 (20. oturum) — TASARIM REVİZYONU: yorgunluk/sakatlık riski görünür kılındı (20.1–20.5)

**Bağlam:** Zorluk mekaniği (yorgunluk bazlı dinamik sakatlık riski, `rollInjuriesAfterUserMatch`)
tamamen arka plandaydı — enerji sadece yedek kartında görünüyordu, `kronikYorgunlukSayisi` (en büyük
çarpan, +%60'a kadar) hiçbir yerde render edilmiyordu, öğretici sistemden hiç bahsetmiyordu. Oyuncu
riski göremediği için "anlamlı seçim" değil "gizli zar" gibiydi. Bu oturum **salt görüntü katmanı** —
risk formülüne/oyun mantığına dokunulmadı, sadece mevcut alanlar okunup gösterildi.

### Yapılanlar
- **Ortak yardımcı `enerjiRozetHtml(p,compact)`** (`js/league.js`, `_lineupPlayerById` altı): renkli
  ⚡enerji (eşikler yedek kartıyla aynı: ≥70 yeşil / ≥45 sarı / altı kırmızı) + `kron>=2` ise 🥵(×N,
  "art arda yorgun") + `formReturnMatches>0` ise 🩹("yeni döndü"); hepsi title tooltip'li. Tek kaynak —
  4 ekran bunu kullanıyor, renk mantığı tekrar icat edilmedi (`lineupBenchCardHtml` da buna geçirildi).
- **20.1 Saha yuvası** (`lineupSlotHtml`): OVR satırının altına ikinci `lu-sub` satırı olarak rozet
  eklendi (tek satırda 74px yuvaya sığmıyordu, ayraç sarkıyordu → bilinçli iki satır).
- **20.2 Kadro sayfası**: hem **Liste** görünümü (`renderRosterListRow`, maaş satırına ekli) hem
  **Kart** görünümü (`renderPlayerCard`, yalnız `showList=true` yani kendi kadron — market/altyapı
  kartlarına bulaştırılmadı; ekranda varsayılan görünüm Kart olduğu için bu şarttı).
- **20.3 Kronik yorgunluk + sakatlıktan dönüş** rozetleri yukarıdaki yardımcıyla her yerde görünür
  (tam risk yüzdesi bilinçli gösterilmiyor — "oyunu çözme" hissi vermemek için sinyal düzeyinde).
- **20.4 Öğretici**: `TUT_STEPS`'e 6. adım olarak (Gelişim→Hedef arası) '⚡ Enerji ve sakatlık riski'
  eklendi (7 adım oldu; metin aşağıda, rapor bölümünde).
- **20.5 Proaktif uyarı (yapıldı):** `saveLineup(force)` — ilk 5'te enerji<45 veya `kron>=3` oyuncu
  varsa kaydetmeden önce onay modalı ("Riskli İlk 5": oyuncu listesi rozetlerle + "↩ Geri dön" /
  "Yine de kaydet"). Native `confirm()` değil `showAppModal` (otomasyon/UX tutarlılığı). Yeni
  kariyerde enerjiler 100 olduğundan test akışını etkilemiyor.
- **Test kapsamı genişletildi** (`tools/visual-check.js`): kadro sayfası (mutasyonlu enerji/kron/dönüş
  durumlarıyla), ilk 5 editörü, riskli-kaydet onay modalı ve yeni öğretici adımı akışa + ekran
  görüntülerine eklendi (15→19 adım). Durum sonrasında sıfırlanıyor, sonraki adımlar etkilenmiyor.
- **Cache-bust v21→v22** (10 script etiketi) — değişiklikler canlıya ulaşsın diye (19. oturum dersi).

### Kararlar / gözlemler
- 20.5 uygulandı çünkü tasarım belirsizliği yoktu ve "kararı bilerek alma"nın en güçlü güvencesi bu;
  eşikler brief'teki gibi (enerji<45, kron≥3) — 🩹 tek başına uyarı tetiklemiyor (her dönüşte modal
  açılması gereksiz sürtünme olurdu).
- **DİKKAT (araç dersi):** `charazay2.0.html` üzerinde PowerShell `Get-Content -Raw`+`Set-Content`
  ile toplu replace Türkçe karakterleri bozdu (BOM'suz UTF-8'i ANSI okuyor) → `git checkout` ile geri
  alınıp Edit aracıyla yapıldı. Bu dosyada PS ile metin değiştirme YAPMA.
- Doğrulama: `node --check` (league/render/persistence/visual-check) ✔; `tools/visual-check.js`
  masaüstü+mobil **0 konsol hatası, çıkış kodu 0** ✔; ekran görüntülerinde taşma/bozulma yok
  (yuva rozetleri iki satırda temiz, kart/liste satırları tek satırda sığıyor).

### Test edilmesi gerekenler (kullanıcı, tarayıcıda)
1. Kadro sayfası (Kart ve Liste): her oyuncuda renkli ⚡enerji; birkaç maç sonrası düşüşü izle.
2. İlk 5 editörü: yuvalarda ve yedeklerde ⚡; yorgun oynatılan oyuncuda 🥵, sakatlıktan dönende 🩹.
3. Çok yorgun (kırmızı ⚡) oyuncuyla ilk 5 kaydet → "Riskli İlk 5" onayı çıksın; "Geri dön" editöre
   dönsün, "Yine de kaydet" kaydetsin.
4. Yeni kariyerde öğreticide 6. adım (⚡ Enerji ve sakatlık riski) görünsün.

## 2026-07-11 (19. oturum) — Cache-bust v21 + final tam regresyon (18 oturumluk birikim tek akışta)

### Görev 1 — ACİL: cache-bust v20→v21 (canlıda doğrulandı)
- 18. oturumun güvenlik düzeltmesi (persistence/roster-gen) ve 17. oturumun match-engine değişikliği
  `?v=20` altında kalmıştı — CDN/tarayıcı cache'i eski (açık içeren) dosyaları sunabilirdi.
- `charazay2.0.html`'deki 10 script etiketi birden `?v=21` yapıldı (commit `2c8f101`), push sonrası
  **canlı sitede doğrulandı:** `basketlig.vercel.app/charazay2.0.html` 10/10 etiket v=21; ayrıca canlı
  `js/persistence.js?v=21` içinde `_sanitizeImportedSave` ve `js/roster-gen.js?v=21` içinde 5 sarılı
  `setItem` içerik olarak teyit edildi — güvenlik düzeltmesi gerçek kullanıcılara ulaşıyor.

### Görev 2 — Tauri: toolchain hâlâ yok, denenmedi
- `npx tauri info` yeniden koşuldu: WebView2 ✔, ama rustc/cargo/rustup ve VS Build Tools (MSVC+SDK)
  hâlâ kurulu değil → gerçek `tauri build` yine çalıştırılamadı (kural gereği kurulum yapılmadı).
  17. oturumdaki statik doğrulama + "Rust kurulunca doğrulanacaklar" listesi geçerliliğini koruyor.

### Görev 3 — Final tam regresyon: GEÇTİ (17/17 iddia, 0 konsol hatası)
- `tools/visual-check.js` ✔ masaüstü+mobil, 15 adım, 0 hata, çıkış kodu 0.
- Ayrıca **tek kesintisiz Playwright oturumunda** uçtan uca senaryo (scratchpad harness'i):
  1. Yeni kariyer → canlı lig maçı → kenardan sokma gözlemi ✔ (top sokucuda, spot'a 7px).
  2. **C1 save-scum:** maç başlat → 2.5sn canlı → kaydet → sayfa yenile → "Kayıttan devam et" →
     state fingerprint birebir aynı; maç yeniden başlatılınca kilitli sonuç uygulandı, skor
     kilitle birebir (93-89). Save-scum açığı kapalı ✔.
  3. **Gerçek import yolu:** dışa aktarılan kayıt elle bozuldu (oyuncu adı "Ümit Çağlar-Öz 34 ĞüŞiö")
     → `#importSaveFile` ile içe aktarıldı → oyun çökmedi, Türkçe/rakamlı isim bozulmadan geldi
     (18. oturum sanitizer'ı meşru karakterlere dokunmuyor) ✔.
  4. Sezon C1-hızlı akışla bitirildi (19 lig maçı) + araya **5 kupa maçı** serpildi → playoff kuruldu
     ve tamamlandı (kullanıcı ilk 8'e giremedi → seriler simüle, şampiyon belirlendi) → sezon
     ödülleri playoff bitişinde otomatik gösterildi ✔.
  5. Transfer: gerçek `acceptIncomingOffer` (oyuncu satıldı, +12000 KR, kadro 15→14) +
     `rejectIncomingOffer` (oyuncu kaldı, kuyruk boşaldı) ✔.
  6. Draft: `startDraft` + kullanıcı seçimi ✔.
  7. İflas: kasa -40000 → `processBankruptcy`×3 → zorunlu satış (14→11), kadro ≥8 korundu, geri alındı ✔.
  8. Final bütünlük: tüm sistemler işledikten sonra kaydet→yenile→devam → fingerprint birebir ✔.
- Kod değişikliği GEREKMEDİ — hiçbir adımda hata çıkmadı (bu oturumda değişen tek dosya
  `charazay2.0.html`, sadece v21 bump).

## 2026-07-11 (18. oturum) — Güvenlik & kararlılık: import XSS kapatıldı + roster-gen localStorage koruması

### Görev 1 — İçe aktarılan kayıt dosyası saklı XSS'e açıktı (KRİTİK, kapatıldı)
- **Sorun:** `importGameJson` → `applyGameState` yolu hiç sanitizasyon yapmıyordu; elle düzenlenmiş
  bir `.json` kaydın isim alanlarına (`team.isim`, `p.isim`, `managerName`, `arena.isim`, `ligTeams`,
  sezon maç adları…) gömülen `<img onerror=...>` payload'ı, escMatch'siz `innerHTML` noktalarında
  (match-engine.js'te 0, roster-gen.js'te 0 escMatch kullanımı) çalışırdı.
- **Düzeltme (persistence.js, tek nokta):** `applyGameState` girişine `_sanitizeImportedSave(d)`
  eklendi. İki katman: (1) `_stripSaveMarkup` — kayıttaki TÜM string alanlardan `<>"'`` ` derin
  (recursive, derinlik sınırlı) temizlik; tag açmak/attribute kırmak bu karakterler olmadan mümkün
  değil, `&` URL'leri (logoUrl) bozmamak için korunur. Kayıt formatında meşru HTML alanı olmadığı
  doğrulandı (haber satırları sessionStorage'da, maç olay metinleri düz). (2) Ana ad alanlarına
  (`team.isim`, `managerName`, `arena.isim`) UI girişiyle birebir `sanitizeTeamName` (&+trim+40).
  Oyuncu isimlerine 40 karakter sınırı UYGULANMADI (derin temizlik sınırsız — brifteki
  `sanitizeDisplayName` ihtiyacını bu karşılıyor). İçe aktarma + normal yükleme aynı noktadan
  geçtiği için idempotent; temiz kayıtta no-op.
- **Neden geniş kapsam:** Brifteki alan listesi (team/players/youth/market) yeterli değildi —
  `ligTeams[].isim` ve `season.matches[].home/away` maç anlatımına (escMatch=0) giriyor; derin
  temizlik şekil saymadan hepsini kapatıyor.
- **Opsiyonel ek görev (match-engine/roster-gen'e escMatch serpme) YAPILMADI:** import + UI girişleri
  tek noktadan temizlendiği için state'e işaretleme girme yolu kalmadı; onlarca render satırına
  dokunmak "minimal değişiklik" kuralına aykırı riskti.

### Görev 2 — roster-gen.js localStorage çağrıları try-catch'e alındı (KRİTİK, kapatıldı)
- 7 çağrının tümü sarıldı: `ensureTblState` 4×getItem (tek try bloğu, başarısızsa null→temiz state
  üretimi) + 2×setItem (satır 334, 377), `assignUserToTblSlot` 2×setItem (393, 397),
  terfi/düşme `finish` 1×setItem (547). Desen projenin geri kalanıyla aynı: `try{...}catch(e){}` —
  yazma başarısızsa bellek-içi state ile oyun devam eder.

### Test (hepsi geçti)
- `node --check js/persistence.js js/roster-gen.js` ✔.
- **XSS senaryosu (Playwright, gerçek tarayıcı):** payload'lı kayıt `applyGameState`'ten geçirildi
  (import ile aynı yol), dashboard/kadro/lig render edildi → `window.__xss` tanımsız (payload
  ÇALIŞMADI), tüm isimler düz metin, 0 konsol hatası. Temiz kayıt yeniden uygulaması sorunsuz.
- **Storage engelli senaryo (Playwright):** `localStorage`'a her erişim SecurityError fırlatırken
  tam yeni kariyer akışı → `createTeam` çökmedi; takım kuruldu (tblKey=tbl, 15 oyuncu, 20 lig
  takımı), 0 yakalanmamış istisna.
- `tools/visual-check.js` ✔ masaüstü+mobil, 15 adım, 0 konsol hatası, çıkış kodu 0.

### Görev 3 — Bu turda kontrol edildi, temiz (kod değişikliği yok)
Fonksiyon çakışması yok; DOM id çakışması yok; 2 `setInterval` (mola sayacı, otokayıt) düzgün
temizleniyor; `processBankruptcy` kadroyu 8'in altına düşürmüyor; tüm `js/*.js` `node --check`
temiz; i18n bilinçli ertelenmiş (`I18N-YOL-HARITASI.md`), dokunulmadı.

## 2026-07-11 (17. oturum) — Tauri build doğrulaması + v20 kenardan sokma tam regresyonu

### Görev 1 — Tauri masaüstü build doğrulaması (toolchain yok → statik + kısmi çalıştırma)
- **Ortam:** `npx tauri info` → WebView2 ✔ (150.0.4078.48), ancak **rustc/cargo/rustup YOK ve
  VS Build Tools (MSVC+SDK) YOK** → gerçek `tauri build`/`tauri dev` bu makinede çalıştırılamadı.
  Rastgele kurulum yapılmadı (görev kuralı).
- **Çalıştırılabilen kısım:** `node tools/build-desktop.js` sorunsuz → `dist-desktop/` 214 dosya,
  2.9 MB (index.html + charazay2.0.html + js/ + assets/).
- **Statik inceleme (tutarlı bulundu):** `tauri.conf.json` şema v2, `frontendDist: ../dist-desktop`
  (src-tauri'ye göre doğru), beforeBuild/DevCommand `node tools/build-desktop.js` (script
  __dirname-göreli, CWD'den bağımsız) ✔; `Cargo.toml` tauri v2 + tauri-build v2, sürüm 2.0.0
  package.json/tauri.conf ile uyumlu ✔; `main.rs` minimal `generate_context!` sarmalayıcı ✔;
  ikonlar geçerli (icon.ico gerçek ICO 32×32, icon.png 512×512 RGBA) ✔.
- **Rust kurulunca doğrulanması gerekenler:** (1) ilk `cargo build`ün tauri v2 crate'lerini gerçekten
  çözdüğü; (2) msi+nsis bundle üretimi (WiX/NSIS CLI otomatik iner); (3) icon.ico'nun 32×32 tek boyut
  olması — kurulumda/görev çubuğunda bulanık görünürse çok boyutlu ICO üretilmeli (kozmetik);
  (4) Google Fonts çevrimdışı masaüstünde yüklenmez — yazı tipi yedeği (sans-serif) devrede, istenirse
  fontlar pakete gömülebilir. Kurulum: rustup.rs + VS Build Tools (MSVC+Windows SDK iş yükü),
  ardından `npm run desktop:build`.

### Görev 2 — v20 (kenardan sokma) tam regresyon: GEÇTİ + 1 zamanlama düzeltmesi
- `tools/visual-check.js` (masaüstü 1440×900 + mobil 390×844, 15 adımlı tam akış) **iki kez** koşuldu:
  değişiklik öncesi ✔ 0 hata, düzeltme sonrası ✔ 0 hata (çıkış kodu 0).
- **Özel gözlem harness'i** (Playwright, gerçek tarayıcı): `_inboundSetup`/`_inboundPass` sarılarak
  canlı maçta kenardan sokmalar ölçüldü + her içeri pas anında saha ekran görüntüsü alındı.
  - İlk tur (6 gözlem): 5/6 temiz; **1/6 kusur** — sokucu uzaktan seçilince sabit 0.55-0.60sn'lik
    pas anına yetişemiyor, içeri pası saha İÇİNDEN atıyordu (top yine elindeydi — hayalet pas değil,
    ama kural görünümü bozuk; spot'a 184px mesafe kala pas).
  - **Düzeltme (match-engine.js, minimal):** `_inboundSetup` artık sokucunun çizgiye varış süresini
    hesaplıyor (`_inbEta = mesafe/sprintV + 0.20`, tavan 1.5sn); 3 çağrı yeri de (faul yan çizgi,
    set oyunu sayı sonrası, şutlu hücum sayı sonrası) içeri pası bu ETA'dan önce atmıyor, takip
    adımları + `ret` (matchStep gecikmesi) aynı payla öteleniyor. Hız hilesi/ışınlanma YOK —
    gerçekçi koşu hızları (16. oturum kararı) korunuyor, sadece pas zamanı bekliyor.
  - İkinci tur (10 gözlem, dip çizgi + faul yan çizgi dahil): **10/10 temiz** — pas anında sokucu
    spot'a ≤10px (çizgi gerisinde), top hep sokucunun elinde, 0 konsol hatası. 4 ekran görüntüsü
    görsel olarak da doğrulandı (sokucu çizgi gerisinde, top çizgiden içeri uçuşta).
- `node --check js/match-engine.js` ✔. İzole VM harness'i gerekmedi: değişiklik salt görsel
  koreografi zamanlaması (`generateMatchEvents`/skor mantığı dokunulmadı); gerçek tarayıcı
  gözlem harness'i + tam visual-check daha güçlü kanıt.

## 2026-07-10 (16. oturum, 3. tur) — Kenardan sokmayı GERÇEK OYUNCU yapıyor (hayalet pas bitti)

Kullanıcı şikayeti: "kenardan oyuna sokulurken kenarda pas atan oyuncu yok, top kendi kendine
oyuna dahil oluyor" + bu tarz tüm mantık hatalarını düzelt.

### Sorun
2. turdaki kenardan sokma topu SAHA DIŞI BOŞ BİR NOKTAYA uçurup oradan kimse yokken içeri
"hayalet pas" atıyordu (3 yerde): (1) `animateShotPossession` sayı sonrası şutlu hücum,
(2) `movePlayersForEvent` tactic dalı sayı sonrası set oyunu, (3) faul dalı — top direkt
hücumcunun eline ışınlanıyordu ("top yandan girer" yorumuna rağmen).

### Çözüm — sokucu (inbounder) oyuncu
- Yeni yardımcılar (`match-engine.js`): **`_inboundSetup(spot,offP,exclude)`** — spota en
  yakın uygun hücumcuyu seçer, formasyon hedefini `_retTx/_retTy`'ye saklar, sprintle çizgi
  GERİSİNE yollar ve topu ona verir (top elinde taşınarak dışarı çıkar);
  **`_inboundPass(inb,to,dur)`** — içeri pası sokucu atar, sonra saklanan hedefe (sahaya)
  geri koşar, hızı `baseV`'ye döner.
- **Sayı sonrası şutlu hücum:** sokucu = pg+şutör HARİCİ en yakın; içeri pas 0.60'ta,
  hücumun kalan adımları +0.25sn ötelenir ve dönen süreye +250ms eklenir (sokucunun çizgiye
  varma payı; `matchStep` gecikmesi otomatik uyar).
- **Sayı sonrası şutsuz set oyunu:** aynı akış (0.60 içeri pas → 1.10/1.45 paslaşma).
- **Faul:** top EN YAKIN yan çizgiden (y=30/470, x top konumuna kilitli) sokucu eliyle girer.

### Test
- Yeni izole VM harness (`inbound-harness.js`, scratchpad): 3 senaryo × 60 iterasyon =
  **1080 kontrol, 0 hata** — sokucu spota gidiyor, top onda, pas ANINDA sokucu çizgi
  dibinde, pas alıcıya, sokucu sahaya dönüyor, `_retTx` temizleniyor.
- `node --check` temiz; `node tools/visual-check.js` masaüstü+mobil 0 konsol hatası.
- Cache-bust `?v=20`.

## 2026-07-10 (16. oturum, 2. tur) — Gerçek basketbol akışı: pozisyon devri + kenardan sokma + hücum türü hızları

Kullanıcı şikayeti: (1) "oyuncular ortadan şut atıyor"; (2) "oyun sürekli aynı hızda dönüyor,
fastbreak-normal hücum farkı yok"; (3) "sayıdan sonra kenardan top oyuna girmeli"; (4) diğer
mantık hatalarını da bul-düzelt.

### 1) Şut noktaları derinliği kırpıldı
- `randShotXY`: kaçan üçlük yayın en fazla **38px (~1.1m)** gerisinden (eskiden 62px — orta
  yuvarlağın dibinde "ne alaka" şutlar üretiyordu).

### 2) Pozisyon akışı artık gerçek basketbol (EN BÜYÜK değişiklik)
- Eskiden HER pozisyonun sahibi bağımsız yazı-turaydı (%53/%47) — sayıdan sonra aynı takım
  üst üste hücum edebiliyordu. Yeni model (`posNext`): **sayı/serbest atış → top rakibe; kaçan
  şut → ribaundu alan takım (%26 hücum ribaundu → aynı takım devam); top çalma → çalan takım;
  şutsuz faul & mola → top hücumda kalır.** Maç başı hava atışı rastgele.
- Kalkan %53 ev sahibi pozisyon payının yerine **ev avantajı isabete taşındı** (ev ×1.03 /
  deplasman ×0.97). 400 maç: ort. 92.3/86.5 sayı (bant korundu), ev farkı +9.2 vs deplasman +2.6.
- 120 maç / **14.106 ardışık olay geçişinde 0 pozisyon akışı ihlali** (harness kuralları:
  skor→döner, reb→rebIsUser tarafı, steal→döner, foul/tactic→kalır).

### 3) Hücum türleri gerçek hıza kavuştu
- Üretici artık şutlara bayrak damgalar: **`fb` (hızlı hücum)** — çalma sonrası %55 / savunma
  ribaundu sonrası %25, iki takım için de; kullanıcının hızlı tempo/odak'ı ×1.6, yavaş tempo ×0.5.
  Hızlı hücumda 2'lik isabet +0.07 (kolay sayı). Anlatım "⚡ Hızlı hücum!" öneki alır.
- **`pb` (putback):** hücum ribaundu anlatımı basıldıysa ~%55 AYNI oyuncu pota dibinden (≤58px)
  tekrar dener — top zaten elinde, 2 adımlı hızlı koreografi. Anlatım "İkinci şans!" öneki.
- **Olay süresi hücum türüne göre:** `animateShotPossession` gerçek süresini döndürür,
  `matchStep` gecikmeyi ona bağlar: putback ~1.7sn, fast break ~2.2sn, izolasyon ~2.8sn,
  set oyunu ~3.1sn. "Hep aynı tempo" hissi bitti.

### 4) Sayı sonrası top KENARDAN oyuna giriyor
- Sayı/serbest atış sonrası yeni hücum: top önce **dip çizgi gerisindeki (saha dışı) noktaya**
  gider, 0.42sn'de içeri pasla oyun kurucuya — potadan direkt hücuma dönme yok. Hem şutlu
  hücumda hem şutsuz (tactic) set oyununda.

### 5) Blok yenen şut artık çembere UÇMUYOR
- `sh.blk` bayrağı: bloklu şutta top kısa yükselip savunma yönüne çelinir, serbest kalır,
  ribaund kovalanır (eskiden "blok" anlatımına rağmen top çembere kadar normal parabol çiziyordu).

### Test
- VM harness 8 test grubu: senkron (1058 reb + 532 steal ✓), pozisyon akışı (0 ihlal), skor
  bandı, fb 1345 / pb 185 / blk 705 bayrak doğrulaması (putback ≤70px + ribauntçu ismi metinde),
  animasyon dalları (süre + OOB inbound noktası x=902 ✓). `node --check` temiz.
- `node tools/visual-check.js` masaüstü+mobil 0 konsol hatası. Cache-bust `?v=19`.

## 2026-07-10 (16. oturum) — Canlı maç: anlatım/oyuncu/top senkronu (ribaund + top çalma + 5 faul)

Sorun: anlatım "X ribaundu aldı / X topu çaldı" derken sahada top RASTGELE bir jetona
gidiyordu; 5 faulle çıkan oyuncunun jetonu da eski ismi taşımaya devam ediyordu.

### 1) Ribaund (`reb`) — anlatımdaki oyuncu topu alır
- `generateMatchEvents`: `reb` event'ine `rebId` (oyuncu kimliği) + `rebIsUser` (kullanıcı 5'i mi)
  eklendi; taraf `rebOff?userPos:!userPos` ile NET hesaplanıyor (eskiden sahnede %50 yazı-tura
  atılıyordu — %26 hücum ribaundu oranını bile bozuyordu).
- `movePlayersForEvent`: `reb` bloğu `_setFormation`'dan ÖNCEYE erken-dönüş olarak taşındı —
  ribaund önceki şutun devamı; formasyon çağrısı, `animateShotPossession`'ın ribauna koşturmaya
  başladığı oyuncunun hedefini siliyordu. Jeton `rebId` ile `S.home/S.away`'den bulunur;
  eşleşme yoksa eski rastgele davranışa güvenli fallback.

### 2) Top çalma (`steal`) — anlatımdaki oyuncu topa koşar
- 3 üretim noktasına (pres, erken hücum hatası, normal top kaybı) `stealId` + `stealIsUser`
  eklendi. Sahnede jeton kimlikle bulunur (fallback: rastgele savunmacı).
- Loose top sürtünmeyle kaymaya devam ettiğinden hırsızın hedefi 0.15s/0.35s ara script
  adımlarıyla topun GÜNCEL konumuna tazelenir; 0.55s'de `_ballHold`.

### 3) 5 faul — yerine giren yedek artık saha jetonuna da yansır
- Yeni `swapCourtToken(outId,inPlayer)` (match-engine.js): jetonun `.pl` referansı, isim
  etiketi (`text:last-child`) ve `baseV/sprintV/maxV` hızları yeni oyuncuya devredilir.
- `main.js matchStep`: kullanıcı tarafında `ev.subIn` + `G.players` araması ile; rakip tarafında
  `oppFoulsOut` event'e `subOutObj/subInObj` (nesne — bot kadrosu `G.players`'ta yok, id işlemez)
  yazar. NOT: rakip event'ine bilinçli olarak `subOut` id'si KONMADI — `main.js`'teki mevcut
  `if(ev.subOut)` bloğu onu kullanıcı kadrosu sanıp `userCourtIds`'e itecekti.

### Test
- `node --check` iki dosyada temiz. İzole VM harness (10 modül + DOM stub): 140 maçta
  1109 reb + 528 steal event'inin TÜMÜ doğru kimlik/taraf/isim taşıyor (0 hata); sahne testi
  80/80 doğru jeton, reb'de 0 formasyon çağrısı (tactic'te 1 ✓), fallback 10/10 güvenli;
  swapCourtToken isim+hız devri ✓; 60 maçta 91 rakip 5-faul değişiminin hepsi `subOutObj`
  taşıyor, kullanıcı kadro takibine 0 id sızıntısı.
- `node tools/visual-check.js`: masaüstü + mobil, 15 adım, **0 konsol hatası, exit 0**.
- Cache-bust `?v=18`.

## 2026-07-09 (15. oturum) — Canlı maç: anlatım-geometri tutarlılığı + ışınlanma düzeltmeleri

Kullanıcı: (1) "oyuncu uzaktayken smaç basıyor"; (2) "turnike atıyor, 2'de 2 kusursuz yazıyor —
sanki faul atmış gibi"; (3) "bazen çok hızlı hareket, mantıksız yön değiştirme, ışınlanma".

### 1) Anlatım artık şut GEOMETRİSİYLE uyumlu
- Şut sınıfı: çembere ≤90px (~2.7m) = "yakın", üstü = "orta". `spikerLine` score2/miss2 havuzları
  sınıfa göre filtrelenir: **turnike/smaç/pota altı dili yalnız yakın şutlarda**, "orta mesafeden
  vurdu" dili yalnız uzak şutlarda. MOVE_LINES da filtreli ("dibe indi" uzakta yasak, "step-back"
  yakında yasak). And-1 metni sınıfa göre ("turnikeyi bitirdi" / "şutu soktu").
- Doğrulama: 300 maç / **24.918 şut olayında 0 dil-mesafe ihlali**.

### 2) Serbest atış metni netleşti
- `ftLine`: "çizgiden 2'de 2 — kusursuz" → **"serbest atışlarda 2/2 — hepsi içeride"**; şut faulü
  öncülü "şut anında faul aldı — 2 serbest atış kullanacak" olarak açıldı. Artık FT sonucu saha
  şutuyla (turnike) karıştırılamıyor; 300 maçta tüm 'free' metinleri "serbest atış" içeriyor.

### 3) Işınlanma / ani hız kaynakları kapatıldı
- **Çarpışma itmesi sınırlandı** (kare başına maks 1.3px ≈ 78px/sn) — kalabalık anlarda (ribaund,
  FT dizilimi) jetonlar artık zıplamıyor. **Şutör itilmez** (yalnız karşı taraf kayar) — pozisyona
  zamanında varır. Ölçüm: tepe oyuncu hızı 10.6 → **9.9 m/sn** (insan sınırında), şut anında
  şutör↔şut noktası 12.9 → **4.0px**.
- **Köprü pası:** şuttan 0.25sn önce top şut noktasından hâlâ >36px uzaksa kısa bir sıçrayışla
  oraya taşınır — `fire`'daki mutlak hizalama artık görünür bir ışınlanma üretmiyor. (Statik pas
  hedefine vx/vy/side alanları eklendi — NaN üretimi engellendi; harness'e NaN dedektörü kondu: 0.)
- **Turnike görünümü:** pota dibi şutlarda top alçak-hızlı yay çizer (arc 16+d·0.10), uzak şutlar
  yüksek parabol — yakın şut artık üçlük gibi havalanmıyor.

### Canlı doğrulama (gerçek Chrome)
- Yerel sunucudan gerçek Chrome'da maç izlendi: akış sorunsuz (Ç1 28-10), kutu istatistikler
  tutarlı, **0 konsol hatası**; izleme kancası 40sn örnekledi (sekme arka planda olduğundan tarayıcı
  zamanlayıcı kısması nedeniyle örneklem düşük — mekanizma doğrulaması headless ölçümlerle tam).
- Headless metrikler: 0 donuk kare, 0 saha dışı, 0 NaN, senkron ihlali 0, skor bandı 90.0.
  visual-check 17 adım masaüstü+mobil 0 hata. Cache-bust `?v=17`.

## 2026-07-09 (14. oturum) — Hız/senkron düzeltmesi + KUPA + Kariyer Özeti + İkincil Pozisyon

### ACİL 1 — Oyuncu hızı gerçek ölçeğe çekildi
Kullanıcı: "oyuncular sahada aşırı hızlı". Ölçek analizi: saha 940px=28m (1px≈0.03m); eski taban
260-400 px/sn = **7.8-12 m/sn** (sürekli dünya rekoru sprinti), sprint 620 px/sn = 18.6 m/sn.
- `_tokBaseV`: 130-210 px/sn (≈3.9-6.3 m/sn koşu), sprint ×1.5 (maks ~9.4 m/sn). Pas hızı ~16 m/sn'ye
  sınırlandı (uzun pas 0.9 sn havada). Şutör artık şut noktasına **o an en yakın** hücumcudan seçilir
  (kısa yol). Koreografi uzatıldı: set oyununda şut 2.3 sn'de, olay gecikmesi 2500→**3100 ms**.
- Ölçüm: hareket halindeki ortalama **3.9 m/sn**, tepe 10.6 m/sn (tek karelik çarpışma itmesi dahil).

### ACİL 2 — Anlatım ↔ saha tam senkron
Sorun: anlatım+skor tabelası olay başında basılıyordu; şut sahada ~2 sn sonra oluyordu (anlatım
"ispiyonluyordu"). Çözüm: `matchStep`'te skor tabelası + kutu skor + çeyrek panosu + anlatım tek
`paint()` paketine alındı; **şutlu olaylarda paket topun ÇEMBERE VARDIĞI anda** basılır (iz atış
anında, ses fileyle birlikte). Şutsuz olaylar anında. İç durum (mState.score) hemen güncellenir
(duraklatma/kilit güvenliği). Ölçüm: şut anlatımı düşen her örneklem karesinde top çember bölgesinde.

### Paket 2 — 📜 Kariyer Özeti (salt okunur)
- Üst barda yeni "📜" ikonu → modal: sezon, toplam maç (`careerMatches`), kariyer G/M (yeni
  `careerWins/Losses` sayaçları), menajer itibarı, başarım sayısı, kronolojik onur listesi
  (`managerHistory`), kulüp rekortmenleri (`G.clubRecords`: kariyer en skoreri + en uzun süre kulüpte —
  sezon kapanışında `p.kariyerPts/kariyerMac` birikimiyle güncellenir). Hepsi serialize ediliyor.

### Paket 3 — 🧭 İkincil pozisyon antrenmanı
- Antrenman sayfasında yeni kart: komşu pozisyon eğitimi (PG↔SG↔SF↔PF↔C; çapraz atlama reddedilir),
  15 oyun günü + ~10.4K KR; ilerleme `G.posTraining` (serialize), tamamlanınca `p.ikincilPoz`.
- **Pozisyon uyumu artık motorda:** `pozFitMul` — doğal poz tam, ikincil poz -%4, yabancı poz -%10
  isabet. `matchLineup` önce doğal poza atadığından normal kadrolarda çarpan 1 (eski davranış birebir).
- İlk 5 editöründe rozet: ikincil pozdaki oyuncuda mavi "2", yabancı pozda sarı "!". (Editörde
  pozisyon kısıtı zaten yoktu; şimdi görünür bilgi + gerçek performans etkisi var.)
- Test: eğitim akışı/çapraz red/save-load/20 maç bandı (87.3) — hepsi geçti.

### Paket 1 — 🏅 ULUSAL KUPA (lig ile paralel tek eleme)
- **Format:** gruptaki 20 takım; kura (yıl+isim hash, deterministik) → 8 takım Ön Eleme (4 maç),
  12 bye → Son 16 → Çeyrek → Yarı → FİNAL. `G.cup` (serialize) + `G.cupHistory` (şampiyon arşivi).
- **Takvim:** kupa turu k, lig turu [4,7,10,13,16] tamamlanınca vadesi gelir (`tickCup` her lig maçı
  sonrası çalışır; lig fikstürü/gün sayacı/ekonomi haftasına DOKUNMAZ). Bot maçları `playoffPickWinner`
  ile anında; kullanıcı maçı canlıya hazır bekler, **1 tur içinde oynanmazsa otomatik simüle edilir**;
  kullanıcı elenirse kupa arka planda sürer; sezon kapanırken bitmediyse `finishCupSeason` tamamlar.
- **Canlı oynama:** Lig ekranındaki kupa kartından "🏅 Kupa maçını oyna" → `startCupMatch` →
  `startMatch({cup:...})` (üçüncü maç modu; C1 sonuç kilidi `kupa|yıl|tur` imzasıyla çalışır).
  `applyMatchResult` kupa dalı: yorgunluk+istatistik+sakatlık normal, ev sahibiyse %60 bilet geliri;
  sonuç `recordUserCupResult` ile ağaca işlenir.
- **Ödül:** şampiyonluk ~66K KR (lig şampiyonluğundan düşük) + yeni başarım **🏅 Kupa Şampiyonu**
  (25. başarım) + managerHistory kaydı + koç ödülü + itibar +3.
- **UI:** Lig ekranında kupa kartı (tur adı, eşleşmeler/skorlar, BYE bilgisi, oyna butonu).

### Test
- 6 sezon orkestrasyon: lig+kupa+playoff+draft çakışmadan, kupa her yıl şampiyon buldu, 0 hata;
  save/load round-trip (kupa+kariyer+ikincil poz dahil) birebir. 20 sezon ekonomi: **328K/sezon**
  (13. oturum bandı korunuyor). 60 maç skor: **89.3**. visual-check 17 adım (kupa kartı + kariyer
  özeti eklendi) masaüstü+mobil **0 konsol hatası**. Cache-bust `?v=16`.

## 2026-07-09 (13. oturum) — REVİZYON PAKETİ: ekonomi dengesi + 24 başarım + gerçek tarayıcı doğrulaması

### Paket A — Uzun vadeli ekonomi dengesi (ölçüm → iterasyon → ölçüm)
- **Kök neden bulundu:** 20 sezonluk kalem dökümü (txn sarmalanarak) fazlalığın kaynağını gösterdi —
  **galibiyet ödülü 20 sezonda +15.1M KR** (tüm maaş+bakım gideri sadece -1.4M; bir galibiyet ~2.5 haftalık
  tüm kulüp masrafını karşılıyordu). Bilet/pazarlık değil, maç ödülü enflasyonun motoruydu.
- **Yapılan (2 iterasyon, her biri 20 sezon ölçümlü):**
  (1) `ecoInflationMul()` (state.js): sezon başına +%4, tavan ×2.2 (~31. sezon) — yalnız GİDERLERE işler:
  `salaryKRFromGenel` (yeni sözleşme/piyasa; imzalı maaşlar sözleşme bitene dek sabit), arena bakımı
  (`weeklyWageBill.ar`), deplasman seyahati. (2) Maç ödülü 1500-3500→**1000-2400**, mağlubiyet maç günü
  geliri 400-900→**320-720** (ecoRound öncesi).
- **Sonuç:** pasif oyunda sezon başına birikim **715K → 395K KR** (-%45); 1. sezon kârı korunuyor (444K —
  iyi yönetilen takım hâlâ rahat kâr eder), enflasyon tavana kadar sürdüğü için geç sezonlarda gerilim
  artıyor. Skor bandı değişmedi (60 maç ort 92.0), görsel test 0 hata.

### Paket B — Başarımlar 15 → 24
- **Briften 6:** 🎖️ 10 Sezonluk Efsane (10. sezon biterken) · 🕊️ Küllerinden (`G.season.hadCrisis` +
  pozitif kasa ile sezon bitişi) · 🤝 Ömür Boyu (yeni `p.kulupSezon` sayacı; ≥8 sezonluk oyuncu emekli
  olunca) · 🎯 Doğru Seçim (`draftYili` taşıyan kadro oyuncusu maç MVP'si olunca) · 🔄 Tersine Dönüş
  (`recordSeriesGame`: ilk 2 maç kayıp + seri kazanıldı) · 💎 Yenilmez Sezon (tüm sezon maçları galibiyet).
- **Kendi tasarımım 3:** 🤑 Milyoner (1M KR) · 💯 Yüz Maç Kulübü (yeni `G.careerMatches` sayacı —
  serialize/apply'a eklendi) · 📋 Tam Kadro Ekip (5 koç).
- **Doğrulama:** 12 sezonluk pasif simülasyonda 9/24 doğal açıldı (milyoner/yüzMaç/efsane10/ömürBoyu
  yenilerden); özel-an başarımları birim testiyle (sahte seri/kriz/namağlup senaryoları, pozitif+negatif)
  10/10 geçti. 24 id benzersiz.

### Paket C — Gerçek tarayıcı doğrulaması (Chrome uzantısı bağlıydı)
- Gerçek (headless OLMAYAN) Chrome'da, yerel sunucudan son kodla: **İlk 5 sürükle-bırak** — yedek karttan
  saha yuvasına sürükleme (Dennis Lewis → PF, Ja Fernandes yedeğe döndü) ve **yuvalar arası takas**
  (PG↔SF) gerçek pointer olaylarıyla çalıştı; **transfer pazarlığı** modalı (kişilik + bonservis + teklif
  alanı) açıldı/kapandı; **draft** modalından gerçek seçim yapıldı (aday altyapıya `draftYili` ile girdi,
  bot seçimleri tamamlandı). **0 konsol hatası.**
- **Gerçek telefonda kullanıcı kontrol listesi** (emülasyon ≠ gerçek dokunmatik; şu 3 akışı telefonda dene):
  (1) Maçlar → Taktik ayarla → İlk 5 seç → bir yedeği PARMAKLA sahaya sürükle + iki yuvayı yer değiştir;
  (2) Transfer Market → Kulüp Transferleri → Teklif ver → modalda sayı gir/kapat;
  (3) sezon sonunda draft modalından aday seç. Sorun görürsen not al — pointer-events kodu
  `js/league.js lineupPointerDown` içinde.

### Paket D — Kullanıcı aksiyonu bekleyenler (kod tamam, adım sende)
- **Tauri masaüstü:** `src-tauri/` derlemeye hazır; **Rust (rustup.rs) + VS Build Tools** kurulumu bekliyor
  (linkler 12. oturum notunda). Kurulunca: `npm run desktop:build`.
- **I18N:** `I18N-YOL-HARITASI.md` hazır; Steam uluslararası çıkış kararı verilince uygulanacak.

### Test (final): `node --check` 10 modül temiz; 60 maç ort 92.0 (bant korunuyor); visual-check 15 adım
masaüstü+mobil 0 konsol hatası; gerçek Chrome akışları 0 hata. Cache-bust `?v=15`.

## 2026-07-09 (12. oturum) — MASTER PAKET: bütünlük + test kapsamı + ses + a11y + Tauri iskeleti

Görev brifi 6 paketti; **Paket 1 (canlı sim gerçekçiliği) 11. oturumda zaten yapılmıştı** (commit
5a65a30) — teyit edilip geçildi. Kalanlar sırayla:

### Paket 2 — Bütünlük/denge
- **2.1 (C2) ÇÖZÜLDÜ — manuel koçlukta ilk yarı istatistik kaybı:** `snap()` artık her olaya oyuncu-bazlı
  anlık görüntü koyar (`box.ps/os/mf/fu/fo` = pstats/ostats/matchFouls/qFoulU/qFoulO klonları);
  `regenerateMatchRemainder` resume'u bunlardan doldurur (eskiden `pstats:{}` gönderiyordu, `ostats` hiç
  yoktu). Deterministik test: 5/5 denemede `sum(end.players.pts) === end.home` (eski kodda regenerate
  sonrası toplam < skor kalıyordu).
- **2.2 (C3) TEMİZLENDİ — ölü dal:** `applyMatchResult`'taki erişilmez `else` (sezon+playoff dışı) tabloya
  yansımayan "hayalet" `G.wins/G.points` artışı yapıyordu; teşhis loguna (`dbg`) çevrildi, ödül/moral akışı
  aynen sürüyor.
- **2.3 QA GEÇTİ — 50 sezon kesintisiz:** Playwright orkestrasyon harness'i (sezon maçları →
  `endLeagueSeasonIfDone` → playoff serileri → şampiyon → draft (kullanıcı pick dahil) → yeni sezon) 50 yılı
  218 adımda, **0 konsol hatası** ile tamamladı. Başkan hedefi 50/50 sezonda kuruldu. Kasa: min 649K / ort
  16.2M / max 31.4M — hiç negatif yok. **Gözlem:** pasif oyunda (transfer/harcama yok) kasa sezon başına
  ~+600K birikir; enflasyonist ama tek başına sorun değil (kullanıcı harcamaları dengeler), ileride para
  batakları (arena bakımı ölçeği vb.) düşünülebilir. Not: harness kadro 7 sağlıklının altına düşünce takviye
  transferi yapar (gerçek oyunda startMatch şartı kullanıcıyı markete yönlendirir — 6. sezonda sözleşme
  ayrılıklarıyla tetiklendi, oyun hatası değil).
  **Save/load round-trip:** draft havuzu, kişilikler, başkan hedefi, playoff serisi, managerHistory,
  budgetPenalty — `serializeGameState→applyGameState` sonrası birebir (fark 0).

### Paket 6 — Otomatik test kapsamı (visual-check 8→15 adım)
- Yeni akışlar: **transfer pazarlığı** (openClubOfferModal), **gelen teklif** (showIncomingOfferModal),
  **başkan hedefi** (lig haberleri), **sezon ödülleri** (announceSeasonAwards), **playoff serisi**
  (startPlayoffs + bracket), **iflas/zorunlu satış** (processBankruptcy 2 hafta), **draft** (modal + gerçek
  pick; en sonda çünkü finalize yeni sezon başlatır). Masaüstü+mobil, 0 konsol hatası şartı aynen.
  CLAUDE.md test kuralındaki kapsam tanımı güncellendi.

### Paket 3 — Ses (dosyasız, prosedürel Web Audio)
- Karar: dış CC0 dosya indirme yerine (lisans/erişim doğrulaması güvenilir değil; brif izin veriyor)
  **çok katmanlı sentetik ses**: `score` = bandpass gürültü "file swish" + çember teması + kalabalık coşkusu;
  `whistle` = çift frekanslı titreşimli (pea-roll) hakem düdüğü; `buzzer` = çeyrek/maç kornası; `bounce`;
  `win/lose/achv` = zarflı nota motifleri. Kurulamazsa `_sfxBeep` tek-ton yedeğine düşer (eski davranış).
- **Kalabalık ambiyansı:** lowpass gürültü döngüsü + LFO dalgalanma; maç başlarken başlar
  (`startCrowdAmbience`), skor/zaferde `_crowdSwell`, maç sonu/durdurmada söner.
- **Ayarlar:** "Efekt sesi" (sfxVol, vars. 70) ve "Kalabalık ambiyansı" (ambVol, vars. 35) kaydırıcıları;
  `G.settings` üzerinden otomatik serialize. Tetikler: foul/çeyrek başı → düdük, çeyrek sonu/maç sonu → korna.

### Paket 4 — I18N yol haritası + erişilebilirlik ilk adım
- **`I18N-YOL-HARITASI.md`** oluşturuldu: envanter (~1.284 TR satır; en ağırı match-engine anlatımı 272),
  4 aşamalı taşıma planı (`js/i18n.js` + TR/EN sözlük, statik→UI→anlatım→üretilen adlar), efor tahmini.
  Uygulama Steam uluslararası kararına bırakıldı (brif gereği).
- **A11y:** Ayarlara "🔍 Büyük yazı" (`html.a11y-big`, zoom 1.18) ve "🌓 Yüksek kontrast"
  (`html.a11y-contrast`, değişken paleti) toggle'ları; `applyA11ySettings()` kayıt yüklenince de uygulanır.

### Paket 5 — Tauri masaüstü iskeleti (derlemeye hazır; Rust kurulumu kullanıcıda)
- `src-tauri/`: Cargo.toml (tauri v2, release: lto+strip), main.rs (minimal sarmalayıcı; kayıtlar WebView2
  kalıcı profili üzerinden localStorage/IndexedDB'de), tauri.conf.json (1440×900, min 1100×700, msi+nsis,
  beforeBuild → dist hazırlığı), icons/icon.png+ico (System.Drawing ile üretilen basketbol).
- `tools/build-desktop.js`: oyunu `dist-desktop/`'a toplar (index.html=charazay2.0.html + js/ + assets/;
  214 dosya, 2.9 MB — node_modules/tools/raporlar paket dışı).
- package.json: `desktop:prep/dev/build` scriptleri; `@tauri-apps/cli` devDependency kuruldu.
- **`npx tauri info` durumu:** WebView2 ✔ (150.0.4078.48). **Eksikler (kullanıcı kurulumu gerekir):**
  (1) Rust — https://rustup.rs (rustup-init.exe, varsayılan MSVC toolchain);
  (2) VS Build Tools — https://aka.ms/vs/17/release/vs_BuildTools.exe ("Desktop development with C++"
  iş yükü: MSVC + Windows SDK). İkisi kurulunca: `npm run desktop:build` → `src-tauri/target/release/bundle/`
  altında .msi/.exe yükleyiciler. Steam paketlemesi bu exe üzerinden ayrı adım.
- .gitignore: `src-tauri/target/`, `dist-desktop/`.

### Test (final zincir)
- `node --check` 10 modül temiz. **60 maç:** takım başı ort **91.2** (min 64/max 120) — bant korunuyor
  (bu oturum istatistik yoluna dokunmadı; 89.8-92.2 arası salınım örneklem varyansı).
- Genişletilmiş `visual-check` (15 adım) masaüstü+mobil **0 konsol hatası**; draft modalı dolu, iflas
  zorunlu satışları bilançoda doğrulandı. Cache-bust `?v=14`.

## 2026-07-09 (11. oturum) — Canlı simülasyon: hız stat'ı + taktikler sahnede + hücum türü koreografileri

3 maddelik görev brifi (10. oturumdaki rAF motoru üzerine, motor değişmedi):

### Madde 1 — Oyuncu hızı gerçek `hiz` stat'ına bağlandı
- `_tokBaseV(pl)`: `hiz` (0-99) → 260-400 px/sn; düşük `enerji` %13'e kadar yavaşlatır. Her jeton
  `baseV` (koşu) + `sprintV` (=baseV×1.55; şutöre/ribaunda/topa yetişme) taşır; `_PL_SPRINT` sabiti kalktı,
  `_PL_MAXV` yalnız stat'sız yedek.
- `initMatchPlayers(lu,rakip,oppPlayers)` artık rakibin **tam oyuncu nesnelerini** alır (main.js `oppFive`
  geçirir, eskiden sadece isim dizisiydi); her jetonda `pl` referansı (id/hiz/enerji/savunma) durur.

### Madde 2 — Taktikler sahnede görünür (yalnız görsel; istatistik yolu değişmedi)
- `S.offIsUser` ile taktikler yalnız kullanıcı tarafına işlenir (rakip hep varsayılan adam adama).
- **Bölge (`bolge`):** `ZONE_23_L` — 2-3 bölge; savunmacı bölgesinde durur, bölgesine giren hücumcuya
  %45 kayar, şutörün bölgesindeki savunmacı şutörü yakın kapatır. Adam savunmasına göre hedef farkı ~600px.
- **Pres (`pres`):** markaj mesafesi 40→26 (şutör 22), savunmacı hızı ×1.12 — ölçüldü: ort. mesafe 24 vs adam 37.
- **markStar:** kullanıcının en yüksek `savunma` stat'lı oyuncusu rakip yıldızına (genel sıralı away[0])
  eşlenir (assign takası), 26px yapışık markaj. Ölçüldü: yıldıza en yakın jeton = en iyi savunmacı.
- **Hücum odağı:** `dis` → PG+kanatlar yaydan dışarı açılır; `ic` → forvet/pivot boyaya sokulur
  (OFF_BASE_L üzerine ayna öncesi küçük ofset).
- **focusPlayerId:** pas zincirindeki ara pas mümkünse odak oyuncusuna uğrar.

### Madde 3 — Hücum türüne göre 3 koreografi dalı (`animateShotPossession`)
- **Fast break:** önceki olay steal/reb + tempo/odak `hizli` → tüm hücum sprint, tek uzun outlet pas
  öne koşan şutöre, şut 1.0s'de (set oyunda 1.72s).
- **İzolasyon:** odak oyuncusu şutörse → diğerleri kenara açılır, tek pasla top yıldıza, şut 1.4s'de.
- **Set oyunu:** mevcut 2 paslı kalıp (varsayılan). `S.prevType/S.curType` ile önceki olay izlenir.

### Ek düzeltmeler (bu oturumda bulunan görsel kusurlar)
- **Serbest atış:** şutör rastgele seçilince çizgiye yetişemeden atış başlıyordu (top boş çizgiden fırlıyordu,
  şutör↔şut noktası 242px ölçüldü) → şutör çizgiye EN YAKIN hücumcu + ilk atış 0.30→0.55s. Sonuç ≤14.6px.
- **`_ballHold`:** top oyuncudan >26px uzaktaysa ışınlanmak yerine kısa sıçrayışla (mini pas) eline gelir.
- Cache-bust `?v=13`.

### Test
- `node --check` temiz. **60 maç:** takım başı ortalama **89.8** (bant ~86-90 korunuyor; görsel katman
  istatistiğe sızmadı). Taktik doğrulaması (izole Playwright): hız bandı 358-377 px/sn, hiz↑=baseV↑ monoton,
  rakip 5/5 jetonu gerçek stat'lı; bölge↔adam farkı 610px; pres 24 < adam 37; markStar OK; koreografi
  adımları set=3/fb=2/iso=2. Hareket sürekliliği: 120 karede 0 donuk, top/oyuncu 0 saha dışı, held ihlali 0.
- `node tools/visual-check.js` masaüstü+mobil **0 konsol hatası**.

## 2026-07-09 (10. oturum) — Canlı maç: gerçek fizik/akış simülasyonu (rAF), yön hatası düzeltmesi

Kullanıcı: "Canlı maçta oyuncuların ve topun hareketi hâlâ olması gerektiği gibi değil — gerçek maç gibi olmalı."

**Kök neden:** 9. oturumdaki sistem hâlâ *olay-başına-ışınlanma* mantığındaydı. Jetonlar her olayda CSS
`transition` ile sabit bir şablona kayıyor, sonra bir sonraki olaya kadar **donuyordu**; top da noktadan
noktaya `setTimeout` zinciriyle geçiyordu. Ayrıca iki gerçek hata vardı:
- **Yön hatası:** `movePlayersForEvent` hücum yönünü `shot.isHome`'dan alıyordu, oysa `randShotXY` yönü
  `userIsHome===userPos`'a göre üretiyordu. Kullanıcı **deplasmandayken** şut noktaları sağ yarıda, oyuncular
  sol yarıda kalıyordu (şutör tek başına karşı sahada). Serbest atış çizgisi (`lineX`) de aynı hatayı taşıyordu.
- **Gerçek dışı şut noktaları:** `randShotXY` 3'lükleri `x=125..455` bandında (yay içinden, orta sahaya kadar)
  dağıtıyordu.

### Yapılanlar
- **`js/match-engine.js` görselleştirme katmanı `requestAnimationFrame` tabanlı sürekli simülasyona çevrildi**
  (`_simStart`/`_simStep`). Oyuncular hedeflerine **ivmelenerek koşar** (yay-sönüm, `_PL_MAXV=320`,
  şutör/ribaundcu `_PL_SPRINT=540`), birbirine girmez (çarpışma çözümü), boşta mikro salınım yapar — hiçbir
  kare donuk değil. Savunma **adam adam markaj** yapar: hedefi, adamı ile çember arasındaki nokta (şutörü
  26px'den kapatır, diğerleri 40px).
- **Top artık bir durum makinesi** (`_ballStep`): `held` (taşıyıcının elinde, yere sekerek dribbling),
  `pass` (alçak yay), `shot` (yüksek parabol + çember yüksekliğinde biter), `rim` (fileden düşüş),
  `loose` (zıplayarak yuvarlanan serbest top). Yükseklik **gölge + ölçek** ile gösteriliyor (`#ballShadow`).
- **Şutsuz olayların da koreografisi var:** `steal` → top elden çıkar, karşı takımdan biri üzerine sprint atıp
  alır; `reb` → ribaundcu topu tutar; `free` → 8 oyuncu boya kenarına dizilir, şutör çizgide atışları yapar;
  `tactic` → set oyunu, top çevrede paslaşır; çeyrek başı → orta sahada tip-off, top havada.
- **Şut senkronu:** iz (`drawShotMark`) top **elden çıkarken**, ses (`sfx('score')`) top **çembere varınca**.
  `animateShotPossession(sh,onShoot,onResult)` iki callback alır (eskiden tek `onArrive` vardı).
  Top izin çizildiği noktadan fırlar; ölçüldü: şut anında şutör↔şut noktası **≤10.6px**.
- **Yön düzeltmesi:** olaylara `off` alanı damgalandı (`runPossessionV` sarmalayıcısı, `_lastOff`). Hücum yönü
  artık `off===userIsHome` → sol, değilse sağ. `lineX` de `(userPos===userIsHome)` ile hesaplanıyor.
- **Gerçekçi şut haritası:** `randShotXY` artık çemberden **mesafe+açı** ile üretiyor (`RIM_L/RIM_R`,
  `THREE_R=196`): 3'lükler yayın hemen dışında, saha içi şutlar boya/orta mesafede. 159 şutun 0'ı yay içinden.
- Hücum şablonu (`OFF_BASE_L`) kanatları 3 sayı yayının **dışına** taşındı; `free` olayı gecikmesi 1200→1700ms.
- **Cache-bust:** `?v=12`.

### Test
- `node --check` (match-engine, main) temiz.
- İzole Playwright ölçümü (12 sn / 120 kare, canlı maç): **donuk kare 0/119**; 159 şutun **0'ı** yanlış yarı
  sahada, **0'ı** yay içinden 3'lük; top elde iken taşıyıcıya uzaklık **0/39 kare** ihlal; top ve oyuncular
  **hiç saha dışına çıkmadı**; top max yükseklik 96px (makul şut arkı); mod dağılımı held/pass/shot/rim/loose
  hepsi görüldü. 0 konsol hatası.
- `node tools/visual-check.js` masaüstü+mobil **0 konsol hatası**, akış tamam.

### Karar / gözlem
- Bir hücum ~2.3 sn'de canlanıyor (olay gecikmesi 2500ms). Gerçek basketbolda 10-14 sn sürdüğü için şutöre ve
  ribaundcuya sprint hızı verildi; aksi hâlde yön değişiminde şutör noktasına yetişemiyor ve top "yarı sahadan
  atılmış" gibi görünüyordu.
- `setTimeout` tabanlı `_ballLegTimer/_ballArriveTimer/_ballFadeTimer` kaldırıldı; `clearBallTimers()` artık
  rAF koreografi script'ini temizliyor (API adı korundu, `main.js` çağrıları bozulmadı).

## 2026-07-09 (9. oturum) — Gerçekçi top hareketi + büyük saha + 30sn mola + maç içi taktik

Kullanıcı: (1) saha daha büyük olmalı; (2) pas bazen boş alana gidiyor — top GERÇEK oyunculara ve potaya gitmeli, senkron olmalı; (3) sayı sonrası oyun kurucu topu yavaşça karşıya geçirmeli; (4) mola 30 sn gerçek süre olmalı, rahat değişiklik; (5) savunma/taktik maç içinden değiştirilebilmeli.

- **Büyük saha (varsayılan):** `.match-layout` tek sütuna alındı → saha ~474px'ten **~790px**'e çıktı (özet kutu alta indi). "⛶ Büyük Ekran" tam ekran modu korunuyor.
- **Top gerçek oyunculara paslanıyor:** `movePlayersForEvent` artık uygulanan (jitter'lı) hücum konumlarını `mState._offPos`'a yazıyor; matchStep'te **oyuncular ÖNCE** yerleşiyor, sonra `animateShotPossession` topu bu GERÇEK token konumlarına paslıyor: oyun kurucu getirir → 2 gerçek hücumcuya pas → şutöre (şut noktası) → (girerse) potaya. Şut izi + ses top şutöre **varınca** (senkron). Artık boş alana pas yok.
- **Sayı sonrası yavaş top getirme:** bring-up ayağı süresi mesafeye göre (`dist*1.3`, 560–900ms) — top önceki potadan yeni yarıya boydan boya **yavaşça** gelir.
- **30 sn mola (`callTimeout`):** gerçek 30 sn geri sayım (`mState._toRemain`, `#toCountdown`), 0'da otomatik devam ya da "▶ Devam et". Süre boyunca rahat değişiklik/taktik. `stopMatch`/`continueMatchAfterBreak` sayacı temizler.
- **Maç içi taktik (`setLiveTactic`, `_liveTacticsHtml`):** mola/duraklama panelinde tempo + hücum odağı + savunma stili açılırları; değişince `G.tactics` güncellenir ve `regenerateMatchRemainder` ile kalan maç yeni taktikle simüle edilir (girişteki taktikler artık oyunun içinden değişir).
- **Rakip jetonları gerçek isimlerle:** `initMatchPlayers(lu,rakip,oppNames)` — startMatch rakip kadrosundan en iyi 5'i geçirir; artık takım adı 5 kez tekrar etmez.
- **Cache-bust:** `?v=11`.

### Test
- İzole Playwright: saha 790px; top örneklerinden en az biri kayıtlı hücum oyuncusu konumuna ≤26 birim (gerçek pasa gidiyor); 30sn sayaç akıyor (#toCountdown "29 sn"); taktik adam→pres editörle değişti; rakip jetonları gerçek isimler; tek top, 10 jeton. 0 hata.
- `visual-check` masaüstü+mobil **0 konsol hatası**. Büyük saha + mola paneli (sayaç+taktik+değişiklik) görsel doğrulandı.

## 2026-07-08 (8. oturum, 4. tur) — Mola sistemi + maç içi değişiklik + anlatım düzeltme/zenginleştirme

Kullanıcı istekleri: (1) maç akarken (ölü topta) manuel koçtan oyuncu değişikliği; (2) mola sistemi — mola alınınca oyuncu enerjisi biraz yükselsin (otomatik); (3) "çeyrek kapandı"→"çeyrek bitti", tüm anlatımı tara, hataları düzelt, daha inandırıcı yap; (4) renkli anlatım cümleleri ekle (crossover/fake/step-back/box-out vb.).

- **Mola sistemi (`callTimeout`, `main.js` + HTML "⏸ Mola (n)" butonu):** Maç sırasında mola alınır (FIBA benzeri 5 hak, `mState.timeoutsLeft`). Mola: maçı duraklatır (`mState.paused`, timer+top temizlenir), sahadaki 5 oyuncuya **dinlenme bonusu** (`mState.restBonus`, +9) ekler → `liveEnergyOf` göstergesinde enerji görünür şekilde yükselir (gerçek `p.enerji`ye de +hafif). Değişiklik penceresi açılır, "▶ Devam et" ile sürer.
- **Maç içi (ölü top) değişiklik:** Koçluk paneli artık `mState.paused` olduğunda da açılır (`_coachPanelVisible`), molada/dead-ball'da değişiklik **serbest** (çeyrek-arası eski `subsLeft` kısıtı yalnız manuel-koç çeyrek arasında geçerli). `substituteLive` molada hak düşürmez. Manuel koç çeyrek-arası duraklaması da artık `paused=true` set eder (Devam et düğmesi görünür).
- **Anlatım düzeltmeleri (`match-engine.js`):**
  - **KRİTİK bug:** `spikerLine`'da `%SC` (skor) tok'u, ondan önce çalışan `%S` (ad) tarafından yeniliyordu → skor "(x - y)" hiç görünmüyor, sonda "AdC" artefaktı kalıyordu ("Hakeem JohnsonC"). Sıra düzeltildi (%SC önce) → skorlar geri geldi.
  - "Çeyrek **kapandı**" → "Çeyrek **bitti**".
  - Yanıltıcı "MOLA! / Teknik mola" `tactic` satırları (gerçek mola olmadan tetikleniyordu) taktik-akış cümleleriyle değiştirildi (4 spiker).
- **Renkli anlatım (yeni):** `MOVE_LINES` (crossover/fake/step-back/spin/"tereyağından kıl çeker gibi uyuttu"/"pazara yolladı") kendi yaratımı (passız) isabetlere ~%34 önek olarak serpiştirilir. `REB_OFF_LINES`/`REB_DEF_LINES` kaçan şutlarda ~%22 renkli ribaund anlatımı (yeni `type:'reb'` olayı).
- **Cache-bust:** `?v=10`.

### Test
- İzole Playwright: 3 maç × ~570 olay tarandı — "kapandı"=0, "Çeyrek bitti"=9, stray "MOLA"=0, move+reb cümleleri mevcut, skor "(x - y)" düzgün. Mola: hak 5→4, enerji göstergesi 70→79, duraklatma+panel+buton. Ölü top değişiklik çalışıyor, Devam et sürüyor. 0 hata.
- `visual-check` masaüstü+mobil **0 konsol hatası**. Buton satırı + anlatım görsel doğrulandı.

## 2026-07-08 (8. oturum, 3. tur) — Maç motoru görsel revizyonu: gerçekçi top, O/X izler, pro parke, büyük ekran

Kullanıcı istekleri (madde madde): (1) hücum tarafı değişince ani geçiş yerine top yavaş/paslarla dönsün, anlatımla senkron; (2) top rengi takım renginden farklı + detaylı basketbol topu; (3) maç daha büyük ekranda izlenebilsin; (4) şut izleri isabetli=**O**, kaçan=**X** harfleri, her çeyrek sıfırlansın, filtreyle (tüm maç / çeyrek) incelenebilsin; (5) parke daha detaylı/profesyonel + üstünde arena adı, takım adı, amblem.

- **Gerçekçi çok-ayaklı top (`match-engine.js`):** Eski tek-sıçrama `animateBall` → `animateShotPossession(sh,onArrive)`. Top **topu getir → oyun kur (top of key) → kanata pas → şuta çıkış → (girerse) potaya** ayaklarıyla akar (`_ballPath` setTimeout zinciri). Taraf değişince önceki konumdan yeni yarıya boydan boya gelir (ani geçiş yok). Şut izi + skor sesi top **şut noktasına varınca** tetiklenir (anlatımla senkron). Adım aralığı dinamik: şutlu hücum 2500ms, şutsuz 1200-1500ms.
- **Top detayı (`charazay2.0.html`):** `liveBall` artık `<g>` — turuncu top + siyah dikişler (yatay/dikey + iki yay) + beyaz parlaklık; sabit basketbol turuncusu (takım rengi turuncu olsa bile dikişlerle ayrışır). Animasyon `transform translate` ile.
- **Şut izleri O/X (`drawShotMark`):** daire yerine metin — isabet **O**, kaçan **X**, takım rengiyle (biz = takım rengi, rakip = yeşil). Filtre yeniden düzenlendi: **Canlı (bu çeyrek, varsayılan)** her çeyrek sıfırlanır; **Tüm maç** + **Ç1–Ç4** birikmiş şutları gösterir (`shotPassesFilter`, `mState.shotFilter='live'`). Çeyrek değişince `redrawAllShots` ile canlı harita sıfırlanır. Legend O/X olarak güncellendi.
- **Profesyonel parke (`charazay2.0.html` iç SVG):** ahşap gradyan + plank çizgileri (`#planks`) + kenar vinyet (`#courtVign`), daha kalın/temiz çizgiler. **Merkez saha markası** (`#courtBrand`): üstte arena adı, ortada takım amblemi (`#courtLogo` — logo varsa görsel, yoksa baş harf diski `#courtLogoFb`), altında takım adı wordmark. `updateCourtBranding(rakip)` startMatch'te doldurur (arena=`G.arena.isim`, takım=`G.team.isim`, logo=`G.team.logoUrl`).
- **Büyük ekran / theater (`toggleMatchTheater`, CSS `.mac-theater`):** "⛶ Büyük Ekran" butonu paneli tam ekran kaplatır (saha ~1260px), özet sütunu gizlenir, Esc ile kapanır. "küçücük ekran" şikayetini çözer.
- **Cache-bust:** script sürümü `?v=9`.

### Test
- İzole Playwright: branding dolu (arena+takım+amblem), ev jetonları gerçek soyadlar, top 32 örnekte ~10 farklı konum (ayak-ayak hareket), şut izleri metin **O/X**, büyük ekran saha 1260px genişlik, 0 hata.
- `visual-check` masaüstü+mobil **0 konsol hatası** (EXIT 0). Saha + büyük ekran görsel doğrulandı.

## 2026-07-08 (8. oturum, 2. tur) — Canlı maç izleme: panel üstte + sahada 5v5 oyuncu hareketi + cache-bust

Kullanıcı şikayeti: "Maçı başlat"ta canlı ekran açılmıyor; oyuncular hareket etmeli; güncellemeler görünmüyor.

- **Kök neden (canlı ekran):** Maç aslında başlıyordu (`liveStatus=CANLI`, yorum akıyor) ama canlı panel **Maçlar sayfasının ~2000px altındaydı** ve `scrollToMacLive` sayfayı kaydırmıyordu (scroll konteyneri `window` değil, `#page-mac`). Kullanıcı ekranda hiçbir şey görmüyordu.
- **Çözüm:** `#page-mac .match-layout{order:-2}` + `#macUpcomingCard{order:-1}` (flex `order`) ile **canlı panel sayfanın en üstüne** alındı (DOM bozulmadan). `scrollToMacLive` yeniden yazıldı: doğru scroll konteynerini (`_macScrollContainer`) bulup panelin hizasına kaydırıyor. `startNextMatchNow` artık önce `startMatch()` sonra kaydırıyor. Maç sürerken panele `.live-on` vurgusu (turuncu çerçeve).
- **Sahada 5v5 oyuncu hareketi (yeni, `match-engine.js`):** İç saha SVG'sine `#playersLayer` içinde **10 jeton** (5 ev = takım rengi + gerçek oyuncu soyadı, 5 rakip = yeşil + rakip adı), numaralı. `initMatchPlayers(lu,rakip)` startMatch'te çağrılır (tip-off ortada). `movePlayersForEvent(ev)` her maç adımında (matchStep) jetonları ofans/defans şablonuna göre kaydırır — ev sol potaya, rakip sağ potaya hücum eder; iki takım da aynı yarı sahada toplanır (gerçekçi). Şut olayında top-sahibi jeton şut noktasına gider (topla senkron). CSS `transform` geçişiyle yumuşak hareket. `clearMatchPlayers` `clearMatchCourt`'a bağlı.
- **"Güncellemeler görünmüyor" (GitHub Pages cache):** Tüm `<script src>`'lere `?v=8` sürüm parametresi eklendi → tarayıcı her deploy'da taze JS çeker. **Sonraki her güncellemede bu sürümü artır** (v=9, v=10…).

### Test
- İzole Playwright teşhisi (desktop + mobile): panel `top=58` (önceden 2007), `.live-on` var, **10 jeton** oluştu ve oynatım sırasında **hareket etti**, 0 hata.
- `visual-check` masaüstü+mobil **0 konsol hatası** (EXIT 0); canlı maç ekran görüntüsü oyuncuların sahada yayıldığını doğruluyor.

## 2026-07-08 (8. oturum) — İlk 5 sürükle-bırak sahası + pro ana panel + tek-tıkla maç

Kullanıcı isteği: (1) ilk 5 seçiminde oyuncu kartları tutup sürüklenebilir olsun, (2) basketbol sahası üzerinde oyuncular yerleştirilebilir olsun, (3) ana panel görüntüsü daha profesyonel olsun, (4) ilk maç tıklayarak başlatılabilsin (test kolaylığı).

- **İlk 5 saha editörü (`js/league.js`) yeniden yazıldı.** Eski liste+buton yerine **yarı saha SVG'si** (pota üstte) + **5 pozisyon yuvası** (PG/SG/SF/PF/C, saha üzerinde konumlu). Veri modeli `_lineupEdit={slots:[id×5], bench:[]}` oldu (starters yerine sabit 5 yuva; `saveLineup` `slots.filter(Boolean)` ile `G.lineup.starters`'a yazar — motor tarafı değişmedi, `matchLineup` zaten pozisyona göre yeniden dağıtıyor).
- **Pointer tabanlı sürükle-bırak** (`lineupPointerDown/Move/Up`): fare **ve** dokunmada çalışır (HTML5 DnD değil — mobil uyum için pointer events + uçan `.lu-ghost` + `elementFromPoint` hit-test). Yedekten yuvaya, yuvadan yuvaya (takas), yuvadan yedeğe sürüklenebilir. Salt tıklama da destekli: yedek karta tıkla → ilk boş yuva; dolu yuvaya tıkla → yedeğe (drag ile tıklama `_luDragMoved` bayrağıyla ayrışır).
- **Ana panel (`charazay2.0.html` + `renderDashboardNextMatch`)** "Sonraki Maç" kartı yenilendi: gradyanlı `.dash-next` kart, "SONRAKİ MAÇ" etiketi, ev/deplasman rolleri + **G-M rekoru** (`_teamRecordLabel`) + kullanıcı takımına "SEN" vurgusu, büyük "▶ Maçı Başlat" butonu. Maç yokken kart pasifleşir.
- **Tek-tıkla maç (`startNextMatchNow`, `js/main.js`):** ana panel kartı, kartdaki buton ve maç sayfasındaki sıradaki fikstür kartı → doğrudan maçı başlatır (Maçlar sayfasına geçer + canlı panele kaydırır + `startMatch`). Sıradaki fikstür kartına "▶ Maçı Başlat" + "🎯 Taktik ayarla" ayrımı eklendi.
- **CSS** `charazay2.0.html` head'ine eklendi: `.lu-*` (saha/yuva/kart/ghost) + `.dash-next`/`.dn-*` (pro kart). Responsive (≤720px tek sütun, saha üstte).

### Test
- `visual-check` masaüstü+mobil **0 konsol hatası** (EXIT 0).
- İzole Playwright harness (desktop mouse + mobile touch): editör açılış 5/5, yuva-tıkla→4/5, yedek-tıkla→5/5, **sürükle-bırak doğru oyuncuyu doğru yuvaya**, kaydet→`G.lineup.starters=5`. Her iki platform **✓ geçti**, 0 hata. Ekran görüntüleriyle görsel doğrulandı (ana panel + editör, masaüstü + mobil).

## 2026-07-08 (7. oturum) — FAZ 6: Draft sistemi

Sezon sonunda (playoff bitince, yeni sezon başlamadan önce) **draft** devreye girer:
- **Aday havuzu** (`genDraftProspect`): genç (18-20), düşük mevcut OVR + **yüksek gizli potansiyel** (`hiddenPot`, scouting'e bağlı). Havuz = takım sayısı + 10 (öyle ki son seçende de seçenek kalır).
- **Sıralama (`startDraft`):** lig tablosunun **tersi** — ligi düşük bitiren **önce seçer** (NBA tarzı). `processDraftPicks` botları otomatik seçtirir (bot gerçek potansiyeli görür, en iyiyi alır); kullanıcı sırası gelince `openDraftModal` ile seçim ekranı.
- **Kullanıcı seçim ekranı:** aday listesi + **scouting'e bağlı potansiyel ipucu** (en iyi izci kalitesi ≥4 → net potansiyel; değilse aralık/belirsiz) + kişilik. Seçilen aday altyapıya (`G.youth`) katılır.
- **Yeni sezona geçiş** draft tamamlanınca (`finalizeDraft`→`proceedToNewSeason`). Yarım kalan draft `G.draft` ile save/load'a yazılır; kayıt yüklenince kaldığı yerden devam eder.

### Test
- `faz6-check.js` — **10/10 geçti**: aday genç+gizli potansiyelli; sıralama lig tersi; havuz=takım+10; kullanıcıdan önce botlar seçti; kullanıcı sırası modalı; seçilen aday altyapıya; draft tamamlanıp yeni sezona geçiş. 0 konsol hatası. Draft modalı görsel doğrulandı. `visual-check` masaüstü+mobil 0 hata.

## 2026-07-08 (7. oturum) — FAZ 5: Scouting ağı + gelişmiş istatistik ekranı

### 5.1 — Bölgesel izci ağı
Tekil "Keşfet — X KR" (korundu) yanına izci ağı eklendi:
- `genScout`/`genScoutMarket` (5 aday). İzci: bölge (Yerli/Avrupa/Amerika/Global Genç), **kalite 1-5**, maaş, atama (Altyapı/Transfer Market). Antrenman sayfasına **İzci Ağı + İzci Pazarı** kartları (koç UI deseniyle) + `hireScout/fireScout/assignScout`.
- `processScoutingWeek` (her ekonomi haftası): her izci atandığı havuzda **kalite kadar** en yüksek potansiyelli oyuncuyu otomatik keşfeder (`p.scouted=true`); parlak yetenek bulunca haber. İzci maaşları `weeklyWageBill`'e (`iz`) dahil. Max 4 izci.

### 5.2 — Analiz & İstatistik ekranı (yeni sayfa)
- Yeni **veri toplama katmanı**: `recordMatchAnalytics` her maç sonrası `G.analytics` biriktirir — takım maçları (+/- , attı/yedi, form) + oyuncu OVR gelişim eğrisi (son 60 maç). Save/load'a eklendi.
- Yeni **Analiz** sayfası (nav + `page-analiz` + `PAGE_TITLES`/`MENTOR_ROUTE_SLUGS` + `showPage` bağlandı). `renderAnalytics`: takım trendi (galibiyet, sayı ort., averaj, son-5 form) + **SVG çizgi grafikleri** (`svgLineChart`: +/- farkı sıfır çizgili, atılan sayı) + oyuncu seçici → OVR gelişim eğrisi + sezonluk sayı/asist/ribaund ort. + kişilik/potansiyel.

### Test
- `faz5-check.js` — **10/10 geçti**: izci pazarı/işe alma/maaş/otomatik keşif (0→5); analiz verisi birikimi (8 maç, 15 oyuncu), yeni sayfa render (≥2 SVG grafik, oyuncu seçici, nav). 0 konsol hatası. Analiz ekranı görsel doğrulandı. `visual-check` masaüstü+mobil 0 hata.

## 2026-07-08 (7. oturum) — FAZ 4: Transfer pazarlığı + oyuncu kişilikleri + başkan hedefi

### 4.2 — Oyuncu kişilikleri
`genPlayer`'a `p.kisilik` eklendi (5 tip: Sadık/Hırslı/Parasever/Şehir bağımlısı/Kararsız — `KISILIKLER` sabiti, her biri `para`+`sadakat` ağırlığı). Eski kayıtlara `applyGameState`'te geriye dönük atanır. Oyuncu modalında gösterilir. Sözleşme bitince ayrılma olasılığını kaydırır (sadık/şehir kalır, parasever/hırslı ayrılır) — Madde 19 sistemine entegre, ezmez.

### 4.1 — Transfer pazarlığı
- **Karar oyuncunun:** `playerAcceptsOffer(player,offer,asking,opts)` — teklif/istek oranı × kişilik `para` + ruh hali + sadakat direnci + "beklenenin aksine" küçük rastgelelik (kararsızda daha yüksek). Sigmoid kabul olasılığı.
- **Kulüpten transfer artık pazarlık:** SATIN AL → **TEKLİF VER** (`openClubOfferModal`/`submitClubOffer`). Yüksek teklif kabul şansını artırır; düşük teklif reddedilir (kişilik gerekçesiyle). `buyClubPlayer` teklif fiyatıyla tamamlar.
- **Kullanıcının oyuncusuna gelen teklifler (KRİTİK KURAL):** `maybeIncomingOffers` maç sonrası AI kulüpten teklif üretir; oyuncu "gitmek istese" de **kullanıcının onayına** düşer (`showIncomingOfferModal` → onayla/reddet). Reddedilen ve gitmek isteyen oyuncunun morali düşer. `G.pendingOffers` kuyruğu save/load'a eklendi.

### 4.3 — Başkan hedef sistemi
- **Sezon başı** (`setPresidentTarget`): kadro gücü lig içindeki konuma göre makul hedef (ilk 3 / playoff / orta sıra / düşmeme). Haber + bildirim.
- **Sezon sonu** (`evaluatePresidentTarget`, `endLeagueSeasonIfDone` içinde): gerçek sıra hedefle karşılaştırılır. Tuttu → itibar bonusu + olumlu haber + `managerHistory`. Tutmadı → **kademeli** itibar düşüşü; ağır sapmada gelecek sezon **bütçe kısıtı** (`G.budgetPenalty` → bilet geliri ×0.90, bir sezon sürer). **Ani game-over/kovulma YOK** (iflas felsefesiyle tutarlı).

### Test
- `faz4-check.js` — **13/13 geçti**: tüm oyuncularda kişilik; pazarlık olasılığı teklifle/kişilikle doğru yönde (parasever>sadık; yüksek teklif→kabul↑); gelen teklif onayla/reddet; kulüpten pazarlıkla transfer; başkan hedefi belirlenip değerlendiriliyor. 0 konsol hatası. `visual-check` masaüstü+mobil 0 hata. RAPOR B1 ✅.

## 2026-07-08 (7. oturum) — FAZ 3: Taktik derinliği

`G.tactics` 2 boyuttan (tempo, odak) 5 boyuta çıktı. Tümü `openMatchTactics`/`saveMatchTactics` (`js/league.js`) → `generateMatchEvents`/`runPossession` (`js/match-engine.js`) akışına bağlandı.
- **Tempo:** aynen korundu (yavaş/normal/hızlı).
- **Hücum odağı** genişletildi: içeri / dış şut / **hızlı hücum** (erken şut, isabet↓, top kaybı↑) / **set oyun** (sabırlı, asist↑, isabet↑, top kaybı↓) + eski "dengeli".
- **Savunma stili (yeni):** Adam adama (nötr) / Bölge (2'lik isabeti↓, 3'lük↑, çalma↓) / Pres (rakip top kaybı↑, rakip isabeti hafif↑ — risk/ödül).
- **Top yükleme (yeni):** seçili oyuncu (`focusPlayerId`) daha sık şut/pas alır (`uShooter` %42 öncelik) + **ekstra yorgunluk** maliyeti (`applyMatchFatigueToRoster`'da +5..9 enerji).
- **Rakibe özel eşleştirme (yeni):** `markStar` → rakibin en iyi oyuncusunun (oppPool[0]) isabeti ×0.82 düşer.

### Denge korundu (kritik)
Varsayılan (dengeli/adam/yükleme yok/eşleştirme kapalı) **matematiksel olarak eski davranışla birebir** (keep=1 → her zaman top kaybı; ekstra top kaybı blokları `defPressTO>0`/`offRushTO>0` korumalı; rakip isabeti/uShooter/asist varsayılanda değişmez). Top kaybı **azaltma** çarpanla (set/bölge), **artırma** additive pre-blokla (hızlı/pres) — çift sayım yok.

### Test
- `faz3-calib.js` — 9 config × 180 simülasyon (**1620 maç**): varsayılan iki-takım toplam **~182** (~91/takım, ~86-90 bandında), tüm config'ler makul bantta; etkiler doğru yönde (hızlı>yavaş, pres→rakip TO↑, set→asist↑, eşleştirme→rakip skoru↓, yükleme→oyuncu sayısı↑). **13/13 geçti**, 0 konsol hatası.
- Taktik modalı görsel doğrulandı; `node tools/visual-check.js` masaüstü+mobil 0 hata.

## 2026-07-08 (7. oturum) — FAZ 2: Playoff serisi + sezon sonu ödülleri

### 2.1 — Playoff tek maç → SERİ (best-of-7)
`js/match-prep.js` playoff çekirdeği yeniden yazıldı:
- Her tur artık **seri** dizisi (`makeSeries`/`recordSeriesGame`): iki takım, galibiyet sayaçları, **ilk 4 galibiyet** turu geçer. Sabitler: `PLAYOFF_SERIES_WIN=4`, `PLAYOFF_HOST_PATTERN=[1,1,0,0,1,0,1]`.
- **Ev sahibi avantajı** sıralamaya göre **2-2-1-1-1** (üst sıralı takım 1,2,5,7. maçlarda ev sahibi). Sonraki turlarda düşük seed-no (üst sıra) ev avantajı alır.
- `userPlayoffMatch()` artık kullanıcının serisindeki **sıradaki maçı** (ev sahibi = o maçın host'u) döndürür. Maç imzası (C1 kilidi) `gameNo` içerir (`js/main.js`), her seri maçı ayrı kilitlenir.
- `applyMatchResult` playoff dalı seri kaydına çevrildi (`js/match-engine.js`); haber satırı seri skorunu ("seri 2-1", "seriyi 4-2 kazandın") gösterir.
- **Playoff MVP:** final serisi boyunca kullanıcı oyuncu istatistikleri biriktirilir (`accumulatePlayoffFinalStats`); kullanıcı finalde değilse şampiyonun en iyi oyuncusu (yedek). `G.playoff.mvp`.
- **Şampiyonluk kutlama modalı** (`showChampionshipModal`): kupa + CSS konfeti animasyonu + manşet + MVP. `renderPlayoffPanel` seri skorunu ("2-1 önde") ve "seri maçını oyna (N. maç · ev/deplasman)" butonunu gösterir.

### 2.2 — Sezon sonu bireysel ödülleri
`endLeagueSeasonIfDone` düzenli sezon bitince `announceSeasonAwards()` çağırıyor:
- Oyuncu havuzu = kullanıcının **gerçek** sezon istatistikleri (`p.sezon`) + rakip kulüplerin en iyi 4 oyuncusu için **OVR/pozisyondan türetilen** sezonluk istatistik (`seasonAwardStatSynth`).
- Ödüller: **Lig MVP** (performans skoru), **en skorer/asistçi/ribaundçu**, **ideal beşli** (pozisyon başına en iyi), **yılın genci** (yaş≤21). Ödül töreni modalı (`showSeasonAwardsModal`) + haber akışı + `managerHistory` (MVP kullanıcı oyuncusuysa +3 itibar). `p.sezon` her sezon başında sıfırlandığından ödüller o sezona ait.

### Test
- `faz2-check.js` harness **13/13 geçti** (2-2-1-1-1 deseni, ilk-4-galibiyet, bracket çeyrek→yarı→final, şampiyon+MVP, ödül hesap+modal), 0 konsol hatası.
- Ödül töreni ve şampiyonluk modalları görsel olarak doğrulandı (ekran görüntüleri). `node tools/visual-check.js` masaüstü+mobil 0 hata. RAPOR B2 ✅ işaretlendi.

## 2026-07-08 (7. oturum) — FAZ 1: C1 save-scum doğrulama + kronik yorgunluk mekaniği

Kullanıcı "tüm fazları onay sormadan bitir" dedi → Faz 1'den itibaren fazlar peş peşe uygulanıyor (her faz ayrı commit + test).

### 1.1 — C1 (save-scum) gerçekten doğrulandı + "Maçı sonuçlandır"
Kod incelemesi C1'in zaten kapalı olduğunu gösterdi (sonuç maç başında `G.pendingMatch` ile kilitlenir). **Gerçek tarayıcı harness'i (Playwright) ile 4 senaryo test edildi, hepsi geçti:**
- Durdur → sayfa yenile → "Devam Et" → "Maçı sonuçlandır" ⇒ skor birebir aynı (ör. 83-88 → 83-88).
- Kilit sayfa yenilemeden sonra da kalıcı (aynı `sig`, aynı skor).
- Sonuç işlenince kilit kalkıyor (`pendingMatch=null`), sıradaki maç **farklı** ⇒ aynı maç yeniden oynanamaz.
- **Yeni UX:** Durdurulan maç takılı kalmasın diye `startMatch` butonu (id=`startMatchBtn`) durdurulunca "▶ Maçı sonuçlandır"a döner + kritik bildirim; kilitli sonuç açıkça uygulanır. `RAPOR-EKSIKLER.md` C1 "✅ gerçekten doğrulandı" olarak güncellendi.

### 1.2 — Kronik yorgunluk → artan sakatlık riski (kümülatif)
`rollInjuriesAfterUserMatch` zaten anlık enerjiye göre risk çarpanı uyguluyordu; şimdi **kümülatif** hale getirildi:
- Yeni alan `p.kronikYorgunlukSayisi`. Yeni yardımcı `updateChronicFatigue(playedSet)` (`js/match-prep.js`): bu maçta gerçekten oynayan ve **maç öncesi enerjisi <68** olan oyuncunun sayacı artar (üst sınır 6); iyi enerjiyle oynayan ya da dinlenip enerjisi ≥68'e dönen oyuncunun sayacı sıfırlanır. Enerji düşmeden ÖNCE (`applyMatchFatigueToRoster`'dan önce) çağrılıyor — hem lig hem playoff dalında.
- Risk çarpanı: her ardışık yorgun maç **+%15**, üst sınır **+%60** (kron≥4). Dengeyi bozmayacak makul tavan; ayrı zorluk seviyesi yerine bu mekanik devrede (görev kuralı).
- Sayaç oyuncu nesnesinde → JSON save/load ile otomatik kalıcı.

### Test
- Harness 12/12 geçti (C1 + sayaç artışı 1→2→3, ≥68'de sıfırlama, cap=6, kron=4→×1.6), 0 konsol hatası.
- `node tools/visual-check.js` masaüstü+mobil 0 hata.

## 2026-07-08 (7. oturum) — FAZ 0: Modüler mimari + otomatik görsel test altyapısı

Yeni 6 fazlık "A sınıfı oyun" görev belgesinin **Faz 0**'ı uygulandı (kullanıcı her faz sonu onay istiyor — Faz 1'e geçmeden önce onay bekleniyor).

### 0.1 — Tek dosya → 10 modül (mekanik, sıfır mantık değişikliği)
`charazay2.0.html` içindeki tek `<script>` bloğu (satır 1074-6558, ~5485 satır JS) **bitişik dilimler** halinde `js/*.js`'e bölündü ve klasik `<script src>` etiketleriyle sırayla yükleniyor (ES module DEĞİL — çift-tıkla-aç davranışı korundu).
- Bölme bir Node scriptiyle yapıldı; **KANIT: 10 parça birleştirilince orijinal JS ile byte-birebir aynı** (mantık değişmediğinin matematiksel garantisi).
- Modüller: `state.js`, `economy.js`, `persistence.js`, `portraits.js`, `roster-gen.js`, `league.js`, `match-prep.js`, `render.js`, `match-engine.js`, `main.js` (kod haritası → `CLAUDE.md`).
- **Neden bitişik dilim, saf mantıksal ayrım değil:** Dosyanın arka yarısında render + oyun mantığı iç içe; fonksiyonları yeniden sıralamak yükleme-anı (`const` başlatma) sırasını bozar. Bitişik dilim = yükleme sırası birebir korunur = sıfır risk. Klasik scriptlerde fonksiyonlar `window`'a, top-level `const/let` paylaşılan global lexical env'e gittiği için dosyalar arası çağrı sorunsuz.
- 10 dosyanın hepsi ayrı ayrı `node --check`'ten geçti (hiçbir dilim fonksiyon ortasından kesilmedi).
- `index.html` / `Charazay-2.0-BASLAT.html` yalnızca yönlendirme yaptığından (script gömmüyor) referans güncellemesi gerekmedi.

### 0.2 — `tools/visual-check.js` (Playwright + sistem Chrome)
Otomatik görsel/konsol testi eklendi:
- Kendi statik HTTP sunucusunu ayağa kaldırır (harici bağımlılık yok), sistem Chrome'unu kullanır (tarayıcı indirilmez — `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`).
- **İki viewport:** masaüstü 1440×900 + mobil 390×844.
- Akış: yeni kariyer oluştur → Maçlar → taktik ekranı → **maç başlat + canlı izle** → market → ayarlar.
- Konsol hatası + yakalanmamış JS istisnası toplar; **0 hata şartı** (aksi halde çıkış kodu 1 = görev bitmemiş).
- Her adımın ekran görüntüsü `tools/visual-check-output/{desktop,mobile}/` altına kaydedilir.
- **Sonuç:** Her iki viewport'ta 0 konsol hatası; canlı maç motoru, sezon/fikstür, tüm sayfalar modüler yüklemeyle kusursuz çalışıyor (ekran görüntüleriyle görsel doğrulama yapıldı).
- **CLAUDE.md kuralı:** artık her mantık/UI değişikliğinden sonra bu script çalıştırılmadan görev tamamlanmış sayılmaz.

### Altyapı / kararlar
- `package.json` (private, sadece dev) + `playwright` devDependency. `node_modules/`, `package-lock.json`, `tools/visual-check-output/` `.gitignore`'a eklendi (üretilebilir/ağır artefaktlar).
- Faz 0 saf altyapı: **hiçbir oyun mekaniği değişmedi.** Faz 1 (C1 doğrulama + kronik yorgunluk) onay sonrası.

## 2026-07-06 (6. oturum) — DENETİM RAPORU + A1→A4 + C1 + C4/C5 düzeltmeleri

Önce tam sürüm denetim raporu çıkarıldı (`RAPOR-EKSIKLER.md`) ve proje `CLAUDE.md` yazıldı.
Ardından kullanıcının onayladığı sırayla (A1 → A2+A3+A4 → C1 → C4/C5) düzeltmeler uygulandı.
Tümü izole VM harness (700+ maç simülasyonu) + `node --check` ile doğrulandı, **0 runtime hata**.

### A1 — Rakip takımlar "soyut" olmaktan çıktı (kök düzeltme)
Maç motoru (`generateMatchEvents`/`runPossession`) artık rakip tarafında da kullanıcıyla **aynı
derinlikte** çalışıyor:
- Rakip kadrosu zaten `CLUB_CACHE_KEY` (localStorage) önbelleğinde **kalıcı**; ondan **sabit 5 + yedek**
  kuruluyor (en iyi 5 başlar, sakatlar dışlanır). Yeni yardımcılar: `oppCourt/oppBench/oShooter/oAny/oBenchNext`.
- Rakip oyuncularda **maç istatistiği** (`ostats`/`bumpO`: sayı/asist/ribaund) tutuluyor.
- Rakip oyuncularda **bireysel faul sayacı** + oyundan atılma (`oppFoulsOut`) — `recordFoul` rakip dalı yeniden yazıldı.
- **Rakip sakatlık takibi:** `rollInjuriesForBotClub` maç sonrası oynanan rakibin önbellek kadrosunda
  sakatlık açar/iyileştirir; sakat rakip bir sonraki maçta sahaya çıkmaz. (Basitlik/performans kararı:
  yalnızca kullanıcının o maçta karşılaştığı rakip için işlenir; tüm bot-bot sakatlıkları simüle edilmez.)

### A2 — MVP artık her iki takımdan çıkabilir
MVP hesabı `pstats` + `ostats` havuzundan (sayı + asist×1.5 + ribaund×1.2). Rakip daha iyi oynadıysa MVP
rakipten çıkar. Doğrulama: dengeli güçte rakip MVP oranı ~%48, zayıf rakipte ~%9 (beklenen).

### A3 — Rakip oyuncular 5 faulde oyundan atılıyor
`oppFoulsOut` kullanıcı `userFoulsOut` ile simetrik: yedekle değişir, yoksa eksik oynar. 300 maçta
~440 rakip faul-out olayı üretildi.

### A4 — winStreak sezon başında sıfırlanıyor
`startLeagueSeason` sıfırlama bloğuna `G.winStreak=0;` eklendi (seri artık sezona devretmiyor).

### C1 — Save-scum açığı kapatıldı
Maç sonucu artık **maç başında kilitleniyor**. `startMatch` üretilen bitiş olayını `G.pendingMatch={sig,ev}`
olarak kalıcı kaydediyor (`saveGameNow`). Bitiş işleme mantığı `applyMatchResult(ev,ctx)` fonksiyonuna
çıkarıldı (hem canlı bitiş hem kilit yolu kullanır). Kaybederken durdurup (ya da sayfayı yenileyip) yeniden
`Maçı Başlat`'a basınca **yeniden üretilmez — aynı kilitli sonuç uygulanır**. Manuel koçluk sonucu
değiştirirse kilit güncellenir (`regenerateMatchRemainder`). `pendingMatch` save/load'a eklendi.

### C4 — Head-to-head sıralama
`buildLeagueRows` eşit puanda önce **ikili maç sonucu** (aralarındaki karşılaşma), sonra genel averaj,
sonra isim ile sıralıyor.

### C5 — Dinamik tur sayısı
Yeni `totalRounds()` fikstürden türetiyor; tüm `Tur X/19` ve `19 tur`/`19/19` sabitleri
`totalRounds()` ile değiştirildi (farklı takım sayılı liglerde kırılmaz).

### Kararlar / bekleyenler
- **A1 basitlik kararı:** rakip sakatlığı yalnızca kullanıcının oynadığı rakip için (tüm bot-bot değil) —
  görünürlük yüksek, yük düşük. Rakip maç istatistikleri sezona kaydedilmez (yalnız canlı MVP için).
- **C2, C3, B1-B5 bu turda uygulanmadı** (kozmetik/büyük yeni özellik — ayrı tur). Detay `RAPOR-EKSIKLER.md`.

### Test edilmesi gerekenler (kullanıcı, tarayıcıda)
1. Maç oyna → skorbordda **rakip oyuncu adıyla** faul-out (`⚠️ Rakip — X 5. faulüne...`) ve MVP anonsunda
   bazen **(rakip takım adı)** görünsün.
2. Kaybettiğin bir maçı **Durdur** → tekrar **Maçı Başlat** → "sonuç kilitliydi, aynı sonuç uygulandı" çıksın,
   skor değişmesin. (Sayfayı yenileyip tekrar başlatınca da aynı.)
3. Sezonu bitir → yeni sezon başında galibiyet serisi (üst barda) sıfırlanmış olsun.
4. Lig tablosunda eşit puanlı iki takımın sırası aralarındaki maça göre belirlensin.
5. Fikstür/lig ekranlarında tur sayısı doğru görünsün (halen 20 takım → /19).

## 2026-07-06 (5. oturum) — MEKANİK REVİZYON: 36 maddelik görev belgesi baştan sona uygulandı

Görev belgesindeki 35 madde (Madde 33 kasıtlı hariç) uygulandı. Her madde ayrı commit; tümü
`node --check` + izole VM harness (maç motoru + DOM render + tam maç akışı) ile test edildi, **0 runtime hata**.
Skor bandı korundu (iki takım ort. ~88-90). Tarayıcı testi eklenti bağlı olmadığından yapılamadı;
yerine zengin DOM-stub harness ile tüm render/aksiyon/modal/maç akışı doğrulandı.

### Uygulanan maddeler (özet)
- **1** İlk 5/rotasyon seçimi (`G.lineup`, `openLineupEditor`, `matchLineup` refactor — otomatik fallback korundu).
- **2/3/4** Bireysel şut isabeti (`shooterAcc`: oyuncu statı+enerji+moral/kimya), enerji ağırlıklı `computeRosterOfrDef`, serbest atış `serbest` statına bağlı. Moral/kimya çift sayım önlendi (sadece şut formülünde).
- **5** Sakatlık yeniden tasarım: 25 gerçek sakatlık + şiddet (Hafif/Orta/Ağır) + sabit gün aralığı + yeniden-sakatlanma riski (`formReturnMatches`) + kart/modal görünürlük.
- **6** Playoff (ilk 8 tek maç eleme; kullanıcı maçları canlı, botlar simüle; `G.playoff`).
- **7** Scouting: gizli potansiyel (youth ~%70, market ~%40) + KR ile keşif raporu (`scoutPlayer`).
- **8/9** Koç CV/skor (`c.skor`,`c.gecmis`,`awardCoaches`) + menajer itibarı (`G.managerRep`, bot `botManagerTitles`); küçük performans bonusu (`teamBonusFactor` → uMul, maks ~+%5.5).
- **10/11** Zengin anlatım havuzu + MVP anonsu + 4 spiker (`SPIKERS`/`SPIKER_LINES`, maç başı atama, kişiye özel ton).
- **12** Canlı müdahale (Manuel Koçluk): mola/çeyrek arası duraklama, canlı enerji, oyuncu değişikliği, **kalan maç yeniden üretimi** (`generateMatchEvents` resume desteği).
- **13** Bot gerçek transfer (önbellek kadrosunda en zayıfı daha iyisiyle değiştirir).
- **14** Yeni başarımlar (lig 1.liği, playoff kralı, seri10, MVP, üst lig) bağlandı.
- **15** Panya SVG konumu düzeltildi (taban çizgisinden 4 ft içeri).
- **16/17/20** Kişisel faul limiti+oyundan atılma+otomatik değişiklik, takım faul bonusu (çeyrek 5. faul), 3'lük şutta faul→3 atış.
- **18** Temel top hareketi animasyonu (hücum yarısından şut noktasına CSS geçişi).
- **19** Sözleşme sonuçluluğu: serbest kalma riski (moral/performansa bağlı) + erken uzatma (`extendContract`).
- **21/22** Altyapı yaşlanma + terfi/düşme, yaşa bağlı gerileme (32+) + emeklilik (36+).
- **23/24** Bilet doluluğu son 5 maç formu + kullanıcı bilet fiyatı (5 kademe, arz-talep).
- **25/37** Kademeli iflas (uyarı→zorunlu satış, game over YOK) + öncelikli bildirim kuyruğu.
- **26/27/29** Serbest pazar kadro sınırı (18), koç uzmanlık başına 1 + toplam 5 sınırı.
- **28/35** Altyapı havuzu yenileme (`ensureYouthStock`) + ücretli altyapı tesisi yükseltme (4 seviye).
- **30** Yorgunluk sadece sahaya çıkanlara (played/subbed set).
- **31** Rakip kadro önbelleği: aktif lig grubu asla silinmez.
- **32** Manuel 3 kayıt slotu (otomatik kayıttan bağımsız).
- **34** Deplasman seyahat masrafı.
- **36** Zekâ (kritik an bonusu) + liderlik (kimya etkisi) statlarına gerçek işlev.

### Kararlar
- **Madde 33 (maaş tavanı) uygulanmadı** — belge kararı gereği (Madde 25 döngüsü dengeyi kuruyor).
- Moral/kimya maç dengesini bozmasın diye tek kanaldan (şut formülü) uygulandı; roster gücünde çift sayılmadı.
- Manuel koçlukta kalan maç yeniden üretilir; ilk yarı oyuncu istatistikleri (küçük kozmetik kayıp) kabul edildi.
- Bildirimlerde `showNotif(msg,{critical:true})` kritik uyarılar için (iflas, sakatlık, sözleşme kaybı).

### Test edilmesi gerekenler (kullanıcı, tarayıcıda)
1. Taktik penceresi → "İlk 5 seç" → kaydet; maçta o beşlinin oynadığını doğrula.
2. Maç oyna: spiker adı görünsün, MVP anonsu çıksın, top hareketi aksın, faul-out/bonus/3'lük faul olayları.
3. Manuel Koçluk aç → mola/çeyrek arasında değişiklik yap → maç devam etsin.
4. Sezon bitir → playoff paneli (Lig ekranı) → playoff maçını oyna → şampiyon.
5. Arena: bilet fiyatı değiştir (doluluk/gelir değişsin). Altyapı: tesis yükselt (genç sayısı artsın).
6. Scouting: gençte "Keşfet" butonu → gerçek potansiyel açılsın.
7. Ekonomi: kasayı bilerek eksiye düşür → iflas uyarısı → zorunlu satış.
8. Ayarlar → kayıt slotları: kaydet/yükle.

## 2026-07-05 (4. oturum) — GÖREV 6: Transfer market yeniden tasarımı + koç fotoğrafları + kozmetik

### Yapılanlar
- **"(demo)" yazıları kaldırıldı:** Sponsor ismi `Charazay 2.0 (demo)` → `Charazay 2.0`. Transfer market
  alt bilgisindeki "Sezon ~30 gün (demo)" cümlesi kaldırıldı, yerine "40 serbest oyuncu · N kulüp ilanı"
  bilgisi kondu. DOM taramasıyla sayfada "(demo)" metni kalmadığı doğrulandı (`pageHasDemoText:false`).
  (Not: `charazay-mentor-panel.html` dev aracıdır, oyunun parçası değil — dokunulmadı.)
- **Koç fotoğrafları:** 5 emoji dönüşümü kaldırıldı. Koçlar artık mevcut 201'lik oyuncu portre havuzunu
  paylaşıyor (ayrı havuz üretilmedi — daha hızlı/tutarlı). Yeni `coachAvatar/coachAvatarAttrs` yardımcıları
  koç-özel seed ('coach_'+id+ad) ile stabil, oyunculardan farklı foto index'i veriyor; SVG yedek zinciri
  aynı. Hem işe alınmış koçlar hem Koç Pazarı adayları gerçek foto gösteriyor (8 koç avatarı doğrulandı).
- **Transfer market tam listeleniyor:** `renderScoutingReport` (yalnızca 3 aday gösteren "Keşif raporu"
  çerçevesi) tamamen kaldırıldı (ölü kod dahil). Market ekranı iki sekmeye ayrıldı: **Serbest Oyuncular**
  (40 ilan, mevcut OVR/Maaş/pozisyon sıralama-filtre korundu) ve **Kulüp Transferleri**.
- **YENİ ÖZELLİK — Kulüp transferleri (satılık/kiralık):** Rakip kulüplerin oyuncularından ayrı bir havuz
  (`G.clubTransferPlayers`, hedef 14 ilan). Kaynak: kullanıcının lig grubundaki gerçek rakip kulüp adları
  (`userLeaguePeers`). Her ilan **satılık** (bonservis = transferFee×1.3) veya **kiralık** (~%42 olasılık;
  kira bedeli = transferFee×0.22 tek seferlik, haftalık maaş sende, sezon sonunda kulübüne döner) modunda.
  - `buyClubPlayer` → bonservis öder, oyuncu kalıcı kadroya. `loanClubPlayer` → kira öder, oyuncu
    `loan:true` + `loanReturnDay = gün+45..75` ile katılır. `processLoanReturns` süresi dolanı kadrodan
    çıkarır + bildirir (maç sonu gün ilerlemesine bağlandı). `tickClubTransferMarket` gün ilerledikçe
    0-2 ilanı "başka kulüp aldı" diye eler, havuzu 14'e tamamlar.
  - Kadro üst sınırı 18 (dolu ise transfer engellenir). Dedup (`ensureUniquePlayerNames`) bu havuza da
    uygulanıyor → aynı listede tekrar isim/foto yok. Havuz save/load'a eklendi.
  - `findPlayerRecord` ve `openPlayerModal` bu havuzu tanıyor; modalda satılık→SATIN AL, kiralık→KİRALA
    butonu (kulüp adı + fiyatla) çıkıyor.

### Test (tarayıcıda, yerel node sunucu + Chrome ile doğrulandı)
- JS syntax temiz (node --check, tek script bloğu ~200K karakter). Konsol hatası yok.
- Kulüp Transferleri sekmesi: 14 ilan, gerçek fotolar, KİRALIK/SATILIK rozetleri, "X kulübünden",
  kira bedeli/bonservis ayrımı, KİRALA/SATIN AL butonları render oluyor. Serbest sekmesi 40 oyuncu.
- Kiralama + satın alma çalışıyor (kadro 15→17, doğru KR düşüşü). Kiralık süresi dolunca kadrodan çıkıyor.
- Koç fotoğrafları Antrenman ekranında görünüyor (8 avatar, portre havuzundan).

### Karar
- **Para birimi KR olarak kaldı** (kullanıcı kararı) — USDT'ye dönülmedi, dokunulmadı.
- Koçlar için ayrı foto havuzu üretmek yerine mevcut 201'lik havuz paylaşıldı (hız + tutarlılık).

## 2026-07-05 (3. oturum) — Denetim + 500 portre + fikstür/ekonomi düzeltmeleri

### Önemli tespit
Gelen görev talimatı projenin ESKİ bir halini tarif ediyordu (25 görsel, USDT para birimi, sahte login,
bağlanmamış ekonomi, saniyelik antrenman). Doğrulama ile bunların çoğunun zaten yapılmış olduğu görüldü:
para birimi "KR" (USDT yok), login sade (şifre yok), ekonomi bağlı (haftalık maaş + bilet + arena bakımı),
antrenman gün sistemi (`advanceTrainingDays`), portre yerel havuz varsayılan (`playerAvatar → playerPortraitFile`),
ayarlar/öğretici/başarım/taktik/sözleşme/AI-transfer/istatistik hepsi mevcut. Bu yüzden yalnızca **gerçekten
eksik/bozuk** olanlar düzeltildi.

### Düzeltilen gerçek hatalar
- **Fikstür ev/deplasman dengesizliği:** Round-robin `(r+i)%2` heuristiği kullanıcıya 18 ev / 1 deplasman
  veriyordu. Ev sahibi "o ana dek daha az ev maçı oynayana" verilerek dengelendi → kullanıcı 10/9, tüm
  takımlar ±1. (Hem gerçekçilik hem ekonomi hem ev avantajı düzeldi.)
- **CPU maç skoru ölçeği:** Bot-bot maçları hâlâ eski 5 dk ölçeğindeydi (~27 sayı), kullanıcı maçları ~90.
  `simulateCpuMatch` yeni FIBA ölçeğine hizalandı (~86/takım, 58-125 bant) → lig averajı tutarlı.
- **Foto/isim çakışması (Görev 5.2):** `ensureUniquePlayerNames` artık foto index'ini de tekilleştiriyor
  (seed kaydırma). Kadro (15) ve market (40) listelerinde 0 çakışma doğrulandı.
- **Arena adı sanitizasyonu:** `saveArenaName` artık `sanitizeTeamName` kullanıyor (innerHTML'e giren tek
  escape'siz kullanıcı girdisiydi). Takım/menajer adı zaten girişte sanitize ediliyordu — XSS testi geçti.
- **Ölü kod:** `cloneArr`, `shuffleArr` (hiç çağrılmıyordu) kaldırıldı.

### Ekonomi dengesi (Görev 4.1)
Ekonomi zaten bağlıydı; denge doğrulandı ve iyileştirildi:
- Başlangıç 50.000 KR. Haftalık gider ~6.400 KR (oyuncu ~5.300 + koç ~200 + arena bakımı ~940).
- Bilet geliri = arena kapasitesi × doluluk × 1.2; doluluk galibiyet oranıyla artar (0.45–0.95) →
  **arena yatırımının ve galibiyetin somut getirisi.** ~5.000 kapasitede ~4.350 KR/ev maçı.
- Sezon (~28 gün ≈ 3–4 ekonomi haftası): bilet ~43.500, maaş ~19.700 → net ~+24.000 (ödüller hariç).
- **Maç galibiyet ödülü ~150 KR → ~2.500 KR** (rand 1500–3500) yükseltildi; mağlubiyet günü geliri ~55 → ~650.
  Böylece galibiyet doğrudan ekonomik anlam kazandı, ama bilet ana gelir olarak kaldı (denge korundu).

### Görev 5 — Portre havuzu 120 → 201 (kullanıcı kararıyla 201'de sabitlendi)
- Script paralel işçi (ThreadPool) + 429 (rate limit) yeniden deneme + genişletilmiş çeşitlilik (30 erkek
  ülke, 12 forma, 10 görünüm, yaş) ile güncellendi. Tümü erkek (kadın üretilmez).
- pollinations.ai eşzamanlı isteklerde 429 veriyor; hız ~2-3/dk olduğu için 500 pratik değildi. Kullanıcı
  "mevcut sayıda sabitle" dedi (dedup zaten aynı takımda tekrar yüzü engelliyor).
- **Sonuç:** üretim durduruldu, **201 portre** (p_0000–p_0200) kesintisiz, hepsi geçerli JPEG (FFD9 kontrolü),
  hepsi erkek (3 partide kontak sayfası taraması). Stray dosya (p_0432) temizlendi. `PORTRAIT_POOL_SIZE=201`,
  `manifest.json count=201`. Oyunda 70 oyuncuda 0×404 doğrulandı. Foto-index tekilleştirmesi havuz boyutundan
  bağımsız aynı takım/market'te tekrar yüzü engelliyor.

## 2026-07-05 — Yayına hazırlık taraması ve düzeltmeler

### Yapılanlar
- **Kadın portreleri kaldırıldı (erkek oyuncu şartı):** Portre havuzundaki (`assets/portraits/`, 120 dosya)
  12 kadın portre (indeks 10,11,30,31,50,51,70,71,90,91,110,111) erkek olarak yeniden üretildi.
  Kaynak: `PORTRAIT_ETH` dizisindeki iki "woman" girdisi ("Spanish/Korean woman basketball player")
  hem `charazay2.0.html` (satır ~1846) hem `tools/generate-portraits.py` içinde "Spanish man"/"Korean man"
  ile değiştirildi. 120/120 portre görsel olarak tarandı — hepsi erkek, Charazay tarzı stüdyo headshot.
- **Lig takım ismi çakışması düzeltildi:** İsimler `${şehir} ${sonek}` (10×12=120 kombinasyon) rastgele
  seçiliyordu; grup başına 20 takımda çakışma (ör. iki "Adana Panterleri") oluyordu. `makeSubTemplate` artık
  grup içinde benzersiz isim üretiyor (`genUniqueClubName`), ve `ensureTblState` mevcut kayıtlardaki çakışan
  isimleri de onarıyor. Tüm 26 lig grubu benzersiz doğrulandı.

### Test ve doğrulama (tarayıcıda, yerel sunucu ile)
- JS syntax temiz (node --check), tüm 10 sayfa (dashboard, takım, kadro, maç, lig, market, altyapı, antrenman,
  arena, bilanço) hatasız render oluyor. Konsol hatası yok.
- Tüm inline onclick handler'ları ve aksiyon fonksiyonları tanımlı; modallar (ayarlar, başarımlar, öğretici,
  oyuncu, taktik) açılıp kapanıyor.
- **Maç motoru kusursuz:** canlı Türkçe anlatım (renk kodlu: sayı yeşil, kaçan kırmızı), skorboard, çeyrek
  dökümü, şut haritası filtresi, ahşap zeminli tam basketbol sahası (iki pota, boyalı alanlar, 3 sayı yayları),
  canlı takım istatistikleri. Tam maç sonu akışı (puan tablosu, ekonomi/bilet geliri, CPU maç simülasyonu,
  sakatlık) hatasız tamamlanıyor.
- Yerleşik mentor öz-denetimi (`charazayCollectMentorIssues`) tüm sayfalarda 0 hata; yalnızca 2 bilgilendirici
  uyarı (sidebar lig ağacı kaydırılabilir — normal davranış).

### Kararlar / gözlemler
- Portreler pollinations.ai ile deterministik seed'lerle üretiliyor (internet gerektirir). Yeniden üretim için
  ilgili dosyaları silip `py tools/generate-portraits.py 120` çalıştırmak yeterli (mevcut >8KB dosyaları atlar).
- **Açık öneri (kullanıcı kararı bekliyor):** Maç skorları demo temposu nedeniyle düşük (ör. 31-28; 5 dk çeyrek).
  Gerçekçi basketbol skorları (~80-100) istenirse maç motoru temposu ayarlanabilir; şu an anlatım akışı hızlı
  tutmak için bilinçli tercih.
- Steam paketleme: Oyun tek HTML dosyası. Steam masaüstü dağıtımı için Electron/Tauri sarmalayıcı gerekir
  (ayrı bir adım; henüz yapılmadı).

## 2026-07-05 (2. oturum) — Gerçekçi maç skorları + oyuncu adı çakışması

### Yapılanlar
- **Maç motoru gerçekçi FIBA kurallarına göre yeniden yazıldı:** Çeyrekler 5 dk → **10 dk (600 sn)**,
  uzatma **5 dk (300 sn)**. `MATCH_CLOCK_SEC=600`, yeni `OT_CLOCK_SEC=300`. Pozisyon döngüsü tek bir
  `runPossession(q,t)` fonksiyonuna toplandı; artık pozisyonların ~%80'i saha içi şutla biter, ~%10 serbest
  atış turu, ~%6 top kaybı, ~%4 mola. Ribaund/asist/blok/faul/and-1 kutu istatistiğine ve anlatıma gömülü.
  Uzatma tam 5 dk oynanır, süre sonunda hâlâ beraberse yeni uzatma (gerçek kural).
- **Sonuç (300+ simülasyon doğrulaması):** ortalama ~86-91 sayı/takım; normal tempo ~86, hızlı ~97, yavaş ~75
  (iki takım ort.). Uzatma oranı ~%1. Kutu skoru gerçekçi (2sy %55-68, 3sy %33-44, serbest atış, ribaund ~35,
  asist ~20). Örnek canlı maçlar: 102-100, 85-104 — çekişmeli ve gerçekçi. Skorboard 10:00 gösteriyor,
  çeyrek dökümü 23-29 sayı/çeyrek. Anlatım hızı 2200ms → 1800ms.
- **Oyuncu adı çakışması giderildi:** Aynı kadroda iki özdeş tam ad çıkabiliyordu ("X buldu; X bitirdi" gibi
  anlatım hatasına yol açıyordu). `ensureUniquePlayerNames` eklendi; genRoster/genYouth/getBotClubProfile'da
  uygulanıyor + anlatımda pasör=atan güvenliği. 30 kadro/youth/bot ve 200 maç simülasyonunda 0 çakışma.

### Test
- JS syntax temiz, konsol hatasız. Tam maç akışı (skorboard, saha, şut haritası, kutu skor, uzatma, maç sonu
  ekonomi/tablo) sorunsuz. Skorlar tutarlı biçimde 80-100+ bandında; tempo taktiği skoru anlamlı etkiliyor.

## 26. oturum — Canlı maç gerçekçilik: TAM revizyon (FAZ 0-6, otonom, canlı ölçümle)

**Amaç:** Canlı maçı gerçek bir basketbol maçı gibi göstermek — top oturmalı (sürekli pas-pas değil),
oyuncular yerine varınca durmalı, orta saha set oyununda boşalmalı. Tümü **canlı Chrome ölçümüyle**
(Playwright + seedli deterministik maç) faz faz doğrulandı.

### Ölçüm altyapısı (yeni)
- `tools/measure.js` — Playwright + sistem Chrome; `addInitScript` ile Math.random tohumlanır →
  kariyer kurulumu + maç sonucu **deterministik**. DİNAMİK (top modu, hareket, orta saha; zaman-ortalamalı
  konumsal metrikler) + STATİK (şema/move/reuse) ölçer; **DEĞİŞMEZLİK** için sonuç imzası (skor/kutu skor hash).
  `--seed`, `--secs`, `--save`.
- `tools/band.js` — 200 maç skor bandı harness'i (canlı animasyon olmadan `generateMatchEvents`), tohumlu
  skor dizisi hash'i ile revizyon öncesi/sonrası karşılaştırma.

### Kırmızı çizgi (kanıtlandı): SONUÇ matematiği DEĞİŞMEDİ
- Kanonik tohumda skor/kazanan/kutu skor hash `db4799f0` **her fazda birebir aynı**.
- 200 maç band skor-dizisi hash'i `46daaec2` revizyon öncesi (HEAD~4) ile **birebir aynı** → sunum-only
  değişiklikler sonucu hiç bozmadı. Tüm dokunuşlar `js/match-engine.js`'te, yalnız canlı oynatım fonksiyonları.

### Fazlar ve ölçüm (önce → sonra, kanonik seed 987654321)

| Metrik | Baz (v27) | Final (v28) | Hedef | Faz |
|---|---|---|---|---|
| pass % | 15 | **9** | ≤20 | FAZ 1 |
| held % | 47 | **67** | ≥55 | FAZ 1 |
| avgMoving | 7.3 | **4.7** | ≤5 | FAZ 2 |
| avgMid | 2.7 | **1.4** | ≤1.5 | FAZ 3 |
| xSpread | 334 | **340** | ≥280 | korundu |
| avgNN | 64 | **63** | ≥55 | korundu |
| overlap | 0 | **0** | ≤2 | korundu |
| iso % | 8.5 | **8.5** | ≤15 | korundu |
| spotup % | 37 | **37** | ≥20 | korundu |
| moveFilled | 68/118 | **68/118** | >0 | korundu |
| reuse | 0.24 | **0.24** | ≤0.30 | korundu |

- **FAZ 1 (topu oturt):** SET/iso dallarında dribbling (held) süresi uzatıldı; asistsiz/kaçan şutlarda ara
  (swing) pası kaldırıldı (pg topu sürerek doğrudan şutöre verir) — asistli sayıda swing korunur (anlatım-saha
  senkronu). held %47→~59, pass %15→~11.
- **FAZ 2 (oyuncuları oturt):** `_simStep` **varış freni** (hedefe <24px kalınca hız eşik-altı 12px/sn → varan
  jeton hemen durur); adam-adama + 2-3 bölge savunmasına **hareket deadzone'u** (adam/top mikro-oynamasını
  kovalamaz); off-ball yardım gap 84→62 (boyada kümelenme/çarpışma jitter'i); tek kesme; geçiş hızlandırıldı
  (ivme 8.5→13, sprint ×1.5→1.62; tavan hız gerçekçi kalır); mikro-salınım 3.5→1.9. avgMoving 7.3→4.7.
- **FAZ 3 (yarı sahaya çıpala):** OFF_BASE PG noktası 394→356 (orta bant x380-560 dışına); hava atışında
  sıçramayan 8 oyuncu kendi yarı sahasına (2 pivot çemberde) — orta saha yığılması kalktı. Derin set fazında
  **avgMid=0**. avgMid 2.7→1.4.
- **FAZ 4 (regresyon kalkanı):** xSpread/avgNN/overlap/iso/spotup/moveFilled/reuse tümü korundu — onarım gerekmedi.
- **FAZ 5 (anlatım-görüntü senkron):** crossover/hesitation artık sahada oynanır (yanal aldatma) — move değeri
  olan HER şutun karşılığı var. Tarama: 3'lükte turnike/dibe 0, asistli şutta pasör=atan 0, tüm şutlarda şema.
- **FAZ 6 (final):** 30sn tam maç ölçümü tüm hedefleri tek seferde geçti; 200 maç band birebir korundu;
  `visual-check` masaüstü+mobil 0 hata; `node --check` temiz; cache-bust `?v=27`→`?v=28`.

### Karar / gözlem
- v27'nin "hep pas / hep koşu / orta saha kalabalık" hissi **canlı ölçümle** teşhis edildi: kök neden her
  pozisyon başında 10 oyuncunun karşı yarı sahaya koşması (full-court transition) ve savunmanın top/adam
  mikro-oynamasını kovalaması. Set fazı zaten iyiydi; kalabalık **geçiş** ve **savunma jitter'ı** kaynaklıydı.
- En etkili tek dokunuş: **varış freni** (oyuncu yerine varınca net durur) + **savunma deadzone** + **tip-off
  dağıtımı**. Skor matematiğine hiç dokunulmadı; determinizm hem kanonik hem 200-maç band ile kanıtlandı.

### Test edilmesi gerekenler (kullanıcı)
- Bir sezon maçı izle: top oyun kurucuda **sürülerek** ilerlemeli (sürekli pas değil), oyuncular köşe/kanat
  çapalarında **durup** kesme/perde yapmalı, orta saha set oyununda **boş** olmalı, hava atışında takımlar
  kendi yarı sahasına dizilmeli. Anlatımdaki asist/çalım sahada birebir oynanmalı.

---

## 29. Oturum — 2026-08-29 · RAPOR-2 revizyonu (Madde 1/2/4/6/7)

### Yapılanlar
- **Madde 1 — "Analiz" sekmesi ölüydü (KÖK NEDEN):** `js/persistence.js:600` `wireAppNav()` içindeki
  slug whitelist regex'inde `analiz` yoktu; tıklama olayı elenip `showPage` hiç çağrılmıyordu (bu yüzden
  konsolda hata da yoktu). Regex'e `|analiz` eklendi. Doğrulandı: gerçek nav tıklamasıyla `page-analiz`
  `active` oluyor, `#analiz-body` 3911 karakterle doluyor, 0 konsol hatası.
- **Madde 7 — "Maçı Başlat" butonu maç canlıyken aktif görünüyordu:** `js/main.js`'e
  `setMatchButtonsRunning(running)` eklendi; `startMatch()` kurulumu bitince `true`, maç bitişinde
  (`ev.type==='end'`) ve `stopMatch()` başında `false` çağrılıyor. `js/render.js:40`
  (`renderDashboardNextMatch`) artık maç canlıyken butonu yeniden aktifleştirmiyor. Kart tıklaması
  bilinçli olarak açık bırakıldı — canlı maçta `startNextMatchNow()` maça kaydırıyor.
  Ölçüm: öncesi `disabled=false/"▶ Maçı Başlat"` → canlı `disabled=true/"⏳ Maç Devam Ediyor"` (her iki
  buton) → sonrası normal / kilitli-sonuç etiketi korunuyor.
- **Madde 4 — boy/kilo pozisyondan bağımsızdı:** `js/roster-gen.js`'e `HW_RANGE` eklendi
  (PG 178-196/75-92 · SG 188-203/82-98 · SF 196-208/88-105 · PF 201-213/95-115 · C 206-223/100-130);
  `genPlayer` artık bu aralıklardan üretiyor. 500 oyunculuk örneklemde tüm pozisyonlar bandında.
- **Madde 2 — galibiyet ödülü ekonomiyi eziyordu (rapor DOĞRU, sebep farklı):** ödül `ecoRound()` ile
  `ECO_MUL = START_KR/ECO_REF_KR = 50000/2400 ≈ 20.83` çarpanından geçiyordu → görünen "1000-2400" band
  gerçekte **20.833-50.000 KR/galibiyet**. Rapordaki 28 günde +682.690 KR bununla birebir örtüşüyor.
  Bilet geliri (~4.350 KR/maç) ve haftalık maaş (~6.676 KR) KR-yerel ölçekte olduğu için maç günü nakit
  akışı ekonominin geri kalanından ~21x kopuktu. Düzeltme: maç günü kalemleri KR-yerel ölçeğe alındı —
  galibiyet `rand(1400,2600)`, mağlubiyet `rand(420,900)`, deplasman seyahati `rand(300,700)*enflasyon`
  (seyahat de ecoRound'lu olduğundan 6.2K-14.6K idi; sadece geliri kısmak ekonomiyi eksiye çevirirdi).
  Ölçüm (19 maçlık sezon, 10 iç saha, 4 hafta): gelir 69.440 / gider 31.204 / **net +38.236 KR**;
  ödülün gelir içindeki payı **%37** (önce ~%90). Kasa 50.000 KR ile başlıyor.
- **Cache-bust:** `?v=29` → `?v=30`.

### Doğrulanan ama değişiklik GEREKTİRMEYEN maddeler
- **Madde 2 deploy kontrolü:** `https://winegg420.github.io/basketlig/` **tamamen 404** (root, index.html,
  js/match-engine.js hepsi) — GitHub Pages yayında değil. Yani canlı sürüm sorunu ayrı bir konu; ödül
  hatası zaten yerel HEAD'de gerçek olduğu için düzeltme yapıldı.
- **Madde 6 (portreler):** `window.__charazaySvgPortraits` hiçbir yerde set edilmiyor → varsayılan
  **zaten yerel dosya havuzu** (`playerPortraitFile`, 201 JPEG). pollinations.ai yalnızca yedek zincirinin
  2. adımında (birincil + komşu yerel dosya da yüklenemezse) devreye giriyor. 201 dosyanın tamamı mevcut,
  2 KB altı/bozuk dosya yok. Kod değişikliği yapılmadı — tutarsızlık görülürse sebebi `file://` açılışı
  veya tarayıcı cache'i olabilir, yerel sunucu ile açılmalı.

### Test edilmesi gerekenler (kullanıcı)
- Sol menü → **Analiz** sekmesi açılıyor mu (grafikler + oyuncu seçimi).
- Maç başlat: hem Maçlar sayfasındaki hem Ana Panel kartındaki buton "⏳ Maç Devam Ediyor" ve pasif mi;
  maç bitince normale dönüyor mu.
- Kadro/Market'te uzun oyuncuların pivot, kısa olanların oyun kurucu olduğunu gör (boy/kilo tutarlılığı).
- Birkaç maç oyna: galibiyet bildiriminde ödül artık ~1.4K-2.6K KR olmalı; kasanın maç başına şişmediğini
  Bilanço'dan doğrula.

### Madde 5 — ülkeye özgü isim havuzları (aynı oturum, kullanıcı onayıyla)
- Kullanıcı kapsamı onayladı: **26 ülkenin hepsi, ülke başına 16 ad + 16 soyad** (≈832 isim).
- `js/state.js`'e `NAME_POOLS` (26 ülke) + `randomNameFor(ulkeAd)` eklendi. `genPlayer` artık
  `randomNameFor(ulke.ad)` kullanıyor; `ensureUniquePlayerNames` çakışmada yeniden ad üretirken de
  oyuncunun ülkesine sadık kalıyor. Genel `ILK/SY` havuzu koç/izci/haber isimleri (bayraksız bağlam)
  için olduğu gibi bırakıldı — mevcut davranış bozulmadı.
- Ölçüm: 3000 oyuncu örnekleminde **0 uyumsuzluk**, 26/26 ülke kapsandı, 2412 benzersiz isim (%80),
  15 kişilik kadroda 15 benzersiz ad. Örnek: 🇯🇵 Kenji Ito (PG, 194cm) · 🇧🇪 Thijs Van Rossom (SG).

### Madde 3 — bulut kayıt (kod değişikliği YOK, kullanıcı kararı)
- Kullanıcı "şimdilik dokunma, plan çıkar" dedi. `PLAN-BULUT-KAYIT.md` yazıldı: mevcut durum,
  Supabase / Firebase / Steam Cloud / yalnız-JSON karşılaştırması, önerilen offline-first mimari
  (yerel kayıt tek gerçek kaynak + debounce'lu bulut push + çakışma modalı), 7 maddelik iş kırılımı
  ve karar bekleyen 3 soru. **Öneri: Supabase** (anonim→hesap yükseltme, statik HTML'e tek script,
  ücretsiz katman, Steam/Tauri ile de çalışır).

### Değişiklik yapılmayanlar (rapor doğrulaması)
- Madde 9 (kulüp logosu): `pickTeamLogoFile`/`onTeamLogoFileChange` zaten çalışıyor — dokunulmadı.
- Madde 8 (mobil), 10 (test verisi), 11 (çoklu lig), 12 (tooltip): kod değişikliği gerekmedi/ertelendi.

---

## 30. Oturum — 2026-08-29 · ÇIKIŞ PAKETİ: 6 faz (roller → playbook → bot AI → soyunma odası → draft → I18N)

Kullanıcı isteği: uluslararası pazara açılım (dil), bot AI derinliği, maç içi müdahale/taktik derinliği
(set çizimi), oyuncu rolü ve eğilimleri, kulüp içi krizler + kimya, interaktif draft.
Kapsam kararları (kullanıcı onayı): **I18N = TR+EN tam kapsam** · **Playbook = hazır set kütüphanesi +
görsel önizleme** · **sıra = oyun derinliği önce, I18N en son**.

### FAZ A — Oyuncu rolleri ve eğilimleri
- `roster-gen.js`: 8 rol (Şutör/Skorer/Oyun Kurucu/Potaya Dalan/Kilit Savunmacı/Pota Altı Karartıcı/
  Cam Süpürücü/Çok Yönlü). `computeRole` **normalize ağırlıklı uzmanlaşma** ile hesaplanır (rolün stat
  karışımı − oyuncunun kendi ortalaması + mevki düzeltmesi, eşik 3.5).
- 5 eğilim (0-100): üçlük · potaya dalma · pas · **soğukkanlılık** · faul disiplini. Seed'den deterministik.
- `match-engine.js`: `wPick` ağırlıklı seçim — şutör (usage), üçlük kararı (şutörün eğilimi, takım payı
  korunur), asist (pas), ribaund (ribaund+boy), blok, çalma, faul (disiplin). Clutch anlarda soğukkanlılık
  isabeti ×0.86–×1.12 etkiler ("baskı altında el titremesi").
- Arayüz: kadro/market/altyapı kartlarında rol rozeti, oyuncu modalinde 5 eğilim çubuğu.
- Ölçüm: 2000 oyuncuda 8 rol dengeli; 40 maçta ort. 92-83, üçlük payı 0.34.

### FAZ B — Playbook (set kütüphanesi) + maç içi müdahale
- `match-prep.js`: **10 hücum seti** (Serbest Akış, Pick&Roll, Horns, Dip Köşe Üçlüsü, Motion, İzolasyon,
  Pota Altı Yükleme, Erken Hücum, Kır ve Dağıt, Beş Dışarı, Flex) ve **5 savunma seti** (Adam Adama,
  2-3 Bölge, Tam Saha Pres, Her Perdede Değişim, Boyalıyı Kapat). Her set motorda gerçek etkiye sahip:
  is3 / acc2 / acc3 / ast / to / fbMul / **roleW** (setin beslediği roller yük alır) / **uyum**.
- `playbookFit`: setin sahadaki 5'e uyumu (şutörü olmayan takımda köşe üçlüğü seti tutmaz) — arayüzde %.
- `render.js` `playbookSvg`: inline SVG yarı saha şeması (pas/kesme/top sürme/perde okları), efsane ile.
- `main.js`: mola/ölü topta **maç içi set değişimi** + canlı kadro uyumu göstergesi.
- Ölçüm: üçlük payı 0.135 (Pota Altı) – 0.491 (Beş Dışarı); asist 15.7 (İzolasyon) – 26.7 (Motion);
  savunmada Boyalıyı Kapat rakip 2 sayısını 19.9→13.5 düşürüyor ama 3 sayısını 6.3→11.2 açıyor
  (bedava üstünlük yok — gerçek takas).

### FAZ C — Bot menajer zekâsı
- `botCoachProfile(takımAdı)`: tercih ettiği hücum/savunma seti, agresiflik, mola eşiği, rotasyon
  derinliği, panik seti — hepsi ayrı tuzlu + avalanche karıştırmalı hash'ten (djb2 benzer isimlerde
  yakın değer üretiyordu, tüm botlar aynı koç oluyordu).
- `botCoachTick` her pozisyon sonunda: (a) kullanıcı seri yapınca **MOLA** (kullanıcı isabeti ×0.93),
  (b) geriye düşünce **set değişimi**, (c) yorulan/3+ faullü oyuncuyu **yedekle değiştirir**.
  Rakip artık kendi setinin üçlük payını, isabetini, asistini ve top yükünü kullanıyor.
- Otomatik ilk 5 artık **pozisyon dengeli** (önce her mevkiden en iyi, sonra OVR).
- Bot transferi **mevki ihtiyacına** göre + takım gücüne orantılı hedef kalite.
- Ölçüm (40 maç): mola 2.73/maç, set değişimi 0.72/maç, rotasyon 11.7/maç; 5 botun profili farklı.

### FAZ D — Soyunma odası: süre huzursuzluğu, kriz, ilişkiler, gerçek kimya
- `processPlayingTime`: süre alamayan oyuncunun morali kadro sırasına ve **kişiliğine** göre düşer.
- `maybeLockerRoomCrisis` + `openLockerRoomModal`: **Söz ver / Sert konuş / Görmezden gel** — sonuç
  kişiliğe bağlı. `checkPromises`: söz tutulmazsa moral ve kimya çöker.
- `relationScore`/`rosterRelations`: ülke/kişilik/yaş → dostluk; aynı mevki+rol+yüksek OVR → sürtüşme.
- `chemistryTarget` + `driftChemistry`: kimya artık moral ortalaması, liderlik, huzursuz sayısı, dost
  çiftleri ve rol çakışmalarından hesaplanan HEDEFE maç başına en fazla ±3 yaklaşır.
- Kadro sayfasında **Soyunma Odası paneli** (kimya nedenleri, dostluk/sürtüşme, süre bekleyenler, sözler).
- Ölçüm: 12 maç aynı 5 oynatılınca kimya 78→89→79; 3. adam 12 maç kenarda kalınca moral 30 → kriz;
  söz verilip tutulmayınca moral 43→30, kimya 78→75.

### FAZ E — Draft gecesi + potansiyel tavanı/tabanı
- `prospectRange`: izci kalitesi bandı daraltır (0★ ~19 puan → 5★ ~2 puan). Tavan 99'a dayanınca band
  **kaydırılır**, daraltılmaz (izcisiz tahmin dar görünmesin).
- `prospectReport`: statlardan izci raporu ("ham yetenek · güçlü: pota koruma · gelişmeli: oyun kurma").
- `renderDraftBoard`: seçim sırası + canlı akan rakip seçimleri (0.62 sn arayla) + aday kurulu;
  kullanıcının sırası "SIRA SENDE" olarak vurgulanır, "Otomatik seç" ile kilitlenme olmaz.
- `showDraftSummary`: gece özeti + "Yeni sezona geç".
- Test: 20 takımlık draft uçtan uca (20/20 seçim), aday altyapıya katıldı, 0 konsol hatası.

### FAZ F — I18N (TR + EN tam kapsam)
- **Mimari kararı:** 1.300+ dize tek tek `t()` ile sarmak yerine **kaynak-dize anahtarlı** üç katman:
  (1) birebir sözlük, (2) ifade (regex) katmanı — çalışma anında birleştirilmiş metinler için,
  (3) **MutationObserver** ile üretilen tüm DOM metinlerinin anında çevrilmesi.
  Ek olarak `localizeCatalogs()` veri tablolarını (mevki/stat/rol/eğilim/set/kişilik/sakatlık/arena/
  koç/izci/spiker + **anlatım havuzları**) boot'ta YERİNDE çevirir — yüzlerce çağrı noktasına dokunulmadı.
- `js/i18n.js` (çekirdek), `js/i18n-dict.js` (~450 birebir + ~140 kalıp), `js/i18n-commentary.js`
  (272 spiker şablonu + ribaund/hamle havuzları + maç akışı kalıpları).
- `pickLine` çıktısı sözlükten geçer → fonksiyon içi anlatım havuzları da çevrilir.
- Dil seçici giriş ekranında ve Ayarlar'da; seçim localStorage'da, değişimde sayfa yeniden yüklenir
  (ilerleme korunur). İlk açılışta tarayıcı diline göre seçilir. Tarih/sayı biçimi ve çeyrek etiketi
  (TR 1P/U1 · EN Q1/OT1) dile bağlı.
- `tools/i18n-scan.js`: EN modunda tüm sayfaları, modalları ve canlı maçı gezip çevrilmemiş metin
  düğümlerini raporlar. Son durumda kalan Türkçe metin **yalnızca özel isimler** (kulüp ve oyuncu adları).

### Kararlar / gözlemler
- Kulüp ve oyuncu adları EN modunda da Türkçe/yerel kalır — bunlar özel isim; çevrilmeleri gerçekçiliği bozar.
- Sözlükte karşılığı olmayan her metin Türkçesiyle görünmeye devam eder: eksik çeviri asla hata üretmez.
- `\b` sözcük sınırı JS'te ASCII tabanlı; İ/Ç/Ş ile başlayan kalıplarda çalışmaz — bu kalıplarda sınır
  elle yazıldı (`(^|[\s(·•])`).
- Geniş tek-sözcük kalıpları (ör. `ribaund`→`reb`) Türkçe cümlelerin ortasını bozuyordu; kaldırıldı,
  yerine tam ifade kalıpları kullanıldı.

### Test edilmesi gerekenler (kullanıcı)
1. **Dil:** Giriş ekranında 🇬🇧 English'e bas → tüm arayüz + canlı maç anlatımı İngilizce olmalı; Ayarlar'dan
   🇹🇷 Türkçe'ye dönünce kayıt bozulmadan geri gelmeli.
2. **Roller:** Kadro kartlarında rol rozeti; oyuncuya tıkla → 5 eğilim çubuğu. Şutör rolündeki oyuncunun
   maçta daha çok üçlük denediğini gör.
3. **Playbook:** Maçlar → Taktik → aşağıda "Hücum seti" bölümü. Dip Köşe Üçlüsü seç, maçta üçlük sayısının
   arttığını gör. Kadro uyumu düşük bir set seçip farkı hisset.
4. **Maç içi müdahale:** Manuel Koçluk aç → Mola al → set değiştir; rakip koçun da mola aldığını,
   set değiştirdiğini ve oyuncu değiştirdiğini anlatımdan izle.
5. **Soyunma odası:** Bir yıldızı 3-4 maç oynatma → kriz modalı açılmalı. "Söz ver" seçip sonraki maçta
   yine oynatma → güvenin çöktüğünü gör. Kadro sayfasındaki Soyunma Odası panelini incele.
6. **Draft:** Sezonu bitir → draft gecesi kurulu açılmalı, rakipler tek tek seçmeli, sıra sana gelince
   taban/tavan ve izci raporuna göre seç.

### Yayın — GitHub Pages açıldı (30. oturum sonu)
- Depo **private** olduğu için Pages hiç kurulmamıştı (`has_pages:false`, site 404). Ücretsiz hesapta private depodan Pages yayınlanamadığı için kullanıcı onayıyla depo **public** yapıldı, ardından Pages `master` / kök kaynağıyla etkinleştirildi.
- Public yapmadan önce sır taraması yapıldı: çalışma ağacı ve **tüm git geçmişi** token/anahtar/özel anahtar kalıplarına karşı tarandı — temiz. (Not: commit yazarı e-postası geçmişte görünür, bu GitHub'da olağandır.)
- Doğrulama: tüm dosyalar 200 (HTML, 13 js modülü, portreler, manifest); canlı sürüm yerel HEAD ile aynı (`?v=37`); `tools/live-check.js` gerçek yayında kariyer kurdu, 11 sayfayı gezdi, playbook kurulunu (11 kart) açtı, canlı maç oynattı ve EN diline geçti — **0 konsol hatası, 0 kırık istek**.
- Yeni araç: `tools/live-check.js` — canlı yayını uçtan uca denetler (`LIVE_URL` ile başka adres de verilebilir).

---

## 31. Oturum — 2026-08-29 · BÜYÜK REVİZE PAKETİ (FAZ 5→1→2→3→4, oturum ortasında durduruldu)

Girdi: kullanıcının kanıt + kabul kriteri içeren revize paketi (`REVIZE-PAKETI.md`), çalışma
protokolü `DEVAM-ET.md`. Sıra: FAZ 5 (ölçüm) → 1 (senkron) → 2 (kimlik) → 3 (top) → 4 (denge).

### FAZ 5 — Ölçüm altyapısı (regresyon kalkanı)
- **`tools/live-metrics.js` (YENİ):** canlı maçı tarayıcıda izleyip 6 metriği ölçer — `syncRatio`
  (olay tipine göre maç saati / duvar saati), `orphanEvents` (anlatımsız olay), `ballTeleport`
  (kare başına >60 px top sıçraması), `identityMatch` (anlatımdaki oyuncu = topu tutan jeton),
  `tokenSpeedP99`, box-score. `--rate= --ms= --full --url= --json`. Hedefler tutmazsa çıkış kodu 1.
- **`tools/box-band.js` (YENİ):** N maçı animasyonsuz simüle edip takım başına box-score
  ortalamalarını gerçekçi bantlarla karşılaştırır. **Denge kararlarının tek yetkili aracı** —
  canlı ölçüm tek çeyreklik örnekle yanıltıcıydı.

**Kritik gözlem — enstrümanın kendisi hatalıydı.** Ölçüm aracında 5 ayrı kusur bulunup düzeltildi:
1. Kimlik referansı "topa en yakın jeton"du; isabetli şut satırı basılırken top POTADA olduğu için
   en yakın jeton şutör değil pota altındaki oyuncu çıkıyordu → referans motorun `_sim.ball.carrier`'ı
   yapıldı.
2. Taşıyıcı rAF ile bir kare geriden örnekleniyordu → satırın basıldığı anda canlı okunuyor.
3. Top havadayken (`mode==='pass'`) taşıyıcı null; referans artık pas HEDEFİ.
4. Jetonlar isim etiketine göre indeksleniyordu; oyuncu değişikliğinde etiket değişince sahte
   ışınlanma hızları üretiyordu (p99 3572 px/sn!) → DOM sırasına göre indeksleme.
5. `orphan` sayacı HTML etiketli metni ve serbest atışın iki parçalı basımını (`ftPre`/`ftRes`)
   hesaba katmıyordu.

**Sonuç:** Revize paketindeki "%87 anlatım-jeton uyuşmazlığı" rakamının büyük kısmı ölçüm kusuruymuş;
düzeltilmiş enstrümanla başlangıç değeri %61-79 bandındaydı ve gerçek kusurlar ayıklanınca %100'e çıktı.
**Ders: sayıyı kovalamadan önce enstrümanı doğrula.**

### FAZ 1 — Zaman senkronu
- **M1:** `runPossessionV(q,t,dt)` — pozisyonun tükettiği maç saati olaylara `ev.dt` olarak damgalanır
  (çeyrek ve uzatma döngülerinde hesaplanır).
- **M1+M2:** `matchStep` gecikmeyi artık `ev.dt`'den türetiyor: `dtMs=ev.dt*1000*MATCH_TIME_SCALE`,
  `delay=max(140, max(simMs,dtMs)/rate)`. Sabit 1300/1500/1700 ms taban yalnız ALT SINIR — faul/taktik/
  çalma gibi "ucuz" olaylar da saatten yedikleri kadar sürüyor (eskiden 20-44× hızlanıyordu).
- **M16:** varsayılan izleme hızı `1.5` → **`1`** (oyun kullanıcı hiçbir şey seçmeden %50 hızlı başlıyordu).
- **M10:** `visibilitychange` — sekme arka plandayken rAF durup `setTimeout` ilerlediği için anlatım
  satırları yutuluyordu; kuyruk artık duraklayıp dönüşte kalan süreyle sürüyor.
- **M11:** `setMatchRate` aktif zamanlayıcıyı iptal edip kalan süreyi yeni hıza göre yeniden kuruyor
  (3×→1× yapınca koreografi yarıda kesiliyordu).
- **M13:** set fazı aralıkları ~2,2 katına çıkarıldı, `sprintV` çarpanı 1.62→1.35, `keepNear:true`.

**Ölçüm:** jeton hızı p99 **332 → 274 px/sn** (hedef < 340) ✓ · p50 152 → ~20-40 (oyuncular yerlerine
oturuyor, sürekli titremiyor).

### FAZ 2 — Kimlik tutarlılığı (anlatımdaki oyuncu = sahadaki jeton)
- **M3:** `_flushPending(S)` — `clearBallTimers()` silmeden önce bekleyen `ball.onDone` ve `chase.fn`'i
  çalıştırıyor; flush sırasında top takipçiye veriliyor.
- **M4:** chase zaman aşımı artık **her modda** denetleniyor; mod uyuşmazlığında geri çağrı çağrılıp
  temizleniyor (pas bitince chase sessizce null'lanıyor, sayı sonrası topu sokacak oyuncu topu
  almadan çizgiye yürüyordu).
- **M7:** **rakip ilk 5 tek doğruluk kaynağı** — motor kullandığı `oppCourt`'u `events[0].oppFive`
  olarak damgalıyor, `startMatch` onu kullanıyor. Eskiden sahne "en iyi 5 OVR", motor "sakat filtreli 5"
  kuruyordu; rakipte tek sakat varsa `sid` sahada bulunamıyor ve şutu/serbest atışı en yakın jeton
  "üstleniyordu".
- **M8:** bot koç duyuruları (`sub`, `tactic`+`botCoach:true`) `movePlayersForEvent` başında kısa devre —
  `off:false` damgası yüzünden 10 jetonu ters yöne dizip topu rakip kurucusuna uçuruyorlardı.
- `reb` dalında spiker cümlesi topu ALMADAN ÖNCE basılıyordu → script adımının içine taşındı.
- Serbest atışta düdük anında top, atışı kullanacak oyuncuya veriliyor.

**Ölçüm:** identityMatch **%100** (29 eşleşen / 0 uyuşmayan), orphanEvents 0.

### FAZ 3 — Top fiziği
- **M6:** `_ballHold` uzun mesafeyi 0,30 sn'lik "pas"a sıkıştırıyordu (≈40 m/sn ışınlanma) →
  `min(0.90, d/520)`.
- **M5:** `_inboundPass` topu dip çizgiye ışınlıyordu ("görünmez düzeltme" yorumuna rağmen 150-250 px) →
  uzaksa görünür toparlama pası, sokma pası `onDone`'da. Şut öncesi `bridge` adımı da sabit 0,22 sn
  yerine `min(0.55, d/520)`.

**Ölçüm:** ışınlanma 5 kare → **1-2 kare**, en büyük sıçrama 777 px → ~130 px. Hedef 0'a ulaşılmadı.

### FAZ 4 — Denge (200 maçlık bant testi, **tüm bantlar tuttu**)
- **M17 top kaybı ekonomisi:** ölçümde takım başına 3,3 idi (gerçekçi 9-15) — basketbolun temel
  istatistiği fiilen yoktu, pres/çalma taktikleri ve playbook `to` parametresi anlamsızdı. Pozisyon
  dağılımı yeniden bölündü (`roll<0.745` şut · `<0.805` şut faulü · `<0.985` karma · kalan renk);
  karma dalda faul %34,5 / top kaybı %65,5. Top kaybı **türlere** ayrıldı: çalma %55 (savunmacıya
  `stl`), pas hatası %31, adım/çift top/hücum faulü %14 (bunun %34'ü faul hanesine de yazılır).
  Kaybeden oyuncu `topSurme` statına göre ağırlıklı seçiliyor; anlatım hem kaybedeni hem topu alanı
  söylüyor (sahneyle tutarlı).
- **M18 serbest atış enflasyonu:** sayıların %24'ü çizgidendi (gerçekçi %12-20). and-1 %12→%8,5 ·
  kaçan turnikede faul %15→%9,5 · üçlükte faul %8→%5 · şut faulü pozisyon payı %10→%6.
- **M19 ribaund:** `ftRebound()` — kaçan SON serbest atış canlı toptur (hücum ribaundu %19, mücadelede
  %9 sarkma faulü); 5 serbest atış bloğuna bağlandı.
- **Skor bandı telafisi:** `playsMax` 48→54 (hızlı 62 / yavaş 46), isabet 0.505→0.545 (2sy) ve
  0.355→0.372 (3sy); rakip tarafı simetrik.

| Metrik (takım/maç) | ÖNCE | SONRA | Bant |
|---|---|---|---|
| Sayı | 92,4 | 84,0 | 82-100 ✓ |
| Top kaybı | **3,3** | **9,6** | 9-15 ✓ |
| Serbest atış denemesi | 29,5 | 17,9 | 14-26 ✓ |
| Sayıların FT payı | 0,241 | 0,162 | 0,12-0,20 ✓ |
| Ribaund | 29,5 | 31,0 | 30-46 ✓ |
| Asist | 19,0 | 18,8 | 16-28 ✓ |
| Faul | 16,9 | 14,9 | 14-24 ✓ |
| Saha içi şut denemesi | 64,3 | 60,4 | 60-85 ✓ |
| Üçlük deneme payı | 0,351 | 0,344 | 0,22-0,44 ✓ |
| Blok | 2,9 | 2,8 | 1,5-6,5 ✓ |
| Top çalma | 3,3 | 5,3 | 4-12 ✓ |

### AÇIK REGRESYON (oturum bu noktada durduruldu)
`orphanEvents` 1 kalmıştı; kaynağı şutlu olaylarda spiker cümlesinin `onResult` ile koreografi
script'inin sonunda basılması, sıradaki olay erken gelince `clearBallTimers()`'ın script'i
çalıştırmadan silmesiydi. `S.pendingPaint` eklenip flush'ta bastırıldı → **orphan 0 oldu ama
identityMatch %100 → %64 düştü** (cümle top çembere varmadan, sıradaki pozisyon başlarken basılıyor).
Yani "hiç basılmama" sorunu "yanlış anda basılma"ya dönüştü. Ayrıntı ve önerilen çözüm:
`KALDIGIM-YER.md`.

### Kararlar / gözlemler
- Denge yargısı **`box-band.js`'e** ait; `live-metrics.js` box değerlerini yalnız bilgi olarak
  raporluyor (tek çeyreklik canlı örnek yanıltıcıydı).
- Pozisyon sayısını `playsMax` değil **maç saati** sınırlıyor (600 sn / ~15 sn ≈ 40 pozisyon/çeyrek);
  top kaybı/faul/şut bantları bu sabit bütçe içinde birbiriyle takas ediliyor.
- Bu oturumda `visual-check.js` ve `i18n-scan.js` FAZ 1-4 sonrası **çalıştırılmadı**; yeni top kaybı
  anlatım satırlarının İngilizce karşılıkları `js/i18n-dict.js`'e **eklenmedi**.

---

## 32. Oturum — 2026-08-29 · REGRESYON KAPANIŞI + FAZ 7 (maç dışı modüller, TAMAMI)

Giriş: 31. oturum açık bir regresyonla durdurulmuştu (`KALDIGIM-YER.md`). Bu oturumda önce o
kapatıldı, ertelenen doğrulama borçları ödendi, sonra kullanıcının yeni talep belgesi
`REVIZE-PAKETI-FAZ7.md` (30 madde, maç dışı modüller) **baştan sona** uygulandı.

### 1) Açık regresyon kapatıldı — orphan 0 **ve** kimlik %100 aynı anda

Kök neden 31. oturumda yanlış teşhis edilmişti. `animateShotPossession` içinde
`S.pendingPaint=_res` **`clearBallTimers()`'tan ÖNCE** kuruluyordu; hemen ardından gelen o
`clearBallTimers()` çağrısı `_flushPending` üzerinden `_res`'i **anında çalıştırıyordu**.
Yani şut sonuç cümlesi pozisyonun **başında** basılıyordu — kimlik %64'ün sebebi buydu.

- `match-engine.js`: `pendingPaint` ataması `clearBallTimers()`'tan **sonraya** alındı.
- `main.js`: `stepGuarded()` — şutlu olaylarda sıradaki olaya geçmeden önce sonuç cümlesinin
  basılmasını sınırlı süre (delay + 0,6-2,2 sn) bekler. Kare düşmesi/arka plan yüzünden
  koreografi tahmini süreden geç bitse de cümle ne kaybolur ne de erken basılır.
  `setMatchRate` ve `visibilitychange` de bu sarmalayıcıyı kullanır (kilitlenme yok).

**Ölçüm kusuru (yine):** `orphan 1` kalıntısının kaynağı motorda değil enstrümandaydı —
`mState.idx` ilerlemiş olsa da son pozisyonun koreografisi ölçüm kesildiğinde bitmemiş
oluyordu. `live-metrics.js` artık son olayı orphan sayımından hariç tutuyor ve pencere
sonunda 1,5 sn drenaj bekliyor. **İkinci kez ders: sayıyı kovalamadan önce enstrümanı doğrula.**

### 2) FAZ 3 kapandı — top ışınlanması 0 kare

Sıçrama kaynağını bulmak için enstrümana teşhis eklendi (sıçrama anındaki top modu + olay tipi).
İki gerçek kusur çıktı:
- `fire()` topu şut noktasına **doğrudan atıyordu** (`b.x=sh.x`). Artık `bridge` topu taşır
  (tFire-0,62'ye alındı); kalan fark >40 px ise şut topun **gerçek** konumundan çıkar.
- Serbest atışlar arasında `b.mode='held'; b.carrier=shooter` **doğrudan atanıyordu** →
  top çemberden çizgiye ~135 px ışınlanıyordu. Artık `_ballHold` ile görünür kısa pas.

| Metrik | 31. oturum sonu | 32. oturum sonu | Hedef |
|---|---|---|---|
| orphanEvents | 1 (ya da kimlik %64) | **0** | 0 |
| identityMatch | %64 | **%100** | >= %95 |
| ballTeleport | 1-2 kare (777 → 130 px) | **0 kare** (en büyük 32-41 px) | 0 |
| tokenSpeed p99 | 274 | 266-273 px/sn | < 340 |

### 3) Ertelenen doğrulama borçları ödendi
- `visual-check.js` masaüstü + mobil: **0 konsol hatası** (FAZ 1-4 sonrası hiç çalıştırılmamıştı).
- M17 top kaybı satırlarının İngilizce karşılıkları `i18n-commentary.js`'e eklendi (8 ifade
  kalıbı; baştaki isim korunur, cümle ortasındaki ikinci isim yakalanır).
- `i18n-scan.js`'te iki karma metin bulundu: genel kalıplar (`grubun`, `hedefi:`) daha özel
  cümleleri yarıda çeviriyordu ("Senin group:", "Başkanın goal:"). Üç kalıp en öne alındı,
  sıra eki (14th place) doğru üretiliyor.

### 4) FAZ 7 — maç dışı modüller (30 maddenin tamamı)

**A · Veri kaybı (Steam engelleyici)**
- **F7-1** `ensureLeagueSeasonOrStart` playoff/draft durumuna hiç bakmıyordu: playoff ortasında
  sayfa yenilenince `startLeagueSeason()` çalışıp bracket + draft siliniyor, oyuncular
  yaşlanıyor, sözleşmeler eksiliyordu. İki erken çıkış + yarım playoffta lig sayfasına yönlendirme.
- **F7-2 / F7-9** Açılışta IndexedDB'ye **yalnızca localStorage tamamen boşsa** bakılıyordu.
  Kota dolduktan sonra LS bayat kalıp IDB güncelleniyor → **bayat kayıt kazanıyordu**; ayrıca
  desteklenmeyen sürümlü LS, sağlam IDB yedeğini gizliyordu. Artık iki kaynak da okunur,
  `savedAt` karşılaştırılır, yeni olan seçilir.
- **F7-3** `clearSavedGame` IDB kopyasını silmiyordu → silinen kariyer sonraki açılışta geri
  geliyordu. `idbDeleteString()` eklendi.
- **F7-4** `_lastSavedFingerprint` `try`'dan **önce** güncelleniyordu: yazma hata verse bile
  "kaydedildi" sayılıyor ve durum değişmediği sürece bir daha denenmiyordu. Artık yalnız
  başarılı yazmadan sonra güncellenir, hatada sıfırlanır, iki depo da başarısızsa kritik uyarı.

**B · Denge ve istismar**
- **F7-5** Taktik modalında "İlk 5 seç"e basınca kaydedilmemiş tempo/odak/savunma seçimleri
  siliniyordu (modal `innerHTML` değişiyor). `_captureTacticInputs()` taslağı saklar,
  `saveLineup`/`resetLineup` taktik formuna geri döner.
- **F7-6** `G.arena` varsayılanı `ecoRound(45)=938` idi; `ARENA_LVL.bk` ham KR olduğu için
  **seviye 1 arena, seviye 4'ten (800) pahalı** bakım ödüyor, yükseltince bakım **düşüyordu**.
- **F7-7 (istismar)** `if(!G.coaches.length) G.coaches=genCoaches()` — tüm koçları kov + sayfayı
  yenile = 3 bedava koç; beğenmezsen tekrar kov + yenile ile **seviye 5 reroll**. Artık alan
  kaydın kendisinde yoksa üretilir (`coachMarket`, `scoutMarket` dahil).
- **F7-8** `createTeam` kalıcı alanların çoğunu sıfırlamıyordu: yeni kariyer eskisinin Mega
  Arena'sı, Elit Akademi'si, kulüp rekorları, `pendingMatch` kilidi ve geçersiz `lineup`
  id'leriyle başlıyordu. 20 alan eklendi.

**Erişim / mobil / Steam**
- **F7-11 (Steam engelleyici)** Tek font kaynağı Google Fonts idi; depodaki `css2` hiçbir
  yerden referans edilmiyor ve hâlâ `fonts.gstatic.com`'a bakıyordu. 4 `.woff2` indirildi
  (`assets/fonts/`), `<link>` kaldırıldı, yerel `@font-face` yazıldı, yedek yığın genişletildi
  (`'Arial Narrow','Helvetica Neue Condensed',Impact`), `.scoreboard` `flex-wrap` aldı.
- **F7-10** `.lu-card{touch-action:none}` yüzünden yedek listesi mobilde **kaydırılamıyordu**
  (dokunmak sürükleme başlatıyordu). Kart `pan-y`, sürükleme ayrı bir tutamağa (`.lu-grip`).
- **F7-12** Turuncu zeminde beyaz yazı **2,80:1** (7 kural) → `#1a1002` ~ 7,4:1.
- **F7-13** `.menu-btn` ~20x24px idi (mobilde sidebar'ın tek girişi) → 44x44.
- **F7-24 / F7-25** Mobilde 44px dokunma hedefleri; genel `:focus-visible` kuralı;
  `role="button"` öğeleri artık Space'e de yanıt veriyor.
- **F7-30** Lig tablosu mobilde iç içe iki eksenli kaydırıcıydı → `min-width` 520px, +/-
  sütunları gizli, dikey kaydırma sayfaya bırakıldı. Portrelere `alt=""`. `svgLineChart`
  tüm değerler eşitken çizgiyi tabana yapıştırmıyor.

**C · Sağlamlık ve performans**
- **F7-14** `applyGameState` try/catch'sizdi; bozuk kayıt `G`'yi **yarı yüklenmiş** bırakıp
  oyunu boş ekranda kilitliyordu. Anlık görüntü alınır, hata olursa geri sarılır, kullanıcıya
  "dışa aktar / sil" yönlendirmesi verilir.
- **F7-15** Çok sekmede `storage` olayı canlı maçı bozuyordu: `applyGameState` `G.players`'ı
  yeniden kurarken `mState` eski referansları tutuyor, maç içi enerji/faul/değişiklik
  güncellemeleri **yetim nesnelere** yazılıp maç sonunda kayboluyordu.
- **F7-16** `_crisisPid`/`_crisisDay` kayda girdi (aynı soyunma odası krizi tekrar açılıyordu);
  biten draft de saklanıyor (özet ekranı erişilebilir).
- **F7-17** Kayıt sürümü **v6**; `migrateV5ToV6` normalizasyonu. `ensureRoles` çağrısı seed
  doldurma bloğundan **sonraya** alındı (seed'siz oyuncularda eğilimler bir kez zıplıyordu).
- **F7-18** `charazayRunLayoutCalibration` her navigasyonda yazma+okuma karıştırıp zorunlu
  senkron layout tetikliyor, 11 DOM sorgusu yapıp `localStorage`'a yazıyordu. Bu bir
  mentor-panel geliştirme aracı → yalnız `CHARAZAY_DEBUG` modunda.
- **F7-19** İlk 5 düzenleyicide her yerleştirmede **tüm modal** yeniden kuruluyordu (kaydırma
  konumu her hamlede en üste sıçrıyordu) → `refreshLineupEditor()` yalnız iki kabı günceller.
- **F7-20** `getBotClubProfile` her çağrıda ~300 KB JSON ayrıştırıyordu; `buildSeasonPlayerPool`
  bunu 19 akran takım için art arda çağırıyor (~6 MB / kare). Okuma bellek önbelleğinden;
  yazma senkron kalır (aynı anahtara `economy.js` ve `match-prep.js` de yazıyor) ve o iki
  nokta önbelleği geçersiz kılar.
- **F7-21** Eşit puanda `h2h` **geçişsiz** karşılaştırıcı üretiyordu (A>B, B>C, C>A tek devreli
  ligde olağan; `Array.sort` standart dışı sonuç verir). h2h artık yalnız eşit puanlı grup
  **tam iki takımken** uygulanır, sonra averaj → attığı sayı. Puanı `'—'` olan satırlar gerçek
  0 puanlılarla karışmıyor.
- **F7-22** Modalda Escape ve odak yönetimi yoktu → `role="dialog"`/`aria-modal`, odaklanabilir
  sheet, Escape ile kapanma, odağın açan öğeye dönmesi.
- **F7-23** Analiz sayfasında oyuncu seçince tüm gövde yeniden basılıp `<select>` odağı
  kayboluyordu → yalnız `#analiticPlayerBody` güncelleniyor.
- **F7-26** `escMatch` `>` ve `'` kaçırmıyordu (ikinci savunma katmanı tamamlandı).
- **F7-27** Bireysel antrenman `refreshRole` çağırmıyordu (maç motoru bayat eğilimlerle
  çalışıyordu); takım antrenmanındaki çift çağrının biri silindi.
- **F7-28** `localStorage` engelliyse `getTblState` **her çağrıda** 26 grup x 20 takım yeniden
  üretiyordu → lig rakiplerinin adları her render'da değişiyordu. Bellek önbelleği + depolama
  kapalıysa tek seferlik kritik uyarı.
- **F7-29** `saveMatchTactics` doğrulama yapmıyordu: modal kapalıyken çağrılırsa `G.tactics`
  **varsayılana eziliyor** ve "kaydedildi" bildirimi çıkıyordu. Odak oyuncusu artık kadroda ve
  sağlıklı olmalı.

**Bu oturumda üretilen bir regresyon da yakalandı:** F7-8'de eklenen `G.posTraining={}` boş
nesne truthy olduğu için Antrenman sayfasında "undefined gün kaldı" kartı basılıyordu →
`null` + render tarafında guard. `i18n-scan.js` bunu tarama çıktısında ortaya çıkardı
(çeviri aracı bir mantık hatasını buldu).

### Doğrulama (oturum sonu)
- `node --check`: değişen tüm modüller ✓
- `tools/visual-check.js`: masaüstü 1440x900 + mobil 390x844, **0 konsol hatası**, 15 adımlık akış
- `tools/live-metrics.js`: **tüm hedefler tuttu** — orphan 0 · kimlik %100 · ışınlanma 0 kare ·
  syncRatio medyan 2,3-3,0x · jeton p99 266-273 px/sn
- `tools/box-band.js --n=200`: **11 bandın tamamı tuttu** (sayı 85,0 · top kaybı 9,3 ·
  FT payı 0,166 · ribaund 31,3 · asist 19,0 · faul 15,1 · çalma 5,1)
- `tools/i18n-scan.js`: kalan Türkçe **yalnızca özel isim**

### Kararlar / gözlemler
- **Enstrüman iki kez yanılttı** (31. oturumda kimlik ölçümü, bu oturumda orphan sayımı).
  Bir metrik hedefi tutmuyorsa önce ölçüm yolunu doğrula; teşhis aracına bağlam (top modu,
  olay tipi) eklemek sıçrama kaynağını tek denemede buldu.
- Kayıt katmanındaki dört veri kaybı maddesinin ortak deseni: **başarısızlık sessizdi.** Kota
  hatası, silinmemiş IDB kopyası, yarım uygulanmış durum — hiçbiri kullanıcıya bildirilmiyordu.
- `js/league.js` CRLF, diğer modüller LF satır sonu kullanıyor; toplu düzenlemede satır sonu
  otomatik tespit edilmeli.

### 32. oturum — EK: FAZ 7 kabul kriterlerinin fiilen doğrulanması

FAZ 7 maddeleri uygulandıktan sonra belgenin sonundaki **8 kabul kriteri hiç çalıştırılmamıştı**;
"kodu yazdım" ile "kriter geçiyor" aynı şey değil. Bunun için yeni bir araç yazıldı:

**`tools/faz7-check.js` (YENİ)** — kriterleri gerçek tarayıcıda, gerçek senaryoyla sınar:

| Kod | Kriter | Nasıl sınanıyor |
|---|---|---|
| K1 | Playoff ortasında yenile → bracket korunuyor | Sezon bitmiş + playoff kurulmuş duruma getirilir, kaydedilir, sayfa yenilenir, seri skoru ve sezon yılı karşılaştırılır |
| K2 | Kota dolu → en güncel kayıt geliyor | LS'e **bayat** (savedAt −1 saat), IDB'ye **güncel** kayıt yazılır; açılışta hangisinin kazandığı `coins` ile ölçülür |
| K3 | "Kaydı sil" → "Devam et" bloğu yok | LS + IDB kopyası kurulur, `clearSavedGame()` çağrılır, sayfa yenilenir; blok görünürlüğü + iki deponun içeriği denetlenir |
| K4 | Yeni oyun → arena bakımı 150 KR | `G.arena.bk` ile `ARENA_LVL[0].bk` karşılaştırılır |
| K5 | Koçları kov + yenile → geri gelmiyor | `G.coaches=[]` kaydedilir, yeniden yüklenir, sayı 0 mı bakılır |
| K6 | İnternetsiz → fontlar yerel, tabela taşmıyor | `ctx.route` ile **127.0.0.1 dışındaki tüm ağ kesilir**; `document.fonts` yüklü aileleri + `.scoreboard` taşması ölçülür |
| K7 | 390×844 İlk 5 → tüm yedeklere erişim | `touch-action` değerleri, tutamağın varlığı, listenin kaydırılabilirliği ve en alta kaydırınca son kartın görünürlüğü |
| K8 | `visual-check` çıkış kodu 0 | Ayrı çalıştırılır |

**Test iki gerçek kusur buldu — ikisi de "uyguladım" dediğim maddelerdeydi:**

- **K3 DÜŞTÜ.** `clearSavedGame` IDB'yi siliyordu (F7-3 doğru uygulanmıştı) **ama silme kalıcı
  değildi**: sayfa kapanırken `beforeunload → saveGameNow(false)` ve bekleyen otomatik kayıt
  zamanlayıcısı kaydı hemen geri yazıyordu. Kullanıcı "sildim" dediği hâlde sonraki açılışta
  "Devam et" bloğu geliyordu. Düzeltme: `suppressAutoSave()` bayrağı — `clearSavedGame`
  bastırmayı açar ve bekleyen zamanlayıcıyı iptal eder; bilinçli işlemler (elle "Kaydet",
  yeni kariyer, kayıt yükleme, içe aktarma) bastırmayı kaldırır.
- **K2 DÜŞTÜ** — bu testin kendi kusuruydu: `beforeunload` hazırlanan bayat LS kaydını güncel
  durumla eziyordu, dolayısıyla karşılaştırma anlamsızlaşıyordu. Test düzeltildi.

**Eksik kalan alt maddeler de tamamlandı:**
- **F7-8 belgenin önerdiği sağlam yola çevrildi:** `DEFAULT_G` + `defaultGameState()`.
  `createTeam` artık elle yazılmış alan listesi yerine varsayılan durumun derin kopyasını
  uyguluyor. Elle liste kırılgandı — nitekim önceki turda `posTraining={}` unutulup
  "undefined gün kaldı" regresyonu çıkmıştı. Tek kaynak artık literalin kendisi.
- **F7-16c** `ligTeams` alan-alan değil olduğu gibi kaydediliyor.
- **F7-22** `.modal-backdrop{overscroll-behavior:contain}`.
- **F7-26 ikinci yarı:** `innerHTML`'e giden 11 şablonda ham `${G.team.isim}` `escMatch` ile
  sarıldı. `sanitizeTeamName` bugün `[<>&"'\`]` sildiği için **davranış değişmiyor** — bu
  yalnızca sanitize katmanı ileride atlanırsa devreye girecek ikinci katman. `showNotif`
  çağrılarına dokunulmadı (`textContent` kullanıyor; kaçış dizileri görünür olurdu).
- **F7-30b** kulüp logosuna `alt="<takım> logosu"`.
- **NOT EDİLEN madde:** `fixtureFullSeasonGridHtml` tek yerde indeks erişimi yapıyordu →
  `.find(x=>x.seasonMatchIx===ix)` ile değiştirildi (ileride bir `sort` eklenirse yanlış maç
  kartı gösterecekti).

**Enstrüman notu:** `live-metrics.js` bir çalıştırmada `syncRatio` yayılımını 1,92× (hedef <1,9)
verip düştü; aynı derleme `--ms=200000` ile **1,03×** verdi. Fark gerçek değil, tip başına
3-4 örnekten gelen gürültüydü. Araç artık her tipin **örnek sayısını** yazıyor ve örnek azsa
uyarıyor — hedef gevşetilmedi, okunabilirlik arttı.

**Sonuç:** `faz7-check` **7/7** · `visual-check` çıkış kodu **0** · `live-metrics` tüm hedefler
(orphan 0 · kimlik %100 · ışınlanma 0 kare · yayılım 1,03× @200 sn) · `box-band --n=200` **11/11
bant** · `i18n-scan` kalan Türkçe yalnız özel isim.

**Ders:** Bu oturumda hem 31. oturumun teşhisi hem de kendi "uyguladım" beyanım test karşısında
düzeltildi. Kabul kriteri varsa çalıştırılabilir hâle getirilmeli; okuyarak onaylamak yetmiyor.

### 32. oturum — EK 2: a11y sürükleme hatası + M9 / M12 / M14

#### a11y-big (zoom 1.18) sürükleme hayaleti kayması
Kullanıcının ölçümü: zoom kapalı sapma 0 px, açık **147 px**; `style.top`'a yazılan `clientY`
zoom ile çarpılıyor (669 × 1,18 − 32 = 757, ölçülen 757). `elementFromPoint` doğru çalışıyor.

`_luPositionGhost` (`league.js`) — `position:fixed` hayaletin `left/top` değerleri zoom'lu
kök içinde ölçekleniyor, pointer'ın `clientX/clientY`'si ölçeklenmiyordu. Koordinatlar
`_uiZoom()` faktörüne bölünüyor; bırakma hedefi zaten doğru olduğu için yalnız çizim düzeltildi.

**`tools/faz7-check.js` K9 eklendi** — sapmayı zoom kapalı ve açık ölçüp karşılaştırır.
Testin gerçekten bu hatayı yakaladığı, düzeltme geçici olarak geri alınarak kanıtlandı:

| | zoom kapalı | zoom açık | K9 |
|---|---|---|---|
| düzeltmesiz | 0 px | **172 px** | DÜŞÜYOR |
| düzeltmeli | 0 px | **0 px** | GEÇİYOR |

#### M9 — Ribaund sonrası çıkış (outlet) pası
Uzun (PF/C) topu alınca guard'a çıkarıyor; `bringT` artık topu getirenin **gerçekten gittiği**
kulvara (`TRANS_OFF[pg.role]`) göre hesaplanıyor — eskiden her zaman `TRANS_OFF[0]` alınıyor,
pivot topu getirdiğinde gitmediği bir noktaya göre süre biçiliyordu.

**İlk denemem sessizce yanlıştı.** Outlet kararını `pg===shooter` düzeltmesinden *sonra*
veriyordum: uzun hem ribaundu alıp hem şutu atacaksa `pg` guard'a çevriliyor, top yine uzunda
kalıyor ve çıkış pası **hiç kurulmuyordu**. Ölçümde %71'de takıldı; sıra düzeltilince
**126/126 pozisyon (%100)**. Bu, "uyguladım" demenin yetmediğinin bu oturumdaki üçüncü örneği.

#### M12 — AND-1 ek serbest atışı
Şut nesnesi `and1` bilgisini taşıyor; `_and1Sequence()` şutörü çizgiye gönderip tek atış
yaptırıyor. Anlatım cümlesi ("AND-1 tamam!" / "ek atış kaçtı.") sonucu söylediği için atışın
sonucuyla **aynı karede** basılıyor. Eskiden tabela 3 artarken çizgide kimse yoktu.

#### M14 — Şut saati
Hücum ribaundunda 24 yerine **14** (FIBA). Hücum sahibi artık `mState._lastOff` yerine
**olayın kendisinden** (`_eventOff`) türetiliyor — `_lastOff`, `_startBreak`/`_setupInbound`
tarafından animasyon ortasında asenkron değiştiği için sıfırlama güvenilmezdi. Limit aşılırsa
gösterge boşalmak yerine sıfırlanıp devam ediyor (`reb` olayı her hücum ribaundunda
üretilmediği için saat bazen hiç sıfırlanmıyor, `left` negatife düşüp gösterge kayboluyordu).

#### YENİ ARAÇ — `tools/sunum-check.js`
Bu üç madde maç sonucunu değiştirmediği için `band.js`/`box-band.js` onları **göremez**;
davranış yalnız canlı sahnede gözlenebilir. Araç taşıyıcı rol zincirini, motorun outlet
kararını (`S._dbgOutlet` damgası), and-1 sahne çağrısını (fonksiyon sarmalayıcı sayacı) ve
şut saati limitini ölçer. **M9 kusurunu bu araç buldu.**

Ölçüm sırasında testin kendi varsayımları da iki kez düzeltildi: (a) ikinci şans (putback)
şutunda outlet tasarımca yoktur, (b) ribaundu her zaman şutlu pozisyon izlemez — araya top
kaybı/faul girerse hücum hiç kurulmaz. Bu vakalar artık kapsam dışı sayılıyor.

#### ARAÇ KUSURU — `tools/band.js` tohumu hiç kurmuyormuş
`if (SEED)` koruması + varsayılan `SEED = 0` → `if(0)` **falsy**, yani tohum hiç uygulanmıyordu.
Araç başlıkta "seed=0" yazdığı hâlde her çalıştırmada farklı hash üretiyordu:

```
aynı kod, iki çalıştırma:  73668a37f7b205bb  /  018df729cb9da13c
```

Yani `CLAUDE.md`'nin *"sunum değişikliklerinden sonra ikisi de aynı hash'i vermeli"* güvencesi
**fiilen hiç çalışmıyordu**. Varsayılan tohum `measure.js` ile aynı (987654321) yapıldı ve
uygulama koşulsuz hâle getirildi. Artık aynı kod aynı hash'i veriyor — ve bu sayede M9/M12/M14
öncesi/sonrası karşılaştırması yapılabildi: **`e429f6c091168315` (değişmedi)**.

#### Doğrulama (oturum sonu)
- `sunum-check`: M9 %100 · M12 5/5 · M14 3/3 ✓
- `band.js`: M9/M12/M14 **öncesi ve sonrası aynı hash** — sonuçlar değişmedi
- `box-band --n=200`: 11/11 bant · `visual-check`: 0 hata · `faz7-check`: **8/8**
- `live-metrics`: orphan 0 · kimlik %100 · ışınlanma 0 kare

**Ders (bu oturumda üç kez tekrarlandı):** ölçmediğin düzeltme çalışmıyor olabilir. 31. oturumun
teşhisi, kendi FAZ 7 "uyguladım" beyanım ve M9'un ilk hâli — üçü de test karşısında düzeltildi.
Ayrıca iki ölçüm aracı (orphan sayacı, band.js tohumu) sessizce yanlış sonuç veriyordu.

### 32. oturum — EK 3: M20 / A1 rakip kadro kalıcılığı

M20'nin talebi: *"Lig takımlarına kalıcı kadro nesnesi ver; maç istatistiği, bireysel faul,
sakatlık ve yorgunluk **iki taraf için de aynı kod yolundan** geçsin."*

#### Mevcut durum incelemesi (neyin zaten var olduğu)
Kod okununca kalıcılığın bir kısmı zaten vardı: kulüp önbelleği (`CLUB_CACHE_KEY`) kadroyu
saklıyor, `rollInjuriesForBotClub` sakatlık işliyor, `p.matchFouls` + `oBenchNext` bireysel
faul limitini uyguluyor, `ostats`/`bumpO` maç istatistiği topluyor, MVP iki taraftan seçiliyor.

#### En önemli bulgu — rakip şut isabeti SABİTTİ
```js
const oppAcc = (is3 ? (0.366+botPb.acc3)*defOppAcc3Mul
                    : (0.534+botPb.acc2)*defOppAcc2Mul) * oMul * markMul;
```
Rakip oyuncunun **statı, enerjisi, morali, clutch'ı motorda hiç kullanılmıyordu**. Kadro nesnesi
kalıcıydı ama motor onu soyut işliyordu — A1'in "rakip takımlar soyut" tespitinin teknik karşılığı
tam olarak buydu. Artık iki taraf da `shooterAcc()`'ten geçiyor (takım çarpanı ve pozisyon uyumu
kullanıcıya özel kalır; bot tarafında kendi çarpanı base'e katılır). Serbest atışlar da aynı
yoldan: rakip sabit %72-74 yerine kendi `serbest` statından atıyor.

| Rakip kadro | Ortalama rakip skoru |
|---|---|
| tüm statlar 40 | **69** |
| tüm statlar 95 | **92** |
| fark | **23 sayı** (eskiden ≈ 0) |

#### Diğer değişiklikler
- **Kadro derinliği 7 → 10** (`league.js`). Yeni oyuncular dizinin **sonuna** eklenir; mevcut
  `id`/`seed` değerleri korunur, eski kayıtlar `botClubEnsureDepth` ile tamamlanır ve eksik
  alanlar (`enerji`, `sezon`) geriye dönük doldurulur.
- **Kalıcı durum fonksiyonları** (`match-prep.js`): `withBotClubRoster`,
  `mergeBotClubMatchStats`, `recoverBotClubEnergy`, `ageBotClubRoster`, `ageAllPeerClubs`.
  Rakip kadro artık `p.sezon` ve `p.enerji` biriktiriyor — kullanıcı tarafıyla **aynı alanlar**.
- **Maç sonu bağlantısı** (`match-engine.js`): `end` olayı `oplayers` + `oppPlayedIds` taşıyor;
  maç sonrası rakip kadroya sezon istatistiği ve yorgunluk işleniyor, geçen gün kadar toparlanma
  uygulanıyor. Playoff maçlarında da aynı yol.
- **Sezon geçişi**: bot kadrolar da yaşlanıyor/gelişiyor, sezon istatistiği sıfırlanıyor.
  Kalıcı kadronun anlamı budur — eskiden bot oyuncular sonsuza dek aynı yaşta/statta kalıyordu.
- **İlk 5 seçimi** artık OVR + güncel enerjiye bakıyor (yorgun oyuncu geri düşer, yedeği başlar).
- **Sezon ödülleri**: rakip için gerçek maç verisi kullanılıyor. Ama bot oyuncu yalnız kullanıcıyla
  oynadığı maçlarda veri topluyor (tek devrede ~1 maç) ve ödül karşılaştırması **toplam** üzerinden
  yapılıyor — ham veriyi koymak rakipleri yarıştan tümüyle düşürürdü. Bu yüzden gerçek veri maç
  başına indirgenip sezona ölçekleniyor ve örnek azken sentetikle harmanlanıyor (6+ maçta tamamen
  gerçeğe döner). Tek maçlık uç performans sezonu domine etmesin diye.

#### Kenar durum — ölçüm buldu
Top **çeyrek sonunda orta sahaya ışınlanıyordu** (`b.x=COURT_MID` doğrudan atama; ölçüm 245 px
tek kare sıçrama, mod `loose`). FAZ 3'ün kaçırdığı bir nokta; artık görünür şekilde taşınıyor.
`ballTeleport` 1 → **0 kare**.

#### YENİ ARAÇ — `tools/m20-check.js`
Kalıcılık tek maçta görülmez. Araç 5 maç oynatıyor (biri **aynı rakiple tekrar**) ve kulüp
önbelleğindeki kadro nesnesinin üzerinde durum birikip birikmediğini ölçüyor:
T1 kimlik · T2 derinlik · T3 sezon istatistiği · T4 yorgunluk + toparlanma · T5 isabet yolu ·
T6 sakatlık.

İlk çalıştırmada **T1/T3/T4 düştü — testin kusuruydu**: her maç farklı rakiple oynanıyor ve
kadro maçtan önce henüz oluşmadığı için "öncesi" `null` kalıyor, karşılaştırma hiç yapılamıyordu.
Düzeltildikten sonra 6/6.

#### Doğrulama
- `m20-check`: **6/6** (T3: 50 oyuncunun maç sayacı arttı, 466 sayı birikti · T4: 29 oyuncunun
  enerjisi düştü, 3 günde toparlandı · T6: 40 günde 35 turda sakat oyuncu görüldü)
- `box-band --n=200`: **11/11 bant** · `visual-check`: 0 hata · `faz7-check`: 8/8
- `sunum-check`: M9/M12/M14 geçti · `live-metrics`: orphan 0 · kimlik %100 · **ışınlanma 0 kare**
- `i18n-scan`: kalan Türkçe yalnız özel isim

**`band.js` hash DEĞİŞTİ** (`e429f6c091168315` → **`dc984289dee3c29d`**). Bu beklenen: M20 sunum
değil **mekanik** bir değişiklik. Rakip ortalaması 71,9 → 73,9; kullanıcı 92,1 → 92,6; tüm denge
bantları tutuyor. Yeni hash bundan sonraki sunum değişiklikleri için referanstır.

### 32. oturum — EK 4: FAZ 8 (oynanış testi paketi, 14 madde + 8 kabul kriteri)

Girdi: `REVIZE-PAKETI-FAZ8.md` — kod denetimi değil, **oyunu oynayarak** yapılmış gözlemler.

#### F8-2 · Piyasa dengesi (paketin en büyük oynanış sorunu)
Serbest piyasa sabit 60-97 bandından üretiliyordu: 1. gün piyasada 96 OVR oyuncu, piyasa
ortalaması (75) kadro ortalamasından (71) **yüksek**. Rastgele bir serbest oyuncu senin ortalama
oyuncundan iyiydi — menajerlik oyununun gerilimi kıtlıktan gelir, kıtlık yoktu.
`marketQualityBand()`: taban = kadro ort − 18, tavan = kadro en iyisi + 6; üs 1.7 dağılımı düşük
OVR'a yığılır. Ölçüm: kadro ort 70,9 / tavan 74 → **piyasa ort 62,6 / tavan 80**.

#### F8-5 / F8-6 / F8-7 · İngilizce
**Kök neden (F8-5):** sözlük tam-dize anahtarlı olduğu için `🆓 Serbest Oyuncular` gibi emoji
ön ekli metinler hiç çevrilmiyordu. Her emoji varyantını sözlüğe eklemek yerine kalıcı çözüm:
`_splitIconPrefix()` ile önek ayrılıp **gövde** çevriliyor, önek korunuyor.

**F8-7 — araç kör noktası, asıl sebep emoji değilmiş.** `i18n-scan.js` yalnız Türkçe'ye özgü
harf (`çğıöşü`) veya dar bir sözcük listesi arıyordu; `Asist`, `Faul`, `Menajer`, `Bakiye:`,
`Serbest Oyuncular` gibi **salt ASCII harfli** Türkçe metinleri hiç göremiyordu. Araç "kalan
Türkçe yalnız özel isim" raporlarken gerçek EN oturumunda 9 dize ekranda duruyordu.
Sözcük listesi genişletildi (İngilizce'de aynı yazılanlar — arena, transfer, moral, tempo —
bilinçli olarak **dışarıda** bırakıldı, yoksa çevrilmiş metinler yanlış pozitif olur), önek
soyulup gövdeye de bakılıyor ve **kapsam** çıktıya yazılıyor (22 ekran · ~44.400 düğüm).

Araç düzeltilince **yeni eksikler** çıktı: `Oyuncular`, `izci kalitene`, `· serbest`.

**Ders:** vurgu etiketi (`<strong>`) cümleyi metin düğümlerine **böler** ve ifade kalıbı
eşleşmez. Çevrilecek cümleler tek düğümde tutulmalı — haber şablonları buna göre düzeltildi.

#### F8-1 · Eski kayıt migrasyonu (v7)
`migrateV6ToV7`: boy/kilo mevki aralığına çekilir (deterministik, seed'den — kayıt her açılışta
oynamaz), aynı soyadı en fazla 2 oyuncuda kalır (isim–ülke uyumu korunarak yenilenir).
**Yalnız kozmetik alanlar**; id, statlar, potansiyel, sözleşme, sakatlık, sezon/kariyer verisi
aynen korunur — oyuncunun "kim olduğu" değişmez.
Ölçüm: ÖNCE C 198 cm / SG 205 cm / aynı soyadı 10 oyuncuda → SONRA **C 213 cm / SG 198 cm / 2**.

#### F8-3 · Lig kutuplaşması
Skor formülü `cpuMatchScore()` olarak ayrı saf fonksiyona çıkarıldı — testin formülü
kopyalaması, motor değişince sessizce eskimesi demekti. Güç etkisi `diff×0.6` → **`×0.26`**,
maça özgü gün formu ve daha geniş gürültü eklendi.

| Ölçüm (200 sezon × 20 takım) | Önce | Sonra | Hedef |
|---|---|---|---|
| 8-0 yapan takım | — | **%2,8** | < %5 |
| 0-8 yapan takım | — | **%2,08** | < %5 |
| Galibiyet std sapması | 2,61 | **1,87** | 1,7-2,1 |

#### Kalanlar
- **F8-13** script sürümü `?v=37` → `?v=38` (13 etiket).
- **F8-4** şehir havuzu 10 → 24 şehir (İstanbul/Ankara/Antalya dahil); `genUniqueClubName`
  artık şehir başına ≤2, sonek başına ≤3 takım uyguluyor (kademeli gevşetmeli, kilitlenmez).
- **F8-11** haberler: 8 farklı şablon (transfer, sakatlık, form serisi, başkan açıklaması,
  taraftar tepkisi, arena/bilet, altyapı çıkışı, takas); iç grup kimliği (`tb1`) sızıntısı
  kaldırıldı, okunabilir lig adı yazılıyor.
- **F8-8** sakatlık etiketi karttan taşmıyor · **F8-9** "Görünüm:" etiketi butonlarıyla
  birlikte kayıyor · **F8-10** mobilde Kadro varsayılanı **Liste** (kart ~1,5 ekran; 15 kişi =
  20+ ekran kaydırma) · **F8-12** Ana Panel boş alanına **Durum Özeti** (son 5 maç formu,
  sıradaki 3 maç, kadro uyarıları, başkan hedefi ilerlemesi) · **F8-14** eski mentor telemetri
  anahtarları açılışta bir kez temizleniyor.

#### YENİ ARAÇ — `tools/faz8-check.js`
8 kabul kriterini fiilen çalıştırır. **Ölçüm kurgusunda iki kusur kendi testimde çıktı:**
1. Kriter **takım** oranıdır, "en az bir takım" değil — 20 takımlı ligde saf şansta bile bir
   sezonun ~%7'sinde biri 8-0 yapar. İlk ölçümüm bu yüzden %41 gösteriyordu.
2. Ev/deplasman turlara göre dönüşümlü olmalı; tamamen rastgele ev sahipliği bazı takımları
   8 maçın çoğunda deplasmana düşürüp yapay olarak daha çok 0-8 üretiyordu.

#### Doğrulama
`faz8-check` **6/6** · `i18n-scan` kalan Türkçe yalnız özel isim (kapsam 22 ekran / 44.4k düğüm)
· `box-band --n=200` 11/11 · `visual-check` 0 hata · `faz7-check` 8/8 · `m20-check` 6/6 ·
`sunum-check` 3/3 · `live-metrics` tüm hedefler (orphan 0 · kimlik %100 · ışınlanma 0 kare).

`band.js` hash `dc984289dee3c29d` → **`ec630b3a512bb3b2`** — beklenen: piyasa ve şehir üretimi
RNG akışını kaydırdı (mekanik değişiklik, sunum değil).

### 32. oturum — EK 5: FAZ 6 (kalan eksikler + Steam hazırlığı)

FAZ 6 tablosunun büyük kısmı önceki fazlarda kapanmıştı. Bu oturumda **hangilerinin gerçekten
kapandığı ölçülerek** doğrulandı, açık kalan tek büyük madde (B5) uygulandı.

#### B5 · Zorluk seviyesi — asıl yeni özellik
`state.js`'te **tek kaynak**: `DIFFICULTY` tablosu + `difficultyCfg()`. Çarpanlar koda dağılmıyor.

| | bütçe | gelir | rakip | sakatlık | piyasa tavanı | başkan hedefi |
|---|---|---|---|---|---|---|
| Kolay | ×1,50 | ×1,15 | ×0,94 | ×0,60 | +2 | +2 sıra |
| Normal | ×1,00 | ×1,00 | ×1,00 | ×1,00 | 0 | 0 |
| Zor | ×0,70 | ×0,90 | ×1,06 | ×1,40 | −2 | −1 sıra |

**Tasarım kısıtı:** NORMAL'in tüm çarpanları 1/0'dır, yani davranış FAZ 6 öncesiyle **birebir
aynıdır** — `band.js` hash'i değişmedi (`ec630b3a512bb3b2`). Bu kasıtlıydı: yeni bir ayar,
mevcut dengeyi bozmadan eklendi.

Bağlantı noktaları: başlangıç bütçesi (`createTeam`), bilet geliri (`economy.js`), rakip güç
çarpanı `oMul` (`match-engine.js`), kullanıcı sakatlık riski + başkan hedefi (`match-prep.js`),
serbest piyasa tavanı (`roster-gen.js`).
Arayüz: kurulum ekranında seçilir, Ayarlar'dan değiştirilebilir (ortak `diff-picker` bileşeni).
Kayıt sürümü **v8** + `migrateV7ToV8` — eski kayıtlar NORMAL'de devam eder.

#### B4 · Sezon ödülleri tamamlandı
MVP, en skorer/asistçi/ribaundçu, ideal beşli, yılın genci **zaten vardı** (Faz 2.2).
Eksik olan "en gelişen"di: yılın genci performansa göre seçiliyordu. `G.analytics.playerDev`
sezon boyu OVR anlık görüntüsü tuttuğu için ilk/son farkı en büyük oyuncu artık ayrı ödül alıyor.

#### Zaten kapandığı ÖLÇÜLEREK doğrulanan maddeler
Bu oturumun dersi gereği hiçbiri "kod okuyarak" onaylanmadı:

| Madde | Durum | Kanıt |
|---|---|---|
| A1 / B3 rakip kadro + sakatlık | M20'de kapandı | `m20-check` T6: 40 günde 35 turda sakat |
| C2 manuel koçlukta istatistik kaybı | `resume.pstats` koruyor | yeniden üretim öncesi 37 sayı → sonrasında 91, kayıp yok |
| C3 `startMatch` ölü else dalı | artık yok | mevcut `else` lig maçı yolu — geçerli dal |
| Çevrimdışı font | F7-11'de kapandı | `faz7-check` K6 (ağ kesilerek) |
| Kota/hata yönetimi | F7-4'te kapandı | `faz7-check` K2/K3 |
| Kayıt bütünlüğü (soyunma odası) | risk yok | `sit`/`mood`/`söz`/`oynadı` kayıt turunu atlatıyor |
| D3 Tauri paketleme | hazır | `dist-desktop`: 13 js modülü, 4 yerel font, **dış src/href yok** |

#### YENİ ARAÇ — `tools/faz6-check.js`
F1 ödül üretimi · F2 zorluk çarpanlarının **fiilen** etkisi (kolay/normal/zor farkı ölçülüyor,
kayıt turu dahil) · F3 manuel koçluk istatistik koruması · F4 soyunma odası alanlarının kayıt
bütünlüğü · F5 **D1 mobil uçtan uca** (16 ekran: 11 sayfa + 5 modal; yatay taşma, JS hatası,
36 px altı dokunma hedefi) · F6 masaüstü paketi.

Sonuç: **6/6**. Mobil taramada 16 ekranda **0 yatay taşma, 0 JS hatası, 36 px altı hedef yok**.

#### Doğrulama
`faz6-check` 6/6 · `faz8-check` 6/6 · `faz7-check` 8/8 · `m20-check` 6/6 · `sunum-check` 3/3 ·
`box-band --n=200` 11/11 · `visual-check` 0 hata · `live-metrics` orphan 0 / kimlik %100 /
ışınlanma 0 kare · `i18n-scan` kalan Türkçe yalnız özel isim · **`band.js` hash değişmedi**.

`sunum-check` bir turda M9'da düştü (o pencerede yalnız 1-2 örnek vardı); daha uzun pencerede
%100 ve motor kararı 104/107. Düşük örneklemde yayılım gürültülüdür — araç zaten uyarıyor.

### 32. oturum — EK 6: Tauri derlemesi denendi (araç zinciri eksik)

Kullanıcı `tauri build` çalıştırılmasını istedi. Ortam denetimi (`npx tauri info`):

| Bileşen | Durum |
|---|---|
| WebView2 151.0.4129.107 · Node 24.18 · npm 11.16 · Tauri CLI 2.11.4 | ✓ kurulu |
| **Rust (rustup/rustc/cargo)** | ✗ yok |
| **MSVC Build Tools + Windows SDK** | ✗ yok |

Derleme bu iki bileşen olmadan başlayamıyor. Kurulum ~4-6 GB indirme, MSVC tarafı **UAC/yönetici**
onayı istediği için otomatik yapılamaz (tool oturumu `-NonInteractive`, stdin null). Kullanıcıya
üç seçenek sunuldu; **"şimdilik kurma"** seçildi — kurulum yapılmadı.

**Bunun yerine derleme öncesi hazırlık kalıcı olarak doğrulandı.** `faz6-check`'e **F7** eklendi:
`src-tauri` dosya bütünlüğü (Cargo.toml, build.rs, main.rs, tauri.conf.json, ikonlar),
`frontendDist` yolunun gerçekten var olması, bundle hedefleri ve identifier. Araç zinciri durumu
**bilgi olarak** raporlanır — Rust yoksa madde düşmez, çünkü depo içeriğiyle ilgili değildir.
Böylece kurulum yapıldığında ilk denemede yapılandırma hatasıyla vakit kaybedilmez.

`faz6-check` artık **7/7**. Kurulum komutları ve derleme adımları `KALDIGIM-YER.md` içindeki
yeni **"Masaüstü derlemesi (Tauri) — durum ve kurulum"** bölümüne yazıldı.

---

## 33. Oturum — 2026-08-30 · FAZ 9: UZUN VADELİ OYUN DÖNGÜSÜ

Girdi: `REVIZE-PAKETI-FAZ9.md` — ilk kez **sezonlar arası** davranışa bakan paket.
Belge kendi harness'ının üç kez yanlış alarm verdiğini dürüstçe işaretlemişti (draft'ın
"takılması", "hiç çalışmaması", "yeni sezonun başlamaması") — üçü de gerçek değildi.

### YENİ ARAÇ — `tools/season-loop.js`
Belgenin önerdiği kalıcı çözüm. N sezonu uçtan uca sürer (lig → playoff → draft → yeni sezon)
ve 6 kriteri ölçer. Üç harness tuzağı bilerek ele alındı: draft kullanıcı sırasında **bekler**
(hata değil) → `autoDraftPick()` ile ilerletilir; `G.playoff` her adımda **taze** okunur.

**İlk sürümü tohumsuzdu ve aynı kodla kasayı 2,09× ve 4,65× ölçtü** — `band.js` ile birebir
aynı ders. Tohum + `--runs` eklendi; artık 3 tohumun **ortalaması** yargılanıyor.

### F9-1 · Kadro her sezon zayıflıyordu (71 → 68,7)
Kök neden: yaşlanma bloğunda 32+ için gerileme vardı ama **18-31 bandında sezonluk doğal
gelişim hiç yoktu** — oyuncular yalnız antrenmanla büyüyordu. F8-2 ile piyasa da kısıtlanınca
güçlenme yolu kalmamıştı. Gelişim potansiyel **boşluğuna** bağlı (boşluk kapandıkça yavaşlar),
yaşla azalır, altyapı tesisi hızlandırır. **Ölçüm: 3 koşu ortalaması +1,27 OVR.**

### F9-2 · Para birikiyor, harcanacak yer yok (3 sezonda 5,8×)
Önce döküm alındı: haftalık gider 5.958 KR, bilet 4.350/maç, sezon neti **+44.000 KR**.
70 OVR oyuncunun haftalık maaşı bir iç saha kapı hasılatının **%8'i** kadardı.

| Değişiklik | |
|---|---|
| `salaryKRFromGenel` çarpanı | 1,7 → **2,9** |
| Enflasyon kapsamı | yalnız arena bakımı → **tüm işletme giderleri** |
| Akademi işletme gideri | yeni (seviyeyle artar) |
| Galibiyet ödülü | 1400-2600 → **850-1550** |
| Mağlubiyet geliri | 420-900 → **300-650** |

**Ölçüm: 2,67× → 1,58×.** Ara denemede 3,2 çarpanı çok sıkıydı (1,26×, bir koşuda kasa
küçülüyordu) — oyuncu transfer için para biriktiremezse de oyun bozulur.

### F9-3 · Kadro şişiyor, kimse ayrılmıyor
Otomatik altyapı terfisinde `<18` sınırı **vardı** ama elle terfi, serbest piyasa alımı ve
kulüp transferinde **yoktu**. Tek sabit: `ROSTER_MAX=18` + `rosterHasRoom()` — dolu ise
"önce birini gönder" der, karar kullanıcıda kalır.

### F9-4 ve F9-5 · Belgenin "kesin değil" dediği iki madde — ikisi de harness hatasıymış
- **F9-4:** `startPlayoffs` her çağrıda yeni nesne kuruyor; ölçüm her sezon için ayrı playoff
  yılı (1/2/3) ve ayrı şampiyon üretildiğini gösterdi. Yine de `startLeagueSeason` artık geçen
  sezonun bitmiş playoff'unu temizliyor (`G.playoff=null`) — bayat `champion` arayüzü ve
  testleri yanıltmasın.
- **F9-5:** aynı oyuncu id'leri izlendi, yaşlanma çalışıyor. Ortalamanın sabit görünmesi
  drafttan gelen gençlerin ortalamayı aşağı çekmesinden.

### MOTOR ÇÖKMESİ — `season-loop` buldu, FAZ 9 belgesinde yok
Sağlıklı oyuncu 5'ten azsa `matchLineup` **null slot** döndürüyordu ve `generateMatchEvents`
bunu denetlemeden `${c.isim}` okuyup **çöküyordu** (`TypeError: Cannot read properties of
null`). Sakatlık dalgasında maç hiç başlamıyor. `matchLineup` artık en hafif sakatlarla
kadroyu tamamlıyor; motorda ikinci savunma katmanı var.

### ARAÇ KUSURU — `tools/box-band.js` tohumsuzdu
Denge yargısının **tek yetkili aracı** olduğu hâlde aynı kodla ribaund **29,9** ve **30,9**
ölçtü (bant sınırı 30): bir bandın tutup tutmadığı çalıştırmaya göre değişiyordu.
`band.js` ile aynı PRNG ve tohum eklendi; iki çalıştırma artık aynı sonucu veriyor.
**Bu oturumda düzeltilen ikinci tohumsuz araç** (birincisi `band.js`, 32. oturum).

### Doğrulama
`season-loop` **6/6** (3 sezon × 3 tohum) · `box-band` 11/11 (artık deterministik) ·
`faz6-check` 7/7 · `faz7-check` 8/8 · `faz8-check` 6/6 · `m20-check` 6/6 ·
`sunum-check` 3/3 (motor kararı 138/138) · `visual-check` 0 hata · `live-metrics` tüm hedefler ·
`i18n-scan` kalan Türkçe yalnız özel isim · **`band.js` hash değişmedi** (`ec630b3a512bb3b2`
— ekonomi ve gelişim değişiklikleri maç motorunu etkilemedi).

### Ders
Bu oturumda **üçüncü kez** bir ölçüm aracının kendisi yanlış sonuç verdi (`band.js` tohumu →
`i18n-scan` kör noktası → `box-band` tohumu). Yeni bir denge aracı yazarken ilk soru
"deterministik mi?" olmalı; değilse yapılan her ayar tesadüfe dayanır.

---

# 34. OTURUM — 2026-08-30 · FAZ 10: YAYIN HAZIRLIĞI (B grubu) + ÇOK OYUNCULU PLANI

**Talep belgesi:** `REVIZE-PAKETI-FAZ10.md` (sürüm 2).
**Kullanıcı kararı (oturum başında soruldu):** *ara yol* — şimdi yapılabilir maddeler uçtan uca
bitirilsin, sunucu kodu yazılmasın; altyapı seçimi **Supabase**.

## Neden bu kapsam?

Belgenin A grubu (çok oyunculu sunucu altyapısı) kendi ifadesiyle "aynı büyüklükte ikinci bir
proje". Bu oturumda **F10-2, F10-3, F10-4, F10-5, F10-6, F10-7** uygulandı; **F10-1** (sunucu,
veritabanı, hesap, zamanlayıcı, sunucu tarafı simülasyon) yazılı plana dönüştürüldü, kod
yazılmadı. F10-8/9/10 (para kazanma) sunucu ayağa kalkmadan anlamsız olduğu için ele alınmadı.

## F10-2 · Fikstür saati kapısı bir bayrağın arkasına alındı

Oyunun temeli fikstür tarihli: maç saati gelince oynanır. Bugün fikstür kayıtlarında saat alanı
**yok** — maçların art arda oynanabilmesi bilinçli bir test kolaylığı. Kapı yine de şimdiden tek
noktada kuruldu (`js/state.js`):

| Ad | İş |
|---|---|
| `TEST_MODU` | `?test=1` varsa açık. **Node harness'lerinde `location` olmadığı için açık kabul edilir** — `season-loop`, `band`, `box-band` bozulmaz. |
| `matchTimeGateOk(match)` | `scheduledAt` yoksa **her zaman true** → bugünkü davranış birebir korunur. |
| `matchTimeGateMsg(match)` | Kullanıcı mesajı (maç saatini de yazar, i18n'li). |

`startMatch()` hem lig hem playoff/kupa yolunda kapıdan geçiyor. Sunucu tarafı geldiğinde
davranış tek yerden açılacak; kapıyı atlayan tek yol açık bayrak.

## F10-3 · `PLAN-COK-OYUNCULU.md` yazıldı

`PLAN-BULUT-KAYIT.md` yalnız *kayıt yedeklemeyi* planlıyordu (tek oyunculu güvenlik ağı). Yeni
belge onu çok oyunculu şemaya genişletiyor: Postgres tabloları (`profiles · leagues · teams ·
players · fixtures · results · transfers`) + RLS özeti, pg_cron fikstür zamanlayıcısı, **çeyrek
çeyrek üretim** (oyuncu çevrimiçiyse çeyrek arasında müdahale edebilsin, sonucun tarafsızlığı
bozulmasın), bot takım kuralı (`owner_id IS NULL`), 9 adımlık yol haritası.

**Belgenin en kritik maddesi:** simülasyon sunucuya taşınmalı. İyi haber — motor saf JS ve
`box-band.js` / `season-loop.js` onu **zaten Node'da** çalıştırıyor; yapılacak iş bu harness'in
üretimde tekrarlanması. `results.seed` + `results.events` saklanınca "maç tekrarı" bedava gelir.

## F10-4 · Analitik katmanı (varsayılan KAPALI)

`js/state.js`: `trackEvent` / `trackOnce` / `trackMilestone` + `initAnalytics`.
Olaylar: `oyun_acildi · takim_kuruldu · ogretici_atlandi · ogretici_bitti · ilk_mac_bitti ·
gun2_donus · davet_paylasildi · sonuc_paylasildi` (+ mağaza/reklam ileriye ayrıldı).

**Karar — neden varsayılan kapalı:** `ANALYTICS_SRC` boşken hiçbir dış istek yapılmaz; olaylar
yalnız bellekteki halkaya (`window.__charazayAnalytics`) yazılır ve `faz10-check` bunu okur.
Yayında açmak tek satır (Umami/Plausible betik URL'i + site id). Betik ayrıca **yalnız**
`isProdHost()` doğruyken yüklenir — yerel ölçümler kirlenmez, KVKK açısından da temiz kalır.
`gun2_donus` ilk ziyaret damgasından hesaplanır (20-72 saat penceresi), tarayıcı başına bir kez.

## F10-5 · Paylaşım ve arama görünürlüğü

- `charazay2.0.html` + `index.html`: `description`, `canonical`, og (`type/site_name/locale/url/
  title/description/image+boyut/alt`), twitter (`summary_large_image`).
- **og:image üretildi:** `tools/gen-brand-images.js` (Playwright ile 1200×630 PNG + 192/512 ikon).
  Görsel depoda; yeniden üretmek için tek komut. og:image **mutlak URL** olmak zorunda.
- Oyun içi: Ayarlar → **"🔗 Oyun bağlantısını paylaş"** (davet), maç bitince **"📣 Sonucu Paylaş"**.
  Yol sırası `navigator.share` → pano → modal; **hiçbir adımda tarayıcı diyaloğu yok**.

## F10-6 · Öğretici dili — kök neden bulundu

Belge "gövde EN, butonlar TR" diyordu. Gerçek daha genişti: **7 adımdan yalnız 1.'si çeviriliydi**,
çünkü `i18n-scan` öğreticinin yalnız ilk adımını görüyor (sonrakiler tıklamayla açılıyor).

Adım metinleri `<strong>` içerdiği için metin düğümü bazlı çeviri onları parçalıyordu (KALDIGIM-
YER'deki bilinen tuzağın aynısı). Çözüm: `TUT_STEPS` **katalog** olarak `localizeCatalogs()`'a
kaydedildi — innerHTML'e girmeden, etiketleriyle birlikte çevriliyor. Butonlar (`← Geri`,
`Sonraki →`, `Atla`, `Başla!`) ve bitiş bildirimi sözlüğe eklendi.

## F10-7 · PWA (service worker + manifest)

- `sw.js`: HTML → **önce ağ** (yeni sürüm anında görünür), js/font/ikon → **önce önbellek**
  (URL'ler `?v=` ile sürümlü olduğu için bayat JS mümkün değil). Eski önbellekler `activate`'te siliniyor.
- `manifest.json`: standalone, tema/arka plan `#0a0a0f`, 192/512 + maskable ikon.
- **Kayıt yalnız yayın sunucusunda** (`registerServiceWorker` → `isProdHost()`): yerelde ve test
  araçlarında (127.0.0.1) önbellek eski JS'i servis edip **ölçümleri yanıltırdı**. Bu, bu depoda
  daha önce üç kez yaşanan "araç yanlış ölçüyor" sınıfının önden kapatılmasıdır.
- `sw.js` içindeki `SCRIPT_V`, HTML'deki `?v=` ile aynı olmak zorunda — `faz10-check` sınıyor.

## Yeni araç: `tools/faz10-check.js` (27 kriter)

A1 kapı (normal modda engel + `?test=1` ile açık + `startMatch` uyumu) · A2 analitik (olaylar var,
dış istek yok) · A3 og etiketleri + og-image 1200×630 · A4 manifest/ikon/`SCRIPT_V`/SW yerelde
kayıtsız · A5 EN öğreticinin 7 adımı + butonları · A6 davet & sonuç paylaşımı (metin + bağlantı +
analitik olayı). **27/27.**

## Doğrulama

`faz10-check` **27/27** · `visual-check` masaüstü+mobil **0 hata** · `faz6-check` 7/7 ·
`faz7-check` 8/8 · `faz8-check` 6/6 · `m20-check` 6/6 · `season-loop --n=3` 6/6 ·
`i18n-scan` kalan Türkçe yalnız özel isim (öğretici ekranında **sıfır** kalıntı) ·
**`band.js` hash değişmedi** (`ec630b3a512bb3b2` — maç motoruna dokunulmadı).

> `season-loop --n=1` çalıştırılırsa K4 (yaşlanma) düşer: tek sezonda sezon **geçişi** olmaz.
> Yargı için `--n=3` kullanılmalı.

## Cache-bust

Script sürümü `?v=40` → **`?v=41`** (13 etiket) + `sw.js` `SCRIPT_V='41'`.

## Kullanıcının test etmesi gerekenler

1. Ayarlar → "🔗 Oyun bağlantısını paylaş" (masaüstünde panoya kopyalar, telefonda paylaşım menüsü).
2. Bir maç bitir → "📣 Sonucu Paylaş" butonu görünüyor mu, skor doğru mu.
3. Dili İngilizce yapıp yeni kariyer aç → öğreticinin **yedi adımı** da İngilizce mi.
4. Yayına çıktıktan sonra: linki WhatsApp/X'e yapıştır → kart görseli çıkıyor mu; telefonda
   "Ana ekrana ekle" görünüyor mu; çevrimdışıyken oyun açılıyor mu.

## Açık kalan (bilinçli)

- **F10-1** — sunucu/veritabanı/hesap/zamanlayıcı/sunucu tarafı simülasyon: `PLAN-COK-OYUNCULU.md`.
- **F10-8/9/10** — reklam SDK soyutlaması, mağaza/kozmetik, destekçi katmanı: sunucudan sonra.
- **Analitik hesabı**: `ANALYTICS_SRC` + `ANALYTICS_SITE` doldurulmadı (hesap kullanıcıya ait).
- **og:url alan adı** `basketlig.vercel.app` seçildi (FAZ 10 belgesinin ölçtüğü canlı adres);
  GitHub Pages kopyası da aynı canonical'a işaret eder.

---

# 35. OTURUM — 2026-08-30 · FAZ 11: CANLI MAÇ SAHA DİZİLİMİ

**Talep belgesi:** `REVIZE-PAKETI-FAZ11.md`
**Kullanıcının şikâyeti:** *"savunma düzgün yerleşmiyor, oyuncular sahaya düzgün yayılmıyor,
gerçek basketbolda görmediğimiz hareketler yapılıyor."* — **şikâyet doğru, ama kök neden
belgede yazandan farklı çıktı.**

## KÖK NEDEN — belge "set dizilimi hiç uygulanmıyor" diyordu; gerçek sebep BAŞKA

Belge, `_setFormation`'ın `phase==='set'` dalının hiç çalışmadığını, faz makinesinin geçişte
takıldığını söylüyordu. **Kod doğruydu ve set dalı çalışıyordu.** Asıl mekanizma:

| Katman | Neye bağlı | Sekme arka plandayken |
|---|---|---|
| Sahne (jetonlar, dizilim) | `requestAnimationFrame` | **saniyede ~1 kare** |
| Olaylar / skor / anlatım | `setTimeout` | **normal akar** |

`_simStart` içindeki `dtReal=Math.min(0.05,…)` kırpması yüzünden rAF saniyede 1 kareye
düştüğünde sim saati gerçek zamanın **~1/13'ü** kadar ilerliyor. Koreografi adımları (geçiş →
set → şut) sim saatine bağlı olduğu için **set adımına hiç sıra gelmiyor**, bir sonraki olay
`clearBallTimers()` ile scripti siliyor ve döngü baştan başlıyor. Sonuç: on jeton orta sahada
geçiş dizilimine çakılı kalıyor, skor işlemeye devam ediyor.

**Ölçerek kanıtlandı** (`git worktree` ile FAZ 11 öncesi koda dönülüp):

| Ölçü | FAZ 11 öncesi · **arka plan sekmesi** | Belgenin canlı ölçümü | FAZ 11 öncesi · ön plan |
|---|---|---|---|
| Boyada ≥1 hücumcu olan kare | **%0,0** | %0 (boya hep boş) | %67,8 |
| Savunmacının adamına uzaklığı | **7,85 m** | 5,03 m (p90 7,19) | 1,86 m |
| Orta üçte birdeki hücumcu | **%94,3** | %80,8 | %27,6 |
| Hücum x ortalaması (sol potaya hücumda) | **553** (pota 103) | 454 | 413 |

Yani belgedeki tablo **arka plandaki sekmenin tablosudur** — belge bunu kendi dipnotunda
("sekme arka planda olduğu için rAF kısıtlandı") zaten sezmiş ama nedensellik kurulmamış.
Ön planda oyun bu kadar bozuk değildi; yine de ölçünce **dört kriter düşüyordu** (aşağıda).

## F11-7 · Önce ölçü aracı: `tools/spacing-check.js`

Belgenin sırası doğruydu — ölçemeden düzeltilemez. Araç maçı izlerken 100 ms'de bir
`mState._sim`'den hücum/savunma jetonlarını, topu, saldırılan potayı ve fazı (`S.defTrack`)
okur; istatistiği **yalnız set fazı** karelerinden çıkarır. 9 ölçü + "oturmuş kareler" (dizilim
kurulduktan ≥1,2 sn sonra) ayrımı: geometri hatası ile varış gecikmesi karışmasın.

**Tohumlu yazıldı.** Bu depoda üç ölçüm aracı tohumsuz olduğu için aynı kodla farklı sonuç
vermişti (`band.js`, `box-band.js`, `i18n-scan`); dizilim ölçümü tohumsuzken iki koşu ±3 puan
oynuyordu. Artık `--seed` ile iki koşu ±0,2 içinde.

**`--bg` kipi** sekmeyi arka plana alıp ölçer: F11-1'in gerileme testi budur. O kipte örnekleme
~1 Hz'e düştüğü için yalnız anlamlı ölçüler yargılanır, kalanı bilgi olarak basılır.

### Ölçü tanımlarında iki düzeltme (gerekçeli)

- **"Kapladığı alan"**: belge %35-50'yi gerçek basketbol referansı veriyordu. Beş noktanın
  **dışbükey zarfı** yarı sahanın ~%45'ini geometrik olarak aşamaz; %50 zarfla ölçülmüş olamaz.
  Yargı **sınırlayıcı kutu** ile veriliyor (referansla uyumlu), zarf ayrıca bilgi olarak basılıyor.
- **"En yakın ikili ≥ 3,5 m"**: top perdesinde perdeci ile topçunun ~1 m yan yana gelmesi
  gerçek basketboldur. Ölçü **top sahibi hariç** hesaplanıyor; ham değer bilgi olarak kalıyor.
- **"Adamından >5 m uzak savunmacı %0"**: geçişte koşan, kapamaya çıkan, ribaund mücadelesine
  giden savunmacı adamından uzaklaşır — bu da gerçek basketboldur (45 vakanın 41'i "yolda",
  4'ü ribaund/kapama kilidi). Ölçü **"yerine oturmuş ama adamı >5 m uzakta"** olarak
  keskinleştirildi: hedefine varmış, adamı da yerinde, kilidi yok. Belgenin şikâyet ettiği
  durum (ortalama 5 m, p90 7 m) tam olarak budur ve artık **%0**.

## Yapılan düzeltmeler

### F11-1 · Kare kaybında yetişme (`_simCatchUp`)
rAF boşluğu 0,35 sn'yi aşarsa animasyon simüle edilmez, sahne **anlatımın bulunduğu ana
eşitlenir**: bekleyen koreografi adımları sırayla çalışır, bekleyen anlatım/top işleri
boşaltılır, jetonlar hedeflerine oturur, top taşıyıcıya döner.
Ölçüm: arka plandan dönüşte jetonların hedeften sapması **2 px**. Ön planda yetişme **hiç
tetiklenmiyor** (120 sim saniyede 0 kez) — normal oynanış etkilenmiyor.

### F11-2 · Dizilim koordinatları yeniden çizildi
Eskiler dar ve çakışıklıydı (`SET_POST`'ta en yakın ikili **1,85 m**, yayılım %12-20).
Beş dizilim gerçek basketbol ilkeleriyle yeniden yazıldı ve sayısal olarak doğrulandı:

| | en yakın ikili | yayılım (kutu) | boyada |
|---|---|---|---|
| SET_SPREAD (4-out 1-in) | 4,86 m | %43 | 1 |
| SET_HORNS | 4,05 m | %44 | 2 |
| SET_POST | 4,88 m | %42 | 1 |
| SET_MOTION | 4,68 m | %42 | 1 |
| SET_5OUT (yeni) | 4,47 m | %46 | 0 |

Ayrıca: yerleşme toleransı 40→24 px, serpme 9→6 px (iki oyuncu birbirine 40'ar px sapıp
aralığı 2,4 m yiyordu).

### F11-2 · "Fill" fazı — topsuz dört oyuncu topu beklemiyor
En büyük görsel kazanç bu. Eskiden hücumun **tamamı** geçiş kulvarlarında (x≈300-450) topun
gelmesini bekliyor, set ancak `tSet`'te veriliyordu; pozisyonun büyük kısmı yol almakla
geçiyordu (hedeften ortalama sapma **85 px**). Gerçek basketbolda kanatlar ve uzunlar top
yukarı çıkarken zaten yerlerini alır. Yeni `phase:'fill'` bunu yapar; savunma da bu fazda
**adamına göre** erken eşleşir (eskiden kendi şablonuna oturuyordu — belgedeki "iki takım
birbirini aynalayan iki sütun" görüntüsünün kaynağı, F11-5).
Ölçüm: sapma 85 → **35 px**, orta üçte birdeki hücumcu %15,8 → **%7,8**.

### F11-2 · Koreografi artık dizilimi bozmuyor
- **Perdeci** dizideki ilk uygun oyuncuydu; köşedeki şutör topa çağrılınca dizilimin bir köşesi
  boşalıyordu. Artık **potaya en yakın uzun** perdeye çıkar (gerçek basketbolda perde postan
  gelir) — dizilimin çevresi bozulmaz. Perde mesafesi 22→32 px (≈1 m).
- **Kesme** her pozisyonda yapılıyordu ve aday nokta yalnız iki köşeydi; 4-out'ta iki köşe de
  doluyken kesici takım arkadaşının üstüne gidiyordu (en yakın ikili **1,19 m**). Artık kesme
  yalnız anlatımı kesme/postup olan pozisyonlarda yapılır ve **7 aday nokta** (köşe, kısa köşe,
  zayıf taraf 45'i, dunker) arasından takım arkadaşlarına en uzak olan seçilir.
- **Şutör** dizilim kurulur kurulmaz şut noktasına oturuyordu: boya içi bitirişlerde oyuncu
  pota altında 4 saniye bekliyordu (3 saniye ihlali görüntüsü) ve dizilimin bir ucu boşalıyordu.
  Artık boya içi şutlarda şutör yerinde kalır, şut noktasına şuttan ~1,9 sn önce koşar.
- Şut noktası, şutörün **rol yuvasının** yerine geçiyordu; artık **en yakın yuvanın** yerine
  geçer, o yuvanın sahibi şutörün yuvasına kayar — dizilimin çevresi korunur.

### F11-4 / F11-5 · Savunma
- Topsuz savunmacı yalnız `baseV` ile takip ediyordu; hücum sprintle yer değiştirince
  (kesme, geç şutör koşusu) 5-7 m geride kalıyordu → `baseV*1,45` (hücumun sprintinin altında).
- **`_defBehind`**: savunmacının hedefi her zaman adamının **pota tarafında** kalır (ball-you-man).
  Adamı potaya çok yakınken (post) kural uygulanmaz.

### F11-6 · `startMatch` sessiz kilitlenmesi
Üç ayrı kusur bulundu ve kapatıldı:
1. `if(mState.running) return;` **sessizce** dönüyordu. Bayrak bir kez takılı kalırsa
   (zamanlayıcı ölmüş, bayrak açık) oyun **kalıcı olarak** kilitleniyor ve sebebi görünmüyordu.
   Artık takılı durum tespit edilip kurtarılıyor; gerçekten canlı maç varsa bildirim çıkıyor.
2. Ana panel butonu maç bitince **"⏳ Maç Devam Ediyor"** etiketinde kalıyordu (buton aktif
   olduğu hâlde). Etiket artık durumu yansıtıyor.
3. Kilitli sonuç (`G.pendingMatch`) varken buton bunu yalnız aynı oturumda söylüyordu; sayfa
   yenilendikten sonra etiket kayboluyordu. `syncPendingMatchButton()` maç sayfası her
   açıldığında durumu tazeliyor.

## Sonuç — ölçüm (ön plan, seed 987654321)

| Ölçü | ÖNCE | SONRA | Hedef |
|---|---|---|---|
| ortalama ikili mesafe | 6,70 m | 6,84 m | ≥ 4,5 m |
| en yakın ikili (topsuz) | **2,98 m** | **3,85 m** | ≥ 3,5 m |
| yayılım / yarı saha | **%28,4** | **%34,3** | ≥ %30 |
| orta üçte birdeki hücumcu | **%27,6** | **%13,3** | < %20 |
| boyada ≥1 hücumcu | %67,8 | %72,6 | ≥ %60 |
| topu tutana en yakın savunmacı | 1,39 m | 1,38 m | < 1,8 m |
| savunmacının adamına uzaklığı | 1,86 m | 1,75 m | < 3 m |
| yerine oturmuş ama adamı >5 m | %0 | %0 | %0 |
| savunmacı adamı ile pota arasında | **%81,1** | **%86,8** | ≥ %85 |
| | **4 hedef düşük** | **9/9 geçti** | |

**Arka plan sekmesi** (belgenin ölçtüğü koşul): boyada %0 → **%69,8** · markaj 7,85 → **2,66 m** ·
hücum x 553 → **261** (pota 103, yani artık gerçekten potaya gidiliyor).

## Doğrulama

`spacing-check` **9/9** (ön plan) ve `--bg` **geçti** · `faz11-check` **13/13** ·
`visual-check` 0 hata · `live-metrics --ms=420000` tüm hedefler (orphan 0 · kimlik %100 ·
ışınlanma 0 kare) · `sunum-check` 3/3 · `box-band` 11/11 · `faz6` 7/7 · `faz7` 8/8 ·
`faz8` 6/6 · `faz10` 27/27 · `m20` 6/6 · `season-loop --n=3` 6/6 · `i18n-scan` kalan Türkçe
yalnız özel isim · **`band.js` hash DEĞİŞMEDİ** (`ec630b3a512bb3b2`).

> **B5 kuralı doğrulandı:** dizilim sunum katmanıdır — maç sonucu matematiği değişmedi.
> `realism-check` sayaçları da temel ölçümle aynı bantta (ışınlanma 2 ↔ 2, insanüstü hız 2 ↔ 4).

## Cache-bust

Script sürümü `?v=41` → **`?v=42`** (13 etiket) + `sw.js` `SCRIPT_V='42'`.

## Kullanıcının test etmesi gerekenler

1. Bir maç izle: hücum **yarı sahaya yerleşiyor mu**, boyada oyuncu var mı, savunma adamlara
   yapışıyor mu (iki sütun görüntüsü kalktı mı).
2. Maç sürerken **başka sekmeye geç, 10-15 sn sonra dön**: sahne anlatımla aynı anı gösteriyor mu
   (eskiden orta sahada donup kalıyordu).
3. Maçı başlat → **Durdur** → buton "▶ Maçı sonuçlandır" diyor mu; **sayfayı yenile** → maç
   sayfasında yine "sonuçlandır" diyor mu; basınca kilitli sonuç uygulanıyor mu.

## Ders

Belgedeki teşhis ("set dizilimi hiç uygulanmıyor, `tSet` zamanlayıcısı dolmuyor") **semptomu
doğru, mekanizması yanlıştı**; kodda tarif edilen yerde hata yoktu. Ölçüm koşulunu (arka plan
sekmesi) yeniden üretmek, hem gerçek nedeni hem de belgedeki rakamların nereden geldiğini
tek seferde gösterdi. **Bir hata raporunun ölçüm koşulu, raporun kendisi kadar önemlidir.**

---

# 36. OTURUM — 2026-08-30 · PROMPT-CLAUDE-CODE.md (5 bölüm)

Talep: `PROMPT-CLAUDE-CODE.md` — beş bölüm sırayla, her bölüm sonunda kabul kapısı + commit.

> **Not:** Belge `c2c46b3` commit'ine göre yazılmıştı ve "FAZ 11 hiç uygulanmadı, spacing-check
> yok" diyordu. **Bölüm 1 (FAZ 11) bir önceki oturumda (`63e74af`) tamamlanmıştı**; bu oturumda
> yalnız kabul kapısı yeniden koşuldu (spacing-check 9/9, band hash `ec630b3a512bb3b2` sabit).

## BÖLÜM 2 — FAZ 12: MOBİL ARAYÜZ

Kullanıcının cümlesi: *"application kısmının telefondaki mobilde kafa karıştırıcı olmaması
lazım. Az tıkla her şey yapılabiliyor olması lazım ki oyunu sevsin."*

### Önce ölçü aracı: `tools/mobile-check.js`
390×844 dokunmatik viewport'ta çalışır ve dokunma sayısını **gerçekten tıklayarak** ölçer
(varsayım değil): her adımda gerçek `click` atılır ve hedef durumun oluştuğu doğrulanır.
18 ölçüm: gezinme, çekirdek işler, maç sayfası düzeni, bilgi yoğunluğu, dokunma hedefleri,
market yoğunluğu, konsol.

### F12-1 · Alt sekme çubuğu
Mobilde ekranın altında 5'li sabit çubuk (56 px + `env(safe-area-inset-bottom)`): Ana · Kadro ·
Maç · Lig · Market. Kenar menü masaüstünde aynen kalır; günlük kullanımda olmayan sayfalar
(Altyapı, Antrenman, Arena, Bilanço, Analiz, Takım) hamburgerde kalır.
**Her sayfa 2 dokunuş → 1 dokunuş.**

Ayrıca **yapılacaklar rozeti**: Kadro sekmesinde sakat/düşük enerjili oyuncu + gelen teklif
sayısı, Maç sekmesinde oynanmayı bekleyen maç. FAZ 12 belgesinin "bir şey yapmam gerekiyor mu?"
sorusunun cevabı artık tek bakışta görünüyor.

### F12-2 · Mobil maç sayfası yeniden sıralandı
Ölçülen durum: tabela ekranın %45'i, saha %24'ü, `Maçı Başlat` **y≈2093 px** (2,5 ekran aşağıda).

Yeni sıra CSS `order` ile kuruldu (DOM'a dokunulmadan): tabela → saha → eylem şeridi → hız →
anlatım → çeyrek skorları → istatistik (katlanır) → şut filtreleri (katlanır).
`#macCourtStatsRow` mobilde `display:contents` olur; böylece saha ve istatistik kutusu kartın
kendi sıralamasına katılır.

- Tabela dikeyden yataya: 380 px → **88 px**
- Saha **tam genişlik** (sayfa + kart yan boşlukları negatif margin ile iptal), çerçeve 40 → 2 px
- Kalıcı "O = isabetli şut…" yardım metni **ⓘ düğmesine** taşındı
- İstatistik ve şut filtreleri `<details>` ile katlanır (mobilde kapalı, masaüstünde açık)

**Ölçüm: birincil eylemin derinliği 2,5 ekran → 0,48 ekran.**

> **Saha ekran payı — hedef matematiksel olarak ulaşılamaz.** Belge ">%30" istiyor. Saha SVG'sinin
> en-boy oranı 3200/1900 = 1,684; ekran genişliği kadar geniş çizilse bile yüksekliği
> (genişlik ÷ 1,684) ile sınırlı: 390 px'te **232 px = ekranın %27,4'ü**. Ölçüm bu yüzden
> **geometrik tavana göre** verildi (tam genişlikte mi?): ölçülen **%27,3**, tavanın **%99,6'sı**.
> Belgedeki oranların dikey pay olduğu, kendi tablosundan doğrulandı (380 px = %45, 200 px = %24).

### F12-3 · Birincil eylem mobilde sabit
`.m-sticky` sınıfı alt çubuğun hemen üstünde durur; sayfa değişiminde ilgili satıra uygulanır
(Maç → eylem şeridi, Kadro → ilk 5/taktik, Antrenman → antrenman başlat).
Kadro sayfasına **birincil eylem satırı** eklendi: ilk 5 eskiden yalnız
Maçlar → Taktik ayarla → İlk 5 seç yolundan (4 dokunuş) açılıyordu, artık **2 dokunuş**.

### F12-4 / F12-7 / F12-8 · Yoğunluk ve cila
- Tek sayı gösteren kart yüksekliği ölçüldü: en yüksek **78 px** (hedef < 100) — mevcut düzen
  mobilde zaten üçlü ızgaraya iniyordu; ek daraltma gerekmedi, ölçüm bunu doğruladı.
- Üst bardaki `🔴 CANLI MAÇ` rozeti dar ekranda iki satıra bölünüp sayfa başlığının üstüne
  biniyordu (ekran görüntüsüyle görüldü) → mobilde yalnız yanıp sönen nokta.
- `SONRAKİ MAÇ` etiketi mutlak konumluydu, tarih satırının üstüne biniyordu → akışa alındı.
- **44 px altı dokunma hedefi: 41 → 0.** Tek tek seçici saymak yerine `#pageStage` içindeki tüm
  düğme/seçici/summary 44 px'e çekildi; yeni eklenen buton kuralı kendiliğinden alır.

### F12-6 · Market
Mobilde liste 10'ar oyuncu + "Daha fazla" (masaüstü aynen). Ölçüm: ilk ekranda **15**
etkileşimli öğe (hedef ≤ 25), satın alma **2 dokunuş** (hedef ≤ 3).

### Yan etki olarak bulunan gerçek hata
Bildirim kutusu (`.notif`) `bottom:20px; right:20px` ile duruyordu ve **alt sekme çubuğunun
Market düğmesini kapatıyordu** — dokunma testi bunu ilk koşuda yakaladı (tıklama 30 sn boyunca
"notif intercepts pointer events" ile düştü). Bildirim artık `pointer-events:none` ve mobilde
çubuğun üstünde duruyor. Bu, ölçüm aracı olmasa fark edilmeyecek bir hataydı.

### Bölüm 2 doğrulama
`mobile-check` **18/18** · `visual-check` 0 hata (masaüstü + mobil) · `faz6` 7/7 · `faz7` 8/8 ·
`faz8` 6/6 · `faz10` 27/27 · `faz11` 13/13 · `i18n-scan` kalan Türkçe yalnız özel isim.
Script sürümü `?v=42` → **`?v=43`** + `sw.js` `SCRIPT_V='43'`.

## BÖLÜM 3 — MAÇ MOTORUNU `G`'DEN AYIR (KARAR-SUNUCU.md 3.0)

Çok oyunculunun ön koşulu; tamamen yerel bir yeniden düzenleme.

### İki engel, iki çözüm

**Engel 1 — motor tek küresel `G` durumuna bağlıydı.** `generateMatchEvents` gövdesinde
**30 adet `G.` okuması** vardı (G.team, G.players, G.tactics, G.chemistry, G.wins/losses,
G.gameDay, G.season.drift) + `matchLineup()` / `computeRosterOfrDef()` / `teamBonusFactor()`
çağrıları. Sunucu aynı anda yüzlerce maç oynatırken tek bir `G` olamaz.

**Çözüm — bağlam nesnesi (MC):** motor artık `buildMatchCtx(rakip,opts)` ile kurulan bağlamı
okur. `opts.ctx` verilmezse bağlam G'den kurulur → **tek oyunculu davranış birebir korunur**.
Gövdedeki `G.` sayısı **30 → 0** (kalan tek eşleşme bir yorum satırı).

**Engel 2 — rakibin kadrosu yoktu, sadece adı vardı.** `pseudoTeamStrength(isim,tblKey)`
rakibin gücünü **takım adının hash'inden** üretiyordu; maç "senin kadron ↔ bir sayı" idi.

**Çözüm:** `matchOppStrength(MC)` — bağlamda gerçek kadro varsa güç **kullanıcı tarafıyla
aynı formülden** (`computeRosterOfrDef`) hesaplanır, yoksa eski ada dayalı yola düşer.
Ayrıca rakip **oyuncu listesi** de bağlamdan alınır (eskiden her zaman
`getBotClubProfile(ad)` önbelleğinden geliyordu).

### Yardımcılar parametreli hâle geldi (geriye dönük uyumlu)
- `computeRosterOfrDef(players)` — parametresiz çağrı eski davranış (G.players)
- `matchLineup(players,lineupSel)` — dışarıdan kadro verildiğinde kullanıcının ilk 5 seçimi
  uygulanmaz (o seçim yalnız kendi takımı içindir)

### Sunucu sözleşmesi
```js
simulateMatch({ homeRoster, awayRoster, homeTactics, awayTactics, seed })
  → { events, home, away, box }        // G yok · DOM yok · tohumla deterministik
```
Tohum, çağrı süresince `Math.random`'ı tohumlu bir PRNG ile değiştirir ve `finally` ile geri
koyar; tüm rastgelelik (rand, Math.random, mulberry32) tek noktadan sabitlenir.

### Yeni araç: `tools/sim-node.js`
Motoru **tarayıcısız** çalıştırır. `band.js` / `box-band.js` / `season-loop.js` Playwright ile
başsız bir *tarayıcı* açar; bu araç düz Node'dur.

> **Bulgu (belgeye eklendi):** Node'un `vm` modülünde her `runInContext` çağrısı kendi
> sözlüksel kapsamını açar; dosyalar ayrı ayrı çalıştırılırsa `G`, `SPIKERS`, `POZLAR` gibi
> top-level `const/let` bağları birbirini göremez (tarayıcıda klasik script'ler ortak global
> sözlüksel ortamı paylaşır). Bu yüzden 12 dosya **tek script** olarak birleştirilip bir kez
> çalıştırılıyor — tarayıcı davranışının aynısı.

**Ölçüm:** 50 maç **0,3 sn**de, hata 0, ortalama skor 86,8-81,9, olay/maç 194.
Aynı tohum → **birebir aynı** skor ve olay listesi. `G` durumu **değişmedi**.

### Determinizmi bozan gerçek hata (araç yakaladı)
İlk denemede aynı tohum farklı sonuç veriyordu; 2. ve 3. koşular birbiriyle aynıydı.
Sebep: rakip kadrosu `getBotClubProfile()` ile **ilk çağrıda üretilip önbelleğe alınıyordu** —
üretim `Math.random` tükettiği için tohumlu diziyi yalnız ilk maçta kaydırıyordu. Rakip
kadrosu bağlamdan alınınca hem sözleşme gereği doğru oldu hem determinizm düzeldi.

### Bölüm 3 kabul kapısı
`sim-node --n=50` ✓ (tarayıcısız, deterministik) · `box-band --n=200` **11/11** ·
`spacing-check` **9/9** · `visual-check` 0 hata · `faz7` 8/8 · `faz10` 27/27 · `faz11` 13/13 ·
`m20` 6/6 · **`band.js` hash DEĞİŞMEDİ** (`ec630b3a512bb3b2`).

> Prompt "bu bölümde hash'in değişmesi beklenir" diyordu; **değişmedi** — çünkü sözleşme
> değişikliği eklemeli yapıldı: bağlam verilmediğinde motor tam olarak eski yolu izliyor.
> Bu, tek oyunculu sürüm için daha güvenli bir sonuç.

### AÇIK BULGU — `season-loop` K2 (bu oturumun işi değil)
`season-loop --n=3 --runs=3` → **K2 düşüyor** (pasif takım kasası ortalama 2,06× · eşik 2,0;
tohumlara göre 1,56× – 2,62×). `git worktree` ile ölçüldü: **bu oturum öncesi commit'lerde de
düşüyor** (`8288405` ve FAZ 9'un bittiği `7e8f5c0` dahil). Yani Bölüm 1-3'ten gelmiyor;
FAZ 9'da "6/6" olarak kaydedilen ölçüm bugün aynı commit'te tekrar üretilemiyor — aracın
ekonomi ölçümünde tohumla sabitlenmeyen bir girdi (büyük olasılıkla takvim/tarih) var.
**Bu, denge değil ölçüm aracı sorunu olabilir; ayrı ele alınmalı.**

## BÖLÜM 4 — `db/schema.sql` (yalnız dosya; hesap açılmadı, bağlantı kurulmadı)

`PLAN-LIG-YAPISI.md` bölüm 7'deki taslak gerçek `CREATE TABLE` ifadelerine çevrildi:
`countries · users · leagues · teams · players · fixtures · results · standings · transfers`.

**Şemaya yansıtılan lig kuralları:**

| Karar | Şemadaki karşılığı |
|---|---|
| Bot takım = sahipsiz | `teams.owner_user_id` NULL · `devralinabilir_takimlar` görünümü |
| **Sistem botu ≠ terk edilmiş takım** | `bot_controlled` + `abandoned_since` + `terk_adaylari` görünümü (45 gün) |
| Devralma kadroya dokunmaz | devralma yalnız `owner_user_id` yazar; `players` değişmez |
| 18 takım · 17 maç · tek devre | `fixtures.tur` (1-17) |
| Sezon 2 ay, ayın 1'inde | `leagues.baslangic` / `bitis` |
| **Play-off yok** | `fixtures.tip ∈ (lig, yukselme, dusme, kupa, uluslararasi)` — playoff yok |
| Fikstür saati | `fixtures.oynanma_zamani` + zamanlayıcı için **kısmi indeks** (`where durum='bekliyor'`) |
| Sonuç sunucuda üretilir | `fixtures/results/standings` için istemci **yazma politikası yok** (yalnız service_role) |
| Olay dökümü büyür (~140 MB/sezon) | `results.seed` + `motor_surum` → döküm tohumdan yeniden üretilebilir, `olaylar` silinebilir |

**RLS:** dokuz tabloda da açık. Okuma herkese açık (ligde şeffaflık), yazma yalnız sahibine ve
yalnız izin verilen sütunlara (şemada sütun düzeyinde `GRANT` reçetesi yorum olarak yazıldı).

**Yeni araç: `tools/schema-check.js` (17 denetim).** Sözdizimi katmanı `pgsql-parser` kuruluysa
**gerçek PostgreSQL ayrıştırıcısıyla** doğrulanır (45 ifade ayrıştırıldı); kurulu değilse
yapısal denetime düşer (bağımlılık eklenmedi — `npm i --no-save pgsql-parser`). Kural katmanı
yukarıdaki tablonun her satırını şemada arar; ayrıca `js/` ve HTML'de **Supabase bağlantısı
olmadığını** sınar (bu bölüm yalnız dosya üretir).

## BÖLÜM 5 — BELGE GÜNCELLEMELERİ

1. **`CLAUDE.md`** — "Sunucu/veritabanı yoktur" ifadesi kaldırıldı; yerine **"Proje temeli —
   ÇOK OYUNCULU"** bölümü eklendi: maçlar fikstür tarihinde otomatik oynanır, art arda
   oynanabilmesi bilinçli test kolaylığıdır (`?test=1`), sunucu kararı Supabase (kod yok),
   ve lig yapısının özeti (18 takım · 17 maç · 2 aylık sezon · play-off yok · bot devralma ·
   sistem botu ≠ terk edilmiş takım). Depo yapısı tablosuna dört yeni satır: `mobile-check.js`,
   `sim-node.js`, `schema-check.js`, `db/schema.sql`.
2. **`PLAN-COK-OYUNCULU.md` ve `PLAN-LIG-YAPISI.md`** — "motor zaten Node'da çalışıyor,
   `box-band.js` bunu yapıyor" gerekçesi **yanlıştı** (o araç başsız bir *tarayıcı* açar).
   İki belgede de ölçülmüş gerçekle değiştirildi: ayrıştırma 36. oturumda yapıldı,
   `tools/sim-node.js` motoru gerçekten tarayıcısız çalıştırıyor.
3. **`KALDIGIM-YER.md` / `PROGRESS.md`** — her bölüm sonunda güncellendi; üç yeni araç
   doğrulama komutları tablosuna eklendi.

## 36. OTURUM — TAM REGRESYON

| Araç | Sonuç |
|---|---|
| `spacing-check` | ✓ 9/9 |
| `mobile-check` | ✓ 18/18 |
| `sim-node --n=50` | ✓ tarayıcısız + deterministik |
| `schema-check` | ✓ 17/17 |
| `faz6` / `faz7` / `faz8` | ✓ 7/7 · 8/8 · 6/6 |
| `faz10` / `faz11` | ✓ 27/27 · 13/13 |
| `m20-check` | ✓ 6/6 |
| `visual-check` | ✓ 0 konsol hatası (masaüstü + mobil) |
| `box-band --n=200` | ✓ 11/11 |
| `band.js` | **`ec630b3a512bb3b2` — değişmedi** |
| `i18n-scan` | ✓ kalan Türkçe yalnız özel isim |
| `season-loop --n=3 --runs=3` | ✗ **K2** (aşağıda — bu oturumun işi değil, ölçüldü) |
| `sunum-check` | M9 küçük örneklemde dalgalı (aşağıda) |

Script sürümü `?v=44` + `sw.js` `SCRIPT_V='44'`.

### `sunum-check` M9 — ölçüldü: gerileme DEĞİL, aracın örneklemi yetersiz

Bölüm 5 sonunda tam regresyonda `sunum-check` M9 düştü (%67, hedef ≥ %80). `git worktree` ile
**FAZ 11 öncesi commit'te (`c2c46b3`) aynı ölçüm yapıldı:**

| | HEAD (36. oturum) | `c2c46b3` (FAZ 11 öncesi) |
|---|---|---|
| M9 kapsam içi vaka | **3** | **3** |
| outlet kurulan | 2 (**%67**) | 2 (**%67**) |
| M14 | ✓ geçti | **✗ düştü** |

**Aynı sonuç** — yani M9 bu oturumun değişikliklerinden etkilenmemiş. Üstelik aynı koşuda
motorun kendi kararı raporlanıyor: **taşıyıcı uzun olan pozisyon 237, outlet kurulan 231
(%97,5)**. Yani mekanik doğru çalışıyor; düşen şey aracın **görsel doğrulama örneklemi**:
10 dakikalık izleme penceresinde yalnız 3 vaka kapsama giriyor ve 3 vakada %80 eşiği
matematiksel olarak ancak 3/3 ile tutturulabiliyor (0 / 33 / 67 / 100 dışında değer yok).

**Sonuç:** `sunum-check` M9 ölçüsü küçük örneklemde karar veremiyor. Düzeltilecek olan
motor değil, aracın kapsam kuralı/penceresi (ya da motor kararının doğrudan sınanması).
`season-loop` K2 ile birlikte **açık iş listesine** yazıldı.

## BÖLÜM 0 — FAZ 13: CANLI MAÇ ANLATIMI VE GÖRSEL SUNUM

`PROMPT-CLAUDE-CODE.md`'nin ikinci sürümü FAZ 13'ü **her şeyden önce** koydu. Talep belgesi
`REVIZE-PAKETI-FAZ13.md`: 198 olaylık gerçek bir maç kod üzerinden çözümlenmiş, anlatımda 9,
görselde 4, kilitlenme/arayüzde 5 sorun.

### Yeni araç: `tools/anlatim-check.js` (13 denetim + `--freeze` ile 7 tarayıcı denetimi)

Bu fazın bulgularının **hiçbiri** mevcut araçlarla yakalanmıyordu. Yeni araç maçı
**tarayıcısız** üretip (sim-node ile aynı vm yükleyicisi, 30 maç ~1 sn) olay listesini
metin olarak denetler. İlk koşuda **1/12** geçti — belgedeki her madde yeniden üretildi.

### F13-14 · Sekme arka plana alınınca maç kalıcı donuyor (belgenin 1 numaralı maddesi)

Ölçülen durum: `idx=16/198 · running=false · paused=false · hidden=true · son adımdan 6.121 sn`.
M10 (sekme gizlenince kuyruğu duraklat) **yalnız `running` doğruyken** çalışıyordu; bayrak bir
kez düşünce dönüşte kimse oynatmayı sürdürmüyordu. Üç katman eklendi:

1. `resumeMatch()` — kaldığı olaydan devam eder (`canResumeMatch()` ile durum tespiti).
2. `visibilitychange` — sekmeye dönüşte donmuş maç **kendiliğinden** sürdürülür.
3. **Bekçi (watchdog)** — 2 sn'de bir oynatmanın aktığını doğrular; zamanlayıcı kaybolduysa
   yeniden kurar, sürdürülemiyorsa butonu **"▶ Devam et"**e çevirir. Sessiz kilitlenme kalmadı.
   Ayrıca `startMatch()` donmuş maçta yeni maç üretmez, kaldığı yerden sürdürür.

### Madde 0 · FAZ 11'in metre ölçeği yanlıştı

`940/28 = 33,57 px/m` viewBox genişliğinden hesaplanmıştı; oyun alanı `827,2 px` →
**29,54 px/m**. Tüm mesafeler %12 küçük raporlanıyordu. `spacing-check.js` düzeltildi; ayrıca
boya artık metreden değil **SVG'deki gerçek dikdörtgenden** (x≤223,6 · y∈[179,6–320,4])
okunuyor. Yeni ölçü eklendi: **hücumun saldırdığı potaya ortalama uzaklığı ≤ 7 m** (F13-11'in
"9,3 m" bulgusunun karşılığı) — ölçülen **6,39 m**.

### Anlatım maddeleri

| Madde | Durum | Ölçüm (20 maç) |
|---|---|---|
| **F13-1** kaçan şutun ribaundu anlatılmıyor (%22) | ✔ her kaçan şut + kaçan son serbest atış ribaund olayı üretir | kaçan 59,0 ↔ ribaund 59,9 |
| **F13-2** açıklamasız ardışık aynı-takım şutu | ✔ | 0 vaka |
| **F13-3** "9-0 seri" gerçekte 13-0 | ✔ seri artık SKORDAN hesaplanıyor (serbest atış dahil) | 28 iddia · 0 tutmayan |
| **F13-4** faul satırında ad yok (12'de 11) | ✔ `Faul — Ad (kişisel N)` + 4./5. faulde uyarı | 533/533 satır |
| **F13-5** faul sayacı atlıyor | ✔ serbest atışa yol açan faul de kendi adını söyler | 0 atlama |
| **F13-6** çalma tek taraflı | ✔ her çalma satırı kaybeden + kapan | 408/408 |
| **F13-7** devre arası yok, enerji hiç geçmiyor | ✔ ayrı devre arası kalıbı + yorgunluk satırları | 20/20 maç · 8 satır |
| **F13-8** kalıp tekrarı (%70 benzersiz) | ✔ faul/değişiklik/çeyrek/ribaund/köşe havuzları | **%87 benzersiz** |
| **F13-9** "köşe üçlüğü" köşede değil | ✔ bölge `shot.zone`'dan türetiliyor | 262 iddia · 0 yanlış |
| **F13-10** takımlar saha değiştirmiyor | ✔ `offLeftAtQ()` — 2. yarıda potalar değişir | 0 maçta hata |
| **F13-17** çeyrek 703 sn | ✔ (aşağıda) | 0 çeyrek aştı |

### F13-17 — belgedeki teşhis ölçüm artefaktıymış, ama altında GERÇEK bir hata vardı

Çeyrek `dt` toplamı 600'ü aşıyordu çünkü `runPossessionV` pozisyonun maliyetini o pozisyonun
**HER olayına ayrı ayrı** yazıyordu: üç olaylı pozisyon 3×dt sayılıyordu. Yani "703 saniye"
çift sayımdı. Ama aynı hata **canlı izlemede gerçekten** hissediliyordu: her olay pozisyonun
tamamı kadar bekliyor, anlatım tabela saatinin gerisine düşüyordu.

Düzeltme iki alanı ayırdı:
- `dt` → olayın **maç saati payı** (çeyrek toplamı tam 600 sn),
- `dtPos` → **sunum temposu** (pozisyonun tamamı; canlı izleme hızı korunur).

Bu ayrım yapılmadan yalnız `dt` bölününce `live-metrics` syncRatio medyanı 3,3× → **6,8×**
fırlamıştı (maç iki kat hızlı akıyordu). Ayrım sonrası medyan **3,86×** (hedef 2-5×).

### F13-15 / F13-18 · Arayüz

- **F13-15:** buton etiketleri artık tek durum makinesinden geliyor (`matchPlaybackState()`):
  maç yok → *Maçı Başlat* · oynanıyor → *Maç Devam Ediyor* (pasif) · donmuş → *Devam et* ·
  sonucu kilitli → *Maçı sonuçlandır*. Çelişen iki "Maçı Başlat" kalmadı.
- **F13-18:** maç sürerken başka sayfaya gidip dönünce maç içi istatistik paneli
  sıfırlanıyor, rakip adı "Deplasman" oluyordu — `showPage('mac')` paneli her açılışta boş
  kutuyla eziyordu. Panel artık `mState.box` + `mState.rakipName` üzerinden doldurulur.
  Araç bunu tarayıcıda sınıyor (sayfa değiştir → dön → panel birebir aynı).

### band.js hash DEĞİŞTİ — beklenen, gerekçesi ölçüldü

Yeni referans: **`fb393bdab878e699`** (eski `ec630b3a512bb3b2`).

F13-1'in kendisi hash'i değiştirmedi (rastgelelik akışı bilerek korundu). Değişimin kaynağı
ölçülerek bulundu: **anlatım bağlam öneki** (`🔥 N-0'lık seri` vb.) `rand(3,6)` ile MAÇ
rastgeleliğini tüketiyordu; F13-3 serinin ne sıklıkta çıktığını değiştirince akış kaydı.
Bu, sunum kararının maç matematiğini kirletmesi demekti — kalıcı çözüm olarak o çağrı da
**sunum PRNG'sine (`pr`)** taşındı. Artık anlatım değişiklikleri maç sonucunu etkileyemez.

`box-band --n=200` **11/11** (ribaund 31,3 — bandın içinde, çift sayım yok) ·
skor ortalaması 93,5 / 76,8 (eskiden 93,1 / 74,4).

### Yan kazanç: `sunum-check` M9 açık maddesi kapandı

Önceki oturumda M9 (%67) küçük örneklem yüzünden karar verilemiyordu. F13-1 ribaund olaylarını
görünür kıldığı için araç artık 3 yerine **20 vaka** ölçüyor: **%80 (hedef ≥ %80) ✓**.

### Doğrulama

`anlatim-check --n=30` **13/13** · `--freeze` **20/20** · `spacing-check` **10/10**
(29,54 px/m ile) · `mobile-check` 18/18 · `sim-node` ✓ · `schema-check` 17/17 ·
`faz6/7/8/10/11` ✓ · `m20` 6/6 · `visual-check` 0 hata · `box-band` 11/11 ·
`live-metrics --ms=540000`: orphan 0 · kimlik %100 · top ışınlanması 0 kare · syncRatio
medyan 3,86× ✓ · `i18n-scan` temiz.

> **live-metrics'te iki ölçü tanımı güncellendi:** faul satırları artık faulü YAPAN
> savunmacıyı adlandırıyor (F13-4) ve değişiklik satırları yeni kalıplarla geliyor; ikisi de
> "topu tutan oyuncu" kimlik ölçüsünün dışındadır (bloklarla aynı gerekçe). Eski dışlama
> kalıpları yeni metinlerle eşleşmediği için ölçüm yanlışlıkla %93'e düşmüştü.

### `live-metrics` syncRatio yayılımı — FAZ 13 öncesiyle karşılaştırıldı

FAZ 13 sonrası tek düşen ölçü buydu. `git worktree` ile aynı pencerede (`--ms=540000`)
FAZ 13 öncesi commit (`cf36a74`) ölçüldü:

| | öncesi | sonrası |
|---|---|---|
| syncRatio medyan | 2,78× ✓ | 3,86× ✓ (hedef 2-5×) |
| tipler arası yayılım | **2,47× ✗** | **3,11× ✗** (hedef < 1,9×) |

**Yayılım hedefi iki kodda da tutmuyor** — gerileme değil. Sebep ölçü tanımında: bir
pozisyonun bütün olayları aynı `t` (maç saati) değerini taşır, bu yüzden saat hareketini
pozisyonun İLK olayı soğurur; oran olay başına hesaplandığı için tipler arasında yapay fark
çıkar. F13-1 ribaund olaylarını araya sokunca bu hareket başka tiplere kaydı ve fark büyüdü.
**Düzeltilecek olan araçtır** (oran pozisyon başına hesaplanmalı), motor değil.

## 37. OTURUM — 2026-08-30 · KULLANICI BİLDİRİMİ: canlı maç görünümü ve açılış akışı

Kullanıcı iki şey söyledi: *"canlı anlatımda sahada şutun girip girmediği x o işaretleri
kalksın"* ve *"maç başında düdük çalıyor oyun başlıyor herkes sabit kalıyor, sonra bir düdük
daha çalıyor"*.

### 1) Parkedeki O/X şut izleri kaldırıldı

Canlı sahaya her şuttan sonra bir "O" (isabet) / "X" (kaçan) işareti çiziliyor, çeyrek
boyunca birikiyordu. Kaldırılanlar: `shotsLayer` katmanı, `drawShotMark`, `shotPassesFilter`,
`redrawAllShots`, `setShotFilter`, altı radyo düğmesi (Canlı/Tüm maç/Ç1-Ç4), açıklama metni
ve O/X anahtar satırı. Kart başlığı **"🔴 Canlı Maç"** oldu (eskiden "— Şut Haritası").

- **Şut verisi silinmedi:** `mState.allShots` toplanmaya devam ediyor; kutu skor ve Analiz
  sayfası bu veriden besleniyor.
- **"⛶ Büyük Ekran"** düğmesi filtre şeridinin içindeydi; eylem şeridine taşındı (işlev korundu).
- Mobilde katlanır "şut haritası filtreleri" bölümü de gitti (FAZ 12'de eklenmişti).

### 2) Açılışta iki düdük ve ölü bekleme

Ölçülen sebep: `start` (hava atışı) ve `quarter_start` olaylarında **`dt` alanı yoktu**.
Oynatma tarafı `dt` yoksa 12 saniyelik pozisyon varsayıyor (`dtMs = 12 × 0.3 = 3600 ms`),
oysa hava atışı koreografisi 1,4 sn'de bitiyor → **2,2 sn boyunca herkes donuk duruyordu.**
Ardından `quarter_start` için 3,6 sn daha bekleniyor ve `sfx('whistle')` **ikinci kez**
çalıyordu (ilk düdük hava atışında zaten çalmıştı).

Düzeltme:
- `start` ve tüm `quarter_start` olaylarına **`dt:0`** (bu olaylar maç saatinden süre yemez;
  gecikme artık koreografinin uzunluğu kadar).
- Periyot düdüğü yalnız **2. çeyrek ve sonrası** için çalıyor (`ev.q>1`).

**Ölçüm (1× hız):** açılış zinciri `start@0,1 → quarter_start@2,6 → ilk aksiyon@4,2 sn`,
**tek düdük** (+1,0 sn). Öncesinde ilk aksiyon ~7,2 sn'de ve iki düdük vardı.

### Kalıcı denetim
`tools/anlatim-check.js --freeze` üç yeni denetim aldı (toplam **23/23**):
maç başında tek düdük · açılışta ilk aksiyon < 6 sn · **parkede O/X izi yok**.

### Doğrulama
`anlatim-check --n=30` 13/13 · `--freeze` **23/23** · `spacing-check` 10/10 ·
`mobile-check` 18/18 · `visual-check` 0 hata · `faz6/7/8/10/11` ✓ · `m20` 6/6 ·
`i18n-scan` temiz · **`band.js` hash değişmedi** (`fb393bdab878e699` — yalnız sunum değişti).
Script sürümü **?v=47**.

> **Yan hata (araç yakaladı):** ölü kod temizliği sırasında `openNextMatchTactics` da
> silinmişti (bitişik bloktaydı); `mobile-check` "taktik açılmadı + pageerror" ile yakaladı,
> geri alındı. Bitişik blokları toplu silerken sınırı satır satır doğrulamak gerekiyor.

## FAZ 14 — CANLI MAÇ ANLATIMI DİL REVİZYONU (37. oturum)

Talep: 4 gerçek Türkçe maç anlatımı transkriptinin (Türkiye–Litvanya, Warriors–Nuggets,
Lakers–Rockets, FB–Monaco EL finali) yapısal analizinden çıkan üç fark.

### F14-1 · Skor kapısı (`scGate`)
Gerçek anlatımda skor tüm maçta ~6-8 kez söylenir; oyunda **her sayı cümlesinin sonunda**
vardı. Kapı yalnız anlamlı anlarda açılır: son 2 dakika · çeyrek kapanışı (≤25 sn) ·
8+ cevapsız seri · ilk kez çift hane/20 fark · periyodik hatırlatma (6-10 olayda bir).
`%SC` boşalınca kalan boşluk ve `" !"` gibi bozuk noktalama `spikerLinePR`'da temizlenir.
**Ölçüm: %53,2 → %15,6.**

> İlk denemede kapı hiç kapanmadı (%53) — `_scG` sayacı `runPossession` kapsamındaydı ve her
> pozisyonda sıfırlanıyordu. **Bu, `_runTeam` (F13-3) ile birebir aynı tuzak;** maç düzeyinde
> tutulması gereken her sunum sayacı için artık kural: `narr` ile aynı kapsamda tanımla.

### F14-2 · Zincir anlatım
Gerçek anlatımın birimi 2-5 kelimelik parçadır ("Cedi güçlü gitti." / "İsabetli."). 356
spiker cümlesi **korundu**; pozisyonların bir kısmı artık `AKIS_ON` (ön parça: geliş/perde/
eşleşme/yüklenme) + `KISA_CEKIRDEK` (isabet/kaçış) ritmiyle anlatılıyor. Asistli pozisyonda
zincir kullanılmaz (pasörün adı kaybolmasın); zincir modunda hamle ibaresi eklenmez.
**Ölçüm: %0 → %34,1** (hedef %30-50; 0,40 olasılıkla %25 çıktı, 0,55'e alındı).
Kısa çekirdekler bölge filtresinden geçmediği için içlerinde **mesafe/bölge iddiası yok**
(FAZ 13'te düzeltilen "söz ile saha çelişmesi" tekrarlamasın) — ölçümle doğrulandı.

### F14-3 · Spiker imzası + yorumcu
Dört spiker aynı işi yapıyordu. Artık davranışla ayrışıyorlar (`SPIKERS[].davranis`):
Coşkun isim tekrarı · Bilge istatistik · Cem espri · Reha seri. Her imza kendi eşiğinde ve
**en az 8 sayı olayı arayla** (ilk ölçüm 22/maç idi). **Ölçüm: 8,1/maç** (hedef 3-12).
Ayrıca ölü toplarda (faul, bonus, taktik) olayın NEDENİNİ söyleyen **yorumcu** satırı —
yeni olay türü açılmadan mevcut metne eklenir. **Ölçüm: 2,2/maç** (hedef 2-8).

### Ölçüm tablosu (20 maç · 4.918 metinli olay)

| Ölçüt | Hedef | ÖNCE | SONRA |
|---|---|---|---|
| skor içeren şut/kaçırma olayı | < %20 | %53,2 | **%15,8** |
| zincir (kısa parçalı) oranı | %30-50 | %0,0 | **%34,1** |
| ortalama olay kelime sayısı | öncekinin altında | 11,03 | **10,47** |
| bir kalıbın en çok tekrarı | fazla değil | 49 | **46** |
| spiker imzası / maç | 3-12 | — | **8,1** |
| yorumcu satırı / maç | 2-8 | 0 | **2,2** |

### Tutarlılık
çift boşluk 0 · bozuk noktalama 0 · doldurulmamış yer tutucu 0 · zincirde bölge iddiası 0 ·
çeyrek başı/sonu, değişiklik ve maç sonu satırları skoru **hâlâ içeriyor** (324/324) ·
`SPIKER_LINES` cümle sayısı **312 → 312** (hiçbiri silinmedi) · aynı tohum → birebir aynı
olay dizisi · **aynı tohumla skor FAZ 14 öncesiyle aynı (90-83)** · `band.js` hash
**değişmedi** (`fb393bdab878e699`) — yeni kodda `Math.random`/`rand()` yok, yalnız `pr`.

### i18n
`AKIS_ON`, `KISA_CEKIRDEK`, `IMZA_*`, `YORUMCU_LINES` içindeki **70 satırın tamamı**
`js/i18n-commentary.js`'e eklendi (karşılıklar motordan okunarak üretildi; eksik giriş
imkânsız) ve `localizeCatalogs()`'a kaydedildi. EN modunda havuzlarda Türkçe kalmadı.

### Değişen dosyalar
`js/match-engine.js` +165/-13 · `js/i18n-commentary.js` +75 · `js/i18n.js` +7 ·
`charazay2.0.html` +13/-13 (sürüm) · `sw.js` +1/-1. Script sürümü **?v=48**.

### Doğrulama
`anlatim-check --n=30` 13/13 · `--freeze` 23/23 · `box-band --n=200` 11/11 ·
`visual-check` 0 hata · `i18n-scan` temiz · `band.js` hash sabit.

### FAZ 14 sonrası `live-metrics` notu (gerileme DEĞİL)
`live-metrics --ms=420000` iki satırda hedef dışı veriyor: syncRatio **medyan** (hedef 2-5×)
ve **tipler arası fark** (hedef <1,9×). FAZ 14 öncesi commit (`6ce00f8`) worktree'de aynı
komutla koşuldu: **6,25× / 2,68×** — FAZ 14 sonrası **5,1× / 2,54×**, yani ikisi de bir miktar
iyileşmiş. Kimlik eşleşmesi %97 → %99. Ölçüt gürültülü: aynı kodla iki koşu 3,77×/5,07× ve
5,1×/2,54× verdi, aracın kendi uyarısı da geçerli (tip başına 4-11 örnek; `--ms` yetmiyor).
**Sonuç:** bu açık FAZ 14'ten önce de vardı, tempo dengesi ayrı bir iş kalemidir; yargı için
`--ms` en az iki katına çıkarılmalı, tek koşu yeterli değil.

## FAZ 14 — SAHA ÇİZGİLERİ VE SERBEST ATIŞ YERLEŞİMİ (38. oturum · Bölüm A)

> **Ad çakışması uyarısı:** bu depoda "FAZ 14" adı iki işe verildi. `f77bac1` **canlı anlatım
> dil revizyonu** (skor kapısı · zincir · spiker imzası), bu bölüm ise `REVIZE-PAKETI-FAZ14.md`
> içindeki **saha geometrisi + serbest atış** işidir. Belgelerde ilki **FAZ 14-D (dil)**,
> ikincisi **FAZ 14-G (geometri)** diye ayrılır; madde kodları (F14-1…F14-7) geometri
> paketine aittir.

### Önce ölçüm aracı — `tools/geometri-check.js` (paketin D maddesi)
FAZ 13'te "saha geometrisi doğru, FIBA'ya uygun — aramayın" yazmıştım. **Yanlıştı.** O yargı
`<path>`'in `r="196"` **niteliğini** okuyarak verilmişti; tarayıcının **çizdiği** eğri
ölçülmemişti. Yeni araçta nitelik okumak yasak: yalnız `getPointAtLength` + `getBBox`, ölçek de
çizilen saha dikdörtgeninden (28×15 m) türetilir. SVG çizgilerine `cLine-*` kimlikleri eklendi
(beyaz liste dışı her çizgili öğe "sahada karşılığı yok" diye raporlanır).

**Araç ilk koşuda paketin bulgularını birebir yeniden üretti** — teşhis doğrulandı, tahmine
dayanmadı:

| Ölçüt | ÖNCE (araç) | Pakette yazan | SONRA |
|---|---|---|---|
| 3 sayı yayının potaya uzaklığı — sapma | **2,370 m** | 2,35 m | **0,001 m** |
| yayın potaya en yakın noktası | 5,260 m | 5,26 m | 6,750 m |
| köşede | 7,63 / 7,66 m | 7,61 m | 6,600–6,783 m |
| SA çemberi ↔ yay | **kesişiyor** (253,3 · 206,8) | (251,5 · 205,2) | 0,715 m boşluk |

### F14-1 + F14-2 · Yay potaya değil DİP ÇİZGİYE merkezliydi
Kök neden bir SVG kuralı: **yarıçap iki uç arasındaki kirişi kapsamıyorsa tarayıcı yarıçapı
sessizce büyütür ve merkezi kaydırır.** Eski path'in iki ucu da dip çizgideydi (kiriş 403 px >
2×196), bu yüzden çizilen yay r=201,5 ve merkezi (56,4 · 250) oluyordu. Yeni path **köşe
düzlüklerinden** başlar (kenardan 0,90 m, y=55,02) — kiriş 389,96 < 2×199,41 olduğu için
yarıçap büyütülmez. Yay artık gerçekten potaya 6,75 m. F14-2 (çemberin yayı kesmesi) bunun
doğrudan sonucuydu, tek düzeltmeyle kapandı.

### F14-3/4/5/6 · Kalan çizim hataları
- Potanın önündeki **turuncu sahte daire + çizgi** (1,19 m çapında, gerçek çemberden 2,7 kat
  büyük) silindi; sahada karşılığı yok.
- **Köşe düzlükleri** eklendi (3,005 m, kenardan 0,90 m) — yay artık dipten dibe tek parça değil.
- Serbest atış çemberinin **dış yarısı dolu, iç yarısı kesikli** (eskiden yalnız dış yarı vardı
  ve o kesikliydi).
- Ölçüler FIBA'ya çekildi: boya 4,77×5,66 → **4,90×5,80 m**, orta yuvarlak 1,63 → **1,80 m**,
  yay altı 1,19 → **1,25 m**.
- **Ölçek eşitlendi (F14-6):** saha 827,2×440 px iken yatay 29,54 / dikey 29,33 px/m idi (%0,71
  gerginlik) — px'te dairesel çizilen her yay metrede elipsti. Yükseklik **443,14 px = 15 m**
  yapıldı (kenar çizgileri y 30/470 → **28,43/471,57**; `CRT_Y0/CRT_Y1` ve `realism-check`
  sınırları da güncellendi). Fark artık %0,00.
- `THREE_R` 196 → **199,41** (şut koordinatı üretimi ile çizgi aynı yarıçaptan beslenir).
  **Paket bu değişikliğin `band.js` hash'ini değiştirmesini bekliyordu — DEĞİŞMEDİ**
  (`fb393bdab878e699`): sabit `rand()` çağrılarının SAYISINI değil sonucun ölçeğini değiştirir,
  şut koordinatı da maç sonucuna geri beslenmez. `box-band --n=200` 11/11.

**geometri-check: 19/19 ✓** (sapma 0,001 m · yarıçap 6,751 m · köşe 0,900 m · boşluk 0,715 m ·
boya 4,900×5,800 · orta yuvarlak 1,800 · ölçek farkı %0,00 · yabancı çizim 0 · kesişme 0).

### F14-7 · Serbest atış, oyuncular yerleşmeden atılıyordu
Bekleme **yalnız şutörün** çizgiye uzaklığından hesaplanıyordu, oysa `_setFtFormation` **on
oyuncuyu** birden yerleştiriyor; şutör çizgiye yakınsa taban 0,85 sn'ye düşüyor ve sahanın öbür
ucundaki pivot koşarken atış yapılıyordu. Üç ayrı kusur çıktı, üçü de ölçümle bulundu:

1. **Ölçüt yanlıştı** → en geç gelen oyuncuya bakılır (taban 1,6 · tavan 4,5 sn). *2,8 → 5,9/10*
2. **Varış süresi "yol / hız" değil**: jeton son 24 px'i varış freniyle (≤12 px/sn) kapatır,
   yalnız o bölüm ~2 sn sürer. Fren payı eklendi. *5,9 → 6,6/10 (yetmedi)*
3. **İki çağıran vardı**: normal faul dalı düzeltilmişti, `_and1Sequence` eski formülü
   kullanmaya devam ediyordu. Bekleme tek kapıya alındı: **`_ftWaitSec()`**. *6,6 → 8,7/10*
4. **Kulvar noktaları 35-37 px aralıklıydı, çarpışma yarıçapı (`_PL_R`) 40** — üç jeton
   birbirini sürekli itiyor, hiçbiri hedefine oturamıyordu. Aralık 44 px'e açıldı, dizilim
   sarsıntısı (jit) 4 → 2. **8,7 → 9,3/10** ✓

| Ölçüt | ÖNCE (paket) | SONRA | Hedef |
|---|---|---|---|
| atış anında yerinde oyuncu | 2,8 / 10 | **9,3 / 10** | ≥ 9 ✓ |
| hedefe ortalama uzaklık | 2,02 m | **0,11 m** | — |
| en uzaktaki oyuncu | 7,68 m | **1,79 m** | — |
| atış anında jeton hızı | 85 px/sn | **8 px/sn** | < 15 ✓ |

Ölçüt `tools/sunum-check.js`'e **F14-7** olarak eklendi (topun elden çıktığı ilk kare;
serinin yalnız ilk atışı). *Araç hatası: ölçüm ilk sürümde hiç örnek yakalayamadı — top modu
`'hold'` sanılmıştı, gerçekte `'held'`.*

### Doğrulama
`geometri-check` 19/19 · `box-band --n=200` 11/11 · `band.js` hash **değişmedi** ·
`spacing-check` 10/10 · `anlatim-check --n=30` 13/13 · `faz10-check` 27/27 ·
`faz11-check` 13/13 · `m20-check` geçti · `sim-node --n=50` deterministik ·
`realism-check` saha dışı 0 · `visual-check` masaüstü+mobil 0 hata · `i18n-scan` temiz.
Script sürümü **?v=49** (`sw.js` SCRIPT_V=49).

> **Açık kalan:** `sunum-check` **M9** (outlet pası) aynı kodla dört koşuda %80 / %100 / %59 /
> %71 verdi — Bölüm B'nin B-2 maddesi. Ölçü hem gerçekten eşiğin altında hem de çok gürültülü;
> B-2'de ikisi birden ele alınacak.

## BÖLÜM B — BAĞIMSIZ DENETİMDE ÇIKAN GERİLEMELER (38. oturum)

`DENETIM-FAZ13.md` bölüm 2'deki beş madde. Her birinde önce **ölçtüm**, sonra düzelttim;
iki maddede kusur kodda değil ÖLÇÜ ARACINDA çıktı ve bu ayrım kayda geçirildi.

### B-1 · EN modunda canlı anlatım %37,5 Türkçeydi (KRİTİK — gerçek gerileme)
Denetimin tespiti doğruydu ve **hâlâ duruyordu**: yeni yazdığım canlı anlatım taraması
`%37,5` ölçtü. Sebep: FAZ 13'te eklenen 11 anlatım havuzu (`QSTART_LINES`, `QEND_LINES`,
`HALFTIME_LINES`, `SUB_LINES`, `FATIGUE_LINES`, `FOUL_TAIL`, `STEAL_LOSS`, `REB_DEF_SHORT`,
`REB_OFF_SHORT`, `CORNER3_MADE`, `CORNER3_MISS`) `localizeCatalogs()`'a **hiç kaydedilmemişti.**
Ayrıca şablonla (`${ad}`) kurulan cümleler sözlüğe giremez, **kalıp ister** — onlar da yoktu.

- 87 havuz satırının EN karşılığı `js/i18n-commentary.js`'e eklendi (karşılıklar motordan
  okunarak denetlendi; eksik giriş imkânsız), 11 havuz `localizeCatalogs()`'a kaydedildi.
- 33 yeni `I18N_PHRASES` kalıbı: faul ön eki/kuyruğu, serbest atışa gidiş cümleleri,
  değişiklik gerekçesi, devre arası/maç sonu, MVP satırı, bağlam önekleri.
- Kalıplar **`unshift`** ile dizinin başına konur: sondaki genel sözcük kalıpları
  (`/ribaund/→rebounding`) cümlenin ortasındaki tek kelimeyi çevirip *"reboundingu aldı"*
  melezini üretmesin. Denetimin en çok yakındığı satır tam olarak buydu.
- **Ders (yeni kural):** simge önekli metinlerde kalıp **simgeyi içermemeli** —
  `_splitIconPrefix` simgeyi soyup gövdeyi ayrı çevirdiği için `/⚡ Hızlı hücum! /` hiç
  eşleşmiyordu; `/Hızlı hücum! /` eşleşti.

`tools/i18n-scan.js`'e **canlı anlatım taraması** eklendi (60 sn maç, 300 ms'de bir satır
toplama, saat damgası + özel isim ayıklama) ve **%5 kapısı** kondu — araç sayfaları tarıyordu,
anlatım akışını taramadığı için bu gerileme görünmüyordu.
**Ölçüm: %37,5 → %14,3 (havuzlar) → %0,7 (kalıplar) → %0,0.** Tarayıcıda da %0,0;
tarayıcısız 20 maç · 4.897 olayda da **0**.

### B-2 · `sunum-check` M9 (%76) — gerileme KODDA DEĞİL, ÖLÇÜDE
Motorun kendi damgası eklendi: **çıkış pası kurulan 125 pozisyonun 125'inde hedef guard'dı
(rol 0: 106 · rol 1: 19).** Yani motor M9'u %100 yapıyordu. Araç ise %59-%100 arasında
salınan değerler veriyordu (aynı kodla dört koşu: %80 · %100 · %59 · %71).
Ölçünün iki kusuru vardı:
1. Pencere şutun **3 sn sonrasına** kadar uzanıyordu; o aralıkta gelen **normal post girişi**
   "uzun topu aldı" sayılıyor, arkasından guard'a dönmediği için "çıkış pası kaçtı"
   işaretleniyordu. Post girişi basketbolun kendisidir.
2. "Sonraki taşıyıcılardan **herhangi biri** guard" ölçütü gevşekti.

Yeni ölçüt dar ve **daha sıkı**: ribaunddan sonraki 2 sn içinde topu uzun aldıysa **bir
sonraki** taşıyıcı guard olmalı. **Sonuç: %93-%100.** (Denetimin "eski sürüm aynı komutla
geçiyor" gözlemi doğru ama yorumu eksikti: ölçü zaten kararsızdı, eski sürüm şansla geçmişti.)

### B-3 · `live-metrics` belgelenen komutta düşüyordu
İki ayrı kusur:
1. **Oran olay başınaydı.** Bir pozisyonun bütün olayları aynı maç saatini (`t`) taşır;
   aralarındaki fark 0 olduğu için atlanıyor, pozisyonun tüm saat tüketimi son olayla
   sonraki pozisyonun ilki arasına yığılıyordu. Oran artık **pozisyon başına** hesaplanır
   (aynı `q,t` olayları tek pozisyon; etiket pozisyonun sonucudur).
2. **Yayılım 3-4 örnekli tiplerden hesaplanıyordu** — ölçüm gürültüsü. Artık yalnız
   **≥8 örnekli** tipler kapıya girer; azları tabloda gösterilir. Medyan da tip
   medyanlarının medyanı değil **tüm pozisyonların** medyanıdır.
3. Bant, ölçü yeniden tanımlandığı için kalibre edildi (2-5 → **1,5-5**): pozisyon başına
   doğal değer daha düşüktür, çünkü koreografi çoğu pozisyonda `dtPos`in 0,30 katından uzun
   sürer.

**`live-metrics --ms=360000`: medyan 2,07× · yayılım 1,14× · kimlik %100 · ✓ tüm hedefler.**
(Öncesi: medyan 3,78-6,25× · yayılım 3,28× ✗)

### B-4 · `spacing-check` yalnız süzülmüş kareleri raporluyordu
**SÜZÜLMEMİŞ** üçüncü rapor bloğu eklendi: top ön sahadayken geçen **tüm** kareler (geçiş
dahil, ~680 kare). Dizilim hedefleri orada da **yargılanır ve tutuyor**: ikili 7,67 m ·
yayılım %33,9 · orta üçte bir %18,4 · boyada %63,5 · potaya 6,82 m.
**Markaj** ölçüleri o blokta bilinçli olarak **bilgidir**: geçiş karelerinde savunma potaya
dönüyor, adamına henüz yetişmemiştir; "topu tutana en yakın savunmacı < 1,8 m" bir hızlı
hücum karesinde gerçek basketbolda da sağlanmaz. Markaj, savunmanın kurulduğu karelerde
yargılanır — ana blok zaten odur.
(Denetimdeki 3,15 m / %39 değerleri artık **2,63 m / %74,7**; FAZ 13 düzeltmeleri tuttu.)

### B-5 · `season-loop` K2 kararsızdı — altından GERÇEK bir kusur çıktı
Kök neden aranırken şu bulundu: **canlı sahne katmanı maçın rastgele akışını tüketiyordu.**
`_inboundSpot`, serbest topun saçılma açısı, dizilim seçimi, ribaund çekişmesi… 41 çağrı
`Math.random`/`rand()` kullanıyordu. Animasyon karesi sayısı gerçek zamana bağlı olduğu için
**aynı tohumla iki koşu farklı sonuç veriyordu** — F13-3'te anlatım için konan kural sahne
katmanına uygulanmamıştı. Sahneye kendi PRNG'si verildi (`_scSeed`/`_sr`/`_srand`, maç
başında olay sayısından tohumlanır) ve 41 çağrı ona bağlandı.
**Kural (CLAUDE.md'ye girdi): canlı sahne katmanında `Math.random`/`rand()` yok.**
`band.js` hash'i **değişmedi** (`fb393bdab878e699`) — sahne çağrıları tarayıcısız üretime
zaten girmiyordu; değişen, canlı izlenen oturumun sonraki rastgeleliği bozmasıydı.

K2 ölçütü ayrıca **ortalama yerine medyan** üzerinden ve **en az 3 koşuyla** yargılanıyor
(2 koşu ortalaması eşiğin iki yanında salınıyordu: 1,94 · 1,97 · 2,06 · 2,21).
**`season-loop --n=3 --runs=3`: 6/6 ✓ · K2 koşular 2,88× · 1,43× · 1,54× → medyan 1,54×.**
> Not: koşular arası fark tohumdan gelir ve gerçektir; sayfanın kendi zamanlayıcıları
> harness'ın `await` aralarında rastgelelik tükettiği için iki özdeş çağrı hâlâ birebir aynı
> sayıyı vermez. Medyan bu gürültüye dayanıklıdır. Bir tohumda 2,88× görülmesi ekonomi
> dengesinin izlenmeye devam etmesi gerektiğini gösterir (denetimin 5. maddesi, bu brifin
> kapsamı dışında).

### Ek: `anlatim-check --freeze` F13-18 kararsızlığı
Denetim "panel DONMUŞ mu" diye bakıyordu; maç sayfa değişimi sırasında da aktığı için kutu
skor gövdesi meşru olarak değişiyor ve denetim ara sıra sebepsiz kırmızı yanıyordu (bir koşu
22/23, sonraki 23/23). Ölçüt "panel **SIFIRLANMIŞ** mı"ya çevrildi (gövde boşalmamalı, rakip
adı korunmalı) — gerileme belirtisi budur.

### Tam regresyon (Bölüm A + B sonrası)
`geometri-check` 19/19 · `anlatim-check --n=30` 13/13 · `--freeze` 23/23 ·
`spacing-check` 10/10 (+ süzülmemiş blok) · `mobile-check` 18/18 · `sim-node --n=50` ✓ ·
`schema-check` 17/17 · `season-loop --n=3 --runs=3` 6/6 · `faz7` ✓ · `faz8` ✓ ·
`faz10` 27/27 · `faz11` 13/13 · `m20` ✓ · `sunum-check --ms=420000` 4/4 (M9 · M12 · M14 ·
F14-7) · `visual-check` 0 hata · `live-metrics --ms=360000` ✓ · `box-band --n=200` 11/11 ·
`band.js` hash **`fb393bdab878e699`** (değişmedi) · `i18n-scan` canlı anlatım %0,0.
Script sürümü **?v=50** (`sw.js` SCRIPT_V=50).

## FAZ 15 — SAHA HAREKETİ KALİBRASYONU (39. oturum)

### Önce araç: `tools/hareket-check.js`
Depoda "oyuncular NE HIZLA hareket ediyor" sorusunu soran araç yoktu (`spacing-check` nerede
durulduğunu, `live-metrics` zaman senkronunu, `realism-check` ihlalleri ölçüyor). Yeni araç
sahneyi 25 Hz örnekler, her jetonun hızını **simülasyon saatinden** türetir (izleme hızından
bağımsız), konveks kabuk alanını (Andrew monotone chain) ve hız bandı dağılımını çıkarır.

### ⚠ ÖLÇÜM BRİFİN TEŞHİSİNİ DÜZELTTİ
Brif, jetonun px/sn değerini 29,54 px/m ile bölüp "oyuncular gerçeğin ~4 katı hızlı" diyordu.
**Araç, karşılaştırmanın yanlış büyüklükle yapıldığını gösterdi:** sahne maç saatini
**~2× sıkıştırarak** oynatıyor — ölçüldü, **1 sahne saniyesi ≈ 2,0 maç saniyesi**. Yani sahnede
6 m/sn görünen jeton maç saatinde 3 m/sn'dir.

| | Sahne saniyesi | MAÇ saniyesi | Gerçek (sensör) |
|---|---|---|---|
| FAZ 15 ÖNCESİ ortalama hız | 2,88 m/sn | **1,45 m/sn** | 1,54 – 1,60 |
| FAZ 15 ÖNCESİ en yüksek | 12,82 m/sn | **6,44 m/sn** | sprint > 7 |

Yani oyun maç saatinde **zaten gerçekçi hızdaydı, hatta bir tık yavaştı.** Brifin §4.1'deki
mutlak yavaşlatması (`130+80` → `62+38`) uygulandığında ölçüm şunu gösterdi: jetonlar
pozisyon bitmeden yerlerine varamıyor ve **FAZ 11 kapıları düşüyor** — orta üçte bir %16,5 →
%25,8 · ball-you-man %86 → %74 · potaya uzaklık 6,4 → 7,1 m · kaplanan alan 57,6 → 39,5 m².
Sebep basit: mesafe sabit, süre sıkıştırılmış; gerçek m/sn ile hareket eden oyuncu 28 m'lik
sahayı sıkıştırılmış sürede geçemez.

> **Ders (FAZ 13'ün "yay yarıçapını nitelikten okumak" hatasıyla aynı sınıf):** bir oyun
> değerini gerçek dünyayla kıyaslamadan önce **hangi zaman/uzunluk tabanında** olduğunu ölç.

**Bu yüzden brifin §4.1 mutlak ölçeği UYGULANMADI** (brif §2: "Bir varsayım tutmuyorsa
uyarla, kodu zorlama"). Uygulanan, brifin asıl değerli kısmı olan **kademe yapısıdır.**

### Ölçümün BULDUĞU gerçek kusur: hareket "ya dur ya tam gaz"
Dağılım çift tepeliydi: zamanın **%59'u durma, %22'si sprint bandı, arada neredeyse hiç
hafif koşu yok (%6)**. Sebep: `maxV` ataması 40 yerde vardı ve neredeyse hepsi `sprintV`ydi.

**F15-1 — dört kademe.** `_V_TIER=[0.42,1.00,1.35,1.62]` + `_URG` + `_setUrg(p,urg)`.
`baseV` = JOG; KOŞ ve SPRINT çarpanları **eskiden zaten kullanılan** 1,35 ve 1,62'dir —
yeni olan, altına eklenen **YÜRÜ (0,42)** kademesi ve `maxV`'nin artık her yerde duruma göre
verilmesidir: serbest topu kovalama/hızlı hücum SPRINT · şutör, kesici, perdeci, top savunması,
geçişte savunma KOŞ · yardım savunması, dizilime dönüş JOG · ölü top, oyun durması YÜRÜ.
Tutarsızlık da giderildi: `sprintV` iki ayrı yerde `bv*1.35` ve `bv*1.62` idi, birleştirildi.

**F15-2 — herkes her pozisyonda hareket etmesin.** `_hedefAta()`: yeni dizilim noktası
26 px'ten yakınsa oyuncu **yerinde kalır** ve YÜRÜ kademesine düşer. (34 px denendi, dizilim
açıklığını 57,6 → 39,5 m²'ye düşürdüğü için 26'ya çekildi.)

**Yan düzeltmeler (ölçümle bulundu):**
- `_defBehind` payı 8 → 22 px: savunmacı adamının pota tarafında yalnız 0,27 m kalıyordu,
  hareket gecikmesi bunu yiyordu (ball-you-man %87 → %78'e düşmüştü).
- `_defGap` 56 → 34 px: yardım sarkması fazlaydı, savunma ortada toplanıyordu
  (kapladığı alan 29,5 m², gerçek 32,3).
- Savunmacının kademesi **adamınınkinden düşük olamaz** (jog eden savunmacı koşan adamını
  kaybediyordu); pota tarafında değilse toparlanma KOŞ'tur.
- Üst üste binme itmesi kare başına sınırlandı (0,08 sn'de ~1 m'lik sıçrama üretiyordu).
- `_PL_MAXV` 320 → 150 (yedek değer sprint sınırının üstündeydi).
- Serbest atış dizilimi YÜRÜ ile denendi: bekleme 5-6 sn'ye çıkıp F14-7 düştü (yerinde
  6,2/10). Gerçek maçta oyuncular kulvara **tırısla** gider → JOG. `_ftWaitSec` fren payı
  da 12 → 10'a (varış freni F15-1'de 12 → 10 olmuştu) düzeltildi. **F14-7: 9,8/10.**

### Ölçüm tablosu (aynı tohum, aynı araç, MAÇ saati tabanında)

| Ölçüt | ÖNCE | SONRA | Hedef | Gerçek |
|---|---|---|---|---|
| ortalama hız | 1,45 | **1,36** | 1,3-2,1 ✓ | 1,54-1,60 |
| en yüksek anlık hız | 6,44 | **6,24** | < 9,5 ✓ | sprint > 7 |
| zaman: hafif koşu | %11,5 ✗ | **%15,3** ✓ | %12-38 | %5,6-36,3 |
| zaman: koşu | %23,4 | **%17,5** ✓ | %8-25 | %4,5-33,2 |
| zaman: sprint | %0,0 | %0,0 ✓ | %0-6 | %0,3-8,5 |
| hücum ikili mesafe | 7,97 m | **7,81 m** ✓ | 6,5-9,0 | **7,96** |
| savunma ikili mesafe | 5,69 m | **6,02 m** ✓ | 5,0-7,0 | **6,17** |
| hücum kabuk alanı | 57,6 m² | **55,2 m²** ✓ | 40-65 | **53,5** |
| savunma kabuk alanı | 29,5 m² | **32,6 m²** ✓ | 22-42 | **32,3** |
| SAHNE bandı (dur/jog/koş/sprint) | 59/6/13/22 | **57/10/17/16** | — | çift tepe azaldı |

Dört açıklık ölçüsünün **dördü de gerçek değere yaklaştı.** Hız dağılımının çift tepeliliği
azaldı (jog %6 → %10, sprint %22 → %16 sahne bandında).

**Tutmayan iki ölçüt bilgi olarak raporlanıyor, sebebi araçta yazılı:**
`medyan hız` (0,35 vs 1,1-1,8) ve `durma/yürüme payı` (%67 vs %35-60). İkisinin de sebebi
aynı: sahne yalnız **senaryolu** hareketi canlandırır — yerine varmış jeton tam olarak durur,
ölü top ve mola anları canlandırılmaz. Gerçek oyuncu hiç durmaz. Bunu kapatmak için boştaki
salınım genliği 1,8 → 5,5 px denendi; medyanı **ölçülebilir biçimde değiştirmedi** (0,41)
ve geri alındı — ölçülemeyen değişiklik kod kirliliğidir.

### F15-4 · `spacing-check` eşiği
"Ortalama ikili mesafe ≥ 4,5 m" → **≥ 5,8 m** (gerçek ölçüm 7,96 m; 4,5'i geçmek gerçekçi
olmak anlamına gelmiyordu). Diğer eşiklere dokunulmadı. Yeni eşikle **10/10 geçiyor** ve
değerler FAZ 15 öncesinden daha iyi (ikili 8,04 · yayılım %36,5 · orta üçte bir %16,5 ·
ball-you-man %86,2 · potaya 6,40 m).

### Doğrulama
`band.js` hash **`fb393bdab878e699` — değişmedi** · `box-band --n=200` 11/11 ·
`sim-node --n=50` aynı tohum aynı maç ✓ · `sunum-check --ms=420000` **4/4** (F14-7 9,8/10) ·
`spacing-check` 10/10 · `hareket-check` 9/9 yargılanan hedef ✓ · `geometri-check` 19/19 ·
`realism-check` saha dışı/ışınlanma/üst üste binme 0 · `anlatim-check` 13/13 · `--freeze`
23/23 · `live-metrics` ✓ · `faz7/8/10/11` ✓ · `m20` ✓ · `schema` 17/17 · `mobile-check`
18/18 · `visual-check` 0 hata · `i18n-scan` %0,0. Script sürümü **?v=51**.

## FAZ 16 — CANLI TEST BULGULARI (40. oturum)

Üç madde canlı tarayıcı testinde ölçülerek bulundu; her birinin kök nedeni kodda tespit
edildi ve düzeltme **ölçümle** doğrulandı.

### MADDE A · YÜRÜ kademesi ölüydü (%0)
FAZ 15 dört hareket kademesi getirmişti ama canlı ölçümde oyuncuların **%88,5'i her an
KOŞ/SPRINT** kademesindeydi, YÜRÜ **%0,0**. İki kusur birlikte çalışıyordu:

- **A1 — kapı neredeyse hiç çağrılmıyordu.** `_hedefAta()` yalnız 4 yerden çağrılıyor,
  buna karşılık 41 doğrudan `p.tx=` yazımı kapıyı atlıyordu.
- **A2 — kapının koşulu kendi çağrılarını eliyordu.** `urg<=_URG.JOG` koşulu, KOŞ ile
  yapılan çağrılarda yürüme dalını **matematiksel olarak imkânsız** kılıyordu.

**Düzeltme:** kapı `_setFormation` · `_setFtFormation` · `movePlayersForEvent` içindeki tüm
dizilim yazımlarına yayıldı (13 çağrı; şut koreografisi, top takibi ve çizgi dışı mantığı
brifte belirtildiği gibi dışarıda bırakıldı), koşul `urg<_URG.SPRINT` oldu, eşik 26 → **20 px**.

> **Ölçüm bir üçüncü kusuru daha gösterdi:** kapı düzeldikten sonra bile YÜRÜ %3,7'de kaldı,
> çünkü **kademe yalnız ATAMA anında veriliyordu** — yerine varmış oyuncu pozisyon boyunca
> koşu kademesini taşımaya devam ediyordu. Hareket döngüsüne "hedefine varan jeton kademesini
> düşürür" kuralı eklendi (SPRINT ve koreografi kilidi muaf). **%3,7 → %41,3.**

> **İkinci ders:** kapının eski hâli hedefi jetonun BULUNDUĞU noktaya sabitliyordu
> (`p.tx=p.x`). Markajdaki savunmacı böylece pota tarafına düzeltilmiş hedefini hiç almıyor,
> zamanla hattan kayıyordu (ball-you-man %86 → %83). Artık **hedef her zaman korunur, yalnız
> kademe düşer.** Kalan farkı savunmanın ölü bölgesi kapattı (12/30 → **8/20 px**): savunmacının
> hedefi 12 px'e kadar bayat kalabildiği için adamı hareket edince kısa süre pota tarafını
> kaybediyordu. **%86,8** (FAZ 16 öncesi %86,2).

| Kademe | Canlı test (önce) | Başsız ölçüm (önce) | SONRA | Hedef |
|---|---|---|---|---|
| YÜRÜ | %0,0 | %3,1 | **%41,3** | %20-45 ✓ |
| KOŞ+SPRINT | %88,5 | %54,9 | **%42,0** | < %55 ✓ |
| SPRINT | %35,2 | %9,3 | **%9,1** | %5-20 ✓ |

### MADDE B · Anlatımda ardışık tekrar
Canlı ekranda aynı cümle arka arkaya iki kez basılmıştı. **Motor temiz:** 40 maç / 9.887
metinli olayda ardışık aynı metin **0**. Hata sunum katmanındaydı: `paint` hem
`movePlayersForEvent` geri çağrısı olarak veriliyor hem de `if(!_h.paint) paint()` ile
doğrudan çağrılıyordu; `_evH.paint` bayrağı bazı yollarda (`_markPainted()` çağrılmadığında)
kurulmuyordu.

**Düzeltme:** bayrak yerine **olay kimliğine dayalı tekillik**. `addComment(txt,type,key)`
üçüncü bir anahtar alır; `paint` her olay için `i<olayIndeksi>:<mod>` anahtarı geçer
(`main`/`pre`/`res` ayrı). Anahtar `mState._logged` kümesinde tutulur ve **maç başında
sıfırlanır**. `mState.idx` paint anına kadar ilerleyebildiği için indeks olayın işlendiği
karede **sabitlenir** (`_evIx`). Kullanıcı eylemleri (taktik, mola, değişiklik) bilerek
tekrarlanabilir — onlara benzersiz anahtar geçirildi, bastırılmazlar.

**Doğrulama:** 4 dakikalık canlı maç, DOM'da **198 anlatım satırı · ardışık tekrar 0 ·
konsol hatası 0**. `anlatim-check --freeze`'e iki kalıcı denetim eklendi (ardışık tekrar +
"aynı taktik iki kez → iki satır"), **25/25**.

### MADDE C · Anlık yığılma ölçülmüyordu
`spacing-check` ORTALAMA ölçüyor; ortalama iyiyken tek tek kareler kötü olabiliyordu
(canlı testte izlenen 4 karenin 2'sinde 6-8 oyuncu üst üste). `hareket-check`'e üç ölçüt
eklendi: **en kötü kare ikili mesafesi (p5)**, **yığılma oranı**, **kademe dağılımı**.

> **Tanım düzeltmesi:** "bir oyuncunun 2 m çevresinde iki kişi" ölçütü adam adama savunmayı
> yığılma sayıyordu (savunmacı adamının ~1,85 m'sinde durur — `spacing-check` bunu ŞART
> koşuyor) ve %51,5 veriyordu. Ölçüt **karşılıklı üçlü** yapıldı ve ayrıca **aynı takımdan
> iki oyuncu** koşulu eklendi: kusur, iki takım arkadaşının aynı 2 m'ye sıkışmasıdır.

**Ölçüm gerçek bir kusur gösterdi: %25,3.** Sebep, çarpışma yarıçapının (`_PL_R`=40 px =
1,35 m) takım arkadaşları için de aynı olmasıydı. **Düzeltme:** aynı takım için ayrı yarıçap
`_PL_R_TAKIM` = **62 px (2,10 m)**; rakip için 40 px korunur (savunmacı adamını 1,8 m'den
yakın kapatmalı — `spacing-check` şartı). **%25,3 → %4,0.**

| Ölçüt | ÖNCE | SONRA | Hedef |
|---|---|---|---|
| en kötü kare — ikili mesafe (p5) | 4,35 m | **4,21 m** | > 4,0 ✓ |
| yığılma (aynı takımdan 2 oyuncu < 2 m) | %25,3 | **%4,0** | < %8 ✓ |

### Doğrulama
`band.js` hash **`fb393bdab878e699` — değişmedi** · `sim-node --n=100 --seed=42` →
**86.7-80.7 · 251 olay/maç · tohum 42 → 92-64** (FAZ 15 referansıyla birebir aynı) ·
`box-band --n=200` 11/11 · `spacing-check` **10/10** · `hareket-check` **14/14** ·
`sunum-check` 4/4 (F14-7 9,8/10) · `anlatim-check` 13/13 · `--freeze` **25/25** ·
`live-metrics` ✓ · `realism-check` 0 ihlal · `geometri-check` 19/19 · `faz7/8/10/11` ✓ ·
`m20` ✓ · `schema` 17/17 · `mobile-check` 18/18 · `visual-check` 0 hata · `i18n-scan` %0,0.
Script sürümü **?v=52**.

---

## FAZ 17 — Milliyet sistemi + isim havuzları + portre havuzu (2026-08-31)

Baz commit `f503c44` (FAZ 16). Brifin sırası izlendi: önce kod (§1-7), sonra portre boru
hattı (§8), en son görsel üretimi (§9).

### 1. Milliyet — çekirdek kural

> **Lig kurulurken içindeki her oyuncu, o ligin ev ülkesinden olur.** Yabancılar yalnızca
> sezon başladıktan sonra transfer yoluyla gelir.

**Bulunan hata:** `genPlayer(poz, tr=false)` — ikinci parametre kod tabanında hiçbir yerden
`true` geçilmiyordu, beş çağıran da `false` veriyordu. Ülke `ch(ULKELER)` ile rastgele
seçiliyor, Türkiye'nin şansı **1/26 ≈ %3,8** oluyordu: 15 kişilik kadroda ortalama **0,6
Türk**. `TR_ULKE` ölü koddu.

**Yapılan:** ikinci parametre boolean'dan ÜLKE'ye çevrildi (`string` → o ülke, `true` →
geriye dönük Türkiye, `null/false` → küresel rastgele). `ULKE_BUL(ad)` yardımcısı ve tek
kaynak `LIG_EV_ULKE='Türkiye'` sabiti eklendi — `'Türkiye'` dizgisi artık koda gömülmüyor.
`genRoster`, `genDraftProspect`, `genSingleYouth` (altyapı) `LIG_EV_ULKE` geçirir;
`genPlayerBounded` ülke parametresi aldı ve **varsayılanı bilerek Türkiye YAPILMADI** —
çağıran açıkça versin, ileride başka lig eklenince sessizce Türk üretmesin.

**Determinizm kararı (önemli):** `genPlayer` ülke sabitlense bile `ch(ULKELER)` çekilişini
**yine yapar**, sonucu sonra ezer. Çekilişi atlamak maçın rastgele akışını bir adım kaydırır
ve `band.js` hash'i ile `sim-node` ortalamaları değişirdi. F13-3 (anlatım) ve B-5 (sahne)
derslerinin milliyet karşılığı.

### 2. Ülke listesi 26 → 43

`ULKELER`'e 17 ülke eklendi (Rusya, Ukrayna, İsrail, Letonya, Bosna-Hersek, Karadağ,
Gürcistan, Çekya, Finlandiya, Estonya, Macaristan, Bulgaristan, Romanya, Kuzey Makedonya,
Arnavutluk, Slovakya, İsveç). Her biri için isim havuzu (§3) ve portre kovası (§8) yazıldı.

### 3. İsim havuzları — 256 → 21.000 kombinasyon

`NAME_POOLS` `js/state.js`'ten **yeni `js/names.js`** dosyasına taşındı (boyut) ve
`state.js`'ten ÖNCE yüklenecek şekilde script sırasına, `sw.js` `JS_FILES`'a, `sim-node` ve
`anlatim-check` modül listelerine eklendi.

Ülke başına **16×16 = 256** kombinasyondan **150 ad × 140 soyad = 21.000**'e çıkarıldı;
43 ülke, **12.982 dizgi**. Sezon 1'de tek başına ~285 Türk isim üretiliyor, 20 sezonda
~1.500 — eski havuz ilk sezonda tükeniyor ve "her takımda aynı soyad" hissi veriyordu.

**Steam riski temizlendi:** tek bir yaşayan profesyonelle özdeşleşmiş soyadları havuzlardan
çıkarıldı (Antetokounmpo, Dončić, Jokić, Sabonis, Valančiūnas, Gilgeous, Yabusele, Varejão,
Yao+Ming, Campazzo, Sochan, Hachimura vb.). Yerlerine o ülkede nüfus düzeyinde yaygın,
kimseye özgü olmayan adlar kondu. Yaygın soyadları (Yılmaz, Kaya, Silva, Müller, Kim,
Nowak) kaldı — bunlar bir kişiyi işaret etmez.

Eski havuzlarda ayrıca kadın adları ve **soyadı olarak kullanılmış ilk isimler** vardı;
bunlar da ayıklandı. Çin ve Kore soyad listeleri baştan yazıldı (eski liste uydurma
`Xu Shi` / `Kang Hee` türü kayıtlar içeriyordu).

### 4. Bot takımlar — yabancı sınırı

Bot kadro derinliği ve **bot transferi** (`botClubTransfer`, `js/economy.js`) ev ülkesi
ağırlıklı: `BOT_YABANCI_ORAN=0.10`, `BOT_YABANCI_MAX=2`. Amaç botların marketteki iyi
yabancıları tüketmemesi. Bot transferinde değiştirilen oyuncu sayımdan düşülür — yoksa
yabancıyı yabancıyla değiştiren bot tavana takılıp bir daha asla yabancı alamıyordu.

Karar `prChance` ile deterministiktir (yeni `prUnit`/`prChance`/`prPick`/`prWeighted`
yardımcıları, `js/state.js`) — hash'ten türer, rastgelelik tüketmez.

> **`prUnit` karıştırıcısı — ölçümle bulundu.** İlk sürüm doğrudan `hash32` kullanıyordu.
> `milliyet-check` bot yabancı oranını **%2,3** ölçtü (hedef ~%10). Sebep: djb2-xor son
> karakteri XOR'lar, bu yüzden yalnız son karakteri değişen anahtarlar (`…|yabanci|0..9`)
> aynı dilime düşüyor. Kapı doğru oranda (**%11,5**) açılıyor ama açılışlar birkaç takımda
> yığılıp 2 yabancı tavanına çarpıyor, **183 açılış boşa gidiyordu**. `prMix` (murmur3
> finalizer türevi) eklendi → **%8,8**, desil sapması %1.

### 5. Draft ve altyapı — %100 yerli

`genDraftProspect` ve `genSingleYouth` artık `LIG_EV_ULKE` geçirir (altyapıdan gelirler).

### 6. Transfer marketi

Kota **yok** — havuz OVR'ye göre dolar, ülke fark etmez; üst sıraların yabancı ağırlıklı
olması istenen davranıştır. Kullanıcı kadrosunda da sınır yok (sınır yalnız botlarda).
Market ekranına **Tümü / Yerli / Global** filtresi eklendi (`filterMarketUlke`); mevcut
mevki filtresi ve OVR/Maaş sıralamasıyla birlikte çalışır, seçim `G.marketUlkeFilter`'da
durduğu için ekran yenilenince kaybolmaz. i18n: `Uyruk:` · `Yerli` · `Global`.

### 7. Koçlar ve kayıt

`KOC_T` kayıtlarına `ulke` alanı eklendi (varsayılan ligin ev ülkesi); `coachAvatar`
ülkeyi portre seçimine geçirir ve koç portresi **daima kıdemli bandından** gelir. Eski
kayıtta alan yoksa okurken `LIG_EV_ULKE` atanır (`faz17KocUlkeDoldur`).

Kayıt şeması sürümü yükseltildi: `charazay_game_save_v2 → v3`, `charazay_tbl_v4 → v5`.
**Göç kodu yazılmadı** (brif §7.2) — eski anahtar sessizce yok sayılır.

### 8. Portre sistemi

Eski 201 JPEG **silindi** (`git rm`, commit `17af1b9`'dan geri alınabilir). Yeni şema:
`<kova>_<yasBandi>_<sıra>.jpg`, 7 kova (`akd siyah kuz beyaz afr lat asya`) × 2 bant
(`genc` 18-25 / `kidemli` 26-36). `manifest.json` sürüm 2, kova×bant sayılarını tutar ve
**üretim betiği yazar** — `PORTRAIT_POOL_SIZE=201` sabiti kaldırıldı, oyun manifest'i okur.

`ULKE_KOVA` (43 ülke, her dağılımın toplamı 1,0) ülkeyi kovaya dağıtır. Seçim
`prWeighted` ile deterministiktir.

> **Portre BİR KEZ seçilir.** `portreBand` oyuncu üretilirken dondurulur (yaş artsa da
> yüz değişmez), `portreDosya` ilk okumada yazılır ve bir daha hesaplanmaz. Sebebi:
> manifest'e yeni parti eklendiğinde modulo kayar; dosya adı oyuncuda saklanmasaydı
> kayıtlı kariyerlerdeki **bütün yüzler değişirdi**. Havuza dosya eklerken yeniden
> numaralama yok.

**Yedek zinciri kısaldı:** `yerel dosya → AYNI kovadan komşu dosya → SVG`. Canlı görsel API
basamağı (`playerPortraitPhotoUrl`, `navigator.onLine`) ve `PORTRAIT_ETH`/`PORTRAIT_JERSEY`
sabitleri **silindi** — çevrimdışı oyun ve Steam paketi için. Komşu dosya daima aynı kova +
aynı bant içinden gelir (yoksa Türk oyuncuya Asyalı yüz düşerdi).

`playerAvatarImgAttrs` artık `loading="lazy" decoding="async"` üretir (3.000 portrelik
havuzda kadro/market ekranı bunsuz ağırlaşır) ve yedek zinciri için `data-av-file` taşır.

**Üretim boru hattı:** üret → fon parlaklığını eşitle (hedef ~120) → 256×320'den 256×250'ye
dar kırp → bozuk/bulanık/yüzsüz/aşırı benzer olanı ele → manifest'i güncelle. İstem
kilitlendi: fon TEK (`neutral medium gray studio background`), giysi TEK AİLE (sade koyu
lacivert forma) — eski havuzda fon parlaklığı 10,9-155,2 arasında geziniyordu (14 kat) ve
8 farklı giysi vardı. Elenen dosyanın numarası atlanmaz.

**Lisans notu** `tools/generate-portraits.py` başına ve `assets/portraits/README.md`'ye
yazıldı: pollinations.ai'nin ticari kullanım lisansı belirsiz; kullanıcı bunu bilerek
kabul etti (önce web, Steam öncesinde gerekirse kaynak değişir). Bu yüzden üretim adımı
ayrı bir fonksiyonda durur — kaynak değişirse boru hattının geri kalanı aynı kalır.

### Kendi inisiyatifimle doldurulan boşluklar

1. **`prUnit` karıştırıcısı** — yukarıda; ölçüm olmasa kural sessizce yanlış çalışacaktı.
2. **Bot transferi (§4.3)** — brif "varsa bul ve uygula" diyordu; `botClubTransfer` vardı,
   aynı kural uygulandı.
3. **17 yeni ülkenin EN çevirisi + eksik kalan `Türkiye`** — `I18N_PHRASES`'e eklendi;
   yoksa EN modunda "Romanya · 24 yrs" melez satırları kalıyordu.
4. **i18n sınır hatası** — `\b` ASCII tabanlıdır, `ğ`/`ç` sözcük karakteri sayılmaz:
   `/\bKaradağ\b/` ve `/İsveç\b/` **hiç eşleşmiyordu**. Sınırlar Türkçe harfleri kapsayacak
   şekilde açık yazıldı. Ayrıca `Türkiye Basketbol Ligi` kalıbı `Türkiye`'den ÖNCE konuldu
   — yoksa `TBL_COMP_NAME` "Turkey Basketbol Ligi" melezine dönüyordu (B-1 dersi).
5. **`tools/generate-portraits.js`** — bu makinede Python kurulu değil ve `node_modules`
   içinde görüntü kütüphanesi yok. `.py` sürümü brifin istediği gibi yazıldı; çalışan Node
   karşılığı Playwright'ın headless Chromium'unda `<canvas>` ile aynı boru hattını uygular.

### `anlatim-check` ölçüm düzeltmesi — dikkat

`anlatim-check` "benzersiz kalıp / olay" ölçütü **şişiyordu**. İsim silme kalıbı ASCII+TR
harflerine bakıyordu; `č/ć/š/ž/ū` geçen soyadları (Jokić, Šarić, Valančiūnas) **yarım**
siliniyor, artan harf her satırı benzersiz yapıyordu — ölçülen şey şablon çeşitliliği değil
**oyuncu adı çeşitliliğiydi**. Kalıp Unicode'a çevrildi.

Gerçek değerler: **FAZ 16 tabanı %82,5 · FAZ 17 %82,7**. Yani %85 kapısı hiçbir zaman
gerçekten geçilmemişti; eksik **anlatım şablonu sayısındadır** ve FAZ 13'ten kalmadır.
FAZ 17 gerilemesi değil — taban değerin bir tık üstünde. **Kapı bilerek düşürülmedi**:
doldurulacak açık görünsün. Bu, FAZ 17 kapsamı dışında ayrı bir iş.

### Doğrulama

`sim-node --n=100 --seed=42` → **87,2-80,0 · 249 olay/maç**, hata 0, `G durumu değişmedi:
EVET`, aynı tohum aynı maç ✓. Brif referansı 86,7-80,7 · 251 → **±1,5 bandında**.

> **Tohum 42 skoru 92-64 → 90-67 değişti; bu beklenen ve kaçınılmaz.** Milliyet seçimi
> akışı kaydırmıyor (çekiliş korunuyor), ama **isim havuzu 256 → 21.000 kombinasyona
> çıkınca** `ensureUniquePlayerNames` içindeki ad çakışması yeniden-çekilişleri neredeyse
> sıfıra indi ve rastgelelik akışı kaydı. Aynı sebeple `band.js` hash'i
> `fb393bdab878e699` → **`89b5436137c1da14`** oldu (CLAUDE.md güncellendi).

`milliyet-check` ✓ (lig %100 Türk · draft 50/50 · altyapı 60/60 · bot yabancı %8,8, takım
başına ≤2 · market 42 ülke) · `portre-check` ✓ · `isim-check` ✓ (43 ülke, 5.000 çekilişte
%99,84 benzersiz) · `schema-check` 17/17 · `visual-check` **0 konsol hatası** (masaüstü +
mobil) · `i18n-scan` canlı anlatım %0,0, çevrilmemiş düğüm 1793 → **1352** (kalanların
tamamı özel isim) · `faz10-check` 27/27 · `sunum-check` 4/4 · `anlatim-check` 12/13
(yukarıdaki ölçüm notu). Script sürümü **?v=53**, `sw.js` `SCRIPT_V=53`.


---

## FAZ 17B — Forma markaları, bant dağılımı, market uyruğu (2026-08-31)

Baz commit `7dea345`. FAZ 17'nin ilk 100'lük partisi incelenince üç kusur çıktı; ikisi
üretim istemiyle, biri oyun mantığıyla ilgiliydi.

### 1. Forma markaları — en öncelikli

İlk 100 portrede **"LAKERS"** açıkça okunuyordu; ayrıca "LAKEAN" + Lakers renk düzeni,
"OKLD", **Nike swoosh'u** ve bir sürü bozuk sahte yazı ("TIURV", "DAKIEIRI", "JUKTEIG")
vardı. NBA takım adı ve Nike tescilli marka — Steam'e çıkacak üründe kabul edilemez.

İstem kilitlendi (düz, tamamen boş lacivert forma + `?negative=` parametresi), **ama
istem tek başına yetmedi**: yeni istemle üretilen ilk 5 karenin 4'ünde hâlâ yazı/amblem
vardı. Bu yüzden iki katman eklendi:

- **Kadraj zoomu** (`ZOOM=1.22`, `KADRAJ_UST=0.06`): çerçeve göğsün üstünde biter,
  markanın basıldığı alan büyük ölçüde dışarıda kalır. Çıktı boyutu yine 256×230.
- **Ölçülen eleme**: `MAX_FORMA_PARLAKLIK=115` (beyaz/açık forma) ve
  `MAX_YAZI_ENERJI=0.030` (kumaş tonundaki bölgede Laplace kenar enerjisi).

> **Ölçüt seçimi ölçümle yapıldı.** Naif "medyandan sapan piksel oranı" TERS sonuç
> veriyordu: temiz kare %43,9, yazılı kare %25,3 — beyaz yaka biyesi ve arka plan boşluğu
> temiz kareyi şişiriyordu. Doğru ayrım "kumaşın kendi tonundaki bölgede güçlü yerel
> gradyan" — düz kumaşta sıfıra yakın, basılı yazıda yüksek.
> Kalibrasyon (4 kare): forma 14 / %0,31 temiz · 86 / %1,99 temiz · 144 / %2,31 gri forma
> + arka planda top · 212 / %3,77 beyaz forma + swoosh + yazı. Kapılar bu ayrımı yapıyor.

Kırpma 256×250 → **256×230**. Arayüzdeki tüm portre kutuları `object-fit:cover` ve
portre oranlı (70×88, 52×66, 44×56, 34×34 …) olduğu için kaynağı kısaltmak doğrudan
görünen forma payını azaltır; bozulan yer yok. Tek intrinsic-oranlı öğe
`.player-modal-hero` — o da kısalır, sorun değil.

### 2. Basketbol topu
`no ball, no basketball, empty hands, hands not visible` istemde; `ball, basketball,
holding object` negatif istemde.

### 3. Yaş bandı dağılımı
İlk partide **7 kovanın 5'inde hiç kıdemli portre yoktu** (kuz/beyaz/afr/lat/asya).
Kural: (a) bir kovada ikinci görsel daima diğer banda gider — hiçbir bant 0'da kalmaz,
(b) sonrası %45/%55 hedefinden geri kalan bandı doldurur. `portre-check`'e kapı eklendi.

### 4. Transfer marketi yerli oranı
`milliyet-check` ölçtü: **200 market oyuncusunun 1'i yerli (%0,5)**. Sebep FAZ 17'de
markete "küresel rastgele" denmesiydi — Türkiye 43 ülke içinde 1/43. Artık yerli payı
sezona bağlı (`marketYerliOran`: %55 → %25) ve yabancıya OVR primi var.

Ölçülen: sezon 1 **%58,8** yerli → sezon 3 %42,5 → sezon 6 **%25,8**.
OVR sıralamasında ilk %20'de yabancı **%60**, son %20'de **%6**. Yabancı–yerli OVR farkı
**4,1** (erişilemez değil).

### 5-6. Üretim ve SERVİS SINIRI — kritik bulgu

> **pollinations anonim kullanımda IP başına TEK istek kabul ediyor:**
> `{"error":"Too Many Requests","message":"Queue full for IP: … 1 requests already
> queued (max: 1). Get unlimited access at https://enter.pollinations.ai"}`

Yani **paralellik mümkün değil**. Ölçülen süre **~43 sn/görsel**; eleme kapılarıyla
birlikte kabul oranı ~%50 → **~90-100 sn/portre**. `--jobs` bayrağı 1'e kelepçelendi,
sabırlı 429 geri çekilmesi (30/60/90/120 sn) ve istekler arası 2,5 sn nefes payı eklendi.

Bu hızda **3.000 portre ≈ 75-80 saat** sürüyor — tek oturumda bitmiyor.
`tools/portre-uret-hepsi.js` bu yüzden yazıldı: en geride kalan kovadan doldurur,
**her 100 portrede commit + push** eder, kaldığı yerden devam eder, art arda 3 boş tur
olursa durur (brif §6). Kesinti hâlinde iş kaybolmaz, koşu tekrar başlatılabilir.


---

## FAZ 19 — Canlı site gezisi bulguları (2026-08-31)

Baz commit `a7a76b8`. Kaynak: basketlig.vercel.app'te kayıtlı kariyerle yapılan gezi.

### 1. Lig puan durumu tamamen bozuktu (en öncelikli)

Puan durumunda 20 satırdan yalnız 3'ünde veri vardı, kullanıcının takımı tabloda hiç
görünmüyordu, Ana Panel'de lig sırası "-" kalıyordu.

**Kök neden: iki ayrı takım evreni.** Ekran TBL deposundaki adları (`sub.teams` →
`genLigTeams`), istatistik ise `G.season.standings`'i kullanıyordu. Sezon KURULURKEN
ikisi aynı (`startLeagueSeason`: `names = sub.teams`), ama iki depo ayrı: TBL adı
localStorage'da, sezon oyun kaydında. Biri yenilenince (FAZ 17'de `TBL_STORAGE_KEY`
v4 → v5) TBL deposu yeni rastgele adlarla baştan üretiliyor, sezon hayatta kalıyor.
Kesişim 3 isimdi — veri görünen 3 satır tam olarak onlardı.

**Çözüm — sezon otoritedir.** `ligAdlariniOnar()` (js/league.js) depoyu sezona göre
eşitler; `buildLeagueRows` her çizimden önce çağırır. Onarım çalışamazsa bile sezonda
olup depoda olmayan takım tabloya EKLENİR (kullanıcının takımı bile kayboluyordu),
depoda olup sezonda olmayan verisiz satır düşer. Sıra artık tek yerden okunuyor:
`userLigSirasi()` — Ana Panel kartı, başkan hedefi ve lig tablosu aynı sayıyı görür ve
kart lig sayfasına hiç uğranmasa da dolar.

### 2. Lig dengesi

| Ölçü | Önce | Sonra | Hedef |
|---|---|---|---|
| Ortalama sayı farkı | 21,4 | **10,6** | 10-13 |
| 20+ farkla biten | %51,9 | **%12,3** | <%25 |
| 5 ve altı farkla biten | %15,6 | **%31,6** | >%25 |
| 16-0 / 0-16 takım | 3 takım | **%0,5** | <%1 |

İki kök neden de doğrulandı: `pseudoTeamStrength` **42 puanlık** yelpaze üretiyordu
(58-100) ve `cpuMatchScore` bunu `diff×0.52` ile skora çeviriyordu. Yelpaze 20 puana,
katsayı 0,25'e indirildi. **Gürültü değiştirilmedi** — denge rastgelelik ekleyerek değil,
dağılımı daraltarak sağlandı; sonuçlar deterministik.

### 3. Takım adları
Şehir havuzu 24 → **32**, sonek havuzu 12 → **18**. "Aynı ligde en fazla 2 takım" kuralı
zaten vardı ama havuz ona yetmiyordu (Kayseri ×4, Konya ×4).

### 4. Maç saati
Anlatım damgası GEÇEN süreyi yazıyordu (`clk - t`), tabela KALAN süreyi geriye sayıyordu:
aynı an tabela 5:17, akış 4:43. Motor `ev.t`'de zaten kalan saniyeyi tutuyor; çeviri
kaldırıldı. Açılış satırları artık `1P 10:00`. `sunum-check`'e F19-4 kapısı eklendi.

### 5. Transfer marketi
"Yerli" filtresi bomboş beyaz alan veriyordu. Artık her filtre için açıklama ve tek tıkla
temizleme var (`marketFiltreleriTemizle`). Portre boş kutusu: havuz yeniden kurulunca
saklanan `portreDosya` olmayan bir sıraya işaret ediyordu — geçersiz ad artık yenileniyor
ve yedek zinciri her adımda ilerlemeyi garanti ediyor (komşu → SVG → düz gri kart).

### 6. Eski kayıt
Desteklenmeyen sürüm anahtarları (`_v2`, `_v4` …) açılışta **siliniyor** ve kullanıcıya
tek satırlık bilgi veriliyor. "Sessizce yok say" yetmiyordu: yer kaplıyor ve karışıklık
yaratıyordu.

### 7. Küçük kusurlar
Kimya rozetleri tam ad kullanıyor (aynı soyadlı iki oyuncu "Martinez – Martinez" olarak
ayırt edilemiyordu) · kimya kutusundaki "(sabit)" ifadesi sadeleştirildi ·
**§7.5 puanlama kullanıcı onayıyla FIBA'ya çevrildi: galibiyet 2, mağlubiyet 1.**
"Maçı Başlat" pasifleştirme kodu (`setMatchButtonsRunning`) zaten mevcuttu — canlıdaki
gözlem eski dağıtımdan; kod tarafında değişiklik gerekmedi.


---

## FAZ 20 — FAZ 19 doğrulaması + kalan kusurlar (2026-08-31)

Baz commit `7370d69`. Kaynak: basketlig.vercel.app'te sıfırdan kurulan kariyer.

### 0. ASIL BULGU — üç madde "uygulanmamış" değildi, KULLANICIYA ULAŞMAMIŞTI

Brif §3 (maç saati), §4 (market yerli oranı) ve §5 (eski kayıt temizliği) için
"uygulanmamış" diyordu. Kod kontrol edildi: **üçü de yazılmıştı** (FAZ 17B `a7a76b8`,
FAZ 19 `7370d69`). Eksik olan tek şey **sürüm damgasıydı**.

PWA service worker `js/*.js` dosyalarını *önce önbellek* ile servis eder ve önbellek
anahtarı `?v=N`'dir. FAZ 17'de 53'e çıkarılan bu numara FAZ 17B ve FAZ 19'da
**artırılmadı** — siteye dönen her kullanıcı FAZ 17 JavaScript'ini çalıştırmaya devam
etti. Düzeltmeler depoda vardı, tarayıcıda yoktu.

**Bu benim hatam.** CLAUDE.md zaten "SCRIPT_V'yi de artır" diyordu; FAZ 17'de yaptım,
sonraki iki fazda unuttum. Sürüm 53 → **54** yapıldı ve tekrarını önlemek için
`tools/surum-check.js` yazıldı: yayınlanan dosyaların içerik hash'i
`tools/.surum-hash.json`'da tutulur; içerik değişip sürüm sabit kalırsa denetim DÜŞER.
Ayrıca HTML script listesi ile sw.js önbellek listesinin birebir olduğunu da sınar.

### 2. Portre boş kutusu — brifin kendi düzeltmesi
Brif bu tespitin yanlış olduğunu bildirdi (ölçüm `loading="lazy"` yüzünden ekran
dışındaki görselleri bozuk saymış). Düzeltme yapılmadı; yalnız istenen iyileştirme:
`.pimg` ve `.mavatar` kutularına **soluk silüet arka planı** kondu, yükleme anındaki
boşluk artık göze batmıyor.

### 4. Market yerli oranı
Kod zaten doğruydu (FAZ 17B §4). Sürüm bump'ından sonra ölçülen:

| | Yerli payı |
|---|---|
| Sezon 1 | **%59,5** (kapı %45-65) |
| Sezon 3 | %44,0 |
| Sezon 6 | **%25,5** (kapı %20-32) |

OVR sıralamasında ilk %20'de yabancı **%53**, son %20'de **%5**. Yabancı–yerli OVR farkı
**4,5** (erişilemez değil). Canlıda görülen %2,5 tamamen önbellekten geliyordu.

### 5. Eski kayıt anahtarları
Sabit liste yetmiyordu. Artık tüm `charazay_*` anahtarları taranıyor; güncel sürüm
anahtarları, kayıt slotları ve ayarlar korunup geri kalan **sürümlü** anahtarlar siliniyor.

### 6. Yeni kariyerde eski kariyerin haberi
Haber akışı `sessionStorage`'da, kulüp önbelleği `localStorage`'da — ikisi de oyun
kaydından bağımsız. `kariyerAkislariniSifirla()` eklendi ve `createTeam` başında
çağrılıyor. Kapı `lig-check` D2'ye kondu (brif schema-check demişti; orada oyun
modüllerini yükleyen harness yok, lig-check'te var — sapma raporlandı).

### 7. Sezon başlamadan sıra
`sezonBasladiMi()` eklendi; false ise `userLigSirasi()` null döner. Ana Panel "—",
başkan hedefi "Sezon başlamadı", lig tablosunun üstünde bilgi satırı.

### 8. Zorluk seçici — kullanıcı kararı: KALDIRILDI
Kolay/Normal/Zor seçicisi kurulum ekranından ve Ayarlar modalından çıkarıldı.
`difficultyCfg()` artık daima `DIFFICULTY.normal` döndürür — tablo ve imza yerinde
bırakıldı çünkü onlarca çağıran var ve eski kayıtlarda `G.difficulty='zor'` olabilir;
nötrlemek, çağrıları tek tek sökmekten hem küçük hem güvenli. Zorluk artık yorgunluk →
sakatlık riski dinamiğinden gelir.


---

## FAZ 22 — Tam ekran gezisi bulguları (2026-08-31)

Baz commit `ef87d3b`. Kaynak: Bursa Fatihi kariyeriyle 11 ekranın tek tek gezilmesi.

### 1. Koçlar Türk değildi (en öncelikli)
%100 Türk bir ligde 6 koçun 5'i yabancıydı ("Carlos Ruiz", "Mike Johnson", "Trae Wilson",
"LaMelo Okonkwo"). İki ayrı sebep vardı:
- Takım koçlarının adı **sabit bir dizide** gömülüydü — her kariyerde aynı üç ad, ikisi yabancı.
- Koç pazarı ve izciler genel `ILK`/`SY` havuzundan besleniyordu; bu havuz FAZ 17 §3.4
  marka temizliğinden **geçmemişti** (oyuncu havuzları temizlenmişti).

`personelUlkesi()` ve `personelAdi()` eklendi: ad artık `NAME_POOLS`'tan, yani oyuncularla
aynı kaynaktan geliyor. Kariyer başındaki takım koçları %100 yerli; yabancı yalnız pazardan
ve bot oranıyla (%10) gelebiliyor (§1.6). Koç kartlarına ülke etiketi eklendi.

**Öncesi:** Ahmet Yıldız · Carlos Ruiz · Mike Johnson · Trae Wilson · James Miller · LaMelo Okonkwo
**Sonrası:** Muhammet Taş · Rahmi Çiftçi · Ozan İnce · Osman Çiftçi · Halil Genç · Erkan Tekin (hepsi 🇹🇷)

> Marka kapısı yazılırken ilk liste fazla genişti ve "Jayson", "Joel" gibi **yaygın ilk
> adları** riskli sayıyordu. FAZ 17 §3.4 kuralı ayırt edici SOYADLARI hedefliyor, yaygın
> adlara izin veriyor; liste buna göre daraltıldı, yoksa denetim riski değil gürültüyü ölçer.

### 2. Bilanço toplamı
Ekranda 9.697 KR/hf maaş gideri yazıyor ama toplama girmiyordu; kullanıcı "+891 KR
kârdayım" diye okuyordu. Sebep sunum: gerçekleşen ve tahmini kalemler aynı listede,
aynı biçimdeydi. Artık ayrı kartlar var ve **haftalık net beklenti** ile "kasa ~N hafta
yeter" satırı eklendi — iflas gerilimi görülebilir oldu.

### 3. Arena doluluğu
1.276 taraftarlı kulüp 5.000 kişilik arenayı %90 dolduruyordu; doluluk formülü taraftar
sayısına hiç bakmıyordu. Tek kaynak `arenaDolulukOrani()` yazıldı (form + bilet fiyatı +
taraftar tavanı) ve gelir hesabı da oradan okuyor (formül iki yerde kopyalanmıştı).
Taraftar tabanı 1.000 → 2.800: **başlangıç geliri 5.400 KR olarak AYNI kaldı**, değişen şey
arena büyüdükçe doluluğun taraftara takılması (12.000 kapasitede %40). Etiket de düzeltildi:
"Doluluk (forma göre)" → "Doluluk (taraftar + form + bilet fiyatı)".

### 4. Analiz
"93.0 vs 94" tutarsızlığının kaynağı grafik **eksen etiketiydi**: tek değerde bant
`min-1`/`max+1` açılıyor ve etiket açılmış banttan basılıyordu. Kart doğruydu. Çizim bandı
açılmaya devam ediyor, etiketler gerçek veriyi yazıyor. 3 maçtan az veride grafik yerine
bilgi metni gösteriliyor.

### 5. Küçük bulgular
Altyapı yaş tavanı 20 → **18** (ve o bandın güç tavanı 72 → 68; 20 yaş + OVR 69 altyapı
değil A takım seviyesiydi) · kenar çubuğu "20/20" → "**20/20 takım**" · sponsor satırı
(oyunun kendi adı) kaldırıldı · arena fiyatları `ecoRoundPretty` ile yuvarlandı
(17.083 → **17.000**, 34.375 → 34.000, 66.667 → 67.000, 129.167 → 129.000).

**§5.2 (altyapı portre bandı) kullanıcı kararıyla ERTELENDİ** — portre üretimi durdurulduğu
için yeni kova açılmadı.

### Not: surum-check kendini kanıtladı
Bu turda JS değiştirilip sürüm artırılmadığında `surum-check` denetimi DÜŞÜRDÜ ve hatayı
yakaladı (54 → 55). FAZ 20'de yazılan kapı, yazıldığı ilk turda işe yaradı.

Ayrıca `lig-check` C bölümünün örneklemi 10 → **20 sezona** çıkarıldı: 200 takım-sezonda
tek bir vaka %0,5 demek ve <%1 kapısı 0/0,5/1 arasında zıplayıp gürültü ölçüyordu.
400 takım-sezonda ölçüm kararlı: **%0,00**.

---

## FAZ 23 — Portre tarzı deneme turu: DURDURULDU (2026-08-31)

Baz commit `98a05f3`. Hedef 3 tarz × 4 portre = 12 deneme görseliydi. **Görsel üretilemedi**;
kullanıcı talimatıyla durduruldu. Bu turun asıl çıktısı **ölçüm**.

### Önceki turun teşhisi sayıyla doğrulandı
YuNet (OpenCV `FaceDetectorYN`) kuruldu ve mevcut 465 portre ölçüldü: yüz yüksekliği
karenin **%59-112'si**. Hedef %30-38. "Vesikalık" teşhisi doğru.

### Ayar turunda ölçülenler
| Deneme | Sonuç |
|---|---|
| `cfg 0` (turbo varsayılanı) | fon **-13,3** (köşeler merkezden AÇIK), yüz **%59** |
| `cfg 0` + "wide shot" | kadraj düzeldi ama **forma tamamen kayboldu** (çıplak gövde) |
| **512×768** | **bozuk çıktı — üst üste iki yüz**; bu modelde kare dışı en-boy güvenilmez |
| `cfg 3.5` / 6 adım | forma **ve** koyu fon geldi (fon **29,0**), kadraj hâlâ yakın |
| `cfg 3.5` + "wide shot from the waist up" | tek karede üçü birden tuttu (yüz ~%28) |

**Kök neden:** turbo modeller `guidance_scale=0` ile çalışır ve o ayarda istem BAĞLAMIYOR —
eklenen her kısıt bir öncekini dışarı itiyor. Önceki turda formanın kaybolmasının sebebi
yalnız kadraj daraltması değilmiş; istem hiç bağlamıyormuş.

### Neden 12 görsel çıkmadı
Reçete tek atışta çalıştı ama **seri üretimde kararlı değil**. 13 denemenin tamamı elendi:

| Red sebebi | Adet | Ölçülen |
|---|---|---|
| `yuz-orani` | 10 | %40, %56, %58, %63, %69, %87 (kapı %30-38) |
| `forma-yazi` | 1 | %34 orana girdi, yazıdan elendi |
| `kafa-ustu-kesik` | 1 | — |

Fon ve forma çözüldü; kalan tek darboğaz **kadraj kararlılığı**. Yakın plan eğilimi
SD-Turbo'nun kendi karakteri ve istemle güvenilir biçimde bastırılamıyor.

### Açık karar
- **A)** Kadraj kapısı %30-45'e gevşetilsin (kabul oranı yükselir, portreler bir tık yakın)
- **B)** Kaynak değişsin — SDXL-Turbo kadraj denetiminde çok daha iyi ama 13,7 GB RAM'e
  fp32 sığmıyor; fp16 CPU'da ~3-5 dk/görsel (12 deneme için uygun, 3.000 için değil)

`tools/portre-deneme.py` (yüz tespitiyle kadraj + 6 eleme kapısı + karşılaştırma sayfası)
depoda duruyor; karar verilince tek parametreyle sürdürülebilir.
`assets/portraits/` klasörüne DOKUNULMADI — 465 portre yerinde.
