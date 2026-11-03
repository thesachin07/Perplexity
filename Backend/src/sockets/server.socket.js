import { Server } from "socket.io";

export let io = null;

export function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:5173",
            credentials: true,
        }
    })

    console.log("Socket.io server is RUNNING")

    io.on("connection", (socket) => {
        console.log("A user connected: " + socket.id)

        socket.on("disconnect", (reason) => {
            console.log(`A user disconnected: ${socket.id} (${reason})`)
        })
    })

    return io;
}

export function getIO() {
    if (!io) {
        throw new Error("Socket.io not initialized")
    }

    return io
}