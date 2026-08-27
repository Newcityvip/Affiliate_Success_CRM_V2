import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/Affiliate_Success_CRM_V2',
  assetPrefix: '/Affiliate_Success_CRM_V2/',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
