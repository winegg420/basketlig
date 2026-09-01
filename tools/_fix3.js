/* Denetim düzeltmesi — 3: FAZ 30'da çoğalmış blokların temizliği.
   Sebep: yama betiğinin `split().join()` (tümünü değiştir) davranışı, betik iki kez
   çalıştırılınca aynı bloğu üst üste ekledi. Davranış doğruydu (tekrarlı atama ve
   yinelenen nesne anahtarı zararsızdır) ama ölü kod okunabilirliği bozar. */
const fs = require('fs');

/* main.js — createTeam içindeki ülke bloğu 3 kez yazılmış. */
{
  const P = 'js/main.js';
  let s = fs.readFileSync(P, 'utf8');
  const blok = `  /* FAZ 30 §5: kayıt ülkesi. Oyunun HİÇBİR mekaniğine girmez — yalnız profil kartında
     bayrak + ad olarak görünür. Seçilmezse listenin ilk ülkesi kullanılır. */
  try{
    const _us=document.getElementById('menajerUlkeSec');
    const _sec=_us&&_us.value;
    G.menajerUlke=(_sec&&ULKE_BUL(_sec))?_sec:(ULKELER[0]&&ULKELER[0].ad)||null;
  }catch(e){ G.menajerUlke=(ULKELER[0]&&ULKELER[0].ad)||null; }
`;
  const blokCift = `  /* FAZ 30 §5: kayıt ülkesi. Oyunun HİÇBİR mekaniğine girmez — yalnız profil kartında
     bayrak + ad olarak görünür. Seçilmezse listenin ilk ülkesi kullanılır. */
  try{
    const _us=document.getElementById("menajerUlkeSec");
    const _sec=_us&&_us.value;
    G.menajerUlke=(_sec&&ULKE_BUL(_sec))?_sec:((ULKELER[0]&&ULKELER[0].ad)||null);
  }catch(e){ G.menajerUlke=(ULKELER[0]&&ULKELER[0].ad)||null; }
`;
  if (s.indexOf(blokCift) < 0) throw new Error('main: ilk blok yok');
  const say = s.split(blok).length - 1;
  if (say !== 2) throw new Error('main: beklenen 2 tekrar, bulunan ' + say);
  s = s.split(blok).join('');            /* iki kopyayı da sil */
  s = s.replace(blokCift, blok);         /* tek, tutarlı sürüm kalsın */
  fs.writeFileSync(P, s);
  console.log('main.js: createTeam ülke bloğu 3 → 1');
}

/* roster-gen.js — DEFAULT_G içinde anahtar 3 kez. */
{
  const P = 'js/roster-gen.js';
  let s = fs.readFileSync(P, 'utf8');
  const sat = `  menajerUlke:null,   /* FAZ 30 §5: profil ülkesi — yalnız görsel */\n`;
  const say = s.split(sat).length - 1;
  if (say !== 3) throw new Error('roster-gen: beklenen 3, bulunan ' + say);
  s = s.split(sat).join('');
  s = s.replace(`  managerName:'Menajer',\n`, `  managerName:'Menajer',\n` + sat);
  fs.writeFileSync(P, s);
  console.log('roster-gen.js: DEFAULT_G menajerUlke 3 → 1');
}
