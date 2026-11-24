/** After `pnpm build`: fold dist into one file, output/studio.html. */
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
const js = readdirSync("dist/assets").find((f) => f.endsWith(".js"))!
const code = readFileSync(`dist/assets/${js}`, "utf8").replaceAll("</script", "<\\/script")
const html = readFileSync("dist/index.html", "utf8").replace(/<script type="module"[^>]*><\/script>/, "")
writeFileSync("output/studio.html", html.replace("</body>", () => `<script type="module">${code}</script>\n</body>`))
