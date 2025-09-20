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
      {
        protocol: "https",
        hostname: "images1.apartments.com",
      },
    ],
  },
};

export default nextConfig;
