import { BrowserRouter } from "react-router-dom"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AssistantRuntimeProvider } from "./assistant-runtime-provider"
import { Thread } from "@/components/assistant-ui/thread"

export const AssistantApp: React.FC = () => {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <div className="h-full w-full">
          <AssistantRuntimeProvider>
            <Thread />
          </AssistantRuntimeProvider>
        </div>
      </TooltipProvider>
    </BrowserRouter>
  )
}
