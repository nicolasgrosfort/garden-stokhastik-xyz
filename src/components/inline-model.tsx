"use client";

import { PLYModel } from "@/components/ply-model";
import { Canvas, useFrame } from "@react-three/fiber";
import { type MotionValue, useScroll } from "motion/react";
import { Suspense, useRef } from "react";
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

// Orbite la caméra autour de la cible selon la progression du scroll de la page
// à travers le conteneur (un tour complet sur 3 écrans).
function ScrollRig({ progress }: { progress: MotionValue<number> }) {
  const offset = position.clone().sub(target);
  const radius = Math.hypot(offset.x, offset.z);
  const startAngle = Math.atan2(offset.x, offset.z);

  useFrame((state) => {
    const angle = startAngle + progress.get() * Math.PI * 2;
    state.camera.position.set(
      target.x + Math.sin(angle) * radius,
      position.y,
      target.z + Math.cos(angle) * radius,
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

  return (
    <div ref={container} className="relative h-[300vh] w-full">
      <div className="sticky top-0 h-screen w-full">
        <Canvas
          camera={{ position: position.toArray(), fov: 50 }}
          eventPrefix="client"
        >
          <Suspense fallback={null}>
            <PLYModel url={url} />
          </Suspense>
          <ScrollRig progress={scrollYProgress} />
        </Canvas>
      </div>
    </div>
  );
};
