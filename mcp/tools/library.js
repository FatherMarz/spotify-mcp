import { z } from 'zod';
import { getAccessToken } from '../../lib/auth.js';
import * as spotify from '../../lib/spotify.js';

export function registerLibraryTools(server) {
  server.tool(
    'spotify_library_save',
    'Save tracks to the user\'s library (heart/like them)',
    {
      ids: z.array(z.string()).min(1).max(50).describe('Array of Spotify track IDs'),
    },
    async ({ ids }) => {
      const token = await getAccessToken();
      await spotify.saveTracks(token, ids);
      return { content: [{ type: 'text', text: `Saved ${ids.length} track(s) to library.` }] };
    }
  );

  server.tool(
    'spotify_library_check',
    'Check if tracks are saved in the user\'s library',
    {
      ids: z.array(z.string()).min(1).max(50).describe('Array of Spotify track IDs'),
    },
    async ({ ids }) => {
      const token = await getAccessToken();
      const results = await spotify.checkSavedTracks(token, ids);

      const mapped = ids.map((id, i) => ({ id, saved: results[i] }));
      return { content: [{ type: 'text', text: JSON.stringify(mapped, null, 2) }] };
    }
  );
}
