import { getDocSlugs } from "@/lib/documentation";
import Link from "next/link";
import { Suspense } from "react";
import { DocContent } from "./doc-content";

export function generateStaticParams() {
  return getDocSlugs().map((slug) => ({ slug }));
}

function DocSkeleton() {
  return (
    <div className="mt-6 animate-pulse space-y-4" aria-hidden>
      <div className="h-10 w-3/4 rounded bg-current opacity-10" />
      <div className="h-4 w-full rounded bg-current opacity-10" />
      <div className="h-4 w-full rounded bg-current opacity-10" />
      <div className="h-4 w-2/3 rounded bg-current opacity-10" />
    </div>
  );
}

export default function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <article>
      <Link href="/documentation" className="text-sm underline">
        ← Retour
      </Link>
      <Suspense fallback={<DocSkeleton />}>
        <DocContent params={params} />
      </Suspense>
    </article>
  );
}
