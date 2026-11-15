"use client"

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { GameResult } from "@/lib/types"

interface FrequencyChartProps {
  results: GameResult[]
  type: "color" | "size" | "number"
}

export function FrequencyChart({ results, type }: FrequencyChartProps) {
  const getChartData = () => {
    switch (type) {
      case "color": {
        const colorCounts = { red: 0, green: 0, violet: 0 }
        results.forEach((result) => {
          for (const color of result.colors?.length ? result.colors : [result.color]) {
            colorCounts[color]++
          }
        })
        return [
          { name: "RED", value: colorCounts.red, fill: "#fb7185" },
          { name: "GREEN", value: colorCounts.green, fill: "#34d399" },
          { name: "VIOLET", value: colorCounts.violet, fill: "#a78bfa" },
        ]
      }
      case "size": {
        const sizeCounts = { big: 0, small: 0 }
        results.forEach((result) => {
          if (result.size) sizeCounts[result.size]++
        })
        return [
          { name: "BIG", value: sizeCounts.big, fill: "#3b82f6" },
          { name: "SMALL", value: sizeCounts.small, fill: "#f97316" },
        ]
      }
      case "number": {
        const numberCounts: Record<number, number> = {}
        for (let i = 0; i < 10; i++) {
          numberCounts[i] = 0
        }
        results.forEach((result) => {
          numberCounts[result.number]++
        })
        return Object.entries(numberCounts).map(([num, count]) => ({
          name: num,
          value: count,
          fill: "var(--primary)",
        }))
      }
      default:
        return []
    }
  }

  const chartData = getChartData()

  const chartConfig = {
    value: {
      label: "Frequency",
      color: "hsl(var(--chart-1))",
    },
  }

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.7} />
          <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} fontFamily="sans-serif" />
          <YAxis stroke="var(--muted-foreground)" fontSize={10} fontFamily="sans-serif" />
          <ChartTooltip
            content={<ChartTooltipContent />}
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--popover-foreground)",
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((item) => <Cell key={item.name} fill={item.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
