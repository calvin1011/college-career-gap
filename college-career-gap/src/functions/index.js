const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendNewMessageNotification = onDocumentCreated("messages/{messageId}", async (event) => {
    // The document data is now available on event.data.data()
    const message = event.data.data();
    const channelId = message.channelId;
    const authorId = message.authorId;

    const channelDoc = await admin.firestore().collection("channels").doc(channelId).get();
    if (!channelDoc.exists) {
        return console.log(`Channel ${channelId} not found.`);
    }
    const channelData = channelDoc.data();
    const memberIds = channelData.members || [];
    const tokens = [];

    for (const userId of memberIds) {
        if (userId === authorId) {
            continue;
        }

        const userDoc = await admin.firestore().collection("users").doc(userId).get();
        if (userDoc.exists && userDoc.data().notificationToken) {
            tokens.push(userDoc.data().notificationToken);
        }
    }

    if (tokens.length === 0) {
        return console.log("No users with notification tokens found.");
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

    return admin.messaging().sendMulticast({
        tokens,
        notification: payload.notification,
        data: payload.data,
    });
});