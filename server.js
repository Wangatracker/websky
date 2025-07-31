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
app.use(express.urlencoded({ extended: true }));

let sockGlobal;

app.post("/pair", async (req, res) => {
  const phone = req.body.phone?.trim();
  if (!phone) return res.status(400).send("Phone number is required");

  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "silent" }),
    browser: ["Ubuntu", "Chrome", "20.0.04"], // ✅ Looks like a real Chrome browser
  });

  sockGlobal = sock;
  sock.ev.on("creds.update", saveCreds);

  let connected = false;

  sock.ev.on("connection.update", (update) => {
    const { connection } = update;
    if (connection === "open") {
      console.log("✅ Connected! Pairing successful.");
      connected = true;
    } else if (connection === "close") {
      if (!connected) {
        console.log("❌ Pairing failed or expired. Try again.");
      }
    }
  });

  if (!state.creds.registered) {
    try {
      console.log("📲 Requesting pairing code...");
      await sock.requestPairingCode(phone);
      const code = sock.authState.creds?.pairingCode;
      console.log(`🔔 Waiting for phone to show prompt...`);
      console.log(`🔑 Pairing code: ${code}`);
      res.json({
        status: "waiting",
        code: code,
        message: "Use this code to link from your WhatsApp phone",
      });
    } catch (err) {
      console.error("❌ Error during pairing:", err);
      res.status(500).send("Failed to request pairing code");
    }
  } else {
    res.status(400).send("Device already paired.");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
