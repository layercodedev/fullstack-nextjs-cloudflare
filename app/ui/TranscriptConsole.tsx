"use client";

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import type { HTMLAttributes } from 'react';
import type { ConversationEntry } from '../utils/updateMessages';

type MarkdownCodeProps = HTMLAttributes<HTMLElement> & {
  inline?: boolean;
  className?: string;
};

const CodeRenderer = ({ inline, className, children, ...props }: MarkdownCodeProps) => {
  if (inline) {
    return (
      <code
        {...props}
        className={`rounded bg-neutral-900/80 px-1.5 py-0.5 text-[13px] text-cyan-200 ${className ?? ''}`}
      >
        {children}
      </code>
    );
  }

  return (
    <pre className="overflow-x-auto rounded-md bg-neutral-950/80 p-3 text-[13px] leading-6 text-neutral-100">
      <code {...props} className={className}>
        {children}
      </code>
    </pre>
  );
};

const markdownComponents: Components = {
  p: ({ children, className, ...props }) => (
    <p {...props} className={`text-sm leading-relaxed text-neutral-200 ${className ?? ''}`}>
      {children}
    </p>
  ),
  strong: ({ children, className, ...props }) => (
    <strong {...props} className={`font-semibold text-neutral-50 ${className ?? ''}`}>
      {children}
    </strong>
  ),
  em: ({ children, className, ...props }) => (
    <em {...props} className={`italic text-neutral-200 ${className ?? ''}`}>
      {children}
    </em>
  ),
  a: ({ href, children, ...props }) => (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
    >
      {children}
    </a>
  ),
  ul: ({ children, className, ...props }) => (
    <ul {...props} className={`list-disc list-outside pl-5 space-y-1 text-sm text-neutral-200 ${className ?? ''}`}>
      {children}
    </ul>
  ),
  ol: ({ children, className, ...props }) => (
    <ol {...props} className={`list-decimal list-outside pl-5 space-y-1 text-sm text-neutral-200 ${className ?? ''}`}>
      {children}
    </ol>
  ),
  li: ({ children, className, ...props }) => (
    <li {...props} className={`text-sm leading-relaxed text-neutral-200 ${className ?? ''}`}>
      {children}
    </li>
  ),
  code: CodeRenderer,
  blockquote: ({ children, className, ...props }) => (
    <blockquote
      {...props}
      className={`border-l-2 border-neutral-700 pl-3 text-sm italic text-neutral-300 ${className ?? ''}`}
    >
      {children}
    </blockquote>
  ),
  hr: (props) => <hr {...props} className="border-neutral-800" />
};

const MarkdownRenderer = ({ text }: { text: string }) => {
  const content = text.trim().length > 0 ? text : '';

  return (
    <div className="space-y-2 text-neutral-200 [&_*]:break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default function TranscriptConsole({ entries }: { entries: ConversationEntry[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [entries]);

  return (
    <div ref={containerRef} className="h-[56vh] overflow-y-auto bg-neutral-950/40">
      <div className="sticky top-0 z-10 bg-neutral-950/70 backdrop-blur-sm border-b border-neutral-800 px-4 py-2 text-xs text-neutral-400 tracking-wider uppercase">
        Events
      </div>
      <ul className="divide-y divide-neutral-800">
        {entries.map((e, i) => {
          const key = e.turnId ? `${e.turnId}-${e.role}` : `${e.ts}-${i}`;
          const isData = e.role === 'data';
          const textContent = e.text ?? '';

          return (
            <li key={key} className="px-4 py-3 md:grid md:grid-cols-12 items-start">
              <div className="md:col-span-2 pr-3 text-[11px] text-neutral-500 tabular-nums">
                {new Date(e.ts).toLocaleTimeString([], { hour12: false })}
              </div>
              <div className="md:col-span-2 pr-3 mt-1 md:mt-0">
                <span
                  className={`px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${
                    e.role === 'assistant'
                      ? 'border-cyan-700 text-cyan-300'
                      : e.role === 'user'
                        ? 'border-violet-700 text-violet-300'
                        : 'border-neutral-700 text-gray-400'
                  }`}
                >
                  {e.role === 'assistant' ? 'Agent' : e.role}
                </span>
              </div>
              <div
                className={`md:col-span-8 mt-1 md:mt-0 ${
                  isData ? 'font-mono text-[12px] text-neutral-300 whitespace-pre-wrap break-words' : ''
                }`}
              >
                {isData ? <span>{textContent}</span> : <MarkdownRenderer text={textContent} />}
                {e.turnId ? <div className="mt-1 text-[11px] text-neutral-500">turn_id: {e.turnId}</div> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
