"use client";

import { PLYModel } from "@/components/ply-model";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  animate,
  type MotionValue,
  useMotionValue,
  useScroll,
  useTransform,
} from "motion/react";
import { Suspense, useEffect, useRef } from "react";
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

const SPRING = { type: "spring", stiffness: 60, damping: 12 } as const;
const MAX_PITCH = 0.6;

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
    const angle = startAngle + progress.get() * Math.PI * 2 + yaw.get();
    const elevation = startElevation + pitch.get();
    const horizontal = distance * Math.cos(elevation);
    state.camera.position.set(
      target.x + Math.sin(angle) * horizontal,
      target.y + distance * Math.sin(elevation),
      target.z + Math.cos(angle) * horizontal,
    );
    state.camera.lookAt(target);
  });

  return null;
}

export const InlineModel = () => {
  const container = useRef<HTMLDivElement>(null);
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
      <div className="sticky top-0 h-screen w-full">
        <Canvas
          camera={{ position: position.toArray(), fov: 50 }}
          eventPrefix="client"
          // Le scroll vertical de la page reste possible au toucher.
          style={{ touchAction: "pan-y" }}
        >
          <Suspense fallback={null}>
            <PLYModel url={url} reveal={reveal} />
          </Suspense>
          <ScrollRig progress={cameraProgress} />
        </Canvas>
      </div>
    </div>
  );
};
