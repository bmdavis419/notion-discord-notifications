import { Effect } from "effect";
import { createClient } from "redis";
import type { RedisClientType } from "redis";
import { get_env_variable } from "./env";

type VideoSchema = {
  title: string;
};

const ALL_VIDEOS_ID = "videos:all";

export const create_redis_client = Effect.promise(async () => {
  const redis_url = Effect.runSync(get_env_variable("REDIS_URL"));

  const client = createClient({
    url: redis_url,
  }) as RedisClientType;

  await client.connect();

  return client;
});

export const save_video = (
  client: RedisClientType,
  video_id: string,
  video_data: VideoSchema
) =>
  Effect.promise(async () => {
    await client.hSet(ALL_VIDEOS_ID, video_id, JSON.stringify(video_data));
    console.log(`Saved to redis: ${video_id}`);
  });

export const get_saved_published_videos = (client: RedisClientType) =>
  Effect.promise(async () => {
    const all_videos = await client.hGetAll(ALL_VIDEOS_ID);

    let videos: Record<string, VideoSchema> = {};

    for (const [video_id, video_data] of Object.entries(all_videos)) {
      const data = JSON.parse(video_data) as VideoSchema;
      videos[video_id] = data;
      console.log(`Video ID: ${video_id}, Data: ${data.title}`);
    }

    return videos;
  });

export const clear_redis_db = (client: RedisClientType) =>
  Effect.promise(async () => {
    await client.flushAll();
    console.log("Redis database cleared");
  });

export const save_dummy_videos = (client: RedisClientType) =>
  Effect.promise(async () => {
    const videos: Record<string, VideoSchema> = {
      "video:1": {
        title: "first test",
      },
      "video:2": {
        title: "second test",
      },
    };

    for (const [video_id, video_data] of Object.entries(videos)) {
      await client.hSet(ALL_VIDEOS_ID, video_id, JSON.stringify(video_data));
      console.log(`Saved to redis: ${video_id}`);
    }
  });
