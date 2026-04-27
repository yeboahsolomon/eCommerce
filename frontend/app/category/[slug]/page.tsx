import type { Metadata, ResolvingMetadata } from 'next';
import CategoryClient from "./CategoryClient";

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  // Format slug into a human-readable name for the metadata
  const categoryName = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${categoryName} | GhanaMarket`,
    description: `Browse ${categoryName} products on GhanaMarket. Find the best deals and quality items from verified Ghanaian sellers.`,
    openGraph: {
      title: `${categoryName} | GhanaMarket`,
      description: `Browse ${categoryName} products on GhanaMarket. Find the best deals and quality items from verified Ghanaian sellers.`,
    },
  };
}

export default function CategoryPage() {
  return <CategoryClient />;
}
