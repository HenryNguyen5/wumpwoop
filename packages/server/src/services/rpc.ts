import * as grpc from "@grpc/grpc-js";
import { ILampServer, LampService } from "@ww/proto/lamp_grpc_pb";
import { Empty } from "@ww/proto/lamp_pb";
import { Logger } from "pino";
import { container, injectable } from "tsyringe";
import { AppLogger } from "./logger";
import { MQTTClient } from "./mqtt";

@injectable()
 class LampServer implements ILampServer {
  private logger: Logger;

  constructor(private mqtt: MQTTClient, logger: AppLogger) {
    this.logger = logger.create(LampServer);
  }

  public setHSV: ILampServer["setHSV"] = (call, callback) => {
    const { h, s, v } = call.request.toObject();
    this.logger.info("Setting HSV to %o", { h, s, v });
    this.mqtt.publish("/lamp/slave", Buffer.from([h, s, v]));
    callback(null, new Empty());
  };
}

@injectable()
export class GRPCServer {
  private server: grpc.Server | undefined;
  private logger: Logger;

  constructor(logger: AppLogger) {
    this.logger = logger.create(LampServer);
  }

  public listen() {
    const server = new grpc.Server();
    // can use container.resolve all when we have more services
    const lampServer = container.resolve(LampServer);
    //@ts-expect-error
    server.addService(LampService, lampServer);
    server.bindAsync(
      "0.0.0.0:8082",
      grpc.ServerCredentials.createInsecure(),
      (err, port) => {
        if (err) {
          this.logger.error("GRPC server failed to start %o", err);
          throw err;
        }
        this.logger.info("GRPC server started for LampServer on port %s", port);
        server.start();
      }
    );

    this.server = server;
  }
}
