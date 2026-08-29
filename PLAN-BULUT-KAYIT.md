# PLAN — Bulut Kayıt & Hesap Sistemi (RAPOR-2 Madde 3)

**Durum:** planlama · kod değişikliği yapılmadı (29. oturum kararı)
**Hazırlayan:** 29. oturum · **Tarih:** 2026-08-29

---

## 1. Bugün ne var?

| Katman | Nerede | Not |
|---|---|---|
| Otomatik kayıt | `js/persistence.js` — `saveGameNow()` | localStorage anahtarı + büyük string için IndexedDB fallback |
| 3 manuel slot | `js/persistence.js` — kayıt slotu fonksiyonları | Aynı cihaz, aynı tarayıcı profili |
| Dışa/içe aktarma | `exportGameJson` / `importGameJson` | **Zaten çalışıyor** — bulut olmadan taşınabilirlik sağlıyor |
| Serileştirme | `serializeGameState` / `applyGameState` + migrasyonlar | Bulut kaydı için gereken tek veri sözleşmesi bu — hazır |

**Sonuç:** Oyun durumu zaten tek bir JSON'a indirgenebiliyor. Bulut kaydı, mevcut save/load
çağrılarının etrafına bir "uzak depo" katmanı eklemekten ibaret; oyun mantığına dokunulmaz.

**Kayıp riski (bugün):** tarayıcı verisi temizlenirse, gizli sekmede oynanırsa, cihaz değişirse
kayıt gider. Steam/masaüstü hedefinde bu daha da kritik.

---

## 2. Seçenekler

### A) Supabase (önerilen — web + Steam birlikte)
- **Kimlik:** anonim (misafir) giriş + e-posta/şifre yükseltme. Misafir oynayıp sonra hesap
  bağlama akışı native destekli — oyunun "önce oyna, sonra kaydol" ihtiyacına birebir uyuyor.
- **Depo:** tek tablo `saves(user_id, slot, payload jsonb, updated_at, version)` + RLS ile
  "sadece kendi satırını gör/yaz" politikası.
- **Entegrasyon:** statik HTML'e tek `<script>` (CDN'den supabase-js). Build adımı gerekmez —
  projenin "framework yok" kuralı korunur.
- **Maliyet:** ücretsiz katman (500 MB DB, 50K aylık aktif kullanıcı) bu ölçek için fazlasıyla yeter.
- **Steam/Tauri:** aynı HTTP API masaüstünden de çalışır; ayrıca Steam Cloud'a paralel yazılabilir.
- **Risk:** dışa bağımlılık; internet yokken oyun localStorage ile devam etmeli (offline-first şart).

### B) Firebase (Firestore + Anonymous Auth)
- Supabase ile işlevsel olarak denk; anonim giriş ve gerçek zamanlı senkron olgun.
- **Eksi:** SDK daha ağır, ücretlendirme okuma/yazma başına (kayıt sık yazılırsa maliyet öngörmek zor),
  Google hesabı/konsol bağımlılığı.

### C) Steam Cloud (yalnız masaüstü)
- Steam yayını hedefte olduğu için "bedava" bir seçenek: Steam kullanıcıya bağlı dosya senkronu.
- **Eksi:** GitHub Pages'teki web sürümünü kapsamaz, tarayıcı oyuncuları çözümsüz kalır.
- **En iyi kullanım:** A veya B ile birlikte, masaüstü sürümde ikinci bir yedek olarak.

### D) Hiçbiri — JSON dışa/içe aktarmayı görünür kıl
- Sıfır altyapı, sıfır maliyet, sıfır gizlilik yükümlülüğü.
- **Eksi:** kullanıcıyı manuel yedeklemeye mecbur bırakır; "kaydım gitti" şikayetini bitirmez.

---

## 3. Önerilen mimari (A seçilirse)

```
oyun durumu (G) ──serializeGameState()──> JSON
                                            │
                    ┌───────────────────────┴────────────────────────┐
                    ▼                                                ▼
        localStorage/IndexedDB (her zaman, anında)        Supabase saves tablosu
             = tek gerçek kaynak (offline-first)          = yedek + cihazlar arası taşıma
                                                            (debounce ~30 sn / önemli olaylarda)
```

**Kurallar:**
1. **Offline-first.** Yerel kayıt hiçbir koşulda devre dışı kalmaz; bulut yalnızca ek katman.
   Ağ hatası oyunu asla durdurmaz (`try-catch` + sessiz yeniden deneme).
2. **Yazma sıklığı.** Her `saveGameNow()` buluta gitmez — 30 sn debounce + maç sonu, sezon sonu,
   transfer gibi kritik anlarda zorunlu push.
3. **Çakışma çözümü.** `updated_at` + `version` alanı; iki cihaz çakışırsa kullanıcıya
   "Bulut kaydı (Sezon 3, 12 saat önce) mı, bu cihazdaki kayıt (Sezon 2, az önce) mı?" diye sor —
   sessizce üzerine yazma.
4. **Migrasyon.** Bulut payload'ı da `applyGameState` migrasyonlarından geçer; şema sürümü
   payload içinde saklanır (zaten var).
5. **Gizlilik.** Sadece takım adı + oyun durumu saklanır; e-posta Supabase auth tarafında kalır.
   KVKK/GDPR için "hesabımı sil" butonu gerekir (tek satır RPC).

## 4. İş kırılımı (A seçilirse)

| # | İş | Tahmin | Dosya |
|---|---|---|---|
| 1 | Supabase projesi + `saves` tablosu + RLS politikaları | — (konsol işi) | — |
| 2 | `js/cloud.js` yeni modül: init, anonim giriş, `cloudPush/cloudPull/cloudList` | orta | yeni dosya, script sırasının **sonuna** |
| 3 | Giriş ekranına "Misafir olarak oyna / Hesapla giriş" seçenekleri | orta | `charazay2.0.html` + `js/persistence.js` |
| 4 | `saveGameNow` sonrası debounce'lu bulut push | küçük | `js/persistence.js` |
| 5 | Ayarlar'a "Buluta yedekle / Buluttan yükle / Hesabı bağla / Hesabı sil" | orta | `js/persistence.js` + `js/main.js` |
| 6 | Çakışma modalı + offline rozet | küçük | `js/main.js` |
| 7 | `tools/visual-check.js` akışına bulut senaryosu (mock'lu) | küçük | `tools/visual-check.js` |

**Karar bekleyen sorular**
- Steam sürümünde Steam Cloud da paralel kullanılsın mı, yoksa tek kaynak Supabase mi?
- Misafir kaydı sunucuda ne kadar saklansın (ör. 90 gün dokunulmazsa temizle)?
- Hesap zorunlu mu olacak, yoksa bulut tamamen opsiyonel bir "yedekle" özelliği mi kalacak?
