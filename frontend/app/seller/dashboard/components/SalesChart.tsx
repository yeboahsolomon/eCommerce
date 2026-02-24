"use client";

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

interface SalesChartProps {
  chartData: { name: string; sales: number }[];
  onFilterChange: (filter: string) => void;
}

const formatCurrency = (amountInPesewas: number) => {
  return typeof amountInPesewas === 'number' 
    ? `₵${(amountInPesewas / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₵0.00`;
};

export function SalesChart({ chartData, onFilterChange }: SalesChartProps) {
  return (
    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900">Sales Overview</h3>
          <select 
            onChange={(e) => onFilterChange(e.target.value)} 
            className="text-sm border-none bg-slate-50 rounded-lg px-3 py-1 text-slate-600 focus:ring-0 cursor-pointer"
          >
            <option value="7D">Last 7 Days</option>
            <option value="30D">Last 30 Days</option>
            <option value="1Y">This Year</option>
          </select>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `GH₵${val}`} />
              <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                  formatter={(value: any) => [formatCurrency(value), 'Sales']}
              />
              <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
