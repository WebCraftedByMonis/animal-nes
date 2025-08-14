// app/dashboard/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { validateAdminSession } from '@/lib/auth/admin-auth';
import Link from 'next/link';

export default async function DashboardPage() {
  // Server-side auth check
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const admin = await validateAdminSession(token);
  
  if (!admin) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-xl rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Dashboard
          </h1>
          <p className="text-gray-600 mb-2">
            Welcome, {admin.username}!
          </p>
          <p className="text-sm text-gray-500 mb-8">
            You are logged in as an administrator.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/products"
              className="block p-6 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
            >
              <h2 className="text-xl font-semibold text-blue-900">Products</h2>
              <p className="text-blue-700 mt-2">Manage your products</p>
            </Link>

            <Link
              href="/dashboard/companies"
              className="block p-6 bg-green-50 rounded-lg hover:bg-green-100 transition"
            >
              <h2 className="text-xl font-semibold text-green-900">Companies</h2>
              <p className="text-green-700 mt-2">Manage companies</p>
            </Link>

            <Link
              href="/dashboard/admins"
              className="block p-6 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
            >
              <h2 className="text-xl font-semibold text-purple-900">Admins</h2>
              <p className="text-purple-700 mt-2">Manage admin users</p>
            </Link>
          </div>

          <div className="mt-8 flex space-x-4">
            <Link
              href="/dashboard/addCompany"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Company
            </Link>
            <form action="/api/admin/logout" method="POST" className="inline">
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}