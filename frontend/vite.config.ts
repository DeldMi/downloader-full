import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

require('dotenv').config();
const { env } = process;

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(env.PORT_FRONTEND),
    host: true,
    proxy: {
      '/api': env.API_URL
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})