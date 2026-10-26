import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The studio asset route reads the original editor files from disk, so ship them with it.
  outputFileTracingIncludes: {
    "/dashboard/studio/**/*": ["./vendor/tapshop-studio/**/*"],
  },
};

export default nextConfig;
