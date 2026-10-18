import { spawn } from 'child_process';
import fetch from 'node-fetch';
import fs from 'fs';

let currentTunnelUrl = '';
let sshProcess = null;

function startTunnel() {
  console.log('[TunnelRunner] Starting persistent localhost.run tunnel with keep-alive...');

  sshProcess = spawn('ssh', [
    '-o', 'ServerAliveInterval=10',
    '-o', 'ServerAliveCountMax=3',
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ExitOnForwardFailure=yes',
    '-R', '80:127.0.0.1:3000',
    'nokey@localhost.run',
  ]);

  sshProcess.stdout.on('data', (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/([a-zA-Z0-9]+)\.lhr\.life/);
    if (match) {
      const newUrl = match[0];
      if (newUrl !== currentTunnelUrl) {
        currentTunnelUrl = newUrl;
        console.log(`\n=======================================================`);
        console.log(`[TunnelRunner] ACTIVE TUNNEL ONLINE: ${currentTunnelUrl}`);
        console.log(`=======================================================\n`);

        // Notify backend of the new active tunnel URL
        try {
          fs.writeFileSync('scripts/active_tunnel.txt', currentTunnelUrl, 'utf8');
        } catch (_) {}

        fetch('http://localhost:5000/api/drone/set-tunnel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tunnelUrl: currentTunnelUrl }),
        })
          .then((r) => r.json())
          .then((d) => console.log('[TunnelRunner] Backend updated:', d))
          .catch((err) => console.warn('[TunnelRunner] Failed to update backend:', err.message));
      }
    }
  });

  sshProcess.stderr.on('data', (data) => {
    // OpenSSH outputs some diagnostic info on stderr
    const text = data.toString();
    if (text.includes('tunneled with tls') || text.includes('.lhr.life')) {
      const match = text.match(/https:\/\/([a-zA-Z0-9]+)\.lhr\.life/);
      if (match && match[0] !== currentTunnelUrl) {
        currentTunnelUrl = match[0];
        fetch('http://localhost:5000/api/drone/set-tunnel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tunnelUrl: currentTunnelUrl }),
        }).catch(() => {});
      }
    }
  });

  sshProcess.on('close', (code) => {
    console.warn(`[TunnelRunner] SSH tunnel closed with code ${code}. Reconnecting in 2s...`);
    setTimeout(startTunnel, 2000);
  });

  sshProcess.on('error', (err) => {
    console.error('[TunnelRunner] SSH process error:', err);
  });
}

// Keep-alive ping every 15 seconds to keep tunnel warm and prevent NAT timeout
setInterval(() => {
  if (currentTunnelUrl) {
    fetch(`${currentTunnelUrl}/api/drone/network-info`, { timeout: 8000 })
      .then((r) => {
        if (r.status !== 200) {
          console.warn(`[TunnelRunner] Health check returned ${r.status}`);
        }
      })
      .catch((err) => {
        console.warn('[TunnelRunner] Health check ping warning:', err.message);
      });
  }
}, 15000);

startTunnel();
