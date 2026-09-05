/* ═══════════════════════════════════════════════════════════════════════════════════
   Charazay 2.0 — js/sahne-oam.js · FAZ 46 · OYUN AKIŞI MAKİNESİ (OAM)
   CANLI TOPUN YENİDEN YAZIMI

   Eski sahne: motorun olay listesini adım adım "oynayan" bir kukla katmanıydı — dizilim
   şablonu, kulvar ara noktası, takip, bekçi, markaj ve salınım aynı jetonun hedefini
   birbirinden habersiz yazıyor; paslar anlatımdaki oyuncuya topu ulaştırmak için atılıyor,
   boş adam görülmüyordu. Kullanıcı (FAZ 45): "geri pas, mantıksız pas, mantıksız dizilim,
   boş oyuncu şut atmak yerine top sektiriyor."

   OAM tek beyindir: canlı topta (sokma → geçiş → set → şut) her karede her oyuncuya TEK
   hedef yazar. Hücum: boşluk şablonu (SET_*) + oyun şeması (perde / kesme / post / açılma);
   topu tutan oyuncu BOŞ ve ÖNDEKİ takım arkadaşına pas atar, geri pas yalnız içeriden
   açılma ya da çevrede çevirme olarak vardır. Savunma: adam adama — adam ile pota arasında,
   topa uzaklığa göre yardım mesafesi, topu tutana yakın markaj, şutta kapama. Sokma çizgi
   DIŞINDAN, alıcı 5-6 m'de. Şutu KİMİN, NEREDEN, NE SONUÇLA attığı motorun kararıdır
   (kutu skor / hash değişmez); OAM oyunu o şutöre o noktada boş şut ürettirecek biçimde
   kurar (gerçek basketbolda set oyunu tam olarak budur). Zaman bütçesi yetmezse baskı
   altında şut: pas zorla şutöre, şut yine oradan.

   Ölü top törenleri (hava atışı · serbest atış · faul/ihlal sokması · mola · periyot)
   eski koreografide kalır; OAM yalnız şutlu pozisyonu (`animateShotPossession`) devralır.
   Hareket fiziği (hız merdiveni, ivme, dönüş, çarpışma, top fiziği) eski `_simTick`tedir;
   OAM ondan ÖNCE hedefleri yazar, eski hedef yazıcıları (canlıSet salınımı, defTrack,
   çıkış-pası kapısı, kulvar `_wp`) canlı top boyunca kapalıdır.

   Sahne kararları YALNIZ sahne PRNG'sinden (`_sr`/`_srand`) çekilir — maç akışı kaymaz.
   ═══════════════════════════════════════════════════════════════════════════════════ */

const OAM_ACIK=true;
const OAM_YERINDE=24;        /* px ≈ 0,8 m — "noktasında" */
const OAM_BOS=44;            /* px ≈ 1,5 m — en yakın savunmacı bundan uzaksa alıcı boş */
const OAM_GERI=60;           /* px ≈ 2 m — bundan fazla potadan uzaklaşan pas "geri" */
const OAM_KICKOUT=150;       /* px ≈ 5 m — içeriden dışarı açma serbest */
const OAM_CEVRE=90;          /* px — iki çevre oyuncusu arasındaki çevirme pası serbest */
const OAM_SET_SURE={pnr:3.0,handoff:2.8,cut:2.6,postup:2.8,spotup:2.4,iso:2.2,transition:1.5,diger:2.4};

/* ── Yardımcılar ───────────────────────────────────────────────────────────────────── */
function oamS(){ return (typeof mState!=='undefined'&&mState)?mState._sim:null; }
function oamD(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
function oamDR(p,rim){ return Math.hypot(p.x-rim[0],p.y-rim[1]); }
function oamHedef(p,x,y,urg){
  if(!p) return;
  p.tx=_inX(x); p.ty=_inY(y); p._wp=null; p._sonHedefT=(oamS()||{}).time||0;
  const d=Math.hypot(p.x-p.tx,p.y-p.ty);
  _setUrg(p,(d<OAM_YERINDE&&urg<_URG.SPRINT&&!p._mark)?_URG.YURU:urg);
}
/** Noktasındaki oyuncu donmaz: hedef küçük bir dairede döner (r px, ω rad/sn). */
function oamCanli(p,sx,sy,r,ph){
  const S=oamS(); const t=(S?S.time:0)*2.1+ph;
  return [sx+Math.cos(t)*r,sy+Math.sin(t)*r*0.7];
}
/** En yakın savunmacı uzaklığı (px). */
function oamEnYakinSav(p,defP){ let m=1e9; (defP||[]).forEach(d=>{ if(d&&isFinite(d.x)){ const k=oamD(p,d); if(k<m) m=k; } }); return m; }
function oamBos(p,defP){ return oamEnYakinSav(p,defP)>OAM_BOS; }
/** Pas geriye mi? (potadan uzaklaşan; içeriden açma ve çevre çevirme serbest) */
function oamGeri(from,to,rim){
  const df=oamDR(from,rim), dt=oamDR(to,rim);
  if(dt<=df+OAM_GERI) return false;
  if(df<OAM_KICKOUT) return false;
  if(Math.abs(dt-df)<OAM_CEVRE&&df>THREE_R-30) return false;
  return true;
}
function oamPas(to,dur){
  const S=oamS(); if(!S||!to) return;
  const b=S.ball; const d=Math.hypot(to.x-b.x,to.y-b.y);
  const veren=b.carrier;
  _ballPass(to,dur||Math.max(0.36,Math.min(1.0,d/380)));   /* göğüs pası ≈ 13 m/sn (tavan 19,6; kare titreşimi 25 m/sn sayımına girmesin) */
  if(typeof sfx==='function') sfx('pass');
  const O=S.oam; if(O){
    O.holdT=0; O.sonPasT=O.t; O.pasN=(O.pasN|0)+1;
    /* pas-ve-hareket: çevredeki pasçı noktasını pota çevresinde ±25° kaydırır (şutör/perdeci hariç) */
    try{
      if(O.faz==='set'&&!O.donuk&&veren&&veren!==O.shooter&&veren!==O.screener&&veren!==O.cutter&&O.spots.has(veren)){
        const rim=O.rim, sp=O.spots.get(veren); const r=Math.hypot(sp[0]-rim[0],sp[1]-rim[1]);
        if(r>150){
          const a0=Math.atan2(sp[1]-rim[1],sp[0]-rim[0]); const a1=a0+(veren.y<250?1:-1)*0.42*(O.dir>0?-1:1)*(_sr()<0.5?1:-1);
          const nx=rim[0]+Math.cos(a1)*r, ny=rim[1]+Math.sin(a1)*r;
          const icerde=(nx>CRT_X0+30&&nx<CRT_X1-30&&ny>CRT_Y0+30&&ny<CRT_Y1-30);
          if(icerde&&!oamNoktaDolu(O,veren,nx,ny)) O.spots.set(veren,[nx,ny]);
        }
      }
    }catch(e){}
  }
}
/** Bir dizilim noktası başka bir oyuncunun noktasına 2,1 m'den yakın mı? */
function oamNoktaDolu(O,haric,x,y){
  let dolu=false; O.spots.forEach((c,p)=>{ if(p!==haric&&Math.hypot(c[0]-x,c[1]-y)<_PL_R_TAKIM) dolu=true; }); return dolu;
}
/** Pas mantıklı mı: geri değil, boya içinden geçmiyor (giriş pası hariç), 10 m'den uzun değil (açma hariç). */
function oamPasOlur(from,to,rim){
  if(oamGeri(from,to,rim)) return false;
  const df=oamDR(from,rim), dt=oamDR(to,rim);
  const d=oamD(from,to);
  if(d>300&&df>=OAM_KICKOUT&&dt>=OAM_KICKOUT) return false;
  if(df>=OAM_KICKOUT&&dt>=OAM_KICKOUT){
    /* pota-çizgi uzaklığı */
    const vx=to.x-from.x, vy=to.y-from.y, L=vx*vx+vy*vy||1;
    const u=Math.max(0,Math.min(1,((rim[0]-from.x)*vx+(rim[1]-from.y)*vy)/L));
    const px=from.x+u*vx, py=from.y+u*vy;
    if(Math.hypot(px-rim[0],py-rim[1])<70) return false;
  }
  return true;
}
/** Doğrudan pas olmuyorsa köprü oyuncu (yol toplamı en kısa, ilk pas mantıklı). */
function oamKopru(O,from,to){
  let en=null,ed=1e9;
  O.offP.forEach(c=>{ if(!c||c===from||c===to||c._oob) return; if(!oamPasOlur(from,c,O.rim)) return; const s=oamD(from,c)+oamD(c,to); if(s<ed){ ed=s; en=c; } });
  return en;
}
/** Dizilim noktaları: SET şablonu rol sırasına göre, aynalanmış. */
function oamSpotlar(S,offLeft,offR){
  const base=(SET_ALL[(S.setIx|0)%SET_ALL.length]||SET_SPREAD);
  const m=new Map();
  const rim=_rim(offLeft);
  offR.forEach((p,i)=>{ const c=_pt((base[i]||base[0]).slice(),offLeft,!!S.flip);
    /* şablon %7 içeri çekilir (ölçüldü: potaya ortalama uzaklık 8,2 m, hedef ≤ 7) */
    m.set(p,[rim[0]+(c[0]-rim[0])*0.93,rim[1]+(c[1]-rim[1])*0.93]); });
  return m;
}

/* ── Pozisyon kurulumu (animateShotPossession yerine) ───────────────────────────────── */
function oamSut(sh,onShoot,onResult){
  const S=oamS(); if(!S) return 0;
  const _res=()=>{ S.pendingPaint=null; try{ if(typeof onResult==='function') onResult(); }catch(e){} };
  try{ mState._gelen={shot:true,type:'shot'}; }catch(e){}
  clearBallTimers();
  S.pendingPaint=_res;
  const offLeft=S.offSide!=null?S.offSide:(sh.isHome===(mState.userIsHome!==false));
  const offP=S.offP||(sh.isHome?S.home:S.away);
  const defP=S.defP||(sh.isHome?S.away:S.home);
  const rim=_rim(offLeft);
  const b=S.ball;
  const offR=_rolesOrder(offP), defR=_rolesOrder(defP);
  const dir=offLeft?-1:1;                       /* ön saha yönü (x) */
  _clearOob((S.inb&&S.inb.tok)||((b.carrier&&b.carrier._oob&&offP.indexOf(b.carrier)>=0)?b.carrier:null));

  /* Şutör = anlatımdaki oyuncu */
  let shooter=null;
  if(sh.sid!=null) shooter=offP.find(p=>p.pl&&p.pl.id===sh.sid)||null;
  if(!shooter){ let bd=1e9; offP.forEach(p=>{ const d=Math.hypot(p.x-sh.x,p.y-sh.y); if(d<bd){bd=d;shooter=p;} }); }
  if(!shooter) shooter=offR[0];

  /* Topu getiren / çıkış pası (M9 sözleşmesi korunur) */
  let pg=(b.carrier&&offP.indexOf(b.carrier)>=0)?b.carrier:offR[0];
  let outletTok=null;
  if(!sh.pb&&pg&&pg.role===2&&_sr()<0.70){
    const g2=offR.find(p=>p!==pg&&p!==shooter&&(p.role===0||p.role===1))||offR.find(p=>p!==pg&&(p.role===0||p.role===1));
    if(g2){ outletTok=pg; pg=g2; }
  }
  if(!outletTok&&!sh.pb&&pg&&(pg.role===3||pg.role===4)){
    const guard=offR.find(p=>p!==pg&&p!==shooter&&(p.role===0||p.role===1))||offR.find(p=>p!==pg&&(p.role===0||p.role===1))||offR.find(p=>p!==pg&&p!==shooter)||offR.find(p=>p!==pg);
    if(guard){ outletTok=pg; pg=guard; }
  }
  if(pg===shooter&&!sh.pb) pg=offR.find(p=>p!==shooter&&p!==outletTok&&_tasiyabilir(p))||offR.find(p=>p!==shooter&&p!==outletTok)||offR.find(p=>p!==shooter)||offR[0];
  try{ S._dbgOutlet={tasiyiciRol:(b.carrier&&b.carrier.role!=null)?b.carrier.role:null,pb:!!sh.pb,outlet:!!outletTok,pgRol:pg?pg.role:null}; }catch(e){}
  const relay=offP.filter(p=>p!==shooter&&p!==pg);
  const tac=(typeof G!=='undefined'&&G&&G.tactics)||{};
  const userAtt=!!sh.isHome;
  let mid=relay.length?relay[_srand(0,relay.length-1)]:pg;
  if(userAtt&&tac.focusPlayerId){ const f=relay.find(p=>p.pl&&p.pl.id===tac.focusPlayerId); if(f) mid=f; }
  if(sh.pid!=null){ const pt=relay.find(p=>p.pl&&p.pl.id===sh.pid); if(pt) mid=pt; else if(pg.pl&&pg.pl.id===sh.pid) mid=pg; }

  const putback=!!sh.pb&&b.carrier&&offP.indexOf(b.carrier)>=0;
  const inbPending=!putback&&(!!S.inb||!!(b.carrier&&b.carrier._oob&&offP.indexOf(b.carrier)>=0));
  const afterTurnover=(S.prevType==='steal'||S.prevType==='reb');
  const rimDist=Math.hypot(sh.x-rim[0],sh.y-rim[1]);
  const fastBreak=!putback&&!inbPending&&(!!sh.fb||(userAtt&&afterTurnover&&(tac.tempo==='hizli'||tac.odak==='hizli'))||(afterTurnover&&rimDist<=170&&_sr()<0.55));
  const iso=!!(userAtt&&tac.focusPlayerId&&shooter.pl&&shooter.pl.id===tac.focusPlayerId);
  const scheme=sh.scheme||null;
  try{ mState._semaAd=scheme||'diger'; }catch(e){}
  S._sema=null;
  const isPnr=(scheme==='pnr'||scheme==='handoff')&&!fastBreak&&!putback&&!iso;

  /* Dizilim: şutörün noktası ŞUT NOKTASIDIR; en yakın şablon noktası ona bırakılır */
  const spots=oamSpotlar(S,offLeft,offR);
  if(!putback){
    const sp=[_inX(sh.x),_inY(sh.y)];
    let enY=null,ed=1e9; offR.forEach(p=>{ if(p===shooter) return; const c=spots.get(p); const d=Math.hypot(c[0]-sp[0],c[1]-sp[1]); if(d<ed){ ed=d; enY=p; } });
    const eski=spots.get(shooter);
    spots.set(shooter,sp);
    if(enY&&ed<70) spots.set(enY,eski);
  } else spots.set(shooter,[_inX(sh.x),_inY(sh.y)]);
  /* Oyun kurucunun noktası: topu getiren, şutör değilse tepeye yakın kalsın (giriş noktası) */

  /* Pas zinciri: pg → (ara) → asist veren → şutör */
  const zincir=[];
  const ekle=(p)=>{ if(p&&zincir[zincir.length-1]!==p&&zincir.indexOf(p)<0) zincir.push(p); };
  ekle(pg);
  if(!fastBreak&&!putback&&!iso&&mid!==pg&&mid!==shooter&&_sr()<0.45){ const ara=relay.find(p=>p!==mid&&_tasiyabilir(p)&&p!==shooter); if(ara) ekle(ara); }
  if(mid!==shooter) ekle(mid);
  ekle(shooter);

  /* Zincirdeki pasçılar köşede durmasın (köşeden köşeye boya içinden pas): köşe noktası, zincir dışı
     bir oyuncunun kanat/tepe noktasıyla takas edilir. */
  const koseMi=(c)=>(Math.min(Math.abs(c[0]-CRT_X0),Math.abs(c[0]-CRT_X1))<110&&Math.abs(c[1]-250)>150);
  zincir.forEach(p=>{
    if(p===shooter) return;
    const c=spots.get(p); if(!c||!koseMi(c)) return;
    const q=offR.find(o=>o!==shooter&&zincir.indexOf(o)<0&&!koseMi(spots.get(o)||[0,250]));
    if(q){ const cq=spots.get(q); spots.set(q,c); spots.set(p,cq); }
  });
  /* Boyada biri olsun: hiçbir nokta potaya 5 m'den yakın değilse zincir dışı en uzun oyuncu
     şutörün ZAYIF tarafındaki alçak posta iner (ölçüldü: 5-dış şablonlarda boyada hücumcu %51,
     potaya ortalama uzaklık 8,3 m). */
  if(!fastBreak&&!putback){
    let icerde=false; spots.forEach((c,p)=>{ if(Math.hypot(c[0]-rim[0],c[1]-rim[1])<150) icerde=true; });
    if(!icerde){
      const uzun=offR.filter(p=>p!==shooter&&zincir.indexOf(p)<0).sort((a,b2)=>(b2.role|0)-(a.role|0))[0];
      if(uzun){ const sy=spots.get(shooter)[1]; spots.set(uzun,[_inX(rim[0]+dir*44),_inY(250+(sy<250?54:-54))]); }
    }
  }
  /* zayıf taraf değişimi: zincir dışı iki çevre oyuncusu set başında yer değiştirir (hareket) */
  const serbest=offR.filter(o=>o!==shooter&&zincir.indexOf(o)<0);
  const degisim=(serbest.length>=2&&_sr()<0.7)?[serbest[0],serbest[1]]:null;

  /* Şema aktörleri */
  const bigs=offR.filter(p=>p!==shooter&&p!==pg&&(p.role===3||p.role===4));
  const screener=isPnr?(bigs.length?bigs.reduce((a,c)=>oamD(c,pg)<oamD(a,pg)?c:a):null):null;
  const doCut=(scheme==='cut')||(!isPnr&&!fastBreak&&!putback&&scheme!=='postup'&&scheme!=='spotup'&&_sr()<0.45);
  const cutter=doCut?((rimDist<150&&shooter!==pg)?shooter:(bigs.find(p=>p!==screener)||relay.find(p=>p!==mid)||null)):null;
  const postup=(scheme==='postup')&&!fastBreak&&!putback;

  /* Süre bütçesi (sahne sn) */
  let inb=null,spot=null;
  if(inbPending){
    inb=(S.inb&&S.inb.tok&&offP.indexOf(S.inb.tok)>=0)?S.inb.tok:((b.carrier&&b.carrier._oob)?b.carrier:null);
    if(S.inb) spot={x:S.inb.x,y:S.inb.y}; else if(inb) spot={x:inb.tx,y:inb.ty};
    if(!inb){ inb=offR.reduce((a,c)=>oamDR(c,_rim(!offLeft))<oamDR(a,_rim(!offLeft))?c:a); spot=_inboundSpot('base',offLeft,null,250+(_sr()<0.5?-1:1)*_srand(24,74)); inb._oob=true; }
  }
  const tInb=inbPending?Math.min(2.8,(inb?Math.hypot(inb.x-spot.x,inb.y-spot.y):0)/150+0.9):0;
  const pgSpot=spots.get(pg)||[rim[0]-dir*250,250];
  const getirMesafe=inbPending?Math.hypot(spot.x+dir*165-pgSpot[0],spot.y-pgSpot[1]):Math.hypot(pg.x-pgSpot[0],pg.y-pgSpot[1]);
  const tAdv=putback?0:Math.max(0.35,Math.min(3.2,getirMesafe/(fastBreak?250:205)+0.25));
  const setDur=putback?0.45:(fastBreak?1.0:((OAM_SET_SURE[scheme]||OAM_SET_SURE.diger)+Math.max(0,zincir.length-2)*0.35));
  const tFire=tInb+tAdv+setDur;

  const O={aktif:true,faz:inbPending?'sokma':(putback?'set':'bekle'),t:0,sh,shooter,pg,outletTok,mid,offP,defP,offR,defR,offLeft,dir,rim,
    spots,zincir,zi:0,holdT:0,holdMin:0.45+_sr()*0.35,scheme,fastBreak,putback,iso,isPnr,screener,cutter,postup,degisim,degisti:false,
    inb,spot,tFire,tInb,tAdv,setDur,tSet:null,tGecis:null,res:_res,onShoot,atildi:false,perdeEvre:0,esle:new Map(),ph:new Map(),
    zorla:false,sutT:null,_snapSeen:(S._snapN|0)};
  offR.forEach((p,i)=>{ O.esle.set(p,defR[i]||defR[0]); O.ph.set(p,i*1.3); });
  defR.forEach((p,i)=>{ O.ph.set(p,i*1.7+0.5); });
  S.oam=O;
  S.canliSet=false; S._setIstek=false; S.defTrack=false; S.cikisSonra=1e9; S.shooter=shooter;
  if(putback){ O.tSet=0; S._sema=scheme||'putback'; }
  try{ mState._animRez=1800; }catch(e){}
  return Math.round((tFire+1.4)*1000)+((sh.made&&sh.and1)?2100:0);
}
/** Set fazı başlar: şut anı gerçek set başlangıcına göre yeniden kurulur; zayıf taraf değişimi. */
function oamSetBasla(S,O,etiket){
  O.faz='set'; O.tSet=O.t; S._sema=etiket;
  O.tFire=Math.max(O.tFire,O.tSet+O.setDur);
  if(O.degisim&&!O.degisti){ const [a,b2]=O.degisim; const ca=O.spots.get(a), cb=O.spots.get(b2); if(ca&&cb){ O.spots.set(a,cb); O.spots.set(b2,ca); } O.degisti=true; }
}

/* ── Şut anı (eski `fire` sözleşmesi: ön parça elden çıkarken, sonuç çemberde) ──────── */
function oamAtes(){
  const S=oamS(); const O=S&&S.oam; if(!O||O.atildi) return;
  O.atildi=true; O.faz='sut'; O.sutT=O.t;
  const {sh,shooter,offP,defP,offLeft,rim}=O; const _res=O.res;
  try{ if(typeof O.onShoot==='function') O.onShoot(); }catch(e){}
  const _sTip=sh.sut||null;
  shooter.pop=(_sTip==='smac')?1.6:(_sTip==='tipin')?1.45:(_sTip==='kanca')?0.9:(_sTip==='turnike')?0.85:(_sTip==='floater')?1.15:1;
  shooter._sirtDonuk=false;
  _lockTok(shooter,_sTip==='smac'?1.0:0.8);
  const dfn=O.esle.get(shooter); if(dfn&&oamD(dfn,shooter)<70) dfn.pop=(sh.contest==='heavy')?0.9:0.55;   /* kapama */
  if(sh.blk){
    const bx=sh.x+(rim[0]-sh.x)*0.22+_srand(-16,16), by=sh.y+(rim[1]-sh.y)*0.22+_srand(-16,16);
    let bl=null,bd=1e9; defP.forEach(p=>{ const d=Math.hypot(p.x-sh.x,p.y-sh.y); if(d<bd){bd=d;bl=p;} });
    if(bl) bl.pop=1;
    _ballShoot([bx,by],0.20,false,()=>{
      _res();
      let a2=_sr()*6.283;
      try{ const nxB=_peekNext(); if(nxB&&nxB.type==='reb'&&nxB.rebId!=null){ const nm=offP.concat(defP).find(p=>p.pl&&p.pl.id===nxB.rebId); if(nm) a2=Math.atan2(nm.y-by,nm.x-bx)+(_sr()*2-1)*0.4; } }catch(e){}
      _ballLoose(Math.cos(a2)*150,Math.sin(a2)*140,63);
      _rebScramble(offP,defP,rim,offLeft);
    });
    oamBitir(); return;
  }
  const rimD=Math.hypot(sh.x-rim[0],sh.y-rim[1]);
  /* ribaunt bloğu: sıradaki ribaundcu + rakip uzun potanın iki yanına */
  try{
    const nx0=_peekNext();
    const hucRib=(nx0&&nx0.type==='reb'&&nx0.rebId!=null)?(offP.concat(defP).find(p=>p.pl&&p.pl.id===nx0.rebId)||null):null;
    const enUzun=(team,haric)=>{ let e=null,ed=1e9; _rolesOrder(team).slice(2).forEach(p=>{ if(!p||p===haric||p===shooter) return; const d=oamDR(p,rim); if(d<ed){ ed=d; e=p; } }); return e; };
    const r1=hucRib||enUzun(defP,null), r2=enUzun((r1&&defP.indexOf(r1)>=0)?offP:defP,r1);
    const yon=Math.atan2(sh.y-rim[1],sh.x-rim[0]);
    [[r1,0.55],[r2,-0.55]].forEach(([p,da])=>{ if(!p||p===shooter) return; const rr=_srand(36,54); const a=yon+da; p.tx=_inX(rim[0]+Math.cos(a)*rr); p.ty=_inY(rim[1]+Math.sin(a)*rr); p._wp=null; _setUrg(p,_URG.SPRINT); _lockTok(p,0.9); });
  }catch(e){}
  const _durSabit=(rimD<90||_sTip==='smac'||_sTip==='turnike'||_sTip==='floater'||_sTip==='kanca'||_sTip==='tipin')?0:0.58;
  _ballShoot(rim,_durSabit,sh.made,()=>{
    _rimFlash(rim[0],rim[1],sh.made);
    if(sh.made&&sh.and1){ _and1Sequence(sh,shooter,offP,defP,offLeft,rim,_res); return; }
    _res();
    if(sh.made){
      _setupInbound(!sh.isHome,250+(_sr()<0.5?-1:1)*_srand(24,74));
    } else {
      let away=Math.atan2(sh.y-rim[1],sh.x-rim[0])+(_sr()*2-1)*1.1;
      let sp=_srand(85,150);
      try{ const nxR=_peekNext(); if(nxR&&nxR.type==='reb'&&nxR.rebId!=null){
        const nm=offP.concat(defP).find(p=>p.pl&&p.pl.id===nxR.rebId);
        if(nm){ const dn=oamDR(nm,rim); if(dn>90){ away=Math.atan2(nm.y-rim[1],nm.x-rim[0])+(_sr()*2-1)*0.35; sp=_srand(120,165); } }
      } }catch(e){}
      _ballCarom(Math.cos(away)*sp,Math.sin(away)*sp,_srand(44,54));
      S.inb=null;
      _rebScramble(offP,defP,rim,offLeft);
    }
  },_sTip);
  oamBitir();
}
function oamBitir(){ const S=oamS(); if(!S) return; if(S.oam){ S.oam.aktif=false; } S.cikisSonra=0; }

/* ── Kare beyni ─────────────────────────────────────────────────────────────────────── */
function oamTick(dt){
  const S=oamS(); const O=S&&S.oam; if(!O||!O.aktif) return;
  O.t+=dt; O.holdT+=dt;
  const b=S.ball, {offP,defP,offR,rim,dir,shooter,pg,spots}=O;
  const carrier=b.carrier, bizde=!!(carrier&&offP.indexOf(carrier)>=0);
  const ucusta=(b.mode==='pass'||b.mode==='shot');
  const onSaha=(p)=>O.offLeft?(p.x<COURT_MID):(p.x>COURT_MID);

  /* ── faz geçişleri ── */
  if(O.faz==='bekle'){
    if(bizde){
      if(carrier!==pg&&!_tasiyabilir(carrier)&&!O.putback&&O.holdT>0.12&&oamDR(carrier,rim)>_POTA_YAKIN_PX){
        const h=_pasHedefSinirla(carrier,pg,offP,_SOKMA_MAX_PX)||pg; if(h!==carrier) oamPas(h);
      }
      if(carrier===pg||_tasiyabilir(carrier)||O.holdT>0.6){ O.faz='gecis'; O.tGecis=O.t; }
    } else if(carrier&&!bizde){
      if(O.holdT>0.2){ _ballLoose(0,0,14); _chase(pg,null,2.2); O.holdT=0; }
    } else if(!ucusta&&!S.chase){
      let en=null,ed=1e9; offP.forEach(p=>{ if(!p||p._oob) return; const d=Math.hypot(p.x-b.x,p.y-b.y); if(d<ed){ ed=d; en=p; } });
      if(en) _chase(en,null,2.2);
    }
    if(O.t>2.8&&!bizde&&!ucusta){ _ballHold(pg); O.faz='gecis'; O.tGecis=O.t; }
  }
  else if(O.faz==='sokma'){
    const inb=O.inb, spot=O.spot;
    if(!inb||!spot){ O.faz='bekle'; }
    else {
      inb._oob=true;
      if(b.carrier!==inb&&!ucusta&&!(S.chase&&S.chase.tok===inb)){
        _chase(inb,()=>{ try{ S.ball.noDrib=true; inb.tx=spot.x; inb.ty=spot.y; inb._wp=null; _setUrg(inb,_URG.KOS); }catch(e){} },2.4);
      }
      if(b.carrier===inb){ inb.tx=spot.x; inb.ty=spot.y; inb._wp=null; _setUrg(inb,_URG.KOS); S.ball.noDrib=true; }
      const hazir=(b.carrier===inb&&Math.hypot(inb.x-spot.x,inb.y-spot.y)<=16);
      if((hazir&&O.t>=0.25)||(b.carrier===inb&&O.t>3.4)){
        let alici=pg;
        if(Math.hypot(pg.x-inb.x,pg.y-inb.y)>_SOKMA_MAX_PX){ alici=_pasHedefSinirla(inb,pg,offP,_SOKMA_MAX_PX)||pg; }
        oamPas(alici);
        _oobKapat(inb); inb._wp=null; S.inb=null; S._sokmaBekle=null;
        O.faz='gecis'; O.tGecis=O.t;
      }
    }
  }
  else if(O.faz==='gecis'){
    if(bizde&&carrier!==pg&&!_tasiyabilir(carrier)&&O.holdT>0.15&&!O.putback){ const h=_pasHedefSinirla(carrier,pg,offP,_SOKMA_MAX_PX)||pg; if(h!==carrier) oamPas(h); }
    const bh=bizde?carrier:pg;
    const bhSpot=spots.get(bh)||[rim[0]-dir*220,250];
    const vardi=Math.hypot(bh.x-bhSpot[0],bh.y-bhSpot[1])<70;
    const onde=onSaha(bh)&&Math.abs(bh.x-COURT_MID)>90;
    if(O.fastBreak&&bizde&&onSaha(bh)){ oamSetBasla(S,O,O.scheme||'transition'); }
    else {
      /* set, hücumun en az dördü ön sahadayken kurulur (ölçüm: arkadan gelen uzunlar potaya
         ortalama uzaklığı şişiriyordu); zaman tavanı yine geçerli */
      let ondeN=0; offR.forEach(p=>{ if(p&&onSaha(p)) ondeN++; });
      if(bizde&&((vardi&&ondeN>=4)||(onde&&ondeN>=4&&O.t>=O.tGecis+1.0)||O.t>=O.tInb+O.tAdv+1.0)) oamSetBasla(S,O,O.scheme||'diger');
    }
    /* geçiş pası: hızlı hücumda öndeki boş kanada */
    if(O.fastBreak&&bizde&&O.holdT>0.5&&carrier!==shooter&&oamBos(shooter,defP)&&oamDR(shooter,rim)<oamDR(carrier,rim)-40){ oamPas(shooter); }
  }
  else if(O.faz==='set'){
    S.canliSet=true;
    const ts=O.t-O.tSet;
    const kalan=O.tFire-O.t;
    /* şema aşamaları */
    if(O.isPnr&&O.screener){
      if(O.perdeEvre===0&&ts>=0.15){ O.perdeEvre=1; S._perde={evre:1,tok:O.screener,t:S.time}; }
      else if(O.perdeEvre===1&&ts>=0.95){ O.perdeEvre=2; S._perde={evre:2,tok:O.screener,t:S.time}; }
      else if(O.perdeEvre===2&&ts>=1.55){ O.perdeEvre=3; S._perde={evre:3,tok:O.screener,t:S.time,roll:(O.screener===shooter||_sr()<0.6)}; }
    }
    if(O.postup&&!shooter._sirtDonuk&&ts>=0.3){ shooter._sirtDonuk=true; S._postup={tok:shooter,t:S.time}; }
    /* top hareketi */
    if(bizde&&!ucusta){
      const zi=Math.max(0,O.zincir.indexOf(carrier));
      const sonraki=O.zincir[zi+1]||null;
      const sutorde=(carrier===shooter);
      const sutSpot=spots.get(shooter);
      const sutYerinde=Math.hypot(shooter.x-sutSpot[0],shooter.y-sutSpot[1])<=30;
      if(sutorde){
        /* şutör topta: noktasına gelince ve takım oturunca (≥3/4 noktasında, en çok +0,8 sn) şut;
           süre dolunca her hâlükârda */
        let oturan=0; offR.forEach(p=>{ if(p===shooter||p._oob) return; const c=spots.get(p); if(c&&Math.hypot(p.x-c[0],p.y-c[1])<=24) oturan++; });
        const oturdu=(oturan>=3)||(O.holdT>=1.3)||O.putback||O.fastBreak;
        if((sutYerinde&&oturdu&&O.holdT>=0.3&&(ts>=O.setDur*0.55||O.putback||O.fastBreak))||kalan<=0.05||(O.holdT>2.4)){ oamAtes(); return; }
      } else {
        let alici=sonraki||shooter;
        const zor=(kalan<=0.9);                            /* bütçe: şutöre zorla */
        let hedef=zor?shooter:alici;
        /* mantıksız pas yoksa köprü: geri / boya içinden / 10 m+ pas yerine ara oyuncu */
        if(!oamPasOlur(carrier,hedef,rim)){
          const k=oamKopru(O,carrier,hedef);
          if(k&&!zor){ hedef=k; if(O.zincir.indexOf(k)<0) O.zincir.splice(zi+1,0,k); }
        }
        const hSpot=spots.get(hedef)||[hedef.x,hedef.y];
        const hYerinde=Math.hypot(hedef.x-hSpot[0],hedef.y-hSpot[1])<=36;
        const bos=oamBos(hedef,defP);
        if(zor){ if(O.holdT>=0.12) oamPas(hedef); }
        else if(O.holdT>=O.holdMin&&(hedef===shooter?sutYerinde:hYerinde)&&(bos||O.holdT>=O.holdMin+0.7)){
          oamPas(hedef); O.holdMin=0.4+_sr()*0.4;
        }
      }
    } else if(!bizde&&!ucusta&&carrier){ if(O.holdT>0.2){ _ballLoose(0,0,14); _chase(pg,null,2.2); O.holdT=0; } }
    else if(!bizde&&!ucusta&&!S.chase){ let en=null,ed=1e9; offP.forEach(p=>{ if(!p||p._oob) return; const d=Math.hypot(p.x-b.x,p.y-b.y); if(d<ed){ ed=d; en=p; } }); if(en) _chase(en,null,2.0); }
    if(kalan<=-1.2&&!O.atildi){ _ballHold(shooter); oamAtes(); return; }   /* güvenlik: bütçe bitti */
  }

  oamHedefler(S,O);
}

/* ── Hedefler: her karede her oyuncuya TEK hedef ───────────────────────────────────── */
function oamHedefler(S,O){
  const b=S.ball, {offP,defP,offR,defR,rim,dir,shooter,pg,spots,offLeft}=O;
  const carrier=b.carrier, bizde=!!(carrier&&offP.indexOf(carrier)>=0);
  const topX=b.x, topY=b.y;
  const topArkaSaha=offLeft?(topX>COURT_MID):(topX<COURT_MID);
  const ts=(O.faz==='set'&&O.tSet!=null)?(O.t-O.tSet):0;
  /* şuttan 0,7 sn önce ya da top şutördeyken dizilim DONAR: kıpırdanma ve yer değiştirme yok */
  O.donuk=(O.faz==='set'&&((O.tFire-O.t)<1.4||carrier===shooter));

  /* ── HÜCUM ── */
  offR.forEach((p,i)=>{
    if(!p||p._oob||(S.chase&&S.chase.tok===p)) return;
    const sp=spots.get(p)||[p.x,p.y];
    let tx=sp[0],ty=sp[1],urg=_URG.KOS;
    if(O.faz==='sokma'){
      const spot=O.spot; const ust=spot.y<250;
      const T=[[spot.x+dir*165,(ust?spot.y+65:spot.y-65)],[spot.x+dir*250,(ust?380:120)],null,[spot.x+dir*120,(ust?330:170)],[spot.x+dir*290,(ust?spot.y+40:spot.y-40)]];
      const c=(p===pg)?T[0]:(T[Math.min(i,4)]||null);
      if(c){ tx=c[0]; ty=c[1]; }
      urg=(p===pg||p.role<=1)?_URG.KOS:_URG.JOG;
    } else if(O.faz==='bekle'||O.faz==='gecis'){
      if(p===carrier){ urg=O.fastBreak?_URG.SPRINT:_URG.KOS; }
      else if(p.role===1||p.role===2) urg=_URG.SPRINT;
      else if(p.role>=3) urg=O.fastBreak?_URG.KOS:_URG.JOG;   /* uzunlar arkadan gelir */
      else urg=_URG.KOS;
      if(O.fastBreak&&p===shooter){ tx=O.sh.x; ty=O.sh.y; urg=_URG.SPRINT; }
    } else if(O.faz==='set'){
      urg=_URG.KOS;
      /* perde */
      if(O.isPnr&&O.screener&&p===O.screener&&O.perdeEvre>=1){
        const bh=bizde?carrier:pg; const dfn=O.esle.get(bh);
        if(O.perdeEvre<3&&dfn){ const ax=dfn.x-bh.x, ay=dfn.y-bh.y, an=Math.hypot(ax,ay)||1; tx=bh.x+ax/an*34+(-ay/an)*18*(O.screener.y<bh.y?-1:1); ty=bh.y+ay/an*34+(ax/an)*18*(O.screener.y<bh.y?-1:1); urg=_URG.KOS; }
        else { const roll=S._perde&&S._perde.roll; if(roll){ tx=rim[0]+(p===shooter?(O.sh.x-rim[0]):dir*-1*40); ty=rim[1]+(p===shooter?(O.sh.y-rim[1]):40); } else { tx=sp[0]; ty=sp[1]; } urg=_URG.SPRINT; }
      }
      /* topu tutan perdeyi kullanır */
      else if(O.isPnr&&O.screener&&p===carrier&&O.perdeEvre===2){
        const sc=O.screener; const dx=sc.x-p.x, dy=sc.y-p.y, dn=Math.hypot(dx,dy)||1;
        tx=sc.x+dx/dn*38; ty=sc.y+dy/dn*38; urg=_URG.KOS;
      }
      /* kesme */
      else if(O.cutter&&p===O.cutter&&ts>=0.6&&ts<2.2){
        tx=(p===shooter)?O.sh.x:(rim[0]+dir*-1*30); ty=(p===shooter)?O.sh.y:(rim[1]+(p.y<250?-26:26)); urg=_URG.SPRINT;
      }
      /* topu tutan: noktasına sürer, noktasındaysa hafif kıpırdar (şuttan önce donar) */
      else if(p===carrier){
        const d=Math.hypot(p.x-sp[0],p.y-sp[1]);
        if(d<OAM_YERINDE&&!O.donuk){ const c=oamCanli(p,sp[0],sp[1],11,O.ph.get(p)||0); tx=c[0]; ty=c[1]; }
        urg=(d>70)?_URG.KOS:_URG.JOG;
      }
      else {
        const d=Math.hypot(p.x-sp[0],p.y-sp[1]);
        if(d<OAM_YERINDE){ if(!O.donuk){ const c=oamCanli(p,sp[0],sp[1],9,O.ph.get(p)||0); tx=c[0]; ty=c[1]; } urg=_URG.JOG; }
        else urg=(d>70)?_URG.KOS:_URG.JOG;
      }
    }
    oamHedef(p,tx,ty,urg);
  });

  /* ── SAVUNMA: adam adama ── */
  const topTasiyan=bizde?carrier:null;
  defR.forEach((d,i)=>{
    if(!d||d._oob||(S.chase&&S.chase.tok===d)) return;
    const m=offR[i]||offR[0]; if(!m) return;
    let tx,ty,urg=_URG.KOS;
    const dm=oamDR(m,rim);
    if(O.faz==='sokma'){
      tx=(i<=1)?(COURT_MID+dir*90):(COURT_MID-dir*60); ty=TRANS_DEF[i][1]; urg=(i<=1)?_URG.KOS:_URG.JOG;
    } else if((O.faz==='bekle'||O.faz==='gecis')&&topArkaSaha){
      /* geri koş: adam-pota hattında %55, potaya en az 90 px */
      const g=Math.max(90,dm*0.45);
      tx=rim[0]+(m.x-rim[0])/(dm||1)*g; ty=rim[1]+(m.y-rim[1])/(dm||1)*g;
      urg=(i>=3)?(O.fastBreak?_URG.KOS:_URG.JOG):(O.fastBreak?_URG.SPRINT:_URG.KOS);   /* guardlar önce döner, uzunlar arkadan */
    } else {
      /* markaj: adam ile pota arasında */
      const onBall=(m===topTasiyan);
      const dmb=Math.hypot(m.x-topX,m.y-topY);
      let g;
      if(onBall) g=38;
      else {
        g=_defGap(dmb);
        const topIcerde=Math.hypot(topX-rim[0],topY-rim[1])<THREE_R-40;
        if(topIcerde&&dmb>200) g=Math.min(dm-30,70);         /* yardım: boyaya sark */
      }
      g=Math.min(g,Math.max(0,dm-26));
      tx=m.x+(rim[0]-m.x)/(dm||1)*g; ty=m.y+(rim[1]-m.y)/(dm||1)*g;
      const dd=Math.hypot(d.x-tx,d.y-ty);
      urg=onBall?_URG.KOS:(dd>90?_URG.KOS:_URG.JOG);
      d._mark=m;
      /* kıpırdanma adam–pota hattı ÜZERİNDE (radyal): hattan çıkmaz, ball-you-man bozulmaz */
      if(dd<OAM_YERINDE&&!O.donuk){ const k=5*Math.sin(S.time*2.1+(O.ph.get(d)||0)); const ux=(rim[0]-m.x)/(dm||1), uy=(rim[1]-m.y)/(dm||1); tx+=ux*k; ty+=uy*k; }
    }
    oamHedef(d,tx,ty,urg);
  });
}

/* ── Bağlama (eski fonksiyonlar sarmalanır; `OAM_ACIK=false` ile eski yol geri gelir) ── */
(function oamBagla(){
  if(typeof animateShotPossession!=='function'||typeof _simTick!=='function'||typeof movePlayersForEvent!=='function') return;
  const _eskiSut=animateShotPossession;
  animateShotPossession=function(sh,onShoot,onResult){
    if(!OAM_ACIK) return _eskiSut(sh,onShoot,onResult);
    try{ return oamSut(sh,onShoot,onResult); }catch(e){ try{ console.warn('OAM',e); }catch(_){} return _eskiSut(sh,onShoot,onResult); }
  };
  const _eskiTick=_simTick;
  _simTick=function(dt){
    const S=oamS(); const O=S&&S.oam; const aktif=!!(O&&O.aktif);
    if(aktif){
      try{ oamTick(dt); }catch(e){ try{ console.warn('OAM tick',e); }catch(_){} }
      /* F11-1: arka plandan dönüşte `_simCatchUp` jetonları ESKİ hedeflerine ışınlar, OAM aynı
         karede yeni hedef yazar; jetonlar yeniden yola çıkmasın diye yeni hedefe de oturtulur. */
      try{
        if(O._snapSeen==null) O._snapSeen=S._snapN|0;
        if((S._snapN|0)!==O._snapSeen){
          O._snapSeen=S._snapN|0;
          (S.players||[]).forEach(p=>{ if(!p||p._oob||!isFinite(p.tx)) return; p.x=_inX(p.tx); p.y=_inY(p.ty); p.vx=0; p.vy=0; try{ _tokSet(p.g,p.x,p.y,p.sc); }catch(_){} });
          if(S.ball&&S.ball.carrier){ S.ball.x=S.ball.carrier.x; S.ball.y=S.ball.carrier.y; }
        }
      }catch(e){}
    }
    if(aktif&&S){ const cs=S.canliSet; S.canliSet=false; S.defTrack=false; _eskiTick(dt); S.canliSet=cs; }
    else _eskiTick(dt);
  };
  const _eskiMove=movePlayersForEvent;
  movePlayersForEvent=function(ev,paint){
    try{ const S=oamS(); if(S&&S.oam&&S.oam.aktif){ S.oam.aktif=false; S.cikisSonra=0; } }catch(e){}
    return _eskiMove(ev,paint);
  };
})();
