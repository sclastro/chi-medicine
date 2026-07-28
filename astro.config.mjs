import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'

// 靜態輸出為主;個別 API endpoint(如 /api/tts)以 prerender=false 走 Vercel function。
// site:OG 分享預覽與 sitemap 需要絕對網址,改域名時記得同步更新。
export default defineConfig({
  site: 'https://chi-medicine.vercel.app',
  output: 'static',
  adapter: vercel(),
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
})
