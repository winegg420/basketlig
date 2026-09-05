# PLAN — Canlı Sahne Yeniden Yazımı (FAZ 46 · OAM: Oyun Akışı Makinesi)

Kullanıcı kararı (2026-09-05): "Yeniden yaz. Planı çıkar, baştan sona uygula."

## Teşhis (neden patch'le olmadı)

Maç önce **istatistikten** üretilir: motor (`simulateMatch`) geometrisiz bir olay listesi
çıkarır ("X sol kanattan üçlük attı, kaçtı, ribaundu Y aldı"). Eski sahne bu listeyi adım
adım "oynayan" bir kukla katmanıydı: dizilim şablonu, kulvar ara noktası (`_wp`), takip,
bekçi, markaj ve salınım aynı jetonun hedefini birbirinden habersiz yazıyordu; paslar
anlatımdaki oyuncuya topu ulaştırmak için atılıyor, boş adam görülmüyordu. 20 fazlık ayar
her seferinde bir sonraki çakışmayı açığa çıkardı.

## Mimari

| Katman | Sorumluluk | Durum |
|---|---|---|
| Motor (`simulateMatch`) | Kim, nereden, hangi sonuçla şut attı; ribaund, top kaybı, faul | DEĞİŞMEZ (`band.js` hash korunur) |
| **OAM** (`js/sahne-oam.js`) | Canlı topta her karede her oyuncuya TEK hedef: sokma → geçiş → set → şut | YENİ |
| Ölü top törenleri | Hava atışı, serbest atış, faul/ihlal sokması, mola, periyot | Eski koreografi (FAZ 44-45 düzeltmeleriyle) |
| Hareket fiziği | Hız merdiveni, ivme/dönüş sınırı, çarpışma, top fiziği | Eski `_simTick` — OAM önünde koşar |
| Anlatım senkronu | Ön parça top elden çıkarken, sonuç çemberde (`onShoot`/`onResult`) | Korunur |

OAM ilkeleri:
1. **Tek hedef yazıcı.** Canlı top boyunca eski hedef yazıcıları (canlıSet salınımı, defTrack,
   çıkış-pası kapısı, `_wp`) kapalıdır.
2. **Boşluk + şema.** Beş nokta (`SET_*` şablonu), şutörün noktası = motorun şut noktası.
   Şema: perde (3 aşama: kurulum · sıyırma · devrilme) · kesme · post (sırtı dönük) · açılma.
3. **Mantıklı pas.** Top tutan oyuncu BOŞ (en yakın savunmacı > 1,5 m) ve ÖNDEKİ takım
   arkadaşına pas atar; geri pas yalnız içeriden açma (< 5 m) ya da çevre çevirmesi. Pas
   zinciri: oyun kurucu → (ara) → asist veren → şutör (motorun asist sözleşmesi korunur).
4. **Adam adama savunma.** Her savunmacı adamı ile pota arasında; topa uzaklığa göre yardım
   mesafesi; topu tutana 1,3 m; top içerideyken zayıf taraf boyaya sarkar; şutta kapama.
5. **Sokma çizgi dışından.** Sokucu topu alıp çizgiye yürür, alıcı 5-6 m'de, savunma orta
   çizgide bekler; pas ancak sokucu noktasındayken.
6. **Zaman bütçesi.** Sokma + geçiş (gerçek varış süresi) + set (şemaya göre 1,5-3,0 sn +
   pas başına 0,35) = şut anı. Bütçe dolarsa baskı altında şut: pas zorla şutöre, şut oradan.
7. **Determinizm.** Sahne kararları yalnız `_sr`/`_srand` (sahne PRNG'si); maç akışı kaymaz.

## Uygulama adımları

1. `js/sahne-oam.js` — `animateShotPossession`, `_simTick`, `movePlayersForEvent` sarmalanır
   (`OAM_ACIK=false` ile eski yol geri gelir). ✔
2. Sözleşmeler: `_dbgOutlet` (M9), `S._sema` (F25-5), `S._perde` (F25-6b), `_sirtDonuk`
   (F25-6a), `preText` zamanı (F36), `_animRez`, şut tipi yörüngesi (F26), blok/AND-1/ribaunt
   bloğu (`oamAtes` eski `fire` sözleşmesini taşır). ✔
3. Ölçüm: `kontak-goruntu` (göz), `iz-kaydet` + `pas-analiz` + `gecis-analiz` (sayı),
   sonra kapı zinciri: sunum · sahne · realism · spacing · faz11 · hareket · arka-plan ·
   balon · band · measure · i18n · visual.
4. Belge + sürüm (82) + commit + push + canlı doğrulama.

## Kabul

- Sayı sonrası sokmaların ≥ %85'i çizgi dışından; saha içinden sokma 0.
- Canlı topta geri pas (> 2 m potadan uzaklaşan, içeriden açma hariç) ≤ %8; rakibe pas 0.
- Set fazında oyuncular arası ortalama mesafe ≥ 5,8 m; markaj 1,3-1,9 m; ball-you-man ≥ %85.
- Şut, şutörün noktasından ve motorun sonucuyla; kutu skor / `band.js` hash değişmez.
- Işınlanma 0; sahipsiz 1 sn üstü epizot 0; konsol hatası 0; `visual-check` geçer.
