import { useState, useCallback, useRef, type ReactNode } from "react"
import {
  AssistantRuntimeProvider as AUIRuntimeProvider,
  useExternalStoreRuntime,
  type ThreadMessageLike,
  type AppendMessage,
  type AddToolResultOptions,
} from "@assistant-ui/react"

// Text content part shape
interface TextContentPart {
  type: "text"
  text: string
}

// Tool call content part shape (matches assistant-ui's expected format)
interface ToolCallContentPart {
  type: "tool-call"
  toolCallId: string
  toolName: string
  args: Record<string, JSONValue>
  argsText: string
  result?: JSONValue
}

// JSON value type for proper typing
type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue }

// Content part union type
type ContentPart = TextContentPart | ToolCallContentPart

// AG-UI message format
interface AgUiMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

// Track in-progress tool calls during streaming
interface ToolCallState {
  toolCallId: string
  toolName: string
  argsBuffer: string
  parentMessageId?: string
}

// AG-UI SSE event types
interface AgUiEvent {
  type: string
  delta?: string
  message?: string
  messageId?: string
  // Tool call specific fields
  toolCallId?: string
  toolCallName?: string
  parentMessageId?: string
  // Tool result specific fields
  content?: string
  role?: string
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
      if (part.type === "tool-call") {
        const toolPart = part as ToolCallContentPart
        return {
          type: "tool-call" as const,
          toolCallId: toolPart.toolCallId,
          toolName: toolPart.toolName,
          args: toolPart.args,
          argsText: toolPart.argsText,
          result: toolPart.result,
        }
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

// Tool definitions to send to HolmesGPT via ag-ui protocol
const TOOLS = [
  {
    name: "showCodeBlock",
    description: "Display a code snippet with syntax highlighting. Use this tool whenever you want to show code to the user. The code will be rendered with proper syntax highlighting, line numbers, and a copy button.",
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "The code to display"
        },
        language: {
          type: "string",
          description: "The programming language for syntax highlighting (e.g., 'python', 'javascript', 'typescript', 'bash', etc.)"
        },
        filename: {
          type: "string",
          description: "Optional filename to display in the header"
        },
        showLineNumbers: {
          type: "boolean",
          description: "Whether to show line numbers (default: false)"
        },
        highlightLines: {
          type: "array",
          items: { type: "number" },
          description: "Array of line numbers to highlight"
        },
        maxCollapsedLines: {
          type: "number",
          description: "If set, collapse the code block after this many lines with an expand button"
        }
      },
      required: ["code", "language"]
    }
  }
]

export const AssistantRuntimeProvider: React.FC<AssistantRuntimeProviderProps> = ({
  children,
  agentUrl = DEFAULT_AGENT_URL,
}) => {
  const [isRunning, setIsRunning] = useState(false)
  const [messages, setMessages] = useState<ThreadMessageLike[]>([])
  const threadIdRef = useRef<string>(generateId())
  const abortControllerRef = useRef<AbortController | null>(null)
  // Track in-progress tool calls during streaming
  const toolCallsRef = useRef<Map<string, ToolCallState>>(new Map())

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
      // Clear tool calls for new message
      toolCallsRef.current.clear()

      // Create placeholder assistant message for streaming
      const placeholderMessage: ThreadMessageLike = {
        id: assistantMessageId,
        role: "assistant",
        content: [{ type: "text", text: "" }] as ContentPart[],
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, placeholderMessage])

      // Helper to update the assistant message with current content
      const updateAssistantMessage = (textContent: string, toolCalls: Map<string, ToolCallState>) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantMessageId) return m

            const parts: Array<TextContentPart | ToolCallContentPart> = []

            // Add text part if there's any text
            if (textContent) {
              parts.push({ type: "text" as const, text: textContent })
            }

            // Add tool call parts
            for (const [, tc] of toolCalls) {
              let args: Record<string, JSONValue> = {}
              try {
                if (tc.argsBuffer) {
                  args = JSON.parse(tc.argsBuffer) as Record<string, JSONValue>
                }
              } catch {
                // Args may still be streaming, keep empty
              }
              parts.push({
                type: "tool-call" as const,
                toolCallId: tc.toolCallId,
                toolName: tc.toolName,
                args,
                argsText: tc.argsBuffer,
              })
            }

            // Ensure at least one empty text part if nothing else
            if (parts.length === 0) {
              parts.push({ type: "text" as const, text: "" })
            }

            return { ...m, content: parts }
          })
        )
      }

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
            tools: TOOLS,
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
              updateAssistantMessage(assistantText, toolCallsRef.current)
              break

            case "TOOL_CALL_START":
              // Start tracking a new tool call
              if (event.toolCallId && event.toolCallName) {
                toolCallsRef.current.set(event.toolCallId, {
                  toolCallId: event.toolCallId,
                  toolName: event.toolCallName,
                  argsBuffer: "",
                  parentMessageId: event.parentMessageId,
                })
                updateAssistantMessage(assistantText, toolCallsRef.current)
              }
              break

            case "TOOL_CALL_ARGS":
              // Append to the args buffer for the tool call
              if (event.toolCallId && event.delta) {
                const toolCall = toolCallsRef.current.get(event.toolCallId)
                if (toolCall) {
                  toolCall.argsBuffer += event.delta
                  updateAssistantMessage(assistantText, toolCallsRef.current)
                }
              }
              break

            case "TOOL_CALL_END":
              // Tool call arguments are complete, parse the final args
              if (event.toolCallId) {
                const toolCall = toolCallsRef.current.get(event.toolCallId)
                if (toolCall) {
                  updateAssistantMessage(assistantText, toolCallsRef.current)
                }
              }
              break

            case "TOOL_CALL_RESULT":
              // Tool execution result received
              if (event.toolCallId) {
                let resultContent: JSONValue = null
                try {
                  resultContent = event.content ? (JSON.parse(event.content) as JSONValue) : (event.content as JSONValue ?? null)
                } catch {
                  resultContent = (event.content as JSONValue) ?? null
                }

                // Update the message with the tool result
                setMessages((prev) =>
                  prev.map((m) => {
                    if (m.id !== assistantMessageId) return m

                    const content = Array.isArray(m.content) ? m.content : []
                    return {
                      ...m,
                      content: content.map((part) => {
                        if (
                          typeof part === "object" &&
                          part !== null &&
                          "type" in part &&
                          part.type === "tool-call" &&
                          "toolCallId" in part &&
                          (part as ToolCallContentPart).toolCallId === event.toolCallId
                        ) {
                          return { ...part, result: resultContent }
                        }
                        return part
                      }),
                    }
                  })
                )
              }
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsRunning(false)
    }
  }, [])

  // Handle tool result updates (for human-in-the-loop scenarios)
  const onAddToolResult = useCallback((options: AddToolResultOptions) => {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id === options.messageId) {
          const content = Array.isArray(message.content) ? message.content : []
          return {
            ...message,
            content: content.map((part) => {
              if (
                typeof part === "object" &&
                part !== null &&
                "type" in part &&
                part.type === "tool-call" &&
                "toolCallId" in part &&
                part.toolCallId === options.toolCallId
              ) {
                return { ...part, result: options.result }
              }
              return part
            }),
          }
        }
        return message
      })
    )
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
    onAddToolResult,
  })

  return <AUIRuntimeProvider runtime={runtime}>{children}</AUIRuntimeProvider>
}
