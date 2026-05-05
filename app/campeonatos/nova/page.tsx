import { Suspense } from 'react'
import ClientPage from './client-page'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <ClientPage />
    </Suspense>
  )
}
