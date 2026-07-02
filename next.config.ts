import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,

  // Turbopack 打包 pdfjs-dist 会导致 worker 模块路径解析失败
  // 标记为外部包 → 运行时走原生 Node.js require，Worker 正常工作
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],

  experimental: {
    turbopackFileSystemCacheForDev: true,
    optimizePackageImports: ["lucide-react"],
  },

  // 生产构建不输出 source map
  productionBrowserSourceMaps: false,
};

export default nextConfig;
