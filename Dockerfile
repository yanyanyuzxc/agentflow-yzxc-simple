FROM oven/bun:1 AS base
WORKDIR /app

# deps
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# builder
FROM base AS builder
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# 构建时需要这些 env 变量（Next.js 会收集 API 路由数据）
ENV DATABASE_URL=postgresql://postgres:postgres@placeholder:5432/chat_embeddings
ENV JWT_ACCESS_SECRET=build-placeholder-secret-at-least-32-chars-long
ENV JWT_REFRESH_SECRET=build-placeholder-secret-at-least-32-chars-long
ENV SILICONFLOW_API_KEY=sk-build-placeholder
RUN bun run build

# runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 从 builder 复制所需文件到 /app（单 COPY + 单 RUN 避免 BuildKit 多阶段缓存 bug）
# dotglob 确保 standalone 内部的 .next/ 等点文件也被复制
COPY --from=builder /app /app-build
RUN shopt -s dotglob && \
    cp -r /app-build/.next/standalone/* . && \
    mkdir -p .next/static && \
    cp -r /app-build/.next/static/* .next/static/ 2>/dev/null; \
    cp -r /app-build/migrations . 2>/dev/null; \
    rm -rf /app-build

# Python 沙箱依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip \
    && pip3 install --break-system-packages numpy pandas matplotlib scipy \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 解决 Next.js standalone 的 sharp 问题
RUN bun install --frozen-lockfile --production || true

EXPOSE 3000
CMD ["bun", "run", "server.js"]
