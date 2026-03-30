const API = 'https://api.spotify.com/v1';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function spotifyFetch(token, endpoint, { method = 'GET', body, params } = {}) {
  const url = new URL(`${API}${endpoint}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 429) {
    const retry = parseInt(res.headers.get('retry-after') || '5', 10);
    await sleep(retry * 1000);
    return spotifyFetch(token, endpoint, { method, body, params });
  }

  if (res.status === 204) return null;

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify ${res.status}: ${text.slice(0, 300)}`);
  }

  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// --- Search ---

export async function search(token, query, { type = 'track', limit = 20, offset = 0, market } = {}) {
  return spotifyFetch(token, '/search', {
    params: { q: query, type, limit, offset, market },
  });
}

// --- Playback ---

export async function getNowPlaying(token) {
  return spotifyFetch(token, '/me/player/currently-playing');
}

export async function getPlaybackState(token) {
  return spotifyFetch(token, '/me/player');
}

export async function play(token, { deviceId, contextUri, uris, offsetUri, positionMs } = {}) {
  const body = {};
  if (contextUri) body.context_uri = contextUri;
  if (uris) body.uris = uris;
  if (offsetUri) body.offset = { uri: offsetUri };
  if (positionMs !== undefined) body.position_ms = positionMs;

  const params = {};
  if (deviceId) params.device_id = deviceId;

  return spotifyFetch(token, '/me/player/play', {
    method: 'PUT',
    body: Object.keys(body).length > 0 ? body : undefined,
    params,
  });
}

export async function pause(token, { deviceId } = {}) {
  const params = {};
  if (deviceId) params.device_id = deviceId;
  return spotifyFetch(token, '/me/player/pause', { method: 'PUT', params });
}

export async function skipNext(token, { deviceId } = {}) {
  const params = {};
  if (deviceId) params.device_id = deviceId;
  return spotifyFetch(token, '/me/player/next', { method: 'POST', params });
}

export async function skipPrevious(token, { deviceId } = {}) {
  const params = {};
  if (deviceId) params.device_id = deviceId;
  return spotifyFetch(token, '/me/player/previous', { method: 'POST', params });
}

export async function setVolume(token, volumePercent, { deviceId } = {}) {
  const params = { volume_percent: volumePercent };
  if (deviceId) params.device_id = deviceId;
  return spotifyFetch(token, '/me/player/volume', { method: 'PUT', params });
}

export async function addToQueue(token, uri, { deviceId } = {}) {
  const params = { uri };
  if (deviceId) params.device_id = deviceId;
  return spotifyFetch(token, '/me/player/queue', { method: 'POST', params });
}

export async function getDevices(token) {
  return spotifyFetch(token, '/me/player/devices');
}

export async function getQueue(token) {
  return spotifyFetch(token, '/me/player/queue');
}

// --- Discovery ---

export async function getTopItems(token, type, { timeRange = 'medium_term', limit = 20, offset = 0 } = {}) {
  return spotifyFetch(token, `/me/top/${type}`, {
    params: { time_range: timeRange, limit, offset },
  });
}

export async function getRecentlyPlayed(token, { limit = 20 } = {}) {
  return spotifyFetch(token, '/me/player/recently-played', {
    params: { limit },
  });
}

export async function getArtistAlbums(token, artistId, { includeGroups = 'album,single', limit = 20, offset = 0, market } = {}) {
  return spotifyFetch(token, `/artists/${artistId}/albums`, {
    params: { include_groups: includeGroups, limit, offset, market },
  });
}

export async function getAlbumTracks(token, albumId, { limit = 50, offset = 0, market } = {}) {
  return spotifyFetch(token, `/albums/${albumId}/tracks`, {
    params: { limit, offset, market },
  });
}

export async function getTrack(token, trackId) {
  return spotifyFetch(token, `/tracks/${trackId}`);
}

export async function getArtist(token, artistId) {
  return spotifyFetch(token, `/artists/${artistId}`);
}

// --- Playlists ---

export async function getUserPlaylists(token, { limit = 20, offset = 0 } = {}) {
  return spotifyFetch(token, '/me/playlists', { params: { limit, offset } });
}

export async function getPlaylistTracks(token, playlistId, { limit = 50, offset = 0 } = {}) {
  return spotifyFetch(token, `/playlists/${playlistId}/tracks`, {
    params: { limit, offset },
  });
}

export async function addPlaylistTracks(token, playlistId, uris, { position } = {}) {
  const body = { uris };
  if (position !== undefined) body.position = position;
  return spotifyFetch(token, `/playlists/${playlistId}/tracks`, {
    method: 'POST',
    body,
  });
}

export async function removePlaylistTracks(token, playlistId, uris) {
  return spotifyFetch(token, `/playlists/${playlistId}/tracks`, {
    method: 'DELETE',
    body: { tracks: uris.map(uri => ({ uri })) },
  });
}

export async function replacePlaylistTracks(token, playlistId, uris) {
  for (let i = 0; i < uris.length; i += 100) {
    const batch = uris.slice(i, i + 100);
    const method = i === 0 ? 'PUT' : 'POST';
    await spotifyFetch(token, `/playlists/${playlistId}/tracks`, {
      method,
      body: { uris: batch },
    });
  }
}

export async function createPlaylist(token, { name, description = '', isPublic = false } = {}) {
  const user = await spotifyFetch(token, '/me');
  return spotifyFetch(token, `/users/${user.id}/playlists`, {
    method: 'POST',
    body: { name, description, public: isPublic },
  });
}

export async function updatePlaylistDetails(token, playlistId, { name, description } = {}) {
  const body = {};
  if (name !== undefined) body.name = name;
  if (description !== undefined) body.description = description;
  return spotifyFetch(token, `/playlists/${playlistId}`, {
    method: 'PUT',
    body,
  });
}

// --- Library ---

export async function saveTracks(token, ids) {
  return spotifyFetch(token, '/me/tracks', {
    method: 'PUT',
    body: { ids },
  });
}

export async function checkSavedTracks(token, ids) {
  return spotifyFetch(token, '/me/tracks/contains', {
    params: { ids: ids.join(',') },
  });
}

export async function getCurrentUser(token) {
  return spotifyFetch(token, '/me');
}
