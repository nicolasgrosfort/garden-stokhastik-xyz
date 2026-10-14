"use client";

import { PLYModel } from "@/components/ply-model";
import { PositionalAudio } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  animate,
  type MotionValue,
  useInView,
  useMotionValue,
  useScroll,
  useTransform,
} from "motion/react";
import { Suspense, useEffect, useRef, useState } from "react";
import { AudioContext, type PositionalAudio as PositionalAudioImpl } from "three";
import { Vector3 } from "three";

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

// Phases (progression 0 → 1 de la section figée), l'une après l'autre :
// apparition (caméra fixe) de 0 à APPEAR_END, mouvement de caméra entre les
// deux, disparition (caméra fixe) de DISAPPEAR_START à 1.
const APPEAR_END = 0.25;
const DISAPPEAR_START = 0.75;

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
      (AudioContext.getContext() as unknown as BaseAudioContext & {
        resume(): Promise<void>;
      }).resume();
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

const SPRING = { type: "spring", stiffness: 60, damping: 12 } as const;
const MAX_PITCH = 0.6;
// Éloignement maximal de la caméra, en multiple de la distance de départ.
const MOVE_AWAY = 3;

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// Caméra pilotée par le scroll, avec un décalage d'orbite manuel (drag) qui
// revient à zéro au relâchement, comme aimanté.
function ScrollRig({ progress }: { progress: MotionValue<number> }) {
  const gl = useThree((state) => state.gl);
  const yaw = useMotionValue(0);
  const pitch = useMotionValue(0);

  const offset = position.clone().sub(target);
  const radius = Math.hypot(offset.x, offset.z);
  const height = offset.y;
  const distance = Math.hypot(radius, height);
  const startAngle = Math.atan2(offset.x, offset.z);
  const startElevation = Math.atan2(height, radius);

  useEffect(() => {
    const el = gl.domElement;
    let last: { x: number; y: number } | null = null;
    let controls: { stop: () => void }[] = [];

    const down = (e: PointerEvent) => {
      for (const c of controls) c.stop();
      last = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!last) return;
      yaw.set(yaw.get() - (e.clientX - last.x) * 0.005);
      pitch.set(
        Math.max(
          -MAX_PITCH,
          Math.min(MAX_PITCH, pitch.get() + (e.clientY - last.y) * 0.005),
        ),
      );
      last = { x: e.clientX, y: e.clientY };
    };
    const up = () => {
      if (!last) return;
      last = null;
      controls = [animate(yaw, 0, SPRING), animate(pitch, 0, SPRING)];
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      for (const c of controls) c.stop();
    };
  }, [gl, yaw, pitch]);

  useFrame((state) => {
    const p = progress.get();
    const angle = startAngle + p * Math.PI * 2 + yaw.get();
    const elevation = startElevation + pitch.get();
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
  const stage = useRef<HTMLDivElement>(null);
  const onScreen = useInView(stage, { amount: 0.5 });
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  });
  const reveal = useTransform(scrollYProgress, (s) => {
    if (s < APPEAR_END) return easeIn(s / APPEAR_END);
    if (s >= DISAPPEAR_START) {
      // Même courbe que l'apparition, parcourue à l'envers dans le temps.
      return easeIn(1 - (s - DISAPPEAR_START) / (1 - DISAPPEAR_START));
    }
    return 1;
  });

  const cameraProgress = useTransform(
    scrollYProgress,
    [APPEAR_END, DISAPPEAR_START],
    [0, 1],
    { clamp: true },
  );

  return (
    <div ref={container} // Pleine largeur d'écran même dans une colonne à largeur max.
      className="relative ml-[calc(50%-50vw)] h-[400vh] w-screen">
      <div ref={stage} className="sticky top-0 h-screen w-full">
        <Canvas
          camera={{ position: position.toArray(), fov: 50 }}
          eventPrefix="client"
          // Le scroll vertical de la page reste possible au toucher.
          style={{ touchAction: "pan-y" }}
        >
          <Suspense fallback={null}>
            <PLYModel url={url} reveal={reveal} />
          </Suspense>
          <SpatialAudio url={AUDIO_URL} active={onScreen} volume={reveal} />
          <ScrollRig progress={cameraProgress} />
        </Canvas>
      </div>
    </div>
  );
};
