import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DB driver kept external to the server bundle.
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
