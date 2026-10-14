import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

export const Code = ({
  language = "typescript",
  className,
  children,
}: {
  language?: string;
  className?: string;
  children?: React.ReactNode;
}) => {
  const lang = /language-(\w+)/.exec(className ?? "")?.[1] ?? language;

  return (
    <SyntaxHighlighter language={lang} style={atomOneDark}>
      {String(children ?? "").replace(/\n$/, "")}
    </SyntaxHighlighter>
  );
};
