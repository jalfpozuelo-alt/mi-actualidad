import fs from 'node:fs/promises';
const path='public/data/eu-governments.json';
const d=JSON.parse(await fs.readFile(path,'utf8'));
d.verifiedAt=new Date().toISOString();
d.updateStatus={stage:'completed',label:'Gráfico generado',progress:100};
await fs.writeFile(path,JSON.stringify(d,null,2)+'\n');
console.log('Gobiernos actualizados:',d.governments?.length||0);
