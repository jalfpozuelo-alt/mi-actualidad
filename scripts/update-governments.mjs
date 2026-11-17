import fs from 'node:fs/promises';

const path='public/data/eu-governments.json';
const data=JSON.parse(await fs.readFile(path,'utf8'));
const expectedCountries=['Alemania','Austria','Bélgica','Bulgaria','Chequia','Chipre','Croacia','Dinamarca','Eslovaquia','Eslovenia','España','Estonia','Finlandia','Francia','Grecia','Hungría','Irlanda','Italia','Letonia','Lituania','Luxemburgo','Malta','Países Bajos','Polonia','Portugal','Rumanía','Suecia'];
const categories={
 socialist:'#DC3545',radicalLeft:'#8E44AD',liberal:'#E5B700',conservative:'#2563B8',
 radicalRight:'#23864B',green:'#16A6B6',nationalist:'#C77732',pending:'#9299A3'
};
if(!Array.isArray(data.governments)||data.governments.length!==27) throw new Error('Se requieren exactamente 27 países');
const names=data.governments.map(g=>g.country);
if(new Set(names).size!==27||expectedCountries.some(c=>!names.includes(c))) throw new Error('Países duplicados o ausentes');
for(const g of data.governments){
  if(!g.leader||!g.party||!g.sourceUrl) throw new Error('Registro incompleto: '+g.country);
  if(!['validated','pending'].includes(g.status)) throw new Error('Estado inválido: '+g.country);
  if(g.status==='pending'&&g.category!==null) throw new Error('Un pendiente no puede conservar categoría: '+g.country);
  if(g.status==='validated'&&!categories[g.category]) throw new Error('Categoría inválida: '+g.country);
  if(g.status==='validated'&&(!g.justification||!g.academicSources?.length)) throw new Error('Falta trazabilidad: '+g.country);
}
const pending=data.governments.filter(g=>g.status==='pending').length;
data.updateStatus={stage:'completed',label:'Datos estructurados y pendientes explícitos',progress:100,comparativeMode:'manifesto-primary',pending};
await fs.writeFile(path,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({countries:data.governments.length,pending,validated:data.governments.length-pending},null,2));