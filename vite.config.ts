import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    modulePreload: false,
    sourcemap: mode === 'production' ? false : true,
    chunkSizeWarningLimit: 600
  },
  plugins: [
    react(),
    mode === 'production' && visualizer({ 
      open: false,
      filename: 'dist/stats.html'
    }),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
