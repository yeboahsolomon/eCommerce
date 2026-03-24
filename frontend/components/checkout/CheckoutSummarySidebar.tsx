import { Lock } from "lucide-react";
import { CartItem } from "@/types"; // Make sure CartItem is imported correctly

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
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800">Package {index + 1}: {group.name}</span>
                <span className="text-xs text-slate-500">
                  Shipping:{' '}
                  {isCalculatingShipping ? (
                    <span className="text-slate-400 italic">calculating...</span>
                  ) : !watchRegion ? (
                    <span className="text-slate-400 italic">select region</span>
                  ) : (
                    <span className="font-medium">₵{(pkgInfo?.shippingInCedis ?? pkgShipping).toLocaleString()}</span>
                  )}
                </span>
              </div>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative h-12 w-12 rounded bg-slate-100 overflow-hidden flex-shrink-0">
                      {item.product.image && <img src={item.product.image} alt={item.product.name} className="object-cover h-full w-full" />}
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
