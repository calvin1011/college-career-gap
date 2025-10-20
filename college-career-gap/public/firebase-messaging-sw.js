// Import Firebase scripts
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBBvSbsh0e2Pim7a53nyOyHqClvHVkJYVo",
  authDomain: "college-career-gap.firebaseapp.com",
  projectId: "college-career-gap",
  storageBucket: "college-career-gap.firebasestorage.app",
  messagingSenderId: "730642444726",
  appId: "1:730642444726:web:b17e5d835f6ce78cac9117",
  measurementId: "G-YMVSR8N0KM"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log("Firebase initialized in service worker");
} catch (error) {
  console.error("Error initializing Firebase in service worker:", error);
}

// Get messaging instance
let messaging;
try {
  messaging = firebase.messaging();
  console.log("Firebase Messaging initialized");
} catch (error) {
  console.error("Error getting messaging instance:", error);
}

// Handle background messages
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log("Received background message:", payload);

    const notificationTitle = payload.notification?.title || "New Notification";
    const notificationOptions = {
      body: payload.notification?.body || "You have a new message",
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: payload.data?.channelId || 'default',
      data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log("Notification clicked:", event);
  event.notification.close();

  // Open the app or focus existing window
  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});