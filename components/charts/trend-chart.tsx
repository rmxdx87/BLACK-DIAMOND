"use client"

import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { GameResult } from "@/lib/types"

interface TrendChartProps {
  results: GameResult[]
  type: "color" | "size" | "number"
}

export function TrendChart({ results, type }: TrendChartProps) {
  const chartData = results
    .filter((result) => type !== "size" || result.size !== null)
    .slice(0, 20)
    .reverse()
    .map((result, index) => {
      let value = 0
      let label = ""

      switch (type) {
        case "color":
          value = result.color === "red" ? 1 : result.color === "green" ? 2 : 3
          label = result.color
          break
        case "size":
          value = result.size === "small" ? 1 : 2
          label = result.size ?? ""
          break
        case "number":
          value = result.number
          label = result.number.toString()
          break
      }

      return {
        index: index + 1,
        value,
        label,
        period: result.period.slice(-4),
      }
    })

  const chartConfig = {
    value: {
      label: type.charAt(0).toUpperCase() + type.slice(1),
      color: "hsl(var(--chart-1))",
    },
  }

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.7} />
          <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={10} />
          <YAxis stroke="var(--muted-foreground)" fontSize={10} />
          <ChartTooltip
            content={<ChartTooltipContent />}
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--popover-foreground)",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ fill: "var(--primary)", strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, stroke: "var(--primary)", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
