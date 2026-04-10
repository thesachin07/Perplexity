import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRouter from "./routes/auth.routes.js";
import chatRouter from "./routes/chat.routes.js";
import morgon from "morgan";
const app = express();

// CORS (correct)
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    method: ["GET", "POST", "PUT", "DELETE"],
}));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgon("dev"))

// Routes
app.get("/", (req, res) => {
    res.json({ message: "Server is running" });
});

app.use("/api/auth", authRouter);
app.use("/api/chat", chatRouter);

export default app;