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
          <div className="mb-12 bg-blue-900/20 rounded-lg p-8 border border-blue-800/50">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">The Mission</h2>
            <p className="text-gray-300 leading-relaxed">
              Our mission is to bridge the gap between academic learning and career success. We provide a dedicated platform where students access curated, major-specific resources directly from professors, starting from day one. We empower students to build their future long before graduation, ensuring they have the guidance, opportunities, and insights needed to thrive in their chosen field.
            </p>
          </div>

          {/* UPDATED: My Story */}
          <div className="bg-gray-800/50 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-6 text-blue-400">My Story</h2>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>
                My name is Calvin, and I&#39;m a senior at Adams State University. During my time here, I experienced firsthand
                the barriers students at a small school can face. It takes a lot of grinding to find the right opportunities,
                and I realized that not everyone has the same drive, or sometimes, life just happens. I figured if students
                had one focused, curated resource hub that actually bridged the college-career gap, it would make a real difference.
                That’s why I built this platform: to focus purely on student success.
              </p>
              <p>
                I built this as a student, for both students and professors, to bridge that gap all the way from freshman year
                to graduation. I learned so much in my junior and senior year because that’s when I thought I was supposed to
                start thinking about my career. But I realized that&#39;s not true. If I had learned all this in my first or second year,
                or if my professors had an easy way to share helpful resources all along, I would&#39;ve had a much clearer vision.
              </p>
              <p>
                Here, students join specific channels targeted to their career goals, creating a seamless experience for them and
                their professors. I hope this platform can be the change that helps us all bridge the career gap to go beyond just
                going to class, doing assignments, and stopping at that.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          <p>© 2025 College Career Gap. Built for student success.</p>
        </div>
      </footer>
    </div>
  );
}