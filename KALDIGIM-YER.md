# KALDIĞIM YER
Son güncelleme: 2026-08-29 · 32. oturum — **açık iş yok, tüm testler yeşil**

Kaynak talep belgeleri: `REVIZE-PAKETI.md` (FAZ 1-6) · `REVIZE-PAKETI-FAZ7.md` (maç dışı)
Protokol: `DEVAM-ET.md` · Oturum günlüğü: `PROGRESS.md` (32. oturum)

## Durum: TEMİZ

31. oturumdan devreden regresyon **kapatıldı**, ertelenen doğrulama borçları **ödendi**,
`REVIZE-PAKETI-FAZ7.md`'nin **30 maddesinin tamamı** uygulandı ve doğrulandı.

## Son ölçümler (hepsi hedef içinde)

| Araç | Sonuç |
|---|---|
| `node tools/visual-check.js` | ✓ masaüstü + mobil, **0 konsol hatası** |
| `node tools/live-metrics.js` | ✓ orphan **0** · kimlik **%100** · ışınlanma **0 kare** · syncRatio 2,3-3,0× · jeton p99 266-273 px/sn |
| `node tools/box-band.js --n=200` | ✓ **11 bandın tamamı** (sayı 85,0 · top kaybı 9,3 · FT payı 0,166 · faul 15,1) |
| `node tools/i18n-scan.js` | ✓ kalan Türkçe **yalnızca özel isim** |

## Bu oturumda kapatılanlar

- **31. oturum regresyonu:** `pendingPaint` `clearBallTimers()`'tan önce kuruluyordu, aynı
  satırdaki flush cümleyi pozisyonun başında bastırıyordu → sonraya alındı + `stepGuarded()`.
- **FAZ 3 (top fiziği) kapandı:** şut anındaki ışınlanma ve serbest atışlar arası `b.carrier`
  doğrudan ataması kaldırıldı → 0 kare.
- **i18n borcu:** M17 top kaybı satırlarının EN karşılıkları + kalıp önceliği düzeltmesi.
- **FAZ 7 (F7-1 … F7-30):** veri kaybı (4), istismar/denge (4), Steam/mobil/erişilebilirlik (7),
  sağlamlık/performans (11), cila (4). Ayrıntı `PROGRESS.md` 32. oturum.

## Yarım kalan

Yok.

## Sıradaki adım (öncelik sırasıyla)

1. **M9** — ribaund sonrası outlet pas yok (`match-engine.js` ~1130 `let pg=…`, ~1304 `bringT`).
2. **M12** — AND-1'de serbest atış canlandırılmıyor (and-1 dalı ~2130).
3. **M14** — şut saati: hücum ribaundunda 24 yerine 14 (`main.js` `startClockTween`).
4. **M20** — rakip kadro kalıcılığı (`RAPOR-EKSIKLER.md`).
5. **FAZ 6** — B4 sezon ödülleri, B5 zorluk seviyesi, C2/C3, Tauri/Steam paketleme, mobil test.

## Dikkat

- **Kayıt sürümü v6.** `SAVE_VERSIONS=[2,3,4,5,6]`, `migrateV5ToV6` normalizasyon yapıyor.
  Yeni alan eklenirse migrasyona da yazılmalı.
- **Fontlar artık yerel** (`assets/fonts/`, 4 woff2). Google Fonts referansı kalmadı —
  yeni bir `<link>` eklenmemeli (Steam çevrimdışı gereği).
- **`js/league.js` CRLF**, diğer modüller LF. Toplu düzenlemede satır sonunu otomatik tespit et.
- `charazayRunLayoutCalibration` artık yalnız `window.CHARAZAY_DEBUG` açıkken çalışır;
  mentor panelini kullanacaksan bayrağı aç.
- Kulüp önbelleği (`getBotClubProfile`) bellekte tutuluyor; `CLUB_CACHE_KEY`'e yazan yeni bir
  yer eklenirse `invalidateClubCacheMem()` çağrılmalı. Aynısı `getTblState` için
  `invalidateTblStateMem()`.
