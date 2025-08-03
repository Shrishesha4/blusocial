
import admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;
let initializationError: Error | null = null;
let initializationAttempted = false;

export const initializeAdmin = () => {
  if (adminApp) {
    return; // Already initialized successfully
  }
  if (initializationAttempted) {
    if (initializationError) throw initializationError;
    return; // Already attempted without error, might be waiting for async
  }
  initializationAttempted = true;

  if (admin.apps.length > 0) {
    console.log('Using existing Firebase Admin app.');
    adminApp = admin.app();
    return;
  }

  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountJson) {
      const errorMsg = 'GOOGLE_SERVICE_ACCOUNT_JSON is not set in the environment. This is required for server-side admin operations. Make sure it is set in your Vercel project settings.';
      console.error('CRITICAL: Firebase Admin initialization failed:', errorMsg);
      initializationError = new Error(errorMsg);
      throw initializationError;
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    console.log('Initializing new Firebase Admin app...');
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK initialized successfully.');

  } catch (error: any) {
    const errorMsg = `Firebase Admin SDK initialization failed: ${error.message}`;
    console.error('CRITICAL:', errorMsg);
    initializationError = new Error(errorMsg);
    adminApp = null; // Ensure app is null on failure
    throw initializationError;
  }
};


// Helper to get a service, initializing if needed.
function getService<T>(
  serviceFactory: (app: admin.app.App) => T,
  serviceName: string
): T {
  try {
    initializeAdmin();
    if (!adminApp) {
      throw new Error('Firebase Admin App is not available.');
    }
    return serviceFactory(adminApp);
  } catch (error: any) {
    console.error(`Failed to get Firebase Admin ${serviceName}:`, error.message);
    if (initializationError) {
       throw new Error(`Firebase Admin ${serviceName} not available due to initialization failure: ${initializationError.message}`);
    }
    throw new Error(`Firebase Admin ${serviceName} not initialized. The service is currently unavailable.`);
  }
}

export function getAdminAuth(): admin.auth.Auth {
    return getService(app => app.auth(), 'Auth');
}

export function getAdminDb(): admin.firestore.Firestore {
    return getService(app => app.firestore(), 'Firestore');
}

export function getAdminMessaging(): admin.messaging.Messaging {
    return getService(app => app.messaging(), 'Messaging');
}
