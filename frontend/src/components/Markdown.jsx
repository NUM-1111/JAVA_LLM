import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // 支持表格、删除线等
import remarkMath from "remark-math"; // 支持数学公式
import rehypeKatex from "rehype-katex"; // 渲染数学公式
import rehypeHighlight from "rehype-highlight"; // 代码高亮
//import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
//import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs"; // 使用更清晰的docco风格
import "github-markdown-css";
import "katex/dist/katex.min.css"; // 让 KaTeX 数学公式正确显示

const MarkdownRenderer = ({ content }) => {
  return (
    <div className="markdown" style={{ padding: "20px", backgroundColor: "#ffffff", color: "#333", fontFamily: "Arial, sans-serif" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex,rehypeHighlight]}
        children={content}
      />
    </div>
  );
};

export { MarkdownRenderer };
