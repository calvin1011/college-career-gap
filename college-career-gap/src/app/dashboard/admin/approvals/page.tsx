'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion, writeBatch, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { isSuperAdmin } from '@/config/superAdmin';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Mail, User, Trash2 } from 'lucide-react';

interface AdminRequest {
  id: string;
  email: string;
  name: string;
  channel: string;
  channelId: string;
  requestedAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: Timestamp;
  approvedBy?: string;
  rejectedAt?: Timestamp;
  rejectedBy?: string;
}

export default function AdminApprovalsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isSuperAdminUser = user?.role === 'admin' && isSuperAdmin(user.email);

  useEffect(() => {
    if (!isSuperAdminUser) {
      setLoading(false);
      return;
    }

    const requestsRef = collection(db, 'adminRequests');
    const q = query(requestsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AdminRequest[];
      setRequests(requestsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isSuperAdminUser]);

  const handleApprove = async (request: AdminRequest) => {
    setActionLoading(request.id);
    try {
      const batch = writeBatch(db);

      // Update request status
      const requestRef = doc(db, 'adminRequests', request.id);
      batch.update(requestRef, {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: user?.uid
      });

      // Add user to channel admins
      const channelRef = doc(db, 'channels', request.channelId);
      batch.update(channelRef, {
        admins: arrayUnion(request.email) // Using email as identifier
      });

      await batch.commit();

      toast.success(`${request.name} approved as admin for ${request.channel}`);
    } catch (error) {
      console.error('Error approving admin:', error);
      toast.error('Failed to approve admin');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (request: AdminRequest) => {
    if (!window.confirm(`Reject ${request.name}'s admin request?`)) return;

    setActionLoading(request.id);
    try {
      const requestRef = doc(db, 'adminRequests', request.id);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: user?.uid
      });

      toast.success('Request rejected');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteRequest = async (request: AdminRequest) => {
    // Confirm before deleting
    if (!window.confirm(`Are you sure you want to remove the record for ${request.name}? This does not revoke their admin access, only this request log.`)) {
      return;
    }

    setActionLoading(request.id);
    try {
      await deleteDoc(doc(db, 'adminRequests', request.id));
      toast.success('Request record deleted');
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendNotification = async (request: AdminRequest) => {
    setActionLoading(request.id);
    try {
      const response = await fetch('/api/send-admin-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          professorEmail: request.email,
          professorName: request.name,
          channelName: request.channel,
          superAdminUid: user?.uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      toast.success(`Notification sent to ${request.name}`);
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSuperAdminUser) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-600 mt-2">Super admin access required</p>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Approvals</h1>
        <p className="text-gray-600 mt-1">Review and approve professor admin requests</p>
      </div>

      {/* Pending Requests */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Pending Requests ({pendingRequests.length})
        </h2>
        
        {pendingRequests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No pending requests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-5 h-5 text-gray-500" />
                        <h3 className="text-lg font-bold text-gray-900">{request.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600">{request.email}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Channel: <span className="font-semibold">{request.channel}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Requested: {request.requestedAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                      </p>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => handleApprove(request)}
                        loading={actionLoading === request.id}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(request)}
                        disabled={actionLoading === request.id}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Approved Requests */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Approved ({approvedRequests.length})
        </h2>
        
        {approvedRequests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No approved admins yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {approvedRequests.map((request) => (
              <Card key={request.id} className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h3 className="text-lg font-bold text-gray-900">{request.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600">{request.email}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Channel: <span className="font-semibold">{request.channel}</span>
                      </p>
                    </div>

                    <Button
                      onClick={() => handleSendNotification(request)}
                      loading={actionLoading === request.id}
                      variant="outline"
                      size="sm"
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Send Email
                    </Button>

                    <Button
                      onClick={() => handleDeleteRequest(request)}
                      disabled={actionLoading === request.id}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-100 hover:text-red-700"
                      title="Delete this record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              <strong>How it works:</strong> Approve professors first, then click &#34;Send Email&#34; to notify them. 
              They&#39;ll receive instructions on how to access their admin dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}