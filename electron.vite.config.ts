import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react()],
    define: {
      'process.env': '({})',
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.platform': JSON.stringify('browser')
    },
    optimizeDeps: {
      include: ['@excalidraw/excalidraw'],
      esbuildOptions: {
        define: {
          global: 'globalThis'
        }
      }
    }
  }
})
