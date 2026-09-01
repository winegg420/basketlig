# CLAUDE.md — Charazay 2.0

Bu dosya, bu depoda çalışan Claude Code oturumları için proje rehberidir. Yeni oturumda önce bunu ve `PROGRESS.md`'yi oku.

## Proje nedir?

**Charazay 2.0**, Türkçe, tek dosyalık bir **basketbol menajerlik oyunu**dur. Oyuncu bir kulüp menajeri olarak takım kurar, kadro/taktik yönetir, canlı maç simülasyonu izler, transfer yapar, altyapı/arena/ekonomi yönetir ve lig + playoff sezonları oynar. Steam yayınına hazırlanıyor.

- Ana oyun: **`charazay2.0.html`** (~6445 satır, tek dosya: HTML + CSS + JS gömülü).
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
| `assets/portraits/` | 201 oyuncu portresi (`p_0000.jpg`…`p_0200.jpg`) + `manifest.json`. |
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
| `tools/sim-node.js` | **Tarayıcısız maç simülasyonu** — 12 modülü düz Node'da (vm) yükler, `simulateMatch()` sözleşmesini ve determinizmi sınar. Motor sözleşmesi değişince çalıştır. |
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
| `tools/sut-check.js` | **FAZ 26 şut tipi denetçisi** (tarayıcısız) — her saha şutunun tipi var mı, tip bölgeyle tutarlı mı, smaç/floater payı gerçekçi mi, smaç/turnike/floater dili doğru tipte mi, tip deterministik mi. Şut tipi ya da anlatım havuzları değişince çalıştır. |
| `tools/lig-check.js` | **FAZ 19 lig denetçisi** — standings ↔ fikstür tek kaynak, ayrışma senaryosunda onarım, tablo tutarlılığı (o = g + m), 10 sezonluk denge kapıları (ortalama fark, 20+/5- oranı, 16-0 takım), şehir tekrarı. Lig/tablo/denge değişince çalıştır. |
| `tools/arena-check.js` | **FAZ 24 arena doluluğu denetçisi** — 125 arena×bilet fiyatı×form birleşiminde **seyirci ≤ taraftar tabanı**, doluluk sınırları, sezon başı bilet gelirinin değişmezliği, `TARAFTAR_KATSAYI`nın tek kaynak olması. Arena / bilet / taraftar formülü değişince çalıştır. |
| `tools/analiz-check.js` | **FAZ 24 analiz sayı tutarlılığı** — Analiz kartındaki "Sayı ort. (attı)" ile "Attığı sayı" grafiğinin aynı diziden beslendiğini ve grafik eksen etiketlerinin ÇİZİM için açılan banttan değil gerçek min/max'tan basıldığını (FAZ 22 §4.1 gerilemesi) 3 maçlık veriyle sınar. |
| `tools/turkek-check.js` | **FAZ 25 Türkçe çekim eki birim testi** — brifin 8 ad × 4 durum tablosu (32 kapı), kaynaştırma/zamir n'si ayrımı, ünsüz benzeşmesi, şablon çözücü (`%X{durum}`), Türkçe küçük harf. `js/turkce-ek.js` değişince çalıştır. |
| `tools/portre-uret-yerel.py` | **FAZ 17C yerel portre üretimi** (SD-Turbo, CPU). Kova kotaları, bant dengesi, kaldığı yerden devam, dilim başına commit+push. Boru hattı `tools/portre_boru.py`. |
| `tools/portre_boru.py` | Portre işleme boru hattı (kadraj, fon eşitleme, eleme kapıları). Üretim kaynağı değişse de bu modül aynı kalır. |
| `tools/i18n-scan.js` | **EN modunda çeviri denetimi** — tüm sayfa/modal/canlı maçı gezip çevrilmemiş metin düğümlerini raporlar. Dil değişikliğinden sonra çalıştır. |
| `tools/measure.js` / `tools/band.js` | Canlı sunum ölçümü + **sonuç değişmezliği** (kanonik tohum imzası / 200 maç skor hash'i). Sunum değişikliklerinden sonra ikisi de aynı hash'i vermeli. `band.js` referans hash: **`99bb9ceb67917bd0`** (varsayılan tohum 987654321; **FAZ 19 sonrası** — eski değerler: `89b5436137c1da14` FAZ 17-18, `fb393bdab878e699` FAZ 13-16, `ec630b3a512bb3b2` FAZ 13 öncesi). *FAZ 19'da hash bilerek değişti: lig dengesi düzeltmesi (`cpuMatchScore` kırpması 35→20, `pseudoTeamStrength` bandı 42→20) maç skorlarını doğrudan değiştirdi; ortalama fark 21,4→10,5 (`lig-check` C bölümü ölçüyor).* *FAZ 17'de hash bilerek değişti: isim havuzu ülke başına 256'dan 21.000 kombinasyona çıkınca `ensureUniquePlayerNames` içindeki ad çakışması yeniden-çekilişleri neredeyse sıfıra indi ve rastgelelik akışı kaydı. Milliyet seçiminin kendisi akışı KAYDIRMAZ — `genPlayer` ülke sabitlense bile `ch(ULKELER)` çekilişini yapar, sonucu sonra ezer.* *32. oturum: `if(SEED)` koruması + varsayılan 0 yüzünden tohum hiç kurulmuyordu, araç her çalıştırmada farklı hash veriyordu — düzeltildi.* |
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
- **Para birimi KR** (kullanıcı kararı — USDT'ye dönme).
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
