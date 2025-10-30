import { getMessaging, getToken } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./config";
import app from "./config";

export const requestNotificationPermission = async (userId: string) => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.log('Not in browser environment');
      return;
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers not supported');
      return;
    }

    const messaging = getMessaging(app);

    // Request permission
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("Notification permission granted.");

      // Register service worker first
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered:', registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Get the device token
      const currentToken = await getToken(messaging, {
        vapidKey: "BLg73B7GDwucU-ERuh1QN8-1dinGhXkdPMOEUJy3Yjf-AN2t1OP0oYHcHD_OAd2ujy5-GLU2SPn1a_QvJ6hnnQI",
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        // Save the token to the user's profile in Firestore
        const userDocRef = doc(db, "users", userId);
        await updateDoc(userDocRef, {
          notificationToken: currentToken,
        });
        console.log("Notification token saved successfully:", currentToken);
        return currentToken;
      } else {
        console.log("No registration token available.");
      }
    } else {
      console.log("Notification permission denied.");
    }
  } catch (error) {
    console.error("An error occurred while setting up notifications:", error);
    throw error;
  }
};