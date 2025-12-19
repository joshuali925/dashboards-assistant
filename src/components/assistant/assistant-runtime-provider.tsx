import { useState, useCallback, type ReactNode } from "react"
import {
  AssistantRuntimeProvider as AUIRuntimeProvider,
  useExternalStoreRuntime,
  type ThreadMessageLike,
  type AppendMessage,
} from "@assistant-ui/react"

interface AssistantRuntimeProviderProps {
  children: ReactNode
}

const convertMessage = (message: ThreadMessageLike): ThreadMessageLike => {
  return message
}

// Helper to extract text from message content
const getTextFromContent = (content: ThreadMessageLike["content"]): string => {
  const firstPart = content[0]
  if (typeof firstPart === "string") return firstPart
  if (firstPart && typeof firstPart === "object" && "type" in firstPart && firstPart.type === "text" && "text" in firstPart) {
    return firstPart.text
  }
  return ""
}

export const AssistantRuntimeProvider: React.FC<AssistantRuntimeProviderProps> = ({ children }) => {
  const [isRunning, setIsRunning] = useState(false)
  const [messages, setMessages] = useState<ThreadMessageLike[]>([])

  const onNew = useCallback(
    async (message: AppendMessage) => {
      if (message.content.length !== 1 || message.content[0]?.type !== "text") {
        throw new Error("Only text content is supported")
      }

      const userMessage: ThreadMessageLike = {
        role: "user",
        content: [{ type: "text", text: message.content[0].text }],
      }

      setMessages((currentMessages) => [...currentMessages, userMessage])
      setIsRunning(true)

      try {
        // Call the backend API
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: getTextFromContent(m.content),
            })),
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to get response from server")
        }

        const data = await response.json()

        const assistantMessage: ThreadMessageLike = {
          role: "assistant",
          content: [
            {
              type: "text",
              text: data.message.content,
            },
          ],
        }

        setMessages((currentMessages) => [...currentMessages, assistantMessage])
      } catch {
        const errorMessage: ThreadMessageLike = {
          role: "assistant",
          content: [
            {
              type: "text",
              text: "Sorry, an error occurred while processing your request.",
            },
          ],
        }
        setMessages((currentMessages) => [...currentMessages, errorMessage])
      } finally {
        setIsRunning(false)
      }
    },
    [messages]
  )

  const onEdit = useCallback(
    async (message: AppendMessage) => {
      // Handle message editing
      await onNew(message)
    },
    [onNew]
  )

  const onReload = useCallback(async () => {
    // Handle regeneration of last assistant message
    if (messages.length === 0) return

    const lastUserMessageIndex = messages
      .map((m, i) => ({ ...m, index: i }))
      .filter((m) => m.role === "user")
      .pop()?.index

    if (lastUserMessageIndex === undefined) return

    const lastUserMessage = messages[lastUserMessageIndex]
    const lastUserText = getTextFromContent(lastUserMessage.content)
    if (!lastUserText) return

    // Remove messages after the last user message and regenerate
    const truncatedMessages = messages.slice(0, lastUserMessageIndex + 1)
    setMessages(truncatedMessages)

    setIsRunning(true)
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: truncatedMessages.map((m) => ({
            role: m.role,
            content: getTextFromContent(m.content),
          })),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response from server")
      }

      const data = await response.json()

      const assistantMessage: ThreadMessageLike = {
        role: "assistant",
        content: [
          {
            type: "text",
            text: data.message.content,
          },
        ],
      }
      setMessages((currentMessages) => [...currentMessages, assistantMessage])
    } catch {
      const errorMessage: ThreadMessageLike = {
        role: "assistant",
        content: [
          {
            type: "text",
            text: "Sorry, an error occurred while regenerating the response.",
          },
        ],
      }
      setMessages((currentMessages) => [...currentMessages, errorMessage])
    } finally {
      setIsRunning(false)
    }
  }, [messages])

  const handleSetMessages = useCallback((newMessages: readonly ThreadMessageLike[]) => {
    setMessages([...newMessages])
  }, [])

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    setMessages: handleSetMessages,
    convertMessage,
    onNew,
    onEdit,
    onReload,
  })

  return <AUIRuntimeProvider runtime={runtime}>{children}</AUIRuntimeProvider>
}
