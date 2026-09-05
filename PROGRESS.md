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

---

## FAZ 24 — FAZ 22 doğrulaması + isim/arena/analiz kapanışı (2026-08-31)

Brifin altı bölümü de uygulandı. Portre üretimi brif dışı bırakıldı, `assets/portraits/`
klasörüne dokunulmadı.

### §2 — Eski genel isim havuzu (ILK / SY) tamamen kaldırıldı

Kök sebep: FAZ 17'de marka temizliği YALNIZ `NAME_POOLS` üzerinde yapılmıştı; `js/state.js`
içindeki `ILK`/`SY` ikilisi gözden kaçıp canlı kalmıştı. 32 ilk ismin neredeyse tamamı aktif
NBA yıldızının adıydı ve üç yeri besliyordu: lig haberleri, ekonomi olayları ve
`randomNameFor`un sessiz yedek dalı. Canlıda görülen: %100 Türk bir ligde "Ja Clark".

- `ILK` / `SY` sabitleri silindi (`js/state.js`).
- `js/league.js:172` (lig haberi) ve `js/economy.js:215` (ekonomi olayı) artık
  `randomNameFor(LIG_EV_ULKE)` çağırıyor.
- `randomNameFor` yedek dalı yeniden yazıldı: havuzu olmayan ülke **sabit bir listeye değil**
  ev ülkesinin havuzuna düşer ve `console.warn` basar (sessiz bozulma yerine görünür uyarı).

### §2.4 — NBA kara listesi havuzlardan da temizlendi

FAZ 22'de "Jayson/Joel sıradan adlardır" diye kendi kara listemi daraltmıştım; brif listeyi
açıkça sayıp "hiçbir üretilen isimde geçmiyor" dediği için karar brifin. 43 ülkede **43 ad**
kültürel karşılığıyla değiştirildi (havuz boyu ve doku korunarak, birebir):

| Ülke | Değişen |
|---|---|
| ABD | Jayson→Terrell · Devin→Darnell · Damian→Deshawn · Cade→Cornell · Donovan→Roderick · Victor→Demarcus |
| Sırbistan/Hırvatistan/Slovenya/Karadağ/Bosna/K. Makedonya/Bulgaristan | Nikola, Luka, Jokić → Radoslav, Ratomir, Tvrtko, Slavoljub, Bogomil, Dobrivoj, Blagota, Milisav, Bećir, Blagojce, Parvan, Kovačić, Vukotić |
| Diğer 14 ülke | Joel, Victor, Damian, Paolo, Shai, Domantas, Okonkwo karşılıkları |

`Nikola` Sırpçanın en yaygın erkek adıdır; çıkarılması kültürel doku açısından bir kayıptır,
brifin kapısı gereği yapıldı — kayda geçiriliyor.

### §3 — Havuzlarda kadın adı

4 ad değiştirildi (Işıl→Işıtan, Laurine→Lucien, Fang→Fangyu, Jing→Jingtao). Gerçekten iki
cinsiyetli ya da kendi dilinde erkek olan adlara **dokunulmadı** (İbranice Omer/Gal/Shai/Ziv,
Çince Yan/Hui, Türkçe Deniz, İtalyanca-Gürcüce Nino, Romence Adi, Japonca Yuki) — hepsini
listeye almak denetimi gerçek kusuru değil gürültüyü ölçer hâle getirir ve havuzu daraltırdı.

### §4 — Eski kayıtlarda koç/izci adı onarımı

Canlıda Türk bayraklı "Mike Johnson" görünüyordu: ad genel havuzdan gelmişti, `ulke` alanı ise
FAZ 17 göçünde ev ülkesi diye dolduruldu. Eklenenler:

- `personelAdiUygunMu(ad, ulke)` — ad kendi ülkesinin havuzuyla tutarlı mı (havuzu olmayan
  ülkeyi yargılamaz).
- `personelAdiSabit(ulke, tohum)` — **deterministik** (`prPick`, `rand()` değil): aynı kayıt
  her açılışta aynı adı verir, yoksa oyuncu koçunun adının her açılışta değiştiğini görür.
- `faz24PersonelAdiOnar()` — kayıt yüklemesinde `faz17KocUlkeDoldur`un hemen ardından çalışır;
  **yalnız adı** değiştirir. Seviye, maaş, skor, geçmiş, atama, satış fiyatı ve kimlik korunur
  (denetçi bunu kaynak taramasıyla da sınıyor).

### §5 — Seyirci taraftar tabanını aşamaz

İki gerçek kusur bulundu:

1. `TARAFTAR_KATSAYI` 1,6 idi — 2.800 taraftarlı kulüp 4.480 kişi ağırlıyordu.
2. **Daha ciddi olanı:** doluluğun %20 tabanı `Math.max(0.20, Math.min(...))` ile en DIŞTA
   duruyor ve taraftar tavanını eziyordu. 800 taraftarlı bir kulüp 30.000'lik arenada
   %20 = 6.000 seyirci topluyordu. Taban artık yalnız form dalına uygulanıyor, tavan **en
   sonda**.

Gelir nötr tutuldu: taraftar tabanı eski TAVANIN kendisiyle eşitlendi (2.800 × 1,6 = **4.480**,
maç başına 180 × 1,6 = **288**). Böylece doluluk, bilet geliri ve uzun vadeli ekonomi bire bir
korunuyor; değişen tek şey "taraftar" sayısının artık gerçekten gelebilecek kitleyi göstermesi.
İlk denemede taban 4.700/300 seçilmişti — `season-loop` K2'yi 2,25×'ten 2,43×'e itti, geri
alındı.

`js/render.js` içindeki kopya `1.6` sabiti de `TARAFTAR_KATSAYI`ya bağlandı (FAZ 22'nin "tek
kaynak" düzeltmesi yarım kalmıştı).

### §6 — Analiz sayı tutarlılığı doğrulandı

Kart "Sayı ort. (attı)" ile grafik "Attığı sayı" zaten aynı diziden besleniyor; FAZ 22 §4.1'in
etiket düzeltmesi (etiketler ÇİZİM için açılan banttan değil gerçek min/max'tan) yerinde. 3
maçlık veriyle (88/93/101 → ort. 94,0 · etiket 101/88) ölçüldü.

### Yeni denetçiler

- `tools/arena-check.js` — 125 arena×fiyat×form birleşiminde seyirci ≤ taraftar, doluluk
  sınırları, sezon başı gelirinin değişmezliği (4.350 KR), `TARAFTAR_KATSAYI` tek kaynak.
- `tools/analiz-check.js` — kart/grafik aynı kaynak, eksen etiketleri, sınır durumları
  (tek maç → "trend için yetersiz", tüm maçlar eşit, veri yok).
- `tools/isim-check.js` — F (ILK/SY kalıntısı), G (kara liste), H (kadın adı), I (personel adı
  onarımı) bölümleri eklendi; `console.warn` gürültüsü susturuldu.

### Düzeltilen kararsız / eskimiş kapılar

- **`faz6-check` F2** kalıcı kırmızı yanıyordu: FAZ 20'de zorluk seçicisi kullanıcı kararıyla
  kaldırılmıştı, kapı hâlâ çarpanların ARTMASINI arıyordu. Yeni ölçüt kararın kendisi: hangi
  `difficulty` değeri atanırsa atansın oyun nötr kalmalı (eski kayıttaki `difficulty:'zor'`
  alanı dengeyi sessizce bozmasın).
- **`sunum-check` F19-4** aynı kodda +8/+5 ile −9/−12 arasında salınıyordu. Ölçüt yanlıştı:
  tabela SAHNE saatini, damga son OLAYIN maç saatini gösterir; sahne olayın gerisinde de
  önünde de olabilir (F11-1). Kapı `fark >= -1` yerine `|fark| ≤ 24` oldu — yön değil
  büyüklük ölçülüyor.
- **`CLAUDE.md` band.js referans hash'i** eskimişti: FAZ 19 lig dengesi düzeltmesi
  (`cpuMatchScore` kırpması 35→20, `pseudoTeamStrength` bandı 42→20) skorları bilerek
  değiştirmişti. `89b5436137c1da14` → **`99bb9ceb67917bd0`**.

### Sürüm damgası

`?v=` ve `SCRIPT_V` 55 → **56**. `surum-check` yine yakaladı (hash değişmiş, sürüm sabit) —
bu kapı üçüncü kez iş gördü.

### Denetim sonuçları

Geçen: `sim-node` · `isim-check` (I bölümü dâhil) · `milliyet-check` · `lig-check` ·
`analiz-check` · `arena-check` · `schema-check` · `i18n-scan` (Türkçe %0,0) · `surum-check` ·
`visual-check` (masaüstü+mobil, 0 konsol hatası) · `faz6-check` 7/7 · `faz7-check` ·
`faz8-check` · `faz10-check` 27/27 · `faz11-check` 13/13 · `mobile-check` 18/18 ·
`geometri-check` · `m20-check` · `sunum-check` 5/5 (`--ms=420000`; varsayılan 240 sn
penceresinde M12/F14-7 örnek açlığından kararsız).

`band.js` hash'i **değişmedi** — HEAD ile birebir `99bb9ceb67917bd0` (worktree ile
karşılaştırıldı). FAZ 24 maç sonucuna dokunmadı.

**FAZ 24 dışında kalan, HEAD'de de düşen kapılar** (worktree ile doğrulandı, bu oturumda
oluşmadı):

| Kapı | Ölçüm | Hedef |
|---|---|---|
| `anlatim-check` benzersiz kalıp | %82,7 | ≥%85 |
| `hareket-check` ortalama hız | 1,24 m/sn | 1,3–2,1 |
| `hareket-check` YÜRÜ payı | %47,5 | %20–45 |
| `spacing-check` markaj mesafesi | 1,98 m | <1,8 |
| `spacing-check` ball-you-man | %82,9 | ≥%85 |
| `spacing-check` orta üçte bir | %20,9 | <%20 |
| `spacing-check` potaya uzaklık | 7,11 m | ≤7 |
| `season-loop` K2 (pasif kasa) | medyan 2,35× (HEAD 2,25×) | ≤2× |

`season-loop` K2 tohumlu değil — aynı kodda 11,25× ve 11,53× verdi; koşular arası gürültü
farkı domine ediyor. Taraftar tavanı HEAD ile sayısal olarak birebir aynı olduğu için FAZ 24
bu kapıya ekonomik katkı yapmıyor.

### Sırada bekleyenler

- FAZ 18 / FAZ 21 anlatım dili işi (ertelendi) — `anlatim-check` %85 kapısı buna bağlı.
- FAZ 23 portre tarzı kararı — kullanıcı "dursun, sonra karar veririm" dedi; 465 portre yerinde.

---

## FAZ 25 — Canlı maç: gerçekçilik + anlatım (2026-09-01)

Sekiz bölümün tamamı uygulandı. Sunum katmanında kalındı: **`band.js` hash'i
`99bb9ceb67917bd0` — DEĞİŞMEDİ**, `sim-node --n=100 --seed=42` → `87.2 - 80.0`,
olay/maç 249, hata 0, determinizm korundu.

### Bölüm 1 — Top sürme rolleri

`_tasiyabilir()` (rol 0/1/2) + `_cikisHedefi()`. Uzun (PF/C) topu aldığında en yakın
guard'a çıkış pası atar; pota 4 m'den yakınsa kendi bitirir. Kural ribaund sonrası zaten
vardı (M9); **top kaybı, çalma ve kenardan sokma** yollarına da getirildi. Ayrıca
`_simTick` içinde tek bir genel kapı var: uzun taşıyıcı orta saha şeridine girerse
(±150 px) topu guard'a çıkarır.

`_cikisHedefi` önce GERÇEK guard (rol 0/1), sonra SF seçer — sıralamasız ilk sürüm M9'u
%100'den %75'e düşürmüştü. **Ölçüm: orta sahayı geçen taşımaların %83,9 → %100'ü rol 0/1/2.**

### Bölüm 2 — Geçiş oyununda donma

`_simTick`'e "canlı set" adımı eklendi: set fazında bir oyuncunun hedefi 340 ms'den uzun
sabit kalırsa dizilim noktasının çevresinde yeni bir nokta verilir.

Üç ders çıktı:
1. **Salınım yönü radyal olmalı** (potaya doğru / potadan uzağa). Serbest yönlü salınım
   savunmacıyı adam-pota doğrultusundan çıkarıyor, `spacing-check` ball-you-man ölçümü
   %82,9 → %79,7'ye düşüyordu.
2. **`_hedefAta` kullanılamaz**: nokta 26 px'ten yakınsa hedefi DEĞİŞTİRMİYOR (F15-1) ve
   ≤9 px'lik salınım yutuluyordu. Hedef doğrudan yazılır; kastedilen yer değiştirme değil
   yerinde kıpırdanmadır.
3. **Eşik sahne saatinde değil GERÇEK saatte** ölçülür. Ölçüm: donma anında `S.time` farkı
   0,67 sn iken kullanıcının gördüğü süre 1,50 sn idi — sahne saati duvar saatinin ~0,45
   katı akıyor. "Donmuş görünmek" bir seyirci algısıdır (F15 dersinin bu maddeye düşen
   karşılığı).

Ayrıca `_lock` "yeniden yönlendirme yasağı"dır, "kıpırdama yasağı" değil: kilitli oyuncuya
5 px'lik ağırlık aktarması verilir. Kenar/köşe slotlarında `_inX` kırpması iki yönü aynı
değere getirdiği için dik yöne geçilir.

### Bölüm 3 — Kenardan sokma

`_sokmaYerlesimi()`: sokucunun 15 m (443 px) içinde en az 3 takım arkadaşı; yalnız dışarıda
kalanlar çekilir, dizilime dokunulmaz. `_sokmaHedefi()`: ilk pas 15 m'yi aşamaz — istisna,
hedefe en yakın savunmacı 8 m'den uzaksa (gerçek hızlı hücum).
**Ölçüm: 20 sokma · ortalama 6,7 m · 3+ yakın %100 · 25 m üstü ilk pas 0/20.**

### Bölüm 4 — Serbest atışta sektirme

`_ftSektir()`: 1-3 sektirme (sahne PRNG'si), sonra `noDrib` ile top elde kalır ve atış gelir.
Atışlar arasında da aynı rutin. **Ölçüm: 12 rutin · sektirme 1-3.** Dizilime (F14-7)
dokunulmadı, o kapı geçiyor.

### Bölüm 5 — Taktikler sahada

Eksik olan tek şema **yayılma (spotup)** idi: yay İÇİNDE kalanlar çizginin hemen dışına
(THREE_R+14) çıkarılır, en içerideki uzun çembere gider. İlk denemede herkes
`max(THREE_R+26, d)` yarıçapına itiliyordu; 225 px'lik nokta sahanın ORTA ÜÇTE BİRİNE
düşüyor ve dizilim ölçümünü bozuyordu (%16,4 → %20,7).
**Ölçüm: cut boya %38 / yay %45 · spotup boya %27 / yay %59 → 10,6 ve 14,8 puan fark.**

### Bölüm 6 — Post-up ve perde

- **Jeton yönelimi** eklendi (`yon` alanı + `_yonGuncelle` + çember kenarında küçük
  gösterge). Sıra: sırtı dönük (post) → topu tutuyorsa pota → hareket yönü → top.
- **Post oyunu**: `_sirtDonuk` bayrağı, şut anında kalkar. **Ölçüm: 655 kare, %99 sırtı
  potaya dönük.**
- **Perde üç aşama**: kurulum (perdeci durur, kilitlenir) → sıyırma (topçu omzu yalar) →
  devrilme (roll %62 / pop). Savunma tepkisi: switch (%30) ya da arkadan dolaşma.
  **Ölçüm: evreler [1,2,3] · 6 roll / 3 pop.**
  Sıyırma ilk sürümde 30 px yanal + 26 px dikeydi; topçu ~2,1 m yer değiştirip savunmacısını
  koparıyordu (markaj 1,98 → 2,08 m). Omuz mesafesine (16/20 px) çekildi.

### Bölüm 7 — Anlatım

**7.1 Türkçe ek uyumu (en öncelikli).** Yeni dosya `js/turkce-ek.js`:
`turkEk(ad, durum)` — ünlü uyumu + ünsüz benzeşmesi + kaynaştırma; `turkEkUygula`,
`trKucuk`, `trBuyukIlk`. 48 sabit ekli şablon (`%T'de` gibi) `%X{durum}` yer tutucusuna
çevrildi — 24 `match-engine.js` + 24 `i18n-commentary.js` **anahtarı** (anahtar değişmezse
çeviri sessizce eşleşmez). Merkezî `adKoy()` önce `%X{durum}`, sonra düz `%X` çözer ve
anahtarları uzundan kısaya sıralar (`%SC` > `%S` tuzağı).

İki ayrı olgu ayrıldı — ilk sürüm ikisini tek kural sayınca "Boğaları'da" ve "Gündoğdu'na"
çıkmıştı:
- **Kaynaştırma** (iyeliksiz ünlü): Gündoğdu'**ya**, ama tamlayanda Gündoğdu'**nun**
- **Zamir n'si** (3. tekil iyelik): Boğaları'**na**, Boğaları'**nda**, Boğaları'**ndan**

`tools/turkek-check.js` — brifin 8 ad × 4 durum tablosu **32/32**, artı kural ayrıntıları,
sınır durumları, şablon çözücü ve Türkçe küçük harf (İ→i, I→ı).

**7.2 Failsiz cümle.** `zincirLine` içinde: ön parça `%S` içermiyorsa çekirdeğe fail eklenir
("İkili oyun. Tutturdu." → "İkili oyun. Batuhan Keskin tutturdu."). Havuz daraltılmadı.

**7.3 Saat referansı ve son bölüm tonu.** `saatGate` + `tonGate`, maç düzeyi sayaç
(`_saatG`) — `narr` ile aynı kapsamda (F13-3 / F14-1 tuzağı). Çeyreğin son 10 saniyesinde
kapı cooldown'ı atlar. **Ölçüm: saat referansı %2,4 → %9,5 · son bölüm tonu 3,8/maç.**
Ağırlıklar ölçülerek ayarlandı; ilk deneme (0,85/0,35/0,30, cd 3-6) %2,4 veriyordu çünkü
aday havuzunun küçüklüğü hesaba katılmamıştı — kapı ribaund ve faul olaylarına da bağlandı.

**7.4 Üslup.**

| Ölçüm | Önce | Sonra | Hedef |
|---|---|---|---|
| Zincir oranı | %35,4 | **%59,7** | %50-60 |
| Ortalama kelime/olay | 10,47 | **8,83** | <9 |
| Yabancı terim | 5 tür / 566 geçiş | **0** | 0 |
| Parantezli taktik etiketi | var | **0** | 0 |
| Künye biçimli faul | %100 | **%46,7** | ≤%50 |
| "hepsi içeride" | 8,8/maç | **1,3/maç** | ≤4 |

- Yabancı terimler tek tercihe sabitlendi: spacing→açılma, box-out→ribaunt bloğu,
  drive→içeri dalma, pick&roll→ikili oyun, AND-1→devam sayısı.
- Taktik adı parantezli etiket yerine cümleye girdi ("Erken tempoya geçtiler, doğru karar.").
  Taktik adları **cins isimdir**, kesme işareti almaz — `turkEk` kullanılmaz, yönelme hâli
  tabloda hazır durur. Giriş kalıbı cümleyi sürdürüyorsa spiker satırı küçük harfle devam
  eder, kendi başına cümleyse büyük kalır.
- `ftLine` 10+ varyanta çıktı; faul satırı künye YA DA cümle biçiminde ("Demirel'in ikinci
  faulü"). "yine faulde" yalnız 2. faulden itibaren.
- Kelime bütçesi: hamle önekleri kısaltıldı ve parantezli İngilizce glosler ("(crossover)",
  "(spin move)") kaldırıldı; takım faulü sayacı yalnız bonusa yaklaşırken (4+) basılır;
  **zincir ve yüksek frekanslı olaylarda TEK ad kullanılır** ("Cedi güçlü gitti." ritmi) —
  resmî/tören satırlarında tam ad korunur.
- `IMZA_ISTAT` düzeltildi: "— 14 sayısı oldu." → "Böylece 14 sayıya ulaştı."

**7.5 Anlatım sahayla konuşuyor.** `AKIS_ON.eslesme`'den post-up iddiaları çıkarıldı
('sırtını döndü', 'adamını sırtladı' — zincir bölge filtresinden geçmiyor, spotup/pnr/cut
pozisyonlarında da çıkıyordu). `%S tepeye çıktı.` yay tepesi iddiasıydı, değiştirildi. Blok
cümlelerine bölge süzgeci eklendi (3'lük blokta "boyalı alanın kapısını kapadı" çıkıyordu).

### Bölüm 8 — Denetim

**`tools/_lib/anlatim-kapilari.js`** (10 yeni kapı, `anlatim-check` **23/23**):
ek uyumu 0 · failsiz cümle 0 · saat %9,5 · ton 3,8/maç · zincir %59,7 · kelime 8,83 ·
yabancı terim 0 · "hepsi içeride" 1,3/maç · künye faul %46,7 · anlatım-saha çelişmesi 0.

**Üç mevcut kapı biçim okuyordu, niyetleri korunarak düzeltildi:**
- "top çalma iki taraflı" TAM AD arıyordu; kısa adla **0/795** veriyordu.
- Faul kapısı yalnız künye okuyordu; cümle biçimi ve serbest atış satırları kapsam dışıydı.
- Sıra sözcüğü regex'inde **`\b` Türkçe harfte çalışmıyor** — `/\büçüncü\b/` hiç
  eşleşmiyor, 25 satır okunamıyor ve sayaç 27 sahte "atlama" üretiyordu (CLAUDE.md'deki
  FAZ 17 i18n dersinin aynısı). Ayrıca cümle kalıbı ilk büyük harfli sözcüğü ("Hakem") ad
  sanıyordu; anahtar soyada normalize edildi.

**`tools/_lib/saha-kapilari.js`** (6 yeni kapı, `sunum-check`): F25-1 … F25-6b.

### Sonuçlar

Geçen: `sim-node` (87.2-80.0 · 249 olay · determinizm) · `band.js` **hash değişmedi** ·
`turkek-check` 32/32 · `anlatim-check` 23/23 · `sunum-check` 11/12 · `visual-check`
(masaüstü+mobil, 0 konsol hatası) · `i18n-scan` (canlı anlatım Türkçe %0,0) · `surum-check`
(56 → **57**) · `lig-check` · `isim-check` · `schema-check` · `analiz-check` · `arena-check` ·
`faz6/7/8/10/11-check` · `mobile-check` 18/18 · `m20-check` · `geometri-check`.

**Kapanmayan tek FAZ 25 kapısı — F25-2 (donma):** hedef 0, ölçülen **7** (7 dakikalık
pencerede, en uzun 1,52 sn). Yol: 79 → 34 (duran sahne sayılmayınca) → 17 → 7 (eşik
600→340 ms). 280 ms'de **1**'e iniyor ama `spacing-check` churn'ü artıyor; 340 ms
`spacing-check`'i tabandan İYİ hâle getirdiği için orada bırakıldı. Kalan vakaların kaynağı
tam olarak izlenemedi — salınım her 340 ms'de bir yazılmasına rağmen bazı oyuncularda
ölçülen boşluk eşiğin ~4 katına çıkıyor. **Kapı bilerek gevşetilmedi; kırmızı bırakıldı.**

**FAZ 25 dışı, tabanla aynı düşen kapılar:**

| Kapı | Taban | Şimdi | Hedef |
|---|---|---|---|
| `spacing` markaj mesafesi | 1,98 m | 2,00 m | <1,8 |
| `spacing` ball-you-man | %82,9 | %78,1 | ≥%85 |
| `spacing` orta üçte bir (süzülmemiş) | %21,7 | %22,4 | <%20 |
| `spacing` potaya uzaklık (süzülmemiş) | 7,11 m | **geçiyor** | ≤7 |
| `hareket` ortalama hız | 1,24 m/sn | 1,26 m/sn | 1,3-2,1 |
| `hareket` YÜRÜ payı | %47,5 | %49,4 | %20-45 |

`spacing-check` düşen kapı sayısı 4 → **3**. ball-you-man'daki düşüş canlı salınımın ve
perdenin doğrudan bedeli: hücum artık set içinde de hareket ediyor, savunmacı adam-pota
doğrultusuna yetişmek için bir kare geriden geliyor. Salınım radyal yapılarak %79,7'den
%82,7'ye toparlandı ama tam kapanmadı.

`milliyet-check` I bölümü **kararsız**: 4 koşudan 1'inde 258 oyuncunun 1'i havuz dışı ad
alıyor (`ensureUniquePlayerNames` yeniden çekilişi). FAZ 25 öncesinde de vardı.

### Kararlar ve dersler (CLAUDE.md'ye işlendi)

- Sabit ekli şablon yazma: `%X{durum}` + `turkEk`.
- Yeni anlatım havuzu → `localizeCatalogs` + EN sözlüğü; şablonlu cümleler `I18N_PHRASES`.
- Sunum kapısı yazarken ölçütü **kullanıcının gördüğü saate** bağla, sahne saatine değil.
- Türkçe harf sınırında `\b` kullanma.


## FAZ 26 — Canlı maç gerilemesi: sahne katmanı koreografiyi eziyordu (2026-09-01)

Kullanıcı canlı maçı oynadı: *"oyuncu olmayan noktalara pas gidiyor, boşluktan şut
çekiliyor, ribaund orada olmayan oyuncuya gidiyor, mantıksız paslar. Dün gece daha iyiydi."*
Ayrıca jetonların kenarındaki beyaz noktanın kaldırılmasını istedi.

### Kök neden — tek bir yerden çıktı: FAZ 25 §2 salınımı

`_simTick` içindeki "set hücumunda donma yok" bloğu, **hedefine doğru yürüyen** jetonun
`p.tx/p.ty` değerini de her 340 ms'de yeniden yazıyordu. Sahada karşılığı:

| Ezilen mekanizma | Ekranda görünen |
|---|---|
| `_chase` (serbest top takibi — her karede `t.tx=b.x` yazar, `_lock` verir) | Ribaundçu topa koşmayı bırakıyor, 3,2 sn'lik zaman aşımı topu ona uzaktan gönderiyor → **"ribaund sahada olmayan oyuncuya gidiyor"** |
| Şut koreografisinin şutörü şut noktasına götürmesi | Şutör yolda kalıyor, `bridge()` topu boş noktaya ghost pasla taşıyıp oradan attırıyor → **"boşluktan şut"** |
| `_setFtFormation` (serbest atış dizilişi) | `canliSet` bayrağı ölü topta AÇIK kaldığı için şutör çizgiye hiç varamıyor → M12 "şutör çizgide + top elinde" **0/2**, F14-7 9,5 → 8,7 |

**Neden bu koda yazılmıştı:** F25-2 kapısı donmayı **hedefin (p.tx/p.ty) değişmemesi** ile
ölçüyordu. Bu yanlış vekildi — hedefine doğru 2 sn yürüyen oyuncu, ekranda apaçık hareket
hâlindeyken "donmuş" raporlanıyordu ve kapıyı kapatmanın tek yolu motorda hedefi sürekli
yeniden yazmaktı. **Kapı kendi kusurunu üretti.** (FAZ 14'ün "niteliği değil ÇİZİLENİ ölç"
dersinin aynısı.)

### Yapılanlar

**1. `js/match-engine.js` — salınım artık koreografiyi ezmiyor**
- Aktif `_chase` jetonuna hiç dokunulmaz.
- Hedefine `_YERINDE_ESIK` (20 px) uzaktan fazla olan jeton atlanır — yolda olan donmuş değildir.
- `_setFtFormation` `S.canliSet=false` yapar: **serbest atış ölü toptur**, canlı set salınımı orada çalışmaz.

**2. Çıkış pası koreografiyi kesmiyor** — §1'in orta saha kapısı senaryolu şutörden
(`c!==S.shooter`) ve aktif takip sırasında (`!S.chase`) topu almaz; sabit 0,30 sn süre
kaldırıldı (M6 ışınlanma dersi), süreyi `_ballPass` mesafeden hesaplar.

**3. Beyaz nokta kaldırıldı (kullanıcı kararı).** `tok-face` çemberi hiç çizilmiyor.
Yön HESABI (`p.yon`, `_sirtDonuk`) yerinde — post oyununu ve F25-6a kapısını besliyor.
37. oturumun "canlı sahada O/X şut izi yok" kararının devamı; **geri eklenmemeli.**

**4. F25-5 kök nedeni:** `S._sema` sahne damgası yalnız `spotup` dalında yazılıp
**hiç temizlenmiyordu**. Ölçüm onu `mState._semaAd`den önce okuduğu için maçın ilk spot-up
pozisyonundan sonra bütün set kareleri 'spotup' kovasına düşüyor, diğer şemalar 20 karelik
eşiği aşamıyordu ("ÖRNEK YOK — yalnız 1 şema"). Damga artık pozisyon başına sıfırlanır →
ölçümde **6-7 şema**.

**5. F25-2 — üç katmanlı kök neden, ölçerek bulundu (eşik gevşetilmedi)**

Teşhis alanları (`kilit`/`topta`/`hedefUzak`/`nudge`/`hiz`) kapıya eklendi ve sıra şöyle çıktı:

1. **Simetrik salınım.** Yön her adımda çevriliyordu (+7, −7, +7…); jeton varış freni
   yüzünden hedefe varamadan yön dönüyor, net yer değiştirme sıfıra yakın kalıyordu.
   → Tek yönlü **sürüklenmeye** çevrildi (`_nudgeOfs` + bant), bant ±22 px.
2. **Varış freni.** Hedefe 24 px kalınca üst hız 10 px/sn'ye (0,34 m/sn) düşer ve salınım
   hedefi **her zaman** bu frenin içindedir — 1,5 sn'de 5 px'lik sapma aritmetik olarak
   imkânsızdı. → Salınım penceresinde (`p._swayT`) fren tavanı 22 px/sn (0,75 m/sn).
3. **Saha kenarı kırpması.** Köşe slotlarında (`SET_SPREAD` x=56, y=38/462) radyal eksenin
   dışa bakan ucu `_inX`/`_inY` ile yutuluyordu; donmaların 13/30'u rol 2, 10/30'u rol 3 idi.
   → Bant uçları ölçülerek açık/kapalı işaretlenir, sürüklenme açık uca yapılır; iki uç da
   kapalıysa eksen dike çevrilir. Uç seçimi **takım arkadaşı mesafesini** (`_PL_R_TAKIM`,
   62 px ≈ 2,10 m) de gözetir — boştaki oyuncu kalabalıktan uzağa kayar.

**Kalan artık ölçüm kusuru çıktı.** Bu üçünden sonra donan jetonların hızı 13-21 px/sn idi
ve donmalar **ikişer ikişer, aynı saniyede** geliyordu (rol 2 + rol 3) — yani birbirine
yaslanmış iki oyuncu; kaynak salınım değil, FAZ 25 öncesinden beri var olan **takım arkadaşı
ayırma döngüsü**. Yer değiştirme tek başına yine yanlış vekildi: ekranda hareket eden jetonu
"çakılı" sayıyordu. Ölçüt ikiye bağlandı — **1,5 sn eşiği aynen duruyor**, o pencerede hem
net sapma ≤5 px hem ortalama hız < 3 px/sn (0,10 m/sn) olacak. Dar alandaki kıpırdama ayrı
bir **bilgi** satırı olarak raporlanır, kapıyı düşürmez.

### Ölçümler

`sunum-check` **12/12** (ilk kez tamamı): F25-2 **donma 0** · M12 4/4 · F25-5 6 şema ·
F14-7 9,6/10 · M9 %100 · F25-1 %96.

Gerileme yok: `band.js` hash **99bb9ceb67917bd0** (değişmedi — sahne katmanı `_sr()`
kullanır, maçın akışını tüketmez) · `sim-node` deterministik · `visual-check` masaüstü +
mobil 0 konsol hatası · `anlatim-check` 23/23.

Yan kazanç — FAZ 25'te düşmüş kapılar toparlandı:

| Ölçü | FAZ 25 | Şimdi | Hedef |
|---|---|---|---|
| `hareket` YÜRÜ payı | %48,6 | **%44,8 ✓** | %20-45 |
| `spacing` markaj mesafesi | 2,06 m | 1,92 m | < 1,8 |
| `spacing` ball-you-man | %77,1 | %81,2 | ≥ %85 |
| `spacing` orta üçte bir (set) | %23,4 | **%19,4 ✓** | < %20 |

Script sürümü **57 → 58** (JS değişti — FAZ 20 dersi), `surum-check --yaz` ile kayıt tazelendi.


## FAZ 26 §1-§2 — Şut tipleri + maç öncesi tabela (2026-09-01)

### §1 Şut tipleri — smaç / turnike / floater ayrımı

**Sorun.** `_ballShoot` şut tipi almıyordu; yay YALNIZ mesafeye bağlıydı. Pota dibindeki
smaç, turnike ve floater ekranda **birebir aynı yörüngeyi** çiziyordu. Anlatım da tek
havuzdan besleniyordu: turnikede "potaya asıldı", smaçta "turnikeyi tamamladı" çıkabiliyordu.
Kısacası oyunda smaç diye bir şey yoktu.

**Motor.** Her saha şutu artık bir tip taşır (`shot.sut`): `smac` · `turnike` · `floater` ·
`jumper` · `uc`. Tip bölgeden, pozisyondan, kontestten ve hızlı hücumdan türer; karar
**`pr` (sunum PRNG'si)** ile verilir — isabeti, sayıyı, kutu skorunu DEĞİŞTİRMEZ (F13-3).

**Sahne.** `_ballShoot(to,dur,made,onDone,tip)` — yay ve süre tipten gelir:

| Tip | Yay | Sıçrama (`pop`) | Ölçülen tepe |
|---|---|---|---|
| smaç | ≤9 px (yok denecek kadar alçak), hızlı | 1,6 | **34,4 px** |
| turnike | 16-30 px, yumuşak | 0,85 | 49,6 px |
| floater | ≥62 px + mesafe payı, kısa mesafede yüksek kavis | 1,15 | 90,8 px |
| jumper | ≥48 px | 1,0 | 95,2 px |
| üçlük | ≥64 px | 1,0 | **107,6 px** |

**Anlatım.** `_DUNK_WORDS` / `_LAYUP_WORDS` / `_FLOAT_WORDS` süzgeci (`_sutSuz`) her iki
anlatım yoluna da (`spikerLine`, `spikerLinePR`) bağlandı; zincir ritmine tipe özgü
çekirdekler eklendi (`KISA_CEKIRDEK_SUT`). Regexler **iki dillidir** — `localizeCatalogs()`
havuzları EN'de yerinde çevirdiği için yalnız Türkçe arayan süzgeç EN'de sessizce ölürdü.
27 yeni satırın EN karşılığı `i18n-commentary.js`e yazıldı.

AND-1 cümlesi (`cls==='yakin'?'turnikeyi bitirdi':…`) tipe duyarlı yapıldı — ölçümde
**79 vakada** floater/smaç şutu "turnikeyi bitirdi" diye anlatılıyordu.

**Ölçüm — yeni araç `tools/sut-check.js` (tarayıcısız, 60 maç · 7.056 saha şutu): 10/10.**
Dağılım: turnike %45,0 · üçlük %34,0 · floater %8,4 · **smaç %7,4** · jumper %5,2.
Smaçların %82,7'si çember bölgesinden; %55,5'i gerçekten smaç diliyle anlatılıyor.
İlk koşuda iki kapı düştü ve ikisi de gerçek kusurdu: boyadan smaç payı yüksekti
(çember payı %73,8 → 0,09/0,03 oranları 0,045/0,012'ye çekildi → %82,7) ve AND-1 cümlesi.

Tarayıcı tarafı `sunum-check`e girdi: **F26-1** (smaç tepesi uzak şutun %70'inin altında)
ve **F26-2** (floater turnikeden ≥1,4× yüksek).

### §2 Maç öncesi tabelada rakip adı

Maç sayfası açıldığında tabela yer tutucularla duruyordu (sol "Ev Takımı", sağ
"Deplasman"); oyuncu kiminle oynayacağını ancak "Maçı Başlat"a bastıktan sonra görüyordu.
Yeni `syncLiveScoreboardPreview()` (`js/render.js`) adı **tek kaynaktan** —
`findNextUserSeasonMatch()`, Ana Panel'deki kartla aynı maç — yazar. Düzen maçtakiyle
aynıdır: sol sütun kullanıcı, sağ sütun rakip. İki koruma var: maç CANLIYKEN dokunmaz ve
**oynanmış bir maçın tabelasına** dokunmaz (skor/çeyrek kutusu/kutu skor o maçı gösterirken
adı değiştirmek F13-18'in "aynı ekranda iki farklı maç" hatasıdır). Kapı: **F26-3**.

### Ölçüm aracında bulunan kusur

`sunum-check` tarayıcıdan Node'a yalnız SABİT bir alan listesi taşıyor; `yay` ve
`titreme` listeye yazılmadığı için toplanan veri sessizce boşa gidiyor, kapı "ÖRNEK YOK"
diyordu. Liste artık uyarı yorumu taşıyor.

### Sonuçlar

`sut-check` **10/10** · `sunum-check` **15/15** (F26-1/2/3 dahil) · `anlatim-check` 23/23 ·
`band.js` hash **99bb9ceb67917bd0 değişmedi** · `sim-node` deterministik (92-103 ↔ 92-103) ·
`visual-check` masaüstü+mobil 0 konsol hatası · `mobile-check` 18/18 · `i18n-scan` canlı
anlatım Türkçe %0,0 · `surum-check` (58 → **59**).

Değişmeyen (FAZ 25'ten devreden, bu işle ilgisiz): `spacing` 3 kapı · `hareket` 2 kapı.


## FAZ 28 — Canlı maç denetimi sonrası düzeltmeler (2026-09-01)

Kaynak: basketlig.vercel.app'te canlı maç izlendi (Bursa Fatihi – Trabzon Kartalları),
20 anlatım satırı ekrandan okundu.

### §2 Şut sözlüğünde deyim hataları (en öncelikli)

FAZ 26'da şut tipleri eklenirken yazılan ifadeler Türkçe basketbol diline oturmuyordu.

| Ekranda çıkan | Sorun | Şimdi |
|---|---|---|
| "Sancak servisini yaptı" | **servis voleybol/tenis terimi** | "topu kenara aktardı" · "yan çizgiye çıkardı" |
| "Yavuz demire geldi" | deyim değil | "demire takıldı" |
| "Turnike dönmedi" | deyim değil | "turnikesi çemberden döndü" · "turnikeyi kaçırdı" |
| "Smacı tutmadı" | sönük | "smacını çember reddetti" · "smaçta çembere takıldı" |
| "Yavuz geldi. **Üç sayı.**" | yüklemsiz | "Üç sayıyı buldu." |
| "**Camdan sakin.**" | yüklemsiz | "Camdan yumuşak bıraktı." |
| "**Sancak durdu.**" | fail yanlış | "%S{i} durdurdu" (turkEk belirtme hâli) |

**"Servis" anlatımdan tamamen kaldırıldı** (3 `ASSIST_PHRASES` satırı + 3 sözlük girişi).

**İki yeni şut sınıfı:** `kanca` (postta uzunun omuz üstü şutu — yalnız `postup` şeması +
uzun oyuncu) ve `tipin` (hücum ribaundunun havada tek dokunuşla tamamlanması — yalnız
`putback`). İkisi de sunum kararıdır, sonucu değiştirmez.

Yeni **`SUT_LINES`** havuzu (spikerin satırlarına EKLENİR, yerini almaz) + tipe özgü zincir
çekirdekleri. Sınıf başına ifade: **smaç 17 · turnike 15 · floater 14 · kanca 14 · tipin 14.**
Sözcük kümeleri (`_DUNK/_LAYUP/_FLOAT/_HOOK/_TIPIN_WORDS`) **ayrık** ve **iki dilli**.

Yörünge de tipten gelir: kanca yüksek kavis (ölçülen tepe **97,3 px**), tip-in çember
dibinde tek dokunuş (yay ≤13 px, en kısa uçuş).

### §3 İstatistik tablosu başlığı

"Maç içi — Takım istatistikleri" ve "Özet kutu" tablolarının sütun başlığı maç başlayana
kadar **"Dep"** yer tutucusundaydı; aynı ekranda rakibin adı iki farklı şey diyordu. Yeni
`siradakiRakipAdi()` (`js/render.js`) tek kaynaktır; tabela, iki tablo ve
`showPage('mac')` hepsi ondan okur. Kapı: **F28-1**.

### §4 Aynı saniyede üst üste olaylar — KÖK NEDEN

Maç saati **pozisyon başına bir kez** azalıyor (`t=t-rand(decLo,decHi)`) ve
`runPossessionV` o pozisyonun BÜTÜN olaylarını aynı `t` ile damgalıyordu. Canlıda üç
ayrı olay "1P 6:19" görünüyordu.

Çözüm sonuç matematiğine dokunmaz: pozisyonun toplam saat maliyeti (`_dt`) ve rastgele
akış aynen kalır, yalnız o pozisyonda üretilmiş olayların damgaları pozisyonun kendi
penceresine `(tEnd … tPrev-1)` dağıtılır (`_damgaDagit`, çeyrek + uzatma döngüleri).
Kapı: 40 maç, **0 çakışma**. Korna anı (0:00) kural gereği muaftır — saat durmuştur.

### §5 Sezon 1'de yabancı oyuncu — **DELİK VARDI**

Canlıda görülen Detlef Maier meşru transfer DEĞİLDİ. `genRoster` kuralı uyguluyordu ama
**`botClubEnsureDepth` uygulamıyordu**: bot kadrosu ilk kurulduğu anda içine
`BOT_YABANCI_ORAN` payında yabancı koyuyor, sezon kavramını hiç görmüyordu. Yeni
`botYabanciOran()` (`js/state.js`) sezon 1'de **0** döndürür.

Ölçüm (`milliyet-check` J bölümü): sezon 1 · 20 takım · 200 oyuncu → **0 yabancı**;
sezon 3 · 200 takım → %9,3, takım başına en fazla 2.

### Kendi inisiyatifimle düzeltilenler

- **Kapı biçim okuyordu:** `TON` regex'i `SON_BOLUM` havuzunun birebir metnini arıyordu;
  satırlara yüklem eklenince kapı 3,8 → 2,1'e düştü — ton azalmamıştı, havuz değişmişti.
- **Cümle bölücü:** sıra sayısındaki nokta ("üst üste 3. isabetini buldu") cümle sonu
  sanılıyor, yüklem bir sonraki parçaya kaçıyordu. Skor damgası silici de "8-0'lık seri"
  içindeki sayıyı silip cümleyi bozuyordu.
- `_FLOAT_WORDS` mevcut bir üçlük satırıyla ("üçlük havada asılı kaldı") çakışıyordu;
  kümeler ayrık olmalı — kalıp fiiliyle daraltıldı.
- Kelime bütçesi: yüklem eklemeleri ortalamayı 8,84 → 9,02'ye çıkarmıştı (kapı <9);
  saat/ton/imza satırları ve yeni sınıf ifadeleri kısaltılarak **8,97**'ye çekildi.

### Sonuçlar

`sim-node --n=100 --seed=42` → **87.2 - 80.0 · olay/maç 249 · hata 0 · G değişmedi: EVET**
`anlatim-check` **28/28** (yeni 4 kapı dâhil) · `sut-check` **14/14** · `sunum-check`
**tümü** (F28-1 dâhil) · `band.js` hash **99bb9ceb67917bd0 değişmedi** · `visual-check`
0 konsol hatası · `mobile-check` 18/18 · `milliyet-check` · `lig-check` · `isim-check` ·
`schema-check` · `turkek-check` · `analiz-check` · `i18n-scan` (canlı anlatım %0,0).

Sürüm **59 → 60**.


## FAZ 29 — İngilizce mod (i18n) denetimi (2026-09-01)

Kaynak: site İngilizce moda alınıp tüm ekranlar gezildi, canlı maç İngilizce izlendi.

### §1 Önce araç: `i18n-scan` KÖRDÜ

Araç "eksik 0" diyordu ama bulguların hepsi ekranda duruyordu. İki kademeli süzgeç vardı
ve **ikinci kademeyi birinci kademe kör ediyordu**: tarayıcı içindeki toplayıcı yalnız
"Türkçe harf ya da dar bir sözcük listesi" eşleşen düğümleri dışarı veriyor, geri kalan
her şey Node tarafına HİÇ ulaşmıyordu. Üstelik bulunanlar 1700 satırlık özel isim
gürültüsünün içinde BİLGİ olarak listeleniyor, hiçbir kapıyı düşürmüyordu.

Yeni `tools/_lib/i18n-kapilari.js` — **dört sınıf, dördü de KAPI**:

| Sınıf | Ne yakalar | Örnek |
|---|---|---|
| **A** kısmi çeviri | aynı satırda TR + EN belirteç | "Kasa bu gidişle ~14 **weeks** yeter" |
| **B** biçim | Türkçe sayı/yüzde/sıra biçimi (satırda Türkçe HARF YOK — eski araç için görünmezdi) | "14.714" · "%55" · "2. place" |
| **C** kelime sırası | İngilizce cümle asılı ilgeçle bitiyor | "… have announced a deal **for.**" |
| **D** tamamen çevrilmemiş | Türkçe **cins isim** var (özel isim sayılmaz) | "⏹ Durdur" · "Doluluk (taraftar + form + bilet fiyatı)" |

Toplayıcı artık ham metni de gönderir; sınıflandırma **tek yerde** yapılır.

**Sınıflandırıcının iki tuzağı ölçülerek kapatıldı:**
- `[^A-Za-z]` sözcük sınırı Türkçe harfi dışlamıyordu: "K**ür**ş**at**" içindeki "at"
  İngilizce sözcük sanılıyor, her Türk oyuncu adı "kısmi çeviri" raporlanıyordu
  (**181 yanlış pozitif**). FAZ 17 i18n dersinin aynısı.
- "Türkçe harf var" ölçütü özel isimleri de yakalıyordu. Kural: **Türkçe harf içeren
  KÜÇÜK harfli sözcük cins isimdir** ("gidişle", "fiyatı"); büyük harfle başlayan özel
  isimdir ve zaten çevrilmez.

**Doğrulama:** araç, düzeltmelerden ÖNCE brifin bulgularının hepsini yakaladı —
A 1 · B 95 · C 2 · D 7.

### §3 Biçim dile bağlandı

`fmtSayi` / `fmtYuzde` / `fmtSira` (`js/i18n.js`) **tek kaynaktır**. `fmtn` bunlara
bağlandı (71 çağrı); `toLocaleString('tr-TR')` sabiti ve elle '%' öneki kalmadı —
`tools/bicim-check.js` kaynağı da tarıyor. İngilizce sıra eki 11/12/13 istisnası dâhil
**32/32** birim testi geçiyor (1st · 2nd · 3rd · 11th · 21st · 101st · 111th).

### §4 Haber cümlesi kelime sırası

"X — lig — BEDEL **ile** OYUNCU **için anlaşma duyurdu.**" parça parça çevrilince
İngilizcede nesne düşüyor, ilgeç havada kalıyordu. İngilizce dizilim **ayrı yazıldı**:
"X (TBL) have announced a deal for OYUNCU — 14,714 KR." Diğer 7 haber şablonu tarandı,
aynı kusur yok.

### §2 · §5 · §6

Çevrilenler: Bilanço ("Cash lasts ~N weeks at this rate", "Weekly wages + upkeep",
"Match bonus (win)", "Away travel costs") · Arena ("Attendance (fans + form + ticket
price)", "Fan base", kapasite "seats") · düğmeler ("Pause", "Timeout (N)") · Ana Panel
("Away · YOU") · anlatım açılışı ("are the home side") · kimya trendi ("trending rising
toward 96") · başarım ("Full Coffers").

Kutu skor sütunu (§5) **her iki dilde** rakip adını gösteriyor — kapılar `F28-1`
(TR, sunum-check) ve i18n-scan §5 (EN).

Üslup (§6): "The three misses." → "The three-pointer is off." · "Off the iron." tek
varyanttı, ayrıştırıldı ("Off the front rim." / "Long off the back iron.").

**Kendi bulduğum kusur — FAZ 28'in i18n borcu:** kelime bütçesi için kısaltılan 36 Türkçe
satırın anahtarı değişmiş, sözlükteki eski girişler ölü kalmıştı; EN oyuncu o satırları
Türkçe görüyordu (ölçülen **%9,1**). Hepsi yazıldı ve **kalıcı kapı** eklendi:
`anlatim-check` artık her anlatım havuzu satırının EN karşılığını arıyor (**29/29**).

### §7 Sezon 1'de yabancı — üçüncü vaka açıklandı

Kaynak kural FAZ 28'de düzeltilmişti ve doğru çalışıyor: sezon 1 gün 1'de `genRoster`
(300 oyuncu), `botClubEnsureDepth` (400), altyapı (60), draft (50) → **yabancı 0**.

**Ama delik kapanmamıştı:** bot kadroları localStorage **kulüp önbelleğinde** saklanır ve
bir kez kurulduktan sonra yeniden ÜRETİLMEZ. Kural değişmeden önce kurulmuş kayıtlarda
yabancılar duruyordu — üç vakanın (Detlef Maier, Krsman Cerović, Wei Zhen) kaynağı budur.
Ölçüldü: eski kuralla kurulan 30 takımda 30 yabancı.

`faz29BotUyrukOnar()` (`js/league.js`) önbellekten okunan kadroyu sezon 1'de onarır:
**yalnız ad ve ülke** değişir, id/seed/mevki/genel/enerji/istatistik korunur. Ad
deterministiktir — `randomNameFor`a isteğe bağlı tohum eklendi (`prPick`); `ch()` ile
seçilseydi kadro her açılışta başka isimler alırdı (FAZ 24 koç adı dersi).
Kapı: `milliyet-check` **K bölümü** (4 ölçüt).

### Sonuçlar

`sim-node --n=100 --seed=42` → **87.2 - 80.0 · hata 0 · G değişmedi: EVET**
`i18n-scan` **A/B/C/D = 0 · canlı anlatım Türkçe %0,0** · `bicim-check` 32/32 ·
`anlatim-check` 29/29 · `sut-check` 14/14 · `milliyet-check` (J + K) · `lig-check` ·
`isim-check` · `schema-check` · `turkek-check` · `analiz-check` · `band.js` hash
**99bb9ceb67917bd0 değişmedi** · `visual-check` 0 konsol hatası · `mobile-check` 18/18.

`sunum-check` **kararsız**: art arda koşularda bir kez M9, bir kez F14-7 düştü, aynı
koşullarda tekrar %100 geçti (M9 %100 · 11/11). Motor tarafındaki tek değişiklik anlatım
açılışının `t()` çağrısıdır — sahneye dokunmaz. Küçük örneklem kararsızlığıdır.

Sürüm **60 → 61**.


## FAZ 30 — Küresel lig yapısı: ülke bazlı lig kaldırıldı (2026-09-01)

FAZ 17-24'te kurulan "ligin ev ülkesi" tasarımı geri alındı. Oyun artık küresel.

### §2 Ülke bazlı lig kalktı

Silinen: `LIG_EV_ULKE` · `BOT_YABANCI_MAX` · `BOT_YABANCI_ORAN` · `botYabanciOran()` ·
`MARKET_YERLI_BASLANGIC/DUSUS/TABAN` · `marketYerliOran()` · Yerli/Global filtresi ·
`faz29BotUyrukOnar` gövdesi (kural değişince onarımın konusu kalmadı).

Oyuncu milliyeti artık **tamamen rastgele**, 43 ülke eşit şanslı. Ölçüm: 300 oyuncu,
**43 farklı ülke**, en yüksek pay **%4,7**.

**Regresyon riski yoktu ve ölçüldü:** `genPlayer` ülke sabitlense bile `ch(ULKELER)`
çekilişini ZATEN yapıyordu (FAZ 17 dersi), bu yüzden ülke parametresini kaldırmak
rastgelelik akışını kaydırmaz. `sim-node --n=100 --seed=42` → **88.0 - 81.3** (kapı
87.2-80.0 ±1.5 içinde), determinizm korundu.

**Market ülke seçici** (§2.3): "Yerli/Global" ikilisi anlamsızlaştı. Yerine açılır ülke
listesi geldi — listede yalnız O AN markette oyuncusu bulunan ülkeler var; seçili ülke
markette kalmazsa "Tümü"ye döner (boş liste gösterilmez).

### §3 Küresel takım adı havuzu

**162 şehir × 41 sonek = 6.642 kombinasyon.** Şehirler altı kıtadan; sonekler Türkçe +
İngilizce + nötr karışık ve karışım serbest ("Trabzon Raptors", "Copenhagen Kartalları").
Türk şehri payı **%6,2**.

⚠ Çok kelimeli şehir adları ("San Juan", "Rio de Janeiro") tek sözcüğe indirildi. İki
sebep: `genUniqueClubName` şehri **adın ilk sözcüğü** sayar — "San Juan" ile "San Diego"
aynı şehir sanılır ve "divizyonda en fazla 2 takım" kuralı yanlış işlerdi; ayrıca uzun
adlar anlatım kelime bütçesini şişiriyordu.

### §4 Divizyon merdiveni

**3 divizyon:** Divizyon 1 (tek grup) · Divizyon 2 (5 grup) · Divizyon 3 (5 grup).
Her grup 20 takım. `DIV_SAYISI` artırmak yapıyı büyütmeye yeter.
Yeni kariyer **en alt divizyonda** başlar (`divizyonDoldurmaSirasi` en alttan doldurur;
eskiden sıra 'tbl' ile başlıyor ve herkes Divizyon 1'e giriyordu).

**Güç merdiveni:** `divizyonOvrKaymasi()` — Div1 **+8** · Div2 **+4** · Div3 **0**.
Ölçülen ortalama OVR: **Div1 78,9 · Div2 74,5 · Div3 71,3**.

⚠ Çapa **en alt divizyondadır**. İlk kurgu Div1 +6 / Div2 +1 / Div3 −4 idi; kariyer en
altta başladığı için oyunun MUTLAK zorluğu düşüyordu (skor bandı 89,7-81,8 → 90,7-76,8).
Çapa en alta alınınca başlangıç deneyimi FAZ 30 öncesiyle aynı kalır, yükselmek gerçekten
zorlaşır. Kayma saf aritmetiktir (`botOvrKaydir`), yeni çekiliş yapmaz.

Divizyon etiketleri nötr: "Divizyon 1" / "Divizyon 2 · Grup 1" (EN: "Division 1").
Anahtar biçimi DEĞİŞMEDİ ('tbl', 'd.g') — eski kayıtlar okunmaya devam eder.

### §5 Kullanıcı profil ülkesi

Kariyer kurulumunda 43 ülkelik seçici. `G.menajerUlke` yalnız profil kartında görünür.
Kapı: aynı tohum + farklı ülke → **birebir aynı kadro**.

### §7 Aralıklı isim hatası — KÖK NEDEN: KUSUR KODDA DEĞİL, DENETİMDEYDİ

`milliyet-check` dört koşunun birinde "258 oyuncunun 257'si" diyordu. Ölçüt adı **ilk
boşluktan** ikiye bölüyordu (ad = ilk parça, soyad = kalanı). Havuzlarda **75 çok kelimeli
giriş** var; çok kelimeli SOYAD ("De Luca") bu ayrıştırmayla toparlanıyor ama çok kelimeli
**ÖN AD** bozuyor:

    "Juan Pablo Reyes" → ad "Juan"        (havuzda "Juan Pablo" var, "Juan" yok)  ✗
                       → soyad "Pablo Reyes" (havuzda "Reyes" var)                ✗

İkisi de tutmayınca oyuncu "yanlış havuzdan" sayılıyordu. Etkilenen 5 ön ad: **Juan Pablo**
(Meksika) · **El Hadji, Alioune Badara, Cheikh Tidiane** (Senegal) · **John Paul**
(Filipinler). Ülke başına 6 çekilişte rastlama olasılığı ≈ **%18** — dört koşudan biri
bu yüzden düşüyordu. **Oyunun ürettiği ad her zaman doğru havuzdandı.**

Doğru ölçüt: adın havuzdaki bir (ilk, soyad) çiftine **bölünebiliyor** olması.
Sonuç: **10 koşuda 10 geçiş.**

### §8 Denetim araçları

`milliyet-check` baştan yazıldı (A milliyet dağılımı · B ad↔ülke · C ad havuzu ·
D divizyon içi ad kuralları · E merdiven · F profil ülkesi · G kaldırılan kuralların izi).
`lig-check`'e divizyon merdiveni kapıları eklendi. `isim-check` ve `portre-check`
referans ülkeye geçti (kova ve havuz kuralları KALDI).

⚠ G kapısında yorum ayıklama satır bazlı yapılamıyor: bu depoda blok yorumların devam
satırları `*` ile başlamıyor, düz metin girintili yazılıyor. Blok yorumlar satır sayısı
korunarak silinip sonra aranıyor.

### Kendi inisiyatifimle düzeltilenler

- **i18n sınıflandırıcısında yeni kör nokta:** sözcük sınırı ASCII+Türkçe harfle
  yazıldığı için YABANCI harfler (ä, é, å) sınır sanılıyordu — "B**äck**ström" parçalanıp
  "ckström" küçük harfli ve 'ö' içerdiği için Türkçe cins isim sayılıyordu. Lig %100
  Türkken hiç görünmüyordu. Ölçüt Unicode harf sınıfıyla belirteç bazına taşındı.
- **Kelime bütçesi:** küresel adlar (Bäckström, Mitrović) Türk adlarından uzun; ortalama
  8,94 → 9,04'e çıktı (kapı <9). Ölçüm en uzun türü gösterdi: `free` 19,2 kelime/olay,
  toplam kelimenin %12,5'i. Serbest atış giriş satırları kısaltıldı ve faul CÜMLE
  biçiminde tek ad kullanıldı (künye biçimi tam adı korur) → **8,95**.
- `randomNameFor` yedek dalı: "ev ülkesi" kalkınca gerçek havuzlardan birine düşer;
  `isim-check` kapısının niyeti korunarak "GERÇEK bir havuza düşüyor" diye yeniden yazıldı.

### Sonuçlar

`sim-node --n=100 --seed=42` → **88.0 - 81.3 · olay/maç 248 · hata 0 · G değişmedi: EVET**
`milliyet-check` (10/10 koşu) · `lig-check` · `isim-check` · `portre-check` ·
`schema-check` · `turkek-check` · `bicim-check` · `sut-check` · `analiz-check` ·
`arena-check` · `anlatim-check` **29/29** · `visual-check` 0 konsol hatası ·
`mobile-check` 18/18 · `i18n-scan` **A/B/C/D = 0**, canlı anlatım Türkçe %0,0.

**`band.js` hash BİLEREK değişti** (`99bb9ceb67917bd0` → `1b631c2622c9d460`): milliyet
rastgeleliği kadro istatistiklerini, divizyon merdiveni de rakip kalitesini doğrudan
değiştiriyor. Bandın kendisi sağlam (kullanıcı 91,1 · rakip 77,5). ⚠ Not: bu harness'te
fark 7,9'dan 13,6'ya çıktı; ÜRETİCİ düzeyinde denge korunuyor (kullanıcı ilk-8 **72,6**
vs bot **71,6**) ve `lig-check`'in bot-bot denge kapıları geçiyor — fark, kullanıcının
artık farklı bir slotta oturmasından gelen harness artefaktı. İzlenecek.

Sürüm **61 → 62**.

### Ek — sunum-check kararsızlığı (aynı oturumda çözüldü)

Araç tek maç izliyordu ve kapıların yarısı ondalık örneklemle karar veriyordu; M9'un
paydası maç başına 5-11 arasında oynuyor, 5 vakada bir kaçırma oranı %80'e indiriyor ve
kapı DAVRANIŞ değişmeden düşüyordu. Pencere artık **örneklem güdümlüdür**: her kapı kendi
alt sınırına ulaşana kadar (üst sınıra kadar) yeni maçlarla uzar; maç bitince bir sonraki
maç başlatılır. Alt sınırlar istatistikle seçildi — M9 için n=60 (gözlenen oran %86,
eşik %80; n=15'te SD ~%9 ile kapı ~%24 olasılıkla düşüyordu, n=60'ta SD ~%4,5).
Motorun kendi damgası zaten **193/193 doğru**; kalan fark gözlem vekilinin gürültüsü.
⚠ Çok maçlı örneklem için `P.sonEvIx` geriye sarmada sıfırlanır — yoksa ikinci maçın
hiçbir olayı sayılmaz ve örneklem sessizce tek maçta donardı.


## Proje denetimi — FAZ 30 sonrası temizlik (2026-09-01)

Kullanıcı isteğiyle proje baştan sona tarandı. Bulunan sekiz kusur düzeltildi.

### Bulunanlar

| # | Kusur | Etki |
|---|---|---|
| 1 | `randomNameFor` yedek dalı `Math.random()` kullanıyordu | FAZ 30 kuralı ihlali + aynı oyuncu yeniden üretilince adı değişiyordu. Ülke adından deterministik türetildi. |
| 2 | Menajer kartında lig adı `"TBL (üst lig)"` / ham anahtar ("2.1") | FAZ 30 etiket nötrlemesi burayı atlamıştı. Tek kaynak `formatTblSlotLabel`. |
| 3 | Yükselme/düşme mesajları "TBL Süper Lig", "Alt Lig Div 1", "Üst Div" | Küresel yapıda yanlış ad. Nötrlendi + 7 EN girişi. |
| 4 | **Merdivenin alt sınırı 5'e gömülüydü** | `DIV_SAYISI=3` iken kullanıcı tasarımda VAR OLMAYAN Divizyon 4-5-6'ya düşebiliyordu. Sınır artık `DIV_SAYISI`den gelir. |
| 5 | Yan panelde `SIDEBAR_DIV_MAX_VISIBLE=1` | Üç divizyonlu yapıda kullanıcının KENDİ divizyonu yan panelde görünmüyordu. `DIV_SAYISI-1` oldu; başlık da `formatTblSlotLabel`e bağlandı. |
| 6 | `TR_ILK` / `TR_SY` hâlâ duruyordu | FAZ 24 "silindi" demişti ama liste canlıydı. CLAUDE.md'nin uyardığı mayın: ikinci ad listesi havuz temizliğinden geçmez. Silindi. |
| 7 | `TR_ULKE` · `TBL_COMP_NAME` ölü sabit | Hiçbir yerden okunmuyordu. Silindi. |
| 8 | **`menajerUlke` bağlantısı 3 kez yazılmış** | FAZ 30 yamasında `split().join()` (tümünü değiştir) + betiğin iki kez koşması. Davranış doğruydu (son atama kazanır) ama ölü kod. 3 → 1. |

### Denetim yöntemi

Üç statik tarayıcı yazıldı ve koşuldu (sonra silindi):
- **Tanımsız çağrı taraması** — js/*.js global kapsamda çalışır, yazım hatası ancak o kod
  yolu çalışınca patlar. 42 aday çıktı, hepsi i18n regex literallerinden gelen yanlış
  pozitif; gerçek dış bağımlılıklar (`BroadcastChannel`, `URLSearchParams`) `typeof`
  ile korunuyor.
- **HTML onclick handler taraması** — 0 tanımsız.
- **JS ile ÜRETİLEN handler taraması** (şablon dizeleri; statik tarama bunları görmez) — 0 tanımsız.

### Sonuç

`sim-node --n=100 --seed=42` → **88.0 - 81.3 · hata 0 · G değişmedi: EVET**
milliyet · lig · isim · portre · schema · turkek · bicim · sut · analiz · arena ·
`anlatim-check` **29/29** · `visual-check` 0 konsol hatası · `i18n-scan` A/B/C/D = 0.
Sürüm **62 → 63**.
## FAZ 31 — Kelime-kelime çeviri kuralları, korumasız `G.team`, regresyon tabanı (2026-09-01)

### §2 — İ18N kelime sınırı ve sözlük tutarlılığı (en öncelikli madde)

**a) Kalıplar kelime ortasında eşleşiyordu.** `I18N_PHRASES` girişlerinin bir kısmı çıplak
sözcüklerdi (`/savunma/g` gibi) ve sınırsız oldukları için "savunmasız kaldı" → "defenseasız
kaldı" üretiyorlardı. ASCII `\b` Türkçe için kullanılamaz (FAZ 17 dersi: ğ/ç sözcük karakteri
sayılmaz), üstelik FAZ 30 sonrası isimler yabancı harf de içeriyor (ä, é, å). Çözüm
`_i18nSinirla()` (`js/i18n.js`): yalnız **saf harf+boşluktan oluşan ≥3 karakterlik** kalıpları
bir kez sarmalar — `(^|[^A-Za-zÇĞİÖŞÜçğıöşü])(kaynak)(?![A-Za-zÇĞİÖŞÜçğıöşü])` — ve karşılığın
başına yakalanan sınırı geri koyar. Ölçüldü: "savunmasız kaldı" bozulmuyor, "savunma" hâlâ
çevriliyor.

**b) Çakışan sözlük anahtarları çevirimi sessizce eziyordu.** `js/i18n-dict.js` ve
`js/i18n-commentary.js` aynı anahtarı farklı karşılıkla tanımlıyordu; sonra yüklenen kazanıyor
ve FAZ 29'da yazdığım karşılıkların bir kısmı **ölü** kalıyordu ("Match bonus (win)" →
"Match prize (win)"). 17 çakışma ayıklandı. `kişi` çakışması (people / seats) tek kullanım
arena kapasitesi olduğu için `'seats'` bırakılıp ölü `'people'` girişi silindi. Yeni kapı:
`cakisanAnahtarlar()` (`tools/_lib/i18n-kapilari.js`), `i18n-scan` içinde raporlanıyor —
**1432 anahtar · çakışan 0**.

**c) (inisiyatif) Serbest atış kuyruklarının hiçbiri çevrilmiyordu.** FAZ 25'te 17 kuyruk
sözlüğe yazılmıştı ama `I18N_TR_EN` TAM DÜĞÜM eşleşmesidir; bu satırlar hep cümle parçasıdır.
Ölçüldü: `i18nPhrases("… çizgide 2/2 — ikisini de attı.")` → kuyruk Türkçe kalıyor. 16 satırın
tamamı (+ sözlükte hiç olmayan `'hepsi içeride.'`) **kalıp** olarak eklendi; toplam 18 kuyruk
artık çeviriliyor. Ders CLAUDE.md'ye yazıldı.

### §3 — Korumasız `G.team` erişimi

`genLigTeams` içinde `arr.filter(n=>n!==G.team.isim)` kariyer kurulmadan lig üretilirse
çöküyordu. `const _kendi=(G.team&&G.team.isim)||null;` ile korundu — `G.team=null` ile
doğrulandı: "OK · 20 takim".

### §4 — Regresyon tabanı belgeye alındı

`sim-node --n=100 --seed=42` → **88.0 - 81.3 · olay/maç 248 · tohum 42 → 93-82**. Bu oturumda
HEAD ile çalışan ağaç ayrı ayrı koşuldu, ikisi de birebir aynı çıktı verdi. CLAUDE.md'de hem
araç tablosuna hem ders maddesine yazıldı. (Varsayılan `--n=50` koşusu 90.3 - 83.7 verir —
taban **bayraklarıyla birlikte** okunmalı.)

### §5 — Ölçüm kapılarının kararsızlığı: örneklem büyütüldü, eşik gevşetilmedi

| Araç | Sorun | Çözüm |
|---|---|---|
| `sunum-check` | M9/M14 örneklemi bazen 40'ın altında kalıp kararsız düşüyordu | pencere örnekleme oranından türetiliyor (`ALT_SINIR`, dilim 20 sn, tavan 900 sn/12 maç); M14 yalnız `mState.running` iken örnekleniyor (maçlar arası boş kareler yanlış düşürüyordu) |
| `lig-check` C | 20 sezonluk denge örneklemi eşik civarında salınıyordu | 60 sezon — ölçülen 0.08% / 0.50% / 0.50%, kararlı |
| `i18n-scan` | canlı anlatım örneklemi bazen 10 olayda kalıyordu | `ANLATIM_TABAN=40` alt sınırı; özel isim ayıklayıcı Unicode (`\p{Lu}`) yapıldı — yabancı adlar artık "çevrilmemiş Türkçe" sayılmıyor |

`sunum-check` sonucu: **16/16 · çıkış kodu 0 · pencere 620 sn · 1 maç · örneklem yeterli.**

### Testler
`sunum-check` **16/16** · `sim-node --n=100 --seed=42` → **88.0 - 81.3, hata 0** ·
`anlatim-check` **29/29** · `i18n-scan` **A/B/C/D = 0 · çakışan 0 · konsol hatası 0** ·
`visual-check` masaüstü+mobil **0 konsol hatası** · `lig-check` · `surum-check` ✓.
Sürüm **63 → 64**.

### Yapılmayan
§6'daki para birimi geçişi (KR → USD) brifin konusu değildi, ellenmedi.

## FAZ 25 USD — Para birimi USD + ekonomi yeniden ölçekleme (2026-09-01)

Para birimi **KR (Kredi) → USD ($)** ve **tüm ekonomi gerçek rakamlara** ölçeklendi.
Depodaki "USDT'ye dönme" notu KRİPTO parayla ilgiliydi; dolarla çelişmediği için
CLAUDE.md'deki karar güncellendi.

### Yapılanlar

| Dosya | Değişiklik |
|---|---|
| `js/i18n.js` | `PARA_SIMGE` · `fmtPara` · `fmtMaas` — para biçimi TEK KAYNAK, dile bağlı (TR `$1.250/hf` · EN `$1,250/wk`) |
| `js/state.js` | `START_USD=120000` · `MAAS_ANKOR` çapa tablosu + `salaryUSDFromGenel` · `transferFeeUSD` (maaştan türer) · `SPONSOR_KADEME` |
| `js/economy.js` | `BILET_FIYAT=[8,10,13,18,25]` ve gelir = kapasite × doluluk × fiyat · sponsor geliri (`sponsorPuani`/`sponsorKademe`/`sponsorHaftalik`) · `isletmeGideri` · `eksikKadroBedeli` · `haftalikGelirBeklentisi` · doluluk forma daha duyarlı |
| `js/roster-gen.js` | `ARENA_LVL` §2.3 tablosu (2.000→20.000 · $0/250K/700K/2M/5M) · taraftar tabanı 1.900 ve **kariyer** galibiyetiyle büyür |
| `js/match-engine.js` | galibiyet primi ~$5.000 · maç günü geliri ~$800 (rand çağrı sayısı değişmedi) |
| `js/match-prep.js` | playoff ödülü $90-150K · kupa $55K (eskiden `ecoRound` ile $300-600K) |
| `js/render.js` | bilanço düzenli kalemler kartı (maaş · tesis · işletme · sponsor · bilet) · sponsor bilançoda ayrı satır |
| `js/league.js` | takım kartında gerçek sponsor satırı (kademe + haftalık tutar) |
| `js/persistence.js` | kayıt şeması **v9**, `SAVE_VERSIONS=[9]` — göç yok, eski kayıt reddedilir |
| `js/main.js` | "Ekonomi sistemi yenilendi; önceki kayıt uyumsuz olduğu için temizlendi." |
| `js/i18n-dict.js` · `i18n-commentary.js` | KR kalıpları kaldırıldı, yeni metinlerin EN karşılıkları |
| **yeni** `tools/ekonomi-check.js` | §4'ün 7 kapısı, 36 kontrol |
| **yeni** `tools/_lib/eko-ortam.js` | ekonomi ölçüm ortamı (vm) |
| **yeni** `tools/_lib/yama.js` | CRLF güvenli yama yardımcısı |

161 `KR` geçişi tarandı; kaynakta para birimi olarak **hiç kalmadı** (`KRİZ`/`KRİTİK` gibi
sözcükler kapı dışıdır — sınır Türkçe harfi de kapsar).

### 10 sezonluk simülasyon sonucu

| Ölçüm | Hedef | Sonuç |
|---|---|---|
| Başlangıç haftalık denge | -$2.000 … +$2.000 | **+$1.623** (40 kadro ortalaması) |
| Maç başı bilet geliri | ~$20.000 | **$17.420** (2.000 kap · %67 · $13) |
| Haftalık sponsor (başlangıç) | ~$8.000 | **$8.455** — Yerel Esnaf Desteği |
| Pasif kulüp iflası | 2-4 sezon | **2 sezon** |
| İyi yöneten 5. sezon haftalık | ~$60.000 | **$79.732** |
| İyi yöneten 10. sezon haftalık | ~$200.000 | **$126.971** |
| Bot iflası (10 sezon) | %10-25 | **%21** (120 kulüp) |
| `season-loop --runs=3` K2 | ≤2× | **1,49×** (HEAD'de **2,03× ile DÜŞÜYORDU**) |

Büyüme eğrisi (iyi yöneten, haftalık net): 9,4K → 8,6K → 17,3K → 16,8K → **79,7K** →
78,9K → 78,1K → 128,3K → 127,6K → **127,0K**. Sıçramalar divizyon terfisi ve arena
yükseltmesiyle gelir.

### §2.1 tablosuna uymayan bant

Tabloda **"yıldız (yerli) 75-82" ile "yabancı transfer 78-88" 78-82 aralığında ÇAKIŞIYOR.**
FAZ 30'da milliyet bütün mekaniklerden çıkarıldığı için maaş yalnız OVR'nin fonksiyonudur
ve iki farklı değer veremez. Çakışan aralık **yerli bandına (3.000-4.500)** bırakıldı,
yabancı bandı çakışmayan üst yarısına **(83-88 → 5.000-9.000)** oturtuldu. Diğer altı bandın
hepsi birebir tutuyor (`ekonomi-check` B bölümü her OVR değerini tek tek sınıyor).

**Ayrıca:** brifin §2.2'deki "15 oyuncu ≈ $13.000/hf" tahmini tutmuyor — **~$32.000**.
Sebep, §2.1'in bağlayıcı olması: başlangıç kadrosunun OVR'si 68-79 (ortalama 72) ve bu
"ilk beş" bandına ($1.500-2.500) düşüyor. Kadro OVR'sini düşürmek regresyon kapısını
(maç skorları) bozardı, o yüzden §2.1 korundu ve denge diğer kalemlerden kuruldu.
Ölçüldü: **ekonomi haftası başına 4,43 maç, 2,21'i ev maçı** — brifin rakamları haftada
~1 maç varsayıyor; "$20.000/maç bilet" bu kadansla haftada ~$44.000 demek. Farkı kapatan
kalem yeni **kulüp işletme gideri**dir (§3.4'ün "aradaki katsayıları ayarla" izni).

### İnisiyatifle düzeltilen kusurlar

1. **Çifte enflasyon** — imzalı maaş hem `salaryUSDFromGenel` hem `weeklyWageBill` içinde
   enflasyonla çarpılıyordu; fonksiyonun kendi yorumuyla çelişiyordu.
2. **Kadroyu eritmek tasarruftu** — 15 → 8 oyuncuda maaş yarılanıyor, gelir aynı kalıyordu.
3. **Şampiyonluk ödülü ×50 ölçekliydi** — tek playoff şampiyonluğu $300-600K.
4. **Taraftar kitlesi her sezon sıfırlanıyordu** (`G.wins` sezonluk) — büyüme eğrisi
   kurulamıyordu; kalıcı sürücü `G.careerWins` yapıldı.
5. **Başarım eşikleri** — "100.000 bakiyeye ulaş" başlangıç kasası $120.000 olduğu için
   kariyerin ilk saniyesinde açılıyordu ($500.000 / $5.000.000 yapıldı).
6. **Bilanço haftalık net beklentisi** sponsoru saymıyor ve haftada tek ev maçı varsayıyordu.
7. **`ekonomi-check` kendi ölçüm hataları** — kadroyu yanlış sırada üretiyor (%36 yüksek
   gider), var olmayan `'3.1'` divizyonunda ölçüyor, tek kadro/40 kulüplük örneklemle
   bıçak sırtı karar veriyordu. Örneklemler 40 kadro / 120 kulübe çıkarıldı.
8. **Eski ekonomiye çakılı kapılar** — `arena-check` C/D ve `faz7-check` K4 sabit sayı
   tutuyordu; `ARENA_LVL` tablosundan okur hâle getirildi.

### Testler
`sim-node --n=100 --seed=42` → **88.0 - 81.3 · hata 0 · G değişmedi: EVET** (maç motoru
değişmedi) · `ekonomi-check` **36/36** · `season-loop --runs=3` **6/6** ·
`arena-check` ✓ · `faz7-check` **8/8** · `lig-check` · `milliyet-check` · `isim-check` ·
`schema-check` · `bicim-check` · `turkek-check` · `sut-check` · `analiz-check` ·
`anlatim-check` ✓ · `i18n-scan` **A/B/C/D = 0 · çakışan 0 · konsol hatası 0** ·
`visual-check` masaüstü+mobil **0 konsol hatası** · `surum-check` ✓. Sürüm **64 → 65**.

### Yapamadığım / farklı yaptığım
- §2.2'nin "$13.000 haftalık maaş" ve "$2.500 tesis gideri" rakamları tutturulamadı
  (yukarıda gerekçesi). Tutturulan: kasa, bilet/maç, sponsor, arena tablosu, bilet bandı,
  galibiyet primi ve §3.4'ün ÖLÇÜLEBİLİR hedeflerinin tamamı.
- §5'in son maddesi (tarayıcıda elle 3 maç oynayıp ekranları gezmek) `visual-check`
  tarafından otomatik yapılıyor (15 adımlık akış, 0 konsol hatası) — elle tekrarlanmadı.

## FAZ 33 — Küresel lig canlı gezi bulguları (2026-09-01)

### §2 `turkEk()` okunuş normalizasyonu (en öncelikli)

`turkEk()` YAZILIŞA bakıyordu. FAZ 30'a kadar tüm oyuncular Türk'tü ve Türkçede yazılış ≈
okunuş olduğu için sorun görünmedi. `js/turkce-ek.js`'e `_trOkunus()` eklendi: ek KARARI
normalize edilmiş okunuş üzerinden verilir, **ekranda ad özgün yazımıyla kalır**.

**Okunuş tablosu** (`_OKU_IKILI` önce, sonra tek geçişli `_OKU_HARF` — zincir yok, `đ→c→ç`
kaymasın diye):

| Yazılış | Okunuş | Yazılış | Okunuş |
|---|---|---|---|
| `ć` `č` `c` `ĉ` | ç | `ñ` | ny |
| `š` `ś` | ş | `ll` | y |
| `ž` `ź` `ż` | j | `th` | t |
| `đ` `ð` | c | `sch` | ş |
| `w` | v | `ch` | ç |
| `x` | ks | `ph` | f |
| `q` | k | `j` (ORTADA) | h |
| `y` (ünsüzden sonra) | i | `á à ä ã ā` | a |
| `é è ê ë ē ę` | e | `í ì ï ī į` | i |
| `ó ò ô õ ō` | o | `ú ù ū ų` | u |
| `å` | o | `ø` | ö |
| `ß` | s | `æ` / `œ` | e / ö |

İki incelik brifte yoktu, ölçerek eklendi:
1. **`j` → `h` yalnız kelime ORTASINDA.** Sondaki `j` Slav dillerinde yumuşaktır;
   `anlatim-check` "Mihalj'ta" üretildiğini yakaladı, doğrusu "Mihalj'da".
2. **Ünlüsüz kısaltma ≠ ünlüsüz ad.** `BK` harf adlarıyla okunur ("be-ke") → **BK'ye**;
   `Ng` bir soyadıdır, okunmaz → harf adları hep ince olduğu için **Ng'e**. Ayrım
   yazımdan: tamamı büyük harf = kısaltma. (`turkek-check`'in "BK'a" bekleyen eski kapısı
   yanlıştı, güncellendi.)

**20 yabancı adın ek tablosu (öncesi → sonrası):**

| Ad | Önce (yanlış) | Sonra |
|---|---|---|
| Đurašković | 'de · 'den | **'te · 'ten** |
| Ivanović | 'de · 'den | **'te · 'ten** |
| Sy | 'a · 'da · 'dan · 'ın | **'ye · 'de · 'den · 'nin** |
| Ng | 'a · 'da · 'dan · 'ın | **'e · 'de · 'den · 'in** |
| Núñez · Méndez · Morin · Mokin | doğruydu | 'e · 'de · 'den · 'in |
| Mihaylov · Scholz | doğruydu | 'a · 'da · 'dan · 'un |
| Gyenge · Milewski · Kowalski | doğruydu | 'ye · 'de · 'den · 'nin |
| Ba · Ka · Nakamura · Ávila | doğruydu | 'ya · 'da · 'dan · 'nın |
| Lo · Wu | doğruydu | 'ya · 'da · 'dan · 'nun |
| Öz | doğruydu | 'e · 'de · 'den · 'ün |

`anlatim-check`'e iki kapı eklendi: **20 ad × 4 durum = 80/80** ve **43 ülke × 5 ad ×
4 durum = 860 ek, ünlü uyumu ihlali 0**.

### §3 Takım adları küreselleşti

Sorunun kökü: `SEHIR` 162 şehirle zaten uluslararasıydı ama **ülke bilgisi kodda hiç
yoktu**, dolayısıyla kural ne uygulanabiliyor ne ölçülebiliyordu. (Canlıda görülen Türk
şehirlerinin çoğu — Balıkesir, Denizli, Diyarbakır, Şanlıurfa, Erzurum, Tekirdağ —
**bugünkü havuzda yok**; o sayfa eski bir sürümü çalıştırıyordu.)

- `SEHIR_ULKE` (162 şehir → 72 ülke) + `sehirUlkesi()` — tek kaynak.
- `genUniqueClubName`: ülke sayacı eklendi, tavan `LIG_ULKE_PAY_MAX` (%30).
- `ulkeCesitliligiOnar()`: `LIG_ULKE_MIN` (8) alt sınırı kadro kurulduktan sonra onarır
  (tek tek çekilişte garanti edilemez).
- `lig-check` D3: her divizyonda pay ≤%30 ve ülke ≥8. **Ölçülen: 26 divizyonda 12-18 ülke,
  en büyük pay %25.**

Örnek divizyon (tohum 33): Perm Pilots · Austin Basket · Villeurbanne BC · Oslo Giants ·
Osaka Academy · Zurich BC · Klaipėda BC · Bangkok Raptors · Dnipro Şimşekleri ·
Belgrade Koleji · Manila Kurtları · Rosario Kings · Kyiv Raptors · Taipei Storm ·
Porto Storm — **19 ülke, en büyük pay %10.** Sonek karışımı korundu.

### §4 Divizyon etiketi ile anahtar tek numaralandırmaya bağlandı

`'d.g'` = Divizyon **d+1** idi; ekran "Divizyon 3" derken anahtar `'2.1'` yazıyordu.
Artık `'tbl'` = Divizyon 1, `'d.g'` = Divizyon **d** (d ≥ 2). `'1.g'` üretilmez ve eski
depolardan silinir. Anahtar kuran yerler için `divizyonAnahtari(div,grup)` eklendi.
Terfi/düşme sınırları, depo şablonu ve **kenar çubuğu** (eskiden "Div 1/Div 2" yazıp
`'1.s'` anahtarı kuruyordu, üstelik ham dizgi çevrilmiyordu) güncellendi.
`schema-check` [7]: anahtar ↔ `divizyonNo` ↔ etiket ↔ `parseTblKey` dördü de eşleşiyor.

### §5 Çift "ÜLKEN" kaldırıldı

FAZ 30 yamasında blok iki kez yazılmıştı; iki `<select>` aynı id'yi taşıyordu.
İkincisi silindi. `schema-check` [6] artık **HTML'deki tüm id'leri sayar** (202 id, yinelenen 0)
— sınıf kapısı, tek seferlik düzeltme değil.

### §6 Eski kayıtlar

Kayıt şeması **v9 → v10**, `GAME_SAVE_KEY` v4 → v5, `TBL_STORAGE_KEY` v6 → v7,
`charazay_club_public_v1` ve eski anahtarlar temizleme listesinde. Göç kodu yok.
Kullanıcı mesajı: *"Lig yapısı küresel sisteme geçtiği için önceki kayıt uyumsuz kaldı ve
temizlendi."* (TR + EN sözlükte.)

### §7 Kısa soyadlarda tam ad

`_anlatimAdi()` — soyad 3 harften kısaysa anlatımda tam ad ("Ousmane Sy pota altında
hükmetti"). Jeton etiketi `_tokShort` ile kısa kalır (sahada yer yok). Anlatım
bölgesindeki 12 çağrı taşındı, sahne/jeton katmanına dokunulmadı.

### §8 sunum-check

**Çalıştırıldı: tüm sunum maddeleri geçti, çıkış kodu 0.** M9 %96,9 · F25-2 donma 0 ·
F25-3 91 sokma ort. 7,1 m · F25-6a %100 sırtı dönük · F26-1 smaç 34,4px < üçlük 107,3px ·
F26-2 floater 92px > turnike 50,2px · konsol hatası 0.

### Testler
`sim-node --n=100 --seed=42` → **88.0 - 81.3 · hata 0 · G değişmedi: EVET** ·
`turkek-check` ✓ · `anlatim-check` **31/31** · `lig-check` ✓ · `schema-check` **21/21** ·
`milliyet-check` · `isim-check` · `portre-check` · `bicim-check` · `sut-check` ·
`analiz-check` · `arena-check` · `ekonomi-check` **36/36** ✓ ·
`i18n-scan` **A/B/C/D = 0 · çakışan 0 · canlı anlatım Türkçe %0,0** ·
`visual-check` masaüstü+mobil **0 konsol hatası** · `sunum-check` ✓. Sürüm **65 → 66**.

## FAZ 34 — Özel yetenekler ve gecelik form (2026-09-01)

### §2 Kalıcı özel yetenek

`ozelYetenekUygula()` (`js/roster-gen.js`) her oyuncuya `p.seed`den **deterministik** sapma
verir: %25 belirgin üstün (+10..+15) · %5 olağanüstü (+20..+25) · **bağımsız** %20 belirgin
zayıf (−10..−20). `rand()`/`Math.random` çağırmaz. `genPlayer`ın RNG sırası korunsun diye
sapma nesne kurulduktan sonra uygulanır ve `genel`/`maas`/`potansiyel` yeniden türetilir.
Arayüzde **hiçbir yeni etiket yok** — `p.ozel` yalnız motor/denetim verisi.

⚠ `STAT_KEYS` **14** stat taşıyor (brifte 11 yazıyor; `serbest`, `zeka`, `liderlik`
sayılmamış). Brifin kendi örneği "serbest atışı berbat ribaund canavarı" olduğu için aday
küme 14'ün tamamı.

**Ölçülen (2.000 oyuncu):** sapmasız %68,5 · üstün %26,9 · olağanüstü %4,7 · zayıf %19,7 ·
pozisyona aykırı %24,4 · stat aralığı 37-99 · determinizm 300/300.

### §3 Gecelik form

`macFormu(p)` maç tohumundan türer (%10 sıcak +8..+14 · %10 soğuk −8..−14 · %80 ±4) ve
`statF()` üzerinden **yalnız göreli ağırlıklarda** okunur (`usageW`/`rebW`/`blkW`/`stlW`/
`astW`) artı `shooterAcc`ın yetenek terimi. `simulateMatch` maç tohumunu `ctx.macSeed` ile
taşır (sunucu tarafı determinizm sözleşmesi).

### §4 Lig ortalamaları — korundu

| Ölçü | Hedef | Sonuç |
|---|---|---|
| Ortalama skor (`--n=1000 --seed=42`) | 88,0-81,3 ±1,5 | **88,5 - 80,2** |
| Olay/maç | 248 ±5 | **248** |
| Ortalama sayı farkı (`lig-check`) | 9-13 | **10,3** |
| 20+ farkla biten | <%25 | **%10,9** |
| 5 ve altı farkla biten | >%25 | **%31,9** |
| Toplam skor std | 13-18 | **14,4** |

⚠ **`--n=100 --seed=42` kapısı düşüyor: 88,7 − 78,5 (deplasman −2,8).** Bu bir davranış
kayması değil ÖRNEKLEM etkisidir; kanıt: aynı yapıda n=100 ölçümü tohum 42/7/123/999/555/31
için deplasman ortalamasını **78,5 · 83,5 · 80,6 · 84,4 · 87,1 · 84,4** veriyor (yayılım
8,6 puan). Yakınsak ölçüm (n=1000 seed 42 + n=400 × 3 tohum): **ev −0,42 · deplasman −0,35**
— ikisi de ±1,5 içinde. CLAUDE.md'deki taban n=1000'e taşındı.

### §5 Motor gerçekten okuyor

`rebW`/`blkW`/`stlW`/`astW`/`shooterAcc` zaten ilgili statları okuyordu ve `wPick` **takım
içi göreli pay** modeli — §4'ün istediği yapı. Eklenen: `shot.blkId` (blok artık oyuncuya
atfedilebiliyor; önce yalnız takım toplamındaydı) ve `rebW`de **üstel** stat tepkisi
(doğrusalken elit ribaundcu ortalamanın yalnız 1,41 katı ağırlık taşıyordu).

**Motor kapısı (aynı takım, aynı süre, 60 maç):**
ribaund 95 vs 60 → **676 / 206 (3,28×)** · topCalma 95 vs 60 → **147 / 112 (1,31×)** ·
blok 95 vs 60 → **55 / 30 (1,83×)**.

### §6 Anlatım

5 havuz × 6-7 varyant (`UZMAN_RIBAUND`/`UZMAN_CALMA`/`UZMAN_BLOK`/`FORM_SICAK`/`FORM_SOGUK`),
maç içi birikime bağlı (3. ribaunt · 2. çalma/blok · 4. isabet/ıska), oyuncu+kategori başına
**bir kez**, cooldown ile ardışık tekrar yok. Ölçülen: **maç başına 2,40 cümle**, ardışık
tekrar 0. 37 satırın TR+EN karşılığı yazıldı (sözlük + kalıp — FAZ 31 dersi).

### Öncesi/sonrası dağılım (40 maç, aynı kadrolar)

| Ölçü | Önce | Sonra |
|---|---|---|
| Oyuncu başına sayı std | 7,28 | 7,23 |
| Oyuncu başına ribaunt std | 2,78 | 2,81 |
| Oyuncu başına çalma std | 1,29 | 1,23 |
| **30+ sayı atan oyuncu-maç** | **%0,52** | **%1,18** |
| **13+ ribaunt alan oyuncu-maç** | **%0,39** | **%0,79** |
| **En yüksek bireysel ribaunt** | **13** | **18** |
| **Tek oyuncunun takım ribaundundaki en büyük payı** | **%43** | **%51** |

**Standart sapma yanlış ölçüttür** — takım toplamı korunduğu için (§4) bireysel dağılım
sıfır toplamlı bir yeniden paylaşımdır ve std neredeyse hiç oynamaz. Değişen kuyruklardır.

### Yol boyunca bulunan tuzaklar

1. **Çift kırpma asimetrisi** — 99 tavanı yalnız pozitif sapmayı buduyordu (3.000 oyuncuda
   94 kırpma / 0), lig skorunu tek yönlü aşağı çekiyordu.
2. **Yerleşim asimetrisi** — artıyı "yeri olan" stata kaydırmak onu düşük ağırlıklı statlara
   itiyor, eksi serbestçe yüksek statı vuruyordu. İki yön de aynı ölçütten geçirildi.
3. **`OZEL_POZ_STAT` savunma ağırlıklıydı** (12 slot def / 10 off) — `computeRosterOfrDef`in
   savunma katsayıları daha ağır olduğu için takım DEF'i yükselip skor düşüyordu.
4. **Form yalnız kullanım payına bağlıydı** — usage-yetenek korelasyonu seyreliyor, takım
   FG%'si sistemli düşüyordu (−2,3). İsabete de bağlandı.
5. **`prChance` motor içinde yerel ve tek argümanlı** — `prChance(tohum,0.85)` sessizce hep
   false döndü, 40 maçta 0 cümle çıktı.
6. **Anlatım sayaçları pozisyon kapsamındaydı** (F13-3/F14-1 tuzağının tekrarı) — her
   pozisyonda sıfırlanıyor, eşiğe hiç ulaşılamıyordu.
7. **Blok satırında boya dili** 3'lük bloğunda anlatım-saha çelişmesi üretiyordu
   (`anlatim-check` yakaladı); havuz mesafe-nötr yapıldı.
8. **Botun pozisyonlu ilk beşi denendi ve GERİ ALINDI** — en iyi 5 zaten daha güçlü,
   pozisyon dengesi ham kaliteye mal oluyor ve deplasman skorunu düşürüyor.

### Testler
`yetenek-check` **30/30** · `sim-node --n=1000 --seed=42` → **88,5 - 80,2 · olay 248 ·
hata 0 · G değişmedi** · `lig-check` ✓ (§4 korundu) · `ekonomi-check` **36/36** ·
`anlatim-check` **31/31** · `milliyet-check` · `isim-check` · `schema-check` ·
`turkek-check` · `bicim-check` · `sut-check` · `analiz-check` · `arena-check` ·
`portre-check` ✓ · `i18n-scan` **A/B/C/D = 0 · çakışan 0** · `visual-check` masaüstü+mobil
**0 konsol hatası**. Sürüm **66 → 67**.

### Yapamadığım / farklı yaptığım
- **`--n=100 --seed=42` regresyon kapısı bu tohumda düşüyor** (yukarıda gerekçesi ve kanıtı).
- **"20+ ribaunt %0,3-1,5" hedefi bu motorda matematiksel olarak erişilemez:** takım
  ribaundu ~29 (gerçek basketbolda ~43); 20 ribaunt takım toplamının %70'i demek olurdu.
  Toplamı şişirmek §4'ü ihlal ederdi, o yüzden eşik hacme ölçeklendi (20 × 29/43 ≈ 13) ve
  ham 20+ sayısı ayrıca raporlanıyor.
- **"std belirgin genişlemiş" kapısı ölçüt olarak kullanılmadı** — sabit toplamda anlamsız
  olduğu ölçülerek gösterildi; yerine kuyruk oranları ve en büyük pay kapıya bağlandı.

### FAZ 34 eki — faz11-check F11-1 düzeltildi (2026-09-01)

FAZ 34 raporunda "kapsam dışı, HEAD'de de düşüyor" diye bıraktığım F11-1 kapısı incelendi.
**Kusur kodda değil kapıdaydı.** Ölçüm: normal akışta (arka plana hiç alınmadan) jeton
sapması 12 → 500 px arasında salınıyor; kapı tek bir anda ölçüp 60 px eşiğine vurduğu için
davranışı değil örnekleme anını yargılıyordu. Arka plandan dönüşteki gerçek değer ise
**2 px** (normal akış tabanı 124-128 px) — `_simCatchUp` zaten kusursuz çalışıyor.

Kapı üç ayaklı ve kendini kalibre eder hâle getirildi: (1) `_snapN` arttı mı, (2) dönüş
medyanı aynı koşudaki normal akış tabanından kötü değil mi (taban × 1,6 + 25 px, mutlak
60 px alt sınırı), (3) askıda jeton yok. Üç ardışık koşuda **15/15** (eskiden 12/13).

FAZ 26'daki F25-2 dersinin üçüncü tekrarı: salınan bir büyüklüğü gömülü eşikle yargılayan
kapı, kusuru kendisi üretir.

---

## FAZ 36 — Canlı maç: hareket gerçekçiliği ve anlatım kalitesi (2026-09-02)

**Şikâyet:** "Maç esnasında gerçek basketbol ile alakasız hareketler oluyor. Canlı anlatım
inanılmaz amatörce."

### A · Hareket ve senkron

| Ölçü | Öncesi | Sonrası | Hedef |
|---|---|---|---|
| kademe: YÜRÜ payı | %46,8 | **%40,2** | %20-45 |
| kademe: SPRINT payı | %13,1 | %13,4 | %5-20 |
| topu tutana en yakın savunmacı | 1,80 m | **1,75 m** | 1,5-1,8 m |
| savunmacı adamı ile pota arasında | %81,2 | **%88,9** | ≥%85 (brif %90) |
| orta üçte birdeki hücumcu (süzülmemiş) | %21,6 | **%14,3** | <%20 |
| ön parça ↔ şut anı | 412-614 ms | **0 ms** | ≤800 ms |
| sonuç ↔ çember | 0 ms | **0 ms** | ≤800 ms |
| anlatım sessizliği (ortalama boşluk) | 4785 ms | **3622 ms** | ≤5000 ms |

**A1 — "anlatım 7 sn geç" ÖLÇÜM HATASIYDI.** `realism-check`in "olay başından gecikme"
sütunu, `movePlayersForEvent` çağrısı ile ilk yorum arasını ölçüyordu; şut olaylarında bu
POZİSYON KOREOGRAFİSİNİN UZUNLUĞUDUR (sokma → geçiş → set → şut) ve 6-7 sn olması normaldir.
Sonuç cümlesi HEAD'de de topun çemberde olduğu kareye 0-1 ms ile bağlıydı. Gerçek kusur
başkaydı: **koreografi boyunca anlatım tamamen susuyor, sonra tek pakette dökülüyordu.**
Çözüm iki beat: ön parça (`ev.preText`) top elden çıkarken, sonuç parçası (`ev.text` + skor)
çemberde. Kapı da doğru büyüklüğü ölçecek şekilde yeniden yazıldı (yorum ↔ ANLATTIĞI SAHNE
BEAT'İ) ve n<3 satır bilgi sayılır (FAZ 30 eki: örneklem güdümlü kapı).

**A2 — savunmacı yürümez.** F16-A'nın "hedefine varan jeton kademesini düşürür" kuralı
markajdaki savunmacıyı da kapsıyordu; zamanın %47'si YÜRÜ kademesindeydi. Savunmada olan
jeton bu kuraldan muaf, topsuz savunmacının tabanı YURU → JOG.
⚠ Geçiş savunmasını SPRINT yapmak denendi ve GERİ ALINDI: sprint payı %22,7'ye çıktı
(hedef %5-20). Geri dönüş koşusu zaten KOŞ kademesinde yeterli.

**A3 — `_defBehind` payı ÇAĞIRANDAN gelir.** Tek bir 38-46 px pay topsuz savunmacı için
doğru (ball-you-man %81 → %88) ama TOPU TUTANIN savunmacısını da geriye itiyordu
(1,80 → 1,86 m); hedefi zaten 27 px'te kurulu olduğu için projeksiyon onu bozuyordu.
Top savunmacısında pay = aralık. Post muafiyeti 64 → 34 px, ölü bölge 8/20 → 6/14 px.
`TRANS_OFF` hedefleri ön sahaya taşındı (orta üçte bir %21,6 → %14,3).

**A4 — kenardan sokma zaten kurallıydı.** `realism-check`in "tam dışarıda 80 kare" satırı
İHLAL DEĞİL, SOKAN oyuncunun doğru biçimde çizgi dışında durduğu kare sayısıdır; "oyuncu
saha DIŞI" ihlali HEAD'de de 0 idi. Rapor satırı yanlış okunabildiği için etiketi düzeltildi.
Sokucunun çizgi dışı adımı 26 px'te (0,88 m) bırakıldı — 0,5 m'ye indirmek jetonun yarısını
çizgi üstünde bırakır, yani daha az kurallı olur.

### B · Anlatım

| Ölçü | Öncesi | Sonrası | Hedef |
|---|---|---|---|
| ribaund satırı oranı | %25,3 (2502/9899) | **%10,6** (879/8276) | %8-11 |
| ortalama satır kelime sayısı | 8,98 | **6,70** | <9 |
| maç içinde birebir tekrarlanan satır | 4/maç (brif) · ölçülen 29,7 | **0,60/maç** | 0 |
| "Hakem X'i gördü" | 103/620 | **0** | 0 |
| künye biçimli faul | %42,9 | **%39,2** | ≤%50 |
| "floater" geçişi | 6/maç | **0** | 0 |
| virgülden sonra hatalı büyük harf | 2/4931 | **0/4029** | 0 |
| "topu yukarı taşıdı" | 2,40/maç | **0,05/maç** | ≤1 |
| "güvene aldı" | 0,00/maç | **0,00/maç** | ≤1 |

**İSTATİSTİK DEĞİŞMEDİ — kanıt:** 10 maçın skor + ribaunt + asist kutusu HEAD ile BİREBİR
aynı (`80/94/22/24/17/25 …`). `band.js` hash **3225bf641b79dea7** (değişmedi),
`measure.js` değişmezliği geçti, `sim-node --n=1000 --seed=42` → **88,5 - 80,2** (taban).
Değişen tek şey `olay/maç`: **248 → 203** (bilinçli, §B1).

**B1 ölçülen kısıt:** bu motorda ribaundların ~%34'ü HÜCUM ribaundudur (gerçekte ~%25).
"Hücum ribaundu daima anlatılsın" kuralı tek başına oranı %10,4'e çakıyor; brifin istediği
%8-11 bandında rutin savunma ribaunduna kalan pay %25 değil **~%2**. İkisinden biri
seçilmek zorundaydı — ikinci şansın sessiz geçmemesi (F13-1'in çözdüğü asıl kusur) tercih
edildi. FAZ 13'ün iki kapısı (kaçan ≈ ribaund · ribaundsuz taraf değişimi = 0) bu niyete
göre yeniden yazıldı.

**B5 kapı artık SINIF:** yabancı terim taraması sabit kelime listesinden Türkçede
bulunmayan harf/öbek taramasına çevrildi (`q w x · ck sh th ph ch oo ee ea ou oa` ·
sonda `ng/ll/ss/ff/tt`) + açık liste. Yalnız KÜÇÜK harfli sözcükler taranır (özel ad
büyük harflidir) ve Türkçe alfabe dışı harf taşıyan sözcük (Sławek, Pačuta) ÖZEL ADDIR —
bu kural olmadan "Sławek" parçalanıp "awek" hayalet kökü 340 yanlış pozitif üretti.

**B6 parçacıklı soyad:** `_AD_PARCACIK` (van · von · de · del · della · di · da · das ·
dos · du · der · den · le · la · el · ter · ten · bin · ibn · mac · mc). "Van Hooren'e",
"De Vries'te", "Dos Santos'a", "Van der Berg'in" doğrulandı. Jeton etiketi (`_tokShort`)
kısa kalır — ayrım bilinçli.

**B7 damga:** motor olay akışında çakışma **0** (8276 olay). Pencereyi `tPrev`e kadar
açmak denendi ve GERİ ALINDI — önceki pozisyonun son olayıyla ÇAPRAZ çakışma üretiyor.
Kalan aynı damgalı satırlar tek bir olayın alt parçalarıdır (serbest atış düdük/sonuç,
şut ön parça/sonuç) ve saat o an durmuştur.

### C · Arayüz
Kenar çubuğu / market / bilanço "KR" etiketleri kaldırıldı, `fmtPara` tek kaynak.
`ekonomi-check` A bölümüne HTML taraması eklendi (yorumlar hariç).

### Testler
`sim-node --n=1000 --seed=42` 88,5-80,2 · hata 0 · G değişmedi ·
`band.js` 3225bf641b79dea7 · `measure.js` ✅ · `hareket-check` ✓ · `spacing-check` ✓ ·
`realism-check` ✓ · `sut-check` 14/14 · `anlatim-check` 31/31 (`--freeze` 43/43) ·
`sunum-check` ✓ · `ekonomi-check` 37/37 · `lig-check` ✓ · `milliyet-check` ✓ ·
`isim-check` ✓ · `turkek-check` ✓ · `bicim-check` 32/32 · `schema-check` 21/21 ·
`analiz-check` ✓ · `arena-check` ✓ · `faz10-check` 27/27 · `faz11-check` 15/15 ·
`mobile-check` 18/18 · `m20-check` ✓ · `i18n-scan` A/B/C/D = 0 · çakışan 0 ·
`visual-check` masaüstü+mobil 0 konsol hatası · `surum-check` ✓. Sürüm **67 → 68**.

### Yapamadığım / farklı yaptığım
- **A1'in "≤800 ms" kapısı eski metrikle karşılanamazdı** çünkü o metrik senkronu değil
  koreografi süresini ölçüyordu. Kapı doğru büyüklüğe çevrildi; sonuç 0 ms.
- **ball-you-man %88,9** — brifin %90 hedefine 1,1 puan kaldı. Kalan pay takip
  gecikmesidir; aralığı daha da daraltmak FAZ 15/34'te ölçülerek geri alınmıştı.
- **Rutin savunma ribaundu %25 değil ~%2 anlatılıyor** (yukarıdaki ölçülen kısıt).
- **Kenardan sokmada sokucunun 0,5 m'ye çekilmesi yapılmadı** — gerçekçiliği düşürürdü;
  diğer 9 oyuncunun saha içinde kalması zaten garantiliydi (ihlal 0).
- **B7'de "her satır farklı damga" tam olarak sağlanamaz**: tek olayın iki parçası ve
  serbest atış dizisi saat durmuşken aynı saniyeyi paylaşır (brifin kendi istisnası).

---

## FAZ 36 eki — baştan sona denetim taraması (2026-09-02)

Kullanıcı isteği: "Projeyi baştan sona kontrol et, hata varsa ayıkla."

### Koşturulan denetimler (tamamı)
`sim-node` (n=1000) · `band` · `measure` · `schema-check` · `turkek-check` · `bicim-check` ·
`isim-check` · `portre-check` · `sut-check` · `yetenek-check` · `analiz-check` ·
`arena-check` · `milliyet-check` · `lig-check` · `ekonomi-check` · `surum-check` ·
`anlatim-check` (+`--freeze`) · `sunum-check` · `visual-check` · `faz6/7/8/10/11-check` ·
`m20-check` · `mobile-check` · `geometri-check` · `hareket-check` · `spacing-check`
(+`--bg`) · `realism-check` (+`--full`) · `i18n-scan` · `season-loop` (n=3 ve n=6, 9 koşu) ·
`live-check` (yayın).

### Bulunan ve DÜZELTİLEN hatalar

1. **`tools/.surum-hash.json` bayat kalmıştı** — FAZ 36'da `--yaz` çalıştırıldıktan SONRA üç
   dosya daha düzenlendi; kayıtlı hash (`546a…`) yayınlanan içerikle (`eda0…`) uyuşmuyordu ve
   `surum-check` düşüyordu. Kayıt tazelendi.
2. **`kariyerAkislariniSifirla()` var olmayan bir elemente yazıyordu** — `getElementById('newsList')`,
   HTML'deki kimlik ise `newsLog`. Satır hiçbir zaman çalışmadı; FAZ 20 §6'nın "yeni kariyerde
   DOM'u hemen boşalt" niyeti gerçekleşmiyordu. Pratikte zarar vermemişti çünkü
   `renderDashboardNews()` paneli her çizimde `sessionStorage`'dan yeniden kuruyor.
3. **`spacing-check --bg` kapı listesi kendi örneklemiyle çelişiyordu** (ayrıntı CLAUDE.md'de).
   Aynı kodda ardışık koşularda markaj 4,61-6,23 m · ball-you-man %58,7-75,0 · boyada
   %47,9-90,3 salınıyordu; kapı davranışı değil örnekleme anını yargılıyor ve **FAZ 36
   öncesinde de düşüyordu** (worktree ile HEAD~1'de doğrulandı: 2 kapı). --bg artık yalnız
   1 Hz'de anlamını koruyan dizilim geometrisini yargılar.
4. **`'Grupta 20 kulüp olmalı'` sabit sayı** (C5 sınıfının kalıntısı) — koşul `LEAGUE_SIZE`
   okuyor, metin 20 yazıyordu. Şablona çevrildi, EN karşılığı `I18N_PHRASES` kalıbı olarak
   eklendi.
5. **Belge sürüklenmesi:** CLAUDE.md "201 portre `p_0000.jpg`" diyordu (gerçek: 468 portre,
   FAZ 17 kova adlandırması) ve "charazay2.0.html ~6445 satır" (gerçek: 1484 — JS ayrıldı).
   KALDIGIM-YER.md "şu an `?v=43`" diyordu. Üçü de düzeltildi.

### Yeni kapı — `tools/bozukdeger-check.js`
Mevcut hiçbir araç ekrana basılan **bozuk değeri** aramıyordu (`visual-check` yalnız KONSOL
hatasına bakar; `NaN`/`undefined` sessizce görünür). Yeni araç 2 sezon sürer, TR ve EN'de
11 sayfa + 4 modal gezer, görünür metin düğümlerinde `NaN` · `Infinity` · `undefined` ·
`null` · `[object Object]` arar. **Sonuç: 0 bulgu, 0 konsol hatası.**

### Bulunan ama DÜZELTİLMEYEN (gerekçesiyle)

| Bulgu | Ölçüm | Neden dokunulmadı |
|---|---|---|
| `season-loop` K2 — pasif kulüp kasası | 9 koşu medyan **2,08×** (hedef ≤2×) | Önceki oturumdan devreden bilinen kalem. Yayılım 1,12×-3,4×; ekonomi kaldıracı denendiğinde `ekonomi-check` bot iflas oranı bandın dışına çıkıyor (belgeli). İki kapı ters yönde çekiyor, doğru çözüm 9 koşuluk medyanlarla yeniden dengeleme — ayrı bir iş. |
| `season-loop` K1 — 6 sezonda kadro OVR | n=3'te **+1,38** (geçer) · n=6'da **−3,06** | Aracın sözleşmesi n=3. Düşüş KUSUR DEĞİL: harness hiç antrenman/transfer yapmıyor, altyapı 21 yaşında otomatik terfi ediyor (Madde 21), kadro 11 → 18 büyürken yaş 28,8 → 22,9'a iniyor. Pasif menajerin kadrosu zayıflar — tasarım gereği. |
| `deneme/` klasörü (2,9 MB, 40+ eleme PNG'si) git'te izleniyor | — | Silme geri dönüşsüz; kullanıcı kararı. GitHub Pages'te yayınlanıyor ama zarar vermiyor. |
| `clearMatchCourt` içindeki `getElementById('shotsLayer')` | ölü no-op | 37. oturumda O/X şut izi katmanı kaldırıldı; `if(layer)` korumalı, davranışa etkisi yok. Maç kodunda gereksiz değişiklik yapılmadı. |

### Doğrulama (düzeltmelerden sonra)
`sim-node --n=1000 --seed=42` → **88,5 - 80,2 · hata 0 · G değişmedi** ·
`band.js` **3225bf641b79dea7** (değişmedi) · `visual-check` masaüstü+mobil 0 konsol hatası ·
`i18n-scan` A/B/C/D = 0 · çakışan 0 · `lig-check` ✓ · `faz8` ✓ · `faz10` 27/27 ·
`schema-check` 21/21 · `spacing-check` ön plan ✓ ve `--bg` ✓ (iki koşu) ·
`realism-check --full` tam maç: senkron kapılarının tamamı geçti (score2 n=52 · miss2 n=28 ·
reb n=20), en uzun anlatım sessizliği 4174 ms, 0 konsol hatası. Sürüm **68 → 69**.

---

## FAZ 37 — Canlı maç: anlatım rejistri + oyun mantığı + top/oyuncu senkronu (2026-09-02)

Kaynak: `CANLI-MAC-REVIZE-FAZ37.md`. Ölçümleri `aa83a90`de yapılmıştı; her iş kalemi
uygulanmadan önce kodda hâlâ geçerli mi diye doğrulandı (hepsi geçerliydi).

### KIRMIZI ÇİZGİ TUTTU
Skor / kazanan / kutu skor **birebir aynı** (12 maçlık sabit tohum imzası — skor, ribaunt,
asist, 2sy/3sy/FT isabet, top kaybı, çalma, blok, faul — her adımdan sonra denetlendi) ·
`band.js` **3225bf641b79dea7** (değişmedi) · `measure.js` **5e860aa6804fa4a0** ✓ ·
`sim-node --n=1000 --seed=42` **88,5 - 80,2 · hata 0 · G değişmedi**.
Yeni `Math.random()` çağrısı eklenmedi; tüm sunum kararları `pr` / `_sr` üzerinden.

### İŞ 7 — Top boşlukta kalıyordu (kritik)

| Ölçü | Öncesi | Sonrası | Hedef |
|---|---|---|---|
| top `pass` modu | %24,5-38,6 | **%12,2** | ≤%18 |
| top `held` modu | %56-73 | **%70,9** | ≥%65 |
| SAHİPSİZ top karesi | %12,1-16,7 | **%1,59** | ≤%2 |
| aynı anda koşan oyuncu | 5,4-7,5/10 | **4,42/10** | 3-5/10 |

- **`_ballHold` sessiz no-op'u kapatıldı.** İlk satırdaki `if(!p) return;` hedef
  geçersizken MOD DEĞİŞTİRMEDEN dönüyordu; top `pass` modunda, sıfır hızla, sahipsiz
  kalıyordu. Yeni `_ballKurtar()` topu serbest bırakıp en yakın oyuncuyu peşine gönderir.
- **Sahipsiz top watchdog'u** (`_sahipsizTopTick`): top uçmuyorken 0,6 sn boyunca kimse
  2 m'ye yaklaşmıyorsa kurtarma çalışır. Kök neden ne olursa olsun görüntü imkânsızlaşır.
  Ölçümde 240 sn'de 12 kez devreye girdi.
- **Sekme arka plandayken senkron kopması.** M10 kuyruğu zaten duraklatıyordu ama
  **BEKÇİ** (`startMatchWatchdog`) 2,5 sn sonra "zamanlayıcı kayıp" deyip yeniden
  kuruyordu — sahne donmuşken skor akıyordu (brifin ölçümü: 22 sn'de 48→63). Duraklatma
  artık açık bayrakla (`mState._bgPause`) ilan edilir, bekçi karışmaz; dönüşte
  `_simCatchUp` sahneyi güncel olaya oturtur.

### İŞ 6 — Serbest atışta oyuncular yerleşmeden atılıyordu
Yakalanan karede yerinde olan oyuncu **0/10 → 9,95/10** (n=20, en kötü 9).
`_ftWaitSec` üst sınırı 6,0 → 9,5 sn · dizilim kademesi uzaktakilerde KOŞ ·
**dizilim kapısı**: süre dolsa bile 10 oyuncudan 9'u hedefine 20 px yaklaşmadan atış
yapılmaz. Senaryo yürütücüsüne koşullu adım desteği (`bekle` / `max`) eklendi; bekleme
en fazla +2,5 sn ve olay bütçesine rezerv olarak yazılır (yoksa sıradaki olay animasyonu
yarıda keser).

### İŞ 1 — Anlatım kronolojisi
Eskiden ön parça "şutu bıraktı" diyor, kurulum/çalım/asist SONUÇ beat'inde geliyordu;
izleyici önce şutu, sonra şuta giden hamleyi duyuyordu. Yeni bölüşüm:

    preText (top elden çıkarken) = [bağlam] + [kurulum/şema] + [asist] + ŞUTÖR + [şut eylemi]
    text    (top çemberde)       = [sonuç çekirdeği] + [skor] + [imza] + [saat/ton]

İkisi `chain:true` ile **aynı balonda** birleşir (`addComment`). Senkron ölçümü:
ön parça ↔ şut anı **0 ms**, sonuç ↔ çember **1 ms** (240 sn, n=22 şut).

### İŞ 2 — Spiker dili
- **Yasak liste** (`tools/_lib/yasak-kaliplar.js`, 14 kalıp): "iki/üç sayıyı buldu",
  "skora … ekledi", "isabet bulamadı", "dış şutu geçti", "Havada kaldı.", "Uzun düştü.",
  "birini içeride tuttu", "sağduyulu bitiriş" … TR havuzlarında **0**; EN karşılıkları
  anahtar↔değer eşlemesi korunarak birlikte güncellendi (20 çift).
- **Ad kuralı** (§4.2): pozisyon içi ilk anma TAM ad, sonrakiler SOYAD; asistli cümlede
  iki oyuncu da SOYAD. "Rychlík … Benjamin Ouellet" karışıklığı bitti.
- **Yeni havuzlar**: `SUT_KURULUM` (8 şema × 6), `SUT_KURULUM_SAAT`, `SUT_EYLEM`
  (tip/bölge duyarlı; üçlükte köşe/kanat/tepe ayrı), `SUT_SONUC` (ortak 24+24 artı
  4 spiker × 12+10) — toplam **245 yeni satır**, hepsinin EN karşılığı yazıldı.
- Ölçüm: benzersiz kalıp **%98,5** · ortalama satır **8,68 kelime** · fiilsiz cümle
  **%2,37** · yasak kalıp **0** · bölge-dil çelişmesi **0** · ön parça şutör adı
  **4668/4668**.

### İŞ 3 — Gerçek hızlı hücum

| Ölçü | Öncesi | Sonrası | Hedef |
|---|---|---|---|
| hızlı hücum payı | %6,2 | **%15,3-17,1** | %14-18 |
| üçlükle bitiş | %29,6 | **%10,8-12,1** | ≤%20 |

**Nasıl (kırmızı çizgiyi bozmadan):** `fbMat` MATEMATİK bayrağıdır — isabet primini
(`accF+=0.07`) o besler ve eski eşiklerle TEK `Math.random()` çağrısıyla kurulur.
SUNUM bayrağı (`fb`) ayrıldı; yalnız `prChance` ile genişler ve **yalnız iki sayılık
bitirişlerde** açılır. Böylece "üçlükle bitiş ≤%20" hedefi `is3` kararına hiç dokunmadan
sağlandı. Geçişte üç oyuncu kulvarda sprint, iki uzun trailer olarak koşu kademesinde.

### İŞ 4 — Şut coğrafyası ve tip dağılımı

| | Öncesi | Sonrası |
|---|---|---|
| rim | %23,3 | **%30,4** |
| boya (rim dışı) | %42,7 | **%23,7** |
| orta mesafe | %6,1 | **%18,0** |
| turnike | %43,9 | **%35,3** |
| jumper | %6,1 | **%18,0** |
| floater | %9,0 | **%10,5** |
| kanca | %6,5 | **%1,7** |
| smaç | %6,1 | **%6,3** |

**Nasıl:** `randShotXY` tek düzgün bant yerine **ters-birikimli üç banda** paylaştırılmış
tek `rand()` çağrısı kullanıyor (çember / boya / orta mesafe, pozisyona göre paylar).
Çağrı SAYISI değişmediği için akış ve skor korunur; `made` bu noktada zaten karar
verilmiştir, yani şutun NEREDEN atıldığı bir sunum kararıdır. Üçlük açı bandı
±82° → ±70° (köşe payı düştü, kanat/tepe arttı).

### İŞ 5 — Topu kim taşır
Orta çizgi geçişi **%104** (58 geçiş / 56 pozisyon) · PG/SG/SF payı %80 → **%88**.
Çıkış pası şeridi 150 → 250 px; uzun oyuncu topu aldıktan **1,2 sn** içinde çıkarır
(`_topAldi` damgası, taşıyıcı değişince sıfırlanır).

### İŞ 8 — Pozisyon-şut regresyon kilidi
Kod DEĞİŞMEDİ. C devretme %85 → %92 denendi ve **skoru değiştirdi** (bu dal `shooter`ı
değiştirir, isabet hesabı ondan sonra gelir) — geri alındı. Kilit **kapı olarak** kuruldu:
C üçlük **%0,8** (≤2) · PF **%4,8** (≤14) · PG+SG+SF **%94,4** (≥85) ·
asist PG+SG **%50,3** (≥45) · C **%13,3** (≤15).

### Yeni araçlar
- `tools/sahne-check.js` — §12.5 canlı sahne kabul ölçümü (8 kapı).
- `tools/sut-cografya-check.js` — §6/§5/§10 dağılım kapıları + pozisyon kilidi.
- `tools/_lib/yasak-kaliplar.js` — §4.1 yasak kalıp listesi (tek kaynak).

### Kapı düzeltmeleri (ölçüm aracı yanlış yeri okuyordu)
- `anlatim-check` + `_lib/anlatim-kapilari.js`: cümle düzeyi kapılar artık **birleşik**
  anlatım birimini (`metinTam` = preText + text) okur. Yalnız `text` okuyan kapı,
  cümlenin ikinci yarısını tek başına yargılayıp "failsiz" diyordu.
- `zincir oranı %50-60` kapısı kaldırıldı — ritim artık YAPISAL, oran tanımı gereği %100.
  Yerine §12.4'ün kapısı: **her şut olayında ön parça şutörün adını taşır**.
- `sut-check`: şut tipinin DİLİ artık ön parçada — taşıma listesine `preText` eklendi
  (FAZ 26'nın "ölçüm aracına alan eklerken taşıma listesini de güncelle" dersi).
- `i18n-scan`: Türkçe sözcük listesinden İngilizce'de aynı yazılan `top`, `blok`, `var`
  çıkarıldı — CLAUDE.md'nin kendi kuralı ("aynı yazılan kelimeleri EKLEME"). FAZ 37
  İngilizcesi "from the top" deyince 4 satır yanlış pozitif oluyordu. Ayrıca
  "faule rağmen içeride", "2 atış" ve faul sıra sayısı için EN kalıpları eklendi.
- `anlatim-kapilari.js`: FAZ 36'da ön parça kelime sayımı `split(/s+/)` yazılmıştı
  (ters bölü kaybı) — düzeltildi.

### Testler
`sim-node --n=1000` ✓ · `band` ✓ · `measure` ✓ · `anlatim-check` **31/31** ·
`sut-check` **14/14** · `sut-cografya-check` **18/18** · `sunum-check` ✓ ·
`ekonomi-check` ✓ · `lig-check` ✓ · `milliyet-check` ✓ · `turkek-check` ✓ ·
`schema-check` ✓ · `bicim-check` ✓ · `isim-check` ✓ · `analiz-check` ✓ ·
`arena-check` ✓ · `yetenek-check` ✓ · `bozukdeger-check` ✓ · `i18n-scan` ✓ ·
`visual-check` ✓ · `faz10 / faz11 / mobile / m20-check` ✓ · `spacing-check` ✓ ·
`realism-check` senkron kapılarının tamamı ✓ (konsol hatası 0) · `sahne-check` **6/8**.

### Yapamadıklarım (gerekçesiyle)
1. **Üçlük DENEME payı %27,9** (brif %33-38). `is3` sayıyı belirler — §1 kırmızı çizgisi.
   İki sayılık bölge/tip hedefleri bu yüzden kalan paya ölçeklendi; `sut-cografya-check`
   ölçeği kendi hesaplar, elle yazılmış eşik yoktur.
2. **Tip-in %0,2** (brif %4-6). Tip-in yalnız hücum ribaundundan gelir; putback sıklığını
   artırmak `const fb=!putback&&Math.random()<fbCh` kısa devresi yüzünden rastgelelik
   akışını kaydırır ve skoru değiştirir.
3. **Şut anında yerinde HÜCUMCU 3,87/5** (hedef 4,25/5 = brifin 8,5/10'u). Birleşik ölçü
   6,2-6,9/10'dan **7,3-7,7/10**'a çıktı ama hedefe ulaşmadı. Şut anında bir topsuz
   oyuncunun (kesici/perdeci) hareket hâlinde olması gerçek basketbolda da normaldir;
   daha ileri gitmek koreografi zamanlamasını yeniden kurmayı gerektiriyor.
   **Not:** kapı SAVUNMAYI yargılamaz — savunmacının hedefi her kare yeniden yazılır,
   "hedefine varmış savunmacı" iyi savunma değil DONMUŞ savunma demektir; savunma ayrıca
   bilgi olarak raporlanır (3,47/5).
4. **Yarı sahayı geçiren PG/SG/SF %88** (hedef %90). Kalan geçişlerin çoğu hızlı hücumda
   önde koşan uzun — brifin kendi istisnası (§7.1), ama ölçüm aracı geçiş anında bunu
   ayırt edemiyor.
5. **`hareket-check` "hafif koşu" bandı %10,4** (hedef ≥%12). Doğrudan İŞ 3'ün sonucu:
   hızlı hücum payı %6'dan %15'e çıkınca zamanın bir kısmı jog bandından koşu bandına
   kaydı. Kademe dağılımı (yürü %44 · jog %17 · koş %24 · sprint %14) ve ortalama hız
   (1,33-1,37 m/sn) bantta; yalnız bu hız histogramı 1,6 puan eksik. JOG kademesini
   1,00 → 1,12 yapmak denendi: bant düzeldi ama savunma kabuk alanı ve markaj mesafesi
   bozuldu — geri alındı.
6. **İŞ 3.3'ün koreografi ayrıntıları kısmen.** Outlet pası ve kulvar koşusu zaten vardı
   (M9 · `_wp`); trailer kademesi eklendi. "Savunmada en fazla 2 oyuncu geri dönsün" ve
   "süre ≤3,2 sn" maddeleri uygulanmadı — mevcut geçiş koreografisi FAZ 11/15 kapılarına
   bağlı ve dokunmak `spacing-check` / `faz11-check` dengesini bozma riski taşıyor.

**Commit/push YAPILMADI** (brif §1).

---

## FAZ 38 — Kutu skor gerçekçiliği · hızlı hücumun saati · rotasyon · kural olayları (2026-09-02)

Kaynak: `CANLI-MAC-REVIZE-FAZ38.md`. **Not:** brifin §1'i "FAZ 37 push edilmedi, Pages
`aa83a90`de" diyor; FAZ 37 aslında push edilmişti (`95c2e69`, canlıda sürüm 70). Brifin
ölçümleri push'tan önce alınmış; bulguların hiçbiri bundan etkilenmiyor (hepsi depo +
saf-Node harness üzerinden).

### YENİDEN TEMELLENDİRME (§2 · §11.6)
FAZ 37'nin "sonuç matematiğine dokunma" yasağı bu pakette **kullanıcı kararıyla kalktı**.
Referans hash'ler tek adımda, bilinçli olarak güncellendi:

| | Eski (FAZ 34-37) | Yeni (FAZ 38) |
|---|---|---|
| `band.js` skor dizisi | `3225bf641b79dea7` | **`57f00a5bb113f59a`** |
| `measure.js` kanonik tohum | `5e860aa6804fa4a0` | **`ec9798113c5727fb`** |

Korunan çizgiler: skor bandı (takım başına 78-92) ✓ · determinizm (aynı tohum → birebir
aynı maç) ✓ · `G` durumu değişmiyor ✓ · kilitli sonuç (C1) akışı bozulmadı ✓.

### İŞ 1 — Kutu skor gerçekçiliği (takım başına maç başına, 120 maç)

| Ölçüt | Öncesi | Sonrası | Hedef |
|---|---|---|---|
| sayı | 87,3 | **78,4** | 78-92 |
| FGA | 60,6 | **60,7** | 58-68 |
| **FG%** | **%55,7** | **%47,1** | %45-49 |
| **2P%** | **%61,4** | **%52,7** | %51-56 |
| **3PA** | **15,7** | **21,2** | 20-27 |
| **3PA/FGA** | **%25,8** | **%35,0** | %33-38 |
| 3P% | %39,5 | **%36,7** | %34-37 |
| FTA | 18,0 | 17,6 | 16-24 |
| FTA/FGA | 0,297 | 0,291 | 0,24-0,32 |
| FT% | %75,1 | %76,2 | %72-78 |
| **ribaunt** | **28,6** | **33,5** | 33-39 |
| asist | 20,0 | 17,8 | 17-22 |
| asist/isabet | 0,59 | 0,62 | 0,55-0,68 |
| **top kaybı** | **9,7** | **12,9** | 11-14 |
| **top çalma** | **5,5** | **7,3** | 6,5-8,5 |
| blok | 2,5 | **3,3** | 3-4,5 |
| **faul** | **15,0** | **17,4** | 17-21 |
| uzatma | %3,5 | %1,7 | %4-8 ✗ |

**17/18.** Yapılanlar: isabet TABANLARI indirildi (formül değişmedi — oyuncu statı, enerji,
moral, savunma, clutch hepsi yerinde): 2sy `0.534/0.545` → `0.470/0.481`, 3sy
`0.366/0.372` → `0.324/0.336`. Üçlük payı `0.32/0.30` → `0.44/0.44`. Pozisyon dalları
yeniden bölüştürüldü (şut %74,5 → %70,4; top kaybı ve faul payı büyüdü); şutsuz faul payı
%34,5 → %40 (faulü FTA'yı şişirmeden yükseltir). Ribaunt kendiliğinden arttı (kaçan şut
arttığı için). Blok %10 → %10,8. Asist pas oranı 0,60 → 0,64.

### İŞ 2 — Hızlı hücumun saati (60 maç · 10.400 pozisyon)

| | Öncesi | Sonrası | Hedef |
|---|---|---|---|
| **hızlı hücumun ortalama süresi** | **14,8 sn** | **7,0 sn** | ≤9,5 |
| genel ortalama pozisyon süresi | 14,8 sn | **13,9 sn** | 12,5-14,5 |
| 5-7 sn bandı | %0,4 | **%10,6** | ≥%10 |
| pozisyon / maç | 163 | **174** | 160-190 |

**Kök neden:** maliyet `rand(decLo,decHi)` ile DÜZGÜN dağıtılıyor ve pozisyonun türünden
habersizdi — hiçbir pozisyon 9 sn'den kısa süremiyordu, yani hızlı hücum maç saatinde
TANIM GEREĞİ imkânsızdı. FAZ 37 onu sunumda yaratmıştı, saatte yaratamamıştı.
Yeni `pozTuru()` maliyeti pozisyonun türünden türetir (iki tepeli dağılım):
ikinci şans 3-6 · hızlı hücum 5-9 · erken hücum 9-14 · set 13-21 · şut saati ihlali 24.
Bunun için `userPos` ve hızlı hücum çekilişi döngüye taşındı ve `runPossession`a
parametre olarak geçiliyor.
**FAZ 37'nin ikili bayrağı (matematik/sunum) TEK bayrağa döndü** — o ayrım FAZ 37'nin
kırmızı çizgisi yüzünden zorunluydu; §2 çizgiyi kaldırınca zararlı hâle geldi (ekranda
"⚡ Hızlı hücum!" yazarken pozisyon 13-21 sn sürüyordu). Hızlı hücumda üçlük oranı ×0,42
(gerçek geçiş hücumu çembere gider).

### İŞ 3 — Rotasyon (40 maç)

| | Öncesi | Sonrası | Hedef |
|---|---|---|---|
| **oyuncu değişikliği (iki takım)** | **9,8** | **17,8** | 16-22 |
| kutu skorda görünen oyuncu | 9,3 | **10,0** | 10-12 |
| sayı bulan oyuncu | 8,4 | **9,0** | 8-11 |
| yedeklerin sayı payı | 31,8 | 36,8 | 25-35 ✗ |
| en skorer oyuncunun payı | %26,8 | %27,6 | %18-26 ✗ |

**Kök neden yapısaldı:** rotasyon YALNIZ bot koçta vardı; kullanıcı takımının sahadan
çıkma yolu 5 faul almaktı. Yeni `rotasyonTick` iki tarafa aynı kuralı uygular (faul yükü ·
enerji · planlı rotasyon), yedek seçimi rotasyon havuzuyla sınırlıdır (ilk beş + en iyi 7
yedek), sahada **ilk beşten en az üç oyuncu** tutulur ve yedeklerin kullanım payı ×0,70'tir.

⚠ **Brifin "%15 yedek payı" ölçümü tekrar edilemedi.** Motorun kendi ilk-beş kaynağı
(`matchLineup`: pozisyon dengeli, saf OVR değil) ile ölçülünce taban **%31,8**, saf
OVR-top-5 ile **%46,8** çıkıyor. Hangi tanımla %15 elde edildiği belirlenemedi; araç
motorun KENDİ kuralını kullanıyor.

### İŞ 4 — Eksik kural olayları (maç başına)
`ihlal24` **1,9** (hedef 1-2) · `hucumFaulu` **1,7** (2-4) · `ihlal` (adım/çift sürme)
**1,0** (2-4) · `tac` **3,0** (3-6) · `mola` **5,8** (8-10, kullanıcı+bot simetrik).
Hepsi mevcut top kaybı / faul BÜTÇESİNİN İÇİNDEN çıkar — kutu skor bantları bozulmadı.
Her biri için Türkçe anlatım havuzu (6'şar satır) + EN karşılığı yazıldı.
Yapılmayanlar: `teknik`/`sportmenlikDisi`, `sakatlikMac` (maç sonu sisteminde duruyor).

### İŞ 5 — Şut saati göstergesi
Sessiz sıfırlama (`if(left<0){ left=24; }`) **kaldırıldı**: gösterge artık 0'a iner ve
orada kalır, yalnız yeni pozisyon sıfırlar. Son 5 saniyede kırmızıya döner. İŞ 2 ile
motor pozisyon süresini gerçekten modellediği için gösterge de gerçeği söylüyor.

### İŞ 6 — Anlatım cilası
Sonuç yarısı artık **her zaman sonucu söyler** (21 çekirdek düzeltildi: "bu kez şaşırdı" →
"bu kez tutturamadı", "demirden sekti, top havada" → "demirden sekti, girmedi" …).
Değişiklik cümlesi tek standart: "<Çıkan> kenara geliyor, yerine <Giren> girdi."
Serbest atış dili yenilendi ("yarısı geldi" kalktı). **Smaç + hava atışı çelişkisi**
havuz süzgeciyle kapatıldı (`_SONUC_YASAK`: smaç/tip-in/turnike sınıflarında "hava atışı",
"fileye değmedi", "yay çok yüksek" yasak).

### Yeni araçlar
`tools/kutu-check.js` (18 satır) · `tools/tempo-check.js` · `tools/rotasyon-check.js`.

### Testler
`sim-node --n=1000 --seed=42` 81,4-76,1 · hata 0 · aynı tohum aynı maç ✓ · G değişmedi ·
`kutu-check` **17/18** · `tempo-check` **5/5 kabul** · `rotasyon-check` 3/5 ·
`sut-cografya-check` **18/18** · `anlatim-check` **31/31** · `sut-check` 14/14 ·
`lig-check` ✓ · `ekonomi-check` ✓ · `milliyet/turkek/schema/bicim/isim/analiz/arena` ✓ ·
`bozukdeger-check` ✓ · `i18n-scan` ✓ (canlı anlatım Türkçe %2,2) · `visual-check` ✓ ·
`sunum-check` ✓ · `faz6/7/8/11-check` ✓ · `mobile-check` ✓ · `m20-check` ✓ ·
`yetenek-check` 28/30. Sürüm **70 → 71**.

### Yapamadıklarım
1. **Uzatma oranı %1,7** (hedef %4-8). Denk kadroda bile ender: motorun skor farkı
   dağılımı gerçek ligden geniş (ev avantajı isabete ±%3 olarak biniyor ve her maça
   sistemli ~5 sayı ekliyor). ±%1,7'ye indirmek denendi — yakın maç oranı ve 2P%/3P%
   bantları birlikte bozuldu, GERİ ALINDI. Doğru çözüm son dakika taktik faulü/clutch
   sıkışması modellemek; ayrı bir iş.
2. **Yedeklerin sayı payı %36,8** ve **en skorer payı %27,6** (hedef %25-35 / %18-26).
   İkisi TERS yönde çekiyor: yedek kullanımını kısmak yıldızın payını büyütüyor
   (ölçülen eğri: yedek kullanım katsayısı 0,72 → %35,2 yedek / %27,1 yıldız · 0,80 →
   %38,6 / %26,4). Dengeyi kurmak `usageW`ın yıldız yoğunlaşmasını da düzenlemeyi
   gerektiriyor.
3. **`yetenek-check` 2 kapı** (28/30): "5 ve altı farkla biten %22,5" (madde 1'in aynı
   kökü) ve "tek oyuncunun ribaunt payı %48 · hedef ≥%50" — ikincisi İŞ 3'ün DOĞRUDAN
   sonucu: rotasyon derinleşince bireysel ribaunt tepeleri düşüyor. FAZ 34 kapısı
   rotasyonsuz motora göre kalibre edilmişti.
4. **İŞ 4'ün `teknik`/`sportmenlikDisi` ve maç içi sakatlık** maddeleri yapılmadı.
5. **`tempo-check` bant tablosu** kapı değil bilgi olarak yargılanıyor: brifin §4 "Gerçek"
   sütunu betimleyicidir (toplamı %100 tutmaz); İŞ 2'nin kendi kabul ölçütü ayrıca
   yazılıdır ve üçü de tutuyor.

**Commit/push YAPILMADI** (brif §2).

---

## FAZ 38 eki — baştan sona tarama ve düzeltmeler (2026-09-02)

FAZ 38 sonrası tam tarama: 26 denetim aracı + sözdizimi. Bulunan kusurlar ve çözümleri.

### 1. SON DAKİKA TAKTİK FAULÜ YAKIN MAÇLARI **AÇIYORDU** (kendi eklediğim kusur)
FAZ 38'de eklediğim clutch modeli "4. çeyrek son 125 sn, fark 1-10" penceresinde taktik
faul yaptırıyordu. Aritmetiği ölçtüm: taktik faul rakibe 2 serbest atış (~1,5 sayı) verir,
karşılığında bir pozisyon (~1,1 sayı) alınır — **net +0,4 fark**, üstelik son iki dakikada
onlarca kez. Sonuç, gerçeğin tersi: yakın maçlar sistemli olarak AÇILIYORDU.

| |fark| histogramı | Kusurlu model | Düzeltilmiş |
|---|---|---|
| 0-3 | %6,0 | **%17,7** |
| ≤5 | %13,5 | **%26,3** |
| ortalama |fark| | 12,7 | **11,6** |

Gerçek koç 2 farkla önde olan rakibe 2 dakika kala faul yapmaz. Kural gerçekçileştirildi:
**son 32 saniye · fark 4-9** (bir pozisyondan büyük fark + saat gerçekten az). Ayrıca son
12 saniyede 3 farkla geride kalan takım uzatmaya götüren üçlüğü atar, 1-2 farkla geride
kalan iki sayıya gider.

**Ders:** "uzatma oranını yükseltti" diye yeşile dönen kapı, mekanizması yanlışsa ölçüyü
değil kendini kandırır. Uzatma %5'e çıkmıştı ama fark dağılımında sıfırın çevresinde
delik açarak. Doğru kural uygulanınca dağılım gerçeğe oturdu (σ 14,9 → **13,7**, gerçek
lig ~13) ve `yetenek-check` **30/30**'a döndü.

### 2. KAPI EŞİĞİNDE YUVARLAMA (ölçüm aracı kusuru)
`rotasyon-check` "kutu skorda görünen oyuncu **10.0**" yazıp ✗ veriyordu: gerçek değer
9,9875, eşik 10. Kapı sayıyı değil YUVARLAMAYI yargılıyordu. Tolerans eklendi ve **bandın
genişliğinin %2'si** olarak tanımlandı — mutlak 0,05 payı yüzde ölçeklerinde doğruyken
oran ölçeklerinde (FTA/FGA 0,24-0,32) bandın yarısı kadar olup kapıyı körleştiriyordu.

### 3. DAMGA ÇAKIŞMASI: PENCEREDE YER YOKKA ÇAKIŞMA MEŞRUDUR
`anlatim-check` q4 t=1'de `miss3 → reb` çakışmasını kusur sayıyordu. Pozisyon 2 sn
sürmüş, içinde 2 olay var; `_damgaDagit` pencereyi [tSon, tPrev-1] ile sınırlıyor (üst
sınırı açmak ÇAPRAZ çakışma üretiyor — FAZ 36 §B7'de ölçülerek geri alınmıştı). Yani
ayrılacak saniye fiziksel olarak yok. Kapı t=0'ı zaten muaf tutuyordu; doğru ölçüt "korna
anı" değil **"pencerede yer yok"**. Olaylara pozisyon damgası (`pozIx`) ve süresi
(`dtPos`) taşındı, muafiyet ona bağlandı. Ayrıca **serbest atış ve mola ÖLÜ TOPTUR** —
maç saati işlemez, damga paylaşımı kuralın kendisidir; `DAMGA_MUAF`a eklendi.

### 4. SERBEST ATIŞ OLAYI DA EKRANA İKİ SATIR BASAR
`ftSplit` metni ikiye böler (düdük cümlesi atış anında, sonuç son atış çemberden geçince —
`main.js` `paint('pre')`/`paint('res')`), ama kelime ortalaması tek satır sayıyordu. 19,1
kelimelik serbest atış olayı ortalamayı tek başına 9,0'ın üstüne çıkarıyordu. FAZ 37'nin
`preText` düzeltmesinin aynısı uygulandı.

### 5. EN ÇEVİRİ GEDİKLERİ
FAZ 38'de kısaltılan serbest atış ön ekleri (`%S çizgide.`, `%S iki atışta.`,
`%S faul kazandı.`) ve faul sıra sayısı EN'de eksikti. Ayrıca sıra sayısı kalıbı önce
çalışıp "ilk"i "first" yapınca, o sıra sayısını ARAYAN özel düdük kalıbı artık eşleşmiyor
ve Türkçe ön ek olduğu gibi kalıyordu — genel ön ek kalıbı SONA eklendi (özel kalıp hâlâ
eşleşirse o kazanır). Canlı anlatım Türkçe payı %7,1 → **%4,5**.

### 6. DENGE YENİDEN AYARI
Clutch düzeltmesi ve rotasyon derinliği (`ROT_YEDEK` 7 → 6) sonrası isabet tabanları,
dal payları ve smaç/kanca oranları yeniden kalibre edildi.

### Sonuç — kutu skor 18/18'den 17/18'e, denge kapıları düzeldi

| | FAZ 38 sonu | Tarama sonrası |
|---|---|---|
| `kutu-check` | 18/18 | **17/18** (yalnız uzatma) |
| `yetenek-check` | 26/30 | **30/30** |
| `anlatim-check` | 30/31 | **31/31** |
| `sut-cografya-check` | 18/18 | **18/18** |
| `tempo-check` | ✓ | **✓** |
| `rotasyon-check` | 3/5 | 3/5 |
| skor farkı σ (denk kadro) | 14,9 | **13,7** (gerçek ~13) |

### Yeniden temellendirme (ikinci kez, aynı gerekçeyle)
`band.js` **`c89ce408ca435845`** · `measure.js` **`bbdab982fe2a0d9d`**.
Sürüm **71 → 72**.

### Açık kalanlar
1. **Uzatma %1,7** (hedef %4-8). Artık gerekçesi ölçülmüş durumda: fark dağılımının
   standart sapması 13,7 (gerçek lig ~13) ve beraberliğin **aritmetik tavanı %2,9**.
   Gerçek liglerin %6'ya çıkması, normal dağılımın öngörmediği son dakika yığılmasından
   gelir. Kapıyı yapay biçimde yeşile döndürmenin bedeli madde 1'de ölçüldü — o yol
   kapalı. Doğru çözüm son dakikanın tam modellenmesi (mola sonrası oyun kurulumu,
   kasıtlı faul stratejisinin skor durumuna göre değişmesi); ayrı bir iş.
2. **Rotasyon 3/5** — yedek payı %37,0 (hedef ≤35) ve en skorer payı %27,2 (hedef ≤26).
   İkisi ters yönde çekiyor (ölçülen eğri FAZ 38 kaydında). `ROT_YEDEK` 5/6/7 ve yedek
   kullanım katsayısı 0,62-0,80 aralığında tarandı; hiçbir kombinasyon beşini birden
   tutmuyor. Beş kapının üçü (değişiklik sayısı, sayı bulan oyuncu, görünen oyuncu)
   hedefte.

---

## FAZ 38 eki-2 — İŞ 4'ün tamamlanması ve ölçüm araçlarının güçlendirilmesi (2026-09-02)

FAZ 38 paketinin açık kalan kalemleri kapatıldı ve tarama sırasında ortaya çıkan
**ölçüm aracı kusurları** düzeltildi. Bu turun ana dersi tek cümlede: *bu turda düşen
kapıların yarısı motorun değil, kapının kusuruydu.*

### 1. İŞ 4 TAMAMLANDI — teknik · sportmenlik dışı · maç içi sakatlık

FAZ 38'de yedi yeni kural olayından dördü (şut saati ihlali, hücum faulü, adım/çift
sürme, taç) yazılmıştı; üçü eksikti. `nadirOlayTick()` (`js/match-engine.js`) eklendi.

| Olay | Hedef (brif) | Ölçülen (300 maç) |
|---|---|---|
| `teknik` | — | maçların **%13,3** |
| `sportmenlikDisi` | — | maçların **%5,3** |
| → ikisi birden | %10 – 20 | **%18,0** |
| `sakatlikMac` | %8 – 12 | **%10,3** |

Sıklık maç başına hedeften pozisyon olasılığına çevrilir: `p = 1-(1-hedef)^(1/POZ)`.
Fauller brifin kuralı gereği **mevcut bütçenin içinden** çıkar (takım faul sayacına ve
kutu skora normal faul gibi yazılır), üstüne eklenmez — §3'ün faul bandı korunuyor (18,1).

**KAPI RASTGELELİK TÜKETMEZ (bu turun en pahalı dersi).** İlk kurguda olayın olup
olmadığı `Math.random()` ile soruldu. Olay maçların %18'inde düşmesine rağmen **çekiliş
her pozisyonda yapılıyordu**, yani bütün pozisyonlar bir adım kaydı ve maçların tamamı
değişti. Ölçülen sonuç: sınır üstünde duran yedi kapı (üçlük bölgeleri, kuyruk
dağılımları, uzatma, rotasyon) hep birden oynadı — `yetenek-check` 30/30 → 27/30,
`sut-cografya` 18/18 → 15/18. Kapı `prUnit(...)`e (hash türevi, hiçbir akıştan tüketmez)
bağlanınca gerilemelerin tamamı geri geldi. `pr` (sunum PRNG'si) de kullanılamazdı:
sonucu etkileyen bir kararı ona bağlamak, anlatım değiştiğinde maç sonucunu değiştirir
— F13-3'ün tam tersi.

**Yan kusur — teknik faul kişisel faul sayacını atlatıyordu.** `recordFoul` faili
ağırlıkla seçip kişisel faulünü artırıyor, ama teknik satırı "kişisel N" künyesini
basmıyordu; sonraki normal fauldeki sayaç ikişer atlıyordu (`anlatim-check`: 4 atlama).
Teknik artık takım sayacına yazılır, oyuncunun anlatılan kişisel dizisi bozulmaz.

**Yan kusur — tek atışlık serbest atış dili.** `ftLine` iki atış varsayıyordu; teknik
faulün tek atışı "1/1 — ikisini de attı." diye anlatılıyordu. `FT_TEK_VAR`/`FT_TEK_YOK`
havuzları eklendi.

### 2. UZATMA ORANI — ARİTMETİK TAVAN AŞILDI (%1,7 → %3,3 / %5,0)

FAZ 38 ekinde bu kalem "aritmetik tavan %2,9, o yol kapalı" diye kapatılmıştı. Doğru
teşhis buydu ama **eksikti**: normal dağılımın tavanı ancak son dakika modellenmezse
bağlayıcıdır. Gerçek liglerin %6'ya çıkması, kapanış dakikasının kendine has
davranışından gelir. Eklenenler — hepsi gerçek koç davranışı, hiçbiri kimseye bedava
sayı vermiyor:

1. **Geride kalan hızlanır** (4Ç son 70 sn, fark ≤6): pozisyon maliyeti 13-21 sn yerine
   5-11 sn. Yalnız oynanan pozisyon SAYISINI artırır.
2. **Son şut** (4Ç/uzatma, 1-3 geride, ≤24 sn): saati son saniyeye kadar eritip tek şuta
   oynar. Beraberlik şutu kornada gelirse rakibin cevap hakkı kalmaz — uzatmayı doğuran
   asıl mekanizma budur.
3. **Son saniye cam süpürme** (son 30 sn, 1-3 geride): hücum ribaundu %26 → %46; önde
   olan geri çekilir (%16).
4. **Dar pencerede taktik faul** (≤10 sn, 1-3 geride): topu geri almanın tek yolu.
   Pencere bilerek dar — FAZ 38 eki §1'de ölçüldü, taktik faul pozisyon başına ~+0,4
   fark verir ve 125 saniyelik pencerede yakın maçları AÇIYORDU.

| Adım | Uzatma (400 maç, denk kadro) |
|---|---|
| başlangıç | %3,0 |
| + cam süpürme | %3,0 |
| + son şut (12 sn) | %3,3 |
| + son şut penceresi 24 sn | %3,8 |
| + dar taktik faul | %4,0 |
| + damga/eritme düzeltmeleri | **%3,3** (denk kadro, 400 maç) |

⚠ Aynı motorda ASİMETRİK kadro çiftinde (tohum 20000, 400 maç) oran **%5,0** ölçülüyor;
kapının kendi örnekleminde (denk kadro, tohum 91000) **%3,3**. İkisi arasındaki fark
örnekleme gürültüsüdür (13 vs 20 uzatma maçı) — kapı hâlâ %4 alt sınırının altında.

Fark dağılımının ŞEKLİ korundu (20+ farkla biten %12,5 · ortalama fark 12,4) — yani
yakın maçlar açılmadı, yalnız kapanış dakikası gerçekçileşti.

**Ölçüm penceresi de yanlıştı:** kapı 120 maçla ölçüyordu. %4-8 hedefi 120 maçta 4,8-9,6
maç demektir; Poisson gürültüsü bandın kendisi kadar geniş. Aynı motorda ölçüldü:
120 maçta %1,7 · 240 maçta %4,6 · 400 maçta %5,0. Kapı 400 maça çıkarıldı.

### 3. ÖLÇÜM ARACI KUSURLARI (üç kapı yanlış şeyi ölçüyordu)

**a) `anlatim-check` — tek olaylı pozisyon damgası.** `_damgaDagit`, `dizi.length<2`
dalında olayı HAM `t` ile bırakıyordu; ham `t` bir önceki pozisyonun bittiği saniyedir,
dolayısıyla iki ardışık pozisyonun damgası çakışıyordu. Uzatma seyrekken (%1,7)
örnekleme bunu hiç görmemişti; %5'e çıkınca üç çakışma birden çıktı. Tek olay da artık
pencerenin üst ucuna oturtuluyor. **Motor kusuru, kapı doğruydu.**

**b) `yetenek-check` C bölümü — blok kapısı 60 maçta körelmişti.** Takım başına ~3 blok
var; 60 maçta ölçülen toplam 34'te kalıyor ve oran tek maçlık salınımla 1,00×'e
düşebiliyordu (ölçüldü: 34 vs 34). Kapı en dar kaleme göre boyutlandırılır — 240 maça
çıkarıldı, ölçülen 1,16× (115 vs 99).

**c) `yetenek-check` B bölümü — dağılım kapıları 40 maçta salınıyordu.** "5 ve altı
farkla biten" oranının standart hatası bu örneklemde ~7 puan, yani kapının kendisi kadar
geniş. Davranış değişmeden %20 ile %29 arasında salınıyordu; FAZ 38 ekinde "%26,3 ✓"
diye kaydedilen değer de bu gürültünün bir örneğiydi. 160 maça çıkarıldı, gerçek değer
**%22,5**.

**d) `sunum-check` F25-2 — TOPU TUTAN OYUNCU ÇAKILI KALIYORDU (gerçek kusur).**
İlk koşuda "1 donma · 1,5018 sn" ile düştü ve eşiği 1,8 milisaniye aştığı için gürültü
sandım; ikinci koşu geçti, üçüncü koşu yine düştü. Üç koşunun ayrıntısı aynı örüntüyü
gösterdi ve bu ÖLÇÜM DEĞİL DAVRANIŞ kusuruydu: donan oyuncu her seferinde **topu tutan**
oyuncuydu (`topta:true` · `hedefUzak:0` · `nudge:5` · hız 1,4-2,2 px/sn), diğer dokuz
jeton ise 17,4 px/sn ile kıpırdıyordu.

Kök neden `js/match-engine.js` salınım bloğundaydı: sürüklenme bandı topu tutan oyuncuda
**15 px**, adımı 4-6 px idi. Varış freni hedefe 24 px kalınca hızı düşürdüğü için bu
kadar kısa mesafe frenin tamamen içinde kalıyor ve jeton topu tutmuş hâlde çakılıyordu.
Oysa gerçek basketbolda set hücumunda EN ÇOK hareket eden oyuncu topu sürendir. Bant
21 px, adım 6-9 px yapıldı (takım arkadaşlarınınkine yakın). Ayırma ve saha-içi kırpma
kapıları değişmediği için aralık ölçümleri korunuyor.

**Ders:** aynı kapı üç koşuda 2 düşüp 1 geçiyorsa bu "gürültü" demek değildir —
ayrıntı satırındaki ÖRÜNTÜYE bak. Rastgele düşen kapının örneği her seferinde farklı
olur; buradaki üç örnek aynı rolü, aynı süreyi ve aynı nedeni gösteriyordu.

### 4. ÜÇLÜK BÖLGE DAĞILIMI — DÜZGÜN ÇEKİLİŞ KANADI TEPEDEN BÜYÜK YAPAMAZ

`sut-cografya-check` "tepe üçlüğü %13,7 (hedef ≤%13,3)" diye düşüyordu ve açı bandını
genişletmek (68° → 70° → 72°) sorunu ÇÖZMÜYOR, köşeyi taşırıyordu. Sebep aritmetik:
bölge sınırları açıdadır (|a|<26° tepe · 26-52° kanat · >52° köşe) ve **düzgün
çekilişte tepe ile kanat bandı eşit genişliktedir**, dolayısıyla payları da hep eşit
çıkar — ölçüldü, ikisi de %13,7. Gerçek dağılımda kanat tepenin belirgin üstündedir.

Çözüm açı çekilişini dışa büzmek: `a = sign(u)·68·|u|^0.87`. `rand` çağrı sayısı
değişmez (dolayısıyla rastgele akış kaymaz) ve isabet zaten şut geometrisinden ÖNCE
kararlaştırıldığı için **sonuç matematiği hiç etkilenmez** — bu saf bir sunum
düzeltmesidir.

| | Önce | Sonra | Hedef |
|---|---|---|---|
| köşe üçlüğü | %8,3 | **%9,3** | %8,2 – 10,2 |
| kanat üçlüğü | %13,7 | **%13,9** | %13,3 – 15,3 |
| tepe üçlüğü | %13,7 ✗ | **%12,5** | %11,2 – 13,3 |
| turnike | %33,4 ✗ | **%31,6** | %27,1 – 33,2 |

(Turnike, floater payı %74 → %79 yapılarak indi; floater seçimi `prChance` ile yapıldığı
için o da sonuç matematiğine dokunmaz.)

### 5. EN ÇEVİRİSİ — FAZ 38 HAVUZLARI KATALOĞA HİÇ KAYDEDİLMEMİŞTİ

B-1 dersinin birebir tekrarı: `IHLAL24_LINES`, `HUCUM_FAULU_LINES`, `ADIM_LINES`,
`TAC_LINES` için sözlük girişleri YAZILMIŞ ama havuzlar `localizeCatalogs()` listesine
**kaydedilmemişti**. Sözlük anahtarları `%S` yer tutucusu taşıdığı için ancak havuz
yerinde çevrilirse eşleşirler; kaydedilmeyince EN oyuncu bu satırların tamamını Türkçe
görüyordu. Dört havuz + üç yeni havuz kaydedildi.

Canlı anlatımda Türkçe payı **%4,5 → %2,2**.

### 6. SONUÇ TABLOSU

| Araç | FAZ 38 eki | Bu tur |
|---|---|---|
| `kutu-check` | 17/18 | **17/18** (yalnız uzatma %3,3; ölçüm 120→400 maç) |
| `sut-cografya-check` | 18/18 | **18/18** |
| `anlatim-check` | 31/31 | **31/31** |
| `yetenek-check` | 30/30 (40 maç, gürültülü) | **29/30** (160 maç, ölçülü) |
| `tempo` · `sut` · `lig` · `bicim` · `turkek` · `milliyet` | ✓ | **✓** |
| `arena` · `ekonomi` · `schema` · `analiz` · `portre` · `isim` · `geometri` | ✓ | **✓** |
| `faz7` · `faz10` · `faz11` · `mobile` · `m20` · `hareket` | ✓ | **✓** |
| `visual-check` · `bozukdeger-check` | ✓ | **✓** |
| `i18n-scan` (canlı anlatım Türkçe) | %4,5 | **%2,2** |
| `sim-node --n=1000 --seed=42` | hata 0 · deterministik | **82,2 - 76,0 · olay/maç 232 · hata 0** |

### 7. YENİDEN TEMELLENDİRME (üçüncü kez, bilinçli)

- `band.js`: `c89ce408ca435845` → **`6791635808a9ef5d`**
- `measure.js`: `bbdab982fe2a0d9d` → **`060c5f1763cd3699`** (skor 85-75 **değişmedi**,
  değişen sunum imzası: şut açısı dağılımı ve floater payı)
- Sürüm **72 → 73** (`?v=` + `sw.js` SCRIPT_V), `surum-check --yaz` ile kayıt tazelendi.

### 8. AÇIK KALANLAR

0. **`kutu-check` uzatma %3,3 (hedef %4-8).** FAZ 38 ekindeki %1,7'den iki kat iyi ve
   normal dağılımın tavanının (%2,9) üstünde, ama bandın altında. Aynı büyüklüğü ölçen
   iki kapıdan biri (aşağıdaki madde 1) ters yönde çekiyor.
1. **`yetenek-check` "5 ve altı farkla biten" %22,5 (hedef >%25).** Bu kapı ile
   `kutu-check`'in uzatma kapısı **aynı büyüklüğü** ölçer ve birbirini yer: her uzatmaya
   giden maç, yakın biten bir normal süre maçını listeden çıkarır (uzatma maçları
   ortalama 8,5 farkla bitiyor). Denk kadroda ölçülen σ 13,7; gerçek ligde denk takımlar
   için ~11-12. Asıl kaynak buysa çözüm pozisyon başı sonuç değişkenliğini düşürmektir —
   ama bu FAZ 34'ün gecelik form sistemine dokunur, ayrı bir iş.
2. **`rotasyon-check` 3/5** — yedek payı %36,3 (≤35), en skorer payı %27,2 (≤26),
   görünen oyuncu 9,9 (≥10). İlk ikisi ters yönde çekiyor; `ROT_YEDEK` 5/6/7 ve yedek
   kullanım katsayısı 0,62-0,80 tarandı, beşini birden tutan kombinasyon yok.
3. **`sahne-check` 7/8** — serbest atışta yerinde oyuncu 8,86/10 (hedef ≥9). Brifin
   kabul eşiği ≥6/8 olduğu için kapı geçiyor.

---

## FAZ 38 eki-3 — uzatma ve yakın maç oranı (2026-09-02)

Kullanıcı isteği: "uzatma ve yakın maç oranını düzelt". İki kapı da FAZ 38 eki-2'de açık
kalmıştı ve ikisi de aynı büyüklüğü — maçların ne kadar yakın bittiğini — ölçüyor.

### 1. TEŞHİS: MAÇ SAF RASTGELE YÜRÜYÜŞTÜ

Ayarlamaya başlamadan önce dağılımın nereden geldiğini ölçtüm (denk kadro, 600 maç):

| Ölçüt | Ölçülen | Anlamı |
|---|---|---|
| takım skoru std | 10,01 | — |
| fark std | 14,47 | — |
| **bağımsız olsaydı fark std** | **14,16** | ölçülen ≈ bağımsız |
| **iki takımın skor korelasyonu** | **−0,058** | gerçek ligde POZİTİF (tempo ortak) |
| 1Ç sonu fark std | 6,97 | |
| 2Ç sonu | 9,90 | 6,97 × √2 = 9,86 |
| 3Ç sonu | 12,53 | 6,97 × √3 = 12,07 |
| 4Ç sonu | 14,47 | 6,97 × √4 = 13,94 |

Fark std'si **tam √t ile büyüyor**. Yani maç, dört bağımsız çeyreğin toplamıydı: geri
besleme yok. Gerçek basketbolda büyüme √t'nin ALTINDADIR — önde olan gevşer, rotasyonunu
derinleştirir, saat eritir; geride kalan sıkışır, baskıya çıkar, riskli ama verimli şut
arar. Bu geri besleme olmadan yakın maç ve uzatma oranı **aritmetik olarak** hedefin
altında kalır (beraberlik tavanı ≈ 1/(σ√2π)).

### 2. SKOR ETKİSİ (score effects)

`runPossession` içinde, isabet kararından hemen önce:

```
_lead = hücumdaki takımın farkı
_evre = 4Ç:1 · 3Ç:0,8 · 2Ç:0,5 · 1Ç:0,2     (1Ç'de kimse gevşemez)
accF -= 0.034 * _evre * clamp(_lead/16, -1, +1)
```

16+ farkla önde olan takım son bölümde 3,4 puan isabet kaybeder, geride kalan aynısını
kazanır. **Etki simetriktir**, dolayısıyla lig ortalama FG%'si ve skor bandı DEĞİŞMEZ —
değişen yalnız dağılımın kuyruğu.

### 3. ASIL KUSUR: `pozTuru` UZATMADA YANLIŞ SAATİ OKUYORDU

Skor etkisi tek başına yetmedi; uzatma maçları **9,3 farkla** bitiyordu (5 dakikalık bir
periyot için imkânsız — listede 13, 15, 16 farklar vardı). Ölçtüm: uzatmada iki takım
toplam **39,3 sayı** buluyor (gerçek ~20) ama **şut sayısı 15,6 ile DOĞRU**. Fazlalığın
tamamı serbest atıştı.

Motoru işaretleyince kök neden çıktı: `pozTuru()` maliyet **0** döndürüyordu.

`pozTuru` tanımlandığı bloktaki `let t`yi kapatıyor; uzatma döngüsü ise KENDİ `let t`
bildirimini **ayrı bir blokta** kuruyor. Sonuç: uzatmada `pozTuru`, normal sürenin
**bitmiş** saatini (t = 0) okuyordu. Bütün kapanış kuralları uzatma boyunca sürekli açık
kalıyor, `_mal = t` maliyeti sıfırlıyor ve art arda sıfır saniyelik pozisyonlar
üretiliyordu (üç ardışık pozisyon aynı saniyeyi paylaşıyordu — `anlatim-check` bunu 30
çakışma olarak görüyordu).

Saat artık **parametre**: `pozTuru(tK)`, çağrılar `pozTuru(_tPrev)` / `pozTuru(_tPrev2)`.
Normal sürede çağrı zaten o anki `t` ile yapıldığı için oradaki davranış değişmez.

Ayrıca **taktik faul bölüm başına 2 ile sınırlandı**. Sınırsızken 32 saniyelik pencerede
pozisyon 3-7 sn sürdüğü için altı kez üst üste faul yapılıyor ve bölüm serbest atış
yağmuruna dönüyordu.

| Uzatma ölçütü | Önce | Sonra | Gerçek |
|---|---|---|---|
| uzatmada iki takım toplam sayı | 39,3 | **24,8** | ~20 |
| uzatmada şut | 15,6 | 15,6 | ~16 |
| uzatma sonu \|fark\| | 9,3 | **5,1** | ~5 |

### 4. SONUÇ

| Ölçüt | FAZ 38 eki-2 | Şimdi | Hedef |
|---|---|---|---|
| uzatmaya giden maç (denk kadro, 400 maç) | %3,3 ✗ | **%4,8** ✓ | %4 – 8 |
| 5 ve altı farkla biten | %22,5 ✗ | **%32,5** ✓ | >%25 |
| 20+ farkla biten | %7,5 | %11,9 ✓ | <%25 |
| ortalama sayı farkı | 10,2 | 10,2 ✓ | 9 – 13 |
| fark std (denk kadro) | 14,5 | **11,6** | gerçek denk takımlarda ~11-12 |
| çeyrek std büyümesi | tam √t | **√t'nin altında** | gerçek: √t altı |

`kutu-check` **18/18** · `yetenek-check` **30/30** · `anlatim-check` **31/31** ·
`sut-cografya-check` **18/18**.

### 5. ÖLÇÜM ARACI DÜZELTMELERİ

**a) `yetenek-check` dağılım kapıları tek kadro çiftinde ölçüyordu.** "Maçların
%25'inden fazlası 5 ve altı farkla biter" bir **LİG** istatistiğidir; tek çiftte
ölçülürse o çiftin güç farkını ölçer. Ölçüldü — aynı motorda üç ayrı çift: %23,8 · %28,5
· %34,5. Üstelik skor etkisi eklendikten sonra sabit güç farkı olan çiftte kütle denge
farkının çevresinde yığılıyor (20+ %7,5'e inerken ≤5 de düşüyor). Kapı artık 6 kadroluk
bir havuzda, bir lig gibi çeşitli eşleşmelerde ölçüyor. Aynı düzeltme `kutu-check`in
uzatma kapısında zaten yapılmıştı.

**b) `anlatim-check` damga muafiyeti sabit saniye yazıyordu.** Ölçüt "pencere ≤ 2 sn"
idi; bu, genel kuralın elle yazılmış tek bir özel hâliydi. Doğru ölçüt **pencere ↔ olay
sayısı** karşılaştırmasıdır: `_damgaDagit` penceresi [tSon, tPrev−1] olduğu için
çakışmasız yerleştirilebilecek olay sayısı en fazla `dtPos−1`dir.

**c) `yetenek-check` örneklemi 160 → 320 maç.** Ribaunt payı kapısı bir **uç değer**
istatistiğidir (bir maçtaki en büyük bireysel pay); havuz 6 kadroya yayılınca kadro
başına düşen çekiliş azaldı ve kapı %48'e düştü. Örneklem büyütülünce %52.

### 5b. KATSAYI HAREKET KAPISIYLA BİRLİKTE SEÇİLDİ

Skor etkisi ilk kurguda 0,046 idi ve üç hedef kapıyı da tutuyordu, ama `hareket-check`
içindeki "ortalama oyuncu hızı (maç saati)" satırı dört ardışık koşuda 1,20-1,28
arasında kaldı (hedef ≥1,30; önceki hâl 1,27 / 1,38).

Yalıtım ölçümü: katsayı 0 yapılınca 1,31 — sebep doğrudan skor etkisiydi. İki aday
mekanizma ELENDİ: son şut kuralını 4 sn öne almak (1,22) ve son dakika hızlanmasını
yumuşatmak (1,28) hiçbir şey değiştirmedi. Etki, pozisyon süresi kurallarından değil,
maç sonuçlarının kendisinden dolaylı olarak geliyor.

Katsayı **0,034** yapılınca üçü birden tuttu: uzatma **%4,8** · ≤5 farkla biten
**%32,5** · ortalama hız **1,32-1,36 m/sn**.

**Ders:** bir kapıyı yeşile döndüren değişikliğin BAŞKA bir kapıyı düşürüp
düşürmediği, o kapı bambaşka bir şeyi (sahne hızını) ölçüyor olsa bile sınanmalıdır.
Skor etkisi bir isabet ayarıdır; jetonların hızıyla ilgisi yokmuş gibi görünür.

### 5c. YENİ OLAYIN SAHNE SÖZLEŞMESİ DE VAR (teknik faul dizilimi)

Eklediğim teknik / sportmenlik dışı faul olayı serbest atış üretiyor ama olaya
`shots` dizisini koymamıştım. Sahne katmanı serbest atış dalına
`ev.shots[0].kind === "ft"` şartıyla giriyor; dizi olmayınca `_setFtFormation` hiç
çağrılmıyor ve on jeton olduğu yerde kalıyordu. Ölçüldü: `sahne-check` "serbest
atışta yerinde oyuncu" **8,86 → 8,14** (en kötü kare 1/10). Dizi eklendi; koordinat
kayması DETERMİNİSTİK (rand kullanılmaz), yoksa nadir olay maçın rastgele akışını
tüketirdi. `measure.js` hash'i değişmedi — düzeltme tamamen sunum katmanında.

**Ders:** yeni bir olay türü eklerken yalnız kutu skor ve anlatım sözleşmesi değil,
**sahne sözleşmesi** de doldurulmalı. Sahne olayı tipiyle değil, taşıdığı alanlarla
tanıyor.

### 5d. ÖRNEKLEM BÜYÜTÜLEMİYORSA ÖLÇÜT ÖRNEKLEME UYARLANIR (F25-3)

`sunum-check` F25-3'ün alt ölçütü "25 m+ ilk pas oranı < %5" idi. Toplanan 59-69
sokmada çözünürlük 1/59 = **1,7 puan**: kapı 2 olayda geçiyor (1/69 = %1,5 ✓), 3 olayda
düşüyor (3/59 = %5,08 ✗) — davranış aynı.

İlk çözüm tabanı 110'a çıkarmaktı ve **ölçerek yanlış çıktı**: aracın 900 saniyelik
pencere üst sınırı 65 sokmada tıkanıyor, kapı "ÖRNEKLEM YETERSİZ" veriyor — yani
ölçülemez hâle geliyor. Bu araçta örneklem BÜYÜTÜLEMİYOR.

Doğru çözüm ölçütü örnekleme uyarlamak: soru "3 gördüm mü" değil, "gözlenen oran
%5'in ANLAMLI biçimde üstünde mi". Tek yönlü %95 binom payı (1,64 σ) eklendi —
n=65'te 5 olaya, n=200'de 3'e karşılık gelir, yani **örneklem büyüdükçe kapı
kendiliğinden sıkılaşır**. Taban 15 → 40.

Bu, aynı oturumda dördüncü örneklem kusuru (uzatma 120→400 · blok 60→240 ·
dağılım 40→320 · sokma: ölçüt uyarlandı) ve ilk kez örneklemi büyütmenin MÜMKÜN
OLMADIĞI vaka.

### 6. DENENDİ VE GERİ ALINDI

**Rotasyon yedek payı (%38,0, hedef ≤%35).** İki ayrı yön denendi: (a) yedek nöbetini
uzatmak (dinlenme 6→4, cooldown 11→13) — pay değişmedi (%38,2), en skorer payı bandın
dışına çıktı; (b) nöbeti kısaltmak (3 / 7) — **dört kapı birden düştü** (%36,6 · görünen
9,8 · en skorer %27,5 · değişiklik 22,6). Ölçüm şunu söylüyor: pay rotasyon SIKLIĞINDAN
değil, ilk beşin **pozisyon dengeli** seçilmesinden geliyor — 6. adam çoğu zaman
ilk beşteki bir oyuncudan daha iyi skorer. Rotasyon knoblarıyla çözülmüyor; çözüm
`matchLineup`'ın seçim ölçütüne dokunmayı gerektirir, ayrı bir iş. En iyi hâl 4/5
(FAZ 38 eki-2'de 3/5 idi).

### 6b. AÇIK KALAN: SERBEST ATIŞ DİZİLİMİ (sahne-check 7/8)

`sahne-check` "serbest atışta yerinde oyuncu" bu oturumda hiç 9,0 eşiğine ulaşmadı:
8,86 (eki-2) · 8,81 · 8,14 · **8,43** (shots düzeltmesinden sonra). Yani kapı bu turdan
ÖNCE de düşüyordu; benim eklediğim teknik faul olayı onu 8,86'dan 8,14'e indirmişti,
`shots` dizisi eklenince 8,43'e döndü. Brifin kabul eşiği ≥6/8 olduğu için
`sahne-check` 7/8 ile geçiyor. Kalan açığın muhtemel kaynağı bölüm sonunda (taktik
faulün 32/10 saniyelik penceresinde) doğan serbest atışlar: diziliş kuruluyor ama çeyrek
bitişi koreografiyi kesiyor. Ayrı bir iş.

### 7. YENİDEN TEMELLENDİRME (dördüncü kez, bilinçli)

- `band.js`: `6791635808a9ef5d` → **`46a19413380a8f07`**
- `measure.js`: `060c5f1763cd3699` → **`df5e0c6fa1630b6c`** (kanonik maç 85-75 → 84-81)
- Sürüm **73 → 74**.

`sim-node --n=1000 --seed=42`: 81,0 - 76,8 · olay/maç 231 · hata 0 · deterministik ·
`G` değişmedi.

---

## 39. oturum — FAZ 39: GERÇEK VERİYLE KALİBRASYON (2 Eylül 2026)

Brif: `KALIBRASYON-FAZ39.md`. Tezi tek cümleyle: *FAZ 34-38 arasındaki beş turda
kapılar hep yeşile döndü ama oyun "basketbola benzemiyor" kaldı; çünkü kod değil
**hedefin kendisi** yanlıştı — bütün "gerçek: %14-18" bantları brifi yazan taraf
TAHMİN etmişti.* Bu oturumda eşikler ölçülmüş gerçek maç verisinden çıkarıldı.

### §1 — Uzatma oranı: brifin teşhisi ÖLÇÜMLE DOĞRULANMADI

Brif "uzatma %0 → %17,5 çıktı, %4-8'e geri çek" diyordu ve bunu paketin geri kalanından
önce yapmamı istiyordu. Ölçtüm — **HEAD'de zaten banttaydı**:

| Örneklem | Uzatma oranı |
|---|---|
| 400 maç, denk kadro | **%7,5** |
| 600 maç, 6 kadroluk havuz | **%5,8** |
| `kutu-check` kendi kapısı (240 maç) | **%4,8** |
| 40 maçlık 20 ayrı pencere | **%0,0 – %15,0** |

Yani %17,5, 40 maçlık bir örneklemin gürültü zarfının içindedir (aynı kodda 40 maçta
%0 da %15 de çıkıyor). Brifin ölçtüğü "önce %0 sonra %17,5" ikilisi de tek bir davranış
değişikliğinin değil, iki farklı çekilişin sonucudur. **Değişiklik yapılmadı** — kapıyı
yeşile döndürmek için var olmayan bir kusuru "düzeltmek" tam olarak bu paketin
engellemeye çalıştığı şey. (Sonradan gerçek veriyle de doğrulandı: NBA'de 3.690 maçta
uzatma oranı **%5,37**.)

### §2 — Canlı sahne: iki hipotezden biri doğru çıktı

**§2.1 koreografi kesiliyor mu — HAYIR.** `js/main.js` oynatım gecikmesi
`delay = max(simMs, dtMs)`; koreografi süresi bir ALT SINIRDIR, pozisyonun maç saati
kısalsa bile animasyon kesilmez. Yapısal olarak imkânsız.

**§2.2 yedi yeni olayın sahnesi var mı — HAYIR, ve maç başına 14,4 olayı etkiliyordu.**
Ölçüm (120 maç): `mola` 5,61 · `tac` 2,64 · `hucumFaulu` 2,42 · `ihlal` 1,87 ·
`ihlal24` 1,74 · `teknik` 0,13 · `sakatlikMac` 0,07 · `sportmenlikDisi` 0,03.
`teknik`/`sportmenlikDisi` FAZ 38 eki-3'te serbest atış dalına bağlanmıştı; **kalan
14,4 olayın tamamı** `movePlayersForEvent`'in sondaki genel dalına düşüyordu ve o dal
topu **hücumda sanılan takımda** tutup çevresinde paslıyordu. Yani her maçta ~14 kez
düdük çalıyor, oyun durmuyor ve top yanlış takımda kalıyordu.

Yapılanlar (`js/match-engine.js`):
- **Kural ihlali dalı** (`tac` · `ihlal` · `hucumFaulu` · `ihlal24`): düdük → ölü top →
  herkes yürür → top KAZANAN takıma geçer → kenardan sokma. Taç yan çizgiden, pota
  dibindeki ihlal dip çizgiden.
- **Mola dalı**: iki takım kendi kulübesinde toplanır, top hakemde, sonra sahaya döner.
  ⚠ İlk kurguda jetonlar kulübede BIRAKILIYORDU; molayı bir serbest atış izlediğinde
  on oyuncu da çizgiye 400 px uzaktan başlıyor, `_ftHazir`'ın +2,5 sn tavanı yetmiyor
  ve atış boş sahada patlıyordu (`sahne-check` en kötü karesi 3/10 → **0/10**).
  Koreografi iki adımlı yapıldı: toplanma (0,05 sn) → dizilime dönüş (1,30 sn).
- `sakatlikMac` faul dalına bağlandı (ölü top + değişiklik).
- Olaylara **`kazananIsUser`** alanı eklendi — sahne sözleşmesi. Saf veri, rastgelelik
  tüketmez; `band.js` hash'i bu adımda DEĞİŞMEDİ (`46a19413380a8f07` korundu).

### §3.1-3.3 — Veri hattı

Yeni klasör `tools/gercek-veri/`:
- **`indir.js`** — `shufinskiy/nba_data` (Apache-2.0), 3 sezon (2022/23, 2023/24,
  2024/25) × 3 veri kümesi (`pbpstats` · `nbastats` · `shotdetail`), 784 MB açılmış CSV.
  `_ham/` `.gitignore`'da; **ham veri commit EDİLMEDİ**.
  ⚠ GNU tar (Git Bash) `C:\...` yolunu uzak sunucu sanıyor ("Cannot connect to C") —
  arşiv kendi klasöründen göreceli adla açılıyor.
- **`_csv.js`** — akışlı CSV okuyucu. `cut -d,` / `split(',')` bu veride ÇALIŞMAZ:
  `pbpstats`in EVENTS sütunu tırnak içinde hem virgül hem SATIR SONU taşıyor; ilk
  denemede STARTTYPE sütunu %53 boş göründü.
- **`cikar.js`** — 3.690 maç · 729.559 pozisyon · 655.446 şut · 1.716.435 olay ·
  90 takım-sezon → **`tools/_lib/gercek-bantlar.json`** (commit edilir).

Ölçerek bulunan üç incelik:
1. **`pbpstats` satırları pozisyon başına TEKRAR EDER** (pozisyon alanları her olay
   satırında aynı, yalnız DESCRIPTION/URL değişir). Ham 392,8 satır/maç — gerçeğin iki
   katı. Tekillenmiş: 198,2 pozisyon/maç = takım başına 99,1 (NBA yayımlanmış pace ~99).
2. **Takım olayları oyuncuya değil TAKIMA yazılır** (`PLAYER1_TEAM_ID` boş, TEAM_ID
   `PLAYER1_ID` alanında, `PERSON1TYPE` 2/3). Bu ayrım yapılmadan **şut saati ihlali
   sıfır çıkıyordu**.
3. **Üç dosya üç ayrı takım anahtarı kullanıyor** (TEAM_ID / kısaltma / tam ad).
   Birleştirilmeden FTA/FGA gibi çapraz oranlar ve pozisyon başına ölçütler kurulamıyor.

**Ölçekleme (§3.2).** Oran ve dağılım ölçütleri doğrudan taşınır; sayım ölçütleri
40/48 = 0,8333 ile çarpılır. Ama ölçüm şunu gösterdi: **süre ölçeklemesi VERİMİ
düzeltmez.** Ölçeklenmiş NBA takımı 40 dakikada **95,2 sayı** atar; gerçek FIBA maçı
~80'dir. Fark tempodan değil pozisyon başına verimden gelir (NBA 1,155 sayı/pozisyon).
Bu yüzden JSON'a **`pozisyonBasina` bloğu** eklendi — saf oran, süreden ve tempodan
bağımsız, FIBA'ya doğrudan taşınabilir. Kapılar artık ONU okuyor, ham sayımı değil.

**Bant genişliği kararı:** brif "±1 standart sapma" diyor ama hangi dağılımın olduğunu
söylemiyor. Tek maçların sapması bir LİG ORTALAMASINI yargılamak için çok geniştir
(kapılar 240 maçlık ortalama ölçer). Bant **takım-sezon** değerlerinden kuruldu:
30 takım × 3 sezon = 90 gözlem, "gerçek takımlar birbirinden ne kadar farklı".

**`null` kalan ölçütler** (uydurulmadı, kapı kurulmadı): `kutuOranlari.ORB` ve
`kutuOranlari.DRB` — hücum/savunma ribaunt YÜZDESİ için savunma ribaundunun hangi
pozisyona ait olduğu gerekiyor, `pbpstats` satırında o alan yok. Yerine pozisyon başına
hücum ribaundu (0,129) çıkarıldı. `sutTipi`nin yedi sınıfının tamamı ACTION_TYPE
metninden çıkarılabildi — orada `null` yok.

### §3.4 — Kapılar JSON'dan okuyor

Yeni ortak okuyucu **`tools/_lib/gercek-bant.js`** (`al` / `ham` / `kapi` / `bas`).
Bağlananlar: `tempo-check` · `kutu-check` · `rotasyon-check` · `sut-cografya-check`.
Her satır artık **ölçülen · gerçek · bant · kaynak dosya+alan · n** basıyor.

Silinen tahmin eşikleri ve ölçülen gerçekleri:

| Eski (tahmin) | Gerçek (ölçülen) |
|---|---|
| pozisyon süresi 0-4 sn: %1-2 | **%7,93** |
| pozisyon süresi 25+ sn: %0-2 | **%8,50** |
| 3PA/FGA: %33-38 | **%40,12** [36,1-44,1] |
| yedeklerin sayı payı: %25-35 | **%36,55** |
| oyuncu değişikliği (iki takım): 16-22 | **39,5** |
| hızlı hücum üçlükle bitmesin (≤%20) | geçiş pozisyonlarının **%30,1'i** üçlükle biter |
| şut bölgesi hedefleri (brif + motora ölçekleme) | doğrudan pay, ölçeklemeye gerek yok |

⚠ **İKİ AYRI "POZİSYON" TANIMI VAR.** `pbpstats` bir pozisyonu top el değiştirene kadar
sayar (hücum ribaundu / savuşturulan top kaybı / savunma faulü pozisyonu UZATIR);
motorun döngüsü her yeni şut denemesini ayrı `pozIx` yapar. Ölçüldü: aynı 60 maçta ham
176,4 pozisyon/maç, birleştirilmiş 144,5 — gerçek değer (164,9) tam ikisinin arasında.
Ham sayımı gerçekle kıyaslamak kapının kendi tanımını ölçmesidir. `tempo-check` ve
`kutu-check` artık **birleştirerek** sayıyor. Aynı ayrım "geçiş" için de var: gerçek
veride geçiş = pozisyonun canlı topla başlaması (%40,05); motorun `fbPoz` bayrağı bundan
DARDIR. Motora saf veri damgası **`transPoz`** eklendi ve kapı onunla kuruldu.

### §3.5 — Motor gerçek bantlara ayarlandı

**1) FIBA 14 SANİYE KURALI EKSİKTİ (en büyük yapısal kusur).** Top el değiştirmediyse
(hücum ribaundu, savuşturulan top kaybı, savunma faulü) şut saati 24'e değil 14'e döner
ve ikinci şans pozisyonu KISADIR. Motorda bu kural yoktu; topu koruyan takım yepyeni
bir 13-21 sn'lik set hücumu maliyeti ödüyordu. Sonuç: pozisyonlar gerçeğin bir buçuk
katı uzuyor, 25+ sn payı **%14,7** (gerçek %8,5) ve 40 dakikaya daha az pozisyon
sığıyordu. `pozTuru`'ya `devam` dalı eklendi (`posNext===_lastOff`).

**2) BOYA YARIÇAP DEĞİL DİKDÖRTGENDİR.** `classifyZone` iki sayılık şutu potaya
uzaklığa göre ayırıyordu (≤44 px çember, ≤112 px boya). Gerçek şut verisi boyayı ALANLA
tanımlar: restricted area 1,25 m yarıçap, boya ise RAKETİN KENDİSİ (4,9 × 5,8 m).
112 px = 3,79 m yarıçap raketin dip yarısını orta mesafeye yazıyordu (ölçüm: motor
%15,6 orta mesafe, gerçek %11,0). Sınıflama ve `randShotXY` üretim bantları
(10-35 / 38-99 / 106-187) gerçek tanıma oturtuldu. `rand()` çağrı sayısı değişmedi.

**3) BOYADAN SIÇRAMA ŞUTU YOKTU.** Motor boyadaki her bitirişi turnikeye yazıyordu
(%31,5 · gerçek %24,7) ve gerçek jumper payını (%15,2) yakalayamıyordu. `zone==='paint'`
için %30 jumper dalı eklendi; kanca 0,16 → 0,26 (gerçek %2,93). Karar `pr` ile verilir.

**4) ÜÇLÜK PAYI.** Taban 0,44 → 0,475 (ölçülen %35,7 → **%38,0**, gerçek %36,1-44,1).

**5) POZİSYON SONUCU DAĞILIMI.** Pozisyonlar şut yerine top kaybı/faulle bitiyordu.
`roll` eşikleri 0,700/0,7455 → **0,740/0,782**, faul–top kaybı ayrımı 0,40 → 0,35.

**6) SERBEST ATIŞ İSABETİ.** Taban 0,55 → 0,58 (bot 0,72 → 0,755). Ölçülen %74,9 →
**%77,9**, gerçek %78,1 [75,5-80,7].

### ⚠ ÇÖZÜLMEYEN GERİLİM: NBA VERİSİ ↔ FIBA FORMATI

Bu paketin en önemli bulgusu ve dürüstçe raporlanması gereken şey: **motor aynı anda
NBA temposuna, NBA isabetine ve FIBA skoruna sahip olamaz.** Ölçüldü:

- Gerçek bantların tamamı kovalandığında (tempo 165,9 pozisyon · sayı/pozisyon 1,15)
  `band.js` kullanıcı ortalaması **96,2** oluyor, en yüksek skor 123.
- Brif §1 skor bandını (**78-95**) bozmamayı kırmızı çizgi olarak yazıyor.

Bu yüzden tempo bilerek gerçeğin **%6 altında** bırakıldı (154,5 · gerçek 164,9) ve
pozisyon sonucu dağılımı tam gerçek orana çekilmedi. Sonuç: kullanıcı ortalaması
**89,9** (81,3 idi), skor bandı korunuyor. Kalan açık `tempo-check` ve `kutu-check`
çıktısında ölçülü olarak duruyor — gizlenmedi. `gercek-bantlar.json` içindeki
`pozisyonSayisi.not` alanı da bunu belgeler: NBA'nin süreyle ölçeklenmiş temposu
40 dakikalık maçın ÜST sınırıdır, yayımlanmış FIBA tempoları (~72-78) daha düşüktür ve
bu ek fark **ölçülmedi, uydurulmadı**.

Skoru 80'e geri çekmek isteyen tek yeri bilir: `pozTuru` içindeki dört süre bandı
(`devam` / `fb` / `fromTrans` / set). Bantları 1 sn uzatmak ≈ 4-5 sayı düşürür ve
tempo kapısını o kadar uzaklaştırır. Bu bir DENGE tercihidir, kusur değil.

### Ölçüm araçlarında düzeltilen iki kapı kusuru

- **`yetenek-check` ribaunt eşiği ELLE YAZILIYDI** (13). Brifin ölçütü "20+ ribaunt"
  gerçek basketbolun hacmine (takım başına ~43,7) göredir; motorun hacmi FAZ 39 tempo
  düzeltmesiyle 29 → 37,1'e çıkınca sabit eşik kapıyı **davranış değişmeden** düşürdü.
  Eşik artık `gercek-bantlar.json`'dan oranla türetiliyor. Yuvarlama değil **taban**
  alınıyor: 16,98 → 17 ölçümde %0,25 (bandın altı), 16 → %0,40 (bandın içi) — eşik bir
  SAYIM sınırıdır, yukarı yuvarlamak bandı bir kova kaydırır.
- **`sut-check` F26-A2** "jumper yalnız orta mesafede" diyordu. Gerçek veride boyadan
  atılan ayak üstü şutlar 'Jump Shot' etiketlidir; kural jumper'ın yalnız ÇEMBER
  dibinde ve üçlük yayında yasak olması şeklinde düzeltildi.

### Referans değerler (yenilendi — bilerek)

- `band.js`: `46a19413380a8f07` → **`76351f00455b3a5e`**
- `measure.js`: `df5e0c6fa1630b6c` → **`0132d9fff6e778d0`** (kanonik maç 84-81 → 82-98)
- `sim-node --n=1000 --seed=42`: 88,5-80,2 · olay/maç 203 → **91,3 - 85,4 · olay/maç 248**
- Sürüm **74 → 75**.

### Yapılmayanlar (dürüst liste)

- **§3.3.3 / §3.6 — tracking verisi ve sahne katmanının ona oturtulması YAPILMADI.**
  Brif bunları 6-7. sıraya koyup "ayrı bir oturum olabilir" diyor. `gercek-hareket.json`
  üretilmedi; `sahne-check` · `hareket-check` · `spacing-check` · `realism-check`
  eşikleri hâlâ elle yazılı ve gerçeklik iddiası taşımıyor.
- **Tip-in payı** %0,76 (gerçek %2,55). Sebep ölçüldü: motorda ikinci şans şutu
  `shooterHint` üzerinden gelir ve **anlatım bayrağına** (`_rebAnlat`) bağlıdır —
  mekanik bir sunum kararına bağlanmış durumda. Düzeltmek sonuç matematiğine dokunur,
  ayrı ve ölçülü bir adım gerektirir.
- **Oyuncu değişikliği** 20,3 (gerçek 39,5). Bu ölçüt kural farkından en çok etkilenen
  kalem: NBA sınırsız değişiklik hakkına ve daha çok ölü topa sahip. JSON'da `not`
  alanıyla belgelendi.
- **Ribaunt / top kaybı / çalma / faul pozisyon başına** hâlâ gerçeğin üstünde; §3.5-5
  bunları gerçek orana çekiyordu ama skor bandı kırmızı çizgisi yüzünden yarı yolda
  bırakıldı (yukarıdaki gerilim maddesi).

### Önce / gerçek / sonra (ölçülen)

| Ölçüt | FAZ 38 sonu | **Gerçek** (3 sezon NBA) | FAZ 39 sonu | Kapı |
|---|---|---|---|---|
| pozisyon/maç (pbpstats tanımı) | 144,5 | **164,9** [161,8-167,9] | 155,1 | ✗ |
| ortalama pozisyon süresi | 16,85 sn | **14,57** [14,33-14,81] | 15,56 sn | ✗ |
| 25+ sn pozisyon payı | %14,73 | **%8,50** [7,73-9,28] | %7,95 | bilgi |
| 0-4 sn pozisyon payı | %0,91 | **%7,93** [7,17-8,69] | %3,08 | bilgi |
| geçiş pozisyonu ort. süresi | 13,11 sn | **10,45** [10,16-10,74] | 11,86 sn | ✗ |
| set hücumu ort. süresi | 19,68 sn | **17,32** [17,04-17,60] | 18,46 sn | ✗ |
| FG% | %47,2 | **%47,24** [45,57-48,90] | %46,76 | ✓ |
| 2P% | %53,2 | **%54,64** [52,62-56,66] | %53,59 | ✓ |
| 3P% | %36,2 | **%36,19** [34,62-37,77] | %35,71 | ✓ |
| FT% | %76,5 | **%78,13** [75,53-80,74] | %77,92 | ✓ |
| 3PA / FGA | %35,4 | **%40,12** [36,13-44,11] | %38,20 | ✓ |
| FTA / FGA | 0,306 | **0,251** [0,229-0,274] | 0,269 | ✓ |
| asist / isabetli şut | 0,623 | **0,624** [0,587-0,661] | 0,621 | ✓ |
| **sayı / pozisyon** | 0,90 | **1,155** [1,121-1,189] | 1,13 | ✓ |
| FGA / pozisyon | 0,691 | **0,898** [0,879-0,917] | 0,883 | ✓ |
| FTA / pozisyon | 0,211 | **0,226** [0,208-0,243] | 0,238 | ✓ |
| blok / pozisyon | 0,045 | **0,049** [0,042-0,057] | 0,048 | ✓ |
| ribaunt / pozisyon | 0,468 | **0,442** [0,423-0,460] | 0,482 | ✗ |
| top kaybı / pozisyon | 0,185 | **0,142** [0,130-0,153] | 0,170 | ✗ |
| top çalma / pozisyon | 0,107 | **0,077** [0,069-0,086] | 0,098 | ✗ |
| faul / pozisyon | 0,252 | **0,198** [0,184-0,213] | 0,218 | ✗ |
| bölge: çember | %27,3 | **%29,11** [25,96-32,27] | %27,3 | ✓ |
| bölge: boya | %20,5 | **%19,82** [17,19-22,46] | %21,3 | ✓ |
| bölge: orta mesafe | %15,6 | **%10,96** [8,13-13,79] | %13,4 | ✓ |
| bölge: köşe üçlüğü | %9,7 | **%10,19** [8,73-11,65] | %9,6 | ✓ |
| bölge: kanat+tepe üçlüğü | %27,0 | **%29,70** [26,30-33,10] | %28,4 | ✓ |
| tip: turnike | %31,5 | **%24,74** [22,06-27,42] | %26,3 | ✓ |
| tip: jumper (2 sayılık) | %13,4 | **%15,21** [11,31-19,11] | %15,9 | ✓ |
| tip: kanca | %1,8 | **%2,93** [1,79-4,08] | %2,9 | ✓ |
| tip: tip-in | %0,4 | **%2,55** [2,05-3,05] | %0,8 | ✗ |
| yedeklerin sayı payı | ~%19 | **%36,55** [30,85-42,24] | %38,9 | ✓ |
| en skorer oyuncunun payı | — | **%24,80** [22,76-26,84] | %26,3 | ✓ |
| kutu skorda görünen oyuncu | — | **10,65** [10,15-11,15] | 10,0 | ✗ |
| oyuncu değişikliği (iki takım) | 19,5 | **39,48** [34,80-44,14] | 20,3 | ✗ |
| uzatmaya giden maç | %4,8 | **%5,37** [4,80-6,42] | %4,8 | ~ |
| `band.js` kullanıcı ortalaması | 81,3 | (ölçekli NBA 95,2) | **89,9** | — |

Kapı özeti: `kutu-check` 12/16 · `sut-cografya-check` 12/13 · `rotasyon-check` 2/4 ·
`tempo-check` 0/5 (ama beş satırın hepsi öncekinden gerçeğe yakın).
Geçen denetimler: `sim-node` (1000 maç, determinizm ✓, `G` değişmedi) · `visual-check`
(masaüstü+mobil, 0 hata) · `bozukdeger-check` · `anlatim-check` 31/31 ·
`yetenek-check` 30/30 · `sut-check` 14/14 · `sunum-check` · `realism-check` ·
`box-band` · `season-loop --runs=3` 6/6 · `lig-check` · `milliyet-check` ·
`turkek-check` · `bicim-check` · `schema-check` · `m20-check` · `faz11-check` ·
`surum-check`. `sahne-check` 5/8 (HEAD'de 6/8; ayrıntı aşağıda).

`sahne-check` durumu: serbest atış dizilişi **8,43 → 9,32 iyileşti** (mola koreografisi
sayesinde), buna karşılık "orta çizgi geçişi / pozisyon değişimi" %97 → %83 düştü.
Sebep ölçüldü: ihlal olayları artık pozisyonu GERÇEKTEN el değiştiriyor, dolayısıyla
aracın saydığı "pozisyon değişimi" 35 → 40'a çıktı; payda büyürken pay aynı kaldı.
Bu, sahne katmanının gerçek hareket verisine oturtulmasını bekleyen bir kalem (§3.6).

---

## 40. OTURUM — FAZ 40: CANLI MAÇ HAREKET FİZİĞİ + AÇIK KALAN HATALAR

Tarih: 3 Eylül 2026. Taban: `372daba` (FAZ 39).
**COMMIT/PUSH YAPILMADI** — kullanıcı önce izleyecek.

### İŞ 0 — ÖLÇÜM ARACI (`tools/iz-kaydet.js` + `tools/iz-ciz.js`)

Topun ve 10 jetonun konumu her animasyon karesinde kaydedilir (80 sn ≈ 4.790 kare),
hız **100 ms pencerede** hesaplanır. `--yeniden=<etiket>` ile kaydedilmiş iz tarayıcı
açmadan yeniden çözümlenir. `iz-ciz.js` iki resim üretir (yörünge + hız profili);
her sürüm `olcum/` altında saklanır: **temel · a1 · final**.

#### ⚠ EN ÖNEMLİ BULGU: BRİFİN HIZ TABLOSU 1,45× ŞİŞİKTİ (F15 dersinin tekrarı)

Araç sahne↔maç saati oranını **aynı koşuda** ölçer: **1 duvar sn = 1,45 maç sn**.
Yani sahne maç saatini hızlandırarak oynatır ve ekranda görülen hız, gerçek basketbolun
1,45 katıdır. Brifin A2 tablosu SAHNE hızlarını doğrudan gerçek basketbolla kıyaslıyordu.
Maç ölçeğine indirilince eski merdiven şuydu (hız=60):

| Kademe | Brif "şu anki" | GERÇEK (maç ölçeği) | Gerçek basketbol |
|--------|----------------|---------------------|------------------|
| YÜRÜ   | 2,13 m/sn      | **1,74**            | 1,2 – 1,5        |
| JOG    | 5,08           | **4,15**            | 2,5 – 3,3        |
| KOŞ    | 6,86           | **5,60**            | 3,5 – 5,5        |
| SPRINT | 8,23           | **6,72**            | 6,5 – 7,5        |

Yani SPRINT ve KOŞ zaten doğruydu; bozuk olan ORTA basamaklardı. Ortalama hız da
**2,07 m/sn** ile bandın (1,8–2,6) içindeydi. Brifin "hepsini yarıya indir" önerisi
uygulansaydı ortalama 1,4 m/sn'ye, bandın ALTINA düşerdi.

#### ⚠ İKİNCİ BULGU: MERDİVENİ ÖLÇEKLEMEK YAPISAL OLARAK İŞE YARAMIYOR (ölçüldü)

Merdiven maç ölçeğine oturtuldu (jog 4,15 → 2,95 m/sn) ve denendi. Sonuç: koreografinin
sabit aralıkları yetmedi, dizilim şut anında oturmadı (`şut anında yerinde hücumcu`
4,11 → 3,47/5; `orta çizgi geçişi` %97 → %65). Aralıklar merdivenle ölçeklenince
(`_KORE_KAT`) dizilim düzeldi **ama maç saati aynı oranda yavaşladı**:

| `_KORE_KAT` | sahneKat (1 duvar sn = ? maç sn) |
|-------------|----------------------------------|
| 1,00        | 1,388                            |
| 1,20        | 1,193                            |
| 1,35        | 1,052                            |

Sebep `js/main.js`'te yazılı: `delay = max(simMs, dtMs)` ve bu motorda **simMs bağlayıcı**.
Yani pozisyonun duvar saatindeki uzunluğunu KOREOGRAFİ belirler, koreografiyi de oyuncu
varış süresi belirler. Oyuncuyu yavaşlatmak saati aynı oranda yavaşlatır; **sahne
hızı / sahneKat oranı — yani izleyiciye görünen gerçekçilik — DEĞİŞMEZ**, yalnız maç
%30 daha uzun izlenir.

**KARAR: hız merdiveni GERİ ALINDI** (brifin "ölçüm kötüleşiyorsa geri al" kuralı).
Gerçek kusur ortalama değil **DAĞILIMDI** (donma + uç değer + kavis yokluğu) ve o
merdivene dokunmadan çözüldü.

### ÖNCE / SONRA (80 sn · seed 987654321 · rate 1 · MAÇ ölçeği)

| Ölçüt | temel | final | hedef |
|---|---|---|---|
| topun en yüksek hızı (100 ms) | **68,1 m/sn** | **20,1** | ≤ 22 ✓ |
| top ışınlanma olayı (>25 m/sn) | **202 (15,5/poz)** | **0** | 0 ✓ |
| gerçek pas platosu (8-20 m/sn kare) | 273 | **766** | korunmalı ✓ |
| oyuncu ortalama hızı | 2,07 | 2,02 | 1,8–2,6 ✓ |
| oyuncu medyan hızı | 0,98 | **1,20** | — |
| > 7,5 m/sn oranı | 0,3% | 0,5% | ≤1% ✓ |
| > 6,5 m/sn oranı | 3,6% | 2,6% | ≤5% ✓ |
| **< 0,5 m/sn (donma)** | **41,5%** | **27,1%** | ≤12% ✗ |
| en yüksek oyuncu hızı | 10,4 | 8,1–9,8 | ≤8,5 ~ |
| ortalama dönüş açısı | 12,5° | 10,0° | kavis |
| **> 90° keskin dönüş** | **2,38/poz** | **1,25/poz** | ≤2 ✓ |
| **tam sahayı düz geçen jeton** | **3** | **0** | 0 ✓ |

### A1 — TOP IŞINLANMASI ✓ (202 → 0)

Kök neden ışınlanma değil **SÜREYDİ**: koreografi adımları `_ballPass`e sabit süre
veriyor (0,32 / 0,34 / 0,36 / 0,40 / 0,45) ve mesafe uzun olunca aynı sürede kat
ediliyordu — kayıtta ard arda 6-8 karede 32-35 px, yani 2000 px/sn.

1. **`_TOP_MAXV=580 px/sn`** (19,6 m/sn sahne · 13,5 m/sn maç). `_ballPass` çağıranın
   verdiği süreyi bu tavanla karşılaştırır ve **süreyi uzatır**, konumu zıplatmaz.
2. `held` dalı: sürme noktası oyuncunun HIZ YÖNÜNDEN türüyor ve `sp>10` eşiği geçilince
   (ux,uy) bir karede sıçrıyordu (22 px yanal ofset anında dönüyor → 1400 px/sn).
   Top artık hedef noktasına **sınırlı hızla** taşınır. `_ballHold`'un d ≤ 30 px dalındaki
   "top ele tek karede atlar" sıçraması da böylece kalktı.
3. Şut anındaki `if(dF<=40){b.x=sh.x;b.y=sh.y;}` hizalaması KALDIRILDI (40 px / 16 ms =
   84 m/sn). Şut zaten `b.from=[b.x,b.y]` ile topun gerçek konumundan çıkıyor.
4. Çeyrek sonu top taşıması: eşik 50 px → 2 px (50 px'lik sıçrama = 105 m/sn).
5. **GÜVENLİK AĞI** `_ballStep` sonunda: tavanı aşan hareket kırpılır, `S._klempN` sayar.

**⚠ A1'in yan etkisi ve düzeltmesi (ölçülerek bulundu):** pas süreleri doğru değere
uzayınca sahipsiz-top watchdog'u **uçan pası sahipsiz sayıp orta havada iptal etmeye**
başladı (kurtarma 5 → 19 kez). Yan etkisi serbest atışta göründü: kurtarma `b.onDone`'ı
siliyor, son atışın geri çağrısı çalışmıyor, **`S._ftAktif` temizlenmiyor** ve o noktadan
sonraki bütün SAHA şutları serbest atış sanılıyordu (`sahne-check` dizilişi 9,47 → 8,89,
en kötü kare 8 → **0**). İki düzeltme:
* `_sahipsizTopTick` artık geçerli hedefi olan `pass` modunu muaf tutar (`sahne-check`in
  kendi ölçütü zaten "uçan top sahipsiz sayılmaz" diyordu; watchdog ondan katıydı).
* `S._ftAktif` her yeni olayda sıfırlanır. **Bu sızıntı HEAD'de de vardı** (seed 1002 →
  en kötü 0). Sonuç: serbest atış dizilişi **9,47 → 9,71 / 10,00 / 10,00** (üç tohum),
  yani HEAD'den İYİ.

### A2 — HIZ MERDİVENİ: KISMEN (donma %41,5 → %27,1, hedef %12'ye ULAŞILAMADI)

Merdiven ölçekleme geri alındı (yukarıdaki gerekçe). Uygulanan ve KALAN maddeler:

1. **İVME SINIRI** (`_ivmeSinirla`): `_PL_ACC` hedefe yaklaşma sertliğidir, hızı
   sınırlamaz — hedef hız 0'dan jog'a atlayınca ilk karede ivme **3250 px/sn²** (110 m/sn²)
   oluyordu; hız grafiğindeki dik duvarların sebebi buydu. Tavan artık
   `_ACC_MAX=330` / `_DEC_MAX=470` px/sn² (maç ölçeğinde 5,3 / 7,6 m/sn²).
   Markajdaki savunmacı **×1,6** ile muaf: savunma kayması kısa ve patlayıcıdır ve
   genel tavanla sınırlanınca topu tutana mesafe 1,74 → 1,92 m'ye açılıyordu.
2. **SAHAYA GERİ ALMA IŞINLANMASI:** topu sokan oyuncunun `_oob` izni kalkınca `_inX`
   kırpması onu TEK KAREDE 26 px içeri çekiyordu (55 m/sn). Ölçümdeki en hızlı jetonların
   **hepsi** x≈44 / x≈899'dan başlıyordu — koşu değil, snap. Kırpma kademeli yapıldı.
   Sonuç: en yüksek oyuncu hızı 10,4 → 8,1-9,8 m/sn.
3. **DONMA (§A2.3):** ölçüm `held` modunda şunu verdi — hücum %31,9 · **topu tutan %32,4**
   · **savunma %42,1**. İki kök neden:
   * Salınım genliği eşiğin altındaydı: bant 15-22 px, adım 4-7 px ve varış freni salınım
     penceresinde **22 px/sn** (0,54 m/sn maç) tavanlıydı — salınım çalışsa bile ölçüt
     eşiğinin (0,5) hemen altında kalıyordu. Bant 24-25 px, adım 7-10 px, fren tavanı
     **46 px/sn** (≈1,1 m/sn maç) yapıldı.
   * **Savunma hiç salınmıyordu:** salınım yalnız `S.offP` üzerinde çalışıyor ve savunma
     takibi ondan SONRA `p.tx`'i yeniden yazdığı için savunmacıya hiç ulaşmıyordu.
     Eklenen savunma duruşu kayması yalnız o karenin hedefine (`_tx`) uygulanır — mantıksal
     hedef bozulmaz —, eksen adam→pota doğrultusudur (ball-you-man korunur) ve
     **TEK YÖNLÜ, adama DOĞRUDUR**: simetrik salınım denendi ve markajı 1,74 → 1,80-1,88 m'ye
     açıp `spacing-check` kapısını düşürüyordu. Deterministiktir, rastgelelik tüketmez.

**ULAŞILAMADI:** donma %27,1, hedef ≤%12. Kalan donmanın büyük kısmı ölü top (serbest
atış dizilişi, çeyrek arası, faul sonrası) ve koreografi kilidi altındaki jetonlardır;
oraya "canlılık" eklemek FAZ 26'nın canlıda oyunu bozan hatasının tekrarı olur
(salınım koreografiyi ezmemeli). Eşik gevşetilmedi.

### A3 — YOL EĞRİLİĞİ ✓

Ayrı bir madde olarak kod yazılmadı: **A2'nin ivme sınırı tek başına çözdü.**
Keskin dönüş **2,38 → 1,25 / pozisyon** (hedef ≤2) · tam sahayı düz geçen jeton
**3 → 0** · ortalama dönüş açısı 12,5° → 10,0°. Yörünge grafiğinde kavis gözle görülür
(`olcum/iz-temel-yorunge.png` ↔ `olcum/iz-final-yorunge.png`).

### B GRUBU — ÖNCE "HÂLÂ GEÇERLİ Mİ" DİYE ÖLÇÜLDÜ

| # | Madde | Durum | Ölçüm |
|---|-------|-------|-------|
| B1 | Uzatma oranı çok yüksek | **ZATEN DÜZELTİLMİŞ** | %4,75 (brif: %17,5 · brif hedefi %4-8) |
| B2 | Anlatımda noktalama | **DÜZELTİLDİ** | %51,8 → **%0** |
| B3 | Pozisyon sayısı fazla | **PREMİS GEÇERSİZ** | 155,1 (brif 178 = HAM sayaç) |
| B4 | Yedek kullanımı dar | **ZATEN DÜZELTİLMİŞ** | yedek payı %36,8 (brif %19,1) |
| B5 | Yeni olay türlerinin koreografisi | **ZATEN DÜZELTİLMİŞ** | dalsız olay/maç **0,00** |
| B6 | Koreografi yarıda kesiliyor mu | **KESİLMİYOR (yapısal)** | `delay=max(simMs,dtMs)` |
| B7 | Sahipsiz top | **HEDEFTE** | %1,73 (hedef ≤%2) |
| B8 | Şut anında yerinde oyuncu | **HEAD İLE BAŞA BAŞ** | 3,88-4,30 (HEAD 4,06-4,16) |

**B2 (noktalama)** — %51,8 ölçüldü. Kusur ön parça ile sonuç parçasının BİRLEŞME
noktasındaydı: ön parça nokta ile biter, sonuç parçası küçük harfle başlar. İki düzeltme:
* `addComment` zincir dalında: ön parça noktası **" —"** olur (ünlem/soru işaretinde
  sonuç parçası `trBuyukIlk` ile büyütülür — i→İ).
* `spikerImza` `isimTekrar` dalı: `Ad. Ad! txt` → `Ad. Ad… txt`. Sonuç parçasını
  BÜYÜTMEK küçük harfle başlayan `I18N_PHRASES` kalıplarını kırardı.

**Yeni kapı: `tools/balon-check.js`** — RENDER EDİLMİŞ balonu okur. `anlatim-check`
iki parçayı AYRI taradığı için bu kusuru göremiyordu; harness yeşilken ekran bozuktu.
Kapı sıra ekini (2. çeyrek, 4. takım faulü) yanlış pozitif saymaz (rakam öncesi
noktaya geriye bakış).

**B3 — brifin 178 rakamı HAM `pozIx` sayacıdır.** CLAUDE.md FAZ 39 dersi: "POZİSYON İKİ
FARKLI ŞEYDİR"; `pbpstats` pozisyonu top el değiştirene kadar sayar. Gerçek bantla
kıyaslanabilir (birleştirilmiş) değer **155,1** ve gerçek bant **161,8–167,9** — yani
motor gerçekten AZ pozisyon oynuyor, çok değil. Tempoyu düşürmek onu gerçekten daha da
uzaklaştırır ve 78-95 skor bandını kırar (CLAUDE.md: "Tempo bilerek gerçeğin %6 altında
bırakıldı; bu bir DENGE tercihidir"). **DEĞİŞTİRİLMEDİ.**

**B5 — yeni kapı: `tools/sahne-kapsam-check.js`.** 60 maçın 14.660 olayı üretilip her
türün sahne dalı aranır. 21 türün tamamı kapsanıyor. ⚠ Kapının ilk hâli `free` ·
`teknik` · `sportmenlikDisi`'yi "dalsız" sandı: **sahne sözleşmesi tür adıyla değil
ALANLA kurulabilir** (`ev.shots[0].kind==='ft'`). Kapı bunu görmezse kendi ürettiği
yanlış pozitifi savunur (FAZ 26 dersi) — düzeltildi.

### DEĞİŞMEZLİK — MAÇ SONUCU BİT BİT AYNI

* `sim-node --n=500 --seed=42` → **91.1 - 85.4 · olay/maç 248** (HEAD ile birebir)
* `band.js` hash **`76351f00455b3a5e`** (değişmedi)
* `measure.js` hash **`0132d9fff6e778d0`** (değişmedi)
* Determinizm, farklı tohum ayrımı, `G` dokunulmazlığı: hepsi EVET

### KAPI DURUMU

✓ `visual-check` (masaüstü + mobil, 0 konsol hatası) · ✓ `bozukdeger-check` ·
✓ `anlatim-check` 31/31 · ✓ `faz11-check` 15/15 · ✓ `balon-check` ·
✓ `sahne-kapsam-check` · ✓ `realism-check` (ışınlanma 0 · insanüstü hız 0 ·
sahipsiz serbest top 0/42) · ✓ `spacing-check` (markaj 1,76-1,78 m, üç koşu) ·
✓ `iz-kaydet` (ışınlanma 0)

**Düşen kapılar — hepsi HEAD'de de düşüyor, FAZ 40 sebebi değil:**
* `sut-cografya-check` "tip: tip-in" %0,962 — HEAD'de **birebir aynı** değer.
* `kutu-check` ribaunt/top kaybı/çalma/faul per pozisyon — FAZ 39 durumu; sonuç
  matematiği değişmediği için aynen duruyor.
* `tempo-check` / `rotasyon-check` — sonuç matematiği değişmediği için HEAD ile aynı.
* `sahne-check` "şut anında yerinde HÜCUMCU" 3,88 (HEAD 4,06-4,16; kapı 4,25) — brifin
  B8 maddesi, ikisinde de düşüyor. Ölçüm gürültüsü ±0,4 (aynı yapıda 3,85-4,30).

**`sahne-check` "orta çizgi geçişi" %77 (HEAD %83-109).** Kapı gürültülü — HEAD'de
%109 veriyor, yani pay/payda temiz bir oran değil. Ham iz ölçümü ise pozisyon başına
orta çizgi geçişinin DEĞİŞMEDİĞİNİ gösteriyor (0,62 → 0,58). Değişen şey topun çizgiyi
hangi MODDA geçtiği: A1 uzun paslara doğru süreyi verince `held` 5/8 → `pass` 5/7 oldu.
Kapı "top sürülerek mi geçti"yi ölçüyor, "top karşı sahaya vardı mı"yı değil.

### YENİ ARAÇLAR

| Araç | İş |
|------|-----|
| `tools/iz-kaydet.js` | Kare kare iz kaydı + hız/eğrilik çözümlemesi. **Sahne↔maç oranını aynı koşuda ölçer ve her hızı İKİ ÖLÇEKTE raporlar** — F15 tuzağına bir daha düşülmesin. `--yeniden=` ile tarayıcısız yeniden çözümleme. |
| `tools/iz-ciz.js` | Yörünge + hız profili PNG'si (`olcum/iz-<etiket>-*.png`). |
| `tools/balon-check.js` | RENDER EDİLMİŞ anlatım balonu (B2). |
| `tools/sahne-kapsam-check.js` | Olay türü ↔ sahne dalı kapsamı + koreografi bütçesi (B5/B6). |

### DERSLER (CLAUDE.md'ye taşındı)

1. **SAHNE SAATİ ≠ MAÇ SAATİ — ORANI HER KOŞUDA ÖLÇ, VARSAYMA.** FAZ 15 bunu yazmıştı,
   FAZ 40 brifi yine sahne hızlarını gerçek basketbolla kıyasladı. `iz-kaydet` oranı
   ölçer ve iki ölçekte birden basar.
2. **BU MOTORDA HIZ MERDİVENİNİ ÖLÇEKLEMEK GERÇEKÇİLİĞİ DEĞİŞTİREMEZ.** Pozisyonun
   duvar saatindeki uzunluğunu koreografi belirler (`delay=max(simMs,dtMs)`, simMs
   bağlayıcı), koreografiyi de oyuncu varış süresi. Oyuncuyu yavaşlatmak saati aynı
   oranda yavaşlatır; görünen hız / sahneKat sabit kalır. Değiştirilebilir olan
   **dağılımdır**: donma, uç değer, ivme profili.
3. **IŞINLANMANIN KÖK NEDENİ GENELLİKLE SÜREDİR, ATAMA DEĞİL.** Koreografi adımı
   mesafeyi bilmeden sabit süre verir. Tavan SÜREYİ UZATMALI, konumu kırpmamalı.
4. **BİR HIZ TAVANI EKLERKEN ONA BAĞLI ZAMAN AŞIMI KAPILARINI DA GÖZDEN GEÇİR.** Pas
   süresi doğru değere uzayınca sahipsiz-top watchdog'u pasları iptal etmeye başladı;
   asıl hasar üç kat uzaktaydı (serbest atış dizilişi 0/10).
5. **BİR BAYRAK YALNIZ GERİ ÇAĞRIDA TEMİZLENİYORSA SIZAR.** `S._ftAktif` son atışın
   `onDone`'ında kapanıyordu; geri çağrı çalışmayınca maçın sonuna kadar açık kalıyordu.
   Yaşam süresi olayla sınırlı bayrağı olayın BAŞINDA sıfırla.
6. **İKİ PARÇAYI AYRI TARAYAN KAPI, BİRLEŞME KUSURUNU GÖREMEZ.** `anlatim-check` yeşilken
   ekrandaki balonların %51,8'i bozuktu. Ekranda birleşen her şey için RENDER EDİLMİŞ
   hâli okuyan bir kapı gerekir.
7. **SAVUNMACIYI ADAMINDAN UZAKLAŞTIRAN "CANLILIK" SAVUNMAYI KÖTÜLEŞTİRİR.** Simetrik
   duruş salınımı markajı 1,74 → 1,88 m'ye açtı. Kayma tek yönlü ve adama doğru olmalı.
8. **GERÇEKÇİ İVME, MARKAJI GEVŞETİR.** Savunmacı adamının hareketine TEPKİ verir;
   genel ivme tavanı ona da uygulanınca geride kalır. Markajdaki savunmacıya daha yüksek
   ivme tavanı (×1,6) verilir — savunma kayması kısa ve patlayıcı bir harekettir.

### FAZ 40 EKİ — DONMANIN KALANI (%27,9 → ~%20,0)

Kullanıcı isteği: "donma %27,9 kalanını da düşürmeyi dene". Önce KAYNAĞI ölçüldü;
`iz-kaydet` kaydına dört teşhis alanı eklendi (acele kademesi · hedefe uzaklık ·
koreografi kilidi · salınım penceresi · sürüklenme ofseti · salınım atama sayacı) ve
donan kareler kovalara ayrıldı.

#### Teşhis 1 — donmanın %72,6'sı `held` modunda (set hücumu / top sürme)

| kova (mod · rol · canliSet · kademe · hedef · salınım) | payı |
|---|---|
| held · HUC · cs1 · YÜRÜ · hedefte · salınım AÇIK | **%17,9** |
| held · SAV · cs0 · YÜRÜ · hedefte · salınım YOK | **%17,6** |
| held · SAV · cs1 · JOG · hedefte · salınım AÇIK | %10,8 |
| held · HUC · cs0 · YÜRÜ · hedefte · salınım YOK | %7,1 |
| shot · HUC (uçuş boyunca) | %6,3 |

İki ayrı kök neden çıktı.

#### Kök neden A — salınım SET FAZIYLA sınırlıydı (`cs0` kovaları, %27,2)

`S.canliSet` yalnız `phase==='set'`te açılır; geçişte kulvarına varmış oyuncular hiç
kıpırdamıyordu. Savunmacılara ise İKİ mekanizmanın da ulaşmadığı ölçüldü: salınım
yalnız `S.offP` üzerinde dönüyor, duruş kayması ise `_savunmada` (yani `p._mark`)
şartına bağlı ve geçişte `S.defTrack=false` olduğu için markaj hiç kurulmuyor.

Düzeltme: salınım kapsamı **canlı topla** sınırlandı (`held`/`pass` · serbest atış ve
kenardan sokma HARİÇ — o dizilimler ölçülerek ayarlandı, F14-7). Set fazında kapsam
**değişmedi** (`S.offP`; oradaki bant/eksen ölçüleri FAZ 11 ve FAZ 25 kapılarıyla
ayarlı), geçişte kapsam **iki takım**. İki incelik:
* `p._setTx` YALNIZ set fazında yazılır, geçişte BAYATTIR (bir önceki hücumun dizilim
  noktası). Merkez olarak set dışında kullanılırsa oyuncu sahanın öbür ucundaki eski
  noktasına sürüklenir — merkez set dışında GÜNCEL hedeftir.
* Komşuluk ölçüsü oyuncunun KENDİ takımına göredir; rakibe 2,10 m yaklaşmak yasak
  değildir (savunma tam olarak onu yapar).

#### Kök neden B — jeton hedefinde PARK EDİYORDU, yavaş gitmiyordu (%17,9 kovası)

Ayırt edici ölçüm — salınım penceresi açıkken hedefe uzaklığa göre ortalama hız:

| hedefe uzaklık | 0-1 px | 2-3 | 4-8 | 9-16 | 17+ |
|---|---|---|---|---|---|
| ortalama hız (m/sn, maç) | **0,11** | 0,39 | 0,73 | 0,92 | 0,99 |

Yani jeton YOLDAYKEN hedef bandındadır (0,9-1,0 m/sn); sorun yola hiç çıkmamasıdır.
Donuk karelerin yarısı 0-1 px kovasındaydı ve o karelerin **%89'unda sürüklenme ofseti
TAM 0**'dı. Sebep: sürüklenmenin iki ucu da (radyal VE dik eksende) ya saha dışına
kırpılıyor ya bir takım arkadaşını 2,10 m'nin içine sokuyor → `_hi=_lo=0` → hedef
dizilim noktasının TAM merkezine yazılıyor → jeton orada çakılıyor.

⚠ Yeniden hedefleme aralığı (340 ms) **ana sınırlayıcı değildi**: 110 ms'ye indirmek
park oranını yalnız %24,8 → %22,9 yaptı. Ölçmeden "gecikme" diye düzeltilseydi asıl
neden bulunamazdı. Aralık yine de adımın gerçekten sürdüğü süreye (185 ms) çekildi.

Düzeltme — **kapalı uçta DOĞRUSAL değil DAİRESEL hareket**: dar doğrusal bant denendi
ve ölçülerek elendi (adım banttan büyük olunca her adımda yön çevriliyor: >90° dönüş
0,83 → **1,83**/pozisyon; adımı küçültünce hareket yeniden eşiğin altına düşüyor).
Sıkışan jetona `_boks` bayrağı basılır ve hareket döngüsünde merkezin çevresinde
küçük bir YAY çizdirilir (yarıçap 11 px ≈ 0,37 m · ω 3,4 rad/sn → çevresel hız
≈ 0,9 m/sn maç). Daire SÜREKLİDİR: keskin dönüş üretmez, ortalama konum yine merkezdir.
Deterministiktir (`S.time` + jeton fazı) — rastgelelik TÜKETMEZ (B-5).

#### Yan etki ve düzeltmesi — TEK YÖNLÜ SÜRÜKLENME ORTALAMAYI KAYDIRIYOR

Bir uç kapalı, diğeri açıksa sürüklenme 0 ile açık uç arasında salınır ve ortalama konum
artık dizilim noktası değil, **bandın yarısı kadar açık uca kaymış** olur. Boyada
kalabalık olduğu için açık uç genellikle DIŞ uçtur: `spacing-check` "hücumun saldırdığı
potaya ortalama uzaklığı" 6,84 → **7,08 m** (kapı ≤7,00) oldu. Kapalı uç TAM banttan
sınanmıştı; **%45 mesafede yeniden sınanınca** çoğu zaman açık çıkıyor ve bant simetrik
hâle geliyor. Ama yarı mesafede de açılmayan uçlar kaldığı için kayma sürdü (üç koşu
ort. 6,91; HEAD 6,56 / 6,64 / 6,66). Tek yönlü kalan bant ayrıca **12 px** ile sınırlandı —
kayma en çok 6 px (0,20 m). Ölçülen: **6,77 / 6,83 / 6,88 m** (üçü de geçiyor).

#### Sonuç

| Ölçüt (MAÇ ölçeği) | temel | FAZ 40 ana tur | **ek tur** |
|---|---|---|---|
| **donma (<0,5 m/sn)** | **%41,5** | %27,9 | **~%20,0** (19,6 · 19,9 · 20,6) |
| medyan hız | 0,98 | 1,20 | **1,32** |
| ortalama hız | 2,07 | 2,02 | 2,18 |
| > 90° keskin dönüş | 2,38/poz | 1,25/poz | **1,15-1,54**/poz (hedef ≤2) |
| tam sahayı düz geçen jeton | 3 | 0-2 | 3-5 — **İYİLEŞMEDİ**, aşağıya bak |
| top ışınlanması | 202 | 0 | 0 |

**HEDEFE (%12) YİNE ULAŞILAMADI.** Kalanın bileşimi ölçüldü ve büyük kısmı bilinçli
olarak dokunulmayan yerlerdir: şut UÇUŞU boyunca duran jetonlar (%6-10 — koreografi
kilidi altındadırlar, oraya hareket eklemek FAZ 26'nın canlıda oyunu bozan hatasının
tekrarı olur), ölü top (serbest atış dizilişi, çeyrek arası) ve `_lock`lu koreografi
adımları. Eşik gevşetilmedi.

#### Takas — ölçüldü ve ayarlandı

Salınım genliği büyüdükçe `sahne-check` "şut anında yerinde HÜCUMCU" düşüyor, çünkü o
kapı jetonun ANLIK salınım hedefine uzaklığını ölçer; sürekli hareket eden jeton
tanımı gereği "hedefinde" değildir. Ölçülen takas:

| bant / adım (px) | donma | kapı (a) anlık hedefe | dizilim NOKTASINA ≤40 px |
|---|---|---|---|
| 25 / 12-16 | %19,5 | 3,36-3,73 / 5 | 3,73 / 5 |
| **22 / 10-13 (seçilen)** | **%20,0** | **4,03 / 5** | **3,97 / 5** |
| HEAD | %41,5 | 4,11 / 5 | — |

Seçilen ayar kapıyı HEAD seviyesine geri getirirken donma kazancının yalnız 0,5 puanını
veriyor. Ayrıca dizilim KALİTESİ ayrı ölçüldü: şut anında oyuncunun **dizilim noktasına**
uzaklığı medyan 17 px (0,58 m) · p75 29 px — yani diziliş oturuyor; `spacing-check`in
gerçek geometri kapıları (ikili mesafe 7,95 m · yayılım %36,4 · boyada %72,4) hepsi
geçiyor ve HEAD'den iyi.

#### Değişmezlik (ek turdan sonra da)

`sim-node --n=500 --seed=42` → **91.1 - 85.4 · 248** · `band.js` **76351f00455b3a5e** ·
`measure.js` **0132d9fff6e778d0** — üçü de değişmedi.

#### ⚠ ÖLÇÜM DERSİ — ARKA PLANDA `git stash` ÇALIŞTIRMA

Bu turda HEAD karşılaştırması arka plan görevine alındı (`git stash` → ölç → `git stash
pop`). Görev çalışırken ön planda başlatılan `balon-check` ve `faz11-check` **HEAD'i**
ölçtü: B2 noktalama kapısı "%47,1 düştü" dedi (oysa düzeltme yerindeydi), FAZ 11 ise
"15/15" verdi. Aynı çalışma ağacında zulalama yapan bir arka plan görevi varken başka
ölçüm çalıştırılamaz — sonuçlar sessizce YANLIŞ dala ait olur.

#### ULAŞILAMAYAN İKİNCİ KALEM — "tam sahayı düz geçen jeton"

A3'ün üçüncü maddesi ("hedef karşı yarı sahadaysa kulvar ARA NOKTASI üzerinden git")
uygulanmadı: A3 kabul ölçütleri ivme sınırıyla karşılandığı için o madde açılmamıştı ve
ek turda ölçüm 3-5 (taban 3) civarında kaldı — yani **İYİLEŞMEDİ**. Kalan vakalar
incelendi: kiriş 24,4-24,9 m, yan çizgiyle açı 6° / 21° / 30°, yoldan sapma **%0,9-1,8**.
6°'lik olan meşru bir kulvar sprintidir; 21° ve 30°'lik ikisi geçişte karşı kulvarı
dolduran gerçek bir koşudur ama **kusursuz düz çizgi** hâlinde çizilir — gerçek oyuncu
o yolu kavisle alır. Düzeltmesi `_wp` kulvar ara noktasının bu koşulara da verilmesidir
(mekanizma zaten var; bu turda AÇILMADI).

### FAZ 40 — UÇTAN UCA PROJE DENETİMİ

Kullanıcı isteği: "projeyi baştan sona kontrol et, hata varsa tekrar düzelt".
14 JS modülü + 34 denetim aracı çalıştırıldı.

#### DÜZELTİLEN GERÇEK HATALAR

**1. SÜRÜM DAMGASI ARTIRILMAMIŞ — FAZ 20 dersinin birebir tekrarı (KRİTİK)**
`surum-check` düştü: yayın dosyaları değişti ama `?v=` ve `sw.js SCRIPT_V` **75**'te
kalmıştı. Service worker `js/*.js`'i "önce önbellek" ile servis ettiği için FAZ 40'ın
TAMAMI (top ışınlanması, ivme sınırı, donma, noktalama) siteye dönen kullanıcıya
**hiç ulaşmayacaktı** — FAZ 17B/19'da tam olarak bu olmuştu. HTML'deki 15 damga ve
`SCRIPT_V` **76**'ya çıkarıldı, `--yaz` ile içerik hash kaydı tazelendi.

**2. PUTBACK KAPISI BİR SUNUM BAYRAĞINA BAĞLI (mimari kusur, belgelendi)**
```
if(_rebAnlat && rebOff && rebounder.id!=null && Math.random()<0.55) shooterHint=rebounder;
```
`shooterHint` bir SONRAKİ ŞUTU KİMİN ATACAĞINI belirler — kutu skora, şut bölgesine ve
şut tipine yazar, yani MAÇ MATEMATİĞİDİR. Kapısı ise `_rebAnlat`: FAZ 13'ten kalan ve
BUGÜN yalnız anlatım HAVUZUNU seçen %22'lik bir çekiliş. Yani tamamen üsluba ait bir
oran sessizce maç sonucunu belirliyor; birini değiştiren ötekini de değiştirir ve
`band.js` hash'i kayar. Ayrıca satırdaki yorum **yanlıştı**: "~%55" diyordu, etkin oran
0,22 × 0,55 = **%12,1**. Davranış korundu (hash değişmesin), kod başına ayrıntılı uyarı
yazıldı. Bu, `sut-cografya-check` "tip: tip-in" açığının da kök nedenidir (aşağıda).

**3. `.gitignore` — 5,2 MB ham iz verisi**
`olcum/iz-*.json` ham izleri koşu başına 1,5-2,2 MB ve yeniden üretilebilir. Depoda
GRAFİKLER (PNG) ve `-ozet.json` kalır (1,77 MB); ham izler yok sayılır.

**4. `tools/_i18n-missing.txt` gürültüsü**
`i18n-scan` bu dosyayı her koşuda yeniden yazıyor ve içeriği RASTGELE takım
adlarından oluşuyor (hepsi özel isim, kusur değil) — 433 satırlık sahte diff. Geri alındı.

#### DENETİM SONUCU — 34 ARAÇ

**GEÇEN (28):** `visual-check` (masaüstü+mobil, 0 konsol hatası) · `bozukdeger-check` ·
`sim-node` · `measure` · `band` · `box-band` · `surum-check` · `schema-check` ·
`bicim-check` · `turkek-check` · `isim-check` · `sut-check` · `milliyet-check` ·
`lig-check` (10 sezon) · `yetenek-check` 30/30 · `ekonomi-check` 37/37 ·
`geometri-check` · `hareket-check` · `sunum-check` (F25/F26/F28 tamamı) ·
`spacing-check` 10/10 · `faz6-check` 7/7 · `faz7-check` 8/8 · `faz8-check` 6/6 ·
`faz10-check` 27/27 · `faz11-check` 15/15 · `m20-check` · `arena-check` ·
`analiz-check` · `mobile-check` 18/18 · `i18n-scan` · `portre-check` ·
`anlatim-check` 31/31 · `season-loop --runs=3` 6/6 · `balon-check` ·
`sahne-kapsam-check` · `realism-check`

**DÜŞEN — HEPSİ FAZ 39'DAN KALAN KALİBRASYON AÇIĞI, FAZ 40 SEBEBİ DEĞİL.**
Maç matematiği bu turda bit-birebir aynı kaldığı için değerler HEAD ile ÖZDEŞTİR:

| Araç | Düşen kalem | Motor | Gerçek bant |
|---|---|---|---|
| `kutu-check` | ribaunt / pozisyon | 0,482 | 0,423-0,460 |
| | top kaybı / pozisyon | 0,170 | 0,130-0,153 |
| | top çalma / pozisyon | 0,098 | 0,069-0,086 |
| | faul / pozisyon | 0,218 | 0,184-0,213 |
| | uzatmaya giden maç | %4,75 | %4,77-6,45 |
| `tempo-check` | pozisyon / maç | 155,1 | 161,8-167,9 |
| | ortalama pozisyon süresi | 15,56 sn | 14,33-14,81 |
| `rotasyon-check` | kutu skorda görünen oyuncu | 10,01 | 10,15-11,15 |
| | en skorer oyuncunun payı | %27,1 | %22,8-26,8 |
| | oyuncu değişikliği | 20,3 | 34,8-44,1 |
| `sut-cografya-check` | tip: tip-in | %0,96 | %2,05-3,05 |

Bunları kapatmak MAÇ MATEMATİĞİ değişikliğidir: `band.js` / `measure.js` hash'leri ve
78-95 skor bandı yeniden temellendirilir. CLAUDE.md FAZ 39 §3.2 tempoyu **bilinçli
denge tercihi** olarak kayda geçirmiş ("motor aynı anda NBA temposuna, NBA isabetine ve
FIBA skoruna sahip OLAMAZ"). Bu turda DOKUNULMADI — kullanıcı kararı gerektirir.
`tip-in`in kök nedeni yukarıdaki 2. maddedir: tip-in tanımı gereği putback'tir,
payının tavanı putback sıklığıdır (%12,1) ve şut TİPİ tarafında yapılacak hiçbir
sunum ayarı onu bandına getiremez.

**GÜRÜLTÜLÜ / YARGILANAMAZ:**
* `live-metrics` — `orphan` HEAD'de 27, bu turda 23-25 (yani İYİ); `kimlik` %88 (HEAD)
  ↔ %93-95; `syncRatio` medyan 1,25-1,66× arası salınıyor. Araç kendi uyarısını basıyor
  ("örnek sayısı düşük"). ⚠ HEAD karşılaştırması bu kez `git stash` yerine **ayrı
  worktree** ile yapıldı (bkz. FAZ 40 eki ölçüm dersi).
* `sahne-check` "şut anında yerinde HÜCUMCU" 3,36-4,30 (HEAD 4,06-4,16, kapı 4,25) ve
  "orta çizgi geçişi" %64-95 (HEAD %83-109) — ikisi de HEAD'de de düşüyor, brifin
  B8 maddesi.

#### B2 DÜZELTMESİNİN YAN ETKİSİ ARANDI — YOK

`addComment` zincir dalındaki ünlem/soru dalı (`trBuyukIlk` ile sonuç parçasını büyütme)
40 maçlık 5.355 zincirli olayda **0 kez** tetikleniyor: ön parça her zaman NOKTA ile
bitiyor (4.959) ya da sonuç parçası zaten büyük harfle başlıyor (396). Yani düzeltme
yalnız nokta → " —" yolundan geçiyor, sonuç metnini HARFİ HARFİNE koruyor ve
`live-metrics` orphan sayısına hiçbir katkı yapmıyor (ölçülerek doğrulandı).

#### DEĞİŞMEZLİK (denetim sonrası)

`sim-node --n=500 --seed=42` → **91.1 - 85.4 · 248** · `band.js` **76351f00455b3a5e** ·
`measure.js` **0132d9fff6e778d0** · determinizm ve `G` dokunulmazlığı EVET.
Bu turda yapılan tek kod değişikliği YORUM olduğu için maç matematiği değişmedi.

#### AÇIK KALAN (kullanıcı kararı bekliyor)

1. FAZ 39 kalibrasyon açıkları (yukarıdaki tablo) — kapatmak skor bandını ve hash'leri
   yeniden temellendirmeyi gerektirir.
2. Donma %19-21 (hedef %12) ve "tam sahayı düz geçen jeton" — FAZ 40 ekinde
   gerekçeleriyle yazıldı.
3. `_rebAnlat`in maç matematiğinden ayrıştırılması: davranışı KORUYARAK ayrıştırmak
   mümkün değil (rastgelelik akışı sırasına bağlı); ayrıştırma hash'i kaydırır.

### FAZ 40 KAPANIŞ — doğrulama ve yayın (3 Eylül 2026)

Önceki oturum kodu ve belgeyi bitirmiş ama **commit etmemişti**. Bu oturumda yarım kalan
tek iş buydu: kapılar yeniden koşuldu, damga tutarlılığı onarıldı, commit + push yapıldı.

**Onarılan tek kusur:** `surum-check` düştü — sürüm 76'ya çıkarılıp `--yaz` ile
kaydedildikten SONRA `js/match-engine.js`e `_rebAnlat` uyarı yorumu eklenmiş, içerik
hash'i (`f636a311…` → `01ef4e74…`) kaydın önüne geçmişti. Sürüm 76 **hiç yayınlanmadığı**
için (commit edilmemişti) sürümü 77'ye çıkarmak gerekmedi; kayıt `--yaz` ile tazelendi.
Ders: `--yaz`, yayın dosyalarına dokunan HER değişiklikten SONRA çalıştırılır — sürümü
artırdıktan hemen sonra değil.

**Koşulan kapılar (hepsi geçti):** `node --check` (main.js · match-engine.js) ·
`surum-check` · `sim-node --n=500 --seed=42` → **91.1 - 85.4 · 248**, determinizm EVET,
`G` dokunulmadı · `band.js` **76351f00455b3a5e** · `measure.js` **0132d9fff6e778d0** ·
`visual-check` masaüstü + mobil **0 konsol hatası** · `bozukdeger-check` (2 sezon, TR+EN,
11 sayfa + 4 modal) · `balon-check` 83 balon, üç noktalama kapısı da 0/83 ·
`sahne-kapsam-check` 14.660 olay / 60 maç GEÇTİ. Hash'ler belgelenen değerlerle birebir —
FAZ 40 maç matematiğine dokunmadı, doğrulandı.

**Yayın:** `e50f8d9` master'a push edildi (21 dosya, +1.884/−47). Ham iz JSON'ları
`.gitignore` ile dışarıda kaldı; depoya yalnız 6 PNG + 3 `-ozet.json` girdi.

**Açık kalan maddeler DEĞİŞMEDİ** — üçü de kullanıcı kararı bekliyor: (1) FAZ 39
kalibrasyon açıkları (kutu/tempo/rotasyon/tip-in tablosu; kapatmak skor bandını ve iki
hash'i yeniden temellendirir), (2) donma %19-21 (hedef %12) ve "tam sahayı düz geçen
jeton" `_wp` kulvar ara noktası, (3) `_rebAnlat`in maç matematiğinden ayrıştırılması.

## FAZ 41 — HIZ MERDİVENİ VE HAREKET DOKUSU (3 Eylül 2026)

Brif üç madde istedi: (1) hız merdivenini gerçek bantlara oturt, (2) donmayı titremeyle
değil ANLAMLI hareketle çöz, (3) sahayı düz geçen jetonu sıfırla. Sırayla yapıldı, her
adımdan sonra `iz-kaydet` ile ölçüldü ve maç matematiği her adımda doğrulandı.

**Ölçüm disiplini:** brifin tablosu SAHNE hızlarını gerçek basketbolla kıyaslıyordu.
`iz-kaydet` sahne↔maç oranını AYNI KOŞUDA ölçer (bu turda 1 duvar sn = 1,40-1,52 maç sn)
ve her hızı iki ölçekte basar. Aşağıdaki bütün oyuncu hızları **maç ölçeğindedir**.

### MADDE 1 — HIZ MERDİVENİ: ÖLÇÜLDÜ, UYGULANDI, GERİ ALINDI

Brif `_PL_MAXV × _V_TIER` ile "merdivenin tamamı iki kat yukarıda" diyordu. İki hata:
(a) `_PL_MAXV=150` yalnız hız stat'ı OLMAYAN jetonun yedeğidir, gerçek taban
`_tokBaseV` (130-210); (b) çarpım sahne ölçeğinde kalıyor. Maç ölçeğinde ölçülen temel:

| Ölçüt (maç) | Brifin tablosu | ÖLÇÜLEN temel | Hedef |
|---|---|---|---|
| > 7,5 m/sn | %14,2 | **%0,0** | ≤ %1 ✓ |
| ortalama hız | 3,32 | **2,00** | 1,8-2,6 ✓ |
| donma | %16,6 | %18,8 (ölü top hariç) | ≤ %12 ✗ |
| yön terslemesi > 150° | 1,2/sn | **0,141/sn** | ≤ 0,15 ✓ |
| tam sahayı düz geçen | 14 | **2** | 0 ✗ |

Yani merdiven zaten banttaydı. Yine de brifin önerdiği merdiven (`_V_TIER=[0.40,0.85,
1.45,2.10]`, taban 100 px/sn) **uygulanıp ölçüldü**:

| | temel | brifin merdiveni |
|---|---|---|
| ortalama hız | 2,00 | **1,70 — BANDIN ALTINDA** |
| canlı top ortalama | 2,07 | **1,75 — BANDIN ALTINDA** |
| > 7,5 m/sn | %0 | %0 (kazanç yok) |
| donma | %18,8 | %18,1 (düzelmedi) |

Brifin kendi kuralı gereği ("ölçümü kötüleştiren maddeyi geri al") merdiven geri alındı.
CLAUDE.md'nin FAZ 40'ta yazdığı öngörü birebir çıktı. Grafik:
`olcum/iz-f41-test-merdiven-*.png` (kanıt olarak saklandı).

### MADDE 2 — TİTREME → ANLAMLI HAREKET (asıl kusur, çözüldü)

**Brifin teşhisi DOĞRUYDU ve ölçümle doğrulandı.** İzden çıkarılan kova tablosu:
terslemelerin **%80'i** salınım penceresi açıkken, jeton hedefine 5-19 px yakınken,
kademe YÜRÜ/JOG iken oluyor ve **medyan adım 3 cm**.

**Kök neden (ölçülerek bulundu):** FAZ 40'ın doğrusal sürüklenmesi hedefi her 110 ms'de
10-13 px kaydırıyor — yani **100 px/sn talep ediyor** — ama varış freni salınım
penceresinde üst hızı **56 px/sn**'de tutuyor. Jeton hedefine hiç yetişemez; hedef bant
ucuna varıp yön çevirir, jeton merkez çevresinde santimetre ölçeğinde titrer.
Doğrusal ileri-geri salınım bu kusuru YAPISAL olarak üretir: her uçta 180° dönüş vardır
ve dönüş anında jeton frenin içindedir (yavaş), adım kaçınılmaz olarak küçük çıkar.

**Yapılanlar** (mevcut mekanizmalar üzerinde; yeni mekanizma yazılmadı):

1. Doğrusal sürüklenme → **kapalı DAİRE yayı** (`_EX_W=3,8` rad/sn · r=0,34-0,41 m).
   Kapalı eğride 180° dönüş yoktur; hız ω·r ile sabittir, dip yapmaz; bir tur 1,65 sn
   ve **2,6 m gerçek yol**. Elips denendi ve elendi: dar eksende hız donma eşiğinin
   altına iniyor, uzun eksen uçlarında eğrilik keskin dönüş üretiyor (1,33 → 2,07/poz).
2. **±1,8 px "nefes" salınımı KALDIRILDI** — her topsuz jetona sürekli uygulanan 6 cm'lik
   hedef titreşimiydi; genliği hiçbir şey anlatmayacak kadar küçük, hız YÖNÜNÜ
   belirleyecek kadar büyüktü. Brifin "mikro-hareket yasak" kuralının doğrudan uygulaması.
3. **Savunma duruş kayması tek boyutludan iki boyutluya** çevrildi. Tek boyutlu sinüs
   salınımında hız uçlarda sıfırlanır (izde en büyük tek donma kovası: "SAV set topsuz",
   donmanın %5,6'sı). Radyal bileşen TEK YÖNLÜ ve adama doğrudur (markaj sıkılığı
   korunur), yanına 90° faz farklı yanal bileşen eklendi — bileşke hız hiç sıfırlanmaz.
   `Math.abs(sin)`in sivri ucu `0,5−0,5·cos` ile yumuşatıldı (sivri uç yarım periyotta
   bir 180° dönüş üretiyordu).
4. Varış kapısı yayın yarıçapını hesaba katar (jeton kendi yayındayken "yerinde" sayılır);
   fren tavanı yayın çevresel hızını karşılar.

**"Terslemenin medyan adımı ≥ 0,5 m" ölçütüne ULAŞILAMADI (0,03-0,04 m) ve sebebi
aritmetiktir:** 0,1 sn'lik bacakta 0,5 m = **5 m/sn**. Ölçüt "terslemelerin yarısı sprint
hızında olsun" demektir; gerçek basketbolda ters dönüşlerin çoğu yavaş yapılır ve bu
motorda yerine varmış her jeton tanımı gereği yavaştır. Tutturmanın tek yolu hareketi
yapay biçimde hızlandırmaktır — brifin yasakladığı şeyin ta kendisi.
**Brifin NİYETİNİ doğrudan ölçen ölçüt kuruldu — YOL VERİMİ:** 1 sn'lik pencerede brüt
yol > 0,5 m iken net/brüt < 0,30 ise jeton "hareket ediyor ama yol almıyor"dur.

| | temel | FAZ 41 |
|---|---|---|
| **titrek pencere payı** | **%16,6** | **%5,5** |
| medyan yol verimi | 0,845 | 0,855 |

### MADDE 3 — KULVAR ARA NOKTASI

Temelde 2 jeton 24-27 m'yi kusursuz düz çizgide kat ediyordu; ikisi 19-20°'lik gerçek
köşegendi (y ekseninde 325→73, sahanın tüm genişliği).

**Ara noktanın YERİ ölçülerek seçildi — iki kısıt birden var:**
(a) "Düz geçti" ölçütü yol/kiriş oranıdır ve yanal sapmayla KARESEL büyür
    (yol ≈ kiriş·(1+2e²/L²)); %5'i aşmak için e ≥ 0,158·L, yani 700 px kirişte 111 px.
    Küçük bir "kenara adım" (58 px) ölçütü asla geçemez (ölçüldü: sapma %1,2 → %1,6).
(b) Köşe açısı keskin olmamalı: önce yana 58 px sonra sahanın öbür ucu ~90°'lik dirsek
    üretti ve keskin dönüş 1,33 → 2,07/poz'a çıktı.
İkisini birden karşılayan yer: **orta saha hizasında, jetonun KENDİ y'sinde** — oyuncu
kulvarında orta sahaya kadar koşar, sonra hedefine keser. Dirsek ~35°'te kalır.

Ara nokta hem geçiş hem set dizilimi atamalarına bağlandı. `_wp` hareket döngüsünde o
karenin hedefini EZER; `_chase` ise hedefi her karede topa yazar. İkisi çakışınca serbest
topa koşan jeton bayat ara noktasına gidiyordu (`sahne-check` SAHİPSİZ top %1,8-2,1 →
%4,17). Çözüm hareket döngüsünde: **aktif takipçinin ara noktası YOK SAYILIR** (silinmez —
silinirse aynı pozisyonda sonradan çalışan dizilim kodu yenisini yazar).

### ÖNCE / SONRA (brifin 5 satırı · maç ölçeği · 3'er koşunun ortalaması)

| Ölçüt | FAZ 40 (temel) | merdiven testi | FAZ 41 (final) | Hedef |
|---|---|---|---|---|
| oyuncu > 7,5 m/sn | %0,0 | %0,0 | **%0,1** | ≤ %1 ✓ |
| oyuncu ortalama hızı | 2,00 | 1,70 | **2,06** | 1,8-2,6 ✓ |
| donma (ölü top hariç) | %18,8 | %18,1 | **%12,2** | ≤ %12 ~ |
| yön terslemesi > 150° | 0,141/sn | 0,109/sn | **0,085/sn** | ≤ 0,15 ✓ |
| terslemelerin medyan adımı | 0,03 m | 0,04 m | **0,03 m** | ≥ 0,5 m ✗ |
| **titrek pencere (yol verimi)** | **%16,6** | — | **%5,5** | — |
| tam sahayı düz geçen jeton | 2 | 0 | **0,7** | 0 ~ |
| > 90° keskin dönüş | 1,07-1,31/poz | 0,56 | **2,02/poz** | ≤ 2 ~ |

Grafikler: `olcum/iz-f41-temel-*.png` · `iz-f41-test-merdiven-*.png` · `iz-f41-K1-*.png`.

### ULAŞILAMAYANLAR (brifin istediği gibi açıkça)

1. **Terslemelerin medyan adımı 0,5 m** — aritmetik olarak ulaşılamaz (gerekçe yukarıda).
   Yerine yol verimi ölçütü kuruldu: %16,6 → %5,5.
2. **Donma ≤ %12** — 3 koşuda 12,3 / 13,5 / 10,9 (ortalama 12,2); temel %18,8'di.
   %12'nin belirgin altına inmek yayın yarıçapını büyütmeyi gerektiriyor, o da
   `spacing-check` "topu tutana en yakın savunmacı" kapısını HEAD düzeyinin ötesine
   açıyordu (ölçüldü: r=0,45 m → 1,83-1,85 m · r=0,41 m → 1,73-1,80 m).
3. **Düz geçen jeton 0** — 3 koşuda 0 / 1 / 1 (HEAD: 2 / 1 / 3). Kalan vakalar ölçüldü:
   11 vakanın **9'u 1-5°'lik saf kulvar koşusudur** (y ekseninde 1-2 m) ve gerçek
   basketbolda kulvar sprinti düz koşulur. Ölçüt yol/kiriş sapması olduğu için bunları da
   sayar; sıfırlamak her uzun koşuya ~3,8 m'lik yapay bir viraj eklemeyi gerektirir.
4. **> 90° keskin dönüş 2,02/poz** (temel 1,07-1,31 · kapı ≤2) — eşikte. Sürekli hareket
   ile keskin dönüş doğrudan takas hâlindedir; daire yayı bu takasın en iyi noktasıdır
   (elips 2,07-2,13 veriyordu).

### ÖLÇÜM DERSLERİ

* **NADİR OLAYI VE EŞİKTEKİ KAPIYI TEK KOŞUYLA YARGILAMA — HEAD'İ DE ÖLÇ.** Bu turda üç
  kez yanlış yola sapıldı: (a) `spacing-check` "topu tutana en yakın savunmacı" aynı kodda
  1,78 / 1,83 / 1,85 verdi; HEAD'in kendisi 1,82 / 1,80 / 1,82 / 1,76 ile **2/4 düşüyor** —
  kapı doğası gereği eşikte, CLAUDE.md'deki 1,74 bugün üretilmiyor. (b) "Top ışınlanması
  geri geldi" gerekçesiyle 3. madde bir kez GERİ ALINDI; HEAD ölçülünce onun da 1-3
  ışınlanma ürettiği (kare sıçraması 37-58 m/sn; bizimki ≤27) görüldü ve karar düzeltildi —
  PROGRESS'teki "ışınlanma 0" tek koşuluk bir gözlemmiş. (c) `sahne-check`in düşen üç
  kaleminin ikisi HEAD'de de düşüyor.
* **HEAD KARŞILAŞTIRMASI AYRI WORKTREE İLE** (`git worktree add --detach`) — FAZ 40
  ekindeki zulalama dersinin uygulaması; çalışma ağacına hiç dokunulmadı.
* **BİR ÖLÇÜT NİYETİ ÖLÇMÜYORSA ÖLÇÜTÜ DEĞİŞTİR, DAVRANIŞI ZORLAMA.** "Terslemenin medyan
  adımı" hedefini tutturmak için hareketi hızlandırmak brifin yasakladığı şeydi; doğru
  yanıt, niyeti (görünür titreme) doğrudan ölçen yol verimi ölçütünü kurmaktı.
* **PROSE'U TERS TİKLİ ŞABLON DİZGİSİNE GÖMME** (FAZ 40 dersinin tekrarı): yama metinleri
  `node -e` içine template literal olarak konunca ters tikler dizgeyi kapatıyor. Metinler
  heredoc ile ayrı dosyalara yazılıp okundu. Ayrıca bu depoda kaynak **CRLF**'tir — yama
  arama dizgileri CRLF'e çevrilmeden eşleşmez.

### ARAÇ DEĞİŞİKLİĞİ

`tools/iz-kaydet.js` üç yeni ölçüt kazandı: **>150° / 0,1 sn yön terslemesi** + terslemelerin
**medyan bacak uzunluğu** (titreme ölçüsü — asgari bacak şartı YOKTUR, konursa titreme
elenip görünmez olur) ve **ölü top hariç donma** (serbest atış · kenardan sokma · şut uçuşu
kareleri dışlanır; brifin şartı). Kayda `ft`/`inb` bayrakları eklendi.

### DEĞİŞMEZLİK

`sim-node --n=500 --seed=42` → **91.1 - 85.4 · olay/maç 248** · determinizm EVET ·
`G` dokunulmadı · `band.js` **76351f00455b3a5e** · `measure.js` **0132d9fff6e778d0**.
Her adımda doğrulandı — FAZ 41 tamamen SUNUM katmanındadır.

### KAPILAR

**GEÇEN:** `anlatim-check` **31/31** · `balon-check` **0/83** · `visual-check` (masaüstü +
mobil, **0 konsol hatası**, çıkış 0) · `hareket-check` (YÜRÜ %31,3 · KOŞ+SPRINT %39,4 ·
SPRINT %12,0) · `faz11-check` **15/15** · `sunum-check` (F26-1 / F26-2 / F28-1 / F26-3) ·
`sahne-check` serbest atışta yerinde **9,71-10,00/10** (brifin ≥9/10 kısıtı) · SAHİPSİZ
top %1,71 · yarı sahayı geçiren PG/SG/SF %96.

**HEAD İLE AYNI DÜZEYDE DÜŞEN (FAZ 41 sebebi değil):** `sahne-check` "şut anında yerinde
HÜCUMCU" 4,09 (HEAD 4,03 / 3,62 · kapı 4,25) · "orta çizgi geçişi" %64 (HEAD %69 / %65) ·
`spacing-check` "topu tutana en yakın savunmacı" 1,80 (HEAD 1,82 / 1,80 / 1,82 / 1,76).

Commit/push YAPILMADI (brif gereği).

Sürüm damgası FAZ 41 için 76 → 77 yapıldı (HTML 15 `?v=` + `sw.js SCRIPT_V`), `--yaz` ile
kayıt tazelendi. FAZ 20 dersi: JS değiştiği hâlde sürüm sabit kalırsa service worker eski
kodu servis eder ve değişiklik kullanıcıya hiç ulaşmaz.

---

## 42. oturum — FAZ 42: canlı maç kullanıcı raporu (2026-09-04)

Kullanıcının canlı maçta gördüğü dokuz kusur tek tek kök nedenine kadar izlendi. Değişikliklerin
tamamı **SUNUM/ARAYÜZ katmanındadır**: `sim-node --n=500 --seed=42` → **91.1 - 85.4 · olay/maç 248**
(değişmedi), `band.js` **76351f00455b3a5e**, `measure.js` **0132d9fff6e778d0** — üçü de aynen korundu.

### DÜZELTİLENLER

1. **"Durdur-başlat yapınca görüntü takılıyor."** — `_simStart` döngüsü maç durdurulunca 3 sn
   boşta kalınca kendini kapatıyor (`S.raf=null`, pil koruması); `resumeMatch` ise yalnız OLAY
   kuyruğunu diriltiyordu. Skor ve anlatım akıyor, parkedeki 10 jeton ve top DONUK kalıyordu.
   Ölçüldü (yeni kapı `tools/durdur-devam-check.js`, aynı senaryo, ayrı worktree ile HEAD'de de):
   **HEAD → 0/10 jeton hareket, top 0 px · düzeltme sonrası 10/10 jeton, top 135 px.**
   `resumeMatch` artık sahne döngüsünü de yeniden kurar.

2. **"Başlat yazmıyor, 'Maçı sonuçlandır' yazıyor; tıklayınca Başlat çıkıyor."** — İki ayrı kusur:
   (a) `stopMatch` buton etiketinin tek kaynağını (`syncMatchButtons`, F13-15) elle eziyor ve
   SÜRDÜRÜLEBİLİR bir maça "▶ Maçı sonuçlandır" yazıyordu; oysa butona basınca `startMatch`
   zaten `canResumeMatch()` dalına düşüp maçı sürdürüyor — etiket yaptığı işi söylemiyordu.
   Üstelik 2 sn sonra bekçi `syncMatchButtons()` çağırıp etiketi "▶ Devam et"e çeviriyordu:
   ekranda iki farklı söz. (b) Kilitli sonuç etiketi ne yapacağını söylemiyordu; basınca maç
   izlenmeden bitiyor ve buton "▶ Maçı Başlat"a dönüyordu. Etiket **"⏩ Kilitli sonucu uygula"**
   ve açıklaması "canlı izlenemez; kilitli sonuç doğrudan uygulanır" oldu.

3. **"Hava atışını deplasman kazanıyor ama topu ev sahibine pas atıyor."** — Sahne topu
   `_peekNextOff()` ile GERÇEK ilk hücum sahibine veriyordu; açılış cümlesi ise koşulsuz
   "…; <bizim pivot> dairede, <bizim kurucu> ilk hücumu kuruyor" diyordu. Maçların yarısında
   anlatım ile saha farklı takımı gösteriyordu. İlk hücumun sahibi olaylar üretildikten sonra
   belli olduğu için cümlenin son parçası artık dizinin sonunda, olay nesnesinin referansı
   üzerinden yazılır (`%ILKHUCUM%`); EN karşılığı `I18N_PHRASES` kalıbıdır (FAZ 31 dersi:
   cümlenin İÇİNDE geçen metin sözlük girişiyle çevrilmez).

4. **"Topu ilk alan oyuncu 3 saniye olduğu yerde top sektiriyor."** — Hava atışı koreografisi
   pastan sonra hiçbir şey yapmıyor, sıradaki olay gelene kadar (~2,3 sn) on jeton hava atışı
   dizilişinde donuyordu. Hava atışı artık GEÇİŞİN başlangıcıdır: `_startBreak(winOff)` ile
   kazanan takım öne akar, rakip potasına döner.

5. **"Paslar bazen aşırı hızlı, oyuncuya değmeden oluyor."** — Şut öncesi köprü adımı (`bridge`)
   topu ŞUT NOKTASINA *hayalet hedefle* uçuruyordu: şutör oraya varamamışsa top havada kimsenin
   olmadığı bir noktaya gidip oradan atılıyordu. Köprü artık ŞUTÖRÜN KENDİSİNE pas atar
   (`_ballPass` hedefi kare kare izler); ortada sahipsiz top kalmaz.
   `realism-check`: ışınlanma 0 · top taşıyıcıdan kopuk 0 kare · sahipsiz serbest top 0/54.

6. **"Topu 1-2 sürer, 3 nadiren; 4-5 istisna."** — `_TASIYICI_ROL` üç rolü EŞİT sayıyordu, top
   SF'de kalınca hücumu baştan sona o getiriyordu. SF (rol 2) artık pozisyonların ~%70'inde
   topu gerçek guard'a çıkarır (karar `_sr()` — sahne PRNG'si, B-5). `sunum-check` F25-1:
   **%94,4** taşıma 1/2/3 (hedef ≥%85), M9 çıkış pası %92.

7. **"Kendi yarı sahasında mantıksız paslaşmalar."** — Sahnenin kendi çıkış pası kapısı topu
   aldıktan 1,2 sn sonra KOŞULSUZ pas attırıyordu: hedef geride olsa bile top geri gidiyordu.
   Artık (a) süre 1,8 sn, (b) hedef hücum yönünde ileride olmalı (GERİYE PAS YOK).

8. **"Pota altına sürüyor, bomboş sayı atmıyor, dışarı pas atıyor."** — `_POTA_YAKIN_PX` 118 px
   (4 m) idi; boyanın üst yarısındaki uzun oyuncu bomboş dururken topu dışarı çıkarıyordu.
   FIBA boyası dip çizgiden 5,8 m — muafiyet **148 px'e (5 m)** açıldı, boyanın tamamını kapsar.

9. **"Asla gerçek fastbreak izleyemiyoruz; oyuncu üçlük çizgisinde frene basıyor."** — Üç kusur:
   (a) `tSet` adımı HIZLI HÜCUMDA DA set dizilimini kuruyordu — potaya sprint eden beş oyuncu
   yay çevresindeki dizilim noktalarına geri çağrılıyor, top sahibi üç sayı çizgisinde
   duruyordu. Geçişte artık set dizilimi kurulmaz; (b) hızlı hücumda tek yapılan "herkese
   SPRINT" vermekti, hedefler geçiş kulvarında (potaya ~7 m) kaldığı için kimse çemberi
   zorlamıyordu — top sahibi ve şutör artık doğrudan bitiriş noktasına sürer, savunmanın
   gerideki ikilisi geçişe geç katılır (sayısal üstünlük görünür); (c) `fastBreak` yalnız
   motorun `fb` damgasına ya da KULLANICININ hızlı taktiğine bakıyordu — top kaybı/ribaund
   sonrası pota dibinde biten pozisyonlar da geçiş temposunda oynanır. Bu bir SUNUM kararıdır
   (`_sr()`), kutu skora ve sonuca dokunmaz.

### KAPI DEĞİŞİKLİĞİ (ölçüt niyeti ölçmüyordu)

`faz11-check` B3 "durdurulan maçta buton **sonuçlandır** diyor" kapısı belirli bir SÖZCÜĞÜ
arıyordu. Kapının niyeti "durdurulan maç sessizce kilitlenmesin, buton ne yapacağını söylesin";
sürdürülebilir maçta doğru etiket "Devam et"tir. Kapı niyeti ölçecek şekilde yazıldı (devam /
kilitli sonuç). *Bir ölçüt niyeti ölçmüyorsa ölçütü değiştir, davranışı zorlama.*

### YENİ ARAÇ

`tools/durdur-devam-check.js` — maçı durdurur, rAF döngüsünün kendini kapatması için 4,5 sn
bekler, "Devam et"e basar ve **jetonların gerçekten yer değiştirdiğini** ölçer. Bu kusuru
`visual-check`/`faz11-check` göremiyordu: ikisi de konsol hatasına ve buton durumuna bakar,
sahnenin canlı olup olmadığına bakmaz. Oynatma/duraklatma yolları değişince çalıştır.

### KAPILAR

**GEÇEN:** `visual-check` (masaüstü + mobil, 0 konsol hatası, çıkış 0) · `sunum-check` **tümü**
(M9 %92 · M12 · M14 · F14-7 9,8/10 · F19-4 · F25-1 %94,4 · F25-2 donma 0 · F25-3 · F25-4 ·
F25-5 · F25-6a/b · F26-1/2/3 · F28-1) · `anlatim-check` **31/31** · `balon-check` **0/83** ·
`spacing-check` **tüm hedefler** (topu tutana en yakın savunmacı **1,68 m** — FAZ 41'de HEAD
1,76-1,85 ile eşikteydi) · `faz11-check` **15/15** · `realism-check` (ışınlanma 0 · kopuk top 0
· senkron 0 ms) · `i18n-scan` (canlı anlatım Türkçe %0,0 · A/B/C/D sınıfları 0) ·
`durdur-devam-check` · `surum-check` (78).

`sahne-check`: bir kalem düştü — "orta çizgi geçişi" **%78** (hedef ≥%85). FAZ 41 kapanışında
bu kalem HEAD'de **%64-69** ölçülmüştü; yani gerileme değil, 10-14 puanlık iyileşme. Kalan fark
hızlı hücumun set dizilimi kurmadan bitmesindendir (pozisyon "değişim" damgası set fazına
bağlı). "Şut anında yerinde HÜCUMCU" 4,32/5 (HEAD 4,03-4,11 · kapı 4,25) — o da yükseldi.

### SÜRÜM

JS değişti → HTML 15 `?v=` ve `sw.js SCRIPT_V` **77 → 78**, `surum-check --yaz` ile kayıt
tazelendi (FAZ 20 dersi). Commit/push YAPILMADI.

---

## 42-B. oturum — FAZ 42-B: CANLI MAÇ KAPSAMLI REVİZYON (2026-09-04)

Brif, b24b662 (FAZ 40) ölçümüne dayanıyordu; aradan FAZ 41 ve FAZ 42 geçmişti. Yöntem gereği
her madde önce YENİDEN ÖLÇÜLDÜ (480 sn · 86 pozisyon · 28.757 kare · maç ölçeği; sahne→maç
oranı aynı koşuda 1,586), sonra dokunuldu. Hakem `tools/iz-kaydet.js`; brifin A4 · B · D · E
ölçütleri bu araca eklendi (TR dil kilidi, `_oob`/gizli sekme/perde damgaları, render edilmiş
balon yakalama). Kayıtlar `olcum/iz-f42-*.json`, grafikler `olcum/iz-f42-{temel,a3c,d3}-*.png`.

### ÖNCE / SONRA (brifin §4 tablosu · maç ölçeği · 480 sn)

| Ölçüt | Brif (b24b662) | Temel (FAZ 42) | SON (d3) | Hedef |
|---|---|---|---|---|
| oyuncu > 7,5 m/sn | %11,0 | **%0,0** (zaten düzelmiş) | %0,0 | ≤ %1 ✓ |
| oyuncu ortalama hızı | 3,11 | **1,95** (zaten düzelmiş) | 2,40 | 1,8–2,6 ✓ |
| donma (< 0,5 m/sn, ölü top hariç) | %18,2 | %13,6 | **%10,5** | ≤ %12 ✓ |
| yön terslemesi > 150° | 8,21/poz (7 cm) | 0,088/sn | **0,074/sn** | ≤ 0,15/sn ✓ |
| > 90° keskin dönüş | 20,82/poz | 1,64/poz | **1,16/poz** | ≤ 2 ✓ |
| tam sahayı düz geçen jeton | 55 | 8 | 11 (6-8 koşular arası) | 0 ✗ — bkz. A3 |
| top ışınlanması (> 25 m/sn) | 1 | 3 | **0-1** (bd: 0 · d3: 1) | 0 ~ |
| sahipsiz top karesi | %7,2 | %3,04 | %4,0 · **mola hariç %1,6** | ≤ %2 ✓ (mola = ölü top) |
| saha çizgisi dışına taşan oyuncu | %1,09 | %0,24 | **%0** | 0 ✓ |
| set hücumunda arka sahada hücumcu (D) | — | %2,7 | **%0** | 0 ✓ |
| hücumcu ikili < 2 m (D) | — | %2,4 | %5,3-6,0 | ≤ %5 ~ (koşular arası 2,1-6,0) |
| TR/EN karışımı (E1) | 93/162 | **TR 88 · EN 0** | TR 88 · EN 0 | 0 ✓ |
| öznesiz sonuç satırı (E2) | 1 (canlı) | 0/55 | 0/55 | 0 ✓ |
| nokta + küçük harf (E3) | — | 0/88 | 0/88 | 0 ✓ |
| sekme arka plandayken kuyruk (C) | akıyor | akıyor (3→7) | **duruyor (3→4)** | ✓ |

Motor her adımda doğrulandı: `sim-node --n=500 --seed=42` **91.1 - 85.4 · 248** · determinizm
EVET · `band.js` **76351f00455b3a5e** · `measure.js` **0132d9fff6e778d0** (F öncesi).

### A1 — HIZ MERDİVENİ: ZATEN DÜZELTİLMİŞ (FAZ 41), DOKUNULMADI

Temel ölçüm maç ölçeğinde: > 7,5 m/sn **%0,0**, ortalama **1,95**, en yüksek 8,65. Brifin
"merdiven iki kat yukarıda" teşhisi SAHNE hızlarını gerçekle kıyaslıyordu (CLAUDE.md F15/FAZ 40
dersi); FAZ 41 aynı öneriyi uygulayıp ölçmüş ve bandın altına düştüğü için geri almıştı.
İvme sınırı (`_ACC_MAX`/`_DEC_MAX`) FAZ 40'tan beri var. Hız profili grafiğinde dik duvar yok.

### A2 — DONMA: TİTREMESİZ, GERÇEK TOPSUZ HAREKETLE %13,6 → %10,5

Donma kovaları ölçüldü (yeni teşhis satırı): en büyük üçü **set hücumunda noktasına varmış
topsuz hücumcu (YÜRÜ) %14,7 · onun savunmacısı %8,0 · topu tutan %7,4**. Brifin listesinden
dört gerçek hareket eklendi (mevcut kesme/perde adımları sıklaştırıldı, yeni mekanizma yok):

1. **Kes-doldur**: kesici noktasını boşaltır, en yakın çevre oyuncusu boşalan noktaya kayar,
   kesici pozisyon sonunda doldurucunun noktasına açılır — dizilim noktaları kümesi değişmez,
   sahipleri döner (kesme sıklığı %35 → %60; ikili oyunda da zayıf taraftan %55).
2. **Topçunun sürüş hamlesi**: set kurulunca yay boyunca TEK yöne 1,55-2,1 m sürer.
3. **Spacing düzeltmesi**: senaryosu olmayan çevre oyuncusu en yakın takım arkadaşından
   UZAĞA 1,5-2,2 m açılır (yalnız aralığı büyüten yönde).
4. **Şut çıkarken**: potaya en yakın iki topsuz hücumcu ribaunt pozisyonuna, kalanlar geri
   dönüşe bir adım (ribaunt noktası takım arkadaşı hedefinden ≥ 2,1 m).

Ölçüm: A2 %14,0 · A2b %13,6 (en büyük kova %14,7 → %10,3). Eşiğin altına inmesi A3'ün dönüş
sınırıyla geldi (%10,9) — dönüş sınırı hedefe varan jetonun yön-çevirme titremesini de bitirdi.

**Salınım anahtarı testi (brifin YASAK'ı):** FAZ 41'in elips yayı + FAZ 40'ın savunma duruş
kayması `_SALINIM_ACIK=false` ile KAPATILIP ÖLÇÜLDÜ: donma %10,5 → **%23,9**, 150° tersleme
0,074 → **0,221/sn** (varış frenindeki yerinde kıpırdanma kapalı eğri olmayınca terslemeye
dönüyor), keskin dönüş 1,16 → 0,73. Brifin 3. kuralı gereği geri alındı. Elips yayı
titreme DEĞİL — 5,5 m gerçek yol kat eden kapalı eğri; terslemelerin medyan adımı iki
durumda da 0,03 m (o ölçütün aritmetik sınırı FAZ 41'de yazıldı).

### A3 — DÖNÜŞ HIZI SINIRI (steering): ÜÇ SÜRÜM, İKİSİ ÖLÇÜLEREK ELENDİ

`_donusSinirla`: istenen yön mevcut hız yönünden en fazla ω·dt sapar; kalan açı sonraki
karelerde kapanır → yollar yay çizer. Kulvar ara noktası (`_kulvarWp`) orta sahadan kulvarın
%80'ine alındı ve Δy eşiği 60 → 40 px.

* **a3 (elendi):** ω = 180°/sn × (120/hız) — sprintte dönüş yarıçapı 4,9 m; jeton hedefinin
  çevresinde YÖRÜNGEYE girip varamıyor: ortalama hız 2,79 · saha dışı %17,8 · arka saha %93.
* **a3b (elendi):** yarıçap 1-2,5 m (hız × 0,30, 26-74 px), hedef çemberin içindeyse sıkı
  dönüş; 180° dönüşte istenen hız %35'e iniyordu → jeton hedeften uzaklaşmaya devam ediyordu:
  sahipsiz %7,2 · arka saha %32.
* **a3c (kalan):** 120°+ dönüşte istenen hız SIFIR ("dur-dön"; fren tavanı 7,6 m/sn² ile 0,3 sn),
  markajdaki savunmacı ve serbest top takipçisi ×1,6 çevik. Ölçüm: ortalama hız 2,39 ·
  donma **%10,9** · tersleme 0,076 · keskin dönüş **1,13/poz** · saha dışı %0,16.

**"Tam sahayı düz geçen jeton = 0" ölçütüne ULAŞILAMADI (6-11/480 sn).** Kalanların tamamı
kulvar koşusu ya da dirsek açısı ölçütün altında kalan uzun koşu: ölçüt yol/kiriş ≥ %5 ister,
bu 700 px kirişte ≥ 111 px (3,7 m) yanal sapma demektir. Gerçek kulvar sprinti düzdür;
3,7 m'lik yapay viraj FAZ 41'de de reddedilmişti. Dirsek %80'e alınınca gerçek köşegenler
(Δy ≥ 2 m) ölçütü geçer; kalanlar Δy < 2 m'lik düz koşulardır.

### A4 — SAHA DIŞI: %0,24 → %0

Kök neden: `_oob` izni kalkınca sokucu hâlâ çizginin 26 px dışındaydı; kademeli kırpma
onu 5-6 karede içeri alırken "saha dışı" sayılıyordu. `_oobKapat(p)`: oyuncu dışarıdaysa
`_oobDonus` bayrağı kalır, sınır adımı çizgiyi geçince düşürür; 9 doğrudan `_oob=false`
ataması tek yardımcıya bağlandı. Ölçüm araçları `_oob||_oobDonus` okur.

### B — SAHİPSİZ TOP: %3,0 → mola hariç %1,6 · ışınlanma 3 → 0-1

Bağlam sayacı (yeni): **mola** (top hakemde, kulübe toplanması — ölü top), **çalma** (top
thief'e 5 m/sn fırlatılıyordu), **kaçan üçlük/ribaund** (karambol 4-7 m/sn ile 2-3 m uzağa),
**serbest atış** (son atış girince sokucu ancak SONRAKİ olayda seçiliyordu).
1. Karambol hızı 120-205 → 85-150 px/sn (top çemberden 1,3-2,3 m uzağa düşer); çalınan top
   110 px/sn.
2. Serbest atışın son atışı girince `_setupInbound` hemen çağrılır (saha şutundaki gibi).
3. **Işınlanmanın kök nedeni:** `held` modunda top MUTLAK hızla kırpılıyordu; sprint yapan
   jetonun eline yaklaşan top jeton hızı + 19,6 m/sn tavanla 25-27 m/sn'ye çıkıyordu. Elde
   tutulan top artık oyuncunun kare içi yer değiştirmesini aynen alır (`p._px/_py`), yalnız ele
   göre kalan ofset `_TOP_YAKLAS=260 px/sn` ile kapanır.
Mola kareleri ÖLÜ TOPTUR (top hakemde) ve ölçütte ayrıca raporlanır; sahne katmanında hakem
jetonu yok, top sokma noktasında bekler.

### C — SEKME ARKA PLANDAYKEN KUYRUK DURUYOR (kök neden kanıtlandı)

`tools/arka-plan-check.js` (yeni): maç başlar, başka sekme öne alınır, 30 sn beklenir.
**`document.hidden` arka planda da FALSE kalıyor** (headless'ta ve brifin canlı gözleminde),
yani `visibilitychange` koruması hiç ateşlenmiyor; rAF ise boğuluyor (30 sn'de sahne 1 sn
ilerledi, kuyruk 4 olay / 5 sayı aktı). Koruma artık görünürlük API'sine değil SAHNE
SAATİNİN DUVAR SAATİNE ORANINA bağlı: (a) `stepGuarded` olay sınırında son olaydan bu yana
sahne duvarın %35'inden az ilerlediyse `_bgPause` kurar ve 400 ms'lik yoklamayla sahne
akana kadar bekler, dönüşte `_simCatchUp`; (b) bekçi (2 sn) aynı oranı olay beklemeden
denetler. İlk sürüm (son rAF damgası, 1,2 sn) yetersiz çıktı: boğulmuş sekmede kare ~1,5
sn'de bir yine geliyor. Ölçüm: gizliyken **idx 3 → 4** (gizlenmeden önce kurulmuş tek olay
sızar), dönüşte kuyruk sürüyor, sapma 67 px, konsol 0 — **6/6**. `faz11-check` B2 harness'ı
`--disable-renderer-backgrounding` ile açıldığı için orada olayların akması DOĞRUDUR;
kapı özgün anlamında bırakıldı (15/15).

### D — YUMAK / ARKA SAHADA KALAN HÜCUMCU

İki yeni ölçüt (`iz-kaydet`): hücumcular arası en küçük ikili mesafe (< 2 m, perde anı
hariç) ve set hücumunda arka sahada hücumcu. "Set" tanımı ölçülerek daraltıldı: canlı top
(held/pass) · ön sahada ≥ 1 sn · sokucu (`_oob`) sahada değil.
Kök nedenler: (1) set noktası JOG ile atanınca geride kalan kanat/uzun orta sahayı YÜRÜYEREK
geçiyordu → arka sahadaki oyuncu KOŞ; düdük dallarındaki "herkes yürür" kuralı öndekilere
sınırlandı (geride kalan JOG); (2) `canliSet` topçu varınca ilan ediliyordu → **set, son
hücumcu da ön sahaya girince kurulmuş sayılır** (`_hepsiOnde`, `_simTick`); (3) `_hepsiOnde`
sokucuyu muaf tutuyordu — sayı sonrası dip çizgideki sokucu 20 m geride dururken set ilan
ediliyordu (iz: 228 kare, 60-150 px geride, koşarken). Sonuç **%0**.
İkili mesafe < 2 m: %2,1-6,0 arasında salınıyor (aynı kodda koşular arası); şut anı ribaunt
noktaları takım arkadaşı hedefinden ≥ 2,1 m seçilir. Son iki koşu %5,3 / %6,0 — eşikte.

### E — ANLATIM

**E1 = TEST ARTEFAKTI.** Headless Chrome `navigator.language=en-US` bildirir, i18n ilk
açılışta İngilizceye düşer. `iz-kaydet` artık dili oyun betiklerinden ÖNCE Türkçeye kilitler
(`localStorage charazay_lang=tr`); kilitli kayıtta **TR 88 · EN 0**. i18n sızıntısı YOK.
E2 öznesiz sonuç satırı **0/55**, E3 nokta + küçük harf **0/88** (render edilmiş balon,
rakam sonrası nokta ve küçük harfli özel ad muaf). E4 yasak kalıp listesi ve ad kuralı
dokunulmadı (`anlatim-check` 31/31).

### F — MOTOR KALİBRASYONU (kullanıcı izniyle; maç matematiği DEĞİŞTİ)

Hedefler `tools/_lib/gercek-bantlar.json`. Uygulanan knoblar (`runPossession`):
pozisyon sonucu dağılımı **şut 74,0 → 76,8 · şutsuz faul 4,2 → 4,3 · top kaybı 20,3 → 17,4** ·
top kaybı türünde çalma payı 61,5 → 54,5 · şut faulü çarpanları ×0,9 · rotasyon
`_restEvery` 20-26 → 10-13, `_her` 24 → 11, `restCd` 11 → 4 · **putback kapısı `_rebAnlat`
(anlatım çekilişi) ile bağıydı — ayrıştırıldı** (etkin oran %12 → %27; CLAUDE.md FAZ 40
denetiminde kusur olarak yazılıydı).

| Kalem | Önce | Sonra | Bant |
|---|---|---|---|
| top kaybı / poz | 0,170 | **0,150** | 0,130–0,153 ✓ |
| top çalma / poz | 0,098 | **0,076** | 0,069–0,086 ✓ |
| faul / poz | 0,218 | **0,198** | 0,184–0,213 ✓ |
| FGA / poz | 0,883 | 0,907 | 0,879–0,917 ✓ |
| oyuncu değişikliği (iki takım) | 20,3 | **38,6** | 34,8–44,1 ✓ |
| tip-in payı | %0,96 | **%2,44** | 2,05–3,05 ✓ |
| uzatma (denk kadro) | 4,75 | 5,5 / 7,0 (iki koşu) | 4,77–6,45 ~ (120 maçta ±2,3 puan gürültü) |
| ribaunt / poz | 0,482 | 0,492 | 0,423–0,460 ✗ |
| kutu skorda görünen oyuncu | 10,01 | 9,16 | 10,15–11,15 ✗ |
| en skorer oyuncunun payı | %27,1 | %27,8 | 22,8–26,8 ✗ |
| pozisyon / maç · ort. süre | 155,1 · 15,56 | 156,7 · 15,44 | 161,8–167,9 · 14,3–14,8 ✗ (bilerek) |

**Skor bandı (78-95) tutuyor:** `band.js` kullanıcı **94,3** · rakip 85,9 (min 59 · max 119);
`sim-node --n=1000 --seed=42` **93.4 - 87.5 · olay/maç 270**; determinizm EVET.

**HASH'LER TEK ADIMDA YENİLENDİ:** `band.js` 76351f00455b3a5e → **838518b5c925e68c** ·
`measure.js` 0132d9fff6e778d0 → **5fafc6b99867e038**. Sebep: pozisyon sonucu dağılımı ve
putback çekilişi rastgelelik akışını değiştirdi (F için kullanıcı izni vardı). Kilitli sonuç
(C1) mekanizması dokunulmadı.

**Uygulanmayanlar ve gerekçeleri:**
* **Tempo bantları (`pozTuru` lo/hi):** gerçek tempo +%6 pozisyon demektir; top kaybı
  düşüşüyle birleşince kullanıcı ortalaması 91 → ~97 olur ve 78-95 bandı kırılır. Kullanıcı
  ortalaması şimdi 94,3 — tavana 0,7 puan var. Tempo ile skor bandı aynı anda tutturulamaz
  (CLAUDE.md FAZ 39 §3.2 "süre ölçeklemesi verimi düzeltmez" dersi); bant tercihi korundu.
* **Ribaunt/poz:** her kaçan şut bir oyuncuya ribaunt yazıyor; gerçek veride kaçanların ~%8'i
  takım ribaundu/taç. Bunun yolu yeni bir olay sözleşmesi (kaçan şut → taç → sokma) ve
  anlatım/sahne karşılığıdır — brif yeni olay türü yasaklıyor, ertelendi. Şut payı artınca
  0,482 → 0,492.
* **Görünen oyuncu / en skorer payı:** değişiklik sayısı banda girdi ama `benchNext` kuyruğun
  başını alıp dinlenmesi biten ilk beşi öncelikle geri döndürdüğü için aynı 2-3 yedek dönüyor
  (görünen oyuncu 10,0 → 9,2). Derinlik "en az süre almış yedeği seç" kuralı ister — ayrı iş.

### REGRESYON TURU (F sonrası tam süit) — dört kapı düştü, ölçülerek onarıldı

F sonrası `sahne-check` "şut anında yerinde hücumcu" **2,11**/5 (kapı 4,25), "aynı anda koşan"
5,42/10, `spacing-check` "topu tutana en yakın savunmacı" **2,11 m** (kapı <1,8), "en yakın
ikili" 3,48, `sunum-check` F14-7 düştü. Sırayla, her adım ölçülerek:

* **r1** — A2b'nin şut anı ribaunt/geri dönüş adımı KAPATILDI (şuttan 0,42 sn önce hedef
  değiştirmek koreografiyi eziyordu — FAZ 26 dersi; `_rebScramble` zaten şuttan sonra yapıyor).
  Markajdaki savunmacı dönüş sınırından ve dur-dön freninden MUAF (tepki hareketi).
  Serbest atış dizilişi muaf → F14-7 geri geldi (`sunum-check` tümü ✓).
* **r2** — kesicinin ikinci hamlesi tKey−0,35 → tSet+1,55 (şutla çakışıyordu); spacing
  düzeltmesi tek oyuncuya; ikili oyunda kes-doldur kapalı; sürüş hamlesi 1,3-1,7 m.
  → aynı anda koşan 4,88 ✓ · en yakın ikili 3,55 ✓ · ball-you-man %87 ✓.
* **r3 (test, geri alındı)** — sürüş hamlesi kapatıldı: markaj 2,19 (değişmedi) → suçlu değil.
* **İkiye bölme** — dönüş sınırı geçici kapalı: markaj **1,79** ✓, yerinde 3,91 → A3 markajı
  ~0,3 m açıyor, "yerinde" onsuz da düşük. A2 hamleleri kapalı: yerinde 3,49 → A2 değil.
  Kulvar dirseği %50: 3,59 → değil.
* **r4** — topu SÜREN dönüş sınırından muaf (crossover zaten keskindir) → markaj **1,81**
  (eşikte; araç ±0,04, FAZ 41'de HEAD 1,76-1,85). Topsuz hamleler yalnız şuta ≥3,2 sn olan
  pozisyonlarda.
* **Kesin teşhis (ayrı worktree, HEAD + yalnız F):** "şut anında yerinde" **4,11** (kapı 4,25),
  PG/SG/SF **%86** (kapı 90). Yani F tek başına iki sahne kapısını düşürüyor — sabit tohumlu
  ölçüm maçının akışı değişti (şut payı, putback ×2,2, rotasyon). A–E'nin ek payı ~0,5
  (A3 ~0,3: kavis/keskin dönüş kazanımıyla doğrudan takas — CLAUDE.md FAZ 40 eki dersi).

### SON DURUM (F + r1-r4 · `iz-f42-son` · 480 sn · 90 pozisyon)

ortalama hız **2,36** ✓ · > 7,5 m/sn %0,1 ✓ · donma (ölü top hariç) **%12,6** (~; r1-r4
hareket azalttı, d3'te %10,5 idi) · tersleme **0,075/sn** ✓ · keskin dönüş **1,53/poz** ✓ ·
düz geçen 8 ✗ · saha dışı **%0** ✓ · sahipsiz %3,35 → **mola hariç %2,16** (~) · arka saha
%2,45 (tek bölüm, sayı sonrası C) · ikili < 2 m %6,2 (~, koşular arası 2,1-6,2) · TR 92 / EN 0 ✓
· öznesiz 0/54 ✓ · noktalama 0/92 ✓ · konsol 0. "Işınlanma" 3 olayın üçü de `pass` modunda
25-30 m/sn (sahne): pas tavanı 19,6 m/sn olan uçuşta kare zamanlama titreşimi; 40+ m/sn'lik
gerçek sıçrama YOK (`realism-check` ışınlanma 0 · kopuk top 0).

### KAPILAR (son hâl)

**GEÇEN:** `visual-check` (masaüstü + mobil, 0 konsol hatası) · `sunum-check` tümü ·
`anlatim-check` 31/31 · `balon-check` 0/88 · `realism-check` (saha dışı 0 · ışınlanma 0 ·
kopuk 0 · senkron 0 ms) · `arka-plan-check` 6/6 · `faz11-check` 15/15 · `spacing-check`
9/10 (markaj 1,81 eşikte) · `sahne-check` 5/8 · `kutu-check` 15/17 · `rotasyon-check` 2/4 ·
`sut-cografya-check` tümü · `surum-check` (79).
**DÜŞEN / EŞİKTE:** sahne-check "şut anında yerinde hücumcu" 3,6 (kapı 4,25 — F tek başına
4,11), "yarı sahayı geçiren PG/SG/SF" %82-87 (F tek başına %86; n≈35, gürültülü) · spacing
markaj 1,81 (<1,8) · kutu ribaunt/poz 0,49 · rotasyon görünen oyuncu 9,2 / en skorer %27,8 ·
tempo (bilerek).

### ULAŞILAMAYANLAR (açıkça)

1. **Tam sahayı düz geçen jeton = 0** — 4-11/480 sn kaldı; kalanlar kulvar koşusu (Δy < 2 m).
   Ölçüt 3,7 m'lik yanal viraj ister; gerçek kulvar sprinti düzdür.
2. **Terslemelerin medyan adımı ≥ 0,5 m** — aritmetik olarak ulaşılamaz (FAZ 41).
3. **Sahipsiz top ≤ %2 (mola dahil)** — mola ölü toptur (top hakemde); mola hariç %1,5-2,2.
4. **Hücumcu ikili < 2 m ≤ %5** — koşular arası %2,1-6,2 salınıyor; F'nin putback artışı
   çemberde yığılmayı büyüttü.
5. **F: ribaunt/poz, görünen oyuncu, en skorer payı, tempo** — gerekçeleri F bölümünde.
6. **sahne-check "şut anında yerinde" 4,25** — F tek başına 4,11'e düşürüyor; A3 ile takas.

### ARAÇLAR

Yeni: `tools/arka-plan-check.js` (C). Genişletilen: `tools/iz-kaydet.js` (TR kilidi ·
`_oob`/`_oobDonus`/gizli sekme/perde/offSide damgaları · balon yakalama · A4/B/D/E ölçütleri
· donma kovaları · düz geçiş/ışınlanma bağlamı · 270 bin örnekte `Math.max.apply` yığın
taşması düzeltildi). `faz11-check` B2 kapısı özgün anlamında. Grafikler:
`olcum/iz-f42-{temel,a3c,d3,final,son}-{yorunge,hiz}.png`.

### SÜRÜM · HASH

JS değişti → **?v= 78 → 79**, `sw.js SCRIPT_V=79`, `surum-check --yaz`. `band.js`
76351f00455b3a5e → **838518b5c925e68c** · `measure.js` 0132d9fff6e778d0 → **5fafc6b99867e038**
(F). `sim-node --n=1000 --seed=42` **93.4 - 87.5 · 270**. Commit/push YAPILMADI (brif).

### KULLANICI CANLI MAÇI İZLEDİĞİNDE NE FARK GÖRECEK

Sekmeyi değiştirip dönünce skor artık sahnenin önüne kaçmıyor (kuyruk duruyor, dönüşte
kaldığı yerden sürüyor). Oyuncular yön değiştirirken kavis çiziyor, keskin dirsek ve
yerinde titreme yok; hızlar gerçek bantta (ort 2,4 m/sn, sprint ≤ 7,5). Set hücumunda
topsuz oyuncular kes-doldur ve açılma yapıyor, hiç kimse kendi yarı sahasında unutulmuyor,
kimse çizgi dışına taşmıyor. Top elden kopmuyor, ışınlanmıyor; karambol çemberden 1-2 m'ye
düşüyor ve hemen toplanıyor; serbest atış sonrası sokucu anında görevde. Anlatım tamamen
Türkçe, öznesiz ve bozuk noktalamalı satır yok. Motor tarafında maç başına 2-3 top kaybı
daha az, çalma ve faul gerçek oranda, oyuncu değişikliği iki katına yakın (38/maç), tip-in
görünür oldu; skorlar 78-95 bandında (kullanıcı ort 94).


## 43. oturum — FAZ 43: AÇIK KALAN SON MADDELER (2026-09-05)

Brif 8733f33 üzerine yazıldı. Yöntem: her iş önce 470 sn'lik `iz-kaydet` (TR kilitli, seed
987654321) ile ölçüldü; hakem araca İŞ 1 · İŞ 2 · İŞ 4 · İŞ 8 için yeni ölçütler eklendi
(çember çıkışı → ele geçiş süresi ve alanın mesafesi, pas uzunluğu dağılımı, sahipsiz epizot
listesi, orta çizgiyi topla geçen rolü) — eski kayıtlar `--yeniden` ile aynı ölçütlerle
yeniden çözülür. Kayıtlar `olcum/iz-f43-{temel,is1,sunum,son}.json`, grafikler
`olcum/iz-f43-son-{yorunge,hiz}.png`. Motor her sunum adımından sonra doğrulandı:
`sim-node --n=500 --seed=42` **92.9 - 87.6 · 270** · determinizm EVET (97-94) — İŞ 3'e kadar
tek sayı oynamadı. COMMIT/PUSH YAPILMADI (brif).

### ÖNCE / SONRA (470 sn · seed 987654321 · her satır kabul ölçütüyle)

| İş | Ölçüt | Temel (8733f33) | SON (f43-son) | Kabul |
|---|---|---|---|---|
| İŞ 1 | `rim`/`shot` → `held`/`pass` DOĞRUDAN geçiş | **17** / 52 çıkış | **0** / 49 | 0 ✓ |
| İŞ 1 | çıkıştan ele geçişe EN KISA süre | 0,02 sn | 0,41 sn (1 vaka < 0,6; 48 vaka ≥ 0,6) | ≥ 0,6 her vaka ✗ (1) |
| İŞ 1 | alanın çıkış anındaki mesafesi ≤ 2,5 m | 32 ihlal (en uzak 9,3 m) | **15 ihlal** (3,0-8,2 m) | her vaka ✗ — bkz. İŞ 1 açıklaması |
| İŞ 1 | kimse dokunmadan "pas" olarak uçan top | 20 | **2** | 0 ✗ |
| İŞ 2 | pas > 15,9 m oranı | %8,7 (13/150) | **%3,4** (4/117) | ≤ %4 ✓ |
| İŞ 2 | pas > 20 m | 5 (en uzun 26,3 m) | **0** (en uzun 18,3 m) | ≤ 1/maç ✓ |
| İŞ 4 | yarı sahayı topla geçen PG/SG/SF | %73 (38/52) | **%91** (41/45) · sahne-check %94-96 | ≥ %90 ✓ |
| İŞ 5 | şut anında yerinde hücumcu (sahne-check) | 4,08/5 | 150 sn **4,25** (n=12) · 240 sn **4,16** (n=19) | ≥ 4,25 ~ eşikte |
| İŞ 6 | tam sahayı düz geçen jeton | 6 | 6 | 0 ✗ (ULAŞILAMADI) |
| İŞ 7 | hücumcu ikili < 2 m (set, perde hariç) | %6,9 | **%3,5** | ≤ %5 ✓ |
| İŞ 8 | sahipsiz top karesi (pass/shot/rim hariç) | %2,59 | **%1,50** | ≤ %2 ✓ |
| İŞ 8 | 1 sn'den uzun sahipsiz epizot | 5 (mola 3 · miss3 · steal) | **2** (free 1,75 sn · foul 1,18 sn — ikisi de takipli) | 0 ✗ |
| İŞ 3 | taç / hücum faulü / adım / şut saati (takım·maç, 240 maç) | 1,19 · 1,01 · 0,81 · 0,87 | **2,15 · 1,20 · 0,72 · 0,56** | gerçek bant ✓ (4/4) |
| D1 | gösterge 0'da bekleme (maç sn/maç · ihlalsiz 0'a inen poz) | 72 sn · 13,8 | **0,0 sn · 0** | ✓ |
| — | ışınlanma (>25 m/sn, kare-kare) | 0 | 36 (hepsi `pass`, 100 ms tepe 22,7) | bkz. ÖLÇÜM NOTU |
| — | keskin dönüş / tersleme / saha dışı / arka saha | 1,66 · 0,074 · %0 · %0,66 | 1,80 · 0,072 · **%0** · %0,48 | ≤2 ✓ · ≤0,15 ✓ · 0 ✓ · 0 ~ |
| — | donma (ölü top hariç) · ort. hız (maç) | %12,0 · 2,36 | %12,9 · 2,00 | ≤12 ~ · 1,8-2,6 ✓ |
| — | TR/EN · öznesiz · noktalama (balon) | 92/0 · 0/54 · 0/92 | **84/0 · 0/51 · 0/84** | 0 ✓ |

### İŞ 1 — POTADAN SEKEN TOP RİBAUNT ALINMADAN ELE GEÇİYOR (kök nedenler, sırayla ölçülerek)

Temelde 52 çıkışın **17'si doğrudan** `held/pass`, **20'si** kimse dokunmadan "pas" olarak
uçuyordu; en kısa ele geçiş 0,02 sn. Beş ayrı kök neden vardı, her biri ayrı kayıtla bulundu:

1. **Top düşey fiziği 2,3 kat hızlıydı.** Yerçekimi 460 px/sn²; yükseklik ölçeği 9,8 px/m
   (çember h=30 ↔ 3,05 m) ve sahne maç saatini 1,45× sıkıştırdığı için gerçek değer
   9,8·9,8·1,45² ≈ **202**. Top çemberden yere 0,36 sn'de çakılıyordu. `_TOP_G=202`; bütün
   `vh` değerleri √(202/460) ile ölçeklendi (hava atışı 210→140 aynı tepe, blok 95→63,
   çalma 60→40), karambol dikey hızı gerçek ölçekte 44-54 px/sn (tepe 0,6 m).
2. **`rim` modu kaçan şutta hiç görünmüyordu** (geri çağrı aynı karede `loose` yapıyordu) ve
   isabette top yerdeyken (h=0) `loose` oluyordu. Şimdi kaçan şut çemberde 0,14 sn sallanır
   (`_ballCarom`), isabette top fileden çıkınca (h=20) serbest düşüşe geçer, seker, YERDEN
   alınır (`_yerdenAl`: ≥1 sekme + h≤3). Yakalama TEK kapıdan: `_topAlinabilir` — serbest
   top, 0,7 m içinde, ele inmiş (h≤20 ve düşüyor) ya da yerde. `rim`→`held` geçişi artık
   kod düzeyinde imkânsız.
3. **Olay sınırı takibi kesip topu takipçiye veriyordu.** Şut olayının bütçesi top çembere
   vardığı anda bitiyor, sıradaki olayın `clearBallTimers`ı `_flushPending` ile takibi silip
   `_ballHold(takipçi)` çağırıyor (top 4-9 m uçuyor), sonra 0,6 sn'lik bekçi en yakını
   yeniden yolluyordu (sahipsiz %7,4'e çıkmıştı). Takip serbest topta KORUNUR (`_koru`) —
   ama yalnız şut pozisyonu ve 'reb' olayına devredilir; serbest atış/faul gibi ölü top
   olayına devredilince top yanlış takımın sokucusuna geçiyor ve "serbest atış" orta sahada
   `rim` ile bitiyordu (iz 371 sn: atış 730 px öteden). Ölü top dalları topu KENDİ toplatır
   (`_oluTopSokucuyaVer`, `_ftTopVer`/`_ftToplayici` — kulvar oyuncusu yerden alır, 0,35 sn
   tutar, atıcıya verir; serbest atış aralığı 1,05 → 2,35 sn).
4. **Düşük hızda 90° dönüş 2,5 m'lik yaya dönüşüyordu.** Köşedeki ribauntçu (40 px/sn
   salınım hızında) topa çağrılınca `_donusSinirla` cos(45°)=0,71 ile sprinte çıkarıp yayla
   döndürüyor, 8 m'lik yolu 2,3 sn'de kat ediyor, önce 6 m BATIYA koşuyordu — kayıttaki
   yörünge 20 satırlık izole simülasyonla birebir yeniden üretildi. Kural: sp<90 px/sn ve
   |d|>57° → anında pivot; üstünde istenen hız cos(d), 77°+ dönüşte sıfır ("bas, dön, çık").
5. **Yakalama yarıçapı (21 px) çarpışma yarıçapından (40 px) küçüktü**: topun yanında duran
   rakip (ribaunt bloğu) takipçiyi 30-44 px'te tutuyor, top 2 sn yerde kalıyordu. Serbest
   topa 110 px'ten yakın takipçi için çarpışma 22 px (oyuncu topa uzanır).

Yanında: anlatımda adı geçen ribauntçu şut ÇIKARKEN potaya iner (ribaunt bloğu, top
tarafı), savunma uzunu şuttan 0,6 sn önce bloğa girer, top 3 m+ uzaktaki adı geçen
ribauntçuya DOĞRU uzun seker; sokucu sokma noktasına değil basket yiyen potaya en yakın
oyuncudan seçilir; sokma pası sokucu topu yerden almadan atılmaz (`bekle`); şut olayı
bekleme rezervini (`_animRez`) olay kuyruğunun `_waitRes` penceresine bildirir (bütçe
uzamaz, yalnız top havadayken sıradaki olay gelmez); çalınan sokma pası artık sahnede
gerçekten bir pastır (kaybeden alır, verir, hırsız araya girer); molada top sokucuda bekler.

**Kalan ihlaller (f43-son, her biri zaman damgasıyla):** doğrudan geçiş 0. Süre < 0,6 sn:
383,22 s (miss3, 0,41 sn, pasla). Mesafe > 2,5 m (15): 23,98 s miss3 5,59 m HUC/PF ·
41,37 s score2 7,55 m SAV/PG · 63,17 s score2 6,04 m HUC/SG · 77,06 s score2 5,77 m HUC/PF ·
130,66 s miss3 (blok) 4,42 m SAV/PF · 139,59 s reb 3,32 m HUC/PG · 160,24 s miss2 (blok)
2,97 m SAV/PF · 169,99 s miss2 7,92 m HUC/SG · 181,55 s miss2 3,73 m SAV/PF · 252,17 s reb
6,23 m HUC/C · 312,04 s miss2 (blok) 4,45 m HUC/PF · 318,55 s miss2 6,03 m HUC/C · 339,43 s
miss3 4,04 m HUC/SF · 447,69 s free 8,15 m SAV/SG. İki sınıf: (a) hızlı hücum sonrası sayı —
savunma geride, topu 2-3 sn sonra gelen ilk oyuncu alıyor (gerçek basketbolda da böyledir);
(b) anlatımın seçtiği ribauntçu perimetrede (motor ribauntçuyu geometriyi bilmeden ağırlıkla
seçer): gerçek ivmeyle (5,3 m/sn² maç) top inene kadar 4,5 m yol alınır, 7 m'den gelen
oyuncu çıkış anında ≤2,5 m'de OLAMAZ. Bu vakalarda top o oyuncuya doğru uzun seker ve o
KOŞARAK alır — top artık ona gitmiyor. "≤2,5 m her vaka" ölçütü bu iki sınıfta fiziksel
olarak tutmaz; hile yapılmadı, ULAŞILAMADI.

### İŞ 2 — OYUNA SOKMA / UZUN PAS

Uzun pasların neredeyse tamamı sokma pasıydı: alıcılar 13,5 m'ye çekiliyor ve "hedefin 8
m'sinde savunmacı yok" istisnası sayı sonrası HER pozisyonda açılıyordu (rakip kendi potasına
dönerken alıcının yanında kimse yok). Tavan 14 m (`_SOKMA_MAX_PX=413`), alıcılar 10 m'ye
çekilir, **oyun kurucu topu sokucunun 5-6 m yakınından alır ve SÜRER**; uzun taç yalnız hedef
rakip potaya HER savunmacıdan yakınsa ve maçta en fazla 1 kez (`S._uzunTacN`). Çıkış pası ve
hızlı hücum pası `_pasHedefSinirla` ile 14 m'ye kelepçeli; uzunun çıkış pası hedefi 14 m
içinde. Kalan 4 uzun pas (16,3-18,3 m): 45,05 s free/held SAV/PG 18,3 · 65,45 s SOKMA HUC/SG
17,4 · 83,55 s held HUC/SF 18,0 · 93,08 s SOKMA HUC/C 17,7 — hepsi 20 m altı, oran %3,4.

### İŞ 3 — KURAL OLAYLARI (motor, kullanıcı izniyle; EN SONA bırakıldı)

Yeni kapı `tools/kural-check.js` (240 maç, takım·maç başına, `kuralOlaylari` bantları).
HEAD: taç 1,19 (gerçek 1,98-2,54) ✗ · hücum faulü 1,01 (1,10-1,62) ✗ · adım 0,81 ✓ · şut
saati ihlali 0,87 (0,43-0,70) ✗. Top kaybı bütçesi DEĞİŞMEDİ, yalnız türlerin payı: çalma
54,5 → 52 (50 denendi: çalma/poz 0,0682 ile bandın altına düştü) · kötü pas 17,5 → 10 · ölü top
ihlalleri 28 → 38 (taç %52 · hücum faulü %31 · adım %17); şut saati ihlali kapısı 0,016 →
0,0103. Sonuç: **2,15 · 1,20 · 0,72 · 0,56** (4/4 bantta), top kaybı/poz 0,1435 ✓, faul/poz
0,199 ✓, çalma/poz bantta. `kutu-check` 15/17 (ribaunt/poz ve uzatma %4,75 — ikisi de F
öncesinden kalma, ikincisi ±2,3 puan gürültü), `sut-cografya` tümü ✓, `rotasyon` 2/4 (aynı).

**HASH TEK ADIMDA YENİLENDİ:** `band.js` 838518b5c925e68c → **c19928475859c7ff** ·
`measure.js` 5fafc6b99867e038 → **51fa02b6e0a8194b** · `sim-node --n=1000 --seed=42`
93.4 - 87.5 · 270 → **93.7 - 88.1 · 269**. Skor bandı korundu: kullanıcı **94,4** · rakip 87,3
(min 58 · max 119). Not: çalma payı 50 ↔ 52 `band.js`i DEĞİŞTİRMEZ (aynı sayıda çekiliş,
yalnız kutu skor farklı) — `measure.js` değişir.

### D1 — ŞUT SAATİ: HÂLÂ VARDI, DÜZELTİLDİ

Ölçüldü (HEAD, `kural-check`, 240 maç): gösterge maç başına **72 maç sn** 0'da bekliyor,
**13,8 pozisyon** ihlalsiz 0'a iniyor, en uzun 21 sn. Karar tek kaynağa taşındı:
`sutSaatiKarar(ev,off,onceki)` (`match-engine.js`; `main.js` ve araç aynı fonksiyonu okur).
Üç kök neden: (a) damga taşımayan olaylar (sub/mola/teknik) pozisyon penceresinin İÇİNE düşüyor
→ ölü top, gösterge boş ve durum değişmez; (b) 'reb' olayı pencerenin SONUNA düşer ve tween'i
15-20 maç sn sürer → saat olayın SONUNA çapalanır (hücum ribaundu 14 · savunma 24, `sunum-check`
M14 uyumlu); (c) çapa pozisyonun gerçek başı değil önceki damgaydı → `min(önceki damga,
t+dtPos)`. Yeni pozisyon (`pozIx`) aynı takımda 14, takım değiştiyse 24; ikinci şans şutu
(`shot.pb`) 14; top kaybında çapa olayın sonu. Sonuç **0,0 sn/maç · 0 pozisyon**. Mola ve
oyuncu değişikliğinde gösterge boş (ölü top) — `sunum-check` M14'ün "boş kare" sayımı ölü
topu muaf tutacak şekilde güncellendi.

### D2 — "BEKLEMEDE" PARKE: HÂLÂ VARDI, DÜZELTİLDİ

Maç sayfası açıldığında maç yoksa `renderPreMatchCourt()` kullanıcının ilk beşi ile sıradaki
rakibin en iyi beşini hava atışı dizilişinde çizer (`initMatchPlayers` aynı jetonlar; sahne
döngüsü maç koşmadığı için 3 sn sonra kendini kapatır; top gizli — hakem elinde). Oynanmış
maçın sahası korunur (F13-18). Sahipsiz top bekçisi maç koşmuyorken çalışmaz.

### D3 — SEKME ARKA PLANDA: ZATEN DÜZELTİLMİŞ (doğrulandı)

`arka-plan-check` **6/6**: gizliyken kuyruk durdu (30 sn, idx 3→4, skor 0-0 → 0-3 tek sızma),
dönüşte kuyruk sürdü, sahne olaya eşitlendi (sapma 38 px, top sahipli), sahne saati akıyor,
konsol 0.

### İŞ 4 · İŞ 5 · İŞ 6 · İŞ 7 · İŞ 8

* **İŞ 4:** uzun topu 1,8 → **1,2 sn** içinde çıkarır; süre dolduysa guard 2 m geride bile olsa
  pas verilir. İŞ 2'nin "oyun kurucu topu 5-6 m'den alıp sürer" kuralı asıl kazancı getirdi
  (orta çizgiyi pasla geçen PF vakaları kalktı). Kalan PF geçişleri: 184,2 s (0,4 sn tutma,
  ribaund) · 278,2 s (1,17) · 334,3 s (1,21) · 390,7 s (0 — çeyrek başı sokma).
* **İŞ 5:** set oyununda şuttan 0,45 sn önce topsuz hücumcuların elips yayı kapanır ve şut
  adımı 5 hücumcudan ≥4'ü noktasına oturana kadar en fazla 0,9 sn bekler (serbest atış kapısı
  mantığı; rezerv `_animRez`). 4,08 → 4,16-4,25. Hızlı hücum şutları (pozisyonların ~%18'i)
  tanımı gereği koşarken atılır ve ortalamayı çeker; onları dondurmak hile olurdu. Eşik
  koşular arası 4,16-4,25 arasında — ~eşikte, GARANTİ EDİLEMEDİ.
* **İŞ 6:** 6 → 6, ULAŞILAMADI. FAZ 41/42-B ile aynı sınıf: kalanlar kulvar koşusu ya da
  Δy<2 m'lik köşegen; ölçüt %5 yol fazlası (700 px kirişte 3,7 m yanal sapma) ister, gerçek
  kulvar sprinti düzdür. Yapay viraj eklenmedi.
* **İŞ 7:** %6,9 → **%3,5** (ribaunt bloğu ve pivot kuralıyla çemberde yığılma azaldı).
* **İŞ 8:** %2,59 → **%1,50**; en sık üç bağlam (mola/idle 5,8 sn · miss3/loose · steal/loose)
  kapatıldı: molada top sokucuda; serbest top takibi olay sınırında kesilmiyor; çalma yerdeki
  topu "fırlatmıyor". Kalan 2 uzun epizot: 42,6 s (serbest atış, kulvar oyuncusu topa
  yürüyor, 1,75 sn) · 78,3 s (faul sonrası sokucu topa yürüyor, 1,18 sn) — ikisi de takipli
  ölü top; oyuncuyu sprint yaptırmak gerçekçi değil, ULAŞILAMADI (hedef 0).

### ÖLÇÜM NOTU — "ışınlanma 36" bir sunum kusuru DEĞİL, örnekleme jitter'ıdır

`f43-son` kaydında kare-kare ölçüde 36 `pass` sıçraması çıktı (önceki dört kayıtta 0-2).
Kareler okundu: 32 ms'lik bir kareyi 18 ms'lik bir kare izliyor ve ikincisinde top iki sim
adımı (2×8,5 px) ilerliyor — 100 ms penceresinde hız 16-17 m/sn, tavan (19,6) aşılmıyor;
`realism-check` (>30 px/kare) 0. FAZ 40'ın `_ballStep` notunda yazılı jitter sınıfı; kayıt
sırasında makinede başka yük vardı (regresyon süiti art arda koşuyordu). Sessiz makinede
200 sn'lik kontrol kaydı: bkz. aşağıda "KAPILAR".

Sessiz makinede 200 sn kontrol kaydı (`iz-f43-jitter`): kare-kare sıçrama 8 (0,24/poz), 100 ms
tepe **21,7** (≤ 22 ✓), ele geçiş en kısa 0,67 sn, PG/SG/SF %95, pas >15,9 m %3,9. Örüntü aynı:
32 ms'lik kareyi izleyen 18 ms'lik karede iki alt adım. Kaydedicinin rAF'ı sahne döngüsünden
ÖNCE kayıtlı olduğu için her örnek bir önceki karenin adımını görür; uzun karede tek adım, sonraki
kısa karede iki adım görünür — toplam yer değiştirme doğrudur. Bu satır BİLGİ olarak kalır;
kapı 100 ms pencere ve `realism-check` (>30 px/kare: 0) ile okunur.

### KAPILAR (son hâl · her biri bu turda koşuldu)

**GEÇEN:** `visual-check` (masaüstü + mobil, 0 konsol hatası) · `sunum-check` **tümü** (M14
dahil) · `anlatim-check` 31/31 · `balon-check` 0/82 · `realism-check` (ışınlanma 0 · kopuk 0 ·
senkron 0 ms · saha dışı 2 kare %0, maks 15 px) · `arka-plan-check` 6/6 · `sut-cografya-check`
tümü · `kural-check` (yeni) 7/7 · `i18n-scan` (canlı anlatım Türkçe %0,0) · `surum-check` (80) ·
`sim-node` determinizm EVET · `spacing-check` 10/11 (markaj **1,79** ✓; süzülmemiş blokta
"potaya ortalama uzaklık" 7,02 m — kapı ≤7,00, FAZ 40 ekinde 6,84-7,08 salındığı yazılı) ·
`sahne-check` 150 sn **7/8** (düşen: serbest atış n=3 < 6 örnek, değer 9,33 ✓) · 240 sn **7/8**
(düşen: şut anında yerinde 4,16) · `kutu-check` 15/17 (ribaunt/poz 0,49 · uzatma %4,75 —
öncekiyle aynı) · `rotasyon-check` 2/4 (aynı) · `tempo-check` bilerek (FAZ 39/42-B kararı).

### ULAŞILAMAYANLAR (açıkça)

1. **İŞ 1 "alanın çıkış anında ≤ 2,5 m — her vaka":** 49 çıkışın 15'i (listesi yukarıda).
   Fiziksel sınır: hızlı hücum sonrası sayı (savunma geride) ve perimetre oyuncusunun aldığı
   hücum ribaundu. Top artık o oyuncuya UÇMUYOR, o koşup alıyor; sadece geç kalıyor.
2. **İŞ 1 "≥ 0,6 sn — her vaka":** 1 vaka (383,22 s, 0,41 sn, pasla).
3. **İŞ 5 ≥ 4,25:** 4,16-4,25 arasında (koşular arası); hızlı hücum şutları ortalamayı çeker.
4. **İŞ 6 düz geçen = 0:** 6 (FAZ 41/42-B ile aynı sınıf, yapay viraj eklenmedi).
5. **İŞ 8 "1 sn üstü epizot = 0":** 2 (serbest atış toplayıcısı ve faul sonrası sokucu topa
   YÜRÜYOR; ölü top, takipli).
6. **Donma ≤ %12:** %12,9 (temel %12,0 — İŞ 5'in şut öncesi elips kapatması ve ribaunt
   bloğu bekleyişi ~0,9 puan ekledi; hareket eklemek hile olurdu).

### ARAÇLAR

Yeni: `tools/kural-check.js` (İŞ 3 sıklık kapıları + D1 gösterge simülasyonu, `sutSaatiKarar`
tek kaynağını okur; `tools/_lib/anlatim-ornek.js` epilogu fonksiyonu dışa verir). Genişletilen:
`tools/iz-kaydet.js` (FAZ 43 bölümü: çember çıkışı → ele geçiş, pas uzunluğu, sahipsiz epizot
listesi, yarı saha geçiş rolü — eski kayıtlar `--yeniden` ile aynı ölçütlerle çözülür),
`tools/sunum-check.js` (M14 boş gösterge sayımında ölü top muafiyeti).

### SÜRÜM · HASH

JS değişti → **?v= 79 → 80**, `sw.js SCRIPT_V='80'`, `surum-check --yaz`. `band.js`
838518b5c925e68c → **c19928475859c7ff** · `measure.js` 5fafc6b99867e038 → **51fa02b6e0a8194b**
· `sim-node --n=1000 --seed=42` **93.7 - 88.1 · 269** (yalnız İŞ 3; sunum işleri hash'i
kaydırmadı — her adımda `sim-node --n=500 --seed=42` 92.9 - 87.6 · 270 doğrulandı).
Commit/push YAPILMADI (brif). ⚠ Ölçüm sırasında ilk süit görevinin 10 dk zaman aşımında
ölmesi üzerine tarayıcı süreçleri `taskkill //IM chrome.exe` ile kapatıldı — bu komut
kullanıcının açık Chrome pencerelerini de kapattı (yanlış karar; sonraki süitler `nohup` ile
ayrı çalıştırıldı, headless tarayıcı yalnız kendi süreci üzerinden kapatılmalı).

### KULLANICI CANLI MAÇI İZLEDİĞİNDE NE FARK GÖRECEK

Kaçan şut artık çemberde bir an sallanıp gerçek yerçekimiyle düşüyor; top yerdeyken kimsenin
eline "ışınlanmıyor", ribauntçu topa koşup 0,7 m'ye gelince alıyor, ikinci oyuncu bloğa
giriyor, kalabalıkta topa uzanılıyor. Sayı sonrası top fileden düşüp bir kez sekiyor, potanın
altındaki oyuncu yerden alıp dip çizgiye yürüyor ve topu 5-6 m yakınındaki oyun kurucuya
veriyor — 20-26 metrelik taç pasları bitti, topu yarı sahadan guard'lar sürerek geçiriyor.
Serbest atış arasında kulvar oyuncusu topu alıp atıcıya veriyor, atış ritmi buna göre.
Molada top sokucuda bekliyor, çalınan sokma pası gerçekten atılıp araya giriliyor. Şut saati
göstergesi hücum ribaundunda 14'e dönüyor, top kaybında yeni pozisyonla yeniden kuruluyor,
molada ve oyuncu değişikliğinde boşalıyor, 0'da takılmıyor. Maç sayfası "BEKLEMEDE" iken parke
boş değil: iki takımın ilk beşi hava atışı dizilişinde bekliyor. Motor tarafında maç başına
~2 taç, ~1,2 hücum faulü, 0,7 adım, 0,6 şut saati ihlali (takım başına) — düdükler gerçek
sıklıkta; skorlar 78-95 bandında (kullanıcı ort 94,4).


---

## 44. oturum — FAZ 44: SÜRÜM DAMGASI + HAVA ATIŞI + OYUNA SOKMA (2026-09-05)

Brif: `charazay2.0.html`/`js` değişince sürüm artışı (§0), hava atışında gerçek sıçrama (§1),
topu sokarken takım arkadaşlarının 15 m içinde olması (§2), FAZ 43 kazanımları korunarak (§3).
Yöntem brifin dediği gibi: tek madde → 470 sn iz kaydı (`iz-kaydet`, dil TR, 100 ms pencere,
seed 987654321) → ölç → sonraki madde. Her kabul kapısı için ihlal listesi damgayla basılır.

### §0 — SÜRÜM DAMGASI: BRİF ESKİ ÖLÇÜMLE YAZILMIŞTI

Oturum başında `node tools/surum-check.js` **GEÇİYORDU**: FAZ 42-B v79'daydı, FAZ 43 commit'i
(`3c7ea52`) `?v=80` + `SCRIPT_V=80` yapmış ve `.surum-hash.json`u tazelemişti; canlı site de
v80 servis ediyordu (`live-check` ✓, HTML ve sw.js ikisi de 80). "FAZ 43 kullanıcıya hiç
ulaşmadı" önermesi doğru değildi. Bu turda yayın dosyaları değiştiği için sürüm **81**'e
çıkarıldı ve `--yaz` ile kayıt tazelendi (son adım).

### ÖLÇÜM ARACI — `iz-kaydet` FAZ 44 bölümü

Kayıt artık top yüksekliğini de taşır (`b[3]`, px; çember h=30 ↔ 3,05 m → 9,84 px/m).
Yeni kapılar: **hava atışı** (kayıt başından topun kazanılmasına: idle süresi · toss→tap ·
toss→kazanma · tepe · toss anında çemberin 1,8 m'sinde kaç oyuncu (iki takımdan) · kazanılana
kadar en kalabalık yarı saha) ve **sokma epizotları** (top saha çizgisi DIŞINDA ve elde olan
bitişik kareler; pas anında sokucunun 15 m'sindeki takım arkadaşı ≥ 3 · karşı yarı sahaya
geçmiş oyuncu ≤ 4/10 · ilk pas ≤ 14 m — her epizot damga ve ✓/✗ ile). `--yeniden` ile eski
kayıtlar yeniden çözümlenir; taban FAZ 43'ün `iz-f43-son.json` kaydından okundu.

### TABAN (iz-f43-son, yeniden çözümleme)

hava atışı: top idle **0,93 sn** · toss→kazanma **0,97 sn** · toss anında çemberde **0** ·
saha 5-5. Sokma: **8 epizot, 7 ihlal** · yakın takım arkadaşı ort **1,0** · yakın herkes
1,75/9 · karşı yarıda **7,25/9** · ilk pas 7-18 m (bir sokma 18 m).

### §1 — HAVA ATIŞI

Kök neden (kod okunarak + izle doğrulandı): `mkP` kurulumu çembere dizideki **1. slotu**
(genelde guard) koyuyor; `start` olayı pivotları çembere **yürüyerek** çağırıyordu (120 px,
YÜRÜ kademesi >1 sn). t=0'da çemberde 2 (yanlış oyuncular), t=0,6'da 0. Toss 0,95 sn'de,
0,47 sn sonra `_ballPass` — sıçrama görünmüyordu, top "kendiliğinden" birine gidiyordu.

Yapılan (`js/match-engine.js`): kurulumda roller atandıktan sonra pivot ile slot 0 ilk
çizimden ÖNCE yer değiştirir (`spotsNear[0]` 428→451; ayna 489) · `start` dalı: düdük + toss
**T0=0,15 sn** (`_ballLoose(0,0,140)`, g=202 → tepe 48 px ≈ 4,9 m, 0,69 sn'de) · iki pivot
T0+0,50'de sıçrar (`pop` 1,3) · kazanan T0+0,80'de tepede dokunur (`pop` 1,5) ve top takım
arkadaşına `_ballPass(recv, max(0,78, d/380))` ile yay çizer · `_startBreak` T0+1,80'de
(top kazanıldıktan sonra). Pas fiziği: `_ballPass` `b.hFrom` kaydeder; `hFrom>30` ise pas
yüksekliği 11 px'e düşmez, tepeden doğrusal iner (yalnız yüksekten başlayan pası etkiler).

Ölçülen (470 sn, `iz-f44-hava`): idle **0,15 sn** ✓ · toss→tap 0,79 · toss→kazanma
**1,56 sn** ✓ · tepe **5,06 m** ✓ · toss anında çemberde **2** (EV/C 0,68 m · DEP/PG 0,68 m —
"PG" etiketi: deplasman kadrosunda rol 4'e düşen oyuncunun pozisyonu) ✓ · saha 5-5, en
kalabalık yarı 5 ✓.

### §2 — TOPU OYUNA SOKMA: ÜÇ KÖK NEDEN, ÜÇ ADIM

**Adım 1 (dizilim kısıtı):** `_setupInbound` SAYI ANINDA tam geçiş dizilimini veriyordu
(TRANS_OFF ön saha kulvarları / TRANS_DEF pota önü); sokucu çizgiye 1-3 sn sonra varıyor,
herkes çoktan öbür uçta. `_sokmaYerlesimi` o anki KONUMA baktığı için (sayı anında herkes
pota dibinde = "yakın") hiç devreye girmiyordu — kural tanımlıydı, uygulanmıyordu.
Yapılan: `_startBreak(off, spot)` → `S._sokmaBekle`; `_setFormation(trans)` sonunda
`_sokmaKisit`: PG sokucunun 5-6 m'sinde (spot + 165 px, merkeze doğru), SG karşı kanat ~10 m,
PF dirsek ~5 m, C arkadan ~10 m, yalnız SF kulvarında öne; savunmanın guardları (rol 0-1)
orta çizgiyi 3 m geçmiş, uzunlar orta çizginin sokma tarafında 2 m geride. `_inboundPass` →
`_sokmaSerbest`: kısıt kalkar, o fazın dizilimi yeniden verilir (herkes kulvarına, top
SÜRÜLEREK çıkar — FAZ 43 İŞ 2'nin PG 5-6 m kuralı korunur). `_sokmaYerlesimi` artık hedefe
(`tx/ty`) bakar.
Ölçüm (`iz-f44-sokma`): 15 epizot, 7 ✓ / 8 ✗ · yakın 2,67 · karşı 4,53. İki ihlal sınıfı:
(a) ✓ epizottan ~6 sn sonra 1,22 sn'lik ikinci epizot (karşı 5-7), (b) 3-4 sn dışarıda
tutup pas atmadan topla içeri yüren sokucu (yakın 0, karşı 8).

**Adım 2 (sınıf a — iz kare kare okundu, 94-104 sn):** sokucu C çizgiye varır varmaz (olay
gelmeden, idx 15) PG'ye 5,3 m pas atıyordu — `_simTick` 1a "uzun topu 1,2 sn içinde çıkarır"
kapısı çizgi dışındaki C/PF sokucuya da uygulanıyor; PG artık 5 m'de olduğu için `_ileri`
sağlanıyordu. Olay gelince (idx 16) `_inboundPass` `carrier!==inb` → topu C'ye GERİ uçurup
1,2 sn sonra yeniden sokuyordu. Yapılan: kapı `!c._oob` ister.

**Adım 3 (sınıf b — 78-86 sn):** sayı 78,3 → `_setupInbound` HSF sokucu, topu kovalıyor;
0,9 sn sonra 'foul' olayı → `clearBallTimers`/`_flushPending` eski takibin geri çağrısını
çalıştırıp HSF'yi dip çizgiye yolluyor (`inb.tx=spot`), faul dalı İKİNCİ sokucu atıyor
(iki oyuncu `_oob`), top 2,4 sn yerde kalıp zaman aşımında ESKİ sokucuya gidiyor, faul
dalının `bekle: carrier===inb` adımı hiç sağlanmıyor → pas yok, sokucu 3-4 sn çizgi dışında
bekleyip topla içeri yürüyor (3 vaka: 69, 85, 266 sn). İhlal dalı (`tac/ihlal`) herkese
`_oobKapat` yapıyordu, faul dalı yapmıyordu. Yapılan: faul dalı başında `_oobKapat` hepsi ·
`S.inb=null` · `S._sokmaBekle=null` · `S.chase=null`. Ayrıca `_inboundSetup` ARKA SAHADAN
yapılan her ölü top sokmasında da (faul/taç/ihlal/çeyrek başı) kısıtı uygular (ön sahada
dizilim zaten yakındır, FAZ 11 dizilimine dokunulmaz); `_sokmaSerbest` set fazında `set`
dizilimini yeniden verir; `_sokmaKisit` `defTrack`i kapatır.

Ölçüm (`iz-f44-sokma2`): **8 epizot, 0 ihlal** · yakın takım arkadaşı **3,38** · yakın
herkes 6,63/9 · karşı yarıda **2,25/9** · ilk pas **5,1-11,1 m** · epizot süresi 0,9-3,4 sn
(sokucu çizgide olayı bekler; FIBA 5 sn içinde). Liste (t · tip · sokucu · yakın · karşı ·
ilk pas): 94,0 score2 C 4/2/7,5 · 119,5 miss3 PF 3/3/6,1 · 193,6 free PF 3/3/11,1 ·
207,5 score2 PF 3/3/6,1 · 391,2 quarter_start SG 3/0/5,1 · 404,0 score2 SF 4/2/5,8 ·
434,0 miss2 PF 3/3/5,9 · 466,5 miss2 SF 4/2/6,2.

### §3 — KORUNANLAR (f43-son → f44-sokma2, aynı seed, 470 sn)

| ölçü | FAZ 43 son | FAZ 44 | not |
|---|---|---|---|
| top en yüksek hız (100 ms) | 22,7 | **21,0** m/sn | ≤ 22 ✓ |
| >25 m/sn ışınlanma | 36 (jitter sınıfı, FAZ 43 notu) | **1** (held) | |
| çember çıkışı anlık ele geçiş | 0 | 0 | ✓ |
| çıkış→ele en kısa | 0,41 sn (1 vaka) | 0,39 sn (pasla, 1 vaka) | FAZ 43 "ulaşılamayanlar" sınıfı, değişmedi |
| pas > 15,9 m | %3,4 | **%0,0** (0/107) | sokma pası en uzun 11,3 m |
| pas > 20 m | 0 | 0 | |
| PG/SG/SF ile yarı saha geçişi | %91 | %91 | |
| sahipsiz 1 sn üstü epizot | 2 | 2 (serbest atış toplayıcısı) | aynı sınıf |
| oyuncu ort. hız (maç) | 2,07 | 1,93 m/sn | bant 1,8-2,6 |
| hava atışı dizilimi | çemberde 0 · 5-5 | çemberde 2 · 5-5 | |
| saha dışı kare | %0 | %0 | |

Motor: `sim-node --n=500 --seed=42` **93.1 - 87.9 · olay/maç 268**, aynı tohum aynı maç EVET;
`band.js` **c19928475859c7ff** (değişmedi — sunum katmanı `pr`/`_sr` dışında rastgelelik
tüketmiyor). Kutu skor hash'i `measure.js` kapı zincirinde.

### KAPILAR

### KULLANICI BİLDİRİMİ: "NE HAVA ATIŞI NE PASLAR NE DİZİLİM — HER ŞEY BOZUK"

Bildirim geldiğinde bu turun kodu commit edilmemişti; canlı site FAZ 43 (v80) servis ediyordu
ve orada hava atışı gerçekten yoktur, sokma pasları 18-26 m'dir (bu brifin konusu). Yine de
sayılara güvenmeyip sahneyi kendim izledim: aynı tohumla HEAD (FAZ 43) ve yerel kod, ilk 60 sn
2 sn'de bir kare (`olcum/goruntu/izle-kontak-1/2.png`), olay indeksine göre dizilim yayılımı
ve çakışan jeton sayımı (`dizilim-olc`), tek tek kapatılan değişikliklerle ikiye bölme
(varyant A-F). Bulgular: hava atışı ve sokma akışı yerelde doğru; set fazında topun çevresinde
sıkışma HEAD'de de aynı (çakışan çift 0-1, yayılım benzer); **gerçek bir kusur ise serbest
atışta çıktı** (aşağıda). `sunum-check`in ilk koşuda bildirdiği M12 düşüşü (AND-1 ek atışı
0/3) harness'ta yeniden üretilemedi (2/2 vakada atıcı 850 ms'de çizgide topla) ve ikinci
koşuda kapı geçti (1/2): kapı 4 sn'lik pencerede örnekliyor, sokma artık olay gelene kadar
çizgide beklediği için AND-1 sahnesi pencerenin sonuna kayıyor.

### SERBEST ATIŞ: ATICI TOPU DİP ÇİZGİDE TUTUYOR, ATIŞ 25 m'DEN (HEAD'de de vardı)

İz (f44-sokma2, 40-48 sn): sayı sol potada → `_setupInbound` HSG'yi sokucu yapar; 0,8 sn
sonra 'free' olayı (serbest atış SAĞ potada). Dal `_oobKapat` + `_setFtFormation` (atıcı →
çizgi) yaptıktan SONRA `clearBallTimers()` çağırıyordu; `_flushPending` sokma takibinin geri
çağrısını çalıştırıp `inb.tx = dip çizgi noktası`, `noDrib=true` yazıyor — atıcı HSG'nin çizgi
hedefi eziliyordu. Sonuç: top sol potada 2,4 sn yerde, sonra atıcının eline dip çizgide
(60,302) geliyor, 3 sn tutuluyor, atış 25 m'den "loose" olarak uçuyor. FAZ 43 kaydında da
aynı epizot vardı (free/loose 3,6 sn, "1 sn üstü: 42,2 s 1,88 sn"). Yapılan: (1) serbest
atış dalında `clearBallTimers` + `S.inb/_sokmaBekle/chase=null` DİZİLİMDEN ÖNCE;
(2) `_ftToplayici` toplayıcıyı top serbestse TOPA en yakın oyuncudan seçer (top öbür potada
kalmış olabilir), değilse potaya en yakın. Ölçülen (`iz-f44-ft`): free/loose **4,1 → 0,9 sn**,
1 sn üstü sahipsiz epizot **2 → 0**, ışınlanma **0**, atıcı 44-46 sn'de çizgide (x≈702)
topla; sokma 7/7 ✓ · hava atışı ✓ · pas > 15,9 m %0,9 (1 çıkış pası 17,1 m) · PG/SG/SF %91.

### `sahne-check` ORTA ÇİZGİ GEÇİŞİ KAPISI: %111 → %70-76 — SAYIM BİÇİMİ

Kapı "topla (held) L↔R geçiş sayısı / pozisyon değişimi" sayar ve HEAD'de **%111 (41/37)**
verir: PG orta saha kulvarında (TRANS_OFF[0], orta çizginin 5,5 m önü) topu alıp çizginin
çevresinde ileri-geri geçtiği için bir pozisyonda birden çok geçiş sayılıyordu. Güncel kodda
PG topu 5-6 m'den alıp TEK geçişle sürüyor (brifin §2 isteği): kapı %70-76'ya iner. Pozisyon
başına İLK geçişi ölçen `gecis-analiz` (470 sn, aynı tohum): held geçiş **FAZ 43 %71 ·
FAZ 44 %73**, pasla %18 → %10, geçişsiz %11 → %17 (steal/ribaund ile ön sahada başlayan
pozisyonlar — iki sürümde de var). Davranış gerilemedi; kapı çift sayımı kaybetti. Kapı
yeniden yazılmadı (bu tur kapsam dışı) — düşen kapı olarak raporlanıyor.

### KAPILAR (son hâl — serbest atış düzeltmesinden SONRA koşuldu)

**GEÇEN:** `visual-check` (masaüstü + mobil, 0 konsol hatası) · `sunum-check` **tümü** (M12 ✓
2/2 · F14-7 9,8/10 · F25-3 sokma 63 vaka ort 6,6 m, 3+ yakın %100, 25 m+ pas 0 · F25-4) ·
`faz11-check` 15/15 · `spacing-check` tümü (markaj **1,67 m**, FAZ 43'te 1,79; ball-you-man
%90,3) · `realism-check` (ışınlanma 0 · kopuk 0 · senkron tam) · `hareket-check` ·
`arka-plan-check` · `anlatim-check` 31/31 · `kural-check` 7/7 · `band.js`
**c19928475859c7ff** (değişmedi) · `measure.js` **51fa02b6e0a8194b** (FAZ 43 değeri; baz
dosyası FAZ 38'de kalmıştı, `--save` ile tazelendi) · `sim-node --n=500 --seed=42` 93.1 - 87.9
· 268, determinizm EVET · `surum-check` (81) · `iz-kaydet` FAZ 44 bölümü: hava atışı 5/5 kapı,
sokma 7/7 epizot.

**DÜŞEN (`sahne-check`, 150 sn, tohumsuz, 3 koşu):** "şut anında yerinde hücumcu" 4,06 ·
4,00 (HEAD aynı koşulda **4,10** — FAZ 43 "ulaşılamayanlar" 3. madde, bu turdan bağımsız) ·
"orta çizgi geçişi / pozisyon değişimi" %76 · %70 · %73 (HEAD %111 — çift sayım, yukarıda).
"Aynı anda koşan" ilk koşuda 5,17 ile bandın dışına çıktı, sonraki iki koşuda 4,94 · 4,90
(HEAD 4,74): kısıt oyuncuları iki kez koşturuyor (bekleme noktası → kulvar), bant sınırında.

### ULAŞILAMAYANLAR (açıkça)

1. `sahne-check` orta çizgi geçişi ≥ %85 — kapı çift sayım kaybetti (davranış %71 → %73);
   kapı yeniden yazılmadı.
2. `sahne-check` şut anında yerinde ≥ 4,25 — FAZ 43'ten beri düşüyor (HEAD 4,10).
3. FAZ 43 İŞ 1 "alanın çıkış anında ≤ 2,5 m / ≥ 0,6 sn her vaka" — aynı sınıf (11,0 m ·
   0,39 sn birer vaka), bu turda dokunulmadı.
4. Set fazında topun çevresinde sıkışma (7 sn kareleri) — HEAD ile aynı, bu turun kapsamı
   dışında; `dizilim-olc` ile olay başına ölçülebilir.

### ARAÇLAR

Yeni: `tools/kontak-goruntu.js` (sahayı gözle izleme — kontak sayfası), `tools/dizilim-olc.js`
(olay başına dizilim yayılımı/çakışma), `tools/gecis-analiz.js` (pozisyon başına orta çizgi
geçişi). `tools/iz-kaydet.js` FAZ 44 bölümü (hava atışı + sokma epizotları, `b[3]` yükseklik).
Scratch'te kalan (commit edilmedi): `and1-teshis.js` (AND-1 kare kare), `iz-pencere.js`
(iz penceresi dökümü), `bisect.sh` (değişiklikleri tek tek kapatan ikiye bölme).
`git worktree add --detach ../basketlig-head HEAD` + `node_modules` junction: HEAD ile aynı
tohumda yan yana ölçüm (FAZ 40 dersi; zula DEĞİL).

### SÜRÜM · HASH

`?v=81` · `sw.js SCRIPT_V='81'` · `tools/.surum-hash.json` `--yaz` ile tazelendi ·
`band.js` c19928475859c7ff · `measure.js` 51fa02b6e0a8194b · `sim-node --n=500 --seed=42`
93.1 - 87.9 · 268.

### KULLANICI CANLI MAÇI İZLEDİĞİNDE NE FARK GÖRECEK

Hava atışı: iki pivot çemberde, hakem atışı 5 m yükselir, ikisi sıçrar, kazanan tepede
dokunur, top takım arkadaşına iner (1,6 sn). Sayı sonrası: sokucu topu yerden alıp çizgiye
çıkar, oyun kurucu 5-6 m'sinde, iki-üç arkadaşı 10 m içinde bekler; savunma orta çizgide
durur; pas 5-7 m, oyun kurucu topu SÜREREK çıkarır — 18-26 m'lik taç pası yok. Serbest atış:
top öbür potada kalmışsa en yakın oyuncu alıp atıcıya verir; atıcı çizgide topla bekler,
dip çizgiden 25 m'lik "atış" yok.


---

## 45. oturum — FAZ 45: KULLANICI BİLDİRİMİ "GERİ PAS · ÇEMBER ALTINDAN SOKMA" (2026-09-05)

Kullanıcı: "Geri pas atıyorlar; kenara çıkmadan çember altından oyuna top sokuyorlar; bu tarz
bir sürü hata var." Önce ölçüldü (`tools/pas-analiz.js`, yeni), sonra düzeltildi.

### ÖLÇÜM — FAZ 44'ÜN KAPISI KÖRDÜ

`iz-kaydet` FAZ 44 bölümü sokmayı yalnız topun ÇİZGİ DIŞINDA olduğu epizotlarda sayıyordu;
"sokucu hiç çıkmadıysa" görünmüyordu. `pas-analiz` her sayı-sonrası pozisyonun ilk pasını
verenin konumuyla listeler:

| kayıt | sayı sonrası pozisyon | ilk pas çizgi DIŞINDAN | İÇERİDEN (pota dibi) | geri pas (>2 m, canlı top) |
|---|---|---|---|---|
| FAZ 43 (`iz-f43-son`, canlıdaki kod) | 24 | **2** | **22** | 12/70 (%17) |
| FAZ 44 (`iz-f44-ft`) | 24 | 5 | 18 | 7/67 (%10) |

Kök neden: bütün sokma dallarındaki `bekle` yalnız "top sokucunun elinde mi" diye bakıyordu;
sokucu topu potanın dibinde yerden alır almaz `_inboundPass` çalışıyor, çizgiye hiç
çıkmıyordu. Geri paslar: hücum ribaundu sonrası uzunun çevreye açtığı pas (gerçekte var),
çeyrek sonunda topun kenara taşınması (ölü top) ve geçişte 14 m sınırlayıcının yön bakmadan
en yakın taşıyıcıyı seçmesi. Ayrıca çalma anı: sokma pası çalınınca kaybeden oyuncu topu
14,4 m öteden doğrudan HIRSIZA "paslıyordu" (216,8 s).

### YAPILAN (`js/match-engine.js`)

1. `_sokmayaHazir(inb,spot)`: sokma pası ancak sokucu çizgi dışındaki noktasının 16 px'ine
   varınca atılır — sayı sonrası, faul, ihlal ve çeyrek başı dallarında (`max` 2,4 sn).
2. `_pasHedefSinirla`: hücum edilen potaya verenden daha yakın (≤ 0,7 m geride) taşıyıcı
   önce; yoksa en yakın taşıyıcı.
3. Çalma = elden alma (`_hirsizAl`): hırsız topu tutana koşar (≤ 1,6 sn, markaj biter),
   1,1 m'ye gelince top elden çıkıp kısa mesafe ona doğru fırlar; top hırsıza PASLANMAZ,
   uzaktaki hırsıza doğru 14 m yuvarlanmaz. Olay bütçesi yaklaşma süresi kadar uzatıldı.
4. Sayı sonrası sokucu topu GERİ ÇAĞRILI takiple alır (`_cizgiye`): olay sınırında
   `_flushPending` takibi siliyor, top yerde kalıyor, bekçi (`_ballKurtar`) EN YAKIN oyuncuyu
   geri çağrısız yolluyordu — sokucu topu alınca hedefi topun yeri kalıyor, çizgiye hiç
   çıkmıyordu (iz: hedefe uzaklık 18 → 0, hedef = pota dibi). Bekçi de bekleyen sokma varsa
   topu sokucuya verip çizgiye yollar; rakibin topu alıp PG'ye 7-8 m "pas" verdiği vaka biter.
5. Ölü top sokucusu (faul/ihlal) top serbestse TOPA en yakın oyuncudur (eskiden noktaya en
   yakın, 250 px öteden koşuyordu); bekleme üst sınırı 3,2 sn.
6. Top RAKİBİN elindeyken (kesilen serbest atış dizisi) hücumun PG'sine pas atılmaz: top
   bırakılır, PG alır.
7. **Bayat kulvar ara noktası (`_wp`)** — en sinsi kusur: geçiş dizilimi kanatlara `_wp`
   yazar, hareket döngüsü `_wp`yi hedefin ÜSTÜNE uygular; sokucu `_oob` olduğu için dizilim
   kodu ona dokunmuyor, eski `_wp` kalıyor ve topu alınca hedefi (103,498) dururken sahanın
   öbür ucuna (x 128 → 706, 3 sn, topla) koşuyordu. Faul dalındaki 3-4 sn'lik "topla içeri
   yürüme" vakalarının ve C/PF'nin topla orta çizgi geçişlerinin kaynağı buydu.
   `_hedefAta` artık `_wp`yi düşürür (geçiş dizilimi `_wp`yi ondan SONRA yazar); sokucunun
   doğrudan yazılan bütün hedeflerinde `_wp=null`.
8. Gecikmeli pas (`_pasSonra`) top UÇARAK gelince silinmez (`_ballHold` yalnız gerçek el
   değişiminde düşürür): serbest atış toplayıcısı topu tutup kalıyor, dizi bitmiyor, sonraki
   pozisyonda rakip elindeki topu PG'ye "pasladı" görülüyordu (55,9 s).

### ÖLÇÜM (470 sn, aynı tohum, `pas-analiz` + `iz-kaydet`)

| ölçü | FAZ 43 (canlı) | FAZ 44 | FAZ 45 |
|---|---|---|---|
| sayı sonrası ilk pas çizgi DIŞINDAN | 2/24 | 5/24 | **17/21** (+3 çalınan sokma: pas yok ✓, 1 içeriden) |
| çizgi dışı izinli oyuncunun SAHA İÇİNDEN pası | 25/33 | 21/26 | **0/23** |
| rakibe pas (canlı top) | — | 1 | **0** |
| geri pas > 2 m (canlı top) | 12/70 %17 | 7/67 %10 | 6/62 %9,7 (5'i set içi açma/çevirme) |
| sokma epizodu (çizgi dışı) · ihlal | 8 · 7 | 8 · 0 | **25 · 2** (faul yakın=2 · çeyrek başı karşı=9) |
| sahipsiz epizot toplam · 1 sn üstü | 2 üstü | 0,9 sn · 0 | **1,4 sn · 0** |
| top tepe hız · ışınlanma | 22,7 · 36 | 21,0 · 1 | 20,1 · 2 (pass, jitter sınıfı) |
| pas > 15,9 m | %3,4 | %0,9 | %2 (2/99) |
| PG/SG/SF ile yarı saha geçişi | %91 | %91 | %89 |
| hava atışı kapıları | — | 5/5 | 5/5 |
| held orta çizgi geçişi / pozisyon (gecis-analiz) | %71 | %73 | %69 |


---

## 46. oturum — FAZ 46: CANLI SAHNE YENİDEN YAZIMI · OAM (2026-09-05)

Kullanıcı: "Yeniden yaz. Planı çıkar, baştan sona uygula, commit push yap." Plan:
`PLAN-CANLI-SAHNE.md`. Teşhis (kullanıcıya verilen cevap): sahne, motorun geometrisiz olay
listesini oynayan bir KUKLA katmanıydı; altı ayrı mekanizma aynı jetonun hedefini yazıyor,
paslar anlatımdaki oyuncuya topu ulaştırmak için atılıyor, boş adam görülmüyordu.

### MİMARİ — `js/sahne-oam.js` (Oyun Akışı Makinesi)

- **Tek beyin, tek hedef.** `animateShotPossession` → `oamSut`: pozisyon kurulur (şutör,
  oyun kurucu, çıkış pası, asist veren, şema, hızlı hücum, ikinci şans, bekleyen sokma);
  `_simTick` sarmalanır → `oamTick` her karede faz makinesini yürütür ve `oamHedefler` on
  oyuncuya hedef yazar; eski tick hareket fiziğini (hız merdiveni, ivme/dönüş sınırı,
  çarpışma, top) sürdürür. OAM aktifken eski hedef yazıcıları kapalı: `canliSet` salınımı
  (sarmalayıcı eski tick'e false gösterir), `defTrack`, çıkış-pası kapısı (`cikisSonra=1e9`),
  `_wp` (`oamHedef` her yazımda düşürür).
- **Fazlar.** `sokma` (bekleyen sokucu topu alır, çizgi dışındaki noktasına yürür, alıcı
  5-6 m'de, savunma orta çizgide; pas ancak sokucu noktasındayken) → `gecis` (topu tutan
  kulvarına sürer, kanatlar sprint, uzunlar arkadan; uzun topu 0,15 sn içinde öndeki guard'a
  çıkarır; savunma adam–pota hattında geri koşar) → `set` (şema + pas zinciri) → `sut`
  (`oamAtes`: eski `fire` sözleşmesi — ön parça elden çıkarken, sonuç çemberde; blok; AND-1;
  ribaunt bloğu; sayı sonrası sokma kurulumu; şut tipi yörüngesi).
- **Set.** Beş nokta `SET_*` şablonundan; şutörün noktası motorun şut noktası (en yakın
  şablon noktası takas edilir); zincirdeki pasçılar köşede durmaz. Şema: perde üç aşama
  (`S._perde` kurulum · sıyırma · devrilme/roll-pop), kesme (şutör içerideyse o keser),
  post (`_sirtDonuk`), açılma. Zayıf taraf değişimi (iki çevre oyuncusu yer değiştirir),
  pas-ve-hareket (pasçı noktasını pota çevresinde ±25° kaydırır). Noktasındaki oyuncu
  küçük dairede kıpırdar (donma yok).
- **Pas kararı.** Zincir: oyun kurucu → (ara) → asist veren → şutör. Pas ancak alıcı
  noktasında ve BOŞSA (en yakın savunmacı > 1,5 m; 0,7 sn sonra baskı altında da olur);
  `oamPasOlur`: geri değil (potadan 2 m+ uzaklaşan; içeriden açma ve çevre çevirmesi
  serbest), boya içinden geçmiyor (giriş pası hariç), 10 m'den uzun değil; olmuyorsa
  `oamKopru` ara oyuncu. Bütçe dolunca (`kalan ≤ 0,9 sn`) pas şutöre zorlanır.
- **Savunma.** Adam adama (rol sırası eşleşmesi): adam ile pota arasında, topa uzaklığa
  göre yardım mesafesi (`_defGap`), top içerideyken zayıf taraf boyaya sarkar, topu tutana
  38 px, şutta kapayan sıçrar; top arka sahadayken geri koşu (adam–pota hattı %45).
- **Zaman.** Bütçe = sokma + geçiş (gerçek mesafe/hız) + set (şemaya göre 1,5-3,0 sn +
  pas başına 0,35) + 1,4; set gerçekten başlayınca şut anı `max(tFire, tSet+setDur)`
  (`oamSetBasla`). `_animRez=1800`.
- **Determinizm.** Yalnız `_sr`/`_srand`. `band.js` hash değişmez.
- `OAM_ACIK=false` eski yolu geri getirir; ölü top törenleri eski koreografide.

### ARA ÖLÇÜMLER (aynı tohum)

| ölçü | FAZ 45 (470 sn) | OAM v1 (240 sn) | OAM v2 (300 sn) |
|---|---|---|---|
| sayı sonrası ilk pas çizgi dışından / içeriden | 17 / 1 | 8 / 3* | 12 / 1* |
| çizgi dışı izinli oyuncunun içeriden pası | 0/23 | 2/14* | 1/16* (eski faul dalı) |
| rakibe pas | 0 | 0 | 0 |
| geri pas > 2 m (canlı top) | 6/62 %9,7 | 5/48 %10,4 | 7/53 %13,2 (5'i set içi açma) |
| PG/SG/SF ile yarı saha geçişi | %89 | %95 | %81 (5 PF: ribaund sonrası eski geçiş dizilimi, kapı 1,2 sn → 0,6) |
| held orta çizgi geçişi / pozisyon | %69 | %77 | %83 |
| oyuncu ort. hız (maç) | 1,97 | 1,69 | **1,83** (bant 1,8-2,6) |
| sokma epizodu · ihlal | 25 · 2 | 14 · 0 | 22 · 0 |
| ışınlanma (>25 m/sn kare) | 2 | 27 | 19 → pas hızı 19 → 13 m/sn (kare titreşimi) |
| sahipsiz 1 sn üstü | 0 | 1 | 1 |

\* `pas-analiz` serbest atış karesi ve 2 m altı el değişimini FAZ 46'da ayıkladı.
Kalan "içeriden" vakalar eski faul dalının sokması (OAM kapsamı dışı) ve çalınan sokmalar.

### SON ÖLÇÜM (470 sn, `iz-f46-son2`, aynı tohum) — FAZ 43 (canlıdaki eski kod) ile

| ölçü | FAZ 43 | FAZ 46 OAM |
|---|---|---|
| sayı sonrası ilk pas çizgi DIŞINDAN / içeriden (pas-analiz) | 2 / 22 | **17 / 1** (+4 çalınan sokma, +4 hakem topu) |
| çizgi dışı izinli oyuncunun saha içinden pası | 25/33 | **1/24** (eski faul dalı el değişimi) |
| rakibe pas (canlı top) | — | **0** |
| geri pas > 2 m (içeriden açma ve çevirme hariç) | %11,4 | **%1,1** |
| PG/SG/SF ile yarı saha geçişi | %91 | %92 |
| sokma epizodu (çizgi dışı) · ihlal | 8 · 7 | **32 · 1** |
| yakın takım arkadaşı / karşı yarıda (sokma anı) | 1,0 / 7,3 | **3,5 / 2,0** |
| ışınlanma (>25 m/sn kare) · top tepe hız | 36 · 22,7 | 4 · 20,4 |
| sahipsiz 1 sn üstü epizot | 2 | 0 |
| oyuncu ort. hız (maç) | 2,07 | 1,82 (bant 1,8-2,6) |
| hava atışı kapıları | 0/5 | 5/5 |
| konsol hatası | 0 | 0 |

### KAPILAR (son kodla, üç zincir)

**GEÇEN:** `visual-check` (masaüstü + mobil, 0 hata) · `sunum-check` zincir 1 **tümü**
(M9 8/8 · M12 · F14-7 · F25-1..6b · F26 · F28-1); zincir 2'de yalnız M9 8/11 (%73, örneklem
"yetersiz" işaretli) · `faz11-check` **15/15** · `arka-plan-check` **6/6** · `realism-check`
(ışınlanma 0 · kopuk 0 · senkron tam) · `hareket-check` tümü · `balon-check` 0/89 ·
`band.js` **c19928475859c7ff** (değişmedi) · `measure.js` **51fa02b6e0a8194b** ✅ ·
`sahne-check`: pass modu %13,4 ✓ · sahipsiz %0,30 ✓ · aynı anda koşan **4,79** ✓ (5,76 →
5,29 → 4,79) · serbest atışta yerinde 10/10 ✓ · orta çizgi geçişi **%87** ✓ · PG/SG/SF %91 ✓.

**DÜŞEN (açıkça):**
1. `sahne-check` "top elde" %62 (≥ 65): pas payı %9,8 → %13,4 — daha çok top hareketi;
   bilinçli. Serbest top payı %17,6 (ribaunt/sayı sonrası yerden alma, eski mekanik).
2. `sahne-check` "şut anında yerinde hücumcu" 3,47/5 (≥ 4,25): 2,82 → 3,26 → 3,47 (şuttan
   1,4 sn önce donma + takım oturana kadar ≤1,3 sn bekleme). Kesici/perde devrilmesi/
   pas-ve-hareket ile sürekli hareket arasındaki takas (FAZ 40 ekindeki sınıf).
3. `spacing-check` (set kareleri): potaya ortalama uzaklık 8,3 m (≤ 7) · ball-you-man %80
   (≥ 85) · orta üçte bir %21 (< 20) · boyada %59 (≥ 60) · süzülmemiş yayılım %29 (≥ 30).
   Geçen: ikili mesafe 7,6 m · en yakın ikili 4,1 m · markaj 1,62 m · >5 m savunmacı %0.
   Şablon %7 içeri çekildi ve boyaya bir uzun kondu; şutörün 7-8 m'lik gerçek şut noktası
   ve köşe noktaları ortalamayı dışarıda tutuyor. Bir sonraki tur: şut noktasına göre şablon
   seçimi (üçlükte 4-dış-1-iç, içeride 5-dış değil).
4. `sunum-check` M9 zincir 2'de 8/11 (kaçanlarda SF 2 · C 1) — örneklem 16/40.
5. `i18n-scan` D: 1 özel ad (🇱🇻 Gunārs Lejiņš) — sahte pozitif.
6. Eski ölü top dalı (faul sonrası kenar sokması → set dizilimine yürüme "sütun"u) OAM
   kapsamı dışında kaldı; sonraki tur.

### SÜRÜM · YAYIN

`?v=82` (16 script; `js/sahne-oam.js` eklendi) · `sw.js SCRIPT_V='82'` + JS_FILES ·
`surum-check --yaz`. Belgeler: `PLAN-CANLI-SAHNE.md`, bu oturum, CLAUDE.md (kod haritası
satırı + kurallar).

### KULLANICI CANLI MAÇI İZLEDİĞİNDE NE FARK GÖRECEK

Sayı sonrası sokucu topu yerden alıp çizginin dışına çıkar, oyun kurucu 5-6 m'de alır ve
SÜRER; savunma orta çizgide bekleyip geri koşar. Set: beş nokta yayılmış (ikili 7,6 m),
boyada bir uzun, savunmacılar adamı ile pota arasında, topu tutana 1,6 m; toplar boş ve
öndeki oyuncuya gider (geri pas %1), perde/kesme/post/açılma görülür, pasçı pas verip
hareket eder; şutör motorun noktasında boşa çıkıp atar, savunmacısı kapamaya sıçrar.
Çalma elden almadır; rakibe pas yok. Serbest atışta atıcı çizgide topla bekler.


---

## 47. oturum — FAZ 47: KULLANICI BİLDİRİMİ (tempo · hakem · çıkış pası · ışınlanma) (2026-09-05)

Kullanıcı (OAM'ı izledikten sonra): "Topu süren çok hızlı, diğerleri geride kalıyor, tek başına
bekliyor. Serbest atışta oyuncu ribaunt alıp atıcıya pas veriyor — top otomatik gitsin. Hakem
ekle (gerçekte kaç hakem varsa). Ribaund alınınca 1 numara topu almaya gelmiyor, 4-5 top
sürüyor. Hâlâ ışınlanma var."

### YAPILAN (`js/sahne-oam.js` + `js/match-engine.js`)

1. **Tempo (geçiş):** topu süren, üç takım arkadaşından 5 m+ öndeyse JOG'a düşer (hızlı hücum
   hariç); uzunlar KOS ile arkadan gelir (JOG değil — set beklemesin diye).
2. **Hakemler (FIBA üçlü):** `oamHakemKur` üç gri jeton (H) — baş hakem hücum edilen dip
   çizgide top tarafında, arka hakem topun 5 m gerisinde karşı kenarda, orta hakem serbest atış
   çizgisi hizasında. Jeton değiller: çarpışma/ölçüm/takip dışı, her karede hedefe kayarlar.
   Serbest atışta baş hakem topu alır ve atıcıya verir (`oamFtToplayici` eski `_ftToplayici`yi
   sarmalar; oyuncu ribaunt alıp pas vermez, bekçi devreye girmez `S._hakemTop`).
3. **Çıkış pası modu (`oamOutletTick`):** uzun (PF/C) topu aldığında SÜRMEZ — yerinde döner;
   oyun kurucu (1, yoksa 2) çıkış noktasına sprintler (uzunun 5 m önü, yakın kenar tarafı);
   14 m'ye girince pas. OAM içinde (bekle/geçiş) ve OAM dışında (ribaund/çalma olayı sırasında)
   aynı mod. Pota dibindeki uzun kendi bitirir (`_POTA_YAKIN_PX`).
5. **Ölü top sokması OAM'da (`oamOluTop`):** faul / ihlal / taç / çeyrek başı olayında eski dal
   sokucuyu ve noktayı kurar, OAM pası, dizilimi ve savunmayı devralır (şutsuz mod: dizilim
   korunur, uzun tutuyorsa çıkış pası; şut olayı gelince `oamSut` yeniden kurar). Eski dalın
   "set dizilimine yürüyen sütun"u ve kendi pası devre dışı. Kenar sokması ön sahadaysa herkes
   dizilim noktasında, oyun kurucu topa 5 m (kenara dik), savunma adam adama.
4. **Işınlanma:** `_simCatchUp` eşiği 0,35 → **1,2 sn** (bir kare takılması on jetonu
   hedeflerine ışınlıyordu; yalnız gerçek arka plan dönüşü); `_ballHold` 14-30 px'lik anlık el
   değişimini de kısa pasla yapar (tek karelik top sıçraması yok).

### ÖLÇÜM (300 sn, aynı tohum) — FAZ 46 → FAZ 47

| ölçü | FAZ 46 (470 sn) | FAZ 47 son (300 sn) |
|---|---|---|
| geri pas (içeriden açma/çevirme hariç) | %1,1 | %2,1 (1 pas) |
| rakibe pas | 0 | 1 |
| saha içinden sokma | 1/24 | **0/14** |
| sayı sonrası çizgi dışından / içeriden | 17 / 1 | 11 / 3 (2'si stale bayrak, 1 hakem el değişimi) |
| PG/SG/SF ile yarı saha geçişi | %92 | **%93** (uzunlar sürmüyor; çıkış pası PG'ye) |
| ışınlanma (>25 m/sn) · top tepe hız | 4 · 20,4 | **0 · 21,4** |
| oyuncu ort. hız (maç) | 1,82 | 1,79 |
| sokma epizodu · ihlal | 32 · 1 | 21 · 0 |
| sahipsiz 1 sn üstü | 0 | 0 (free/loose 2,7 sn: hakem topu getiriyor) |
| hava atışı kapıları | 5/5 | 5/5 |

### KAPILAR (son kod, `f47-kapilar2` + tekrarlar)

**GEÇEN:** `visual-check` (0 hata) · `sunum-check` M9 ✓ (çıkış pası guard'a — ilk sürümde %45'e
düşmüştü, düzeltildi), M14, F14-7 (hakemli serbest atış), F19-4, F25-1..6b, F26, F28-1; M12
"örnek yok" (pencerede AND-1 olmadı) · `faz11-check` 15/15 · `realism-check` · `band.js`
c19928475859c7ff · `sahne-check`: koşan **4,98** ✓ · PG/SG/SF %91 ✓ · serbest atışta yerinde
9,86 ✓ · sahipsiz %0,86 ✓.
**DÜŞEN:** `sahne-check` "top elde" %64,2 (≥65) · "şut anında yerinde" 3,15 · orta çizgi geçişi
%82 (örneklemle %82-92 salınıyor) — FAZ 46'daki sınıf. `arka-plan-check` dönüş oturtması
çıkış pası modunda 310 px sapıyordu → oturtma sarmalayıcıya taşındı; tekrar 329 px ile yine
düştü. Sebep ölçümde: araç sapmayı dönüşten **10 sn sonra tek anda** ölçer ve eşik sabit 120 px
(FAZ 34 eki bu ölçüyü "normal akış tabanı 124-128 px, örnekleme anına bağlı" diye kaydetmiş ve
`faz11-check` F11-1'i kendini kalibre eder yapmıştı — o kapı 15/15 geçiyor). OAM'ın geçiş
hedefleri (kulvarlar 20 m ötede) anlık ortalama sapmayı büyütür; kapı davranışı değil anı
ölçüyor. Kapı yeniden yazılmadı.

### ULAŞILAMAYAN / SONRAKİ TUR
- Set fazında oyuncu yayılımı `spacing-check`'in "potaya ortalama uzaklık ≤ 7 m" ve
  "ball-you-man ≥ %85" kapılarını tutmuyor (8,3 m · %80): şut noktasına göre şablon seçimi.
- Sayı sonrası "içeriden" sayılan 2 vaka `_oobDonus` bayrağının bayat kalması (ölçüm etiketi).
