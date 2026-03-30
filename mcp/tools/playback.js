import { z } from 'zod';
import { getAccessToken } from '../../lib/auth.js';
import * as spotify from '../../lib/spotify.js';

function formatTrack(item) {
  if (!item) return null;
  return {
    name: item.name,
    artists: item.artists?.map(a => a.name).join(', '),
    album: item.album?.name,
    uri: item.uri,
    id: item.id,
    popularity: item.popularity,
    duration_ms: item.duration_ms,
    url: item.external_urls?.spotify,
  };
}

export function registerPlaybackTools(server) {
  server.tool(
    'spotify_now_playing',
    'Get the currently playing track on Spotify',
    {},
    async () => {
      const token = await getAccessToken();
      const data = await spotify.getNowPlaying(token);

      if (!data || !data.item) {
        return { content: [{ type: 'text', text: 'Nothing is currently playing.' }] };
      }

      const result = {
        track: formatTrack(data.item),
        is_playing: data.is_playing,
        progress_ms: data.progress_ms,
        device: data.device?.name,
      };

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'spotify_play',
    'Start or resume playback. Optionally play a specific track, album, or playlist URI. Requires an active Spotify device — call spotify_devices first if this fails.',
    {
      uri: z.string().optional().describe('Spotify URI to play (track, album, artist, or playlist)'),
      device_id: z.string().optional().describe('Target device ID'),
    },
    async ({ uri, device_id }) => {
      const token = await getAccessToken();
      const opts = { deviceId: device_id };

      if (uri) {
        if (uri.includes(':track:')) {
          opts.uris = [uri];
        } else {
          opts.contextUri = uri;
        }
      }

      await spotify.play(token, opts);
      return { content: [{ type: 'text', text: 'Playback started.' }] };
    }
  );

  server.tool(
    'spotify_pause',
    'Pause playback',
    {
      device_id: z.string().optional().describe('Target device ID'),
    },
    async ({ device_id }) => {
      const token = await getAccessToken();
      await spotify.pause(token, { deviceId: device_id });
      return { content: [{ type: 'text', text: 'Playback paused.' }] };
    }
  );

  server.tool(
    'spotify_skip',
    'Skip to the next track',
    {
      device_id: z.string().optional().describe('Target device ID'),
    },
    async ({ device_id }) => {
      const token = await getAccessToken();
      await spotify.skipNext(token, { deviceId: device_id });
      return { content: [{ type: 'text', text: 'Skipped to next track.' }] };
    }
  );

  server.tool(
    'spotify_previous',
    'Go back to the previous track',
    {
      device_id: z.string().optional().describe('Target device ID'),
    },
    async ({ device_id }) => {
      const token = await getAccessToken();
      await spotify.skipPrevious(token, { deviceId: device_id });
      return { content: [{ type: 'text', text: 'Went back to previous track.' }] };
    }
  );

  server.tool(
    'spotify_volume',
    'Set the playback volume (0-100)',
    {
      volume: z.number().int().min(0).max(100).describe('Volume level 0-100'),
      device_id: z.string().optional().describe('Target device ID'),
    },
    async ({ volume, device_id }) => {
      const token = await getAccessToken();
      await spotify.setVolume(token, volume, { deviceId: device_id });
      return { content: [{ type: 'text', text: `Volume set to ${volume}%.` }] };
    }
  );

  server.tool(
    'spotify_queue',
    'Add a track to the playback queue',
    {
      uri: z.string().describe('Spotify track URI (e.g. spotify:track:xxx)'),
      device_id: z.string().optional().describe('Target device ID'),
    },
    async ({ uri, device_id }) => {
      const token = await getAccessToken();
      await spotify.addToQueue(token, uri, { deviceId: device_id });
      return { content: [{ type: 'text', text: `Added to queue: ${uri}` }] };
    }
  );

  server.tool(
    'spotify_devices',
    'List available Spotify playback devices',
    {},
    async () => {
      const token = await getAccessToken();
      const data = await spotify.getDevices(token);

      const devices = (data?.devices || []).map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        is_active: d.is_active,
        volume: d.volume_percent,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(devices, null, 2) }] };
    }
  );
}
