# AI Agent 工作台

Next.js 16 + LangGraph + PostgreSQL/pgvector 构建的研究型 AI Agent 对话应用。

## 技术栈

| 层 | 技术 |
|------|------|
| **前端** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand 5 |
| **Agent** | LangGraph (StateGraph + PostgresSaver), DeepSeek-V4-Flash |
| **RAG** | pgvector (HNSW), 混合搜索 (语义+关键词+RRF融合), BGE-Reranker |
| **数据库** | PostgreSQL, pgvector, pg_trgm |
| **运行环境** | Bun, Docker Compose |

## 核心能力

### Agent 工具链

| 工具 | 功能 |
|------|------|
| `web_search` | Tavily API + Bing 并行搜索，中英文路由 |
| `search_docs` | 知识库语义搜索 + 用户记忆混合检索 |
| `run_python` | 隔离沙箱执行 Python (numpy/pandas/matplotlib) |
| `save_memory` | LLM 自主判断并保存用户偏好到记忆库 |

### 时间旅行（对话回退）

- 任意消息对删除 + LangGraph 检查点回退
- "重新生成"：删最后一条重试 / "回退到此"：从任意位置截断
- 检查点清除后从 DB 重建上下文

### 流式执行轨迹

- SSE 逐 token 流式输出
- Agent 工具调用过程可视化（思考→工具调用→结果→回答）
- 流式期间步骤展开，完成后自动折叠

### 知识库

- 文件上传 (txt/md/pdf) → 自动分块 → 嵌入 → pgvector 存储
- 混合搜索 + 交叉编码器重排序 + token 预算截断
- 文档管理 UI（拖拽上传、列表、详情、搜索测试）

### 服务端优化

| 类别 | 措施 |
|------|------|
| 连接池 | `pool.on("error")` 防崩溃, `statement_timeout`, `connectionTimeoutMillis` |
| 超时 | OpenAI client 30s + 2次重试, LLM 60s, reranker/expansion fetch 15s |
| 限流 | 令牌桶，Agent 调用 10 req/min，429 + Retry-After |
| 日志 | AsyncLocalStorage traceId, JSON 结构化, 耗时追踪 |
| 索引 | `messages(created_at)`, `documents(user_id)` 等 4 个性能索引 |
| 查询优化 | 批量 INSERT, 消除冗余所有权检查 |
| Bundle | next/dynamic 延迟加载 AuthModal/KnowledgePanel/Markdown |
| 编译 | React Compiler, optimizePackageImports, source maps 关闭 |

## 项目结构

```
src/
├── app/api/              API Routes (11 个端点)
│   ├── agent/             Agent 流式接口 + 中断恢复
│   ├── auth/              注册/登录/刷新/登出
│   └── conversations/     对话 + 消息 CRUD + 时间旅行回退
├── lib/
│   ├── agent/             ChatAgent, prompt 构建, checkpoint 管理
│   ├── rag/               RagPipeline (分块/查询扩展/重排序)
│   ├── tools/             web_search, search_docs, run_python, save_memory
│   ├── db/                pool + 所有 CRUD (conversations/messages/documents/memories/users)
│   ├── sandbox/           Python 沙箱执行器
│   ├── file/              FileProcessor (txt/md/pdf 解析)
│   ├── auth.ts            JWT (access 15min + refresh 7d), 密码哈希
│   ├── schemas.ts         Zod 校验 + parseBody
│   ├── rate-limit.ts      令牌桶限流
│   └── log.ts             结构化日志 + traceId
├── features/
│   ├── ChatArea/          聊天区 (MessageList + StepsPanel + ChatInput)
│   ├── AgentSteps/        执行轨迹可视化
│   ├── KnowledgePanel/    知识库管理
│   ├── ConversationList/  对话列表
│   ├── AuthModal/         登录/注册
│   └── InterruptHandler/  中断确认
├── store/                 Zustand slices (messages, steps, SSE, conversations)
├── services/              API 客户端 (chat, auth, document, file)
└── tests/                 18 个测试 (限流, Python 沙箱, web_search schema, buildPairs)
```

## 快速开始

```bash
# 1. 启动 PostgreSQL
docker compose up -d postgres

# 2. 配置环境变量
cp .env.example .env.local
# 填入 SILICONFLOW_API_KEY, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

# 3. 安装依赖 + 启动
bun install
bun dev

# 4. 运行测试
bun test

# 5. 一键部署（含应用）
docker compose up -d
```

## 数据库迁移

迁移在应用启动时自动执行（`src/lib/migrate.ts`），文件位于 `migrations/`：

| 迁移 | 内容 |
|------|------|
| `0000_init.sql` | conversations, messages, documents, chunks 表 |
| `0002_users.sql` | users 表 + FK 约束 |
| `0003_embedding_cache.sql` | 嵌入向量两级缓存表 |
| `0004_memories.sql` | 用户记忆 + pgvector |
| `0006_indexes.sql` | 性能索引 |
