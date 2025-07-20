const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json'); // <-- You must upload this file!

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve your frontend files

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Save a contact
app.post('/api/contact', async (req, res) => {
  const { fullName, phone, email } = req.body;

  if (!fullName || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  try {
    await db.collection('contacts').add({ fullName, phone, email: email || '' });
    res.status(200).json({ message: 'Contact saved' });
  } catch (err) {
    console.error('Error saving contact:', err);
    res.status(500).json({ error: 'Failed to save contact' });
  }
});

// Get contact stats
app.get('/api/contacts/count', async (req, res) => {
  try {
    const snapshot = await db.collection('contacts').get();
    const total = snapshot.size;
    const targeted = total > 100 ? 100 : total;

    res.json({ total, targeted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch counts' });
  }
});

// Get all contacts
app.get('/api/contacts', async (req, res) => {
  try {
    const snapshot = await db.collection('contacts').get();
    const contacts = snapshot.docs.map(doc => doc.data());

    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
