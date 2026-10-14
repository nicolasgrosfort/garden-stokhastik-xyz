import { useFrame, useLoader } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useMemo } from "react";
import { BufferAttribute, type BufferGeometry } from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";

// Copie la géométrie avec les points dans un ordre aléatoire, pour que
// `drawRange` fasse apparaître les points de façon diffuse.
function shuffled(source: BufferGeometry) {
  const geometry = source.clone();
  const count = geometry.attributes.position.count;
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const [name, attr] of Object.entries(geometry.attributes)) {
    const { itemSize, array, normalized } = attr as BufferAttribute;
    const out = new (array.constructor as new (n: number) => typeof array)(
      array.length,
    );
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < itemSize; k++) {
        out[i * itemSize + k] = array[order[i] * itemSize + k];
      }
    }
    geometry.setAttribute(name, new BufferAttribute(out, itemSize, normalized));
  }
  geometry.setDrawRange(0, 0);
  return geometry;
}

export function PLYModel({
  url,
  reveal,
}: {
  url: string;
  /** 0 → 1 : proportion de points affichés. Absent = tout affiché. */
  reveal?: MotionValue<number>;
}) {
  const source = useLoader(PLYLoader, url);
  const geometry = useMemo(
    () => (reveal ? shuffled(source) : source),
    [source, reveal],
  );

  useFrame(() => {
    if (!reveal) return;
    const count = geometry.attributes.position.count;
    geometry.setDrawRange(0, Math.floor(count * reveal.get()));
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.01} vertexColors={true} sizeAttenuation />
    </points>
  );
}
