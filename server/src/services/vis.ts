import SpotifyWebApi from "spotify-web-api-node";
import { RGB } from "./colours";
import { createIntegration } from "./integration";
import { looper } from "./loop";
import { time } from "./utils";

export interface AppConfig {
  numLeds: number;
  frameTimeSeconds: number;
}

export type LedState = RGB[];

export async function visualize(spotifyApi: SpotifyWebApi) {
  const track = await spotifyApi
    .getMyCurrentPlayingTrack()
    .then((r) => r.body as any);
  const currentlyPlayingId = track.item!.id;
  const { beats } = (await spotifyApi
    .getAudioAnalysisForTrack(currentlyPlayingId)
    .then((r) => r.body)) as any;

  const config = { frameTimeSeconds: 1 / 60, numLeds: 34 };
  // Create the authorization URL
  const a = time();

  const offset = a - track.timestamp + track.progress_ms;
  const songData = { progress_ms: offset, beats };
  const loop = await looper(config);
  const integration = createIntegration(config, songData);
  loop(integration);
}
