"use client";

import { useAtom } from "jotai";
import { modelAtom } from "@/lib/model-state";
import { Model } from "./model";

export function BackgroundModel() {
  const [model, setModel] = useAtom(modelAtom);
  if (!model) return null;

  const { url, position, target, href, linkLabel } = model;

  return (
    <Model
      // Remonte le canvas pour réappliquer la caméra quand le modèle change.
      key={JSON.stringify([url, position, target])}
      url={url}
      position={position}
      target={target}
      href={href}
      linkLabel={linkLabel}
      onReset={() => setModel(null)}
      fullscreen
    />
  );
}
