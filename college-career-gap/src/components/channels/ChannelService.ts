import { db } from '@/services/firebase/config';
import { collection, getDocs, doc, setDoc, query, where, updateDoc, arrayUnion } from 'firebase/firestore';
import { Channel, Major, SUPPORTED_MAJORS } from '@/types';
import toast from 'react-hot-toast';

/**
 * Seeds the predefined major channels if they don't exist in Firestore.
 */
export async function seedChannels() {
  const channelsRef = collection(db, 'channels');

  for (const major of SUPPORTED_MAJORS) {
    const slug = major.toLowerCase().replace(/\s/g, '-');
    const channelDocRef = doc(channelsRef, slug);
    const channelDoc = await getDocs(query(channelsRef, where('slug', '==', slug)));

    if (channelDoc.empty) {
      console.log(`Seeding channel for ${major}...`);
      const newChannel: Omit<Channel, 'id'> = {
        name: major,
        slug,
        description: `Career resources and guidance for ${major} students.`,
        majorCode: major.split(' ').map(word => word[0]).join('').toUpperCase(),
        color: '#3B82F6', // Example color
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
  const docSnap = await getDocs(query(collection(db, 'channels'), where('slug', '==', slug)));
  if (!docSnap.empty) {
    return { id: docSnap.docs[0].id, ...docSnap.docs[0].data() } as Channel;
  }
  return null;
}

/**
 * Joins a user to a specific channel.
 * @param channelId The ID of the channel to join.
 * @param userId The ID of the user joining.
 */
export async function joinChannel(channelId: string, userId: string) {
  try {
    const channelRef = doc(db, 'channels', channelId);
    const userRef = doc(db, 'users', userId);

    await updateDoc(channelRef, {
      members: arrayUnion(userId)
    });

    await updateDoc(userRef, {
      joinedChannels: arrayUnion(channelId)
    });

    toast.success('Joined channel successfully!');
  } catch (error) {
    console.error('Error joining channel:', error);
    toast.error('Failed to join channel.');
  }
}
