require("reflect-metadata");

import { Hook } from "@oclif/config";
import { container } from "tsyringe";
import { AppConfig } from "./services/config";

function inject() {
  const conf: AppConfig = { logLevel: "info" };
  container.register<AppConfig>("AppConfig", { useValue: conf });
}

const hook: Hook<"init"> = function () {
  inject();
};

export default hook;
