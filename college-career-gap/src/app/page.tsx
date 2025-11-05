'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';
import Link from "next/link";

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL params to set initial state
  const inviteCode = searchParams.get('invite');
  const initialAuthMode = searchParams.get('authMode');

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(
    initialAuthMode === 'signup' ? 'signup' : 'signin'
  );
  const { user, loading } = useAuth();

  useEffect(() => {
    // Store invite code from URL param
    if (inviteCode) {
      localStorage.setItem('pendingInvite', inviteCode);
    }
  }, [inviteCode]);

  useEffect(() => {
    if (!loading && user) {
      // Don't redirect immediately if there's a pending invite
      // The login logic will handle the redirect
      if (!localStorage.getItem('pendingInvite')) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <p className="ml-4">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                <span>Adams State University</span>
                <span className="block text-green-600">College Career Gap</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 text-balance">
                Bridge the gap between classroom and career. <strong>Students</strong>, get curated resources from your professors. <strong>Professors</strong>, share valuable opportunities and guide your students to success.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Button
                  size="lg"
                  onClick={() => {
                    setAuthMode('signup');
                    document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  data-testid="signup-button"
                >
                  Get Started
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    setAuthMode('signin');
                    document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  data-testid="login-button"
                >
                  Sign In
                </Button>
              </div>
            </div>
            {/* Image */}
            <div>
              <Image
                src="/career1.jpeg"
                alt="Bridging the career gap with teamwork"
                className="rounded-lg shadow-2xl w-full h-auto"
                width={500}
                height={300}
                priority
              />
            </div>
          </div>

          {/* Auth Form Section */}
          <div id="auth-section" className="max-w-md mx-auto pt-20">
            {authMode === 'signin' ? (
              <LoginForm onToggleMode={() => setAuthMode('signup')} />
            ) : (
              <SignUpForm onToggleMode={() => setAuthMode('signin')} />
            )}
          </div>

          {/* Features Section */}
          <div className="py-16 md:py-24">
             <div className="text-center mb-12">
               <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Why Join the Hub?</h2>
               <p className="text-lg text-gray-600 mt-2">Tailored guidance to launch your career.</p>
             </div>
             <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">For Students</h3>
                  <p className="text-gray-600">
                    Get handpicked career resources, internship postings, and advice directly from professors in your field.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">For Professors</h3>
                  <p className="text-gray-600">
                    Share valuable opportunities, announcements, and guidance directly with students.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Focused & Simple</h3>
                  <p className="text-gray-600">
                    A streamlined, major-specific platform. No clutter, just the resources you need to succeed.
                  </p>
                </div>
              </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-semibold">College Career Gap</h3>
              <p className="text-gray-400">Empowering student career success</p>
            </div>
            <div className="flex space-x-6">
              <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                About
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                Contact
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-4 text-center text-gray-400">
            <p>&copy; 2025 College Career Gap. Built for student success.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}