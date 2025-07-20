const express = require('express');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// Init Firebase
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
});
const db = admin.firestore();

// POST /api/contact – Save contact
app.post('/api/contact', async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Missing name or phone' });

    await db.collection('contacts').add({ name, phone, createdAt: new Date() });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/contacts – Return all contacts
app.get('/api/contacts', async (req, res) => {
  try {
    const snapshot = await db.collection('contacts').orderBy('createdAt', 'desc').get();
    const contacts = snapshot.docs.map(doc => doc.data());
    res.status(200).json({ contacts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load contacts' });
  }
});

// GET /contacts.vcf – Export VCF file
app.get('/contacts.vcf', async (req, res) => {
  try {
    const snapshot = await db.collection('contacts').get();
    const contacts = snapshot.docs.map(doc => doc.data());

    const vcfData = contacts.map(c => (
      `BEGIN:VCARD\nVERSION:3.0\nFN:${c.name}\nTEL:${c.phone}\nEND:VCARD`
    )).join('\n');

    res.setHeader('Content-Disposition', 'attachment; filename="contacts.vcf"');
    res.setHeader('Content-Type', 'text/vcard');
    res.send(vcfData);
  } catch (err) {
    res.status(500).send('Failed to generate VCF');
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
