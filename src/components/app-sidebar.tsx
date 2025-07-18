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
import { Layers, Package, ShoppingCart,  ChevronDown } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

export function AppSidebar() {
  const [openCategories, setOpenCategories] = useState(false)
  const [openProducts, setOpenProducts] = useState(false)
  const [openOrders, setOpenOrders] = useState(false)
  const [openPartners, setOpenPartners] = useState(false)
  const [openUsers, setOpenUsers] = useState(false)
  const [openNews, setOpenNews] = useState(false)
  const [openJobApplicants, setOpenJobApplicants] = useState(false)
  const [openPendingAppointments, setOpenPendingAppointments] = useState(false)

  return (
    <Sidebar collapsible="offcanvas" side="left" variant="sidebar" className="h-screen border-r dark:bg-zinc-900">
      <SidebarContent>
        <div className="flex items-center  gap-3 p-4">
          <Image src="/logo-removebg-preview.png" alt="Logo" width={40} height={40} />
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-green-500">Admin</h1>
          </div>
        </div>
        <div className="border-t border-gray-300 dark:border-zinc-700" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Categories */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenCategories(!openCategories)}>
                  <Layers className="w-4 h-4" />
                  <span className="hover:text-green-500">Companies</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openCategories ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openCategories && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/addCompany" className="block text-sm text-muted-foreground hover:underline">Add Company</Link>
                    <Link href="/dashboard/viewCompanies" className="block text-sm text-muted-foreground hover:underline">Veiw Companies</Link>
                    
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
                  <Package className="w-4 h-4" />
                  <span className="hover:text-green-500">Partners</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openProducts ? "rotate-180" : "rotate-0"}`} />
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
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hover:text-green-500">Users</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openOrders ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openUsers && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/user" className="block text-sm text-muted-foreground hover:underline">Customers</Link>
                    <Link href="/dashboard/employees" className="block text-sm text-muted-foreground hover:underline">Employes</Link>
                   
                  </div>
                )}
              </SidebarMenuItem>

              {/* News */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenNews(!openNews)}>
                  <ShoppingCart className="w-4 h-4" />
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
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hover:text-green-500">Applications for Jobs</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openJobApplicants ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openJobApplicants && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/jobApplications" className="block text-sm text-muted-foreground hover:underline">Job Applicants </Link>
                    <Link href="/dashboard/addvacancyform" className="block text-sm text-muted-foreground hover:underline">Post a job</Link>
                    <Link href="/dashboard/viewvacancyform" className="block text-sm text-muted-foreground hover:underline">Job listing</Link>
                  </div>
                )}
              </SidebarMenuItem>

              {/* Appointments */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenPendingAppointments(!openPendingAppointments)}>
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hover:text-green-500">Appointments</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${openPendingAppointments ? "rotate-180" : "rotate-0"}`} />
                </SidebarMenuButton>
                {openPendingAppointments && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link href="/dashboard/pendingAppointments" className="block text-sm text-muted-foreground hover:underline">Pending Appointments</Link>
                   
                  </div>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
} 
