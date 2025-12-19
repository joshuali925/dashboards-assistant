import * as React from "react"
import { useEffect, useState, useCallback, useMemo } from "react"
import { codeToHtml, type BundledLanguage } from "shiki"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  CopyIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LoaderIcon,
  FileIcon,
} from "lucide-react"

// Types for response actions
interface ResponseAction {
  id: string
  label: string
  icon?: "copy" | "play" | "download" | string
}

export interface CodeBlockProps {
  id: string
  code: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
  highlightLines?: number[]
  maxCollapsedLines?: number
  responseActions?: ResponseAction[]
  onResponseAction?: (actionId: string) => Promise<void> | void
  isLoading?: boolean
}

// Parse serialized code block result from tool
export function parseSerializableCodeBlock(result: unknown): CodeBlockProps {
  if (typeof result !== "object" || result === null) {
    return { id: "fallback", code: String(result ?? ""), language: "text" }
  }

  const obj = result as Record<string, unknown>
  return {
    id: String(obj.id ?? "code-block"),
    code: String(obj.code ?? ""),
    language: String(obj.language ?? "text"),
    filename: obj.filename ? String(obj.filename) : undefined,
    showLineNumbers: obj.showLineNumbers === true,
    highlightLines: Array.isArray(obj.highlightLines)
      ? obj.highlightLines.map(Number)
      : undefined,
    maxCollapsedLines:
      typeof obj.maxCollapsedLines === "number"
        ? obj.maxCollapsedLines
        : undefined,
  }
}

// Error boundary component for code block
export class CodeBlockErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="my-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          <p className="font-medium text-sm">Failed to render code block</p>
          <p className="mt-1 text-xs opacity-80">
            {this.state.error?.message ?? "Unknown error"}
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  id,
  code,
  language = "text",
  filename,
  showLineNumbers = false,
  highlightLines = [],
  maxCollapsedLines,
  responseActions = [],
  onResponseAction,
  isLoading = false,
}) => {
  const [highlightedHtml, setHighlightedHtml] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  // Track if we've ever successfully highlighted (to avoid showing loading after first render)
  const hasHighlightedRef = React.useRef(false)
  // Track the last highlighted code to avoid unnecessary re-highlights
  const lastHighlightedCodeRef = React.useRef<string>("")
  // Debounce timer ref
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Count lines in code
  const lineCount = useMemo(() => code.split("\n").length, [code])

  // Check if code should be collapsible
  const isCollapsible =
    maxCollapsedLines !== undefined && lineCount > maxCollapsedLines

  // Get visible code based on collapse state
  const visibleCode = useMemo(() => {
    if (!isCollapsible || isExpanded) {
      return code
    }
    return code.split("\n").slice(0, maxCollapsedLines).join("\n")
  }, [code, isCollapsible, isExpanded, maxCollapsedLines])

  // Syntax highlighting with shiki - debounced to avoid flashing during streaming
  useEffect(() => {
    if (isLoading || !visibleCode) {
      return
    }

    // Skip if code hasn't changed
    if (visibleCode === lastHighlightedCodeRef.current) {
      return
    }

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Debounce highlighting during streaming (300ms)
    // This prevents flashing while text is being streamed
    debounceTimerRef.current = setTimeout(() => {
      let cancelled = false

      const highlight = async () => {
        try {
          // Map common language aliases
          const langMap: Record<string, BundledLanguage> = {
            js: "javascript",
            ts: "typescript",
            py: "python",
            rb: "ruby",
            sh: "bash",
            shell: "bash",
            yml: "yaml",
            md: "markdown",
          }

          const lang = (langMap[language] || language) as BundledLanguage

          const html = await codeToHtml(visibleCode, {
            lang,
            theme: "github-dark-default",
            transformers: [
              {
                line(node, line) {
                  // Add line number data attribute
                  node.properties["data-line"] = line
                  // Highlight specific lines
                  if (highlightLines.includes(line)) {
                    node.properties["class"] =
                      (node.properties["class"] || "") + " highlighted-line"
                  }
                },
              },
            ],
          })

          if (!cancelled) {
            setHighlightedHtml(html)
            hasHighlightedRef.current = true
            lastHighlightedCodeRef.current = visibleCode
          }
        } catch (err) {
          console.warn("Failed to highlight code:", err)
          if (!cancelled) {
            // Fall back to plain text - but keep hasHighlightedRef false
            // so we show plain text instead of loading
            hasHighlightedRef.current = true
            lastHighlightedCodeRef.current = visibleCode
          }
        }
      }

      highlight()

      return () => {
        cancelled = true
      }
    }, hasHighlightedRef.current ? 300 : 50) // Faster initial highlight, debounce updates

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [visibleCode, language, highlightLines, isLoading])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  const handleAction = useCallback(
    async (actionId: string) => {
      if (actionId === "copy") {
        await handleCopy()
        return
      }
      if (onResponseAction) {
        await onResponseAction(actionId)
      }
    },
    [handleCopy, onResponseAction]
  )

  if (isLoading) {
    return (
      <div
        className="my-2 w-full overflow-hidden rounded-lg border bg-card shadow-sm"
        data-code-block-id={id}
      >
        <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
          <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground text-sm">
            Loading code...
          </span>
        </div>
        <div className="h-24 animate-pulse bg-zinc-900" />
      </div>
    )
  }

  return (
    <div
      className="my-2 w-full overflow-hidden rounded-lg border bg-card shadow-sm"
      data-code-block-id={id}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2">
          {filename && (
            <>
              <FileIcon className="size-4 text-muted-foreground" />
              <span className="font-medium text-sm">{filename}</span>
            </>
          )}
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {responseActions.length > 0 ? (
            responseActions.map((action) => (
              <Button
                key={action.id}
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handleAction(action.id)}
              >
                {action.id === "copy" && copied ? (
                  <CheckIcon className="mr-1 size-3 text-green-500" />
                ) : action.icon === "copy" ? (
                  <CopyIcon className="mr-1 size-3" />
                ) : null}
                {action.id === "copy" && copied ? "Copied!" : action.label}
              </Button>
            ))
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              onClick={handleCopy}
              title="Copy code"
            >
              {copied ? (
                <CheckIcon className="size-3.5 text-green-500" />
              ) : (
                <CopyIcon className="size-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Code content */}
      <div className="relative bg-zinc-950">
        {highlightedHtml ? (
          <div
            className={cn(
              "code-block-content overflow-x-auto p-4",
              showLineNumbers && "show-line-numbers"
            )}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          // Show plain text while highlighting is in progress or if highlighting failed
          // This prevents flashing during streaming
          <pre className="overflow-x-auto p-4 font-mono text-zinc-300 text-sm">
            <code>{visibleCode}</code>
          </pre>
        )}

        {/* Collapse overlay */}
        {isCollapsible && !isExpanded && (
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-950 to-transparent" />
        )}
      </div>

      {/* Expand/collapse button */}
      {isCollapsible && (
        <div className="border-t bg-zinc-900/50 px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full text-xs text-zinc-400 hover:text-zinc-200"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUpIcon className="mr-1 size-3" />
                Collapse ({lineCount} lines)
              </>
            ) : (
              <>
                <ChevronDownIcon className="mr-1 size-3" />
                Show all {lineCount} lines
              </>
            )}
          </Button>
        </div>
      )}

      {/* Styles for highlighted lines and line numbers */}
      <style>{`
        .code-block-content pre {
          margin: 0;
          background: transparent !important;
        }
        .code-block-content code {
          display: block;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .code-block-content .line {
          display: inline-block;
          width: 100%;
          padding: 0 0.5rem;
          margin: 0 -0.5rem;
        }
        .code-block-content .highlighted-line {
          background: rgba(255, 255, 0, 0.1);
          border-left: 3px solid #fbbf24;
          padding-left: calc(0.5rem - 3px);
        }
        .code-block-content.show-line-numbers .line::before {
          content: attr(data-line);
          display: inline-block;
          width: 2.5rem;
          margin-right: 1rem;
          text-align: right;
          color: #6b7280;
          user-select: none;
        }
      `}</style>
    </div>
  )
}

export default CodeBlock
