"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

export type ChartView = "daily" | "weekly" | "monthly";

export interface SalesDataPoint {
  date: string;
  revenue: number;
}

const mockData: Record<ChartView, SalesDataPoint[]> = {
  daily: [
    { date: "Apr 22", revenue: 4500 },
    { date: "Apr 23", revenue: 5200 },
    { date: "Apr 24", revenue: 4800 },
    { date: "Apr 25", revenue: 6100 },
    { date: "Apr 26", revenue: 5900 },
    { date: "Apr 27", revenue: 7200 },
    { date: "Apr 28", revenue: 6800 },
  ],
  weekly: [
    { date: "Week 1", revenue: 35000 },
    { date: "Week 2", revenue: 42000 },
    { date: "Week 3", revenue: 38000 },
    { date: "Week 4", revenue: 45000 },
  ],
  monthly: [
    { date: "Jan", revenue: 120000 },
    { date: "Feb", revenue: 135000 },
    { date: "Mar", revenue: 142000 },
    { date: "Apr", revenue: 160000 },
  ]
};

export default function RevenueLineChart() {
  const [view, setView] = useState<ChartView>("daily");

  const data = mockData[view];

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end mb-2">
        <div className="flex bg-slate-900/50 rounded-lg p-1 border border-slate-700">
          {(["daily", "weekly", "monthly"] as ChartView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                view === v ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `₵${v}`} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
              formatter={(v: any) => [`₵${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Revenue"]}
              labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#4ade80" 
              strokeWidth={3} 
              dot={{ r: 4, fill: "#4ade80", strokeWidth: 0 }} 
              activeDot={{ r: 6, fill: "#22c55e", stroke: "#fff", strokeWidth: 2 }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
