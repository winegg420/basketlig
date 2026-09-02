# CLAUDE.md — Charazay 2.0

Bu dosya, bu depoda çalışan Claude Code oturumları için proje rehberidir. Yeni oturumda önce bunu ve `PROGRESS.md`'yi oku.

## Proje nedir?

**Charazay 2.0**, Türkçe, tek dosyalık bir **basketbol menajerlik oyunu**dur. Oyuncu bir kulüp menajeri olarak takım kurar, kadro/taktik yönetir, canlı maç simülasyonu izler, transfer yapar, altyapı/arena/ekonomi yönetir ve lig + playoff sezonları oynar. Steam yayınına hazırlanıyor.

- Ana oyun: **`charazay2.0.html`** (1484 satır — HTML gövdesi + CSS; JS artık `js/*.js` içinde, 15 `<script src>`).
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
| `tools/geometri-check.js` | **Saha çizgisi geometrisi (FAZ 14)** — 3 sayı yayı, köşe düzlükleri, boya, çember/pano ölçüleri, kesişme ve "sahada karşılığı olmayan çizim". **Nitelik okumaz**, `getPointAtLength`/`getBBox` ile ÇİZİLEN eğriyi ölçer. Saha SVG'si değişince çalıştır. |
| `tools/spacing-check.js` | **Saha dizilimi ölçümü (FAZ 11)** — set hücumunda aralık, yayılım, boya kullanımı, markaj mesafesi, ball-you-man. Tohumlu. `--bg` sekmeyi arka plana alıp ölçer (F11-1 gerileme testi). **Dizilim/koreografi değişince çalıştır.** |
| `tools/faz11-check.js` | **FAZ 11 kabul kriterleri** — dizilim geometrisi, kare kaybında yetişme, kesme noktası çakışması, `startMatch` sessiz kilitlenmesi. |
| `tools/anlatim-check.js` | **FAZ 13 anlatım denetçisi** — maçı TARAYICISIZ üretip olay listesini denetler (ribaund/şut eşitliği, seri iddiası, faul adı ve sayacı, çalma iki taraflılığı, kalıp çeşitliliği, devre arası, saha değişimi, köşe bölgesi). `--freeze` ile sekme donması + maç içi panel kalıcılığı tarayıcıda sınanır. **Anlatım değişince çalıştır.** |
| `tools/mobile-check.js` | **FAZ 12 mobil denetçisi** (390×844) — dokunma sayısı (gerçekten tıklayarak), maç sayfası düzeni, bilgi yoğunluğu, 44 px dokunma hedefi, market yoğunluğu. Mobil düzen değişince çalıştır. |
| `tools/sim-node.js` | **Tarayıcısız maç simülasyonu** — 14 modülü düz Node'da (vm) yükler, `simulateMatch()` sözleşmesini ve determinizmi sınar. Motor sözleşmesi değişince çalıştır. **Regresyon tabanı (FAZ 36 sonrası): `--n=1000 --seed=42` → 88.5 - 80.2 · olay/maç 203.** (FAZ 34: olay/maç 248 — FAZ 36 §B1 rutin savunma ribaundunu anlatımdan çıkardı, SKOR DEĞİŞMEDİ.) ⚠ `--n=100` TEK TOHUMDA GÜRÜLTÜ BASKINDIR (deplasman ortalaması tohuma göre 78,5-87,1 arası salınır) — taban artık n=1000 ile okunur. |
| `tools/bozukdeger-check.js` | **Bozuk değer tarayıcısı** — 2 sezon sürülüp TR+EN, 11 sayfa + 4 modal gezilir ve GÖRÜNÜR metinde `NaN`/`undefined`/`null`/`Infinity`/`[object Object]` aranır. `visual-check` yalnız KONSOL hatasına bakar; bozuk değer sessizdir — bu kapı onu yakalar. Sayı/biçim üreten her değişiklikten sonra çalıştır. |
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
| `tools/measure.js` / `tools/band.js` | Canlı sunum ölçümü + **sonuç değişmezliği** (kanonik tohum imzası / 200 maç skor hash'i). Sunum değişikliklerinden sonra ikisi de aynı hash'i vermeli. `band.js` referans hash: **`3225bf641b79dea7`** (FAZ 34 sonrası) (varsayılan tohum 987654321; **FAZ 34 sonrası** — eski değerler: `99bb9ceb67917bd0` FAZ 19-33, `89b5436137c1da14` FAZ 17-18, `fb393bdab878e699` FAZ 13-16, `ec630b3a512bb3b2` FAZ 13 öncesi). *FAZ 34'te hash bilerek değişti: özel yetenek sistemi oyuncu statlarını (dolayısıyla maç sonuçlarını) doğrudan değiştirdi; lig ortalamaları korundu (`yetenek-check` B bölümü ölçüyor).* *FAZ 19'da hash bilerek değişti: lig dengesi düzeltmesi (`cpuMatchScore` kırpması 35→20, `pseudoTeamStrength` bandı 42→20) maç skorlarını doğrudan değiştirdi; ortalama fark 21,4→10,5 (`lig-check` C bölümü ölçüyor).* *FAZ 17'de hash bilerek değişti: isim havuzu ülke başına 256'dan 21.000 kombinasyona çıkınca `ensureUniquePlayerNames` içindeki ad çakışması yeniden-çekilişleri neredeyse sıfıra indi ve rastgelelik akışı kaydı. Milliyet seçiminin kendisi akışı KAYDIRMAZ — `genPlayer` ülke sabitlense bile `ch(ULKELER)` çekilişini yapar, sonucu sonra ezer.* *32. oturum: `if(SEED)` koruması + varsayılan 0 yüzünden tohum hiç kurulmuyordu, araç her çalıştırmada farklı hash veriyordu — düzeltildi.* |
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

## Bilinen eksikler

Tam sürüm için doldurulacak boşluklar ve mantık hataları `RAPOR-EKSIKLER.md`'de öncelik sırasıyla listelidir (rakip kadro kalıcılığı, MVP/rakip faul, winStreak reset, transfer pazarlığı, playoff derinliği vb.).

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
