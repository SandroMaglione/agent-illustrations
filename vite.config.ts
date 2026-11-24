import { defineConfig } from "vite"

export default defineConfig({ server: { port: 5440 }, build: { assetsInlineLimit: 1e8 } })
