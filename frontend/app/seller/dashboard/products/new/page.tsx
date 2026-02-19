"use client";

import ProductForm from "@/components/seller/ProductForm";

export default function NewProductPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Add New Product</h1>
        <p className="text-slate-500">Create a new product listing for your store.</p>
      </div>
      <ProductForm />
    </div>
  );
}
