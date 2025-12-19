import { makeAssistantToolUI } from "@assistant-ui/react"
import { SearchIcon, ExternalLinkIcon, LoaderIcon } from "lucide-react"

// Type definitions for search tool
interface SearchArgs {
  query: string
  [key: string]: unknown
}

interface SearchResultItem {
  title?: string
  url?: string
  snippet?: string
  description?: string
  [key: string]: unknown
}

interface SearchResult {
  results?: SearchResultItem[]
  items?: SearchResultItem[]
  [key: string]: unknown
}

/**
 * SearchToolUI - A component for displaying search tool results
 *
 * Compatible with tools that return search results with items containing:
 * - title: Result title
 * - url: Link to the result
 * - snippet/description: Brief description
 *
 * Customize the toolName to match your specific search tool.
 */
export const SearchToolUI = makeAssistantToolUI<SearchArgs, SearchResult>({
  toolName: "search", // Change this to match your tool name
  render: ({ args, result, status }) => {
    const isRunning = status.type === "running"
    const results = result?.results || result?.items || []

    return (
      <div className="my-2 w-full rounded-lg border bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          {isRunning ? (
            <LoaderIcon className="size-4 animate-spin text-blue-500" />
          ) : (
            <SearchIcon className="size-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">
            {isRunning
              ? `Searching for "${args.query}"...`
              : `Search results for "${args.query}"`}
          </span>
        </div>

        {/* Results */}
        {!isRunning && results.length > 0 && (
          <div className="divide-y">
            {results.slice(0, 5).map((item, index) => (
              <SearchResultCard key={index} item={item} />
            ))}
            {results.length > 5 && (
              <div className="px-4 py-2 text-center text-muted-foreground text-xs">
                +{results.length - 5} more results
              </div>
            )}
          </div>
        )}

        {/* No results */}
        {!isRunning && results.length === 0 && result !== undefined && (
          <div className="px-4 py-6 text-center text-muted-foreground text-sm">
            No results found
          </div>
        )}

        {/* Loading skeleton */}
        {isRunning && (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  },
})

function SearchResultCard({ item }: { item: SearchResultItem }) {
  const title = item.title || "Untitled"
  const description = item.snippet || item.description || ""
  const url = item.url

  return (
    <div className="px-4 py-3 transition-colors hover:bg-muted/50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1 font-medium text-blue-600 text-sm hover:underline dark:text-blue-400"
            >
              <span className="truncate">{title}</span>
              <ExternalLinkIcon className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          ) : (
            <span className="font-medium text-sm">{title}</span>
          )}
          {description && (
            <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Factory function to create a search tool UI for a specific tool name
 */
export function createSearchToolUI(toolName: string) {
  return makeAssistantToolUI<SearchArgs, SearchResult>({
    toolName,
    render: ({ args, result, status }) => {
      const isRunning = status.type === "running"
      const results = result?.results || result?.items || []

      return (
        <div className="my-2 w-full rounded-lg border bg-card shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-2 border-b px-4 py-3">
            {isRunning ? (
              <LoaderIcon className="size-4 animate-spin text-blue-500" />
            ) : (
              <SearchIcon className="size-4 text-muted-foreground" />
            )}
            <span className="font-medium text-sm">
              {isRunning
                ? `Searching for "${args.query}"...`
                : `Search results for "${args.query}"`}
            </span>
          </div>

          {/* Results */}
          {!isRunning && results.length > 0 && (
            <div className="divide-y">
              {results.slice(0, 5).map((item, index) => (
                <SearchResultCard key={index} item={item} />
              ))}
              {results.length > 5 && (
                <div className="px-4 py-2 text-center text-muted-foreground text-xs">
                  +{results.length - 5} more results
                </div>
              )}
            </div>
          )}

          {/* No results */}
          {!isRunning && results.length === 0 && result !== undefined && (
            <div className="px-4 py-6 text-center text-muted-foreground text-sm">
              No results found
            </div>
          )}

          {/* Loading skeleton */}
          {isRunning && (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-full rounded bg-muted" />
                </div>
              ))}
            </div>
          )}
        </div>
      )
    },
  })
}
