"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRODUCTS } from "@/lib/dummy-data";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { Star, ShieldCheck, Truck, RotateCcw, ShoppingCart, ChevronRight } from "lucide-react";
import { use } from "react";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const product = PRODUCTS.find((p) => p.id === id);
  const { addItem } = useCart();

  if (!product) {
    notFound();
  }

  const handleAddToCart = () => {
    addItem(product);
    toast.success("Product added to cart");
  };

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="bg-slate-50 min-h-screen pb-24 md:pb-12">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center text-sm text-slate-500 gap-2">
        <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <Link href="/products" className="hover:text-blue-600 transition-colors">{product.category}</Link>
        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <span className="text-slate-900 font-medium truncate max-w-[200px] sm:max-w-md">{product.name}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Image & Main Details */}
        <div className="lg:col-span-9 space-y-8">
          
          {/* Product Overview Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
            {/* Image Gallery */}
            <div className="relative w-full md:w-1/2 bg-white border-b md:border-b-0 md:border-r border-slate-100">
               <div className="relative aspect-square w-full h-full max-h-[500px] flex items-center justify-center p-8">
                {discount > 0 && (
                  <span className="absolute top-4 left-4 z-10 rounded bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
                    -{discount}%
                  </span>
                )}
                <div className="relative w-full h-full">
                    <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-contain"
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                    />
                </div>
              </div>
            </div>

            {/* Product Info */}
            <div className="flex-1 p-6 lg:p-8 flex flex-col">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 leading-tight mb-2">{product.name}</h1>
                </div>
                
                <div className="flex items-center flex-wrap gap-3 mb-6">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.round(product.rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-blue-600 font-medium hover:underline cursor-pointer">
                    (124 verified ratings)
                  </span>
                  <span className="text-xs text-slate-300">|</span>
                  <span className="text-sm text-green-600 font-medium">In Stock</span>
                </div>

                <div className="border-t border-b border-slate-100 py-6 mb-8">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-3xl lg:text-4xl font-bold text-slate-900">₵{product.price.toLocaleString()}</span>
                    {product.originalPrice && (
                      <span className="text-lg text-slate-400 line-through">₵{product.originalPrice.toLocaleString()}</span>
                    )}
                  </div>
                  {product.originalPrice && (
                    <p className="text-sm text-orange-600 font-medium">
                      You save ₵{(product.originalPrice - product.price).toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    + shipping from ₵15.00 to Drobo
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-auto">
                 <button 
                  onClick={handleAddToCart}
                  className="w-full bg-blue-600 text-white h-14 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-[0.98] text-lg"
                 >
                   <ShoppingCart className="h-5 w-5" />
                   Add to Cart
                 </button>
              </div>
            </div>
          </div>

          {/* Product Details Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="border-b border-slate-200 px-6 py-4 bg-slate-50">
                <h3 className="font-bold text-slate-900 text-lg">Product Details</h3>
             </div>
             <div className="p-6 lg:p-8 text-slate-600 leading-relaxed space-y-6">
               <p className="text-base">
                 Experience the best quality with the {product.name}. Designed to meet your needs 
                 with premium materials and excellent craftsmanship. Perfect for everyday use.
               </p>
               <div>
                <h4 className="font-semibold text-slate-900 mb-3">Key Features</h4>
                <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
                    <li>High durability and long-lasting performance</li>
                    <li>Premium finish and elegant design</li>
                    <li>Best value for money in its category</li>
                    <li>1 Year Warranty included</li>
                </ul>
               </div>
             </div>
          </div>

          {/* Customer Feedback Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="border-b border-slate-200 px-6 py-4 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-lg">Customer Feedback</h3>
                <Link href="#" className="text-blue-600 text-sm font-medium hover:underline">View all</Link>
             </div>
             <div className="p-6 lg:p-8 space-y-8">
               <div className="flex gap-4">
                  <div className="h-12 w-12 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-lg">
                    JD
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                       <span className="font-bold text-slate-900">John Doe</span>
                       <span className="text-xs text-slate-400">2 days ago</span>
                    </div>
                    <div className="flex mb-2">
                         <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                         <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                         <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                         <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                         <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                    <p className="text-slate-600">
                      Excellent product! delivered on time and exactly as described. Will definitely buy again.
                    </p>
                  </div>
               </div>
               
               <div className="border-t border-slate-100"></div>

               <div className="flex gap-4">
                  <div className="h-12 w-12 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-lg">
                    AM
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                       <span className="font-bold text-slate-900">Akosua Mensah</span>
                       <span className="text-xs text-slate-400">1 week ago</span>
                    </div>
                    <div className="flex mb-2">
                         <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                         <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                         <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                         <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                         <Star className="h-4 w-4 text-slate-200" />
                    </div>
                    <p className="text-slate-600">
                      Good quality but delivery took a bit longer than expected. Overall happy with the purchase.
                    </p>
                  </div>
               </div>
             </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Sidebar (Delivery & Returns) */}
        <div className="lg:col-span-3 space-y-6">
           
           {/* Delivery Info */}
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h4 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wide">Delivery & Returns</h4>
              
              <div className="space-y-5">
                 <div className="flex gap-3">
                    <div className="bg-blue-50 p-2.5 rounded-lg h-fit flex-shrink-0">
                       <Truck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                       <p className="font-bold text-slate-900 text-sm">Door Delivery</p>
                       <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                         Delivery Fees ₵ 15.00 - ₵ 25.00
                         <br />
                         Ready for delivery between <span className="text-slate-900 font-bold">2 Feb</span> and <span className="text-slate-900 font-bold">5 Feb</span> when you order within next 5hrs.
                       </p>
                    </div>
                 </div>

                 <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <div className="bg-blue-50 p-2.5 rounded-lg h-fit flex-shrink-0">
                       <RotateCcw className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                       <p className="font-bold text-slate-900 text-sm">Return Policy</p>
                       <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                         Free return within 7 days for most items.
                       </p>
                    </div>
                 </div>

                 <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <div className="bg-blue-50 p-2.5 rounded-lg h-fit flex-shrink-0">
                       <ShieldCheck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                       <p className="font-bold text-slate-900 text-sm">Warranty</p>
                       <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                         1 Year Limited Warranty.
                       </p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Seller Info */}
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h4 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wide">Seller Information</h4>
              <div className="flex items-center gap-3 mb-4">
                 <div className="h-12 w-12 bg-slate-900 text-white flex items-center justify-center rounded-full font-bold text-lg">
                    GM
                 </div>
                 <div>
                    <p className="font-bold text-sm text-slate-900">Ghana Market Official</p>
                    <p className="text-xs text-slate-500">100% Satisfaction Rate</p>
                 </div>
              </div>
              <button className="w-full py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 hover:border-slate-400 transition-colors">
                 View Profile
              </button>
           </div>
        </div>

      </div>

      {/* Sticky Mobile Add to Cart */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-slate-200 p-4 md:hidden z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
             <div className="flex-1">
                <p className="text-xs text-slate-500">Total Price</p>
                <p className="text-xl font-bold text-slate-900">₵{product.price.toLocaleString()}</p>
             </div>
             <button 
               onClick={handleAddToCart}
               className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform"
             >
               Add to Cart
             </button>
        </div>
      </div>

    </div>
  );
}