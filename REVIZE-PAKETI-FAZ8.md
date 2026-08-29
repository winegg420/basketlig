# REVİZE PAKETİ — FAZ 8: OYNANIŞ TESTİ
**Tarih:** 2026-08-29 · `REVIZE-PAKETI.md` ve `REVIZE-PAKETI-FAZ7.md`'nin devamı
**Yöntem:** Kod denetimi DEĞİL — canlı sitede gerçek kariyerle oynanış testi + taze kariyer karşılaştırması + mobil (390×844) + EN dili testi

> FAZ 1–7 kodu düzeltti. Bu faz **oyunu oynayarak** ne göründüğüne bakıyor.
> Her madde fiilen gözlendi ve sayısallaştırıldı; hiçbiri kod okuyarak tahmin edilmedi.

---

## 0. ÖNCE: FAZ 7 SAHADA TUTTU

Canlı testte doğrulananlar — bunlar artık sorun değil:

| Kontrol | Sonuç |
|---|---|
| Mobil yatay taşma (10 sayfa, 390×844) | **0 px — hepsi temiz** |
| Mobil JS hatası | **0** |
| Yerel `@font-face` | **Var**, Google Fonts `<link>` kaldırılmış (F7-11 ✔) |
| Yeni oyun arena bakımı | **150 KR** (938 değil — F7-6 ✔) |
| Takım kimyası | **75, hedef 85 (yükseliyor)** — sabit değil, çalışıyor |
| Dokunma hedefi < 40px | 7 adet, hepsi 38–39px (sınırda — F7-24 büyük ölçüde ✔) |
| Mentor telemetrisi | `if(!window.CHARAZAY_DEBUG) return;` ile kapatılmış (F7-18 ✔) |

**Ve en önemlisi — oyuncu üretimi artık kusursuz.** 600 taze oyuncu üretilip ölçüldü:

| Mevki | Ortalama boy | Aralık |
|---|---|---|
| SG | 195 cm | 188–203 |
| SF | 202 cm | 196–208 |
| PF | 208 cm | 201–213 |

205 cm'den uzun guard: **%0** · 200 cm'den kısa pivot: **%0** · 600 oyuncuda **307 benzersiz soyadı**
İsim–ülke uyumu tam: *Łukasz Kaczmarek — Polonya · Christos Nikolaidis — Yunanistan · Alperen Kaya — Türkiye · Cheikh Sy — Senegal*

---

## A · KRİTİK — ESKİ KAYIT DÜZELTMELERDEN YARARLANMIYOR

### F8-1. Mevcut kayıttaki oyuncular düzeltme öncesi verilerle donmuş
**KRİTİK** · Kanıt: kullanıcının canlı kaydı (68 oyuncu) vs taze üretim (600 oyuncu)

Kullanıcının kaydındaki oyuncular, boy/isim düzeltmeleri **yapılmadan önce** üretildiği için bozuk verilerle kalıcı olarak donmuş:

| Ölçüm | Kullanıcının kaydı | Taze üretim |
|---|---|---|
| PG ortalama boy | **202 cm** | 190 cm |
| SG ortalama boy | **203 cm** | 195 cm |
| C ortalama boy | **198 cm** *(guard'lardan kısa!)* | 211 cm |
| 205 cm+ guard | **10 adet** (220cm SG, 219cm PG, 216cm PG) | %0 |
| Tekrar eden soyadı | **18 farklı soyadı** (Jones ×4, Martinez ×4, Robinson ×4) | 600'de 307 benzersiz |
| İsim–ülke uyumu | *Kwame Martinez — Filipinler · Shai Clark — Güney Kore* | Tam uyumlu |

**Neden önemli:** Soyadı çakışması maç anlatımını okunamaz hale getiriyor — "Martinez ıskaladı" dendiğinde kadroda 4 Martinez var. Kullanıcı kendi oyununu bu bozuk veriyle test ettiği için **düzelttiği şeylerin düzeldiğini göremiyor.**

**Düzeltme seçenekleri (kullanıcı kararı):**
1. **Migrasyon yaz** (`migrateV6ToV7`): mevcut oyuncuların boyunu mevkiye göre yeniden hesapla, çakışan soyadlarını `randomNameFor(ulke)` ile yenile. Oyuncu kimliği (id, statlar, sözleşme, kariyer) korunur — sadece kozmetik alanlar düzelir.
2. **Kabul et ve belgele**: eski kayıtlar bozuk kalır, yeni kariyerler doğru. Steam'de ilk sürüm olduğu için eski kayıt sorunu yok.

**Öneri:** (1) — hem kullanıcının kendi test kaydı düzelir hem de erken erişim oyuncuları korunur.

**Kabul kriteri:** Mevcut kayıt yüklenince C ortalama boyu > SG ortalama boyu; aynı soyadı en fazla 2 oyuncuda.

---

## B · YÜKSEK — OYUN DENGESİ

### F8-2. Serbest transfer piyasası kadroyu domine ediyor — zorluk yok
**YÜKSEK** · Taze kariyer, 1. gün ölçümü:

| | Kadro | Serbest piyasa |
|---|---|---|
| Oyuncu sayısı | 15 | 40 |
| **Ortalama OVR** | **71** | **75** |
| **En iyi OVR** | **76** | **96** |
| 85+ oyuncu | 0 | **11** |
| 90+ oyuncu | 0 | **2** |

Piyasanın **ortalaması** senin kadronun ortalamasından yüksek. Yani rastgele bir serbest oyuncu, senin ortalama oyuncundan iyi. 96 OVR bir oyuncu 1. gün piyasada bekliyor.

Kullanıcının 8 maçlık kaydında ise: kadro en iyi **79**, piyasada **94** ve 90+ **7 oyuncu**, bütçe **774.113 KR**, 94 OVR'ın bedeli **113.979 KR**. Yani bütçesiyle 6 süperstar alıp ligi kapatabilir.

Menajerlik oyununun gerilimi kıtlıktan gelir. Şu an kıtlık yok.

**Düzeltme:** Serbest piyasa kalitesini kadro seviyesine ve lig sırasına bağla — piyasa ortalaması kadro ortalamasının **%85–95'i** olsun, tavan kadro en iyisinin **+6 OVR**'ını geçmesin. Gerçek süperstarlar yalnız **kulüp transferi** (pazarlıklı, pahalı) yoluyla gelsin.

**Kabul kriteri:** Yeni kariyerde piyasa ortalaması < kadro ortalaması; piyasadaki en iyi ≤ kadro en iyisi + 6.

---

### F8-3. Lig sonuçları aşırı kutuplaşmış — sürpriz yok
**YÜKSEK** · Kullanıcının ligi, 8 maç sonrası galibiyet dağılımı:

```
8, 8, 7, 7, 7, 7, 6, 5, 4, 3, 3, 3, 3, 3, 2, 2, 1, 1, 0, 0
```

- **İki takım 8-0** ve **aynı anda iki takım 0-8**
- 20 takımın 6'sı 7+ galibiyet
- Standart sapma **2,61** (saf şans olsaydı 1,41 — yani **1,85 katı**)
- En iyi hücum **106,1 sayı/maç**, en iyi savunma **71,8 yediği** — lig ortalaması 87,5

8 maç gibi kısa bir örneklemde hem 8-0 hem 0-8 çıkması, maç sonucunun takım gücüne fazla bağlı olduğunu gösterir. Zayıf takımla başlayan oyuncu hiç kazanamaz; güçlü takım hiç kaybetmez. İkisi de sıkıcı.

**Düzeltme:** `runPossession` sonuç dağılımına gün-formu / ev sahibi avantajı / rastgelelik payını artır. Hedef: 8 maç sonunda galibiyet standart sapması **1,7–2,1** bandında.

**Kabul kriteri:** 200 sezonluk simülasyonda 8. tur itibarıyla 8-0 yapan takım oranı **< %5**, 0-8 oranı **< %5**.

---

### F8-4. Lig takımları yalnız 8 şehirden — İstanbul ve Ankara yok
**ORTA** · Kullanıcının 20 takımlık ligi:

| Şehir | Takım sayısı |
|---|---|
| Kayseri | **4** |
| Diyarbakır · Konya · Gaziantep | **3'er** |
| İzmir · Eskişehir | 2'şer |
| Trabzon · Samsun | 1'er |

*Kayseri Boğaları, Kayseri Yıldızları, Kayseri Kartalları, Kayseri Spor* — aynı ligde dört Kayseri takımı. Buna karşılık **İstanbul, Ankara, Bursa, Antalya hiç yok.** Sonekler de tekrar ediyor (Spor ×4, Yıldızları ×3, BK ×3, Kurtları ×2).

Türkiye ligi hissi vermiyor; üretilmiş görünüyor.

**Düzeltme:** Şehir havuzunu genişlet (en az 20 şehir, İstanbul/Ankara/Bursa/Antalya dahil) ve lig kurulurken **şehir başına en fazla 2** takım kuralı koy; sonekleri de tekrarsız dağıt.

---

## C · YÜKSEK — İNGİLİZCE ÇEVİRİ EKSİK (Steam ana pazarı)

### F8-5. EN modunda emoji ile başlayan metinler hiç çevrilmiyor
**YÜKSEK** · Gerçek EN oturumunda gözlendi:

| Ekranda görünen | Olması gereken |
|---|---|
| `🆓 Serbest Oyuncular` | Free Agents |
| `💰 Bakiye:` | Balance: |
| `👤 Bireysel Antrenman` | Individual Training |
| `👔 Menajer` | Manager |
| `💰 Gelir Tahmini` | Revenue Estimate |

**Kök neden doğrulandı:** `js/i18n-dict.js` içinde bu dizelerin **hiçbiri yok** (arama sonucu: 0 eşleşme). Sözlük kaynak-dize anahtarlı çalıştığı için emoji ön ekli metinler anahtar olarak hiç eklenmemiş.

Aynı sınıf hata `PROGRESS.md` 30. oturumda not edilmiş: *"`\b` sözcük sınırı JS'te ASCII tabanlı"* — emoji ön eki de aynı sorunu üretiyor.

**Düzeltme:** Sözlük aramasını emoji/simge ön ekini ayırıp yapacak şekilde normalize et (ön eki koru, gövdeyi çevir), ya da emoji'li tüm dizeleri sözlüğe ekle. Birincisi kalıcı çözüm.

---

### F8-6. Kutu skor ve analiz başlıkları çevrilmemiş
**ORTA** · EN modunda kalan Türkçe: `Asist` · `Faul` · `Asist ort.` · `Ribaund ort.`

Maç sonu kutu skoru ve Analiz sayfası — İngilizce oynayan bir kullanıcının **en çok baktığı iki ekran.**

**Düzeltme:** Bu dizeleri `i18n-dict.js`'e ekle (Assists / Fouls / Assists avg. / Rebounds avg.).

---

### F8-7. `i18n-scan.js` bu eksikleri yakalamıyor — araç kör noktası
**ORTA** · Araç *"kalan Türkçe yalnızca özel isim"* raporluyor, ama gerçek EN oturumunda yukarıdaki 9 dize görünüyor.

FAZ 7'de `live-metrics` için tespit edilen sorunun aynısı: **araç geçiyor, gerçek geçmiyor.**

**Düzeltme:** `i18n-scan.js` tüm sayfaları gezerken emoji ön ekli metin düğümlerini de değerlendirsin; taradığı sayfa listesini ve düğüm sayısını çıktıya yazsın (kaç düğüm tarandığı görünmezse kapsam ölçülemez).

---

## D · ORTA — ARAYÜZ VE SUNUM

### F8-8. Sakatlık etiketi oyuncu kartından taşıyor
**ORTA** · Kadro sayfası, sakat oyuncu kartı

`Ağır · Stres kırığı (metatars) (Ayak) · dönüş: Gün 41 (~30 gün)` etiketi kartın **soluna taşıp portrenin ve ismin önüne geçiyor.** Uzun sakatlık metinlerinde düzen bozuluyor.

**Düzeltme:** Etiketi kartın kendi akışına al (`flex-wrap` + `max-width:100%`), ya da metni kısalt ve tamamını `title` özniteliğine koy.

---

### F8-9. Mobilde "Görünüm:" etiketi yalnız kalıyor
**DÜŞÜK** · Kadro sayfası, 390×844

Filtre butonları (All/PG/SG/SF/PF/C) bir satır, `Görünüm:` etiketi sağda tek başına, `Kart`/`Liste` butonları **alt satıra düşüyor.** Etiket bağlamsız duruyor.

**Düzeltme:** Etiket ve butonlarını tek bir `flex` kabında sar, `flex-wrap` ile birlikte kaysınlar.

---

### F8-10. Mobilde Kart görünümü pratikte kullanılamaz
**ORTA** · 390×844'te tek oyuncu kartı ~1,5 ekran yüksekliğinde. 15 kişilik kadro = **20+ ekran kaydırma.**

`Liste` görünümü zaten var ve mobil için çok daha uygun — ama varsayılan `Kart`.

**Düzeltme:** `@media(max-width:768px)` altında varsayılan görünümü `Liste` yap (kullanıcı isterse Kart'a geçer). Ayrıca mobil kartta ikincil statları katlanabilir yap.

---

### F8-11. Haberler tek şablonu tekrarlıyor + iç grup kimliği sızıyor
**ORTA** · Ana Panel, Haberler bölümü

5 haberin 4'ü **birebir aynı kalıp**: *"X — senin grubun (tb1) — N KR ile Y için anlaşma duyurdu."*

Ayrıca **`tb1`** iç grup kimliği kullanıcıya gösteriliyor — bu bir hata ayıklama değeri, lig adı olmalı.

**Düzeltme:** `tb1` yerine okunabilir lig adını yaz. Haber şablonlarını çeşitlendir: sakatlık, form serisi, başkan açıklaması, taraftar tepkisi, arena/bilet haberi, genç oyuncu çıkışı.

---

### F8-12. Ana Panel'de büyük boş alan
**DÜŞÜK** · 1440×900'de maç kartının altında ~200px boş siyah alan, sayfanın alt yarısı tamamen boş.

**Düzeltme:** Boşluğa değer katan bir blok koy — son 5 maç formu, sıradaki 3 maç, kadro uyarıları (sakat/yorgun/moral düşük), başkan hedefi ilerlemesi.

---

## E · DÜŞÜK — TEKNİK

### F8-13. Önbellek sürümü `?v=37`'de donmuş
**ORTA** · `charazay2.0.html` — 13 script'in tamamı `?v=37`

FAZ 1–7 boyunca ~40 commit atıldı, `js/*.js` dosyalarının çoğu baştan aşağı değişti — ama sürüm etiketi hiç artmadı. Daha önce oyunu açmış bir kullanıcının tarayıcısı **eski JS dosyalarını önbellekten** servis edebilir; yeni HTML + eski JS karışımı sessiz hatalara yol açar.

**Düzeltme:** Sürümü artır (`?v=38`) ve her yayın öncesi artırmayı `DEVAM-ET.md`'ye kural olarak ekle. Kalıcı çözüm: yayın betiğinde otomatik damgalama.

---

### F8-14. Eski mentor anahtarları localStorage'da kalıyor
**DÜŞÜK** · Kullanıcının tarayıcısında `CHARAZAY_MENTOR_SYNC` ve `CHARAZAY_MENTOR_LAYOUT_LOG` duruyor.

Telemetri artık `CHARAZAY_DEBUG` ile kapalı (F7-18 ✔), ama **eskiden yazılmış anahtarlar silinmiyor** ve kota bütçesinden yer kaplıyor.

**Düzeltme:** Açılışta `CHARAZAY_DEBUG` kapalıysa bu iki anahtarı bir kez temizle.

---

## ÖNCELİK SIRASI

| Sıra | Maddeler | Gerekçe |
|---|---|---|
| 1 | **F8-2** (piyasa dengesi) | Oyunun zorluğu yok — en büyük oynanış sorunu |
| 2 | **F8-5, F8-6, F8-7** (İngilizce) | Steam ana pazarı İngilizce |
| 3 | **F8-1** (eski kayıt migrasyonu) | Kullanıcının kendi testi bozuk veriyle yapılıyor |
| 4 | **F8-3** (lig kutuplaşması) | Uzun vadeli oynanabilirlik |
| 5 | F8-13 (önbellek sürümü) | Tek satır, sessiz hata riski |
| 6 | F8-4, F8-11 (şehir havuzu, haberler) | İnandırıcılık |
| 7 | F8-8, F8-9, F8-10, F8-12, F8-14 | Cila |

---

## KABUL KRİTERLERİ

- Yeni kariyerde piyasa ortalama OVR < kadro ortalama OVR; piyasa tavanı ≤ kadro tavanı + 6
- EN modunda ekranda **hiç Türkçe metin yok** (özel isimler hariç) — emoji'li dizeler dahil
- `i18n-scan.js` çıktısında kaç düğüm/sayfa tarandığı görünüyor
- Mevcut kayıt yüklenince C ortalama boyu > SG ortalama boyu, aynı soyadı ≤ 2 oyuncuda
- 200 sezonluk simülasyonda 8. turda 8-0 ve 0-8 oranları **< %5**
- Lig kurulumunda şehir başına ≤ 2 takım
- Script etiketleri `?v=38` (ya da üstü)
- 390×844'te Kadro varsayılan görünümü `Liste`
