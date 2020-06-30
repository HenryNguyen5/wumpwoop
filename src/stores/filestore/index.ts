import low from "lowdb";
import FileSync from "lowdb/adapters/FileSync";

interface Schema {
  spotify: SpotifySchema;
}

interface SpotifySchema {
  auth: SpotifyAuthSchema;
}

interface SpotifyAuthSchema {
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

export class FileStore {
  private adapter = new FileSync("db.json");
  private db = low<typeof FileSync>(this.adapter);

  constructor() {
    this.db
      .defaults<Schema>({
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
      })
      .write();
  }

  public setClientValue(key: string, value: string): void {
    const dbKey = `spotify.auth.client.${key}`;
    this.db.set(dbKey, value).write();
  }

  public setTokenValue(key: string, value: string): void {
    const dbKey = `spotify.auth.tokens.${key}`;
    this.db.set(dbKey, value).write();
  }

  public getConfig(): Schema["spotify"] {
    this.db.read();
    return this.db.getState().spotify;
  }
}
