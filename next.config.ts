import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Required for Lambda deployment
};

export default nextConfig;
