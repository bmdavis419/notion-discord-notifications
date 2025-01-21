import { Effect } from "effect";
import { create_notion_client, get_notion_published } from "./notion";
import {
  create_redis_client,
  get_saved_published_videos,
  save_video,
} from "./redis";
import { create_discord_client, send_discord_message } from "./discord";
import { get_env_variable } from "./env";

export const get_videos_not_sent = Effect.gen(function* () {
  const notion_db_id = yield* get_env_variable("NOTION_DATABASE_ID");
  const discord_channel_id = yield* get_env_variable("DISCORD_CHANNEL_ID");

  const notion_client = yield* create_notion_client;
  const redis_client = yield* create_redis_client;
  const discord_client = yield* create_discord_client;

  const notion_videos = yield* get_notion_published(
    notion_client,
    notion_db_id
  );
  const redis_videos = yield* get_saved_published_videos(redis_client);

  const has_key = <T extends object>(obj: T, key: keyof T): boolean => {
    return Object.prototype.hasOwnProperty.call(obj, key);
  };

  for (const notion_video of notion_videos.results) {
    const video_id = notion_video.id;
    const video_properties = (notion_video as any).properties;
    const video_title = video_properties.Title.title[0].plain_text as string;

    if (has_key(redis_videos, video_id)) {
      console.log(`${video_id} in DB`);
    } else {
      console.log(`need to add ${video_id}`);
      yield* save_video(redis_client, video_id, { title: video_title });
      yield* send_discord_message(
        discord_client,
        discord_channel_id,
        `VIDEO WAS JUST PUBLISHED: ${video_title}`
      );
    }
  }
});
