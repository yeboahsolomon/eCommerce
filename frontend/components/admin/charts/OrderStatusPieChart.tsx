"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from "recharts";

export interface OrderStatusData {
  name: string;
  value: number;
  color: string;
}

const mockData: OrderStatusData[] = [
  { name: "Pending", value: 45, color: "#94a3b8" },    // grey
  { name: "Processing", value: 120, color: "#3b82f6" }, // blue
  { name: "Shipped", value: 85, color: "#f59e0b" },    // amber
  { name: "Delivered", value: 210, color: "#22c55e" }, // green
  { name: "Cancelled", value: 15, color: "#ef4444" },  // red
];

export default function OrderStatusPieChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={mockData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="45%"
          outerRadius={80}
          innerRadius={60}
          paddingAngle={5}
          animationDuration={1500}
        >
          {mockData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#fff", padding: "8px" }}
          itemStyle={{ color: "#fff", fontSize: "14px" }}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          iconType="circle"
          wrapperStyle={{ fontSize: "12px", color: "#cbd5e1", paddingTop: "10px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
