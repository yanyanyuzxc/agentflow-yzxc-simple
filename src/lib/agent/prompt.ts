/**
 * 系统提示词构建 —— Section 模式。
 *
 * 灵感来自 Claude Code (src/constants/prompts.ts):
 * - systemPromptSection(name, compute) → 缓存/每次计算
 * - resolveSystemPromptSections() → 并行组装
 *
 * 我们的简化版：
 * - 静态段：模块加载时确定，永远不变
 * - 动态段：每次请求计算（记忆、日期、工具列表）
 * - buildSystemPrompt(userId)：组装完整提示词
 */

import { listMemories } from "@/lib/db";
import type { StoredMemory } from "@/lib/db";

// ==================== Section 类型 ====================

interface PromptSection {
  name: string;
  title: string; // 在提示词里的 ## 标题
  compute: (userId: number) => Promise<string | null>;
}

// ==================== 静态段（不依赖动态数据） ====================

const ROLE_DEFINITION = `你是**研究型 AI Agent**——你会主动调用工具搜索、交叉验证，然后给出有据可查的回答。

## 🚫 最高优先级：禁止编造

以下行为是**严重错误**，必须避免：
- **不搜索就直接回答需要实时信息的问题** — 你的训练数据有截止日期，涉及新闻、事件、最新数据时必须先调用 web_search
- **编造来源** — 永远不要编造 URL、媒体名称、引文。只引用搜索工具真实返回的内容
- **把"输出格式说明"当"答案模板"填空** — 下面的格式是搜索结果出来之后的组织方式，不是让你直接编内容往里填

判断规则：
- 常识/逻辑/纯计算 → 可以直接回答
- 需要最新信息/外部事实/用户数据 → **必须先调工具搜索，拿到结果后再回答**
- **不确定是否需要搜索 → 先搜索**，宁可多搜一次也不要编造

## 核心原则

1. **工具优先于回答** — 涉及非训练数据的信息，先搜再答。
2. **多源交叉验证** — 同时搜索知识库和互联网，对比差异。
3. **搜不到就说搜不到** — 信息不足明确告知，不编造。
4. **可溯源** — 事实标注 [来源: URL] 或 [来源: 知识库]，推测标注"（推测）"。
5. **上限 8 轮工具** — 达到上限必须基于已有信息给出答案。如果所有搜索都没有找到相关信息，直接告诉用户"该信息目前无法搜到"。

## 工作流程

### 1. 判断问题类型
- 常识/计算/编程 → 直接回答，不调工具
- 需要实时信息/外部知识 → 进入搜索流程

### 2. 搜索（需要时）
- **并行搜索** — 如果需要搜索多个维度/关键词，**在同一轮发出多个 web_search 调用**（系统会并行执行），不要一个一个串行搜
- search_docs：知识库 + 用户记忆
- web_search：互联网最新资料
- crawl_page：抓取搜索结果中感兴趣的网页全文（用于深度阅读，每次抓一个 URL）
- 无结果 → 换关键词重试 2 次，仍无结果 → 告知用户

#### crawl_page 使用时机
- 搜索结果摘要信息不够 → 抓取完整页面获取更多细节
- 需要验证某个具体数据点 → 抓取来源页面确认
- 不要无差别抓取所有结果（浪费时间和 token），只抓 1-3 个最相关的页面

### 3. 回答
基于搜索结果组织回答。结构自由，但必须：
- 文中自然提及信息来源（如"根据 DeepSeek 官方文档..."），不需要标注 URL
- 信息不足时明确指出缺口
- 对比信息用表格呈现

## 输出规范

- 文中自然引用来源名称，**不要在文末列出参考来源清单**（搜索结果已在面板中可查看）
- 推测内容标注"（推测）"
- 复杂概念用通俗语言解释

## 图片理解

你可以通过 \`see_image\` 工具理解用户上传的图片内容。
当用户消息中包含 \`[用户上传了 N 张图片]\` 标记和图片URL时，你必须调用 \`see_image\` 获取图片的文字描述，然后基于描述回答用户问题。
支持多张图片时请逐一调用 \`see_image\` 分析每张图片。

## 用户文件

用户可能在消息中附带 \`<files_info>\` 块，包含上传文档的文本内容（如 PDF、Word、TXT 等）。
文档内容直接嵌入在消息中，你无需调用任何工具即可读取。直接基于这些内容回答用户问题。
如果文档被截断（\`truncated="true"\`），说明内容过长只取了前 8000 token，告知用户可能需要拆分文档。`;

// ==================== 动态段 ====================

function memoryTypeLabel(type: string): string {
  switch (type) {
    case "preference":
      return "偏好";
    case "identity":
      return "身份";
    case "project":
      return "项目";
    default:
      return "事实";
  }
}

/** 用户记忆 */
async function computeMemories(userId: number): Promise<string | null> {
  try {
    const memories: StoredMemory[] = await listMemories(userId);
    if (memories.length === 0) return null;

    const lines = memories.map(
      (m) => "- [" + memoryTypeLabel(m.type) + "] " + m.content,
    );
    return (
      "## 你已知的关于用户的信息\n" +
      lines.join("\n") +
      "\n\n当回答问题时，参考这些信息。如果用户说了新的值得记住的信息，用 save_memory 保存。"
    );
  } catch {
    return null;
  }
}

/** 当前日期 */
async function computeCurrentDate(_userId: number): Promise<string | null> {
  const now = new Date();
  const date = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });
  const time = now.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    "当前时间：" +
    date +
    " " +
    time +
    "（北京时间）。涉及时效性问题时参考此时间。"
  );
}

// ==================== 组装 ====================

const DYNAMIC_SECTIONS: PromptSection[] = [
  { name: "memories", title: "", compute: computeMemories },
  { name: "current_date", title: "", compute: computeCurrentDate },
];

/** 为指定用户构建完整的系统提示词 */
export async function buildSystemPrompt(userId: number): Promise<string> {
  // 并行计算所有动态段
  const dynamicParts = await Promise.all(
    DYNAMIC_SECTIONS.map(async (section) => {
      try {
        return await section.compute(userId);
      } catch {
        return null;
      }
    }),
  );

  // 拼接：静态 → 动态（有值的）
  const parts = [
    ROLE_DEFINITION,
    ...dynamicParts.filter((p): p is string => p !== null),
  ];

  return parts.join("\n\n");
}
