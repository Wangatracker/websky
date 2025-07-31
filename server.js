const express = require('express');
const path = require('path');
const P = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let sockGlobal = null; // Keep a reference

app.post('/pair', async (req, res) => {
  const phone = req.body.phone?.trim();
  if (!phone) return res.status(400).send('Phone number is required');

  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
    });

    sockGlobal = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'open') {
        console.log('✅ Connected successfully');
      } else if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        console.log('❌ Disconnected. Reason:', reason);
      }
    });

    if (!state.creds.registered) {
      await sock.requestPairingCode(phone);
      const pairingCode = sock.authState.creds?.pairingCode;
      console.log(`🔑 Pairing Code: ${pairingCode}`);
      res.json({
        code: pairingCode,
        message: 'Now open WhatsApp > Linked Devices > Enter this code',
      });
    } else {
      res.status(400).json({ message: 'Device already registered.' });
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ message: 'Failed to generate pairing code', error: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
