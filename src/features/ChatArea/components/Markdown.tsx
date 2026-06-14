import "highlight.js/styles/atom-one-dark.min.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";

interface MarkdownProps {
  content: string;
}

const components: Components = {
  // 代码块 (pre > code)
  pre({ children }) {
    return (
      <pre
        className="bg-[#1e1e2e] text-[#cdd6f4] rounded-xl p-4 mb-3 overflow-x-auto text-[13px] leading-relaxed font-mono border border-gray-800"
      >
        {children}
      </pre>
    );
  },

  // 行内代码
  code({ className, children, ...props }) {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="bg-gray-100 text-rose-600 rounded-md px-1.5 py-0.5 text-[12px] font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },

  // 链接
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline decoration-blue-300 hover:decoration-blue-600 transition-colors"
      >
        {children}
      </a>
    );
  },

  // 表格
  table({ children }) {
    return (
      <div className="overflow-x-auto mb-3 rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-gray-50 border-b border-gray-200">{children}</thead>;
  },
  th({ children }) {
    return (
      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="px-3 py-2 border-t border-gray-100">{children}</td>;
  },

  // 引用
  blockquote({ children }) {
    return (
      <blockquote className="border-l-[3px] border-blue-400 pl-4 my-2 text-gray-600 italic">
        {children}
      </blockquote>
    );
  },

  // 有序/无序列表
  ul({ children }) {
    return <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>;
  },
  li({ children }) {
    return <li className="text-sm text-gray-700">{children}</li>;
  },

  // 标题
  h1({ children }) {
    return <h1 className="text-lg font-bold mt-4 mb-2 text-gray-900">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-base font-bold mt-3 mb-2 text-gray-900">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-sm font-semibold mt-3 mb-1.5 text-gray-800">{children}</h3>;
  },
  h4: ({ children }) => <h4 className="text-sm font-medium mt-2 mb-1 text-gray-700">{children}</h4>,
  h5: ({ children }) => <h5 className="text-sm font-medium mt-2 mb-1 text-gray-600">{children}</h5>,
  h6: ({ children }) => <h6 className="text-sm font-medium mt-2 mb-1 text-gray-500">{children}</h6>,

  // 段落
  p({ children }) {
    return <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>;
  },

  // 分隔线
  hr() {
    return <hr className="my-4 border-gray-200" />;
  },

  // 强调/粗体
  strong({ children }) {
    return <strong className="font-semibold text-gray-900">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },

  // 图片
  img({ src, alt }) {
    return (
      <img
        src={src}
        alt={alt}
        className="rounded-lg max-w-full my-2 border border-gray-200"
        loading="lazy"
      />
    );
  },
};

export function Markdown({ content }: MarkdownProps) {
  return (
    <div className="[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_pre_code]:text-[13px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
