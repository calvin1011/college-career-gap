'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { auth } from '@/services/firebase/config';
import { Button } from '@/components/ui/Button';
import { MessageSquarePlus } from 'lucide-react';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { AnnouncementModal } from '@/components/announcements/AnnouncementModal';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const { currentAnnouncement, dismissAnnouncement } = useAnnouncements();

  useEffect(() => {
    // Redirect unauthenticated users to the home page
    if (!loading && !firebaseUser) {
      router.push('/');
    }
  }, [loading, firebaseUser, router]);

  // Show a loading spinner while the auth state is being determined
  if (loading || !firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Display a verification message if the user is authenticated but not verified
  if (firebaseUser && !firebaseUser.emailVerified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-lg">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Please Verify Your Email</h2>
          <p className="text-gray-600 mt-2">
            A verification link has been sent to <strong>{firebaseUser.email}</strong>. Please check your inbox/spam and click the link to continue.
          </p>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-left">
            <p className="text-sm text-yellow-800 font-medium">
              <strong>Don&apos;t see the email?</strong>
            </p>
            <ul className="text-xs text-yellow-700 mt-2 ml-4 list-disc space-y-1">
              <li>Wait 2-3 minutes for the email if not received</li>
              <li>Make sure you entered the correct email</li>
              <li> After verifying, return to this tab and refresh your screen to login</li>
            </ul>
          </div>

          <button
            onClick={() => auth.signOut()}
            className="mt-6 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // Render the dashboard content
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-hidden mobile-scroll-fix">
          {children}
        </main>
      </div>

      {/* Floating Feedback Button */}
      <Button
        onClick={() => setIsFeedbackModalOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-30"
        aria-label="Submit Feedback"
      >
        <MessageSquarePlus size={24} />
      </Button>

      {/* Feedback Modal */}
      {isFeedbackModalOpen && (
        <FeedbackModal onClose={() => setIsFeedbackModalOpen(false)} />
      )}

      {/* Announcement Modal */}
      {currentAnnouncement && (
        <AnnouncementModal
          announcement={currentAnnouncement}
          onDismiss={dismissAnnouncement}
        />
      )}
    </div>
  );
}