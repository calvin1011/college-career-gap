import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  updateDoc,
  arrayUnion,
  runTransaction,
  increment,
  addDoc,
  serverTimestamp,
  Transaction,
  arrayRemove,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Channel, Major, SUPPORTED_MAJORS, Message, User } from '@/types';
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
        
        console.log(`✅ Channel ${major} seeded with welcome messages`);
      }
    } catch (error) {
      console.error(`Error seeding channel ${major}:`, error);
    }
  }
}

/**
 * Updates a user's profile information and optionally uploads a new profile picture.
 */
export async function updateUserProfile(
  userId: string,
  profileData: { displayName: string; major: string; graduationYear: string; university: string; },
  profilePic: File | null
) {
  const userRef = doc(db, 'users', userId);
  let avatarUrl = undefined;

  // upload new profile picture if one is provided
  if (profilePic) {
    const storageRef = ref(storage, `avatars/${userId}/${profilePic.name}`);
    const snapshot = await uploadBytes(storageRef, profilePic);
    avatarUrl = await getDownloadURL(snapshot.ref);
    toast.success('Profile picture uploaded!');
  }

  // prepare the data to be updated in Firestore
  const updatedData: Partial<User> & { profile: Partial<User['profile']> } = {
    displayName: profileData.displayName,
    major: profileData.major,
    profile: {
      graduationYear: profileData.graduationYear
        ? parseInt(profileData.graduationYear, 10)
        : undefined,
      university: profileData.university,
    },
    lastActiveAt: serverTimestamp(),
  };

  // Only add avatar to update if a new one was uploaded
  if (avatarUrl) {
    updatedData.profile.avatar = avatarUrl;

  // Update the user document
  await updateDoc(userRef, updatedData as any);

  if (profileData.major) {
      const channel = await findChannelByMajor(profileData.major as Major);
      if (channel) {
        await joinChannel(channel.id, userId);
      }
    }
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
  content: string
): Promise<Message> {
  const channelRef = doc(db, 'channels', channelId);
  const messagesRef = collection(db, 'messages');

  try {
    // sanitize the message content before posting
    const sanitizedContent = sanitizeMessageContent(content);

    const newMessageRef = doc(messagesRef);

    await runTransaction(db, async (transaction: Transaction) => {
      // get the current channel data
      const channelDoc = await transaction.get(channelRef);
      if (!channelDoc.exists()) {
        throw new Error('Channel does not exist!');
      }

      // create the new message object
      const newMessage: Omit<Message, 'id'> = {
        channelId,
        authorId,
        content: sanitizedContent,
        type: 'text',
        reactions: {},
        isPinned: false,
        isEdited: false,
        createdAt: serverTimestamp() as any, // Let the server set the timestamp
      };

      // automically create the message and update the channel
      transaction.set(newMessageRef, newMessage);
      transaction.update(channelRef, {
        messageCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    });

    // after the transaction is successful, return the newly created message
    return {
      id: newMessageRef.id,
      ...(await getDoc(newMessageRef)).data(),
    } as Message;
  } catch (error: any) {
    console.error('Error posting message:', error);
    toast.error(error.message || 'Failed to post message.');
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
      const userData = userDoc.data();
      
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
  } catch (error: any) {
    console.error('Error joining channel:', error);
    
    if (error.message.includes("already a member")) {
      toast.error("You're already a member of this channel!");
    } else {
      toast.error('Failed to join channel. Please try again.');
    }
    
    throw error;
  }
}