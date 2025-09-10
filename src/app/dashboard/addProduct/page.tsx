import { Metadata } from 'next'
import AddProductForm from "@/components/forms/AddProductForm";

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Add Product | Dashboard',
  description: 'Admin panel for adding new products to the marketplace',
  keywords: ['dashboard', 'admin', 'add product', 'product management'],
}

export default async function DashboardAddProductPage() {
  return <AddProductForm />;
}