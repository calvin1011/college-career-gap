'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { isSuperAdmin } from '@/config/superAdmin';
import { Trash2, Calendar, TrendingDown, Clock, AlertCircle } from 'lucide-react';

interface CleanupLog {
  id: string;
  timestamp: { toDate: () => Date };
  totalDeleted: number;
  channelsAffected: number;
  deletionsByChannel: Record<string, number>;
  expiredByTag: Record<string, number>;
}

export default function CleanupLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<CleanupLog[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin' && isSuperAdmin(user.email);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const logsRef = collection(db, 'cleanup_logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(30));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CleanupLog[];
      setLogs(logsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-600 mt-2">Admin access required to view cleanup logs</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalDeleted = logs.reduce((sum, log) => sum + log.totalDeleted, 0);
  const avgPerCleanup = logs.length > 0 ? Math.round(totalDeleted / logs.length) : 0;

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Automated Cleanup Logs</h1>
        <p className="text-gray-600">
          Expired job postings are automatically removed daily at 2:00 AM.
          Posts with <span className="font-semibold">internship</span> or <span className="font-semibold">full-time</span> tags expire after 7 days.
        </p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex items-start">
          <Clock className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900">Automatic Cleanup Schedule</p>
            <p className="text-sm text-blue-800 mt-1">
              The system runs every day at 2:00 AM and removes job/internship posts older than 7 days.
              This keeps the channel fresh and ensures students only see current opportunities.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cleanups</p>
                <p className="text-3xl font-bold text-gray-900">{logs.length}</p>
                <p className="text-xs text-gray-500 mt-1">Last 30 runs</p>
              </div>
              <Calendar className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Messages Removed</p>
                <p className="text-3xl font-bold text-red-600">{totalDeleted}</p>
                <p className="text-xs text-gray-500 mt-1">Expired posts deleted</p>
              </div>
              <Trash2 className="w-10 h-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg per Cleanup</p>
                <p className="text-3xl font-bold text-green-600">{avgPerCleanup}</p>
                <p className="text-xs text-gray-500 mt-1">Posts per run</p>
              </div>
              <TrendingDown className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cleanup History */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold">Recent Cleanup History</h2>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No cleanup logs yet</p>
              <p className="text-gray-400 text-sm mt-2">
                The first automated cleanup will run at 2:00 AM
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {log.timestamp.toDate().toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {log.timestamp.toDate().toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">{log.totalDeleted}</p>
                      <p className="text-xs text-gray-500">messages deleted</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-blue-50 rounded p-2">
                      <p className="text-gray-600">Channels Affected</p>
                      <p className="font-semibold text-blue-700">{log.channelsAffected}</p>
                    </div>
                    {log.expiredByTag && (
                      <>
                        {log.expiredByTag.internship && (
                          <div className="bg-purple-50 rounded p-2">
                            <p className="text-gray-600">Internships</p>
                            <p className="font-semibold text-purple-700">{log.expiredByTag.internship}</p>
                          </div>
                        )}
                        {log.expiredByTag['full-time'] && (
                          <div className="bg-green-50 rounded p-2">
                            <p className="text-gray-600">Full-Time Jobs</p>
                            <p className="font-semibold text-green-700">{log.expiredByTag['full-time']}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">How It Works</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Posts tagged as <span className="font-mono bg-gray-200 px-1 rounded">internship</span> or <span className="font-mono bg-gray-200 px-1 rounded">full-time</span> expire after 7 days</li>
          <li>• The cleanup runs automatically every day at 2:00 AM</li>
          <li>• Students see expiration badges on posts: &quot;Expires in X days&quot;</li>
          <li>• All other posts (advice, podcasts, etc.) remain permanently</li>
          <li>• No action needed from professors - it&apos;s fully automatic</li>
        </ul>
      </div>
    </div>
  );
}