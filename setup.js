import { createServer } from 'http';
import { URL } from 'url';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://127.0.0.1:8888/callback';

const SCOPES = [
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-top-read',
  'user-library-read',
  'user-library-modify',
].join(' ');

const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
  response_type: 'code',
  client_id: CLIENT_ID,
  scope: SCOPES,
  redirect_uri: REDIRECT_URI,
})}`;

console.log('\nOpening Spotify login in your browser...\n');
execSync(`open "${authUrl}"`);

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:8888`);
  if (url.pathname !== '/callback') return;

  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400);
    res.end('No code received');
    return;
  }

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await tokenRes.json();

  if (data.error) {
    res.writeHead(400);
    res.end(`Error: ${data.error_description}`);
    console.error('Error:', data);
    process.exit(1);
  }

  const envPath = join(__dirname, '.env');
  let envContent = readFileSync(envPath, 'utf8');
  envContent = envContent.replace(
    /SPOTIFY_REFRESH_TOKEN=.*/,
    `SPOTIFY_REFRESH_TOKEN=${data.refresh_token}`
  );
  writeFileSync(envPath, envContent);

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Done! You can close this tab.</h1><p>Refresh token saved to .env</p>');

  console.log('Refresh token saved to .env');
  console.log('\nYou can now use the CLI or MCP server.');
  server.close();
  process.exit(0);
});

server.listen(8888, () => {
  console.log('Waiting for Spotify callback on http://127.0.0.1:8888/callback ...');
});
