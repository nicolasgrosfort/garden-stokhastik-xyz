import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default async function BlogPage() {
  const posts = await getAllPosts();
  return (
    <main className="mx-auto w-full max-w-2xl p-8">
      <h1 className="mb-8 text-4xl font-bold">Blog</h1>
      <ul className="space-y-6">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`} className="text-xl font-semibold underline">
              {p.title}
            </Link>
            <p className="text-sm opacity-60">{p.date}</p>
            {p.description && <p>{p.description}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}
