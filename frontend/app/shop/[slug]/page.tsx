import type { Metadata, ResolvingMetadata } from 'next';
import { api } from "@/lib/api";
import ShopClient from "./ShopClient";

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const res = await api.getSellerBySlug(slug);
    if (res.success && res.data?.profile) {
       const profile = res.data.profile;
       return {
         title: `${profile.businessName} Shop | GhanaMarket`,
         description: profile.description?.substring(0, 160) || `Shop from ${profile.businessName} on GhanaMarket.`,
         openGraph: {
           title: `${profile.businessName} Shop | GhanaMarket`,
           description: profile.description?.substring(0, 160) || `Shop from ${profile.businessName} on GhanaMarket.`,
           images: profile.logoUrl ? [profile.logoUrl] : [],
         },
       };
    }
  } catch (error) {
    console.error("Failed to generate metadata for shop", error);
  }

  return {
    title: 'Seller Shop | GhanaMarket',
    description: 'Shop verified sellers on GhanaMarket.',
  };
}

export default function ShopPage() {
  return <ShopClient />;
}
