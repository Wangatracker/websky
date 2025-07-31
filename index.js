const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const P = require('pino');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

let sock;

// Initialize WhatsApp socket
async function initSocket() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();
  sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    auth: state
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      console.log('Connection closed. Reconnecting...');
      initSocket(); // Retry
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp');
    }
  });
}
initSocket();

// API route to receive number and send pairing code
app.post('/pair', async (req, res) => {
  try {
    const number = req.body.number?.trim();
    if (!number) return res.status(400).json({ error: 'No number provided' });

    const code = await sock.requestPairingCode(number);
    console.log('Pairing code:', code);
    res.json({ message: `🔑 Pairing Code: ${code}. Enter it in WhatsApp → Linked Devices.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate pairing code' });
  }
});

app.listen(PORT, () => console.log(`🌐 Server running on http://localhost:${PORT}`));
