import "dotenv/config";

import app from './app.js'
import connectDB from './config/database.js'
import { testAi } from "./services/ai.service.js";

const PORT = process.env.PORT || 3000;
testAi()
connectDB()
.catch((err) =>{
    console.error("MongoDB connection failed:", err)
    process.exit(1)
})
app.listen (PORT, ()=>{
    console.log(`server is running on port ${PORT}`)
})