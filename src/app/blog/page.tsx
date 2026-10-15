import { getAllPosts } from "@/lib/posts";
import { formatDate } from "@/lib/format-date";
import Link from "next/link";

export default async function BlogPage() {
  const posts = await getAllPosts();
  return (
    <article>
      <h1 className="mb-8 text-4xl font-bold">Blog</h1>
      <ul className="space-y-6">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/blog/${p.slug}`}
              className="text-xl font-semibold underline"
            >
              {p.title}
            </Link>
            <p className="text-sm opacity-60">{formatDate(p.date)}</p>
            {p.description && <p>{p.description}</p>}
          </li>
        ))}
      </ul>
    </article>
  );
}
