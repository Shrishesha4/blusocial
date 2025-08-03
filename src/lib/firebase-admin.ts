import admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;
let initializationAttempted = false;
let initializationError: Error | null = null;

export const initializeAdmin = () => {
  if (adminApp) return; // Already initialized successfully
  if (initializationAttempted && initializationError) {
    throw initializationError; // Re-throw the previous error
  }

  initializationAttempted = true;

  // If already initialized by another part of the app
  if (admin.apps.length > 0) {
    adminApp = admin.app();
    console.log('Using existing Firebase Admin app');
    return;
  }
  
  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      initializationError = new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set');
      console.error('CRITICAL:', initializationError.message);
      throw initializationError;
    }
    
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (parseError) {
      initializationError = new Error('Invalid JSON in GOOGLE_SERVICE_ACCOUNT_JSON');
      console.error('CRITICAL:', initializationError.message, parseError);
      throw initializationError;
    }

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    console.log('Firebase Admin SDK initialized successfully for project:', serviceAccount.project_id);
    
    // Test the initialization by making a simple call
    adminApp.auth().listUsers(1).then(() => {
      console.log('Firebase Admin Auth is working correctly');
    }).catch((testError) => {
      console.error('Firebase Admin Auth test failed:', testError);
    });
    
  } catch (error) {
    initializationError = error as Error;
    console.error('CRITICAL: Firebase Admin SDK initialization failed.', error);
    adminApp = null;
    throw initializationError;
  }
};

// Initialize at module load
try {
  initializeAdmin();
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK at module load:', error);
}

export function getAdminAuth(): admin.auth.Auth {
  if (!adminApp) {
    if (initializationError) {
      throw new Error(`Firebase Admin Auth not available: ${initializationError.message}`);
    }
    throw new Error('Firebase Admin Auth not initialized. The service is currently unavailable.');
  }
  return adminApp.auth();
}

export function getAdminDb(): admin.firestore.Firestore {
  if (!adminApp) {
    if (initializationError) {
      throw new Error(`Firebase Admin Firestore not available: ${initializationError.message}`);
    }
    throw new Error('Firebase Admin Firestore not initialized. The service is currently unavailable.');
  }
  return adminApp.firestore();
}

export function getAdminMessaging(): admin.messaging.Messaging {
  if (!adminApp) {
    if (initializationError) {
      throw new Error(`Firebase Admin Messaging not available: ${initializationError.message}`);
    }
    throw new Error('Firebase Admin Messaging not initialized. The service is currently unavailable.');
  }
  return adminApp.messaging();
}
