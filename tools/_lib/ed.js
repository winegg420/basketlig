/* CRLF'e duyarlı düzenleyici (js/main.js gibi CRLF dosyalar için). */
const fs=require('fs');
function ed(f,a,b){
  let s=fs.readFileSync(f,'utf8');
  const crlf=s.indexOf('\r\n')>=0;
  const A=crlf?a.split('\n').join('\r\n'):a;
  const B=crlf?b.split('\n').join('\r\n'):b;
  if(!s.includes(A)) throw new Error(f+' bulunamadi: '+a.slice(0,70));
  fs.writeFileSync(f,s.replace(A,B));
}
module.exports={ed};
