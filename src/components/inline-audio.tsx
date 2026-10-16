"use client";

import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

// Même principe qu'InlineScramble : une section haute dans le flux de la page,
// dont le player reste fixe à l'écran tant qu'elle est visible. La position
// dans le morceau est une fonction de la progression du scroll, lissée par un
// ressort : le son rattrape sa cible en accélérant ou ralentissant (comme une
// bande), saute seulement quand l'écart est trop grand, et s'éteint en fondu
// dès que le scroll s'arrête.

// Progression de la section (0 → 1) : le morceau se lit entre PLAY_START et
// PLAY_END, le player apparaît avant et disparaît après.
const PLAY_START = 0.1;
const PLAY_END = 0.9;

// Rattrapage : la vitesse de lecture vaut 1 + écart × CHASE_GAIN (écart en
// secondes, positif si le son est en retard sur la cible), bornée à
// [MIN_RATE, MAX_RATE].
const CHASE_GAIN = 0.5;
const MIN_RATE = 0.5;
const MAX_RATE = 2;

// Écarts (en secondes) au-delà desquels on recale par un saut : en retard de
// plus de SEEK_BEHIND (scroll très rapide), en avance de plus de SEEK_AHEAD
// (scroll vers le haut, la lecture ne pouvant pas reculer).
const SEEK_BEHIND = 3;
const SEEK_AHEAD = 0.4;

// La vitesse de lecture rejoint sa valeur visée en douceur (par seconde, plus
// c'est grand plus c'est rapide) : pas de saut de hauteur en entrant ou en
// sortant de la zone « bon tempo ».
const RATE_EASING = 6;

// Hystérésis de la zone « bon tempo » : on y entre à ±GOOD_BAND, on n'en sort
// qu'à ±GOOD_BAND × GOOD_EXIT, pour que le marqueur au bord ne fasse pas
// clignoter le tempo.
const GOOD_EXIT = 1.4;

// Délai sans scroll avant d'éteindre le son (ms), puis durée du fondu (ms).
const IDLE_MS = 600;
const FADE_MS = 500;

// Ressort qui lisse la progression du scroll (amortissement critique) : les
// crans de la molette deviennent un mouvement continu.
const SPRING = { stiffness: 100, damping: 20, restDelta: 0.0001 };

// Jauge de tempo : le rapport entre la vitesse de scroll et la vitesse idéale
// (celle où le morceau se lit à 1×) est affiché en échelle logarithmique, de
// 2^-GAUGE_RANGE (trop lent) à 2^GAUGE_RANGE (trop vite). La zone « bon tempo »
// est centrée sur 1× et large de ±GOOD_BAND (en log2).
const GAUGE_RANGE = 2;
const GOOD_BAND = 0.6;

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
  // Dernier instant où la progression brute a bougé (performance.now()).
  const lastMove = useRef(0);
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

  // Barre et temps affichés pour une position t (0 → 1) dans le morceau.
  const paintTrack = (t: number) => {
    const el = audio.current;
    const duration = el && Number.isFinite(el.duration) ? el.duration : 0;
    if (barEl.current) barEl.current.style.transform = `scaleX(${t})`;
    if (timeEl.current) {
      timeEl.current.textContent = `${format(t * duration)} / ${format(duration)}`;
    }
  };

  const paint = (raw: number) => {
    const p = sanitize(raw);
    progress.current = p;
    const t = trackAt(p);
    // Une fois le son activé, c'est la lecture qui fait foi (voir la boucle).
    if (!enabledRef.current) paintTrack(t);
  };

  // Progression lissée : c'est elle que suivent le son, la barre et la jauge.
  const smooth = useSpring(scrollYProgress, SPRING);

  useMotionValueEvent(scrollYProgress, "change", (raw) => {
    setOnScreen(Number.isFinite(raw) && raw > 0 && raw < 1);
    lastMove.current = performance.now();
  });

  useMotionValueEvent(smooth, "change", paint);

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    // Hauteur du son non conservée : l'accélération s'entend comme une bande,
    // ce qui rend le tempo lisible à l'oreille.
    el.preservesPitch = false;
    const onMeta = () => paint(progress.current);
    el.addEventListener("loadedmetadata", onMeta);
    paint(smooth.get());
    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tant que la section est visible : fait rattraper la cible au son, règle
  // son volume et déplace le marqueur de la jauge. Une boucle rAF plutôt que
  // l'événement de scroll : la vitesse doit retomber à 0 quand on s'arrête.
  useEffect(() => {
    if (!onScreen) return;
    let frame = 0;
    let lastP = sanitize(smooth.get());
    let lastT = performance.now();
    let speed = 0;
    // Sens du scroll lissé (> 0 : vers le bas) et état de la zone « bon tempo ».
    let dir = 0;
    let inBand = false;
    let rate = 1;
    // Niveau du fondu (0 = éteint, 1 = plein), indépendant de el.volume que
    // iOS ignore : c'est lui qui décide de la mise en pause.
    let level = 0;
    const tick = (now: number) => {
      const el = audio.current;
      const box = container.current;
      const p = sanitize(smooth.get());
      const dt = (now - lastT) / 1000;
      // Longueur de scroll correspondant à la progression 0 → 1 de la
      // section, en px (hauteur de la section + hauteur du viewport).
      const span = (box?.offsetHeight ?? 0) + window.innerHeight;
      if (dt > 0) {
        const inst = (Math.abs(p - lastP) * span) / dt;
        speed += (inst - speed) * SPEED_SMOOTHING;
        dir += ((p - lastP) * span - dir) * SPEED_SMOOTHING;
        lastP = p;
        lastT = now;
      }
      const duration = el && Number.isFinite(el.duration) ? el.duration : 0;

      const ideal =
        duration > 0 ? (span * (PLAY_END - PLAY_START)) / duration : 0;
      const ratio = ideal > 0 ? speed / ideal : 0;
      const log = ratio > 0.01 ? Math.log2(ratio) : -GAUGE_RANGE;
      inBand =
        ratio >= 0.05 &&
        Math.abs(log) <= (inBand ? GOOD_BAND * GOOD_EXIT : GOOD_BAND);

      if (el && duration > 0 && enabledRef.current) {
        const atEdge = p <= PLAY_START || p >= PLAY_END;
        const active = !atEdge && now - lastMove.current < IDLE_MS;
        const target = trackAt(p) * duration;
        const gap = target - el.currentTime;
        if (active) {
          // Dans la zone « bon tempo » le son joue à 1× exactement, sans
          // rattrapage ni saut en avant : la lecture fait foi et l'écart avec
          // le scroll peut grandir. Seul un scroll vers le haut recale en
          // arrière (la lecture ne peut pas reculer).
          // Hors zone, le son accélère ou ralentit pour rejoindre le scroll.
          let desired = 1;
          if (inBand) {
            if (dir < 0 && gap < -SEEK_AHEAD) el.currentTime = target;
          } else if (gap > SEEK_BEHIND || gap < -SEEK_AHEAD) {
            el.currentTime = target;
          } else {
            desired = clamp(1 + gap * CHASE_GAIN, MIN_RATE, MAX_RATE);
          }
          rate += (desired - rate) * Math.min(1, dt * RATE_EASING);
          el.playbackRate = Math.abs(rate - 1) < 0.005 ? 1 : rate;
          if (el.paused) el.play().catch(() => {});
        }
        level = clamp(
          level + ((active ? 1 : -1) * (dt * 1000)) / FADE_MS,
          0,
          1,
        );
        el.volume = level;
        if (!active && level === 0 && !el.paused) el.pause();
        paintTrack(clamp(el.currentTime / duration, 0, 1));
      }

      const pos =
        clamp(log, -GAUGE_RANGE, GAUGE_RANGE) / (2 * GAUGE_RANGE) + 0.5;
      if (markerEl.current) {
        markerEl.current.style.left = `${pos * 100}%`;
      }
      if (hintEl.current) {
        hintEl.current.textContent =
          ratio < 0.05
            ? "scrolle"
            : inBand
              ? "bon tempo"
              : log < 0
                ? "plus vite"
                : "moins vite";
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      audio.current?.pause(); // eslint-disable-line react-hooks/exhaustive-deps
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onScreen]);

  const toggle = () => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    const el = audio.current;
    if (!el) return;
    // Le geste de l'utilisateur débloque la lecture ; la boucle prend ensuite
    // le relais (et remet en pause tant qu'on ne scrolle pas).
    if (next) {
      el.volume = 0;
      el.play().catch(() => {});
      lastMove.current = performance.now();
    } else el.pause();
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
