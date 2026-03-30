import { z } from 'zod';
import { getAccessToken } from '../../lib/auth.js';
import * as spotify from '../../lib/spotify.js';

export function registerPlaylistTools(server) {
  server.tool(
    'spotify_playlists',
    "List the user's playlists",
    {
      limit: z.number().int().min(1).max(50).default(20).describe('Number of playlists'),
      offset: z.number().int().min(0).default(0).describe('Pagination offset'),
    },
    async ({ limit, offset }) => {
      const token = await getAccessToken();
      const data = await spotify.getUserPlaylists(token, { limit, offset });

      const items = (data?.items || []).map(item => ({
        name: item.name,
        id: item.id,
        uri: item.uri,
        total_tracks: item.tracks?.total,
        owner: item.owner?.display_name,
        url: item.external_urls?.spotify,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
    }
  );

  server.tool(
    'spotify_playlist_get',
    'Get tracks in a playlist',
    {
      playlist_id: z.string().describe('Spotify playlist ID'),
      limit: z.number().int().min(1).max(50).default(50).describe('Number of tracks'),
      offset: z.number().int().min(0).default(0).describe('Pagination offset'),
    },
    async ({ playlist_id, limit, offset }) => {
      const token = await getAccessToken();
      const data = await spotify.getPlaylistTracks(token, playlist_id, { limit, offset });

      const items = (data?.items || []).map(item => ({
        name: item.track?.name,
        artists: item.track?.artists?.map(a => a.name).join(', '),
        uri: item.track?.uri,
        id: item.track?.id,
        popularity: item.track?.popularity,
        added_at: item.added_at,
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ total: data?.total, items }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'spotify_playlist_add',
    'Add tracks to a playlist (append)',
    {
      playlist_id: z.string().describe('Spotify playlist ID'),
      uris: z.array(z.string()).min(1).describe('Array of Spotify track URIs'),
      position: z.number().int().min(0).optional().describe('Position to insert at (default: end)'),
    },
    async ({ playlist_id, uris, position }) => {
      const token = await getAccessToken();
      await spotify.addPlaylistTracks(token, playlist_id, uris, { position });
      return { content: [{ type: 'text', text: `Added ${uris.length} tracks to playlist.` }] };
    }
  );

  server.tool(
    'spotify_playlist_remove',
    'Remove specific tracks from a playlist',
    {
      playlist_id: z.string().describe('Spotify playlist ID'),
      uris: z.array(z.string()).min(1).describe('Array of Spotify track URIs to remove'),
    },
    async ({ playlist_id, uris }) => {
      const token = await getAccessToken();
      await spotify.removePlaylistTracks(token, playlist_id, uris);
      return { content: [{ type: 'text', text: `Removed ${uris.length} tracks from playlist.` }] };
    }
  );

  server.tool(
    'spotify_playlist_replace',
    'Replace all tracks in a playlist',
    {
      playlist_id: z.string().describe('Spotify playlist ID'),
      uris: z.array(z.string()).min(1).describe('Array of Spotify track URIs'),
    },
    async ({ playlist_id, uris }) => {
      const token = await getAccessToken();
      await spotify.replacePlaylistTracks(token, playlist_id, uris);
      return { content: [{ type: 'text', text: `Replaced playlist with ${uris.length} tracks.` }] };
    }
  );

  server.tool(
    'spotify_playlist_create',
    'Create a new playlist',
    {
      name: z.string().min(1).describe('Playlist name'),
      description: z.string().default('').describe('Playlist description'),
      public: z.boolean().default(false).describe('Make playlist public'),
    },
    async (params) => {
      const token = await getAccessToken();
      const playlist = await spotify.createPlaylist(token, {
        name: params.name,
        description: params.description,
        isPublic: params.public,
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            id: playlist.id,
            name: playlist.name,
            uri: playlist.uri,
            url: playlist.external_urls?.spotify,
          }, null, 2),
        }],
      };
    }
  );
}
