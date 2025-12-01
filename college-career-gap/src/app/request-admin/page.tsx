'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { SUPPORTED_MAJORS } from '@/types';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, CheckCircle } from 'lucide-react';

export default function RequestAdminPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    channel: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.channel) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!formData.email.toLowerCase().endsWith('.edu')) {
      toast.error('Please use your educational (.edu) email address');
      return;
    }

    setLoading(true);
    try {
      const channelSlug = formData.channel.toLowerCase().replace(/\s/g, '-');

      // Check if this email already has a pending or approved request
      const requestsRef = collection(db, 'adminRequests');
      const q = query(requestsRef, where('email', '==', formData.email.toLowerCase()));
      const existingRequests = await getDocs(q);

      if (!existingRequests.empty) {
        const existingRequest = existingRequests.docs[0].data();
        if (existingRequest.status === 'pending') {
          toast.error('You already have a pending request. Please wait for approval.');
          setLoading(false);
          return;
        }
        if (existingRequest.status === 'approved') {
          toast.error('You are already approved! Please sign up and log in.');
          setLoading(false);
          return;
        }
      }

      await addDoc(collection(db, 'adminRequests'), {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        channel: formData.channel,
        channelId: channelSlug,
        requestedAt: serverTimestamp(),
        status: 'pending',
      });

      setSubmitted(true);
      toast.success('Request submitted successfully!');
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Request Submitted!</h2>
            <p className="text-gray-600 mb-6">
              We&#39;ll review your request and send you an email at <strong>{formData.email}</strong> once approved.
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-left mb-6">
              <p className="text-sm text-blue-800">
                <strong>Next Steps:</strong>
              </p>
              <ol className="text-sm text-blue-700 mt-2 ml-4 list-decimal space-y-1">
                <li>Wait for approval email (usually within 24-48 hours)</li>
                <li>Once approved, sign up using the same email</li>
                <li>Log in and start posting resources for your students!</li>
              </ol>
            </div>

            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur">
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
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Info Section */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Request Professor Access</h1>
            <p className="text-xl text-gray-300">
              Join as a professor to share career resources with your students
            </p>
          </div>

          {/* Benefits */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">As an Admin, you can:</h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span>Post internship and job opportunities directly to your major&#39;s channel</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span>Share career advice, podcasts, and industry insights</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span>Manage post expiration dates for time-sensitive opportunities</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span>Track student engagement with view and click analytics</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span>Help bridge the gap between classroom and career for your students</span>
              </li>
            </ul>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-bold">Submit Your Request</h2>
              <p className="text-gray-600 mt-2">
                Fill out the form below. We&#39;ll review and approve within 24-48 hours.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Dr. Jane Smith"
                  required
                  className="bg-white"
                />

                <Input
                  type="email"
                  label="Educational Email (.edu)"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jane.smith@adams.edu"
                  required
                  className="bg-white"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Department/Major <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select your department</option>
                    {SUPPORTED_MAJORS.map(major => (
                      <option key={major} value={major}>{major}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the major/department you&#39;ll provide support
                  </p>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> You&#39;ll need to complete the sign up using this exact email address to access admin features.
                  </p>
                </div>

                <Button type="submit" className="w-full" loading={loading}>
                  Submit Request
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Help Text */}
          <div className="mt-6 text-center text-gray-400 text-sm">
            <p>Not Signed Up Yet? <Link href="/" className="text-blue-400 hover:underline">Sign up here</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}