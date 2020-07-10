import { of } from "rxjs";
import { map } from "rxjs/operators";
import { pulseBeat, rainbow, rainbow2 } from "./patterns";
import { TimeIndexableBeats } from "./utils";
import { AppConfig, LedState } from "./vis";

export interface Beat {
  start: number;
  duration: number;
  confidence: number;
}

export function createIntegration(
  { frameTimeSeconds, numLeds }: AppConfig,
  songData: { progress_ms: number; beats: Beat[] }
) {
  const beatSlice = new TimeIndexableBeats(
    songData.beats,
    songData.progress_ms
  );

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

  const rain2 = rainbow2({
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
