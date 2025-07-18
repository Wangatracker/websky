const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Persistent files
const contactsFile = path.join(__dirname, 'contacts.json');
const vcfFolder = path.join(__dirname, 'public/vcf');

// Ensure directories and file exist
if (!fs.existsSync(vcfFolder)) fs.mkdirSync(vcfFolder);
if (!fs.existsSync(contactsFile)) fs.writeFileSync(contactsFile, JSON.stringify([]));

// Helper: Save contact persistently
function saveContact(contact) {
  try {
    const data = JSON.parse(fs.readFileSync(contactsFile, 'utf-8'));
    data.push(contact);
    fs.writeFileSync(contactsFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to save contact:", err);
  }
}

// Helper: Generate VCF format
function generateVCF(name, phone) {
  return `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;TYPE=CELL:${phone}
END:VCARD`;
}

// POST: Save contact and generate VCF
app.post('/api/save', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and phone are required' });
  }

  const filename = `${Date.now()}-${name.replace(/\s+/g, '_')}.vcf`;
  const filepath = `/vcf/${filename}`;
  const fullVCFPath = path.join(vcfFolder, filename);

  const vcfData = generateVCF(name, phone);
  try {
    fs.writeFileSync(fullVCFPath, vcfData);
    const contact = { name, phone, vcf: filepath };
    saveContact(contact);
    return res.json({ success: true, message: 'Contact saved', vcf: filepath });
  } catch (error) {
    console.error("Error saving VCF or contact:", error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET: Retrieve all saved contacts
app.get('/api/contacts', (req, res) => {
  try {
    const contacts = JSON.parse(fs.readFileSync(contactsFile, 'utf-8'));
    res.json({ success: true, contacts });
  } catch (error) {
    console.error("Error reading contacts:", error);
    res.status(500).json({ success: false, message: 'Failed to read contacts' });
  }
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Serve contacts.html
app.get('/contacts', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/contacts.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
