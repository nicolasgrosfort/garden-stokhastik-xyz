"use client";

import { type ModelState, modelAtom } from "@/lib/model-state";
import { useSetAtom } from "jotai";
import { useInView } from "motion/react";
import { useEffect, useRef } from "react";

// Marqueur à placer dans le markdown : dès qu'il apparaît dans le viewport
// en scrollant, le modèle de fond devient celui décrit par ses props.
export function ModelTrigger({
  url,
  position,
  target,
  href,
  linkLabel,
}: ModelState) {
  const ref = useRef<HTMLDivElement>(null);
  const setModel = useSetAtom(modelAtom);
  const isInView = useInView(ref);

  useEffect(() => {
    if (isInView) setModel({ url, position, target, href, linkLabel });
    // Seule l'entrée dans le viewport déclenche : position/target sont des
    // littéraux MDX recréés à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="my-8 h-20 w-full bg-current opacity-20"
    />
  );
}
