import fs from 'node:fs/promises';
const d=new Date(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
const r=await fetch('https://api.wikimedia.org/feed/v1/wikipedia/es/onthisday/all/'+m+'/'+day);
if(!r.ok)throw new Error('No se pudo consultar efemérides');
const x=await r.json(); const items=[...(x.events||[]),...(x.births||[]),...(x.deaths||[])].filter(e=>e?.text).slice(0,6);
await fs.mkdir('generated',{recursive:true}); await fs.writeFile('generated/on-this-day.json',JSON.stringify({schemaVersion:1,date:d.toISOString().slice(0,10),source:'Wikimedia',items},null,2)); console.log('Efemérides recopiladas:',items.length);
