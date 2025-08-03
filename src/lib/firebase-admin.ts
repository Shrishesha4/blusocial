import admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;

const initializeAdmin = () => {
  if (admin.apps.length > 0) {
    adminApp = admin.app();
    return;
  }
  
  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      console.error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable is missing.');
      return;
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialized successfully.');
    
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
    adminApp = null; // Ensure it's null on failure
  }
};

// Call initialization to ensure it runs at least once.
initializeAdmin();

// Helper functions to get services with proper error handling
export function getAdminAuth(): admin.auth.Auth {
  if (!adminApp) {
    initializeAdmin(); // Attempt to re-initialize
    if (!adminApp) {
      throw new Error('Firebase Admin Auth not initialized. Check your .env.local file.');
    }
  }
  return adminApp.auth();
}

export function getAdminDb(): admin.firestore.Firestore {
   if (!adminApp) {
    initializeAdmin(); // Attempt to re-initialize
    if (!adminApp) {
      throw new Error('Firebase Admin Firestore not initialized. Check your .env.local file.');
    }
  }
  return adminApp.firestore();
}

export function getAdminMessaging(): admin.messaging.Messaging {
  if (!adminApp) {
    initializeAdmin(); // Attempt to re-initialize
    if (!adminApp) {
      throw new Error('Firebase Admin Messaging not initialized. Check your .env.local file.');
    }
  }
  return adminApp.messaging();
}

// Keep the original exports for backwards compatibility (though they are not recommended)
export const adminDb = adminApp ? adminApp.firestore() : null;
export const adminAuth = adminApp ? adminApp.auth() : null;
export const adminMessaging = adminApp ? adminApp.messaging() : null;
