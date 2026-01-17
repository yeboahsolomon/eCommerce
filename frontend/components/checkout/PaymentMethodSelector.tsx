import { cn } from "@/lib/utils";
import { CreditCard, Smartphone, Banknote } from "lucide-react";

interface Props {
  selected: string;
  onSelect: (value: "MOMO" | "CARD" | "CASH") => void;
}

export default function PaymentMethodSelector({ selected, onSelect }: Props) {
  const methods = [
    { id: "MOMO", label: "Mobile Money", icon: Smartphone, color: "text-yellow-600", bg: "bg-yellow-50" },
    { id: "CARD", label: "Card Payment", icon: CreditCard, color: "text-blue-600", bg: "bg-blue-50" },
    { id: "CASH", label: "Cash on Delivery", icon: Banknote, color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {methods.map((method) => (
        <button
          key={method.id}
          type="button"
          onClick={() => onSelect(method.id as any)}
          className={cn(
            "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
            selected === method.id
              ? `border-${method.color.split("-")[1]}-500 bg-white shadow-md ring-1 ring-${method.color.split("-")[1]}-500`
              : "border-slate-100 bg-slate-50 hover:border-slate-200"
          )}
        >
          <div className={cn("p-2 rounded-full mb-2", method.bg)}>
            <method.icon className={cn("h-6 w-6", method.color)} />
          </div>
          <span className="text-sm font-semibold text-slate-700">{method.label}</span>
        </button>
      ))}
    </div>
  );
}
