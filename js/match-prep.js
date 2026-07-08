function updateStandingsFromResult(home,away,hs,as){
  const st=G.season.standings;
  if(!st||!st[home]||!st[away]) return;
  const rh=st[home], ra=st[away];
  rh.o++;
  ra.o++;
  rh.sf+=hs;
  rh.sa+=as;
  ra.sf+=as;
  ra.sa+=hs;
  if(hs>as){ rh.g++; ra.m++; }
  else if(as>hs){ ra.g++; rh.m++; }
  else {
    if(Math.random()<0.5){ rh.g++; ra.m++; }
    else { ra.g++; rh.m++; }
  }
}

function teamFormModifier(name,st){
  if(!st||!name) return 0;
  const r=st[name];
  if(!r||!r.o||r.o<1) return 0;
  const o=r.o;
  const w=(r.g||0)/o;
  const pd=(r.sf||0)-(r.sa||0);
  return (w-0.5)*23+pd*0.17;
}

function cpuScheduleTire(name,st){
  if(!st||!name) return 0;
  const r=st[name];
  if(!r||!r.o) return 0;
  return Math.min(11,(r.o||0)*0.3);
}

function statN(p,k){
  const v=Number(p&&p[k]);
  return Number.isFinite(v)?Math.min(99,Math.max(0,v)):0;
}
/* ── Menajer itibarı (Madde 9) + koç skoru (Madde 8) — küçük performans katmanları ── */
function managerRepBonus(){ return Math.max(0,Math.min(0.03,(Number(G.managerRep)||0)/450)); }
function coachScoreBonus(){
  const cs=(G.coaches||[]).filter(c=>c&&c.stat);
  if(!cs.length) return 0;
  const avg=cs.reduce((s,c)=>s+(Number(c.skor)||(Number(c.seviye)||1)*10),0)/cs.length;
  return Math.max(0,Math.min(0.025,(avg-30)/1600));
}
function teamBonusFactor(){ return 1+managerRepBonus()+coachScoreBonus(); }
/** Bot menajer itibarı — takım adından deterministik (kısmı hazır geçmişle gelir, Madde 9). */
function botManagerTitles(name){ return hash32('mgr'+String(name))%6; }
function botManagerRepText(name){
  const t=botManagerTitles(name);
  const rep=hash32('mgrrep'+String(name))%400;
  return {titles:t,rep:rep,text:t>=4?'Efsane menajer':t>=2?'Tecrübeli menajer':t>=1?'Yükselen menajer':'Çaylak menajer'};
}
/** Sağlıklı oyuncular üzerinden; top-10 genel sıralı ortalama OFR/DEF + ham toplamlar.
 *  Madde 3: her oyuncunun kendi enerjisi kendi katkısını ağırlıklandırır (yorgun yıldız gücü düşürür).
 *  Madde 4: takım moral (mood) + kimya küçük, sınırlı bir çarpan olarak dahil (±%~6). */
function computeRosterOfrDef(){
  const avail=(G.players||[]).filter(p=>!playerIsInjured(p));
  const top=avail.slice().sort((a,b)=>(b.genel||0)-(a.genel||0)).slice(0,10);
  if(!top.length) return {ofr:58,def:58,sumOfr:0,sumDef:0,n:0};
  let sumO=0,sumD=0;
  for(const p of top){
    const en=Math.max(0,Math.min(100,Number(p.enerji!=null?p.enerji:100)));
    const enW=0.85+en/100*0.15;   /* 0.85..1.0 — tam enerjide etkisiz, yorgunlukta gücü düşürür */
    sumO+=(statN(p,'hucum')*1.1+statN(p,'sutIsabeti')+statN(p,'pas')*0.75+statN(p,'topSurme')*0.55+statN(p,'hiz')*0.35)*enW;
    sumD+=(statN(p,'savunma')*1.15+statN(p,'blok')+statN(p,'topCalma')+statN(p,'ribaund')*0.45+statN(p,'dayaniklilik')*0.25)*enW;
  }
  const n=top.length;
  /* Moral/kimya bilerek burada uygulanmaz — bireysel şut formülünde (shooterAcc) çarpan olarak var;
     çift sayım güç dengesini (strengthEdge) kullanıcı lehine bozuyordu. Enerji ağırlığı yeterli. */
  return{
    ofr:Math.round(sumO/n),
    def:Math.round(sumD/n),
    sumOfr:Math.round(sumO),
    sumDef:Math.round(sumD),
    n
  };
}
/** Maç anlatımı için — sadece sakat olmayanlar. Kullanıcı ilk 5'i seçtiyse (G.lineup) o kullanılır;
 *  seçilmeyen/sakat kalan slotlar için yedek sırası (bench) ve en iyi genel fallback devreye girer. */
function matchLineup(){
  const avail=(G.players||[]).filter(p=>!playerIsInjured(p)).sort((a,b)=>(b.genel||0)-(a.genel||0));
  if(!avail.length) return null;
  const byId=id=>avail.find(p=>p.id===id);
  const used=new Set();
  const onCourt=[];
  const addP=p=>{ if(p&&!used.has(p.id)&&onCourt.length<5){ used.add(p.id); onCourt.push(p); } };
  /* 1) Kullanıcının seçtiği ilk 5 (sağlıklı olanlar) */
  const sel=(G.lineup&&Array.isArray(G.lineup.starters))?G.lineup.starters:[];
  sel.forEach(id=>addP(byId(id)));
  /* 2) Eksik slotları kullanıcının yedek sırasından doldur */
  const benchOrder=(G.lineup&&Array.isArray(G.lineup.bench))?G.lineup.bench:[];
  benchOrder.forEach(id=>addP(byId(id)));
  /* 3) Hâlâ eksikse en iyi genelden doldur (fallback / geriye dönük uyum) */
  avail.forEach(p=>addP(p));
  /* Pozisyonlara ata: önce doğal pozisyona, sonra kalanları sırayla */
  const slots={pg:null,sg:null,sf:null,pf:null,c:null};
  const order=['PG','SG','SF','PF','C'];
  const pool=onCourt.slice();
  order.forEach(poz=>{ const key=poz.toLowerCase(); const i=pool.findIndex(p=>p.poz===poz); if(i>=0){ slots[key]=pool[i]; pool.splice(i,1); } });
  order.forEach(poz=>{ const key=poz.toLowerCase(); if(!slots[key]&&pool.length){ slots[key]=pool.shift(); } });
  const onCourtIds=new Set(onCourt.map(p=>p.id));
  const bench=avail.filter(p=>!onCourtIds.has(p.id));
  return{pg:slots.pg,sg:slots.sg,sf:slots.sf,pf:slots.pf,c:slots.c,avail,onCourt,bench};
}
function pseudoTeamStrength(isim,tblKey){
  /* Madde 9: bot menajerin itibarı (hazır geçmiş) takıma küçük bir güç katkısı sağlar. */
  return 58+(seqFromName(String(isim),tblKey||'tbl')%4200)/100+botManagerTitles(isim)*0.4;
}

/** Yalnızca bot-bot maçları buradan geçer; kullanıcı maçları canlı motorla (generateMatchEvents) oynanır. */
function simulateCpuMatch(m){
  const k=G.team&&G.team.tblKey?G.team.tblKey:'tbl';
  const st=G.season&&G.season.standings?G.season.standings:null;
  const drift=(G.season&&G.season.drift)||{};
  let hr=pseudoTeamStrength(m.home,k)+(drift[m.home]||0)+teamFormModifier(m.home,st)-cpuScheduleTire(m.home,st);
  let ar=pseudoTeamStrength(m.away,k)+(drift[m.away]||0)+teamFormModifier(m.away,st)-cpuScheduleTire(m.away,st);
  /* Skor ölçeği kullanıcı maçlarıyla (canlı motor: 4×10 dk FIBA, ~85-95 sayı/takım) aynı bantta olsun ki
     lig tablosunda averaj (sayı farkı) tutarlı karşılaştırılabilsin. */
  const diff=Math.max(-35,Math.min(35,hr-ar));
  let hs=Math.round(86+rand(-8,8)+diff*0.6+2);   /* +2 ev sahibi avantajı */
  let as=Math.round(86+rand(-8,8)-diff*0.6);
  hs=Math.max(58,Math.min(125,hs));
  as=Math.max(58,Math.min(125,as));
  if(hs===as){ if(rand(0,1)) hs+=rand(2,6); else as+=rand(2,6); }  /* beraberlik → uzatma benzeri kırılma */
  m.hs=hs;
  m.as=as;
  m.played=true;
  updateStandingsFromResult(m.home,m.away,hs,as);
}

function simulateRoundCpuMatches(round){
  const uid=G.team.isim;
  G.season.matches.filter(m=>m.round===round&&!m.played&&m.home!==uid&&m.away!==uid).forEach(simulateCpuMatch);
}

function recoverStaminaBetweenMatchdays(prevDay,newDay){
  const days=Math.max(0,newDay-prevDay);
  if(days<=0) return;
  const rec=5+Math.min(18,Math.round(days*8.5));
  G.players.forEach(p=>{
    const k=Number(p.kondisyon)||66;
    const bonus=Math.round((k-52)/7);
    p.enerji=Math.min(100,Math.round(Number(p.enerji||100)+rec+bonus));
  });
}

/** Madde 30: yorgunluk yalnızca sahaya gerçekten çıkan oyunculara uygulanır.
 *  playedIds bir Set ise sadece o oyuncular yorulur; verilmezse eski davranış (OVR'a göre kademeli). */
function applyMatchFatigueToRoster(playedIds){
  const dayanCost=p=>{
    const dayan=Number(p.dayaniklilik)||60;
    const mit=Math.max(0,Math.min(8,Math.round((dayan-55)/10)));
    return Math.max(4,rand(9,20)-mit);
  };
  if(playedIds instanceof Set){
    G.players.forEach(p=>{
      if(!playedIds.has(p.id)) return;
      p.enerji=Math.max(0,Math.round((Number(p.enerji)||100)-dayanCost(p)));
    });
    return;
  }
  const sorted=G.players.slice().sort((a,b)=>(b.genel||0)-(a.genel||0));
  sorted.forEach((p,i)=>{
    const base=i<7?rand(9,20):rand(3,8);
    const dayan=Number(p.dayaniklilik)||60;
    const mit=Math.max(0,Math.min(8,Math.round((dayan-55)/10)));
    const cost=Math.max(4,base-mit);
    p.enerji=Math.max(0,Math.round((Number(p.enerji)||100)-cost));
  });
}

function playerIsInjured(p){
  if(!p||p.injReturnDay==null||p.injReturnDay===undefined||isNaN(p.injReturnDay)) return false;
  return (G.gameDay||1)<p.injReturnDay;
}

function clearResolvedInjuries(){
  const gd=G.gameDay||1;
  G.players.forEach(p=>{
    if(p.injReturnDay!=null && !isNaN(p.injReturnDay) && gd>=p.injReturnDay){
      delete p.injReturnDay;
      delete p.injuryEtiket;
      delete p.injuryBolge;
      delete p.injurySeverity;
      /* Madde 5: iyileşen oyuncu tam forma dönmemiş — ilk 3 maçta yeniden-sakatlanma riski yüksek. */
      p.formReturnMatches=3;
    }
  });
}

/* Faz 1.2: Kronik yorgunluk sayacı — bu maçta gerçekten oynayan (playedSet) ve maç ÖNCESİ
   enerjisi <68 olan oyuncunun sayacı artar (üst sınır 6); iyi enerjiyle oynayan ya da dinlenip
   enerjisi normale dönen oyuncunun sayacı sıfırlanır. Enerji HENÜZ düşürülmeden çağrılmalı. */
function updateChronicFatigue(playedSet){
  if(!(playedSet instanceof Set)||playedSet.size===0) return; /* güvenli: kadro bilinmiyorsa dokunma */
  if(!G.players) return;
  G.players.forEach(p=>{
    const pre=Number(p.enerji!=null?p.enerji:100);
    if(playedSet.has(p.id)){
      if(pre<68) p.kronikYorgunlukSayisi=Math.min(6,(Number(p.kronikYorgunlukSayisi)||0)+1);
      else p.kronikYorgunlukSayisi=0;
    } else if(pre>=68){
      p.kronikYorgunlukSayisi=0;
    }
  });
}

/** Şiddet ağırlıklı sakatlık seçimi — hafif sakatlıklar daha sık. */
function pickInjury(){
  const total=INJURIES.reduce((s,x)=>s+x.w,0);
  let r=Math.random()*total;
  for(const inj of INJURIES){ r-=inj.w; if(r<=0) return inj; }
  return INJURIES[0];
}

function rollInjuriesAfterUserMatch(){
  if(!G.players||!G.players.length) return;
  const gd=G.gameDay||1;
  const yeniSakatlar=[];
  G.players.forEach(p=>{
    if(playerIsInjured(p)) return;
    const yas=Number(p.yas)||25;
    const enerji=Number(p.enerji||100);
    let risk=yas>=36?0.17:yas>=33?0.11:yas>=30?0.078:yas>=27?0.052:0.034;
    if(enerji<52) risk*=1.58; else if(enerji<68) risk*=1.24;
    /* Faz 1.2: kronik yorgunluk — art arda düşük enerjiyle sahaya çıkan oyuncuda risk kademeli artar.
       Her ardışık yorgun maç +%15 ek risk, üst sınır +%60 (dengeyi bozmayacak makul tavan). */
    const kron=Number(p.kronikYorgunlukSayisi)||0;
    if(kron>0) risk*=1+Math.min(0.6,kron*0.15);
    /* Yeni dönen oyuncu tam form değil → daha yüksek yeniden-sakatlanma ihtimali. */
    const returning=Number(p.formReturnMatches||0)>0;
    if(returning) risk*=1.7;
    if(Math.random()<risk){
      const inj=pickInjury();
      p.injReturnDay=gd+rand(inj.minD,inj.maxD);
      p.injuryEtiket=inj.ad;
      p.injuryBolge=inj.bolge;
      p.injurySeverity=inj.siddet;
      p.formReturnMatches=0; /* yeniden sakatlandı, sayaç sıfırlanır */
      yeniSakatlar.push(p);
      dbg('sakat',p.isim,inj.ad,inj.siddet,'dönüşGün',p.injReturnDay);
    } else if(returning){
      p.formReturnMatches=Math.max(0,Number(p.formReturnMatches||0)-1);
    }
  });
  if(yeniSakatlar.length){
    const ilk=yeniSakatlar[0];
    const ek=yeniSakatlar.length>1?` (+${yeniSakatlar.length-1} oyuncu daha)`:'';
    showNotif(`🩹 ${ilk.isim} sakatlandı — ${ilk.injuryEtiket} (${ilk.injurySeverity}), dönüş Gün ${ilk.injReturnDay}.${ek}`,{critical:true});
    yeniSakatlar.forEach(p=>{
      pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--red);">🩹 <strong>${p.isim}</strong> sakatlandı — ${p.injuryEtiket} (${p.injurySeverity}). Tahmini dönüş: Gün ${p.injReturnDay}.</div>`);
    });
  }
}

/* A1: Oynanan rakip takımın kalıcı (önbellek) kadrosunda sakatlık açar/iyileştirir.
   Sadece kullanıcının o maçta karşılaştığı rakip için işlenir (basitlik/performans kararı:
   tüm bot-bot sakatlıklarını simüle etmek gereksiz yük getirir; kullanıcıya görünen rakip
   kadrolar kullanıcı takımıyla aynı derinlikte tutulur). İyileşen sakatlık gün geçince silinir. */
function rollInjuriesForBotClub(teamName,ligKey){
  try{
    if(!teamName||!ligKey) return;
    if(G.team&&teamName===G.team.isim) return; /* kullanıcı takımı ayrı sistemle işlenir */
    let cache={}; try{ cache=JSON.parse(localStorage.getItem(CLUB_CACHE_KEY)||'{}'); }catch(e){ cache={}; }
    const ck=ligKey+'||'+teamName;
    const row=cache[ck];
    if(!row||!Array.isArray(row.roster)) return;
    const gd=G.gameDay||1;
    let changed=false;
    row.roster.forEach(p=>{
      if(p.injReturnDay!=null && !isNaN(p.injReturnDay)){
        if(gd>=p.injReturnDay){ delete p.injReturnDay; delete p.injuryEtiket; delete p.injuryBolge; delete p.injurySeverity; changed=true; }
        else return; /* hâlâ sakat */
      }
      const yas=Number(p.yas)||25;
      let risk=yas>=33?0.075:yas>=30?0.055:0.038;
      if(Math.random()<risk){
        const inj=pickInjury();
        p.injReturnDay=gd+rand(inj.minD,inj.maxD);
        p.injuryEtiket=inj.ad; p.injuryBolge=inj.bolge; p.injurySeverity=inj.siddet;
        changed=true;
      }
    });
    if(changed){ cache[ck]=row; try{ localStorage.setItem(CLUB_CACHE_KEY,JSON.stringify(cache)); }catch(e){} }
  }catch(e){ dbg('opp injury',e); }
}

function seasonAllMatchesPlayed(){
  return G.season&&G.season.matches.every(m=>m.played);
}

function endLeagueSeasonIfDone(){
  if(!G.season||!G.season.active||!seasonAllMatchesPlayed()) return false;
  G.season.active=false;
  unlockAchievement('sezonTamam');
  G.managerRep=(Number(G.managerRep)||0)+1;
  try{
    const rows=buildLeagueRows(G.team.tblKey||'tbl');
    if(rows.findIndex(r=>r.isUser)===0){
      unlockAchievement('ligBirinci');
      G.managerRep+=5;
      G.managerHistory=Array.isArray(G.managerHistory)?G.managerHistory:[];
      G.managerHistory.push({year:G.season.year,basari:'Lig 1.liği'});
      awardCoaches('Lig 1.liği',5);
    }
  }catch(e){}
  pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--purple);">🏁 <strong>Sezon ${G.season.year}</strong> düzenli sezonu tamamlandı — ilk 8 takım playoff'a kaldı!</div>`);
  showNotif('Düzenli sezon bitti — playoff başlıyor!');
  startPlayoffs();
  return true;
}

/* ── Playoff sistemi (Madde 6) — ilk 8 takım, tek maç eleme (Çeyrek/Yarı/Final).
   Kullanıcı kendi maçlarını canlı oynar; bot maçları anında simüle edilir. Şampiyon = playoff kazananı. */
function playoffPickWinner(home,away){
  const k=G.team&&G.team.tblKey?G.team.tblKey:'tbl';
  const drift=(G.season&&G.season.drift)||{};
  const hr=pseudoTeamStrength(home,k)+(drift[home]||0);
  const ar=pseudoTeamStrength(away,k)+(drift[away]||0);
  const diff=Math.max(-35,Math.min(35,hr-ar));
  let hs=Math.round(86+rand(-8,8)+diff*0.6+2);
  let as=Math.round(86+rand(-8,8)-diff*0.6);
  hs=Math.max(58,Math.min(125,hs)); as=Math.max(58,Math.min(125,as));
  if(hs===as){ if(rand(0,1)) hs+=rand(2,6); else as+=rand(2,6); }
  return {hs,as,winner:hs>as?home:away};
}
function startPlayoffs(){
  try{
    const rows=buildLeagueRows(G.team.tblKey||'tbl').filter(r=>r&&!r.bos&&r.isim);
    const top=rows.slice(0,8).map(r=>r.isim);
    if(top.length<8){ /* grup küçükse playoff atla, doğrudan yeni sezon */ afterPlayoffsProceed(); return; }
    const pairs=[[0,7],[3,4],[1,6],[2,5]];
    const r0=pairs.map(([a,b])=>({home:top[a],away:top[b],hs:null,as:null,played:false,winner:null}));
    G.playoff={active:true,year:G.season.year,teams:top,round:0,rounds:[r0],champion:null};
    simPlayoffBotMatches();
    if(!userPlayoffMatch()) maybeAdvancePlayoff(); /* kullanıcı playoff dışıysa tümünü simüle et */
    renderLig();
    renderDashboardNextMatch();
    if(userPlayoffMatch()) showNotif('🏆 Playoff maçın hazır — Lig ekranından oyna!',{critical:true});
  }catch(e){ dbg('startPlayoffs',e); afterPlayoffsProceed(); }
}
function currentPlayoffRound(){ return G.playoff&&G.playoff.rounds?G.playoff.rounds[G.playoff.round]:null; }
function userPlayoffMatch(){
  const r=currentPlayoffRound();
  if(!r||!G.team) return null;
  return r.find(m=>!m.played&&(m.home===G.team.isim||m.away===G.team.isim))||null;
}
function simPlayoffBotMatches(){
  const r=currentPlayoffRound();
  if(!r) return;
  r.forEach(m=>{
    if(m.played) return;
    if(G.team&&(m.home===G.team.isim||m.away===G.team.isim)) return;
    const res=playoffPickWinner(m.home,m.away);
    m.hs=res.hs; m.as=res.as; m.winner=res.winner; m.played=true;
  });
}
function playoffRoundLabel(idx,total){
  /* total = o turdaki maç sayısı: 4→Çeyrek, 2→Yarı, 1→Final */
  return total>=4?'Çeyrek Final':total===2?'Yarı Final':'Final';
}
function maybeAdvancePlayoff(){
  const r=currentPlayoffRound();
  if(!r||!r.every(m=>m.played)) return;
  const winners=r.map(m=>m.winner).filter(Boolean);
  if(winners.length<=1){
    G.playoff.champion=winners[0]||null;
    G.playoff.active=false;
    finishPlayoffs();
    return;
  }
  const next=[];
  for(let i=0;i<winners.length;i+=2){ next.push({home:winners[i],away:winners[i+1],hs:null,as:null,played:false,winner:null}); }
  G.playoff.rounds.push(next);
  G.playoff.round++;
  simPlayoffBotMatches();
  if(!userPlayoffMatch()) maybeAdvancePlayoff();
}
function finishPlayoffs(){
  const champ=G.playoff&&G.playoff.champion;
  const userChamp=champ&&G.team&&champ===G.team.isim;
  if(userChamp){
    unlockAchievement('sampiyon');
    unlockAchievement('playoffSampiyon');
    const priz=ecoRound(rand(6000,12000));
    txn('Playoff şampiyonluk ödülü',priz);
    updateCoins();
    /* Madde 8/9: itibar + koç skoru artışı. */
    G.managerRep=(Number(G.managerRep)||0)+10;
    G.managerHistory=Array.isArray(G.managerHistory)?G.managerHistory:[];
    G.managerHistory.push({year:G.playoff.year,basari:'Playoff Şampiyonluğu'});
    awardCoaches('Playoff Şampiyonluğu',10);
    showNotif(`🏆 ${G.team.isim} PLAYOFF ŞAMPİYONU! +${fmtn(priz)} KR · itibar arttı`,{critical:true});
  } else {
    showNotif(`🏆 Playoff şampiyonu: ${champ||'—'}`);
  }
  pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--gold);">🏆 <strong>Sezon ${G.playoff?G.playoff.year:''}</strong> playoff şampiyonu: <strong>${escMatch(champ||'—')}</strong>${userChamp?' — TEBRİKLER!':''}</div>`);
  afterPlayoffsProceed();
}
function afterPlayoffsProceed(){
  setTimeout(()=>{
    if(G.team) ensureLeagueSeasonOrStart();
    renderLig();
    renderFixture();
    renderDashboardNextMatch();
  },1200);
}

function ensureLeagueSeasonOrStart(){
  if(!G.team||!G.team.tblKey) return;
  const s=G.season;
  if(s&&s.active&&!seasonAllMatchesPlayed()) return;
  startLeagueSeason();
}

function startLeagueSeason(){
  if(!G.team||!G.team.tblKey){ showNotif('Önce takım oluştur.'); return; }
  if(G.season&&G.season.active&&!seasonAllMatchesPlayed()){ showNotif('Sezon zaten devam ediyor.'); return; }
  const sub=getTblState().subs[G.team.tblKey];
  if(!sub||!sub.teams){ showNotif('Lig verisi yok.'); return; }
  const names=sub.teams.filter(Boolean);
  if(names.length!==LEAGUE_SIZE){ showNotif('Grupta 20 kulüp olmalı; eksik slot var.'); return; }
  G.ligTeams=genLigTeams();
  const matches=genRoundRobinMatches(names);
  assignSeasonMatchdays(matches,30);
  assignSeasonKickoffs(matches);
  const prevY=G.season&&G.season.year?G.season.year:0;
  /* Sezon geçişi: sözleşmeler 1 sezon azalır; biten sözleşme güncel yetenekle otomatik yenilenir (imza bedeli 2 haftalık maaş). */
  if(prevY>0){
    const ayrilanlar=[];
    (G.players||[]).forEach(p=>{
      p.kontratSezon=(p.kontratSezon!=null?p.kontratSezon:rand(1,3))-1;
      if(p.kontratSezon<=0){
        /* Madde 19: sözleşme bitti. Kullanıcı erkenden uzatmadıysa, moral/performansa bağlı bir
           olasılıkla oyuncu serbest kalıp ayrılır (takımı kaybetme riski). Aksi halde yeniler. */
        const mood=Number(p.mood!=null?p.mood:70);
        const macSay=(p.sezon&&p.sezon.mac)||0;
        let leaveChance=0.16;
        if(mood<35) leaveChance+=0.40; else if(mood<50) leaveChance+=0.24; else if(mood<65) leaveChance+=0.10;
        if(macSay<4) leaveChance+=0.12;               /* az forma giren oyuncu ayrılmaya daha meyilli */
        if((Number(p.yas)||25)>=34) leaveChance+=0.08; /* yaşlı oyuncu emeklilik/ayrılığa yakın */
        leaveChance=Math.min(0.85,leaveChance);
        if(Math.random()<leaveChance){
          ayrilanlar.push(p);
          return;
        }
        const yeniMaas=salaryKRFromGenel(p.genel);
        const imza=yeniMaas*2;
        p.maas=yeniMaas;
        p.kontratSezon=rand(1,3);
        txn('Sözleşme yenileme: '+p.isim,-imza);
        pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--gold);">✍️ <strong>${p.isim}</strong> sözleşme yeniledi — yeni maaş ${fmtn(yeniMaas)} KR/hf, imza bedeli ${fmtn(imza)} KR (${p.kontratSezon} sezon).</div>`);
      }
      p.sezon={mac:0,pts:0,ast:0,reb:0};
      const y=Number(p.yas)||25;
      p.yas=y+1; /* oyuncular sezonla yaşlanır */
      /* Madde 22: yaşa bağlı gerileme — 32+ fiziksel statlarda küçük sezonluk düşüş. */
      const na=p.yas;
      if(na>=32){
        const decl=na>=37?rand(2,4):na>=35?rand(1,3):rand(1,2);
        ['hiz','kondisyon','dayaniklilik','topSurme','blok','topCalma'].forEach(k=>{ p[k]=Math.max(30,(Number(p[k])||50)-decl); });
        if(na>=35){ p.sutIsabeti=Math.max(30,(Number(p.sutIsabeti)||50)-1); p.hucum=Math.max(30,(Number(p.hucum)||50)-1); p.savunma=Math.max(30,(Number(p.savunma)||50)-1); }
        p.genel=Math.round(STAT_KEYS.reduce((s,k)=>s+(Number(p[k])||0),0)/STAT_KEYS.length);
        p.potansiyel=Math.max(p.genel,Number(p.potansiyel)||0); /* artık gelişmez */
      }
    });
    /* Madde 19: sözleşmesi biten ayrılıkçıları önce kadrodan çıkar (emeklilik/altyapı ondan sonra işlesin). */
    if(ayrilanlar.length){
      const kalan=(G.players||[]).length-ayrilanlar.length;
      if(kalan>=8){
        ayrilanlar.forEach(p=>{
          G.players=G.players.filter(x=>x.id!==p.id);
          pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--red);">🚪 <strong>${p.isim}</strong> sözleşmesi bitti ve serbest kaldı — başka takıma gitti. Erken uzatma yapılmamıştı.</div>`);
        });
        showNotif(`⚠️ ${ayrilanlar.length} oyuncu sözleşmesi bitti ve takımdan ayrıldı!`,{critical:true});
      } else {
        ayrilanlar.forEach(p=>{ p.maas=salaryKRFromGenel(p.genel); p.kontratSezon=rand(1,2); });
      }
    }
    /* Madde 22: emeklilik — ileri yaşta kulüpten ayrılır, slot boşalır (kadro min 8 korunur). */
    const emekli=[];
    (G.players||[]).forEach(p=>{
      const y=Number(p.yas)||25;
      let rc=0;
      if(y>=40) rc=0.92; else if(y>=38) rc=0.45; else if(y>=37) rc=0.22; else if(y>=36) rc=0.10;
      if(rc>0&&Math.random()<rc) emekli.push(p);
    });
    if(emekli.length&&(G.players.length-emekli.length)>=8){
      emekli.forEach(p=>{
        G.players=G.players.filter(x=>x.id!==p.id);
        pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--purple);">🎓 <strong>${p.isim}</strong> (${p.yas}) basketbolu bıraktı — emekli oldu. Kadro slotu boşaldı.</div>`);
      });
      showNotif(`${emekli.length} oyuncu emekli oldu.`);
    }
    /* Madde 21: altyapı gençleri de yaşlanır; 21+ olan hâlâ terfi etmemiş gençler terfi eder ya da ayrılır. */
    (G.youth||[]).forEach(p=>{ p.yas=(Number(p.yas)||17)+1; });
    const grads=(G.youth||[]).filter(p=>(Number(p.yas)||17)>=21);
    grads.forEach(p=>{
      G.youth=G.youth.filter(x=>x.id!==p.id);
      if((G.players||[]).length<18){
        p.maas=salaryKRFromGenel(p.genel);
        if(p.enerji==null||p.enerji==='') p.enerji=100;
        p.kontratSezon=rand(2,3);
        p.sezon={mac:0,pts:0,ast:0,reb:0};
        G.players.push(p);
        pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--green);">⬆️ <strong>${p.isim}</strong> (21) altyapıdan A takıma terfi etti.</div>`);
      } else {
        pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--gold);">🚪 <strong>${p.isim}</strong> (21) altyapıdan ayrıldı — A takımda yer yoktu, terfi edemedi.</div>`);
      }
    });
    if(G.players) ensureUniquePlayerNames(G.players);
    ensureYouthStock(); /* Madde 28: altyapı havuzunu sezon başında hedefe tamamla */
  }
  G.playoff=null; /* önceki sezonun playoff'unu temizle */
  G.season={
    active:true,
    year:prevY+1,
    matches,
    standings:initStandingsForTeams(names),
    drift:{},
    _lastRecoveryDay:0
  };
  G.wins=0;
  G.losses=0;
  G.points=0;
  G.winStreak=0; /* A4: galibiyet serisi her yeni sezon başında sıfırlanır (seri sezona devretmez). */
  G.gameDay=1;
  G.lastEcoDay=1;
  regenerateSeasonFixtures();
  syncUserRecordFromStandings();
  updateStats();
  renderLig();
  renderFixture();
  renderDashboardNextMatch();
  if(document.getElementById('page-dashboard')&&document.getElementById('page-dashboard').classList.contains('active')) renderDashboardNews();
  pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--gold);">🏀 <strong>Sezon ${G.season.year}</strong> — ${formatTblSlotLabel(G.team.tblKey)} · ${totalRounds()} tur (tek devre). Fikstür, tablo ve skorlar tek kaynaktan.</div>`);
  showNotif('Sezon başladı.');
  scheduleGameSave();
}

