import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inject } from '../../js/data.js';
const here = dirname(fileURLToPath(import.meta.url));
export function loadData() {
  const read = f => JSON.parse(readFileSync(join(here, '..', '..', 'data', f + '.json'), 'utf8'));
  return inject(Object.fromEntries(['categories', 'places', 'stations', 'lines', 'transfers', 'fares', 'phrases', 'tips'].map(f => [f, read(f)])));
}
