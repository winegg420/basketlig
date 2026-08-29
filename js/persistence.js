function unlockAchievement(id){
  if(!G) return;
  G.achievements=G.achievements||{};
  if(G.achievements[id]) return;
  G.achievements[id]=Date.now();
  const a=ACHV.find(x=>x.id===id);
  showNotif('🏆 Başarım açıldı: '+(a?a.ad:id));
  sfx('achv');
  scheduleGameSave();
}
function openAchievementsModal(){
  const got=G.achievements||{};
  const rows=ACHV.map(a=>{
    const ok=!!got[a.id];
    return `<div style="display:flex;gap:10px;align-items:center;padding:10px;background:var(--bg3);border-radius:10px;margin-bottom:6px;border:1px solid ${ok?'rgba(251,191,36,0.4)':'var(--border)'};${ok?'':'opacity:0.5;'}">
      <span style="font-size:22px;">${ok?a.ikon:'🔒'}</span>
      <div><div style="font-weight:700;font-size:13px;">${a.ad}</div><div style="font-size:11px;color:var(--text2);">${a.desc}</div></div>
      ${ok?`<span style="margin-left:auto;font-size:10px;color:var(--gold);">${new Date(got[a.id]).toLocaleDateString(typeof getLang==='function'&&getLang()==='en'?'en-GB':'tr-TR')}</span>`:''}
    </div>`;
  }).join('');
  showAppModal(`<div class="modal-title">🏆 Başarımlar (${Object.keys(got).length}/${ACHV.length})</div>${rows}`);
}

// ===== SES EFEKTLERİ (WebAudio — dosya yok, prosedürel sentez; ayarlardan kapatılabilir) =====
/* Paket 3: basit tek-osilatör bipler yerine çok katmanlı sentetik sesler (gürültü tabanlı
   file/düdük/kalabalık + zarflı ton motifleri). Dosya indirilmez — tamamen Web Audio.
   Efekt (sfxVol) ve kalabalık ambiyansı (ambVol) ayrı ses seviyeleriyle ayarlanır.
   Herhangi bir katman kurulamazsa eski tek-ton yedeğe (_sfxBeep) düşülür. */
let _audioCtx=null,_noiseBuf=null,_amb=null;
function _sfxVol(){ const v=G&&G.settings&&G.settings.sfxVol; return (v==null?70:Number(v))/100; }
function _ambVol(){ const v=G&&G.settings&&G.settings.ambVol; return (v==null?35:Number(v))/100; }
function _ctx(){
  _audioCtx=_audioCtx||new (window.AudioContext||window.webkitAudioContext)();
  if(_audioCtx.state==='suspended') _audioCtx.resume();
  return _audioCtx;
}
function _noise(){
  const c=_ctx();
  if(_noiseBuf) return _noiseBuf;
  const b=c.createBuffer(1,c.sampleRate*2,c.sampleRate);
  const d=b.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  _noiseBuf=b; return b;
}
/* Zarflı tek ton (eski davranışın iyileştirilmiş hali + genel yedek). */
function _sfxBeep(freq,dur,vol,type){
  const c=_ctx(),t=c.currentTime;
  const o=c.createOscillator(),g=c.createGain();
  o.type=type||'sine'; o.frequency.value=freq;
  o.connect(g); g.connect(c.destination);
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001,(vol||0.05)*_sfxVol()),t+0.012);
  g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.start(t); o.stop(t+dur+0.03);
}
/* Kısa gürültü vuruşu (file hışırtısı, top teması) — bandpass'li. */
function _sfxNoise(freq,q,dur,vol,delay){
  const c=_ctx(),t=c.currentTime+(delay||0);
  const s=c.createBufferSource(); s.buffer=_noise();
  const f=c.createBiquadFilter(); f.type='bandpass'; f.frequency.value=freq; f.Q.value=q||1;
  const g=c.createGain();
  s.connect(f); f.connect(g); g.connect(c.destination);
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001,(vol||0.05)*_sfxVol()),t+0.015);
  g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  s.start(t); s.stop(t+dur+0.05);
}
/* Nota dizisi motifi (zafer/kayıp/başarım). */
function _sfxMotif(notes,step,dur,vol,type){
  notes.forEach((f,i)=>{
    const c=_ctx(),t=c.currentTime+i*step;
    const o=c.createOscillator(),g=c.createGain();
    o.type=type||'triangle'; o.frequency.value=f;
    o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001,(vol||0.05)*_sfxVol()),t+0.02);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.start(t); o.stop(t+dur+0.04);
  });
}
function sfx(kind){
  try{
    if(!G||!G.settings||G.settings.sound===false) return;
    if(_sfxVol()<=0) return;
    switch(kind){
      case 'score':      /* file sesi: tatlı "swish" hışırtısı + alçak çember teması */
        _sfxNoise(3400,1.1,0.16,0.10);
        _sfxNoise(900,2.5,0.09,0.045,0.02);
        _crowdSwell(0.5);
        return;
      case 'whistle':{   /* hakem düdüğü: iki yakın frekans + titreşim (roll) */
        const c=_ctx(),t=c.currentTime;
        [2093,2217].forEach(fr=>{
          const o=c.createOscillator(),g=c.createGain(),l=c.createOscillator(),lg=c.createGain();
          o.type='square'; o.frequency.value=fr;
          l.type='sine'; l.frequency.value=34; lg.gain.value=0.35;  /* pea-whistle titremesi */
          l.connect(lg); lg.connect(g.gain);
          o.connect(g); g.connect(c.destination);
          g.gain.setValueAtTime(0.0001,t);
          g.gain.exponentialRampToValueAtTime(0.030*_sfxVol(),t+0.02);
          g.gain.setValueAtTime(0.030*_sfxVol(),t+0.24);
          g.gain.exponentialRampToValueAtTime(0.001,t+0.32);
          o.start(t); o.stop(t+0.36); l.start(t); l.stop(t+0.36);
        });
        return;
      }
      case 'bounce':     /* top sekmesi: alçak tok vuruş, hızlı sönüm */
        _sfxNoise(180,1.6,0.07,0.07);
        _sfxBeep(95,0.09,0.05,'sine');
        return;
      case 'pass':       /* asist pası: çok kısa/kısık "vuuş" — görsel pasla senkron, yormaz */
        _sfxNoise(1500,0.8,0.035,0.05);
        return;
      case 'buzzer':     /* çeyrek sonu kornası */
        _sfxBeep(224,0.55,0.075,'sawtooth');
        _sfxBeep(112,0.55,0.05,'square');
        return;
      case 'win':  _sfxMotif([523,659,784,1047],0.13,0.34,0.06); _crowdSwell(1.0); return;
      case 'lose': _sfxMotif([392,330,262],0.16,0.38,0.05,'sine'); return;
      case 'achv': _sfxMotif([988,1319],0.09,0.30,0.055); return;
      case 'notif': _sfxBeep(660,0.09,0.045); return;
      default: _sfxBeep(440,0.06,0.045);
    }
  }catch(e){
    try{ _sfxBeep(440,0.06,0.045); }catch(_){}
  }
}
/* ── Kalabalık ambiyansı: alçak geçirilmiş gürültü döngüsü; maç boyunca çalar,
   sayı/zafer anında kısa coşku dalgası (_crowdSwell) yükselir. ── */
function startCrowdAmbience(){
  try{
    if(!G||!G.settings||G.settings.sound===false) return;
    if(_amb||_ambVol()<=0) return;
    const c=_ctx();
    const s=c.createBufferSource(); s.buffer=_noise(); s.loop=true;
    const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=750;
    const g=c.createGain(); g.gain.value=0.0001;
    const lfo=c.createOscillator(),lg=c.createGain();
    lfo.type='sine'; lfo.frequency.value=0.17; lg.gain.value=0.006*_ambVol();  /* uğultu dalgalanması */
    lfo.connect(lg); lg.connect(g.gain);
    s.connect(f); f.connect(g); g.connect(c.destination);
    s.start(); lfo.start();
    g.gain.exponentialRampToValueAtTime(Math.max(0.001,0.022*_ambVol()),c.currentTime+1.2);
    _amb={s,f,g,lfo};
  }catch(e){}
}
function stopCrowdAmbience(){
  try{
    if(!_amb) return;
    const c=_ctx(),a=_amb; _amb=null;
    a.g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.8);
    setTimeout(()=>{ try{ a.s.stop(); a.lfo.stop(); }catch(e){} },900);
  }catch(e){ _amb=null; }
}
function _crowdSwell(k){
  try{
    if(!_amb||_ambVol()<=0) return;
    const c=_ctx(),t=c.currentTime,base=0.022*_ambVol();
    _amb.g.gain.cancelScheduledValues(t);
    _amb.g.gain.setValueAtTime(Math.max(0.001,base),t);
    _amb.g.gain.exponentialRampToValueAtTime(Math.max(0.001,base*(2.4+k)),t+0.25);
    _amb.g.gain.exponentialRampToValueAtTime(Math.max(0.001,base),t+1.6);
  }catch(e){}
}
function setAmbienceVolume(){
  try{
    if(!_amb) return;
    if(_ambVol()<=0){ stopCrowdAmbience(); return; }
    _amb.g.gain.setTargetAtTime(Math.max(0.001,0.022*_ambVol()),_ctx().currentTime,0.15);
  }catch(e){}
}

// ===== AYARLAR =====
/* Erişilebilirlik: html köküne sınıf uygular (CSS: html.a11y-big / html.a11y-contrast). */
function applyA11ySettings(){
  try{
    const s=(G&&G.settings)||{};
    document.documentElement.classList.toggle('a11y-big',!!s.a11yBig);
    document.documentElement.classList.toggle('a11y-contrast',!!s.a11yContrast);
  }catch(e){}
}
let _autosaveTimer=null;
function applyAutosaveSetting(){
  if(_autosaveTimer){ clearInterval(_autosaveTimer); _autosaveTimer=null; }
  const sec=Number(G&&G.settings&&G.settings.autosaveSec);
  if(!sec||sec<=0) return;
  _autosaveTimer=setInterval(()=>{
    try{
      if(document.getElementById('app')&&document.getElementById('app').style.display!=='none'&&G&&G.team) saveGameNow(false);
    }catch(e){}
  },sec*1000);
}

function openSettingsModal(){
  const s=G.settings||{sound:true,autosaveSec:12};
  const opt=(v,cur,label)=>`<option value="${v}" ${Number(cur)===v?'selected':''}>${label}</option>`;
  showAppModal(`<div class="modal-title">⚙️ Ayarlar</div>
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="padding:12px;background:var(--bg3);border-radius:10px;">
        <div style="font-size:13px;margin-bottom:7px;">🌍 Dil / Language</div>
        <div class="lang-row" style="justify-content:flex-start;">${langPickerHtml()}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:6px;">Dil değişince oyun yeniden yüklenir — ilerlemen korunur.</div>
      </div>
      <label style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg3);border-radius:10px;cursor:pointer;">
        <span style="font-size:13px;">🔊 Ses efektleri</span>
        <input type="checkbox" id="setSound" ${s.sound!==false?'checked':''} onchange="G.settings.sound=this.checked;scheduleGameSave();if(this.checked)sfx('notif');else stopCrowdAmbience();">
      </label>
      <div style="padding:12px;background:var(--bg3);border-radius:10px;display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;">
          <span style="font-size:12px;white-space:nowrap;">🎚️ Efekt sesi</span>
          <input type="range" min="0" max="100" step="5" value="${s.sfxVol!=null?s.sfxVol:70}" style="flex:1;max-width:170px;accent-color:var(--accent);" oninput="G.settings.sfxVol=Number(this.value);" onchange="scheduleGameSave();sfx('score');">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;">
          <span style="font-size:12px;white-space:nowrap;">🏟️ Kalabalık ambiyansı</span>
          <input type="range" min="0" max="100" step="5" value="${s.ambVol!=null?s.ambVol:35}" style="flex:1;max-width:170px;accent-color:var(--accent);" oninput="G.settings.ambVol=Number(this.value);setAmbienceVolume();" onchange="scheduleGameSave();">
        </label>
      </div>
      <label style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg3);border-radius:10px;cursor:pointer;">
        <span style="font-size:13px;">🔍 Büyük yazı</span>
        <input type="checkbox" ${s.a11yBig?'checked':''} onchange="G.settings.a11yBig=this.checked;applyA11ySettings();scheduleGameSave();">
      </label>
      <label style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg3);border-radius:10px;cursor:pointer;">
        <span style="font-size:13px;">🌓 Yüksek kontrast</span>
        <input type="checkbox" ${s.a11yContrast?'checked':''} onchange="G.settings.a11yContrast=this.checked;applyA11ySettings();scheduleGameSave();">
      </label>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg3);border-radius:10px;">
        <span style="font-size:13px;">💾 Otomatik kayıt sıklığı</span>
        <select onchange="G.settings.autosaveSec=Number(this.value);applyAutosaveSetting();scheduleGameSave();showNotif('Otomatik kayıt güncellendi.');" style="background:var(--bg4);border:1px solid var(--border);border-radius:8px;padding:6px 10px;color:var(--text);font-size:12px;">
          ${opt(5,s.autosaveSec,'5 saniye')}${opt(12,s.autosaveSec,'12 saniye (önerilen)')}${opt(30,s.autosaveSec,'30 saniye')}${opt(0,s.autosaveSec,'Kapalı (elle)')}
        </select>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:12px;">
        <div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Kayıt yönetimi</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="btn-sm" onclick="exportGameJson()">📤 Dışa aktar (.json)</button>
          <button type="button" class="btn-sm" onclick="document.getElementById('importSaveFile').click()">📥 İçe aktar</button>
          <button type="button" class="btn-sm btn-danger" id="delSaveBtn" onclick="confirmDeleteSave(this)">🗑 Kaydı sil</button>
        </div>
        <p id="saveStatusLine" style="font-size:10px;color:var(--text2);margin:10px 0 0;">Otomatik kayıt aktif</p>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:12px;">
        <div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Kayıt slotları (çoklu kariyer)</div>
        <div id="saveSlotList">${[1,2,3].map(n=>slotRowHtml(n)).join('')}</div>
        <p style="font-size:10px;color:var(--text2);margin:8px 0 0;">Slotlar otomatik kayıttan bağımsızdır — farklı kariyerleri buraya kaydedip yükleyebilirsin.</p>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="btn-sm" onclick="closeAppModal();showTutorial(0)">❓ Öğreticiyi göster</button>
        <button type="button" class="btn-sm" onclick="closeAppModal();openAchievementsModal()">🏆 Başarımlar</button>
      </div>
    </div>`);
}

/* Madde 32: manuel çoklu kayıt slotları (otomatik kayıttan ayrı anahtarlar). */
function slotKey(n){ return 'charazay_slot_'+n; }
function slotInfo(n){
  try{
    const raw=localStorage.getItem(slotKey(n));
    if(!raw) return null;
    const d=JSON.parse(raw);
    return {team:(d.team&&d.team.isim)||'—',at:d.savedAt||null,year:(d.season&&d.season.year)||'?'};
  }catch(e){ return null; }
}
function slotRowHtml(n){
  const inf=slotInfo(n);
  const label=inf?`<strong>${escMatch(inf.team)}</strong> · S${inf.year}${inf.at?` · ${new Date(inf.at).toLocaleDateString(typeof getLang==='function'&&getLang()==='en'?'en-GB':'tr-TR')}`:''}`:'<span style="color:var(--text2);">Boş slot</span>';
  return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg3);border-radius:9px;margin-bottom:6px;">
    <span style="flex:1;font-size:12px;">💾 Slot ${n}: ${label}</span>
    <button type="button" class="btn-sm" style="padding:4px 9px;font-size:11px;" onclick="saveToSlot(${n})">Kaydet</button>
    <button type="button" class="btn-sm" style="padding:4px 9px;font-size:11px;${inf?'':'opacity:.4;'}" ${inf?'':'disabled'} onclick="loadFromSlot(${n})">Yükle</button>
  </div>`;
}
function saveToSlot(n){
  if(!G||!G.team){ showNotif('Kaydedilecek aktif oyun yok.'); return; }
  try{
    localStorage.setItem(slotKey(n),JSON.stringify(serializeGameState()));
    showNotif(`💾 Slot ${n}'e kaydedildi.`);
    const list=document.getElementById('saveSlotList');
    if(list) list.innerHTML=[1,2,3].map(k=>slotRowHtml(k)).join('');
  }catch(e){ showNotif('Slota yazılamadı (kota dolu olabilir).'); }
}
function loadFromSlot(n){
  const raw=localStorage.getItem(slotKey(n));
  if(!raw){ showNotif('Bu slot boş.'); return; }
  try{
    localStorage.setItem(GAME_SAVE_KEY,raw);
    showNotif(`Slot ${n} yükleniyor...`);
    setTimeout(()=>{ try{ location.reload(); }catch(e){} },450);
  }catch(e){ showNotif('Slot yüklenemedi.'); }
}

/** Kayıt silme iki adımlı — yanlışlıkla tek tıkla silinmesin. */
function confirmDeleteSave(btn){
  if(!btn.dataset.armed){
    btn.dataset.armed='1';
    btn.textContent='⚠️ Emin misin? Tekrar tıkla';
    setTimeout(()=>{ if(btn&&btn.dataset){ delete btn.dataset.armed; btn.textContent='🗑 Kaydı sil'; } },4000);
    return;
  }
  clearSavedGame();
  closeAppModal();
}

// ===== ÖĞRETİCİ =====
const TUT_STEPS=[
  {ikon:'🏀',baslik:'Hoş geldin, Menajer!',metin:'Bu oyunda bir basketbol kulübünü yönetiyorsun: kadro kur, maç kazan, geliri büyüt ve ligde yüksel. Bu kısa tur sana temel döngüyü gösterecek.'},
  {ikon:'📅',baslik:'Maçlar sayfası',metin:'Sol menüden <strong>Maçlar</strong>a gir. Sıradaki maçında <strong>Taktik ayarla</strong> ile tempo ve hücum odağını seç, sonra <strong>▶ Maçı Başlat</strong> ile canlı izle. Maçlar oynandıkça oyun günleri ilerler.'},
  {ikon:'💰',baslik:'Ekonomi',metin:'Her hafta oyuncu maaşları, koç maaşları ve arena bakımı kasandan düşer. Ev maçlarında <strong>bilet geliri</strong> kazanırsın — galibiyetler tribünü doldurur. Detaylar <strong>Bilanço</strong> sayfasında.'},
  {ikon:'👥',baslik:'Kadro ve transfer',metin:'<strong>Kadro</strong>da oyuncularını incele; <strong>Transfer Market</strong>ten yenilerini al, ihtiyaç fazlasını sat (bonservisin %85\'i kasaya girer). <strong>Altyapı</strong>daki gençleri yükseltmeyi unutma — bazıları ham elmas!'},
  {ikon:'💪',baslik:'Gelişim',metin:'<strong>Antrenman</strong> sayfasından takım veya bireysel antrenman başlat; birkaç oyun günü sonra gelişim işlenir. Koçlar her hafta zayıf oyunculara küçük bonuslar verir.'},
  {ikon:'⚡',baslik:'Enerji ve sakatlık riski',metin:'Oyuncuların enerjisi maç oynadıkça düşer. Düşük enerjiyle — özellikle art arda — sahaya sürdüğün oyuncularda <strong>sakatlanma riski artar</strong>. Kadro ve İlk 5 ekranlarındaki ⚡ göstergesini takip et; 🥵 art arda yorgun oynayanı, 🩹 sakatlıktan yeni döneni işaretler. Riskli oyuncuları dinlendir.'},
  {ikon:'🏆',baslik:'Hedef',metin:'İlk 5\'te bitir, üst lige yüksel, başarımları topla (sağ üstteki 🏆). Ayarlara ⚙️ simgesinden ulaşabilirsin. Bol şans!'}
];
function showTutorial(step){
  const i=Math.max(0,Math.min(TUT_STEPS.length-1,Number(step)||0));
  const st=TUT_STEPS[i];
  const son=i===TUT_STEPS.length-1;
  showAppModal(`<div style="text-align:center;padding:8px 4px;">
    <div style="font-size:44px;margin-bottom:10px;">${st.ikon}</div>
    <div class="modal-title" style="text-align:center;">${st.baslik}</div>
    <p style="font-size:13px;color:var(--text2);line-height:1.6;max-width:420px;margin:0 auto 18px;">${st.metin}</p>
    <div style="display:flex;gap:6px;justify-content:center;margin-bottom:16px;">
      ${TUT_STEPS.map((_,k)=>`<span style="width:8px;height:8px;border-radius:50%;background:${k===i?'var(--accent)':'var(--bg4)'};display:inline-block;"></span>`).join('')}
    </div>
    <div style="display:flex;gap:8px;justify-content:center;">
      ${i>0?`<button type="button" class="btn-sm" onclick="showTutorial(${i-1})">← Geri</button>`:''}
      ${son
        ?`<button type="button" class="btn-p" style="width:auto;padding:10px 26px;" onclick="G.tutorialDone=true;scheduleGameSave();closeAppModal();showNotif('İyi oyunlar! 🏀')">Başla!</button>`
        :`<button type="button" class="btn-p" style="width:auto;padding:10px 26px;" onclick="showTutorial(${i+1})">Sonraki →</button>`}
      ${!son?`<button type="button" class="btn-sm" onclick="G.tutorialDone=true;scheduleGameSave();closeAppModal()">Atla</button>`:''}
    </div>
  </div>`);
}

function scheduleGameSave(){
  if(!G||!G.team) return;
  clearTimeout(_gameSaveTimer);
  _gameSaveTimer=setTimeout(()=>saveGameNow(false),900);
}

function serializeGameState(){
  const pl=(G.ligTeams||[]).map(t=>({
    id:t.id,isim:t.isim,renk:t.renk,
    galibiyet:t.galibiyet,maglubiyet:t.maglubiyet,sayiFor:t.sayiFor,sayiAg:t.sayiAg
  }));
  return{
    v:5,
    savedAt:new Date().toISOString(),
    coins:G.coins,wins:G.wins,losses:G.losses,points:G.points,chemistry:G.chemistry,winStreak:G.winStreak||0,careerMatches:G.careerMatches||0,careerWins:G.careerWins||0,careerLosses:G.careerLosses||0,clubRecords:G.clubRecords||{},
    team:G.team,
    players:G.players,youth:G.youth,marketPlayers:G.marketPlayers,
    clubTransferPlayers:G.clubTransferPlayers||[],_ctSeq:G._ctSeq||0,
    coaches:G.coaches,coachMarket:G.coachMarket,
    scouts:G.scouts||[],scoutMarket:G.scoutMarket||[],
    ligTeams:pl,
    arena:G.arena,youthFacility:G.youthFacility||{s:1},selectedColor:G.selectedColor,activeTrainings:G.activeTrainings||[],posTraining:G.posTraining||null,
    gameDay:G.gameDay,managerName:G.managerName,managerRep:G.managerRep||0,managerHistory:G.managerHistory||[],joinedAt:G.joinedAt,lastActive:new Date().toISOString(),
    marketPozFilter:G.marketPozFilter,marketSort:G.marketSort,marketSortDesc:G.marketSortDesc||{ovr:true,maas:true},
    kadroFilter:G.kadroFilter,kadroView:G.kadroView,youthView:G.youthView||'list',
    prepareMatchIx:G.prepareMatchIx!=null?G.prepareMatchIx:null,
    season:G.season,seasonFixtures:G.seasonFixtures||[],playoff:G.playoff||null,cup:G.cup||null,cupHistory:G.cupHistory||[],
    settings:G.settings||{sound:true,autosaveSec:12},
    achievements:G.achievements||{},
    ledger:G.ledger||[],
    lastEcoDay:G.lastEcoDay!=null?G.lastEcoDay:1,
    bankruptWeeks:G.bankruptWeeks||0,
    tactics:G.tactics||{tempo:'normal',odak:'dengeli'},
    lineup:G.lineup||null,
    ticketPrice:G.ticketPrice!=null?G.ticketPrice:2,
    tutorialDone:!!G.tutorialDone,
    pendingMatch:G.pendingMatch||null,
    pendingOffers:G.pendingOffers||[],
    presidentTarget:G.presidentTarget||null,
    budgetPenalty:G.budgetPenalty||0,
    analytics:G.analytics||{teamMatches:[],playerDev:{}},
    /* F7-16: draft artık 'done' olsa da saklanır (özet ekranındayken çıkılırsa özet
       bir daha gösterilemiyordu); soyunma odası krizi damgası da kayda giriyor
       (yeniden yükleyince aynı kriz hemen tekrar açılabiliyordu). */
    draft:(G.draft&&typeof G.draft==='object')?G.draft:null,
    _crisisPid:G._crisisPid||null,
    _crisisDay:G._crisisDay||null
  };
}

let _lastSavedFingerprint='';
function saveGameNow(showToast){
  if(!G||!G.team){ if(showToast) showNotif('Önce takım oluştur veya kayıt yükle.'); return; }
  const state=serializeGameState();
  const raw=JSON.stringify(state);
  /* Değişiklik yoksa yazma — diğer sekmelerde gereksiz "güncellendi" bildirimi tetiklenmesin. */
  const fp=JSON.stringify({...state,savedAt:0,lastActive:0});
  if(!showToast&&fp===_lastSavedFingerprint) return;
  /* F7-4: parmak izi eskiden try'dan ONCE guncelleniyordu — yazma hata verse bile
     'kaydedildi' sayiliyor, durum degismedigi surece bir daha DENENMIYORDU. */
  let lsOk=false;
  try{
    localStorage.setItem(GAME_SAVE_KEY,raw);
    lsOk=true;
    _lastSavedFingerprint=fp;
    const el=document.getElementById('saveStatusLine');
    if(el) el.textContent='Son kayıt: '+new Date().toLocaleString('tr-TR');
    if(showToast) showNotif('Oyun kaydedildi.');
  }catch(e){
    dbg('localStorage save failed',e);
    _lastSavedFingerprint='';       /* sonraki otomatik kayit yeniden denesin */
    if(e&&(e.code===22||e.name==='QuotaExceededError')) showNotif('localStorage dolu — IndexedDB yedeğine yazılıyor; gerekirse dışa aktar.',{critical:true});
    else showNotif('Kayıt yazılamadı — IndexedDB yedeği deneniyor.',{critical:true});
  }
  idbPutString(raw).then(()=>{
    /* IDB yazdiysa parmak izi guvenle guncellenebilir (acilista savedAt ile karsilastirilir). */
    if(!lsOk) _lastSavedFingerprint=fp;
  }).catch(err=>{
    dbg('IndexedDB save failed',err);
    _lastSavedFingerprint='';
    /* Her iki depo da basarisiz: sessiz kalma — kullanici disa aktarabilsin. */
    if(!lsOk) showNotif('KAYIT YAZILAMADI (localStorage + IndexedDB). Ayarlar → Dışa aktar ile yedek al.',{critical:true});
  });
}

function loadGameFromStorage(){
  try{
    const raw=localStorage.getItem(GAME_SAVE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}

function migrateEconomyV3ToV4(d){
  if(!d) return;
  d.coins=ecoRound(d.coins??ECO_REF_KR);
  (d.players||[]).forEach(p=>{
    if(p.genel!=null) p.maas=salaryKRFromGenel(p.genel);
    if(p.fiyat!=null) p.fiyat=transferFeeKR(p);
  });
  (d.youth||[]).forEach(p=>{
    if(p.genel!=null) p.maas=Math.max(ecoRound(8),Math.round(salaryKRFromGenel(p.genel)*0.2));
  });
  (d.marketPlayers||[]).forEach(p=>{
    if(p.genel==null) return;
    p.maas=salaryKRFromGenel(p.genel);
    p.fiyat=transferFeeKR(p);
  });
  (d.coaches||[]).forEach(c=>{ c.maas=ecoRound(c.maas||85); });
  (d.coachMarket||[]).forEach(c=>{
    c.maas=ecoRound(c.maas||85);
    c.satisFiyat=ecoRound(c.satisFiyat||500);
  });
  if(d.arena){
    const s=Math.min(5,Math.max(1,Number(d.arena.s)||1));
    d.arena.bk=ARENA_LVL[s-1].bk;
  }
}

/** v4 → v5: eski şişkin ekonomi (×20,8) yeni ham KR ölçeğine iner; sözleşme/istatistik alanları eklenir. */
function migrateEconomyV4ToV5(d){
  if(!d) return;
  (d.players||[]).forEach(p=>{
    if(p.genel!=null) p.maas=salaryKRFromGenel(p.genel);
    if(p.kontratSezon==null) p.kontratSezon=rand(1,3);
    if(!p.sezon) p.sezon={mac:0,pts:0,ast:0,reb:0};
  });
  (d.youth||[]).forEach(p=>{
    if(p.genel!=null) p.maas=Math.max(60,Math.round(salaryKRFromGenel(p.genel)*0.25));
  });
  (d.marketPlayers||[]).forEach(p=>{
    if(p.genel==null) return;
    p.maas=salaryKRFromGenel(p.genel);
    p.fiyat=transferFeeKR(p);
  });
  (d.coaches||[]).forEach(c=>{
    const sev=Number(c.seviye)||3;
    c.maas=Math.round(45+sev*18+sev*sev*2);
    const t=KOC_T.find(k=>k.isim===c.isim);
    if(t&&c.stat===undefined){ c.stat=t.stat; c.bonus=t.bonus; }
  });
  (d.coachMarket||[]).forEach(c=>{
    const sev=Number(c.seviye)||3;
    c.maas=Math.round(50+sev*22+sev*sev*2.5);
    c.satisFiyat=Math.round(400+sev*sev*140+c.maas*2);
    const t=KOC_T.find(k=>k.isim===c.isim);
    if(t&&c.stat===undefined){ c.stat=t.stat; c.bonus=t.bonus; }
  });
  if(d.arena){
    const s=Math.min(5,Math.max(1,Number(d.arena.s)||1));
    d.arena.bk=ARENA_LVL[s-1].bk;
  }
  if(d.lastEcoDay==null) d.lastEcoDay=d.gameDay||1;
}

const SAVE_VERSIONS=[2,3,4,5];

/* Güvenlik (18. oturum): kayıt verisi state'e yazılmadan önce işaretleme karakterlerinden
   arındırılır. İsim alanları (takım/oyuncu/arena/menajer + lig/fikstür/kupa/koç/izci adları)
   onlarca yerde escMatch'siz innerHTML'e gömülüyor — elle düzenlenip paylaşılan bir .json
   kayıt dosyası içe aktarıldığında saklı XSS çalıştırabilirdi. Kayıt formatında meşru HTML
   taşıyan alan yok (haber satırları sessionStorage'da, olay metinleri düz metin), bu yüzden
   TÜM string alanlardan <>"'` güvenle temizlenir; & URL'leri (logoUrl) bozmamak için korunur —
   tag açmak/attribute kırmak bu karakterler olmadan mümkün değil. Temiz kayıtta no-op. */
function _stripSaveMarkup(o,depth){
  if(o==null||depth>12) return o;
  if(typeof o!=='object') return o;
  if(Array.isArray(o)){
    for(let i=0;i<o.length;i++){
      const v=o[i];
      if(typeof v==='string') o[i]=v.replace(/[<>"'`]/g,'');
      else if(v&&typeof v==='object') _stripSaveMarkup(v,depth+1);
    }
    return o;
  }
  for(const k in o){
    const v=o[k];
    if(typeof v==='string') o[k]=v.replace(/[<>"'`]/g,'');
    else if(v&&typeof v==='object') _stripSaveMarkup(v,depth+1);
  }
  return o;
}
function _sanitizeImportedSave(d){
  _stripSaveMarkup(d,0);
  /* UI giriş noktalarıyla aynı kurallar (& temizliği + trim + 40 karakter) ana ad alanlarına da: */
  if(d.team&&typeof d.team==='object'&&d.team.isim!=null) d.team.isim=sanitizeTeamName(d.team.isim);
  if(d.managerName!=null) d.managerName=sanitizeTeamName(d.managerName);
  if(d.arena&&typeof d.arena==='object'&&d.arena.isim!=null) d.arena.isim=sanitizeTeamName(d.arena.isim);
  return d;
}

/* F7-14: applyGameState 80 satır boyunca doğrudan G'ye yazıyor ve sonunda ensureRoles /
   genLigTeams / genCoaches gibi üretim çağrıları yapıyordu. Biri atarsa G YARI yüklenmiş
   kalıyor, çağıranlar yakalamadığı için oyun boş ekranda kilitleniyor ve kullanıcıya ne
   olduğu söylenmiyordu. Artık uygulama öncesi anlık görüntü alınır, hata olursa geri sarılır. */
function applyGameState(d){
  if(!d||!SAVE_VERSIONS.includes(d.v|0)) return false;
  let snap=null;
  try{ snap=(typeof structuredClone==='function')?structuredClone(G):JSON.parse(JSON.stringify(G)); }catch(e){ snap=null; }
  try{
    return _applyGameStateInner(d);
  }catch(err){
    dbg('applyGameState',err);
    if(snap) G=snap;                     /* yarım uygulanmış durum geri alınır */
    showNotif('Kayıt bozuk — yüklenemedi. Ayarlar → “Dışa aktar” ile yedek alıp kaydı silebilirsin.',{critical:true});
    return false;
  }
}
function _applyGameStateInner(d){
  d=_sanitizeImportedSave(d); /* içe aktarma + normal yükleme tek noktadan temizlenir (idempotent) */
  if((d.v|0)<4) migrateEconomyV3ToV4(d);
  if((d.v|0)<5) migrateEconomyV4ToV5(d);
  G.coins=d.coins??START_KR;
  G.wins=d.wins??0;
  G.careerMatches=Number(d.careerMatches)||0; /* Paket B: kariyer maç sayacı */
  G.careerWins=Number(d.careerWins)||0; G.careerLosses=Number(d.careerLosses)||0;
  G.clubRecords=(d.clubRecords&&typeof d.clubRecords==='object')?d.clubRecords:{}; /* Paket 2: kulüp rekorları */
  G.losses=d.losses??0;
  G.points=d.points??0;
  G.chemistry=d.chemistry??75;
  G.winStreak=Number(d.winStreak)||0;
  G.team=d.team||null;
  G.players=Array.isArray(d.players)?d.players:[];
  G.youth=Array.isArray(d.youth)?d.youth:[];
  G.marketPlayers=Array.isArray(d.marketPlayers)?d.marketPlayers:[];
  G.clubTransferPlayers=Array.isArray(d.clubTransferPlayers)?d.clubTransferPlayers:[];
  /* FAZ A (30. oturum): eski kayıtlarda rol/eğilim yok — statlardan deterministik doldurulur. */
  try{ ensureRoles(G.players); ensureRoles(G.youth); ensureRoles(G.marketPlayers); ensureRoles(G.clubTransferPlayers); }catch(e){}
  G._ctSeq=d._ctSeq||0;
  G.marketTab='free';G.clubTransferFilter='all';
  G.coaches=Array.isArray(d.coaches)?d.coaches:[];
  G.coachMarket=Array.isArray(d.coachMarket)?d.coachMarket:[];
  G.ligTeams=Array.isArray(d.ligTeams)?d.ligTeams:[];
  G.arena=d.arena||G.arena;
  G.youthFacility=d.youthFacility&&typeof d.youthFacility==='object'?d.youthFacility:{s:1};
  G.selectedColor=d.selectedColor||'#f97316';
  G.activeTrainings=Array.isArray(d.activeTrainings)?d.activeTrainings:[];
  G.posTraining=(d.posTraining&&typeof d.posTraining==="object")?d.posTraining:null; /* Paket 3 */
  G.gameDay=d.gameDay??1;
  G.managerName=d.managerName||'Menajer';
  G.managerRep=Number(d.managerRep)||0;
  G.managerHistory=Array.isArray(d.managerHistory)?d.managerHistory:[];
  G.joinedAt=d.joinedAt||null;
  G.lastActive=d.lastActive||null;
  G.marketPozFilter=d.marketPozFilter||'all';
  G.marketSort=d.marketSort||'ovr';
  G.marketSortDesc=d.marketSortDesc||{ovr:true,maas:true};
  G.kadroFilter=d.kadroFilter||'all';
  G.kadroView=d.kadroView||'cards';
  G.youthView=d.youthView||'list';
  G.prepareMatchIx=d.prepareMatchIx!=null&&d.prepareMatchIx!==undefined?d.prepareMatchIx:null;
  G.season=d.season||null;
  G.playoff=d.playoff&&typeof d.playoff==='object'?d.playoff:null;
  G.cup=d.cup&&typeof d.cup==='object'?d.cup:null; /* Paket 1: ulusal kupa durumu */
  G.cupHistory=Array.isArray(d.cupHistory)?d.cupHistory:[];
  G.seasonFixtures=Array.isArray(d.seasonFixtures)?d.seasonFixtures:[];
  G.settings=Object.assign({sound:true,autosaveSec:12},d.settings||{});
  applyA11ySettings(); /* büyük yazı / yüksek kontrast kayıttan gelir gelmez uygulanır */
  G.achievements=d.achievements&&typeof d.achievements==='object'?d.achievements:{};
  G.ledger=Array.isArray(d.ledger)?d.ledger:[];
  G.lastEcoDay=d.lastEcoDay!=null?d.lastEcoDay:(d.gameDay||1);
  G.bankruptWeeks=d.bankruptWeeks||0;
  G.tactics=Object.assign({tempo:'normal',odak:'dengeli'},d.tactics||{});
  G.lineup=d.lineup&&typeof d.lineup==='object'?d.lineup:null;
  G.ticketPrice=d.ticketPrice!=null?d.ticketPrice:2;
  G.tutorialDone=!!d.tutorialDone;
  G.pendingMatch=d.pendingMatch&&typeof d.pendingMatch==='object'?d.pendingMatch:null; /* C1: kilitli maç sonucu */
  G.scouts=Array.isArray(d.scouts)?d.scouts:[]; /* Faz 5.1: izci ağı */
  /* F7-7: aynı reroll deseni izci pazarında da vardı. */
  G.scoutMarket=Array.isArray(d.scoutMarket)?d.scoutMarket:((d.scoutMarket===undefined&&typeof genScoutMarket==='function')?genScoutMarket():[]);
  G.pendingOffers=Array.isArray(d.pendingOffers)?d.pendingOffers:[]; /* Faz 4.1: kullanıcı oyuncularına gelen teklifler */
  G.presidentTarget=d.presidentTarget&&typeof d.presidentTarget==='object'?d.presidentTarget:null; /* Faz 4.3 */
  G.budgetPenalty=Number(d.budgetPenalty)||0; /* Faz 4.3: hedef tutmayınca bütçe kısıtı */
  G.analytics=d.analytics&&typeof d.analytics==='object'?{teamMatches:Array.isArray(d.analytics.teamMatches)?d.analytics.teamMatches:[],playerDev:d.analytics.playerDev&&typeof d.analytics.playerDev==='object'?d.analytics.playerDev:{}}:{teamMatches:[],playerDev:{}}; /* Faz 5.2 */
  G.draft=d.draft&&typeof d.draft==='object'?d.draft:null; /* Faz 6: yarım kalan draft — F7-16: biten draft de yüklenir (özet erişilebilir kalsın) */
  G._crisisPid=d._crisisPid||null;   /* F7-16: kriz damgası kayıttan gelir; aksi halde yeniden yükleyince aynı kriz tekrar açılıyordu */
  G._crisisDay=d._crisisDay||null;
  if(G.team&&(!G.ligTeams||!G.ligTeams.length)) G.ligTeams=genLigTeams();
  /* Faz 4.2: eski kayıtlardaki oyunculara kişilik ata (geriye dönük uyum). */
  [G.players,G.youth,G.marketPlayers,G.clubTransferPlayers].forEach(list=>{ (list||[]).forEach(p=>{ if(p&&!p.kisilik) p.kisilik=ch(KISILIK_KEYS); }); });
  [G.players,G.youth,G.marketPlayers].forEach(list=>{
    (list||[]).forEach((p,i)=>{
      if(!p||p.seed) return;
      p.seed='legacy'+String(p.id||i)+hash32((p.isim||'')+(p.yas||'')+(p.poz||''));
    });
  });
  ensureMarketStock();
  if(G.team) ensureYouthStock();
  /* F7-7 (istismar): "boşsa üret" kuralı ücretsiz reroll kapısıydı — tüm koçları kov,
     sayfayı yenile, 3 koç BEDAVA gelir; seviyeler beğenilmezse tekrar kov + yenile.
     Artık yalnızca alan kaydın KENDİSİNDE yoksa (eski/ilk kayıt) üretilir. */
  if(d.coaches===undefined&&!G.coaches.length) G.coaches=genCoaches();
  if(d.coachMarket===undefined&&!G.coachMarket.length) G.coachMarket=genCoachMarket();
  return !!G.team;
}

function ensureUiUnblocked(){
  try{
    const ov=document.getElementById('overlay');
    if(ov) ov.classList.remove('show');
    const sb=document.getElementById('sidebar');
    if(sb) sb.classList.remove('open');
  }catch(e){}
}

function wireAppNav(){
  const app=document.getElementById('app');
  if(!app||app.dataset.appNavWired==='1') return;
  app.dataset.appNavWired='1';
  app.addEventListener('click',function(ev){
    const btn=ev.target.closest('button[data-page]');
    if(!btn) return;
    const slug=btn.getAttribute('data-page');
    if(!slug||!/^(dashboard|takim|kadro|mac|lig|market|altyapi|antrenman|arena|bilanco|analiz)$/.test(slug)) return;
    if(!btn.closest('#sbNav')) return;
    ev.preventDefault();
    const sideBtn=document.querySelector('#sbNav button[data-page="'+slug+'"]');
    showPage(slug, sideBtn||btn);
  });
}

function bootstrapAppUi(){
  document.getElementById('setupPage').style.display='none';
  document.getElementById('loginPage').style.display='none';
  document.getElementById('app').style.display='block';
  ensureUiUnblocked();
  document.getElementById('sbTeam').textContent=G.team.isim;
  document.getElementById('sbDot').style.background=G.team.renk||G.selectedColor;
  document.getElementById('sbDot').textContent='';
  const slotEl=document.getElementById('sbTblSlot');
  if(slotEl) slotEl.textContent=formatTblSlotLabel(G.team.tblKey);
  renderLeagueSidebar();
  syncSidebarBranding();
  const mc=document.getElementById('marketCountNum');
  if(mc) mc.textContent=String(G.marketPlayers.length);
  ensureLeagueSeasonOrStart();
  renderDashboardNextMatch();
  const lh=document.getElementById('liveHome');
  if(lh) lh.textContent=G.team.isim;
  updateStats();
  updateCoins();
  updateChemistry();
  renderRoster();
  renderDashboardNews();
  const sl=document.getElementById('saveStatusLine');
  if(sl) sl.textContent='Otomatik kayıt aktif';
  wireAppNav();
}

function resumeFromSavedGame(){
  /* F7-2: acilis karsilastirmasi IndexedDB kopyasini SECTIYSE (savedAt daha yeni ya da LS
     kullanilamaz) onu kullan; aksi halde localStorage. */
  let d=_pendingResumeFromIdb||loadGameFromStorage();
  if(!d||!applyGameState(d)){ showNotif('Geçerli kayıt yok.'); return; }
  _pendingResumeFromIdb=null;
  bootstrapAppUi();
  applyAutosaveSetting();
  processEconomyWeeks();
  renderLig();
  renderFixture();
  const dashBtn=document.querySelector('button.ni.active')||document.querySelector('button.ni');
  showPage('dashboard',dashBtn);
  showNotif('Kayıt yüklendi — '+G.team.isim);
  saveGameNow(false);
  /* F7-1: yarim kalan draft/playoff varsa ilgili ekrani ac (aksi halde kullanici
     bracketin/draftin durdugunu goremiyordu). Draft oncelikli — sezon o sirada bekler. */
  if(G.draft&&!G.draft.done&&typeof processDraftPicks==='function') setTimeout(processDraftPicks,600);
  else if(G.playoff&&!G.playoff.champion) setTimeout(()=>{
    try{
      const b=document.querySelector('#sbNav button[data-page="lig"]');
      showPage('lig',b);                          /* playoff bracketi lig sayfasindaki panelde */
      showNotif('Playoff devam ediyor — seri durumu lig sayfasında.',{critical:true});
    }catch(e){}
  },600);
}

function exportGameJson(){
  if(!G||!G.team){ showNotif('Önce oyunda takım olmalı.'); return; }
  const blob=new Blob([JSON.stringify(serializeGameState(),null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='charazay-save.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showNotif('Dosya indirildi.');
}

function importGameJson(ev){
  const f=ev.target.files&&ev.target.files[0];
  ev.target.value='';
  if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const d=JSON.parse(String(r.result||''));
      if(!d||!SAVE_VERSIONS.includes(d.v|0)||!d.team){ showNotif('Geçersiz kayıt dosyası.'); return; }
      applyGameState(d);
      _pendingResumeFromIdb=null;
      document.getElementById('loginPage').style.display='none';
      document.getElementById('setupPage').style.display='none';
      bootstrapAppUi();
      applyAutosaveSetting();
      closeAppModal();
      renderLig();
      renderFixture();
      const dbtn=document.querySelector('#sbNav button[data-page="dashboard"]');
      if(dbtn) showPage('dashboard',dbtn);
      showNotif('Kayıt içe aktarıldı.');
      saveGameNow(false);
    }catch(e){ showNotif('Dosya okunamadı.'); }
  };
  r.readAsText(f);
}

function clearSavedGame(){
  try{ localStorage.removeItem(GAME_SAVE_KEY); }catch(e){}
  /* F7-3: IndexedDB kopyasi da silinir; yoksa silinen kariyer sonraki acilista geri gelir. */
  try{ if(typeof idbDeleteString==='function') idbDeleteString(); }catch(e){}
  _lastSavedFingerprint='';
  _pendingResumeFromIdb=null;
  const sl=document.getElementById('saveStatusLine');
  if(sl) sl.textContent='Kayıt silindi.';
  showNotif('Tarayıcı kaydı silindi.');
}

function syncUiAfterExternalSave(){
  /* F7-15: canlı maç sırasında dış senkron uygulanmaz — applyGameState G.players'ı
     yeniden kurar, mState ise maç başında yakalanmış referansları tutar; maç içi
     değişiklik/enerji/faul güncellemeleri yetim nesnelere yazılıp kaybolurdu. */
  if(typeof mState!=='undefined'&&mState&&mState.running) return;
  const d=loadGameFromStorage();
  if(!d||!d.team||!applyGameState(d)) return;
  if(document.getElementById('app').style.display==='none') return;
  document.getElementById('sbTeam').textContent=G.team.isim;
  updateStats();
  updateCoins();
  updateChemistry();
  renderLig();
  renderFixture();
  renderDashboardNextMatch();
  if(document.getElementById('page-dashboard')&&document.getElementById('page-dashboard').classList.contains('active')) renderDashboardNews();
  try{
    const slug=charazayGetActivePageSlug();
    if(slug==='kadro') renderRoster();
    else if(slug==='market') renderMarket();
    else if(slug==='altyapi') renderAltyapi();
    else if(slug==='antrenman') renderAntrenman();
    else if(slug==='arena') renderArena();
    else if(slug==='bilanco') renderBilanço();
    else if(slug==='takim') renderTeamDetailPage();
  }catch(e){ dbg('sync rerender',e); }
  const sl=document.getElementById('saveStatusLine');
  if(sl) sl.textContent='Diğer sekmeden güncellendi: '+new Date().toLocaleString('tr-TR');
  showNotif('Kayıt başka sekmeden güncellendi.');
}

