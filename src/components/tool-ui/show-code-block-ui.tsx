import { makeAssistantToolUI } from "@assistant-ui/react"
import {
  CodeBlock,
  CodeBlockErrorBoundary,
  parseSerializableCodeBlock,
} from "./code-block"

// Type definitions for the showCodeBlock tool
interface ShowCodeBlockArgs {
  code?: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
  highlightLines?: number[]
  maxCollapsedLines?: number
  [key: string]: unknown
}

interface ShowCodeBlockResult {
  id?: string
  code?: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
  highlightLines?: number[]
  maxCollapsedLines?: number
  [key: string]: unknown
}

/**
 * ParsedCodeBlock - Parses tool result and renders CodeBlock
 */
function ParsedCodeBlock({ result }: { result: unknown }) {
  const props = parseSerializableCodeBlock(result)
  return (
    <CodeBlock
      {...props}
      responseActions={[
        { id: "copy", label: "Copy", icon: "copy" },
      ]}
    />
  )
}

/**
 * ShowCodeBlockUI - Tool UI for rendering code blocks from HolmesGPT
 *
 * This component integrates with the ag-ui protocol to render
 * syntax-highlighted code blocks when HolmesGPT returns code.
 *
 * The tool expects either:
 * 1. Code in args: { code, language, filename, ... }
 * 2. Code in result: { id, code, language, filename, ... }
 *
 * Example tool call from HolmesGPT:
 * {
 *   toolName: "showCodeBlock",
 *   args: {
 *     code: "console.log('Hello');",
 *     language: "javascript",
 *     filename: "example.js"
 *   }
 * }
 */
export const ShowCodeBlockUI = makeAssistantToolUI<
  ShowCodeBlockArgs,
  ShowCodeBlockResult
>({
  toolName: "showCodeBlock",
  render: function ShowCodeBlockRender({ args, result, status }) {
    const isRunning = status.type === "running"

    // If still running (streaming), show loading state with any partial code
    if (isRunning) {
      // Show partial code if available in args during streaming
      if (args.code) {
        return (
          <CodeBlock
            id="streaming"
            code={args.code}
            language={args.language ?? "text"}
            filename={args.filename}
            showLineNumbers={args.showLineNumbers}
            highlightLines={args.highlightLines}
            maxCollapsedLines={args.maxCollapsedLines}
            isLoading={false}
          />
        )
      }
      return <CodeBlock id="loading" code="" language="text" isLoading />
    }

    // Tool completed - render from result or fall back to args
    const codeData = result ?? args

    if (!codeData || (!codeData.code && !args.code)) {
      return (
        <div className="my-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-400">
          <p className="text-sm">No code provided</p>
        </div>
      )
    }

    return (
      <CodeBlockErrorBoundary>
        <ParsedCodeBlock result={codeData.code ? codeData : args} />
      </CodeBlockErrorBoundary>
    )
  },
})

/**
 * Factory function to create a code block tool UI for a specific tool name
 * Use this if your tool has a different name than "showCodeBlock"
 */
export function createShowCodeBlockUI(toolName: string) {
  return makeAssistantToolUI<ShowCodeBlockArgs, ShowCodeBlockResult>({
    toolName,
    render: function ShowCodeBlockRender({ args, result, status }) {
      const isRunning = status.type === "running"

      if (isRunning) {
        if (args.code) {
          return (
            <CodeBlock
              id="streaming"
              code={args.code}
              language={args.language ?? "text"}
              filename={args.filename}
              showLineNumbers={args.showLineNumbers}
              highlightLines={args.highlightLines}
              maxCollapsedLines={args.maxCollapsedLines}
              isLoading={false}
            />
          )
        }
        return <CodeBlock id="loading" code="" language="text" isLoading />
      }

      const codeData = result ?? args

      if (!codeData || (!codeData.code && !args.code)) {
        return (
          <div className="my-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-400">
            <p className="text-sm">No code provided</p>
          </div>
        )
      }

      return (
        <CodeBlockErrorBoundary>
          <ParsedCodeBlock result={codeData.code ? codeData : args} />
        </CodeBlockErrorBoundary>
      )
    },
  })
}

export default ShowCodeBlockUI
