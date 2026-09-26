import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    // @threadnote/* workspace packages ship TS source (no build step, no
    // compiled entry point) — externalizing them makes Node's ESM loader try
    // to resolve their relative imports at runtime and fail. Bundle those;
    // externalize everything else (Electron, zod, node builtins).
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          '@threadnote/ai-provider',
          '@threadnote/agent-core',
          '@threadnote/ai-search',
          '@threadnote/docx-engine',
          '@threadnote/file-parse',
          '@threadnote/electron-utils',
          '@threadnote/i18n',
          '@threadnote/pptx-render',
          '@threadnote/xlsx-gateway',
        ],
      }),
    ],
  },
  preload: {
    // Sandboxed preload scripts cannot require arbitrary npm packages at
    // runtime, so the drop-open bridge must be bundled, not externalized.
    plugins: [externalizeDepsPlugin({ exclude: ['@threadnote/electron-utils'] })],
  },
  renderer: {
    plugins: [react()],
  },
})
