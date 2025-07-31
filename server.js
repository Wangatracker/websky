const express = require('express');
const path = require('path');
const P = require('pino');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// WhatsApp pairing route
app.post('/pair', async (req, res) => {
  const phone = req.body.phone?.trim();
  if (!phone) return res.status(400).send('Phone number is required');

  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: P({ level: 'fatal' }),
    });

    if (!state.creds.registered) {
      await sock.requestPairingCode(phone);
      const pairingCode = sock.authState.creds?.pairingCode;
      
      console.log(`✅ Pairing code for ${phone}: ${pairingCode}`);

      res.json({
        code: pairingCode,
        message: 'Pairing code generated. Go to WhatsApp → Linked Devices → Enter the code.',
      });
    } else {
      res.status(400).json({ message: 'This number is already registered.' });
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ message: 'Failed to generate pairing code', error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
