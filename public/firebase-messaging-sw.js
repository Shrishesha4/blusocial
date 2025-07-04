// This file must be present in the public directory for Firebase Cloud Messaging to work in the background.

// In a production app, you would import and initialize the Firebase SDK here
// to customize how background notifications are handled.
// For example: importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
//
// However, for notifications with a 'notification' payload (like the ones this app sends),
// the mere presence of this service worker file is enough for most modern browsers
// to automatically display the notification in the system tray when the app is in the background.

self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
});

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  // The browser will automatically display notifications
  // with a 'notification' payload. For 'data' payloads,
  // you would need to handle it manually here by calling
  // self.registration.showNotification().
});
