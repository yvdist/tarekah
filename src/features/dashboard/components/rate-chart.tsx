"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  responseRate: { label: "Response rate", color: "var(--chart-1)" },
  interviewRate: { label: "Sampai interview", color: "var(--chart-2)" },
} satisfies ChartConfig;

const SERIES = ["responseRate", "interviewRate"] as const;

const ROW_HEIGHT = 56;
const CHROME_HEIGHT = 40;

export type RateRow = {
  label: string;
  responseRate: number;
  interviewRate: number;
};

// Both series are percentages of the same base, so they share one axis.
export function RateChart({ data }: { data: ReadonlyArray<RateRow> }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Recharts lists the legend of a horizontal bar chart bottom-up, so the
          legend is plain markup in the order the bars are drawn. */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {SERIES.map((key) => (
          <li key={key} className="flex items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: chartConfig[key].color }}
            />
            {chartConfig[key].label}
          </li>
        ))}
      </ul>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full"
        style={{ height: data.length * ROW_HEIGHT + CHROME_HEIGHT }}
      >
        <BarChart
          accessibilityLayer
          data={[...data]}
          layout="vertical"
          margin={{ left: 0, right: 12 }}
          barGap={2}
        >
          <CartesianGrid horizontal={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={112}
            tickLine={false}
            axisLine={false}
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(value: number) => `${value}%`}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="size-2.5 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: `var(--color-${name})` }}
                      />
                      {name === "responseRate"
                        ? chartConfig.responseRate.label
                        : chartConfig.interviewRate.label}
                    </span>
                    <span className="font-medium text-foreground tabular-nums">
                      {Number(value).toLocaleString("id-ID")}%
                    </span>
                  </div>
                )}
              />
            }
          />
          <Bar
            dataKey="responseRate"
            fill="var(--color-responseRate)"
            radius={[0, 4, 4, 0]}
            maxBarSize={16}
          />
          <Bar
            dataKey="interviewRate"
            fill="var(--color-interviewRate)"
            radius={[0, 4, 4, 0]}
            maxBarSize={16}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
