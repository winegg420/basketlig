# DEVAM-ET — Claude Code çalışma protokolü

Bu dosya, Charazay 2.0 revizyonunda Claude Code oturumlarının nasıl çalışacağını tanımlar.
**Yeni oturuma başlarken önce bunu, sonra `KALDIGIM-YER.md` ve `PROGRESS.md`'yi oku.**

---

## 1. ÇALIŞMA ŞEKLİ (hız modu)

Kullanıcı hız istiyor. Doğrulama ayrı bir kanalda (canlı ölçüm) yapılıyor, senin işin uygulamak.

**YAPMA:**
- Plan belgesi yazma, beyin fırtınası yapma, tasarım dokümanı üretme
- Alt-ajan / paralel ajan açma
- Uygulamadan önce onay isteme (kullanıcı zaten onayladı)
- Aynı işi birden çok kez doğrulamaya çalışma

**YAP:**
- Doğrudan uygula
- Her maddeden sonra sadece `node --check <değişen dosya>` çalıştır
- Her maddeden sonra **commit et** (küçük, sık commit)
- Bir madde bitince sıradakine geç, durma

**Ağır testler (`visual-check.js`, `realism-check.js`, `measure.js`, `band.js`) yalnızca bir FAZ tamamen bitince bir kez çalıştırılır** — her madde sonrası değil.

---

## 2. İŞ SIRASI

`REVIZE-PAKETI.md` içindeki fazları sırayla uygula:

| Sıra | Faz | İçerik |
|---|---|---|
| 1 | FAZ 5 | Ölçüm araçları (regresyonu görebilmek için önce bu) |
| 2 | FAZ 1 | Zaman senkronu — M1, M2, M10, M11, M16, M13 |
| 3 | FAZ 2 | Kimlik tutarlılığı — M7, M8, M9, M3, M4, M12 |
| 4 | FAZ 3 | Top fiziği — M6, M5, M14 |
| 5 | FAZ 4 | Denge — M17, M18, M19, M20 |
| 6 | FAZ 6 | Kalan eksikler + Steam hazırlığı |

---

## 3. KAYIT DİSİPLİNİ (zorunlu)

Uzun oturumlarda iş kaybı olmasın diye:

- **Her 30 dakikada bir** ya da **her faz bitiminde** — hangisi önce gelirse:
  1. `PROGRESS.md`'ye ekleyerek yaz (ne yaptın, neden, ölçüm sonucu)
  2. `KALDIGIM-YER.md`'yi güncelle (aşağıdaki şablon)
  3. `git add -A && git commit && git push`

Bu üçü bir arada yapılır. Atlanmaz.

---

## 4. `KALDIGIM-YER.md` ŞABLONU

Durdurulduğunda ya da düzenli kayıt anında bu dosyayı **üzerine yazarak** güncelle:

```markdown
# KALDIĞIM YER
Son güncelleme: <tarih saat>

## Biten maddeler
- M1 — ev.dt damgası eklendi (match-engine.js:2292, main.js:276) ✔ commit abc1234
- ...

## Yarım kalan
Madde: <kod>
Dosya: <yol>
Satır: <yaklaşık>
Ne yapıyordum: <tek cümle>
Ne kaldı: <tek cümle>

## Sıradaki adım
<tek cümle>

## Dikkat / takıldığım yer
<varsa>
```

---

## 5. DURDURULDUĞUNDA

Kullanıcı `Esc` ile bölerse veya "dur" derse:

1. Yeni iş başlatma
2. `PROGRESS.md` + `KALDIGIM-YER.md` güncelle
3. Commit + push
4. Tek cümleyle durumu söyle
5. Bekle

---

## 6. PROJE KURALLARI (değişmedi)

- Türkçe yanıt ver
- Minimal değişiklik — dosya silme/yeniden yazma yerine düzenle
- Modül disiplini: yeni mantık temaya ait `js/*.js` dosyasına; `<script src>` sırası bozulmaz
- Yeni kullanıcı metni → Türkçesini yaz, karşılığını `js/i18n-dict.js`'e ekle
- Ekonomi değerleri `ecoRound()` üzerinden; ham KR sabiti yazma
- Kullanıcı girdisi `sanitizeTeamName`'den geçer

---

## 7. DIŞ DOĞRULAMA

Kapsamlı doğrulamayı kullanıcı ayrı bir kanaldan yaptırıyor (canlı sitede ölçüm).
Sen push ettikten sonra Vercel otomatik yayınlıyor; ölçüm oradan yapılıyor.

Bu yüzden: **push etmek, doğrulamanın parçasıdır.** Biriktirme, sık push et.
