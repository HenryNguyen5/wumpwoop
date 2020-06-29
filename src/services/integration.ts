import { of } from "rxjs";
import { map } from "rxjs/operators";
import { AppConfig, LedState } from ".";
import { pulseBeat, rainbow } from "./patterns";

export interface Beat {
  start: number;
  duration: number;
  confidence: number;
}

export function createIntegration(
  { frameTimeSeconds, numLeds }: AppConfig,
  songData: { progress_ms: number; beats: Beat[] }
) {
  const progressSec = songData.progress_ms / 1000;
  let startIdx = songData.beats.findIndex((b) => b.start >= progressSec);

  const beatSlice = songData.beats.slice(startIdx).map((b) => ({
    start: b.start - progressSec,
    duration: b.duration,
    confidence: b.confidence,
  }));
  const pBeat = pulseBeat({
    frameTimeSeconds,
    durationSeconds: 5,
    numLeds,
    beats: beatSlice,
  });
  const rain = rainbow({
    frameTimeSeconds,
    durationSeconds: 6,
    numLeds,
    beats: beatSlice,
  });

  return async function integrate(timePassed: number, state: LedState) {
    const s = await of(state)
      .pipe(
        map((s) => rain(s)),
        map((s) => pBeat(s))
      )
      .toPromise();

    return s;
  };
}
