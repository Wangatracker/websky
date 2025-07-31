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

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Handle WhatsApp pairing
app.post("/pair", async (req, res) => {
  const phone = req.body.phone;
  if (!phone || phone.length < 9) return res.status(400).send("Invalid phone number");

  try {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: P({ level: "fatal" }),
      browser: ["Safari", "macOS", "14.0.3"], // ✅ Real Safari macOS info
    });

    sock.ev.on("creds.update", saveCreds);

    if (!state.creds.registered) {
      console.log("📲 Requesting pairing code...");

      // Small delay before requesting to ensure WhatsApp sends push notification
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(phone);
          console.log("🔑 Pairing code:", code);
          res.json({
            success: true,
            code,
            message: "Code sent. Go to WhatsApp → Linked Devices → Enter the code.",
          });
        } catch (err) {
          console.error("❌ Failed to request code:", err);
          res.status(500).json({ success: false, error: "Failed to get pairing code." });
        }
      }, 1000);
    } else {
      res.json({ success: true, message: "Already linked." });
    }
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
