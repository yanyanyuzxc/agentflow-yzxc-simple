import Link from "next/link";
import {
  ArrowRight, MessageCircle, Database, Globe,
  Zap, Layers, Shield,
} from "lucide-react";

const FEATURES = [
  {
    icon: <MessageCircle className="w-5 h-5" strokeWidth={1.5} />,
    title: "智能对话",
    desc: "基于 DeepSeek V4 的 ReAct Agent，自动规划、搜索、推理，给出高质量回答。",
  },
  {
    icon: <Database className="w-5 h-5" strokeWidth={1.5} />,
    title: "知识库 RAG",
    desc: "上传 PDF、Markdown、TXT 文档，自动分片向量化。对话中 AI 自动检索你的资料。",
  },
  {
    icon: <Globe className="w-5 h-5" strokeWidth={1.5} />,
    title: "联网搜索",
    desc: "一键开启联网搜索，Tavily + Bing 双引擎，AI 获取最新信息后综合回答。",
  },
  {
    icon: <Zap className="w-5 h-5" strokeWidth={1.5} />,
    title: "多 Agent 协作",
    desc: "Supervisor 协调搜索专家、分析师、写作者并行工作，复杂任务自动分工。",
  },
  {
    icon: <Layers className="w-5 h-5" strokeWidth={1.5} />,
    title: "流式响应",
    desc: "SSE 实时逐 token 输出，思考过程透明可见，支持中断和恢复。",
  },
  {
    icon: <Shield className="w-5 h-5" strokeWidth={1.5} />,
    title: "数据隔离",
    desc: "JWT 认证 + 行级安全，每个用户的对话和文档完全隔离。",
  },
];

const STEPS = [
  {
    step: "01",
    title: "上传文档",
    desc: "将你的 PDF、Markdown、TXT 文件拖入知识库，自动解析、分片、向量化存储。",
  },
  {
    step: "02",
    title: "开始对话",
    desc: "像聊天一样提问。AI 自动判断是否需要搜索知识库、联网检索或调用其他工具。",
  },
  {
    step: "03",
    title: "获得答案",
    desc: "AI 综合多源信息，给出结构化的回答。思考过程和搜索来源全程透明可见。",
  },
];

export default function MarketingPage() {
  return (
    <>
      {/* ─── Hero ─── */}
      <section className="px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-3xl mx-auto text-center">
          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium mb-6"
            style={{
              background: "var(--gradient-brand-soft)",
              color: "var(--brand-600)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--brand-500)" }} />
            AI Agent 工作台
          </div>

          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15] mb-5"
            style={{ color: "var(--text-primary)" }}
          >
            你的
            <span className="brand-text">私人 AI 助手</span>
            ，
            <br />
            懂你的文档，会自己搜索
          </h1>

          <p
            className="text-[15px] sm:text-base leading-relaxed max-w-xl mx-auto mb-8"
            style={{ color: "var(--text-secondary)" }}
          >
            上传文档构建知识库，开启联网搜索获取最新信息。AI Agent 自动协调多个专业模型，
            从搜索、分析到撰写，一站式完成。
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="/chat"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold text-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
              style={{ background: "var(--gradient-brand)" }}
            >
              免费开始使用
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="px-6 py-3 rounded-xl text-[14px] font-medium transition-all duration-200"
              style={{
                color: "var(--text-secondary)",
                background: "var(--bg-panel)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              了解更多
            </a>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section id="features" className="px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              全部功能
            </h2>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              从知识管理到智能对话，一站式 AI 工作台
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-5 transition-all duration-200 group"
                style={{
                  background: "var(--bg-panel)",
                  border: "1px solid var(--border-subtle)",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3.5"
                  style={{ background: "var(--gradient-brand-soft)", color: "var(--brand-500)" }}
                >
                  {f.icon}
                </div>
                <h3 className="text-[14px] font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>
                  {f.title}
                </h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              三步开始
            </h2>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              不需要配置，打开浏览器就能用
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6">
            {STEPS.map((s, i) => (
              <div key={s.step} className="flex-1 text-center relative">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div
                    className="hidden sm:block absolute top-8 left-[60%] w-[calc(100%-4rem)] h-px"
                    style={{ background: "var(--border-subtle)" }}
                  />
                )}

                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-lg font-bold shadow-sm"
                  style={{
                    background: "var(--gradient-brand-soft)",
                    color: "var(--brand-600)",
                  }}
                >
                  {s.step}
                </div>
                <h3 className="text-[15px] font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>
                  {s.title}
                </h3>
                <p className="text-[13px] leading-relaxed px-2" style={{ color: "var(--text-tertiary)" }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA ─── */}
      <section className="px-6 py-16 sm:py-20">
        <div
          className="max-w-2xl mx-auto rounded-3xl p-10 sm:p-14 text-center"
          style={{
            background: "var(--gradient-brand-soft)",
            border: "1px solid var(--brand-100)",
          }}
        >
          <h2
            className="text-xl sm:text-2xl font-bold tracking-tight mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            准备好开始了吗？
          </h2>
          <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
            注册即用，无需配置 API Key。上传你的第一份文档，体验 AI 驱动的工作方式。
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold text-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            style={{ background: "var(--gradient-brand)" }}
          >
            开始使用
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
