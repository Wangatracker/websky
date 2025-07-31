const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/link", async (req, res) => {
  const phone = req.body.phone?.trim();
  if (!phone) return res.status(400).json({ message: "Phone number required" });

  const sessionDir = path.join(__dirname, "sessions", phone);
  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "22.04"]
    });

    sock.ev.on("creds.update", saveCreds);

    // Try generating the pairing code
    const getCode = async () => {
      try {
        return await sock.requestPairingCode(`${phone}@s.whatsapp.net`);
      } catch (e) {
        await new Promise((r) => setTimeout(r, 2000));
        return sock.requestPairingCode(`${phone}@s.whatsapp.net`);
      }
    };

    const code = await getCode();
    res.json({ code });
  } catch (err) {
    console.error("Error generating code:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
