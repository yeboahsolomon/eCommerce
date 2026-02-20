"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { 
  X, 
  Upload, 
  Loader2, 
  ChevronLeft,
  Save, 
  Image as ImageIcon 
} from "lucide-react";
import { Category } from "@/types";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

// Dynamic import for Quill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false, loading: () => <p>Loading editor...</p> });

const productSchema = z.object({
  name: z.string().min(3, "Product name is required"),
  description: z.string().min(10, "Description is required"),
  price: z.any().transform(v => Number(v)),
  compareAtPrice: z.any().transform(v => v ? Number(v) : undefined),
  stockQuantity: z.any().transform(v => Number(v)),
  categoryId: z.string().min(1, "Category is required"),
  isActive: z.boolean(),
  images: z.array(z.string()).min(1, "At least one image is required"),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: any;
  categories?: Category[];
  isEditing?: boolean;
}

export default function ProductForm({ initialData, categories: initialCategories, isEditing = false }: ProductFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      price: initialData?.price || "",
      compareAtPrice: initialData?.compareAtPrice || "",
      stockQuantity: initialData?.stockQuantity || 0,
      categoryId: initialData?.categoryId || "",
      isActive: initialData?.isActive ?? true,
      images: initialData?.images || [],
    }
  });

  const images = watch("images");

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
       setCategories(initialCategories);
       return;
    }
    const fetchCategories = async () => {
      try {
        const res = await api.getCategories();
        if (res.success && res.data) {
          setCategories(res.data.categories);
        }
      } catch (error) {
        toast.error("Failed to load categories");
      }
    };
    fetchCategories();
  }, [initialCategories]);

  const onDrop = async (acceptedFiles: File[]) => {
    setUploading(true);
    try {
      const uploadPromises = acceptedFiles.map(file => api.uploadImage(file, 'product'));
      const results = await Promise.all(uploadPromises);
      
      const newImages = results
        .filter((res: any) => res.success && res.data)
        .map((res: any) => res.data!.url);

      if (newImages.length > 0) {
        setValue("images", [...images, ...newImages], { shouldValidate: true });
        toast.success(`${newImages.length} images uploaded`);
      } else {
        toast.error("Failed to upload images");
      }
    } catch (error) {
      toast.error("Error uploading images");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 5,
    disabled: uploading
  });

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setValue("images", newImages, { shouldValidate: true });
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      let res;
      if (isEditing && initialData?.id) {
        res = await api.updateProduct(initialData.id, data);
      } else {
        res = await api.createProduct(data);
      }

      if (res.success) {
        toast.success(isEditing ? "Product updated successfully!" : "Product created successfully!");
        router.push("/seller/dashboard/products");
      } else {
        toast.error(res.message || "Operation failed");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto pb-20">
      
      {/* Header Actions */}
      <div className="flex items-center justify-between sticky top-0 bg-slate-50 py-4 z-10 border-b border-slate-200">
         <button type="button" onClick={() => router.back()} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition font-medium">
            <ChevronLeft className="w-5 h-5" /> Back
         </button>
         <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition">
               <input type="checkbox" {...register("isActive")} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
               <span className="text-sm font-medium text-slate-700">Active</span>
            </label>
            <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
               {isSubmitting ? (
                  <>
                     <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
               ) : (
                  <>
                     <Save className="w-4 h-4" /> Save Product
                  </>
               )}
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Main Content */}
         <div className="lg:col-span-2 space-y-8">
            {/* General Info */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
               <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-4">General Information</h3>
               
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
                  <input {...register("name")} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" placeholder="e.g. Handmade Kente Scarf" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
               </div>

               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <div className="h-64 mb-12">
                     <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                           <ReactQuill 
                              theme="snow" 
                              value={field.value} 
                              onChange={field.onChange} 
                              className="h-48" 
                           />
                        )}
                     />
                  </div>
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
               </div>
            </div>

            {/* Media */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
               <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="font-bold text-slate-900">Media</h3>
                  {uploading && <span className="text-xs text-blue-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Uploading...</span>}
               </div>

               <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}>
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center">
                     <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <Upload className="w-6 h-6 text-slate-400" />
                     </div>
                     <p className="text-sm font-medium text-slate-700">Drag & drop images or click to upload</p>
                     <p className="text-xs text-slate-400 mt-1">First image will be the cover (max 5)</p>
                  </div>
               </div>

               {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                     {images.map((url, index) => (
                        <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                           <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button type="button" onClick={() => removeImage(index)} className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50">
                                 <X className="w-4 h-4" />
                              </button>
                              {index === 0 && <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Cover</span>}
                           </div>
                        </div>
                     ))}
                  </div>
               )}
               {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images.message}</p>}
            </div>
         </div>

         {/* Sidebar */}
         <div className="space-y-8">
            
            {/* Pricing */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
               <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-4">Pricing</h3>
               
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Base Price (GHS)</label>
                  <input type="number" step="0.01" {...register("price")} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" placeholder="0.00" />
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
               </div>

               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Compare-at Price (Optional)</label>
                  <input type="number" step="0.01" {...register("compareAtPrice")} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" placeholder="0.00" />
                  <p className="text-xs text-slate-400 mt-1">To show a discount</p>
               </div>
            </div>

            {/* Inventory */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
               <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-4">Inventory</h3>
               
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock Quantity</label>
                  <input type="number" {...register("stockQuantity")} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" placeholder="0" />
                  {errors.stockQuantity && <p className="text-red-500 text-xs mt-1">{errors.stockQuantity.message}</p>}
               </div>
            </div>

            {/* Organization */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
               <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-4">Organization</h3>
               
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select {...register("categoryId")} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white">
                     <option value="">Select Category</option>
                     {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                     ))}
                  </select>
                  {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>}
               </div>
            </div>

         </div>
      </div>
    </form>
  );
}
