const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

// Initialize the Admin SDK
initializeApp();
const db = getFirestore();
const messaging = getMessaging();

exports.sendNewMessageNotification = onDocumentCreated("messages/{messageId}", async (event) => {
    const message = event.data.data();
    const channelId = message.channelId;
    const authorId = message.authorId;

    const channelDoc = await db.collection("channels").doc(channelId).get();
    if (!channelDoc.exists) {
        return console.log(`Channel ${channelId} not found.`);
    }
    const channelData = channelDoc.data();
    const memberIds = channelData.members || [];
    let allTokens = [];

    // Gather notification tokens from all members of the channel
    for (const userId of memberIds) {
        // Don't send a notification to the person who sent the message
        if (userId === authorId) {
            continue;
        }

        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists && Array.isArray(userDoc.data().notificationTokens)) {
            allTokens.push(...userDoc.data().notificationTokens);
        }
    }

    // Remove any duplicate tokens
    const uniqueTokens = [...new Set(allTokens)];

    if (uniqueTokens.length === 0) {
        return console.log("No users with notification tokens found.");
    }

    // Construct the multicast message payload
    const multicastPayload = {
        tokens: uniqueTokens,
        notification: {
            title: `New Resource in ${channelData.name}`,
            body: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
            icon: '/favicon.ico',
        },
        data: {
            url: `/dashboard/channels/${channelId}`
        }
    };

    console.log(`Sending notification to ${uniqueTokens.length} device(s).`);
    return messaging.sendEachForMulticast(multicastPayload);
});