"use client"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import {
  Layers,
  Package,
  ShoppingCart,
  ChevronDown,
  Users,
  Newspaper,
  Briefcase,
  Calendar,
  Heart,
  Image as ImageIcon,
  MessageSquare,
  UserCog,
  FileText,
  Pill,
  Hammer,
  LogOut,
  Home,
  Share2,
  DollarSign
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function AppSidebar() {
  const router = useRouter()
  const [openCategories, setOpenCategories] = useState(false)
  const [openProducts, setOpenProducts] = useState(false)
  const [openOrders, setOpenOrders] = useState(false)
  const [openPartners, setOpenPartners] = useState(false)
  const [openUsers, setOpenUsers] = useState(false)
  const [openNews, setOpenNews] = useState(false)
  const [openJobApplicants, setOpenJobApplicants] = useState(false)
  const [openPendingAppointments, setOpenPendingAppointments] = useState(false)
  const [openAnimalSellRequests, setOpenAnimalSellRequests] = useState(false)
  const [openWebBanner, setOpenWebBanner] = useState(false)
  const [openTestomonials, setOpenTestomonials] = useState(false)
  const [openAdmins, setOpenAdmins] = useState(false)
  const [openHistoryForm, setOpenHistoryForm] = useState(false)
  const [openPrescriptionForm, setOpenPrescriptionForm] = useState(false)
  const [openTraditionaljob, setOpenTraditionaljob] = useState(false)
  const [openAdditionalFees, setOpenAdditionalFees] = useState(false)
  const [openFinance, setOpenFinance] = useState(false)

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/admin/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      router.push('/login');
      router.refresh();
    } catch (error) {
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <Sidebar collapsible="offcanvas" side="left" variant="sidebar" className="h-screen border-r dark:bg-zinc-900">
      <SidebarContent>
        <div className="flex items-center gap-3 p-4">
          <Image src="/logo.jpg" alt="Logo" width={40} height={40} />
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-green-500">Admin</h1>
          </div>
        </div>
        <div className="border-t border-gray-300 dark:border-zinc-700" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Home Page */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <Home className="w-4 h-4" />
                    <span className="hover:text-green-500">Go to Site</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Divider */}
              <div className="my-2 border-t border-gray-300 dark:border-zinc-700" />

              {/* Categories/Companies */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenCategories(!openCategories)}>
                  <Layers className="w-4 h-4" />
                  <span className="hover:text-green-500">Companies</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openCategories ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openCategories && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/addCompany" className="block text-sm text-muted-foreground hover:underline">Add Company</Link>
                    <Link href="/dashboard/viewCompanies" className="block text-sm text-muted-foreground hover:underline">View Companies</Link>
                  </div>
                )}
              </SidebarMenuItem>

              {/* Products */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenProducts(!openProducts)}>
                  <Package className="w-4 h-4" />
                  <span className="hover:text-green-500">Products</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openProducts ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openProducts && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/addProduct" className="block text-sm text-muted-foreground hover:underline">Add Product</Link>
                    <Link href="/dashboard/veiwProducts" className="block text-sm text-muted-foreground hover:underline">View Products</Link>
                    <Link href="/dashboard/priceManagement" className="block text-sm text-muted-foreground hover:underline">Price Management</Link>
                    <Link href="/dashboard/addUnits" className="block text-sm text-muted-foreground hover:underline">Add Units</Link>
                    <Link href="/dashboard/productTypes" className="block text-sm text-muted-foreground hover:underline">Product Type</Link>
                    <Link href="/dashboard/discountProducts" className="block text-sm text-muted-foreground hover:underline">Discount Products</Link>
                    <Link href="/dashboard/cities" className="block text-sm text-muted-foreground hover:underline">Cities</Link>
                    <Link href="/dashboard/deliveryCharges" className="block text-sm text-muted-foreground hover:underline">Delivery Charges</Link>
                  </div>
                )}
              </SidebarMenuItem>

              {/* Partners */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenPartners(!openPartners)}>
                  <Users className="w-4 h-4" />
                  <span className="hover:text-green-500">Partners</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openPartners ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openPartners && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/addPartner" className="block text-sm text-muted-foreground hover:underline">Add Partner</Link>
                    <Link href="/dashboard/viewPartner" className="block text-sm text-muted-foreground hover:underline">View Partner</Link>
                    <Link href="/dashboard/partnertypes" className="block text-sm text-muted-foreground hover:underline">Partner Types</Link>
                    <Link href="/dashboard/specialization" className="block text-sm text-muted-foreground hover:underline">Specialization</Link>
                    <Link href="/dashboard/species" className="block text-sm text-muted-foreground hover:underline">Species</Link>
                    <Link href="/dashboard/changePassword" className="block text-sm text-muted-foreground hover:underline">Change Password</Link>
                  </div>
                )}
              </SidebarMenuItem>

              {/* Orders */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenOrders(!openOrders)}>
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hover:text-green-500">Orders</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openOrders ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openOrders && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/ordersByCustomers" className="block text-sm text-muted-foreground hover:underline">Orders By Customers</Link>
                    <Link href="/dashboard/ordersCompleted" className="block text-sm text-muted-foreground hover:underline">Orders Completed</Link>
                    <Link href="/dashboard/purchasedFromVendors" className="block text-sm text-muted-foreground hover:underline">Purchased From Vendors</Link>
                    <Link href="/dashboard/requestByCustomers" className="block text-sm text-muted-foreground hover:underline">Request By Customers</Link>
                  </div>
                )}
              </SidebarMenuItem>
              
              {/* Users */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenUsers(!openUsers)}>
                  <Users className="w-4 h-4" />
                  <span className="hover:text-green-500">Users</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openUsers ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openUsers && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/user" className="block text-sm text-muted-foreground hover:underline">Customers</Link>
                    <Link href="/dashboard/employees" className="block text-sm text-muted-foreground hover:underline">Employees</Link>
                  </div>
                )}
              </SidebarMenuItem>

              {/* News */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenNews(!openNews)}>
                  <Newspaper className="w-4 h-4" />
                  <span className="hover:text-green-500">Wellness-News</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openNews ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openNews && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/addNews" className="block text-sm text-muted-foreground hover:underline">Add News</Link>
                    <Link href="/dashboard/viewNews" className="block text-sm text-muted-foreground hover:underline">View News</Link>
                  </div>
                )}
              </SidebarMenuItem>

              {/* Job Applications */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenJobApplicants(!openJobApplicants)}>
                  <Briefcase className="w-4 h-4" />
                  <span className="hover:text-green-500">Applications for Jobs</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openJobApplicants ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openJobApplicants && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/jobApplications" className="block text-sm text-muted-foreground hover:underline">Job Applicants</Link>
                    <Link href="/dashboard/addvacancyform" className="block text-sm text-muted-foreground hover:underline">Post a job</Link>
                    <Link href="/dashboard/viewvacancyform" className="block text-sm text-muted-foreground hover:underline">Job listing</Link>
                  </div>
                )}
              </SidebarMenuItem>

              {/* Appointments */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenPendingAppointments(!openPendingAppointments)}>
                  <Calendar className="w-4 h-4" />
                  <span className="hover:text-green-500">Appointments</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openPendingAppointments ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openPendingAppointments && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/pendingAppointments" className="block text-sm text-muted-foreground hover:underline">Pending Appointments</Link>
                    <Link href="/dashboard/additional-consultation-fees" className="block text-sm text-muted-foreground hover:underline">Additional Consultation Fees</Link>
                  </div>
                )}
              </SidebarMenuItem>

              {/* Animal sell requests */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenAnimalSellRequests(!openAnimalSellRequests)}>
                  <Heart className="w-4 h-4" />
                  <span className="hover:text-green-500">Animal sell requests</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openAnimalSellRequests ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openAnimalSellRequests && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/viewanimals" className="block text-sm text-muted-foreground hover:underline">View requests</Link>
                  </div>
                )}
              </SidebarMenuItem>

              {/* Web banner */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenWebBanner(!openWebBanner)}>
                  <ImageIcon className="w-4 h-4" />
                  <span className="hover:text-green-500">Web Banner</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openWebBanner ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openWebBanner && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/addwebbanner" className="block text-sm text-muted-foreground hover:underline">Add Web Banner</Link>
                    <Link href="/dashboard/viewwebbanner" className="block text-sm text-muted-foreground hover:underline">View Web Banner</Link>
                  </div>
                )}
              </SidebarMenuItem>

              {/* Testimonials */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenTestomonials(!openTestomonials)}>
                  <MessageSquare className="w-4 h-4" />
                  <span className="hover:text-green-500">Testimonials</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openTestomonials ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openTestomonials && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/viewtestomonials" className="block text-sm text-muted-foreground hover:underline">Manage Testimonials</Link>
                  </div>
                )}
              </SidebarMenuItem>
              
              {/* Admins */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenAdmins(!openAdmins)}>
                  <UserCog className="w-4 h-4" />
                  <span className="hover:text-green-500">Admins</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openAdmins ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openAdmins && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/admins" className="block text-sm text-muted-foreground hover:underline">Manage Admins</Link>
                  </div>
                )}
              </SidebarMenuItem>

              {/* History Forms */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenHistoryForm(!openHistoryForm)}>
                  <FileText className="w-4 h-4" />
                  <span className="hover:text-green-500">History Forms</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openHistoryForm ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openHistoryForm && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/managehistoryform" className="block text-sm text-muted-foreground hover:underline">Manage History Forms</Link>
                  </div>
                )}
              </SidebarMenuItem>

              {/* Prescription form */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenPrescriptionForm(!openPrescriptionForm)}>
                  <Pill className="w-4 h-4" />
                  <span className="hover:text-green-500">Prescription Forms</span>  
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openPrescriptionForm ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openPrescriptionForm && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/manageprescriptionfrom" className="block text-sm text-muted-foreground hover:underline">Manage Prescription Forms</Link>
                  </div>
                )}
              </SidebarMenuItem>

              {/* Traditional job  */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenTraditionaljob(!openTraditionaljob)}>
                  <Hammer className="w-4 h-4" />
                  <span className="hover:text-green-500">Traditional job post</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openTraditionaljob ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openTraditionaljob && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/addtraditionaljob" className="block text-sm text-muted-foreground hover:underline">Add Traditional job</Link>
                    <Link href="/dashboard/viewtraditionaljob" className="block text-sm text-muted-foreground hover:underline">View traditional</Link>
                  </div>
                )}
              </SidebarMenuItem>

              {/* Cross Poster */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/cross-poster">
                    <Share2 className="w-4 h-4" />
                    <span className="hover:text-green-500">Cross Poster</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Finance / Accounting */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenFinance(!openFinance)}>
                  <DollarSign className="w-4 h-4" />
                  <span className="hover:text-green-500">Finance & Accounting</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openFinance ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openFinance && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/finance" className="block text-sm text-muted-foreground hover:underline">Financial Overview</Link>
                    <Link href="/dashboard/finance/partners" className="block text-sm text-muted-foreground hover:underline">Business Partners</Link>
                    <Link href="/dashboard/finance/transactions" className="block text-sm text-muted-foreground hover:underline">Income & Transactions</Link>
                    <Link href="/dashboard/finance/expenses" className="block text-sm text-muted-foreground hover:underline">Expenses</Link>
                    <Link href="/dashboard/finance/distributions" className="block text-sm text-muted-foreground hover:underline">Partner Distributions</Link>
                  </div>
                )}
              </SidebarMenuItem>

              {/* Divider */}
              <div className="my-4 border-t border-gray-300 dark:border-zinc-700" />

              {/* Logout */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleLogout}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}