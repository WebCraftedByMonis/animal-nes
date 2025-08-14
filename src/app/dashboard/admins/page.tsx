'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Admin {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminManagementPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  const [editForm, setEditForm] = useState({ username: '', password: '' });

  // Fetch admins
  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/admin/manage');
      if (response.ok) {
        const data = await response.json();
        setAdmins(data);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (err) {
      setError('Failed to fetch admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Add new admin
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Admin created successfully');
        setNewAdmin({ username: '', password: '' });
        setShowAddForm(false);
        fetchAdmins();
      } else {
        setError(data.error || 'Failed to create admin');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  // Update admin
  const handleUpdateAdmin = async (id: string) => {
    setError('');
    setSuccess('');

    const updateData: any = {};
    if (editForm.username) updateData.username = editForm.username;
    if (editForm.password) updateData.password = editForm.password;

    try {
      const response = await fetch(`/api/admin/manage/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Admin updated successfully');
        setEditingAdmin(null);
        setEditForm({ username: '', password: '' });
        fetchAdmins();
      } else {
        setError(data.error || 'Failed to update admin');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  // Delete admin
  const handleDeleteAdmin = async (id: string) => {
    if (!confirm('Are you sure you want to delete this admin?')) return;

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/manage/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Admin deleted successfully');
        fetchAdmins();
      } else {
        setError(data.error || 'Failed to delete admin');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  // Logout
  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Admin Management</h1>
              <div className="space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-md">
              {error}
            </div>
          )}
          {success && (
            <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-md">
              {success}
            </div>
          )}

          {/* Add Admin Button/Form */}
          <div className="px-6 py-4">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Add New Admin
              </button>
            ) : (
              <form onSubmit={handleAddAdmin} className="space-y-4 bg-gray-50 p-4 rounded-md">
                <h3 className="font-semibold">Add New Admin</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Username"
                    required
                    value={newAdmin.username}
                    onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    required
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewAdmin({ username: '', password: '' });
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Admins Table */}
          <div className="px-6 pb-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingAdmin === admin.id ? (
                          <input
                            type="text"
                            placeholder="New username (optional)"
                            value={editForm.username}
                            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded-md"
                          />
                        ) : (
                          <div className="text-sm font-medium text-gray-900">{admin.username}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(admin.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {editingAdmin === admin.id ? (
                          <div className="flex space-x-2">
                            <input
                              type="password"
                              placeholder="New password (optional)"
                              value={editForm.password}
                              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                              className="px-2 py-1 border border-gray-300 rounded-md"
                            />
                            <button
                              onClick={() => handleUpdateAdmin(admin.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingAdmin(null);
                                setEditForm({ username: '', password: '' });
                              }}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingAdmin(admin.id)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteAdmin(admin.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}