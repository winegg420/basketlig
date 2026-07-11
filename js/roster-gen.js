const STAT_KEYS=['hucum','savunma','ribaund','topCalma','pas','hiz','kondisyon','dayaniklilik','sutIsabeti','serbest','topSurme','blok','zeka','liderlik'];
const STAT_LABELS={hucum:'Hücum',savunma:'Savunma',ribaund:'Ribaund',topCalma:'Top Çalma',pas:'Pas',hiz:'Hız',kondisyon:'Kondisyon',dayaniklilik:'Dayanıklılık',sutIsabeti:'Şut İsabeti',serbest:'Serbest Atış',topSurme:'Top Sürme',blok:'Blok',zeka:'Zekâ',liderlik:'Liderlik'};
/** bk = haftalık bakım (KR, ham); m = yükseltme bedeli. Bilet geliri artışı yükseltmeyi ~yarım sezonda amorti eder. */
const ARENA_LVL=[{s:1,isim:'Küçük Arena',kap:5000,m:0,bk:150},{s:2,isim:'Orta Arena',kap:10000,m:ecoRound(820),bk:300},{s:3,isim:'Büyük Arena',kap:15000,m:ecoRound(1650),bk:500},{s:4,isim:'Dev Arena',kap:20000,m:ecoRound(3200),bk:800},{s:5,isim:'Mega Arena',kap:30000,m:ecoRound(6200),bk:1200}];
/** stat: haftalık koç bonusunun işlediği özellik (null = altyapı çarpanı). Maaşlar ham KR/hafta. */
const KOC_T=[{isim:'Hücum Koçu',ikon:'⚔️',uzm:'Hücum',stat:'hucum',bonus:'Haftada zayıf oyunculara +1 Hücum',maas:120},{isim:'Savunma Koçu',ikon:'🛡️',uzm:'Savunma',stat:'savunma',bonus:'Haftada zayıf oyunculara +1 Savunma',maas:120},{isim:'Kondisyon Koçu',ikon:'🏃',uzm:'Kondisyon',stat:'kondisyon',bonus:'Haftada zayıf oyunculara +1 Kondisyon',maas:90},{isim:'Şut Koçu',ikon:'🎯',uzm:'Şut İsabeti',stat:'sutIsabeti',bonus:'Haftada zayıf oyunculara +1 Şut',maas:135},{isim:'Altyapı Koçu',ikon:'🌱',uzm:'Altyapı',stat:null,bonus:'Altyapı +%5 gelişim',maas:150}];
const ANTRENMAN_T=[{isim:'Hücum Antrenmanı',ikon:'⚔️',etki:'hucum',gun:5,maliyet:0},{isim:'Savunma Antrenmanı',ikon:'🛡️',etki:'savunma',gun:5,maliyet:0},{isim:'Kondisyon Koşusu',ikon:'🏃',etki:'kondisyon',gun:4,maliyet:0},{isim:'Çift Antrenman',ikon:'💪',etki:'all',gun:6,maliyet:ecoRound(42)}];
const MAX_COACHES=5; /* Madde 29: teknik ekip üst sınırı (5 uzmanlık, her birinden en fazla 1) */
/* ── Sakatlık kataloğu (Madde 5) — gerçek spor sakatlıkları; sabit iyileşme gün aralığı + şiddet.
   siddet: 'Hafif' | 'Orta' | 'Ağır'. w = seçilme ağırlığı (hafif sakatlıklar daha sık). */
const INJURIES=[
  {ad:'Ayak bileği burkulması (hafif)',bolge:'Ayak bileği',siddet:'Hafif',minD:2,maxD:6,w:10},
  {ad:'Baldır kası krampı',bolge:'Baldır',siddet:'Hafif',minD:2,maxD:5,w:9},
  {ad:'Parmak ezilmesi',bolge:'El',siddet:'Hafif',minD:2,maxD:6,w:8},
  {ad:'Sırt spazmı',bolge:'Sırt',siddet:'Hafif',minD:3,maxD:7,w:8},
  {ad:'Uyluk kası zorlanması (hafif)',bolge:'Uyluk',siddet:'Hafif',minD:3,maxD:8,w:8},
  {ad:'Boyun tutulması',bolge:'Boyun',siddet:'Hafif',minD:2,maxD:6,w:6},
  {ad:'Diz sıyrığı / darbesi',bolge:'Diz',siddet:'Hafif',minD:3,maxD:7,w:6},
  {ad:'Hafif beyin sarsıntısı',bolge:'Baş',siddet:'Hafif',minD:4,maxD:8,w:5},
  {ad:'Hamstring zorlanması',bolge:'Arka bacak',siddet:'Orta',minD:9,maxD:18,w:8},
  {ad:'Kasık zorlanması',bolge:'Kasık',siddet:'Orta',minD:9,maxD:17,w:7},
  {ad:'Omuz zorlanması',bolge:'Omuz',siddet:'Orta',minD:10,maxD:20,w:6},
  {ad:'Ayak bileği burkulması (orta)',bolge:'Ayak bileği',siddet:'Orta',minD:10,maxD:19,w:7},
  {ad:'El bileği burkulması',bolge:'El bileği',siddet:'Orta',minD:9,maxD:18,w:6},
  {ad:'Baldır kası yırtığı (kısmi)',bolge:'Baldır',siddet:'Orta',minD:12,maxD:22,w:5},
  {ad:'Ayak parmağı çıkığı',bolge:'Ayak',siddet:'Orta',minD:8,maxD:16,w:5},
  {ad:'Diz bağı zorlanması',bolge:'Diz',siddet:'Orta',minD:12,maxD:22,w:5},
  {ad:'Bel fıtığı alevlenmesi',bolge:'Bel',siddet:'Orta',minD:11,maxD:21,w:4},
  {ad:'Ön çapraz bağ (ACL) yırtığı',bolge:'Diz',siddet:'Ağır',minD:34,maxD:52,w:2},
  {ad:'Menisküs yırtığı',bolge:'Diz',siddet:'Ağır',minD:26,maxD:44,w:3},
  {ad:'Aşil tendon kopması',bolge:'Aşil',siddet:'Ağır',minD:32,maxD:50,w:2},
  {ad:'Omuz çıkığı',bolge:'Omuz',siddet:'Ağır',minD:24,maxD:40,w:3},
  {ad:'Parmak kırığı',bolge:'El',siddet:'Ağır',minD:22,maxD:36,w:3},
  {ad:'El bileği kırığı',bolge:'El bileği',siddet:'Ağır',minD:26,maxD:42,w:3},
  {ad:'Ayak bileği kırığı',bolge:'Ayak bileği',siddet:'Ağır',minD:28,maxD:46,w:2},
  {ad:'Stres kırığı (metatars)',bolge:'Ayak',siddet:'Ağır',minD:24,maxD:40,w:3}
];

let G={
  coins:START_KR,wins:0,losses:0,points:0,chemistry:75,winStreak:0,
  team:null,players:[],youth:[],marketPlayers:[],
  clubTransferPlayers:[],marketTab:'free',clubTransferFilter:'all',
  coaches:[],coachMarket:[],ligTeams:[],
  arena:{s:1,kap:5000,bk:ecoRound(45),isim:'Başlangıç Arena'},
  youthFacility:{s:1},
  selectedColor:'#f97316',
  activeTrainings:[],
  gameDay:1,
  managerName:'Menajer',
  managerRep:0,
  managerHistory:[],
  joinedAt:null,
  lastActive:null,
  marketPozFilter:'all',
  marketSort:'ovr',
  marketSortDesc:{ovr:true,maas:true},
  kadroFilter:'all',
  kadroView:'cards',
  youthView:'list',
  prepareMatchIx:null,
  seasonFixtures:[],
  season:null,
  playoff:null,
  settings:{sound:true,autosaveSec:12},
  achievements:{},
  ledger:[],
  lastEcoDay:1,
  bankruptWeeks:0,
  tactics:{tempo:'normal',odak:'dengeli'},
  lineup:null,
  ticketPrice:2,
  tutorialDone:false
};

const MARKET_TARGET=40;

function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function ch(arr){return arr[Math.floor(Math.random()*arr.length)];}
function fmtn(n){return n.toLocaleString('tr-TR');}
/** Takım adı birçok yerde HTML içine gömülüyor — kaynağında işaretleme karakterlerini temizle. */
function sanitizeTeamName(s){return String(s||'').replace(/[<>&"'`]/g,'').trim().slice(0,40);}
function sv(v){return v>=75?'sv-h':v>=55?'sv-m':'sv-l';}

// ===== OYUNCU OLUŞTUR =====
/* Faz 4.2: Oyuncu kişilikleri — transfer kabul eğilimi + sözleşme davranışını etkiler.
   para = teklif/para duyarlılığı, sadakat = ayrılmaya direnç (yüksek = zor ayrılır). */
const KISILIKLER={
  sadik:    {ad:'Sadık',          ikon:'🛡️', desc:'Kulübüne bağlı — ayrılmaya isteksiz, düşük teklifi kolay kabul etmez.', para:0.7, sadakat:1.5},
  hirsli:   {ad:'Hırslı',         ikon:'🔥', desc:'Başarı ve büyük hedef ister — iyi fırsata atlar.',                       para:1.1, sadakat:0.6},
  parasever:{ad:'Parasever',      ikon:'💰', desc:'Parayı önemser — en yüksek teklife gitmeye meyilli.',                   para:1.6, sadakat:0.5},
  sehir:    {ad:'Şehir bağımlısı',ikon:'🏙️', desc:'Şehrine/kulübüne bağlı — taşınmaya çok isteksiz.',                      para:0.6, sadakat:1.6},
  kararsiz: {ad:'Kararsız',       ikon:'🎲', desc:'Öngörülemez — kararları ruh haline göre değişebilir.',                  para:1.0, sadakat:1.0}
};
const KISILIK_KEYS=Object.keys(KISILIKLER);
function kisilikInfo(k){ return KISILIKLER[k]||KISILIKLER.kararsiz; }
function ensurePersonality(p){ if(p&&!p.kisilik) p.kisilik=ch(KISILIK_KEYS); return p; }

/* Faz 5.1: Bölgesel izci ağı — her izci bir bölgeye odaklı; kalite keşif hızını/isabetini belirler. */
const SCOUT_REGIONS=['Yerli (Türkiye)','Avrupa','Amerika','Global Genç Yetenek'];
function genScout(tag){
  const kalite=rand(1,5);
  const maas=Math.round(40+kalite*22+kalite*kalite*2);
  return {id:'sc'+String(tag)+Math.random().toString(36).slice(2,7),ad:`${ch(ILK)} ${ch(SY)}`,bolge:ch(SCOUT_REGIONS),kalite,maas,atama:'market'};
}
function genScoutMarket(){
  return Array.from({length:5}).map((_,i)=>{ const s=genScout('m'+i); s.satisFiyat=Math.round(300+s.kalite*s.kalite*120+s.maas*2); return s; });
}

/* Faz 6: Draft adayı — genç (18-20), düşük mevcut OVR ama yüksek gizli potansiyel (scouting'e bağlı). */
function genDraftProspect(i){
  const p=genPlayer(ch(POZLAR),false);
  p.yas=rand(18,20);
  p.id='dr'+String(i)+Math.random().toString(36).slice(2,7);
  p.seed='draft_'+String(i)+Math.random().toString(36).slice(2,7);
  const drop=rand(6,14);
  STAT_KEYS.forEach(k=>{ p[k]=Math.max(30,(Number(p[k])||50)-drop); });
  p.genel=Math.round(STAT_KEYS.reduce((s,k)=>s+p[k],0)/STAT_KEYS.length);
  p.potansiyel=Math.min(99,p.genel+rand(12,26));
  p.maas=salaryKRFromGenel(p.genel);
  p.hiddenPot=true; delete p.scouted; /* draft ipuçları scouting'e bağlı */
  p.enerji=100;
  return p;
}
function genPlayer(poz=null,tr=false){
  const ulke=tr?TR_ULKE:ch(ULKELER);
  const p=poz||ch(POZLAR);
  const yas=rand(18,36);
  const isim=tr?`${ch(TR_ILK)} ${ch(TR_SY)}`:`${ch(ILK)} ${ch(SY)}`;
  const base={PG:[55,80],SG:[60,85],SF:[58,82],PF:[58,82],C:[55,80]};
  const stats={};
  STAT_KEYS.forEach(k=>{
    let v=rand(base[p][0],base[p][1]);
    if(p==='PG'&&(k==='pas'||k==='topSurme'||k==='hiz'))v=rand(65,90);
    if(p==='SG'&&(k==='sutIsabeti'||k==='hucum'))v=rand(68,92);
    if(p==='C'&&(k==='ribaund'||k==='blok'||k==='dayaniklilik'))v=rand(68,92);
    if(p==='PF'&&(k==='ribaund'||k==='savunma'))v=rand(65,88);
    stats[k]=Math.min(99,v);
  });
  const genel=Math.round(STAT_KEYS.reduce((s,k)=>s+stats[k],0)/STAT_KEYS.length);
  const maas=salaryKRFromGenel(genel);
  const mood=rand(60,90);
  const id=Math.random().toString(36).substr(2,11);
  const seed='pl'+id+hash32(isim+yas);
  return {id,isim,poz:p,yas,ulke:ulke.ad,bayrak:ulke.b,boy:rand(185,220),kilo:rand(80,120),seed,maas,...stats,genel,mood,enerji:100,potansiyel:rand(genel,Math.min(99,genel+20)),formDay:0,kontratSezon:rand(1,3),kisilik:ch(KISILIK_KEYS),sezon:{mac:0,pts:0,ast:0,reb:0}};
}

/** Aynı grupta (kadro / market listesi) iki oyuncu aynı ADA ya da aynı FOTOĞRAF index'ine denk gelmesin.
 *  Ad çakışınca yeni ad; foto çakışınca seed değiştirilerek farklı portreye kaydırılır. */
function ensureUniquePlayerNames(players){
  const takenNames=new Set();
  const takenPhotos=new Set();
  (players||[]).forEach(p=>{
    if(!p) return;
    let g=0;
    while(takenNames.has(p.isim)&&g++<400){ p.isim=`${ch(ILK)} ${ch(SY)}`; }
    takenNames.add(p.isim);
    /* Foto index seed+id'den türer; grup içinde benzersiz kalması için seed'i kaydır. */
    try{
      let idx=portraitPoolIndex(p.seed,p.id), g2=0;
      while(takenPhotos.has(idx)&&g2<PORTRAIT_POOL_SIZE&&g2++<PORTRAIT_POOL_SIZE){
        p.seed=String(p.seed||'')+'~'+g2;
        idx=portraitPoolIndex(p.seed,p.id);
      }
      takenPhotos.add(idx);
    }catch(e){}
  });
  return players;
}

function genPlayerBounded(poz,minG,maxG){
  let p=genPlayer(poz,false);
  let guard=0;
  while(guard++<90 && (p.genel<minG||p.genel>maxG)){
    p=genPlayer(poz,false);
  }
  if(p.genel<minG||p.genel>maxG){
    const tgt=rand(minG,maxG);
    STAT_KEYS.forEach(k=>{
      p[k]=Math.min(99,Math.max(38,Math.round(tgt+rand(-11,11)+((p[k]-p.genel)*0.4))));
    });
    p.genel=Math.round(STAT_KEYS.reduce((s,k)=>s+p[k],0)/STAT_KEYS.length);
    let fix=0;
    while(p.genel<minG&&fix++<60){ const k=ch(STAT_KEYS); p[k]=Math.min(99,p[k]+1); p.genel=Math.round(STAT_KEYS.reduce((s,x)=>s+p[x],0)/STAT_KEYS.length); }
    fix=0;
    while(p.genel>maxG&&fix++<60){ const k=ch(STAT_KEYS); p[k]=Math.max(25,p[k]-1); p.genel=Math.round(STAT_KEYS.reduce((s,x)=>s+p[x],0)/STAT_KEYS.length); }
  }
  p.maas=salaryKRFromGenel(p.genel);
  return p;
}

function genRoster(){
  const dist=['PG','PG','SG','SG','SG','SF','SF','SF','PF','PF','PF','C','C','C','C'];
  const players=dist.map(pos=>genPlayer(pos,false));
  const target=rand(70,73);
  let it=0;
  while(it++<200){
    const avg=players.reduce((s,p)=>s+p.genel,0)/players.length;
    if(avg>=70&&avg<=73) break;
    const idx=rand(0,14);
    const k=ch(STAT_KEYS);
    const step=avg<target?rand(1,4):-rand(1,4);
    players[idx][k]=Math.min(99,Math.max(38,players[idx][k]+step));
    players[idx].genel=Math.round(STAT_KEYS.reduce((s,stt)=>s+players[idx][stt],0)/STAT_KEYS.length);
    players[idx].maas=salaryKRFromGenel(players[idx].genel);
    players[idx].potansiyel=Math.max(players[idx].genel,players[idx].potansiyel||0);
  }
  return ensureUniquePlayerNames(players);
}

/** Tek bir altyapı genci üretir. potBoost: altyapı tesisi seviyesine göre potansiyel primi (Madde 35). */
function genSingleYouth(potBoost){
  potBoost=Number(potBoost)||0;
  const roll=Math.random();
  let minO,maxO,pLo,pHi,yLo,yHi,prospect=false;
  if(roll<0.09){
    minO=46; maxO=56; pLo=86; pHi=97; yLo=15; yHi=17; prospect=true;
  } else if(roll<0.22){
    minO=50; maxO=60; pLo=82; pHi=93; yLo=15; yHi=18; prospect=true;
  } else if(roll<0.48){
    minO=54; maxO=64; pLo=76; pHi=89; yLo=16; yHi=19; prospect=roll<0.32;
  } else {
    minO=56; maxO=72; pLo=71; pHi=84; yLo=17; yHi=20; prospect=false;
  }
  const p=genPlayerBounded(ch(POZLAR),minO,maxO);
  p.yas=rand(yLo,yHi);
  let pot=rand(pLo,pHi)+potBoost;
  pot=Math.max(pot,p.genel+11,Math.min(99,p.genel+rand(12,28)));
  pot=Math.min(99,pot);
  p.potansiyel=pot;
  p.maas=Math.max(60,Math.round(salaryKRFromGenel(p.genel)*0.25));
  p.mood=rand(55,92);
  p.seed='yt'+p.id+hash32(p.isim+p.yas+p.potansiyel);
  p.academyProspect=!!prospect;
  p.hiddenPot=Math.random()<0.70; /* Madde 7: gençlerin çoğunun potansiyeli gizli (keşif gerekir) */
  return p;
}
function youthFacilityLevel(){ return Math.max(1,Math.min(4,(G.youthFacility&&Number(G.youthFacility.s))||1)); }
function youthTarget(){ return [0,15,18,22,26][youthFacilityLevel()]||15; }
function youthPotBoost(){ return [0,0,3,6,10][youthFacilityLevel()]||0; }
function genYouth(){
  return ensureUniquePlayerNames(Array.from({length:youthTarget()},()=>genSingleYouth(youthPotBoost())));
}
/** Madde 28: altyapı havuzu tükenince yenilenir — hedefe (tesise bağlı) kadar yeni genç eklenir. */
function ensureYouthStock(){
  if(!Array.isArray(G.youth)) G.youth=[];
  const target=youthTarget();
  let guard=0;
  while(G.youth.length<target && guard++<40){
    G.youth.push(genSingleYouth(youthPotBoost()));
  }
  ensureUniquePlayerNames(G.youth);
}

function genSingleMarketPlayer(idx){
  const r=Math.random();
  let minG,maxG;
  if(r<0.14){ minG=60; maxG=64; }
  else if(r<0.32){ minG=64; maxG=69; }
  else if(r<0.52){ minG=69; maxG=74; }
  else if(r<0.68){ minG=74; maxG=80; }
  else if(r<0.80){ minG=80; maxG=85; }
  else if(r<0.91){ minG=85; maxG=90; }
  else if(r<0.97){ minG=90; maxG=94; }
  else { minG=92; maxG=97; }
  const p=genPlayerBounded(ch(POZLAR),minG,maxG);
  p.fiyat=transferFeeKR(p);
  p.sure=rand(1,72);
  p.teklifler=rand(0,22);
  p.marketIdx=idx;
  p.freeAgent=true;
  p.listedFromUser=false;
  p.seed='mkt'+idx+'_'+p.id+'_'+hash32(p.isim+p.poz+idx);
  p.hiddenPot=Math.random()<0.40; /* Madde 7: pazardaki bazı oyuncuların potansiyeli gizli */
  return p;
}

function genMarket(){
  return ensureUniquePlayerNames(Array.from({length:MARKET_TARGET},(_,i)=>genSingleMarketPlayer(i)));
}

function ensureMarketStock(){
  if(!Array.isArray(G.marketPlayers)) G.marketPlayers=[];
  let idx=G.marketPlayers.length;
  let added=false;
  while(G.marketPlayers.length<MARKET_TARGET){
    G.marketPlayers.push(genSingleMarketPlayer(idx));
    idx++; added=true;
  }
  /* Yeni oyuncu eklendiyse tüm market listesinde ad/foto çakışmasını tekrar tekilleştir. */
  if(added) ensureUniquePlayerNames(G.marketPlayers);
}

function genRandomClubName(){
  return `${ch(SEHIR)} ${ch(LIG_T)}`;
}

/** Grup içinde benzersiz kulüp adı üretir (aynı ligde iki özdeş isim olmasın). */
function genUniqueClubName(taken){
  for(let tries=0;tries<300;tries++){
    const n=genRandomClubName();
    if(!taken.has(n)){ taken.add(n); return n; }
  }
  const base=genRandomClubName();
  let n=base, k=2;
  while(taken.has(n)){ n=base+' '+k; k++; }
  taken.add(n); return n;
}

function makeSubTemplate(){
  const taken=new Set();
  const teams=[];
  for(let i=0;i<LEAGUE_SIZE;i++) teams.push(genUniqueClubName(taken));
  return {teams};
}

function ensureTblState(){
  /* localStorage engellenebilir (gizli sekme/kurumsal politika/kota) — okuma başarısızsa
     boş state'ten üret, yazma başarısızsa bellek-içi devam et (projedeki genel desen). */
  let legacy=null,raw=null;
  try{
    legacy=localStorage.getItem('charazay_tbl_v1');
    raw=localStorage.getItem(TBL_STORAGE_KEY)||localStorage.getItem('charazay_tbl_v3')||localStorage.getItem('charazay_tbl_v2')||legacy;
  }catch(e){ legacy=null; raw=null; }
  let st=null;
  if(raw){ try{ st=JSON.parse(raw); }catch(e){ st=null; } }
  if(!st||!st.subs){
    st={subs:{}};
    st.subs.tbl=makeSubTemplate();
    for(let d=1;d<=5;d++){
      for(let g=1;g<=5;g++){
        st.subs[`${d}.${g}`]=makeSubTemplate();
      }
    }
    try{ localStorage.setItem(TBL_STORAGE_KEY,JSON.stringify(st)); }catch(e){}
    return st;
  }
  let changed=false;
  if(st.subs['t.1']&&!st.subs.tbl){
    st.subs.tbl=st.subs['t.1'];
    for(let s=1;s<=5;s++) delete st.subs['t.'+s];
    changed=true;
  }
  if(!st.subs.tbl){ st.subs.tbl=makeSubTemplate(); changed=true; }
  for(let s=1;s<=5;s++){
    const tk='t.'+s;
    if(st.subs[tk]){ delete st.subs[tk]; changed=true; }
  }
  for(let d=1;d<=5;d++){
    for(let g=1;g<=5;g++){
      const k=`${d}.${g}`;
      if(!st.subs[k]){ st.subs[k]=makeSubTemplate(); changed=true; }
    }
  }
  for(const k of Object.keys(st.subs)){
    const sub=st.subs[k];
    if(!sub||!sub.teams) continue;
    if(!Array.isArray(sub.teams)||sub.teams.length!==LEAGUE_SIZE){
      const old=sub.teams||[];
      const taken=new Set();
      const teams=[];
      for(let i=0;i<LEAGUE_SIZE;i++){
        const cur=old[i];
        if(cur&&!taken.has(cur)){ taken.add(cur); teams[i]=cur; }
        else teams[i]=genUniqueClubName(taken);
      }
      sub.teams=teams;
      changed=true;
    } else {
      const taken=new Set();
      for(let i=0;i<LEAGUE_SIZE;i++){
        const cur=sub.teams[i];
        if(!cur||taken.has(cur)){ sub.teams[i]=genUniqueClubName(taken); changed=true; }
        else taken.add(cur);
      }
    }
  }
  if(changed||(legacy&&raw===legacy)){ try{ localStorage.setItem(TBL_STORAGE_KEY,JSON.stringify(st)); }catch(e){} }
  return st;
}

function getTblState(){ return ensureTblState(); }

function assignUserToTblSlot(userTeamName){
  const st=getTblState();
  const order=['tbl'];
  for(let d=1;d<=5;d++){
    for(let g=1;g<=5;g++) order.push(`${d}.${g}`);
  }
  for(const k of order){
    const sub=st.subs[k];
    if(!sub||!sub.teams||sub.teams.length!==LEAGUE_SIZE) continue;
    if(sub.teams.includes(userTeamName)){
      try{ localStorage.setItem(TBL_STORAGE_KEY,JSON.stringify(st)); }catch(e){}
      return k;
    }
    sub.teams[LEAGUE_SIZE-1]=userTeamName;
    try{ localStorage.setItem(TBL_STORAGE_KEY,JSON.stringify(st)); }catch(e){}
    return k;
  }
  return 'tbl';
}

function genLigTeams(){
  const st=getTblState();
  const key=(G.team&&G.team.tblKey)||'tbl';
  const arr=(st.subs[key]&&st.subs[key].teams)||[];
  let names=arr.filter(n=>n&&n!==G.team.isim);
  const COLS=['#3b82f6','#22c55e','#ef4444','#8b5cf6','#fbbf24','#ec4899','#14b8a6'];
  return names.map((isim,i)=>({
    id:i,isim,
    renk:COLS[i%COLS.length],
    galibiyet:0,maglubiyet:0,sayiFor:0,sayiAg:0,
    get puan(){return 0;}
  }));
}

function seqFromName(isim,ligKey){
  return hash32(String(isim)+ligKey)%100000;
}

function standingPuan(row){ return (row.g||0)*2; }
/* C5: Tur sayısı fikstürden dinamik türetilir (farklı takım sayılı liglerde "/19" kırılmaz). */
function totalRounds(){
  try{
    if(G.season&&Array.isArray(G.season.matches)&&G.season.matches.length){
      const mx=Math.max.apply(null,G.season.matches.map(m=>Number(m.round)||0));
      if(mx>0) return mx;
    }
  }catch(e){}
  return LEAGUE_SIZE-1;
}

function buildLeagueRows(ligKey){
  const sub=getTblState().subs[ligKey];
  if(!sub) return [];
  const colors=['#3b82f6','#22c55e','#ef4444','#8b5cf6','#fbbf24','#ec4899','#14b8a6'];
  const sea=G.season;
  const useSea=!!(sea&&sea.standings&&G.team&&ligKey===G.team.tblKey);
  const rows=sub.teams.map((raw,idx)=>{
    if(!raw){
      return {isim:'— Boş —',isUser:false,idx,g:'—',m:'—',sf:'—',sa:'—',av:'—',puan:'—',o:'—',renk:'#64748b',bos:true};
    }
    const isim=raw;
    const isUser=G.team&&isim===G.team.isim;
    const s=seqFromName(isim+idx,ligKey);
    const renk=isUser&&G.team?G.team.renk:colors[s%colors.length];
    if(useSea&&sea.standings[isim]){
      const r=sea.standings[isim];
      const av=(r.sf||0)-(r.sa||0);
      const avTxt=av>0?'+'+av:String(av);
      return {isim,isUser,idx,g:String(r.g),m:String(r.m),sf:String(r.sf),sa:String(r.sa),av:avTxt,puan:String(standingPuan(r)),o:String(r.o),renk,bos:false};
    }
    return {isim,isUser,idx,g:'—',m:'—',sf:'—',sa:'—',av:'—',puan:'—',o:'—',renk,bos:false};
  });
  /* C4: Eşit puanda önce ikili maç (head-to-head), sonra genel averaj sıralar (FIBA mantığı). */
  const seaMatches=(useSea&&sea.matches)?sea.matches:null;
  const h2h=(an,bn)=>{
    if(!seaMatches) return 0;
    const m=seaMatches.find(x=>x.played&&x.hs!=null&&x.as!=null&&((x.home===an&&x.away===bn)||(x.home===bn&&x.away===an)));
    if(!m) return 0;
    const aSc=m.home===an?m.hs:m.as, bSc=m.home===an?m.as:m.hs;
    return aSc>bSc?1:bSc>aSc?-1:0;
  };
  rows.sort((a,b)=>{
    if(a.bos&&!b.bos) return 1;
    if(!a.bos&&b.bos) return -1;
    if(useSea){
      const pa=Number(a.puan)||0, pb=Number(b.puan)||0;
      if(pb!==pa) return pb-pa;
      const hh=h2h(a.isim,b.isim);
      if(hh!==0) return -hh;
      const ava=parseInt(String(a.av).replace('+',''),10)||0, avb=parseInt(String(b.av).replace('+',''),10)||0;
      if(avb!==ava) return avb-ava;
    }
    return String(a.isim).localeCompare(String(b.isim),'tr');
  });
  return rows;
}

function getFanBaseStats(){
  if(!G||!G.team) return { count:0, group:'—' };
  const key=G.team.tblKey||'tbl';
  const rows=buildLeagueRows(key);
  const rank=rows.findIndex(t=>t.isUser);
  const count=1000+G.wins*180+(rank>=0?rank*12:0);
  let group='Yerel oluşum';
  if(count>=75000) group='Mega kitlesi';
  else if(count>=45000) group='Ulusal çekim gücü';
  else if(count>=22000) group='Bölgesel dev';
  else if(count>=10000) group='Geniş kitle';
  else if(count>=5000) group='Büyüyen grup';
  return { count, group };
}

function findFirstNullInDivision(divNum,st){
  for(let s=1;s<=5;s++){
    const k=`${divNum}.${s}`;
    const t=st.subs[k]&&st.subs[k].teams;
    if(!t) continue;
    const ix=t.indexOf(null);
    if(ix!==-1) return {key:k,ix};
  }
  const fk=`${divNum}.1`;
  if(st.subs[fk]&&st.subs[fk].teams)return{key:fk,ix:LEAGUE_SIZE-1};
  return null;
}

function findFirstNullInTbl(st){
  if(!st.subs.tbl||!st.subs.tbl.teams) return null;
  const t=st.subs.tbl.teams;
  const ix=t.indexOf(null);
  if(ix!==-1) return {key:'tbl',ix};
  return {key:'tbl',ix:LEAGUE_SIZE-1};
}

function replaceUserInLeague(st,ligKey,userName,withName){
  const arr=st.subs[ligKey].teams;
  const i=arr.indexOf(userName);
  if(i!==-1) arr[i]=withName;
}

function fillFirstNullWithAi(st,ligKey){
  const t=st.subs[ligKey].teams;
  const j=t.indexOf(null);
  if(j!==-1) t[j]=genRandomClubName();
}

function applyPromotionRelegation(){
  if(!G.team||!G.team.tblKey){ showNotif('Önce takım oluştur.'); return; }
  if(G.season&&G.season.active&&!seasonAllMatchesPlayed()){
    showNotif('Sezon devam ediyor — yükselme/düşme için önce tüm maçlar oynanmalı.');
    return;
  }
  const st=getTblState();
  const key=G.team.tblKey;
  const pk=parseTblKey(key);
  const rows=buildLeagueRows(key);
  const uix=rows.findIndex(r=>r.isUser);
  if(uix<0){ showNotif('Lig tablosunda takımın yok.'); return; }
  const un=G.team.isim;

  const finish=(slot,msg)=>{
    replaceUserInLeague(st,key,un,null);
    fillFirstNullWithAi(st,key);
    st.subs[slot.key].teams[slot.ix]=un;
    G.team.tblKey=slot.key;
    try{ localStorage.setItem(TBL_STORAGE_KEY,JSON.stringify(st)); }catch(e){}
    G.ligTeams=genLigTeams();
    G.season=null;
    G.seasonFixtures=[];
    regenerateSeasonFixtures();
    renderLeagueSidebar();
    const slotEl=document.getElementById('sbTblSlot');
    if(slotEl) slotEl.textContent=formatTblSlotLabel(G.team.tblKey);
    renderLig();
    showNotif(msg+' '+formatTblSlotLabel(slot.key));
  };

  if(pk.kind==='tbl'){
    if(uix<5){
      showNotif('Zaten en üst kademe: TBL Süper Lig — üst sıralardasın.');
      renderLig();
      return;
    }
    if(uix>=5 && uix<15){
      showNotif('Sıran '+(uix+1)+'/20 — orta gruptasın, TBL içinde kalırsın.');
      renderLig();
      return;
    }
    const slot=findFirstNullInDivision(1,st);
    if(!slot){ showNotif('Alt ligde boş yer yok; yerinde kalırsın.'); return; }
    finish(slot,'↓ TBL Süper Lig’ten Alt Lig Div 1’e düştün:');
    return;
  }

  const divNum=pk.div;
  if(uix>=5 && uix<15){
    showNotif('Sıran '+(uix+1)+'/20 — orta gruptasın, liginde kalırsın.');
    renderLig();
    return;
  }

  if(uix<5){
    if(divNum<=1){
      const slot=findFirstNullInTbl(st);
      if(!slot){ showNotif('TBL Süper Lig’de boş yer yok; yerinde kalırsın.'); return; }
      unlockAchievement('ustLig');
      finish(slot,'↑ TBL Süper Lig’e yükseldin:');
      return;
    }
    const slot=findFirstNullInDivision(divNum-1,st);
    if(!slot){ showNotif('Üst Div’da boş yer yok; yerinde kalırsın.'); return; }
    unlockAchievement('ustLig');
    finish(slot,'↑ Üst Div’a yükseldin:');
    return;
  }

  if(uix>=15 && divNum>=5){
    showNotif('En alt Div (Div 5); daha aşağı grup yok.');
    renderLig();
    return;
  }

  const slot=findFirstNullInDivision(divNum+1,st);
  if(!slot){ showNotif('Alt Div’da boş yer yok; yerinde kalırsın.'); return; }
  finish(slot,'↓ Alt Div’a düştün:');
}

