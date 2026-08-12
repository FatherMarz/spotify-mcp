#!/usr/bin/env node
import { getAccessToken } from '../lib/auth.js';

const PLAYLIST_ID = process.env.SPOTIFY_PLAYLIST_ID || '44GZli0wDLwExa9ttsAAai';
const TARGET = 40;
const MAX_PER_ARTIST = 2;

const ARTISTS = [
  'Curtis Mayfield', 'Sly & The Family Stone', 'Parliament', 'Funkadelic',
  'The Meters', 'Earth, Wind & Fire', 'Stevie Wonder', 'James Brown',
  'Kool & The Gang', 'Ohio Players', 'The Isley Brothers', 'Marva Whitney',
  'Bobby Womack', 'Bill Withers', 'Gil Scott-Heron', 'Roy Ayers',
  'Donald Byrd', 'The Brothers Johnson', 'Shuggie Otis', 'Betty Davis',
  'Mandrill', 'Tower of Power', 'Rufus', 'Chaka Khan',
  "The O'Jays", 'Harold Melvin & The Blue Notes', 'The Temptations',
  "Gladys Knight & The Pips", 'Al Green', 'Ann Peebles',
  'Willie Hutch', 'Eddie Kendricks', 'The Spinners', 'The Staple Singers',
  'Clarence Carter', 'The Delfonics', 'Smokey Robinson', 'Barry White',
  'Isaac Hayes', 'The Bar-Kays', 'Maceo Parker', 'Fred Wesley',
  "The J.B.'s", 'Lyn Collins', 'Charles Wright & the Watts 103rd Street Rhythm Band',
  'The Undisputed Truth', 'The Dramatics', 'The Stylistics',
  'Heatwave', 'The Whispers', 'Brick', 'Cameo', 'Lakeside',
  "Bootsy's Rubber Band", 'The Gap Band', 'Rick James', 'Teena Marie',
  'Diana Ross', 'Marvin Gaye', 'Donny Hathaway',
  'Roberta Flack', 'Minnie Riperton', 'Linda Clifford', 'Cymande',
  'War', 'Pleasure', 'Slave', 'Con Funk Shun',
  'Rose Royce', 'Switch', 'The Jones Girls', 'B.T. Express',
  'Brass Construction', 'Crown Heights Affair', 'Chic', 'L.T.D.',
  'Gary B.B. Coleman', 'Z.Z. Hill', 'Johnnie Taylor', 'Tyrone Davis',
];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function searchTracks(artist) {
  const token = await getAccessToken();
  const query = `artist:"${artist}" year:1970-1979`;
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  return data.tracks?.items || [];
}

async function clearPlaylist() {
  const token = await getAccessToken();
  const getRes = await fetch(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks?fields=items(track(uri,id))&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const current = await getRes.json();
  const toRemove = (current.items || [])
    .filter((i) => i.track)
    .map((i) => ({ uri: i.track.uri }));
  if (toRemove.length > 0) {
    await fetch(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tracks: toRemove }),
    });
    console.log(`Cleared ${toRemove.length} existing tracks.`);
  }
}

async function addToPlaylist(trackUris) {
  const token = await getAccessToken();
  const url = `https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: trackUris }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

async function main() {
  await clearPlaylist();

  const seen = new Set();
  const picks = [];
  const artistCounts = {};

  for (const artist of shuffle(ARTISTS)) {
    if (picks.length >= TARGET) break;
    try {
      const tracks = await searchTracks(artist);
      const valid = tracks.filter((t) => {
        if (seen.has(t.id)) return false;
        if (t.popularity < 5 || t.popularity > 75) return false;
        const name = t.name.toLowerCase();
        if (/\blive\b|\bdemo\b|\balternate\b|\btake \d+\b/i.test(name)) return false;
        return true;
      });
      for (const t of valid) {
        if (picks.length >= TARGET) break;
        const artistKey = t.artists[0]?.name || artist;
        if ((artistCounts[artistKey] || 0) >= MAX_PER_ARTIST) continue;
        seen.add(t.id);
        artistCounts[artistKey] = (artistCounts[artistKey] || 0) + 1;
        picks.push(t);
      }
    } catch (e) {
      console.error(`Failed for ${artist}:`, e.message);
    }
  }

  console.log(`\nFound ${picks.length} tracks:\n`);
  picks.forEach((t, i) =>
    console.log(`  [${String(i + 1).padStart(2, '0')}] "${t.name}" by ${t.artists.map((a) => a.name).join(', ')} (pop: ${t.popularity})`)
  );

  if (picks.length === 0) {
    console.log('No tracks found.');
    process.exit(1);
  }

  await addToPlaylist(picks.map((t) => t.uri));
  console.log(`\nAdded ${picks.length} tracks to playlist ${PLAYLIST_ID}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
