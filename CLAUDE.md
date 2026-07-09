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
- **Canlı (GitHub Pages):** https://winegg420.github.io/basketlig/charazay2.0.html — kurulum için `README.md`'ye bak.

Oyun ilerlemesi tarayıcıda **localStorage + IndexedDB** ile saklanır (otomatik kayıt + 3 manuel slot). Sunucu/veritabanı yoktur.

## Teknolojiler

- **Saf HTML5 + CSS3 + vanilla JavaScript** — framework, build adımı, bağımlılık **yok**.
- Grafikler **inline SVG** (basketbol sahası, şut haritası, portre yedekleri) ve CSS.
- Ses: **Web Audio API** (`sfx()` — basit osilatör tonları).
- Kalıcılık: **localStorage** (durum) + **IndexedDB** (büyük string), sürüm geçiş migrasyonları var (`migrateEconomyV3ToV4` vb.).
- Dış kaynaklar: Google Fonts (Bebas Neue / Inter). Oyuncu portreleri `assets/portraits/` (201 yerel JPEG, `manifest.json`).

## Depo yapısı

| Yol | Açıklama |
|-----|----------|
| `charazay2.0.html` | **Ana oyun** — HTML+CSS gövdesi. JS artık burada değil; sırayla `js/*.js` yüklenir (10 `<script src>`). |
| `js/*.js` | **Oyun mantığı** — tek `<script>` bloğundan mekanik olarak bölünmüş 10 modül (aşağıdaki kod haritası). |
| `index.html`, `Charazay-2.0-BASLAT.html` | `charazay2.0.html`'e yönlendiren giriş sayfaları. |
| `charazay-mentor-panel.html` | Geliştirici öz-denetim aracı — **oyunun parçası değil**, dokunma. |
| `assets/portraits/` | 201 oyuncu portresi (`p_0000.jpg`…`p_0200.jpg`) + `manifest.json`. |
| `tools/generate-portraits.py` / `.ps1` | Portre üretim scriptleri (pollinations.ai, deterministik seed). |
| `tools/visual-check.js` | **Otomatik görsel/konsol testi** (Playwright + sistem Chrome, masaüstü+mobil). Her değişiklikten sonra çalıştır. |
| `*.bat`, `OYUNU-AC.txt` | Windows başlatıcılar / kullanıcı yardım notu. |
| `PROGRESS.md` | **Oturum günlüğü** — yapılanlar, kararlar, nedenleri. Her oturumda güncelle. |
| `RAPOR-EKSIKLER.md` | Tam sürüm için eksik/hata denetim raporu (öncelik sıralı). |
| `README.md` | Son kullanıcı için oynatma / GitHub Pages talimatları. |

## Kod haritası (js/ modülleri)

JS, `charazay2.0.html` gövdesinden **mekanik olarak** (bitişik dilimler, sıfır mantık değişikliği; birleştirince orijinalle byte-birebir) 10 dosyaya bölündü. Sırayla, klasik `<script src>` ile yüklenir — **tümü global kapsamda** (fonksiyonlar `window`'a, top-level `const/let` paylaşılan global lexical env'e gider); dosyalar arası çağrı serbesttir. Yeni sabit/fonksiyon eklerken **tema hangi dosyaya aitse oraya** ekle, yükleme sırasını bozma.

| Dosya | İçerik |
|-------|--------|
| `js/state.js` | Sabitler (`LEAGUE_SIZE=20`, `MATCH_CLOCK_SEC=600`, `OT_CLOCK_SEC=300`, `START_KR`, `ECO_MUL`, storage anahtarları), `ecoRound`, IndexedDB, kimlik/maaş/hash yardımcıları. |
| `js/economy.js` | Ekonomi: `txn`, bilet (`homeTicketIncome`,`ticket*`), `weeklyWageBill`, bot transfer, `processEconomyWeeks`, `processBankruptcy` (kademeli iflas). |
| `js/persistence.js` | Başarımlar, `sfx`, ayarlar, kayıt slotları, öğretici, `serializeGameState`/`applyGameState`/migrasyon, `bootstrapAppUi`. |
| `js/portraits.js` | Portre data-URI + avatar yardımcıları, `PORTRAIT_POOL_SIZE=201`. |
| `js/roster-gen.js` | Oyun sabitleri (`STAT_KEYS`,`ARENA_LVL`,`KOC_T`,`INJURIES`), global `G`, `genPlayer/genRoster/genYouth/genMarket`, TBL durumu, `buildLeagueRows`, terfi/düşme. |
| `js/league.js` | Lig modalları, haber/sidebar, takım detay sayfası, `genRoundRobinMatches`, fikstür, `openMatchTactics`/`saveMatchTactics`, ilk-5 editörü. |
| `js/match-prep.js` | `updateStandingsFromResult`, `computeRosterOfrDef`, `matchLineup`, `simulateCpuMatch`, yorgunluk/sakatlık, playoff, `startLeagueSeason`. |
| `js/render.js` | Sayfa render'ları: `renderRoster/renderLig/renderMarket/renderArena/renderAltyapi/renderAntrenman/renderBilanço/renderAnalytics`, oyuncu kartı/modal, scouting/izci ağı (`renderScouts`), kulüp transfer pazarlığı (`openClubOfferModal`), SVG grafik (`svgLineChart`). |
| `js/match-engine.js` | Maç motoru: `generateMatchEvents` → `runPossession` (tempo/odak/savunma stili/top yükleme/eşleştirme taktikleri), şut haritası/kutu skor render, `applyMatchResult`. |
| `js/main.js` | `startMatch`/`stopMatch`/canlı oynatım, `toggleManualCoach`, antrenman + izci (`hireScout`) aksiyonları, transfer/gelen teklif (`showIncomingOfferModal`)/koç/arena aksiyonları, `showPage` (SPA, `analiz` dahil), `createTeam`, bildirim kuyruğu, `window.onload` bootstrap. |
| — | **7. oturum sistemleri:** playoff serisi + sezon ödülleri + **başkan hedefi** (`match-prep.js`), transfer pazarlığı + **kişilikler** (`playerAcceptsOffer`), **izci ağı** + **draft** (`startDraft`, `match-prep.js`), **Analiz** sayfası. Detay `PROGRESS.md` 7. oturum. |

## Geliştirme kuralları

- **Global `~/.claude/CLAUDE.md` kuralları geçerli:** Türkçe yanıt ver; görevi baştan sona tamamla; mevcut kodu bozma, minimal değişiklik yap; dosya silme/yeniden yazma yerine düzenle; her oturum `PROGRESS.md`'yi oku ve sonunda **ekleyerek** güncelle.
- **Test (ZORUNLU):** Her mantık/UI değişikliğinden sonra sırayla: (1) değişen `js/*.js` dosyalarına `node --check`; (2) mantık değişiminde izole VM harness ile maç akışı simülasyonu; (3) **`node tools/visual-check.js`** — masaüstü (1440×900) + mobil (390×844), 0 konsol hatası şartı, akış (15 adım): yeni kariyer → maç izle → taktik → market → ayarlar → transfer pazarlığı → gelen teklif → başkan hedefi → sezon ödülleri → playoff serisi → iflas senaryosu → draft, ekran görüntüleri `tools/visual-check-output/`. **Bu script çıkış kodu 0 vermeden görev tamamlanmış sayılmaz.**
- **Modül disiplini:** Yeni mantık ilgili `js/*.js` dosyasına girer (kod haritasındaki temaya göre); yükleme sırasını (`charazay2.0.html` içindeki `<script src>` sırası) bozma. Fonksiyonlar/`var`/`function` global; top-level `const/let` dosyalar arası paylaşılır ama `window.X` ile DEĞİL, ada göre erişilir. Yeni buton eklenince onclick handler'ının global bir `function` olduğundan emin ol.
- **Ekonomi değerleri** `ecoRound()` üzerinden ölçeklenir; ham KR sabiti yazma.
- **Kullanıcı girdileri** (takım/arena/menajer adı) `sanitizeTeamName` ile temizlenir (XSS).
- **Para birimi KR** (kullanıcı kararı — USDT'ye dönme).
- **Oyuncular hep erkek** (portre havuzu buna göre).

## Bilinen eksikler

Tam sürüm için doldurulacak boşluklar ve mantık hataları `RAPOR-EKSIKLER.md`'de öncelik sırasıyla listelidir (rakip kadro kalıcılığı, MVP/rakip faul, winStreak reset, transfer pazarlığı, playoff derinliği vb.).
