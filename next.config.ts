import type { NextConfig } from "next";
import { MAGMA_MEDIA_HOSTS } from "./lib/feed-media";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Allow phone testing on this Mac's local Wi-Fi address (development only).
  allowedDevOrigins: ['192.168.1.74'],
  images: {
    remotePatterns: MAGMA_MEDIA_HOSTS.map(hostname => ({
      protocol: "https" as const, hostname, port: "",
      pathname: "/storage/v1/object/public/media/**", search: "",
    })),
    formats: ["image/webp"],
    qualities: [75],
    maximumRedirects: 0,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
