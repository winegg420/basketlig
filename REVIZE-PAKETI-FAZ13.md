# REVİZE PAKETİ — FAZ 13: CANLI MAÇ ANLATIMI VE GÖRSEL SUNUM

**Tarih:** 2026-08-30 · **Ölçülen:** canlı yayın `basketlig.vercel.app`, `match-engine.js?v=40`
**Yöntem:** Gerçek bir lig maçının **198 olayının tamamı** kod üzerinden çözümlendi
(sadece ekrana bakılmadı) + saha SVG geometrisi ölçüldü + jeton konumları örneklendi

> Kullanıcının talebi: *"canlı maç anlatımı hataları, görsel maç hataları."*
> **Bulgu: anlatımda 9, görselde 4, kilitlenme/arayüzde 5 ayrı sorun var.**
> Ayrıca **FAZ 11'in metre ölçeği yanlış** — düzeltilmeden o paket uygulanmamalı (madde 0).

---

## 0. ⚠ ÖNCE BUNU DÜZELT — FAZ 11'İN METRE ÖLÇEĞİ YANLIŞ

FAZ 11 belgesi `33,57 px/m` kullanıyor (940 ÷ 28). **Bu yanlış.** 940, saha dışı boşlukları da
içeren viewBox genişliği. Sahanın kendisi SVG'den ölçüldü:

```
oyun alanı rect: x=56.4  y=30  width=827.2  height=440
827.2 px ÷ 28 m = 29,54 px/m
440.0 px ÷ 15 m = 29,33 px/m      → gerçek ölçek ≈ 29,5 px/m
```

Doğrulama (SVG'den okunan gerçek değerler, hepsi FIBA'ya uygun):

| Öğe | Kodda | Metreye çevrilince | FIBA | Durum |
|---|---|---|---|---|
| Pota merkezi–dip çizgi | 102,6 − 56,4 = 46,2 px | **1,56 m** | 1,575 m | ✔ |
| 3 sayı yayı yarıçapı | 196 px | **6,63 m** | 6,75 m | ✔ (%2 sapma) |
| Boya derinliği | 167,2 px | **5,66 m** | 5,80 m | ✔ |
| Serbest atış çemberi | 52,8 px | **1,79 m** | 1,80 m | ✔ |

**Saha geometrisi doğru. Sorun ölçekte değil, ölçek sabitinde.**

**Yapılacak:** `29.54` sabitini tek bir yerde tanımla ve FAZ 11'in tüm metre hedeflerini
buna göre yeniden yaz. FAZ 11'in ölçümleri **%12 küçük raporlanmış**:

| FAZ 11'de yazan | Gerçekte |
|---|---|
| Hücum ikili mesafe 2,64 m | **3,00 m** |
| Savunmacı–adam mesafesi 5,03 m | **5,72 m** |
| Önerilen dizilimde en yakın ikili 4,6 m | **5,25 m** ✔ (hedefin üstünde, koordinatlar geçerli) |

> **FAZ 11'in `SET_5OUT` / `SET_4OUT1IN` koordinatları doğrulandı ve geçerli.** Köşe noktaları
> `[112,45]` ve `[112,455]`: potaya 6,95 m — yayın (6,63 m) dışında. Bu koordinatlar
> **değiştirilmemeli**; x=112'de yayın dışında kalmak için y ≤ 54 zorunlu.

---

# A · CANLI MAÇ ANLATIMI (kullanıcının 1. önceliği)

### F13-1. Kaçan şuttan sonra ribaund anlatılmıyor — 57 kaçışın 44'ünde
**KRİTİK** · Ölçüm: 198 olayın tamamı tarandı.

Anlatım kaçan şuttan doğrudan **diğer takımın şutuna** atlıyor. Top el değiştiriyor ama
**nasıl değiştiği hiç söylenmiyor** — 27 kez.

```
"Ja Brown turnikede tökezledi!"                      ← biz kaçırdık
"Victor Kim drive edip dağıttı, Anthony Diallo…"     ← rakip sayı attı
                                                       ribaund nerede?
```
```
"Giannis Nakamura bu kez isabet yok."
"⚡ Hızlı hücum! Victor Rodriguez boşta bıraktı; Adam Adamski…"
```

Ribaund kutu skorda sayılıyor (`box.h.reb` artıyor) ama **olay olarak üretilmiyor.**
İzleyici için maç kopuk kopuk akıyor — şikâyetin merkezi bu.

**Düzeltme:** Her `miss2`/`miss3` olayından sonra **mutlaka** bir `reb` olayı üret
(savunma ribaundu da hücum ribaundu kadar anlatılmalı). Kısa kalıp yeter:
*"X ribaundu topladı, hücum sırası Y'de."*

**Kabul kriteri:** Kaçan şut sayısı = ribaund olayı sayısı (±2 çeyrek sonu payı).
Ribaundsuz taraf değişimi **0**.

---

### F13-2. Aynı takım üst üste iki şut atıyor, arada hiçbir şey yok — 9 kez
**YÜKSEK**

```
"Giannis Nakamura dıştan isabet yok."     (x=801)
"Giannis Nakamura bu kez isabet yok."     (x=815)
```
İki şut arasında ne hücum ribaundu var, ne pas, ne top kaybı. Aynı oyuncu iki kez üst üste
kaçırıyor ve aradaki hikâye yok. Basketbolda bu ancak hücum ribaundu ile olur — o da anlatılmıyor.

**Düzeltme:** F13-1 çözülünce büyük kısmı kapanır. Kalanı için: aynı takımın ardışık iki şutu
arasında **zorunlu olarak** hücum ribaundu ya da top kaybı olayı bulunsun.

**Kabul kriteri:** Açıklamasız ardışık aynı-takım şutu **0**.

---

### F13-3. Skor serisi rakamı yanlış — "9-0" derken gerçek seri 13-0
**YÜKSEK** · Ölçüm: skor 4-2'den 4-15'e giderken

```
🔥 9-0'lık seri! Adam Adamski servisinde Victor Rodriguez net bir bitiriş, iki sayı. (4 - 15)
```
Skor tablosuna göre rakip son 13 sayıyı cevapsız attı. Anlatım **9** diyor.
Seri sayacı sayıları değil, sanırım sayı olaylarını sayıyor (4 basket = "9"?) — hangi yol
seçilirse seçilsin rakam skorla tutmuyor ve izleyici tabelayı görüyor.

**Düzeltme:** Seri, `home`/`away` skor farkından hesaplansın: son sayı hangi takımdaysa,
o takımın kesintisiz topladığı **sayı** toplamı.

**Kabul kriteri:** Metindeki her `N-0` iddiası skor geçmişiyle birebir tutuyor.

---

### F13-4. Faul satırlarında faulü yapan oyuncunun adı yok — 12 fauldan 11'inde
**YÜKSEK**

```
Faul — dasd bu çeyrek 2. faulünü yaptı (5'te bonus başlar). Top yandan.
```
Kim faul yaptı? Belli değil. Oyuncu kendi oyuncusunun faul yükünü takip edemiyor — oysa
`matchFouls` alanı oyuncu bazında zaten tutuluyor. Menajerlik oyununda bu bilgi karar demek
(5 faulle oyun dışı, değişiklik gerekir).

**Düzeltme:** `Faul — <oyuncu adı> (kişisel N). <takım> bu çeyrek M. faulünü yaptı.`
4. ve 5. kişisel faulde uyarı tonu (*"Dikkat, X 4. faulünde"*).

**Kabul kriteri:** Faul satırlarının **%100'ünde** oyuncu adı ve kişisel faul sayısı var.

---

### F13-5. Faul sayacı atlıyor — "2. faul" sonrası doğrudan "4. faul"
**ORTA** · 1. çeyrekte dasd için: `2. faulünü yaptı` → (arada satır yok) → `4. faulünü yaptı`

Aradaki 3. faul, bir serbest atış satırının içinde eriyip gitmiş. Sayaç doğru ilerliyor ama
**anlatım atlıyor** — izleyici sayacın bozuk olduğunu sanıyor.

**Düzeltme:** Serbest atışa yol açan faul de kendi satırını alsın (F13-4 ile aynı biçimde),
serbest atış ayrı satır olsun. Ya da serbest atış satırı faul numarasını da söylesin.

---

### F13-6. Top çalma iki farklı dille anlatılıyor, birinde topu kaybeden belli değil
**ORTA**

```
"Victor Kim müthiş bir top çalma!"                              ← kimden aldı?
"Ja Brown pasını kontrol edemedi — topu LaMelo Lewis aldı."     ← bu doğru biçim
```
İlk biçimde izleyici topun el değiştirdiğini ancak sahaya bakarak anlıyor.

**Düzeltme:** Tüm top çalma satırları **iki taraflı** olsun: kaybeden + kapan.

---

### F13-7. Devre arası yok; yorgunluk/enerji 198 olayda hiç anlatılmıyor
**ORTA** · Ölçüm: `devre arası` geçen satır **0**, `enerji/yorgun/nefes` geçen satır **0**

2. çeyrek sonu, 1. ve 3. çeyrek sonuyla **aynı** cümleyi kullanıyor:
*"Çeyrek bitti: dasd 43 - 43 Kayseri Spor. Taktik masasına dönülüyor."*
Basketbolda devre arası ayrı bir andır — skor özeti, en skorer oyuncu, ikinci yarı beklentisi.

Enerji sistemi motorda **var** (`enerji`, `dayaniklilik`, `restBonus`) ama anlatımda hiç
görünmüyor. Oysa oyuncunun değişiklik yapma kararı buna bağlı.

**Düzeltme:** Devre arası için ayrı kalıp seti. Enerjisi eşiğin altına düşen oyuncu için
satır üret: *"X nefes nefese, bacakları gitti — kenar değişiklik düşünüyor."*

---

### F13-8. Anlatım kalıpları tekrar ediyor — 198 olay, 138 benzersiz kalıp
**ORTA** · İsimler ve sayılar çıkarıldığında en sık tekrarlar:

| Tekrar | Kalıp |
|---|---|
| 7 | `🔄 # değişiklik: # dinlenmek için kenara, yerine # girdi.` |
| 6 | `Faul — dasd bu çeyrek N. faulünü yaptı (N'te bonus başlar). Top yandan.` |
| 5 | `Faul — # bu çeyrek N. faulünü yaptı…` |
| 3 | `# demire takıldı!` |
| 3 | `# bitiremedi, top dışarı.` |

Faul ve değişiklik satırları **tek kalıba** bağlı. Bir maçta 11 faul satırının 11'i aynı cümle.

**Düzeltme:** Faul, değişiklik, ribaund ve çeyrek sonu için en az **5'er varyant** yaz.
Spikerin kişiliği (`SPIKERS`) bu kalıplara da uygulansın — şu an yalnız şut satırlarında var.

---

### F13-9. "Köşe üçlüğü" köşede değil
**DÜŞÜK** · 4 "köşe" ifadesinin 1'i yanlış: `y=138` (kanat bölgesi), köşe bandı `y<110` veya `y>390`.

**Düzeltme:** Bölge adını metinden değil, `shot.zone` alanından türet.

---

# B · GÖRSEL SUNUM / SAHA

### F13-10. Takımlar devre arasında saha değiştirmiyor — 124 şutun 124'ü aynı yönde
**YÜKSEK · YENİ BULGU (FAZ 11'de yok)**

| | Q1 | Q2 | Q3 | Q4 |
|---|---|---|---|---|
| **Biz** | 15 sağ / 0 sol | 15 sağ / 0 sol | 16 sağ / 0 sol | 14 sağ / 0 sol |
| **Rakip** | 13 sol / 0 sağ | 17 sol / 0 sağ | 18 sol / 0 sağ | 16 sol / 0 sağ |

Gerçek basketbolda takımlar **devre arasında pota değiştirir.** Dört çeyrek boyunca aynı
potaya hücum etmek, basketbol izleyen herkesin ilk fark edeceği hatadır.

**Düzeltme:** 3. çeyrek başında hücum yönünü ters çevir (`offLeft` bayrağını devrede çevir).
Şut haritası da buna göre çizilmeli — yoksa aynı takımın şutları iki tarafa dağılır; çözüm:
şut haritasında koordinatları **hep tek yöne normalize et**, sahada gerçek yönde göster.

**Kabul kriteri:** Q1-Q2'de bir yön, Q3-Q4'te ters yön. Şut haritası tek yarı sahada toplanıyor.

---

### F13-11. Set hücumuna hâlâ geçilmiyor — hücum, saldırdığı potaya 9,3 m uzakta
**KRİTİK · FAZ 11 F11-1 doğrulandı, güncel ölçümle**

Canlı kareden ölçülen jeton konumları (hücum eden takım, sol potaya saldırıyor):

| Oyuncu | x | Potaya uzaklık |
|---|---|---|
| Rodriguez | 300 | 6,7 m |
| Diallo | 304 | 8,4 m |
| Lewis | 396 | 9,9 m |
| Adamski | 440 | 12,0 m |
| Kim (topla) | 453 | 12,4 m |

**Hücumun ortalama x'i 378; sol pota 102,6.** Yani takım orta sahada duruyor, yarı saha
hücumuna hiç geçmiyor. FAZ 11'in teşhisi (geçiş dizilimine takılma) **doğrulandı.**

> **Not:** Bu karede ikili mesafeler 4,8–5,6 m — yani **aralık (spacing) aslında iyi.**
> Sorun aralıkta değil, **takımın potaya hiç yaklaşmamasında.** FAZ 11'in F11-2 maddesi
> (aralık dar) her karede geçerli değil; asıl madde F11-1'dir. Önceliği ona ver.

---

### F13-12. Savunma yok — topu tutan oyuncu 7,1 m boşta
**KRİTİK · FAZ 11 F11-4 doğrulandı, daha kötü**

Aynı kareden, her hücumcuya en yakın savunmacı:

| Hücumcu | En yakın savunmacı | Mesafe |
|---|---|---|
| **Kim (top onda)** | Brown | **7,1 m** |
| Adamski | Clark | 7,4 m |
| Diallo | Nakamura | 7,0 m |
| Rodriguez | Rodriguez | 6,5 m |
| Lewis | Clark | 5,4 m |
| | **Ortalama** | **6,7 m** |

Gerçek basketbolda topu tutan oyuncuya **1,0–1,5 m**. 7 metre savunma değildir.
FAZ 11 bunu 5,03 m ölçmüştü; doğru ölçekle **5,72 m**, bu karede **6,7 m**.

---

### F13-13. İki takım iki dikey sütun — aralarında 1,6 m'lik temiz çizgi
**YÜKSEK · FAZ 11 F11-5 doğrulandı**

Turuncu jetonlar x=137–254 bandında, yeşiller x=300–453 bandında. En yakın turuncu (254) ile
en yakın yeşil (300) arasında **46 px = 1,6 m'lik boş şerit.** İki takım hiç iç içe geçmiyor —
basketbolda görülmeyen görüntü tam olarak bu.

**Düzeltme:** F13-11 ve F13-12 çözülünce kendiliğinden düzelmeli. Savunma dizilimi bağımsız
şablondan değil, **hücum dizilimine göre** (her savunmacı adamı ile pota arasında) kurulmalı.

---

# C · KİLİTLENME VE ARAYÜZ

### F13-14. Sekme arka plana alınınca maç KALICI olarak donuyor
**KRİTİK · YENİ BULGU · EN ÖNEMLİ MADDE**

Kullanıcının açık sekmesinde ölçülen gerçek durum:

```
mState.idx      = 16 / 198        ← maç 1. çeyreğin başında
mState.running  = false
mState.paused   = false           ← kullanıcı duraklatmadı
document.hidden = true
son adım üzerinden geçen süre = 6.121 saniye (102 dakika)
```

Sekme arka plana alındığında oynatma duruyor, **`running` false'a düşüyor ve bir daha
kendiliğinden başlamıyor.** Sekmeye dönmek yetmiyor: `visibilitychange` dinleyicisi **yok**.
Kullanıcının maçı 102 dakikadır donmuş halde bekliyor, ekranda "⏹ Durdur" yazıyor.

**Neden bu, F11-6'dan farklı ve daha kritik:** F11-6 maç *başlamadan* kilitlenmeyi anlatıyor.
Bu madde maçın **ortasında** donmayı anlatıyor ve tek bir sekme değişimiyle tetikleniyor.

**Çok oyunculuda felaket:** Maç fikstür saatinde otomatik oynanacak. Oyuncu sekmeyi değiştirdiği
an maçı donarsa, sonuç hiç üretilmez.

**Düzeltme (üç katman):**
1. `visibilitychange` dinleyicisi ekle: sekmeye dönüldüğünde `running` false ve maç bitmemişse
   oynatmayı **kaldığı yerden sürdür.**
2. Arka planda ilerlemeyi durdurma — sadece **çizimi** durdur. Olay indeksi zamana göre
   ilerlesin (`_stepAt` + geçen süre), dönüldüğünde araya girilen olaylar toplu uygulansın.
3. `running=false` ama `idx < events.length` durumu için ekranda **"▶ Devam et"** butonu
   göster; sessiz kilitlenme olmasın.

**Kabul kriteri:** Maç başlat → başka sekmeye geç → 2 dakika sonra dön. Maç ya kesintisiz
devam etmiş ya da tek tıkla devam ediyor. `running=false` + `idx<son` durumu **sessiz kalmıyor.**

---

### F13-15. Canlı maç sırasında ekranda 2 adet "Maçı Başlat" butonu duruyor
**ORTA** · Maç oynanırken görünür butonlar:

```
▶ Maçı Başlat        → startNextMatchNow()
▶ Maçı Başlat        → startNextMatchNow()   (aynı buton iki yerde)
▶ Maçı sonuçlandır   → startMatch()
```

Devam eden maç varken "Maçı Başlat" görünmemeli; ayrıca aynı buton sayfada **iki kez** var.
Mobilde (FAZ 12) bu kafa karışıklığını ikiye katlıyor.

**Düzeltme:** Maç durumuna göre tek birincil buton:
maç yok → `▶ Maçı Başlat` · maç oynanıyor → `⏹ Durdur` · donmuş → `▶ Devam et` ·
bitmiş ama uygulanmamış → `▶ Maçı sonuçlandır`.

---

### F13-16. `shot.isHome`, `userIsHome` ile ters
**ORTA** · Ölçüm: `mState.userIsHome = false` (biz deplasmanız) ama bizim şutlarımızda
`shot.isHome = true`. Kutu skorda da bizim istatistiğimiz `box.h` (home) altında.

Anlatım "dasd deplasman takımı olarak" diyor, tabela "dasd 0 - 0 Kayseri Spor" sırasıyla
yazıyor (deplasman önce). Üç yer üç farklı şey söylüyor.

**Çok oyunculuda kritik:** Sunucu maçı üretirken ev/deplasman gerçek anlam kazanıyor
(saha avantajı, seyirci geliri, fikstür). Şu anki `isHome` alanı "kullanıcı mı" demek,
"ev sahibi mi" demek değil.

**Düzeltme:** Alanı `isUser` olarak yeniden adlandır ve ayrı bir `isHome` ekle.
Tabela her zaman **ev sahibi solda** göstersin.

---

### F13-18. Sayfadan çıkıp maça dönünce maç içi istatistik paneli SIFIRLANIYOR
**YÜKSEK · YENİ BULGU · ekranda gözle görülür**

Adımlar (canlı sitede yapıldı):
1. Maç devam ederken (skor 4-7, `idx=16`) sol menüden **Lig puan durumu** → **Kadro** → **Maçlar**
2. Maçlar sayfası açılıyor, saha ve anlatım akışı **eski hâlini koruyor**
3. Ama sağdaki **"MAÇ İÇİ — TAKIM İSTATİSTİKLERİ"** paneli tamamen sıfırlanmış:

| | Dönmeden önce | Döndükten sonra |
|---|---|---|
| Panel başlığı | `DASD` / **`KAYSERİ SPOR`** | `DASD` / **`DEPLASMAN`** |
| 2 sayı | `2/3 (66.7%)` / `0/2 (0.0%)` | **`0/0 (0.0%)`** / **`0/0 (0.0%)`** |
| Serbest atış | `0/0` / **`4/4 (100%)`** | **`0/0`** / **`0/0`** |
| Ribaund · Asist · Faul | 2·1·3 / 2·1·2 | **0·0·0 / 0·0·0** |

Yani panel `mState.box`'tan değil, **her sayfa açılışında sıfırlanan yerel bir nesneden**
besleniyor; rakip adı da kaybolup yerine sabit "Deplasman" yazısı geliyor. Skor tabelası ve
saha doğru kalıyor — **üç kaynak üç farklı gerçeği gösteriyor.**

**Düzeltme:** Panel her çizimde `mState.box.h` / `mState.box.a` ve `mState.rakipName`
üzerinden yeniden doldurulsun; sayfa açılışında sıfırlama yapılmasın.

**Kabul kriteri:** Maç sırasında başka sayfaya gidip dönünce panel, skor tabelası ve kutu skor
**birebir aynı** değerleri gösteriyor; rakip adı korunuyor.

---

### F13-17. Çeyrek süreleri 600 saniyeyi aşıyor — 3. çeyrek 703 saniye
**DÜŞÜK** · Olay `dt` toplamları: Q1 **640** · Q2 **625** · Q3 **703** · Q4 **631** (olması gereken 600)

Saat 600→0 doğru iniyor, yani fazlalık çeyrek sonunda kırpılıyor. Ancak 3. çeyrekte
**103 saniyelik** anlatılmış aksiyon saate yansımıyor; anlatım saati ile tabela saati ayrışıyor.

**Düzeltme:** Pozisyon süreleri üretilirken kalan süreyi aşmayacak şekilde sınırla;
son pozisyon kalan süreye sığdırılsın.

---

# D · YANLIŞ ALARM ÇIKANLAR — ARAMAYIN

Bu turda üç şüphe **ölçülüp elendi.** Zaman kaybetmeyin:

| Şüphe | Sonuç |
|---|---|
| "3 sayı şutları yayın içinden atılıyor" | **Yanlış.** 124 şutun 124'ü doğru mesafede. Şüphe benim yanlış ölçek sabitimden (33,57) doğdu. |
| "Serbest atışlar faul anlatılmadan geliyor" | **Yanlış.** 12 serbest atışın 12'sinde de faul metnin içinde var. |
| "Saha geometrisi hatalı" | **Yanlış.** Pota 1,56 m, yay 6,63 m, boya 5,66 m, çember 1,79 m — hepsi FIBA'ya uygun. |

**Kısmen doğrulanan (küçük örneklem, düşük öncelik):** 13 kişilik kadroda 33 yaşında
`OVR 72 / potansiyel 91` bir oyuncu var (`Ja Brown`). 6 uç-yaş oyuncunun 1'i tutarsız (%17).
Örneklem küçük — kalıcı bir araçla ölçülmeden madde açılmasın.

---

# E · YENİ ÖLÇÜM ARACI — `tools/anlatim-check.js`

Bu fazın bulgularının **hiçbiri** mevcut araçlarla yakalanmıyor. `live-metrics.js` senkronu,
`sunum-check.js` üç özel oyunu, `box-band.js` dengeyi ölçüyor — **anlatım tutarlılığını
kimse ölçmüyor.**

Yazılacak araç maçı başsız üretip **olay listesini** denetlesin (tarayıcı gerekmez):

| Denetim | Hedef |
|---|---|
| Kaçan şut sayısı = ribaund olayı sayısı | fark ≤ 2 |
| Ribaundsuz taraf değişimi | **0** |
| Açıklamasız ardışık aynı-takım şutu | **0** |
| `N-0 seri` iddiası ↔ skor geçmişi | **%100 tutarlı** |
| Oyuncu adı içeren faul satırı oranı | **%100** |
| Faul sayacı atlaması | **0** |
| Çeyrek `dt` toplamı | ≤ 600 sn |
| Devre arası ayrı kalıp | **var** |
| Benzersiz kalıp / olay oranı | **≥ %85** (bugün %70) |
| Q1-Q2 hücum yönü ≠ Q3-Q4 hücum yönü | **doğru** |

Ayrıca `tools/spacing-check.js` (FAZ 11 F11-7) **29,54 px/m** ile yazılsın ve şunu da ölçsün:
**hücum takımının saldırdığı potaya ortalama uzaklığı ≤ 7 m.**

---

# F · ÖNCELİK SIRASI

| Sıra | Madde | Neden |
|---|---|---|
| **1** | **F13-14** sekme donması | Oyun şu anda kullanıcının ekranında 102 dakikadır kilitli. Çok oyunculuda sonuç hiç üretilmez. |
| **2** | **Madde 0** ölçek düzeltmesi | Bu yapılmadan FAZ 11 uygulanırsa tüm metre hedefleri yanlış olur |
| **3** | **F13-1** ribaund anlatımı | Anlatımdaki en büyük delik — 44 olay |
| **4** | **F13-11 + F13-12** set hücumu ve savunma | Görsel şikâyetin kökü (FAZ 11 F11-1, F11-4) |
| **5** | **F13-18** istatistik paneli sıfırlanması | Ekranda gözle görülür, kısa iş |
| **6** | **F13-10** saha değiştirme | Tek satırlık mantık, en görünür gerçekçilik kazancı |
| 7 | F13-2, F13-3, F13-4, F13-5, F13-6 | Anlatım tutarlılığı |
| 8 | F13-15, F13-16 | Arayüz ve veri sözleşmesi |
| 9 | F13-7, F13-8, F13-9, F13-17 | Zenginlik ve cila |

---

## REGRESYON KAPISI

```
node tools/anlatim-check.js       (YENİ)
node tools/spacing-check.js       (YENİ — 29.54 px/m ile)
node tools/live-metrics.js --ms=360000
node tools/sunum-check.js --ms=300000
node tools/box-band.js --n=200
node tools/band.js                → ec630b3a512bb3b2
```

> F13-1 (ribaund olayı üretmek) **olay listesini değiştirir**, dolayısıyla `band.js` hash'i
> değişir. Bu beklenen. Ama `box-band.js` **11/11 tutmaya devam etmeli** — ribaund sayıları
> kutu skorda zaten sayılıyordu, yeni olay yalnız anlatım üretiyor, **istatistiği
> değiştirmemeli.** Ribaund ortalaması değişirse çift sayım var demektir.
