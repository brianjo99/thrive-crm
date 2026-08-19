import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("/node_modules/")) return;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return "react-vendor";
          if (id.includes("/node_modules/@supabase/")) return "supabase-vendor";
          if (id.includes("/node_modules/@radix-ui/") || id.includes("/node_modules/cmdk/") || id.includes("/node_modules/vaul/")) return "ui-vendor";
          if (id.includes("/node_modules/recharts/") || id.includes("/node_modules/d3-")) return "charts-vendor";
          if (id.includes("/node_modules/framer-motion/")) return "motion-vendor";
          if (id.includes("/node_modules/lucide-react/")) return "icons-vendor";
          if (id.includes("/node_modules/date-fns/")) return "date-vendor";
          if (id.includes("/node_modules/@tanstack/")) return "query-vendor";
          // Let Rollup place unclassified dependencies automatically. A catch-all
          // vendor chunk creates a circular import with react-vendor and can run
          // libraries before React has finished initializing in production.
          return;
        },
      },
    },
  },
});
