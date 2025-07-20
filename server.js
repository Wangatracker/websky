// server.js
const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // Serve dashboard.html, index.html, etc.

const contactsCollection = db.collection("contacts");

// Save a new contact
app.post("/api/contact", async (req, res) => {
  try {
    const { fullName, phone, email } = req.body;
    if (!fullName || !phone) return res.status(400).json({ error: "Missing fields" });

    await contactsCollection.add({
      fullName,
      phone,
      email: email || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Error saving contact:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get total and targeted contacts
app.get("/api/contacts/count", async (req, res) => {
  try {
    const snapshot = await contactsCollection.get();
    const total = snapshot.size;
    const targeted = Math.min(total, 100);
    res.json({ total, targeted });
  } catch (err) {
    console.error("Error counting contacts:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all contacts for VCF download
app.get("/api/contacts", async (req, res) => {
  try {
    const snapshot = await contactsCollection.get();
    const contacts = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      contacts.push({
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
      });
    });
    res.json(contacts);
  } catch (err) {
    console.error("Error retrieving contacts:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Serve dashboard.html directly if needed
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
