const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Parse Firebase credentials from environment
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const contactsCollection = db.collection("contacts");

app.use(bodyParser.json());
app.use(express.static("public"));

// Route: Save contact
app.post("/api/contact", async (req, res) => {
  try {
    const { fullName, phone, email } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ error: "Name and phone are required." });
    }

    const newContact = {
      fullName,
      phone,
      email: email || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await contactsCollection.add(newContact);
    res.status(200).json({ message: "Contact saved" });
  } catch (error) {
    console.error("Error saving contact:", error);
    res.status(500).json({ error: "Failed to save contact" });
  }
});

// Route: Get contact stats
app.get("/api/contacts/count", async (req, res) => {
  try {
    const snapshot = await contactsCollection.get();
    const total = snapshot.size;
    const targeted = Math.min(total, 100);

    res.json({ total, targeted });
  } catch (error) {
    console.error("Error counting contacts:", error);
    res.status(500).json({ error: "Failed to get contact stats" });
  }
});

// Route: Download VCF
app.get("/contacts.vcf", async (req, res) => {
  try {
    const snapshot = await contactsCollection.orderBy("createdAt", "desc").get();

    let vcfData = "";

    snapshot.forEach(doc => {
      const { fullName, phone, email } = doc.data();

      vcfData += `BEGIN:VCARD\nVERSION:3.0\nFN:${fullName}\nTEL:${phone}\n`;
      if (email) {
        vcfData += `EMAIL:${email}\n`;
      }
      vcfData += `END:VCARD\n`;
    });

    res.setHeader("Content-Type", "text/vcard");
    res.setHeader("Content-Disposition", "attachment; filename=contacts.vcf");
    res.send(vcfData);
  } catch (error) {
    console.error("Error generating VCF:", error);
    res.status(500).send("Failed to generate VCF");
  }
});

// Fallback to index.html if needed
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "dashboard.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
