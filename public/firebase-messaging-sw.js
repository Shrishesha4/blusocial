
// Import and configure the Firebase SDK
// It is recommended to import the firebase-app and firebase-messaging packages
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging/sw";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Background message handler
// self.addEventListener('push', (event) => {
//     const payload = event.data.json();
//     const title = payload.notification.title;
//     const options = {
//         body: payload.notification.body,
//         icon: payload.notification.icon,
//     };
//     event.waitUntil(self.registration.showNotification(title, options));
// });
