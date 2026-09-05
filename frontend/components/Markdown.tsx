"use client";

import ReactMarkdown, { type Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 mt-6 text-2xl font-bold text-gray-900 first:mt-0 dark:text-gray-50">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-6 text-xl font-semibold text-gray-900 first:mt-0 dark:text-gray-50">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 text-lg font-semibold text-gray-900 dark:text-gray-50">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 ml-5 list-disc space-y-1 text-gray-700 dark:text-gray-300">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 ml-5 list-decimal space-y-1 text-gray-700 dark:text-gray-300">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-violet-600 underline decoration-violet-300 underline-offset-2 hover:text-violet-800 dark:text-violet-400 dark:decoration-violet-700"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-4 border-l-4 border-violet-200 pl-4 italic text-gray-600 dark:border-violet-800 dark:text-gray-400">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.9em] text-pink-600 dark:bg-gray-800 dark:text-pink-400">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100 dark:bg-gray-950">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm text-gray-700 dark:text-gray-300">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-200 px-3 py-2 dark:border-gray-800">{children}</td>
  ),
  hr: () => <hr className="my-6 border-gray-200 dark:border-gray-800" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900 dark:text-gray-50">{children}</strong>
  ),
};

export default function Markdown({ children }: { children: string }) {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
}
