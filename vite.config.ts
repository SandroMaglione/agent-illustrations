import { defineConfig } from "vite"

export default defineConfig({ server: { port: Number(process.env.PORT ?? 5440), strictPort: true }, build: { assetsInlineLimit: 1e8 } })
