import { RGB } from "./colours";
import { Beat } from "./integration";

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

export function rgb2hsv(r: number, g: number, b: number) {
  let rabs,
    gabs,
    babs,
    rr,
    gg,
    bb,
    h,
    s,
    v: number,
    diff: number,
    diffc,
    percentRoundFn;
  rabs = r / 255;
  gabs = g / 255;
  babs = b / 255;
  (v = Math.max(rabs, gabs, babs)), (diff = v - Math.min(rabs, gabs, babs));
  diffc = (c: number) => (v - c) / 6 / diff + 1 / 2;
  percentRoundFn = (num: number) => Math.round(num * 100) / 100;
  if (diff == 0) {
    h = s = 0;
  } else {
    s = diff / v;
    rr = diffc(rabs);
    gg = diffc(gabs);
    bb = diffc(babs);

    if (rabs === v) {
      h = bb - gg;
    } else if (gabs === v) {
      h = 1 / 3 + rr - bb;
    } else if (babs === v) {
      h = 2 / 3 + gg - rr;
    }
    if (!h) {
      throw Error("No hue value");
    }
    if (h < 0) {
      h += 1;
    } else if (h > 1) {
      h -= 1;
    }
  }
  return {
    h,
    s,
    v,
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

export class TimeIndexableBeats {
  private beats: Beat[];
  private progress: number;
  private lastTimestamp = Date.now();
  private currIdx = 0;

  constructor(beats: Beat[], offset: number) {
    this.beats = beats;
    this.progress = offset / 1000;
  }

  private calculateIndex() {
    if (this.currIdx === this.beats.length) {
      this.currIdx = -1;
    }

    for (let i = this.currIdx; i < this.beats.length; i++) {
      const beat = this.beats[i];
      if (beat.start >= this.progress) {
        if (i > 0) {
          this.currIdx = i - 1;
        }
        break;
      }
    }
  }

  public getBeat() {
    const currTimestamp = Date.now();
    this.progress += (currTimestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = currTimestamp;

    this.calculateIndex();
    if (this.currIdx === -1) {
      return undefined;
    }

    return { ...this.beats[this.currIdx], progress: this.progress };
  }
}
