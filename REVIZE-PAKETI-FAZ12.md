# REVİZE PAKETİ — FAZ 12: MOBİL ARAYÜZ
**Tarih:** 2026-08-30 · **Ölçülen:** `origin/master` (`c2c46b3`), 390×844 gerçek mobil viewport, dokunmatik
**Yöntem:** Her sayfada dokunma sayısı, birincil eylemin ekran derinliği, ekran görüntüsü incelemesi

> Hedef: **telefonda kafa karıştırmayan, az dokunuşla her şeyin yapılabildiği** bir arayüz.
> Çok oyunculu bir oyunda oyuncu günde birkaç kez kısa süreliğine girer — her fazladan dokunuş kayıptır.

---

## 1. ÖLÇÜM — BUGÜNKÜ DURUM

### Gezinme maliyeti

| Ölçüm | Sonuç |
|---|---|
| Kenar menü konumu (mobil) | **x = −260 px** (ekran dışında) |
| Hamburger butonu | Görünür — menüyü açan **tek** yol |
| Alt sekme çubuğu | **Yok** |
| **Her sayfa değişimi** | **2 dokunuş** (hamburger → menü öğesi) |

### Çekirdek işlerin dokunma sayısı

| İş | Bugün | Hedef |
|---|---|---|
| Lig tablosunu gör | 2 | **1** |
| Sıradaki maçı gör | 2 | **1** |
| Maçı izle | 3 | **2** |
| İlk 5'i düzenle | 4 | **2** |
| Taktik değiştir | 4 | **2** |
| Antrenman ayarla | 4 | **2** |
| Oyuncu satın al | 5 | **3** |

### Birincil eylemin ekran derinliği

| Sayfa | Birincil eylem | Kaçıncı ekranda |
|---|---|---|
| Ana Panel | Maçı Başlat | 0,2 |
| Lig · Bilanço · Analiz · Arena · Antrenman | — | 0,2 |
| Altyapı | KADROYA AL | 0,5 |
| Kadro | Markete Koy | 0,7 |
| **Maçlar** | **Maçı Başlat** | **2,5** ⚠ |

**Oyunun en önemli eylemi, en derindeki eylem.** Telefonda maçı başlatmak için iki buçuk ekran
aşağı kaydırmak gerekiyor.

---

## 2. MOBİL MAÇ SAYFASI — ÖNCELİK TERS

390×844 ekranda sayfa yukarıdan aşağıya şöyle:

| Bölüm | Kapladığı yer | Değerlendirme |
|---|---|---|
| Üst bar | 50 px | — |
| **Tabela** (dikey: takım/skor, takım/skor) | **~380 px (%45)** | "0 – 0" yazmak için ekranın yarısı |
| Şut haritası filtreleri (6 radyo, 2 satıra taşıyor) | ~150 px | Masaüstü kontrolü, telefonda gereksiz |
| Açıklama metni ("O = isabetli şut…") | ~90 px | Kalıcı yardım metni |
| **Canlı saha** | **~200 px (%24)** | **Oyunun ana olayı, en küçük öğe** |
| Maç içi istatistik tablosu | ~300 px | — |
| **Maçı Başlat butonu** | **y ≈ 2093 px** | 2,5 ekran aşağıda |

Yani telefonda **tabela sahadan 2 kat büyük**, kalıcı yardım metni sahadan neredeyse yarısı kadar
yer kaplıyor, ve başlat butonu görünmüyor.

---

## 3. MADDELER

### F12-1. Alt sekme çubuğu ekle — tek maddede tüm gezinmeyi yarıya indirir
**KRİTİK** · Bugün her sayfa 2 dokunuş; alt çubukla **1 dokunuş**.

Kenar menü masaüstünde kalsın; mobilde (`@media(max-width:768px)`) ekranın altına sabit 5'li çubuk:

```
┌─────┬─────┬─────┬─────┬─────┐
│ 🏠  │ 👥  │ 🏀  │ 🏆  │ 💰  │
│ Ana │Kadro│ Maç │ Lig │Market│
└─────┴─────┴─────┴─────┴─────┘
```

- Yükseklik **56 px** + `env(safe-area-inset-bottom)` (iPhone çentiği)
- Aktif sekme turuncu, diğerleri gri
- Kalan sayfalar (Altyapı, Antrenman, Arena, Bilanço, Analiz, Takım) hamburgerde kalsın —
  günlük kullanımda değil, haftalık kullanımda açılan sayfalar
- `position:fixed; bottom:0` + içerik kabına `padding-bottom:56px`

**Kabul kriteri:** Lig, Kadro, Maç, Market ve Ana Panel'e **1 dokunuşla** ulaşılıyor.

---

### F12-2. Mobil maç sayfasını yeniden sırala — saha en üste
**KRİTİK**

Yeni sıra (yukarıdan aşağıya), 390 px genişlikte:

| Sıra | Bölüm | Hedef yükseklik |
|---|---|---|
| 1 | **Kompakt tabela** — tek satır: `Mobil UX **0** — **0** Deplasman` · altında `1P 10:00` | **80 px** |
| 2 | **Canlı saha** — tam genişlik, kenar boşluğu yok | **~260 px** |
| 3 | **Eylem şeridi** — `▶ İzle` · `⏸ Mola` · `🎧 Manuel` · `⚙ Taktik` | 56 px |
| 4 | Anlatım akışı (son 3 satır, genişletilebilir) | ~120 px |
| 5 | Maç içi istatistik (katlanmış, dokununca açılır) | 44 px kapalı |
| 6 | Şut haritası filtreleri (katlanmış) | 44 px kapalı |

Böylece **ilk ekranda** tabela + saha + eylem butonları birlikte görünür — kaydırma gerekmez.

**Ayrıca:**
- Dikey tabelayı yatay yap (`flex-direction: row` mobilde)
- `"O = isabetli şut, X = kaçan şut…"` açıklamasını **ⓘ** simgesine al
- Sahanın altın çerçevesini mobilde inceltl (40 px → 8 px)
- Şut haritası 6 radyo düğmesini tek `<select>`e ya da katlanır bölüme çevir

**Kabul kriteri:** 390×844'te maç sayfası açıldığında tabela, saha ve `▶ İzle` butonu **kaydırmadan**
görünüyor; `Maçı Başlat` **0,5 ekrandan** derinde değil.

---

### F12-3. Birincil eylem mobilde sabit (sticky) olsun
**YÜKSEK**

Her sayfanın bir ana eylemi var. Mobilde bu buton, sayfa nereye kaydırılırsa kaydırılsın
**alt çubuğun hemen üstünde sabit** dursun.

| Sayfa | Sabit buton |
|---|---|
| Maçlar | `▶ Maçı İzle` (maç varsa) |
| Kadro | `✓ İlk 5'i Kaydet` (değişiklik varsa) |
| Market | `Teklif Ver` (oyuncu seçiliyse) |
| Antrenman | `Antrenmanı Uygula` |

**Kabul kriteri:** Birincil eylem her zaman ekranda; kaydırma gerektirmiyor.

---

### F12-4. Bilgi yoğunluğu çok düşük — üç sayı yarım ekran
**YÜKSEK** · Ölçüm: Analiz sayfasında `GALİBİYET`, `SAYI ORT.`, `AVERAJ` kartları her biri
~140 px — üçü birlikte **420 px**, ekranın yarısı. İçerik: üç sayı.

Aynı desen Arena, Bilanço, Antrenman sayfalarında da var.

**Düzeltme:** Mobilde tek satırlık üçlü rozet:

```css
@media(max-width:768px){
  .stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
  .stat-row .stat{padding:10px 6px;text-align:center;}   /* ~72 px toplam */
  .stat-row .stat .label{font-size:10px;opacity:.7}
  .stat-row .stat .value{font-size:20px;font-weight:800}
}
```

420 px → **72 px**. Aynı bilgi, altıda bir yer.

**Kabul kriteri:** Hiçbir mobil sayfada tek bir sayıyı göstermek için 100 px'den fazla dikey yer kullanılmıyor.

---

### F12-5. Boş durum ekranları yeni oyuncuyu karşılıyor
**ORTA** · Yeni kariyerde Analiz sayfası iki kez *"Veri yok — birkaç maç oyna, grafikler burada oluşur"*
gösteriyor. Oyuncunun gördüğü ilk Analiz ekranı boş.

**Düzeltme:** Boş sayfayı göstermek yerine, veri yokken o sayfayı **alt çubukta gösterme** ya da
kartı gizle. Boş durum gerekiyorsa tek satır + o an yapılabilecek eyleme buton
(*"Henüz maç oynanmadı — ilk maçını izle →"*).

---

### F12-6. Market sayfası mobilde 108 etkileşimli öğe
**ORTA** · Ölçüm: Transfer Market'te **108** buton/select/input, ekranda görünen **33**.

40 oyuncu × kart başına 2-3 buton. Telefonda kaydırma çok uzun, seçim yorucu.

**Düzeltme:**
- Mobilde varsayılan görünüm **Liste** (kart değil) — FAZ 8'de Kadro için önerildi, Market'e de uygula
- Kart başına tek eylem: `Teklif Ver` (detay için karta dokun)
- Üstte sabit filtre şeridi: `Mevki · Bütçeme uygun · OVR`
- Sonsuz kaydırma yerine 10'ar oyuncu + "Daha fazla"

**Kabul kriteri:** Market ilk ekranında en fazla 25 etkileşimli öğe; oyuncu satın alma **3 dokunuş**.

---

### F12-7. Üst bar başlığı iki satıra taşıyor
**DÜŞÜK** · `ANALİZ & İSTATİSTİK` mobilde iki satıra bölünüyor, üst bar 50 px'i aşıyor.

**Düzeltme:** Mobilde kısa başlık kullan (`ANALİZ`, `İSTATİSTİK` değil) ya da
`white-space:nowrap; font-size:clamp(14px,4vw,20px)`.

---

### F12-8. Mobil dokunma hedefleri 38–39 px
**DÜŞÜK** · FAZ 7'de büyük ölçüde düzeltildi ama 7 öğe hâlâ 40 px eşiğinin altında
(`tb-icon` 38×44, `market-tab` 171×39, `fbtn` 39×44).

**Düzeltme:** `min-height:44px` bu yedi seçiciye de uygula.

---

## 4. UYGULAMA SIRASI

| Sıra | Madde | Kazanç |
|---|---|---|
| **1** | **F12-1** alt sekme çubuğu | Tüm gezinme 2 → 1 dokunuş |
| **2** | **F12-2** maç sayfası yeniden sıralama | En önemli ekran kullanılabilir olur |
| 3 | F12-3 sabit birincil eylem | Her sayfada kaydırma biter |
| 4 | F12-4 bilgi yoğunluğu | Sayfalar kısalır, tarama kolaylaşır |
| 5 | F12-6 market | Satın alma 5 → 3 dokunuş |
| 6 | F12-5, F12-7, F12-8 | Cila |

---

## 5. KABUL KRİTERLERİ (ölçülebilir)

Bunları `tools/mobile-check.js` olarak otomatikleştir — 390×844 viewport'ta çalışsın:

| Ölçüm | Hedef |
|---|---|
| Ana Panel · Kadro · Maç · Lig · Market'e ulaşma | **1 dokunuş** |
| Maçı izleme | **2 dokunuş** |
| İlk 5 düzenleme · taktik değiştirme | **2 dokunuş** |
| Oyuncu satın alma | **3 dokunuş** |
| Maç sayfasında birincil eylemin derinliği | **< 0,5 ekran** |
| Maç sayfasında sahanın ekran payı | **> %30** |
| Tek sayı gösteren kartın yüksekliği | **< 100 px** |
| Yatay taşma (10 sayfa) | **0 px** (bugün sağlanıyor — korunmalı) |
| 44 px altı dokunma hedefi | **0** |
| Market ilk ekranındaki etkileşimli öğe | **≤ 25** |

---

## 6. TASARIM İLKESİ

Telefonda oyuncu **ayaküstü, tek elle, 30 saniyeliğine** giriyor. Ekranda üç soru cevaplanmalı:

1. **Sıradaki maçım ne zaman?**
2. **Bir şey yapmam gerekiyor mu?** (sakat oyuncu, düşük moral, gelen teklif, taktik ayarlanmamış)
3. **Ligde neredeyim?**

Bu üçü **Ana Panel'in ilk ekranında**, kaydırmasız görünmeli. Geri kalan her şey ikinci sırada.

Şu an Ana Panel'de sıradaki maç görünüyor (iyi) ama "bir şey yapmam gerekiyor mu" sorusunun
cevabı hiçbir yerde yok. Bir **"Yapılacaklar" rozeti** (kırmızı sayı) alt çubuktaki Kadro ve Maç
sekmelerinde dursun — oyuncu tek bakışta anlasın.
