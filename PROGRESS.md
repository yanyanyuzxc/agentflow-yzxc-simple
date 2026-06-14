# Progress

## 已完成

### Phase 1 — 基础设施
- [x] PostgreSQL (Docker, 5433) + pgvector + pg_trgm
- [x] documents / chunks / embedding_cache 表
- [x] LangGraph Agent — 3 工具 (search_docs, calculate, getTime)，PostgresSaver checkpoint，interruptAfter + Command resume
- [x] RAG 流水线 — chunker, pgvector searchHybrid(RRF), reranker, query-expansion
- [x] API routes — /api/agent, /api/search, /api/documents, /api/embeddings, /api/upload
- [x] 前端基础设施 — types, services, store, components/ui

### Phase 2 — Agent 聊天交互
- [x] `POST /api/agent` — SSE 真实逐 token 流式（streamMode: "messages"）
- [x] 11 种 SSE 事件协议（step_start / thought / tool_call / observation / answer_chunk / step_end / interrupt / error / done）
- [x] `features/ChatArea/` — 消息列表 + Markdown 渲染 + 输入区
- [x] `features/AgentSteps/` — Thought → ToolCall → Observation → Answer 步骤可视化
- [x] `hooks/useStreamChat.ts` — SSE 流式接收 + 事件分发（@microsoft/fetch-event-source）
- [x] `features/InterruptHandler/` — 中断确认交互 + resume

### Phase 3 — 对话 & 知识库管理
- [x] conversations / messages 表 + CRUD API
- [x] `features/ConversationList/`
- [x] `features/KnowledgePanel/`（文档列表、上传、搜索测试、详情）

### Phase 4 — 认证 & 多用户
- [x] users 表 + `lib/db/users.ts`（createUser, getUserByEmail, getUserById）
- [x] `lib/auth.ts` — `JwtService`（JWT sign/verify via jose）+ `PasswordService`（PBKDF2 via Web Crypto）
- [x] `/api/auth/register` + `/api/auth/login` + `/api/auth/refresh` + `/api/auth/logout` + `/api/auth/me`
- [x] `src/middleware.ts`（JWT 校验 + x-user-id 注入 + 结构化日志）
- [x] 数据隔离：所有 SQL 查询加 `WHERE user_id = $1`
- [x] `services/authService.ts` + `apiClient` 401 自动 refresh
- [x] `features/AuthModal/`（登录/注册 UI + Modal）
- [x] Header 登录按钮 + 用户信息 + 退出

### Phase 5 — 文件系统
- [x] 文件上传 API（/api/upload，FormData → 解析 → chunk → embedding → 入库）
- [x] `FileProcessor` 类（`lib/file/processor.ts`）— 类型检测 + UTF-8/GBK 解码 + PDF 解析
- [x] 修复 documentService.upload 缺 Authorization header 导致 401

### Phase 6 — 架构重构
- [x] Agent 类架构：`lib/agent/`（BaseAgent → ChatAgent, AgentOrchestrator, ToolKit, CheckpointManager）
- [x] RAG 管线：`lib/rag/`（RagPipeline = chunk + expandQuery + rerank + fitBudget）
- [x] 文件处理：`lib/file/`（FileProcessor = type detect + parse）
- [x] Auth 类化：`JwtService` + `PasswordService` + `REFRESH_TTL_SECONDS` 常量
- [x] Zod + TS 双重校验：`lib/schemas.ts`（11 个 schema）+ `lib/env.ts`（启动时环境变量校验）
- [x] 所有 POST/PATCH route 接入 `parseBody()` + `getEnv()`
- [x] 共享 LLM 客户端：`lib/llm.ts` — `getOpenAI()` 单例

### Phase 7 — 后端打磨
- [x] 统一响应格式：`lib/resp.ts` — `resOk(data, status)` / `resErr(code, message, details)`
- [x] 所有 15 个 API route + middleware + parseBody 统一使用 resOk/resErr
- [x] Zustand 中间件工厂：`createStore({ name, persist?, immer? })` + `createDevtools` (URL ?debug= 开关)
- [x] 全 Store 接入 createStore（chat/user/ui/file）
- [x] `apiClient` 自动解包 `{ code, data, message }`，code≠0 抛 ApiError
- [x] Endpoints 清理：删不存在的路由(agent.status, files.*)，补缺失(auth.logout, embeddings, search)
- [x] `fileService` 错误端点修正（upload URL 做 list/delete → documents 路由）
- [x] requireAuth 内部统一用 resErr

### Phase 8 — 安全加固
- [x] `GET/POST /api/conversations/[id]/messages` 加 requireAuth（之前无鉴权）
- [x] DB 层 `getMessages` / `addMessage` 加 userId + conversation 归属校验
- [x] `GET /api/conversations/[id]` getMessages 传 userId
- [x] `search/route.ts` 硬编码 `userId ?? "1"` → 401 拒绝

### Phase 9 — RAG 检索升级（第一梯队）
- [x] Agent `search_docs` 接入 Reranker：hybrid(10) → rerank(3) → fitBudget(3000)
- [x] Embedding 两级缓存：`lib/embedding-cache.ts` — LRU(内存) → DB(embedding_cache 表) → API
- [x] 批量 embedding 缓存：`getEmbeddings()` — LRU + DB 批量查 + API 补 miss + 异步写 DB
- [x] Token Budget：`RagPipeline.fitBudget()` — 检索结果按 estimated_tokens 截断
- [x] Upload / Search / search_docs 三处全部接入缓存

### 体验打磨
- [x] AI 输出 Markdown 渲染（react-markdown + remark-gfm + rehype-highlight）
- [ ] 暗色模式
- [ ] 响应式布局
- [ ] sonner toast 通知
- [ ] 错误恢复/重试

---

## 待建

### 安全（高优先级）
- [x] `calculate` 工具沙箱化 → **最终删除了 calculate 工具**（LLM 自己就能做数学运算，不需要工具）
- [x] 工具独立成模块 — `lib/tools/`（base → search-docs / get-time），`lib/agent/toolkit.ts` 薄包装
- [x] 工具生命周期标准化 — `buildTool()` 统一 try/catch + 结果序列化
- [ ] API 限流（rate limiting），尤其 POST /api/agent
- [ ] Cookie Secure 标志（生产环境 Set-Cookie: Secure; HttpOnly; SameSite=Strict）
- [ ] `GET /api/conversations` 同样需要 try/catch 和 getMessages 时的 userId（已加）

### 后端完善
- [ ] 分页查询（conversations / documents / messages 列表）
- [ ] Agent 系统提示词 + 上下文窗口管理
- [ ] DB 连接/查询超时配置
- [ ] 健康检查端点 `/api/health`
- [ ] SSE resume 去重（防止重复 answer）

### RAG 检索（第二梯队）
- [ ] Query Decomposition — 复杂问题拆成子查询并行检索
- [ ] Small-to-Big — 小 chunk 索引(256 token) + 大 context 返回(512 token/原段落)
- [ ] 元数据过滤 — 按文档类型、日期、标签筛选
- [ ] Self-Query — LLM 从问题中提取语义 + 元数据过滤条件
- [ ] 检索质量评估 — recall@k + 用户反馈闭环

### 体验打磨（续）
- [ ] 暗色模式切换
- [ ] 移动端响应式
- [ ] 表单前端 Zod 校验（AuthModal 目前用 HTML required）
- [ ] sonner toast 统一错误提示
- [ ] 骨架屏/加载态优化
