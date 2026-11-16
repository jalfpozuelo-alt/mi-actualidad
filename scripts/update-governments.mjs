import fs from 'node:fs/promises';
const path='public/data/eu-governments.json';
const d=JSON.parse(await fs.readFile(path,'utf8'));
if(!Array.isArray(d.governments)||d.governments.length!==27) throw new Error('El catálogo no contiene los 27 Estados miembros');
const urls=d.governments.map(g=>g.sourceUrl).filter(Boolean);
const unique=new Set(urls);
if(unique.size<d.governments.length) throw new Error('Faltan fuentes propias por país; se conserva el gráfico anterior');
for(const g of d.governments){
  if(!g.country||!g.leader||!g.party||!g.sourceUrl?.startsWith('https://')) throw new Error('Registro incompleto: '+g.country);
}
d.verifiedAt=new Date().toISOString();
d.updateStatus={stage:'completed',label:'Gráfico generado',progress:100,methodology:'Clasificación orientativa basada en el partido que dirige el Ejecutivo; requiere fuente propia por país.'};
await fs.writeFile(path,JSON.stringify(d,null,2)+'\n');
console.log('Gobiernos validados:',d.governments.length);