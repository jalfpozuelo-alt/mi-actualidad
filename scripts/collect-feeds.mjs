import fs from 'node:fs/promises';
import Parser from 'rss-parser';
const catalog=JSON.parse(await fs.readFile('config/sources.json','utf8'));
const editorial=JSON.parse(await fs.readFile('config/editorial.json','utf8'));
const parser=new Parser({timeout:15000}); const stories=[];
for(const source of catalog.sources.filter(s=>editorial.enabledSources.includes(s.id))){try{const feed=await parser.parseURL(source.url);for(const item of (feed.items||[]).slice(0,editorial.maxItemsPerSource)){const url=item.link||item.guid;if(!url||!item.title)continue;stories.push({id:`${source.id}-${Buffer.from(url).toString('base64url').slice(0,20)}`,title:item.title.trim(),summary:(item.contentSnippet||item.summary||'').replace(/\s+/g,' ').trim().slice(0,600),publishedAt:item.isoDate||item.pubDate||null,updatedAt:new Date().toISOString(),country:source.country,countryCode:source.countryCode,section:source.sections[0],category:source.sections[0],source:{name:source.name,url},isVerifiedSource:true,isEditorialSummary:false});}}catch{console.warn(`Fuente no disponible: ${source.name}`)}}
const unique=[...new Map(stories.map(s=>[s.title.toLowerCase().replace(/[^a-z0-9áéíóúüñ]+/gi,' '),s])).values()];
await fs.mkdir('generated',{recursive:true});await fs.writeFile('generated/news-feed.json',JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),isEditoriallyValidated:false,summaryStatus:'pending-editorial-review',stories:unique},null,2));console.log(`Recopiladas ${unique.length} entradas con fuentes identificadas. No se publican como edición final.`);

