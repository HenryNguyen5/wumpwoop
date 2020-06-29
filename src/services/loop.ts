import { AppConfig, LedState } from ".";
import { RGB } from "./colours";
import { createRenderer } from "./renderer";
import { time } from "./utils";

export type Integration = (
  timePassed: number,
  state: LedState
) => Promise<LedState>;

// https://gafferongames.com/post/fix_your_timestep/
export async function looper({ numLeds, frameTimeSeconds }: AppConfig) {
  let currentTime = time();
  let accumulator = 0.0;
  let state = new Array<RGB>(numLeds).fill({ b: 255, g: 100, r: 100 });
  let nextState = state;
  let timePassed = 0;
  const render = await createRenderer();

  async function loop(integrate: Integration) {
    while (true) {
      await new Promise((res) => {
        setTimeout(async () => {
          // we can replace this with hrttime
          const newTime = time();
          let frameTimeDelta = (newTime - currentTime) / 1000;
          currentTime = newTime;

          // clamp our fps so that when long frames arrive (such as system sleep)
          // we dont jump ahead in our calculations
          if (frameTimeDelta > 0.25) {
            frameTimeDelta = 0.25;
          }

          accumulator += frameTimeDelta;
          while (accumulator >= frameTimeSeconds) {
            nextState = await integrate(timePassed, state);

            timePassed += frameTimeSeconds;
            accumulator -= frameTimeSeconds;
          }

          // what fraction of a frame we're currently in
          // ex, if we're at half a frame ahead of the physics simulation
          // then alpha is at 0.5

          const alpha = accumulator / frameTimeSeconds;
          // nextState = linearInterpolateFrame(nextState, 1 + alpha);

          render(nextState);
          state = nextState;
          res();
        }, (1 / 120) * 1000);
        // set a higher refresh rate than integration rate so that
        // we have leeway to do keyframe interpolation later on
      });
    }
  }

  return loop;
}
