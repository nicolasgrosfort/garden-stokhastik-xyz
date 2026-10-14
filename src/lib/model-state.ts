import { atom } from "jotai";

export type Vec3 = [number, number, number];

export type ModelState = {
  url: string;
  position?: Vec3;
  target?: Vec3;
  href?: string;
  linkLabel?: string;
};

export const modelAtom = atom<ModelState | null>(null);
