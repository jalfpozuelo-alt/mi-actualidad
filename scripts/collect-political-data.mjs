import fs from 'node:fs/promises';
const G='public/data/eu-governments.json',P='public/data/eu-parliament.json',S='public/data/political-update-status.json';
const GOV='https://op.europa.eu/webpub/wiw/pdf/EUWhoiswho_EURCOU_EN.pdf';
const EP='https://data.europarl.europa.eu/api/v2/meps/show-current?format=application%2Fld%2Bjson';
const writeStatus=(stage,label,progress,extra={})=>fs.writeFile(S,JSON.stringify({stage,label,progress,updatedAt:new Date().toISOString(),...extra},null,2)+'\n');
async function getJson(url){const r=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{accept:'application/ld+json,application/json','user-agent':'mi-actualidad-political-collector/1.0'}});if(!r.ok)throw Error(`${url} HTTP ${r.status}`);return r.json()}
const value=(x,...keys)=>keys.map(k=>x?.[k]).find(v=>typeof v==='string'&&v.trim());
await writeStatus('governments','Actualizando gobiernos: consultando fuente oficial…',15); const govResponse=await fetch(GOV,{signal:AbortSignal.timeout(20000),headers:{'user-agent':'mi-actualidad-political-collector/1.0','accept':'application/pdf'}}); const governmentSource={url:GOV,status:govResponse.status,reachable:govResponse.ok}; if(!govResponse.ok) await writeStatus('governments-pending','Fuente de gobiernos no accesible; se conserva la edición anterior',25,{governmentSource});
const governments=JSON.parse(await fs.readFile(G,'utf8')); if(governments.governments?.length!==27)throw Error('El catálogo de gobiernos no contiene 27 países');
await writeStatus('parliament','Actualizando Parlamento Europeo: descargando eurodiputados actuales…',40,{governmentSource}); const payload=await getJson(EP); const meps=Array.isArray(payload)?payload:(payload.data||payload['@graph']||payload.member||payload.items||[]); if(!meps.length)throw Error('La API del Parlamento no devolvió eurodiputados');
const groups=new Map(); for(const mep of meps){const rawGroup=value(mep,'mep_political_group','politicalGroup','group','hasPoliticalGroup','api:political-group')||'No inscritos'; const rawCountry=value(mep,'mep_country_of_representation','countryOfRepresentation','country','nationality','api:country-of-representation')||'Sin país'; const key=rawGroup.toLowerCase().includes('epp')||rawGroup.toLowerCase().includes('ppe')||rawGroup.toLowerCase().includes('people')?'conservative':rawGroup.toLowerCase().includes('social')||rawGroup.toLowerCase().includes('s&d')||rawGroup.toLowerCase().includes('s/d')?'social':rawGroup.toLowerCase().includes('renew')?'liberal':rawGroup.toLowerCase().includes('green')||rawGroup.toLowerCase().includes('verts')||rawGroup.toLowerCase().includes('ale')?'green':rawGroup.toLowerCase().includes('left')?'left':rawGroup.toLowerCase().includes('ecr')?'conservative':rawGroup.toLowerCase().includes('pfe')||rawGroup.toLowerCase().includes('esn')||rawGroup.toLowerCase().includes('patriot')||rawGroup.toLowerCase().includes('sovereign')?'radical':'unaffiliated'; const item=groups.get(key)||{key,label:rawGroup,seats:0,countries:{}}; item.seats++; item.countries[rawCountry]=(item.countries[rawCountry]||0)+1; groups.set(key,item)}
await writeStatus('validating','Validando Parlamento y gobiernos…',80,{meps:meps.length}); const now=new Date().toISOString(); const parliament={schemaVersion:1,legislature:'2024–2029',totalSeats:720,assignedSeats:meps.length,vacantSeats:720-meps.length,checkedAt:now,sourceUrl:EP,groups:[...groups.values()],updateStatus:{stage:'completed',label:'Composición recalculada desde datos oficiales',progress:100,checkedAt:now}}; governments.verifiedAt=now; governments.updateStatus={stage:'completed',label:'Fuente oficial consultada; datos conservados hasta validar cambios',progress:100,pending:governments.governments.filter(x=>x.status!=='validated').length,checkedAt:now}; await fs.writeFile(G,JSON.stringify(governments,null,2)+'\n'); await fs.writeFile(P,JSON.stringify(parliament,null,2)+'\n'); await writeStatus('completed','Actualización política completada',100,{meps:meps.length,governmentSource}); console.log(JSON.stringify({meps:meps.length,groups:parliament.groups.map(x=>({key:x.key,seats:x.seats})),checkedAt:now},null,2));









