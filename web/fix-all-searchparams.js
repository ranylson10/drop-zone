const fs = require('fs')
const path = require('path')

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return walk(full)
    if (e.isFile() && full.endsWith('.tsx')) return [full]
    return []
  })
}

let total = 0

for (const file of walk(path.join(process.cwd(), 'app'))) {
  let c = fs.readFileSync(file, 'utf8')
  if (!c.includes('useSearchParams')) continue

  if (!c.includes("import { Suspense")) {
    c = c.replace(
      /import\s+\{([^}]+)\}\s+from\s+['"]react['"]/,
      (m, imports) => {
        const parts = imports.split(',').map(s => s.trim())
        if (!parts.includes('Suspense')) parts.push('Suspense')
        return `import { ${parts.join(', ')} } from 'react'`
      }
    )
  }

  if (file.endsWith('page.tsx')) {
    if (!c.includes("export const dynamic = 'force-dynamic'")) {
      c = c.replace("'use client'\n", "'use client'\n\nexport const dynamic = 'force-dynamic'\n")
    }
  }

  fs.writeFileSync(file, c, 'utf8')
  console.log('checado:', path.relative(process.cwd(), file))
  total++
}

console.log('Total:', total)