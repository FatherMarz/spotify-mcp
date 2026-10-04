# Spotify MCP

An MCP server, CLI and Claude Code skill for controlling Spotify: playback, search, playlists, library, and a "crate dig" tool that builds playlists of low-popularity tracks.

Requires a Spotify Premium account, Node.js 20.12 or later, and Claude Code.

## Install

1. Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard). Use the Web API and set the redirect URI to exactly `http://127.0.0.1:8888/callback`. Copy the client ID and client secret.

2. Clone and install:

   ```bash
   git clone https://github.com/FatherMarz/spotify-mcp.git
   cd spotify-mcp
   npm install
   cp .env.example .env
   ```

3. Put the client ID and secret in `.env`.

4. Authorize your account. This opens a browser and saves the refresh token to `.env`. The script uses macOS `open`; on other systems, open the authorize URL by hand.

   ```bash
   npm run setup
   ```

5. Optional: set `SPOTIFY_PLAYLIST_ID` in `.env` to the playlist that playlist generation writes to. It is the part of the playlist link after `/playlist/`.

6. Register the server with Claude Code:

   ```bash
   claude mcp add spotify -- bash "$PWD/mcp/start.sh"
   ```

7. Optional: install the skill, which maps moods to genres.

   ```bash
   mkdir -p ~/.claude/skills/spotify-playlist-generator
   cp skill.md ~/.claude/skills/spotify-playlist-generator/skill.md
   ```

Restart Claude Code and ask "what's playing on my Spotify?". Spotify must be open on a device.

## CLI

```bash
cli/spotify --random              # random genres
cli/spotify -g jazz,soul -n 25    # genres (fuzzy matched), track count
cli/spotify -p 0-10               # popularity range, default 0-40
cli/spotify -a                    # append instead of replace
cli/spotify --dry-run             # preview only
cli/spotify ls metal              # search the genre list
```

Each run writes a Markdown history file to `cli/history/`.

## Scheduled playlist

To refresh the playlist daily at 7am, add this to `crontab -e`, using the output of `which node` for the node path:

```cron
0 7 * * * cd ~/spotify-mcp && /usr/local/bin/node --env-file=.env cli/generate.js >> /tmp/deep-cuts.log 2>&1
```

`TRACK_COUNT` in `.env` sets the track count.

## Troubleshooting

- "Nothing is currently playing" or "No active device": start playback in any Spotify app. The server cannot launch Spotify.
- "Auth failed": run `npm run setup` again to get a new refresh token.
- Server missing in `/mcp`: re-run the `claude mcp add` command and restart Claude Code.

Built by Marcello Delcaro, AI-assisted.
