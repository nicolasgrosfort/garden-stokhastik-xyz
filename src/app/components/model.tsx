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
}: {
  url: string;
  className?: string;
  position?: [number, number, number];
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
          onChange={(e) => {
            const { x, y, z } = e?.target.object.position;
            console.log("camera position", [x, y, z]);
          }}
        />
      </Canvas>
    </div>
  );
}
