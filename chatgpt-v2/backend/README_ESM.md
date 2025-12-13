# ESM + TypeScript (NodeNext)

This backend is Node.js ESM (`package.json` has `"type":"module"`).

Rule: all relative imports in TypeScript include `.js`:

- ✅ `import { x } from './x.js'`
- ❌ `import { x } from './x'`

TypeScript preserves import specifiers; Node ESM will not resolve extensionless relative imports.
