import fs from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';

const G='public/data/eu-governments.json';
const P='public/data/eu-parliament.json';
const S='public/data/political-update-status.json';
const GOV='https://op.europa.eu/webpub/wiw/pdf/EUWhoiswho_EURCOU_EN.pdf';
const EP='https://data.europarl.europa.eu/api/v2/meps/show-current?format=application%2Fld%2Bjson';
const countries={Austria:'Austria',Belgium:'Bélgica',Bulgaria:'Bulgaria',Croatia:'Croacia',Cyprus:'Chipre',Czechia:'Chequia',Denmark:'Dinamarca',Estonia:'Estonia',Finland:'Finlandia',France:'Francia',Germany:'Alemania',Greece:'Grecia',Hungary:'Hungría',Ireland:'Irlanda',Italy:'Italia',Latvia:'Letonia',Lithuania:'Lituania',Luxembourg:'Luxemburgo',Malta:'Malta',Netherlands:'Países Bajos',Poland:'Polonia',Portugal:'Portugal',Romania:'Rumanía',Slovenia:'Eslovenia',Slovakia:'Eslovaquia',Spain:'España',Sweden:'Suecia'};
const writeStatus=(stage,label,progress,extra={})=>fs.writeFile(S,JSON.stringify({stage,label,progress,updatedAt:new Date().toISOString(),...extra},null,2)+'\n');
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\([^)]*\)/g,'').replace(/\b(mr|ms|mrs)\b/gi,'').replace(/[^a-z]/gi,'').toLowerCase();
const personName=value=>String(value).replace(/\([^)]*\)/g,'').replace(/^(Mr|Ms|Mrs)\s+/i,'').replace(/\s+/g,' ').trim().split(' ').map(word=>word ? word[0].toUpperCase()+word.slice(1).toLowerCase() : word).join(' ');
const value=(x,...keys)=>keys.map(k=>x?.[k]).find(v=>typeof v==='string'&&v.trim());

async function extractGovernments(){
  const response=await fetch(GOV,{signal:AbortSignal.timeout(30000),headers:{accept:'application/pdf','user-agent':'mi-actualidad-political-collector/1.0'}});
  if(!response.ok) throw Error(`Directorio oficial HTTP ${response.status}`);
  const parser=new PDFParse({data:Buffer.from(await response.arrayBuffer())});
  const {text}=await parser.getText();
  await parser.destroy();
  const members=text.slice(text.indexOf('MEMBERS'),text.indexOf('European Commission'));
  const lines=members.split(/\r?\n/).map(line=>line.trim()).filter(line=>line && !/^\d+\s+[–-]\s+\d/.test(line) && !/^--\s*\d+\s+of/i.test(line));
  const found={};
  for(const [english,spanish] of Object.entries(countries)){
    const index=lines.findIndex(line=>line===english);
    if(index<0) continue;
    const ahead=lines.slice(index+1,index+6);
    const roleIndex=ahead.findIndex(line=>/(Prime Minister|President|Chancellor|Taoiseach)/i.test(line));
    if(roleIndex<1) continue;
    const candidate=ahead.slice(0,roleIndex).filter(line=>!line.startsWith('(')).join(' ');
    if(candidate) found[spanish]={leader:personName(candidate),role:ahead[roleIndex]};
  }
  if(Object.keys(found).length!==27) throw Error(`El directorio oficial solo permitió extraer ${Object.keys(found).length} de 27 gobiernos`);
  return found;
}

await fs.mkdir('public/data',{recursive:true});
await writeStatus('governments','Actualizando gobiernos: leyendo el directorio oficial de la UE…',15);
const governments=JSON.parse(await fs.readFile(G,'utf8'));
const officialGovernments=await extractGovernments();
const now=new Date().toISOString();
let changed=0;
for(const government of governments.governments){
  const official=officialGovernments[government.country];
  if(!official) throw Error(`Falta ${government.country} en el directorio oficial`);
  const leaderChanged=norm(government.leader)!==norm(official.leader);
  government.checkedAt=now;
  government.sourceUrl=GOV;
  government.role=official.role;
  if(leaderChanged){
    changed++;
    government.leader=official.leader;
    government.party='Pendiente de verificación';
    government.executiveParty='Pendiente de verificación';
    government.category=null;
    government.executiveCategory=null;
    government.status='pending';
    government.coalition='Pendiente de verificación tras cambio de representante';
    government.justification='Cambio detectado en el directorio oficial de la UE. La clasificación política queda pendiente de contraste documental.';
  }
}
governments.verifiedAt=now;
governments.updateStatus={stage:'completed',label:changed?`${changed} cambios detectados; pendientes de clasificar`:'Los 27 gobiernos coinciden con el directorio oficial',progress:100,pending:governments.governments.filter(g=>g.status!=='validated').length,checkedAt:now,changed,source:GOV};

await writeStatus('parliament','Actualizando Parlamento Europeo: descargando eurodiputados actuales…',55,{governmentsChanged:changed});
const response=await fetch(EP,{signal:AbortSignal.timeout(20000),headers:{accept:'application/ld+json,application/json','user-agent':'mi-actualidad-political-collector/1.0'}});
if(!response.ok) throw Error(`API del Parlamento HTTP ${response.status}`);
const payload=await response.json();
const meps=Array.isArray(payload)?payload:(payload.data||payload['@graph']||payload.member||payload.items||[]);
if(!meps.length) throw Error('La API del Parlamento no devolvió eurodiputados');
const groups=new Map();
for(const mep of meps){
  const rawGroup=value(mep,'mep_political_group','politicalGroup','group','hasPoliticalGroup','api:political-group')||'NI';
  const rawCountry=value(mep,'mep_country_of_representation','countryOfRepresentation','country','nationality','api:country-of-representation')||'Sin país';
  const group=rawGroup.toLowerCase();
  const key=group.includes('epp')||group.includes('ppe')||group.includes('people')||group.includes('ecr')?'conservative':group.includes('social')||group.includes('s&d')||group.includes('s/d')?'social':group.includes('renew')?'liberal':group.includes('green')||group.includes('verts')||group.includes('ale')?'green':group.includes('left')?'left':group.includes('pfe')||group.includes('esn')||group.includes('patriot')||group.includes('sovereign')?'radical':'unaffiliated';
  const item=groups.get(key)||{key,label:key,seats:0,countries:{}};
  item.seats++; item.countries[rawCountry]=(item.countries[rawCountry]||0)+1; groups.set(key,item);
}
await writeStatus('validating','Validando gobiernos y Parlamento Europeo…',85,{governmentsChanged:changed,meps:meps.length});
const parliament={schemaVersion:1,legislature:'2024–2029',totalSeats:720,assignedSeats:meps.length,vacantSeats:Math.max(0,720-meps.length),checkedAt:now,sourceUrl:EP,groups:[...groups.values()],updateStatus:{stage:'completed',label:'Composición recalculada desde datos oficiales',progress:100,checkedAt:now}};
await fs.writeFile(G,JSON.stringify(governments,null,2)+'\n');
await fs.writeFile(P,JSON.stringify(parliament,null,2)+'\n');
await writeStatus('completed','Actualización política completada',100,{governmentsChanged:changed,meps:meps.length});
console.log(JSON.stringify({governments:27,governmentsChanged:changed,meps:meps.length,checkedAt:now},null,2));
