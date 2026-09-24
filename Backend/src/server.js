import "dotenv/config";
import app from './app.js'
import connectDB from './config/database.js'
import http from 'http'
import { initSocket } from "./sockets/server.socket.js";
import dns from 'node:dns/promises';
dns.setServers(['8.8.8.8', '1.1.1.1']);  



const PORT = process.env.PORT || 3001;

const httpServer = http.createServer(app)

initSocket(httpServer)

connectDB()
.catch((err) =>{
    console.error("MongoDB connection failed:", err)
    process.exit(1)
})

httpServer.listen (PORT, ()=>{
    console.log(`server is running on port ${PORT}`)
})