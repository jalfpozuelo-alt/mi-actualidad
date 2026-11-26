import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const feedCollector = fs.readFileSync('scripts/collect-feeds.mjs', 'utf8');
const onThisDay = fs.readFileSync('scripts/collect-on-this-day.mjs', 'utf8');
const newsStatus = fs.readFileSync('api/status.ts', 'utf8');
const app = fs.readFileSync('src/main.tsx', 'utf8');

test('las fuentes no españolas se traducen antes de validar el idioma', () => {
  assert.match(feedCollector, /const sourceLanguage = this\.language \|\| 'en';/);
  assert.doesNotMatch(feedCollector, /spanishWords/);
  assert.match(feedCollector, /createdAt/);
});

test('la sección de tecnología exige un tema tecnológico y admite diez artículos independientes', () => {
  assert.match(feedCollector, /isTechnologyTitle\(title\)/);
  assert.match(feedCollector, /story\.section === 'Tecnología' \? 3 : 5/);
  assert.match(app, /sorted\.slice\(0,10\)/);
});

test('un fallo de efemérides conserva la última edición válida', () => {
  assert.match(onThisDay, /public\/data\/on-this-day\.json/);
  assert.match(onThisDay, /Se conserva la última edición válida/);
});

test('el estado de noticias se asocia a la solicitud actual y devuelve la conclusión real', () => {
  assert.match(newsStatus, /searchParams\.get\('after'\)/);
  assert.match(newsStatus, /conclusion:run\.conclusion/);
  assert.match(app, /status\?after=/);
});
