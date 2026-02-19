"use client";

import ProductForm from "@/components/seller/ProductForm";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const id = params.id as string;
        const res = await api.getProduct(id);
        if (res.success && res.data) {
          setProduct(res.data.product);
        } else {
          toast.error("Product not found");
          router.push("/seller/dashboard/products");
        }
      } catch (error) {
        toast.error("Failed to load product");
        router.push("/seller/dashboard/products");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProduct();
    }
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Edit Product</h1>
        <p className="text-slate-500">Update your product information.</p>
      </div>
      <ProductForm initialData={product} isEditing />
    </div>
  );
}
