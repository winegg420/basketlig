function basketballPortraitDataUri(seed,salt,opts){
  opts=opts||{};
  const market=!!opts.market;
  const ovrN=opts.ovr!=null&&opts.ovr!==''?Number(opts.ovr):NaN;
  const jerseyNum=market?null:Math.min(99,Math.max(0,Number.isFinite(ovrN)?Math.round(ovrN):10+(hash32(String(seed)+'jn')%90)));

  const raw=String(seed)+'|'+String(salt??'')+'|v13portrait';
  const h1=hash32(raw);
  const h2=hash32(raw.split('').reverse().join(''))^h1;
  const h3=hash32(raw+'|bust');
  const gid='p'+((h1^h2)%99991);
  const ink='#161616';
  const inkSoft='#2a2a2a';

  const studio=['#0c1929','#1a1033','#0f2418','#24120c','#141820','#1e1030'];
  const palLight=['#2563eb','#dc2626','#d97706','#16a34a','#7c3aed','#0d9488','#be185d','#eab308','#64748b','#ea580c','#db2777','#4f46e5','#059669','#78716c'];
  const palDark=['#172554','#450a0a','#713f12','#14532d','#3b0764','#134e4a','#831843','#713f12','#334155','#7c2d12','#701a45','#312e81','#064e3b','#44403c'];
  const pi=h1%palLight.length;
  const jl=palLight[pi];
  const jd=palDark[pi];

  const skinBase=['#8d5524','#c68642','#d4a574','#b87333','#e8c4a8','#a67c52','#6b4423','#dcb896'][h2%8];

  const bg=studio[h2%studio.length];
  const hairCol=['#0a0a0a','#1c1917','#3d2b1f','#57534e','#78716c','#92400e','#ca8a04','#fef3c7','#9ca3af'][h3%9];
  const hairStyle=(h2>>2)%8;
  const beardId=(h3>>1)%6;
  const headbandOn=(h1%5)===0;
  const bandFill=['#b91c1c','#f8fafc','#1e3a8a','#0f766e','#ea580c','#eab308','#7c3aed'][h2%7];

  function darkenHex(hex,f){
    const x=hex.replace('#','');
    if(x.length!==6) return hex;
    const r=Math.round(parseInt(x.slice(0,2),16)*f);
    const g=Math.round(parseInt(x.slice(2,4),16)*f);
    const b=Math.round(parseInt(x.slice(4,6),16)*f);
    return '#'+[r,g,b].map(v=>Math.min(255,v).toString(16).padStart(2,'0')).join('');
  }

  const skinMid=darkenHex(skinBase,0.88);
  const skinDark=darkenHex(skinBase,0.72);

  const torso=`<path d="M 2 112 L 5 79 Q 44 72 83 79 L 86 112 Z" fill="url(#${gid}j)" stroke="${ink}" stroke-width="1.05" stroke-opacity="0.42"/>`;
  const neck=`<path d="M 36.5 55.5 Q 44 58.5 51.5 55.5 L 54 71.5 Q 44 76 34 71.5 Z" fill="${skinBase}" stroke="${ink}" stroke-width="1.1" stroke-linejoin="round"/>
<path d="M 35.5 58 Q 33 65 34.5 71" fill="none" stroke="${skinDark}" stroke-width="1.4" opacity="0.45"/>
<path d="M 52.5 58 Q 55 65 53.5 71" fill="none" stroke="${skinDark}" stroke-width="1.4" opacity="0.45"/>`;
  const collar=`<path d="M 33.5 70.5 Q 44 74 54.5 70.5" fill="none" stroke="${ink}" stroke-width="0.85" opacity="0.6"/>`;
  const face=`<ellipse cx="44" cy="41" rx="14.2" ry="17" fill="${skinBase}" stroke="${ink}" stroke-width="1.05" stroke-linejoin="round"/>
<path d="M32 50 Q44 55.5 56 50" fill="none" stroke="${skinDark}" stroke-width="1.35" stroke-linecap="round" opacity="0.38"/>`;
  const ears=`<ellipse cx="29.5" cy="40" rx="2.5" ry="3.8" fill="${skinBase}" stroke="${ink}" stroke-width="0.95"/><ellipse cx="58.5" cy="40" rx="2.5" ry="3.8" fill="${skinBase}" stroke="${ink}" stroke-width="0.95"/>`;
  const chinShadow=`<path d="M 37 54 Q44 57 51 54" fill="none" stroke="${skinDark}" stroke-width="1.8" stroke-linecap="round" opacity="0.38"/>`;
  const eyes=`<ellipse cx="37" cy="37.5" rx="3.6" ry="2.8" fill="#fefce8" stroke="${ink}" stroke-width="0.85"/>
<ellipse cx="51" cy="37.5" rx="3.6" ry="2.8" fill="#fefce8" stroke="${ink}" stroke-width="0.85"/>
<ellipse cx="37.8" cy="37.8" rx="1.5" ry="1.65" fill="#0f172a"/>
<ellipse cx="50.2" cy="37.8" rx="1.5" ry="1.65" fill="#0f172a"/>
<circle cx="36.8" cy="37.1" r="0.42" fill="#fff"/><circle cx="49.2" cy="37.1" r="0.42" fill="#fff"/>
<path d="M 40.5 45 Q44 43 47.5 45" fill="none" stroke="${inkSoft}" stroke-width="0.75" stroke-linecap="round" opacity="0.9"/>`;
  const mouth=`<path d="M 37.5 50 Q44 52.2 50.5 50" fill="none" stroke="${ink}" stroke-width="1.1" stroke-linecap="round"/><path d="M 38.2 50.3 Q44 51.6 49.8 50.3" fill="none" stroke="rgba(55,35,25,0.75)" stroke-width="0.75" stroke-linecap="round"/>`;
  const sleeves=`<path d="M 6 80 L 4 92 L 6 112 L 24 112 L 26 88 L 22 76 Z" fill="${skinMid}" stroke="${ink}" stroke-width="1" stroke-linejoin="round"/>
<path d="M 82 80 L 84 92 L 82 112 L 64 112 L 62 88 L 66 76 Z" fill="${skinMid}" stroke="${ink}" stroke-width="1" stroke-linejoin="round"/>`;

  let hairSvg='';
  if(hairStyle===0){
    hairSvg=`<ellipse cx="44" cy="26" rx="15" ry="5" fill="${hairCol}" stroke="${ink}" stroke-width="1.1"/><path d="M30 26 L58 26" stroke="${hairCol}" stroke-width="2.2" opacity="0.9"/>`;
  }else if(hairStyle===1){
    let hatch='';
    for(let i=0;i<9;i++){
      const x=31+i*3.2;
      hatch+=`<line x1="${x}" y1="18" x2="${x}" y2="28" stroke="${inkSoft}" stroke-width="0.55" opacity="0.55"/>`;
    }
    hairSvg=`<rect x="29" y="16" width="30" height="13" rx="2" fill="${hairCol}" stroke="${ink}" stroke-width="1.15"/>${hatch}`;
  }else if(hairStyle===2){
    hairSvg=`<path d="M28 30 Q44 18 60 30 Q58 24 44 22 Q30 24 28 30 Z" fill="${hairCol}" stroke="${ink}" stroke-width="1.1"/><path d="M32 28 h24 M34 25 h20" stroke="${inkSoft}" stroke-width="0.5" opacity="0.45"/>`;
  }else if(hairStyle===3){
    hairSvg=`<path d="M26 32 Q44 8 62 32 Q60 18 44 14 Q28 18 26 32 Z" fill="${hairCol}" stroke="${ink}" stroke-width="1.15"/><path d="M34 22 Q44 16 54 22" fill="none" stroke="${inkSoft}" stroke-width="0.6" opacity="0.5"/>`;
  }else if(hairStyle===4){
    hairSvg=`<path d="M30 28 L34 18 L52 20 L58 30 Q44 24 30 28 Z" fill="${hairCol}" stroke="${ink}" stroke-width="1.05"/><path d="M36 22 Q44 19 52 22" fill="none" stroke="${inkSoft}" stroke-width="0.55"/>`;
  }else if(hairStyle===5){
    hairSvg=`<ellipse cx="44" cy="24" rx="16" ry="9" fill="${hairCol}" stroke="${ink}" stroke-width="1.1"/><path d="M32 22 Q44 17 56 22" fill="none" stroke="${inkSoft}" stroke-width="0.65" opacity="0.4"/>`;
  }else if(hairStyle===6){
    hairSvg=`<path d="M30 27 Q44 20 58 27 L56 33 Q44 29 32 33 Z" fill="${hairCol}" stroke="${ink}" stroke-width="1"/>`;
  }else{
    hairSvg=`<path d="M27 31 Q44 14 61 31 L58 36 Q44 30 30 36 Z" fill="${hairCol}" stroke="${ink}" stroke-width="1.1"/>`;
  }

  let beardSvg='';
  if(beardId===1){
    for(let i=0;i<12;i++){
      const a=h1+i*97;
      const bx=34+(a%17);
      const by=47+((a>>3)%4);
      beardSvg+=`<circle cx="${bx}" cy="${by}" r="0.45" fill="rgba(30,20,14,0.55)"/>`;
    }
  }else if(beardId===2){
    beardSvg=`<path d="M37 47 Q44 46 51 47" fill="none" stroke="${hairCol}" stroke-width="1.05" stroke-linecap="round"/>`;
  }else if(beardId===3){
    beardSvg=`<path d="M40 47 L41 52 Q44 55 47 52 L48 47 Z" fill="${hairCol}" stroke="${ink}" stroke-width="0.75" opacity="0.92"/>`;
  }else if(beardId===4){
    beardSvg=`<path d="M33 44 Q44 58 55 44 Q52 50 44 54 Q36 50 33 44" fill="${hairCol}" stroke="${ink}" stroke-width="1" opacity="0.88"/><path d="M37 45 Q44 42 51 45" fill="none" stroke="${ink}" stroke-width="0.65"/>`;
  }else if(beardId===5){
    beardSvg=`<path d="M38 48.5 Q44 53 50 48.5" fill="none" stroke="${hairCol}" stroke-width="1.8" stroke-linecap="round"/>`;
  }

  const bandSvg=headbandOn
    ?`<g><path d="M29 31 Q44 27 59 31 L58.5 35 Q44 31.5 29.5 35 Z" fill="${bandFill}" stroke="${ink}" stroke-width="1"/><path d="M32 32 Q44 29.5 56 32" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.65"/></g>`
    :'';

  const numSvg=(jerseyNum!=null)?`<text x="44" y="102" text-anchor="middle" fill="rgba(248,250,252,0.95)" font-family="Arial Black,Arial,sans-serif" font-size="${jerseyNum>=10?16:18}" font-weight="900">${jerseyNum}</text>`:'';

  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="88" height="112" viewBox="0 0 88 112">
<defs>
<linearGradient id="${gid}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="${bg}"/></linearGradient>
<radialGradient id="${gid}sp" cx="50%" cy="36%" r="52%"><stop offset="0" stop-color="rgba(255,255,255,0.16)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient>
<linearGradient id="${gid}j" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${jl}"/><stop offset="1" stop-color="${jd}"/></linearGradient>
</defs>
<rect width="88" height="112" rx="9" fill="url(#${gid}bg)"/>
<ellipse cx="44" cy="54" rx="38" ry="40" fill="url(#${gid}sp)"/>
${torso}
${sleeves}
${neck}
${collar}
${face}
${ears}
${chinShadow}
${eyes}
${mouth}
${beardSvg}
${bandSvg}
${hairSvg}
${numSvg}
</svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
/** assets/portraits/ içindeki gerçek dosya sayısıyla eşit tutulmalı (tools/generate-portraits.py). */
const PORTRAIT_POOL_SIZE=201;
const PORTRAIT_POOL_BASE='assets/portraits/p_';
const PORTRAIT_ETH=['African American man','Turkish man','Japanese man','Irish man','Nigerian man','Colombian man','Russian man','Italian man','Brazilian man','German man','Spanish man','Korean man','French man','Greek man','Polish man','Mexican man','Canadian man','Australian man','Serbian man','Lithuanian man'];
const PORTRAIT_JERSEY=['blue white basketball jersey','green basketball jersey','red white basketball jersey','purple yellow basketball jersey','black athletic shirt','grey hoodie','white t-shirt','orange basketball jersey'];
function portraitPoolIndex(seed,salt){
  return Math.abs(hash32(String(seed)+'|'+String(salt??'')+'|photoPool'))%PORTRAIT_POOL_SIZE;
}
function playerPortraitFile(seed,salt){
  const i=portraitPoolIndex(seed,salt);
  return PORTRAIT_POOL_BASE+String(i).padStart(4,'0')+'.jpg';
}
function playerPortraitPhotoUrl(seed,salt){
  const raw=String(seed)+'|'+String(salt??'')+'|v2';
  const h1=hash32(raw);
  const h2=hash32(raw.split('').reverse().join(''));
  const eth=PORTRAIT_ETH[h1%PORTRAIT_ETH.length];
  const jersey=PORTRAIT_JERSEY[(h1>>>8)%PORTRAIT_JERSEY.length];
  const look=['short hair','curly hair','buzz cut','beard','clean shaven','strong jawline','athletic build'][(h2>>>4)%7];
  const age=19+(h2%17);
  const prompt=encodeURIComponent(
    'professional basketball player portrait headshot, '+eth+', '+jersey+', '+look+
    ', age '+age+', neutral light gray studio background, photorealistic, front facing, chest up, soft lighting, no text, no watermark'
  );
  return 'https://image.pollinations.ai/prompt/'+prompt+'?seed='+h1+'&width=256&height=320&nologo=true';
}
/** Yedek zinciri: yerel dosya → komşu yerel dosya → canlı API (çevrimiçiyse) → SVG (son çare).
 *  Amaç: aynı kadroda foto/karikatür karışımı olmaması — SVG'ye yalnızca hiçbir foto yüklenemezse düşülür. */
function playerAvatarSvgFallback(el){
  if(!el||!el.dataset) return;
  const seed=el.dataset.avSeed||'';
  const salt=el.dataset.avSalt||'';
  const step=Number(el.dataset.avStep||0);
  try{
    if(!window.__charazaySvgPortraits){
      if(step===0){
        el.dataset.avStep='1';
        const i=(portraitPoolIndex(seed,salt)+1)%PORTRAIT_POOL_SIZE;
        el.src=PORTRAIT_POOL_BASE+String(i).padStart(4,'0')+'.jpg';
        return;
      }
      if(step===1&&navigator.onLine!==false){
        el.dataset.avStep='2';
        el.src=playerPortraitPhotoUrl(seed,salt);
        return;
      }
    }
  }catch(e){}
  let opts={};
  try{ opts=JSON.parse(el.dataset.avOpts||'{}'); }catch(e){}
  el.src=basketballPortraitDataUri(seed,salt,opts);
  el.onerror=null;
}
function playerAvatar(seed,salt,opts){
  opts=typeof opts==='object'&&opts?opts:{};
  if(window.__charazaySvgPortraits) return basketballPortraitDataUri(seed,salt,opts);
  return playerPortraitFile(seed,salt);
}
function playerAvatarImgAttrs(seed,salt,opts){
  const o=typeof opts==='object'&&opts?opts:{};
  const esc=v=>String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  /* F7-30: alt yoktu — ekran okuyucu dosya adını okuyordu. Portre dekoratif olduğu için
     boş alt doğrusu (isim zaten yanındaki metinde geçiyor); çağıran alt verirse ezmez. */
  return `alt="" data-av-seed="${esc(seed)}" data-av-salt="${esc(salt??'')}" data-av-opts="${esc(JSON.stringify(o))}" onerror="playerAvatarSvgFallback(this)"`;
}
/** Koç portresi: oyuncu havuzunu paylaşır (ayrı havuz üretmeye gerek yok).
 *  Koç-özel seed ile foto stabil ve oyunculardan farklı bir index'e düşer. */
function coachSeedOf(c){ return 'coach_'+String((c&&c.id)||'')+'_'+String((c&&c.ad)||''); }
function coachAvatar(c){ return playerAvatar(coachSeedOf(c),(c&&c.ad)||'',{}); }
function coachAvatarAttrs(c){ return playerAvatarImgAttrs(coachSeedOf(c),(c&&c.ad)||'',{}); }

/** Antrenmanda yaş / potansiyel boşluğuna göre çarpan (genç + yüksek pot = hızlı gelişim) */
function trainingGrowthMult(p){
  const y=Number(p.yas)||25;
  const pot=Number(p.potansiyel!=null?p.potansiyel:p.genel);
  const room=Math.max(0,pot-Number(p.genel));
  let m=1;
  if(y<=17) m+=0.5;
  else if(y<=18) m+=0.38;
  else if(y<=19) m+=0.26;
  else if(y<=20) m+=0.14;
  else if(y<=22) m+=0.06;
  m+=Math.min(0.85,room*0.028);
  if(p.academyProspect) m+=0.12;
  return m;
}

