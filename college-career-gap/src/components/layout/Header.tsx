'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { signOut, user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <header className="flex items-center justify-between h-20 px-8 bg-white border-b border-gray-200">
      <div className="flex-1">
        <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
      </div>
      <div className="flex items-center space-x-4">
        {user && (
          <div className="hidden md:flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">{user.displayName}</span>
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold">
              {user.displayName?.[0] || 'A'}
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="p-2 text-red-500 transition-colors rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
          aria-label="Sign Out"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
