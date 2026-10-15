"use client";

import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

// Même principe qu'InlineScramble : une section haute dans le flux de la page,
// dont le player reste fixe à l'écran tant qu'elle est visible. La position
// dans le morceau est une fonction de la progression du scroll : le son avance
// en descendant, recule en remontant, et se tait dès que le scroll s'arrête.

// Progression de la section (0 → 1) : le morceau se lit entre PLAY_START et
// PLAY_END, le player apparaît avant et disparaît après.
const PLAY_START = 0.1;
const PLAY_END = 0.9;

// Écart (en secondes) entre la lecture et la cible au-delà duquel on recale.
const MAX_DRIFT = 0.5;

// Délai sans scroll avant de couper le son (ms).
const IDLE_MS = 600;

// Jauge de tempo : le rapport entre la vitesse de scroll et la vitesse idéale
// (celle où le morceau se lit à 1×) est affiché en échelle logarithmique, de
// 2^-GAUGE_RANGE (trop lent) à 2^GAUGE_RANGE (trop vite). La zone « bon tempo »
// est centrée sur 1× et large de ±GOOD_BAND (en log2).
const GAUGE_RANGE = 2;
const GOOD_BAND = 0.35;

// Lissage de la vitesse mesurée (0 → 1, plus c'est grand plus c'est réactif).
const SPEED_SMOOTHING = 0.15;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

// La progression brute n'est pas bornée (overscroll, section sans hauteur).
const sanitize = (p: number) => (Number.isFinite(p) ? clamp(p, 0, 1) : 0);

// Position dans le morceau (0 → 1) pour une progression de section donnée.
const trackAt = (p: number) =>
  clamp((p - PLAY_START) / (PLAY_END - PLAY_START), 0, 1);

const opacityAt = (p: number) => {
  if (p < PLAY_START) return p / PLAY_START;
  if (p > PLAY_END) return (1 - p) / (1 - PLAY_END);
  return 1;
};

const format = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

export const InlineAudio = ({
  src,
  title,
  height = 400,
}: {
  src: string;
  title?: string;
  // Hauteur de la section, en vh : plus elle est grande, plus le scroll
  // nécessaire pour lire tout le morceau est long.
  height?: number;
}) => {
  const container = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const barEl = useRef<HTMLDivElement>(null);
  const timeEl = useRef<HTMLSpanElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const progress = useRef(0);
  const markerEl = useRef<HTMLDivElement>(null);
  const hintEl = useRef<HTMLSpanElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  // Les navigateurs interdisent de lancer un son sans geste explicite : le
  // scroll n'en est pas un, d'où ce bouton.
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false);

  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, (p) => opacityAt(sanitize(p)));

  const paint = (raw: number) => {
    const p = sanitize(raw);
    progress.current = p;
    const el = audio.current;
    const t = trackAt(p);
    const duration = el && Number.isFinite(el.duration) ? el.duration : 0;
    if (barEl.current) barEl.current.style.transform = `scaleX(${t})`;
    if (timeEl.current) {
      timeEl.current.textContent = `${format(t * duration)} / ${format(duration)}`;
    }
  };

  // Recale le son sur la position du scroll, le lance, puis le coupe si le
  // scroll s'arrête.
  const sync = (raw: number) => {
    const el = audio.current;
    if (!el || !enabledRef.current || !Number.isFinite(el.duration)) return;
    const p = sanitize(raw);
    const inside = Number.isFinite(raw) && raw > 0 && raw < 1;
    if (!inside) {
      el.pause();
      return;
    }
    const target = trackAt(p) * el.duration;
    if (Math.abs(el.currentTime - target) > MAX_DRIFT) el.currentTime = target;
    // Aux extrémités du morceau il n'y a plus rien à jouer.
    const atEdge = p <= PLAY_START || p >= PLAY_END;
    if (atEdge) el.pause();
    else if (el.paused) el.play().catch(() => {});
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => el.pause(), IDLE_MS);
  };

  useMotionValueEvent(scrollYProgress, "change", (raw) => {
    setOnScreen(Number.isFinite(raw) && raw > 0 && raw < 1);
    paint(raw);
    sync(raw);
  });

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    const onMeta = () => paint(progress.current);
    el.addEventListener("loadedmetadata", onMeta);
    paint(scrollYProgress.get());
    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      clearTimeout(idleTimer.current);
      el.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tant que la section est visible, compare la vitesse de scroll à la vitesse
  // idéale et déplace le marqueur de la jauge. Une boucle rAF plutôt que
  // l'événement de scroll : la vitesse doit retomber à 0 quand on s'arrête.
  useEffect(() => {
    if (!onScreen) return;
    let frame = 0;
    let lastP = sanitize(scrollYProgress.get());
    let lastT = performance.now();
    let speed = 0;
    const tick = (now: number) => {
      const el = audio.current;
      const box = container.current;
      const p = sanitize(scrollYProgress.get());
      const dt = (now - lastT) / 1000;
      if (dt > 0) {
        // Longueur de scroll correspondant à la progression 0 → 1 de la
        // section, en px (hauteur de la section + hauteur du viewport).
        const span = (box?.offsetHeight ?? 0) + window.innerHeight;
        const inst = (Math.abs(p - lastP) * span) / dt;
        speed += (inst - speed) * SPEED_SMOOTHING;
        lastP = p;
        lastT = now;
      }
      const duration = el && Number.isFinite(el.duration) ? el.duration : 0;
      const span = (box?.offsetHeight ?? 0) + window.innerHeight;
      const ideal =
        duration > 0 ? (span * (PLAY_END - PLAY_START)) / duration : 0;
      const ratio = ideal > 0 ? speed / ideal : 0;
      const log = ratio > 0.01 ? Math.log2(ratio) : -GAUGE_RANGE;
      const pos =
        clamp(log, -GAUGE_RANGE, GAUGE_RANGE) / (2 * GAUGE_RANGE) + 0.5;
      if (markerEl.current) {
        markerEl.current.style.left = `${pos * 100}%`;
      }
      if (hintEl.current) {
        hintEl.current.textContent =
          ratio < 0.05
            ? "scrolle"
            : Math.abs(log) <= GOOD_BAND
              ? "bon tempo"
              : log < 0
                ? "plus vite"
                : "moins vite";
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onScreen]);

  const toggle = () => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    const el = audio.current;
    if (!el) return;
    if (next) sync(scrollYProgress.get());
    else el.pause();
  };

  return (
    <div
      ref={container}
      // Pleine largeur d'écran même dans une colonne à largeur max.
      className="relative ml-[calc(50%-50vw)] w-screen"
      style={{ height: `${height}vh` }}
    >
      <motion.div
        className="pointer-events-none fixed inset-0 flex h-dvh w-dvw items-center justify-center px-6"
        style={{ opacity, visibility: onScreen ? "visible" : "hidden" }}
      >
        <div className="w-full max-w-md text-sm">
          {title && <p className="mb-3 text-lg">{title}</p>}
          <div className="h-px w-full bg-current/20">
            <div
              ref={barEl}
              className="h-full origin-left bg-current"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
          {/* Jauge de tempo : le marqueur doit rester dans la zone centrale. */}
          <div className="mt-6" aria-hidden>
            <div className="relative h-px w-full bg-current/20">
              <div
                className="absolute top-1/2 h-2 -translate-y-1/2 bg-current/20"
                style={{
                  left: `${(0.5 - GOOD_BAND / (2 * GAUGE_RANGE)) * 100}%`,
                  width: `${(GOOD_BAND / GAUGE_RANGE) * 100}%`,
                }}
              />
              <div
                ref={markerEl}
                className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
                style={{ left: "0%" }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs opacity-60">
              <span>lent</span>
              <span ref={hintEl}>scrolle</span>
              <span>rapide</span>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <span ref={timeEl} className="tabular-nums opacity-60">
              0:00 / 0:00
            </span>
            <button
              type="button"
              onClick={toggle}
              aria-pressed={enabled}
              className="pointer-events-auto underline underline-offset-2"
            >
              {enabled ? "Couper le son" : "Activer le son"}
            </button>
          </div>
        </div>
      </motion.div>
      <audio ref={audio} src={src} preload="metadata" />
    </div>
  );
};
