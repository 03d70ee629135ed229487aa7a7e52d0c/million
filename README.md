# Million.js (Active Fork)

An actively maintained fork of [aidenybai/million](https://github.com/aidenybai/million) (v3.1.10) with React 19 and React Compiler compatibility. The upstream project has been stalled on React 19 support since early 2024.

## What's changed in this fork

- **React 19 support** — Works with both React 18 and React 19
- **React Compiler compatibility** — Coexists with `babel-plugin-react-compiler`
- **Compiler-only mode** — Dropped the manual `block()` / `For` runtime API in favor of the compiler plugin exclusively
- **Telemetry off by default** — Opt-in instead of opt-out
- **Comprehensive test suite** — 129 tests covering the core engine, compiler transforms, and utilities

## What is Million.js?

Million.js is an optimizing compiler that makes React components faster by replacing React's reconciliation with direct DOM updates.

Instead of diffing the entire component tree on every update (`O(n)`), Million.js compiles components into blocks that patch only the values that changed (`O(1)`).

```jsx
// You write normal React
function App() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

// The compiler optimizes it — only the text node updates, no diffing
```

## Installation

```bash
pnpm add million
```

Add the compiler plugin to your build tool (Vite, Webpack, Next.js, etc.):

```js
// vite.config.js
import million from 'million/compiler';

export default {
  plugins: [million.vite({ auto: true })],
};
```

The `auto: true` option automatically detects and optimizes eligible components. No manual wrapping needed.

## How it works

1. The compiler analyzes your JSX at build time
2. Components with enough static structure are transformed into "blocks"
3. Blocks bypass React's diffing — they update the DOM directly
4. React still handles state, effects, and component lifecycle normally

## Packages

| Package | Description |
|---------|-------------|
| [`million`](packages/million) | Core virtual DOM engine (blocks, arrays, DOM ops) |
| [`react`](packages/react) / [`react-server`](packages/react-server) | React integration and SSR support |
| [`compiler`](packages/compiler) | Babel-based auto-optimization plugin |
| [`jsx-runtime`](packages/jsx-runtime) | JSX runtime for the core engine |
| [`types`](packages/types) | Shared TypeScript types |

## Development

```bash
pnpm install    # Install dependencies
pnpm build      # Build all packages
pnpm test       # Run tests (129 tests, ~1.5s)
```

## Acknowledgments

Million.js was created by [Aiden Bai](https://github.com/aidenybai) and [contributors](https://github.com/aidenybai/million/graphs/contributors). This fork builds on their work.

Key inspirations for the original project:
- [`blockdom`](https://github.com/ged-odoo/blockdom) by Gery Debongnie — pioneered the "blocks" concept in virtual DOM
- [`voby`](https://github.com/vobyjs/voby) by Fabio Spampinato — the template API concept
- [`ivi`](https://github.com/localvoid/ivi), [Preact](https://github.com/preactjs/preact) — reconciliation techniques

## License

MIT — see [LICENSE](LICENSE).
