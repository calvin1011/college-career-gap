import React, { useEffect, useState } from 'react';
import {
  createMessage,
  ensureValidSession,
  fetchAdminChannels,
  fetchAllChannels,
  fetchUserProfile,
  signInExtension,
  signOutExtension,
  StoredSession,
} from '../shared/firebase';
import { Channel, ExtensionUser, MessageTag } from '../shared/types';
import '../content/content.css';

const TAGS: { id: MessageTag; label: string; requiresExpiration?: boolean }[] = [
  { id: 'graduate', label: 'Graduate' },
  { id: 'undergrad', label: 'Undergrad' },
  { id: 'podcast', label: 'Podcast' },
  { id: 'advice-tip', label: 'Advice/Tips' },
  { id: 'event', label: 'Event', requiresExpiration: true },
  { id: 'internship', label: 'Internship', requiresExpiration: true },
  { id: 'full-time', label: 'Full Time', requiresExpiration: true },
  { id: 'scholarship', label: 'Scholarship', requiresExpiration: true },
];

const EXPIRING_TAGS = new Set<MessageTag>(['event', 'internship', 'full-time', 'scholarship']);

export default function Popup() {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [user, setUser] = useState<ExtensionUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [subChannels, setSubChannels] = useState<string[]>([]);

  const [selectedChannel, setSelectedChannel] = useState('');
  const [selectedSubChannel, setSelectedSubChannel] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<MessageTag[]>([]);
  const [expirationDate, setExpirationDate] = useState('');

  const [pageData, setPageData] = useState({
    url: '',
    title: '',
    description: ''
  });

  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  useEffect(() => {
    async function bootstrapAuth() {
      try {
        const existingSession = await ensureValidSession();
        if (!existingSession) {
          setLoading(false);
          return;
        }

        setSession(existingSession);
        const profile = await fetchUserProfile(existingSession);
        if (!profile) {
          setLoading(false);
          return;
        }

        const adminChannels = await fetchAdminChannels(existingSession);
        const hasAdminAccess = profile.role === 'admin' || adminChannels.length > 0;

        if (!hasAdminAccess) {
          setAuthError('Admin access is required to use this extension.');
          await signOutExtension();
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        const channelList =
          profile.role === 'admin'
            ? mergeChannels(adminChannels, await fetchAllChannels(existingSession))
            : adminChannels;

        setChannels(channelList.sort((a, b) => a.name.localeCompare(b.name)));
        setUser({
          uid: profile.uid,
          email: profile.email,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
          role: profile.role,
        });
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setLoading(false);
      }
    }

    bootstrapAuth();

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
  }, []);

  useEffect(() => {
    if (!selectedChannel) {
      setSubChannels([]);
      return;
    }

    const channel = channels.find((item) => item.id === selectedChannel);
    setSubChannels(channel?.subChannels || []);
    setSelectedSubChannel('');
  }, [selectedChannel, channels]);

  const handleLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);

    try {
      const newSession = await signInExtension(loginForm.email.trim(), loginForm.password);
      setSession(newSession);
      const profile = await fetchUserProfile(newSession);
      if (!profile) {
        throw new Error('Unable to load profile.');
      }

      const adminChannels = await fetchAdminChannels(newSession);
      const hasAdminAccess = profile.role === 'admin' || adminChannels.length > 0;

      if (!hasAdminAccess) {
        setAuthError('Admin access is required to use this extension.');
        await signOutExtension();
        setSession(null);
        setUser(null);
        return;
      }

      const channelList =
        profile.role === 'admin'
          ? mergeChannels(adminChannels, await fetchAllChannels(newSession))
          : adminChannels;

      setChannels(channelList.sort((a, b) => a.name.localeCompare(b.name)));
      setUser({
        uid: profile.uid,
        email: profile.email,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        role: profile.role,
      });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign in failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedChannel || !content.trim() || !session || !user) return;
    setStatus('saving');

    try {
      const activeChannel = channels.find((channel) => channel.id === selectedChannel);
      const hasExpiringTag = selectedTags.some((tag) => EXPIRING_TAGS.has(tag));
      let expiresAt: Date | undefined;

      if (hasExpiringTag) {
        if (expirationDate) {
          expiresAt = new Date(expirationDate);
        } else {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
        }
      }

      const linkData = pageData.url
        ? {
            url: pageData.url,
            title: pageData.title,
            description: pageData.description,
          }
        : undefined;

      await createMessage(session, {
        channelId: selectedChannel,
        authorId: user.uid,
        authorDisplayName: user.displayName,
        authorAvatar: user.photoURL,
        content: content.trim(),
        tags: selectedTags,
        subChannel: selectedSubChannel || null,
        expiresAt,
        link: linkData,
        currentMessageCount: activeChannel?.messageCount,
      });

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
    } else {
      setSelectedTags(prev => [...prev, tagId]);
    }
  };

  const handleSignOut = async () => {
    await signOutExtension();
    setSession(null);
    setUser(null);
    setChannels([]);
    setSelectedChannel('');
    setSelectedSubChannel('');
  };

  const hasExpiringTag = selectedTags.some((tag) => EXPIRING_TAGS.has(tag));

  if (loading) return <div className="p-8 flex justify-center">Loading...</div>;

  if (!user) {
    return (
      <div className="w-[350px] p-6 text-center space-y-4">
        <h2 className="text-xl font-bold">College Career Gap</h2>
        <p className="text-gray-600 text-sm">Admin sign-in required to share resources.</p>
        <div className="space-y-3 text-left">
          <input
            type="email"
            placeholder="Admin email"
            className="w-full p-2 border rounded-md text-sm"
            value={loginForm.email}
            onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-2 border rounded-md text-sm"
            value={loginForm.password}
            onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
          />
        </div>
        {authError && <p className="text-xs text-red-600">{authError}</p>}
        <button
          onClick={handleLogin}
          disabled={authLoading || !loginForm.email || !loginForm.password}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg w-full disabled:opacity-60"
        >
          {authLoading ? 'Signing in...' : 'Sign In'}
        </button>
        <button
          onClick={() => chrome.tabs.create({ url: 'https://collegecareergap.com/login' })}
          className="text-xs text-blue-600 hover:underline"
        >
          Open full login page
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
        <button onClick={handleSignOut} className="text-xs text-red-500 hover:underline">
          Sign Out
        </button>
      </header>

      <div className="space-y-4">
        {channels.length === 0 && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md p-3">
            No admin channels found for this account. Ask a super admin to grant channel access.
          </div>
        )}

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
              {subChannels.map((subChannel) => (
                <option key={subChannel} value={subChannel}>{subChannel}</option>
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
                </div>
              );
            })}
          </div>
        </div>

        {hasExpiringTag && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiration Date (Optional)
            </label>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-gray-500 mt-1">Defaults to 7 days if left blank.</p>
          </div>
        )}

        <div className="pt-4 flex gap-3">
          <button
            onClick={() => window.close()}
            className="flex-1 px-4 py-2 border rounded-md text-sm hover:bg-gray-50 text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={!selectedChannel || !content.trim() || status === 'saving' || channels.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'saving' ? 'Sharing...' : 'Share Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

function mergeChannels(primary: Channel[], secondary: Channel[]): Channel[] {
  const merged = new Map<string, Channel>();
  primary.forEach((channel) => merged.set(channel.id, channel));
  secondary.forEach((channel) => merged.set(channel.id, channel));
  return Array.from(merged.values());
}