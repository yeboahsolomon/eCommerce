"use client";

import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { PRODUCTS } from "@/lib/dummy-data";
import { useCart } from "@/context/CartContext";
import { Product, Review, ReviewSummary } from "@/types";
import { toast } from "sonner";
import { 
  Star, ShieldCheck, Truck, RotateCcw, ShoppingCart, ChevronRight, 
  Minus, Plus, Heart, Share2, ImageOff, Loader2, CheckCircle, BadgeCheck
} from "lucide-react";
import { use, useState, useEffect, useCallback } from "react";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addItem, cart, updateQuantity } = useCart();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Fetch product data from API
  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const res = await api.getProduct(id);
        if (res.success && (res.data as any)?.product) {
          const p = (res.data as any).product;
          // Normalize the product shape
          const normalizedProduct: Product = {
            ...p,
            image: p.images?.[0]?.url || null,
            averageRating: Number(p.averageRating) || 0,
            inStock: p.inStock ?? (p.stockQuantity > 0),
          };
          setProduct(normalizedProduct);
        } else {
          // Fallback to dummy data
          const dummyProduct = PRODUCTS.find(p => p.id === id);
          if (dummyProduct) setProduct(dummyProduct);
        }
      } catch {
        const dummyProduct = PRODUCTS.find(p => p.id === id);
        if (dummyProduct) setProduct(dummyProduct);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Fetch reviews separately
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await api.getProductReviews(id);
        if (res.success && res.data) {
          setReviews(res.data.reviews as Review[]);
          setReviewSummary(res.data.summary as ReviewSummary);
        }
      } catch {
        // Reviews are optional, fail silently
      }
    };

    fetchReviews();
  }, [id]);

  const cartItem = cart?.items?.find((item) => item.productId === product?.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    addItem(product.id, 1, product);
  }, [addItem, product]);

  const handleUpdateQuantity = useCallback((newQty: number) => {
    if (!product) return;
    updateQuantity(product.id, newQty);
  }, [product, updateQuantity]);

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
  };

  const handleShare = async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on GhanaMarket!`,
          url: window.location.href,
        });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // Not found
  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ImageOff className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Product Not Found</h2>
        <p className="text-slate-500 mb-6">The product you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <Link href="/products" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition">
          Browse Products
        </Link>
      </div>
    );
  }

  const discount = product.comparePriceInPesewas
    ? Math.round(((product.comparePriceInPesewas - product.priceInPesewas) / product.comparePriceInPesewas) * 100)
    : 0;

  const images = product.images && product.images.length > 0 
    ? product.images 
    : product.image 
      ? [{ id: "main", url: product.image, altText: product.name, isPrimary: true }]
      : [];

  const AddToCartButton = ({ className }: { className?: string }) => {
    if (quantity > 0) {
      return (
        <div className={`flex items-center justify-between bg-white border-2 border-blue-600 rounded-xl overflow-hidden h-14 ${className}`}>
          <button
            onClick={() => handleUpdateQuantity(quantity - 1)}
            className="h-full px-5 text-blue-600 hover:bg-blue-50 transition active:scale-95 flex items-center justify-center"
          >
            <Minus className="h-5 w-5" />
          </button>
          <span className="font-bold text-xl text-slate-900 w-12 text-center">{quantity}</span>
          <button
            onClick={() => handleUpdateQuantity(quantity + 1)}
            className="h-full px-5 text-blue-600 hover:bg-blue-50 transition active:scale-95 flex items-center justify-center"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      );
    }

    return (
      <button 
        onClick={handleAddToCart}
        disabled={!product.inStock || !product.isActive}
        className={`bg-blue-600 text-white h-14 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-[0.98] text-lg disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <ShoppingCart className="h-5 w-5" />
        {!product.isActive ? "Not Available" : product.inStock ? "Add to Cart" : "Out of Stock"}
      </button>
    );
  };

  return (
    <div className="min-h-screen pb-24 md:pb-12">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center text-sm text-slate-500 gap-2">
        <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <Link href="/products" className="hover:text-blue-600 transition-colors">{product.category?.name || "Products"}</Link>
        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <span className="text-slate-900 font-medium truncate max-w-[200px] sm:max-w-md">{product.name}</span>
      </div>

      {!product.isActive && (
        <div className="max-w-7xl mx-auto px-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-medium">This product is currently inactive and cannot be purchased.</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Image & Main Details */}
        <div className="lg:col-span-9 space-y-8">
          
          {/* Product Overview Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
            
            {/* ===== IMAGE GALLERY ===== */}
            <div className="relative w-full md:w-1/2 bg-white border-b md:border-b-0 md:border-r border-slate-100">
              {/* Main Image */}
              <div className="relative aspect-square w-full max-h-[500px] flex items-center justify-center p-4">
                {discount > 0 && (
                  <span className="absolute top-4 left-4 z-10 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
                    -{discount}%
                  </span>
                )}
                
                {/* Action Buttons */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                  <button
                    onClick={handleWishlist}
                    className={`h-10 w-10 rounded-full bg-white shadow-md flex items-center justify-center transition-all hover:scale-110 ${
                      isWishlisted ? "text-red-500" : "text-slate-400 hover:text-red-500"
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${isWishlisted ? "fill-current" : ""}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="h-10 w-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all hover:scale-110"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="relative w-full h-full">
                  {images.length > 0 ? (
                    <Image
                      src={images[selectedImage]?.url || images[0]?.url}
                      alt={images[selectedImage]?.altText || product.name}
                      fill
                      className="object-contain"
                      priority
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-400 rounded-xl">
                      <ImageOff className="h-16 w-16" />
                    </div>
                  )}
                </div>
              </div>

              {/* Thumbnail Gallery */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 p-4 pt-0 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedImage(i)}
                      className={`relative h-16 w-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                        selectedImage === i 
                          ? "border-blue-600 shadow-md" 
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Image
                        src={img.url}
                        alt={img.altText || `${product.name} ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ===== PRODUCT INFO ===== */}
            <div className="flex-1 p-6 lg:p-8 flex flex-col">
              <div className="flex-1">
                {/* Seller Badge */}
                {product.seller && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-3">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {product.seller.businessName}
                  </div>
                )}

                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 leading-tight mb-3">{product.name}</h1>
                
                {/* Rating & Stock */}
                <div className="flex items-center flex-wrap gap-3 mb-6">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.round(product.averageRating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-blue-600 font-medium hover:underline cursor-pointer">
                    ({reviewSummary?.totalReviews || product.reviewCount || 0} verified ratings)
                  </span>
                  <span className="text-xs text-slate-300">|</span>
                  {product.inStock ? (
                    <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> In Stock
                    </span>
                  ) : (
                    <span className="text-sm text-red-500 font-medium">Out of Stock</span>
                  )}
                </div>

                {/* Price Section */}
                <div className="border-t border-b border-slate-100 py-6 mb-8">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-3xl lg:text-4xl font-bold text-slate-900">₵{(product.priceInPesewas / 100).toLocaleString()}</span>
                    {product.comparePriceInPesewas && (
                      <span className="text-lg text-slate-400 line-through">₵{(product.comparePriceInPesewas / 100).toLocaleString()}</span>
                    )}
                  </div>
                  {product.comparePriceInPesewas && (
                    <p className="text-sm text-orange-600 font-medium">
                      You save ₵{((product.comparePriceInPesewas - product.priceInPesewas) / 100).toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    + shipping from ₵15.00
                  </p>
                </div>

                {/* Description Preview */}
                {product.description && (
                  <div className="mb-6">
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                      {product.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-auto">
                <div className="flex-1">
                  <AddToCartButton className="w-full" />
                </div>
              </div>
            </div>
          </div>

          {/* ===== PRODUCT DETAILS ===== */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-lg">Product Details</h3>
            </div>
            <div className="p-6 lg:p-8 text-slate-600 leading-relaxed space-y-6">
              {product.description ? (
                <p className="text-base whitespace-pre-line">{product.description}</p>
              ) : (
                <p className="text-base">
                  Experience the best quality with the {product.name}. Designed to meet your needs 
                  with premium materials and excellent craftsmanship. Perfect for everyday use.
                </p>
              )}
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

          {/* ===== CUSTOMER REVIEWS (from API) ===== */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-lg">Customer Reviews</h3>
              {reviewSummary && reviewSummary.totalReviews > 0 && (
                <span className="text-sm text-slate-500">{reviewSummary.totalReviews} review{reviewSummary.totalReviews !== 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="p-6 lg:p-8">
              
              {/* Rating Summary */}
              {reviewSummary && reviewSummary.totalReviews > 0 && (
                <div className="flex flex-col sm:flex-row items-start gap-8 mb-8 pb-8 border-b border-slate-100">
                  {/* Overall Rating */}
                  <div className="text-center flex-shrink-0">
                    <p className="text-5xl font-extrabold text-slate-900">{reviewSummary.averageRating.toFixed(1)}</p>
                    <div className="flex justify-center my-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= Math.round(reviewSummary.averageRating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-slate-300"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-slate-500">{reviewSummary.totalReviews} reviews</p>
                  </div>

                  {/* Rating Distribution Bars */}
                  <div className="flex-1 space-y-2 w-full">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = reviewSummary.distribution[rating as 1|2|3|4|5] || 0;
                      const percentage = reviewSummary.totalReviews > 0 ? (count / reviewSummary.totalReviews) * 100 : 0;
                      return (
                        <div key={rating} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-slate-600 w-8 text-right">{rating}★</span>
                          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-yellow-400 rounded-full transition-all duration-500" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 w-8">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Individual Reviews */}
              {reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="flex gap-4">
                      <div className="h-12 w-12 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-lg">
                        {review.user?.name?.split(' ').map(n => n[0]).join('') || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{review.user?.name || "Anonymous"}</span>
                            {review.isVerifiedPurchase && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                <CheckCircle className="h-3 w-3" /> Verified
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            {new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-200"
                              }`}
                            />
                          ))}
                        </div>
                        {review.title && (
                          <p className="font-semibold text-slate-900 text-sm mb-1">{review.title}</p>
                        )}
                        {review.comment && (
                          <p className="text-slate-600 text-sm leading-relaxed">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Star className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No reviews yet</p>
                  <p className="text-sm text-slate-400 mt-1">Be the first to review this product</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Sidebar */}
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
                         Delivery Fees ₵15.00 - ₵25.00
                         <br />
                         Estimated 2-5 business days
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
                    {product.seller?.businessName?.[0] || 'G'}
                 </div>
                 <div>
                    <p className="font-bold text-sm text-slate-900">{product.seller?.businessName || "GhanaMarket Official"}</p>
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
                <p className="text-xl font-bold text-slate-900">₵{(product.priceInPesewas / 100).toLocaleString()}</p>
             </div>
             <div className="w-40">
               <AddToCartButton className="w-full" />
             </div>
        </div>
      </div>

    </div>
  );
}
