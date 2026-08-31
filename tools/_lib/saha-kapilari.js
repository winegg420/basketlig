/**
 * FAZ 25 §8 — SAHA DAVRANIŞI KAPILARI (sunum-check.js buradan çağırır).
 *
 * Tarayıcıda toplanan ham örneklerden (window.__SAHA) kapı sonuçlarını üretir.
 * Ölçüm mantığı ayrı dosyada durur ki sunum-check.js'in kendi üç maddesi (M9/M12/M14)
 * ile FAZ 25'in altı saha maddesi birbirine karışmasın.
 *
 * Ölçek: 29,5429 px/m (iki eksende eş — CLAUDE.md, FAZ 14).
 */
const PX_M = 29.5429;

/** Tarayıcı içinde çalışacak örnekleyici — string olarak verilir, page.evaluate kurar. */
const ORNEKLEYICI = `(function(){
  const S0 = () => (typeof mState!=='undefined' && mState && mState._sim) || null;
  const P = window.__SAHA = {
    tasima: [],       /* {t, role, x} — orta sahayı geçen taşıma anları */
    donma: [],        /* {t, sure} — set fazında hedefi 1,5 sn+ sabit kalan oyuncu */
    sokma: [],        /* {t, ortM, enUzakM, ilkPasM} */
    ftDrib: [],       /* {t, adet} */
    sirtDonuk: [],    /* {t, aci} — post-up'ta hücumcunun potaya göre açısı */
    perde: [],        /* {t, evre, roll} */
    sema: {},         /* şema → {kare, boyaGiris, yayDisiKare, xTop} */
    _sonTasiyici: null, _sonYari: null, _sokmaGorulen: null, _sonFtDrib: null,
    _perdeSon: null, _hedefT: new Map(), _sonSimT: -1, _sonDurakT: 0
  };
  const MID = 470;
  const step = () => {
    try {
      const S = S0();
      if (S && S.ball) {
        const t = performance.now();
        const b = S.ball;
        const c = b.carrier;
        /* ── §1: orta sahayı geçen taşıma ── */
        if (c) {
          const yari = c.x < MID ? 'sol' : 'sag';
          if (P._sonTasiyici === c && P._sonYari && P._sonYari !== yari) {
            P.tasima.push({ t, role: c.role, x: c.x });
          }
          P._sonTasiyici = c; P._sonYari = yari;
        }
        /* ── §2: set fazında donma ──
           ⚠ SAHNE DURUYORSA donma sayılmaz. Sahne döngüsü (_simStart) maç durunca
           (mState.running===false, olaylar arası ölü top) rAF'ı bırakıyor; bu denetçinin
           kendi rAF'ı çalışmaya devam ettiği için duran sahneyi "donmuş oyuncu" sanıyordu.
           Duran sahne bir sunum kusuru değil, oyunun duraklamasıdır. Ölçüt: S.time
           ilerlemiyorsa o kare hiç sayılmaz ve zaman tabanı kaydırılır. */
        const simAkiyor = (S.time !== P._sonSimT);
        if (!simAkiyor && P._hedefT.size) {
          const kayma = t - (P._sonDurakT || t);
          P._hedefT.forEach(v => { v.t += kayma; });
        }
        P._sonDurakT = t;
        P._sonSimT = S.time;
        if (S.canliSet && S.offP && simAkiyor) {
          S.offP.forEach(p => {
            if (!p || p._oob) return;
            const k = p.slot + '|' + p.team;
            const onc = P._hedefT.get(k);
            const hedef = (p.tx|0) + ',' + (p.ty|0);
            if (!onc || onc.hedef !== hedef) { P._hedefT.set(k, { hedef, t }); return; }
            const sure = (t - onc.t) / 1000;
            if (sure > 1.5) { P.donma.push({ t, sure, role: p.role }); P._hedefT.set(k, { hedef, t }); }
          });
        } else if (!S.canliSet) { P._hedefT.clear(); }
        /* ── §3: kenardan sokma ── */
        if (S.inb && S.inb.tok && P._sokmaGorulen !== S.inb.tok) {
          P._sokmaGorulen = S.inb.tok;
          const sp = { x: S.inb.x, y: S.inb.y };
          const dig = (S.offP||[]).filter(p => p !== S.inb.tok);
          const d = dig.map(p => Math.hypot(p.x - sp.x, p.y - sp.y));
          if (d.length) P.sokma.push({ t, ortM: d.reduce((a,c2)=>a+c2,0)/d.length/${PX_M},
            enUzakM: Math.max.apply(null, d)/${PX_M}, yakinSayi: d.filter(x=>x<=443).length, ilkPasM: null });
        }
        /* İlk sokma pası: top 'pass' moduna geçtiği an sokucudan hedefe uzaklık */
        if (b.mode === 'pass' && P.sokma.length && P.sokma[P.sokma.length-1].ilkPasM === null && b.from && b.target) {
          P.sokma[P.sokma.length-1].ilkPasM = Math.hypot(b.target.x - b.from[0], b.target.y - b.from[1]) / ${PX_M};
        }
        /* ── §4: serbest atış sektirmesi ── */
        if (S._ftDrib && S._ftDrib !== P._sonFtDrib) { P._sonFtDrib = S._ftDrib; P.ftDrib.push({ t, adet: S._ftDrib.adet }); }
        /* ── §6.1: post-up sırt dönüklüğü ── */
        if (S._postup && S._postup.tok && S._postup.tok._sirtDonuk) {
          const p = S._postup.tok;
          const rim = (S.offSide ? [102.6,250] : [837.4,250]);
          const potaAci = Math.atan2(rim[1]-p.y, rim[0]-p.x);
          let d2 = (p.yon||0) - potaAci;
          while (d2 > Math.PI) d2 -= 2*Math.PI;
          while (d2 < -Math.PI) d2 += 2*Math.PI;
          P.sirtDonuk.push({ t, aci: Math.abs(d2) });
        }
        /* ── §6.2: perde aşamaları ── */
        if (S._perde && S._perde !== P._perdeSon) { P._perdeSon = S._perde; P.perde.push({ t, evre: S._perde.evre, roll: S._perde.roll }); }
        /* ── §5: şema yörüngesi ── */
        if (S.canliSet && S.offP && S.offP.length) {
          const ad = (S._sema && S._sema.ad) || (mState._semaAd || 'diger');
          const g = P.sema[ad] || (P.sema[ad] = { kare:0, boyaGiris:0, yayDisi:0, xTop:0 });
          g.kare++;
          const rim = (S.offSide ? [102.6,250] : [837.4,250]);
          S.offP.forEach(p => {
            const d3 = Math.hypot(p.x-rim[0], p.y-rim[1]);
            if (d3 < 140) g.boyaGiris++;
            if (d3 > 199.41) g.yayDisi++;
            g.xTop += p.x;
          });
        }
      }
    } catch (e) {}
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  return true;
})()`;

/** Toplanan örneklerden kapı sonuçlarını üretir. */
function kapilar(P) {
  const r = {};
  /* §1 */
  const tas = P.tasima || [];
  const dogru = tas.filter(x => x.role === 0 || x.role === 1 || x.role === 2).length;
  r.tasima = { n: tas.length, oran: tas.length ? dogru / tas.length : null };
  /* §2 */
  r.donma = { n: (P.donma || []).length, enUzun: (P.donma || []).reduce((a, c) => Math.max(a, c.sure), 0) };
  /* §3 */
  const sk = (P.sokma || []).filter(x => x.ortM != null);
  r.sokma = {
    n: sk.length,
    ortM: sk.length ? sk.reduce((a, c) => a + c.ortM, 0) / sk.length : null,
    yakin3: sk.length ? sk.filter(x => x.yakinSayi >= 3).length / sk.length : null,
    uzunPas: sk.filter(x => x.ilkPasM != null && x.ilkPasM > 25).length,
    pasliOrnek: sk.filter(x => x.ilkPasM != null).length,
  };
  /* §4 */
  const ft = P.ftDrib || [];
  r.ftDrib = { n: ft.length, min: ft.length ? Math.min.apply(null, ft.map(x => x.adet)) : null,
               max: ft.length ? Math.max.apply(null, ft.map(x => x.adet)) : null };
  /* §6.1 — sırt dönüklük: potaya göre açı 90°'den büyükse sırtı dönüktür */
  const sd = P.sirtDonuk || [];
  r.sirtDonuk = { n: sd.length, tersOran: sd.length ? sd.filter(x => x.aci > Math.PI / 2).length / sd.length : null };
  /* §6.2 — üç aşama da görülmeli */
  const ev = new Set((P.perde || []).map(x => x.evre));
  r.perde = { n: (P.perde || []).length, evreler: Array.from(ev).sort(),
              roll: (P.perde || []).filter(x => x.roll === true).length,
              pop: (P.perde || []).filter(x => x.roll === false).length };
  /* §5 — şema yörünge farkı */
  const s = P.sema || {};
  r.sema = Object.keys(s).map(k => ({
    ad: k, kare: s[k].kare,
    boyaOran: s[k].kare ? s[k].boyaGiris / (s[k].kare * 5) : 0,
    yayOran: s[k].kare ? s[k].yayDisi / (s[k].kare * 5) : 0,
    xOrt: s[k].kare ? s[k].xTop / (s[k].kare * 5) : 0,
  })).filter(x => x.kare >= 20);
  return r;
}

module.exports = { ORNEKLEYICI, kapilar, PX_M };
