# CHARAZAY 2.0 — CANLI MAÇ REVİZE PAKETİ · FAZ 37
## "Gerçek basketbol" revizyonu: anlatım rejistri + oyun mantığı + top/oyuncu senkronu

> **Nasıl kullanılır:** Bu dosyanın tamamını `winegg420/basketlig` reposunun açık olduğu bir Claude Code oturumuna **tek mesaj** olarak yapıştır.

---

## 0. ROL

Sen Charazay 2.0'ın canlı maç sunum katmanında çalışan kıdemli geliştiricisin. Bu paket **canlı ölçüme** dayanıyor: oyunun GitHub Pages sürümü (commit `aa83a90`) gerçek Chrome'da açıldı, bir maç baştan izlendi, top ve 10 oyuncunun durumu 100 ms aralıklarla **2.200+ kez** örneklendi; ayrıca motor **15 maç** boyunca headless koşturulup **1.756 şut** istatistiksel olarak tarandı. Aşağıdaki her madde sayısal kanıta bağlı.

**Görev:** Maç sonucu matematiğine dokunmadan, canlı maçın (a) spiker dilini profesyonel yayın rejistrine taşımak, (b) basketbol mantığı hatalarını gidermek, (c) top/oyuncu senkron hatalarını kapatmak.

---

## 1. KIRMIZI ÇİZGİLER — DOKUNMA

- **Maç sonucu matematiği DEĞİŞMEZ.** İsabet olasılıkları, skor bandı (~85-100), taktik çarpanları, faul/FT/MVP mantığı aynı kalır. Belirleyici olaylarda yeni `Math.random()` çağrısı **yok**; sunum kararları yalnızca sunum PRNG'si (`pr` / `_sr`) üzerinden verilir — aksi hâlde `band.js` hash'i kayar.
- **Değişmezlik testi:** Sabit girişte skor / kazanan / kutu skor **birebir aynı** kalmalı.
- Kilitli-sonuç ve save-scum koruması (C1), manuel koçluk / resume (C2), rakip kadro kalıcılığı (A1-A3), i18n (TR/EN) yapısı korunur.
- Türkçe kod yorumları; **minimal, düzenleyici** değişiklik; dosya silme/yeniden yazma yok, mevcut fonksiyonları düzenle.
- Her DOM / API erişimi `try-catch` içinde.
- **Commit/push yapma.** Bitince değişiklik özetini sun.

---

## 2. ÖLÇÜM — KANIT TABLOSU

### 2.1 Canlı maç (Chrome, 1× hız, ~2.200 örnek)

| Ölçüt | Ölçülen | Hedef | Durum |
|---|---|---|---|
| Top `pass` modunda geçen süre | **%24,5 – %38,6** | ≤ %18 | ✗ Top sürekli havada |
| Top `held` (tutma/sürme) | %56 – %73 | ≥ %65 | ~ |
| **Topa en yakın oyuncunun >2 m uzakta olduğu kare oranı** | **%12,1 – %16,7** | ≤ %2 | ✗ **Top boşlukta kalıyor** |
| Aynı anda koşan oyuncu (hız > 15 px/sn) | **5,4 – 7,5 / 10** | 3 – 5 / 10 | ✗ Herkes koşuyor |
| Şut anında hedefine varmış oyuncu | **6,2 – 6,9 / 10** | ≥ 8,5 / 10 | ✗ Diziliş oturmuyor |
| Serbest atış anında yerinde olan oyuncu (yakalanan kare) | **0 / 10** | ≥ 9 / 10 | ✗ **Yerleşmeden atılıyor** |
| Topu yarı sahadan geçiren oyuncu payı (PG+SG+SF) | %80 (C+PF %20) | ≥ %90 | ✗ |

**Görsel kanıt (ekli ekran görüntüleri):** Ç2 4:43 — 10 oyuncunun **tamamı** sol yarı sahada kümelenmişken **top sağ boyanın içinde tek başına duruyor** (en yakın oyuncu ~350 px ≈ 12 m). Ç3 5:54 — 9 oyuncu sağ potada, **top orta sahada sahipsiz**.

**Kök neden (kod):** `_ballStep` (match-engine.js:932) `case 'pass'` dalında pas bitince `_ballHold(to)` çağrılıyor. `_ballHold` (satır 875) ilk satırında `if(!p) return;` yapıyor — **hedef geçersizse mod değişmeden sessizce dönüyor**. Bu durumda top `mode:'pass'`, `vx=vy=0`, `carrier=null` ile **kalıcı olarak boşlukta donuyor**; oyun devam ediyor ama top asla kimseye ulaşmıyor. Canlı oturumda tam olarak bu durum yakalandı (`mode:"pass", t:0, x:194 sabit, carrier:null`).

**İkinci kök neden:** Sekme arka plana alındığında `requestAnimationFrame` duruyor (rAF throttle) ama olay oynatıcısı `matchStep` `setTimeout` ile **çalışmaya devam ediyor**. Sonuç: sahne donuyor, anlatım ve skor akmaya devam ediyor; sekmeye dönüldüğünde top ve oyuncular olayın çok gerisinde kalıyor. Ölçümde `document.hidden=true` iken sim saati 22 saniye boyunca **hiç ilerlemedi**, skor 48→63'e çıktı.

### 2.2 Motor istatistiği (15 maç · 1.756 şut)

| Ölçüt | Ölçülen | Gerçek basketbol bandı | Durum |
|---|---|---|---|
| **Hızlı hücum (fast break) payı** | **%5,6** | %14 – %18 | ✗ Neredeyse yok |
| **Hızlı hücumun üçlükle bitme oranı** | **%35,7** | ≤ %20 | ✗ Fast break üçlükle bitiyor |
| Orta mesafe (midrange) şut payı | **%6,1** | %14 – %22 | ✗ |
| Pota dibi + boya payı | **%64,7** | %45 – %52 | ✗ |
| Turnike (`turnike`) şut tipi payı | **%42,9** | %22 – %28 | ✗ Her şey turnike |
| Kanca (`kanca`) payı | %6,0 | %1,5 – %3 | ✗ |
| Putback (hücum ribaundu bitirişi) | **%1,0** | %4 – %6 | ✗ |
| Üçlük denemesi payı | %29,2 | %33 – %40 | ~ Düşük |
| Köşe / kanat / tepe üçlük dağılımı | %33,6 / %29,5 / %36,9 | %25 / %40 / %35 | ~ Köşe fazla, kanat az |
| Anlatım kalıp tekrarı (6 maç, 1.206 satır) | %10,0 | ≤ %12 | ✓ **Sorun tekrar değil** |

**5 numara üçlüğü:** Pivotun (C) üçlük payı **%0,8** (249 şutta 2 üçlük) — bu **zaten doğru** çalışıyor (`runPossession` içindeki C→dış oyuncu devretme mantığı). PF %10,8. Bu maddeyi "düzelt" değil, **regresyon kilidi** olarak ele alacağız (aşağıda İŞ 8).

### 2.3 Anlatımdan gerçek örnekler (canlı log)

```
[Gamkrelidze çembere yollandı.]  Art arda çalım, savunma dağıldı — Dean pasıyla
                                  Beka Gamkrelidze boyadan yumuşak kavis bıraktı. (2-0)
[Rego bitirmek için kalktı.]      Rego adamını okudu. Smaçladı.
[Magoulas ayakları hazır, bıraktı.] Magoulas ilerletiyor. Uzun düştü.
[Greco dış şutu havaya gönderdi.] Greco perdeden çıktı. Havada kaldı.
[Badea uzaktan bıraktı.]          İkili oyun geldi. Badea üçlük kaçtı.
[Dean yaydan şutu bıraktı.]       ⚡ Hızlı hücum! Arsovski hızlı çıkışta koşan adama attı,
                                  Cole Dean dış şutu geçti, üç.
                                  Arsovski çizgide 2/2 — iki atış iki sayı.
                                  Badea çizgide 2/3 — birini içeride tuttu.
```

Buradan çıkan **beş** ayrı hata (hepsi aşağıda ayrı iş kalemi):

1. **Kronoloji ters.** `preText` "şut bırakıldı" derken, ana metin şuttan ÖNCE olan çalımı/perdeyi/asisti anlatıyor. Yani izleyici önce şutu, sonra şuta giden hamleyi duyuyor.
2. **Telgraf üslubu.** "Rego adamını okudu. Smaçladı." — iki kopuk kısa cümle, özne tekrarı, yayın dili değil.
3. **Türkçe bozuk.** "Badea üçlük kaçtı", "dış şutu geçti", "birini içeride tuttu", "Uzun düştü", "Havada kaldı" (hava atışı mı, oyuncu havada mı belirsiz).
4. **Ad kullanımı tutarsız.** Aynı cümlede "Rychlík boşta bıraktı; **Benjamin Ouellet** turnikeyi tamamladı." — biri soyad, biri tam ad.
5. **Analog/istatistik dili.** "iki sayıyı buldu", "üç sayıyı buldu", "isabet bulamadı", "skora iki ekledi", "sayı üretemedi" — bunlar tabela dili, spiker dili değil.

---

## 3. İŞ 1 — ANLATIM KRONOLOJİSİNİ DÜZELT (en yüksek etki, en düşük risk)

**Şu anki tasarım** (main.js:274 ve match-engine.js:4342): `preText` top elden çıkarken, `text` top çembere varınca basılıyor. Fikir doğru, **içerik yanlış yerde**.

**Yapılacak:** İçeriği iki beat arasında yeniden böl.

- **BEAT 1 — `preText` (top elden çıkarken):** kurulum + hamle + asist + şut tipi/bölgesi.
  `[bağlam öneki?] + [kurulum/şema ibaresi] + [asist ibaresi] + [şut eylemi]`
  Örn: *"Yüksek perdede Dean sıyırdı; Gamkrelidze boyada kavisi bıraktı…"*
- **BEAT 2 — `text` (top çembere varınca):** **yalnız sonuç** + skor etiketi.
  Örn: *"…içeride! (2-0)"* / *"…çemberden döndü."*

**Uygulama notları**
- `runPossession` (match-engine.js:3930 civarı, event push satırı ~4342) `preText`/`text` üretimini bu bölüme göre yeniden düzenle: `MOVE_LINES`, `ASSIST_PHRASES`, `AKIS_ON` içerikleri **`preText`'e**; `SPIKER_LINES[*].score2/score3/miss2/miss3` çekirdekleri **`text`'e**.
- İki beat **tek cümlenin iki yarısı** gibi okunmalı: `preText` üç nokta veya virgülle bitip `text` küçük harfle devam edebilir. Bunun için event'e `chain:true` alanı ekle; `addComment` (main.js:749) `chain` gelen satırı bir önceki satırla **aynı balonda** birleştirsin (yeni DOM tipi açma, mevcut satırın metnine ekle).
- Blok, and-1, top kaybı gibi dallarda da aynı bölünme geçerli.
- **Kabul:** Bir maçın tüm satırları döküldüğünde, hiçbir "sonuç" cümlesi kendi "kurulum" cümlesinden önce basılmıyor (otomatik kontrol: her şut olayı için `preText` zaman damgası ≤ `text`).

---

## 4. İŞ 2 — SPİKER DİLİ: PROFESYONEL YAYIN REJİSTRİ

Sorun tekrar değil (%10 kalıp tekrarı iyi), **rejistr**. Aşağıdaki üç kural motorun cümle kurucusuna (`zincirLine` :3096, `spikerLinePR` :3138, `KISA_CEKIRDEK` :3001, `SUT_LINES` :3054) uygulanacak.

### 4.1 YASAK LİSTESİ — bu kalıpları havuzlardan **kaldır**

| Yasak | Neden | Yerine |
|---|---|---|
| "iki sayıyı buldu" / "üç sayıyı buldu" | tabela dili | "içeride", "fileyi buldu", "geçti" |
| "skora iki ekledi" / "skora katkı" | rapor dili | "farkı ikiye indirdi", "skoru dengeledi" |
| "isabet bulamadı" / "sayı üretemedi" | istatistik dili | "çemberden döndü", "kısa kaldı", "demire çarptı" |
| "dış şutu geçti" / "üç sayılık şutu geçti" | bozuk Türkçe | "dıştan vurdu", "yay ötesinden geçirdi" |
| "%S üçlük kaçtı" | özne-yüklem uyumsuz | "%S'in üçlüğü çemberden döndü" |
| "Havada kaldı." | belirsiz | "Fileye değmedi — hava atışı." |
| "Uzun düştü." | öznesiz | "Şut uzun kaldı, arka demire çarptı." |
| "birini içeride tuttu" (FT) | anlamsız | "ikincisini fileye bıraktı, biri dışarıda" |
| "%S bu denemede isabetsiz." | rapor dili | "%S bu kez tutturamadı." |
| "%S sağduyulu bir bitiriş." | Türkçe değil | "%S sakin bitirdi." |

Bu tarama **`i18n-commentary.js` içindeki EN karşılıkları için de** yapılacak (aynı analog kalıplar orada da var).

### 4.2 AD KULLANIM KURALI (tek, tutarlı)

`_anlatimAdi()` mevcut; tutarlı biçimde uygula:
- Bir pozisyonda oyuncu **ilk kez** anılıyorsa **tam ad** ("Beka Gamkrelidze").
- Aynı pozisyon içinde **sonraki** anmalarda **yalnız soyad** ("Gamkrelidze").
- Aynı cümlede iki oyuncu varsa **ikisi de aynı biçimde** (ikisi de soyad, ya da ikisi de tam ad) — şu anki "Rychlík … Benjamin Ouellet" karışıklığı biter.
- Maçın ilk anılışında ve çeyrek başlarında tam ad; ısınan oyuncuda (`heat≥2`) spiker imzası zaten tam adı kullanıyor, korunur.

### 4.3 PROFESYONEL TERİM SÖZLÜĞÜ (havuzlara eklenecek yeni malzeme)

Türk basketbol yayın diline özgü, **telifsiz, özgün** ifadeler. Her spikerin (coşku/bilge/cem/reha) üslubuna göre dağıt; **her tip için en az 16 kalıp** hedefle.

**Kurulum / şema (preText'e):**
- "Yayın tepesinde top, hücum kuruluyor —"
- "Yüksek perde geldi, savunma geçiş yapmadı —"
- "İkili oyunda perdeci potaya devrildi —"
- "Zayıf taraftan kesme geldi —"
- "Elden ele pasla topu aldı —"
- "Postta sırtı dönük çalışıyor —"
- "Top kısa köşeye indi —"
- "45 dereceden hücum başlıyor —"
- "Dip çizgi boyunca kesti —"
- "Aktarma pasıyla top zayıf tarafa geçti —"
- "Şut saati 6'ya indi, hücumu bitirmek zorundalar —"
- "Geçiş hücumunda sayı üstünlüğü var —"

**Şut eylemi (preText sonu):**
- "…dengesini bozmadan bıraktı."
- "…ayakları kare, ritim şutunu çıkardı."
- "…gelen paslı, duraksız çekti."
- "…savunmacının eli üstünde, zor pozisyondan denedi."
- "…geriye çekilip (step-back) alan açtı ve bıraktı."
- "…uzunların üstünden kavisi tercih etti."

**Sonuç — isabet (text):**
- "…fileyi buldu!"
- "…tereddütsüz içeride."
- "…temiz, file bile sallanmadı."
- "…camdan yumuşak, içeride."
- "…çemberi doldurdu!"
- "…yay ötesinden geçirdi — üç!"

**Sonuç — kaçan (text):**
- "…ön demire çarptı."
- "…arka demirden döndü."
- "…kısa kaldı, ribaunt mücadelesi başlıyor."
- "…çemberi turlayıp çıktı."
- "…fileye değmedi, hava atışı."
- "…savunmanın eli değdi, yörünge bozuldu."

**Savunma / ribaunt / top kaybı:**
- "Yardım savunması tam zamanında geldi."
- "Ribaunt bloğunu (box-out) doğru kurdu."
- "Hücum ribaundu — ikinci şans sayısı geliyor."
- "Pas hattını okudu, top el değiştirdi."
- "Çift savunmaya girdi, topu kaybetti."
- "Kapama (closeout) geç kaldı, şutör boştaydı."

**Serbest atış:**
- "Çizgide iki atış hakkı var."
- "İlkini fileye bıraktı." / "İlkini demire çarptı."
- "İkisini de tereddütsüz kullandı — 2/2."
- "Sayı + faul; ek atış geliyor."

**Bağlam (mevcut throttle korunur, ≤%25 olay):**
- "Cevapsız 8 sayılık seri, koç mola düşünüyor."
- "Fark çift haneye çıktı."
- "Son çeyreğin son dakikaları, her pozisyon kritik."
- "Bu onun üst üste üçüncü isabeti."
- "Takım faul sınırı doldu; artık her temas çizgiye gidiyor."

### 4.4 CÜMLE KOMPOZİSYON KURALI

`buildCommentary` mantığı (`zincirLine` içinde) şu şablona zorlanacak — **öznesiz kısa cümle üretimi kapatılacak**:

```
preText = [bağlam öneki?] + [kurulum/şema ibaresi] + [asist ibaresi?] + [ŞUTÖR ADI] + [şut eylemi]
text    = [sonuç çekirdeği] + [skor etiketi?] + [spiker imzası?]
```

- `preText` **her zaman** şutörün adını içerir.
- `text` özne içermeyebilir (çünkü `preText` zaten söyledi) ama **fiil tam olmalı** — "Tutturdu." / "Kaçırdı." gibi tek kelime çekirdekler yalnızca `chain:true` ile önceki satıra bağlıysa kullanılabilir.
- Bir olayda **en fazla iki cümle**. Şu anki "Perde geldi. Badea turnikeyi geçirdi." gibi üç parçalı telgraf yapısı kaldırılacak.

### 4.5 BÖLGE / TİP TUTARLILIĞI (mevcut süzgeçler korunacak, genişletilecek)

- `zone==='midrange'` → "turnike", "smaç", "pota dibi", "boyalı alan" kelimeleri **yasak**.
- `zone==='corner3'` → yalnız köşe dili; `wing3` → "kanattan/45 dereceden"; `top3` → "yayın tepesinden".
- `sut==='kanca'` → yalnız C/PF ve `scheme==='postup'`.
- `sut==='floater'` → guard/kanat + boya.
- **Kabul:** 1.000 satırlık dökümde bölge-dil uyuşmazlığı **0**.

---

## 5. İŞ 3 — GERÇEK FAST BREAK

**Ölçüm:** şutların yalnızca **%5,6**'sı hızlı hücum; bunların **%35,7**'si üçlükle bitiyor.

`runPossession` (match-engine.js ~4066) içinde:

```js
let fbCh = fromTrans==='steal' ? 0.32 : fromTrans==='reb' ? 0.12 : 0;
```

**Yapılacak (sunum + tempo, sonuç matematiği korunarak):**

1. **Tetikleyicileri genişlet.** Hızlı hücum sadece çalma/savunma ribaundundan doğmasın:
   - top çalma sonrası: 0,32 → **0,46**
   - savunma ribaundu sonrası: 0,12 → **0,22**
   - **uzun ribaunt / bloklanan şut sonrası**: yeni, **0,18**
   - **rakip sayısı sonrası hızlı oyuna sokma ("erken hücum")**: yeni, **0,10** (tempo=hızlı ise ×1,7)
   Hedef: toplam fast break payı **%14 – %18**.
2. **Fast break'in nasıl bittiğini bağla.** `fb===true` iken şut bölgesi dağılımı zorlansın:
   - `rim` %55, `paint` %20, `transition 3` %20, `midrange` %5
   - Bunu `is3` kararından **sonra** bölge seçiminde uygula (isabet olasılığına dokunma; yalnız `xy`/`zone` üretimini yönlendir).
   - Hedef: fast break'in üçlükle bitme oranı **≤ %20**.
3. **Sahne koreografisi** (`animateShotPossession` :1916, `fastBreak` dalı):
   - Savunmadan hücuma dönüşte **outlet pas** görünür olsun: ribaundu alan → kanattaki guard'a tek uzun pas (mevcut `outletTok` mantığı var, **her fast break'te zorunlu** yap).
   - Hücumun 3 oyuncusu **kulvarlarda** (orta + iki kanat) sprint; 2'si trailer olarak geride.
   - Savunmada **en fazla 2** oyuncu geri dönebilsin (sayı üstünlüğü görünsün) — kalan 3'ü geriden yetişsin.
   - Bitiriş: kulvardaki oyuncu potaya iner ya da trailer'a kick-out.
   - Süre: normal set oyunundan belirgin kısa (**≤ 3,2 sn**), böylece izleyici tempo farkını görsün.
4. **Anlatım:** fast break'in kendi ibare havuzu olsun — "Ribaundu aldı, hızlı çıkıyorlar…", "Sayı üstünlüğü var, 3'e 2…", "Kulvardan koşan adama gönderdi…", "Trailer geldi, yay ötesinde boştaydı…". "⚡ Hızlı hücum!" etiketi kalsın ama **her fast break'te değil**, ~%40'ında.

---

## 6. İŞ 4 — ŞUT COĞRAFYASI VE TİP DAĞILIMI

**Ölçüm:** turnike %42,9 · midrange %6,1 · rim+paint %64,7 · putback %1,0 · kanca %6,0.

`randShotXY` (match-engine.js:24) ve `sut` seçimi (~4230) düzenlenecek. **Takımın toplam 2sy/3sy isabet oranı ve skor bandı değişmeyecek** — değişen yalnızca şutun nereden ve hangi tiple atıldığı.

Hedef dağılım (1.500+ şutta doğrulanacak):

| Bölge | Hedef |
|---|---|
| rim | %26 – %30 |
| paint (rim dışı) | %18 – %22 |
| midrange | %14 – %18 |
| corner3 | %8 – %10 |
| wing3 | %13 – %15 |
| top3 | %11 – %13 |

| Şut tipi | Hedef |
|---|---|
| turnike | %22 – %28 |
| smaç | %5 – %7 |
| floater | %8 – %10 |
| jumper (orta mesafe) | %14 – %18 |
| üçlük | %33 – %38 |
| kanca | %1,5 – %3 |
| tip-in / putback | %4 – %6 |

Ek kurallar:
- **Putback**: hücum ribaundu (`rebOff`) sonrası bir sonraki pozisyonun **%45'i** putback olsun (şu an neredeyse hiç yok). Bu, ikinci şans sayılarını görünür kılar.
- **Kanca** yalnız C/PF + postup + `prChance(0.18)` (0,42'den düşür).
- **Orta mesafe** şutu SG/SF/PF için ayrı bir "pull-up jumper" dalı olarak açılsın (pick-and-roll sonrası guard'ın çekildiği şut) — bu, en çok eksik olan basketbol görüntüsü.

---

## 7. İŞ 5 — TOPU KİM TAŞIR, YARI SAHA NASIL GEÇİLİR

**Ölçüm:** yarı sahayı topla geçenlerin **%20'si C veya PF**. Gerçekte bu iş 1-2-3 numaranın işidir.

`_TASIYICI_ROL=[0,1,2]` sabiti (match-engine.js:1168) var ama uygulaması sızdırıyor.

**Yapılacak:**
1. **Taşıyıcı seçimi zorunlu kural olsun.** Savunma ribaundu / topu oyuna sokma sonrası top **her zaman** önce PG'ye, PG sahada değilse SG'ye, o da yoksa SF'ye gider. C/PF ribaundu aldıysa **1,2 saniye içinde outlet pas** atar ve topu bırakır.
   - İstisna: `fb` (fast break) — uzun oyuncu tek sürükleme yapabilir ama orta sahayı geçmeden pas verir.
   - İstisna: hücum ribaundu → anında putback (yarı saha geçişi yok).
2. **Yarı saha geçişi sahnede görünsün.** Şu an top çoğu pozisyonda hiç orta çizgiyi geçmiyor (canlı ölçümde 81 saniyede **1 geçiş**). Her yeni hücumda:
   - taşıyıcı topu **sürerek** orta çizgiyi geçer (`held` modunda, `pass` değil),
   - diğer 4 oyuncu kulvarlarını doldururken savunma potaya çekilir,
   - top orta çizgiyi geçince set oyunu kurulur.
3. **Kabul:** 10 dakikalık canlı ölçümde topun orta çizgiyi geçme sayısı, pozisyon değişim sayısının **≥ %85'i**; yarı sahayı geçiren oyuncuların **≥ %90'ı** PG/SG/SF.

---

## 8. İŞ 6 — SERBEST ATIŞ: OYUNCULAR YERLEŞMEDEN ATILIYOR

**Ölçüm:** yakalanan serbest atış karesinde yerinde olan oyuncu sayısı **0/10**.

**Kök neden:** `_ftWaitSec` (match-engine.js:1435) bekleme süresini `Math.max(1.6, Math.min(6.0, enGeç+0.45))` ile **6 saniyede kırpıyor**. Faul sahanın öbür ucunda olduğunda 10 oyuncunun kulvarlara dizilmesi 7-9 saniye sürüyor; şut erken patlıyor. Ayrıca `_setFtFormation` (:1411) herkesi `_URG.JOG` ile yolluyor.

**Yapılacak:**
1. `_ftWaitSec` üst sınırını **6.0 → 9.5** çıkar; alt sınır 1,6 kalsın (yakın faul).
2. `_setFtFormation`: şutör dışındaki oyuncular çizgiye **`_URG.KOS`** ile gitsin (gerçekte de koşarak dizilirler), şutör `JOG` kalsın.
3. **Kapı ekle:** ilk serbest atış, `_ftWaitSec` süresi dolsa bile **10 oyuncudan en az 9'u hedefine 20 px yaklaşmadan** ateşlenmesin (kare başına kontrol, en fazla +2,5 sn ek bekleme).
4. Faul olayı geldiği anda (`type==='foul'`) dizilişi **hemen** başlat — serbest atış olayını beklemeden; böylece koşu süresi düdükle birlikte başlar.
5. **Kabul:** 30 serbest atışlık örnekte, atış anında yerinde olan oyuncu ortalaması **≥ 9,0/10**; hiçbir atışta < 8.

---

## 9. İŞ 7 — TOP BOŞLUKTA KALIYOR (kritik hata)

### 9.1 `_ballHold` sessiz no-op — kalıcı donma

`_ballHold` (match-engine.js:875) ilk satırı:
```js
function _ballHold(p,noDrib){ const b=_ball(); if(!p) return;   // ← mod değişmiyor
```
`_ballStep` `case 'pass'` bitişinde `_ballHold(b.target)` çağrılıyor. Hedef geçersizse (oyuncu değişikliğiyle jeton düştü, `offP/defP` yenilendi, hedef `null`) top **`pass` modunda, sıfır hızla, sahipsiz** sonsuza kadar kalıyor.

**Yapılacak:**
```js
function _ballHold(p,noDrib){
  const b=_ball();
  if(!p||!isFinite(p.x)||!isFinite(p.y)){ _ballKurtar(); return; }   // güvenlik ağı
  ...
}
```
Yeni `_ballKurtar()`: topu `loose` moduna alır, hız 0 verir, sahadaki **en yakın oyuncuyu** `_chase` ile topa gönderir (en fazla 1,5 sn). Böylece top hiçbir koşulda kilitlenmez.

### 9.2 Watchdog — sahipsiz top sayacı

`_simStep` (match-engine.js:447) içine ekle:
```js
// Topa en yakın oyuncu 2 m'den uzaksa ve top uçmuyorsa: sahipsiz say.
// 1,2 sn üst üste sahipsizse en yakın oyuncuyu topa gönder (_chase) ve modu 'loose' yap.
```
Bu, kök neden ne olursa olsun "top boşlukta duruyor" görüntüsünü **yapısal olarak** imkânsız kılar.

### 9.3 Sekme arka plandayken senkron kopması

`document.hidden===true` iken rAF durur, `matchStep` (`setTimeout`) devam eder → anlatım sahneyi geçer, top yerinde donar.

**Yapılacak:**
- `visibilitychange` dinleyicisi ekle (main.js, `startMatch` içinde kurulup maç bitince kaldırılacak):
  - `hidden` olunca: `clearMatchEventTimer()` + `mState._bgPause=true` (skor/olay ilerlemesi dursun; kullanıcı zaten izlemiyor).
  - Görünür olunca: `mState._sim.last` zaman damgasını **şimdiye** eşitle (dev `dt` sıçraması olmasın), oyuncu/top konumlarını mevcut olayın hedeflerine **anında oturt** (`_setFormation` + `_ballHold(taşıyıcı)`), sonra oynatmayı sürdür.
- **Kabul:** Sekme 30 sn arka plana alınıp dönüldüğünde skor ile sahnedeki durum tutarlı; top sahipli; konsol hatasız.

### 9.4 Sayı sonrası ölü zaman

Ölçümde, sayı sonrası topun **girdiği potanın altında** kalıp, 10 oyuncunun karşı yarı sahaya geçtiği kareler görüldü (ekli görsel). `_setupInbound` (:1505) sokucuyu `_chase(inb, …, 2.2)` ile topa yolluyor ama `_startBreak` formasyonu **hemen** çeviriyor.

**Yapılacak:** Sayı sonrası sıralamayı bağla: (1) top file altında, (2) en yakın oyuncu topu alır ve dip çizginin dışına çıkar, (3) **ancak o zaman** karşı takım geçişe açılır. `_startBreak` çağrısı, sokucunun topu eline aldığı ana (callback) ertelensin. Ölü zaman ~0,8 sn ile sınırlı kalsın.

---

## 10. İŞ 8 — POZİSYON-ŞUT UYUMU REGRESYON KİLİDİ

Pivotun üçlüğü **şu an doğru** (%0,8). Bozulmasın diye kilit koy:

- `runPossession` içindeki C→dış oyuncu devretme oranını (C %85, PF %55) **koru**; C için %85 → **%92** yap (kalan %8 gerçek "stretch five" için `_eg(p,'uc')` yüksekse serbest kalsın).
- Testte sabit eşik: **C üçlük payı ≤ %2**, PF ≤ %14, PG+SG+SF üçlüklerin ≥ %85'ini atsın.
- Aynı kilit **asist** için de: PG+SG asistlerin ≥ %45'ini yapsın; C asist payı ≤ %15.

---

## 11. UYGULAMA SIRASI

| Sıra | İş | Etki | Risk |
|---|---|---|---|
| 1 | İŞ 7 — top boşlukta / watchdog / visibility | **En yüksek** | Düşük |
| 2 | İŞ 1 — anlatım kronolojisi | Yüksek | Düşük |
| 3 | İŞ 2 — spiker dili (yasak liste + sözlük + ad kuralı) | Yüksek | Düşük |
| 4 | İŞ 6 — serbest atış yerleşimi | Orta-yüksek | Düşük |
| 5 | İŞ 3 — fast break | Yüksek | Orta |
| 6 | İŞ 5 — top taşıma / yarı saha | Orta-yüksek | Orta |
| 7 | İŞ 4 — şut coğrafyası/tipi | Orta | Orta |
| 8 | İŞ 8 — regresyon kilidi | Düşük | Düşük |

Her işi **ayrı, küçük adımda** yap; her adımdan sonra test bloğunu koştur.

---

## 12. TEST VE KABUL (her fazın sonunda ZORUNLU)

1. **Syntax:** `node --check js/match-engine.js && node --check js/main.js` (dokunduğun her modül).
2. **Sonuç değişmezliği:** Değişiklikten önce sabit tohumla bir maç üret, skor/kazanan/kutu skoru kaydet; her fazdan sonra tekrar üret — **birebir aynı** olmalı. Değiştiyse sonuç matematiğine dokunmuşsundur, geri al.
3. **İstatistik harness'i (15+ maç, ≥1.500 şut):** Bölge, şut tipi, şema, fast break, pozisyon-üçlük dağılımlarını §6/§7/§10'daki hedef bantlarla karşılaştır. Bantların dışındaysa düzelt.
4. **Anlatım denetimi:** Bir maçın tüm `preText`+`text` satırlarını dök; şunları otomatik tara:
   - yasak kalıp sayısı = **0**
   - bölge-dil uyuşmazlığı = **0**
   - kalıp tekrarı ≤ **%12**
   - her şut olayında `preText` şutör adını içeriyor = **%100**
   - üç cümleden uzun satır = **0**
5. **Canlı sahne ölçümü (DOM-stub veya gerçek tarayıcı):**
   - `pass` modu ≤ **%18**, `held` ≥ **%65**
   - sahipsiz top karesi (>2 m) ≤ **%2**
   - aynı anda koşan oyuncu ortalaması **3 – 5** / 10
   - şut anında yerinde oyuncu ≥ **8,5** / 10
   - serbest atışta yerinde oyuncu ≥ **9,0** / 10
6. **Kendi kendini test et**, kullanıcıdan manuel kontrol isteme. Yalnız senin bilemeyeceğin bir şey varsa sor.

---

## 13. TESLİM

- Her fazdan sonra `PROGRESS.md`'ye **ekleyerek** (silmeden) ne yaptığını, neden yaptığını ve ölçüm sonucunu yaz.
- `RAPOR-EKSIKLER.md`'de karşılığı olan maddeleri güncelle.
- **Commit/push yok.** Bitince değişiklik özetini ve ölçüm tablosunu (önce/sonra) sun.
