const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ===== Firebase Admin Init with ENV var =====
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (err) {
  console.error("Failed to initialize Firebase Admin SDK:", err);
  process.exit(1);
}

const db = admin.firestore();

// ===== Server Uptime Info =====
const serverStart = Date.now();
function getUptime() {
  const seconds = Math.floor((Date.now() - serverStart) / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

// ====== Location Info (static) ======
const locationInfo = {
  country: "Kenya",
  county: "Uasin Gishu",
  town: "Eldoret",
  area: "Kesses"
};

// ====== Routes ======

// Test root
app.get("/", (req, res) => {
  res.json({
    message: "✅ DIGITAL CONTACT VCF Server is Running!",
    uptime: getUptime(),
    location: locationInfo,
    version: "v1.0.0"
  });
});

// Add contact
app.post("/api/contact", async (req, res) => {
  const { fullName, phone, email } = req.body;

  if (!fullName || !phone) {
    return res.status(400).json({ error: "Full name and phone are required." });
  }

  try {
    await db.collection("contacts").add({
      fullName,
      phone,
      email: email || "",
      userId: "public",
      targeted: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ message: "Contact saved successfully." });
  } catch (err) {
    console.error("Failed to save contact:", err);
    res.status(500).json({ error: "Failed to save contact." });
  }
});

// Get contact count
app.get("/api/contacts/count", async (req, res) => {
  try {
    const snapshot = await db.collection("contacts").get();
    const total = snapshot.size;

    let targeted = 0;
    snapshot.forEach(doc => {
      if (doc.data().targeted === true) targeted++;
    });

    res.json({ total, targeted });
  } catch (error) {
    console.error("Failed to count contacts:", error);
    res.status(500).json({ error: "Failed to count contacts" });
  }
});

// Download VCF file
app.get("/contacts.vcf", async (req, res) => {
  try {
    const snapshot = await db.collection("contacts").get();
    let vcfContent = "";

    snapshot.forEach(doc => {
      const { fullName, phone, email } = doc.data();
      vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:${fullName}\nTEL:${phone}\n`;
      if (email) vcfContent += `EMAIL:${email}\n`;
      vcfContent += "END:VCARD\n";
    });

    res.setHeader("Content-Type", "text/vcard");
    res.setHeader("Content-Disposition", "attachment; filename=contacts.vcf");
    res.send(vcfContent);
  } catch (err) {
    console.error("VCF download failed:", err);
    res.status(500).send("Failed to generate VCF file.");
  }
});

// ====== Start Server ======
app.listen(PORT, () => {
  console.log(`✅ DIGITAL CONTACT VCF running at http://localhost:${PORT}`);
});
