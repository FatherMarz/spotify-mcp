# Spotify MCP — Setup Guide

This guide walks you through setting up the Spotify MCP server for Claude Code. You'll get full Spotify control from Claude — playback, playlist generation, crate digging for obscure music, and more.

**What you need before starting:**
- A Spotify Premium account
- Claude Code installed
- Node.js installed (v20 or later)

---

## Step 1: Create a Spotify App

You need to register a free app with Spotify so it gives you API credentials.

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **Create App**
4. Fill in:
   - **App name:** anything you want (e.g., "Claude Spotify")
   - **App description:** anything (e.g., "MCP server for Claude Code")
   - **Redirect URI:** `http://127.0.0.1:8888/callback` — **this must be exact**
   - **Which APIs:** select **Web API**
5. Check the terms box and click **Save**
6. You'll land on your app's dashboard. Click **Settings** in the top right
7. You'll see your **Client ID** — copy it somewhere
8. Click **View client secret** — copy that too

You now have two values:
- `Client ID` (looks like: `a1b2c3d4e5f6...`)
- `Client Secret` (looks like: `x9y8z7w6v5u4...`)

---

## Step 2: Download and Install

Open your terminal and run these commands one at a time:

```bash
# Clone the project
git clone https://github.com/FatherMarz/spotify-mcp.git ~/spotify-mcp

# Go into the folder
cd ~/spotify-mcp

# Install dependencies
npm install
```

> **Note:** If you got this project as a zip file instead of from GitHub, unzip it to `~/spotify-mcp` and then run `cd ~/spotify-mcp && npm install`.

---

## Step 3: Add Your Credentials

Create the `.env` file with your Spotify app credentials:

```bash
cat > ~/spotify-mcp/.env << 'EOF'
SPOTIFY_CLIENT_ID=paste_your_client_id_here
SPOTIFY_CLIENT_SECRET=paste_your_client_secret_here
SPOTIFY_REFRESH_TOKEN=
SPOTIFY_PLAYLIST_ID=
TRACK_COUNT=30
EOF
```

Open `~/spotify-mcp/.env` in any text editor and replace `paste_your_client_id_here` and `paste_your_client_secret_here` with the values from Step 1.

---

## Step 4: Connect Your Spotify Account

This step opens your browser so you can grant the app permission to control your Spotify.

```bash
cd ~/spotify-mcp
npm run setup
```

Your browser will open to a Spotify login page. Log in and click **Agree**. You'll see a "Done!" message. You can close the browser tab.

Back in your terminal, you should see `Refresh token saved to .env`.

---

## Step 5: Get Your Playlist ID (Optional)

If you want Claude to write tracks to a specific playlist:

1. Open Spotify and go to the playlist you want to use
2. Click the `...` menu → **Share** → **Copy link to playlist**
3. The link looks like: `https://open.spotify.com/playlist/44GZli0wDLwExa9ttsAAai`
4. The part after `/playlist/` is your playlist ID: `44GZli0wDLwExa9ttsAAai`
5. Open `~/spotify-mcp/.env` and paste it:
   ```
   SPOTIFY_PLAYLIST_ID=44GZli0wDLwExa9ttsAAai
   ```

If you skip this step, Claude can still search, play music, and control playback — it just won't be able to generate playlists.

---

## Step 6: Create the Startup Script

This small script tells Claude Code how to start the MCP server:

```bash
cat > ~/spotify-mcp/mcp/start.sh << 'EOF'
#!/bin/bash
cd ~/spotify-mcp
exec node --env-file=.env mcp/index.js
EOF

chmod +x ~/spotify-mcp/mcp/start.sh
```

---

## Step 7: Register with Claude Code

Tell Claude Code about the Spotify MCP server. Run this in your terminal:

```bash
claude mcp add spotify -- bash ~/spotify-mcp/mcp/start.sh
```

That's it. Restart Claude Code and the Spotify tools will be available.

---

## Step 8: Verify It Works

Start a new Claude Code session and type:

```
what's playing on my spotify?
```

If Spotify is playing something, Claude will tell you the track name, artist, and album. If nothing is playing, open Spotify, play a song, and ask again.

---

## Step 9: Install the Skill (Optional)

The skill teaches Claude how to translate moods into music — so you can say "I need something chill" and it knows what genres to pick.

```bash
mkdir -p ~/.claude/skills/spotify-playlist-generator
cp ~/spotify-mcp/skill.md ~/.claude/skills/spotify-playlist-generator/skill.md
```

---

## What You Can Do

Once everything is set up, try these in Claude Code:

| Say this | What happens |
|----------|-------------|
| "What's playing?" | Shows the current track |
| "Skip this" | Skips to the next track |
| "Turn it down" | Lowers the volume |
| "Queue up some jazz" | Finds jazz tracks and adds them to your queue |
| "I want something melancholy" | Generates a playlist of atmospheric, moody music |
| "Find me really obscure soul from the 60s" | Crate digs for buried tracks |
| "Save this track" | Hearts/saves the current track to your library |
| "What have I been listening to lately?" | Shows your recent listening history |
| "Surprise me" | Picks weird, interesting genres you've never heard |

---

## Step 10: Daily Playlist Generation (Optional)

You can set up a cron job that automatically refreshes your playlist every day with fresh deep cuts. This works on macOS, Linux, and WSL.

### Find Your Node Path

First, figure out where Node.js is installed on your system:

```bash
which node
```

This will print something like `/usr/local/bin/node` or `/home/username/.nvm/versions/node/v22.15.1/bin/node`. Copy the full path — you'll need it below.

### Set Up the Cron Job

Open your crontab for editing:

```bash
crontab -e
```

Add one or both of these lines. Replace `/usr/local/bin/node` with your actual node path from above.

**Refresh your playlist every morning at 7am:**

```cron
0 7 * * * cd ~/spotify-mcp && /usr/local/bin/node --env-file=.env cli/generate.js >> /tmp/deep-cuts.log 2>&1
```

**Commit and push playlist history to GitHub every night at 11pm (optional):**

```cron
0 23 * * * cd ~/spotify-mcp && git add cli/history/ && git diff --cached --quiet || git commit -m "deep cuts $(date +\%Y-\%m-\%d)" && git push origin main 2>/dev/null
```

Save and exit the editor (in nano: `Ctrl+O`, `Enter`, `Ctrl+X`).

### Customize Your Daily Playlist

The default cron generates a random 30-track playlist with popularity 0-40. You can customize this by editing the cron command.

**Change the number of tracks:**

```cron
# 50 tracks instead of 30
0 7 * * * cd ~/spotify-mcp && TRACK_COUNT=50 /usr/local/bin/node --env-file=.env cli/generate.js >> /tmp/deep-cuts.log 2>&1
```

**Use the CLI with specific genres or settings:**

```cron
# Jazz and soul deep cuts, popularity 0-30, 25 tracks
0 7 * * * cd ~/spotify-mcp && /usr/local/bin/node --env-file=.env cli/spotify -g "jazz,soul,funk" -p 0-30 -n 25 >> /tmp/deep-cuts.log 2>&1

# Ultra-obscure only (popularity 0-10)
0 7 * * * cd ~/spotify-mcp && /usr/local/bin/node --env-file=.env cli/spotify --random -p 0-10 >> /tmp/deep-cuts.log 2>&1

# Hidden gems (popularity 20-60) — less obscure, more listenable
0 7 * * * cd ~/spotify-mcp && /usr/local/bin/node --env-file=.env cli/spotify --random -p 20-60 >> /tmp/deep-cuts.log 2>&1
```

**Run at a different time:**

The `0 7 * * *` part means "7:00 AM every day." Change the numbers to adjust:

| Schedule | Cron syntax |
|----------|------------|
| 7:00 AM daily | `0 7 * * *` |
| 6:30 AM daily | `30 6 * * *` |
| Noon on weekdays | `0 12 * * 1-5` |
| 8 AM on weekends | `0 8 * * 0,6` |
| Every 6 hours | `0 */6 * * *` |

### WSL Notes

On WSL, cron doesn't start automatically. You need to enable it once:

```bash
# Start the cron service
sudo service cron start

# Make it start automatically when WSL opens (add to your ~/.bashrc)
echo '[ -z "$(ps -ef | grep cron | grep -v grep)" ] && sudo service cron start > /dev/null 2>&1' >> ~/.bashrc
```

You may also need to set up passwordless sudo for cron:

```bash
sudo visudo
# Add this line at the bottom (replace YOUR_USERNAME with your WSL username):
# YOUR_USERNAME ALL=(ALL) NOPASSWD: /usr/sbin/service cron start
```

### Verify Your Cron Job

Check that it's saved:

```bash
crontab -l
```

Check the log after it runs:

```bash
cat /tmp/deep-cuts.log
```

---

## Troubleshooting

**"Nothing is currently playing"**
→ Open the Spotify app on your phone, computer, or browser and start playing something. Claude controls Spotify but can't launch it.

**"No active device" error**
→ Same thing — Spotify needs to be open and playing (or recently paused) on at least one device.

**MCP server not showing up in `/mcp`**
→ Make sure you ran the `claude mcp add` command from Step 7, then restart Claude Code.

**"Auth failed" error**
→ Your refresh token may have expired. Re-run `npm run setup` from the `~/spotify-mcp` folder.

**Can't install dependencies (npm install blocked)**
→ If you have a supply chain lock active, you'll need to temporarily remove it: `rm ~/.claude/supply-chain-lock`, run `npm install`, then re-enable it.
