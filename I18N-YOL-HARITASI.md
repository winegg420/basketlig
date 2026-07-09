# I18N YOL HARİTASI — Charazay 2.0 çoklu dil desteği

> Durum: **planlama** (henüz uygulanmadı). Steam'e uluslararası çıkış kararlaştırıldığında
> ayrı bir tur olarak ele alınacak. Bu belge kapsamı, envanteri ve önerilen yaklaşımı sabitler.

## Neden ayrı tur?

Tüm arayüz metinleri ve **usul üreten** metinler (maç anlatımı, haber satırları, başkan
mesajları) doğrudan koda gömülü Türkçe şablon dizeleridir. Toplam hacim küçük bir "etiket
çevirisi" işi değil; anlatım cümleleri parametrik ve dilbilgisine duyarlıdır (ör. "X'in
pasında", iyelik ekleri). Yarım yapılmış i18n, oyunun en güçlü yanı olan Türkçe anlatımı bozar.

## Envanter (Türkçe karakter içeren satır sayısı — 2026-07-09 ölçümü)

| Dosya | TR satır | Baskın içerik türü |
|---|---|---|
| `js/match-engine.js` | 272 | **Maç anlatımı şablonları** (spiker satırları, olay metinleri) — en zor kısım |
| `js/render.js` | 185 | Sayfa/kart/modal arayüz etiketleri |
| `charazay2.0.html` | 165 | Statik arayüz (menü, panel başlıkları, öğretici) |
| `js/main.js` | 161 | Bildirimler, koçluk paneli, aksiyon mesajları |
| `js/match-prep.js` | 146 | Sezon/playoff/draft/ödül/başkan metinleri |
| `js/league.js` | 116 | Lig modalları, haber satırları, takım detay |
| `js/roster-gen.js` | 79 | Sabit listeler (pozisyon adları, sakatlık adları, koç tipleri) |
| `js/persistence.js` | 78 | Ayarlar, kayıt yönetimi, başarımlar |
| `js/economy.js` | 56 | İşlem açıklamaları, iflas haberleri |
| `js/state.js` + `js/portraits.js` | 25 | Az sayıda etiket |
| **Toplam** | **~1.284 satır** | (bir satırda birden çok dize olabilir; gerçek dize sayısı tahmini 1.600-2.000) |

## Önerilen yaklaşım

1. **`js/i18n.js` modülü** (yükleme sırasında `state.js`'ten hemen sonra):
   - `const L = I18N[G.settings.lang || 'tr']` sözlük nesnesi; `t(key, params)` yardımcı
     fonksiyonu (`t('match.steal', {p:'Smith'})` → "Smith topu çaldı!").
   - Dil dosyaları: `TR` (kaynak, birebir mevcut metinler), `EN` (ilk hedef çeviri).
2. **Aşamalı taşıma** (tek seferde değil — her aşama sonunda oyun tam çalışır):
   - Aşama A: statik HTML etiketleri (`data-i18n` attribute + boot'ta değiştirme).
   - Aşama B: arayüz JS dizeleri (render/persistence/main) → `t()` çağrıları.
   - Aşama C: **anlatım motoru** — spiker şablonları zaten `%X` yer tutucu mantığı kullanıyor
     (`spikerLine`, `MOVE_LINES`, `REB_*_LINES`); şablon tablolarını dil sözlüğüne taşı.
     Dilbilgisi ekleri için şablonları ek gerektirmeyecek biçimde yeniden yaz
     (ör. "pas: X → Y bitirdi" yapısı) ya da dil-başına şablon varyantı tut.
   - Aşama D: dinamik üretilen adlar (arena adları, koç tipleri, sakatlık adları,
     kişilik adları) — `roster-gen.js` sabit listelerini sözlüğe bağla.
3. **Ayarlar entegrasyonu:** `G.settings.lang` (`'tr'`/`'en'`), ayarlar modalında seçici;
   değişiklik sonrası tam sayfa yeniden render (SPA olduğundan `showPage` + açık modal kapatma yeter).
4. **Test:** `tools/visual-check.js`'e `lang=en` ikinci tur; ayrıca "sözlükte eksik anahtar"
   konsol uyarısı sayacı (0 şartı).

## Tahmini efor

- Aşama A+B: 1-2 oturum. Aşama C (anlatım): 2-3 oturum + anadili İngilizce metin redaksiyonu.
- Riskler: anlatım doğallığı; sayı/tarih biçimleri (`fmtn`, `toLocaleDateString('tr-TR')` çağrıları).

## Erişilebilirlik (bu turda yapılan ilk adım)

Ayarlar ekranına iki düşük riskli CSS toggle'ı eklendi (bkz. `PROGRESS.md` ilgili oturum):
- **Büyük yazı** (`.a11y-big`): kök yazı ölçeğini büyütür.
- **Yüksek kontrast** (`.a11y-contrast`): metin/arka plan kontrastını artırır.
Kalanlar (renk körü dostu palet, tam klavye gezinmesi, ekran okuyucu etiketleri) i18n turu
ile birlikte ele alınmalı.
