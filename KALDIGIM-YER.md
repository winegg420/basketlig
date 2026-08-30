# KALDIĞIM YER
Son güncelleme: 2026-08-30 · 36. oturum — **PROMPT-CLAUDE-CODE.md beş bölümün tamamı bitti**

Talep belgeleri: `REVIZE-PAKETI.md` (FAZ 1-6) · `REVIZE-PAKETI-FAZ7.md` (maç dışı) ·
`REVIZE-PAKETI-FAZ8.md` (oynanış testi) · `REVIZE-PAKETI-FAZ9.md` (uzun vadeli döngü) ·
`REVIZE-PAKETI-FAZ10.md` (yayın hazırlığı) · `REVIZE-PAKETI-FAZ11.md` (canlı maç dizilimi) —
**altısı da uygulandı ve ölçülerek doğrulandı**; FAZ 10'un yalnız A grubu (çok oyunculu
sunucu altyapısı) **bilinçli olarak** plana bırakıldı.
Protokol: `DEVAM-ET.md` · Oturum günlüğü: `PROGRESS.md` (32-35. oturum)

## Durum: TEMİZ

**FAZ 1-9'un tamamı bitti.** M9, M12, M14, M20 kapatıldı; a11y sürükleme hatası düzeltildi;
B5 zorluk seviyesi eklendi; uzun vadeli sezon döngüsü dengelendi.
**FAZ 10'un B grubu bitti** (34. oturum): fikstür saati kapısı + `?test=1` bayrağı, analitik
katmanı (varsayılan kapalı), og/twitter etiketleri + og:image, davet & sonuç paylaşımı,
öğreticinin 7 adımının tamamı EN, service worker + manifest (PWA).
**FAZ 11 bitti** (35. oturum): canlı maç saha dizilimi. Kök neden belgede yazandan farklı
çıktı — sahne saati (rAF) ile olay saati (setTimeout) ayrışması; arka plan sekmesinde sahne
anlatımın 13 kat gerisine düşüp geçiş dizilimine takılıyordu. `_simCatchUp` + yeniden çizilen
`SET_*` dizilimleri + "fill" fazı + koreografi düzeltmeleri + `startMatch` sessiz kilitlenmesi.
Her madde **ölçülerek** doğrulandı — "uyguladım" beyanına dayanan açık iş yok.

## ÇOK OYUNCULU — oyunun temeli, henüz başlanmadı

Charazay baştan beri **çevrimiçi çok oyunculu** hedefliyor: maç **fikstür tarihinde** ve
**otomatik** oynanır; oyuncu oradaysa canlı izleyip müdahale eder, değilse sonucu döndüğünde
görür; rakipler gerçek oyuncular + sahipsiz takımları dolduran botlardır.
**Maçların bugün art arda oynanabilmesi bir hata değil, bilinçli test kolaylığıdır** —
34. oturumda `?test=1` bayrağının arkasına alındı (`TEST_MODU`, `matchTimeGateOk` · `state.js`).
Sunucu mimarisi kararı **Supabase**; şema ve yol haritası **`PLAN-COK-OYUNCULU.md`**'de.
Sunucu/veritabanı/hesap/zamanlayıcı **kodu yazılmadı** — tek oyunculu tarafla aynı büyüklükte
ayrı bir fazdır.

## Doğrulama komutları (hepsi geçiyor)

| Komut | Ne sınar | Sonuç |
|---|---|---|
| `node tools/season-loop.js --n=3 --runs=3` | çok sezonlu döngü (kadro OVR, kasa, yaşlanma, kadro sınırı, playoff) | ✓ **6/6** |
| `node tools/faz6-check.js` | FAZ 6 (ödüller, zorluk, koçluk istatistiği, kayıt bütünlüğü, mobil uçtan uca, masaüstü paketi, Tauri ön koşulları) | ✓ **7/7** |
| `node tools/faz8-check.js` | FAZ 8 kabul kriterleri (piyasa, şehir, v7, kutuplaşma, sürüm, mobil) | ✓ **6/6** |
| `node tools/faz7-check.js` | FAZ 7 kabul kriterleri + a11y zoom hayaleti | ✓ **8/8** |
| `node tools/m20-check.js` | rakip kadro kalıcılığı | ✓ **6/6** |
| `node tools/faz10-check.js` | FAZ 10 (fikstür saati kapısı, analitik, og etiketleri, PWA, öğretici dili, paylaşım) | ✓ **27/27** |
| `node tools/spacing-check.js` | saha dizilimi (aralık, yayılım, boya, markaj, ball-you-man) — tohumlu | ✓ **9/9** |
| `node tools/spacing-check.js --bg` | arka plan sekmesinde dizilim (F11-1 gerileme testi) | ✓ geçti |
| `node tools/faz11-check.js` | FAZ 11 (dizilim geometrisi, yetişme, kesme noktası, `startMatch` kilidi) | ✓ **13/13** |
| `node tools/mobile-check.js` | FAZ 12 mobil (dokunma sayısı, maç sayfası düzeni, yoğunluk, 44 px) | ✓ **18/18** |
| `node tools/sim-node.js --n=50` | **tarayıcısız** maç simülasyonu + determinizm (sunucu ön koşulu) | ✓ 50/50 |
| `node tools/schema-check.js` | `db/schema.sql` sözdizimi + lig kuralları + RLS + bağlantı yok | ✓ **17/17** |
| `node tools/sunum-check.js --ms=300000` | M9 outlet · M12 and-1 · M14 şut saati | ✓ **3/3** |
| `node tools/visual-check.js` | masaüstü + mobil akış, konsol | ✓ çıkış kodu **0** |
| `node tools/live-metrics.js --ms=360000` | senkron · kimlik · ışınlanma | ✓ orphan 0 · kimlik %100 · 0 kare |
| `node tools/box-band.js --n=200` | denge bantları | ✓ **11/11** |
| `node tools/band.js` | **sonuç değişmezliği** (hash) | `ec630b3a512bb3b2` |
| `node tools/i18n-scan.js` | EN modunda çeviri + **tarama kapsamı** | ✓ kalan Türkçe yalnız özel isim |

> **Hash referansı:** SUNUM değişikliğinden sonra `band.js` **aynı** hash'i vermelidir.
> Mekanik değişiklikte (denge, piyasa, rakip mekaniği) hash'in değişmesi beklenir — o zaman
> `box-band` bantları kontrol edilip yeni hash referans olarak yazılır.
> `live-metrics` yayılımını yargılamadan önce **≥ 200 sn** ile çalıştır (kısa pencerede gürültülü).

## Bu oturumda kapatılanlar

- **31. oturum regresyonu:** `pendingPaint` `clearBallTimers()`'tan önce kuruluyordu → orphan 0
  **ve** kimlik %100 birlikte tutuyor (`stepGuarded()`).
- **FAZ 3:** top ışınlanması 0 kare (şut anı, serbest atışlar arası, çeyrek sonu).
- **FAZ 7 (F7-1…F7-30):** tamamı + 8 kabul kriteri.
- **a11y-big zoom 1.18:** sürükleme hayaleti 147 px kayıyordu → `_uiZoom()`.
- **M9** outlet pası · **M12** and-1 ek atışı · **M14** şut saati 14 · **M20** rakip kadro kalıcılığı.
- **FAZ 8 (F8-1…F8-14):** tamamı + 8 kabul kriteri.
- **FAZ 6:** B5 zorluk seviyesi (kolay/normal/zor) + B4 "en gelişen" ödülü; A1/B3/C2/C3/D1/D3
  ve Steam ek maddelerinin zaten kapandığı **ölçülerek** doğrulandı (`faz6-check`).
- **FAZ 9:** sezonluk doğal gelişim (kadro artık büyüyor: +1,27 OVR), ekonomi dengesi
  (kasa 5,8× → 1,58×), kadro üst sınırı 18, playoff/yaşlanma doğrulaması, "Transfer Bedeli".
- **Motor çökmesi:** sağlıklı oyuncu 5'ten azken `matchLineup` null slot döndürüp maçı
  çökertiyordu — `season-loop` buldu, düzeltildi.
- **Üçüncü araç kusuru:** `box-band.js` tohumsuzdu (aynı kodla ribaund 29,9 / 30,9).
- **İki araç kusuru:** `band.js` tohumu hiç kurmuyordu; `i18n-scan.js` salt ASCII harfli Türkçe
  metinleri göremiyordu. İkisi de düzeltildi — düzeltilince yeni gerçek eksikler ortaya çıktı.

## Yarım kalan

**`season-loop` K2 (pasif takım kasası) düşüyor** — `--n=3 --runs=3` ortalaması 2,06× (eşik 2,0;
tohumlara göre 1,56×-2,62×). `git worktree` ile ölçüldü: **36. oturum öncesi commit'lerde de
düşüyor** (`8288405`, hatta FAZ 9'un bittiği `7e8f5c0`). FAZ 9'da "6/6" diye kaydedilen ölçüm
bugün aynı commit'te tekrar üretilemiyor → aracın ekonomi ölçümünde tohumla sabitlenmeyen bir
girdi var (muhtemelen takvim/tarih). **Önce aracın determinizmi doğrulanmalı, sonra denge.**
Bu depoda dördüncü kez bir ölçüm aracının kendisi şüpheli.

**`sunum-check` M9 küçük örneklemde karar veremiyor** — 10 dakikalık pencerede yalnız 3 vaka
kapsama giriyor, 3 vakada %80 eşiği ancak 3/3 ile tutturulabiliyor. `c2c46b3` (FAZ 11 öncesi)
ile karşılaştırıldı: **birebir aynı sonuç (2/3)**, yani gerileme değil. Aynı koşuda motorun
kendi kararı **231/237 = %97,5**. Düzeltilecek olan aracın kapsam kuralı/penceresi.

## Sıradaki adım (öncelik sırasıyla)

Talep belgelerinde **açık madde kalmadı**. Sıradakiler kapsam kararı gerektirir:

0. **ÇOK OYUNCULU (FAZ 10 · F10-1)** — en büyük iş. `PLAN-COK-OYUNCULU.md` 6. bölümündeki
   9 adımdan **ikisi 36. oturumda bitti**: şema (`db/schema.sql`) ve motoru Node'da koşturan
   ayrıştırma (`simulateMatch` + `tools/sim-node.js`). Kalan sıra: Supabase projesi + anonim
   giriş → fikstür zamanlayıcısı → istemcinin sunucudan gelen olayları oynatması → realtime +
   çeyrek arası müdahale → ortak transfer piyasası → lig yönetimi → bildirim.
   **Sunucu kodu hâlâ yazılmadı; hiçbir hesap açılmadı.**
   *Ara yol önerisi (belgeden):* tek oyunculu sürüm şimdi yayınlanıp gerçek tutunma verisi
   toplanırken altyapı arkada kurulabilir — analitik ve og etiketleri bu yüzden önden yapıldı.
0b. **Analitik hesabı açılması** — `ANALYTICS_SRC` + `ANALYTICS_SITE` (`js/state.js`) doldurulunca
   ölçüm başlar; katman hazır, hesap kullanıcıya ait (Umami/Plausible önerildi).
1. **Gerçek Tauri derlemesi** — `npm run desktop:build` bu makinede **çalıştırılamadı**:
   Rust ve MSVC Build Tools kurulu değil (2026-08-30'da denendi, kullanıcı kurulumu erteledi).
   Ayrıntı ve kurulum adımları aşağıdaki **"Masaüstü derlemesi"** bölümünde.
2. **Gerçek cihazda dokunma testi** — Playwright emülasyonu geçiyor; fiziksel telefon denenmedi.
3. **B6** — akademi maçları, pozisyon antrenmanı derinliği (`RAPOR-EKSIKLER.md`, kapsam kararı).
   FAZ 9 notu: paraya **anlamlı hedefler** (arena basamakları, akademi seviyeleri, izci ağı,
   kulüp transferinde gerçek yıldızlar) hâlâ genişletilebilir — kasa artık şişmiyor ama
   harcama kanalları da zengin değil.
4. **Steam Deck / gamepad** desteği — kapsam kararı bekliyor (FAZ 6 belgesinde açık bırakılmış).
5. FAZ 8 notu: 7 dokunma hedefi 38-39 px (eşik 40) — sınırda, istenirse kapatılır.

## Masaüstü derlemesi (Tauri) — durum ve kurulum

**Proje tarafı hazır, eksik olan yalnız araç zinciri.** `faz6-check` F6/F7 bunu sınıyor:

| Bileşen | Durum |
|---|---|
| `dist-desktop` (13 js modülü, 4 yerel font, dış src/href yok) | ✓ hazır |
| `src-tauri`: Cargo.toml · build.rs · main.rs · tauri.conf.json · ikonlar | ✓ hazır |
| `frontendDist` yolu · bundle hedefleri (msi, nsis) · identifier | ✓ doğrulandı |
| WebView2 · Node · npm · Tauri CLI 2.11.4 | ✓ kurulu |
| **Rust (rustup/rustc/cargo)** | ✗ **kurulu değil** |
| **MSVC Build Tools + Windows SDK** | ✗ **kurulu değil** |

Kurulum (yaklaşık 4-6 GB indirme, 20-40 dk):

```
winget install Rustlang.Rustup          # yönetici GEREKMEZ (~300 MB)
winget install Microsoft.VisualStudio.2022.BuildTools ^
  --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

> İkinci komut **UAC/yönetici onayı** ister — bu yüzden otomatik çalıştırılamıyor, terminale
> `!` ön ekiyle sen başlatmalısın. Kurulumdan sonra yeni bir terminal aç (PATH tazelensin).

Sonra:

```
node tools/faz6-check.js     # F7 satırında "araç zinciri: rustc var · cargo var" görünmeli
npm run desktop:build        # dist hazırlığı + Rust derlemesi + msi/nsis paketleme
```

Çıktı: `src-tauri/target/release/bundle/{msi,nsis}/`. İlk derleme uzun sürer (Rust bağımlılıkları
sıfırdan derlenir); sonrakiler önbellekten hızlanır.

## Dikkat

- **Ölçmediğin düzeltme çalışmıyor olabilir.** Bu oturumda üç kez tekrarlandı: 31. oturumun
  teşhisi, FAZ 7 "uyguladım" beyanım ve M9'un ilk hâli — üçü de test karşısında düzeltildi.
  Yeni bir madde eklerken ilgili `*-check.js` aracına denetim ekle.
- **Çevrilecek cümleyi `<strong>` ile bölme.** Vurgu etiketi metin düğümlerini ayırır ve
  `I18N_PHRASES` kalıbı eşleşmez (FAZ 8'de üç haber şablonu bu yüzden yeniden yazıldı).
- **`i18n-scan.js` sözcük listesine İngilizce'de aynı yazılan kelimeleri EKLEME** (arena,
  transfer, moral, tempo) — çevrilmiş metinler yanlış pozitif olur.
- **Kayıt sürümü v8.** `SAVE_VERSIONS=[2,3,4,5,6,7,8]`; `migrateV5ToV6` + `migrateV6ToV7` (boy/isim) + `migrateV7ToV8` (zorluk).
- **Yeni kariyerin tek sıfırlama kaynağı `DEFAULT_G`** (`roster-gen.js`); yeni kalıcı alanı
  literale ekle, `createTeam` içine satır yazma.
- **Piyasa kalitesi kadroya bağlı** (`marketQualityBand`): tavan = kadro en iyisi + 6, kesin
  sınırdır. Kadro geliştikçe piyasa da gelişir (ölçekli zorluk).
- **Bot kulüp kadrosu durum taşıyor** (`p.sezon`, `p.enerji`, `injReturnDay`). Yeni alan
  eklerken `botClubEnsureDepth` içindeki geriye dönük doldurmaya da ekle. `BOT_ROSTER_DIST`
  başındaki İLK 7 SIRA tarihseldir — id/seed'ler ona bağlı, değiştirme.
- **`cpuMatchScore()` tek kaynaktır** — bot-bot skor formülünü test de oradan çağırır.
- **Script sürüm etiketi** her yayın öncesi artırılmalı — şu an **`?v=43`**; `faz8-check` A7 sınıyor.
- **Mobil alt sekme çubuğu (F12-1)** `#mobileTabs`; yeni sayfa eklerken günlük kullanımdaysa
  çubuğa, değilse hamburgerde bırak. `showPage` çubuğu, katlamaları, sabit eylemi ve rozetleri
  kendisi tazeler — yeni sayfa eklerken ek bağlantı gerekmez.
- **Mobilde ekranın altındaki 56 px çubuk vardır:** sabit konumlu yeni bir öğe koyarken
  `bottom` değerini `calc(70px + env(safe-area-inset-bottom))` üzerinden ver, yoksa çubuğun
  düğmelerini kapatırsın (bildirim kutusu bu yüzden `pointer-events:none` yapıldı).
  Aynı sürüm `sw.js` içindeki `SCRIPT_V`'de de geçer — ikisi ayrışırsa `faz10-check` A4 düşer.
- **Service worker yalnız yayın sunucusunda kaydedilir** (`isProdHost()`); yerelde/testte kapalı,
  yoksa önbellek eski JS'i servis edip ölçümleri yanıltır. `?nosw=1` ile de kapatılabilir.
- **Yeni maç başlatma yolu eklersen** `matchTimeGateOk()` kapısından geçir (F10-2).
- **Bir hata raporunun ÖLÇÜM KOŞULU raporun kendisi kadar önemlidir (35. oturum):** FAZ 11
  belgesinin tablosu arka plandaki sekmede ölçülmüştü; ön planda oyun o kadar bozuk değildi.
  Koşulu yeniden üretmeden teşhis yapılırsa yanlış yerde hata aranır (belge "set dizilimi hiç
  uygulanmıyor" diyordu; gerçek sebep rAF kısıtlaması yüzünden sahne saatinin donmasıydı).
- **`_simCatchUp` yalnız kare kaybında çalışır** — ön planda 120 sim saniyede 0 kez tetiklenir.
  `mState._sim.cuCount` teşhis sayacıdır; ön planda 0 beklenir.
- **`season-loop --n=1` çalıştırma:** tek sezonda sezon geçişi olmadığı için K4 (yaşlanma) düşer;
  yargı için `--n=3` gerekir.
- **Fontlar yerel** (`assets/fonts/`) — yeni Google Fonts `<link>` eklenmemeli.
- **`S._dbgOutlet`** yalnız `sunum-check` için bırakılmış teşhis damgasıdır, silme.
- **`js/league.js` CRLF**, `charazay2.0.html` KARIŞIK (CRLF+LF), diğer modüller LF. Toplu
  düzenlemede satır sonunu otomatik tespit et.
- Bellek önbellekleri: `CLUB_CACHE_KEY` → `invalidateClubCacheMem()`,
  `TBL_STORAGE_KEY` → `invalidateTblStateMem()`.
