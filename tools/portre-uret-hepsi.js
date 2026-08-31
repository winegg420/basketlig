#!/usr/bin/env node
/* FAZ 17B — HAVUZU HEDEFE TAMAMLAYAN KOŞUCU
 *
 *     node tools/portre-uret-hepsi.js [--hedef=3000] [--dilim=500]
 *
 * Neden ayrı bir koşucu var: portreler tek tek üretiliyor (servis IP başına TEK istek
 * kabul ediyor, ölçülen süre ~43 sn/görsel) ve 3.000'lik havuz tek oturumda bitmiyor.
 * Bu betik:
 *   • kova kotalarına göre hangi kovada kaç eksik olduğunu hesaplar,
 *   • en geride kalan kovadan başlayarak sırayla doldurur (kotalar orantılı ilerler),
 *   • her DİLİM tamamlandığında commit + push eder — kesinti olursa iş kaybolmaz,
 *   • kaldığı yerden devam eder: var olan dosya yeniden indirilmez, YENİDEN NUMARALAMA YOK.
 *
 * Durma koşulları (brif §6): hedefe ulaşmak · art arda çok sayıda başarısız parti
 * (kaynak engelliyor) · --hedef'e varılması. Sonsuz döngü yok.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'portraits');

/* 3.000 üzerinden kova kotaları (brif §6). */
const KOTA = { akd: 1740, siyah: 420, kuz: 240, beyaz: 210, afr: 180, lat: 120, asya: 90 };
const KOVALAR = Object.keys(KOTA);
const BANTLAR = ['genc', 'kidemli'];

const arg = (ad, vars) => {
  const a = process.argv.find(x => x.startsWith('--' + ad + '='));
  const v = a ? parseInt(a.slice(ad.length + 3), 10) : NaN;
  return Number.isFinite(v) ? v : vars;
};
const HEDEF = arg('hedef', 3000);
const DILIM = arg('dilim', 100);
/* Bir kovaya tek çağrıda verilecek en fazla iş — çağrı başına açılış maliyeti
   (Chromium + hash önbelleği) küçük kalsın ama kovalar da sırayla ilerlesin. */
const PARTI = 10;

function say(kova, bant) {
  let n = 0;
  while (fs.existsSync(path.join(OUT, `${kova}_${bant}_${String(n).padStart(4, '0')}.jpg`))) n++;
  return n;
}
const kovaSay = (k) => say(k, 'genc') + say(k, 'kidemli');
const toplamSay = () => KOVALAR.reduce((s, k) => s + kovaSay(k), 0);

/* Hedef ölçekli kota: HEDEF 3.000'den küçükse kotalar orantılı küçülür. */
const olcek = HEDEF / 3000;
const kotaOlcekli = (k) => Math.round(KOTA[k] * olcek);

function enGeriKova() {
  let en = null, enOran = Infinity;
  for (const k of KOVALAR) {
    const hedef = kotaOlcekli(k);
    if (kovaSay(k) >= hedef) continue;
    const oran = kovaSay(k) / Math.max(1, hedef);
    if (oran < enOran) { enOran = oran; en = k; }
  }
  return en;
}

function gitPush(mesaj) {
  try {
    execFileSync('git', ['add', '-A', 'assets/portraits'], { cwd: ROOT, stdio: 'ignore' });
    const st = execFileSync('git', ['status', '--porcelain', '--', 'assets/portraits'], { cwd: ROOT }).toString();
    if (!st.trim()) { console.log('  (commit edilecek değişiklik yok)'); return; }
    execFileSync('git', ['commit', '-q', '-m', mesaj], { cwd: ROOT, stdio: 'ignore' });
    const p = spawnSync('git', ['push', '-q', 'origin', 'master'], { cwd: ROOT });
    console.log(`  ✓ commit + push: ${mesaj}${p.status === 0 ? '' : ' (push başarısız — yerel commit duruyor)'}`);
  } catch (e) { console.log('  ! git adımı atlandı:', e.message.split('\n')[0]); }
}

(function main() {
  const basla = Date.now();
  const baslangic = toplamSay();
  console.log(`FAZ 17B — portre havuzu tamamlama`);
  console.log(`hedef ${HEDEF} · mevcut ${baslangic} · dilim ${DILIM} · parti ${PARTI}`);
  console.log('kotalar: ' + KOVALAR.map(k => `${k} ${kotaOlcekli(k)}`).join(' · '));
  console.log('='.repeat(70));

  let sonDilim = Math.floor(baslangic / DILIM);
  let bosTur = 0;

  while (toplamSay() < HEDEF) {
    const kova = enGeriKova();
    if (!kova) { console.log('tüm kovalar kotasında — bitti.'); break; }
    const eksik = kotaOlcekli(kova) - kovaSay(kova);
    const iste = Math.min(PARTI, eksik, HEDEF - toplamSay());
    const once = toplamSay();

    console.log(`\n→ ${kova}: ${kovaSay(kova)}/${kotaOlcekli(kova)} · bu turda ${iste} isteniyor`);
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'generate-portraits.js'), kova, String(iste)],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    (r.stdout || '').split('\n').filter(l => /^(bitti|elenen|fon |forma |manifest|DURDURULDU)/.test(l))
      .forEach(l => console.log('   ' + l));

    const sonra = toplamSay();
    const gecen = (Date.now() - basla) / 1000;
    const uretilen = sonra - baslangic;
    const hiz = uretilen > 0 ? gecen / uretilen : 0;
    console.log(`   toplam ${sonra}/${HEDEF} · bu oturumda ${uretilen} · ort ${hiz.toFixed(0)} sn/portre` +
      (hiz > 0 ? ` · kalan tahmini ${((HEDEF - sonra) * hiz / 3600).toFixed(1)} sa` : ''));

    if (sonra === once) {
      bosTur++;
      console.log(`   ! bu turda hiç portre yazılamadı (${bosTur}/3)`);
      if (bosTur >= 3) {
        console.log('\nDURDURULDU: art arda 3 tur boş geçti — kaynak engelliyor (brif §6).');
        gitPush(`FAZ 17B: portre havuzu ${sonra} (kaynak engellendi, ara kayit)`);
        return;
      }
    } else bosTur = 0;

    const dilim = Math.floor(sonra / DILIM);
    if (dilim > sonDilim) {
      sonDilim = dilim;
      gitPush(`FAZ 17B: portre havuzu ${sonra}/${HEDEF} (dilim ${dilim * DILIM})`);
    }
  }

  const bitis = toplamSay();
  console.log('\n' + '='.repeat(70));
  console.log(`bitti: ${bitis}/${HEDEF} portre · bu oturumda ${bitis - baslangic} üretildi`);
  KOVALAR.forEach(k => console.log(`  ${k.padEnd(6)} ${String(kovaSay(k)).padStart(4)}/${kotaOlcekli(k)}` +
    ` (genc ${say(k, 'genc')} · kidemli ${say(k, 'kidemli')})`));
  gitPush(`FAZ 17B: portre havuzu ${bitis}/${HEDEF}`);
})();
