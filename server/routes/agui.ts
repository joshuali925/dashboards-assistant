import { Router, type Request, type Response } from "express"

const router = Router()

// AG-UI server URL (HolmesGPT) - default to localhost:5050
const AGUI_SERVER_URL = process.env.AGUI_SERVER_URL ?? "http://localhost:5050"

// Proxy POST requests to the AG-UI server
router.post("/chat", async (req: Request, res: Response) => {
  const targetUrl = `${AGUI_SERVER_URL}/api/agui/chat`

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: req.headers.accept || "text/event-stream",
      },
      body: JSON.stringify(req.body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      res.status(response.status).send(errorText)
      return
    }

    // Forward SSE streaming response
    const contentType = response.headers.get("content-type") || "text/event-stream"
    res.setHeader("Content-Type", contentType)
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")

    if (response.body) {
      const reader = response.body.getReader()

      // Handle client disconnect
      req.on("close", () => {
        reader.cancel()
      })

      // Stream the response
      const pump = async (): Promise<void> => {
        try {
          const { done, value } = await reader.read()
          if (done) {
            res.end()
            return
          }
          res.write(value)
          await pump()
        } catch (error) {
          // Client disconnected or other error
          res.end()
        }
      }

      await pump()
    } else {
      res.end()
    }
  } catch (error) {
    console.error("AG-UI proxy error:", error)
    res.status(502).json({
      error: "Failed to connect to AG-UI server",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
})

// Health check for AG-UI server
router.get("/chat/health", async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${AGUI_SERVER_URL}/api/agui/chat/health`)
    if (response.ok) {
      res.json({ status: "ok", aguiServer: AGUI_SERVER_URL })
    } else {
      res.status(502).json({ status: "error", message: "AG-UI server not healthy" })
    }
  } catch (error) {
    res.status(502).json({
      status: "error",
      message: "Cannot reach AG-UI server",
      aguiServer: AGUI_SERVER_URL,
    })
  }
})

export default router
