# PROGRESS — Charazay 2.0 (Basket Menajerlik)

Tek dosyalık basketbol menajerlik oyunu (`charazay2.0.html`). Steam yayınına hazırlık.

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
