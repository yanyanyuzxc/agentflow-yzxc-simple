import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,

  experimental: {
    turbopackFileSystemCacheForDev: true,
    optimizePackageImports: ["lucide-react"],
  },

  // 生产构建不输出 source map
  productionBrowserSourceMaps: false,
};

export default nextConfig;
