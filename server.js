const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const P = require('pino');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// Endpoint to generate pairing code
app.post('/generate', async (req, res) => {
  const phoneNumber = req.body.phone?.trim();

  if (!phoneNumber || !/^\d+$/.test(phoneNumber)) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: P({ level: "fatal" }),
    });

    if (!state.creds.registered) {
      await sock.requestPairingCode(phoneNumber);
      console.log(`📲 Pairing code requested for ${phoneNumber}`);
      res.json({ success: true, message: 'Check your WhatsApp for the linking code.' });
    } else {
      res.json({ success: false, message: 'This number is already registered.' });
    }
  } catch (err) {
    console.error('❌ Error generating code:', err);
    res.status(500).json({ error: 'Failed to generate code.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
