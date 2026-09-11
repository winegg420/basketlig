# BASKETBOL ŞARTNAMESİ — ÖLÇÜLEBİLİR KURAL LİSTESİ

Amaç: basketbolda ölçülebilir ne varsa **önceden** tanımlamak. Bundan sonra "yeni bir
hata fark ettim" olmayacak — liste önce yazıldı, sonra ölçülecek.

Her kural: **ne ölçülür · nasıl ölçülür · geçme eşiği**.

Kullanılabilir durum: `S.players` (x, y, team, role, tx, ty, _oob, _klip, pl.isim),
`S.ball` (x, y, h, mode, carrier, from, target), `S.offP` / `S.defP`, `S.offSide`,
`S._faz`, `S._klipTop`, `mState.score/quarter/rate`, `#liveTime`, `#commentary`.

Saha: x ∈ [56,4 … 883,6] (827 px = 28,65 m → **28,87 px/m**), y ∈ [28,43 … 471,57].
Pota: sol [102,6 , 250] · sağ [837,4 , 250]. Üç sayı yayı **209 px**. Raket: rim'den
dx ≤ 172, dy ≤ 74. Orta çizgi x = 470. Jeton çizim çapı 26,2 px.

---

## A · ŞUT SEÇİMİ (12 kural)

| # | Kural | Ölçüm | Eşik |
|---|---|---|---|
| A1 | Pota altında boş oyuncu şut atar | Taşıyıcı potaya <60 px ve en yakın savunmacı >100 px iken 1,5 sn içinde `shot` moduna geçilmeli | ihlal ≤ 2 / maç |
| A2 | Pota altında boş oyuncu dışarı pas atmaz | Aynı durumda `pass` ve hedef potaya >209 px | ihlal **0** |
| A3 | Üçlükte boş oyuncu atar | Hücumcu potaya >209 px, en yakın savunmacı >90 px, top onda, 2 sn içinde şut | ihlal ≤ 3 / maç |
| A4 | Kapalı şut atılmaz | Şut anında en yakın savunmacı <35 px olan şut oranı | ≤ %15 |
| A5 | Şut saati baskısı altında şut atılır | Şut saati <4 sn iken şut yerine pas/sürme | ihlal ≤ 2 |
| A6 | Şut tipi mesafeye uyar: turnike/smaç | `shot` anında mesafe ≤ 100 px olmalı | ihlal **0** |
| A7 | Şut tipi mesafeye uyar: üçlük | Üçlük olarak işaretlenen şutta mesafe ≥ 195 px | ihlal **0** |
| A8 | Şut tipi mesafeye uyar: orta mesafe | 100–209 px arası | ihlal **0** |
| A9 | Şut mesafesi dağılımı gerçekçi | Şutların ≥ %25'i pota altı (≤100 px), ≥ %25'i üçlük (≥209 px) | ikisi de sağlanmalı |
| A10 | Rol uyumu: pivot üçlük yağdırmaz | `role` 4-5 oyuncuların üçlük denemesi / toplam üçlük | ≤ %25 |
| A11 | Rol uyumu: guard pota altına girer | `role` 1-2 oyuncuların pota altı şut oranı | ≥ %10 |
| A12 | Aynı oyuncu üst üste şut tekeli yapmaz | Bir oyuncunun ardışık 4+ hücumda şut atması | ihlal ≤ 2 |

---

## B · SAVUNMA (14 kural)

| # | Kural | Ölçüm | Eşik |
|---|---|---|---|
| B1 | Adam eşlemesi kurulur | Her hücumcunun 90 px içinde bir savunmacı bulunma kare payı | ≥ %70 |
| B2 | Topu tutan savunulur | Taşıyıcıya en yakın savunmacı mesafesi ortancası | ≤ 60 px |
| B3 | Savunma geri döner | Hücum ön sahaya geçtikten 3 sn sonra kendi yarısında 5 savunmacı olma oranı | ≥ %85 |
| B4 | Savunmacı hücumcu ile pota arasında durur | Savunmacı, adamı ile pota doğrusunun pota tarafında kalma oranı | ≥ %65 |
| B5 | Savunmacı adamının üstüne oturmaz | Savunmacı–hücumcu mesafesi < 20 px kare payı | ≤ %3 |
| B6 | İki savunmacı aynı adamı tutmaz | Bir hücumcunun 60 px içinde 2+ savunmacı (yardım hariç, >1,5 sn) | ihlal ≤ 5 |
| B7 | Hiçbir hücumcu savunmasız kalmaz | Bir hücumcunun 150 px içinde hiç savunmacı olmaması, >2 sn | ihlal ≤ 5 |
| B8 | Yardım savunması olur | Pota altına giren hücumcuya ikinci savunmacının yaklaşması | ≥ 3 kez / maç |
| B9 | Ribaunt blokajı yapılır | Şut anında savunmacıların hücumculardan pota tarafında olma oranı | ≥ %50 |
| B10 | Savunma yarı sahayı geçmez (hücumda) | Savunma fazındayken rakip yarıda savunmacı bulunma kare payı | ≤ %10 |
| B11 | Pres yapılıyorsa tutarlı | Tam saha pres varsa tüm beş savunmacı ön sahada | tutarsızlık ≤ 3 |
| B12 | Savunmacılar çakışmaz | İki savunmacı <26,2 px kare payı | ≤ %3 |
| B13 | Top çalma mesafeden olur | `steal` anında savunmacı–taşıyıcı mesafesi | ≤ 50 px |
| B14 | Blok mesafeden olur | `blok` anında savunmacı–şutör mesafesi | ≤ 60 px |

---

## C · DİZİLİM VE ALAN KULLANIMI (12 kural)

| # | Kural | Ölçüm | Eşik |
|---|---|---|---|
| C1 | Perimetre boş kalmaz | En uzak hücumcu potaya <209 px kare payı | ≤ %3 |
| C2 | Raket tıkanmaz | Boyalı alanda 3+ hücumcu kare payı | ≤ %8 |
| C3 | İki hücumcu aynı slotta durmaz | Aynı takımdan iki oyuncu <30 px kare payı | ≤ %2 |
| C4 | Hücumcular arası mesafe yeterli | Hücumcular arası ortalama en yakın komşu mesafesi | ≥ 70 px |
| C5 | Orta sahada yığılma olmaz | Orta çizgi ±120 px içinde 6+ oyuncu kare payı | ≤ %4 |
| C6 | Saha genişliği kullanılır | Hücumcuların Y yayılımı (saha 443 px) | ≥ 220 px |
| C7 | Saha derinliği kullanılır | Hücumcuların X yayılımı | ≥ 200 px |
| C8 | Köşeler kullanılır | Köşede (y<100 veya y>400, potaya <230 px) hücumcu bulunma oranı | ≥ %20 |
| C9 | Kesme hareketi olur | Bir hücumcunun 1 sn içinde potaya doğru 80 px+ yaklaşması | ≥ 8 kez / maç |
| C10 | Pivot dip bölgede durur | `role` 5 oyuncunun potaya ortalama uzaklığı | ≤ 160 px |
| C11 | Oyun kurucu top çevresinde | `role` 1 oyuncunun topa ortalama uzaklığı | ≤ 200 px |
| C12 | Dizilim taç sonrası kurulur | Taçtan 3 sn sonra C1+C2+C3 birlikte sağlanma oranı | ≥ %80 |

---

## D · TOP HAREKETİ VE PAS (11 kural)

| # | Kural | Ölçüm | Eşik |
|---|---|---|---|
| D1 | Rakibe pas atılmaz | Pas bitişinde alan oyuncunun takımı ≠ atan takım (çalma değil) | **0** |
| D2 | Geri saha pası atılmaz | Ön sahadan kendi yarısına pas | **0** |
| D3 | Pas uçuş süresi gerçekçi | Pas süresi ≥ 0,25 sn ve mesafeyle orantılı | ihlal ≤ 3 |
| D4 | Pas kavisi var | `pass` boyunca top yüksekliği (`h`) değişimi | düz kayan pas ≤ %10 |
| D5 | Top taşıyıcıdan kopmaz | `held` modunda top–taşıyıcı mesafesi >30 px kare payı (klip hariç) | ≤ %1 |
| D6 | Top ışınlanmaz | Mod değişmeden tek karede >40 px sıçrama | ihlal ≤ 5 |
| D7 | Sürme yapılır | Taşıyıcı >60 px/sn koşarken top yüksekliği salınır | ihlal ≤ 5 |
| D8 | Top uzun süre sahipsiz kalmaz | `loose`/`dead` epizot süresi > 2 sn | **0** epizot |
| D9 | Potanın dibinde sahipsiz top olmaz | Top potaya <130 px, en yakın oyuncu >50 px, >0,5 sn | ≤ 10 epizot |
| D10 | Top çevirme olur | Bir hücumda 2+ pas oranı | ≥ %50 |
| D11 | Asist–sayı ilişkisi tutarlı | Asist sayısı / sayılan top | %40–%70 |

---

## E · KURAL İHLALLERİ (10 kural)

| # | Kural | Ölçüm | Eşik |
|---|---|---|---|
| E1 | 24 saniye kuralı uygulanır | Şut saati 0'a düşünce top rakibe | uygulanmalı |
| E2 | 8 saniye kuralı uygulanır | Ön sahaya geçiş süresi > 8 sn | ihlal yakalanmalı |
| E3 | 3 saniye kuralı uygulanır | Hücumcu rakette kesintisiz > 3 sn | ihlal ≤ 5 / maç |
| E4 | Geri saha ihlali uygulanır | D2 gerçekleşirse düdük çalar | tutarlı |
| E5 | Adım (traveling) olmaz | Taşıyıcı sürmeden > 2 m yol alır | ihlal ≤ 3 |
| E6 | Çift sürme tutarlı | "çift sürme" yorumu varken gerçekten sürme kesintisi olmalı | tutarlı |
| E7 | 5 faul → oyun dışı | 5 faul alan oyuncu sahada kalmamalı | **0** |
| E8 | Takım faulü → serbest atış | Periyotta 5. takım faulünden sonra her faul 2 atış | tutarlı |
| E9 | Saha dışı oyuncu olmaz | `_oob` olmayan oyuncu saha sınırı dışında | ≤ 5 olay |
| E10 | Top saha dışına çıkınca taç | Top sınırı aşınca oyun durmalı | tutarlı |

---

## F · RİBAUNT (7 kural)

| # | Kural | Ölçüm | Eşik |
|---|---|---|---|
| F1 | Şut anında pota çevresi dolu | Şut/rim anında potanın 120 px içinde ≥ 3 oyuncu | ihlal ≤ 5 |
| F2 | Ribaunt mesafeden alınır | Ribaundu alan oyuncunun topa uzaklığı | ≤ 40 px |
| F3 | Uzunlar daha çok ribaunt alır | `role` 4-5 oyuncuların ribaunt payı | ≥ %50 |
| F4 | Hücum/savunma ribaunt oranı | Hücum ribaundu / toplam | %20–%35 |
| F5 | Ribaunt sonrası geçiş başlar | Savunma ribaundundan 2 sn içinde ön sahaya yönelme | ≥ %70 |
| F6 | Ribaunt sayısı gerçekçi | Maç başına toplam ribaunt | 60–95 |
| F7 | Yorumdaki ribaunt sahibi doğru | "ribaund X" metni ile topun gerçek sahibi | **0** uyuşmazlık |

---

## G · GEÇİŞ VE HIZLI HÜCUM (6 kural)

| # | Kural | Ölçüm | Eşik |
|---|---|---|---|
| G1 | Hızlı hücumda önde koşan var | "hızlı hücum" yorumunda potaya <250 px hücumcu | **0** uyuşmazlık |
| G2 | Geçiş süresi gerçekçi | Savunma ribaundundan şuta kadar geçen süre | 3–9 sn |
| G3 | Geçişte savunma geri koşar | Geçiş sırasında savunmanın ortalama hızı | ≥ 120 px/sn |
| G4 | Sayı sonrası geçiş yavaşlar | Sayıdan sonraki hücumun süresi | ≥ 6 sn ortalama |
| G5 | Hızlı hücum sayısı gerçekçi | Maç başına hızlı hücum | 8–20 |
| G6 | Geçişte top önde | Geçiş sırasında topun hücum yönünde ilerlemesi | tutarlı |

---

## H · TAÇ VE ÖLÜ TOP (6 kural)

| # | Kural | Ölçüm | Eşik |
|---|---|---|---|
| H1 | Sayı sonrası taç dip çizgiden | Sokan oyuncunun potaya x uzaklığı | ≤ 100 px · ihlal **0** |
| H2 | Yan çizgi tacı yan çizgiden | Sokan oyuncu y sınırında | tutarlı |
| H3 | Sokan oyuncu saha dışında | `_oob` oyuncu gerçekten çizgi dışında | tutarlı |
| H4 | Taç 5 saniyede tamamlanır | Sokma süresi | ≤ 5 sn |
| H5 | Taç sonrası dizilim kurulur | C12 ile aynı | ≥ %80 |
| H6 | Hava atışı orta yuvarlakta | İlk karede top merkeze uzaklık | ≤ 45 px |

---

## I · SERBEST ATIŞ (5 kural)

| # | Kural | Ölçüm | Eşik |
|---|---|---|---|
| I1 | Atıcı serbest atış çizgisinde | Atıcının potaya uzaklığı | 130–160 px |
| I2 | Diğer oyuncular raket kenarında | Kalan 9 oyuncunun konumu | tutarlı |
| I3 | Atış öncesi kimse rakete girmez | Top çıkana kadar raket boş | ihlal **0** |
| I4 | Serbest atış yüzdesi gerçekçi | Takım FT% | %60–%85 |
| I5 | Faul–serbest atış eşleşmesi | Şut faulünden sonra doğru sayıda atış | tutarlı |

---

## J · FİZİKSEL GERÇEKLİK (5 kural)

| # | Kural | Ölçüm | Eşik |
|---|---|---|---|
| J1 | Oyuncu hızı insani | Anlık hız > 430 px/sn (≈15 m/sn) | ihlal ≤ 5 |
| J2 | Oyuncu ışınlanmaz | Tek karede > 30 px yer değiştirme | ihlal ≤ 5 |
| J3 | İvmelenme gerçekçi | Hız değişimi > 800 px/sn² | ihlal ≤ 10 |
| J4 | Oyuncular birbirinin içinden geçmez | İki oyuncu < 17 px kare payı | ≤ %1 |
| J5 | Yorulma hıza yansır | 4. periyot ortalama hızı / 1. periyot | 0,80–0,97 |

---

## K · SUNUM VE ANLATIM (8 kural)

| # | Kural | Ölçüm | Eşik |
|---|---|---|---|
| K1 | Yorumdaki isim sahada | Metindeki oyuncu sahadaki 10 kişiden biri | **0** ihlal |
| K2 | Yorumdaki şut tipi mesafeye uyar | "turnike/smaç/çembere yükseldi" ↔ mesafe ≤ 200 px | **0** ihlal |
| K3 | Yorumdaki skor gerçek skorla uyar | Parantez içi skor ↔ `mState.score` | fark ≤ 2 |
| K4 | Yorum sahnenin gerisinde kalmaz | Yorum saati ile `#liveTime` farkı | ≤ 3 sn |
| K5 | Anlatım susmaz | Ardışık iki yorum arası | ≤ 12 sn |
| K6 | Etiketler okunur | Kırpılmış (`…`) veya kutusu çakışan etiket | **0** |
| K7 | Jetonlar tek jeton gibi görünmez | İki jeton < 26,2 px kare payı | ≤ %3 |
| K8 | Hakemler saha kenarında | Hakem tribünde (çizgi +45 px dışı) veya raket içinde | **0** |

---

## ÖZET

**Toplam 96 kural**, 11 başlık:
A şut seçimi 12 · B savunma 14 · C dizilim 12 · D top hareketi 11 · E kural ihlalleri 10 ·
F ribaunt 7 · G geçiş 6 · H taç 6 · I serbest atış 5 · J fizik 5 · K sunum 8.

## ÖLÇÜM PLANI

1. Bu şartnamenin tamamını **tek denetçide** uygula: `tools/sartname.js`.
2. `setInterval(…, 16)` kullan — `requestAnimationFrame` arka plan sekmesinde donar.
3. Klip kareleri (`S._klipTop`) top ve şut kurallarından muaf; **ayrı raporla**.
4. Bir tam playoff maçı tarat. Her kural için: **geçti / düştü + ölçülen değer**.
5. Çıktı: 96 satırlık tablo, düşen kurallar üstte.

## KARAR KURALI

- Düşen kural **≤ 15** → yama yolu, tek tek düzelt.
- Düşen kural **16–40** → başlık bazında düzelt (hangi başlıkta yoğunlaşıyorsa).
- Düşen kural **> 40** → karar katmanı sıfırdan yazılır.

Karar ölçümden sonra verilir, tahminle değil.
