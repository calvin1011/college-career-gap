'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60">
        <div className="container mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">About</h1>

        <div className="prose prose-invert prose-lg max-w-none">
          <div className="bg-gray-800/50 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-6 text-blue-400">My Story</h2>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>
                My name is Calvin, an Adams State senior. I&#39;ve attended Adams State, and during my college years I&#39;ve
                experienced barriers as a student going to a small school and going out to grind to look for opportunities.
                Not everyone has this drive, and sometimes life happens. So I figured if students had a resource hub, not LinkedIn
                where you&#39;re slammed with a bunch of random things, not Handshake that&#39;s not bridging the college-career gap, a
                resource that actually focuses on student success: College Career Gap.
              </p>
              <p>
                Built by a student for students and professors. Bridging the gap from your freshman year until you graduate.
                There&#39;s a lot of info I&#39;ve learned in my junior and senior year because that&#39;s when I thought I should start grinding
                for my career. That&#39;s not true, because if I learned a lot of these things in  my first or second year, maybe I would&#39;ve
                had a better vision, even better if my professors had shared a lot of helpful resources.
              </p>
              <p>
                Students join specific channels targeted to their career goals. The platform creates a seamless experience for students
                and professors. I hope this can make a change and help bridge the career gap beyond just going to class and doing assignments
                and stopping at that.
              </p>
            </div>
          </div>

          <div className="mt-12 bg-blue-900/20 rounded-lg p-8 border border-blue-800/50">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">The Mission</h2>
            <p className="text-gray-300 leading-relaxed">
              The Resource Hub is designed to bridge the college-career gap by providing students with curated, major-specific resources from
              day one. No more waiting until junior or senior year to start thinking about your career, start building your future from freshman year.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          <p>© 2025 The Resource Hub. Built for student success.</p>
        </div>
      </footer>
    </div>
  );
}