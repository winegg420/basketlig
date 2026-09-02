# CHARAZAY 2.0 — FAZ 39: GERÇEK VERİYLE KALİBRASYON
## Tahmin edilen bantları sil, ölçülmüş gerçek basketbolu koy

> **Nasıl kullanılır:** Bu dosyanın tamamını `basketlig` deposunun açık olduğu bir Claude Code oturumuna **tek mesaj** olarak yapıştır. Dosya depo kökünde: `KALIBRASYON-FAZ39.md`.

---

## 0. BU PAKET NEDEN FARKLI

FAZ 34'ten FAZ 38'e kadar beş tur ayar yapıldı. Her turda kapılar yeşile döndü, oyun yine "basketbola benzemiyor" kaldı. Sebebi kod değil, **hedefin kendisi**:

> Bugüne kadarki bütün "gerçek: %14-18" tarzı bantları brifi yazan taraf **tahmin etti.** Ölçülmediler. Motor yanlış hedefe kusursuzca ayarlandı.

FAZ 39 bunu bitirir. Eşikler artık **gerçek maç verisinden hesaplanacak**, elle yazılmayacak.

İkinci mesele: **canlı maçın görüntüsü hiçbir zaman hiçbir gerçek referansa karşı kalibre edilmedi.** Kutu skorun en azından bir hedefi vardı; sahadaki hareket tamamen elle yazılmış koreografi. Kullanıcının "%20 basketbola benziyor" dediği yer burası.

---

## 1. ACİL — ÖNCE BUNU DÜZELT (5 dakikalık iş)

Son commit (`970d8f6`, "uzatma ve yakin mac orani") uzatma oranını **%0'dan %17,5'e** çıkardı. Ölçüm: 40 maç, aynı harness.

| | 1 Eylül 22:00 | Şimdi | Gerçek |
|---|---|---|---|
| Uzatmaya giden maç | %0 | **%17,5** | **%4 – %8** |

Her 6 maçtan biri uzatmaya gidiyor. Bu, ligi sahte hissettiriyor ve kullanıcının "iyice bozuldu" geri bildiriminin en somut parçası.

**Yap:** Yakın maç / uzatma ayarını **%4-8** bandına geri çek. Skor bandını (78-95) ve FAZ 38'in diğer kazanımlarını bozma. Bu maddeyi paketin geri kalanından **önce** bitir ve ayrı ölç.

---

## 2. FAZ 38 NEREDE İYİ, NEREDE DEĞİL (40 maç, ölçüldü)

FAZ 38 kutu skoru gerçekten düzeltti — geri alınacak bir şey yok:

| Ölçüt | 1 Eylül | FAZ 38 | Durum |
|---|---|---|---|
| 2 sayılık isabet | %59,4 | %53,0 | ✓ |
| 3 sayılık isabet | %38,6 | %35,0 | ✓ |
| Üçlük denemesi payı | %25,3 | %35,8 | ✓ |
| Ribaunt | 29,2 | 34,4 | ✓ |
| Top kaybı | 9,8 | 13,0 | ✓ |
| Top çalma | 5,4 | 7,6 | ✓ |
| Blok | 2,5 | 3,5 | ✓ |
| Faul | 14,9 | 18,6 | ✓ |
| Oyuncu değişikliği | 9,8 | 19,5 | ✓ |
| Yedeklerin sayı payı | %16,5 | %19,1 | ~ (hedef %25-38) |
| Hızlı hücum süresi | 15,1 sn | **6,9 sn** | ✓✓ |
| 5-7 sn pozisyon payı | %0,5 | %11,3 | ✓ |
| Yeni kural olayları | yok | mola · taç · ihlal24 · hücum faulü · teknik · sportmenlik dışı · sakatlık | ✓ |

Ama iki yapısal yan etki var ve **ikisi de canlı izleme deneyimini bozmuş olabilir** (doğrulanmadı, hipotez):

**2.1 Pozisyon sayısı çok arttı.** Maç başına 163 → **178** pozisyon (iki takım). FIBA'da 4×10 dk için gerçek değer takım başına ~72-78, yani toplam ~145-155. **178 fazla hızlı.** Pozisyon süresi de 14,8 → 13,8 sn indi.
→ Koreografi ~15 saniyelik pozisyona göre yazılmıştı. Şimdi daha kısa süreye sığdırılıyor. **Kontrol et:** `animateShotPossession`'ın döndürdüğü koreografi süresi, olayın ayrılan bütçesini aşıyor mu? Aşıyorsa animasyon yarıda kesiliyordur — izlerken tam olarak "bozuk" görünür.

**2.2 Tek seferde 7 yeni olay türü eklendi.** Her birinin kendi sahne koreografisi olmalı: molada oyuncular kulübeye gider, taçta top kenardan sokulur, şut saati ihlalinde korna çalar ve top el değiştirir, hücum faulünde şutör durur.
→ **Kontrol et:** `movePlayersForEvent` bu yedi tür için ne yapıyor? Tanımsız türde parke donuyor ya da jetonlar zıplıyorsa, maçta artık maç başına ~15 kez bu oluyor.

Bu ikisi için **önce ölç, sonra düzelt.** Ölçemiyorsan `sahne-check`'e kapı ekle.

---

## 3. ANA İŞ — GERÇEK VERİYLE KALİBRASYON

### 3.1 Kaynaklar (ikisi de ücretsiz, kimlik doğrulaması gerekmiyor)

**A) Pozisyon-pozisyon verisi — `shufinskiy/nba_data`**
`https://github.com/shufinskiy/nba_data` · **Apache-2.0**
1996/97 → 2024/25 play-by-play + şut detayları, sıkıştırılmış CSV. R ve Python indirme fonksiyonları var. Kaggle ve Google Drive aynaları mevcut.
Bundan çıkacaklar: pozisyon süresi dağılımı, şut bölgesi dağılımı, geçiş hücumu oranı ve süresi, faul/top kaybı/ribaunt oranları, rotasyon derinliği, uzatma oranı, fark dağılımı.

**B) Hareket (tracking) verisi — `dcayton/nba_tracking_data_15_16`**
`https://huggingface.co/datasets/dcayton/nba_tracking_data_15_16`
SportVU kamera verisi: 600+ maç, **saniyede 25 kare**, topun ve 10 oyuncunun x/y/z koordinatları. Küçük alt küme yapılandırmaları var (**5 / 25 / 100 maç**) — **5 maçlık alt kümeyle başla**, tam sezon gereksiz ve çok büyük.
2015-16 halka açık son sezondur; sonraki sezonların tracking verisi kapalıdır.
⚠ Lisansı açıkça belirtilmemiş. **Ham veriyi depoya koyma, dağıtma.** Yalnızca ondan türetilen **toplu istatistikleri** (ortalamalar, dağılımlar) commit et. Ham dosyalar `.gitignore`'a girsin.

### 3.2 NBA → FIBA ölçekleme (atlanamaz)

Veri NBA; oyun FIBA formatında (4×10 dk = 40 dk, NBA 4×12 = 48 dk; üçlük yayı FIBA 6,75 m / köşe 6,60, NBA 7,24 m / köşe 6,71; şut saati ikisinde de 24 sn).

Kural: **maç başına ham sayı asla doğrudan kopyalanmaz.**
- **Oran ve dağılım** ölçütleri (2P%, 3P%, 3PA/FGA, şut bölgesi payları, pozisyon süresi dağılımı, geçiş hücumu payı, asist/isabetli şut, ORB%) doğrudan taşınır.
- **Sayım** ölçütleri (sayı, FGA, ribaunt, faul, top kaybı, pozisyon sayısı) **40/48 = 0,833** ile ölçeklenir.
- Üçlük mesafesi farkı için: FIBA yayı daha kısa olduğundan 3P% bir miktar yukarı, orta mesafe payı bir miktar aşağı kayar. Bunu uydurma — ölçeklemeyi **yalnız süre** üzerinden yap ve mesafe farkını `gercek-bantlar.json` içinde ayrı bir `not` alanıyla belgele. Elde FIBA verisi yoksa NBA oranını bant genişliğiyle (±2 puan) kullan.

### 3.3 Yapılacak: çıkarım hattı

Yeni klasör: `tools/gercek-veri/`

1. **`indir.js`** — seçilen sezonların PBP + şut CSV'lerini indirir, `tools/gercek-veri/_ham/` altına açar. Bu klasör `.gitignore`'da.
   En az **3 sezon** (ör. 2022/23, 2023/24, 2024/25) — tek sezon gürültülü olur.
2. **`cikar.js`** — ham veriden dağılımları hesaplar, tek çıktı üretir:
   **`tools/_lib/gercek-bantlar.json`** (bu commit edilir, ham veri edilmez)

   İçermesi gerekenler — her biri için `{deger, alt, ust, kaynak, n}`:
   - `pozisyonSuresi`: histogram (0-4 / 5-7 / 8-10 / 11-13 / 14-16 / 17-19 / 20-24 / 25+ sn) + ortalama
   - `pozisyonSayisi`: takım başına maç başına (FIBA'ya ölçeklenmiş)
   - `gecisHucumu`: pozisyonların yüzdesi + ortalama süresi + bitiş bölgesi dağılımı
   - `sutBolgesi`: rim / boya / orta mesafe / köşe3 / kanat3 / tepe3 payları
   - `isabet`: 2P%, 3P% (bölge kırılımlı), FT%
   - `sutTipi`: turnike / smaç / floater / jumper / üçlük / kanca / tip-in payları (PBP metninden çıkarılabildiği kadar; çıkarılamayanı `null` bırak, uydurma)
   - `kutuOranlari`: 3PA/FGA, FTA/FGA, asist/isabetli şut, ORB%, DRB%, top kaybı/pozisyon, çalma/pozisyon, blok/pozisyon, faul/maç
   - `rotasyon`: kutu skorda görünen oyuncu, yedeklerin sayı payı, en skorer oyuncunun payı, oyuncu değişikliği sayısı
   - `macSonu`: uzatma oranı, fark dağılımı, çeyrek başına sayı
   - `kuralOlaylari`: şut saati ihlali, hücum faulü, taç, teknik faul, mola — maç başına
   - `meta`: sezonlar, maç sayısı, ölçekleme katsayısı, çıkarım tarihi, kaynak URL'ler

3. **`hareket-cikar.js`** — tracking verisinden (5-25 maçlık alt küme) **toplu** hareket ölçütleri:
   **`tools/_lib/gercek-hareket.json`**
   - hücum yarı sahasında beş oyuncunun ortalama yayılımı (x ve y standart sapması)
   - topa en yakın savunmacı mesafesi dağılımı
   - pozisyon başına pas sayısı; topun bir oyuncuda kalma süresi dağılımı
   - top `havada` / `elde` zaman payı
   - aynı anda koşan (>2 m/sn) oyuncu sayısı dağılımı
   - topsuz oyuncu hız kademesi dağılımı (yürü / jog / koş / sprint)
   - kesme (cut) sıklığı ve mesafesi; perde kurulum süresi
   - şut anında beş hücumcunun kaçı duruyor
   - yarı sahayı geçen oyuncunun pozisyonu (1/2/3 payı)

### 3.4 Eşikleri devral

- **Bütün check araçlarındaki elle yazılmış eşikler silinecek** ve `gercek-bantlar.json` / `gercek-hareket.json`'dan okunacak. Etkilenenler en azından: `sut-cografya-check`, `kutu-check`, `tempo-check`, `rotasyon-check`, `sahne-check`, `hareket-check`, `spacing-check`, `realism-check`.
- Bir ölçüt gerçek veriden çıkarılamıyorsa **kapı kurma** — `null` bırak ve `bilgi:` satırı olarak raporla. Uydurulmuş eşik, eşiksizlikten kötüdür.
- Bant genişliği: gerçek değerin etrafında **±1 standart sapma** ya da yayınlanmış sezonlar arası aralık. Tek bir sayıya kilitleme.
- `gercek-bantlar.json` **tek doğruluk kaynağıdır.** Bir eşiği değiştirmek isteyen, veriyi yeniden çıkarmak zorunda kalsın.

### 3.5 Motoru gerçek bantlara ayarla

Sıra:
1. Önce `pozisyonSayisi` ve `pozisyonSuresi` — tempo her şeyin altında. (Şu an 178; gerçek muhtemelen ~150 civarı çıkacak.)
2. Sonra `sutBolgesi` + `isabet` + `kutuOranlari`.
3. Sonra `rotasyon`.
4. Sonra `kuralOlaylari` sıklıkları.
5. En son `macSonu` (uzatma, fark) — §1'de acil düzeltilen değeri burada veriye oturt.

Kırmızı çizgiler: determinizm korunur (aynı tohum → aynı maç) · kilitli sonuç (C1) korunur · `band.js` / `measure.js` referansları **tek bir adımda, açıklamalı** yenilenir, eski→yeni hash `PROGRESS.md`'ye yazılır.

### 3.6 Hareketi gerçek veriden besle *(en büyük iş — ayrı adım)*

`gercek-hareket.json` çıktıktan sonra canlı sahne katmanı ona göre ayarlanır:
- `_setFormation` yayılım hedefleri gerçek spacing standart sapmasına oturtulur.
- Pas sıklığı ve topun elde kalma süresi gerçek dağılıma çekilir.
- Hız kademesi dağılımı (`_V_TIER` / `_URG`) gerçek dağılımla eşleşir — "kaç oyuncu aynı anda koşuyor" bunun sonucudur, ayrı ayarlanmaz.
- Kesme sıklığı, perde süresi, şut anında duran hücumcu sayısı gerçek değerlere göre.

**Bu adımı diğerlerinden ayrı yap ve ayrı ölç.** Hepsini aynı anda değiştirirsen neyin neyi düzelttiğini göremezsin.

---

## 4. SIRA

| Sıra | İş | Süre | Risk |
|---|---|---|---|
| 1 | §1 — uzatma oranını geri çek | çok kısa | çok düşük |
| 2 | §2.1 + §2.2 — koreografi kesiliyor mu, 7 yeni olayın sahnesi var mı | kısa | düşük |
| 3 | §3.3.1-2 — PBP indir + `gercek-bantlar.json` üret | orta | düşük |
| 4 | §3.4 — check araçlarını JSON'dan okut | orta | düşük |
| 5 | §3.5 — motoru gerçek bantlara ayarla | uzun | orta |
| 6 | §3.3.3 — tracking'den `gercek-hareket.json` | uzun | düşük |
| 7 | §3.6 — sahne katmanını hareket verisine oturt | uzun | orta |

1-4 arası tamamlanmadan 5'e geçme. 6-7 ayrı bir oturum olabilir.

---

## 5. TEST VE KABUL

1. `node --check` dokunulan her modül.
2. `sim-node --n=1000 --seed=42` — hata 0, determinizm korunuyor, `G` değişmiyor.
3. Tüm mevcut check araçları geçiyor — **ama artık eşikleri JSON'dan okuyarak.**
4. `gercek-bantlar.json` commit edilmiş, ham veri edilmemiş, `.gitignore` doğru.
5. Her ölçütün yanında **kaynağı ve örneklem büyüklüğü** var; hiçbir eşik elle yazılmamış.
6. Kendi kendini test et, kullanıcıdan manuel kontrol isteme.

---

## 6. TESLİM

- `PROGRESS.md`'ye ekleyerek yaz: hangi sezonlar indirildi, kaç maç, hangi ölçütler çıkarılabildi, hangileri `null` kaldı ve neden.
- Bitince **önce/sonra tablosunu gerçek bantla birlikte** sun (üç sütun: şu an · gerçek · fark).
- Çıkarılamayan ölçütleri açıkça listele — bu paketin değeri dürüstlüğünde.
- **Commit/push yok.**
