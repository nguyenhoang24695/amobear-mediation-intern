/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
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
