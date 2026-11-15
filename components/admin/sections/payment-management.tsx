"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePaymentMethods } from "@/hooks/use-payment-methods"
import { PaymentManager, type PaymentMethod, type PaymentMethodType } from "@/lib/payment-manager"
import { SubscriptionManager, type SubscriptionTier } from "@/lib/subscription-manager"
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Wallet,
} from "lucide-react"

interface MethodForm {
  name: string
  type: PaymentMethodType
  identifier: string
  holder: string
  instructions: string
  qrImageUrl: string
  isActive: boolean
}

const emptyForm: MethodForm = {
  name: "",
  type: "upi",
  identifier: "",
  holder: "",
  instructions: "",
  qrImageUrl: "",
  isActive: true,
}

const METHOD_TYPES: PaymentMethodType[] = ["upi", "bank", "qr", "crypto", "wallet", "other"]

export function PaymentManagement() {
  const {
    methods,
    plans,
    requests,
    addMethod,
    updateMethod,
    deleteMethod,
    toggleMethod,
    updatePlan,
    setRequestStatus,
    deleteRequest,
  } = usePaymentMethods()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<MethodForm>(emptyForm)

  const pendingCount = requests.filter((r) => r.status === "pending").length

  const startAdd = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  const startEdit = (method: PaymentMethod) => {
    setForm({
      name: method.name,
      type: method.type,
      identifier: method.identifier,
      holder: method.holder || "",
      instructions: method.instructions,
      qrImageUrl: method.qrImageUrl || "",
      isActive: method.isActive,
    })
    setEditingId(method.id)
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.name.trim() || !form.identifier.trim()) return
    const payload = {
      name: form.name.trim(),
      type: form.type,
      identifier: form.identifier.trim(),
      holder: form.holder.trim() || undefined,
      instructions: form.instructions.trim(),
      qrImageUrl: form.qrImageUrl.trim() || undefined,
      isActive: form.isActive,
    }
    if (editingId) {
      updateMethod(editingId, payload)
    } else {
      addMethod(payload)
    }
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleApprove = (requestId: string) => {
    const req = requests.find((r) => r.id === requestId)
    if (!req) return
    const plan = plans.find((p) => p.tier === req.tier)
    // Activate the user's subscription for the purchased tier
    SubscriptionManager.createSubscription(req.userId, req.tier as SubscriptionTier, plan?.durationDays ?? 30)
    setRequestStatus(requestId, "approved")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-mono text-2xl font-bold text-green-400">
          <CreditCard className="h-6 w-6" />
          Payment Control Center
        </h2>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <Badge className="border-yellow-500 bg-yellow-500/20 text-yellow-400">{pendingCount} PENDING</Badge>
          )}
          <Button
            onClick={startAdd}
            className="border-green-500 bg-green-600/20 font-mono text-green-400 hover:bg-green-600/40"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Payment Mode
          </Button>
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <Card className="border-green-500 bg-black/80 backdrop-blur">
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-mono font-bold text-green-400">
                {editingId ? "EDIT PAYMENT MODE" : "NEW PAYMENT MODE"}
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowForm(false)}
                className="text-green-300/70 hover:text-green-400"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label className="font-mono text-xs text-green-300">Display Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. PhonePe UPI"
                  className="mt-1 border-green-500/50 bg-black/50 font-mono text-green-400"
                />
              </div>
              <div>
                <Label className="font-mono text-xs text-green-300">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((p) => ({ ...p, type: v as PaymentMethodType }))}
                >
                  <SelectTrigger className="mt-1 border-green-500/50 bg-black/50 font-mono text-green-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-green-500 bg-black">
                    {METHOD_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="font-mono text-green-400">
                        {PaymentManager.getMethodTypeLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-mono text-xs text-green-300">Pay-to Identifier (UPI / A/C / Address)</Label>
                <Input
                  value={form.identifier}
                  onChange={(e) => setForm((p) => ({ ...p, identifier: e.target.value }))}
                  placeholder="e.g. jalwa@upi"
                  className="mt-1 border-green-500/50 bg-black/50 font-mono text-green-400"
                />
              </div>
              <div>
                <Label className="font-mono text-xs text-green-300">Account Holder / Bank (optional)</Label>
                <Input
                  value={form.holder}
                  onChange={(e) => setForm((p) => ({ ...p, holder: e.target.value }))}
                  placeholder="e.g. Jalwa Prediction / HDFC Bank"
                  className="mt-1 border-green-500/50 bg-black/50 font-mono text-green-400"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="font-mono text-xs text-green-300">QR Image URL (optional)</Label>
                <Input
                  value={form.qrImageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, qrImageUrl: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1 border-green-500/50 bg-black/50 font-mono text-green-400"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="font-mono text-xs text-green-300">Payment Instructions</Label>
                <Textarea
                  value={form.instructions}
                  onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
                  placeholder="Instructions shown to the user on the payment page"
                  rows={2}
                  className="mt-1 border-green-500/50 bg-black/50 font-mono text-green-400"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(c) => setForm((p) => ({ ...p, isActive: c }))}
                  className="data-[state=checked]:bg-green-500"
                />
                <Label className="font-mono text-xs text-green-300">Active (visible to users)</Label>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Button
                onClick={handleSave}
                disabled={!form.name.trim() || !form.identifier.trim()}
                className="border-green-500 bg-green-600/20 font-mono text-green-400 hover:bg-green-600/40"
              >
                <Save className="mr-2 h-4 w-4" />
                {editingId ? "Update" : "Save"} Mode
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Payment methods list */}
      <Card className="border-green-500 bg-black/80 backdrop-blur">
        <div className="p-6">
          <h3 className="mb-4 flex items-center gap-2 font-mono text-xl font-bold text-green-400">
            <Wallet className="h-5 w-5" />
            PAYMENT MODES ({methods.length})
          </h3>
          {methods.length === 0 ? (
            <p className="font-mono text-sm text-green-300/70">No payment modes yet. Add one to get started.</p>
          ) : (
            <div className="space-y-3">
              {methods.map((method) => (
                <div
                  key={method.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border border-green-500/30 bg-green-500/5 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-green-400">{method.name}</span>
                      <Badge className="border-green-500/40 bg-green-500/10 text-green-300">
                        {PaymentManager.getMethodTypeLabel(method.type)}
                      </Badge>
                      {method.isActive ? (
                        <Badge className="border-green-500 bg-green-500/20 text-green-400">ACTIVE</Badge>
                      ) : (
                        <Badge className="border-gray-500 bg-gray-500/20 text-gray-400">HIDDEN</Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-green-300/70">{method.identifier}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={method.isActive}
                      onCheckedChange={(c) => toggleMethod(method.id, c)}
                      className="data-[state=checked]:bg-green-500"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(method)}
                      className="border-green-500/40 font-mono text-green-400 hover:bg-green-500/10"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMethod(method.id)}
                      className="border-red-500/40 font-mono text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Plan pricing */}
      <Card className="border-green-500 bg-black/80 backdrop-blur">
        <div className="p-6">
          <h3 className="mb-4 flex items-center gap-2 font-mono text-xl font-bold text-green-400">
            <DollarSign className="h-5 w-5" />
            PLAN PRICING
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.tier} className="rounded border border-green-500/30 bg-green-500/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <Badge className={SubscriptionManager.getTierColor(plan.tier)}>
                    {SubscriptionManager.getTierDisplayName(plan.tier)}
                  </Badge>
                  <Switch
                    checked={plan.isActive}
                    onCheckedChange={(c) => updatePlan(plan.tier, { isActive: c })}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="font-mono text-xs text-green-300">Price (₹)</Label>
                    <Input
                      type="number"
                      value={plan.price}
                      onChange={(e) => updatePlan(plan.tier, { price: Number(e.target.value) })}
                      className="mt-1 border-green-500/50 bg-black/50 font-mono text-green-400"
                    />
                  </div>
                  <div>
                    <Label className="font-mono text-xs text-green-300">Duration (days)</Label>
                    <Input
                      type="number"
                      value={plan.durationDays}
                      onChange={(e) => updatePlan(plan.tier, { durationDays: Number(e.target.value) })}
                      className="mt-1 border-green-500/50 bg-black/50 font-mono text-green-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Payment requests */}
      <Card className="border-green-500 bg-black/80 backdrop-blur">
        <div className="p-6">
          <h3 className="mb-4 flex items-center gap-2 font-mono text-xl font-bold text-green-400">
            <Clock className="h-5 w-5" />
            PAYMENT REQUESTS ({requests.length})
          </h3>
          {requests.length === 0 ? (
            <p className="font-mono text-sm text-green-300/70">No payment requests yet.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div key={req.id} className="rounded border border-green-500/30 bg-green-500/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-green-400">{req.userName}</span>
                        <Badge className={SubscriptionManager.getTierColor(req.tier)}>
                          {SubscriptionManager.getTierDisplayName(req.tier)}
                        </Badge>
                        <span className="font-mono text-sm text-yellow-400">₹{req.amount}</span>
                      </div>
                      <p className="mt-1 font-mono text-xs text-green-300/70">
                        {req.methodName} · TXN: {req.transactionId}
                      </p>
                      {req.note && (
                        <p className="mt-1 font-mono text-xs text-green-300/50">Note: {req.note}</p>
                      )}
                      <p className="mt-1 font-mono text-xs text-green-300/50">
                        {new Date(req.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {req.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(req.id)}
                            className="border-green-500 bg-green-600/20 font-mono text-green-400 hover:bg-green-600/40"
                          >
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRequestStatus(req.id, "rejected")}
                            className="border-red-500/40 font-mono text-red-400 hover:bg-red-500/10"
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge
                            className={
                              req.status === "approved"
                                ? "border-green-500 bg-green-500/20 text-green-400"
                                : "border-red-500 bg-red-500/20 text-red-400"
                            }
                          >
                            {req.status.toUpperCase()}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteRequest(req.id)}
                            className="border-gray-500/40 font-mono text-gray-400 hover:bg-gray-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
