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
    const price = data.variants?.[0]?.customerPrice;

    return {
      title: `${data.productName} | Buy Online - Animal Wellness`,
      description: data.description || `Buy ${data.productName} - High quality veterinary product ${price ? `starting at $${price}` : ''}. Fast delivery and professional support.`,
      keywords: [
        data.productName, 
        data.genericName,
        data.category, 
        data.subCategory,
        'veterinary products', 
        'animal wellness',
        'buy veterinary medicine',
        'pet care products'
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

    // Generate structured data for SEO
    const structuredData = {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: data.productName,
      description: data.description || `${data.productName} - Quality veterinary product`,
      image: data.image?.url || '',
      brand: {
        "@type": "Brand",
        name: data.company?.companyName || "Animal Wellness"
      },
      manufacturer: {
        "@type": "Organization",
        name: data.company?.companyName || "Animal Wellness"
      },
      category: data.category || "Veterinary Products",
      ...(data.variants?.[0]?.customerPrice && {
        offers: {
          "@type": "Offer",
          price: data.variants[0].customerPrice,
          priceCurrency: "PKR",
          availability: data.outofstock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
          seller: {
            "@type": "Organization",
            name: "Animal Wellness"
          }
        }
      }),
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.5",
        reviewCount: "10"
      }
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <ProductClient product={data} />
      </>
    );
  } catch (error) {
    console.error('Error fetching product:', error);
    return notFound();
  }
}
