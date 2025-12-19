import { BrowserRouter } from "react-router-dom"
import { AssistantRuntimeProvider } from "./assistant-runtime-provider"
import { ChatThread } from "./chat-thread"

export const AssistantApp: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="aui-root h-full w-full">
        <AssistantRuntimeProvider>
          <ChatThread />
        </AssistantRuntimeProvider>
      </div>
    </BrowserRouter>
  )
}
