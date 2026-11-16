const fs = require('fs');
const localtunnel = require('localtunnel');

async function startTunnel() {
  try {
    const tunnel = await localtunnel({ port: 3000 });
    console.log(`TUNNEL_READY: ${tunnel.url}`);
    fs.writeFileSync('scripts/tunnel_url.txt', tunnel.url, 'utf8');

    tunnel.on('close', () => {
      console.log('Tunnel closed. Reconnecting in 3s...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
    });
  } catch (err) {
    console.error('Failed to create tunnel:', err);
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();
