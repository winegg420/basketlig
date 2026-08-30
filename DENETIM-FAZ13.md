# BAĞIMSIZ DENETİM — FAZ 11 / 12 / 13 + Bölüm 3-4-5

**Tarih:** 2026-08-30 · **Denetlenen:** `65396aa` · **Karşılaştırılan:** `c2c46b3` (FAZ 13 öncesi)
**Yöntem:** Claude Code'un kendi araçlarına ek olarak, **kendi bağımsız ölçüm harness'ım** iki
sürümde de aynı komutlarla çalıştırıldı. Kabul, aracın kendi raporuna değil bu karşılaştırmaya dayanıyor.

---

## 1. ÇALIŞAN VE DOĞRULANAN

| Ne | Nasıl doğrulandı | Sonuç |
|---|---|---|
| **Motor `G`'den ayrıldı, saf Node'da çalışıyor** | `node tools/sim-node.js --n=50` | 50 maç **1,2 sn** · hata 0 · aynı tohum aynı maç · `G` değişmedi |
| **Devre arasında saha değişiyor** | Kendi sondam, çeyrek başına şut x'i | Q1-Q2 bir yön, **Q3-Q4 ters yön** — canlı sitede 124/124 şut aynı yöndeydi |
| **Sekme arka planda maç donmuyor** | Kendi sondam: 25 sn arka plan | olay **1 → 16** arka planda ilerledi, dönünce **19**'a devam etti. Canlı sitede 102 dakika donmuştu |
| Denge bantları | `box-band --n=200` | **11/11** |
| Kullanıcı/rakip skor farkı | `band.js` iki sürümde | 18,7 → **16,7** (kötüleşme yok) |
| Şema | `schema-check` | **19/19** · kod tabanında Supabase bağlantısı yok |
| Önceki fazlar | faz7 / faz8 / faz10 / m20 | **8/8 · 6/6 · 27/27 · geçti** |
| Mobil | `mobile-check` + kendi ekran görüntüm | Alt sekme çubuğu, kompakt tabela, saha üstte, yapılacaklar rozeti **var** |

### Saha dizilimi — kendi harness'ımla iki sürüm karşılaştırması

Yarı saha fazı (top saldırılan yarıda), 330 kare, ölçek 29,54 px/m:

| Metrik | Öncesi `c2c46b3` | Sonrası `65396aa` | Hedef |
|---|---|---|---|
| Hücumun saldırdığı potaya uzaklığı | 8,12 m | **6,73 m** | ≤ 7 ✔ |
| Orta üçte birdeki hücumcu oranı | %48 | **%36** | < 20 ✗ |
| Savunmacı–hücumcu ortalama | 3,67 m | **3,15 m** | < 3 ✗ |
| Topu tutana en yakın savunmacı | 3,00 m | **2,74 m** | < 1,8 ✗ |
| Boyada ≥1 hücumcu olan kare | %38 | **%39** | ≥ 60 ✗ |
| Hücum ikili mesafe | 7,41 m | 7,22 m | ≥ 4,5 ✔ |

**Yorum:** İyileşme gerçek ve her metrikte aynı yönde. Ama `spacing-check.js`'in raporladığı
rakamlar (markaj 1,96 m · boyada %76 · orta üçte bir %12) **daha iyimser**, çünkü o araç yalnız
"oturmuş set karelerini" süzüyor. İzleyicinin gerçekten gördüğü karelerde tablo yukarıdaki gibi.
**Araç yanlış değil, kapsamı dar** — hedefler bu dar kapsamda tutuyor, tüm yayında tutmuyor.

---

## 2. GERİLEMELER — DÜZELTİLMESİ GEREKİYOR

### D-1. EN modunda canlı anlatım bozuldu: %3 → %35 Türkçe
**KRİTİK · net gerileme**

Aynı komutla iki sürüm, EN modunda 75 saniyelik canlı maç:

| | Anlatım satırı | Türkçe kalan |
|---|---|---|
| `c2c46b3` | 40 | **1 (%3)** |
| `65396aa` | 48 | **17 (%35)** |

FAZ 13'ün eklediği satırların (ribaund, oyuncu adlı faul, bazı şut kalıpları) İngilizce karşılığı
**yazılmamış.** Örnekler:

```
Foul — Gabe Chukwu (kişisel 2) · Lang bu çeyrek 4. takım faulü. Faul verildi; top çizgi dışından…
Gabriele Fontecchio köşe şutu çemberden döndü.
Pota altı Mindaugas Sabonis'nin; top Mersin Şahinleri'de.
Luguentz Gilgeous rakibi arkasında tuttu ve reboundingu aldı.     ← melez, en kötüsü
```

Son satır özellikle kötü: kalıp katmanı Türkçe cümlenin **içindeki tek kelimeyi** çevirmiş
("ribaund" → "rebounding") ve ortaya anlamsız bir melez çıkmış.

`i18n-scan.js` bunu **yakalamıyor** — sayfaları tarıyor, canlı anlatım akışını taramıyor.

**Yapılacak:** FAZ 13'te eklenen tüm anlatım kalıplarının EN karşılığını `i18n-dict.js` /
`i18n-commentary.js`'e ekle. `i18n-scan.js`'e **canlı maç anlatımı taraması** ekle
(60 sn maç izle, EN modunda kalan Türkçe satır oranı < %5 olsun).

---

### D-2. `sunum-check` M9 düştü — çıkış (outlet) pası %80'in altına indi
**ORTA · net gerileme**

| | M9 sonucu |
|---|---|
| `c2c46b3` | ✓ geçti |
| `65396aa` (300 sn) | ✗ 9/12 = **%75** |
| `65396aa` (420 sn) | ✗ 16/21 = **%76** |

İki farklı pencerede, artan örneklemle aynı sonuç — **gürültü değil.** Muhtemel sebep: FAZ 13'ün
eklediği ribaund olayı, ribaund sonrası kare zamanlamasını değiştirdi ve outlet pası her seferinde
kurulmuyor.

> **Not:** `cf36a74` commit'i bunu *"gerileme değil, aracın örneği yetersiz"* diye kapatmış.
> Ölçüm bunu desteklemiyor: eski sürüm aynı komutla **geçiyor.**

---

### D-3. `live-metrics` belgelenmiş komutta artık düşüyor
**ORTA · kısmen gerileme**

`KALDIGIM-YER.md`'deki regresyon komutu `--ms=360000`:

| | syncRatio yayılımı |
|---|---|
| `c2c46b3` | **1,35×** ✓ (hedef < 1,9×) |
| `65396aa` | **3,28×** ✗ · tekrar: 3,1× |

Ayrıca medyan 2,54× → 3,78×: oynatma, oyun saatine göre **%50 yavaşladı**.

`65396aa` commit'i bunu "gerileme değil" diye kapatmış; gerekçesi `--ms=540000`'de iki sürümün de
düşmesi. **İkisi de doğru:** daha uzun pencerede eski sürüm de düşüyor (ölçü tanımı kusurlu, bir
pozisyonun tüm olayları aynı `t` değerini taşıyor). **Ama** belgelenen komut eski sürümde geçip
yenide düşüyor ve regresyon kapısı artık çıkış kodu 1 veriyor.

**Yapılacak:** Ya aracı düzelt (oranı olay başına değil **pozisyon başına** hesapla — commit'in
kendi teşhisi bu), ya da `KALDIGIM-YER.md`'deki komutu tutarlı bir pencereye sabitle. Kapının
sürekli kırmızı kalması, gerçek bir gerilemenin görülmemesine yol açar.

---

## 3. GERİLEME OLMAYANLAR — ARAMAYIN

| Görünen sorun | Gerçek |
|---|---|
| `faz6-check` **5/7** (F6, F7 düşüyor) | `dist-desktop/` `.gitignore`'da; temiz klonda hiç yok. **Aynı sonuç `c2c46b3`'te de çıkıyor.** Senin bilgisayarında klasör var, orada geçer. |
| `band.js` hash değişti | Beklenen — motor sözleşmesi ve olay listesi değişti. `box-band` 11/11 tuttuğu için denge korunmuş. |
| `season-loop` K2 düştü | **Kararsız.** İkinci koşuda geçti (1,72×). 3 koşunun ortalamasına bakan rastgele bir kriter; tek koşuda düşmesi tek başına anlam taşımıyor. |
| `i18n-scan` "Türkçe kaldı" satırları | Hepsi özel isim (takım/oyuncu adı) ve "Türkiye" ülke adı. Sorun değil. |

---

## 4. KENDİ HATAMI DÜZELTİYORUM

FAZ 11 ve FAZ 13'te canlı siteden **"boyada oyuncu %0", "hücum potaya 9,3 m uzakta",
"ikili mesafe 2,64 m"** diye raporlamıştım. Kendi harness'ımı `c2c46b3` üzerinde **maç akarken**
çalıştırınca aynı kod **%38 boyada, 8,12 m, 7,41 m** veriyor.

Fark ölçüm koşulundan: canlı sitedeki maç **donmuş** bir karedeydi ve FAZ 11'in örneklemesi
arka plandaki sekmede sadece 25 kare yakalayabilmişti. **Yerleşim hiçbir zaman o kadar bozuk
değildi; asıl sorun donma (F13-14) idi** — ve o düzeldi.

Bu, FAZ 13'ün yaptığı işi geçersiz kılmıyor (tüm metrikler gerçekten iyileşti) ama sorunun
büyüklüğünü olduğundan fazla göstermiştim.

---

## 5. SIRADAKİ İŞ (öncelik sırasıyla)

| # | İş | Neden |
|---|---|---|
| 1 | **D-1** — FAZ 13 anlatım kalıplarının EN çevirisi + `i18n-scan`'e canlı anlatım taraması | EN oyuncu maçın üçte birini Türkçe görüyor; "reboundingu aldı" gibi melez cümleler var |
| 2 | **D-2** — outlet pası %80 eşiğine geri | Net gerileme, `sunum-check` kırmızı |
| 3 | **D-3** — `live-metrics` oranını pozisyon başına hesapla | Regresyon kapısı sürekli kırmızı kalmasın |
| 4 | `spacing-check`'e **süzülmemiş** ikinci bir rapor bloğu ekle | Hedefler dar kapsamda tutuyor; tüm yayında markaj 3,15 m ve boyada %39 |
| 5 | Savunma markajını gerçekten 1,8 m'ye indir; boyada oyuncu oranını yükselt | Tüm yayında hedefler hâlâ tutmuyor |
| 6 | `season-loop` K2'yi tohumla deterministik yap | Kararsız kriter yanlış alarm üretiyor |
