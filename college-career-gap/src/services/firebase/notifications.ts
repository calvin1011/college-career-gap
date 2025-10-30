import { getMessaging, getToken } from "firebase/messaging";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "./config";
import app from "./config";

export const requestNotificationPermission = async (userId: string) => {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('Push notifications not supported in this environment.');
      return;
    }

    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("Notification permission granted.");
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;

      const currentToken = await getToken(messaging, {
        vapidKey: "BLg73B7GDwucU-ERuh1QN8-1dinGhXkdPMOEUJy3Yjf-AN2t1OP0oYHcHD_OAd2ujy5-GLU2SPn1a_QvJ6hnnQI",
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        // Add the new token to the user's array of tokens
        const userDocRef = doc(db, "users", userId);
        await updateDoc(userDocRef, {
          notificationTokens: arrayUnion(currentToken),
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

// function to REMOVE a token when a user turns off notifications
export const disableNotificationsForDevice = async (userId: string) => {
    try {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }

        const messaging = getMessaging(app);
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        // Get the token for THIS specific device/browser
        const currentToken = await getToken(messaging, {
            vapidKey: "BLg73B7GDwucU-ERuh1QN8-1dinGhXkdPMOEUJy3Yjf-AN2t1OP0oYHcHD_OAd2ujy5-GLU2SPn1a_QvJ6hnnQI",
            serviceWorkerRegistration: registration
        });

        if (currentToken) {
            // Remove this specific token from the user's array
            const userDocRef = doc(db, "users", userId);
            await updateDoc(userDocRef, {
                notificationTokens: arrayRemove(currentToken),
            });
            console.log("Notification token removed successfully.");
        }
    } catch (error) {
        console.error("Error disabling notifications:", error);
        throw error;
    }
};