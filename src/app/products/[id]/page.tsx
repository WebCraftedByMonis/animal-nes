import { notFound } from 'next/navigation'
import ProductClient from './ProductClient';
import { getApiUrl } from '@/lib/utils';

export const revalidate = 1800

export async function generateStaticParams() {
  try {
    const res = await fetch(`${getApiUrl()}/api/product?limit=1000`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const { data } = await res.json()
    return (data || [])
      .filter((p: any) => p.isActive !== false)
      .map((p: any) => ({ id: String(p.id) }))
  } catch {
    return []
  }
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
    const price = data.variants?.[0]?.customerPrice;

    return {
      title: `${data.productName} | Buy Online - Animal Wellness`,
      description: data.description || `Buy ${data.productName} - High quality veterinary product ${price ? `starting at $${price}` : ''}. Fast delivery and professional support.`,
      keywords: [
        data.productName,
        data.genericName,
        data.category,
        data.subCategory,
        data.subsubCategory,
        data.productType,
        data.company?.companyName,
        data.partner?.partnerName,
        ...(data.variants?.map((v: { packingVolume: string }) => `${data.productName} ${v.packingVolume}`).filter(Boolean) ?? []),
        `buy ${data.productName}`,
        `${data.genericName} price`,
        `${data.category} veterinary`,
        'veterinary products',
        'animal wellness',
        'buy veterinary medicine',
        'pet care products',
        'animal health products Pakistan',
      ].filter(Boolean),
      openGraph: {
        title: `${data.productName} - Buy Online`,
        description: data.description || `Buy ${data.productName} - Quality veterinary product`,
        images: data.image ? [{
          url: data.image.url,
          width: 800,
          height: 600,
          alt: data.image.alt ?? data.productName
        }] : [],
        type: 'website',
        siteName: 'Animal Wellness',
      },
      alternates: {
        canonical: `/products/${id}`,
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

    const baseUrl = 'https://www.animalwellness.shop'

    const productSchema = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: data.productName,
      description: data.description || `${data.productName} - Quality veterinary product`,
      ...(data.image?.url && { image: data.image.url }),
      brand: {
        '@type': 'Brand',
        name: data.company?.companyName || 'Animal Wellness',
      },
      manufacturer: {
        '@type': 'Organization',
        name: data.company?.companyName || 'Animal Wellness',
      },
      category: data.category || 'Veterinary Products',
      ...(data.variants?.length > 0 && {
        offers: {
          '@type': 'AggregateOffer',
          lowPrice: Math.min(...data.variants.map((v: any) => v.customerPrice).filter(Boolean)),
          highPrice: Math.max(...data.variants.map((v: any) => v.customerPrice).filter(Boolean)),
          priceCurrency: 'PKR',
          offerCount: data.variants.length,
          availability: data.outofstock
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
          seller: { '@type': 'Organization', name: 'Animal Wellness' },
        },
      }),
    }

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
        { '@type': 'ListItem', position: 2, name: 'Products', item: `${baseUrl}/products` },
        ...(data.category
          ? [{ '@type': 'ListItem', position: 3, name: data.category, item: `${baseUrl}/products?category=${encodeURIComponent(data.category)}` }]
          : []),
        { '@type': 'ListItem', position: data.category ? 4 : 3, name: data.productName, item: `${baseUrl}/products/${id}` },
      ],
    }

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
        <ProductClient product={data} />
      </>
    );
  } catch (error) {
    console.error('Error fetching product:', error);
    return notFound();
  }
}
