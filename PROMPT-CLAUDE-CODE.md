# CLAUDE CODE — SIRADAKİ İŞ

> `DEVAM-ET.md` protokolü geçerlidir. Sırayı bozma; her bölüm bittiğinde commit at ve
> `KALDIGIM-YER.md` ile `PROGRESS.md`'yi güncelle.

## DURUM

FAZ 11, 12, 13 ve Bölüm 3-4-5 **uygulandı** (`65396aa`). Bağımsız denetim sonrası kalanlar:

| Belge | Durum |
|---|---|
| `REVIZE-PAKETI-FAZ14.md` | **YENİ · hiç uygulanmadı** — saha çizgileri + serbest atış yerleşimi |
| `DENETIM-FAZ13.md` bölüm 2 | **YENİ** — bağımsız denetimde çıkan 3 gerileme |

---

## SIRA

```
BÖLÜM A  FAZ 14 — saha çizgileri + serbest atış yerleşimi   (kullanıcının gördüğü hatalar)
BÖLÜM B  DENETIM-FAZ13.md bölüm 2 — üç gerileme
```

---

# BÖLÜM A — FAZ 14

**Tam belge: `REVIZE-PAKETI-FAZ14.md`. Oku ve uygula.** Kopyalanabilir SVG düzeltmeleri orada.

Kullanıcının iki şikâyeti, ikisi de ölçülerek doğrulandı:

**1) "üçlük ve faulün yarım hilali birbirini aşıyor"** — doğru.
3 sayı yayı potaya değil **dip çizgiye** merkezli çiziliyor. Sebep: path'in iki ucu da `x=56.4`'te,
kiriş 403 px, yarısı 201,5 — ama yazılan yarıçap 196. SVG kuralı gereği tarayıcı yarıçapı
**sessizce 201,5'e büyütüyor** ve merkezi dip çizgiye kaydırıyor.
Sonuç: çizilen çizgi potaya **kilit üstünde 5,26 m, köşelerde 7,61 m** — aynı çizgi üzerinde
**2,35 m fark.** Serbest atış çemberi (en sağ x=276,4) yayı (en sağ x=258,0) aşıyor ve
`(251,5·205,2)` ile `(254,6·292,7)` noktalarında **kesişiyor.**

**2) "oyuncular daha yerleşmeden faul atışı yapılıyor"** — doğru.
İlk atış topu elden çıkarken 10 oyuncudan yalnız **2,8'i** yerinde; en uzaktaki oyuncu
**7,68 m** uzakta; ortalama jeton hızı **85 px/sn**. Sebep: bekleme süresi yalnız **şutörün**
mesafesinden hesaplanıyor ve **2,2 sn tavanı** var, oysa 10 oyuncu birden yerleşiyor.

**Öncelik (belgedeki E bölümü):**
1. `tools/geometri-check.js` yaz — **önce bu.** Nitelik okumak yasak, yalnız `getPointAtLength`.
2. F14-1 + F14-2 — yay merkezi ve yarıçapı (tek düzeltme ikisini kapatır)
3. F14-7 — serbest atış beklemesi
4. F14-3 — sahada karşılığı olmayan turuncu daire/çizgi
5. F14-4, F14-5, F14-6 — köşe düzlükleri, dolu/kesikli yarılar, ölçü sapmaları

**Uyarı:** `THREE_R` (satır 13) hem çizime hem şut koordinatı üretimine giriyor (satır 29).
196 → 199,4 yapınca `band.js` hash'i **değişecek** — beklenen. `box-band --n=200` 11/11 tutmalı.

---

# BÖLÜM B — DENETİMDE ÇIKAN ÜÇ GERİLEME

**Tam belge: `DENETIM-FAZ13.md` bölüm 2.**

### B-1. EN modunda canlı anlatım bozuldu: %3 → %35 Türkçe · **KRİTİK**
Aynı komutla 75 sn canlı maç: `c2c46b3` 40 satırda 1 Türkçe (%3), `65396aa` 48 satırda
**17 Türkçe (%35)**. FAZ 13'ün eklediği ribaund ve oyuncu adlı faul kalıplarının İngilizcesi
yazılmamış. Melez cümle örneği: *"rakibi arkasında tuttu ve **rebounding**u aldı"* — kalıp
katmanı Türkçe cümlenin içindeki tek kelimeyi çevirmiş.

`i18n-scan.js` bunu görmüyor çünkü sayfaları tarıyor, **canlı anlatım akışını taramıyor.**

**Yapılacak:** Eksik kalıpların EN karşılığını ekle **ve** `i18n-scan.js`'e canlı anlatım
taraması ekle: 60 sn maç izle, EN modunda Türkçe kalan satır oranı **< %5** olsun.

### B-2. `sunum-check` M9 düştü — outlet pası %80 → %76 · **ORTA**
`c2c46b3` geçiyor; `65396aa` 300 sn'de 9/12 (%75), 420 sn'de 16/21 (%76). İki pencerede,
artan örneklemle aynı — gürültü değil. Muhtemel sebep: FAZ 13'ün eklediği ribaund olayı
ribaund sonrası kare zamanlamasını değiştirdi.

> `cf36a74` bunu "gerileme değil, örneklem yetersiz" diye kapatmış. Ölçüm desteklemiyor:
> **eski sürüm aynı komutla geçiyor.**

### B-3. `live-metrics` belgelenen komutta düşüyor · **ORTA**
`--ms=360000`: `c2c46b3` yayılım **1,35×** ✓, `65396aa` **3,28×** ✗ (tekrar 3,1×).
Medyan 2,54× → 3,78×.

`65396aa` bunu `--ms=540000`'de iki sürümün de düşmesine dayanarak kapatmış — o kısım doğru,
ölçü tanımı kusurlu (bir pozisyonun tüm olayları aynı `t` değerini taşıyor). Ama belgelenen
regresyon komutu eskiden geçip şimdi düşüyor.

**Yapılacak:** Oranı olay başına değil **pozisyon başına** hesapla (commit'in kendi teşhisi).

### B-4. `spacing-check` yalnız süzülmüş kareleri raporluyor · **DÜŞÜK**
Araç "oturmuş set kareleri"nde markaj 1,96 m / boyada %76 diyor. Bağımsız ölçümde, izleyicinin
gördüğü **tüm yarı saha karelerinde** markaj **3,15 m**, boyada **%39**, orta üçte bir **%36**.
Araca **süzülmemiş** ikinci bir rapor bloğu ekle; hedefler orada da tutmalı.

### B-5. `season-loop` K2 kararsız · **DÜŞÜK**
Bir koşuda düştü, ikincide geçti (1,72×). Tohumla deterministik yap.

---

## ARAMAYIN — YANLIŞ ALARM

| Görünen | Gerçek |
|---|---|
| `faz6-check` 5/7 (F6, F7) | `dist-desktop/` gitignore'da, temiz klonda yok. **`c2c46b3`'te de aynı.** Kullanıcının bilgisayarında geçer. |
| `band.js` hash değişti | FAZ 13'te beklenen; `box-band` 11/11 tuttuğu için denge korunmuş. FAZ 14'te tekrar değişecek. |
| `i18n-scan` "Türkçe kaldı" satırları | Hepsi özel isim + "Türkiye" ülke adı. |
| FAZ 13 madde 0'daki *"saha geometrisi doğru, FIBA'ya uygun — aramayın"* | **O SATIR GEÇERSİZ.** Path nitelikleri okunmuş, çizilen eğri ölçülmemişti. FAZ 14 bunu düzeltiyor. |

---

## GENEL KURALLAR

- **Mevcut kodu silme veya bozma.** Minimal değişiklik, düzenlemeyi yeniden yazmaya tercih et.
- Görsel bir şey değiştirdiysen **ekran görüntüsü al ve bak** — sayısal test çizgi hatasını görmez.
- Geometri ölçerken **nitelik değeri okuma**; `getPointAtLength` ile çizilen eğriyi ölç.
- "Uyguladım" demeden önce **ölç.** Her bölümün kabul kapısı belgesinde yazılı.
- Emin olmadığın bir şey varsa tahmin etme — dur ve sor.
- Script sürümünü (`?v=`) js dosyaları değiştiğinde artır.

## TAM REGRESYON

```
node tools/geometri-check.js           (YENİ — Bölüm A)
node tools/anlatim-check.js
node tools/spacing-check.js
node tools/mobile-check.js
node tools/sim-node.js --n=50
node tools/schema-check.js
node tools/season-loop.js --n=3 --runs=3
node tools/faz7-check.js
node tools/faz8-check.js
node tools/faz10-check.js
node tools/faz11-check.js
node tools/m20-check.js
node tools/sunum-check.js --ms=300000
node tools/visual-check.js
node tools/live-metrics.js --ms=360000
node tools/box-band.js --n=200
node tools/band.js
node tools/i18n-scan.js
```
