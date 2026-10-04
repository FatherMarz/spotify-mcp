import { spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const child = spawn('node', ['--env-file=.env', 'mcp/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: dirname(fileURLToPath(import.meta.url)),
});

let stdout = '';
let stderr = '';

child.stdout.on('data', d => { stdout += d.toString(); });
child.stderr.on('data', d => { stderr += d.toString(); });

const initMsg = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0' },
  },
}) + '\n';

child.stdin.write(initMsg);

setTimeout(() => {
  child.kill();
  console.log('=== STDOUT ===');
  console.log(stdout || '(empty)');
  console.log('=== STDERR ===');
  console.log(stderr || '(empty)');
}, 3000);
