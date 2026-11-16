import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import Parser from 'rss-parser';
const catalog=JSON.parse(await fs.readFile('config/sources.json','utf8'));
const extra=JSON.parse(await fs.readFile('config/sources-extra.json','utf8'));
catalog.sources.push(...extra.sources);
const editorial=JSON.parse(await fs.readFile('config/editorial.json','utf8'));
const parser=new Parser({timeout:15000}); const stories=[];
const spanishSources=new Set(catalog.sources.filter(s=>s.language==='es').map(s=>s.id));
const translationEmail=process.env.MYMEMORY_EMAIL||'';
const translationCache=new Map(Object.entries(JSON.parse(await fs.readFile('generated/translation-cache.json','utf8').catch(()=> '{}'))));
let translationCalls=0;
async function translateTitle(title){
  if(spanishSources.has(this.id)||spanishWords.test(title)) return title;
  if(!translationEmail) return null;
  if(translationCache.has(title)) return translationCache.get(title);
  if(translationCalls>=40)return null;
  translationCalls++;
  try{const url=`https://api.mymemory.translated.net/get?q=${encodeURIComponent(title)}&langpair=${this.language||'en'}|es&de=${encodeURIComponent(translationEmail)}`;const response=await fetch(url,{signal:AbortSignal.timeout(6000)});const result=await response.json();const translated=result?.responseData?.translatedText?.trim();if(!translated||/^[\s\W]*[a-z]/i.test(translated)===false)return null;translationCache.set(title,translated);return translated}catch{return null}
}
const containsCjk=value=>/[\\u3400-\\u9fff\\u3040-\\u30ff]/u.test(value);\nconst spanishWords=/\b(el|la|los|las|una|un|de|del|para|con|por|que|en|es|sus|sobre|tras|más|cómo|hoy|mundo|gobierno|economía|política|salud|tecnología)\b/i;
const technologyWords=/\b(ia|inteligencia artificial|software|hardware|internet|app|aplicación|móvil|iphone|android|google|apple|microsoft|nvidia|tesla|chip|chips|ordenador|tecnolog|ciberseguridad|robot|videojuego|pantalla|wifi|semiconductor|satélite|dron|datos digitales)\b/i;
for(const source of catalog.sources.filter(s=>editorial.enabledSources.includes(s.id))){try{const feed=await parser.parseURL(source.url);const perSource=source.id==='clarin-ar'?5:editorial.maxItemsPerSource;for(const item of (feed.items||[]).slice(0,perSource)){const url=item.link||item.guid;const originalTitle=item.title?.trim();const publishedAt=item.isoDate||item.pubDate||null;if(!url||!originalTitle||!publishedAt||Date.now()-new Date(publishedAt).getTime()>editorial.maxAgeDays*86400000)continue;if(source.id==='xataka'&&!technologyWords.test(originalTitle))continue;const isSpanish=spanishSources.has(source.id);const title=isSpanish?originalTitle:await translateTitle.call(source,originalTitle);if(!title)continue;if(source.id==='xataka'&&!technologyWords.test(title))continue;const section=source.id==='xataka'?'Tecnología':source.sections[0];const hours=Math.max(0,(Date.now()-new Date(publishedAt).getTime())/3600000);const importance=Math.max(1,100-Math.min(70,hours*2)+(source.country==='España'?15:0)+(source.id==='clarin-ar'?2:0)+(section==='Internacional'?5:0));const summary=isSpanish?(item.contentSnippet||item.summary||'').replace(/\s+/g,' ').trim().slice(0,600):'Titular traducido al español. Pulsa para leer la información completa en la fuente original.';stories.push({id:`${source.id}-${crypto.createHash('sha1').update(url).digest('hex').slice(0,16)}`,title,summary,publishedAt,updatedAt:new Date().toISOString(),country:source.country,countryCode:source.countryCode,section,category:section,importance,source:{name:source.name,url},isVerifiedSource:true,isEditorialSummary:false});}}catch{console.warn(`Fuente no disponible: ${source.name}`)}}
const deduped=[...new Map(stories.map(s=>[s.title.toLowerCase().replace(/[^a-z0-9áéíóúüñ]+/gi,' '),s])).values()];
const unique=deduped.sort((a,b)=>b.importance-a.importance).filter((story,index,all)=>all.slice(0,index).filter(s=>s.country===story.country&&s.section===story.section).length<5);
await fs.mkdir('generated',{recursive:true});await fs.writeFile('generated/news-feed.json',JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),isEditoriallyValidated:false,summaryStatus:'pending-editorial-review',stories:unique},null,2));console.log(`Recopiladas ${unique.length} entradas con fuentes identificadas. No se publican como edición final.`);
await fs.writeFile('generated/translation-cache.json',JSON.stringify(Object.fromEntries(translationCache),null,2));

