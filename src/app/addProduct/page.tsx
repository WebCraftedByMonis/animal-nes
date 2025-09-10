import { Metadata } from 'next'
import AddProductForm from "@/components/forms/AddProductForm";

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Add Product',
  description: 'Add your veterinary products to our marketplace',
  keywords: ['add product', 'veterinary products', 'product listing', 'marketplace'],
}

export default async function AddProductPage() {
  return <AddProductForm />;
}