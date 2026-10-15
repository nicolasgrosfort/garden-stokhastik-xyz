import Home, { meta } from "@/content/home.mdx";

export default function Page() {
  return (
    <article className="flex flex-col gap-4">
      <p className="text-sm opacity-60">
        Créé le {meta.created} · Mis à jour le {meta.updated}
      </p>
      <div>
        <Home />
      </div>
    </article>
  );
}
