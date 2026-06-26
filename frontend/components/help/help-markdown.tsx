"use client"

import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

type HelpMarkdownProps = {
  content: string
  className?: string
}

function isRepoRelativeDocLink(href: string | undefined): boolean {
  if (!href) return false
  return href.includes("..") || /\.md($|[#?])/i.test(href)
}

export function HelpMarkdown({ content, className }: HelpMarkdownProps) {
  return (
    <div className={cn("help-markdown max-w-none text-foreground", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-foreground mt-0 mb-4 pb-2 border-b border-border">{children}</h1>
          ),
          h2: ({ children }) => <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">{children}</h3>,
          p: ({ children }) => <p className="text-foreground leading-relaxed mb-4">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 text-foreground space-y-2 mb-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 text-foreground space-y-2 mb-4">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          hr: () => <hr className="my-8 border-border" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary bg-primary/10 pl-4 py-2 pr-3 my-4 rounded-r-md text-foreground">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-lg border border-border shadow-sm">
              <table className="w-full min-w-[280px] border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-border bg-card">{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-border last:border-0">{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">{children}</th>
          ),
          td: ({ children }) => <td className="px-4 py-3 text-foreground align-top">{children}</td>,
          a: ({ href, children }) => {
            if (!href) return <span>{children}</span>
            if (href.startsWith("/help")) {
              return (
                <Link href={href} className="text-primary font-medium hover:underline">
                  {children}
                </Link>
              )
            }
            if (href.startsWith("http://") || href.startsWith("https://")) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {children}
                </a>
              )
            }
            if (isRepoRelativeDocLink(href)) {
              return (
                <span
                  className="cursor-help border-b border-dashed border-muted-foreground text-foreground"
                  title="Tài liệu này nằm trong thư mục docs/ của repository mã nguồn (clone repo để xem)."
                >
                  {children}
                </span>
              )
            }
            return (
              <a href={href} className="text-primary hover:underline">
                {children}
              </a>
            )
          },
          img: ({ src, alt }) => {
            const url =
              src?.startsWith("/help-images/") || src?.startsWith("http")
                ? src
                : src?.startsWith("images/")
                  ? `/help-images/${src.slice("images/".length)}`
                  : src
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url ?? ""}
                alt={alt ?? ""}
                className="rounded-lg border border-border bg-muted max-w-full h-auto my-4 shadow-sm"
              />
            )
          },
          code: ({ className, children }) => {
            const isBlock = Boolean(className?.includes("language-"))
            if (isBlock) {
              return <code className={cn("font-mono text-sm text-inherit", className)}>{children}</code>
            }
            return (
              <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.9em]">{children}</code>
            )
          },
          pre: ({ children }) => (
            <pre className="not-prose bg-muted text-foreground rounded-lg p-4 overflow-x-auto my-4 text-sm font-mono leading-relaxed">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
