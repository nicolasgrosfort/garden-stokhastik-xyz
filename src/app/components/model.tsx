"use client";

import { Suspense, useMemo } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { Bounds, Center, OrbitControls } from "@react-three/drei";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";

function PlyGeometry({ url }: { url: string }) {
  const geometry = useLoader(PLYLoader, url);

  const { hasFaces, hasColors } = useMemo(() => {
    geometry.computeBoundingBox();
    if (!geometry.attributes.normal && geometry.index) {
      geometry.computeVertexNormals();
    }
    return {
      hasFaces: geometry.index !== null,
      hasColors: geometry.hasAttribute("color"),
    };
  }, [geometry]);

  // PLY sans faces = nuage de points
  if (!hasFaces) {
    return (
      <points geometry={geometry}>
        <pointsMaterial size={0.01} vertexColors={hasColors} sizeAttenuation />
      </points>
    );
  }

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors={hasColors} />
    </mesh>
  );
}

export function Model({
  url,
  className = "h-96 w-full",
}: {
  url: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={2} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.2}>
            <Center>
              <PlyGeometry url={url} />
            </Center>
          </Bounds>
        </Suspense>
        <OrbitControls makeDefault enableDamping />
      </Canvas>
    </div>
  );
}
