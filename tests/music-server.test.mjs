import assert from "node:assert/strict"
import test from "node:test"
import { io } from "socket.io-client"
import { MusicServer } from "../server/music-server.ts"

function waitForServer(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Socket did not connect")), 3000)
    socket.on("connect", () => {
      clearTimeout(timer)
      resolve()
    })
    socket.on("connect_error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

test("music server serves a built-in catalog and accepts the default admin password", async () => {
  const server = new MusicServer(3311)
  server.start()

  const socket = io("http://localhost:3311", {
    transports: ["websocket"],
    timeout: 3000,
  })

  try {
    await waitForServer(socket)
    await new Promise((resolve, reject) => {
      socket.once("admin:authenticated", resolve)
      socket.once("admin:auth-failed", (message) => reject(new Error(String(message))))
      socket.emit("admin:auth", { adminId: "admin-1", password: "blackdiamond-admin" })
    })

    const response = await fetch("http://localhost:3311/api/music/all")
    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.ok(Array.isArray(payload) && payload.length > 0)
    assert.equal(payload[0].title.length > 0, true)
  } finally {
    socket.close()
    await new Promise((resolve) => server["httpServer"].close(resolve))
  }
})
