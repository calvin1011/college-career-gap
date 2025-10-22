import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  runTransaction,
  increment,
  addDoc,
  serverTimestamp,
  Transaction,
  writeBatch
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {Channel, Major, SUPPORTED_MAJORS, Message, User, LinkPreview, MessageTag} from '@/types';
import toast from 'react-hot-toast';
import { db } from '@/services/firebase/config';
import { sanitizeMessageContent } from '@/utils/validation';
import app from '@/services/firebase/config';

const storage = getStorage(app);

// Seed messages for each major
const SEED_MESSAGES = {
  'Business': [
    {
      content: "Welcome to the Business channel! 🏢 This is where you'll find career resources, internship opportunities, and networking tips for business students.",
      type: 'text' as const,
      isPinned: true
    },
    {
      content: "Check out these essential business podcasts: Harvard Business Review IdeaCast, Masters in Business by Bloomberg, and The McKinsey Podcast. Great for staying current with industry trends!",
      type: 'text' as const,
      isPinned: false
    },
    {
      content: "LinkedIn Learning has excellent courses on Excel, PowerPoint, and business analytics. Your .edu email gives you free access!",
      type: 'text' as const,
      isPinned: false
    }
  ],
  'Computer Science': [
    {
      content: "Welcome to Computer Science! 💻 Here you'll find programming resources, tech job opportunities, and industry insights to boost your career.",
      type: 'text' as const,
      isPinned: true
    },
    {
      content: "Must-follow tech podcasts: Software Engineering Daily, CodeNewbie Podcast, and The Changelog. Perfect for your commute or study breaks!",
      type: 'text' as const,
      isPinned: false
    },
    {
      content: "Free coding practice: LeetCode, HackerRank, and Codewars. Start with easy problems and work your way up. Consistency beats perfection!",
      type: 'text' as const,
      isPinned: false
    }
  ],
  'Biology': [
    {
      content: "Welcome to Biology! 🧬 Discover research opportunities, graduate school tips, and career paths in the life sciences.",
      type: 'text' as const,
      isPinned: true
    },
    {
      content: "Great science podcasts: Nature Podcast, Science Magazine Podcast, and Radiolab. Stay curious and keep learning!",
      type: 'text' as const,
      isPinned: false
    },
    {
      content: "Research experience is crucial! Check UREC (Undergraduate Research Experience Center) and talk to professors about lab opportunities.",
      type: 'text' as const,
      isPinned: false
    }
  ],
  'Chemistry': [
    {
      content: "Welcome to Chemistry! ⚗️ Find lab opportunities, graduate school advice, and career resources in chemical sciences.",
      type: 'text' as const,
      isPinned: true
    },
    {
      content: "Chemistry careers extend far beyond academia! Consider pharmaceutical companies, materials science, environmental consulting, and forensics.",
      type: 'text' as const,
      isPinned: false
    }
  ],
  'Psychology': [
    {
      content: "Welcome to Psychology! 🧠 Explore research opportunities, graduate school preparation, and diverse career paths in psychology.",
      type: 'text' as const,
      isPinned: true
    },
    {
      content: "Psychology careers are diverse: clinical psychology, research, HR, UX design, marketing, and social work. Keep an open mind about possibilities!",
      type: 'text' as const,
      isPinned: false
    }
  ],
  'Kinesiology': [
    {
      content: "Welcome to Kinesiology! 🏃‍♂️ Discover opportunities in sports medicine, physical therapy, fitness, and health promotion.",
      type: 'text' as const,
      isPinned: true
    },
    {
      content: "Consider these career paths: physical therapy, athletic training, occupational therapy, sports psychology, and health coaching.",
      type: 'text' as const,
      isPinned: false
    }
  ]
};

export async function deleteUserAccount(user: User): Promise<void> {
  const batch = writeBatch(db);

  // Remove user from each channel's member list
  if (user.joinedChannels && user.joinedChannels.length > 0) {
    for (const channelId of user.joinedChannels) {
      const channelRef = doc(db, 'channels', channelId);
      batch.update(channelRef, {
        members: arrayRemove(user.uid),
        memberCount: increment(-1),
      });
    }
  }

  // Delete the user's document
  const userRef = doc(db, 'users', user.uid);
  batch.delete(userRef);

  // Commit all batched writes
  await batch.commit();
}

/**
 * Creates seed messages for a channel
 */
async function createSeedMessages(channelId: string, channelName: string) {
  const seedMessages = SEED_MESSAGES[channelName as keyof typeof SEED_MESSAGES];
  if (!seedMessages) return;

  const messagesRef = collection(db, 'messages');

  for (let i = 0; i < seedMessages.length; i++) {
    const messageData = {
      ...seedMessages[i],
      channelId,
      authorId: 'system', // System-generated messages
      reactions: {},
      isEdited: false,
      createdAt: serverTimestamp(),
      metadata: {
        tags: ['welcome', 'resources']
      }
    };

    await addDoc(messagesRef, messageData);

    // Add small delay to ensure proper ordering
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Update channel message count
  await updateDoc(doc(db, 'channels', channelId), {
    messageCount: increment(seedMessages.length)
  });
}

/**
 * Seeds the predefined major channels if they don't exist in Firestore.
 */
export async function seedChannels() {
  const channelsRef = collection(db, 'channels');

  for (const major of SUPPORTED_MAJORS) {
    const slug = major.toLowerCase().replace(/\s/g, '-');
    const channelDocRef = doc(channelsRef, slug);

    try {
      const channelDoc = await getDoc(channelDocRef);

      if (!channelDoc.exists()) {
        console.log(`Seeding channel for ${major}...`);
        const newChannel: Omit<Channel, 'id'> = {
          name: major,
          slug,
          description: `Career resources and guidance for ${major} students.`,
          majorCode: major.split(' ').map(word => word[0]).join('').toUpperCase(),
          color: '#3B82F6',
          admins: [],
          memberCount: 0,
          messageCount: 0,
          inviteCode: `${major.split(' ').map(word => word[0]).join('').toUpperCase()}_INVITE`,
          settings: {
            allowReactions: true,
            maxMessageLength: 2000,
            autoModeration: false,
          },
          members: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await setDoc(channelDocRef, newChannel);

        // Create seed messages for the channel
        await createSeedMessages(slug, major);

        console.log(` Channel ${major} seeded with welcome messages`);
      }
    } catch (error) {
      console.error(`Error seeding channel ${major}:`, error);
    }
  }
}

/**
 * Removes a user from a specific channel.
 */
export async function leaveChannel(channelId: string, userId: string) {
  try {
    const channelRef = doc(db, 'channels', channelId);
    const userRef = doc(db, 'users', userId);

    await runTransaction(db, async (transaction) => {
      const channelDoc = await transaction.get(channelRef);
      const userDoc = await transaction.get(userRef);

      if (!channelDoc.exists()) {
        throw new Error("Channel does not exist!");
      }

      if (!userDoc.exists()) {
        throw new Error("User does not exist!");
      }

      const channelData = channelDoc.data() as Channel;

      // Check if user is a member
      if (!channelData.members?.includes(userId)) {
        throw new Error("You're not a member of this channel!");
      }

      // Atomically remove the user from the channel and update the member count
      transaction.update(channelRef, {
        members: arrayRemove(userId),
        memberCount: increment(-1),
        updatedAt: serverTimestamp()
      });

      // Atomically remove the channel from the user's joined channels
      transaction.update(userRef, {
        joinedChannels: arrayRemove(channelId),
        lastActiveAt: serverTimestamp()
      });
    });

    toast.success(`You've left the ${channelId.replace('-', ' ')} channel.`);
  } catch (error: unknown) {
    console.error('Error leaving channel:', error);
    toast.error((error as Error).message || 'Failed to leave channel. Please try again.');
    throw error;
  }
}

/**
 * Atomically updates a user's profile and handles changing their major channel.
 * This includes leaving the old channel and joining the new one.
 */
export async function updateUserProfileAndMajor(
  userId: string,
  profileData: {
    displayName: string;
    major: string;
    graduationYear: string;
    university: string;
  },
  profilePic: File | null
) {
  const userRef = doc(db, 'users', userId);
  const newMajor = profileData.major as Major;
  let avatarUrl: string | undefined = undefined;

  if (profilePic) {
    const storageRef = ref(storage, `avatars/${userId}`);
    toast.loading('Uploading picture...');
    const snapshot = await uploadBytes(storageRef, profilePic);
    avatarUrl = await getDownloadURL(snapshot.ref);
    toast.dismiss();
  }

  return runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("User not found!");

    const currentUserData = userDoc.data() as User;
    const oldMajor = currentUserData.major as Major;

    const majorHasChanged = oldMajor !== newMajor;

    // Handle leaving old channels
    const channelsToLeave: string[] = [];
    if (majorHasChanged && oldMajor) {
      const oldChannel = await findChannelByMajor(oldMajor);
      if (oldChannel) channelsToLeave.push(oldChannel.id);
    }

    // Remove from old channels
    for (const channelId of channelsToLeave) {
      const channelRef = doc(db, 'channels', channelId);
      transaction.update(channelRef, {
        members: arrayRemove(userId),
        memberCount: increment(-1),
      });
    }

    // Get new channels to join
    const newChannel = await findChannelByMajor(newMajor);
    if (!newChannel) throw new Error(`Channel for major "${newMajor}" not found.`);

    const channelsToJoin = [newChannel.id];

    // Join new channels
    for (const channelId of channelsToJoin) {
      const channelRef = doc(db, 'channels', channelId);
      transaction.update(channelRef, {
        members: arrayUnion(userId),
        memberCount: increment(1),
      });
    }

    // Update user document
    const userUpdateData: { [key: string]: unknown } = {
      displayName: profileData.displayName,
      major: newMajor,
      'profile.university': profileData.university,
      lastActiveAt: serverTimestamp(),
      joinedChannels: channelsToJoin,
    };

    if (profileData.graduationYear) {
      userUpdateData['profile.graduationYear'] = parseInt(profileData.graduationYear, 10);
    }

    if (avatarUrl) {
      userUpdateData['profile.avatar'] = avatarUrl;
    }

    transaction.update(userRef, userUpdateData);

    return newChannel;
  });
}
/**
 * Joins a user to their major's channel, with improved error handling.
 */
export async function joinMajorChannel(userId: string, major: Major): Promise<boolean> {
  try {
    console.log(`Attempting to join ${major} channel for user ${userId}`);

    // Get user document to check if they're already in the channel
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.error("User document not found");
      return false;
    }

    const userData = userDoc.data() as User;

    // Find the channel for the major
    const channel = await findChannelByMajor(major);

    if (!channel) {
      console.error(`Channel for major ${major} not found`);
      return false;
    }

    // Check if user is already a member of this channel
    if (userData.joinedChannels?.includes(channel.id)) {
      console.log(`User is already a member of the ${major} channel`);
      return true; // Already joined, consider it a success
    }

    console.log(`Joining channel ${channel.id} for user ${userId}`);

    // Try to join the channel
    try {
      await joinChannel(channel.id, userId);
      console.log(`Successfully joined channel ${channel.id}`);
      return true;
    } catch (joinError) {
      console.error("Error joining channel:", joinError);

      // If joining fails, try a manual update as fallback
      try {
        console.log("Attempting manual channel join as fallback...");

        const channelRef = doc(db, 'channels', channel.id);

        // Update user document to include the channel
        await updateDoc(userRef, {
          joinedChannels: arrayUnion(channel.id),
          lastActiveAt: serverTimestamp()
        });

        // Update channel document to include the user
        await updateDoc(channelRef, {
          members: arrayUnion(userId),
          memberCount: increment(1),
          updatedAt: serverTimestamp()
        });

        console.log("Manual channel join successful");
        return true;
      } catch (fallbackError) {
        console.error("Fallback join attempt failed:", fallbackError);
        return false;
      }
    }
  } catch (error) {
    console.error("Error in joinMajorChannel:", error);
    return false;
  }
}

/**
 * Extracts the first URL from a string.
 */
const extractUrl = (text: string): string | null => {
  const urlRegex = /(https?:\/\/[^\s]+)/;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
};

/**
 * Fetches link preview metadata from our API route.
 */
const getLinkPreview = async (url: string): Promise<LinkPreview | null> => {
  try {
    const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return { ...data, url };
  } catch (error) {
    console.error("Failed to fetch link preview:", error);
    return null;
  }
};



/**
 * Toggles a user's reaction on a message.
 * Adds the reaction if the user hasn't reacted with that emoji yet,
 * and removes it if they have.
 */
export async function toggleReaction(messageId: string, emoji: string, userId: string) {
  const messageRef = doc(db, 'messages', messageId);

  try {
    await runTransaction(db, async (transaction) => {
      const messageDoc = await transaction.get(messageRef);
      if (!messageDoc.exists()) {
        throw new Error("Message not found");
      }

      const messageData = messageDoc.data();
      const reactions = messageData.reactions || {};
      const usersForEmoji: string[] = reactions[emoji] || [];

      // Check if the user has already reacted with this emoji
      if (usersForEmoji.includes(userId)) {
        // Atomically remove the user's ID from the array
        transaction.update(messageRef, {
          [`reactions.${emoji}`]: arrayRemove(userId)
        });
      } else {
        // Atomically add the user's ID to the array
        transaction.update(messageRef, {
          [`reactions.${emoji}`]: arrayUnion(userId)
        });
      }
    });
  } catch (error) {
    console.error("Error toggling reaction:", error);
    toast.error("Failed to update reaction.");
    throw error;
  }
}

/**
 * Fetches all available channels from Firestore.
 */
export async function getChannels(): Promise<Channel[]> {
  const channelsRef = collection(db, 'channels');
  const snapshot = await getDocs(channelsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Channel));
}

/**
 * Finds a channel by its major name.
 */
export async function findChannelByMajor(major: Major): Promise<Channel | null> {
  const slug = major.toLowerCase().replace(/\s/g, '-');
  const channelRef = doc(db, 'channels', slug);
  const docSnap = await getDoc(channelRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Channel;
  }
  return null;
}

/**
 * Finds a channel by its slug.
 */
export async function findChannelBySlug(slug: string): Promise<Channel | null> {
  const channelRef = doc(db, 'channels', slug);
  const docSnap = await getDoc(channelRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Channel;
  }
  return null;
}

/**
 * Posts a new message to a channel. (Admin only)
 */
export async function postMessage(
  channelId: string,
  authorId: string,
  content: string,
  tags: MessageTag[] = [],
  subChannel?: string
): Promise<Message> {
  const channelRef = doc(db, 'channels', channelId);
  const messagesRef = collection(db, 'messages');

  try {
    const sanitizedContent = sanitizeMessageContent(content);
    const url = extractUrl(sanitizedContent);
    let linkPreview: LinkPreview | null = null;

    // Check for a URL and fetch its preview
    if (url) {
      toast.loading('Generating link preview...');
      linkPreview = await getLinkPreview(url);
      toast.dismiss();
    }

    const newMessageRef = doc(messagesRef);

    await runTransaction(db, async (transaction: Transaction) => {
      const channelDoc = await transaction.get(channelRef);
      if (!channelDoc.exists()) {
        throw new Error('Channel does not exist!');
      }

      // Create the new message object with tags and subChannel
      const newMessage: Omit<Message, 'id'> = {
        channelId,
        authorId,
        content: sanitizedContent,
        type: url ? 'link' : 'text',
        reactions: {},
        isPinned: false,
        isEdited: false,
        createdAt: serverTimestamp(),
        ...(subChannel ? { subChannel } : {}),
        metadata: {
          ...(linkPreview ? { links: [linkPreview] } : {}),
          ...(tags.length > 0 ? { tags } : {})
        },
      };

      transaction.set(newMessageRef, newMessage);
      transaction.update(channelRef, {
        messageCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    });

    const newMessageDoc = await getDoc(newMessageRef);
    return {
      id: newMessageDoc.id,
      ...newMessageDoc.data(),
    } as Message;
  } catch (error: unknown) {
    console.error('Error posting message:', error);
    toast.error((error as Error).message || 'Failed to post message.');
    throw error;
  }
}

/**
 * Updates an existing message's content, tags, and sub-channel. (Admin only)
 * This will also regenerate the link preview if the URL has changed.
 */
export async function updateMessage(
  messageId: string,
  newContent: string,
  tags: MessageTag[] = [],
  subChannel?: string
): Promise<void> {
  const messageRef = doc(db, 'messages', messageId);

  try {
    const sanitizedContent = sanitizeMessageContent(newContent);
    const url = extractUrl(sanitizedContent);
    let linkPreview: LinkPreview | null = null;

    if (url) {
      toast.loading('Checking for link preview...');
      linkPreview = await getLinkPreview(url);
      toast.dismiss();
    }

    const updateData: { [key: string]: unknown } = {
      content: sanitizedContent,
      isEdited: true,
      editedAt: serverTimestamp(),
      type: url ? 'link' : 'text',
      metadata: {
        ...(linkPreview ? { links: [linkPreview] } : {}),
        ...(tags.length > 0 ? { tags } : {})
      },
    };

    // Add or remove subChannel based on whether it's provided
    if (subChannel) {
      updateData.subChannel = subChannel;
    } else {
      // If subChannel is empty, remove it from the document
      updateData.subChannel = null;
    }

    await updateDoc(messageRef, updateData);
  } catch (error: unknown) {
    console.error('Error updating message:', error);
    toast.error((error as Error).message || 'Failed to update message.');
    throw error;
  }
}

/**
 * Toggles the 'isPinned' status of a message. (Admin only)
 */
export async function togglePinMessage(messageId: string, currentStatus: boolean): Promise<void> {
  try {
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
      isPinned: !currentStatus,
      updatedAt: serverTimestamp(),
    });
    toast.success(`Message ${!currentStatus ? 'pinned' : 'unpinned'} successfully!`);
  } catch (error) {
    console.error('Error toggling pin status:', error);
    toast.error('Failed to update message pin status.');
    throw error;
  }
}

/**
 * Deletes a message and decrements the channel's message count. (Admin only)
 */
export async function deleteMessage(channelId: string, messageId: string): Promise<void> {
  const messageRef = doc(db, 'messages', messageId);
  const channelRef = doc(db, 'channels', channelId);

  try {
    await runTransaction(db, async (transaction) => {
      // Ensure the message exists before trying to delete
      const messageDoc = await transaction.get(messageRef);
      if (!messageDoc.exists()) {
        throw new Error("Message not found.");
      }

      // Atomically delete the message and decrement the channel's message count
      transaction.delete(messageRef);
      transaction.update(channelRef, {
        messageCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    });
    toast.success('Message deleted successfully.');
  } catch (error) {
    console.error('Error deleting message:', error);
    toast.error('Failed to delete message.');
    throw error;
  }
}

/**
 * Joins a user to a specific channel.
 */
export async function joinChannel(channelId: string, userId: string) {
  try {
    const channelRef = doc(db, 'channels', channelId);
    const userRef = doc(db, 'users', userId);

    await runTransaction(db, async (transaction) => {
      const channelDoc = await transaction.get(channelRef);
      const userDoc = await transaction.get(userRef);

      if (!channelDoc.exists()) {
        throw new Error("Channel does not exist!");
      }

      if (!userDoc.exists()) {
        throw new Error("User does not exist!");
      }

      const channelData = channelDoc.data() as Channel;
      // const userData = userDoc.data();

      // Check if user is already a member
      if (channelData.members?.includes(userId)) {
        throw new Error("You're already a member of this channel!");
      }

      // Atomically add the user to the channel and update the member count
      transaction.update(channelRef, {
        members: arrayUnion(userId),
        memberCount: increment(1),
        updatedAt: serverTimestamp()
      });

      // Atomically add the channel to the user's joined channels
      transaction.update(userRef, {
        joinedChannels: arrayUnion(channelId),
        lastActiveAt: serverTimestamp()
      });
    });

    toast.success(`Welcome to ${channelId.replace('-', ' ')} channel! 🎉`);
  } catch (error: unknown) {
    console.error('Error joining channel:', error);

    if ((error as Error).message.includes("already a member")) {
      toast.error("You're already a member of this channel!");
    } else {
      toast.error('Failed to join channel. Please try again.');
    }

    throw error;
  }
}