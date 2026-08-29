# KALDIĞIM YER
Son güncelleme: 2026-08-29 · 32. oturum — **açık iş yok, tüm testler yeşil**

Talep belgeleri: `REVIZE-PAKETI.md` (FAZ 1-6) · `REVIZE-PAKETI-FAZ7.md` (maç dışı) ·
`REVIZE-PAKETI-FAZ8.md` (oynanış testi) — **üçü de baştan sona uygulandı ve ölçülerek doğrulandı**.
Protokol: `DEVAM-ET.md` · Oturum günlüğü: `PROGRESS.md` (32. oturum + dört ek)

## Durum: TEMİZ

**FAZ 1-8'in tamamı bitti.** M9, M12, M14, M20 kapatıldı; a11y sürükleme hatası düzeltildi;
B5 zorluk seviyesi eklendi. Talep belgelerinde açık madde kalmadı.
Her madde **ölçülerek** doğrulandı — "uyguladım" beyanına dayanan açık iş yok.

## Doğrulama komutları (hepsi geçiyor)

| Komut | Ne sınar | Sonuç |
|---|---|---|
| `node tools/faz6-check.js` | FAZ 6 (ödüller, zorluk, koçluk istatistiği, kayıt bütünlüğü, mobil uçtan uca, masaüstü paketi) | ✓ **6/6** |
| `node tools/faz8-check.js` | FAZ 8 kabul kriterleri (piyasa, şehir, v7, kutuplaşma, sürüm, mobil) | ✓ **6/6** |
| `node tools/faz7-check.js` | FAZ 7 kabul kriterleri + a11y zoom hayaleti | ✓ **8/8** |
| `node tools/m20-check.js` | rakip kadro kalıcılığı | ✓ **6/6** |
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
- **İki araç kusuru:** `band.js` tohumu hiç kurmuyordu; `i18n-scan.js` salt ASCII harfli Türkçe
  metinleri göremiyordu. İkisi de düzeltildi — düzeltilince yeni gerçek eksikler ortaya çıktı.

## Yarım kalan

Yok.

## Sıradaki adım (öncelik sırasıyla)

Talep belgelerinde **açık madde kalmadı**. Sıradakiler kapsam kararı gerektirir:

1. **Gerçek Tauri derlemesi** — `npm run desktop:build` bu makinede hiç çalıştırılmadı
   (Rust araç zinciri gerekir). `dist-desktop` hazır ve doğrulandı; kalan iş derleme + imzalama.
2. **Gerçek cihazda dokunma testi** — Playwright emülasyonu geçiyor; fiziksel telefon denenmedi.
3. **B6** — akademi maçları, pozisyon antrenmanı derinliği (`RAPOR-EKSIKLER.md`, kapsam kararı).
4. **Steam Deck / gamepad** desteği — kapsam kararı bekliyor (FAZ 6 belgesinde açık bırakılmış).
5. FAZ 8 notu: 7 dokunma hedefi 38-39 px (eşik 40) — sınırda, istenirse kapatılır.

## Dikkat

- **Ölçmediğin düzeltme çalışmıyor olabilir.** Bu oturumda üç kez tekrarlandı: 31. oturumun
  teşhisi, FAZ 7 "uyguladım" beyanım ve M9'un ilk hâli — üçü de test karşısında düzeltildi.
  Yeni bir madde eklerken ilgili `*-check.js` aracına denetim ekle.
- **Çevrilecek cümleyi `<strong>` ile bölme.** Vurgu etiketi metin düğümlerini ayırır ve
  `I18N_PHRASES` kalıbı eşleşmez (FAZ 8'de üç haber şablonu bu yüzden yeniden yazıldı).
- **`i18n-scan.js` sözcük listesine İngilizce'de aynı yazılan kelimeleri EKLEME** (arena,
  transfer, moral, tempo) — çevrilmiş metinler yanlış pozitif olur.
- **Kayıt sürümü v7.** `SAVE_VERSIONS=[2,3,4,5,6,7]`; `migrateV5ToV6` + `migrateV6ToV7`.
- **Yeni kariyerin tek sıfırlama kaynağı `DEFAULT_G`** (`roster-gen.js`); yeni kalıcı alanı
  literale ekle, `createTeam` içine satır yazma.
- **Piyasa kalitesi kadroya bağlı** (`marketQualityBand`): tavan = kadro en iyisi + 6, kesin
  sınırdır. Kadro geliştikçe piyasa da gelişir (ölçekli zorluk).
- **Bot kulüp kadrosu durum taşıyor** (`p.sezon`, `p.enerji`, `injReturnDay`). Yeni alan
  eklerken `botClubEnsureDepth` içindeki geriye dönük doldurmaya da ekle. `BOT_ROSTER_DIST`
  başındaki İLK 7 SIRA tarihseldir — id/seed'ler ona bağlı, değiştirme.
- **`cpuMatchScore()` tek kaynaktır** — bot-bot skor formülünü test de oradan çağırır.
- **Script sürüm etiketi** her yayın öncesi artırılmalı (`?v=38` → 39…); `faz8-check` A7 sınıyor.
- **Fontlar yerel** (`assets/fonts/`) — yeni Google Fonts `<link>` eklenmemeli.
- **`S._dbgOutlet`** yalnız `sunum-check` için bırakılmış teşhis damgasıdır, silme.
- **`js/league.js` CRLF**, `charazay2.0.html` KARIŞIK (CRLF+LF), diğer modüller LF. Toplu
  düzenlemede satır sonunu otomatik tespit et.
- Bellek önbellekleri: `CLUB_CACHE_KEY` → `invalidateClubCacheMem()`,
  `TBL_STORAGE_KEY` → `invalidateTblStateMem()`.
