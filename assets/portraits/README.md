# Oyuncu portre havuzu (FAZ 17)

Bu klasördeki JPEG'ler oyunda oyuncu ve koç portresi olarak kullanılır.

## Adlandırma

    <kova>_<yasBandi>_<sira>.jpg        örn. akd_genc_0001.jpg

| Kova    | Kapsam                        | Hedef pay (3.000 üzerinden) |
|---------|-------------------------------|------------------------------|
| `akd`   | Türk / Akdeniz / Balkan       | %58 — 1.740 |
| `siyah` | Kuzey Amerika siyah           | %14 — 420 |
| `kuz`   | Kuzey / Doğu Avrupa           | %8 — 240 |
| `beyaz` | Kuzey Amerika beyaz           | %7 — 210 |
| `afr`   | Batı Afrika                   | %6 — 180 |
| `lat`   | Latin Amerika                 | %4 — 120 |
| `asya`  | Doğu / Güneydoğu Asya         | %3 — 90 |

`akd` payının bu kadar yüksek olmasının sebebi: lig %100 Türk kurulur (FAZ 17 çekirdek
kuralı) ve yabancılar oyuna yavaş girer.

Yaş bandı: `genc` (18-25) · `kidemli` (26-36). Dağılım ~%45 genç / %55 kıdemli.

## Sayılar `manifest.json`'da

`manifest.json` (sürüm 2) kova × bant başına gerçek dosya sayısını tutar. **Elle
düzenlenmez** — üretim betiği günceller. Oyun tarafında sabit bir havuz boyu yoktur;
`js/portraits.js` bu dosyayı okur.

**Yeni parti eklerken yeniden numaralama YAPILMAZ.** Sayaç artar, mevcut dosya adları
sabit kalır. Oyuncunun portresi `portreDosya` alanında saklandığı için, numaralar kaysa
kayıtlı kariyerlerdeki bütün yüzler değişirdi.

## Üretim

    node tools/generate-portraits.js <kova> <adet>     # bu makinede çalışan yol
    python3 tools/generate-portraits.py <kova> <adet>  # Python kurulu makinelerde

Boru hattı: üret → fon parlaklığını eşitle (hedef ~120, std ≤8) → 256×320'den 256×250'ye
dar kırp → bozuk/bulanık/benzer olanı ele. Elenen dosyanın numarası atlanmaz, sıradaki
üretim o numarayı doldurur.

## Kaynak ve lisans — DİKKAT

Görseller **pollinations.ai** üzerinden üretilmektedir. Bu servisin **ticari kullanım
lisansı belirsizdir**: Terms sayfası JavaScript gerektirdiği için okunamadı ve kendi
GitHub deposunda lisans sorusu cevapsız duruyor.

Kullanıcı bunu **bilerek** kabul etti: önce web sürümü yayınlanacak, Steam sürümü
öncesinde gerekirse görseller başka bir kaynakla değiştirilecek. Bu yüzden üretim adımı
boru hattının geri kalanından ayrı bir fonksiyonda durur (`uret_*`), kaynak değişince
yalnız o fonksiyon değiştirilir; eşitleme/kırpma/eleme aynı kalır.
