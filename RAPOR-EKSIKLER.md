# CHARAZAY 2.0 — TAM SÜRÜM DENETİM RAPORU
Tarih: 2026-07-06 · Dosya: `charazay2.0.html` · Denetim türü: baştan sona kod taraması

> **DURUM (6. oturum güncellemesi):** ✅ **A1, A2, A3, A4, C1, C4, C5 uygulandı ve test edildi** (bkz. PROGRESS.md 6. oturum).
> Bekleyenler: C2, C3 (kozmetik) ve B1–B6 (büyük yeni özellikler) — ayrı tur olarak sonra ele alınacak.

**Genel durum:** Oyun çalışıyor, tüm butonlar bağlı (statik + dinamik onclick handler'ların hepsi tanımlı — **kopuk buton YOK**), JS syntax temiz. Aşağıdakiler tam sürüm için doldurulması gereken gerçek eksikler ve mantık hatalarıdır. Öncelik sırasına göre dizildi.

---

## A · KRİTİK MANTIK HATALARI (olmazsa olmaz — mutlaka düzeltilmeli)

### A1. Rakip takımlar "soyut" — kök sorun
Rakip kadrolar her maçta `getBotClubProfile()` ile yeniden üretiliyor; kalıcı oyuncu nesnesi, istatistik, faul, sakatlık **tutulmuyor**. Aşağıdaki A2/A3 sorunlarının kaynağı bu. Rakip tarafta da maç boyunca kalıcı 5+yedek oyuncu izlenmeli.
- Konum: `generateMatchEvents` satır ~5112-5115 (`oppRoster`, `oppPick`).

### A2. MVP sadece kullanıcı takımından seçiliyor
`pstats` (maç istatistiği) yalnızca `userPos` true iken toplanıyor (`bumpP` sadece kullanıcı için çağrılıyor). MVP hesabı bu yüzden **hep senin oyuncularından** çıkıyor; rakip daha iyi oynasa bile MVP olamıyor.
- Konum: satır 5221-5222 (rakip için `bumpP` yok), MVP seçimi 5393-5405.
- Düzeltme: rakip şutör/pasör/ribaundçularına da istatistik topla, MVP'yi iki takım havuzundan seç.

### A3. Rakip oyuncular faul limitine tabi değil / oyundan atılmıyor
`recordFoul` rakip için sadece **takım çeyrek faulünü** artırıyor (`qFoulO[q]++`); bireysel oyuncu faulü ve 5 faulde oyundan atılma yok. Kullanıcı tarafında tam çalışıyor, rakip tarafı eksik.
- Konum: satır 5162-5171 (`recordFoul` else dalı), `userFoulsOut` benzeri rakip fonksiyonu yok.
- Düzeltme: rakip oyunculara `matchFouls` say, 5'te sahadan çıkar + yerine yedek al + anlatım satırı.

### A4. Galibiyet serisi (winStreak) sezon değişince sıfırlanmıyor
`startLeagueSeason` içinde `G.wins/losses/points/gameDay` sıfırlanıyor ama `G.winStreak` **sıfırlanmıyor** → yeni sezona seri devrediyor (yanlış).
- Konum: satır 3823-3826 (sıfırlama bloğu — winStreak eksik).
- Düzeltme: bloğa `G.winStreak=0;` ekle.

---

## B · EKSİK OYUN SİSTEMLERİ (boşluklar — tam sürüm için beklenir)

### B1. Transfer pazarlığı yok
Serbest oyuncu ve kulüp transferleri **sabit fiyattan direkt alım**. Teklif verme/pazarlık, rakip kulübün "hayır" demesi, açık artırma yok. Menajerlik oyununun çekirdek eksiği.

### B2. Playoff çok sığ — ✅ UYGULANDI (7. oturum, Faz 2.1)
İlk 8 → artık **seri** (best-of-7, ilk 4 galibiyet). Ev sahibi avantajı sıralamaya göre **2-2-1-1-1**. Playoff paneli seri skorunu ("2-1 önde") gösterir. **Playoff MVP** (final serisi istatistikleri) + **şampiyonluk kutlama modalı** (kupa/konfeti) eklendi. Harness ile bracket (çeyrek→yarı→final), ilk-4-galibiyet ve MVP doğrulandı.
- Konum: `js/match-prep.js` (`makeSeries`/`recordSeriesGame`/`maybeAdvancePlayoff`/`finishPlayoffs`), `js/render.js` (`renderPlayoffPanel`).

### B3. Rakip takımlarda sakatlık yok
Sakatlık sistemi (25 gerçek sakatlık) **sadece kullanıcı** oyuncularına işliyor (`rollInjuriesAfterUserMatch`). Rakip kadrolar soyut olduğu için hiç sakatlanmıyor → lig gerçekçiliği tek taraflı.

### B4. Sezon sonu bireysel ödülleri yok
Lig MVP'si, sezonun en skoreri/asistçisi, ideal beşli, en gelişen genç gibi ödüller yok. Sadece maç-MVP anonsu var.

### B5. Zorluk seviyesi yok
`difficulty/zorluk` hiç yok. Kolay/normal/zor ayarı (ekonomi, rakip gücü, sakatlık oranı) tam sürüm beklentisi.

### B6. Antrenör/oyuncu gelişiminde derinlik sınırlı
Scouting var ama izci ağı, akademi maçları, pozisyon antrenmanı (oyuncuyu farklı mevkiye çevirme) yok. (Kapsam kararına bağlı.)

---

## C · DENGE & İKİNCİL MANTIK SORUNLARI

### C1. Maçı durdurup sonucu kaydetmeme (save-scum açığı) — ✅ GERÇEKTEN DOĞRULANDI (7. oturum, Faz 1.1)
Sonuç artık **maç başında** üretilip `G.pendingMatch={sig,ev}` olarak kilitlenip kaydediliyor (`startMatch`, `js/main.js`). Durdurup/yenileyip yeniden başlatınca **aynı kilitli sonuç** uygulanır, yeniden üretilmez. `pendingMatch` save/load'a dahil; sonuç işlenince kilit kalkar (`applyMatchResult`).
- **7. oturum eklentisi:** Durdurulan maç takılı kalmasın diye "▶ Maçı Başlat" butonu durdurulunca "▶ Maçı sonuçlandır"a döner (kilitli sonuç açıkça uygulanır).
- **Gerçek tarayıcı harness testi (12/12 geçti):** durdur→sayfa yenile→"Devam Et"→sonuçlandır ⇒ skor birebir aynı; sıradaki maç farklı ⇒ yeniden oynanamıyor; kilit yenilemeden sonra da kalıcı.

### C2. Manuel koçlukta ilk yarı istatistik kaybı
Manuel değişiklik sonrası kalan maç yeniden üretilirken ilk yarı oyuncu istatistikleri kısmen kayboluyor (PROGRESS'te "kabul edildi" notu var, ama tam sürümde göze batar).
- Konum: `regenerateMatchRemainder` (5762).

### C3. Ölü/erişilmeyen kod dalı
`startMatch` sezon veya playoff şart koşuyor; buna rağmen satır 5635-5638'deki `else` dalı (sezon/playoff olmayan maç) pratikte hiç çalışmıyor. Kafa karıştırıcı; temizlenebilir.

### C4. Sıralamada averaj var, ikili averaj/head-to-head yok
Eşit puanda sıralama: puan → genel averaj (sf−sa) → isim. Head-to-head yok (kabul edilebilir ama not düşülmeli).
- Konum: `buildLeagueRows` sort, 2496-2506.

### C5. "Tur X/19" sabit yazımlar
Anlatım/haberlerde `/19` elle yazılmış (satır 5607, 3835). 20 takım için doğru ama grup boyutu değişirse kırılır.

---

## D · KOZMETİK / TEST / DAĞITIM

- **D1.** Mobil responsive akış tarayıcıda uçtan uca test edilmedi (eklenti bağlı değildi — PROGRESS notu). Gerçek cihaz/dar ekran testi lazım.
- **D2.** Ses (`sfx`) sadece basit osilatör tonları; gerçek maç/kalabalık sesi yok (opsiyonel).
- **D3.** Steam/masaüstü dağıtımı için Electron/Tauri sarmalayıcı henüz yok (ayrı adım).
- **D4.** Otomatik tarayıcı testi yapılamıyor (Chrome eklentisi bağlı değil) — manuel test listesi PROGRESS.md'de.

---

## ÖZET — ÖNCELİK SIRASI
1. **A2, A3, A4** (MVP çift takım, rakip faul-out, winStreak reset) — kullanıcının onayladığı 3 madde, hemen.
2. **A1** (rakip kadro kalıcılığı) — A2/A3'ün sağlam çözümü için altyapı.
3. **C1** (save-scum) — rekabet bütünlüğü.
4. **B1, B2, B3** (transfer pazarlığı, playoff derinliği, rakip sakatlık) — tam sürüm hissi.
5. Kalanlar (B4-B6, C2-C5, D) — cila.
