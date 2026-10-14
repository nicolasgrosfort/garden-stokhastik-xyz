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

const buttonClass =
  "rounded border px-3 py-1 text-sm backdrop-blur hover:underline";

export function Model({
  url,
  className = "h-96 w-full",
  position = [0, 0, 10],
  target = [0, 0, 0],
  fullscreen = false,
  href,
  linkLabel = "Voir la source",
  onReset,
}: {
  url: string;
  className?: string;
  position?: [number, number, number];
  target?: [number, number, number];
  fullscreen?: boolean;
  href?: string;
  linkLabel?: string;
  onReset?: () => void;
}) {
  return (
    <>
      <div
        className={
          className +
          (fullscreen ? " fixed inset-0 z-50 h-full w-full bg-background" : "")
        }
      >
        <Canvas camera={{ position: position, fov: 50 }} eventPrefix="client">
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
              console.log(
                "camera position",
                controls.object.position.toArray(),
              );
              console.log("camera target (pan)", controls.target.toArray());
            }}
          />
        </Canvas>
      </div>
      {(href || onReset) && (
        <div
          className={
            fullscreen
              ? "fixed bottom-4 right-4 z-60 flex gap-2"
              : "mt-2 flex gap-2"
          }
        >
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass}
            >
              {linkLabel}
            </a>
          )}
          {onReset && (
            <button type="button" onClick={onReset} className={buttonClass}>
              Reset
            </button>
          )}
        </div>
      )}
    </>
  );
}
