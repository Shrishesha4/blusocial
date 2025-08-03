import admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;
let adminDb: admin.firestore.Firestore | null = null;
let adminAuth: admin.auth.Auth | null = null;
let adminMessaging: admin.messaging.Messaging | null = null;

const initializeAdmin = () => {
  try {
    console.log('Starting Firebase Admin initialization...');
    
    // Check if already initialized
    if (admin.apps.length > 0) {
      console.log('Firebase Admin already initialized');
      adminApp = admin.app();
    } else {
      // Get service account from environment
      const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      
      if (!serviceAccountJson) {
        console.error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable is missing');
        console.error('Make sure your file is named .env.local (not .env)');
        return;
      }

      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountJson);
        console.log('Service account parsed successfully for project:', serviceAccount.project_id);
      } catch (parseError) {
        console.error('Failed to parse service account JSON:', parseError);
        return;
      }

      // Initialize admin app
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      
      console.log('Firebase Admin app initialized successfully');
    }

    // Initialize services
    if (adminApp) {
      adminDb = admin.firestore();
      adminAuth = admin.auth();
      adminMessaging = admin.messaging();
      
      console.log('All Firebase Admin services initialized');
      console.log('Services available:', {
        auth: !!adminAuth,
        firestore: !!adminDb,
        messaging: !!adminMessaging
      });
    }
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
  }
};

// Initialize immediately
initializeAdmin();

// Helper functions to get services with proper error handling
export function getAdminAuth(): admin.auth.Auth {
  if (!adminAuth) {
    throw new Error('Firebase Admin Auth not initialized. Check your .env.local file.');
  }
  return adminAuth;
}

export function getAdminDb(): admin.firestore.Firestore {
  if (!adminDb) {
    throw new Error('Firebase Admin Firestore not initialized. Check your .env.local file.');
  }
  return adminDb;
}

export function getAdminMessaging(): admin.messaging.Messaging {
  if (!adminMessaging) {
    throw new Error('Firebase Admin Messaging not initialized. Check your .env.local file.');
  }
  return adminMessaging;
}

// Keep the original exports for backwards compatibility
export { adminDb, adminAuth, adminMessaging };
