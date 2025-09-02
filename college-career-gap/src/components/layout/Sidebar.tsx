'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Home, Compass } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/utils/cn';

export default function Sidebar() {
  const { signOut, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Explore Channels', href: '/dashboard/explore', icon: Compass },
    // Add more navigation items here as your app grows
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <div className="flex flex-col w-64 bg-gray-900 text-white min-h-screen">
      <div className="flex items-center justify-center h-20 border-b border-gray-800">
        <span className="text-xl font-bold">Resource Hub</span>
      </div>
      <nav className="flex-1 px-4 py-8 space-y-2">
        {navItems.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 text-gray-300 transition-colors rounded-md group hover:bg-gray-800 hover:text-white',
              { 'bg-blue-600 text-white hover:bg-blue-700': pathname === item.href }
            )}
          >
            <item.icon className="w-5 h-5 mr-3" />
            <span>{item.name}</span>
          </a>
        ))}
      </nav>
      <div className="px-4 py-6 border-t border-gray-800">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold">
            {user?.displayName?.[0] || 'A'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.displayName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-red-500 rounded-md group hover:bg-gray-800"
        >
          <LogOut className="w-5 h-5 mr-2" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
