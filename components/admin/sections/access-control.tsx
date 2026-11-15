"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useAdminSettings } from "@/hooks/use-admin-settings"
import { useUserAccess } from "@/hooks/use-user-access"
import { Shield, ShieldOff, Users, UserCheck, UserX, Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AccessControl() {
  const { settings, updateSetting, toggleAccessControl } = useAdminSettings()
  const { users, addUser, updateUserStatus, deleteUser, generateAccessCode } = useUserAccess()
  const [newUserName, setNewUserName] = useState("")
  const [isAddingUser, setIsAddingUser] = useState(false)

  const handleToggleAccessControl = () => {
    const newValue = toggleAccessControl()
    console.log(`[v0] Access control ${newValue ? "enabled" : "disabled"}`)
  }

  const handleAddUser = () => {
    if (!newUserName.trim()) return

    setIsAddingUser(true)
    try {
      const newUser = addUser(newUserName.trim())
      console.log(`[v0] Added new user: ${newUser.name} with code: ${newUser.accessCode}`)
      setNewUserName("")
    } catch (error) {
      console.error("[v0] Error adding user:", error)
    } finally {
      setIsAddingUser(false)
    }
  }

  const handleUserStatusChange = (userId: string, status: "active" | "restricted" | "terminated") => {
    updateUserStatus(userId, status)
    console.log(`[v0] Updated user ${userId} status to: ${status}`)
  }

  const handleDeleteUser = (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUser(userId)
      console.log(`[v0] Deleted user: ${userId}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500"
      case "restricted":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500"
      case "terminated":
        return "bg-red-500/20 text-red-400 border-red-500"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500"
    }
  }

  return (
    <div className="space-y-6">
      {/* Access Control Toggle */}
      <Card className="bg-black/80 border-green-500 backdrop-blur">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {settings.requireAccessCode ? (
                <Shield className="h-6 w-6 text-green-400" />
              ) : (
                <ShieldOff className="h-6 w-6 text-red-400" />
              )}
              <div>
                <h3 className="text-xl font-mono text-green-400 font-bold">ACCESS CONTROL</h3>
                <p className="text-green-300/70 font-mono text-sm">
                  {settings.requireAccessCode
                    ? "Users must enter access code to use the site"
                    : "Site is open to all users without access code"}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.requireAccessCode}
              onCheckedChange={handleToggleAccessControl}
              className="data-[state=checked]:bg-green-500"
            />
          </div>

          <div className="flex items-center gap-4 text-sm font-mono">
            <Badge
              className={
                settings.requireAccessCode
                  ? "bg-green-500/20 text-green-400 border-green-500"
                  : "bg-red-500/20 text-red-400 border-red-500"
              }
            >
              {settings.requireAccessCode ? "PROTECTED" : "OPEN ACCESS"}
            </Badge>
            <span className="text-green-300/70">
              Status: {settings.requireAccessCode ? "Access code required" : "No restrictions"}
            </span>
          </div>
        </div>
      </Card>

      {/* User Management */}
      <Card className="bg-black/80 border-green-500 backdrop-blur">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-green-400" />
              <div>
                <h3 className="text-xl font-mono text-green-400 font-bold">USER MANAGEMENT</h3>
                <p className="text-green-300/70 font-mono text-sm">Manage user access codes and permissions</p>
              </div>
            </div>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500 font-mono">{users.length} USERS</Badge>
          </div>

          {/* Add New User */}
          <div className="mb-6 p-4 border border-green-500/30 rounded bg-green-500/5">
            <h4 className="text-green-400 font-mono font-bold mb-3">ADD NEW USER</h4>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="userName" className="text-green-300 font-mono text-sm">
                  User Name
                </Label>
                <Input
                  id="userName"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter user name"
                  className="bg-black/50 border-green-500/50 text-green-400 font-mono"
                  onKeyPress={(e) => e.key === "Enter" && handleAddUser()}
                />
              </div>
              <Button
                onClick={handleAddUser}
                disabled={!newUserName.trim() || isAddingUser}
                className="bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/40 font-mono mt-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isAddingUser ? "ADDING..." : "ADD USER"}
              </Button>
            </div>
          </div>

          {/* Users List */}
          <div className="space-y-3">
            {users.length === 0 ? (
              <div className="text-center py-8 text-green-400/70 font-mono">
                No users found. Add users to manage access.
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border border-green-500/30 rounded bg-black/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {user.isOnline ? (
                        <UserCheck className="h-5 w-5 text-green-400" />
                      ) : (
                        <UserX className="h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <div className="text-green-400 font-mono font-bold">{user.name}</div>
                        <div className="text-green-300/70 font-mono text-sm">
                          Code: {user.accessCode} | Logins: {user.loginCount}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(user.status)}>{user.status.toUpperCase()}</Badge>

                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          handleUserStatusChange(user.id, user.status === "active" ? "restricted" : "active")
                        }
                        className={`font-mono text-xs px-3 py-1 ${
                          user.status === "active"
                            ? "bg-yellow-600/20 border-yellow-500 text-yellow-400 hover:bg-yellow-600/40"
                            : "bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/40"
                        }`}
                      >
                        {user.status === "active" ? "RESTRICT" : "ACTIVATE"}
                      </Button>

                      <Button
                        onClick={() => handleDeleteUser(user.id)}
                        className="bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/40 font-mono text-xs px-3 py-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
