const express = require("express");
const cors = require("cors");
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const P = require("pino");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.post("/pair", async (req, res) => {
  const phone = req.body.phone?.trim();
  if (!phone || phone.length < 9) return res.status(400).json({ error: "Invalid phone number" });

  try {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: P({ level: "fatal" }),
      browser: ["Safari", "macOS", "14.0.3"], // ✅ Real browser
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
      if (connection === "open") {
        console.log("✅ Connected to WhatsApp. Sending pairing code...");

        setTimeout(async () => {
          try {
            const code = await sock.requestPairingCode(phone);
            console.log("📥 Code sent:", code);
            res.json({ success: true, code, message: "Enter this in WhatsApp → Linked Devices" });
          } catch (err) {
            console.error("❌ Failed to send code:", err);
            res.status(500).json({ success: false, error: "Pairing code failed." });
          }
        }, 2000); // ⏳ Delay to allow notification to arrive
      }

      if (connection === "close") {
        console.log("❌ Connection closed:", lastDisconnect?.error?.message);
      }
    });
  } catch (err) {
    console.error("❌ Server Error:", err);
    res.status(500).json({ success: false, error: "Internal error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
