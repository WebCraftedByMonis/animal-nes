'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import WhatsAppLink from '@/components/WhatsAppLink';

interface WithdrawalRequest {
  id: string;
  partnerId: number;
  amount: number;
  accountTitle: string;
  accountNumber: string;
  bankName: string;
  paymentMethod: string;
  status: string;
  notes: string | null;
  createdAt: string;
  partner: {
    id: number;
    partnerName: string;
    partnerEmail: string;
    shopName: string | null;
    partnerMobileNumber: string | null;
    walletBalance: number;
    isPremium: boolean;
  };
}

export default function WithdrawalRequestsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/withdrawal-requests?status=${statusFilter}`);
      const data = await response.json();

      if (response.ok) {
        setRequests(data.requests);
      } else {
        toast.error('Failed to fetch withdrawal requests');
      }
    } catch (error) {
      toast.error('An error occurred while fetching requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    if (!confirm(`Are you sure you want to ${action} this withdrawal request?`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/withdrawal-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          action,
          notes: actionNotes || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Request ${action}d successfully!`);
        setSelectedRequest(null);
        setActionNotes('');
        fetchRequests();
      } else {
        toast.error(data.error || `Failed to ${action} request`);
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Withdrawal Requests</h1>
        <p className="text-gray-600 mt-1">Manage partner withdrawal requests</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'pending'
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setStatusFilter('approved')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'approved'
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setStatusFilter('rejected')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'rejected'
              ? 'bg-red-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Rejected
        </button>
      </div>

      {/* Requests Table */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No withdrawal requests found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wallet Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {request.partner.partnerName}
                        {request.partner.isPremium && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Premium
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{request.partner.partnerEmail}</div>
                      {request.partner.shopName && (
                        <div className="text-xs text-gray-400">{request.partner.shopName}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">Rs. {request.amount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{request.paymentMethod}</div>
                    <div className="text-xs text-gray-500">{request.bankName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Rs. {request.partner.walletBalance}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="text-green-600 hover:text-green-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Withdrawal Request Details</h3>
                  <p className="text-sm text-gray-500 mt-1">Request ID: {selectedRequest.id}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setActionNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Partner Info */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Partner Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Name</p>
                    <p className="font-medium">{selectedRequest.partner.partnerName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-medium">{selectedRequest.partner.partnerEmail}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Mobile</p>
                    <div className="font-medium"><WhatsAppLink phone={selectedRequest.partner.partnerMobileNumber || ''} /></div>
                  </div>
                  <div>
                    <p className="text-gray-600">Shop Name</p>
                    <p className="font-medium">{selectedRequest.partner.shopName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Current Wallet Balance</p>
                    <p className="font-bold text-green-600">Rs. {selectedRequest.partner.walletBalance}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Partner Type</p>
                    <p className="font-medium">{selectedRequest.partner.isPremium ? 'Premium' : 'Normal'}</p>
                  </div>
                </div>
              </div>

              {/* Withdrawal Details */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Withdrawal Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Withdrawal Amount</p>
                    <p className="font-bold text-lg text-gray-900">Rs. {selectedRequest.amount}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Payment Method</p>
                    <p className="font-medium">{selectedRequest.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Account Title</p>
                    <p className="font-medium">{selectedRequest.accountTitle}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Account Number</p>
                    <p className="font-medium">{selectedRequest.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Bank Name</p>
                    <p className="font-medium">{selectedRequest.bankName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <div>{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">Request Date</p>
                    <p className="font-medium">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {selectedRequest.notes && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Admin Notes</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedRequest.notes}</p>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                    placeholder="Add any notes about this request..."
                  />
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => handleAction(selectedRequest.id, 'reject')}
                    disabled={processing}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {processing ? 'Processing...' : 'Reject'}
                  </button>
                  <button
                    onClick={() => handleAction(selectedRequest.id, 'approve')}
                    disabled={processing}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {processing ? 'Processing...' : 'Approve & Transfer'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
