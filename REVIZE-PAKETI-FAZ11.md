# REVİZE PAKETİ — FAZ 11: CANLI MAÇ SAHA DİZİLİMİ
**Tarih:** 2026-08-30 · **Ölçülen:** canlı yayın (`basketlig.vercel.app`), gerçek maç, tarayıcıda
**Yöntem:** Jeton konumlarının kare kare örneklenmesi + 20 sn aralıklarla üç ekran görüntüsü + gerçek basketbol referanslarıyla karşılaştırma

> Kullanıcının şikâyeti: *"savunma düzgün yerleşmiyor, oyuncular sahaya düzgün yayılmıyor,
> gerçek basketbolda görmediğimiz hareketler yapılıyor."*
> **Şikâyet doğrulandı ve tahmin edilenden ciddi.**

---

## 1. ÖLÇÜM — RAKAMLAR

Canlı maçta (1. periyot, skor 4-5 → 12-15) jeton konumları örneklendi.

| Metrik | **Ölçülen** | Gerçek basketbol | Durum |
|---|---|---|---|
| Hücum oyuncuları arası ortalama mesafe | **2,64 m** | **≥ 4,57 m** (15 feet kuralı) | **%42 altında** |
| Hücumun kapladığı alan / yarı saha | **%6,5** | %35–50 | **5 kat dar** |
| Savunmacının adamına ortalama uzaklığı | **5,03 m** (p90: 7,19 m) | 1–3 m | **markaj yok** |
| **Boyada oyuncu sayısı (ortalama)** | **0,00** | 1–2 | **hiç yok** |
| Boyanın tamamen boş olduğu kare oranı | **%100** | — | — |
| Tüm oyuncuların x ortalaması | **454** (saha 940 = tam orta) | ~200 veya ~740 | **potaya gidilmiyor** |
| **Oyuncu konumlarının saha ortasındaki oranı** | **%80,8** | set hücumda ~%0 | — |
| Saldırılan üçte birdeki oran | %9,6 | ~%90 | — |

**Sözle:** On oyuncunun tamamı, maç boyunca orta sahada iki simetrik sütun hâlinde duruyor.
İki potanın da altı boş. Hiç kimse boyaya girmiyor. Savunmacılar adamlarından ortalama **5 metre**
uzakta. Sayı oluyor, skor işliyor — ama **saha görüntüsü hiçbir zaman yarı saha hücumuna geçmiyor.**

*Örnekleme notu: sekme arka planda olduğu için `requestAnimationFrame` kısıtlandı ve yalnız 25 kare
yakalanabildi. Ancak 20 saniye arayla alınan üç bağımsız ekran görüntüsü aynı tabloyu gösteriyor —
bulgu tek bir ana ait değil.*

---

## 2. TEŞHİS — KOD DOĞRU, UYGULANMIYOR

Kritik nokta: **doğru dizilimler kodda zaten var.**

```js
// js/match-engine.js:628 — sol potaya hücum eden takım için
const SET_SPREAD=[[336,250],[248,114],[248,386],[ 92,436],[126,304]];  // 4-out 1-in
const SET_HORNS =[[348,250],[ 92, 66],[ 92,434],[212,190],[212,310]];
```

`SET_SPREAD` oyuncuları **x = 92–336** aralığına, yani sol potanın çevresine koyuyor. Doğru dizilim bu.

Ama ölçülen konumlar **x ≈ 281–640, ortalama 454.** Yani set dizilimi **hiç uygulanmıyor.**

Geçiş dizilimine bakalım:
```js
const TRANS_OFF=[[404,250],[300, 58],[300,442],[440,116],[452,384]];   // x 300–452
const TRANS_DEF=[[188,250],[140,178],[140,322],[252,200],[252,300]];
```

`TRANS_OFF` tam da ölçülen bandın içinde. **Oyuncular geçiş (transition) dizilimine takılıp
kalıyor, `phase:'set'` aşamasına hiç geçmiyor.**

### Nerede aranmalı

`_setFormation(offLeft, offPlayers, defPlayers, shot, {phase})` — `phase==='trans'` dalı çalışıp
`return` ediyor, `set` dalı hiç çalışmıyor. Kontrol edilecek zincir:

1. **`movePlayersForEvent`** — her olayda `phase` nasıl seçiliyor? Sürekli `'trans'` mi geçiliyor?
2. **`tOff` / `bringT` / `tSet`** — `match-engine.js:1302-1310` civarı. `tSet = tOff + bringT` ile
   set fazına geçiş zamanlanıyor; bu zamanlayıcı hiç dolmuyor olabilir.
3. **`_simStep` içindeki faz makinesi** — geçişten sete terfi eden koşul.
4. FAZ 1'de `ev.dt` tabanlı zamanlama değişti; set fazına geçiş eski zamanlamaya bağlı kalmış olabilir
   (**regresyon şüphesi** — bu davranış FAZ 1 öncesinde farklı olabilir, `git log -S "tSet"` ile bak).

**Bu tek maddenin düzeltilmesi ölçümlerin çoğunu birden düzeltir.** Önce bunu çöz, sonra tekrar ölç.

---

## 3. MADDELER

### F11-1. Set dizilimi hiç uygulanmıyor — oyuncular geçiş dizilimine takılı
**KRİTİK · KÖK NEDEN** · Yukarıdaki teşhis.

**Kabul kriteri:** Set hücumunda hücum oyuncularının x ortalaması saldırılan potanın yarısında
(sol potaya hücumda x < 340, sağ potaya hücumda x > 600); orta üçte bir bandındaki oyuncu oranı **< %20**.

---

### F11-2. Hücum aralığı 2,64 m — 15 feet kuralının çok altında
**KRİTİK**

Basketbolun temel kuralı: **ball-side oyuncular arasında en az 15 feet (4,57 m).**
Sebebi: bir savunmacı iki hücumcuyu aynı anda tutamasın. ([kaynak](https://coachprincetonbasketball.com/spacing-in-basketball-offense/))

Ölçülen 2,64 m'de tek savunmacı iki adamı birden kapatabilir — görüntü de bunu veriyor.

**Düzeltme — kopyalanabilir dizilimler.** Saha `viewBox 0 0 940 500`, sol pota `[102.6, 250]`,
3 sayı yayı yarıçapı `196`. Sol potaya hücum eden takım için (index = rol: 0 PG…4 C):

```js
/* 5-OUT — herkes yay dışında, boya boş (modern dizilim) */
const SET_5OUT = [
  [315,250],   /* 0 PG — yay tepesi */
  [248,110],   /* 1 SG — sol kanat  */
  [248,390],   /* 2 SF — sağ kanat  */
  [112, 45],   /* 3 PF — sol köşe   */
  [112,455],   /* 4 C  — sağ köşe   */
];
/* 4-OUT 1-IN — dört dışarıda, bir büyük düşük postta */
const SET_4OUT1IN = [
  [315,250],   /* 0 PG — yay tepesi */
  [248,110],   /* 1 SG — sol kanat  */
  [248,390],   /* 2 SF — sağ kanat  */
  [112, 45],   /* 3 PF — sol köşe   */
  [150,195],   /* 4 C  — düşük post (boyada) */
];
```

Bu koordinatlarda en yakın ikili mesafe **155 px = 4,6 m** — kural sağlanıyor.
Mevcut `SET_SPREAD` de fena değil ama en yakın ikili **~88 px = 2,6 m** — yetersiz; onu da genişlet.

**Kabul kriteri:** Set hücumunda ortalama ikili mesafe **≥ 4,5 m**, en yakın ikili **≥ 3,5 m**.

---

### F11-3. Boyada hiç kimse yok — "1-in" sahada görünmüyor
**YÜKSEK** · Ölçüm: boyada oyuncu ortalaması **0,00**, boş kare oranı **%100**

`SET_POST` ve `SET_SPREAD` kodda pivotu içeri koyuyor ama sahada karşılığı yok (F11-1'in sonucu).
Boyada kimse olmayınca ribaund, blok, pota altı şut görsel olarak anlamsızlaşıyor.

**Düzeltme:** F11-1 çözülünce `SET_4OUT1IN` ve `SET_POST` kullanıldığında pivot boyaya girmeli.
Ayrıca hücum ribaundunda 2 oyuncu boyaya yaklaşmalı (şu an kimse gitmiyor).

**Kabul kriteri:** Set hücumu karelerinin **≥ %60**'ında boyada en az 1 hücum oyuncusu var.

---

### F11-4. Savunmacılar adamlarından ortalama 5 metre uzakta
**KRİTİK** · Ölçüm: ortalama 5,03 m, p90 **7,19 m**

Kod doğru mantığı içeriyor (`_mark`, `_defGap`, adam ile pota arasına yerleşme) ama uygulanmıyor.
7 metre uzaktaki savunmacı basketbolda savunma değildir.

**Gerçek basketbol referansı:**

| Durum | Savunmacının adamına mesafesi | Nerede durur |
|---|---|---|
| Topu tutan adam | **1,0–1,5 m** (34–50 px) | Adam ile pota arasında |
| Bir pas ötesi | 2,0–3,0 m (67–100 px) | Pas çizgisini kesecek şekilde |
| Yardım tarafı (help side) | 3,0–4,5 m | **Boyaya kayar**, adamını bırakır |

**Düzeltme:** `_defGap()` çıktısını yukarıdaki bantlara sabitle. Yardım tarafı savunmacıları
adamlarını takip etmek yerine boyaya kaysın — gerçek basketbolda da öyle olur ve görüntüyü
belirgin şekilde gerçekçi yapar.

**Kabul kriteri:** Topu tutan oyuncuya en yakın savunmacı **< 1,8 m**; hücum oyuncularının
savunmacıya ortalama uzaklığı **< 3 m**; hiçbir savunmacı adamından **> 5 m** uzakta değil.

---

### F11-5. İki takım simetrik iki sütun — basketbolda görülmeyen dizilim
**YÜKSEK** · Üç ekran görüntüsünde de aynı: yeşil takım orta sahanın solunda dikey sütun,
turuncu takım sağında dikey sütun, aralarında ~100 px.

Bu ne hücum ne savunma dizilimi — iki takımın **birbirini aynalaması** basketbolda hiç görülmez.
Kullanıcının *"gerçek basketbolda görmediğimiz hareketler"* dediği şey büyük olasılıkla bu.

**Düzeltme:** F11-1 ve F11-4 çözülünce kendiliğinden düzelmeli. Doğrulama için: savunma dizilimi
hücum dizilimine **göre** kurulmalı (her savunmacı adamı ile pota arasında), bağımsız bir şablona
göre değil. Aynalama, iki tarafın da kendi sabit şablonuna oturmasından geliyor olabilir.

**Kabul kriteri:** Hücum ve savunma jetonlarının x dağılımları örtüşmüyor; savunma her zaman
hücum ile pota arasında.

---

### F11-6. `startMatch()` sessizce başarısız oluyor — oyun kilitleniyor
**KRİTİK · AYRI HATA** · Canlı kayıtta bizzat karşılaşıldı

Kullanıcının kaydında şu durum bulundu:
- Buton: `⏳ Maç Devam Ediyor`
- Tabela: `BEKLEMEDE`, `mState` boş (maç çalışmıyor)
- `G.pendingMatch.sig === 'lig|109'` — sıradaki maç için kilitli sonuç duruyor
- `startMatch()` çağrıldığında **hata yok, bildirim yok, hiçbir şey olmuyor**

Yani oyun **kalıcı olarak sıkışmış** durumda. Kilit elle temizlenince (`G.pendingMatch=null`) maç
normal başladı.

**Senaryo:** Oyuncu maçı başlatır → sekmeyi kapatır → geri döner → bir daha maç oynayamaz.
Çok oyunculuda bu daha da kritik: maç saati geldiğinde otomatik oynanamayan takım oluşur.

**Düzeltme:** Açılışta `pendingMatch` varsa ama `mState` boşsa, buton `▶ Maçı sonuçlandır` durumuna
geçsin ve tıklanınca kilitli sonucu uygulasın. `startMatch()` hiçbir dalda **sessizce** dönmesin —
her erken çıkış bir `showNotif` bassın.

**Kabul kriteri:** Maç başlatıp sayfayı yenileyince oyun kilitlenmiyor; `startMatch()` her zaman
ya maçı başlatıyor ya da sebebini söylüyor.

---

### F11-7. Mevcut ölçüm araçları bunu yakalamadı
**YÜKSEK** · `tools/realism-check.js` "saha-dışı / ışınlanma / üst üste binme / sahipsiz top"
ölçüyor — ama **dizilim doğruluğunu** ölçmüyor. `live-metrics.js` senkron ve kimlik ölçüyor,
konum dağılımını ölçmüyor.

Bu yüzden 10 oyuncunun maç boyunca orta sahada durması hiçbir testte görünmedi.

**Düzeltme — yeni araç `tools/spacing-check.js`:** Maçı izlerken her karede 10 jeton + top konumunu
alsın, şunları raporlasın:

| Metrik | Hedef |
|---|---|
| Set hücumunda ortalama ikili mesafe | ≥ 4,5 m |
| Set hücumunda en yakın ikili mesafe | ≥ 3,5 m |
| Hücumun kapladığı alan / yarı saha | ≥ %30 |
| Orta üçte bir bandındaki oyuncu oranı (set fazında) | < %20 |
| Boyada en az 1 hücumcu olan kare oranı | ≥ %60 |
| Topu tutana en yakın savunmacı | < 1,8 m |
| Adamından > 5 m uzaktaki savunmacı oranı | %0 |

Ölçüm sondasının çalışan hâli bu belgede tarif edildi: `#playersLayer` çocuklarının
`transform="translate(x,y)"` değerleri + `#liveBall`. Kare kısıtlaması için sekme odaklı olmalı ya da
Playwright'ta `--disable-background-timer-throttling` kullanılmalı.

---

## 4. UYGULAMA SIRASI

| Sıra | Madde | Not |
|---|---|---|
| **1** | **F11-7** — `spacing-check.js` yaz | Önce ölçebilmek lazım, yoksa düzeldiğini göremeyiz |
| **2** | **F11-1** — set dizilimine geçişi onar | Kök neden; çoğu metriği tek başına düzeltir |
| 3 | F11-6 — `startMatch` sessiz kilitlenmesi | Bağımsız kritik hata, kısa iş |
| 4 | F11-2 — dizilim koordinatlarını genişlet | F11-1'den sonra ölç, gerekiyorsa uygula |
| 5 | F11-4 — savunma mesafe bantları | Görüntüyü en çok gerçekçileştiren ikinci madde |
| 6 | F11-3 — boyada oyuncu | F11-1 + F11-2 sonrası kendiliğinden gelebilir |
| 7 | F11-5 — aynalama | Son doğrulama; muhtemelen kendiliğinden düzelir |

**Her adımdan sonra `spacing-check.js` çalıştır** ve rakamları bu belgedeki "Ölçülen" sütunuyla
karşılaştır. Ayrıca `live-metrics.js` ve `box-band.js` regresyon için tekrar geçmeli —
**sonuç matematiği değişmemeli, yalnız sunum düzelmeli.**

---

## 5. REFERANS — GERÇEK BASKETBOL KURALLARI

Düzeltmeleri yaparken dayanılacak ilkeler:

**Hücum**
- **15 feet (4,57 m) kuralı:** ball-side oyuncular arası minimum mesafe
- **5-out:** beş oyuncu da yay dışında, boya tamamen boş — modern dizilim
- **4-out 1-in:** dört dışarıda, bir büyük düşük postta
- Pas veren yerinde durmaz — kesme yapar ya da yer değiştirir
- Top içeri girince kanatlar **köşeye açılır**, içeri doğru kaymaz

**Savunma (adam adama)**
- Her savunmacı **adamı ile pota arasında** durur (ball-you-man)
- Topu tutan adama 1–1,5 m; bir pas ötesine 2–3 m
- **Yardım tarafı boyaya kayar** — adamını bırakıp potayı korur
- Top hareket edince savunma **topla birlikte kayar** (rotasyon)

Kaynaklar:
[15-feet kuralı ve yaygın hatalar](https://coachprincetonbasketball.com/spacing-in-basketball-offense/) ·
[5-out dizilimi rehberi](https://www.breakthroughbasketball.com/offense/five-out-basketball-offense) ·
[Aralık (spacing) tam rehberi](https://thebenchviewbasketball.com/en/guides/basketball-spacing-complete-guide/)
