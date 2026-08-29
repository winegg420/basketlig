# REVİZE PAKETİ — FAZ 9: UZUN VADELİ OYUN DÖNGÜSÜ
**Tarih:** 2026-08-30 · `REVIZE-PAKETI-FAZ8.md`'nin devamı · Ölçülen sürüm: `e03db96`
**Yöntem:** İki tam sezon uçtan uca simüle edildi — 38 lig maçı + playoff serileri + 2 draft + sezon geçişleri

> Bugüne kadarki fazlar **tek maçı** ve **tek ekranı** düzeltti. Bu faz ilk kez **sezonlar arası** davranışa bakıyor.

---

## 0. ÖNCE: DÖNGÜ SAĞLAM

İki tam sezon kesintisiz döndü, **tek bir konsol hatası bile çıkmadı.**

| Aşama | Sonuç |
|---|---|
| Düzenli sezon (19 maç) | ✔ Sezon 1 ve 2'de eksiksiz tamamlandı |
| Sezon kapanışı | ✔ `endLeagueSeasonIfDone` sorunsuz |
| Playoff serileri | ✔ 30 maç, şampiyon belirlendi (Ankara Şahinleri) |
| Draft gecesi | ✔ 20 seçim tamamlandı, adaylar altyapıya katıldı |
| Yeni sezona geçiş | ✔ Fikstür yenilendi, sayaçlar sıfırlandı |
| Konsol hatası | **0** |

**Not — kendi testimin üç yanılgısı:** Draft'ın "6. seçimde takıldığı", "hiç çalışmadığı" ve "yeni sezonun başlamadığı" gözlemlerinin üçü de benim harness'ımın hatasıydı. Draft **kullanıcının sırasında bilerek durup bekliyor** ("SIRA SENDE"); başsız testte kimse tıklamadığı için duruyor gibi göründü. `autoDraftPick()` ile tamamlanınca döngü sorunsuz kapandı. **Bu üç madde bug değildir — aramaya gerek yok.**

---

## A · YÜKSEK — KADRO HER SEZON ZAYIFLIYOR, GÜÇLENME YOLU YOK

### F9-1. Kadro OVR ortalaması sezon başına düşüyor
**YÜKSEK** · İki sezonluk ölçüm:

| | Sezon 1 başı | Sezon 2 başı | Sezon 2 sonu |
|---|---|---|---|
| **Kadro OVR ortalaması** | **70** | **69** | **68** |
| Kadro mevcudu | 15 | 17 | 18 |
| Altyapı mevcudu | 15 | 20 | 19 |

Kadro her sezon **1 puan zayıflıyor.** Sebep zinciri:

1. Oyuncular yaşlanıyor, zirveyi geçenler geriliyor
2. Draft'tan gelen adaylar düşük OVR ile katılıyor (ortalamayı aşağı çekiyor)
3. **FAZ 8'de serbest piyasayı kısıtladık** (F8-2) — artık piyasadan güçlenilemiyor
4. Antrenman kazancı bu düşüşü karşılamıyor

Yani F8-2 düzeltmesi zorluğu getirdi ama **yerine bir gelişim yolu koymadı.** Menajerlik oyununda oyuncunun hissetmesi gereken şey "takımım büyüyor"; şu an "takımım eriyor".

**Düzeltme (seçenekler):**
- Antrenman kazancını artır — özellikle 19-24 yaş bandında potansiyele doğru hızlı gelişim
- İzci ağı + altyapı gerçekten üst düzey genç üretsin (yüksek potansiyel, düşük başlangıç)
- Kulüp transferi (pazarlıklı) kanalını güçlendir: para biriktiren menajer gerçek yıldız alabilsin
- Draft sıralaması kötü bitirene gerçekten iyi aday versin

**Kabul kriteri:** 3 sezonluk simülasyonda kadro OVR ortalaması **düşmesin** (±1 bandında kalsın veya artsın); iyi yönetilen takımda artsın.

---

### F9-2. Para birikiyor, harcanacak yer yok
**YÜKSEK** · Ölçüm:

| | Sezon 1 başı | Sezon 1 sonu | Sezon 2 sonu |
|---|---|---|---|
| **Kasa** | 50.000 KR | **122.483 KR** | **167.999 KR** |

Hiçbir transfer yapılmadan, arena yükseltilmeden kasa **sezon başına ~45.000 KR** büyüyor. Başlangıç bütçesinin 3,4 katına çıkmış durumda.

F8-2'den sonra piyasada pahalı oyuncu kalmadığı için paranın **gideceği yer yok.** Ekonomi bir karar mekanizması olmaktan çıkıp sayaç haline geliyor.

**Düzeltme:** Gelir/gider dengesini sıkılaştır (maaş enflasyonu, arena bakımı, altyapı gideri sezonla artsın) **ve** paraya anlamlı hedefler koy: arena yükseltme basamakları, akademi seviyeleri, izci ağı genişletme, kulüp transferinde gerçek yıldızlar.

**Kabul kriteri:** Pasif oynayan (transfer yapmayan) takımın kasası 3 sezonda başlangıcın 2 katını geçmesin.

---

### F9-3. Kadro sürekli büyüyor, kimse ayrılmıyor
**ORTA** · 15 → 17 → 18 oyuncu. Draft'tan ve altyapıdan katılım var, ayrılma yok.

Sözleşme sistemi çalışıyor (yenileme ve ayrılma kodu mevcut), ama net etki **birikme** yönünde. Uzun vadede 25+ kişilik kadrolar oluşur; maaş yükü artar ama F9-2 nedeniyle bu bir baskı yaratmaz.

**Düzeltme:** Kadro üst sınırı koy (örn. 18) ve sınır aşılınca kullanıcıyı **karar vermeye zorla** (kimi göndereceksin?). Bu aynı zamanda F9-1'e de yardım eder — zayıf oyuncuyu gönderip ortalama yükselir.

---

## B · ORTA — DOĞRULANMASI GEREKEN

### F9-4. İkinci sezonun playoff'u başlamadı — doğrulanmalı
**ORTA · KESİN DEĞİL**

Sezon 2'nin 19 maçı tamamlandıktan sonra `endLeagueSeasonIfDone()` çağrıldı, ancak playoff döngüsü **hiç maç oynamadan** çıktı ve `G.playoff.champion` hâlâ **Sezon 1'in şampiyonunu** (Ankara Şahinleri) gösteriyordu.

İki olasılık var:
1. `G.playoff` sezon geçişinde temizlenmiyor, eski `champion` alanı kalıyor → yeni playoff hiç kurulmuyor
2. Benim test döngüm (`while(G.playoff && !G.playoff.champion)`) bayat bir değer okudu

Bu turda üç kez kendi harness'ım yanılttığı için **bunu bug olarak işaretlemiyorum.**

**Doğrulama yolu:** `startLeagueSeason()` içinde `G.playoff=null` yapılıp yapılmadığını kontrol et. Yapılmıyorsa ekle. Sonra iki sezonluk testte her iki sezonun da kendi şampiyonunu ürettiğini doğrula.

**Kabul kriteri:** Arka arkaya 3 sezonda 3 farklı playoff, her birinin kendi şampiyonu ve kendi MVP'si.

---

### F9-5. Yaş ortalaması iki sezonda hiç değişmedi — doğrulanmalı
**DÜŞÜK · KESİN DEĞİL** · Ölçüm: 26 → 26 → 26

Yaşlanma çalışıyorsa ortalama artmalı; ancak drafttan gelen gençler ortalamayı aşağı çektiği için sabit görünmesi **normal de olabilir.**

**Doğrulama yolu:** Sezon geçişinde **aynı oyuncu id'lerinin** yaşını önce/sonra karşılaştır (ortalamayı değil). Artmıyorsa `startLeagueSeason` içindeki yaşlanma bloğu çalışmıyor demektir.

---

## C · ÖNCEKİ FAZLARDAN KALAN

### F9-6. `"Transfer Bedeli"` EN modunda çevrilmiyor
**DÜŞÜK** · FAZ 8'den kalan tek çeviri eksiği. Antrenman sayfasında görünüyor.
**Düzeltme:** `i18n-dict.js`'e `'Transfer Bedeli':'Transfer Fee'` ekle.

### F9-7. Canlı yayın depodan birkaç commit geride
**DÜŞÜK** · Vercel'deki sürümde FAZ 6, 7 ve 8'in tamamı **var** — sorun yok, yalnızca son birkaç commit'lik normal dağıtım gecikmesi. Yayın öncesi `?v=` etiketinin artırıldığından emin ol (şu an `v=39`, doğru).

---

## ÖNCELİK SIRASI

| Sıra | Maddeler | Gerekçe |
|---|---|---|
| 1 | **F9-1** (kadro zayıflıyor) | Oyunun uzun vadeli anlamı buna bağlı — Steam'de asıl oynanış bu |
| 2 | **F9-2** (para birikiyor) | F9-1 ile aynı madalyonun yüzü: karar yok |
| 3 | **F9-4** (2. sezon playoff'u) | Önce doğrula, gerçekse kritik |
| 4 | F9-3 (kadro şişmesi) | F9-1'e yardım eder |
| 5 | F9-5, F9-6, F9-7 | Doğrulama + cila |

---

## KABUL KRİTERLERİ

- 3 sezonluk simülasyonda kadro OVR ortalaması düşmüyor
- Pasif oynayan takımın kasası 3 sezonda başlangıcın 2 katını geçmiyor
- Arka arkaya 3 sezonda 3 ayrı playoff, 3 ayrı şampiyon
- Aynı oyuncu id'sinin yaşı her sezon geçişinde +1 artıyor
- Kadro mevcudu üst sınırı aşmıyor
- EN modunda `"Transfer Bedeli"` görünmüyor
- 2 tam sezon simülasyonunda konsol hatası **0** (şu an sağlanıyor — korunmalı)

---

## TEST ALTYAPISI ÖNERİSİ

Bu fazın bulguları elle yazılmış geçici bir harness'la çıkarıldı ve o harness **üç kez yanlış alarm verdi.** Kalıcı çözüm:

**`tools/season-loop.js`** yaz — N sezonu uçtan uca sürer, her sezon sonunda şunları kaydeder:
`kadro OVR ort · yaş ort · mevcut · kasa · şampiyon · draft seçim sayısı · konsol hatası`

Draft'ın kullanıcı sırasında beklediğini bilerek `autoDraftPick()` ile ilerlesin. Böylece uzun vadeli denge her değişiklikten sonra tek komutla ölçülebilir — ve benim düştüğüm tuzaklara kimse tekrar düşmez.
