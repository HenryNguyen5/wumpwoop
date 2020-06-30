import express from "express";
import { Logger } from "pino";
import { from, of, ReplaySubject, throwError } from "rxjs";
import { catchError, flatMap, map, tap } from "rxjs/operators";
import SpotifyWebApi from "spotify-web-api-node";
import { injectable } from "tsyringe";
import { FileStore } from "../stores/filestore";
import { AppLogger } from "./logger";
import { ServerStep, ServerStepType } from "./spotifyTypes";
import { visualize } from "./vis";

const scopes = ["user-read-playback-state"];
const state = "fo";

export const enum Errors {
  REFRESH_ERROR = "REFRESH_ERROR",
  UNKNOWN = "UNKNOWN",
}

@injectable()
export class SpotifyService {
  private logger: Logger;
  private db: FileStore;
  constructor(logger: AppLogger, db: FileStore) {
    this.logger = logger.create(SpotifyService);
    this.db = db;
  }

  public setupAuthCallbackServer() {
    const listener = new ReplaySubject<ServerStep<string>>(3);
    const app = express();
    const port = 3000;

    app.all("/", (req, res) => {
      const value = req.query.code as string;
      if (!value) {
        return listener.error(new Error("Received empty auth code"));
      }
      listener.next({
        type: ServerStepType.RECEIVED_CODE,
        value: value,
      });
      res.send("Spotify app authorized. You can close this window now.");
    });

    const server = app.listen(port, () => {
      this.logger.info(
        `Spotify authorization server listening at: http://localhost:${port}`
      );
      listener.next({ type: ServerStepType.LISTENING });
    });

    listener.subscribe((v) => {
      if (v.type === ServerStepType.RECEIVED_CODE) {
        server.close(() => {
          listener.next({ type: ServerStepType.CLOSED });
        });
      }
    });

    return listener;
  }

  public refreshAccessToken(spotifyApi: SpotifyWebApi) {
    this.logger.info("Refreshing access token");
    return of(spotifyApi).pipe(
      flatMap((api) =>
        from(api.refreshAccessToken()).pipe(map((data) => [data, api] as const))
      ),
      tap(([data]) => {
        this.logger.info("Refreshed access token");

        spotifyApi.setAccessToken(data.body["access_token"]);
        this.logger.info("Set access token on api instance");
      }),
      catchError((e) => {
        this.logger.error("Errored while refreshing token %o", e);
        return throwError(new Error(Errors.REFRESH_ERROR));
      }),
      map(([_, api]) => api.getAccessToken()),
      tap((token) => {
        if (!token) {
          throw new Error("No access token found");
        }
        this.db.setTokenValue("accessToken", token);
        this.logger.info("Wrote access token to db");
      })
    );
  }

  public getClientCredentials() {
    const conf = this.db.getConfig();
    return conf.auth.client;
  }

  public getTokenCredentials() {
    const conf = this.db.getConfig();
    return conf.auth.tokens;
  }

  public createAuthorizeUrl(api: SpotifyWebApi) {
    return api.createAuthorizeURL(scopes, state);
  }

  public setClientValue(key: string, value: string): boolean {
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      return false;
    }
    this.db.setClientValue(normalizedKey, value);
    return true;
  }

  public setTokens(entries: string[][]) {
    entries.forEach(([k, v]) => {
      this.db.setTokenValue(k, v);
    });
  }

  public isRefreshError(e: Error) {
    return e.message === Errors.REFRESH_ERROR;
  }

  public throwUnknownError(): never {
    throw Error(Errors.UNKNOWN);
  }

  public async startVis(api: SpotifyWebApi) {
    await visualize(api);
  }
}
