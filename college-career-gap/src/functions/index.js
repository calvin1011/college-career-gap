
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// function triggers whenever a new document is created in the 'messages' collection
exports.sendNewMessageNotification = functions.firestore
  .document("messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const channelId = message.channelId;

    // Get the channel details to find its members
    const channelDoc = await admin.firestore().collection("channels").doc(channelId).get();
    if (!channelDoc.exists) {
      return console.log("Channel not found.");
    }
    const memberIds = channelDoc.data().members;

    // Get the notification tokens for all members
    const tokens = [];
    for (const userId of memberIds) {
      // Don't send a notification to the person who posted the message
      if (userId === message.authorId) continue;

      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      if (userDoc.exists && userDoc.data().notificationToken) {
        tokens.push(userDoc.data().notificationToken);
      }
    }

    if (tokens.length === 0) {
      return console.log("No users to notify.");
    }

    // Define the notification payload
    const payload = {
      notification: {
        title: `New Resource in ${channelDoc.data().name}`,
        body: message.content.substring(0, 100), // Truncate for preview
        click_action: `https://your-website-url.com/dashboard/channels/${channelId}`,
      },
    };

    // Send the notification to all collected tokens
    return admin.messaging().sendToDevice(tokens, payload);
  });