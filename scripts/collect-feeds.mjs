import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import Parser from 'rss-parser';
const catalog=JSON.parse(await fs.readFile('config/sources.json','utf8'));
const extra=JSON.parse(await fs.readFile('config/sources-extra.json','utf8'));
catalog.sources.push(...extra.sources);
const editorial=JSON.parse(await fs.readFile('config/editorial.json','utf8'));
const parser=new Parser({timeout:15000}); const stories=[];
const spanishSources=new Set(['elpais','bbc-mundo','france24','clarin-ar','xataka','dw-es','eu-consilium','pubmed','who']);
const spanishWords=/\b(el|la|los|las|una|un|de|del|para|con|por|que|en|es|sus|sobre|tras|más|cómo|hoy|mundo|gobierno|economía|política|salud|tecnología)\b/i;
for(const source of catalog.sources.filter(s=>editorial.enabledSources.includes(s.id)&&spanishSources.has(s.id))){try{const feed=await parser.parseURL(source.url);const perSource=source.id==='clarin-ar'?5:editorial.maxItemsPerSource;for(const item of (feed.items||[]).slice(0,perSource)){const url=item.link||item.guid;const title=item.title?.trim();const publishedAt=item.isoDate||item.pubDate||null;if(!url||!title||!publishedAt||!spanishWords.test(title)||Date.now()-new Date(publishedAt).getTime()>editorial.maxAgeDays*86400000)continue;const section=source.sections[0];const hours=Math.max(0,(Date.now()-new Date(publishedAt).getTime())/3600000);const importance=Math.max(1,100-Math.min(70,hours*2)+(source.country==='España'?15:0)+(source.id==='clarin-ar'?2:0)+(section==='Internacional'?5:0));stories.push({id:`${source.id}-${crypto.createHash('sha1').update(url).digest('hex').slice(0,16)}`,title,summary:(item.contentSnippet||item.summary||'').replace(/\s+/g,' ').trim().slice(0,600),publishedAt,updatedAt:new Date().toISOString(),country:source.country,countryCode:source.countryCode,section,category:section,importance,source:{name:source.name,url},isVerifiedSource:true,isEditorialSummary:false});}}catch{console.warn(`Fuente no disponible: ${source.name}`)}}
const unique=[...new Map(stories.map(s=>[s.title.toLowerCase().replace(/[^a-z0-9áéíóúüñ]+/gi,' '),s])).values()];
await fs.mkdir('generated',{recursive:true});await fs.writeFile('generated/news-feed.json',JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),isEditoriallyValidated:false,summaryStatus:'pending-editorial-review',stories:unique},null,2));console.log(`Recopiladas ${unique.length} entradas con fuentes identificadas. No se publican como edición final.`);

