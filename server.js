const express = require('express');
const admin = require('firebase-admin');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

admin.initializeApp({
  credential: admin.credential.applicationDefault(), // Render uses env
});
const db = admin.firestore();

app.post('/api/contact', async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Missing fields' });

  try {
    await db.collection('contacts').add({ name, phone });
    res.status(200).json({ message: 'Contact saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save contact' });
  }
});

app.get('/api/contacts/count', async (req, res) => {
  try {
    const snapshot = await db.collection('contacts').get();
    res.json({ count: snapshot.size });
  } catch (err) {
    res.status(500).json({ error: 'Failed to count contacts' });
  }
});

app.get('/contacts.vcf', async (req, res) => {
  try {
    const snapshot = await db.collection('contacts').get();
    let vcf = '';
    snapshot.forEach(doc => {
      const { name, phone } = doc.data();
      vcf += `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL:${phone}\nEND:VCARD\n`;
    });
    res.setHeader('Content-Type', 'text/vcard');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.vcf');
    res.send(vcf);
  } catch (err) {
    res.status(500).send('Failed to generate VCF');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
