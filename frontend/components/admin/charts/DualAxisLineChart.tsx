"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

export default function DualAxisLineChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }}
          tickFormatter={(v) => new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        />
        <YAxis yAxisId="revenue" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `₵${v}`} />
        <YAxis yAxisId="orders" orientation="right" stroke="#64748b" tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
          labelFormatter={(v) => new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          formatter={(v: any, name: any) => [
            name === "revenue" ? `₵${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : v,
            name === "revenue" ? "Revenue" : "Orders"
          ]}
        />
        <Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} name="revenue" />
        <Line yAxisId="orders" type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={false} name="orders" />
      </LineChart>
    </ResponsiveContainer>
  );
}
