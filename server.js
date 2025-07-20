
const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Firebase setup using env variable
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.use(bodyParser.json());
app.use(express.static('public'));

// Save a contact
app.post('/api/contact', async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    if (!name || !phone || !email) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    await db.collection('contacts').add({ name, phone, email, createdAt: Date.now() });
    res.status(200).json({ message: 'Contact saved' });
  } catch (err) {
    console.error('Error saving contact:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Download VCF
app.get('/contacts.vcf', async (req, res) => {
  try {
    const snapshot = await db.collection('contacts').get();
    let vcfContent = '';

    snapshot.forEach(doc => {
      const c = doc.data();
      vcfContent += `BEGIN:VCARD
VERSION:3.0
FN:${c.name}
TEL;TYPE=CELL:${c.phone}
EMAIL:${c.email}
END:VCARD
`;
    });

    res.setHeader('Content-Disposition', 'attachment; filename="contacts.vcf"');
    res.setHeader('Content-Type', 'text/vcard');
    res.send(vcfContent);
  } catch (err) {
    console.error('Error generating VCF:', err);
    res.status(500).send('Server Error');
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
