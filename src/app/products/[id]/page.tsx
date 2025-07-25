import { notFound } from 'next/navigation'// <- new client component
import ProductClient from './ProductClient';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const res = await fetch(`https://animal-nes-lv3a.vercel.app//api/product/${params.id}`);
  const { data } = await res.json();

  return {
    title: `${data.productName} | Animal Wellness`,
    description: data.description,
    openGraph: {
      images: data.image ? [{ url: data.image.url, alt: data.image.alt ?? data.productName }] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const res = await fetch(`https://animal-nes-lv3a.vercel.app//api/product/${params.id}`);

  if (!res.ok) return notFound();

  const { data } = await res.json();

  return <ProductClient product={data} />;
}
