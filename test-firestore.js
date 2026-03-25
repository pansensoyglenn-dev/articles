const admin = require('firebase-admin');

// Initialize with the credentials provided by the environment
// Firebase Admin SDK automatically detects the GOOGLE_APPLICATION_CREDENTIALS 
// environment variable if configured, or you can initialize with service account content.
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function testConnection() {
  try {
    const docRef = db.collection('test').doc('connection_check');
    await docRef.set({ timestamp: new Date(), status: 'success' });
    console.log("Firestore connection successful!");
    process.exit(0);
  } catch (error) {
    console.error("Firestore connection failed:", error);
    process.exit(1);
  }
}

testConnection();
