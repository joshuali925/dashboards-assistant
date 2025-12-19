import { makeAssistantToolUI } from "@assistant-ui/react"
import { CheckIcon, LoaderIcon, AlertCircleIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Helper to safely convert unknown to ReactNode for display
const formatUnknown = (value: unknown): ReactNode => {
  if (value === undefined || value === null) return null
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return "[Unable to display]"
  }
}

/**
 * GenericToolUI - A versatile tool UI component that can display any tool call
 *
 * This component shows:
 * - Tool name and status
 * - Collapsible args/result sections
 * - Loading, success, and error states
 *
 * Use this as a template for creating tool-specific UIs or as a fallback.
 */
export const GenericToolUI = makeAssistantToolUI<
  Record<string, unknown>,
  unknown
>({
  toolName: "*", // Wildcard to match any tool (fallback)
  render: ({ toolName, args, argsText, result, status }) => {
    const [isExpanded, setIsExpanded] = useState(false)

    const isRunning = status.type === "running"
    const isError = status.type === "incomplete" && status.reason === "error"

    const StatusIcon = isRunning
      ? LoaderIcon
      : isError
        ? AlertCircleIcon
        : CheckIcon

    const statusColor = isRunning
      ? "text-blue-500"
      : isError
        ? "text-red-500"
        : "text-green-500"

    // Pre-format values to ensure they're ReactNode compatible
    const resultDisplay = formatUnknown(result)
    const errorDisplay = isError && status.error ? formatUnknown(status.error) : null

    return (
      <div
        className={cn(
          "my-2 w-full rounded-lg border bg-card shadow-sm",
          isError && "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
        )}
      >
        {/* Header */}
        <div
          className="flex cursor-pointer items-center gap-3 px-4 py-3"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <StatusIcon
            className={cn(
              "size-4 shrink-0",
              statusColor,
              isRunning && "animate-spin"
            )}
          />
          <span className="flex-1 font-medium text-sm">
            {isRunning ? `Running ${toolName}...` : `Used ${toolName}`}
          </span>
          <Button variant="ghost" size="sm" className="size-6 p-0">
            {isExpanded ? (
              <ChevronUpIcon className="size-4" />
            ) : (
              <ChevronDownIcon className="size-4" />
            )}
          </Button>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t px-4 py-3">
            {/* Arguments */}
            <div className="mb-3">
              <p className="mb-1 font-medium text-muted-foreground text-xs uppercase">
                Arguments
              </p>
              <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
                {argsText || JSON.stringify(args, null, 2)}
              </pre>
            </div>

            {/* Result */}
            {resultDisplay !== null && (
              <div>
                <p className="mb-1 font-medium text-muted-foreground text-xs uppercase">
                  Result
                </p>
                <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
                  {resultDisplay}
                </pre>
              </div>
            )}

            {/* Error */}
            {errorDisplay !== null && (
              <div className="mt-2 rounded bg-red-100 p-2 text-red-700 text-xs dark:bg-red-900/30 dark:text-red-300">
                {errorDisplay}
              </div>
            )}
          </div>
        )}
      </div>
    )
  },
})
