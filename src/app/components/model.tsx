"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { Suspense } from "react";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";

function PLYGeometry({ url }: { url: string }) {
  const geometry = useLoader(PLYLoader, url);

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.01} vertexColors={true} sizeAttenuation />
    </points>
  );
}

export function Model({
  url,
  className = "h-96 w-full",
  position = [0, 0, 10],
  target = [0, 0, 0],
}: {
  url: string;
  className?: string;
  position?: [number, number, number];
  target?: [number, number, number];
}) {
  return (
    <div className={className}>
      <Canvas camera={{ position: position, fov: 50 }}>
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
