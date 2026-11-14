// Unit tests for the pure logic (no browser needed). Browser tests live in tests/browser and run with `npm run test:browser`.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/unit/**/*.test.js'], setupFiles: ['tests/unit/setup.js'], environment: 'node' },
});
