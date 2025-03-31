import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css";
import "github-markdown-css";
import "katex/dist/katex.min.css";
import { CopyIcon, CheckIcon } from "../svg-icons"; // 假设你有这两个图标组件

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
            );
          },
          code({ inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "plaintext";
            // 非内联代码块（带语言标识的代码块）
            if (!inline && match) {
              return (
                <CodeBlockWithCopy
                  language={language}
                  children={children}
                  className={className}
                  {...props}
                />
              );
            }

            // 内联代码或普通代码块
            return (
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

// 从React元素中提取原始代码文本
const extractTextFromReactNode = (node) => {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractTextFromReactNode).join("");
  if (node?.props?.children)
    return extractTextFromReactNode(node.props.children);
  return "";
};

// 带复制功能的代码块组件
const CodeBlockWithCopy = ({
  language,
  children,
  // eslint-disable-next-line no-unused-vars
  className,
  ...props
}) => {
  const [copied, setCopied] = useState(false);
  const codeText = extractTextFromReactNode(children);
  const handleCopy = async () => {
    try {
      // 优先使用现代 Clipboard API
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(codeText);
      } else {
        // 降级方案：使用传统 execCommand
        const textarea = document.createElement("textarea");
        textarea.value = codeText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();

        // 使用类型断言避免 TypeScript 警告
        const success = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (!success) {
          throw new Error("execCommand failed");
        }
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  return (
    <div className="markdown-code-block my-2 rounded-lg border border-gray-300 shadow-sm relative">
      {/* 代码块标题和复制按钮 */}
      <div className="flex justify-between items-center bg-[#2F2F2F] text-gray-100 text-sm font-semibold font-sans px-4 py-2 rounded-t-lg">
        <span>{language[0].toUpperCase() + language.slice(1)}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs hover:text-white transition-colors"
          title="复制代码"
        >
          {copied ? (
            <>
              <CheckIcon className="size-4" />
              <span>已复制</span>
            </>
          ) : (
            <>
              <CopyIcon className="size-4" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>

      {/* 代码内容 */}
      <pre className="!bg-[#1d1d1d] overflow-auto rounded-b-lg text-sm">
        <code
          className="!bg-[#1d1d1d] text-gray-100 block py-4 px-4"
          {...props}
        >
          {children}
        </code>
      </pre>
    </div>
  );
};

export { MarkdownRenderer };
