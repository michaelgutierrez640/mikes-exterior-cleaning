import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Prefer CSS before module JS so first paint is less likely to show unstyled HTML. */
function cssBeforeModules() {
  return {
    name: 'css-before-modules',
    enforce: 'post',
    transformIndexHtml(html) {
      const cssLinks = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].map((m) => m[0])
      if (!cssLinks.length) return html

      let next = html
      for (const link of cssLinks) {
        next = next.replace(link, '')
      }

      const moduleScript = next.match(/<script[^>]+type=["']module["'][^>]*>\s*<\/script>|<script[^>]+type=["']module["'][^>]*\/>/i)
      if (!moduleScript) {
        return next.replace('</head>', `${cssLinks.join('\n    ')}\n  </head>`)
      }

      return next.replace(moduleScript[0], `${cssLinks.join('\n    ')}\n    ${moduleScript[0]}`)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cssBeforeModules()],
})
