function txn(label,amount){
  const a=Math.round(Number(amount)||0);
  if(!a) return;
  G.coins+=a;
  if(!Array.isArray(G.ledger)) G.ledger=[];
  G.ledger.unshift({d:G.gameDay||1,l:String(label),a});
  if(G.ledger.length>220) G.ledger.length=220;
  if(G.coins>=100000) unlockAchievement('zengin');
  try{ updateCoins(); }catch(e){}
}

/** Ev maçı bilet geliri: kapasite × doluluk (form ile %45-95) × 1,2 KR bilet. Arena yatırımının getirisi budur. */
/** Madde 23: doluluk güncel forma bağlı — son N maçın galibiyet oranı (yoksa sezon oranı). */
function recentUserForm(n){
  n=n||5;
  try{
    if(!G.season||!G.season.matches||!G.team) return null;
    const u=G.team.isim;
    const played=G.season.matches.filter(m=>m.played&&(m.home===u||m.away===u))
      .sort((a,b)=>(a.day-b.day)||(a.round-b.round)||(a.seasonMatchIx-b.seasonMatchIx));
    const last=played.slice(-n);
    if(!last.length) return null;
    let w=0;
    last.forEach(m=>{ const uh=m.home===u; const us=uh?m.hs:m.as; const os=uh?m.as:m.hs; if(us>os) w++; });
    return w/last.length;
  }catch(e){ return null; }
}
function homeTicketIncome(){
  const form=recentUserForm(5);
  const seasonPlayed=(G.wins+G.losses)||0;
  const seasonWr=seasonPlayed?G.wins/Math.max(1,seasonPlayed):0.5;
  const wr=form!=null?form*0.7+seasonWr*0.3:seasonWr;
  const occ=Math.max(0.35,Math.min(0.98,(0.55+wr*0.35)*ticketDemandFactor()));
  const budgetMul=(Number(G.budgetPenalty)||0)>0?0.90:1; /* Faz 4.3: başkan bütçe kısıtı sezonu */
  return Math.round((G.arena&&G.arena.kap||5000)*occ*1.2*ticketPriceFactor()*budgetMul);
}
/** Madde 24: bilet fiyatı çarpanı — kullanıcı fiyatı belirler; yüksek fiyat gelir/bilet ↑ ama doluluk ↓. */
function ticketPriceLevel(){ const v=Number(G.ticketPrice); return Number.isFinite(v)?Math.max(0,Math.min(4,v)):2; }
function ticketPriceFactor(){
  /* 0:Çok ucuz .. 4:Çok pahalı. Fiyat çarpanı gelire, ayrı doluluk cezası occ'a uygulanır. */
  const lvl=ticketPriceLevel();
  return [0.7,0.85,1.0,1.2,1.45][lvl];
}
function ticketDemandFactor(){
  const lvl=ticketPriceLevel();
  return [1.15,1.07,1.0,0.88,0.72][lvl]; /* pahalı → doluluk düşer */
}

function weeklyWageBill(){
  const oy=(G.players||[]).reduce((s,p)=>s+(Number(p.maas)||0),0);
  const ko=(G.coaches||[]).reduce((s,c)=>s+(Number(c.maas)||0),0);
  const iz=(G.scouts||[]).reduce((s,c)=>s+(Number(c.maas)||0),0); /* Faz 5.1: izci maaşları */
  const ar=(G.arena&&Number(G.arena.bk))||0;
  return {oy,ko,iz,ar,top:oy+ko+iz+ar};
}
/* Faz 5.1: Her ekonomi haftası izciler atandıkları havuzda potansiyel keşfeder (kalite = keşif adedi). */
function processScoutingWeek(){
  try{
    if(!Array.isArray(G.scouts)||!G.scouts.length) return;
    G.scouts.forEach(sc=>{
      const pool=sc.atama==='youth'?(G.youth||[]):(G.marketPlayers||[]);
      const unscouted=pool.filter(p=>p&&!(typeof playerScouted==='function'&&playerScouted(p)));
      if(!unscouted.length) return;
      unscouted.sort((a,b)=>(Number(b.potansiyel)||0)-(Number(a.potansiyel)||0));
      const n=Math.max(1,Number(sc.kalite)||1);
      const found=unscouted.slice(0,n);
      found.forEach(p=>{ p.scouted=true; });
      const gem=found.find(p=>(Number(p.potansiyel)||0)-(Number(p.genel)||0)>=12);
      if(gem){ pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--blue);">🔭 İzcin <strong>${escMatch(sc.ad)}</strong> (${escMatch(sc.bolge)}) parlak bir yetenek keşfetti: <strong>${escMatch(gem.isim)}</strong> — potansiyel ${gem.potansiyel} (${(sc.atama==='youth'?'altyapı':'market')}).</div>`); }
    });
  }catch(e){ dbg('scouting',e); }
}

/** Koç bonusu: her koç, uzmanlık statı en düşük 'seviye' kadar oyuncuya +1 verir (potansiyel tavanına kadar). */
function applyWeeklyCoachBonuses(){
  (G.coaches||[]).forEach(c=>{
    if(!c.stat) return;
    const adaylar=(G.players||[]).slice().sort((a,b)=>(a[c.stat]||0)-(b[c.stat]||0)).slice(0,Math.max(1,Number(c.seviye)||1));
    adaylar.forEach(p=>{
      const tavan=Math.min(99,p.potansiyel||99);
      if((p[c.stat]||0)<tavan){
        p[c.stat]=Math.min(tavan,(p[c.stat]||0)+1);
        p.genel=Math.round(STAT_KEYS.reduce((s,k)=>s+p[k],0)/STAT_KEYS.length);
      }
    });
  });
}

/** Madde 13: bot kulübün önbellek kadrosunda GERÇEK transfer — en zayıf oyuncuyu daha iyisiyle değiştirir. */
function botClubTransfer(teamName,ligKey){
  try{
    let cache={}; try{ cache=JSON.parse(localStorage.getItem(CLUB_CACHE_KEY)||'{}'); }catch(e){ cache={}; }
    const ck=ligKey+'||'+teamName;
    const row=cache[ck];
    if(!row||!Array.isArray(row.roster)||!row.roster.length) return null;
    const roster=row.roster;
    let wi=0; for(let i=1;i<roster.length;i++){ if((roster[i].genel||0)<(roster[wi].genel||0)) wi=i; }
    const eski=roster[wi];
    const target=Math.min(95,(eski.genel||65)+rand(3,11));
    const np=genPlayerBounded(eski.poz||ch(POZLAR),Math.max(50,target-2),target+2);
    np.id='b'+hash32(ck+wi+Date.now())+'_'+wi;
    np.seed='bt'+ck+wi+(Date.now()%100000);
    np.maas=salaryKRFromGenel(np.genel);
    roster[wi]=np;
    ensureUniquePlayerNames(roster);
    cache[ck]=row;
    try{ localStorage.setItem(CLUB_CACHE_KEY,JSON.stringify(cache)); }catch(e){}
    return {inP:np,outP:eski};
  }catch(e){ dbg('botClubTransfer',e); return null; }
}
/* ── Faz 4.1: Transfer pazarlığı — kararı OYUNCU verir (kulüp değil), kişiliğine göre. ──
   Teklif/istek oranı + ruh hali + kişilik (para/sadakat) → sigmoid kabul olasılığı.
   "Beklenenin aksine" küçük rastgelelik payı (kararsız oyuncuda daha yüksek), ama kişilik ana eğilimi belirler. */
function playerAcceptsOffer(player,offer,asking,opts){
  opts=opts||{};
  const k=(typeof kisilikInfo==='function')?kisilikInfo(player&&player.kisilik):{para:1,sadakat:1};
  const ratio=asking>0?offer/asking:1;
  const mood=Number(player&&player.mood!=null?player.mood:70);
  let score=(ratio-1)*1.4*k.para;                 /* teklif istenen bedelin üstündeyse +, altındaysa − */
  score+=(mood<45?0.5:mood>75?-0.25:0);           /* mutsuz oyuncu daha çok gitmek ister */
  score-=(k.sadakat-1)*0.55;                      /* sadık / şehir bağımlısı ayrılmaya direnç gösterir */
  if(opts.betterTeam) score+=0.6*k.para;          /* hırslı/parasever daha iyi kulübe atlamaya meyilli */
  const noise=(Math.random()-0.5)*((player&&player.kisilik==='kararsiz')?1.5:0.5);
  score+=noise;                                   /* kişilik ana eğilim; küçük sürpriz payı */
  const prob=1/(1+Math.exp(-score*1.6));
  return {accept:Math.random()<prob,wantsToGo:score>0.15,prob,score};
}
/* Gün ilerledikçe (maç sonrası) kullanıcının oyuncularına AI kulüplerden teklif gelebilir.
   KRİTİK KURAL: kullanıcının oyuncusu ne kadar "gitmek istese" de satış KULLANICININ ONAYINA düşer. */
function maybeIncomingOffers(){
  try{
    if(!G.team||!Array.isArray(G.players)||G.players.length<=10) return;
    G.pendingOffers=Array.isArray(G.pendingOffers)?G.pendingOffers:[];
    if(G.pendingOffers.length>=3) return;
    if(Math.random()>0.26) return; /* her gün ilerlemede ~%26 */
    const cands=G.players.filter(p=>p&&!(typeof playerIsInjured==='function'&&playerIsInjured(p)));
    if(cands.length<=10) return;
    const ranked=cands.slice().sort((a,b)=>((b.genel||0)+((b.mood||70)<50?15:0))-((a.genel||0)+((a.mood||70)<50?15:0)));
    const pick=ranked[Math.floor(Math.random()*Math.min(5,ranked.length))];
    if(!pick||G.pendingOffers.some(o=>o.playerId===pick.id)) return;
    const peers=(typeof userLeaguePeers==='function')?userLeaguePeers():[];
    const club=peers.length?ch(peers):'Bir kulüp';
    const asking=transferFeeKR(pick);
    const offer=Math.round(asking*(0.7+Math.random()*0.65)); /* %70..135 */
    const dec=playerAcceptsOffer(pick,offer,asking,{betterTeam:Math.random()<0.5});
    if(!dec.wantsToGo&&Math.random()<0.6) return;  /* oyuncu ilgilenmiyorsa çoğu teklif düşer */
    G.pendingOffers.push({playerId:pick.id,playerName:pick.isim,poz:pick.poz,genel:pick.genel,club,offer,asking,wantsToGo:dec.wantsToGo,kisilik:pick.kisilik});
    if(typeof showIncomingOfferModal==='function') showIncomingOfferModal();
  }catch(e){ dbg('incoming offer',e); }
}
/** Bot kulüpler haftalık form/transfer hareketi yapar — güçleri sezon içinde değişir. */
function aiWeeklyLeagueActivity(){
  try{
    if(!G.team||!G.season) return;
    const sub=getTblState().subs[G.team.tblKey];
    if(!sub||!sub.teams) return;
    const peers=sub.teams.filter(n=>n&&n!==G.team.isim);
    if(!peers.length) return;
    G.season.drift=G.season.drift||{};
    const n=rand(1,2);
    for(let i=0;i<n;i++){
      const t=ch(peers);
      const delta=rand(-12,18)/10;
      G.season.drift[t]=Math.max(-6,Math.min(8,(G.season.drift[t]||0)+delta));
      if(delta>0.5){
        const fee=rand(4000,80000);
        const tr=botClubTransfer(t,G.team.tblKey);
        const isim=tr?tr.inP.isim:`${ch(ILK)} ${ch(SY)}`;
        const detay=tr?` (OVR ${tr.inP.genel}, ${tr.outP.isim} yerine)`:'';
        pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--blue);">💰 <strong>${escMatch(t)}</strong> kadrosunu güçlendirdi: <strong>${escMatch(isim)}</strong>${detay} — ${fmtn(fee)} KR</div>`);
      }
    }
  }catch(e){ dbg('aiWeekly',e); }
}

/** Oyun günü 7'nin katlarını geçtikçe: maaş+bakım kesilir, koç bonusları ve bot hareketleri işler. */
function processEconomyWeeks(){
  if(!G.team) return;
  if(G.lastEcoDay==null) G.lastEcoDay=1;
  if(G.gameDay<G.lastEcoDay) G.lastEcoDay=1; /* yeni sezonda gün sıfırlanır */
  let guard=0;
  while((G.gameDay||1)-G.lastEcoDay>=7 && guard++<12){
    G.lastEcoDay+=7;
    const w=weeklyWageBill();
    txn('Haftalık maaş + bakım',-w.top);
    applyWeeklyCoachBonuses();
    processScoutingWeek(); /* Faz 5.1: izci ağı otomatik keşif */
    aiWeeklyLeagueActivity();
    pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--red);">🧾 Haftalık gider: <strong>-${fmtn(w.top)} KR</strong> (oyuncu ${fmtn(w.oy)} · koç ${fmtn(w.ko)}${w.iz?' · izci '+fmtn(w.iz):''} · arena ${fmtn(w.ar)})</div>`);
    processBankruptcy();
  }
}

/** Zorunlu satış: en yüksek maaşlı oyuncuyu değerinin %80'iyle satar (maaş yükünü de azaltır). Kadro min 8. */
function forcedPlayerSale(){
  if(!G.players||G.players.length<=8) return null;
  const p=G.players.slice().sort((a,b)=>(Number(b.maas)||0)-(Number(a.maas)||0))[0];
  if(!p) return null;
  const gelir=Math.max(1,Math.round(transferFeeKR(p)*0.8));
  G.players=G.players.filter(x=>x.id!==p.id);
  txn('Zorunlu satış (mali kriz): '+p.isim,gelir);
  return {p,gelir};
}

/** Madde 25: game over YOK — kademeli mali baskı. Negatif kasa: 1. hafta uyarı, sonraki haftalar zorunlu satış. */
function processBankruptcy(){
  if(G.coins<0){
    G.bankruptWeeks=(Number(G.bankruptWeeks)||0)+1;
    if(G.bankruptWeeks===1){
      showNotif('⚠️ Kulüp mali sıkıntıda — maaşlar tam ödenemiyor. Federasyon/başkan devreye giriyor. Toparlanmazsan zorunlu oyuncu satışı başlar.',{critical:true});
      pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--red);">🏦 <strong>Mali uyarı:</strong> Kasa negatif (${fmtn(G.coins)} KR). Bir hafta içinde toparlanmazsa başkan zorunlu satışa başlayacak.</div>`);
    } else {
      let sold=0;
      while(G.coins<0 && sold<2 && G.players.length>8){
        const r=forcedPlayerSale();
        if(!r) break;
        sold++;
        pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--red);">🏦 <strong>Zorunlu satış:</strong> Başkan mali krizde <strong>${r.p.isim}</strong> oyuncusunu ${fmtn(r.gelir)} KR karşılığında sattı.</div>`);
      }
      if(sold){
        showNotif(`🏦 Mali kriz: başkan ${sold} oyuncuyu zorunlu sattı — maaş yükü azaldı, kasa toparlanıyor.`,{critical:true});
        updateCoins();
      } else {
        showNotif('🏦 Mali kriz sürüyor — satılacak oyuncu kalmadı (kadro asgaride). Galibiyetlerle toparlanmalısın.',{critical:true});
      }
    }
  } else if(G.bankruptWeeks){
    G.bankruptWeeks=0;
    pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--green);">✅ Kasa artıya döndü — mali kriz sona erdi.</div>`);
  }
}

// ===== BAŞARIMLAR =====
const ACHV=[
  {id:'ilkGalibiyet',ad:'İlk Galibiyet',desc:'İlk maçını kazan',ikon:'🏀'},
  {id:'seri5',ad:'Isınıyoruz',desc:'Bir sezonda 5 galibiyet',ikon:'🔥'},
  {id:'g10',ad:'Çift Hane',desc:'Bir sezonda 10 galibiyet',ikon:'💪'},
  {id:'sampiyon',ad:'Şampiyon',desc:'Sezonu 1. sırada bitir',ikon:'🏆'},
  {id:'transfer',ad:'İlk İmza',desc:'Marketten oyuncu transfer et',ikon:'✍️'},
  {id:'satis',ad:'Pazarlıkçı',desc:'Bir oyuncunu sat',ikon:'💼'},
  {id:'zengin',ad:'Kasa Doldu',desc:'100.000 KR bakiyeye ulaş',ikon:'💰'},
  {id:'megaArena',ad:'Mega Arena',desc:'Arenayı son seviyeye getir',ikon:'🏟️'},
  {id:'altyapi',ad:'Gençlerin Gücü',desc:'Altyapıdan oyuncu yükselt',ikon:'🌱'},
  {id:'sezonTamam',ad:'Maraton',desc:'Bir sezonu tamamla',ikon:'🎽'},
  {id:'ligBirinci',ad:'Lig Lideri',desc:'Düzenli sezonu 1. sırada bitir',ikon:'🥇'},
  {id:'playoffSampiyon',ad:'Playoff Kralı',desc:'Playoff şampiyonu ol',ikon:'👑'},
  {id:'seri10',ad:'Yenilmezler',desc:'Üst üste 10 galibiyet serisi yakala',ikon:'🔥'},
  {id:'mvpOyuncu',ad:'Yıldız Doğuyor',desc:'Bir maçta MVP çıkar',ikon:'⭐'},
  {id:'ustLig',ad:'Yükseliş',desc:'Bir üst lige çık',ikon:'📈'}
];
