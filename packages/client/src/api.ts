import { LampPromiseClient } from "@ww/proto/lamp_grpc_web_pb";
import { inject, injectable } from "tsyringe";
import { AppConfig } from "./config";

interface SetHueParams {
  h: number;
  s: number;
  v: number;
}

@injectable()
export class Api {
  public lamp: LampPromiseClient;
  constructor(@inject("AppConfig") config: AppConfig) {
    console.log(config)
    this.lamp = new LampPromiseClient('http://' + window.location.hostname + ':8081', null, null)
  }
}
