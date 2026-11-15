"use client"

import { AdminGuard } from "@/components/admin/admin-guard"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminDashboard />
    </AdminGuard>
  )
}
