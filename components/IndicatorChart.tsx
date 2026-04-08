"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DataPoint = {
  date: string;
  premium: number;
};

export default function IndicatorChart({ data }: { data: DataPoint[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-5 mt-8">
      <h2 className="text-xl font-semibold mb-4">Premium to NAV Over Time</h2>

      <div className="w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis unit="%" />
            <Tooltip />
            <ReferenceLine y={0} stroke="red" />
            <Line type="monotone" dataKey="premium" stroke="#2563eb" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}