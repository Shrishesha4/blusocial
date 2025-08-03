
import admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;

const initializeAdmin = () => {
  // Prevent re-initialization
  if (adminApp) return;

  if (admin.apps.length > 0) {
    adminApp = admin.app();
    return;
  }
  
  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      // This is not a user-facing error, but a server configuration issue.
      // We'll log it and the functions below will throw a user-friendly error.
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
    adminApp = null; // Ensure it's null on failure
  }
};

// Initialize on module load
initializeAdmin();

// Helper functions to get services with proper error handling.
// These functions will be called by server actions.
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
