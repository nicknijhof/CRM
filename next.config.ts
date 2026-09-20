import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Blog cover photos are uploaded through a server action; the default 1MB cap is too small for a phone photo.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
