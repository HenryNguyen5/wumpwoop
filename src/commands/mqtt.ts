require("reflect-metadata");

import { Command } from "@oclif/command";
import { Input } from "@oclif/parser";
import { container } from "tsyringe";
import { AppConfig } from "../services/config";

const cmdOptions = ["broker:start", "logger:start"] as const;

export default class MQTT extends Command {
  static description = "describe the command here";

  static examples = [`$ ww mqtt config:show`];

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
    const { args } = this.parse(MQTT);

    switch (args.cmd as typeof cmdOptions[number]) {
      case "broker:start": {
        await this.startBroker();
        break;
      }
      case "logger:start": {
        await this.startLogger();
        break;
      }
    }
  }

  async startBroker() {
    const { MQTTBroker } = await import("../services/mqtt");
    const appConfig = container.resolve("AppConfig") as AppConfig;
    const config: import("../services/mqtt").MQTTBrokerConfig = {
      ...appConfig,
      port: 3001,
    };
    container.register("MQTTBrokerConfig", { useValue: config });

    const broker = container.resolve(MQTTBroker);
    broker.listen().subscribe();
  }

  async startLogger() {
    const { MQTTClient } = await import("../services/mqtt");
    const appConfig = container.resolve("AppConfig") as AppConfig;
    // should really use mdns here to find the broker too
    const config: import("../services/mqtt").MQTTClientConfig = {
      ...appConfig,
      brokerHostname: "localhost",
      brokerPort: 3001,
    };
    container.register("MQTTClientConfig", { useValue: config });

    const client = container.resolve(MQTTClient);
    client.subscribe("/lamp/master").subscribe({
      next: ({message,topic}) => console.log({topic, message: message.toString('utf8')}),
    });
  }

  
}
