import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getAccessToken } from '../lib/auth.js';
import * as spotify from '../lib/spotify.js';
import { ALL_GENRES, fuzzyMatchGenres, shuffle, pickRandom } from '../lib/genres.js';

export { ALL_GENRES };

const __dirname = dirname(fileURLToPath(import.meta.url));

const MARKETS = ['US', 'GB', 'DE', 'FR', 'JP', 'AU', 'CA', 'ES', 'IT', 'BR', 'MX', 'SE', 'NL'];
const MIN_DURATION_MS = 60_000;
const MAX_DURATION_MS = 600_000;
const START_YEAR = 1950;
const END_YEAR = new Date().getFullYear();
const MAX_ARTIST_REPEATS = 1;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function searchTracksForGenre(token, genre) {
  const market = pickRandom(MARKETS);
  const offset = Math.floor(Math.random() * 950);
  const year = START_YEAR + Math.floor(Math.random() * (END_YEAR - START_YEAR));

  const roll = Math.random();
  let yearQuery;
  if (roll < 0.3) {
    yearQuery = `year:${year}`;
  } else if (roll < 0.6) {
    const decade = Math.floor(year / 10) * 10;
    yearQuery = `year:${decade}-${decade + 9}`;
  } else {
    yearQuery = `year:${START_YEAR}-${END_YEAR}`;
  }

  const q = `genre:${genre} ${yearQuery}`;
  try {
    const data = await spotify.search(token, q, { market, limit: 50, offset });
    return data?.tracks?.items || [];
  } catch (e) {
    if (e.message.includes('Limit + Offset exceeds maximum')) return [];
    return [];
  }
}

/**
 * Find deep cuts — the core search + filter loop.
 * Returns an array of track objects with a _genre property.
 */
export async function findDeepCuts({ token, genres: genreFilter, count = 30, popularity = {} } = {}) {
  const minPop = popularity.min ?? 0;
  const maxPop = popularity.max ?? 40;

  const genrePool = genreFilter
    ? fuzzyMatchGenres(genreFilter)
    : ALL_GENRES;

  if (genrePool.length === 0) {
    throw new Error('No matching genres found.');
  }

  const selected = [];
  const usedTrackIds = new Set();
  const artistCounts = new Map();

  const maxCycles = genreFilter ? Math.max(10, Math.ceil(count / genrePool.length) * 3) : 1;
  let attempts = 0;
  const maxAttempts = Math.max(200, genrePool.length * maxCycles);

  for (let cycle = 0; cycle < maxCycles && selected.length < count; cycle++) {
    const shuffled = shuffle(genrePool);
    for (const genre of shuffled) {
      if (selected.length >= count || attempts >= maxAttempts) break;
      attempts++;

      const tracks = await searchTracksForGenre(token, genre);
      if (tracks.length === 0) continue;

      const valid = tracks.filter(t => {
        if (usedTrackIds.has(t.id)) return false;
        if (t.popularity < minPop || t.popularity > maxPop) return false;
        if (t.duration_ms < MIN_DURATION_MS || t.duration_ms > MAX_DURATION_MS) return false;
        for (const artist of t.artists) {
          if ((artistCounts.get(artist.id) || 0) >= MAX_ARTIST_REPEATS + 1) return false;
        }
        return true;
      });

      if (valid.length === 0) continue;

      const perSearch = genrePool.length <= 5 ? Math.min(5, valid.length, count - selected.length) : 1;
      const shuffledValid = shuffle(valid);

      for (let i = 0; i < perSearch; i++) {
        const track = shuffledValid[i];
        selected.push({ ...track, _genre: genre });
        usedTrackIds.add(track.id);
        for (const artist of track.artists) {
          artistCounts.set(artist.id, (artistCounts.get(artist.id) || 0) + 1);
        }
        console.log(`  [${selected.length}/${count}] "${track.name}" by ${track.artists.map(a => a.name).join(', ')} (pop: ${track.popularity}, genre: ${genre})`);
      }

      await sleep(100);
    }
  }

  return { tracks: selected, attempts };
}

/**
 * Full generate flow: find tracks, write to playlist, save history.
 */
export async function generate({ genres: genreFilter, count = 30, popularity, dryRun = false, append = false } = {}) {
  const playlistId = process.env.SPOTIFY_PLAYLIST_ID;
  const minPop = popularity?.min ?? 0;
  const maxPop = popularity?.max ?? 40;
  const label = genreFilter ? genreFilter.join(', ') : 'random';

  console.log(`\n=== Deep Cuts Generator ===`);
  console.log(`Mode: ${label} | Target: ${count} tracks | Popularity: ${minPop}-${maxPop} | Playlist: ${playlistId}`);
  if (genreFilter) {
    const pool = fuzzyMatchGenres(genreFilter);
    console.log(`Genre pool: ${pool.length} genres`);
  }
  if (append) console.log('** APPEND MODE — adding to existing playlist **');
  if (dryRun) console.log('** DRY RUN — will not modify playlist **');
  console.log('');

  const token = await getAccessToken();
  console.log('Authenticated with Spotify\n');

  const { tracks: selected, attempts } = await findDeepCuts({
    token,
    genres: genreFilter,
    count,
    popularity: { min: minPop, max: maxPop },
  });

  console.log(`\nFound ${selected.length} tracks in ${attempts} attempts`);

  if (selected.length === 0) {
    console.error('No tracks found!');
    process.exit(1);
  }

  const finalTracks = shuffle(selected);
  const finalUris = finalTracks.map(t => t.uri);

  if (dryRun) {
    console.log('\nDry run complete. Would have replaced playlist with these tracks.');
    return;
  }

  console.log('\nUpdating playlist...');
  if (append) {
    await spotify.addPlaylistTracks(token, playlistId, finalUris);
  } else {
    await spotify.replacePlaylistTracks(token, playlistId, finalUris);
  }

  const now = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const desc = genreFilter
    ? `Deep cuts: ${label} — updated ${now}`
    : `Fresh deep cuts — updated ${now}`;
  await spotify.updatePlaylistDetails(token, playlistId, { description: desc });

  console.log(`\nPlaylist ${append ? 'appended' : 'updated'} with ${selected.length} tracks.`);
  console.log(`https://open.spotify.com/playlist/${playlistId}`);

  // Save history
  const historyDir = join(__dirname, 'history');
  if (!existsSync(historyDir)) mkdirSync(historyDir);

  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const usedGenres = [...new Set(selected.map(t => t._genre))];

  let md = `# Deep Cuts — ${dateStr}\n\n`;
  md += `> ${label} | ${selected.length} tracks across ${usedGenres.length} genres | Generated ${timeStr}\n\n`;
  md += `| # | Track | Artist | Genre | Pop | Year |\n`;
  md += `|---|-------|--------|-------|-----|------|\n`;
  selected.forEach((t, i) => {
    const artist = t.artists.map(a => a.name).join(', ');
    const year = t.album?.release_date?.split('-')[0] || '?';
    md += `| ${i + 1} | ${t.name} | ${artist} | ${t._genre} | ${t.popularity} | ${year} |\n`;
  });
  md += `\n[Open in Spotify](https://open.spotify.com/playlist/${playlistId})\n`;

  const mdPath = join(historyDir, `${dateStr}.md`);
  writeFileSync(mdPath, md);
  console.log(`Saved history to ${mdPath}`);
}

// If run directly (cron mode)
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url).endsWith(process.argv[1].replace(/.*\//, ''));
if (isDirectRun && !process.argv[1].endsWith('spotify')) {
  const count = parseInt(process.env.TRACK_COUNT || '30', 10);
  const dryRun = process.env.DRY_RUN === '1';
  generate({ count, dryRun }).catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}
