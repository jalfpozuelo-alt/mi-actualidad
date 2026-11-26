import fs from 'node:fs/promises';

const date = new Date();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const destination = 'generated/on-this-day.json';
try {
  const response = await fetch(`https://api.wikimedia.org/feed/v1/wikipedia/es/onthisday/all/${month}/${day}`, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Wikimedia respondió ${response.status}`);
  const payload = await response.json();
  const items = [...(payload.events || []), ...(payload.births || []), ...(payload.deaths || [])].filter(item => item?.text).slice(0, 6);
  if (!items.length) throw new Error('Wikimedia no devolvió efemérides');
  await fs.mkdir('generated', { recursive: true });
  await fs.writeFile(destination, JSON.stringify({ schemaVersion: 1, date: date.toISOString().slice(0, 10), source: 'Wikimedia', items }, null, 2));
  console.log(`Efemérides recopiladas: ${items.length}`);
} catch (error) {
  await fs.mkdir('generated', { recursive: true });
  const previous = await fs.readFile('public/data/on-this-day.json', 'utf8').catch(() => null);
  if (!previous) throw error;
  await fs.writeFile(destination, previous);
  console.warn(`Efemérides no disponibles. Se conserva la última edición válida: ${error.message}`);
}
