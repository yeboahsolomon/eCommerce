"use client";

import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { CartItem } from "@/types";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

interface Props {
  item: CartItem;
}

export default function CartItemRow({ item }: Props) {
  const { updateQuantity, removeItem } = useCart();

  const handleRemove = () => {
    removeItem(item.productId);
    toast.success("Product removed successfully");
  };

  return (
    <div className="flex gap-4 py-6 border-b border-slate-100 last:border-0">
      {/* Product Image */}
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-slate-200">
        {item.product.image ? (
          <Image
            src={item.product.image}
            alt={item.product.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">No Img</div>
        )}
      </div>

      {/* Details & Controls */}
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-900 line-clamp-2">
              {item.product.name}
            </h3>
          </div>
          <p className="text-sm font-bold text-slate-900">
            ₵{((item.product.priceInPesewas / 100) * item.quantity).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center justify-between mt-4">
          {/* Quantity Controls */}
          <div className="flex items-center rounded-lg border border-slate-200">
            <button
              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              className="p-2 text-slate-600 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50"
              disabled={item.quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm font-medium text-slate-900">
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
              className="p-2 text-slate-600 hover:bg-slate-50 hover:text-blue-600"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Remove Button */}
          <button
            onClick={handleRemove}
            className="flex items-center text-sm text-red-500 hover:text-red-600 transition"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
}
