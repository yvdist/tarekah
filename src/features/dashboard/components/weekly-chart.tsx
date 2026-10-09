"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  count: { label: "Lamaran", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function WeeklyChart({
  data,
}: {
  // `label` is the Monday that starts the week, already formatted.
  data: ReadonlyArray<{ label: string; count: number }>;
}) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
      <BarChart accessibilityLayer data={[...data]} margin={{ top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
        />
        <YAxis
          width={28}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(label) => `Minggu ${String(label)}`}
            />
          }
        />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ChartContainer>
  );
}
