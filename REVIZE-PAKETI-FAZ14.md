# REVİZE PAKETİ — FAZ 14: SAHA ÇİZGİLERİ VE SERBEST ATIŞ YERLEŞİMİ

**Tarih:** 2026-08-30 · **Ölçülen:** `65396aa` · **Yöntem:** SVG'nin **çizilen** eğrileri
`getPointAtLength` ile 180 noktadan örneklendi (nitelik değerlerine bakılmadı) + serbest atış
anında 10 jetonun hedefine uzaklığı ölçüldü

> **ÖNCEKİ PAKETLERİN HATASI:** FAZ 13 madde 0'da *"saha geometrisi doğru, FIBA'ya uygun —
> aramayın"* yazmıştım. **Yanlıştı.** Path'in `r="196"` niteliğini okuyup doğru saymıştım;
> tarayıcının **fiilen çizdiği** eğriyi ölçmemiştim. Çizilen eğri 5,26–7,61 m arasında değişiyor.
> Bu belge o hatayı düzeltiyor. FAZ 13'ün "aramayın" satırı **geçersizdir.**

---

## A · 3 SAYI YAYI YANLIŞ ÇİZİLİYOR — KÖK NEDEN

### F14-1. Yay, potaya değil DİP ÇİZGİYE merkezli çiziliyor
**KRİTİK · KÖK NEDEN**

```svg
<path d="M 56.4 30 L 56.4 48.5 A 196 196 0 1 1 56.4 451.5 L 56.4 470">
```

Yayın iki ucu da **x = 56.4**'te, yani dip çizgide. İki uç arası kiriş = 403 px, yarısı **201,5**.
Ama istenen yarıçap **196** — kirişin yarısından küçük.

SVG kuralı: yarıçap kirişi kapsamıyorsa tarayıcı **yarıçapı sessizce büyütür.** Yani ekrana çizilen
yay r = 196 değil **201,5**, ve merkezi pota değil **dip çizgi (56.4, 250)**.

**Ölçüm — çizilen eğrinin potaya uzaklığı:**

| | Ölçülen | Olması gereken |
|---|---|---|
| Yay tepesinde (kilit üstü) | **5,26 m** | 6,75 m |
| Köşelerde | **7,61 m** | 6,60 m |
| **Aynı çizgi üzerinde fark** | **2,35 m** | **0,00 m** |

Yani "3 sayı çizgisi" bir yay değil, potaya göre **yumurta biçiminde.** Kilit üstünden atılan
şut gerçekte 5,26 m'den 3 sayı sayılıyor, köşeden 7,61 m'den.

---

### F14-2. Serbest atış yarım hilali 3 sayı yayını KESİYOR
**KRİTİK · kullanıcının gördüğü hata**

F14-1'in doğrudan sonucu. Ölçüm:

| | x |
|---|---|
| Serbest atış çemberinin en sağ noktası | **276,4** |
| 3 sayı yayının en sağ noktası | **258,0** |

Çember yayı **18,4 px** aşıyor. İki eğri **iki noktada kesişiyor**: `(251,5 · 205,2)` ve
`(254,6 · 292,7)`.

Gerçek bir sahada serbest atış çemberi 3 sayı yayının **tamamen içindedir** — potaya en uzak
noktası 6,03 m, yay 6,75 m.

---

### F14-3. Sahada olmayan çizimler var
**YÜKSEK**

```svg
<circle cx="125.2" cy="250" r="17.6" stroke="#fbbf24" stroke-width="3">
<line x1="108.2" y1="250" x2="142.2" y2="250" stroke="#fbbf24" stroke-width="3">
```

Potanın 0,76 m önünde, **1,19 m çapında** turuncu bir daire ve içinden geçen yatay bir çizgi.
Basketbol sahasında böyle bir işaret **yoktur.** Görüntüde bu daire gerçek çemberden
(0,45 m, `cx=102.6 r=6.6`) **2,7 kat büyük** olduğu için izleyici onu çember sanıyor, gerçek
çember de panoya takılmış bir cıvata gibi duruyor.

---

### F14-4. Köşe üçlüğü düz çizgileri yok
**YÜKSEK** · Yay dip çizgiden dip çizgiye tek parça gidiyor; kenar çizgisine paralel **düz köşe
bölümleri hiç yok.** FIBA'da köşe çizgisi kenar çizgisinden 0,90 m içeride ve dip çizgiden
itibaren düz gider, sonra yaya bağlanır.

---

### F14-5. Serbest atış çemberinin dolu/kesikli yarıları ters
**ORTA** · Şu an yalnız **dış** yarım daire çiziliyor ve **kesikli**. Doğrusu: dış yarı **dolu**
(serbest atış çemberinin görünen kısmı), boyanın içinde kalan iç yarı **kesikli**.

---

### F14-6. Ölçü sapmaları
**ORTA**

| Öğe | Kodda | Metre | FIBA | Fark |
|---|---|---|---|---|
| Boya genişliği | 140,8 px | 4,77 m | **4,90 m** | −0,13 |
| Boya derinliği | 167,2 px | 5,66 m | **5,80 m** | −0,14 |
| Orta yuvarlak | 48 px | 1,63 m | **1,80 m** | −0,17 |
| Yay altı (restricted) | 35,2 px | 1,19 m | **1,25 m** | −0,06 |
| Serbest atış çemberi | 52,8 px | 1,79 m | 1,80 m | ✔ |
| Çember | 6,6 px | 0,45 m çap | 0,45 m | ✔ |
| Pano | 52,8 px | 1,79 m | 1,80 m | ✔ |
| Pano–çember merkezi | 11 px | 0,372 m | 0,375 m | ✔ |

Ayrıca oyun alanı **827,2 × 440 px** → yatayda 29,54 px/m, dikeyde 29,33 px/m: saha **%0,7
yatay gerilmiş.** Gözle görülmez, düşük öncelik.

---

## B · KOPYALANABİLİR DÜZELTME

Ölçek **s = 29,54 px/m** · pota `(102.6, 250)` · dip çizgi `x = 56.4` · kenar çizgileri `y = 30 / 470`

### 3 sayı çizgisi — köşe düzlükleri + potaya merkezli yay
```svg
<!-- SOL: köşe çizgisi kenardan 0,90 m içeride (y=56.6/443.4), yay r=6,75 m=199.4 px, merkez POTA -->
<path d="M 56.4 56.6 L 151.2 56.6 A 199.4 199.4 0 0 1 151.2 443.4 L 56.4 443.4"
      fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="2.2"/>
<!-- SAĞ (ayna) -->
<path d="M 883.6 56.6 L 788.8 56.6 A 199.4 199.4 0 0 0 788.8 443.4 L 883.6 443.4"
      fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="2.2"/>
```
**Neden bu sayılar:** yay `y=56.6` çizgisini `dx = √(199.4² − 193.4²) = 48.6` px'te kesiyor →
`x = 102.6 + 48.6 = 151.2`. Kiriş 386,8 px, yarısı 193,4 < 199,4 → **tarayıcı yarıçapı
büyütmez**, çizilen yay gerçekten 199,4 olur. Bugünkü hatanın sebebi buydu.

### Boya + serbest atış çizgisi (FIBA 4,90 × 5,80 m)
```svg
<rect x="56.4" y="177.65" width="171.3" height="144.7" .../>   <!-- boya -->
<line x1="227.7" y1="177.65" x2="227.7" y2="322.35" .../>      <!-- serbest atış çizgisi -->
```

### Serbest atış çemberi (r = 1,80 m = 53,2 px) — dış DOLU, iç KESİKLİ
```svg
<path d="M 227.7 196.8 A 53.2 53.2 0 0 1 227.7 303.2" fill="none"
      stroke="rgba(255,255,255,0.95)" stroke-width="2"/>                       <!-- dış: dolu -->
<path d="M 227.7 196.8 A 53.2 53.2 0 0 0 227.7 303.2" fill="none"
      stroke="rgba(255,255,255,0.55)" stroke-width="2" stroke-dasharray="6,5"/><!-- iç: kesikli -->
```
**Kesişme kontrolü:** çemberin en sağı `227.7 + 53.2 = 280.9`; yayın tepesi `102.6 + 199.4 = 302.0`.
Aralarında **21,1 px = 0,71 m** boşluk kalıyor — artık kesişmiyorlar.

### Yay altı (restricted area, 1,25 m = 36,9 px)
```svg
<path d="M 102.6 213.1 A 36.9 36.9 0 0 1 102.6 286.9" fill="none" stroke-width="1.9"/>
```

### Orta yuvarlak
```svg
<circle cx="470" cy="250" r="53.2" .../>     <!-- 48 → 53.2 (1,80 m) -->
```

### Silinecekler
```svg
<circle cx="125.2" cy="250" r="17.6" stroke="#fbbf24" stroke-width="3">   <!-- SİL -->
<line x1="108.2" y1="250" x2="142.2" y2="250" stroke="#fbbf24" ...>       <!-- SİL -->
```
Pota görünümü için yalnız pano çizgisi (`x=91.6`) + çember (`cx=102.6 r=6.6`) kalsın. Ağ isteniyorsa
çemberin **içine** ince ışınsal çizgiler koy, dışına ikinci bir daire değil.

### Ribaund yeri işaretleri (boya kenarındaki tırnaklar)
İlk işaret dip çizgiden **1,75 m** (x = 108,1), sonrakiler **0,85 m** aralıkla:
`x = 108.1 · 133.2 · 158.3 · 183.4`. `y` değerleri yeni boya kenarına taşınmalı:
`177.65` ve `322.35` (bugün 179.6 / 320.4).

### Sağ taraf
Tüm sol taraf değerlerinin `x' = 940 − x` aynası. Yay sweep bayrağı `1` yerine `0`.

---

## C · SERBEST ATIŞ, OYUNCULAR YERLEŞMEDEN ATILIYOR

### F14-7. İlk atış anında 10 oyuncudan yalnız 2,8'i yerinde
**KRİTİK · kullanıcının gördüğü hata**

Ölçüm — 5 serbest atış serisi, topun elden çıktığı kare:

| | Ölçülen |
|---|---|
| Yerine oturmuş oyuncu | **2,8 / 10** |
| Oyuncunun hedefine ortalama uzaklığı | **2,02 m** |
| En uzaktaki oyuncu | **7,68 m** (en kötü kare 10,75 m) |
| Atış anında ortalama jeton hızı | **85 px/sn** (durmuşsa ~0 olmalı) |

Yani düdük çalıyor, oyuncular çizgiye doğru koşmaya başlıyor ve **daha yarı yoldayken** top atılıyor.

**Kök neden** — `js/match-engine.js`, serbest atış dalı:
```js
const eta = Math.hypot(shooter.x-line[0], shooter.y-line[1])
            / Math.max(120, shooter.sprintV||_PL_MAXV) + 0.40;
const tBase = Math.max(0.85, Math.min(2.2, eta));      // ⟵ SORUN
```
Bekleme süresi **yalnız şutörün** çizgiye olan mesafesinden hesaplanıyor. Oysa `_setFtFormation`
**on oyuncuyu birden** yerleştiriyor. Şutör zaten çizgiye yakınsa `tBase` 0,85 sn'ye düşüyor ve
sahanın öbür ucundaki pivot daha koşarken atış yapılıyor. Üstelik tavan **2,2 sn** — 10 m uzaktaki
bir oyuncunun varması ~3–4 sn sürer, tavan buna izin vermiyor.

**Düzeltme:**
```js
/* Bekleme, ON OYUNCUNUN EN GEÇ GELENİNE göre — şutöre göre değil. */
const etaOf = p => Math.hypot(p.x-(p.tx??p.x), p.y-(p.ty??p.y))
                   / Math.max(120, p.sprintV||_PL_MAXV);
const enGec  = Math.max(...offP.concat(defP).map(etaOf));
const tBase  = Math.max(1.6, Math.min(4.5, enGec + 0.45));
```
Taban 0,85 → **1,6 sn** (düdük sonrası duraklama gerçekçi olsun), tavan 2,2 → **4,5 sn**.

**Kabul kriteri:** İlk serbest atış topu elden çıkarken 10 oyuncudan **≥ 9'u** hedefinin 0,3 m
yakınında ve ortalama jeton hızı **< 15 px/sn**.

---

## D · YENİ ARAÇ — `tools/geometri-check.js`

**Bu paketin en önemli maddesi.** Mevcut araçların hiçbiri saha çizgisine bakmıyor; FAZ 13'te
geometriyi "doğru" ilan etmemin sebebi de path niteliklerini okuyup **çizilen eğriyi** ölçmemekti.

Araç şunu yapmalı — **nitelik okumak yasak**, yalnız `getPointAtLength`:

```js
const L = path.getTotalLength();
const pts = []; for (let i=0;i<=360;i++) pts.push(path.getPointAtLength(L*i/360));
// her eğri için potaya uzaklığın min/max/sapması
```

| Denetim | Hedef |
|---|---|
| 3 sayı yayının potaya uzaklığı — **sapma** (max − min) | **≤ 0,05 m** (bugün 2,35 m) |
| 3 sayı yayı yarıçapı | 6,75 m ± 0,05 |
| Köşe çizgisinin kenar çizgisine uzaklığı | 0,90 m ± 0,05 |
| Serbest atış çemberi ↔ 3 sayı yayı **kesişme** | **0 nokta** |
| Yay altı yarıçapı | 1,25 m ± 0,05 |
| Boya | 4,90 × 5,80 m ± 0,05 |
| Orta yuvarlak | 1,80 m ± 0,05 |
| Çember çapı · pano genişliği · pano–çember | 0,45 / 1,80 / 0,375 m ± 0,02 |
| Yatay ve dikey ölçek farkı | ≤ %0,5 |
| **Sahada karşılığı olmayan çizim** | **0** (beyaz liste dışı her `stroke`'lu öğe rapor edilsin) |
| **Herhangi iki çizginin beklenmedik kesişmesi** | **0** |

Ayrıca `tools/sunum-check.js`'e **F14-7 kriteri** eklensin (serbest atışta yerleşme).

---

## E · ÖNCELİK

| Sıra | Madde | Neden |
|---|---|---|
| **1** | **D — `geometri-check.js`** | Önce ölçemezsek yine gözden kaçar; bu paketin varlık sebebi bu |
| **2** | **F14-1 + F14-2** yay merkezi ve yarıçapı | Kullanıcının gördüğü hata; tek düzeltme ikisini birden kapatır |
| **3** | **F14-7** serbest atış beklemesi | Kullanıcının gördüğü ikinci hata |
| 4 | F14-3 sahte çember çizimi | Görsel olarak en dikkat çeken yanlış |
| 5 | F14-4 köşe düzlükleri | Yay düzeltmesinin parçası |
| 6 | F14-5, F14-6 | Dolu/kesikli yarılar ve ölçü sapmaları |

## REGRESYON

```
node tools/geometri-check.js          (YENİ — hepsi geçmeli)
node tools/sunum-check.js --ms=300000 (F14-7 kriteri eklenmiş hâliyle)
node tools/spacing-check.js
node tools/box-band.js --n=200        → 11/11 (çizgi değişikliği matematiği etkilememeli)
node tools/band.js                    → hash DEĞİŞMEMELİ
```

> **Dikkat — `THREE_R` hem çizime hem şut üretimine giriyor.** `js/match-engine.js:13`
> `const THREE_R=196` ve satır 29 üçlük şut koordinatını `rand(THREE_R+5, THREE_R+34)` ile
> üretiyor. Yani sabiti 196 → **199.4** yaptığında **şut koordinatları da kayar** ve
> `band.js` hash'i **değişir** — bu beklenen ve doğrudur (bugün üçlükler gerçek yayın
> içinden atılıyor). O zaman `box-band --n=200` **11/11 tutmalı** (üçlük deneme payı bandı
> 0,22–0,44 içinde kalmalı) ve yeni hash `KALDIGIM-YER.md`'ye referans yazılmalı.
>
> Ayrıca satır 29'daki `+5 … +34` payı yayın **dışını** hedefliyor; çizilen yay bugün
> potaya göre 5,26–7,61 m arasında değiştiği için bu pay hiçbir zaman tutarlı çalışmadı.
> Düzeltmeden sonra `THREE_R + 5` gerçekten "yayın 0,17 m dışı" anlamına gelecek.
