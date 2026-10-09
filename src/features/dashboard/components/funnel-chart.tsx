"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  count: { label: "Lamaran", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function FunnelChart({
  data,
}: {
  data: ReadonlyArray<{ label: string; count: number }>;
}) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
      <BarChart
        accessibilityLayer
        data={[...data]}
        layout="vertical"
        margin={{ left: 0, right: 32 }}
      >
        <YAxis
          type="category"
          dataKey="label"
          width={84}
          tickLine={false}
          axisLine={false}
        />
        <XAxis type="number" hide />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
        >
          <LabelList
            dataKey="count"
            position="right"
            offset={8}
            className="fill-foreground"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
