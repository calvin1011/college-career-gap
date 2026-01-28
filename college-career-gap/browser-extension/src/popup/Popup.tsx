import React, { useEffect, useState } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ExtensionUser, Channel, SubChannel, MessageTag } from '../shared/types';
import '../content/content.css';

const TAGS: { id: MessageTag; label: string; requiresExpiration?: boolean }[] = [
  { id: 'general', label: 'General' },
  { id: 'announcement', label: 'Announcement' },
  { id: 'opportunity', label: 'Opportunity' },
  { id: 'resource', label: 'Resource' },
  { id: 'event', label: 'Event', requiresExpiration: true },
  { id: 'internship', label: 'Internship', requiresExpiration: true },
  { id: 'full-time', label: 'Full Time', requiresExpiration: true },
  { id: 'scholarship', label: 'Scholarship', requiresExpiration: true },
];

export default function Popup() {
  const [user, setUser] = useState<ExtensionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [subChannels, setSubChannels] = useState<SubChannel[]>([]);

  const [selectedChannel, setSelectedChannel] = useState('');
  const [selectedSubChannel, setSelectedSubChannel] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<MessageTag[]>([]);
  const [tagExpirations, setTagExpirations] = useState<Record<string, string>>({});
  const [scheduledDate, setScheduledDate] = useState('');

  const [pageData, setPageData] = useState({
    url: '',
    title: '',
    description: ''
  });

  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL
        });
        loadChannels(currentUser.uid);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.runtime.sendMessage({ type: 'GET_PAGE_INFO' }, (response) => {
          if (response && !response.error) {
            setPageData({
              url: response.url || '',
              title: response.title || '',
              description: response.description || ''
            });

            setContent(`${response.title}\n\n${response.url}`);
          }
        });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchSubChannels() {
      if (!selectedChannel) {
        setSubChannels([]);
        return;
      }

      const db = getFirestore();
      try {
        const subChannelsRef = collection(db, 'channels', selectedChannel, 'subchannels');
        const snapshot = await getDocs(subChannelsRef);
        const subs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SubChannel[];
        setSubChannels(subs);
      } catch (error) {
        console.error("Error loading subchannels", error);
      }
    }
    fetchSubChannels();
    setSelectedSubChannel('');
  }, [selectedChannel]);

  const loadChannels = async (userId: string) => {
    const db = getFirestore();
    try {

      const channelsRef = collection(db, 'channels');
      const q = query(channelsRef);
      const snapshot = await getDocs(q);
      const loadedChannels = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || doc.id,
        slug: doc.data().slug || doc.id
      })) as Channel[];
      setChannels(loadedChannels);
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  const handleShare = async () => {
    if (!selectedChannel || !content) return;
    setStatus('saving');

    const db = getFirestore();

    try {

      const expirations: Record<string, Timestamp> = {};
      Object.entries(tagExpirations).forEach(([tag, dateStr]) => {
        if (dateStr) {
          expirations[tag] = Timestamp.fromDate(new Date(dateStr));
        }
      });

      const commonData = {
        content,
        tags: selectedTags,
        tagExpirations: expirations,
        channelId: selectedChannel,
        subChannelId: selectedSubChannel || null,
        authorId: user?.uid,
        authorName: user?.displayName,
        authorPhoto: user?.photoURL,
        linkUrl: pageData.url,
        linkTitle: pageData.title,
        linkDescription: pageData.description,
      };

      if (scheduledDate) {
        await addDoc(collection(db, 'scheduled_posts'), {
          ...commonData,
          scheduledFor: Timestamp.fromDate(new Date(scheduledDate)),
          createdAt: serverTimestamp(),
          status: 'pending'
        });
      } else {

        await addDoc(collection(db, 'channels', selectedChannel, 'messages'), {
          ...commonData,
          createdAt: serverTimestamp(),
          likes: [],
          reactions: {},
          replyCount: 0
        });
      }

      setStatus('success');
      setTimeout(() => window.close(), 1500);

      chrome.runtime.sendMessage({
        type: 'SHARE_SUCCESS',
        data: { channelName: channels.find(c => c.id === selectedChannel)?.name }
      });

    } catch (error) {
      console.error('Share failed:', error);
      setStatus('error');
    }
  };

  const toggleTag = (tagId: MessageTag) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(prev => prev.filter(t => t !== tagId));

      const newExps = { ...tagExpirations };
      delete newExps[tagId];
      setTagExpirations(newExps);
    } else {
      setSelectedTags(prev => [...prev, tagId]);
    }
  };

  if (loading) return <div className="p-8 flex justify-center">Loading...</div>;

  if (!user) {
    return (
      <div className="w-[350px] p-6 text-center">
        <h2 className="text-xl font-bold mb-4">College Career Gap</h2>
        <p className="mb-6 text-gray-600">Please sign in to share resources.</p>
        <button
          onClick={() => {

             chrome.tabs.create({ url: 'https://collegecareergap.com/login' });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg w-full"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="w-[400px] h-[300px] flex flex-col items-center justify-center text-green-600">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        <h3 className="text-xl font-bold">Shared Successfully!</h3>
      </div>
    );
  }

  return (
    <div className="w-[400px] p-4 bg-gray-50 min-h-[500px]">
      <header className="flex justify-between items-center mb-4 pb-4 border-b">
        <h1 className="font-bold text-gray-800">Quick Share</h1>
        <button onClick={() => signOut(getAuth())} className="text-xs text-red-500 hover:underline">
          Sign Out
        </button>
      </header>

      <div className="space-y-4">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="w-full p-2 border rounded-md text-sm bg-white"
          >
            <option value="">Select a channel...</option>
            {channels.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {subChannels.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sub-channel (Optional)</label>
            <select
              value={selectedSubChannel}
              onChange={(e) => setSelectedSubChannel(e.target.value)}
              className="w-full p-2 border rounded-md text-sm bg-white"
            >
              <option value="">General</option>
              {subChannels.map(sc => (
                <option key={sc.id} value={sc.id}>{sc.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full p-2 border rounded-md text-sm font-sans"
            placeholder="What would you like to share?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
          <div className="flex flex-wrap gap-2">
            {TAGS.map(tag => {
              const isSelected = selectedTags.includes(tag.id);
              const needsExpiration = tag.requiresExpiration && isSelected;

              return (
                <div key={tag.id} className={`flex items-center rounded-md border ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                  <button
                    onClick={() => toggleTag(tag.id)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      isSelected ? 'text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tag.label}
                  </button>

                  {/* Expiration Input for specific tags */}
                  {needsExpiration && (
                    <input
                      type="date"
                      className="text-xs border-l border-blue-200 bg-transparent py-1 px-2 text-gray-600 focus:outline-none"
                      title={`${tag.label} Expiration Date`}
                      value={tagExpirations[tag.id] || ''}
                      onChange={(e) => setTagExpirations(prev => ({
                        ...prev,
                        [tag.id]: e.target.value
                      }))}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t">
          <label className="flex items-center text-sm font-medium text-gray-700 gap-2 mb-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            Schedule Post (Optional)
          </label>
          <input
            type="datetime-local"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full p-2 border rounded-md text-sm"
          />
        </div>

        <div className="pt-4 flex gap-3">
          <button
            onClick={() => window.close()}
            className="flex-1 px-4 py-2 border rounded-md text-sm hover:bg-gray-50 text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={!selectedChannel || !content || status === 'saving'}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'saving' ? 'Sharing...' : scheduledDate ? 'Schedule Post' : 'Share Now'}
          </button>
        </div>
      </div>
    </div>
  );
}