import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "godark.xyz",
      },
    ],
  },
};

export default nextConfig;
