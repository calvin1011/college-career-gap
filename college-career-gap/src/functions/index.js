const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { onRequest } = require("firebase-functions/v2/https");

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

// Scheduled cleanup function - runs daily at 2 AM
exports.cleanupExpiredMessages = onSchedule("every day 02:00", async (context) => {
    console.log(" Starting scheduled cleanup of expired messages...");

    // Define expiration periods (in days)
    const EXPIRATION_RULES = {
        'internship': 7,
        'full-time': 7,
    };

    const now = new Date();
    const messagesRef = db.collection("messages");
    const channelUpdates = {}; // Track deletions per channel
    let totalDeleted = 0;
    const deletedMessages = []; // Track details for logging

    // Process each tag type
    for (const [tag, daysUntilExpiration] of Object.entries(EXPIRATION_RULES)) {
        console.log(` Checking for expired ${tag} posts (older than ${daysUntilExpiration} days)...`);

        // Calculate cutoff date
        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - daysUntilExpiration);

        console.log(` Cutoff date: ${cutoffDate.toISOString()}`);

        // Query messages with this tag that are older than cutoff
        const snapshot = await messagesRef
            .where('metadata.tags', 'array-contains', tag)
            .where('createdAt', '<', cutoffDate)
            .get();

        console.log(` Found ${snapshot.size} expired ${tag} posts`);

        if (snapshot.size === 0) {
            console.log(` No expired ${tag} posts to delete`);
            continue;
        }

        // Delete each expired message in batches (Firestore limit: 500 per batch)
        const batchSize = 500;
        const batches = [];
        let currentBatch = db.batch();
        let operationCount = 0;

        snapshot.docs.forEach((doc) => {
            const messageData = doc.data();
            const channelId = messageData.channelId;
            const createdAt = messageData.createdAt?.toDate();

            // Track deletion count per channel
            channelUpdates[channelId] = (channelUpdates[channelId] || 0) + 1;

            // Store details for logging
            deletedMessages.push({
                id: doc.id,
                channelId,
                tag,
                createdAt: createdAt?.toISOString() || 'unknown',
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
        console.log(` Committing ${batches.length} batch(es) for ${tag} posts...`);
        for (let i = 0; i < batches.length; i++) {
            await batches[i].commit();
            console.log(` Batch ${i + 1}/${batches.length} committed`);
        }

        console.log(`  Deleted ${snapshot.size} expired ${tag} posts`);
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

    console.log(`Cleanup complete!`);

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