import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { validateAdminSession } from '@/lib/auth/admin-auth';
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import CountrySwitcher from "@/components/CountrySwitcher";

export default async function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
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
    <div className="flex min-h-screen overflow-hidden">
      <SidebarProvider>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between">
            <SidebarTrigger className="m-2" />
            <div className="m-2">
              <CountrySwitcher />
            </div>
          </div>
          <main className="flex-1 px-4 pb-4 overflow-auto">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}