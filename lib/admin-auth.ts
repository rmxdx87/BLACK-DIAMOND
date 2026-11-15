export type AdminRole = "super_admin" | "admin" | "viewer"

export interface AdminUser {
  id: string
  username: string
  email: string
  role: AdminRole
}

export interface AdminSession {
  user: AdminUser
}
