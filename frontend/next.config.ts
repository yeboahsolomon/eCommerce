/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'pub-4fec403f8065446fb49800a3ad118b14.r2.dev',
        pathname: '**',
      },
    ],
  },
};

export default nextConfig;
