"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useUserAccess } from "@/hooks/use-user-access"
import type { AccessUser } from "@/lib/user-access"
import {
  Users,
  Search,
  UserPlus,
  UserX,
  UserCheck,
  Trash2,
  Eye,
  Clock,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react"

export function UserManagement() {
  const { users, addUser, updateUserStatus, deleteUser, generateAccessCode, refreshUsers } = useUserAccess()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "restricted" | "terminated">("all")
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserName, setNewUserName] = useState("")
  const [newUserCode, setNewUserCode] = useState("")
  const [selectedUser, setSelectedUser] = useState<AccessUser | null>(null)
  const [showUserDetails, setShowUserDetails] = useState(false)

  useEffect(() => {
    refreshUsers()
  }, [refreshUsers])

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.accessCode.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: AccessUser["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "restricted":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "terminated":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getStatusIcon = (status: AccessUser["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4" />
      case "restricted":
        return <AlertTriangle className="h-4 w-4" />
      case "terminated":
        return <XCircle className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const handleAddUser = () => {
    if (!newUserName.trim()) return

    const code = newUserCode.trim() || generateAccessCode()
    addUser(newUserName.trim(), code)
    setNewUserName("")
    setNewUserCode("")
    setShowAddUser(false)
  }

  const handleStatusChange = (userId: string, newStatus: AccessUser["status"]) => {
    updateUserStatus(userId, newStatus)
  }

  const handleDeleteUser = (userId: string) => {
    if (confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) {
      deleteUser(userId)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getOnlineStatus = (user: AccessUser) => {
    return user.isOnline ? (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        <Activity className="h-3 w-3 mr-1" />
        ONLINE
      </Badge>
    ) : (
      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
        <Clock className="h-3 w-3 mr-1" />
        OFFLINE
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-mono font-bold text-green-400 flex items-center gap-2">
            <Users className="h-6 w-6" />
            User Management
          </h2>
          <p className="text-green-300/70 font-mono text-sm mt-1">
            Manage user access, permissions, and system activity
          </p>
        </div>

        <Button
          onClick={() => setShowAddUser(true)}
          className="bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/40 font-mono transition-all duration-300 hover:scale-105 neon-border"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 font-mono text-sm">Total Users</p>
                <p className="text-2xl font-mono text-green-300">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-green-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 font-mono text-sm">Active</p>
                <p className="text-2xl font-mono text-green-300">{users.filter((u) => u.status === "active").length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 font-mono text-sm">Restricted</p>
                <p className="text-2xl font-mono text-yellow-300">
                  {users.filter((u) => u.status === "restricted").length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 font-mono text-sm">Terminated</p>
                <p className="text-2xl font-mono text-red-300">
                  {users.filter((u) => u.status === "terminated").length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-400/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900/50 border-green-500/30">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400/50" />
                <Input
                  type="text"
                  placeholder="Search users by name or access code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-black/50 border-green-500 text-green-400 font-mono focus:border-green-300 focus:ring-green-300/20"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {["all", "active", "restricted", "terminated"].map((status) => (
                <Button
                  key={status}
                  onClick={() => setStatusFilter(status as any)}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  className={`font-mono text-xs ${
                    statusFilter === status
                      ? "bg-green-600/20 border-green-500 text-green-400"
                      : "border-gray-500/30 text-gray-400 hover:bg-gray-500/10"
                  }`}
                >
                  {status.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add User Modal */}
      {showAddUser && (
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 font-mono flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New User
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-green-400 font-mono text-sm mb-2">User Name</label>
                <Input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter user name"
                  className="bg-black/50 border-green-500 text-green-400 font-mono focus:border-green-300 focus:ring-green-300/20"
                />
              </div>
              <div>
                <label className="block text-green-400 font-mono text-sm mb-2">
                  Access Code (leave empty for auto-generation)
                </label>
                <Input
                  type="text"
                  value={newUserCode}
                  onChange={(e) => setNewUserCode(e.target.value.toUpperCase())}
                  placeholder="Auto-generated"
                  className="bg-black/50 border-green-500 text-green-400 font-mono focus:border-green-300 focus:ring-green-300/20"
                  maxLength={8}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleAddUser}
                disabled={!newUserName.trim()}
                className="bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/40 font-mono transition-all duration-300 hover:scale-105 neon-border"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </Button>
              <Button
                onClick={() => {
                  setShowAddUser(false)
                  setNewUserName("")
                  setNewUserCode("")
                }}
                variant="outline"
                className="border-gray-500/30 text-gray-400 hover:bg-gray-500/10 font-mono"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card className="bg-gray-900/50 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-green-400 font-mono">Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-green-400/30 mx-auto mb-4" />
                <p className="text-green-400/70 font-mono">No users found</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-black/30 border border-green-500/20 rounded p-4 hover:bg-green-500/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-green-400 font-mono font-semibold">{user.name}</h3>
                          <Badge className={getStatusColor(user.status)}>
                            {getStatusIcon(user.status)}
                            {user.status.toUpperCase()}
                          </Badge>
                          {getOnlineStatus(user)}
                        </div>
                        <div className="text-green-300/70 font-mono text-sm">
                          Code: {user.accessCode} | Logins: {user.loginCount} | Created: {formatDate(user.createdAt)}
                        </div>
                        {user.lastLogin && (
                          <div className="text-green-300/50 font-mono text-xs">
                            Last Login: {formatDate(user.lastLogin)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => {
                          setSelectedUser(user)
                          setShowUserDetails(true)
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {user.status === "active" && (
                        <>
                          <Button
                            onClick={() => handleStatusChange(user.id, "restricted")}
                            variant="ghost"
                            size="sm"
                            className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                            title="Restrict User"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleStatusChange(user.id, "terminated")}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Terminate User"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      {user.status === "restricted" && (
                        <Button
                          onClick={() => handleStatusChange(user.id, "active")}
                          variant="ghost"
                          size="sm"
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          title="Activate User"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}

                      {user.status === "terminated" && (
                        <Button
                          onClick={() => handleStatusChange(user.id, "active")}
                          variant="ghost"
                          size="sm"
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          title="Reactivate User"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        onClick={() => handleDeleteUser(user.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 font-mono flex items-center gap-2">
              <Eye className="h-5 w-5" />
              User Details: {selectedUser.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <label className="block text-green-400 font-mono text-sm mb-1">User ID</label>
                  <div className="text-green-300 font-mono text-sm bg-black/50 p-2 rounded border border-green-500/20">
                    {selectedUser.id}
                  </div>
                </div>
                <div>
                  <label className="block text-green-400 font-mono text-sm mb-1">Access Code</label>
                  <div className="text-green-300 font-mono text-lg bg-black/50 p-2 rounded border border-green-500/20 text-center tracking-widest">
                    {selectedUser.accessCode}
                  </div>
                </div>
                <div>
                  <label className="block text-green-400 font-mono text-sm mb-1">Status</label>
                  <Badge className={getStatusColor(selectedUser.status)}>
                    {getStatusIcon(selectedUser.status)}
                    {selectedUser.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-green-400 font-mono text-sm mb-1">Created</label>
                  <div className="text-green-300 font-mono text-sm">{formatDate(selectedUser.createdAt)}</div>
                </div>
                <div>
                  <label className="block text-green-400 font-mono text-sm mb-1">Last Login</label>
                  <div className="text-green-300 font-mono text-sm">
                    {selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : "Never"}
                  </div>
                </div>
                <div>
                  <label className="block text-green-400 font-mono text-sm mb-1">Login Count</label>
                  <div className="text-green-300 font-mono text-sm">{selectedUser.loginCount}</div>
                </div>
                <div>
                  <label className="block text-green-400 font-mono text-sm mb-1">Online Status</label>
                  <div>{getOnlineStatus(selectedUser)}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowUserDetails(false)}
                className="bg-gray-600/20 border-gray-500 text-gray-400 hover:bg-gray-600/40 font-mono"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
