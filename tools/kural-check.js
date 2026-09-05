#!/usr/bin/env node
/**
 * Charazay 2.0 — KURAL OLAYI SIKLIĞI + ŞUT SAATİ GÖSTERGESİ (FAZ 43 İŞ 3 · D1)
 *
 * İŞ 3: taç · hücum faulü · adım/çift sürme · şut saati ihlali, TAKIM BAŞINA MAÇ BAŞINA,
 *       `tools/_lib/gercek-bantlar.json` → `kuralOlaylari` bantlarıyla (FIBA süresine
 *       ölçekli). Bu olaylar top kaybı bütçesinin İÇİNDEN çıkar; `kutu-check` top kaybı /
 *       pozisyon kapısı da aynı koşuda basılır (üstüne eklenmediğinin kanıtı).
 * D1:   Göstergenin kararı motordaki TEK kaynaktan (`sutSaatiKarar`) okunur ve olay
 *       dizisi üzerinde maç saatiyle sürülür: gösterge 0'da kaç maç saniyesi bekliyor,
 *       kaç pozisyonda ihlal düdüğü olmadan 0'a iniyor.
 *
 * Kullanım: node tools/kural-check.js [--mac=240] [--tohum=20000]
 */
const { ortamKur, kadroUret } = require('./_lib/anlatim-ornek.js');
const G = require('./_lib/gercek-bant.js');

const arg = (ad, v) => { const m = process.argv.find(a => a.startsWith('--' + ad + '=')); return m ? Number(m.split('=')[1]) : v; };
const MAC = arg('mac', 240);
const TOHUM = arg('tohum', 20000);

const ctx = ortamKur();
const ev = kadroUret(ctx, 0x1111), dep = kadroUret(ctx, 0x2222);
const karar = ctx.__api.sutSaatiKarar;
if (typeof karar !== 'function') { console.error('✗ sutSaatiKarar dışa verilmemiş (tools/_lib/anlatim-ornek.js epilog)'); process.exit(1); }

const SAY = { tac: 0, hucumFaulu: 0, ihlal: 0, ihlal24: 0, steal: 0, to: 0, foul: 0 };
let mac = 0, takimMac = 0, pozToplam = 0;
/* D1 toplayıcıları */
let sifirSn = 0, sifirPoz = 0, sifirPozIhlalsiz = 0, enUzunSifir = 0, olaySn = 0;
const sifirOrnek = [];

for (let i = 0; i < MAC; i++) {
  const m = ctx.__api.simulateMatch({ homeRoster: ev, awayRoster: dep, homeName: 'A', awayName: 'B', seed: TOHUM + i });
  const es = m.events || [];
  const son = es[es.length - 1] || {};
  const kutu = son.box || (es.slice().reverse().find(e => e.box) || {}).box;
  if (!kutu) continue;
  mac++; takimMac += 2;
  [kutu.h, kutu.a].forEach(b => { if (b) { SAY.to += b.to; SAY.foul += b.foul; } });
  es.forEach(e => { if (SAY[e.type] != null && e.type !== 'to' && e.type !== 'foul') SAY[e.type]++; });
  /* pozisyon (pbpstats tanımı) — kutu-check ile aynı */
  { const P = new Map();
    es.forEach(e => { const d = Number(e.dtPos); if (!(d > 0) || e.pozIx == null) return; if (!P.has(e.pozIx)) P.set(e.pozIx, { off: e.off, q: e.q }); });
    const ks = [...P.keys()].sort((a, b) => a - b); let cur = null, say = 0;
    ks.forEach(k => { const v = P.get(k); if (cur && cur.off === v.off && cur.q === v.q) return; cur = v; say++; });
    pozToplam += say; }
  /* D1 — gösterge simülasyonu (main.js ile aynı karar) */
  let st = { off: null, poz: null, anchor: null, limit: 24 }, clkNow = null, q = 0;
  let sifirBloke = 0, buPozSifir = false, buPozIhlal = false, buPoz = null;
  es.forEach(e => {
    if (e.t === undefined) return;
    const off = (e.off !== undefined) ? !!e.off : (e.shot ? !!e.shot.isHome : (st.off == null ? true : st.off));
    if (e.q !== q) { q = e.q; clkNow = null; }
    const from = (clkNow != null && clkNow >= e.t) ? clkNow : e.t;
    const k = karar(e, off, { off: st.off, poz: st.poz, limit: st.limit });
    if (k.sifirla) { st.off = k.off; st.poz = k.poz; st.anchor = (k.anchor === 'son') ? e.t : ((k.ancMax != null) ? Math.min(from, k.ancMax) : from); st.limit = k.limit; }
    else st.poz = k.poz;
    /* pozisyon damgası değişince önceki pozisyonun 0-durumu kapanır */
    if (e.pozIx != null && e.pozIx !== buPoz) { if (buPozSifir) { sifirPoz++; if (!buPozIhlal) sifirPozIhlalsiz++; } buPoz = e.pozIx; buPozSifir = false; buPozIhlal = false; }
    if (e.type === 'ihlal24') buPozIhlal = true;
    /* [from → e.t] aralığında (maç saati, geriye sayar) gösterge 0 olan saniyeler */
    const sure = Math.max(0, from - e.t); olaySn += sure;
    if (!k.oluTop && st.anchor != null && sure > 0) {
      /* used = anchor − now ≥ limit  ⇔  now ≤ anchor − limit */
      const esik = st.anchor - st.limit;
      const sifirBas = Math.min(from, esik);            /* bu saniyeden itibaren 0 */
      const s0 = Math.max(0, sifirBas - e.t);
      if (s0 > 0) { sifirSn += s0; buPozSifir = true; sifirBloke += s0; if (sifirBloke > enUzunSifir) enUzunSifir = sifirBloke;
        if (sifirOrnek.length < 6 && s0 >= 3) sifirOrnek.push(`maç ${i} ${e.q}P ${Math.floor(e.t / 60)}:${String(Math.round(e.t % 60)).padStart(2, '0')} ${e.type} ${s0.toFixed(1)} sn`); }
      else sifirBloke = 0;
    } else sifirBloke = 0;
    clkNow = e.t;
  });
  if (buPozSifir) { sifirPoz++; if (!buPozIhlal) sifirPozIhlalsiz++; }
}

const H = [];
const tm = k => SAY[k] / Math.max(1, takimMac);
G.kapi(H, 'taç (takım·maç)', tm('tac'), 'kuralOlaylari.tac');
G.kapi(H, 'hücum faulü (takım·maç)', tm('hucumFaulu'), 'kuralOlaylari.hucumFaulu');
G.kapi(H, 'adım / çift sürme (takım·maç)', tm('ihlal'), 'kuralOlaylari.adimCiftSurme');
G.kapi(H, 'şut saati ihlali (takım·maç)', tm('ihlal24'), 'kuralOlaylari.sutSaatiIhlali');
const pozTakim = pozToplam / Math.max(1, mac) / 2;
G.kapi(H, 'top kaybı / pozisyon', tm('to') / Math.max(0.001, pozTakim), 'pozisyonBasina.topKaybi');
G.kapi(H, 'faul / pozisyon', tm('foul') / Math.max(0.001, pozTakim), 'pozisyonBasina.faul');
G.kapi(H, 'çalma olayı (takım·maç)', tm('steal'), 'kuralOlaylari.kotuPas', { bilgi: true });

console.log('');
console.log(`KURAL OLAYLARI — ${mac} maç · ${takimMac} takım-maç · tohum ${TOHUM} · pozisyon/takım ${pozTakim.toFixed(1)}`);
const gecti = G.bas(H, 'KURAL OLAYI SIKLIĞI — gerçek bantlara karşı (FAZ 43 İŞ 3)');
console.log('  bilgi: top kaybı ' + tm('to').toFixed(2) + '/takım·maç · steal-tipi olay ' + tm('steal').toFixed(2) + ' · taç+hücum faulü+adım ' + (tm('tac') + tm('hucumFaulu') + tm('ihlal')).toFixed(2));
console.log('');
console.log('ŞUT SAATİ GÖSTERGESİ (D1) — olay dizisi üzerinde, maç saatiyle');
console.log(`  0'da bekleyen maç saniyesi        ${(sifirSn / Math.max(1, mac)).toFixed(1)} sn/maç   (olay süresi ${(olaySn / Math.max(1, mac)).toFixed(0)} sn/maç → %${(100 * sifirSn / Math.max(1, olaySn)).toFixed(2)})`);
console.log(`  0'a inen pozisyon                 ${(sifirPoz / Math.max(1, mac)).toFixed(2)} /maç · ihlal düdüğü OLMADAN ${(sifirPozIhlalsiz / Math.max(1, mac)).toFixed(2)} /maç`);
console.log(`  en uzun kesintisiz 0              ${enUzunSifir.toFixed(1)} sn`);
if (sifirOrnek.length) console.log('  örnekler: ' + sifirOrnek.join(' | '));
const d1ok = (sifirPozIhlalsiz / Math.max(1, mac)) <= 0.5 && enUzunSifir <= 3;
console.log(d1ok ? '  ✓ gösterge 0\'da takılmıyor (ihlalsiz ≤ 0,5/maç · en uzun ≤ 3 sn)' : '  ✗ gösterge 0\'da takılıyor');
console.log(gecti && d1ok ? '✓ kural olayları gerçek bantlarda' : '✗ kapı düştü');
process.exit(gecti && d1ok ? 0 : 1);
