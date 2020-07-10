import { HSVtoRGB, scale, TimeIndexableBeats } from "./utils";
import { LedState } from "./vis";
interface AnimationOptions {
  /**
   * The duration of each frame in seconds, e.g 60 FPS => frameTimeSeconds === 1/60s
   */
  frameTimeSeconds: number;
  /**
   * The duration of the animation in seconds
   */
  durationSeconds: number;
  /**
   * When to start the animation after its invocation, the timer increments
   * by [[frameTimeSeconds]] every time the created animation is called
   */
  startSeconds?: number;
  /**
   * The number of leds that is being controlled
   */
  numLeds: number;
  beats?: TimeIndexableBeats;
}

/**
 * Arguments passed to the created animation
 */
interface AnimationArgs extends AnimationOptions {
  /**
   * The number of seconds elapsed since the animation's creation,
   * incremented by [[frameTimeSeconds]] whenever the animation is invoked
   */
  secondsPassed: number;
  /**
   * The completion percentage of the animation, [0,1]
   */
  animationPercent: number;
  /**
   * The current LED state
   */
  state: LedState;
}

function createAnimationHelper(cb: (args: AnimationArgs) => LedState) {
  return (opts: AnimationOptions) => {
    const framesDuration = opts.durationSeconds / opts.frameTimeSeconds;
    let framesPassed = 0;
    let animationPercent = 0;
    // the difference here is that realSecondsPassed is incremented even
    // when the animation hasnt started because [[startSeconds]] has been given
    let realSecondsPassed = 0;
    let secondsPassed = 0;

    return (state: LedState) => {
      framesPassed++;
      realSecondsPassed += opts.frameTimeSeconds;
      if (opts.startSeconds && realSecondsPassed < opts.startSeconds) {
        return state;
      }

      secondsPassed += opts.frameTimeSeconds;
      animationPercent = (framesPassed / framesDuration) % 1;
      return cb({ ...opts, secondsPassed, animationPercent, state });
    };
  };
}

export const rainbow = createAnimationHelper(
  ({ animationPercent, state, numLeds }) => {
    const scaleVal2 = Math.sin(animationPercent * (2 * Math.PI));

    return state.map((_, i) => {
      const scaleVal = i / numLeds;
      return HSVtoRGB(scaleVal * scaleVal2, 1, 1);
    });
  }
);

export const rainbow2 = createAnimationHelper(
  ({ animationPercent, state, numLeds }) => {
    const scaleVal2 = 1 + Math.sin(animationPercent * (2 * Math.PI));

    return state.map((_, i) => {
      const scaleVal = i / numLeds;
      return HSVtoRGB(scaleVal * i * scaleVal2, 1, 1);
    });
  }
);

export const pulse = createAnimationHelper(({ animationPercent, state }) => {
  const scaleVal = 1 + Math.sin(animationPercent * (2 * Math.PI));
  return state.map((v) => scale(v, scaleVal));
});

export const pulseBeat = createAnimationHelper(
  ({ animationPercent, state, beats, secondsPassed }) => {
    if (!beats) {
      throw Error("No beats array found");
    }

    const currBeat = beats?.getBeat();
    if (!currBeat) {
      throw Error("Beats array finished");
    }

    const { progress, start, duration, confidence } = currBeat;
    console.log(currBeat);
    const scaleVal2 = Math.min(1, (progress - start) / (duration * 2));

    return state.map((v) => scale(v, scaleVal2));
  }
);
