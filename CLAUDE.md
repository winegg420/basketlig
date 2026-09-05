# CLAUDE.md — Charazay 2.0

Bu dosya, bu depoda çalışan Claude Code oturumları için proje rehberidir. Yeni oturumda önce bunu ve `PROGRESS.md`'yi oku.

## Proje nedir?

**Charazay 2.0**, Türkçe, tek dosyalık bir **basketbol menajerlik oyunu**dur. Oyuncu bir kulüp menajeri olarak takım kurar, kadro/taktik yönetir, canlı maç simülasyonu izler, transfer yapar, altyapı/arena/ekonomi yönetir ve lig + playoff sezonları oynar. Steam yayınına hazırlanıyor.

- Ana oyun: **`charazay2.0.html`** (HTML gövdesi + CSS; JS `js/*.js` içinde, 16 `<script src>` — FAZ 46'da `js/sahne-oam.js` eklendi).
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
| `tools/gercek-hareket/cikar.js` | **FAZ 48 hareket dağılımı çıkarıcı** — ham SportVU'dan `tools/_lib/gercek-hareket.json` üretir (10 maç · 811.291 kare · 2.122 pozisyon): oyuncu hızı, hücum yayılımı, topu tutana en yakın savunmacı (toplam + ön/arka saha), pas/pozisyon, tutma süresi, aynı anda koşan, kesme, şut anında duran, potaya uzaklık, top elde payı, arka sahada tutma payı, yarı sahayı geçen rol — DAĞILIM olarak (tek sayı değil). Tanımlar dosya başında; bir tanımı değiştiren veriyi yeniden çıkarmak zorunda. `cikarilamadi`: perde sayısı, şut tipi — kapı YOK. |
| `tools/_lib/gercek-hareket.json` | **Hareket kapılarının TEK DOĞRULUK KAYNAĞI** (FAZ 48). Elle DÜZENLEME; `cikar.js` üretir. |
| `tools/hareket-bant-check.js` | **Hareket dağılımı ↔ gerçek (FAZ 48)** — `node tools/hareket-bant-check.js olcum/iz-<etiket>.json`: iz kaydından SportVU ile AYNI tanımlarla dağılımlar çıkarır (maç ölçeği) ve histogram **L1 uzaklığı** basar; kapı L1 ≤ 0,35 (tek sabit). ⚠ n≈50 pozisyonluk ölçütlerde (pas/poz, şut anında duran) L1 ±0,1 gürültülüdür — aynı kodun beş kaydında 0,32-0,45 salındı; karar ortalamanın yönüyle verilir. Hareket/koreografi değişince `iz-kaydet` + bunu çalıştır. |
| `tools/iz-poz-ciz.js` | **Pozisyon penceresi yörünge grafiği (FAZ 48 · 3. taş)** — `--t=a-b` (motor kaydı, 10-14 sn pencere) ve `--gercek=<SportVU json> --olay=<id>` (gerçek olay) panellerini yan yana çizer (`olcum/*-poz.png`). 470 sn'lik tam yörünge "saç yumağı"dır; hiçbir kapının yakalamadığı kusurlar (sahayı boydan boya kat eden değişim yayları, uzunların köşe noktası) bu grafikte görüldü. Sayılar yeşilken şikâyet varsa `kontak-goruntu` ile birlikte ÖNCE bunu çalıştır ve kendin oku. |
| `tools/kontak-goruntu.js` | **Canlı sahayı GÖZLE izleme (FAZ 44)** — `node tools/kontak-goruntu.js <KÖK> <etiket> --secs=60 --adim=2`: sahayı 2 sn'de bir kaydeder, 15'lik kontak sayfaları (5×3, her karede olay·mod·taşıyıcı·SET/FT/INB etiketi) üretir (`olcum/goruntu/`). Sayılar yeşilken "basketbola benzemiyor" şikâyetinde ÖNCE bunu çalıştır ve kareleri kendin oku; `<KÖK>` olarak `git worktree` ile açılan HEAD kopyası verilirse aynı tohumda yan yana kıyas yapılır. |
| `tools/dizilim-olc.js` | **Olay indeksine göre dizilim yayılımı (FAZ 44)** — 100 ms'de bir ağırlık merkezine ortalama uzaklık, en yakın çift, 22 px altı çakışan çift, saha dışı jeton; olay başına özet. Duvar saatine bağlı ekran anları koşular arasında kıyaslanamaz — bu araç AYNI OLAYDA kıyaslar. |
| `tools/gecis-analiz.js` | **Pozisyon başına orta çizgi geçişi (FAZ 44)** — `iz-kaydet` kaydını okur; her pozisyonda topun orta çizgiyi hangi modda (held/pass/shot/hiç) geçtiğini listeler. `sahne-check`in "geçiş / pozisyon değişimi" kapısı çift sayar (HEAD %111); davranış yargısı için bunu kullan. |
| `tools/pas-analiz.js` | **Pas yönü + sokma yeri (FAZ 45)** — `iz-kaydet` kaydından: canlı topta potadan uzaklaşan (geri) paslar bağlam ve kim→kime ile; rakibe giden pas; çizgi dışı izinli oyuncunun SAHA İÇİNDEN attığı pas; **her sayı-sonrası pozisyonun ilk pası** verenin konumuyla (dışarıda/içeride). FAZ 44'ün sokma kapısı yalnız çizgi dışındaki epizotları saydığı için "hiç çıkmayan sokucu"yu göremedi (22/24); payda olayın kendisidir. Sokma/geçiş/çalma koreografisi değişince çalıştır. |
| `tools/balon-check.js` | **Anlatım balonu denetçisi (FAZ 40)** — RENDER EDİLMİŞ balonu okur. `anlatim-check` ön parça ile sonuç parçasını AYRI taradığı için birleşme kusurlarını (nokta + küçük harf, çift noktalama) GÖREMEZ. Anlatım birleştirme mantığı değişince çalıştır. |
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
| `tools/arena-check.js` | **FAZ 24 arena doluluğu denetçisi** — 125 arena×bilet fiyatı×form birleşiminde **seyirci ≤ taraftar tabanı**, doluluk sınırları, sezon başı bilet gelirinin değişmezliği, `TARAFTAR_KATSAYI`nın tek kaynak olması. Arena / bilet / taraftar formülü değişince çalıştır. |
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
| `js/render.js` | Sayfa render'ları: `renderRoster/renderLig/renderMarket/renderArena/renderAltyapi/renderAntrenman/renderBilanço/renderAnalytics`, oyuncu kartı/modal, scouting/izci ağı (`renderScouts`), kulüp transfer pazarlığı (`openClubOfferModal`), SVG grafik (`svgLineChart`). |
| `js/turkce-ek.js` | **Türkçe çekim eki** — `turkEk(ad,durum)` (ünlü uyumu + ünsüz benzeşmesi + kaynaştırma/zamir n'si), `turkEkUygula` (`%X{durum}` çözücü), `trKucuk`/`trBuyukIlk` (İ→i, I→ı). Saf fonksiyonlar; `match-engine.js`'ten ÖNCE yüklenir. |
| `js/match-engine.js` | Maç motoru: `simulateMatch`/`buildMatchCtx` (sunucu sözleşmesi, `G`'siz) → `generateMatchEvents` → `runPossession` (tempo/odak/savunma stili/top yükleme/eşleştirme taktikleri), şut haritası/kutu skor render, `applyMatchResult`. **Canlı sunum v3** (27. oturum): rol tabanlı dizilim (`_assignRoles`, `SET_*`), üç fazlı pozisyon (sokma → `TRANS_*` geçiş → set), top durum makinesi (`_ballHold/_ballPass/_ballShoot/_ballLoose`), serbest top takibi (`_chase`), çizgi dışı sokma (`_inboundSetup`/`_clearOob`), anlatım senkronu (`movePlayersForEvent(ev,paint)`). |
| `js/main.js` | `startMatch`/`stopMatch`/canlı oynatım, `toggleManualCoach`, antrenman + izci (`hireScout`) aksiyonları, transfer/gelen teklif (`showIncomingOfferModal`)/koç/arena aksiyonları, `showPage` (SPA, `analiz` dahil), `createTeam`, bildirim kuyruğu, `window.onload` bootstrap. |
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
