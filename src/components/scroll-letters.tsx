"use client";

import {
  type MotionValue,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useMemo, useRef } from "react";

type Order = "sequential" | "random";

// Graine déterministe : le même texte donne toujours le même ordre, côté
// serveur comme côté client (sinon erreur d'hydratation).
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rankLetters(count: number, order: Order, seed: number) {
  const ranks = Array.from({ length: count }, (_, i) => i);
  if (order === "sequential") return ranks;
  const rand = mulberry32(seed);
  for (let i = ranks.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ranks[i], ranks[j]] = [ranks[j], ranks[i]];
  }
  return ranks;
}

function Letter({
  char,
  progress,
  start,
  end,
}: {
  char: string;
  progress: MotionValue<number>;
  start: number;
  end: number;
}) {
  const opacity = useTransform(progress, [start, end], [0.08, 1]);
  return <motion.span style={{ opacity }}>{char}</motion.span>;
}

// Fait apparaître le texte lettre par lettre au fil du scroll.
// `random` : l'ordre d'apparition est tiré au sort (stable), plutôt que
// de gauche à droite.
export function ScrollLetters({
  children,
  order = "sequential",
}: {
  children: string;
  order?: Order;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduceMotion = useReducedMotion();
  const text = String(children).replace(/\s+/g, " ").trim();

  // Le paragraphe se révèle pendant que son haut remonte de 90 % à 40 % du
  // viewport.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "start 0.4"],
  });

  const words = useMemo(() => text.split(" "), [text]);
  const letterCount = useMemo(
    () => words.reduce((n, w) => n + w.length, 0),
    [words],
  );
  const ranks = useMemo(
    () => rankLetters(letterCount, order, text.length),
    [letterCount, order, text.length],
  );

  if (reduceMotion) {
    return <p className="my-4 leading-7 text-pretty">{text}</p>;
  }

  // Chaque lettre a une fenêtre de scroll qui lui est propre ; elles se
  // recouvrent pour que l'apparition reste fluide.
  const windowSize = 0.2;
  let cursor = 0;

  return (
    <p ref={ref} aria-label={text} className="my-4 leading-7 text-pretty">
      {words.map((word, w) => (
        <span key={`${w}-${word}`} aria-hidden>
          <span className="inline-block whitespace-nowrap">
            {[...word].map((char, c) => {
              const rank = ranks[cursor++];
              const start = (rank / letterCount) * (1 - windowSize);
              return (
                <Letter
                  key={c}
                  char={char}
                  progress={scrollYProgress}
                  start={start}
                  end={start + windowSize}
                />
              );
            })}
          </span>
          {w < words.length - 1 ? " " : null}
        </span>
      ))}
    </p>
  );
}
