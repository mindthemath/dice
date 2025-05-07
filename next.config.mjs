/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // output: 'export',
  distDir: 'dist',
  // Disable fast refresh in development to prevent constant reloading
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/node_modules/**', '**/.git/**'],
        aggregateTimeout: 300,
        poll: false,
      }
    }
    return config
  },
  // basePath: '/apps/dice',
}

export default nextConfig
