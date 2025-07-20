// contact-manager.js
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Load service account
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// === Core Functions ===

// Add a contact
async function addContact(fullName, phone, email, userId = "admin") {
  if (!fullName || !phone) {
    console.log(" ^}^l Missing name or phone number.");
    return;
  }

  await db.collection("contacts").add({
    fullName,
    phone,
    email: email || "",
    userId,
    targeted: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(` ^|^e Contact saved: ${fullName} (${phone})`);
}

// List all contacts
async function listContacts() {
  const snapshot = await db.collection("contacts").orderBy("createdAt", "desc").get();
  if (snapshot.empty) {
    console.log(" ^d   ^o No contacts found.");
    return;
  }

  console.log(" ^=^s^r Contact List:");
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`- ${data.fullName} | ${data.phone} | ${data.email || 'No Email'}`);
  });
}

// Export all contacts to VCF
async function exportVCF(fileName = "contacts.vcf") {
  const snapshot = await db.collection("contacts").get();
  if (snapshot.empty) {
    console.log(" ^z   ^o No contacts found to export.");
    return;
  }

  let vcfContent = "";
  snapshot.forEach(doc => {
    const { fullName, phone, email } = doc.data();
    vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:${fullName}\nTEL:${phone}\nEMAIL:${email || ''}\nEND:VCARD\n`;
  });

  const outputPath = path.join(__dirname, fileName);
  fs.writeFileSync(outputPath, vcfContent);
  console.log(` ^|^e Exported ${snapshot.size} contacts to ${fileName}`);
}

// === CLI Controller ===
const [, , cmd, ...args] = process.argv;

(async () => {
  switch (cmd) {
    case "add":
      await addContact(args[0], args[1], args[2], args[3]); // fullName, phone, email, userId
      break;
    case "list":
      await listContacts();
      break;
    case "export":
      await exportVCF(args[0]); // optional: file name
      break;
    default:
      console.log(`Usage:
  node contact-manager.js add "John Doe" "0712345678" "john@example.com" "uid123"
  node contact-manager.js list
  node contact-manager.js export [filename.vcf]`);
  }
