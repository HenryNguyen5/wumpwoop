import { Command } from "@oclif/command";
import { Input } from "@oclif/parser";
import * as changeCase from "change-case";
import { cli } from "cli-ux";
import inquirer from "inquirer";
import {
  catchError,
  filter,
  flatMap,
  map,
  mapTo,
  pluck,
  tap,
} from "rxjs/operators";
import SpotifyWebApi from "spotify-web-api-node";
import { ServerStepType } from "../services/spotifyTypes";

const cmdOptions = ["config:edit", "config:show", "start"] as const;
export default class Spotify extends Command {
  static description = "describe the command here";

  static examples = [`$ ww spotify config:show`];

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
    const { args } = this.parse(Spotify);
    const { container } = await import("tsyringe");
    const { SpotifyService } = await import("../services/spotify");

    const spotifyService = container.resolve(SpotifyService);
    switch (args.cmd as typeof cmdOptions[number]) {
      case "config:show": {
        await this.printClientCredentials(spotifyService);
        break;
      }
      case "config:edit": {
        await this.configureClientCredentials(spotifyService);
        break;
      }
      case "start": {
        const api = await this.getApi(spotifyService);
        await spotifyService.startVis(api);
        break;
      }
    }
  }

  async printClientCredentials(
    service: import("../services/spotify").SpotifyService
  ) {
    const conf = service.getClientCredentials();
    this.log("Current client config");
    cli.styledJSON(conf);
  }

  async configureClientCredentials(
    service: import("../services/spotify").SpotifyService
  ) {
    const conf = service.getClientCredentials();
    const toHeader = (v: string) =>
      changeCase.headerCase(v, { delimiter: " " });
    const choices = Object.entries(conf).map(([k, v]) => ({
      name: `${toHeader(k)} ${v ? `[${v}]` : ""}`,
      value: k,
    }));

    const answer = await inquirer.prompt([
      {
        choices,
        name: "key",
        message: "Choose what value you want to modify",
        type: "list",
      },
      {
        name: "value",
        message: "Value",
        type: "input",
      },
    ]);
    if (!service.setClientValue(answer.key, answer.value)) {
      return this.log(`No value entered, ignoring`);
    }
  }

  async getApi(
    service: import("../services/spotify").SpotifyService
  ): Promise<SpotifyWebApi> {
    const spotifyApi = new SpotifyWebApi({
      ...service.getClientCredentials(),
      ...service.getTokenCredentials(),
    });

    // refresh our tokens on the api instance
    return service
      .refreshAccessToken(spotifyApi)
      .pipe(
        catchError((e) => {
          // if it fails, do auth flow to get new token
          if (service.isRefreshError(e)) {
            const url = service.createAuthorizeUrl(spotifyApi);
            cli.url(`Click here to authorize with spotify ${url}`, url);
            return this.authorizeWithSpotify(service, spotifyApi);
          }
          service.throwUnknownError();
        }),
        mapTo(spotifyApi)
      )
      .toPromise();
  }

  private authorizeWithSpotify(
    service: import("../services/spotify").SpotifyService,
    spotifyApi: SpotifyWebApi
  ) {
    return service.setupAuthCallbackServer().pipe(
      tap((x) => {
        switch (x.type) {
          case ServerStepType.CLOSED: {
            // this.log("Server closed");
            break;
          }
          case ServerStepType.LISTENING: {
            cli.action.start("Waiting for auth");
            break;
          }
          case ServerStepType.RECEIVED_CODE: {
            cli.action.stop("Authorized!");
            break;
          }
          default: {
            service.throwUnknownError();
          }
        }
      }),
      filter((x) => x.type === ServerStepType.RECEIVED_CODE),
      pluck("value"),
      map((code) => {
        if (!code) {
          throw Error("No auth code found!");
        }
        return code;
      }),
      flatMap((code) => spotifyApi.authorizationCodeGrant(code)),
      map((data) =>
        Object.entries(data.body).map(([k, v]: [string, string]) => [
          changeCase.camelCase(k),
          v,
        ])
      ),
      tap((t) => service.setTokens(t))
    );
  }
}
