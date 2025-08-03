
import admin from 'firebase-admin';
import 'dotenv/config'; // Ensure environment variables are loaded

let adminApp: admin.app.App | null = null;

const initializeAdmin = () => {
  if (adminApp) return;

  if (admin.apps.length > 0) {
    adminApp = admin.app();
    return;
  }
  
  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      console.error('CRITICAL: GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set. Firebase Admin SDK cannot be initialized.');
      return;
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK initialized successfully.');
    
  } catch (error) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed.', error);
    adminApp = null;
  }
};

initializeAdmin();

export function getAdminAuth(): admin.auth.Auth {
  if (!adminApp) {
    throw new Error('Firebase Admin Auth not initialized. The service is currently unavailable.');
  }
  return adminApp.auth();
}

export function getAdminDb(): admin.firestore.Firestore {
   if (!adminApp) {
    throw new Error('Firebase Admin Firestore not initialized. The service is currently unavailable.');
  }
  return adminApp.firestore();
}

export function getAdminMessaging(): admin.messaging.Messaging {
  if (!adminApp) {
    throw new Error('Firebase Admin Messaging not initialized. The service is currently unavailable.');
  }
  return adminApp.messaging();
}
