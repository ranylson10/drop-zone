const fs = require('fs')
const path = require('path')

const ROOT = path.join(process.cwd(), 'app')

function walk(dir) {
  if (!fs.existsSync(dir)) return []

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    if (entry.isFile() && entry.name === 'page.tsx') return [full]
    return []
  })
}

const files = walk(ROOT)
let changed = 0

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8')

  const usesSearchParams = content.includes('useSearchParams')
  if (!usesSearchParams) continue

  const alreadyDynamic = content.includes("export const dynamic = 'force-dynamic'") || content.includes('export const dynamic = "force-dynamic"')
  const alreadySuspense = content.includes('<Suspense') || content.includes('from \'react\'') && content.includes('Suspense')

  if (!alreadyDynamic) {
    if (content.startsWith("'use client'") || content.startsWith('"use client"')) {
      const firstLineEnd = content.indexOf('\n') + 1
      content =
        content.slice(0, firstLineEnd) +
        "\nexport const dynamic = 'force-dynamic'\n" +
        content.slice(firstLineEnd)
    } else {
      content = "export const dynamic = 'force-dynamic'\n\n" + content
    }
  }

  if (!content.includes('Suspense')) {
    content = content.replace(
      /import\s+\{([^}]+)\}\s+from\s+['"]react['"]/,
      (match, imports) => {
        const parts = imports.split(',').map((p) => p.trim())
        if (!parts.includes('Suspense')) parts.push('Suspense')
        return `import { ${parts.join(', ')} } from 'react'`
      }
    )

    if (!content.includes("from 'react'") && !content.includes('from "react"')) {
      content = content.replace(/('use client'|"use client")\s*\n/, `$1\n\nimport { Suspense } from 'react'\n`)
    }
  }

  fs.writeFileSync(file, content, 'utf8')
  console.log('corrigido:', path.relative(process.cwd(), file))
  changed++
}

console.log(`\nTotal corrigido: ${changed}`)