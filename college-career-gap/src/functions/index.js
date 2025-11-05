const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { onRequest, onCall } = require("firebase-functions/v2/https");
const functions = require("firebase-functions");

// Initialize the Admin SDK
initializeApp();
const db = getFirestore();
const messaging = getMessaging();

exports.onUserUpdate = onDocumentUpdated("users/{userId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;

    const avatarBefore = before.profile?.avatar;
    const avatarAfter = after.profile?.avatar;

    // Check if the displayName or avatar actually changed
    if (before.displayName === after.displayName && avatarBefore === avatarAfter) {
        console.log(`User ${userId} updated, but name and avatar are the same. No propagation needed.`);
        return null;
    }

    console.log(`User ${userId} updated. Propagating name/avatar changes to messages...`);

    // Prepare the update payload
    const updateData = {
        authorDisplayName: after.displayName,
    };

    if (avatarAfter) {
        updateData.authorAvatar = avatarAfter;
    } else {
        // If the new avatar is null/undefined, remove the field
        updateData.authorAvatar = FieldValue.delete();
    }

    // Find all messages by this author
    const messagesQuery = db.collection("messages").where("authorId", "==", userId);
    const snapshot = await messagesQuery.get();

    if (snapshot.empty) {
        console.log(`User ${userId} has no messages. Propagation complete.`);
        return null;
    }

    const batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    snapshot.docs.forEach((doc) => {
        currentBatch.update(doc.ref, updateData);
        operationCount++;

        // If batch is full (500 ops), push it and start a new one
        if (operationCount === 500) {
            batches.push(currentBatch);
            currentBatch = db.batch();
            operationCount = 0;
        }
    });

    // Add the last (or only) batch if it has operations
    if (operationCount > 0) {
        batches.push(currentBatch);
    }

    // Commit all batches in parallel
    await Promise.all(batches.map(batch => batch.commit()));

    console.log(`Successfully updated ${snapshot.size} messages for user ${userId}.`);
    return null;
});

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

// Scheduled cleanup function - runs daily at 2 AM
exports.cleanupExpiredMessages = onSchedule("every day 02:00", async (context) => {
    console.log(" Starting scheduled cleanup of expired messages...");

    const now = new Date();
    const messagesRef = db.collection("messages");

    // Query messages that have expired based on their expiresAt field
    const snapshot = await messagesRef
        .where('expiresAt', '<', now)
        .get();

    console.log(`📋 Found ${snapshot.size} expired posts`);

    if (snapshot.size === 0) {
        console.log("✅ No expired posts to delete");
        return {
            success: true,
            totalDeleted: 0,
            channelsAffected: 0,
            summary: {}
        };
    }

    const channelUpdates = {}; // Track deletions per channel
    let totalDeleted = 0;
    const deletedMessages = []; // Track details for logging

    // Delete expired messages in batches (Firestore limit: 500 per batch)
    const batchSize = 500;
    const batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    snapshot.docs.forEach((doc) => {
        const messageData = doc.data();
        const channelId = messageData.channelId;
        const tags = messageData.metadata?.tags || [];
        const expiringTag = tags.find(tag => ['internship', 'full-time'].includes(tag));

        // Track deletion count per channel
        channelUpdates[channelId] = (channelUpdates[channelId] || 0) + 1;

        // Store details for logging
        deletedMessages.push({
            id: doc.id,
            channelId,
            tag: expiringTag || 'unknown',
            expiresAt: messageData.expiresAt?.toDate()?.toISOString() || 'unknown',
            content: messageData.content.substring(0, 50) + '...'
        });

        // Add deletion to batch
        currentBatch.delete(doc.ref);
        operationCount++;
        totalDeleted++;

        // If batch is full, save it and start a new one
        if (operationCount === batchSize) {
            batches.push(currentBatch);
            currentBatch = db.batch();
            operationCount = 0;
        }
    });

    // Add the last batch if it has operations
    if (operationCount > 0) {
        batches.push(currentBatch);
    }

    // Commit all batches
    console.log(` Committing ${batches.length} batch(es)...`);
    for (let i = 0; i < batches.length; i++) {
        await batches[i].commit();
        console.log(` Batch ${i + 1}/${batches.length} committed`);
    }

    // Update message counts for affected channels
    if (Object.keys(channelUpdates).length > 0) {
        console.log(` Updating message counts for ${Object.keys(channelUpdates).length} channels...`);

        const channelBatchSize = 500;
        const channelBatches = [];
        let currentChannelBatch = db.batch();
        let channelOperationCount = 0;

        for (const [channelId, deletionCount] of Object.entries(channelUpdates)) {
            const channelRef = db.collection("channels").doc(channelId);
            currentChannelBatch.update(channelRef, {
                messageCount: FieldValue.increment(-deletionCount),
                updatedAt: FieldValue.serverTimestamp()
            });
            channelOperationCount++;

            if (channelOperationCount === channelBatchSize) {
                channelBatches.push(currentChannelBatch);
                currentChannelBatch = db.batch();
                channelOperationCount = 0;
            }
        }

        if (channelOperationCount > 0) {
            channelBatches.push(currentChannelBatch);
        }

        for (const batch of channelBatches) {
            await batch.commit();
        }

        console.log(` Updated message counts for all affected channels`);
    }

    // Create detailed summary
    const summary = {
        timestamp: FieldValue.serverTimestamp(),
        totalDeleted,
        channelsAffected: Object.keys(channelUpdates).length,
        deletionsByChannel: channelUpdates,
        expiredByTag: {},
    };

    // Count deletions by tag
    deletedMessages.forEach(msg => {
        summary.expiredByTag[msg.tag] = (summary.expiredByTag[msg.tag] || 0) + 1;
    });

    // Log summary
    console.log(`
    ╔════════════════════════════════════════╗
    ║     CLEANUP SUMMARY                    ║
    ╠════════════════════════════════════════╣
    ║ Total Messages Deleted: ${totalDeleted.toString().padEnd(14)}║
    ║ Channels Affected: ${Object.keys(channelUpdates).length.toString().padEnd(19)}║
    ║ Internships Deleted: ${(summary.expiredByTag['internship'] || 0).toString().padEnd(17)}║
    ║ Full-Time Jobs Deleted: ${(summary.expiredByTag['full-time'] || 0).toString().padEnd(14)}║
    ╚════════════════════════════════════════╝
    `);

    // Store cleanup log for admin dashboard
    if (totalDeleted > 0) {
        await db.collection("cleanup_logs").add(summary);
        console.log(` Cleanup log saved to Firestore`);
    }

    console.log(` Cleanup complete!`);

    return {
        success: true,
        totalDeleted,
        channelsAffected: Object.keys(channelUpdates).length,
        summary
    };
});

exports.fixMemberCounts = onRequest(async (req, res) => {
    console.log(" Fixing member counts...");

    const channelsSnapshot = await db.collection("channels").get();
    const batch = db.batch();
    const results = [];

    for (const channelDoc of channelsSnapshot.docs) {
        const data = channelDoc.data();
        const actualCount = (data.members || []).length;
        const storedCount = data.memberCount || 0;

        if (actualCount !== storedCount) {
            console.log(`Fixing ${data.name}: ${storedCount} → ${actualCount}`);
            batch.update(channelDoc.ref, {
                memberCount: actualCount,
                updatedAt: FieldValue.serverTimestamp()
            });
            results.push({ channel: data.name, old: storedCount, new: actualCount });
        }
    }

    await batch.commit();
    res.json({ success: true, fixed: results });
});

// Auto-fix every day
exports.reconcileMemberCounts = onSchedule("every day 03:00", async (context) => {
    console.log(" Daily member count check...");

    const channelsSnapshot = await db.collection("channels").get();
    const batch = db.batch();
    let fixedCount = 0;

    for (const channelDoc of channelsSnapshot.docs) {
        const data = channelDoc.data();
        const actualCount = (data.members || []).length;
        const storedCount = data.memberCount || 0;

        if (actualCount !== storedCount) {
            batch.update(channelDoc.ref, {
                memberCount: actualCount,
                updatedAt: FieldValue.serverTimestamp()
            });
            fixedCount++;
        }
    }

    if (fixedCount > 0) await batch.commit();
    console.log(` Fixed ${fixedCount} channels`);
});

exports.incrementMessageClick = onCall(async (request) => {
  console.log('incrementMessageClick called');

  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to perform this action."
    );
  }

  const { messageId } = request.data;
  if (!messageId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a 'messageId'."
    );
  }

  const userId = request.auth.uid;
  console.log('User:', userId, 'Message:', messageId);

  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError("not-found", "User document not found.");
  }

  const userRole = userDoc.data().role;
  console.log('User role:', userRole);

  if (userRole === "student") {
    const messageRef = db.collection("messages").doc(messageId);

    try {
      await db.runTransaction(async (transaction) => {
        const messageDoc = await transaction.get(messageRef);

        if (!messageDoc.exists) {
          throw new functions.https.HttpsError("not-found", "Message not found.");
        }

        const messageData = messageDoc.data();
        const clickedBy = messageData.clickedBy || {};

        if (clickedBy[userId]) {
          console.log('User already clicked this message');
          return;
        }

        transaction.update(messageRef, {
          clickCount: FieldValue.increment(1),
          [`clickedBy.${userId}`]: FieldValue.serverTimestamp()
        });

        console.log('New click recorded');
      });

      return { success: true, message: "Click recorded." };
    } catch (error) {
      console.error("Error incrementing click count:", error);
      throw new functions.https.HttpsError("internal", "Failed to update click count.");
    }
  } else {
    console.log('Admin click, not counted');
    return { success: true, message: "Admin click not counted." };
  }
});

exports.incrementMessageView = onCall(async (request) => {
  console.log('incrementMessageView called');

  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to perform this action."
    );
  }

  const { messageId } = request.data;
  if (!messageId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a 'messageId'."
    );
  }

  const userId = request.auth.uid;
  console.log('User:', userId, 'Message:', messageId);

  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError("not-found", "User document not found.");
  }

  const userRole = userDoc.data().role;
  console.log('User role:', userRole);

  // Only count views for students
  if (userRole === "student") {
    const messageRef = db.collection("messages").doc(messageId);

    try {
      await db.runTransaction(async (transaction) => {
        const messageDoc = await transaction.get(messageRef);

        if (!messageDoc.exists) {
          throw new functions.https.HttpsError("not-found", "Message not found.");
        }

        const messageData = messageDoc.data();
        const viewedBy = messageData.viewedBy || {};

        // Check if user has already viewed
        if (viewedBy[userId]) {
          console.log('User already viewed this message');
          return;
        }

        // Increment viewCount and add user to viewedBy map
        transaction.update(messageRef, {
          viewCount: FieldValue.increment(1),
          [`viewedBy.${userId}`]: FieldValue.serverTimestamp()
        });

        console.log('New view recorded');
      });

      return { success: true, message: "View recorded." };
    } catch (error) {
      console.error("Error incrementing view count:", error);
      throw new functions.https.HttpsError("internal", "Failed to update view count.");
    }
  } else {
    console.log('Admin view, not counted');
    return { success: true, message: "Admin view not counted." };
  }
});