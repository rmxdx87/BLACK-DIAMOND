import { z } from "zod"

export const CreateAdminAccountSchema = z.object({
  email: z.string().trim().email().max(254),
  displayName: z.string().trim().min(1).max(120),
  password: z.string().min(12).max(128),
  role: z.enum(["super_admin", "admin", "viewer"]),
}).strict()

export type CreateAdminAccountInput = z.infer<typeof CreateAdminAccountSchema>
