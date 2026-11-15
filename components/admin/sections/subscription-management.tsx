"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUserAccess } from "@/hooks/use-user-access"
import { useSubscriptionStats } from "@/hooks/use-subscription"
import { SubscriptionManager, type SubscriptionTier, type SubscriptionFeatures } from "@/lib/subscription-manager"
import {
  Crown,
  Star,
  Shield,
  Users,
  DollarSign,
  TrendingUp,
  Settings,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react"

export function SubscriptionManagement() {
  const { users } = useUserAccess()
  const { stats, refreshStats } = useSubscriptionStats()
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>("free")
  const [customPermissions, setCustomPermissions] = useState<Partial<SubscriptionFeatures>>({})
  const [subscriptionDays, setSubscriptionDays] = useState<number>(30)

  const handleCreateSubscription = () => {
    if (!selectedUser) return

    SubscriptionManager.createSubscription(selectedUser, selectedTier, subscriptionDays)

    // Apply custom permissions if any are set
    if (Object.keys(customPermissions).length > 0) {
      SubscriptionManager.setCustomPermissions(selectedUser, customPermissions)
    }

    refreshStats()
    console.log(`[v0] Created subscription for user ${selectedUser}`)
  }

  const handleUpdateUserTier = (userId: string, newTier: SubscriptionTier) => {
    SubscriptionManager.updateUserTier(userId, newTier)
    refreshStats()
    console.log(`[v0] Updated user ${userId} to ${newTier} tier`)
  }

  const handleToggleFeature = (userId: string, feature: keyof SubscriptionFeatures, enabled: boolean) => {
    const currentSubscription = SubscriptionManager.getUserSubscription(userId)
    if (!currentSubscription) return

    const newPermissions = {
      ...currentSubscription.customPermissions,
      [feature]: enabled,
    }

    SubscriptionManager.setCustomPermissions(userId, newPermissions)
    refreshStats()
    console.log(`[v0] Toggled ${feature} for user ${userId}: ${enabled}`)
  }

  const getTierIcon = (tier: SubscriptionTier) => {
    switch (tier) {
      case "free":
        return <Users className="h-4 w-4" />
      case "basic":
        return <Shield className="h-4 w-4" />
      case "premium":
        return <Star className="h-4 w-4" />
      case "vip":
        return <Crown className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Subscription Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black/80 border-green-500 backdrop-blur">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-green-400" />
              <div>
                <div className="text-2xl font-mono text-green-400 font-bold">{stats.totalUsers}</div>
                <div className="text-green-300/70 font-mono text-sm">Total Users</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-black/80 border-blue-500 backdrop-blur">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-blue-400" />
              <div>
                <div className="text-2xl font-mono text-blue-400 font-bold">{stats.activeSubscriptions}</div>
                <div className="text-blue-300/70 font-mono text-sm">Active Subscriptions</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-black/80 border-yellow-500 backdrop-blur">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-6 w-6 text-yellow-400" />
              <div>
                <div className="text-2xl font-mono text-yellow-400 font-bold">${stats.revenue.monthly}</div>
                <div className="text-yellow-300/70 font-mono text-sm">Monthly Revenue</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-black/80 border-purple-500 backdrop-blur">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-purple-400" />
              <div>
                <div className="text-2xl font-mono text-purple-400 font-bold">
                  {stats.tierDistribution.premium + stats.tierDistribution.vip}
                </div>
                <div className="text-purple-300/70 font-mono text-sm">Premium Users</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tier Distribution */}
      <Card className="bg-black/80 border-green-500 backdrop-blur">
        <div className="p-6">
          <h3 className="text-xl font-mono text-green-400 font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            SUBSCRIPTION TIERS DISTRIBUTION
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.tierDistribution).map(([tier, count]) => (
              <div key={tier} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {getTierIcon(tier as SubscriptionTier)}
                  <Badge className={SubscriptionManager.getTierColor(tier as SubscriptionTier)}>
                    {SubscriptionManager.getTierDisplayName(tier as SubscriptionTier)}
                  </Badge>
                </div>
                <div className="text-2xl font-mono text-green-400 font-bold">{count}</div>
                <div className="text-green-300/70 font-mono text-xs">users</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Create New Subscription */}
      <Card className="bg-black/80 border-green-500 backdrop-blur">
        <div className="p-6">
          <h3 className="text-xl font-mono text-green-400 font-bold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            CREATE NEW SUBSCRIPTION
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <Label className="text-green-300 font-mono text-sm">Select User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="bg-black/50 border-green-500/50 text-green-400 font-mono">
                  <SelectValue placeholder="Choose user" />
                </SelectTrigger>
                <SelectContent className="bg-black border-green-500">
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id} className="text-green-400 font-mono">
                      {user.name} ({user.accessCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-green-300 font-mono text-sm">Subscription Tier</Label>
              <Select value={selectedTier} onValueChange={(value) => setSelectedTier(value as SubscriptionTier)}>
                <SelectTrigger className="bg-black/50 border-green-500/50 text-green-400 font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-green-500">
                  <SelectItem value="free" className="text-gray-400 font-mono">
                    Free
                  </SelectItem>
                  <SelectItem value="basic" className="text-blue-400 font-mono">
                    Basic
                  </SelectItem>
                  <SelectItem value="premium" className="text-purple-400 font-mono">
                    Premium
                  </SelectItem>
                  <SelectItem value="vip" className="text-yellow-400 font-mono">
                    VIP
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-green-300 font-mono text-sm">Duration (Days)</Label>
              <Input
                type="number"
                value={subscriptionDays}
                onChange={(e) => setSubscriptionDays(Number(e.target.value))}
                className="bg-black/50 border-green-500/50 text-green-400 font-mono"
                min="1"
                max="365"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleCreateSubscription}
                disabled={!selectedUser}
                className="bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/40 font-mono w-full"
              >
                <Calendar className="h-4 w-4 mr-2" />
                CREATE SUBSCRIPTION
              </Button>
            </div>
          </div>

          {/* Custom Permissions */}
          <div className="border-t border-green-500/30 pt-4">
            <h4 className="text-green-400 font-mono font-bold mb-3">CUSTOM PERMISSIONS</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(SubscriptionManager.TIER_FEATURES.vip).map(([feature, defaultValue]) => (
                <div key={feature} className="flex items-center justify-between p-2 border border-green-500/30 rounded">
                  <Label className="text-green-300 font-mono text-xs capitalize">
                    {feature.replace(/([A-Z])/g, " $1").toLowerCase()}
                  </Label>
                  <Switch
                    checked={customPermissions[feature as keyof SubscriptionFeatures] ?? defaultValue}
                    onCheckedChange={(checked) => setCustomPermissions((prev) => ({ ...prev, [feature]: checked }))}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* User Subscriptions Management */}
      <Card className="bg-black/80 border-green-500 backdrop-blur">
        <div className="p-6">
          <h3 className="text-xl font-mono text-green-400 font-bold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            USER SUBSCRIPTIONS MANAGEMENT
          </h3>

          <div className="space-y-4">
            {users.map((user) => {
              const subscription = SubscriptionManager.getUserSubscription(user.id)
              const features = SubscriptionManager.getUserFeatures(user.id)

              return (
                <div key={user.id} className="border border-green-500/30 rounded p-4 bg-green-500/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-green-400 font-mono font-bold">{user.name}</div>
                        <div className="text-green-300/70 font-mono text-sm">Code: {user.accessCode}</div>
                      </div>
                      <Badge className={SubscriptionManager.getTierColor(subscription?.tier || "free")}>
                        {getTierIcon(subscription?.tier || "free")}
                        <span className="ml-1">
                          {SubscriptionManager.getTierDisplayName(subscription?.tier || "free")}
                        </span>
                      </Badge>
                      {subscription?.isActive ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          ACTIVE
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500">
                          <XCircle className="h-3 w-3 mr-1" />
                          INACTIVE
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={subscription?.tier || "free"}
                        onValueChange={(value) => handleUpdateUserTier(user.id, value as SubscriptionTier)}
                      >
                        <SelectTrigger className="bg-black/50 border-green-500/50 text-green-400 font-mono w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-green-500">
                          <SelectItem value="free" className="text-gray-400 font-mono">
                            Free
                          </SelectItem>
                          <SelectItem value="basic" className="text-blue-400 font-mono">
                            Basic
                          </SelectItem>
                          <SelectItem value="premium" className="text-purple-400 font-mono">
                            Premium
                          </SelectItem>
                          <SelectItem value="vip" className="text-yellow-400 font-mono">
                            VIP
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Feature Toggles */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(features).map(([feature, enabled]) => (
                      <div
                        key={feature}
                        className="flex items-center justify-between p-2 border border-green-500/20 rounded bg-black/30"
                      >
                        <Label className="text-green-300 font-mono text-xs capitalize">
                          {feature.replace(/([A-Z])/g, " $1").toLowerCase()}
                        </Label>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) =>
                            handleToggleFeature(user.id, feature as keyof SubscriptionFeatures, checked)
                          }
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>
                    ))}
                  </div>

                  {subscription?.endDate && (
                    <div className="mt-3 text-green-300/70 font-mono text-sm">
                      Expires: {new Date(subscription.endDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
