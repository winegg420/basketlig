# CHARAZAY 2.0 — REVİZE PAKETİ · FAZ 38
## Kutu skor gerçekçiliği · hızlı hücumun saati · rotasyon · eksik kural olayları

> **Nasıl kullanılır:** Bu dosyanın tamamını `basketlig` deposunun açık olduğu bir Claude Code oturumuna **tek mesaj** olarak yapıştır. Dosya depo kökünde de duruyor: `CANLI-MAC-REVIZE-FAZ38.md`.

---

## 0. ÖNCE: FAZ 37 BAŞARILI OLDU

FAZ 37 paketi uygulandı ve **çalışıyor**. Kendi kapılarınızla ve bağımsız ölçümle doğruladım:

- `sut-cografya-check` **18/18** ✓ — bölge, şut tipi, hızlı hücum payı (%15,3), üçlüğün pozisyona dağılımı, hepsi bantta.
- `anlatim-check` **31/31** ✓ — benzersiz kalıp %98,5, yasak kalıp 0, ön parça şutör adı 4668/4668.
- `sim-node --n=400` ✓ — 0 hata, deterministik, ortalama 88,2-80,0.
- Anlatım dili **niteliksel olarak da düzeldi.** Örnek (tohum 4242):
  `Güneş pasıyla Lielais köşede boştaydı, duraksız çekti. || file boyun eğdi. (3-0)`
  Bu, FAZ 37 öncesindeki `"Magoulas ilerletiyor. Uzun düştü."` telgrafından bambaşka bir yerde.
- **Top boşlukta kalma** sorunu kapandı (sahipsiz kare %16,7 → %1,59).

FAZ 38 bunların üstüne gelir; **hiçbirini geri almaz.**

---

## 1. BU TURUN KAYNAĞI VE YÖNTEMİ

İki kaynak birlikte kullanıldı:

1. **Saf-Node harness (60-200 maç).** Motorun kendi `simulateMatch` sözleşmesi üzerinden, tarayıcısız. Kutu skor, pozisyon süresi, rotasyon ölçümleri buradan.
2. **Gerçek Chrome'da canlı maç (commit `95c2e69`, GitHub Pages).** Bir maç izlendi, top ve 10 oyuncu 100 ms aralıklarla **3.159 kez** örneklendi; 22 saha şutu ve 2 serbest atış anı ayrıca yakalandı.

Yeni ölçüm yüzeyi şu: **mevcut 25 denetim aracınızın hiçbiri kutu skorun gerçek basketbolla uyumuna bakmıyor.** `band.js` skorun *bandına* bakıyor, `box-band.js` kutu skorun *kendi içinde tutarlılığına* bakıyor; ama "2 sayılık isabet %61 gerçek mi?" sorusunu soran kapı yok. FAZ 38'in çekirdeği bu.

### 1.1 CANLI DOĞRULAMA — FAZ 37 sahada tutuyor mu? (315 sn · 3.159 örnek · gerçek Chrome)

| Ölçüt | FAZ 36 | **FAZ 37 canlı** | Hedef | |
|---|---|---|---|---|
| Top `pass` modu | %24,5 – %38,6 | **%10,0** | ≤%18 | ✓ |
| Top `held` modu | %56 – %73 | **%75,2** | ≥%65 | ✓ |
| Sahipsiz top karesi | %12,1 – %16,7 | **%3,5** | ≤%2 | ~ 5× iyileşme, hedefin biraz üstünde |
| Aynı anda koşan oyuncu | 5,4 – 7,5 / 10 | **5,9 / 10** | 3 – 5 | ✗ |
| Şut anında yerinde (10) | 6,2 – 6,9 | **6,95** | ≥8,5 | ✗ (harness'ın 7,3-7,7 iddiasına yakın) |
| Şut anında yerinde hücumcu (5) | — | **3,68** | ≥4,25 | ✗ (harness 3,87 demişti — tutarlı) |
| **Serbest atışta yerinde (10)** | **0 / 10** | **10 / 10** (en kötü 10) | ≥9 | ✓✓ |
| Orta çizgi geçişi | 1 (81 sn'de) | **29** (315 sn'de) | — | ✓ |
| Konsol hatası | 0 | **0** | 0 | ✓ |

`_ballKurtar`, `_sahipsizTopTick`, `_bgPause`, `_simCatchUp` — hepsi canlıda mevcut ve çalışıyor. Şut saati göstergesi gerçekten sayıyor (`_scAnchor` / `_clkNow` tutarlı).

**Sonuç: FAZ 37'nin en kritik iki maddesi (top boşlukta kalma, serbest atış dizilişi) sahada doğrulandı.** Kalan üç sapma yukarıda ✗ ile işaretli; ikisi (koşan oyuncu, şut anında yerinde) FAZ 37'nin kendi "yapamadıklarım" listesinde zaten kabul edilmişti.

**Bir uyarı:** İlk 84 saniyelik ölçümde "şut anında yerinde" 5,56/10 çıkmıştı; örneklem 22 şuta genişleyince 6,95'e oturdu. Küçük örneklemle karar vermeyin — bu paket boyunca kullanılan tüm sahne ölçütleri **en az 20 şut** üzerinden alınmalı.

---

## 2. KIRMIZI ÇİZGİLER — FAZ 38'DE DEĞİŞTİ

**FAZ 37'nin "sonuç matematiğine dokunma" yasağı bu pakette KALKTI.** Kullanıcı kararı: isabet oranları, üçlük payı, ribaunt, faul ve top kaybı **gerçek FIBA bantlarına çekilecek.** Bu, `band.js` / `measure.js` referans hash'lerinin değişmesi demektir ve **beklenen sonuçtur.**

Yerine geçen çizgiler:

- **Skor bandı korunur:** takım başına ortalama **78-95** sayı, çeyrek başına toplam **38-46**. Bunun dışına çıkan hiçbir ayar kabul edilmez.
- **Determinizm korunur:** aynı tohum → birebir aynı maç. `sim-node` determinizm kapısı geçmeli.
- **Kilitli sonuç (C1) korunur:** mevcut kayıtlardaki `G.pendingMatch` sonuçları bozulmaz; migrasyon gerekiyorsa yaz.
- **Yeniden temellendirme bilinçli olacak:** `band.js` ve `measure.js` referans hash'leri **tek bir adımda**, ayrı ve açıklamalı biçimde güncellenecek; `PROGRESS.md`'ye eski ve yeni hash birlikte yazılacak.
- FAZ 37 kazanımları **regresyon testine tabidir**: `sut-cografya-check` 18/18, `anlatim-check` 31/31, `sahne-check` ≥6/8 aynı kalmalı (bölge/tip hedef bantları üçlük payı değişince kendini ölçekliyor zaten).
- Türkçe; minimal değişiklik; dosya silme yok; her DOM/API'de `try-catch`.
- **Commit/push yok.**

---

## 3. ÖLÇÜM — KUTU SKOR GERÇEKÇİLİĞİ (60 maç · takım başına maç başına)

| Ölçüt | Şu an | Gerçek (FIBA / BSL) | Durum |
|---|---|---|---|
| Sayı | 87,3 | 78 – 92 | ✓ |
| FGA | 60,6 | 58 – 68 | ✓ |
| **FG%** | **55,7%** | %44 – %50 | ✗✗ |
| **2P%** | **61,4%** | %50 – %58 | ✗✗ |
| **3PA** | **15,7** | 20 – 27 | ✗✗ |
| **3PA / FGA** | **25,8%** | %33 – %40 | ✗✗ |
| 3P% | 39,5% | %33 – %38 | ✗ |
| FTA | 18,0 | 16 – 24 | ✓ |
| FTA / FGA | 0,297 | 0,24 – 0,32 | ✓ |
| FT% | 75,1% | %72 – %78 | ✓ |
| **Ribaunt** | **28,6** | 33 – 40 | ✗✗ |
| Asist | 20,0 | 17 – 22 | ✓ |
| Asist / isabetli şut | 0,59 | 0,55 – 0,68 | ✓ |
| **Top kaybı** | **9,7** | 11 – 15 | ✗ |
| **Top çalma** | **5,5** | 6,5 – 9 | ✗ |
| Blok | 2,5 | 2,5 – 4,5 | ~ alt sınır |
| **Faul** | **15,0** | 17 – 22 | ✗ |
| Uzatmaya giden maç | %3,5 (200 maç) | %4 – %8 | ~ |

**Zincirleme kök neden — tek sayı her şeyi bozuyor:**

```
2P% %61,4  →  kaçan şut az  →  ribaunt az (28,6)  →  ikinci şans az
           →  tip-in %0,2   →  hücum ribaundu anlatımı seyrek
           →  skor 2 sayıdan geliyor  →  üçlük payı düşük kalıyor (%25,8)
```

Yani "pivot çok üçlük atıyor mu" gibi tek tek maddeler değil, **oyunun tamamı fazla verimli.** Gerçek basketbolda hücumların yaklaşık yarısı boşa gider; burada gitmiyor.

---

## 4. ÖLÇÜM — POZİSYON SÜRESİ (60 maç · 9.876 pozisyon · `dtPos`)

| Süre | Tümü | Hızlı hücum | Gerçek |
|---|---|---|---|
| 0 – 4 sn | %0,6 | %0,2 | %1 – 2 |
| **5 – 7 sn** | **%0,4** | **%0,6** | **%12 – 16** |
| 8 – 10 sn | %9,7 | %8,8 | %14 – 18 |
| 11 – 13 sn | %27,5 | %30,6 | %15 – 18 |
| 14 – 16 sn | %26,3 | %24,7 | %16 – 19 |
| 17 – 19 sn | %26,6 | %25,9 | %15 – 18 |
| 20 – 24 sn | %8,8 | %9,3 | %12 – 16 |
| 25+ sn | %0,0 | %0,0 | %1 – 2 (ihlal) |

**HIZLI HÜCUMUN ORTALAMA SÜRESİ 14,8 SANİYE — SET HÜCUMUYLA BİREBİR AYNI.** (Gerçek: 5-9 sn.)

FAZ 37 hızlı hücumu **sunumda** yarattı (payı %15,3, sahnede sprint var, anlatımda "⚡ Hızlı hücum!" yazıyor) ama **maç saatinde yaratmadı.** Kök neden `match-engine.js` satır ~4888:

```js
t = Math.max(0, t - rand(decLo, decHi));   // decLo=10, decHi=20 (normal tempo)
```

Pozisyon maliyeti **düzgün dağılımlı 10-20 sn** ve hızlı hücumdan haberi yok. Sonuç: hiçbir pozisyon 9 saniyeden kısa süremez, yani **hızlı hücum tanım gereği imkânsız.** Kullanıcının "hiç gerçek bir fast break izleyemiyorum" şikâyetinin kalan yarısı tam olarak budur.

Ayrıca gerçek pozisyon süresi düzgün dağılmaz; **iki tepeli**dir: geçiş hücumu (5-9 sn) ve set hücumu (14-20 sn).

---

## 5. ÖLÇÜM — ROTASYON (40 maç)

| Ölçüt | Şu an | Gerçek | Durum |
|---|---|---|---|
| Yedeklerin (ilk 5 dışı) sayı payı | **%15,0** | %25 – %38 | ✗✗ |
| Kutu skorda görünen oyuncu | **9,7** | 10 – 12 | ✗ |
| En skorer oyuncunun sayı payı | **%26,8** | %18 – %26 | ✗ |
| Sayı bulan oyuncu | 8,6 | 8 – 11 | ✓ |
| Oyuncu değişikliği (iki takım) | **9,8** | 14 – 24 | ✗✗ |

İlk beş neredeyse tüm maçı oynuyor. Bu bir menajerlik oyununda **oynanışı da bozar**: kadro derinliği, enerji yönetimi, altyapıdan oyuncu çıkarma — hepsi anlamsızlaşır, çünkü 6-12 numaralı oyuncuların maça etkisi yok.

---

## 6. ÖLÇÜM — EKSİK KURAL OLAYLARI

Motorun ürettiği olay türlerinin tamamı:
`score2 · miss2 · miss3 · score3 · free · reb · steal · foul · sub · tactic · quarter_start · quarter_end · start · mvp · end`

Gerçek bir basketbol maçında olup burada **hiç olmayanlar:**

- **Mola (timeout)** — kullanıcı düğmesi var ama bot koç asla mola almıyor; olay akışında mola diye bir şey yok. Gerçek maçta 8-10 mola.
- **Şut saati ihlali (24 sn)** — hiç yok (%0,0). Gerçekte maç başına ~1-2.
- **Hücum faulü / şarj** — yok. Gerçekte maç başına 2-4.
- **Adım (travelling), çift sürme, top ayakta** — yok. Bütün top kayıpları "hatalı pas" veya "çalma".
- **Taç / dışarı çıkan top** — yok.
- **Teknik faul, sportmenlik dışı faul** — yok.
- **Maç içi sakatlık** — maç sonunda uygulanıyor ama maç sırasında olay olarak görünmüyor.
- **3 saniye, 8 saniye ihlali** — yok.

Bu, anlatımın çeşitliliğini de sınırlıyor: 200 olayın 190'ı şut/ribaunt/faul olduğu için maç "şut makinesi" gibi akıyor.

---

## 7. ÖLÇÜM — ŞUT SAATİ GÖSTERGESİ YALAN SÖYLÜYOR

`js/main.js` satır ~516-523:

```js
let left = limit - used;
if (left < 0) { mState._scAnchor = now; mState._scLimit = 24; left = 24; }
scEl.textContent = mState.running ? ('ŞUT ' + Math.max(0, Math.ceil(left))) : '';
```

Saat limiti aşınca **sessizce 24'e sıfırlanıyor.** Sonuç: ekrandaki "ŞUT n" göstergesi hiçbir zaman 0'a inmez, hiçbir zaman ihlal üretmez, ve motorun gerçek pozisyon süresiyle bağı yoktur — dekoratif bir sayaçtır. Motor zaten şut saati modellemiyor (§4), bu yüzden gösterge de modelleyemiyor.

---

## 8. ÖLÇÜM — ANLATIMDA KALAN KUSURLAR

### 8.0 NOKTALAMA HATASI — canlı ekranda okunan her iki satırdan biri bozuk *(YENİ, yüksek öncelik)*

FAZ 37 anlatımı iki beat'e böldü ve `chain:true` ile ikisini **aynı balonda** birleştirdi. Ama ikinci beat küçük harfle başlıyor ve birincisi noktayla bitiyor. Ekranda okunan sonuç:

```
1P 2:05  Çaprazdan sıyrıldı — Xiaofeng Mu yayın tepesinden bıraktı. dengesi kaydı, olmadı.
1P 2:59  Geiger buldu; Hattori geriye çekilip alan açtı ve bıraktı. arka demirden içeri döndü. (13 - 16)
1P 3:51  Top dış çevrede dolaştı — Beka Gamkrelidze kanattan ... ve bıraktı. hedefi bulmadı.
```

**Canlı ölçüm: 45 anlatım satırının 20'sinde (%44) noktadan sonra küçük harf var.**

Bu **yalnız tarayıcıda görünür** bir hata: `anlatim-check` `preText` ve `text`'i ayrı ayrı (ve `metinTam` olarak birleşik) tarıyor, ama **render edilmiş balonun noktalamasını** hiç görmüyor. Harness yeşil, ekran bozuk.

**Çözüm (biri seçilecek, tercih A):**
- **A)** Ön parça nokta yerine **kısa çizgi veya üç nokta** ile bitsin: `"… ve bıraktı —"` + `"hedefi bulmadı."` Yayın dilinde en doğal olan bu.
- B) Sonuç parçasının ilk harfi `chain` ile basılırken büyütülsün (Türkçe `i→İ` kuralına dikkat — `trBuyuk` kullan).

**Kabul:** Canlı ekranda basılan satırlarda `\.\s+[a-zçğıöşü]` eşleşmesi **0**. Bu kapı `anlatim-check`'e değil, **render katmanını da gören** yeni bir kapıya (`sahne-check` veya yeni `balon-check`) yazılmalı — yoksa aynı hata tekrar gözden kaçar.

### 8.1 Diğerleri

Dil genel olarak çok iyi. Kalanlar:

**8.2 Sonuç yarısı bazen sonucu söylemiyor.** Gerçek örnekler:
- `|| iki takım da durdu, sayı geldi.` (isabetli 2 sayı — cümle sahayı anlatmıyor)
- `|| bu kez şaşırdı.` (kaçan üçlük — kim şaşırdı?)
- `|| kolay göstermeyi başardı.` · `|| şaşırtmadı, girdi.` · `|| doğru zamanda geldi.`
  → Bu üçü hem isabet hem kaçış gibi okunabiliyor; skor etiketi olmasa ayırt edilemez.
- `|| demirden sekti, top havada.` · `|| yay çok yüksek kaldı.`
  → Bunlar **sonuç değil ara durum**; pozisyon burada bitiyor ama cümle bitmiyor.

**8.3 Oyuncu değişikliği havuzunda belirsiz bir kalıp var.** Havuzda iki biçim birlikte duruyor:
- ✓ `Rotasyon Tehran Metropolitans'ta: Joaquin Maloles çıkıyor, Stelios Melissanidis giriyor.` (canlıda görüldü — net)
- ✗ `Deplasman Kurtları taze güç istiyor — Vasil Pashov için Zdenko Pačuta kenara geliyor.` (harness'ta görüldü — "X için Y kenara geliyor" kimin girip kimin çıktığını okutmuyor)

İkinci biçim havuzdan çıkarılmalı; birinci biçim standart olmalı.

**8.4 Serbest atış dili.** `Lielais çizgide 1/2 — yarısı geldi.` → "yarısı geldi" zorlama.
Ölçülen FT dağılımı sağlıklı (`2/2` 498 · `1/2` 295 · `0/2` 56 · `3/3` 37), sorun yalnız sözcükler.

**8.5 Smaç + hava atışı çelişkisi.** 491 smaç anlatımının 1'i "fileye değmedi, hava atışı oldu" ile bitiyor. Nadir ama **kapısı yok** — smaç fiziksel olarak hava atışı olamaz.

**Not:** İlk taramamda "pozisyonların %9'u 24 saniyeyi aşıyor" diye bir bulgu çıkarmıştım; doğru alanla (`dtPos`) tekrar ölçünce bunun ölçüm hatası olduğunu gördüm (gerçek: %0,0). Pakete alınmadı.

---

## 9. YAPILACAKLAR

### İŞ 1 — KUTU SKOR GERÇEKÇİLİĞİ *(en yüksek etki)*

Hedef bantlar (60+ maç ortalamasında, takım başına):

| | Hedef |
|---|---|
| 2P% | %51 – %56 |
| 3P% | %34 – %37 |
| FG% | %45 – %49 |
| 3PA / FGA | %33 – %38 |
| Ribaunt | 33 – 39 |
| Top kaybı | 11 – 14 |
| Top çalma | 6,5 – 8,5 |
| Blok | 3 – 4,5 |
| Faul | 17 – 21 |
| Sayı | 80 – 92 (korunur) |

Adımlar:
1. **İsabet tabanlarını indir.** `runPossession` içindeki `oppBase` (`0.534` / `0.366`) ve kullanıcı tarafındaki karşılığı gerçek bantlara çekilecek. İsabet zaten oyuncu statından, enerjiden, moralden ve savunmadan geçiyor — **taban** değişecek, formül değil.
2. **Üçlük payını yükselt.** `userIs3Oran` ve bot karşılığı (`0.32 + botPb.is3`) **0,36-0,38** bandına. Bölge/tip hedefleri `sut-cografya-check` içinde zaten üçlük payına ölçekleniyor, elle eşik yazma.
3. **Skoru dengele.** İsabet düşünce skor düşer; açığı **tempo** kapatır: pozisyon sayısı §İŞ 2'deki dağılımla artacak (ortalama pozisyon süresi 14,8 → ~13,5 sn). İki etkiyi birlikte ayarla, tek tek değil.
4. **Ribaunt** kendiliğinden artar (kaçan şut arttığı için). Yine de `rebOff` oranını (`0.26`) gerçek ORB% bandına (%26-30) göre doğrula.
5. **Faul ve top kaybını** bantlara çek; faul artınca FIBA çeyrek-bonusu (5. takım faulü) gerçekten devreye girsin.
6. **Uzatma oranı** %4-8'e yaklaşsın (şu an %3,5 — muhtemelen kendiliğinden düzelir, ölç).

### İŞ 2 — HIZLI HÜCUMUN SAATİ

`match-engine.js` ~4888: pozisyon maliyeti artık **pozisyonun türünü** bilsin.

```
hızlı hücum (fb)   → 5 – 9 sn
erken hücum        → 9 – 13 sn
set hücumu         → 13 – 21 sn
şut saati ihlali   → 24 sn (nadir, İŞ 4)
```

- `fbMat` bayrağı zaten pozisyon başında biliniyor — maliyeti oradan seç.
- Sonuç iki tepeli bir dağılım olmalı; düz `rand(10,20)` gitmeli.
- **Bu, pozisyon sayısını artırır** (maç başına ~162 → ~175). Skor bandını korumak için İŞ 1'le birlikte ayarla.
- Canlı izlemede sunum temposu (`dtPos`) da kısalacağı için hızlı hücum **ekranda da hızlı** akacak — FAZ 37'nin koreografisi nihayet karşılığını bulacak.
- **Kabul:** 5-7 sn bandı ≥%10 · hızlı hücumun ortalama süresi **≤9,5 sn** · genel ortalama 12,5-14,5 sn.

### İŞ 3 — ROTASYON VE YEDEK KULLANIMI

- Oyuncu değişikliği sayısını iki takım toplamında **16-22**'ye çıkar (şu an 9,8). Tetikleyiciler: enerji eşiği, faul yükü (3. faulde dinlendirme), çeyrek başı planlı rotasyon, fark açıldığında derinlik.
- Hedef: **yedeklerin sayı payı %25-35**, kutu skorda **10-12 oyuncu**, en skorer oyuncunun payı **%18-26**.
- Bot koç (`botCoachTick`) için de aynı rotasyon mantığı — iki taraf simetrik olmalı.
- Enerji sistemi zaten var; rotasyon onu **gerçekten kullansın** (bu, menajerlik tarafını da anlamlı kılar).

### İŞ 4 — EKSİK KURAL OLAYLARI

Yeni olay türleri ekle (her biri için anlatım havuzu + EN karşılığı):

| Olay | Maç başına hedef | Not |
|---|---|---|
| `mola` (timeout) | 8 – 10 (iki takım) | Bot koç seri yediğinde / kritik anda alsın; kullanıcının mevcut mola düğmesiyle aynı akışı kullansın |
| `ihlal24` şut saati | 1 – 2 | İŞ 2'nin doğal sonucu; anlatımı ve korna sesi olsun |
| `hucumFaulu` (şarj) | 2 – 4 | Faul sayacına yazılır, serbest atış yok, top el değiştirir |
| `adim` / `ciftSurme` | 2 – 4 | Top kaybının bir alt türü — "hatalı pas"ın tekdüzeliğini kırar |
| `tac` (dışarı çıkan top) | 3 – 6 | Kısa olay; kenardan sokma koreografisi zaten var |
| `teknik` / `sportmenlikDisi` | %10 – %20 maçta 1 | Nadir olsun ki değeri kalsın |
| `sakatlikMac` | %8 – %12 maçta 1 | Maç sonu sakatlık sistemi var; maç içine taşı |

Kural: bu olaylar **top kaybı / faul toplamlarının içinden** çıksın, üstüne eklenmesin — yoksa İŞ 1'in bantları bozulur.

### İŞ 5 — ŞUT SAATİ GÖSTERGESİ

- `main.js`'teki sessiz sıfırlamayı (`if(left<0){ ... left=24; }`) **kaldır.**
- Göstergeyi motorun gerçek pozisyon saatine bağla: pozisyon başladığında 24 (hücum ribaundunda 14), pozisyon süresince gerçekten azalsın, 0'a inince `ihlal24` olayı gelsin.
- Son 5 saniyede gösterge kırmızıya dönsün (görsel gerilim — bedava kazanç).
- **Kabul:** gösterilen şut saati ile olayın `dtPos` değeri arasındaki fark ≤1 sn; ihlal olayı gerçekten 0'da doğuyor.

### İŞ 6 — ANLATIM CİLASI

0. **NOKTALAMA — önce bunu yap (§8.0).** Ön parça ile sonuç parçası aynı balonda birleşirken "nokta + küçük harf" üretiyor; canlıda satırların **%44'ü** böyle. Ön parçayı kısa çizgi/üç nokta ile bitir (tercih) ya da sonuç parçasının ilk harfini Türkçe kurallarına göre büyüt. Bu tek düzeltme, kullanıcının ekranda okuduğu metnin yarısını düzeltir.
1. **Sonuç yarısı her zaman sonucu söylesin.** `SUT_SONUC` havuzunu tara: skor etiketi olmadan okunduğunda isabet mi kaçış mı belli olmayan her satır ya düzeltilecek ya çıkarılacak. Kapı: **ayrık okunabilirlik** — bir hakem betiği (sonuç satırı + gerçek sonuç) üzerinde otomatik sınıflandırma %100 tutmalı.
2. **Ara durum cümlelerini ayır.** "demirden sekti, top havada." · "yay çok yüksek kaldı." gibi satırlar pozisyonu bitirmiyor; ya ribaunt cümlesiyle birleştir ya havuzdan çıkar.
3. **Değişiklik cümlesi netleşsin:** `"<Çıkan> kenara geliyor, yerine <Giren> girdi."` biçimi tek standart olsun.
4. **Serbest atış dili:** "yarısı geldi" gibi zorlama kalıpları temizle; 1/2, 2/2, 0/2, 2/3, 3/3 için ayrı ve doğal havuzlar.
5. **Smaç kapısı:** `sut==='smac'` iken "hava atışı / fileye değmedi" satırları yasak (havuz süzgeci + `anlatim-check` kapısı).
6. Yeni kural olaylarının (İŞ 4) anlatım havuzları FAZ 37 rejistrinde yazılacak: kurulum/sonuç bölünmesi, yasak kalıp listesi ve ad kuralı **aynen geçerli.**

---

## 10. UYGULAMA SIRASI

| Sıra | İş | Etki | Risk |
|---|---|---|---|
| 1 | **İŞ 6.0 — noktalama** (§8.0) | Yüksek (ekranda hemen görünür) | **Çok düşük** |
| 2 | İŞ 2 — hızlı hücumun saati | Yüksek | Orta (tempo skoru etkiler) |
| 3 | İŞ 1 — kutu skor gerçekçiliği | **En yüksek** | Yüksek (yeniden temellendirme) |
| 4 | İŞ 3 — rotasyon | Yüksek | Orta |
| 5 | İŞ 5 — şut saati göstergesi | Orta | Düşük |
| 6 | İŞ 4 — eksik kural olayları | Orta-yüksek | Orta |
| 7 | İŞ 6.1-6.6 — anlatım cilasının kalanı | Orta | Düşük |

**İŞ 1 ve İŞ 2 birlikte ayarlanmalı** — biri skoru düşürür, diğeri yükseltir. Önce ikisini beraber kalibre et, sonra yeniden temellendir.

---

## 11. TEST VE KABUL

1. **Yeni araç: `tools/kutu-check.js`.** §3'teki 18 satırın hepsini kapı yapar (60 maç, `simulateMatch` üzerinden, tarayıcısız). Bandın dışına çıkan her satır kırmızı.
2. **Yeni araç: `tools/tempo-check.js`.** §4'teki pozisyon süresi dağılımı + hızlı hücum ortalama süresi + pozisyon/maç sayısı.
3. **Yeni araç: `tools/rotasyon-check.js`.** §5'teki beş satır.
4. **Regresyon (FAZ 37 kazanımları):** `sut-cografya-check` 18/18 · `anlatim-check` 31/31 (+ yeni kapılar) · `sahne-check` ≥6/8 · `sut-check` 14/14.
   Ayrıca canlıda ölçülen şu üç değer **kötüleşmemeli**: top `pass` modu ≤%12 · sahipsiz top karesi ≤%4 · serbest atışta yerinde oyuncu ≥9/10.
   **Yeni kapı — render katmanı:** §8.0'ın noktalama kapısı `preText`/`text`'i ayrı ayrı değil, **balonda birleşmiş hâlini** okumalı. FAZ 37'nin dersi buydu: harness yeşilken ekran bozuk olabiliyor.
5. **Determinizm:** `sim-node --n=1000 --seed=42` — hata 0, aynı tohum aynı maç, `G` değişmedi.
6. **Yeniden temellendirme:** `band.js` ve `measure.js` referans hash'leri **ayrı bir adımda** güncellenecek; `PROGRESS.md`'ye **eski → yeni** ikilisi yazılacak.
7. **Kayıt uyumu:** mevcut kayıtla oyun açılıp bir maç oynanabiliyor; kilitli sonuç (C1) bozulmuyor.
8. **Kendi kendini test et**, kullanıcıdan manuel kontrol isteme. Yalnız senin bilemeyeceğin bir şey varsa sor.

---

## 12. TESLİM

- Her iş kaleminden sonra `PROGRESS.md`'ye **ekleyerek** yaz: ne yaptın, neden, önce/sonra ölçüm tablosu.
- Bitince değişiklik özetini ve **önce/sonra kutu skor tablosunu** sun.
- **Commit/push yok.**
- Bittiğinde kullanıcıya tek cümleyle hatırlat: canlı siteyi (GitHub Pages) güncellemek için push gerekiyor; aksi hâlde tarayıcıda önceki sürüm görünür. (FAZ 37 için bu yapıldı — `95c2e69` yayında.)
