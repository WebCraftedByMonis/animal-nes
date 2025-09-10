import { notFound } from 'next/navigation'
import ProductClient from './ProductClient';
import { getApiUrl } from '@/lib/utils';

export const revalidate = 1800

export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await fetch(`${getApiUrl()}/api/product/${id}`, {
      next: { revalidate: 1800 }
    });
    
    if (!res.ok) {
      return {
        title: 'Product Not Found | Animal Wellness',
        description: 'The requested product could not be found.',
      };
    }
    
    const { data } = await res.json();

    return {
      title: `${data.productName} | Animal Wellness`,
      description: data.description || `Buy ${data.productName} - Quality animal wellness product`,
      keywords: [data.productName, data.category, 'animal wellness', 'veterinary products'],
      openGraph: {
        title: data.productName,
        description: data.description || `Buy ${data.productName} - Quality animal wellness product`,
        images: data.image ? [{ url: data.image.url, alt: data.image.alt ?? data.productName }] : [],
        type: 'website',
      },
    };
  } catch (error) {
    return {
      title: 'Product | Animal Wellness',
      description: 'Quality animal wellness products',
    };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await fetch(`${getApiUrl()}/api/product/${id}`, {
      next: { revalidate: 1800 }
    });

    if (!res.ok) return notFound();

    const { data } = await res.json();

    return <ProductClient product={data} />;
  } catch (error) {
    console.error('Error fetching product:', error);
    return notFound();
  }
}
