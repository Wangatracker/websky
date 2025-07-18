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

// Ensure folders exist
const contactsFile = path.join(__dirname, 'contacts.json');
const vcfFolder = path.join(__dirname, 'public/vcf');
if (!fs.existsSync(vcfFolder)) fs.mkdirSync(vcfFolder);
if (!fs.existsSync(contactsFile)) fs.writeFileSync(contactsFile, JSON.stringify([]));

// 🔁 Helper: Save contact to contacts.json
function saveContact(contact) {
  const data = JSON.parse(fs.readFileSync(contactsFile, 'utf-8'));
  data.push(contact);
  fs.writeFileSync(contactsFile, JSON.stringify(data, null, 2));
}

// 🔁 Helper: Generate .vcf content
function generateVCF(name, phone) {
  return `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;TYPE=CELL:${phone}
END:VCARD`;
}

// ✅ API: Save new contact + generate VCF
app.post('/api/save', (req, res) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and phone required' });
  }

  const filename = `${Date.now()}-${name.replace(/\s+/g, '_')}.vcf`;
  const filepath = `/vcf/${filename}`;
  const fullPath = path.join(vcfFolder, filename);

  const vcfData = generateVCF(name, phone);
  fs.writeFileSync(fullPath, vcfData);

  const contact = { name, phone, vcf: filepath };
  saveContact(contact);

  return res.json({ success: true, message: 'Contact saved', vcf: filepath });
});

// ✅ API: Get all contacts
app.get('/api/contacts', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(contactsFile, 'utf-8'));
    res.json({ success: true, contacts: data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to read contacts' });
  }
});

// ✅ Root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ✅ Contacts Page
app.get('/contacts', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/contacts.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
