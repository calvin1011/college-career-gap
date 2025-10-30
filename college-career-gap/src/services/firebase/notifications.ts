import { getMessaging, getToken } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./config";
import app from "./config";

export const requestNotificationPermission = async (userId: string) => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('Not in browser environment');
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported in this browser');
    }

    // Check if Notification API is supported
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported in this browser');
    }

    const messaging = getMessaging(app);

    // Request permission
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("Notification permission granted.");

      try {
        // Register service worker first
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        console.log('Service Worker registered:', registration);

      // Get the device token
      const currentToken = await getToken(messaging, {
        vapidKey: "BLg73B7GDwucU-ERuh1QN8-1dinGhXkdPMOEUJy3Yjf-AN2t1OP0oYHcHD_OAd2ujy5-GLU2SPn1a_QvJ6hnnQI",
        serviceWorkerRegistration: registration
      });

        // Get the device token with increased timeout for mobile
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
          throw new Error("No registration token available. Request permission to generate one.");
        }
      } catch (swError) {
        console.error("Service worker or token error:", swError);
        throw new Error("Failed to setup notifications. Please check your browser settings.");
      }
    } else if (permission === "denied") {
      throw new Error("Notification permission denied. Please enable notifications in your browser settings.");
    } else {
      throw new Error("Notification permission dismissed.");
    }
  } catch (error) {
    console.error("An error occurred while setting up notifications:", error);
    throw error;
  }
};