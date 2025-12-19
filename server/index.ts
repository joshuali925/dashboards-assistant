import express from "express"
import cors from "cors"
import chatRouter from "./routes/chat"

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// API routes
app.use("/api/chat", chatRouter)

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
