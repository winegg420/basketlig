# KALDIĞIM YER
Son güncelleme: 2026-08-29 · 32. oturum — **açık iş yok, tüm testler yeşil**

Kaynak talep belgeleri: `REVIZE-PAKETI.md` (FAZ 1-6) · `REVIZE-PAKETI-FAZ7.md` (maç dışı)
Protokol: `DEVAM-ET.md` · Oturum günlüğü: `PROGRESS.md` (32. oturum + iki ek)

## Durum: TEMİZ

FAZ 1-5 ve FAZ 7 tamamlandı; **M9, M12, M14** kapatıldı; a11y sürükleme hatası düzeltildi.
Her madde ölçülerek doğrulandı — "uyguladım" beyanına dayanan açık iş yok.

## Doğrulama komutları (hepsi geçiyor)

| Komut | Ne sınar | Sonuç |
|---|---|---|
| `node tools/faz7-check.js` | FAZ 7 kabul kriterleri + a11y zoom hayaleti | ✓ **8/8** |
| `node tools/sunum-check.js --ms=300000` | M9 outlet · M12 and-1 · M14 şut saati | ✓ **3/3** |
| `node tools/m20-check.js` | rakip kadro kalıcılığı (kimlik/derinlik/istatistik/yorgunluk/isabet/sakatlık) | ✓ **6/6** |
| `node tools/visual-check.js` | masaüstü + mobil akış, konsol | ✓ çıkış kodu **0** |
| `node tools/live-metrics.js --ms=200000` | senkron · kimlik · ışınlanma | ✓ orphan 0 · kimlik %100 · 0 kare |
| `node tools/box-band.js --n=200` | denge bantları | ✓ **11/11** |
| `node tools/band.js` | **sonuç değişmezliği** (hash) | `dc984289dee3c29d` |
| `node tools/i18n-scan.js` | EN modunda çeviri | ✓ kalan Türkçe yalnız özel isim |

> **Hash referansı:** sunum değişikliğinden sonra `band.js` **aynı** hash'i vermelidir.
> Farklıysa sunum sanılan değişiklik sonucu da değiştirmiş demektir.
> `live-metrics` yayılımını yargılamadan önce **≥ 200 sn** ile çalıştır (kısa pencerede gürültülü).

## Bu oturumda kapatılanlar

- **31. oturum regresyonu:** `pendingPaint` `clearBallTimers()`'tan önce kuruluyordu → sonraya
  alındı + `stepGuarded()`. orphan 0 **ve** kimlik %100 birlikte tutuyor.
- **FAZ 3:** şut anındaki ve serbest atışlar arasındaki top ışınlanması → 0 kare.
- **FAZ 7 (F7-1…F7-30):** tamamı + 8 kabul kriteri fiilen doğrulandı.
- **a11y-big zoom 1.18:** sürükleme hayaleti 147 px kayıyordu → `_uiZoom()` ile düzeltildi (K9).
- **M9** outlet pası · **M12** and-1 ek atışı · **M14** şut saati 14.
- **M20 / A1 rakip kadro kalıcılığı:** rakip şut isabeti SABİTTİ (oyuncu statı/enerjisi motorda
  hiç kullanılmıyordu) → iki taraf da `shooterAcc`'ten geçiyor; kadro derinliği 7→10; rakipte
  sezon istatistiği + yorgunluk + sezon geçişinde yaşlanma; ödüller gerçek veriyle harmanlı.
- **Kenar durum:** top çeyrek sonunda orta sahaya ışınlanıyordu (245 px) → görünür taşıma.
- **Araç kusuru:** `band.js` tohumu hiç kurmuyordu (`if(SEED)` + varsayılan 0) — "sonuç
  değişmezliği" güvencesi fiilen çalışmıyormuş. Düzeltildi.

## Yarım kalan

Yok.

## Sıradaki adım (öncelik sırasıyla)

1. **`REVIZE-PAKETI-FAZ8.md`** — depoda YENİ bir talep belgesi var (oynanış testi; kod denetimi
   değil, canlı oynayarak yapılmış gözlemler). Henüz **uygulanmadı**, okunup sıraya alınmalı.
2. **FAZ 6** — B4 sezon ödülleri, B5 zorluk seviyesi, C2/C3.
3. **Steam paketleme** — Tauri derlemesi (`src-tauri/`), mobil cihazda gerçek dokunma testi.
4. `RAPOR-EKSIKLER.md` içindeki kalan maddeler (B1-B6 büyük özellikler).

## Dikkat

- **Yeni sunum maddesi eklerken `tools/sunum-check.js`'e denetim ekle.** Sunum değişiklikleri
  maç sonucunu değiştirmediği için `band`/`box-band` onları göremez — ölçülmezse sessizce bozulur.
- **Kayıt sürümü v6.** `SAVE_VERSIONS=[2,3,4,5,6]`, `migrateV5ToV6` normalizasyon yapıyor.
- **Yeni kariyerin tek sıfırlama kaynağı `DEFAULT_G`** (`roster-gen.js`); `createTeam` onun derin
  kopyasını uygular. Yeni kalıcı alan eklerken **literale ekle**, `createTeam` içine satır yazma.
- **Kayıt silme bastırması:** `clearSavedGame` sonrası otomatik kayıt `_saveSuppressed` ile durur.
  Yeni bir "kullanıcı bilinçli işlem yaptı" noktası eklersen `suppressAutoSave(false)` çağır.
- **Fontlar yerel** (`assets/fonts/`, 4 woff2) — yeni Google Fonts `<link>` eklenmemeli
  (`faz7-check` K6 bunu ağı keserek sınıyor).
- **`S._dbgOutlet`** (`match-engine.js`) yalnız `sunum-check` için bırakılmış teşhis damgasıdır;
  davranışı etkilemez, silme.
- **Bot kulüp kadrosu artık durum taşıyor** (`p.sezon`, `p.enerji`, `injReturnDay`). Kadroya
  yeni alan eklerken `botClubEnsureDepth` içindeki geriye dönük doldurmaya da ekle, yoksa eski
  kayıtlarda `undefined` kalır. Kadro dizisinin İLK 7 SIRASI tarihseldir — `BOT_ROSTER_DIST`
  başını değiştirme, id/seed'ler o sıraya bağlı.
- **Rakip mekaniği değişirse `band.js` hash'i değişir** — bu beklenen. Değişmemesi gereken
  yalnız SUNUM değişiklikleridir.
- **`js/league.js` CRLF**, diğer modüller LF. Toplu düzenlemede satır sonunu otomatik tespit et.
- Bellek önbellekleri: `CLUB_CACHE_KEY` → `invalidateClubCacheMem()`,
  `TBL_STORAGE_KEY` → `invalidateTblStateMem()`.
