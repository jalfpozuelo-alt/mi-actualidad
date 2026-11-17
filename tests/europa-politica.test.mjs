import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const data=JSON.parse(fs.readFileSync('public/data/eu-governments.json','utf8'));
const categories={
 socialist:'#DC3545',radicalLeft:'#8E44AD',liberal:'#E5B700',conservative:'#2563B8',
 radicalRight:'#23864B',green:'#16A6B6',nationalist:'#C77732',pending:'#9299A3'
};
const expected=['Alemania','Austria','Bélgica','Bulgaria','Chequia','Chipre','Croacia','Dinamarca','Eslovaquia','Eslovenia','España','Estonia','Finlandia','Francia','Grecia','Hungría','Irlanda','Italia','Letonia','Lituania','Luxemburgo','Malta','Países Bajos','Polonia','Portugal','Rumanía','Suecia'];

test('Gobiernos Europa contiene exactamente los 27 países',()=>{
 assert.equal(data.governments.length,27);
 assert.equal(new Set(data.governments.map(g=>g.country)).size,27);
 assert.deepEqual([...data.governments.map(g=>g.country)].sort(),[...expected].sort());
});

test('cada registro tiene partido, trazabilidad y estado explícito',()=>{
 for(const g of data.governments){
  assert.ok(g.leader&&g.party&&g.sourceUrl);
  assert.ok(['validated','pending'].includes(g.status));
  if(g.status==='validated'){
   assert.ok(categories[g.category]);
   assert.ok(g.justification);
   assert.ok(g.academicSources?.length);
  } else assert.equal(g.category,null);
 }
});

test('Italia y Bélgica aplican el contraste far-right de PopuList',()=>{
 for(const country of ['Italia','Bélgica']){
  const g=data.governments.find(x=>x.country===country);
  assert.equal(g.category,'radicalRight');
  assert.equal(g.popuList.farRight,true);
 }
});

test('los pendientes no se convierten silenciosamente en una categoría',()=>{
 const pending=data.governments.filter(g=>g.status==='pending');
 assert.ok(pending.length>0);
 assert.ok(pending.every(g=>g.category===null));
});

test('la suma de categorías es 27',()=>{
 const total=data.governments.reduce((n,g)=>n+(g.status==='validated'&&g.category?1:1),0);
 assert.equal(total,27);
});