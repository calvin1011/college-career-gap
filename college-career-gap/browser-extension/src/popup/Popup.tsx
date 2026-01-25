import React, { useState, useEffect } from 'react';
import {
  initializeFirebase,
  getAuthState,
  signInExtension,
  signOutExtension,
  getCachedUser
} from '@extension/shared/firebase';
import { collection, getDocs, addDoc, serverTimestamp, increment, doc, updateDoc } from 'firebase/firestore';
import type { ExtensionUser, ShareData, Channel, MessageTag } from '@extension/shared/types';

// Import MESSAGE_TAGS from main app
const MESSAGE_TAGS: MessageTag[] = [
  'graduate', 'undergrad', 'podcast', 'advice-tip',
  'internship', 'full-time', 'event', 'scholarship'
];

const Popup: React.FC = () => {
  const [user, setUser] = useState<ExtensionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [shareData, setShareData] = useState<ShareData | null>(null);

  // Form state
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<MessageTag[]>([]);
  const [posting, setPosting] = useState(false);

  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');

  // Initialize on mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Check auth state on mount
  useEffect(() => {
    checkAuthState();
  }, []);

  // Get current page data
  useEffect(() => {
    getCurrentPageData();
  }, []);

  // Load channels when user is authenticated
  useEffect(() => {
    if (user) {
      loadChannels();
    }
  }, [user]);

  const initializeApp = () => {
    try {
      initializeFirebase();
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      setError('Failed to connect. Please try again.');
      setLoading(false);
    }
  };

  const checkAuthState = async () => {
    try {
      // First check cached user (fast)
      const cachedUser = await getCachedUser();
      if (cachedUser) {
        setUser(cachedUser as ExtensionUser);
        setLoading(false);
        return;
      }

      // Then check Firebase auth state
      const firebaseUser = await getAuthState();
      if (firebaseUser) {
        const userData: ExtensionUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          major: '', // Will be loaded from Firestore if needed
          role: 'admin', // Extensions are admin-only
        };
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPageData = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        setShareData({
          url: tab.url || '',
          title: tab.title || '',
          description: '', // Could be extracted from meta tags
        });

        // Pre-fill content with title and URL
        setContent(`${tab.title}\n\n${tab.url}`);
      }
    } catch (error) {
      console.error('Failed to get page data:', error);
    }
  };

  const loadChannels = async () => {
    try {
      const { db } = initializeFirebase();

      // Get all channels where user is admin
      const channelsSnapshot = await getDocs(collection(db, 'channels'));
      const allChannels = channelsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Channel[];

      // Filter to only channels where user is admin
      const adminChannels = allChannels.filter(channel =>
        channel.admins?.includes(user?.uid || '')
      );

      setChannels(adminChannels);

      // Auto-select last used channel or first channel
      const lastUsed = await chrome.storage.local.get('lastUsedChannel');
      if (lastUsed.lastUsedChannel && adminChannels.find(c => c.id === lastUsed.lastUsedChannel)) {
        setSelectedChannelId(lastUsed.lastUsedChannel);
      } else if (adminChannels.length > 0) {
        setSelectedChannelId(adminChannels[0].id);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
      setError('Failed to load channels');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSigningIn(true);

    try {
      const firebaseUser = await signInExtension(email, password);
      const userData: ExtensionUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || '',
        major: '',
        role: 'admin',
      };
      setUser(userData);
    } catch (error: any) {
      setError(error.message || 'Sign in failed');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutExtension();
      setUser(null);
      setChannels([]);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const toggleTag = (tag: MessageTag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handlePost = async () => {
    if (!user || !selectedChannelId || !content.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setPosting(true);
    setError('');

    try {
      const { db } = initializeFirebase();

      // Create message
      const newMessage = {
        channelId: selectedChannelId,
        authorId: user.uid,
        authorDisplayName: user.displayName,
        content: content.trim(),
        type: 'link',
        reactions: {},
        isPinned: false,
        isEdited: false,
        clickCount: 0,
        viewCount: 0,
        createdAt: serverTimestamp(),
        metadata: {
          tags: selectedTags,
        }
      };

      await addDoc(collection(db, 'messages'), newMessage);

      // Update channel message count
      const channelRef = doc(db, 'channels', selectedChannelId);
      await updateDoc(channelRef, {
        messageCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      // Save last used channel
      await chrome.storage.local.set({ lastUsedChannel: selectedChannelId });

      // Show success and close popup
      alert('✅ Resource shared successfully!');
      window.close();
    } catch (error: any) {
      console.error('Post failed:', error);
      setError(error.message || 'Failed to share resource');
    } finally {
      setPosting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '12px', color: '#6b7280' }}>Loading...</p>
      </div>
    );
  }

  // Sign in form
  if (!user) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            Sign In to College Career Gap
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Use your .edu email
          </p>
        </div>

        <form onSubmit={handleSignIn}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="professor@university.edu"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '8px 12px',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '6px',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={signingIn}
            style={{
              width: '100%',
              padding: '10px',
              background: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: signingIn ? 'not-allowed' : 'pointer',
              opacity: signingIn ? 0.6 : 1
            }}
          >
            {signingIn ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    );
  }

  // Main share UI
  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '2px' }}>
            Share Resource
          </h2>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>
            {user.displayName}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            padding: '6px 12px',
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Page preview */}
      {shareData && (
        <div style={{
          padding: '12px',
          background: '#f3f4f6',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
            Current Page:
          </p>
          <p style={{ fontSize: '12px', color: '#6b7280', wordBreak: 'break-word' }}>
            {shareData.title}
          </p>
        </div>
      )}

      {/* Channel selector */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
          Channel
        </label>
        <select
          value={selectedChannelId}
          onChange={(e) => setSelectedChannelId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            background: 'white'
          }}
        >
          {channels.length === 0 ? (
            <option value="">No channels available</option>
          ) : (
            channels.map(channel => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Content textarea */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
          Message
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add context or instructions..."
          rows={4}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
      </div>

      {/* Tags */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
          Tags (Optional)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {MESSAGE_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                border: selectedTags.includes(tag) ? '2px solid #16a34a' : '1px solid #d1d5db',
                borderRadius: '6px',
                background: selectedTags.includes(tag) ? '#dcfce7' : 'white',
                color: selectedTags.includes(tag) ? '#15803d' : '#6b7280',
                cursor: 'pointer',
                fontWeight: selectedTags.includes(tag) ? '600' : '400'
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          padding: '8px 12px',
          background: '#fee2e2',
          color: '#991b1b',
          borderRadius: '6px',
          fontSize: '14px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handlePost}
        disabled={posting || !selectedChannelId || !content.trim()}
        style={{
          width: '100%',
          padding: '10px',
          background: posting || !selectedChannelId || !content.trim() ? '#9ca3af' : '#16a34a',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: posting || !selectedChannelId || !content.trim() ? 'not-allowed' : 'pointer'
        }}
      >
        {posting ? 'Sharing...' : 'Share to Students'}
      </button>
    </div>
  );
};

export default Popup;