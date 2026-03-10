import type { Metadata, ResolvingMetadata } from 'next';
import { api } from "@/lib/api";
import ProductClient from "./ProductClientComponent";

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const res = await api.getProduct(id);
    if (res.success && res.data?.product) {
       const product = res.data.product;
       return {
         title: product.metaTitle || `${product.name} | GhanaMarket`,
         description: product.metaDescription || product.description?.substring(0, 160) || `Buy ${product.name} on GhanaMarket`,
         openGraph: {
           title: product.metaTitle || `${product.name} | GhanaMarket`,
           description: product.metaDescription || product.description?.substring(0, 160) || `Buy ${product.name} on GhanaMarket`,
           images: product.images?.[0]?.url ? [product.images[0].url] : [],
         },
       };
    }
  } catch (error) {
    console.error("Failed to generate metadata for product", error);
  }

  return {
    title: 'Product | GhanaMarket',
    description: 'View product details on GhanaMarket.',
  };
}

export default function ProductPage({ params }: Props) {
  return <ProductClient params={params} />;
}

