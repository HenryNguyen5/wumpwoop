import express from "express";
import low from "lowdb";
import FileSync from "lowdb/adapters/FileSync";
import pino from "pino";
import { from, of, ReplaySubject, throwError } from "rxjs";
import { catchError, flatMap, map, tap } from "rxjs/operators";
import SpotifyWebApi from "spotify-web-api-node";
const adapter = new FileSync("db.json");
const db = low<typeof FileSync>(adapter);
const scopes = ["user-read-playback-state"];
const state = "fo";
const logger = pino();
logger.level = "fatal";
db.defaults<Config>({
  spotify: {
    auth: {
      tokens: {
        accessToken: "",
        expiresIn: 0,
        refreshToken: "",
      },
      client: {
        clientId: "",
        clientSecret: "",
        redirectUri: "http://localhost:3000",
      },
    },
  },
}).write();

interface Config {
  spotify: SpotifyConfig;
}

interface SpotifyConfig {
  auth: SpotifyAuthConfig;
}

interface SpotifyAuthConfig {
  client: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  tokens: {
    /**
     * The time period (in seconds) for which the access token is valid.
     */
    expiresIn: number;
    /**
     * 	An access token that can be provided in subsequent calls,
     *  for example to Spotify Web API services.
     */
    accessToken: string;
    /**
     * A token that can be sent to the Spotify Accounts
     * service in place of an authorization code.
     *
     * (When the access code expires, send a POST request to the
     * Accounts service /api/token endpoint, but use this code in place
     * of an authorization code. A new access token will be returned.
     * A new refresh token might be returned too.)
     */
    refreshToken: string;
  };
}

function getConfig(): Config {
  db.read();
  return db.getState();
}

export function getDb() {
  return db;
}

export function getAuthConfig(): SpotifyAuthConfig {
  return getConfig().spotify.auth;
}

export const enum Errors {
  REFRESH_ERROR = "REFRESH_ERROR",
  UNKNOWN = "UNKNOWN",
}

export function refreshAccessToken(spotifyApi: SpotifyWebApi) {
  logger.info("Refreshing access token");
  return of(spotifyApi).pipe(
    flatMap((api) =>
      from(api.refreshAccessToken()).pipe(map((data) => [data, api] as const))
    ),
    tap(([data]) => {
      logger.info("Refreshed access token");

      spotifyApi.setAccessToken(data.body["access_token"]);
      logger.info("Set access token on api instance");
    }),
    catchError((e) => {
      logger.error("Errored while refreshing token %o", e);
      return throwError(new Error(Errors.REFRESH_ERROR));
    }),
    map(([_, api]) => api.getAccessToken()),
    tap((token) => {
      if (!token) {
        throw new Error("No access token found");
      }
      db.set("spotify.auth.tokens.accessToken", token).write();
      logger.info("Wrote access token to db");
    })
  );
}

export enum ServerStepType {
  LISTENING,
  RECEIVED_CODE,
  CLOSED,
}

interface ServerStep<T = any> {
  type: ServerStepType;
  value?: T;
}

export function setupAuthCallbackServer() {
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
    logger.info(
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

export function createAuthorizeUrl(api: SpotifyWebApi) {
  return api.createAuthorizeURL(scopes, state);
}
