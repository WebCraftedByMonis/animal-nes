import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen overflow-hidden">
      <SidebarProvider>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <SidebarTrigger className="p-4" />
          <main className="flex-1 p-4 overflow-auto">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}
