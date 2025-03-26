import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css"; // VS Code 风格

import "github-markdown-css";
import "katex/dist/katex.min.css";

const MarkdownRenderer = ({ content, className }) => {
  return (
    <div
      className={`${className} markdown bg-inherit`}
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeKatex,
          [
            rehypeHighlight,
            {
              // 显式指定 highlight 函数
              highlight: (code, lang) => {
                const language = hljs.getLanguage(lang) ? lang : "plaintext";
                return hljs.highlight(code, { language }).value;
              },
            },
          ],
        ]}
        components={{
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-gray-400 pl-4 italic text-gray-600">
                {children}
              </blockquote>
            )
          },
          // 自定义代码块渲染（可选）
          code({ inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "plaintext"; // 提取语言
            return !inline && match ? (
              <div className="markdown-code-block my-2 rounded-lg border border-gray-300 shadow-sm">
                {/* 代码块标题 */}
                <div className="bg-[#2F2F2F] text-gray-100 text-sm font-semibold font-sans px-4 py-2 rounded-t-lg">
                  {language[0].toUpperCase() + language.slice(1)}
                </div>
                <pre className="!bg-[#171717] overflow-auto rounded-b-lg">
                  <code
                    className="!bg-[#1d1d1d] text-gray-100 block py-4 px-4"
                    {...props}
                  >
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
        children={content}
      />
    </div>
  );
};

export { MarkdownRenderer };
