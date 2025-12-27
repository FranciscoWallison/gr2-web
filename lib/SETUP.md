# Setup Instructions

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install:
- TypeScript compiler
- Three.js type definitions
- http-server for testing

### 2. Build the Library

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### 3. Run the Example

```bash
npm run serve
```

This starts a local server and opens the example in your browser at http://localhost:8080

## Development Mode

To auto-rebuild on file changes:

```bash
npm run dev
```

In another terminal, run:

```bash
npm run serve
```

## Fixing TypeScript Errors

All TypeScript errors have been fixed:
- ✅ Added missing imports in index.ts
- ✅ Fixed ArrayBuffer vs SharedArrayBuffer type issues
- ✅ Added @types/three dependency
- ✅ Fixed implicit 'any' types
- ✅ Updated package.json scripts

## Testing

The example currently shows a demo cube. To load actual GR2 files:

1. Build the library first (`npm run build`)
2. The built library will be in `dist/`
3. Import it in your HTML/JS code

## Troubleshooting

### "Cannot find module 'three'"
Run: `npm install`

### "Cannot find name 'GR2Parser'"
Make sure you've run `npm run build` first

### Example page not loading
Use `npm run serve` instead of opening the file directly in the browser (CORS issues)

### Build errors
Delete `node_modules` and `package-lock.json`, then run `npm install` again
