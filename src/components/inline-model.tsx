"use client";

import { PLYModel } from "@/components/ply-model";
import { PositionalAudio } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  type MotionValue,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  AudioContext,
  type PositionalAudio as PositionalAudioImpl,
  Vector3,
} from "three";

const url = "/models/2026-09-22-vending-machine-foret-daimonji-trail.ply";
const target = new Vector3(
  0.21421883804388286,
  0.9180186020625465,
  -0.24367372908056883,
);
const position = new Vector3(
  -1.5713629190625278,
  1.495487007130471,
  4.252692142611583,
);

// Le mouvement de caméra occupe toute la section figée. L'apparition (zoom in)
// a lieu pendant que la section entre à l'écran, la disparition (zoom out)
// pendant qu'elle en sort : l'inverse exact de l'apparition.

const ENTER_END = 0.2;
const LEAVE_START = 0.8;

// Valeurs de départ (et d'arrivée à la sortie), de 0 à 1.
// ZOOM_START : échelle du modèle ; OPACITY_START : opacité du canvas.
const ZOOM_START = 0.5;
const OPACITY_START = 0;

// Courbe exponentielle normalisée (0 → 0, 1 → 1) : lent au début, rapide à la fin.
// Plus EASE_STRENGTH est grand, plus le départ est lent et la fin brutale.
const EASE_STRENGTH = 5;
const easeIn = (t: number) =>
  (Math.exp(EASE_STRENGTH * t) - 1) / (Math.exp(EASE_STRENGTH) - 1);

// La caméra regarde toujours la cible : une source placée dessus serait
// toujours au centre, sans panoramique. On la décale sur le côté.
const SOUND_POSITION = target.clone().add(new Vector3(3, 0, 0));

// Plus il est grand, plus le son diminue vite avec la distance.
const ROLLOFF = 2;

const AUDIO_URL =
  "/audio/2026-09-12-atago-shrine-omikuji-machine-et-musique-traditionnelle.mp3";

// Joue le son quand `active`, le met en pause sinon. Monté une fois le
// fichier chargé (Suspense) et après le premier geste de l'utilisateur.
function Sound({
  url,
  active,
  volume,
}: {
  url: string;
  active: boolean;
  volume: MotionValue<number>;
}) {
  const sound = useRef<PositionalAudioImpl>(null);

  // Atténuation exponentielle : le son chute vite quand la caméra s'éloigne.
  useEffect(() => {
    const audio = sound.current;
    if (!audio) return;
    audio.setDistanceModel("exponential");
    audio.setRolloffFactor(ROLLOFF);
  }, []);

  useEffect(() => {
    const audio = sound.current;
    if (!audio) return;
    if (active) {
      if (!audio.isPlaying) audio.play();
    } else if (audio.isPlaying) {
      audio.pause();
    }
  }, [active]);

  // Le volume suit l'apparition / disparition des points.
  useFrame(() => sound.current?.setVolume(volume.get()));

  return (
    <PositionalAudio
      ref={sound}
      url={url}
      distance={2}
      loop
      position={SOUND_POSITION}
    />
  );
}

// Son spatialisé placé sur la cible : il se déplace entre les oreilles et
// change de volume quand la caméra orbite. Le navigateur interdit de jouer
// avant une interaction : le son devient possible au premier geste, puis suit
// `active` (modèle à l'écran).
function SpatialAudio({
  url,
  active,
  volume,
}: {
  url: string;
  active: boolean;
  volume: MotionValue<number>;
}) {
  const [available, setAvailable] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(url, { method: "HEAD" })
      .then((res) => !cancelled && setAvailable(res.ok))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    const events = ["pointerdown", "keydown", "touchend"] as const;
    const unlock = () => {
      // Les types de three ne déclarent pas `resume`, qui existe bien.
      (
        AudioContext.getContext() as unknown as BaseAudioContext & {
          resume(): Promise<void>;
        }
      ).resume();
      setUnlocked(true);
      for (const type of events) window.removeEventListener(type, unlock);
    };
    for (const type of events) window.addEventListener(type, unlock);
    return () => {
      for (const type of events) window.removeEventListener(type, unlock);
    };
  }, []);

  if (!available || !unlocked) return null;
  return (
    <Suspense fallback={null}>
      <Sound url={url} active={active} volume={volume} />
    </Suspense>
  );
}

// Éloignement maximal de la caméra, en multiple de la distance de départ.
const MOVE_AWAY = 3;

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// Caméra pilotée par le scroll uniquement.
function ScrollRig({ progress }: { progress: MotionValue<number> }) {
  const offset = position.clone().sub(target);
  const radius = Math.hypot(offset.x, offset.z);
  const height = offset.y;
  const distance = Math.hypot(radius, height);
  const startAngle = Math.atan2(offset.x, offset.z);
  const elevation = Math.atan2(height, radius);

  useFrame((state) => {
    const p = progress.get();
    const angle = startAngle + p * Math.PI * 2;
    // S'éloigne (0 → 0,25), reste loin en tournant, puis revient (0,75 → 1).
    const away = smoothstep(0, 0.25, p) * (1 - smoothstep(0.75, 1, p));
    const dist = distance * (1 + MOVE_AWAY * away);
    const horizontal = dist * Math.cos(elevation);
    state.camera.position.set(
      target.x + Math.sin(angle) * horizontal,
      target.y + dist * Math.sin(elevation),
      target.z + Math.cos(angle) * horizontal,
    );
    state.camera.lookAt(target);
  });

  return null;
}

export const InlineModel = () => {
  const container = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  // Une seule source de scroll : de l'entrée du haut de la section à la
  // sortie de son bas. Plusieurs sources se mettent à jour à des moments
  // différents et se contredisent quand le scroll est rapide.
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start end", "end start"],
  });
  // Le canvas est fixe à l'écran tant que la section est visible : seul le zoom
  // s'anime, le modèle ne défile pas avec la page.
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    setOnScreen(p > 0 && p < 1);
  });
  // Section de 400vh + 100vh d'écran : entrée 0 → 0,2, figée 0,2 → 0,8, sortie 0,8 → 1.
  const reveal = useSpring(
    useTransform(scrollYProgress, (p) => {
      if (p < ENTER_END) return easeIn(p / ENTER_END);
      if (p > LEAVE_START) return easeIn((1 - p) / (1 - LEAVE_START));
      return 1;
    }),
    { stiffness: 300, damping: 40, restDelta: 0.0005 },
  );
  const opacity = useTransform(reveal, [0, 1], [OPACITY_START, 1]);
  const cameraProgress = useTransform(
    scrollYProgress,
    [ENTER_END, LEAVE_START],
    [0, 1],
    { clamp: true },
  );

  return (
    <div
      ref={container} // Pleine largeur d'écran même dans une colonne à largeur max.
      className="relative ml-[calc(50%-50vw)] h-[400vh] w-screen"
    >
      <motion.div
        className="pointer-events-none fixed top-0 left-0 h-screen w-screen"
        style={{
          opacity,
          visibility: onScreen ? "visible" : "hidden",
        }}
      >
        <Canvas camera={{ position: position.toArray(), fov: 50 }}>
          <Suspense fallback={null}>
            <PLYModel
              url={url}
              reveal={reveal}
              zoomStart={ZOOM_START}
              pivot={target}
            />
          </Suspense>
          <SpatialAudio url={AUDIO_URL} active={onScreen} volume={reveal} />
          <ScrollRig progress={cameraProgress} />
        </Canvas>
      </motion.div>
    </div>
  );
};
