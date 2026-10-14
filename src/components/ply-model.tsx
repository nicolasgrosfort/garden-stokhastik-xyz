import { useLoader } from "@react-three/fiber";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";

export function PLYModel({ url }: { url: string }) {
  const geometry = useLoader(PLYLoader, url);

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.01} vertexColors={true} sizeAttenuation />
    </points>
  );
}
