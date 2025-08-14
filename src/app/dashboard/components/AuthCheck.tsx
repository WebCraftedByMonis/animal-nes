// app/dashboard/components/AuthCheck.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { validateAdminSession } from '@/lib/auth/admin-auth';

export async function AuthCheck() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const admin = await validateAdminSession(token);
  
  if (!admin) {
    redirect('/login');
  }

  return { admin };
}