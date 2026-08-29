/** Maçı büyük ekranda izle — canlı paneli tam ekran kaplar (küçük ekran şikayeti için). */
function toggleMatchTheater(force){
  const el=document.getElementById('macLiveAnchor');
  if(!el) return;
  const on=(force===undefined)?!el.classList.contains('mac-theater'):!!force;
  el.classList.toggle('mac-theater',on);
  document.body.classList.toggle('theater-open',on);
  const btn=document.getElementById('theaterBtn');
  if(btn){ btn.textContent=on?'✕ Küçült':'⛶ Büyük Ekran'; btn.classList.toggle('on',on); }
  if(on){
    if(!window._theaterEsc){
      window._theaterEsc=(e)=>{ if(e.key==='Escape') toggleMatchTheater(false); };
      document.addEventListener('keydown',window._theaterEsc);
    }
    try{ el.scrollIntoView({block:'start'}); }catch(_){}
  } else if(window._theaterEsc){
    document.removeEventListener('keydown',window._theaterEsc);
    window._theaterEsc=null;
    setTimeout(()=>scrollToMacLive(false),60);
  }
}
/** Ana panel / fikstür kartından sıradaki maçı doğrudan başlat (test kolaylığı). */
function startNextMatchNow(){
  if(!G.team){ showNotif('Önce takım oluştur.'); return; }
  gotoMacPage();
  if(mState.running){ setTimeout(()=>scrollToMacLive(),80); return; }
  if(!G.season||!G.season.active){ setTimeout(()=>scrollToMacLive(false),80); showNotif('Önce Lig’den sezonu başlat.'); return; }
  const m=findNextUserSeasonMatch();
  if(!m){ showNotif(seasonAllMatchesPlayed()?'Bu sezonun maçların bitti.':'Sıradaki maç bulunamadı.'); return; }
  /* Önce maçı başlat (panel içeriği dolsun, .live-on gelsin), sonra panele kaydır. */
  startMatch();
  setTimeout(()=>scrollToMacLive(),90);
}
function startPlayoffMatch(){
  const m=userPlayoffMatch();
  if(!m){ showNotif('Oynanacak playoff maçın yok.'); return; }
  const opp=m.home===G.team.isim?m.away:m.home;
  const userIsHome=m.home===G.team.isim;
  startMatch({opp,userIsHome,matchup:m});
}
/* Paket 1 (14. oturum): kullanıcının vadesi gelen kupa maçını canlı başlat. */
function startCupMatch(){
  const m=(typeof cupUserMatch==='function')?cupUserMatch():null;
  if(!m){ showNotif('Oynanacak kupa maçın yok.'); return; }
  if(G.cup.round>=_cupDueRounds()){ showNotif('Kupa maçının vakti gelmedi — önce sıradaki lig turunu tamamla.'); return; }
  const userIsHome=m.home===G.team.isim;
  const opp=userIsHome?m.away:m.home;
  gotoMacPage();
  startMatch({cup:true,opp,userIsHome});
  setTimeout(()=>scrollToMacLive(),90);
}
/* Madde 7: maç canlıyken "Maçı Başlat" butonları (Maçlar sayfası + Ana Panel kartı)
   pasif ve etiketli olsun — tekrar tıklama zaten startMatch() içinde engelli, bu UX cilası. */
function setMatchButtonsRunning(running){
  const b=document.getElementById('startMatchBtn');
  if(b){
    b.disabled=!!running;
    if(running){ b.textContent='⏳ Maç Devam Ediyor'; b.title='Maç canlı oynanıyor.'; }
  }
  const card=document.getElementById('dashNextCard');
  if(card){
    const db=card.querySelector('.dn-play');
    if(db){
      db.disabled=!!running;
      if(running) db.textContent='⏳ Maç Devam Ediyor';
    }
  }
}
function startMatch(playoff){
  if(mState.running) return;
  if(!G.team){ showNotif('Önce takım oluştur.'); return; }
  /* C1: buton "sonuçlandır" durumundaysa normale döndür. */
  const _smBtn=document.getElementById('startMatchBtn');
  if(_smBtn){ _smBtn.textContent='▶ Maçı Başlat'; _smBtn.removeAttribute('title'); }
  const isPlayoff=!!(playoff&&playoff.matchup);
  const isCup=!!(playoff&&playoff.cup);   /* Paket 1: kupa modu — startCupMatch() geçirir */
  let match=null,rakip,userIsHome;
  if(isPlayoff||isCup){
    rakip={isim:playoff.opp};
    userIsHome=!!playoff.userIsHome;
  } else {
    if(!G.season||!G.season.active){ showNotif('Önce Lig’den sezonu başlat.'); return; }
    match=findNextUserSeasonMatch();
    if(!match){ showNotif(seasonAllMatchesPlayed()?'Bu sezonun maçların bitti.':'Fikstürde maç yok.'); return; }
    rakip={isim:match.home===G.team.isim?match.away:match.home};
    userIsHome=match.home===G.team.isim;
  }
  /* C1: Maç imzası — durdurma/yenileme sonrası aynı maçı tanımak için. */
  const sig=isCup
    ? ('kupa|'+((G.cup&&G.cup.year)||0)+'|r'+((G.cup&&G.cup.round)||0))
    : isPlayoff
    ? ('po|'+((G.playoff&&G.playoff.round)||0)+'|'+playoff.matchup.home+'|'+playoff.matchup.away+'|g'+(playoff.matchup.gameNo||1))
    : ('lig|'+match.seasonMatchIx);
  /* C1: Bu maç daha önce başlatılıp sonucu kilitlenmişse (kaybederken durdurup çıkma / sayfa
     yenileme) YENİDEN ÜRETME — aynı kilitli sonucu uygula. Sonucu silip yeniden oynama açığı kapanır. */
  if(G.pendingMatch && G.pendingMatch.sig===sig && G.pendingMatch.ev){
    const ctx=isCup
      ? {seasonMatchIx:-1,isPlayoff:false,isCup:true,playoffMatch:null,rakipName:rakip.isim,userIsHome}
      : isPlayoff
      ? {seasonMatchIx:-1,isPlayoff:true,playoffMatch:userPlayoffMatch(),rakipName:rakip.isim,userIsHome}
      : {seasonMatchIx:match.seasonMatchIx,isPlayoff:false,playoffMatch:null,rakipName:rakip.isim,userIsHome};
    showNotif('Bu maç zaten oynanmıştı — sonucu kilitliydi, aynı sonuç uygulandı.',{critical:true});
    applyMatchResult(G.pendingMatch.ev,ctx);
    return;
  }
  const lu=matchLineup();
  if(!lu||lu.avail.length<5){ showNotif('Maça en az 5 sağlıklı oyuncu gerekli (sakatlar sahaya çıkmaz).'); return; }
  if(isPlayoff||isCup){ recoverStaminaBetweenMatchdays((G.gameDay||1)-3,G.gameDay||1); }
  else { recoverStaminaBetweenMatchdays(G.season._lastRecoveryDay||0, match.day); G.season._lastRecoveryDay=match.day; }
  const events=generateMatchEvents(rakip,{userIsHome});
  mState={running:true,events,idx:0,score:[0,0],quarter:1,time:MATCH_CLOCK_SEC,allShots:[],shotFilter:'live',_ballXY:[470,250],rakipName:rakip.isim,seasonMatchIx:(isPlayoff||isCup)?-1:match.seasonMatchIx,seasonRound:(isPlayoff||isCup)?0:match.round,userIsHome,isPlayoff,isCup,playoffMatch:isPlayoff?playoff.matchup:null,
    manualCoach:false,spId:null,
    userCourtIds:(lu.onCourt||[]).map(p=>p.id),
    benchIds:(lu.bench||[]).map(p=>p.id),
    subbedIds:new Set(),
    subsLeft:3,
    timeoutsLeft:5,          /* mola hakkı (FIBA benzeri) */
    paused:false,            /* mola/dead-ball duraklatması */
    restBonus:{},            /* mola ile tazelenen enerji (göstergeye eklenir) */
    rate:_matchRate,           /* izleme hızı — hem animasyon hem olay temposu */
    _clkNow:MATCH_CLOCK_SEC,   /* akan maç saati (sn, kesirli) */
    _scOff:null,_scAnchor:MATCH_CLOCK_SEC,
    energyStart:Object.fromEntries((G.players||[]).map(p=>[p.id,Number(p.enerji!=null?p.enerji:100)]))};
  /* C1: Sonucu maç başında kilitle ve kalıcı kaydet. Canlı izleme sadece görselleştirmedir;
     yarıda durdurup/yenileyip yeniden başlatınca aynı kilitli sonuç uygulanır. */
  mState.sig=sig;
  G.pendingMatch={sig,ev:events[events.length-1]||null};
  saveGameNow(false);

  document.querySelectorAll('input[name="shotQ"]').forEach(r=>{ r.checked=(r.value==='live'); });
  updateTimeoutBtn();
  clearMatchEventTimer();
  clearMatchCourt();
  updateCourtBranding(rakip);          /* parkeye arena/takım/amblem işle */
  /* M7: rakip beşli MOTORDAN gelir (sakat filtresi + rotasyon motorda yapılır).
     Motor damgalamadıysa eski yönteme düşülür (geriye dönük güvenlik). */
  let oppFive=[];
  try{
    const stamped=(events&&events[0]&&Array.isArray(events[0].oppFive))?events[0].oppFive:null;
    if(stamped&&stamped.length) oppFive=stamped.slice(0,5);
    else { const prof=getBotClubProfile(rakip.isim,(G.team&&G.team.tblKey)||'tbl'); oppFive=(prof.roster||[]).slice().sort((a,b)=>(b.genel||0)-(a.genel||0)).slice(0,5); }
  }catch(e){}
  initMatchPlayers(lu,rakip,oppFive); /* sahaya 5v5 jeton — rakibin TAM oyuncu nesneleri (isim+hiz+enerji) */
  startCrowdAmbience();               /* Paket 3: salon uğultusu maç boyunca */
  const _ml=document.getElementById('macLiveAnchor'); if(_ml) _ml.classList.add('live-on');
  renderBoxScore(emptyBox(),emptyBox(),G.team.isim,rakip.isim);
  document.getElementById('commentary').innerHTML='';
  document.getElementById('liveScoreHome').textContent='0';
  document.getElementById('liveScoreAway').textContent='0';
  document.getElementById('liveQuarter').textContent='1. Periyot';
  document.getElementById('liveTime').textContent='10:00';
  stopClockTween();
  setMatchRate(_matchRate);
  { const _sc=document.getElementById('liveShotClock'); if(_sc) _sc.textContent=''; }
  document.getElementById('liveStatus').textContent='CANLI';
  document.getElementById('liveStatus').style.background='rgba(239,68,68,0.2)';
  document.getElementById('liveStatus').style.color='#f87171';
  document.getElementById('liveHome').textContent=G.team.isim;
  document.getElementById('liveAway').textContent=rakip.isim;
  document.getElementById('liveBadge').style.display='inline-block';
  updateQuarterBoard({1:0,2:0,3:0,4:0},{1:0,2:0,3:0,4:0},0,0);
  setMatchButtonsRunning(true);

  function matchStep(){
    if(!mState.running)return;
    if(mState.idx>=mState.events.length){
      clearMatchEventTimer();
      return;
    }
    const ev=mState.events[mState.idx];
    mState.idx++;

    /* İç durum HEMEN güncellenir (duraklatma/kilit güvenliği için). */
    if(ev.home!==undefined) mState.score=[ev.home,ev.away];
    if(ev.q){
      const qChanged=mState.quarter!==ev.q;
      mState.quarter=ev.q;
      document.getElementById('liveQuarter').textContent=ev.q<=4?`${ev.q}. Periyot`:`Uzatma ${ev.q-4}`;
      /* Çeyrek değişince canlı şut haritası sıfırlanır (filtre 'live' ise yeni çeyrek boş başlar). */
      if(qChanged) redrawAllShots();
    }
    /* SENKRON: skor tabelası + kutu skor + çeyrek panosu + ANLATIM tek pakette basılır ve
       olayın SAHADA gerçekleştiği kareye bağlanır (şut → top çemberde, çalma → topun
       kapıldığı an, ribaund → topun alındığı an, faul → düdük). Serbest atışta metin
       ikiye ayrılır: düdük cümlesi hemen, "x/y" sonucu son atış çemberden geçince. */
    let _scorePainted=false;
    const paintScore=()=>{
      if(_scorePainted) return; _scorePainted=true;
      if(ev.home!==undefined){
        document.getElementById('liveScoreHome').textContent=ev.home;
        document.getElementById('liveScoreAway').textContent=ev.away;
      }
      if(ev.box) renderBoxScore(ev.box.h,ev.box.a,G.team.isim,mState.rakipName);
      if(ev.qh&&ev.qa) updateQuarterBoard(ev.qh,ev.qa,ev.home||0,ev.away||0);
    };
    const paint=(mode)=>{
      if(mode==='pre'){ addComment(ev.ftPre||ev.text,ev.type); return; }   /* faul düdüğü — sonuç YOK */
      if(mode==='res'){ paintScore(); if(ev.ftRes) addComment(ev.ftRes,ev.type); return; }
      paintScore();
      addComment(ev.text,ev.type);
    };
    /* Önce oyuncuları yerleştir (top bu GERÇEK konumlara paslanacak), sonra topu canlandır.
       Dönen süre (sim-ms) koreografinin uzunluğu; izleme hızına bölünerek gerçek gecikmeye
       çevrilir (hava atışı, serbest atış dizisi vb. asla yarıda kesilmez). */
    const isShot=!!ev.shot;
    const mvMs=movePlayersForEvent(ev,isShot?null:paint)||0;
    const _h=mState._evH||{paint:false,marks:false};
    if(isShot){
      const sh={...ev.shot};
      mState.allShots.push(sh);
      /* Gerçekçi hücum: top oyuna sokulur, geçiş, set, şut.
         İz top elden çıkarken; SKOR+ANLATIM+ses top çembere varınca (tam senkron). */
      mState._animMs=animateShotPossession(sh,
        ()=>{ if(shotPassesFilter(sh)) drawShotMark(sh); },
        ()=>{ paint(); if(sh.made) sfx('score'); })||2900;
    } else {
      if(ev.shots&&!_h.marks){
        ev.shots.forEach(sh=>{
          mState.allShots.push(sh);
          if(shotPassesFilter(sh)) drawShotMark(sh);
        });
      }
      if(!_h.paint) paint();
    }
    /* Saha-şutunun sesi top potaya varınca çalar (yukarıda); serbest atış vb. anında. */
    if((ev.type==='score3'||ev.type==='score2')&&!ev.shot) sfx('score');
    if(ev.type==='free') sfx('score');
    if(ev.type==='mvp'){
      unlockAchievement('mvpOyuncu'); sfx('achv');
      /* Paket B: MVP, draftta seçilmiş bir kadro oyuncusuysa "Doğru Seçim". */
      try{ const mp=ev.mvpId&&(G.players||[]).find(p=>p.id===ev.mvpId); if(mp&&mp.draftYili!=null) unlockAchievement('dogruSecim'); }catch(e){}
    }
    /* Paket 3: atmosfer — faulde düdük, çeyrek başında düdük, çeyrek/maç sonunda korna. */
    if(ev.type==='foul'||ev.type==='quarter_start') sfx('whistle');
    if(ev.type==='quarter_end') sfx('buzzer');

    /* Madde 12: canlı kadro/foul takibi */
    if(ev.spId&&!mState.spId) mState.spId=ev.spId;
    if(ev.subOut){
      const i=mState.userCourtIds.indexOf(ev.subOut);
      if(ev.subIn){ if(i>=0) mState.userCourtIds[i]=ev.subIn; else mState.userCourtIds.push(ev.subIn); mState.subbedIds.add(ev.subIn); }
      else if(i>=0) mState.userCourtIds.splice(i,1);
      /* Saha jetonu da yeni oyuncuya geçsin (isim etiketi + hız). */
      if(ev.subIn){
        const inP=(G.players||[]).find(pp=>pp.id===ev.subIn);
        if(inP) swapCourtToken(ev.subOut,inP);
      }
    }
    /* Rakip tarafı: bot oyuncular G.players'ta yok, event nesneyi doğrudan taşır. */
    if(ev.subOutObj&&ev.subInObj) swapCourtToken(ev.subOutObj.id,ev.subInObj);
    if(ev.type==='quarter_start'){ mState.subsLeft=3; }
    /* Manuel koçluk açıksa çeyrek/ölü top arasında duraklat, değişiklik penceresini göster. */
    if(mState.manualCoach && (ev.type==='quarter_end' || (ev.type==='tactic'&&ev.t<=320)) && ev.q<=4 && mState.idx<mState.events.length){
      clearMatchEventTimer();
      clearBallTimers();
      mState.paused=true;
      renderCoachingPanel(true);
      return;
    }
    if(mState.manualCoach) renderCoachingPanel(false);

    if(ev.type==='end'){
      clearMatchEventTimer();
      mState.running=false;
      stopClockTween();
      { const _sc=document.getElementById('liveShotClock'); if(_sc) _sc.textContent=''; }
      sfx('buzzer');
      stopCrowdAmbience();
      document.getElementById('liveStatus').textContent='BİTTİ';
      document.getElementById('liveStatus').style.background='rgba(34,197,94,0.2)';
      document.getElementById('liveStatus').style.color='#4ade80';
      document.getElementById('liveBadge').style.display='none';
      const _mle=document.getElementById('macLiveAnchor'); if(_mle) _mle.classList.remove('live-on');
      setMatchButtonsRunning(false);
      applyMatchResult(ev,{seasonMatchIx:mState.seasonMatchIx,isPlayoff:mState.isPlayoff,isCup:mState.isCup,playoffMatch:mState.playoffMatch,rakipName:mState.rakipName,userIsHome:mState.userIsHome});
      return;
    }
    /* Şutlu hücumun süresi hücum türüne ve oyuncuların GERÇEK varış sürelerine göre değişir:
       putback ~1.7sn, hızlı hücum ~2-3sn, set oyunu ~3-5sn (animateShotPossession döndürür).
       Şutsuz olaylarda taban gecikme ile koreografi süresinin (mvMs) büyüğü kullanılır —
       hava atışı, çeyrek başı yandan sokma ve serbest atış dizisi asla yarıda kesilmez. */
    const simBase=ev.shot?((mState._animMs||2900)+240):(ev.type==='free'?1700:(ev.type==='quarter_start'||ev.type==='quarter_end'||ev.type==='tactic'?1500:1300));
    const simMs=ev.shot?simBase:Math.max(simBase,mvMs+260);
    const rate=Math.max(0.5,Math.min(4,mState.rate||1));
    /* FAZ 1 / M1+M2: gecikmenin ASIL kaynağı, pozisyonun tükettiği maç saatidir (ev.dt).
       MATCH_TIME_SCALE = izleme sıkıştırması: 12 sn'lik pozisyon 12×0.30 = 3,6 gerçek sn oynanır.
       Koreografi süresi (simMs) yalnız ALT SINIRDIR — hava atışı/serbest atış dizisi kesilmesin.
       Böylece faul/taktik/çalma gibi "ucuz" olaylar da saatten yedikleri kadar sürer;
       eskiden sabit 1300-1700 ms taban yüzünden 20-44× hızlanma oluyordu. */
    const dtMs=(Number(ev.dt)>0?Number(ev.dt):12)*1000*MATCH_TIME_SCALE;
    const delay=Math.max(140,Math.max(simMs,dtMs)/rate);
    /* Maç saati olaylar arasında GERÇEK ZAMANDA akar (eskiden 10-20 sn'lik sıçramalar);
       şut saati de aynı akıştan beslenir. */
    if(ev.t!==undefined) startClockTween(ev.t,delay,ev.type);
    /* M11: hız değişince kalan süre yeniden ölçeklenebilsin diye zamanlayıcı damgalanır. */
    mState._stepAt=Date.now(); mState._stepDelay=delay; mState._stepRate=rate;
    /* M3 (tamamlayıcı): şutlu olayda sonuç cümlesi top çembere varınca basılır. Kare
       düşmesi / arka plan yüzünden koreografi tahmini süreden GEÇ biterse, sıradaki
       olaya geçmeden önce sonucun basılmasını bekle (sınırlı süre). Böylece cümle ne
       kaybolur (orphan) ne de erken basılır (kimlik uyuşmazlığı). */
    mState._waitRes=isShot?(Date.now()+delay+Math.max(600,Math.min(2200,delay*0.9))):0;
    matchEventTimer=setTimeout(stepGuarded,delay);
  }
  /* Sonuç cümlesi hâlâ bekliyorsa kısa aralıklarla yeniden dene; süre aşımında ilerle
     (kilitlenme yok). setMatchRate ve visibilitychange de bu sarmalayıcıyı kullanır. */
  function stepGuarded(){
    try{
      const S=(typeof mState!=='undefined'&&mState)?mState._sim:null;
      if(mState._waitRes&&S&&typeof S.pendingPaint==='function'&&Date.now()<mState._waitRes){
        matchEventTimer=setTimeout(stepGuarded,60);
        return;
      }
    }catch(e){}
    mState._waitRes=0;
    matchStep();
  }
  mState.step=stepGuarded;
  matchStep();
}

/* ── İzleme hızı ──────────────────────────────────────────────────────────
   Tüm canlı sahne "sim-saniyesi" cinsinden kurulur; rate hem rAF adımını
   (js/match-engine.js `_simStep`) hem olaylar arası gecikmeyi ölçekler.
   Böylece 2×'te oyun hızlanır ama hareketin/anlatımın uyumu bozulmaz. */
/* FAZ 1 / M16: varsayılan izleme hızı 1×. Oyun eskiden kullanıcı hiçbir şey seçmeden
   %50 hızlandırılmış başlıyordu; "çok hızlı" şikâyetinin bir kısmı doğrudan buydu. */
let _matchRate=1;
/* Maç saati → gerçek zaman sıkıştırma katsayısı (M1). 0.30 ≈ 3,3× izleme hızı. */
const MATCH_TIME_SCALE=0.30;
function setMatchRate(r,btn){
  const _prev=_matchRate;
  _matchRate=Math.max(0.5,Math.min(4,Number(r)||1));
  if(typeof mState!=='undefined'&&mState) mState.rate=_matchRate;
  /* M11: gecikme olay BAŞLARKEN o anki hızla hesaplanıp setTimeout'a veriliyordu; sahne
     canlı hızı okuduğu için 3×→1× yapınca koreografi yarıda kesiliyordu. Kalan süreyi
     yeni hıza göre yeniden ölçekleyip zamanlayıcıyı tazeliyoruz. */
  try{
    if(typeof mState!=='undefined'&&mState&&mState.running&&!mState.paused&&matchEventTimer&&mState._stepAt){
      const gecen=Date.now()-mState._stepAt;
      const kalan=Math.max(0,(mState._stepDelay||0)-gecen);
      const yeni=Math.max(60,kalan*((mState._stepRate||_prev)/_matchRate));
      clearTimeout(matchEventTimer);
      mState._stepAt=Date.now(); mState._stepDelay=yeni; mState._stepRate=_matchRate;
      matchEventTimer=setTimeout(mState.step,yeni);
    }
  }catch(e){}
  try{
    document.querySelectorAll('.match-rate').forEach(b=>{
      const on=Math.abs(Number(b.dataset.rate)-_matchRate)<0.01;
      b.style.background=on?'var(--accent)':'';
      b.style.color=on?'#111':'';
      b.style.fontWeight=on?'800':'';
    });
  }catch(e){}
}
/* ── M10: sekme görünürlüğü ─────────────────────────────────────────────────
   Arka plana alınan sekmede requestAnimationFrame durur ama setTimeout ~1 sn'de bir
   tetiklenmeye devam eder: sahne donmuşken olay kuyruğu ilerler ve o süredeki bütün
   anlatım satırları kaybolur. Sekme gizlenince kuyruğu duraklatıp dönüşte sürdürüyoruz. */
let _hiddenPause=false;
if(typeof document!=='undefined'&&document.addEventListener){
  document.addEventListener('visibilitychange',function(){
    try{
      if(typeof mState==='undefined'||!mState||!mState.running) return;
      if(document.hidden){
        if(matchEventTimer){
          const gecen=Date.now()-(mState._stepAt||Date.now());
          mState._stepRemain=Math.max(60,(mState._stepDelay||600)-gecen);
          clearTimeout(matchEventTimer); matchEventTimer=null;
          _hiddenPause=true;
        }
      } else if(_hiddenPause){
        _hiddenPause=false;
        if(!mState.paused&&mState.step){
          const d=Math.max(60,mState._stepRemain||300);
          mState._stepAt=Date.now(); mState._stepDelay=d;
          matchEventTimer=setTimeout(mState.step,d);
        }
      }
    }catch(e){}
  });
}

/* ── Akan maç saati + şut saati ─────────────────────────────────────────── */
let _clkTimer=null;
function stopClockTween(){ if(_clkTimer){ clearInterval(_clkTimer); _clkTimer=null; } }
function _fmtClock(sec){ const s=Math.max(0,Math.ceil(sec)); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }
function startClockTween(targetT,durMs,type){
  const el=document.getElementById('liveTime');
  const scEl=document.getElementById('liveShotClock');
  if(!el) return;
  stopClockTween();
  const from=(mState._clkNow!=null&&mState._clkNow>=targetT)?mState._clkNow:targetT;
  /* şut saati: pozisyon değişince / ölü topta 24'e döner (FIBA) */
  const off=mState._lastOff;
  if(mState._scOff!==off||type==='quarter_start'||type==='start'||type==='foul'||type==='free'||type==='reb'){
    mState._scOff=off; mState._scAnchor=from;
  }
  const t0=Date.now();
  const tick=()=>{
    const k=Math.max(0,Math.min(1,(Date.now()-t0)/Math.max(1,durMs)));
    const now=from+(targetT-from)*k;
    mState._clkNow=now;
    el.textContent=_fmtClock(now);
    if(scEl){
      const used=Math.max(0,(mState._scAnchor!=null?mState._scAnchor:now)-now);
      const left=Math.max(0,24-used);
      scEl.textContent=(mState.running&&left>0.5)?('ŞUT '+Math.ceil(left)):'';
    }
    if(k>=1) stopClockTween();
  };
  tick();
  _clkTimer=setInterval(tick,100);
}

function stopMatch(){
  clearMatchEventTimer();
  clearBallTimers();
  stopClockTween();
  stopCrowdAmbience();
  if(mState._toInterval){ clearInterval(mState._toInterval); mState._toInterval=null; }
  mState.running=false;
  setMatchButtonsRunning(false);   /* Madde 7: butonlar tekrar aktif — kilitli sonuç etiketi aşağıda yazılır */
  const _sc=document.getElementById('liveShotClock'); if(_sc) _sc.textContent='';
  const st=document.getElementById('liveStatus');
  if(st) st.textContent='DURDURULDU';
  const badge=document.getElementById('liveBadge'); if(badge) badge.style.display='none';
  /* C1: durdurulan maç takılı kalmasın — sonuç maç başında kilitliydi; kullanıcı
     "Maçı sonuçlandır" ile hükmen bitirebilir (yeniden oynanamaz, farklı sonuç üretilmez). */
  const btn=document.getElementById('startMatchBtn');
  if(btn && G.pendingMatch && mState.sig && G.pendingMatch.sig===mState.sig){
    btn.textContent='▶ Maçı sonuçlandır';
    btn.title='Sonuç maç başında kilitlendi; bu maç yeniden oynanamaz. Basınca kilitli sonuç uygulanır.';
    showNotif('⏸ Maç durduruldu. Sonuç kilitli — “Maçı sonuçlandır” ile bitir (yeniden oynanamaz).',{critical:true});
  }
}

/* ── Manuel koçluk / canlı müdahale (Madde 12) ── */
function toggleManualCoach(){
  if(!mState.running){ showNotif('Manuel koçluk için önce maçı başlat.'); return; }
  mState.manualCoach=!mState.manualCoach;
  const btn=document.getElementById('manualCoachBtn');
  if(btn){
    btn.textContent=mState.manualCoach?'🎧 Manuel: AÇIK':'🎧 Manuel Koçluk';
    btn.style.background=mState.manualCoach?'var(--accent)':'';
    btn.style.color=mState.manualCoach?'#111':'';
  }
  if(mState.manualCoach){
    renderCoachingPanel(false);
    showNotif('🎧 Manuel koçluk açık — mola ve çeyrek aralarında oyuncu değiştirebilirsin.');
  } else {
    const el=document.getElementById('coachingPanel'); if(el) el.innerHTML='';
    /* Molada duraklamışsak (timer yok ama maç sürüyor) otomatik moda devam et. */
    if(mState.running && !matchEventTimer && mState.step) mState.step();
  }
}
function liveEnergyOf(id){
  const start=(mState.energyStart&&mState.energyStart[id]!=null)?mState.energyStart[id]:100;
  const bonus=(mState.restBonus&&mState.restBonus[id])||0;   /* mola tazelemesi */
  if(!mState.userCourtIds.includes(id)) return Math.max(0,Math.min(100,Math.round(start+bonus)));
  const ev=mState.events[Math.max(0,mState.idx-1)]||{};
  const q=ev.q||1, t=ev.t!=null?ev.t:600;
  const elapsed=(Math.min(4,q)-1)*600+(600-Math.min(600,t))+(q>4?(q-4)*300:0);
  const frac=Math.max(0,Math.min(1,elapsed/2400));
  return Math.max(0,Math.min(100,Math.round(start-frac*22+bonus)));
}
/** Mola/dead-ball duraklatmasında panel açılır; manuel koçlukta da görünür. */
function _coachPanelVisible(){ return mState.manualCoach||mState.paused; }
function renderCoachingPanel(atBreak){
  const el=document.getElementById('coachingPanel');
  if(!el) return;
  if(!_coachPanelVisible()){ el.innerHTML=''; return; }
  /* Duraklatma (mola / dead-ball) sırasında değişiklik her zaman açık (basketbol: ölü topta serbest). */
  const canSub=atBreak||mState.paused;
  const g=id=>(G.players||[]).find(p=>p.id===id);
  const onCourt=(mState.userCourtIds||[]).map(g).filter(Boolean);
  const bench=(mState.benchIds||[]).map(g).filter(p=>p&&!mState.userCourtIds.includes(p.id)&&!playerIsInjured(p));
  const enRow=p=>{ const en=liveEnergyOf(p.id); const col=en>=60?'var(--green)':en>=35?'var(--gold)':'var(--red)'; return {en,col}; };
  const benchOpts=bench.map(b=>`<option value="${b.id}">${escMatch(b.isim)} (${b.poz}·${liveEnergyOf(b.id)}%)</option>`).join('');
  const onList=onCourt.map(p=>{
    const {en,col}=enRow(p);
    const fouls=Number(p.matchFouls||0);
    const swap=(canSub&&bench.length)
      ? `<select id="sub_${p.id}" style="font-size:10px;padding:2px;max-width:120px;">${benchOpts}</select><button type="button" class="btn-sm" style="padding:3px 7px;font-size:10px;" onclick="substituteLive('${p.id}',document.getElementById('sub_${p.id}').value)">↔</button>`
      : '';
    return `<div style="display:flex;align-items:center;gap:6px;padding:4px 6px;background:var(--bg3);border-radius:6px;margin-bottom:3px;">
      <span style="flex:1;font-size:11px;">${escMatch(p.isim)} <span style="color:var(--text2);font-size:9px;">${p.poz}${fouls>=4?` · ⚠️${fouls}F`:fouls?` · ${fouls}F`:''}</span></span>
      <span style="font-size:10px;color:${col};font-weight:700;">⚡${en}%</span>${swap}
    </div>`;
  }).join('');
  const paused=mState.paused;
  const countdown=(paused&&mState._toRemain>0)?`<span id="toCountdown" style="color:var(--accent);font-weight:800;">${mState._toRemain} sn</span>`:'';
  const tacBlock=paused?_liveTacticsHtml():'';
  el.innerHTML=`<div style="padding:9px 11px;background:var(--bg2);border:1px solid var(--accent);border-radius:10px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <strong style="font-size:12px;">${paused?'⏸ Mola / Değişiklik':'🎧 Sahadaki 5 · canlı enerji'}</strong>
      <span style="font-size:10px;color:var(--text2);">${countdown?countdown+' · ':''}Mola: ${mState.timeoutsLeft!=null?mState.timeoutsLeft:0}</span>
    </div>
    ${onList}
    ${canSub?'<div style="font-size:10px;color:var(--text2);margin-top:4px;">Ölü topta değişiklik serbest — yedek seç ve ↔ ile değiştir.</div>':'<div style="font-size:10px;color:var(--text2);margin-top:4px;">Değişiklik için ⏸ Mola al ya da çeyrek arasını bekle.</div>'}
    ${tacBlock}
    ${paused?`<button type="button" class="btn-p" style="width:100%;padding:8px;margin-top:8px;" onclick="continueMatchAfterBreak()">▶ Devam et</button>`:''}
  </div>`;
}
/** Maç içi taktik editörü (mola/duraklamada) — savunma stili, hücum odağı, tempo anında değişir. */
function _liveTacticsHtml(){
  const tac=G.tactics||{tempo:'normal',odak:'dengeli',defensiveStyle:'adam'};
  const o=(cur,val,lbl)=>`<option value="${val}" ${cur===val?'selected':''}>${lbl}</option>`;
  const selStyle='flex:1;min-width:96px;font-size:10px;padding:4px;border-radius:7px;background:var(--bg3);color:var(--text);border:1px solid var(--border);';
  return `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">
    <div style="font-size:10px;color:var(--accent);font-weight:700;margin-bottom:5px;">🎯 Maç içi taktik (anında geçerli)</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      <select style="${selStyle}" onchange="setLiveTactic('tempo',this.value)">${o(tac.tempo,'yavas','🐢 Yavaş')}${o(tac.tempo||'normal','normal','⚖️ Normal tempo')}${o(tac.tempo,'hizli','⚡ Hızlı tempo')}</select>
      <select style="${selStyle}" onchange="setLiveTactic('odak',this.value)">${o(tac.odak,'ic','🏀 İçeri')}${o(tac.odak,'dis','🎯 Dış şut')}${o(tac.odak,'hizli','⚡ Hızlı hücum')}${o(tac.odak,'set','📋 Set oyun')}${o(tac.odak||'dengeli','dengeli','⚖️ Dengeli hücum')}</select>
      <select style="${selStyle}" onchange="setLiveTactic('defensiveStyle',this.value)">${o(tac.defensiveStyle||'adam','adam','🧍 Adam adama')}${o(tac.defensiveStyle,'bolge','🛡️ Bölge sav.')}${o(tac.defensiveStyle,'pres','🔥 Pres sav.')}</select>
    </div>
    <div style="font-size:10px;color:var(--accent);font-weight:700;margin:8px 0 5px;">📋 Set değişimi (maç içi)</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      <select style="${selStyle}" onchange="setLiveTactic('playbook',this.value)">${PLAYBOOKS.map(pb=>o(tac.playbook||'dengeli',pb.key,pb.ikon+' '+pb.ad)).join('')}</select>
      <select style="${selStyle}" onchange="setLiveTactic('defSet',this.value)">${DEF_SETS.map(d=>o(tac.defSet||tac.defensiveStyle||'adam',d.key,d.ikon+' '+d.ad)).join('')}</select>
    </div>
    ${_liveFitHtml(tac)}
  </div>`;
}
/** FAZ B: canlı panelde seçili setin kadro uyumu — koç maç içinde "bu set tutmuyor" görebilsin. */
function _liveFitHtml(tac){
  try{
    const pb=playbookOf(tac.playbook);
    if(!pb||!pb.uyum) return '';
    const court=(mState.userCourtIds||[]).map(id=>(G.players||[]).find(p=>p.id===id)).filter(Boolean);
    if(!court.length) return '';
    const pct=playbookFitPct(pb,court);
    const col=pct>=66?'var(--green)':pct>=40?'var(--gold)':'var(--red)';
    return '<div style="font-size:10px;color:var(--text2);margin-top:6px;">Sahadaki 5 ile <strong>'+pb.ad+'</strong> uyumu: <strong style="color:'+col+';">%'+pct+'</strong> ('+pb.uyum.ad+')</div>';
  }catch(e){ return ''; }
}

function setLiveTactic(key,val){
  if(!mState.running){ return; }
  G.tactics=G.tactics||{tempo:'normal',odak:'dengeli',defensiveStyle:'adam'};
  G.tactics[key]=val;
  const nm={tempo:'Tempo',odak:'Hücum odağı',defensiveStyle:'Savunma',playbook:'Hücum seti',defSet:'Savunma seti'}[key]||key;
  let vl={yavas:'Yavaş',normal:'Normal',hizli:(key==='odak'?'Hızlı hücum':'Hızlı'),ic:'İçeri',dis:'Dış şut',set:'Set oyun',dengeli:'Dengeli',adam:'Adam adama',bolge:'Bölge',pres:'Pres'}[val]||val;
  if(key==='playbook'){ const pb=playbookOf(val); vl=pb.ikon+' '+pb.ad; }
  if(key==='defSet'){ const d=defSetOf(val); vl=d.ikon+' '+d.ad; }
  addComment(`🎯 Taktik değişti — ${nm}: ${vl} (koç kararı).`,'tactic');
  regenerateMatchRemainder();      /* kalan maç yeni taktikle yeniden simüle edilir */
  if(typeof scheduleGameSave==='function') scheduleGameSave();
  renderCoachingPanel(true);
}
/** Mola al: maçı duraklatır, sahadaki oyuncuların enerjisini biraz tazeler, değişiklik penceresi açar. */
function callTimeout(){
  if(!mState.running){ showNotif('Mola için önce maçı başlat.'); return; }
  if(mState.paused){ showNotif('Zaten mola/duraklatma açık.'); return; }
  if((mState.timeoutsLeft==null?0:mState.timeoutsLeft)<=0){ showNotif('Mola hakkın kalmadı.'); return; }
  mState.timeoutsLeft--;
  mState.paused=true;
  clearMatchEventTimer();
  clearBallTimers();
  /* Enerji tazele: sahadaki oyunculara dinlenme bonusu (göstergede görünür) + gerçek enerjiye hafif katkı. */
  const boost=9;
  mState.restBonus=mState.restBonus||{};
  (mState.userCourtIds||[]).forEach(id=>{
    mState.restBonus[id]=(mState.restBonus[id]||0)+boost;
    const p=(G.players||[]).find(x=>x.id===id);
    if(p&&p.enerji!=null) p.enerji=Math.min(100,Number(p.enerji)+Math.round(boost*0.5));
  });
  addComment(`⏸ MOLA! ${G.team.isim} molasını kullandı — oyuncular nefeslendi, enerji tazelendi. (Kalan mola: ${mState.timeoutsLeft})`,'tactic');
  updateTimeoutBtn();
  /* Gerçek mola süresi: 30 saniye geri sayım — oyuncu rahatça değişiklik/taktik yapar, 0'da otomatik devam. */
  mState._toRemain=30;
  if(mState._toInterval) clearInterval(mState._toInterval);
  mState._toInterval=setInterval(()=>{
    mState._toRemain--;
    const el=document.getElementById('toCountdown');
    if(el) el.textContent=mState._toRemain+' sn';
    if(mState._toRemain<=0) continueMatchAfterBreak();
  },1000);
  renderCoachingPanel(true);
  showNotif('⏸ Mola (30 sn) — enerji tazelendi. Değişiklik/taktik yap; süre bitince ya da "Devam et" ile sürer.');
}
function updateTimeoutBtn(){
  const b=document.getElementById('timeoutBtn');
  if(b) b.textContent=`⏸ Mola (${mState.timeoutsLeft!=null?mState.timeoutsLeft:0})`;
}
function substituteLive(outId,inId){
  if(!inId){ showNotif('Yedek oyuncu seç.'); return; }
  if(!mState.paused&&mState.subsLeft<=0){ showNotif('Değişiklik için ⏸ Mola al ya da çeyrek arasını bekle.'); return; }
  if(!mState.userCourtIds.includes(outId)){ showNotif('Bu oyuncu sahada değil.'); return; }
  if(mState.userCourtIds.includes(inId)){ showNotif('Oyuncu zaten sahada.'); return; }
  const inP=(G.players||[]).find(p=>p.id===inId);
  const outP=(G.players||[]).find(p=>p.id===outId);
  if(!inP||playerIsInjured(inP)){ showNotif('Uygun/sağlıklı oyuncu değil.'); return; }
  const i=mState.userCourtIds.indexOf(outId);
  mState.userCourtIds[i]=inId;
  mState.benchIds=(mState.benchIds||[]).filter(id=>id!==inId);
  if(!mState.benchIds.includes(outId)) mState.benchIds.unshift(outId);
  mState.subbedIds.add(inId);
  if(!mState.paused) mState.subsLeft--;   /* çeyrek arası hakkı; molada/dead-ball serbest */
  addComment(`🔁 Değişiklik (koç kararı): ${outP?outP.isim:'?'} çıktı, ${inP.isim} girdi.`,'tactic');
  regenerateMatchRemainder();
  renderCoachingPanel(true);
}
function regenerateMatchRemainder(){
  const ev=mState.events[Math.max(0,mState.idx-1)];
  if(!ev){ return; }
  let rq=ev.q||1, tStart=(ev.t!=null?ev.t:MATCH_CLOCK_SEC), mid=true;
  if(ev.type==='quarter_end'){ rq=(ev.q||1)+1; tStart=MATCH_CLOCK_SEC; mid=false; }
  const resume={
    q:rq,tStart:tStart,mid:mid,
    homeScore:ev.home||0,awayScore:ev.away||0,
    hB:ev.box?ev.box.h:emptyBox(),aB:ev.box?ev.box.a:emptyBox(),
    qh:ev.qh||{},qa:ev.qa||{},
    onCourtIds:(mState.userCourtIds||[]).slice(),
    benchIds:(mState.benchIds||[]).slice(),
    subbedIds:[...mState.subbedIds],
    spId:mState.spId,
    /* C2: olayın taşıdığı oyuncu-bazlı anlık görüntü — ilk yarı istatistikleri,
       faul sayaçları ve çeyrek takım faulleri yeniden üretimde korunur. */
    pstats:(ev.box&&ev.box.ps)?ev.box.ps:{},
    ostats:(ev.box&&ev.box.os)?ev.box.os:{},
    matchFouls:(ev.box&&ev.box.mf)?ev.box.mf:{},
    qFoulU:(ev.box&&ev.box.fu)?ev.box.fu:{},
    qFoulO:(ev.box&&ev.box.fo)?ev.box.fo:{}
  };
  try{
    const rest=generateMatchEvents({isim:mState.rakipName},{userIsHome:mState.userIsHome,resume});
    mState.events=mState.events.slice(0,mState.idx).concat(rest);
    /* C1: Manuel koçluk sonucu değiştirdiyse kilitli sonucu güncelle (yeni bitiş olayı). */
    if(G.pendingMatch && mState.sig && G.pendingMatch.sig===mState.sig){
      G.pendingMatch.ev=mState.events[mState.events.length-1]||G.pendingMatch.ev;
      saveGameNow(false);
    }
  }catch(e){ dbg('regen',e); }
}
function continueMatchAfterBreak(){
  if(mState._toInterval){ clearInterval(mState._toInterval); mState._toInterval=null; }
  mState._toRemain=0;
  mState.paused=false;
  renderCoachingPanel(false);
  if(mState.running && mState.step && !matchEventTimer){ matchEventTimer=setTimeout(mState.step,700); }
}

function addComment(txt,type=''){
  const div=document.getElementById('commentary');
  const ev=mState.events[Math.max(0,mState.idx-1)]||{};
  const q=ev.q||mState.quarter;
  const clk=q<=4?MATCH_CLOCK_SEC:OT_CLOCK_SEC;
  const t=ev.t!==undefined?ev.t:clk;
  const dm=Math.floor((clk-t)/60);
  const ds=(clk-t)%60;
  /* FAZ F: çeyrek/uzatma etiketi dile göre (TR: 1P/U1 · EN: Q1/OT1) */
  const _en=(typeof isEN==='function'&&isEN());
  const qLbl=q<=4?(_en?('Q'+q):(q+'P')):((_en?'OT':'U')+String(q-4));
  const item=document.createElement('div');
  let cls='ci';
  if(type==='score3'||type==='score2'||type==='free') cls+=' ci-score';
  if(type==='miss3'||type==='miss2') cls+=' ci-foul';
  if(type==='start'||type==='quarter_start'||type==='end'||type==='quarter_end'||type==='mvp') cls+=' ci-hl';
  if(type==='tactic') cls+=' ci-tactic';
  if(type==='foul') cls+=' ci-foul';
  item.className=cls;
  item.innerHTML=`<span class="ci-time">${qLbl} ${dm}:${ds.toString().padStart(2,'0')}</span> ${txt}`;
  div.insertBefore(item,div.firstChild);
}

// ===== ANTRENMAN SİSTEMİ =====
function applyTeamTrainingEffect(etki){
  G.players.forEach(p=>{
    const mult=trainingGrowthMult(p);
    if(etki==='all'){
      STAT_KEYS.forEach(k=>{
        const add=Math.max(1,Math.round(rand(1,2)*mult));
        p[k]=Math.min(Math.min(99,p.potansiyel||99),p[k]+add);
      });
    } else {
      const add=Math.max(1,Math.round(rand(1,3)*mult));
      p[etki]=Math.min(Math.min(99,p.potansiyel||99),p[etki]+add);
    }
    p.genel=Math.round(STAT_KEYS.reduce((s,k)=>s+p[k],0)/STAT_KEYS.length);
  refreshRole(p); /* FAZ A */
    refreshRole(p); /* FAZ A */
    /* Maaş sözleşme boyunca sabit — gelişimin maaşa yansıması sözleşme yenilemesinde olur. */
  });
}

function applyIndividualTrainingEffect(pid,stat){
  const p=G.players.find(x=>x.id===pid);
  if(!p) return 0;
  const mult=trainingGrowthMult(p);
  const artis=Math.max(1,Math.min(14,Math.round(rand(1,4)*mult)));
  p[stat]=Math.min(Math.min(99,p.potansiyel||99),p[stat]+artis);
  p.genel=Math.round(STAT_KEYS.reduce((s,k)=>s+p[k],0)/STAT_KEYS.length);
  return artis;
}

function afterTrainingComplete(){
  scheduleGameSave();
  if(document.getElementById('page-antrenman')&&document.getElementById('page-antrenman').classList.contains('active')) renderAntrenman();
  if(document.getElementById('page-kadro')&&document.getElementById('page-kadro').classList.contains('active')) renderRoster();
}

/** Antrenmanlar gerçek oyun günleriyle işler: maçlar oynandıkça günler ilerler, süre dolunca etki uygulanır. */
/* Paket 3 (14. oturum): komşu pozisyon eşlemesi — çapraz atlama yok. */
const POS_NEIGHBORS={PG:['SG'],SG:['PG','SF'],SF:['SG','PF'],PF:['SF','C'],C:['PF']};
function startPosTrainingFromSel(){
  const el=document.getElementById('posTrainSel');
  const v=el?el.value:'';
  if(!v){ showNotif('Önce oyuncu/pozisyon seç.'); return; }
  const a=v.split('|');
  startPosTraining(a[0],a[1]);
}
function startPosTraining(pid,poz){
  const p=(G.players||[]).find(x=>x.id===pid);
  if(!p){ showNotif('Oyuncu bulunamadı.'); return; }
  if(G.posTraining){ showNotif('Zaten bir pozisyon eğitimi sürüyor — önce o bitsin.'); return; }
  if(p.ikincilPoz===poz){ showNotif('Bu oyuncu o pozisyonu zaten biliyor.'); return; }
  if(!(POS_NEIGHBORS[p.poz]||[]).includes(poz)){ showNotif('Sadece komşu pozisyon öğrenilebilir.'); return; }
  const bedel=ecoRound(500);
  if(G.coins<bedel){ showNotif('❌ Yeterli KR yok! ('+fmtn(bedel)+' KR gerekli)'); return; }
  txn('Pozisyon eğitimi: '+p.isim+' → '+poz,-bedel);
  G.posTraining={playerId:pid,poz,kalanGun:15,toplamGun:15};
  showNotif(`🧭 ${p.isim} ikincil pozisyon çalışıyor: ${poz} — 15 oyun günü sürecek.`);
  renderAntrenman(); scheduleGameSave();
}
function advanceTrainingDays(days){
  const d=Math.max(0,Math.round(Number(days)||0));
  /* Paket 3: pozisyon eğitimi ilerlemesi (takım antrenmanlarından bağımsız). */
  if(d&&G.posTraining){
    G.posTraining.kalanGun=Math.max(0,(Number(G.posTraining.kalanGun)||0)-d);
    if(G.posTraining.kalanGun<=0){
      const p=(G.players||[]).find(x=>x.id===G.posTraining.playerId);
      if(p){ p.ikincilPoz=G.posTraining.poz; showNotif(`🧭 ${p.isim} artık ikincil pozisyonda oynayabilir: ${p.poz} + ${p.ikincilPoz}!`,{critical:true}); }
      G.posTraining=null;
      try{ renderAntrenman(); }catch(e){}
      scheduleGameSave();
    }
  }
  if(!d||!Array.isArray(G.activeTrainings)||!G.activeTrainings.length) return;
  const biten=[];
  G.activeTrainings.forEach(t=>{
    t.kalanGun=Math.max(0,(Number(t.kalanGun)||0)-d);
    if(t.kalanGun<=0) biten.push(t);
  });
  if(!biten.length) return;
  G.activeTrainings=G.activeTrainings.filter(t=>t.kalanGun>0);
  biten.forEach(t=>{
    try{
      if(t.bireysel&&t.pid){
        const p=G.players.find(x=>x.id===t.pid);
        const artis=applyIndividualTrainingEffect(t.pid,t.stat);
        if(p) showNotif(`✅ Antrenman bitti: ${p.isim} → ${STAT_LABELS[t.stat]||t.stat} +${artis}`);
      } else {
        applyTeamTrainingEffect(t.etki||t.stat);
        showNotif('🏋️ Takım antrenmanı tamamlandı! Oyuncular gelişti.');
      }
    }catch(e){ dbg('training complete',e); }
  });
  afterTrainingComplete();
}

function startTeamTrain(i){
  const a=ANTRENMAN_T[i];
  if(G.activeTrainings.some(t=>!t.bireysel)){showNotif('Takım antrenmanı zaten devam ediyor.');return;}
  if(a.maliyet&&G.coins<a.maliyet){showNotif('❌ Yeterli KR yok!');return;}
  if(a.maliyet)txn('Antrenman gideri: '+a.isim,-a.maliyet);
  const gun=rand(3,7);
  G.activeTrainings.push({oyuncu:'Tüm Takım',stat:a.etki,kalanGun:gun,toplamGun:gun,etki:a.etki,bireysel:false});
  showNotif(`✅ ${a.isim} başladı — ${gun} oyun günü sürecek (maçlar oynandıkça ilerler).`);
  updateCoins();
  renderAntrenman();
  scheduleGameSave();
}

function startIndividualTrain(){
  const pid=document.getElementById('trainPlayer').value;
  const stat=document.getElementById('trainStat').value;
  if(!pid){showNotif('Oyuncu seç!');return;}
  const p=G.players.find(x=>x.id===pid);if(!p)return;
  if(G.activeTrainings.some(t=>t.bireysel&&t.pid===pid)){showNotif('Bu oyuncunun antrenmanı zaten sürüyor.');return;}
  const gun=rand(2,4);
  G.activeTrainings.push({oyuncu:p.isim,stat,kalanGun:gun,toplamGun:gun,pid,bireysel:true});
  showNotif(`✅ ${p.isim} için ${STAT_LABELS[stat]} antrenmanı başladı — ${gun} oyun günü sürecek.`);
  renderAntrenman();
  scheduleGameSave();
}

// ===== AKSİYONLAR =====
function buyFromMarket(id){
  ensureMarketStock();
  const p=G.marketPlayers.find(x=>x.id===id);if(!p)return;
  const st=starFromGenel(p.genel);
  if(G.players.length>=18){ showNotif('Kadro dolu (en fazla 18). Önce bir oyuncu gönder.'); return; }
  if(G.coins<p.fiyat){showNotif('❌ Yeterli KR yok!');return;}
  txn('Transfer: '+p.isim,-p.fiyat);
  unlockAchievement('transfer');
  const np={...p};
  np.listedFromUser=false;
  np.scouted=true; delete np.hiddenPot;
  delete np.fiyat;
  delete np.teklifler;
  delete np.sure;
  delete np.freeAgent;
  if(np.enerji==null||np.enerji==='') np.enerji=100;
  G.players.push(np);
  G.marketPlayers=G.marketPlayers.filter(x=>x.id!==id);
  const dropM=teamLeadership()>=78?rand(3,8):rand(5,12); /* güçlü kaptan uyumu kolaylaştırır (Madde 36) */
  G.chemistry=Math.max(20,G.chemistry-dropM);
  showNotif(`✅ ${p.isim} kadrona katıldı! Takım kimyası biraz düştü.`);
  if(G.team&&G.team.tblKey){
    pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--green);">💰 <strong>${G.team.isim}</strong> — ${formatTblSlotLabel(G.team.tblKey)} — <strong>${fmtn(p.fiyat)} KR</strong> ile <strong>${p.isim}</strong> (${st}★) transferini duyurdu.</div>`);
    if(document.getElementById('page-dashboard')&&document.getElementById('page-dashboard').classList.contains('active')) renderDashboardNews();
  }
  updateCoins();updateChemistry();renderMarket();if(document.getElementById('page-kadro')&&document.getElementById('page-kadro').classList.contains('active')) renderRoster();
  scheduleGameSave();
}

/* ── Faz 4.1: Kullanıcı oyuncusuna gelen teklif — KULLANICININ ONAYINA düşer (oyuncu ne kadar istese de). ── */
function showIncomingOfferModal(){
  const q=G.pendingOffers||[];
  if(!q.length){ return; }
  const o=q[0];
  const p=(G.players||[]).find(x=>x.id===o.playerId);
  if(!p){ q.shift(); return showIncomingOfferModal(); }
  const ki=kisilikInfo(o.kisilik||p.kisilik);
  const wantTxt=o.wantsToGo?`<span style="color:var(--gold);font-weight:700;">gitmek istiyor</span>`:`<span style="color:var(--text2);">ayrılmaya sıcak bakmıyor</span>`;
  showAppModal(`<div class="modal-title">📨 Transfer Teklifi</div>
    <p style="font-size:13px;line-height:1.6;">
      <strong>${escMatch(o.club)}</strong>, <strong>${escMatch(p.isim)}</strong> (${p.poz}·OVR ${p.genel}) için
      <strong style="color:var(--gold);">${fmtn(o.offer)} KR</strong> teklif etti.
    </p>
    <div style="background:var(--bg3);border-radius:9px;padding:10px;margin:10px 0;font-size:12px;">
      Oyuncu: ${ki.ikon} <strong>${ki.ad}</strong> — ${wantTxt}. <span style="color:var(--text2);">(İstenen bonservis ~${fmtn(o.asking)} KR)</span>
    </div>
    <p style="font-size:11px;color:var(--text2);margin-bottom:12px;">Karar senin: onaylarsan oyuncu ${fmtn(o.offer)} KR karşılığında satılır, reddedersen kadroda kalır.</p>
    <div style="display:flex;gap:8px;">
      <button type="button" class="btn-p" style="flex:1;padding:10px;" onclick="acceptIncomingOffer()">✅ Onayla (sat)</button>
      <button type="button" class="btn-sm" style="flex:1;" onclick="rejectIncomingOffer()">❌ Reddet</button>
    </div>`);
}
function acceptIncomingOffer(){
  const q=G.pendingOffers||[];
  const o=q.shift(); if(!o){ closeAppModal(); return; }
  const ix=(G.players||[]).findIndex(x=>x.id===o.playerId);
  if(ix<0){ closeAppModal(); return showIncomingOfferModal(); }
  if(G.players.length<=10){ showNotif('Kadroda en az 10 oyuncu kalmalı — satış iptal.'); closeAppModal(); return; }
  const p=G.players[ix];
  G.players.splice(ix,1);
  txn('Oyuncu satışı: '+p.isim,o.offer);
  unlockAchievement('satis');
  updateCoins(); updateChemistry();
  pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--blue);">🤝 <strong>${escMatch(G.team.isim)}</strong>, <strong>${escMatch(p.isim)}</strong>'i <strong>${escMatch(o.club)}</strong> kulübüne <strong>${fmtn(o.offer)} KR</strong> karşılığında sattı.</div>`);
  showNotif(`✅ ${p.isim} ${o.club} kulübüne satıldı — +${fmtn(o.offer)} KR.`);
  if(document.getElementById('page-kadro')&&document.getElementById('page-kadro').classList.contains('active')) renderRoster();
  scheduleGameSave();
  closeAppModal();
  if((G.pendingOffers||[]).length) setTimeout(showIncomingOfferModal,300);
}
function rejectIncomingOffer(){
  const q=G.pendingOffers||[];
  const o=q.shift(); if(!o){ closeAppModal(); return; }
  const p=(G.players||[]).find(x=>x.id===o.playerId);
  if(p&&o.wantsToGo){ p.mood=Math.max(0,Number(p.mood||70)-rand(4,9)); } /* gitmek isteyen reddedilince moral düşer */
  updateChemistry();
  showNotif(o.wantsToGo?`${o.playerName} teklifin reddine üzüldü — morali düştü.`:`${o.club} kulübünün teklifi reddedildi.`);
  scheduleGameSave();
  closeAppModal();
  if((G.pendingOffers||[]).length) setTimeout(showIncomingOfferModal,300);
}

/** Madde 19: kullanıcı oyuncunun sözleşmesini erkenden uzatır — imza bedeli öder, ayrılma riski sıfırlanır. */
function extendContract(id){
  const p=G.players.find(x=>x.id===id);
  if(!p){ showNotif('Oyuncu bulunamadı.'); return; }
  const cost=salaryKRFromGenel(p.genel)*2;
  if(G.coins<cost){ showNotif('❌ İmza bedeli için yeterli KR yok!'); return; }
  txn('Sözleşme uzatma: '+p.isim,-cost);
  p.maas=salaryKRFromGenel(p.genel);
  p.kontratSezon=Math.min(4,(Number(p.kontratSezon)||0)+rand(2,3));
  p.mood=Math.min(100,(Number(p.mood)||70)+rand(3,8)); /* güven → moral artışı */
  updateCoins();
  showNotif(`✍️ ${p.isim} ile sözleşme uzatıldı — ${p.kontratSezon} sezon, ${fmtn(cost)} KR imza bedeli.`);
  scheduleGameSave();
  const mr=document.getElementById('appModalRoot');
  if(mr&&mr.style.display!=='none') openPlayerModal(id);
  if(document.getElementById('page-kadro')&&document.getElementById('page-kadro').classList.contains('active')) renderRoster();
}

function listPlayerToMarket(id){
  if(!G.team) return;
  if(G.players.length<=10){ showNotif('Kadroda en az 10 oyuncu kalmalı.'); return; }
  const ix=G.players.findIndex(x=>x.id===id);
  if(ix<0) return;
  const p=G.players[ix];
  G.players.splice(ix,1);
  const mp={...p};
  mp.listedFromUser=true;
  mp.freeAgent=true;
  mp.fiyat=transferFeeKR(mp);
  mp.marketIdx=G.marketPlayers.length;
  mp.seed='lst'+p.id+'_'+Date.now();
  G.marketPlayers.push(mp);
  while(G.marketPlayers.length>MARKET_TARGET+12){
    const ix0=G.marketPlayers.findIndex(x=>!x.listedFromUser);
    if(ix0<0) break;
    G.marketPlayers.splice(ix0,1);
  }
  const satisGelir=Math.round(mp.fiyat*0.85);
  txn('Satış: '+p.isim,satisGelir);
  unlockAchievement('satis');
  showNotif(`${p.isim} satıldı — +${fmtn(satisGelir)} KR kasaya girdi (bonservisin %85'i).`);
  updateChemistry();
  scheduleGameSave();
  if(document.getElementById('page-kadro')&&document.getElementById('page-kadro').classList.contains('active')) renderRoster();
  if(document.getElementById('page-market')&&document.getElementById('page-market').classList.contains('active')) renderMarket();
}

function promoteYouth(id){
  const p=G.youth.find(x=>x.id===id);if(!p)return;
  p.maas=salaryKRFromGenel(p.genel);
  p.scouted=true; delete p.hiddenPot;
  if(p.enerji==null||p.enerji==='') p.enerji=100;
  G.players.push(p);G.youth=G.youth.filter(x=>x.id!==id);
  if(p.kontratSezon==null) p.kontratSezon=rand(2,3);
  if(!p.sezon) p.sezon={mac:0,pts:0,ast:0,reb:0};
  unlockAchievement('altyapi');
  showNotif(`🌱 ${p.isim} ana kadroya alındı! (Tam sözleşme: ${fmtn(p.maas)} KR/hf)`);
  renderAltyapi();
  if(document.getElementById('page-kadro')&&document.getElementById('page-kadro').classList.contains('active')) renderRoster();
  scheduleGameSave();
}

function hireCoach(id){
  const c=G.coachMarket.find(x=>x.id===id);if(!c)return;
  if((G.coaches||[]).length>=MAX_COACHES){ showNotif(`En fazla ${MAX_COACHES} koç çalıştırabilirsin — önce birini kov.`); return; }
  if((G.coaches||[]).some(x=>x.uzm===c.uzm)){ showNotif(`Zaten bir "${c.uzm}" koçun var — aynı uzmanlıktan ikincisi alınamaz (önce mevcut koçu kov).`); return; }
  if(G.coins<c.satisFiyat){showNotif('❌ Yeterli KR yok!');return;}
  txn('Koç transferi: '+c.ad,-c.satisFiyat);G.coaches.push(c);
  if(G.coaches.length>=MAX_COACHES) unlockAchievement('tamEkip'); /* Paket B */
  G.coachMarket=G.coachMarket.filter(x=>x.id!==id);
  updateCoins();showNotif(`✅ ${c.ad} koç kadrosuna katıldı!`);renderAntrenman();
  scheduleGameSave();
}

function fireCoach(id){
  const c=G.coaches.find(x=>x.id===id);if(!c)return;
  G.coaches=G.coaches.filter(x=>x.id!==id);
  showNotif(`${c.ad} kadrodan çıkarıldı.`);renderAntrenman();
  scheduleGameSave();
}
/* ── Faz 5.1: İzci ağı — işe alma / çıkarma / atama ── */
function hireScout(id){
  const s=(G.scoutMarket||[]).find(x=>x.id===id); if(!s) return;
  G.scouts=Array.isArray(G.scouts)?G.scouts:[];
  if(G.scouts.length>=4){ showNotif('En fazla 4 izci çalıştırabilirsin — önce birini çıkar.'); return; }
  if(G.coins<s.satisFiyat){ showNotif('❌ Yeterli KR yok!'); return; }
  txn('İzci transferi: '+s.ad,-s.satisFiyat);
  const hired={...s}; delete hired.satisFiyat;
  G.scouts.push(hired);
  G.scoutMarket=(G.scoutMarket||[]).filter(x=>x.id!==id);
  if(G.scoutMarket.length<3) G.scoutMarket.push(...genScoutMarket().slice(0,2)); /* pazarı taze tut */
  updateCoins(); showNotif(`✅ İzci ${s.ad} (${s.bolge}) ağına katıldı!`); renderAntrenman(); scheduleGameSave();
}
function fireScout(id){
  const s=(G.scouts||[]).find(x=>x.id===id); if(!s) return;
  G.scouts=(G.scouts||[]).filter(x=>x.id!==id);
  showNotif(`İzci ${s.ad} ağdan çıkarıldı.`); renderAntrenman(); scheduleGameSave();
}
function assignScout(id,pool){
  const s=(G.scouts||[]).find(x=>x.id===id); if(!s) return;
  s.atama=(pool==='youth')?'youth':'market';
  showNotif(`İzci ${s.ad} → ${s.atama==='youth'?'Altyapı':'Transfer Market'} havuzuna atandı.`);
  scheduleGameSave();
}

function upgradeArena(s){
  const g=ARENA_LVL[s-1];
  if(G.arena.s>=s){showNotif('Bu seviye zaten alınmış.');return;}
  if(G.coins<g.m){showNotif('❌ Yeterli KR yok!');return;}
  txn('Arena yatırımı: '+g.isim,-g.m);G.arena={...G.arena,s:g.s,kap:g.kap,bk:g.bk};
  if(g.s===5) unlockAchievement('megaArena');
  updateCoins();showNotif(`🏟️ ${g.isim}\'e yükseltildi!`);renderArena();
  scheduleGameSave();
}

// ===== NAVİGASYON =====
const PAGE_TITLES={dashboard:'ANA PANEL',takim:'TAKIM',kadro:'KADRO YÖNETİMİ',mac:'MAÇLAR',lig:'LİG PUAN DURUMU',market:'TRANSFER MARKET',altyapi:'ALTYAPI',antrenman:'ANTRENMAN & KOÇLAR',arena:'ARENA',bilanco:'BİLANÇO',analiz:'ANALİZ & İSTATİSTİK'};
const MENTOR_ROUTE_SLUGS=['dashboard','takim','kadro','mac','lig','market','altyapi','antrenman','arena','bilanco','analiz'];

/** Mentor denetimi: DOM rotaları, yan panel sırası, başlık eşleşmesi + layout metrikleri (panel JSON v8). */
function charazayCollectMentorIssues(slug, lay){
  const issues=[];
  const push=(code,level,msg)=>issues.push({code,level,msg:String(msg)});
  const layoutOk=!!(lay&&lay.layoutOk!==false);
  const gap=typeof(lay&&lay.contentGapPx)==='number'?lay.contentGapPx:0;
  const st=typeof(lay&&lay.structShiftPx)==='number'?lay.structShiftPx:0;
  if(!layoutOk) push('LAYOUT_FLAG','err','Genel layout uyarı bayrağı tetiklendi.');
  if(st>14) push('STRUCT_SHIFT','warn','Sayfa kutusu kayması '+Math.round(st)+'px (eşik 14px).');
  if(gap>72) push('CONTENT_GAP','warn','Üst bar ↔ ilk içerik arası '+Math.round(gap)+'px (eşik 72px).');
  if(gap>200) push('CONTENT_GAP','err','Üst bar ↔ ilk blok aşırı büyük: '+Math.round(gap)+'px.');
  const stage=document.getElementById('pageStage');
  const side=document.getElementById('sidebar');
  const nav=document.getElementById('sbNav');
  const league=document.querySelector('#sidebar .sb-league');
  let routesInStage=0;
  if(stage) routesInStage=stage.querySelectorAll(':scope > .page').length;
  const expected=MENTOR_ROUTE_SLUGS.length;
  if(routesInStage!==expected) push('ROUTES_COUNT','err','#pageStage doğrudan sayfa sayısı: '+routesInStage+' (beklenen '+expected+').');
  for(const s of MENTOR_ROUTE_SLUGS){
    if(!document.getElementById('page-'+s)) push('MISSING_ROUTE','err','Eksik düğüm #page-'+s);
  }
  const active=stage?stage.querySelector(':scope > .page.active'):null;
  if(!active) push('NO_ACTIVE','err','#pageStage içinde .page.active yok.');
  else{
    if(active.parentElement!==stage) push('ACTIVE_NOT_IN_STAGE','err','Aktif sayfa #pageStage dışında (ebeveyn: '+(active.parentElement&&active.parentElement.id||active.parentElement.tagName)+').');
    if(String(active.id||'')!=='page-'+slug) push('ACTIVE_ID_MISMATCH','warn','Beklenen aktif id page-'+slug+', görülen '+active.id);
  }
  const pt=document.getElementById('pageTitle');
  const wantTitle=PAGE_TITLES[slug]||'';
  if(pt&&wantTitle&&(pt.textContent||'').trim()!==wantTitle) push('TITLE_MISMATCH','warn','Üst çubuk başlığı eşleşmiyor (beklenen: '+wantTitle+').');
  let navFirst=false;
  let leagueBeforeNav=false;
  if(side&&nav&&league&&side.contains(nav)&&side.contains(league)){
    const ch=Array.from(side.children);
    const li=ch.indexOf(league);
    const ni=ch.indexOf(nav);
    navFirst=li>=0&&ni>=0&&ni<li;
    leagueBeforeNav=li>=0&&ni>=0&&li<ni;
    if(!navFirst) push('SIDEBAR_NAV_ORDER','warn','Kategori menüsü (#sbNav) lig bloğundan (.sb-league) önce gelmeli (menü üstte).');
  }else{
    push('SIDEBAR_NAV_LEAGUE','warn','Yan panelde #sbNav veya .sb-league bulunamadı.');
  }
  const lsc=document.querySelector('.sb-league-scroll');
  if(lsc){
    const ch=lsc.clientHeight;
    const sh=lsc.scrollHeight;
    if(sh>ch+24){
      push('LEAGUE_TREE_SCROLL','warn','Lig listesi '+Math.round(sh)+'px yükseklikte, görünen '+Math.round(ch)+'px — kaydırarak görmek gerekir (TBL + Div grupları açıksa normal).');
    }
    if(ch>0&&ch<72) push('LEAGUE_SIDEBAR_TIGHT','warn','Lig alanı çok alçak (~'+Math.round(ch)+'px); pencere veya zoom ile yan panel sıkışmış olabilir.');
  }
  const errN=issues.filter(x=>x.level==='err').length;
  const auditOk=errN===0;
  return {issues,routesInStage,expectedRoutes:expected,navFirst,leagueBeforeNav,activePageId:active?active.id:null,activeInStage:!!(active&&stage&&active.parentElement===stage),auditOk};
}

/** Günlük satırı: tek satırda tüm denetim özeti (Y günlüğü). */
function charazayFormatMentorSyncLine(p){
  const t=new Date(p.at||Date.now()).toLocaleString('tr-TR');
  const lay=p.layout||{};
  const layoutOk=lay.layoutOk!==false&&p.layoutOk!==false;
  const gap=typeof lay.contentGapPx==='number'?lay.contentGapPx:((p.contentGapPx)||0);
  const st=typeof lay.structShiftPx==='number'?lay.structShiftPx:((p.structShiftPx)||0);
  const iss=p.issues||[];
  const e=iss.filter(x=>x.level==='err');
  const w=iss.filter(x=>x.level==='warn');
  const det=iss.slice(0,4).map(x=>x.code+(x.msg?':'+String(x.msg).slice(0,80):'')).join(' │ ');
  const tail=iss.length>4?' …':'';
  const ok=p.mentorReportOk!==false;
  return t+' · Denetim:'+(ok?'OK':'UYARI')+' · Layout:'+(layoutOk?'OK':'X')+' · gap '+Math.round(gap)+'px · shift '+Math.round(st)+'px · '+String(p.page||'?')+' · err '+e.length+' warn '+w.length+(det?(' · '+det+tail):'')+' · v'+(p.v||'?');
}
function charazayFormatMentorLayoutLine(p){
  if(p&&p.type==='mentor-sync'&&Number(p.v)>=8) return charazayFormatMentorSyncLine(p);
  const t=new Date(p.at||Date.now()).toLocaleString('tr-TR');
  const ok=p.layoutOk!==false;
  const g=p.contentGapPx||0;
  const st=p.structShiftPx||0;
  const an=(!ok||g>72||st>14)?' (anomali)':'';
  return 'Son kontrol: '+t+' · Layout: '+(ok?'OK':'UYARI')+' · Üst bar↔ilk blok: '+g+'px · Kayma (sayfa kutusu): '+st+'px'+an+' · Sayfa: '+String(p.page||'?')+' · v'+(p.v||'?')+' · Viewport: '+Math.round(p.vw||0)+'×'+Math.round(p.vh||0);
}
/** Anomali / denetim satırlarını biriktirir — mentor panel Y günlüğü */
function charazayAppendMentorLayoutLog(payload){
  try{
    if(!payload||(payload.type!=='mentor-sync'&&payload.type!=='layout')) return;
    const lay=payload.layout||{};
    const gap=typeof lay.contentGapPx==='number'?lay.contentGapPx:(payload.contentGapPx||0);
    const st=typeof lay.structShiftPx==='number'?lay.structShiftPx:(payload.structShiftPx||0);
    const layoutOk=lay.layoutOk!==false&&payload.layoutOk!==false;
    const iss=payload.issues||[];
    const hasErr=iss.some(x=>x.level==='err');
    const hasWarn=iss.some(x=>x.level==='warn');
    const bad=payload.mentorReportOk===false||hasErr||!layoutOk||gap>72||st>14||hasWarn;
    if(!bad) return;
    const KEY='CHARAZAY_MENTOR_LAYOUT_LOG';
    let arr=[];
    const s=localStorage.getItem(KEY);
    if(s){ try{ arr=JSON.parse(s); }catch(e){ arr=[]; } }
    if(!Array.isArray(arr)) arr=[];
    const line=charazayFormatMentorLayoutLine(payload.type==='mentor-sync'?payload:{...payload,layout:lay});
    const last=arr.length?arr[arr.length-1]:null;
    if(last&&last.line===line) return;
    arr.push({at:payload.at||Date.now(),page:String(payload.page||''),line:line});
    while(arr.length>160) arr.shift();
    localStorage.setItem(KEY,JSON.stringify(arr));
    if(typeof BroadcastChannel!=='undefined'){
      if(!window.__charazayMentorBC) window.__charazayMentorBC=new BroadcastChannel('charazay-mentor');
      window.__charazayMentorBC.postMessage({type:'layout-log',payload:arr});
    }
  }catch(e){ /* kota */ }
}
function charazayGetActivePageSlug(){
  const p=document.querySelector('#pageStage > .page.active');
  if(!p||!p.id||!p.id.startsWith('page-')) return 'dashboard';
  return p.id.slice('page-'.length);
}
function charazayRunLayoutCalibration(navPage){
  window.__CHARAZAY_LAYOUT_OK=true;
  window.__CHARAZAY_CONTENT_GAP_PX=0;
  window.__CHARAZAY_STRUCT_SHIFT_PX=0;
  const app=document.getElementById('app');
  if(!app||app.style.display==='none') return;
  const slug=navPage||charazayGetActivePageSlug();
  try{
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
    const c=document.querySelector('#app main.content');
    if(c){ c.scrollTop=0; c.scrollLeft=0; }
    const pg=document.getElementById('page-'+slug);
    if(pg) pg.scrollTop=0;
    const vw=window.innerWidth;
    const side=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar'))||260;
    if(c&&vw>768){
      const r=c.getBoundingClientRect();
      if(r.left<side-52||r.left>side+80) window.__CHARAZAY_LAYOUT_OK=false;
      if(r.right>vw+8) window.__CHARAZAY_LAYOUT_OK=false;
    }
    if(document.documentElement.scrollWidth>document.documentElement.clientWidth+4){
      window.__CHARAZAY_LAYOUT_OK=false;
    }
    const tb=document.querySelector('#app main.content > .topbar');
    const stage=document.querySelector('#pageStage');
    /* Üst hızlı menü (.top-quick-wrap) eklendikten sonra stage doğrudan topbar altında değil;
       topbar↔stage mesafesi ~40px “sahte kayma” üretirdi. Referans: stage’in hemen üstündeki satır. */
    const refAbove=stage&&stage.previousElementSibling&&stage.previousElementSibling!==tb
      ? stage.previousElementSibling
      : (tb||null);
    if(pg&&refAbove&&stage&&pg.classList.contains('active')){
      const refR=refAbove.getBoundingClientRect();
      const stR=stage.getBoundingClientRect();
      const pgR=pg.getBoundingClientRect();
      let structural=Math.max(0,Math.round(stR.top-refR.bottom));
      if(c&&refAbove.parentElement===c&&stage.parentElement===c){
        const domSt=Math.max(0,Math.round(stage.offsetTop-(refAbove.offsetTop+refAbove.offsetHeight)));
        if(structural>40&&domSt<=40) structural=domSt;
      }
      window.__CHARAZAY_STRUCT_SHIFT_PX=structural;
      const fc=pg.firstElementChild;
      let anchorGap=structural;
      const tbR=tb?tb.getBoundingClientRect():refR;
      if(fc){
        const fcR=fc.getBoundingClientRect();
        /* İç boşluk: ilk blok ↔ .page kutusu (üst bar / yapışkanlık göreli değil) */
        anchorGap=Math.max(0,Math.round(fcR.top-pgR.top));
      } else {
        anchorGap=Math.max(0,Math.round(pgR.top-tbR.bottom));
      }
      window.__CHARAZAY_CONTENT_GAP_PX=anchorGap;
      if(structural>14) window.__CHARAZAY_LAYOUT_OK=false;
      if(anchorGap>200) window.__CHARAZAY_LAYOUT_OK=false;
      if(anchorGap>24) pg.scrollTop=0;
    }
    if(window.CHARAZAY_DEBUG&&(!window.__CHARAZAY_LAYOUT_OK||window.__CHARAZAY_CONTENT_GAP_PX>48)){
      console.warn('[Charazay] layout:',{ok:window.__CHARAZAY_LAYOUT_OK,gap:window.__CHARAZAY_CONTENT_GAP_PX,struct:window.__CHARAZAY_STRUCT_SHIFT_PX,slug});
    }
  }catch(e){
    if(window.CHARAZAY_DEBUG) console.warn('[Charazay] layout kalibrasyon',e);
  }
  try{
    const layObj={
      layoutOk:!!window.__CHARAZAY_LAYOUT_OK,
      contentGapPx:window.__CHARAZAY_CONTENT_GAP_PX||0,
      structShiftPx:window.__CHARAZAY_STRUCT_SHIFT_PX||0
    };
    const audit=charazayCollectMentorIssues(String(slug||''), layObj);
    const errC=(audit.issues||[]).filter(x=>x.level==='err').length;
    const layoutPass=layObj.layoutOk&&layObj.structShiftPx<=14&&layObj.contentGapPx<=72&&layObj.contentGapPx<=200;
    const mentorReportOk=errC===0&&layoutPass;
    const mentorAttention=!mentorReportOk||(audit.issues||[]).some(x=>x.level==='warn');
    const payload={
      type:'mentor-sync',
      v:8,
      at:Date.now(),
      page:String(slug||''),
      vw:window.innerWidth,
      vh:window.innerHeight,
      layout:layObj,
      layoutOk:layObj.layoutOk,
      contentGapPx:layObj.contentGapPx,
      structShiftPx:layObj.structShiftPx,
      issues:audit.issues,
      routesInStage:audit.routesInStage,
      expectedRoutes:audit.expectedRoutes,
      leagueBeforeNav:audit.leagueBeforeNav,
      navFirst:audit.navFirst,
      activeInStage:audit.activeInStage,
      activePageId:audit.activePageId,
      auditOk:audit.auditOk,
      mentorReportOk,
      mentorAttention
    };
    localStorage.setItem('CHARAZAY_MENTOR_SYNC',JSON.stringify(payload));
    charazayAppendMentorLayoutLog(payload);
    if(typeof BroadcastChannel!=='undefined'){
      if(!window.__charazayMentorBC) window.__charazayMentorBC=new BroadcastChannel('charazay-mentor');
      window.__charazayMentorBC.postMessage(payload);
    }
  }catch(e){ /* kota / gizli mod / file policy */ }
}

function resolvePageShell(page){
  return document.getElementById('page-'+String(page||''))||null;
}

function showPage(page,btn){
  try{
    ensureUiUnblocked();
    const shell=resolvePageShell(page);
    if(!shell){
      if(typeof dbg==='function') dbg('showPage: route yok',page);
      return;
    }
    document.querySelectorAll('#pageStage > .page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('#sbNav button.ni').forEach(l=>l.classList.remove('active'));
    shell.classList.add('active');
    if(btn)btn.classList.add('active');
    const pt=document.getElementById('pageTitle');
    if(pt) pt.textContent=PAGE_TITLES[page]||'';
    if(window.innerWidth<=768)closeSidebar();
    if(page==='lig')renderLig();
    if(page==='dashboard'){ renderDashboardNews(); renderDashboardNextMatch(); }
    if(page==='takim'){
      renderTeamDetailPage();
      const t0=document.querySelector('#teamPageTabs .td-tab');
      if(t0) switchTeamTab('detay',t0);
    }
    if(page==='mac'){
      renderFixture();
      if(G.team) renderBoxScore(emptyBox(),emptyBox(),G.team.isim,'Deplasman');
    }
    if(page==='market')renderMarket();
    if(page==='kadro')renderRoster();
    if(page==='altyapi')renderAltyapi();
    if(page==='antrenman')renderAntrenman();
    if(page==='arena')renderArena();
    if(page==='bilanco')renderBilanço();
    if(page==='analiz')renderAnalytics();
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        requestAnimationFrame(()=>charazayRunLayoutCalibration(page));
      });
    });
  }catch(err){
    if(typeof dbg==='function') dbg('showPage',err);
  }
}

function toggleSidebar(){
  const side=document.getElementById('sidebar');
  const ov=document.getElementById('overlay');
  if(!side||!ov) return;
  side.classList.toggle('open');
  if(window.innerWidth<=768) ov.classList.toggle('show');
}
function closeSidebar(){ ensureUiUnblocked(); }

function updateStats(){
  const set=(id,v)=>{ const e=document.getElementById(id); if(e) e.textContent=v; };
  set('dG',G.wins);
  set('dM',G.losses);
  set('dP',G.points);
}

function updateCoins(){
  const f=fmtn(G.coins);
  document.getElementById('sbCoins').textContent=f;
  if(document.getElementById('marketCoins'))document.getElementById('marketCoins').textContent=f;
}

function goSetup(){document.getElementById('loginPage').style.display='none';document.getElementById('setupPage').style.display='flex';}
function selColor(el){document.querySelectorAll('.color-opt').forEach(c=>c.classList.remove('selected'));el.classList.add('selected');G.selectedColor=el.dataset.color;}

function createTeam(){
  const name=sanitizeTeamName(document.getElementById('teamName').value);
  if(!name){showNotif('Takım adı gir!');return;}
  const mi=document.getElementById('managerNameInput');
  G.managerName=sanitizeTeamName(mi&&mi.value)||'Menajer';
  G.joinedAt=new Date().toISOString();
  G.lastActive=G.joinedAt;
  G.coins=START_KR;G.wins=0;G.losses=0;G.points=0;G.chemistry=75;
  G.activeTrainings=[];
  G.marketPozFilter='all';G.marketSort='ovr';G.marketSortDesc={ovr:true,maas:true};G.kadroFilter='all';G.kadroView='cards';G.youthView='list';
  G.team={isim:name,renk:G.selectedColor,tblKey:assignUserToTblSlot(name),logoUrl:''};
  G.players=genRoster();G.youth=genYouth();G.marketPlayers=genMarket();
  G.ligTeams=genLigTeams();G.coaches=genCoaches();G.coachMarket=genCoachMarket();
  G.scouts=[];G.scoutMarket=genScoutMarket();
  G.season=null;
  G.seasonFixtures=[];
  G.settings=Object.assign({sound:true,autosaveSec:12},G.settings||{});
  G.achievements={};
  G.ledger=[];
  G.lastEcoDay=1;
  G.tactics={tempo:'normal',odak:'dengeli',defensiveStyle:'adam',focusPlayerId:null,markStar:false};
  G.pendingOffers=[];G.presidentTarget=null;G.budgetPenalty=0;
  G.analytics={teamMatches:[],playerDev:{}};
  G.draft=null;
  G.tutorialDone=false;
  bootstrapAppUi();
  applyAutosaveSetting();
  const dashNav=document.querySelector('#sbNav button[data-page="dashboard"]');
  showPage('dashboard',dashNav);
  showNotif('🏀 Takımın hazır! Hadi basketbol oynayalım.');
  scheduleGameSave();
  if(!G.tutorialDone) showTutorial(0);
}

/* Madde 37: bildirim kuyruğu — bildirimler sırayla gösterilir, birbirini ezmez.
   Kritik bildirimler (iflas, sakatlık, sözleşme kaybı) öne alınır ve daha uzun/vurgulu gösterilir. */
let _notifQueue=[];
let _notifShowing=false;
function showNotif(msg,opts){
  opts=opts||{};
  const item={msg:String(msg==null?'':msg),critical:!!opts.critical};
  if(item.critical) _notifQueue.unshift(item); else _notifQueue.push(item);
  /* Taşma kontrolü: kritikleri koru, en eski normali at. */
  while(_notifQueue.length>15){
    const i=_notifQueue.findIndex(x=>!x.critical);
    if(i>=0) _notifQueue.splice(i,1); else { _notifQueue.shift(); break; }
  }
  _drainNotif();
}
function _drainNotif(){
  if(_notifShowing) return;
  const item=_notifQueue.shift();
  if(!item) return;
  const n=document.getElementById('notif');
  if(!n) return;
  _notifShowing=true;
  n.textContent=item.msg;
  if(item.critical){
    n.style.borderColor='#ef4444';
    n.style.boxShadow='0 0 0 2px rgba(239,68,68,0.35)';
    n.style.background='linear-gradient(180deg,rgba(239,68,68,0.14),var(--bg2))';
  } else {
    n.style.borderColor='';
    n.style.boxShadow='';
    n.style.background='';
  }
  n.classList.add('show');
  sfx(item.critical?'achv':'notif');
  const dur=item.critical?6000:3200;
  setTimeout(()=>{
    n.classList.remove('show');
    setTimeout(()=>{ _notifShowing=false; _drainNotif(); },340);
  },dur);
}

(function(){
  const keys={Digit1:'dashboard',Digit2:'takim',Digit3:'kadro',Digit4:'mac',Digit5:'lig',Digit6:'market',Digit7:'altyapi',Digit8:'antrenman',Digit9:'arena',Digit0:'bilanco'};
  window.addEventListener('keydown',function(ev){
    if(!ev.altKey||ev.ctrlKey||ev.metaKey||ev.repeat) return;
    const p=keys[ev.code];
    if(!p) return;
    const app=document.getElementById('app');
    if(!app||app.style.display==='none') return;
    const t=ev.target;
    if(t&&((t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT')||(t.closest&&t.closest('input,textarea,select')))) return;
    ev.preventDefault();
    const b=document.querySelector('#sbNav button[data-page="'+p+'"]');
    showPage(p,b||null);
  },true);
})();

window.onload=()=>{
  /* FAZ F: dil katmanı her şeyden önce kurulur (kataloglar + canlı DOM çevirisi). */
  try{ initI18n(); }catch(e){}
  try{ const lp=document.getElementById("langPicker"); if(lp) lp.innerHTML=langPickerHtml(); }catch(e){}
  /* Loader görseli kapalı (display:none) — eski 1500+500ms sahte bekleme girişte gecikme yaratıyordu. */
  setTimeout(()=>{
    document.getElementById('loader').style.opacity='0';
    setTimeout(()=>{
      document.getElementById('loader').style.display='none';
      wireAppNav();
      try{ setMatchRate(_matchRate); }catch(e){}   /* izleme hızı butonu işaretli başlasın */
      const appEl=document.getElementById('app');
      if(!appEl||appEl.style.display!=='block')
        document.getElementById('loginPage').style.display='flex';
      const lf=document.getElementById('teamLogoFile');
      if(lf) lf.addEventListener('change',onTeamLogoFileChange);
      const isf=document.getElementById('importSaveFile');
      if(isf) isf.addEventListener('change',importGameJson);
      try{
        (async ()=>{
          _pendingResumeFromIdb=null;
          let d=loadGameFromStorage();
          if(!d){
            const s=await idbGetString();
            if(s){ try{ d=JSON.parse(s); }catch(e){ d=null; } }
            if(d&&SAVE_VERSIONS.includes(d.v|0)&&d.team) _pendingResumeFromIdb=d;
          }
          const rb=document.getElementById('resumeBlock');
          const rn=document.getElementById('resumeTeamName');
          if(d&&d.team&&SAVE_VERSIONS.includes(d.v|0)&&rb&&rn){
            rb.style.display='block';
            rn.textContent=d.team.isim+(d.savedAt?' · '+new Date(d.savedAt).toLocaleString('tr-TR'):'');
          }
        })();
      }catch(e){ dbg('resume',e); }
    },150);
  },100);
  window.addEventListener('beforeunload',()=>{ try{ saveGameNow(false); }catch(e){} });
  window.addEventListener('storage',e=>{
    if(e.key!==GAME_SAVE_KEY||!e.newValue) return;
    try{ syncUiAfterExternalSave(); }catch(x){}
  });
  applyAutosaveSetting();
  window.addEventListener('resize',()=>{
    try{
      if(!document.getElementById('app')||document.getElementById('app').style.display==='none') return;
      charazayRunLayoutCalibration(charazayGetActivePageSlug());
    }catch(e){}
  });
};
