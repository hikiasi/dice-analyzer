"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";
import type { HistogramBin } from "@/lib/types";

interface HistogramChartProps {
  histogram: HistogramBin[];
  mean_concentration: number;
  a1: number;
  a2: number;
}

export function HistogramChart({ histogram, mean_concentration, a1, a2 }: HistogramChartProps) {
  const chartData = histogram.map((bin, index) => ({
    name: bin.bin_center.toFixed(1),
    value: bin.probability * 100,
    bin_center: bin.bin_center,
    bin_start: bin.bin_start,
    bin_end: bin.bin_end,
    count: bin.count,
    in_interval: bin.bin_center >= a1 && bin.bin_center <= a2,
  }));

  const colorInInterval = "#22c55e"; // green-500
  const colorOutside = "#ef4444"; // red-500

  // Calculate the domain to ensure A1 and A2 lines are always visible
  const dataMin = chartData[0]?.bin_start ?? a1;
  const dataMax = chartData[chartData.length - 1]?.bin_end ?? a2;
  
  const absoluteMin = Math.min(a1, dataMin);
  const absoluteMax = Math.max(a2, dataMax);
  const padding = (absoluteMax - absoluteMin) * 0.05; // 5% padding

  const domainMin = Math.floor(absoluteMin - padding);
  const domainMax = Math.ceil(absoluteMax + padding);

  const formatXAxis = (tick: number) => tick.toFixed(1);

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.5} />
          <XAxis
            type="number"
            dataKey="bin_center"
            domain={[domainMin, domainMax]}
            tickCount={15}
            tickFormatter={formatXAxis} 
            tick={{ fill: "#FFFFFF", fontSize: 11 }}
            tickLine={{ stroke: "#888888" }}
            axisLine={{ stroke: "#888888" }}
            label={{
              value: "Концентрация ТУ, м.ч.",
              position: "bottom",
              offset: 40,
              fill: "#FFFFFF",
              fontSize: 12,
            }}
          />
          <YAxis
            tick={{ fill: "#FFFFFF", fontSize: 11 }}
            tickLine={{ stroke: "#888888" }}
            axisLine={{ stroke: "#888888" }}
            label={{
              value: "Доля ячеек, %",
              angle: -90,
              position: "insideLeft",
              fill: "#FFFFFF",
              fontSize: 12,
            }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                    <p className="text-sm font-medium text-foreground">
                      Интервал: {data.bin_start.toFixed(1)} - {data.bin_end.toFixed(1)} м.ч.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Количество ячеек: {data.count}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Доля: {data.value.toFixed(2)}%
                    </p>
                    <p className={`text-sm ${data.in_interval ? "text-green-500" : "text-red-500"}`}>
                      {data.in_interval ? "В интервале [A1, A2]" : "Вне интервала"}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          
          {/* Reference lines for A1, M[X], A2 */}
          <ReferenceLine
            x={a1.toFixed(1)}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: `A1=${a1.toFixed(1)}`,
              position: "top",
              fill: "#3b82f6",
              fontSize: 10,
            }}
          />
          <ReferenceLine
            x={mean_concentration.toFixed(1)}
            stroke="#f59e0b"
            strokeWidth={2}
            label={{
              value: `M[X]=${mean_concentration.toFixed(1)}`,
              position: "top",
              fill: "#f59e0b",
              fontSize: 10,
            }}
          />
          <ReferenceLine
            x={a2.toFixed(1)}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: `A2=${a2.toFixed(1)}`,
              position: "top",
              fill: "#3b82f6",
              fontSize: 10,
            }}
          />

          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.in_interval ? colorInInterval : colorOutside}
                opacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
