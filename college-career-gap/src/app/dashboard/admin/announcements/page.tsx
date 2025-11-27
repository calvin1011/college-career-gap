'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { createAnnouncement } from '@/services/AnnouncementService';
import { Announcement } from '@/types';
import toast from 'react-hot-toast';
import { Sparkles, Trash2, Eye, EyeOff, Plus } from 'lucide-react';
import { Timestamp, FieldValue } from 'firebase/firestore';
import { isSuperAdmin } from '@/config/superAdmin';

export default function ManageAnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetAudience: [] as ('student' | 'admin')[],
  });
  const [submitting, setSubmitting] = useState(false);

  const isSuperAdminUser = user?.role === 'admin' && isSuperAdmin(user.email);

  useEffect(() => {
    if (!isSuperAdminUser) {
      setLoading(false);
      return;
    }

    const announcementsRef = collection(db, 'announcements');
    const q = query(announcementsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const announcementsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Announcement[];
      setAnnouncements(announcementsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isSuperAdminUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.targetAudience.length === 0) {
      toast.error('Please select at least one audience');
      return;
    }

    setSubmitting(true);
    try {
      await createAnnouncement(
        formData.title,
        formData.message,
        formData.targetAudience,
        false // Draft by default
      );
      toast.success('Announcement created as draft!');
      setFormData({ title: '', message: '', targetAudience: [] });
      setShowForm(false);
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (announcementId: string, currentStatus: boolean) => {
    try {
      const announcementRef = doc(db, 'announcements', announcementId);
      await updateDoc(announcementRef, {
        isActive: !currentStatus
      });
      toast.success(`Announcement ${!currentStatus ? 'published' : 'unpublished'}!`);
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update announcement');
    }
  };

  const deleteAnnouncement = async (announcementId: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      const announcementRef = doc(db, 'announcements', announcementId);
      await deleteDoc(announcementRef);
      toast.success('Announcement deleted');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const toggleAudience = (audience: 'student' | 'admin') => {
    setFormData(prev => ({
      ...prev,
      targetAudience: prev.targetAudience.includes(audience)
        ? prev.targetAudience.filter(a => a !== audience)
        : [...prev.targetAudience, audience]
    }));
  };

  const formatDate = (timestamp: Date | Timestamp | FieldValue) => {
      if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toLocaleString();
      }
      if (timestamp instanceof Date) {
        return new Date(timestamp).toLocaleString();
      }
      // If it's a FieldValue (serverTimestamp), show "Just now"
      return 'Just now';
    };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSuperAdminUser) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-600 mt-2">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Announcements</h1>
          <p className="text-gray-600 mt-1">Create and manage &quot;What&apos;s New&quot; announcements</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-5 h-5 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-bold">Create New Announcement</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., New Feature: SMS Notifications"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe what's new..."
                  rows={4}
                  required
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience
                </label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={formData.targetAudience.includes('student') ? 'primary' : 'outline'}
                    onClick={() => toggleAudience('student')}
                  >
                    Students
                  </Button>
                  <Button
                    type="button"
                    variant={formData.targetAudience.includes('admin') ? 'primary' : 'outline'}
                    onClick={() => toggleAudience('admin')}
                  >
                    Admins
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  Create as Draft
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No announcements yet</p>
              <p className="text-gray-400 text-sm mt-2">Create your first announcement to get started</p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {announcement.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        announcement.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {announcement.isActive ? 'Active' : 'Draft'}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                      {announcement.message}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Target: {announcement.targetAudience.join(', ')}</span>
                      <span>•</span>
                      <span>{formatDate(announcement.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(announcement.id, announcement.isActive)}
                      title={announcement.isActive ? 'Unpublish' : 'Publish'}
                    >
                      {announcement.isActive ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAnnouncement(announcement.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}