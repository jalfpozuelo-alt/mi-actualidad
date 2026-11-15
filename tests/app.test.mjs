import test from 'node:test'; import assert from 'node:assert/strict'; import data from '../public/data/news.json' with {type:'json'};
test('la portada tiene cinco noticias editoriales válidas',()=>{const cover=data.stories.filter(s=>['Política','Economía','Sociedad','Actualidad general'].includes(s.category)&&!['Tecnología','Medicina','Nutrición'].includes(s.section));assert.equal(cover.slice(0,5).length,5);assert.ok(cover.some(s=>s.country==='España'));});
test('cada historia tiene fuente y resumen en español de demostración',()=>{for(const s of data.stories){assert.ok(s.source.url);assert.ok(s.summary.length>40);}});

