import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/driver deps that must stay external to the server bundle.
  serverExternalPackages: ["@libsql/client"],
};

export default nextConfig;
