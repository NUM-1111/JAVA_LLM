import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
    // 关键代码
      // eslint-disable-next-line no-undef
      '@': path.resolve(__dirname, './src')
    }}
})
