import { notFound } from "next/navigation";
import { getPost, getSlugs } from "@/lib/posts";

export async function PostContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getSlugs().includes(slug)) notFound();
  const { Content, meta } = await getPost(slug);

  return (
    <>
      <p className="mt-6 text-sm opacity-60">{meta.date}</p>
      <article>
        <Content />
      </article>
    </>
  );
}
