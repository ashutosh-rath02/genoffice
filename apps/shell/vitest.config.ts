import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Office file generation and the local MCP server need more time on Windows.
    testTimeout: 60000,
    fileParallelism: false,
  },
})
