require("reflect-metadata");

import { Command } from "@oclif/command";
import { Input } from "@oclif/parser";
import { container } from "tsyringe";
import { AppConfig } from "../services/config";

const cmdOptions = ["rpc:start"] as const;

export default class RPC extends Command {
  static description = "describe the command here";

  static examples = [`$ ww rpc config:show`];

  static flags = {};

  static args: Required<Input<any>["args"]> = [
    {
      name: "cmd",
      options: (cmdOptions as any) as string[],
      required: true,
      description: "The command you want to start",
    },
  ];

  async run() {
    const { args } = this.parse(RPC);

    switch (args.cmd as typeof cmdOptions[number]) {
      case "rpc:start": {
        await this.startRpc();
        break;
      }
    }
  }

  async startRpc() {
    const { GRPCServer } = await import("../services/rpc");
    const appConfig = container.resolve("AppConfig") as AppConfig;
    // should really use mdns here to find the broker too
    const config: import("../services/mqtt").MQTTClientConfig = {
      ...appConfig,
      brokerHostname: "host.docker.internal",
      brokerPort: 3001,
    };
    container.register("MQTTClientConfig", { useValue: config });

    const rpc = container.resolve(GRPCServer);
    rpc.listen()
  }
}
