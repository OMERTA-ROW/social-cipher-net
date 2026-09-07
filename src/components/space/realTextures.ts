import { useEffect, useState } from "react";
import * as THREE from "three";

import mercury from "@/assets/space/mercury.jpg.asset.json";
import venusSurface from "@/assets/space/venus_surface.jpg.asset.json";
import venusAtmosphere from "@/assets/space/venus_atmosphere.jpg.asset.json";
import earthDay from "@/assets/space/earth_daymap.jpg.asset.json";
import earthClouds from "@/assets/space/earth_clouds.jpg.asset.json";
import mars from "@/assets/space/mars.jpg.asset.json";
import jupiter from "@/assets/space/jupiter.jpg.asset.json";
import saturn from "@/assets/space/saturn.jpg.asset.json";
import saturnRing from "@/assets/space/saturn_ring.png.asset.json";
import uranus from "@/assets/space/uranus.jpg.asset.json";
import neptune from "@/assets/space/neptune.jpg.asset.json";
import moon from "@/assets/space/moon.jpg.asset.json";
import sun from "@/assets/space/sun.jpg.asset.json";
import stars2k from "@/assets/space/stars_milky_way.jpg.asset.json";
import stars8k from "@/assets/space/stars_8k.jpg.asset.json";

/**
 * Real NASA-derived public imagery (Solar System Scope, CC BY 4.0) served from
 * the CDN. Everything is loaded lazily after first paint so the large maps
 * stream in behind the procedural placeholder instead of blocking the UI.
 */
export const SPACE_TEXTURE_URLS = {
  Mercury: mercury.url,
  Venus: venusSurface.url,
  Earth: earthDay.url,
  Mars: mars.url,
  Jupiter: jupiter.url,
  Saturn: saturn.url,
  Uranus: uranus.url,
  Neptune: neptune.url,
} as const;

export const CLOUD_TEXTURE_URLS: Record<string, string> = {
  Earth: earthClouds.url,
  Venus: venusAtmosphere.url,
};

export const MOON_TEXTURE_URL = moon.url;
export const SUN_TEXTURE_URL = sun.url;
export const RING_TEXTURE_URL = saturnRing.url;
export const STARFIELD_URL = stars8k.url;
export const STARFIELD_LITE_URL = stars2k.url;

const loader = new THREE.TextureLoader();
loader.setCrossOrigin("anonymous");
const cache = new Map<string, Promise<THREE.Texture>>();

const load = (url: string) => {
  let p = cache.get(url);
  if (!p) {
    p = new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });
    cache.set(url, p);
  }
  return p;
};

export interface LazyTextureOptions {
  /** colour maps are sRGB, data maps (bump/alpha) are linear */
  srgb?: boolean;
  anisotropy?: number;
  /** delay in ms before the request starts, so the UI paints first */
  delay?: number;
}

/**
 * Progressive texture load. Returns `null` until the image is decoded, so the
 * caller can render an instant procedural stand-in and swap without a flash.
 */
export const useLazyTexture = (
  url: string | undefined,
  { srgb = true, anisotropy = 8, delay = 120 }: LazyTextureOptions = {},
): THREE.Texture | null => {
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) {
      setTex(null);
      return;
    }
    let alive = true;
    const timer = window.setTimeout(() => {
      load(url)
        .then((t) => {
          if (!alive) return;
          const clone = t.clone();
          clone.needsUpdate = true;
          clone.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          clone.wrapS = THREE.RepeatWrapping;
          clone.anisotropy = anisotropy;
          setTex(clone);
        })
        .catch(() => {
          /* offline / blocked: procedural surface stays */
        });
    }, delay);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [url, srgb, anisotropy, delay]);

  useEffect(() => () => tex?.dispose(), [tex]);

  return tex;
};
