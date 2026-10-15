import { useFrame, useLoader } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useRef } from "react";
import type { Group, Vector3 } from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";

export function PLYModel({
  url,
  reveal,
  pivot,
}: {
  url: string;
  /** 0 → 1 : échelle du modèle (zoom in / zoom out). Absent = taille normale. */
  reveal?: MotionValue<number>;
  /** Point autour duquel le zoom s'effectue. */
  pivot?: Vector3;
}) {
  const geometry = useLoader(PLYLoader, url);
  const group = useRef<Group>(null);

  useFrame(() => {
    if (!reveal || !group.current) return;
    // Une échelle strictement nulle rend la matrice non inversible.
    group.current.scale.setScalar(Math.max(reveal.get(), 1e-4));
  });

  return (
    <group ref={group} position={pivot}>
      <points position={pivot?.clone().negate()} geometry={geometry}>
        <pointsMaterial size={0.01} vertexColors={true} sizeAttenuation />
      </points>
    </group>
  );
}
