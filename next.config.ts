import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.fallback = { ...config.resolve.fallback, canvas: false, fs: false };
    return config;
  },
  turbopack: {},
};

export default nextConfig;
