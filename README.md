# Charazay 2.0

Tek dosya basketbol menajerlik demosu (`charazay2.0.html`).

## 404 alıyorum — neden?

`/github.io/...` adresi **404** ise %99 sebep: **GitHub Pages henüz etkin değil**. Repo var diye site otomatik açılmaz; aşağıdaki “Pages nasıl açılır” adımlarını **mutlaka** yap.

Kendi bilgisayarında **hemen oynamak** için tarayıcıda aç: `charazay2.0.html` dosyasına çift tıkla veya `Charazay-2.0-Chrome.bat` çalıştır; internet linki şart değil.

---

## İnsanlar oyuna hangi linkten girer?

Önce GitHub’da **Pages** açılmalı (bir kez). Sonra paylaşacağın **asıl site adresi**:

### Ana adres (kısa)
**https://winegg420.github.io/basketlig/**

> ✅ **YAYINDA** — GitHub Pages 29.08.2026 tarihinde açıldı (kaynak: `master` / kök). Depo public; her `git push` sonrası site 1-2 dakika içinde kendini günceller. Aşağıdaki kurulum adımları yalnızca sıfırdan kuranlar içindir.

*(GitHub kullanıcı adın veya repo adın farklıysa: `https://KULLANICI_ADI.github.io/REPO_ADI/`)*

### Dorudan oyun dosyası
**https://winegg420.github.io/basketlig/charazay2.0.html**

---

## GitHub Pages nasıl açılır? (2 dakika)

1. Tarayıcıda repoyu aç: https://github.com/winegg420/basketlig  
2. Üst menüden **Settings** (Ayarlar)  
3. Sol menüden **Pages**  
4. **Build and deployment** → **Source:** `Deploy from a branch`  
5. **Branch:** `master` (veya `main`) — klasör: **`/(root)`** — **Save**  
6. **Save**’e bastıktan sonra 1–5 dakika bekle. Sayfayı yenile; üstte yeşil banner çıkar: **“Your site is live at https://winegg420.github.io/basketlig/”** — o link çalışır. Banner yoksa branch veya klasör yanlıştır (`master` + `/` root).

### Sık hata

- **Branch:** Repoda ana dal `main` ise Pages’te de `main` seç (`master` değil).
- **"There isn’t a GitHub Pages site here":** Pages’i ilk kez kaydedene kadar github.io 404 kalır; kayıt + birkaç dakika şart.

> **Önemli:** Repo **Public** olmalı; gizli (private) repolarda Pages ancak ücretli/GitHub Pro ile sınırlı senaryolarda açılır. Kontrol: **Settings → General** en altta **Danger Zone** / görünürlük.

---

## Bu GitHub sayfası oyun mu?

Hayır: **`https://github.com/winegg420/basketlig`** kod deposudur; arkadaşın “oyun ekranı” olarak **github.io** linkini kullanmalı.

`raw` / `raw.githack` linkleri bazen uyarı veya yanlış MIME yüzünden sorun çıkarır; **github.io** en sorunsuz yöntemdir.
