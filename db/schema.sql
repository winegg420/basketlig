-- ═══════════════════════════════════════════════════════════════════════════════════════
-- CHARAZAY 2.0 — ÇOK OYUNCULU VERİ ŞEMASI (PostgreSQL / Supabase)
--
-- Kaynak kararlar:  PLAN-LIG-YAPISI.md (lig kuralları)  ·  KARAR-SUNUCU.md (altyapı seçimi)
--                   PLAN-COK-OYUNCULU.md (mimari)
--
-- ⚠ BU DOSYA YALNIZ ŞEMADIR. Kod tabanında hiçbir Supabase bağlantısı kurulmuyor, hiçbir
--   hesap açılmadı. Sunucu tarafı yazılırken buradan başlanacak.
--
-- Temel kurallar (şemaya yansıtılmıştır):
--   · Lig 18 takım, 17 maç, tek devre. Sezon 2 ay, ayın 1'inde başlar.
--   · PLAY-OFF YOK. 1. doğrudan çıkar; 2-5 yükselme maçı; 18. doğrudan düşer; 15-17 düşme maçı.
--   · teams.owner_user_id NULL ise SİSTEM BOTU'dur (devralma havuzunda, sınırsız lig düşebilir).
--   · Sahibi olan ama uzun süre girilmeyen takım TERK EDİLMİŞ'tir: devralma havuzuna ASLA
--     girmez, sezonda en fazla 1 lig düşer, bot düzeltmesinden korunur. (bot_controlled +
--     abandoned_since alanları bu iki kategoriyi ayırt eder.)
--   · Maç sonucu YALNIZ sunucuda üretilir; istemci results satırını okur ve oynatır.
-- ═══════════════════════════════════════════════════════════════════════════════════════

begin;

create extension if not exists pgcrypto;    -- gen_random_uuid()

-- ── ÜLKELER ────────────────────────────────────────────────────────────────────────────
-- Her ülkenin kendi lig piramidi vardır; oyuncu kendi ülkesinin liginde oynar.
create table if not exists countries (
  id         smallserial primary key,
  ad         text        not null unique,
  kod        char(2)     not null unique,          -- ISO 3166-1 alpha-2 (TR, ES, US…)
  aktif      boolean     not null default true,    -- açılışta 30-40 ülke aktif olacak
  created_at timestamptz not null default now()
);

-- ── KULLANICILAR ───────────────────────────────────────────────────────────────────────
-- Kimlik Supabase Auth'ta (auth.users) durur; burası oyun tarafı profildir.
-- son_giris, "terk edilmiş takım" kuralının tek girdisidir (45 gün).
create table if not exists users (
  id             uuid        primary key references auth.users(id) on delete cascade,
  nick           text        not null unique check (char_length(nick) between 2 and 24),
  eposta         text,                                   -- anonim girişte NULL olabilir
  country_id     smallint    references countries(id),
  kayit_tarihi   timestamptz not null default now(),
  son_giris      timestamptz not null default now(),
  dil            char(2)     not null default 'tr'
);
create index if not exists users_son_giris_ix on users (son_giris);

-- ── LİGLER ─────────────────────────────────────────────────────────────────────────────
-- seviye: 1 = ülkenin en üst ligi. Devralınacak bot takım kalmayınca EN ALTA yeni lig açılır
-- (18 takım, hepsi bot); mevcut hiçbir takım yerinden oynatılmaz.
-- grup: aynı seviyede birden çok lig olduğunda ayırıcı ('A', 'B'…).
create table if not exists leagues (
  id          bigserial   primary key,
  country_id  smallint    not null references countries(id) on delete cascade,
  seviye      smallint    not null check (seviye >= 1),
  grup        text        not null default 'A',
  sezon       integer     not null,                       -- 1'den artan sezon numarası
  ad          text,                                       -- görünen ad ("TBL", "1. Lig A")
  durum       text        not null default 'hazirlik'
                          check (durum in ('hazirlik','devam','yukselme_dusme','bitti')),
  baslangic   date,                                       -- sezon ayın 1'inde başlar
  bitis       date,
  created_at  timestamptz not null default now(),
  unique (country_id, seviye, grup, sezon)
);

-- ── TAKIMLAR ───────────────────────────────────────────────────────────────────────────
-- KRİTİK ALAN: owner_user_id.
--   NULL              → sistem botu. Devralma havuzundadır, sınırsız lig düşebilir.
--   dolu + bot_controlled=false → aktif insan takımı.
--   dolu + bot_controlled=true  → TERK EDİLMİŞ takım. Sahibi değişmez, devralma havuzuna
--                                 asla girmez, sezonda en fazla 1 lig düşer.
-- Devralma = owner_user_id alanına kullanıcı kimliğini yazmak. KADROYA DOKUNULMAZ.
create table if not exists teams (
  id               bigserial   primary key,
  league_id        bigint      not null references leagues(id) on delete cascade,
  ad               text        not null,
  sehir            text,
  renk             text        not null default '#f97316',
  logo_url         text,
  owner_user_id    uuid        references users(id) on delete set null,
  bot_controlled   boolean     not null default true,     -- kontrolü bot mu sürüyor?
  abandoned_since  timestamptz,                           -- terk tespit anı (45 gün kuralı)
  kasa             bigint      not null default 50000,    -- KR
  arena_seviye     smallint    not null default 1,
  arena_ad         text,
  akademi_seviye   smallint    not null default 1,
  taktik           jsonb       not null default '{}'::jsonb,   -- tempo/odak/savunma + ilk 5
  kimya            smallint    not null default 75,
  updated_at       timestamptz not null default now(),
  unique (league_id, ad),
  -- Sistem botunun sahibi olamaz; terk edilmiş takımın sahibi olmak ZORUNDA.
  constraint teams_sahiplik_tutarli check (
    (owner_user_id is null  and abandoned_since is null) or
    (owner_user_id is not null)
  )
);
create index if not exists teams_league_ix on teams (league_id);
create index if not exists teams_owner_ix  on teams (owner_user_id);
-- Devralma havuzu: YALNIZ sahibi olmayan botlar. Terk edilmiş takım buraya asla düşmez.
create index if not exists teams_devralinabilir_ix on teams (league_id) where owner_user_id is null;

-- ── OYUNCULAR ──────────────────────────────────────────────────────────────────────────
-- Statlar tek tek sütun yerine jsonb: motor (genPlayer çıktısı) tek nesne üretiyor ve
-- alan kümesi sürüm sürüm büyüyor. Sorgulanan alanlar (genel, poz, yas) ayrıca sütundur.
create table if not exists players (
  id          bigserial primary key,
  team_id     bigint    references teams(id) on delete cascade,   -- NULL = serbest oyuncu
  isim        text      not null,
  poz         char(2)   not null check (poz in ('PG','SG','SF','PF','C')),
  yas         smallint  not null check (yas between 15 and 45),
  ulke        text,
  boy         smallint,
  genel       smallint  not null,                                 -- OVR (sorgu/sıralama için)
  potansiyel  smallint,
  maas        integer   not null default 0,                       -- KR / hafta
  sozlesme    smallint  not null default 52,                      -- kalan hafta
  enerji      smallint  not null default 100,
  sakat_donus date,                                               -- NULL = sağlam
  listed      boolean   not null default false,                   -- transfer listesinde mi
  veri        jsonb     not null,                                 -- tüm statlar + rol/kişilik
  created_at  timestamptz not null default now()
);
create index if not exists players_team_ix on players (team_id);
create index if not exists players_serbest_ix on players (genel desc) where team_id is null;

-- ── FİKSTÜR ────────────────────────────────────────────────────────────────────────────
-- tur: lig turu (1-17). tip: lig / yukselme / dusme — PLAY-OFF YOKTUR.
-- oynanma_zamani: maçın GERÇEK takvim saati. İstemcideki F10-2 kapısının (matchTimeGateOk)
-- sunucudaki karşılığı budur: saat gelmeden maç oynanmaz, saat gelince zamanlayıcı oynatır.
create table if not exists fixtures (
  id              bigserial   primary key,
  league_id       bigint      not null references leagues(id) on delete cascade,
  sezon           integer     not null,
  tur             smallint    not null,
  tip             text        not null default 'lig'
                              check (tip in ('lig','yukselme','dusme','kupa','uluslararasi')),
  ev_team_id      bigint      not null references teams(id) on delete cascade,
  dep_team_id     bigint      not null references teams(id) on delete cascade,
  oynanma_zamani  timestamptz not null,
  durum           text        not null default 'bekliyor'
                              check (durum in ('bekliyor','oynaniyor','bitti','iptal')),
  created_at      timestamptz not null default now(),
  check (ev_team_id <> dep_team_id)
);
-- Zamanlayıcının ana sorgusu: "saati gelmiş, hâlâ bekleyen maçlar".
create index if not exists fixtures_zamanlayici_ix on fixtures (oynanma_zamani)
  where durum = 'bekliyor';
create index if not exists fixtures_league_ix on fixtures (league_id, sezon, tur);

-- ── SONUÇLAR ───────────────────────────────────────────────────────────────────────────
-- seed + motor sürümü saklanır: aynı tohum aynı maçı üretir (tools/sim-node.js bunu sınar),
-- dolayısıyla tam olay dökümü İSTENDİĞİNDE yeniden üretilebilir.
--
-- ⚠ BOYUT: sezon başına ~14.000 maç × ~10 KB olay ≈ 140 MB. Kalıcı saklanacak şey
--   SKOR + BOX ÖZETİDİR; `olaylar` sezon kapanışında NULL'a çekilebilir (tohumdan geri gelir).
create table if not exists results (
  fixture_id   bigint      primary key references fixtures(id) on delete cascade,
  ev_skor      smallint    not null,
  dep_skor     smallint    not null,
  seed         bigint      not null,
  motor_surum  text        not null,                    -- olay listesi hangi sürümle üretildi
  olaylar      jsonb,                                   -- canlı sunumun oynattığı liste (silinebilir)
  box          jsonb       not null,                    -- kutu skor özeti (kalıcı)
  created_at   timestamptz not null default now()
);

-- ── PUAN DURUMU ────────────────────────────────────────────────────────────────────────
-- Sonuçlardan türetilebilir ama lig tablosu her açılışta okunduğu için maddileştirilir.
-- Yalnız sunucu yazar (maç bitiminde tek işlemde sonuç + puan durumu güncellenir).
create table if not exists standings (
  league_id  bigint   not null references leagues(id) on delete cascade,
  sezon      integer  not null,
  team_id    bigint   not null references teams(id) on delete cascade,
  o          smallint not null default 0,      -- oynanan
  g          smallint not null default 0,      -- galibiyet
  m          smallint not null default 0,      -- mağlubiyet
  sf         integer  not null default 0,      -- attığı sayı
  sa         integer  not null default 0,      -- yediği sayı
  puan       smallint not null default 0,      -- G=2, M=1 (mevcut oyunla aynı)
  primary key (league_id, sezon, team_id)
);

-- ── TRANSFERLER ────────────────────────────────────────────────────────────────────────
-- Teklif istemcide oluşturulur, SONUÇLANDIRMA sunucudadır (bütçe ve kadro sınırı denetimi).
create table if not exists transfers (
  id          bigserial   primary key,
  player_id   bigint      not null references players(id) on delete cascade,
  from_team   bigint      references teams(id) on delete set null,   -- NULL = serbest oyuncu
  to_team     bigint      not null references teams(id) on delete cascade,
  bedel       bigint      not null check (bedel >= 0),
  durum       text        not null default 'acik'
                          check (durum in ('acik','kabul','red','iptal')),
  tarih       timestamptz not null default now(),
  karar_tarih timestamptz
);
create index if not exists transfers_acik_ix on transfers (player_id) where durum = 'acik';

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — POLİTİKA TASLAĞI
--
-- İlke: OKUMA herkese açık (ligde şeffaflık — rakip kadrosunu görmek oyunun parçası).
--       YAZMA yalnız kendi takımına ve yalnız izin verilen alanlara.
--       Kasa, statlar, skorlar ve puan durumu İSTEMCİDEN ASLA yazılamaz — yalnız sunucu
--       (service_role) yazar. Hile koruması bu ayrımdan gelir.
-- ═══════════════════════════════════════════════════════════════════════════════════════
alter table countries enable row level security;
alter table users     enable row level security;
alter table leagues   enable row level security;
alter table teams     enable row level security;
alter table players   enable row level security;
alter table fixtures  enable row level security;
alter table results   enable row level security;
alter table standings enable row level security;
alter table transfers enable row level security;

-- Herkes okuyabilir (anonim ziyaretçi dahil): ülkeler, ligler, takımlar, oyuncular,
-- fikstür, sonuçlar, puan durumu.
create policy countries_read on countries for select using (true);
create policy leagues_read   on leagues   for select using (true);
create policy teams_read     on teams     for select using (true);
create policy players_read   on players   for select using (true);
create policy fixtures_read  on fixtures  for select using (true);
create policy results_read   on results   for select using (true);
create policy standings_read on standings for select using (true);

-- Kullanıcı yalnız kendi profilini görür ve günceller (nick herkese açık olacaksa ayrı bir
-- görünüm/`view` ile verilir — e-posta ve son_giris dışarı sızmamalı).
create policy users_self_read   on users for select using (id = auth.uid());
create policy users_self_update on users for update using (id = auth.uid());

-- TAKIM: yalnız sahibi güncelleyebilir. Alan kısıtı (yalnız taktik/renk/logo/arena_ad)
-- politika ile ifade edilemez; sütun düzeyinde GRANT ile verilir:
--   revoke update on teams from authenticated;
--   grant  update (taktik, renk, logo_url, arena_ad) on teams to authenticated;
create policy teams_owner_update on teams for update
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- OYUNCU: sahibi yalnız "transfer listesine koy" bayrağını çevirebilir (aynı şekilde
-- sütun GRANT'i ile sınırlanır: grant update (listed) on players to authenticated).
create policy players_owner_update on players for update
  using (exists (select 1 from teams t where t.id = players.team_id and t.owner_user_id = auth.uid()))
  with check (exists (select 1 from teams t where t.id = players.team_id and t.owner_user_id = auth.uid()));

-- TRANSFER: kullanıcı yalnız KENDİ takımı adına teklif oluşturur ve kendi tekliflerini görür.
-- Kabul/red sunucuda işlenir (bütçe + kadro sınırı), bu yüzden update politikası yoktur.
create policy transfers_own_read on transfers for select
  using (exists (select 1 from teams t
                 where (t.id = transfers.to_team or t.id = transfers.from_team)
                   and t.owner_user_id = auth.uid()));
create policy transfers_own_insert on transfers for insert
  with check (exists (select 1 from teams t where t.id = transfers.to_team and t.owner_user_id = auth.uid()));

-- fixtures / results / standings: istemci için SALT OKUNUR. Yazma politikası bilerek yok —
-- service_role RLS'i atlar, yalnız sunucu yazar.

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- YARDIMCI GÖRÜNÜMLER
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Devralınabilir takımlar: YALNIZ sistem botları (owner_user_id IS NULL).
-- Terk edilmiş takımlar (owner_user_id dolu + bot_controlled) bu listeye ASLA girmez.
-- Yeni oyuncuya bu liste gösterilir ve istediğini seçer (rastgele atama yok).
create or replace view devralinabilir_takimlar as
select t.id, t.ad, t.sehir, t.arena_seviye, l.id as league_id, l.seviye, l.country_id,
       (select round(avg(p.genel)) from players p where p.team_id = t.id) as kadro_ovr
from teams t
join leagues l on l.id = t.league_id
where t.owner_user_id is null
order by l.seviye asc, kadro_ovr desc;

-- Terk tespiti: sahibi var ama 45 gündür girmemiş ve hâlâ bot kontrolünde değil.
-- Zamanlayıcı bunları bot kontrolüne alır (bot_controlled = true, abandoned_since = now()).
create or replace view terk_adaylari as
select t.id as team_id, t.ad, u.id as user_id, u.son_giris
from teams t
join users u on u.id = t.owner_user_id
where t.bot_controlled = false
  and u.son_giris < now() - interval '45 days';

commit;

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ŞEMANIN KARŞILADIĞI KURALLAR (PLAN-LIG-YAPISI.md ile eşleme)
--
--  18 takım / 17 maç / tek devre      → fixtures.tur (1-17); takım sayısı fikstür üretiminde
--  Sezon 2 ay, ayın 1'inde            → leagues.baslangic / bitis (date)
--  Play-off yok                       → fixtures.tip: 'lig' | 'yukselme' | 'dusme' (playoff yok)
--  1. doğrudan çıkar, 2-5 yükselme    → standings sıralaması + fixtures.tip='yukselme'
--  18. doğrudan düşer, 15-17 düşme    → standings sıralaması + fixtures.tip='dusme'
--  Bot = owner_user_id NULL           → teams.owner_user_id + devralinabilir_takimlar görünümü
--  Terk edilmiş ≠ sistem botu         → teams.bot_controlled + abandoned_since + terk_adaylari
--  Devralma kadroya dokunmaz          → devralma yalnız owner_user_id yazar; players değişmez
--  Sonuç sunucuda üretilir            → results yazma politikası YOK (service_role)
--  Olay dökümü büyür                  → results.seed + motor_surum ile yeniden üretilebilir
-- ═══════════════════════════════════════════════════════════════════════════════════════
