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
      {
        protocol: "https",
        hostname: "images2.apartments.com",
      },
      {
        protocol: "https",
        hostname: "images3.apartments.com",
      },
      {
        protocol: "https",
        hostname: "images4.apartments.com",
      },
      {
        protocol: "https",
        hostname: "apartments.com",
      },
      {
        protocol: "https",
        hostname: "aptcdn.com",
      },
    ],
  },
};

export default nextConfig;
