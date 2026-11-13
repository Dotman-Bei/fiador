import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'src/**/*.test.ts',
      'scripts/**/*.test.ts',
      'tools/**/*.test.ts',
      'web/**/*.test.ts',
      'web/**/*.test.tsx',
    ],
    environment: 'node',
  },
});
