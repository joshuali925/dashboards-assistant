import { useState, useCallback, useRef, type ReactNode } from "react"
import {
  AssistantRuntimeProvider as AUIRuntimeProvider,
  useExternalStoreRuntime,
  type ThreadMessageLike,
  type AppendMessage,
} from "@assistant-ui/react"

// Text content part shape
interface TextContentPart {
  type: "text"
  text: string
}

// AG-UI message format
interface AgUiMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

// AG-UI SSE event types
interface AgUiEvent {
  type: string
  delta?: string
  message?: string
  messageId?: string
  [key: string]: unknown
}

interface AssistantRuntimeProviderProps {
  children: ReactNode
  agentUrl?: string
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

const convertMessage = (message: ThreadMessageLike): ThreadMessageLike => {
  const content = typeof message.content === "string" ? message.content : message.content
  const contentArray = Array.isArray(content) ? content : [{ type: "text" as const, text: String(content) }]

  return {
    id: message.id ?? generateId(),
    role: message.role,
    content: contentArray.map((part) => {
      if (typeof part === "string") {
        return { type: "text" as const, text: part }
      }
      if (part.type === "text") {
        return { type: "text" as const, text: (part as TextContentPart).text ?? "" }
      }
      return part
    }),
    createdAt: message.createdAt ?? new Date(),
  }
}

const getTextFromContent = (content: ThreadMessageLike["content"]): string => {
  if (typeof content === "string") return content
  const firstPart = Array.isArray(content) ? content[0] : content
  if (typeof firstPart === "string") return firstPart
  if (firstPart && typeof firstPart === "object" && "type" in firstPart && firstPart.type === "text" && "text" in firstPart) {
    return (firstPart as TextContentPart).text
  }
  return ""
}

// Convert assistant-ui messages to AG-UI message format
const toAgUiMessages = (messages: ThreadMessageLike[]): AgUiMessage[] => {
  return messages.map((m) => ({
    id: m.id ?? generateId(),
    role: m.role as "user" | "assistant",
    content: getTextFromContent(m.content),
  }))
}

// Parse SSE stream and yield events
async function* parseSSEStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<AgUiEvent> {
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim()
        if (data) {
          try {
            yield JSON.parse(data) as AgUiEvent
          } catch {
            console.warn("Failed to parse SSE event:", data)
          }
        }
      }
    }
  }
}

// Use the proxied AG-UI endpoint via the Node.js server
const DEFAULT_AGENT_URL = import.meta.env.VITE_AGUI_URL || "/api/agui/chat"

export const AssistantRuntimeProvider: React.FC<AssistantRuntimeProviderProps> = ({
  children,
  agentUrl = DEFAULT_AGENT_URL,
}) => {
  const [isRunning, setIsRunning] = useState(false)
  const [messages, setMessages] = useState<ThreadMessageLike[]>([])
  const threadIdRef = useRef<string>(generateId())
  const abortControllerRef = useRef<AbortController | null>(null)

  const onNew = useCallback(
    async (message: AppendMessage) => {
      if (message.content.length !== 1 || message.content[0]?.type !== "text") {
        throw new Error("Only text content is supported")
      }

      const userMessage: ThreadMessageLike = {
        id: generateId(),
        role: "user",
        content: [{ type: "text", text: message.content[0].text ?? "" }],
        createdAt: new Date(),
      }

      const updatedMessages = [...messages, userMessage]
      setMessages(updatedMessages)
      setIsRunning(true)

      // Abort any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      const assistantMessageId = generateId()
      let assistantText = ""

      // Create placeholder assistant message for streaming
      const placeholderMessage: ThreadMessageLike = {
        id: assistantMessageId,
        role: "assistant",
        content: [{ type: "text", text: "" }],
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, placeholderMessage])

      try {
        // Make AG-UI request with SSE streaming
        const response = await fetch(agentUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            threadId: threadIdRef.current,
            runId: generateId(),
            messages: toAgUiMessages(updatedMessages),
            tools: [],
            context: [],
            forwardedProps: {},
            state: {},
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`AG-UI request failed: ${response.status}`)
        }

        if (!response.body) {
          throw new Error("No response body")
        }

        // Parse SSE stream
        const reader = response.body.getReader()
        for await (const event of parseSSEStream(reader)) {
          // Handle different AG-UI event types (uppercase format from HolmesGPT)
          switch (event.type) {
            case "TEXT_MESSAGE_CONTENT":
              assistantText += event.delta || ""
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: [{ type: "text" as const, text: assistantText }] }
                    : m
                )
              )
              break
            case "RUN_ERROR":
              throw new Error(event.message || "Agent error")
            case "RUN_FINISHED":
              // Run complete
              break
          }
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          // Request was cancelled
          return
        }
        console.error("AG-UI error:", error)
        const errorText = error instanceof Error ? error.message : "An error occurred"
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: [{ type: "text" as const, text: `Error: ${errorText}` }] }
              : m
          )
        )
      } finally {
        setIsRunning(false)
        abortControllerRef.current = null
      }
    },
    [messages, agentUrl]
  )

  const onEdit = useCallback(
    async (message: AppendMessage) => {
      await onNew(message)
    },
    [onNew]
  )

  const onReload = useCallback(async () => {
    if (messages.length === 0) return

    const lastUserMessageIndex = messages
      .map((m, i) => ({ ...m, index: i }))
      .filter((m) => m.role === "user")
      .pop()?.index

    if (lastUserMessageIndex === undefined) return

    const lastUserMessage = messages[lastUserMessageIndex]
    const lastUserText = getTextFromContent(lastUserMessage.content)
    if (!lastUserText) return

    // Remove messages after the last user message
    const truncatedMessages = messages.slice(0, lastUserMessageIndex)
    setMessages(truncatedMessages)

    // Re-send the last user message
    await onNew({
      role: "user",
      content: [{ type: "text", text: lastUserText }],
      parentId: lastUserMessage.id ?? null,
    } as unknown as AppendMessage)
  }, [messages, onNew])

  const onCancel = useCallback(async () => {
    if (agentRef.current) {
      agentRef.current.abortRun()
      setIsRunning(false)
    }
  }, [])

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
    onCancel,
  })

  return <AUIRuntimeProvider runtime={runtime}>{children}</AUIRuntimeProvider>
}
