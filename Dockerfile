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
RUN bun run build

# runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 复制运行所需文件
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/migrations ./migrations

# Python 沙箱依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip \
    && pip3 install --break-system-packages numpy pandas matplotlib scipy \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 解决 Next.js standalone 的 sharp 问题
RUN bun install --frozen-lockfile --production || true

EXPOSE 3000
CMD ["bun", "run", "server.js"]
