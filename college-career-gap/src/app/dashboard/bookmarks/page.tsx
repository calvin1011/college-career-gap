'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useBookmarks } from '@/hooks/useBookmarks';
import { Card, CardContent } from '@/components/ui/Card';
import { Bookmark as BookmarkIcon, Trash2, StickyNote } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Message } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { MessageItem } from '@/components/channels/MessageItem';
import { Timestamp, FieldValue } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { toggleBookmark, addBookmarkNote } from '@/services/BookmarkService';

export default function BookmarksPage() {
  const { user } = useAuth();
  const { bookmarks, loading } = useBookmarks(user?.uid);
  const [messages, setMessages] = useState<Map<string, Message>>(new Map());
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    const fetchMessages = async () => {
      if (bookmarks.length === 0) {
        setLoadingMessages(false);
        return;
      }

      const messageMap = new Map<string, Message>();

      for (const bookmark of bookmarks) {
        try {
          const messageRef = doc(db, 'messages', bookmark.messageId);
          const messageDoc = await getDoc(messageRef);

          if (messageDoc.exists()) {
            messageMap.set(bookmark.messageId, {
              id: messageDoc.id,
              ...messageDoc.data(),
            } as Message);
          }
        } catch (error) {
          console.error(`Error fetching message ${bookmark.messageId}:`, error);
        }
      }

      setMessages(messageMap);
      setLoadingMessages(false);
    };

    fetchMessages();
  }, [bookmarks]);

  const handleRemoveBookmark = async (messageId: string, channelId: string) => {
    if (!user) return;
    
    try {
      await toggleBookmark(user.uid, messageId, channelId, true);
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  const handleSaveNote = async (bookmarkId: string) => {
    try {
      await addBookmarkNote(bookmarkId, noteText);
      setEditingNote(null);
      setNoteText('');
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const formatTimestamp = (timestamp: Date | Timestamp | FieldValue): string => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString();
    }
    return 'Just now';
  };

  if (loading || loadingMessages) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 h-full overflow-y-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BookmarkIcon className="w-8 h-8 text-yellow-600" />
          <h1 className="text-3xl font-bold text-gray-900">My Bookmarks</h1>
        </div>
        <p className="text-gray-600">
          Resources you&#39;ve saved for later ({bookmarks.length})
        </p>
      </div>

      {bookmarks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookmarkIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No bookmarks yet
            </h3>
            <p className="text-gray-500 text-sm">
              Save posts you want to come back to later by clicking the bookmark icon
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((bookmark) => {
            const message = messages.get(bookmark.messageId);

            if (!message) {
              return (
                <Card key={bookmark.id} className="bg-gray-50">
                  <CardContent className="p-4 text-center text-gray-500">
                    <p className="text-sm">This post is no longer available</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBookmark(bookmark.messageId, bookmark.channelId)}
                      className="mt-2 text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove bookmark
                    </Button>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={bookmark.id}>
                <CardContent className="p-4">
                  <MessageItem
                    message={message}
                    user={user}
                    isAdmin={false}
                    moderationLoading={null}
                    onTogglePin={() => {}}
                    onDeleteMessage={() => {}}
                    onEditMessage={() => {}}
                    formatTimestamp={formatTimestamp}
                  />

                  {bookmark.note && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <StickyNote className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700 flex-1">{bookmark.note}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingNote(bookmark.id);
                        setNoteText(bookmark.note || '');
                      }}
                      className="text-gray-600"
                    >
                      <StickyNote className="w-4 h-4 mr-1" />
                      {bookmark.note ? 'Edit note' : 'Add note'}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBookmark(message.id, message.channelId)}
                      className="text-red-600 ml-auto"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>

                  {editingNote === bookmark.id && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add a note about why you saved this..."
                        className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveNote(bookmark.id)}
                        >
                          Save note
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingNote(null);
                            setNoteText('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}