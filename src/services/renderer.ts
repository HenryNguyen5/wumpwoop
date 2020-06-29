import SerialPort from "serialport";
import { LedState } from ".";
import { clamp, round } from "./utils";

function stateToBuffer(state: LedState): Buffer {
  return Buffer.from(
    state.flatMap((v) => [v.r, v.g, v.b].map(clamp).map(round))
  );
}

export function createRenderer() {
  const sp = new SerialPort("/dev/cu.usbmodem2101", { baudRate: 2_000_000 });
  function render(state: LedState) {
    const buf = stateToBuffer(state);
    sp.write(buf);
  }

  return new Promise<typeof render>((resolve, reject) => {
    sp.on("data", (d) => {
      const str = d.toString("utf8");
      if (str === "Ready!") {
        return resolve(render);
      }

      reject("Could not connect to renderer");
    });
  });
}
