'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Home, School, CalendarDays, User, Users, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/utils/cn';
import Link from 'next/link';
import Image from 'next/image';

// Define the props interface
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Update the function to accept the props
export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { signOut, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const majorSlug = user?.major ? user.major.toLowerCase().replace(/\s/g, '-') : '';
  const hasMajorChannel = user?.major && user.joinedChannels.includes(majorSlug);

  const navItems = [
    ...(hasMajorChannel ? [{ name: 'My Major Channel', href: `/dashboard/channels/${majorSlug}`, icon: Home }] : []),
    { name: 'Profile Settings', href: '/dashboard/profile', icon: User },
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
    <>
      {/* Mobile Sidebar Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity md:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar Content */}
      <div
        className={cn(
          "flex flex-col w-64 bg-gray-900 text-white min-h-screen transition-transform z-50",
          "fixed md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header with Close button for mobile */}
        <div className="flex items-center justify-between h-20 border-b border-gray-800 px-4">
          <Link href="/dashboard" className="text-xl font-bold">Resource Hub</Link>
          <button onClick={onClose} className="md:hidden p-2 text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-lg font-semibold relative">
              {user?.profile?.avatar ? (
                <Image
                  src={user.profile.avatar}
                  alt="Profile picture"
                  layout="fill"
                  className="rounded-full object-cover"
                />
              ) : (
                <span>{user?.displayName?.[0] || 'A'}</span>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <h3 className="text-sm font-medium truncate">{user?.displayName}</h3>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 space-y-2.5">
            <div className="flex items-center text-sm">
              <School className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
              <span className="text-gray-300 mr-1">Major:</span>
              <span className="ml-auto font-medium text-white truncate">{user?.major || 'Not Set'}</span>
            </div>
            {user?.profile?.university && (
              <div className="flex items-center text-sm">
                <School className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="text-gray-300 mr-1">School:</span>
                <span className="ml-auto font-medium text-white truncate">{user?.profile?.university}</span>
              </div>
            )}
            {user?.profile?.graduationYear && (
              <div className="flex items-center text-sm">
                <CalendarDays className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="text-gray-300 mr-1">Grad Year:</span>
                <span className="ml-auto font-medium text-white">{user?.profile?.graduationYear}</span>
              </div>
            )}
            {!hasMajorChannel && user?.major && (
              <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-800/50 rounded-md text-xs text-yellow-300">
                <p className="flex items-center">
                  <Users className="w-3 h-3 mr-1 flex-shrink-0" />
                  Not in any channel
                </p>
                <Link
                  href="/dashboard/profile"
                  className="block mt-2 text-center text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded-md"
                >
                  Join Major Channel
                </Link>
              </div>
            )}
            <Link
              href="/dashboard/profile"
              className="block w-full text-center text-xs text-blue-400 hover:text-blue-300 mt-4"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center px-3 py-2 text-gray-300 transition-colors rounded-md hover:bg-gray-800 hover:text-white',
              { 'bg-blue-600 text-white': pathname === '/dashboard' }
            )}
          >
            <Home className="w-5 h-5 mr-3" />
            <span>Dashboard</span>
          </Link>
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-gray-300 transition-colors rounded-md hover:bg-gray-800 hover:text-white',
                { 'bg-blue-600 text-white': pathname === item.href }
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Sign Out Button */}
        <div className="px-4 py-6 border-t border-gray-800">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-500 rounded-md hover:bg-gray-800 group"
          >
            <LogOut className="w-5 h-5 mr-2" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}