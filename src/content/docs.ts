// 文档站内容 — 后续可迁移到 Velite MDX

export interface DocPage {
  slug: string;
  title: string;
  section: string;
  content: string; // Markdown
}

const DOCS: DocPage[] = [
  {
    slug: "index",
    title: "简介",
    section: "入门",
    content: `
AI Agent 工作台是一个智能对话助手，基于 DeepSeek V4 大模型构建。它不仅能聊天，还能：

- **搜索你的文档** — 上传 PDF、Markdown、TXT 文件，AI 自动检索相关内容
- **联网搜索** — 一键开启，获取最新信息
- **多 Agent 协作** — 搜索、分析、撰写，自动分工

## 快速开始

1. 注册账号并登录
2. 进入「知识库」上传你的第一份文档
3. 回到「对话」页面开始提问

## 系统架构

\`\`\`
用户提问 → Orchestrator（Supervisor）
              ├── search Agent   → web_search / crawl_page / search_docs
              ├── analyst Agent  → 交叉对比分析
              └── writer Agent   → 撰写回答
\`\`\`

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 + React 19 + Tailwind CSS 4 |
| 状态 | Zustand 5 |
| AI | LangGraph + DeepSeek V4 |
| 检索 | pgvector + pg_trgm + RRF |
| 数据库 | PostgreSQL |
`,
  },
  {
    slug: "knowledge-base",
    title: "知识库",
    section: "功能",
    content: `
知识库让你上传文档，AI 在对话中自动检索相关内容。

## 上传文档

1. 进入**知识库**页面
2. 切换到「上传」视图
3. 拖拽或点击选择文件（支持 .txt / .md / .pdf，单文件 ≤ 5MB）
4. 文件自动分片、向量化存入知识库

## 文档处理流程

\`\`\`
文件上传 → FileProcessor 解析
  → RagPipeline.chunk() 文本分片
  → getEmbedding() 向量化
  → PostgreSQL pgvector 存储
\`\`\`

## 检索模式

知识库支持三种检索策略：

| 模式 | 机制 | 适用场景 |
|------|------|----------|
| **混合**（默认） | RRF 融合语义 + 关键词 | 大多数情况 |
| **语义** | pgvector 向量相似度 | 找意思相近的内容 |
| **关键词** | ILIKE + pg_trgm | 找包含具体词汇的内容 |

## 检索流程

\`\`\`
用户提问 → getEmbedding(query)
  → searchHybrid(userId, embedding, query)
  → RagPipeline.rerank() 重排序
  → RagPipeline.fitBudget() 截断
  → 注入 LLM 上下文
\`\`\`

AI 只在用户明确提到知识库内容时才会检索（如 "查一下我的文档"、"知识库里有没有..."）。
`,
  },
  {
    slug: "web-search",
    title: "联网搜索",
    section: "功能",
    content: `
联网搜索让 AI 获取最新信息，而不是仅依赖训练数据。

## 开启/关闭

聊天输入框左侧有一个 **🌐 按钮**：
- **蓝色** = 已开启
- **灰色** = 已关闭

点击切换。

## 搜索引擎

| 引擎 | 说明 |
|------|------|
| **Tavily**（优先） | AI 专用搜索 API，返回结构化结果和摘要 |
| **Bing**（兜底） | Tavily 结果不够时自动补充 |

## 搜索结果展示

搜索结果不会出现在 AI 的回答正文中。点击思考过程中的 **📚 参考 N 个来源** 按钮，右侧滑出抽屉面板，展示所有搜索结果的标题、域名和摘要。点击可跳转到原网页。

## 爬取网页

当搜索摘要不够详细时，AI 可以调用 \`crawl_page\` 工具深入抓取网页全文内容。
`,
  },
  {
    slug: "agent",
    title: "Agent 工作原理",
    section: "进阶",
    content: `
## ReAct 循环

ChatAgent 使用标准的 ReAct（Reasoning + Acting）模式：

\`\`\`
用户提问 → Agent 思考 → 调用工具 → 观察结果 → 再思考 → ... → 给出回答
\`\`\`

## 多 Agent 协作

Orchestrator（Supervisor）协调三个专业 Agent：

| Agent | 职责 | 工具 |
|-------|------|------|
| **search** | 搜索互联网获取信息 | web_search, crawl_page |
| **analyst** | 交叉对比分析 | 无（纯推理） |
| **writer** | 撰写结构化回答 | 无（纯推理） |

Orchestrator 通过 \`speak(agent, instruction)\` 工具委托子 Agent 执行任务。

## 流式响应

所有 Agent 输出都是**流式**的（SSE），逐 token 实时显示。思考过程和工具调用在左侧步骤面板中可见。

## 中断与恢复

- 按 **Esc** 可中断正在进行中的回答
- 中断后可以**继续**（resume），从中断处恢复
`,
  },
];

export default DOCS;
