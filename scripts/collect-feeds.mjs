import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import Parser from 'rss-parser';
const catalog=JSON.parse(await fs.readFile('config/sources.json','utf8'));
const extra=JSON.parse(await fs.readFile('config/sources-extra.json','utf8'));
catalog.sources.push(...extra.sources);
const editorial=JSON.parse(await fs.readFile('config/editorial.json','utf8'));
const parser=new Parser({timeout:10000}); const stories=[]; const withTimeout=(promise,ms,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label+' timeout')),ms))]);
const spanishSources=new Set(catalog.sources.filter(s=>s.language==='es').map(s=>s.id));
const translationEmail=process.env.MYMEMORY_EMAIL||'';
const googleTranslateKey=process.env.GOOGLE_TRANSLATE_API_KEY||'';
const translationCachePath='generated/translation-cache.json'; const translationCacheAge=3*24*60*60*1000; const translationCacheStat=await fs.stat(translationCachePath).catch(()=>null); const translationCacheSource=translationCacheStat&&Date.now()-translationCacheStat.mtimeMs<translationCacheAge?await fs.readFile(translationCachePath,'utf8').catch(()=> '{}'):'{}'; const translationCache=new Map(Object.entries(JSON.parse(translationCacheSource)));
let translationCalls=0; const deadline=Date.now()+180000;
async function translateTitle(title){
  if(spanishSources.has(this.id)||spanishWords.test(title)) return title;
  if(translationCache.has(title)){const cached=translationCache.get(title);if(cached&&!containsCjk(cached)&&!looksUntranslated(cached,sourceLanguage)&&!containsForeignTitle(cached))return cached;translationCache.delete(title)}
  if(translationCalls>=40||Date.now()>deadline)return null;
  translationCalls++;
  const sourceLanguage=this.language||'en';
  if(googleTranslateKey){
    try{
      const response=await fetch('https://translation.googleapis.com/language/translate/v2?key='+encodeURIComponent(googleTranslateKey),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({q:title,source:sourceLanguage,target:'es',format:'text'}),signal:AbortSignal.timeout(6000)});
      const result=await response.json();const translated=result?.data?.translations?.[0]?.translatedText?.trim();
      if(translated&&!containsCjk(translated)&&translated.toLowerCase()!==title.toLowerCase()&&!looksUntranslated(translated,sourceLanguage)){translationCache.set(title,translated);return translated;}
    }catch{}
  }
  if(!translationEmail)return null;
  try{const url='https://api.mymemory.translated.net/get?q='+encodeURIComponent(title)+'&langpair='+sourceLanguage+'|es&de='+encodeURIComponent(translationEmail);const response=await fetch(url,{signal:AbortSignal.timeout(6000)});const result=await response.json();const translated=result?.responseData?.translatedText?.trim();if(!translated||translated.toLowerCase()===title.toLowerCase()||looksUntranslated(translated,sourceLanguage))return null;translationCache.set(title,translated);return translated}catch{return null}
}
const looksUntranslated=(value,language)=>{const words=value.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').match(/[a-záéíóúüñ]+/g)||[];const sets={fr:new Set(['le','la','les','des','une','est','pour','dans','avec','que','sur','au','aux','du','il','fait','chez','francais','français','cinq','français','chauffes','chauffés','proposent','mesures','lutter','contre','precarite','précarité','energetique','énergétique']),de:new Set(['der','die','das','und','ist','für','mit','von','den','dem','nicht','ein','eine','zu','auf','werden','wird','nach','über','als']),en:new Set(['the','and','is','for','with','from','this','that','in'])};const set=sets[language];return Boolean(set&&words.filter(w=>set.has(w)).length>=2)};
const containsForeignTitle=value=>{const words=value.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').match(/[a-záéíóúüñ]+/g)||[];const foreign=new Set(['le','la','les','des','une','est','pour','dans','avec','que','sur','au','aux','du','il','fait','chez','francais','français','cinq','chauffes','chauffés','proposent','mesures','lutter','contre','precarite','précarité','energetique','énergétique','der','die','das','und','ist','für','mit','von','den','dem','nicht','ein','eine','zu','auf','werden','wird','nach','über','als']);return words.filter(w=>foreign.has(w)).length>=2};
const containsCjk=value=>Array.from(value).some(char=>{const code=char.codePointAt(0)||0;return (code>=0x3400&&code<=0x9fff)||(code>=0x3040&&code<=0x30ff)});
const spanishWords=/\b(el|la|los|las|una|un|de|del|para|con|por|que|en|es|sus|sobre|tras|más|cómo|hoy|mundo|gobierno|economía|política|salud|tecnología)\b/i;
const imageUrl=item=>item?.enclosure?.url||item?.['media:content']?.$?.url||item?.['media:thumbnail']?.$?.url||null;
const topicKey=value=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9áéíóúüñ ]/gi,' ').split(/\s+/).filter(w=>w.length>3&&!['para','desde','entre','sobre','tras','como','esta','este','esta','unos','unas'].includes(w)).slice(0,8).sort().join('|');
const sourceQuality=s=>/consilium|boe|who|pubmed|white house|united nations/i.test(s.name)?10:/reuters|associated press|bbc|france ?24|deutsche welle|elpais|new york times|guardian/i.test(s.name)?8:4;
const impactBoost=s=>/Internacional|Política|Economía|Sociedad/.test(s.section)?8:/Tecnología|Medicina/.test(s.section)?6:3;
const technologyWords=/\b(ia|inteligencia artificial|software|hardware|internet|app|aplicación|móvil|iphone|android|google|apple|microsoft|nvidia|tesla|chip|chips|ordenador|tecnolog|ciberseguridad|robot|videojuego|pantalla|wifi|semiconductor|satélite|dron|datos digitales|samsung|bixby|meta|openai|anthropic|chatgpt|cloud|nube|algoritmo|modelo de lenguaje|red social|privacidad digital)\b/i;
for(const source of catalog.sources.filter(s=>editorial.enabledSources.includes(s.id))){if(Date.now()>deadline) break; try{const feed=await withTimeout(parser.parseURL(source.url),12000,source.name);const perSource=source.id==='clarin-ar'?5:editorial.maxItemsPerSource;for(const item of (feed.items||[]).slice(0,perSource)){const url=item.link||item.guid;const originalTitle=item.title?.trim();const publishedAt=item.isoDate||item.pubDate||null;if(!url||!originalTitle||!publishedAt||Date.now()-new Date(publishedAt).getTime()>editorial.maxAgeDays*86400000)continue;if(source.sections.includes('Tecnología')&&!technologyWords.test(originalTitle))continue;const isSpanish=spanishSources.has(source.id);const title=isSpanish?originalTitle:await translateTitle.call(source,originalTitle);if(!title||containsCjk(title)||containsForeignTitle(title))continue;if(source.sections.includes('Tecnología')&&!technologyWords.test(title))continue;const section=source.sections.includes('Tecnología')?'Tecnología':source.sections[0];const hours=Math.max(0,(Date.now()-new Date(publishedAt).getTime())/3600000);const importance=Math.max(1,100-Math.min(70,hours*2)+impactBoost({section})+sourceQuality(source));const summary=isSpanish?(item.contentSnippet||item.summary||'').replace(/\s+/g,' ').trim().slice(0,600):'Titular traducido al español. Pulsa para leer la información completa en la fuente original.';stories.push({id:`${source.id}-${crypto.createHash('sha1').update(url).digest('hex').slice(0,16)}`,title,summary,publishedAt,updatedAt:new Date().toISOString(),country:source.country,countryCode:source.countryCode,section,category:section,importance,source:{name:source.name,url},topicKey:topicKey(title),image:imageUrl(item),isVerifiedSource:true,isEditorialSummary:false});}}catch{console.warn(`Fuente no disponible: ${source.name}`)}}
const deduped=[...new Map(stories.map(s=>[s.title.toLowerCase().replace(/[^a-z0-9áéíóúüñ]+/gi,' '),s])).values()];
const topicCounts=deduped.reduce((m,s)=>m.set(s.topicKey,(m.get(s.topicKey)||0)+1),new Map());
for(const story of deduped)story.importance=Math.min(150,story.importance+Math.max(0,(topicCounts.get(story.topicKey)||1)-1)*12);
const unique=deduped.sort((a,b)=>b.importance-a.importance).filter((story,index,all)=>all.slice(0,index).filter(s=>s.country===story.country&&s.section===story.section).length<5);
await fs.mkdir('generated',{recursive:true});await fs.writeFile('generated/news-feed.json',JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),isEditoriallyValidated:false,summaryStatus:'pending-editorial-review',stories:unique},null,2));console.log(`Recopiladas ${unique.length} entradas con fuentes identificadas. No se publican como edición final.`);
await fs.writeFile('generated/translation-cache.json',JSON.stringify(Object.fromEntries(translationCache),null,2));
process.exit(0);
