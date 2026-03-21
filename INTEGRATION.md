# Million.js Integration Guide for OpenUI

This document provides everything needed to integrate the Million.js compiler fork into the OpenUI production codebase.

## Quick Summary

Million.js is a compiler plugin that optimizes React components by replacing React's O(n) reconciliation with O(1) direct DOM updates. It analyzes JSX at build time, identifies components with enough static structure, and compiles them into "blocks" that skip diffing entirely.

This fork adds React 19 support and drops the manual runtime API — the compiler is the only supported integration path.

---

## 1. Installation

Add million as a dependency (use the fork):

```bash
pnpm add https://github.com/03d70ee629135ed229487aa7a7e52d0c/million
```

Or link locally during development:

```json
{
  "dependencies": {
    "million": "link:../path-to-million"
  }
}
```

If the project is a pnpm workspace sibling, use `"million": "workspace:*"` and add the million directory to `pnpm-workspace.yaml`.

---

## 2. Vite Configuration

Add the Million compiler plugin to `vite.config.ts`. It **must run before** other JSX-transforming plugins (vinext, vite:react, etc.):

```typescript
import million from "million/compiler";

export default defineConfig({
  plugins: [
    million.vite({ auto: true, rsc: true }),  // MUST be first
    // ... other plugins (vinext, etc.)
  ],
});
```

### Options

| Option | Value | Purpose |
|--------|-------|---------|
| `auto` | `true` | Auto-detect and optimize eligible components |
| `rsc` | `true` | React Server Components support — only transforms `"use client"` components |
| `auto.threshold` | `0.1` (default) | Minimum improvement ratio to trigger optimization |
| `log` | `true` (default) | Print optimization results during build |
| `telemetry` | `false` (default) | Anonymous usage analytics (opt-in) |

### What NOT to configure

- Do NOT add million to `next.config.ts` — the Vite plugin handles everything
- Do NOT import `block` or `For` from `million/react` — these are removed in this fork
- The `reactCompiler: true` setting in next.config.ts is compatible and complementary

---

## 3. How the Compiler Decides What to Optimize

The compiler's auto mode scans every `.tsx`/`.jsx` file and evaluates each component:

### A component IS optimized when:

1. It's a named function starting with an uppercase letter (React convention)
2. It has 0 or 1 parameters (standard React component signature)
3. It has a single return statement (no conditional returns)
4. Its JSX has >= 5 "good" nodes (elements + attributes + text)
5. The improvement ratio `(good - bad) / (good + bad)` exceeds the threshold (default 10%)
   - "good" = static elements, attributes, text nodes
   - "bad" = dynamic component children (portals)
6. In RSC mode (`rsc: true`), only `"use client"` components are considered

### A component is NOT optimized when:

1. It has multiple return statements (conditional rendering)
2. Its JSX is too small (< 5 static nodes)
3. It has too many dynamic component children relative to static content
4. It's a server component (no `"use client"` directive) in RSC mode
5. Its name starts with a lowercase letter
6. It has a `// million-ignore` or `// @million skip` comment above it

---

## 4. Verified Build Results

Build tested against OpenUI (React 19.3.0-canary, React Compiler enabled, vinext/Vite 7). The compiler successfully optimized **13 components** with zero errors.

Note: Component names below are from the compiler's build log (`⚡ <Name>`). These are the function names in source code, which may differ from the module's default export name (e.g., `Sidebar` is an inner function inside a file whose default export is `OpenUISidebar`).

| Component | Improvement | Source File |
|-----------|-------------|-------------|
| `TailwindIndicator` | ~100% | `components/tailwind-indicator/react.tsx` (81 lines) |
| `GlobeIcon` | ~100% | `components/icons/react.tsx` (584 lines, one of 40 icon exports) |
| `BrowserError` | ~75% | `app/@browser/error.tsx` (24 lines) |
| `PageSkeleton` | ~74% | `components/openui/canvas/react.tsx` (1,266 lines, inner function at line 204) |
| `Error` | ~71% | `app/error.tsx` (83 lines) |
| `NotFound` | ~71% | `app/not-found.tsx` (55 lines) |
| `StatusLabel` | ~69% | `components/openui/downloads-panel/react.tsx` (359 lines, inner function at line 277) |
| `Sidebar` | ~65% | `components/sidebar/react.tsx` (930 lines, function at line 156) |
| `PagePreview` | ~57% | `components/openui/page-preview/react.tsx` (163 lines) |
| `MagicLinkSent` | ~55% | `components/auth/magic-link-sent/react.tsx` (179 lines) |
| `CookieConsentBanner` | ~33% | `components/banners/cookie-consent/react.tsx` (92 lines) |
| `HomePage` | ~25% | `app/@browser/(home)/page.tsx` (72 lines) |
| `ErrorScreen` | ~23% | `components/openui/restoration-gate/react.tsx` (543 lines, inner function at line 394) |

Build completed successfully across all 5 Vite environments (client, SSR, RSC, rsc-ssr, rsc-ssr-prerender) with no Million-related errors.

---

## 5. Complete File Inventory (166 .tsx files)

Every `.tsx` file in the codebase, categorized by Million.js optimization status. Note: 4 files appear in multiple sections — `downloads-panel/react.tsx`, `canvas/react.tsx`, and `restoration-gate/react.tsx` (in both 5.1 and 5.2, optimized inner function + skipped main export), and `icons/react.tsx` (in both 5.1 and 5.3, server component with an optimized export).

### 5.1 OPTIMIZED (13 components)

These components were auto-detected and compiled into blocks:

| File | Lines | Directive |
|------|-------|-----------|
| `app/error.tsx` | 83 | use client |
| `app/not-found.tsx` | 55 | use client |
| `components/openui/restoration-gate/react.tsx` | 543 | use client (ErrorScreen is inner function at line 394) |
| `app/@browser/error.tsx` | 24 | use client |
| `app/@browser/(home)/page.tsx` | 72 | use client |
| `components/auth/magic-link-sent/react.tsx` | 179 | use client |
| `components/banners/cookie-consent/react.tsx` | 92 | use client |
| `components/icons/react.tsx` | 584 | server (GlobeIcon export) |
| `components/openui/canvas/react.tsx` | 1,266 | use client (PageSkeleton is inner function at line 204) |
| `components/openui/page-preview/react.tsx` | 163 | use client |
| `components/sidebar/react.tsx` | 930 | use client (Sidebar function at line 156) |
| `components/openui/downloads-panel/react.tsx` | 359 | use client (StatusLabel is inner function at line 277) |
| `components/tailwind-indicator/react.tsx` | 81 | use client |

### 5.1b NOT OPTIMIZED — Client Components in App Directory (small or conditional)

| File | Lines | Why Skipped |
|------|-------|-------------|
| `app/@browser/default.tsx` | 30 | use client — parallel route default, composes home layout |
| `app/@browser/page.tsx` | 16 | use client — manual composition of home layout + page |
| `app/@browser/(home)/layout.tsx` | 56 | use client — layout with Suspense, providers, motion wrapper |
| `app/global-error.tsx` | 71 | use client — global error boundary (GlobalError export) |
| `app/(auth)/login/page.tsx` | 310 | use client — multiple returns (form vs MagicLinkSent) |
| `app/(auth)/signup/page.tsx` | 310 | use client — multiple returns (form vs MagicLinkSent) |

### 5.2 NOT OPTIMIZED — Heavy Interactive Components (correct to skip)

| File | Lines | Why Skipped |
|------|-------|-------------|
| `components/openui/canvas/react.tsx` | 1,266 | Redux selectors, iframe rendering, spatial canvas, many hooks, multiple returns |
| `components/openui/sidebar/react.tsx` (main export) | 1,531 | DnD, dynamic imports, motion, Redux, tabs — only a static inner subtree was optimized |
| `components/openui/command-bar/react.tsx` | 1,082 | Search/filter, Redux, tRPC, keyboard shortcuts, multiple returns |
| `components/sidebar/react.tsx` | 930 | Complex layout sidebar with context, sheet, tooltip composition |
| `components/openui/restoration-gate/react.tsx` | 543 | State restoration logic, multiple returns, heavy hooks |
| `components/openui/address-bar/react.tsx` | 392 | Conditional rendering, multiple return paths, form state |
| `components/openui/history-panel/react.tsx` | 402 | Infinite scroll, pagination, tRPC |
| `components/openui/settings-panel/react.tsx` | 373 | Form state, tRPC mutations, multiple returns |
| `components/openui/bookmarks-panel/react.tsx` | 371 | tRPC mutations, list filtering, DnD |
| `components/openui/downloads-panel/react.tsx` | 359 | Dynamic list state, tRPC |
| `components/dnd/drop-indicator/react.tsx` | 316 | DnD geometry calculations, hooks |
| `components/command/react.tsx` | 294 | cmdk primitive, dialog state |
| `components/openui/minimap/react.tsx` | 264 | Canvas rendering, viewport calculations |
| `components/menubar/react.tsx` | 260 | Radix UI composition, many sub-exports |
| `components/openui/page-context-menu/react.tsx` | 259 | Context menu with dynamic actions |
| `components/openui/find-bar/react.tsx` | 254 | Search input state, keyboard shortcuts |
| `components/dnd/sortable-list/react.tsx` | 250 | DnD kit composition |
| `components/dnd/drag-overlay/react.tsx` | 244 | DnD overlay rendering |
| `components/logo/react-v2.tsx` | 243 | Animation-heavy, motion library |
| `components/openui/keyboard-shortcuts/react.tsx` | 221 | Event listeners, keyboard bindings |
| `components/iframe/browser/react.tsx` | 209 | Iframe management, message passing |
| `components/effects/highlight-hover-2/react.tsx` | 200 | Effect HOC with mouse tracking |
| `components/sheet/react.tsx` | 198 | Radix Dialog composition, multiple sub-exports |
| `components/website/navbar/dropdown-menu/react.tsx` | 186 | Dropdown with animation, multiple returns |
| `components/toast/react.tsx` | 180 | Toast notification system, HOC pattern |
| `components/openui/breadcrumbs/react.tsx` | 172 | Dynamic breadcrumb list |
| `components/openui/deep-link-handler/react.tsx` | 167 | URL parsing, effect-only component |
| `components/openui/sidebar/page-preview-tooltip.tsx` | 166 | Tooltip with dynamic positioning |
| `components/dropdown-menu/react.tsx` | 158 | Radix dropdown, multiple sub-exports |
| `components/effects/pressable/react.tsx` | 141 | Effect HOC with press state |
| `components/error-boundary/react.tsx` | 140 | Class component (not supported) |
| `components/openui/progress-bar/react.tsx` | 135 | Animation, multiple returns |
| `components/effects/highlight-hover/react.tsx` | 131 | Effect HOC with mouse tracking |
| `components/button/react.tsx` | 117 | Wrapped in PressableEffect HOC |
| `components/openui/status-bar/react.tsx` (main export) | 104 | Inner StatusLabel was optimized, main OpenUIStatusBar has hooks (same file as 5.1) |
| `components/openui/sidebar/dnd.tsx` | 100 | DnD utility component |
| `components/openui/camera/react.tsx` | 61 | Dynamic import wrapper |
| `components/openui/navigation-controller/react.tsx` | 60 | Effect-only routing component |
| `components/theme-button/react.tsx` | 58 | Too small, uses custom hook |
| `components/input/react.tsx` | 57 | forwardRef, wrapped in FocusableEffect |
| `components/effects/focusable/react.tsx` | 53 | Effect HOC |
| `components/openui/react.tsx` | 48 | Dynamic imports wrapper |
| `components/tooltip/react.tsx` | 49 | Radix tooltip, too small |
| `components/openui/clipboard-toast/react.tsx` | 37 | Too small |
| `components/scripts/gtm/react.tsx` | 37 | Script injection |
| `components/form/react.tsx` | 34 | react-hook-form utilities, multiple exports |
| `components/openui/display-compositor/react.tsx` | 31 | Too small |
| `components/separator/react.tsx` | 31 | Too small, single element |
| `components/dnd/example.tsx` | 513 | Dev-only example component |
| `components/command-bar/react.tsx` | 656 | Complex command palette |
| `components/auth/navbar/react.tsx` | 67 | use client — nav with conditional rendering |
| `components/website/footer/react.tsx` | 50 | use client — small footer with links |
| `components/website/header/react.tsx` | 83 | use client — header with navigation |

### 5.3 NOT OPTIMIZED — Server Components (skipped by `rsc: true`)

These have no `"use client"` directive and are skipped in RSC mode:

| File | Lines | Purpose |
|------|-------|---------|
| `app/layout.tsx` | 140 | Root layout (async server) |
| `app/page.tsx` | 5 | Root page (renders null) |
| `app/(auth)/layout.tsx` | 41 | Auth layout (session check) |
| `app/(auth)/login/layout.tsx` | 18 | Login metadata |
| `app/(auth)/signup/layout.tsx` | 18 | Signup metadata |
| `app/(misc)/layout.tsx` | 45 | Misc group layout |
| `app/(misc)/legal/[slug]/page.tsx` | 119 | Legal page (TinaCMS) |
| `app/[...url]/page.tsx` | 7 | Catch-all (renders null) |
| `app/@browser/layout.tsx` | 21 | Browser slot layout |
| `app/@browser/(home)/loading.tsx` | 8 | Loading skeleton |
| `app/@browser/[...url]/layout.tsx` | 19 | Browser URL layout |
| `app/@browser/[...url]/page.tsx` | 17 | Browser URL page |
| `app/apple-icon.tsx` | 18 | Apple icon generation |
| `app/icon.tsx` | 18 | Favicon generation |
| `app/global-components.tsx` | 14 | Dynamic component loader |
| `app/global-contexts.tsx` | 34 | Provider composition |
| `app/global-not-found.tsx` | 60 | Global 404 (no directive) |
| `app/global-scripts.tsx` | 8 | Script tags |
| `components/auth/footer/react.tsx` | 39 | Auth footer |
| `components/auth/header/react.tsx` | 12 | Auth header |
| `components/favicon/react.tsx` | 25 | Meta tag |
| `components/icons/react.tsx` | 584 | Icon exports (GlobeIcon was optimized individually) |
| `components/iframe/react.tsx` | 29 | IFrame wrapper |
| `components/logo/react.tsx` | 174 | Logo component |
| `components/openui/home-skeleton/react.tsx` | 145 | Skeleton (optimized despite no directive — caught in non-RSC pass) |
| `components/openui/loading/react.tsx` | 56 | Loading spinner |
| `components/scripts/gtm/next.tsx` | 11 | GTM script (Next.js) |
| `components/svg/react.tsx` | 14 | SVG utility |
| `components/website/navbar/react.tsx` | 12 | Website navbar |

### 5.4 NOT OPTIMIZED — Context Providers (28 files)

Context providers are wrapper components — they render `{children}` and set up state. Not candidates for block optimization.

| File | Lines | Purpose |
|------|-------|---------|
| `contexts/camera/react.tsx` | 111 | Camera viewport state |
| `contexts/cookie-consent/react.tsx` | 102 | Cookie consent state |
| `contexts/flags/next.tsx` | 19 | Feature flags (server) |
| `contexts/flags/react.tsx` | 36 | Feature flags (client) |
| `contexts/geolocation/react.tsx` | 40 | Geolocation |
| `contexts/lemon-squeezy/react.tsx` | 64 | Payment provider |
| `contexts/motion/react.tsx` | 25 | Animation config |
| `contexts/openui/broadcast/react.tsx` | 323 | Broadcast messaging |
| `contexts/openui/browser-ui/react.tsx` | 36 | Browser UI state |
| `contexts/openui/browser/next.tsx` | 32 | Browser (server) |
| `contexts/openui/next.tsx` | 5 | OpenUI (server) |
| `contexts/openui/page/react.tsx` | 41 | Page state |
| `contexts/openui/react.tsx` | 8 | OpenUI re-exports |
| `contexts/openui/render-queue/react.tsx` | 317 | Render queue |
| `contexts/openui/sse/react.tsx` | 557 | Server-sent events |
| `contexts/openui/state/next.tsx` | 86 | State (server) |
| `contexts/openui/state/react.tsx` | 734 | State (client, Redux + tRPC) |
| `contexts/openui/status-bar/react.tsx` | 101 | Status bar state |
| `contexts/openui/status/react.tsx` | 79 | Status state |
| `contexts/openui/store/react.tsx` | 47 | Redux store provider |
| `contexts/query-client/react.tsx` | 21 | React Query provider |
| `contexts/session/react.tsx` | 44 | Session provider |
| `contexts/theme/next.tsx` | 24 | Theme (server) |
| `contexts/theme/react.tsx` | 95 | Theme (client) |
| `contexts/toaster/react.tsx` | 91 | Toast notifications |
| `contexts/trpc/react.tsx` | 75 | tRPC client |
| `contexts/trpc/ws-client/react.tsx` | 38 | tRPC WebSocket |
| `contexts/website/layout/react.tsx` | 56 | Website layout state |

### 5.5 NOT OPTIMIZED — Test Files, Utilities, Non-Components (31 files)

These are test files, hooks, email templates, and utilities — not render targets.

| File | Lines | Purpose |
|------|-------|---------|
| `components/error-boundary/error-boundary.test.tsx` | 355 | Test |
| `components/openui/react.test.tsx` | 170 | Test |
| `components/openui/address-bar/react.test.tsx` | 221 | Test |
| `components/openui/bookmarks-panel/react.test.tsx` | 152 | Test |
| `components/openui/breadcrumbs/react.test.tsx` | 288 | Test |
| `components/openui/camera/react.test.tsx` | 40 | Test |
| `components/openui/canvas/__tests__/react.test.tsx` | 185 | Test |
| `components/openui/canvas/__tests__/render-optimization.test.tsx` | 468 | Test |
| `components/openui/canvas/react.test.tsx` | 305 | Test |
| `components/openui/clipboard-toast/react.test.tsx` | 110 | Test |
| `components/openui/command-bar/react.test.tsx` | 262 | Test |
| `components/openui/deep-link-handler/react.test.tsx` | 179 | Test |
| `components/openui/display-compositor/react.test.tsx` | 44 | Test |
| `components/openui/downloads-panel/react.test.tsx` | 336 | Test |
| `components/openui/find-bar/react.test.tsx` | 181 | Test |
| `components/openui/history-panel/react.test.tsx` | 278 | Test |
| `components/openui/home-skeleton/react.test.tsx` | 108 | Test |
| `components/openui/keyboard-shortcuts/react.test.tsx` | 213 | Test |
| `components/openui/loading/react.test.tsx` | 126 | Test |
| `components/openui/minimap/react.test.tsx` | 223 | Test |
| `components/openui/navigation-controller/react.test.tsx` | 92 | Test |
| `components/openui/page-context-menu/react.test.tsx` | 92 | Test |
| `components/openui/page-preview/react.test.tsx` | 108 | Test |
| `components/openui/progress-bar/react.test.tsx` | 235 | Test |
| `components/openui/restoration-gate/react.test.tsx` | 590 | Test |
| `components/openui/settings-panel/react.test.tsx` | 232 | Test |
| `components/openui/sidebar/__tests__/react.test.tsx` | 544 | Test |
| `components/openui/sidebar/__tests__/render-optimization.test.tsx` | 681 | Test |
| `components/openui/sidebar/dnd.test.tsx` | 36 | Test |
| `components/openui/sidebar/page-preview-tooltip.test.tsx` | 269 | Test |
| `components/openui/sidebar/react.test.tsx` | 770 | Test |
| `components/openui/status-bar/react.test.tsx` | 72 | Test |
| `emails/magic-link.tsx` | 114 | Email template (React Email) |
| `hooks/use-ipapi.tsx` | 16 | Custom hook |
| `hooks/use-is-hydrated.tsx` | 16 | Custom hook |
| `iframe/app.tsx` | 149 | Separate iframe app |
| `iframe/index.tsx` | 35 | Iframe entry point |
| `libs/react.tsx` | 70 | Utility functions |
| `libs/react.test.tsx` | 138 | Test |
| `test-utils/render-profiler.tsx` | 225 | Test utility |
| `test-utils/render-profiler.test.tsx` | 349 | Test |
| `proxy.tsx` | 51 | Proxy utility |

---

## 6. Route Map

| Route | File | Type | Optimized Components on Page |
|-------|------|------|------------------------------|
| `/` | `app/@browser/(home)/page.tsx` | Client | HomePage; PageSkeleton (Suspense fallback in layout); CookieConsentBanner + TailwindIndicator (global, via root layout) |
| `/login` | `app/(auth)/login/page.tsx` | Client | MagicLinkSent (after submit) |
| `/signup` | `app/(auth)/signup/page.tsx` | Client | MagicLinkSent (after submit) |
| `/legal/{slug}` | `app/(misc)/legal/[slug]/page.tsx` | Server | None (TinaCMS markdown) |
| `/{url}` (browser) | `app/@browser/[...url]/page.tsx` | Server | Sidebar (inner of OpenUISidebar), PagePreview, PageSkeleton (inner of canvas), StatusLabel (inner of downloads-panel), GlobeIcon |
| Error state | `app/error.tsx` | Client | Error |
| Global error | `app/global-error.tsx` | Client | ErrorScreen |
| 404 | `app/not-found.tsx` | Client | NotFound |
| Browser error | `app/@browser/error.tsx` | Client | BrowserError |

---

## 7. Compatibility Notes

### Works well with:
- React 19.3.0-canary
- React Compiler (`reactCompiler: true`)
- vinext (Next.js on Vite)
- Vite 7.3
- TypeScript strict mode
- `"jsx": "react-jsx"` setting
- Server Components (with `rsc: true`)
- motion/react (Framer Motion)
- Radix UI primitives
- @reduxjs/toolkit + react-redux
- @trpc/react-query
- TinaCMS
- next/dynamic (dynamic imports)

### No issues observed with:
- Redux (components using Redux are simply not optimized — no conflict)
- tRPC (same — skipped, not broken)
- Dynamic imports via `next/dynamic`
- Context providers (Million optimizes consumers where possible, skips where not)
- forwardRef components
- React.memo components (the compiler's auto mode transforms memo calls too)
- React DnD (drag-and-drop components skipped, no conflict)
- cmdk (command palette — skipped, no conflict)

### Potential issues to watch:
- If a component is optimized but consumes context that changes frequently, it may not re-render as expected. Use `// million-ignore` to opt out.
- HMR: Monitor for stale renders during development. If a Million-optimized component doesn't update on hot reload, add `// million-ignore` temporarily.

---

## 8. Opting Out

Add a comment above any component to prevent Million from optimizing it:

```typescript
// million-ignore
function MyComponent(props) {
  // ...
}
```

---

## 9. Build Commands

```bash
# Install dependencies
pnpm install

# Development (with Million compiler active)
pnpm dev

# Production build (Million optimizes during build)
pnpm build

# Verify Million is working (look for ⚡ lines in build output)
pnpm build 2>&1 | grep "⚡"
```

---

## 10. Monitoring & Validation

After integrating, verify:

1. **Build succeeds** — No new errors in `vinext build` output
2. **Components listed** — Check for 13 `⚡` lines showing optimized components
3. **No runtime errors** — Open the app, navigate all routes, check browser console
4. **No visual regressions** — Compare before/after on each page:
   - `/` — homepage with address bar, status bar
   - `/login` and `/signup` — auth flow, submit to see MagicLinkSent
   - `/legal/terms` and `/legal/privacy` — static TinaCMS content
   - `/{any-url}` — browser view with sidebar, canvas, page preview
   - Error page — trigger via throwing in a component
   - 404 page — navigate to `/nonexistent`
   - Browser error — trigger via `/@browser` error boundary
5. **No hydration mismatches** — Check for React hydration warnings in console
6. **HMR works** — Edit a Million-optimized component, verify hot reload updates it
7. **Existing tests pass** — Run `pnpm test` to verify no regressions in the 30+ component test files

---

## 11. File Changes Required

To integrate into the production OpenUI codebase:

### Must change:
1. **`package.json`** — Add `"million": "https://github.com/03d70ee629135ed229487aa7a7e52d0c/million"` to dependencies
2. **`vite.config.ts`** — Add `import million from "million/compiler"` and add `million.vite({ auto: true, rsc: true })` as the **first** plugin

### No changes needed to:
- Any of the 166 component/page/context files
- `next.config.ts`
- `tsconfig.json`
- Any context providers or Redux store
- Any tRPC configuration
- Any test files

### Total diff: 2 files, ~3 lines changed.
