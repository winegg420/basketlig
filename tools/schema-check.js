#!/usr/bin/env node
/**
 * Charazay 2.0 — db/schema.sql DENETÇİSİ (BÖLÜM 4)
 *
 * İki katman:
 *   1) SÖZDİZİMİ — `pgsql-parser` kuruluysa gerçek PostgreSQL ayrıştırıcısı ile
 *      (npm i --no-save pgsql-parser). Kurulu değilse yapısal denetime düşer:
 *      parantez/tırnak dengesi, ifade sonlandırıcı, begin/commit eşleşmesi.
 *   2) KURAL — PLAN-LIG-YAPISI.md'deki kararların şemada karşılığı var mı:
 *      bot ayrımı, play-off yokluğu, sunucu-yazar ilkesi, RLS, olay dökümü notu.
 *
 * Çalıştırma:  node tools/schema-check.js
 * Çıkış kodu:  0 = geçti, 1 = en az bir denetim düştü.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOSYA = path.join(ROOT, 'db', 'schema.sql');

const sonuc = [];
function ok(ad, gecti, not) {
  sonuc.push({ ad, gecti: !!gecti, not: not || '' });
  console.log(`  ${gecti ? '✓' : '✗'} ${ad}${not ? ' — ' + not : ''}`);
}

/** Yorumları ve dizeleri temizler — denge sayımı yanılmasın. */
function temizle(sql) {
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'(?:[^']|'')*'/g, "''");
}

(async () => {
  console.log('db/schema.sql DENETİMİ\n' + '='.repeat(60));
  if (!fs.existsSync(DOSYA)) { console.error('✗ db/schema.sql yok'); process.exit(1); }
  const sql = fs.readFileSync(DOSYA, 'utf8');
  const t = temizle(sql);

  // ── 1) Sözdizimi ────────────────────────────────────────────────────────────────────
  console.log('\n[1] Sözdizimi');
  let ayristirildi = null;
  try {
    const m = require('pgsql-parser');
    const fn = m.parse || m.parseSync || (m.default && m.default.parse);
    const r = await fn(sql);
    const stmts = (r && r.parse_tree && r.parse_tree.stmts) || r.stmts || r;
    ayristirildi = Array.isArray(stmts) ? stmts.length : null;
    ok('gerçek PostgreSQL ayrıştırıcısı geçti', ayristirildi > 0, `${ayristirildi} ifade`);
  } catch (e) {
    if (/Cannot find module/.test(e.message)) {
      console.log('  ℹ pgsql-parser kurulu değil — yapısal denetime düşülüyor');
      console.log('    (gerçek ayrıştırma için: npm i --no-save pgsql-parser)');
      const par = (t.match(/\(/g) || []).length - (t.match(/\)/g) || []).length;
      ok('parantez dengeli', par === 0, par === 0 ? '' : `fark ${par}`);
      const tirnak = (t.match(/'/g) || []).length;
      ok('tırnak dengeli', tirnak % 2 === 0, `${tirnak} tırnak`);
      const ifade = t.split(';').filter(x => x.trim()).length;
      ok('ifadeler noktalı virgülle bitiyor', ifade >= 20, `${ifade} ifade`);
    } else {
      ok('gerçek PostgreSQL ayrıştırıcısı geçti', false, e.message.slice(0, 160));
    }
  }
  ok('begin/commit eşleşiyor',
    (t.match(/\bbegin\b/gi) || []).length === (t.match(/\bcommit\b/gi) || []).length,
    `${(t.match(/\bbegin\b/gi) || []).length} begin`);

  // ── 2) Tablolar ─────────────────────────────────────────────────────────────────────
  console.log('\n[2] Tablolar (PLAN-LIG-YAPISI.md bölüm 7)');
  const gerekli = ['countries', 'leagues', 'teams', 'players', 'users', 'fixtures', 'results', 'standings', 'transfers'];
  const eksik = gerekli.filter(x => !new RegExp('create table if not exists ' + x + '\\b', 'i').test(sql));
  ok('dokuz tablonun tamamı var', eksik.length === 0, eksik.join(', ') || gerekli.length + ' tablo');

  // ── 3) Lig kuralları ────────────────────────────────────────────────────────────────
  console.log('\n[3] Lig kuralları');
  ok('bot takım = owner_user_id NULL', /owner_user_id\s+uuid\s+references users/i.test(sql));
  ok('terk edilmiş takım ayrı (bot_controlled + abandoned_since)',
    /bot_controlled\s+boolean/i.test(sql) && /abandoned_since\s+timestamptz/i.test(sql));
  ok('devralma havuzu YALNIZ sahipsiz takımları içeriyor',
    /create or replace view devralinabilir_takimlar[\s\S]*?owner_user_id is null/i.test(sql));
  ok('terk adayları görünümü 45 gün kuralını uyguluyor',
    /terk_adaylari[\s\S]*?interval\s*'45 days'/i.test(sql));
  const tip = /tip\s+text[\s\S]*?check \(tip in \(([^)]*)\)\)/i.exec(sql);
  ok('play-off YOK — fikstür tipleri lig/yükselme/düşme',
    !!tip && /'lig'/.test(tip[1]) && /'yukselme'/.test(tip[1]) && /'dusme'/.test(tip[1]) && !/playoff/i.test(tip[1]),
    tip ? tip[1].replace(/\s+/g, ' ').trim() : 'tip kısıtı yok');
  ok('fikstürde gerçek takvim saati var (oynanma_zamani)',
    /oynanma_zamani\s+timestamptz\s+not null/i.test(sql));
  ok('zamanlayıcı için kısmi indeks var',
    /create index[\s\S]*?fixtures \(oynanma_zamani\)[\s\S]*?where durum = 'bekliyor'/i.test(sql));
  ok('sonuç yeniden üretilebilir (seed + motor sürümü)',
    /seed\s+bigint\s+not null/i.test(sql) && /motor_surum\s+text\s+not null/i.test(sql));
  ok('olay dökümünün büyüme notu şemada',
    /140 MB|olay dökümü|olaylar.*silinebilir/i.test(sql));

  // ── 4) Güvenlik ─────────────────────────────────────────────────────────────────────
  console.log('\n[4] Row Level Security');
  const rlsEksik = gerekli.filter(x => !new RegExp('alter table\\s+' + x + '\\s+enable row level security', 'i').test(sql));
  ok('her tabloda RLS açık', rlsEksik.length === 0, rlsEksik.join(', ') || '9 tablo');
  ok('okuma herkese açık (lig şeffaflığı)', /create policy\s+teams_read\s+on\s+teams\s+for select using \(true\)/i.test(sql));
  ok('takımı yalnız sahibi güncelleyebiliyor',
    /teams_owner_update[\s\S]*?owner_user_id = auth\.uid\(\)/i.test(sql));
  const yazma = /create policy \w+ on (fixtures|results|standings) for (insert|update|delete)/i.test(sql);
  ok('fikstür/sonuç/puan durumu istemciden yazılamıyor', !yazma,
    yazma ? 'istemci yazma politikası bulundu!' : 'yalnız service_role yazar');

  // ── 5) Bağlantı yok ─────────────────────────────────────────────────────────────────
  console.log('\n[5] Kod tabanında bağlantı yok (bu bölüm yalnız dosya üretir)');
  const jsDosyalar = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'));
  const kirli = [];
  jsDosyalar.forEach(f => {
    const s = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
    if (/supabase|createClient\(|SUPABASE_URL|anon_key/i.test(s)) kirli.push(f);
  });
  const html = fs.readFileSync(path.join(ROOT, 'charazay2.0.html'), 'utf8');
  if (/supabase/i.test(html)) kirli.push('charazay2.0.html');
  ok('js/ ve HTML içinde Supabase bağlantısı yok', kirli.length === 0, kirli.join(', '));

  const dusen = sonuc.filter(s => !s.gecti);
  console.log('\n' + '='.repeat(60));
  console.log(`SONUÇ: ${sonuc.length - dusen.length}/${sonuc.length} denetim geçti`);
  if (dusen.length) { dusen.forEach(d => console.log('  ✗ ' + d.ad + (d.not ? ' — ' + d.not : ''))); process.exit(1); }
  process.exit(0);
})();
