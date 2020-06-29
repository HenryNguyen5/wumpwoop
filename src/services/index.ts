import express from "express";
import SpotifyWebApi from "spotify-web-api-node";
import { RGB } from "./colours";
import { createIntegration } from "./integration";
import { looper } from "./loop";
import { time } from "./utils";
const app = express();
const port = 3000;
let code = "";

export interface AppConfig {
  numLeds: number;
  frameTimeSeconds: number;
}

export type LedState = RGB[];

const scopes = ["user-read-playback-state"];
const redirectUri = "http://localhost:3000";
const clientId = "19a36b3c26cf4386ae7433aabb08d1c3";
const clientSecret = "1245edd6e08b4728b90823e82715f294";
const state = "fo";

// Setting credentials can be done in the wrapper's constructor, or using the API object's setters.
const spotifyApi = new SpotifyWebApi({
  redirectUri,
  clientSecret,
  clientId,
});

app.all("/", (req, res) => {
  code = req.query.code as string;
  if (code) {
    main();
  }
  res.send("Hello World!");
});

const server = app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);

const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
console.log(authorizeURL);

async function main() {
  // Retrieve an access token and a refresh token
  const data = await spotifyApi.authorizationCodeGrant(code);

  console.log("The token expires in " + data.body["expires_in"]);
  console.log("The access token is " + data.body["access_token"]);
  console.log("The refresh token is " + data.body["refresh_token"]);

  // Set the access token on the API object to use it in later calls
  spotifyApi.setAccessToken(data.body["access_token"]);
  spotifyApi.setRefreshToken(data.body["refresh_token"]);

  const b = time();
  const track = await spotifyApi
    .getMyCurrentPlayingTrack()
    .then((r) => r.body as any);
  const currentlyPlayingId = track.item!.id;
  const { beats } = (await spotifyApi
    .getAudioAnalysisForTrack(currentlyPlayingId)
    .then((r) => r.body)) as any;

  const config: AppConfig = { frameTimeSeconds: 1 / 60, numLeds: 34 };
  // Create the authorization URL
  const a = time();

  const songData = { progress_ms: track.progress_ms + (a - b), beats };
  const loop = await looper(config);
  const integration = createIntegration(config, songData);

  loop(integration);
}
