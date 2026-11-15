"use client"

import { Card } from "@/components/ui/card"
import type { GameStats } from "@/lib/types"

interface StatsGridProps {
  stats: GameStats | null
}

export function StatsGrid({ stats }: StatsGridProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="dashboard-card animate-pulse p-4">
            <div className="mb-3 h-3 w-24 rounded bg-muted" />
            <div className="h-7 w-16 rounded bg-muted" />
            <div className="mt-3 h-3 w-20 rounded bg-muted" />
          </Card>
        ))}
      </div>
    )
  }

  const totalSizeResults = Object.values(stats.patterns.sizeFrequency).reduce((sum, count) => sum + count, 0)
  const totalNumberResults = Object.values(stats.patterns.numberFrequency).reduce((sum, count) => sum + count, 0)
  const cards = [
    {
      label: "Most frequent number",
      value: totalNumberResults && stats.hotNumbers.length ? stats.hotNumbers[0] : "—",
      detail: totalNumberResults && stats.hotNumbers.length ? `${stats.patterns.numberFrequency[stats.hotNumbers[0]] ?? 0} occurrences` : "No results loaded",
    },
    {
      label: "Least frequent number",
      value: totalNumberResults && stats.coldNumbers.length ? stats.coldNumbers[0] : "—",
      detail: totalNumberResults && stats.coldNumbers.length ? `${stats.patterns.numberFrequency[stats.coldNumbers[0]] ?? 0} occurrences` : "No results loaded",
    },
    {
      label: "Primary colour streak",
      value: stats.streaks.color.count ? stats.streaks.color.type : "—",
      detail: stats.streaks.color.count ? `${stats.streaks.color.count} consecutive results` : "No streak available",
    },
    {
      label: "Size streak",
      value: totalSizeResults ? stats.streaks.size.type : "Unavailable",
      detail: totalSizeResults ? `${stats.streaks.size.count} consecutive results` : "The source does not provide size",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map(({ label, value, detail }) => (
        <Card key={label} className="dashboard-card p-4">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-3 text-2xl font-semibold capitalize text-foreground">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
        </Card>
      ))}
      <p className="col-span-full text-xs text-muted-foreground">
        Colour frequency is counted by API membership; one result may contribute to more than one colour.
      </p>
    </div>
  )
}
