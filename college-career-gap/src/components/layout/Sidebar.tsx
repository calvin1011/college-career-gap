'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Home, School, CalendarDays, User, Users, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/utils/cn';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';
import { isSuperAdmin } from '@/config/superAdmin';
import { Settings } from 'lucide-react';



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
  const isMemberOfMajorChannel = user?.major && user.joinedChannels.includes(majorSlug);

  const dashboardHref = isMemberOfMajorChannel ? `/dashboard/channels/${majorSlug}` : '/dashboard';

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
          "flex flex-col w-64 bg-gray-900 text-white h-screen transition-transform z-50",
          "fixed md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header with Close button for mobile */}
        <div className="flex items-center justify-between h-20 border-b border-gray-800 px-4 flex-shrink-0">
          <Link href="/dashboard" className="text-xl font-bold">Resource Hub</Link>
          <button onClick={onClose} className="md:hidden p-2 text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
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
              {!isMemberOfMajorChannel && user?.major && (
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
            </div>
          </div>

          <nav className="px-4 py-6 space-y-1">
            <Link
              href={dashboardHref}
              className={cn(
                'flex items-center px-3 py-2 text-gray-300 transition-colors rounded-md hover:bg-gray-800 hover:text-white',
                { 'bg-blue-600 text-white': pathname.startsWith('/dashboard/channels') || pathname === '/dashboard' }
              )}
            >
              <Home className="w-5 h-5 mr-3" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/dashboard/profile"
              className={cn(
                'flex items-center px-3 py-2 text-gray-300 transition-colors rounded-md hover:bg-gray-800 hover:text-white',
                { 'bg-blue-600 text-white': pathname === '/dashboard/profile' }
              )}
            >
              <User className="w-5 h-5 mr-3" />
              <span>Profile Settings</span>
            </Link>

            {user?.role === 'admin' && (
              <Link
                href="/dashboard/admin/subchannels"
                className={cn(
                  'flex items-center px-3 py-2 text-gray-300 transition-colors rounded-md hover:bg-gray-800 hover:text-white',
                  { 'bg-blue-600 text-white': pathname === '/dashboard/admin/subchannels' }
                )}
              >
                <Settings className="w-5 h-5 mr-3" />
                <span>Manage Concentrations</span>
              </Link>
            )}

            {user?.role === 'admin' && isSuperAdmin(user.email) && (
              <Link
                href="/dashboard/admin/feedback"
                className={cn(
                  'flex items-center px-3 py-2 text-gray-300 transition-colors rounded-md hover:bg-gray-800 hover:text-white',
                  { 'bg-blue-600 text-white': pathname === '/dashboard/admin/feedback' }
                )}
              >
                <ShieldCheck className="w-5 h-5 mr-3" />
                <span>Admin Feedback</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Sign Out Button */}
        <div className="px-4 py-6 border-t border-gray-800 flex-shrink-0">
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
