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

/* ══════════════════════════════════════════════════════════════════════════════════════
   FAZ B (30. oturum) — PLAYBOOK: hücum setleri + savunma setleri
   Menajerlik oyunlarında en çok şikayet edilen konu "hazır taktikler"di. Artık kullanıcı
   somut basketbol setleri seçiyor; her set motorda GERÇEK etkiye sahip:
     • is3      : üçlük denemesi payına eklenir
     • acc2/3   : iki/üç sayı isabetine eklenir
     • ast      : asist olasılığına eklenir
     • to       : ekstra top kaybı riski
     • fbMul    : hızlı hücum çarpanı
     • roleW    : setin beslediği ROL'lerin top kullanım payı çarpanı (FAZ A usageW ile çarpılır)
     • uyum     : setin işlemesi için sahadaki 5'te aranan özellik — kadro uymazsa isabet düşer
   `dia` alanı görsel önizleme (yarı saha şeması) için nokta/ok verisidir; render.js çizer.
   Koordinat sistemi: 0-200 (x, dip çizgi → orta saha), 0-190 (y). Pota (18,95).
   ══════════════════════════════════════════════════════════════════════════════════════ */
const PLAYBOOKS=[
  {key:'dengeli', ad:'Serbest Akış', ikon:'⚖️',
   ozet:'Belirli bir set yok — oyuncular doğal eğilimlerine göre oynar. Nötr.',
   is3:0, acc2:0, acc3:0, ast:0, to:0, fbMul:1, roleW:{}, uyum:null,
   dia:{spots:[{l:'1',x:150,y:95},{l:'2',x:110,y:26},{l:'3',x:110,y:164},{l:'4',x:56,y:44},{l:'5',x:44,y:146}],arrows:[]}},

  {key:'pnr', ad:'Pick & Roll', ikon:'🔩',
   ozet:'Kurucu-pivot ikilisi. Perde sonrası pivot potaya dalar: iki sayı ve asist artar, üçlük azalır.',
   is3:-0.06, acc2:0.035, acc3:0, ast:0.09, to:-0.01, fbMul:1,
   roleW:{oyunKurucu:1.25, karartici:1.20, ribaundcu:1.15, sutor:0.90},
   uyum:{eg:'pas', hedef:52, ad:'pas dağıtımı'},
   dia:{spots:[{l:'1',x:150,y:95},{l:'5',x:112,y:95},{l:'2',x:104,y:22},{l:'3',x:104,y:168},{l:'4',x:44,y:150}],
        arrows:[{t:'screen',f:[112,95],to:[138,95]},{t:'cut',f:[112,95],to:[40,104]},{t:'dribble',f:[150,95],to:[104,80]}]}},

  {key:'horns', ad:'Horns (Boynuz)', ikon:'🐂',
   ozet:'İki uzun serbest atış çizgisinde, iki şutör köşede. Her seçeneği açar: asist ve isabet dengeli artar.',
   is3:0.03, acc2:0.02, acc3:0.012, ast:0.10, to:-0.02, fbMul:0.9,
   roleW:{oyunKurucu:1.18, sutor:1.10, karartici:1.08},
   uyum:{eg:'pas', hedef:50, ad:'pas dağıtımı'},
   dia:{spots:[{l:'1',x:152,y:95},{l:'4',x:104,y:64},{l:'5',x:104,y:126},{l:'2',x:30,y:18},{l:'3',x:30,y:172}],
        arrows:[{t:'screen',f:[104,64],to:[132,80]},{t:'screen',f:[104,126],to:[132,110]},{t:'pass',f:[152,95],to:[36,24]}]}},

  {key:'dipKose', ad:'Dip Köşe Üçlüsü', ikon:'🏹',
   ozet:'Top içeri, pas köşeye. Üçlük denemesi belirgin artar — şutör rolündekiler yüklenir.',
   is3:0.13, acc2:-0.015, acc3:0.02, ast:0.07, to:0.005, fbMul:0.95,
   roleW:{sutor:1.45, slasher:1.05, karartici:0.80, ribaundcu:0.85},
   uyum:{eg:'uc', hedef:58, ad:'üçlük eğilimi'},
   dia:{spots:[{l:'1',x:150,y:95},{l:'5',x:40,y:82},{l:'2',x:22,y:16},{l:'3',x:22,y:174},{l:'4',x:112,y:150}],
        arrows:[{t:'pass',f:[150,95],to:[46,84]},{t:'pass',f:[40,82],to:[26,22]},{t:'cut',f:[112,150],to:[30,168]}]}},

  {key:'motion', ad:'Motion (Sürekli Hareket)', ikon:'🔄',
   ozet:'Beş oyuncu da hareket eder, perdeler zincirlenir. Top kaybı düşer, asist ve isabet artar; tempo yavaşlar.',
   is3:0.01, acc2:0.025, acc3:0.015, ast:0.13, to:-0.035, fbMul:0.7,
   roleW:{oyunKurucu:1.12, sutor:1.10, cokYonlu:1.15},
   uyum:{stat:'zeka', hedef:70, ad:'zekâ'},
   dia:{spots:[{l:'1',x:150,y:95},{l:'2',x:112,y:34},{l:'3',x:112,y:156},{l:'4',x:56,y:52},{l:'5',x:56,y:138}],
        arrows:[{t:'cut',f:[112,34],to:[46,72]},{t:'screen',f:[56,52],to:[86,40]},{t:'pass',f:[150,95],to:[116,40]},{t:'cut',f:[112,156],to:[120,110]}]}},

  {key:'iso', ad:'Yıldıza İzolasyon', ikon:'👤',
   ozet:'Top yüklenen oyuncuya alan açılır. Asist düşer, top kaybı azalır; yıldız yoksa isabet düşer.',
   is3:0.02, acc2:0.01, acc3:0, ast:-0.16, to:-0.03, fbMul:0.8,
   roleW:{skorer:1.60, slasher:1.30, sutor:1.05, oyunKurucu:0.85, karartici:0.70, ribaundcu:0.70},
   uyum:{stat:'hucum', hedef:76, ad:'hücum gücü'},
   dia:{spots:[{l:'1',x:120,y:95},{l:'2',x:26,y:18},{l:'3',x:26,y:172},{l:'4',x:150,y:34},{l:'5',x:150,y:156}],
        arrows:[{t:'dribble',f:[120,95],to:[52,95]}]}},

  {key:'postUp', ad:'Pota Altı Yükleme', ikon:'🏋️',
   ozet:'Top boyalı alanda pivota. İki sayı ve faul kazanımı artar, üçlük belirgin azalır.',
   is3:-0.14, acc2:0.05, acc3:-0.01, ast:0.03, to:0.01, fbMul:0.65,
   roleW:{karartici:1.55, ribaundcu:1.45, skorer:1.05, sutor:0.70},
   uyum:{stat:'ribaund', hedef:72, ad:'pota altı gücü'},
   dia:{spots:[{l:'5',x:44,y:118},{l:'1',x:150,y:95},{l:'2',x:26,y:18},{l:'3',x:110,y:170},{l:'4',x:96,y:40}],
        arrows:[{t:'pass',f:[150,95],to:[50,116]},{t:'dribble',f:[44,118],to:[26,102]}]}},

  {key:'transition', ad:'Erken Hücum', ikon:'🚀',
   ozet:'Ribaund sonrası koşu. Hızlı hücum katlanır, kolay sayı gelir ama top kaybı riski artar.',
   is3:-0.02, acc2:0.02, acc3:-0.02, ast:-0.03, to:0.045, fbMul:2.2,
   roleW:{slasher:1.40, oyunKurucu:1.10, karartici:0.85},
   uyum:{stat:'hiz', hedef:74, ad:'hız'},
   dia:{spots:[{l:'1',x:170,y:95},{l:'2',x:140,y:20},{l:'3',x:140,y:170},{l:'4',x:96,y:60},{l:'5',x:180,y:130}],
        arrows:[{t:'dribble',f:[170,95],to:[80,95]},{t:'cut',f:[140,20],to:[36,52]},{t:'cut',f:[140,170],to:[36,140]}]}},

  {key:'driveKick', ad:'Kır ve Dağıt', ikon:'💥',
   ozet:'Potaya dalış, savunma toplanınca dışarı pas. Üçlük ve asist birlikte artar.',
   is3:0.09, acc2:0.01, acc3:0.018, ast:0.11, to:0.015, fbMul:1.05,
   roleW:{slasher:1.35, sutor:1.25, oyunKurucu:1.10, ribaundcu:0.85},
   uyum:{eg:'pota', hedef:60, ad:'potaya dalma'},
   dia:{spots:[{l:'1',x:140,y:95},{l:'2',x:26,y:20},{l:'3',x:26,y:170},{l:'4',x:120,y:44},{l:'5',x:60,y:140}],
        arrows:[{t:'dribble',f:[140,95],to:[54,88]},{t:'pass',f:[54,88],to:[30,26]},{t:'pass',f:[54,88],to:[124,48]}]}},

  {key:'fiveOut', ad:'Beş Dışarı', ikon:'🌐',
   ozet:'Beş oyuncu da çember dışında. Boyalı alan boşalır: üçlük patlar, ribaund zayıflar.',
   is3:0.16, acc2:0.005, acc3:0.01, ast:0.06, to:0.01, fbMul:1.15,
   roleW:{sutor:1.40, slasher:1.20, oyunKurucu:1.05, ribaundcu:0.65, karartici:0.65},
   uyum:{eg:'uc', hedef:62, ad:'üçlük eğilimi'},
   dia:{spots:[{l:'1',x:158,y:95},{l:'2',x:120,y:26},{l:'3',x:120,y:164},{l:'4',x:40,y:16},{l:'5',x:40,y:174}],
        arrows:[{t:'pass',f:[158,95],to:[124,32]},{t:'pass',f:[120,26],to:[46,20]},{t:'cut',f:[40,174],to:[70,120]}]}},

  {key:'flex', ad:'Flex Ofans', ikon:'🧩',
   ozet:'Dip çizgi perdeleri döngüsü. Sabırlı, düşük riskli: top kaybı en aza iner, isabet artar.',
   is3:-0.03, acc2:0.04, acc3:0.01, ast:0.08, to:-0.05, fbMul:0.6,
   roleW:{cokYonlu:1.20, oyunKurucu:1.10, karartici:1.10, skorer:0.95},
   uyum:{stat:'zeka', hedef:68, ad:'zekâ'},
   dia:{spots:[{l:'1',x:150,y:95},{l:'2',x:100,y:22},{l:'3',x:34,y:172},{l:'4',x:70,y:150},{l:'5',x:60,y:44}],
        arrows:[{t:'screen',f:[70,150],to:[44,168]},{t:'cut',f:[34,172],to:[30,110]},{t:'pass',f:[150,95],to:[64,48]}]}}
];
const PLAYBOOK_MAP=(()=>{ const m={}; PLAYBOOKS.forEach(p=>m[p.key]=p); return m; })();
function playbookOf(key){ return PLAYBOOK_MAP[key]||PLAYBOOK_MAP.dengeli; }

/* ── Savunma setleri — mevcut adam/bölge/pres üçlüsü korunur, iki set eklendi. ──
   opp2/opp3 : rakip iki/üç sayı isabet çarpanı · stealKeep: rakip top kaybı payı
   pressTO   : pres tipi ekstra çalma · foul: faul riski çarpanı */
const DEF_SETS=[
  {key:'adam',  ad:'Adam Adama',       ikon:'🧍', ozet:'Dengeli, risksiz temel savunma.',
   opp2:1.00, opp3:1.00, opp3Rate:1.00, stealKeep:1.00, pressTO:0,    foul:1.00,
   dia:{spots:[{l:'X1',x:130,y:95},{l:'X2',x:96,y:34},{l:'X3',x:96,y:156},{l:'X4',x:52,y:60},{l:'X5',x:44,y:120}],arrows:[]}},
  {key:'bolge', ad:'2-3 Bölge',        ikon:'🛡️', ozet:'Boyalı alanı kapatır; rakip dışarıdan daha çok deneme yapar.',
   opp2:0.94, opp3:1.05, opp3Rate:1.22, stealKeep:0.78, pressTO:0,    foul:0.92,
   dia:{spots:[{l:'X1',x:98,y:66},{l:'X2',x:98,y:124},{l:'X3',x:44,y:28},{l:'X4',x:36,y:95},{l:'X5',x:44,y:162}],arrows:[]}},
  {key:'pres',  ad:'Tam Saha Pres',    ikon:'🔥', ozet:'Çok top çalar; faul ve kolay sayı riski yüksek.',
   opp2:1.03, opp3:1.02, opp3Rate:0.95, stealKeep:1.00, pressTO:0.06, foul:1.22,
   dia:{spots:[{l:'X1',x:186,y:95},{l:'X2',x:160,y:40},{l:'X3',x:160,y:150},{l:'X4',x:110,y:70},{l:'X5',x:60,y:110}],
        arrows:[{t:'cut',f:[186,95],to:[160,60]},{t:'cut',f:[160,150],to:[178,120]}]}},
  {key:'switch',ad:'Her Perdede Değişim', ikon:'🔀', ozet:'Perde arkasından üçlük vermez — rakip içeri girmeye zorlanır.',
   opp2:1.05, opp3:0.90, opp3Rate:0.80, stealKeep:0.95, pressTO:0,    foul:1.05,
   dia:{spots:[{l:'X1',x:124,y:70},{l:'X2',x:124,y:120},{l:'X3',x:80,y:34},{l:'X4',x:80,y:156},{l:'X5',x:48,y:95}],
        arrows:[{t:'screen',f:[124,70],to:[124,120]},{t:'screen',f:[80,34],to:[80,156]}]}},
  {key:'pack',  ad:'Boyalıyı Kapat',   ikon:'🧱', ozet:'Beş oyuncu da içeri çöker: turnike yok, ama rakip üçlük yağdırır.',
   opp2:0.88, opp3:1.10, opp3Rate:1.42, stealKeep:0.85, pressTO:0,    foul:0.85,
   dia:{spots:[{l:'X1',x:86,y:95},{l:'X2',x:60,y:56},{l:'X3',x:60,y:134},{l:'X4',x:34,y:76},{l:'X5',x:34,y:114}],arrows:[]}}
];
const DEF_SET_MAP=(()=>{ const m={}; DEF_SETS.forEach(d=>m[d.key]=d); return m; })();
function defSetOf(key){ return DEF_SET_MAP[key]||DEF_SET_MAP.adam; }

/** Setin kadroya UYUMU: aranan özelliğin sahadaki 5 ortalaması hedefin altındaysa isabet düşer.
 *  Dönüş 0.90 (hiç uymuyor) .. 1.10 (birebir kadro). Bu, "her sete her kadro yaramaz" kuralıdır. */
function playbookFit(pb,court){
  try{
    if(!pb||!pb.uyum||!Array.isArray(court)||!court.length) return 1;
    const u=pb.uyum;
    let tot=0,n=0;
    court.forEach(p=>{ if(!p) return; n++; tot+=u.eg?(typeof egOf==='function'?egOf(p,u.eg):50):(Number(p[u.stat])||0); });
    if(!n) return 1;
    const avg=tot/n;
    return Math.max(0.90,Math.min(1.10,1+((avg-u.hedef)/Math.max(1,u.hedef))*0.55));
  }catch(e){ return 1; }
}
/** Uyum yüzdesi (arayüzde gösterilir) — 0-100. */
function playbookFitPct(pb,court){
  const f=playbookFit(pb,court);
  return Math.round((f-0.90)/0.20*100);
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
  /* Faz 3: top yükleme yapılan oyuncu ekstra yıpranır (gerçekçilik — çok top taşımanın bedeli). */
  const focusId=(G.tactics&&G.tactics.focusPlayerId)||null;
  if(playedIds instanceof Set){
    G.players.forEach(p=>{
      if(!playedIds.has(p.id)) return;
      let cost=dayanCost(p);
      if(focusId&&p.id===focusId) cost+=rand(5,9);
      p.enerji=Math.max(0,Math.round((Number(p.enerji)||100)-cost));
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
/* Faz 5.2: Maç sonrası analiz verisi topla — takım trendi (+/-) + oyuncu gelişim eğrisi. */
function recordMatchAnalytics(sm,uPts,oPts){
  try{
    G.analytics=G.analytics&&typeof G.analytics==='object'?G.analytics:{teamMatches:[],playerDev:{}};
    G.analytics.teamMatches=Array.isArray(G.analytics.teamMatches)?G.analytics.teamMatches:[];
    G.analytics.playerDev=G.analytics.playerDev&&typeof G.analytics.playerDev==='object'?G.analytics.playerDev:{};
    const win=uPts>oPts;
    G.analytics.teamMatches.push({season:(G.season&&G.season.year)||0,round:sm.round,day:sm.day,uPts,oPts,margin:uPts-oPts,win});
    if(G.analytics.teamMatches.length>120) G.analytics.teamMatches.shift();
    (G.players||[]).forEach(p=>{
      const arr=G.analytics.playerDev[p.id]||(G.analytics.playerDev[p.id]=[]);
      arr.push({day:sm.day,genel:Number(p.genel)||0});
      if(arr.length>60) arr.shift();
    });
    const ids=new Set((G.players||[]).map(p=>p.id));
    Object.keys(G.analytics.playerDev).forEach(id=>{ if(!ids.has(id)) delete G.analytics.playerDev[id]; });
  }catch(e){ dbg('analytics',e); }
}
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

/* ── Faz 2.2: Sezon sonu bireysel ödülleri ──
   Kullanıcının gerçek oyuncu istatistikleri (p.sezon) + rakip kulüplerin en iyi oyuncuları için
   OVR/pozisyondan türetilen sezonluk istatistik havuzu üzerinden ödüller. */
function seasonAwardStatSynth(p,games){
  const g=Number(p.genel)||60, poz=p.poz||'SF';
  const M=({PG:{p:0.90,a:1.9,r:0.5},SG:{p:1.18,a:1.1,r:0.6},SF:{p:1.06,a:1.0,r:1.0},PF:{p:0.98,a:0.7,r:1.6},C:{p:0.92,a:0.6,r:1.9}})[poz]||{p:1,a:1,r:1};
  const ppg=Math.max(3,(g-40)*0.34*M.p);
  const apg=Math.max(0.4,(g-45)*0.14*M.a);
  const rpg=Math.max(1,(g-45)*0.16*M.r);
  return {mac:games,pts:Math.round(ppg*games),ast:Math.round(apg*games),reb:Math.round(rpg*games)};
}
function buildSeasonPlayerPool(){
  const pool=[]; const games=Math.max(1,totalRounds());
  (G.players||[]).forEach(p=>{
    const s=p.sezon||{mac:0,pts:0,ast:0,reb:0};
    if((s.mac||0)<1) return; /* hiç oynamamış oyuncu ödül havuzuna girmez */
    pool.push({isim:p.isim,team:G.team.isim,poz:p.poz,genel:p.genel,yas:p.yas,mac:s.mac,pts:s.pts||0,ast:s.ast||0,reb:s.reb||0,isUser:true});
  });
  try{
    userLeaguePeers().forEach(name=>{
      const prof=getBotClubProfile(name,G.team.tblKey||'tbl');
      (prof.roster||[]).slice().sort((a,b)=>(b.genel||0)-(a.genel||0)).slice(0,4).forEach(p=>{
        const st=seasonAwardStatSynth(p,games);
        pool.push({isim:p.isim,team:name,poz:p.poz,genel:p.genel,yas:p.yas,mac:st.mac,pts:st.pts,ast:st.ast,reb:st.reb,isUser:false});
      });
    });
  }catch(e){ dbg('award pool',e); }
  return pool;
}
function computeSeasonAwards(){
  const pool=buildSeasonPlayerPool();
  if(!pool.length) return null;
  const perf=e=>((e.pts||0)+(e.ast||0)*1.5+(e.reb||0)*1.2);
  const top=(arr,f)=>arr.slice().sort((a,b)=>f(b)-f(a))[0]||null;
  const mvp=top(pool,perf);
  const topScorer=top(pool,e=>e.pts||0);
  const topAst=top(pool,e=>e.ast||0);
  const topReb=top(pool,e=>e.reb||0);
  const ideal=['PG','SG','SF','PF','C'].map(pz=>top(pool.filter(e=>e.poz===pz),perf));
  const young=top(pool.filter(e=>Number(e.yas)<=21),perf);
  return {mvp,topScorer,topAst,topReb,ideal,young,games:Math.max(1,totalRounds())};
}
function announceSeasonAwards(){
  try{
    const aw=computeSeasonAwards();
    if(!aw||!aw.mvp) return;
    const yr=G.season?G.season.year:'';
    G.managerHistory=Array.isArray(G.managerHistory)?G.managerHistory:[];
    if(aw.mvp.isUser){
      G.managerRep=(Number(G.managerRep)||0)+3;
      G.managerHistory.push({year:yr,basari:'Lig MVP ('+aw.mvp.isim+')'});
    }
    const pg=(v,e)=>((e.mac||1)>0?(v/(e.mac||1)).toFixed(1):'0');
    pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--gold);">🏅 <strong>Sezon ${yr} ödülleri</strong> — MVP: <strong>${escMatch(aw.mvp.isim)}</strong> (${escMatch(aw.mvp.team)}); En skorer: ${escMatch(aw.topScorer.isim)} (${pg(aw.topScorer.pts,aw.topScorer)}); En asistçi: ${escMatch(aw.topAst.isim)} (${pg(aw.topAst.ast,aw.topAst)}); En ribaundçu: ${escMatch(aw.topReb.isim)} (${pg(aw.topReb.reb,aw.topReb)}).</div>`);
    showSeasonAwardsModal(aw,yr);
  }catch(e){ dbg('awards',e); }
}
function showSeasonAwardsModal(aw,yr){
  if(typeof showAppModal!=='function'||!aw||!aw.mvp) return;
  const pg=(v,e)=>((e.mac||1)>0?(v/(e.mac||1)).toFixed(1):'0');
  const tag=e=>e&&e.isUser?' <span style="color:var(--accent);font-size:10px;">★senin</span>':'';
  const card=(ikon,baslik,e,val)=>e?`<div style="flex:1;min-width:120px;background:var(--bg3);border-radius:9px;padding:9px 10px;">
      <div style="font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;">${ikon} ${baslik}</div>
      <div style="font-size:13px;font-weight:700;margin-top:3px;">${escMatch(e.isim)}${tag(e)}</div>
      <div style="font-size:11px;color:var(--text2);">${escMatch(e.team)} · ${val}</div>
    </div>`:'';
  const idealRow=(aw.ideal||[]).filter(Boolean).map(e=>`<div style="flex:1;min-width:88px;text-align:center;background:var(--bg3);border-radius:9px;padding:8px 6px;">
      <div style="font-size:10px;color:var(--gold);font-weight:700;">${e.poz}</div>
      <div style="font-size:12px;font-weight:700;margin-top:2px;line-height:1.2;">${escMatch(e.isim)}${tag(e)}</div>
      <div style="font-size:10px;color:var(--text2);">${escMatch(e.team)}</div>
    </div>`).join('');
  showAppModal(`<div style="padding:6px 2px;">
    <div class="modal-title" style="text-align:center;color:var(--gold);">🏅 Sezon ${yr} Ödül Töreni</div>
    <div style="text-align:center;background:linear-gradient(135deg,rgba(249,115,22,0.18),rgba(251,191,36,0.10));border:1px solid var(--gold);border-radius:12px;padding:14px;margin:10px 0;">
      <div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:1px;">Sezonun En Değerli Oyuncusu</div>
      <div style="font-size:22px;font-weight:800;margin-top:4px;">${escMatch(aw.mvp.isim)}${tag(aw.mvp)}</div>
      <div style="font-size:12px;color:var(--text2);margin-top:2px;">${escMatch(aw.mvp.team)} · ${pg(aw.mvp.pts,aw.mvp)} sayı · ${pg(aw.mvp.ast,aw.mvp)} asist · ${pg(aw.mvp.reb,aw.mvp)} ribaund ort.</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
      ${card('🎯','En Skorer',aw.topScorer,pg(aw.topScorer.pts,aw.topScorer)+' sayı ort.')}
      ${card('🅰️','En Asistçi',aw.topAst,pg(aw.topAst.ast,aw.topAst)+' asist ort.')}
      ${card('💪','En Ribaundçu',aw.topReb,pg(aw.topReb.reb,aw.topReb)+' ribaund ort.')}
      ${aw.young?card('🌱','Yılın Genci',aw.young,aw.young.yas+' yaş · '+pg(aw.young.pts,aw.young)+' sayı'):''}
    </div>
    <div style="font-size:11px;color:var(--gold);font-weight:700;margin-bottom:5px;">⭐ İdeal Beşli</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">${idealRow}</div>
    <div style="text-align:center;margin-top:16px;"><button type="button" class="btn-p" style="width:auto;padding:9px 28px;" onclick="closeAppModal()">Kapat</button></div>
  </div>`);
}
function endLeagueSeasonIfDone(){
  if(!G.season||!G.season.active||!seasonAllMatchesPlayed()) return false;
  G.season.active=false;
  finishCupSeason(); /* Paket 1: kupa yarım kaldıysa kalan turları simüle et */
  unlockAchievement('sezonTamam');
  /* Paket B: kariyer başarımları — sezon kapanış anında değerlendirilir. */
  if((Number(G.season.year)||0)>=10) unlockAchievement('efsane10');
  if(G.season.hadCrisis&&G.coins>0) unlockAchievement('kullerinden');
  try{
    const u=G.team.isim;
    const ms=(G.season.matches||[]).filter(m=>(m.home===u||m.away===u)&&m.played);
    if(ms.length>=10&&ms.every(m=>{const uh=m.home===u;return (uh?m.hs:m.as)>(uh?m.as:m.hs);})) unlockAchievement('yenilmezSezon');
  }catch(e){}
  try{ announceSeasonAwards(); }catch(e){ dbg('season awards',e); } /* Faz 2.2 */
  try{ evaluatePresidentTarget(); }catch(e){ dbg('president eval',e); } /* Faz 4.3 */
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
/* ── Faz 2.1: Playoff artık SERİ — ilk 4 galibiyeti alan turu geçer (best-of-7).
   Ev sahibi avantajı sıralamaya göre 2-2-1-1-1 (üst sıralı takım 1,2,5,7. maçlarda ev sahibi). */
const PLAYOFF_SERIES_WIN=4;
const PLAYOFF_HOST_PATTERN=[1,1,0,0,1,0,1]; /* 1 = üst sıralı (seri.home) ev sahibi */
function makeSeries(homeTeam,awayTeam,homeSeed,awaySeed){
  return {home:homeTeam,away:awayTeam,homeSeed,awaySeed,wins:[0,0],games:[],done:false,winner:null};
}
function seriesGameHost(s,gameNo){
  const hi=PLAYOFF_HOST_PATTERN[(gameNo-1)%7]===1;
  return hi?s.home:s.away;
}
function seriesCurrentGameNo(s){ return (s.games?s.games.length:0)+1; }
function recordSeriesGame(s,g){
  s.games=s.games||[];
  s.games.push(g);
  if(g.winner===s.home) s.wins[0]++; else if(g.winner===s.away) s.wins[1]++;
  if(s.wins[0]>=PLAYOFF_SERIES_WIN){ s.done=true; s.winner=s.home; }
  else if(s.wins[1]>=PLAYOFF_SERIES_WIN){ s.done=true; s.winner=s.away; }
  /* Paket B: "Tersine Dönüş" — kullanıcı seriyi ilk 2 maçı kaybetmişken kazandı. */
  try{
    if(s.done&&G.team&&s.winner===G.team.isim&&s.games.length>=2
       &&s.games[0].winner!==G.team.isim&&s.games[1].winner!==G.team.isim) unlockAchievement('tersineDonus');
  }catch(e){}
}
/* Kullanıcının oynayacağı SIRADAKI seri maçının tanımlayıcısı (home = bu maçın ev sahibi). */
function userPlayoffMatch(){
  const r=currentPlayoffRound();
  if(!r||!G.team) return null;
  const s=r.find(x=>!x.done&&(x.home===G.team.isim||x.away===G.team.isim));
  if(!s) return null;
  const gameNo=seriesCurrentGameNo(s);
  const host=seriesGameHost(s,gameNo);
  const other=host===s.home?s.away:s.home;
  return {series:s,gameNo,home:host,away:other,isSeriesGame:true};
}
function startPlayoffs(){
  try{
    const rows=buildLeagueRows(G.team.tblKey||'tbl').filter(r=>r&&!r.bos&&r.isim);
    const top=rows.slice(0,8).map(r=>r.isim);
    if(top.length<8){ /* grup küçükse playoff atla, doğrudan yeni sezon */ afterPlayoffsProceed(); return; }
    const pairs=[[0,7],[3,4],[1,6],[2,5]]; /* çeyrek eşleşmeleri (üst sıralı önce = ev avantajı) */
    const r0=pairs.map(([a,b])=>makeSeries(top[a],top[b],a,b));
    G.playoff={active:true,year:G.season.year,teams:top,round:0,rounds:[r0],champion:null,finalStats:{},mvp:null};
    simPlayoffBotMatches();
    if(!userPlayoffMatch()) maybeAdvancePlayoff(); /* kullanıcı playoff dışıysa tümünü simüle et */
    renderLig();
    renderDashboardNextMatch();
    if(userPlayoffMatch()) showNotif('🏆 Playoff serin başladı — Lig ekranından oyna (ilk 4 galibiyet turu geçer)!',{critical:true});
  }catch(e){ dbg('startPlayoffs',e); afterPlayoffsProceed(); }
}
function currentPlayoffRound(){ return G.playoff&&G.playoff.rounds?G.playoff.rounds[G.playoff.round]:null; }
/* Bot-bot serilerini tamamına kadar simüle et (kullanıcının serisine dokunma). */
function simPlayoffBotMatches(){
  const r=currentPlayoffRound();
  if(!r) return;
  r.forEach(s=>{
    if(s.done) return;
    if(G.team&&(s.home===G.team.isim||s.away===G.team.isim)) return;
    let guard=0;
    while(!s.done&&guard++<9){
      const gameNo=seriesCurrentGameNo(s);
      const host=seriesGameHost(s,gameNo);
      const other=host===s.home?s.away:s.home;
      const res=playoffPickWinner(host,other);
      recordSeriesGame(s,{gameNo,host,hs:res.hs,as:res.as,winner:res.winner});
    }
  });
}
function playoffRoundLabel(idx,total){
  /* total = o turdaki seri sayısı: 4→Çeyrek, 2→Yarı, 1→Final */
  return total>=4?'Çeyrek Final':total===2?'Yarı Final':'Final';
}
/* Playoff MVP: final serisi boyunca kullanıcının oyuncu istatistiklerini biriktir. */
function accumulatePlayoffFinalStats(ev){
  try{
    const r=currentPlayoffRound();
    if(!r||r.length!==1||!G.playoff) return; /* yalnız final serisi */
    G.playoff.finalStats=G.playoff.finalStats||{};
    const map=(ev&&ev.players)||{};
    Object.keys(map).forEach(id=>{
      const p=(G.players||[]).find(x=>x.id===id); if(!p) return;
      const fs=G.playoff.finalStats[id]||(G.playoff.finalStats[id]={isim:p.isim,team:G.team.isim,pts:0,ast:0,reb:0,g:0});
      const st=map[id]; fs.g++; if(st){ fs.pts+=st.pts||0; fs.ast+=st.ast||0; fs.reb+=st.reb||0; }
    });
  }catch(e){}
}
function maybeAdvancePlayoff(){
  const r=currentPlayoffRound();
  if(!r||!r.every(s=>s.done)) return;
  const winners=r.map(s=>({team:s.winner,seed:(s.winner===s.home?s.homeSeed:s.awaySeed)})).filter(w=>w.team);
  if(winners.length<=1){
    G.playoff.champion=winners[0]?winners[0].team:null;
    G.playoff.active=false;
    finishPlayoffs();
    return;
  }
  const next=[];
  for(let i=0;i<winners.length;i+=2){
    const a=winners[i], b=winners[i+1];
    const hi=(a.seed<=b.seed)?a:b, lo=(a.seed<=b.seed)?b:a; /* düşük seed no = üst sıra = ev avantajı */
    next.push(makeSeries(hi.team,lo.team,hi.seed,lo.seed));
  }
  G.playoff.rounds.push(next);
  G.playoff.round++;
  simPlayoffBotMatches();
  if(!userPlayoffMatch()) maybeAdvancePlayoff();
}
/* Şampiyonun en iyi oyuncusu (kullanıcı final oynamadıysa MVP için makul yedek). */
function playoffChampionTopPlayer(champ){
  try{
    if(G.team&&champ===G.team.isim){
      let best=null,sc=-1; const s=G.playoff&&G.playoff.finalStats||{};
      Object.keys(s).forEach(id=>{ const v=s[id],x=(v.pts||0)+(v.ast||0)*1.5+(v.reb||0)*1.2; if(x>sc){sc=x;best=v;} });
      if(best) return {isim:best.isim,team:champ,pts:best.pts,ast:best.ast,reb:best.reb,g:best.g};
    }
    const prof=getBotClubProfile(champ,G.team&&G.team.tblKey||'tbl');
    const ros=(prof&&prof.roster||[]).slice().sort((a,b)=>(b.genel||0)-(a.genel||0));
    const p=ros[0];
    if(p) return {isim:p.isim,team:champ,pts:null,ast:null,reb:null,g:null,genel:p.genel};
  }catch(e){}
  return null;
}
function finishPlayoffs(){
  const champ=G.playoff&&G.playoff.champion;
  const userChamp=champ&&G.team&&champ===G.team.isim;
  const mvp=playoffChampionTopPlayer(champ);
  if(G.playoff) G.playoff.mvp=mvp;
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
  const mvpText=mvp?` · Playoff MVP: <strong>${escMatch(mvp.isim)}</strong> (${escMatch(mvp.team)})`:'';
  pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--gold);">🏆 <strong>Sezon ${G.playoff?G.playoff.year:''}</strong> playoff şampiyonu: <strong>${escMatch(champ||'—')}</strong>${userChamp?' — TEBRİKLER!':''}${mvpText}</div>`);
  try{ showChampionshipModal(champ,userChamp,mvp); }catch(e){ dbg('champ modal',e); }
  afterPlayoffsProceed();
}
/* Faz 2.1: Şampiyonluk kutlama modalı (kupa + konfeti). */
function showChampionshipModal(champ,userChamp,mvp){
  if(typeof showAppModal!=='function') return;
  const confetti=userChamp
    ? Array.from({length:22}).map((_,i)=>{
        const c=['#f97316','#fbbf24','#22c55e','#3b82f6','#ec4899','#8b5cf6'][i%6];
        const left=Math.round((i*4.5+3)%98), dur=(2.4+((i*7)%13)/10).toFixed(2), delay=(((i*13)%20)/10).toFixed(2);
        return `<span style="position:absolute;top:-14px;left:${left}%;width:8px;height:12px;background:${c};border-radius:2px;animation:czConfetti ${dur}s linear ${delay}s infinite;"></span>`;
      }).join('')
    : '';
  const mvpLine=mvp?`<div style="margin-top:12px;font-size:13px;color:var(--text2);">🌟 Playoff MVP: <strong style="color:var(--accent);">${escMatch(mvp.isim)}</strong> <span style="opacity:.8">(${escMatch(mvp.team)})</span>${mvp.pts!=null?` — ${(mvp.pts/(mvp.g||1)).toFixed(1)} sayı ort.`:''}</div>`:'';
  const head=userChamp?`${escMatch(G.team.isim)} ŞAMPİYON!`:`Şampiyon: ${escMatch(champ||'—')}`;
  const sub=userChamp?'Playoff serilerini kazandın — kupa senin! 🎉':'Bu sezon kupayı başka takım kaldırdı.';
  showAppModal(`<style>@keyframes czConfetti{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(420px) rotate(340deg);opacity:.15}}@keyframes czTrophy{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}</style>
    <div style="position:relative;overflow:hidden;text-align:center;padding:14px 6px 6px;">
      ${confetti}
      <div style="font-size:70px;line-height:1;margin-bottom:8px;${userChamp?'animation:czTrophy 1.4s ease-in-out infinite;':''}">🏆</div>
      <div class="modal-title" style="text-align:center;color:var(--gold);font-size:24px;">${head}</div>
      <p style="font-size:13px;color:var(--text2);margin:6px auto 0;max-width:360px;">Sezon ${G.playoff?G.playoff.year:''} · ${sub}</p>
      ${mvpLine}
      <button type="button" class="btn-p" style="width:auto;padding:10px 30px;margin-top:18px;" onclick="closeAppModal()">Kapat</button>
    </div>`);
}
function afterPlayoffsProceed(){
  setTimeout(()=>{
    if(G.team) startDraft(); /* Faz 6: draft → tamamlanınca yeni sezon */
    else proceedToNewSeason();
  },1200);
}
function proceedToNewSeason(){
  if(G.team) ensureLeagueSeasonOrStart();
  renderLig();
  renderFixture();
  renderDashboardNextMatch();
}

/* ── Faz 6: Draft sistemi — sezon sonunda genç aday havuzu; ligi düşük bitiren önce seçer (NBA tarzı). ── */
function startDraft(){
  try{
    if(!G.team||!G.team.tblKey){ proceedToNewSeason(); return; }
    const rows=buildLeagueRows(G.team.tblKey).filter(r=>r&&!r.bos&&r.isim);
    if(rows.length<2){ proceedToNewSeason(); return; }
    const order=rows.map(r=>r.isim).reverse(); /* en kötü sıra önce seçer */
    const poolSize=order.length+10;
    const pool=Array.from({length:poolSize}).map((_,i)=>genDraftProspect(i));
    if(typeof ensureUniquePlayerNames==='function') ensureUniquePlayerNames(pool);
    G.draft={year:(G.season&&G.season.year)||0,order,pool,picks:[],idx:0,done:false};
    pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--blue);">🎓 <strong>Sezon sonu draftı</strong> başladı — ligi düşük sırada bitiren takım önce seçer.</div>`);
    processDraftPicks();
  }catch(e){ dbg('startDraft',e); proceedToNewSeason(); }
}
function draftAvailable(){ const d=G.draft; return d?d.pool.filter(p=>!d.picks.some(x=>x.prospectId===p.id)):[]; }
function processDraftPicks(){
  const d=G.draft;
  if(!d||d.done) return;
  while(d.idx<d.order.length){
    const team=d.order[d.idx];
    if(team===G.team.isim){ openDraftModal(); return; } /* kullanıcı sırası → seçim bekle */
    botDraftPick(team);
    d.idx++;
  }
  finalizeDraft();
}
function botDraftPick(team){
  const d=G.draft;
  const avail=draftAvailable();
  if(!avail.length) return;
  avail.sort((a,b)=>(Number(b.potansiyel)||0)-(Number(a.potansiyel)||0)); /* bot gerçek potansiyeli görür */
  d.picks.push({team,prospectId:avail[0].id});
}
function draftPick(prospectId){
  const d=G.draft; if(!d) return;
  const p=d.pool.find(x=>x.id===prospectId);
  if(!p||d.picks.some(x=>x.prospectId===prospectId)){ showNotif('Bu aday zaten seçildi.'); return; }
  d.picks.push({team:G.team.isim,prospectId});
  const np={...p}; np.draftYili=d.year;
  G.youth=Array.isArray(G.youth)?G.youth:[];
  G.youth.push(np);
  showNotif(`🎓 Draft: ${p.isim} (${p.poz}) altyapına katıldı!`,{critical:true});
  pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--green);">🎓 <strong>${escMatch(G.team.isim)}</strong> draftta <strong>${escMatch(p.isim)}</strong> (${p.poz}·OVR ${p.genel}) seçti.</div>`);
  closeAppModal();
  d.idx++;
  scheduleGameSave();
  processDraftPicks();
}
function finalizeDraft(){
  if(G.draft) G.draft.done=true;
  scheduleGameSave();
  proceedToNewSeason();
}
/* Kullanıcının en iyi izcisinin kalitesi draft ipuçlarını netleştirir (scouting'e bağlı). */
function draftScoutQuality(){ return (G.scouts||[]).reduce((m,s)=>Math.max(m,Number(s.kalite)||0),0); }
function openDraftModal(){
  if(typeof showAppModal!=='function'){ finalizeDraft(); return; }
  const d=G.draft; if(!d) return;
  const pickNo=d.idx+1;
  const q=draftScoutQuality();
  const avail=draftAvailable().slice().sort((a,b)=>(Number(b.genel)||0)-(Number(a.genel)||0));
  const potHint=p=>{
    if(q>=4) return `<span style="color:var(--blue);">⭐ Pot ${p.potansiyel}</span>`; /* güçlü izci → net */
    const spread=6+(hash32(String(p.id||p.seed||''))%7);
    const lo=Math.max(Number(p.genel)||0,(Number(p.potansiyel)||60)-spread), hi=Math.min(99,(Number(p.potansiyel)||60)+Math.floor(spread/2));
    return `<span style="color:var(--gold);">🔍 Pot ${lo}–${hi}${q>=2?'':' (izci yok — belirsiz)'}</span>`;
  };
  const rows=avail.slice(0,16).map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 9px;background:var(--bg3);border-radius:8px;margin-bottom:5px;">
      <div style="flex:1;"><strong style="font-size:12px;">${escMatch(p.isim)}</strong> <span style="color:var(--text2);font-size:11px;">${p.poz}·${p.yas}y·OVR ${p.genel}</span><br><span style="font-size:10px;">${potHint(p)} · ${kisilikInfo(p.kisilik).ikon} ${kisilikInfo(p.kisilik).ad}</span></div>
      <button type="button" class="btn-p" style="padding:6px 12px;font-size:11px;" onclick="draftPick('${p.id}')">Seç</button>
    </div>`).join('');
  showAppModal(`<div class="modal-title">🎓 Draft ${d.year} — ${pickNo}. sıra senin</div>
    <p style="font-size:12px;color:var(--text2);margin-bottom:10px;">Ligi ${d.order.length}. sırada bitirdin; draft sıran geldi. Bir genç yetenek seç (potansiyel ipucu izci kalitene bağlı${q?` — en iyi izci ${q}★`:' — izcin yok'}).</p>
    <div style="max-height:340px;overflow-y:auto;">${rows}</div>`);
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
        /* Faz 4.2: kişilik ayrılma eğilimini kaydırır (sadık/şehir bağımlısı kalır, parasever/hırslı ayrılır). */
        const kk=(typeof kisilikInfo==='function')?kisilikInfo(p.kisilik):{sadakat:1,para:1};
        leaveChance+=(kk.para-1)*0.10-(kk.sadakat-1)*0.14;
        leaveChance=Math.max(0.03,Math.min(0.85,leaveChance));
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
      /* Paket 2 (14. oturum): sezon sıfırlanmadan kariyer toplamına ekle + kulüp rekorları. */
      p.kariyerPts=(Number(p.kariyerPts)||0)+((p.sezon&&Number(p.sezon.pts))||0);
      p.kariyerMac=(Number(p.kariyerMac)||0)+((p.sezon&&Number(p.sezon.mac))||0);
      G.clubRecords=G.clubRecords||{};
      if(!G.clubRecords.topScorer||p.kariyerPts>G.clubRecords.topScorer.pts)
        G.clubRecords.topScorer={isim:p.isim,pts:p.kariyerPts};
      if(!G.clubRecords.longest||(Number(p.kulupSezon)||0)+1>G.clubRecords.longest.sezon)
        G.clubRecords.longest={isim:p.isim,sezon:(Number(p.kulupSezon)||0)+1};
      p.sezon={mac:0,pts:0,ast:0,reb:0};
      p.kulupSezon=(Number(p.kulupSezon)||0)+1; /* Paket B: kulüpte geçirilen sezon ("Ömür Boyu") */
      const y=Number(p.yas)||25;
      p.yas=y+1; /* oyuncular sezonla yaşlanır */
      /* Madde 22: yaşa bağlı gerileme — 32+ fiziksel statlarda küçük sezonluk düşüş. */
      const na=p.yas;
      if(na>=32){
        const decl=na>=37?rand(2,4):na>=35?rand(1,3):rand(1,2);
        ['hiz','kondisyon','dayaniklilik','topSurme','blok','topCalma'].forEach(k=>{ p[k]=Math.max(30,(Number(p[k])||50)-decl); });
        if(na>=35){ p.sutIsabeti=Math.max(30,(Number(p.sutIsabeti)||50)-1); p.hucum=Math.max(30,(Number(p.hucum)||50)-1); p.savunma=Math.max(30,(Number(p.savunma)||50)-1); }
        p.genel=Math.round(STAT_KEYS.reduce((s,k)=>s+(Number(p[k])||0),0)/STAT_KEYS.length);
        refreshRole(p); /* FAZ A: sezon gelişimi sonrası rol güncellenir */
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
      if(emekli.some(p=>(Number(p.kulupSezon)||0)>=8)) unlockAchievement('omurBoyu'); /* Paket B */
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
  startCupSeason(names); /* Paket 1 (14. oturum): ulusal kupa — lig ile paralel tek eleme */
  setPresidentTarget(); /* Faz 4.3: başkan sezon hedefi */
  applyBudgetPenaltyDecay(); /* Faz 4.3: geçen sezon hedef tutmadıysa bütçe kısıtı bu sezon işler, sonra azalır */
  updateStats();
  renderLig();
  renderFixture();
  renderDashboardNextMatch();
  if(document.getElementById('page-dashboard')&&document.getElementById('page-dashboard').classList.contains('active')) renderDashboardNews();
  pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--gold);">🏀 <strong>Sezon ${G.season.year}</strong> — ${formatTblSlotLabel(G.team.tblKey)} · ${totalRounds()} tur (tek devre). Fikstür, tablo ve skorlar tek kaynaktan.</div>`);
  showNotif('Sezon başladı.');
  scheduleGameSave();
}
/* ── Faz 4.3: Başkan beklentisi / hedef sistemi ── */
function setPresidentTarget(){
  try{
    if(!G.team||!G.team.tblKey) return;
    const key=G.team.tblKey;
    const rows=buildLeagueRows(key).filter(r=>r&&!r.bos&&r.isim);
    const n=rows.length||20;
    const userTop=(G.players||[]).slice().sort((a,b)=>(b.genel||0)-(a.genel||0)).slice(0,8);
    const userStr=userTop.length?userTop.reduce((s,p)=>s+(p.genel||0),0)/userTop.length:65;
    let stronger=0;
    rows.forEach(r=>{ if(r.isim!==G.team.isim){ const s=pseudoTeamStrength(r.isim,key)+((G.season&&G.season.drift&&G.season.drift[r.isim])||0); if(s>userStr) stronger++; } });
    const expectedRank=Math.max(1,Math.min(n,stronger+1));
    let targetRank,label;
    if(expectedRank<=3){ targetRank=3; label='şampiyonluk yarışı — ilk 3'; }
    else if(expectedRank<=8){ targetRank=8; label='playoff (ilk 8)'; }
    else if(expectedRank<=Math.floor(n*0.7)){ targetRank=Math.min(n-2,expectedRank+2); label=`orta sıra — en fazla ${targetRank}. sıra`; }
    else { targetRank=Math.max(1,n-4); label='düşme hattından uzak durmak'; }
    G.presidentTarget={year:G.season.year,expectedRank,targetRank,n,label,evaluated:false};
    pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--blue);">🗣️ <strong>Başkan</strong> — Sezon ${G.season.year} hedefi: <strong>${label}</strong> (beklenen güç sıran ~${expectedRank}.).</div>`);
    showNotif(`🗣️ Başkanın hedefi: ${label}.`,{critical:true});
  }catch(e){ dbg('president target',e); }
}
function applyBudgetPenaltyDecay(){
  try{
    if((Number(G.budgetPenalty)||0)>0){
      pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--red);">💸 <strong>Başkan bütçeyi kıstı</strong> — geçen sezon hedef tutmadı; bu sezon bilet gelirleri baskı altında.</div>`);
      G.budgetPenalty=Math.max(0,Number(G.budgetPenalty)-1);
    }
  }catch(e){}
}
function evaluatePresidentTarget(){
  try{
    const pt=G.presidentTarget;
    if(!pt||pt.evaluated||!G.team||!G.team.tblKey) return;
    const rows=buildLeagueRows(G.team.tblKey).filter(r=>r&&!r.bos&&r.isim);
    const actualRank=rows.findIndex(r=>r.isUser)+1;
    if(actualRank<=0) return;
    pt.evaluated=true; pt.actualRank=actualRank;
    G.managerHistory=Array.isArray(G.managerHistory)?G.managerHistory:[];
    if(actualRank<=pt.targetRank){
      const over=pt.targetRank-actualRank;
      const bonus=3+Math.min(7,over*2);
      G.managerRep=(Number(G.managerRep)||0)+bonus;
      G.managerHistory.push({year:pt.year,basari:`Başkan hedefi tuttu (${actualRank}. sıra)`});
      pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--green);">🗣️ <strong>Başkan memnun</strong> — hedef (${pt.label}) tuttu, ${actualRank}. sırada bitirdin. İtibar +${bonus}.</div>`);
      showNotif(`🗣️ Başkan memnun — hedef tuttu (${actualRank}. sıra). İtibar +${bonus}.`);
    } else {
      const miss=actualRank-pt.targetRank;
      const repDrop=Math.min(8,2+miss);
      G.managerRep=Math.max(0,(Number(G.managerRep)||0)-repDrop);
      pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--red);">🗣️ <strong>Başkan hayal kırıklığında</strong> — hedef (${pt.label}) tutmadı, ${actualRank}. sırada bitirdin. İtibar −${repDrop}.</div>`);
      showNotif(`🗣️ Başkan hedefin tutmamasından memnun değil (${actualRank}. sıra). İtibar −${repDrop}.`,{critical:true});
      if(miss>=4){ G.budgetPenalty=(Number(G.budgetPenalty)||0)+1; } /* ağır sapmada gelecek sezon bütçe kısıtı (game over YOK) */
    }
  }catch(e){ dbg('president eval',e); }
}


/* ═══ Paket 1 (14. oturum): ULUSAL KUPA — lig ile paralel, tek eleme yan yarışma ═══
   Format: gruptaki 20 takım; 8 takım ön eleme (4 maç), 12 bye → son 16 → 8 → 4 → final.
   Takvim: kupa turu k, lig turu CUP_AFTER_ROUNDS[k] tamamlanınca oynanır (lig fikstürüne
   ve gün sayacına DOKUNMAZ). Kullanıcı maçı canlı oynanır; 2 lig turu ertelenirse ya da
   kullanıcı elendiyse otomatik simüle edilir. Bot maçları playoffPickWinner ile anında. */
const CUP_AFTER_ROUNDS=[4,7,10,13,16];
const CUP_ROUND_NAMES=['Ön Eleme','Son 16','Çeyrek Final','Yarı Final','FİNAL'];
function startCupSeason(names){
  try{
    if(!Array.isArray(names)||names.length!==LEAGUE_SIZE){ G.cup=null; return; }
    /* Deterministik kura: sezon yılı + takım adı hash sırası. */
    const yr=(G.season&&G.season.year)||1;
    const seeded=names.slice().sort((a,b)=>hash32('kupa'+yr+'|'+a)-hash32('kupa'+yr+'|'+b));
    const byes=seeded.slice(0,12);          /* ilk 12 → doğrudan Son 16 */
    const prelim=seeded.slice(12);          /* 8 takım → ön eleme (4 maç) */
    const r0=[];
    for(let i=0;i<prelim.length;i+=2) r0.push({home:prelim[i],away:prelim[i+1],hs:0,as:0,winner:null,played:false});
    G.cup={year:yr,round:0,rounds:[r0],byes,champion:null,done:false};
    pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--gold);">🏅 <strong>Ulusal Kupa ${yr}</strong> kuraları çekildi — ${byes.includes(G.team.isim)?'ön elemeyi BYE geçtin — Son 16 içindesin':'ön elemede oynayacaksın'}. Kupa günleri lig turları arasına serpiştirilir.</div>`);
  }catch(e){ dbg('startCupSeason',e); G.cup=null; }
}
function cupUserMatch(){
  const c=G.cup;
  if(!c||c.done) return null;
  const r=c.rounds[c.round]||[];
  return r.find(m=>!m.played&&(m.home===G.team.isim||m.away===G.team.isim))||null;
}
/** Ligde tamamlanmış tur sayısı (kullanıcı+bot maçları oynanmış turlar). */
function _leagueRoundsDone(){
  try{
    const ms=(G.season&&G.season.matches)||[];
    let done=0;
    for(let r=1;r<=totalRounds();r++){
      const rm=ms.filter(m=>m.round===r);
      if(rm.length&&rm.every(m=>m.played)) done=r; else break;
    }
    return done;
  }catch(e){ return 0; }
}
/** Kupa turunun kaçıncısı "vadesi gelmiş" durumda? */
function _cupDueRounds(){
  const done=_leagueRoundsDone();
  let n=0;
  CUP_AFTER_ROUNDS.forEach(r=>{ if(done>=r) n++; });
  return n;
}
/** Her lig maçı sonrası çağrılır: vadesi gelen kupa turlarını işletir. */
function tickCup(){
  try{
    const c=G.cup;
    if(!c||c.done||!G.season) return;
    let guard=0;
    while(!c.done&&c.round<_cupDueRounds()&&guard++<8){
      const r=c.rounds[c.round];
      const um=cupUserMatch();
      /* Bot maçlarını anında simüle et. */
      r.forEach(m=>{
        if(m.played) return;
        if(m===um){
          /* Kullanıcının maçı: en fazla 1 tur beklet (bir sonraki kupa vadesi gelmişse
             ya da kullanıcı eriştiğinde oynamadıysa otomatik simüle edilir). */
          if(_cupDueRounds()-c.round>=2){ _cupSimMatch(m); }
          return;
        }
        _cupSimMatch(m);
      });
      if(r.every(m=>m.played)) _cupAdvanceRound();
      else break; /* kullanıcı maçı bekliyor */
    }
    const um2=cupUserMatch();
    if(um2&&c.round<_cupDueRounds()&&!c._notified){
      c._notified=true;
      showNotif(`🏅 Kupa maçın hazır: ${um2.home} — ${um2.away} (${CUP_ROUND_NAMES[c.round]||'Tur'}). Lig ekranındaki kupa kartından oyna!`,{critical:true});
    }
  }catch(e){ dbg('tickCup',e); }
}
function _cupSimMatch(m){
  const r=playoffPickWinner(m.home,m.away);
  m.hs=r.hs; m.as=r.as; m.winner=r.winner; m.played=true;
  if(m.home===G.team.isim||m.away===G.team.isim){
    const won=m.winner===G.team.isim;
    pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid ${won?'var(--green)':'var(--red)'};">🏅 Kupa (oynanmadı, simüle): <strong>${m.home}</strong> ${m.hs}-${m.as} <strong>${m.away}</strong>${won?'':' — kupadan elendin.'}</div>`);
  }
}
function _cupAdvanceRound(){
  const c=G.cup;
  const r=c.rounds[c.round];
  let winners=r.map(m=>m.winner);
  if(c.round===0) winners=c.byes.concat(winners);   /* Son 16 = 12 bye + 4 ön eleme kazananı */
  if(winners.length<=1){
    c.champion=winners[0]||null; c.done=true;
    c._notified=false;
    _cupCrown();
    return;
  }
  /* Deterministik eşleme karıştırması (yıl+tur hash). */
  const yr=c.year,rd=c.round+1;
  winners.sort((a,b)=>hash32('kupaR'+yr+'_'+rd+'|'+a)-hash32('kupaR'+yr+'_'+rd+'|'+b));
  const next=[];
  for(let i=0;i<winners.length;i+=2) next.push({home:winners[i],away:winners[i+1],hs:0,as:0,winner:null,played:false});
  c.rounds.push(next);
  c.round++;
  c._notified=false;
}
function _cupCrown(){
  const c=G.cup;
  if(!c||!c.champion) return;
  /* Kupa tarihçesi (Kariyer Özeti + izlenebilirlik). */
  G.cupHistory=Array.isArray(G.cupHistory)?G.cupHistory:[];
  G.cupHistory.push({year:c.year,champion:c.champion});
  if(G.cupHistory.length>60) G.cupHistory.shift();
  const userWon=c.champion===G.team.isim;
  pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--gold);">🏅 <strong>Ulusal Kupa ${c.year} şampiyonu: ${escMatch(c.champion)}</strong>${userWon?' — KUPA SENİN! 🎉':''}</div>`);
  if(userWon){
    const odul=ecoRound(3200);   /* lig şampiyonluğundan düşük, ekonomi bandını bozmaz */
    txn('Kupa şampiyonluk ödülü',odul);
    unlockAchievement('kupaSampiyon');
    G.managerRep=(Number(G.managerRep)||0)+3;
    G.managerHistory=Array.isArray(G.managerHistory)?G.managerHistory:[];
    G.managerHistory.push({year:c.year,basari:'Ulusal Kupa şampiyonluğu'});
    awardCoaches('Kupa şampiyonluğu',3);
    showNotif(`🏅 ULUSAL KUPA ŞAMPİYONU! +${fmtn(odul)} KR ödül.`,{critical:true});
  }
}
/** Sezon kapanırken kupa hâlâ bitmemişse kalanını komple simüle et. */
function finishCupSeason(){
  try{
    const c=G.cup;
    if(!c||c.done) return;
    let guard=0;
    while(!c.done&&guard++<8){
      const r=c.rounds[c.round];
      r.forEach(m=>{ if(!m.played) _cupSimMatch(m); });
      _cupAdvanceRound();
    }
  }catch(e){ dbg('finishCup',e); }
}
/** Kullanıcının kupa maçı sonucunu işle (canlı maçtan — applyMatchResult çağırır). */
function recordUserCupResult(uPts,oPts,rakipName,userIsHome){
  const c=G.cup;
  if(!c||c.done) return;
  const m=cupUserMatch();
  if(!m) return;
  const uName=G.team.isim;
  const uIsHomeInTie=(m.home===uName);
  m.hs=uIsHomeInTie?uPts:oPts;
  m.as=uIsHomeInTie?oPts:uPts;
  /* Kupa beraberliği olmaz — canlı motor uzatmayla çözer; yine de emniyet. */
  if(m.hs===m.as){ if(uPts>=oPts) m.hs++; else m.as++; }
  m.winner=m.hs>m.as?m.home:m.away;
  m.played=true;
  const won=m.winner===uName;
  pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid ${won?'var(--green)':'var(--red)'};">🏅 Kupa (${CUP_ROUND_NAMES[c.round]||'Tur'}): <strong>${m.home}</strong> ${m.hs}-${m.as} <strong>${m.away}</strong>${won?' — tur atladın!':' — kupadan elendin.'}</div>`);
  const r=c.rounds[c.round];
  if(r.every(x=>x.played)) _cupAdvanceRound();
  tickCup();
}
