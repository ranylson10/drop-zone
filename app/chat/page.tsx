import { Suspense } from 'react'
import ChatShell from '@/app/components/chat/ChatShell'

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatShell />
    </Suspense>
  )
}
