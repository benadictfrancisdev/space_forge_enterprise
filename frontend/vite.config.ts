import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const useCloudHmr = process.env.VITE_CLOUD_HMR === "true";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 3000,
    strictPort: false,
    allowedHosts: true,
    hmr: useCloudHmr ? { clientPort: 443, protocol: "wss" } : true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query"],
  },
});
