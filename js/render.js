/** Bir takımın lig içindeki G-M rekorunu döndürür (puan durumundan). */
function _teamRecordLabel(name){
  try{
    const row=G.season&&G.season.standings&&G.season.standings[name];
    if(!row) return '';
    return `${row.g||0}G · ${row.m||0}M`;
  }catch(e){ return ''; }
}
function renderDashboardNextMatch(){
  const nh=document.getElementById('nextHome');
  const na=document.getElementById('nextAway');
  const meta=document.getElementById('nextMatchMeta');
  const card=document.getElementById('dashNextCard');
  const homeCol=document.getElementById('dnHomeCol');
  const awayCol=document.getElementById('dnAwayCol');
  const homeRec=document.getElementById('dnHomeRec');
  const awayRec=document.getElementById('dnAwayRec');
  const setTxt=(id,v)=>{ const e=document.getElementById(id); if(e) e.textContent=v; };
  if(!nh||!na||!G.team) return;
  ensureMatchKickoffs();
  const m=findNextUserSeasonMatch();
  if(homeCol) homeCol.classList.remove('mine');
  if(awayCol) awayCol.classList.remove('mine');
  if(!m){
    nh.textContent=G.team.isim;
    const done=G.season&&seasonAllMatchesPlayed();
    na.textContent=done?'— sezon bitti —':'— sezon yok —';
    if(homeRec) homeRec.textContent='';
    if(awayRec) awayRec.textContent='';
    if(card){ card.style.opacity='0.6'; card.style.pointerEvents='none'; const btn=card.querySelector('.dn-play'); if(btn){ btn.textContent='Maç yok'; btn.disabled=true; } }
    if(meta){
      if(!G.season||!G.season.matches||!G.season.matches.length) meta.textContent='Sezon senkronize ediliyor…';
      else if(done) meta.textContent='Sezon tamam — sıradaki sezon otomatik.';
      else meta.textContent='Fikstür güncelleniyor…';
    }
    return;
  }
  /* Madde 7: maç canlıyken yeniden render olsa da buton pasif kalsın */
  const _live=(typeof mState!=='undefined'&&mState&&mState.running);
  if(card){ card.style.opacity=''; card.style.pointerEvents=''; const btn=card.querySelector('.dn-play'); if(btn){ btn.textContent=_live?'⏳ Maç Devam Ediyor':'▶ Maçı Başlat'; btn.disabled=!!_live; } }
  nh.textContent=m.home;
  na.textContent=m.away;
  if(homeRec) homeRec.textContent=_teamRecordLabel(m.home);
  if(awayRec) awayRec.textContent=_teamRecordLabel(m.away);
  const u=G.team.isim;
  if(m.home===u&&homeCol) homeCol.classList.add('mine');
  if(m.away===u&&awayCol) awayCol.classList.add('mine');
  setTxt('dnHomeRole','Ev'+(m.home===u?' · SEN':''));
  setTxt('dnAwayRole','Deplasman'+(m.away===u?' · SEN':''));
  const us=m.home===u?'Ev':'Dep.';
  const tClock=formatKickClock(m);
  if(meta) meta.textContent=`${formatFixtureDayLabel(m.day)} · ${tClock} · Tur ${m.round}/${totalRounds()} · Sen: ${us}`;
}

// ===== KULÜP TRANSFERLERİ (rakip kulüplerin satılık/kiralık oyuncuları) =====
const CLUB_TRANSFER_TARGET=14;
/** Kullanıcının lig grubundaki rakip kulüp adları. */
function userLeaguePeers(){
  try{
    if(!G.team||!G.team.tblKey) return [];
    const sub=getTblState().subs[G.team.tblKey];
    if(!sub||!sub.teams) return [];
    return sub.teams.filter(n=>n&&n!==G.team.isim);
  }catch(e){ return []; }
}
function genClubListing(peers){
  const club=peers.length?ch(peers):'Rakip Kulüp';
  const r=Math.random();
  let minG,maxG;
  if(r<0.2){ minG=58; maxG=64; }
  else if(r<0.5){ minG=64; maxG=71; }
  else if(r<0.78){ minG=71; maxG=78; }
  else if(r<0.93){ minG=78; maxG=84; }
  else { minG=84; maxG=90; }
  const p=genPlayerBounded(ch(POZLAR),minG,maxG);
  const loan=Math.random()<0.42;
  p.id='ct'+(G._ctSeq=(G._ctSeq||0)+1)+'_'+Math.floor(Math.random()*1e6);
  p.seed='ct'+p.id+'_'+hash32(p.isim+p.poz+club);
  p.fromClub=club;
  p.mode=loan?'loan':'sale';
  const base=transferFeeKR(p);
  /* Sahipli oyuncu: satış priml, kiralık tek seferlik ucuz bedel + haftalık maaş sende. */
  p.fiyat=loan?Math.round(base*0.22):Math.round(base*1.3);
  p.kiralik=loan;
  p.sure=rand(6,72);
  p.teklifler=rand(0,14);
  return p;
}
function ensureClubTransferStock(){
  if(!Array.isArray(G.clubTransferPlayers)) G.clubTransferPlayers=[];
  const peers=userLeaguePeers();
  let added=false;
  let guard=0;
  while(G.clubTransferPlayers.length<CLUB_TRANSFER_TARGET&&guard++<60){
    G.clubTransferPlayers.push(genClubListing(peers));
    added=true;
  }
  if(added) ensureUniquePlayerNames(G.clubTransferPlayers);
}
/** Gün ilerledikçe: bazı ilanlar başka kulüplerce alınır (çıkar), havuz yenilenir. */
function tickClubTransferMarket(daysAdvanced){
  if(!Array.isArray(G.clubTransferPlayers)) G.clubTransferPlayers=[];
  const d=Math.max(0,Math.round(Number(daysAdvanced)||0));
  if(d<=0) return;
  const remove=Math.min(G.clubTransferPlayers.length,rand(0,2));
  for(let i=0;i<remove;i++){
    if(G.clubTransferPlayers.length) G.clubTransferPlayers.splice(rand(0,G.clubTransferPlayers.length-1),1);
  }
  ensureClubTransferStock();
}
function renderClubTransfers(){
  const host=document.getElementById('clubTransferList');
  const cnt=document.getElementById('clubCountNum');
  if(!host) return;
  ensureClubTransferStock();
  if(cnt) cnt.textContent=String(G.clubTransferPlayers.length);
  const filt=G.clubTransferFilter||'all';
  let list=G.clubTransferPlayers.slice();
  if(filt!=='all') list=list.filter(p=>p.mode===filt);
  list.sort((a,b)=>(b.genel||0)-(a.genel||0));
  if(!list.length){
    host.innerHTML='<div style="font-size:12px;color:var(--text2);padding:16px;text-align:center;">Bu filtreye uygun kulüp ilanı yok.</div>';
    return;
  }
  host.innerHTML=list.map(p=>{
    const st=starFromGenel(p.genel);
    const loan=p.mode==='loan';
    const modeBadge=loan?'<span class="tmode-badge tmode-loan">🔁 KİRALIK</span>':'<span class="tmode-badge tmode-sale">💵 SATILIK</span>';
    const priceLbl=loan?'Kira bedeli':'Bonservis';
    const act=loan
      ?`<button class="btn-bid" onclick="event.stopPropagation();loanClubPlayer('${p.id}')" style="background:var(--blue);">KİRALA</button>`
      :`<button class="btn-bid" onclick="event.stopPropagation();openClubOfferModal('${p.id}')">TEKLİF VER</button>`;
    return `
    <div class="mcard" onclick="openPlayerModal('${p.id}')" style="cursor:pointer;" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPlayerModal('${p.id}');}">
      <div class="mavatar-wrap">
      <img class="mavatar" src="${playerAvatar(p.seed,p.id,{market:true})}" ${playerAvatarImgAttrs(p.seed,p.id,{market:true})} alt="${p.isim}">
      <div class="pimg-cap" style="margin-top:2px;">OVR ${p.genel}</div>
      </div>
      <div style="min-width:36px;text-align:center;">
        <div style="font-family:'Bebas Neue','Arial Narrow','Helvetica Neue Condensed',Impact,sans-serif;font-size:24px;color:${p.genel>=75?'var(--green)':p.genel>=60?'var(--gold)':'var(--red)'};">${p.genel}</div>
        <span class="pbadge pos-${p.poz.toLowerCase()}" style="font-size:9px;">${p.poz}</span>
        <div style="font-size:9px;color:var(--text2);">${st}★</div>
      </div>
      <div class="minfo">
        <div style="font-weight:700;font-size:13px;">${p.bayrak} ${p.isim} ${modeBadge}</div>
        <div style="font-size:11px;color:var(--text2);">${p.ulke} • ${p.yas} yaş • ${p.boy}cm</div>
        <div style="margin-top:3px;">${rolBadgeHtml(p)}</div>
        <div style="font-size:10px;color:var(--accent);margin-top:3px;">🏛️ ${escMatch(p.fromClub||'')} kulübünden</div>
        <div style="display:flex;gap:7px;margin-top:4px;flex-wrap:wrap;">
          <span style="font-size:11px;">⚔️${p.hucum}</span><span style="font-size:11px;">🛡️${p.savunma}</span>
          <span style="font-size:11px;">🏀${p.ribaund}</span><span style="font-size:11px;">🎯${p.pas}</span>
        </div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;">Maaş: ${fmtn(p.maas)} KR/hf${loan?' · sezon sonunda döner':''}</div>
      </div>
      <div class="mprice">
        <div style="font-size:9px;color:var(--text2);">${priceLbl}</div>
        <div class="pval">${fmtn(p.fiyat)}</div>
        <div style="font-size:10px;color:var(--text2);">KR</div>
        ${act}
      </div>
    </div>`;
  }).join('');
}
/* Faz 4.1: Kulüpten transfer artık PAZARLIK ile — kullanıcı teklif verir, kararı oyuncu (kişiliği) verir. */
function openClubOfferModal(id){
  ensureClubTransferStock();
  const p=(G.clubTransferPlayers||[]).find(x=>x.id===id);
  if(!p||p.mode!=='sale'){ showNotif('Bu oyuncu satılık değil.'); return; }
  if(G.players.length>=18){ showNotif('Kadro dolu (en fazla 18). Önce bir oyuncu gönder.'); return; }
  const ki=kisilikInfo(p.kisilik);
  const asking=p.fiyat;
  const lo=Math.round(asking*0.5), hi=Math.round(asking*1.5), def=asking;
  showAppModal(`<div class="modal-title">🤝 Teklif — ${escMatch(p.isim)}</div>
    <p style="font-size:12px;color:var(--text2);margin-bottom:10px;">${escMatch(p.fromClub||'Kulüp')} · ${p.poz} · OVR ${p.genel} · ${starFromGenel(p.genel)}★</p>
    <div style="background:var(--bg3);border-radius:9px;padding:10px;margin-bottom:12px;font-size:12px;">
      <div>İstenen bonservis (asking): <strong style="color:var(--gold);">${fmtn(asking)} KR</strong></div>
      <div style="margin-top:4px;">Oyuncu kişiliği: <strong>${ki.ikon} ${ki.ad}</strong> — <span style="color:var(--text2);">${ki.desc}</span></div>
    </div>
    <label style="font-size:11px;color:var(--text2);">Teklifin (KR)</label>
    <input id="clubOfferInput" type="number" min="${lo}" max="${hi}" value="${def}" step="500" style="width:100%;padding:10px;border-radius:9px;background:var(--bg3);color:var(--text);border:1px solid var(--border);font-size:14px;margin:5px 0 4px;">
    <p style="font-size:10px;color:var(--text2);margin-bottom:12px;">Düşük teklif reddedilebilir; kararı oyuncu verir. Yüksek teklif kabul şansını artırır.</p>
    <div style="display:flex;gap:8px;">
      <button type="button" class="btn-p" style="flex:1;padding:10px;" onclick="submitClubOffer('${id}')">Teklifi gönder</button>
      <button type="button" class="btn-sm" style="flex:1;" onclick="closeAppModal()">Vazgeç</button>
    </div>`);
}
function submitClubOffer(id){
  const p=(G.clubTransferPlayers||[]).find(x=>x.id===id);
  if(!p||p.mode!=='sale') return;
  const inp=document.getElementById('clubOfferInput');
  let offer=Math.round(Number(inp&&inp.value)||p.fiyat);
  offer=Math.max(1,offer);
  if(G.coins<offer){ showNotif('❌ Bu teklifi karşılayacak KR yok!'); return; }
  const dec=playerAcceptsOffer(p,offer,p.fiyat,{betterTeam:false});
  if(dec.accept){
    closeAppModal();
    buyClubPlayer(id,offer);
  } else {
    const ki=kisilikInfo(p.kisilik);
    const red=offer<p.fiyat
      ? `${p.isim} bu teklifi düşük buldu (${ki.ad.toLowerCase()} kişilik).`
      : `${p.isim} şu an ayrılmak istemiyor (${ki.ad.toLowerCase()} kişilik).`;
    showNotif(`🤝 Teklif reddedildi — ${red} Daha iyi bir teklif deneyebilirsin.`,{critical:true});
  }
}
function buyClubPlayer(id,price){
  ensureClubTransferStock();
  const p=(G.clubTransferPlayers||[]).find(x=>x.id===id);
  if(!p||p.mode!=='sale') return;
  if(G.players.length>=18){ showNotif('Kadro dolu (en fazla 18). Önce bir oyuncu gönder.'); return; }
  const bedel=Math.round(Number(price)>0?Number(price):p.fiyat);
  if(G.coins<bedel){ showNotif('❌ Yeterli KR yok!'); return; }
  const st=starFromGenel(p.genel);
  txn('Transfer (kulüpten): '+p.isim,-bedel);
  unlockAchievement('transfer');
  const np={...p};
  ['mode','fiyat','kiralik','fromClub','sure','teklifler','freeAgent','hiddenPot'].forEach(k=>delete np[k]);
  np.scouted=true;
  if(np.enerji==null||np.enerji==='') np.enerji=100;
  G.players.push(np);
  G.clubTransferPlayers=G.clubTransferPlayers.filter(x=>x.id!==id);
  G.chemistry=Math.max(20,G.chemistry-(teamLeadership()>=78?rand(3,8):rand(5,12)));
  showNotif(`✅ ${p.isim} ${p.fromClub} kulübünden ${fmtn(bedel)} KR ile kadrona katıldı!`);
  if(G.team&&G.team.tblKey){
    pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--green);">💰 <strong>${G.team.isim}</strong>, <strong>${escMatch(p.fromClub||'')}</strong> kulübünden <strong>${fmtn(bedel)} KR</strong> bonservisle <strong>${p.isim}</strong> (${st}★) transferini bitirdi.</div>`);
  }
  updateCoins();updateChemistry();renderMarket();
  if(document.getElementById('page-kadro')&&document.getElementById('page-kadro').classList.contains('active')) renderRoster();
  scheduleGameSave();
}
function loanClubPlayer(id){
  ensureClubTransferStock();
  const p=(G.clubTransferPlayers||[]).find(x=>x.id===id);
  if(!p||p.mode!=='loan') return;
  if(G.players.length>=18){ showNotif('Kadro dolu (en fazla 18). Önce bir oyuncu gönder.'); return; }
  if(G.coins<p.fiyat){ showNotif('❌ Kira bedeli için yeterli KR yok!'); return; }
  txn('Kiralama bedeli: '+p.isim,-p.fiyat);
  const np={...p};
  ['mode','fiyat','kiralik','sure','teklifler','freeAgent'].forEach(k=>delete np[k]);
  np.loan=true;
  np.loanFrom=p.fromClub;
  delete np.fromClub;
  np.loanReturnDay=(G.gameDay||1)+rand(45,75);
  if(np.enerji==null||np.enerji==='') np.enerji=100;
  G.players.push(np);
  G.clubTransferPlayers=G.clubTransferPlayers.filter(x=>x.id!==id);
  showNotif(`✅ ${p.isim} kiralık olarak kadrona katıldı — ~${np.loanReturnDay-(G.gameDay||1)} gün sonra ${np.loanFrom} kulübüne dönecek.`);
  updateCoins();renderMarket();
  if(document.getElementById('page-kadro')&&document.getElementById('page-kadro').classList.contains('active')) renderRoster();
  scheduleGameSave();
}
/** Süresi dolan kiralık oyuncuları kadrodan çıkarır (gün ilerleyince çağrılır). */
function processLoanReturns(){
  if(!Array.isArray(G.players)) return;
  const now=G.gameDay||1;
  const returning=G.players.filter(p=>p&&p.loan&&p.loanReturnDay&&p.loanReturnDay<=now);
  if(!returning.length) return;
  returning.forEach(p=>{
    showNotif(`↩️ ${p.isim} kiralık süresi bitti — ${p.loanFrom||'kulübüne'} döndü.`);
  });
  const ids=new Set(returning.map(p=>p.id));
  G.players=G.players.filter(p=>!ids.has(p.id));
}

function regenerateSeasonFixtures(){
  if(!G.team) return;
  G.ligTeams=genLigTeams();
  if(!G.season||!Array.isArray(G.season.matches)||!G.season.matches.length){
    G.seasonFixtures=[];
    return;
  }
  const u=G.team.isim;
  const list=G.season.matches.filter(m=>m.home===u||m.away===u).sort((a,b)=>a.round-b.round||a.day-b.day||a.seasonMatchIx-b.seasonMatchIx);
  G.seasonFixtures=list.map(m=>({
    md:m.day,
    round:m.round,
    t1:m.home,
    t2:m.away,
    played:!!m.played,
    s1:m.played?m.hs:0,
    s2:m.played?m.as:0,
    seasonMatchIx:m.seasonMatchIx
  }));
}

function buildFixtureRows(){
  if(!G.team) return [];
  if(!G.ligTeams||!G.ligTeams.length) G.ligTeams=genLigTeams();
  ensureMatchKickoffs();
  if(G.season&&G.season.matches&&G.season.matches.length){
    regenerateSeasonFixtures();
    return G.seasonFixtures.map(m=>{
      const sm=G.season.matches[m.seasonMatchIx];
      return{
        t1:m.t1,t2:m.t2,
        round:m.round,
        done:!!m.played,
        s1:m.s1||0,s2:m.s2||0,
        gun:`Gün ${m.md} · T${m.round}`,
        saat:sm?formatKickClock(sm):'—',
        seasonMatchIx:m.seasonMatchIx,
        dayNum:m.md
      };
    });
  }
  if(!G.seasonFixtures||!G.seasonFixtures.length) return [];
  return G.seasonFixtures.map(m=>({
    t1:m.t1,t2:m.t2,
    round:m.round,
    done:!!m.played,
    s1:m.s1||0,s2:m.s2||0,
    gun:`Gün ${m.md}`,
    saat:'—',
    seasonMatchIx:m.seasonMatchIx,
    dayNum:m.md
  }));
}

function annotateFixtureClick(rows){
  const nx=findNextUserSeasonMatch();
  return rows.map(m=>{
    const click=!m.done&&nx&&m.seasonMatchIx!=null&&m.seasonMatchIx===nx.seasonMatchIx;
    return {...m,_click:click};
  });
}

function fixtureGroupedHtml(rows){
  const byDay=new Map();
  rows.forEach(m=>{
    const d=m.dayNum!=null&&m.dayNum>0?m.dayNum:0;
    if(!byDay.has(d)) byDay.set(d,[]);
    byDay.get(d).push(m);
  });
  const days=[...byDay.keys()].filter(d=>d>0).sort((a,b)=>a-b);
  if(!days.length) return fixtureRowsHtml(rows);
  return days.map(d=>`<div style="margin-bottom:18px;">
    <div style="font-size:12px;font-weight:800;color:var(--gold);letter-spacing:0.5px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border);">📆 Gün ${d}</div>
    <div style="display:flex;flex-direction:column;gap:8px;">${fixtureRowsHtml(byDay.get(d))}</div>
  </div>`).join('');
}

function fixtureRowsHtml(rows){
  return rows.map((m,i)=>{
    const clickRow=m._click===true;
    const ona=clickRow?`onclick="scrollToMacLive()" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();scrollToMacLive();}"`:'';
    const hlt=clickRow?'border-color:rgba(239,68,68,0.5);background:rgba(239,68,68,0.06);cursor:pointer;':'';
    const hint=clickRow?' · tıkla → canlı panel':'';
    const subMeta=!m.done&&m.saat&&m.saat!=='—'
      ?`<div style="font-size:10px;color:var(--gold);margin-top:3px;">${m.saat} · ${formatFixtureDayLabel(m.dayNum)}</div>`
      :'';
    return `
    <div ${ona} style="display:flex;align-items:center;gap:10px;padding:9px 10px;background:var(--bg3);border-radius:10px;border:1px solid var(--border);${hlt}">
      <div style="flex:1;font-size:12px;font-weight:600;">${escMatch(m.t1)}</div>
      <div style="text-align:center;min-width:90px;">
        ${m.done?`<div style="font-family:'Bebas Neue','Arial Narrow','Helvetica Neue Condensed',Impact,sans-serif;font-size:17px;">${m.s1}-${m.s2}</div>`:`<div style="font-size:10px;color:var(--text2);">${m.gun}</div>`}
        ${subMeta}
        <span style="display:inline-block;margin-top:2px;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:700;${m.done?'background:rgba(34,197,94,0.2);color:#4ade80;':'background:rgba(59,130,246,0.2);color:#60a5fa;'}">${m.done?'BİTTİ':'YAKINDA'}</span>
        ${clickRow?`<div style="font-size:9px;color:var(--accent);margin-top:3px;font-weight:600;">Sıradaki${hint}</div>`:''}
      </div>
      <div style="flex:1;font-size:12px;font-weight:600;text-align:right;">${escMatch(m.t2)}</div>
    </div>`;
  }).join('');
}

/** Maçlar sayfasının kaydırılabilir konteynerini bulur (#page-mac veya en yakın overflow'lu ata). */
function _macScrollContainer(){
  let el=document.getElementById('page-mac');
  while(el){
    const s=getComputedStyle(el);
    if(/(auto|scroll)/.test(s.overflowY)&&el.scrollHeight>el.clientHeight+4) return el;
    el=el.parentElement;
  }
  return document.getElementById('page-mac');
}
function scrollToMacLive(notify){
  const el=document.getElementById('macLiveAnchor');
  const cont=_macScrollContainer();
  try{
    if(cont&&el){
      // Canlı panel artık en üstte (order:-2) — konteyneri panelin hizasına kaydır.
      const target=Math.max(0,el.offsetTop-8);
      cont.scrollTo({top:target,behavior:'smooth'});
    } else if(el){ el.scrollIntoView({behavior:'smooth',block:'start'}); }
  }catch(e){ try{ if(el) el.scrollIntoView(); }catch(_){} }
  if(notify!==false) showNotif('🔴 Canlı maç paneli açıldı — aşağıda maçı izle.');
}

function renderFixture(){
  const up=document.getElementById('fixtureUpcomingGrid');
  const main=document.getElementById('fixtureMain');
  if(!G.team){
    if(up) up.innerHTML='<div style="font-size:12px;color:var(--text2);grid-column:1/-1;">Takım yüklenince fikstür burada.</div>';
    if(main) main.innerHTML='<div style="font-size:12px;color:var(--text2);padding:8px 0;">—</div>';
    return;
  }
  ensureMatchKickoffs();
  const upcoming=getUpcomingUserMatches(6);
  if(up){
    if(!upcoming.length){
      const done=G.season&&seasonAllMatchesPlayed();
      up.innerHTML='<div style="font-size:12px;color:var(--text2);grid-column:1/-1;">'+(done?'Bu sezonun maçların bitti.':'Sezon bekleniyor — <strong>Lig</strong> ekranından sezonun aktif olduğundan emin ol.')+'</div>';
    } else {
      const nx=findNextUserSeasonMatch();
      up.innerHTML=upcoming.map(m=>macSeasonMatchCardHtml(m,!!(nx&&nx.seasonMatchIx===m.seasonMatchIx))).join('');
    }
  }
  if(main){
    const rows=annotateFixtureClick(buildFixtureRows());
    main.innerHTML=rows.length?fixtureFullSeasonGridHtml(rows):'<div style="font-size:12px;color:var(--text2);padding:10px;">Fikstür henüz yok. <strong>Lig</strong> sezonu başlayınca tüm maçların burada listelenir.</div>';
  }
}

function renderTeamFixturePanel(){
  const el=document.getElementById('teamFixtureList');
  if(!el||!G.team) return;
  el.innerHTML=fixtureGroupedHtml(annotateFixtureClick(buildFixtureRows()));
}

function genCoaches(){
  return KOC_T.slice(0,3).map((k,i)=>{
    const sev=rand(1,5);
    return {...k,id:'c'+i,ad:['Ahmet Yıldız','Carlos Ruiz','Mike Johnson'][i],seviye:sev,maas:Math.round(45+sev*18+sev*sev*2),skor:sev*10+rand(0,15),gecmis:[]};
  });
}

function genCoachMarket(){
  return KOC_T.map((k,i)=>{
    const sev=rand(2,8);
    const maas=Math.round(50+sev*22+sev*sev*2.5);
    const satis=Math.round(400+sev*sev*140+maas*2);
    /* Madde 8: piyasa koçları hazır bir CV ile gelir (geçmiş başarı → skor). */
    const past=rand(0,3);
    const gecmis=[];
    for(let g=0;g<past;g++) gecmis.push({sezon:'geçmiş',basari:ch(['Şampiyonluk','Playoff','Lig 1.liği'])});
    return {...k,id:'cm'+i,ad:`${ch(ILK)} ${ch(SY)}`,seviye:sev,maas,satisFiyat:satis,skor:sev*10+past*12+rand(0,15),gecmis};
  });
}
/** Koç CV'sine başarı ekler ve skorunu artırır (sezon/playoff kazanımında çağrılır). */
function awardCoaches(basari,puan){
  (G.coaches||[]).forEach(c=>{
    c.gecmis=Array.isArray(c.gecmis)?c.gecmis:[];
    c.gecmis.push({sezon:'S'+((G.season&&G.season.year)||'?'),basari});
    c.skor=(Number(c.skor)||(Number(c.seviye)||1)*10)+puan;
  });
}

// ===== RENDER =====
function moodColor(m){return m>=70?'var(--green)':m>=40?'var(--gold)':'var(--red)';}
function moodText(m){return m>=75?'😄 Mutlu':m>=50?'😐 Normal':m>=30?'😕 Mutsuz':'😠 Kızgın';}

/* ── Scouting (Madde 7) — bazı oyuncuların gerçek potansiyeli gizli; KR ile keşif raporu açar. */
function playerScouted(p){ return !p||p.scouted===true||!p.hiddenPot; }
function potRange(p){
  const pot=Number(p.potansiyel)||Number(p.genel)||60;
  const spread=6+(hash32(String(p.id||p.seed||''))%7);   /* 6-12, oyuncuya sabit */
  const lo=Math.max(Number(p.genel)||0,pot-spread);
  const hi=Math.min(99,pot+Math.floor(spread/2));
  return {lo,hi};
}
function scoutCost(p){ return ecoRound(200+(hash32('scout'+String(p.id||''))%420)); }
function potHtml(p){
  if(!p.potansiyel) return '';
  if(playerScouted(p)){
    return `<div style="font-size:10px;color:var(--blue);margin-top:3px;">⭐ Pot: ${p.potansiyel} (${Math.max(0,(p.potansiyel||p.genel)-p.genel)} boşluk)</div>`;
  }
  const r=potRange(p);
  return `<div style="font-size:10px;color:var(--text2);margin-top:3px;">🔍 Pot: ${r.lo}–${r.hi} <span style="color:var(--gold);">(belirsiz — keşif gerek)</span></div>`;
}
function scoutPlayer(id){
  const p=findPlayerRecord(id);
  if(!p){ showNotif('Oyuncu bulunamadı.'); return; }
  if(playerScouted(p)){ showNotif('Bu oyuncu zaten keşfedildi.'); return; }
  const cost=scoutCost(p);
  if(G.coins<cost){ showNotif('❌ Keşif raporu için yeterli KR yok!'); return; }
  txn('Keşif raporu: '+p.isim,-cost);
  p.scouted=true;
  updateCoins();
  showNotif(`🔍 ${p.isim} keşfedildi — gerçek potansiyel: ${p.potansiyel}.`);
  scheduleGameSave();
  const mr=document.getElementById('appModalRoot');
  if(mr&&mr.style.display!=='none') openPlayerModal(id);
  if(document.getElementById('page-altyapi')&&document.getElementById('page-altyapi').classList.contains('active')) renderAltyapi();
  if(document.getElementById('page-market')&&document.getElementById('page-market').classList.contains('active')) renderMarket();
}
function injBannerHtml(p){
  if(typeof playerIsInjured!=='function'||!playerIsInjured(p)) return '';
  const left=Math.max(0,(p.injReturnDay||0)-(G.gameDay||1));
  const sevIcon={'Hafif':'🟡','Orta':'🟠','Ağır':'🔴'}[p.injurySeverity]||'🩹';
  const sev=p.injurySeverity?`${sevIcon} ${p.injurySeverity}`:'🩹 Sakat';
  const bolge=p.injuryBolge?` (${p.injuryBolge})`:'';
  return `<div class="pinj-banner">${sev} · ${p.injuryEtiket||'Tıbbi'}${bolge} · dönüş: <strong>Gün ${p.injReturnDay||'?'}</strong> (~${left} gün)</div>`;
}

function renderPlayerCard(p,showBuy=false,price=0,showPromote=false,showList=false){
  const oc=p.genel>=75?'var(--green)':p.genel>=60?'var(--gold)':'var(--red)';
  const st=starFromGenel(p.genel);
  const avOpt=showBuy?{market:true}:{ovr:p.genel};
  return `<div class="pcard">
    ${injBannerHtml(p)}
    <div class="overall-badge" style="color:${oc};">${p.genel}</div>
    <div class="pcard-top">
      <div class="pimg-wrap">
      <img class="pimg" src="${playerAvatar(p.seed,p.id,avOpt)}" ${playerAvatarImgAttrs(p.seed,p.id,avOpt)} alt="${p.isim}">
      <div class="pimg-cap">OVR ${p.genel}</div>
      </div>
      <div style="flex:1;min-width:0;">
        <div class="pname">${p.isim}</div>
        <div class="pmeta">${p.bayrak} ${p.ulke} • ${p.yas} yaş<br>${p.boy}cm • ${p.kilo}kg</div>
        <span class="pbadge pos-${p.poz.toLowerCase()}">${p.poz} — ${POZ_TR[p.poz]}</span>
        <div style="font-size:10px;color:var(--gold);margin-top:3px;">OVR ${p.genel} · ${st}★</div>
        ${potHtml(p)}
        ${p.academyProspect?'<div style="font-size:9px;color:var(--green);margin-top:3px;font-weight:600;">★ Gelişime çok açık profil</div>':''}
        <div style="margin-top:6px;">
          <div style="font-size:10px;color:var(--text2);">Psikoloji: <span style="color:${moodColor(p.mood)};">${moodText(p.mood)}</span></div>
          <div class="mood-bar"><div class="mood-fill" style="width:${p.mood}%;background:${moodColor(p.mood)};"></div></div>
        </div>
      </div>
    </div>
    <div class="sgrid">
      ${STAT_KEYS.map(k=>`<div class="sitem"><span class="sname">${STAT_LABELS[k]}</span><span class="sval ${sv(p[k])}">${p[k]}</span></div>`).join('')}
    </div>
    <div style="margin-top:8px;font-size:11px;color:var(--text2);">Maaş: <span style="color:var(--gold);">${fmtn(p.maas)} KR/hafta</span>${p.kontratSezon!=null?` · 📄 ${p.kontratSezon} sezon`:''}${showList?` · ${enerjiRozetHtml(p)}`:''}</div>
    ${p.sezon&&p.sezon.mac?`<div style="margin-top:4px;font-size:10px;color:var(--blue);">📊 Sezon: ${p.sezon.mac} maç · ${(p.sezon.pts/p.sezon.mac).toFixed(1)} sayı · ${(p.sezon.ast/p.sezon.mac).toFixed(1)} asist ort.</div>`:''}
    ${showBuy?`<button class="btn-bid" onclick="buyFromMarket('${p.id}')">TEKLİF VER — ${fmtn(price)} KR</button>`:''}
    ${showPromote?`<button class="btn-p" onclick="promoteYouth('${p.id}')" style="padding:7px;font-size:11px;margin-top:8px;">KADROYA AL</button>`:''}
    ${showList?`<button type="button" class="btn-bid" onclick="listPlayerToMarket('${p.id}')" style="margin-top:8px;">TRANSFER MARKETE KOY</button>`:''}
  </div>`;
}

function findPlayerRecord(pid){
  if(!pid) return null;
  return G.players.find(p=>p.id===pid)
    ||G.youth.find(p=>p.id===pid)
    ||G.marketPlayers.find(p=>p.id===pid)
    ||(G.clubTransferPlayers||[]).find(p=>p.id===pid)
    ||null;
}

/* ── FAZ A: rol rozeti + eğilim çubukları ─────────────────────────────────────────────
   Rol statlardan türer (computeRole), eğilimler oyuncunun sahadaki davranışını belirler:
   üçlük denemesi payı, potaya dalma, asist dağıtımı, son dakika soğukkanlılığı, faul disiplini.
   Bunlar maç motorunda GERÇEKTEN kullanılır (wPick ağırlıkları) — dekoratif değildir. */
const EG_META={
  uc:      {ad:'Üçlük eğilimi',    ikon:'🏹', desc:'Şut seçiminde dışarıyı tercih etme oranı.'},
  pota:    {ad:'Potaya dalma',     ikon:'💨', desc:'Boyalı alana girme / faul kazanma eğilimi.'},
  pas:     {ad:'Pas dağıtımı',     ikon:'🎁', desc:'Asistlerin ne kadarının ondan geçtiği.'},
  clutch:  {ad:'Soğukkanlılık',    ikon:'🧊', desc:'Son 2 dakika ve uzatmada isabet. Düşükse baskı altında eli titrer.'},
  disiplin:{ad:'Faul disiplini',   ikon:'⚖️', desc:'Düşükse takımın faullerini o toplar, erken oyundan atılır.'}
};
function egBarColor(k,v){
  if(k==='disiplin'||k==='clutch') return v>=70?'var(--green)':v>=45?'var(--gold)':'var(--red)';
  return v>=70?'var(--blue)':v>=40?'var(--text2)':'var(--border)';
}
/** FAZ D: oyuncu kartında süre/huzursuzluk/söz durumu. */
function lockerLineHtml(p){
  try{
    if(!p||!(G.players||[]).some(x=>x&&x.id===p.id)) return "";
    const sit=Number(p.sit)||0;
    const bits=[];
    if(p.soz) bits.push(`<span style="color:var(--blue);">🤝 Söz verildi — sonraki maç ilk 5</span>`);
    if(sit>=2) bits.push(`<span style="color:var(--gold);">⏳ ${sit} maçtır süre almadı</span>`);
    if((Number(p.mood)||70)<45) bits.push(`<span style="color:var(--red);">😖 Huzursuz</span>`);
    if(Number(p.kirgin)||0) bits.push(`<span style="color:var(--red);">💔 ${p.kirgin} kez görmezden gelindi</span>`);
    if(!bits.length) return "";
    return `<p style="font-size:10px;margin:-4px 0 8px;">${bits.join(' · ')}</p>`;
  }catch(e){ return ""; }
}
function rolTendencyHtml(p){
  if(!p) return '';
  try{ ensureRole(p); }catch(e){ return ''; }
  const r=rolInfo(p.rol);
  const bars=Object.keys(EG_META).map(k=>{
    const v=Math.max(0,Math.min(100,Number(p.eg&&p.eg[k])||0));
    const m=EG_META[k];
    return `<div style="display:flex;align-items:center;gap:7px;" title="${m.desc}">
      <span style="font-size:10px;color:var(--text2);flex:0 0 96px;">${m.ikon} ${m.ad}</span>
      <span style="flex:1;height:6px;border-radius:4px;background:var(--bg3);overflow:hidden;display:block;"><span style="display:block;height:100%;width:${v}%;background:${egBarColor(k,v)};"></span></span>
      <span style="font-size:10px;color:var(--text2);flex:0 0 22px;text-align:right;">${v}</span>
    </div>`;
  }).join('');
  return `<div style="background:var(--bg3);border-radius:10px;padding:9px 11px;margin-bottom:10px;">
    <div style="font-size:12px;font-weight:700;margin-bottom:2px;">${r.ikon} ${r.ad}</div>
    <div style="font-size:10px;color:var(--text2);margin-bottom:8px;">${r.desc}</div>
    <div style="display:flex;flex-direction:column;gap:5px;">${bars}</div>
  </div>`;
}
/** Liste/kart görünümü için kısa rol rozeti. */
function rolBadgeHtml(p){
  if(!p) return '';
  try{ ensureRole(p); }catch(e){ return ''; }
  const r=rolInfo(p.rol);
  return `<span class="rol-badge" title="${r.ad} — ${r.desc}">${r.ikon} ${r.ad}</span>`;
}
function openPlayerModal(pid){
  const p=findPlayerRecord(pid);
  if(!p){ showNotif('Oyuncu bulunamadı.'); return; }
  const inMarket=G.marketPlayers.some(x=>x.id===pid);
  const inYouth=G.youth.some(x=>x.id===pid);
  const inClub=(G.clubTransferPlayers||[]).some(x=>x.id===pid);
  const av=(inMarket||inClub)?{market:true}:{ovr:p.genel};
  const salt=inMarket?(p.marketIdx!=null?p.marketIdx:p.id):p.id;
  const bigImg=playerAvatar(p.seed,salt,av);
  const oc=p.genel>=75?'var(--green)':p.genel>=60?'var(--gold)':'var(--red)';
  const st=starFromGenel(p.genel);
  const actions=[];
  if(inMarket){
    const pr=p.fiyat!=null?Number(p.fiyat):transferFeeKR(p);
    actions.push(`<button type="button" class="btn-bid" onclick="event.stopPropagation();buyFromMarket('${p.id}');closeAppModal();" style="margin-top:4px;width:100%;">TEKLİF VER — ${fmtn(pr)} KR</button>`);
  }
  if(inClub){
    if(p.mode==='loan'){
      actions.push(`<button type="button" class="btn-bid" onclick="event.stopPropagation();loanClubPlayer('${p.id}');closeAppModal();" style="margin-top:4px;width:100%;background:var(--blue);">🔁 KİRALA — ${fmtn(p.fiyat)} KR · ${escMatch(p.fromClub||'')}</button>`);
    } else {
      actions.push(`<button type="button" class="btn-bid" onclick="event.stopPropagation();closeAppModal();openClubOfferModal('${p.id}');" style="margin-top:4px;width:100%;">🤝 TEKLİF VER — istenen ${fmtn(p.fiyat)} KR · ${escMatch(p.fromClub||'')}</button>`);
    }
  }
  if(inYouth){
    actions.push(`<button type="button" class="btn-p" onclick="event.stopPropagation();promoteYouth('${p.id}');closeAppModal();" style="margin-top:4px;width:100%;padding:9px;">KADROYA AL</button>`);
  }
  if(!inMarket&&!inYouth&&!inClub){
    const extCost=salaryKRFromGenel(p.genel)*2;
    const expiring=(p.kontratSezon!=null&&p.kontratSezon<=1);
    actions.push(`<button type="button" class="btn-p" onclick="event.stopPropagation();extendContract('${p.id}');" style="margin-top:4px;width:100%;padding:9px;${expiring?'background:var(--gold);color:#111;':''}">✍️ SÖZLEŞME UZAT — ${fmtn(extCost)} KR${expiring?' (bitmek üzere!)':''}</button>`);
    actions.push(`<button type="button" class="btn-bid" onclick="event.stopPropagation();listPlayerToMarket('${p.id}');closeAppModal();" style="margin-top:4px;width:100%;">TRANSFER MARKETE KOY</button>`);
  }
  let potBlock='';
  if(p.potansiyel){
    if(playerScouted(p)){
      potBlock=`<div style="font-size:11px;color:var(--blue);margin-bottom:8px;">⭐ Potansiyel: ${p.potansiyel} (yaklaşık +${Math.max(0,(p.potansiyel||p.genel)-p.genel)} gelişim payı)</div>`;
    } else {
      const r=potRange(p);
      potBlock=`<div style="font-size:11px;color:var(--text2);margin-bottom:8px;">🔍 Potansiyel: <strong>${r.lo}–${r.hi}</strong> (belirsiz) <button type="button" class="btn-sm" style="padding:3px 8px;font-size:10px;margin-left:6px;" onclick="event.stopPropagation();scoutPlayer('${p.id}')">Keşfet — ${fmtn(scoutCost(p))} KR</button></div>`;
    }
  }
  const html=`<div class="card-title" style="margin-top:0;">${p.bayrak} ${p.isim}</div>
  <p style="font-size:12px;color:var(--text2);margin-bottom:8px;">${POZ_TR[p.poz]||''} · ${p.ulke} · ${p.yas} yaş · ${p.boy}cm · ${p.kilo}kg</p>
  <p style="font-size:10px;color:var(--text2);margin-bottom:4px;">Psikoloji: <span style="color:${moodColor(p.mood)};">${moodText(p.mood)}</span></p>
  <p style="font-size:10px;color:var(--text2);margin-bottom:10px;" title="${kisilikInfo(p.kisilik).desc}">Kişilik: <strong>${kisilikInfo(p.kisilik).ikon} ${kisilikInfo(p.kisilik).ad}</strong> — <span style="opacity:.85;">${kisilikInfo(p.kisilik).desc}</span></p>
  ${lockerLineHtml(p)}
  ${rolTendencyHtml(p)}
  ${potBlock}
  <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;">
    <div style="flex:0 0 min(42vw,240px);">
      <img class="player-modal-hero" src="${bigImg}" ${playerAvatarImgAttrs(p.seed,salt,av)}>
      ${injBannerHtml(p)}
      <div style="text-align:center;margin-top:8px;font-family:'Bebas Neue','Arial Narrow','Helvetica Neue Condensed',Impact,sans-serif;font-size:32px;color:${oc};">${p.genel} <span style="font-size:13px;color:var(--text2);font-weight:600;font-family:system-ui;">OVR · ${st}★</span></div>
    </div>
    <div style="flex:1;min-width:240px;">
      <div style="font-size:11px;color:var(--text2);margin-bottom:6px;">Maaş: <span style="color:var(--gold);font-weight:600;">${fmtn(p.maas)} KR/hafta</span>${p.kontratSezon!=null?` · 📄 Sözleşme: ${p.kontratSezon} sezon`:''}</div>
      ${p.sezon&&p.sezon.mac?`<div style="font-size:11px;color:var(--blue);margin-bottom:10px;">📊 Bu sezon: ${p.sezon.mac} maç · ${(p.sezon.pts/p.sezon.mac).toFixed(1)} sayı · ${(p.sezon.ast/p.sezon.mac).toFixed(1)} asist · ${(p.sezon.reb/p.sezon.mac).toFixed(1)} ribaund ort.</div>`:'<div style="font-size:11px;color:var(--text2);margin-bottom:10px;">📊 Bu sezon henüz maça çıkmadı.</div>'}
      <div class="sgrid" style="margin-bottom:0;">
        ${STAT_KEYS.map(k=>`<div class="sitem"><span class="sname">${STAT_LABELS[k]}</span><span class="sval ${sv(p[k])}">${p[k]}</span></div>`).join('')}
      </div>
    </div>
  </div>
  <div style="margin-top:14px;display:flex;flex-direction:column;gap:6px;">${actions.join('')}</div>`;
  showAppModal(html,{xl:true});
}

function renderRosterListRow(p){
  const st=starFromGenel(p.genel);
  return `
    <div class="mcard" onclick="openPlayerModal('${p.id}')" style="cursor:pointer;" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPlayerModal('${p.id}');}">
    ${injBannerHtml(p)}
      <div class="mavatar-wrap">
      <img class="mavatar" src="${playerAvatar(p.seed,p.id,{ovr:p.genel})}" ${playerAvatarImgAttrs(p.seed,p.id,{ovr:p.genel})} alt="${p.isim}">
      <div class="pimg-cap" style="margin-top:2px;">OVR ${p.genel}</div>
      </div>
      <div style="min-width:36px;text-align:center;">
        <div style="font-family:'Bebas Neue','Arial Narrow','Helvetica Neue Condensed',Impact,sans-serif;font-size:24px;color:${p.genel>=75?'var(--green)':p.genel>=65?'var(--gold)':'var(--red)'};">${p.genel}</div>
        <span class="pbadge pos-${p.poz.toLowerCase()}" style="font-size:9px;">${p.poz}</span>
        <div style="font-size:9px;color:var(--text2);">${st}★</div>
      </div>
      <div class="minfo">
        <div style="font-weight:700;font-size:13px;">${p.bayrak} ${p.isim}</div>
        <div style="font-size:11px;color:var(--text2);">${p.ulke} • ${p.yas} yaş • ${p.boy}cm</div>
        <div style="margin-top:3px;">${rolBadgeHtml(p)}</div>
        <div style="display:flex;gap:7px;margin-top:5px;flex-wrap:wrap;">
          <span style="font-size:11px;">⚔️${p.hucum}</span><span style="font-size:11px;">🛡️${p.savunma}</span>
          <span style="font-size:11px;">🏀${p.ribaund}</span><span style="font-size:11px;">✋${p.topCalma}</span>
        </div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;">Maaş: ${fmtn(p.maas)} KR/hf · ${enerjiRozetHtml(p)}</div>
      </div>
      <div class="mprice">
        <button type="button" class="btn-bid" onclick="event.stopPropagation();listPlayerToMarket('${p.id}')">MARKETE KOY</button>
      </div>
    </div>`;
}

function renderYouthListRow(p){
  const st=starFromGenel(p.genel);
  return `
    <div class="mcard" onclick="openPlayerModal('${p.id}')" style="cursor:pointer;" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPlayerModal('${p.id}');}">
    ${injBannerHtml(p)}
      <div class="mavatar-wrap">
      <img class="mavatar" src="${playerAvatar(p.seed,p.id,{ovr:p.genel})}" ${playerAvatarImgAttrs(p.seed,p.id,{ovr:p.genel})} alt="${p.isim}">
      <div class="pimg-cap" style="margin-top:2px;">OVR ${p.genel}</div>
      </div>
      <div style="min-width:36px;text-align:center;">
        <div style="font-family:'Bebas Neue','Arial Narrow','Helvetica Neue Condensed',Impact,sans-serif;font-size:24px;color:${p.genel>=75?'var(--green)':p.genel>=65?'var(--gold)':'var(--red)'};">${p.genel}</div>
        <span class="pbadge pos-${p.poz.toLowerCase()}" style="font-size:9px;">${p.poz}</span>
        <div style="font-size:9px;color:var(--text2);">${st}★</div>
      </div>
      <div class="minfo">
        <div style="font-weight:700;font-size:13px;">${p.bayrak} ${p.isim}</div>
        <div style="font-size:11px;color:var(--text2);">${p.ulke} • ${p.yas} yaş • ${p.boy}cm ${p.potansiyel?`· Pot ${p.potansiyel}`:''}</div>
        <div style="margin-top:3px;">${rolBadgeHtml(p)}</div>
        <div style="display:flex;gap:7px;margin-top:5px;flex-wrap:wrap;">
          <span style="font-size:11px;">⚔️${p.hucum}</span><span style="font-size:11px;">🛡️${p.savunma}</span>
          <span style="font-size:11px;">🏀${p.ribaund}</span><span style="font-size:11px;">✋${p.topCalma}</span>
        </div>
      </div>
      <div class="mprice">
        <button type="button" class="btn-p" onclick="event.stopPropagation();promoteYouth('${p.id}')" style="padding:7px;font-size:11px;">KADROYA AL</button>
      </div>
    </div>`;
}

function renderRoster(){
  try{ renderLockerRoomPanel(); }catch(e){}   /* FAZ D: soyunma odası paneli */
  const kb=document.getElementById('kadroPrepareBanner');
  if(kb){
    let ix=G.prepareMatchIx;
    const nx=findNextUserSeasonMatch();
    if(ix!=null&&nx&&ix!==nx.seasonMatchIx){
      G.prepareMatchIx=null;
      ix=null;
      scheduleGameSave();
    }
    if(ix!=null&&G.team&&G.season&&Array.isArray(G.season.matches)){
      const mm=G.season.matches.find(x=>x.seasonMatchIx===ix);
      if(mm&&!mm.played&&(mm.home===G.team.isim||mm.away===G.team.isim)){
        kb.style.display='block';
        const op=mm.home===G.team.isim?mm.away:mm.home;
        kb.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <div style="font-size:12px;"><strong>🎯 Maç hazırlığı</strong> — vs <strong>${escMatch(op)}</strong> · ${formatFixtureDayLabel(mm.day)} · ${formatKickClock(mm)} · Tur ${mm.round}/${totalRounds()}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="fbtn" onclick="gotoMacPage()">Maçlara dön</button>
            <button type="button" class="fbtn" onclick="clearPrepareMatch()">Kapat</button>
          </div>
        </div>`;
      } else {
        kb.style.display='none';
        if(!mm||mm.played) G.prepareMatchIx=null;
      }
    } else {
      kb.style.display='none';
    }
  }
  const filter=G.kadroFilter||'all';
  let f=filter==='all'?G.players.slice():G.players.filter(p=>p.poz===filter);
  f.sort((a,b)=>(b.genel||0)-(a.genel||0));
  const grid=document.getElementById('rosterGrid');
  const view=G.kadroView||'cards';
  if(view==='list'){
    grid.className='roster-as-list';
    grid.innerHTML=f.map(p=>renderRosterListRow(p)).join('');
  } else {
    grid.className='g3';
    grid.innerHTML=f.map(p=>renderPlayerCard(p,false,0,false,true)).join('');
  }
  updateChemistry();
}

function setKadroView(mode,btn){
  G.kadroView=mode||'cards';
  document.querySelectorAll('#page-kadro .fbtn.kvbtn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderRoster();
}

function filterRoster(f,btn){
  G.kadroFilter=f;
  document.querySelectorAll('#page-kadro .fbtn:not(.kvbtn)').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderRoster();
}

function gotoAltyapiPage(){
  const el=document.querySelector('#sbNav button[data-page="altyapi"]');
  showPage('altyapi',el||null);
}

/** Madde 36: kadronun en yüksek liderlik statı (kaptan) — kimya/moral üzerinde olumlu etki için. */
function teamLeadership(){
  const avail=(G.players||[]).filter(p=>!playerIsInjured(p));
  if(!avail.length) return 60;
  return avail.reduce((m,p)=>Math.max(m,statN(p,'liderlik')),0);
}
/* ── FAZ D: soyunma odası kriz modalı (İLETİŞİM) ──────────────────────────────────────
   Kullanıcı üç yoldan birini seçer; sonuç oyuncunun KİŞİLİĞİNE göre değişir:
   sadık/şehir bağımlısı sert konuşmayı kaldırır, hırslı/parasever söz ister, kararsız
   öngörülemez. Söz verilirse `p.soz` işaretlenir ve sonraki maçta denetlenir. */
function openLockerRoomModal(pid){
  const p=(G.players||[]).find(x=>x.id===pid);
  if(!p) return;
  const k=kisilikInfo(p.kisilik);
  const rank=_rosterRank(p)+1;
  const av=playerAvatar(p.seed,p.id,{ovr:p.genel});
  const sikayet=[
    `“${p.sit} maçtır kenardayım. Ben bu takımın en iyi ${rank}. oyuncusuyum — sahada olmam gerekiyor.”`,
    `“Antrenmanda her şeyi yapıyorum ama maç günü ismim yok. Bunu anlamıyorum.”`,
    `“Menajerimle konuştum. Süre alamayacaksam burada ne işim var?”`
  ][Math.abs(hash32(p.id))%3];
  showAppModal(`<div class="modal-title">💬 Soyunma Odası — ${escMatch(p.isim)}</div>
    <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;flex-wrap:wrap;">
      <img src="${av}" ${playerAvatarImgAttrs(p.seed,p.id,{ovr:p.genel})} style="width:74px;height:92px;border-radius:10px;object-fit:cover;border:2px solid var(--red);" alt="">
      <div style="flex:1;min-width:200px;">
        <div style="font-size:12px;color:var(--text2);">${p.poz} · OVR ${p.genel} · kadro sırası ${rank}. · ${k.ikon} ${k.ad}</div>
        <div style="font-size:11px;color:var(--red);margin-top:3px;">😖 Moral ${Math.round(Number(p.mood)||0)}/100 · ${p.sit} maçtır süre almadı</div>
        <p style="font-size:13px;font-style:italic;margin:8px 0 0;line-height:1.5;">${sikayet}</p>
      </div>
    </div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:8px;">Nasıl karşılık vereceksin? Kararın moralini ve tüm takımın kimyasını etkiler.</div>
    <div style="display:flex;flex-direction:column;gap:7px;">
      <button type="button" class="btn-p" style="padding:10px;text-align:left;" onclick="resolveCrisis('${p.id}','soz')">
        🤝 <strong>Söz ver</strong> — “Gelecek maç ilk 5’tesin.”<br><span style="font-size:10px;opacity:.85;">Morali hemen yükselir. Sözünü tutmazsan güven çöker ve kimya düşer.</span></button>
      <button type="button" class="btn-sm" style="padding:10px;text-align:left;" onclick="resolveCrisis('${p.id}','sert')">
        🗯️ <strong>Sert konuş</strong> — “Yerini antrenmanda kazanacaksın.”<br><span style="font-size:10px;opacity:.85;">Karakterine bağlı: kimisi toparlanır, kimisi küser. Otoriteni gösterir.</span></button>
      <button type="button" class="btn-sm" style="padding:10px;text-align:left;" onclick="resolveCrisis('${p.id}','yoksay')">
        🙈 <strong>Görmezden gel</strong><br><span style="font-size:10px;opacity:.85;">Bugün bedeli yok; huzursuzluk büyür ve odaya yayılır.</span></button>
    </div>`);
}
function resolveCrisis(pid,secim){
  const p=(G.players||[]).find(x=>x.id===pid);
  if(!p){ closeAppModal(); return; }
  const k=kisilikInfo(p.kisilik);
  let msg='';
  if(secim==='soz'){
    p.soz=true;
    p.mood=Math.min(100,(Number(p.mood)||70)+rand(8,14));
    msg=`🤝 ${p.isim}'a söz verdin — morali toparlandı. Sonraki maçta sahada olmalı!`;
  } else if(secim==='sert'){
    /* Sadık/şehir bağımlısı otoriteyi kabul eder; parasever/hırslı küser; kararsız kumar. */
    const kaldirir=(k.sadakat>=1.4)||(p.kisilik==='kararsiz'&&Math.random()<0.5);
    if(kaldirir){
      p.mood=Math.min(100,(Number(p.mood)||70)+rand(2,6));
      G.chemistry=Math.min(100,Number(G.chemistry||75)+rand(1,3));
      msg=`🗯️ ${p.isim} mesajı aldı — çalışmaya döndü, soyunma odasında otoriten arttı.`;
    } else {
      p.mood=Math.max(0,(Number(p.mood)||70)-rand(6,12));
      G.chemistry=Math.max(10,Number(G.chemistry||75)-rand(1,3));
      msg=`🗯️ ${p.isim} sert çıkışı kaldıramadı — morali daha da düştü.`;
    }
  } else {
    p.mood=Math.max(0,(Number(p.mood)||70)-rand(5,10));
    G.chemistry=Math.max(10,Number(G.chemistry||75)-rand(2,5));
    p.kirgin=(Number(p.kirgin)||0)+1;
    msg=`🙈 ${p.isim} görmezden gelindi — huzursuzluk soyunma odasına yayılıyor.`;
  }
  closeAppModal();
  showNotif(msg,{critical:secim!=='soz'});
  updateChemistry();
  scheduleGameSave();
  try{ if(document.getElementById('page-kadro')&&document.getElementById('page-kadro').classList.contains('active')) renderRoster(); }catch(e){}
}

/** Kadro sayfası için soyunma odası paneli — kimya nedenleri + dostluk/sürtüşme + huzursuzlar. */
function renderLockerRoomPanel(){
  const el=document.getElementById('lockerRoomPanel');
  if(!el) return;
  if(!G.team||!(G.players||[]).length){ el.innerHTML=''; return; }
  const t=chemistryTarget();
  const cur=Number(G.chemistry)||75;
  const rel=rosterRelations();
  const huzursuz=(G.players||[]).filter(p=>p&&(Number(p.mood)||70)<45);
  const bekleyen=(G.players||[]).filter(p=>p&&Number(p.sit||0)>=2&&_rosterRank(p)<=5);
  const yon=t>cur?'yükseliyor ↑':t<cur?'düşüyor ↓':'sabit';
  const col=cur>=70?'var(--green)':cur>=45?'var(--gold)':'var(--red)';
  const chip=(txt,c)=>`<span style="display:inline-block;font-size:10px;padding:2px 8px;border-radius:20px;background:var(--bg3);border:1px solid ${c||'var(--border)'};color:${c||'var(--text2)'};margin:2px 3px 2px 0;">${txt}</span>`;
  el.innerHTML=`<div style="padding:12px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
      <strong style="font-size:13px;">🧬 Soyunma Odası</strong>
      <span style="font-size:11px;color:var(--text2);">Kimya <strong style="color:${col};">${cur}</strong>/100 · hedef ${t} (${yon})</span>
    </div>
    <div style="font-size:10px;color:var(--text2);margin-bottom:7px;">Kimya; moral ortalaması, liderlik, süre alamayanlar ve rol çakışmalarından hesaplanır. Maç başına en fazla ±3 hareket eder.</div>
    <div style="margin-bottom:6px;">
      ${rel.dost.slice(0,3).map(d=>chip('🤝 '+escMatch(d.a.isim.split(' ').pop())+' – '+escMatch(d.b.isim.split(' ').pop()),'var(--green)')).join('')||chip('Belirgin dostluk yok')}
    </div>
    <div style="margin-bottom:6px;">
      ${rel.catisma.slice(0,3).map(d=>chip('⚡ '+escMatch(d.a.isim.split(' ').pop())+' – '+escMatch(d.b.isim.split(' ').pop())+' ('+d.a.poz+' rol çakışması)','var(--red)')).join('')||chip('Sürtüşme yok')}
    </div>
    ${huzursuz.length?`<div style="font-size:11px;color:var(--red);margin-top:6px;">😖 Huzursuz: ${huzursuz.map(p=>escMatch(p.isim)).join(', ')}</div>`:''}
    ${bekleyen.length?`<div style="font-size:11px;color:var(--gold);margin-top:4px;">⏳ Süre bekleyen: ${bekleyen.map(p=>escMatch(p.isim)+' ('+p.sit+' maç)').join(', ')}</div>`:''}
    ${(G.players||[]).some(p=>p&&p.soz)?`<div style="font-size:11px;color:var(--blue);margin-top:4px;">🤝 Söz verildi: ${(G.players||[]).filter(p=>p&&p.soz).map(p=>escMatch(p.isim)).join(', ')} — sonraki maçta oynatmalısın.</div>`:''}
  </div>`;
}

function updateChemistry(){
  const el=document.getElementById('chemFill');
  const sc=document.getElementById('chemScore');
  if(el){el.style.width=G.chemistry+'%';}
  if(sc){
    sc.textContent=G.chemistry;
    sc.style.color=G.chemistry>=70?'var(--green)':G.chemistry>=40?'var(--gold)':'var(--red)';
  }
}

/** Madde 35: altyapı tesisi — ücretli, isteğe bağlı yükseltme; genç sayısı + potansiyel havuzunu büyütür. */
const YOUTH_FAC_LVL=[
  {s:1,isim:'Temel Akademi',hedef:15,potBonus:0,m:0},
  {s:2,isim:'Gelişmiş Akademi',hedef:18,potBonus:3,m:ecoRound(1200)},
  {s:3,isim:'Elit Akademi',hedef:22,potBonus:6,m:ecoRound(3000)},
  {s:4,isim:'Uluslararası Kamp',hedef:26,potBonus:10,m:ecoRound(6000)}
];
function renderYouthFacility(){
  const panel=document.getElementById('youthFacilityPanel');
  if(!panel) return;
  const lvl=youthFacilityLevel();
  const cur=YOUTH_FAC_LVL[lvl-1];
  const nx=YOUTH_FAC_LVL[lvl];
  panel.innerHTML=`<div style="padding:12px 16px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
    <div>
      <div style="font-weight:700;font-size:13px;">🏫 ${cur.isim} <span style="font-size:11px;color:var(--text2);">(Seviye ${lvl}/4)</span></div>
      <div style="font-size:11px;color:var(--text2);margin-top:3px;">Havuz hedefi: <strong>${cur.hedef} genç</strong>${cur.potBonus?` · potansiyel primi +${cur.potBonus}`:''}</div>
    </div>
    ${nx?`<button type="button" class="btn-p" style="padding:8px 14px;font-size:12px;" onclick="upgradeYouthFacility()" ${G.coins<nx.m?'disabled':''}>⬆ ${nx.isim} — ${fmtn(nx.m)} KR</button>`:'<span style="font-size:11px;color:var(--gold);">Maksimum seviye</span>'}
  </div>`;
}
function upgradeYouthFacility(){
  const lvl=youthFacilityLevel();
  const nx=YOUTH_FAC_LVL[lvl];
  if(!nx){ showNotif('Altyapı tesisi maksimum seviyede.'); return; }
  if(G.coins<nx.m){ showNotif('❌ Yeterli KR yok!'); return; }
  txn('Altyapı tesisi yatırımı: '+nx.isim,-nx.m);
  G.youthFacility={s:nx.s};
  ensureYouthStock();
  updateCoins();
  showNotif(`🏫 Altyapı tesisi ${nx.isim} seviyesine yükseltildi — havuz ${nx.hedef} gence çıktı.`);
  renderAltyapi();
  scheduleGameSave();
}

function renderAltyapi(){
  const grid=document.getElementById('altyapiGrid');
  if(!grid) return;
  renderYouthFacility();
  const view=G.youthView||'list';
  if(view==='list'){
    grid.className='roster-as-list';
    grid.innerHTML=G.youth.map(p=>renderYouthListRow(p)).join('');
  } else {
    grid.className='g3';
    grid.innerHTML=G.youth.map(p=>renderPlayerCard(p,false,0,true)).join('');
  }
}

function setYouthView(mode,btn){
  G.youthView=mode||'list';
  document.querySelectorAll('#page-altyapi .fbtn.yvbtn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderAltyapi();
}

function renderMarket(){
  ensureMarketStock();
  G.marketSortDesc=G.marketSortDesc||{ovr:true,maas:true};
  const pozF=G.marketPozFilter||'all';
  const sort=G.marketSort||'ovr';
  const d=G.marketSortDesc;
  const ovrBt=document.getElementById('mSortOvr');
  const maBt=document.getElementById('mSortMaas');
  if(ovrBt){
    ovrBt.textContent=sort==='ovr'?(d.ovr?'OVR ↓':'OVR ↑'):'OVR';
    ovrBt.classList.toggle('active',sort==='ovr');
  }
  if(maBt){
    maBt.textContent=sort==='maas'?(d.maas?'Maaş ↓':'Maaş ↑'):'Maaş';
    maBt.classList.toggle('active',sort==='maas');
  }
  let f=pozF==='all'?G.marketPlayers.slice():G.marketPlayers.filter(p=>p.poz===pozF);
  f.sort((a,b)=>{
    let cmp;
    if(sort==='maas') cmp=(a.maas||0)-(b.maas||0);
    else cmp=(a.genel||0)-(b.genel||0);
    const desc=sort==='maas'?d.maas:d.ovr;
    return desc?-cmp:cmp;
  });
  const cnt=document.getElementById('marketCountNum');
  if(cnt) cnt.textContent=String(G.marketPlayers.length);
  document.getElementById('marketList').innerHTML=f.map(p=>{
    const st=starFromGenel(p.genel);
    const tag=p.listedFromUser?'<span style="font-size:9px;color:var(--gold);"> · oyuncu ilanı</span>':'<span style="font-size:9px;color:var(--text2);"> · serbest</span>';
    return `
    <div class="mcard" onclick="openPlayerModal('${p.id}')" style="cursor:pointer;" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPlayerModal('${p.id}');}">
      <div class="mavatar-wrap">
      <img class="mavatar" src="${playerAvatar(p.seed,p.marketIdx,{market:true})}" ${playerAvatarImgAttrs(p.seed,p.marketIdx,{market:true})} alt="${p.isim}">
      <div class="pimg-cap" style="margin-top:2px;">OVR ${p.genel}</div>
      </div>
      <div style="min-width:36px;text-align:center;">
        <div style="font-family:'Bebas Neue','Arial Narrow','Helvetica Neue Condensed',Impact,sans-serif;font-size:24px;color:${p.genel>=75?'var(--green)':p.genel>=60?'var(--gold)':'var(--red)'};">${p.genel}</div>
        <span class="pbadge pos-${p.poz.toLowerCase()}" style="font-size:9px;">${p.poz}</span>
        <div style="font-size:9px;color:var(--text2);">${st}★</div>
      </div>
      <div class="minfo">
        <div style="font-weight:700;font-size:13px;">${p.bayrak} ${p.isim}${tag}</div>
        <div style="font-size:11px;color:var(--text2);">${p.ulke} • ${p.yas} yaş • ${p.boy}cm</div>
        <div style="margin-top:3px;">${rolBadgeHtml(p)}</div>
        <div style="display:flex;gap:7px;margin-top:5px;flex-wrap:wrap;">
          <span style="font-size:11px;">⚔️${p.hucum}</span><span style="font-size:11px;">🛡️${p.savunma}</span>
          <span style="font-size:11px;">🏀${p.ribaund}</span><span style="font-size:11px;">✋${p.topCalma}</span>
          <span style="font-size:11px;">🎯${p.pas}</span><span style="font-size:11px;">⚡${p.hiz}</span>
        </div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px;">Maaş: ${fmtn(p.maas)} KR/hf • ${p.teklifler} teklif • ⏰ ${p.sure}s</div>
      </div>
      <div class="mprice">
        <div class="pval">${fmtn(p.fiyat)}</div>
        <div style="font-size:10px;color:var(--text2);">KR</div>
        <button class="btn-bid" onclick="event.stopPropagation();buyFromMarket('${p.id}')">TEKLİF VER</button>
      </div>
    </div>`;
  }).join('');
  ensureClubTransferStock();
  renderClubTransfers();
  switchMarketTab(G.marketTab||'free');
}

function switchMarketTab(tab){
  G.marketTab=tab==='club'?'club':'free';
  const fs=document.getElementById('marketFreeSection');
  const cs=document.getElementById('marketClubSection');
  const bf=document.getElementById('mTabFree');
  const bc=document.getElementById('mTabClub');
  if(fs) fs.style.display=G.marketTab==='free'?'':'none';
  if(cs) cs.style.display=G.marketTab==='club'?'':'none';
  if(bf) bf.classList.toggle('active',G.marketTab==='free');
  if(bc) bc.classList.toggle('active',G.marketTab==='club');
}

function filterClubTransfers(mode,btn){
  G.clubTransferFilter=(mode==='sale'||mode==='loan')?mode:'all';
  document.querySelectorAll('#page-market .fbtn.ctf').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderClubTransfers();
}

function setMarketSort(mode,btn){
  G.marketSortDesc=G.marketSortDesc||{ovr:true,maas:true};
  if((G.marketSort||'ovr')===mode) G.marketSortDesc[mode]=!G.marketSortDesc[mode];
  G.marketSort=mode;
  document.querySelectorAll('#page-market .fbtn.msort').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderMarket();
}

function filterMarket(f,btn){
  G.marketPozFilter=f;
  document.querySelectorAll('#page-market .fbtn:not(.msort)').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderMarket();
}

/** Playoff bracket + kullanıcı maçı paneli (Madde 6). */
function renderPlayoffPanel(){
  const panel=document.getElementById('playoffPanel');
  if(!panel) return;
  const po=G.playoff;
  if(!po||!po.active&&!po.champion){ panel.innerHTML=''; return; }
  const um=userPlayoffMatch();
  const roundBlocks=(po.rounds||[]).map((r,ri)=>{
    const total=r.length;
    const series=r.map(s=>{
      const uHere=G.team&&(s.home===G.team.isim||s.away===G.team.isim);
      const hw=s.done&&s.winner===s.home, aw=s.done&&s.winner===s.away;
      const wh=(s.wins&&s.wins[0])||0, wa=(s.wins&&s.wins[1])||0;
      const lead=!s.done&&(wh!==wa)?`<div style="font-size:9px;color:var(--text2);text-align:center;">${wh>wa?escMatch(s.home):escMatch(s.away)} ${Math.max(wh,wa)}-${Math.min(wh,wa)} önde</div>`:'';
      return `<div style="padding:5px 8px;background:var(--bg3);border-radius:7px;margin-bottom:4px;${uHere?'border:1px solid var(--accent);':''}">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="flex:1;font-size:11px;${hw?'font-weight:800;color:var(--green);':''}">${escMatch(s.home)}</span>
          <span style="font-size:13px;font-family:'Bebas Neue','Arial Narrow','Helvetica Neue Condensed',Impact,sans-serif;min-width:34px;text-align:center;">${wh}-${wa}</span>
          <span style="flex:1;font-size:11px;text-align:right;${aw?'font-weight:800;color:var(--green);':''}">${escMatch(s.away)}</span>
        </div>${lead}
      </div>`;
    }).join('');
    return `<div style="margin-bottom:8px;"><div style="font-size:11px;color:var(--gold);font-weight:700;margin-bottom:4px;">${playoffRoundLabel(ri,total)} <span style="color:var(--text2);font-weight:400;">(seri · ilk 4 galibiyet)</span></div>${series}</div>`;
  }).join('');
  const mvpLine=po.champion&&po.mvp?`<div style="text-align:center;padding:4px 10px 8px;font-size:11px;color:var(--text2);">🌟 Playoff MVP: <strong style="color:var(--accent);">${escMatch(po.mvp.isim)}</strong> (${escMatch(po.mvp.team)})</div>`:'';
  const action=po.champion
    ? `<div style="text-align:center;padding:10px 10px 4px;font-weight:800;color:var(--gold);">🏆 Şampiyon: ${escMatch(po.champion)}</div>${mvpLine}`
    : um
      ? `<button type="button" class="btn-p" style="width:100%;padding:11px;margin-top:6px;" onclick="scrollToMacLive();startPlayoffMatch()">🏆 Seri maçını oyna (${um.gameNo}. maç${um.home===G.team.isim?' · ev':' · deplasman'}) — vs ${escMatch(um.home===G.team.isim?um.away:um.home)}</button>`
      : `<div style="text-align:center;padding:8px;font-size:11px;color:var(--text2);">Diğer seriler oynanıyor...</div>`;
  panel.innerHTML=`<div class="card" style="border:1px solid var(--gold);">
    <div class="card-title">🏆 Sezon ${po.year} Playoff'ları (İlk 8 · Seri: ilk 4 galibiyet)</div>
    ${roundBlocks}${action}
  </div>`;
}
/* Paket 1 (14. oturum): Ulusal Kupa kartı — playoff panelinin üstüne enjekte edilir. */
function renderCupPanel(){
  try{
    const anchor=document.getElementById('playoffPanel');
    if(!anchor) return;
    let card=document.getElementById('cupPanel');
    if(!card){
      card=document.createElement('div');
      card.id='cupPanel';
      anchor.parentNode.insertBefore(card,anchor);
    }
    const c=G.cup;
    if(!c){ card.innerHTML=''; return; }
    const um=(typeof cupUserMatch==='function')?cupUserMatch():null;
    const due=um&&c.round<_cupDueRounds();
    const rName=CUP_ROUND_NAMES[c.round]||'Tur';
    const rows=(c.rounds[c.round]||[]).map(m=>{
      const mine=(m.home===G.team.isim||m.away===G.team.isim);
      return `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 9px;background:var(--bg3);border-radius:7px;margin-bottom:4px;font-size:11px;${mine?'border:1px solid var(--gold);':''}">
        <span>${escMatch(m.home)} — ${escMatch(m.away)}</span>
        <span style="color:${m.played?'var(--text)':'var(--text2)'};font-weight:700;">${m.played?(m.hs+'-'+m.as):'—'}</span></div>`;
    }).join('');
    const head=c.done
      ? `🏅 Ulusal Kupa ${c.year} — Şampiyon: <strong style="color:var(--gold);">${escMatch(c.champion||'—')}</strong>`
      : `🏅 Ulusal Kupa ${c.year} — <strong>${rName}</strong>${c.byes&&c.round===0&&c.byes.includes(G.team.isim)?' (bu turda BYE geçtin)':''}`;
    card.innerHTML=`<div class="card" style="margin-bottom:14px;">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <span>${head}</span>
        ${due?`<button type="button" class="btn-p" style="width:auto;padding:8px 18px;font-size:12px;" onclick="startCupMatch()">🏅 Kupa maçını oyna</button>`:''}
      </div>
      ${c.done?'':`<p style="font-size:10px;color:var(--text2);margin:4px 0 8px;">Tek eleme; kupa günleri lig turlarının arasındadır. Maçını 1 tur içinde oynamazsan otomatik simüle edilir.</p>`}
      ${rows||'<p style="font-size:11px;color:var(--text2);">Eşleşme yok.</p>'}
    </div>`;
  }catch(e){ dbg('renderCupPanel',e); }
}
function renderLig(){
  renderCupPanel();
  renderPlayoffPanel();
  const key=G.team&&G.team.tblKey||'tbl';
  const rows=buildLeagueRows(key);
  const frozen=G.season&&G.team&&key===G.team.tblKey&&G.season.standings&&!G.season.active;
  const fb=document.getElementById('ligFrozenBanner');
  const wrap=document.getElementById('ligTableWrap');
  const tab=document.getElementById('ligTable');
  if(!tab) return;
  if(fb) fb.style.display=frozen?'block':'none';
  if(wrap) wrap.classList.toggle('lig-table-frozen',!!frozen);
  const scope=document.getElementById('ligScopeLine');
  const act=G.season&&G.season.active&&G.team&&key===G.team.tblKey;
  if(scope){
    if(act){
      const nx=findNextUserSeasonMatch();
      scope.textContent='Senin grubun: '+formatTblSlotLabel(key)+' · Sezon '+G.season.year+' · Takvim günü ~'+(G.gameDay||1)+(nx?' · Sıradaki: Tur '+nx.round+'/'+totalRounds():' · Tur tamam');
    } else if(G.season&&G.team&&key===G.team.tblKey&&G.season.standings&&!G.season.active){
      scope.textContent='Senin grubun: '+formatTblSlotLabel(key)+' · Sezon '+G.season.year+' bitti — son sıralama donduruldu; yeni sezon otomatik.';
    } else {
      scope.textContent='Senin grubun: '+formatTblSlotLabel(key)+' · 20 takım · Sezon hazırlanıyor';
    }
  }
  const stEl=document.getElementById('ligSeasonStatus');
  if(stEl){
    if(act) stEl.textContent=seasonAllMatchesPlayed()?(totalRounds()+'/'+totalRounds()+' tur bitti — yeni sezon otomatik açılır.'):'Fikstür, tablo, G/M/Puan ve maç simülasyonu tek çekirdek.';
    else if(G.season&&G.season.standings&&!G.season.active) stEl.textContent='Son sezon tamamlandı — tablo kilitli; sonraki sezon otomatik.';
    else stEl.textContent='Lig sezonu otomatik başlar; tüm sayfalar aynı veriyi kullanır.';
  }
  tab.innerHTML=rows.map((t,i)=>{
    let zone='lig-mid';
    if(i<5) zone='lig-up';
    else if(i>=15) zone='lig-down';
    const stl=t.isUser?'outline:1px solid var(--accent);':'';
    const avDisp=t.av==='—'||t.av===void 0?'—':String(t.av);
    return `<tr class="${zone}" style="${stl}">
      <td><span class="rank ${i===0?'r1':i===1?'r2':i===2?'r3':''}">${i+1}</span></td>
      <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${t.renk};margin-right:8px;vertical-align:middle;"></span><strong>${escMatch(t.isim)}${t.isUser?' ⭐':''}</strong></td>
      <td>${t.o}</td><td class="tw-win">${t.g}</td><td class="tw-lose">${t.m}</td>
      <td>${t.sf}</td><td>${t.sa}</td><td style="font-size:12px;">${avDisp}</td>
      <td style="font-family:'Bebas Neue','Arial Narrow','Helvetica Neue Condensed',Impact,sans-serif;font-size:18px;color:var(--accent);">${t.puan}</td>
    </tr>`;
  }).join('');
  const uix=rows.findIndex(t=>t.isUser);
  ['dS','sbS'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=uix>=0?uix+1:'-'; });
}

function renderAntrenman(){
  document.getElementById('teamTrainingList').innerHTML=ANTRENMAN_T.map((a,i)=>`
    <div class="train-card">
      <div class="train-header">
        <div>
          <div style="font-weight:700;font-size:13px;">${a.ikon} ${a.isim}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px;">⏱ ${a.gun} gün sürer${a.maliyet?' • '+fmtn(a.maliyet)+' KR':' • Ücretsiz'}</div>
        </div>
        <button class="btn-train" onclick="startTeamTrain(${i})">BAŞLAT</button>
      </div>
    </div>`).join('');

  const sel=document.getElementById('trainPlayer');
  sel.innerHTML='<option value="">-- Oyuncu seç --</option>'+G.players.map(p=>`<option value="${p.id}">${p.isim} (${p.poz}) — Genel: ${p.genel}</option>`).join('');

  // Aktif antrenmanlar
  /* Paket 3 (14. oturum): ikincil pozisyon eğitimi kartı — takım antrenmanlarının altına. */
  try{
    let posDiv=document.getElementById('posTrainCard');
    if(!posDiv){
      posDiv=document.createElement('div');
      posDiv.id='posTrainCard';
      document.getElementById('teamTrainingList').parentNode.appendChild(posDiv);
    }
    const pt=G.posTraining;
    if(pt&&pt.poz&&Number(pt.kalanGun)>0){
      const p=(G.players||[]).find(x=>x.id===pt.playerId);
      posDiv.innerHTML=`<div class="train-card" style="margin-top:8px;">
        <div style="font-weight:700;font-size:13px;">🧭 İkincil Pozisyon Eğitimi</div>
        <div style="font-size:12px;margin-top:6px;">${p?escMatch(p.isim):'?'} → <strong>${pt.poz}</strong> · <span style="color:var(--gold);">${pt.kalanGun} gün kaldı</span></div>
        <div class="train-progress" style="margin-top:6px;"><div class="train-fill" style="width:${((pt.toplamGun-pt.kalanGun)/Math.max(1,pt.toplamGun)*100)}%;"></div></div>
      </div>`;
    } else {
      const adaylar=(G.players||[]).filter(p=>!p.ikincilPoz);
      const opts=adaylar.map(p=>(POS_NEIGHBORS[p.poz]||[]).map(n=>`<option value="${p.id}|${n}">${escMatch(p.isim)} (${p.poz}) → ${n}</option>`).join('')).join('');
      posDiv.innerHTML=`<div class="train-card" style="margin-top:8px;">
        <div style="font-weight:700;font-size:13px;">🧭 İkincil Pozisyon Eğitimi</div>
        <div style="font-size:11px;color:var(--text2);margin:4px 0 8px;">Oyuncuya komşu bir pozisyon öğret (PG↔SG↔SF↔PF↔C) — 15 oyun günü · ${fmtn(ecoRound(500))} KR. İkincil pozisyonda hafif performans kaybıyla oynar.</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <select id="posTrainSel" style="flex:1;min-width:180px;font-size:12px;padding:7px;border-radius:8px;background:var(--bg4);color:var(--text);border:1px solid var(--border);">
            <option value="">-- Oyuncu ve hedef pozisyon seç --</option>${opts}
          </select>
          <button class="btn-train" onclick="startPosTrainingFromSel()">BAŞLAT</button>
        </div>
        ${(G.players||[]).some(p=>p.ikincilPoz)?`<div style="font-size:11px;color:var(--text2);margin-top:8px;">Eğitimli: ${(G.players||[]).filter(p=>p.ikincilPoz).map(p=>escMatch(p.isim)+' ('+p.poz+'+'+p.ikincilPoz+')').join(' · ')}</div>`:''}
      </div>`;
    }
  }catch(e){ dbg('posTrainCard',e); }

  const activeDiv=document.getElementById('activeTrains');
  if(G.activeTrainings.length>0){
    activeDiv.innerHTML='<div style="font-size:11px;color:var(--text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Devam Eden Antrenmanlar</div>'+
    G.activeTrainings.map(t=>`
      <div style="background:var(--bg3);border-radius:8px;padding:10px;margin-bottom:6px;border:1px solid rgba(249,115,22,0.2);">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:12px;font-weight:600;">${t.oyuncu} — ${STAT_LABELS[t.stat]||'Takım'}</span>
          <span style="font-size:11px;color:var(--gold);">${t.kalanGun} gün kaldı</span>
        </div>
        <div class="train-progress"><div class="train-fill" style="width:${((t.toplamGun-t.kalanGun)/t.toplamGun*100)}%;"></div></div>
      </div>`).join('');
  } else {
    activeDiv.innerHTML='';
  }

  // Menajer itibarı (Madde 9)
  const repPts=Number(G.managerRep)||0;
  const repTitle=repPts>=60?'Efsane Menajer':repPts>=30?'Saygın Menajer':repPts>=12?'Yükselen Menajer':'Çaylak Menajer';
  const repBonusPct=(managerRepBonus()*100).toFixed(1);
  const mgrBanner=`<div style="grid-column:1/-1;padding:11px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;margin-bottom:8px;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
      <div><strong style="font-size:13px;">👔 ${escMatch(G.managerName||'Menajer')}</strong> <span style="font-size:11px;color:var(--gold);">${repTitle}</span></div>
      <div style="font-size:11px;color:var(--text2);">İtibar: <strong style="color:var(--blue);">${repPts}</strong> · takım bonusu +%${repBonusPct}${(G.managerHistory&&G.managerHistory.length)?` · ${G.managerHistory.length} kupa`:''}</div>
    </div>
  </div>`;
  // Koçlar
  document.getElementById('coachList').innerHTML=mgrBanner+(G.coaches.length
    ?G.coaches.map((c,i)=>`<div class="coach-card">
      <div class="coach-header">
        <div class="coach-avatar"><img src="${coachAvatar(c)}" ${coachAvatarAttrs(c)} alt=""></div>
        <div><div class="coach-name">${c.ad}</div><div class="coach-spec">${c.ikon} ${c.isim}</div></div>
      </div>
      <div class="coach-stat"><span style="color:var(--text2);">Uzmanlık</span><span style="font-size:11px;">${c.bonus}</span></div>
      <div class="coach-stat"><span style="color:var(--text2);">Seviye</span><span style="color:var(--gold);">${c.seviye}</span></div>
      <div class="coach-stat"><span style="color:var(--text2);">CV / Skor</span><span style="color:var(--blue);">${Math.round(Number(c.skor)||0)}${(c.gecmis&&c.gecmis.length)?` · ${c.gecmis.length} başarı`:''}</span></div>
      <div class="coach-stat"><span style="color:var(--text2);">Maaş</span><span style="color:var(--red);">${fmtn(c.maas)} KR/hf</span></div>
      <button class="btn-sm btn-danger" onclick="fireCoach('${c.id}')" style="width:100%;margin-top:8px;">KADRODAN ÇIKAR</button>
    </div>`).join('')
    :'<div style="color:var(--text2);font-size:12px;grid-column:1/-1;padding:16px;text-align:center;">Henüz koçun yok. Aşağıdan işe al.</div>');

  document.getElementById('coachMarket').innerHTML=G.coachMarket.map((c,i)=>`
    <div class="coach-card">
      <div class="coach-header">
        <div class="coach-avatar"><img src="${coachAvatar(c)}" ${coachAvatarAttrs(c)} alt=""></div>
        <div><div class="coach-name">${c.ad}</div><div class="coach-spec">${c.ikon} ${c.uzm}</div></div>
      </div>
      <div class="coach-stat"><span style="color:var(--text2);">Bonus</span><span style="font-size:11px;">${c.bonus}</span></div>
      <div class="coach-stat"><span style="color:var(--text2);">Seviye</span><span style="color:var(--gold);">${c.seviye}</span></div>
      <div class="coach-stat"><span style="color:var(--text2);">CV / Skor</span><span style="color:var(--blue);">${Math.round(Number(c.skor)||0)}${(c.gecmis&&c.gecmis.length)?` · ${c.gecmis.length} başarı`:''}</span></div>
      <div class="coach-stat"><span style="color:var(--text2);">Haftalık Maaş</span><span style="color:var(--red);">${fmtn(c.maas)} KR</span></div>
      <div class="coach-stat"><span style="color:var(--text2);">Transfer Bedeli</span><span style="color:var(--accent);">${fmtn(c.satisFiyat)} KR</span></div>
      <button class="btn-p" onclick="hireCoach('${c.id}')" style="padding:7px;font-size:11px;margin-top:8px;">İŞE AL</button>
    </div>`).join('');
  renderScouts();
}
/* ── Faz 5.2: Gelişmiş istatistik / analiz ekranı ── */

/* ── FAZ B: playbook görsel önizlemesi (yarı saha şeması) ────────────────────────────
   Setler `dia` verisiyle tanımlı: spots = oyuncu noktaları, arrows = hareketler.
   Ok tipleri: pass (kesik çizgi) · cut (düz ok) · dribble (zikzak) · screen (T uçlu perde).
   Tamamı inline SVG — dış bağımlılık yok, tema renklerini (var(--…)) kullanır. */
function _pbArrow(a,i){
  const [x1,y1]=a.f,[x2,y2]=a.to;
  const col=a.t==='pass'?'var(--gold)':a.t==='screen'?'var(--red)':a.t==='dribble'?'var(--blue)':'var(--green)';
  if(a.t==='screen'){
    /* Perde: hedefte çizgiye dik kısa bar */
    const dx=x2-x1,dy=y2-y1,len=Math.max(1,Math.hypot(dx,dy));
    const nx=-dy/len*7,ny=dx/len*7;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="${x2-nx}" y1="${y2-ny}" x2="${x2+nx}" y2="${y2+ny}" stroke="${col}" stroke-width="2.8" stroke-linecap="round"/>`;
  }
  if(a.t==='dribble'){
    /* Top sürme: zikzak */
    const dx=x2-x1,dy=y2-y1,len=Math.max(1,Math.hypot(dx,dy)),steps=Math.max(3,Math.round(len/13));
    const nx=-dy/len,ny=dx/len;
    let d=`M${x1},${y1}`;
    for(let k=1;k<=steps;k++){
      const t=k/steps, bx=x1+dx*t, by=y1+dy*t, s=(k%2?1:-1)*4.5;
      d+=` L${(bx+nx*s).toFixed(1)},${(by+ny*s).toFixed(1)}`;
    }
    return `<path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" marker-end="url(#pbArrowB)"/>`;
  }
  const dash=a.t==='pass'?' stroke-dasharray="5 4"':'';
  const mk=a.t==='pass'?'pbArrowG':'pbArrowGr';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="2"${dash} stroke-linecap="round" marker-end="url(#${mk})"/>`;
}
function playbookSvg(dia,opts){
  opts=opts||{};
  const h=opts.h||118;
  const d=dia||{spots:[],arrows:[]};
  const spots=(d.spots||[]).map(s=>`<g>
      <circle cx="${s.x}" cy="${s.y}" r="10" fill="var(--bg2)" stroke="var(--accent)" stroke-width="2"/>
      <text x="${s.x}" y="${s.y+3.6}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text)">${s.l}</text>
    </g>`).join('');
  const arrows=(d.arrows||[]).map(_pbArrow).join('');
  const mk=(id,col)=>`<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" fill="${col}"/></marker>`;
  return `<svg viewBox="0 0 200 190" style="width:100%;height:${h}px;display:block;" role="img" aria-label="Set şeması">
    <defs>${mk('pbArrowG','var(--gold)')}${mk('pbArrowGr','var(--green)')}${mk('pbArrowB','var(--blue)')}</defs>
    <rect x="1" y="1" width="198" height="188" rx="4" fill="var(--bg3)" stroke="var(--border)" stroke-width="1.5"/>
    <rect x="1" y="65" width="62" height="60" fill="none" stroke="var(--border)" stroke-width="1.5"/>
    <circle cx="63" cy="95" r="21" fill="none" stroke="var(--border)" stroke-width="1.5"/>
    <line x1="10" y1="80" x2="10" y2="110" stroke="var(--text2)" stroke-width="2.5"/>
    <circle cx="18" cy="95" r="5.5" fill="none" stroke="var(--accent)" stroke-width="2"/>
    <path d="M1,18 L38,18 A79.6,79.6 0 0 1 38,172 L1,172" fill="none" stroke="var(--border)" stroke-width="1.5"/>
    <line x1="199" y1="1" x2="199" y2="189" stroke="var(--border)" stroke-width="2"/>
    ${arrows}${spots}
  </svg>`;
}
/** Set seçim kartı — şema + isim + özet + kadro uyumu. */
function playbookCardHtml(pb,cur,court,kind){
  const sel=pb.key===cur;
  const fitPct=(kind==='off'&&pb.uyum)?playbookFitPct(pb,court):null;
  const fitCol=fitPct==null?'':(fitPct>=66?'var(--green)':fitPct>=40?'var(--gold)':'var(--red)');
  const fn=kind==='off'?'selectPlaybook':'selectDefSet';
  return `<button type="button" class="pb-card${sel?' sel':''}" onclick="${fn}('${pb.key}')" title="${pb.ozet}">
    ${playbookSvg(pb.dia,{h:96})}
    <div class="pb-name">${pb.ikon} ${pb.ad}</div>
    <div class="pb-sum">${pb.ozet}</div>
    ${fitPct!=null?`<div class="pb-fit">Kadro uyumu: <strong style="color:${fitCol};">%${fitPct}</strong> <span style="opacity:.7;">(${pb.uyum.ad})</span></div>`:''}
  </button>`;
}
function svgLineChart(vals,opts){
  opts=opts||{};
  const w=opts.w||560,h=opts.h||150,pad=opts.pad||26;
  if(!vals||vals.length<1) return '<div style="color:var(--text2);font-size:12px;padding:16px;text-align:center;">Veri yok — birkaç maç oyna, grafikler burada oluşur.</div>';
  let min=opts.min!=null?opts.min:Math.min(...vals);
  let max=opts.max!=null?opts.max:Math.max(...vals);
  /* F7-30: tüm değerler eşitse çizgi tabana yapışıyor ve üst/alt etiket aynı sayıyı
     gösteriyordu — bandı simetrik aç, çizgi ortada dursun. */
  if(max===min){ min=max-1; max=max+1; }
  const rng=(max-min)||1;
  const X=i=>pad+(vals.length<=1?0:(i/(vals.length-1))*(w-2*pad));
  const Y=v=>h-pad-((v-min)/rng)*(h-2*pad);
  const col=opts.color||'var(--accent)';
  const pts=vals.map((v,i)=>`${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const zeroLine=(opts.zero!=null&&opts.zero>=min&&opts.zero<=max)?`<line x1="${pad}" y1="${Y(opts.zero).toFixed(1)}" x2="${w-pad}" y2="${Y(opts.zero).toFixed(1)}" stroke="var(--border)" stroke-dasharray="4 3"/>`:'';
  const area=vals.length>1?`<polyline fill="none" stroke="${col}" stroke-width="2.5" points="${pts}"/>`:'';
  const dots=vals.map((v,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="${vals.length>30?'1.6':'3'}" fill="${col}"/>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block;">
    <text x="2" y="12" fill="var(--text2)" font-size="10">${(opts.fmt?opts.fmt(max):max)}</text>
    <text x="2" y="${h-4}" fill="var(--text2)" font-size="10">${(opts.fmt?opts.fmt(min):min)}</text>
    ${zeroLine}${area}${dots}
  </svg>`;
}
function renderAnalytics(){
  const el=document.getElementById('analiz-body');
  if(!el) return;
  const a=(G.analytics&&typeof G.analytics==='object')?G.analytics:{teamMatches:[],playerDev:{}};
  const curSeason=(G.season&&G.season.year)||0;
  const tm=(a.teamMatches||[]).filter(m=>m.season===curSeason);
  const src=tm.length?tm:(a.teamMatches||[]);
  const margins=src.map(m=>m.margin);
  const forPts=src.map(m=>m.uPts);
  const agstPts=src.map(m=>m.oPts);
  const last5=src.slice(-5);
  const formStr=last5.map(m=>m.win?'<span style="color:var(--green);font-weight:800;">G</span>':'<span style="color:var(--red);font-weight:800;">M</span>').join(' ');
  const wins=src.filter(m=>m.win).length, played=src.length;
  const avgFor=played?(forPts.reduce((s,v)=>s+v,0)/played).toFixed(1):'—';
  const avgAg=played?(agstPts.reduce((s,v)=>s+v,0)/played).toFixed(1):'—';
  const netAvg=played?((margins.reduce((s,v)=>s+v,0)/played)).toFixed(1):'—';
  const players=(G.players||[]).slice().sort((x,y)=>(y.genel||0)-(x.genel||0));
  const sel=G._analiticPlayerId&&players.some(p=>p.id===G._analiticPlayerId)?G._analiticPlayerId:(players[0]&&players[0].id);
  const playerOpts=players.map(p=>`<option value="${p.id}" ${p.id===sel?'selected':''}>${escMatch(p.isim)} (${p.poz}·OVR ${p.genel})</option>`).join('');
  el.innerHTML=`
    <div class="card">
      <div class="card-title">📊 Takım Trendi ${curSeason?`· Sezon ${curSeason}`:''}</div>
      <div class="g3" style="margin-bottom:10px;">
        <div style="background:var(--bg3);border-radius:9px;padding:10px;"><div style="font-size:10px;color:var(--text2);text-transform:uppercase;">Galibiyet</div><div style="font-size:20px;font-weight:800;">${wins}/${played}</div></div>
        <div style="background:var(--bg3);border-radius:9px;padding:10px;"><div style="font-size:10px;color:var(--text2);text-transform:uppercase;">Sayı ort. (attı/yedi)</div><div style="font-size:20px;font-weight:800;">${avgFor} / ${avgAg}</div></div>
        <div style="background:var(--bg3);border-radius:9px;padding:10px;"><div style="font-size:10px;color:var(--text2);text-transform:uppercase;">Averaj (+/-)</div><div style="font-size:20px;font-weight:800;color:${Number(netAvg)>=0?'var(--green)':'var(--red)'};">${netAvg}</div></div>
      </div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:6px;">Son 5 maç formu: ${formStr||'—'}</div>
      <div style="font-size:11px;color:var(--gold);margin:8px 0 2px;">Maç bazında sayı farkı (+/-)</div>
      ${svgLineChart(margins,{zero:0,color:'var(--accent)',min:margins.length?Math.min(-5,...margins):-5,max:margins.length?Math.max(5,...margins):5})}
      <div style="font-size:11px;color:var(--gold);margin:10px 0 2px;">Attığı sayı (maç bazında)</div>
      ${svgLineChart(forPts,{color:'var(--green)'})}
    </div>
    <div class="card" style="margin-top:14px;">
      <div class="card-title">📈 Oyuncu Gelişimi</div>
      <select id="analiticPlayerSel" onchange="G._analiticPlayerId=this.value;{const _b=document.getElementById('analiticPlayerBody'); if(_b) _b.innerHTML=renderAnalyticsPlayerBody(this.value); else renderAnalytics();}" style="width:100%;max-width:340px;padding:8px;border-radius:9px;background:var(--bg3);color:var(--text);border:1px solid var(--border);font-size:12px;margin-bottom:10px;">${playerOpts}</select>
      <div id="analiticPlayerBody">${renderAnalyticsPlayerBody(sel)}</div>
    </div>`;
}
function renderAnalyticsPlayerBody(pid){
  const a=(G.analytics&&G.analytics.playerDev)||{};
  const p=(G.players||[]).find(x=>x.id===pid);
  if(!p) return '<div style="color:var(--text2);font-size:12px;">Oyuncu seç.</div>';
  const dev=(a[pid]||[]).map(x=>x.genel);
  const sez=p.sezon||{mac:0,pts:0,ast:0,reb:0};
  const pg=v=>(sez.mac?(v/sez.mac).toFixed(1):'0.0');
  return `<div class="g3" style="margin-bottom:10px;">
      <div style="background:var(--bg3);border-radius:9px;padding:10px;"><div style="font-size:10px;color:var(--text2);text-transform:uppercase;">Sayı ort.</div><div style="font-size:18px;font-weight:800;">${pg(sez.pts)}</div></div>
      <div style="background:var(--bg3);border-radius:9px;padding:10px;"><div style="font-size:10px;color:var(--text2);text-transform:uppercase;">Asist ort.</div><div style="font-size:18px;font-weight:800;">${pg(sez.ast)}</div></div>
      <div style="background:var(--bg3);border-radius:9px;padding:10px;"><div style="font-size:10px;color:var(--text2);text-transform:uppercase;">Ribaund ort.</div><div style="font-size:18px;font-weight:800;">${pg(sez.reb)}</div></div>
    </div>
    <div style="font-size:11px;color:var(--gold);margin:2px 0;">OVR gelişim eğrisi (${dev.length} maç · şu an ${p.genel})</div>
    ${svgLineChart(dev,{color:'var(--blue)',min:dev.length?Math.min(...dev)-1:50,max:dev.length?Math.max(...dev)+1:99,fmt:v=>Math.round(v)})}
    <div style="font-size:10px;color:var(--text2);margin-top:6px;">Kişilik: ${kisilikInfo(p.kisilik).ikon} ${kisilikInfo(p.kisilik).ad} · Potansiyel: ${playerScouted(p)?p.potansiyel:'keşif gerek'}</div>`;
}
/* Faz 5.1: izci ağı + izci pazarı render'ı (Antrenman sayfası). */
function renderScouts(){
  const list=document.getElementById('scoutList');
  if(list){
    list.innerHTML=(G.scouts&&G.scouts.length)
      ? G.scouts.map(s=>`<div class="coach-card">
          <div class="coach-header"><div class="coach-avatar"><img src="${coachAvatar(s)}" ${coachAvatarAttrs(s)} alt=""></div>
            <div><div class="coach-name">${escMatch(s.ad)}</div><div class="coach-spec">🔭 ${escMatch(s.bolge)}</div></div></div>
          <div class="coach-stat"><span style="color:var(--text2);">Kalite</span><span style="color:var(--gold);">${'★'.repeat(Math.max(1,Number(s.kalite)||1))}</span></div>
          <div class="coach-stat"><span style="color:var(--text2);">Maaş</span><span style="color:var(--red);">${fmtn(s.maas)} KR/hf</span></div>
          <div class="coach-stat"><span style="color:var(--text2);">Havuz</span>
            <select onchange="assignScout('${s.id}',this.value)" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:11px;padding:3px;">
              <option value="market" ${s.atama!=='youth'?'selected':''}>Transfer Market</option>
              <option value="youth" ${s.atama==='youth'?'selected':''}>Altyapı</option>
            </select></div>
          <button class="btn-sm btn-danger" onclick="fireScout('${s.id}')" style="width:100%;margin-top:8px;">AĞDAN ÇIKAR</button>
        </div>`).join('')
      : '<div style="color:var(--text2);font-size:12px;grid-column:1/-1;padding:16px;text-align:center;">Henüz izcin yok. Aşağıdan işe al — atadıkları havuzda oyuncuları otomatik keşfederler.</div>';
  }
  const mkt=document.getElementById('scoutMarket');
  if(mkt){
    mkt.innerHTML=(G.scoutMarket||[]).map(s=>`<div class="coach-card">
      <div class="coach-header"><div class="coach-avatar"><img src="${coachAvatar(s)}" ${coachAvatarAttrs(s)} alt=""></div>
        <div><div class="coach-name">${escMatch(s.ad)}</div><div class="coach-spec">🔭 ${escMatch(s.bolge)}</div></div></div>
      <div class="coach-stat"><span style="color:var(--text2);">Kalite</span><span style="color:var(--gold);">${'★'.repeat(Math.max(1,Number(s.kalite)||1))}</span></div>
      <div class="coach-stat"><span style="color:var(--text2);">Haftalık Maaş</span><span style="color:var(--red);">${fmtn(s.maas)} KR</span></div>
      <div class="coach-stat"><span style="color:var(--text2);">Transfer Bedeli</span><span style="color:var(--accent);">${fmtn(s.satisFiyat)} KR</span></div>
      <button class="btn-p" onclick="hireScout('${s.id}')" style="padding:7px;font-size:11px;margin-top:8px;">İŞE AL</button>
    </div>`).join('');
  }
}

function renderArena(){
  const a=G.arena;
  const fs=getFanBaseStats();
  const fg=document.getElementById('arenaFanGroup');
  const fc=document.getElementById('arenaFanCount');
  const fcard=document.getElementById('arenaFanCard');
  if(fg) fg.textContent=fs.group;
  if(fc) fc.textContent=fmtn(fs.count);
  if(fcard) fcard.textContent=`${fs.group} · ${fmtn(fs.count)}`;
  document.getElementById('arenaCapDisp').textContent=fmtn(a.kap);
  document.getElementById('arCap2').textContent=fmtn(a.kap);
  document.getElementById('arenaLvl').textContent=a.s;
  document.getElementById('capFill').style.width=(a.s/5*100)+'%';
  const form=recentUserForm(5);
  const seasonPlayed=(G.wins+G.losses)||0;
  const seasonWr=seasonPlayed?G.wins/Math.max(1,seasonPlayed):0.5;
  const wr=form!=null?form*0.7+seasonWr*0.3:seasonWr;
  const occ=Math.max(0.35,Math.min(0.98,(0.55+wr*0.35)*ticketDemandFactor()));
  const dol=document.getElementById('arenaDoluluk');
  if(dol) dol.textContent='%'+Math.round(occ*100);
  const priceNames=['Çok ucuz','Ucuz','Normal','Pahalı','Çok pahalı'];
  const lvl=ticketPriceLevel();
  const plbl=document.getElementById('ticketPriceLbl');
  if(plbl) plbl.textContent=priceNames[lvl];
  const pctrl=document.getElementById('ticketPriceCtrl');
  if(pctrl) pctrl.innerHTML=priceNames.map((nm,i)=>`<button type="button" class="btn-sm" style="padding:5px 8px;font-size:10px;${i===lvl?'background:var(--accent);color:#111;font-weight:700;':''}" onclick="setTicketPrice(${i})">${nm}</button>`).join('');
  document.getElementById('ticketInc').textContent=fmtn(homeTicketIncome())+' KR';
  document.getElementById('arenaMaint').textContent='-'+fmtn(a.bk)+' KR';
  document.getElementById('upgradeList').innerHTML=ARENA_LVL.slice(1).map(g=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg3);border-radius:8px;margin-bottom:7px;">
      <div><div style="font-weight:700;font-size:13px;">${g.isim}</div><div style="font-size:11px;color:var(--text2);">${fmtn(g.kap)} kişilik</div></div>
      <div style="text-align:right;">
        <div style="font-size:12px;color:var(--gold);">${fmtn(g.m)} KR</div>
        <button class="upbtn" onclick="upgradeArena(${g.s})" ${G.coins<g.m||G.arena.s>=g.s?'disabled':''} style="margin-top:5px;padding:6px 12px;font-size:11px;">
          ${G.arena.s>=g.s?'✅':'SATIN AL'}
        </button>
      </div>
    </div>`).join('');
}

function setTicketPrice(lvl){
  G.ticketPrice=Math.max(0,Math.min(4,Number(lvl)||0));
  scheduleGameSave();
  renderArena();
  const nm=['Çok ucuz','Ucuz','Normal','Pahalı','Çok pahalı'][G.ticketPrice];
  showNotif(`🎟️ Bilet fiyatı: ${nm} — doluluk ve gelir güncellendi.`);
}

function saveArenaName(){
  const v=sanitizeTeamName(document.getElementById('arenaNameInput').value);
  if(!v){showNotif('Arena adı gir!');return;}
  G.arena.isim=v;
  document.getElementById('arenaNameDisp').textContent=v;
  showNotif('🏟️ Arena adı kaydedildi!');
  scheduleGameSave();
}

/** Bilanço: işlem defterinden (son 28 oyun günü) gerçek gelir/gider dökümü. */
function renderBilanço(){
  const gd=G.gameDay||1;
  const ledger=(G.ledger||[]).filter(e=>e&&(gd-(e.d||1))<=28);
  const grup={};
  ledger.forEach(e=>{
    /* Aynı türden kalemleri grupla — "Transfer: X" → "Transferler" gibi */
    let k=e.l||'Diğer';
    if(k.startsWith('Transfer:')) k='Oyuncu alımları';
    else if(k.startsWith('Satış:')) k='Oyuncu satışları';
    else if(k.startsWith('Koç transferi:')) k='Koç transferleri';
    else if(k.startsWith('Sözleşme yenileme:')) k='Sözleşme yenilemeleri';
    else if(k.startsWith('Antrenman gideri')) k='Antrenman giderleri';
    else if(k.startsWith('Arena yatırımı')) k='Arena yatırımı';
    grup[k]=(grup[k]||0)+(e.a||0);
  });
  const gelirler=[],giderler=[];
  Object.keys(grup).forEach(k=>{
    if(grup[k]>=0) gelirler.push({l:k,v:grup[k]});
    else giderler.push({l:k,v:-grup[k]});
  });
  gelirler.sort((a,b)=>b.v-a.v);
  giderler.sort((a,b)=>b.v-a.v);
  const w=weeklyWageBill();
  const tG=gelirler.reduce((s,i)=>s+i.v,0);
  const tGid=giderler.reduce((s,i)=>s+i.v,0);
  const net=tG-tGid;
  const bos='<div class="brow"><span class="blbl" style="color:var(--text2);">Henüz hareket yok — maç oynadıkça dolar</span><span class="bval"></span></div>';
  document.getElementById('gelirler').innerHTML=(gelirler.length?gelirler.map(i=>`<div class="brow"><span class="blbl">${i.l}</span><span class="bval gelir">+${fmtn(i.v)} KR</span></div>`).join(''):bos)
    +`<div class="brow" style="opacity:0.75;"><span class="blbl">🎟️ Sıradaki ev maçı bilet tahmini</span><span class="bval gelir">~${fmtn(homeTicketIncome())} KR</span></div>`;
  document.getElementById('giderler').innerHTML=(giderler.length?giderler.map(i=>`<div class="brow"><span class="blbl">${i.l}</span><span class="bval gider">-${fmtn(i.v)} KR</span></div>`).join(''):bos)
    +`<div class="brow" style="opacity:0.75;"><span class="blbl">🧾 Haftalık sabit gider (maaş+bakım)</span><span class="bval gider">-${fmtn(w.top)} KR/hf</span></div>`;
  document.getElementById('topGelir').textContent='+'+fmtn(tG)+' KR';
  document.getElementById('topGider').textContent='-'+fmtn(tGid)+' KR';
  const nd=document.getElementById('netDurum');
  nd.textContent=(net>=0?'+':'')+fmtn(net)+' KR';
  nd.style.color=net>=0?'var(--green)':'var(--red)';
  const son=document.getElementById('sonHareketler');
  if(son){
    son.innerHTML=(G.ledger||[]).slice(0,14).map(e=>`<div class="brow"><span class="blbl">Gün ${e.d} · ${e.l}</span><span class="bval ${e.a>=0?'gelir':'gider'}">${e.a>=0?'+':''}${fmtn(e.a)} KR</span></div>`).join('')||'<p style="font-size:12px;color:var(--text2);">Henüz işlem yok.</p>';
  }
}

// ===== MAÇ — şut haritası + kutu istatistik (anlatım ile senkron) =====

// ===== Paket 2 (14. oturum): Kariyer Özeti — salt okunur onur listesi =====
function openCareerModal(){
  if(!G||!G.team){ showNotif('Önce takım oluştur.'); return; }
  const yr=(G.season&&G.season.year)||1;
  const cm=Number(G.careerMatches)||0;
  const cw=Number(G.careerWins)||0, cl=Number(G.careerLosses)||0;
  const wr=cm?Math.round(cw/Math.max(1,cw+cl)*100):0;
  const achN=Object.keys(G.achievements||{}).length;
  const rec=G.clubRecords||{};
  const hist=Array.isArray(G.managerHistory)?G.managerHistory.slice():[];
  hist.sort((a,b)=>(a.year||0)-(b.year||0));
  const ligAd=(G.team.tblKey==='tbl')?'TBL (üst lig)':String(G.team.tblKey||'').toUpperCase();
  const kutu=(ikon,lbl,val)=>`<div style="flex:1;min-width:120px;background:var(--bg3);border-radius:10px;padding:12px;text-align:center;">
    <div style="font-size:22px;">${ikon}</div>
    <div style="font-size:18px;font-weight:800;color:var(--accent);margin:2px 0;">${val}</div>
    <div style="font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:1px;">${lbl}</div></div>`;
  const histHtml=hist.length
    ? hist.map(h=>`<div style="display:flex;gap:10px;align-items:center;padding:7px 10px;background:var(--bg3);border-radius:8px;margin-bottom:5px;">
        <span style="font-weight:800;color:var(--gold);min-width:64px;">Sezon ${h.year}</span>
        <span style="font-size:12px;">🏆 ${escMatch(String(h.basari||''))}</span></div>`).join('')
    : '<p style="font-size:12px;color:var(--text2);">Henüz kupa/şampiyonluk yok — ilk zafer seni bekliyor.</p>';
  showAppModal(`<div class="modal-title">📜 Kariyer Özeti — ${escMatch(G.managerName||'Menajer')}</div>
    <p style="font-size:12px;color:var(--text2);margin-bottom:12px;">${escMatch(G.team.isim)} · ${ligAd} · ${yr}. sezon</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      ${kutu('🗓️','Sezon',yr)}
      ${kutu('🏀','Toplam maç',fmtn(cm))}
      ${kutu('📈','G / M',cw+' / '+cl+' (%'+wr+')')}
      ${kutu('⭐','Menajer itibarı',Number(G.managerRep)||0)}
      ${kutu('🏆','Başarım',achN+' / '+ACHV.length)}
    </div>
    <div style="border-top:1px solid var(--border);padding-top:10px;margin-bottom:12px;">
      <div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Kulüp rekortmenleri</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${kutu('🎯','En skorer (kariyer)',rec.topScorer?escMatch(rec.topScorer.isim)+' · '+fmtn(rec.topScorer.pts)+' sayı':'—')}
        ${kutu('🤝','En uzun süre kulüpte',rec.longest?escMatch(rec.longest.isim)+' · '+rec.longest.sezon+' sezon':'—')}
      </div>
      <p style="font-size:10px;color:var(--text2);margin-top:6px;">Rekorlar her sezon kapanışında güncellenir.</p>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:10px;">
      <div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Onur listesi</div>
      <div style="max-height:220px;overflow-y:auto;">${histHtml}</div>
    </div>`);
}
