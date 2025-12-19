import { BrowserRouter } from "react-router-dom"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AssistantRuntimeProvider } from "./assistant-runtime-provider"
import { Thread } from "@/components/assistant-ui/thread"

// Tool UI components - mount these to register custom tool renderers
import { GenericToolUI } from "@/components/tool-ui"

export const AssistantApp: React.FC = () => {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <div className="h-full w-full">
          <AssistantRuntimeProvider>
            {/* GenericToolUI renders for any tool call as a fallback */}
            <GenericToolUI />

            <Thread />
          </AssistantRuntimeProvider>
        </div>
      </TooltipProvider>
    </BrowserRouter>
  )
}
