// Fault-inject a client EPIPE into the real installed proxy in a child process.
// The controller must remain alive and deny unapproved destinations afterward.
import http from 'node:http';
import net from 'node:net';
import { fork } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

if (process.platform !== 'linux') { console.log('SKIP: Linux proxy containment regression requires Linux'); process.exit(0); }

if (process.argv.includes('--child')) {
  const workspace = process.argv[3];
  let proxy;
  const original = http.createServer;
  http.createServer = function (...args) {
    proxy = original.apply(this, args);
    return proxy;
  };
  const { buildLocalProcessSandboxSpawnTarget } = await import('../../packages/adapter-utils/src/local-process-sandbox.ts');
  const target = await buildLocalProcessSandboxSpawnTarget({
    executable: '/usr/bin/true', args: [], cwd: workspace,
    options: { workspaceDir: workspace, filesystemScope: 'workspace',
      networkScope: 'allowlist', networkAllowlist: ['example.invalid'] },
  });
  const socketPath = proxy.address();
  process.send({ proxyDirectory: socketPath.slice(0, socketPath.lastIndexOf('/')) });
  try {
    const connected = new Promise(resolve => proxy.once('connect', (_req, socket) => resolve(socket)));
    const client = net.connect(socketPath);
    client.on('error', () => {});
    // Use a denied CONNECT so this test makes no upstream connection.
    await new Promise(resolve => client.once('connect', resolve));
    client.write('CONNECT denied.invalid:443 HTTP/1.1\r\nHost: denied.invalid:443\r\n\r\n');
    const acceptedSocket = await connected;
    const closed = new Promise(resolve => acceptedSocket.once('close', resolve));
    acceptedSocket.destroy(Object.assign(new Error('synthetic client write EPIPE'), { code: 'EPIPE' }));
    await closed;
    client.destroy();
    const status = await new Promise((resolve, reject) => {
      const req = http.get({ socketPath, path: 'http://denied.invalid/test' }, res => {
        res.resume(); res.once('end', () => resolve(res.statusCode));
      });
      req.on('error', reject);
    });
    assert.equal(status, 403, 'policy must still deny after client disconnect error');
    console.log('PASS: proxy survives client EPIPE and continues enforcing destination denial');
  } finally {
    await target.cleanup();
    process.disconnect();
  }
} else {
  const workspace = await mkdtemp('/tmp/paperclip-proxy-regression-');
  let proxyDirectory;
  try {
    const code = await new Promise((resolve, reject) => {
      const child = fork(fileURLToPath(import.meta.url), ['--child', workspace], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
      child.on('message', message => { proxyDirectory = message.proxyDirectory; });
      child.on('error', reject);
      const timeout = setTimeout(() => child.kill('SIGKILL'), 10000);
      child.on('exit', code => { clearTimeout(timeout); resolve(code); });
    });
    assert.equal(code, 0, 'a sandbox client error must not crash the controller');
  } finally {
    await rm(workspace, { recursive: true, force: true });
    if (proxyDirectory?.startsWith('/tmp/paperclip-network-sandbox-'))
      await rm(proxyDirectory, { recursive: true, force: true });
  }
}
