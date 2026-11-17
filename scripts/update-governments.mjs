import fs from 'node:fs/promises';

const path='public/data/eu-governments.json';
const d=JSON.parse(await fs.readFile(path,'utf8'));
if(!Array.isArray(d.governments)||d.governments.length!==27) throw new Error('El catálogo no contiene los 27 Estados miembros');

const fetchSource=async(url)=>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{'user-agent':'mi-actualidad-government-check/1.0','accept':'text/html,application/xhtml+xml'}});
    const body=await response.text();
    if(!response.ok||body.length<200) throw new Error('fuente no accesible');
    return {status:response.status,bytes:body.length};
  }finally{clearTimeout(timer)}
};

const checkedAt=new Date().toISOString();
const checked=[];
for(const g of d.governments){
  if(!g.country||!g.leader||!g.party||!g.sourceUrl?.startsWith('https://')) throw new Error('Registro incompleto: '+(g.country||'país desconocido'));
  try{
    const result=await fetchSource(g.sourceUrl);
    checked.push({country:g.country,url:g.sourceUrl,status:result.status,bytes:result.bytes,checkedAt});
  }catch(error){
    throw new Error('La fuente oficial de '+g.country+' no responde; se conserva la edición anterior');
  }
}

d.verifiedAt=checkedAt;
d.sourceChecks=checked;
d.updateStatus={
  stage:'completed',
  label:'Fuentes oficiales comprobadas',
  progress:100,
  methodology:'Clasificación editorial orientativa por la familia política del partido que dirige el Ejecutivo. Cada ejecución comprueba en directo la accesibilidad de la fuente oficial; si una fuente falla, no sustituye la edición anterior.'
};
await fs.writeFile(path,JSON.stringify(d,null,2)+'\n');
console.log('Fuentes oficiales comprobadas:',checked.length);
