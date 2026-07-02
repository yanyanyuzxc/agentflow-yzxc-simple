import { getConversation, getMessages } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { resErr } from "@/lib/resp";
import { logger } from "@/lib/log";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeHeading(text: string, level: any): Paragraph {
  return new Paragraph({ heading: level, spacing: { before: 200, after: 80 }, children: [new TextRun({ text, bold: true })] });
}

function makePara(text: string): Paragraph {
  return new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text, size: 22 })] });
}

function makeDivider(): Paragraph {
  return new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "─".repeat(36), size: 12, color: "BBBBBB" })], alignment: AlignmentType.CENTER });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = requireAuth(req);
    const { id } = await params;
    const conv = await getConversation(userId, Number(id));
    if (!conv) return resErr(404, "对话不存在");

    const messages = await getMessages(userId, Number(id));
    const children: Paragraph[] = [];

    // 标题
    children.push(new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: conv.title, bold: true, size: 40 })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: `导出: ${new Date().toLocaleString("zh-CN")}  ·  共 ${messages.length} 条消息`, size: 20, color: "888888" })] }));

    for (const msg of messages) {
      const isUser = msg.role === "user";

      // 消息头
      children.push(makeHeading(isUser ? `👤 用户` : `🤖 AI Agent`, HeadingLevel.HEADING_2));
      children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: new Date(msg.created_at).toLocaleString("zh-CN"), size: 18, color: "999999", italics: true })] }));

      // 消息内容
      if (isUser) {
        children.push(makePara(msg.content));
      } else {
        // AI 回复：按段落拆分，识别标题
        for (const line of msg.content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) { children.push(new Paragraph({ spacing: { after: 40 }, children: [] })); continue; }
          if (/^```/.test(trimmed)) { children.push(makePara("[代码块]")); continue; }
          if (/^####\s/.test(trimmed)) { children.push(makeHeading(trimmed.replace(/^####\s*/, ""), HeadingLevel.HEADING_4)); continue; }
          if (/^###\s/.test(trimmed)) { children.push(makeHeading(trimmed.replace(/^###\s*/, ""), HeadingLevel.HEADING_3)); continue; }
          if (/^##\s/.test(trimmed)) { children.push(makeHeading(trimmed.replace(/^##\s*/, ""), HeadingLevel.HEADING_2)); continue; }
          if (/^#\s/.test(trimmed)) { children.push(makeHeading(trimmed.replace(/^#\s*/, ""), HeadingLevel.HEADING_1)); continue; }
          children.push(makePara(trimmed));
        }
      }
      children.push(makeDivider());
    }

    const doc = new Document({
      sections: [{ properties: {}, children }],
    });

    const buffer = await Packer.toBuffer(doc);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(conv.title)}.docx"`,
      },
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("[export] 导出失败", { error: (error as Error).message });
    return resErr(500, "导出失败");
  }
}
