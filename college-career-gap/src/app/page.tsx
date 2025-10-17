'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';
//import CareerImage from '/public/career1.jpeg';

export default function HomePage() {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    return null; // we will redirect the user to the dashboard
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
                Adams State <span className="text-blue-600">Resource Hub</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 text-balance">
                Bridge the gap between classroom learning and real-world career success. Get curated resources from professors in your field.
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

          {/* Features Section */}
          <div className="py-16 md:py-24">
             <div className="text-center mb-12">
               <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Why Join the Hub?</h2>
               <p className="text-lg text-gray-600 mt-2">Tailored guidance to launch your career.</p>
             </div>
             <div className="grid md:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Curated Resources</h3>
                  <p className="text-gray-600">
                    Get handpicked career resources from professors who know your field best.
                  </p>
                </div>
                {/* Feature 2 */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Major-Specific</h3>
                  <p className="text-gray-600">
                    Join channels specific to your major for targeted career guidance and networking.
                  </p>
                </div>
                {/* Feature 3 */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-Time Updates</h3>
                  <p className="text-gray-600">
                    Stay current with the latest job opportunities, industry trends, and career advice.
                  </p>
                </div>
              </div>
          </div>

          {/* Auth Form Section */}
          <div id="auth-section" className="max-w-md mx-auto pt-12">
            {authMode === 'signin' ? (
              <LoginForm onToggleMode={() => setAuthMode('signup')} />
            ) : (
              <SignUpForm onToggleMode={() => setAuthMode('signin')} />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-semibold">Adams State Resource Hub</h3>
              <p className="text-gray-400">Empowering student career success</p>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">About</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-4 text-center text-gray-400">
            <p>&copy; 2025 Adams State Resource Hub. Built for student success.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}