"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { adminApiFetch } from "@/lib/admin-api-client"
import type { AdminRole } from "@/lib/admin-auth"

interface AdminAccount {
  uid: string
  email: string
  displayName: string
  role: AdminRole
  disabled: boolean
}

interface AdminAccountListResponse {
  accounts: AdminAccount[]
  nextPageToken: string | null
}

interface CreateAdminAccountResponse {
  account: AdminAccount
}

const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  super_admin: "Full control, including account management and destructive actions.",
  admin: "Operational controls, without account management or destructive actions.",
  viewer: "Can view the admin panel; all panel controls are read-only.",
}

export function AdminAccounts() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<AdminRole>("admin")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const fetchAccounts = useCallback(async (pageToken?: string) => {
    const query = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : ""
    return adminApiFetch<AdminAccountListResponse>(`/api/admin/accounts${query}`)
  }, [])

  useEffect(() => {
    let active = true
    void fetchAccounts()
      .then((result) => {
        if (!active) return
        setAccounts(result.accounts)
        setNextPageToken(result.nextPageToken)
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Could not load administrator accounts.")
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [fetchAccounts])

  const loadAccounts = async (pageToken?: string, append = false) => {
    setIsLoading(true)
    setError("")
    try {
      const result = await fetchAccounts(pageToken)
      setAccounts((current) => append ? [...current, ...result.accounts] : result.accounts)
      setNextPageToken(result.nextPageToken)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load administrator accounts.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError("")
    setNotice("")

    try {
      const result = await adminApiFetch<CreateAdminAccountResponse>("/api/admin/accounts", {
        method: "POST",
        body: JSON.stringify({ email, displayName, password, role }),
      })
      setAccounts((current) => [
        result.account,
        ...current.filter((account) => account.uid !== result.account.uid),
      ])
      setEmail("")
      setDisplayName("")
      setPassword("")
      setNotice(`${result.account.email} was created as ${result.account.role.replace("_", " ")}.`)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create the account.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Access control</p>
        <h2 className="mt-2 text-2xl font-semibold">Administrator accounts</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create Firebase Authentication accounts with one of three server-verified roles.
        </p>
      </div>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="text-base">Create an account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin-account-name">Display name</Label>
              <Input
                id="admin-account-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={120}
                autoComplete="name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-account-email">Email</Label>
              <Input
                id="admin-account-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-account-password">Initial password</Label>
              <Input
                id="admin-account-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
              <p className="text-xs text-muted-foreground">Use at least 12 characters. Share it securely with the account holder.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-account-role">Role</Label>
              <select
                id="admin-account-role"
                value={role}
                onChange={(event) => {
                  const value = event.target.value
                  if (value === "super_admin" || value === "admin" || value === "viewer") {
                    setRole(value)
                  }
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="super_admin">Super admin</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer (read-only)</option>
              </select>
              <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
            </div>

            {error && <p role="alert" className="text-sm text-destructive md:col-span-2">{error}</p>}
            {notice && <p role="status" className="text-sm text-emerald-500 md:col-span-2">{notice}</p>}

            <div className="md:col-span-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating account…" : "Create account"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="text-base">Provisioned accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading accounts…</p>}
          {!isLoading && accounts.length === 0 && !error && (
            <p className="text-sm text-muted-foreground">No administrator accounts found.</p>
          )}
          {accounts.map((account) => (
            <div key={account.uid} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{account.displayName || account.email}</p>
                <p className="truncate text-sm text-muted-foreground">{account.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {account.disabled && <Badge variant="outline">Disabled</Badge>}
                <Badge variant="outline">{account.role.replace("_", " ")}</Badge>
              </div>
            </div>
          ))}
          {nextPageToken && (
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => void loadAccounts(nextPageToken, true)}
            >
              Load more
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
