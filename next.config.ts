import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow accessing the dev server from other devices on your LAN
  allowedDevOrigins: ["172.16.0.2", "localhost", "127.0.0.1"],
};

export default nextConfig;
