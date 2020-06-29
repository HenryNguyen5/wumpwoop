import { RGB } from "./colours";

export function time(): number {
  return Date.now();
}

export function clamp(v: number): number {
  if (v > 255) {
    return 255;
  }
  if (v < 0) {
    return 0;
  }
  return v;
}

export function round(v: number): number {
  return Math.round(v);
}

export function scale(led: RGB, a: number): RGB {
  return {
    r: led.r * a,
    g: led.g * a,
    b: led.b * a,
  };
}

/**
 *
 * @param h Hue [0,1]
 * @param s Saturation [0,1]
 * @param v Value [0,1]
 */
export function HSVtoRGB(h: number, s: number, v: number): RGB {
  var r = 0,
    g = 0,
    b = 0,
    i,
    f,
    p,
    q,
    t;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      (r = v), (g = t), (b = p);
      break;
    case 1:
      (r = q), (g = v), (b = p);
      break;
    case 2:
      (r = p), (g = v), (b = t);
      break;
    case 3:
      (r = p), (g = q), (b = v);
      break;
    case 4:
      (r = t), (g = p), (b = v);
      break;
    case 5:
      (r = v), (g = p), (b = q);
      break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}
