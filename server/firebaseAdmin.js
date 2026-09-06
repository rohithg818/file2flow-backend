const admin = require('firebase-admin');

let db, auth, storage;

try {
  let serviceAccount;

  // Try env var first (Render), then local file (dev)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    serviceAccount = require('./serviceAccountKey.json');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
  db = admin.firestore();
  auth = admin.auth();
  storage = admin.storage();
  db.settings({ ignoreUndefinedProperties: true });
} catch (err) {
  console.warn('Firebase Admin not initialized:', err.message);
  console.warn('Auth routes will not work. PDF tools and conversions are still available.');
}

module.exports = { admin, db, auth, storage };
