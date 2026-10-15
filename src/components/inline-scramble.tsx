"use client";

import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

// Même principe qu'InlineModel : une section haute dans le flux de la page,
// dont le contenu reste fixe à l'écran tant qu'elle est visible. Le texte est
// une fonction pure de la progression du scroll : il s'écrit lettre par
// lettre en descendant, avec un front de glyphes brouillés devant le curseur,
// et s'efface en remontant, sans minuterie.

// Progression de la section (0 → 1) : le texte s'écrit entre RESOLVE_START
// et RESOLVE_END, reste net, puis s'efface entre LEAVE_START et 1.
const RESOLVE_START = 0.1;
const RESOLVE_END = 0.5;
const LEAVE_START = 0.75;

// Nombre de caractères brouillés juste devant le texte net.
const FRONT = 5;

// Nombre de changements de glyphes sur toute la section.
const GLYPH_STEPS = 160;

const GLYPHS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@$*+=?/<>[]{}";

// Hash entier déterministe : même entrée, même sortie, côté serveur comme
// côté client.
function hash(a: number, b: number) {
  let h = Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 1, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

// La progression brute n'est pas bornée : pendant l'overscroll (rebond en haut
// ou en bas de page) elle devient négative ou dépasse 1, voire non finie si la
// section n'a pas encore de hauteur. Tout le reste ne voit que [0, 1].
const sanitize = (p: number) => (Number.isFinite(p) ? clamp(p, 0, 1) : 0);

// Interpolation linéaire par morceaux, bornée aux extrémités.
function piecewise(p: number, input: number[], output: number[]) {
  if (p <= input[0]) return output[0];
  for (let i = 1; i < input.length; i++) {
    if (p <= input[i]) {
      const t = (p - input[i - 1]) / (input[i] - input[i - 1]);
      return output[i - 1] + t * (output[i] - output[i - 1]);
    }
  }
  return output[output.length - 1];
}

const revealAt = (p: number) =>
  piecewise(p, [RESOLVE_START, RESOLVE_END, LEAVE_START, 1], [0, 1, 1, 0]);

const opacityAt = (p: number) =>
  piecewise(p, [0, RESOLVE_START, LEAVE_START, 1], [0, 1, 1, 0]);

// `reveal` : 0 = rien d'écrit, 1 = tout écrit. Renvoie le texte net, le front
// brouillé et le reste (invisible, mais il garde la place pour que le texte
// centré ne bouge pas et que les retours à la ligne restent stables).
function split(chars: string[], reveal: number, frame: number) {
  const n = chars.length;
  const pos = reveal * (n + FRONT);
  const resolvedEnd = clamp(Math.floor(pos - FRONT), 0, n);
  const frontEnd = clamp(Math.floor(pos), 0, n);

  const resolved = chars.slice(0, resolvedEnd).join("");
  const front = chars
    .slice(resolvedEnd, frontEnd)
    .map((char, k) =>
      char === " "
        ? char
        : GLYPHS[Math.floor(hash(resolvedEnd + k, frame) * GLYPHS.length)],
    )
    .join("");
  const rest = chars.slice(frontEnd).join("");
  return { resolved, front, rest };
}

export const InlineScramble = ({
  text,
  height = 300,
}: {
  text: string;
  // Hauteur de la section, en vh : plus elle est grande, plus le scroll
  // nécessaire pour écrire le texte est long.
  height?: number;
}) => {
  const container = useRef<HTMLDivElement>(null);
  const resolvedEl = useRef<HTMLSpanElement>(null);
  const frontEl = useRef<HTMLSpanElement>(null);
  const restEl = useRef<HTMLSpanElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const reduceMotion = useReducedMotion();

  const chars = useMemo(() => [...text], [text]);

  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, (p) => opacityAt(sanitize(p)));

  // Écrit directement dans le DOM : pas de rendu React à chaque événement de
  // scroll. Part de la valeur brute reçue, pas de valeurs dérivées qui
  // peuvent avoir une frame de retard.
  const paint = (raw: number) => {
    if (!resolvedEl.current || !frontEl.current || !restEl.current) return;
    const p = sanitize(raw);
    const { resolved, front, rest } = split(
      chars,
      revealAt(p),
      Math.floor(p * GLYPH_STEPS),
    );
    resolvedEl.current.textContent = resolved;
    frontEl.current.textContent = front;
    restEl.current.textContent = rest;
  };

  useEffect(() => {
    if (!reduceMotion) paint(scrollYProgress.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chars, reduceMotion]);

  useMotionValueEvent(scrollYProgress, "change", (raw) => {
    // Hors de ]0, 1[ (y compris en overscroll) : section pas à l'écran.
    setOnScreen(Number.isFinite(raw) && raw > 0 && raw < 1);
    if (!reduceMotion) paint(raw);
  });

  return (
    <div
      ref={container}
      // Pleine largeur d'écran même dans une colonne à largeur max.
      className="relative ml-[calc(50%-50vw)] w-screen"
      style={{ height: `${height}vh` }}
    >
      <motion.div
        className="pointer-events-none fixed inset-0 flex h-dvh w-dvw items-center justify-center px-6"
        style={{
          opacity: reduceMotion ? 1 : opacity,
          visibility: onScreen ? "visible" : "hidden",
        }}
      >
        {/* Le texte brouillé est du bruit pour un lecteur d'écran : on lui
            donne le texte réel. */}
        <span className="sr-only">{text}</span>
        <p
          aria-hidden
          className="max-w-2xl text-center text-3xl leading-snug"
        >
          {reduceMotion ? (
            text
          ) : (
            <>
              <span ref={resolvedEl} />
              <span ref={frontEl} className="opacity-60" />
              <span ref={restEl} className="invisible" />
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
};
