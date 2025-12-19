import type { FC } from "react"
import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ActionBarPrimitive,
  BranchPickerPrimitive,
} from "@assistant-ui/react"
import {
  ArrowDownIcon,
  SendHorizontalIcon,
  SquareIcon,
  PencilIcon,
  CopyIcon,
  RefreshCwIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
} from "lucide-react"

export const ChatThread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="aui-thread-root"
      style={{
        ["--thread-max-width" as string]: "42rem",
      }}
    >
      <ThreadPrimitive.Viewport className="aui-thread-viewport">
        <ThreadPrimitive.Empty>
          <ThreadWelcome />
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            EditComposer,
            AssistantMessage,
          }}
        />

        <ThreadPrimitive.If empty={false}>
          <div className="aui-thread-viewport-spacer" />
        </ThreadPrimitive.If>

        <div className="aui-thread-viewport-footer">
          <ThreadScrollToBottom />
          <Composer />
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  )
}

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <button className="aui-thread-scroll-to-bottom">
        <ArrowDownIcon />
      </button>
    </ThreadPrimitive.ScrollToBottom>
  )
}

const ThreadWelcome: FC = () => {
  return (
    <div className="aui-thread-welcome-root">
      <div className="aui-thread-welcome-center">
        <p className="aui-thread-welcome-message">
          <span className="aui-thread-welcome-message-inner">How can I help you today?</span>
        </p>
      </div>
      <div className="aui-thread-welcome-suggestions">
        <ThreadPrimitive.Suggestion className="aui-thread-welcome-suggestion" prompt="Show me how to create a dashboard" method="replace" autoSend>
          <span className="aui-thread-welcome-suggestion-text">Create a dashboard</span>
        </ThreadPrimitive.Suggestion>
        <ThreadPrimitive.Suggestion className="aui-thread-welcome-suggestion" prompt="How do I write a query in OpenSearch?" method="replace" autoSend>
          <span className="aui-thread-welcome-suggestion-text">Write a query</span>
        </ThreadPrimitive.Suggestion>
        <ThreadPrimitive.Suggestion className="aui-thread-welcome-suggestion" prompt="Explain my data patterns" method="replace" autoSend>
          <span className="aui-thread-welcome-suggestion-text">Analyze data patterns</span>
        </ThreadPrimitive.Suggestion>
      </div>
    </div>
  )
}

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="aui-composer-root">
      <ComposerPrimitive.Input className="aui-composer-input" placeholder="Write a message..." rows={1} autoFocus />
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send asChild>
          <button className="aui-button aui-composer-send">
            <SendHorizontalIcon />
          </button>
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel asChild>
          <button className="aui-button aui-composer-cancel">
            <SquareIcon />
          </button>
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </ComposerPrimitive.Root>
  )
}

const EditComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="aui-edit-composer-root">
      <ComposerPrimitive.Input className="aui-edit-composer-input" />
      <div className="aui-edit-composer-footer">
        <ComposerPrimitive.Cancel asChild>
          <button className="aui-button aui-button-outline">Cancel</button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <button className="aui-button aui-button-primary">Save</button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  )
}

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="aui-user-message-root">
      <UserActionBar />
      <div className="aui-user-message-content">
        <MessagePrimitive.Content />
      </div>
      <BranchPicker className="aui-user-branch-picker" />
    </MessagePrimitive.Root>
  )
}

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="aui-assistant-message-root">
      <div className="aui-assistant-message-content">
        <MessagePrimitive.Content />
      </div>
      <AssistantActionBar />
      <BranchPicker className="aui-assistant-branch-picker" />
    </MessagePrimitive.Root>
  )
}

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root className="aui-user-action-bar-root" hideWhenRunning autohide="not-last">
      <ActionBarPrimitive.Edit asChild>
        <button className="aui-button-icon">
          <PencilIcon />
        </button>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  )
}

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root className="aui-assistant-action-bar-root" hideWhenRunning autohide="not-last">
      <ActionBarPrimitive.Copy asChild>
        <button className="aui-button-icon">
          <MessagePrimitive.If copied>
            <CheckIcon />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon />
          </MessagePrimitive.If>
        </button>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <button className="aui-button-icon">
          <RefreshCwIcon />
        </button>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  )
}

interface BranchPickerProps {
  className?: string
}

const BranchPicker: FC<BranchPickerProps> = ({ className }) => {
  return (
    <BranchPickerPrimitive.Root className={`aui-branch-picker-root ${className || ""}`} hideWhenSingleBranch>
      <BranchPickerPrimitive.Previous asChild>
        <button className="aui-button-icon">
          <ChevronLeftIcon />
        </button>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <button className="aui-button-icon">
          <ChevronRightIcon />
        </button>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  )
}
