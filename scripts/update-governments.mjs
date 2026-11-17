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
const checked=[];
for(const g of d.governments){
  if(!g.country||!g.leader||!g.party||!g.sourceUrl?.startsWith('https://')) throw new Error('Registro incompleto: '+(g.country||'país desconocido'));
  try{
    const result=await timeoutFetch(g.sourceUrl);
    checked.push({country:g.country,url:g.sourceUrl,status:result.status,bytes:result.body.length,checkedAt});
  }catch{
    throw new Error('La fuente oficial de '+g.country+' no responde; se conserva la edición anterior');
  }
}

const chesUrl='https://raw.githubusercontent.com/chesdata/chesdata.github.io/main/ches-trend/1999-2024_CHES_dataset_meansV2.csv';
let chesRows=[];
try{chesRows=parseCsv((await timeoutFetch(chesUrl,'text/csv')).body)}catch{throw new Error('CHES no está disponible; se conserva la edición anterior')}
const comparative=[];
for(const g of d.governments){
  const party=normalize(g.party);
  const match=chesRows.find(row=>{
    const name=normalize(pick(row,['party_name_short','partyname_short','party_name','partyname','party']));
    return name&&(name===party||name.includes(party)||party.includes(name));
  });
  if(!match) throw new Error('CHES no identifica el partido de '+g.country+' ('+g.party+'); se conserva la edición anterior');
  const score=Number(pick(match,['lrgen','lrgen_mean','lrgen_2024','left_right']));
  comparative.push({country:g.country,party:g.party,matchedParty:pick(match,['party_name_short','partyname_short','party_name','partyname','party']),score:Number.isFinite(score)?score:null,source:chesUrl,checkedAt});
}

d.verifiedAt=checkedAt;
d.sourceChecks=checked;
d.comparativeChecks=comparative;
d.updateStatus={stage:'completed',label:'Gobiernos y orientación contrastados',progress:100,methodology:'Fuente oficial en directo para confirmar el Ejecutivo y CHES-Europe para contrastar la posición del partido. La etiqueta final sigue siendo orientativa; si falta cualquiera de las dos comprobaciones, se conserva la edición anterior.'};
await fs.writeFile(path,JSON.stringify(d,null,2)+'\n');
console.log('Gobiernos y orientación contrastados:',comparative.length);
