'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Lock, CheckCircle, Clock, Circle } from 'lucide-react';
import { isSuperAdmin } from '@/config/superAdmin';
import { updateFeedbackStatus, FeedbackStatus } from '@/services/FeedbackService';
import toast from 'react-hot-toast';

// Define a type for the feedback document
interface FeedbackEntry {
  id: string;
  content: string;
  type: string;
  status: FeedbackStatus;
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
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | 'all'>('all');

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

  const handleStatusUpdate = async (feedbackId: string, newStatus: FeedbackStatus) => {
    setUpdatingStatus(feedbackId);
    try {
      await updateFeedbackStatus(feedbackId, newStatus);
      toast.success(`Feedback marked as ${newStatus.replace('-', ' ')}`);
    } catch (error) {
      console.error('Error updating feedback status:', error);
      toast.error('Failed to update feedback status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusBadge = (status: FeedbackStatus) => {
    switch (status) {
      case 'new':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          icon: <Circle className="w-3 h-3" />
        };
      case 'in-progress':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          icon: <Clock className="w-3 h-3" />
        };
      case 'resolved':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          icon: <CheckCircle className="w-3 h-3" />
        };
    }
  };

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

  // Filter feedback based on selected status
  const filteredFeedback = filterStatus === 'all'
    ? feedback
    : feedback.filter(f => f.status === filterStatus);

  // Count feedback by status
  const statusCounts = {
    all: feedback.length,
    new: feedback.filter(f => f.status === 'new').length,
    'in-progress': feedback.filter(f => f.status === 'in-progress').length,
    resolved: feedback.filter(f => f.status === 'resolved').length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Feedback Submissions</h1>

        {/* Status Filter Tabs */}
        <div className="flex space-x-2">
          <Button
            variant={filterStatus === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
          >
            All ({statusCounts.all})
          </Button>
          <Button
            variant={filterStatus === 'new' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('new')}
          >
            New ({statusCounts.new})
          </Button>
          <Button
            variant={filterStatus === 'in-progress' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('in-progress')}
          >
            In Progress ({statusCounts['in-progress']})
          </Button>
          <Button
            variant={filterStatus === 'resolved' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('resolved')}
          >
            Resolved ({statusCounts.resolved})
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredFeedback.length === 0 ? (
          <Card className="text-center p-8">
            <CardContent>
              <p className="text-gray-500">
                {filterStatus === 'all'
                  ? 'No feedback has been submitted yet.'
                  : `No ${filterStatus.replace('-', ' ')} feedback.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFeedback.map(entry => {
            const statusBadge = getStatusBadge(entry.status);

            return (
              <Card key={entry.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold">{entry.author.displayName}</p>
                        <span className="text-sm text-gray-500">({entry.author.email})</span>
                        <span className="capitalize px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {entry.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {entry.submittedAt.toDate().toLocaleString()}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusBadge.bg} ${statusBadge.text}`}>
                      {statusBadge.icon}
                      <span className="capitalize">{entry.status.replace('-', ' ')}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="whitespace-pre-wrap mb-4">{entry.content}</p>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    {entry.status !== 'in-progress' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(entry.id, 'in-progress')}
                        disabled={updatingStatus === entry.id}
                        className="flex items-center gap-1.5"
                      >
                        <Clock className="w-4 h-4" />
                        Mark In Progress
                      </Button>
                    )}

                    {entry.status !== 'resolved' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(entry.id, 'resolved')}
                        disabled={updatingStatus === entry.id}
                        className="flex items-center gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark Resolved
                      </Button>
                    )}

                    {entry.status !== 'new' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusUpdate(entry.id, 'new')}
                        disabled={updatingStatus === entry.id}
                        className="text-gray-600"
                      >
                        Reset to New
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}