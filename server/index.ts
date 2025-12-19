import express from "express"
import cors from "cors"
import chatRouter from "./routes/chat"
import aguiRouter from "./routes/agui"

const app = express()
const PORT = process.env.PORT || 3001
const AGUI_SERVER_URL = process.env.AGUI_SERVER_URL || "http://localhost:5050"

app.use(cors())
app.use(express.json())

// API routes
app.use("/api/chat", chatRouter)
app.use("/api/agui", aguiRouter)

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
  console.log(`AG-UI server configured at: ${AGUI_SERVER_URL}`)
})
