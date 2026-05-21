import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Set turbopack root to the workspace root (one level up from frontend)
  // This helps Next.js resolve the next/package.json correctly in pnpm workspaces
  turbopack: {
    root: path.join(__dirname, "../"),
  },
  /**
   * Next 16 (Turbopack) đôi khi log "Invalid source map... sourceMapURL could not be parsed"
   * trên SSR chunks ở Windows. Tắt dev sourcemap để dev overlay không bị noisy.
   */
  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = false
    }
    return config
  },
  async redirects() {
    return [
      {
        source: "/alerts",
        destination: "/alert-center",
        permanent: true,
      },
      {
        source: "/alerts/:path*",
        destination: "/alert-center/:path*",
        permanent: true,
      },
      {
        source: "/alert-center-2",
        destination: "/alert-center",
        permanent: false,
      },
    ]
  },
}

export default nextConfig
