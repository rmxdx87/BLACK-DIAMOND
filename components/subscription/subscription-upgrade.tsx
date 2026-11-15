"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Crown, Zap, Star, Diamond } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePaymentMethods } from "@/hooks/use-payment-methods"

interface SubscriptionUpgradeProps {
  currentTier: string
  feature?: string
}

export function SubscriptionUpgrade({ currentTier, feature }: SubscriptionUpgradeProps) {
  const router = useRouter()
  const { plans } = usePaymentMethods()

  const getPrice = (tierName: string) => {
    const plan = plans.find((p) => p.tier === tierName)
    return plan ? `₹${plan.price}/${plan.durationDays}d` : ""
  }

  const getUpgradeMessage = () => {
    switch (feature) {
      case "colorPredictions":
        return "Upgrade to Basic or higher to access color predictions"
      case "sizePredictions":
        return "Upgrade to Basic or higher to access size predictions"
      case "numberPredictions":
        return "Upgrade to Premium or VIP to access number predictions"
      case "historicalData":
        return "Upgrade to Basic or higher to access historical data"
      case "advancedAnalytics":
        return "Upgrade to Premium or VIP to access advanced analytics"
      case "charts":
        return "Upgrade to VIP to access charts and graphs"
      default:
        return "Upgrade your subscription to unlock premium features"
    }
  }

  const getRecommendedTier = () => {
    switch (feature) {
      case "colorPredictions":
      case "sizePredictions":
      case "historicalData":
        return "basic"
      case "numberPredictions":
      case "advancedAnalytics":
        return "premium"
      case "charts":
        return "vip"
      default:
        return "basic"
    }
  }

  const tiers = [
    {
      name: "Basic",
      price: getPrice("basic") || "₹99/30d",
      icon: <Zap className="h-5 w-5" />,
      features: ["Color Predictions", "Size Predictions", "Historical Data"],
      color: "border-blue-500 text-blue-400",
      bgColor: "bg-blue-600/20",
    },
    {
      name: "Premium",
      price: getPrice("premium") || "₹199/30d",
      icon: <Star className="h-5 w-5" />,
      features: ["All Basic Features", "Number Predictions", "Advanced Analytics", "Priority Support"],
      color: "border-purple-500 text-purple-400",
      bgColor: "bg-purple-600/20",
    },
    {
      name: "VIP",
      price: getPrice("vip") || "₹299/30d",
      icon: <Diamond className="h-5 w-5" />,
      features: ["All Premium Features", "Charts & Graphs", "Custom Alerts", "API Access"],
      color: "border-yellow-500 text-yellow-400",
      bgColor: "bg-yellow-600/20",
    },
  ]

  const recommendedTier = getRecommendedTier()

  return (
    <Card className="bg-black/80 border-gray-500 backdrop-blur">
      <div className="p-4">
        <div className="text-center mb-4">
          <Crown className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
          <h3 className="text-lg font-mono text-gray-300 font-bold mb-2">UPGRADE REQUIRED</h3>
          <p className="text-gray-400 font-mono text-sm">{getUpgradeMessage()}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`${tier.bgColor} ${tier.color} backdrop-blur transition-all duration-300 hover:scale-105 ${
                tier.name.toLowerCase() === recommendedTier ? "ring-2 ring-current" : ""
              }`}
            >
              <div className="p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {tier.icon}
                  <h4 className="font-mono font-bold text-sm">{tier.name}</h4>
                  {tier.name.toLowerCase() === recommendedTier && (
                    <span className="text-xs bg-current/20 px-2 py-1 rounded font-mono">RECOMMENDED</span>
                  )}
                </div>
                <p className="font-mono text-lg font-bold mb-2">{tier.price}</p>
                <ul className="text-xs font-mono space-y-1 mb-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="opacity-90">
                      • {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${tier.bgColor} ${tier.color} hover:opacity-80 font-mono text-xs transition-all duration-300`}
                  onClick={() => router.push(`/payment?tier=${tier.name.toLowerCase()}`)}
                >
                  UPGRADE NOW
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-4 text-center">
          <p className="text-gray-500 font-mono text-xs">Contact admin for custom pricing and enterprise solutions</p>
        </div>
      </div>
    </Card>
  )
}
