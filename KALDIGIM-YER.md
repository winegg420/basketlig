# KALDIĞIM YER
Son güncelleme: 2026-08-29 · oturum kullanıcı tarafından durduruldu (DEVAM-ET.md §5)

Kaynak talep belgesi: `REVIZE-PAKETI.md` · Protokol: `DEVAM-ET.md`

## Biten maddeler

**FAZ 5 — ölçüm araçları** ✔
- `tools/live-metrics.js` (YENİ) — canlı maçta 6 metrik: syncRatio, orphanEvents, ballTeleport, identityMatch, tokenSpeedP99, box. Argümanlar: `--rate= --ms= --full --url= --json`
- `tools/box-band.js` (YENİ) — N maç animasyonsuz simülasyon, takım başına box-score bandı. **Denge kararlarının tek yetkili aracı.**
- Enstrümanın kendisinde 5 ölçüm kusuru bulunup düzeltildi (kimlik referansı en-yakın-jeton → `_sim.ball.carrier` + pas hedefi; rAF bir kare gecikmesi; jeton indeksinin isim etiketine bağlı olması; orphan sayacının HTML ve `ftPre/ftRes` iki-parça basımını görmemesi). **Revize paketindeki "%87 kimlik uyuşmazlığı" büyük ölçüde ölçüm kusuruymuş.**

**FAZ 1 — zaman senkronu** ✔
- M1 — `ev.dt` damgası (`match-engine.js` `runPossessionV` + çeyrek/uzatma döngüleri)
- M1+M2 — gecikme `ev.dt`'den türer (`main.js` `matchStep`; `MATCH_TIME_SCALE=0.30`)
- M16 — varsayılan izleme hızı 1.5 → **1** (`main.js`)
- M10 — `visibilitychange` ile kuyruk duraklatma (`main.js`)
- M11 — `setMatchRate` kalan süreyi yeni hıza göre yeniden kurar (`main.js`)
- M13 — set fazı aralıkları ~2,2×, `sprintV` 1.62→1.35, `keepNear:true` (`match-engine.js`)
- Ölçüm: jeton hızı p99 **332 → 274 px/sn** ✓

**FAZ 2 — kimlik** ✔ (regresyon öncesi **%100**)
- M3 — `_flushPending()` + `clearBallTimers` bekleyen geri çağrıları çalıştırır
- M4 — chase zaman aşımı her modda; topu takipçiye verir
- M7 — rakip ilk 5 tek kaynak: motor `events[0].oppFive` damgalar, `startMatch` onu kullanır
- M8 — bot koç duyuruları (`sub`, `tactic`+`botCoach:true`) sahneye dokunmaz
- `reb` cümlesi topu almadan basılıyordu → script adımına taşındı
- serbest atışta düdük anında top atıcıya verilir

**FAZ 3 — top fiziği** ✔ (kısmi)
- M6 — `_ballHold` uzun mesafe süresi 0.30 → `min(0.90, d/520)`
- M5 — `_inboundPass` ışınlanma yerine görünür toparlama pası; `bridge` adımı `min(0.55, d/520)`
- Ölçüm: ışınlanma 5 kare → **1-2 kare** (777 px → ~130 px). Hedef 0'a ulaşılmadı.

**FAZ 4 — denge** ✔ **tüm bantlar tuttu** (`box-band.js --n=200`)
- M17 top kaybı ekonomisi (pozisyon dağılımı + tür ayrımı: çalma %55 / pas hatası %31 / ihlal %14)
- M18 serbest atış enflasyonu (and-1 %12→%8,5 · turnike faulü %15→%9,5 · üçlük faulü %8→%5 · şut faulü payı %10→%6)
- M19 `ftRebound()` — kaçan son serbest atış canlı top + %9 sarkma faulü
- Skor telafisi: `playsMax` 48→54, isabet 0.505→0.545 / 0.355→0.372 (rakip simetrik)

| Metrik | ÖNCE | SONRA | Bant |
|---|---|---|---|
| Sayı | 92,4 | 84,0 | 82-100 ✓ |
| Top kaybı | **3,3** | **9,6** | 9-15 ✓ |
| Serbest atış denemesi | 29,5 | 17,9 | 14-26 ✓ |
| FT sayı payı | 0,241 | 0,162 | 0,12-0,20 ✓ |
| Ribaund | 29,5 | 31,0 | 30-46 ✓ |
| Faul | 16,9 | 14,9 | 14-24 ✓ |
| Top çalma | 3,3 | 5,3 | 4-12 ✓ |

## Yarım kalan
**Madde:** M3 tamamlayıcı — "bekleyen anlatım" (pendingPaint) · **REGRESYON, düzeltilmedi**
**Dosya:** `js/match-engine.js`
**Satır:** `_flushPending` (~567) ve `animateShotPossession` başı (~1162) + içindeki iki `_res()` çağrısı (~1225, ~1234)
**Ne yapıyordum:** Şut cümlesi `onResult` ile script sonunda basılıyor; sıradaki olay erken gelince `clearBallTimers()` script'i çalıştırmadan siliyor ve o basketin cümlesi kayboluyordu (orphan=1). `S.pendingPaint` ekleyip flush'ta bastırdım.
**Ne kaldı:** orphan 0 oldu **ama** cümle artık top çembere varmadan basıldığı için `identityMatch` **%100 → %64** düştü (syncRatio farkı da 1,94 → 2,46). Yani "hiç basılmama" sorunu "yanlış anda basılma"ya dönüştü.

## Sıradaki adım
`main.js` `matchStep` içinde şutlu olayların gecikmesine **şut uçuş payı** ekleyip (`simMs`'e `+shotDur`) `pendingPaint` flush'ını olay değişiminden çıkar — böylece orphan=0 ve kimlik %100 aynı anda tutar; sonra M9 → M12 → M14 → FAZ 6.

## Dikkat / takıldığım yer
- **Bu oturumda `visual-check.js` ve `i18n-scan.js` FAZ 1-4 sonrası ÇALIŞTIRILMADI** — yeni oturumda ilk iş.
- Yeni top kaybı anlatım satırları (`%S pasını kontrol edemedi — topu %R aldı.` vb.) Türkçe yazıldı; **`js/i18n-dict.js`'e İngilizce karşılıkları eklenmedi**.
- Kapanmayan maddeler: **M9** (ribaund sonrası outlet pas yok — `match-engine.js` ~1130 `let pg=…` ve ~1304 `bringT`), **M12** (AND-1'de serbest atış canlandırılmıyor — and-1 dalı ~2130), **M14** (şut saati; hücum ribaundunda 24 yerine 14 — `main.js` `startClockTween` ~318), **M20** (rakip kadro kalıcılığı), **FAZ 6** (B4 sezon ödülleri, B5 zorluk seviyesi, C2/C3, yerel font, Tauri/Steam, mobil test).
- `syncRatio` tipler arası fark 1,9-2,0 — hedef < 1,9, sınırda.
- Alternatif çözüm yolu (istenirse): son 3 değişikliği geri al → kimlik %100'e döner, orphan≈1 kalır.
