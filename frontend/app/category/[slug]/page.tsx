import type { Metadata, ResolvingMetadata } from 'next';
import { api } from "@/lib/api";
import CategoryClient from "./CategoryClient";

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const res = await api.getCategoryProducts(slug);
    if (res.success && res.data) {
       const categoryName = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
       return {
         title: `${categoryName} | GhanaMarket`,
         description: `Browse ${categoryName} products on GhanaMarket. Find the best deals and quality items.`,
         openGraph: {
           title: `${categoryName} | GhanaMarket`,
           description: `Browse ${categoryName} products on GhanaMarket. Find the best deals and quality items.`,
         },
       };
    }
  } catch (error) {
    console.error("Failed to generate metadata for category", error);
  }

  return {
    title: 'Category | GhanaMarket',
    description: 'Browse product categories on GhanaMarket.',
  };
}

export default function CategoryPage() {
  return <CategoryClient />;
}
