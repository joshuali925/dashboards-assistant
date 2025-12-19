import { Router, type Request, type Response } from "express"

const router = Router()

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
}

interface ChatResponse {
  message: ChatMessage
}

// Mock responses for demonstration
const mockResponses = [
  "I understand you're asking about that. Let me help you with some information.",
  "That's a great question! Here's what I know about the topic.",
  "I'm here to assist you. Based on your query, here's my response.",
  "Thanks for reaching out. Let me provide some helpful information.",
  "I've analyzed your request. Here's what I can tell you.",
]

function getRandomResponse(): string {
  return mockResponses[Math.floor(Math.random() * mockResponses.length)]
}

// POST /api/chat - Send a message and get a response
router.post("/", async (req: Request<object, ChatResponse, ChatRequest>, res: Response<ChatResponse>) => {
  const { messages } = req.body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ message: { role: "assistant", content: "Invalid request: messages array is required" } })
    return
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Get the last user message for context (mock behavior)
  const lastUserMessage = messages.filter((m) => m.role === "user").pop()

  let responseText = getRandomResponse()
  if (lastUserMessage) {
    responseText = `${responseText}\n\nYou asked: "${lastUserMessage.content}"`
  }

  const response: ChatResponse = {
    message: {
      role: "assistant",
      content: responseText,
    },
  }

  res.json(response)
})

export default router
