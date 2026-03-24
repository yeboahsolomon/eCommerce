import { cn } from "@/lib/utils";
import { CreditCard, Smartphone, Banknote, ShieldCheck } from "lucide-react";

interface Props {
  selected: string;
  onSelect: (value: "MOMO" | "CARD" | "CASH") => void;
}

export default function PaymentMethodSelector({ selected, onSelect }: Props) {
  const methods = [
    { 
      id: "MOMO", 
      label: "Mobile Money", 
      brands: "MTN, Telecel, AT",
      icon: Smartphone, 
      color: "text-yellow-600", bg: "bg-yellow-50",
      accent: "border-yellow-500", ring: "ring-yellow-500"
    },
    { 
      id: "CARD", 
      label: "Card Payment", 
      brands: "Visa, Mastercard via Paystack",
      icon: CreditCard, 
      color: "text-blue-600", bg: "bg-blue-50",
      accent: "border-blue-500", ring: "ring-blue-500"
    },
    { 
      id: "CASH", 
      label: "Pay on Delivery", 
      brands: "Cash or MoMo at door",
      icon: Banknote, 
      color: "text-green-600", bg: "bg-green-50",
      accent: "border-green-500", ring: "ring-green-500"
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {methods.map((method) => (
        <button
          key={method.id}
          type="button"
          onClick={() => onSelect(method.id as any)}
          className={cn(
            "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
            selected === method.id
              ? `${method.accent} bg-white shadow-md ${method.ring} ring-1`
              : "border-slate-100 bg-slate-50 hover:border-slate-200"
          )}
        >
          {selected === method.id && (
            <div className={`absolute top-2 right-2 ${method.color}`}>
               <ShieldCheck className="h-5 w-5" />
            </div>
          )}
          <div className={cn("p-2 rounded-full mb-1 border border-transparent shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]", method.bg)}>
            <method.icon className={cn("h-6 w-6 mt-0.5", method.color)} />
          </div>
          <span className="text-sm font-extrabold text-slate-800">{method.label}</span>
          <span className="text-[10px] text-slate-500 font-medium text-center mt-[1px] leading-tight px-1">{method.brands}</span>
        </button>
      ))}
    </div>
  );
}
