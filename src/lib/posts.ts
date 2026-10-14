import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "src/content/posts");

export type PostMeta = { title: string; date: string; description?: string };

export function getSlugs() {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

export async function getPost(slug: string) {
  const mod = await import(`@/content/posts/${slug}.mdx`);
  return { Content: mod.default, meta: mod.meta as PostMeta };
}

export async function getAllPosts() {
  const posts = await Promise.all(
    getSlugs().map(async (slug) => ({ slug, ...(await getPost(slug)).meta })),
  );
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}
