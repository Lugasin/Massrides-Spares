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
    sourcemap: mode === 'production' ? false : true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('class-variance-authority')) {
              return 'ui-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('sonner')) {
              return 'notification-vendor';
            }
            if (id.includes('date-fns') || id.includes('uuid') || id.includes('zod')) {
              return 'utils-vendor';
            }
            // Other node_modules go to vendor
            return 'vendor';
          }

          // Application chunks
          if (id.includes('/src/pages/')) {
            return 'pages';
          }
          if (id.includes('/src/components/')) {
            if (id.includes('/components/admin/') || id.includes('/components/vendor/')) {
              return 'role-components';
            }
            return 'ui-components';
          }
          if (id.includes('/src/lib/') || id.includes('/src/hooks/')) {
            return 'utils';
          }
          if (id.includes('/src/context/')) {
            return 'context';
          }
        }
      }
    },
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
