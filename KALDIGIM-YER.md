# KALDIĞIM YER
Son güncelleme: 2026-08-29 · 32. oturum — **açık iş yok, kabul kriterleri dahil tüm testler yeşil**

Kaynak talep belgeleri: `REVIZE-PAKETI.md` (FAZ 1-6) · `REVIZE-PAKETI-FAZ7.md` (maç dışı)
Protokol: `DEVAM-ET.md` · Oturum günlüğü: `PROGRESS.md` (32. oturum + eki)

## Durum: TEMİZ

31. oturumdan devreden regresyon kapatıldı, ertelenen doğrulama borçları ödendi,
`REVIZE-PAKETI-FAZ7.md`'nin **30 maddesi + 8 kabul kriteri** uygulandı ve **fiilen doğrulandı**.

## Doğrulama komutları (hepsi geçiyor)

| Komut | Sonuç |
|---|---|
| `node tools/faz7-check.js` | ✓ **7/7 kabul kriteri** (K8 ayrı) |
| `node tools/visual-check.js` | ✓ masaüstü + mobil, **çıkış kodu 0** |
| `node tools/live-metrics.js --ms=200000` | ✓ orphan **0** · kimlik **%100** · ışınlanma **0 kare** · yayılım 1,03× |
| `node tools/box-band.js --n=200` | ✓ **11 bandın tamamı** |
| `node tools/i18n-scan.js` | ✓ kalan Türkçe **yalnızca özel isim** |

> `live-metrics` kısa pencerede (`--ms=90000`) yayılımı gürültülü ölçebilir — tip başına örnek
> sayısı artık çıktıda yazıyor. Yayılımı yargılamadan önce **≥ 200 sn** ile çalıştır.

## Bu oturumda kapatılanlar

- **31. oturum regresyonu:** `pendingPaint` `clearBallTimers()`'tan önce kuruluyordu, aynı
  satırdaki flush cümleyi pozisyonun başında bastırıyordu → sonraya alındı + `stepGuarded()`.
- **FAZ 3 kapandı:** şut anındaki ışınlanma ve serbest atışlar arası `b.carrier` doğrudan
  ataması kaldırıldı → 0 kare.
- **i18n borcu:** M17 top kaybı satırlarının EN karşılıkları + kalıp önceliği düzeltmesi.
- **FAZ 7 (F7-1 … F7-30):** tamamı. Ayrıntı `PROGRESS.md` 32. oturum.
- **Kabul kriterleri:** `tools/faz7-check.js` yazıldı; **iki gerçek kusur buldu** — en önemlisi
  "Kaydı sil"in kalıcı olmaması (`beforeunload` kaydı geri yazıyordu) → `suppressAutoSave()`.

## Yarım kalan

Yok.

## Sıradaki adım (öncelik sırasıyla)

1. **M9** — ribaund sonrası outlet pas yok (`match-engine.js` ~1130 `let pg=…`, ~1304 `bringT`).
2. **M12** — AND-1'de serbest atış canlandırılmıyor (and-1 dalı ~2130).
3. **M14** — şut saati: hücum ribaundunda 24 yerine 14 (`main.js` `startClockTween`).
4. **M20** — rakip kadro kalıcılığı (`RAPOR-EKSIKLER.md`).
5. **FAZ 6** — B4 sezon ödülleri, B5 zorluk seviyesi, C2/C3, Tauri/Steam paketleme, mobil test.
6. **Test edilmemiş not (FAZ 7 belgesinden):** `html.a11y-big{zoom:1.18}` + `position:fixed`
   birlikte koordinat kaydırıyor olabilir — erişilebilirlik büyütmesi açıkken sürükle-bırak
   hayaletinin doğru yere düştüğü **hâlâ sınanmadı**.

## Dikkat

- **Kayıt sürümü v6.** `SAVE_VERSIONS=[2,3,4,5,6]`, `migrateV5ToV6` normalizasyon yapıyor.
  Yeni alan eklenirse migrasyona da yazılmalı.
- **Yeni kariyerin tek sıfırlama kaynağı `DEFAULT_G`** (`roster-gen.js`). `createTeam` artık
  `defaultGameState()` derin kopyası uyguluyor — yeni bir kalıcı alan eklerken **literale ekle**,
  `createTeam` içine elle satır yazma.
- **Kayıt silme bastırması:** `clearSavedGame` sonrası otomatik kayıt `_saveSuppressed` ile
  duruyor. Yeni bir "kullanıcı bilinçli işlem yaptı" noktası eklersen `suppressAutoSave(false)`
  çağır, yoksa o işlemden sonra oyun kaydedilmez.
- **Fontlar yerel** (`assets/fonts/`, 4 woff2). Google Fonts referansı kalmadı — yeni bir
  `<link>` eklenmemeli (Steam çevrimdışı gereği; `faz7-check` K6 bunu ağı keserek sınıyor).
- **`js/league.js` CRLF**, diğer modüller LF. Toplu düzenlemede satır sonunu otomatik tespit et.
- `charazayRunLayoutCalibration` yalnız `window.CHARAZAY_DEBUG` açıkken çalışır; mentor
  panelini kullanacaksan bayrağı aç.
- Bellek önbellekleri: `CLUB_CACHE_KEY`'e yazan yeni bir yer eklenirse
  `invalidateClubCacheMem()`, `TBL_STORAGE_KEY` için `invalidateTblStateMem()` çağrılmalı.
