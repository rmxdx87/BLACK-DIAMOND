"use client"

import { KeyRound, ShieldCheck, UserRound } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminAuth } from "@/hooks/use-admin-auth"

export function AdminCredentials() {
  const { session } = useAdminAuth()
  const user = session?.user

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Firebase Authentication</p>
        <h2 className="mt-2 text-2xl font-semibold">Administrator identity</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Admin access is derived from verified Firebase custom claims, not browser-stored credentials.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4 text-primary" />
              Signed-in account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Display name</span>
              <span className="truncate font-medium">{user?.username ?? "Unavailable"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Email</span>
              <span className="truncate font-medium">{user?.email ?? "Unavailable"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Verified role</span>
              <Badge variant="outline">{user?.role.replace("_", " ") ?? "Unknown"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Secure account management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Super administrators can create and assign roles in the Admin Accounts section. Role claims are
              verified by the server on every protected request.
            </p>
            <p className="flex items-start gap-2">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Passwords are never listed here; the signed-in account role is shown above.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
