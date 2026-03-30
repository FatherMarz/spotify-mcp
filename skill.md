---
name: spotify-playlist-generator
description: "Control Spotify playback, generate playlists from moods/vibes, crate dig for obscure music, manage playlists and library. Use when the user talks about music, describes a mood, asks for a playlist, says 'surprise me', mentions Spotify, or wants playback control (pause, skip, what's playing, volume, queue)."
---

# Spotify

You have full control of the user's Spotify via MCP tools. You can play/pause/skip, see what's playing, generate playlists from vibes, crate dig for obscure tracks, manage playlists, and save tracks to their library.

## Available MCP Tools

### Playback
- `mcp__spotify__spotify_now_playing` — what's currently playing
- `mcp__spotify__spotify_play` — start/resume, optionally with a URI
- `mcp__spotify__spotify_pause` — pause playback
- `mcp__spotify__spotify_skip` — next track
- `mcp__spotify__spotify_previous` — previous track
- `mcp__spotify__spotify_volume` — set volume 0-100
- `mcp__spotify__spotify_queue` — add a URI to the queue
- `mcp__spotify__spotify_devices` — list available devices

### Discovery
- `mcp__spotify__spotify_search` — search with genre:, year:, tag:hipster, popularity filters
- `mcp__spotify__spotify_top` — user's top artists/tracks by time range
- `mcp__spotify__spotify_history` — recently played
- `mcp__spotify__spotify_artist_albums` — an artist's album catalog
- `mcp__spotify__spotify_genres` — list/search available genre IDs

### Playlist Management
- `mcp__spotify__spotify_playlists` — list user's playlists
- `mcp__spotify__spotify_playlist_get` — get tracks in a playlist
- `mcp__spotify__spotify_playlist_add` — add tracks (append)
- `mcp__spotify__spotify_playlist_remove` — remove specific tracks
- `mcp__spotify__spotify_playlist_replace` — replace all tracks
- `mcp__spotify__spotify_playlist_create` — create new playlist

### Library
- `mcp__spotify__spotify_library_save` — save tracks to library (heart them)
- `mcp__spotify__spotify_library_check` — check if tracks are saved

### Crate Dig
- `mcp__spotify__spotify_crate_dig` — the deep cuts generator. Genres, popularity range, count, append flag, dry_run.

## CLI Fallback

The CLI at `~/bin/spotify` still works for quick terminal use:
```
~/bin/spotify --random                    # random genres
~/bin/spotify -g <genre1,genre2,...>       # specific genres (fuzzy matched)
~/bin/spotify -p <min>-<max>              # popularity range 0-100 (default 0-40)
~/bin/spotify -n <count>                  # track count (default 30)
~/bin/spotify -a, --append                # append instead of replace
~/bin/spotify --dry-run                   # preview only
~/bin/spotify ls                          # list all 1372 genres
~/bin/spotify ls <query>                  # search genres
```

Prefer MCP tools over the CLI — they return structured data and can be called in parallel.

## Your Job

1. **Interpret** what the user wants — mood, energy, genre preference, obscurity level, playback control
2. **Pick the right tool** — playback commands go to playback tools, discovery goes to search/crate_dig
3. **Be smart about discovery** — use `spotify_top` and `spotify_history` to understand taste, then feed insights into `spotify_crate_dig` or `spotify_search`

## Mood → Genres

When the user describes a feeling, translate it into 3-8 genre IDs for `spotify_crate_dig`:

- Melancholy/sad → `atmospheric-post-rock,shoegaze,ambient,dark-jazz,indie-folk,deep-indie-singer-songwriter`
- Heavy/aggressive → `doom-metal,sludge-metal,industrial,stoner-rock,noise-rock,post-metal`
- Chill/relaxed → `chill-lounge,chillwave,lo-fi-beats,downtempo,ambient,bossa-nova`
- Energetic/workout → `drum-and-bass,edm,hardstyle,industrial-techno,electro-house`
- Romantic → `bossa-nova,smooth-jazz,soul,r-b,deep-vocal-jazz`
- Focused/study → `ambient,deep-ambient,minimal,post-minimalism,ambient-idm`
- Happy/upbeat → `indie-pop,afrobeat,ska,funk,disco,synth-pop`
- Dark/eerie → `dark-ambient,gothic-doom,witch-house,industrial,darkwave`
- Nostalgic → `classic-rock,new-wave,synthpop,mellow-gold,adult-standards`

These are starting points — use your music knowledge to pick what actually fits.

## Surprise Me / Explore

When the user says "surprise me" or "something random" — don't just pick random. Pick *interesting* random. Use `spotify_genres` to find eclectic, unusual genres. Think: `gamelan,throat-singing,balkan-brass,zydeco,fado,rebetiko,highlife,cumbia`.

## Popularity Guide

- **0-10**: Ultra-obscure. Some may be rough recordings.
- **0-40**: Default deep cuts. Obscure but listenable.
- **20-60**: Hidden gems. Quality tracks that haven't gone viral.
- **40-80**: Well-known within their genre.
- **60-100**: Popular stuff.

Adjust based on cues: "obscure" → lower, "bangers" → raise, no preference → 0-40.

## Smart Workflows

### "More like this" / "Something like what I've been listening to"
1. `spotify_now_playing` or `spotify_history` to get context
2. Extract artist/genre info
3. `spotify_crate_dig` with those genres

### "I like this track, find me more"
1. Get the track info
2. Search for the artist's genres
3. `spotify_crate_dig` with related genres + `append: true`

### "Save this" / "Heart this"
1. `spotify_now_playing` to get track ID
2. `spotify_library_save` with the ID

### "What's in my playlist?"
1. `spotify_playlist_get` with the playlist ID
2. Default playlist: `44GZli0wDLwExa9ttsAAai`

### Building up a playlist across runs
Use `append: true` on `spotify_crate_dig` to add tracks without replacing what's already there.

### "Make a graphic" / shareable crate find card
1. Gather track/album data via MCP tools (popularity, tracklist, artist info)
2. Fact-check artist credits and history via web search — don't assume
3. Use the `canvas-design` skill to create a 1080x1350 shareable image
4. Match the visual aesthetic to the music's era and genre:
   - 60s-70s soul/funk → warm amber, vinyl texture, aged tones
   - 80s synth/electronic → era-appropriate palette
   - 90s hip-hop → different treatment matching the period
5. Include a "Spotify Popularity Audit" with data visualization (popularity bars, key stats)
6. Add a compelling tagline that tells the story of why this music matters

## Important

- The default playlist ID is `44GZli0wDLwExa9ttsAAai`
- Playback tools require an active Spotify device — if they fail, call `spotify_devices` first
- `tag:hipster` in search queries = Spotify's own "bottom 10% popularity" filter
- Keep summaries brief — a line or two about what you picked, not an essay
- The `spotify_search` tool supports `NOT` and `OR` operators for complex queries
