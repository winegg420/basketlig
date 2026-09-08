#!/usr/bin/env node
/**
 * FAZ 52 — ARENA MODÜL DENGE TESTİ (tarayıcısız).
 *
 * Brif §9 ek maddesi: "bot ve insan takım için 2 sezonluk simülasyon — modül yatırımı
 * yapan takım ile yapmayan arasındaki gelir farkını raporla."
 *
 * NİYET: modül sisteminin ne "tıkla kazan" ne de "işe yaramaz" olduğunu ÖLÇMEK.
 *   · yatırım yapan kulüp yapmayanı geçmeli (yoksa sistem anlamsız),
 *   · ama kasa katlanarak patlamamalı (bakım + azalan verim iş görmeli),
 *   · küçük taraftar kitlesiyle dev arena açan kulüp CEZA görmeli (brif §4.3).
 *
 * Model bilinçli olarak sadedir: maç motoru çalıştırılmaz; haftalık ekonomi akışı
 * (`homeTicketIncome` × ev maçı kadansı + sponsor − haftalık gider) sürülür ve
 * modül yatırımları bütçe elverdikçe önceliğe göre yapılır. Amaç mutlak kasa
 * tahmini değil, İKİ STRATEJİ ARASINDAKİ FARKtır.
 *
 * Kullanım: node tools/arena-denge.js [--sezon=2]
 */
const vm = require('vm');
const { ortamKur } = require('./_lib/eko-ortam');

const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? Number(m.split('=')[1]) : d; };
const SEZON = arg('sezon', 2);
const HAFTA = Math.round(SEZON * 8.6);   /* sezon 2 ay ≈ 8,6 ekonomi haftası */

const ctx = ortamKur({ seed: 42 });
let hata = 0;
const yaz = (ok, s) => { console.log((ok ? '  ✓ ' : '  ✗ ') + s); if (!ok) hata++; };

/* Yatırım önceliği: önce ucuz ve doğrudan gelir getirenler, sonra kapasite/konfor. */
const ONCELIK = ['yiyecek', 'led', 'otopark', 'magaza', 'konfor', 'ekran', 'guvenlik', 'koltuk', 'loca', 'gise'];

function kos(strateji) {
  return vm.runInContext(`(function(){
    const ONCELIK = ${JSON.stringify(ONCELIK)};
    const strateji = ${JSON.stringify(strateji)};
    G.team = { isim:'Denge', tblKey:'tbl', renk:'#fff' };
    G.arena = { s:1, kap:0, bk:0, isim:'Test Arena', mods:null, insaat:null };
    G.coins = START_USD;
    G.ticketPrice = 2;
    G.wins = 9; G.losses = 8; G.careerWins = 9; G.careerLosses = 8;
    G.players = []; G.coaches = []; G.scouts = []; G.ledger = [];
    G.gameDay = 1; G.lastEcoDay = 1;
    arenaSenkron();
    /* Kadro: sabit 13 oyuncu, ortalama OVR 68 — iki strateji için birebir aynı gider. */
    for (let i = 0; i < 13; i++) G.players.push({ id:'p'+i, isim:'O'+i, genel:68, maas: salaryUSDFromGenel(68) });
    const izle = [];
    for (let h = 0; h < ${HAFTA}; h++) {
      /* gelir: ev maçı kadansı × maç geliri + haftalık sponsor */
      const mac = homeTicketIncome();
      const gelir = Math.round(mac * EV_MAC_HAFTA) + sponsorHaftalik();
      const gider = weeklyWageBill().top;
      G.coins += gelir - gider;
      G.careerWins += 1;   /* taraftar kitlesi kariyer galibiyetiyle büyür */
      /* yatırım: strateji izin veriyorsa ve kasa yatırım sonrası 1,5 haftalık gideri koruyorsa */
      if (strateji === 'yatirim') {
        for (const k of ONCELIK) {
          const sv = arenaModSv(k);
          const t = arenaModTanim(k);
          if (!t || sv >= t.sv.length) continue;
          if (arenaOnkosulEngeli(k, sv + 1)) continue;
          const m = t.sv[sv].m;
          if (G.coins - m < gider * 1.5) continue;
          G.coins -= m;
          G.arena.mods[k] = sv + 1;
          arenaSenkron();
          break;   /* haftada en fazla bir inşaat (oyundaki kural) */
        }
      }
      izle.push({ h, kasa: Math.round(G.coins), mac, gelir, gider, kap: G.arena.kap, guc: arenaGucu().puan, bakim: arenaHaftalikBakim() });
    }
    return { izle, son: izle[izle.length-1], dokum: arenaGelirDokumu(), mods: Object.assign({}, G.arena.mods) };
  })()`, ctx);
}

console.log('FAZ 52 — ARENA MODÜL DENGE TESTİ');
console.log('='.repeat(62));
console.log(`${SEZON} sezon · ${HAFTA} ekonomi haftası · aynı kadro, aynı form, tek fark yatırım\n`);

const yok = kos('yok');
const var_ = kos('yatirim');

const bas = (ad, r) => {
  console.log(`── ${ad} ──`);
  console.log(`  arena gücü ${r.son.guc}/50 · kapasite ${r.son.kap} · haftalık bakım $${r.son.bakim}`);
  console.log(`  maç başı gelir $${r.son.mac} · haftalık net $${r.son.gelir - r.son.gider} · kasa $${r.son.kasa}`);
  const d = r.dokum;
  console.log(`  döküm: bilet $${d.bilet} · loca $${d.loca} · yiyecek $${d.yiyecek} · mağaza $${d.magaza} · LED $${d.sponsor} · otopark $${d.otopark}${d.ceza ? ' · ceza -$' + d.ceza : ''}`);
  console.log('');
};
bas('YATIRIM YAPMAYAN', yok);
bas('YATIRIM YAPAN', var_);

const macFark = var_.son.mac - yok.son.mac;
const macOran = var_.son.mac / Math.max(1, yok.son.mac);
const kasaOran = var_.son.kasa / Math.max(1, yok.son.kasa);
console.log('── FARK ──');
console.log(`  maç başı gelir: $${yok.son.mac} → $${var_.son.mac}  (+$${macFark} · ${macOran.toFixed(2)}×)`);
console.log(`  ${SEZON} sezon sonu kasa: $${yok.son.kasa} → $${var_.son.kasa}  (${kasaOran.toFixed(2)}×)`);
console.log(`  alınan modüller: ${Object.keys(var_.mods).filter(k => var_.mods[k] > 1).map(k => k + ' Sv' + var_.mods[k]).join(' · ') || '—'}\n`);

yaz(macFark > 0, `yatırım maç gelirini artırıyor (+$${macFark})`);
yaz(macOran >= 1.10, `artış anlamlı (${macOran.toFixed(2)}× ≥ 1,10×)`);
yaz(macOran <= 3.5, `artış "tıkla kazan" değil (${macOran.toFixed(2)}× ≤ 3,5×)`);
yaz(var_.son.bakim > yok.son.bakim, `yatırım haftalık bakımı da büyütüyor ($${yok.son.bakim} → $${var_.son.bakim})`);
yaz(var_.son.kasa > 0 && yok.son.kasa > 0, 'iki strateji de iflas etmiyor');

/* Brif §4.3: küçük şehirde dev arena iflas ettirmeli. */
const dev = vm.runInContext(`(function(){
  G.team = { isim:'Denge', tblKey:'tbl', renk:'#fff' };
  G.arena = { s:1, kap:0, bk:0, isim:'Dev', mods:{}, insaat:null };
  ARENA_MOD.forEach(m => { G.arena.mods[m.key] = (m.key==='koltuk'||m.key==='guvenlik') ? 5 : 1; });
  G.coins = START_USD; G.ticketPrice = 2;
  G.wins = 3; G.losses = 14; G.careerWins = 3; G.careerLosses = 14;   /* küçük kitle, kötü form */
  G.players = []; for (let i=0;i<13;i++) G.players.push({ id:'p'+i, isim:'O'+i, genel:68, maas: salaryUSDFromGenel(68) });
  G.gameDay = 1; G.lastEcoDay = 1; G.ledger = []; G.coaches=[]; G.scouts=[];
  arenaSenkron();
  const d = arenaGelirDokumu();
  const net = Math.round(homeTicketIncome()*EV_MAC_HAFTA) + sponsorHaftalik() - weeklyWageBill().top;
  return { occ:d.occ, seyirci:d.seyirci, fan:d.taraftar, bakim:arenaHaftalikBakim(), net, gise:arenaGiseKaybi() };
})()`, ctx);
console.log('\n── KÜÇÜK KİTLE + DEV ARENA (brif §4.3) ──');
console.log(`  taraftar ${dev.fan} · seyirci ${dev.seyirci} · doluluk %${(dev.occ*100).toFixed(1)} · gişe kaybı %${(dev.gise*100).toFixed(1)}`);
console.log(`  haftalık bakım $${dev.bakim} · haftalık net $${dev.net}`);
yaz(dev.net < 0, `dev arena küçük kitleyle zarar ettiriyor (haftalık $${dev.net})`);
yaz(dev.seyirci <= dev.fan, 'boş tribün: seyirci taraftar tabanını aşmıyor');

console.log('\n' + '='.repeat(62));
console.log(hata ? `✗ ${hata} denge kapısı düştü` : '✓ arena modül dengesi sağlıklı');
process.exit(hata ? 1 : 0);
