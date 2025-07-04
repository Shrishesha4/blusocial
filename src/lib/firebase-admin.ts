import admin from 'firebase-admin';

let adminApp: admin.app.App | undefined;
let adminDb: admin.firestore.Firestore | undefined;
let adminAuth: admin.auth.Auth | undefined;
let adminMessaging: admin.messaging.Messaging | undefined;

if (!admin.apps.length) {
  try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } catch (error: any) {
    console.error('Firebase admin initialization error. Push notifications may be disabled.', error.stack);
  }
} else {
  adminApp = admin.app();
}

if (adminApp) {
  try {
    adminDb = admin.firestore();
    adminAuth = admin.auth();
    adminMessaging = admin.messaging();
  } catch (error: any) {
    console.error('Error getting Firebase admin services.', error.stack);
  }
}

export { adminDb, adminAuth, adminMessaging };
