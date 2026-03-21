import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      reporter: ['lcov', 'text'],
      include: ['packages/**/*.ts', 'packages/**/*.tsx'],
      exclude: [
        'packages/kitchen-sink/**',
        'packages/cli/**',
        'packages/telemetry/**',
        'packages/compiler/experimental/**',
        'packages/compiler/vdom/**',
        'packages/jsx-runtime/**',
        'packages/experimental/**',
        'packages/compiler/plugin.ts',
        'packages/compiler/index.ts',
        'packages/compiler/types.ts',
        'packages/react-server/**',
        'packages/react/compiled-block.ts',
        'packages/react/index.ts',
      ],
    },
  },
});
