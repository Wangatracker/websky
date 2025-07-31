// server.js
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
  const phone = req.body.phone?.replace(/\D/g, "");
  if (!phone) {
    return res.status(400).json({ message: "Phone number required" });
  }

  // ensure session dir
  const sessionDir = path.join(__dirname, "sessions", phone);
  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    // 1) load/store creds
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    // 2) create socket
    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: "fatal" }),
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "22.04"]
    });

    sock.ev.on("creds.update", saveCreds);

    // 3) WAIT for connection to open before pairing
    sock.ev.once("connection.update", async (update) => {
      if (update.connection !== "open") {
        console.error("Connection failed:", update);
        return res.status(500).json({ message: "Failed to connect to WhatsApp" });
      }

      try {
        // ⚡️ Trigger mobile push notification
        await sock.requestPairingCode(phone);
      } catch (pushErr) {
        console.warn("Push notification may have failed:", pushErr);
      }

      try {
        // 🔑 Fetch multi-device pairing code
        const code = await sock.requestPairingCode(`${phone}@s.whatsapp.net`);
        return res.json({ code });
      } catch (codeErr) {
        console.error("Error fetching multi-device code:", codeErr);
        return res.status(500).json({ message: "Failed to retrieve code" });
      }
    });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
