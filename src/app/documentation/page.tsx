import { getAllDocs } from "@/lib/documentation";
import Link from "next/link";

export default async function DocumentationPage() {
  const docs = await getAllDocs();
  return (
    <article>
      <h1 className="mb-8 text-4xl font-bold">Documentation</h1>
      <ul className="space-y-6">
        {docs.map((d) => (
          <li key={d.slug}>
            <Link
              href={`/documentation/${d.slug}`}
              className="text-xl font-semibold underline"
            >
              {d.title}
            </Link>
            {d.description && <p>{d.description}</p>}
          </li>
        ))}
      </ul>
    </article>
  );
}
