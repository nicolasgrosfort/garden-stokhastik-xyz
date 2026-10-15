import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "src/content/documentation");

export type DocMeta = {
  title: string;
  created?: string;
  updated?: string;
  description?: string;
};

export function getDocSlugs() {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

export async function getDoc(slug: string) {
  const mod = await import(`@/content/documentation/${slug}.mdx`);
  return { Content: mod.default, meta: (mod.meta ?? { title: slug }) as DocMeta };
}

export async function getAllDocs() {
  const docs = await Promise.all(
    getDocSlugs().map(async (slug) => ({ slug, ...(await getDoc(slug)).meta })),
  );
  return docs.sort((a, b) => a.title.localeCompare(b.title));
}
