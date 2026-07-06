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
| `charazay2.0.html` | **Ana oyun** — tüm mantık burada. Neredeyse tüm iş bu dosyada yapılır. |
| `index.html`, `Charazay-2.0-BASLAT.html` | `charazay2.0.html`'e yönlendiren giriş sayfaları. |
| `charazay-mentor-panel.html` | Geliştirici öz-denetim aracı — **oyunun parçası değil**, dokunma. |
| `assets/portraits/` | 201 oyuncu portresi (`p_0000.jpg`…`p_0200.jpg`) + `manifest.json`. |
| `tools/generate-portraits.py` / `.ps1` | Portre üretim scriptleri (pollinations.ai, deterministik seed). |
| `*.bat`, `OYUNU-AC.txt` | Windows başlatıcılar / kullanıcı yardım notu. |
| `PROGRESS.md` | **Oturum günlüğü** — yapılanlar, kararlar, nedenleri. Her oturumda güncelle. |
| `RAPOR-EKSIKLER.md` | Tam sürüm için eksik/hata denetim raporu (öncelik sıralı). |
| `README.md` | Son kullanıcı için oynatma / GitHub Pages talimatları. |

## Kod haritası (charazay2.0.html)

Tek `<script>` bloğu (~1073. satırdan sonra). Genel akış:
- **Sabitler & ekonomi:** `LEAGUE_SIZE=20`, `MATCH_CLOCK_SEC=600` (çeyrek 10 dk), `OT_CLOCK_SEC=300`, `START_KR=50000`, `ECO_MUL`, `PORTRAIT_POOL_SIZE=201`.
- **Durum:** global `G` nesnesi (takım, oyuncular, sezon, ekonomi, ayarlar). `serializeGameState`/`applyGameState` ile kayıt/yükleme.
- **Üretim:** `genPlayer`, `genRoster`, `genYouth`, `genMarket`, `genLigTeams`, `getBotClubProfile` (rakip kadrolar prosedürel).
- **Lig/sezon:** `startLeagueSeason`, `genRoundRobinMatches` (19 tur tek devre), `updateStandingsFromResult`, `buildLeagueRows`, `applyPromotionRelegation`, `startPlayoffs`.
- **Maç motoru:** `generateMatchEvents` → `runPossession` (olay dizisi üretir), `startMatch`/`matchStep` (canlı oynatım), `toggleManualCoach` (canlı müdahale/oyuncu değişikliği).
- **Ekonomi:** `processEconomyWeeks`, `weeklyWageBill`, `homeTicketIncome`, `processBankruptcy` (kademeli iflas, game over yok).
- **Render:** `renderRoster`, `renderLig`, `renderMarket`, `renderArena`, `renderAltyapi`, `renderAntrenman`, `renderBilanço`, `showPage` (SPA yönlendirme).

## Geliştirme kuralları

- **Global `~/.claude/CLAUDE.md` kuralları geçerli:** Türkçe yanıt ver; görevi baştan sona tamamla; mevcut kodu bozma, minimal değişiklik yap; dosya silme/yeniden yazma yerine düzenle; her oturum `PROGRESS.md`'yi oku ve sonunda **ekleyerek** güncelle.
- **Test:** Tarayıcı otomasyonu genelde bağlı değil. Doğrulama için `node --check` (syntax) + izole VM harness (maç motoru + DOM-stub render) kullanılıyor. Değişiklikten sonra en azından syntax'i doğrula; mantık değişiminde maç akışını harness ile simüle et.
- **Tek dosya disiplini:** Yeni mantık `charazay2.0.html` içindeki `<script>` bloğuna girer. Yeni buton eklenince onclick handler'ının global bir `function` olarak tanımlı olduğundan emin ol (mevcut handler'ların hepsi tanımlı — kopuk buton yok).
- **Ekonomi değerleri** `ecoRound()` üzerinden ölçeklenir; ham KR sabiti yazma.
- **Kullanıcı girdileri** (takım/arena/menajer adı) `sanitizeTeamName` ile temizlenir (XSS).
- **Para birimi KR** (kullanıcı kararı — USDT'ye dönme).
- **Oyuncular hep erkek** (portre havuzu buna göre).

## Bilinen eksikler

Tam sürüm için doldurulacak boşluklar ve mantık hataları `RAPOR-EKSIKLER.md`'de öncelik sırasıyla listelidir (rakip kadro kalıcılığı, MVP/rakip faul, winStreak reset, transfer pazarlığı, playoff derinliği vb.).
