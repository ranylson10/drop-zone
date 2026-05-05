const fs = require('fs')
const path = require('path')

const appDir = path.join(process.cwd(), 'app')

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    if (entry.isFile() && entry.name === 'page.tsx') return [full]
    return []
  })
}

let total = 0

for (const pagePath of walk(appDir)) {
  const original = fs.readFileSync(pagePath, 'utf8')

  if (!original.includes('useSearchParams')) continue
  if (original.includes("import ClientPage from './client-page'")) continue

  const dir = path.dirname(pagePath)
  const clientPath = path.join(dir, 'client-page.tsx')

  fs.writeFileSync(clientPath, original, 'utf8')

  const wrapper = `import { Suspense } from 'react'
import ClientPage from './client-page'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <ClientPage />
    </Suspense>
  )
}
`

  fs.writeFileSync(pagePath, wrapper, 'utf8')
  console.log('corrigido:', path.relative(process.cwd(), pagePath))
  total++
}

console.log('Total corrigido:', total)