# CLAUDE.md — Charazay 2.0

Bu dosya, bu depoda çalışan Claude Code oturumları için proje rehberidir. Yeni oturumda önce bunu ve `PROGRESS.md`'yi oku.

## Proje nedir?

**Charazay 2.0**, Türkçe, tek dosyalık bir **basketbol menajerlik oyunu**dur. Oyuncu bir kulüp menajeri olarak takım kurar, kadro/taktik yönetir, canlı maç simülasyonu izler, transfer yapar, altyapı/arena/ekonomi yönetir ve lig + playoff sezonları oynar. Steam yayınına hazırlanıyor.

- Ana oyun: **`charazay2.0.html`** (HTML gövdesi + CSS; JS `js/*.js` içinde, 18 `<script src>` — FAZ 46'da `js/sahne-oam.js`, FAZ 50'de `js/klip-data.js` + `js/sahne-klip.js` eklendi).
- Dil: arayüz ve tüm metinler **Türkçe**.

## Nasıl çalıştırılır?

Derleme/kurulum **yok** — statik bir HTML dosyası.

- **En hızlı:** `charazay2.0.html` dosyasına çift tıkla (tarayıcıda açılır) veya `Charazay-2.0-Chrome.bat` çalıştır.
- **Yerel sunucu ile** (portrelerin/asset'lerin sorunsuz yüklenmesi için önerilir): `Charazay-2.0-YEREL-SUNUCU.bat`.
- **Canlı (GitHub Pages):** https://winegg420.github.io/basketlig/charazay2.0.html — **yayında** (depo public, kaynak `master` / kök; push sonrası ~1-2 dk içinde güncellenir). Yayın sonrası doğrulama: `node tools/live-check.js`.

Oyun ilerlemesi **bugün** tarayıcıda **localStorage + IndexedDB** ile saklanır (otomatik kayıt + 3 manuel slot).

## Proje temeli — ÇOK OYUNCULU

**Charazay baştan beri çevrimiçi çok oyunculu olarak tasarlandı.** Maçlar **fikstür tarihinde
otomatik** oynanır; oyuncu o an oradaysa canlı izleyip müdahale eder (taktik, mola, değişiklik),
değilse sonucu döndüğünde görür. Rakipler gerçek oyuncular + sahipsiz takımları dolduran botlardır.

> **Maçların bugün art arda oynanabilmesi bilinçli bir test kolaylığıdır, hata değildir.**
> FAZ 10'da `?test=1` bayrağının arkasına alındı (`TEST_MODU`, `matchTimeGateOk` · `js/state.js`);
> fikstüre `scheduledAt` eklendiği gün kapı kendiliğinden devreye girer.

**Sunucu kararı: Supabase** (`KARAR-SUNUCU.md`) — **kod henüz yazılmadı.** Veri modeli
`db/schema.sql` dosyasında hazır; kod tabanında hiçbir bağlantı kurulmuyor.

**Lig yapısı** (`PLAN-LIG-YAPISI.md`): her ülkenin kendi lig piramidi · lig **18 takım**,
**17 maç**, tek devre · sezon **2 ay**, ayın 1'inde başlar · **play-off yok** (şampiyon lig
birincisidir; 2-5 yükselme, 15-17 düşme maçı) · boş yerleri **bot takımlar** doldurur ·
yeni oyuncu, boş bot takımı olan en üst ligde **istediği takımı devralır** (kadroya dokunulmaz).
**Sistem botu** (sahipsiz) ile **terk edilmiş takım** (sahibi var, 45 gündür girilmemiş) ayrı
kategorilerdir — ikincisi devralma havuzuna asla girmez ve sezonda en fazla 1 lig düşer.

## Teknolojiler

- **Saf HTML5 + CSS3 + vanilla JavaScript** — framework, build adımı, bağımlılık **yok**.
- Grafikler **inline SVG** (basketbol sahası, şut haritası, portre yedekleri) ve CSS.
- Ses: **Web Audio API** (`sfx()` — basit osilatör tonları).
- Kalıcılık: **localStorage** (durum) + **IndexedDB** (büyük string), sürüm geçiş migrasyonları var (`migrateEconomyV3ToV4` vb.).
- Dış kaynaklar: Google Fonts (Bebas Neue / Inter). Oyuncu portreleri `assets/portraits/` — **FAZ 17'den beri kova + yaş bandı şemasıyla** adlandırılır (`<kova>_<bant>_<sıra>.jpg`), sayılar `manifest.json` (sürüm 2) içinde; kodda sabit havuz boyu YOK.

## Depo yapısı

| Yol | Açıklama |
|-----|----------|
| `charazay2.0.html` | **Ana oyun** — HTML+CSS gövdesi. JS artık burada değil; sırayla `js/*.js` yüklenir (13 `<script src>`; ilk üçü dil katmanı). |
| `js/*.js` | **Oyun mantığı** — 11 çekirdek modül + 3 dil modülü (aşağıdaki kod haritası). |
| `index.html`, `Charazay-2.0-BASLAT.html` | `charazay2.0.html`'e yönlendiren giriş sayfaları. |
| `charazay-mentor-panel.html` | Geliştirici öz-denetim aracı — **oyunun parçası değil**, dokunma. |
| `assets/portraits/` | **468 oyuncu portresi** — FAZ 17 kova+bant adlandırması (`<kova>_<bant>_<sıra>.jpg`, ör. `akd_genc_0042.jpg`) + `manifest.json` (sürüm 2, `buckets` sayaçları). Eski `p_0000.jpg` şeması KALKTI; kodda sabit havuz boyu yok. |
| `tools/generate-portraits.py` / `.ps1` | Portre üretim scriptleri (pollinations.ai, deterministik seed). |
| `tools/visual-check.js` | **Otomatik görsel/konsol testi** (Playwright + sistem Chrome, masaüstü+mobil). Her değişiklikten sonra çalıştır. |
| `tools/realism-check.js` | **Canlı maç gerçekçilik denetimi**: saha-dışı/ışınlanma/üst üste binme/sahipsiz top ihlalleri + anlatım-görüntü senkron gecikmesi. `--fire` şut anı, `--inb` kenardan sokma anı ekran görüntüsü, `--full` tam maç, `--rate=` izleme hızı. |
| `tools/faz7-check.js` | **FAZ 7 kabul kriteri denetçisi** — playoff yenileme, kota/IndexedDB tazeliği, kayıt silme kalıcılığı, arena bakımı, koç reroll istismarı, çevrimdışı font (ağ kesilerek), mobil ilk-5 kaydırma. Kayıt/ekonomi/başlangıç durumu değişince çalıştır. |
| `tools/season-loop.js` | **Çok sezonlu döngü ölçümü** — N sezonu uçtan uca sürer (lig→playoff→draft→yeni sezon); kadro OVR, kasa, yaşlanma, kadro mevcudu, şampiyon üretimi. Tohumlu, `--runs` ile çok koşulu ortalama. **Uzun vadeli denge değişikliklerinden sonra çalıştır.** |
| `tools/faz6-check.js` | **FAZ 6 denetimi** — sezon ödülleri, zorluk seviyesi çarpanları, manuel koçluk istatistik koruması, kayıt bütünlüğü, mobil uçtan uca, masaüstü paketi. |
| `tools/faz8-check.js` | **FAZ 8 kabul kriterleri** — piyasa dengesi, şehir dağılımı, v7 migrasyonu, 200 sezonluk lig kutuplaşması, script sürümü, mobil varsayılan görünüm. |
| `tools/m20-check.js` | **Rakip kadro kalıcılığı denetçisi** — kimlik · derinlik · sezon istatistiği · yorgunluk · isabet yolu · sakatlık. Bot kulüp/rakip mekaniği değişince çalıştır. |
| `tools/faz10-check.js` | **FAZ 10 kabul kriterleri** — fikstür saati kapısı (`?test=1`), analitik olayları, og/twitter etiketleri, PWA (manifest + `sw.js` sürümü), öğretici dili, paylaşım akışı. Yayın altyapısı değişince çalıştır. |
| `tools/hareket-check.js` | **Saha hareketi (FAZ 15)** — jeton hızı (bant dağılımı), konveks kabuk alanı, ikili mesafe. Hız **maç saatinde** yargılanır; sahne maç saatini ~2× sıkıştırdığı için sahne px/sn'si gerçek m/sn ile doğrudan kıyaslanamaz. Hız/dizilim değişince çalıştır. |
| `tools/iz-kaydet.js` | **Canlı sahne iz kaydedicisi (FAZ 40)** — topun ve 10 jetonun konumu her karede kaydedilir; hız **100 ms pencerede** hesaplanır (kare-kare DEĞİL — 60 fps.te 1 px titreşim 1,8 m/sn sahte hız üretir). **Sahne↔maç saati oranını AYNI KOŞUDA ölçer ve her hızı iki ölçekte birden basar** (F15 tuzağı). Işınlanma, donma payı, yol eğriliği. `--yeniden=<etiket>` ile tarayıcısız yeniden çözümleme. Hareket/koreografi değişince çalıştır. |
| `tools/iz-ciz.js` | İz kaydından yörünge + hız profili PNG.si üretir (`olcum/iz-<etiket>-*.png`). Her sürümde üretilip saklanır. |
| `tools/gercek-hareket/indir.js` | **FAZ 48 gerçek HAREKET verisi indirici** — SportVU 2015-16 (linouk23/NBA-Player-Movements 7z, 25 kare/sn) + sumitrodatta/nba-alt-awards play-by-play; sezona eşit aralıkla `--n` maç. Ham veri `tools/gercek-hareket/_ham/` (≈1 GB, `.gitignore`) — **DEPOYA KOYMA**. |
| `tools/gercek-hareket/klip-cikar.js` | **FAZ 50 gerçek pozisyon klibi çıkarıcı** — ham SportVU'dan şutla biten pozisyonları (takım topu aldığı an → elden çıkış + ~1 sn) 5 kare/sn, hücum sola normalize, Int16 base64 olarak `js/klip-data.js`e yazar (696 klip, 3 MB). Meta: bas (sokma/ribaund/gecis/onsaha), sure, şut noktası, şutör indeksi/sınıfı, pas sayısı, `r` (elden çıkış karesi). Veriyi yeniden üretince sürüm artır. |
| `tools/gercek-hareket/cikar.js` | **FAZ 48 hareket dağılımı çıkarıcı** — ham SportVU'dan `tools/_lib/gercek-hareket.json` üretir (10 maç · 811.291 kare · 2.122 pozisyon): oyuncu hızı, hücum yayılımı, topu tutana en yakın savunmacı (toplam + ön/arka saha), pas/pozisyon, tutma süresi, aynı anda koşan, kesme, şut anında duran, potaya uzaklık, top elde payı, arka sahada tutma payı, yarı sahayı geçen rol — DAĞILIM olarak (tek sayı değil). Tanımlar dosya başında; bir tanımı değiştiren veriyi yeniden çıkarmak zorunda. `cikarilamadi`: perde sayısı, şut tipi — kapı YOK. |
| `tools/_lib/gercek-hareket.json` | **Hareket kapılarının TEK DOĞRULUK KAYNAĞI** (FAZ 48). Elle DÜZENLEME; `cikar.js` üretir. |
| `tools/hareket-bant-check.js` | **Hareket dağılımı ↔ gerçek (FAZ 48)** — `node tools/hareket-bant-check.js olcum/iz-<etiket>.json`: iz kaydından SportVU ile AYNI tanımlarla dağılımlar çıkarır (maç ölçeği) ve histogram **L1 uzaklığı** basar; kapı L1 ≤ 0,35 (tek sabit). ⚠ n≈50 pozisyonluk ölçütlerde (pas/poz, şut anında duran) L1 ±0,1 gürültülüdür — aynı kodun beş kaydında 0,32-0,45 salındı; karar ortalamanın yönüyle verilir. Hareket/koreografi değişince `iz-kaydet` + bunu çalıştır. **FAZ 49:** hızı iki ölçekte basar (maç + `↳ DUVAR ölçeği (ekran)` = kullanıcının gördüğü; kabul ölçütü duvar), `--bins` kova dökümü, `10 oyuncu aynı yarıda` ve `topun yarısındaki oyuncu` (gerçek `ayniYari`/`topYarisi`, `cikar.js`). |
| `tools/iz-poz-ciz.js` | **Pozisyon penceresi yörünge grafiği (FAZ 48 · 3. taş)** — `--t=a-b` (motor kaydı, 10-14 sn pencere) ve `--gercek=<SportVU json> --olay=<id>` (gerçek olay) panellerini yan yana çizer (`olcum/*-poz.png`). 470 sn'lik tam yörünge "saç yumağı"dır; hiçbir kapının yakalamadığı kusurlar (sahayı boydan boya kat eden değişim yayları, uzunların köşe noktası) bu grafikte görüldü. Sayılar yeşilken şikâyet varsa `kontak-goruntu` ile birlikte ÖNCE bunu çalıştır ve kendin oku. |
| `tools/kontak-goruntu.js` | **Canlı sahayı GÖZLE izleme (FAZ 44)** — `node tools/kontak-goruntu.js <KÖK> <etiket> --secs=60 --adim=2`: sahayı 2 sn'de bir kaydeder, 15'lik kontak sayfaları (5×3, her karede olay·mod·taşıyıcı·SET/FT/INB etiketi) üretir (`olcum/goruntu/`). Sayılar yeşilken "basketbola benzemiyor" şikâyetinde ÖNCE bunu çalıştır ve kareleri kendin oku; `<KÖK>` olarak `git worktree` ile açılan HEAD kopyası verilirse aynı tohumda yan yana kıyas yapılır. |
| `tools/dizilim-olc.js` | **Olay indeksine göre dizilim yayılımı (FAZ 44)** — 100 ms'de bir ağırlık merkezine ortalama uzaklık, en yakın çift, 22 px altı çakışan çift, saha dışı jeton; olay başına özet. Duvar saatine bağlı ekran anları koşular arasında kıyaslanamaz — bu araç AYNI OLAYDA kıyaslar. |
| `tools/gecis-analiz.js` | **Pozisyon başına orta çizgi geçişi (FAZ 44)** — `iz-kaydet` kaydını okur; her pozisyonda topun orta çizgiyi hangi modda (held/pass/shot/hiç) geçtiğini listeler. `sahne-check`in "geçiş / pozisyon değişimi" kapısı çift sayar (HEAD %111); davranış yargısı için bunu kullan. |
| `tools/pas-analiz.js` | **Pas yönü + sokma yeri (FAZ 45)** — `iz-kaydet` kaydından: canlı topta potadan uzaklaşan (geri) paslar bağlam ve kim→kime ile; rakibe giden pas; çizgi dışı izinli oyuncunun SAHA İÇİNDEN attığı pas; **her sayı-sonrası pozisyonun ilk pası** verenin konumuyla (dışarıda/içeride). FAZ 44'ün sokma kapısı yalnız çizgi dışındaki epizotları saydığı için "hiç çıkmayan sokucu"yu göremedi (22/24); payda olayın kendisidir. Sokma/geçiş/çalma koreografisi değişince çalıştır. |
| `tools/balon-check.js` | **Anlatım balonu denetçisi (FAZ 40)** — RENDER EDİLMİŞ balonu okur. `anlatim-check` ön parça ile sonuç parçasını AYRI taradığı için birleşme kusurlarını (nokta + küçük harf, çift noktalama) GÖREMEZ. Anlatım birleştirme mantığı değişince çalıştır. |
| `tools/sahne-olcum.js` | **FAZ 54 canlı sahne görsel gerçekçilik ölçümü** — başsız Chromium, `mState._sim`ten saniyede ~60 kare (20.000+ kare), 18 satırlık tablo: top durum geçişleri (`loose>held`/`loose>pass`/`pass>shot`/`shot>pass`) · saha dışı top/oyuncu · üç saniye · üçlük mesafe dağılımı · ivme · sahipsiz top · üst üste binme · pas mesafesi · hız bantları · savunma mesafesi · sokma dizilimi · orta çizgiyi geçen rol. Her satırda GERÇEK SportVU tabanı da basılır; 20 örneklemin altında "ÖRNEKLEM YETERSİZ". Çıktı `olcum/FAZ54-sonuc.txt`e eklenir. Sahne/top mantığı değişince çalıştır. |
| `tools/taktik-klip-check.js` | **FAZ 53 taktik ↔ klip eşleşmesi** (tarayıcısız) — aynı şut noktalarında yalnız savunma stili/şema değiştirilerek seçilen kliplerin imzası ölçülür: bölge → savunma potaya daha yakın · pres → topa en yakın savunmacı daha yakın · ikili oyun → perde izi yüksek · birebir → düşük. `klipTaktikMaliyet` ya da klip verisi değişince çalıştır. |
| `tools/sahne-kapsam-check.js` | **Sahne kapsamı (FAZ 40 · B5+B6)** — motorun ürettiği her olay türünün `movePlayersForEvent` karşılığı var mı (tür adıyla YA DA `shots[].kind===ft` alanıyla), ve koreografi süresinin ALT SINIR sözleşmesi (`delay=max(simMs,dtMs)`) duruyor mu. Tarayıcısız. Yeni olay türü eklerken çalıştır. |
| `tools/geometri-check.js` | **Saha çizgisi geometrisi (FAZ 14)** — 3 sayı yayı, köşe düzlükleri, boya, çember/pano ölçüleri, kesişme ve "sahada karşılığı olmayan çizim". **Nitelik okumaz**, `getPointAtLength`/`getBBox` ile ÇİZİLEN eğriyi ölçer. Saha SVG'si değişince çalıştır. |
| `tools/spacing-check.js` | **Saha dizilimi ölçümü (FAZ 11)** — set hücumunda aralık, yayılım, boya kullanımı, markaj mesafesi, ball-you-man. Tohumlu. `--bg` sekmeyi arka plana alıp ölçer (F11-1 gerileme testi). **Dizilim/koreografi değişince çalıştır.** |
| `tools/faz11-check.js` | **FAZ 11 kabul kriterleri** — dizilim geometrisi, kare kaybında yetişme, kesme noktası çakışması, `startMatch` sessiz kilitlenmesi. |
| `tools/anlatim-check.js` | **FAZ 13 anlatım denetçisi** — maçı TARAYICISIZ üretip olay listesini denetler (ribaund/şut eşitliği, seri iddiası, faul adı ve sayacı, çalma iki taraflılığı, kalıp çeşitliliği, devre arası, saha değişimi, köşe bölgesi). `--freeze` ile sekme donması + maç içi panel kalıcılığı tarayıcıda sınanır. **Anlatım değişince çalıştır.** |
| `tools/mobile-check.js` | **FAZ 12 mobil denetçisi** (390×844) — dokunma sayısı (gerçekten tıklayarak), maç sayfası düzeni, bilgi yoğunluğu, 44 px dokunma hedefi, market yoğunluğu. Mobil düzen değişince çalıştır. |
| `tools/sim-node.js` | **Tarayıcısız maç simülasyonu** — 14 modülü düz Node'da (vm) yükler, `simulateMatch()` sözleşmesini ve determinizmi sınar. Motor sözleşmesi değişince çalıştır. **Regresyon tabanı (FAZ 39 sonrası): `--n=1000 --seed=42` → 91.3 - 85.4 · olay/maç 248.** (FAZ 36-38: 88.5 - 80.2 · 203.) (FAZ 34: olay/maç 248 — FAZ 36 §B1 rutin savunma ribaundunu anlatımdan çıkardı, SKOR DEĞİŞMEDİ.) ⚠ `--n=100` TEK TOHUMDA GÜRÜLTÜ BASKINDIR (deplasman ortalaması tohuma göre 78,5-87,1 arası salınır) — taban artık n=1000 ile okunur. |
| `tools/kutu-check.js` | **Kutu skor gerçekçiliği (FAZ 38)** — 18 satır (FG%, 2P%, 3PA/FGA, ribaunt, top kaybı, çalma, blok, faul, uzatma) gerçek FIBA/BSL bantlarıyla. 60-120 maç, tarayıcısız. Sonuç matematiğine dokunan her değişiklikten sonra çalıştır. |
| `tools/kural-check.js` | **Kural olayı sıklığı + şut saati göstergesi (FAZ 43 İŞ 3 · D1)** — taç · hücum faulü · adım · şut saati ihlali takım·maç başına `kuralOlaylari` bantlarıyla (bütçe kanıtı olarak top kaybı/faul pozisyon başına aynı koşuda); gösterge kararı (`sutSaatiKarar`) olay dizisi üzerinde sürülür: 0'da bekleme sn/maç, ihlalsiz 0'a inen pozisyon, en uzun 0. Top kaybı türü payları ya da olay damgası değişince çalıştır. |
| `tools/tempo-check.js` | **Pozisyon süresi / tempo (FAZ 38)** — `dtPos` dağılımı iki tepeli mi (geçiş 5-9 sn · set 13-21 sn), hızlı hücumun ortalama süresi, pozisyon/maç. Bant tablosu BİLGİDİR; kapı §İŞ2 kabul ölçütleridir. |
| `tools/rotasyon-check.js` | **Rotasyon (FAZ 38)** — yedeklerin sayı payı, kutu skorda görünen oyuncu, en skorerin payı, değişiklik sayısı. İlk beş TAHMİN EDİLMEZ, motorun `matchLineup` kuralıyla (pozisyon dengeli) hesaplanır. |
| `tools/bozukdeger-check.js` | **Bozuk değer tarayıcısı** — 2 sezon sürülüp TR+EN, 11 sayfa + 4 modal gezilir ve GÖRÜNÜR metinde `NaN`/`undefined`/`null`/`Infinity`/`[object Object]` aranır. `visual-check` yalnız KONSOL hatasına bakar; bozuk değer sessizdir — bu kapı onu yakalar. Sayı/biçim üreten her değişiklikten sonra çalıştır. |
| `tools/gercek-veri/indir.js` | **FAZ 39 gerçek maç verisi indirici** — `shufinskiy/nba_data` (Apache-2.0), sezon başına play-by-play + şut detayı. Ham veri `tools/gercek-veri/_ham/` altına iner ve `.gitignore`'dadır — **DEPOYA KOYMA**. |
| `tools/gercek-veri/cikar.js` | **FAZ 39 bant çıkarıcı** — ham veriden `tools/_lib/gercek-bantlar.json` üretir (3.690 maç · 729.559 pozisyon · 655.446 şut · 90 takım-sezon). Bir eşiği değiştirmek isteyen veriyi yeniden çıkarmak zorunda. |
| `tools/gercek-veri/_csv.js` | Akışlı CSV okuyucu. `cut -d,` / `split(',')` bu veride ÇALIŞMAZ — `pbpstats`in EVENTS sütunu tırnak içinde virgül VE satır sonu taşır. |
| `tools/_lib/gercek-bantlar.json` | **TEK DOĞRULUK KAYNAĞI** — check araçlarının eşikleri. Elle DÜZENLEME; `cikar.js` üretir. |
| `tools/_lib/gercek-bant.js` | Bant okuyucu + kapı yardımcısı (`al` / `ham` / `kapi` / `bas`). Yeni bir gerçekçilik kapısı yazarken eşiği BURADAN oku. |
| `tools/faz58-check.js` | **FAZ 58 canlı sahne kusur denetçisi** (tarayıcısız) — `iz-kaydet` kaydını okur: rakibe giden pas · izinsiz saha dışı / `_oob` sızıntısı · tek kare jeton sıçraması · canlı ve ölü sahipsiz top · tek kare top sıçraması · ÇİZİLEN konumda iç içe jeton payı. Pencere **en az 600 sn**. Top sahipliği / sokma / klip kırpması değişince `iz-kaydet --secs=620` + bunu çalıştır. |
| `tools/faz59-check.js` | **FAZ 59 uçan top + taşıyıcı denetçisi** (tarayıcısız) — `iz-kaydet` kaydını okur: donan uçuş (mod pass/shot ama konum sabit) · pas süresi p99 · rakibe giden pas · canlı sahipsiz top · orta çizgiyi TOPLA geçen rol · FAZ 58 gerileme satırları. Pencere **en az 600 sn**. ⚠ İvme ve savunma mesafesi kapıları burada DEĞİL `sahne-olcum.js`tedir (yuvarlama/tanım farkı). Top durum makinesi ya da klip slot eşlemesi değişince çalıştır. |
| `tools/anomali.js` | **Anomali avcısı** (tarayıcısız) — `iz-kaydet` kaydının TAMAMINI tarar ve **kapı listesi OLMADAN** aykırı davranışı arar: kıpırdamayan oyuncu · hedefine varamayan · arka sahada kalan hücumcu · kimseyi tutmayan savunmacı · yığılma · titreme · serbest atış yerleşimi · uzun/geri/rakibe pas · topu uzun tutan · boyada 3 saniye · yayılım · pozisyon süresi. Sayılar yeşilken şikâyet geldiğinde İLK bunu çalıştır. Bulgular ADAYDIR; kararı gerçek veri ve göz verir. |
| `tools/an-goruntu.js` | **Anomali görüntüleyici** — canlı maçta bir durum (serbest atış · yığılma · donuk oyuncu · uzun tutma) OLUŞTUĞU ANDA sahanın PNG.sini çeker (`--secs=420 --max=26`). Kontak sayfasından farkı: sabit aralıkla değil olay anında çeker. |
| `tools/dikis-goruntu.js` | **Dikiş görüntüleyici** — canlı maçtan 0,25 sn ARDIŞIK kareleri şerit hâlinde dizer (izlemeye en yakın şey); her karenin üstünde klip/oam/taşıyıcı durumu. Kontak sayfası (2 sn) hareketi göstermez. Klip↔fizik dikişini incelemek için. |
| `tools/kilit-check.js` | **FAZ 51 kilitli sonuç (C1) etiket denetçisi** — maç başlat → yenile → Ana Panel kartı ve Maçlar butonu "⏩ Kilitli sonucu uygula" demeli, tıklayınca skorlu bildirim + fikstür işlenir, etiketler Başlat'a döner, ikinci tıklama gerçek maç. Buton etiketi / pendingMatch akışı değişince çalıştır. |
| `tools/schema-check.js` | **`db/schema.sql` denetçisi** — sözdizimi (varsa gerçek PostgreSQL ayrıştırıcısı), lig kuralları, RLS, "kod tabanında bağlantı yok". |
| `db/schema.sql` | **Çok oyunculu veri modeli** (Postgres/Supabase). Yalnız dosya — hiçbir bağlantı kurulmuyor. |
| `tools/gen-brand-images.js` | og:image (1200×630) + PWA ikonlarını üretir (Playwright). Marka görselini değiştirince tekrar çalıştır. |
| `sw.js`, `manifest.json` | **PWA** — önbellek (HTML: önce ağ · js/font/ikon: önce önbellek) + ana ekrana ekleme. `sw.js` içindeki `SCRIPT_V`, HTML'deki `?v=` ile **aynı olmalı**. |
| `PLAN-COK-OYUNCULU.md` | **Çok oyunculu mimari planı** (Supabase şeması, fikstür zamanlayıcısı, sunucu tarafı simülasyon). Sunucu kodu yazılmadı. |
| `tools/sunum-check.js` | **Canlı sunum davranış denetçisi** (M9 çıkış pası · M12 AND-1 ek atışı · M14 şut saati). Bu maddeler maç sonucunu değiştirmediği için `band`/`box-band` onları göremez — sunum değişikliğinden sonra çalıştır. |
| `tools/milliyet-check.js` | **FAZ 17 milliyet denetçisi** — lig kadroları/draft/altyapı %100 ev ülkesi, bot yabancı oranı ve tavanı, `prUnit` desil dağılımı, market ülke dağılımı, 43 ülke ↔ `NAME_POOLS`. Milliyet kuralı değişince çalıştır. |
| `tools/portre-check.js` | **FAZ 17 portre denetçisi** — manifest ↔ disk uyumu, `ULKE_KOVA` bütünlüğü (43 ülke, toplam 1.0), seçilen kovanın ülkeye uygunluğu, yaşlanınca portrenin değişmemesi, yedek zincirinde canlı API olmaması. |
| `tools/isim-check.js` | **FAZ 17 isim havuzu denetçisi** — ülke başına ≥150×140, liste içi tekrarsızlık, `ULKELER` ↔ `NAME_POOLS` birebir örtüşme, 5.000 çekilişte benzersizlik ≥%99. |
| `tools/generate-portraits.js` | Portre üretimi + işleme (kova bazlı). Bu makinede Python kurulu olmadığı için `.py` sürümünün çalışan Node karşılığı; aynı dosya adlarını, eşikleri ve manifest'i üretir. **Tek akış zorunlu** — servis IP başına tek istek kabul ediyor. |
| `tools/portre-uret-hepsi.js` | **Havuzu kotaya tamamlayan koşucu** — en geride kalan kovadan doldurur, her dilimde commit + push eder, kaldığı yerden devam eder. `--hedef=3000 --dilim=100`. |
| `tools/surum-check.js` | **FAZ 20 sürüm damgası denetçisi** — HTML `?v=` ↔ `sw.js` SCRIPT_V uyumu, HTML script listesi ↔ sw.js önbellek listesi, ve **yayın dosyaları değiştiği hâlde sürüm artmadıysa DÜŞER** (içerik hash'i `tools/.surum-hash.json`). Sürümü artırdıktan sonra `--yaz` ile kaydı tazele. |
| `tools/yetenek-check.js` | **FAZ 34 özel yetenek / gecelik form denetçisi** (tarayıcısız) — üretim dağılımı (%70/%25/%5/%20), determinizm, stat sınırları, pozisyona aykırılık, **rozet YOK** taraması · 40 maçta kuyruk dağılımı ve §4 lig ortalamaları · motorun statı gerçekten okuduğu (95 vs 60 karşılaştırması) · anlatım sıklığı. Oyuncu üretimi ya da ağırlık fonksiyonları değişince çalıştır. |
| `tools/ekonomi-check.js` | **FAZ 25 USD ekonomi denetçisi** (tarayıcısız) — kaynakta `KR` yok · maaş dağılımı §2.1 bantlarında · başlangıç kasası $120.000 ve haftalık denge ±$2.000 · 10 sezonluk iflas oranları ve büyüme eğrisi · seyirci ≤ taraftar · sponsor bilançoda ayrı satır · negatif/sıfır değer yok. Ortamı `tools/_lib/eko-ortam.js` kurar. Ekonomi değişince çalıştır. |
| `tools/_lib/eko-ortam.js` | Ekonomi ölçüm ortamı — 14 modülü düz Node'da (vm) yükler, `main.js` yerine UI kancalarını boş bırakır ve ekonomi tutamaklarını dışa verir. `sim-node`'un yükleyicisinin ekonomi tarafına açılmış hâli; kopyalamak yerine BUNU kullan. |
| `tools/bicim-check.js` | **FAZ 29 biçim birim testi** — `fmtSayi`/`fmtYuzde`/`fmtSira` TR ve EN çıktıları, İngilizce sıra ekinin 11/12/13 istisnası, ve kaynakta elle kalmış `toLocaleString('tr-TR')` / `'%'+n` taraması. Biçim değişince çalıştır. |
| `tools/sut-check.js` | **FAZ 26 şut tipi denetçisi** (tarayıcısız) — her saha şutunun tipi var mı, tip bölgeyle tutarlı mı, smaç/floater payı gerçekçi mi, smaç/turnike/floater dili doğru tipte mi, tip deterministik mi. Şut tipi ya da anlatım havuzları değişince çalıştır. |
| `tools/lig-check.js` | **FAZ 19 lig denetçisi** — standings ↔ fikstür tek kaynak, ayrışma senaryosunda onarım, tablo tutarlılığı (o = g + m), 10 sezonluk denge kapıları (ortalama fark, 20+/5- oranı, 16-0 takım), şehir tekrarı. Lig/tablo/denge değişince çalıştır. |
| `tools/arena-check.js` | **FAZ 24 arena doluluğu denetçisi** — 125 arena×bilet fiyatı×form birleşiminde **seyirci ≤ taraftar tabanı**, doluluk sınırları, sezon başı bilet gelirinin değişmezliği, `TARAFTAR_KATSAYI`nın tek kaynak olması. **FAZ 52'de modül kapıları eklendi (F-J):** tablo tutarlılığı · "Sv1 = bugünkü davranış" · gelir dökümü toplamı = `homeTicketIncome()` · önkoşul ağacı · v10→v11 migrasyonu. Arena / bilet / taraftar formülü ya da `ARENA_MOD` değişince çalıştır. |
| `tools/arena-denge.js` | **FAZ 52 arena modül denge testi** (tarayıcısız) — 2 sezonluk ekonomi akışı iki kez sürülür (modüle yatırım yapan / yapmayan) ve maç başı gelir · haftalık bakım · kasa farkı raporlanır; ayrıca "küçük taraftar kitlesi + dev arena zarar ettirmeli" kapısı. **FAZ 52-B:** ev avantajının büyüklüğünü de ölçer (aynı iki kadro · 220 tohum · tek fark `homeEvAvantaj`; kazanç 1-6 sayı bandında ve skor bandı korunmalı). `ARENA_MOD` tablosu, gelir formülü ya da ev avantajı değişince çalıştır. |
| `tools/analiz-check.js` | **FAZ 24 analiz sayı tutarlılığı** — Analiz kartındaki "Sayı ort. (attı)" ile "Attığı sayı" grafiğinin aynı diziden beslendiğini ve grafik eksen etiketlerinin ÇİZİM için açılan banttan değil gerçek min/max'tan basıldığını (FAZ 22 §4.1 gerilemesi) 3 maçlık veriyle sınar. |
| `tools/turkek-check.js` | **FAZ 25 Türkçe çekim eki birim testi** — brifin 8 ad × 4 durum tablosu (32 kapı), kaynaştırma/zamir n'si ayrımı, ünsüz benzeşmesi, şablon çözücü (`%X{durum}`), Türkçe küçük harf. `js/turkce-ek.js` değişince çalıştır. |
| `tools/portre-uret-yerel.py` | **FAZ 17C yerel portre üretimi** (SD-Turbo, CPU). Kova kotaları, bant dengesi, kaldığı yerden devam, dilim başına commit+push. Boru hattı `tools/portre_boru.py`. |
| `tools/portre_boru.py` | Portre işleme boru hattı (kadraj, fon eşitleme, eleme kapıları). Üretim kaynağı değişse de bu modül aynı kalır. |
| `tools/i18n-scan.js` | **EN modunda çeviri denetimi** — tüm sayfa/modal/canlı maçı gezip çevrilmemiş metin düğümlerini raporlar. Dil değişikliğinden sonra çalıştır. |
| `tools/measure.js` / `tools/band.js` | Canlı sunum ölçümü + **sonuç değişmezliği** (kanonik tohum imzası / 200 maç skor hash'i). Sunum değişikliklerinden sonra ikisi de aynı hash'i vermeli. `band.js` referans hash: **`76351f00455b3a5e`** (FAZ 39 sonrası) · `measure.js` bazı **`0132d9fff6e778d0`** (varsayılan tohum 987654321; eski değerler: `df5e0c6fa1630b6c` FAZ 38 eki-3, `060c5f1763cd3699` FAZ 38 eki-2, `c89ce408ca435845` FAZ 38, `3225bf641b79dea7` FAZ 34-37, `99bb9ceb67917bd0` FAZ 19-33, `89b5436137c1da14` FAZ 17-18, `fb393bdab878e699` FAZ 13-16, `ec630b3a512bb3b2` FAZ 13 öncesi). *FAZ 39'da hash BİLEREK değişti: eşikler gerçek NBA verisinden çıkarılıp motor onlara ayarlandı — FIBA 14 saniye kuralı, boya geometrisi, şut tipi karışımı, üçlük payı, pozisyon sonucu dağılımı ve serbest atış tabanı. Ayrıntı ve önce/sonra tablosu `PROGRESS.md` 39. oturum.* *FAZ 38'de hash BİLEREK değişti: kutu skor gerçekçiliği (isabet tabanları, üçlük payı, pozisyon süresi, rotasyon) sonuç matematiğini doğrudan değiştirdi — kullanıcı kararıyla FAZ 37'nin "dokunma" yasağı kaldırıldı. Ölçüm `kutu-check` (18 satır) ve `tempo-check` ile korunuyor.* *FAZ 34'te hash bilerek değişti: özel yetenek sistemi oyuncu statlarını (dolayısıyla maç sonuçlarını) doğrudan değiştirdi; lig ortalamaları korundu (`yetenek-check` B bölümü ölçüyor).* *FAZ 19'da hash bilerek değişti: lig dengesi düzeltmesi (`cpuMatchScore` kırpması 35→20, `pseudoTeamStrength` bandı 42→20) maç skorlarını doğrudan değiştirdi; ortalama fark 21,4→10,5 (`lig-check` C bölümü ölçüyor).* *FAZ 17'de hash bilerek değişti: isim havuzu ülke başına 256'dan 21.000 kombinasyona çıkınca `ensureUniquePlayerNames` içindeki ad çakışması yeniden-çekilişleri neredeyse sıfıra indi ve rastgelelik akışı kaydı. Milliyet seçiminin kendisi akışı KAYDIRMAZ — `genPlayer` ülke sabitlense bile `ch(ULKELER)` çekilişini yapar, sonucu sonra ezer.* *32. oturum: `if(SEED)` koruması + varsayılan 0 yüzünden tohum hiç kurulmuyordu, araç her çalıştırmada farklı hash veriyordu — düzeltildi.* |
| `*.bat`, `OYUNU-AC.txt` | Windows başlatıcılar / kullanıcı yardım notu. |
| `PROGRESS.md` | **Oturum günlüğü** — yapılanlar, kararlar, nedenleri. Her oturumda güncelle. |
| `RAPOR-EKSIKLER.md` | Tam sürüm için eksik/hata denetim raporu (öncelik sıralı). |
| `README.md` | Son kullanıcı için oynatma / GitHub Pages talimatları. |

## Kod haritası (js/ modülleri)

JS, `charazay2.0.html` gövdesinden **mekanik olarak** (bitişik dilimler, sıfır mantık değişikliği; birleştirince orijinalle byte-birebir) 10 dosyaya bölündü. Sırayla, klasik `<script src>` ile yüklenir — **tümü global kapsamda** (fonksiyonlar `window`'a, top-level `const/let` paylaşılan global lexical env'e gider); dosyalar arası çağrı serbesttir. Yeni sabit/fonksiyon eklerken **tema hangi dosyaya aitse oraya** ekle, yükleme sırasını bozma.

| Dosya | İçerik |
|-------|--------|
| `js/i18n.js` | **Dil katmanı (TR/EN)** — t()/ifade katmanı, localizeCatalogs (veri tablolarını yerinde çevirir), MutationObserver ile canlı DOM çevirisi, setLang. **İlk yüklenen dosya.** |
| `js/i18n-dict.js` | TR→EN sözlüğü: ~450 birebir karşılık + ~140 ifade (regex) kalıbı. |
| `js/i18n-commentary.js` | Maç anlatımı sözlüğü: 272 spiker şablonu + ribaund/hamle havuzları + maç akışı kalıpları. |
| `js/state.js` | Sabitler (`LEAGUE_SIZE=20`, `MATCH_CLOCK_SEC=600`, `OT_CLOCK_SEC=300`, `START_KR`, `ECO_MUL`, storage anahtarları), `ecoRound`, IndexedDB, kimlik/maaş/hash yardımcıları. |
| `js/economy.js` | Ekonomi: `txn`, bilet (`homeTicketIncome`,`ticket*`), `weeklyWageBill`, bot transfer, `processEconomyWeeks`, `processBankruptcy` (kademeli iflas). |
| `js/persistence.js` | Başarımlar, `sfx`, ayarlar, kayıt slotları, öğretici, `serializeGameState`/`applyGameState`/migrasyon, `bootstrapAppUi`. |
| `js/names.js` | **Ülkeye özgü isim havuzları** — 43 ülke × 150 ad × 140 soyad (12.982 dizgi, ülke başına ≥21.000 kombinasyon). `state.js`'ten ÖNCE yüklenir. |
| `js/portraits.js` | Portre data-URI + avatar yardımcıları, **ülke→kova dağılımı (`ULKE_KOVA`)**, `portreSec`/`portreAta`, manifest yükleme. Sabit havuz boyu yok. |
| `js/roster-gen.js` | Oyun sabitleri (`STAT_KEYS`,`ARENA_LVL`,`KOC_T`,`INJURIES`), global `G`, `genPlayer/genRoster/genYouth/genMarket`, TBL durumu, `buildLeagueRows`, terfi/düşme. |
| `js/league.js` | Lig modalları, haber/sidebar, takım detay sayfası, `genRoundRobinMatches`, fikstür, `openMatchTactics`/`saveMatchTactics`, ilk-5 editörü. |
| `js/match-prep.js` | `updateStandingsFromResult`, `computeRosterOfrDef`, `matchLineup`, `simulateCpuMatch`, yorgunluk/sakatlık, playoff, `startLeagueSeason`. |
| `js/render.js` | Sayfa render'ları: `renderRoster/renderLig/renderMarket/renderArena/renderAltyapi/renderAntrenman/renderBilanço/renderAnalytics`, oyuncu kartı/modal, scouting/izci ağı (`renderScouts`), kulüp transfer pazarlığı (`openClubOfferModal`), SVG grafik (`svgLineChart`). **FAZ 52:** arena modül kartları (`renderArenaMods`), inşaat geri sayımı (`renderArenaInsaat`), etki metni (`arenaModEtkiMetni`). |
| `js/turkce-ek.js` | **Türkçe çekim eki** — `turkEk(ad,durum)` (ünlü uyumu + ünsüz benzeşmesi + kaynaştırma/zamir n'si), `turkEkUygula` (`%X{durum}` çözücü), `trKucuk`/`trBuyukIlk` (İ→i, I→ı). Saf fonksiyonlar; `match-engine.js`'ten ÖNCE yüklenir. |
| `js/match-engine.js` | Maç motoru: `simulateMatch`/`buildMatchCtx` (sunucu sözleşmesi, `G`'siz) → `generateMatchEvents` → `runPossession` (tempo/odak/savunma stili/top yükleme/eşleştirme taktikleri), şut haritası/kutu skor render, `applyMatchResult`. **Canlı sunum v3** (27. oturum): rol tabanlı dizilim (`_assignRoles`, `SET_*`), üç fazlı pozisyon (sokma → `TRANS_*` geçiş → set), top durum makinesi (`_ballHold/_ballPass/_ballShoot/_ballLoose`), serbest top takibi (`_chase`), çizgi dışı sokma (`_inboundSetup`/`_clearOob`), anlatım senkronu (`movePlayersForEvent(ev,paint)`). |
| `js/main.js` | `startMatch`/`stopMatch`/canlı oynatım, `toggleManualCoach`, antrenman + izci (`hireScout`) aksiyonları, transfer/gelen teklif (`showIncomingOfferModal`)/koç/arena aksiyonları, `showPage` (SPA, `analiz` dahil), `createTeam`, bildirim kuyruğu, `window.onload` bootstrap. |
| `js/klip-data.js` | **Gerçek pozisyon kütüphanesi (FAZ 50)** — `KLIP_VERI` (696 SportVU klibi, Int16 base64). Üretici `tools/gercek-hareket/klip-cikar.js`; ELLE DÜZENLEME. |
| `js/sahne-klip.js` | **Gerçek klip oynatıcı (FAZ 50)** — şut olayında motorun kararına (şutör · nokta · sonuç) en yakın gerçek pozisyonu seçer (`klipSec`), 10 jetonu + topu kinematik oynatır (`klipTick`: harman, şut noktası ofseti, tutan/pas modu), elden çıkışta `oamAtes`e devreder (`klipAtes`), klip sonunda fiziğe bırakır (`klipBitir`). `sahne-oam.js`'ten SONRA yüklenir; `animateShotPossession`/`_simTick`/`movePlayersForEvent` sarmalanır. `KLIP_ACIK=false` OAM'a döner. |
| `js/sahne-oam.js` | **Oyun Akışı Makinesi (FAZ 46)** — canlı topun tek beyni: `oamSut` (şutlu pozisyon kurulumu, `animateShotPossession` yerine), `oamTick` (faz makinesi: sokma → geçiş → set → şut; top hareketi kararları), `oamHedefler` (her karede her oyuncuya tek hedef: boşluk şablonu + şema + adam adama savunma), `oamAtes` (eski `fire` sözleşmesi: ön parça/sonuç senkronu, blok, AND-1, ribaunt bloğu, sayı sonrası sokma kurulumu). `match-engine.js`'ten SONRA, `main.js`'ten ÖNCE yüklenir; `animateShotPossession`/`_simTick`/`movePlayersForEvent` sarmalanır. |
| — | **7. oturum sistemleri:** playoff serisi + sezon ödülleri + **başkan hedefi** (`match-prep.js`), transfer pazarlığı + **kişilikler** (`playerAcceptsOffer`), **izci ağı** + **draft** (`startDraft`, `match-prep.js`), **Analiz** sayfası. Detay `PROGRESS.md` 7. oturum. |

## Geliştirme kuralları

- **Global `~/.claude/CLAUDE.md` kuralları geçerli:** Türkçe yanıt ver; görevi baştan sona tamamla; mevcut kodu bozma, minimal değişiklik yap; dosya silme/yeniden yazma yerine düzenle; her oturum `PROGRESS.md`'yi oku ve sonunda **ekleyerek** güncelle.
- **Test (ZORUNLU):** Her mantık/UI değişikliğinden sonra sırayla: (1) değişen `js/*.js` dosyalarına `node --check`; (2) mantık değişiminde izole VM harness ile maç akışı simülasyonu; (3) **`node tools/visual-check.js`** — masaüstü (1440×900) + mobil (390×844), 0 konsol hatası şartı, akış (15 adım): yeni kariyer → maç izle → taktik → market → ayarlar → transfer pazarlığı → gelen teklif → başkan hedefi → sezon ödülleri → playoff serisi → iflas senaryosu → draft, ekran görüntüleri `tools/visual-check-output/`. **Bu script çıkış kodu 0 vermeden görev tamamlanmış sayılmaz.**
- **Modül disiplini:** Yeni mantık ilgili `js/*.js` dosyasına girer (kod haritasındaki temaya göre); yükleme sırasını (`charazay2.0.html` içindeki `<script src>` sırası) bozma. Fonksiyonlar/`var`/`function` global; top-level `const/let` dosyalar arası paylaşılır ama `window.X` ile DEĞİL, ada göre erişilir. Yeni buton eklenince onclick handler'ının global bir `function` olduğundan emin ol.
- **Dil (30. oturum):** yeni kullanıcı metni eklerken Türkçesini yaz, sonra karşılığını `js/i18n-dict.js`e ekle (birebir dize anahtar). İçinde oyuncu/takım adı ya da sayı geçen üretilmiş metinler için `I18N_PHRASES` kalıbı yaz. Yeni bir veri kataloğu eklersen `localizeCatalogs()` içine kaydet. Değişiklikten sonra `node tools/i18n-scan.js` çalıştır — kalan Türkçe yalnızca özel isim olmalı.
- **Ekonomi değerleri** `ecoRound()` üzerinden ölçeklenir; ham KR sabiti yazma.
- **Kullanıcı girdileri** (takım/arena/menajer adı) `sanitizeTeamName` ile temizlenir (XSS).
- **Para birimi USD ($)** — FAZ 25 USD. Eski "KR (Kredi)" kaldırıldı; "USDT'ye dönme"
  kararı KRİPTO parayla ilgiliydi ve dolarla çelişmiyor. Simge/biçim TEK KAYNAK:
  `fmtPara` / `fmtMaas` (`js/i18n.js`) — koda `$`+sayı YAZMA, `ekonomi-check` A bölümü
  kaynağı tarar ve düşer. Ekonomi çapaları brifin tablosudur: kasa $120.000 · maaş
  bantları `MAAS_ANKOR` · arena 2.000→20.000 · bilet $8-$25 (normal $13) · sponsor
  $8.000-$150.000. Değişince `node tools/ekonomi-check.js` + `season-loop --runs=3`.
- **Oyuncular hep erkek** (portre havuzu buna göre).
- **Uzun vadeli denge (FAZ 9):** kadro gelişimi `match-prep.js` sezon geçişi bloğunda (potansiyel boşluğuna bağlı), ekonomi dengesi `salaryKRFromGenel` çarpanı + `weeklyWageBill` + maç ödülleri. Değiştirince `season-loop --runs=3` ile ölç — tek koşu yargı için yetersizdir.
- **Kadro üst sınırı** `ROSTER_MAX` (`state.js`); yeni bir katılım yolu eklersen `rosterHasRoom()` ile koru.
- **Zorluk seviyesi (B5):** çarpanlar YALNIZ `js/state.js` içindeki `DIFFICULTY` tablosunda; koda dağıtma, `difficultyCfg()` ile oku. NORMAL tüm çarpanları 1/0'dır — yeni bir çarpan eklerken normalin nötr kalmasına dikkat et, yoksa mevcut denge ve `band.js` hash'i kayar.
- **Fikstür saati kapısı (F10-2):** oyun çok oyunculu ve fikstür tarihlidir; maç, saati gelince oynanır. Kapı tek noktadadır (`matchTimeGateOk` / `matchTimeGateMsg`, `js/state.js`) ve fikstürde `scheduledAt` bulunmadığı sürece açıktır. `?test=1` (`TEST_MODU`) kapıyı bilinçli olarak atlar — Node harness'lerinde `location` olmadığı için test modu **açık** kabul edilir. Yeni bir maç başlatma yolu eklersen kapıdan geçir.
- **Analitik (F10-4):** olaylar `trackEvent` / `trackOnce` / `trackMilestone` ile gönderilir; yeni olay eklerken `ANALYTICS_EVENTS` listesine de yaz. Varsayılan **kapalıdır** (`ANALYTICS_SRC=''`) ve betik yalnız `isProdHost()` doğruyken yüklenir — yerel ölçümler kirlenmez.
- **PWA (F10-7):** service worker yalnız yayın sunucusunda kaydedilir (`registerServiceWorker`); yerelde önbellek eski JS'i servis edip testleri yanıltırdı. Script sürümünü artırırken `sw.js` içindeki `SCRIPT_V`'yi de artır (`faz10-check` A4 sınıyor).
- **Sunum kararları YALNIZ `pr` (sunum PRNG'si) kullanmalı (F13-3 dersi):** anlatım seçimi
  `Math.random`/`rand()` çağırırsa maçın rastgele akışı kayar ve `band.js` hash'i değişir.
  Yeni bir anlatım dalı eklerken `pickLine(..., pr, ...)` / `prChance()` kullan.
- **Olay zamanı iki alandır (F13-17):** `dt` olayın maç saati PAYI (çeyrek toplamı 600 sn),
  `dtPos` pozisyonun tamamı ve SUNUM temposunu belirler. İkisini karıştırma — yalnız `dt`
  bölünürse maç iki kat hızlı akar (`live-metrics` syncRatio 3,3× → 6,8×).
- **Olay `dt` taşımıyorsa oynatma 12 sn varsayar** (`dtMs = 12 × 0.3 = 3,6 sn`): koreografisi
  kısa olan olaylar (hava atışı, çeyrek başı) ekranda donmuş gibi durur. Maç saatinden süre
  yemeyen her yeni olaya **`dt:0`** ver (37. oturum: açılışta 2,2 sn ölü bekleme buydu).
- **Canlı sahada O/X şut izi YOKTUR** (37. oturum kullanıcı kararı) — parkede yalnız oyuncular
  ve top. `mState.allShots` verisi durur (kutu skor/analiz), ama çizim katmanı kaldırıldı;
  geri eklenmemeli. `anlatim-check --freeze` bunu sınıyor.
- **Maç donarsa sessiz kalmamalı (F13-14):** `canResumeMatch()` / `resumeMatch()` /
  `startMatchWatchdog()` üçlüsü; buton etiketi tek kaynaktan (`syncMatchButtons`).
- **Sahne saati ile olay saati ayrıdır (F11-1):** jetonlar `requestAnimationFrame`, olaylar `setTimeout` üzerinden akar. rAF kısıtlanırsa (arka plan sekmesi, ağır cihaz) sahne anlatımın gerisine düşer; `_simCatchUp()` 0,35 sn'yi aşan boşlukta sahneyi güncel olaya eşitler. Koreografiye yeni adım eklerken bu yolun da adımı çalıştıracağını hesaba kat.
- **Jeton hızı `maxV` doğrudan atanmaz (F15-1):** `_setUrg(p,_URG.YURU|JOG|KOS|SPRINT)` ile
  verilir; `maxV` kademeden (`_V_TIER`) türetilir. Dizilim noktası atarken `_hedefAta()`
  kullan — nokta 26 px'ten yakınsa oyuncu yerinde kalır (her pozisyonda yer değiştirmesin).
  Savunmacının kademesi adamınınkinden düşük olamaz.
- **SAHNE SAATİ ≠ MAÇ SAATİ (F15 dersi):** canlı sahne maç saatini **~2× sıkıştırarak**
  oynatır (`hareket-check` ölçüyor: 1 sahne sn ≈ 2,0 maç sn). Bir jetonun px/sn değerini
  29,54'e bölüp gerçek basketbolun m/sn'siyle kıyaslamak **yanlış büyüklüğü** karşılaştırır —
  FAZ 15 brifi bu yüzden "oyuncular 4 kat hızlı" diyordu, oysa maç saatinde 1,45 m/sn ile
  gerçeğin (1,54-1,60) bir tık altındaydı. Hızları mutlak olarak düşürmek jetonların
  pozisyon içinde yerlerine varamamasına ve FAZ 11 kapılarının düşmesine yol açar.
- **Canlı sahne katmanında `Math.random`/`rand()` YOK (B-5 dersi):** sahne kararları
  (kenardan sokma noktası, serbest topun saçılma açısı, dizilim seçimi, ribaund çekişmesi)
  maçın rastgele akışını tüketiyordu; animasyon karesi sayısı gerçek zamana bağlı olduğu için
  aynı tohum iki farklı sezon sonucu veriyordu. Sahnenin kendi akışı vardır: **`_sr()` /
  `_srand(a,b)`** (`_scSeed` maç başında tohumlar). F13-3'ün anlatım kuralının sahne karşılığı.
- **Saha çizgisi geometrisi (F14-1 dersi):** bir SVG yayının yarıçapı iki ucu arasındaki
  **kirişi kapsamıyorsa tarayıcı yarıçapı SESSİZCE büyütür ve merkezi kaydırır**. `r="..."`
  niteliğini okuyup "doğru" demek bu yüzden geçersizdir — `node tools/geometri-check.js`
  çizilen eğriyi ölçer. Saha ölçeği artık iki eksende eş: **29,5429 px/m** (827,2×443,14 px).
  `THREE_R` (`match-engine.js`) SVG'deki yarıçapla **aynı** kalmalı.
- **Serbest atış beklemesi tek kapıdadır:** `_ftWaitSec()` — normal faul dalı ve
  `_and1Sequence` ikisi de oradan geçer. Ölçüt en geç gelen oyuncudur ve jetonun **varış
  freni** (son 24 px, ≤12 px/sn ≈ 2 sn) hesaba katılır. `sunum-check` F14-7 sınar.
- **Yeni anlatım havuzu eklerken (B-1 dersi):** havuzu `localizeCatalogs()`'a **kaydet**,
  satırların EN karşılığını `js/i18n-commentary.js`'e yaz. Şablonla (`${ad}`) kurulan
  cümleler sözlüğe giremez, `I18N_PHRASES` **kalıbı** ister ve kalıp `unshift` ile başa
  konur (sondaki genel sözcük kalıpları cümlenin ortasındaki tek kelimeyi çevirip
  "reboundingu aldı" melezini üretmesin). Simge önekli metinlerde kalıp **simgeyi
  içermemeli** — `_splitIconPrefix` simgeyi soyup gövdeyi ayrı çevirir.
  `node tools/i18n-scan.js` artık canlı anlatım akışını da tarar (kapı: Türkçe < %5).
- **Personel de oyuncularla aynı milliyet kuralına tabidir (FAZ 22 §1):** koç ve izci
  adları ya SABİT bir dizide gömülüydü ('Ahmet Yıldız','Carlos Ruiz','Mike Johnson') ya da
  genel `ILK`/`SY` havuzundan çekiliyordu; ülke hiç hesaba katılmıyordu ve %100 Türk bir
  ligde 6 koçun 5'i yabancı çıkıyordu. Üstelik genel havuz FAZ 17 §3.4 marka temizliğinden
  GEÇMEMİŞTİ ("LaMelo Okonkwo"). Artık `personelUlkesi()` + `personelAdi()` kullanılır:
  ad `NAME_POOLS`'tan gelir, kariyer başındaki takım koçları %100 yerlidir, yabancı yalnız
  pazardan ve bot oranıyla (%10) gelir. Yeni bir personel türü eklersen aynı ikiliyi kullan.
- **Bilanço: gerçekleşen ≠ düzenli (FAZ 22 §2):** tahmini/düzenli kalemler (haftalık maaş,
  bilet tahmini) GERÇEKLEŞEN listelerine karıştırılmaz. Karıştığında "Toplam" ekrandaki
  rakamları saymıyormuş gibi görünüyor ve kullanıcı haftada 9.697 KR kaybederken
  "+891 KR kârdayım" diye okuyordu. Düzenli kalemler ayrı kartta, altında **haftalık net
  beklenti** ve kasanın kaç hafta yeteceği yazar.
- **Doluluk taraftar tabanını aşamaz (FAZ 22 §3):** doluluk formülü yalnız forma bakıyordu;
  1.276 taraftarlı kulüp 5.000 kişilik arenayı %90 dolduruyordu. Artık tek kaynak
  `arenaDolulukOrani()` (form + bilet fiyatı + **taraftar tavanı**), gelir ve ekran aynı
  fonksiyondan okur. Taraftar tabanı 1.000 → 2.800 yapıldı ki başlangıç geliri (5.400 KR)
  DEĞİŞMESİN; değişen şey, arena büyüdükçe doluluğun taraftara takılması — büyük arena
  açmak artık önce taraftar büyütmeyi gerektirir.
- **Grafik ekseni gerçek veriyi göstermeli (FAZ 22 §4.1):** tek değerde bant açılıyor
  (`min-1`/`max+1`) ve ETİKET açılmış banttan basılıyordu; kart "93.0" derken grafik "94"
  diyordu. Çizim bandı açılır, etiketler `etiketMin`/`etiketMax` ile gerçek veriyi yazar.
  3 maçtan az veride grafik yerine bilgi metni gösterilir (`TREND_MIN_MAC`).
- **JS DEĞİŞTİYSE SÜRÜMÜ ARTIR (FAZ 20 dersi — pahalıya mal oldu):** PWA service worker
  `js/*.js` dosyalarını **önce önbellek** ile servis eder ve anahtar `?v=N`'dir.
  FAZ 17B ve FAZ 19'da JS değişti ama `?v=` ve `SCRIPT_V` **53'te kaldı**; siteye dönen
  her kullanıcı FAZ 17 kodunu çalıştırmaya devam etti. Maç saati düzeltmesi, market
  yerli oranı ve eski kayıt temizliği KODDA VARDI ama tarayıcıya hiç ulaşmadı — FAZ 20
  brifi bu üç maddeyi haklı olarak "uygulanmamış" diye raporladı. Artık
  `node tools/surum-check.js` bunu yakalar: içerik hash'i değişip sürüm sabit kalırsa
  denetim DÜŞER. Sürümü artırınca `--yaz` ile kaydı tazele.
- **Zorluk seçici YOK (FAZ 20 §8, kullanıcı kararı A):** Kolay/Normal/Zor seçicisi hem
  kurulum ekranından hem Ayarlar'dan kaldırıldı. Zorluk klasik bir kaydırıcıdan değil,
  **yorgunluk temelli dinamik sakatlık riskinden** gelir — rotasyon yönetimi gerçek karar
  olsun diye. `DIFFICULTY` tablosu ve `difficultyCfg()` imzası YERİNDE bırakıldı (onlarca
  çağıran var, eski kayıtlarda `G.difficulty='zor'` olabilir); `difficultyCfg()` artık
  daima `DIFFICULTY.normal` döndürür. Yeni bir zorluk çarpanı EKLEME.
- **Kariyer akışları oyun kaydından bağımsız yaşar (FAZ 20 §6):** haber akışı
  `sessionStorage` (NEWS_SESSION_KEY), kulüp önbelleği `localStorage` (CLUB_CACHE_KEY)
  içindedir. Yeni kariyer kurulurken `kariyerAkislariniSifirla()` çağrılmazsa önceki
  kariyerin maç sonucu yeni Ana Panel'de görünür. Yeni bir kalıcı akış eklersen oraya yaz.
- **Sıralama sezon başlamadan gösterilmez (FAZ 20 §7):** 20 takım 0-0 iken "3. sıra"
  yalnız ad sıralamasından geliyordu ve keyfîydi. `sezonBasladiMi()` false ise
  `userLigSirasi()` null döner; ekranlar "—" ve "Sezon başlamadı" gösterir.
- **Lig adlarında TEK KAYNAK (FAZ 19 §1 dersi):** aynı ligin takım adları iki yerde
  duruyordu — TBL deposu (`sub.teams` → `genLigTeams`) ve `G.season.standings`. İkisi
  ayrı depolarda (localStorage TBL anahtarı vs oyun kaydı) olduğu için biri yenilenince
  ayrışıyorlardı: canlıda kesişim 3 isimdi, puan durumunun 17 satırı "—" gösteriyor,
  kullanıcının takımı tabloda hiç görünmüyor, Ana Panel'de sıra "-" kalıyordu.
  Kural: **aktif sezon otoritedir.** `ligAdlariniOnar()` depoyu sezona göre eşitler ve
  `buildLeagueRows` her çizimden önce onu çağırır. Sıra tek yerden okunur:
  `userLigSirasi()`. Yeni bir ekran lig adı/istatistiği gösterecekse `G.season`'dan okusun.
- **Bot-bot skoru güç dağılımına aşırı bağlıydı (FAZ 19 §2 ölçümü):**
  `pseudoTeamStrength` 58-100 arası **42 puanlık** yelpaze üretiyor, `cpuMatchScore` bunu
  `diff×0.52` ile skora çeviriyordu. Sonuç: ortalama sayı farkı 21,4 · maçların %51,9'u
  20+ farkla bitiyor · 16 maçlık sezonda bir takım 16-0, iki takım 0-16. Yelpaze **20
  puana** (58-78), katsayı **0,25**'e indirildi; gürültü DEĞİŞMEDİ (denge rastgelelikle
  değil, dağılımı daraltarak sağlandı). Ölçülen: fark **10,6** · 20+ **%12,3** · 5- **%31,6**
  · 16-0 takım **%0,5**. Değiştirince `lig-check` C bölümü ölçer.
- **Maç saati tek yönlüdür (FAZ 19 §4):** motor `ev.t` alanında **KALAN** saniyeyi tutar.
  Anlatım damgası bunu geçen süreye çevirmemeli — tabela geriye sayarken akış ileri
  sayınca kullanıcı iki farklı saat görüyordu (tabela 5:17 · akış 4:43). FIBA yayın
  standardı geriye sayımdır; açılış satırları `1P 10:00` damgalıdır. `sunum-check` F19-4.
- **Puanlama FIBA'dır (FAZ 19 §7.5, kullanıcı kararı):** galibiyet 2, **mağlubiyet 1**
  (`standingPuan`). Puan farkları daraldığı için averaj daha sık belirleyici olur.
- **Portre adı geçersizse yenilenir (FAZ 19 §5.2):** "bir kez yaz, bir daha değiştirme"
  kuralının tek istisnası, saklanan `portreDosya`nın güncel havuzda BULUNMAMASIDIR
  (havuz yeniden kurulunca oluyor). Var olmayan dosyada ısrar boş kutu demekti.
  Yedek zinciri her adımda ilerlemeyi garanti eder: komşu → SVG → düz gri kart.
- **Milliyet (FAZ 17):** *lig kurulurken içindeki her oyuncu ligin ev ülkesindendir* —
  yabancılar yalnız sezon başladıktan sonra transferle gelir. Ev ülkesi tek sabittedir
  (`LIG_EV_ULKE`, `js/state.js`); `'Türkiye'` dizgisini koda gömme. `genPlayer(poz, ulke)`
  ikinci parametresi artık boolean değil ÜLKE (`true` = geriye dönük Türkiye, `null` =
  küresel rastgele — yalnız transfer piyasası). Kadro/draft/altyapı `LIG_EV_ULKE` geçirir.
  Bot takımlarda yabancı payı `BOT_YABANCI_ORAN`, tavan `BOT_YABANCI_MAX`; kullanıcıda sınır
  YOK. Değişiklikten sonra `node tools/milliyet-check.js`.
- **Milliyet kararı akışı kaydırmaz (FAZ 17 dersi):** `genPlayer` ülke sabitlense bile
  `ch(ULKELER)` çekilişini YAPAR ve sonucu sonra ezer. Çekilişi atlamak maçın rastgele
  akışını bir adım kaydırır, `band.js` hash'i ve `sim-node` ortalamaları değişir
  (F13-3 / B-5 dersinin milliyet karşılığı). Karar kapıları `prChance`/`prWeighted` ile
  kurulur — bunlar hash'ten türer, rastgelelik TÜKETMEZ.
- **`prUnit` karıştırıcısız kullanılamaz (FAZ 17 ölçümü):** `hash32` (djb2-xor) son
  karakteri XOR'ladığı için yalnız son karakteri değişen anahtarlar (`…|yabanci|0..9`)
  aynı dilime düşer. Karıştırıcı eklenmeden bot yabancı kapısı doğru oranda (%11,5)
  açılıyor ama açılışlar birkaç takımda yığılıp tavana çarpıyordu; gerçekleşen oran %2,3'tü.
  `prMix` (murmur3 finalizer türevi) eklendi — ölçülen %8,8, desil sapması %1.
- **Portre üretimi tek akıştır (FAZ 17B ölçümü):** pollinations anonim kullanımda **IP
  başına TEK istek** kabul ediyor; ikincisi anında `429 "Queue full for IP … (max: 1)"`
  döner. Ölçülen süre **~43 sn/görsel**; eleme kapılarıyla birlikte **~90-100 sn/portre**.
  `--jobs` bayrağı kabul edilir ama **1'e kelepçelidir** — paralellik denemek yalnız 429
  üretip toplam süreyi uzatır (FAZ 17'de `--jobs=6` ile koşulan parti bu yüzden boşa
  emek harcamıştı). Aynı anda **iki üretici çalıştırma**: ikisi birbirini 429'a düşürür.
- **Forma yazısı/markası istemle çözülmez (FAZ 17B dersi):** "no text, no logo" yazmak
  yetmiyor — kilitli istemle üretilen ilk 5 karenin 4'ünde hâlâ yazı/amblem, birinde
  **Nike swoosh'u** vardı; daha öncekilerde "LAKERS" okunuyordu. Çözüm iki katmanlı:
  (a) **kadraj zoomu** (`ZOOM`/`KADRAJ_UST`) göğsü çerçeve dışına iter,
  (b) **ölçülen eleme**: `MAX_FORMA_PARLAKLIK` (beyaz/açık forma) ve `MAX_YAZI_ENERJI`
  (kumaş tonundaki bölgede Laplace kenar enerjisi). Naif "medyandan sapan piksel oranı"
  İŞE YARAMAZ — beyaz yaka biyesi temiz kareyi en yüksek skora çıkarıyordu (ölçüldü:
  temiz %43,9, yazılı %25,3 — ters sonuç).
- **Market uyruk dengesi (FAZ 17B):** market "küresel rastgele" bırakılırsa Türkiye 43
  ülke içinde 1/43'e düşer — ölçümde 200 oyuncunun 1'i yerliydi (%0,5) ve yeni "Yerli"
  filtresi boş geliyordu. Yerli payı sezona bağlıdır (`marketYerliOran`: sezon 1 %55 →
  sezon 6+ %25) ve yabancıya OVR primi verilir (`MARKET_YABANCI_*_PRIM`) ki üst sıralar
  yabancı ağırlıklı olsun. Değiştirince `milliyet-check` F bölümü ölçer.
- **Portre bir kez seçilir (FAZ 17):** ülke (`ULKE_KOVA` dağılımı) + yaş bandı ile seçilir,
  sonuç oyuncunun `portreBand` / `portreDosya` alanlarına YAZILIR ve bir daha hesaplanmaz.
  Sebebi: manifest'e yeni parti eklendiğinde modulo kayar; dosya adı saklanmasaydı kayıtlı
  kariyerlerdeki bütün yüzler değişirdi. Havuza dosya eklerken **yeniden numaralama yok**.
  Yedek zinciri yalnız iki basamak: yerel dosya → AYNI kovadan komşu dosya → SVG. Canlı
  görsel API basamağı kaldırıldı (çevrimdışı + Steam). Değişiklikten sonra `portre-check`.
- **i18n sınırları ASCII değildir (FAZ 17 dersi):** `\b` için `ğ`/`ç` sözcük karakteri
  SAYILMAZ — `/\bKaradağ\b/` ve `/İsveç\b/` hiç eşleşmiyordu. Türkçe harfle başlayan ya da
  biten kalıplarda sınırı açık yaz: `(^|[^A-Za-zÇĞİÖŞÜçğıöşü])…(?![A-Za-zÇĞİÖŞÜçğıöşü])`.
- **Dizilim koordinatları** `SET_*` sabitlerindedir (`match-engine.js`); değiştirince `faz11-check` B1 (geometri) ve `spacing-check` ile ölç. Koreografi adımı eklerken (kesme, perde, şutör hamlesi) dizilimin ÇEVRESİNİ boşaltmamaya dikkat et — köşedeki oyuncuyu topa çağırmak aralığı çökertir.
- **Özel ada ek `turkEk()` ile eklenir (FAZ 25 §7.1):** şablona sabit ek YAZMA. Canlıda
  263 olayda 20 dilbilgisi hatası vardı — "Ömer Polat'ye", "Bursa Yıldırım'de",
  "Kayseri Boğaları'ye", "Koray Gündoğdu'nin". Şablonda `%R{e}` / `%T{de}` / `%R{in}`
  yaz; `adKoy()` önce çekim ekli yer tutucuları, sonra düz `%X`'i çözer (anahtarlar
  UZUNDAN KISAYA sıralanır — `%SC` `%S`'den önce). Türkçede iki ayrı olgu vardır ve
  karıştırılırsa ek yanlış çıkar: **kaynaştırma** (iyeliksiz ünlü — Gündoğdu'**ya**, ama
  tamlayanda Gündoğdu'**nun**) ile **zamir n'si** (3. tekil iyelik — Boğaları'**na**,
  Boğaları'**nda**, Boğaları'**ndan**). `js/turkce-ek.js` `state.js`'ten sonra,
  `match-engine.js`'ten ÖNCE yüklenir; `sim-node`, `anlatim-check`, `lig-check`,
  `milliyet-check`, `portre-check` modül listelerinde de olmalı. Değişince
  `node tools/turkek-check.js` (8 ad × 4 durum tablosu).
- **Anlatımda fail kaybolmamalı (FAZ 25 §7.2):** `AKIS_ON` ön parçalarının bir kısmı
  adsızdır ('Perde geldi.', 'İkili oyun.') ve kısa çekirdekler de adsızdır ('Kaçırdı.');
  ikisi birleşince "İkili oyun. Kaçırdı." çıkıyor ve kimin attığı kayboluyordu. `zincirLine`
  ön parçada `%S` yoksa çekirdeğe faili ekler. Havuzu daraltma — çeşitlilik değerli.
- **Saat referansı ve son bölüm tonu (FAZ 25 §7.3):** `saatGate` / `tonGate`, sayaçları
  `_saatG` ile MAÇ düzeyinde tutar (`narr` ile aynı kapsam — F13-3/F14-1 tuzağı). Hedef
  saat referansı %6-14, 4Ç son 3 dk ton satırı ≥3/maç. Kapı yalnız şut olaylarına
  bağlanırsa aday havuzu küçük kalır ve oran %2-5'te takılır; ribaund ve faul olaylarına da
  bağlıdır. Çeyreğin son 10 saniyesinde cooldown atlanır.
- **Üslup ölçüleri (FAZ 25 §7.4):** zincir oranı %50-60 · ortalama olay kelime sayısı <9 ·
  yabancı terim 0 · parantezli taktik etiketi 0 · künye biçimli faul ≤%50 ·
  "hepsi içeride" ≤4/maç. Terim tercihleri SABİT: spacing→açılma, box-out→ribaunt bloğu,
  drive→içeri dalma, pick&roll→ikili oyun, AND-1→devam sayısı. Taktik adları CİNS İSİMDİR,
  kesme işareti ALMAZ ("erken tempoya") — `TAKTIK_ADI` tablosunda yönelme hâli hazır durur.
  Zincir ve yüksek frekanslı olaylarda TEK ad kullanılır (`_tokShort`) — gerçek anlatımın
  ritmi budur ("Cedi güçlü gitti."); resmî/tören satırlarında tam ad korunur.
- **Top taşıma rolleri (FAZ 25 §1):** topu 1/2/3 taşır; PF/C ribaundu alıp ÇIKIŞ PASI verir.
  Tek kaynak `_tasiyabilir()` + `_cikisHedefi()` (önce gerçek guard 0/1, sonra SF 2 —
  sıralamasız hâli M9'u %100'den %75'e düşürür). Pota 4 m'den yakınsa uzun kendi bitirir.
  Yeni bir top el değiştirme yolu eklersen bu ikiliden geçir.
- **Set hücumunda donma yok (FAZ 25 §2):** `S.canliSet` açıkken hedefi 340 ms'den uzun
  sabit kalan oyuncuya dizilim noktasının çevresinde yeni nokta verilir. Üç kural:
  (a) salınım **radyal** olmalı (potaya doğru/uzağa) — serbest yön savunmacıyı adam-pota
  doğrultusundan çıkarır ve ball-you-man düşer; (b) `_hedefAta` KULLANILMAZ, 26 px'ten
  yakın hedefi değiştirmez (F15-1) ve salınımı yutar — hedef doğrudan yazılır;
  (c) eşik SAHNE saatinde değil **gerçek saatte** ölçülür (sahne duvar saatinin ~0,45 katı
  akıyor). `_lock` "yeniden yönlendirme yasağı"dır, kıpırdama yasağı değil.
- **Şut TİPİ vardır ve yörüngeyi o belirler (FAZ 26 §1):** `shot.sut` ∈
  {smac, turnike, floater, jumper, uc}. `_ballShoot(to,dur,made,onDone,**tip**)` yayı ve
  süreyi tipten türetir (smaç ≤9 px yay · floater ≥62 px), `shooter.pop` sıçramayı verir.
  Tip bir SUNUM kararıdır: `pr` ile seçilir, isabeti/sayıyı/kutu skoru DEĞİŞTİRMEZ.
  Yeni bir şut yolu eklersen tipi `_ballShoot`'a geçir, yoksa şut yine "mesafeye bağlı
  tek yay" ile çizilir. Değişince `node tools/sut-check.js` + `sunum-check` F26-1/F26-2.
- **Şut tipi sözcükleri süzgeçten geçer (FAZ 26 §1):** `_sutSuz` ile `_DUNK_WORDS` /
  `_LAYUP_WORDS` / `_FLOAT_WORDS`. Üç küme AYRIK olmalı ve regexler **iki dilli** yazılır —
  `localizeCatalogs()` havuzları EN'de yerinde çevirdiği için yalnız Türkçe arayan süzgeç
  EN'de hiç eşleşmez ve tip ayrımı sessizce kaybolur. Şablonla kurulan sabit cümleler
  (ör. AND-1 satırı) de tipe duyarlı olmalı: `cls` "yakın mı" der, tipi söylemez —
  ölçümde 79 vakada floater/smaç "turnikeyi bitirdi" diye anlatılıyordu.
- **Maç öncesi tabela sıradaki maçı gösterir (FAZ 26 §2):** `syncLiveScoreboardPreview()`
  (`js/render.js`) adları `findNextUserSeasonMatch()`ten okur — Ana Panel kartıyla TEK
  KAYNAK. İki koruma zorunludur: maç canlıyken ve **oynanmış bir maçın tabelası dururken**
  yazmaz (skor/kutu skor o maçı gösterirken adı değiştirmek F13-18'in "aynı ekranda iki
  farklı maç" hatasıdır).
- **Ölçüm aracına alan eklerken TAŞIMA LİSTESİNİ de güncelle (FAZ 26):** `sunum-check`
  tarayıcıdan Node'a sabit bir alan listesi taşır (`const HAM = await page.evaluate(...)`).
  Listeye yazılmayan toplayıcı sessizce boş gelir ve kapı "ÖRNEK YOK" der — `yay` ve
  `titreme` tam olarak böyle kayboldu.
- **REGRESYON TABANI BELGEDE TUTULUR (FAZ 31 §4):** `sim-node --n=100 --seed=42` için
  güncel taban **88.0 - 81.3 · olay/maç 248 · tohum 42 → 93-82**. FAZ 30'da oyuncu
  milliyeti rastgeleleşince isim çekilişleri değişti, `ensureUniquePlayerNames` yeniden
  çekilişleri kaydı ve tohum→sonuç eşlemesi kaydı; determinizm KORUNUYOR (aynı tohum aynı
  maç). Eski taban (87.2 - 80.0 · 249) briflerde tekrar edilirse ±1.5 toleransı gerçek bir
  kaymayı gizler — taban her bilinçli kaymada BURADA güncellenir.
- **LİG KÜRESELDİR — "ev ülkesi" YOK (FAZ 30):** `LIG_EV_ULKE`, `BOT_YABANCI_*`,
  `MARKET_YERLI_*` ve `marketYerliOran()` KALDIRILDI. Oyuncu/koç/izci milliyeti 43 ülke
  arasından gelişigüzeldir. KALAN: `NAME_POOLS`, `randomNameFor`, `ULKE_KOVA` (portre) —
  ad ve yüz hâlâ oyuncunun ÜLKESİNE göre üretilir. Koda `'Türkiye'` gömme; deterministik
  ülke gerekiyorsa `rastgeleUlkeAdi(tohum)`. `milliyet-check` G bölümü izlerini arar.
- **Ülke parametresini kaldırmak akışı KAYDIRMAZ (FAZ 30):** `genPlayer` ülke sabitlense
  bile `ch(ULKELER)` çekilişini ZATEN yapar (FAZ 17 dersi). Bu yüzden `genPlayer(poz,ULKE)`
  → `genPlayer(poz)` dönüşümü rastgelelik akışını bozmaz — tersi (çekilişi atlamak) bozar.
- **DİVİZYON MERDİVENİ (FAZ 30 §4):** Divizyon 1 en üst, aşağı doğru uzar (`DIV_SAYISI`).
  Anahtar biçimi korunur: `'tbl'` = Divizyon 1, `'d.g'` = Divizyon d+1 · Grup g.
  Yeni kariyer EN ALT divizyonda başlar (`divizyonDoldurmaSirasi`). Güç kayması
  `divizyonOvrKaymasi()` ile gelir ve **çapa EN ALTTADIR (0)** — üst divizyonlar
  güçlenir. Çapa üste konursa (Div1=0, alt divizyonlar eksi) yeni kariyerin MUTLAK
  zorluğu düşer ve skor bandı kayar (ölçüldü: 89,7-81,8 → 90,7-76,8). Kayma
  `botOvrKaydir` ile SAF ARİTMETİKTİR, yeni çekiliş yapmaz.
- **Takım adında şehir = adın İLK SÖZCÜĞÜ (FAZ 30 §3):** `genUniqueClubName` "aynı
  divizyonda en fazla 2 takım" kuralını böyle uygular. Havuza ÇOK KELİMELİ şehir ekleme —
  "San Juan" ile "San Diego" aynı şehir sanılır ve kural sessizce yanlış işler.
- **Kullanıcının profil ülkesi HİÇBİR mekaniğe girmez (FAZ 30 §5):** `G.menajerUlke`
  yalnız profil kartında bayrak + ad olarak görünür. `milliyet-check` F bölümü "aynı
  tohum + farklı ülke → birebir aynı kadro" diye sınar.
- **Ad ↔ havuz uyumu BÖLÜNEBİLİRLİKLE ölçülür (FAZ 30 §7 dersi):** isim havuzlarında
  çok kelimeli girişler var ("De Luca", "Juan Pablo"). "İlk boşluktan böl" ölçütü çok
  kelimeli ÖN ADI yanlış havuzdan sayar ve denetim ARALIKLI düşer (ölçüldü: %18 olasılık,
  4 koşudan 1'i). Doğru ölçüt: adın havuzdaki bir (ilk, soyad) çiftine bölünebilmesi.
- **Ölçüm aracı örneklem güdümlü olmalı (FAZ 30 eki):** `sunum-check` tek maç izliyordu ve
  oran tabanlı kapılar ondalık örneklemle karar veriyordu; M9 davranış değişmeden ~%24
  olasılıkla düşüyordu. Pencere artık her kapı kendi ALT SINIRINA ulaşana kadar yeni
  maçlarla uzar. Alt sınır istatistikle seçilir (gözlenen oran, eşik ve kabul edilebilir
  düşme olasılığından). ⚠ Çok maçlı örneklemde `P.sonEvIx` geriye sarmada sıfırlanmalı.
- **BİÇİM DİLE BAĞLIDIR (FAZ 29 §3):** binlik ayracı, yüzde işaretinin YERİ ve sıra eki
  dile göre değişir. Tek kaynak `fmtSayi` / `fmtYuzde` / `fmtSira` (`js/i18n.js`);
  `fmtn` bunlara bağlıdır. Koda `toLocaleString('tr-TR')` ya da elle `'%'+n` YAZMA —
  `tools/bicim-check.js` kaynağı tarar ve düşer. İngilizce sıra ekinde 11/12/13
  İSTİSNADIR (11th, 12th, 13th — 11st değil).
- **Şablon yer tutucuları diller arasında SIRAYLA doldurulmaz (FAZ 29 §4):** Türkçe
  dizilim birebir çevrilince İngilizce cümlenin nesnesi düşüyor ve ilgeç havada kalıyor
  ("… have announced a deal for."). Kelime sırası değişen cümlelerde İngilizce şablonu
  AYRI yaz (`isEN()` dalı), tek şablonu parçalayıp çevirme.
- **İki kademeli süzgeç ikinci kademeyi KÖR EDER (FAZ 29 §1 dersi):** `i18n-scan`in
  tarayıcı içindeki toplayıcısı kendi sözcük listesiyle eliyor, Node tarafındaki
  sınıflandırıcıya yalnız elenenler ulaşıyordu; "Durdur", "14.714", "2. place" hiç
  görünmüyordu. Toplayıcı HAM metni de gönderir, karar tek yerde verilir. Kusur sınıfı
  eklerken önce toplayıcının o satırı gönderdiğinden emin ol.
- **Türkçe belirteç ÖZEL İSİM OLAMAZ (FAZ 29 §1):** "Türkçe harf var" ölçütü her Türk
  oyuncu/takım adını kusur sayar. Kural: Türkçe harf içeren **küçük harfli** sözcük cins
  isimdir; büyük harfle başlayan özel isimdir ve çevrilmez. Ayrıca ASCII sözcük sınırı
  (`[^A-Za-z]`) Türkçe harfi dışlamalıdır — yoksa "Kürşat" içindeki "at" İngilizce
  sözcük sanılır (ölçüldü: 181 yanlış pozitif).
- **Anlatım satırını KISALTIRSAN sözlük anahtarı da değişir (FAZ 29 dersi):** FAZ 28'de
  kelime bütçesi için kısaltılan 36 satırın eski EN girişleri ölü kaldı ve EN oyuncu o
  satırları Türkçe gördü (%9,1). `anlatim-check` artık her havuz satırının EN karşılığını
  arar — havuzu değiştirdiğinde çeviriyi de güncelle.
- **Kural kaynağı düzeltmek YETMEZ, ÖNBELLEK de onarılmalı (FAZ 29 §7):** bot kadroları
  localStorage kulüp önbelleğinde saklanır ve yeniden ÜRETİLMEZ; FAZ 28'in sezon-1
  yabancı kuralı yalnız YENİ kadrolara işledi, eski kayıtlarda yabancılar kaldı (canlıda
  üç vaka). `faz29BotUyrukOnar()` onarır — yalnız ad ve ülke değişir, id/seed/nitelik
  korunur ve ad DETERMİNİSTİKTİR (`randomNameFor(ulke, tohum)`); `ch()` kullanılırsa
  kadro her açılışta başka isimler alır. Yeni bir kalıcı önbellek eklersen onarım yolunu
  da düşün.
- **"Servis" basketbol terimi DEĞİLDİR (FAZ 28 §2):** voleybol/tenis sözcüğüdür; pas ve
  kenardan sokma için "topu oyuna soktu / kenara aktardı / yan çizgiye çıkardı" kullanılır.
  Yeni anlatım yazarken deyim uydurma — "demire geldi", "turnike dönmedi", "smacı tutmadı"
  Türkçede yoktur. `anlatim-check` kara listesi bunları sınar.
- **Her şut sınıfının kendi dili ve kendi yörüngesi vardır (FAZ 28 §2):** `smac` ·
  `turnike` · `floater` · `kanca` (postta uzun) · `tipin` (hücum ribaundu) · `jumper` ·
  `uc`. Sınıf başına havuzda **≥8 ifade** olmalı (`SUT_LINES` + `KISA_CEKIRDEK_SUT`);
  sözcük kümeleri (`_DUNK/_LAYUP/_FLOAT/_HOOK/_TIPIN_WORDS`) **ayrık** ve **iki dilli**
  yazılır — bir satır iki kümeye birden girerse süzgeç onu her tipte eler.
  `node tools/sut-check.js` + `sunum-check` F26-1/F26-2.
- **Her anlatım parçasında yüklem bulunmalı (FAZ 28 §2.1.3):** kısa parça ritimdir ama
  yüklemsiz parça kopuk durur ("Yavuz geldi. **Üç sayı.**"). Künye/etiket satırları
  ("Faul — X (kişisel 2)") bu kuralın dışındadır — onları fiile çevirmek anlatımı bozar.
  Kapı: fiilsiz cümle oranı <%5.
- **OLAY DAMGASI POZİSYON İÇİNDE YAYILIR (FAZ 28 §4):** maç saati POZİSYON BAŞINA bir kez
  azalır, dolayısıyla bir pozisyonun bütün olayları doğal olarak AYNI `t`yi taşır (canlıda
  üç olay "1P 6:19" görünüyordu). `_damgaDagit` olay üretimi bittikten sonra damgaları
  pozisyonun kendi penceresine dağıtır — `_dt` ve rastgele akış DEĞİŞMEZ. Yeni bir olay
  üretim yolu eklersen o da bu pencereye girsin. Korna anı (0:00) muaftır.
- **Sezon 1'de ligde yabancı oyuncu YOKTUR (FAZ 28 §5):** kural `genRoster`da vardı ama
  `botClubEnsureDepth`ta YOKTU — bot kadrosu ilk kurulduğu anda yabancı alıyordu ve
  sezon 1'in 4. turunda sahada yabancı çıkıyordu. Oran tek kaynaktan gelir:
  `botYabanciOran()` (`js/state.js`), sezon 1'de 0. Yeni bir kadro kurma yolu eklersen
  oradan geçir; `milliyet-check` J bölümü sınar.
- **Kapı havuzun BİREBİR metnini arıyorsa havuzu değiştirince kapıyı da güncelle
  (FAZ 28):** `TON` regex'i `SON_BOLUM` satırlarını metinle arıyordu; satırlara yüklem
  eklenince kapı 3,8'den 2,1'e düştü — ton azalmamıştı, havuz değişmişti. FAZ 25'teki
  "kapı biçim okuyordu" dersinin aynısı.
- **SAHNE KATMANI KOREOGRAFİYİ EZMEZ (FAZ 26 dersi — canlıda oyunu bozdu):** set
  salınımı (§2), hedefine DOĞRU YÜRÜYEN jetonun `p.tx/p.ty` değerini de yeniden yazıyordu.
  Sonuç: `_chase` topa koşmayı bırakıyor (ribaund sahada olmayan oyuncuya gidiyor),
  şutör şut noktasına varamıyor (`bridge()` topu boş noktaya taşıyıp oradan attırıyor),
  serbest atışta şutör çizgiye ulaşamıyor (M12 0/2). Kural: **salınım yalnız hedefine
  VARMIŞ jetona verilir** (< `_YERINDE_ESIK`), aktif `_chase` jetonuna hiç dokunulmaz,
  ve `_setFtFormation` `canliSet`i kapatır (serbest atış ÖLÜ TOPTUR). Sahne katmanına
  yeni bir "canlılık" davranışı eklerken önce koreografinin o jetona hedef verip vermediğine
  bak.
- **Sahne katmanının kendi pası koreografiyi kesmez (FAZ 26):** §1'in orta saha çıkış-pası
  kapısı anlatımda karşılığı olmayan bir pastır; senaryolu şutörden (`S.shooter`) ya da
  aktif takip sırasında topu alırsa anlatım ile sahne ayrışır ("mantıksız pas") ve şut
  noktası boşta kalır. Süresi de sabit verilmez — `_ballPass` mesafeden hesaplar (M6).
- **Canlı sahada jetonun üzerinde işaret YOKTUR (FAZ 26, kullanıcı kararı):** yönelim
  göstergesi (`tok-face` beyaz noktası) kaldırıldı. Yön HESABI (`p.yon`/`_sirtDonuk`)
  durur — post oyununu ve F25-6a'yı besler —, çizim katmanı geri EKLENMEMELİ. 37. oturumun
  "O/X şut izi yok" kararının devamı.
- **Sahne damgaları POZİSYON BAŞINADIR (FAZ 26, F25-5 kök nedeni):** `S._sema` yalnız
  `spotup` dalında yazılıp hiç temizlenmiyordu; ölçüm onu `mState._semaAd`den önce
  okuduğu için maçın ilk spot-up'ından sonra BÜTÜN set kareleri 'spotup' kovasına düşüyordu.
  Yeni bir `S._xxx` sahne damgası eklersen pozisyon başında sıfırla.
- **Kapı YANLIŞ ŞEYİ ölçerse kusuru KENDİSİ üretir (FAZ 26 dersi, FAZ 14'ün tekrarı):**
  F25-2 donmayı "hedef değişmedi" ile ölçüyordu; hedefine doğru yürüyen oyuncu donmuş
  sayılıyor ve kapıyı kapatmanın tek yolu motorda hedefi sürekli yeniden yazmak oluyordu —
  oyunu bozan kod buydu. Ölçüt jetonun ÇİZİLEN KONUMUDUR; üstelik yalnız yer değiştirme de
  yetmez (yerinde kıpırdayan jeton "çakılı" sayılıyordu). Donma = **hareketsizlik**:
  net sapma ≤5 px **ve** ortalama hız < 3 px/sn, 1,5 sn boyunca.
- **Salınımın önündeki üç fiziksel engel (FAZ 26, ölçülerek bulundu):** (a) yön her adımda
  çevrilirse net yer değiştirme sıfırdır — tek yönlü **sürüklenme** gerekir (`_nudgeOfs`,
  bant ±22 px); (b) **varış freni** hedefe 24 px kalınca hızı 10 px/sn'ye düşürür ve salınım
  hedefi hep o frenin içindedir — salınım penceresinde (`p._swayT`) tavan 22 px/sn olur;
  (c) köşe slotlarında `_inX`/`_inY` **kırpması** bandın dış yarısını yutar — bant uçları
  ölçülerek açık/kapalı işaretlenir ve uç seçimi `_PL_R_TAKIM` (62 px) takım arkadaşı
  mesafesini gözetir.
- **Kenardan sokma yerleşimi (FAZ 25 §3):** `_sokmaYerlesimi` sokucunun 15 m içinde en az
  3 takım arkadaşı bırakır; `_sokmaHedefi` ilk pası 15 m ile sınırlar — istisna, hedefe en
  yakın savunmacı 8 m'den uzaksa (gerçek hızlı hücum).
- **Serbest atışta sektirme 1-3 (FAZ 25 §4):** `_ftSektir` sahne PRNG'siyle sayıyı çeker ve
  `b.dribBitis` dolunca `noDrib` açılır. Dizilim (F14-7) ayrı bir konudur, ona dokunma.
- **Jeton yönelimi (FAZ 25 §6.1):** `p.yon` + `_yonGuncelle`. Sıra: `_sirtDonuk` (post) →
  topu tutuyorsa pota → hareket yönü → top. Post oyununda `_sirtDonuk` şut anında kalkar.
- **Perde üç aşamadır (FAZ 25 §6.2):** kurulum → sıyırma → devrilme (roll/pop), artı savunma
  tepkisi (switch / arkadan dolaşma). Sıyırma OMUZ mesafesinde kalmalı: 30 px yanal
  kaydırma topçuyu 2,1 m götürüp savunmacısını koparıyor ve markaj ölçümünü bozuyordu.
- **İsim tek kaynaktadır (FAZ 24 dersi):** oyuncu, koç, izci, lig haberi ve ekonomi olayı —
  hepsi `randomNameFor(ülke)` üzerinden `NAME_POOLS`'tan okur. Genel bir yedek ad listesi
  (eski `ILK`/`SY`) **açma**: temizlik hep havuzlarda yapılır, ikinci bir liste o temizlikten
  geçmez ve sessizce %100 Türk bir ligde "Ja Clark" üretir. Havuzu olmayan ülke `LIG_EV_ULKE`
  havuzuna düşer ve `console.warn` basar. Yeni ad eklerken gerçek sporcuyla özdeşleşmiş adlar
  (`isim-check` G bölümündeki kara liste) ve ağırlıkla kadın olan adlar (H bölümü) girmemeli.
- **Seyirci taraftarı aşamaz (FAZ 24 §5):** doluluk `arenaDolulukOrani()` tek kaynağıdır ve
  taraftar tavanı **en sonda** uygulanır. %20 tabanını dışta bırakma — `Math.max(0.20, …)`
  en dışta durursa tavanı ezer (800 taraftarlı kulüp 30.000'lik arenada 6.000 seyirci
  topluyordu). Taraftar tabanını değiştirirken `TARAFTAR_KATSAYI` ile çarpımı sabit tut,
  yoksa bilet geliri sebepsiz kayar; `arena-check` + `season-loop --runs=3` ile ölç.
- **Eski kayıt onarımları ad/bayrak uyumunu da kapsar:** `faz24PersonelAdiOnar()` yalnız ADI
  değiştirir (seviye/maaş/skor/geçmiş/atama korunur) ve `personelAdiSabit()` deterministiktir —
  `rand()` kullanılırsa koçun adı her açılışta değişir.

- **NADİR OLAYIN KAPISI RASTGELELİK TÜKETMEMELİ (FAZ 38 eki-2, bu turun en pahalı dersi):**
  teknik/sakatlık gibi maçların ~%18'inde düşen bir olayın kapısı `Math.random()` ile
  sorulursa çekiliş HER pozisyonda yapılır; olay hiç düşmese bile bütün pozisyonlar bir
  adım kayar ve maçların tamamı değişir. Ölçüldü: sınır üstünde duran yedi kapı (üçlük
  bölgeleri, kuyruk dağılımları, uzatma, rotasyon) hep birden oynadı —
  `yetenek-check` 30/30 → 27/30, `sut-cografya` 18/18 → 15/18. Kapı `prUnit(...)`e
  (hash türevi, hiçbir akıştan tüketmez) bağlanınca gerilemelerin tamamı geri geldi.
  `pr` (sunum PRNG'si) de kullanılamaz: sonucu etkileyen bir kararı ona bağlamak,
  anlatım değiştiğinde maç sonucunu değiştirir — F13-3'ün tam tersi. Kural: **nadir ve
  sonucu etkileyen olayların kapısı `prUnit`/`prChance(tohum,p)` ile kurulur; rastgelelik
  yalnız olay GERÇEKTEN düştüğünde tüketilir.**
- **DÜZGÜN ÇEKİLİŞ EŞİT GENİŞLİKTEKİ İKİ BANDI EŞİT DOLDURUR (FAZ 38 eki-2):** üçlük
  bölge sınırları açıdadır (|a|<26° tepe · 26-52° kanat · >52° köşe) ve iki bant eşit
  genişlikte olduğu için `rand(-R,R)` ile payları HEP eşit çıkar (ölçüldü: ikisi de
  %13,7) — gerçekte kanat tepenin belirgin üstündedir. Bandı genişletmek çözmez, köşeyi
  taşırır. Çözüm dağılımın ŞEKLİNİ değiştirmektir: `a = sign(u)·R·|u|^0.87`. `rand`
  çağrı sayısı değişmediği için akış kaymaz; isabet şut geometrisinden ÖNCE
  kararlaştırıldığı için sonuç matematiği de etkilenmez. Bir oran hedefe oturmuyorsa
  önce dağılımın o hedefi ÜRETEBİLİR olup olmadığını sor.
- **UZATMA ORANININ "ARİTMETİK TAVANI" SON DAKİKA MODELLENMEZSE BAĞLAYICIDIR
  (FAZ 38 eki-2, kendi teşhisimin düzeltmesi):** FAZ 38 ekinde uzatma %1,7 için
  "σ=13,7 iken beraberliğin tavanı %2,9, o yol kapalı" denmişti. Teşhis doğru ama
  eksikti — normal dağılımın tavanı yalnız kapanış dakikası orta oyunla aynı kurallarla
  oynanırken geçerlidir. Dört gerçek koç davranışı eklenince (geride kalan hızlanır ·
  1-3 geride son şuta oynar · son 30 sn cam süpürme · ≤10 sn dar taktik faul) oran
  **%5,0**'e çıktı ve fark dağılımının şekli korundu (20+ %12,5). Bir kapı "aritmetik
  olarak imkânsız" görünüyorsa, modelin o aritmetiği doğuran varsayımını sorgula.
- **TEK OLAYLI POZİSYONUN DAMGASI DA PENCEREYE ÇEKİLİR (FAZ 38 eki-2):** `_damgaDagit`
  `dizi.length<2` dalında olayı HAM `t` ile bırakıyordu; ham `t` bir önceki pozisyonun
  bittiği saniyedir, dolayısıyla iki ardışık pozisyonun damgası çakışıyordu. Uzatma
  seyrekken (%1,7) örnekleme bunu hiç görmedi; %5'e çıkınca üç çakışma birden çıktı.
  **Nadir bir kod yolunun sıklığını artırmak, o yoldaki eski kusurları görünür kılar.**
- **TOPU TUTAN OYUNCU SET HÜCUMUNDA EN AZ KIPIRDAYAN OLAMAZ (FAZ 38 eki-2, F25-2'nin
  son kalıntısı):** canlı salınımın sürüklenme bandı topçuda 15 px, adımı 4-6 px idi;
  varış freni (hedefe 24 px kalınca) bu mesafeyi tamamen yutuyor ve jeton topu tutmuş
  hâlde 1,5 sn çakılı kalıyordu. Ölçüldü: üç ayrı koşuda çıkan tek donmanın hepsinde
  `topta:true · hedefUzak:0 · nudge:5 · hız 1,4-2,2 px/sn` — yani salınım çalışıyor,
  mesafe frenin içinde kalıyordu. Bant 21 px / adım 6-9 px. Gerçek basketbolda set
  hücumunda en çok hareket eden oyuncu topu sürendir.
- **ÜÇ KOŞUDA İKİ DÜŞÜP BİR GEÇEN KAPI "GÜRÜLTÜ" DEĞİLDİR (FAZ 38 eki-2):** F25-2'nin
  ilk düşüşünü eşiği 1,8 ms aştığı için örnekleme sandım. Ayırt edici ölçüt sıklık
  değil, ayrıntı satırındaki ÖRÜNTÜDÜR: rastgele düşen bir kapının örneği her seferinde
  farklı çıkar; buradaki üç örnek aynı rolü, aynı süreyi ve aynı nedeni gösteriyordu.
- **KAPI EN DAR KALEME GÖRE BOYUTLANDIRILIR (FAZ 38 eki-2):** `yetenek-check` C bölümü
  ribaund (480 örnek) ve çalma (103) ile birlikte **bloğu** (34) da ölçüyordu; 60 maçta
  blok oranı tek maçlık salınımla 1,00×'e düşüp kapıyı düşürüyordu. 240 maça çıkarılınca
  1,16×. Aynı bölümdeki B kapıları ("5 ve altı farkla biten") 40 maçta ~7 puan standart
  hataya sahipti — davranış değişmeden %20-%29 arasında salınıyordu ve FAZ 38 ekindeki
  "%26,3 ✓" kaydı bu gürültünün bir örneğiydi. Bir kapının örneklemi, bandının
  genişliğine göre değil **ölçtüğü en seyrek olaya** göre seçilir.
- **YENİ ANLATIM HAVUZUNU `localizeCatalogs()`'A KAYDET — SÖZLÜK GİRİŞİ TEK BAŞINA
  YETMEZ (FAZ 38 eki-2, B-1'in üçüncü tekrarı):** FAZ 38'in dört kural olayı havuzu
  (`IHLAL24_LINES`, `HUCUM_FAULU_LINES`, `ADIM_LINES`, `TAC_LINES`) sözlüğe YAZILMIŞ ama
  katalog listesine kaydedilmemişti. Sözlük anahtarları `%S` yer tutucusu taşıdığı için
  ancak havuz YERİNDE çevrilirse eşleşirler; kaydedilmeyince EN oyuncu satırların
  tamamını Türkçe görüyordu. Kaydedilince canlı anlatımda Türkçe payı %4,5 → %2,2.

- **KAPANIŞ KURALLARI UZATMADA YANLIŞ SAATİ OKUYORDU (FAZ 38 eki-3, en pahalı kusur):**
  `pozTuru` tanımlandığı bloktaki `let t`yi kapatır; uzatma döngüsü ise KENDİ `let t`
  bildirimini AYRI bir blokta kurar. Sonuç: uzatmada `pozTuru` normal sürenin **bitmiş**
  saatini (t = 0) okuyor, bütün kapanış kuralları (son şut, geride kalanın hızlanması,
  taktik faul) uzatma boyunca sürekli açık kalıyor ve `_mal = t` maliyeti sıfırlıyordu.
  Ölçüldü: uzatmada iki takım **39,3** sayı buluyor (gerçek ~20) ama şut sayısı 15,6 ile
  DOĞRU — fazlalığın tamamı serbest atıştı; üç ardışık pozisyon aynı saniyeyi paylaşıyordu.
  Saat artık parametre: `pozTuru(tK)`. **Bir fonksiyon dış kapsamdaki bir döngü
  değişkenini okuyorsa, o döngünün TEK olduğundan emin ol** — bu motorda normal süre ve
  uzatma iki ayrı `let t` kurar.
- **MAÇ SAF RASTGELE YÜRÜYÜŞ OLMAMALI — SKOR ETKİSİ (FAZ 38 eki-3):** çeyrek sonu fark
  std'si 6,97 → 9,90 → 12,53 → 14,47 ile **tam √t** büyüyordu ve iki takımın skor
  korelasyonu −0,06 idi (bağımsız). Gerçek basketbolda büyüme √t'nin altındadır: önde
  olan gevşer, geride kalan sıkışır. Bu geri besleme olmadan yakın maç ve uzatma oranı
  ARİTMETİK olarak hedefin altında kalır (beraberlik tavanı ≈ 1/(σ√2π)). `runPossession`
  isabet kararından hemen önce `accF -= 0.046 · evre · clamp(fark/16,−1,1)` uygular;
  etki SİMETRİK olduğu için lig FG%'si ve skor bandı değişmez, yalnız kuyruk değişir.
- **TAKTİK FAUL BÖLÜM BAŞINA EN FAZLA 2 (FAZ 38 eki-3):** sınırsız bırakılınca 32
  saniyelik pencerede pozisyon 3-7 sn sürdüğü için altı kez üst üste faul yapılıyor ve
  bölüm serbest atış yağmuruna dönüyordu. FAZ 38 ekindeki "pencereyi daralt" dersinin
  ikinci yarısı: pencereyi daraltmak yetmez, TEKRARI da sınırla.
- **DAĞILIM KAPILARI TEK KADRO ÇİFTİNDE ÖLÇÜLEMEZ (FAZ 38 eki-3):** "maçların %25'inden
  fazlası 5 ve altı farkla biter" bir LİG istatistiğidir; tek çiftte ölçülürse o çiftin
  güç farkını ölçer, motoru değil. Ölçüldü — aynı motorda üç ayrı çift: %23,8 · %28,5 ·
  %34,5. Üstelik skor etkisi eklendikten sonra sabit güç farkı olan çiftte kütle denge
  farkının çevresinde YIĞILIR (20+ düşerken ≤5 de düşer). `yetenek-check` artık 6
  kadroluk havuzda çeşitli eşleşmelerle ölçüyor; `kutu-check` uzatmayı zaten denk kadroda
  ölçüyordu.
- **UÇ DEĞER KAPISININ ÖRNEKLEMİ HAVUZ BAŞINA DÜŞER (FAZ 38 eki-3):** "bir maçtaki en
  büyük bireysel ribaunt payı" bir MAKSİMUMDUR; kadro havuzu 2'den 6'ya çıkınca kadro
  başına düşen çekiliş üçte bire indi ve kapı %52'den %48'e düştü — davranış değişmeden.
  Örneklem 160 → 320 maç.
- **ROTASYON YEDEK PAYI ROTASYON SIKLIĞIYLA ÇÖZÜLMÜYOR (FAZ 38 eki-3, denendi):** iki
  yön de ölçüldü — nöbeti uzatmak (dinlenme 6→4, cooldown 11→13) payı değiştirmedi
  (%38,2) ve en skorer payını bandın dışına çıkardı; kısaltmak (3 / 7) **dört kapıyı
  birden** düşürdü. Pay, ilk beşin **pozisyon dengeli** seçilmesinden geliyor: 6. adam
  çoğu zaman ilk beşteki bir oyuncudan daha iyi skorer. Çözüm `matchLineup`'ın seçim
  ölçütündedir, rotasyon knoblarında değil.

- **YENİ OLAY TÜRÜNÜN SAHNE SÖZLEŞMESİ DE VARDIR (FAZ 38 eki-3):** sahne katmanı olayı
  TİPİYLE değil TAŞIDIĞI ALANLARLA tanır — serbest atış dalına yalnız
  `ev.shots[0].kind==="ft"` ise girer. Eklediğim teknik faul olayında bu dizi yoktu;
  `_setFtFormation` hiç çağrılmadı ve on jeton olduğu yerde kaldı (ölçüldü:
  `sahne-check` serbest atış dizilişi 8,86 → 8,14, en kötü kare 1/10). Yeni olay
  eklerken kutu skor ve anlatım sözleşmesinin yanında sahne sözleşmesini de doldur;
  koordinatları DETERMİNİSTİK ver (rand nadir olayda bile akışı tüketir).
- **ÖRNEKLEM BÜYÜTÜLEMİYORSA ÖLÇÜT ÖRNEKLEME UYARLANIR (FAZ 38 eki-3):**
  `sunum-check` F25-3'ün "25 m+ ilk pas < %5" ölçütü toplanan 59-69 sokmada
  ölçülemez — çözünürlük 1,7 puan, kapı 2 olayda geçip 3 olayda düşüyor (1/69 ✓ ·
  3/59 ✗, davranış AYNI). Tabanı 110 yapmak DENENDİ ve ölçerek yanlış çıktı: aracın
  900 sn'lik pencere üst sınırı 65 sokmada tıkanıyor, kapı "ÖRNEKLEM YETERSİZ"
  veriyor. Bu araçta örneklem büyütülemiyor; çözüm ölçütü örnekleme uyarlamaktır —
  soru "3 gördüm mü" değil "oran %5'in ANLAMLI üstünde mi" (tek yönlü %95 binom
  payı, 1,64 σ). n=65'te 5 olaya, n=200'de 3'e karşılık gelir; örneklem büyüdükçe
  kapı kendiliğinden sıkılaşır. Bu oturumda dördüncü örneklem kusuru (uzatma 120→400 ·
  blok 60→240 · dağılım 40→320 · sokma: ölçüt uyarlandı).
- **Sözlük girişi TAM DÜĞÜM, kalıp PARÇA çevirir (FAZ 31 dersi — 16 satır sessizce Türkçe kaldı):**
  FAZ 25'te serbest atış sonuç kuyruklarının ('ikisini de attı.', 'hepsi içeride.',
  'yarısı geldi.' …) EN karşılıkları `Object.assign(I18N_TR_EN,…)` ile eklenmişti. Ama
  `I18N_TR_EN` yalnız **düğümün tamamı** anahtara eşitse çalışır; bu satırlar ise her zaman
  cümlenin **sonunda parça** olarak geçer ("Kauliņš çizgide 2/2 — hepsi içeride."). Anahtar
  hiç eşleşmedi: ölçüldü, 16 kuyruğun **tamamı** EN modunda Türkçe kalıyordu (anlatımın
  ~%6'sı). Canlı tarayıcı taraması bunu ancak ara sıra örnekliyordu. Kural: bir metin
  cümlenin İÇİNDE geçiyorsa karşılığı **`I18N_PHRASES` kalıbı** olmalı; sözlük girişi
  yalnız tek başına bir düğüm olan metinler içindir. İkisini birden yazmak zararsızdır.
  Fonksiyon-yerel havuzlar (`FT_*`, `FOUL_*`) `localizeCatalogs()`'a da görünmez —
  onlar için tek yol kalıptır.

- **EKONOMİ ÇAPALARI KODDA DEĞİL TABLODA (FAZ 25 USD):** maaş eğrisi kapalı formül değil,
  `MAAS_ANKOR` çapa noktaları + doğrusal ara değerdir — brifin tablosunda 88 → 89 arasında
  $9.000 → $15.000 SIÇRAMASI var ve kapalı formül bunu ifade edemez. Bonservis de bağımsız
  formül DEĞİL, `salaryUSDFromGenel × TRANSFER_HAFTA`: bant değişince ikisi birlikte hareket
  eder (eskiden ayrışıyorlardı). Arena tablosu `ecoRound`'dan TÜRETİLMEZ, doğrudan dolardır.
- **İMZALI MAAŞA ENFLASYON İKİ KEZ UYGULANIYORDU (FAZ 25 USD, ölçülerek bulundu):**
  `salaryUSDFromGenel` zaten `*ecoInflationMul()` ile çarpıyor — maaş, sözleşmenin
  imzalandığı sezonun enflasyonunu İÇİNDE taşır. `weeklyWageBill` bir kez daha çarpınca
  aynı kadro 10. sezonda 1,36 yerine 1,85 katına çıkıyordu ve bu, fonksiyonun kendi
  yorumundaki "imzalı maaşlar sözleşme bitene dek DEĞİŞMEZ" kuralıyla doğrudan çelişiyordu
  (ölçüldü: y10 ham maaş 42.840, faturaya 58.262 yazılıyordu). Enflasyon artık yalnız
  İŞLETME kalemlerine (arena bakımı, akademi, kulüp işletmesi) uygulanır.
- **KADROYU ERİTMEK TASARRUF OLMAMALI (FAZ 25 USD, K2'nin kök nedeni):** pasif kulübün
  kadrosu sözleşme bitişi/emeklilikle 15 → 8'e iniyor, maaş yükü yarılanıyor ama
  bilet/sponsor/prim geliri aynı kalıyordu; hiçbir şey yapmayan kulübün kasası 3 sezonda
  3,2 katına çıkıyordu. `eksikKadroBedeli()` lig asgari kadrosunu (`KADRO_ASGARI=12`)
  doldurmayan kulübe boş yerlerin bedelini yazar; `isletmeGideri` de kadro sayısını
  asgariden AŞAĞI okumaz. (K2 kapısı FAZ 25 ÖNCESİNDE de 2,03× ile düşüyordu — ölçek
  büyüyünce açık görünür oldu.)
- **ŞAMPİYONLUK ÖDÜLÜ `ecoRound`'dan GEÇMEZ (FAZ 25 USD):** playoff ödülü
  `ecoRound(rand(6000,12000))` idi ve ×50 ölçekle **$300.000-$600.000** ödüyordu — tek
  şampiyonluk başlangıç kasasının 2,5-5 katı. Ödüller artık açık dolar ve bir sezonluk
  kârın mertebesinde (playoff $90-150K · kupa $55K · galibiyet $5K · maç günü ~$800).
  Mağlubiyet geliri de kısıldı: haftada ~2,2 mağlubiyet × $2.000, kaybeden kulübe pasif
  gelir veriyordu.
- **SPONSORDA DİVİZYON ÇARPANDIR, TOPLANAN PUAN DEĞİL (FAZ 25 USD):** toplanan puan olarak
  eklendiğinde en alt divizyon kulübü taraftar + sıra + form ile ULUSAL kademeye çıkabiliyordu.
  Doğrusu: aynı başarı üst divizyonda daha değerlidir — `sponsorPuani` en son
  `0.45 + 0.55×(divizyon konumu)` ile çarpılır. Alt divizyon tavanı bölgesel kademedir.
- **EKONOMİ KAPILARI ESKİ SAYIYA ÇAKILIR (FAZ 25 USD, FAZ 28 dersinin tekrarı):**
  `arena-check` C bölümü "5.000 kap → 4.350 KR", `faz7-check` K4 "bakım 150" diye ÇAKILI
  sayılar tutuyordu; ekonomi ölçeği değişince kapılar ölçmek istedikleri şeyi değil eski
  bir sayıyı savundular. İkisi de artık `ARENA_LVL` tablosundan okuyor. Yeni bir ekonomi
  kapısı yazarken eşiği TABLODAN türet, elle yazma.
- **`'3.1'` GEÇERLİ BİR DİVİZYON ANAHTARI DEĞİLDİR (FAZ 25 USD):** `'tbl'` = Divizyon 1,
  `'d.g'` = Divizyon d+1 — `DIV_SAYISI=3` için en alt divizyon **`'2.1'`**'dir ve
  `divizyonNo('3.1')` 4 döner. `ekonomi-check` var olmayan bir divizyonda ölçüyor, sponsorun
  divizyon çarpanı hep tabanda kalıyor ve büyüme eğrisi hiç kurulamıyordu. Anahtar
  `DIV_SAYISI`'den türetilmeli.
- **BÜYÜMENİN MOTORU DİVİZYON TIRMANIŞIDIR (FAZ 25 USD):** sponsor kademesi ve taraftar
  kitlesi divizyonla büyür. Ekonomiyi ölçen bir model kulübü tek divizyonda tutarsa
  "5. sezonda ~$60.000" hedefi imkânsız görünür; `ekonomi-check` iyi giden kulübü iki
  sezonda bir yükseltir. Aynı sebeple bot havuzu tek divizyona değil merdivenin tamamına
  yayılır (divizyon ile galibiyet oranı BAĞIMSIZDIR).
- **Taraftar kitlesi KARİYER galibiyetiyle büyür (FAZ 25 USD):** sürücü `G.wins` idi, o da
  sezon başında sıfırlanıyordu (`match-prep.js`) — kitle her sezon başa dönüyor, "kulüp
  büyüdükçe gelir artar" eğrisi hiç kurulamıyordu. Kalıcı sürücü `G.careerWins`.

- **TÜRKÇE EK YAZILIŞA DEĞİL OKUNUŞA BAKAR (FAZ 33 §2):** FAZ 30'a kadar bütün oyuncular
  Türk'tü ve Türkçede yazılış ≈ okunuş olduğu için `turkEk()` son harfe bakarak doğru
  çalışıyordu. Lig küreselleşince yazıldığı gibi okunmayan adlar geldi ve canlıda ölçüldü:
  "Đurašković'de" (doğrusu **'te** — `ć` Türkçede ç, sert ünsüz), "Sy'a/Sy'da" (doğrusu
  **'ye/'de** — "Si" okunur, `y` burada ÜNLÜ). Çözüm `_trOkunus()`: ek KARARI normalize
  edilmiş okunuş üzerinden verilir, ekranda ad **özgün yazımıyla** kalır. Tablo
  `_OKU_HARF` + `_OKU_IKILI`'dedir. İki incelik: (a) `j` → `h` YALNIZ kelime ortasında —
  sondaki `j` Slav dillerinde yumuşaktır ("Mihalj'da", "Mihalj'ta" değil); (b) ünlüsüz
  KISALTMA (`BK`) harf adlarıyla okunur ("be-ke" → **BK'ye**) ama ünlüsüz AD (`Ng`)
  okunmaz, harf adlarının hepsi ince olduğu için ince ek alır (**Ng'e**). Ayrım
  YAZIMDAN gelir: tamamı büyük harf = kısaltma. Değişince `node tools/turkek-check.js`
  ve `anlatim-check` (20 ad × 4 durum + 43 ülke × 5 ad ünlü uyumu).
- **TAKIM ADLARI DA KÜRESELDİR (FAZ 33 §3):** FAZ 30 oyuncuları küreselleştirdi, takım
  adlarını değil — `SEHIR` 162 şehirle zaten uluslararasıydı ama HİÇBİR KURAL yoktu ve
  ülke bilgisi KODDA HİÇ YOKTU, dolayısıyla ölçülemiyordu (canlıda 20 takımın 19'u Türk
  şehriydi). `SEHIR_ULKE` (162 şehir → 72 ülke) + `sehirUlkesi()` tek kaynaktır; havuza
  şehir eklerken ülkesini de yaz. Kural: bir divizyonda tek ülkenin payı
  `LIG_ULKE_PAY_MAX` (%30) tavanını aşamaz — bu `genUniqueClubName`'de şehir/sonek
  sayaçlarının yanına eklendi; en az `LIG_ULKE_MIN` (8) farklı ülke şartı ise tek tek
  çekilişte GARANTİ EDİLEMEZ, `ulkeCesitliligiOnar()` kadro kurulduktan sonra onarır.
  Ölçülen: divizyon başına 12-18 ülke, en büyük pay %25. `lig-check` D3 bölümü sınar.
- **ŞEHİR TEKRARI KAPISI ÜLKE YIĞILMASINI GÖREMEZ (FAZ 33 §3 dersi):** "aynı şehirden en
  fazla 2 takım" kuralı 19 FARKLI Türk şehriyle kurulmuş bir ligi kusursuz bulur. Bir
  dağılımı sınarken hangi BOYUTTA ölçtüğüne bak — şehir ≠ ülke.
- **ANAHTARDAKİ DİVİZYON NUMARASI = GÖSTERİLEN NUMARA (FAZ 33 §4):** eskiden `'d.g'` =
  Divizyon **d+1** idi; ekran "Divizyon 3 · Grup 1" derken anahtar `'2.1'` yazıyordu.
  İki ayrı numaralandırma kodu okuyan herkes için tuzaktı — FAZ 25'te ekonomi denetçisi
  var olmayan `'3.1'` divizyonunda ölçüm yaptı, sponsorun divizyon çarpanı sessizce
  tabanda kaldı ve büyüme eğrisi hiç kurulamadı. Artık `'tbl'` = Divizyon 1, `'d.g'` =
  Divizyon **d** · Grup g (d ≥ 2); `'1.g'` anahtarı ÜRETİLMEZ ve eski depolardan silinir.
  Anahtar kuran her yer `divizyonAnahtari(div,grup)`'tan geçsin. `schema-check` [7]
  bölümü her divizyon × grup için anahtar ↔ etiket ↔ `parseTblKey` üçlüsünü sınar.
- **HTML'de id BENZERSİZDİR — SINIF OLARAK SINANIR (FAZ 33 §5):** kurulum ekranında iki
  `<select>` aynı `menajerUlkeSec` id'sini taşıyordu (FAZ 30 yamasında blok iki kez
  yazılmıştı); `getElementById` hep ilkini döndürdüğü için ikincisi hiç doldurulmuyor,
  ekranda boş bir "ÜLKEN" duruyordu. `schema-check` [6] artık HTML'deki TÜM id'leri
  sayar — tek seferlik düzeltme değil, sınıf kapısı.
- **ANLATIMDA ÇOK KISA SOYAD TAM ADLA GEÇER (FAZ 33 §7):** havuzlarda ~100 iki harfli
  gerçek soyad var (Sy · Ba · Ka · Lo · Ng · Wu · Öz). Tek başına geçince cümle kopuk
  okunuyordu ("Sa pota altında hükmetti"). `_anlatimAdi()` soyad 3 harften kısaysa tam
  adı döndürür; sahadaki JETON ETİKETİ için `_tokShort` kısa kalır (yer yok). Ayrım
  bilinçli — yeni bir anlatım satırı yazarken `_anlatimAdi` kullan, `_tokShort` değil.

- **ÖZEL YETENEK: SAPMA SEED'DEN TÜRER, ROZET YOKTUR (FAZ 34 §2):** oyuncular birbirinin
  kopyasıydı (statlar 55-92 dar bandında). `ozelYetenekUygula()` her oyuncuya `p.seed`den
  DETERMİNİSTİK bir sapma verir: %25 belirgin üstün (+10..+15) · %5 olağanüstü (+20..+25) ·
  bağımsız %20 belirgin zayıf (−10..−20). `rand()`/`Math.random` ÇAĞIRMAZ — bu yüzden
  `genPlayer`ın RNG sırasına dokunulmaz, sapma nesne kurulduktan sonra uygulanır ve
  `genel`/`maas`/`potansiyel` yeniden türetilir. Uzmanın OVR'si yalnız ~+2 arttığı için
  **uzman oyuncu ucuz kalır** (maaş OVR'den gelir) — markette avlanabilir olması budur.
  Arayüzde HİÇBİR yeni etiket yoktur (`p.ozel` yalnız motor/denetim verisidir);
  `yetenek-check` A bölümü dizge sabitlerini tarayarak bunu sınar.
- **SAPMA YERLEŞİMİ SİMETRİK OLMALI (FAZ 34, ölçülerek bulundu):** yalnız POZİTİF sapmayı
  "yeri olan" stata kaydırmak, artıyı sistemli olarak düşük (motorda az ağırlıklı) statlara
  iter; eksi ise serbestçe yüksek statı vurur ve lig skoru düşer. İki yön de aynı ölçütten
  geçer: sapmanın TAMAMI [20,99] içinde kalsın. Aynı gerekçeyle `OZEL_POZ_STAT` listeleri
  hücum/savunma AĞIRLIĞINDA dengelenir (`computeRosterOfrDef` savunma formülü daha ağır
  katsayı taşır: savunma 1,15 · blok 1,0 · topCalma 1,0).
- **GECELİK FORM GÖRELİ PAYA UYGULANIR (FAZ 34 §3/§4):** `macFormu(p)` maç tohumundan
  deterministik türer (%10 sıcak +8..+14 · %10 soğuk −8..−14 · %80 normal ±4) ve yalnız
  `statF()` üzerinden AĞIRLIK fonksiyonlarında okunur (`usageW`/`rebW`/`blkW`/`stlW`/`astW`)
  artı `shooterAcc`ın yetenek terimi. Takım toplamları motorun kendi mantığından gelmeye
  devam eder — değişen yalnız KİMİN aldığıdır. ⚠ `statF`in ÜST SINIRI YOKTUR: 99'da kırpmak
  sıcak geceyi budar, soğuk geceyi budamaz ve lig skorunu tek yönlü aşağı çeker. Değer bir
  ORAN girdisidir, stat kutusu değil.
- **FORM İSABETE DE YANSIMALI (FAZ 34 ölçümü):** formu yalnız kullanım payına bağlamak,
  usage ile yetenek arasındaki korelasyonu seyreltir (şutlar sıcak ama zayıf şutörlere
  kayar) ve takım FG%'si SİSTEMLİ düşer — ölçüldü, deplasman ortalaması −2,3. Sıcak gece
  hem daha çok hem daha isabetli şut demektir; dağılım simetrik olduğu için lig korunur.
- **`prChance` MAÇ MOTORUNDA YERELDİR (FAZ 34 tuzağı):** `const prChance=x=>pr()<x` (tek
  argüman) global iki argümanlı sürümü gölgeler. `prChance(tohum,0.85)` yazmak dizgeyi
  olasılık sanır, karşılaştırma hep false döner ve kapı SESSİZCE hiç açılmaz — ölçüldü,
  40 maçta 0 cümle. Motor içinde yeni bir olasılık kapısı yazarken tek argümanlı yerel
  sürümü kullan.
- **ANLATIM SAYAÇLARI MAÇ DÜZEYİNDE (FAZ 34, F13-3/F14-1 tuzağının tekrarı):** uzmanlık
  kapısının sayaçları (`_uzG`) ilk kurguda POZİSYON fonksiyonunun içindeydi ve her
  pozisyonda sıfırlanıyordu; "3. ribaunttan sonra" eşiğine hiç ulaşılamadı. `_saatG` ile
  aynı kapsamda dururlar.
- **BLOK/ÖVGÜ SATIRLARI MESAFEDEN BAĞIMSIZ OLMALI (FAZ 34):** "Boyalı alanın kapısını
  kapattı" bir 3'lük bloğuna eklenince anlatım-saha çelişmesi doğuyor (`anlatim-check`
  yakaladı). Şut yerine bağlı dil, ancak şut tipini BİLEN dalda kullanılabilir.
- **SABİT TOPLAMDA "STD GENİŞLEDİ" YANLIŞ ÖLÇÜTTÜR (FAZ 34 §7 dersi):** takım toplamı
  korunduğu için (§4) bireysel dağılım sıfır toplamlı bir yeniden paylaşımdır ve standart
  sapma neredeyse hiç oynamaz — ölçüldü: sayı std 7,28 → 7,23, ribaunt 2,78 → 2,81.
  Değişen KUYRUKLARDIR: 30+ sayı %0,52 → %1,18 · 13+ ribaunt %0,39 → %0,79 · en yüksek
  bireysel ribaunt 13 → 18. Ayırt edici ölçü tek oyuncunun takım toplamından aldığı EN
  BÜYÜK PAYDIR (%43 → %51).
- **BU MOTORDA TAKIM RİBAUNDU ~29'DUR (FAZ 34):** gerçek basketbolda ~43. "20+ ribaunt"
  gibi mutlak eşikler bu hacme ÖLÇEKLENMELİ (20 × 29/43 ≈ 13); toplamı şişirmek §4'ü
  ihlal eder. `yetenek-check` eşiği `--rebEsik` ile taşınabilir ve ham 20+ sayısını da
  ayrıca raporlar.
- **`sim-node --n=100` TEK TOHUMDA GÜRÜLTÜ BASKINDIR (FAZ 34 ölçümü):** aynı yapıda
  tohum 42/7/123/999/555/31 için deplasman ortalaması **78,5 … 87,1** arasında salınır
  (yayılım 8,6 puan). ±1,5'lik bir toleransı bu örneklemde tek tohumla yargılamak
  davranışı değil çekilişi ölçer. Yakınsak ölçüm için **`--n=1000`** (ya da 3-4 tohumun
  n=400 ortalaması) kullan.

- **F11-1 KAPISI ANLIK ÖRNEK ALIYORDU (FAZ 34 eki — FAZ 26/F25-2 dersinin üçüncü tekrarı):**
  "arka plandan dönünce jetonlar hedefinde mi" kapısı TEK BİR ANDA `|p − hedef|`
  ortalamasını alıp 60 px eşiğine vuruyordu. Bu büyüklük SAĞLIKLI sahnede de doğal olarak
  salınır — yeni dizilim atandığı anda jetonlar hedeflerine yürür. Ölçüldü (normal akış,
  14 örnek): 237 · 105 · 45 · 32 · 13 · 12 · 21 · 17 · 13 · 13 · 16 · **500** px. Yani kapı
  davranışı değil ÖRNEKLEME ANINI yargılıyor ve arka plandan bağımsız olarak rastgele
  düşüyordu (HEAD'de de düşüyordu: 205 px). Gerçek değer ölçüldüğünde `_simCatchUp`
  **çalışıyordu**: dönüşteki medyan **2 px**, normal akış tabanı 124-128 px.
  Yeni ölçüt üç ayaklı ve KENDİNİ KALİBRE EDER: (1) `_snapN` arttı mı — yetişme koştu mu,
  (2) dönüş medyanı, aynı koşuda ölçülen NORMAL AKIŞ tabanından kötü değil mi
  (taban × 1,6 + 25 px, mutlak 60 px alt sınırıyla), (3) hiçbir jeton askıda değil
  (sonlu koordinat + atanmış hedef). Salınan bir büyüklüğü gömülü eşikle yargılama —
  aynı koşudaki tabanla kıyasla.

- **"ANLATIM 7 SN GEÇ" DİYEN ÖLÇÜ SENKRONU DEĞİL KOREOGRAFİYİ ÖLÇÜYORDU (FAZ 36 §A1):**
  `realism-check`in "olay başından gecikme" sütunu `movePlayersForEvent` çağrısı ile ilk
  yorum arasını veriyordu; şut olaylarında bu POZİSYONUN UZUNLUĞUDUR (sokma → geçiş → set
  → şut) ve 6-7 sn olması doğrudur. Sonuç cümlesi çember karesine zaten 0-1 ms ile bağlıydı.
  Gerçek kusur: koreografi boyunca anlatım SUSUYOR, sonra tek pakette dökülüyordu. Çözüm
  İKİ BEAT — ön parça (`ev.preText`, `SUT_ON_LINES`) top elden çıkarken (`animateShotPossession`
  `onShoot`), sonuç parçası (`ev.text` + skor + ses) çemberde (`onResult`). Ön parça SONUCU
  ELE VERMEZ. Kapı da doğru büyüklüğü ölçer: yorum ↔ ANLATTIĞI SAHNE BEAT'İ (ön parça ↔
  release · sonuç ↔ rim), artı ANLATIM SESSİZLİĞİ (en uzun/ortalama boşluk). Ölçülen:
  iki beat de **0 ms**, ortalama sessizlik 4785 → 3622 ms. Şut olayına yeni bir yol
  eklersen `preText`i de taşı (ölçüm araçlarının taşıma listesi dahil — FAZ 26 dersi).
- **SAVUNMACI YÜRÜMEZ (FAZ 36 §A2):** F16-A'nın "hedefine varan jeton kademesini düşürür"
  kuralı markajdaki savunmacıyı da kapsıyordu ve zamanın %47'si YÜRÜ kademesindeydi
  (hedef %20-45) — sahayı "ağır çekim" gösteren asıl etken buydu. `S.defTrack` açıkken
  `p._mark`lı jeton bu kuraldan MUAF, topsuz savunmacının tabanı YURU → JOG. Ölçülen
  %46,8 → %40,2. ⚠ Geçiş SAVUNMASINI SPRINT yapmak denendi ve GERİ ALINDI: sprint payı
  %13 → %22,7'ye çıkıp bandı (%5-20) deldi.
- **`_defBehind` PAYI ÇAĞIRANDAN GELİR (FAZ 36 §A3):** tek bir pay iki farklı işi birden
  yapamaz. Payı 30 → 46 px yapmak topsuz savunmacı için doğrudur (ball-you-man %81 → %88)
  ama TOPU TUTANIN savunmacısını da geriye iter: onun hedefi zaten adam-pota doğrultusunda
  `gap` (27 px) mesafesinde kuruludur, projeksiyon onu 46 px'e çeker ve markaj 1,80 →
  1,86 m olur. Top savunmacısında **pay = aralık**. Yanında: post muafiyeti 64 → 34 px,
  ölü bölge 8/20 → 6/14 px, `TRANS_OFF` hedefleri ön sahaya (orta üçte bir %21,6 → %14,3).
- **RUTİN SAVUNMA RİBAUNDU ANLATILMAZ (FAZ 36 §B1):** F13-1'in "her kaçan şutun ribaundu
  anlatılsın" kuralı kopukluğu çözdü ama tersine düştü — 256 satırın 69'u (%27) ribaund/top
  değişimiydi ve anlatım istatistik akışı gibi okunuyordu. Kapı `_rebGoster`: hücum ribaundu
  ve ribaunt uzmanı (≥88) DAİMA, rutin savunma ribaundu `prChance` ile. `ftRebound` da aynı
  kapıdan geçer. **İSTATİSTİK DEĞİŞMEZ** — `rebounder`/`rebOff` çekilişleri aynen yapılır,
  kutu skor birebir aynı kalır (kanıt: 10 maçın skor+ribaunt+asist dizisi HEAD ile özdeş).
  ÖLÇÜLEN KISIT: bu motorda ribaundların ~%34'ü hücum ribaundudur (gerçekte ~%25), bu
  yüzden "hücum ribaundu daima" kuralı oranı %10,4'e çakar ve %8-11 bandında rutin savunma
  ribaunduna kalan pay %25 değil ~%2'dir. `anlatim-check` [A] kapıları bu niyete göre
  yeniden yazıldı (kaçan ≈ ribaund kapısı KALDIRILDI).
- **YABANCI TERİM KAPISI LİSTE DEĞİL SINIF OLMALI (FAZ 36 §B5):** eski kapı sabit bir
  kelime listesiydi ve FAZ 26'da eklenen "floater"ı hiç görmedi (canlıda 6/maç). Yeni ölçüt:
  Türkçede bulunmayan harf/öbek (`q w x · ck sh th ph ch oo ee ea ou oa` · sonda
  `ng/ll/ss/ff/tt`) taşıyan **küçük harfli** sözcük + açık liste. İki koruma zorunlu:
  (a) yalnız küçük harfle başlayan sözcük taranır — özel ad büyük harflidir (FAZ 29 §1);
  (b) Türkçe alfabe DIŞI harf taşıyan sözcük (Sławek, Pačuta, Kauliņš) ÖZEL ADDIR ve
  atlanır — bu olmadan sözcük parçalanıp "awek" gibi hayalet kök 340 yanlış pozitif üretir.
- **PARÇACIKLI SOYAD BÖLÜNMEZ (FAZ 36 §B6):** "Guillaume Van Hooren" → anlatımda "Hooren"
  çıkıyordu. `_soyadTam` son kelimeden geriye doğru `_AD_PARCACIK` (van · von · de · del ·
  della · di · da · das · dos · du · der · den · le · la · el · ter · ten · bin · ibn ·
  mac · mc) yürür. Ek çekimi de tam soyad üzerinden yapılır ("Van Hooren'e", "De Vries'te").
  Jeton etiketi (`_tokShort`) kısa kalır — ayrım bilinçli, sahada yer yok.
- **OLAY DAMGASI PENCERESİ `tPrev-1`DE KALIR (FAZ 36 §B7):** pencereyi `tPrev`e kadar açmak
  denendi ve ÇAPRAZ ÇAKIŞMA üretti — bir önceki pozisyonun son olayı zaten `tSon` (= yeni
  pozisyonun `tPrev`) damgasını taşır. Motor akışında çakışma 0. Ekranda aynı damgayı
  paylaşan satırlar TEK OLAYIN alt parçalarıdır (serbest atış düdük/sonuç, şut ön
  parça/sonuç) ve saat o an durmuştur.
- **VİRGÜLDEN SONRA KÜÇÜK HARF, AMA ÖZEL AD KORUNUR (FAZ 36 §B8):** asist öneki
  ("… topu kenara aktardı, ") ile şut cümlesi birleşince ikinci parça büyük harfle
  başlıyordu. `_birlestir(on,govde,korunan)` virgülle biten önekte gövdeyi küçültür;
  korunacak özel adlar ÇAĞIRANDAN gelir (metinden "büyük harfli sözcük" diye tahmin etmek
  her cins sözcüğü de korur ve kapı işlemez). `trKucuk` zorunlu (İ→i, I→ı).
- **`pickLine` ŞABLON TEKRARINI ENGELLER, CÜMLE TEKRARINI ENGELLEMEZ (FAZ 36 §B3):** aynı
  şablon + aynı oyuncu birleşince ortaya çıkan birebir cümle tek maçta 2 kez görülüyordu.
  `narr.said` (maç düzeyinde üretilmiş METİN kümesi) + `benzersiz()` sarmalayıcısı 4 deneme
  yapar. Ayrıca kısa/ritüel havuzlar (ör. şut ön parçası) YETERİNCE BÜYÜK olmalı: 8 satır,
  maç başına ~120 şutta 29 tekrar demekti; 20 satıra çıkarılınca 0,1'e indi.
- **ARAYÜZDE PARA ETİKETİ HTML'DE DE ARANIR (FAZ 36 §C1):** FAZ 25 USD geçişinde `js/`
  temizlenmişti ama `charazay2.0.html`deki sabit " KR" ekleri kaldı; kenar çubuğu
  "120.000 KR" gösterirken haber satırı dolar diyordu. `ekonomi-check` A bölümü artık
  HTML'i de tarar (yorumlar hariç). Tek kaynak `fmtPara`/`fmtMaas`.

- **`spacing-check --bg` KAPI LİSTESİ KENDİ ÖRNEKLEMİYLE ÇELİŞİYORDU (FAZ 36 eki):** arka
  plan modunda üç kapı (markaj mesafesi · ball-you-man · boyada hücumcu) ön plandaki
  EŞİKLERLE yargılanıyordu. Ölçüldü — aynı kodda ardışık koşular: markaj 4,61-6,23 m ·
  ball-you-man %58,7-75,0 · boyada %47,9-90,3. Yani 30 puanlık bir bantta salınıp davranışı
  değil ÖRNEKLEME ANINI ölçüyor, FAZ 36 ÖNCESİNDE de düşüyordu. Sebep aracın kendi metninde
  yazılıydı: ~1 Hz örneklemede kareler ağırlıklı GEÇİŞ anına düşer (set fazı --bg'de %19-20,
  ön planda %59) ve aracın "SÜZÜLMEMİŞ" bloğu tam bu gerekçeyle markaj hedeflerini zaten
  BİLGİ sayıyor. Aynı kural --bg'ye de uygulandı; --bg artık yalnız 1 Hz'de anlamını koruyan
  DİZİLİM GEOMETRİSİNİ yargılar. "Sekme arka plandan dönünce sahne yetişiyor mu" sorusunu
  `faz11-check` F11-1 ölçer ve o kapı FAZ 34 ekinde kendini kalibre eder hâle getirilmişti.
- **`season-loop` VARSAYILAN UFKU 3 SEZONDUR — K1 6 SEZONDA DÜŞER (FAZ 36 eki, ölçüldü):**
  9 koşuda kadro OVR farkı n=3'te **+1,38**, n=6'da **−3,06**. Sebep KUSUR DEĞİL TASARIM:
  harness hiç antrenman/transfer yapmaz, 21 yaşına gelen altyapı oyuncuları her sezon
  otomatik terfi eder (`match-prep.js`, Madde 21) ve kadro 11 → 18'e çıkarken yaş 28,8 →
  22,9'a iner. Pasif menajerin kadrosu uzun vadede zayıflar. Denge değişikliği yapmadan
  önce ufku ve koşu sayısını yaz — n=6'lık bir düşüşü "gerileme" sanmak yanlış yerde hata
  aratır.

- **KAPIYI YEŞİLE DÖNDÜREN MEKANİZMA YANLIŞSA KAPI KENDİNİ KANDIRIR (FAZ 38 eki, ölçüldü):**
  uzatma oranını yükseltmek için eklenen "son 125 sn · fark 1-10'da taktik faul" kuralı
  kapıyı %2,5'ten %5,0'e çıkardı — ama YANLIŞ yoldan. Aritmetik basit: taktik faul rakibe
  2 serbest atış (~1,5 sayı) verir, karşılığında bir pozisyon (~1,1 sayı) alınır → **net
  +0,4 fark**, üstelik son iki dakikada onlarca kez. Ölçüldü: |fark| 0-3 bandı %6,0'a
  düştü (normal dağılımın öngördüğü ~%11'in yarısı), yani YAKIN MAÇLAR AÇILIYORDU. Uzatma
  artışı, dağılımda sıfırın çevresinde delik açmanın yan ürünüydü. Gerçek koç 2 farkla
  önde olan rakibe 2 dakika kala faul yapmaz; kural **son 32 sn · fark 4-9** olunca
  dağılım gerçeğe oturdu (0-3 bandı %17,7 · σ 14,9 → 13,7 · gerçek lig ~13) ve
  `yetenek-check` 26/30 → **30/30** döndü. Bir kapıyı yeşile döndüren değişikliğin
  MEKANİZMASINI ölç; yalnız kapının rengine bakma.
- **UZATMA ORANI FARK DAĞILIMININ ARİTMETİK SONUCUDUR (FAZ 38 eki):** beraberlik
  olasılığının tavanı ≈ 1/(σ√2π). σ=13,7 iken tavan **%2,9**; hedef bandı (%4-8) normal
  dağılımla erişilemez — gerçek ligler oraya son dakika yığılmasıyla çıkar. `kutu-check`
  bu teşhisi her koşuda basar, kapı düştüğünde "neden" sorusu okuyucuya bırakılmaz.
- **ÖLÜ TOP OLAYLARI DAMGA PAYLAŞIR (FAZ 38 eki):** serbest atış ve mola sırasında maç
  saati İŞLEMEZ; `free`/`mola` olaylarının komşusuyla aynı saniyeyi taşıması kuralın
  kendisidir, ihlal değil (`DAMGA_MUAF`). Ayrıca pozisyon penceresi olay sayısından
  kısaysa (2 sn'lik ikinci şans pozisyonunda 2 olay) ayrılacak saniye fiziksel olarak
  yoktur — muafiyet `pozIx` + `dtPos` ile ölçülür, "korna anı" (t=0) varsayımıyla değil.
- **KAPI TOLERANSI BANT GENİŞLİĞİNE GÖRE VERİLİR (FAZ 38 eki):** `rotasyon-check` ekranda
  "10.0" yazıp ✗ veriyordu (gerçek değer 9,9875, eşik 10) — kapı sayıyı değil YUVARLAMAYI
  yargılıyordu. Mutlak 0,05'lik pay ise yüzde ölçeklerinde doğruyken oran ölçeklerinde
  (FTA/FGA 0,24-0,32) bandın yarısı kadar olup kapıyı körleştiriyor. Pay artık bandın
  **%2'si**.
- **BİR OLAY EKRANA İKİ SATIR BASABİLİR (FAZ 38 eki, FAZ 37 dersinin tekrarı):** şut
  olayı (preText + text) gibi SERBEST ATIŞ olayı da ikiye bölünür (`ftSplit` → düdük
  cümlesi atış anında, sonuç son atış çemberden geçince). Kelime ortalaması EKRANDAKİ
  SATIR başına ölçülür; tek satır sayılınca 19 kelimelik serbest atış olayı ortalamayı
  tek başına bandın dışına çıkarıyordu.

- **EŞİK ELLE YAZILMAZ, ÖLÇÜLÜR (FAZ 39 — bu deponun en pahalı dersi):** FAZ 34'ten
  38'e kadar beş tur ayar yapıldı, her turda kapılar yeşile döndü ve oyun yine
  "basketbola benzemiyor" kaldı. Sebep kod değil HEDEFİN KENDİSİYDİ — "gerçek: %14-18"
  tarzı bantların hiçbiri ölçülmemişti. Motor yanlış hedefe kusursuzca ayarlanmıştı.
  Artık `tempo-check` · `kutu-check` · `rotasyon-check` · `sut-cografya-check` eşiklerini
  `tools/_lib/gercek-bantlar.json`'dan okur; o dosya 3 sezonluk NBA play-by-play'den
  üretilir. Ölçüldüğünde yanlış çıkan tahminler: pozisyon süresi 0-4 sn tahmin %1-2 /
  gerçek **%7,9** · 25+ sn tahmin %0-2 / gerçek **%8,5** · 3PA/FGA tahmin %33-38 /
  gerçek **%40,1** · yedek sayı payı tahmin %25-35 / gerçek **%36,6** · "hızlı hücum
  üçlükle bitmesin" / gerçekte geçişlerin **%30,1'i** üçlükle biter.
  Yeni bir gerçekçilik kapısı yazarken eşiği `gercek-bant.js` üzerinden oku; veriden
  çıkarılamıyorsa **kapı KURMA**, `bilgi:` satırı bırak (uydurulmuş eşik, eşiksizlikten
  kötüdür).
- **"POZİSYON" İKİ FARKLI ŞEYDİR (FAZ 39):** `pbpstats` bir pozisyonu TOP EL DEĞİŞTİRENE
  kadar sayar — hücum ribaundu, savuşturulan top kaybı ve savunma faulü pozisyonu
  UZATIR, yenisini başlatmaz. Motorun döngüsü ise her yeni şut denemesini ayrı `pozIx`
  yapar. Ölçüldü: aynı 60 maçta ham 176,4 pozisyon/maç, birleştirilmiş 144,5, gerçek
  164,9 — yani ham sayacı gerçekle kıyaslamak kapının kendi tanımını ölçmesidir.
  Tempo/kutu ölçen araçlar ardışık AYNI TAKIM parçalarını birleştirir. Aynı ayrım
  "geçiş" için de geçerli: gerçek tanım pozisyonun CANLI TOPLA başlamasıdır (`transPoz`
  damgası), motorun `fbPoz` bayrağı bundan dardır — ikisini aynı kapıda kıyaslama.
- **SÜRE ÖLÇEKLEMESİ VERİMİ DÜZELTMEZ (FAZ 39 §3.2 ölçümü):** NBA sayımlarını 40/48 ile
  çarpmak maçı 40 dakikaya indirir ama NBA'nin pozisyon başına verimini (1,155
  sayı/pozisyon) taşır; sonuç 40 dakikada **95,2 sayı** olur, gerçek FIBA maçı ise ~80.
  Bu yüzden `gercek-bantlar.json` içinde ayrı bir **`pozisyonBasina`** bloğu var —
  saf oran, tempodan bağımsız, doğrudan taşınabilir. Sayım ölçütlerine kapı kurma,
  ORANA kur. ⚠ Bunun sonucu olarak motor aynı anda NBA temposuna, NBA isabetine ve
  FIBA skoruna sahip OLAMAZ: gerçek bantların tamamı kovalandığında `band.js`
  kullanıcı ortalaması 96,2'ye çıkıyor ve brifin 78-95 skor bandı kırılıyor. Tempo
  bilerek gerçeğin %6 altında bırakıldı; bu bir DENGE tercihidir, kusur değil. Skoru
  değiştirmek isteyen tek yer `pozTuru` içindeki dört süre bandıdır.
- **FIBA 14 SANİYE KURALI (FAZ 39):** top el değiştirmediyse şut saati 24'e değil 14'e
  döner ve ikinci şans pozisyonu KISADIR. `pozTuru` içindeki `devam` dalı bunu kurar
  (`posNext===_lastOff`). Kural eklenmeden önce topu koruyan takım yepyeni bir set
  hücumu maliyeti ödüyordu; 25+ sn pozisyon payı %14,7 idi (gerçek %8,5) ve 40 dakikaya
  gerçeğin çok altında pozisyon sığıyordu. Yeni bir "top bizde kalır" yolu eklersen
  `posNext`i doğru kur, yoksa o yol bu daldan geçmez.
- **BOYA YARIÇAP DEĞİL DİKDÖRTGENDİR (FAZ 39):** gerçek şut verisi çemberi 1,25 m
  YARIÇAPLA, boyayı RAKETLE (4,9 × 5,8 m dikdörtgen) tanımlar. `classifyZone` eskiden
  ikisini de yarıçapla ayırıyordu ve raketin dip yarısını orta mesafeye yazıyordu.
  `randShotXY`'nin üretim bantları (10-35 / 38-99 / 106-187) bu eşiklere BAĞLIDIR —
  birini değiştirirsen ötekini de güncelle, yoksa bant sınırı eşiği aşar ve paylar kayar.
- **YENİ OLAY TÜRÜNÜN SAHNE SÖZLEŞMESİ VARDIR (FAZ 39 §2.2, FAZ 38 dersinin tekrarı):**
  FAZ 38 yedi yeni olay türü ekledi ama `movePlayersForEvent` dalını yazmadı; maç başına
  **14,4 olay** sondaki genel dala düşüyor ve o dal topu KAYBEDEN takımda tutup
  çevresinde paslıyordu (düdük çalıyor, oyun durmuyor). Kural ihlalleri (`tac` · `ihlal`
  · `hucumFaulu` · `ihlal24`) artık ölü top + taraf değişimi + kenardan sokma; `mola`
  kulübe toplanması + SAHAYA DÖNÜŞ. ⚠ Mola dalı jetonları kulübede bırakırsa hemen
  ardından gelen serbest atış boş sahada patlar (`sahne-check` en kötü karesi 3/10 →
  0/10 ölçüldü) — koreografi sahada BİTMELİ. Taraf bilgisi `kazananIsUser` alanından
  okunur; yeni bir top kaybı olayı eklersen o alanı da doldur.

- **SAHNE SAATİ ≠ MAÇ SAATİ — ORANI HER KOŞUDA ÖLÇ, VARSAYMA (FAZ 40, F15 dersinin
  ikinci tekrarı):** sahne maç saatini hızlandırarak oynatır (ölçülen **1 duvar sn =
  1,45 maç sn**), yani ekranda görülen hız gerçek basketbolun 1,45 katıdır. FAZ 40 brifi
  yine SAHNE hızlarını doğrudan gerçek basketbolla kıyasladı ve "merdivenin tamamı iki
  kat yukarıda" dedi; maç ölçeğine indirilince SPRINT (6,72) ve KOŞ (5,60) zaten
  doğruydu, ortalama (2,07) bandın (1,8-2,6) içindeydi, bozuk olan yalnız ORTA
  basamaklardı. Brifin önerisi uygulansaydı ortalama bandın ALTINA düşerdi.
  `tools/iz-kaydet.js` oranı AYNI KOŞUDA ölçer ve her hızı iki ölçekte birden basar —
  bir hız rakamını yargılamadan önce onu çalıştır.
- **BU MOTORDA HIZ MERDİVENİNİ ÖLÇEKLEMEK GERÇEKÇİLİĞİ DEĞİŞTİREMEZ (FAZ 40, ölçüldü):**
  pozisyonun DUVAR saatindeki uzunluğunu koreografi belirler (`js/main.js`:
  `delay = max(simMs, dtMs)` ve bu motorda **simMs bağlayıcıdır**), koreografiyi de
  oyuncunun varış süresi belirler. Oyuncuyu yavaşlatınca koreografi uzar, maç saati
  aynı oranda yavaşlar ve **görünen hız / sahneKat sabit kalır** — kazanç sıfır, maliyet
  maçın %30 uzun izlenmesi. Ölçülen: `_KORE_KAT` 1,00 → sahneKat 1,388 · 1,20 → 1,193 ·
  1,35 → 1,052. Değiştirilebilir olan ortalama değil **DAĞILIMDIR**: donma payı, uç
  değerler ve ivme profili. FAZ 40'ta merdiven bu yüzden GERİ ALINDI.
- **IŞINLANMANIN KÖK NEDENİ GENELLİKLE SÜREDİR, ATAMA DEĞİL (FAZ 40 §A1):** topun tepe
  hızı 68,1 m/sn (245 km/sa) ve pozisyon başına 15,5 ışınlanma vardı; kaynak doğrudan
  konum ataması DEĞİL, koreografi adımlarının `_ballPass`e mesafeyi bilmeden verdiği
  SABİT süreydi (0,32-0,45 sn). Tavan (`_TOP_MAXV=580 px/sn`) **süreyi uzatır**, konumu
  kırpmaz. Ayrıca `held` dalında sürme noktası hız yönünden türüyor ve `sp>10` eşiği
  geçilince bir karede sıçrıyordu — top artık hedefine sınırlı hızla taşınır.
  `_ballStep` sonundaki güvenlik ağı (`S._klempN`) yeni açılacak dalları da korur.
  Ölçülen: 202 → **0** ışınlanma, tepe 68,1 → 20,1 m/sn, gerçek pas platoları 273 → 766.
- **BİR HIZ TAVANI EKLERKEN ONA BAĞLI ZAMAN AŞIMI KAPILARINI DA GÖZDEN GEÇİR (FAZ 40):**
  pas süreleri doğru değere uzayınca `_sahipsizTopTick` uçan pası "sahipsiz" sayıp
  `_ballKurtar` ile ORTA HAVADA iptal etmeye başladı (kurtarma 5 → 19). Asıl hasar üç
  adım uzaktaydı: kurtarma `b.onDone`'ı siliyor → son serbest atışın geri çağrısı
  çalışmıyor → `S._ftAktif` temizlenmiyor → sonraki bütün SAHA şutları serbest atış
  sanılıyor (dizilim ölçüsü 9,47 → 8,89, en kötü kare 8 → 0). Watchdog artık geçerli
  hedefi olan `pass` modunu muaf tutar — `sahne-check`in kendi ölçütü zaten "uçan top
  sahipsiz sayılmaz: şut, çemberden düşüş VE PAS" diyordu, watchdog ondan katıydı.
- **YAŞAM SÜRESİ OLAYLA SINIRLI BAYRAĞI OLAYIN BAŞINDA SIFIRLA (FAZ 40):** `S._ftAktif`
  yalnız son atışın `onDone` geri çağrısında kapanıyordu; geri çağrı çalışmazsa maçın
  sonuna kadar açık kalıyordu (HEAD'de de vardı). `movePlayersForEvent` girişinde
  sıfırlanır, `_setFtFormation` gerçek serbest atışta yeniden açar.
- **İKİ PARÇAYI AYRI TARAYAN KAPI, BİRLEŞME KUSURUNU GÖREMEZ (FAZ 40 §B2):** şut
  anlatımı ön parça (`preText`) + sonuç parçası (`text`) olarak üretilir ve ekranda
  `addComment` ile TEK BALONDA birleşir. `anlatim-check` ikisini AYRI tarar; birleşme
  noktasında doğan "nokta + küçük harf" kusurunu göremedi ve harness yeşilken ekrandaki
  balonların **%51,8'i** bozuktu ("… ve bıraktı. dengesi kaydı, olmadı."). Çözüm ön
  parçanın SONUNDADIR (havuzlara dokunulmaz): nokta → " —", ünlem/soru → sonuç parçası
  `trBuyukIlk` ile büyütülür. `spikerImza` da "Ad. Ad!" yerine "Ad. Ad…" kullanır —
  sonuç parçasını BÜYÜTMEK küçük harfle başlayan `I18N_PHRASES` kalıplarını kırar.
  Kapı: **`tools/balon-check.js`** (render edilmiş balonu okur). ⚠ Rakamdan sonraki
  nokta SIRA EKİDİR ("2. çeyrek", "4. takım faulü") — geriye bakış olmadan kapı kendi
  yanlış pozitifini üretir.
- **DONMAYI GENLİK ÇÖZER, KADEME DEĞİL (FAZ 40 §A2.3):** ölçüm (100 ms pencere, maç
  ölçeği) `held` modunda hücum %31,9 · **topu tutan %32,4** · **savunma %42,1** donma
  verdi. İki kök neden: (a) salınım genliği eşiğin ALTINDAYDI — bant 15-22 px, adım
  4-7 px ve varış freni salınım penceresinde 22 px/sn (0,54 m/sn maç) tavanlıydı, yani
  salınım çalışsa bile ölçüt eşiğinin (0,5) hemen altında kalıyordu; (b) **savunma hiç
  salınmıyordu** — salınım yalnız `S.offP` üzerinde çalışır ve savunma takibi ondan
  SONRA `p.tx`'i yeniden yazar. Savunma duruşu kayması bu yüzden `p.tx`'e değil yalnız
  o karenin hedefine (`_tx`) uygulanır.
- **SAVUNMACIYI ADAMINDAN UZAKLAŞTIRAN "CANLILIK" SAVUNMAYI KÖTÜLEŞTİRİR (FAZ 40):**
  simetrik duruş salınımı markaj mesafesini 1,74 → 1,80-1,88 m'ye açıp `spacing-check`
  kapısını düşürdü. Kayma **tek yönlü ve adama doğru** olmalı (eksen adam→pota, işaret
  eksi): hareket görünür, markaj sıkılaşır, ball-you-man sıralaması korunur. Topu
  TUTANIN savunmacısı tamamen muaftır — onun aralığı ölçülerek ayarlanmıştır (FAZ 36 §A3).
- **GERÇEKÇİ İVME MARKAJI GEVŞETİR (FAZ 40):** `_ivmeSinirla` (hızlanma `_ACC_MAX=330`,
  yavaşlama `_DEC_MAX=470` px/sn²) hız grafiğindeki dik duvarları bitirir ve yol
  eğriliğini TEK BAŞINA çözer (keskin dönüş 2,38 → 1,25/poz, tam sahayı düz geçen jeton
  3 → 0 — FAZ 40 §A3 için ayrıca kod yazılmadı). Ama savunmacı adamının hareketine TEPKİ
  verir; genel tavanla sınırlanınca geride kalır ve markaj 1,74 → 1,92 m'ye açılır.
  Markajdaki savunmacıya **×1,6** ivme tavanı verilir — savunma kayması kısa ve
  patlayıcı bir harekettir.
- **SAHAYA GERİ ALMA IŞINLANMADIR (FAZ 40 §A2):** topu sokan oyuncu çizginin 26 px
  dışındadır; `_oob` izni kalkınca `_inX`/`_inY` kırpması onu TEK KAREDE içeri çekiyordu
  (26 px / 16 ms = 55 m/sn). Ölçümdeki en hızlı jetonların HEPSİ x≈44 ya da x≈899'dan
  başlıyordu — yani koşu değil snap. Kırpma kademelidir: sınır mutlak kalır, yalnız
  anlık değil.
- **B GRUBU MADDELERİ ÖNCE ÖLÇÜLDÜ, ÜÇÜ ZATEN ÇÖZÜLMÜŞTÜ (FAZ 40):** uzatma %17,5 → ölçülen
  **%4,75**; yedek sayı payı %19,1 → ölçülen **%36,8**; yeni olay türlerinin sahne dalı
  → **dalsız olay/maç 0,00**. "Pozisyon sayısı fazla" (178) premisi ise GEÇERSİZDİR:
  o rakam HAM `pozIx` sayacıdır, gerçek bantla kıyaslanabilir birleştirilmiş değer
  **155,1** ve gerçek bant **161,8-167,9** — motor gerçekten AZ pozisyon oynuyor.
  Bir brif maddesini uygulamadan önce ölç; brifler eski ölçümlerle yazılır.

- **DONMA "YAVAŞ GİDİYOR" DEĞİL "HİÇ YOLA ÇIKMIYOR" OLABİLİR — AYIRT EDİCİ ÖLÇÜM
  HEDEFE UZAKLIKTIR (FAZ 40 eki):** salınım penceresi açıkken hedefe uzaklığa göre
  ortalama hız 0-1 px'te **0,11 m/sn**, 9-16 px'te **0,92**, 17+ px'te **0,99** ölçüldü.
  Yani jeton YOLDAYKEN hedef bandındaydı; sorun yola hiç çıkmamasıydı. Donuk karelerin
  yarısı 0-1 px kovasındaydı ve o karelerin **%89'unda sürüklenme ofseti TAM 0** idi:
  sürüklenmenin iki ucu da (radyal VE dik eksende) ya saha dışına kırpılıyor ya bir takım
  arkadaşını 2,10 m'nin içine sokuyor, `_hi=_lo=0` çıkıyor ve hedef dizilim noktasının
  TAM merkezine yazılıp jeton orada çakılıyordu. Bir "donma" ölçüsünü hızla değil,
  önce HEDEFE UZAKLIK dağılımıyla teşhis et.
- **KAPALI UÇTA DOĞRUSAL DEĞİL DAİRESEL HAREKET (FAZ 40 eki):** sıkışan jetona dar
  DOĞRUSAL bant vermek denendi ve ölçülerek elendi — adım banttan büyük olunca her adımda
  yön çevriliyor ve yol keskin zikzaka dönüyor (>90° dönüş 0,83 → **1,83**/pozisyon),
  adımı küçültünce hareket yeniden eşiğin altına düşüyor. Çözüm merkez çevresinde küçük
  bir YAY'dır (`_boks` bayrağı + hareket döngüsünde dairesel ofset, r=11 px · ω=3,4):
  süreklidir, keskin dönüş üretmez, ortalama konum yine merkezdir. Genel kural:
  **adım bandın yarısını aşmamalı** (`_adim ≤ (hi-lo)×0,45`).
- **TEK YÖNLÜ SÜRÜKLENME ORTALAMA KONUMU KAYDIRIR (FAZ 40 eki):** bir uç kapalı diğeri
  açıksa sürüklenme 0 ile açık uç arasında salınır ve ortalama, bandın YARISI kadar açık
  uca kayar. Boyada kalabalık olduğu için açık uç genellikle dıştır: `spacing-check`
  "potaya ortalama uzaklık" 6,84 → 7,08 m (kapı ≤7,00). Kapalı uç TAM banttan sınanmıştı;
  **%45 mesafede yeniden sınanınca** çoğu zaman açıktır ve bant simetrikleşir. Salınım
  yazan herkes "ortalama konum korunuyor mu" sorusunu ölçerek yanıtlamalı.
- **SALINIM KAPSAMI SET FAZI DEĞİL CANLI TOPTUR (FAZ 40 eki):** `S.canliSet` yalnız
  `phase==='set'`te açılır; geçişte kulvarına varmış oyuncular hiç kıpırdamıyordu
  (donmanın %27,2'si). Savunmacıya İKİ mekanizma da ulaşmıyordu: salınım yalnız `S.offP`
  üzerinde döner, duruş kayması ise `p._mark` ister ve geçişte `S.defTrack=false` olduğu
  için markaj kurulmaz. Kapsam artık `held`/`pass` (canlı top) iken açıktır ve geçişte
  İKİ TAKIMI kapsar; serbest atış (`_ftAktif`) ve kenardan sokma (`S.inb`) HARİÇ — o
  dizilimler ölçülerek ayarlandı (F14-7). ⚠ `p._setTx` yalnız set fazında yazılır,
  geçişte BAYATTIR; set dışında merkez olarak kullanılırsa oyuncu bir önceki hücumun
  dizilim noktasına sürüklenir.
- **SÜREKLİ HAREKET İLE "ŞUT ANINDA YERİNDE" KAPISI DOĞRUDAN TAKAS HÂLİNDEDİR
  (FAZ 40 eki):** `sahne-check` jetonun ANLIK salınım hedefine uzaklığını ölçer; sürekli
  kıpırdayan jeton tanımı gereği "hedefinde" değildir. Ölçülen takas: bant 25/adım 12-16
  → donma %19,5 · kapı 3,36-3,73; bant 22/adım 10-13 → donma %20,0 · kapı **4,03**
  (HEAD 4,11). Dizilim KALİTESİ ayrı ölçülmeli: şut anında jetonun **dizilim noktasına**
  (`p._setTx`) uzaklığı medyan 17 px (0,58 m) ve `spacing-check`in gerçek geometri
  kapıları (ikili mesafe, yayılım, boya) HEAD'den iyi.
- **AYNI ÇALIŞMA AĞACINDA ARKA PLANDA `git stash` ÇALIŞTIRMA (FAZ 40 eki):** HEAD
  karşılaştırmasını arka plan görevine almak (`git stash` → ölç → `git stash pop`)
  ön planda başlatılan ölçümleri SESSİZCE HEAD'e yönlendirir. Ölçüldü: görev
  çalışırken koşan `balon-check` "%47,1 düştü" dedi (düzeltme yerindeydi) ve
  `faz11-check` "15/15" verdi — ikisi de HEAD'in sonucuydu. Zulalama yapan bir görev
  varken başka hiçbir ölçüm çalıştırılamaz.

- **SUNUM BAYRAĞI MAÇ MATEMATİĞİNİ BESLİYORSA BU BİR KUSURDUR (FAZ 40 denetimi):**
  `shooterHint` bir sonraki şutu KİMİN atacağını belirler (kutu skor · şut bölgesi · şut
  tipi) ama kapısı `_rebAnlat` — FAZ 13'ten kalan ve bugün YALNIZ anlatım havuzunu seçen
  %22'lik bir çekiliş. Yani üsluba ait bir oran sessizce maç sonucunu belirliyor: birini
  değiştiren ötekini de değiştirir ve `band.js` hash'i kayar. Etkin putback oranı da
  yorumun dediği %55 DEĞİL, 0,22 × 0,55 = **%12,1**. Ölçülebilir sonucu:
  `sut-cografya-check` "tip: tip-in" %0,96 (gerçek %2,05-3,05) — tip-in TANIMI GEREĞİ
  putback'tir, payının tavanı putback sıklığıdır ve şut TİPİ tarafında (sunum) yapılacak
  hiçbir ayar onu bandına getiremez. Davranış korundu; ayrıştırmak rastgelelik akışının
  sırasına bağlı olduğu için hash'i kaydırır.
- **HEAD KARŞILAŞTIRMASI İÇİN ZULA DEĞİL AYRI WORKTREE KULLAN (FAZ 40 denetimi):**
  `git worktree add --detach DIZIN HEAD` ayrı bir dizinde HEAD kopyası açar; çalışma
  ağacına HİÇ dokunmaz, dolayısıyla paralel koşan ölçümler yanlış dala kaymaz.
  `node_modules` sembolik bağla paylaşılır, iş bitince `git worktree remove --force`.
  Zulalama yöntemi aynı ağaçta çalıştığı için ön planda koşan her ölçümü sessizce
  HEAD'e yönlendiriyordu (ölçüldü: `balon-check` düzeltme yerindeyken "%47,1 düştü" dedi).
- **PROSE'U ÇİFT TIRNAKLI SHELL ARGÜMANINDAN GEÇİRME (FAZ 40 denetimi — pahalıya mal oldu):**
  bash çift tırnak içinde ters tik'i KOMUT YERİNE GEÇİRİR. CLAUDE.md'ye eklenecek metin
  `node -e "..."` içine gömülünce, metinde geçen ters tikli kabuk komutları GERÇEKTEN
  çalıştı ve bunlardan biri bütün çalışmayı zulaya aldı (`git status` temiz göründü,
  tracked dosyaların tamamı FAZ 39'a döndü). Belge/metin eklerken Write aracıyla dosyaya
  yaz, sonra `cat dosya >> hedef` ile ekle — ara adımda tırnak yok.
- **`tools/_i18n-missing.txt` HER KOŞUDA DEĞİŞİR (FAZ 40 denetimi):** `i18n-scan` bu
  raporu yeniden yazar ve içeriği RASTGELE takım adlarından oluşur (hepsi özel isim,
  kusur değil). 400+ satırlık sahte diff üretir — commit'e alma, geri al.

- **DÖNÜŞ SINIRININ DOĞRU BÜYÜKLÜĞÜ AÇISAL HIZ DEĞİL DÖNÜŞ YARIÇAPIDIR (FAZ 42-B §A3, iki
  sürüm ölçülerek elendi):** "180°/sn, hızla ters orantılı" kuralı sprintte 4,9 m'lik dönüş
  yarıçapı verir; jeton hedefinin çevresinde YÖRÜNGEYE girer ve varamaz (ölçüldü: ortalama
  hız 2,79 · saha dışı %17,8 · arka saha %93). Gerçek oyuncu jog'da ~1 m, sprintte ~2,5 m
  yarıçapla döner (`_donusSinirla`: r = clamp(hız×0,30, 26-74 px)); hedef dönüş çemberinin
  içindeyse yarıçap hedefe göre küçülür; **120°+ dönüşte istenen hız SIFIRDIR** ("dur-dön") —
  %35'te bırakılınca jeton hedeften uzaklaşmaya devam ediyordu (sahipsiz top %7,2).
  Markajdaki savunmacı ve serbest top takipçisi ×1,6 çevik. Bir hareket sabitini "fizik böyle"
  diye yazmadan önce jetonun HEDEFE VARIP VARMADIĞINI ölç — hız ortalaması tek başına yanıltır.
- **SALINIMI KAPATMAK DONMAYI DEĞİL TERSLEMEYİ ARTIRIR (FAZ 42-B §A2, ölçüldü):** FAZ 41'in
  elips yayı `_SALINIM_ACIK=false` ile kapatılınca donma %10,5 → %23,9 ve 150° tersleme
  0,074 → 0,221/sn — varış frenindeki yerinde kıpırdanma, kapalı eğri olmayınca titremeye
  dönüyor. Elips yayı titreme DEĞİL, 5,5 m gerçek yol kat eden kapalı eğridir. Anahtar
  ölçüm için durur; kapatma.
- **SEKME ARKA PLANDA: `document.hidden` GÜVENİLMEZ, SAHNE SAATİNE BAK (FAZ 42-B §C):**
  başka sekme öne alınınca `document.hidden` false kalıyor ve `visibilitychange` hiç
  ateşlenmiyor (headless'ta ve canlı gözlemde), rAF ise boğuluyor (30 sn'de sahne 1 sn).
  Koruma sahne saatinin duvar saatine ORANINA bağlıdır (`stepGuarded` olay sınırında + bekçi
  2 sn'de bir; %35 altı = boğulma; 400 ms yoklama; dönüşte `_simCatchUp`). "Son rAF damgası
  1,2 sn eski mi" eşiği YETMEDİ — boğulmuş sekmede kare ~1,5 sn'de bir yine gelir.
  Kapı `tools/arka-plan-check.js`; `faz11-check` B2 harness'ı `--disable-renderer-backgrounding`
  ile açıldığı için orada olayların akması DOĞRUDUR, o kapıyı bu kusur için kullanma.
- **"SET KURULDU" = SON HÜCUMCU DA ÖN SAHADA (FAZ 42-B §D):** `canliSet` topçu varınca ilan
  ediliyordu; sokucu (`_oob`) muaf tutulunca sayı sonrası 20 m geride dururken set başlıyordu.
  `_hepsiOnde` (orta çizgi ±12 px, sokucu MUAF DEĞİL) + `_simTick`te geç açılış. Geride kalan
  hücumcu set noktasına KOŞ ile gider; düdük dallarındaki "herkes yürür" yalnız öndekilere.
- **TOP ELDEYKEN OYUNCUYLA GİDER (FAZ 42-B §B):** `held` modunda mutlak hız tavanı, sprint
  yapan jetonun eline yaklaşan topu jeton hızı + tavan ile 25-27 m/sn'ye çıkarıyordu.
  Top oyuncunun kare içi yer değiştirmesini (`p._px/_py`) aynen alır; yalnız ele göre ofset
  `_TOP_YAKLAS` ile kapanır. Işınlanma 3 → 0.
- **KAYNAK DOSYA KARIŞIK SATIR SONLU (CRLF + LF bölgeler):** FAZ 39/40'ta eklenen bazı
  bloklar LF. Yama çapası önce verildiği gibi, bulunamazsa LF'e çevrilerek aranmalı
  (`rep` yardımcısı); `node -e "..."` içine metin gömme — ters tik kabukta komut olur
  (FAZ 40 dersinin tekrarı, bu turda D2 yorumunu bozdu).
- **HEADLESS ÖLÇÜMDE DİLİ KİLİTLE (FAZ 42-B §E1):** `navigator.language=en-US` → i18n ilk
  açılışta İngilizce; "TR/EN karışımı" bulgusu test artefaktıydı. `iz-kaydet` dili oyun
  betiklerinden ÖNCE `localStorage charazay_lang=tr` ile sabitler; yeni araç yazarken aynısını yap.
- **F: TEMPO İLE SKOR BANDI AYNI ANDA TUTMAZ (FAZ 42-B §F):** gerçek tempo (+%6 pozisyon) ve
  gerçek top kaybı oranı birlikte kullanıcı ortalamasını ~97'ye taşır (bant 78-95). Top
  kaybı/çalma/faul/rotasyon/tip-in banda çekildi, tempo bilerek bırakıldı; kullanıcı 94,3.
  `band.js` **838518b5c925e68c** · `measure.js` **5fafc6b99867e038** · `sim-node --n=1000
  --seed=42` **93.4 - 87.5 · 270**. Putback kapısı artık `_rebAnlat`ten bağımsız (%27).
- **FAZ 43 İŞ 3 (motor, kullanıcı izniyle):** kural olayı payları gerçek bantlara çekildi; hash TEK ADIMDA
  yenilendi — `band.js` 838518b5c925e68c → **c19928475859c7ff** · `measure.js` 5fafc6b99867e038 →
  **51fa02b6e0a8194b** · `sim-node --n=1000 --seed=42` **93.7 - 88.1 · 269** (kullanıcı ort 94,4 · rakip 87,3).
  Şut saati göstergesi `sutSaatiKarar` tek kaynağından okunur; `node tools/kural-check.js` hem sıklığı hem göstergeyi sınar.

- **TOP DÜŞEY FİZİĞİ MAÇ ÖLÇEĞİNDEDİR (FAZ 43 İŞ 1, ölçülerek bulundu):** yerçekimi 460 px/sn²
  idi; yükseklik ölçeği 9,8 px/m (çember h=30 ↔ 3,05 m) ve sahne maç saatini ~1,45× sıkıştırdığı
  için gerçek yerçekimi sahnede 9,8 × 9,8 × 1,45² ≈ **202 px/sn²** eder — eski değer 2,3 kat
  fazlaydı; top çemberden yere 0,36 sn'de "çakılıyor", ribaunt mücadelesi görünmeden bitiyordu.
  `_TOP_G` tek kaynaktır; `_ballLoose`'a verilen her dikey hız bu yerçekimine göre ölçeklidir
  (hava atışı 210 → 140, blok 95 → 63, karambol 105 → 44-54: tepe 0,6 m). Yerçekimini
  değiştiren, bütün `vh` değerlerini √(g_yeni/g_eski) ile çarpmalı — tepe yüksekliği korunur.
- **`rim` MODUNDAN ÇIKIŞ YALNIZ `loose`A, YAKALAMA TEK KAPIDAN (FAZ 43 İŞ 1):** `_topAlinabilir()`
  — top serbest, oyuncu 0,7 m (21 px) içinde, top ele inmiş (h ≤ 20 ve düşüyor) ya da yerde;
  sayı sonrası yerden alma (`_yerdenAl`: en az bir sekme + h ≤ 3). Kaçan şut `_ballCarom` ile
  çemberde 0,14 sn sallanır, sonra serbest kalır. `_ballHold(p)` d>30 dalı ("top oyuncuya uçar")
  yalnız GERİ DÖNÜŞ yoludur; yeni bir yol yazarken takip (`_chase`) kur, topu oyuncuya gönderme.
- **OLAY SINIRINDA TAKİP KESİLMEZ, AMA YALNIZ ŞUT/RİBAUND OLAYINA DEVREDİLİR (FAZ 43 İŞ 1):**
  `clearBallTimers` → `_flushPending` eskiden takibi silip topu takipçiye `_ballHold` ile
  veriyordu (52 çıkışın 20'si "kimse dokunmadan uçan top"). Top serbestse takip korunur
  (`_koru`) ve `clearBallTimers` onu SİLMEZ. ⚠ Yalnız gelen olay şut pozisyonu ya da 'reb'
  ise (`mState._gelen`): serbest atış/faul gibi ölü top olayına devredilen takip topu yanlış
  takımın sokucusuna aldırdı ve "serbest atış" 730 px öteden, orta sahada 'rim' ile bitti.
  Ölü top dalları topu KENDİ toplatır (`_oluTopSokucuyaVer`, `_ftTopVer`/`_ftToplayici`).
- **ŞUT OLAYI BÜTÇESİ TOP ÇEMBERE VARMADAN BİTEBİLİR (FAZ 43 İŞ 1):** `animateShotPossession`
  `(tFire+0,85)` döndürür; koşullu bekleyen adımlar (`bekle`) koreografiyi uzatınca sıradaki
  olay top havadayken geliyor, `_flushPending` şut geri çağrısını ERKEN çalıştırıyordu
  (sokucu top çembere varmadan seçiliyor). Rezerv bütçeye DEĞİL `main.js`in `_waitRes`
  penceresine eklenir (`mState._animRez`) — pencere yalnız şut gerçekten geç bittiğinde işler.
- **DÜŞÜK HIZDA PİVOT SERBESTTİR, BÜYÜK DÖNÜŞ HIZ KESER (FAZ 43 İŞ 1, izole simülasyonla
  doğrulandı):** `_donusSinirla` 40 px/sn'lik salınım hızındaki jetona 90° dönüşü 2,5 m
  yarıçaplı yay olarak veriyordu (cos(d/2)=0,71 ile sprinte çıkıyordu); köşedeki ribauntçu
  önce 6 m BATIYA koşup 8 m'lik yolu 2,3 sn'de kat etti. Kural: sp < 90 px/sn ve |d| > 57°
  → anında dön; üstünde istenen hız `cos(d)`, 77°+ dönüşte sıfır ("bas, dön, çık").
  Kayıttaki yörüngeyi 20 satırlık izole simülasyonla YENİDEN ÜRETMEK, kök nedeni motorun
  içinde aramaktan hızlıydı — hareket kusurunda önce bunu dene.
- **YAKALAMA YARIÇAPI ÇARPIŞMA YARIÇAPINDAN KÜÇÜKSE TOP ALINAMAZ (FAZ 43 İŞ 1):** yakalama
  21 px, çarpışma 40 px — topun yanındaki rakip (ribaunt bloğu) takipçiyi 30-44 px'te tutuyor,
  top 2 sn yerde kalıyordu. Serbest topa 110 px'ten yakın takipçi için çarpışma yarıçapı 22 px:
  oyuncu topa uzanır. Aynı türden: `_setupInbound` sokucuyu sokma NOKTASINA değil basket
  yiyen POTAYA en yakın oyuncudan seçer (top havadayken de doğru).
- **ANLATIMDAKİ RİBAUNTÇU GEOMETRİYİ BİLMEZ (FAZ 43 İŞ 1):** motor ribauntçuyu ağırlıkla seçer,
  köşedeki kanat 7 m'den çağrılabilir; gerçek ivmeyle (5,3 m/sn²) top inene (1,3 sn) 4,5 m
  yol alır. Sahne üç şeyle uyum sağlar: adı geçen oyuncu şut ÇIKARKEN potaya iner, savunma
  uzunu şuttan 0,6 sn önce ribaunt bloğuna girer, top 3 m+ uzaktaki adı geçen ribauntçuya
  DOĞRU uzun seker. "Alanın çıkış anında ≤ 2,5 m" ölçütü hücum ribaundunu perimetre oyuncusu
  aldığında fiziksel olarak tutmaz — bu vakalar zaman damgasıyla raporlanır, hile yapılmaz.
- **SOKMA PASI 14 m, ALICI 10 m'YE ÇEKİLİR, UZUN TAÇ MAÇTA 1 (FAZ 43 İŞ 2):** eski "hedefin
  8 m'sinde savunmacı yok" istisnası sayı sonrası HER pozisyonda açılıyordu (rakip kendi
  potasına dönerken alıcının yanında kimse yok); 150 pasın 13'ü 15,9 m üstü, en uzunu 26,3 m.
  Şimdi: hedef rakip potaya HER savunmacıdan yakınsa ve `S._uzunTacN < 1` ise uzun; oyun
  kurucu topu sokucunun 5-6 m yakınından alıp SÜRER. Çıkış/hızlı hücum pası `_pasHedefSinirla`
  ile 14 m'ye kelepçeli. Ölçülen 11,9 % → 3,3 %, 20 m üstü 6 → 1.
- **ŞUT SAATİ KARARI TEK KAYNAKTIR (FAZ 43 D1):** `sutSaatiKarar(ev,off,onceki)` (`match-engine.js`)
  — `main.js` göstergesi ve `tools/kural-check.js` aynı fonksiyonu okur. Ölçüldü (HEAD):
  gösterge maç başına 72 sn 0'da bekliyor, 13,8 pozisyonda ihlalsiz 0'a iniyordu. Üç kök
  neden: (a) damga taşımayan olaylar (sub/mola/teknik) pozisyon penceresinin İÇİNE düşüyor →
  ölü top, gösterge boş ve durum değişmez; (b) 'reb' olayı pencerenin SONUNA düşer, tween'i
  15-20 maç sn sürer → gösterge DONAR (`dondur`); (c) çapa pozisyonun gerçek başı değil önceki
  damga → `min(önceki damga, t + dtPos)`. Yeni pozisyon (`pozIx`) aynı takımda 14, takım
  değiştiyse 24; top kaybında çapa olayın SONU. Sonuç 0,0 sn/maç.
- **KURAL OLAYLARI TOP KAYBI BÜTÇESİNİN İÇİNDEN ÇIKAR (FAZ 43 İŞ 3, motor):** tür payları
  çalma 54,5 → 52 · kötü pas 17,5 → 10 · ölü top ihlali 28 → 38 (taç %52 · hücum faulü %31 ·
  adım %17); şut saati ihlali kapısı 0,016 → 0,0103. `kural-check` 240 maçta: taç 1,19 → 2,15 ·
  hücum faulü 1,01 → 1,20 · şut saati 0,87 → 0,56 (hepsi bantta), top kaybı/poz 0,1435 ✓,
  çalma/poz 0,0682 → 0,07 (50 denendi, bandın altına düştü — 52). Aynı sayıda rastgele çekiliş
  yapıldığı için `band.js` skor dizisi çalma payından ETKİLENMEZ, `measure.js` (kutu skor) değişir.

- **HAVA ATIŞINDA ÇEMBERDE PİVOT DURMALI — KURULUM SLOT 0'I KOYUYORDU (FAZ 44 §1, ölçüldü):**
  `mkP` kurulumu çembere dizideki 1. oyuncuyu (genelde guard) koyuyor, `start` olayı pivotu
  YÜRÜYEREK çağırıyordu; toss anında (0,95 sn) çemberin 1,8 m'sinde KİMSE yoktu ve top 0,47 sn
  sonra pasa dönüyordu — "hava atışı diye bir hareket yok". Roller atandıktan sonra pivot ile
  slot 0 ilk çizimden ÖNCE yer değiştirir (kurulum, ışınlanma değil); toss 0,15 sn'de, iki pivot
  0,65'te sıçrar (`pop`), kazanan 0,95'te TEPEDE dokunur ve pas tepeden iner (`b.hFrom`);
  kazanma 1,56 sn. `iz-kaydet` artık top yüksekliğini kaydeder (`b[3]`) ve FAZ 44 bölümünde
  idle süresi · tepe · çemberde · yarı saha dengesi · kazanma süresini basar.
- **SOKMA YERLEŞİMİ KONUMA DEĞİL HEDEFE BAKAR (FAZ 44 §2, kural tanımlıydı ama hiç
  çalışmıyordu):** `_sokmaYerlesimi` sayı anında `p.x`e bakıyordu — o an herkes potanın
  dibindedir (hepsi "yakın"), hedefleri 25 m ötedeki geçiş kulvarlarıdır. Ölçüldü: 8 sokmada
  pas anında 15 m'de 1,0 takım arkadaşı, karşı yarıda 7,3/9. Şimdi `_startBreak(off, spot)`
  → `S._sokmaBekle`; `_setFormation(trans)` ve arka saha ölü top sokmaları `_sokmaKisit` ile
  PG'yi 5-6 m'ye, SG/PF/C'yi 4-11 m'ye çeker (SF kulvarında), savunma guardları orta çizgiyi
  3 m geçmiş, uzunlar 2 m gerisinde bekler; `_inboundPass` → `_sokmaSerbest` o fazın
  dizilimini yeniden verir. Ölçülen: 8/8 epizot, yakın 3,4 · karşı 2,25 · ilk pas 5-11 m.
- **SAHNE ÇIKIŞ-PASI KAPISI SOKUCUYU MUAF TUTAR (FAZ 44 §2, ara ölçümde çıktı):** "uzun topu
  1,2 sn içinde çıkarır" kapısı (`_simTick` 1a) çizgi dışındaki C/PF sokucuya da uygulanıyordu;
  PG 5 m'ye gelince pas oraya gitti, olay gelince `_inboundPass` topu sokucuya GERİ uçurdu ve
  ikinci kez soktu (6 sn arayla iki epizot). Kapı `!c._oob` ister — sokma pası koreografinindir.
- **ÖLÜ TOP DALI BEKLEYEN SOKMAYI İPTAL ETMELİ — TEK SOKUCU (FAZ 44 §2):** sayıdan 0,9 sn
  sonra gelen faulde `_setupInbound`ın sokucusu hâlâ `_oob`ydu; faul dalı ikinci sokucu atadı,
  `_flushPending` eski takibin geri çağrısını çalıştırıp eskisini dip çizgiye yolladı, top zaman
  aşımında ESKİ sokucuya gitti ve faul dalının pası HİÇ atılmadı (3-4 sn çizgi dışında bekleyip
  topla içeri yürüyen sokucu). İhlal dalı `_oobKapat`ı zaten yapıyordu, faul dalı yapmıyordu.
  Yeni bir ölü top dalı yazarken: `_oobKapat` hepsi · `S.inb=null` · `S._sokmaBekle=null` ·
  `S.chase=null`, sonra dizilim, sonra `_inboundSetup`.
- **BRİFİN "SÜRÜM 80'DE KALDI" MADDESİ ESKİ ÖLÇÜMDÜ (FAZ 44 §0):** `surum-check` oturum
  başında GEÇİYORDU (FAZ 43 commit'i 79→80 yapmıştı, canlı 80 servis ediyordu). Bir brif
  "kapı düşüyor" diyorsa önce kapıyı çalıştır; düşmüyorsa maddeyi "doğrulandı, iş yok" diye
  kapat. Yayın dosyası değişen her turun SON adımı yine sürüm artışı + `--yaz`dır (bu tur 81).
- **ÖLÜ TOP DALINDA ÖNCE TEMİZLİK, SONRA DİZİLİM (FAZ 44, serbest atış — HEAD'de de vardı):**
  serbest atış dalı `_setFtFormation`tan SONRA `clearBallTimers()` çağırıyordu; `_flushPending`
  bekleyen sokma takibinin geri çağrısını (`inb.tx=dip çizgi`, `noDrib`) çalıştırıp ATICININ
  çizgi hedefini eziyordu — atıcı topu dip çizgide 3 sn tutuyor, atış 25 m'den uçuyordu
  (free/loose 4,1 sn/470 sn). Sıra: `clearBallTimers` · `S.inb/_sokmaBekle/chase=null` ·
  `_oobKapat` hepsi · dizilim · toplayıcı. `_ftToplayici` top serbestse TOPA en yakın oyuncuyu
  seçer (top öbür potada kalmış olabilir). Ölçülen: 0,9 sn, 1 sn üstü epizot 0.
- **`sahne-check` ORTA ÇİZGİ GEÇİŞİ ÇİFT SAYAR (FAZ 44):** kapı held L↔R geçişlerini pozisyon
  değişimine böler; PG orta saha kulvarında topu alınca çizgi çevresinde ileri-geri geçiyor ve
  HEAD'de %111 çıkıyordu. Tek geçişli gerçek sürme (PG topu 5 m'den alır) kapıyı %70-76'ya
  indirir; pozisyon başına İLK geçiş iki sürümde de %71-73. Bu kapı davranış gerilemesinin
  kanıtı DEĞİLDİR — `gecis-analiz` (scratch) gibi pozisyon başına ölç.
- **KULLANICI "HER ŞEY BOZUK" DERSE ÖNCE HANGİ SÜRÜMÜ İZLEDİĞİNİ AYIR, SONRA SAHNEYİ KENDİN İZLE
  (FAZ 44):** canlı site commit edilmemiş turun kodunu servis etmez; şikâyet çoğu zaman bir
  önceki fazı anlatır. Sayılar yeşilken bile 60 sn'lik kontak sayfası (2 sn/kare) + HEAD ile
  aynı tohumda yan yana görüntü + değişiklikleri tek tek kapatan ikiye bölme, kod okumaktan
  hızlı teşhis verir. Bu turda üçü birden serbest atış kusurunu buldu, kapılar bulamamıştı.
- **`taskkill //IM chrome.exe` KULLANMA (FAZ 44):** headless ölçümü durdurmak için tüm Chrome
  süreçleri öldürüldü; kullanıcının tarayıcısı da kapanmış olabilir. Zinciri durdurmak için
  komut satırı eşleşen (`kapilar|tools/`) süreçleri hedefle, tarayıcıyı Playwright kapatır.

- **KAPI YALNIZ "OLAN"I SAYARSA "OLMAYAN"I GÖREMEZ (FAZ 45 — FAZ 44'ün kör noktası):** sokma
  kapısı yalnız topun ÇİZGİ DIŞINDA olduğu epizotları ölçüyordu; 24 sayı-sonrası pozisyonun
  17-22'sinde sokucu hiç çıkmıyor, pas potanın dibinden gidiyordu ve kapı 7/7 "geçti" diyordu.
  Kullanıcı bunu tek bakışta gördü. Bir davranışı ölçerken paydayı OLAYIN KENDİSİNDEN al
  (her sayı sonrası pozisyon), gözlenen alt kümeden değil. `tools/pas-analiz.js` böyle ölçer.
- **OLAY SINIRINDA SİLİNEN TAKİBİ BEKÇİ GERİ ÇAĞRISIZ KURAR (FAZ 45, kök neden):**
  `_flushPending` ölü/ölü olmayan ayrımıyla sokucunun takibini siliyor, top yerde kalıyor,
  `_sahipsizTopTick` 0,6 sn sonra `_ballKurtar` ile EN YAKIN oyuncuyu `fn:null` ile yolluyor.
  Sokucu topu alınca hedefi topun yeri (pota dibi) kalıyor ve çizgiye hiç çıkmıyor; bazen
  topu RAKİP alıp hücumun PG'sine "pas" veriyordu. Bir olay dalı önceki olayın takibine
  güveniyorsa, olay başında takibi KENDİ geri çağrısıyla yeniden kurmalı (`_chase(inb,_cizgiye)`);
  `bekle` de yalnız "top elinde mi" değil "yerinde mi" diye bakmalı (`_sokmayaHazir`).
- **ÇALMA ELDEN ALMADIR, TOP HIRSIZA PASLANMAZ (FAZ 45):** sokma pası çalınınca kaybeden
  oyuncu topu 14,4 m öteden doğrudan hırsıza "paslıyordu"; canlı topta da top uzaktaki
  hırsıza doğru yuvarlanıyordu. `_hirsizAl`: hırsız tutana koşar (≤ 1,6 sn, markaj biter),
  1,1 m'de top elden çıkar ve kısa mesafe ona fırlar. Olay bütçesi yaklaşma süresi kadar uzar.
- **GERİ PASIN ÇOĞU MEŞRU (FAZ 45 ölçümü):** > 2 m potadan uzaklaşan pasların çoğu hücum
  ribaundu sonrası uzunun çevreye açması ve set çevirme pasıdır; ölü topta çeyrek sonu
  taşıması da "pas" görünür. Yön kuralı yalnız GEÇİŞ pas seçicisine kondu (`_pasHedefSinirla`
  önde olan taşıyıcıyı tercih eder). Set içi geri pası yasaklamak basketbolu bozar.
- **BAYAT ARA NOKTA (`_wp`) HEDEFİ EZER — `_oob` OYUNCUYA DİZİLİM DOKUNMAZ (FAZ 45, en sinsi
  kusur):** geçiş dizilimi kanatlara `_wp` yazar, hareket döngüsü `_wp`yi hedefin üstüne uygular
  (`_tx=p._wp[0]`). Sokucu `_oob` olduğu için `_setFormation`/`_hedefAta` onu atlar; eski `_wp`
  kalır ve topu alınca hedefi dip/yan çizgideyken sahanın ÖBÜR UCUNA topla koşar (iz: hedef
  (103,498), gidiş x 128 → 706, 3 sn). Faul dalındaki "3-4 sn topla içeri yürüme" ve C/PF'nin
  topla orta çizgi geçişlerinin kaynağı buydu. `_hedefAta` artık `_wp=null` yapar (geçiş
  dizilimi `_wp`yi ondan SONRA yazar); `p.tx` doğrudan yazan her yer `_wp=null` da yazmalı.
  Teşhis: `iz-kaydet` artık `p[12..13]` = hedef kaydeder; "hedefe uzaklık artıyor" = ara nokta.
- **`_ballHold` GECİKMELİ PASI YALNIZ GERÇEK EL DEĞİŞİMİNDE DÜŞÜRÜR (FAZ 45):** FAZ 43'ün
  "el değiştirince `_pasSonra` düşer" kuralı, topun UÇARAK gelmesini (önceki taşıyıcı yok) de
  el değişimi sayıyordu; serbest atış toplayıcısına top pasla gelince şutöre gecikmeli pas
  siliniyor, toplayıcı topu tutup kalıyor, dizi bitmiyor ve sonraki pozisyonda "rakip PG'ye
  pasladı" görülüyordu. Koşul `b.carrier&&b.carrier!==p`.
- **`_flushPending` "TOP YERDE → VERİLMEZ" KURALININ BEDELİ: BEKÇİ (FAZ 45):** ölü top dalları
  topu kendi toplatır ama SAYI SONRASI pozisyon dalı önceki olayın takibine güveniyordu; takip
  silinince 0,6 sn sonra `_ballKurtar` EN YAKIN oyuncuyu (bazen rakibi) geri çağrısız yolluyordu.
  Bekleyen sokma (`S.inb`) varken bekçi topu SOKUCUYA verir ve çizgiye yollar; pozisyon dalı da
  olay başında takibi kendi geri çağrısıyla yeniden kurar.

- **CANLI TOP OAM'DADIR — `js/sahne-oam.js` (FAZ 46, kullanıcı kararı "yeniden yaz"):**
  şutlu pozisyon (`animateShotPossession`) artık Oyun Akışı Makinesi'ne gider: sokma → geçiş
  → set → şut fazları; her karede her oyuncuya TEK hedef (`oamHedefler`); topu tutan oyuncu
  BOŞ ve ÖNDEKİ takım arkadaşına pas atar (`oamPasOlur`: geri değil · boya içinden geçmiyor ·
  10 m'den uzun değil; olmazsa `oamKopru`), pas-ve-hareket, zayıf taraf değişimi, perde üç
  aşama (`S._perde`), post (`_sirtDonuk`), kesme; savunma adam adama (adam–pota hattı, topa
  uzaklığa göre yardım, topu tutana 38 px, şutta kapama). Şutu kimin/nereden/ne sonuçla
  attığı MOTORUNDUR; OAM oyunu o şutöre o noktada kurar. Eski `_simTick` hareket fiziğini
  sürdürür; OAM aktifken `canliSet` salınımı, `defTrack`, çıkış-pası kapısı ve `_wp` kapalıdır
  (`_simTick` sarmalayıcısı `canliSet`i eski tick'e false, ölçüm araçlarına true gösterir).
  Ölü top törenleri (hava atışı · serbest atış · faul/ihlal sokması · mola · periyot) eski
  koreografidedir. `OAM_ACIK=false` eski yolu geri getirir. Yeni bir olay dalı yazarken:
  `movePlayersForEvent` sarmalayıcısı OAM'ı her olayda kapatır — şut olayı sonra `oamSut`
  ile yeniden açar.
- **OAM BÜTÇESİ SET BAŞLANGICINA GÖRE YENİDEN KURULUR (FAZ 46):** `oamSut` tahmini süre
  döndürür (sokma + geçiş + set + 1,4 sn); set gerçekten başlayınca `oamSetBasla` şut anını
  `max(tFire, tSet+setDur)` yapar. Bütçe dolunca (`kalan ≤ 0,9`) pas şutöre zorlanır, şut
  yerinde olmasa da atılır; `_animRez=1800` `_waitRes` penceresini uzatır. Bütçeyi kısmak
  "zorla pas + anında şut" üretir — ilk OAM ölçümünde köşeden köşeye pas ve 0,3 sn'lik şut
  bunun sonucuydu.
- **PAS HIZI TAVANDA OLMASIN (FAZ 46):** `_ballPass` süresi `d/520` iken paslar 17-19 m/sn ile
  tavana (`_TOP_MAXV` 19,6) yapışıyor ve tek karelik örnekleme titreşimi 25 m/sn "ışınlanma"
  sayımını 27'ye çıkarıyordu. OAM pası `d/430`, en az 0,34 sn (≈ 15 m/sn göğüs pası).
- **OAM'DA ŞUTTAN ÖNCE DİZİLİM DONAR (FAZ 46, `sahne-check` "şut anında yerinde" 2,82 → ölçüldü):**
  noktasındaki oyuncunun hedefi küçük dairede döndüğü ve pas-ve-hareket noktayı kaydırdığı için
  şut anında jetonlar hedeflerinin 24 px dışındaydı. Şuttan 0,7 sn önce ya da top şutördeyken
  `O.donuk`: kıpırdanma ve yer değiştirme yok; şut, ≥3/4 takım arkadaşı noktasına oturunca
  (en çok +0,8 sn) atılır. "Aynı anda koşan" için topsuz hücumcu ve markajdaki savunmacı
  70-90 px'ten yakınken JOG.
- **`_simCatchUp` + OAM (F11-1, FAZ 46):** dönüşte eski kod jetonları `p.tx`'e ışınlar, aynı
  karede OAM yeni hedef yazar ve jetonlar yeniden yola çıkar (dönüş medyanı 349 px). `_simTick`
  sarmalayıcısı `S._snapN` değişince jetonları OAM'ın yeni hedefine de oturtur.
- **ÖLÇÜM: `pas-analiz` SOKMAYI OLAYIN KENDİSİNDEN SAYAR (FAZ 45-46):** serbest atış
  karesindeki hakem/toplayıcı pasları ve 2 m altı el değişimleri sokma değildir; "sayı
  sonrası ilk pas" listesinde `free` olayı (hakem topu) ayıklanır.

- **HAKEMLER JETON DEĞİLDİR (FAZ 47):** `S.hakem` (üç gri "H") `playersLayer`ın altına çizilir,
  `S.players`a girmez — çarpışma, ölçüm araçları (`iz-kaydet` 10 jeton varsayar), takip ve
  bekçi onları görmez. Konumları `oamHakemTick` her karede yumuşak kaydırır (baş: hücum edilen
  dip çizgi, top tarafı · arka: topun 5 m gerisi · orta: serbest atış çizgisi hizası). Serbest
  atışta topu BAŞ HAKEM getirir (`S._hakemTop`); oyuncu ribaunt alıp pas vermez, bekçi
  (`_sahipsizTopTick`) bu sırada sıfırlanır. Yeni bir ölü top töreni yazarken topu oyuncuya
  değil hakeme aldır.
- **UZUN TOPU ALINCA SÜRMEZ, OYUN KURUCU GELİR (FAZ 47, `oamOutletTick`):** eski "1,2/0,6 sn
  sonra en yakın guard'a çıkar" kapısı uzunu sürerken yakalıyordu; kullanıcı "4-5 numaralar top
  sürüyor, 1 numara gelmiyor" dedi. Mod: uzun yerinde döner (tx=konum, YÜRÜ), PG çıkış noktasına
  sprintler (uzunun 5 m önü, yakın kenar), 14 m'ye girince pas; OAM'ın kendi hedef yazıcısı
  bu iki oyuncuyu atlar (`S._outlet`). Hem OAM içinde hem OAM dışı anlarda (ribaund/çalma olayı)
  çalışır. ⚠ Çıkış pası HER ZAMAN guard'a: ilk sürüm 1,6 sn sonra "en yakın"a düşüyordu ve
  M9 %45'e indi (SF/uzuna çıkış); uzun 3 sn'ye kadar bekler (pivot), sonra PG'ye uzun pas.
- **`_simCatchUp` 0,35 SN EŞİĞİ KARE TAKILMASINDA IŞINLIYORDU (FAZ 47):** meşgul bir PC'de tek
  bir 0,4 sn'lik kare bütün jetonları hedeflerine sıçratıyordu ("maç ortasında ışınlanma").
  Eşik 1,2 sn (gerçek arka plan dönüşü); kısa takılmalar zaten `dt=min(0,05,raw)` ile yumuşar.
  `_ballHold` da 14 px üstü el değişimini kısa pasla yapar.
- **DÖNÜŞ OTURTMASI OAM'A DEĞİL SARMALAYICIYA AİTTİR (FAZ 47, arka-plan-check 6/6 → 5/6 → düzeltme):**
  `_simCatchUp` jetonları eski hedefe ışınlar; aynı karede OAM ya da çıkış pası modu yeni hedef
  yazar. Oturtma yalnız OAM aktifken (`O._snapSeen`) yapılınca çıkış pası modundaki (OAM dışı)
  dönüşler 310 px sapmayla kaldı. Sayaç `S._oamSnapSeen` ile sarmalayıcıda, her hedef yazıcıdan
  SONRA ve eski tick'ten ÖNCE karşılaştırılır.
- **BLOK NOKTASI TOPUN KONUMUNDAN (FAZ 47):** `oamAtes` blok dalı motorun şut noktasından (`sh.x`)
  hesaplıyordu; bütçe dolup şutör noktasına varamadan atış zorlanınca top 12 m'yi 0,2 sn'de
  uçtu (683 m/sn). Sahne olayı topun GERÇEK konumundan başlatır.
- **`iz-kaydet` MAÇ SAATİ BAŞLAMADAN ÖNCEKİ KARELERİ ATAR (FAZ 47):** `saat=0` kurulum kareleri
  çeyrek net saatini 0'a düşürüp sahne↔maç oranını 1 yapıyor ve kurulum yerleşimi "90 m/sn
  sıçrama" sayılıyordu.
- **TOPU SÜREN TAKIMINI BEKLEMEZ AMA TEK BAŞINA DA GİTMEZ (FAZ 47):** geçişte topu tutan, üç
  takım arkadaşından 150 px+ öndeyse JOG'a düşer; uzunlar KOS ile gelir. Uzunları JOG'a
  düşürmek "topu süren tepede tek başına bekliyor" görüntüsünü ÜRETTİ (FAZ 46 ara ölçümü).
- **"IŞINLANMA 0" ÖLÇÜMÜ HIZLI MAKİNEDE ALINDIYSA HİÇBİR ŞEY KANITLAMAZ (FAZ 47c, en pahalı ders):**
  rAF döngüsü kare süresini 0,05 sn'ye kırpıyordu; 10-20 fps'lik makinede sim gerçek zamanın
  yarısı hızında akıyor ve `main.js` "sahne geride" yolu 1,2 sn'de bir `_simCatchUp` ile ON JETONU
  hedefine ışınlıyordu. 60 fps'lik bu makinede ölçüm hep "0" dedi; kullanıcı "sürekli ışınlanma"
  gördü. Kare başına sim süresi artık 0,25 sn'ye kadar (33 ms alt adım × 32). Sahne ölçümü
  `iz-kaydet --yavas=4` (CDP `Emulation.setCPUThrottlingRate`) ile de koşulmalı; tek karelik
  sıçrama `tools/isin-oyuncu.js` ile sayılır (100 ms pencere ortalaması kısa sıçramayı yutar).
- **HAKEM ÇİZGİNİN DIŞINDA DURUR — İŞARETİ ÖLÇEREK DOĞRULA (FAZ 47c):** ilk sürüm `CRT_Y1-14`
  (içeri) yazdı; kontak sayfasında fark edilmedi çünkü 11 px'lik gri jeton kenarda "dışarıda
  gibi" duruyordu. Kural: dip çizgi `CRT_X0-16 / CRT_X1+16`, kenar `CRT_Y0-16 / CRT_Y1+16`.
  Hava atışını orta hakem çemberden atar (kurulumda orada durur, 3,5 sn sonra kenara çıkar).


- **HAREKET HEDEFLERİ ARTIK GERÇEK VERİDEN — `tools/_lib/gercek-hareket.json` (FAZ 48):** SportVU
  2015-16, 10 maç, 811 bin kare (`tools/gercek-hareket/indir.js` + `cikar.js`; ham veri
  `_ham/` gitignore'da, 7zr.exe kamu malı). `tools/hareket-bant-check.js` iz kaydından AYNI
  tanımlarla dağılım çıkarır ve histogram L1 uzaklığı basar (kapı ≤ 0,35, tek sabit). Elle
  yazılmış hareket bandı KALMADI; yeni bir hareket kapısı yazarken eşiği buradan al, veriden
  çıkarılamıyorsa kapı KURMA (`cikarilamadi`: perde sayısı, şut tipi).
- **TAHMİNLE YAZILAN KAPI TERS YÖNDE OLABİLİR (FAZ 48, en önemli ders):** `sahne-check`in "şut
  anında yerinde hücumcu ≥ 4,25/5" kapısı gerçekle çelişiyor — SportVU'da şut anında 4 takım
  arkadaşından ortalama 1,66'sı duruyor, 2,3'ü hareketli. FAZ 46-47 bu kapıyı tutturmak için
  şuttan önce dizilimi dondurdu ve gerçeklikten uzaklaştı. Bir kapı "tutturulamıyorsa" önce
  eşiğin nereden geldiğini sor; ölçülmemişse eşik değil kapı yanlıştır.
- **GERÇEK VERİDE "TUTAN"/"POZİSYON" TANIMI SONUCU 3× DEĞİŞTİRİR (FAZ 48):** topa ≤ 0,9 m ile
  tutan sürme sırasında kopuyor (tutma 0,95 sn), takım değişimini anlık sayınca 727 poz/maç
  çıkıyor (gerçek ~200) ve pas/poz 0,9 görünüyor. Doğru: ≤ 1,2 m + 0,5 sn köprü, pozisyon
  değişimi için karşı takım ≥ 1 sn tutmalı → 212 poz/maç, 3,1 pas/poz. Motor tarafında da AYNI
  tanım uygulanır; iki taraf farklı tanımla ölçülürse L1 tanım farkını ölçer.
- **TÖREN OAM'A GEÇİNCE İLK KARE HEDEFİ HEMEN YAZILMALI (FAZ 48 · 1c):** eski dalın bekleme
  tahmini (`_ftWaitSec`) ve `_ftHazir` kapısı `p.tx` okur; hedefler bir kare sonra yazılınca
  serbest atış oyuncular kulvara varmadan patlıyordu (F14-7 9,8 → 6,7/10). `oamTorenKur`
  hedefleri kurulumda yazar. Tek hedef yazıcı kuralı: tören boyunca `_hedefAta` sarmalayıcıda
  kapalı (`S.oam.torenSahibi`); eski dalların hedef çağrıları duruyor ama etkisiz.
- **YÖRÜNGE GRAFİĞİ SAYIDAN ÖNCE GELİR (FAZ 48 · 3. taş):** `tools/iz-poz-ciz.js` tek pozisyonu
  ve gerçek SportVU olayını yan yana çizer. Gözle görülen ve hiçbir kapının yakalamadığı kusur:
  zayıf taraf değişimi ve 5-dış şablonunda uzunların köşe noktası, oyuncuları sahayı boydan
  boya kat eden uzun yaylara sokuyordu (gerçekte pozisyon yarı sahada kalır). Değişim yalnız
  komşu noktalar (≤ 7 m), uzunlara köşe yok. 470 sn'lik tam yörünge resmi "saç yumağı"dır —
  pozisyon penceresi (10-14 sn) çiz.
- **L1 KAPISI n≈50 POZİSYONDA ±0,1 GÜRÜLTÜLÜDÜR (FAZ 48 · 2. taş, ölçüldü):** aynı kodun beş
  kaydında "şut anında duran" L1 0,32-0,45, "pas/pozisyon" 0,42-0,60 arasında salındı (n=48-54).
  Tek maddelik bir ayarın etkisi bu banttan küçükse kayıttan okunamaz; karar ORTALAMANIN yönü +
  gerçek verinin yönü ile verilir, L1 yalnız 26 bin karelik ölçütlerde (hız, savunmacı, yayılım)
  tek başına yeterlidir. Dört madde dört paralel kopyada (`basketlig-a..d`, `kopya.sh`) tek tek
  ölçüldü; c ve d ölçülebilir etki vermedi ve kök neden başka yerdeydi (aşağıda).
- **"SAVUNMACI UZAK" TEŞHİSİ ÖN/ARKA SAHA AYRILMADAN OKUNAMAZ (FAZ 48):** toplam 4,4 ↔ 3,1 m
  farkının kaynağı ön saha DEĞİLDİ (2,2 ↔ 2,0 m); iki ayrı kusurdu: (1) ön sahada dağılım
  gerçekte %21 1 m altı, motorda %0 — `_PL_R=40` çarpışma yarıçapı topu tutanla savunmacısını
  1,35 m'de tutuyordu (çift için 20 px); (2) arka sahada 8,2 ↔ 5,1 m — eski geçiş kodu
  (ribaund/sayı sonrası, sıradaki olay gelene dek OAM kapalı) savunmacıları kendi yarı sahasında
  bekletiyor. `gercek-hareket.json` artık `savunmaciOn/savunmaciArka` + `arkaSaha.tutmaPayi`
  taşır (motor %36 ↔ gerçek %37 — arka saha SÜRESİ doğruydu, mesafe yanlıştı).
- **RİBAUND TAKİBİ 'reb' OLAYINI BEKLEMEZ (FAZ 48 d2, iz ile bulundu):** top çemberden düşünce
  1,3 sn yerde bekliyordu — `_rebScramble` kazananı topun üstüne gönderiyor ama `_chase` ancak
  'reb' olayında kuruluyordu; takipsiz jeton `_topAlinabilir`den geçmez. Şimdi kazanan hemen
  takibe girer, çıkış pası olay gelene dek `S._erkenReb` ile bekletilir (anlatım senkronu
  korunur). Kaçan şut sonrası serbest top 3,1/2,4 sn idi (miss2/miss3).
- **ÖLÇÜM DAMGASI TICK SONRASI YAZILIR (FAZ 48):** `spacing-check` set fazını `S.defTrack`ten
  okur; OAM eski tick'e girerken bayrağı kapatır (eski yazıcılar sussun diye) ve geri açmıyordu →
  "SET fazına ait hiç kare yakalanamadı". Sarmalayıcı tick sonrası `defTrack=(faz==='set')` yazar.
  Bir bayrağı ölçüm aracı okuyorsa, onu kapatırken aracın ne göreceğini de düşün.
- **`animateShotPossession` İÇİNDEKİ YEREL FONKSİYONLAR OAM'DAN GÖRÜNMEZ (FAZ 48 d3, en pahalı
  bulgu):** `_rebScramble` o fonksiyonun içinde tanımlı; `sahne-oam.js` onu çağırınca
  ReferenceError fırlıyor ve `_ballShoot` geri çağrısındaki try/catch yutuyordu — FAZ 46'dan beri
  OAM şutlarında ribaund mücadelesi HİÇ kurulmadı (kazanan topa gitmiyor, box-out yok), top 'reb'
  olayına dek 2-3,5 sn yerde kaldı; "top elde %57-60" ve "sahipsiz top" bulgularının kökü buydu.
  OAM kendi kopyasını taşır (`oamRebScramble`). Kural: OAM'a taşınan her eski çağrının GLOBAL
  olduğunu `node --check` DEĞİL, çalışma zamanında bir sayaçla doğrula (sessiz catch bloklarında
  ReferenceError görünmez); `iz-kaydet`in `ch` (takip var mı) alanı bunu 1 dakikada gösterdi.
- **SOKMA PASI OLAYI BEKLEMEZ (FAZ 48 c4):** sayı/serbest atış sonrası eski kod pası bir sonraki
  olayın betiğine bırakıyor, OAM o betiği yeniden kurduğu için sokucu çizgi dışında olay gelene
  dek (1-5,5 sn, savunmacı 10,6 m) topu tutuyordu. `oamSokmaTick` çizgiye varıştan 0,7 sn sonra
  pası atar, `oamYuruTick` oyun kurucuyu orta çizgiye JOG ile getirip orada süretir (gerçek
  "topu yürütmek"), `oamBaskiTick` savunmacısını 1,3-3,7 m'de tutar; olay gelince OAM `gecis`ten
  devam eder. Olay sistemi ile sahne arasındaki "ölü zaman" artık çizgi dışında değil, sahada
  top sürerek geçer.
- **ERKEN ALINAN TOPUN HÜCUMU DA ERKEN BAŞLAR (FAZ 48 d4):** d2/d3 ribaundcuyu 'reb' olayından
  önce topa gönderince ilk sürüm çıkış pasını olaya kadar bekletti (`_erkenReb`) — uzun topu
  alıp 3,9-5,8 sn dikildi (`sunum` M9 6/8, tutma süresi). Doğrusu: takip biter bitmez
  `_startBreak`, 'reb' olayı gelince yalnız anlatım (`erken` bayrağı: top ribaundcuya geri
  UÇURULMAZ, hücum ikinci kez kurulmaz). Bayrak olay sonunda sarmalayıcıda sıfırlanır — bir
  olaya ait bayrak sonraki olaya sızarsa (faul → gerçek ribaund) yanlış dala girer.

- **HIZ MERDİVENİ DUVAR (EKRAN) ÖLÇEĞİNDE YARGILANIR — FAZ 40 KARARI ÇÜRÜDÜ (FAZ 49):** FAZ 40
  "merdiveni ölçeklemek kazanç getirmez, maç aynı oranda uzar" demişti ve MAÇ ölçeğinde ölçmüştü.
  Kullanıcı maç ölçeğini göremez; sahne maç saatini 1,65× sıkıştırdığı için ekranda her jeton
  gerçeğin 1,65 katı hızla akıyordu (duvar: ort 3,19 ↔ gerçek 1,72 · 7,5+ %9,3 ↔ %0,25). Ve
  pozisyonun duvar süresini oyuncu hızı DEĞİL koreografi (set 2,2-3 sn sabit) belirler: hızlar
  %40 düşürülünce sahne→maç yalnız 1,65 → 1,55 oldu. `hareket-bant-check` iki ölçeği de basar;
  bir hız rakamını yargılarken hangi ölçeğe baktığını yaz. Kabul ölçütü DUVAR ölçeğidir.
- **HIZI DÜŞÜRMEK HİSTOGRAMI DÜZELTMEZ, ZAMAN PAYI DÜZELTİR (FAZ 49, 12 kayıtla ölçüldü):**
  merdiven tek başına 0-1 m/sn payını %21 → %23 yaptı; karelerin %54'ünde jeton hedefine 80 px'ten
  uzaktı (geçiş+bekleme fazları karelerin %65'i, set %20'si). Gerçekte pozisyonun üçte ikisi
  set fazıdır ve oyuncu orada DURUR. Doğru resim: **geçiş KISA ve KOŞULU (KOS 4 m/sn), set UZUN ve
  durağan.** Geçişi JOG yapmak denendi (c) ve ters tepti: 2-3 m/sn bandı %28 (gerçek %14), hücum
  yığın hâlinde ilerledi (yayılım y 3,6 → 2,7). Set +2,4 sn ile karelerin %26-30'u; şut
  `setDur×0,8`te (0,55 ile uzatma boşa gidiyordu); set ≥3 hücumcu noktasının 4 m'sine gelince
  başlar (ölçüldü: başlangıçta ort 6,8 m uzaktı).
- **FAZ 41 ELİPS YAYI KAPATILDI (`_ELIPS_ACIK=false`, FAZ 49):** ω·a = 3,8 × 34 px ≈ 130 px/sn =
  4,4 m/sn DUVAR ölçeği — "yerinde" jeton 1-2 m/sn ile tur atıyordu; yerinde+hızlı karelerin
  %90'ı salınım penceresindeydi. Kapatınca 0-1 bandı %25 → %37. FAZ 42-B'nin "salınımı kapatmak
  donmayı artırır" ölçümü eski hedefe (donma = kusur) göreydi; gerçek veride oyuncu zamanın
  %42'sinde 1 m/sn altındadır — durmak kusur değil. Varış tavanı 10 px/sn, salınım penceresi 12.
- **SAVUNMACININ HEDEFİ ÇARPIŞMA YARIÇAPININ İÇİNDEYSE İKİSİ DE SÜRÜNÜR (FAZ 49):** topsuz
  savunmacı hedefi adamına 17-34 px, rakip çarpışma yarıçapı 40 px — hedefe hiç varamıyor, her
  karede 3 px itilip yeniden yaklaşıyordu (24-80 px bandındaki savunmacı karelerinin %46'sı
  1-2 m/sn). `_defGap` 28-40 px + markaj çifti (`d._mark===m`) 26 px + perde çifti 22 px.
  Bir hedef yazarken hedefin fiziksel olarak ULAŞILABİLİR olduğunu (çarpışma, kırpma) kontrol et.
- **KÖŞELERİ BOŞALTAN İKİ KURAL BİRLEŞİNCE YAYILIM ÇÖKER (FAZ 49):** "uzun köşede durmaz →
  dirsek" + "zincir pasçısı köşede durmaz → takas" birlikte hedeflerin y yayılımını şablonun
  5,1 m'sinden 3,0'a indiriyordu (gerçek 3,75; tepe 4-5 m). Köşedeki uzun zincir dışı bir
  GUARD'la takas edilir, aday yoksa köşede kalır. Pas-ve-hareket köşeyi döndürmez (dışarısı
  saha dışı olduğu için yalnız içeri dönebiliyordu) ve oyuncu başına bir kez.
- **"SET İÇİNDE SPRINT ASLA" GERÇEK VERİYLE ÇELİŞTİ, VERİ KAZANDI (FAZ 49):** kesme gerçekte
  1,5 sn'lik pencerede 0,80/pozisyon ve > 3 m/sn; KOS ile 0,09'a düştü. Kesme ve flaş kesme
  (`OAM_FLAS_ACIK`) kısa SPRINT patlamasıdır (3 m); geçiş kanatları KOS, sprint hızlı hücumda.
  Bir brif kuralı gerçek dağılımı bozuyorsa kural değil veri kazanır (FAZ 48 dersi).
- **ŞUT ÖNCESİ HAREKETİ ERKEN TETİKLEMEK ONU YOK EDER (FAZ 49):** uzunları ribaunda 1,4 sn
  önce indirmek onları şuttan ÖNCE noktasına vardırıp DURDURDU (4'ü duran şut %31 → %47).
  Tetik yalnız top şutöre uçarken/şutördeyken. Yine de kapı (gerçek 1,66/4 duran) tutmadı —
  ivme tavanı 118 px/sn² 0,3-0,6 sn'de 1,3 m/sn üretmiyor; hile yapılmadı, açık bırakıldı.
- **"10 OYUNCU AYNI YARIDA" GERÇEKTE %68'DİR (FAZ 49):** brif "%65 → ≤ %30" istedi; SportVU
  ölçümü (`ayniYari`) %68,1 — set hücumunda savunma zaten hücumun yarısındadır. Motor %64 → %69,
  `topYarisi` L1 0,18. Bir "gözle görünen kusur" için önce gerçekte ne olduğunu ölç; "saha
  yarısı bomboş" izlenimi doğrudur ve gerçektir.
- **SAHNE→MAÇ 1,30 BİLİNÇLİDİR (FAZ 49):** ekran gerçeğe oturunca maç ölçeğindeki hız gerçeğin
  altına iner (L1 0,24, ort 1,50 ↔ 1,72) ve maç ~%27 uzun izlenir. L1'i 0,20'ye indirmenin
  ölçülen tek yolu seti gerçek uzunluğuna (10-15 sn) getirmek = gerçek zamanlı maç. İzleme hızı
  düğmesi (`setMatchRate`) durur; kullanıcı kararı gerekmeden daha da uzatma.

- **CANLI TOP GERÇEK MAÇ KAYDINDAN OYNAR — `js/sahne-klip.js` + `js/klip-data.js` (FAZ 50, kullanıcı
  kararı "radikal değişiklik"):** FAZ 46-49'un elle yazılmış koreografisi (OAM) altı turda gerçek
  dağılımlara yaklaştırıldı ama kullanıcı "inanılmaz saçma tek paslar" dedi — basketbolun AKIŞI kural
  listesiyle yazılamıyor. Artık şut olayı gelince motorun kararı (şutör · nokta · sonuç · kutu skor)
  KORUNUR, sahne o şuta en yakın GERÇEK pozisyonu (SportVU 2015-16, 696 klip, 5 kare/sn, 10 oyuncu +
  top; `tools/gercek-hareket/klip-cikar.js` üretir) seçip 10 jetonu ve topu o kaydın yörüngesinde
  KİNEMATİK oynatır (`_klip` jeton, `S._klipTop` top: fizik, çarpışma, bekçi, eski yazıcılar atlanır).
  Eşleme rol sırasıyla (PG,SG,SF,PF,C ↔ G,G,F,F,C), şutör klibin şutörüne; ilk 1 sn harman (blend);
  son 1,5 sn'de şutör + top motorun noktasına kaydırılır; elden çıkışta top `oamAtes`e devredilir
  (ön parça/sonuç senkronu, blok, AND-1, ribaunt mücadelesi, sokma aynen), oyuncular klibin şut sonrası
  1 sn'sini oynar. Ölü top törenleri (hava atışı, serbest atış, faul sokması, mola) ve putback OAM'da.
  `KLIP_ACIK=false` OAM'a döner. Ölçülen (470 sn): oyuncu hızı L1 **0,11**, yayılım x/y · savunmacı
  (ön/arka) · koşan · kesme · potaya uzaklık · topun yarısı HEPSİ ✓; geri pas %1, rakibe pas 1.
- **KLİP OYNATICIDA HIZ KIRPILMIŞ KONUMDAN TÜRER (FAZ 50, ölçülerek bulundu):** NBA verisinde oyuncu
  çizgi dışına taşabilir; `p.x=_inX(nx)` kırpılınca `vx=(nx-p.x)/dt` her karede sabit 40 px'lik farkı
  hız sanıyor (2500 px/sn) ve klip bitince fizik o hızla jetonu sahadan uçuruyordu. Hız `(p.x-ox)/dt`,
  ±400 px/sn kelepçeli; klip bitişinde vx=vy=0.
- **KLİBİN BAŞLANGICI TOPUN ŞU ANKİ YERİNE HİZALANIR (FAZ 50):** klip topun 14 m ötesinden başlarsa
  1 sn'lik harman 47 m/sn "uçuş" üretir (ölçüldü, 28 ışınlanma tek pozisyonda). Seçim maliyetine ilk
  karedeki top uzaklığı girer; klibin ilk %35'inde topa en yakın kare başlangıç alınır (≥ 3 m kazanç).
- **ŞUT SONRASI 1 SN DE KLİPTEN (FAZ 50):** klip elden çıkışta bitince `oamAtes`in 0,58 sn'lik şut
  hazırlığında on jeton donuyordu ("şut anında duran" 3,4/4 ↔ gerçek 1,66). Klip `r` (elden çıkış)
  + ~1 sn taşır; top devredilir, oyuncular klip sonuna kadar gerçek yörüngede kalır.
- **HAKEMLER SAHAYA GİRMEZ (FAZ 50, kullanıcı):** üçü de çizgi dışında ve neredeyse sabittir (baş: dip
  çizgi dışı iki nokta arasında 60 px/sn; arka: orta saha hizası alt kenar; orta: serbest atış hizası
  üst kenar). Serbest atışta top hakeme IŞINLANMAZ, dip çizgiye doğru yuvarlanır, hakem oradan verir.
- **YAYIN DOSYASI: `js/klip-data.js` 3 MB (FAZ 50):** `<script>` etiketi ve `sw.js` JS_FILES listesinde;
  `surum-check` iki listeyi kıyaslar. Klip verisini yeniden üretince (`klip-cikar.js`) sürüm artmalı.
  Node harness'leri (sim-node, anlatim-check…) bu iki dosyayı YÜKLEMEZ — motor sözleşmesi değişmedi.
- **SPORTVU VERİSİNDE İZLEME SIÇRAMASI VARDIR — KLİP ELENİR (FAZ 50, ölçüldü):** 769 klibin 73'ünde
  bir oyuncu 0,2 sn'de 3-20 m "atlıyordu" (kimlik karışması); sahnede jeton 3 m/kare spazm yapıyor,
  `isin-oyuncu` 115 tek kare sıçrama sayıyordu. `klip-cikar.js` oyuncu > 2,5 m/kare ya da top > 8 m/kare
  olan klibi atar (`say.sicrama`). Gerçek veri de ham hâliyle "gerçek" değildir; kapıdan geçir.

- **AYNI DURUMU GÖSTEREN İKİ BUTON TEK DURUM MAKİNESİNDEN OKUR (FAZ 51, kullanıcı "maçı başlatıyorum
  görüntü gelmiyor, hâlâ Başlat yazıyor"):** Maçlar sayfasındaki `startMatchBtn` F13-15 durum makinesinden
  ("⏩ Kilitli sonucu uygula") okurken Ana Panel kartı (`renderDashboardNextMatch`) sabit "▶ Maçı Başlat"
  yazıyordu; yarıda bırakılmış maçın C1 kilidi varken tıklama kilitli sonucu SESSİZCE uyguluyor, canlı
  görüntü açılmıyordu. Kullanıcının tarayıcısında (Chrome eklentisi, kendi kaydı) yeniden üretildi — yerel
  ve canlı temiz kayıtta çıkmıyordu. Etiket tek kaynaktan (`matchPlaybackState`), bildirim skoru ve sıradaki
  adımı söyler; `tools/kilit-check.js` sınar. **"Bende oluyor sende olmuyor" şikâyetinde önce kullanıcının
  KAYDIYLA dene**, temiz kariyerle değil.
- **KLİP HARMANI ZAMANLA DEĞİL HIZLA KAPANIR (FAZ 51, ölçüldü):** FAZ 50'nin 1 sn'lik smoothstep harmanı her
  şut olayının başında jetonları klibin ilk karesine 6-9 m kaydırıyordu — 100 ms'de 2,6 m (22 m/sn sahne),
  40-48 kare; kullanıcının gördüğü "bir anda hızla yer değiştirme / ışınlanma" buydu. `isin-oyuncu` (tek kare
  30 px) bunu GÖREMEZ — sıçrama kare başına 11 px'tir; `scratchpad/burst.js` gibi 100 ms pencerede >8 m/sn
  epizot sayımı gerekir (43 → 9 epizot, tepe 22,5 → 12,6). Şimdi ofset en çok `KLIP_HARMAN_V` (130 px/sn,
  şutör 200) ile küçülür; kalan ofset ELDEN ÇIKIŞA kadar sabit hızla biter (`om/kalan`) — `(1-ww)` çarpımı
  kısa kliplerde (3-4 sn) sönümü 1,5 sn'ye yığıp yeni patlama üretti (ölçüldü, kaldırıldı). Top ofseti
  tutanın ofsetini izler (`KLIP_HARMAN_V_TOP`), klip seçim maliyetine 10 jetonun ortalama uzaklığı girer.
- **ÖLÜ TOPTA TOP HAKEME, HAKEM SOKUCUYA VERİR (FAZ 51, kullanıcı kararı):** faul · taç · ihlal · hücum
  faulü · 24 sn ve serbest atış arasında top topa EN YAKIN hakeme fırlatılır (`oamTopHakeme`: >30 px ise
  `_ballPass(ref)` — `ref.ghost=true`, pas bitince `_ballHold(ref)` hakemi tutucu yapar, tick topu eline
  alır), hakem sokma noktasının hizasına yürür (150 px/sn) ve sokucu çizgiye varınca (≤22 px, en çok 3 sn)
  pası verir. `_oluTopSokucuyaVer` ve `_ftTopVer` sarmalanır; sayı sonrası sokma (`_setupInbound`) hakemsiz
  kalır (gerçekte de oyuncu kendi alır). Kullanıcı "top hakeme ışınlanır" dedi ama ışınlama YAPILMADI —
  kısa fırlatma hem gerçekçi hem `iz-kaydet` ışınlanma kapısını korur (snap 883 m/sn ölçülmüştü).
  Yeni olay gelirse hakemdeki top bekleyen oyuncuya hemen paslanır (`movePlayersForEvent` sarmalayıcısı).
  `iz-kaydet` `hk` alanı ile hakemdeki topu "sahipsiz" saymaz; `cu` alanı `_simCatchUp` sayısını taşır.
- **TEK KARE HIZI 9 ms'LİK KAREDE YANILTIR (FAZ 51):** "held 47 m/sn" ışınlanması 0,42 m'lik adımın 9 ms'lik
  rAF karesine bölünmesiydi (sim alt adımı 33 ms) — kare süresine bakmadan tek kare hızını yargılama; 100 ms
  pencere ya da px adımı (isin-oyuncu 30 px) ölçütü kullan.

- **GÖRÜNÜR SEKMEDE `_bgPause`'a GİRİLMEZ (FAZ 51, kullanıcı "maça basınca hiçbir şey olmuyor, sadece
  ses geliyor"):** arka plan sekmesi duraklatması (bataryayı korumak için, FAZ 37/42-B) bir YUMURTA-TAVUK
  kilidine düşüyordu: arka planda rAF boğulunca match-engine yalnız `_simCatchUp` koşar, `_simStep` HİÇ
  çağrılmaz → sim saati durur; stepGuarded'ın çıkış koşulu "son 400 ms'de sahne saati ilerledi mi" ise sim
  durgunken ASLA sağlanmaz → sim ilerlemiyor çünkü bgPause, bgPause çıkmıyor çünkü sim ilerlemiyor. Kullanıcı
  maça basıp bakıyorken (crowd ambience = "ses" çalıyor) oyun idx=1'de donuyordu. Düzeltme: bgPause'a YALNIZ
  `document.hidden===true` iken girilir (stepGuarded giriş dalı + watchdog 2103), çıkışta görünür sekme sim
  ilerlemesini beklemeden hemen çıkar. Görünür sekmede bgPause yapısal olarak imkânsız → donma imkânsız.
  Kanıt (canlı takılı durum): `document.hidden` false override etmek eski kodu çıkarmadı; bgPause devre dışı +
  sim elle sürünce idx aktı. FAZ 42-B'nin "hidden güvenilmez, başka sekme öne alınca false kalıyor" kaygısı
  kabul edildi: o nadir durumda bgPause kurulmaz, olaylar akar, sahne `raw>1.2` dalındaki _simCatchUp ile
  yetişir (kullanıcı o sekmeye bakmıyor). "Duraklat, sonra yetiş" mekanizmasının ÇIKIŞI, girişini doğuran
  koşuldan (rAF boğukluğu) bağımsız olmalı; yoksa kilitlenir.

- **SAHNE rAF'A TEK BAĞLI OLAMAZ — rAF YEDEĞİ (FAZ 51, kullanıcı "maça basınca sadece ses"):** canlı sahne
  jetonları yalnız `requestAnimationFrame` ile hareket ediyordu; rAF boğulursa (arka plan sekmesi, bazı
  pencere durumlarında görünür sekmede bile ~1 fps, düşük performans) jetonlar HİÇ kıpırdamaz, olay kuyruğu
  setTimeout ile aktığı için "ses var (crowd ambience) + oyun donuk" görüntüsü çıkar. `_simStart` (match-engine)
  artık bir setInterval yedeği kurar (`_rafYedek`): son rAF karesinden 220 ms+ geçtiyse sim elle `_simStep` ile
  sürülür; rAF normalken (`_rafAt` her kare tazelenir) yedek boşta kalır, çift adım yok. `clearMatchPlayers`
  temizler. Bir sunum katmanını rAF'a TEK bağlama; zaman tabanlı yedek şart.
- **bgPause KAPALI (FAZ 51, `_BGPAUSE_ACIK=false` js/main.js):** arka plan sekmesi olay-kuyruğu duraklatması
  (FAZ 37/42-B) yumurta-tavuk kilidiyle defalarca donmaya yol açtı (rAF boğukken sim ilerlemez, çıkış sim
  ilerlemesini bekler). rAF yedeği arka planda da sahneyi olaylarla senkron sürdüğü için gereksiz kaldı ve
  kapatıldı — üç giriş noktası (`stepGuarded` else, watchdog, visibilitychange) bayrağa bağlı. Donma yapısal
  olarak imkânsız. Geri açmak gerekirse `_BGPAUSE_ACIK=true`.

- **ARENA MODÜLERDİR — TEK SEVİYE YOK (FAZ 52):** arena artık 10 ayrı modülden oluşur
  (`ARENA_MOD`, `js/roster-gen.js`): koltuk · loca · yiyecek · mağaza · LED · otopark ·
  dev ekran · konfor · gişe · güvenlik; her biri 1-5 seviye, arena gücü /50.
  **TAŞIYICI KURAL: SEVİYE 1 = BUGÜNKÜ DAVRANIŞ** — yeni modüllerin Sv1'i sıfır etki,
  sıfır bakım taşır ve koltuk Sv1 eski `ARENA_LVL[0]` ile birebir aynıdır. Bu kural,
  FAZ 25 USD ekonomi çapalarının (kasa $120.000 · maç geliri ≈$17.420 · haftalık denge
  ±$2.000 · bakım $3.000) ve `season-loop` dengesinin tek güvencesidir; yeni bir modül
  ya da kademe eklerken Sv1'i ASLA gelir/gider taşıyacak hâle getirme. Tek kaynaklar:
  `arenaModSv/arenaModVeri/arenaGucu/arenaHaftalikBakim/arenaSenkron/arenaGelirDokumu`
  (`js/economy.js`). `G.arena.s/kap/bk` artık TÜREVDİR — `arenaSenkron()` yazar, elle
  set etme. `homeTicketIncome()` bilet değil MAÇ GÜNÜ TOPLAMIDIR (dökümün toplamı).
  Bedel anında ödenir, seviye `G.arena.insaat` süresi dolunca açılır
  (`processArenaInsaat`, `processEconomyWeeks` başında); aynı anda tek inşaat.
  Kayıt sürümü **v11** (`migrateArenaV10ToV11`: eski `arena.s` → koltuk modülü, diğerleri
  Sv1; kapasite ve bakım birebir korunur). Değişince `node tools/arena-check.js`
  (F-J bölümleri) + `node tools/arena-denge.js` + `ekonomi-check` + `season-loop --runs=3`.
- **DEPLASMAN RENGİ EV RENGİNDEN TÜRER (FAZ 52, kullanıcı: "iki takım aynı renk"):**
  deplasman jetonu SABİT `#16a34a` idi; kurulum ekranında seçilebilen sekiz renk arasında
  yeşil (`#22c55e`) ve turkuaz (`#14b8a6`) vardı ve o rengi seçen oyuncu iki takımı ayırt
  edemiyordu. `_ziRenk(evRengi)` sekiz adaydan RGB küpünde EN UZAK olanı döndürür. Yeni
  bir takım rengi eklerken `_ZIT_ADAY` listesini de gözden geçir.
- **SERBEST ATIŞTA SEKTİRME YOK (FAZ 52, kullanıcı kararı):** `_ftSektir` artık topu
  doğrudan ele sabitler (fonksiyon silinmedi, çağıranları duruyor). `sunum-check` F25-4
  kapısı da niyetine göre yeniden yazıldı ("1-3 sekme" → "sektirme 0"). Geri EKLENMEMELİ.
- **SERBEST ATIŞ DİZİLİM KAPISI TEK KAYNAK VE F14-7'DEN SIKI OLMALI (FAZ 52):**
  `_ftYerlesti(offP,defP)` — 10 oyuncudan ≥9'u hedefinin **8,5 px** (0,29 m) içinde.
  F14-7 kapısı 0,30 m ölçtüğü için tolerans ondan GEVŞEK olamaz: eski 20 px'lik
  `_ftHazir` ile tören kısalınca (tavan 9,5 → 4,6 sn) atış oyuncular oturmadan patlıyordu
  (ölçüldü: yerinde 7,3/10, en uzak 1,46 m). Normal faul dalı ve `_and1Sequence` ikisi de
  buradan geçer. Koşu eşiği 110 → 55 px (hem `_setFtFormation` hem OAM tören dalı).
  Ölü topta geçen duvar saati: en kötü tören 12,0 → 7,6 sn.
- **ÖN SAHADAN ARKA SAHAYA PAS YOK (FAZ 52):** `oamArkaSaha()` (`oamPasOlur` içinde) ve
  `_pasHedefSinirla` aday süzgeci. Ölçüldü (`iz-kaydet --secs=400` + pozisyon başına
  orta çizgi analizi): 162 pasın 2'si (%1,2) ihlaldi ve ikisi de ölü top sonrası geçiş
  dalındaydı. Potadan uzaklaşan "geriye pas" AYRI bir olgudur (%1,4) ve çoğu meşrudur
  (hücum ribaundu sonrası açma, set çevirme) — ona kural koyma.
- **PERDE/DEVRİLME OAM'DA, AMA ŞUTLU POZİSYONLAR KLİPTEN OYNAR (FAZ 52 · FAZ 50 sonucu):**
  `sunum-check` F25-6a (post) ve F25-6b (perde) HEAD'de de **0 damga** verir — `S._perde`
  / `S._postup` yalnız OAM'ın şut dalında yazılır, o dal ise FAZ 50'den beri gerçek klip
  oynatıcıya devredilmiştir. Bu iki kapı bugün OAM'ın yalnız putback/klipsiz yollarını
  örnekler; "perde yok" sonucu bir gerileme DEĞİLDİR. FAZ 52'de perde şemasız set
  pozisyonlarının %40'ında da kurulur oldu, devrilme payı 0,60 → 0,82 ve **devrilene pas**
  eklendi (kararlar `_sr()` ile — maç sonucu ve `band.js` hash'i etkilenmez).

- **ARENA MODÜLLERİ TAKIMA DA DOKUNUR — AMA Sv1'DE DEĞİL (FAZ 52-B):** `soyunma`
  (moral · transferde ikna · istenen maaş), `saglik` (sakatlık süresi/riski) ve
  `taraftarOrg` (EV maçında rakip serbest atışı ↓, top kaybı ↑) eklendi; arena gücü
  tavanı /50 → **/65**. Üçü de Sv1'de SIFIR etkidir ve ek `Math.random` TÜKETMEZ —
  bu yüzden brifin öngördüğü `band.js`/`measure.js` hash yenilemesine gerek kalmadı
  (ikisi de FAZ 43 değerlerinde: **c19928475859c7ff** / **51fa02b6e0a8194b**).
  Yeni bir modül etkisi eklerken kural aynıdır: Sv1 = eski kodun birebir aynısı.
- **EV AVANTAJI CTX İLE GİRER, `G` İLE DEĞİL (FAZ 52-B):** maç motoru `G`'siz çalışır
  (sunucu sözleşmesi). `buildMatchCtx` `home.evAvantaj={ft,to}` alanını doldurur,
  `simulateMatch` onu `o.homeEvAvantaj`ten alır, motor içinde `_evAv/_evFt/_evTo`
  YALNIZ `userIsHome` iken uygulanır. Rakibin serbest atışı tek noktadan geçer
  (`ftMakeYan(shooter,isUser)`); ek top kaybı pres dalıyla toplanır (`_presTO`).
  Ölçülen kazanç Sv5'te **2,19 sayı/maç** (gerçek NBA ~2,5-3) — `arena-denge` sınar.
- **`season-loop` K2 KAPISI 3 KOŞUDA YANILTICIDIR (FAZ 52-B, ölçüldü):** seansın 1. ve
  2. sezonu deterministiktir, **3. sezon değildir** — bot transferi `Date.now()` ile
  tohumlanır, aynı kodda kasa 183.931 / 197.418 / 271.100 ve farklı şampiyon çıkar.
  `--runs=3` medyanı bu yüzden 1,14× ile 2,26× arasında salınır ve kapıyı davranış
  değişmeden düşürür. Ekonomi tarafını yargılarken **deterministik harness'a**
  (`ekonomi-check` D bölümü, 10 sezon, byte-birebir kıyaslanabilir) bak; `season-loop`
  için **en az `--runs=6`** kullan.
- **KİŞİ BAŞINA DÜŞEN ORAN `fmtPara` İLE GÖSTERİLMEZ (FAZ 52-B):** $0,20/taraftar ve
  $1,50/kişi ekranda "$0" ve "$2" olarak yuvarlanıp bilgi taşımıyordu. Yiyecek · mağaza ·
  otopark kartları artık MAÇ BAŞI TUTARI gösterir (`arenaGelirDokumu` çıktısından);
  ölçü etiketi de "Maç geliri"dir. Yeni bir oran gösterirken önce fmtPara'nın onu
  yuvarlayıp yuvarlamadığını kontrol et.

- **FUTBOL KLİŞESİ ANLATIMA GİREMEZ (FAZ 53, kullanıcı: "file hiç dalgalanmadı ne demek,
  nereden çıkıyor bu basketbol dışı gerzekçe anlatım"):** "file dalgalandı", "file ağladı /
  küstü / uykuda / boyun eğdi", "fileye davetiye", "adrese teslim" ve — SAYI için
  kullanılan — "temiz, file bile sallanmadı" (bu aslında hava atışını anlatır) havuzlardan
  çıkarıldı; `adım ihlali` → **`steps`**. Kalıcı kapı `tools/_lib/anlatim-kapilari.js`
  `KARA_LISTE`sindedir. TR havuzu (`match-engine.js`) ile EN sözlüğü
  (`i18n-commentary.js`) AYNI ANDA değişmeli — yalnız anahtarı değiştirmek eski
  İngilizceyi yeni cümleye yapıştırır (FAZ 29 dersi).
- **BALON METNİ TEK NOKTADAN TEMİZLENİR — `_balonTemiz` (FAZ 53):** anlatım beş ayrı
  parçadan birleşir (ön parça + sonuç + skor + yorum eki + saat damgası); biri boş dönünce
  "… bıraktı ." gibi boşluklu noktalama, çift boşluk ya da sonda asılı "—" kalıyordu.
  Havuzlara dokunmak yerine BİRLEŞMİŞ metin `js/main.js` içinde normalize edilir.
  ⚠ Üç nokta "…" tek karakterdir ama kaynakta 12 yerde ASCII "..." geçer — kural onu
  bozmamalı (bu yüzden "aynı noktalama tekrarı" kuralı yerine `[,;:]` + `[.!?]` çifti
  hedeflenir). Kapı: `tools/balon-check.js`.
- **KLİP EŞLEMESİNDE KÖR TAKAS YAPMA (FAZ 53 — "4 numara neden top sürüyor"nun kök nedeni):**
  klip slotları sınıfa göre sıralıdır (`KLIP_SINIF` = G,G,F,F,C). Eski kod motorun şutörünü
  klibin şutör slotuna kör takasla koyuyordu; şutör PG ve klibin şutörü 4. slot ise takas
  sonucu **klibin topu getiren guard slotuna bizim PF'imiz** düşüyordu. Ölçüldü (400 sn iz
  kaydı): topu SÜREN karelerin %49'u PF, yalnız %7,5'i PG. Doğru eşleme iki noktayı birden
  çiviler — klibin ŞUTÖR slotu → motorun şutörü, klibin ASIL TAŞIYICI slotu (elden çıkışa
  kadarki karelerde topa en yakın hücumcunun en çok olduğu slot) → gerçek taşıyıcımız,
  yoksa bir guard; kalan slotlar rol sırasını koruyarak dolar. Sonuç: süren PG %45,1 ·
  PF %24,2 · orta çizgiyi topla geçen guard payı %60 → %80.
- **TAKTİK KLİBİ EĞEREK DEĞİL SEÇEREK YANSITILIR (FAZ 53):** klibin içindeki savunma kaydın
  kendisidir; "adam adamaya çevir" diye bükülürse yine elle yazılmış koreografiye dönülür
  (kullanıcı FAZ 50'de tam olarak onu reddetti). 696 klibin savunma imzası bir kez ölçülür
  (`klipImza`: savunmanın potaya uzaklığı · ikili yayılım · topa en yakın savunmacı · perde
  izi · asıl taşıyıcı slotu) ve sahadaki savunmaya BENZEYEN klip seçilir. Savunan taraf bot
  ise **botun koç profili** okunur (`klipSavunmaStili`). **Seçim İKİ AŞAMALIDIR:** önce
  geometriyle 24'lük kısa liste, sonra o listenin içinden taktiğe en çok benzeyen altısı.
  İki sürüm ölçülerek elendi — taktik maliyetini geometri maliyetine EKLEMEK ilk altıyı hiç
  değiştirmedi, havuzun yüzdelik dilimini HEDEF almak ise seçimi TERS yöne itti (kısa liste
  zaten hedefin ötesindeydi). Kapı: `node tools/taktik-klip-check.js`.
  ⚠ Klip oynatıcıda ANLIK tepki YOKTUR: "screen sonrası adam değiştirme", "screen'in
  tutması/tutmaması", "boş kalınca hemen şut" klibin içinde ne varsa odur. Bunlara ancak
  klip kütüphanesine o olayların etiketi çıkarılıp seçim daraltılarak yaklaşılır.
- **SERBEST ATIŞTA HAKEM DİZİLİMİ BEKLER (FAZ 53, kullanıcı: "herkes faule yerleşmeden
  hakem topu oyuncuya atmasın"):** `oamHakemTick` içinde serbest atış dalında `hazir`
  KOŞULSUZ `true` idi. Artık `_ftYerlesti(offP,defP)` — 10 oyuncudan ≥9'u hedefinin 8,5 px
  içinde **VE onuncusu da en fazla 60 px (2 m)** — aranır. "9'u yerinde" tek başına yetmez:
  onuncu 5,78 m uzakta kalıp ekranda tek başına koşarken atış yapılıyordu (F14-7 8,6/10 →
  9,1/10). Kilitlenme riski yok, iki çağıranın da zaman aşımı var (hakem 3,4 sn · atış 3,0 sn).
- **`sahne-check` "SAHİPSİZ TOP" ÖLÇÜTÜ HAKEMİ SAYMAZ (FAZ 53):** FAZ 51'den beri ölü topta
  topu hakem taşır; hakem `S.players` listesinde olmadığı için "en yakın oyuncu 5,7 m"
  çıkıyor ve DOĞRU davranış kusur sayılıyordu (%1,02 → %2,12). Kapı artık `S._hakemTop`
  bayrağını okur — `iz-kaydet` bu ayrımı `hk` alanıyla zaten yapıyordu.
- **RİBAUND/ÇALMA SONRASI ÖLÜ ZAMAN SEKME MESAFESİNDEN GELİR (FAZ 53):** sekme hızı
  85-150 px/sn iken top 3-5 m uzağa gidiyor ve oyun 2-2,8 sn duruyordu (22 canlı serbest top
  epizodu ölçüldü). Sekme 58-104 px/sn; çalınan top 110 → 62 px/sn (üç ayrı epizot birebir
  2,17 sn sürüyordu — elden alınan top kısa sıçrar). `sahne-check` sahipsiz kare %1,02 → %0,07.

- **TOP DURUM MAKİNESİ SÖZLEŞMESİ (FAZ 54 A):** `'pass'` ve `'shot'` YALNIZ `'held'`den
  başlar. Ölçüldü (canlı site, 24.921 kare): `loose>held` **0** · `loose>pass` 13 ·
  `shot>pass` 1 · şutların 14/26'sı `pass>shot` — yani potadan seken top hiçbir zaman bir
  oyuncunun eline geçmiyor, sahipsiz toptan doğrudan pas başlıyor, şut havadayken pasa
  dönüşüyordu (kullanıcının gördüğü "top ribaunt alan olmadan birine ışınlandı" tam olarak
  budur). Sahipsiz toptan pas isteyen çağıran topu önce ALDIRIR (`_pasKorumasi`): 0,9 m
  içindeki oyuncu hemen tutar (`_ballTut` — mesafe kontrolü YAPMAZ, `_ballHold`'un d>14
  dalı pas üretip döngüye sokardı), yoksa en yakın oyuncu koşar. Pas/şut topu tutandan
  **`_TOP_TUT_SN` (0,10 sn)** sonra çıkar; kuyruk `b._pasBekle` / `b._sutBekle`, 'held' dalı
  işletir, 2,5 sn'de bayatlar. Yeni bir top yolu yazarken bu kapılardan geçir.
- **ÖLÜ TOP MODU `dead` (FAZ 54 A4):** çizgiyi geçen top o karede `dead` olur, çizginin en
  yakın noktasına sabitlenir, hiçbir fizik uygulanmaz; sokma töreni ya da 0,9 m'ye gelen
  oyuncu topu 'held'e alır. Ayrıca elde tutulan top ve pas hedefi saha içine KIRPILIR —
  çizgi dışındaki sokucu/hakem topu çizginin üstünde tutar. Ölçüldü: saha dışı karelerin
  %90'ı `held` idi ve bir top x=883,9'da **7,98 sn** durdu (%5,79 → %0,00).
- **KLİP ARA DEĞERİ HIZI SIÇRATIYORDU (FAZ 54 B1):** klip verisi 5 kare/sn'dir; doğrusal ara
  değer her 0,2 sn'lik düğümde hızı sıçratıyor ve 60 fps'de ivme 26-47 m/sn² çıkıyordu
  (insan tepesi 6-8). `klipKare` artık **1-2-1 düğüm yumuşatma + Catmull-Rom** kullanır,
  ofset kapanışı ivme rampasıyla (`KLIP_IVME`) artıp varışta fren mesafesiyle söner.
  ⚠ İvme sınırını jetonun TOPLAM hareketine koymak denendi ve geri alındı: ofsetin
  `om/kalan` kapanışıyla birleşince hız patlıyor (ort 2,45 → 2,71 · >7,5 bandı %1,3 → 2,6).
  Kalan borç: p99 11,0 ↔ gerçek 7,0.
- **`KLIP_HIZ`=1,0 — KLİP GERÇEK ZAMANDA AKAR (FAZ 54 B2):** 1,2 iken duvar ölçeğinde
  ortalama oyuncu hızı 2,38-2,77 m/sn ↔ gerçek 1,72-1,90 idi. `_V_TIER` de ×0,78 ile aynı
  ölçeğe indi (sprint 8,2 m/sn duvar). Maç ~%15 daha uzun izlenir; izleme hızı düğmesi durur.
- **⚠ BRİFİN HEDEFİ GERÇEK VERİYLE ÇELİŞEBİLİR — ÖNCE ÖLÇ (FAZ 54, FAZ 39 dersinin beşinci
  tekrarı):** FAZ 54 brifinin 17 hedefinden **altısı** ölçülmemiş tahmindi. Aynı ölçütler
  696 gerçek SportVU klibine (45.322 kare) uygulandığında: üst üste binme (<70 cm) hedef
  <%6 / gerçek **%37,7** · savunmadan >4 m hedef <%10 / gerçek **%15,6** · 0-1 m/sn bandı
  hedef %38-45 / bu havuzda **%32,0** · donuk oyuncu hedef <%8 / gerçek **%18,8** · sahipsiz
  top hedef <%2 ve hiçbiri >0,8 sn / gerçek pay **%23,8**, p90 **1,60 sn**, max 5,2 ·
  boyada max hedef 3,0 sn / gerçek p99 **7,4** max **12,8** (>3 sn payı %22,2). Kapılar
  gerçek tabana çekildi ve `tools/sahne-olcum.js` her satırda gerçek değeri de basar.
  Üç saniye kapısı yalnız ESKİ FİZİK karelerine bakar — klip gerçek kayıttır, eğilmez.
- **ÜÇ SANİYE KURTARIŞI İKİ YERDE BİRDEN GEREKİR (FAZ 54 C1):** boyada 1,9 sn'yi dolduran
  TOPSUZ hücumcunun hedefi kulvar dışına kaydırılır — hem eski fizik döngüsünde hem
  `oamHedef` içinde, çünkü OAM her karede kendi hedefini yazıp kurtarışı eziyordu (ölçüldü:
  yalnız eski fiziğe konunca max kalış 8,3 → 4,2 sn'de takıldı, OAM kapısıyla 4,1).
- **ÜÇLÜK YARIÇAPI AÇIYA BAĞLIDIR (FAZ 54 C2):** eski bant açıdan bağımsız 6,9-8,0 m idi ve
  ölçülen 8 üçlüğün hepsi 7,0-7,4 m'den geliyordu — oyuncular bir çemberin üstüne dizilmiş
  görünüyordu. Yeni dağılım köşe 6,75-7,10 · kanat 7,0-7,8 · tepe 7,2-8,3 · %5 derin.
  `rand` çağrı SAYISI ve SIRASI değişmedi (isabet zaten önce kararlaştırılır) — skor korunur.
- **`sahne-olcum` İLE `sahne-check` ÇELİŞİRSE GERÇEK VERİ KAZANIR (FAZ 54):** `sahne-check`
  "aynı anda koşan 3-5/10" ister ve 2,29 ile düşer; `hareket-bant-check` aynı büyüklüğü
  GERÇEK veriyle kıyaslar ve **3,49 ↔ 3,337 · L1 0,202 ✓** der. İlkinin eşiği elle yazılmış,
  ikincisininki ölçülmüştür.
- **DİZİLİM BENZERLİĞİ AĞIRLAŞTIRILAMAZ (FAZ 54, FAZ 51 uyarısı doğrulandı):** klip seçim
  maliyetinde dizilim bölenini 220 → 120 yapmak başlangıç ofsetini küçültüyor ama yayılımı
  daraltıyor (yayılım y L1 0,310 → **0,415**, eşik 0,35). 170 dengede kalıyor.
  Aynı turda `_PL_R_TAKIM` 62 → 48 denendi: üst üste binmeyi İYİLEŞTİRMEDİ (%27,6 → %23,9,
  ters yön) ve yayılımı bozdu — 58'de bırakıldı.

- **ÖLÇÜM ARACININ YUVARLAMASI KENDİ KUSURUNU ÜRETİR (FAZ 55, bu turun en pahalı bulgusu):**
  `sahne-olcum.js` jeton konumlarını `toFixed(1)` (0,1 px) ile saklıyordu ve "kare-kare ivme
  >8 m/sn² payı %45,7" diyordu. Kanıt: GERÇEK SportVU yörüngesi aynı 60 fps matematiğiyle ham
  float örneklenince >8 payı **%0,37**, aynı veri 0,1 px'e yuvarlanınca **%45,30** — sahnedeki
  değerle birebir. dt=16,7 ms'de 0,1 px'lik yuvarlama 0,2 m/sn sahte hız, yani ~12 m/sn² sahte
  ivme üretir. Kare-kare türev alan her ölçüm aracında konum tam hassasiyetle saklanmalı; bir
  "aşırı ivme" bulgusunda önce aracın kendi çözünürlüğünü hesapla.
- **KLİP JETONUNU YÖRÜNGEDEN GECİKTİREN HER YAPI HIZI ARTIRIR (FAZ 55, üçüncü kez ölçülerek
  elendi):** klip kaydı ARA DEĞERLİ bir yörüngedir; jetonu ondan sapan her kural (ivme sınırı —
  FAZ 54 ve 55; konum düşük-geçiren filtre — FAZ 55) sapmayı kapatırken kaydın kendisinden hızlı
  hareket etmek zorunda kalır. Ölçülen: ivme sınırı → klip hızı 2,24 → 3,07 m/sn · >7,5 bandı
  %0,1 → %3,4 · oyuncu saha dışı %0,00 → %0,60 (`_inX/_inY` kırpması bypass edildiği için);
  düşük-geçiren filtre → kare-kare tepe 845 → 1297 · >8 %3,67 → %3,92 · ort hız 1,97 → 2,06.
  Doğru yapı: hız TAVANI (`KLIP_VMAX`) + kırpılan farkı ofsete geri yazmak, ofseti de ivme
  tavanıyla (`KLIP_FREN`) SÖNDÜRMEK — ofset rampasını ani sıfırlamak tek karede 2,5 m/sn kayıp
  (~150 m/sn²) demektir.
- **`held` ⇒ TAŞIYICI GEÇERLİ BİR OYUNCU OLMALI — HAKEM İSTİSNASI SESSİZ REGRESYON ÜRETTİ
  (FAZ 55 B1):** FAZ 51'de top ölü topta hakeme veriliyor; hakemdeki topu bekleyen oyuncuya
  aktaran dal `!S.ball.carrier` şartını arıyordu, oysa taşıyıcı HAKEMİN KENDİSİ olduğu için şart
  hiç tutmadı ve top maçta toplam 10,3 sn (en uzunu 5,88 sn) `held` modunda "hayalet" olarak
  kaldı. Şart "taşıyıcı bir OYUNCU değilse" oldu; ayrıca `_ballStep` başında yapısal ağ var
  (taşıyıcı `S.players` dışındaysa top `dead` olur ve en yakın oyuncu alır). Bir varlığı oyuncu
  dizisine SOKMADAN taşıyıcı yapan her mekanizma, o dizinin varlığını sınayan bütün şartları
  gözden geçirmeyi gerektirir.
- **ÜST ÜSTE BİNMEDE MUTLAK TABAN İSTİSNASIZDIR, ORTALAMA DEĞİL (FAZ 55 C4):** "<%6 üst üste
  binme" hedefi brifin kendisi tarafından geri çekildi (gerçek kliplerde %37,7 — FAZ 54 ölçümü);
  kusur ORTALAMADA değil UÇ DEĞERLERDEDİR. `_PL_R_TABAN = 16 px (0,55 m)` klip jetonları dahil
  hiçbir çift için delinemez ve hiçbir `_R` kırpması altına inemez; taban ihlalinde ayrışma tek
  karede tamamlanır, üstünde itme yumuşaktır (sert itme kare-kare sahte ivme üretiyordu).
  Ölçülen: <40 cm %10,46 → %0,02, <70 cm %30,5 (gerçek bandın içinde).

- **BEŞ FAZDIR ARANAN "IŞINLANMA"NIN KÖK NEDENİ VERİNİN KARE HIZIYDI (FAZ 56):** klip kütüphanesi
  kaynağın (SportVU, 25 kare/sn) **beşte biri** olan 5 kare/sn ile taşınıyordu; düğümler arası
  200 ms vardı ve o boşlukta bir oyuncu 1,5-2 m yol alır. Aradaki 11 kareyi hangi eğri uydurursa
  uydursun, ivme düğümlerde sıçrar. FAZ 40/48/49/54/55'te denenen ALTI ayrı düzeltme (doğrusal ara
  değer, Catmull-Rom, 1-2-1 düğüm yumuşatma, konum düşük-geçiren filtre, hız kırpma `KLIP_VMAX`,
  ivme rampası `KLIP_IVME`) hep aynı duvara çarptı: **kaynak veride o bilgi yoktu.** Veri 25 kare/sn
  ile yeniden çıkarıldı (40 ms; ara değerin uydurduğu mesafe 1,5-2 m → 25-33 cm). Bir kusuru
  düzeltmek için kodu altı kez değiştirdiysen, sorunun VERİDE olup olmadığını sor.
- **NİCEMLEME KARE HIZIYLA BİRLİKTE SIKILAŞMALI (FAZ 56, FAZ 55 dersinin veri tarafı):** klipler
  0,1 ft'e (3 cm) yuvarlanıyordu. 200 ms'de bu görünmez; 40 ms'de **0,76 m/sn'lik sahte hız farkı,
  yani ~19 m/sn²'lik sahte ivme** demektir — ölçüldü: 25 kare/sn'ye çıkınca kaynağın kendi >8 payı
  %52,5 çıktı, 0,01 ft'e inince %8,9. Ham SportVU float'tır; nicemleme bizim seçimimizdi ve delta
  kodlamada 0,01 ft bedavadır. FAZ 55'te ÖLÇÜM ARACININ yuvarlaması kusur üretmişti; burada
  VERİNİN yuvarlaması. Kare-kare türev alınan her yerde çözünürlüğü kare süresiyle birlikte düşün.
- **KAYNAĞI SÜZMEK ≠ JETONU SÜZMEK (FAZ 56, FAZ 54/55'te elenen denemelerin doğru biçimi):** optik
  izlemenin kendi gürültüsü 25 kare/sn'de ivmeye dönüşür. Süzgeç ÇIKARMA ANINDA ve SİMETRİK
  (1-2-1, faz kaydırmaz) uygulanır — düzeltilen şey YÖRÜNGENİN KENDİSİDİR, jeton onu birebir izler.
  FAZ 54/55'te elenen denemelerde jeton yörüngeden GECİKTİRİLİYORDU ve gecikme sonraki karede
  kapanmak zorunda kalıp hızı patlatıyordu. Ölçülen: kare-kare ivme tepe 597 → 24 m/sn², >8 payı
  %9,65 → %0,25, yörünge sapması ortalama **0,6 cm**.
- **KÜBİK ARA DEĞERİN UÇ DÜĞÜMÜ KELEPÇELENMEZ (FAZ 56, ölçülerek bulundu):** Catmull-Rom'da
  `i0=Math.max(0,i1-1)` yazmak klibin ilk karesinde p0=p1 yapar ve eğriye yapay bir teğet verir.
  Ölçüldü: 60 m/sn²'yi aşan olayların **401'inin 401'i** klibin ilk %3'ündeydi; uç düğümü komşudan
  DIŞARIYA uzatınca (p0 = 2·A[0] − A[1]) tepe 142 → 24'e indi. Doğrusal ara değer bu tuzağa
  düşmez ama düğüm sınırlarında darbe ivmesi üretir (>8 %1,66 ↔ CR %0,25) — 25 kare/sn'de doğru
  seçim uçları düzeltilmiş Catmull-Rom'dur.
- **HARMAN OFSETİNİN KAPANIŞI DA BİR HAREKETTİR — DOYUMLU HIZ YASASI (FAZ 56):** klip verisi
  temizlendikten sonra jeton başına ayrıştırılan ölçüm şunu gösterdi: SAF KLİP konumu %0,48,
  ÇİZİLEN konum %1,99, harman OFSETİ %2,70 (>8 payı). Yani kalan ivme kayıttan değil ofsetin
  kapanışından geliyordu. Eski yasa üç yerde kırılgandı: ivme rampası, √(2·fren·om) freni
  (9 m/sn²) ve `om ≤ adım` olunca ofsetin SIFIRLANIP kapanış hızının tek karede kaybolması
  (75 px/sn ≈ 150 m/sn²). Yeni yasa hızı uzaklığın düzgün fonksiyonu yapar: **v = V·(1−e^(−om/L))**
  — sıfıra yaklaşırken kendiliğinden söner, ivme tavanı V²/L ≈ 0,7 m/sn², durum değişkeni yok.
  Ölçülen: ofsetin >8 payı %2,70 → **%0,01**. Bir "yaklaştırma/harman" yazarken hızın uzaklığa
  göre TÜREVİNİ sınırla; eşik/kırpma ile kapatma.
- **GERÇEK OYUNCULAR İÇ İÇE GEÇER — FAZ 55 C4'ÜN DÜZELTMESİ (FAZ 56, ölçülerek):** 320 gerçek
  SportVU klibinin 81.942 karesinde en yakın çift **%10,41 oranında 40 cm'den, %20,71 oranında
  55 cm'den** yakın ve 40 cm altında **7,7 saniyelik kesintisiz** bir bölüm var. FAZ 55'te
  koyduğum "hiçbir iki jeton 55 cm'ye giremez" mutlak tabanı bu yüzden yanlıştı (brifin FAZ 55'te
  kendi geri çektiği "<%6 üst üste binme" hedefiyle aynı hata) ve bedeli ağırdı: itme klip
  jetonunu tek karede **21,8 px** kaydırıyor (≈25 m/sn) ve kare-kare ivmenin son kaynağı oluyordu.
  Taban artık YALNIZ kendi koreografimize uygulanır (17 px) ve ayrışma HIZ SINIRLIDIR
  (`_AYIR_MAX`); klip çiftinde kayıttaki mesafeler aynen korunur. Kapı da gerçek paya bağlandı.
- **SOKMADA OYUNCULAR ÇAĞRILMAZ, KULVARINDA TUTULUR (FAZ 56 · 4b):** "en az 3 arkadaş 6 m içinde"
  kapısı FAZ 54'te yazılmıştı ama yalnız BEKLİYORDU; kimse yaklaşmadığı için her sokma 3,5 sn
  zaman aşımıyla açılıyordu. Üç arkadaşı sokucunun 4,5 m'sine ÇAĞIRMAK denendi ve ölçülerek
  elendi: uzunlar dip çizgiye iniyor, geçiş kulvarları boşalıyor ve topu orta sahaya taşıyan
  pivot 0/19 → 13/47'ye fırlıyordu (FAZ 47'de kullanıcının şikâyet ettiği kusurun geri dönüşü).
  Doğrusu tutmaktır: hedef, oyuncunun KENDİ yönünde sokucudan 5,7 m'ye kırpılır — kulvar ve rol
  korunur, yalnız uzaklaşma sınırlanır.

- **İVME TAVANI YALNIZ JETONUN KENDİ HIZINA UYGULANIR — ONA UYGULANAN DÜZELTMELER MUAFTIR
  (FAZ 57 A1, bu turun en pahalı bulgusu):** klip↔fizik devir anının ±0,5 sn'sinde kare-kare
  ivmenin >8 m/sn² payı %6,22, diğer her yerde %2,81 idi. Brif tek satırı gösteriyordu
  (`klipBitir` on jetonun hızını sıfırlıyor — doğruydu, düzeltildi: klibin son hızı fiziğe
  devredilir, hedef jetonun ÜSTÜNE değil hız yönünde 0,6 sn ileriye konur, devir sonrası
  0,4 sn ivme tavanı ×0,7 · `p._devirT`), ama ölçüm devir anını fizik tarafında hem ÖNCE
  hem SONRA bozuk gösterdi. Asıl kaynak **çarpışma itmesiydi**: >8 olaylarının %62'sinde
  40 px'ten yakın bir komşu var (taban pay %18,9). İtme örtüşme 1,8 px'e varır varmaz tavana
  oturuyor ve 0,9 px/kare = 1,82 m/sn'lik ANLIK konum kayması demek — örtüşmenin başında ve
  sonunda iki ivme sıçraması. `_ivmeSinirla`nın bunlara hükmü YOKTUR. İtme artık bir ayrışma
  HIZIDIR (`p._pvx/_pvy`, `_PUSH_ACC` 4,1 m/sn² · taban ihlalinde `_PUSH_ACC_TABAN`).
  Ölçülen: sınır %6,22 → %2,74 · fizik jetonu p99 34,2 → 9,0 · >8 %3,49 → %1,42 ·
  `oyuncu ivmesi p99` 9,0 → 7,8 (kapı geçti) · üç saniye max 4,6 → 3,7.
  **Bir jetonun konumuna doğrudan yazan her yapı (çarpışma, kırpma, dizilim ataması) ivme
  ölçümünde görünür ama ivme tavanından geçmez; birini eklerken hız cinsinden yaz.**
- **JETON ÇAKIŞMASI ÇİZİM SORUNUDUR — `p.x/p.y`YE DOKUNMA (FAZ 57 A2):** karelerin ~%47'sinde
  iki jetonun merkezi 26 px'ten yakın. Bu bir simülasyon kusuru DEĞİLDİR: gerçek SportVU
  kaydında en yakın çift karelerin %10,41'inde 40 cm'nin, %20,71'inde 55 cm'nin altındadır
  (FAZ 56 ölçümü) ve motor %11,9 / %21,6 ile o bandın içindedir. Kusur jeton yarıçapının
  16 px (çap 1,08 m) olmasıdır; gerçek omuz genişliği ~0,5 m. `_cizAyristir` yalnız ÇİZİM
  noktasını kaydırır (`p._cizDx/_cizDy`, en çok 9 px, kare başına 2 px, 6 gevşetme geçişi),
  artı 1,5 px açık halka. Ölçülen: çizimde <26 px pay %46,7 → %10,6, **simülasyon payı ve
  bütün hız/ivme/yayılım satırları değişmedi** — doğru katmana dokunulduğunun kanıtı budur.
  ⚠ `match-engine.js`teki `if(a._klip||b._klip) continue;` satırına DOKUNMA (FAZ 50/56).
- **GEVŞETME HEDEFİ ÖLÇÜM EŞİĞİNİN ÜSTÜNDE OLMALI (FAZ 57 A2, ölçülerek bulundu):** çizim
  çözücüsü tam 26 px'i hedeflediğinde çift o değerin ±ε'unda kapanıyor ve karelerin yarısı
  hâlâ 26 px'in ALTINDA ölçülüyordu (kayıttan yeniden çözümleme: %34,9). Hedef 29 px olunca
  %11,9. **Sınırsız kayma ve 30 gevşetme geçişiyle bile eski hedefle %30'un altına
  inilemiyordu** — kusur kapasite değil çözünürlüktü. Ayrıca tek geçişlik itme üçlü kümelerde
  yetmez (22-26 px'lik çiftlerin ancak %53'ü ayrılıyordu) ve mesafe her geçişte ÇİZİLEN
  noktadan ölçülmeli.
- **DOYUMLU KAPANIŞ YASASI BİR HARMAN YASASIDIR — TOPA KOŞAN JETONA UYGULANAMAZ (FAZ 57 · 3a):**
  FAZ 56'nın `v = V·(1-e^(-om/L))` yasası klip başlangıcındaki BEKLEME dalına da uygulanıyordu;
  2 m'lik ofsette hız 175 → **16 px/sn**'ye düşüyor, klibin kendi hareketi jetonu geri götürüyor
  ve **top 2,6 saniye kıpırdamadan** yerde duruyordu (sahipsiz top en uzun epizodu 6,60 sn).
  Bekleme dalı (`K.bekle`) doyumlu yasadan MUAF, kapanış sabit hızlı (`KLIP_BEKLE_V`).
- **TOPU ALMA YOLU YALNIZ TAKİP DALINDADIR — TAKİP YOKSA TOP KİMSENİN İŞİ DEĞİLDİR
  (FAZ 57 · 3a):** ölçüldü (113,9 sn'lik kaçan şut): top yerde duruyor, bir oyuncu 0,03-0,9 m
  ötesinde 2 saniye bekliyor ve hiçbir kod onu almıyor; 2 m'lik bekçi kapısı (`_SAHIPSIZ_PX`)
  da oyuncu YAKIN olduğu için hiç açılmıyor. Sayaç MESAFEYE değil topun sahipsiz geçirdiği
  SÜREye bağlanır (1,2 sn) ve takip yoksa `_ballKurtar` devreye girer. Takipçi de artık topun
  anlık konumuna değil **tahmini duruş noktasına** koşar (`_topDurus`).
  ⚠ Brifin "en yakın İKİ oyuncu koşturulsun" önerisi denendi ve ölçülerek elendi: ikinci
  oyuncu topu ALAMAZ (alma hakkı anlatımdaki ribauntçunundur) ve topun 3 cm'sinde 1,3 sn
  dikiliyordu; 1 m geride durdurmak da sahipsiz payı %5,5 → %7,1 yaptı.
- **`rim`/`shot` MODUNDAN ÇIKIŞ YALNIZ `loose`A — ÜÇ YOL BİRDEN KAPATILIR (FAZ 57 · 3b):**
  `_ballTut` bu iki modda topu önce serbest bırakır ve almayı bir sonraki kareye kuyruğa alır
  (`b._tutBekle`, `'loose'` dalı işletir). Aynı sözleşmeye alınan diğer iki yol: sayı sonrası
  sokucunun topu doğrudan `held` yapması (`_inboundPass`) ve klip oynatıcının tutma dalı.
  FAZ 54'te kapatılan `loose>pass` hatasının kardeşidir; `rim>held` 2 → 0.

- **RAKİBE PAS DİYE BİR ŞEY YOKTUR — KAPI `_ballPass` BAŞINDADIR (FAZ 58 A, kullanıcı:
  "rakip takıma pas atıyor oyuncular"):** kusur tek bir yerden değil DÖRT ayrı yoldan
  geliyordu ve ortak kök, hiçbir dalın pasın İKİ UCUNUN AYNI TAKIMDA olduğunu
  sınamamasıydı: (a) `_oluTopSokucuyaVer` → `_ballHold(inb,true)` → hedef 14 px'ten
  uzaksa sessizce `_ballPass` (düdükte sokucu KAZANAN takımdan ve 3-8 m ötede);
  (b) `_pasKorumasi` sahipsiz toptan pas isterken topu EN YAKIN oyuncuya veriyordu, o da
  rakip olabiliyordu; (c) `_inboundPass`in "top sokucuya uçar" dalı; (d) `sahne-klip.js`
  klip başlangıcı — önceki pozisyonun sokucusu topu hâlâ tutarken yeni klip başlıyor,
  dal mod'u `'pass'` yapıp hedefi KLİBİN hücumundaki en yakın oyuncu seçiyordu. Kapı tek
  noktada: `_ballPass` başında taşıyıcı ile hedefin takımı farklıysa pas ÜRETİLMEZ, top
  elden ele geçer ('held' dalı `_TOP_YAKLAS` ile kaydırır). Çalma bu kapıdan GEÇMEZ
  (`_hirsizAl` `_ballLoose`+`_chase` kullanır), hakem/ghost hedeflerin `team` alanı yoktur.
  Ölü topta top artık `'dead'` olur, sokma noktasına konur ve sokucu ona KOŞAR — `_ballTut`
  mesafe sınamaz, pasa düşmez. Kapı: `node tools/faz58-check.js olcum/iz-<etiket>.json`.
- **HAKEM ARACILI EL DEĞİŞİMİ PAS DEĞİLDİR (FAZ 58, ölçüm aracı tuzağı):** FAZ 51'den beri
  düdükte top hakeme atılır, hakem sokucuya verir. Hakem `S.players` içinde OLMADIĞI için
  arada "taşıyıcısı olmayan `'held'` karesi" görünür; pas sayacı bunu tek pas sanıp
  "a/SF → h/PF" gibi SAHTE bir rakibe-pas üretir. Aynı biçimde hava atışı tap'i de meşru
  olarak rakibe düşebilir. Pas ölçen her araç bu iki durumu ayıklamalı.
- **`_oob` (ÇİZGİ DIŞI İZNİ) ÖMÜRLÜDÜR VE TEKTİR (FAZ 58 B):** `_oobKapat` 12 ayrı yerden
  çağrılıyor ve bazı yollar (klip başlangıcı, faul dalı, şut sonrası koreografi) atlıyordu;
  ölçüldü (620 sn): oyuncu 8,1 sn'ye kadar çizginin dışında duruyor, 16 olayın yarısı pivot.
  ⚠ Brifin "izinsiz dışarı" teşhisi YANLIŞTI — izinsiz pay v101'de de %0,00'dı; kusur iznin
  SIZMASIYDI. İzin artık `_oobVer` ile damgalanır ve `_oobBakim` her karede bakar: görev
  sürerken (bekleyen sokma · hakem töreni · aktif takip · elde ölü top) tazelenir, görev
  bitince 0,8 sn, mutlak 6,0 sn'de düşer; ayrıca aynı anda TEK oyuncuda olabilir. Yeni bir
  sokma yolu yazarken `p._oob=true` YAZMA, `_oobVer(p)` çağır.
- **KLİP YOLUNDA SAHA KIRPMASI KADEMELİDİR — ÖLÇÜT "KIRPMA ETKİN", "OYUNCU DIŞARIDA" DEĞİL
  (FAZ 58 C):** çizgi dışında duran jeton için klip başlayınca `_inX/_inY` onu TEK KAREDE
  içeri çekiyordu (tam 40 px = 1,35 m, altı olayın altısı birebir). Fizik yolunda bu sınır
  FAZ 40 §A2'den beri var, klip yolunda yoktu. İki ince nokta ölçülerek bulundu: (1) `_inX`
  jetonu çizgiden **14 px içeride** tutar, dolayısıyla çizgi ile çizgi+14 px arasındaki
  jeton hâlâ kırpılıyor ama "dışarıda" değildir — ilk sürüm bu aralığı kaçırdı ve sıçrama
  1,35 → 0,47 m'ye indi ama bitmedi; (2) **kırpılan fark harman ofsetine geri yazılmalı**
  (FAZ 55/56 dersi), yoksa jeton çizgiyi geçtiği karede birikmiş farkı tek adımda kapatır.
  ⚠ Bu, FAZ 56'da doğru olarak kaldırılan `KLIP_VMAX` DEĞİLDİR: orası klip yörüngesinin
  KENDİSİNİ kırpıyordu; buradaki sınır yalnız kırpmanın etkin olduğu karelere uygulanır ve
  hız/ivme/yayılım satırlarını değiştirmez.
- **SAHİPSİZ TOP ÖLÇÜSÜ ÜÇ AYRI ŞEYİ KARIŞTIRIR (FAZ 58 D):** "taşıyıcısı olmayan kare"
  sayacı, çemberden/fileden İNEN topu (h > 8 px — `_topAlinabilir` gereği henüz alınamaz)
  ve ölü top törenini (hakem · serbest atış) de sayar. Kusur olan yalnız CANLI (`'loose'`)
  topun yerde durup kimsenin almamasıdır; `'dead'` modu FAZ 54 A4 sözleşmesinde "düdük
  çaldı, top oyun dışı" demektir ve ayrı raporlanır. Ölçüldü: ham 10,2% / en uzun 2,67 sn,
  canlı yerde en uzun 1,88 sn — gerçek SportVU tabanı sahipsiz pay %23,8 · p90 1,60 sn ·
  maks 5,2 sn, yani motor gerçeğin İÇİNDE. Kilitlenme kapısı 1,2 → 0,9 sn; yalnız
  `!S.chase` iken çalışır, anlatımdaki ribauntçudan top ÇALMAZ (FAZ 57 gerekçesi korundu).
- **DOĞRUDAN KONUM ATAYAN HER YOL HIZ TAVANININ DIŞINDADIR (FAZ 58 E, FAZ 57 A1'in tekrarı):**
  `_ballStep`in `_TOP_MAXV` ağı yalnız kendi işini kırpar (`px,py` girişte alınır); dışarıdan
  `b.x=...` yazan bir yol (burada `oamHakemTick` — top hakemin eline SIÇRIYORDU) ağdan geçmez.
  Ölçüldü: 620 sn'de bir kez tek karede 2,98 m, mod `loose>loose`. Topun ya da jetonun
  konumuna doğrudan yazan her yapı, hareketi hız cinsinden ifade etmeli.
- **`tools/faz58-check.js` — canlı sahne kusur denetçisi:** `iz-kaydet` kaydını tarayıcısız
  çözümler (kayıt bir kez alınır, araç defalarca koşulur): rakibe giden pas · izinsiz saha
  dışı / `_oob` sızıntısı · tek kare jeton sıçraması · canlı ve ölü sahipsiz top · tek kare
  top sıçraması · ÇİZİLEN konumda iç içe jeton payı. Pencere **en az 600 sn** olmalı — bu
  kusurların çoğu dakikada 1'den seyrektir. ⚠ Kayıt `saat>0` ile dilimlenmeli: maç saati
  başlamadan önceki kurulum kareleri (FAZ 44 §1 pivot ↔ slot takası) 3,5-3,8 m'lik meşru
  "sıçrama" gösterir ve dilimlenmezse aracın kendi yanlış pozitifini üretir (FAZ 47 dersi).
  `iz-kaydet` alanları 14-17: çizim ofseti (`_cizDx/_cizDy`) · klip bayrağı · ham `_oob`.

- **ULAŞILAMAYAN HEDEFE PAS ATILMAZ — MESAFE, TOPUN VARABİLECEĞİ NOKTAYA ÖLÇÜLÜR
  (FAZ 59 · 1b, kullanıcı: "top pass modunda donuyor, maçın %6,1'i):** ölçüldü (v102,
  640 sn): top 7 kez, toplam 26,7 sn 'pass' modunda TEK PİKSEL kımıldamadan asılı kaldı;
  pas süresi p99 7,02 sn, en uzunu 9,8 sn. Zincir: pasın hedefi ÇİZGİ DIŞINDAKİ sokucudur
  (`_oob`) → `_ballStep`in 'pass' dalı uçuş noktasını saha içine KIRPAR (FAZ 54 A4) → top
  hedefe ASLA varamaz → `b.t>=1` olunca `_ballHold(to)` çalışır, mesafe hâlâ 14 px'in
  üstündedir ve `_ballPass` YENİDEN atılır → sonsuz döngü (`b.t` her seferinde sıfırlanır).
  FAZ 55'te 'held' modunda kapattığımız "hayalet top"un pas hâli. `_ballHold` artık
  mesafeyi hedefin KENDİSİNE değil topun ULAŞABİLECEĞİ (kırpılmış) noktaya ölçer; top
  zaten oradaysa pas değil EL DEĞİŞİMİ olur. ⚠ Bu kusurun brifteki teşhisi
  (`_inboundPass`in `b0.onDone`'ının silinmesi) YANLIŞTI: `_ballStep`in 'pass' dalı
  `b.onDone`'ı HİÇ ÇAĞIRMAZ — onDone yalnız 'shot' dalında kullanılır, o geri çağrı
  zaten hiçbir zaman çalışmıyordu. Kapı: `node tools/faz59-check.js olcum/iz-<etiket>.json`.
- **KUSURUN KONUMLARI TEKRAR EDİYORSA KÖK NEDEN O SABİTTEDİR (FAZ 59, teşhisin anahtarı):**
  donma noktaları rastgele değildi — (58,204) = CRT_X0+2 · (882,204) = CRT_X1−2 ·
  (200,30)/(486,30) = CRT_Y0+2, yani hepsi SAHA SINIRI KIRPMASININ değeri. Bu tek gözlem
  kök nedeni verdi. Bir kusuru teşhis ederken önce konum/süre değerlerinin koddaki hangi
  sabitle birebir eşleştiğine bak; brifin gösterdiği satırı okumaktan hızlıdır.
- **UÇAN TOP NÖBETÇİSİ (FAZ 59 · 1a, kalıcı ağ):** 'pass'/'shot' modundaki top TANIMI
  GEREĞİ hareket eder; 0,35 sn boyunca hiç yer değiştirmiyorsa takılmıştır. `_ballStep`
  başında (klip erken-dönüşünün ÜSTÜNDE, ki klip karelerini de görsün): fizik tarafında
  top 'dead' olur ve sokma yeniden kurulur (`_sokmaYenidenKur`), şut geri çağrısı düşmez;
  KLİP sürerken kurtarma YAPILMAZ (zararlıdır), yalnız mod 'loose'a çekilir. Sayaç
  `S._donukN` — tetiklenirse yeni bir yol takılıyor demektir.
- **KLİP BEKLERKEN TOP 'pass' MODUNDA KALAMAZ (FAZ 59 · 1c):** `klipTop`un bekleme dalı
  (`if(K.bekle) return`, FAZ 54 A1) topu YERİNDE tutar; top o an 'pass' modundaysa ekranda
  "uçan ama kımıldamayan top" görünür. Bekleyen top sahipsizdir — mod 'loose'a alınır.
- **KLİP SLOT EŞLEMESİNDE "ASIL TAŞIYICI" ORTA SAHA TAŞIYICISI DEĞİLDİR (FAZ 59 · 3,
  FAZ 53 dersinin ikinci yüzü):** `bi` klibin TAMAMINDA topu en çok tutan slottur; topu
  ARKA SAHADAN getiren slot çoğu zaman BAŞKASIDIR ve kalan slotlar rol sırasına göre
  körlemesine dolduruluyordu. Ölçüldü (v102): orta çizgiyi topla geçen 27 olayın 6'sı PF
  ve ALTISI DA klip jetonu, beşi sayı sonrası — FAZ 47'de kullanıcının şikâyet ettiği
  "4-5 numaralar top sürüyor"un aynısı. Artık klibin kendi verisinden ORTA SAHA
  TAŞIYICISI çıkarılır (top klip koordinatında xf=47'yi aşağı doğru kestiği karede topa
  en yakın hücumcu slotu) ve o slota boşsa GUARD konur. Ayrıca `S.chase.tok` asıl taşıyıcı
  slotuna atanırken `_tasiyabilir` şartı arar — sayı sonrası sokucu potaya en yakın
  oyuncudur, yani çoğu zaman uzundur. Ölçülen: guard payı %76 → %78 (gerçek %79),
  forward %24 → %19 (gerçek %14), C %0 → %3 (gerçek %6).
- **PG/SG AYRIMI GERÇEK VERİDE YOKTUR — KAPI GUARD PAYIDIR (FAZ 59 · 3):** klip kütüphanesi
  oyuncuları `KLIP_SINIF` = G,G,F,F,C olarak sınıflar; hangi guard'ın PG hangisinin SG
  olduğu kayıtta YOKTUR. "PG payı ≥ %50" gibi bir kapı bu yüzden veriden türetilemez
  (FAZ 39 dersi). Ölçülebilir büyüklük `hareket-bant-check`in "yarı sahayı geçen rol"
  satırıdır ve gerçek tabanı G %79 / F %14 / C %6'dır.
- **`tools/faz59-check.js` — uçan top + taşıyıcı denetçisi:** `iz-kaydet` kaydını
  tarayıcısız çözümler: donan uçuş (>0,35 sn) · pas süresi p99 · rakibe giden pas ·
  canlı sahipsiz top · orta çizgiyi topla geçen rol · FAZ 58 gerileme satırları.
  Pencere en az 600 sn. ⚠ İVME BU ARAÇTA ÖLÇÜLMEZ (FAZ 55 dersi): `iz-kaydet` konumu
  0,1 px'e yuvarlar ve dt=16,7 ms'de bu ~12 m/sn² sahte ivme demektir; ivme satırı
  `tools/sahne-olcum.js`ten (ham float, 0,2 sn pencereli) okunur. Aynı sebeple
  "savunmadan >4 m" kapısı da `sahne-olcum`dadır — bu araçtaki geniş tanımlı sayı
  (taşıyıcı olan HER kare) sistematik olarak yüksektir (aynı koşuda 27,2 ↔ 17,9).

- **KAPI YALNIZ SORULAN SORUYU YANITLAR — ANOMALİ AVCISI (FAZ 60, kullanıcı: "her şeyin
  içine sıçılmış"):** FAZ 58-59'da bütün kapılar yeşildi ve oyun hâlâ bozuk izleniyordu.
  `tools/anomali.js` kaydın tamamını tarar ve **önceden verilmiş bir kapı listesi olmadan**
  aykırı davranışı arar; `tools/an-goruntu.js` o durum oluştuğu ANDA ekran görüntüsü çeker.
  Sayılar yeşilken şikâyet geldiğinde sıra: (1) `anomali` çalıştır, (2) en yüksek önemdeki
  bulgunun karesine `an-goruntu` ile BAK, (3) kök nedeni kodda ara. Kod okumakla değil
  kareye bakmakla başla (FAZ 44 dersinin aracı).
- **ANOMALİ BULGUSU KUSUR DEMEK DEĞİLDİR — GERÇEK VERİYLE SINA (FAZ 60):** avcının bulduğu
  "kimseyi tutmayan savunmacı" 26 epizodun 22'si KLİP jetonuydu, yani gerçek NBA geçiş anı;
  `hareket-bant-check` savunmacı mesafesini zaten gerçekle L1 0,137 ile eşliyor. "3 sn
  kıpırdamayan oyuncu" 38 epizodun 31'i HEDEFİNDE duruyordu ve gerçek veride oyuncu zamanın
  %18,8'inde durağandır. Avcı ADAY üretir; kararı gerçek veri (`_lib/gercek-hareket.json`)
  ve göz verir. Aday listesini körlemesine "düzeltmek" oyunu gerçeklikten UZAKLAŞTIRIR.
- **SERBEST ATIŞ TÖRENİ İLK KARESİNDE KENDİNİ İPTAL EDİYORDU (FAZ 60):** `oamTorenKur` atış
  sayacını `sonMod:null` ile başlatıyordu; ŞUT FAULÜNDE top zaten `'shot'` modundadır,
  dolayısıyla ilk karede sahte bir atış sayılıp `atisN>=atisToplam` ile tören kapanıyordu.
  Tören kapanınca ON OYUNCUNUN HEDEFİ HİÇ YAZILMAZ — ve `_setFtFormation`ın hedefleri de
  `_hedefAta` sarmalayıcısı tarafından tören sahipliği yüzünden yutulur, yani hiçbir yazıcı
  kalmaz. Sayaç töreni kurarken topun O ANKİ moduyla başlar. Yeni bir tören türü eklerken
  "bu sayaç önceki olayın durumunu miras alıyor mu" diye sor.
- **ÜÇ SANİYE KURALI ÖLÜ TOPTA SAYILMAZ (FAZ 60):** `oamHedef`in boya kaçışı (FAZ 54 C1)
  tören sırasında da çalışıyordu ve tören `O.rim=[0,0]` ile kurulduğu için boya sınavı
  `|p.x − 0| < 171 px` oluyor, SOL potadaki serbest atışlarda kulvar oyuncuları (x = 108-196)
  "boyada" sayılıp 1,6 saniye sonra kulvardan KOVULUYORDU. `oamBoyaKac` artık tören ·
  `_ftAktif` · hakem töreni · `'dead'` modunda null döner. Düdük anında 3,7 m'den uzakta
  kalan oyuncu SPRINT eder (KOS ile 3,4 sn'lik tören tavanına yetişemiyordu).
  Ölçülen: `sunum-check` F14-7 **7,7/10 → 9,3/10** (FAZ 57'den beri düşen kapı), ortalama
  sapma 0,26 → 0,12 m; dipteki iki kulvar yerinin savunmanın olduğu epizot 4/5 → 5/5.
- **JETON ÇAPI GERÇEK OYUNCUNUN İKİ KATIYDI (FAZ 60, 16 → 12 px):** saha 28 m ve jeton
  yarıçapı 16 px, yani çap 1,08 m — gerçek omuz genişliğinin (~0,5 m) iki katı. Ölçüldü:
  3+ oyuncunun 1,5 m'de toplandığı 40 epizodun **37'si klip jetonu**, yani simülasyon konumu
  gerçek NBA kaydıdır ve doğrudur (FAZ 56: gerçek kayıtta en yakın çift karelerin %10,4'ünde
  40 cm altında). Kusur konumda değil ÇİZİMDEYDİ. Yarıçap 12 px (0,81 m çap), `_CIZ_R` 29 → 25,
  `_CIZ_MAX` 17 → 12 — gereken kayma küçüldüğü için çizilen konum gerçek konuma DAHA YAKIN.
  Bir "üst üste binme" şikâyetinde önce jetonun kendi boyutunu sor.
- **ÖLÜ ZAMANDA TOP ÇEVİRME DENENDİ VE ÖLÇÜLEREK GERİ ALINDI (FAZ 60):** "bir oyuncu topu
  12,3 sn tutuyor" bulgusuna karşı `oamCevirTick` yazıldı; 640 sn'lik ölçümde etkisi YOK
  (tutma 2,00 → 2,02 sn, 6 sn üstü 15 → 16) çünkü uzun tutmaların **13/15'i KLİP oynatımı
  içindedir** ve klip yörüngesine dokunulmaz. Yığılma da 40 → 55'e çıktı. Kaldırıldı.
  Bu sınıftaki bir kusurun çözümü sahne kuralı eklemek değil, klip kütüphanesinde ya da
  olaylar arası ölü zamanın kısaltılmasındadır.
- **BİR ÖLÇÜM İKİ FARKLI KODDA AYNI SONUCU VERİYORSA ÖLÇÜM YANLIŞTIR (FAZ 60, FAZ 55
  dersinin tekrarı):** `anomali.js`in serbest atış bölümü epizodun %85'inden örnek alıyordu;
  `S._ftAktif` atışlar bittikten sonra da açık kaldığı için (FAZ 40) oyun YENİDEN CANLIYKEN
  ölçüp "kulvarda 0 oyuncu, şutör 8,20 m uzakta" diyordu. Düzeltme öncesi ve sonrası aynı
  sayıyı verirken `sunum-check` F14-7 belirgin yükselmişti — çelişki aracı ele verdi. Örnek
  artık topun `'shot'` moduna geçtiği ilk karenin hemen ÖNCESİDİR.
- **`tools/anomali.js` / `tools/an-goruntu.js`:** ilki `iz-kaydet` kaydını tarayıcısız tarar
  (pencere en az 600 sn), ikincisi canlı maçta durum oluşunca `#courtSvg` görüntüsü çeker
  (`node tools/an-goruntu.js <etiket> --secs=420 --max=26`). ⚠ A1/A5 sayıları koşudan koşuya
  %40 oynar (38/42/58 · 40/55/49) — tek koşuyla yargı verme.

- **KUSUR SİMÜLASYONDA DEĞİL KAMERADAYDI — SAHA KAMERASI (FAZ 61, kullanıcı: "maçı canlı
  izlesen 2 dk'da 100 hata görürsün ama göremiyorsun"):** bütün ölçüler gerçek NBA verisiyle
  eşleşiyordu ve ekran yine "berbat" duruyordu. Kesin kanıt: AYNI simülasyon anının tüm saha
  görüntüsü sekiz jetonluk okunmaz bir yumak, YARI SAHAYA KIRPILMIŞ hâli düpedüz basketbol.
  Sayısal gerekçe: saha 28 m ekranda ~690 px → **24,7 px/m**; gerçek bir yayın yarı sahayı
  ~70 px/m ile gösterir, yani 3 metrelik gerçek bir kalabalık bizde 74 px'e sığıyor ve altı
  jeton üst üste biniyordu. `js/render.js` sonundaki kamera topun yarı sahasını gösterir
  (histerezis ±40 px, üstel yumuşatma), buton `toggleMatchKamera` ile kapanır.
  ⚠ **GÖRÜNTÜ KUTUSUNUN ORANI DEĞİŞMEK ZORUNDA:** yarı saha 14×15 m, neredeyse KARE; kutu
  1,88:1. Yalnız iç viewBox daraltılırsa (`preserveAspectRatio="none"`) jetonlar ELİPS olur
  ya da kenar çizgisindeki oyuncu kırpılır — dış viewBox yüksekliği, `#courtBg` dikdörtgeni
  ve iç yuvanın oranı BİRLİKTE ayarlanır. Kamera YALNIZ çizim katmanıdır.
- **"GERÇEK VERİYLE EŞLEŞİYOR" GÖRÜNTÜNÜN DOĞRU OLDUĞUNU KANITLAMAZ (FAZ 61, FAZ 39
  dersinin görsel karşılığı):** ölçüm konumları yargılar, EKRANI yargılamaz. Ölçülen:
  10 oyuncu ortalama ikili mesafe fizik 6,04 m ↔ klip (gerçek) 5,85 m; en büyük küme
  (3 m zincir) 5,99 ↔ 5,75; kopuk oyuncu %1,9 ↔ %1,9 — üçü de eşleşiyordu ve ekran
  okunmuyordu. Bir görsel şikâyette ölçüm eşleşiyorsa sıradaki soru **"aynı veriyi başka
  türlü çizsem düzelir mi"** olmalıdır.
- **KLİP JETONLARINI "KONTROL GRUBU" SAYMANIN SINIRI (FAZ 61, FAZ 60'ta kurduğum ölçütün
  düzeltmesi):** klip, gerçek bir pozisyonun BİZİM maçımıza NAKLEDİLMİŞ hâlidir — konumlar
  gerçek, bağlam bizim. Yanlış oyuncuya / yanlış yöne / yanlış olayın ardına yapıştırılmış
  gerçek bir pozisyonun her karesi "gerçekçi" ölçülür ama izlerken saçmadır. Klip kontrol
  grubu KONUM dağılımları için geçerlidir, DİZİ ve BAĞLAM için değil.
- **KAMERA VARSAYILAN KAPALIDIR — GÖRÜNÜMÜ DEĞİŞTİRMEK KULLANICININ KARARIDIR (FAZ 61
  düzeltmesi, kullanıcı: "bu ayarı da bozmuşsun"):** FAZ 61.de kamera varsayılan AÇIK
  getirildi; kutu yükseldiği için saha ekrana sığmadı, maçı yukarıdan bütünüyle izlemek
  imkânsız hâle geldi ve sayfa kaydırma gerektirdi. Kullanıcı bunu istememişti. 
  varsayılanı **false**; ayar yalnız kullanıcı butona basarsa açılır, kapalıyken rAF döngüsü
  HİÇ çalışmaz ve varsayılan görünüm FAZ 60 öncesiyle BİREBİR aynıdır (dış viewBox
  , iç ). Global kural burada ihlal edildi: mevcut
  davranışı bozma, minimal değişiklik yap. Yeni bir görünüm/mod eklerken varsayılanı
  DEĞİŞTİRME — seçenek olarak sun.
- **DAR EKRANDA KAMERA PENCERESİ GENİŞ TUTULUR (FAZ 61):** yarı saha penceresi görüntü
  kutusunu YÜKSELTİR; 390 px'te bu, birincil eylem butonunu ekranın yarısından aşağı itiyor
  (`mobile-check` 0,54 ekran, 17/18). Dar ekranda pencere 620 → 780 birim: kutu yüksekliği
  bugünküyle aynı kalır, yine de 14 → 17 px/m kazanılır. 18/18.
  ⚠ Kamera açıkken kutuyu `max-width` ile daraltmak DENENDİ ve elendi — kutu küçülünce
  zoom kazancı tamamen yok oluyor (aynı px/m).
- **`tools/dikis-goruntu.js` — 0,25 sn ARDIŞIK kare şeridi:** izlemeye en yakın araç. Sabit
  aralıklı kontak sayfası (2 sn) HAREKETİ göstermez; bir insanın "saçma" dediği şeylerin
  çoğu iki karenin arasındadır. Her karenin üstüne sahne durumu (klip kaç jeton · oam fazı ·
  taşıyıcı · mod) yazılır; öncelik KLİP DİKİŞİDİR (maç boyunca ~90 kez klip biter, fizik
  devralır, yeni klip oyuncuları yeni rollere eşler). Görsel şikâyette `anomali` + `an-goruntu`
  bir şey bulamıyorsa bunu çalıştır ve şeridi SIRAYLA oku.
