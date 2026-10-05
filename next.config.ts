import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Pages are server-rendered per request; without this, going back to a page you just left
    // re-fetches it from scratch every time. 30s keeps back-and-forth navigation instant while
    // data stays fresh enough (mutations still revalidate their own pages).
    staleTimes: { dynamic: 30 },
    // Blog cover photos are uploaded through a server action; the default 1MB cap is too small for a phone photo.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
