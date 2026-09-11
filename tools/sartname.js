/**
 * BASKETBOL ŞARTNAMESİ DENETÇİSİ — tools/sartname.js
 *
 * BASKETBOL-SARTNAMESI.md içindeki 96 kuralı tek koşuda ölçer.
 *
 * Kullanım (headless):
 *   node tools/sartname.js --sn=600 --playoff [--exec=/yol/chromium] [--json=rapor.json]
 *
 * Kullanım (canlı sayfada):
 *   Dosyadaki DENETCI fonksiyonunu konsola yapıştır ve çağır; sonra window.__sn.rapor()
 *
 * TASARIM NOTLARI
 * - setInterval(…,16) kullanılır. requestAnimationFrame ARKA PLAN SEKMESİNDE DONAR
 *   (canlı oturumda ölçüldü: kare sayacı ilerlemiyordu).
 * - Klip kareleri (S._klipTop) gerçek SportVU kaydıdır; top ve şut kuralları
 *   bu karelerde UYGULANMAZ, ayrı raporlanır.
 * - Ölçülemeyen kurallar "ÖLÇÜLEMEDİ" olarak işaretlenir — uydurma sonuç üretilmez.
 */
'use strict';

/* ═══════════════════════ SAYFAYA ENJEKTE EDİLEN DENETÇİ ═══════════════════════ */
const DENETCI = function () {
  const CRT = { x0: 56.4, x1: 883.6, y0: 28.43, y1: 471.57 };
  const RIM_L = [102.6, 250], RIM_R = [837.4, 250];
  const MERKEZ_X = 470, MERKEZ = [470, 250];
  const UCLUK = 209, PXM = 28.87;           /* px / metre */
  const JETON = 26.2;                        /* çizilen jeton çapı */

  const S0 = window.__sn = {
    kare: 0, klipKare: 0, t0: 0, ilk: true,
    say: {},            /* sayaç: ihlal adetleri */
    kp: {},             /* kare payı sayaçları */
    ep: {},             /* epizot: {adet, sn, sonT} */
    ornek: {},          /* ihlal örnekleri */
    sut: [],            /* her şut: {mes, kapali, rol, oyuncu, tip} */
    pas: [],            /* her pas: {sure, mes, kavis, geri, rakibe} */
    hucum: [],          /* her hücum: {pas, sure} */
    hiz: [], hizP: [[], [], [], [], []],
    yorum: [], gorulen: null,
    onceki: null, pasBas: null, hucumPas: 0, hucumT: 0, sonOffSide: null,
    looseT: 0, sahipsizT: 0, raketT: {}, surmeH: [], surmeT: 0,
    olcumYok: {},
  };
  S0.gorulen = new Set();

  const ad = p => p ? (((p.pl && p.pl.isim) || '?').split(' ').pop()) : '-';
  const saat = () => ((document.getElementById('liveTime') || {}).textContent || '').trim();
  const pota = S => S.offSide ? RIM_R : RIM_L;
  const mes = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const raketMi = (x, y, r) => Math.abs(x - r[0]) <= 172 && Math.abs(y - r[1]) <= 74
    && x >= CRT.x0 && x <= CRT.x1 && y >= CRT.y0 && y <= CRT.y1;

  const say = (k, n) => { S0.say[k] = (S0.say[k] || 0) + (n || 1); };
  const kp = (k) => { S0.kp[k] = (S0.kp[k] || 0) + 1; };
  const orn = (k, t) => { (S0.ornek[k] = S0.ornek[k] || []); if (S0.ornek[k].length < 6) S0.ornek[k].push(saat() + ' · ' + t); };
  const epiz = (k, dt) => {
    const n = performance.now(); const e = S0.ep[k] = S0.ep[k] || { adet: 0, sn: 0, sonT: -1e9 };
    if (n - e.sonT > 500) e.adet++; else e.sn += (n - e.sonT) / 1000; e.sonT = n;
  };

  const tik = () => {
    let S, P, b;
    try {
      S = mState && mState._sim; if (!S || !mState.running) return;
      P = S.players; b = S.ball; if (!P || P.length < 10 || !b) return;
    } catch (e) { return; }
    const n = performance.now();
    if (!S0.t0) S0.t0 = n;
    const o = S0.onceki, dt = o ? (n - o.t) / 1000 : 0;
    const hiz = Math.max(0.5, mState.rate || 1);
    const klip = !!S._klipTop;
    const pt = pota(S);
    const off = S.offP || [], def = S.defP || [];
    S0.kare++; if (klip) S0.klipKare++;
    const per = Math.max(1, Math.min(5, mState.quarter || 1));

    /* ───── H6 hava atışı ───── */
    if (S0.ilk) {
      S0.ilk = false;
      const d = mes([b.x, b.y], MERKEZ);
      if (d > 45) { say('H6'); orn('H6', 'top merkezden ' + Math.round(d) + 'px'); }
    }

    /* ───── A · ŞUT SEÇİMİ ───── */
    if (!klip && b.mode === 'held' && b.carrier) {
      const c = b.carrier, dR = mes([c.x, c.y], pt);
      let enYakinSav = 1e9; for (const d2 of def) enYakinSav = Math.min(enYakinSav, mes([c.x, c.y], [d2.x, d2.y]));
      /* A1/A2: pota altı boş */
      if (dR < 60 && enYakinSav > 100) {
        S0.potaAltiBos = S0.potaAltiBos || { t: n, c: c };
        if (n - S0.potaAltiBos.t > 1500) { say('A1'); orn('A1', ad(c) + ' pota altı boş, şut yok'); S0.potaAltiBos = { t: n, c: c }; }
      } else S0.potaAltiBos = null;
      /* A3: üçlükte boş */
      if (dR > UCLUK && enYakinSav > 90) {
        S0.uclukBos = S0.uclukBos || { t: n, c: c };
        if (n - S0.uclukBos.t > 2000) { say('A3'); orn('A3', ad(c) + ' üçlükte boş, şut yok'); S0.uclukBos = { t: n, c: c }; }
      } else S0.uclukBos = null;
    } else { S0.potaAltiBos = null; S0.uclukBos = null; }

    /* şut kaydı: held → shot */
    if (!klip && o && o.bm !== 'shot' && b.mode === 'shot' && o.c) {
      const c = o.c, dR = mes([o.cx, o.cy], pt);
      let ky = 1e9; for (const d2 of def) ky = Math.min(ky, mes([o.cx, o.cy], [d2.x, d2.y]));
      S0.sut.push({ mes: dR, kapali: ky < 35, rol: c.role, oyuncu: ad(c), t: n });
      if (ky < 35) say('A4_kapali');
      /* A2: pota altı boştayken dışarı pas — aşağıda pas bitişinde */
    }
    /* A2 */
    if (!klip && o && o.bm === 'held' && b.mode === 'pass' && o.c) {
      const dR = mes([o.cx, o.cy], pt);
      let ky = 1e9; for (const d2 of def) ky = Math.min(ky, mes([o.cx, o.cy], [d2.x, d2.y]));
      if (dR < 60 && ky > 100 && b.target && b.target.x != null && mes([b.target.x, b.target.y], pt) > UCLUK) {
        say('A2'); orn('A2', ad(o.c) + ' pota altı boşken dışarı pas');
      }
      S0.pasBas = { atan: o.c, takim: o.c.team, x: o.cx, y: o.cy, t: n, h: [] };
    }

    /* ───── B · SAVUNMA ───── */
    if (off.length === 5 && def.length === 5) {
      let eslenen = 0, onde = 0, ustunde = 0, savunmasiz = 0;
      for (const a of off) {
        let m = 1e9, en = null;
        for (const d2 of def) { const dd = mes([a.x, a.y], [d2.x, d2.y]); if (dd < m) { m = dd; en = d2; } }
        if (m <= 90) eslenen++;
        if (m < 20) ustunde++;
        if (m > 150) savunmasiz++;
        if (en) { /* B4: savunmacı adam-pota doğrusunun pota tarafında mı */
          const da = mes([a.x, a.y], pt), dd = mes([en.x, en.y], pt);
          if (dd < da) onde++;
        }
      }
      kp('B1_' + (eslenen === 5 ? 'ok' : 'no'));
      if (eslenen === 5) kp('B1ok');
      if (ustunde) kp('B5');
      if (savunmasiz) { epiz('B7'); }
      kp('B4_' + (onde >= 3 ? 'ok' : 'no')); if (onde >= 3) kp('B4ok');
      /* B2 topu tutanın savunması */
      if (b.carrier && b.carrier.team === (off[0] && off[0].team)) {
        let m = 1e9; for (const d2 of def) m = Math.min(m, mes([b.carrier.x, b.carrier.y], [d2.x, d2.y]));
        (S0.b2 = S0.b2 || []).push(m);
      }
      /* B6 iki savunmacı aynı adamda */
      for (const a of off) { let c2 = 0; for (const d2 of def) if (mes([a.x, a.y], [d2.x, d2.y]) < 60) c2++; if (c2 >= 2) kp('B6'); }
      /* B10 savunma rakip yarıda */
      const sagaHucum = pt[0] > MERKEZ_X;
      let rakipYarida = 0; for (const d2 of def) if (sagaHucum ? d2.x < MERKEZ_X : d2.x > MERKEZ_X) rakipYarida++;
      if (rakipYarida >= 3) kp('B10');
      /* B12 savunmacı çakışması */
      for (let i = 0; i < def.length; i++) for (let j = i + 1; j < def.length; j++)
        if (mes([def[i].x, def[i].y], [def[j].x, def[j].y]) < JETON) { kp('B12'); i = def.length; break; }
      /* B3 savunma geri döndü mü */
      let kendiYarida = 0; for (const d2 of def) if (sagaHucum ? d2.x > MERKEZ_X : d2.x < MERKEZ_X) kendiYarida++;
      if (kendiYarida === 5) kp('B3ok');
      kp('B3tum');
    }

    /* ───── C · DİZİLİM ───── */
    if (off.length === 5) {
      const dler = off.map(p => mes([p.x, p.y], pt));
      const enUzak = Math.max.apply(null, dler);
      if (enUzak < UCLUK) kp('C1');
      let raket = 0; for (const p of off) if (raketMi(p.x, p.y, pt)) raket++;
      if (raket >= 3) kp('C2');
      let cak = false;
      for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++)
        if (mes([off[i].x, off[i].y], [off[j].x, off[j].y]) < 30) cak = true;
      if (cak) kp('C3');
      /* C4 en yakın komşu ortalaması */
      let top = 0; for (let i = 0; i < 5; i++) { let m = 1e9; for (let j = 0; j < 5; j++) if (i !== j) m = Math.min(m, mes([off[i].x, off[i].y], [off[j].x, off[j].y])); top += m; }
      (S0.c4 = S0.c4 || []).push(top / 5);
      const ys = off.map(p => p.y), xs = off.map(p => p.x);
      (S0.c6 = S0.c6 || []).push(Math.max.apply(null, ys) - Math.min.apply(null, ys));
      (S0.c7 = S0.c7 || []).push(Math.max.apply(null, xs) - Math.min.apply(null, xs));
      let kose = 0; for (const p of off) if ((p.y < 100 || p.y > 400) && mes([p.x, p.y], pt) < 230) kose++;
      if (kose >= 1) kp('C8ok'); kp('C8tum');
      const piv = off.filter(p => p.role === 4); if (piv.length) (S0.c10 = S0.c10 || []).push(mes([piv[0].x, piv[0].y], pt));
      const pg = off.filter(p => p.role === 0); if (pg.length) (S0.c11 = S0.c11 || []).push(mes([pg[0].x, pg[0].y], [b.x, b.y]));
      /* C9 kesme */
      if (o && o.off5) for (let i = 0; i < 5; i++) {
        if (!o.off5[i]) continue;
        const eskiD = mes(o.off5[i], pt), yeniD = dler[i];
        if (eskiD - yeniD > 80 && n - o.t < 1100) say('C9_kesme');
      }
    }
    /* C5 orta saha yığılması */
    let orta = 0; for (const p of P) if (Math.abs(p.x - MERKEZ_X) < 120) orta++;
    if (orta >= 6) kp('C5');

    /* ───── D · TOP / PAS ───── */
    if (S0.pasBas) S0.pasBas.h.push(b.h || 0);
    if (o && o.bm === 'pass' && b.mode === 'held' && b.carrier && S0.pasBas) {
      const pb = S0.pasBas, alan = b.carrier;
      const sure = (n - pb.t) / 1000 / hiz, uzun = mes([pb.x, pb.y], [alan.x, alan.y]);
      const kavis = pb.h.length ? (Math.max.apply(null, pb.h) - Math.min.apply(null, pb.h)) : 0;
      const sagaHucum = pt[0] > MERKEZ_X;
      const cikisOn = sagaHucum ? pb.x > MERKEZ_X : pb.x < MERKEZ_X;
      const varisGeri = sagaHucum ? alan.x < MERKEZ_X : alan.x > MERKEZ_X;
      const rakibe = alan.team !== pb.takim;
      S0.pas.push({ sure: sure, mes: uzun, kavis: kavis });
      if (rakibe) { say('D1'); orn('D1', ad(pb.atan) + ' → ' + ad(alan) + ' (rakip)'); }
      if (!rakibe && cikisOn && varisGeri) { say('D2'); orn('D2', ad(pb.atan) + ' → ' + ad(alan)); }
      if (sure < 0.25) { say('D3'); orn('D3', Math.round(sure * 1000) + 'ms'); }
      if (kavis < 0.5) say('D4_duz');
      if (!rakibe) S0.hucumPas++;
      S0.pasBas = null;
    }
    if (S0.pasBas && n - S0.pasBas.t > 5000) S0.pasBas = null;
    /* D5 top kopuk */
    if (!klip && b.mode === 'held' && b.carrier && mes([b.x, b.y], [b.carrier.x, b.carrier.y]) > 30) kp('D5');
    /* D6 ışınlanma */
    if (o && n - o.t < 200 && o.bm === b.mode && mes([b.x, b.y], [o.bx, o.by]) > 40) { say('D6'); orn('D6', Math.round(mes([b.x, b.y], [o.bx, o.by])) + 'px'); }
    /* D7 sürme */
    if (!klip && b.mode === 'held' && b.carrier && o && o.c === b.carrier) {
      const v = mes([b.carrier.x, b.carrier.y], [o.cx, o.cy]) / Math.max(dt, 0.001) / hiz;
      S0.surmeH.push(b.h || 0); if (S0.surmeH.length > 25) S0.surmeH.shift();
      if (v > 60) {
        S0.surmeT += dt;
        if (S0.surmeT > 0.7 && S0.surmeH.length > 12) {
          const mn = Math.min.apply(null, S0.surmeH), mx = Math.max.apply(null, S0.surmeH);
          if (mx - mn < 1.5) { say('D7'); orn('D7', Math.round(v) + 'px/sn, top sabit'); }
          S0.surmeT = 0;
        }
      } else S0.surmeT = 0;
    } else { S0.surmeT = 0; S0.surmeH = []; }
    /* D8 / D9 sahipsiz top */
    if (b.mode === 'loose' || b.mode === 'dead') {
      S0.looseT += dt;
      let m = 1e9; for (const p of P) m = Math.min(m, mes([b.x, b.y], [p.x, p.y]));
      const dp = Math.min(mes([b.x, b.y], RIM_L), mes([b.x, b.y], RIM_R));
      if (dp < 130 && m > 50) { S0.sahipsizT += dt; if (S0.sahipsizT > 0.5) { epiz('D9'); orn('D9', 'en yakın ' + Math.round(m) + 'px'); S0.sahipsizT = 0; } }
      else S0.sahipsizT = 0;
    } else {
      if (S0.looseT > 2) { say('D8'); orn('D8', S0.looseT.toFixed(1) + ' sn'); }
      S0.looseT = 0; S0.sahipsizT = 0;
    }

    /* ───── E · KURAL ───── */
    for (const p of P) {
      if (p._oob) continue;
      if (p.x < CRT.x0 || p.x > CRT.x1 || p.y < CRT.y0 || p.y > CRT.y1) { epiz('E9'); orn('E9', ad(p) + ' (' + Math.round(p.x) + ',' + Math.round(p.y) + ')'); }
    }
    /* E3 üç saniye */
    for (const p of off) {
      const k = p.team + p.role;
      if (raketMi(p.x, p.y, pt)) { S0.raketT[k] = (S0.raketT[k] || 0) + dt; if (S0.raketT[k] > 3) { say('E3'); orn('E3', ad(p) + ' rakette ' + S0.raketT[k].toFixed(1) + ' sn'); S0.raketT[k] = 0; } }
      else S0.raketT[k] = 0;
    }

    /* ───── F · RİBAUNT ───── */
    if (!klip && (b.mode === 'shot' || b.mode === 'rim')) {
      let yakin = 0; for (const p of P) if (mes([p.x, p.y], pt) < 120) yakin++;
      if (yakin < 3) { epiz('F1'); orn('F1', yakin + ' oyuncu pota çevresinde'); }
      /* B9 blokaj */
      if (off.length === 5 && def.length === 5) {
        let blok = 0;
        for (const a of off) { let m = 1e9, en = null; for (const d2 of def) { const dd = mes([a.x, a.y], [d2.x, d2.y]); if (dd < m) { m = dd; en = d2; } } if (en && mes([en.x, en.y], pt) < mes([a.x, a.y], pt)) blok++; }
        kp(blok >= 3 ? 'B9ok' : 'B9no'); kp('B9tum');
      }
    }

    /* ───── J · FİZİK ───── */
    if (o && o.p && n - o.t < 200) {
      for (let i = 0; i < P.length; i++) {
        if (!o.p[i]) continue;
        const d = mes([P[i].x, P[i].y], o.p[i]);
        const v = d / Math.max(dt, 0.001) / hiz;
        if (d > 30 * hiz) { say('J2'); orn('J2', ad(P[i]) + ' ' + Math.round(d) + 'px'); }
        if (v > 430) { say('J1'); orn('J1', ad(P[i]) + ' ' + Math.round(v) + 'px/sn'); }
        S0.hizP[per - 1].push(v);
      }
    }
    /* J4 oyuncular iç içe */
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      if (P[i]._klip || P[j]._klip) continue;
      const d = mes([P[i].x, P[i].y], [P[j].x, P[j].y]);
      if (d < 17) { kp('J4'); i = P.length; break; }
    }
    /* K7 jeton çakışması */
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++)
      if (mes([P[i].x, P[i].y], [P[j].x, P[j].y]) < JETON) { kp('K7'); i = P.length; break; }

    /* ───── H · TAÇ ───── */
    const sk = mState.score[0] + mState.score[1];
    if (S0.skorOnce != null && sk > S0.skorOnce) S0.tacBekle = { t: n, pt: pt };
    S0.skorOnce = sk;
    if (S0.tacBekle) {
      const ib = P.find(p => p._oob);
      if (ib) { const dx = Math.abs(ib.x - S0.tacBekle.pt[0]); if (dx > 100) { say('H1'); orn('H1', 'dip çizgiden ' + Math.round(dx) + 'px'); } S0.tacBekle = null; }
      else if (n - S0.tacBekle.t > 5000) S0.tacBekle = null;
    }

    /* ───── K · YORUM ───── */
    try {
      const c = document.getElementById('commentary');
      if (c) for (const el of Array.prototype.slice.call(c.children, 0, 3)) {
        const t = el.textContent.replace(/\s+/g, ' ').trim();
        if (!t || S0.gorulen.has(t)) continue;
        S0.gorulen.add(t); S0.yorum.push({ t: t, saat: saat(), n: n });
        const g = t.replace(/^\d+P\s*\d+:\d\d\s*/, '');
        const soyadlar = P.map(p => ad(p));
        const dS = b.carrier ? mes([b.carrier.x, b.carrier.y], pt) : null;
        if (/turnike|smaç|smac|çembere yüksel|çemberin altından|kanca/i.test(g) && dS != null && dS > 200) { say('K2'); orn('K2', Math.round(dS) + 'px · ' + g.slice(0, 40)); }
        const sm = g.match(/\((\d+)\s*-\s*(\d+)\)/);
        if (sm) { const gs = mState.score; if (Math.abs((+sm[1] + +sm[2]) - (gs[0] + gs[1])) > 2) { say('K3'); orn('K3', 'metin(' + sm[1] + '-' + sm[2] + ') gerçek(' + gs[0] + '-' + gs[1] + ')'); } }
        const rb = g.match(/ribaund\s+([A-ZÇĞİÖŞÜ][a-zçğıöşü'’ř-]+)/i);
        if (rb && b.carrier && soyadlar.indexOf(rb[1]) >= 0 && rb[1] !== ad(b.carrier)) { say('F7'); orn('F7', 'metin ' + rb[1] + ' · top ' + ad(b.carrier)); }
        if (/hızlı hücum/i.test(g)) { let v = false; for (const p of off) if (mes([p.x, p.y], pt) < 250) v = true; if (!v) { say('G1'); orn('G1', g.slice(0, 40)); } }
        /* K6 etiket kırpması */
        if (/…|\.\.\./.test(g)) { /* yorum metninde değil, etikette bakılır — aşağıda */ }
      }
      /* K5 anlatım sessizliği */
      if (S0.yorum.length >= 2) {
        const a1 = S0.yorum[S0.yorum.length - 1], a2 = S0.yorum[S0.yorum.length - 2];
        const fark = (a1.n - a2.n) / 1000 / hiz;
        if (fark > 12) { say('K5'); orn('K5', fark.toFixed(1) + ' sn sessizlik'); }
      }
      /* K6 etiketler */
      if (S0.kare % 20 === 0) {
        const etl = Array.prototype.slice.call(document.querySelectorAll('.tok-name')).filter(e => e.getClientRects().length);
        const kut = etl.map(e => ({ r: e.getBoundingClientRect(), s: (e.textContent || '').trim() }));
        let ihl = false;
        for (const k of kut) if (/…|\.\.\.$/.test(k.s)) ihl = true;
        for (let i = 0; i < kut.length; i++) for (let j = i + 1; j < kut.length; j++) {
          const A = kut[i].r, B = kut[j].r;
          if (A.right > B.left && B.right > A.left && A.bottom > B.top && B.bottom > A.top) ihl = true;
        }
        kp('K6tum'); if (ihl) kp('K6');
      }
      /* K8 hakemler */
      const H = S.hakem || [];
      for (let i = 0; i < H.length; i++) {
        const h = H[i]; if (!h || h.x == null) continue;
        if (h.x < CRT.x0 - 45 || h.x > CRT.x1 + 45 || h.y < CRT.y0 - 45 || h.y > CRT.y1 + 45) { kp('K8'); }
        else if (raketMi(h.x, h.y, RIM_L) || raketMi(h.x, h.y, RIM_R)) kp('K8');
      }
    } catch (e) { }

    /* hücum sayacı */
    if (S0.sonOffSide !== null && S0.sonOffSide !== S.offSide) {
      S0.hucum.push({ pas: S0.hucumPas, sure: (n - S0.hucumT) / 1000 / hiz });
      S0.hucumPas = 0; S0.hucumT = n;
    }
    if (S0.hucumT === 0) S0.hucumT = n;
    S0.sonOffSide = S.offSide;

    S0.onceki = {
      t: n, bx: b.x, by: b.y, bm: b.mode, c: b.carrier,
      cx: b.carrier ? b.carrier.x : 0, cy: b.carrier ? b.carrier.y : 0,
      p: P.map(p => [p.x, p.y]), off5: off.length === 5 ? off.map(p => [p.x, p.y]) : null,
    };
  };

  S0.durdur = () => clearInterval(S0.timer);
  S0.timer = setInterval(tik, 16);

  /* ───────────────── RAPOR ───────────────── */
  S0.rapor = function () {
    const K = S0.kare || 1;
    const yuz = (k, t) => +(100 * (S0.kp[k] || 0) / (t || K)).toFixed(1);
    const ort = a => (a && a.length) ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : null;
    const R = [];
    const ek = (id, ad2, deger, gecti) => R.push({ id: id, ad: ad2, deger: deger, gecti: gecti, ornek: (S0.ornek[id] || []).slice(0, 3) });
    const YOK = (id, ad2, sebep) => R.push({ id: id, ad: ad2, deger: 'ÖLÇÜLEMEDİ — ' + sebep, gecti: null, ornek: [] });

    const sut = S0.sut, pas = S0.pas;
    const sutN = sut.length || 1;

    /* A */
    ek('A1', 'Pota altı boş oyuncu şut atar', (S0.say.A1 || 0) + ' ihlal', (S0.say.A1 || 0) <= 2);
    ek('A2', 'Pota altı boş oyuncu dışarı pas atmaz', (S0.say.A2 || 0) + ' ihlal', (S0.say.A2 || 0) === 0);
    ek('A3', 'Üçlükte boş oyuncu atar', (S0.say.A3 || 0) + ' ihlal', (S0.say.A3 || 0) <= 3);
    ek('A4', 'Kapalı şut atılmaz', yuz('x', 1) === 0 ? (+(100 * (S0.say.A4_kapali || 0) / sutN).toFixed(1)) + '%' : '', (100 * (S0.say.A4_kapali || 0) / sutN) <= 15);
    YOK('A5', 'Şut saati baskısında şut', 'şut saati durumu okunamıyor');
    ek('A6', 'Turnike/smaç mesafesi ≤100px', (S0.say.K2 || 0) + ' uyuşmazlık (K2 ile aynı)', (S0.say.K2 || 0) === 0);
    YOK('A7', 'Üçlük şut mesafesi ≥195px', 'şut tipi etiketi state\'te yok');
    YOK('A8', 'Orta mesafe şut', 'şut tipi etiketi state\'te yok');
    ek('A9', 'Şut mesafesi dağılımı', 'pota altı %' + (100 * sut.filter(s => s.mes <= 100).length / sutN).toFixed(0) + ' · üçlük %' + (100 * sut.filter(s => s.mes >= UCLUK).length / sutN).toFixed(0),
      (sut.filter(s => s.mes <= 100).length / sutN) >= 0.25 && (sut.filter(s => s.mes >= UCLUK).length / sutN) >= 0.25);
    const uc = sut.filter(s => s.mes >= UCLUK);
    ek('A10', 'Pivot üçlük yağdırmaz', uc.length ? '%' + (100 * uc.filter(s => s.rol >= 3).length / uc.length).toFixed(0) : 'şut yok', uc.length ? (uc.filter(s => s.rol >= 3).length / uc.length) <= 0.25 : true);
    const gd = sut.filter(s => s.rol <= 1);
    ek('A11', 'Guard pota altına girer', gd.length ? '%' + (100 * gd.filter(s => s.mes <= 100).length / gd.length).toFixed(0) : 'şut yok', gd.length ? (gd.filter(s => s.mes <= 100).length / gd.length) >= 0.10 : true);
    YOK('A12', 'Şut tekeli', 'hücum sınırları güvenilir ayrılamıyor');

    /* B */
    ek('B1', 'Adam eşlemesi kurulur', yuz('B1ok') + '%', yuz('B1ok') >= 70);
    ek('B2', 'Topu tutan savunulur', (ort(S0.b2) || 0) + 'px ortalama', (ort(S0.b2) || 999) <= 60);
    ek('B3', 'Savunma geri döner', (S0.kp.B3tum ? (100 * (S0.kp.B3ok || 0) / S0.kp.B3tum).toFixed(1) : '0') + '%', S0.kp.B3tum ? (100 * (S0.kp.B3ok || 0) / S0.kp.B3tum) >= 85 : false);
    ek('B4', 'Savunmacı pota tarafında', yuz('B4ok') + '%', yuz('B4ok') >= 65);
    ek('B5', 'Savunmacı adamın üstüne oturmaz', yuz('B5') + '%', yuz('B5') <= 3);
    ek('B6', 'İki savunmacı aynı adamı tutmaz', yuz('B6') + '%', yuz('B6') <= 10);
    ek('B7', 'Hücumcu savunmasız kalmaz', (S0.ep.B7 ? S0.ep.B7.adet : 0) + ' epizot', (S0.ep.B7 ? S0.ep.B7.adet : 0) <= 5);
    YOK('B8', 'Yardım savunması', 'yardım olayı state\'te işaretlenmiyor');
    ek('B9', 'Ribaunt blokajı', (S0.kp.B9tum ? (100 * (S0.kp.B9ok || 0) / S0.kp.B9tum).toFixed(0) : '0') + '%', S0.kp.B9tum ? (100 * (S0.kp.B9ok || 0) / S0.kp.B9tum) >= 50 : false);
    ek('B10', 'Savunma rakip yarıya geçmez', yuz('B10') + '%', yuz('B10') <= 10);
    YOK('B11', 'Pres tutarlılığı', 'pres durumu state\'te yok');
    ek('B12', 'Savunmacılar çakışmaz', yuz('B12') + '%', yuz('B12') <= 3);
    YOK('B13', 'Top çalma mesafesi', 'steal olayı state\'te işaretlenmiyor');
    YOK('B14', 'Blok mesafesi', 'blok olayı state\'te işaretlenmiyor');

    /* C */
    ek('C1', 'Perimetre boş kalmaz', yuz('C1') + '%', yuz('C1') <= 3);
    ek('C2', 'Raket tıkanmaz', yuz('C2') + '%', yuz('C2') <= 8);
    ek('C3', 'İki hücumcu aynı slotta durmaz', yuz('C3') + '%', yuz('C3') <= 2);
    ek('C4', 'Hücumcular arası mesafe', (ort(S0.c4) || 0) + 'px', (ort(S0.c4) || 0) >= 70);
    ek('C5', 'Orta sahada yığılma olmaz', yuz('C5') + '%', yuz('C5') <= 4);
    ek('C6', 'Saha genişliği kullanılır', (ort(S0.c6) || 0) + 'px', (ort(S0.c6) || 0) >= 220);
    ek('C7', 'Saha derinliği kullanılır', (ort(S0.c7) || 0) + 'px', (ort(S0.c7) || 0) >= 200);
    ek('C8', 'Köşeler kullanılır', (S0.kp.C8tum ? (100 * (S0.kp.C8ok || 0) / S0.kp.C8tum).toFixed(0) : '0') + '%', S0.kp.C8tum ? (100 * (S0.kp.C8ok || 0) / S0.kp.C8tum) >= 20 : false);
    ek('C9', 'Kesme hareketi olur', (S0.say.C9_kesme || 0) + ' kez', (S0.say.C9_kesme || 0) >= 8);
    ek('C10', 'Pivot dip bölgede', (ort(S0.c10) || 0) + 'px', (ort(S0.c10) || 999) <= 160);
    ek('C11', 'Kurucu top çevresinde', (ort(S0.c11) || 0) + 'px', (ort(S0.c11) || 999) <= 200);
    YOK('C12', 'Taç sonrası dizilim', 'taç bitiş anı güvenilir yakalanamıyor');

    /* D */
    ek('D1', 'Rakibe pas atılmaz', (S0.say.D1 || 0) + ' olay', (S0.say.D1 || 0) === 0);
    ek('D2', 'Geri saha pası atılmaz', (S0.say.D2 || 0) + ' olay', (S0.say.D2 || 0) === 0);
    ek('D3', 'Pas uçuş süresi ≥0,25sn', (S0.say.D3 || 0) + ' ihlal', (S0.say.D3 || 0) <= 3);
    ek('D4', 'Pas kavisi var', pas.length ? '%' + (100 * (S0.say.D4_duz || 0) / pas.length).toFixed(0) + ' düz' : 'pas yok', pas.length ? (100 * (S0.say.D4_duz || 0) / pas.length) <= 10 : true);
    ek('D5', 'Top taşıyıcıdan kopmaz', yuz('D5') + '%', yuz('D5') <= 1);
    ek('D6', 'Top ışınlanmaz', (S0.say.D6 || 0) + ' olay', (S0.say.D6 || 0) <= 5);
    ek('D7', 'Sürme yapılır', (S0.say.D7 || 0) + ' ihlal', (S0.say.D7 || 0) <= 5);
    ek('D8', 'Top 2sn+ sahipsiz kalmaz', (S0.say.D8 || 0) + ' epizot', (S0.say.D8 || 0) === 0);
    ek('D9', 'Pota dibinde sahipsiz top', (S0.ep.D9 ? S0.ep.D9.adet : 0) + ' epizot', (S0.ep.D9 ? S0.ep.D9.adet : 0) <= 10);
    ek('D10', 'Top çevirme olur', S0.hucum.length ? '%' + (100 * S0.hucum.filter(h => h.pas >= 2).length / S0.hucum.length).toFixed(0) : 'hücum yok', S0.hucum.length ? (S0.hucum.filter(h => h.pas >= 2).length / S0.hucum.length) >= 0.5 : false);
    YOK('D11', 'Asist–sayı oranı', 'asist sayacı state\'te yok');

    /* E */
    YOK('E1', '24 saniye kuralı', 'şut saati state\'te yok');
    YOK('E2', '8 saniye kuralı', 'ön saha geçiş süresi izlenmiyor');
    ek('E3', '3 saniye kuralı', (S0.say.E3 || 0) + ' ihlal', (S0.say.E3 || 0) <= 5);
    ek('E4', 'Geri saha ihlali uygulanır', (S0.say.D2 || 0) + ' pas düdüksüz geçti', (S0.say.D2 || 0) === 0);
    YOK('E5', 'Adım (traveling)', 'sürme kesintisi state\'te yok');
    YOK('E6', 'Çift sürme tutarlılığı', 'sürme durumu state\'te yok');
    YOK('E7', '5 faul → oyun dışı', 'faul sayacı oyuncu state\'inde yok');
    YOK('E8', 'Takım faulü → serbest atış', 'takım faul sayacı yok');
    ek('E9', 'Saha dışı oyuncu olmaz', (S0.ep.E9 ? S0.ep.E9.adet : 0) + ' epizot', (S0.ep.E9 ? S0.ep.E9.adet : 0) <= 5);
    YOK('E10', 'Top saha dışı → taç', 'taç tetikleyicisi izlenmiyor');

    /* F */
    ek('F1', 'Şut anında pota çevresi dolu', (S0.ep.F1 ? S0.ep.F1.adet : 0) + ' epizot', (S0.ep.F1 ? S0.ep.F1.adet : 0) <= 5);
    YOK('F2', 'Ribaunt mesafeden alınır', 'ribaunt olayı state\'te işaretlenmiyor');
    YOK('F3', 'Uzunlar ribaunt alır', 'ribaunt sahibi state\'te yok');
    YOK('F4', 'Hücum/savunma ribaunt oranı', 'ribaunt tipi state\'te yok');
    YOK('F5', 'Ribaunt sonrası geçiş', 'ribaunt anı yakalanamıyor');
    YOK('F6', 'Ribaunt sayısı gerçekçi', 'kutu skor okunmalı — ayrı iş');
    ek('F7', 'Yorumdaki ribaunt sahibi doğru', (S0.say.F7 || 0) + ' uyuşmazlık', (S0.say.F7 || 0) === 0);

    /* G */
    ek('G1', 'Hızlı hücumda önde koşan var', (S0.say.G1 || 0) + ' uyuşmazlık', (S0.say.G1 || 0) === 0);
    ek('G2', 'Hücum süresi gerçekçi', S0.hucum.length ? (ort(S0.hucum.map(h => h.sure)) + ' sn') : 'yok', S0.hucum.length ? (ort(S0.hucum.map(h => h.sure)) >= 3 && ort(S0.hucum.map(h => h.sure)) <= 9) : false);
    YOK('G3', 'Geçişte savunma geri koşar', 'geçiş fazı ayrı izlenmiyor');
    YOK('G4', 'Sayı sonrası geçiş yavaşlar', 'hücum sınırları güvenilir değil');
    YOK('G5', 'Hızlı hücum sayısı', 'hızlı hücum etiketi state\'te yok');
    YOK('G6', 'Geçişte top önde', 'geçiş fazı ayrı izlenmiyor');

    /* H */
    ek('H1', 'Sayı sonrası taç dip çizgiden', (S0.say.H1 || 0) + ' ihlal', (S0.say.H1 || 0) === 0);
    YOK('H2', 'Yan çizgi tacı', 'taç tipi state\'te yok');
    YOK('H3', 'Sokan oyuncu saha dışında', 'ayrı ölçüm gerekli');
    YOK('H4', 'Taç 5 saniyede tamamlanır', 'taç süresi izlenmiyor');
    YOK('H5', 'Taç sonrası dizilim', 'C12 ile aynı — ölçülemedi');
    ek('H6', 'Hava atışı orta yuvarlakta', (S0.say.H6 || 0) + ' ihlal', (S0.say.H6 || 0) === 0);

    /* I */
    YOK('I1', 'Atıcı serbest atış çizgisinde', 'serbest atış fazı state\'te yok');
    YOK('I2', 'Diğerleri raket kenarında', 'serbest atış fazı yok');
    YOK('I3', 'Atış öncesi raket boş', 'serbest atış fazı yok');
    YOK('I4', 'Serbest atış yüzdesi', 'kutu skor okunmalı — ayrı iş');
    YOK('I5', 'Faul–atış eşleşmesi', 'faul state\'i yok');

    /* J */
    ek('J1', 'Oyuncu hızı insani', (S0.say.J1 || 0) + ' ihlal', (S0.say.J1 || 0) <= 5);
    ek('J2', 'Oyuncu ışınlanmaz', (S0.say.J2 || 0) + ' ihlal', (S0.say.J2 || 0) <= 5);
    YOK('J3', 'İvmelenme gerçekçi', 'ayrı ölçüm gerekli');
    ek('J4', 'Oyuncular iç içe geçmez', yuz('J4') + '%', yuz('J4') <= 1);
    const h1 = ort(S0.hizP[0]), h4 = ort(S0.hizP[3]);
    ek('J5', 'Yorulma hıza yansır', (h1 && h4) ? (h4 / h1).toFixed(2) : 'veri yok', (h1 && h4) ? (h4 / h1 >= 0.80 && h4 / h1 <= 0.97) : null);

    /* K */
    YOK('K1', 'Yorumdaki isim sahada', 'ayrıştırma gürültülü — güvenilir değil');
    ek('K2', 'Yorumdaki şut tipi mesafeye uyar', (S0.say.K2 || 0) + ' ihlal', (S0.say.K2 || 0) === 0);
    ek('K3', 'Yorumdaki skor doğru', (S0.say.K3 || 0) + ' ihlal', (S0.say.K3 || 0) === 0);
    YOK('K4', 'Yorum gecikmesi', 'yorum saati ile sahne saati eşlenemedi');
    ek('K5', 'Anlatım susmaz', (S0.say.K5 || 0) + ' ihlal', (S0.say.K5 || 0) === 0);
    ek('K6', 'Etiketler okunur', (S0.kp.K6tum ? (100 * (S0.kp.K6 || 0) / S0.kp.K6tum).toFixed(1) : '0') + '%', S0.kp.K6tum ? (100 * (S0.kp.K6 || 0) / S0.kp.K6tum) <= 2 : null);
    ek('K7', 'Jetonlar tek jeton gibi görünmez', yuz('K7') + '%', yuz('K7') <= 3);
    ek('K8', 'Hakemler saha kenarında', yuz('K8') + '%', yuz('K8') <= 1);

    const dusen = R.filter(r => r.gecti === false);
    const olcYok = R.filter(r => r.gecti === null);
    return {
      kare: S0.kare, klipPayi: +(100 * S0.klipKare / K).toFixed(1),
      sut: sut.length, pas: pas.length, hucum: S0.hucum.length, yorum: S0.yorum.length,
      toplam: R.length, gecen: R.filter(r => r.gecti === true).length,
      dusen: dusen.length, olculemedi: olcYok.length,
      kurallar: R,
    };
  };
  return 'SARTNAME DENETCISI CALISIYOR';
};

/* ═══════════════════════ HEADLESS KOŞUCU ═══════════════════════ */
if (typeof module !== 'undefined' && require.main === module) {
  const path = require('path'), fs = require('fs'), http = require('http');
  const { chromium } = require('playwright');
  const args = process.argv.slice(2);
  const met = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
  const SN = +met('sn', 600), EXEC = met('exec', null), JSONP = met('json', path.join(__dirname, 'sartname-rapor.json'));
  const PLAYOFF = args.includes('--playoff');
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  const uyu = ms => new Promise(r => setTimeout(r, ms));

  (async () => {
    const kok = path.join(__dirname, '..');
    const srv = http.createServer((q, r) => {
      try {
        const u = decodeURIComponent((q.url || '/').split('?')[0]);
        const f = path.join(kok, u === '/' ? '/index.html' : u);
        if (!f.startsWith(kok) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
        r.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
        r.end(fs.readFileSync(f));
      } catch (e) { r.writeHead(500); r.end(); }
    });
    await new Promise(z => srv.listen(0, '127.0.0.1', z));
    const taban = 'http://127.0.0.1:' + srv.address().port;
    const ac = { headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--use-gl=swiftshader'] };
    if (EXEC) ac.executablePath = EXEC; else ac.channel = 'chrome';
    const b = await chromium.launch(ac);
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    const konsol = [];
    p.on('pageerror', e => konsol.push(e.message));
    await p.goto(taban + '/charazay2.0.html', { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#loginPage', { state: 'visible', timeout: 15000 });
    await p.click('#loginPage button.btn-p');
    await p.waitForSelector('#setupPage', { state: 'visible', timeout: 8000 });
    await p.fill('#teamName', 'Sartname FK');
    await p.click('#setupPage button.btn-p');
    await p.waitForSelector('#app', { state: 'visible', timeout: 8000 });
    await p.evaluate(() => { try { showPage('mac'); } catch (e) { } });
    await uyu(500);
    await p.evaluate('(' + DENETCI.toString() + ')()');

    if (PLAYOFF) {
      const r = await p.evaluate(() => {
        try {
          const S = G.season;
          if (S && S.active) {
            let g = 0;
            while (S.matches.some(m => !m.played) && g++ < 400) {
              const tur = Math.min.apply(null, S.matches.filter(m => !m.played).map(m => m.round));
              if (typeof simulateRoundCpuMatches === 'function') simulateRoundCpuMatches(tur);
              S.matches.filter(m => m.round === tur && !m.played).forEach(m => {
                const w = (typeof playoffPickWinner === 'function') ? playoffPickWinner(m.home, m.away) : null;
                m.hs = w ? w.hs : 90; m.as = w ? w.as : 85; m.played = true;
              });
            }
            S.active = false;
          }
          const rows = buildLeagueRows(G.team.tblKey || 'tbl').filter(x => x && !x.bos && x.isim);
          const rk = (rows.find(x => x.isim !== G.team.isim) || {}).isim;
          const seri = (typeof makeSeries === 'function') ? makeSeries(rk, G.team.isim, 2, 5)
            : { home: rk, away: G.team.isim, homeSeed: 2, awaySeed: 5, wins: [0, 0], games: [], done: false, winner: null };
          G.playoff = { active: true, year: (S && S.year) || 1, teams: [rk, G.team.isim], round: 0, rounds: [[seri]], champion: null, finalStats: {}, mvp: null };
          startPlayoffMatch();
          return 'playoff: ' + rk + ' vs ' + G.team.isim + ' · running=' + mState.running;
        } catch (e) { return 'HATA: ' + e.message; }
      });
      process.stdout.write('[kurulum] ' + r + '\n');
    } else {
      await p.evaluate(() => { try { startMatch(); } catch (e) { } });
    }

    process.stdout.write('Taranıyor ' + SN + ' sn ');
    const bit = Date.now() + SN * 1000;
    while (Date.now() < bit) {
      await uyu(5000);
      const c = await p.evaluate(() => { try { return { k: window.__sn.kare, r: mState.running }; } catch (e) { return null; } });
      process.stdout.write('.');
      if (c && !c.r) { process.stdout.write(' (maç bitti)'); break; }
    }
    process.stdout.write('\n');

    const rap = await p.evaluate(() => { window.__sn.durdur(); return window.__sn.rapor(); });
    await b.close(); srv.close();

    console.log('');
    console.log('='.repeat(86));
    console.log('BASKETBOL ŞARTNAMESİ — ' + rap.kare + ' kare · klip %' + rap.klipPayi
      + ' · ' + rap.sut + ' şut · ' + rap.pas + ' pas · ' + rap.hucum + ' hücum · ' + rap.yorum + ' yorum');
    console.log('='.repeat(86));
    const d = rap.kurallar.filter(r => r.gecti === false);
    const g = rap.kurallar.filter(r => r.gecti === true);
    const y = rap.kurallar.filter(r => r.gecti === null);
    console.log('\n✗ DÜŞEN (' + d.length + ')');
    for (const r of d) { console.log('  ' + r.id.padEnd(5) + r.ad.padEnd(42) + String(r.deger)); r.ornek.forEach(o => console.log('        ' + o)); }
    console.log('\n✓ GEÇEN (' + g.length + ')');
    for (const r of g) console.log('  ' + r.id.padEnd(5) + r.ad.padEnd(42) + String(r.deger));
    console.log('\n? ÖLÇÜLEMEDİ (' + y.length + ')');
    for (const r of y) console.log('  ' + r.id.padEnd(5) + r.ad.padEnd(42) + String(r.deger));
    console.log('\n' + '='.repeat(86));
    console.log('SONUÇ: ' + d.length + ' düştü · ' + g.length + ' geçti · ' + y.length + ' ölçülemedi (toplam ' + rap.toplam + ')');
    console.log('KARAR: ' + (d.length <= 15 ? 'yama yolu' : d.length <= 40 ? 'başlık bazında düzeltme' : 'KARAR KATMANI SIFIRDAN'));
    console.log('='.repeat(86));
    try { fs.writeFileSync(JSONP, JSON.stringify(rap, null, 1)); console.log('Ham rapor: ' + JSONP); } catch (e) { }
    process.exit(d.length ? 1 : 0);
  })().catch(e => { console.error(e); process.exit(1); });
}

if (typeof module !== 'undefined') module.exports = { DENETCI };
