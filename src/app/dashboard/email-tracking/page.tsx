'use client';

import { useState, useEffect } from 'react';
import { EmailLog } from '@prisma/client';

interface EmailLogWithPagination {
  logs: EmailLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function EmailTrackingPage() {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    emailType: 'ALL',
    status: 'ALL',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchEmailLogs();
  }, [filters, page]);

  const fetchEmailLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        emailType: filters.emailType,
        status: filters.status,
        search: filters.search,
      });

      const response = await fetch(`/api/email-logs?${params}`);
      const data: EmailLogWithPagination = await response.json();

      setEmailLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to fetch email logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      SENT: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getEmailTypeBadge = (emailType: string) => {
    const styles = {
      INITIAL_NOTIFICATION: 'bg-blue-100 text-blue-800',
      ACCEPTANCE_CONFIRMATION: 'bg-purple-100 text-purple-800',
      CASE_TAKEN: 'bg-gray-100 text-gray-800',
      PATIENT_ASSIGNMENT: 'bg-green-100 text-green-800',
      MASTER_TRAINER_APPROVAL: 'bg-indigo-100 text-indigo-800',
      OTHER: 'bg-gray-100 text-gray-800',
    };
    return styles[emailType as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const formatEmailType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600">
            <h1 className="text-2xl font-bold text-white">Email Tracking System</h1>
            <p className="text-green-50 mt-1">Monitor all emails sent through the appointment system</p>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Type</label>
                <select
                  value={filters.emailType}
                  onChange={(e) => {
                    setFilters({ ...filters, emailType: e.target.value });
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="ALL">All Types</option>
                  <option value="INITIAL_NOTIFICATION">Initial Notification</option>
                  <option value="ACCEPTANCE_CONFIRMATION">Acceptance Confirmation</option>
                  <option value="CASE_TAKEN">Case Taken</option>
                  <option value="PATIENT_ASSIGNMENT">Patient Assignment</option>
                  <option value="MASTER_TRAINER_APPROVAL">Master Trainer Approval</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({ ...filters, status: e.target.value });
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="SENT">Sent</option>
                  <option value="FAILED">Failed</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters({ ...filters, search: e.target.value });
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="p-6 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total Emails: <span className="font-semibold text-gray-900">{total}</span>
              </div>
              <button
                onClick={fetchEmailLogs}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Email Logs Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
              </div>
            ) : emailLogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No email logs found</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {emailLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {log.recipientName || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">{log.recipientEmail}</div>
                        <div className="text-xs text-gray-400">{log.recipientType}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEmailTypeBadge(
                            log.emailType
                          )}`}
                        >
                          {formatEmailType(log.emailType)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={log.subject}>
                          {log.subject}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(
                            log.status
                          )}`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.sentAt
                          ? new Date(log.sentAt).toLocaleString('en-PK', {
                              timeZone: 'Asia/Karachi',
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Not sent'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {log.appointmentId && (
                          <div className="text-xs text-gray-500">
                            Appointment #{log.appointmentId}
                          </div>
                        )}
                        {log.partnerId && (
                          <div className="text-xs text-gray-500">Partner #{log.partnerId}</div>
                        )}
                        {log.errorMessage && (
                          <div className="text-xs text-red-500 max-w-xs truncate" title={log.errorMessage}>
                            Error: {log.errorMessage}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
