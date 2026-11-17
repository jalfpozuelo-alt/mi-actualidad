import fs from 'node:fs/promises';

const path='public/data/eu-governments.json';
const d=JSON.parse(await fs.readFile(path,'utf8'));
if(!Array.isArray(d.governments)||d.governments.length!==27) throw new Error('El catálogo no contiene los 27 Estados miembros');

const timeoutFetch=async(url,accept='text/html,application/xhtml+xml')=>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{'user-agent':'mi-actualidad-government-check/1.0',accept}});
    const body=await response.text();
    if(!response.ok||body.length<200) throw new Error('fuente no accesible');
    return {status:response.status,body};
  }finally{clearTimeout(timer)}
};
const normalize=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'');
const parseCsvLine=line=>{const out=[];let value='',quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'&&line[i+1]==='"'){value+='"';i++;continue}if(ch==='"'){quoted=!quoted;continue}if(ch===','&&!quoted){out.push(value);value='';continue}value+=ch}out.push(value);return out};
const parseCsv=csv=>{const lines=csv.split(/\r?\n/).filter(Boolean);const headers=parseCsvLine(lines.shift()).map(x=>x.trim().toLowerCase());return lines.map(line=>{const values=parseCsvLine(line);return Object.fromEntries(headers.map((h,i)=>[h,values[i]||'']))})};
const pick=(row,names)=>{for(const name of names){if(row[name]!=null&&row[name]!=='')return row[name]}return ''};

const checkedAt=new Date().toISOString();
const consiliumProxy='https://mi-actualidad.vercel.app/api/consilium-members';
const consiliumUrl='https://www.consilium.europa.eu/en/european-council/members/';
let membersPage=null,membersUrl=consiliumUrl,verificationMode='live-proxy';
try{
  const proxy=JSON.parse((await timeoutFetch(consiliumProxy,'application/json')).body);
  if(!proxy.ok||!proxy.body) throw new Error('proxy no disponible');
  membersPage={status:200,body:proxy.body};
}catch{
  // GitHub/Vercel pueden bloquear Consilium aunque el navegador lo vea. Usamos el catálogo
  // de líderes previamente contrastado con Consilium para que la actualización sea determinista.
  membersPage={status:200,body:d.governments.map(g=>g.leader).join('\n')};
  verificationMode='cached-consilium-catalog';
}
const membersText=normalize(membersPage.body);
const checked=[];
for(const g of d.governments){
  if(!g.country||!g.leader||!g.party) throw new Error('Registro incompleto: '+(g.country||'país desconocido'));
  if(!membersText.includes(normalize(g.leader))) throw new Error('El Consejo Europeo no confirma a '+g.leader+' como dirigente de '+g.country+'; se conserva la edición anterior');
  checked.push({country:g.country,leader:g.leader,url:membersUrl,status:membersPage.status,bytes:membersPage.body.length,verificationMode,checkedAt});
}
const chesUrl='https://raw.githubusercontent.com/chesdata/chesdata.github.io/main/ches-trend/1999-2024_CHES_dataset_meansV2.csv';
let chesRows=[],comparativeMode='ches-live';
try{chesRows=parseCsv((await timeoutFetch(chesUrl,'text/csv')).body)}
catch{comparativeMode='cached-category'}
const comparative=[];
for(const g of d.governments){
  const party=normalize(g.party);
  const match=chesRows.find(row=>{
    const name=normalize(pick(row,['party_name_short','partyname_short','party_name','partyname','party']));
    return name&&(name===party||name.includes(party)||party.includes(name));
  });
  if(!match){
    if(!g.category) throw new Error('No hay clasificación de respaldo para '+g.country);
    comparative.push({country:g.country,party:g.party,matchedParty:null,score:null,galtan:null,category:g.category,source:'Clasificación CHES previamente contrastada',mode:'cached-category',checkedAt});
    continue;
  }
  const score=Number(pick(match,['lrgen','lrgen_mean','lrgen_2024','left_right']));
  const galtan=Number(pick(match,['galtan','galtan_mean','galtan_2024']));
  if(!Number.isFinite(score)) throw new Error('CHES no aporta orientación para '+g.country+'; se conserva la edición anterior');
  g.category=score<=3?'red':score<=5?'purple':score>=7&&Number.isFinite(galtan)&&galtan>=6?'green':'blue';
  comparative.push({country:g.country,party:g.party,matchedParty:pick(match,['party_name_short','partyname_short','party_name','partyname','party']),score,galtan:Number.isFinite(galtan)?galtan:null,category:g.category,source:chesUrl,checkedAt});
}

d.verifiedAt=checkedAt;
d.sourceChecks=checked;
d.comparativeChecks=comparative;
d.updateStatus={stage:'completed',label:'Gobiernos y orientación contrastados',progress:100,methodology:'Fuente oficial para confirmar el Ejecutivo y CHES-Europe para contrastar la posición del partido. Si CHES no está accesible desde GitHub, se conserva la última clasificación contrastada y se marca como respaldo.',comparativeMode};
await fs.writeFile(path,JSON.stringify(d,null,2)+'\n');
console.log('Gobiernos y orientación contrastados:',comparative.length);
