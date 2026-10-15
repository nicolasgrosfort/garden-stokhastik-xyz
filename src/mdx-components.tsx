import { Code } from "@/components/code";
import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (p) => <h1 className="mb-6 text-4xl font-bold" {...p} />,
    h2: (p) => <h2 className="mb-3 mt-8 text-2xl font-semibold" {...p} />,
    h3: (p) => <h3 className="mb-2 mt-6 text-xl font-semibold" {...p} />,
    p: (p) => <p className="my-4 leading-7 text-pretty" {...p} />,
    a: (p) => <a className="underline underline-offset-2" {...p} />,
    ul: (p) => <ul className="my-4 list-disc pl-6" {...p} />,
    ol: (p) => <ol className="my-4 list-decimal pl-6" {...p} />,
    table: (p) => (
      <div className="my-6 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm" {...p} />
      </div>
    ),
    th: (p) => (
      <th className="border-b border-current/30 px-3 py-2 font-semibold" {...p} />
    ),
    td: (p) => (
      <td className="border-b border-current/10 px-3 py-2 align-top" {...p} />
    ),
    blockquote: (p) => (
      <blockquote className="my-4 border-l-4 pl-4 italic opacity-80" {...p} />
    ),
    pre: (p) => (
      <pre
        className="my-4 overflow-x-auto rounded bg-black/10 p-4 text-sm dark:bg-white/10"
        {...p}
      />
    ),
    code: (p) => <Code language="typescript" {...p} />,
    ...components,
  };
}
