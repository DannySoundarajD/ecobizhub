const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json'); 

try {
    if (!admin.apps.length) { 
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin SDK initialized successfully.');
    } else {
        console.warn('Firebase Admin SDK already initialized. Skipping re-initialization.');
    }
} catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    process.exit(1); 
}
module.exports = admin;