"use client"

import type { ReactNode } from "react"

export function AppShell({ children }: { children: ReactNode }) {
  return <div className="contents">{children}</div>
}
