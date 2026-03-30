import { z } from 'zod';
import { getAccessToken } from '../../lib/auth.js';
import * as spotify from '../../lib/spotify.js';

export function registerDiscoveryTools(server) {
  server.tool(
    'spotify_top',
    "Get the user's top artists or tracks. Useful for understanding taste and seeding crate digs.",
    {
      type: z.enum(['artists', 'tracks']).describe('Top artists or tracks'),
      time_range: z.enum(['short_term', 'medium_term', 'long_term']).default('medium_term')
        .describe('short_term (~4 weeks), medium_term (~6 months), long_term (~1 year)'),
      limit: z.number().int().min(1).max(50).default(20).describe('Number of results'),
    },
    async ({ type, time_range, limit }) => {
      const token = await getAccessToken();
      const data = await spotify.getTopItems(token, type, { timeRange: time_range, limit });

      const items = (data?.items || []).map(item => {
        if (type === 'tracks') {
          return {
            name: item.name,
            artists: item.artists?.map(a => a.name).join(', '),
            uri: item.uri,
            id: item.id,
            popularity: item.popularity,
          };
        } else {
          return {
            name: item.name,
            genres: item.genres,
            uri: item.uri,
            id: item.id,
            popularity: item.popularity,
          };
        }
      });

      return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
    }
  );

  server.tool(
    'spotify_history',
    'Get recently played tracks',
    {
      limit: z.number().int().min(1).max(50).default(20).describe('Number of tracks'),
    },
    async ({ limit }) => {
      const token = await getAccessToken();
      const data = await spotify.getRecentlyPlayed(token, { limit });

      const items = (data?.items || []).map(item => ({
        name: item.track?.name,
        artists: item.track?.artists?.map(a => a.name).join(', '),
        uri: item.track?.uri,
        id: item.track?.id,
        played_at: item.played_at,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
    }
  );

  server.tool(
    'spotify_artist_albums',
    "Get an artist's album catalog for deep-diving their discography",
    {
      artist_id: z.string().describe('Spotify artist ID'),
      include_groups: z.string().default('album,single').describe('Comma-separated: album, single, appears_on, compilation'),
      limit: z.number().int().min(1).max(50).default(20).describe('Number of albums'),
      offset: z.number().int().min(0).default(0).describe('Pagination offset'),
    },
    async ({ artist_id, include_groups, limit, offset }) => {
      const token = await getAccessToken();
      const data = await spotify.getArtistAlbums(token, artist_id, {
        includeGroups: include_groups, limit, offset,
      });

      const items = (data?.items || []).map(item => ({
        name: item.name,
        uri: item.uri,
        id: item.id,
        release_date: item.release_date,
        total_tracks: item.total_tracks,
        type: item.album_group,
        url: item.external_urls?.spotify,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
    }
  );
}
