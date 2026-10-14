"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { type RefObject, Suspense } from "react";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";

function PLYGeometry({ url }: { url: string }) {
  const geometry = useLoader(PLYLoader, url);

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.01} vertexColors={true} sizeAttenuation />
    </points>
  );
}

// En plein écran le canvas est sous le contenu : on écoute les évènements
// sur le body pour que OrbitControls reste utilisable. `current` est lu
// côté client uniquement, après le montage.
const bodyRef = {
  get current() {
    return document.body;
  },
} as RefObject<HTMLElement>;

export function Model({
  url,
  className = "h-96 w-full",
  position = [0, 0, 10],
  target = [0, 0, 0],
  fullscreen = false,
}: {
  url: string;
  className?: string;
  position?: [number, number, number];
  target?: [number, number, number];
  fullscreen?: boolean;
}) {
  return (
    <div
      className={
        className + (fullscreen ? " fixed inset-0 -z-10 h-full w-full" : "")
      }
    >
      <Canvas
        camera={{ position: position, fov: 50 }}
        eventSource={fullscreen ? bodyRef : undefined}
        eventPrefix="client"
      >
        <Suspense fallback={null}>
          <PLYGeometry url={url} />
        </Suspense>
        <OrbitControls
          makeDefault
          enableDamping
          target={target}
          onChange={(e) => {
            const controls = e?.target;
            if (!controls) return;
            console.log("camera position", controls.object.position.toArray());
            console.log("camera target (pan)", controls.target.toArray());
          }}
        />
      </Canvas>
    </div>
  );
}
