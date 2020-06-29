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
import {
  createAuthorizeUrl,
  Errors,
  getAuthConfig,
  getDb,
  refreshAccessToken,
  ServerStepType,
  setupAuthCallbackServer,
} from "../services/spotify";

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
    switch (args.cmd as typeof cmdOptions[number]) {
      case "config:show": {
        await this.printClientCredentials();
        break;
      }
      case "config:edit": {
        await this.configureClientCredentials();
        break;
      }
      case "start": {
        const api = await this.getApi();

        break;
      }
    }
    // const name = flags.name ?? "world";
    // this.log(`hello ${name} from ./src/commands/hello.ts`);
    // if (args.file && flags.force) {
    //   this.log(`you input --force and --file: ${args.file}`);
    // }
  }

  async startVis() {
    const conf = getAuthConfig();
  }

  async printClientCredentials() {
    const conf = getAuthConfig().client;
    this.log("Current client config");
    cli.styledJSON(conf);
  }

  async configureClientCredentials() {
    const conf = getAuthConfig();
    const toHeader = (v: string) =>
      changeCase.headerCase(v, { delimiter: " " });
    const choices = Object.entries(conf.client).map(([k, v]) => ({
      name: `${toHeader(k)} ${v ? `[${v}]` : ""}`,
      value: k,
    }));
    const db = getDb();

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
    const trimmedValue = (answer.value as string).trim();
    const dbKey = `spotify.auth.client.${answer.key}`;

    if (!trimmedValue) {
      return this.log(
        `No value entered, defaulting ${toHeader(answer.key)} to ${db.get(
          dbKey
        )}`
      );
    }

    db.set(dbKey, answer.value).write();
    this.log(
      `Value of ${toHeader(answer.key)} has been set to ${db.get(dbKey)}`
    );
  }

  async getApi(): Promise<SpotifyWebApi> {
    const conf = getAuthConfig();
    const spotifyApi = new SpotifyWebApi({
      ...conf.client,
      ...conf.tokens,
    });

    // refresh our tokens on the api instance
    return refreshAccessToken(spotifyApi)
      .pipe(
        catchError((e) => {
          // if it fails, do auth flow to get new token
          if ((e as Error).message === Errors.REFRESH_ERROR) {
            const url = createAuthorizeUrl(spotifyApi);
            cli.url(`Click here to authorize with spotify ${url}`, url);
            return this.authorizeWithSpotify(spotifyApi);
          }
          throw Error(Errors.UNKNOWN);
        }),
        mapTo(spotifyApi)
      )
      .toPromise();
  }

  private authorizeWithSpotify(spotifyApi: SpotifyWebApi) {
    return setupAuthCallbackServer().pipe(
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
            throw Error(Errors.UNKNOWN);
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
        Object.entries(data.body).map(([k, v]) => [changeCase.camelCase(k), v])
      ),
      tap((data) => {
        const db = getDb();
        data.forEach(([k, v]) => {
          const dbKey = `spotify.auth.tokens.${k}`;
          db.set(dbKey, v).write();
        });
      })
    );
  }
}
