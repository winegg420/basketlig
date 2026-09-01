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
    donma: [],        /* {t, sure} — set fazında 1,5 sn+ HAREKETSİZ kalan oyuncu */
    titreme: [],      /* {t, role, hiz} — dar alanda kıpırdayan jeton (bilgi) */
    sokma: [],        /* {t, ortM, enUzakM, ilkPasM} */
    ftDrib: [],       /* {t, adet} */
    sirtDonuk: [],    /* {t, aci} — post-up'ta hücumcunun potaya göre açısı */
    perde: [],        /* {t, evre, roll} */
    sema: {},         /* şema → {kare, boyaGiris, yayDisiKare, xTop} */
    yay: [],          /* FAZ 26 §1: {tip, tepe, sure} — şut yörüngesinin tepe yüksekliği */
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
        /* ⚠ ÖLÇÜT DÜZELTMESİ: bu kapı önce HEDEFİN (p.tx/p.ty) değişmemesini donma
           sayıyordu. Yanlış vekildi ve kendi kusurunu üretti: hedefine doğru 2 sn yürüyen
           oyuncu — ekranda apaçık hareket hâlindeyken — "donmuş" diye raporlanıyordu, ve
           kapıyı kapatmanın tek yolu motorda HEDEFİ sürekli yeniden yazmak oluyordu. O
           yeniden yazma canlıda serbest top takibini ve şut koreografisini eziyordu
           (ribaund sahada olmayan oyuncuya gidiyor, boşluktan şut çekiliyor).
           Donma bir GÖRÜNTÜ olgusudur: ölçüt jetonun ÇİZİLEN KONUMUDUR. FAZ 14'ün
           "niteliği değil çizileni ölç" dersinin bu kapıya düşen karşılığı. */
        if (S.canliSet && S.offP && simAkiyor) {
          S.offP.forEach(p => {
            if (!p || p._oob) return;
            const k = p.slot + '|' + p.team;
            const onc = P._hedefT.get(k);
            if (!onc) { P._hedefT.set(k, { x: p.x, y: p.y, t, n: p._nudgeN||0, v: 0, kare: 0 }); return; }
            /* 5 px ≈ 0,17 m — bu kadarı ağırlık aktarması; altı gerçekten kıpırdamamaktır. */
            onc.v += Math.hypot(p.vx||0, p.vy||0); onc.kare++;
            if (Math.hypot(p.x - onc.x, p.y - onc.y) > 5) { P._hedefT.set(k, { x: p.x, y: p.y, t, n: p._nudgeN||0, v: 0, kare: 0 }); return; }
            const sure = (t - onc.t) / 1000;
            /* ⚠ İKİNCİ ÖLÇÜT DÜZELTMESİ (yine ölçerek): yalnız YER DEĞİŞTİRME bakmak da
               yanlış vekildi. Jeton yerinde ayak değiştirirken (ölçülen hız 13-21 px/sn)
               net sapması 5 px'i geçmiyor ve "çakılı" sayılıyordu; oysa ekranda hareket
               ediyor. Üstelik bu titremenin kaynağı salınım değil, TAKIM ARKADAŞI ayırma
               döngüsüdür (_PL_R_TAKIM ayırma yarıçapı) ve FAZ 25 öncesinden beri vardır.
               DONMA = HAREKETSİZLİK. Ölçüt ikiye bağlandı: pencere boyunca hem net sapma
               ≤5 px hem de ortalama hız < 3 px/sn (0,10 m/sn) olmalı. 1,5 sn eşiği aynen
               duruyor; değişen, o 1,5 sn içinde neyin "durmak" sayıldığı. */
            const _ortHiz = onc.kare ? onc.v / onc.kare : 0;
            /* Bilgi: dar alanda kıpırdayan (titreyen) jeton — donma DEĞİL, ayrı raporlanır. */
            if (sure > 1.5 && _ortHiz >= 3) { P.titreme.push({ t, role: p.role, hiz: +_ortHiz.toFixed(1) }); P._hedefT.set(k, { x: p.x, y: p.y, t, n: p._nudgeN||0, v: 0, kare: 0 }); return; }
            if (sure > 1.5 && _ortHiz < 3) {
              /* Teşhis alanları: donan jetonun kim olduğu ve NEDEN durduğu kök nedene götürür. */
              P.donma.push({ t, sure, role: p.role,
                kilit: (p._lock || 0) > S.time,
                topta: !!(S.ball && S.ball.carrier === p),
                hedefUzak: Math.round(Math.hypot(p.x - p.tx, p.y - p.ty)),
                nudge: (p._nudgeN||0) - (onc.n||0),
                hiz: onc.kare ? +(onc.v / onc.kare).toFixed(1) : null });
              P._hedefT.set(k, { x: p.x, y: p.y, t, n: p._nudgeN||0, v: 0, kare: 0 });
            }
          });
        } else if (!S.canliSet) { P._hedefT.clear(); }
        /* ── FAZ 26 §1: ŞUT YÖRÜNGESİ ──
           Şut tipi topun YAYINI değiştiriyor mu? Ölçüt topun uçuş boyunca ulaştığı en
           yüksek nokta (b.h) ve uçuş süresidir; ikisi de doğrudan ekrandaki görüntüdür.
           Tip damgası b.tip'tedir (motor _ballShoot'a geçirir). */
        if (b.mode === 'shot') {
          if (!P._yayAktif || P._yayAktif.tip !== (b.tip||null) || P._yayAktif.t0 > t) {
            P._yayAktif = { tip: b.tip||null, tepe: b.h||0, t0: t };
          }
          if ((b.h||0) > P._yayAktif.tepe) P._yayAktif.tepe = b.h||0;
          P._yayAktif.son = t;
        } else if (P._yayAktif) {
          if (P._yayAktif.tip) P.yay.push({ tip: P._yayAktif.tip, tepe: +P._yayAktif.tepe.toFixed(1),
            sure: +(((P._yayAktif.son||P._yayAktif.t0) - P._yayAktif.t0)/1000).toFixed(2) });
          P._yayAktif = null;
        }
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
  r.donma = { n: (P.donma || []).length, enUzun: (P.donma || []).reduce((a, c) => Math.max(a, c.sure), 0),
    kilitli: (P.donma || []).filter(x => x.kilit).length,
    topta: (P.donma || []).filter(x => x.topta).length,
    yolda: (P.donma || []).filter(x => x.hedefUzak > 20).length,
    rolDagilim: (P.donma || []).reduce((d, x) => { d[x.role] = (d[x.role] || 0) + 1; return d; }, {}),
    ornek: (P.donma || []).slice(0, 6) };
  r.titreme = { n: (P.titreme || []).length, ortHiz: (P.titreme||[]).length ? +((P.titreme).reduce((a2,c)=>a2+c.hiz,0)/(P.titreme).length).toFixed(1) : null };
  /* FAZ 26 §1 — şut yörüngesi: tip başına ortalama tepe yüksekliği ve süre */
  const _y = P.yay || [];
  const _grup = {};
  _y.forEach(x => { (_grup[x.tip] || (_grup[x.tip] = [])).push(x); });
  r.yay = Object.keys(_grup).map(k => ({
    tip: k, n: _grup[k].length,
    tepe: +(_grup[k].reduce((a2, c2) => a2 + c2.tepe, 0) / _grup[k].length).toFixed(1),
    sure: +(_grup[k].reduce((a2, c2) => a2 + c2.sure, 0) / _grup[k].length).toFixed(2),
  })).sort((a2, b2) => b2.n - a2.n);
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
