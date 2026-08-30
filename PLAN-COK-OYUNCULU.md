# PLAN — ÇOK OYUNCULU MİMARİ (FAZ 10 · F10-1 / F10-3)

**Durum:** planlama · sunucu kodu yazılmadı (34. oturum kararı)
**Karar:** altyapı **Supabase** (kullanıcı onayı, 34. oturum)
**Öncülü:** `PLAN-BULUT-KAYIT.md` — o belge yalnız *kayıt yedekleme* planlıyordu; bu belge onu
tek gerçek kaynağı sunucu olan çok oyunculu şemaya genişletir.

---

## 0. Oyunun temeli (kullanıcı tanımı)

| Kural | Nasıl |
|---|---|
| Maç zamanı | **Fikstür tarihinde** oynanır — oyuncu istediği anda maç yapamaz |
| Maç başlatma | Saat gelince **otomatik** oynanır |
| Oyuncu orada ise | Canlı izler ve **müdahale eder** (taktik, mola, değişiklik) |
| Oyuncu orada değilse | Maç yine oynanır, sonucu döndüğünde görür |
| Rakipler | **Gerçek oyuncular + botlar** — botlar sahipsiz takımları doldurur |

> Maçların bugün art arda oynanabilmesi **bilinçli bir test kolaylığıdır**, hata değildir.
> FAZ 10'da bu kolaylık `?test=1` bayrağının arkasına alındı (F10-2, `js/state.js` → `TEST_MODU`,
> `matchTimeGateOk`). Fikstür kayıtlarına `scheduledAt` eklendiği gün kapı kendiliğinden devreye girer.

---

## 1. Bugünkü mimari ile hedefin farkı

| | Bugün (tek oyunculu) | Hedef (çok oyunculu) |
|---|---|---|
| Gerçek kaynak | `localStorage` + IndexedDB | **Postgres (Supabase)** |
| Simülasyon | tarayıcı — `generateMatchEvents()` | **sunucu** (Edge Function / Node) |
| Rakip | bot | gerçek oyuncu **veya** bot |
| Fikstür | oyun günü sayacı | **gerçek takvim saati** (`scheduled_at`) |
| Hile koruması | yok (gereksiz) | sonuç yalnız sunucuda üretilir |
| Çevrimdışı | tam oynanır | **görüntülenir**, yazma kuyruklanır |

**Değişmeyen ne var:** maç motoru, denge tabloları, arayüz, dil katmanı, kayıt biçimi
(`serializeGameState`/`applyGameState`). Değişen tek şey **simülasyonun nerede çalıştığı** ve
**durumun nerede durduğu**.

---

## 2. En kritik karar: simülasyon sunucuda

`generateMatchEvents()` bugün tarayıcıda çalışıyor ve sonucu yerel PRNG ile üretiyor. İki gerçek
oyuncu karşılaşınca sonucu **kim** üretecek sorusunun tek doğru cevabı sunucudur.

> **⚠ 36. oturum düzeltmesi:** Aşağıdaki "zaten Node'da çalıştırıyor" ifadesi yanlıştı —
> `tools/box-band.js` Playwright ile başsız bir **tarayıcı** açıyor, saf Node değil. Motor
> gerçekten tarayıcısız yüklenebiliyor (ölçüldü), ama iki engel var: rakip gücü takım adının
> hash'inden üretiliyor (`pseudoTeamStrength`) ve motor küresel `G` durumuna bağlı.
> Ayrıntı ve yapılacak dönüşüm: **`KARAR-SUNUCU.md` madde 3.0.**

**İyi haber:** motor saf JavaScript ve tarayıcıya bağımlı değil — `tools/box-band.js`,
`tools/season-loop.js` ve `tools/band.js` onu başsız ortamda çalıştırıyor. Yapılacak iş,
bu harness'lerin yaptığını üretimde tekrarlamak:

```
js/match-engine.js  ─┬─→ tarayıcı (canlı SUNUM: olay listesini oynatır)
                     └─→ sunucu   (ÜRETİM: olay listesini ve skoru üretir)
```

**Kural:** tarayıcı sonuç üretmez, yalnız sunucudan gelen `events[]` dizisini oynatır.
Bu ayrım kurulunca hile koruması bedavaya gelir (F10-1 · madde 6).

**Determinizm şartı:** sunucu maçı `seed` ile üretir; `seed` ve `events` veritabanında saklanır.
Aynı maç yeniden üretildiğinde birebir aynı sonuç çıkmalıdır — `tools/band.js` hash denetimi
(`ec630b3a512bb3b2`) bu güvencenin bugünkü karşılığıdır ve sunucu tarafında da koşulmalıdır.

---

## 3. Veri şeması (Postgres / Supabase)

```sql
-- Kimlik: auth.users (Supabase Auth; anonim giriş + e-posta yükseltme)
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  nick        text unique not null,
  created_at  timestamptz default now(),
  last_seen   timestamptz
);

create table leagues (
  id          bigserial primary key,
  ad          text not null,           -- "TBL", "1. Lig A" …
  seviye      int  not null,           -- terfi/düşme piramidi
  sezon       int  not null,
  durum       text not null default 'hazirlik'  -- hazirlik|devam|playoff|bitti
);

create table teams (
  id          bigserial primary key,
  league_id   bigint references leagues on delete cascade,
  owner_id    uuid   references profiles on delete set null,   -- NULL ⇒ bot takım
  isim        text not null,
  renk        text,
  kasa        bigint not null default 50000,
  arena       jsonb  not null default '{}',
  akademi     jsonb  not null default '{}',
  taktik      jsonb  not null default '{}',   -- tempo/odak/savunma + ilk 5
  updated_at  timestamptz default now(),
  unique (league_id, isim)
);

create table players (
  id          bigserial primary key,
  team_id     bigint references teams on delete cascade,
  veri        jsonb not null,          -- genPlayer() çıktısı (statlar, yaş, enerji, sakatlık)
  maas        int   not null,
  listed      boolean not null default false
);

create table fixtures (
  id           bigserial primary key,
  league_id    bigint references leagues on delete cascade,
  tur          int not null,
  home_team    bigint references teams,
  away_team    bigint references teams,
  scheduled_at timestamptz not null,   -- ⟵ F10-2 kapısının sunucudaki karşılığı
  durum        text not null default 'bekliyor'  -- bekliyor|oynaniyor|bitti
);

create table results (
  fixture_id  bigint primary key references fixtures on delete cascade,
  hs int not null, as_ int not null,
  seed        bigint not null,         -- yeniden üretilebilirlik
  events      jsonb  not null,         -- canlı sunumun oynattığı olay listesi
  box         jsonb  not null,
  created_at  timestamptz default now()
);

create table transfers (
  id          bigserial primary key,
  player_id   bigint references players on delete cascade,
  from_team   bigint references teams,
  to_team     bigint references teams,
  bedel       bigint not null,
  durum       text not null default 'acik',   -- acik|kabul|red|iptal
  created_at  timestamptz default now()
);
```

**RLS özeti**
- `profiles`: kendi satırını yazar, herkesin nick'ini okur.
- `teams` / `players`: **okuma herkese açık** (ligde şeffaflık), **yazma yalnız sahibine** ve
  yalnız izin verilen alanlara (taktik, ilk 5, listeleme). Kasa, stat ve sonuç **istemciden asla
  yazılamaz** — yalnız sunucu (service role) yazar.
- `fixtures` / `results`: istemci için **salt okunur**.
- `transfers`: teklif oluşturma istemcide, sonuçlandırma sunucuda (bütçe denetimi).

---

## 4. Fikstür zamanlayıcısı

Supabase **pg_cron** (veya Edge Function + Vercel Cron) dakikada bir:

```
scheduled_at <= now() ve durum='bekliyor' olan fikstürleri kilitle (for update skip locked)
  → her biri için: kadroları oku → simulateFixture(seed) → results'a yaz → durum='bitti'
  → puan durumu, ekonomi, enerji/sakatlık güncelle → realtime kanalına yayınla
```

Oyuncu o anda çevrimiçiyse tarayıcı `results.events`'i canlı oynatır; değilse döndüğünde
maçı tekrar izleyebilir (olay listesi saklandığı için "maç tekrarı" bedava gelir).

**Müdahale (canlı koçluk):** maç, olay listesi tek seferde üretilmek yerine **çeyrek çeyrek**
üretilir; çeyrek arasında oyuncunun `teams.taktik` alanına yazdığı değişiklik bir sonraki
çeyreğe girdi olur. Böylece "orada olan müdahale eder, olmayan etkilenmez" kuralı korunur ve
sonucun tarafsızlığı bozulmaz.

---

## 5. Bot takımlar

`owner_id IS NULL` olan her takım bottur. Bot kadro mekaniği **zaten kalıcı** (M20:
`botClubEnsureDepth`, `p.sezon`, `p.enerji`, `injReturnDay`) — sunucuya taşınacak olan bu
mantığın aynısıdır. Yeni oyuncu kaydolunca boş bir bot takımın sahibi olur; ayrılırsa takım
bota döner. Lig hiçbir zaman eksik kalmaz.

---

## 6. Yol haritası (uygulama sırası)

| Adım | İş | Bağımlılık |
|---|---|---|
| 1 | Supabase projesi + şema + RLS | — |
| 2 | Anonim giriş + profil + takım sahiplenme | 1 |
| 3 | Motoru sunucuda çalıştıran `sim` paketi (Node) + hash denetimi | — |
| 4 | Fikstür zamanlayıcısı (pg_cron) + `results` yazımı | 1, 3 |
| 5 | İstemci: yerel simülasyon yerine `results.events` oynatma | 4 |
| 6 | Realtime abonelik + canlı izleme + çeyrek arası müdahale | 5 |
| 7 | Ortak transfer piyasası (sunucu doğrulamalı) | 2 |
| 8 | Lig yönetimi: terfi/düşme, sezon devri, bot doldurma | 4 |
| 9 | Bildirim (Web Push — PWA ön koşulu F10-7'de kuruldu) | 6 |

**Ölçek notu:** Supabase ücretsiz katmanı (500 MB DB, 50K aylık aktif kullanıcı) başlangıç için
yeterlidir. `results.events` en büyük tablo olacaktır — sezon sonunda eski maçların `events`
alanı boşaltılıp yalnız skor + box saklanabilir.

---

## 7. Bu plana kadar yapılanlar (FAZ 10, 34. oturum)

- **F10-2** fikstür saati kapısı + `?test=1` bayrağı (`js/state.js`) — mimari geldiğinde
  davranış tek noktadan açılır.
- **F10-4** analitik katmanı (varsayılan kapalı, olay listesi belirlenmiş).
- **F10-5** og/twitter etiketleri + davet & sonuç paylaşımı — davet, çok oyunculunun büyüme kanalı.
- **F10-7** service worker + manifest — bildirim altyapısının ön koşulu.

**Yapılmayan:** sunucu, veritabanı, hesap, zamanlayıcı, sunucu tarafı simülasyon. Bunlar
belgenin 6. bölümündeki sıraya göre ayrı bir faz olarak ele alınmalıdır — tek oyunculu tarafın
tamamıyla aynı büyüklükte bir iştir.
