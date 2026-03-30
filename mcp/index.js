#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerPlaybackTools } from './tools/playback.js';
import { registerSearchTools } from './tools/search.js';
import { registerDiscoveryTools } from './tools/discovery.js';
import { registerPlaylistTools } from './tools/playlist.js';
import { registerLibraryTools } from './tools/library.js';
import { registerCrateDigTools } from './tools/crate-dig.js';

const server = new McpServer({
  name: 'spotify',
  version: '1.0.0',
});

registerPlaybackTools(server);
registerSearchTools(server);
registerDiscoveryTools(server);
registerPlaylistTools(server);
registerLibraryTools(server);
registerCrateDigTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
