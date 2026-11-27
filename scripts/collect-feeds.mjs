import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import Parser from 'rss-parser';

const catalog = JSON.parse(await fs.readFile('config/sources.json', 'utf8'));
const extra = JSON.parse(await fs.readFile('config/sources-extra.json', 'utf8'));
catalog.sources.push(...extra.sources);
const editorial = JSON.parse(await fs.readFile('config/editorial.json', 'utf8'));
const parseSelection = name => { try { const value = JSON.parse(process.env[name] || ''); return Array.isArray(value) && value.length ? new Set(value) : null; } catch { return null; } };
const selectedCountries = parseSelection('NEWS_COUNTRIES');
const selectedTopics = parseSelection('NEWS_TOPICS');
const selectedProfiles = parseSelection('NEWS_PROFILES');
const parser = new Parser();
const stories = [];
const deadline = Date.now() + 150_000;
const translationRequestTimeout = 2_500;
const translationTitleTimeout = 8_000;
const withTimeout = (promise, ms, label) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms))]);
const fetchFeedText = async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' } });
  if (!response.ok) throw new Error(`RSS HTTP ${response.status}`);
  return response.text();
};
const spanishSources = new Set(catalog.sources.filter(source => source.language === 'es').map(source => source.id));
const translationEmail = process.env.MYMEMORY_EMAIL || '';
const googleTranslateKey = process.env.GOOGLE_TRANSLATE_API_KEY || '';
const cachePath = 'generated/translation-cache.json';
const cacheAge = 3 * 24 * 60 * 60 * 1000;

const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const containsCjk = value => Array.from(value).some(char => {
  const code = char.codePointAt(0) || 0;
  return (code >= 0x3400 && code <= 0x9fff) || (code >= 0x3040 && code <= 0x30ff);
});
const words = value => normalize(value).match(/[a-z]+/g) || [];
const foreignWords = {
  fr: new Set(['le', 'la', 'les', 'des', 'une', 'est', 'pour', 'dans', 'avec', 'que', 'sur', 'au', 'aux', 'du', 'il', 'fait', 'chez', 'francais', 'cinq', 'chauffes', 'proposent', 'mesures', 'lutter', 'contre', 'precarite', 'energetique']),
  de: new Set(['der', 'die', 'das', 'und', 'ist', 'fur', 'mit', 'von', 'den', 'dem', 'nicht', 'ein', 'eine', 'zu', 'auf', 'werden', 'wird', 'nach', 'uber', 'als']),
  en: new Set(['the', 'and', 'is', 'for', 'with', 'from', 'this', 'that', 'in'])
};
const looksUntranslated = (value, language) => {
  if (containsCjk(value)) return language === 'zh' || language === 'ja';
  const sourceWords = foreignWords[language];
  return Boolean(sourceWords && words(value).filter(word => sourceWords.has(word)).length >= 2);
};
const containsForeignTitle = value => Object.values(foreignWords).some(set => words(value).filter(word => set.has(word)).length >= 2);

async function readCache() {
  try {
    const parsed = JSON.parse(await fs.readFile(cachePath, 'utf8'));
    if (parsed?.createdAt && parsed?.entries && Date.now() - Date.parse(parsed.createdAt) < cacheAge) return new Map(Object.entries(parsed.entries));
  } catch {}
  return new Map();
}
const translationCache = await readCache();
let translationCalls = 0;

async function translateTitle(title) {
  const sourceLanguage = this.language || 'en';
  if (spanishSources.has(this.id)) return title;
  const cached = translationCache.get(title);
  if (cached && !containsCjk(cached) && !looksUntranslated(cached, sourceLanguage) && !containsForeignTitle(cached)) return cached;
  if (cached) translationCache.delete(title);
  if (translationCalls >= 40 || Date.now() > deadline) return null;
  translationCalls++;
  const accept = translated => translated && !containsCjk(translated) && translated.toLowerCase() !== title.toLowerCase() && !looksUntranslated(translated, sourceLanguage) && !containsForeignTitle(translated);
  if (googleTranslateKey) {
    try {
      const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(googleTranslateKey)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: title, source: sourceLanguage, target: 'es', format: 'text' }), signal: AbortSignal.timeout(translationRequestTimeout) });
      const translated = (await response.json())?.data?.translations?.[0]?.translatedText?.trim();
      if (accept(translated)) { translationCache.set(title, translated); return translated; }
    } catch {}
  }
  if (!translationEmail) return null;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(title)}&langpair=${sourceLanguage}|es&de=${encodeURIComponent(translationEmail)}`;
    const translated = (await (await fetch(url, { signal: AbortSignal.timeout(translationRequestTimeout) })).json())?.responseData?.translatedText?.trim();
    if (!accept(translated)) return null;
    translationCache.set(title, translated);
    return translated;
  } catch { return null; }
}

const imageUrl = item => item?.enclosure?.url || item?.['media:content']?.$?.url || item?.['media:thumbnail']?.$?.url || null;
const topicKey = value => normalize(value).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(word => word.length > 3 && !['para', 'desde', 'entre', 'sobre', 'tras', 'como', 'esta', 'este', 'unos', 'unas'].includes(word)).slice(0, 8).sort().join('|');
const sourceQuality = source => /consilium|boe|who|pubmed|white house|united nations/i.test(source.name) ? 10 : /reuters|associated press|bbc|france ?24|deutsche welle|elpais|new york times|guardian/i.test(source.name) ? 8 : 4;
const impactBoost = story => /Internacional|Política|Economía|Sociedad/.test(story.section) ? 8 : /Tecnología|Medicina/.test(story.section) ? 6 : 3;
const storyTopic = story => { const text = `${story.section} ${story.title}`.toLowerCase(); if (/tecnolog|\bia\b|inteligencia artificial|software|hardware/.test(text)) return 'Tecnología'; if (/ciencia|salud|medicina|investigación|espacio/.test(text)) return 'Ciencia'; if (/clima|medio ambiente|calentamiento|energía|emisiones/.test(text)) return 'Clima'; if (/ciudad|vivienda|urban|municip|metro|alcald/.test(text)) return 'Ciudades'; if (/econom|mercado|empleo|empresa|finanz|inflación/.test(text)) return 'Economía'; if (/polít|gobierno|elección|parlamento|presidente|partido|diplomac/.test(text)) return 'Política'; return 'Sociedad'; };
const technologyWords = /\b(ai|ia|inteligencia artificial|artificial intelligence|machine learning|aprendizaje automático|software|hardware|internet|app|aplicación|móvil|mobile|iphone|android|google|apple|microsoft|nvidia|tesla|chip|chips|ordenador|computer|tecnolog|technology|ciberseguridad|cybersecurity|robot|videojuego|gaming|pantalla|wifi|semiconductor|satélite|satellite|dron|drone|datos digitales|digital data|samsung|bixby|meta|openai|anthropic|chatgpt|cloud|nube|algoritmo|algorithm|modelo de lenguaje|language model|red social|social media|privacidad digital|digital privacy)\b/i;
const isTechnologyTitle = title => technologyWords.test(title);

for (const source of catalog.sources.filter(source => editorial.enabledSources.includes(source.id) && (!selectedCountries || selectedCountries.has(source.country)) && (!selectedProfiles || selectedProfiles.has(source.editorialProfile || 'generalist')))) {
  if (Date.now() > deadline) break;
  try {
    const feed = await withTimeout(fetchFeedText(source.url).then(xml => parser.parseString(xml)), 12_000, source.name);
    const perSource = source.id === 'clarin-ar' ? 5 : editorial.maxItemsPerSource;
    for (const item of (feed.items || []).slice(0, perSource)) {
      const url = item.link || item.guid;
      const originalTitle = item.title?.trim();
      const publishedAt = item.isoDate || item.pubDate || null;
      if (!url || !originalTitle || !publishedAt || Date.now() - new Date(publishedAt).getTime() > editorial.maxAgeDays * 86400000) continue;
      const title = spanishSources.has(source.id) ? originalTitle : await withTimeout(translateTitle.call(source, originalTitle), translationTitleTimeout, `Traducción de ${source.name}`).catch(() => null);
      if (!title || containsCjk(title) || containsForeignTitle(title)) continue;
      const section = source.sections.includes('Tecnología') && isTechnologyTitle(title) ? 'Tecnología' : source.sections[0];
      if (source.sections.includes('Tecnología') && source.sections.length === 1 && !isTechnologyTitle(title)) continue;
      const hours = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 3_600_000);
      const importance = Math.max(1, 100 - Math.min(70, hours * 2) + impactBoost({ section }) + sourceQuality(source));
      const summary = spanishSources.has(source.id) ? (item.contentSnippet || item.summary || '').replace(/\s+/g, ' ').trim().slice(0, 600) : 'Titular traducido al español. Pulsa para leer la información completa en la fuente original.';
      stories.push({ id: `${source.id}-${crypto.createHash('sha1').update(url).digest('hex').slice(0, 16)}`, title, summary, publishedAt, updatedAt: new Date().toISOString(), country: source.country, countryCode: source.countryCode, section, category: section, importance, source: { name: source.name, url, editorialProfile: source.editorialProfile || 'generalist' }, topicKey: topicKey(title), image: imageUrl(item), isVerifiedSource: true, isEditorialSummary: false });
    }
  } catch { console.warn(`Fuente no disponible: ${source.name}`); }
}

const filteredStories = selectedTopics ? stories.filter(story => selectedTopics.has(storyTopic(story))) : stories;
const deduped = [...new Map(filteredStories.map(story => [normalize(story.title).replace(/[^a-z0-9]+/g, ' '), story])).values()];
const topicCounts = deduped.reduce((map, story) => map.set(story.topicKey, (map.get(story.topicKey) || 0) + 1), new Map());
for (const story of deduped) story.importance = Math.min(150, story.importance + Math.max(0, (topicCounts.get(story.topicKey) || 1) - 1) * 12);
const countrySectionCounts = new Map();
const countryProfileCounts = new Map();
const unique = deduped.sort((a, b) => b.importance - a.importance).filter(story => {
  const countryKey = `${story.country}:${story.section}`;
  const profileKey = `${countryKey}:${story.source.editorialProfile || 'generalist'}`;
  const countryCount = countrySectionCounts.get(countryKey) || 0;
  const profileCount = countryProfileCounts.get(profileKey) || 0;
  if (countryCount >= (editorial.maxItemsPerCountry || 6)) return false;
  if (profileCount >= (editorial.maxItemsPerProfile || 2)) return false;
  countrySectionCounts.set(countryKey, countryCount + 1);
  countryProfileCounts.set(profileKey, profileCount + 1);
  return true;
});
await fs.mkdir('generated', { recursive: true });
await fs.writeFile('generated/news-feed.json', JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), isEditoriallyValidated: false, summaryStatus: 'pending-editorial-review', stories: unique }, null, 2));
await fs.writeFile(cachePath, JSON.stringify({ createdAt: new Date().toISOString(), entries: Object.fromEntries(translationCache) }, null, 2));
console.log(`Recopiladas ${unique.length} entradas con fuentes identificadas.`);

