'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import toast from 'react-hot-toast';
import { useSubChannels } from '@/hooks/useSubChannels';

interface SubChannelDropdownProps {
  currentMajor: string;
}

export function SubChannelDropdown({ currentMajor }: SubChannelDropdownProps) {
  const { user } = useAuth();
  const { subChannels, hasSubChannels: majorHasSubChannels, loading } = useSubChannels(currentMajor);

  // Check if this major has sub-channels
  if (!majorHasSubChannels || loading) {
    return null;
  }

  if (!subChannels || subChannels.length === 0) {
    return null;
  }

  const currentSubChannel = user?.subChannel || '';

  const handleSubChannelChange = async (newSubChannel: string) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        subChannel: newSubChannel || null
      });
      toast.success(newSubChannel ? `Switched to ${newSubChannel}` : 'Viewing all resources');
    } catch (error) {
      console.error('Error updating sub-channel:', error);
      toast.error('Failed to switch concentration');
    }
  };

  return (
    <div className="bg-blue-50 border-b border-blue-100 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <label htmlFor="subChannel" className="text-sm font-medium text-blue-900">
          Concentration:
        </label>
        <select
          id="subChannel"
          value={currentSubChannel}
          onChange={(e) => handleSubChannelChange(e.target.value)}
          className="ml-4 flex-1 max-w-xs h-9 rounded-md border border-blue-200 bg-white px-3 py-1 text-sm font-medium text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All {currentMajor} Resources</option>
          {subChannels.map((subChannel) => (
            <option key={subChannel} value={subChannel}>
              {subChannel}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}