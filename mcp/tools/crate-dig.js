import { z } from 'zod';
import { getAccessToken } from '../../lib/auth.js';
import * as spotify from '../../lib/spotify.js';
import { findDeepCuts } from '../../cli/generate.js';
import { ALL_GENRES } from '../../lib/genres.js';

export function registerCrateDigTools(server) {
  server.tool(
    'spotify_crate_dig',
    'Deep cuts generator — find obscure tracks across genres and optionally write them to a playlist. Uses randomized search across markets and decades to surface buried music.',
    {
      genres: z.array(z.string()).optional().describe('Genre IDs to search (fuzzy matched). Omit for random genres.'),
      count: z.number().int().min(1).max(100).default(30).describe('Number of tracks to find'),
      popularity_min: z.number().int().min(0).max(100).default(0).describe('Minimum popularity'),
      popularity_max: z.number().int().min(0).max(100).default(40).describe('Maximum popularity'),
      playlist_id: z.string().optional().describe('Playlist ID to write to. Defaults to SPOTIFY_PLAYLIST_ID env var.'),
      append: z.boolean().default(false).describe('Append to playlist instead of replacing'),
      dry_run: z.boolean().default(false).describe('Find tracks without modifying any playlist'),
    },
    async ({ genres, count, popularity_min, popularity_max, playlist_id, append, dry_run }) => {
      const token = await getAccessToken();
      const targetPlaylist = playlist_id || process.env.SPOTIFY_PLAYLIST_ID;

      const { tracks, attempts } = await findDeepCuts({
        token,
        genres: genres || undefined,
        count,
        popularity: { min: popularity_min, max: popularity_max },
      });

      if (tracks.length === 0) {
        return { content: [{ type: 'text', text: 'No tracks found matching the criteria.' }] };
      }

      const results = tracks.map(t => ({
        name: t.name,
        artists: t.artists?.map(a => a.name).join(', '),
        uri: t.uri,
        id: t.id,
        popularity: t.popularity,
        genre: t._genre,
        year: t.album?.release_date?.split('-')[0] || '?',
      }));

      if (!dry_run && targetPlaylist) {
        const uris = tracks.map(t => t.uri);
        if (append) {
          await spotify.addPlaylistTracks(token, targetPlaylist, uris);
        } else {
          await spotify.replacePlaylistTracks(token, targetPlaylist, uris);
        }

        const now = new Date().toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });
        const label = genres ? genres.join(', ') : 'random';
        const desc = `Deep cuts: ${label} — updated ${now}`;
        await spotify.updatePlaylistDetails(token, targetPlaylist, { description: desc });
      }

      const summary = {
        found: tracks.length,
        attempts,
        genres_searched: [...new Set(tracks.map(t => t._genre))],
        popularity_range: `${popularity_min}-${popularity_max}`,
        playlist: dry_run ? 'dry run' : (targetPlaylist ? `https://open.spotify.com/playlist/${targetPlaylist}` : 'none'),
        action: dry_run ? 'preview' : (append ? 'appended' : 'replaced'),
        tracks: results,
      };

      return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
    }
  );

  server.tool(
    'spotify_genres',
    'List available genre IDs for crate digging. Use with a search query to find matching genres.',
    {
      query: z.string().optional().describe('Search filter (e.g. "jazz", "metal", "folk")'),
    },
    async ({ query }) => {
      let genres = ALL_GENRES;
      if (query) {
        const q = query.toLowerCase();
        genres = ALL_GENRES.filter(g => g.includes(q));
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ total: genres.length, genres }, null, 2),
        }],
      };
    }
  );
}
