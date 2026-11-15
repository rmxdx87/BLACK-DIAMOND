import type { Metadata } from "next"
import { WinGo1mPredictionPage } from "@/components/prediction/wingo-1m-prediction-page"

export const metadata: Metadata = {
  title: "WinGo 1M · My Hack",
  description: "Historical WinGo 1M results and transparent analysis status.",
}

export default function WinGo1mPage() {
  return <WinGo1mPredictionPage />
}
