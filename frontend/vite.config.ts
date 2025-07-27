// vite.config.ts
/// <reference types="node" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import AutoImport from 'unplugin-auto-import/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/',
  plugins: [
    vue(),
    Components({ resolvers: [NaiveUiResolver()] }),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia', { 'naive-ui': ['useMessage'] }],
      dts: 'src/auto-imports.d.ts'
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',  // ← your FastAPI backend
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
})
