"use client";

import { useEffect, useId, useState } from "react";

interface MermaidDiagramProps {
  code: string;
}

/** Renders a ```mermaid fenced code block from an agent reply as an actual
 * diagram (client-only, dynamically imported so mermaid never lands in the
 * main bundle for users who never see one). Falls back to the raw source in
 * a <pre> if the LLM produced invalid mermaid syntax, rather than crashing
 * the whole message bubble. */
export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [lastCode, setLastCode] = useState(code);

  if (code !== lastCode) {
    setLastCode(code);
    setSvg(null);
    setFailed(false);
  }

  useEffect(() => {
    let cancelled = false;
    import("mermaid")
      .then(async (mod) => {
        const mermaid = mod.default;
        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "strict" });
        const { svg: rendered } = await mermaid.render(`mermaid-${id}`, code);
        if (!cancelled) setSvg(rendered);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (failed) {
    return <pre className="overflow-x-auto rounded-lg bg-slate-900/90 px-3 py-2 text-xs text-slate-100">{code}</pre>;
  }
  if (!svg) {
    return <div className="rounded-lg bg-slate-100 px-3 py-4 text-center text-xs text-slate-400 dark:bg-slate-800">Rendering diagram…</div>;
  }
  return <div className="overflow-x-auto rounded-lg bg-white p-2 dark:bg-slate-50" dangerouslySetInnerHTML={{ __html: svg }} />;
}
