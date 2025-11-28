'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Save, X, AlertTriangle, Users, Lock } from 'lucide-react';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import toast from 'react-hot-toast';
import { Channel } from '@/types';
import {usePathname} from "next/navigation";

interface StudentCount {
  [subChannel: string]: number;
}

export default function ManageSubChannelsPage() {
  const { user, loading: authLoading } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [newSubChannel, setNewSubChannel] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState<{
    subChannel: string;
    index: number;
    count: number;
  } | null>(null);
  const [studentCounts] = useState<StudentCount>({});

  const pathname = usePathname();

  const isGlobalAdmin = user?.role === 'admin';

  const getCurrentChannelSlug = () => {
    // Check if we're viewing from a specific channel
    const channelMatch = pathname.match(/\/channels\/([^\/]+)/);
    if (channelMatch) {
      return channelMatch[1];
    }

    // Otherwise use user's major
    return user?.major?.toLowerCase().replace(/\s/g, '-') || '';
  };

  const majorSlug = getCurrentChannelSlug();

  // Check if user is admin of THIS channel
  const isAdminOfThisChannel = channel?.admins?.includes(user?.uid || '') || false;

  // Real-time listener for channel data
  useEffect(() => {
    if (!majorSlug) {
      setLoading(false);
      return;
    }

    const channelRef = doc(db, 'channels', majorSlug);
    const unsubscribe = onSnapshot(channelRef, (doc) => {
      if (doc.exists()) {
        setChannel({ id: doc.id, ...doc.data() } as Channel);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, majorSlug]);

  const isChannelAdmin = channel?.admins?.includes(user?.uid || '') || false;
  const hasPermission = isGlobalAdmin || isChannelAdmin;

  // Real-time listener for student counts (optional - for showing how many students per concentration)
  useEffect(() => {
    if (!majorSlug) return;

    // This would require querying users collection - simplified for now
    // In production, you might want to denormalize this data or use Cloud Functions
  }, [majorSlug]);

  const handleAddSubChannel = async () => {
    if (!newSubChannel.trim()) {
      toast.error('Please enter a concentration name');
      return;
    }

    const trimmedName = newSubChannel.trim();

    if (channel?.subChannels?.includes(trimmedName)) {
      toast.error('This concentration already exists');
      return;
    }

    setActionLoading(true);
    try {
      const channelRef = doc(db, 'channels', majorSlug);
      await updateDoc(channelRef, {
        subChannels: arrayUnion(trimmedName)
      });
      toast.success(`Added "${trimmedName}" concentration`);
      setNewSubChannel('');
    } catch (error) {
      console.error('Error adding sub-channel:', error);
      toast.error('Failed to add concentration');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveSubChannel = async (subChannel: string, index: number) => {
    // Check how many students are in this concentration
    // For now, show warning anyway
    const studentsInConcentration = studentCounts[subChannel] || 0;

    if (studentsInConcentration > 0) {
      setShowDeleteWarning({ subChannel, index, count: studentsInConcentration });
    } else {
      await confirmRemove(subChannel);
    }
  };

  const confirmRemove = async (subChannel: string) => {
    setActionLoading(true);
    try {
      const channelRef = doc(db, 'channels', majorSlug);
      await updateDoc(channelRef, {
        subChannels: arrayRemove(subChannel)
      });

      // TODO: You might want to add a Cloud Function to automatically update all users
      // who had this subChannel to null

      toast.success(`Removed "${subChannel}" concentration`);
      setShowDeleteWarning(null);
    } catch (error) {
      console.error('Error removing sub-channel:', error);
      toast.error('Failed to remove concentration');
    } finally {
      setActionLoading(false);
    }
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(channel?.subChannels?.[index] || '');
  };

  const saveEdit = async (index: number) => {
    if (!editValue.trim()) {
      toast.error('Concentration name cannot be empty');
      return;
    }

    const trimmedValue = editValue.trim();

    if (channel?.subChannels?.includes(trimmedValue) && channel?.subChannels?.[index] !== trimmedValue) {
      toast.error('A concentration with this name already exists');
      return;
    }

    setActionLoading(true);
    try {
      const oldName = channel?.subChannels?.[index];
      if (!oldName) return;
      const channelRef = doc(db, 'channels', majorSlug);

      // Remove old, add new
      await updateDoc(channelRef, {
        subChannels: arrayRemove(oldName)
      });

      await updateDoc(channelRef, {
        subChannels: arrayUnion(trimmedValue)
      });

      // TODO: Update all users with the old subChannel to the new name
      // This would require a Cloud Function or batch write

      toast.success(`Updated concentration name`);
      setEditingIndex(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating sub-channel:', error);
      toast.error('Failed to update concentration name');
    } finally {
      setActionLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!loading && !hasPermission) {
    return (
      <Card className="max-w-md mx-auto text-center p-8">
        <CardContent>
          <Lock size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600">You must be an admin of this channel to manage concentrations.</p>
        </CardContent>
      </Card>
    );
  }

  if (!channel) {
    return (
      <Card className="max-w-md mx-auto text-center p-8">
        <CardContent>
          <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Channel Not Found</h2>
          <p className="text-gray-600">Could not load channel data for {user?.major}.</p>
        </CardContent>
      </Card>
    );
  }

  const subChannels = channel.subChannels || [];

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Manage {channel.name} Concentrations
              </h1>
              <p className="text-gray-600 mt-2">
                Add, edit, or remove concentrations for your major channel
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Students</div>
              <div className="text-2xl font-bold text-blue-600">{channel.memberCount || 0}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add New Sub-Channel */}
          <div className="flex gap-2">
            <Input
              value={newSubChannel}
              onChange={(e) => setNewSubChannel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !actionLoading && handleAddSubChannel()}
              placeholder="Enter new concentration name (e.g., Marketing, Finance...)"
              disabled={actionLoading}
            />
            <Button
              onClick={handleAddSubChannel}
              loading={actionLoading}
              className="whitespace-nowrap"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Concentration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Sub-Channels */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-gray-900">
            Current Concentrations ({subChannels.length})
          </h2>
        </CardHeader>
        <CardContent>
          {subChannels.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No concentrations yet</p>
              <p className="text-sm mt-2">Add your first concentration above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subChannels.map((subChannel: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  {editingIndex === index ? (
                    // Edit Mode
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !actionLoading && saveEdit(index)}
                        disabled={actionLoading}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => saveEdit(index)}
                        size="sm"
                        disabled={actionLoading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={cancelEdit}
                        size="sm"
                        variant="ghost"
                        disabled={actionLoading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex-1">
                        <span className="text-lg font-semibold text-gray-900">
                          {subChannel}
                        </span>
                        {studentCounts[subChannel] !== undefined && (
                          <div className="text-sm text-gray-500 mt-1">
                            {studentCounts[subChannel]} student{studentCounts[subChannel] !== 1 ? 's' : ''} enrolled
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => startEdit(index)}
                          size="sm"
                          variant="ghost"
                          disabled={actionLoading}
                          title="Edit concentration name"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleRemoveSubChannel(subChannel, index)}
                          size="sm"
                          variant="ghost"
                          disabled={actionLoading}
                          className="text-red-600 hover:bg-red-50"
                          title="Remove concentration"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Changes take effect immediately. Students will see updated concentrations in their dropdown menus. Removing a concentration will reset affected students to &#34;All {channel.name} Resources&#34;.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Warning Modal */}
      {showDeleteWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-6">
              <div className="flex items-start mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Confirm Removal
                  </h3>
                  <p className="text-sm text-gray-600 mt-2">
                    Are you sure you want to remove the <strong>{showDeleteWarning.subChannel}</strong> concentration?
                  </p>
                  {showDeleteWarning.count > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>{showDeleteWarning.count} student{showDeleteWarning.count !== 1 ? 's are' : ' is'}</strong> currently in this concentration and will be reset to view &#34;All {channel.name} Resources&#34;.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setShowDeleteWarning(null)}
                  variant="outline"
                  className="flex-1"
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => confirmRemove(showDeleteWarning.subChannel)}
                  loading={actionLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Remove Concentration
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}