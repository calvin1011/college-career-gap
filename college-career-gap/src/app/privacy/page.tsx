'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Lock, Database, Share2 } from 'lucide-react';

export default function PrivacyPage() {
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
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-10 h-10 text-blue-400" />
          <h1 className="text-4xl md:text-5xl font-bold">Privacy Policy</h1>
        </div>

        <p className="text-gray-400 mb-12">Last updated: January 25, 2026</p>

        <div className="space-y-8">
          {/* Information We Collect */}
          <section className="bg-gray-800/50 rounded-lg p-8 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-semibold">Information We Collect</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <p>
                When you use College Career Gap, we collect the following information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Account Information:</strong> Your name, educational email address, university, major, and graduation year</li>
                <li><strong>Profile Data:</strong> Optional profile picture and bio information</li>
                <li><strong>Usage Data:</strong> Information about how you interact with the platform, including messages viewed and resources accessed</li>
                <li><strong>Device Information:</strong> Browser type, IP address, and device identifiers for security purposes</li>
              </ul>
            </div>
          </section>

          {/* Browser Extension Section */}
          <section className="bg-blue-900/10 rounded-lg p-8 border border-blue-500/30">
            <div className="flex items-center gap-3 mb-4">
              <Share2 className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-semibold text-blue-400">Browser Extension Data Disclosure</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <p>
                Our &#34;College Career Gap - Quick Share&#34; browser extension is designed to help administrators and professors share career resources efficiently. To provide this service, the extension handles the following data:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Authentication Information:</strong> The extension accesses and monitors your authentication state (authUser) via Firebase to ensure only authorized users can post to student channels.</li>
                <li><strong>Website Content:</strong> When used on job board websites, the extension captures specific page details such as job titles, descriptions, and URLs to pre-fill sharing forms.</li>
                <li><strong>User Selections:</strong> The extension may capture text you have manually highlighted on a page to include as part of a resource description.</li>
                <li><strong>Limited Interaction:</strong> We do not track your general browsing history. The extension only interacts with web pages when you are on a supported job board or when you manually click the extension icon to share a resource.</li>
              </ul>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="bg-gray-800/50 rounded-lg p-8 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-semibold">How We Use Your Information</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <p>We use your information to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide and maintain the College Career Gap platform</li>
                <li>Connect you with major-specific career resources and guidance</li>
                <li>Enable communication between students and professors</li>
                <li>Send you important notifications about new resources (if you opt-in)</li>
                <li>Improve our services and develop new features</li>
                <li>Ensure platform security and prevent misuse</li>
              </ul>
            </div>
          </section>

          {/* Data Security */}
          <section className="bg-gray-800/50 rounded-lg p-8 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-semibold">Data Security</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <p>
                We take your privacy seriously and implement industry-standard security measures:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>All data is encrypted in transit using HTTPS/SSL</li>
                <li>Passwords are securely hashed and never stored in plain text</li>
                <li>Access to personal data is restricted to authorized personnel only</li>
                <li>We use Firebase Authentication and Firestore with security rules</li>
                <li>Regular security audits and updates are performed</li>
              </ul>
            </div>
          </section>

          {/* Data Sharing */}
          <section className="bg-gray-800/50 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">Data Sharing</h2>
            <div className="space-y-4 text-gray-300">
              <p>
                <strong>We do not sell your personal information.</strong> Your data is shared only in the following limited circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Within Your Major Channel:</strong> Your display name and profile information are visible to other members of your major&#39;s channel</li>
                <li><strong>With Professors:</strong> Professors in your major channel can see your engagement through reactions</li>
                <li><strong>Service Providers:</strong> We use Firebase (Google) for hosting and data storage, subject to their privacy policy</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect user safety</li>
              </ul>
            </div>
          </section>

          {/* Your Rights */}
          <section className="bg-gray-800/50 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
            <div className="space-y-4 text-gray-300">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of the data we have about you</li>
                <li><strong>Update:</strong> Modify your profile information at any time</li>
                <li><strong>Delete:</strong> Request deletion of your account and associated data</li>
                <li><strong>Opt-Out:</strong> Disable notifications and promotional communications</li>
                <li><strong>Export:</strong> Download your data in a portable format</li>
              </ul>
            </div>
          </section>

          {/* Cookies */}
          <section className="bg-gray-800/50 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">Cookies and Tracking</h2>
            <div className="space-y-4 text-gray-300">
              <p>
                We use essential cookies to maintain your login session and provide core functionality. We do not use third-party advertising or tracking cookies. You can control cookies through your browser settings, but disabling them may affect platform functionality.
              </p>
            </div>
          </section>

          {/* Educational Purpose */}
          <section className="bg-blue-900/20 rounded-lg p-8 border border-blue-800/50">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">Educational Use</h2>
            <div className="space-y-4 text-gray-300">
              <p>
                College Career Gap is an educational platform designed to support student career development. We are committed to maintaining a safe, respectful environment. All content is moderated, and we comply with educational data protection standards.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gray-800/50 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">Questions or Concerns?</h2>
            <div className="space-y-4 text-gray-300">
              <p>
                If you have questions about this Privacy Policy or how we handle your data, please contact us through our{' '}
                <Link href="/contact" className="text-blue-400 hover:underline font-medium">
                  contact page
                </Link>
                .
              </p>
              <p className="text-sm text-gray-400 mt-4">
                We will respond to privacy inquiries within 48 hours.
              </p>
            </div>
          </section>

          {/* Changes to Policy */}
          <section className="bg-gray-800/50 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
            <div className="space-y-4 text-gray-300">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through a prominent notice on the platform. Your continued use of the platform after changes indicates acceptance of the updated policy.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          <p>© College Career Gap. Built for student success.</p>
        </div>
      </footer>
    </div>
  );
}