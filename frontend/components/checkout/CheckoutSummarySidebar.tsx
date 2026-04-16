import { Lock, Truck } from "lucide-react";
import { CartItem } from "@/types"; // Make sure CartItem is imported correctly
import Image from "next/image";

interface OrderSummarySidebarProps {
  itemCount: number;
  groupedItemsMap: Map<string, { name: string; items: any[] }>;
  sellerPackages: any[];
  isCalculatingShipping: boolean;
  watchRegion: string;
  totalPrice: number;
  deliveryFee: number;
  grandTotal: number;
  isSubmitting: boolean;
}

export default function CheckoutSummarySidebar({
  itemCount,
  groupedItemsMap,
  sellerPackages,
  isCalculatingShipping,
  watchRegion,
  totalPrice,
  deliveryFee,
  grandTotal,
  isSubmitting,
}: OrderSummarySidebarProps) {
  // Determine the longest estimated delivery window from all seller packages
  const maxEstimatedDays = sellerPackages.length > 0
    ? sellerPackages.reduce((max: string, p: any) => {
        if (!p.estimatedDays) return max;
        // Compare by the last number in "X–Y business days"
        const maxNum = parseInt(max.split('–').pop() || '0');
        const pNum = parseInt(p.estimatedDays.split('–').pop() || '0');
        return pNum > maxNum ? p.estimatedDays : max;
      }, sellerPackages[0]?.estimatedDays || '')
    : '';

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 sticky top-4">
      <h3 className="font-bold text-slate-900 mb-4">Your Order ({itemCount} item{itemCount !== 1 ? 's' : ''})</h3>
      
      <div className="space-y-6 mb-6 max-h-[400px] overflow-y-auto pr-2">
        {Array.from(groupedItemsMap).map(([sellerId, group], index) => {
          // Find dynamic package shipping info from API if available
          const pkgInfo = sellerPackages.find(p => p.sellerId === sellerId);
          const pkgShipping = pkgInfo ? pkgInfo.shipping / 100 : 0;
          
          return (
            <div key={sellerId} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <div className="mb-3 pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800">Package {index + 1}: {group.name}</span>
              </div>

              {/* Zone & delivery estimate for this seller package */}
              {pkgInfo?.zoneName && watchRegion && !isCalculatingShipping && (
                <div className="flex items-center gap-1.5 mb-3 text-[11px] text-slate-500">
                  <Truck className="h-3 w-3 flex-shrink-0" />
                  <span className="font-medium text-slate-600">{pkgInfo.zoneName}</span>
                  <span className="text-slate-300">·</span>
                  <span>{pkgInfo.estimatedDays}</span>
                </div>
              )}

              <div className="space-y-3">
                {group.items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative h-12 w-12 rounded bg-slate-100 overflow-hidden flex-shrink-0">
                      {item.product.image && <Image src={item.product.image} alt={item.product.name} fill sizes="48px" className="object-cover" />}
                      <span className="absolute bottom-0 right-0 bg-slate-800 text-white text-[10px] px-1">{item.quantity}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
                      <p className="text-xs text-slate-500">₵{(item.product.priceInPesewas / 100).toLocaleString()}</p>
                    </div>
                    <p className="text-sm font-bold flex-shrink-0">₵{((item.product.priceInPesewas * item.quantity) / 100).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Subtotal</span>
          <span>₵{totalPrice.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
           <span className="text-slate-500">Delivery Fee</span>
           {isCalculatingShipping ? (
             <span className="text-slate-400 italic">calculating...</span>
           ) : deliveryFee === 0 && !watchRegion ? (
             <span className="text-slate-400 italic">Select region to calculate</span>
           ) : (
             <span>₵{deliveryFee.toLocaleString()}</span>
           )}
        </div>

        {/* Estimated delivery summary */}
        {maxEstimatedDays && watchRegion && !isCalculatingShipping && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
            <Truck className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Estimated delivery: {maxEstimatedDays}</span>
          </div>
        )}
        
        <div className="flex justify-between text-lg font-bold text-slate-900 pt-2">
          <span>Total</span>
          <span>₵{grandTotal.toLocaleString()}</span>
        </div>
      </div>

      <button
        form="checkout-form"
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
      >
        {isSubmitting ? "Placing Order..." : (
          <>
              <Lock className="h-4 w-4" />
              Pay ₵{grandTotal.toLocaleString()}
          </>
        )}
      </button>
      
      <div className="mt-4 text-center">
         <p className="text-xs text-slate-400">
           By placing this order, you agree to our Terms of Service.
         </p>
      </div>
    </div>
  );
}

