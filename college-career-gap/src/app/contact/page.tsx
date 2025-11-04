'use client';

import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquare, Send } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { submitFeedback } from '@/services/FeedbackService';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Submit as feedback with contact info in the message
      const messageWithContact = `Contact Form Submission
Name: ${formData.name}
Email: ${formData.email}

Message:
${formData.message}`;

      await submitFeedback(
        { 
          content: messageWithContact, 
          type: 'other' 
        }, 
        {
          uid: 'contact-form',
          email: formData.email,
          displayName: formData.name,
          role: 'student',
          major: 'N/A',
          isVerified: false,
          joinedChannels: [],
          createdAt: new Date(),
          lastActiveAt: new Date(),
          secondMajor: null,
          subChannel: null,
          secondMajorSubChannel: null,
          profile: {
            graduationYear: null
          }
        }
      );

      toast.success('Message sent! We\'ll get back to you soon.');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <MessageSquare className="w-10 h-10 text-blue-400" />
          <h1 className="text-4xl md:text-5xl font-bold">Contact Us</h1>
        </div>
        
        <p className="text-gray-400 mb-12 text-lg">
          Have questions, suggestions, or need help? We&#39;d love to hear from you!
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-semibold">Email</h2>
              </div>
              <a 
                href="mailto:calvinssendawula@gmail.com"
                className="text-blue-400 hover:text-blue-300 transition-colors text-lg"
              >
                calvinssendawula@gmail.com
              </a>
              <p className="text-gray-400 text-sm mt-2">
                We typically respond within 24-48 hours
              </p>
            </div>

            <div className="bg-blue-900/20 rounded-lg p-6 border border-blue-800/50">
              <h3 className="text-lg font-semibold mb-3 text-blue-400">What can we help with?</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Technical support and bug reports</li>
                <li>• Feature requests and suggestions</li>
                <li>• Account and access issues</li>
                <li>• General inquiries about the platform</li>
                <li>• Collaboration and partnership opportunities</li>
              </ul>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Send className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold">Send a Message</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Your Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />

              <Input
                type="email"
                label="Your Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                required
              />

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us how we can help..."
                  rows={6}
                  required
                  className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                loading={loading}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </form>

            <p className="text-xs text-gray-400 mt-4">
              Your message will be sent to our team and stored securely. We respect your privacy.
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-12 bg-gray-800/30 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-3">For Students</h3>
          <p className="text-gray-300">
            Already have an account? Use the feedback button in your dashboard to send messages directly to the admin indicating your field for best support.
          </p>
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