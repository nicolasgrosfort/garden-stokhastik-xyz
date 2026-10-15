import Home, { meta } from "@/content/home.mdx";
import { formatDate } from "@/lib/format-date";

export default function Page() {
  return (
    <article className="flex flex-col gap-6">
      <p className="text-sm opacity-60">
        Créé le {formatDate(meta.created)} · Mis à jour le{" "}
        {formatDate(meta.updated)}
      </p>
      <div>
        <Home />
      </div>
    </article>
  );
}
