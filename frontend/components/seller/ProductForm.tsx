'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload, Trash } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input'; 
import { Textarea } from '@/components/ui/Textarea';
// import { Select } from '@/components/ui/SelectNative'; // Using native select directly for simplicity with react-hook-form register
import { sellerApi } from '@/lib/seller-api';
import { Category, Product } from '@/types';
import ImageUpload from './ImageUpload';

// Zod schema for form validation
const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  priceInCedis: z.coerce.number().positive('Price must be positive'),
  comparePriceInCedis: z.coerce.number().positive().optional().or(z.literal(0)),
  stockQuantity: z.coerce.number().int().nonnegative().default(0),
  categoryId: z.string().min(1, 'Category is required'),
  sku: z.string().optional(),
  trackInventory: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: Product;
  categories: Category[];
}

export default function ProductForm({ initialData, categories }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<{ file?: File; url: string; isPrimary: boolean; id?: string }[]>(
    initialData?.images?.map(img => ({ url: img.url, isPrimary: img.isPrimary, id: img.id })) || []
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any, // Bypass strict resolver type check due to version mismatch
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      priceInCedis: initialData ? initialData.priceInPesewas / 100 : 0,
      comparePriceInCedis: initialData?.comparePriceInPesewas ? initialData.comparePriceInPesewas / 100 : 0,
      stockQuantity: initialData?.stockQuantity || 0,
      categoryId: initialData?.category.id || '',
      sku: '', 
      trackInventory: initialData?.inStock ?? true,
      isActive: initialData?.isActive ?? true, 
    },
  });

  // Watch for conditional rendering if needed
  // const trackInventory = watch('trackInventory');







  const onSubmit = async (data: ProductFormValues) => {
    try {
      setLoading(true);

      const payload: any = {
        ...data,
        priceInPesewas: Math.round(data.priceInCedis * 100),
        comparePriceInPesewas: data.comparePriceInCedis ? Math.round(data.comparePriceInCedis * 100) : undefined,
      };
      
      delete payload.priceInCedis;
      delete payload.comparePriceInCedis;

      let productId = initialData?.id;

      if (initialData) {
        await sellerApi.updateProduct(initialData.id, payload);
        toast.success('Product updated successfully');
      } else {
        const res = await sellerApi.createProduct(payload);
        // @ts-ignore
        productId = res.data?.product?.id || res.data?.id; // backend response structure check needed
        toast.success('Product created successfully');
      }

      // Handle Image Uploads for NEW images
      if (productId) {
        const newImages = images.filter(img => img.file);
        for (const img of newImages) {
            if (img.file) {
                await sellerApi.uploadFileToR2(productId, img.file, img.isPrimary);
            }
        }
      }

      router.push('/seller/products');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl bg-white p-6 rounded-lg border shadow-sm">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-2 space-y-2">
            <label className="text-sm font-medium">Product Name</label>
            <Input placeholder="e.g. Wireless Headphones" {...register('name')} error={errors.name?.message} />
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <div className="relative">
                <select 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                    {...register('categoryId')}
                >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                        <SelectItemFlat key={cat.id} category={cat} level={0} />
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
            {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId.message}</p>}
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium">SKU (Optional)</label>
            <Input placeholder="e.g. HEAD-001" {...register('sku')} error={errors.sku?.message} />
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium">Price (₵)</label>
            <Input type="number" step="0.01" {...register('priceInCedis')} error={errors.priceInCedis?.message} />
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium">Compare Price (₵)</label>
            <Input type="number" step="0.01" {...register('comparePriceInCedis')} error={errors.comparePriceInCedis?.message} />
             <p className="text-[0.8rem] text-muted-foreground">Original price (for discounts)</p>
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium">Stock Quantity</label>
            <Input type="number" {...register('stockQuantity')} error={errors.stockQuantity?.message} />
        </div>

        <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
                <label className="text-sm font-medium">Track Inventory</label>
            </div>
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" {...register('trackInventory')} />
        </div>
        
        <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
                <label className="text-sm font-medium">Active (Visible)</label>
            </div>
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" {...register('isActive')} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        {/* Textarea component needs error prop support or manual handling */}
        <Textarea placeholder="Product details..." className="min-h-[120px]" {...register('description')} />
        {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
      </div>

        {/* Image Upload Section */}
        <div className="space-y-4">
          <label className="text-sm font-medium">Product Images</label>
          <ImageUpload 
            productId={initialData?.id} 
            images={images} 
            onChange={setImages} 
          />
        </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? 'Update Product' : 'Create Product'}
      </Button>
    </form>
  );
}

// Helper for nested categories
function SelectItemFlat({ category, level }: { category: Category; level: number }) {
    return (
        <>
            <option value={category.id} style={{ paddingLeft: `${level * 20}px` }}>
                {'- '.repeat(level) + category.name}
            </option>
            {category.children && category.children.map(child => (
                <SelectItemFlat key={child.id} category={child} level={level + 1} />
            ))}
        </>
    )
}
