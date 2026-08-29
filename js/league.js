/* F7-22: modalda Escape dinleyicisi ve odak yönetimi yoktu — klavye kullanıcısı Tab ile
   arka plandaki butonlarda dolaşıyordu. */
let _modalEscHandler=null;
let _modalPrevFocus=null;
function closeAppModal(){
  const r=document.getElementById('appModalRoot');
  if(r) r.style.display='none';
  const sheet=r&&r.querySelector('.modal-sheet');
  if(sheet) sheet.classList.remove('xl');
  if(_modalEscHandler){ document.removeEventListener('keydown',_modalEscHandler); _modalEscHandler=null; }
  /* Odağı modalı açan öğeye geri ver. */
  try{ if(_modalPrevFocus&&document.contains(_modalPrevFocus)) _modalPrevFocus.focus(); }catch(e){}
  _modalPrevFocus=null;
}
function showAppModal(html,opts){
  opts=opts||{};
  const b=document.getElementById('appModalBody');
  const r=document.getElementById('appModalRoot');
  const sheet=r&&r.querySelector('.modal-sheet');
  if(sheet) sheet.classList.toggle('xl',!!opts.xl);
  if(b) b.innerHTML=html;
  if(r) r.style.display='flex';
  if(!_modalPrevFocus){ try{ _modalPrevFocus=document.activeElement; }catch(e){} }
  if(sheet){
    sheet.setAttribute('role','dialog');
    sheet.setAttribute('aria-modal','true');
    if(!sheet.hasAttribute('tabindex')) sheet.setAttribute('tabindex','-1');
    try{ sheet.focus({preventScroll:true}); }catch(e){}
  }
  if(!_modalEscHandler){
    _modalEscHandler=(e)=>{ if(e.key==='Escape'){ e.preventDefault(); closeAppModal(); } };
    document.addEventListener('keydown',_modalEscHandler);
  }
}

/* F7-20: kulüp önbelleği bellekte tutulur — her çağrıda ~300 KB JSON.parse ediliyordu ve
   buildSeasonPlayerPool bunu 19 akran takım için arka arkaya yapıyordu (~6 MB / kare).
   YAZMA senkron kalır: economy.js ve match-prep.js aynı anahtara doğrudan yazıyor; onlar
   yazdıktan sonra invalidateClubCacheMem() ile bellek tazelenir. */
let _clubCacheMem=null;
function invalidateClubCacheMem(){ _clubCacheMem=null; }
function getBotClubProfile(teamName,ligKey){
  if(G.team&&teamName===G.team.isim&&ligKey===G.team.tblKey){
    return {human:true,teamName,ligKey,logoUrl:G.team.logoUrl||'',arena:G.arena.isim,renk:G.team.renk||'#f97316',roster:G.players.slice()};
  }
  /* F7-20: bellek içi önbellek — her çağrıda ~300 KB JSON.parse ediliyordu. */
  let cache=_clubCacheMem;
  if(!cache){
    try{ cache=JSON.parse(localStorage.getItem(CLUB_CACHE_KEY)||'{}'); }catch(e){ cache={}; }
    _clubCacheMem=cache;
  }
  const ck=ligKey+'||'+teamName;
  /* FAZ A: eski önbellekteki bot kadrolarına rol/eğilim geriye dönük doldurulur (seed'den deterministik). */
  if(cache[ck]){ const hit=Object.assign({human:false},cache[ck]); ensureRoles(hit.roster); return hit; }
  const seed=hash32(ck);
  const roster=[];
  const dist=['PG','SG','SG','SF','PF','C','C'];
  for(let i=0;i<dist.length;i++){
    const p=genPlayer(dist[i]);
    p.id='b'+seed+'_'+i;
    p.seed='b'+ck+i;
    p.maas=salaryKRFromGenel(p.genel);
    roster.push(p);
  }
  ensureUniquePlayerNames(roster);
  const arenas=['Şehir Spor Salonu','Metro Arena','Karadeniz Kapalı','Ege Basket Merkezi','Anadolu Spor Kompleksi'];
  const row={human:false,teamName,ligKey,logoUrl:'',arena:arenas[seed%arenas.length],renk:['#3b82f6','#22c55e','#ef4444','#a855f7'][seed%4],roster};
  cache[ck]=row;
  /* Önbellek sınırı: en eski kayıtlar atılır — ama aktif lig grubundaki takımlar ASLA silinmez
     (Madde 31), yoksa kullanıcının rakip kadroları/isimleri sezon ortasında değişebilir. */
  const keys=Object.keys(cache);
  if(keys.length>60){
    const activePrefix=((G.team&&G.team.tblKey)||'')+'||';
    const evictable=keys.filter(k=>!k.startsWith(activePrefix));
    const overflow=keys.length-60;
    evictable.slice(0,Math.min(overflow,evictable.length)).forEach(k=>{ delete cache[k]; });
  }
  _clubCacheMem=cache;
  try{ localStorage.setItem(CLUB_CACHE_KEY,JSON.stringify(cache)); }catch(e){}
  return row;
}

function openLigGroupModal(ligKey){
  const rows=buildLeagueRows(ligKey);
  const body=rows.filter(r=>!r.bos).map(r=>{
    return `<div class="league-pick-row" data-team="${encodeURIComponent(r.isim)}" data-lig="${ligKey}" style="cursor:pointer;padding:10px;border-radius:8px;border:1px solid var(--border);margin-bottom:6px;display:flex;align-items:center;gap:10px;"><span style="width:10px;height:10px;border-radius:50%;background:${r.renk};"></span><strong>${escMatch(r.isim)}</strong>${G.team&&r.isim===G.team.isim&&ligKey===G.team.tblKey?' <span style="color:var(--accent);">(sen)</span>':''}<span style="font-size:11px;color:var(--text2);margin-left:auto;">G ${r.g} / M ${r.m}</span></div>`;
  }).join('');
  showAppModal(`<div class="modal-title">${formatTblSlotLabel(ligKey)}</div><p style="font-size:12px;color:var(--text2);margin-bottom:12px;">Takıma tıkla — logo, arena, kadro özeti (bilanço / özel veriler yok).</p><div id="ligPickList">${body||'<p style="color:var(--text2);">Takım yok.</p>'}</div>`);
  document.querySelectorAll('#ligPickList .league-pick-row').forEach(row=>{
    row.addEventListener('click',()=>{
      openClubPublicModal(decodeURIComponent(row.getAttribute('data-team')),row.getAttribute('data-lig'));
    });
  });
}

function openClubPublicModal(teamName,ligKey){
  const prof=getBotClubProfile(teamName,ligKey);
  const logo=prof.logoUrl?`<img src="${prof.logoUrl.replace(/"/g,'')}" style="max-width:100px;border-radius:8px;" referrerpolicy="no-referrer" onerror="this.style.display='none'">`:`<div style="width:72px;height:72px;border-radius:12px;background:${prof.renk};"></div>`;
  const roster=prof.roster.map(p=>`<div style="display:flex;gap:8px;align-items:center;padding:6px;background:var(--bg3);border-radius:8px;margin-bottom:4px;"><div class="mavatar-wrap"><img src="${playerAvatar(p.seed,p.id,{ovr:p.genel})}" ${playerAvatarImgAttrs(p.seed,p.id,{ovr:p.genel})} style="width:44px;height:56px;border-radius:6px;object-fit:cover;"><span style="font-size:9px;font-weight:700;color:var(--accent);">OVR ${p.genel}</span></div><div style="font-size:12px;"><strong>${p.bayrak} ${p.isim}</strong><br><span style="color:var(--text2);">${p.poz} · ${p.genel}</span></div></div>`).join('');
  const mgr=prof.human
    ?`<p style="font-size:11px;color:var(--blue);margin:6px 0 0;">👔 Menajer: ${escMatch(G.managerName||'Menajer')} · itibar ${Number(G.managerRep)||0}</p>`
    :(()=>{ const r=botManagerRepText(teamName); return `<p style="font-size:11px;color:var(--blue);margin:6px 0 0;">👔 Menajer: ${r.text} · ${r.titles} kupa geçmişi</p>`; })();
  const note=prof.human?'<p style="font-size:11px;color:var(--gold);margin-top:10px;">Kendi kulübün: bilanço ve detaylar sadece sana açık.</p>':'<p style="font-size:11px;color:var(--text2);margin-top:10px;">Bot kulüp — rakip menajerin geçmişi yukarıda.</p>';
  showAppModal(`<div class="modal-title">${escMatch(teamName)}</div><div style="display:flex;gap:12px;align-items:center;margin-bottom:10px;">${logo}<div><p style="font-size:13px;margin:0;"><strong>Arena:</strong> ${escMatch(prof.arena)}</p><p style="font-size:12px;color:var(--text2);margin:4px 0 0;">${formatTblSlotLabel(ligKey)}</p>${mgr}</div></div>${note}<div style="font-weight:700;font-size:12px;margin-top:12px;">Kadro (özet — OVR)</div>${roster}`);
}

function openPlayerInspectModal(pid){
  const p=G.players.find(x=>x.id===pid);
  if(!p) return;
  const stats=STAT_KEYS.map(k=>`<div class="sitem"><span class="sname">${STAT_LABELS[k]}</span><span class="sval ${sv(p[k])}">${p[k]}</span></div>`).join('');
  showAppModal(`<div class="modal-title">${p.isim}</div><div style="display:flex;gap:14px;flex-wrap:wrap;"><div class="pimg-wrap"><img src="${playerAvatar(p.seed,p.id,{ovr:p.genel})}" ${playerAvatarImgAttrs(p.seed,p.id,{ovr:p.genel})} style="width:90px;height:112px;border-radius:10px;border:2px solid var(--accent);object-fit:cover;"><div class="pimg-cap">OVR ${p.genel}</div></div><div style="flex:1;min-width:200px;font-size:13px;line-height:1.55;"><p style="margin:0 0 6px;">${p.bayrak} ${p.ulke} · ${p.yas} yaş · ${p.boy}cm / ${p.kilo}kg</p><p style="margin:0 0 6px;"><span class="pbadge pos-${p.poz.toLowerCase()}">${p.poz}</span> · <strong style="color:var(--accent);font-family:'Bebas Neue','Arial Narrow','Helvetica Neue Condensed',Impact,sans-serif;font-size:20px;">OVR ${p.genel}</strong> · ${starFromGenel(p.genel)}★</p><p style="margin:0 0 6px;">Potansiyel: ${p.potansiyel||'—'}</p><p style="margin:0 0 6px;">Enerji (maç yorgunluğu): <strong>${Math.round(Number(p.enerji)||100)}</strong>/100</p><p style="margin:0 0 6px;">Maaş: <strong style="color:var(--gold);">${fmtn(p.maas)}</strong> KR/hf${p.kontratSezon!=null?` · 📄 ${p.kontratSezon} sezon`:''}</p>${p.sezon&&p.sezon.mac?`<p style="margin:0 0 6px;color:var(--blue);">📊 Sezon: ${p.sezon.mac} maç · ${(p.sezon.pts/p.sezon.mac).toFixed(1)} sayı · ${(p.sezon.ast/p.sezon.mac).toFixed(1)} asist ort.</p>`:''}<p style="margin:0;">Psikoloji: <span style="color:${moodColor(p.mood)};">${moodText(p.mood)}</span></p></div></div><div class="sgrid" style="margin-top:14px;">${stats}</div>`);
}

function pushLeagueNewsLine(html){
  let arr=[];
  try{ arr=JSON.parse(sessionStorage.getItem(NEWS_SESSION_KEY)||'[]'); }catch(e){ arr=[]; }
  arr.unshift({t:Date.now(),html});
  sessionStorage.setItem(NEWS_SESSION_KEY,JSON.stringify(arr.slice(0,40)));
}
function maybeSimOtherTransfers(){
  if(!G.team||!G.team.tblKey) return;
  const sub=getTblState().subs[G.team.tblKey];
  if(!sub||!sub.teams) return;
  const peers=sub.teams.filter(n=>n&&n!==G.team.isim);
  if(!peers.length||Math.random()>0.5) return;
  const t1=ch(peers);
  const fake=`${ch(ILK)} ${ch(SY)}`;
  const fee=rand(4000,80000);
  pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--blue);">💰 <strong>${t1}</strong> — senin grubun (<code style="font-size:10px;">${G.team.tblKey}</code>) — <strong>${fmtn(fee)} KR</strong> ile <strong>${fake}</strong> için anlaşma duyurdu.</div>`);
}
function renderDashboardNews(){
  const box=document.getElementById('newsLog');
  if(!box||!G.team) return;
  maybeSimOtherTransfers();
  let arr=[];
  try{ arr=JSON.parse(sessionStorage.getItem(NEWS_SESSION_KEY)||'[]'); }catch(e){ arr=[]; }
  const intro=`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--accent);">📡 <strong>Lig haberleri</strong> — yalnızca senin <strong>${formatTblSlotLabel(G.team.tblKey)}</strong> grubun · ekonomi <strong>KR</strong> · maçlar 4×5 dk (20 dk) + 5 dk uzatmalar.</div>`;
  box.innerHTML=intro+(arr.length?arr.map(x=>x.html).join(''):'<div style="padding:9px 12px;color:var(--text2);font-size:12px;">Henüz transfer duyurusu yok; Transfer Market veya zaman ilerleyince dolar.</div>');
}

function renderLeagueSidebar(){
  const el=document.getElementById('leagueTree');
  if(!el) return;
  const st=getTblState();
  const userKey=G.team&&G.team.tblKey;
  const userPk=userKey?parseTblKey(userKey):null;
  const userDiv=(userPk&&userPk.kind==='div')?userPk.div:0;
  const userInTbl=userKey==='tbl';
  let html='<div class="lt-root">';
  {
    const tblOpen=userInTbl;
    const teams=(st.subs.tbl&&st.subs.tbl.teams)||[];
    const cnt=teams.filter(Boolean).length;
    html+=`<section class="lt-block"><button type="button" class="lt-h">${tblOpen?'▼':'▶'} TBL</button>`;
    html+=`<div class="lt-body${tblOpen?' open':''}"><div class="league-slot${userKey==='tbl'?' user':''}" data-lig="tbl">${sidebarSlotLabel('tbl')} · ${cnt}/${LEAGUE_SIZE}${userKey==='tbl'?' · sen':''}</div></div></section>`;
  }
  for(let d=1;d<=SIDEBAR_DIV_MAX_VISIBLE;d++){
    const open=!userInTbl&&userDiv===d;
    html+=`<section class="lt-block"><button type="button" class="lt-h">${open?'▼':'▶'} Div ${d}</button>`;
    html+=`<div class="lt-body${open?' open':''}">`;
    for(let s=1;s<=5;s++){
      const k=`${d}.${s}`;
      const teams=(st.subs[k]&&st.subs[k].teams)||[];
      const cnt=teams.filter(Boolean).length;
      const userHere=(k===userKey);
      html+=`<div class="league-slot${userHere?' user':''}" data-lig="${k}">${sidebarSlotLabel(k)} · ${cnt}/${LEAGUE_SIZE}${userHere?' · sen':''}</div>`;
    }
    html+='</div></section>';
  }
  html+='</div>';
  el.innerHTML=html;
  el.querySelectorAll('.lt-block').forEach(block=>{
    const h=block.querySelector('.lt-h');
    const body=block.querySelector('.lt-body');
    if(!h||!body) return;
    h.addEventListener('click',()=>{
      body.classList.toggle('open');
      const rest=h.textContent.replace(/^[▶▼]\s*/,'').trim();
      h.textContent=(body.classList.contains('open')?'▼':'▶')+' '+rest;
    });
  });
  el.querySelectorAll('.league-slot[data-lig]').forEach(node=>{
    node.addEventListener('click',(e)=>{
      e.stopPropagation();
      openLigGroupModal(node.getAttribute('data-lig'));
    });
  });
}

function syncSidebarBranding(){
  const dot=document.getElementById('sbDot');
  if(!dot||!G.team) return;
  if(G.team.logoUrl){
    const u=G.team.logoUrl.replace(/"/g,'').replace(/'/g,'');
    dot.innerHTML='<img src="'+u+'" alt="" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">';
    dot.style.background='transparent';
  } else {
    dot.innerHTML='';
    dot.style.background=G.team.renk||'#f97316';
  }
}

function renameTeamInLeagueStorage(oldName,newName){
  if(!oldName||!newName||oldName===newName||!G.team||!G.team.tblKey) return;
  const st=getTblState();
  const arr=st.subs[G.team.tblKey]&&st.subs[G.team.tblKey].teams;
  if(!arr) return;
  const ix=arr.indexOf(oldName);
  if(ix!==-1){ arr[ix]=newName; localStorage.setItem(TBL_STORAGE_KEY,JSON.stringify(st)); }
}

function updateTeamLogoPreviewUI(){
  const img=document.getElementById('teamLogoPreview');
  const ph=document.getElementById('teamLogoPlaceholder');
  const inp=document.getElementById('teamLogoUrl');
  if(!img||!ph) return;
  let u=(inp&&inp.value.trim())||'';
  if(!u&&G.team&&G.team.logoUrl) u=G.team.logoUrl;
  if(u){
    img.src=u; img.style.display='block'; ph.style.display='none';
    img.referrerPolicy='no-referrer';
    img.onerror=function(){ this.style.display='none'; ph.style.display='flex'; };
  } else {
    img.style.display='none'; ph.style.display='flex';
  }
}

function pickTeamLogoFile(){
  const el=document.getElementById('teamLogoFile');
  if(el) el.click();
}

function onTeamLogoFileChange(ev){
  const f=ev.target.files&&ev.target.files[0];
  if(!f) return;
  if(!G.team){ showNotif('Önce takım oluştur.'); ev.target.value=''; return; }
  if(!/^image\//.test(f.type)){ showNotif('Sadece resim dosyası seç (jpg, png, webp…).'); ev.target.value=''; return; }
  const r=new FileReader();
  r.onload=()=>{
    G.team.logoUrl=r.result;
    const inp=document.getElementById('teamLogoUrl');
    if(inp) inp.value='';
    updateTeamLogoPreviewUI();
    syncSidebarBranding();
    scheduleGameSave();
    showNotif('Logo bilgisayardan yüklendi.');
  };
  r.onerror=()=>showNotif('Dosya okunamadı.');
  r.readAsDataURL(f);
  ev.target.value='';
}

function renderTeamDetailPage(){
  if(!G.team){ return; }
  G.lastActive=new Date().toISOString();
  const nameEl=document.getElementById('teamEditName');
  const logoInp=document.getElementById('teamLogoUrl');
  if(nameEl) nameEl.value=G.team.isim;
  if(logoInp){
    const lu=G.team.logoUrl||'';
    logoInp.value=(lu.startsWith('http://')||lu.startsWith('https://'))?lu:'';
    updateTeamLogoPreviewUI();
  }
  else if(G.team.logoUrl){
    const img=document.getElementById('teamLogoPreview');
    const ph=document.getElementById('teamLogoPlaceholder');
    if(img&&ph){ img.src=G.team.logoUrl; img.style.display='block'; ph.style.display='none'; img.referrerPolicy='no-referrer';
      img.onerror=function(){ this.style.display='none'; ph.style.display='flex'; };
    }
  }
  const key=G.team.tblKey||'tbl';
  const rows=buildLeagueRows(key);
  const rank=rows.findIndex(t=>t.isUser);
  const rankStr=rank>=0?`${rank+1}. sıra · ${formatTblSlotLabel(key)}`:formatTblSlotLabel(key);
  const avg=G.players.length?Math.round(G.players.reduce((s,p)=>s+p.genel,0)/G.players.length):0;
  const ages=G.players.length?(G.players.reduce((s,p)=>s+p.yas,0)/G.players.length).toFixed(1):'—';
  const top8=G.players.slice().sort((a,b)=>b.genel-a.genel).slice(0,8);
  const top8avg=top8.length?Math.round(top8.reduce((s,p)=>s+p.genel,0)/top8.length):0;
  const fs=getFanBaseStats();
  const fan=fs.count;
  const fanLbl=G.wins>=5?'Harika sezon!':'Gelişim gösteriliyor';
  const rival=G.ligTeams&&G.ligTeams[0]?G.ligTeams[0].isim:'—';
  const joined=G.joinedAt?new Date(G.joinedAt).toLocaleString('tr-TR'):'—';
  const active=G.lastActive?new Date(G.lastActive).toLocaleString('tr-TR'):'—';
  const availOvr=(G.players||[]).filter(p=>!playerIsInjured(p));
  const teamOvr=availOvr.length
    ?Math.round(availOvr.reduce((s,p)=>s+(Number(p.genel)||0),0)/availOvr.length)
    :(G.players.length?avg:0);
  const rowsHtml=[
    ['🏆 Menajer',G.managerName+' <span style="font-size:11px;color:var(--text2);">(oyun içi)</span>'],
    ['💡 Son aktivite',active],
    ['📅 Katılım',joined],
    ['🏟️ Lig',rankStr],
    ['🌱 Altyapı',`<button type="button" class="linklike" onclick="gotoAltyapiPage()">Altyapı →</button>`],
    ['⚔️ Rakip (ör.)',rival],
    ['🏀 Arena',`${G.arena.isim||'Arena'} — ${fmtn(G.arena.kap)} kişi`],
    ['📣 Sponsor','Charazay 2.0'],
    ['🌍 Ülke','🇹🇷 Türkiye'],
    ['👥 Taraftar grubu',`${fs.group} · ~${fmtn(fan)} taraftar`],
    ['📊 Taraftar havası',fanLbl+' <div class="chem-bar" style="margin-top:6px;"><div class="chem-fill" style="width:'+Math.min(100,G.chemistry)+'%;"></div></div>'],
    ['📈 Oyuncu ort. güç',`${avg} <span style="color:var(--text2);font-size:11px;">(İlk 8 ort: ${top8avg})</span>`],
    ['⚡ Takım OVR',String(teamOvr)],
    ['🎂 Oyuncu ort. yaş',`${ages} yaş <span style="color:var(--text2);font-size:11px;">(İlk 8 ort: ${top8.length? (top8.reduce((s,p)=>s+p.yas,0)/top8.length).toFixed(1):'—'})</span>`]
  ];
  const wrap=document.getElementById('teamDetailRows');
  if(wrap) wrap.innerHTML=rowsHtml.map(([k,v])=>`<div class="td-row"><span>${k}</span><div style="text-align:right;color:var(--text);font-size:12px;font-weight:600;">${v}</div></div>`).join('');
}

function saveTeamNameFromPage(){
  if(!G.team) return;
  const inp=document.getElementById('teamEditName');
  if(!inp) return;
  const n=sanitizeTeamName(inp.value);
  if(!n){ showNotif('Takım adı boş olamaz'); return; }
  const o=G.team.isim;
  G.team.isim=n;
  renameTeamInLeagueStorage(o,n);
  if(G.season){
    (G.season.matches||[]).forEach(m=>{
      if(m.home===o) m.home=n;
      if(m.away===o) m.away=n;
    });
    if(G.season.standings&&G.season.standings[o]){
      G.season.standings[n]=G.season.standings[o];
      delete G.season.standings[o];
    }
  }
  G.ligTeams=genLigTeams();
  regenerateSeasonFixtures();
  document.getElementById('sbTeam').textContent=n;
  const lh=document.getElementById('liveHome');
  if(lh) lh.textContent=n;
  const nh=document.getElementById('nextHome');
  if(nh) nh.textContent=n;
  renderTeamDetailPage();
  renderLig();
  renderFixture();
  renderDashboardNextMatch();
  scheduleGameSave();
  showNotif('Takım adı kaydedildi.');
}

function saveTeamLogo(){
  if(!G.team) return;
  const inp=document.getElementById('teamLogoUrl');
  if(!inp) return;
  let u=inp.value.trim();
  if(u&&!/^https?:\/\//i.test(u)&&!/^data:image\//i.test(u)){ showNotif('Logo için http(s) adresi veya önce dosyadan yükle.'); return; }
  if(!u){
    if(G.team.logoUrl&&/^data:image\//i.test(G.team.logoUrl)){
      updateTeamLogoPreviewUI();
      syncSidebarBranding();
      showNotif('Dosya logosu aktif. Silmek için aşağıdan «Logoyu sil» kullan.');
      return;
    }
    G.team.logoUrl='';
    updateTeamLogoPreviewUI();
    syncSidebarBranding();
    showNotif('Logo kaldırıldı.');
    return;
  }
  G.team.logoUrl=u;
  updateTeamLogoPreviewUI();
  syncSidebarBranding();
  scheduleGameSave();
  showNotif(u.startsWith('data:')?'Logo (data) kaydedildi.':'Logo kaydedildi. (Yüklenmezse başka resim dene.)');
}

function clearTeamLogo(){
  if(!G.team) return;
  G.team.logoUrl='';
  const inp=document.getElementById('teamLogoUrl');
  if(inp) inp.value='';
  updateTeamLogoPreviewUI();
  syncSidebarBranding();
  scheduleGameSave();
  showNotif('Logo silindi.');
}

function switchTeamTab(which,btn){
  document.querySelectorAll('#teamPageTabs .td-tab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
  ['teamPanelDetay','teamPanelKadro','teamPanelFikstur'].forEach(pid=>{
    const el=document.getElementById(pid);
    if(el) el.classList.remove('active');
  });
  if(which==='detay'){
    const e=document.getElementById('teamPanelDetay');
    if(e) e.classList.add('active');
  } else if(which==='kadro'){
    const e=document.getElementById('teamPanelKadro');
    if(e){ e.classList.add('active'); renderTeamRosterMini(); }
  } else if(which==='fikstur'){
    const e=document.getElementById('teamPanelFikstur');
    if(e){ e.classList.add('active'); renderTeamFixturePanel(); }
  }
}

function renderTeamRosterMini(){
  const w=document.getElementById('teamRosterMini');
  if(!w||!G.players||!G.team) return;
  const list=G.players.slice().sort((a,b)=>b.genel-a.genel);
  w.innerHTML=list.map(p=>`
    <div class="team-rmini" data-pid="${p.id}">
      <div class="mavatar-wrap" style="align-items:center;">
      <img src="${playerAvatar(p.seed,p.id,{ovr:p.genel})}" ${playerAvatarImgAttrs(p.seed,p.id,{ovr:p.genel})} alt="" width="52" height="64" loading="lazy" style="border-radius:8px;border:2px solid var(--accent);object-fit:cover;">
      <span style="font-size:9px;font-weight:800;color:var(--accent);margin-top:2px;">OVR ${p.genel}</span>
      </div>
      <div style="min-width:0;">
        <div style="font-weight:700;font-size:12px;">${p.bayrak} ${p.isim}</div>
        <div style="font-size:10px;color:var(--text2);">${p.poz} · ${p.yas} yaş · Güç <strong style="color:var(--accent);">${p.genel}</strong> · tıkla, detay</div>
      </div>
    </div>`).join('');
  w.querySelectorAll('.team-rmini').forEach(row=>{
    row.style.cursor='pointer';
    row.addEventListener('click',()=>{
      const id=row.getAttribute('data-pid');
      if(id) openPlayerInspectModal(id);
    });
  });
}


function emptyStandingsRow(){ return {o:0,g:0,m:0,sf:0,sa:0}; }

function initStandingsForTeams(names){
  const o={};
  names.forEach(n=>{ if(n) o[n]=emptyStandingsRow(); });
  return o;
}

function genRoundRobinMatches(teamNames){
  const teams=teamNames.filter(Boolean).slice();
  if(teams.length<2) return [];
  if(teams.length%2) teams.push(null);
  const N=teams.length;
  const R=N-1;
  const out=[];
  let arr=teams.slice();
  /* Ev/deplasman dengesi: dönme yönteminin (r+i)%2 heuristiği bazı takımlara aşırı ev maçı veriyordu
     (ör. kullanıcı 18 ev / 1 deplasman). Ev sahibini o ana dek daha az ev maçı oynayana vererek dengeler. */
  const homeCount={};
  teams.forEach(t=>{ if(t) homeCount[t]=0; });
  for(let r=0;r<R;r++){
    for(let i=0;i<N/2;i++){
      const a=arr[i], b=arr[N-1-i];
      if(a==null||b==null) continue;
      let home,away;
      if(homeCount[a]<homeCount[b]){ home=a; away=b; }
      else if(homeCount[b]<homeCount[a]){ home=b; away=a; }
      else { const swap=(r+i)%2; home=swap?b:a; away=swap?a:b; }
      homeCount[home]++;
      out.push({round:r+1,home,away,played:false,hs:0,as:0,day:0});
    }
    const last=arr.pop();
    if(arr.length) arr.splice(1,0,last);
  }
  out.forEach((m,i)=>{ m.seasonMatchIx=i; });
  return out;
}

function assignSeasonMatchdays(matches,maxDay){
  const byR={};
  matches.forEach(m=>{
    if(!byR[m.round]) byR[m.round]=[];
    byR[m.round].push(m);
  });
  let d=rand(1,3);
  const rounds=Object.keys(byR).map(Number).sort((a,b)=>a-b);
  for(const r of rounds){
    d=Math.min(maxDay,d+(r===rounds[0]?0:rand(1,2)));
    byR[r].forEach(m=>{ m.day=d; });
  }
}

/** Her maça deterministik başlama saati (aynı turda farklı slotlar). */
function assignSeasonKickoffs(matches){
  if(!matches||!matches.length) return;
  const byR={};
  matches.forEach(m=>{
    const r=m.round||1;
    if(!byR[r]) byR[r]=[];
    byR[r].push(m);
  });
  const slotsH=[17,19,15,21,20,18];
  Object.keys(byR).forEach(rk=>{
    const list=byR[rk].slice().sort((a,b)=>a.seasonMatchIx-b.seasonMatchIx);
    list.forEach((m,i)=>{
      m.kickH=slotsH[(i+m.seasonMatchIx+m.round)%slotsH.length];
      m.kickM=((m.seasonMatchIx*3+i)%2)?30:0;
    });
  });
}

function ensureMatchKickoffs(){
  if(!G.season||!Array.isArray(G.season.matches)||!G.season.matches.length) return;
  if(G.season.matches.some(m=>m.kickH==null||m.kickM==null)) assignSeasonKickoffs(G.season.matches);
}

function formatKickClock(m){
  if(!m) return '—';
  const h=m.kickH!=null?Number(m.kickH):17;
  const min=m.kickM!=null?Number(m.kickM):0;
  return String(h).padStart(2,'0')+':'+String(min).padStart(2,'0');
}

/** Sıradaki kullanıcı maçı «bugün» kabul edilir; diğer günler buna göre kaydırılır (sayfa yüklendiğinde güncel takvim). */
function formatFixtureDayLabel(dayNum){
  const d0=Math.max(1,Number(dayNum)||1);
  const nm=G.season&&G.season.active&&G.team?findNextUserSeasonMatch():null;
  if(nm){
    try{
      const dt=new Date();
      dt.setHours(0,0,0,0);
      dt.setDate(dt.getDate()+(d0-nm.day));
      return dt.toLocaleDateString(typeof getLang==='function'&&getLang()==='en'?'en-GB':'tr-TR',{weekday:'short',day:'numeric',month:'long'});
    }catch(e){}
  }
  return 'Gün '+d0;
}

function escMatch(s){
  /* F7-26: > ve ' de kaçırılır. Bugün sanitizeTeamName + _stripSaveMarkup iki katman
     olduğu için istismar edilemiyor; bu katman tek başına kaldığında da güvenli olsun. */
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function getUpcomingUserMatches(limit){
  if(!G.team||!G.season||!G.season.matches) return [];
  const u=G.team.isim;
  ensureMatchKickoffs();
  return G.season.matches
    .filter(m=>!m.played&&(m.home===u||m.away===u))
    .sort((a,b)=>a.day-b.day||a.round-b.round||a.seasonMatchIx-b.seasonMatchIx)
    .slice(0,Math.max(1,limit||6));
}

function macSeasonMatchCardHtml(m,isNext){
  const cl=isNext?' mac-fx-next':'';
  const time=formatKickClock(m);
  const tarih=formatFixtureDayLabel(m.day);
  const tact=m.played
    ?'<span style="font-size:11px;color:var(--text2);text-align:center;">Oynandı</span>'
    :isNext
    ?`<div style="display:flex;flex-direction:column;gap:6px;">
        <button type="button" class="btn-p mac-fx-tact" style="background:linear-gradient(135deg,var(--accent),#ea580c);" onclick="startNextMatchNow()">▶ Maçı Başlat</button>
        <button type="button" class="btn-sm mac-fx-tact" onclick="openMatchTactics(${m.seasonMatchIx})">🎯 Taktik ayarla</button>
      </div>`
    :'<span style="font-size:11px;color:rgba(255,255,255,0.42);text-align:center;line-height:1.35;">Sadece sıradaki maç (sim test)</span>';
  return `<div class="mac-fx-card${cl}">
    <div class="mac-fx-teams">
      <div class="mac-fx-name">${escMatch(m.home)}</div>
      <div class="mac-fx-vs">VS</div>
      <div class="mac-fx-name">${escMatch(m.away)}</div>
    </div>
    <div class="mac-fx-meta">${time} · ${tarih}<br><span style="opacity:.85">Gün ${m.day} · Tur ${m.round}/${totalRounds()}</span></div>
    ${tact}
  </div>`;
}

function fixtureFullSeasonGridHtml(rows){
  const nx=findNextUserSeasonMatch();
  const parts=rows.map(r=>{
    if(r.done){
      return `<div class="mac-fx-card" style="opacity:.88;">
        <div class="mac-fx-teams">
          <div class="mac-fx-name">${escMatch(r.t1)}</div>
          <div class="mac-fx-vs" style="font-family:'Bebas Neue','Arial Narrow','Helvetica Neue Condensed',Impact,sans-serif;font-size:18px;color:var(--text);">${r.s1}-${r.s2}</div>
          <div class="mac-fx-name">${escMatch(r.t2)}</div>
        </div>
        <div class="mac-fx-meta">Gün ${r.dayNum} · Tur ${r.round}/${totalRounds()} · Tamamlandı</div>
      </div>`;
    }
    const raw=G.season&&G.season.matches&&r.seasonMatchIx!=null?G.season.matches[r.seasonMatchIx]:null;
    if(!raw) return '';
    return macSeasonMatchCardHtml(raw,!!(nx&&nx.seasonMatchIx===r.seasonMatchIx));
  });
  return `<div class="mac-fixture-grid">${parts.join('')}</div>`;
}

function openMatchTactics(seasonMatchIx){
  if(!G.team){ showNotif('Önce takım oluştur.'); return; }
  ensureMatchKickoffs();
  const nx=findNextUserSeasonMatch();
  if(!nx||nx.seasonMatchIx!==seasonMatchIx){ showNotif('Şimdilik yalnızca sıradaki maç için hazırlanabilir (simülasyon sırası).'); return; }
  const m=G.season&&G.season.matches&&G.season.matches.find(x=>x.seasonMatchIx===seasonMatchIx);
  if(!m){ showNotif('Maç bulunamadı.'); return; }
  if(m.played){ showNotif('Bu maç zaten oynandı.'); return; }
  const u=G.team.isim;
  if(m.home!==u&&m.away!==u){ showNotif('Bu maç senin takımına ait değil.'); return; }
  G.prepareMatchIx=seasonMatchIx;
  scheduleGameSave();
  const op=m.home===u?m.away:m.home;
  /* F7-5: 'İlk 5 seç'e basıp dönen kullanıcının KAYDEDİLMEMİŞ taktik seçimleri, modalın
     innerHTML'i değiştiği için siliniyordu. Taslak varsa onu göster, sonra tüket. */
  const tac=_tacDraft||G.tactics||{tempo:'normal',odak:'dengeli'};
  _tacDraft=null;
  const radio=(name,val,cur,label,desc)=>`<label style="display:flex;gap:8px;align-items:flex-start;padding:9px 10px;background:var(--bg3);border:1px solid ${val===cur?'var(--accent)':'var(--border)'};border-radius:10px;cursor:pointer;margin-bottom:6px;">
    <input type="radio" name="${name}" value="${val}" ${val===cur?'checked':''} style="margin-top:2px;">
    <span><strong style="font-size:12px;">${label}</strong><br><span style="font-size:11px;color:var(--text2);">${desc}</span></span>
  </label>`;
  const healthy=(G.players||[]).filter(p=>!playerIsInjured(p));
  const focusOpts=`<option value="">— Yok (dengeli dağıtım) —</option>`+healthy.map(p=>`<option value="${p.id}" ${tac.focusPlayerId===p.id?'selected':''}>${escMatch(p.isim)} (${p.poz}·OVR ${p.genel})</option>`).join('');
  const secTitle=t=>`<div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">${t}</div>`;
  showAppModal(`<div class="modal-title">🎯 Taktik — vs ${escMatch(op)}</div>
    <p style="font-size:12px;color:var(--text2);margin-bottom:12px;">${formatFixtureDayLabel(m.day)} · ${formatKickClock(m)} · Tur ${m.round}/${totalRounds()} · Sen: ${m.home===u?'Ev':'Deplasman'}</p>
    <div class="g2" style="gap:12px;">
      <div>
        ${secTitle('Tempo')}
        ${radio('tacTempo','yavas',tac.tempo,'🐢 Yavaş','Az hücum, kontrollü — isabet artar')}
        ${radio('tacTempo','normal',tac.tempo,'⚖️ Normal','Dengeli oyun')}
        ${radio('tacTempo','hizli',tac.tempo,'⚡ Hızlı','Çok hücum — isabet biraz düşer')}
      </div>
      <div>
        ${secTitle('Hücum odağı')}
        ${radio('tacOdak','ic',tac.odak,'🏀 İçeri ağırlıklı','Pota altı, 2 sayı isabeti artar')}
        ${radio('tacOdak','dis',tac.odak,'🎯 Dış şut ağırlıklı','Bol üçlük denemesi')}
        ${radio('tacOdak','hizli',tac.odak,'⚡ Hızlı hücum','Erken şut — top kaybı riski artar')}
        ${radio('tacOdak','set',tac.odak,'📋 Set oyun','Sabırlı — asist ve isabet artar, top kaybı azalır')}
        ${radio('tacOdak','dengeli',tac.odak,'⚖️ Dengeli','Karışık şut seçimi')}
      </div>
    </div>
    <div class="g2" style="gap:12px;margin-top:12px;">
      <div>
        ${secTitle('Savunma stili')}
        ${radio('tacDef','adam',tac.defensiveStyle||'adam','🧍 Adam adama','Dengeli — nötr')}
        ${radio('tacDef','bolge',tac.defensiveStyle||'adam','🛡️ Bölge savunması','Pota altını kapar (iki sayı isabeti düşer), dışarı biraz açık')}
        ${radio('tacDef','pres',tac.defensiveStyle||'adam','🔥 Pres','Çok top çalar ama isabet/faul riski artar')}
      </div>
      <div>
        ${secTitle('Top yükleme (belirli oyuncu)')}
        <select id="tacFocus" style="width:100%;padding:9px;border-radius:9px;background:var(--bg3);color:var(--text);border:1px solid var(--border);font-size:12px;margin-bottom:10px;">${focusOpts}</select>
        ${secTitle('Rakibe özel eşleştirme')}
        <label style="display:flex;gap:8px;align-items:flex-start;padding:9px 10px;background:var(--bg3);border:1px solid ${tac.markStar?'var(--accent)':'var(--border)'};border-radius:10px;cursor:pointer;">
          <input type="checkbox" id="tacMark" ${tac.markStar?'checked':''} style="margin-top:2px;">
          <span style="font-size:11px;">🎯 En iyi savunmacını <strong>rakibin yıldızına</strong> ata — o oyuncunun isabeti düşer.</span>
        </label>
      </div>
    </div>
    ${playbookPickerHtml(tac)}
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
      <button type="button" class="btn-p" style="flex:1;padding:10px;" onclick="saveMatchTactics()">Taktiği kaydet</button>
      <button type="button" class="btn-sm" style="flex:1;" onclick="openLineupEditor()">🏀 İlk 5 seç</button>
    </div>
    <p style="font-size:10px;color:var(--text2);margin-top:10px;">İlk 5 seçmezsen sağlıklı oyunculardan en iyi 5 otomatik oynar. Taktik ve ilk 5 sonraki maçlarda da geçerli kalır.</p>`);
}

/* ── FAZ B: Playbook seçici (taktik modalı içinde) ─────────────────────────────────────
   Seçim anında `_pbPick`e yazılır, "Taktiği kaydet" ile G.tactics'e işlenir. Modal yeniden
   çizilmez — yalnız seçili kartın çerçevesi ve özet satırı güncellenir (girdi kaybı olmasın). */
let _pbPick={off:'dengeli',def:'adam'};
function _pbCourt(){
  try{ const lu=matchLineup(); return lu?[lu.pg,lu.sg,lu.sf,lu.pf,lu.c].filter(Boolean):[]; }catch(e){ return []; }
}
function playbookPickerHtml(tac){
  tac=tac||{};
  _pbPick={off:tac.playbook||'dengeli',def:tac.defSet||tac.defensiveStyle||'adam'};
  const court=_pbCourt();
  const offCards=PLAYBOOKS.map(pb=>playbookCardHtml(pb,_pbPick.off,court,'off')).join('');
  const defCards=DEF_SETS.map(d=>playbookCardHtml(d,_pbPick.def,court,'def')).join('');
  return `<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);">
    <div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">📋 Hücum seti (Playbook)</div>
    <p style="font-size:10px;color:var(--text2);margin:0 0 8px;">Her set motorda gerçekten oynanır: şut seçimi, asist, top kaybı ve kimin yükleneceği değişir. <strong>Kadro uyumu</strong> düşükse set tutmaz.</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:10px;color:var(--text2);margin-bottom:7px;">
      <span><span style="display:inline-block;width:16px;border-top:2px dashed var(--gold);vertical-align:middle;"></span> pas</span>
      <span><span style="display:inline-block;width:16px;border-top:2px solid var(--green);vertical-align:middle;"></span> kesme/koşu</span>
      <span><span style="display:inline-block;width:16px;border-top:2px solid var(--blue);vertical-align:middle;"></span> top sürme</span>
      <span><span style="display:inline-block;width:16px;border-top:3px solid var(--red);vertical-align:middle;"></span> perde</span>
    </div>
    <div class="pb-grid" id="pbOffGrid">${offCards}</div>
    <div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:1px;margin:14px 0 6px;">🛡️ Savunma seti</div>
    <div class="pb-grid" id="pbDefGrid">${defCards}</div>
  </div>`;
}
function _pbMarkSelected(gridId,key){
  const grid=document.getElementById(gridId);
  if(!grid) return;
  const cards=Array.from(grid.querySelectorAll('.pb-card'));
  cards.forEach(c=>c.classList.remove('sel'));
  const list=gridId==='pbOffGrid'?PLAYBOOKS:DEF_SETS;
  const ix=list.findIndex(x=>x.key===key);
  if(ix>=0&&cards[ix]) cards[ix].classList.add('sel');
}
function selectPlaybook(key){
  _pbPick.off=key;
  _pbMarkSelected('pbOffGrid',key);
  const pb=playbookOf(key);
  showNotif(`📋 Hücum seti: ${pb.ikon} ${pb.ad}`);
}
function selectDefSet(key){
  _pbPick.def=key;
  _pbMarkSelected('pbDefGrid',key);
  const d=defSetOf(key);
  showNotif(`🛡️ Savunma seti: ${d.ikon} ${d.ad}`);
}

function saveMatchTactics(){
  const tempo=document.querySelector('input[name="tacTempo"]:checked');
  const odak=document.querySelector('input[name="tacOdak"]:checked');
  const def=document.querySelector('input[name="tacDef"]:checked');
  const focusEl=document.getElementById('tacFocus');
  const markEl=document.getElementById('tacMark');
  G.tactics={
    tempo:tempo?tempo.value:'normal',
    odak:odak?odak.value:'dengeli',
    defensiveStyle:def?def.value:'adam',
    focusPlayerId:(focusEl&&focusEl.value)||null,
    markStar:!!(markEl&&markEl.checked),
    playbook:_pbPick.off,   /* FAZ B: seçili hücum seti */
    defSet:_pbPick.def      /* FAZ B: seçili savunma seti */
  };
  scheduleGameSave();
  closeAppModal();
  const adT={yavas:'Yavaş',normal:'Normal',hizli:'Hızlı'}[G.tactics.tempo]||'Normal';
  const adO={ic:'İçeri',dengeli:'Dengeli',dis:'Dış şut',hizli:'Hızlı hücum',set:'Set oyun'}[G.tactics.odak]||'Dengeli';
  const adD={adam:'Adam adama',bolge:'Bölge',pres:'Pres'}[G.tactics.defensiveStyle]||'Adam adama';
  const fp=G.tactics.focusPlayerId?(G.players||[]).find(p=>p.id===G.tactics.focusPlayerId):null;
  const extra=(fp?` · 🎯 ${fp.isim}`:'')+(G.tactics.markStar?' · yıldız eşleştirme':'');
  showNotif(`🎯 Taktik: ${adT} · ${adO} · ${adD} savunma${extra}`);
}

function clearPrepareMatch(){
  G.prepareMatchIx=null;
  scheduleGameSave();
  renderRoster();
}

/* ── İlk 5 / rotasyon seçimi (Madde 1) ──────────────────────────────────────
   Kullanıcı ilk 5'ini ve yedek sırasını seçer; G.lineup'a yazılır. Seçim yoksa
   matchLineup() otomatik (en iyi 5) fallback'e döner. Yedek sırası; sakatlık,
   faul limiti ve canlı müdahaledeki oyuncu değişikliklerinde öncelik belirler. */
let _lineupEdit=null;
/* Saha üzerindeki 5 pozisyon yuvası — yarı saha (pota üstte), oyuncular yerleştirilebilir. */
const LINEUP_SLOTS=[
  {poz:'PG',x:50,y:82,label:'Oyun Kurucu'},
  {poz:'SG',x:24,y:64,label:'Şut Guardı'},
  {poz:'SF',x:76,y:64,label:'Küçük Forvet'},
  {poz:'PF',x:32,y:38,label:'Güç Forveti'},
  {poz:'C', x:68,y:38,label:'Pivot'}
];
/* F7-5: taktik modalından İlk 5 düzenleyicisine geçerken kaydedilmemiş seçimler burada
   tutulur; geri dönüşte openMatchTactics bunları yeniden basar. */
let _tacDraft=null;
let _tacReturnIx=null;
function _captureTacticInputs(){
  try{
    const tempo=document.querySelector('input[name="tacTempo"]:checked');
    const odak=document.querySelector('input[name="tacOdak"]:checked');
    const def=document.querySelector('input[name="tacDef"]:checked');
    if(!tempo&&!odak&&!def) return false;      /* taktik formu açık değil */
    const focusEl=document.getElementById('tacFocus');
    const markEl=document.getElementById('tacMark');
    const cur=G.tactics||{};
    _tacDraft={
      tempo:tempo?tempo.value:(cur.tempo||'normal'),
      odak:odak?odak.value:(cur.odak||'dengeli'),
      defensiveStyle:def?def.value:(cur.defensiveStyle||'adam'),
      focusPlayerId:(focusEl&&focusEl.value)||null,
      markStar:!!(markEl&&markEl.checked),
      playbook:_pbPick.off,
      defSet:_pbPick.def
    };
    return true;
  }catch(e){ return false; }
}
function openLineupEditor(){
  try{
    if(!G.team){ showNotif('Önce takım oluştur.'); return; }
    /* Taktik formundan geliniyorsa seçimleri sakla ve dönüş adresini not et. */
    _tacReturnIx=_captureTacticInputs()?(G.prepareMatchIx!=null?G.prepareMatchIx:null):null;
    const healthy=(G.players||[]).filter(p=>!playerIsInjured(p));
    if(healthy.length<5){ showNotif('İlk 5 seçmek için en az 5 sağlıklı oyuncu gerekli.'); return; }
    const byOvr=healthy.slice().sort((a,b)=>(b.genel||0)-(a.genel||0));
    let starters=[],bench=[];
    const sel=(G.lineup&&Array.isArray(G.lineup.starters))?G.lineup.starters.filter(id=>healthy.some(p=>p.id===id)):[];
    starters=sel.slice(0,5);
    byOvr.forEach(p=>{ if(starters.length<5&&!starters.includes(p.id)) starters.push(p.id); });
    const savedBench=(G.lineup&&Array.isArray(G.lineup.bench))?G.lineup.bench:[];
    savedBench.forEach(id=>{ if(!starters.includes(id)&&healthy.some(p=>p.id===id)&&!bench.includes(id)) bench.push(id); });
    byOvr.forEach(p=>{ if(!starters.includes(p.id)&&!bench.includes(p.id)) bench.push(p.id); });
    const slots=[null,null,null,null,null];
    starters.forEach((id,i)=>{ if(i<5) slots[i]=id; });
    _lineupEdit={slots,bench};
    renderLineupEditor();
  }catch(e){ dbg('openLineupEditor',e); showNotif('İlk 5 ekranı açılamadı.'); }
}
function _lineupPlayerById(id){ return (G.players||[]).find(p=>p.id===id); }
/** 20. oturum: enerji + birikmiş yorgunluk rozetleri — salt görüntü katmanı, risk mantığına dokunmaz.
 *  compact=true dar alanlar için (saha yuvası); renk eşikleri lineupBenchCardHtml ile aynı. */
function enerjiRozetHtml(p,compact){
  const en=Math.round(Number(p.enerji==null?100:p.enerji));
  const enCol=en>=70?'var(--green)':en>=45?'var(--gold)':'var(--red)';
  const kron=Number(p.kronikYorgunlukSayisi)||0;
  const kronIk=kron>=2?`<span title="Art arda ${kron} maçtır yorgun oynadı — birikmiş sakatlık riski">${compact?'🥵':` 🥵×${kron}`}</span>`:'';
  const donIk=(Number(p.formReturnMatches)||0)>0?`<span title="Sakatlıktan yeni döndü — sakatlık riski yüksek">${compact?'🩹':' 🩹 Yeni döndü'}</span>`:'';
  return `<span style="color:${enCol};" title="Enerji ${en}/100 — düşük enerjiyle oynamak sakatlık riskini artırır">⚡${en}%</span>${kronIk}${donIk}`;
}
/** Yarı saha SVG'si (pota üstte) — yuvaların arkasına çizilir. */
function lineupCourtSvg(){
  return `<svg viewBox="0 0 100 120" preserveAspectRatio="none">
    <g fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="0.8">
      <rect x="3" y="3" width="94" height="114"/>
      <rect x="35" y="3" width="30" height="34"/>
      <circle cx="50" cy="37" r="9"/>
      <path d="M 8 3 Q 8 66 50 66 Q 92 66 92 3" />
      <line x1="45" y1="8" x2="55" y2="8" stroke="#fbbf24" stroke-width="1.2"/>
      <circle cx="50" cy="12" r="3.2" stroke="#fbbf24" stroke-width="1.1"/>
      <path d="M 3 117 A 47 47 0 0 0 97 117" />
    </g>
  </svg>`;
}
function lineupSlotHtml(i){
  const s=LINEUP_SLOTS[i];
  const id=_lineupEdit.slots[i];
  const pos=`left:${s.x}%;top:${s.y}%;`;
  if(!id){
    return `<div class="lu-slot empty" data-luslot="${i}" style="${pos}" onclick="lineupSlotTap(${i})">
      <span class="lu-slot-poz">${s.poz}</span><span class="lu-slot-hint">boş</span></div>`;
  }
  const p=_lineupPlayerById(id);
  if(!p){ _lineupEdit.slots[i]=null; return lineupSlotHtml(i); }
  const av=playerAvatar(p.seed,p.id,{});
  /* Paket 3: uyum rozeti — doğal poz sessiz, ikincil poz mavi "2", yabancı poz sarı "!" (performans düşer). */
  const fit=(p.poz===s.poz)?'':(p.ikincilPoz===s.poz
    ?'<span style="position:absolute;top:-6px;right:-6px;background:var(--blue);color:#fff;font-size:9px;font-weight:800;border-radius:50%;width:15px;height:15px;display:flex;align-items:center;justify-content:center;" title="İkincil pozisyon (-%4)">2</span>'
    :'<span style="position:absolute;top:-6px;right:-6px;background:var(--gold);color:#111;font-size:9px;font-weight:800;border-radius:50%;width:15px;height:15px;display:flex;align-items:center;justify-content:center;" title="Yabancı pozisyon (-%10)">!</span>');
  return `<div class="lu-slot filled" data-luslot="${i}" style="${pos}" onpointerdown="lineupPointerDown(event,'${id}','slot',${i})" onclick="lineupSlotTap(${i})" title="${escMatch(p.isim)} — sürükle ya da tıkla (yedeğe al)">
    ${fit}<span class="lu-slot-badge">${s.poz}</span>
    <img class="lu-av" src="${av}" ${playerAvatarImgAttrs(p.seed,p.id,{})} alt="">
    <span class="lu-nm">${escMatch(p.isim)}</span>
    <span class="lu-sub">OVR ${p.genel}</span>
    <span class="lu-sub">${enerjiRozetHtml(p,true)}</span>
  </div>`;
}
function lineupBenchCardHtml(id){
  const p=_lineupPlayerById(id); if(!p) return '';
  const av=playerAvatar(p.seed,p.id,{});
  /* F7-10: sürükleme yalnız tutamaktan başlar; kartın kalanı dikey kaydırmaya açık
     (eskiden .lu-card touch-action:none olduğu için mobilde yedek listesi kaydırılamıyordu). */
  return `<div class="lu-card" data-lucard="${id}" onclick="lineupBenchTap('${id}')" title="Tutamaktan sürükle ya da tıkla">
    <span class="lu-grip" onpointerdown="lineupPointerDown(event,'${id}','bench',-1)" aria-hidden="true">⠿</span>
    <img class="lu-av" src="${av}" ${playerAvatarImgAttrs(p.seed,p.id,{})} alt="">
    <span class="lu-info"><b>${escMatch(p.isim)}</b><small>${p.poz} · OVR ${p.genel} · ${enerjiRozetHtml(p,true)}</small></span>
  </div>`;
}
function renderLineupEditor(){
  if(!_lineupEdit) return;
  const filled=_lineupEdit.slots.filter(Boolean).length;
  const full=filled>=5;
  const slotsHtml=LINEUP_SLOTS.map((s,i)=>lineupSlotHtml(i)).join('');
  const benchHtml=_lineupEdit.bench.length
    ? _lineupEdit.bench.map(id=>lineupBenchCardHtml(id)).join('')
    : '<p style="font-size:11px;color:var(--text2);padding:6px;">Tüm oyuncular sahada.</p>';
  showAppModal(`<div class="modal-title">🏀 İlk 5 — Sahaya Diz</div>
    <p class="lu-hint">Oyuncuları <strong>tutup sahadaki yuvalara sürükle</strong> (mobilde de çalışır). Yuvaya tıklayınca oyuncu yedeğe döner; yedek karta tıklayınca ilk boş yuvaya girer. Yuvalar arasında da sürükleyerek yer değiştirebilirsin. Seçmezsen en iyi 5 otomatik oynar.</p>
    <div class="lu-wrap">
      <div class="lu-court" id="luCourt">
        ${lineupCourtSvg()}
        ${slotsHtml}
      </div>
      <div>
        <div class="lu-bench-wrap" id="luBench" data-lubench="1">
          <div class="lu-bench-title">Yedekler (${_lineupEdit.bench.length}) · İlk 5: ${filled}/5</div>
          <div class="lu-bench">${benchHtml}</div>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px;">
      <button type="button" class="btn-p" style="flex:1;padding:10px;${full?'':'opacity:.5;'}" ${full?'':'disabled'} onclick="saveLineup()">Kaydet</button>
      <button type="button" class="btn-sm" style="flex:1;" onclick="resetLineup()">Otomatik (en iyi 5)</button>
    </div>`,{xl:true});
}
/* ── Model yardımcıları (yuva ↔ yedek) ── */
function _luRemoveFromBench(id){ const i=_lineupEdit.bench.indexOf(id); if(i>=0) _lineupEdit.bench.splice(i,1); }
function _luSlotOf(id){ return _lineupEdit.slots.indexOf(id); }
/** id oyuncusunu slot i'ye yerleştirir; oradaki oyuncuyu (varsa) uygun yere taşır (takas/yedek). */
function lineupPlaceInSlot(id,i){
  if(!_lineupEdit||i<0||i>4) return;
  const from=_luSlotOf(id);           // -1 => yedekten geliyor
  const occ=_lineupEdit.slots[i];
  if(occ===id) return;
  if(from>=0){                        // yuvadan yuvaya: takas
    _lineupEdit.slots[from]=occ;      // occ null olabilir → eski yuva boşalır
  } else {                            // yedekten: yeri yedekten al, eski sakini yedeğe koy
    _luRemoveFromBench(id);
    if(occ) _lineupEdit.bench.unshift(occ);
  }
  _lineupEdit.slots[i]=id;
  renderLineupEditor();
}
function lineupMoveToBench(id){
  if(!_lineupEdit) return;
  const s=_luSlotOf(id);
  if(s>=0) _lineupEdit.slots[s]=null;
  _luRemoveFromBench(id);
  _lineupEdit.bench.unshift(id);
  renderLineupEditor();
}
/* ── Tıklama (drag olmadan) ── */
function lineupBenchTap(id){
  if(!_lineupEdit||_luDragMoved) return;
  const empty=_lineupEdit.slots.indexOf(null);
  if(empty<0){ showNotif('İlk 5 dolu — bir yuvaya tıklayıp oyuncuyu yedeğe al, sonra dene.'); return; }
  lineupPlaceInSlot(id,empty);
}
function lineupSlotTap(i){
  if(!_lineupEdit||_luDragMoved) return;
  const id=_lineupEdit.slots[i];
  if(id) lineupMoveToBench(id);
}
/* ── Pointer tabanlı sürükle-bırak (fare + dokunma) ── */
let _luDrag=null, _luDragMoved=false;
function lineupPointerDown(ev,id,from,slotIx){
  if(ev.button!=null&&ev.button!==0) return;
  ev.preventDefault();
  const p=_lineupPlayerById(id); if(!p) return;
  _luDragMoved=false;
  const srcEl=(from==='slot')
    ? document.querySelector('[data-luslot="'+slotIx+'"]')
    : document.querySelector('[data-lucard="'+CSS.escape(id)+'"]');
  const ghost=document.createElement('div');
  ghost.className='lu-ghost';
  ghost.innerHTML=`<img src="${playerAvatar(p.seed,p.id,{})}" alt=""><b>${escMatch(p.isim)}</b>`;
  document.body.appendChild(ghost);
  _luDrag={id,from,slotIx,ghost,srcEl,startX:ev.clientX,startY:ev.clientY};
  _luPositionGhost(ev.clientX,ev.clientY);
  document.addEventListener('pointermove',lineupPointerMove);
  document.addEventListener('pointerup',lineupPointerUp);
  try{ if(ev.target&&ev.target.setPointerCapture) ev.target.setPointerCapture(ev.pointerId); }catch(e){}
}
function _luPositionGhost(x,y){ if(_luDrag&&_luDrag.ghost){ _luDrag.ghost.style.left=x+'px'; _luDrag.ghost.style.top=y+'px'; } }
function _luClearHot(){ document.querySelectorAll('.drop-hot').forEach(e=>e.classList.remove('drop-hot')); }
function lineupPointerMove(ev){
  if(!_luDrag) return;
  const dx=ev.clientX-_luDrag.startX, dy=ev.clientY-_luDrag.startY;
  if(!_luDragMoved&&Math.hypot(dx,dy)>5){ _luDragMoved=true; if(_luDrag.srcEl) _luDrag.srcEl.classList.add('dragging'); }
  if(!_luDragMoved) return;
  _luPositionGhost(ev.clientX,ev.clientY);
  _luClearHot();
  const t=_luTargetAt(ev.clientX,ev.clientY);
  if(t) t.classList.add('drop-hot');
}
function _luTargetAt(x,y){
  if(_luDrag&&_luDrag.ghost) _luDrag.ghost.style.display='none';
  const el=document.elementFromPoint(x,y);
  if(_luDrag&&_luDrag.ghost) _luDrag.ghost.style.display='';
  if(!el) return null;
  return el.closest('[data-luslot]')||el.closest('[data-lubench]');
}
function lineupPointerUp(ev){
  document.removeEventListener('pointermove',lineupPointerMove);
  document.removeEventListener('pointerup',lineupPointerUp);
  if(!_luDrag) return;
  const d=_luDrag; _luDrag=null;
  if(d.ghost) d.ghost.remove();
  _luClearHot();
  if(!_luDragMoved){ return; } // salt tıklama → onclick devralır
  const t=_luTargetAt(ev.clientX,ev.clientY);
  if(t){
    if(t.hasAttribute('data-luslot')) lineupPlaceInSlot(d.id,Number(t.getAttribute('data-luslot')));
    else lineupMoveToBench(d.id);
  } else {
    renderLineupEditor(); // dragging sınıfını temizle
  }
  // tıklama olayının drag sonrası tetiklenmemesi için bayrağı bir tik sonra sıfırla
  setTimeout(()=>{ _luDragMoved=false; },0);
}
function saveLineup(force){
  if(!_lineupEdit) return;
  const starters=_lineupEdit.slots.filter(Boolean);
  if(starters.length<5){ showNotif('İlk 5 tam olmalı — 5 yuvayı da doldur.'); return; }
  /* 20. oturum: proaktif risk uyarısı — düşük enerji (<45) veya art arda 3+ yorgun maç varsa kaydetmeden önce onay iste. */
  if(!force){
    const riskli=starters.map(id=>_lineupPlayerById(id))
      .filter(p=>p&&(Math.round(Number(p.enerji==null?100:p.enerji))<45||(Number(p.kronikYorgunlukSayisi)||0)>=3));
    if(riskli.length){
      const list=riskli.map(p=>`<li style="margin:4px 0;font-size:12px;"><strong>${escMatch(p.isim)}</strong> — ${enerjiRozetHtml(p)}</li>`).join('');
      showAppModal(`<div class="modal-title">⚠️ Riskli İlk 5</div>
        <p style="font-size:13px;color:var(--text2);line-height:1.6;">Bu oyuncular yüksek sakatlık riskiyle sahaya çıkacak:</p>
        <ul style="list-style:none;padding:0;margin:10px 0;">${list}</ul>
        <p style="font-size:11px;color:var(--text2);line-height:1.5;">Düşük enerjiyle — özellikle art arda — oynayan oyuncularda sakatlanma ihtimali belirgin şekilde artar. Yine de sahaya sürmek istiyor musun?</p>
        <div style="display:flex;gap:8px;margin-top:14px;">
          <button type="button" class="btn-sm" style="flex:1;" onclick="renderLineupEditor()">↩ Geri dön</button>
          <button type="button" class="btn-p" style="flex:1;padding:10px;" onclick="saveLineup(true)">Yine de kaydet</button>
        </div>`);
      return;
    }
  }
  G.lineup={starters:starters.slice(),bench:_lineupEdit.bench.slice()};
  scheduleGameSave();
  closeAppModal();
  showNotif('🏀 İlk 5 kaydedildi.');
  _returnToTacticsIfNeeded();
}
function resetLineup(){
  G.lineup=null;
  _lineupEdit=null;
  scheduleGameSave();
  closeAppModal();
  showNotif('Rotasyon otomatiğe alındı (en iyi 5).');
  _returnToTacticsIfNeeded();
}
/* F7-5: İlk 5 işlemi bitince taktik formuna geri dön — kaydedilmemiş seçimler korunur. */
function _returnToTacticsIfNeeded(){
  if(_tacReturnIx==null) return;
  const ix=_tacReturnIx; _tacReturnIx=null;
  setTimeout(()=>{ try{ openMatchTactics(ix); }catch(e){} },60);
}

function gotoMacPage(){
  const el=document.querySelector('#sbNav button[data-page="mac"]');
  showPage('mac',el||null);
}

function findNextUserSeasonMatch(){
  if(!G.season||!G.season.matches||!G.season.active||!G.team) return null;
  const u=G.team.isim;
  const list=G.season.matches.filter(m=>!m.played&&(m.home===u||m.away===u))
    .sort((a,b)=>a.day-b.day||a.round-b.round||a.seasonMatchIx-b.seasonMatchIx);
  return list[0]||null;
}

function syncUserRecordFromStandings(){
  if(!G.season||!G.team) return;
  const row=G.season.standings[G.team.isim];
  if(!row) return;
  G.wins=row.g;
  G.losses=row.m;
  G.points=standingPuan(row);
}

