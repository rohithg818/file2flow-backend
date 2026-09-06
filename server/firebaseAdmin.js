const admin = require('firebase-admin');

let db, auth, storage;

try {
  const serviceAccount = require('./serviceAccountKey.json');
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
