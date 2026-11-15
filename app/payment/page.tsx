import { Suspense } from "react"
import { PaymentCheckout } from "@/components/payment/payment-checkout"

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="font-mono text-sm text-muted-foreground">Loading checkout...</p>
        </div>
      }
    >
      <PaymentCheckout />
    </Suspense>
  )
}
