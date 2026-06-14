# AI Agent 工作台

Next.js 16 + React 19 + TypeScript | Tailwind CSS 4 | Zustand 5 | LangGraph (DeepSeek-V4-Flash) | PostgreSQL + pgvector | Zod 4 | bun

## 目录结构

```
src/
├── app/api/           — 所有 POST/PATCH 用 parseBody(req, Schema) 校验入参
├── lib/
│   ├── agent/         — ChatAgent(BaseAgent) + AgentOrchestrator + ToolKit
│   ├── rag/           — RagPipeline(chunk + expandQuery + rerank)
│   ├── file/          — FileProcessor(type detect + parse)
│   ├── db/            — pool + CRUD 函数（函数式）
│   ├── auth.ts        — JwtService + PasswordService + requireAuth
│   ├── schemas.ts     — 所有 Zod schema + parseBody()
│   ├── env.ts         — getEnv() 启动时校验环境变量
│   ├── format.ts      — 纯工具函数
│   └── fileType.ts    — UI 文件类型样式常量
├── features/          — 按 LobeChat 模式：index → hook → components
├── hooks/             — useStreamChat
├── services/          — authService, chatService, apiClient(401 自动 refresh)
├── store/             — Zustand slices（chat, user, file, ui）
└── types/             — models, api, agent
```

## 编码约定

### 类 vs 函数

| 封装为类 | 保持函数 |
|----------|---------|
| 多函数共享配置 | 纯工具无状态 |
| 有生命周期（init → use → destroy） | 单次调用无上下文 |
| 可组合/替换（依赖注入） | formatDate, formatSize |

### Zod 校验

```ts
// 定义一次，类型自动生成
export const LoginInput = z.object({ email: z.string().email(), password: z.string().min(1) });
export type LoginInput = z.infer<typeof LoginInput>;

// Route 中使用
const body = await parseBody(req, LoginInput); // 不合法 → 400 + details

// 环境变量
import { getEnv } from "@/lib/env";  // 替代 process.env.X
```

### 通用

- **包管理**：只用 bun
- **Store**：按 slice 拆分，service 用 `getXxxStore()` 拿状态
- **Feature 隔离**：互相不 import，跨 feature 走 store
- **API 请求**：组件不直接 fetch，走 services/
- **数据隔离**：所有 SQL 必须 `WHERE user_id = $1`
- **page.tsx**：只做布局，不做业务逻辑

### 组件 = 纯渲染

```
入口: import → hook() → if(loading) <Skeleton/> → if(error) <ErrorDisplay/> → if(empty) <EmptyState/> → <JSX/>
```

组件内**不出现**：useState、useEffect、useCallback、fetch、async、常量、类型、手写 SVG
**可以**：Props interface、useRef（DOM 引用）

### Feature 目录

```
FeatureName/
├── index.tsx          → 纯渲染入口
├── config.tsx         → 配置常量
├── hooks/useXxx.ts    → 业务逻辑
└── components/        → 子组件 + Skeleton
```

图标用 `lucide-react`，状态用 `EmptyState` / `ErrorDisplay` / `Skeleton*`

## 环境

- PostgreSQL: Docker, port 5433, db=chat_embeddings, user/pass=postgres/postgres
- AI: SiliconFlow (api.siliconflow.cn), Embedding: BAAI/bge-m3, Reranker: bge-reranker-v2-m3
- 外部参考: [.agents/sse-guide.md](.agents/sse-guide.md) | [.agents/auth-guide.md](.agents/auth-guide.md)
