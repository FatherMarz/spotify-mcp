import { z } from 'zod';
import { getAccessToken } from '../../lib/auth.js';
import * as spotify from '../../lib/spotify.js';

export function registerSearchTools(server) {
  server.tool(
    'spotify_search',
    'Search Spotify. Supports field filters in the query: genre:, artist:, album:, track:, year: (or year range like year:1970-1980), tag:hipster (bottom 10% popularity albums), tag:new (last 2 weeks). Use OR and NOT operators for complex queries.',
    {
      query: z.string().min(1).describe('Search query with optional field filters'),
      type: z.enum(['track', 'artist', 'album', 'playlist']).default('track').describe('Result type'),
      limit: z.number().int().min(1).max(50).default(20).describe('Max results'),
      offset: z.number().int().min(0).default(0).describe('Pagination offset'),
      market: z.string().length(2).optional().describe('ISO 3166-1 alpha-2 country code'),
      min_popularity: z.number().int().min(0).max(100).optional().describe('Client-side filter: minimum popularity'),
      max_popularity: z.number().int().min(0).max(100).optional().describe('Client-side filter: maximum popularity'),
    },
    async ({ query, type, limit, offset, market, min_popularity, max_popularity }) => {
      const token = await getAccessToken();
      const data = await spotify.search(token, query, { type, limit, offset, market });

      const key = `${type}s`;
      let items = data?.[key]?.items || [];

      if (min_popularity !== undefined || max_popularity !== undefined) {
        items = items.filter(item => {
          const pop = item.popularity ?? 0;
          if (min_popularity !== undefined && pop < min_popularity) return false;
          if (max_popularity !== undefined && pop > max_popularity) return false;
          return true;
        });
      }

      const results = items.map(item => {
        if (type === 'track') {
          return {
            name: item.name,
            artists: item.artists?.map(a => a.name).join(', '),
            album: item.album?.name,
            uri: item.uri,
            id: item.id,
            popularity: item.popularity,
            release_date: item.album?.release_date,
            url: item.external_urls?.spotify,
          };
        } else if (type === 'artist') {
          return {
            name: item.name,
            genres: item.genres,
            uri: item.uri,
            id: item.id,
            popularity: item.popularity,
            url: item.external_urls?.spotify,
          };
        } else if (type === 'album') {
          return {
            name: item.name,
            artists: item.artists?.map(a => a.name).join(', '),
            uri: item.uri,
            id: item.id,
            release_date: item.release_date,
            total_tracks: item.total_tracks,
            url: item.external_urls?.spotify,
          };
        } else {
          return {
            name: item.name,
            uri: item.uri,
            id: item.id,
            owner: item.owner?.display_name,
            total_tracks: item.tracks?.total,
            url: item.external_urls?.spotify,
          };
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ total: data?.[key]?.total, items: results }, null, 2),
        }],
      };
    }
  );
}
