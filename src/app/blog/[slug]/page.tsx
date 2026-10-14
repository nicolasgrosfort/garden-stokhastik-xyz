import Link from "next/link";
import { Suspense } from "react";
import { getSlugs } from "@/lib/posts";
import { PostContent } from "./post-content";

export function generateStaticParams() {
  return getSlugs().map((slug) => ({ slug }));
}

function PostSkeleton() {
  return (
    <div className="mt-6 animate-pulse space-y-4" aria-hidden>
      <div className="h-4 w-24 rounded bg-current opacity-10" />
      <div className="h-10 w-3/4 rounded bg-current opacity-10" />
      <div className="h-4 w-full rounded bg-current opacity-10" />
      <div className="h-4 w-full rounded bg-current opacity-10" />
      <div className="h-4 w-2/3 rounded bg-current opacity-10" />
    </div>
  );
}

export default function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl p-8">
      <Link href="/blog" className="text-sm underline">← Retour</Link>
      <Suspense fallback={<PostSkeleton />}>
        <PostContent params={params} />
      </Suspense>
    </main>
  );
}
