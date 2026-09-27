import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  // @threadnote/i18n and @threadnote/electron-utils ship as TS source — must be bundled
  main: {
    plugins: [
      externalizeDepsPlugin({ exclude: ['@threadnote/i18n', '@threadnote/electron-utils'] }),
    ],
  },
  preload: {
    plugins: [
      externalizeDepsPlugin({ exclude: ['@threadnote/i18n', '@threadnote/electron-utils'] }),
    ],
  },
  renderer: {
    plugins: [react()],
    server: {
      port: Number(process.env.HTML_DEV_PORT) || 5178,
      strictPort: Boolean(process.env.HTML_DEV_PORT),
    },
  },
})
