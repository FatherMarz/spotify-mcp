import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ALL_GENRES = JSON.parse(
  readFileSync(join(__dirname, '..', 'genres.json'), 'utf8')
);

export function fuzzyMatchGenres(queries) {
  return queries.flatMap(g => {
    if (ALL_GENRES.includes(g)) return [g];
    const matches = ALL_GENRES.filter(id => id.includes(g));
    if (matches.length > 0) return matches;
    return [];
  });
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
