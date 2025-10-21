'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Lock } from 'lucide-react';
import { isSuperAdmin } from '@/config/superAdmin';

// Define a type for the feedback document
interface FeedbackEntry {
  id: string;
  content: string;
  type: string;
  status: string;
  submittedAt: {
    toDate: () => Date;
  };
  author: {
    displayName: string;
    email: string;
    role: string;
  };
}

export default function AdminFeedbackPage() {
  const { user, loading: authLoading } = useAuth();
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is super admin
  const isSuperAdminUser = user?.role === 'admin' && isSuperAdmin(user.email);

  useEffect(() => {
    if (!isSuperAdminUser) {
      return;
    }

    const feedbackRef = collection(db, 'feedback');
    const q = query(feedbackRef, orderBy('submittedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feedbackData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FeedbackEntry[];
      setFeedback(feedbackData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isSuperAdminUser]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSuperAdminUser) {
    return (
      <Card className="max-w-md mx-auto text-center p-8">
        <CardContent>
          <Lock size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600">This page is for super administrators only.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Feedback Submissions</h1>
      <div className="space-y-4">
        {feedback.length === 0 ? (
          <p>No feedback has been submitted yet.</p>
        ) : (
          feedback.map(entry => (
            <Card key={entry.id}>
              <CardHeader className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{entry.author.displayName} ({entry.author.email})</p>
                  <p className="text-sm text-gray-500">
                    {entry.submittedAt.toDate().toLocaleString()}
                  </p>
                </div>
                <span className="capitalize px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {entry.type}
                </span>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{entry.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}