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
2. **Pick the right tool** — don't default to `spotify_crate_dig` for everything. Read the search strategy section below to pick the best approach.
3. **Be smart about discovery** — use `spotify_top` and `spotify_history` to understand taste, then feed insights into search or crate dig

## Search Strategy: Crate Dig vs Direct Search

**This is critical.** The `spotify_crate_dig` tool and `spotify_search` tool serve different purposes. Picking the wrong one wastes time and returns bad results.

### Use `spotify_crate_dig` when:
- The user wants **random discovery** across broad genres ("surprise me", "something weird")
- No specific era or decade is required
- The genres are pre-2000 and well-populated (soul, funk, rock, jazz, blues, folk)

### Use `spotify_search` directly when:
- The user wants a **specific era** (e.g., "70s soul", "2014 liquid DnB")
- The genres are **electronic/modern** — crate dig's year randomization (1950-present) means most searches miss modern music entirely
- You want to use **`tag:hipster`** (bottom 10% popularity) — this is the single best filter for finding obscure-but-quality music and only works via search
- You want to search by **specific artists** (`artist:X OR artist:Y`) to find a scene
- You need **precise control** over the query

### The winning search pattern for targeted crate digs:
```
genre:<genre> year:<start>-<end> tag:hipster
```
Then apply client-side popularity filters (`min_popularity`, `max_popularity`). Run 3-5 parallel searches across related genres to build up volume.

### For artist-adjacent discovery:
```
artist:X OR artist:Y OR artist:Z year:<range>
```
Great for finding a scene (e.g., all the Hospital Records artists from 2012-2016).

## Genre Pitfalls

Some Spotify genre tags are polluted. Avoid or use carefully:

| Genre | Problem | Workaround |
|-------|---------|------------|
| `soul` (no year filter) | Catches phonk, slowed edits, Brazilian funk | Always combine with `year:XXXX-YYYY` |
| `disco`, `deep-disco` | Flooded with German schlager party music | Use `post-disco-soul` instead, or add year filter |
| `bass-music` | Dominated by "Bass Boosted" spam accounts | Use `bassline` or `drum-and-bass` instead |
| `funk` (no year filter) | Catches Brazilian funk, EDM remixes | Lock to a decade with `year:` |
| `deep-funk` | Very sparse, mostly library music | Combine with other funk genres |
| `p-funk` | Misattributes non-funk artists (Clean Bandit, etc.) | Use with year filter |
| `drum-and-bass` with year filter | Returns zero results via crate dig | Search directly, don't use crate dig for DnB |

## Mood → Genres

When the user describes a feeling, translate it into 3-8 genre IDs:

- Melancholy/sad → `atmospheric-post-rock,shoegaze,ambient,dark-jazz,indie-folk,deep-indie-singer-songwriter`
- Heavy/aggressive → `doom-metal,sludge-metal,industrial,stoner-rock,noise-rock,post-metal`
- Chill/relaxed → `chill-lounge,chillwave,lo-fi-beats,downtempo,ambient,bossa-nova`
- Energetic/workout → `drum-and-bass,edm,hardstyle,industrial-techno,electro-house`
- Romantic → `bossa-nova,smooth-jazz,soul,r-b,deep-vocal-jazz`
- Focused/study → `ambient,deep-ambient,minimal,post-minimalism,ambient-idm`
- Happy/upbeat → `indie-pop,afrobeat,ska,funk,disco,synth-pop`
- Dark/eerie → `dark-ambient,gothic-doom,witch-house,industrial,darkwave`
- Nostalgic → `classic-rock,new-wave,synthpop,mellow-gold,adult-standards`
- Late night DnB → search directly for `liquid dnb`, `neurofunk`, `dark dnb roller` with year filters
- Focus/boom boom → `electro-house,tech-house,minimal-techno,acid-techno` with year:2018-2026

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

### Era-specific crate digging (the best approach for most requests)
1. Identify the era and genre from what the user says
2. Run 3-5 parallel `spotify_search` calls with `genre:<x> year:<start>-<end> tag:hipster` and `max_popularity` filter
3. Curate the results — remove spam, duplicates, misgenred tracks
4. Push to playlist via `spotify_playlist_replace` or `spotify_playlist_add`

### Artist/scene discovery
1. Identify 5-8 artists in the scene the user is referencing
2. Search `artist:X OR artist:Y OR artist:Z year:<range>` with popularity cap
3. Curate and push — this finds the deep album cuts from known artists

### "More like this" / "Something like what I've been listening to"
1. `spotify_now_playing` or `spotify_history` to get context
2. Extract artist/genre info
3. Search with those genres + era locked

### "I like this track, find me more"
1. Get the track info
2. Search for the artist's genres and era
3. Run era-specific search + `append: true`

### "Save this" / "Heart this"
1. `spotify_now_playing` to get track ID
2. `spotify_library_save` with the ID

### "What's in my playlist?"
1. `spotify_playlist_get` with the playlist ID
2. Default playlist: `44GZli0wDLwExa9ttsAAai`

### Building up a playlist across runs
Use `spotify_playlist_add` to append tracks without replacing what's already there.

### Album deep dive
1. `spotify_search` with `album:"X" artist:"Y"` to get all tracks
2. Show popularity for each track — the contrast between hits and deep cuts tells a story

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
- Soul Gems playlist ID is `4x46XW37rDrev78HsPFRCZ`
- Playback tools require an active Spotify device — if they fail, call `spotify_devices` first
- `tag:hipster` in search queries = Spotify's own "bottom 10% popularity" filter — use it heavily
- Keep summaries brief — a line or two about what you picked, not an essay
- The `spotify_search` tool supports `NOT` and `OR` operators for complex queries
- When curating results, actively filter out: slowed/sped up edits, "Bass Boosted" spam, compilation duplicates, library/stock music, misgenred tracks
- Always verify artist facts via web search before putting them on graphics or making claims
