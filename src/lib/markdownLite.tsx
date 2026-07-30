import type { ReactNode } from "react";

/** Deliberately not a full CommonMark implementation — just enough structure
 * (headings, bold/italic, bullet & numbered lists, paragraphs) for readable
 * policy documents, without pulling in a markdown dependency. The same raw
 * string is also what AI agents read directly as plain-text context. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2] !== undefined) {
      parts.push(<strong key={`${keyPrefix}-${index++}`}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={`${keyPrefix}-${index++}`}>{match[3]}</em>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function MarkdownLite({ content }: { content: string }): ReactNode {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let listBuffer: { ordered: boolean; items: string[] } | null = null;
  let paragraphBuffer: string[] = [];

  function flushList() {
    if (!listBuffer) return;
    const Tag = listBuffer.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={`list-${blocks.length}`} className={listBuffer.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
        {listBuffer.items.map((item, i) => (
          <li key={i}>{renderInline(item, `li-${blocks.length}-${i}`)}</li>
        ))}
      </Tag>
    );
    listBuffer = null;
  }

  function flushParagraph() {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.join(" ");
    blocks.push(
      <p key={`p-${blocks.length}`} className="leading-relaxed text-slate-700 dark:text-slate-300">
        {renderInline(text, `p-${blocks.length}`)}
      </p>
    );
    paragraphBuffer = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const text = heading[2];
      const className =
        level === 1
          ? "mt-6 text-xl font-semibold text-slate-900 first:mt-0 dark:text-slate-50"
          : level === 2
            ? "mt-5 text-lg font-semibold text-slate-900 first:mt-0 dark:text-slate-50"
            : "mt-4 text-base font-semibold text-slate-800 first:mt-0 dark:text-slate-100";
      if (level === 1) blocks.push(<h2 key={`h-${blocks.length}`} className={className}>{renderInline(text, `h-${blocks.length}`)}</h2>);
      else if (level === 2) blocks.push(<h3 key={`h-${blocks.length}`} className={className}>{renderInline(text, `h-${blocks.length}`)}</h3>);
      else blocks.push(<h4 key={`h-${blocks.length}`} className={className}>{renderInline(text, `h-${blocks.length}`)}</h4>);
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    const numbered = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      const item = (bullet ?? numbered)![1];
      if (!listBuffer || listBuffer.ordered !== ordered) {
        flushList();
        listBuffer = { ordered, items: [] };
      }
      listBuffer.items.push(item);
      continue;
    }

    flushList();
    paragraphBuffer.push(trimmed);
  }
  flushParagraph();
  flushList();

  if (blocks.length === 0) {
    return <p className="text-sm text-slate-400 italic">No content yet.</p>;
  }
  return <div className="flex flex-col gap-3">{blocks}</div>;
}
