'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import ProductForm from '@/components/seller/ProductForm';
import { api } from '@/lib/api';
import { Category, Product } from '@/types';

export default function EditProductPage() {
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [catRes, prodRes] = await Promise.all([
          api.getCategories(),
          api.getProduct(id)
        ]);

        if (catRes.success && catRes.data) {
          setCategories(catRes.data.categories);
        }

        if (prodRes.success && prodRes.data) {
          setProduct(prodRes.data.product);
        } else {
            toast.error("Product not found");
        }
      } catch (error) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
        fetchData();
    }
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!product) {
      return <div className="p-8 text-center">Product not found</div>;
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/seller/products">
            <Button variant="ghost" size="sm" className="mb-2 pl-0 hover:pl-0 hover:bg-transparent">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
            </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
        <p className="text-muted-foreground">Update product details.</p>
      </div>

      <ProductForm initialData={product} categories={categories} />
    </div>
  );
}
