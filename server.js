const express = require("express");
const path = require("path");
const P = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.post("/pair", async (req, res) => {
  const phone = req.body.phone?.trim();
  if (!phone) return res.status(400).send("Phone number is required");

  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "fatal" }),
    browser: ["Ubuntu", "Chrome", "20.0.04"], // Simulate real browser
  });

  sock.ev.on("creds.update", saveCreds);

  if (!state.creds.registered) {
    console.log("🔔 Waiting 1 second for WhatsApp to trigger notification...");

    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phone);
        console.log("✅ Code generated:", code);
        res.json({
          code,
          message: "Use this code on your WhatsApp to link",
        });
      } catch (err) {
        console.error("❌ Failed to get code:", err);
        res.status(500).send("Error requesting pairing code.");
      }
    }, 1000); // 1-second delay
  } else {
    res.status(400).send("Device already paired.");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
