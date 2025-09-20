import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.buscalo.dev",
      },
      {
        protocol: "https",
        hostname: "demo.buscalo.dev",
      },
    ],
  },
};

export default nextConfig;
