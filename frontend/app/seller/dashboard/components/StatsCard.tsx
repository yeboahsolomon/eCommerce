import { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: number;
  color: "blue" | "purple" | "orange" | "yellow" | string;
  subtext?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, color, subtext }: StatsCardProps) {
  const isPositive = trend !== undefined && trend >= 0;
  
  const colorStyles = {
     blue: "bg-blue-50 text-blue-600",
     purple: "bg-purple-50 text-purple-600",
     orange: "bg-orange-50 text-orange-600",
     yellow: "bg-yellow-50 text-yellow-600",
  }[color] || "bg-slate-50 text-slate-600";

  return (
     <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition">
        <div className="flex items-start justify-between mb-4">
           <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorStyles}`}>
              <Icon className="w-6 h-6" />
           </div>
           {trend !== undefined && (
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                 {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                 {Math.abs(trend)}%
              </div>
           )}
        </div>
        <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
        <div className="flex items-baseline gap-2">
           <p className="text-2xl font-bold text-slate-900">{value}</p>
           {subtext && <span className="text-xs text-slate-400">{subtext}</span>}
        </div>
     </div>
  );
}
