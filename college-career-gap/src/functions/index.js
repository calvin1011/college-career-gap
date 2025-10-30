const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

// Initialize services
initializeApp();
const db = getFirestore();
const messaging = getMessaging();

exports.sendNewMessageNotification = onDocumentCreated("messages/{messageId}", async (event) => {
    const message = event.data.data();
    const channelId = message.channelId;
    const authorId = message.authorId;

    // 'db' instance for Firestore operations
    const channelDoc = await db.collection("channels").doc(channelId).get();
    if (!channelDoc.exists) {
        return console.log(`Channel ${channelId} not found.`);
    }
    const channelData = channelDoc.data();
    const memberIds = channelData.members || [];
    const tokens = [];

    for (const userId of memberIds) {
        if (userId === authorId) {
            continue; // Don't send a notification to the author
        }

        // 'db' instance for Firestore operations
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists && userDoc.data().notificationToken) {
            tokens.push(userDoc.data().notificationToken);
        }
    }

    if (tokens.length === 0) {
        return console.log("No users with notification tokens found to send to.");
    }

    const payload = {
        notification: {
            title: `New Resource in ${channelData.name}`,
            body: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
            icon: '/favicon.ico',
        },
        data: {
            url: `/dashboard/channels/${channelId}`
        }
    };

    // Use the new 'messaging' instance and the correct 'sendMulticast' method
    return messaging.sendMulticast({
        tokens,
        notification: payload.notification,
        data: payload.data,
    });
});