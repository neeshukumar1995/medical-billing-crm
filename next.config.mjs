const nextConfig = {
  images: {
    unoptimized: true,   // ⭐⭐ MAIN FIX ⭐⭐
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'crm-backend.test',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9000',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/recordings/:path*',
        destination: 'http://crm-backend.test/api/recordings/:path*',
      },
    ];
  },
};

export default nextConfig;
