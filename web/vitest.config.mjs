import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { pretendToBeVisual: true, url: 'http://localhost/?demo' } },
    include: ['tests/ui/**/*.test.{jsx,tsx}'],
    setupFiles: ['tests/ui/setup.js'],
    restoreMocks: true,
    clearMocks: true,
  },
  define: { __BUILD_ID__: JSON.stringify('test') },
});
