import { makeAssistantToolUI } from "@assistant-ui/react"
import {
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  LoaderIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Type definitions for code execution tool
interface CodeExecutionArgs {
  code?: string
  language?: string
  command?: string
  [key: string]: unknown
}

interface CodeExecutionResult {
  output?: string
  stdout?: string
  stderr?: string
  exitCode?: number
  error?: string
  success?: boolean
  [key: string]: unknown
}

/**
 * CodeExecutionToolUI - A component for displaying code execution results
 *
 * Shows:
 * - The code/command being executed
 * - Loading state while running
 * - Output (stdout/stderr)
 * - Success/error status
 *
 * Compatible with tools that:
 * - Accept: code, language, or command
 * - Return: output, stdout, stderr, exitCode, error
 */
export const CodeExecutionToolUI = makeAssistantToolUI<
  CodeExecutionArgs,
  CodeExecutionResult
>({
  toolName: "execute_code", // Change this to match your tool name
  render: function CodeExecutionRender({ args, result, status }) {
    const [copied, setCopied] = useState(false)
    const isRunning = status.type === "running"
    const isError =
      status.type === "incomplete" ||
      result?.error ||
      result?.exitCode !== 0 ||
      result?.success === false

    const code = args.code || args.command || ""
    const language = args.language || "shell"

    const output = result?.output || result?.stdout || ""
    const errorOutput = result?.stderr || result?.error || ""

    const handleCopy = async () => {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    return (
      <div
        className={cn(
          "my-2 w-full overflow-hidden rounded-lg border bg-card shadow-sm",
          isError &&
            !isRunning &&
            "border-red-200 dark:border-red-900"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
          <div className="flex items-center gap-2">
            {isRunning ? (
              <LoaderIcon className="size-4 animate-spin text-blue-500" />
            ) : isError ? (
              <XCircleIcon className="size-4 text-red-500" />
            ) : (
              <CheckCircleIcon className="size-4 text-green-500" />
            )}
            <span className="font-medium text-sm">
              {isRunning ? "Executing..." : isError ? "Execution failed" : "Executed"}
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
              {language}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0"
            onClick={handleCopy}
          >
            {copied ? (
              <CheckIcon className="size-3.5 text-green-500" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </Button>
        </div>

        {/* Code block */}
        {code && (
          <div className="border-b bg-zinc-950 p-3">
            <pre className="overflow-x-auto font-mono text-green-400 text-xs">
              <code>{code}</code>
            </pre>
          </div>
        )}

        {/* Output */}
        {(output || errorOutput || isRunning) && (
          <div className="bg-zinc-900 p-3">
            {isRunning ? (
              <div className="flex items-center gap-2 text-zinc-400 text-xs">
                <PlayIcon className="size-3" />
                <span>Running...</span>
              </div>
            ) : (
              <>
                {output && (
                  <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-zinc-300 text-xs">
                    {output}
                  </pre>
                )}
                {errorOutput && (
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-red-400 text-xs">
                    {errorOutput}
                  </pre>
                )}
                {!output && !errorOutput && (
                  <span className="text-zinc-500 text-xs italic">
                    No output
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {/* Exit code */}
        {result?.exitCode !== undefined && (
          <div className="border-t bg-muted/30 px-4 py-1.5">
            <span className="text-muted-foreground text-xs">
              Exit code:{" "}
              <span
                className={cn(
                  "font-mono",
                  result.exitCode === 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {result.exitCode}
              </span>
            </span>
          </div>
        )}
      </div>
    )
  },
})

/**
 * Factory function to create a code execution tool UI for a specific tool name
 */
export function createCodeExecutionToolUI(toolName: string) {
  return makeAssistantToolUI<CodeExecutionArgs, CodeExecutionResult>({
    toolName,
    render: function CodeExecutionRender({ args, result, status }) {
      const [copied, setCopied] = useState(false)
      const isRunning = status.type === "running"
      const isError =
        status.type === "incomplete" ||
        result?.error ||
        result?.exitCode !== 0 ||
        result?.success === false

      const code = args.code || args.command || ""
      const language = args.language || "shell"

      const output = result?.output || result?.stdout || ""
      const errorOutput = result?.stderr || result?.error || ""

      const handleCopy = async () => {
        await navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }

      return (
        <div
          className={cn(
            "my-2 w-full overflow-hidden rounded-lg border bg-card shadow-sm",
            isError &&
              !isRunning &&
              "border-red-200 dark:border-red-900"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
            <div className="flex items-center gap-2">
              {isRunning ? (
                <LoaderIcon className="size-4 animate-spin text-blue-500" />
              ) : isError ? (
                <XCircleIcon className="size-4 text-red-500" />
              ) : (
                <CheckCircleIcon className="size-4 text-green-500" />
              )}
              <span className="font-medium text-sm">
                {isRunning ? "Executing..." : isError ? "Execution failed" : "Executed"}
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
                {language}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              onClick={handleCopy}
            >
              {copied ? (
                <CheckIcon className="size-3.5 text-green-500" />
              ) : (
                <CopyIcon className="size-3.5" />
              )}
            </Button>
          </div>

          {/* Code block */}
          {code && (
            <div className="border-b bg-zinc-950 p-3">
              <pre className="overflow-x-auto font-mono text-green-400 text-xs">
                <code>{code}</code>
              </pre>
            </div>
          )}

          {/* Output */}
          {(output || errorOutput || isRunning) && (
            <div className="bg-zinc-900 p-3">
              {isRunning ? (
                <div className="flex items-center gap-2 text-zinc-400 text-xs">
                  <PlayIcon className="size-3" />
                  <span>Running...</span>
                </div>
              ) : (
                <>
                  {output && (
                    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-zinc-300 text-xs">
                      {output}
                    </pre>
                  )}
                  {errorOutput && (
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-red-400 text-xs">
                      {errorOutput}
                    </pre>
                  )}
                  {!output && !errorOutput && (
                    <span className="text-zinc-500 text-xs italic">
                      No output
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          {/* Exit code */}
          {result?.exitCode !== undefined && (
            <div className="border-t bg-muted/30 px-4 py-1.5">
              <span className="text-muted-foreground text-xs">
                Exit code:{" "}
                <span
                  className={cn(
                    "font-mono",
                    result.exitCode === 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {result.exitCode}
                </span>
              </span>
            </div>
          )}
        </div>
      )
    },
  })
}
