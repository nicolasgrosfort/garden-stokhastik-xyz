import { notFound } from "next/navigation";
import { getDoc, getDocSlugs } from "@/lib/documentation";

export async function DocContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getDocSlugs().includes(slug)) notFound();
  const { Content } = await getDoc(slug);

  return (
    <article className="mt-6">
      <Content />
    </article>
  );
}
