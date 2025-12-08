'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Crown, Eye, Check, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PremiumRequest {
  id: string;
  partnerId: number;
  paymentMethod: string;
  paymentScreenshot: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  partner: {
    id: number;
    partnerName: string;
    partnerEmail: string;
    shopName: string;
    partnerMobileNumber: string;
    partnerType: string;
    isPremium: boolean;
  };
}

export default function PremiumRequestsPage() {
  const [requests, setRequests] = useState<PremiumRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedRequest, setSelectedRequest] = useState<PremiumRequest | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [actionNotes, setActionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/admin/premium-requests', {
        params: { status: statusFilter },
      });
      setRequests(data.requests);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch premium requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      await axios.put('/api/admin/premium-requests', {
        requestId: selectedRequest.id,
        action: actionType,
        notes: actionNotes,
      });

      toast.success(`Request ${actionType}d successfully!`);
      setShowActionModal(false);
      setActionNotes('');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${actionType} request`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-center text-green-500 flex items-center gap-2">
          <Crown className="w-6 h-6" />
          Premium Partnership Requests
        </h1>
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Shop/Type</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Screenshot</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No premium requests found
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.partner.partnerName}</p>
                        {request.partner.isPremium && (
                          <span className="inline-flex items-center text-xs text-yellow-600">
                            <Crown className="w-3 h-3 mr-1" />
                            Premium
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{request.partner.partnerEmail}</p>
                        <p className="text-gray-500">{request.partner.partnerMobileNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{request.partner.shopName || '-'}</p>
                        <p className="text-gray-500">{request.partner.partnerType || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{request.paymentMethod}</p>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowImageModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                      {request.notes && (
                        <p className="text-xs text-gray-500 mt-1">{request.notes}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(request.createdAt))} ago
                      </p>
                    </TableCell>
                    <TableCell>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-500 hover:bg-green-600"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionType('approve');
                              setShowActionModal(true);
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionType('reject');
                              setShowActionModal(true);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Image Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Partner:</strong> {selectedRequest.partner.partnerName}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Payment Method:</strong> {selectedRequest.paymentMethod}
                </p>
              </div>
              <div className="relative w-full">
                <Image
                  src={selectedRequest.paymentScreenshot}
                  alt="Payment Screenshot"
                  width={800}
                  height={600}
                  className="rounded-lg border border-gray-300"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowImageModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Modal */}
      <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Premium Request
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <p className="text-sm">
                Are you sure you want to {actionType} the premium request from{' '}
                <strong>{selectedRequest.partner.partnerName}</strong>?
              </p>
              {actionType === 'approve' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    This will upgrade the partner to premium status and grant them premium benefits.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <Textarea
                  placeholder="Add any notes or comments..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowActionModal(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              className={actionType === 'approve' ? 'bg-green-500 hover:bg-green-600' : ''}
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {actionType === 'approve' ? 'Approving...' : 'Rejecting...'}
                </>
              ) : (
                actionType === 'approve' ? 'Approve' : 'Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
