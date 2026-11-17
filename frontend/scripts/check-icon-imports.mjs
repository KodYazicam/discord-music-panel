#!/usr/bin/env node
/**
 * Resolves every named lucide-react import used by the dashboard against the
 * version installed in frontend/node_modules and fails with the missing icon
 * names. lucide-react 1.x dropped the brand icons, and without this the only
 * signal was a Rollup trace after a full `npm ci`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as lucide from 'lucide-react'

const here = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(here, '..', 'src')
const packagePath = path.resolve(here, '..', 'node_modules', 'lucide-react', 'package.json')

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.jsx?$/.test(entry.name) ? [full] : []
  })
}

function lucideImportsIn(source) {
  const names = []
  const pattern = /import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g
  let match
  while ((match = pattern.exec(source))) {
    for (const raw of match[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim()
      if (name) names.push(name)
    }
  }
  return names
}

const imports = new Map()
for (const file of sourceFiles(srcDir)) {
  for (const name of lucideImportsIn(fs.readFileSync(file, 'utf8'))) {
    if (!imports.has(name)) imports.set(name, new Set())
    imports.get(name).add(path.relative(srcDir, file))
  }
}

const missing = [...imports.keys()].filter((name) => !(name in lucide)).sort()
const version = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version

if (missing.length > 0) {
  console.error(`lucide-react ${version} is missing ${missing.length} imported icon(s):`)
  for (const name of missing) {
    console.error(`  - ${name} (${[...imports.get(name)].join(', ')})`)
  }
  console.error('Replace the import or vendor the mark locally, then re-run npm run icons:check.')
  process.exit(1)
}

console.log(`lucide-react ${version}: all ${imports.size} named icon imports resolve`)
