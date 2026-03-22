import "dotenv/config";

import app from './app.js'
import connectDB from './config/database.js'
import { testAi } from "./services/ai.service.js";

const PORT = process.env.PORT || 3000;

// Optional AI startup probe; do not block server startup on failures.
// If Gemini API key is missing, this call may fail but we still want API to run.
testAi().catch((err) => {
    console.warn("AI test invocation failed (nonfatal):", err.message || err);
});

connectDB()
.catch((err) =>{
    console.error("MongoDB connection failed:", err)
    process.exit(1)
})

app.listen (PORT, ()=>{
    console.log(`server is running on port ${PORT}`)
})