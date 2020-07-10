import Aedes = require("aedes");
import { Advertisement } from "mdns";
import mqtt, {
  IClientPublishOptions,
  IClientSubscribeOptions,
  ISubscriptionGrant,
  Packet,
} from "mqtt";
import net from "net";
import { Logger } from "pino";
import {
  BehaviorSubject,
  bindCallback,
  fromEvent,
  Observable,
  Subject,
} from "rxjs";
import {
  filter,
  finalize,
  flatMap,
  map,
  mapTo,
  takeWhile,
  tap,
  withLatestFrom,
} from "rxjs/operators";
import { inject, injectable } from "tsyringe";
import { AppConfig } from "./config";
import { AppLogger } from "./logger";
import { advertiseService } from "./mdns";

export interface MQTTBrokerConfig extends AppConfig {
  port: number;
}

@injectable()
export class MQTTBroker {
  private aedes: Aedes.Aedes;
  private server: net.Server;
  private config: MQTTBrokerConfig;
  private logger: Logger;
  private mdnsAd: Advertisement;
  private adErrored = new BehaviorSubject(false);
  constructor(
    @inject("MQTTBrokerConfig") config: MQTTBrokerConfig,
    logger: AppLogger
  ) {
    this.aedes = Aedes();
    this.server = net.createServer(this.aedes.handle);
    this.config = config;
    this.logger = logger.create(MQTTBroker);
    this.mdnsAd = advertiseService("mqtt-broker", this.config.port);
  }

  public listen(): Observable<void> {
    this.logger.trace("Attempting to listen to port %d", this.config.port);
    const listen = bindCallback<number, void>(
      this.server.listen.bind(this.server)
    );
    return listen(this.config.port).pipe(
      tap(() => {
        this.logger.info(
          "server started and listening on port %d",
          this.config.port
        );
        this.mdnsAd.start();
        fromEvent(this.mdnsAd, "error").pipe(
          tap((err) => {
            this.logger.error("mdnsAd has errored %o", err);
            this.adErrored.next(true);
          })
        );
      })
    );
  }

  public stop(): Observable<void> {
    const closeAedes = bindCallback(this.aedes.close.bind(this.aedes));
    const closeServer = bindCallback(this.server.close.bind(this.server));
    this.logger.info("Stopping mqtt broker");

    return closeAedes().pipe(
      flatMap(() => closeServer()),
      map((closeServerValue) => {
        if (!closeServerValue) {
          return undefined;
        }

        throw closeServerValue;
      })
    );
  }
}

export interface MQTTClientConfig extends AppConfig {
  brokerPort: number;
  brokerHostname: string;
}

interface PublishMessage {
  topic: string;
  msg: string | Buffer;
  opts: IClientPublishOptions;
}
@injectable()
export class MQTTClient {
  private client: mqtt.MqttClient;
  private logger: Logger;
  private connected = new BehaviorSubject(false);
  private publish$ = new Subject<PublishMessage>();

  constructor(
    @inject("MQTTClientConfig") config: MQTTClientConfig,
    logger: AppLogger
  ) {
    this.client = mqtt.connect(undefined, {
      hostname: config.brokerHostname,
      port: config.brokerPort,
      protocol: "mqtt",
    });
    this.client.on("connect", () => this.connected.next(true));
    this.client.on("close", () => this.connected.next(false));
    this.logger = logger.create(MQTTClient);
    this.handlePublish();
  }

  public subscribe(
    topics: string | string[],
    opts: IClientSubscribeOptions = { qos: 0 }
  ) {
    type SubscribeBind = (
      topic: string | string[],
      opts: IClientPublishOptions
    ) => Observable<[Error, ISubscriptionGrant[]]>;

    const subscribe: SubscribeBind = bindCallback(
      this.client.subscribe.bind(this.client)
    );
    return subscribe(topics, opts).pipe(
      map(([err, grants]) => {
        if (err) {
          throw err;
        }
        return grants;
      }),
      tap((grants) => this.logger.info("Got grants %o", grants)),
      flatMap(() =>
        fromEvent(this.client, "message", (...args) => args as [string, Buffer])
      ),
      filter(([topic]) =>
        Array.isArray(topics) ? topics.includes(topic) : topics === topic
      ),
      map(([topic, message]) => ({
        topic,
        message,
      })),
      // unsubcribe from client topic when this observable stream is unsubcribed from
      finalize(() => {
        this.logger.info("Unsubscribing from topics %o", topics);
        this.client.unsubscribe(topics);
      })
    );
  }

  public publish(
    topic: string,
    msg: string | Buffer,
    opts: IClientPublishOptions = {}
  ) {
    this.publish$.next({ topic, msg, opts });
  }

  // mqtt actually has an internal queue, we could just delete this if
  // all it's doing is waiting for a connected client
  private handlePublish() {
    const handler$ = this.publish$.pipe(
      withLatestFrom(this.connectedClient()),
      flatMap(([x, client]) => {
        type PublishBind = (
          topic: string,
          message: string | Buffer,
          opts: IClientPublishOptions
        ) => Observable<[Error | undefined, Packet | undefined]>;
        // could bind this in constructor for perf reasons
        const publish: PublishBind = bindCallback(client.publish.bind(client));

        return publish(x.topic, x.msg, x.opts);
      })
    );

    handler$.subscribe();
  }

  private connectedClient(): Observable<mqtt.Client> {
    const seed = Math.random();
    const l = this.logger.child({ fn: this.connectedClient.name });

    return this.connected.pipe(
      takeWhile((connected) => !connected, true),
      tap(() => l.trace({ msg: "[whenConnected] Connected", seed })),
      mapTo(this.client) // needs binding
    );
  }
}
