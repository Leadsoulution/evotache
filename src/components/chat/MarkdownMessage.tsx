"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { MermaidDiagram } from "./MermaidDiagram";
import { cn } from "@/lib/cn";

interface MarkdownMessageProps {
  text: string;
  isOwn: boolean;
}

/** Renders chat message text as markdown (bold, links, lists, tables) via
 * react-markdown, which outputs React elements directly rather than raw
 * HTML — so this never needs dangerouslySetInnerHTML and can't reintroduce
 * an XSS surface (message text still ultimately comes from a human or an
 * LLM, neither trusted). ```mermaid fences render as an actual diagram. */
export function MarkdownMessage({ text, isOwn }: MarkdownMessageProps) {
  const linkClass = isOwn ? "underline text-white hover:text-indigo-100" : "underline text-indigo-600 hover:text-indigo-500 dark:text-indigo-400";
  const codeClass = isOwn ? "bg-white/15 text-white" : "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100";
  const tableBorderClass = isOwn ? "border-white/25" : "border-slate-300 dark:border-slate-600";

  const components: Components = {
    p: ({ children }) => <p className="[&:not(:first-child)]:mt-2">{children}</p>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {children}
      </a>
    ),
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    ul: ({ children }) => <ul className="mt-1.5 list-disc space-y-0.5 pl-4">{children}</ul>,
    ol: ({ children }) => <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">{children}</ol>,
    li: ({ children }) => <li className="pl-0.5">{children}</li>,
    h1: ({ children }) => <p className="mt-2 text-base font-semibold first:mt-0">{children}</p>,
    h2: ({ children }) => <p className="mt-2 text-sm font-semibold first:mt-0">{children}</p>,
    h3: ({ children }) => <p className="mt-2 text-sm font-semibold first:mt-0">{children}</p>,
    blockquote: ({ children }) => <blockquote className={cn("mt-1.5 border-l-2 pl-2 italic opacity-90", isOwn ? "border-white/40" : "border-slate-300 dark:border-slate-600")}>{children}</blockquote>,
    table: ({ children }) => (
      <div className="mt-1.5 overflow-x-auto">
        <table className={cn("min-w-full border-collapse text-xs", tableBorderClass)}>{children}</table>
      </div>
    ),
    th: ({ children }) => <th className={cn("border px-2 py-1 text-left font-semibold", tableBorderClass)}>{children}</th>,
    td: ({ children }) => <td className={cn("border px-2 py-1", tableBorderClass)}>{children}</td>,
    code: ({ className, children }) => {
      const language = /language-(\w+)/.exec(className ?? "")?.[1];
      const raw = String(children).replace(/\n$/, "");
      if (language === "mermaid") return <MermaidDiagram code={raw} />;
      if (!className) return <code className={cn("rounded px-1 py-0.5 font-mono text-[0.85em]", codeClass)}>{children}</code>;
      return <code className={cn("block overflow-x-auto rounded-lg px-2 py-1.5 font-mono text-xs", codeClass)}>{children}</code>;
    },
    pre: ({ children }) => <pre className="mt-1.5">{children}</pre>,
  };

  return (
    <div className="break-words text-sm leading-relaxed [&>:first-child]:mt-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
