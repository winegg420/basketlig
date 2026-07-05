# PROGRESS — Charazay 2.0 (Basket Menajerlik)

Tek dosyalık basketbol menajerlik oyunu (`charazay2.0.html`). Steam yayınına hazırlık.

## 2026-07-05 — Yayına hazırlık taraması ve düzeltmeler

### Yapılanlar
- **Kadın portreleri kaldırıldı (erkek oyuncu şartı):** Portre havuzundaki (`assets/portraits/`, 120 dosya)
  12 kadın portre (indeks 10,11,30,31,50,51,70,71,90,91,110,111) erkek olarak yeniden üretildi.
  Kaynak: `PORTRAIT_ETH` dizisindeki iki "woman" girdisi ("Spanish/Korean woman basketball player")
  hem `charazay2.0.html` (satır ~1846) hem `tools/generate-portraits.py` içinde "Spanish man"/"Korean man"
  ile değiştirildi. 120/120 portre görsel olarak tarandı — hepsi erkek, Charazay tarzı stüdyo headshot.
- **Lig takım ismi çakışması düzeltildi:** İsimler `${şehir} ${sonek}` (10×12=120 kombinasyon) rastgele
  seçiliyordu; grup başına 20 takımda çakışma (ör. iki "Adana Panterleri") oluyordu. `makeSubTemplate` artık
  grup içinde benzersiz isim üretiyor (`genUniqueClubName`), ve `ensureTblState` mevcut kayıtlardaki çakışan
  isimleri de onarıyor. Tüm 26 lig grubu benzersiz doğrulandı.

### Test ve doğrulama (tarayıcıda, yerel sunucu ile)
- JS syntax temiz (node --check), tüm 10 sayfa (dashboard, takım, kadro, maç, lig, market, altyapı, antrenman,
  arena, bilanço) hatasız render oluyor. Konsol hatası yok.
- Tüm inline onclick handler'ları ve aksiyon fonksiyonları tanımlı; modallar (ayarlar, başarımlar, öğretici,
  oyuncu, taktik) açılıp kapanıyor.
- **Maç motoru kusursuz:** canlı Türkçe anlatım (renk kodlu: sayı yeşil, kaçan kırmızı), skorboard, çeyrek
  dökümü, şut haritası filtresi, ahşap zeminli tam basketbol sahası (iki pota, boyalı alanlar, 3 sayı yayları),
  canlı takım istatistikleri. Tam maç sonu akışı (puan tablosu, ekonomi/bilet geliri, CPU maç simülasyonu,
  sakatlık) hatasız tamamlanıyor.
- Yerleşik mentor öz-denetimi (`charazayCollectMentorIssues`) tüm sayfalarda 0 hata; yalnızca 2 bilgilendirici
  uyarı (sidebar lig ağacı kaydırılabilir — normal davranış).

### Kararlar / gözlemler
- Portreler pollinations.ai ile deterministik seed'lerle üretiliyor (internet gerektirir). Yeniden üretim için
  ilgili dosyaları silip `py tools/generate-portraits.py 120` çalıştırmak yeterli (mevcut >8KB dosyaları atlar).
- **Açık öneri (kullanıcı kararı bekliyor):** Maç skorları demo temposu nedeniyle düşük (ör. 31-28; 5 dk çeyrek).
  Gerçekçi basketbol skorları (~80-100) istenirse maç motoru temposu ayarlanabilir; şu an anlatım akışı hızlı
  tutmak için bilinçli tercih.
- Steam paketleme: Oyun tek HTML dosyası. Steam masaüstü dağıtımı için Electron/Tauri sarmalayıcı gerekir
  (ayrı bir adım; henüz yapılmadı).
