import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

const isGHPages = process.env.GITHUB_ACTIONS === 'true'

// https://vite.dev/config/
export default defineConfig({
  base: isGHPages ? '/photobooth/' : '/',
  plugins: isGHPages ? [react()] : [react(), basicSsl()],
})
