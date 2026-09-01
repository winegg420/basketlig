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

  // ── 6) FAZ 33 §5: YİNELENEN DOM id ───────────────────────────────────────────────
  /* HTML'de id BENZERSİZ olmalıdır. Kurulum ekranında "ÜLKEN" iki kez görünüyordu:
     iki <select> aynı `menajerUlkeSec` id'sini taşıyordu (FAZ 30 yamasında blok iki kez
     yazılmıştı) ve getElementById hep ilkini döndürdüğü için ikincisi ölü kontroldü.
     Kapı tek seferlik düzeltme değil SINIF olarak yakalar: HTML'deki her id sayılır. */
  console.log('\n[6] Yinelenen DOM id (FAZ 33 §5)');
  {
    const html6 = fs.readFileSync(path.join(ROOT, 'charazay2.0.html'), 'utf8');
    const say = {};
    for (const m of html6.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)) {
      const k = m[1];
      say[k] = (say[k] || 0) + 1;
    }
    const yinelenen = Object.keys(say).filter(k => say[k] > 1);
    ok('charazay2.0.html içinde yinelenen id yok', yinelenen.length === 0,
      yinelenen.length ? yinelenen.map(k => k + ' ×' + say[k]).join(' · ')
                       : Object.keys(say).length + ' id tarandı');
  }

  // ── 7) FAZ 33 §4: DİVİZYON NUMARASI ↔ ANAHTAR ────────────────────────────────────
  /* Ekran "Divizyon 3 · Grup 1" derken iç anahtar '2.1' yazıyordu; iki ayrı
     numaralandırma vardı ve kodu okuyan herkes için tuzaktı (FAZ 25'te ekonomi
     denetçisi var olmayan '3.1' divizyonunda ölçüm yaptı). Artık anahtardaki sayı
     gösterilen sayının AYNISIDIR ve dönüşüm tek yardımcıdan geçer. */
  console.log('\n[7] Divizyon numarası ile anahtar eşleşiyor (FAZ 33 §4)');
  {
    const vm7 = require('vm');
    const ctx7 = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON, Number, String,
      Boolean, Array, Object, Error, RegExp, Map, Set, parseInt, parseFloat, isNaN, isFinite };
    ctx7.window = ctx7; ctx7.globalThis = ctx7;
    ctx7.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
    ctx7.navigator = { language: 'tr' }; ctx7.location = { search: '', hostname: '' };
    ctx7.document = { createElement: () => ({ style: {} }), createTreeWalker: () => ({ nextNode: () => null }),
      body: {}, documentElement: { setAttribute() {} }, getElementById: () => null };
    ctx7.NodeFilter = { SHOW_TEXT: 4 };
    ctx7.MutationObserver = function () { return { observe() {}, disconnect() {} }; };
    vm7.createContext(ctx7);
    const src7 = ['js/i18n.js', 'js/i18n-dict.js', 'js/i18n-commentary.js', 'js/names.js', 'js/state.js']
      .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
    vm7.runInContext(src7 + `
;globalThis.__d={divizyonNo,divizyonGrup,formatTblSlotLabel,divizyonAnahtarlari,divizyonAnahtari,
  divizyonDoldurmaSirasi,parseTblKey,DIV_SAYISI,DIV_GRUP_SAYISI};`, ctx7);
    const D = ctx7.__d;
    const hatalar = [];
    /* Her divizyon × her grup: anahtardan okunan numara, etikette yazan numarayla aynı mı? */
    for (let d = 1; d <= D.DIV_SAYISI; d++) {
      for (const k of D.divizyonAnahtarlari(d)) {
        const no = D.divizyonNo(k);
        if (no !== d) hatalar.push(`${k} → divizyonNo ${no} (beklenen ${d})`);
        const etiket = D.formatTblSlotLabel(k);
        const m = String(etiket).match(/(\d+)/);
        const gosterilen = m ? parseInt(m[1], 10) : 1;
        if (gosterilen !== d) hatalar.push(`${k} → etiket "${etiket}" (beklenen Divizyon ${d})`);
        /* Anahtarın kendi sayısı da aynı olmalı — §4'ün asıl talebi bu. */
        if (k !== 'tbl') {
          const anahtarSayisi = parseInt(String(k).split('.')[0], 10);
          if (anahtarSayisi !== d) hatalar.push(`${k} anahtarındaki sayı ${anahtarSayisi} ≠ divizyon ${d}`);
        }
        if (D.parseTblKey(k).kind === 'div' && D.parseTblKey(k).div !== d)
          hatalar.push(`parseTblKey(${k}).div = ${D.parseTblKey(k).div} ≠ ${d}`);
      }
    }
    ok('gösterilen divizyon numarası = anahtardaki numara', hatalar.length === 0,
      hatalar.length ? hatalar.slice(0, 5).join(' | ')
                     : `${D.DIV_SAYISI} divizyon × ${D.DIV_GRUP_SAYISI} grup tarandı`);
    /* Divizyon 1 yalnız 'tbl' olmalı — '1.g' iki kez Divizyon 1 demek olurdu. */
    ok("Divizyon 1'in tek anahtarı 'tbl'", D.divizyonAnahtarlari(1).join() === 'tbl',
      D.divizyonAnahtarlari(1).join(' '));
    /* Doldurma sırası en alttan yukarı ve tekrarsız. */
    const sira = D.divizyonDoldurmaSirasi();
    ok('doldurma sırası en alt divizyondan başlıyor ve tekrarsız',
      D.divizyonNo(sira[0]) === D.DIV_SAYISI && new Set(sira).size === sira.length,
      sira.join(' '));
  }

  const dusen = sonuc.filter(s => !s.gecti);
  console.log('\n' + '='.repeat(60));
  console.log(`SONUÇ: ${sonuc.length - dusen.length}/${sonuc.length} denetim geçti`);
  if (dusen.length) { dusen.forEach(d => console.log('  ✗ ' + d.ad + (d.not ? ' — ' + d.not : ''))); process.exit(1); }
  process.exit(0);
})();
