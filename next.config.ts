import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // reactCompiler 类型定义在下一版才跟上，先 as any
  experimental: {
    reactCompiler: true,
    turbopackFileSystemCacheForDev: true,
    optimizePackageImports: ["lucide-react"],
  } as any,

  // 生产构建不输出 source map
  productionBrowserSourceMaps: false,
};

export default nextConfig;
